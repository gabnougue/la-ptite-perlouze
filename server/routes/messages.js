const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const db = require('../models/database');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Configuration multer pour les pièces jointes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/attachments/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + crypto.randomBytes(8).toString('hex') + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    // Accepter images et PDF
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seuls les images et PDF sont autorisés'));
    }
  }
});

// Middleware pour vérifier l'authentification
const requireAuth = (req, res, next) => {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  next();
};

// ═══════════════════════════════════════════════════
// RÉCUPÉRATION DES THREADS ET MESSAGES
// ═══════════════════════════════════════════════════

// Récupérer tous les threads avec le dernier message
router.get('/threads', requireAuth, async (req, res) => {
  try {
    const threads = await db.all(`
      SELECT
        mt.*,
        (SELECT COUNT(*) FROM thread_messages WHERE thread_id = mt.id AND sender_type = 'customer'
         AND created_at > COALESCE(mt.admin_last_viewed_at, '1970-01-01')) as unread_count,
        (SELECT message FROM thread_messages WHERE thread_id = mt.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT sender_type FROM thread_messages WHERE thread_id = mt.id ORDER BY created_at DESC LIMIT 1) as last_sender
      FROM message_threads mt
      ORDER BY mt.last_message_at DESC
    `);

    res.json(threads);
  } catch (error) {
    console.error('Erreur récupération threads:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer tous les messages d'un thread
router.get('/threads/:id/messages', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const messages = await db.all(`
      SELECT
        tm.*,
        (SELECT COUNT(*) FROM message_attachments WHERE message_id = tm.id) as attachment_count
      FROM thread_messages tm
      WHERE tm.thread_id = ?
      ORDER BY tm.created_at ASC
    `, [id]);

    // Récupérer les pièces jointes pour chaque message
    for (const message of messages) {
      if (message.has_attachments) {
        message.attachments = await db.all(
          'SELECT * FROM message_attachments WHERE message_id = ?',
          [message.id]
        );
      }
    }

    res.json(messages);
  } catch (error) {
    console.error('Erreur récupération messages:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Marquer un thread comme lu
router.post('/threads/:id/mark-read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await db.run(
      'UPDATE message_threads SET admin_last_viewed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur marquage lu:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════
// ENVOI DE RÉPONSES
// ═══════════════════════════════════════════════════

// Envoyer une réponse à un thread
router.post('/threads/:id/reply', requireAuth, upload.array('attachments', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const attachments = req.files || [];

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Le message est requis' });
    }

    // Récupérer les infos du thread
    const thread = await db.get('SELECT * FROM message_threads WHERE id = ?', [id]);
    if (!thread) {
      return res.status(404).json({ error: 'Thread non trouvé' });
    }

    // Récupérer l'username de l'admin
    const admin = await db.get('SELECT username FROM admins WHERE id = ?', [req.session.adminId]);
    const adminName = admin?.username || 'La p\'tite perlouze';

    // Insérer le message dans la BDD
    const messageResult = await db.run(`
      INSERT INTO thread_messages (thread_id, sender_type, sender_name, sender_email, message, has_attachments)
      VALUES (?, 'admin', ?, ?, ?, ?)
    `, [id, adminName, process.env.CONTACT_EMAIL || 'contact@laptiteperlouze.fr', message.trim(), attachments.length > 0 ? 1 : 0]);

    const messageId = messageResult.id;

    // Enregistrer les pièces jointes
    if (attachments.length > 0) {
      for (const file of attachments) {
        await db.run(`
          INSERT INTO message_attachments (message_id, filename, file_path, file_size, mime_type)
          VALUES (?, ?, ?, ?, ?)
        `, [messageId, file.originalname, file.filename, file.size, file.mimetype]);
      }
    }

    // Mettre à jour le thread
    await db.run(`
      UPDATE message_threads
      SET last_message_at = CURRENT_TIMESTAMP, status = 'open', admin_last_viewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);

    // Préparer les pièces jointes pour Resend
    const resendAttachments = attachments.map(file => ({
      filename: file.originalname,
      path: path.join(__dirname, '../../public/attachments/', file.filename)
    }));

    // Envoyer l'email via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const emailData = {
          from: process.env.RESEND_FROM_EMAIL,
          to: thread.customer_email,
          subject: `Re: ${thread.subject} [#THREAD-${thread.id}]`,
          replyTo: process.env.CONTACT_EMAIL || 'contact@laptiteperlouze.fr',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f4c2c2 0%, #d4a5d4 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
                .message-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #d4a5d4; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>💬 Réponse de La p'tite perlouze</h1>
                </div>
                <div class="content">
                  <div class="message-box">
                    <p>Bonjour ${thread.customer_name},</p>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                    ${attachments.length > 0 ? `<p style="margin-top: 20px;"><strong>📎 Pièces jointes :</strong> ${attachments.map(f => f.originalname).join(', ')}</p>` : ''}
                  </div>
                </div>
                <div class="footer">
                  <p><strong>La p'tite perlouze</strong></p>
                  <p>Bijoux artisanaux avec amour ✨</p>
                  <p style="margin-top: 10px;">Vous pouvez répondre directement à cet email</p>
                </div>
              </div>
            </body>
            </html>
          `
        };

        // Ajouter les pièces jointes si présentes
        if (resendAttachments.length > 0) {
          const fs = require('fs').promises;
          emailData.attachments = await Promise.all(
            resendAttachments.map(async (att) => ({
              filename: att.filename,
              content: await fs.readFile(att.path)
            }))
          );
        }

        const emailResponse = await resend.emails.send(emailData);

        // Mettre à jour le message avec l'ID Resend
        await db.run(
          'UPDATE thread_messages SET resend_email_id = ? WHERE id = ?',
          [emailResponse.id, messageId]
        );

        console.log('✅ Réponse envoyée par email');
      } catch (emailError) {
        console.error('❌ Erreur envoi email:', emailError);
        // On continue même si l'email échoue
      }
    }

    res.json({
      success: true,
      message: 'Réponse envoyée',
      messageId: messageId
    });
  } catch (error) {
    console.error('Erreur envoi réponse:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════
// WEBHOOK RESEND POUR EMAILS ENTRANTS
// ═══════════════════════════════════════════════════

// Webhook pour recevoir les emails entrants de Resend
router.post('/webhook/inbound', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    // Resend envoie les données dans req.body.data
    const emailData = req.body.data || req.body;
    const emailId = emailData.email_id;

    // Récupérer les métadonnées de base
    const from = emailData.from;
    const to = emailData.to;
    const subject = emailData.subject;

    console.log('📧 Email entrant reçu:', { from, subject, emailId });

    // Récupérer le contenu du mail via l'API Resend
    let messageContent = '';
    if (emailId && process.env.RESEND_API_KEY) {
      try {
        const emailResponse = await fetch(`https://api.resend.com/emails/${emailId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
          }
        });
        if (emailResponse.ok) {
          const emailDetails = await emailResponse.json();
          messageContent = emailDetails.text || emailDetails.html || '';
          console.log('📨 Contenu récupéré via API:', messageContent.substring(0, 100) + '...');
        } else {
          console.log('⚠️ Impossible de récupérer le contenu:', emailResponse.status);
        }
      } catch (fetchError) {
        console.error('❌ Erreur fetch email content:', fetchError);
      }
    }

    // Si pas de contenu récupéré, essayer les champs directs (fallback)
    if (!messageContent) {
      messageContent = emailData.text || emailData.html || emailData.body || emailData.plain_text || emailData.content || '[Contenu non disponible]';
    }

    // Extraire l'ID du thread depuis le sujet
    const threadIdMatch = subject?.match(/\[#THREAD-(\d+)\]/);

    if (!threadIdMatch) {
      console.log('⚠️ Pas de thread ID dans le sujet, création d\'un nouveau thread');

      // Extraire l'email de l'expéditeur
      const emailMatch = from.match(/<(.+?)>/) || [null, from];
      const customerEmail = emailMatch[1] || from;
      const customerName = from.replace(/<.+?>/, '').trim() || customerEmail;

      // Créer un nouveau thread
      const threadResult = await db.run(`
        INSERT INTO message_threads (contact_id, subject, customer_name, customer_email, status, last_message_at)
        VALUES (NULL, ?, ?, ?, 'open', CURRENT_TIMESTAMP)
      `, [subject || 'Message sans sujet', customerName, customerEmail]);

      const threadId = threadResult.id;

      // Ajouter le message
      await db.run(`
        INSERT INTO thread_messages (thread_id, sender_type, sender_name, sender_email, message)
        VALUES (?, 'customer', ?, ?, ?)
      `, [threadId, customerName, customerEmail, messageContent]);

      return res.json({ success: true, message: 'Nouveau thread créé' });
    }

    const threadId = parseInt(threadIdMatch[1]);

    // Vérifier que le thread existe
    const thread = await db.get('SELECT * FROM message_threads WHERE id = ?', [threadId]);
    if (!thread) {
      console.log('⚠️ Thread non trouvé:', threadId);
      return res.status(404).json({ error: 'Thread non trouvé' });
    }

    // Extraire l'email de l'expéditeur
    const emailMatch = from.match(/<(.+?)>/) || [null, from];
    const customerEmail = emailMatch[1] || from;
    const customerName = from.replace(/<.+?>/, '').trim() || thread.customer_name;

    // Ajouter le message à la conversation
    await db.run(`
      INSERT INTO thread_messages (thread_id, sender_type, sender_name, sender_email, message)
      VALUES (?, 'customer', ?, ?, ?)
    `, [threadId, customerName, customerEmail, messageContent]);

    // Mettre à jour le thread
    await db.run(`
      UPDATE message_threads
      SET last_message_at = CURRENT_TIMESTAMP, status = 'open'
      WHERE id = ?
    `, [threadId]);

    console.log('✅ Message ajouté au thread', threadId);

    res.json({ success: true, message: 'Message reçu et stocké' });
  } catch (error) {
    console.error('❌ Erreur webhook:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════
// GESTION DES THREADS
// ═══════════════════════════════════════════════════

// Changer le statut d'un thread
router.put('/threads/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['open', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    await db.run('UPDATE message_threads SET status = ? WHERE id = ?', [status, id]);

    res.json({ success: true, message: 'Statut mis à jour' });
  } catch (error) {
    console.error('Erreur mise à jour statut:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un thread
router.delete('/threads/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Suppression thread ${id}...`);

    // Désactiver temporairement les contraintes de clés étrangères
    await db.run('PRAGMA foreign_keys = OFF');

    // Récupérer le contact_id avant suppression
    const thread = await db.get('SELECT contact_id FROM message_threads WHERE id = ?', [id]);

    // Récupérer les messages du thread pour supprimer leurs pièces jointes
    const messages = await db.all('SELECT id FROM thread_messages WHERE thread_id = ?', [id]);

    // Supprimer les pièces jointes de chaque message
    for (const msg of messages) {
      await db.run('DELETE FROM message_attachments WHERE message_id = ?', [msg.id]);
    }

    // Supprimer les messages du thread
    await db.run('DELETE FROM thread_messages WHERE thread_id = ?', [id]);

    // Supprimer le thread
    await db.run('DELETE FROM message_threads WHERE id = ?', [id]);

    // Supprimer le contact associé
    if (thread && thread.contact_id) {
      await db.run('DELETE FROM contacts WHERE id = ?', [thread.contact_id]);
    }

    // Réactiver les contraintes
    await db.run('PRAGMA foreign_keys = ON');

    console.log(`Thread ${id} supprimé avec succès`);
    res.json({ success: true, message: 'Thread supprimé' });
  } catch (error) {
    // Réactiver les contraintes en cas d'erreur
    try { await db.run('PRAGMA foreign_keys = ON'); } catch (e) {}
    console.error('Erreur suppression thread:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const db = require('../models/database');
const { Resend } = require('resend');
const { sendNewEmailNotification, forwardEmail } = require('../services/email');

const resend = new Resend(process.env.RESEND_API_KEY);

// Configuration multer pour les pièces jointes
// Utilisation de memoryStorage pour stocker en base64 dans la BDD (compatible Vercel)
const storage = multer.memoryStorage();

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

    // Récupérer le dernier message du client pour le contexte
    const lastCustomerMessage = await db.get(`
      SELECT message FROM thread_messages
      WHERE thread_id = ? AND sender_type = 'customer'
      ORDER BY created_at DESC LIMIT 1
    `, [id]);
    const customerLastMsg = lastCustomerMessage?.message || '';

    // Insérer le message dans la BDD
    const messageResult = await db.run(`
      INSERT INTO thread_messages (thread_id, sender_type, sender_name, sender_email, message, has_attachments)
      VALUES (?, 'admin', ?, ?, ?, ?)
    `, [id, adminName, process.env.CONTACT_EMAIL || 'contact@laptiteperlouze.fr', message.trim(), attachments.length > 0 ? 1 : 0]);

    const messageId = messageResult.id;

    // Enregistrer les pièces jointes (déjà compressées côté client)
    const processedAttachments = [];
    if (attachments.length > 0) {
      for (const file of attachments) {
        const uniqueName = Date.now() + '-' + crypto.randomBytes(8).toString('hex') + path.extname(file.originalname);
        const base64Content = file.buffer.toString('base64');

        await db.run(`
          INSERT INTO message_attachments (message_id, filename, file_path, file_size, mime_type, content)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [messageId, file.originalname, uniqueName, file.buffer.length, file.mimetype, base64Content]);

        processedAttachments.push({
          originalname: file.originalname,
          buffer: file.buffer,
          mimetype: file.mimetype
        });
      }
    }

    // Mettre à jour le thread
    await db.run(`
      UPDATE message_threads
      SET last_message_at = CURRENT_TIMESTAMP, status = 'open', admin_last_viewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);

    // Préparer les pièces jointes pour Resend (utiliser les fichiers compressés)
    const resendAttachments = processedAttachments.map(file => ({
      filename: file.originalname,
      content: file.buffer
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
                .context-box { background: #f0f0f0; padding: 15px; margin: 15px 0; border-radius: 8px; font-size: 0.9em; color: #666; border-left: 3px solid #ccc; }
                .context-label { font-weight: 600; color: #888; margin-bottom: 8px; font-size: 0.85em; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>💬 Réponse de La p'tite perlouze</h1>
                </div>
                <div class="content">
                  ${customerLastMsg ? `
                  <div class="context-box">
                    <p class="context-label">📩 En réponse à votre message :</p>
                    <p style="margin: 0; font-style: italic;">"${customerLastMsg.length > 200 ? customerLastMsg.substring(0, 200) + '...' : customerLastMsg}"</p>
                  </div>
                  ` : ''}
                  <div class="message-box">
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
          emailData.attachments = resendAttachments;
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

// Fonction pour nettoyer le contenu des emails (retirer les citations)
function cleanEmailContent(content) {
  if (!content) return '';

  let cleaned = content;

  // Supprimer les citations Gmail/Outlook en français
  // "Le dim. 15 févr. 2026 à 15:05, xxx a écrit :"
  cleaned = cleaned.split(/Le\s+[^\d]+\d+\s+[^\d]+\d+\s+[àa]\s+\d+[h:]\d+.*?a\s+[eé]crit\s*:/i)[0];

  // Supprimer les citations en anglais
  // "On Mon, Jan 26, 2026 at 5:35 PM, <email> wrote:"
  cleaned = cleaned.split(/On\s+\w+,?\s+\w+\.?\s+\d+,?\s+\d+\s+at\s+\d+:\d+.*?wrote\s*:/i)[0];

  // Supprimer tout après "-----Original Message-----"
  cleaned = cleaned.split(/[-]+\s*Original Message\s*[-]+/i)[0];

  // Supprimer tout après "---------- Forwarded message ----------"
  cleaned = cleaned.split(/[-]+\s*Forwarded message\s*[-]+/i)[0];

  // Supprimer les lignes qui commencent par ">" (citations)
  cleaned = cleaned.split('\n')
    .filter(line => !line.trim().startsWith('>'))
    .join('\n');

  // Supprimer les lignes vides multiples
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Supprimer les espaces en début/fin
  cleaned = cleaned.trim();

  return cleaned || content; // Retourner l'original si tout a été supprimé
}

// Webhook pour recevoir les emails entrants de Resend
router.post('/webhook/inbound', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    // Resend envoie les données dans req.body.data
    const emailData = req.body.data || req.body;
    const emailId = emailData.email_id;

    // Récupérer les métadonnées de base
    const from = emailData.from;
    const to = emailData.to;
    const subject = emailData.subject;

    console.log('📧 Email entrant reçu:', { emailId });

    // ========== FILTRE ANTI-BOUCLE ==========
    // Ignorer les emails provenant du vendeur ou du système
    const vendorEmail = process.env.VENDOR_EMAIL || 'contact@laptiteperlouze.fr';
    const fromEmail = typeof from === 'string' ? from : (from?.email || from?.[0]?.email || '');
    const toEmails = Array.isArray(to) ? to.map(t => typeof t === 'string' ? t : t?.email).join(',') : (typeof to === 'string' ? to : to?.email || '');
    
    // Ignorer si l'email vient du vendeur ou du système (anti-boucle)
    if (fromEmail.toLowerCase().includes(vendorEmail.toLowerCase()) ||
        fromEmail.toLowerCase().includes('noreply') ||
        fromEmail.toLowerCase().includes('no-reply') ||
        fromEmail.toLowerCase().includes('@resend.dev')) {
      console.log('🚫 Email ignoré (expéditeur vendeur ou système)');
      return res.status(200).json({ success: true, ignored: true, reason: 'vendor_or_system_email' });
    }
    
    // Détecter si l'email est destiné à l'adresse vendeur (pour forwarding uniquement)
    const isEmailToVendor = toEmails.toLowerCase().includes(vendorEmail.toLowerCase());
    // ========================================

    // Récupérer le contenu du mail et les pièces jointes via l'API Resend
    let messageContent = '';
    let htmlContent = '';
    let attachments = [];

    if (emailId && process.env.RESEND_API_KEY) {
      try {
        console.log('📨 Récupération contenu via API /emails/receiving/ pour:', emailId);
        const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
          }
        });

        if (response.ok) {
          const emailDetails = await response.json();

          // Le contenu peut être dans text, html, ou dans un objet imbriqué
          messageContent = emailDetails.text || emailDetails.html || '';
          htmlContent = emailDetails.html || '';

          // Récupérer les pièces jointes si présentes (plusieurs formats possibles)
          const attData = emailDetails.attachments || emailDetails.files || [];
          if (attData.length > 0) {
            console.log(`📎 ${attData.length} pièce(s) jointe(s) détectée(s) via API`);
            for (const att of attData) {
              try {
                // Télécharger le contenu de la pièce jointe via l'API Resend
                // L'API retourne un JSON avec download_url, il faut ensuite télécharger depuis cette URL
                if (att.id) {
                  console.log(`📎 Récupération métadonnées pièce jointe: ${att.id}`);
                  const attMetaResponse = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments/${att.id}`, {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
                    }
                  });
                  if (attMetaResponse.ok) {
                    const attMeta = await attMetaResponse.json();
                    
                    // Télécharger le contenu depuis download_url
                    if (attMeta.download_url) {
                      console.log('📎 Téléchargement du contenu de la pièce jointe');
                      const contentResponse = await fetch(attMeta.download_url);
                      if (contentResponse.ok) {
                        const attBuffer = await contentResponse.arrayBuffer();
                        const base64Content = Buffer.from(attBuffer).toString('base64');
                        attachments.push({
                          filename: attMeta.filename || att.filename || 'attachment',
                          content: base64Content,
                          mimetype: attMeta.content_type || att.content_type || 'application/octet-stream',
                          size: attBuffer.byteLength
                        });
                        console.log(`📎 Pièce jointe récupérée via API (${(attBuffer.byteLength / 1024).toFixed(1)}KB)`);
                      } else {
                        console.log(`⚠️ Erreur téléchargement contenu: ${contentResponse.status}`);
                      }
                    }
                  } else {
                    console.log(`⚠️ Erreur téléchargement métadonnées: ${attMetaResponse.status}`);
                  }
                } else if (att.download_url) {
                  const attResponse = await fetch(att.download_url);
                  if (attResponse.ok) {
                    const attBuffer = await attResponse.arrayBuffer();
                    const base64Content = Buffer.from(attBuffer).toString('base64');
                    attachments.push({
                      filename: att.filename || 'attachment',
                      content: base64Content,
                      mimetype: att.content_type || 'application/octet-stream',
                      size: attBuffer.byteLength
                    });
                    console.log(`📎 Pièce jointe récupérée (${(attBuffer.byteLength / 1024).toFixed(1)}KB)`);
                  }
                } else if (att.content) {
                  // Contenu déjà en base64
                  attachments.push({
                    filename: att.filename || 'attachment',
                    content: att.content,
                    mimetype: att.content_type || 'application/octet-stream',
                    size: att.size || 0
                  });
                }
              } catch (attError) {
                console.error('❌ Erreur téléchargement pièce jointe:', attError.message);
              }
            }
          }

          // Si pas de contenu direct, essayer de télécharger le fichier raw
          if (!messageContent && emailDetails.raw && emailDetails.raw.download_url) {
            try {
              console.log('📨 Téléchargement du raw email...');
              const rawResponse = await fetch(emailDetails.raw.download_url);
              if (rawResponse.ok) {
                const rawEmail = await rawResponse.text();
                // Extraire le contenu texte du mail brut (après les headers)
                const bodyMatch = rawEmail.match(/\r?\n\r?\n([\s\S]*)/);
                if (bodyMatch) {
                  messageContent = bodyMatch[1].trim();
                  console.log('📨 Contenu extrait du raw email');
                }
              }
            } catch (rawError) {
              console.error('❌ Erreur téléchargement raw:', rawError.message);
            }
          }
        } else {
          const errorText = await response.text();
          console.log('⚠️ API receiving response:', response.status, errorText);
        }
      } catch (apiError) {
        console.error('❌ Erreur API Resend:', apiError.message);
      }
    }

    // Fallback sur les données du webhook si l'API n'a pas fonctionné
    if (!messageContent) {
      messageContent = emailData.text || emailData.html || emailData.body || emailData.plain_text || emailData.content || '[Réponse reçue par email]';
    }
    
    // Fallback pour les pièces jointes depuis le webhook (plusieurs formats possibles)
    if (attachments.length === 0) {
      const webhookAttachments = emailData.attachments || emailData.files || req.body.attachments || [];
      console.log(`📎 Vérification webhook pour pièces jointes: ${webhookAttachments.length} trouvée(s)`);
      if (webhookAttachments.length > 0) {
      }
      
      for (const att of webhookAttachments) {
        // Plusieurs formats possibles selon la source
        const content = att.content || att.data || att.base64;
        const filename = att.filename || att.name || att.fileName || 'attachment';
        const mimetype = att.content_type || att.contentType || att.type || att.mimeType || 'application/octet-stream';
        
        if (content) {
          attachments.push({
            filename: filename,
            content: content,
            mimetype: mimetype,
            size: att.size || content.length || 0
          });
          console.log('📎 Pièce jointe webhook ajoutée');
        } else if (att.id && emailId) {
          // Si on a un ID de pièce jointe, récupérer les métadonnées puis télécharger
          try {
            console.log(`📎 Récupération métadonnées via API Resend: ${att.id}`);
            const attMetaResponse = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments/${att.id}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
              }
            });
            if (attMetaResponse.ok) {
              const attMeta = await attMetaResponse.json();
              
              // Télécharger depuis download_url
              if (attMeta.download_url) {
                const contentResponse = await fetch(attMeta.download_url);
                if (contentResponse.ok) {
                  const attBuffer = await contentResponse.arrayBuffer();
                  const base64Content = Buffer.from(attBuffer).toString('base64');
                  attachments.push({
                    filename: attMeta.filename || filename,
                    content: base64Content,
                    mimetype: attMeta.content_type || mimetype,
                    size: attBuffer.byteLength
                  });
                  console.log(`📎 Pièce jointe téléchargée via API (${(attBuffer.byteLength / 1024).toFixed(1)}KB)`);
                } else {
                  console.log(`⚠️ Erreur téléchargement contenu: ${contentResponse.status}`);
                }
              }
            } else {
              console.log(`⚠️ Erreur API pièce jointe: ${attMetaResponse.status}`);
            }
          } catch (dlError) {
            console.error('❌ Erreur téléchargement API:', dlError.message);
          }
        } else if (att.url || att.download_url) {
          // Si c'est une URL, télécharger le contenu
          try {
            const attUrl = att.url || att.download_url;
            console.log('📎 Téléchargement de la pièce jointe');
            const attResponse = await fetch(attUrl);
            if (attResponse.ok) {
              const attBuffer = await attResponse.arrayBuffer();
              const base64Content = Buffer.from(attBuffer).toString('base64');
              attachments.push({
                filename: filename,
                content: base64Content,
                mimetype: mimetype,
                size: attBuffer.byteLength
              });
              console.log(`📎 Pièce jointe téléchargée (${(attBuffer.byteLength / 1024).toFixed(1)}KB)`);
            }
          } catch (dlError) {
            console.error('❌ Erreur téléchargement:', dlError.message);
          }
        }
      }
    }
    
    console.log('📨 Contenu final:', messageContent ? 'présent' : '(vide)');
    console.log(`📎 Total pièces jointes récupérées: ${attachments.length}`);

    // ========== FORWARDING EMAILS VENDEUR ==========
    // Si l'email est destiné à l'adresse vendeur (yvonne@), on le forward et on arrête
    if (isEmailToVendor) {
      console.log('📧 Email destiné au vendeur, forwarding uniquement...');
      try {
        await forwardEmail({
          emailId,
          from: typeof from === 'string' ? from : (from?.email || from?.[0]?.email || 'unknown'),
          subject,
          text: messageContent,
          html: htmlContent,
          attachments
        });
        console.log('✅ Email forwardé avec succès');
      } catch (fwdError) {
        console.error('⚠️ Erreur forwarding:', fwdError.message);
      }
      // Ne pas stocker en base, retourner directement
      return res.status(200).json({ success: true, forwarded: true, reason: 'email_to_vendor_forwarded' });
    }
    // ============================================

    // Nettoyer le contenu pour ne garder que le nouveau message (retirer les citations)
    messageContent = cleanEmailContent(messageContent);

    // Extraire l'ID du thread depuis le sujet
    const threadIdMatch = subject?.match(/\[#THREAD-(\d+)\]/);

    if (!threadIdMatch) {
      console.log('⚠️ Pas de thread ID dans le sujet, création d\'un nouveau thread');

      // Extraire l'email de l'expéditeur
      let customerEmail, customerName;
      if (typeof from === 'string') {
        const emailMatch = from.match(/<(.+?)>/);
        customerEmail = emailMatch ? emailMatch[1] : from;
        customerName = from.replace(/<.+?>/, '').trim() || customerEmail;
      } else {
        customerEmail = from?.address || from?.email || 'unknown@email.com';
        customerName = from?.name || customerEmail;
      }

      console.log('📧 Création d\'un nouveau thread');

      // Créer d'abord un contact (requis par la clé étrangère)
      const contactResult = await db.run(
        'INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)',
        [customerName, customerEmail, messageContent]
      );
      const contactId = contactResult.id;
      console.log('✅ Contact créé avec ID:', contactId);

      // Créer un nouveau thread lié au contact
      const threadResult = await db.run(`
        INSERT INTO message_threads (contact_id, subject, customer_name, customer_email, status, last_message_at)
        VALUES (?, ?, ?, ?, 'open', CURRENT_TIMESTAMP)
      `, [contactId, subject || 'Message sans sujet', customerName, customerEmail]);

      const newThreadId = threadResult.id;
      console.log('✅ Thread créé avec ID:', newThreadId);

      // Ajouter le message avec flag pièces jointes
      const msgResult = await db.run(`
        INSERT INTO thread_messages (thread_id, sender_type, sender_name, sender_email, message, has_attachments)
        VALUES (?, 'customer', ?, ?, ?, ?)
      `, [newThreadId, customerName, customerEmail, messageContent, attachments.length > 0 ? 1 : 0]);

      // Enregistrer les pièces jointes
      if (attachments.length > 0) {
        const messageId = msgResult.id;
        for (const att of attachments) {
          const uniqueName = Date.now() + '-' + crypto.randomBytes(8).toString('hex') + path.extname(att.filename);
          await db.run(`
            INSERT INTO message_attachments (message_id, filename, file_path, file_size, mime_type, content)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [messageId, att.filename, uniqueName, att.size, att.mimetype, att.content]);
        }
        console.log(`📎 ${attachments.length} pièce(s) jointe(s) enregistrée(s)`);
      }

      console.log('✅ Message ajouté au nouveau thread');
      
      // Notifier le vendeur par email
      await sendNewEmailNotification({
        from: customerEmail,
        subject: subject || 'Message sans sujet',
        message: messageContent,
        threadId: newThreadId
      });
      
      return res.json({ success: true, message: 'Nouveau thread créé' });
    }

    const threadId = parseInt(threadIdMatch[1]);
    console.log('📧 Thread ID trouvé:', threadId);

    // Vérifier que le thread existe
    const thread = await db.get('SELECT * FROM message_threads WHERE id = ?', [threadId]);
    if (!thread) {
      console.log('⚠️ Thread non trouvé:', threadId);
      return res.status(404).json({ error: 'Thread non trouvé' });
    }

    // Extraire l'email de l'expéditeur (même logique que pour nouveau thread)
    let customerEmail, customerName;
    if (typeof from === 'string') {
      const emailMatch = from.match(/<(.+?)>/);
      customerEmail = emailMatch ? emailMatch[1] : from;
      customerName = from.replace(/<.+?>/, '').trim() || thread.customer_name;
    } else {
      customerEmail = from?.address || from?.email || thread.customer_email;
      customerName = from?.name || thread.customer_name;
    }

    console.log('📧 Ajout message au thread:', { threadId });

    // Ajouter le message à la conversation avec flag pièces jointes
    const msgResult = await db.run(`
      INSERT INTO thread_messages (thread_id, sender_type, sender_name, sender_email, message, has_attachments)
      VALUES (?, 'customer', ?, ?, ?, ?)
    `, [threadId, customerName, customerEmail, messageContent, attachments.length > 0 ? 1 : 0]);

    // Enregistrer les pièces jointes
    if (attachments.length > 0) {
      const messageId = msgResult.id;
      for (const att of attachments) {
        const uniqueName = Date.now() + '-' + crypto.randomBytes(8).toString('hex') + path.extname(att.filename);
        await db.run(`
          INSERT INTO message_attachments (message_id, filename, file_path, file_size, mime_type, content)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [messageId, att.filename, uniqueName, att.size, att.mimetype, att.content]);
      }
      console.log(`📎 ${attachments.length} pièce(s) jointe(s) enregistrée(s)`);
    }

    // Mettre à jour le thread
    await db.run(`
      UPDATE message_threads
      SET last_message_at = CURRENT_TIMESTAMP, status = 'open'
      WHERE id = ?
    `, [threadId]);

    console.log('✅ Message ajouté au thread', threadId);

    // Notifier le vendeur par email
    await sendNewEmailNotification({
      from: customerEmail,
      subject: subject || thread.subject || 'Réponse client',
      message: messageContent,
      threadId: threadId
    });

    res.json({ success: true, message: 'Message reçu et stocké' });
  } catch (error) {
    console.error('❌ Erreur webhook:', error.message, error.stack);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
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

// ═══════════════════════════════════════════════════
// ENDPOINT POUR SERVIR LES PIÈCES JOINTES
// ═══════════════════════════════════════════════════

// Servir une pièce jointe depuis la base de données
// Route publique - les noms de fichiers sont générés aléatoirement (sécurité par obscurité)
router.get('/attachments/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // Récupérer la pièce jointe depuis la BDD
    const attachment = await db.get(
      'SELECT * FROM message_attachments WHERE file_path = ?',
      [filename]
    );

    if (!attachment) {
      return res.status(404).json({ error: 'Pièce jointe non trouvée' });
    }

    // Vérifier que le contenu base64 existe
    if (!attachment.content) {
      return res.status(404).json({ error: 'Contenu de la pièce jointe non disponible' });
    }

    // Convertir le base64 en buffer
    const fileBuffer = Buffer.from(attachment.content, 'base64');

    // Définir les headers
    res.set({
      'Content-Type': attachment.mime_type,
      'Content-Length': fileBuffer.length,
      'Content-Disposition': `inline; filename="${attachment.filename}"`
    });

    // Envoyer le fichier
    res.send(fileBuffer);
  } catch (error) {
    console.error('Erreur récupération pièce jointe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

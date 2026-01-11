const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { sendContactNotification } = require('../services/email');

// Envoyer un message de contact
router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    // Sauvegarder dans la base de données
    const result = await db.run(
      'INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)',
      [name, email, message]
    );

    // Récupérer le contact créé pour l'email
    const contact = await db.get('SELECT * FROM contacts WHERE id = ?', [result.id]);

    // Créer automatiquement un thread de conversation
    const threadResult = await db.run(
      'INSERT INTO message_threads (contact_id, subject, customer_name, customer_email, status, last_message_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [contact.id, `Message de ${name}`, name, email, 'open']
    );

    // Ajouter le message initial au thread
    await db.run(
      'INSERT INTO thread_messages (thread_id, sender_type, sender_name, sender_email, message) VALUES (?, ?, ?, ?, ?)',
      [threadResult.id, 'customer', name, email, message]
    );

    // Envoyer l'email de notification
    await sendContactNotification(contact);

    res.json({
      success: true,
      message: 'Message envoyé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
  }
});

module.exports = router;

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

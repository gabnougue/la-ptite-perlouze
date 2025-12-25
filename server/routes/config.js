const express = require('express');
const router = express.Router();

// Endpoint pour récupérer la clé publique Stripe
router.get('/stripe-public-key', (req, res) => {
  res.json({
    publicKey: process.env.STRIPE_PUBLIC_KEY || ''
  });
});

module.exports = router;

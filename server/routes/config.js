const express = require('express');
const router = express.Router();

// Endpoint pour récupérer la clé publique Stripe
router.get('/stripe-public-key', (req, res) => {
  res.json({
    // TODO: TEMPORAIRE - remettre process.env.STRIPE_PUBLIC_KEY après test
    publicKey: 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  });
});

module.exports = router;

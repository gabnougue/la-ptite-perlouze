const express = require('express');
const router = express.Router();
const { calculateShipping, calculateShippingFromCart } = require('../services/shippingCalculator');

/**
 * POST /api/shipping/calculate
 * Calculer les frais de livraison à partir d'un panier
 * Body: { items: [{product: {...}, quantity: number}, ...] }
 */
router.post('/calculate', (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Format de panier invalide' });
    }

    const shippingDetails = calculateShippingFromCart(items);

    res.json(shippingDetails);
  } catch (error) {
    console.error('Erreur calcul frais de livraison:', error);
    res.status(500).json({ error: 'Erreur lors du calcul des frais de livraison' });
  }
});

/**
 * GET /api/shipping/calculate?subtotal=XX
 * Calculer les frais de livraison à partir d'un montant
 */
router.get('/calculate', (req, res) => {
  try {
    const subtotal = parseFloat(req.query.subtotal) || 0;

    if (subtotal < 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }

    const shippingDetails = calculateShipping(subtotal);

    res.json(shippingDetails);
  } catch (error) {
    console.error('Erreur calcul frais de livraison:', error);
    res.status(500).json({ error: 'Erreur lors du calcul des frais de livraison' });
  }
});

module.exports = router;

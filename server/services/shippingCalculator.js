/**
 * Service de calcul des frais de livraison
 * La p'tite perlouze - Bijoux (légers, petits colis)
 */

/**
 * Règles de livraison pour les bijoux
 * @param {number} subtotal - Montant total du panier (HT)
 * @returns {object} - { shippingCost, freeShippingThreshold, message }
 */
function calculateShipping(subtotal) {
  const SHIPPING_RULES = {
    FREE_THRESHOLD: 50,        // Livraison gratuite à partir de 50€
    MID_THRESHOLD: 30,         // Seuil intermédiaire à 30€
    LOW_COST: 3.90,           // Frais pour panier < 30€
    MID_COST: 5.90,           // Frais pour panier entre 30€ et 50€
    FREE_COST: 0              // Gratuit >= 50€
  };

  let shippingCost = SHIPPING_RULES.FREE_COST;
  let message = '🎉 Livraison offerte !';

  if (subtotal < SHIPPING_RULES.MID_THRESHOLD) {
    // Panier < 30€
    shippingCost = SHIPPING_RULES.LOW_COST;
    const remaining = (SHIPPING_RULES.FREE_THRESHOLD - subtotal).toFixed(2);
    message = `Plus que ${remaining} € pour la livraison offerte !`;
  } else if (subtotal < SHIPPING_RULES.FREE_THRESHOLD) {
    // Panier entre 30€ et 50€
    shippingCost = SHIPPING_RULES.MID_COST;
    const remaining = (SHIPPING_RULES.FREE_THRESHOLD - subtotal).toFixed(2);
    message = `Plus que ${remaining} € pour la livraison offerte !`;
  }

  return {
    shippingCost: parseFloat(shippingCost.toFixed(2)),
    freeShippingThreshold: SHIPPING_RULES.FREE_THRESHOLD,
    message,
    subtotal: parseFloat(subtotal.toFixed(2)),
    total: parseFloat((subtotal + shippingCost).toFixed(2))
  };
}

/**
 * Calculer les frais à partir d'un panier (array de produits)
 * @param {Array} cartItems - [{product: {...}, quantity: number}, ...]
 * @returns {object} - Détails de livraison
 */
function calculateShippingFromCart(cartItems) {
  if (!cartItems || cartItems.length === 0) {
    return {
      shippingCost: 0,
      freeShippingThreshold: 50,
      message: 'Votre panier est vide',
      subtotal: 0,
      total: 0
    };
  }

  // Calculer le sous-total
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.product?.price || item.price || 0;
    const quantity = item.quantity || 1;
    return sum + (price * quantity);
  }, 0);

  return calculateShipping(subtotal);
}

module.exports = {
  calculateShipping,
  calculateShippingFromCart
};

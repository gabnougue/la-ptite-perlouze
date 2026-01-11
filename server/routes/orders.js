const express = require('express');
const router = express.Router();
const db = require('../models/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { sendOrderNotification, sendCustomerOrderEmail } = require('../services/email');

// Créer une intention de paiement Stripe
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convertir en centimes
      currency: 'eur',
      payment_method_types: ['card', 'paypal'],
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Erreur lors de la création du paiement:', error);
    res.status(500).json({ error: 'Erreur lors de la création du paiement' });
  }
});

// Créer une commande
router.post('/', async (req, res) => {
  try {
    const { customer, items, subtotal, shippingCost, total, paymentIntentId } = req.body;

    // Vérifier le stock pour chaque produit
    for (const item of items) {
      const product = await db.get('SELECT stock FROM products WHERE id = ?', [item.id]);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({
          error: `Stock insuffisant pour ${item.name}`
        });
      }
    }

    // Créer la commande
    const orderResult = await db.run(
      `INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, subtotal, shipping_cost, total, stripe_payment_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.name,
        customer.email,
        customer.phone,
        customer.address,
        subtotal || 0,
        shippingCost || 0,
        total,
        paymentIntentId,
        'pending'
      ]
    );

    const orderId = orderResult.id;

    // Ajouter les items de commande et mettre à jour le stock
    for (const item of items) {
      await db.run(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.id, item.name, item.quantity, item.price]
      );

      // Décrémenter le stock
      await db.run(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.id]
      );
    }

    // Récupérer la commande complète pour l'email
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    const orderItems = await db.all('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

    // Envoyer l'email de notification au vendeur
    await sendOrderNotification(order, orderItems);

    // Envoyer l'email au client (commande en attente)
    await sendCustomerOrderEmail(order, orderItems, 'pending');

    res.json({
      success: true,
      orderId: orderId,
      message: 'Commande créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la commande:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la commande' });
  }
});

// Récupérer une commande par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [id]);
    order.items = items;

    res.json(order);
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

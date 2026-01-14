const express = require('express');
const cookieSession = require('cookie-session');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Vérification SESSION_SECRET obligatoire
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.error('⚠️  ERREUR CRITIQUE: SESSION_SECRET non défini dans .env');
  process.exit(1);
}

// Trust proxy pour Vercel/production (nécessaire pour les cookies secure)
app.set('trust proxy', 1);

// Headers de sécurité avec Helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting global
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Trop de requêtes, réessayez dans 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Bloquer accès direct aux fichiers /admin
app.use('/admin', (req, res, next) => {
  res.status(403).send('Accès interdit');
});

app.use(express.static('public'));

// Configuration des sessions sécurisées
app.use(cookieSession({
  name: 'perlouze.sid',
  keys: [process.env.SESSION_SECRET, process.env.SESSION_SECRET_OLD].filter(Boolean),
  maxAge: 24 * 60 * 60 * 1000, // 24 heures
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict'
}));

// Routes API
const productsRoutes = require('./server/routes/products');
const ordersRoutes = require('./server/routes/orders');
const adminRoutes = require('./server/routes/admin');
const contactRoutes = require('./server/routes/contact');
const settingsRoutes = require('./server/routes/settings');
const boutiqueRoutes = require('./server/routes/boutique');
const configRoutes = require('./server/routes/config');
const shippingRoutes = require('./server/routes/shipping');
const messagesRoutes = require('./server/routes/messages');

app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/boutique', boutiqueRoutes);
app.use('/api/config', configRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/messages', messagesRoutes);

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route catalogue
app.get('/catalogue', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'catalogue.html'));
});

// Route produit
app.get('/produit/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'produit.html'));
});

// Route panier
app.get('/panier', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'panier.html'));
});

// Route contact
app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

// Route boutique
app.get('/boutique', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'boutique.html'));
});

// URL secrète d'administration - NE PAS PARTAGER
const ADMIN_PATH = process.env.ADMIN_PATH || '/gestion-private-2024';

app.get(ADMIN_PATH, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.get(`${ADMIN_PATH}/dashboard`, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

// Démarrage du serveur (uniquement en local, pas sur Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🌸 ════════════════════════════════════════ 🌸`);
    console.log(`   La p'tite perlouze - Serveur démarré`);
    console.log(`🌸 ════════════════════════════════════════ 🌸`);
    console.log(`\n✨ Serveur accessible sur: http://localhost:${PORT}`);
    console.log(`📦 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 Admin: http://localhost:${PORT}${ADMIN_PATH}`);
    console.log(`\n🌼 Bonne journée ! 🌼\n`);
  });
}

// Export pour Vercel
module.exports = app;

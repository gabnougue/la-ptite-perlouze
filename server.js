const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configuration des sessions
app.use(session({
  name: 'perlouze.sid', // Nom unique du cookie pour ce site
  secret: process.env.SESSION_SECRET || 'secret-key-laptiteperlouze',
  resave: false,
  saveUninitialized: false,
  rolling: true, // Renouvelle la session à chaque requête
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 365 * 24 * 60 * 60 * 1000 // 1 an - pratiquement pas d'expiration
  }
}));

// Routes API
const productsRoutes = require('./server/routes/products');
const ordersRoutes = require('./server/routes/orders');
const adminRoutes = require('./server/routes/admin');
const contactRoutes = require('./server/routes/contact');
const settingsRoutes = require('./server/routes/settings');
const boutiqueRoutes = require('./server/routes/boutique');
const configRoutes = require('./server/routes/config');

app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/boutique', boutiqueRoutes);
app.use('/api/config', configRoutes);

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

// Route admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`\n🌸 ════════════════════════════════════════ 🌸`);
  console.log(`   La p'tite perlouze - Serveur démarré`);
  console.log(`🌸 ════════════════════════════════════════ 🌸`);
  console.log(`\n✨ Serveur accessible sur: http://localhost:${PORT}`);
  console.log(`📦 Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n🌼 Bonne journée ! 🌼\n`);
});

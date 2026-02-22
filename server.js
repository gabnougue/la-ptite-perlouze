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

// Middlewares - limite augmentée pour les pièces jointes base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Bloquer accès direct aux fichiers /admin
app.use('/admin', (req, res, next) => {
  res.status(403).send('Accès interdit');
});

// MODE MAINTENANCE
// Définir à false pour désactiver la page d'attente
const MAINTENANCE_MODE = false;
if (MAINTENANCE_MODE) {
  app.use((req, res, next) => {
    // Liste des ressources autorisées
    const allowedAssets = [
      '/logo-large.png',
      '/ptiteperlouze-maintenance.png',
      '/favicon.png',
      '/favicon.ico'
    ];

    // Toujours autoriser l'API, l'Admin (chemins probables) et les assets
    if (req.path.startsWith('/api') ||
      req.path.includes('gestion') ||
      req.path.startsWith('/admin') ||
      allowedAssets.includes(req.path)) {
      return next();
    }

    // Pour tout le reste, afficher la page de maintenance
    res.sendFile(path.join(__dirname, 'public', 'maintenance.html'));
  });
}

// Servir les fichiers statiques AVANT le rate limiting
app.use(express.static('public'));

// Rate limiting global (uniquement pour les routes dynamiques)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: 'Trop de requêtes, réessayez dans quelques minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

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

// Route pierres
app.get('/pierres', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pierres.html'));
});

// Pages légales
app.get('/mentions-legales', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mentions-legales.html'));
});

app.get('/confidentialite', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'confidentialite.html'));
});

app.get('/cgv', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cgv.html'));
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

// Migrations automatiques au démarrage
const db = require('./server/models/database');
(async () => {
  try {
    await db.run('ALTER TABLE products ADD COLUMN is_featured INTEGER DEFAULT 0');
    console.log('⭐ Colonne is_featured ajoutée à products');
  } catch (e) { /* colonne déjà existante */ }
  try {
    await db.run('ALTER TABLE categories ADD COLUMN parent_id INTEGER REFERENCES categories(id)');
    console.log('🗂️ Colonne parent_id ajoutée à categories');
  } catch (e) { /* colonne déjà existante */ }
})();

// Export pour Vercel
module.exports = app;

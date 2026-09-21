const { createClient } = require('@libsql/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Configuration - utilise Turso si disponible, sinon SQLite local
let client;

if (process.env.TURSO_DATABASE_URL) {
  client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  console.log('🌐 Initialisation de la base Turso...');
} else {
  const path = require('path');
  const dbPath = path.join(__dirname, '../../database.db');
  client = createClient({
    url: `file:${dbPath}`,
  });
  console.log('💾 Initialisation de la base SQLite locale...');
}

async function initDatabase() {
  try {
    // Création des tables
    await client.batch([
      // Table des produits
      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        stones TEXT NOT NULL,
        colors TEXT,
        description TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER DEFAULT 0,
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Table des commandes
      `CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_phone TEXT,
        customer_address TEXT,
        subtotal REAL,
        shipping_cost REAL DEFAULT 0,
        total REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        stripe_payment_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Table des items de commande
      `CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )`,

      // Table des administrateurs
      `CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Table des messages de contact
      `CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'nouveau',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Table des paramètres
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Table des threads de messages
      `CREATE TABLE IF NOT EXISTS message_threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER,
        subject TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        admin_last_viewed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts(id)
      )`,

      // Table des messages dans les threads
      `CREATE TABLE IF NOT EXISTS thread_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id INTEGER NOT NULL,
        sender_type TEXT NOT NULL,
        sender_name TEXT,
        sender_email TEXT,
        message TEXT NOT NULL,
        has_attachments INTEGER DEFAULT 0,
        resend_email_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (thread_id) REFERENCES message_threads(id)
      )`,

      // Table des pièces jointes (avec contenu base64 pour Vercel)
      `CREATE TABLE IF NOT EXISTS message_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT,
        file_size INTEGER,
        mime_type TEXT,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES thread_messages(id)
      )`
    ]);

    console.log('✨ Tables créées avec succès');

    // Migration: ajouter la colonne content si elle n'existe pas
    try {
      await client.execute('ALTER TABLE message_attachments ADD COLUMN content TEXT');
      console.log('📎 Colonne content ajoutée à message_attachments');
    } catch (e) {
      // La colonne existe déjà, c'est normal
    }

    // Migration: ajouter la colonne description à stones
    try {
      await client.execute('ALTER TABLE stones ADD COLUMN description TEXT');
      console.log('💎 Colonne description ajoutée à stones');
    } catch (e) {
      // La colonne existe déjà
    }

    // Migration: ajouter cover_image aux catégories
    try {
      await client.execute('ALTER TABLE categories ADD COLUMN cover_image TEXT');
      console.log('🖼️ Colonne cover_image ajoutée à categories');
    } catch (e) {}

    // Migration: ajouter parent_id aux catégories (sous-catégories)
    try {
      await client.execute('ALTER TABLE categories ADD COLUMN parent_id INTEGER REFERENCES categories(id)');
      console.log('🗂️ Colonne parent_id ajoutée à categories');
    } catch (e) {}

    // Migration: ajouter image et détails aux items de commande
    try {
      await client.execute('ALTER TABLE order_items ADD COLUMN product_image TEXT');
    } catch (e) {}
    try {
      await client.execute('ALTER TABLE order_items ADD COLUMN product_details TEXT');
    } catch (e) {}

    // Migration: ajouter is_featured aux produits
    try {
      await client.execute('ALTER TABLE products ADD COLUMN is_featured INTEGER DEFAULT 0');
      console.log('⭐ Colonne is_featured ajoutée à products');
    } catch (e) {}

    // Créer l'administrateur par défaut
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Vérifier si l'admin existe déjà
    const existingAdmin = await client.execute({
      sql: 'SELECT id FROM admins WHERE username = ?',
      args: [adminUsername]
    });

    if (existingAdmin.rows.length === 0) {
      // Renommer l'ancien admin "admin" si il existe
      const oldAdmin = await client.execute("SELECT id FROM admins WHERE username = 'admin'");
      if (oldAdmin.rows.length > 0) {
        await client.execute({
          sql: 'UPDATE admins SET username = ? WHERE username = ?',
          args: [adminUsername, 'admin']
        });
        console.log(`👤 Administrateur renommé en ${adminUsername}`);
      } else {
        await client.execute({
          sql: 'INSERT INTO admins (username, password) VALUES (?, ?)',
          args: [adminUsername, hashedPassword]
        });
        console.log('👤 Administrateur créé');
      }
    } else {
      console.log('👤 Administrateur existant');
    }

    // Vérifier s'il y a déjà des produits
    const existingProducts = await client.execute('SELECT COUNT(*) as count FROM products');

    if (existingProducts.rows[0].count === 0) {
      // Insérer des produits d'exemple
      const sampleProducts = [
        ['Bracelet Sérénité', 'Bracelets', 'Améthyste, Quartz rose', 'Violet, Rose', 'Un bracelet délicat en améthyste et quartz rose pour apaiser l\'esprit et ouvrir le cœur à la douceur.', 25.00, 5, 'bracelet-serenite.jpg'],
        ['Collier Aurore', 'Colliers', 'Agate bleue, Cristal de roche', 'Bleu, Blanc', 'Comme les premières lueurs du jour, ce collier en agate bleue apporte clarté et harmonie à votre quotidien.', 35.00, 3, 'collier-aurore.jpg'],
        ['Boucles d\'oreilles Papillon', 'Boucles d\'oreilles', 'Quartz rose, Perles d\'eau douce', 'Rose, Blanc', 'Légères comme des papillons, ces boucles en quartz rose célèbrent la transformation et la beauté de l\'instant.', 18.00, 8, 'boucles-papillon.jpg'],
        ['Bracelet Équilibre', 'Bracelets', 'Agate verte, Aventurine', 'Vert', 'L\'alliance de l\'agate verte et de l\'aventurine pour retrouver équilibre intérieur et connexion à la nature.', 28.00, 4, 'bracelet-equilibre.jpg'],
        ['Collier Lune d\'Or', 'Colliers', 'Citrine, Perles dorées', 'Jaune, Doré', 'Inspiré par la lumière lunaire, ce collier en citrine rayonne de chaleur et illumine les cœurs d\'optimisme.', 42.00, 2, 'collier-lune.jpg']
      ];

      for (const product of sampleProducts) {
        await client.execute({
          sql: 'INSERT INTO products (name, category, stones, colors, description, price, stock, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          args: product
        });
      }
      console.log('🌸 Produits d\'exemple ajoutés');
    } else {
      console.log('🌸 Produits existants conservés');
    }

    console.log('\n✅ Base de données initialisée avec succès !');
    console.log(`👤 Login admin: ${adminUsername}`);
    console.log('\n⚠️  N\'oubliez pas de changer le mot de passe admin !');

  } catch (err) {
    console.error('❌ Erreur lors de l\'initialisation:', err);
    throw err;
  }
}

// Exécuter l'initialisation
initDatabase()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

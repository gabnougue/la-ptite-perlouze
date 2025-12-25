const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

const dbPath = path.join(__dirname, '../../database.db');
const db = new sqlite3.Database(dbPath);

async function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      // Table des produits
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
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
        )
      `);

      // Table des commandes
      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_name TEXT NOT NULL,
          customer_email TEXT NOT NULL,
          customer_phone TEXT,
          customer_address TEXT,
          total REAL NOT NULL,
          status TEXT DEFAULT 'pending',
          stripe_payment_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Table des items de commande
      db.run(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id),
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `);

      // Table des administrateurs
      db.run(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Table des messages de contact
      db.run(`
        CREATE TABLE IF NOT EXISTS contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          message TEXT NOT NULL,
          status TEXT DEFAULT 'nouveau',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✨ Tables créées avec succès');

      // Créer l'administrateur par défaut
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      db.run(
        'INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)',
        [adminUsername, hashedPassword],
        (err) => {
          if (err) {
            console.error('Erreur lors de la création de l\'admin:', err);
          } else {
            console.log('👤 Administrateur créé');
          }
        }
      );

      // Insérer des produits d'exemple
      const sampleProducts = [
        {
          name: 'Bracelet Sérénité',
          category: 'Bracelets',
          stones: 'Améthyste, Quartz rose',
          colors: 'Violet, Rose',
          description: 'Un bracelet délicat en améthyste et quartz rose pour apaiser l\'esprit et ouvrir le cœur à la douceur.',
          price: 25.00,
          stock: 5,
          image: 'bracelet-serenite.jpg'
        },
        {
          name: 'Collier Aurore',
          category: 'Colliers',
          stones: 'Agate bleue, Cristal de roche',
          colors: 'Bleu, Blanc',
          description: 'Comme les premières lueurs du jour, ce collier en agate bleue apporte clarté et harmonie à votre quotidien.',
          price: 35.00,
          stock: 3,
          image: 'collier-aurore.jpg'
        },
        {
          name: 'Boucles d\'oreilles Papillon',
          category: 'Boucles d\'oreilles',
          stones: 'Quartz rose, Perles d\'eau douce',
          colors: 'Rose, Blanc',
          description: 'Légères comme des papillons, ces boucles en quartz rose célèbrent la transformation et la beauté de l\'instant.',
          price: 18.00,
          stock: 8,
          image: 'boucles-papillon.jpg'
        },
        {
          name: 'Bracelet Équilibre',
          category: 'Bracelets',
          stones: 'Agate verte, Aventurine',
          colors: 'Vert',
          description: 'L\'alliance de l\'agate verte et de l\'aventurine pour retrouver équilibre intérieur et connexion à la nature.',
          price: 28.00,
          stock: 4,
          image: 'bracelet-equilibre.jpg'
        },
        {
          name: 'Collier Lune d\'Or',
          category: 'Colliers',
          stones: 'Citrine, Perles dorées',
          colors: 'Jaune, Doré',
          description: 'Inspiré par la lumière lunaire, ce collier en citrine rayonne de chaleur et illumine les cœurs d\'optimisme.',
          price: 42.00,
          stock: 2,
          image: 'collier-lune.jpg'
        },
        {
          name: 'Bracelet de cheville Liberté',
          category: 'Bracelets de cheville',
          stones: 'Turquoise, Howlite',
          colors: 'Bleu, Blanc',
          description: 'Un bracelet de cheville bohème pour célébrer la liberté et l\'été avec légèreté.',
          price: 22.00,
          stock: 6,
          image: 'cheville-liberte.jpg'
        },
        {
          name: 'Cordon lunettes Bohème',
          category: 'Cordon lunettes',
          stones: 'Agate verte, Jaspe rouge',
          colors: 'Vert, Rouge, Marron',
          description: 'Une chaîne pratique et élégante en pierres naturelles, pour garder vos lunettes toujours à portée de main avec style.',
          price: 22.00,
          stock: 6,
          image: 'chaine-boheme.jpg'
        },
        {
          name: 'Mala Méditation',
          category: 'Mala',
          stones: 'Améthyste, Quartz clair',
          colors: 'Violet, Transparent',
          description: 'Un mala traditionnel de 108 perles pour accompagner vos méditations et intentions.',
          price: 55.00,
          stock: 3,
          image: 'mala-meditation.jpg'
        },
        {
          name: 'Porte-clés Protection',
          category: 'Porte clés',
          stones: 'Œil de tigre, Obsidienne',
          colors: 'Marron, Noir, Doré',
          description: 'Un porte-clés protecteur avec œil de tigre pour vous accompagner au quotidien.',
          price: 12.00,
          stock: 10,
          image: 'portecles-protection.jpg'
        },
        {
          name: 'Bijou de portable Harmonie',
          category: 'Bijoux de portables',
          stones: 'Quartz rose, Améthyste',
          colors: 'Rose, Violet',
          description: 'Un bijou de téléphone délicat pour apporter douceur et harmonie à votre quotidien numérique.',
          price: 15.00,
          stock: 8,
          image: 'portable-harmonie.jpg'
        }
      ];

      const stmt = db.prepare(`
        INSERT INTO products (name, category, stones, colors, description, price, stock, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      sampleProducts.forEach(product => {
        stmt.run(
          product.name,
          product.category,
          product.stones,
          product.colors,
          product.description,
          product.price,
          product.stock,
          product.image
        );
      });

      stmt.finalize(() => {
        console.log('🌸 Produits d\'exemple ajoutés');
        console.log('\n✅ Base de données initialisée avec succès !');
        console.log(`👤 Login admin: ${adminUsername}`);
        console.log(`🔑 Mot de passe: ${adminPassword}`);
        console.log('\n⚠️  N\'oubliez pas de changer le mot de passe admin !');

        db.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  });
}

// Exécuter l'initialisation
initDatabase()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur lors de l\'initialisation:', err);
    process.exit(1);
  });

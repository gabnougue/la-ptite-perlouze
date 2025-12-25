const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database.db');
const db = new sqlite3.Database(dbPath);

async function migrateSettings() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Table des catégories
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Erreur création table categories:', err);
        else console.log('✨ Table categories créée');
      });

      // Table des pierres
      db.run(`
        CREATE TABLE IF NOT EXISTS stones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Erreur création table stones:', err);
        else console.log('✨ Table stones créée');
      });

      // Table des couleurs
      db.run(`
        CREATE TABLE IF NOT EXISTS colors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Erreur création table colors:', err);
        else console.log('✨ Table colors créée');
      });

      // Table de liaison produits-pierres
      db.run(`
        CREATE TABLE IF NOT EXISTS product_stones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          stone_id INTEGER NOT NULL,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (stone_id) REFERENCES stones(id) ON DELETE CASCADE,
          UNIQUE(product_id, stone_id)
        )
      `, (err) => {
        if (err) console.error('Erreur création table product_stones:', err);
        else console.log('✨ Table product_stones créée');
      });

      // Table de liaison produits-couleurs
      db.run(`
        CREATE TABLE IF NOT EXISTS product_colors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          color_id INTEGER NOT NULL,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE CASCADE,
          UNIQUE(product_id, color_id)
        )
      `, (err) => {
        if (err) console.error('Erreur création table product_colors:', err);
        else console.log('✨ Table product_colors créée');
      });

      // Insérer les catégories par défaut
      const defaultCategories = [
        'Bijoux de portables',
        'Boucles d\'oreilles',
        'Bracelets',
        'Bracelets de cheville',
        'Colliers',
        'Cordon lunettes',
        'Mala',
        'Porte clés'
      ];

      const catStmt = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
      defaultCategories.forEach(cat => catStmt.run(cat));
      catStmt.finalize(() => console.log('📁 Catégories par défaut ajoutées'));

      // Insérer les pierres par défaut (extraites des produits existants)
      const defaultStones = [
        'Améthyste',
        'Quartz rose',
        'Agate bleue',
        'Cristal de roche',
        'Perles d\'eau douce',
        'Agate verte',
        'Aventurine',
        'Citrine',
        'Perles dorées',
        'Turquoise',
        'Howlite',
        'Jaspe rouge',
        'Quartz clair',
        'Œil de tigre',
        'Obsidienne'
      ];

      const stoneStmt = db.prepare('INSERT OR IGNORE INTO stones (name) VALUES (?)');
      defaultStones.forEach(stone => stoneStmt.run(stone));
      stoneStmt.finalize(() => console.log('💎 Pierres par défaut ajoutées'));

      // Insérer les couleurs par défaut
      const defaultColors = [
        'Violet',
        'Rose',
        'Bleu',
        'Blanc',
        'Vert',
        'Jaune',
        'Doré',
        'Rouge',
        'Marron',
        'Transparent',
        'Noir'
      ];

      const colorStmt = db.prepare('INSERT OR IGNORE INTO colors (name) VALUES (?)');
      defaultColors.forEach(color => colorStmt.run(color));
      colorStmt.finalize(() => {
        console.log('🎨 Couleurs par défaut ajoutées');
        console.log('\n✅ Migration des paramètres terminée !');

        db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  });
}

// Exécuter la migration
migrateSettings()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur lors de la migration:', err);
    process.exit(1);
  });

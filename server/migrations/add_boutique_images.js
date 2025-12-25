const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../database.db');

console.log('🌸 Migration: Ajout de la table boutique_images');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur de connexion:', err);
    process.exit(1);
  }
});

db.serialize(() => {
  // Créer la table boutique_images
  db.run(`
    CREATE TABLE IF NOT EXISTS boutique_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_path TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Erreur création table:', err);
      process.exit(1);
    }
    console.log('✅ Table boutique_images créée');
  });

  // Vérifier si des images existent déjà
  db.get('SELECT COUNT(*) as count FROM boutique_images', (err, row) => {
    if (err) {
      console.error('Erreur vérification:', err);
      process.exit(1);
    }

    if (row.count === 0) {
      console.log('📸 Initialisation des images de la boutique...');

      // Ajouter les 10 images existantes
      const images = [];
      for (let i = 1; i <= 10; i++) {
        images.push([`/images/boutique/atelier${i}.png`, i]);
      }

      const stmt = db.prepare('INSERT INTO boutique_images (image_path, display_order) VALUES (?, ?)');

      images.forEach(([path, order]) => {
        stmt.run(path, order, (err) => {
          if (err) {
            console.error(`Erreur ajout image ${path}:`, err);
          }
        });
      });

      stmt.finalize(() => {
        console.log('✅ 10 images initialisées');
        db.close();
      });
    } else {
      console.log('ℹ️  Images déjà présentes, pas d\'initialisation');
      db.close();
    }
  });
});

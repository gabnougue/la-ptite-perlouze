const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database.db');
const db = new sqlite3.Database(dbPath);

async function migrateDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('🔄 Migration de la base de données...');

      // Ajouter la colonne 'colors' si elle n'existe pas
      db.run(`
        ALTER TABLE products ADD COLUMN colors TEXT
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Erreur lors de l\'ajout de la colonne colors:', err);
        } else if (!err) {
          console.log('✅ Colonne "colors" ajoutée');
        }
      });

      // Mettre à jour les produits existants avec des couleurs
      const colorUpdates = [
        { id: 1, colors: 'Violet, Rose' },
        { id: 2, colors: 'Bleu, Blanc' },
        { id: 3, colors: 'Rose' },
        { id: 4, colors: 'Vert, Rouge' },
        { id: 5, colors: 'Vert' },
        { id: 6, colors: 'Jaune, Doré' }
      ];

      colorUpdates.forEach(update => {
        db.run(
          'UPDATE products SET colors = ? WHERE id = ?',
          [update.colors, update.id],
          (err) => {
            if (err) {
              console.error(`Erreur mise à jour produit ${update.id}:`, err);
            }
          }
        );
      });

      console.log('✅ Migration terminée !');

      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

// Exécuter la migration
migrateDatabase()
  .then(() => {
    console.log('\n🌸 Base de données mise à jour avec succès !');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur lors de la migration:', err);
    process.exit(1);
  });

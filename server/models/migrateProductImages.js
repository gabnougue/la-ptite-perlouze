const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database.db');
const db = new sqlite3.Database(dbPath);

async function migrateProductImages() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('🔄 Début de la migration des images produits...');

      // Créer la table product_images
      db.run(`
        CREATE TABLE IF NOT EXISTS product_images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          image_path TEXT NOT NULL,
          display_order INTEGER DEFAULT 0,
          is_primary BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('❌ Erreur lors de la création de la table product_images:', err);
          reject(err);
          return;
        }
        console.log('✅ Table product_images créée');

        // Migrer les images existantes depuis la colonne 'image' de products
        db.all('SELECT id, image FROM products WHERE image IS NOT NULL AND image != ""', [], (err, products) => {
          if (err) {
            console.error('❌ Erreur lors de la récupération des produits:', err);
            reject(err);
            return;
          }

          if (products.length === 0) {
            console.log('✅ Aucune image à migrer');
            resolve();
            return;
          }

          console.log(`📸 Migration de ${products.length} images existantes...`);

          let completed = 0;
          products.forEach(product => {
            db.run(
              'INSERT INTO product_images (product_id, image_path, display_order, is_primary) VALUES (?, ?, 0, 1)',
              [product.id, product.image],
              (err) => {
                if (err) {
                  console.error(`❌ Erreur migration image produit ${product.id}:`, err);
                } else {
                  console.log(`✅ Image migrée pour produit ${product.id}`);
                }

                completed++;
                if (completed === products.length) {
                  console.log('✅ Migration terminée avec succès !');
                  resolve();
                }
              }
            );
          });
        });
      });
    });
  });
}

// Exécuter la migration si appelé directement
if (require.main === module) {
  migrateProductImages()
    .then(() => {
      console.log('\n🎉 Migration complète !');
      db.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n💥 Erreur lors de la migration:', err);
      db.close();
      process.exit(1);
    });
}

module.exports = migrateProductImages;

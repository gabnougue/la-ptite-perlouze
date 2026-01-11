// Migration pour ajouter les colonnes de livraison à la table orders
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database.db');

function addShippingToOrders() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);

    db.serialize(() => {
      // Ajouter la colonne subtotal si elle n'existe pas
      db.run(`
        ALTER TABLE orders ADD COLUMN subtotal REAL DEFAULT 0
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('❌ Erreur ajout colonne subtotal:', err.message);
        } else if (!err) {
          console.log('✅ Colonne subtotal ajoutée');
        } else {
          console.log('ℹ️  Colonne subtotal existe déjà');
        }
      });

      // Ajouter la colonne shipping_cost si elle n'existe pas
      db.run(`
        ALTER TABLE orders ADD COLUMN shipping_cost REAL DEFAULT 0
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('❌ Erreur ajout colonne shipping_cost:', err.message);
          reject(err);
        } else if (!err) {
          console.log('✅ Colonne shipping_cost ajoutée');
        } else {
          console.log('ℹ️  Colonne shipping_cost existe déjà');
        }

        // Mettre à jour les anciennes commandes (subtotal = total, shipping_cost = 0)
        db.run(`
          UPDATE orders
          SET subtotal = total, shipping_cost = 0
          WHERE subtotal IS NULL OR subtotal = 0
        `, (err) => {
          if (err) {
            console.error('❌ Erreur mise à jour commandes:', err.message);
          } else {
            console.log('✅ Anciennes commandes mises à jour');
          }

          db.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });
    });
  });
}

// Exécuter si appelé directement
if (require.main === module) {
  console.log('🚀 Démarrage de la migration shipping...\n');
  addShippingToOrders()
    .then(() => {
      console.log('\n✨ Migration terminée avec succès !');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n💥 Erreur lors de la migration:', err);
      process.exit(1);
    });
}

module.exports = addShippingToOrders;

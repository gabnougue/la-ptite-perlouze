/**
 * Script pour ajouter la colonne content à message_attachments sur Turso
 * Usage: node scripts/addContentColumn.js
 */

const { createClient } = require('@libsql/client');
require('dotenv').config();

async function addContentColumn() {
  if (!process.env.TURSO_DATABASE_URL) {
    console.log('⚠️ TURSO_DATABASE_URL non défini, utilisation de la base locale');
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:database.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('🔧 Connexion à la base de données...');

  try {
    // Vérifier si la colonne existe déjà
    const tableInfo = await client.execute('PRAGMA table_info(message_attachments)');
    const columns = tableInfo.rows.map(row => row.name);
    
    console.log('📋 Colonnes actuelles:', columns);

    if (columns.includes('content')) {
      console.log('✅ La colonne content existe déjà');
    } else {
      await client.execute('ALTER TABLE message_attachments ADD COLUMN content TEXT');
      console.log('✅ Colonne content ajoutée avec succès');
    }

    // Vérifier la structure finale
    const finalInfo = await client.execute('PRAGMA table_info(message_attachments)');
    console.log('\n📊 Structure finale de message_attachments:');
    finalInfo.rows.forEach(row => {
      console.log(`   - ${row.name} (${row.type})`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }

  console.log('\n✅ Migration terminée');
  process.exit(0);
}

addContentColumn();

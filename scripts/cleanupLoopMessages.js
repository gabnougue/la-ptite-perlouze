/**
 * Script pour nettoyer les messages en boucle
 * Supprime les messages où l'expéditeur = destinataire = contact@laptiteperlouze.fr
 */

const { createClient } = require('@libsql/client');
require('dotenv').config();

async function cleanup() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('🔍 Recherche des messages en boucle...');

  // Trouver les messages où sender_email = contact@laptiteperlouze.fr
  const loopMessages = await client.execute({
    sql: `SELECT tm.id, tm.thread_id, tm.sender_email, tm.message, tm.created_at 
          FROM thread_messages tm 
          WHERE tm.sender_email LIKE '%contact@laptiteperlouze.fr%'
          ORDER BY tm.created_at DESC`,
    args: []
  });

  console.log(`📧 ${loopMessages.rows.length} message(s) trouvé(s) de contact@laptiteperlouze.fr`);

  if (loopMessages.rows.length === 0) {
    console.log('✅ Aucun message à supprimer');
    return;
  }

  // Afficher quelques exemples
  console.log('\n📋 Exemples de messages à supprimer:');
  loopMessages.rows.slice(0, 5).forEach((msg, i) => {
    console.log(`  ${i+1}. ID: ${msg.id}, Thread: ${msg.thread_id}, Date: ${msg.created_at}`);
    console.log(`     Message: ${msg.message?.substring(0, 100)}...`);
  });

  // Récupérer les IDs des messages
  const messageIds = loopMessages.rows.map(m => m.id);
  
  // Supprimer les pièces jointes associées
  console.log('\n🗑️ Suppression des pièces jointes...');
  const attachmentsResult = await client.execute({
    sql: `DELETE FROM message_attachments WHERE message_id IN (${messageIds.join(',')})`,
    args: []
  });
  console.log(`   ${attachmentsResult.rowsAffected || 0} pièce(s) jointe(s) supprimée(s)`);

  // Supprimer les messages
  console.log('🗑️ Suppression des messages...');
  const messagesResult = await client.execute({
    sql: `DELETE FROM thread_messages WHERE sender_email LIKE '%contact@laptiteperlouze.fr%'`,
    args: []
  });
  console.log(`   ${messagesResult.rowsAffected || 0} message(s) supprimé(s)`);

  // Supprimer les threads vides (sans messages)
  console.log('🗑️ Nettoyage des threads vides...');
  const emptyThreadsResult = await client.execute({
    sql: `DELETE FROM message_threads WHERE id NOT IN (SELECT DISTINCT thread_id FROM thread_messages)`,
    args: []
  });
  console.log(`   ${emptyThreadsResult.rowsAffected || 0} thread(s) vide(s) supprimé(s)`);

  console.log('\n✅ Nettoyage terminé !');
}

cleanup().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});

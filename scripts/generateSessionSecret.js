#!/usr/bin/env node

/**
 * Script de génération de SESSION_SECRET forte
 * Usage: node scripts/generateSessionSecret.js
 */

const crypto = require('crypto');

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

console.log('\n🔐 GÉNÉRATION DE CLÉS SECRÈTES\n');
console.log('━'.repeat(60));

const secret = generateSecret();
console.log('\n📝 SESSION_SECRET générée:');
console.log(secret);

console.log('\n📋 À ajouter dans votre fichier .env:');
console.log('━'.repeat(60));
console.log(`SESSION_SECRET=${secret}`);
console.log('━'.repeat(60));

console.log('\n⚠️  IMPORTANT:');
console.log('  • Ne JAMAIS commiter cette clé dans Git');
console.log('  • Utiliser une clé différente pour chaque environnement');
console.log('  • Changer cette clé tous les 6 mois minimum\n');

// Générer aussi une URL admin suggérée
const randomPath = crypto.randomBytes(8).toString('hex');
console.log('💡 Suggestion URL admin secrète:');
console.log(`ADMIN_PATH=/gestion-${randomPath}`);
console.log('\n');

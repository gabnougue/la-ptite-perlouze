/**
 * Script de compression des images existantes
 * Compresse les images sur place en gardant le même nom
 *
 * Usage: node scripts/compress-images.js
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../public/images/uploads');
const BACKUP_DIR = path.join(__dirname, '../public/images/uploads_backup');

async function compressImages() {
  console.log('🖼️  Compression des images existantes...\n');

  try {
    // Créer le dossier de backup
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    // Lire tous les fichiers
    const files = await fs.readdir(UPLOADS_DIR);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

    console.log(`📁 ${imageFiles.length} images trouvées\n`);

    let totalOriginal = 0;
    let totalCompressed = 0;
    let processed = 0;
    let skipped = 0;

    for (const file of imageFiles) {
      const inputPath = path.join(UPLOADS_DIR, file);
      const backupPath = path.join(BACKUP_DIR, file);
      const tempPath = inputPath + '.tmp';

      try {
        // Vérifier la taille originale
        const stats = await fs.stat(inputPath);
        const originalSize = stats.size;
        totalOriginal += originalSize;

        // Si déjà petit (< 150KB), skip
        if (originalSize < 150 * 1024) {
          console.log(`⏭️  ${file} - déjà petit (${(originalSize / 1024).toFixed(0)} KB)`);
          skipped++;
          totalCompressed += originalSize;
          continue;
        }

        // Backup de l'original
        await fs.copyFile(inputPath, backupPath);

        // Déterminer le format de sortie
        const ext = path.extname(file).toLowerCase();
        let sharpInstance = sharp(inputPath)
          .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true
          });

        // Compresser selon le format
        if (ext === '.png') {
          sharpInstance = sharpInstance.png({ quality: 80, compressionLevel: 9 });
        } else if (ext === '.jpg' || ext === '.jpeg') {
          sharpInstance = sharpInstance.jpeg({ quality: 80 });
        } else if (ext === '.webp') {
          sharpInstance = sharpInstance.webp({ quality: 80 });
        } else if (ext === '.gif') {
          // GIF : convertir en PNG compressé
          sharpInstance = sharpInstance.png({ quality: 80 });
        }

        await sharpInstance.toFile(tempPath);

        // Remplacer l'original par la version compressée
        await fs.unlink(inputPath);
        await fs.rename(tempPath, inputPath);

        // Vérifier la nouvelle taille
        const newStats = await fs.stat(inputPath);
        const newSize = newStats.size;
        totalCompressed += newSize;

        const reduction = ((1 - newSize / originalSize) * 100).toFixed(1);
        console.log(`✅ ${file}`);
        console.log(`   ${(originalSize / 1024).toFixed(0)} KB → ${(newSize / 1024).toFixed(0)} KB (-${reduction}%)\n`);

        processed++;
      } catch (err) {
        console.error(`❌ Erreur sur ${file}:`, err.message);
        // Nettoyer le fichier temp si existant
        try { await fs.unlink(tempPath); } catch {}
      }
    }

    console.log('\n' + '═'.repeat(50));
    console.log('📊 RÉSUMÉ');
    console.log('═'.repeat(50));
    console.log(`Images traitées: ${processed}`);
    console.log(`Images ignorées: ${skipped}`);
    console.log(`Taille originale: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Taille finale: ${(totalCompressed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Réduction: ${((1 - totalCompressed / totalOriginal) * 100).toFixed(1)}%`);
    console.log(`\n💾 Backup sauvegardé dans: ${BACKUP_DIR}`);
    console.log('\n✨ Aucune modification de la base de données nécessaire !');

  } catch (err) {
    console.error('Erreur:', err);
  }
}

compressImages();

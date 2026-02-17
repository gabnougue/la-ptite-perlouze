const express = require('express');
const router = express.Router();
const db = require('../models/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { put, del } = require('@vercel/blob');

// Middleware pour vérifier l'authentification admin
const requireAuth = (req, res, next) => {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  next();
};

// Configuration multer avec stockage en mémoire pour Vercel
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max en entrée
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  }
});

// Fonction pour compresser et sauvegarder une image boutique (via Vercel Blob)
async function processAndSaveBoutiqueImage(fileBuffer) {
  const uniqueName = 'boutique-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + '.webp';

  // Compresser l'image avec sharp
  const compressedBuffer = await sharp(fileBuffer)
    .resize(1200, 800, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality: 85 })
    .toBuffer();

  // Upload vers Vercel Blob
  const blob = await put(`boutique/${uniqueName}`, compressedBuffer, {
    access: 'public',
    contentType: 'image/webp'
  });

  // Retourner l'URL complète du blob
  return blob.url;
}

// Récupérer toutes les images de la boutique
router.get('/images', async (req, res) => {
  try {
    const images = await db.all(
      'SELECT * FROM boutique_images ORDER BY display_order ASC'
    );
    res.json(images);
  } catch (error) {
    console.error('Erreur récupération images boutique:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ajouter une nouvelle image
router.post('/images', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image fournie' });
    }

    // Compresser et sauvegarder l'image (retourne l'URL blob complète)
    const imageUrl = await processAndSaveBoutiqueImage(req.file.buffer);

    // Obtenir le dernier display_order
    const lastImage = await db.get(
      'SELECT MAX(display_order) as maxOrder FROM boutique_images'
    );
    const newOrder = (lastImage?.maxOrder || 0) + 1;

    const result = await db.run(
      'INSERT INTO boutique_images (image_path, display_order) VALUES (?, ?)',
      [imageUrl, newOrder]
    );

    res.json({
      id: result.id,
      image_path: imageUrl,
      display_order: newOrder
    });
  } catch (error) {
    console.error('Erreur ajout image boutique:', error);
    res.status(500).json({ error: error.message });
  }
});

// Supprimer une image
router.delete('/images/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer l'image pour supprimer le fichier
    const image = await db.get(
      'SELECT * FROM boutique_images WHERE id = ?',
      [id]
    );

    if (!image) {
      return res.status(404).json({ error: 'Image non trouvée' });
    }

    // Supprimer le fichier (Vercel Blob ou local)
    if (image.image_path.startsWith('https://')) {
      // C'est une URL Vercel Blob
      try {
        await del(image.image_path);
      } catch (err) {
        console.error('Erreur suppression blob:', err);
      }
    } else {
      // C'est un fichier local (anciennes images)
      const filePath = path.join(__dirname, '../../public', image.image_path);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error('Erreur suppression fichier:', err);
      }
    }

    // Supprimer de la base de données
    await db.run('DELETE FROM boutique_images WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression image boutique:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mettre à jour l'ordre des images
router.put('/images/reorder', requireAuth, async (req, res) => {
  try {
    const { images } = req.body; // Array d'objets {id, display_order}

    if (!Array.isArray(images)) {
      return res.status(400).json({ error: 'Format invalide' });
    }

    // Mettre à jour l'ordre de chaque image
    for (const img of images) {
      await db.run(
        'UPDATE boutique_images SET display_order = ? WHERE id = ?',
        [img.display_order, img.id]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur réorganisation images:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

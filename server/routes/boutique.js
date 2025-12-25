const express = require('express');
const router = express.Router();
const db = require('../models/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Middleware pour vérifier l'authentification admin
const requireAuth = (req, res, next) => {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  next();
};

// Configuration multer pour l'upload d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/boutique/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'boutique-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
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

// Récupérer toutes les images de la boutique (et les importer automatiquement si nécessaire)
router.get('/images', async (req, res) => {
  try {
    // D'abord, synchroniser automatiquement les images du dossier avec la base de données
    const boutiqueDir = path.join(__dirname, '../../public/images/boutique');

    try {
      const files = await fs.readdir(boutiqueDir);

      // Filtrer uniquement les images
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      });

      // Récupérer les images déjà en base
      const existingImages = await db.all('SELECT image_path FROM boutique_images');
      const existingPaths = new Set(existingImages.map(img => img.image_path));

      // Obtenir le dernier display_order
      const lastImage = await db.get('SELECT MAX(display_order) as maxOrder FROM boutique_images');
      let currentOrder = (lastImage?.maxOrder || 0) + 1;

      // Ajouter chaque image qui n'existe pas encore
      for (const file of imageFiles) {
        const imagePath = `/images/boutique/${file}`;

        if (!existingPaths.has(imagePath)) {
          await db.run(
            'INSERT INTO boutique_images (image_path, display_order) VALUES (?, ?)',
            [imagePath, currentOrder]
          );
          currentOrder++;
        }
      }
    } catch (syncError) {
      console.error('Erreur synchronisation images:', syncError);
      // Continue même si la synchro échoue
    }

    // Retourner toutes les images
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

    const imagePath = '/images/boutique/' + req.file.filename;

    // Obtenir le dernier display_order
    const lastImage = await db.get(
      'SELECT MAX(display_order) as maxOrder FROM boutique_images'
    );
    const newOrder = (lastImage.maxOrder || 0) + 1;

    const result = await db.run(
      'INSERT INTO boutique_images (image_path, display_order) VALUES (?, ?)',
      [imagePath, newOrder]
    );

    res.json({
      id: result.id,
      image_path: imagePath,
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

    // Supprimer le fichier physique
    const filePath = path.join(__dirname, '../../public', image.image_path);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.error('Erreur suppression fichier:', err);
      // Continue même si le fichier n'existe pas
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

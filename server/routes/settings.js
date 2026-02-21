const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const { put, del } = require('@vercel/blob');
const db = require('../models/database');

// Multer en mémoire pour traitement sharp
const uploadCover = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|gif|webp/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Seules les images sont autorisées'));
  }
}).single('cover_image');

// Traiter et uploader une image de couverture
async function processAndUploadCover(fileBuffer) {
  const uniqueName = `categories/cover-${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
  const compressed = await sharp(fileBuffer)
    .resize(800, 600, { fit: 'cover' })
    .webp({ quality: 85 })
    .toBuffer();
  const blob = await put(uniqueName, compressed, { access: 'public', contentType: 'image/webp' });
  return blob.url;
}

// Middleware pour vérifier l'authentification admin
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  next();
}

// ═══════════════════════════════════════════════════
// PARAMÈTRES GÉNÉRAUX
// ═══════════════════════════════════════════════════

// Récupérer tous les paramètres
router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM settings', []);

    // Convertir en objet clé-valeur avec valeurs par défaut
    const settings = {
      boutdebois_url: 'https://www.leptitboutdebois.fr'
    };
    rows.forEach(row => {
      settings[row.key] = row.value;
    });

    res.json(settings);
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour un paramètre
router.put('/:key', requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    await db.run(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `, [key, value, value]);

    res.json({
      success: true,
      message: 'Paramètre mis à jour'
    });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// ═══════════════════════════════════════════════════
// CATÉGORIES
// ═══════════════════════════════════════════════════

// Récupérer toutes les catégories
router.get('/categories', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM categories ORDER BY name ASC', []);
    res.json(rows);
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter une catégorie
router.post('/categories', requireAdmin, (req, res) => {
  uploadCover(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const { name, emoji, description } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Le nom est requis' });
      }

      let coverUrl = '';
      if (req.file) {
        coverUrl = await processAndUploadCover(req.file.buffer);
      }

      const result = await db.run(
        'INSERT INTO categories (name, emoji, description, cover_image) VALUES (?, ?, ?, ?)',
        [name.trim(), emoji || '✨', description || '', coverUrl]
      );
      res.json({ success: true, id: result.id, name: name.trim(), emoji: emoji || '✨', description: description || '', cover_image: coverUrl });
    } catch (err) {
      console.error('Erreur:', err);
      if (err.code === 'SQLITE_CONSTRAINT' || (err.message && err.message.includes('UNIQUE'))) {
        return res.status(400).json({ error: 'Cette catégorie existe déjà' });
      }
      res.status(500).json({ error: 'Erreur lors de l\'ajout' });
    }
  });
});

// Modifier une catégorie
router.put('/categories/:id', requireAdmin, (req, res) => {
  uploadCover(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const { id } = req.params;
      const { name, emoji, description, remove_cover } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Le nom est requis' });
      }

      // Récupérer l'ancienne catégorie
      const oldCat = await db.get('SELECT name, cover_image FROM categories WHERE id = ?', [id]);
      const oldName = oldCat ? oldCat.name : null;

      let coverUrl = oldCat ? oldCat.cover_image || '' : '';

      // Nouvelle image uploadée
      if (req.file) {
        // Supprimer l'ancienne du blob si elle existe
        if (coverUrl) {
          try { await del(coverUrl); } catch (e) {}
        }
        coverUrl = await processAndUploadCover(req.file.buffer);
      } else if (remove_cover === 'true') {
        // Suppression demandée sans remplacement
        if (coverUrl) {
          try { await del(coverUrl); } catch (e) {}
        }
        coverUrl = '';
      }

      await db.run(
        'UPDATE categories SET name = ?, emoji = ?, description = ?, cover_image = ? WHERE id = ?',
        [name.trim(), emoji || '✨', description || '', coverUrl, id]
      );

      // Mettre à jour la catégorie dans les produits associés
      if (oldName && oldName !== name.trim()) {
        await db.run('UPDATE products SET category = ? WHERE category = ?', [name.trim(), oldName]);
      }

      res.json({ success: true, id: parseInt(id), name: name.trim(), emoji: emoji || '✨', description: description || '', cover_image: coverUrl });
    } catch (err) {
      console.error('Erreur:', err);
      if (err.code === 'SQLITE_CONSTRAINT' || (err.message && err.message.includes('UNIQUE'))) {
        return res.status(400).json({ error: 'Cette catégorie existe déjà' });
      }
      res.status(500).json({ error: 'Erreur lors de la modification' });
    }
  });
});

// Supprimer une catégorie
router.delete('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// ═══════════════════════════════════════════════════
// PIERRES
// ═══════════════════════════════════════════════════

// Récupérer toutes les pierres
router.get('/stones', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM stones ORDER BY name ASC', []);
    res.json(rows);
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter une pierre
router.post('/stones', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const result = await db.run(
      'INSERT INTO stones (name, description) VALUES (?, ?)',
      [name.trim(), description || '']
    );
    res.json({ success: true, id: result.id, name: name.trim(), description: description || '' });
  } catch (err) {
    console.error('Erreur:', err);
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Cette pierre existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de l\'ajout' });
  }
});

// Modifier une pierre
router.put('/stones/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nom de pierre requis' });
  }

  try {
    await db.run(
      'UPDATE stones SET name = ?, description = ? WHERE id = ?',
      [name.trim(), description || '', id]
    );
    res.json({ success: true, stone: { id: parseInt(id), name: name.trim(), description: description || '' } });
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Cette pierre existe déjà' });
    }
    console.error('Erreur modification pierre:', error);
    res.status(500).json({ error: error.message });
  }
});

// Supprimer une pierre
router.delete('/stones/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM stones WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// ═══════════════════════════════════════════════════
// COULEURS
// ═══════════════════════════════════════════════════

// Récupérer toutes les couleurs
router.get('/colors', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM colors ORDER BY name ASC', []);
    res.json(rows);
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter une couleur
router.post('/colors', requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const result = await db.run('INSERT INTO colors (name) VALUES (?)', [name.trim()]);
    res.json({ success: true, id: result.id, name: name.trim() });
  } catch (err) {
    console.error('Erreur:', err);
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Cette couleur existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de l\'ajout' });
  }
});

// Supprimer une couleur
router.delete('/colors/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM colors WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// ═══════════════════════════════════════════════════
// THÈME
// ═══════════════════════════════════════════════════

// Récupérer le thème actuel
router.get('/theme', async (req, res) => {
  try {
    const row = await db.get('SELECT value FROM settings WHERE key = ?', ['theme']);
    const theme = row ? row.value : 'auto';
    res.json({ theme });
  } catch (err) {
    console.error('Erreur:', err);
    // En cas d'erreur, retourner auto par défaut
    res.json({ theme: 'auto' });
  }
});

// Modifier le thème
router.post('/theme', requireAdmin, async (req, res) => {
  try {
    const { theme } = req.body;

    // Liste complète des thèmes disponibles
    const validThemes = [
      'auto',        // Détection automatique selon la saison
      'rose',        // Thème rose classique
      'noel',        // Thème de Noël
      'printemps',   // Thème printemps
      'ete',         // Thème été
      'automne',     // Thème automne
      'halloween',   // Thème Halloween
      'valentin',    // Thème Saint-Valentin
      'hiver'        // Thème hiver
    ];

    if (!theme || !validThemes.includes(theme)) {
      return res.status(400).json({ error: 'Thème invalide' });
    }

    // Sauvegarder le thème en base de données
    await db.run(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('theme', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `, [theme, theme]);

    res.json({ success: true, theme });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ error: 'Erreur lors du changement de thème' });
  }
});

// Récupérer la liste de tous les thèmes disponibles
router.get('/themes', (req, res) => {
  const themes = [
    { value: 'auto', label: '🎨 Automatique (selon la saison)', seasonal: false },
    { value: 'rose', label: '🌺 Rose classique', seasonal: false },
    { value: 'noel', label: '🎄 Noël', seasonal: true },
    { value: 'printemps', label: '🌸 Printemps', seasonal: true },
    { value: 'ete', label: '☀️ Été', seasonal: true },
    { value: 'automne', label: '🍂 Automne', seasonal: true },
    { value: 'halloween', label: '🎃 Halloween', seasonal: true },
    { value: 'valentin', label: '💝 Saint-Valentin', seasonal: true },
    { value: 'hiver', label: '❄️ Hiver', seasonal: true }
  ];
  res.json(themes);
});

module.exports = router;

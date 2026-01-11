const express = require('express');
const router = express.Router();
const db = require('../models/database');

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

    // Convertir en objet clé-valeur
    const settings = {};
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
router.post('/categories', requireAdmin, async (req, res) => {
  try {
    const { name, emoji, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const result = await db.run(
      'INSERT INTO categories (name, emoji, description) VALUES (?, ?, ?)',
      [name.trim(), emoji || '✨', description || '']
    );
    res.json({ success: true, id: result.id, name: name.trim(), emoji: emoji || '✨', description: description || '' });
  } catch (err) {
    console.error('Erreur:', err);
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Cette catégorie existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de l\'ajout' });
  }
});

// Modifier une catégorie
router.put('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, emoji, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    await db.run(
      'UPDATE categories SET name = ?, emoji = ?, description = ? WHERE id = ?',
      [name.trim(), emoji || '✨', description || '', id]
    );
    res.json({ success: true, id: parseInt(id), name: name.trim(), emoji: emoji || '✨', description: description || '' });
  } catch (err) {
    console.error('Erreur:', err);
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Cette catégorie existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la modification' });
  }
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
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const result = await db.run('INSERT INTO stones (name) VALUES (?)', [name.trim()]);
    res.json({ success: true, id: result.id, name: name.trim() });
  } catch (err) {
    console.error('Erreur:', err);
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Cette pierre existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de l\'ajout' });
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

// Variable pour stocker le thème (en production, utiliser la base de données)
let currentTheme = 'auto';

// Récupérer le thème actuel
router.get('/theme', (req, res) => {
  res.json({ theme: currentTheme });
});

// Modifier le thème
router.post('/theme', requireAdmin, (req, res) => {
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

    currentTheme = theme;
    res.json({ success: true, theme: currentTheme });
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

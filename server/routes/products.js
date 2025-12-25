const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Fonction helper pour enrichir un produit avec ses pierres, couleurs et images
async function enrichProduct(product) {
  // Récupérer les pierres
  const stones = await db.all(`
    SELECT s.id, s.name
    FROM stones s
    INNER JOIN product_stones ps ON s.id = ps.stone_id
    WHERE ps.product_id = ?
  `, [product.id]);

  product.stone_ids = stones.map(s => s.id);
  product.stone_names = stones.map(s => s.name);
  product.stones = stones.map(s => s.name).join(', '); // Pour compatibilité

  // Récupérer les couleurs
  const colors = await db.all(`
    SELECT c.id, c.name
    FROM colors c
    INNER JOIN product_colors pc ON c.id = pc.color_id
    WHERE pc.product_id = ?
  `, [product.id]);

  product.color_ids = colors.map(c => c.id);
  product.color_names = colors.map(c => c.name);
  product.colors = colors.map(c => c.name).join(', '); // Pour compatibilité

  // Récupérer les images
  const images = await db.all(`
    SELECT id, image_path, display_order, is_primary
    FROM product_images
    WHERE product_id = ?
    ORDER BY display_order ASC
  `, [product.id]);

  product.images = images;
  product.image_paths = images.map(img => img.image_path);

  return product;
}

// Récupérer tous les produits (avec filtres optionnels)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let sql = 'SELECT * FROM products WHERE stock > 0';
    const params = [];

    if (category && category !== 'Tous') {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY created_at DESC';

    const products = await db.all(sql, params);

    // Enrichir chaque produit avec ses pierres et couleurs
    const enrichedProducts = await Promise.all(
      products.map(product => enrichProduct(product))
    );

    res.json(enrichedProducts);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer un produit par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let product = await db.get('SELECT * FROM products WHERE id = ?', [id]);

    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Enrichir le produit avec ses pierres et couleurs
    product = await enrichProduct(product);

    res.json(product);
  } catch (error) {
    console.error('Erreur lors de la récupération du produit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les catégories uniques
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await db.all('SELECT DISTINCT category FROM products ORDER BY category');
    res.json(categories.map(c => c.category));
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les produits phares (pour la page d'accueil)
router.get('/featured/home', async (req, res) => {
  try {
    const products = await db.all(
      'SELECT * FROM products WHERE stock > 0 ORDER BY created_at DESC LIMIT 3'
    );

    // Enrichir chaque produit avec ses pierres et couleurs
    const enrichedProducts = await Promise.all(
      products.map(product => enrichProduct(product))
    );

    res.json(enrichedProducts);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits phares:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

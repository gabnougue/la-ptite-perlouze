const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const db = require('../models/database');
const { sendCustomerOrderEmail } = require('../services/email');

// Configuration de multer pour l'upload d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  }
});

// Middleware pour vérifier l'authentification
const requireAuth = (req, res, next) => {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  next();
};

// Login admin
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await db.get('SELECT * FROM admins WHERE username = ?', [username]);

    if (!admin) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const validPassword = await bcrypt.compare(password, admin.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    req.session.adminId = admin.id;
    req.session.username = admin.username;

    res.json({
      success: true,
      message: 'Connexion réussie',
      username: admin.username
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Logout admin
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
    }
    res.json({ success: true });
  });
});

// Vérifier l'authentification
router.get('/check-auth', (req, res) => {
  if (req.session.adminId) {
    res.json({ authenticated: true, username: req.session.username });
  } else {
    res.json({ authenticated: false });
  }
});

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
  product.stones = stones.map(s => s.name).join(', ');

  // Récupérer les couleurs
  const colors = await db.all(`
    SELECT c.id, c.name
    FROM colors c
    INNER JOIN product_colors pc ON c.id = pc.color_id
    WHERE pc.product_id = ?
  `, [product.id]);

  product.color_ids = colors.map(c => c.id);
  product.color_names = colors.map(c => c.name);
  product.colors = colors.map(c => c.name).join(', ');

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

// Récupérer tous les produits (y compris en rupture de stock)
router.get('/products', requireAuth, async (req, res) => {
  try {
    const products = await db.all('SELECT * FROM products ORDER BY created_at DESC');

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

// Ajouter un produit
router.post('/products', requireAuth, upload.fields([{ name: 'images', maxCount: 10 }]), async (req, res) => {
  try {
    const { name, category, description, price, stock, stone_ids, color_ids, boutdebois_link } = req.body;

    // Avec .fields(), req.files est un objet avec des clés pour chaque champ
    const imageFiles = req.files && req.files['images'] ? req.files['images'] : [];

    // Garder la compatibilité avec l'ancienne colonne image (première image)
    const firstImage = imageFiles.length > 0 ? imageFiles[0].filename : null;

    // Insérer le produit
    const result = await db.run(
      `INSERT INTO products (name, category, description, price, stock, image, stones, colors, boutdebois_link)
       VALUES (?, ?, ?, ?, ?, ?, '', '', ?)`,
      [name, category, description, parseFloat(price), parseInt(stock), firstImage, boutdebois_link || null]
    );

    const productId = result.id;

    // Insérer les images dans la table product_images
    if (imageFiles.length > 0) {
      for (let i = 0; i < imageFiles.length; i++) {
        await db.run(
          'INSERT INTO product_images (product_id, image_path, display_order, is_primary) VALUES (?, ?, ?, ?)',
          [productId, imageFiles[i].filename, i, i === 0 ? 1 : 0]
        );
      }
    }

    // Insérer les relations pierres
    if (stone_ids) {
      const stoneIds = JSON.parse(stone_ids);
      for (const stoneId of stoneIds) {
        await db.run(
          'INSERT INTO product_stones (product_id, stone_id) VALUES (?, ?)',
          [productId, parseInt(stoneId)]
        );
      }
    }

    // Insérer les relations couleurs
    if (color_ids) {
      const colorIds = JSON.parse(color_ids);
      for (const colorId of colorIds) {
        await db.run(
          'INSERT INTO product_colors (product_id, color_id) VALUES (?, ?)',
          [productId, parseInt(colorId)]
        );
      }
    }

    res.json({
      success: true,
      productId: productId,
      message: 'Produit ajouté avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du produit:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du produit' });
  }
});

// Modifier un produit
router.put('/products/:id', requireAuth, upload.fields([{ name: 'images', maxCount: 10 }]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description, price, stock, stone_ids, color_ids, boutdebois_link } = req.body;

    // Avec .fields(), req.files est un objet avec des clés pour chaque champ
    const imageFiles = req.files && req.files['images'] ? req.files['images'] : [];

    let sql = `UPDATE products SET name = ?, category = ?, description = ?, price = ?, stock = ?, boutdebois_link = ?`;
    const params = [name, category, description, parseFloat(price), parseInt(stock), boutdebois_link || null];

    // Si de nouvelles images sont uploadées, mettre à jour l'image principale
    if (imageFiles.length > 0) {
      sql += ', image = ?';
      params.push(imageFiles[0].filename);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    await db.run(sql, params);

    // Gérer les images : ajouter les nouvelles à la suite des existantes
    if (imageFiles.length > 0) {
      // Trouver le display_order maximum actuel
      const maxOrderResult = await db.get(
        'SELECT MAX(display_order) as maxOrder FROM product_images WHERE product_id = ?',
        [id]
      );
      const startOrder = (maxOrderResult.maxOrder !== null ? maxOrderResult.maxOrder : -1) + 1;

      // Ajouter les nouvelles images à la suite
      for (let i = 0; i < imageFiles.length; i++) {
        await db.run(
          'INSERT INTO product_images (product_id, image_path, display_order, is_primary) VALUES (?, ?, ?, ?)',
          [id, imageFiles[i].filename, startOrder + i, 0]
        );
      }

      // Si c'était le premier ajout d'images, marquer la première comme principale
      if (startOrder === 0) {
        const firstImage = await db.get(
          'SELECT id, image_path FROM product_images WHERE product_id = ? ORDER BY display_order ASC LIMIT 1',
          [id]
        );
        if (firstImage) {
          await db.run('UPDATE product_images SET is_primary = 1 WHERE id = ?', [firstImage.id]);
          await db.run('UPDATE products SET image = ? WHERE id = ?', [firstImage.image_path, id]);
        }
      }
    }

    // Supprimer les anciennes relations pierres et couleurs
    await db.run('DELETE FROM product_stones WHERE product_id = ?', [id]);
    await db.run('DELETE FROM product_colors WHERE product_id = ?', [id]);

    // Insérer les nouvelles relations pierres
    if (stone_ids) {
      const stoneIds = JSON.parse(stone_ids);
      for (const stoneId of stoneIds) {
        await db.run(
          'INSERT INTO product_stones (product_id, stone_id) VALUES (?, ?)',
          [id, parseInt(stoneId)]
        );
      }
    }

    // Insérer les nouvelles relations couleurs
    if (color_ids) {
      const colorIds = JSON.parse(color_ids);
      for (const colorId of colorIds) {
        await db.run(
          'INSERT INTO product_colors (product_id, color_id) VALUES (?, ?)',
          [id, parseInt(colorId)]
        );
      }
    }

    res.json({
      success: true,
      message: 'Produit modifié avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la modification du produit:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du produit' });
  }
});

// Supprimer un produit
router.delete('/products/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM products WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Produit supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du produit:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du produit' });
  }
});

// Récupérer toutes les commandes
router.get('/orders', requireAuth, async (req, res) => {
  try {
    const orders = await db.all('SELECT * FROM orders ORDER BY created_at DESC');

    // Récupérer les items pour chaque commande
    for (const order of orders) {
      order.items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    }

    res.json(orders);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour le statut d'une commande
router.put('/orders/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

    // Récupérer la commande pour envoyer l'email au client
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
    const orderItems = await db.all('SELECT * FROM order_items WHERE order_id = ?', [id]);

    // Envoyer l'email au client selon le nouveau statut
    if (order && orderItems) {
      await sendCustomerOrderEmail(order, orderItems, status);
    }

    res.json({
      success: true,
      message: 'Statut de la commande mis à jour'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les messages de contact
router.get('/contacts', requireAuth, async (req, res) => {
  try {
    const contacts = await db.all('SELECT * FROM contacts ORDER BY created_at DESC');
    res.json(contacts);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Marquer un message comme lu
router.put('/contacts/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await db.run('UPDATE contacts SET status = ? WHERE id = ?', [status, id]);

    res.json({
      success: true,
      message: 'Statut du message mis à jour'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un message de contact
router.delete('/contacts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await db.run('DELETE FROM contacts WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Message supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Statistiques
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const totalProducts = await db.get('SELECT COUNT(*) as count FROM products');
    const ongoingOrders = await db.get('SELECT COUNT(*) as count FROM orders WHERE status != "delivered"');
    const totalRevenue = await db.get('SELECT SUM(total) as sum FROM orders WHERE status = "delivered"');
    const outOfStock = await db.get('SELECT COUNT(*) as count FROM products WHERE stock = 0');

    res.json({
      totalProducts: totalProducts?.count || 0,
      ongoingOrders: ongoingOrders?.count || 0,
      totalRevenue: totalRevenue?.sum || 0,
      outOfStock: outOfStock?.count || 0
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une image individuelle
router.delete('/product-images/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer l'image avant de la supprimer pour mettre à jour le produit
    const image = await db.get('SELECT * FROM product_images WHERE id = ?', [id]);

    if (!image) {
      return res.status(404).json({ error: 'Image non trouvée' });
    }

    // Supprimer l'image
    await db.run('DELETE FROM product_images WHERE id = ?', [id]);

    // Si c'était l'image principale, mettre à jour le produit
    if (image.is_primary) {
      // Trouver la première image restante
      const firstImage = await db.get(
        'SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC LIMIT 1',
        [image.product_id]
      );

      if (firstImage) {
        // Mettre à jour l'image principale dans la table products
        await db.run('UPDATE products SET image = ? WHERE id = ?', [firstImage.image_path, image.product_id]);
        // Marquer cette image comme principale
        await db.run('UPDATE product_images SET is_primary = 1 WHERE id = ?', [firstImage.id]);
      } else {
        // Plus d'images, mettre à null
        await db.run('UPDATE products SET image = NULL WHERE id = ?', [image.product_id]);
      }
    }

    res.json({
      success: true,
      message: 'Image supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'image:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Réorganiser les images d'un produit
router.put('/products/:id/reorder-images', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { images } = req.body;

    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ error: 'Données invalides' });
    }

    // Mettre à jour chaque image
    for (const img of images) {
      await db.run(
        'UPDATE product_images SET display_order = ?, is_primary = ? WHERE id = ?',
        [img.display_order, img.is_primary, img.id]
      );
    }

    // Mettre à jour l'image principale dans la table products
    const primaryImage = images.find(img => img.is_primary === 1);
    if (primaryImage) {
      const imageData = await db.get('SELECT image_path FROM product_images WHERE id = ?', [primaryImage.id]);
      if (imageData) {
        await db.run('UPDATE products SET image = ? WHERE id = ?', [imageData.image_path, id]);
      }
    }

    res.json({
      success: true,
      message: 'Ordre des images mis à jour'
    });
  } catch (error) {
    console.error('Erreur lors de la réorganisation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

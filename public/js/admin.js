// ═══════════════════════════════════════════════════
// 🌸 La p'tite perlouze - Script admin 🌸
// ═══════════════════════════════════════════════════

let currentEditProductId = null;
let currentProductImages = [];
let newImagesToUpload = [];
let imagesToDelete = []; // IDs des images à supprimer (appliqué à la sauvegarde)

// ═══════════════════════════════════════════════════
// Popup de confirmation personnalisée
// ═══════════════════════════════════════════════════

function showConfirm(messageOrOptions, titleFallback = 'Confirmation') {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    const titleElement = document.getElementById('confirm-title');
    const messageElement = document.getElementById('confirm-message');
    const cancelBtn = document.getElementById('confirm-cancel');
    const okBtn = document.getElementById('confirm-ok');

    // Support pour les deux formats: showConfirm(string) ou showConfirm({title, message, icon})
    let title, message, icon;
    if (typeof messageOrOptions === 'string') {
      title = titleFallback;
      message = messageOrOptions;
      icon = '';
    } else {
      title = messageOrOptions.title || 'Confirmation';
      message = messageOrOptions.message || '';
      icon = messageOrOptions.icon || '';
    }

    titleElement.textContent = (icon ? icon + ' ' : '') + title;
    messageElement.textContent = message;
    modal.classList.add('active');

    // Gérer les clics
    const handleCancel = () => {
      modal.classList.remove('active');
      cancelBtn.removeEventListener('click', handleCancel);
      okBtn.removeEventListener('click', handleOk);
      resolve(false);
    };

    const handleOk = () => {
      modal.classList.remove('active');
      cancelBtn.removeEventListener('click', handleCancel);
      okBtn.removeEventListener('click', handleOk);
      resolve(true);
    };

    cancelBtn.addEventListener('click', handleCancel);
    okBtn.addEventListener('click', handleOk);

    // Fermer aussi si on clique en dehors
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        handleCancel();
      }
    }, { once: true });
  });
}

// Vérifier l'authentification
async function checkAuth() {
  try {
    const response = await fetch('/api/admin/check-auth');
    const data = await response.json();

    if (!data.authenticated) {
      window.location.href = '/admin';
      return false;
    }

    document.getElementById('admin-username').textContent = data.username;
    return true;
  } catch (error) {
    console.error('Erreur:', error);
    window.location.href = '/admin';
    return false;
  }
}

// Déconnexion
async function logout() {
  try {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin';
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Afficher une section
function showSection(section) {
  // Masquer toutes les sections
  document.querySelectorAll('.section-content').forEach(s => {
    s.classList.remove('active');
  });

  // Retirer la classe active de tous les liens
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });

  // Afficher la section demandée
  document.getElementById(`${section}-section`).classList.add('active');

  // Ajouter la classe active au lien
  event.target.classList.add('active');

  // Charger les données de la section
  if (section === 'stats') {
    loadStats();
  } else if (section === 'products') {
    loadProducts();
  } else if (section === 'orders') {
    loadOrders();
  } else if (section === 'contacts') {
    loadThreads();
  } else if (section === 'boutique') {
    loadBoutiqueImages();
  } else if (section === 'settings') {
    loadSettings();
  }
}

// Charger les statistiques
async function loadStats() {
  try {
    const response = await fetch('/api/admin/stats');
    const stats = await response.json();

    document.getElementById('stat-products').textContent = stats.totalProducts;
    document.getElementById('stat-orders').textContent = stats.ongoingOrders;
    document.getElementById('stat-revenue').textContent = stats.totalRevenue.toFixed(2) + ' €';
    document.getElementById('stat-outofstock').textContent = stats.outOfStock;
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Charger les produits
async function loadProducts() {
  try {
    const response = await fetch('/api/admin/products');
    const products = await response.json();

    const tbody = document.querySelector('#products-table tbody');
    tbody.innerHTML = '';

    if (products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 3rem; color: var(--texte-secondaire);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">💎</div>
            <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">Aucun produit dans le catalogue</p>
            <p style="font-size: 0.9rem;">Cliquez sur "Ajouter un produit" pour commencer</p>
          </td>
        </tr>
      `;
      return;
    }

    products.forEach(product => {
      const row = document.createElement('tr');

      // Utiliser l'image principale du tableau images, sinon l'image de la colonne image
      let imageSrc = '/images/placeholder.jpg';
      if (product.images && product.images.length > 0) {
        // Trouver l'image principale
        const primaryImage = product.images.find(img => img.is_primary);
        if (primaryImage) {
          imageSrc = `/images/uploads/${primaryImage.image_path}`;
        } else {
          // Si pas d'image principale définie, prendre la première
          imageSrc = `/images/uploads/${product.images[0].image_path}`;
        }
      } else if (product.image) {
        // Fallback sur l'ancienne colonne image
        imageSrc = `/images/uploads/${product.image}`;
      }

      row.innerHTML = `
        <td data-label="Image"><img src="${imageSrc}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 10px;"></td>
        <td data-label="Nom">${product.name}</td>
        <td data-label="Catégorie">${product.category}</td>
        <td data-label="Prix">${product.price.toFixed(2)} €</td>
        <td data-label="Stock">
          ${product.stock <= 0
            ? '<span class="badge badge-warning">Rupture</span>'
            : product.stock <= 3
            ? `<span class="badge badge-warning">${product.stock}</span>`
            : `<span class="badge badge-success">${product.stock}</span>`
          }
        </td>
        <td data-label="Actions">
          <button onclick="editProduct(${product.id})" class="btn btn-primary btn-small">Modifier</button>
          <button onclick="deleteProduct(${product.id})" class="btn btn-outline btn-small">Supprimer</button>
        </td>
      `;

      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Ouvrir le modal produit
async function openProductModal(productId = null) {
  currentEditProductId = productId;
  const modal = document.getElementById('product-modal');
  const form = document.getElementById('product-form');
  const title = document.getElementById('modal-title');

  form.reset();

  // Charger les options des selects
  await loadProductFormOptions();

  if (productId) {
    title.textContent = 'Modifier le produit';
    await loadProductData(productId);
  } else {
    title.textContent = 'Ajouter un produit';
    // Réinitialiser les images pour l'ajout
    currentProductImages = [];
    newImagesToUpload = [];
    imagesToDelete = [];
    window.allImagesOrder = [];
    displayExistingImages([]);
  }

  modal.classList.add('active');
}

// Charger les options du formulaire produit
async function loadProductFormOptions() {
  try {
    console.log('Chargement des options du formulaire...');

    // Charger les catégories
    const catResponse = await fetch('/api/settings/categories');
    if (!catResponse.ok) {
      throw new Error('Erreur lors du chargement des catégories');
    }
    const categories = await catResponse.json();
    console.log('Catégories chargées:', categories.length);
    const categorySelect = document.getElementById('product-category');
    if (categorySelect) {
      categorySelect.innerHTML = categories.map(cat =>
        `<option value="${cat.name}">${cat.name}</option>`
      ).join('');
    }

    // Charger les pierres
    const stoneResponse = await fetch('/api/settings/stones');
    if (!stoneResponse.ok) {
      throw new Error('Erreur lors du chargement des pierres');
    }
    const stones = await stoneResponse.json();
    console.log('Pierres chargées:', stones.length);
    const stonesSelect = document.getElementById('product-stones');
    if (stonesSelect) {
      stonesSelect.innerHTML = stones.map(stone =>
        `<option value="${stone.id}">${stone.name}</option>`
      ).join('');
    }

    // Charger les couleurs
    const colorResponse = await fetch('/api/settings/colors');
    if (!colorResponse.ok) {
      throw new Error('Erreur lors du chargement des couleurs');
    }
    const colors = await colorResponse.json();
    console.log('Couleurs chargées:', colors.length);
    const colorsSelect = document.getElementById('product-colors');
    if (colorsSelect) {
      colorsSelect.innerHTML = colors.map(color =>
        `<option value="${color.id}">${color.name}</option>`
      ).join('');
    }

    console.log('Options chargées avec succès');
  } catch (error) {
    console.error('Erreur lors du chargement des options:', error);
    showMessage('Erreur lors du chargement des options', 'error');
  }
}

// Fermer le modal produit
function closeProductModal() {
  const modal = document.getElementById('product-modal');
  modal.classList.remove('active');
  currentEditProductId = null;
  currentProductImages = [];
  newImagesToUpload = [];
  imagesToDelete = [];
  window.allImagesOrder = [];
}

// Charger les données d'un produit
async function loadProductData(productId) {
  try {
    const response = await fetch(`/api/products/${productId}`);
    const product = await response.json();

    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-description').value = product.description;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('product-boutdebois-link').value = product.boutdebois_link || '';

    // Sélectionner les pierres
    const stonesSelect = document.getElementById('product-stones');
    if (product.stone_ids && product.stone_ids.length > 0) {
      Array.from(stonesSelect.options).forEach(option => {
        option.selected = product.stone_ids.includes(parseInt(option.value));
      });
    }

    // Sélectionner les couleurs
    const colorsSelect = document.getElementById('product-colors');
    if (product.color_ids && product.color_ids.length > 0) {
      Array.from(colorsSelect.options).forEach(option => {
        option.selected = product.color_ids.includes(parseInt(option.value));
      });
    }

    // Charger les images existantes et réinitialiser les nouvelles
    currentProductImages = product.images || [];
    newImagesToUpload = [];
    imagesToDelete = [];
    window.allImagesOrder = [];
    displayAllImages();
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Afficher les images existantes avec contrôles (redirige vers displayAllImages)
function displayExistingImages(images) {
  if (images) {
    currentProductImages = images;
  }
  displayAllImages();
}


// Supprimer une image du produit (marque pour suppression, appliqué à la sauvegarde)
function deleteImageFromProduct(imageId, index) {
  // Pas de confirmation ici, juste marquer pour suppression
  // Ajouter à la liste des images à supprimer
  if (!imagesToDelete.includes(imageId)) {
    imagesToDelete.push(imageId);
  }

  // Retirer visuellement de allImagesOrder
  if (window.allImagesOrder && window.allImagesOrder.length > 0) {
    const globalIndex = window.allImagesOrder.findIndex(item =>
      item.type === 'existing' && item.data.id === imageId
    );
    if (globalIndex !== -1) {
      window.allImagesOrder.splice(globalIndex, 1);
    }
  }

  // Aussi supprimer de currentProductImages
  currentProductImages.splice(index, 1);

  // Reconstruire les tableaux à partir de allImagesOrder
  currentProductImages = [];
  newImagesToUpload = [];

  window.allImagesOrder.forEach((item, idx) => {
    if (item.type === 'existing') {
      item.data.display_order = idx;
      item.data.is_primary = idx === 0 ? 1 : 0;
      currentProductImages.push(item.data);
    } else {
      newImagesToUpload.push(item.data);
    }
  });

  displayAllImages();
}

// Déplacer une image dans l'ordre
async function moveImage(fromIndex, toIndex) {
  // Échanger les positions dans le tableau local
  const temp = currentProductImages[fromIndex];
  currentProductImages[fromIndex] = currentProductImages[toIndex];
  currentProductImages[toIndex] = temp;

  // Mettre à jour display_order et is_primary
  currentProductImages.forEach((img, idx) => {
    img.display_order = idx;
    img.is_primary = idx === 0 ? 1 : 0;
  });

  // Rafraîchir l'affichage
  displayAllImages();

  // Sauvegarder l'ordre dans la base de données
  try {
    const response = await fetch(`/api/admin/products/${currentEditProductId}/reorder-images`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: currentProductImages.map(img => ({
          id: img.id,
          display_order: img.display_order,
          is_primary: img.is_primary
        }))
      })
    });

    const result = await response.json();
    if (!result.success) {
      showMessage('Erreur lors de la réorganisation', 'error');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de la réorganisation', 'error');
  }
}

// Modifier un produit
function editProduct(productId) {
  openProductModal(productId);
}

// Supprimer un produit
async function deleteProduct(productId) {
  const confirmed = await showConfirm(
    'Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.',
    'Supprimer le produit'
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/products/${productId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      showMessage('Produit supprimé avec succès', 'success');
      loadProducts();
      loadStats();
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de la suppression', 'error');
  }
}

// Soumettre le formulaire produit
async function handleProductSubmit(event) {
  event.preventDefault();

  const formData = new FormData();

  // IMPORTANT: Ajouter d'abord les champs texte
  formData.append('name', document.getElementById('product-name').value);
  formData.append('category', document.getElementById('product-category').value);
  formData.append('description', document.getElementById('product-description').value);
  formData.append('price', document.getElementById('product-price').value);
  formData.append('stock', document.getElementById('product-stock').value);
  formData.append('boutdebois_link', document.getElementById('product-boutdebois-link').value || '');

  // Récupérer les pierres sélectionnées
  const stonesSelect = document.getElementById('product-stones');
  const selectedStones = Array.from(stonesSelect.selectedOptions).map(opt => opt.value);
  formData.append('stone_ids', JSON.stringify(selectedStones));

  // Récupérer les couleurs sélectionnées
  const colorsSelect = document.getElementById('product-colors');
  const selectedColors = Array.from(colorsSelect.selectedOptions).map(opt => opt.value);
  formData.append('color_ids', JSON.stringify(selectedColors));

  // ENSUITE: Ajouter les fichiers (images) à la fin
  if (newImagesToUpload && newImagesToUpload.length > 0) {
    console.log(`Envoi de ${newImagesToUpload.length} nouvelle(s) image(s)`);
    const totalImages = currentProductImages.length + newImagesToUpload.length;
    if (totalImages > 10) {
      showMessage(`Vous ne pouvez avoir que 10 images maximum (actuellement ${currentProductImages.length} existantes + ${newImagesToUpload.length} nouvelles)`, 'error');
      return;
    }
    for (let i = 0; i < newImagesToUpload.length; i++) {
      console.log(`Ajout image ${i + 1}:`, newImagesToUpload[i].name);
      formData.append('images', newImagesToUpload[i]);
    }
  } else {
    console.log('Aucune nouvelle image à uploader');
  }

  try {
    let url = '/api/admin/products';
    let method = 'POST';

    if (currentEditProductId) {
      url = `/api/admin/products/${currentEditProductId}`;
      method = 'PUT';
    }

    console.log(`Envoi requête ${method} vers ${url}`);

    // Debug: afficher tout le contenu du FormData
    console.log('Contenu du FormData:');
    for (let pair of formData.entries()) {
      if (pair[1] instanceof File) {
        console.log(pair[0] + ': ' + pair[1].name);
      } else {
        console.log(pair[0] + ': ' + pair[1]);
      }
    }

    const response = await fetch(url, {
      method: method,
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      // Traiter d'abord les suppressions d'images
      if (currentEditProductId && imagesToDelete.length > 0) {
        for (const imageId of imagesToDelete) {
          try {
            await fetch(`/api/admin/product-images/${imageId}`, {
              method: 'DELETE'
            });
          } catch (error) {
            console.error(`Erreur suppression image ${imageId}:`, error);
          }
        }
      }

      // Si on a uploadé de nouvelles images et qu'on a un ordre global mixte
      if (newImagesToUpload.length > 0 && window.allImagesOrder && window.allImagesOrder.length > 0) {
        const productId = result.product_id || currentEditProductId;

        if (productId) {
          // Attendre un peu que les images soient bien enregistrées
          await new Promise(resolve => setTimeout(resolve, 500));

          // Recharger le produit pour obtenir les IDs des nouvelles images
          const productResponse = await fetch(`/api/products/${productId}`);
          const productData = await productResponse.json();

          if (productData && productData.images) {
            // Créer un mapping des images par leur position
            // On doit faire correspondre les nouvelles images uploadées avec celles retournées
            const allUploadedImages = productData.images;

            // Reconstruire l'ordre selon allImagesOrder
            const finalOrder = [];
            let existingImageIndex = 0;
            let newImageIndex = 0;

            window.allImagesOrder.forEach((item, globalIndex) => {
              if (item.type === 'existing') {
                // Trouver l'image existante par son ID
                const existingImg = allUploadedImages.find(img => img.id === item.data.id);
                if (existingImg) {
                  finalOrder.push({
                    id: existingImg.id,
                    display_order: globalIndex + 1,
                    is_primary: globalIndex === 0 ? 1 : 0
                  });
                }
              } else {
                // Pour les nouvelles images, on prend les dernières images uploadées
                // (celles qui n'ont pas d'ID dans notre currentProductImages)
                const newImages = allUploadedImages.filter(img =>
                  !currentProductImages.find(existing => existing.id === img.id)
                );

                if (newImages[newImageIndex]) {
                  finalOrder.push({
                    id: newImages[newImageIndex].id,
                    display_order: globalIndex + 1,
                    is_primary: globalIndex === 0 ? 1 : 0
                  });
                  newImageIndex++;
                }
              }
            });

            // Envoyer la réorganisation finale
            if (finalOrder.length > 0) {
              await fetch(`/api/admin/products/${productId}/reorder-images`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ images: finalOrder })
              });
            }
          }
        }
      } else if (currentEditProductId && currentProductImages.length > 0) {
        // Si c'est une modification sans nouvelles images, sauvegarder l'ordre des existantes
        await fetch(`/api/admin/products/${currentEditProductId}/reorder-images`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: currentProductImages.map(img => ({
              id: img.id,
              display_order: img.display_order,
              is_primary: img.is_primary
            }))
          })
        });
      }

      showMessage(currentEditProductId ? 'Produit modifié' : 'Produit ajouté', 'success');
      closeProductModal();
      loadProducts();
      loadStats();
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de l\'enregistrement', 'error');
  }
}

// Variable globale pour stocker les commandes
let allOrders = [];

// Charger les commandes
async function loadOrders() {
  try {
    const response = await fetch('/api/admin/orders');
    allOrders = await response.json();
    updateOrdersBadge();
    displayOrders();
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Afficher les commandes (avec filtrage optionnel)
function displayOrders() {
  const tbody = document.querySelector('#orders-table tbody');
  const hideDelivered = document.getElementById('hide-delivered')?.checked || false;

  // Filtrer les commandes selon le checkbox
  const filteredOrders = hideDelivered
    ? allOrders.filter(order => order.status !== 'delivered')
    : allOrders;

  tbody.innerHTML = '';

  if (filteredOrders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 3rem; color: var(--texte-secondaire);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
          <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">Aucune commande</p>
          <p style="font-size: 0.9rem;">Les commandes des clients apparaîtront ici</p>
        </td>
      </tr>
    `;
    return;
  }

  const statusLabels = {
    'pending': 'En attente',
    'confirmed': 'Confirmée',
    'shipped': 'Expédiée',
    'delivered': 'Livrée'
  };

  const statusColors = {
    'pending': '#F59E0B',
    'confirmed': '#3B82F6',
    'shipped': '#8B5CF6',
    'delivered': '#10B981'
  };

  filteredOrders.forEach(order => {
    const row = document.createElement('tr');
    const date = new Date(order.created_at).toLocaleDateString('fr-FR');

    row.innerHTML = `
      <td data-label="N°">#${order.id}</td>
      <td data-label="Client">${order.customer_name}<br><small style="color: var(--texte-secondaire);">${order.customer_email}</small></td>
      <td data-label="Date">${date}</td>
      <td data-label="Total">${order.total.toFixed(2)} €</td>
      <td data-label="Statut">
        <span style="display: inline-block; padding: 0.35rem 0.75rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600; background: ${statusColors[order.status]}; color: white;">
          ${statusLabels[order.status] || order.status}
        </span>
      </td>
      <td data-label="Actions">
        <button onclick="viewOrderDetails(${order.id})" class="btn btn-primary btn-small">👁️ Voir</button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

// Mettre à jour le statut d'une commande
async function updateOrderStatus(orderId, newStatus, oldStatus) {
  // Restaurer l'ancien statut dans le select temporairement
  const selectElement = document.getElementById(`order-status-${orderId}`);
  if (selectElement) {
    selectElement.value = oldStatus;
  }

  // Messages selon le statut
  const statusMessages = {
    'pending': {
      emoji: '⏳',
      title: 'Mettre en attente ?',
      message: 'La commande sera marquée comme en attente. Le client recevra un email l\'informant que la commande sera bientôt prise en charge.'
    },
    'confirmed': {
      emoji: '✅',
      title: 'Confirmer la commande ?',
      message: 'La commande sera confirmée. Le client recevra un email l\'informant que vous préparez sa commande avec soin.'
    },
    'shipped': {
      emoji: '📦',
      title: 'Marquer comme expédiée ?',
      message: 'La commande sera marquée comme expédiée. Le client recevra un email l\'informant que sa commande est en route.'
    },
    'delivered': {
      emoji: '✔️',
      title: 'Marquer comme livrée ?',
      message: 'La commande sera marquée comme livrée.'
    }
  };

  const statusInfo = statusMessages[newStatus] || { emoji: '❓', title: 'Modifier le statut ?', message: 'Le statut de la commande va être modifié.' };

  // Demander confirmation
  const confirmed = await showConfirm({
    title: statusInfo.title,
    message: statusInfo.message,
    icon: statusInfo.emoji,
    confirmText: 'Confirmer',
    cancelText: 'Annuler'
  });

  if (!confirmed) {
    // L'utilisateur a annulé, le select est déjà restauré
    return;
  }

  // L'utilisateur a confirmé, mettre à jour le statut
  try {
    const response = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    const result = await response.json();

    if (result.success) {
      // Mettre à jour le select avec le nouveau statut
      if (selectElement) {
        selectElement.value = newStatus;
      }

      showMessage('Statut mis à jour avec succès ! Un email a été envoyé au client.', 'success');
      loadOrders();
      loadStats();
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de la mise à jour du statut', 'error');
    // Restaurer l'ancien statut en cas d'erreur
    if (selectElement) {
      selectElement.value = oldStatus;
    }
  }
}

// Voir les détails d'une commande
function viewOrderDetails(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const statusLabels = {
    'pending': 'En attente',
    'confirmed': 'Confirmée',
    'shipped': 'Expédiée',
    'delivered': 'Livrée'
  };

  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Commande #${order.id}</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
        <div>
          <h4 style="color: var(--texte-principal); margin-bottom: 0.5rem;">Client</h4>
          <p style="margin: 0.25rem 0;"><strong>Nom:</strong> ${order.customer_name}</p>
          <p style="margin: 0.25rem 0;"><strong>Email:</strong> ${order.customer_email}</p>
          <p style="margin: 0.25rem 0;"><strong>Téléphone:</strong> ${order.customer_phone || 'Non renseigné'}</p>
        </div>

        <div>
          <h4 style="color: var(--texte-principal); margin-bottom: 0.5rem;">Livraison</h4>
          <p style="margin: 0;">${order.customer_address || 'Non renseignée'}</p>
        </div>
      </div>

      <div style="margin-top: 1.5rem;">
        <h4 style="color: var(--texte-principal); margin-bottom: 0.5rem;">Articles commandés</h4>
        ${order.items && order.items.length > 0 ? order.items.map(item => `
          <div style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid var(--gris-clair);">
            <span>${item.product_name} x ${item.quantity}</span>
            <span style="font-weight: 600;">${(item.price * item.quantity).toFixed(2)} €</span>
          </div>
        `).join('') : '<p style="color: var(--texte-secondaire);">Aucun article</p>'}
        <div style="display: flex; justify-content: space-between; padding: 1rem 0.5rem; font-weight: 700; font-size: 1.2rem;">
          <span>Total</span>
          <span style="color: var(--lavande);">${order.total.toFixed(2)} €</span>
        </div>
      </div>

      <div style="margin-top: 1.5rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Statut de la commande</label>
        <select id="order-status-${order.id}" onchange="updateOrderStatusFromModal(${order.id}, this.value, '${order.status}')"
                style="width: 100%; padding: 0.75rem; border: 2px solid var(--lavande); border-radius: 12px; background: white; font-family: var(--font-texte);">
          <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>⏳ En attente</option>
          <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>✅ Confirmée</option>
          <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>📦 Expédiée</option>
          <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>✔️ Livrée</option>
        </select>
      </div>

      <div style="margin-top: 1.5rem; text-align: right;">
        <button onclick="this.closest('.modal').remove();" class="btn btn-secondary">Fermer</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// Mettre à jour le statut depuis la modale
async function updateOrderStatusFromModal(orderId, newStatus, oldStatus) {
  await updateOrderStatus(orderId, newStatus, oldStatus);
  // La modale de confirmation se ferme automatiquement
  // Pas besoin de la fermer manuellement
}

// Mettre à jour la bulle de notification des commandes
function updateOrdersBadge() {
  const pendingCount = allOrders.filter(o => o.status === 'pending').length;
  const badge = document.getElementById('orders-badge');

  if (badge) {
    if (pendingCount > 0) {
      badge.textContent = pendingCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Variable globale pour stocker les threads
let allThreads = [];

// Charger les threads de conversation
async function loadThreads() {
  try {
    const response = await fetch('/api/messages/threads');
    allThreads = await response.json();
    updateMessagesBadge();

    const tbody = document.querySelector('#threads-table tbody');
    tbody.innerHTML = '';

    // Filtrer les threads si la checkbox est cochée
    const hideClosed = document.getElementById('hide-closed-threads')?.checked;
    const filteredThreads = hideClosed ? allThreads.filter(t => t.status !== 'closed') : allThreads;

    if (filteredThreads.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 3rem; color: var(--texte-secondaire);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">💬</div>
            <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">Aucune conversation</p>
            <p style="font-size: 0.9rem;">Les conversations avec les clients apparaîtront ici</p>
          </td>
        </tr>
      `;
      return;
    }

    filteredThreads.forEach(thread => {
      const row = document.createElement('tr');
      const date = new Date(thread.last_message_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const unreadCount = thread.unread_count || 0;

      row.innerHTML = `
        <td data-label="Statut">
          <div>
            ${thread.status === 'open'
              ? '<span class="badge badge-success">Ouvert</span>'
              : '<span class="badge badge-info">Fermé</span>'
            }
          </div>
          ${unreadCount > 0 ? `<div style="margin-top: 0.5rem;"><span class="badge badge-warning">${unreadCount} nouveau(x)</span></div>` : ''}
        </td>
        <td data-label="Client">
          <div><strong>${thread.customer_name}</strong></div>
          <small style="color: var(--texte-secondaire);">${thread.customer_email}</small>
        </td>
        <td data-label="Dernier message" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <span style="font-weight: ${thread.last_sender === 'customer' ? 'bold' : 'normal'};">
            ${thread.last_message || '-'}
          </span>
        </td>
        <td data-label="Date">${date}</td>
        <td data-label="Actions">
          <button onclick="viewThread(${thread.id})" class="btn btn-secondary btn-small" title="Voir la conversation">
            👁️
          </button>
          ${thread.status === 'open'
            ? `<button onclick="closeThread(${thread.id})" class="btn btn-secondary btn-small" style="font-size: 1.2rem;" title="Fermer">✓</button>`
            : `<button onclick="reopenThread(${thread.id})" class="btn btn-secondary btn-small" style="font-size: 1.1rem;" title="Rouvrir">↻</button>`
          }
          <button onclick="deleteThread(${thread.id})" class="btn btn-secondary btn-small" title="Supprimer">🗑️</button>
        </td>
      `;

      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Mettre à jour la bulle de notification des messages
function updateMessagesBadge() {
  const unreadCount = allThreads.reduce((sum, thread) => sum + (thread.unread_count || 0), 0);
  const badge = document.getElementById('messages-badge');

  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Voir une conversation complète
async function viewThread(threadId) {
  try {
    // Marquer comme lu
    await fetch(`/api/messages/threads/${threadId}/mark-read`, {
      method: 'POST'
    });

    // Recharger les threads pour mettre à jour le badge
    loadThreads();

    const response = await fetch(`/api/messages/threads/${threadId}/messages`);
    const messages = await response.json();
    const thread = allThreads.find(t => t.id === threadId);

    if (!thread) return;

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.zIndex = '10001';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 800px; max-height: 90vh; display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem;">
          <div>
            <h3 style="margin: 0; color: var(--lavande); font-family: var(--font-manuscrite); font-size: 1.8rem;">
              ${thread.subject}
            </h3>
            <p style="margin: 0.5rem 0 0 0; color: var(--texte-secondaire); font-size: 0.9rem;">
              <strong>${thread.customer_name}</strong> (${thread.customer_email})
            </p>
          </div>
          <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 2rem; cursor: pointer; color: var(--texte-secondaire);">×</button>
        </div>

        <div style="flex: 1; overflow-y: auto; background: var(--fond-secondaire); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; max-height: 50vh;">
          ${messages.map(msg => {
            const isCustomer = msg.sender_type === 'customer';
            return `
              <div style="margin-bottom: 1.5rem; display: flex; justify-content: ${isCustomer ? 'flex-start' : 'flex-end'};">
                <div style="max-width: 70%; background: ${isCustomer ? 'white' : 'var(--lavande)'}; color: ${isCustomer ? 'var(--texte-principal)' : 'white'}; padding: 1rem; border-radius: 15px; box-shadow: var(--ombre-douce);">
                  <div style="margin-bottom: 0.5rem;">
                    <strong>${msg.sender_name}</strong>
                    <span style="font-size: 0.85rem; opacity: 0.8; margin-left: 0.5rem;">
                      ${new Date(msg.created_at).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <div style="white-space: pre-wrap; line-height: 1.5;">${msg.message}</div>
                  ${msg.has_attachments && msg.attachments ? `
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid ${isCustomer ? '#eee' : 'rgba(255,255,255,0.3)'};">
                      <strong style="font-size: 0.9rem;">📎 Pièces jointes:</strong>
                      ${msg.attachments.map(att => `
                        <div style="margin-top: 0.5rem;">
                          <a href="/attachments/${att.file_path}" target="_blank" style="color: ${isCustomer ? 'var(--lavande)' : 'white'}; text-decoration: underline;">
                            ${att.filename}
                          </a>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div>
          <button onclick="replyToThread(${threadId})" class="btn btn-primary" style="width: 100%; padding: 1rem;">
            💬 Répondre
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors du chargement de la conversation', 'error');
  }
}

// Répondre à un thread
function replyToThread(threadId) {
  const thread = allThreads.find(t => t.id === threadId);
  if (!thread) return;

  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.style.zIndex = '10002';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h3 style="margin: 0; color: var(--lavande); font-family: var(--font-manuscrite); font-size: 1.8rem;">
          Répondre à ${thread.customer_name}
        </h3>
        <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 2rem; cursor: pointer; color: var(--texte-secondaire);">×</button>
      </div>

      <form id="reply-form" onsubmit="sendReply(event, ${threadId})">
        <div style="margin-bottom: 1.5rem;">
          <label style="display: block; margin-bottom: 0.5rem; color: var(--texte-principal); font-weight: 600;">
            Votre message
          </label>
          <textarea id="reply-message" required rows="8"
            style="width: 100%; padding: 1rem; border: 2px solid var(--lavande); border-radius: 12px; font-family: var(--font-texte); resize: vertical;"
            placeholder="Écrivez votre réponse..."></textarea>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <label style="display: block; margin-bottom: 0.5rem; color: var(--texte-principal); font-weight: 600;">
            Pièces jointes (optionnel)
          </label>
          <input type="file" id="reply-attachments" multiple accept="image/*,.pdf"
            style="width: 100%; padding: 0.75rem; border: 2px solid var(--lavande); border-radius: 12px;">
          <small style="display: block; margin-top: 0.5rem; color: var(--texte-secondaire);">
            Jusqu'à 5 fichiers (images ou PDF, 10 Mo maximum par fichier)
          </small>
        </div>

        <div style="display: flex; gap: 1rem;">
          <button type="submit" class="btn btn-primary" style="flex: 1;">
            Envoyer la réponse
          </button>
          <button type="button" onclick="this.closest('.modal').remove()" class="btn btn-outline" style="flex: 1;">
            Annuler
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
}

// Envoyer une réponse
async function sendReply(event, threadId) {
  event.preventDefault();

  const messageInput = document.getElementById('reply-message');
  const attachmentsInput = document.getElementById('reply-attachments');
  const message = messageInput.value.trim();

  if (!message) {
    showMessage('Le message est requis', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('message', message);

  // Ajouter les pièces jointes
  if (attachmentsInput.files.length > 0) {
    for (let i = 0; i < Math.min(attachmentsInput.files.length, 5); i++) {
      formData.append('attachments', attachmentsInput.files[i]);
    }
  }

  try {
    const response = await fetch(`/api/messages/threads/${threadId}/reply`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      showMessage('Réponse envoyée avec succès', 'success');
      // Fermer tous les modals
      document.querySelectorAll('.modal').forEach(m => m.remove());
      // Recharger les threads
      loadThreads();
    } else {
      showMessage(result.error || 'Erreur lors de l\'envoi', 'error');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de l\'envoi de la réponse', 'error');
  }
}

// Fermer un thread
async function closeThread(threadId) {
  try {
    const response = await fetch(`/api/messages/threads/${threadId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed' })
    });

    const result = await response.json();

    if (result.success) {
      showMessage('Conversation fermée', 'success');
      loadThreads();
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de la fermeture', 'error');
  }
}

// Rouvrir un thread
async function reopenThread(threadId) {
  try {
    const response = await fetch(`/api/messages/threads/${threadId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'open' })
    });

    const result = await response.json();

    if (result.success) {
      showMessage('Conversation rouverte', 'success');
      loadThreads();
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de la réouverture', 'error');
  }
}

// Supprimer un thread
async function deleteThread(threadId) {
  const confirmed = await showConfirm({
    title: 'Supprimer cette conversation ?',
    message: 'Cette action est irréversible. Tous les messages et pièces jointes seront définitivement supprimés.',
    icon: '🗑️',
    confirmText: 'Supprimer',
    cancelText: 'Annuler'
  });

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/messages/threads/${threadId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      showMessage('Conversation supprimée avec succès', 'success');
      loadThreads();
    } else {
      showMessage('Erreur lors de la suppression', 'error');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de la suppression', 'error');
  }
}

// Afficher un message
function showMessage(message, type = 'info') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${type}`;
  messageDiv.textContent = message;
  messageDiv.style.position = 'fixed';
  messageDiv.style.top = '100px';
  messageDiv.style.right = '20px';
  messageDiv.style.zIndex = '10001';
  messageDiv.style.maxWidth = '300px';

  document.body.appendChild(messageDiv);

  setTimeout(() => {
    messageDiv.style.opacity = '0';
    messageDiv.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      document.body.removeChild(messageDiv);
    }, 300);
  }, 3000);
}

// ═══════════════════════════════════════════════════
// GESTION DES PARAMÈTRES
// ═══════════════════════════════════════════════════

// Charger tous les paramètres
async function loadSettings() {
  loadGeneralSettings();
  loadCategories();
  loadStones();
  loadColors();
}

// Charger les paramètres généraux
async function loadGeneralSettings() {
  try {
    const response = await fetch('/api/settings');
    const settings = await response.json();

    document.getElementById('setting-contact-email').value = settings.contact_email || '';
    document.getElementById('setting-boutdebois-url').value = settings.boutdebois_url || '';
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Enregistrer les paramètres généraux
async function saveGeneralSettings() {
  try {
    const contactEmail = document.getElementById('setting-contact-email').value;
    const boutdeboisUrl = document.getElementById('setting-boutdebois-url').value;

    // Mettre à jour l'email de contact
    await fetch('/api/settings/contact_email', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: contactEmail })
    });

    // Mettre à jour l'URL du ptit bout de bois
    await fetch('/api/settings/boutdebois_url', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: boutdeboisUrl })
    });

    showMessage('Paramètres enregistrés avec succès', 'success');
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de l\'enregistrement', 'error');
  }
}

// Charger les catégories
async function loadCategories() {
  try {
    const response = await fetch('/api/settings/categories');
    const categories = await response.json();

    const container = document.getElementById('categories-list');
    container.innerHTML = categories.map(cat => `
      <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: white; border-radius: 10px; border: 2px solid var(--lavande);">
        <div style="font-size: 2rem;">${cat.emoji || '✨'}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: var(--lavande);">${cat.name}</div>
          <div style="font-size: 0.9rem; color: var(--texte-secondaire);">${cat.description || ''}</div>
        </div>
        <button onclick="editCategory(${cat.id}, '${cat.name.replace(/'/g, "\\'")}', '${(cat.emoji || '✨').replace(/'/g, "\\'")}', '${(cat.description || '').replace(/'/g, "\\'")}')"
                class="btn btn-small btn-outline" style="padding: 0.3rem 0.8rem;">
          Modifier
        </button>
        <button onclick="deleteCategory(${cat.id})"
                style="background: var(--rose-poudre); color: white; border: none; padding: 0.4rem; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s ease;
                       width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;"
                onmouseover="this.style.transform='scale(1.1) rotate(90deg)'; this.style.boxShadow='0 4px 10px rgba(244, 194, 194, 0.4)'; this.style.opacity='0.9'"
                onmouseout="this.style.transform='scale(1) rotate(0deg)'; this.style.boxShadow='none'; this.style.opacity='1'"
                title="Supprimer">
          ✕
        </button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Ajouter une catégorie
async function addCategory() {
  const nameInput = document.getElementById('new-category');
  const emojiInput = document.getElementById('new-category-emoji');
  const descriptionInput = document.getElementById('new-category-description');

  const name = nameInput.value.trim();
  const emoji = emojiInput.value.trim() || '✨';
  const description = descriptionInput.value.trim();

  if (!name) {
    showMessage('Veuillez entrer un nom', 'error');
    return;
  }

  try {
    const response = await fetch('/api/settings/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, emoji, description })
    });

    const result = await response.json();

    if (result.success) {
      showMessage('Catégorie ajoutée', 'success');
      nameInput.value = '';
      emojiInput.value = '';
      descriptionInput.value = '';
      loadCategories();
    } else {
      showMessage(result.error || 'Erreur lors de l\'ajout', 'error');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de l\'ajout', 'error');
  }
}

// Annuler la modification d'une catégorie
function cancelEditCategory() {
  const nameInput = document.getElementById('new-category');
  const emojiInput = document.getElementById('new-category-emoji');
  const descriptionInput = document.getElementById('new-category-description');
  const submitButton = document.getElementById('category-submit-btn');
  const cancelButton = document.getElementById('category-cancel-btn');

  // Réinitialiser les champs
  nameInput.value = '';
  emojiInput.value = '';
  descriptionInput.value = '';

  // Remettre le bouton en mode "Ajouter"
  submitButton.textContent = 'Ajouter la catégorie';
  submitButton.onclick = addCategory;

  // Cacher le bouton annuler
  cancelButton.style.display = 'none';
}

// Modifier une catégorie
async function editCategory(id, currentName, currentEmoji, currentDescription) {
  const nameInput = document.getElementById('new-category');
  const emojiInput = document.getElementById('new-category-emoji');
  const descriptionInput = document.getElementById('new-category-description');
  const submitButton = document.getElementById('category-submit-btn');
  const cancelButton = document.getElementById('category-cancel-btn');

  // Pré-remplir les champs avec les valeurs actuelles
  nameInput.value = currentName;
  emojiInput.value = currentEmoji;
  descriptionInput.value = currentDescription;

  // Afficher le bouton annuler
  cancelButton.style.display = 'block';

  // Changer le bouton en mode "Mettre à jour"
  submitButton.textContent = 'Mettre à jour';
  submitButton.onclick = async () => {
    const name = nameInput.value.trim();
    const emoji = emojiInput.value.trim() || '✨';
    const description = descriptionInput.value.trim();

    if (!name) {
      showMessage('Veuillez entrer un nom', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/settings/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emoji, description })
      });

      const result = await response.json();

      if (result.success) {
        showMessage('Catégorie modifiée', 'success');
        nameInput.value = '';
        emojiInput.value = '';
        descriptionInput.value = '';
        loadCategories();
        // Remettre le bouton en mode "Ajouter"
        submitButton.textContent = 'Ajouter la catégorie';
        submitButton.onclick = addCategory;
        // Cacher le bouton annuler
        cancelButton.style.display = 'none';
      } else {
        showMessage(result.error || 'Erreur lors de la modification', 'error');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showMessage('Erreur lors de la modification', 'error');
    }
  };

  // Scroll vers le haut pour voir les champs
  document.getElementById('new-category').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Supprimer une catégorie
async function deleteCategory(id) {
  const confirmed = await showConfirm(
    'Êtes-vous sûr de vouloir supprimer cette catégorie ?',
    'Supprimer la catégorie'
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/settings/categories/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      showMessage('Catégorie supprimée', 'success');
      loadCategories();
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de la suppression', 'error');
  }
}

// Charger les pierres
async function loadStones() {
  try {
    const response = await fetch('/api/settings/stones');
    const stones = await response.json();

    const container = document.getElementById('stones-list');
    container.innerHTML = stones.map(stone => `
      <span class="badge badge-info" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem;">
        ${stone.name}
        <button onclick="deleteStone(${stone.id})" style="background: none; border: none; cursor: pointer; color: white; font-size: 1.2rem; line-height: 1;">×</button>
      </span>
    `).join('');
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Ajouter une pierre
async function addStone() {
  const input = document.getElementById('new-stone');
  const name = input.value.trim();

  if (!name) {
    showMessage('Veuillez entrer un nom', 'error');
    return;
  }

  try {
    const response = await fetch('/api/settings/stones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    const result = await response.json();

    if (result.success) {
      showMessage('Pierre ajoutée', 'success');
      input.value = '';
      loadStones();
    } else {
      showMessage(result.error || 'Erreur lors de l\'ajout', 'error');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de l\'ajout', 'error');
  }
}

// Supprimer une pierre
async function deleteStone(id) {
  const confirmed = await showConfirm(
    'Êtes-vous sûr de vouloir supprimer cette pierre ?',
    'Supprimer la pierre'
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/settings/stones/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      showMessage('Pierre supprimée', 'success');
      loadStones();
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de la suppression', 'error');
  }
}

// Charger les couleurs
async function loadColors() {
  try {
    const response = await fetch('/api/settings/colors');
    const colors = await response.json();

    const container = document.getElementById('colors-list');
    container.innerHTML = colors.map(color => `
      <span class="badge badge-info" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem;">
        ${color.name}
        <button onclick="deleteColor(${color.id})" style="background: none; border: none; cursor: pointer; color: white; font-size: 1.2rem; line-height: 1;">×</button>
      </span>
    `).join('');
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Ajouter une couleur
async function addColor() {
  const input = document.getElementById('new-color');
  const name = input.value.trim();

  if (!name) {
    showMessage('Veuillez entrer un nom', 'error');
    return;
  }

  try {
    const response = await fetch('/api/settings/colors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    const result = await response.json();

    if (result.success) {
      showMessage('Couleur ajoutée', 'success');
      input.value = '';
      loadColors();
    } else {
      showMessage(result.error || 'Erreur lors de l\'ajout', 'error');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de l\'ajout', 'error');
  }
}

// Supprimer une couleur
async function deleteColor(id) {
  const confirmed = await showConfirm(
    'Êtes-vous sûr de vouloir supprimer cette couleur ?',
    'Supprimer la couleur'
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/settings/colors/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      showMessage('Couleur supprimée', 'success');
      loadColors();
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de la suppression', 'error');
  }
}

// ═══════════════════════════════════════════════════
// GESTION DU THÈME
// ═══════════════════════════════════════════════════

const themeNames = {
  'auto': 'Automatique',
  'rose': 'Rose classique',
  'noel': 'Noël',
  'printemps': 'Printemps',
  'ete': 'Été',
  'automne': 'Automne',
  'halloween': 'Halloween',
  'valentin': 'Saint-Valentin',
  'hiver': 'Hiver'
};

// Charger le thème actuel
async function loadCurrentTheme() {
  try {
    const response = await fetch('/api/settings/theme');
    const data = await response.json();
    const theme = data.theme || 'auto';

    // Si le thème est en mode automatique, on ne l'applique pas ici
    // car theme.js s'en charge déjà
    if (theme !== 'auto') {
      document.documentElement.setAttribute('data-theme', theme);
    }

    // Mettre à jour l'interface
    updateThemeSelection(theme);
  } catch (error) {
    console.error('Erreur lors du chargement du thème:', error);
  }
}

// Sélectionner un thème
async function selectTheme(theme) {
  try {
    const response = await fetch('/api/settings/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme })
    });

    const result = await response.json();

    if (result.success) {
      // Si le thème est en mode automatique, recharger la page pour appliquer la détection
      if (theme === 'auto') {
        showMessage(`Mode automatique activé ! Le thème s'adaptera aux saisons.`, 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        // Appliquer le thème directement
        document.documentElement.setAttribute('data-theme', theme);
        updateThemeSelection(theme);
        showMessage(`Thème ${themeNames[theme]} appliqué avec succès`, 'success');
      }
    } else {
      showMessage(result.error || 'Erreur lors du changement de thème', 'error');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors du changement de thème', 'error');
  }
}

// Mettre à jour la sélection visuelle du thème
function updateThemeSelection(theme) {
  // Retirer la classe selected de tous les thèmes
  document.querySelectorAll('.theme-option').forEach(option => {
    option.classList.remove('selected');
  });

  // Ajouter la classe selected au thème actuel
  const selectedOption = document.querySelector(`.theme-option[data-theme="${theme}"]`);
  if (selectedOption) {
    selectedOption.classList.add('selected');
  }

  // Mettre à jour le texte du thème actuel
  const themeNameElement = document.getElementById('current-theme-name');
  if (themeNameElement) {
    themeNameElement.textContent = themeNames[theme] || theme;
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  const authenticated = await checkAuth();

  if (authenticated) {
    loadStats();
    loadProducts();
    loadOrders();
    loadThreads();
    loadCurrentTheme(); // Charger le thème actuel

    // Écouter la soumission du formulaire produit
    const productForm = document.getElementById('product-form');
    productForm.addEventListener('submit', handleProductSubmit);

    // Prévisualiser les nouvelles images sélectionnées
    const imagesInput = document.getElementById('product-images');
    if (imagesInput) {
      imagesInput.addEventListener('change', previewNewImages);
    }

    // Fermer le modal en cliquant en dehors
    const modal = document.getElementById('product-modal');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeProductModal();
      }
    });
  }
});

// Ajouter de nouvelles images à la sélection
function previewNewImages(event) {
  const files = event.target.files;

  if (!files || files.length === 0) {
    return;
  }

  // Ajouter les nouveaux fichiers au tableau existant (accumulation)
  Array.from(files).forEach(file => {
    newImagesToUpload.push(file);

    // Ajouter aussi à allImagesOrder
    if (!window.allImagesOrder) {
      window.allImagesOrder = [];
    }
    window.allImagesOrder.push({
      type: 'new',
      data: file
    });
  });

  // Réinitialiser l'input pour permettre de sélectionner à nouveau les mêmes fichiers si nécessaire
  event.target.value = '';

  // Réafficher toutes les images
  displayAllImages();
}

// Afficher toutes les images (existantes + nouvelles) de manière intégrée
function displayAllImages() {
  const previewContainer = document.getElementById('images-preview');
  previewContainer.innerHTML = '';

  // Utiliser allImagesOrder s'il existe, sinon créer le tableau à partir des tableaux séparés
  let allImages = [];

  if (window.allImagesOrder && window.allImagesOrder.length > 0) {
    // Utiliser l'ordre global sauvegardé
    allImages = window.allImagesOrder.map((item, index) => ({
      type: item.type,
      data: item.data,
      originalIndex: index
    }));
  } else {
    // Créer un nouveau tableau mixte et l'enregistrer
    currentProductImages.forEach((image, index) => {
      allImages.push({
        type: 'existing',
        data: image,
        originalIndex: index
      });
    });

    newImagesToUpload.forEach((file, index) => {
      allImages.push({
        type: 'new',
        data: file,
        originalIndex: index
      });
    });

    // Sauvegarder dans allImagesOrder
    window.allImagesOrder = allImages;
  }

  const totalImages = allImages.length;

  // Si aucune image, afficher un message
  if (totalImages === 0) {
    previewContainer.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 1rem; text-align: center; color: var(--texte-secondaire);">
        Aucune image pour ce produit
      </div>
    `;
    return;
  }

  // Afficher toutes les images de manière intégrée
  allImages.forEach((item, globalIndex) => {
    const imageDiv = document.createElement('div');
    imageDiv.className = 'image-item';
    imageDiv.style.position = 'relative';
    imageDiv.style.display = 'inline-block';
    imageDiv.style.width = '120px';
    imageDiv.style.height = '120px';
    imageDiv.style.marginRight = '0.35rem';
    imageDiv.style.marginBottom = '0.35rem';
    imageDiv.style.overflow = 'hidden';
    imageDiv.style.borderRadius = '10px';

    const img = document.createElement('img');
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.display = 'block';

    // Badge de position
    const badge = document.createElement('span');
    badge.style.position = 'absolute';
    badge.style.top = '5px';
    badge.style.left = '5px';
    badge.style.color = 'white';
    badge.style.padding = '3px 8px';
    badge.style.borderRadius = '5px';
    badge.style.fontSize = '0.75rem';
    badge.style.fontWeight = 'bold';
    badge.style.zIndex = '2';

    // Bouton de suppression (décalé vers la droite pour ne pas empiéter sur le badge)
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '✕';
    deleteBtn.type = 'button';
    deleteBtn.style.position = 'absolute';
    deleteBtn.style.top = '5px';
    deleteBtn.style.right = '5px';
    deleteBtn.style.background = 'var(--rose-poudre)';
    deleteBtn.style.color = 'white';
    deleteBtn.style.border = 'none';
    deleteBtn.style.borderRadius = '50%';
    deleteBtn.style.width = '24px';
    deleteBtn.style.height = '24px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.fontSize = '14px';
    deleteBtn.style.fontWeight = 'bold';
    deleteBtn.style.display = 'flex';
    deleteBtn.style.alignItems = 'center';
    deleteBtn.style.justifyContent = 'center';
    deleteBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    deleteBtn.style.zIndex = '2';

    // Boutons de réorganisation
    const controlsDiv = document.createElement('div');
    controlsDiv.style.position = 'absolute';
    controlsDiv.style.bottom = '8px';
    controlsDiv.style.left = '50%';
    controlsDiv.style.transform = 'translateX(-50%)';
    controlsDiv.style.display = 'flex';
    controlsDiv.style.gap = '5px';
    controlsDiv.style.zIndex = '2';

    let moveUpBtn = null;
    let moveDownBtn = null;

    if (globalIndex > 0) {
      moveUpBtn = document.createElement('button');
      moveUpBtn.innerHTML = '◀';
      moveUpBtn.type = 'button';
      moveUpBtn.style.background = 'rgba(255, 255, 255, 0.9)';
      moveUpBtn.style.border = 'none';
      moveUpBtn.style.borderRadius = '50%';
      moveUpBtn.style.width = '24px';
      moveUpBtn.style.height = '24px';
      moveUpBtn.style.cursor = 'pointer';
      moveUpBtn.style.fontSize = '12px';
      moveUpBtn.style.fontWeight = 'bold';
      moveUpBtn.style.display = 'flex';
      moveUpBtn.style.alignItems = 'center';
      moveUpBtn.style.justifyContent = 'center';
      moveUpBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
      moveUpBtn.onclick = () => moveImageGlobally(globalIndex, globalIndex - 1);
      controlsDiv.appendChild(moveUpBtn);
    }

    if (globalIndex < totalImages - 1) {
      moveDownBtn = document.createElement('button');
      moveDownBtn.innerHTML = '▶';
      moveDownBtn.type = 'button';
      moveDownBtn.style.background = 'rgba(255, 255, 255, 0.9)';
      moveDownBtn.style.border = 'none';
      moveDownBtn.style.borderRadius = '50%';
      moveDownBtn.style.width = '24px';
      moveDownBtn.style.height = '24px';
      moveDownBtn.style.cursor = 'pointer';
      moveDownBtn.style.fontSize = '12px';
      moveDownBtn.style.fontWeight = 'bold';
      moveDownBtn.style.display = 'flex';
      moveDownBtn.style.alignItems = 'center';
      moveDownBtn.style.justifyContent = 'center';
      moveDownBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
      moveDownBtn.onclick = () => moveImageGlobally(globalIndex, globalIndex + 1);
      controlsDiv.appendChild(moveDownBtn);
    }

    if (item.type === 'existing') {
      // Image existante
      const image = item.data;
      img.src = `/images/uploads/${image.image_path}`;
      img.alt = `Image ${globalIndex + 1}`;
      
      // Bordure sur le conteneur
      imageDiv.style.border = globalIndex === 0 ? '3px solid var(--pastel-vert)' : '2px solid var(--lavande)';

      badge.textContent = globalIndex === 0 ? '★ Principale' : `${globalIndex + 1}`;
      badge.style.background = globalIndex === 0 ? 'var(--pastel-vert)' : 'var(--lavande)';

      moveUpBtn && (moveUpBtn.style.color = 'var(--lavande)');
      moveDownBtn && (moveDownBtn.style.color = 'var(--lavande)');

      deleteBtn.onclick = () => deleteImageFromProduct(image.id, item.originalIndex);
    } else {
      // Nouvelle image
      const file = item.data;
      img.alt = `Nouvelle image ${globalIndex + 1}`;
      
      // Bordure sur le conteneur
      imageDiv.style.border = globalIndex === 0 ? '3px solid var(--pastel-vert)' : '3px solid var(--pastel-vert)';
      img.style.opacity = '0.95';

      badge.textContent = globalIndex === 0 ? '★ Nouvelle' : `✨ ${globalIndex + 1}`;
      badge.style.background = 'var(--pastel-vert)';

      moveUpBtn && (moveUpBtn.style.color = 'var(--pastel-vert)');
      moveDownBtn && (moveDownBtn.style.color = 'var(--pastel-vert)');

      deleteBtn.onclick = () => removeNewImageGlobally(globalIndex);

      // Lire le fichier et afficher l'image
      const reader = new FileReader();
      reader.onload = function(e) {
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    imageDiv.appendChild(img);
    imageDiv.appendChild(badge);
    imageDiv.appendChild(deleteBtn);
    imageDiv.appendChild(controlsDiv);
    previewContainer.appendChild(imageDiv);
  });

  // Message informatif
  if (totalImages > 0) {
    const infoDiv = document.createElement('div');
    infoDiv.style.gridColumn = '1 / -1';
    infoDiv.style.padding = '0.5rem';
    infoDiv.style.background = 'var(--fond-secondaire)';
    infoDiv.style.borderRadius = '8px';
    infoDiv.style.fontSize = '0.9rem';
    infoDiv.style.color = 'var(--texte-secondaire)';
    infoDiv.style.marginTop = '0.5rem';
    infoDiv.innerHTML = `
      <strong>💡 Astuce :</strong> Utilisez les boutons ◀ ▶ pour réorganiser toutes les images ensemble. Les images avec ✨ seront ajoutées lors de la sauvegarde.
    `;
    previewContainer.appendChild(infoDiv);
  }
}

// Variable globale pour garder l'ordre mixte des images
if (typeof window.allImagesOrder === 'undefined') {
  window.allImagesOrder = [];
}

// Déplacer une image dans l'ordre global (existantes + nouvelles mélangées)
function moveImageGlobally(fromIndex, toIndex) {
  // Si allImagesOrder est vide, le créer à partir des tableaux actuels
  if (window.allImagesOrder.length === 0) {
    currentProductImages.forEach(img => window.allImagesOrder.push({ type: 'existing', data: img }));
    newImagesToUpload.forEach(file => window.allImagesOrder.push({ type: 'new', data: file }));
  }

  // Échanger les positions dans le tableau global
  const temp = window.allImagesOrder[fromIndex];
  window.allImagesOrder[fromIndex] = window.allImagesOrder[toIndex];
  window.allImagesOrder[toIndex] = temp;

  // Reconstruire les tableaux séparés à partir de allImagesOrder
  currentProductImages = [];
  newImagesToUpload = [];

  window.allImagesOrder.forEach((item, index) => {
    if (item.type === 'existing') {
      // Mettre à jour display_order et is_primary
      item.data.display_order = index;
      item.data.is_primary = index === 0 ? 1 : 0;
      currentProductImages.push(item.data);
    } else {
      newImagesToUpload.push(item.data);
    }
  });

  // Ne plus sauvegarder immédiatement, l'ordre sera appliqué à la sauvegarde du formulaire

  displayAllImages();
}

// Fonction asynchrone pour sauvegarder l'ordre des images
async function saveImageOrderAsync(productId) {
  try {
    await fetch(`/api/admin/products/${productId}/reorder-images`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: currentProductImages.map(img => ({
          id: img.id,
          display_order: img.display_order,
          is_primary: img.is_primary
        }))
      })
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'ordre:', error);
  }
}

// Supprimer une nouvelle image de la liste (globalIndex = position dans l'affichage complet)
function removeNewImageGlobally(globalIndex) {
  // Supprimer de allImagesOrder
  if (window.allImagesOrder && window.allImagesOrder.length > globalIndex) {
    window.allImagesOrder.splice(globalIndex, 1);
  }

  // Reconstruire les tableaux séparés à partir de allImagesOrder
  currentProductImages = [];
  newImagesToUpload = [];

  window.allImagesOrder.forEach((item, index) => {
    if (item.type === 'existing') {
      item.data.display_order = index;
      item.data.is_primary = index === 0 ? 1 : 0;
      currentProductImages.push(item.data);
    } else {
      newImagesToUpload.push(item.data);
    }
  });

  displayAllImages();
}

// ═══════════════════════════════════════════════════
// Gestion de la boutique (images)
// ═══════════════════════════════════════════════════

let boutiqueImages = [];

// Charger les images de la boutique
async function loadBoutiqueImages() {
  try {
    const response = await fetch('/api/boutique/images');
    boutiqueImages = await response.json();
    displayBoutiqueImages();
  } catch (error) {
    console.error('Erreur chargement images boutique:', error);
    showMessage('Erreur lors du chargement des images', 'error');
  }
}

// Afficher les images de la boutique
function displayBoutiqueImages() {
  const grid = document.getElementById('boutique-images-grid');
  const noImagesMsg = document.getElementById('no-boutique-images');
  const hint = document.getElementById('boutique-images-hint');

  if (boutiqueImages.length === 0) {
    grid.style.display = 'none';
    noImagesMsg.style.display = 'block';
    if (hint) hint.style.display = 'none';
    return;
  }

  grid.style.display = 'grid';
  noImagesMsg.style.display = 'none';
  if (hint) hint.style.display = 'block';

  grid.innerHTML = boutiqueImages.map((img, index) => `
    <div class="boutique-image-item" data-id="${img.id}" data-order="${img.display_order}"
         style="position: relative; background: white; border-radius: 12px; padding: 0.5rem;
                box-shadow: var(--ombre-douce); border: 2px solid var(--lavande);">

      <!-- Bouton supprimer en haut à droite -->
      <button onclick="deleteBoutiqueImage(${img.id})"
              style="position: absolute; top: 0.75rem; right: 0.75rem; z-index: 10;
                     background: var(--lavande); color: white; border: none;
                     width: 32px; height: 32px; border-radius: 8px; cursor: pointer;
                     display: flex; align-items: center; justify-content: center;
                     font-size: 1.2rem; font-weight: 700; transition: all 0.3s ease;
                     box-shadow: 0 2px 8px rgba(212, 165, 212, 0.3);"
              onmouseover="this.style.transform='scale(1.1) rotate(90deg)'; this.style.boxShadow='0 4px 12px rgba(212, 165, 212, 0.5)'; this.style.opacity='0.9'"
              onmouseout="this.style.transform='scale(1) rotate(0deg)'; this.style.boxShadow='0 2px 8px rgba(212, 165, 212, 0.3)'; this.style.opacity='1'">
        ✕
      </button>

      <img src="${img.image_path}" alt="Boutique"
           style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 0.5rem;">

      <div style="display: flex; gap: 0.5rem; justify-content: center; align-items: center;">
        <button onclick="moveBoutiqueImage(${img.id}, -1)"
                class="btn-small btn-secondary"
                ${index === 0 ? 'disabled' : ''}
                style="padding: 0.5rem; font-size: 1rem; border-radius: 8px; width: 36px; height: 36px;
                       display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ◀
        </button>
        <div style="display: flex; align-items: center; gap: 0.3rem;">
          <span style="color: var(--texte-secondaire); font-size: 0.85rem; white-space: nowrap;">Position</span>
          <input type="number"
                 value="${index + 1}"
                 min="1"
                 max="${boutiqueImages.length}"
                 onchange="changeBoutiqueImagePosition(${img.id}, this.value)"
                 style="width: 45px; padding: 0.4rem; text-align: center; border: 2px solid var(--lavande);
                        border-radius: 8px; font-size: 0.9rem; font-weight: 600; -moz-appearance: textfield;"
                 onwheel="this.blur()">
        </div>
        <button onclick="moveBoutiqueImage(${img.id}, 1)"
                class="btn-small btn-secondary"
                ${index === boutiqueImages.length - 1 ? 'disabled' : ''}
                style="padding: 0.5rem; font-size: 1rem; border-radius: 8px; width: 36px; height: 36px;
                       display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ▶
        </button>
      </div>
    </div>
  `).join('');
}

// Ajouter une image de la boutique
async function uploadBoutiqueImage() {
  const input = document.getElementById('boutique-image-input');
  const file = input.files[0];

  if (!file) {
    showMessage('Veuillez sélectionner une image', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch('/api/boutique/images', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Erreur lors de l\'upload');
    }

    const newImage = await response.json();
    boutiqueImages.push(newImage);
    displayBoutiqueImages();
    input.value = '';
    showMessage('Image ajoutée avec succès !', 'success');
  } catch (error) {
    console.error('Erreur upload image:', error);
    showMessage('Erreur lors de l\'ajout de l\'image', 'error');
  }
}

// Supprimer une image de la boutique
async function deleteBoutiqueImage(id) {
  const confirmed = await showConfirm(
    'Voulez-vous vraiment supprimer cette image ?',
    'Supprimer l\'image'
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/boutique/images/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la suppression');
    }

    boutiqueImages = boutiqueImages.filter(img => img.id !== id);
    displayBoutiqueImages();
    showMessage('Image supprimée avec succès !', 'success');
  } catch (error) {
    console.error('Erreur suppression image:', error);
    showMessage('Erreur lors de la suppression', 'error');
  }
}

// Déplacer une image de la boutique
async function moveBoutiqueImage(id, direction) {
  const index = boutiqueImages.findIndex(img => img.id === id);

  if (index === -1) return;

  const newIndex = index + direction;

  if (newIndex < 0 || newIndex >= boutiqueImages.length) return;

  // Échanger les positions
  [boutiqueImages[index], boutiqueImages[newIndex]] = [boutiqueImages[newIndex], boutiqueImages[index]];

  // Mettre à jour les display_order
  const updatedImages = boutiqueImages.map((img, idx) => ({
    id: img.id,
    display_order: idx + 1
  }));

  try {
    const response = await fetch('/api/boutique/images/reorder', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ images: updatedImages })
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la réorganisation');
    }

    // Mettre à jour l'affichage local
    boutiqueImages.forEach((img, idx) => {
      img.display_order = idx + 1;
    });

    displayBoutiqueImages();
  } catch (error) {
    console.error('Erreur réorganisation:', error);
    showMessage('Erreur lors de la réorganisation', 'error');
    loadBoutiqueImages(); // Recharger pour rétablir l'ordre
  }
}

// Changer directement la position d'une image de boutique
async function changeBoutiqueImagePosition(id, newPosition) {
  const newPos = parseInt(newPosition);

  // Validation
  if (isNaN(newPos) || newPos < 1 || newPos > boutiqueImages.length) {
    showMessage('Position invalide', 'error');
    displayBoutiqueImages(); // Réafficher pour rétablir la valeur
    return;
  }

  const currentIndex = boutiqueImages.findIndex(img => img.id === id);
  if (currentIndex === -1) return;

  // Si c'est déjà la bonne position, ne rien faire
  if (currentIndex + 1 === newPos) return;

  // Déplacer l'élément à la nouvelle position
  const [movedImage] = boutiqueImages.splice(currentIndex, 1);
  boutiqueImages.splice(newPos - 1, 0, movedImage);

  // Mettre à jour les display_order
  const updatedImages = boutiqueImages.map((img, idx) => ({
    id: img.id,
    display_order: idx + 1
  }));

  try {
    const response = await fetch('/api/boutique/images/reorder', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ images: updatedImages })
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la réorganisation');
    }

    // Mettre à jour l'affichage local
    boutiqueImages.forEach((img, idx) => {
      img.display_order = idx + 1;
    });

    displayBoutiqueImages();
    showMessage('Position mise à jour', 'success');
  } catch (error) {
    console.error('Erreur réorganisation:', error);
    showMessage('Erreur lors de la réorganisation', 'error');
    loadBoutiqueImages(); // Recharger pour rétablir l'ordre
  }
}

// ═══════════════════════════════════════════════════
// 🌸 La p'tite perlouze - Script admin 🌸
// ═══════════════════════════════════════════════════

let currentEditProductId = null;

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
    loadContacts();
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
    document.getElementById('stat-orders').textContent = stats.totalOrders;
    document.getElementById('stat-revenue').textContent = stats.totalRevenue.toFixed(2) + ' €';
    document.getElementById('stat-messages').textContent = stats.pendingMessages;
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

    // Afficher les images existantes
    displayExistingImages(product.images || []);
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Variable globale pour stocker les images du produit en cours d'édition
let currentProductImages = [];

// Afficher les images existantes avec contrôles
function displayExistingImages(images) {
  const previewContainer = document.getElementById('images-preview');
  previewContainer.innerHTML = '';

  currentProductImages = images || [];

  if (currentProductImages.length === 0) {
    previewContainer.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 1rem; text-align: center; color: var(--texte-secondaire);">
        Aucune image pour ce produit
      </div>
    `;
    return;
  }

  currentProductImages.forEach((image, index) => {
    const imageDiv = document.createElement('div');
    imageDiv.className = 'image-item';
    imageDiv.style.position = 'relative';
    imageDiv.style.display = 'inline-block';
    imageDiv.style.marginRight = '0.5rem';
    imageDiv.style.marginBottom = '0.5rem';

    const img = document.createElement('img');
    img.src = `/images/uploads/${image.image_path}`;
    img.alt = `Image ${index + 1}`;
    img.style.width = '120px';
    img.style.height = '120px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '10px';
    img.style.border = image.is_primary ? '3px solid var(--pastel-vert)' : '2px solid var(--lavande)';

    // Badge de position
    const badge = document.createElement('span');
    badge.textContent = image.is_primary ? '★ Principale' : `${index + 1}`;
    badge.style.position = 'absolute';
    badge.style.top = '5px';
    badge.style.left = '5px';
    badge.style.background = image.is_primary ? 'var(--pastel-vert)' : 'var(--lavande)';
    badge.style.color = 'white';
    badge.style.padding = '3px 8px';
    badge.style.borderRadius = '5px';
    badge.style.fontSize = '0.75rem';
    badge.style.fontWeight = 'bold';

    // Bouton de suppression
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
    deleteBtn.onclick = () => deleteImageFromProduct(image.id, index);

    // Boutons de réorganisation
    const controlsDiv = document.createElement('div');
    controlsDiv.style.position = 'absolute';
    controlsDiv.style.bottom = '5px';
    controlsDiv.style.left = '50%';
    controlsDiv.style.transform = 'translateX(-50%)';
    controlsDiv.style.display = 'flex';
    controlsDiv.style.gap = '5px';

    if (index > 0) {
      const moveUpBtn = document.createElement('button');
      moveUpBtn.innerHTML = '◀';
      moveUpBtn.type = 'button';
      moveUpBtn.style.background = 'rgba(255, 255, 255, 0.9)';
      moveUpBtn.style.color = 'var(--lavande)';
      moveUpBtn.style.border = 'none';
      moveUpBtn.style.borderRadius = '50%';
      moveUpBtn.style.width = '24px';
      moveUpBtn.style.height = '24px';
      moveUpBtn.style.cursor = 'pointer';
      moveUpBtn.style.fontSize = '12px';
      moveUpBtn.style.fontWeight = 'bold';
      moveUpBtn.onclick = () => moveImage(index, index - 1);
      controlsDiv.appendChild(moveUpBtn);
    }

    if (index < currentProductImages.length - 1) {
      const moveDownBtn = document.createElement('button');
      moveDownBtn.innerHTML = '▶';
      moveDownBtn.type = 'button';
      moveDownBtn.style.background = 'rgba(255, 255, 255, 0.9)';
      moveDownBtn.style.color = 'var(--lavande)';
      moveDownBtn.style.border = 'none';
      moveDownBtn.style.borderRadius = '50%';
      moveDownBtn.style.width = '24px';
      moveDownBtn.style.height = '24px';
      moveDownBtn.style.cursor = 'pointer';
      moveDownBtn.style.fontSize = '12px';
      moveDownBtn.style.fontWeight = 'bold';
      moveDownBtn.onclick = () => moveImage(index, index + 1);
      controlsDiv.appendChild(moveDownBtn);
    }

    imageDiv.appendChild(img);
    imageDiv.appendChild(badge);
    imageDiv.appendChild(deleteBtn);
    imageDiv.appendChild(controlsDiv);
    previewContainer.appendChild(imageDiv);
  });

  // Message informatif
  const infoDiv = document.createElement('div');
  infoDiv.style.gridColumn = '1 / -1';
  infoDiv.style.padding = '0.5rem';
  infoDiv.style.background = 'var(--fond-secondaire)';
  infoDiv.style.borderRadius = '8px';
  infoDiv.style.fontSize = '0.9rem';
  infoDiv.style.color = 'var(--texte-secondaire)';
  infoDiv.style.marginTop = '0.5rem';
  infoDiv.innerHTML = `
    <strong>💡 Astuce :</strong> Utilisez les boutons ◀ ▶ pour réorganiser les images. La première image sera l'image principale.
  `;
  previewContainer.appendChild(infoDiv);
}

// Supprimer une image du produit
async function deleteImageFromProduct(imageId, index) {
  const confirmed = await showConfirm(
    'Voulez-vous vraiment supprimer cette image ?',
    'Supprimer l\'image'
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/product-images/${imageId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      showMessage('Image supprimée', 'success');
      currentProductImages.splice(index, 1);
      displayExistingImages(currentProductImages);
    } else {
      showMessage('Erreur lors de la suppression', 'error');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de la suppression', 'error');
  }
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
  displayExistingImages(currentProductImages);

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
  const imageFiles = document.getElementById('product-images').files;
  if (imageFiles && imageFiles.length > 0) {
    console.log(`Envoi de ${imageFiles.length} image(s)`);
    if (imageFiles.length > 10) {
      showMessage('Vous ne pouvez sélectionner que 10 images maximum', 'error');
      return;
    }
    for (let i = 0; i < imageFiles.length; i++) {
      console.log(`Ajout image ${i + 1}:`, imageFiles[i].name);
      formData.append('images', imageFiles[i]);
    }
  } else {
    console.log('Aucune image sélectionnée');
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

// Variable globale pour stocker les contacts
let allContacts = [];

// Charger les messages
async function loadContacts() {
  try {
    const response = await fetch('/api/admin/contacts');
    allContacts = await response.json();
    updateMessagesBadge();

    const tbody = document.querySelector('#contacts-table tbody');
    tbody.innerHTML = '';

    if (allContacts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 3rem; color: var(--texte-secondaire);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">✉️</div>
            <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">Aucun message de contact</p>
            <p style="font-size: 0.9rem;">Les messages des visiteurs apparaîtront ici</p>
          </td>
        </tr>
      `;
      return;
    }

    allContacts.forEach(contact => {
      const row = document.createElement('tr');
      const date = new Date(contact.created_at).toLocaleDateString('fr-FR');

      row.innerHTML = `
        <td data-label="Date">${date}</td>
        <td data-label="Nom">${contact.name}</td>
        <td data-label="Email">${contact.email}</td>
        <td data-label="Message" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${contact.message}
        </td>
        <td data-label="Statut">
          ${contact.status === 'nouveau'
            ? '<span class="badge badge-warning">Nouveau</span>'
            : '<span class="badge badge-success">Lu</span>'
          }
        </td>
        <td data-label="Actions">
          <button onclick="viewContact(${contact.id})" class="btn btn-secondary btn-small" title="Voir le message">
            👁️
          </button>
          <button onclick="deleteContact(${contact.id})" class="btn btn-secondary btn-small" title="Supprimer">
            🗑️
          </button>
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
  const unreadCount = allContacts.filter(c => c.status === 'nouveau').length;
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

// Marquer un message comme lu
async function markAsRead(contactId) {
  try {
    const response = await fetch(`/api/admin/contacts/${contactId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'lu' })
    });

    const result = await response.json();

    if (result.success) {
      showMessage('Message marqué comme lu', 'success');
      loadContacts();
      loadStats();
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Voir le détail d'un message
function viewContact(contactId) {
  const contact = allContacts.find(c => c.id === contactId);
  if (!contact) return;

  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Message de ${contact.name}</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <p style="margin: 0.5rem 0;"><strong>Email:</strong> ${contact.email}</p>
        <p style="margin: 0.5rem 0;"><strong>Date:</strong> ${new Date(contact.created_at).toLocaleString('fr-FR')}</p>
        <p style="margin: 0.5rem 0;"><strong>Statut:</strong> ${contact.status === 'nouveau' ? 'Nouveau' : 'Lu'}</p>
      </div>

      <div style="background: var(--gris-clair); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <h4 style="margin: 0 0 1rem 0; color: var(--texte-principal);">Message:</h4>
        <p style="white-space: pre-wrap; margin: 0; line-height: 1.6;">${contact.message}</p>
      </div>

      <div style="display: flex; gap: 1rem; justify-content: flex-end;">
        ${contact.status === 'nouveau' ? `
          <button onclick="markAsRead(${contact.id}); this.closest('.modal').remove();" class="btn btn-primary">
            Marquer comme lu
          </button>
        ` : ''}
        <button onclick="this.closest('.modal').remove();" class="btn btn-secondary">Fermer</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// Supprimer un message
async function deleteContact(contactId) {
  if (!confirm('Voulez-vous vraiment supprimer ce message ? Cette action est irréversible.')) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/contacts/${contactId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      showMessage('Message supprimé avec succès', 'success');
      loadContacts();
      loadStats();
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

    // Mettre à jour l'URL du petit bout de bois
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
      <span class="badge badge-info" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem;">
        ${cat.name}
        <button onclick="deleteCategory(${cat.id})" style="background: none; border: none; cursor: pointer; color: white; font-size: 1.2rem; line-height: 1;">×</button>
      </span>
    `).join('');
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Ajouter une catégorie
async function addCategory() {
  const input = document.getElementById('new-category');
  const name = input.value.trim();

  if (!name) {
    showMessage('Veuillez entrer un nom', 'error');
    return;
  }

  try {
    const response = await fetch('/api/settings/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    const result = await response.json();

    if (result.success) {
      showMessage('Catégorie ajoutée', 'success');
      input.value = '';
      loadCategories();
    } else {
      showMessage(result.error || 'Erreur lors de l\'ajout', 'error');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showMessage('Erreur lors de l\'ajout', 'error');
  }
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
    loadContacts();
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

// Prévisualiser les nouvelles images sélectionnées
function previewNewImages(event) {
  const files = event.target.files;

  if (!files || files.length === 0) {
    // Si aucun fichier, réafficher les images existantes
    displayExistingImages(currentProductImages);
    return;
  }

  const previewContainer = document.getElementById('images-preview');

  // Afficher d'abord les images existantes
  displayExistingImages(currentProductImages);

  // Ajouter un séparateur
  if (currentProductImages.length > 0) {
    const separator = document.createElement('div');
    separator.style.gridColumn = '1 / -1';
    separator.style.borderTop = '2px dashed var(--lavande)';
    separator.style.margin = '1rem 0';
    previewContainer.appendChild(separator);

    const newImagesTitle = document.createElement('div');
    newImagesTitle.style.gridColumn = '1 / -1';
    newImagesTitle.style.padding = '0.5rem';
    newImagesTitle.style.background = 'var(--pastel-vert)';
    newImagesTitle.style.color = 'white';
    newImagesTitle.style.borderRadius = '8px';
    newImagesTitle.style.fontSize = '0.9rem';
    newImagesTitle.style.fontWeight = 'bold';
    newImagesTitle.textContent = `➕ ${files.length} nouvelle(s) image(s) à ajouter`;
    previewContainer.appendChild(newImagesTitle);
  }

  // Afficher un aperçu de chaque nouvelle image
  Array.from(files).forEach((file, index) => {
    const reader = new FileReader();

    reader.onload = function(e) {
      const imageDiv = document.createElement('div');
      imageDiv.style.position = 'relative';
      imageDiv.style.display = 'inline-block';
      imageDiv.style.marginRight = '0.5rem';
      imageDiv.style.marginBottom = '0.5rem';

      const img = document.createElement('img');
      img.src = e.target.result;
      img.alt = `Nouvelle image ${index + 1}`;
      img.style.width = '120px';
      img.style.height = '120px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '10px';
      img.style.border = '3px solid var(--pastel-vert)';

      const badge = document.createElement('span');
      badge.textContent = `Nouvelle`;
      badge.style.position = 'absolute';
      badge.style.top = '5px';
      badge.style.left = '5px';
      badge.style.background = 'var(--pastel-vert)';
      badge.style.color = 'white';
      badge.style.padding = '3px 8px';
      badge.style.borderRadius = '5px';
      badge.style.fontSize = '0.75rem';
      badge.style.fontWeight = 'bold';

      imageDiv.appendChild(img);
      imageDiv.appendChild(badge);
      previewContainer.appendChild(imageDiv);
    };

    reader.readAsDataURL(file);
  });
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
                     background: var(--rose-poudre); color: white; border: none;
                     width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
                     display: flex; align-items: center; justify-content: center;
                     font-size: 1rem; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"
              onmouseover="this.style.background='var(--lavande)'; this.style.transform='scale(1.1)'"
              onmouseout="this.style.background='var(--rose-poudre)'; this.style.transform='scale(1)'">
        🗑️
      </button>

      <img src="${img.image_path}" alt="Boutique"
           style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 0.5rem;">

      <div style="display: flex; gap: 0.5rem; justify-content: center; align-items: center;">
        <button onclick="moveBoutiqueImage(${img.id}, -1)"
                class="btn-small btn-secondary"
                ${index === 0 ? 'disabled' : ''}
                style="padding: 0.5rem 0.75rem; font-size: 1rem; border-radius: 12px; min-width: 40px; height: 40px;
                       display: flex; align-items: center; justify-content: center;">
          ◀
        </button>
        <span style="color: var(--texte-secondaire); font-size: 0.85rem; min-width: 80px; text-align: center;">
          Position ${index + 1}
        </span>
        <button onclick="moveBoutiqueImage(${img.id}, 1)"
                class="btn-small btn-secondary"
                ${index === boutiqueImages.length - 1 ? 'disabled' : ''}
                style="padding: 0.5rem 0.75rem; font-size: 1rem; border-radius: 12px; min-width: 40px; height: 40px;
                       display: flex; align-items: center; justify-content: center;">
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

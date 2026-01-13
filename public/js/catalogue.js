// ═══════════════════════════════════════════════════
// 🌸 La p'tite perlouze - Script catalogue 🌸
// ═══════════════════════════════════════════════════

let allProducts = [];

// Mettre à jour le compteur du panier
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartCountElement = document.getElementById('cart-count');
  if (cartCountElement) {
    cartCountElement.textContent = totalItems;
    if (totalItems > 0) {
      cartCountElement.style.display = 'flex';
    } else {
      cartCountElement.style.display = 'none';
    }
  }
}

// Charger tous les produits
async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    const products = await response.json();
    allProducts = products;

    // Initialiser le filtre de prix avec le maximum
    initializePriceFilter();

    applyFilters();
  } catch (error) {
    console.error('Erreur lors du chargement des produits:', error);
    showError();
  }
}

// Initialiser le filtre de prix avec le prix maximum des produits
function initializePriceFilter() {
  if (allProducts.length === 0) return;

  const maxPrice = Math.max(...allProducts.map(p => p.price));
  const roundedMax = Math.ceil(maxPrice / 10) * 10; // Arrondir au multiple de 10 supérieur

  const priceFilter = document.getElementById('price-filter');
  const priceValue = document.getElementById('price-value');

  priceFilter.max = roundedMax;
  priceFilter.value = roundedMax;
  priceValue.textContent = roundedMax;
  updateSliderBackground(priceFilter);
}

// Mettre à jour le max du filtre de prix selon les produits filtrés
function updatePriceFilterMax(products) {
  if (products.length === 0) return;

  const maxPrice = Math.max(...products.map(p => p.price));
  const roundedMax = Math.ceil(maxPrice / 10) * 10;

  const priceFilter = document.getElementById('price-filter');
  const currentValue = parseFloat(priceFilter.value);

  priceFilter.max = roundedMax;

  // Si la valeur actuelle dépasse le nouveau max, l'ajuster
  if (currentValue > roundedMax) {
    priceFilter.value = roundedMax;
    document.getElementById('price-value').textContent = roundedMax;
  }

  updateSliderBackground(priceFilter);
}

// Appliquer les filtres
function applyFilters() {
  const categoryFilter = document.getElementById('category-filter').value;
  const stoneFilter = document.getElementById('stone-filter').value;
  const colorFilter = document.getElementById('color-filter').value;
  const priceFilter = parseFloat(document.getElementById('price-filter').value);

  // Appliquer tous les filtres en une seule fois
  let filteredProducts = allProducts.filter(product => {
    // Filtre catégorie
    if (categoryFilter !== 'Tous' && product.category !== categoryFilter) {
      return false;
    }

    // Filtre pierre
    if (stoneFilter !== 'Toutes' && !product.stones.includes(stoneFilter)) {
      return false;
    }

    // Filtre couleur
    if (colorFilter !== 'Toutes' && product.colors && !product.colors.includes(colorFilter)) {
      return false;
    }

    // Filtre prix
    if (product.price > priceFilter) {
      return false;
    }

    return true;
  });

  displayProducts(filteredProducts);
  updateProductCount(filteredProducts.length);
}

// Afficher les produits (optimisé avec DocumentFragment pour éviter les reflows)
function displayProducts(products) {
  const container = document.getElementById('products-grid');
  const noProductsDiv = document.getElementById('no-products');

  if (products.length === 0) {
    container.innerHTML = '';
    noProductsDiv.style.display = 'block';
    return;
  }

  noProductsDiv.style.display = 'none';

  // Utiliser un DocumentFragment pour construire tout le contenu hors du DOM
  const fragment = document.createDocumentFragment();

  products.forEach(product => {
    const productCard = createProductCard(product);
    fragment.appendChild(productCard);
  });

  // Vider et ajouter tout en une seule opération (un seul reflow)
  container.innerHTML = '';
  container.appendChild(fragment);
}

// Créer une carte de produit
function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'card product-card';
  card.style.cursor = 'pointer';

  // Utiliser la première image du carrousel si disponible, sinon l'image unique
  let imageSrc;
  if (product.images && product.images.length > 0) {
    const imgPath = product.images[0].image_path;
    imageSrc = imgPath.startsWith('https://') ? imgPath : `/images/uploads/${imgPath}`;
  } else if (product.image) {
    imageSrc = product.image.startsWith('https://') ? product.image : `/images/uploads/${product.image}`;
  } else {
    imageSrc = '/images/placeholder.jpg';
  }

  const stockBadge = product.stock <= 0
    ? '<span style="background: var(--rose-poudre); color: white; padding: 0.3rem 0.8rem; border-radius: 15px; font-size: 0.9rem; display: inline-block; margin-bottom: 0.5rem;">Rupture de stock</span>'
    : product.stock <= 3
    ? '<span style="background: var(--pastel-peche); color: var(--texte-principal); padding: 0.3rem 0.8rem; border-radius: 15px; font-size: 0.9rem; display: inline-block; margin-bottom: 0.5rem;">Plus que ' + product.stock + ' en stock</span>'
    : '';

  card.innerHTML = `
    <img src="${imageSrc}" alt="${product.name}" class="product-image loading" loading="lazy" decoding="async" onload="this.classList.remove('loading'); this.classList.add('loaded')" onerror="this.src='/images/placeholder.jpg'; this.classList.remove('loading'); this.classList.add('loaded')">
    <div class="product-info">
      ${stockBadge}
      <h3>${product.name}</h3>
      <p class="product-stones">${product.stones}</p>
      <p class="product-description">${product.description}</p>
      <p class="product-price">${product.price.toFixed(2)} €</p>
      ${product.stock > 0
        ? `<button class="btn btn-primary" onclick="event.stopPropagation(); addToCart(${product.id})">
             Ajouter au panier
           </button>`
        : `<button class="btn btn-primary" disabled style="opacity: 0.5; cursor: not-allowed;">
             Rupture de stock
           </button>`
      }
      <a href="/produit/${product.id}" class="btn btn-outline" style="margin-top: 0.5rem;" onclick="event.stopPropagation();">
        Voir détails
      </a>
    </div>
  `;

  // Ajouter un gestionnaire de clic sur toute la carte
  card.addEventListener('click', () => {
    window.location.href = `/produit/${product.id}`;
  });

  return card;
}

// Mettre à jour le compteur de produits
function updateProductCount(count) {
  const countElement = document.getElementById('product-count');
  if (count === 0) {
    countElement.textContent = 'Aucun produit disponible';
  } else if (count === 1) {
    countElement.textContent = '1 bijou disponible';
  } else {
    countElement.textContent = `${count} bijoux disponibles`;
  }
}

// Ajouter au panier
async function addToCart(productId) {
  try {
    const response = await fetch(`/api/products/${productId}`);
    const product = await response.json();

    if (product.stock <= 0) {
      showMessage('Ce produit n\'est plus en stock', 'error');
      return;
    }

    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        showMessage('Stock insuffisant', 'error');
        return;
      }
      existingItem.quantity++;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
        stock: product.stock
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showMessage(`${product.name} ajouté au panier ✨`, 'success');
  } catch (error) {
    console.error('Erreur lors de l\'ajout au panier:', error);
    showMessage('Erreur lors de l\'ajout au panier', 'error');
  }
}

// Afficher un message
function showMessage(message, type = 'info') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${type}`;
  messageDiv.textContent = message;
  messageDiv.style.position = 'fixed';
  messageDiv.style.zIndex = '10000';
  messageDiv.style.maxWidth = '300px';

  // Position adaptée selon la taille d'écran
  if (window.innerWidth <= 768) {
    // Mobile : en bas au centre
    messageDiv.style.bottom = '20px';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translateX(-50%)';
    messageDiv.style.width = 'calc(100% - 40px)';
    messageDiv.style.maxWidth = '400px';
  } else {
    // Desktop : en haut à droite
    messageDiv.style.top = '100px';
    messageDiv.style.right = '20px';
  }

  document.body.appendChild(messageDiv);

  setTimeout(() => {
    messageDiv.style.opacity = '0';
    messageDiv.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      document.body.removeChild(messageDiv);
    }, 300);
  }, 3000);
}

// Afficher une erreur
function showError() {
  const container = document.getElementById('products-grid');
  container.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
      <p style="font-size: 1.3rem; color: var(--texte-secondaire);">
        Impossible de charger les produits pour le moment
      </p>
      <button class="btn btn-primary" onclick="loadProducts()" style="margin-top: 1rem;">
        Réessayer
      </button>
    </div>
  `;
}

// Réinitialiser les filtres
function resetFilters() {
  document.getElementById('category-filter').value = 'Tous';
  document.getElementById('stone-filter').value = 'Toutes';
  document.getElementById('color-filter').value = 'Toutes';

  // Réinitialiser le filtre de prix avec le maximum dynamique
  initializePriceFilter();

  applyFilters();
}

// Mettre à jour le background du slider (effet rempli/vide)
function updateSliderBackground(slider) {
  const min = slider.min || 0;
  const max = slider.max;
  const value = slider.value;

  const percentage = ((value - min) / (max - min)) * 100;

  // Gradient avec partie foncée (remplie) à gauche et claire (vide) à droite
  slider.style.background = `linear-gradient(to right, var(--lavande) 0%, var(--lavande) ${percentage}%, #e0e0e0 ${percentage}%, #e0e0e0 100%)`;
}

// Mettre à jour l'affichage du prix
function updatePriceDisplay() {
  const priceFilter = document.getElementById('price-filter');
  const priceValue = document.getElementById('price-value');
  priceValue.textContent = priceFilter.value;
  updateSliderBackground(priceFilter);
  applyFilters();
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();

  // Récupérer la catégorie depuis l'URL si présente
  const urlParams = new URLSearchParams(window.location.search);
  const categoryFromUrl = urlParams.get('category');

  if (categoryFromUrl) {
    const categoryFilter = document.getElementById('category-filter');
    categoryFilter.value = categoryFromUrl;
  }

  loadProducts();

  // Écouter les changements de filtres
  document.getElementById('category-filter').addEventListener('change', applyFilters);
  document.getElementById('stone-filter').addEventListener('change', applyFilters);
  document.getElementById('color-filter').addEventListener('change', applyFilters);
  document.getElementById('price-filter').addEventListener('input', updatePriceDisplay);
});

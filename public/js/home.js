// ═══════════════════════════════════════════════════
// 🌸 La p'tite perlouze - Script page d'accueil 🌸
// ═══════════════════════════════════════════════════

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

// Charger les produits phares
async function loadFeaturedProducts() {
  try {
    const response = await fetch('/api/products/featured/home');
    const products = await response.json();

    const container = document.getElementById('featured-products');
    container.innerHTML = '';

    products.forEach(product => {
      const productCard = createProductCard(product);
      container.appendChild(productCard);
    });
  } catch (error) {
    console.error('Erreur lors du chargement des produits:', error);
    const container = document.getElementById('featured-products');
    container.innerHTML = '<p style="text-align: center; color: var(--texte-secondaire);">Impossible de charger les produits pour le moment.</p>';
  }
}

// Créer une carte de produit
function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'card product-card fade-in';
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

  card.innerHTML = `
    <img src="${imageSrc}" alt="${product.name}" class="product-image loading" loading="lazy" decoding="async" onload="this.classList.remove('loading'); this.classList.add('loaded')" onerror="this.src='/images/placeholder.jpg'; this.classList.remove('loading'); this.classList.add('loaded')">
    <div class="product-info">
      <h3>${product.name}</h3>
      <p class="product-stones">${product.stones}</p>
      <p class="product-description">${truncateText(product.description, 80)}</p>
      <p class="product-price">${product.price.toFixed(2)} €</p>
      <button class="btn btn-primary" onclick="event.stopPropagation(); addToCart(${product.id})">
        Ajouter au panier
      </button>
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

// Tronquer le texte
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
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

// Charger les catégories
async function loadCategories() {
  try {
    const response = await fetch('/api/settings/categories');
    const categories = await response.json();

    const container = document.getElementById('categories-grid');

    if (categories.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--texte-secondaire); grid-column: 1 / -1;">Aucune catégorie disponible pour le moment.</p>';
      return;
    }

    container.innerHTML = categories.map(category => `
      <a href="/catalogue?category=${encodeURIComponent(category.name)}" class="card category-card" style="text-decoration: none;">
        <div style="font-size: 3rem; text-align: center; margin-bottom: 1rem;">${category.emoji || '✨'}</div>
        <h3 style="text-align: center; color: var(--lavande); font-family: var(--font-manuscrite); font-size: 1.5rem;">${category.name}</h3>
        <p style="text-align: center; color: var(--texte-secondaire);">${category.description || ''}</p>
      </a>
    `).join('');
  } catch (error) {
    console.error('Erreur lors du chargement des catégories:', error);
    const container = document.getElementById('categories-grid');
    container.innerHTML = '<p style="text-align: center; color: var(--texte-secondaire); grid-column: 1 / -1;">Impossible de charger les catégories pour le moment.</p>';
  }
}

// Charger les paramètres du site
async function loadSiteSettings() {
  try {
    const response = await fetch('/api/settings');
    const settings = await response.json();

    // Mettre à jour le lien vers Le ptit bout de bois
    if (settings.boutdebois_url) {
      const boutdeboisLink = document.getElementById('boutdebois-link');
      if (boutdeboisLink) {
        boutdeboisLink.href = settings.boutdebois_url;
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement des paramètres:', error);
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  loadFeaturedProducts();
  loadCategories();
  loadSiteSettings();
});

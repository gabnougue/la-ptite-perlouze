// ═══════════════════════════════════════════════════
// 🌸 La p'tite perlouze - Script page produit 🌸
// ═══════════════════════════════════════════════════

let currentProduct = null;
let quantity = 1;

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

// Récupérer l'ID du produit depuis l'URL
function getProductIdFromUrl() {
  const pathParts = window.location.pathname.split('/');
  return pathParts[pathParts.length - 1];
}

// Charger le produit
async function loadProduct() {
  const productId = getProductIdFromUrl();

  try {
    const response = await fetch(`/api/products/${productId}`);

    if (!response.ok) {
      throw new Error('Produit non trouvé');
    }

    const product = await response.json();
    currentProduct = product;
    displayProduct(product);
  } catch (error) {
    console.error('Erreur lors du chargement du produit:', error);
    showError();
  }
}

// Afficher le produit
function displayProduct(product) {
  const section = document.getElementById('product-detail-section');
  
  // Masquer le skeleton loader
  const skeletonLoader = document.getElementById('skeleton-loader');
  if (skeletonLoader) {
    skeletonLoader.style.display = 'none';
  }

  // Récupérer la couleur lavande du thème actuel
  const lavandeColor = getComputedStyle(document.documentElement).getPropertyValue('--lavande').trim();
  // Convertir en rgba pour l'opacité
  const lavandeRgba = lavandeColor.replace('rgb', 'rgba').replace(')', ', 0.95)');
  const lavandeFull = lavandeColor.replace('rgb', 'rgba').replace(')', ', 1)');

  // Gérer les images : carrousel si plusieurs images, sinon image unique
  let imageHTML;
  if (product.images && product.images.length > 1) {
    // Carrousel pour plusieurs images
    const imagesHTML = product.images.map((img, index) => {
      const imageSrc = img.image_path.startsWith('https://') ? img.image_path : `/images/uploads/${img.image_path}`;
      return `<img src="${imageSrc}" alt="${product.name}" class="carousel-image ${index === 0 ? 'active' : ''}" loading="lazy" decoding="async" onerror="this.src='/images/placeholder.jpg'">`;
    }).join('');

    const dotsHTML = product.images.map((_, index) => {
      return `<span class="carousel-dot ${index === 0 ? 'active' : ''}" onclick="goToSlide(${index})"></span>`;
    }).join('');

    imageHTML = `
      <div class="carousel-container">
        <div class="carousel-images">
          ${imagesHTML}
        </div>
        ${product.images.length > 1 ? `
          <button onclick="changeSlide(-1)"
                  style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%);
                         background: ${lavandeRgba}; border: none; border-radius: 12px;
                         width: 48px; height: 48px; cursor: pointer;
                         box-shadow: 0 4px 12px rgba(0,0,0,0.1); transition: all 0.3s ease;
                         display: flex; align-items: center; justify-content: center;
                         backdrop-filter: blur(4px); opacity: 0.7;"
                  onmouseover="this.style.background='${lavandeFull}'; this.style.transform='translateY(-50%) translateX(-4px)'; this.style.boxShadow='0 6px 16px rgba(0,0,0,0.2)'; this.style.opacity='1'"
                  onmouseout="this.style.background='${lavandeRgba}'; this.style.transform='translateY(-50%) translateX(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; this.style.opacity='0.7'">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button onclick="changeSlide(1)"
                  style="position: absolute; right: 1rem; top: 50%; transform: translateY(-50%);
                         background: ${lavandeRgba}; border: none; border-radius: 12px;
                         width: 48px; height: 48px; cursor: pointer;
                         box-shadow: 0 4px 12px rgba(0,0,0,0.1); transition: all 0.3s ease;
                         display: flex; align-items: center; justify-content: center;
                         backdrop-filter: blur(4px); opacity: 0.7;"
                  onmouseover="this.style.background='${lavandeFull}'; this.style.transform='translateY(-50%) translateX(4px)'; this.style.boxShadow='0 6px 16px rgba(0,0,0,0.2)'; this.style.opacity='1'"
                  onmouseout="this.style.background='${lavandeRgba}'; this.style.transform='translateY(-50%) translateX(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; this.style.opacity='0.7'">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          <div class="carousel-dots">
            ${dotsHTML}
          </div>
        ` : ''}
      </div>
    `;
  } else {
    // Image unique
    const imageSrc = product.image
      ? (product.image.startsWith('https://') ? product.image : `/images/uploads/${product.image}`)
      : '/images/placeholder.jpg';
    imageHTML = `<img src="${imageSrc}" alt="${product.name}" class="product-detail-image" loading="lazy" decoding="async" onerror="this.src='/images/placeholder.jpg'">`;
  }

  const stockInfo = product.stock <= 0
    ? '<span style="background: var(--rose-poudre); color: white; padding: 0.5rem 1rem; border-radius: 20px; font-size: 1rem; display: inline-block;">Rupture de stock</span>'
    : product.stock <= 3
    ? `<span style="background: var(--pastel-peche); color: var(--texte-principal); padding: 0.5rem 1rem; border-radius: 20px; font-size: 1rem; display: inline-block;">Plus que ${product.stock} en stock</span>`
    : `<span style="color: var(--pastel-vert); font-weight: 600;">✓ En stock (${product.stock} disponibles)</span>`;

  section.innerHTML = `
    <h1 class="section-title">${product.name}</h1>
    <div class="product-detail">
      <div>
        ${imageHTML}

        ${product.boutdebois_link ? `
          <a href="${product.boutdebois_link}" class="btn btn-outline"
             style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; border: none; margin-top: 1rem; display: block; text-align: center;">
            🪵 Voir les créations en bois assorties sur Le p'tit bout de bois →
          </a>
        ` : ''}
      </div>
      <div class="product-detail-info">
        <div class="card">
          <h3 style="color: var(--lavande); font-size: 1.5rem; margin-bottom: 1rem;">
            <span class="decoration-flower">✿</span> Pierres naturelles
          </h3>
          <p style="font-size: 1.1rem; color: var(--texte-secondaire);">${product.stones}</p>
        </div>

        <div class="card">
          <h3 style="color: var(--lavande); font-size: 1.5rem; margin-bottom: 1rem;">
            <span class="decoration-heart">♡</span> Description
          </h3>
          <p style="font-size: 1.1rem; line-height: 1.8; color: var(--texte-principal);">${product.description}</p>
        </div>

        <div class="card">
          <p style="font-size: 2rem; font-weight: bold; color: var(--rose-poudre); margin-bottom: 1rem;">
            ${product.price.toFixed(2)} €
          </p>
          ${stockInfo}
        </div>

        ${product.stock > 0 ? `
          <div class="card">
            <h3 style="color: var(--lavande); font-size: 1.3rem; margin-bottom: 1rem;">Quantité</h3>
            <div class="quantity-selector">
              <button class="quantity-btn" onclick="decreaseQuantity()" id="decrease-btn">−</button>
              <span class="quantity-value" id="quantity-value">1</span>
              <button class="quantity-btn" onclick="increaseQuantity()" id="increase-btn">+</button>
            </div>
          </div>

          <button class="btn btn-primary" onclick="addToCartWithQuantity()" style="font-size: 1.2rem; padding: 1rem 2rem;">
            Ajouter au panier
          </button>
        ` : `
          <button class="btn btn-primary" disabled style="opacity: 0.7; cursor: not-allowed; font-size: 1.2rem; padding: 1rem 2rem;">
            Produit indisponible
          </button>
        `}

        <a href="/catalogue?category=${encodeURIComponent(product.category)}" class="btn btn-outline">
          Voir les autres ${product.category.toLowerCase()}
        </a>
      </div>
    </div>
  `;

  // Mettre à jour le titre de la page
  document.title = `${product.name} - La p'tite perlouze 🌼`;

  // Mettre à jour les boutons de quantité
  updateQuantityButtons();
}

// Variables pour le carrousel
let currentSlideIndex = 0;

// Changer de slide
function changeSlide(direction) {
  if (!currentProduct || !currentProduct.images || currentProduct.images.length <= 1) return;

  const images = document.querySelectorAll('.carousel-image');
  const dots = document.querySelectorAll('.carousel-dot');

  // Retirer la classe active de l'image et du dot actuels
  images[currentSlideIndex].classList.remove('active');
  dots[currentSlideIndex].classList.remove('active');

  // Calculer le nouvel index
  currentSlideIndex = (currentSlideIndex + direction + currentProduct.images.length) % currentProduct.images.length;

  // Ajouter la classe active à la nouvelle image et au nouveau dot
  images[currentSlideIndex].classList.add('active');
  dots[currentSlideIndex].classList.add('active');
}

// Aller directement à une slide spécifique
function goToSlide(index) {
  if (!currentProduct || !currentProduct.images || currentProduct.images.length <= 1) return;

  const images = document.querySelectorAll('.carousel-image');
  const dots = document.querySelectorAll('.carousel-dot');

  // Retirer la classe active de l'image et du dot actuels
  images[currentSlideIndex].classList.remove('active');
  dots[currentSlideIndex].classList.remove('active');

  // Mettre à jour l'index
  currentSlideIndex = index;

  // Ajouter la classe active à la nouvelle image et au nouveau dot
  images[currentSlideIndex].classList.add('active');
  dots[currentSlideIndex].classList.add('active');
}

// Augmenter la quantité
function increaseQuantity() {
  if (quantity < currentProduct.stock) {
    quantity++;
    updateQuantityDisplay();
  }
}

// Diminuer la quantité
function decreaseQuantity() {
  if (quantity > 1) {
    quantity--;
    updateQuantityDisplay();
  }
}

// Mettre à jour l'affichage de la quantité
function updateQuantityDisplay() {
  const quantityElement = document.getElementById('quantity-value');
  if (quantityElement) {
    quantityElement.textContent = quantity;
  }
  updateQuantityButtons();
}

// Mettre à jour l'état des boutons de quantité
function updateQuantityButtons() {
  const decreaseBtn = document.getElementById('decrease-btn');
  const increaseBtn = document.getElementById('increase-btn');

  if (decreaseBtn) {
    decreaseBtn.disabled = quantity <= 1;
  }

  if (increaseBtn && currentProduct) {
    increaseBtn.disabled = quantity >= currentProduct.stock;
  }
}

// Ajouter au panier avec la quantité sélectionnée
function addToCartWithQuantity() {
  if (!currentProduct) return;

  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existingItem = cart.find(item => item.id === currentProduct.id);

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (newQuantity > currentProduct.stock) {
      showMessage('Stock insuffisant', 'error');
      return;
    }
    existingItem.quantity = newQuantity;
  } else {
    cart.push({
      id: currentProduct.id,
      name: currentProduct.name,
      price: currentProduct.price,
      image: currentProduct.image,
      quantity: quantity,
      stock: currentProduct.stock
    });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();

  const message = quantity === 1
    ? `${currentProduct.name} ajouté au panier ✨`
    : `${quantity} × ${currentProduct.name} ajoutés au panier ✨`;

  showMessage(message, 'success');

  // Réinitialiser la quantité
  quantity = 1;
  updateQuantityDisplay();
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
  const section = document.getElementById('product-detail-section');
  
  // Masquer le skeleton loader
  const skeletonLoader = document.getElementById('skeleton-loader');
  if (skeletonLoader) {
    skeletonLoader.style.display = 'none';
  }
  
  section.innerHTML = `
    <div class="card" style="text-align: center; padding: 3rem; margin-top: 2rem;">
      <h2 style="color: var(--rose-poudre); margin-bottom: 1rem;">Produit non trouvé</h2>
      <p style="font-size: 1.2rem; color: var(--texte-secondaire); margin-bottom: 2rem;">
        Désolé, ce bijou n'existe pas ou n'est plus disponible.
      </p>
      <a href="/catalogue" class="btn btn-primary">
        Retour au catalogue
      </a>
    </div>
  `;
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  loadProduct();
});

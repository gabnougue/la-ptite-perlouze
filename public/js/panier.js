// ═══════════════════════════════════════════════════
// 🌸 La p'tite perlouze - Script panier 🌸
// ═══════════════════════════════════════════════════

let stripe;
let elements;
let clientSecret;

// Initialiser Stripe (sera fait lors du checkout)
async function initializeStripe(amount) {
  // Récupérer la clé publique Stripe depuis le serveur
  if (!stripe) {
    try {
      const configResponse = await fetch('/api/config/stripe-public-key');
      const configData = await configResponse.json();

      if (!configData.publicKey) {
        throw new Error('Clé Stripe non configurée');
      }

      stripe = Stripe(configData.publicKey);
    } catch (error) {
      console.error('Erreur lors de la récupération de la configuration Stripe:', error);
      showMessage('Paiement temporairement indisponible', 'error');
      return false;
    }
  }

  try {
    const response = await fetch('/api/orders/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });

    const data = await response.json();
    clientSecret = data.clientSecret;

    // Récupérer les couleurs du thème actif
    const rootStyles = getComputedStyle(document.documentElement);
    const primaryColor = rootStyles.getPropertyValue('--lavande').trim() || '#d4a5d4';
    const secondaryColor = rootStyles.getPropertyValue('--rose-poudre').trim() || '#f4c2c2';
    const textColor = rootStyles.getPropertyValue('--texte-principal').trim() || '#5a4a5a';

    const appearance = {
      theme: 'stripe',
      variables: {
        colorPrimary: primaryColor,
        colorBackground: '#ffffff',
        colorText: textColor,
        colorDanger: secondaryColor,
        colorIcon: primaryColor,
        colorIconTab: primaryColor,
        colorIconTabHover: primaryColor,
        colorIconTabSelected: primaryColor,
        fontFamily: 'Quicksand, sans-serif',
        spacingUnit: '4px',
        borderRadius: '15px',
        focusBoxShadow: `0 0 0 3px ${primaryColor}33`,
        focusOutline: `2px solid ${primaryColor}`
      }
    };

    elements = stripe.elements({ appearance, clientSecret });
    const paymentElement = elements.create('payment', {
      wallets: {
        applePay: 'auto',
        googlePay: 'auto',
        link: 'never'
      },
      fields: {
        billingDetails: {
          email: 'never'
        }
      },
      terms: {
        card: 'never'
      }
    });
    paymentElement.mount('#payment-element');

    return true;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du paiement:', error);
    showMessage('Erreur lors de l\'initialisation du paiement', 'error');
    return false;
  }
}

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

// Charger et afficher le panier
function loadCart() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const cartItemsContainer = document.getElementById('cart-items');
  const emptyCartDiv = document.getElementById('empty-cart');
  const summaryContainer = document.getElementById('cart-summary-container');
  const cartContent = document.getElementById('cart-content');

  if (cart.length === 0) {
    // Masquer complètement le contenu du panier quand il est vide
    if (cartContent) cartContent.style.display = 'none';
    if (cartItemsContainer) cartItemsContainer.style.display = 'none';
    if (summaryContainer) summaryContainer.style.display = 'none';
    if (emptyCartDiv) emptyCartDiv.style.display = 'block';
    return;
  }

  cartContent.style.display = 'grid';
  cartItemsContainer.style.display = 'block';
  summaryContainer.style.display = 'block';
  emptyCartDiv.style.display = 'none';

  cartItemsContainer.innerHTML = '';

  cart.forEach((item, index) => {
    const cartItem = createCartItem(item, index);
    cartItemsContainer.appendChild(cartItem);
  });

  updateCartSummary();
}

// Créer un élément de panier
function createCartItem(item, index) {
  const itemDiv = document.createElement('div');
  itemDiv.className = 'cart-item fade-in';

  const imageSrc = item.image
    ? `/images/uploads/${item.image}`
    : '/images/placeholder.jpg';

  itemDiv.innerHTML = `
    <img src="${imageSrc}" alt="${item.name}" class="cart-item-image" onerror="this.src='/images/placeholder.jpg'">
    <div class="cart-item-info">
      <h3>${item.name}</h3>
      <p style="color: var(--texte-secondaire); margin-bottom: 0.5rem;">${item.price.toFixed(2)} € / pièce</p>
      <div class="cart-item-controls">
        <button class="quantity-btn-small" onclick="decreaseQuantity(${index})">−</button>
        <span style="margin: 0 0.5rem; font-weight: bold;">${item.quantity}</span>
        <button class="quantity-btn-small" onclick="increaseQuantity(${index})">+</button>
      </div>
    </div>
    <div class="cart-item-actions">
      <p style="font-size: 1.3rem; font-weight: bold; color: var(--rose-poudre); margin-bottom: 1rem;">
        ${(item.price * item.quantity).toFixed(2)} €
      </p>
      <button class="remove-btn" onclick="removeItem(${index})">
        Retirer
      </button>
    </div>
  `;

  return itemDiv;
}

// Augmenter la quantité
function increaseQuantity(index) {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  if (cart[index].quantity < cart[index].stock) {
    cart[index].quantity++;
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
    updateCartCount();
  } else {
    showMessage('Stock insuffisant', 'error');
  }
}

// Diminuer la quantité
function decreaseQuantity(index) {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  if (cart[index].quantity > 1) {
    cart[index].quantity--;
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
    updateCartCount();
  }
}

// Variable pour stocker l'index de l'article à retirer
let itemToRemoveIndex = null;

// Retirer un article (ouvre la modal)
function removeItem(index) {
  itemToRemoveIndex = index;
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const item = cart[index];

  // Mettre à jour le texte de la modal avec le nom de l'article
  const modalText = document.getElementById('remove-modal-text');
  modalText.innerHTML = `Êtes-vous sûr de vouloir retirer <strong>"${item.name}"</strong> de votre panier ?`;

  // Afficher la modal
  const modal = document.getElementById('remove-modal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // Empêcher le scroll
}

// Confirmer la suppression
function confirmRemoveItem() {
  if (itemToRemoveIndex !== null) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart.splice(itemToRemoveIndex, 1);
    localStorage.setItem('cart', JSON.stringify(cart));

    // Fermer la modal et recharger la page
    closeRemoveModal();
    window.location.reload();
  }
}

// Fermer la modal
function closeRemoveModal() {
  const modal = document.getElementById('remove-modal');
  modal.style.display = 'none';
  document.body.style.overflow = ''; // Restaurer le scroll
  itemToRemoveIndex = null;
}

// Mettre à jour le résumé du panier
function updateCartSummary() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = 0; // Livraison gratuite
  const total = subtotal + shipping;

  document.getElementById('subtotal').textContent = subtotal.toFixed(2) + ' €';
  document.getElementById('total').textContent = total.toFixed(2) + ' €';
}

// Passer à l'étape de paiement
async function proceedToCheckout() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Afficher le formulaire de checkout
  document.getElementById('cart-items').style.display = 'none';
  document.getElementById('cart-summary-container').style.display = 'none';
  document.getElementById('checkout-section').style.display = 'block';
  document.getElementById('total-payment').textContent = total.toFixed(2) + ' €';

  // Initialiser Stripe
  await initializeStripe(total);
}

// Annuler le checkout
function cancelCheckout() {
  document.getElementById('cart-items').style.display = 'block';
  document.getElementById('cart-summary-container').style.display = 'block';
  document.getElementById('checkout-section').style.display = 'none';
  loadCart();
}

// Traiter le paiement
async function handlePayment(event) {
  event.preventDefault();

  if (!stripe || !elements) {
    return;
  }

  setLoading(true);

  // Récupérer les informations client
  const customerName = document.getElementById('customer-name').value;
  const customerEmail = document.getElementById('customer-email').value;
  const customerPhone = document.getElementById('customer-phone').value;
  const customerAddress = document.getElementById('customer-address').value;

  try {
    // Confirmer le paiement avec Stripe
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/panier',
      },
      redirect: 'if_required'
    });

    if (stripeError) {
      showPaymentMessage(stripeError.message, 'error');
      setLoading(false);
      return;
    }

    // Si le paiement est réussi, créer la commande
    if (paymentIntent.status === 'succeeded') {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const orderData = {
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          address: customerAddress
        },
        items: cart,
        total: total,
        paymentIntentId: paymentIntent.id
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (result.success) {
        // Vider le panier
        localStorage.removeItem('cart');
        updateCartCount();

        // Afficher la confirmation
        showConfirmation(result.orderId);
      } else {
        showPaymentMessage(result.error || 'Erreur lors de la création de la commande', 'error');
        setLoading(false);
      }
    }
  } catch (error) {
    console.error('Erreur lors du paiement:', error);
    showPaymentMessage('Erreur lors du traitement du paiement', 'error');
    setLoading(false);
  }
}

// Afficher la page de confirmation
function showConfirmation(orderId) {
  document.getElementById('checkout-section').style.display = 'none';
  document.getElementById('confirmation-section').style.display = 'block';
  document.getElementById('order-number').textContent = '#' + orderId;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Afficher un message de paiement
function showPaymentMessage(message, type = 'info') {
  const messageElement = document.getElementById('payment-message');
  messageElement.textContent = message;
  messageElement.className = `message message-${type}`;
  messageElement.style.display = 'block';

  setTimeout(() => {
    messageElement.style.display = 'none';
  }, 5000);
}

// Activer/désactiver le chargement
function setLoading(isLoading) {
  const submitButton = document.getElementById('submit-payment');
  if (isLoading) {
    submitButton.disabled = true;
    submitButton.textContent = 'Traitement en cours...';
  } else {
    submitButton.disabled = false;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    submitButton.innerHTML = `Payer <span id="total-payment">${total.toFixed(2)} €</span>`;
  }
}

// Afficher un message général
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

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  loadCart();

  // Écouter la soumission du formulaire
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handlePayment);
  }
});

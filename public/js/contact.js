// ═══════════════════════════════════════════════════
// 🌸 La p'tite perlouze - Script contact 🌸
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

// Gérer l'envoi du formulaire
async function handleContactForm(event) {
  event.preventDefault();

  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const message = document.getElementById('message').value;

  const formMessage = document.getElementById('form-message');
  const submitButton = event.target.querySelector('button[type="submit"]');

  // Désactiver le bouton pendant l'envoi
  submitButton.disabled = true;
  submitButton.textContent = 'Envoi en cours...';

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, message })
    });

    const result = await response.json();

    if (result.success) {
      // Afficher le message de succès
      formMessage.className = 'message message-success';
      formMessage.textContent = 'Votre message a été envoyé avec succès ! Nous vous répondrons très bientôt. ✨';
      formMessage.style.display = 'block';

      // Réinitialiser le formulaire
      document.getElementById('contact-form').reset();

      // Faire défiler vers le message
      formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      throw new Error(result.error || 'Erreur lors de l\'envoi');
    }
  } catch (error) {
    console.error('Erreur:', error);
    formMessage.className = 'message message-error';
    formMessage.textContent = 'Une erreur s\'est produite. Veuillez réessayer ou nous contacter directement par email.';
    formMessage.style.display = 'block';
  } finally {
    // Réactiver le bouton
    submitButton.disabled = false;
    submitButton.textContent = 'Envoyer le message ✨';

    // Masquer le message après 5 secondes
    setTimeout(() => {
      formMessage.style.opacity = '0';
      setTimeout(() => {
        formMessage.style.display = 'none';
        formMessage.style.opacity = '1';
      }, 300);
    }, 5000);
  }
}

// Charger les paramètres du site pour le lien boutdebois
async function loadSiteSettings() {
  try {
    const response = await fetch('/api/settings');
    const settings = await response.json();

    if (settings.boutdebois_url) {
      const boutdeboisLink = document.getElementById('boutdebois-link-contact');
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
  loadSiteSettings();

  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactForm);
  }
});

// ═══════════════════════════════════════════════════
// Gestion du thème du site avec détection automatique de période
// ═══════════════════════════════════════════════════

/**
 * Détermine le thème saisonnier en fonction de la date actuelle
 * @returns {string} Le nom du thème à appliquer
 */
function getSeasonalTheme() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();

  // 🎃 Halloween (15 octobre - 1er novembre)
  if ((month === 10 && day >= 15) || (month === 11 && day === 1)) {
    return 'halloween';
  }

  // 🎄 Noël (1er décembre - 6 janvier)
  if ((month === 12) || (month === 1 && day <= 6)) {
    return 'noel';
  }

  // ❄️ Hiver (7 janvier - 19 mars)
  if ((month === 1 && day >= 7) || month === 2 || (month === 3 && day <= 19)) {
    return 'hiver';
  }

  // 💝 Saint-Valentin (1-21 février) - priorité sur hiver
  if (month === 2 && day >= 1 && day <= 21) {
    return 'valentin';
  }

  // 🌸 Printemps (20 mars - 20 juin)
  if ((month === 3 && day >= 20) || month === 4 || month === 5 || (month === 6 && day <= 20)) {
    return 'printemps';
  }

  // ☀️ Été (21 juin - 22 septembre)
  if ((month === 6 && day >= 21) || month === 7 || month === 8 || (month === 9 && day <= 22)) {
    return 'ete';
  }

  // 🍂 Automne (23 septembre - 14 octobre et 2-30 novembre)
  if ((month === 9 && day >= 23) || (month === 10 && day < 15) || (month === 11 && day >= 2)) {
    return 'automne';
  }

  // Par défaut, printemps
  return 'printemps';
}

// Charger et appliquer le thème au chargement de la page
(async function loadTheme() {
  try {
    const response = await fetch('/api/settings/theme');
    const data = await response.json();

    // Si le thème est défini sur "auto" ou n'existe pas, utiliser le thème saisonnier
    let theme = data.theme;
    if (!theme || theme === 'auto') {
      theme = getSeasonalTheme();
    }

    // Appliquer le thème à l'élément html
    document.documentElement.setAttribute('data-theme', theme);

    console.log(`🎨 Thème appliqué : ${theme}`);
  } catch (error) {
    console.error('Erreur lors du chargement du thème:', error);
    // En cas d'erreur, utiliser le thème saisonnier automatique
    const theme = getSeasonalTheme();
    document.documentElement.setAttribute('data-theme', theme);
    console.log(`🎨 Thème saisonnier automatique : ${theme}`);
  }
})();

// ═══════════════════════════════════════════════════
// Gestion du menu actif
// ═══════════════════════════════════════════════════

// Mettre en évidence le lien de navigation correspondant à la page actuelle
document.addEventListener('DOMContentLoaded', function() {
  // Ne pas exécuter cette fonction sur les pages admin
  if (window.location.pathname.startsWith('/admin')) {
    return;
  }

  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('nav a:not(.cart-icon)');

  navLinks.forEach(link => {
    const linkPath = new URL(link.href).pathname;

    // Vérifier si le lien correspond à la page actuelle
    if (linkPath === currentPath ||
        (currentPath === '/' && linkPath === '/') ||
        (currentPath.startsWith('/produit') && linkPath === '/catalogue') ||
        (currentPath !== '/' && linkPath !== '/' && currentPath.startsWith(linkPath))) {
      link.classList.add('active');
    }
  });
});

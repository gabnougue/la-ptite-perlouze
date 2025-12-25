# 🚀 Guide de démarrage rapide

## Installation en 3 minutes

### 1. Installer les dépendances
```bash
npm install
```

### 2. Initialiser la base de données
```bash
npm run init-db
```

Vous verrez :
```
✨ Tables créées avec succès
👤 Administrateur créé
🌸 Produits d'exemple ajoutés

✅ Base de données initialisée avec succès !
👤 Login admin: admin
🔑 Mot de passe: changeme123
```

### 3. Démarrer le serveur
```bash
npm start
```

Le serveur démarre sur http://localhost:3000

## 🌐 Premiers pas

### Visiter le site
Ouvrez votre navigateur : **http://localhost:3000**

Vous verrez :
- La page d'accueil avec présentation d'Yvonne
- 3 produits phares affichés
- Navigation vers le catalogue

### Tester le catalogue
Cliquez sur "Catalogue" ou "Découvrir la collection"
- 6 produits d'exemple sont disponibles
- Filtrez par catégorie
- Ajoutez des produits au panier

### Accéder à l'administration
Allez sur **http://localhost:3000/admin**

Connectez-vous avec :
- **Identifiant** : `admin`
- **Mot de passe** : `changeme123`

Dans le dashboard admin, vous pouvez :
- Voir les statistiques
- Gérer les produits (ajouter, modifier, supprimer)
- Voir les commandes
- Lire les messages de contact

## ⚙️ Configuration Stripe (Paiement)

### Étape 1 : Créer un compte Stripe
1. Allez sur https://stripe.com
2. Créez un compte (gratuit)
3. Activez le mode Test

### Étape 2 : Récupérer vos clés API
1. Allez dans https://dashboard.stripe.com/test/apikeys
2. Copiez la "Clé publiable" (commence par `pk_test_`)
3. Copiez la "Clé secrète" (commence par `sk_test_`)

### Étape 3 : Configurer les clés

**Dans le fichier `.env`** :
```env
STRIPE_PUBLIC_KEY=pk_test_VOTRE_CLE_PUBLIQUE
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_SECRETE
```

**Dans le fichier `public/js/panier.js`** (ligne 13) :
```javascript
const STRIPE_PUBLIC_KEY = 'pk_test_VOTRE_CLE_PUBLIQUE';
```

### Étape 4 : Redémarrer le serveur
```bash
# Arrêter le serveur (Ctrl+C)
# Redémarrer
npm start
```

### Tester le paiement

Utilisez ces numéros de carte de test Stripe :
- **Carte valide** : `4242 4242 4242 4242`
- **Date d'expiration** : N'importe quelle date future (ex: 12/25)
- **CVC** : N'importe quel 3 chiffres (ex: 123)

## 📧 Configuration Email (Optionnel)

Pour recevoir les messages de contact par email :

### Avec Gmail

1. Activer l'authentification à 2 facteurs sur votre compte Google
2. Générer un "Mot de passe d'application" :
   - Allez sur https://myaccount.google.com/security
   - Cliquez sur "Mots de passe des applications"
   - Créez un nouveau mot de passe

3. Dans `.env` :
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
CONTACT_EMAIL=email@destination.fr
```

## 🎨 Ajouter vos propres bijoux

### Méthode 1 : Via l'interface admin (recommandé)

1. Connectez-vous sur http://localhost:3000/admin
2. Allez dans "Produits"
3. Cliquez sur "Ajouter un produit"
4. Remplissez le formulaire :
   - Nom du bijou
   - Catégorie
   - Pierres utilisées
   - Description poétique
   - Prix
   - Stock
   - Image (JPG, PNG, max 5 Mo)

### Méthode 2 : Ajouter manuellement des images

Placez vos images dans : `public/images/uploads/`

Format recommandé :
- **Taille** : 800x800 pixels environ
- **Format** : JPG ou PNG
- **Poids** : moins de 500 Ko

## ✅ Checklist avant mise en ligne

Avant de déployer sur Internet :

- [ ] Changer le mot de passe admin (`ADMIN_PASSWORD` dans `.env`)
- [ ] Changer le `SESSION_SECRET` dans `.env`
- [ ] Passer Stripe en mode Production
- [ ] Configurer un vrai nom de domaine
- [ ] Activer HTTPS
- [ ] Supprimer les produits d'exemple
- [ ] Ajouter vos vrais produits
- [ ] Tester tous les paiements en mode test
- [ ] Configurer les emails si souhaité

## 🆘 Problèmes courants

### Le serveur ne démarre pas
```bash
# Vérifier que Node.js est installé
node --version

# Réinstaller les dépendances
rm -rf node_modules
npm install
```

### Les images ne s'affichent pas
- Vérifiez que le dossier `public/images/uploads/` existe
- Vérifiez les permissions du dossier

### Le paiement ne fonctionne pas
- Vérifiez que vous avez configuré les clés Stripe
- Utilisez les numéros de carte de test
- Vérifiez la console du navigateur pour les erreurs

### Erreur de base de données
```bash
# Supprimer et recréer la base
rm database.db
npm run init-db
```

## 📞 Besoin d'aide ?

Consultez le fichier `README.md` pour plus de détails.

---

🌸 Bon démarrage avec La p'tite perlouze ! 🌸

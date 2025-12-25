# 🌸 La p'tite perlouze 🌸

Boutique en ligne de bijoux fantaisie artisanaux par Yvonne Lecocq

## 📋 Description

Site e-commerce complet avec :
- Design bohème, féminin et fantaisiste (style dessin animé doux)
- Catalogue de produits avec filtres par catégorie
- Panier d'achat fonctionnel
- Paiement sécurisé via Stripe
- Espace administrateur pour gérer les produits, commandes et messages
- Formulaire de contact
- Design responsive (mobile, tablette, desktop)

## 🛠️ Technologies utilisées

- **Frontend** : HTML5, CSS3, JavaScript vanilla
- **Backend** : Node.js + Express
- **Base de données** : SQLite
- **Paiement** : Stripe
- **Email** : Nodemailer

## 📦 Installation

### Prérequis

- Node.js (version 14 ou supérieure)
- npm

### Étapes d'installation

1. **Cloner ou télécharger le projet**

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**

Créer un fichier `.env` à la racine du projet :
```bash
cp .env.example .env
```

Modifier le fichier `.env` avec vos informations :
```env
PORT=3000
SESSION_SECRET=votre_secret_session_tres_securise

# Configuration Stripe (à obtenir sur stripe.com)
STRIPE_PUBLIC_KEY=pk_test_votre_cle_publique
STRIPE_SECRET_KEY=sk_test_votre_cle_secrete

# Configuration Email (optionnel)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre_email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
CONTACT_EMAIL=yvonne@laptiteperlouze.fr

# Administrateur par défaut
ADMIN_USERNAME=admin
ADMIN_PASSWORD=***MOT_DE_PASSE_RETIRE***
```

4. **Initialiser la base de données**
```bash
npm run init-db
```

Cette commande va :
- Créer la base de données SQLite
- Créer les tables nécessaires
- Ajouter un administrateur par défaut
- Ajouter 6 produits d'exemple

5. **Démarrer le serveur**
```bash
npm start
```

Pour le développement avec rechargement automatique :
```bash
npm run dev
```

## 🌐 Accès au site

- **Site public** : http://localhost:3000
- **Espace admin** : http://localhost:3000/admin
  - Identifiant par défaut : `admin`
  - Mot de passe par défaut : `***MOT_DE_PASSE_RETIRE***`

## 📁 Structure du projet

```
la-ptite-perlouze/
├── public/                    # Fichiers statiques (frontend)
│   ├── css/
│   │   └── style.css         # Design bohème et fantaisiste
│   ├── js/
│   │   ├── home.js           # Page d'accueil
│   │   ├── catalogue.js      # Page catalogue
│   │   ├── produit.js        # Page produit détaillée
│   │   ├── panier.js         # Panier et paiement
│   │   ├── contact.js        # Formulaire de contact
│   │   └── admin.js          # Dashboard admin
│   ├── images/
│   │   └── uploads/          # Images des produits
│   ├── admin/
│   │   ├── login.html        # Connexion admin
│   │   └── dashboard.html    # Dashboard admin
│   ├── index.html            # Page d'accueil
│   ├── catalogue.html        # Catalogue
│   ├── produit.html          # Fiche produit
│   ├── panier.html           # Panier
│   └── contact.html          # Contact
├── server/                    # Backend
│   ├── routes/               # Routes API
│   │   ├── products.js       # API produits
│   │   ├── orders.js         # API commandes
│   │   ├── admin.js          # API admin
│   │   └── contact.js        # API contact
│   └── models/
│       ├── database.js       # Connexion DB
│       └── initDatabase.js   # Initialisation DB
├── server.js                  # Serveur principal
├── package.json
├── .env.example              # Exemple de configuration
└── README.md                 # Ce fichier
```

## 🎨 Charte visuelle

- **Style** : Bohème, féminin, fantaisiste, cartoon doux
- **Couleurs principales** :
  - Rose poudré (#f4c2c2)
  - Lavande (#d4a5d4)
  - Blanc cassé (#faf8f5)
  - Doré clair (#f5d5a8)
  - Pastels doux
- **Typographies** :
  - Titres : Pacifico (cursive fantaisiste)
  - Manuscrite : Satisfy
  - Texte : Quicksand (sans-serif douce)
- **Éléments** : Fleurs, cœurs, formes arrondies, icônes peace & love

## ⚙️ Fonctionnalités

### Frontend (Visiteur)

- ✅ Page d'accueil avec présentation d'Yvonne Lecocq
- ✅ Catalogue de produits avec filtres par catégorie
- ✅ Fiches produits détaillées
- ✅ Panier d'achat avec gestion des quantités
- ✅ Paiement sécurisé Stripe
- ✅ Formulaire de contact
- ✅ Design responsive

### Backend (Administrateur)

- ✅ Authentification sécurisée
- ✅ Dashboard avec statistiques
- ✅ Gestion des produits (ajout, modification, suppression)
- ✅ Upload d'images
- ✅ Gestion des commandes et statuts
- ✅ Consultation des messages de contact
- ✅ Gestion des stocks

## 🔐 Sécurité

- Mots de passe hashés avec bcrypt
- Sessions sécurisées
- Protection CSRF
- Validation des données côté serveur
- Upload d'images sécurisé

## 📝 Configuration Stripe

1. Créer un compte sur [stripe.com](https://stripe.com)
2. Récupérer vos clés API (mode test pour commencer)
3. Ajouter les clés dans le fichier `.env`
4. Modifier également la clé publique dans `public/js/panier.js` ligne 13

**Important** : Le fichier `panier.js` contient une clé publique Stripe factice. Remplacez-la par votre vraie clé publique Stripe.

## 📧 Configuration Email

Pour recevoir les notifications de contact par email :

1. Utiliser un compte Gmail avec l'authentification à 2 facteurs
2. Générer un "mot de passe d'application"
3. Ajouter les informations dans `.env`

## 🚀 Déploiement

Pour déployer en production :

1. Utiliser un service comme Heroku, DigitalOcean, ou Railway
2. Configurer les variables d'environnement
3. Utiliser les vraies clés Stripe (mode production)
4. Changer le mot de passe administrateur
5. Configurer un nom de domaine

## 📸 Ajout d'images produits

Les images doivent être placées dans `public/images/uploads/`

Format recommandé :
- Format : JPG, PNG, WebP
- Taille : environ 800x800 pixels
- Poids : moins de 500 Ko

## 🛡️ Sécurité en production

Avant de mettre en production :

1. ⚠️ Changer le mot de passe admin par défaut
2. ⚠️ Utiliser un `SESSION_SECRET` fort et unique
3. ⚠️ Passer Stripe en mode production
4. ⚠️ Activer HTTPS
5. ⚠️ Configurer des sauvegardes régulières de la base de données

## 📞 Support

Pour toute question ou problème :
- Vérifier les logs du serveur
- Consulter la documentation Stripe
- Vérifier la configuration des variables d'environnement

## 🌟 Améliorations futures possibles

- [ ] Système de favoris
- [ ] Avis clients
- [ ] Newsletter
- [ ] Codes promo
- [ ] Suivi de colis
- [ ] Multi-langues
- [ ] Export des commandes en CSV
- [ ] Statistiques avancées

## 📄 Licence

© 2025 La p'tite perlouze - Tous droits réservés

---

Créé avec 💜 pour Yvonne Lecocq

# 🌸 La p'tite perlouze

**Boutique en ligne de bijoux fantaisie artisanaux** par Yvonne Lecocq

## 📋 Description

Site e-commerce complet pour la vente de bijoux artisanaux avec bracelets, colliers et autres créations en pierres naturelles.

## 🛠️ Technologies utilisées

### Backend
- **Node.js** + **Express.js** - Serveur web et API REST
- **Turso (libSQL)** - Base de données SQLite distribuée pour la production
- **SQLite3** - Base de données locale pour le développement
- **Stripe** - Paiement en ligne sécurisé
- **Resend / Nodemailer** - Envoi d'emails transactionnels
- **Multer + Sharp** - Upload et optimisation des images
- **Vercel Blob** - Stockage d'images en cloud
- **Helmet** - Sécurité HTTP headers
- **Express Rate Limit** - Protection contre les attaques DDoS
- **bcrypt** - Hashage des mots de passe

### Frontend
- **HTML5** - Structure des pages
- **CSS3 Vanilla** - Styles avec variables CSS et thèmes saisonniers
- **JavaScript Vanilla** - Logique côté client, sans framework

### Hébergement
- **Vercel** - Déploiement et hébergement

## 🚀 Installation

```bash
# Cloner le repo
git clone https://github.com/gabnougue/la-ptite-perlouze.git
cd la-ptite-perlouze

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés API

# Initialiser la base de données
npm run init-db

# Lancer en développement
npm run dev
```

## 📁 Structure du projet

```
la-ptite-perlouze/
├── public/              # Fichiers statiques
│   ├── admin/           # Interface d'administration
│   ├── css/             # Styles CSS
│   ├── js/              # Scripts JavaScript
│   └── images/          # Images du site
├── server/              # Code backend
│   ├── routes/          # Routes API Express
│   └── models/          # Modèles et migrations DB
├── server.js            # Point d'entrée
└── package.json
```

## ✨ Fonctionnalités

- 🛒 Catalogue produits avec filtres (pierres, couleurs, catégories)
- 🛍️ Panier d'achat persistant
- 💳 Paiement sécurisé via Stripe
- 📧 Système de messagerie client/admin
- 🎨 Thèmes saisonniers automatiques (printemps, été, automne, hiver, Halloween, Noël)
- 📱 Design responsive mobile-first
- 👔 Panel d'administration complet

## 🔗 Lien avec Le P'tit Bout de Bois

Ce site est lié à [Le P'tit Bout de Bois](https://github.com/gabnougue/le-ptit-bout-de-bois), la boutique de créations en bois de Jean-Michel Nougué-Lecocq. Certains produits peuvent avoir des liens croisés entre les deux boutiques.

---

*Fait avec ❤️ en France*

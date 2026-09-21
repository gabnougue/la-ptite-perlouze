# La p'tite perlouze

Boutique en ligne réalisée pour une créatrice de bijoux fantaisie artisanaux en
pierres naturelles. Le besoin : vendre ses créations en direct, gérer seule son
catalogue et ses commandes, sans dépendre d'une plateforme tierce.

![Page d'accueil de la boutique](docs/screenshot.png)

**Site en ligne :** <https://www.laptiteperlouze.fr/>

## Stack technique

- **Node.js** + **Express** (serveur et API REST)
- **Turso / libSQL** en production, **SQLite** en développement
- **HTML, CSS et JavaScript natifs** côté client, sans framework
- **Stripe** pour le paiement, **Resend** pour les emails transactionnels
- **Vercel Blob** + **Sharp** pour le stockage et l'optimisation des images
- **Helmet**, **express-rate-limit**, **bcrypt** et sessions par cookie pour la sécurité
- Déploiement **Vercel**

## Fonctionnalités

- Catalogue filtrable par catégorie, sous-catégorie et fourchette de prix, avec
  fiches produit détaillées et page dédiée aux pierres naturelles.
- Panier et tunnel de commande avec paiement en ligne via Stripe et calcul
  automatique des frais de livraison.
- Back-office protégé par authentification : gestion des produits, des images,
  des commandes, des messages de contact et des paramètres de la boutique.
- Emails automatiques de confirmation de commande et de prise de contact.
- Thèmes saisonniers et mode maintenance activables sans redéploiement de code.

## Déploiement

Hébergement sur **Vercel** (fonction serverless Node.js configurée dans
`vercel.json`), déploiement continu depuis la branche `main`. La base de données
est hébergée sur **Turso** et les images sur **Vercel Blob**. Toutes les clés et
identifiants proviennent des variables d'environnement Vercel (voir `.env.example`).

## Organisation du code

Un serveur Express unique (`server.js`) sert les pages statiques et expose une
API REST. Le code serveur est découpé par responsabilité :

- `server/routes/` — un module par domaine : produits, catalogue, commandes,
  messages, paramètres de la boutique, frais de port, administration.
- `server/models/` — accès aux données via un wrapper unique, qui cible libSQL
  (Turso) en production et SQLite en développement, avec les scripts de
  migration du schéma.
- `server/services/` — envoi des emails transactionnels et calcul des frais
  de livraison.
- `public/` — pages HTML, CSS et JavaScript natifs, sans framework ni étape de
  build ; un fichier JS par page.

Le back-office est une interface d'administration servie par le même serveur,
derrière authentification, permettant de gérer le catalogue, les images, les
commandes, les messages et les paramètres d'affichage de la boutique.

## Sécurité

- **Authentification** : mots de passe administrateur hachés avec bcrypt, jamais
  stockés ni journalisés en clair. Le changement de mot de passe se fait depuis
  le back-office et exige le mot de passe courant.
- **Sessions** : cookie signé, `httpOnly`, `sameSite: strict`, transmis
  uniquement en HTTPS en production, avec expiration. La clé de signature est
  obligatoire : le serveur refuse de démarrer sans elle en production, et la
  rotation de clé est prise en charge.
- **Accès au back-office** : chaque route d'administration passe par un
  middleware qui rejette toute requête sans session valide.
- **Limitation de débit** : un plafond global par adresse IP, et un plafond plus
  strict sur la route de connexion pour contenir les tentatives répétées.
- **En-têtes HTTP** : Helmet applique les en-têtes de sécurité standards.
- **Base de données** : toutes les requêtes SQL sont paramétrées, sans
  concaténation de valeurs utilisateur.
- **Envois de fichiers** : extension et type MIME contrôlés, taille plafonnée,
  images retraitées par Sharp avant stockage.
- **Secrets** : clés d'API, identifiants de base et clé de session vivent
  exclusivement dans les variables d'environnement de l'hébergeur. Aucun secret
  n'est présent dans le dépôt.

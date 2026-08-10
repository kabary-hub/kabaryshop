# 📘 JOURNAL & DOCUMENTATION COMPLÈTE DU SITE — KABARY SHOP

> **Document de présentation — fonctionnalité par fonctionnalité.**
> Ce fichier répertorie TOUT ce que fait le site : pages, composants, espace admin, notifications, sécurité, paramètres modifiables, données et services externes.
> Vous pouvez copier-coller chaque section directement dans votre document de présentation.

---

## 1. 🏠 VUE D'ENSEMBLE

**Kabary Shop** est une boutique e-commerce complète (site vitrine + administration) construite en **React 19** avec **Vite**. Le site est en français, pensé pour le marché guinéen (devise par défaut : **Franc Guinéen GNF**), avec un nom, une description, un slogan, les coordonnées et les réseaux sociaux **entièrement modifiables depuis l'administration**.

### Stack technique
| Technologie | Usage |
|---|---|
| **React 19** | Framework front-end (composants, hooks, contextes) |
| **Vite (rolldown-vite)** | Build / serveur de développement ultra-rapide |
| **React Router 7** | Navigation (pages publiques + espace admin protégé) |
| **Tailwind CSS 4** | Styles, responsive, mode sombre (`darkMode: 'class'`) |
| **AOS (Animate On Scroll)** | Animations d'apparition au défilement |
| **react-slick / slick-carousel** | Carrousels (héros, témoignages) |
| **lucide-react / react-icons** | Icônes |
| **@emailjs/browser** | Envoi d'emails (commandes, newsletters, alertes, codes 2FA) |
| **LocalStorage** | Base de données du site (produits, commandes, avis, abonnés, paramètres…) |
| **ImgBB API** | Hébergement des images uploadées par l'admin |

### Design
- **Couleurs** : `primary: #fea928` (orange) et `secondary: #ed8900` (orange foncé)
- **Mode sombre / clair** avec bascule animée (bouton coulissant), préférence système respectée, choix mémorisé dans `localStorage` et appliqué **avant** le premier rendu (pas de flash).
- **Responsive** : mobile, tablette, desktop (menu hamburger, grilles adaptatives).

---

## 2. 🧭 STRUCTURE DU PROJET

```
src/
├── App.jsx                    → Routage principal + fournisseurs de contexte
├── main.jsx                   → Point d'entrée React
├── Pages/                     → Pages publiques (11 pages)
├── components/                → Composants réutilisables (12 dossiers)
├── admin/                     → Espace d'administration (12 pages)
├── context/                   → Contexte React : Cart, Category, Settings, User
├── services/                  → Service produits (catalogue)
├── utils/                     → Utilitaires : currency, reviews, subscribers, notifications
└── assets/                    → Images produits par catégorie + images de fond
```

### Routes du site

| Route | Page |
|---|---|
| `/` | Accueil (Maison) |
| `/femmes`, `/hommes`, `/enfants`, `/electroniques`, `/meubles` | Pages catégories principales |
| `/tendances` | Nouvelles tendances |
| `/ventes` | Grandes ventes & promotions |
| `/notes` | Avis clients (notes & témoignages) |
| `/contacts` | Page contact |
| `/recherche?q=…` | Résultats de recherche globale |
| `/produit/:id` | Fiche détail produit |
| `/:categorySlug` | Route dynamique pour toutes les catégories (y compris créées par l'admin) |
| `/admin/login` | Connexion administrateur |
| `/admin` (+ 8 sous-routes) | Espace admin protégé |

---

## 3. 🛍️ FONCTIONNALITÉS PUBLIQUES (CÔTÉ CLIENT)

### 3.1 Barre de navigation (Navbar)
- **Logo + nom du site** (modifiable dans Paramètres).
- **Barre de recherche intelligente** :
  - Placeholder adapté à la page active (« Rechercher dans la mode Femmes… », etc.).
  - **Suggestions en direct** (jusqu'à 6 produits) avec image, catégorie et prix converti.
  - Compteur de résultats (« Voir tous les résultats (n) »).
  - Sur une page produits : filtre en direct + défilement vers la section ; ailleurs : redirection vers `/recherche`.
- **Panier** : bouton avec **badge du nombre d'articles**, ouvre le panier latéral.
- **Bascule mode sombre/clair** animée.
- **Menu catégories dynamique** : les catégories actives gérées dans l'admin s'affichent automatiquement (événement `categoriesUpdated`).
- **Menu déroulant « Produits tendances »** : Tendances, Ventes, Notes, Contacts.
- **Lien « Admin »** visible (bleu) → espace d'administration.
- **Menu mobile hamburger** avec tous les liens.

### 3.2 Page d'accueil
Enchaîne les sections dans l'ordre :
1. **Héros carrousel** (10 slides) : promotions avec image, titre et description, défilement automatique toutes les 4 s, boucle infinie, bouton « Commander maintenant ».
2. **Nouveaux arrivages** : grille des 10 produits les plus récents (tri par date réelle), cartes avec image, partage, note moyenne des avis, prix converti, bouton « 🛒 Ajouter », effet zoom au survol, bouton « Voir Plus » → `/ventes`.
3. **Nos meilleures ventes** : top 4 produits **calculés à partir des vraies commandes** (quantité vendue + revenus), avec badge « N vendus », bouton « Acheter ».
4. **Soldes d'hiver** : bannière promotionnelle avec arguments (qualité, livraison rapide, paiement facile, offres).
5. **Newsletter** : champ email + bouton « S'abonner » (voir section Newsletter).
6. **Témoignages** : carrousel de 12 avis clients avec photos (autoplay, responsive 4 → 1 colonne).

### 3.3 Pages catégories (Femmes, Hommes, Enfants, Électroniques, Meubles, Tendances, Ventes)
- Grande **bannière avec titre + sous-titre + image de fond** (composant réutilisable).
- Grille de produits filtrés par catégorie.
- Filtre en direct par la recherche.
- Les produits personnalisés ajoutés par l'admin apparaissent automatiquement.
- Les pages Tendances & Ventes existent en dur ; toute autre catégorie créée dans l'admin est servie par la **route dynamique** `/:categorySlug` (avec nom de catégorie lu dans les paramètres, couleurs, notes, description, bouton Ajouter).

### 3.4 Fiche produit (`/produit/:id`)
- **Fil d'Ariane** (Accueil > Catégorie > Produit) et bouton retour.
- **Galerie d'images** :
  - Image principale + photos du produit (jusqu'à 6) + autres modèles de la même catégorie (mention « Les autres photos montrent d'autres modèles »).
  - Flèches précédent/suivant, compteur « 1 / n », miniatures cliquables.
  - **Lightbox plein écran** : zoom au clic, navigation ← →, fermeture Échap, focus accessibilité, blocage du scroll.
- **Badge catégorie** coloré avec icône (👩 Femmes, 👨 Hommes, 🧒 Enfants, 📱 Électroniques, 🛋️ Meubles, 🔥 Tendances, 💥 Promotions).
- **Bouton partager** (voir 3.6).
- **Note réelle** : moyenne calculée à partir des avis clients validés (étoiles + nombre d'avis, lien vers la section avis).
- **Prix** converti selon la devise du site, mention « TTC ».
- **Couleur** avec pastille colorée.
- **Caractéristiques** : Haute qualité, Livraison rapide, Paiement sécurisé, Retour si non satisfait.
- **Stock** : « En stock – Livraison sous 24h/48h dans tout Conakry » (info modifiable dans Paramètres).
- **Sélecteur de quantité** (+ / −).
- **Boutons** : « Ajouter au panier » + « Commander maintenant » (ouvre le formulaire de commande).
- **Avis clients** (voir 3.5).
- **Produits similaires** : 8 produits de la même catégorie avec note et prix.
- **État « Produit introuvable »** élégant avec lien retour à l'accueil.
- Notification verte « ✅ ajouté au panier ! » en bas à droite.

### 3.5 Avis clients (page Notes + bloc avis produit)
**Bloc avis sur chaque fiche produit :**
- Résumé : note moyenne sur 10 (ex. 4.5/5), étoiles, « Basé sur n avis ».
- **Répartition par étoiles** (5★ → 1★) avec barres de progression animées.
- **Formulaire** : nom, note interactive (étoiles cliquables avec survol), commentaire.
  - Validation (nom requis, note requise, commentaire ≥ 3 caractères).
  - L'avis est soumis **en attente de validation admin** puis publié après approbation.
- Liste des avis : avatar coloré (initiale), nom, badge « Avis validé » ou « Acheteur vérifié », date, étoiles, commentaire, **réponse du vendeur** (avec date) quand l'admin a répondu.

**Page Notes (`/notes`) :**
- Bannière « Vos Avis ICI ».
- **Note globale du site** : moyenne combinée des avis boutique + avis produits, avec demi-étoiles et répartition 5★→1★.
- Formulaire « Laissez votre note » (avis général sur la boutique, modéré par l'admin).
- **Avis de nos clients** : avis validés mélangés, avec lien « À propos de : [produit] » vers la fiche produit.
- **Produits les mieux notés** : grille des 6 produits au meilleur score (moyenne + nombre d'avis), cliquables.
- Tout se met à jour **en temps réel** quand l'admin valide/supprime un avis (événements `reviewsUpdated` / `storage`).

### 3.6 Bouton partager (ShareButton)
Menu contextuel avec :
- **Partager natif** (si supporté par le navigateur/mobile),
- **Copier le lien** (presse-papiers, avec confirmation « Lien copié ! »),
- **WhatsApp, Facebook, X (Twitter), Email** (fenêtre de partage dédiée),
- Fermeture au clic extérieur et à la touche Échap.

### 3.7 Panier (CartContext + panneau latéral)
- **Glouton** : persistance dans `localStorage` (clé `cart`), survit au rechargement.
- **Panneau latéral** coulissant avec animation, liste des articles (image, nom, couleur, prix, quantité +/−, suppression), total.
- Badge compteur dans la navbar.
- **Ajout automatique** depuis les grilles, la fiche produit (avec quantité) et les cartes.
- « Passer la commande » → ouvre le formulaire de commande avec tout le panier.
- « Vider le panier », message « livraison gratuite à partir de 200 000 GNF », prix convertis selon la devise.

### 3.8 Commande (Popup)
- **2 modes** : commande directe d'un produit ou commande de tout le panier.
- Récapitulatif (articles, quantités, total) avant validation.
- **Formulaire** : nom complet *, email, quartier de livraison *, téléphone * (chiffres uniquement).
- À la validation :
  1. La commande est **enregistrée** (`localStorage` clé `shop_orders`) avec **ID numérique unique** et **référence lisible unique** (format `CMD-AAMMJJ-NNNN`, numéro séquentiel par jour) ;
  2. Chaque article conserve son **ID produit** ;
  3. **Email récapitulatif** envoyé au client via EmailJS avec : référence commande, liste des articles avec leurs ID produits, quantités, prix, total, date, devise ;
  4. **Notification de l'admin** déclenchée (voir section Notifications) ;
  5. Confirmation à l'écran avec les détails et la référence ; panier vidé.

### 3.9 Newsletter & abonnés
- **Formulaire d'abonnement** (section accueil) : l'email est enregistré (dédupliqué, clé `site_subscribers`) + email de confirmation envoyé via EmailJS (template « Abonnement »).
- **Bannière « Nouveautés du site ! »** : affichée aux visiteurs abonnés (sur ce navigateur) quand l'admin publie un nouveau produit — boutons « Voir les nouveautés » et « Plus tard », ne se réaffiche qu'à la prochaine publication.
- **Email automatique aux abonnés** à chaque nouveau produit publié (template « Nouveaux arrivages », activable/customisable dans Paramètres).
- Liste des abonnés consultable et gérable dans l'admin (copier les emails, supprimer).

### 3.10 Recherche globale
- Page `/recherche?q=…` : compte les résultats, affiche la grille, gère le terme vide, deep-link (le terme dans l'URL est synchronisé dans la barre de recherche).
- Filtre sur titre, description, couleur **et** catégorie.

### 3.11 Page Contact
- Bannière (titre + sous-titre **modifiables dans Paramètres**).
- Coordonnées : **téléphone, email, adresse, WhatsApp** (lien direct `wa.me`) — toutes **modifiables dans Paramètres**.
- Note WhatsApp (« Disponible sur WhatsApp 24h/7j ») modifiable.
- **Carte de remerciement** : titre + message entièrement modifiables, avec description du site et infos de livraison ajoutées automatiquement.

### 3.12 Pied de page (Footer)
- Logo + nom du site, description.
- Liens importants (2 colonnes).
- **Réseaux sociaux** : Instagram, WhatsApp, LinkedIn, Facebook, Telegram (affichés seulement si renseignés dans Paramètres).
- Coordonnées dynamiques (siteName, téléphone, email).
- Copyright : « © 2026 {Nom du site}. Tous droits réservés. »

---

## 4. 🔐 ESPACE ADMINISTRATION

### 4.1 Connexion (`/admin/login`)
- Écran moderne (dégradé sombre), email + mot de passe avec **affichage/masquage**.
- **Email admin modifiable** dans Paramètres (l'email affiché dans le placeholder est celui des paramètres).
- Mot de passe par défaut : `admin123` (modifiable dans Paramètres → Sécurité).
- **Authentification à deux facteurs (2FA)** optionnelle (voir section Sécurité).
- Écran « Vérification en deux étapes » : saisie du code à 6 chiffres (champ formaté, chiffres uniquement), **renvoi du code** avec compte à rebours 30 s, retour à l'écran précédent.

### 4.2 Protection des routes (ProtectedRoute)
- L'accès à `/admin` et toutes ses sous-routes exige la session admin.
- **Si la 2FA est activée, la vérification est obligatoire** : sans code validé dans la session, l'utilisateur est redirigé vers la connexion.

### 4.3 Interface admin (AdminLayout)
- **Sidebar** (fixe sur desktop, tiroir sur mobile) avec 10 entrées : Tableau de bord, Produits, Avis clients, Abonnés, Commandes, Utilisateurs, Catégories, Analytiques, **Historiques**, Paramètres.
- Bouton **Déconnexion**.
- **Cloche de notifications 🔔** avec badge de non-lues (dans la sidebar et la barre mobile) : panneau des alertes, « Tout marquer lu », clic sur une alerte → navigation vers l'endroit concerné, fermeture au clic extérieur.

### 4.4 Tableau de bord (Dashboard) — **données réelles**
Toutes les statistiques sont **calculées depuis les vraies données du site** (pas de valeurs codées) :
- **4 cartes cliquables** : Produits (catalogue réel), Commandes (total réel), Utilisateurs (enregistrés), Revenus (somme réelle des commandes) → mènent chacune à la page admin correspondante.
- **5 dernières commandes** (cliquables) : référence, client, date, montant, badge de statut → ouvrent la fiche détaillée de la commande.
- **Produits les plus vendus** (calculés depuis les commandes) : image, nom, quantité vendue, revenus → ouvrent la fiche publique du produit (ou la recherche admin si le produit a été supprimé).
- **Liens « Voir tout »** vers Commandes / Produits.
- Se rafraîchit en direct quand les données changent (événements `ordersUpdated`, `productsUpdated`, etc.).

### 4.5 Produits (admin)
- **Liste complète** : produits par défaut + produits personnalisés, **triés par date** (récents d'abord), recherche par nom, colonne images (compteur), note moyenne réelle, tri récent/ancien.
- **Ajout / modification** (modale complète) :
  - Nom, prix (GNF ou texte), catégorie (liste active), couleur, note.
  - **Images : upload via ImgBB** (API) ou URL, **jusqu'à 6 images** (1 principale + 5), galerie ordonnée (déplacer, supprimer), déduplication.
- **Suppression** (avec confirmation).
- **Publication** : à chaque nouveau produit → enregistrement dans « publications récentes » (bannière Nouveautés) + **email automatique aux abonnés**.
- Gestion des catégories actives pour le formulaire.

### 4.6 Commandes (admin)
- **Tableau complet** : référence, client, date/heure, montant, statut, expéditeur, actions.
- **Statistiques** : total, en attente, complétées, expédiées.
- **Recherche** par client / ID / référence.
- **Filtres** : période (toutes / cette semaine / ce mois), expéditeur (tous / non expédiées / par livreur).
- **Tris** : date, expéditeur, statut, montant (asc/desc).
- **Actions par commande** :
  - **Détails** (modale) : infos client (nom, email, téléphone, adresse), date, mode de paiement, infos d'expédition, **liste des produits avec leur ID**, quantités, prix, total.
  - **Expédition** : choix du responsable parmi les utilisateurs (livreur/admin) → statut « Expédiée » + journal d'action.
  - **Marquer complétée**, **Rejeter** (suppression avec confirmation).
- **Journal d'actions** (`order_logs`) : chaque action est tracée (qui, quand, quoi).
- **Changer d'utilisateur actif** (modale avec liste des utilisateurs) — l'utilisateur connecté est enregistré (`current_admin_user`).

### 4.7 Utilisateurs (admin)
- Gestion complète (CRUD) : nom, email, téléphone, **rôle** (Administrateur / Livreur / Préparateur), **statut** (Actif / Bloqué), date d'enregistrement.
- Validation stricte du formulaire (email valide, mot de passe ≥ 6 caractères, confirmation).
- Recherche + filtre par rôle.
- **Bloquer / débloquer**, supprimer, modifier.
- **« Sélectionner comme utilisateur actif »** : synchronisé partout (Orders, Journal).
- Statistiques : total, actifs, administrateurs, livreurs.

### 4.8 Avis clients (admin)
- **Modération** : onglets « En attente / Validés / Tous » avec compteurs.
- Valider / supprimer un avis (produit ou général du site).
- **Répondre au client** (réponse du vendeur) : ajout, modification, suppression.
- Badge « Avis site » pour les avis généraux, image + titre du produit pour les avis produits (avec gestion « Produit supprimé »).
- Rappel si l'avis est en attente (la réponse sera visible après validation).

### 4.9 Abonnés newsletter (admin)
- Liste des abonnés avec date d'abonnement, recherche, **« Copier les emails »** (presse-papiers), suppression.
- **Rappel de configuration EmailJS** : état du template « Nouveaux arrivages » (configuré ou non) avec instructions.

### 4.10 Catégories (admin)
- Liste en cartes : nom, slug, **nombre de produits réel** (compteurs recalculés automatiquement), statut.
- Ajouter / modifier (slug auto-généré depuis le nom), supprimer, **activer/désactiver** (les catégories inactives disparaissent du menu public).

### 4.11 Analytiques (admin) — **données réelles**
- Sélecteur de période : **Aujourd'hui / Cette semaine / Ce mois / Cette année**.
- **3 cartes** : Revenus totaux (avec variation % vs période précédente et tendance ↑↓), Commandes (idem), Utilisateurs.
- **Graphiques en barres** : Revenus et Commandes par heure (jour) / jour (semaine) / jour (mois) / mois (année).
- **Top 10 des produits les plus vendus** (rang, ventes, revenus).
- **Exports** : CSV (téléchargement), JSON, Impression (window.print()).
- Tout est calculé depuis les commandes réelles stockées.

### 4.12 Historiques (admin) — **journal complet du site**

Nouveau module `src/utils/history.js` + page `src/admin/History.jsx` (route `/admin/history`, entrée « Historiques » dans le menu) :
- **Journal central** (`localStorage` clé `site_history`, max 2000 entrées) : toutes les actions du site y sont enregistrées automatiquement avec date, type, action, sujet, détails et **acteur** (nom + rôle).
- **Types d'événements journalisés** :
  - 👁️ **Pages** : chaque page visitée (accueil, catégories, produit, admin…) avec l'acteur (Visiteur ou admin connecté) ;
  - 🔐 **Connexions** : connexion réussie, échec de connexion, 2FA validée, déconnexion, changement d'utilisateur actif ;
  - 👥 **Utilisateurs & rôles** : création, modification, suppression, blocage/déblocage, **changement de rôle** (avec l'ancien et le nouveau rôle) ;
  - 🛒 **Commandes** : nouvelle commande client (avec référence, total, quartier), expédition, complétée, rejet ;
  - 📦 **Produits** : création, modification, suppression ;
  - ⭐ **Avis** : soumission d'avis (page Notes), validation, suppression, réponse du vendeur (ajout/modification/suppression) ;
  - 🗂️ **Catégories** : création, modification, suppression, activation/désactivation ;
  - 📧 **Abonnés** : abonnement newsletter (site public), désabonnement (admin) ;
  - ⚙️ **Paramètres** : enregistrement des modifications.
- **Onglet « Activité générale »** : tableau complet avec **filtres** (recherche plein texte, type, acteur, période : aujourd'hui / 7 jours / 30 jours / tout), badges colorés par type, icône selon l'action.
- **Onglet « Utilisateurs & rôles »** : pour chaque utilisateur — avatar, rôle, statut, date d'enregistrement, nombre d'actions, **historique des rôles** (bandeau ambre) et **dernières actions**.
- **Onglet « Pages visitées »** : classement des pages les plus visitées (barres de progression) + journal des 100 dernières visites.
- **Export CSV** (séparateur `;`, compatible Excel) et **effacement du journal** (avec confirmation).
- Rafraîchissement **en temps réel** (événement `historyUpdated`).

### 4.13 Paramètres (admin) — **tout le site est modifiable**

**Onglet Général :**
- *Identité du site* : nom, slogan/tagline, description.
- *Coordonnées* : email de contact (affiché), **email admin** (connexion + alertes), téléphone, **WhatsApp**, adresse.
- *Livraison & devise* : infos de livraison, seuil de livraison gratuite, **devise** (GNF / USD / EUR / XAF — conversion automatique partout sur le site).
- *Page contact* : titre bannière, sous-titre bannière, titre section coordonnées, note WhatsApp, titre + message de la carte de remerciement.
- *Réseaux sociaux* : Facebook, Instagram, LinkedIn, Telegram.
- Bouton « Enregistrer les modifications » → appliqué immédiatement partout (navbar, footer, contact, emails…).

**Onglet Notifications (voir section 5).**

**Onglet Sécurité (voir section 6).**

---

## 5. 🔔 NOTIFICATIONS (fonctionnelles et propres)

Module `src/utils/notifications.js` — 3 canaux activables indépendamment dans **Paramètres → Notifications** :

### 5.1 Alertes in-app (cloche admin) — toujours actives
- Chaque événement (nouvelle commande, test) crée une alerte persistée (max 50, clé `admin_alerts`) : type (commande/succès/avertissement/info), titre, message, **lien de navigation**, date, lu/non-lu.
- Affichées dans la **cloche 🔔** de l'admin avec **badge rouge non-lues**, « Tout marquer lu », clic → navigation.

### 5.2 Push navigateur (Notification API)
- Bouton « Activer le push » dans Paramètres (demande la permission, détecte les états : autorisé / bloqué / non supporté, avec guidage si bloqué).
- Notifications système affichées par le navigateur (ex. « 🛒 Nouvelle commande #CMD-… ») quand la permission est accordée.

### 5.3 Emails (EmailJS)
- **Alerte email admin** à chaque nouvelle commande (template « Alerte admin », ID modifiable) : référence, client, total, liste des articles **avec leurs ID produits**.
- **Email de confirmation au client** à chaque commande (avec référence + ID produits).
- **Email aux abonnés** à chaque nouveau produit (template « Nouveaux arrivages »).
- **Email de confirmation d'abonnement** newsletter.
- **Email du code 2FA** (voir Sécurité).

### 5.4 Paramètres de notification
- Interrupteurs : push, email, alertes nouvelles commandes, notifier les abonnés des nouveaux produits.
- Champs : ID template « Alerte admin », ID template « Nouveaux arrivages ».
- **Bouton « Tester les notifications »** : teste les 3 canaux et affiche le résultat clair de chacun (✅/⚠️) — in-app, push, email.
- **Email de test aux abonnés** : vers une adresse précise ou vers tous les abonnés (avec un produit fictif, sans rien publier).

---

## 6. 🛡️ SÉCURITÉ

### 6.1 Authentification à deux facteurs (2FA) — opérationnelle
- Activable/désactivable dans **Paramètres → Sécurité** (interrupteur + bannière d'état).
- **Déroulement à la connexion** :
  1. Saisie email + mot de passe ;
  2. Un **code à 6 chiffres** est généré et **envoyé par email** à l'email admin (template EmailJS dédié, ID configurable ; variables : `user_email`, `order_reference` = le code, `message`) ;
  3. Écran de vérification : saisie du code (5 min de validité), **renvoi** avec compte à rebours 30 s, **retour** possible ;
  4. **Si l'envoi email échoue, un code de secours s'affiche à l'écran** (le flux reste testable) ;
  5. Code validé → session sécurisée (`admin_2fa_verified`).
- **ProtectedRoute bloque l'admin tant que la 2FA n'est pas validée** dans la session.

### 6.2 Mots de passe
- **Changer le mot de passe** : ancien + nouveau + confirmation (règles : ≥ 6 caractères, correspondance), sauvegardé dans `localStorage`.
- **Mot de passe oublié** : récupération en 2 étapes (email ou téléphone → code de validation → nouveau mot de passe), code valable 5 min.

### 6.3 Délai d'inactivité
- Configurable (15 min / 30 min / 1 h / 2 h) dans Paramètres → Sécurité.

---

## 7. 🗄️ DONNÉES — CE QUI EST STOCKÉ

Le site fonctionne **sans serveur** : toutes les données sont dans le `localStorage` du navigateur (idéal pour une démo/présentation, facile à remplacer par une API).

| Clé | Contenu |
|---|---|
| `kabary_settings` | Tous les paramètres du site (identité, contact, contact page, social, notifications, sécurité, devise…) |
| `custom_products` | Produits ajoutés/modifiés par l'admin |
| `categories` | Catégories (nom, slug, statut, compteur produits) |
| `cart` | Panier en cours |
| `shop_orders` | Commandes (id, référence, client, articles avec ID produit, total, statut, date, paiement) |
| `order_logs` | Journal des actions sur les commandes |
| `app_users` | Utilisateurs (rôles, statuts) |
| `current_admin_user` | Utilisateur admin actuellement connecté |
| `current_user` | Utilisateur courant (UserContext) |
| `product_reviews` | Avis par produit (statut, réponse du vendeur) |
| `site_feedback` | Avis généraux sur la boutique |
| `site_subscribers` | Abonnés newsletter (email + date) |
| `site_subscriber_device` | Marqueur « ce navigateur est abonné » |
| `site_publications` | Dernières publications (pour la bannière Nouveautés) |
| `site_last_seen_publications` | Dernière consultation des nouveautés |
| `admin_alerts` | Notifications in-app de l'admin |
| `admin_password` | Mot de passe admin (défaut `admin123`) |
| `adminToken`, `isAuthenticated`, `adminLoggedIn`, `admin_2fa_*` | Session admin + 2FA |
| `emailjs_*_template` | IDs des templates EmailJS configurés |
| `theme` | Mode sombre/clair choisi |
| `resetCode`, `resetCodeExpiry` | Code de réinitialisation de mot de passe |

### Synchronisation en temps réel
Le site utilise des **événements JavaScript** (`window.dispatchEvent`) pour que toutes les pages se mettent à jour instantanément quand une donnée change :
`productsUpdated`, `ordersUpdated`, `reviewsUpdated`, `subscribersUpdated`, `categoriesUpdated`, `userChanged`, `newPublications`, `adminAlertsUpdated`, `settingsUpdated`, `currencyChanged`, `storage`.

---

## 8. 🔌 SERVICES EXTERNES

### EmailJS (emails)
| Élément | Valeur |
|---|---|
| Service ID | `service_t0i7gkk` |
| Public Key | `A7aPwAqqYKTYk5dOE` |
| Template commande client | `template_wxq56ky` (variables : form_name, user_email, order_items, order_reference, product_ids, order_total…) |
| Template abonnement newsletter | `template_t0o01dh` |
| Template nouveaux arrivages (abonnés) | `template_t0o01dh` (modifiable dans Paramètres) |
| Template alerte admin | `template_wxq56ky` (modifiable dans Paramètres) |
| Template code 2FA | modifiable dans Paramètres → Sécurité |

### ImgBB (images uploadées par l'admin)
- API Key intégrée dans l'admin Produits (upload jusqu'à 6 images par produit, galerie ordonnée).

---

## 9. ⭐ POINTS FORTS POUR VOTRE PRÉSENTATION

1. **Aucune donnée fictive dans l'admin** : tableau de bord, analytiques, meilleures ventes, notes — tout est **calculé depuis les vraies données** (commandes, produits, avis).
2. **Commandes avec référence unique** (`CMD-AAMMJJ-NNNN`) : chaque article conserve son **ID produit** partout (admin, emails, notifications).
3. **Site 100 % personnalisable** : nom, description, slogan, coordonnées, WhatsApp, adresse, réseaux sociaux, devise, livraison, page contact (y compris la carte de remerciement) — le tout depuis **Paramètres**, appliqué partout en temps réel.
4. **Notifications complètes** : cloche admin avec badge, push navigateur, emails — **testables** depuis les Paramètres (bouton « Tester les notifications »).
5. **Sécurité renforcée** : 2FA par email opérationnelle (code 6 chiffres, 5 min, renvoi, code de secours), mots de passe modifiables, récupération de mot de passe, délai d'inactivité.
6. **Avis clients modérés** : formulaire public → validation admin → publication, avec **réponse du vendeur**, page Notes avec note globale et produits les mieux notés.
7. **Expérience utilisateur soignée** : mode sombre, recherche avec suggestions en direct, panier persistant, galeries avec lightbox, animations AOS, design responsive, partage produit (WhatsApp/Facebook/X/Email).
8. **Newsletter automatisée** : les abonnés sont prévenus par email à chaque nouveau produit + bannière « Nouveautés » sur le site.
9. **Journalisation** : toutes les actions sur les commandes sont tracées (qui, quand, quoi).
10. **Export des analytiques** : rapports CSV / JSON / impression.

---

## 10. 📝 RÉSUMÉ DES PAGES & FICHIERS (pour référence)

| Zone | Fichiers principaux |
|---|---|
| Routage | `src/App.jsx` |
| Pages publiques | `src/Pages/` : Maison, Femmes, Hommes, Enfants, Electroniques, Meubles, Tendances, Ventes, Notes, Contacts, SearchResults, CategoryProducts, ProductDetail |
| Composants | `src/components/` : Navbar, Hero, HeroCard, Products, TopProducts, Wintersale, Subscribe, Testimonial, Cart, Popup, Footer, Banner, SearchBar, ShareButton, DarkMode, NewsletterBanner, ProductReviews |
| Admin | `src/admin/` : AdminLogin, AdminLayout, ProtectedRoute, Dashboard, Products, Orders, Users, Reviews, Subscribers, Categories, Analytics, Settings |
| Contextes | `src/context/` : SettingsContext, CartContext, CategoryContext, UserContext |
| Services | `src/services/productService.js`, `src/admin/services/productService.js` |
| Utilitaires | `src/utils/` : currencyUtils, reviews, subscribers, notifications |
| Configuration | `package.json`, `vite.config.js`, `tailwind.config.js`, `index.html` |

---

*Fin du document — Kabary Shop, documentation complète générée à partir de l'audit du code source (août 2026).*

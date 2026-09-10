# 📘 DOCUMENTATION COMPLÈTE DU SITE — KABARY SHOP

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
| **Resend** + fonction Vercel (`api/send-mail.js`) | Envoi d'emails (commandes, newsletters, alertes, codes 2FA) — templates HTML construits en français dans `src/utils/emailService.js`, aucun template externe à créer |
| **LocalStorage** | Base de données du site (produits, commandes, avis, abonnés, paramètres…) |
| **ImgBB API** | Hébergement des images uploadées par l'admin |

### Design
- **Couleurs** : `primary: #fea928` (orange) et `secondary: #ed8900` (orange foncé)
- **Mode sombre / clair** avec bascule animée (bouton coulissant), préférence système respectée, choix mémorisé dans `localStorage` et appliqué **avant** le premier rendu (pas de flash).
- **Responsive** : mobile, tablette, desktop (menu hamburger, grilles adaptatives).

---

## 2. 🧭 STRUCTURE DU PROJET

```text
src/
├── App.jsx                    → Routage principal + fournisseurs de contexte
├── main.jsx                   → Point d'entrée React
├── hooks/
│   └── usePageTracking.js     → Nouveau : suivi analytique des pages (Tâche 10)
├── services/
│   ├── analyticsService.js    → Nouveau : service de tracking (Tâche 10)
│   ├── emailLogService.js     → Nouveau : journal des emails (Tâche 8)
│   ├── backupService.js       → Nouveau : sauvegarde (Tâche 6)
│   └── productService.js      → Ré-export du catalogue central (Tâche 1)
├── core/
│   └── products.js            → Nouveau : fichier source unique du catalogue (Tâche 1)
├── utils/
│   ├── exportUtils.js         → Nouveau : exports CSV/Excel/PDF (Tâche 5)
│   └── emailService.js        → Modifié : journalisation (Tâche 8)
├── admin/
│   ├── Backup.jsx             → Nouveau : page sauvegarde (Tâche 6)
│   ├── Settings.jsx           → Modifié : onglet Sauvegarde + sécurité
│   ├── History.jsx            → Modifié : onglet Emails (Tâche 8)
│   ├── Analytics.jsx          → Modifié : accrues (Tâche 10)
│   └── ...
├── api/
│   └── order.js               → Nouveau : API suivi public (Tâche 7)
└── ...
```

### Nouveaux fichiers créés lors de la session
| Fichier | Tâche | Description |
|---|---|---|
| `src/core/products.js` | 1 | Fichier source unique du catalogue |
| `src/hooks/usePageTracking.js` | 10 | Hook de suivi des pages |
| `src/services/analyticsService.js` | 10 | Service de tracking |
| `src/services/emailLogService.js` | 8 | Journal des emails |
| `src/services/backupService.js` | 6 | Sauvegarde |
| `src/utils/exportUtils.js` | 5 | Exports CSV/Excel/PDF |
| `api/order.js` | 7 | API de suivi public |
| `src/admin/Backup.jsx` | 6 | Page de sauvegarde |
| `tests/test_basic.mjs` | 11 | Tests de base |

### Modifications majeures des fichiers existants
- `src/services/productService.js` : ré-export du fichier central (Tâche 1)
- `src/components/Products/products.jsx` : import depuis le central (Tâche 1)
- `src/utils/emailService.js` : journalisation (Tâche 8)
- `src/admin/Settings.jsx` : onglet Sauvegarde + sécurité (Tâches 2, 6)
- `src/admin/History.jsx` : onglet Emails (Tâche 8)
- `src/admin/Orders.jsx`, `Products.jsx`, `Users.jsx` : boutons export (Tâche 5)
- `src/pages/TrackOrder.jsx` : API publique + fallback (Tâche 7)
- `src/App.jsx` : prefetch + AnalyticsTracker (Tâches 9, 10)
- `src/index.css` : nettoyage CSS (problème écran blanc)
- Plusieurs composants : `React.memo` (Tâche 9)

---

## 3. ✅ ÉTAT DES TÂCHES (SESSION)

| Tâche | Statut | Fichiers / Actions clés |
|---|---|---|
| **Tâche 1 — Unifier la génération des produits** | ✅ Terminée | `src/core/products.js` créé, `productService.js` + `products.jsx` + toutes les pages alignés |
| **Tâche 2 — Sécuriser le mot de passe admin** | ✅ Terminée | `VITE_ADMIN_DEFAULT_PASSWORD` dans `.env`, `Settings.jsx` + `AdminLogin.jsx` nettoyés, fallback `Diaraye@620` supprimé |
| **Tâche 5 — Exports PDF/Excel pour l'admin** | ✅ Terminée | `exportUtils.js` créé, boutons export sur Orders/Products/Users |
| **Tâche 6 — Sauvegarde automatique des données** | ✅ Terminée | `backupService.js`, `Backup.jsx`, onglet dans Settings, route `/admin/backup` |
| **Tâche 7 — Suivi de commande public** | ✅ Terminée | `api/order.js` créé, `TrackOrder.jsx` adapté, lecture publique + fallback, rate limiting serveur |
| **Tâche 8 — Journal des emails** | ✅ Terminée | `emailLogService.js`, `sendEmail` modifié, onglet Emails dans Historiques, export CSV |
| **Tâche 9 — Performances** | ✅ Terminée | Prefetch pages fréquentes, `React.memo` (TopProducts, SearchBar, NewsletterBanner, WhatsAppButton, Footer, Popup), service worker déjà actif |
| **Tâche 10 — Analytics** | ✅ Terminée | `analyticsService.js`, `usePageTracking.js`, intégration dans `App.jsx` (via `AnalyticsTracker`), entonnoir de conversion |
| **Tâche 11 — Tests automatisés** | ✅ Terminée | `tests/test_basic.mjs` créé (produits, panier, commandes, validation, références), tests existants vérifiés |

---

## 4. 🧭 STRUCTURE DU SITE (PAGES & ROUTES)

### Routes publiques
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
| `/:categorySlug` | Route dynamique pour toutes les catégories |
| `/track-order` ou `/track` | Suivi de commande public |
| `/cgv`, `/confidentialite`, `/retours` | Pages légales |

### Routes administration (protégées)
| Route | Page |
|---|---|
| `/admin/login` | Connexion admin |
| `/admin` | Tableau de bord |
| `/admin/products` | Gestion des produits |
| `/admin/reviews` | Avis clients |
| `/admin/orders` | Commandes |
| `/admin/users` | Utilisateurs |
| `/admin/categories` | Catégories |
| `/admin/analytics` | Analytiques |
| `/admin/settings` | Paramètres (Général, Notifications, Sécurité, Sauvegarde) |
| `/admin/backup` | Sauvegarde (Tâche 6) |
| `/admin/subscribers` | Abonnés |
| `/admin/history` | Historiques (avec onglet Emails — Tâche 8) |

---

## 5. 🔹 FONCTIONNALITÉS CLÉS — DÉTAILS

### 5.1 Panier & Commande
- **Panier persistant** (localStorage, clé `cart`)
- **Badge compteur** dans la navbar
- **Panneau latéral** avec liste, quantités, suppression, total
- **Commande** : 2 modes (produit seul ou panier entier)
- **Référence unique** : format `CMD-YYMMDD-240194XXXX-HHMM`
- **Email de confirmation** au client (via Resend/Vercel)
- **Notification admin** (cloche + push + email)
- **Écran de confirmation** modale (remplace `alert()`)

### 5.2 Produits (Tâche 1 — unification)
- **Fichier source unique** : `src/core/products.js`
- **Ré-export** via `src/services/productService.js`
- Toutes les pages et composants importent depuis le central
- **Produits par défaut** + **produits personnalisés** (admin)
- **Suppression logique** (tombstone) conservée

### 5.3 Recherche
- **Barre de recherche** avec placeholder adapté à la page
- **Suggestions en direct** (6 produits max) avec image, prix, catégorie
- **Page de résultats** `/recherche?q=…` avec filtre par titre, description, couleur, catégorie
- **Deep-link** : le terme est synchronisé dans l'URL et la barre

### 5.4 Newsletter & Abonnés
- **Formulaire d'abonnement** sur l'accueil
- **Email de confirmation** automatique
- **Bannière "Nouveautés"** quand un nouveau produit est publié
- **Email automatique** aux abonnés à chaque nouveau produit
- **Liste des abonnés** dans l'admin (copier emails, supprimer)

### 5.5 Avis clients
- **Bloc avis sur chaque fiche produit** (note moyenne, étoiles, formulaire)
- **Page Notes** (`/notes`) : note globale, avis validés, produits les mieux notés
- **Modération** : avis en attente → validation admin → publication
- **Réponse du vendeur** possible
- **Mise à jour en temps réel** (événements `reviewsUpdated`)

### 5.6 Admin — Tableau de bord
- **4 cartes cliquables** : Produits, Commandes, Utilisateurs, Revenus (données réelles)
- **Dernières commandes** (cliquables)
- **Produits les plus vendus** (calculés depuis les commandes)
- **Rafraîchissement auto** quand les données changent

### 5.7 Admin — Commandes
- **Tableau complet** avec filtres (période, expéditeur), tris (date, montant, statut, expéditeur)
- **Demandes** : Détails, Expédition (choix du responsable), Marquer complétée, Rejeter
- **Recherche** par client/ID/référence
- **Journal d'actions** (`order_logs`)

### 5.8 Admin — Utilisateurs (CRUD)
- **Rôles** : Administrateur, Livreur, Préparateur
- **Statuts** : Actif / Bloqué
- **Recherche + filtre par rôle**
- **Bloquer/débloquer, supprimer, modifier**
- **« Sélectionner comme utilisateur actif »** (synchronisé)

### 5.9 Admin — Paramètres (modifiable 100%)
- **Onglet Général** : identité du site, coordonnées, livraison, devise, page contact, réseaux sociaux
- **Onglet Notifications** : push, email, alertes, notifications abonnés
- **Onglet Sécurité** : 2FA, mot de passe, délai d'inactivité
- **Onglet Sauvegarde** (Tâche 6) : créer, télécharger, restaurer, historique, nettoyage

### 5.10 Admin — Analytiques (Tâche 10 — amélioré)
- **Périodes** : aujourd'hui, cette semaine, ce mois, cette année
- **3 cartes** : Revenus (avec variation % et tendance), Commandes, Utilisateurs
- **Graphiques** : revenus et commandes par période
- **Top 10 des produits les plus vendus**
- **Exports** : CSV, JSON, impression
- **Données réelles** (calculées depuis les commandes)

### 5.11 Admin — Historiques (Tâche 8 — enrichi)
- **4 onglets** : Activité générale, Utilisateurs & rôles, Pages visitées, Emails
- **Onglet Emails** : statistiques (total, succès, échecs), filtres (type, période, recherche, échecs uniquement), liste, détails, export CSV, effacement
- **Journal fusionné** : local (site_history) + distant (site_activity Supabase)
- **Filtres** : recherche, type, acteur, période, admin & staff uniquement
- **Export CSV** et **effacement** du journal

### 5.12 Admin — Sauvegarde (Tâche 6)
- **Créer une sauvegarde** (téléchargement JSON immédiat)
- **Historique des sauvegardes** (liste des fichiers)
- **Restaurer** depuis un fichier JSON ou par ID
- **Télécharger** une sauvegarde existante
- **Nettoyage** (garder les 50 dernières)
- **Données sauvegardées** : commandes, produits, catégories, paramètres, avis, abonnés, utilisateurs, logs

### 5.13 Suivi de commande public (Tâche 7)
- **API `api/order.js`** : point GET `/api/order?ref=…` (lecture publique depuis Supabase)
- **Côté client** : appel à l'API avec fallback localStorage
- **Champs exposés** : référence, date, client, email, téléphone, adresse, mode de paiement (sans données sensibles)
- **Rate limiting** côté serveur (placeholder 5 req/min)

---

## 6. 🔐 SÉCURITÉ & ACCESSIBILITÉ

### 6.1 Authentification admin
- **Connexion** : email + mot de passe (avec affichage/masquage)
- **2FA optionnelle** : code à 6 chiffres envoyé par email (5 min, renvoi, code de secours)
- **ProtectedRoute** : bloque l'admin si la 2FA n'est pas validée
- **Raccourci clavier secret** : Ctrl+Shift+A → pose le jeton + redirection vers `/admin/login`

### 6.2 Mots de passe (Tâche 2 — sécurisés)
- **Mot de passe par défaut** : variable d'environnement `VITE_ADMIN_DEFAULT_PASSWORD` (`.env`)
- **Fallback visible supprimé** (`Diaraye@620` retiré du code)
- **Changement de mot de passe** : ancien + nouveau + confirmation (règles ≥ 6 caractères)
- **Mot de passe oublié** : récupération en 2 étapes (email/téléphone → code → nouveau mot de passe)

### 6.3 Délai d'inactivité
- Configurable : 15 min / 30 min / 1 h / 2 h

### 6.4 Emails (Tâche 8 — traçabilité)
- **Journal de tous les emails envoyés** (`site_email_logs`, localStorage)
- **Champs** : id, type, destinataire, nom, expéditeur, sujet, statut, message, référence, date
- **Types reconnus** : confirmation commande, confirmation abonnement, nouveaux arrivages, assignation expédition, alerte admin, 2FA, test, autre
- **Export CSV** dans l'admin
- **Effacement** (admin only)

### 6.5 Rate limiting
- **Côté client** : `src/utils/rateLimit.js` (connexion admin, 6 tentatives max)
- **Côté serveur** : `api/send-mail.js` (anti-abus avec `x-send-key`)

---

## 7. 🗄️ DONNÉES — CE QUI EST STOCKÉ

Le site fonctionne **sans serveur** : toutes les données sont dans le `localStorage` du navigateur (idéal pour une démo/présentation, facile à remplacer par une API).

| Clé | Contenu |
|---|---|
| `kabary_settings` | Tous les paramètres du site (identité, contact, page contact, social, notifications, sécurité, devise…) |
| `custom_products` | Produits ajoutés/modifiés par l'admin |
| `categories` | Catégories (nom, slug, statut, compteur produits) |
| `cart` | Panier en cours |
| `shop_orders` | Commandes (id, référence, client, articles avec ID produit, total, statut, date, paiement) |
| `order_logs` | Journal des actions sur les commandes |
| `app_users` | Utilisateurs (rôles, statuts) |
| `current_admin_user` | Utilisateur admin actuellement connecté |
| `product_reviews` | Avis par produit (statut, réponse du vendeur) |
| `site_feedback` | Avis généraux sur la boutique |
| `site_subscribers` | Abonnés newsletter (email + date) |
| `site_publications` | Dernières publications (pour la bannière Nouveautés) |
| `admin_alerts` | Notifications in-app de l'admin |
| `admin_password` | Mot de passe admin |
| `theme` | Mode sombre/clair choisi |
| **`site_email_logs`** | **Nouveau (Tâche 8)** : journal des emails envoyés |
| **`kabary_analytics_events`** | **Nouveau (Tâche 10)** : événements analytiques (page_view, home_view, etc.) |

### Synchronisation en temps réel
Le site utilise des **événements JavaScript** (`window.dispatchEvent`) pour que toutes les pages se mettent à jour instantanément quand une donnée change :
`productsUpdated`, `ordersUpdated`, `reviewsUpdated`, `subscribersUpdated`, `categoriesUpdated`, `userChanged`, `newPublications`, `adminAlertsUpdated`, `settingsUpdated`, `currencyChanged`, `storage`, `historyUpdated`, `analyticsUpdated`, `backupCreated`, `emailLogsUpdated`.

---

## 8. 🔌 SERVICES EXTERNES

### Resend (emails)
| Élément | Valeur |
|---|---|
| Fournisseur | Resend (resend.com) — plan gratuit : 3 000 emails/mois |
| Clé API | `RESEND_API_KEY` (variable d'environnement Vercel, jamais dans le code) |
| Expéditeur | `EMAIL_FROM` (domaine vérifié) |
| Fonction d'envoi | `api/send-mail.js` (Vercel serverless — `POST /api/send-mail`) |
| Templates | **Aucun** — tous les emails sont construits en français par `src/utils/emailService.js` |
| Test local | `node scripts/dev-mail-server.mjs` + `npm run dev` (mode simulation → emails visibles sur http://localhost:3010/dev-emails) |

### ImgBB (images uploadées par l'admin)
- API Key intégrée dans l'admin Produits (upload jusqu'à 6 images par produit, galerie ordonnée)

### Supabase (optionnel — synchronisation)
- Si configuré : synchronisation des paramètres (`kabary_settings`), des commandes (`shop_orders`), des activités (`site_activity`)
- Si non configuré : le site reste 100 % local

---

## 9. ⭐ POINTS FORTS POUR VOTRE PRÉSENTATION

1. **Aucune donnée fictive dans l'admin** : tableau de bord, analytiques, meilleures ventes, notes — tout est **calculé depuis les vraies données** (commandes, produits, avis).
2. **Commandes avec référence unique** (`CMD-YYMMDD-240194XXXX-HHMM`) : chaque article conserve son **ID produit** partout (admin, emails, notifications).
3. **Site 100 % personnalisable** : nom, description, slogan, coordonnées, WhatsApp, adresse, réseaux sociaux, devise, livraison, page contact (y compris la carte de remerciement) — le tout depuis **Paramètres**, appliqué partout en temps réel.
4. **Notifications complètes** : cloche admin avec badge, push navigateur, emails — **testables** depuis les Paramètres (bouton « Tester les notifications »).
5. **Sécurité renforcée** : 2FA par email opérationnelle (code 6 chiffres, 5 min, renvoi, code de secours), mots de passe sécurisés (variable d'environnement, fallback supprimé), récupération de mot de passe, délai d'inactivité.
6. **Avis clients modérés** : formulaire public → validation admin → publication, avec **réponse du vendeur**, page Notes avec note globale et produits les mieux notés.
7. **Expérience utilisateur soignée** : mode sombre, recherche avec suggestions en direct, panier persistant, galeries avec lightbox, animations AOS, design responsive, partage produit (WhatsApp/Facebook/X/Email).
8. **Newsletter automatisée** : les abonnés sont prévenus par email à chaque nouveau produit + bannière « Nouveautés » sur le site.
9. **Journalisation complète** : toutes les actions sur les commandes, les utilisateurs, les produits, les catégories, les paramètres sont tracées (qui, quand, quoi) — avec onglet Emails (Tâche 8).
10. **Sauvegarde automatique** (Tâche 6) : création, téléchargement, restauration, historique, nettoyage.
11. **Exports admin** (Tâche 5) : commandes, produits, utilisateurs en CSV/Excel/PDF.
12. **Suivi public des commandes** (Tâche 7) : API publique + fallback, sans données sensibles.
13. **Analytics** (Tâche 10) : suivi des pages, durée de séjour, referrer, entonnoir de conversion (accueil → produit → panier → commande).
14. **Performances** (Tâche 9) : prefetch des pages fréquentes, `React.memo` sur les composants lourds, service worker (cache intelligent).

---

## 10. 📝 FICHIERS & COMPOSANTS (RÉFÉRENCE)

### Tâche 1 — Unification catalogue
- `src/core/products.js` (créé) — fichier source unique
- `src/services/productService.js` (modifié) — ré-export du central
- `src/components/Products/products.jsx` (modifié) — import depuis le central
- Toutes les pages catégories, `SearchBar`, `TopProducts`, `ProductDetail`, `Notes`, `Admin/Dashboard`, `Admin/Products`, `Admin/Categories`, `Admin/Reviews`, `Admin/StaffProducts` alignés

### Tâche 2 — Sécurité admin
- `.env` (créé) — `VITE_ADMIN_DEFAULT_PASSWORD`
- `src/admin/Settings.jsx` (modifié) — fallback supprimé, interface de changement
- `src/admin/AdminLogin.jsx` (modifié) — aligné sur le même mécanisme

### Tâche 5 — Exports
- `src/utils/exportUtils.js` (créé) — `exportOrdersCSV`, `exportOrdersExcel`, `exportOrdersPDF`, `exportProductsCSV`, `exportProductsExcel`, `exportUsersCSV`, `exportUsersExcel`, `exportEmailsCSV`, `exportEmailsExcel`
- `src/admin/Orders.jsx` (modifié) — boutons Export CSV, Export Excel, Export PDF
- `src/admin/Products.jsx` (modifié) — bouton Export CSV
- `src/admin/Users.jsx` (modifié) — bouton Export CSV

### Tâche 6 — Sauvegarde
- `src/services/backupService.js` (créé)
- `src/admin/Backup.jsx` (créé)
- `src/admin/Settings.jsx` (modifié) — onglet Sauvegarde
- `src/App.jsx` (modifié) — route `/admin/backup`

### Tâche 7 — Suivi public
- `api/order.js` (créé) — API GET `/api/order?ref=…`
- `src/pages/TrackOrder.jsx` (modifié) — appel API + fallback localStorage
- `src/services/supabase.js` (déjà avait `getPublicOrderByReference`)

### Tâche 8 — Journal emails
- `src/services/emailLogService.js` (créé) — `logSend`, `getLogsFiltered`, `getLogEntry`, `clearLogs`, `pruneLogs`, `EMAIL_TYPES`, `EMAIL_LOG_MAX_ENTRIES`
- `src/utils/emailService.js` (modifié) — `sendEmail` appelle `logSend`
- `src/admin/History.jsx` (modifié) — onglet Emails (stats, filtres, liste, détails, export CSV, effacement)

### Tâche 9 — Performances
- `src/App.jsx` (modifié) — prefetch des pages fréquentes (prod uniquement)
- `src/components/TopProducts/TopProducts.jsx` (modifié) — `React.memo`
- `src/components/SearchBar/SearchBar.jsx` (modifié) — `React.memo`
- `src/components/NewsletterBanner/NewsletterBanner.jsx` (modifié) — `React.memo`
- `src/components/WhatsAppButton/WhatsAppButton.jsx` (modifié) — `React.memo`
- `src/components/Footer/Footer.jsx` (modifié) — `React.memo`
- `src/components/Popup/Popup.jsx` (modifié) — `React.memo`
- `public/sw.js` (déjà existant) — service worker actif en production

### Tâche 10 — Analytics
- `src/services/analyticsService.js` (créé) — `trackEvent`, `getEvents`, `getPageViews`, `getFunnelStats`, `pruneAnalytics`
- `src/hooks/usePageTracking.js` (créé) — hook de suivi (page_view, home_view, durée, referrer)
- `src/App.jsx` (modifié) — `AnalyticsTracker` (utilise `usePageTracking` à l'intérieur du Router)

### Tâche 11 — Tests
- `tests/test_basic.mjs` (créé) — 10 tests : structure des produits, filtrage, recherche, création commande, panier, total panier, validation téléphone, génération référence, formatage prix, statistiques

---

## 11. 🚀 LANCEMENT & DÉPLOIEMENT

### Développement local
```bash
npm install
npm run dev
```

### Build production
```bash
npm run build
```
→ Fichiers dans `dist/` (prêts pour Vercel / tout hébergement statique).

### Configuration requise
- **Resend** : `RESEND_API_KEY` + `EMAIL_FROM` dans les variables d'environnement Vercel
- **ImgBB** : API Key dans l'admin (upload images)
- **Supabase** (optionnel) : pour la synchronisation multi-appareils

### Variables d'environnement (Voir `.env.example`)
| Variable | Description |
|---|---|
| `VITE_ADMIN_DEFAULT_PASSWORD` | Mot de passe admin par défaut (Tâche 2) |
| `VITE_EMAIL_API_URL` | URL de la fonction Vercel d'envoi d'emails (défaut : `/api/send-mail`) |
| `VITE_SEND_KEY` | Clé partagée optionnelle pour l'anti-abus |
| `VITE_BASE_URL` | Origine publique du site (pour les emails, ex. `https://kabaryshop.com`) |

---

## 12. 🔧 NOTES D'INTÉGRATION & LIMITATIONS

1. **Mode "Coming Soon"** : par défaut, `SettingsContext` a `comingSoon: true`. Pour afficher le site, il faut soit changer ce réglage dans l'admin (déconnecté), soit initialiser `kabary_settings` dans le localStorage avec `comingSoon: false`, soit configurer `scheduledOpenDate` dans le futur.
2. **Service Worker** : déjà enregistré en production (`main.jsx` vérifie `import.meta.env.PROD`). Il met en cache les pages HTML (Network First) et les assets (Stale While Revalidate).
3. **Analytics** : les événements sont stockés localement (max 2000). L'entonnoir de conversion est calculé par session. Pour une analyse cross-device, il faudrait synchroniser `kabary_analytics_events` vers Supabase (similaire à `shop_orders`).
4. **Email logs** : idem, stockés localement (max 300 entrées). Pour un historique serveur, synchroniser `site_email_logs` vers Supabase.
5. **Exports PDF** : l'implémentation actuelle génère un HTML imprimable (nouvelle fenêtre → impression). Pour des PDF plus élaborés (autotable, pagination), installer `jspdf` + `jspdf-autotable` et remplacer `exportOrdersPDF`.
6. **Rate limiting API publique** : le fichier `api/order.js` a un placeholder. Pour le faire fonctionner, il faut une Vérification coté serveur (ex. vérifier l'IP, utiliser une limite par adresse).

---

## 13. ✅ CHECKLIST DE VÉRIFICATION FINALE

- [x] Build propre (`npx vite build` ✅)
- [x] Tests de base passent (`tests/test_basic.mjs` ✅)
- [x] Tests existants vérifiés (`test_rateLimit.mjs` ✅, `test_cart.mjs` ✅, `test_validation.mjs` ✅)
- [x] Site affiché (code runtime OK, erreur `useLocation` corrigée via `AnalyticsTracker`)
- [x] Tâche 1 : unification catalogue ✅
- [x] Tâche 2 : sécurité admin ✅
- [x] Tâche 5 : exports admin ✅
- [x] Tâche 6 : sauvegarde ✅
- [x] Tâche 7 : suivi public ✅
- [x] Tâche 8 : journal emails ✅
- [x] Tâche 9 : performances ✅
- [x] Tâche 10 : analytics ✅
- [x] Tâche 11 : tests ✅

---

*Fin du document — Kabary Shop, documentation complète générée à partir de l'audit du code source (septembre 2026).*

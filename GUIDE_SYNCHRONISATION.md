# 🔄 Guide — Synchroniser les données entre plusieurs ordinateurs (Supabase)

Le site Kabary Shop stocke normalement toutes ses données dans le
**localStorage** de chaque navigateur : chaque ordinateur a donc **son propre**
jeu de données (commandes, utilisateurs, produits, paramètres…).

Pour que les données soient **partagées en temps réel entre tous tes
ordinateurs**, le projet inclut une synchronisation via **Supabase**
(offre gratuite, sans carte bancaire). Le composant `src/services/SyncProvider.jsx`
fait le pont entre le localStorage et la table `sync_store` de Supabase.

---

## ⏱️ Durée : ~10 minutes

### Étape 1 — Créer un projet Supabase gratuit

1. Va sur **https://supabase.com** → **Start your project** (gratuit, sans carte bancaire).
2. Connecte-toi avec GitHub ou ton email.
3. **New project** :
   - Nom : `kabaryshop` (ou ce que tu veux)
   - **Database Password** : note-le précieusement (mot de passe de la base)
   - Région : choisis **Frankfurt (eu-central-1)** ou **London** (le plus proche de la Guinée)
   - Clique **Create new project** (attends ~2 minutes la création)

### Étape 2 — Créer la table de synchronisation

1. Dans le tableau de bord, clique sur **SQL Editor** dans le menu de gauche.
2. Clique **New query**.
3. Colle **tout le contenu** du fichier `supabase/migrations/0001_init_sync_store.sql` (ouvre-le avec un éditeur de texte pour copier).
4. Clique **Run** → tu dois voir « Success. No rows returned ».

   ✅ La table `sync_store` est créée avec sa politique de sécurité (RLS).

### Étape 3 — Récupérer les clés du projet

1. Menu de gauche → **Project Settings** (en bas) → **API**.
2. Copie deux valeurs :
   - **Project URL** (ex. `https://abcdefgh.supabase.co`)
   - **anon public key** (longue chaîne `eyJ...`)

### Étape 4 — Brancher le site

**En local (test sur ton ordinateur) :**
1. À la racine du projet, copie `.env.example` vers `.env` (si pas déjà fait).
2. Ajoute :
   ```
   VITE_SUPABASE_URL=https://abcdefgh.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
3. Relance `npm run dev` — la synchronisation est active.

**En production (Vercel) :**
1. Sur **vercel.com** → projet `kabaryshop` → **Settings → Environment Variables**.
2. Ajoute les deux mêmes variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. Déploie (ou **Redeploy**) → le site en ligne est synchronisé.

---

## 🧪 Tester la synchronisation

1. Ouvre le site **sur 2 ordinateurs différents** (ou 2 navigateurs différents).
2. Sur l'ordinateur A : passe une commande (ou ajoute un produit dans Admin).
3. Sur l'ordinateur B : l'Admin → **Commandes** se met à jour **tout seul**
   en quelques secondes (temps réel). ✅

> 💡 La première connexion charge le nuage dans chaque navigateur. Si deux
> navigateurs ont déjà des données différentes, c'est **la donnée du nuage qui
> gagne** (dernier écrivain par clé).

---

## 📦 Quelles données sont synchronisées ?

| Clé localStorage | Donnée |
|---|---|
| `shop_orders` | Commandes |
| `app_users` | Utilisateurs |
| `custom_products` | Produits personnalisés |
| `categories` | Catégories |
| `kabary_settings` | Paramètres du site |
| ~~`admin_password`~~ | **Non synchronisé** (voir sécurité ci-dessous) |
| `site_history` | Journal d'activité |
| `order_logs` | Logs des commandes |
| `site_subscribers` | Abonnés newsletter |
| `site_publications` | Publications récentes |
| `product_reviews` | Avis produits |
| `site_feedback` | Avis généraux |

**Non synchronisées** (spécifiques à chaque navigateur, volontairement) :
thème clair/sombre, panier en cours, session de connexion, indicateurs
« déjà abonné sur cet appareil ».

---

## ⚠️ Limites & sécurité (À LIRE)

- **🔐 Le mot de passe admin (`admin_password`) n'est PAS synchronisé.**
  C'est un secret : le stocker en clair dans une table publique permettrait
  à n'importe qui de détourner le compte admin. Il se configure donc
  **séparément sur chaque ordinateur** (Admin → Paramètres → Sécurité).
  Les mots de passe des comptes staff/admin créés dans `app_users` sont eux
  synchronisés (nécessaire pour te connecter depuis n'importe quel
  ordinateur), mais c'est une donnée sensible à garder en tête.
- **Sécurité des données** : les données synchronisées (commandes, clients,
  utilisateurs…) sont lisibles par quiconque possède l'URL du projet, car la
  clé `anon` de Supabase est publique par conception. C'est le compromis d'un
  site sans comptes utilisateurs. **Pour une vraie protection, la prochaine
  étape est d'intégrer Supabase Auth** (gratuit) et de restreindre les
  politiques RLS — dis-le-moi quand tu veux.
- **Conflits** : en cas d'écriture simultanée sur deux ordinateurs, c'est le
  **dernier qui écrit qui gagne** (par clé). Pour une petite boutique, c'est
  largement suffisant.
- **Désactivation** : supprime les deux variables `VITE_SUPABASE_*` pour
  revenir au mode 100 % local.

---

## 📁 Fichiers concernés

| Fichier | Rôle |
|---|---|
| `src/services/db.js` | Client Supabase + liste des clés synchronisées |
| `src/services/SyncProvider.jsx` | Moteur de synchro (pull, realtime, push) |
| `supabase/migrations/0001_init_sync_store.sql` | Table `sync_store` + RLS |
| `src/App.jsx` | Montage du `SyncProvider` |
| `src/context/SettingsContext.jsx`, `CategoryContext.jsx` | Rechargement des paramètres/catégories distants |
| `src/admin/Orders.jsx`, `Analytics.jsx` | Rafraîchissement auto des commandes/stats |

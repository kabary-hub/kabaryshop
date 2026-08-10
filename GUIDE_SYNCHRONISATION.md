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

---

# 🔐 Sécurisation des données (Supabase Auth) — À FAIRE UNE FOIS

Sans cette étape, **n'importe qui** possédant l'URL du projet peut lire les
données du nuage (mots de passe des comptes staff, commandes clients…).
La migration `0002` restreint l'accès : les visiteurs ne voient que les
données d'affichage (produits, catégories, paramètres publics) et ne peuvent
écrire que leurs commandes/avis. Tout le reste (utilisateurs, logs,
journal, commandes) est réservé aux **admin/staff connectés**.

## Étape A — Exécuter la migration 0002 (2 min)

1. Supabase → **SQL Editor** → **New query**.
2. Colle tout le contenu de `supabase/migrations/0002_auth_rls.sql` → **Run**.
3. Tu dois voir « Success. No rows returned ».

## Étape B — Désactiver la confirmation email (1 min)

1. Supabase → **Authentication** → **Sign In / Up** → **Email**.
2. Décoche **« Confirm email »** (confirmation de l'email).
3. **Save**.

> Pourquoi : les comptes cloud (admin/staff) sont créés **automatiquement**
> par le site au moment où l'admin crée un utilisateur avec un mot de passe.
> Sans confirmation, le compte est utilisable immédiatement.

## Comment ça fonctionne désormais

- **Création d'un utilisateur** (Admin → Utilisateurs) : le site crée aussi
  le **compte cloud Supabase Auth** (email + mot de passe identiques).
- **Connexion admin/staff** : le site vérifie les identifiants, puis active la
  session cloud. Sur un **appareil neuf**, l'identité est vérifiée directement
  par Supabase Auth, puis la fiche du compte est chargée depuis le nuage.
- **Données protégées** : une fois connecté, l'appareil peut lire/écrire
  `app_users`, `order_logs`, `site_history` et `shop_orders`. Les visiteurs
  non connectés ne peuvent pas les voir.

## ⚠️ Mot de passe changé dans l'application ?

- **Mot de passe admin principal** (Paramètres → Sécurité) : le site met à
  jour **automatiquement** le mot de passe cloud.
- **Mot de passe d'un livreur/préparateur** (Utilisateurs → Modifier) : le
  site ne peut PAS modifier le mot de passe cloud d'un autre compte (limite
  de Supabase Auth côté navigateur). Après un tel changement, l'utilisateur
  devra se reconnecter avec son ancien mot de passe cloud, OU vous pouvez
  réinitialiser son mot de passe dans le dashboard :
  **Supabase → Authentication → Users → ⋯ → Reset password**.
  Jusqu'à la réinitialisation, sa synchronisation reste limitée au mode
  visiteur (impossible de voir les commandes/utilisateurs).

## Politiques de sécurité (résumé)

| Rôle | Lecture | Écriture |
|---|---|---|
| **Visiteur (anon)** | produits, catégories, paramètres publics, publications, avis, feedback | ses commandes, avis, feedback, abonnements |
| **Admin / staff connecté** | **tout** | **tout** |

> Prochaine étape possible : activer le **recovery email** (SMTP Resend dans
> Supabase) pour permettre aux staff d'utiliser « mot de passe oublié ».

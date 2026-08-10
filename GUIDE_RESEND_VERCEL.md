# 📧 Guide de migration EmailJS → Resend + Vercel

Le site utilise désormais **Resend** pour envoyer tous ses emails, relayés par
une **fonction Vercel** (`api/send-mail.js`). Plus aucun template EmailJS à
créer : tous les emails (newsletter, nouveaux arrivages, confirmation de
commande, expédition aux livreurs, alerte admin, code 2FA) sont construits
automatiquement en français par `src/utils/emailService.js`.

---

## Pourquoi une fonction Vercel ?

Resend exige une **clé API secrète** (`RESEND_API_KEY`). Un site React sans
serveur ne doit jamais contenir de secret dans son code (il serait visible par
tout le monde). La fonction Vercel reçoit l'email à envoyer depuis le
navigateur, ajoute la clé secrète, et appelle l'API Resend.

```
Navigateur (React)  →  POST /api/send-mail (Vercel)  →  API Resend  →  Boîte mail
```

---

## Étape 1 — Créer un compte Resend

1. Allez sur **https://resend.com** et créez un compte gratuit.
   - Plan gratuit : **3 000 emails/mois** (largement suffisant pour démarrer).
2. Onglet **API Keys** (resend.com/api-keys) → **Create API Key** → copiez la
   clé (format `re_...`).

## Étape 2 — Vérifier votre domaine (recommandé)

Pour envoyer vers des boîtes externes (Gmail, Yahoo…), vous **devez vérifier
un domaine** que vous possédez :

1. Onglet **Domains** (resend.com/domains) → **Add Domain** → saisissez votre
   domaine (ex. `kabarishop.com`).
2. Resend affiche des **enregistrements DNS** (SPF, DKIM, etc.).
3. Ajoutez-les chez votre fournisseur DNS (GoDaddy, Namecheap, OVH, Google
   Domains…).
4. Attendez la validation (quelques minutes à quelques heures).

> 💡 Sans domaine vérifié, vous pouvez tout de même tester en utilisant
> `onboarding@resend.dev` comme expéditeur : les emails arrivent uniquement
> sur **votre propre adresse** (celle du compte Resend), ce qui suffit pour
> valider que tout fonctionne.

## Étape 3 — Déployer sur Vercel et configurer les variables

1. Poussez le projet sur GitHub/GitLab/Bitbucket, puis importez-le sur
   **vercel.com** (ou utilisez la CLI : `vercel` à la racine du projet).
   - Le projet contient déjà le dossier `api/` : Vercel détecte
     automatiquement les fonctions serverless (`api/send-mail.js`).
   - Le `.npmrc` (`legacy-peer-deps=true`) est inclus pour éviter les conflits
     de dépendances (react-slick / React 19).
2. Dans Vercel → votre projet → **Settings → Environment Variables**, ajoutez :

   | Nom | Valeur |
   |---|---|
   | `RESEND_API_KEY` | `re_...` (votre clé Resend) |
   | `EMAIL_FROM` | `contact@votre-domaine.com` (ou `onboarding@resend.dev` sans domaine) |
   | `EMAIL_REPLY_TO` | (optionnel) adresse de réponse |

3. **Redeploy** (déploiement) → la fonction est alors active.

## Étape 4 — (Optionnel) anti-abus

Si vous voulez empêcher des inconnus d'utiliser votre fonction d'envoi :

- Ajoutez `SEND_API_KEY=un-mot-de-passe-partage` dans les variables Vercel.
- Ajoutez `VITE_SEND_KEY=un-mot-de-passe-partage` dans un fichier `.env` à la
  racine (lu au build par Vite, public) — **même valeur**.

## Étape 5 — Tester

1. **Admin → Paramètres → Notifications** : l'encart vert « Envoi par Resend »
   confirme la configuration. Cliquez **« Tester les notifications »** → un
   email de test part vers votre email admin.
2. **Admin → Abonnés** : bouton « Envoyer le test » envoie un email
   « Nouveaux arrivages » à l'adresse saisie.
3. **Commande client** : la confirmation est envoyée à l'email du client.
4. **Admin → Commandes → ⋮ → Expédition** : le livreur/préparateur reçoit la
   commande dans sa boîte mail.
5. **Connexion admin (2FA activée)** : le code à 6 chiffres arrive par email.

> ⚠️ En **développement local**, utilisez le serveur de dev email fourni :
> `node scripts/dev-mail-server.mjs` (dans un premier terminal), puis
> `npm run dev` (second terminal). Le proxy Vite redirige `/api/*` vers ce
> serveur (port 3010). Voir la section « Tester en local » ci-dessous.

---

## 🧪 Tester en local (sans Vercel)

Un serveur de dev est fourni : `scripts/dev-mail-server.mjs`. Il simule
**exactement** la fonction Vercel `api/send-mail.js` avec le même contrat
(`POST /api/send-mail`).

1. **Terminal 1** — lancer le serveur email :
   ```bash
   npm run dev:mail
   ```
2. **Terminal 2** — lancer le site :
   ```bash
   npm run dev
   ```

Deux modes selon la présence d'une clé Resend :

- **Sans `RESEND_API_KEY`** (défaut) → *mode simulation* : les emails ne partent
  pas, mais ils sont **sauvegardés dans `dev-emails/`** et visibles sur
  **http://localhost:3010/dev-emails** (rendu HTML complet). Idéal pour
  vérifier les templates sans consommer le quota ni configurer Resend.
- **Avec `RESEND_API_KEY`** dans un fichier `.env` à la racine → les emails
  sont **réellement envoyés** via Resend (test de bout en bout).

Exemple de `.env` pour l'envoi réel :
```
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=onboarding@resend.dev   # ou contact@votre-domaine.com (vérifié)
```

> 🔧 Port par défaut : 3010 (surchargeable via `PORT=3011 npm run dev:mail`).
> Si vous changez le port, mettez à jour le proxy dans `vite.config.js`.

---

## Fichiers concernés

| Fichier | Rôle |
|---|---|
| `api/send-mail.js` | Fonction Vercel : reçoit l'email, appelle Resend |
| `src/utils/emailService.js` | Service client + **tous les templates HTML en français** |
| `src/utils/subscribers.js` | Arrivages, test, expédition livreur |
| `src/utils/notifications.js` | Alerte email admin |
| `src/components/Subscribe/Subrscribe.jsx` | Confirmation d'abonnement |
| `src/components/Popup/Popup.jsx` | Confirmation de commande client |
| `src/admin/AdminLogin.jsx` | Code 2FA |
| `src/admin/Settings.jsx` | Encart de configuration Resend |
| `.env.example` | Modèle des variables |

Le package `@emailjs/browser` n'est plus utilisé ; les anciennes constantes
`EMAILJS_SERVICE_ID` / `EMAILJS_PUBLIC_KEY` ont été supprimées.

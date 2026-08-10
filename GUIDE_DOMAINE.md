# 🌐 Guide — Passer de kabaryshop.vercel.app à kabaryshop.com

Actuellement votre site est accessible sur `https://kabaryshop.vercel.app`.
Pour qu'il devienne `https://kabaryshop.com`, il faut **acheter le domaine**
puis **le connecter à votre projet Vercel**. Ces étapes ne se font pas dans
le code, mais dans les tableaux de bord du registrar et de Vercel.

---

## Étape 1 — Acheter le domaine kabaryshop.com

Choisissez un registrar (boutique de noms de domaine). Exemples fiables :

| Registrar | Prix indicatif/an | Particularité |
|-----------|-------------------|---------------|
| **Namecheap** | ~10–15 $ | Simple, DNS facile, gratuit la 1ʳᵉ année avec certains plans |
| **GoDaddy** | ~12–18 $ | Très connu, promos fréquentes |
| **OVH** (France) | ~9–12 € | Bon si vous préférez un acteur francophone |
| **Porkbun** | ~9–13 $ | Souvent le moins cher |

1. Allez sur le site du registrar, cherchez `kabaryshop.com`.
2. Si le domaine est libre → ajoutez-le au panier et payez.
   - ⚠️ Si le domaine est **déjà pris** par quelqu'un d'autre, choisissez une
     variante : `kabaryshop.shop`, `kabary-shop.com`, `kabaryshop.store`…
3. Après l'achat, **ne touchez pas encore aux DNS** : on va laisser Vercel
   gérer la configuration automatiquement.

---

## Étape 2 — Connecter le domaine dans Vercel

1. Connectez-vous sur **vercel.com** → votre projet **kabaryshop**.
2. Allez dans **Settings → Domains**.
3. Saisissez `kabaryshop.com` puis cliquez sur **Add**.
4. Vercel détecte le registrar (s'il est partenaire, ex. Namecheap) et peut
   configurer les DNS **automatiquement** :
   - Si une fenêtre propose « Configure DNS automatically » → cliquez et
     Vercel ajoutera tout seul l'enregistrement A/AAAA + CNAME `www`.
   - Sinon, Vercel vous affiche les enregistrements à créer manuellement :
     - **A** : `@` → `76.76.21.21`
     - **CNAME** : `www` → `cname.vercel-dns.com`
   - Créez ces enregistrements dans le tableau de bord DNS de votre registrar.
5. Vercel ajoute aussi automatiquement `www.kabaryshop.com` → redirige vers
   `kabaryshop.com` (activé par défaut).

> ⏱ La propagation DNS prend de quelques minutes à 48 h (souvent < 1 h).

---

## Étape 3 — Vérifier

- Ouvrez `https://kabaryshop.com` : vous devez voir votre boutique.
- Ouvrez `https://kabaryshop.vercel.app` : Vercel affiche une redirection
  automatique vers `kabaryshop.com` (ou vous pouvez la désactiver dans
  Settings → Domains si vous préférez).

---

## Étape 4 — Mettre à jour le SEO et l'envoi d'emails

Une fois `kabaryshop.com` actif :

1. **Sitemap & robots.txt** (déjà créés dans `public/`) : les URLs pointent
   vers `kabaryshop.com`. Si vous avez finalement pris un autre domaine,
   remplacez `kabaryshop.com` dans :
   - `public/sitemap.xml`
   - `public/robots.txt`
   - `index.html` (meta og:url, canonical…)
2. **Google Search Console** : ajoutez la propriété `kabaryshop.com`,
   soumettez `https://kabaryshop.com/sitemap.xml` et demandez l'indexation.
   C'est ce qui permet au site d'apparaître quand on recherche vos catégories
   (« mode femme Guinée », « Kabary Shop », etc.).
3. **Resend** (pour les emails) : vérifiez votre domaine
   `kabaryshop.com` sur resend.com/domains, puis mettez à jour la variable
   `EMAIL_FROM` dans Vercel → Settings → Environment Variables
   (ex. `contact@kabaryshop.com`).

---

## Le site affiche « 404 : introuvable » parfois ?

C'est un comportement connu des applications React (SPA) sur Vercel :
quand on rafraîchit une page comme `/femmes`, Vercel cherche un fichier
`femmes` qui n'existe pas et renvoie un 404.

✅ **Déjà corrigé dans ce projet** : le fichier `vercel.json` à la racine
redirige toutes les routes vers `index.html`. Déployez cette version et le
404 disparaîtra.

Le léger ralentissement occasionnel au tout premier accès après inactivité
est le « cold start » du plan gratuit Vercel : la fonction d'envoi d'emails
se réveille au premier appel. C'est normal et sans conséquence.

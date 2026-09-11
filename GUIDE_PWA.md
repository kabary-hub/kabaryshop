# 📲 Guide PWA — Kabary Shop

Ce guide explique comment le site fonctionne en tant que **PWA**, comment il se comporte
en ligne / hors-ligne, comment l’installation est gérée, et comment la vérifier.

---

## 1. Qu’est-ce qui rend le site une PWA

Le site combine trois éléments :

- un **manifest** (`public/manifest.json`) qui décrit l’application installable,
- un **service worker** (`public/sw.js`) qui gère le cache et le mode hors-ligne partiel,
- une **page valide en HTTPS** avec respawn, renouvellement de session, et comportement
  navigation-first sur les pages principales.

Cela permet :

- l’installation sur mobile/desktop (si le navigateur accepte),
- un affichage plus “natif” en mode standalone,
- une stratégie de cache contrôlée,
- un fallback partiel quand le réseau est indisponible.

---

## 2. Manifest (`public/manifest.json`)

### 2.1 Ce qui est configuré

- `name` / `short_name`
- `description`
- `start_url`
- `display` (standalone)
- `background_color`, `theme_color`, `orientation`
- `icons` avec un fallback sur `/logo2.png`
- `splash_screens` basé également sur `/logo2.png`
- `categories`, `shortcuts` (ex. “Commandes” → `/track-order`)

### 2.2 Points de vigilance

- L’icône et le splash utilisent `/logo2.png`.
- Si le site est déployé sur un sous-domaine Vercel gratuit, cette URL peut rester valide.
- Si tu changes de domaine, il faut remplacer les URLs concernées dans le manifest, le
  sitemap, les emails, le SEO, et tous les endroits qui utilisent l’URL de base publique.

---

## 3. Service worker (`public/sw.js`)

### 3.1 Rôle principal

Le service worker sert à :

- pré-cacher les pages statiques clés,
- mettre à jour le cache à chaque nouveau build,
- gérer les requêtes avec deux stratégies :
  - **Network First** pour les pages HTML,
  - **Stale While Revalidate** pour JS / CSS / images.

### 3.2 Stratégie de cache

- Le cache est nommé de façon stable mais réinitialisable à chaque mise à jour
  (le `activate` supprime les anciens caches).
- Les pages listées dans `STATIC_ASSETS` sont pré-cachées à l’installation.
- Les autres assets sont mis en cache au fur et à mesure.

### 3.3 Comportement hors-ligne

- Quand une page réseau échoue, le service worker retourne la version en cache si elle
  existe, sinon il peut retomber sur `/`.
- Les images/cacheés utilisent **Stale While Revalidate** : on affiche le cache immédiatement
  et on rafraîchit en arrière-plan si le réseau répond.
- Ce n’est pas un mode 100 % hors-ligne complet : certaines données dépendent encore du
  réseau (emails, synchronisation Supabase, suivi public de commande serveur, etc.).

### 3.4 Limites du mode hors-ligne

- Si une page n’a jamais été chargée et qu’elle n’est pas pré-cachée, elle peut échouer
  complètement hors-ligne.
- Les commandes, les synchronisations, les emails, et certaines lectures publiques sont
  asynchrones et dépendent du réseau ou de Supabase.
- En développement (`import.meta.env?.PROD` non défini), le service worker n’est **pas**
  enregistré, pour éviter les problèmes de cache périmé lors du HMR.

---

## 4. Installation PWA

### 4.1 Comment l’installation peut se déclencher

- Sur mobile, une icône d’installation peut apparaître dans la barre URL ou dans le menu
  “Partager / Installer”.
- Sur desktop, Chrome/Edge peuvent proposer l’installation dans la barre ou via le menu
  manuel.
- Le manifeste doit être valide, les icônes doivent être chargeables, et le site doit être
  servi en HTTPS.

### 4.2 Ce qui améliore l’installation

- Un manifeste cohérent (nom, icône, couleurs, start_url, display standalone).
- Un service worker fonctionnel.
- Une page d’accueil rapide et un bon titre/description.

### 4.3 Ce qui peut bloquer l’installation

- Des icônes manquantes ou malschées.
- Une origine non sécurisée (HTTP non qualifié pour PWA dans certains navigateurs).
- Un service worker qui rencontre des erreurs lors de l’installation.
- Une politique de sécurité ou un cache périmé qui perturbe le comportement.

---

## 5. Fallback par défaut et images

### 5.1 Logo / fallback

Le site définit déjà une URL de base publique et un fallback précis pour les images, notamment :

- `src/utils/siteConfig.js` expose `getSiteBaseUrl()`, `DEFAULT_SITE_LOGO_URL`,
  `DEFAULT_PRODUCT_IMAGE_URL`, `toAbsoluteUrl()`.
- Les composants utilisent ce fallback quand l’image manque ou est inaccessible.

### 5.2 Pourquoi ce fallback est important pour le PWA et les emails

- Les images locales `/logo2.png` doivent être publiques et chargables.
- Les emails ne peuvent pas résoudre des chemins relatifs, donc les URLs absolues
  publiques sont obligatoires.
- Le fallback commun évite d’avoir des littéraux répétés dans plusieurs fichiers.

---

## 6. Cohérence multiplateforme (manifest / SEO / email / robots / sitemap)

### 6.1 URL de base

La même base publique doit être utilisée partout :

- `VITE_BASE_URL` dans `.env` (ou valeur par défaut dupliquée dans le code).
- `src/utils/siteConfig.js` utilise `VITE_BASE_URL` si définie, sinon l’origine courante
  en browser, et un fallback hors navigateur.
- `src/utils/emailService.js` utilise sa propre logique deisé public avec fallback
  explicite.

### 6.2 SEO

- `App.jsx` gère titre, description et canonical par page.
- `public/sitemap.xml` liste les pages principales.
- `public/robots.txt` autorise l’indexation générale mais bloque `/admin/` et `/staff/`.

### 6.3 Points à vérifier avant production

- Le domaine dans `sitemap.xml`, `robots.txt`, manifest, emails et SEO doit être le même
  que le domaine réel de production.
- Si tu changes de domaine (ex. `kabaryshop.vercel.app` → `kabaryshop.com`), il faut
  mettre à jour **tous** ces fichiers, pas seulement un.

---

## 7. Où installer / tester la PWA

### 7.1 Tests à faire

- Ouvre le site en production déployée (ou preview Vercel) en HTTPS.
- Vérifie que le manifest est chargé (via DevTools > Application > Manifest).
- Vérifie que le service worker est activé (DevTools > Application > Service Workers).
- Vérifie l’affichage hors-ligne :
  - recharge la page,
  - active le mode “Offline”,
  - vérifie les pages pré-cachées et le fallback.
- Teste l’installation si le navigateur la propose.

### 7.2 Ce qu’il faut regarder quand ça ne marche pas

- Console : erreurs de chargement d’icônes, erreurs SW, chemins cassés.
- Network : `/manifest.json` OK, `/sw.js` OK, `/logo2.png` OK.
- Manifest : tail des icônes, start_url cohérent, display valide.
- Domaine : si tu testes en localhost, l’installation PWA peut être plus limitée selon le
  navigateur.

---

## 8. Limitations et bonnes pratiques

- Le site n’est pas “100 % hors-ligne” : certaines fonctionnalités synchrones ou
  serveur-dépendantes nécessitent le réseau.
- Le fallback hors-ligne est partiel et repose sur les pages pré-cachées.
- Les données sensibles ou synchronisées dépendent de Supabase si configuré, sinon elles
  restent locales.
- Le service worker est enregistré uniquement en production pour éviter les conflits en dev.
- Tout changement d’URL de base, de logo, ou de domaine doit être répercuté dans le
  manifeste, le sitemap, les emails, et les utilitaires utilisant l’URL publique.

---

## 9. Checklist PWA (à cocher avant publication)

- [ ] `public/manifest.json` cohérent avec le domaine de production
- [ ] Icônes chargées et visibles
- [ ] `public/sw.js` déployé et actif en prod
- [ ] Le service worker n’est PAS enregistré en développement local
- [ ] `start_url` fonctionne
- [ ] `sitemap.xml` et `robots.txt` cohérents avec le domaine
- [ ] Les emails utilisent des URLs publiques absolues
- [ ] Le SEO et le canonical pointent vers le bon domaine
- [ ] L’installation PWA fonctionne sur au moins un appareil de test
- [ ] Le fallback hors-ligne donne une expérience acceptable sur les pages clés
- [ ] Les constantes publiques (`siteConfig.js`) sont alignées avec le manifeste/SEO/emails

---

## 10. Dépannage rapide

### 10.1 Le service worker ne s’enregistre pas

Causes fréquentes :

- le site n’est pas en HTTPS ou n’est pas servi via `localhost`/localhost-like,
- `import.meta.env?.PROD` n’est pas défini,
- `/sw.js` n’est pas servi correctement,
- le manifeste/URL ne correspond pas à l’origine.

### 10.2 L’installation n’apparaît pas

Causes fréquentes :

- manifeste invalide / icônes manquantes,
- origine non sécurisée,
- SW désactivé,
- navigateur non compatible,
- cache périmé ou contenu non conforme.

### 10.3 Hors-ligne : pages vides ou erreurs

Causes fréquentes :

- page non pré-cachée,
- cache vide,
- fallback manquant,
- stratégie Network First sans cache utilisable.

### 10.4 Image/logo cassée dans l’email ou le site

Causes fréquentes :

- chemin relatif utilisé à la place d’une URL publique,
- image locale non publiée,
- fallback non configuré,
- manifeste et emails qui pointent vers des chemins différents.

---

## 11. Résumé

La PWA de Kabary Shop repose sur :

- un manifeste installable,
- un service worker avec cache intelligent,
- un fallback d’image et d’URL publique centralisé,
- une gestion SEO/canonical cohérente,
- un comportement hors-ligne partiel basé sur les pages pré-cachées.

Avant publication, il faut surtout vérifier que le **domaine**, les **images publiques**,
le **manifest**, le **service worker**, le **sitemap** et les **emails** utilisent tous la
même URL de base cohérente.

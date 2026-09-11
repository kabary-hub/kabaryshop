// Constantes centralisées du site.
//
// Ce fichier sert de source unique pour les valeurs répétées partout dans
// l'application : URL de base, fallback logo, fallback image produit, etc.
// Si tu changes le domaine, le logo ou le format d'image par défaut, tu le
// fais à cet endroit plutôt que dans 10 fichiers différents.

/**
 * URL de base du site.
 * - Si VITE_BASE_URL est définie, on l'utilise (utile pour la prod).
 * - Sinon, on utilise l'origine actuelle du navigateur.
 */
export const getSiteBaseUrl = () => {
  const env = import.meta.env?.VITE_BASE_URL;
  if (env && env.trim()) return env.trim().replace(/\/+$/, "");
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/+$/, "");
  }
  // Fallback hors navigateur (scripts, SSR-like, tests) :
  return "https://kabaryshop.vercel.app";
};

/**
 * Logo par défaut (utilisé quand aucun logo personnalisé n'est configuré).
 * Les emails et les templates utilisent cette URL absolue.
 */
export const DEFAULT_SITE_LOGO_URL = `${getSiteBaseUrl()}/logo2.png`;

/**
 * Image produit par défaut (fallback).
 * Si un produit n'a pas d'image, on utilise ce logo plutôt qu'un chemin
 * local ou une URL morte.
 */
export const DEFAULT_PRODUCT_IMAGE_URL = `${getSiteBaseUrl()}/logo2.png`;

/**
 * Format de référence commande par défaut.
 * Exemple : CMD-260908-2401940001-1430
 *
 * Ce format est partagé entre :
 *  -Popup (création commande)
 *  - service Supabase (génération fallback)
 *  - sanitizer / ordres / historiques
 *  - emails
 *
 * Si le format change, il faut le mettre à jour uniquement ici et dans la
 * fonction de génération, puis vérifier les affichages existants.
 */
export const ORDER_REFERENCE_BRAND_ID = "2401940001";

/**
 * Préfixe de magasin utilisé dans le format de référence commande.
 * Exemple : CMD-260908-240194XXXX-HHMM
 *
 * Ce préfixe est partagé entre :
 *  - Popup (génération séquentielle journalière)
 *  - orderSanitizer (nettoyage/historisation)
 *  - supabase (fallback fixe via ORDER_REFERENCE_BRAND_ID)
 *
 * Si le préfixe change, il faut mettre à jour les fichiers qui l'utilisent
 * explicitement (Popup, orderSanitizer…) et vérifier les regex existantes.
 */
export const ORDER_REFERENCE_STORE_PREFIX = "240194";

/**
 * Génère une référence de commande de base quand aucune référence n'est
 * fournie explicitement.
 */
export const generateDefaultOrderReference = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const datePart = `${yy}${mm}${dd}`;
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const timePart = `${hh}${min}`;
  return `CMD-${datePart}-${ORDER_REFERENCE_BRAND_ID}-${timePart}`;
};

// ---------------------------------------------------------------------------
// Utilitaires liés à l'URL
// ---------------------------------------------------------------------------

/**
 * Transforme une URL relative (« /logo2.png ») en URL absolue.
 * Utilisé par les emails, par le SEO et par certains templates.
 */
export const toAbsoluteUrl = (url) => {
  if (!url) return "";
  if (/^(https?:)?\/\//i.test(url)) return url;
  const base = getSiteBaseUrl();
  if (url.startsWith("/")) return `${base}${url}`;
  return url;
};

/**
 * Version de débogage de l'URL de base du site.
 * Utile pour confirmer quel domaine est utilisé dans les emails/SEO/PWA.
 */
export const siteBaseUrlDebug = () => {
  return {
    env: import.meta.env?.VITE_BASE_URL || null,
    base: getSiteBaseUrl(),
    logo: DEFAULT_SITE_LOGO_URL,
    productImage: DEFAULT_PRODUCT_IMAGE_URL,
  };
};

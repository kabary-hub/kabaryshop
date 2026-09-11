// src/utils/seo.js
// Petit utilitaire SEO : chaque page du site peut définir son propre
// <title>, sa meta description et sa canonical URL (important pour
// apparaître dans les résultats de recherche Google/Bing).

// URL de base du site (configurable via VITE_BASE_URL dans .env).
// Fallback : l'origine actuelle du site (production = domaine réel, pas de dev).
const getBaseUrl = () =>
  import.meta.env?.VITE_BASE_URL || window.location.origin.replace(/\/+$/, "");

// Met à jour le <title> du document.
export const setPageTitle = (title) => {
  document.title = title;
};

// Met à jour la meta description (la crée si absente).
export const setPageDescription = (description) => {
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "description";
    document.head.appendChild(meta);
  }
  meta.content = description;
};

// Met à jour la balise canonical (la crée si absente).
export const setCanonical = (path) => {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  // La canonical utilise l'URL de base (déployée) et non un chemin relatif.
  const url = `${getBaseUrl()}${path === "/" ? "/" : path}`;
  link.href = url;
};

// Applique titre + description + canonical en une seule fois.
export const updatePageMeta = ({ title, description, path = "" }) => {
  if (title) setPageTitle(title);
  if (description) setPageDescription(description);
  if (path) setCanonical(path);
};

// Active/désactive l'indexation (robots meta) — utilisé par l'écran
// « Ouverture prochaine » pour ne pas référencer le site en attente.
export const setNoIndex = (noIndex = true) => {
  let meta = document.querySelector('meta[name="robots"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "robots";
    document.head.appendChild(meta);
  }
  meta.content = noIndex ? "noindex, nofollow" : "index, follow";
};

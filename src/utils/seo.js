// src/utils/seo.js
// Petit utilitaire SEO : chaque page du site peut définir son propre
// <title>, sa meta description et sa canonical URL (important pour
// apparaître dans les résultats de recherche Google/Bing).

// Domaine gratuit actuel (fourni par Vercel).
// Quand kabaryshop.com sera acheté, remplacer par "https://kabaryshop.com".
const getBaseUrl = () => "https://kabaryshop.vercel.app";

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
  const url = `${getBaseUrl()}${path === "/" ? "/" : path}`;
  link.href = url;
};

// Applique titre + description + canonical en une seule fois.
export const updatePageMeta = ({ title, description, path = "" }) => {
  if (title) setPageTitle(title);
  if (description) setPageDescription(description);
  if (path) setCanonical(path);
};

// src/utils/categories.js
// Source unique des catégories du site. Les 7 catégories réelles du catalogue
// (dossiers d'images de src/assets) sont les valeurs par défaut ; toute
// modification faite dans Admin > Catégories est persistée dans localStorage.
// Les compteurs de produits sont recalculés depuis le catalogue réel
// (produits par défaut + produits personnalisés).

export const DEFAULT_CATEGORIES = [
  { id: 1, name: "Femmes", slug: "femmes", status: "active" },
  { id: 2, name: "Hommes", slug: "hommes", status: "active" },
  { id: 3, name: "Enfants", slug: "enfants", status: "active" },
  { id: 4, name: "Électroniques", slug: "electroniques", status: "active" },
  { id: 5, name: "Meubles", slug: "meubles", status: "active" },
  { id: 6, name: "Tendances", slug: "tendances", status: "active" },
  { id: 7, name: "Ventes", slug: "ventes", status: "active" },
];

// Slugs des catégories par défaut PROTÉGÉES : elles ont une page dédiée
// (src/Pages/Femmes.jsx, Hommes.jsx, …) reliée à leur route (/femmes, /hommes,
// …). Leur nom/slug ne doit donc PAS être modifiable ni supprimable dans
// l'admin, sinon la navigation publique casserait. L'admin peut en revanche
// les activer/désactiver (statut) et créer autant de catégories libres qu'il
// veut (celles-ci passent par la route dynamique /:categorySlug).
export const PROTECTED_CATEGORY_SLUGS = DEFAULT_CATEGORIES.map((c) => c.slug);

// Lit les catégories (localStorage). Si rien n'est enregistré (premier
// déploiement), les catégories réelles par défaut sont créées puis persistées.
export const getCategories = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("categories") || "[]");
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {
    // stockage indisponible : on retombe sur les valeurs par défaut
  }
  const fresh = DEFAULT_CATEGORIES.map((c) => ({ ...c, productCount: 0 }));
  try {
    localStorage.setItem("categories", JSON.stringify(fresh));
  } catch {
    // stockage indisponible
  }
  return fresh;
};

// Catégories actives (affichées dans le menu public)
export const getActiveCategories = () =>
  getCategories().filter((c) => c.status === "active");

// Écrit les catégories dans localStorage SANS notifier (usage interne)
const writeCategories = (categories) => {
  try {
    localStorage.setItem("categories", JSON.stringify(categories));
  } catch {
    // stockage indisponible
  }
};

// Persiste les catégories et notifie tous les composants
export const saveCategories = (categories) => {
  writeCategories(categories);
  window.dispatchEvent(new Event("categoriesUpdated"));
  window.dispatchEvent(new Event("storage"));
};

// Recalcule le nombre de produits réels de chaque catégorie à partir du
// catalogue complet (produits par défaut + personnalisés). Retourne la liste
// mise à jour, ou null si le calcul échoue.
//
// ⚠️ Important : on ne notifie (categoriesUpdated / storage) que si un compteur
// a réellement changé. Sinon, l'événement re-déclencherait le recalcul dans
// Admin > Catégories, qui re-notifierait... = boucle infinie toutes les 100 ms.
export const updateCategoryProductCounts = (getAllProductsFn) => {
  try {
    const allProducts = (getAllProductsFn || (() => []))();
    const categories = getCategories();
    const updated = categories.map((category) => {
      const slug = (category.slug || "").toLowerCase().trim();
      const count = allProducts.filter((product) => {
        const productCategory = (product.category || product.categorySlug || "")
          .toLowerCase()
          .trim();
        return productCategory === slug;
      }).length;
      return { ...category, productCount: count };
    });

    const changed = updated.some(
      (cat, i) => (cat.productCount || 0) !== (categories[i]?.productCount || 0),
    );
    if (changed) {
      writeCategories(updated);
      window.dispatchEvent(new Event("categoriesUpdated"));
      window.dispatchEvent(new Event("storage"));
    }
    return updated;
  } catch {
    // Calcul impossible : on laisse les compteurs inchangés
    return null;
  }
};

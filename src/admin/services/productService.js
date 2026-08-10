// src/admin/services/productService.js
// Service admin des produits — UNIFIÉ avec le service public
// (src/services/productService.js) : la source de vérité unique est
// localStorage["custom_products"] + les produits par défaut du catalogue.
// Les produits créés/modifiés/supprimés dans l'admin apparaissent donc
// immédiatement sur le site public (accueil, catégories, recherche, détail).
//
// Rétrocompatibilité : l'ancienne clé localStorage["products"] (utilisée par
// d'anciennes versions de l'admin) est fusionnée en lecture pour ne rien perdre.

import {
  getAllProducts as getPublicProducts,
  saveProduct as savePublicProduct,
  deleteProduct as deletePublicProduct,
  getDeletedProductIds,
} from "../../services/productService";
import { updateCategoryProductCounts as recalcCounts } from "../../utils/categories";

const LEGACY_KEY = "products";

// Récupérer tous les produits (catalogue par défaut + personnalisés + héritage)
export const getAllProducts = () => {
  const products = getPublicProducts();
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
    const ids = new Set(products.map((p) => String(p.id)));
    // Les produits supprimés (tombstones) ne doivent pas revenir via l'héritage
    const deletedIds = new Set(getDeletedProductIds());
    legacy.forEach((p) => {
      if (!ids.has(String(p.id)) && !deletedIds.has(String(p.id))) products.push(p);
    });
  } catch {
    // Héritage illisible : on ignore les anciennes données
  }
  return products;
};

// Récupérer les produits admin uniquement (personnalisés)
export const getAdminProducts = () => {
  try {
    const savedProducts = localStorage.getItem("custom_products");
    return savedProducts ? JSON.parse(savedProducts) : [];
  } catch {
    // Stockage illisible : aucune copie admin
    return [];
  }
};

// 🔥 Mettre à jour les compteurs de catégories avec le catalogue réel
export const updateCategoryProductCounts = () => recalcCounts(getAllProducts);

// Sauvegarder un produit → écrit dans le store PUBLIC (custom_products)
export const saveProduct = (product) => {
  const saved = savePublicProduct(product);
  if (saved) {
    // Retirer l'ancienne copie héritée pour éviter les doublons (l'id ET
    // l'originalId : un produit par défaut modifié garde originalId)
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
      const filtered = legacy.filter(
        (p) =>
          String(p.id) !== String(saved.id) &&
          String(p.id) !== String(saved.originalId),
      );
      localStorage.setItem(LEGACY_KEY, JSON.stringify(filtered));
    } catch {
      // Nettoyage impossible : sans impact sur la sauvegarde
    }
    recalcCounts(getAllProducts);
  }
  return saved;
};

// Supprimer un produit → du store PUBLIC + de l'héritage
export const deleteProduct = (id, originalId) => {
  const ok = deletePublicProduct(id, originalId);
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
    const filtered = legacy.filter(
      (p) => String(p.id) !== String(id) && String(p.id) !== String(originalId),
    );
    localStorage.setItem(LEGACY_KEY, JSON.stringify(filtered));
  } catch {
    // Nettoyage impossible : sans impact sur la suppression
  }
  recalcCounts(getAllProducts);
  return ok;
};

// Récupérer les produits par catégorie (catalogue réel)
export const getProductsByCategory = (categorySlug) => {
  try {
    const allProducts = getAllProducts();
    return allProducts.filter((product) => {
      const productCategory = (product.category || product.categorySlug || "").toLowerCase();
      return productCategory === categorySlug.toLowerCase();
    });
  } catch {
    // Catalogue illisible : catégorie vide
    return [];
  }
};

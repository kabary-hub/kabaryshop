// src/services/productService.js
// Ré-export du catalogue centralisé (src/core/products.js).
// Les définitions locales en double ont été supprimées : toute la logique
// de génération des produits par défaut, des tombstones et des produits
// personnalisés est désormais unique dans src/core/products.js.

import {
  DEFAULT_PRODUCTS,
  getCustomProducts,
  saveProduct,
  deleteProduct,
  getAllProducts as coreGetAllProducts,
  getDeletedProductIds,
  DELETED_KEY,
  saveCustomProducts,
} from '../core/products';

// Compatibilité : exports nommés utilisés ailleurs.
export {
  DEFAULT_PRODUCTS,
  getCustomProducts,
  saveProduct,
  deleteProduct,
  getDeletedProductIds,
  DELETED_KEY,
  saveCustomProducts,
};

// getAllProducts() est conservé pour les appels existants.
export const getAllProducts = () => coreGetAllProducts();
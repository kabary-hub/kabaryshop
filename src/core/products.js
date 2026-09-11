// src/core/products.js
// Source unique de génération du catalogue.
// Ce fichier centralise la création des produits par défaut depuis les images,
// la lecture des produits personnalisés, les tombstones de suppression,
// et les exports utilisés par l’admin, la boutique et les pages catégorie.
//
// Règle de prix :
//   - Si le nom de fichier contient _prix, le prix est lu depuis le nom.
//   - Sinon, fallback depuis PRODUCT_DEFAULT_PRICES (généré par assign-prices.mjs).
//
// Compatibilité :
//   - Les exports existants sont conservés pour ne pas casser les imports actuels.
//   - Les deux fichiers suivants importent depuis ici :
//       src/services/productService.js
//       src/components/Products/products.jsx

import { PRODUCT_DEFAULT_PRICES } from '../utils/productDefaultPrices';

// 1. Importer les images des produits par défaut
const womenImages = import.meta.glob(
  '../assets/products-women/*.{png,jpg,jpeg,webp}',
  { eager: true },
);
const enfantImages = import.meta.glob(
  '../assets/enfantimg/*.{png,jpg,jpeg,webp}',
  { eager: true },
);
const hommeImages = import.meta.glob(
  '../assets/hommeimg/*.{png,jpg,jpeg,webp}',
  { eager: true },
);
const electroniqueImages = import.meta.glob(
  '../assets/electroniqueimg/*.{png,jpg,jpeg,webp}',
  { eager: true },
);
const meubleImages = import.meta.glob(
  '../assets/meubleimg/*.{png,jpg,jpeg,webp}',
  { eager: true },
);
const tendanceImages = import.meta.glob(
  '../assets/tendanceimg/*.{png,jpg,jpeg,webp}',
  { eager: true },
);
const venteImages = import.meta.glob(
  '../assets/venteimg/*.{png,jpg,jpeg,webp}',
  { eager: true },
);

// 2. Fonction pour transformer les fichiers en objets produit
const createProducts = (images, categoryName, startId) => {
  return Object.keys(images).map((path, index) => {
    const fileName = path.split('/').pop(); // ex : "femme1.jpg"
    const fullFileName = fileName.split('.')[0];
    const parts = fullFileName.split('_');
    const name = parts[0];
    const rawPrice = parts[1];

    // Prix de secours attribué par scripts/assign-prices.mjs quand le nom
    // de fichier ne contient pas de prix (ex : "femme1.jpg" → 180 000 GNF)
    const fallbackPrice = PRODUCT_DEFAULT_PRICES[fileName] || 0;

    return {
      id: `${categoryName}_${startId + index}`,
      img: images[path] ? (images[path].default || images[path]) : '',
      title: `${name.charAt(0).toUpperCase() + name.slice(1)}`,
      color: 'Multiples couleurs',
      priceInGNF: rawPrice ? Number(rawPrice) : fallbackPrice,
      prix:
        rawPrice
          ? `${Number(rawPrice).toLocaleString().replace(/,/g, ' ')} GNF`
          : fallbackPrice
            ? `${fallbackPrice.toLocaleString().replace(/,/g, ' ')} GNF`
            : 'À définir GNF',
      category: categoryName,
      aosDelay: (index * 50).toString(),
      isCustom: false,
      // Date FIXE très ancienne pour que les nouveaux produits soient toujours devant
      createdAt: '2024-01-01T00:00:00.000Z',
    };
  });
};

// 3. Générer les produits par défaut
const womenProducts = createProducts(womenImages, 'femmes', 100);
const enfantProducts = createProducts(enfantImages, 'enfants', 300);
const hommeProducts = createProducts(hommeImages, 'hommes', 500);
const electroniquesProducts = createProducts(electroniqueImages, 'electroniques', 700);
const meubleProducts = createProducts(meubleImages, 'meubles', 900);
const tendanceProducts = createProducts(tendanceImages, 'tendances', 1100);
const venteProducts = createProducts(venteImages, 'ventes', 1300);

// 4. Produits par défaut statiques
export const DEFAULT_PRODUCTS = [
  ...hommeProducts,
  ...womenProducts,
  ...enfantProducts,
  ...electroniquesProducts,
  ...meubleProducts,
  ...tendanceProducts,
  ...venteProducts,
];

// Alias de compatibilité (utilisé dans certains fichiers existants)
export const defaultProducts = DEFAULT_PRODUCTS;

// 5. Récupérer les produits personnalisés
export const getCustomProducts = () => {
  try {
    const custom = localStorage.getItem('custom_products');
    if (custom) {
      return JSON.parse(custom);
    }
  } catch {
    // Stockage illisible : on repart d'une liste vide
  }
  return [];
};

// 5bis. Produits supprimés (« tombstones »)
export const DELETED_KEY = 'deleted_products';

export const getDeletedProductIds = () => {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.map(String) : [];
  } catch {
    // Stockage illisible : aucune suppression mémorisée
    return [];
  }
};

const saveDeletedProductIds = (ids) => {
  try {
    const unique = [...new Set(ids.map(String))];
    localStorage.setItem(DELETED_KEY, JSON.stringify(unique));
    window.dispatchEvent(new Event('productsUpdated'));
  } catch {
    // Stockage indisponible : la suppression restera locale à la session
  }
};

// 6. Sauvegarder les produits personnalisés
export const saveCustomProducts = (products) => {
  localStorage.setItem('custom_products', JSON.stringify(products));
  window.dispatchEvent(new Event('productsUpdated'));
};

// 7. Ajouter ou modifier un produit
export const saveProduct = (product) => {
  const customProducts = getCustomProducts();

  // Vérifier si le produit existe déjà
  const existingIndex = customProducts.findIndex((p) => p.id === product.id);

  // Ré-ajouter un produit (ou rééditer un produit supprimé) le fait
  // réapparaître : on retire son ID (et son originalId) des tombstones.
  const deletedIds = new Set(getDeletedProductIds());
  if (product.id) deletedIds.delete(String(product.id));
  if (product.originalId) deletedIds.delete(String(product.originalId));
  saveDeletedProductIds([...deletedIds]);

  if (existingIndex !== -1) {
    // Modification - GARDER la date originale
    const existingProduct = customProducts[existingIndex];
    const updatedProduct = {
      ...product,
      createdAt: existingProduct.createdAt, // Conserver la date d'origine
    };
    customProducts[existingIndex] = updatedProduct;
    saveCustomProducts(customProducts);
    return updatedProduct;
  } else {
    // Nouveau produit - créer avec date ACTUELLE (qui sera plus récente que 2024)
    const now = new Date();
    const newProduct = {
      ...product,
      id:
        product.id ||
        `custom_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      isCustom: true,
      aosDelay: '0',
      createdAt: now.toISOString(), // Date actuelle avec millisecondes
    };
    saveCustomProducts([...customProducts, newProduct]);
    return newProduct;
  }
};

// 8. Supprimer un produit
export const deleteProduct = (id, originalId = null) => {
  const customProducts = getCustomProducts();

  // 1) Tombstone : mémoriser l'ID supprimé pour toutes les vues du catalogue
  const deleted = new Set(getDeletedProductIds());
  if (id != null) deleted.add(String(id));
  if (originalId != null) deleted.add(String(originalId));
  saveDeletedProductIds([...deleted]);

  // 2) Retirer les copies personnalisées (produits modifiés ou créés)
  if (originalId || !id.toString().startsWith('custom_')) {
    const productIdToRemove = originalId || id;
    const filtered = customProducts.filter((p) => p.originalId !== productIdToRemove);
    saveCustomProducts(filtered);
  } else {
    const filtered = customProducts.filter((p) => p.id !== id);
    saveCustomProducts(filtered);
  }
};

// 9. Obtenir tous les produits (fusion)
export const getAllProducts = () => {
  const customProducts = getCustomProducts();
  const deletedIds = new Set(getDeletedProductIds());

  // 1) Produits par défaut, SAUF ceux supprimés
  const allProducts = DEFAULT_PRODUCTS.filter((p) => !deletedIds.has(String(p.id)));

  // 2) Appliquer les modifications des produits personnalisés
  customProducts.forEach((customProduct) => {
    // Produit masqué : soit son propre ID est supprimé, soit il s'agit d'une
    // copie modifiée dont le produit d'origine (originalId) est supprimé.
    const hidden =
      deletedIds.has(String(customProduct.id)) ||
      (customProduct.originalId && deletedIds.has(String(customProduct.originalId)));
    if (hidden) return;

    if (customProduct.originalId) {
      const index = allProducts.findIndex((p) => p.id === customProduct.originalId);
      if (index !== -1) {
        allProducts[index] = customProduct;
      } else {
        allProducts.push(customProduct);
      }
    } else {
      allProducts.push(customProduct);
    }
  });

  return allProducts;
};

// 10. Obtenir tous les produits TRIÉS par date (plus récent d'abord)
export const getAllProductsSorted = () => {
  const all = getAllProducts();
  return all.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return dateB - dateA;
  });
};

// 11. Obtenir uniquement les produits par défaut (pour la page d'accueil)
// (les produits supprimés par l'admin sont exclus)
export const getDefaultProducts = () => {
  const deletedIds = new Set(getDeletedProductIds());
  return DEFAULT_PRODUCTS.filter((p) => !deletedIds.has(String(p.id)));
};

// 12. Export pour compatibilité (liste actuelle complète)
export const getProductsData = () => getAllProducts();

// 13. Filtrer des produits par terme de recherche
export const filterProductsByTerm = (products, term) => {
  if (!term || !term.trim()) return products;
  const t = term.trim().toLowerCase();
  return products.filter((p) => {
    const title = (p.title || p.name || '').toLowerCase();
    const desc = (p.description || p.desc || '').toLowerCase();
    const color = (p.color || '').toLowerCase();
    const category = (p.category || p.categorySlug || '').toLowerCase();
    return (
      title.includes(t) ||
      desc.includes(t) ||
      color.includes(t) ||
      category.includes(t)
    );
  });
};

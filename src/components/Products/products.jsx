/* eslint-disable react-refresh/only-export-components -- ce fichier exporte à la
   fois des composants (Products) et des fonctions de données (getAllProducts,
   saveCustomProducts…) : la règle Fast Refresh ne s'applique pas à ce module. */
import React, { useState, useEffect, useMemo } from "react";
import { FaStar } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { convertPrice, formatPrice } from "../../utils/currencyUtils";
import { useCart } from "../../context/CartContext"; // IMPORTANT: Ajout du panier
import ShareButton from "../ShareButton/ShareButton";
import { getReviewStats } from "../../utils/reviews";
import { PRODUCT_DEFAULT_PRICES } from "../../utils/productDefaultPrices";
import { getDeletedProductIds } from "../../services/productService";

// 1. Importation de tous les dossiers
const womenImages = import.meta.glob(
  "../../assets/products-women/*.{png,jpg,jpeg,webp}",
  { eager: true },
);
const enfantImages = import.meta.glob(
  "../../assets/enfantimg/*.{png,jpg,jpeg,webp}",
  { eager: true },
);
const hommeImages = import.meta.glob(
  "../../assets/hommeimg/*.{png,jpg,jpeg,webp}",
  { eager: true },
);
const electroniqueImages = import.meta.glob(
  "../../assets/electroniqueimg/*.{png,jpg,jpeg,webp}",
  { eager: true },
);
const meubleImages = import.meta.glob(
  "../../assets/meubleimg/*.{png,jpg,jpeg,webp}",
  { eager: true },
);
const tendanceImages = import.meta.glob(
  "../../assets/tendanceimg/*.{png,jpg,jpeg,webp}",
  { eager: true },
);
const venteImages = import.meta.glob(
  "../../assets/venteimg/*.{png,jpg,jpeg,webp}",
  { eager: true },
);

// 2. Fonction pour transformer "nom_prix.jpg" en objet produit
const createProducts = (images, categoryName, startId) => {
  return Object.keys(images).map((path, index) => {
    const fileName = path.split("/").pop(); // ex : "femme1.jpg"
    const fullFileName = fileName.split(".")[0];
    const parts = fullFileName.split("_");
    const name = parts[0];
    const rawPrice = parts[1];

    // Prix de secours attribué par scripts/assign-prices.mjs quand le nom
    // de fichier ne contient pas de prix (ex : "femme1.jpg" → 180 000 GNF)
    const fallbackPrice = PRODUCT_DEFAULT_PRICES[fileName] || 0;

    return {
      id: `${categoryName}_${startId + index}`,
      img: images[path].default || images[path],
      title: `${name.charAt(0).toUpperCase() + name.slice(1)}`,
      color: "Multiples couleurs",
      priceInGNF: rawPrice ? Number(rawPrice) : fallbackPrice,
      prix: rawPrice
        ? `${Number(rawPrice).toLocaleString().replace(/,/g, " ")} GNF`
        : fallbackPrice
          ? `${fallbackPrice.toLocaleString().replace(/,/g, " ")} GNF`
          : "À définir GNF",
      category: categoryName,
      aosDelay: (index * 50).toString(),
      isCustom: false,
      createdAt: '2024-01-01T00:00:00.000Z',
    };
  });
};

// 3. Génération des listes
const womenProducts = createProducts(womenImages, "femmes", 100);
const enfantProducts = createProducts(enfantImages, "enfants", 300);
const hommeProducts = createProducts(hommeImages, "hommes", 500);
const electroniqueProducts = createProducts(electroniqueImages, "electroniques", 700);
const meubleProducts = createProducts(meubleImages, "meubles", 900);
const tendanceProducts = createProducts(tendanceImages, "tendances", 1100);
const venteProducts = createProducts(venteImages, "ventes", 1300);

// 4. Produits par défaut
const defaultProducts = [
  ...hommeProducts,
  ...womenProducts,
  ...enfantProducts,
  ...electroniqueProducts,
  ...meubleProducts,
  ...tendanceProducts,
  ...venteProducts,
];

// 5. Fonction pour récupérer les produits personnalisés
const getCustomProducts = () => {
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

// 6. Sauvegarder les produits personnalisés
export const saveCustomProducts = (products) => {
  localStorage.setItem('custom_products', JSON.stringify(products));
  window.dispatchEvent(new Event('productsUpdated'));
};

// 7. Supprimer un produit personnalisé
export const deleteCustomProduct = (id) => {
  const products = getCustomProducts();
  const filtered = products.filter(p => p.id !== id);
  saveCustomProducts(filtered);
  return filtered;
};

// 8. Obtenir tous les produits TRIÉS par date (plus récent d'abord)
// Les produits personnalisés avec `originalId` remplacent le produit par
// défaut correspondant (même logique que src/services/productService.js)
// pour éviter les doublons quand l'admin modifie un produit du catalogue.
// Les produits supprimés (tombstones deleted_products) sont exclus.
export const getAllProducts = () => {
  const customProducts = getCustomProducts();
  const deletedIds = new Set(getDeletedProductIds());

  // 1) Produits par défaut, SAUF ceux supprimés
  const allProducts = defaultProducts.filter(
    (p) => !deletedIds.has(String(p.id)),
  );

  // 2) Produits personnalisés, sauf ceux supprimés (ou dont l'original l'est)
  customProducts.forEach((customProduct) => {
    const hidden =
      deletedIds.has(String(customProduct.id)) ||
      (customProduct.originalId &&
        deletedIds.has(String(customProduct.originalId)));
    if (hidden) return;

    if (customProduct.originalId) {
      const index = allProducts.findIndex(
        (p) => String(p.id) === String(customProduct.originalId),
      );
      if (index !== -1) {
        allProducts[index] = customProduct;
      } else {
        allProducts.push(customProduct);
      }
    } else {
      allProducts.push(customProduct);
    }
  });

  const sortedProducts = allProducts.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return dateB - dateA;
  });

  return sortedProducts;
};

// 9. Obtenir uniquement les produits par défaut (pour la page d'accueil)
// (les produits supprimés par l'admin sont exclus)
export const getDefaultProducts = () => {
  const deletedIds = new Set(getDeletedProductIds());
  return defaultProducts.filter((p) => !deletedIds.has(String(p.id)));
};

// 10. Export pour compatibilité
export const ProductsData = getAllProducts();

// 10bis. Filtrer des produits par terme de recherche (titre, description, couleur, catégorie)
export const filterProductsByTerm = (products, term) => {
  if (!term || !term.trim()) return products;
  const t = term.trim().toLowerCase();
  return products.filter((p) => {
    const title = (p.title || p.name || "").toLowerCase();
    const desc = (p.description || p.desc || "").toLowerCase();
    const color = (p.color || "").toLowerCase();
    const category = (p.category || p.categorySlug || "").toLowerCase();
    return (
      title.includes(t) ||
      desc.includes(t) ||
      color.includes(t) ||
      category.includes(t)
    );
  });
};

// 11. Composant Products AVEC PANIER
const Products = ({ data, searchTerm = "" }) => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { addToCart } = useCart(); // AJOUT: récupérer la fonction addToCart
  const [notification, setNotification] = useState(null); // AJOUT: notification
  // Produits personnalisés : mis à jour quand le catalogue change (événement global)
  const [customProducts, setCustomProducts] = useState(() => getCustomProducts());

  // Fonction pour afficher la notification
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 2000);
  };

  // Fonction pour ajouter au panier
  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    addToCart(product);
    showNotification(`✅ ${product.title} ajouté au panier !`);
  };

  // Liste des produits TRIÉS, calculée de façon synchrone (données + localStorage)
  const products = useMemo(() => {
    const deletedIds = new Set(getDeletedProductIds());
    const isVisible = (product) => !deletedIds.has(String(product.id));
    let allProducts;
    
    if (data && data.length > 0) {
      const productMap = new Map();
      [...data].forEach((product) => {
        if (isVisible(product) && !productMap.has(product.id)) {
          productMap.set(product.id, product);
        }
      });
      allProducts = Array.from(productMap.values());
    } else {
      const productMap = new Map();
      [...defaultProducts, ...customProducts].forEach(product => {
        if (isVisible(product) && !productMap.has(product.id)) {
          productMap.set(product.id, product);
        }
      });
      allProducts = Array.from(productMap.values());
    }
    
    return allProducts.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });
  }, [data, customProducts]);

  useEffect(() => {
    // Recharger la liste quand le catalogue change (événement global)
    const handleProductsUpdate = () => setCustomProducts(getCustomProducts());
    window.addEventListener('productsUpdated', handleProductsUpdate);
    return () => window.removeEventListener('productsUpdated', handleProductsUpdate);
  }, []);

  const getFormattedPrice = (product) => {
    if (!product.priceInGNF || product.priceInGNF === 0) {
      return "Prix sur demande";
    }
    const convertedPrice = convertPrice(product.priceInGNF, settings.currency);
    return formatPrice(convertedPrice, settings.currency);
  };

  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/300x400?text=Image+non+disponible';
  };

  return (
    <>
      <div id="produits-section" className="mt-14 mb-15">
        <div className="container border-b border-yellow-600 mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 max-w-225 mx-auto">
            <p data-aos="fade-up" className="text-sm sm:text-xl font-bold text-primary">
              Nos meilleures ventes
            </p>
            <h1 data-aos="fade-up" className="text-3xl sm:text-4xl font-bold">
              Nouveaux arrivages
            </h1>
            <p data-aos="fade-up" className="text-sm xs:text text-gray-400">
              Des pièces fraîches, tendances et soigneusement sélectionnées pour{" "}
              <br />
              sublimer votre style au quotidien.
            </p>
          </div>

          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.length === 0 ? (
                <div className="col-span-full text-center py-10">
                  {searchTerm.trim() ? (
                    <>
                      <p className="text-gray-500">
                        Aucun résultat pour « {searchTerm.trim()} »
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        Essayez avec un autre mot-clé.
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500">Aucun produit disponible pour le moment.</p>
                  )}
                </div>
              ) : (
                products.map((item) => (
                  <div
                    data-aos="fade-up"
                    data-aos-delay={item.aosDelay}
                    key={item.id}
                    className="relative space-y-3 flex flex-col h-full w-full cursor-pointer hover:scale-105 transition-transform duration-300"
                    onClick={() => navigate(`/produit/${item.id}`)}
                  >
                    <div className="overflow-hidden rounded-md shadow-md drop-shadow-[2px_10px_15px_rgba(0,0,0,0.2)] w-full">
                      <img
                        src={item.img}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        onError={handleImageError}
                        className="w-full aspect-[3/4] object-cover cursor-pointer hover:scale-110 transition-transform duration-300 sm:aspect-auto sm:h-72.5"
                      />
                    </div>
                    <ShareButton
                      product={item}
                      className="absolute top-2 right-2 z-30"
                      buttonClassName="w-9 h-9 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-gray-600 dark:text-gray-300 shadow-md border border-gray-200 dark:border-gray-700 hover:bg-primary hover:text-white hover:border-primary"
                    />
                    <div className="text-center mb-0 grow w-full min-w-0">
                      <h3 className="font-semibold line-clamp-1 px-1">{item.title}</h3>
                      <p className="text-sm dark:text-gray-400 text-gray-600 line-clamp-1 px-1">
                        {item.color}
                      </p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        {(() => {
                          const stats = getReviewStats(item.id);
                          return stats.count > 0 ? (
                            <>
                              <FaStar className="text-yellow-400 text-sm" />
                              <span className="text-xs text-gray-400 ml-1">
                                {stats.average.toFixed(1)} ({stats.count} avis)
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 ml-1">
                              Aucun avis
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <p
                        title={getFormattedPrice(item)}
                        className="text-xs sm:text-sm font-bold text-primary bg-gray-100 rounded-md shadow-sm dark:bg-gray-600 px-2 py-1 min-w-0 flex-1 truncate"
                      >
                        {getFormattedPrice(item)}
                      </p>
                      <button
                        onClick={(e) => handleAddToCart(e, item)}
                        className="bg-primary text-white text-xs font-bold py-2 px-2.5 rounded-md hover:scale-105 duration-300 shrink-0"
                      >
                        🛒 Ajouter
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {products.length > 0 && (
              <div data-aos="fade-up" className="flex justify-center">
                <button
                  onClick={() => navigate("/ventes")}
                  className="text-center mt-10 mb-10 cursor-pointer bg-primary hover:scale-110 rounded-md px-5 py-2"
                >
                  Voir Plus
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification d'ajout au panier */}
      {notification && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-[99999] bg-green-500 text-white px-4 py-2.5 rounded-lg shadow-lg animate-fadeIn text-sm text-center sm:text-left sm:max-w-md">
          {notification}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default Products;
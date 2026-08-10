// src/Pages/CategoryProducts.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { getAllProducts } from '../admin/services/productService';
import { filterProductsByTerm } from '../components/Products/products';
import ShareButton from '../components/ShareButton/ShareButton';
import { getReviewStats } from '../utils/reviews';

const CategoryProducts = ({ handleOrder, searchTerm = "" }) => {
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  // 🔥 Utiliser useCallback pour éviter les re-rendus infinis
  const loadProducts = useCallback(() => {
    setLoading(true);
    
    try {
      // Récupérer les catégories
      const savedCategories = localStorage.getItem('categories');
      let category = null;
      if (savedCategories) {
        const categories = JSON.parse(savedCategories);
        category = categories.find(cat => cat.slug === categorySlug);
        if (category) {
          setCategoryName(category.name);
        } else {
          setCategoryName(categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1));
        }
      }

      // Récupérer TOUS les produits
      const allProducts = getAllProducts();

      // Filtrer par catégorie
      const categoryProducts = allProducts.filter(product => {
        const productCategory = (product.category || product.categorySlug || '').toLowerCase().trim();
        return productCategory === categorySlug.toLowerCase().trim();
      });

      setProducts(categoryProducts);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [categorySlug]);

  // 🔥 Chargement initial et quand categorySlug change
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // 🔥 Écouter les changements de localStorage
  useEffect(() => {
    const handleUpdate = () => {
      loadProducts();
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('productsUpdated', handleUpdate);
    window.addEventListener('categoriesUpdated', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('productsUpdated', handleUpdate);
      window.removeEventListener('categoriesUpdated', handleUpdate);
    };
  }, [loadProducts]);

  // Recherche : filtrer les produits de la catégorie par le terme saisi
  const visibleProducts = filterProductsByTerm(products, searchTerm);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-500">Chargement des produits...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="produits-section" className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary">
          {categoryName || categorySlug}
        </h1>
        <p className="text-gray-500 mt-2">
          <span className="font-bold text-secondary">{visibleProducts.length}</span> produits trouvés
          {searchTerm.trim() && (
            <span className="text-sm text-gray-400"> pour « {searchTerm.trim()} »</span>
          )}
        </p>
      </div>

      {visibleProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-500">
            {searchTerm.trim()
              ? `Aucun résultat pour « ${searchTerm.trim()} »`
              : "Aucun produit dans cette catégorie"}
          </p>
          <Link to="/" className="text-primary hover:underline mt-4 inline-block">
            Retour à l'accueil
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
          {visibleProducts.map((product) => (
            <div 
              key={product.id} 
              onClick={() => navigate(`/produit/${product.id}`)}
              className="relative bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-transform hover:-translate-y-1 cursor-pointer"
            >
              <img 
                src={product.img || product.image || 'https://via.placeholder.com/300'} 
                alt={product.title || product.name}
                className="w-full h-48 object-cover rounded-t-lg"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/300?text=Image';
                }}
              />
              <ShareButton
                product={product}
                className="absolute top-2 right-2 z-30"
                buttonClassName="w-9 h-9 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-gray-600 dark:text-gray-300 shadow-md border border-gray-200 dark:border-gray-700 hover:bg-primary hover:text-white hover:border-primary"
              />
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                  {product.title || product.name}
                </h3>
                
                {product.color && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-500">Couleur:</span>
                    <span 
                      className="w-5 h-5 rounded-full border border-gray-300 inline-block"
                      style={{ backgroundColor: product.color }}
                      title={product.color}
                    ></span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {product.color}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-1 mb-2">
                  {(() => {
                    const stats = getReviewStats(product.id);
                    return stats.count > 0 ? (
                      <>
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm">
                          {stats.average.toFixed(1)} ({stats.count} avis)
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">Aucun avis</span>
                    );
                  })()}
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-2">
                  {product.description || product.desc || ''}
                </p>
                
                <div className="flex justify-between items-center gap-2">
                  <span
                    title={product.prix || product.price || `${product.priceInGNF?.toLocaleString() || 0} GNF`}
                    className="text-xl font-bold text-secondary min-w-0 truncate"
                  >
                    {product.prix || product.price || `${product.priceInGNF?.toLocaleString() || 0} GNF`}
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (handleOrder) {
                        handleOrder(product);
                      } else {
                        const cartProduct = {
                          id: product.id,
                          title: product.title || product.name,
                          price: product.prix || product.price || `${product.priceInGNF || 0} GNF`,
                          priceInGNF: product.priceInGNF || 0,
                          img: product.img || product.image,
                          category: product.category,
                          color: product.color,
                          quantity: 1
                        };
                        addToCart(cartProduct);
                      }
                    }}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/80 transition text-sm shrink-0"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryProducts;
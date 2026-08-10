// src/admin/Products.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit, Trash2, Plus, Search, Calendar, ArrowUpDown, X, ChevronLeft, ChevronRight, Eye, Tag, Palette } from 'lucide-react';
import { getAllProducts, saveProduct, deleteProduct } from '../services/productService';
import { getReviewStats } from '../utils/reviews';
import { logActivity } from '../utils/history';
import { showToast } from '../utils/toast';
import Pagination from '../components/Pagination/Pagination';

// Nombre de produits affichés par page
const PAGE_SIZE = 10;
import {
  recordPublication,
  notifySubscribersNewProduct,
} from '../utils/subscribers';

// Nombre maximal d'images par produit (1 principale + 5 supplémentaires)
const MAX_IMAGES = 6;

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [reviewStatsMap, setReviewStatsMap] = useState({});
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sortOrder, setSortOrder] = useState('recent');
  const [categories, setCategories] = useState([]);
  // Détails du produit (modale ouverte au clic sur une ligne)
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  // Pagination
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    prix: '',
    category: '',
    rating: '',
    images: [],
    color: '',
    createdAt: ''
  });

  // Pré-remplir la recherche depuis l'URL (?search=nom) — clic depuis le Tableau de bord
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl) {
      setSearchTerm(searchFromUrl);
      // Nettoyer l'URL pour garder une recherche stable
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne doit s'exécuter qu'au montage
  }, []);

  // Clé API ImgBB
  const IMGBB_API_KEY = 'b9087907b2356121a20ac005a22fa8fa';

  // Charger les catégories depuis localStorage
  useEffect(() => {
    const loadCategories = () => {
      const savedCategories = localStorage.getItem('categories');
      if (savedCategories) {
        const parsedCategories = JSON.parse(savedCategories);
        const activeCategories = parsedCategories.filter(cat => cat.status === 'active');
        setCategories(activeCategories);
      }
    };
    loadCategories();

    const handleCategoriesUpdated = () => {
      loadCategories();
    };
    window.addEventListener('categoriesUpdated', handleCategoriesUpdated);
    return () => {
      window.removeEventListener('categoriesUpdated', handleCategoriesUpdated);
    };
  }, []);

  // Upload d'une image (galerie) vers ImgBB
  const uploadToImgBB = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.data.url;
      } else {
        throw new Error('Erreur upload');
      }
    } catch (error) {
      console.error('Erreur ImgBB:', error);
      alert('Erreur lors de l\'upload vers ImgBB');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Upload d'une image supplémentaire (galerie)
  const handleExtraImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image valide');
      return;
    }
    if (formData.images.length >= MAX_IMAGES) {
      alert(`Nombre maximal d'images atteint (${MAX_IMAGES})`);
      return;
    }

    const imageUrl = await uploadToImgBB(file);
    if (imageUrl) {
      setFormData({ ...formData, images: [...formData.images, imageUrl] });
    }
    // Permettre de re-sélectionner le même fichier
    e.target.value = '';
  };

  // Supprimer une image
  const removeExtraImage = (index) => {
    setFormData({
      ...formData,
      images: (formData.images || []).filter((_, i) => i !== index)
    });
  };

  // Réordonner : déplacer une image vers la gauche (-1) ou la droite (+1)
  const moveImage = (index, direction) => {
    const images = [...formData.images];
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    [images[index], images[target]] = [images[target], images[index]];
    setFormData({ ...formData, images });
  };

  // Charger et trier les produits
  const loadProducts = () => {
    setLoading(true);
    let allProducts = getAllProducts();
    
    // Statistiques d'avis calculées UNE FOIS pour toute la liste (perf)
    const reviewStatsMap = {};
    allProducts.forEach(p => {
      reviewStatsMap[p.id] = getReviewStats(p.id);
    });
    setReviewStatsMap(reviewStatsMap);
    
    const productsWithDates = allProducts.map(product => {
      // Nombre d'images : galerie si présente, sinon 1 pour l'image principale
      const imagesCount =
        product.images && product.images.length
          ? product.images.length
          : product.img
            ? 1
            : 0;
      if (!product.createdAt) {
        if (product.isCustom) {
          return { ...product, imagesCount, createdAt: new Date().toISOString() };
        }
        return { ...product, imagesCount, createdAt: '2020-01-01T00:00:00.000Z' };
      }
      return { ...product, imagesCount };
    });
    
    productsWithDates.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      if (sortOrder === 'recent') {
        return dateB - dateA;
      } else {
        return dateA - dateB;
      }
    });
    
    setProducts(productsWithDates);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
    const handleUpdate = () => loadProducts();
    window.addEventListener('productsUpdated', handleUpdate);
    return () => window.removeEventListener('productsUpdated', handleUpdate);
  }, [sortOrder]);

  const filteredProducts = products.filter(product =>
    product.title && product.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Remonter à la première page quand la recherche ou le tri change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, sortOrder]);
  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPageProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = (product) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      deleteProduct(product.id, product.originalId);
      loadProducts();
      // Déclencher les événements pour mettre à jour les autres composants
      window.dispatchEvent(new Event('productsUpdated'));
      window.dispatchEvent(new Event('storage'));
      // Journal
      logActivity({
        type: 'product',
        action: 'suppression',
        subject: product.title || product.name || 'Produit',
        details: `ID : ${product.id} · Catégorie : ${product.category || '—'}`,
      });
      // Toast de suppression (au lieu d'un console.log)
      showToast(`Le produit « ${product.title || product.name || 'Produit'} » a été supprimé`, 'success');
    }
  };

  // Affiche la modale de détails du produit (clic sur une ligne)
  const viewProductDetails = (product) => {
    setSelectedProduct(product);
    setShowDetailsModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let priceInGNF = formData.priceInGNF;
    if (!priceInGNF && formData.prix) {
      const priceMatch = formData.prix.match(/\d+/g);
      if (priceMatch) {
        priceInGNF = parseInt(priceMatch.join(''));
      }
    }
    
    // 🔥 IMPORTANT: La catégorie doit être en minuscules
    const categorySlug = formData.category.toLowerCase().trim();
    
    const productToSave = {
      id: editingProduct ? editingProduct.id : `custom_${Date.now()}`,
      originalId: editingProduct?.originalId || editingProduct?.id,
      title: formData.title,
      priceInGNF: priceInGNF || 0,
      prix: formData.prix || `${priceInGNF?.toLocaleString() || 0} GNF`,
      category: categorySlug,
      categorySlug: categorySlug,
      // Note par défaut 0 (les vraies notes viennent des avis clients)
      rating: formData.rating || 0,
      img: formData.images[0] || '',
      // Galerie ordonnée : la 1ère image est l'image principale (dédupliquée)
      images: [...new Set((formData.images || []).filter(Boolean))],
      color: formData.color || "Multiples couleurs",
      isCustom: true,
      aosDelay: "0",
      createdAt: new Date().toISOString()
    };
    
    const isNewProduct = !editingProduct;
    saveProduct(productToSave);
    loadProducts();
    
    // 🔥 DÉCLENCHER LES ÉVÉNEMENTS POUR METTRE À JOUR TOUS LES COMPOSANTS
    window.dispatchEvent(new Event('productsUpdated'));
    window.dispatchEvent(new Event('storage'));

    // 📣 Nouveau produit : informer les abonnés (bannière site + email)
    if (isNewProduct) {
      recordPublication(productToSave);
      notifySubscribersNewProduct(productToSave).catch(() => {});
    }

    // Journal central (page Historiques)
    logActivity({
      type: 'product',
      action: isNewProduct ? 'création' : 'modification',
      subject: productToSave.title,
      details: `Catégorie : ${categorySlug} · Prix : ${productToSave.prix || productToSave.priceInGNF || '—'} GNF`,
    });
    
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      id: '',
      title: '',
      prix: '',
      category: '',
      rating: '',
      img: '',
      images: [],
      color: '',
      createdAt: ''
    });
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      id: product.id || '',
      title: product.title || '',
      prix: product.prix || '',
      category: product.category || '',
      rating: product.rating || '',
      images: (product.images && product.images.length
        ? product.images
        : [product.img]
      ).filter(Boolean),
      color: product.color || '',
      createdAt: product.createdAt || ''
    });
    setShowModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Chargement des produits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestion des produits</h1>
          <div className="text-red-500 rounded-full bg-secondary mt-1 text-center font-bold">
            <p>Total: {products.length} produits</p>
          </div>
        </div>
        <button 
          className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-primary transition flex items-center gap-2"
          onClick={() => {
            setEditingProduct(null);
            setFormData({
              id: '',
              title: '',
              prix: '',
              category: '',
              rating: '',
              images: [],
              color: '',
              createdAt: ''
            });
            setShowModal(true);
          }}
        >
          <Plus size={18} />
          Ajouter un produit
        </button>
      </div>

      {/* Barre de recherche et tri */}
      <div className="rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'recent' ? 'oldest' : 'recent')}
            className="flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0"
          >
            <ArrowUpDown size={18} />
            <span>
              {sortOrder === 'recent' ? 'Plus récent d\'abord' : 'Plus ancien d\'abord'}
            </span>
            <Calendar size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Tableau des produits */}
      <div className="rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date d'ajout</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    Aucun produit trouvé
                  </td>
                </tr>
              ) : (
                currentPageProducts.map((product, index) => (
                  <tr
                    key={`${product.id}_${index}`}
                    className="hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    onClick={() => viewProductDetails(product)}
                  >
                    <td className="px-2 py-2">
                      <div className="relative inline-block">
                        <img 
                          src={product.img} 
                          alt={product.title} 
                          className="w-16 h-16 object-cover rounded"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/100?text=Image';
                          }}
                        />
                        {/* Badge : nombre d'images du produit */}
                        <span
                          className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold shadow"
                          title={`${product.imagesCount} image${product.imagesCount > 1 ? 's' : ''} pour ce produit`}
                        >
                          {product.imagesCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {product.title}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-secondary">
                        {product.prix}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-200 dark:bg-gray-700">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {(() => {
                          const stats = reviewStatsMap[product.id];
                          return stats && stats.count > 0 ? (
                            <>
                              <span className="text-yellow-500">★</span>
                              <span>{stats.average.toFixed(1)}</span>
                              <span className="text-xs text-gray-400">({stats.count})</span>
                            </>
                          ) : (
                            <span className="text-gray-400 text-xs">Aucun avis</span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {formatDate(product.createdAt)}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => viewProductDetails(product)} 
                          className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition"
                          title="Voir les détails"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleEdit(product)} 
                          className="text-blue-600 hover:text-blue-800 transition"
                          title="Modifier"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product)} 
                          className="text-red-600 hover:text-red-800 transition"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={filteredProducts.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      </div>

      {/* Modal d'ajout/édition */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-50 flex items-center pt-32 justify-center z-50">
          <div className="rounded-lg w-full bg-white dark:bg-gray-950 max-w-md p-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold border-b-2 py-1 rounded-md text-secondary mb-4">
              {editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom du produit *</label>
                  <input
                    type="text"
                    placeholder="Nom du produit"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Prix *</label>
                  <input
                    type="text"
                    placeholder="Ex: 150 000 GNF"
                    value={formData.prix}
                    onChange={(e) => setFormData({...formData, prix: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Catégorie *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-2 py-2 border rounded-lg focus:outline-none dark:bg-gray-950 focus:ring-2 focus:ring-blue-400"
                    required
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories.length > 0 ? (
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="femmes">Femmes</option>
                        <option value="hommes">Hommes</option>
                        <option value="enfants">Enfants</option>
                        <option value="electroniques">Electroniques</option>
                        <option value="meubles">Meubles</option>
                      </>
                    )}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Couleur</label>
                  <input
                    type="text"
                    placeholder="Couleur du produit"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                
                {/* Galerie d'images : la première image est l'image principale */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium">Galerie d'images (la 1ère = principale) *</label>
                    <span className="text-xs text-gray-500">{(formData.images || []).length} / {MAX_IMAGES}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 items-start">
                    {(formData.images || []).map((img, index) => (
                      <div key={index} className="relative">
                        <img
                          src={img}
                          alt={`Image ${index + 1}`}
                          className="h-14 w-14 object-cover rounded border"
                        />
                        {/* Badge : la 1ère image est l'image principale */}
                        {index === 0 && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-[9px] font-bold px-1.5 py-px rounded-full whitespace-nowrap shadow">
                            Principale
                          </span>
                        )}
                        {/* Ordre : déplacer vers la gauche / la droite */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5 bg-white dark:bg-gray-800 rounded-full shadow border px-0.5">
                          <button
                            type="button"
                            onClick={() => moveImage(index, -1)}
                            disabled={index === 0}
                            aria-label="Déplacer vers la gauche"
                            title="Déplacer avant (image principale)"
                            className="text-gray-500 hover:text-blue-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(index, 1)}
                            disabled={index === (formData.images || []).length - 1}
                            aria-label="Déplacer vers la droite"
                            title="Déplacer après"
                            className="text-gray-500 hover:text-blue-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExtraImage(index)}
                          aria-label="Supprimer cette image"
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <label
                      className={`h-14 w-14 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-500 transition ${(formData.images || []).length >= MAX_IMAGES ? 'opacity-40 pointer-events-none' : ''}`}
                      title={(formData.images || []).length >= MAX_IMAGES ? `Nombre maximal d'images atteint (${MAX_IMAGES})` : 'Ajouter une image'}
                    >
                      {uploading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      ) : (
                        <Plus size={18} className="text-gray-400" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleExtraImageUpload}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    La 1ère image (badge jaune) est l'image principale. Utilisez les flèches ◂ ▸ pour réordonner (max {MAX_IMAGES} images).
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Note (0-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Note"
                    value={formData.rating}
                    onChange={(e) => setFormData({...formData, rating: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    min="0"
                    max="5"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploading || !formData.images.length}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {editingProduct ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DÉTAILS PRODUIT (clic sur une ligne) */}
      {showDetailsModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Détails du produit</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Image + infos principales */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <img
                  src={selectedProduct.img || selectedProduct.images?.[0]}
                  alt={selectedProduct.title}
                  className="w-full sm:w-40 h-40 object-cover rounded-lg border shrink-0"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Image'; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold">{selectedProduct.title}</p>
                  <p className="text-2xl font-bold text-primary mt-1">{selectedProduct.prix}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {(() => {
                      const stats = reviewStatsMap[selectedProduct.id];
                      return stats && stats.count > 0 ? (
                        <span className="text-sm text-yellow-500">★ {stats.average.toFixed(1)} ({stats.count} avis)</span>
                      ) : (
                        <span className="text-xs text-gray-400">Aucun avis</span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-gray-400" />
                  <span className="text-gray-500">Catégorie :</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 dark:bg-gray-700">
                    {selectedProduct.category || '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Palette size={16} className="text-gray-400" />
                  <span className="text-gray-500">Couleur :</span>
                  <span className="font-medium">{selectedProduct.color || 'Multiples couleurs'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-500">Ajouté le :</span>
                  <span className="font-medium">{formatDate(selectedProduct.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-gray-400" />
                  <span className="text-gray-500">ID produit :</span>
                  <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    {selectedProduct.id || selectedProduct.originalId || '—'}
                  </span>
                </div>
              </div>

              {/* Galerie d'images */}
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold mb-2">Galerie ({selectedProduct.images.length} image(s))</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Image ${idx + 1}`}
                        className="h-16 w-16 object-cover rounded border"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 border-t dark:border-gray-700 pt-4">
                <button
                  onClick={() => {
                    handleEdit(selectedProduct);
                    setShowDetailsModal(false);
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-2"
                >
                  <Edit size={16} />
                  Modifier
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
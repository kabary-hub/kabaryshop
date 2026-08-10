// src/admin/Categories.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Grid, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import { logActivity } from '../utils/history';
import { showToast } from '../utils/toast';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';
import {
  getAllProducts,
} from '../services/productService';
import {
  getCategories as loadStoredCategories,
  updateCategoryProductCounts as recalcAllCounts,
  PROTECTED_CATEGORY_SLUGS,
} from '../utils/categories';

// Catégories fixes du site (Femmes, Hommes, …) : elles ont une page dédiée
// (/femmes, /hommes, …) — on empêche leur SUPPRESSION pour ne pas casser la
// navigation publique, mais on peut toujours les MODIFIER (nom affiché).
// Le slug est conservé tel quel pour ne pas casser les pages.
const isProtected = (category) =>
  PROTECTED_CATEGORY_SLUGS.includes((category.slug || '').toLowerCase());

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', slug: '' });
  const [loading, setLoading] = useState(true);
  // Catégorie en attente de confirmation de suppression
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Compteurs RÉELS : le nombre de produits est calculé sur le catalogue
  // complet (produits par défaut + personnalisés), pas seulement sur les
  // produits personnalisés comme avant.
  const updateCategoryProductCounts = useCallback(() => {
    return recalcAllCounts(getAllProducts);
  }, []);

  // Charger les catégories (les vraies catégories du site sont créées au
  // premier chargement si rien n'est enregistré)
  const loadCategories = useCallback(() => {
    setLoading(true);
    try {
      const parsed = loadStoredCategories();
      setCategories(parsed);
    } catch {
      // Chargement silencieux : on garde l'état actuel en cas d'erreur
    } finally {
      setLoading(false);
    }
  }, []);

  // Chargement initial
  useEffect(() => {
    loadCategories();
    // Mettre à jour les compteurs après chargement
    setTimeout(() => {
      const updated = updateCategoryProductCounts();
      if (updated) {
        setCategories(updated);
      }
    }, 100);
  }, [loadCategories, updateCategoryProductCounts]);

  // Écouter les changements
  useEffect(() => {
    const handleUpdate = () => {
      loadCategories();
      setTimeout(() => {
        const updated = updateCategoryProductCounts();
        if (updated) {
          setCategories(updated);
        }
      }, 100);
    };

    window.addEventListener('productsUpdated', handleUpdate);
    window.addEventListener('categoriesUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('productsUpdated', handleUpdate);
      window.removeEventListener('categoriesUpdated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadCategories, updateCategoryProductCounts]);

  // Sauvegarder quand les catégories changent
  useEffect(() => {
    if (categories.length > 0 && !loading) {
      localStorage.setItem('categories', JSON.stringify(categories));
    }
  }, [categories, loading]);

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, slug: category.slug });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', slug: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', slug: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Catégorie fixe : on garde le slug existant pour ne pas casser la page dédiée
    const slug =
      editingCategory && isProtected(editingCategory)
        ? editingCategory.slug
        : formData.name.toLowerCase().replace(/\s+/g, '-');
    
    let updatedCategories;
    if (editingCategory) {
      updatedCategories = categories.map(cat => 
        cat.id === editingCategory.id 
          ? { ...cat, name: formData.name, slug: slug }
          : cat
      );
    } else {
      const newCategory = {
        id: Date.now(),
        name: formData.name,
        slug: slug,
        productCount: 0,
        status: 'active'
      };
      updatedCategories = [...categories, newCategory];
    }
    
    setCategories(updatedCategories);
    localStorage.setItem('categories', JSON.stringify(updatedCategories));
    window.dispatchEvent(new Event('categoriesUpdated'));
    window.dispatchEvent(new Event('storage'));
    
    setTimeout(() => {
      const updated = updateCategoryProductCounts();
      if (updated) {
        setCategories(updated);
      }
    }, 100);

    // Journal
    logActivity({
      type: 'category',
      action: editingCategory ? 'modification' : 'création',
      subject: formData.name,
      details: `Slug : ${slug}`,
    });
    
    handleCloseModal();
  };

  const handleDelete = (id) => {
    const target = categories.find(cat => cat.id === id);
    if (target && isProtected(target)) {
      showToast('Impossible de supprimer cette catégorie : elle est fixe et possède une page dédiée du site.', 'warning');
      return;
    }
    // Ouvre la modale de confirmation au lieu de window.confirm
    setCategoryToDelete(target);
  };

  const confirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    const id = categoryToDelete.id;
    const updatedCategories = categories.filter(cat => cat.id !== id);
    setCategories(updatedCategories);
    localStorage.setItem('categories', JSON.stringify(updatedCategories));
    window.dispatchEvent(new Event('categoriesUpdated'));
    window.dispatchEvent(new Event('storage'));
    logActivity({
      type: 'category',
      action: 'suppression',
      subject: categoryToDelete.name,
      details: `Slug : ${categoryToDelete.slug}`,
    });
    // Toast de suppression
    showToast(`La catégorie « ${categoryToDelete.name} » a été supprimée`, 'success');
    setCategoryToDelete(null);
  };

  const handleToggleStatus = (id) => {
    const target = categories.find(cat => cat.id === id);
    const updatedCategories = categories.map(cat =>
      cat.id === id 
        ? { ...cat, status: cat.status === 'active' ? 'inactive' : 'active' }
        : cat
    );
    setCategories(updatedCategories);
    localStorage.setItem('categories', JSON.stringify(updatedCategories));
    window.dispatchEvent(new Event('categoriesUpdated'));
    window.dispatchEvent(new Event('storage'));
    if (target) {
      const newStatus = target.status === 'active' ? 'inactive' : 'active';
      logActivity({
        type: 'category',
        action: newStatus === 'inactive' ? 'désactivation' : 'activation',
        subject: target.name,
        details: `La catégorie est maintenant ${newStatus === 'inactive' ? 'inactive' : 'active'}`,
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Chargement des catégories...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Grid className="text-primary" />
            Catégories Kabary Shop
          </h1>
          <p className="text-gray-500 mt-1">Gestion des catégories de tout les produits</p>
        </div>
        <div className="flex gap-2">
          
          <button 
            onClick={() => handleOpenModal()}
            className="bg-primary px-4 py-2 rounded-lg hover:bg-secondary transition flex items-center gap-2"
          >
            <Plus size={18} />
            Nouvelle catégorie
          </button>
        </div>
      </div>

      {/* Liste des catégories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.length === 0 ? (
          <div className="col-span-full text-center py-10 text-gray-500">
            Aucune catégorie trouvée.
          </div>
        ) : (
          categories.map((category) => (
            <div key={category.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{category.name}</h3>
                  <p className="text-sm text-gray-500">slug: {category.slug}</p>
                  <p className="text-sm mt-2 font-bold text-blue-600">
                    {category.productCount || 0} produits
                  </p>
                  <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                    category.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {category.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {/* Les catégories fixes (5 premières) sont modifiables mais PAS supprimables */}
                  <button
                    onClick={() => handleOpenModal(category)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Modifier la catégorie"
                  >
                    <Edit size={18} />
                  </button>
                  {isProtected(category) ? (
                    <button
                      onClick={() => showToast('Cette catégorie est fixe : elle ne peut pas être supprimée', 'warning')}
                      className="text-gray-400 hover:text-gray-500 cursor-not-allowed"
                      title="Catégorie fixe du site : suppression interdite"
                    >
                      <Trash2 size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Supprimer la catégorie"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <button 
                  onClick={() => handleToggleStatus(category.id)}
                  className={`text-sm ${category.status === 'active' ? 'text-red-600 cursor-pointer border-b-2 hover:text-red-800' : 'text-green-600 hover:text-green-800 border-b-2'}`}
                >
                  {category.status === 'active' ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        open={Boolean(categoryToDelete)}
        title="Supprimer la catégorie ?"
        message={`Êtes-vous sûr de vouloir supprimer la catégorie « ${categoryToDelete?.name || ''} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        danger
        onConfirm={confirmDeleteCategory}
        onCancel={() => setCategoryToDelete(null)}
      />

      {/* Modal Ajout/Modification */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md p-6 mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-red-900">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Nom de la catégorie</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                  placeholder='Ex: Ordinateurs'
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-950"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary rounded-lg hover:bg-secondary flex items-center gap-2"
                >
                  <Check size={18} />
                  {editingCategory ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
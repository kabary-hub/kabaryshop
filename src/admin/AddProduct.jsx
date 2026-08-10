// src/admin/AddProduct.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, ChevronUp, ChevronDown } from 'lucide-react';
import {
  recordPublication,
  notifySubscribersNewProduct,
} from '../utils/subscribers';

// Nombre maximal d'images supplémentaires (5 + 1 principale = 6 au total)
const MAX_EXTRA_IMAGES = 5;

const AddProduct = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category: '',
    color: '',
    images: [],
    rating: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: 'femmes', label: 'Femmes' },
    { value: 'hommes', label: 'Hommes' },
    { value: 'enfants', label: 'Enfants' },
    { value: 'electroniques', label: 'Électroniques' },
    { value: 'meubles', label: 'Meubles' },
    { value: 'tendances', label: 'Tendances' },
    { value: 'ventes', label: 'Ventes' }
  ];

  // ---- Galerie d'images (la première devient l'image principale) ----

  // Ajouter une ligne d'URL vide
  const addExtraImage = () => {
    if (formData.images.length >= MAX_EXTRA_IMAGES) return;
    setFormData({ ...formData, images: [...formData.images, ''] });
  };

  // Réordonner : déplacer une image vers le haut (-1) ou le bas (+1)
  const moveExtraImage = (index, direction) => {
    const images = [...formData.images];
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    [images[index], images[target]] = [images[target], images[index]];
    setFormData({ ...formData, images });
  };

  // Mettre à jour l'URL d'une image supplémentaire
  const updateExtraImage = (index, url) => {
    const images = [...formData.images];
    images[index] = url;
    setFormData({ ...formData, images });
  };

  // Supprimer une image supplémentaire
  const removeExtraImage = (index) => {
    setFormData({ ...formData, images: formData.images.filter((_, i) => i !== index) });
  };

  // Upload local d'une image supplémentaire (base64)
  const handleExtraUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const filledCount = formData.images.filter(u => (u || '').trim()).length;
    if (filledCount >= MAX_EXTRA_IMAGES) {
      setError(`Nombre maximal d'images supplémentaires atteint (${MAX_EXTRA_IMAGES})`);
      return;
    }
    if (!file.type.match('image.*')) {
      setError('Veuillez sélectionner une image valide (PNG, JPG, JPEG)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('L\'image ne doit pas dépasser 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, images: [...formData.images, reader.result] });
      setError('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // La première image remplie de la galerie devient l'image principale
    const galleryImages = formData.images.map((u) => (u || '').trim()).filter(Boolean);

    // Validation des champs obligatoires (au moins une image dans la galerie)
    if (!formData.title || !formData.price || !formData.category || galleryImages.length === 0) {
      setError('Veuillez remplir tous les champs obligatoires et ajouter au moins une image');
      setLoading(false);
      return;
    }
    
    // Validation du prix
    const priceValue = parseInt(formData.price);
    if (isNaN(priceValue) || priceValue <= 0) {
      setError('Le prix doit être un nombre supérieur à 0');
      setLoading(false);
      return;
    }
    
    // Validation de la note
    if (formData.rating && (formData.rating < 0 || formData.rating > 5)) {
      setError('La note doit être comprise entre 0 et 5');
      setLoading(false);
      return;
    }
    
    // Récupérer les produits existants
    const existingProducts = JSON.parse(localStorage.getItem('custom_products') || '[]');
    
    // Créer le nouveau produit
    const newProduct = {
      id: Date.now(),
      title: formData.title,
      priceInGNF: priceValue,
      prix: `${priceValue.toLocaleString()} GNF`,
      category: formData.category,
      color: formData.color || 'Multiples couleurs',
      img: galleryImages[0],
      // Galerie : toutes les images ajoutées (dédupliquées), la 1ère est la principale
      images: [...new Set(galleryImages)],
      // Note par défaut 0 (les vraies notes viennent des avis clients)
      rating: formData.rating ? parseFloat(formData.rating) : 0,
      aosDelay: '0',
      isCustom: true
    };
    
    // Ajouter au tableau
    existingProducts.push(newProduct);
    localStorage.setItem('custom_products', JSON.stringify(existingProducts));
    
    // Déclencher l'événement de mise à jour
    window.dispatchEvent(new Event('productsUpdated'));

    // 📣 Nouveau produit : informer les abonnés (bannière site + email)
    recordPublication(newProduct);
    notifySubscribersNewProduct(newProduct).catch(() => {});
    
    setSuccess('Produit ajouté avec succès !');
    setTimeout(() => {
      navigate('/admin/products');
    }, 2000);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Ajouter un produit</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg border border-red-200">
          <strong>Erreur :</strong> {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg border border-green-200">
          ✅ {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nom du produit */}
        <div>
          <label className="block text-sm font-medium mb-2">Nom du produit *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ex: Chemise élégante"
            required
          />
        </div>
        
        {/* Prix */}
        <div>
          <label className="block text-sm font-medium mb-2">Prix (en GNF) *</label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ex: 150000"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Le prix sera automatiquement converti selon la devise du site</p>
        </div>
        
        {/* Catégorie */}
        <div>
          <label className="block text-sm font-medium mb-2">Catégorie *</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="">Sélectionner une catégorie</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
        
        {/* Couleur */}
        <div>
          <label className="block text-sm font-medium mb-2">Couleur</label>
          <input
            type="text"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ex: Rouge, Bleu, Multiples couleurs"
          />
        </div>
        
        {/* Galerie d'images : la première image devient l'image principale */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Galerie d'images (la première = image principale) *</label>
            <span className="text-xs text-gray-500">{formData.images.filter(u => (u || '').trim()).length} / {MAX_EXTRA_IMAGES}</span>
          </div>
          <div className="space-y-2">
            {formData.images.map((img, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex flex-col shrink-0">
                  <button
                    type="button"
                    onClick={() => moveExtraImage(index, -1)}
                    disabled={index === 0}
                    aria-label="Monter cette image"
                    className="p-0.5 text-gray-400 hover:text-primary transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveExtraImage(index, 1)}
                    disabled={index === formData.images.length - 1}
                    aria-label="Descendre cette image"
                    className="p-0.5 text-gray-400 hover:text-primary transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <span className="w-5 text-xs text-gray-400 shrink-0 text-center">{index + 2}</span>
                {img ? (
                  <img src={img} alt={`Image ${index + 2}`} className="w-12 h-12 object-cover rounded-lg border shrink-0" />
                ) : (
                  <div className="w-12 h-12 border border-dashed rounded-lg shrink-0"></div>
                )}
                <input
                  type="url"
                  value={img}
                  onChange={(e) => updateExtraImage(index, e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm min-w-0"
                  placeholder="https://exemple.com/image.jpg"
                />
                <button
                  type="button"
                  onClick={() => removeExtraImage(index)}
                  aria-label="Supprimer cette image"
                  className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <button
              type="button"
              onClick={addExtraImage}
              disabled={formData.images.length >= MAX_EXTRA_IMAGES}
              className="px-3 py-1.5 border border-dashed rounded-lg text-sm text-gray-500 hover:text-primary hover:border-primary transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Ajouter une image (URL)
            </button>
            <label className="cursor-pointer px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm flex items-center gap-1.5 transition">
              <Upload size={14} />
              Uploader une image
              <input type="file" accept="image/*" onChange={handleExtraUpload} className="hidden" />
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Ajoutez au moins une image. La première de la liste est l'image principale du produit ;
            les flèches ↑ ↓ réordonnent les suivantes (max {MAX_EXTRA_IMAGES}).
          </p>
        </div>
        
        {/* Note */}
        <div>
          <label className="block text-sm font-medium mb-2">Note (0-5)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="5"
            value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ex: 4.5"
          />
          <p className="text-xs text-gray-500 mt-1">Laissez vide si le produit n'a pas encore d'avis</p>
        </div>
        
        {/* Boutons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Ajout en cours...
              </>
            ) : (
              'Ajouter le produit'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
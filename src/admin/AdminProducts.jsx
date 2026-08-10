// src/admin/AdminProducts.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    loadProducts();
  }, []);
  
  const loadProducts = () => {
    // Récupérer les produits personnalisés du localStorage
    const customProducts = JSON.parse(localStorage.getItem('custom_products') || '[]');
    setProducts(customProducts);
  };
  
  const deleteProduct = (id) => {
    if (window.confirm('Supprimer ce produit ?')) {
      const customProducts = JSON.parse(localStorage.getItem('custom_products') || '[]');
      const filtered = customProducts.filter(p => p.id !== id);
      localStorage.setItem('custom_products', JSON.stringify(filtered));
      loadProducts();
      // Déclencher un événement pour mettre à jour l'affichage sur le site
      window.dispatchEvent(new Event('productsUpdated'));
      alert('Produit supprimé avec succès !');
    }
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion des Produits</h1>
        <button
          onClick={() => navigate('/admin/products/add')}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-secondary transition"
        >
          <Plus size={18} />
          Ajouter un produit
        </button>
      </div>
      
      {products.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500">Aucun produit personnalisé pour le moment.</p>
          <button
            onClick={() => navigate('/admin/products/add')}
            className="mt-4 text-primary hover:underline"
          >
            Ajouter votre premier produit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <div key={product.id} className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow hover:shadow-lg transition">
              <img 
                src={product.img} 
                alt={product.title}
                className="w-full h-48 object-cover rounded-lg mb-3"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/300x200?text=Image+non+trouvée';
                }}
              />
              <h3 className="font-semibold text-lg">{product.title}</h3>
              <p className="text-gray-500 text-sm">Catégorie: {product.category}</p>
              <p className="text-primary font-bold mt-2">{product.prix}</p>
              <div className="flex gap-2 mt-3">
                <button 
                  onClick={() => deleteProduct(product.id)}
                  className="text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 size={18} />
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
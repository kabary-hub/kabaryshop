// src/admin/StaffProducts.jsx
// Page « Produits » de l'espace staff — LECTURE SEULE.
// Le staff consulte le catalogue (image, nom, prix, catégorie) sans aucun
// bouton d'action (pas d'ajout, pas de modification, pas de suppression).
import React, { useState, useEffect } from "react";
import { Package, Search } from "lucide-react";
import { getAllProducts } from "../services/productService";

const StaffProducts = () => {
  // Produits chargés de façon synchrone (initialisation paresseuse, tri par date)
  const [products, setProducts] = useState(() => {
    const all = getAllProducts();
    return [...all].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const db = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return db - da;
    });
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [loading] = useState(false);

  useEffect(() => {
    // Recharger les produits quand le catalogue change (événements globaux)
    const handleUpdate = () => {
      const all = getAllProducts();
      setProducts([...all].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const db = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return db - da;
      }));
    };
    window.addEventListener("productsUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("productsUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const filtered = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      (p.title || p.name || "").toLowerCase().includes(term) ||
      (p.category || "").toLowerCase().includes(term)
    );
  });

  const formatPrice = (p) => {
    if (p.prix) return p.prix;
    if (p.priceInGNF) return `${p.priceInGNF.toLocaleString()} GNF`;
    return "Prix sur demande";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="text-blue-600" />
            Produits (lecture seule)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Consultation du catalogue. La gestion des produits est réservée à l'administrateur.
          </p>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative max-w-md mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un produit..."
          className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Package size={40} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">Aucun produit trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition"
            >
              <img
                src={product.img || product.image || "https://via.placeholder.com/300"}
                alt={product.title || product.name}
                className="w-full h-40 object-cover"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/300?text=Image";
                }}
              />
              <div className="p-3">
                <h3 className="font-semibold text-sm truncate">{product.title || product.name}</h3>
                <p className="text-xs text-gray-500 capitalize">{product.category || "—"}</p>
                <p className="mt-1 font-bold text-secondary text-sm">{formatPrice(product)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffProducts;

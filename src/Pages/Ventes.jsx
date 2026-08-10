import React, { useEffect, useState } from "react";
import Products from "../components/Products/products";
import { getAllProducts, filterProductsByTerm } from "../components/Products/products";
import Banner from "../components/Banner/Banner";
import ImgVente from "../assets/background-pages/vente.jpeg";

const Ventes = ({ handleOrder, searchTerm = "" }) => {
  const [ventesProducts, setVentesProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadProducts = () => {
    const allProducts = getAllProducts();
    const filtered = allProducts.filter(item => (item.category || item.categorySlug || "").toLowerCase().trim() === "ventes");
    setVentesProducts(filtered);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
    const handleUpdate = () => loadProducts();
    window.addEventListener('productsUpdated', handleUpdate);
    return () => window.removeEventListener('productsUpdated', handleUpdate);
  }, []);

  // Recherche : filtrer les produits en vente par le terme saisi
  const visibleProducts = filterProductsByTerm(ventesProducts, searchTerm);

  if (loading) {
    return (
      <div className="pt-2">
        <Banner
          title="Grandes Ventes & Promotions"
          subtitle="Profitez de nos meilleures offres sur tout le catalogue. Des réductions exceptionnelles pour vous faire plaisir !"
          bgImage={ImgVente}
        />
        <div className="container mx-auto flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2">
      <Banner
        title="Grandes Ventes & Promotions"
        subtitle="Profitez de nos meilleures offres sur tout le catalogue. Des réductions exceptionnelles pour vous faire plaisir !"
        bgImage={ImgVente}
      />
      <div className="container mx-auto">
        <Products data={visibleProducts} handleOrder={handleOrder} searchTerm={searchTerm} />
      </div>
    </div>
  );
};

export default Ventes;
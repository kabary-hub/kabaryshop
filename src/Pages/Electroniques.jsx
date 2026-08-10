import React, { useEffect, useState } from "react";
import Products from "../components/Products/products";
import { getAllProducts, filterProductsByTerm } from "../components/Products/products";
import Banner from "../components/Banner/Banner";
import ImgElectronique from "../assets/background-pages/electronique.jpeg";

const Electroniques = ({ handleOrder, searchTerm = "" }) => {
  const [electroniquesProducts, setElectroniquesProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadProducts = () => {
    const allProducts = getAllProducts(); // Utiliser getAllProducts
    const filtered = allProducts.filter(item => (item.category || item.categorySlug || "").toLowerCase().trim() === "electroniques");
    setElectroniquesProducts(filtered);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
    const handleUpdate = () => loadProducts();
    window.addEventListener('productsUpdated', handleUpdate);
    return () => window.removeEventListener('productsUpdated', handleUpdate);
  }, []);

  // Recherche : filtrer les produits électroniques par le terme saisi
  const visibleProducts = filterProductsByTerm(electroniquesProducts, searchTerm);

  if (loading) {
    return (
      <div className="pt-2">
        <Banner
          title="High-Tech & Électronique"
          subtitle="Le futur entre vos mains : performance et innovation se trouve chez Kabary Shop"
          bgImage={ImgElectronique}
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
        title="High-Tech & Électronique"
        subtitle="Le futur entre vos mains : performance et innovation se trouve chez Kabary Shop"
        bgImage={ImgElectronique}
      />
      <div className="container mx-auto">
        <Products data={visibleProducts} handleOrder={handleOrder} searchTerm={searchTerm} />
      </div>
    </div>
  );
};

export default Electroniques;
import React, { useEffect, useState } from "react";
import Products from "../components/Products/products";
import { getAllProducts, filterProductsByTerm } from "../components/Products/products";
import Banner from "../components/Banner/Banner";
import ImgEnfant from "../assets/background-pages/enfant.jpeg";

const Enfants = ({ handleOrder, searchTerm = "" }) => {
  const [enfantsProducts, setEnfantsProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadProducts = () => {
    const allProducts = getAllProducts();
    // FILTRER : uniquement les enfants
    const filtered = allProducts.filter(item => (item.category || item.categorySlug || "").toLowerCase().trim() === "enfants");
    setEnfantsProducts(filtered);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
    const handleUpdate = () => loadProducts();
    window.addEventListener('productsUpdated', handleUpdate);
    return () => window.removeEventListener('productsUpdated', handleUpdate);
  }, []);

  // Recherche : filtrer les produits enfants par le terme saisi
  const visibleProducts = filterProductsByTerm(enfantsProducts, searchTerm);

  if (loading) {
    return (
      <div className="pt-10">
        <Banner title="Collection Enfants" subtitle="Mode et confort pour petits et grands" bgImage={ImgEnfant} />
        <div className="container mx-auto flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-10">
      <Banner title="Collection Enfants" subtitle="Mode et confort pour petits et grands" bgImage={ImgEnfant} />
      <div className="container mx-auto">
        <Products data={visibleProducts} handleOrder={handleOrder} searchTerm={searchTerm} />
      </div>
    </div>
  );
};

export default Enfants;
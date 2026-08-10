import React, { useEffect, useState } from "react";
import Products from "../components/Products/products";
import { getAllProducts, filterProductsByTerm } from "../components/Products/products";
import Banner from "../components/Banner/Banner";
import ImgFemme from "../assets/background-pages/women116.jpeg";

const Femmes = ({ handleOrder, searchTerm = "" }) => {
  const [femmesProducts, setFemmesProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadProducts = () => {
    const allProducts = getAllProducts();
    // FILTRAGE STRICT (normalisé : insensible à la casse, comme les autres pages)
    const filtered = allProducts.filter(item => (item.category || item.categorySlug || "").toLowerCase().trim() === "femmes");
    setFemmesProducts(filtered);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
    const handleUpdate = () => loadProducts();
    window.addEventListener('productsUpdated', handleUpdate);
    return () => window.removeEventListener('productsUpdated', handleUpdate);
  }, []);

  // Recherche : filtrer les produits femmes par le terme saisi
  const visibleProducts = filterProductsByTerm(femmesProducts, searchTerm);

  if (loading) {
    return (
      <div className="pt-10">
        <Banner title="Collection Femmes" subtitle="L'élégance et le style au féminin" bgImage={ImgFemme} />
        <div className="container mx-auto flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-10">
      <Banner title="Collection Femmes" subtitle="L'élégance et le style au féminin" bgImage={ImgFemme} />
      <div className="container mx-auto">
        <Products data={visibleProducts} handleOrder={handleOrder} searchTerm={searchTerm} />
      </div>
    </div>
  );
};

export default Femmes;
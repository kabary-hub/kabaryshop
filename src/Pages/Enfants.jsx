import React, { useEffect, useState } from "react";
import Products from "../components/Products/products";
import { getAllProducts, filterProductsByTerm } from "../components/Products/products";
import Banner from "../components/Banner/Banner";
import ImgEnfant from "../assets/background-pages/enfant.jpeg";

const Enfants = ({ handleOrder, searchTerm = "" }) => {
  // Produits chargés de façon synchrone (initialisation paresseuse)
  const [enfantsProducts, setEnfantsProducts] = useState(() =>
    getAllProducts().filter(item => (item.category || item.categorySlug || "").toLowerCase().trim() === "enfants"),
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadProducts = () => {
    const allProducts = getAllProducts();
    // FILTRER : uniquement les enfants
    const filtered = allProducts.filter(item => (item.category || item.categorySlug || "").toLowerCase().trim() === "enfants");
    setEnfantsProducts(filtered);
  };

  useEffect(() => {
    // Recharger les produits quand le catalogue change (événement global)
    const handleUpdate = () => loadProducts();
    window.addEventListener('productsUpdated', handleUpdate);
    return () => window.removeEventListener('productsUpdated', handleUpdate);
  }, []);

  // Recherche : filtrer les produits enfants par le terme saisi
  const visibleProducts = filterProductsByTerm(enfantsProducts, searchTerm);

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
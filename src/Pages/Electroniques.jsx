import React, { useEffect, useState } from "react";
import Products from "../components/Products/products";
import { getAllProducts, filterProductsByTerm } from "../components/Products/products";
import Banner from "../components/Banner/Banner";
import ImgElectronique from "../assets/background-pages/electronique.webp";
import { useSettings } from "../context/SettingsContext";

const Electroniques = ({ handleOrder, searchTerm = "" }) => {
  const { settings } = useSettings();
  // Produits chargés de façon synchrone (initialisation paresseuse)
  const [electroniquesProducts, setElectroniquesProducts] = useState(() =>
    getAllProducts().filter(item => (item.category || item.categorySlug || "").toLowerCase().trim() === "electroniques"),
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadProducts = () => {
    const allProducts = getAllProducts(); // Utiliser getAllProducts
    const filtered = allProducts.filter(item => (item.category || item.categorySlug || "").toLowerCase().trim() === "electroniques");
    setElectroniquesProducts(filtered);
  };

  useEffect(() => {
    // Recharger les produits quand le catalogue change (événement global)
    const handleUpdate = () => loadProducts();
    window.addEventListener('productsUpdated', handleUpdate);
    return () => window.removeEventListener('productsUpdated', handleUpdate);
  }, []);

  // Recherche : filtrer les produits électroniques par le terme saisi
  const visibleProducts = filterProductsByTerm(electroniquesProducts, searchTerm);

  return (
    <div className="pt-2">
      <Banner
        title="High-Tech & Électronique"
        subtitle={`Le futur entre vos mains : performance et innovation se trouve chez ${settings.siteName}`}
        bgImage={ImgElectronique}
      />
      <div className="container mx-auto">
        <Products data={visibleProducts} handleOrder={handleOrder} searchTerm={searchTerm} />
      </div>
    </div>
  );
};

export default Electroniques;
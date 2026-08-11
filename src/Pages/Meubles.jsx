import React, { useEffect, useState } from "react";
import Products from "../components/Products/products";
import { getAllProducts, filterProductsByTerm } from "../components/Products/products";
import Banner from "../components/Banner/Banner";
import ImgMeuble from "../assets/background-pages/meuble.webp";
import { useSettings } from "../context/SettingsContext";

const Meubles = ({ handleOrder, searchTerm = "" }) => {
  const { settings } = useSettings();
  // Produits chargés de façon synchrone (initialisation paresseuse)
  const [meublesProducts, setMeublesProducts] = useState(() =>
    getAllProducts().filter(item => (item.category || item.categorySlug || "").toLowerCase().trim() === "meubles"),
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadProducts = () => {
    const allProducts = getAllProducts(); // Utiliser getAllProducts
    const filtered = allProducts.filter(item => (item.category || item.categorySlug || "").toLowerCase().trim() === "meubles");
    setMeublesProducts(filtered);
  };

  useEffect(() => {
    // Recharger les produits quand le catalogue change (événement global)
    const handleUpdate = () => loadProducts();
    window.addEventListener('productsUpdated', handleUpdate);
    return () => window.removeEventListener('productsUpdated', handleUpdate);
  }, []);

  // Recherche : filtrer les produits meubles par le terme saisi
  const visibleProducts = filterProductsByTerm(meublesProducts, searchTerm);

  return (
    <div className="pt-2">
      <Banner
        title="Meubles en vente, Design & Mobilier"
        subtitle={`Sublimez votre intérieur avec des pièces uniques à leurs genre chez ${settings.siteName}`}
        bgImage={ImgMeuble}
      />
      <div className="container mx-auto">
        <Products data={visibleProducts} handleOrder={handleOrder} searchTerm={searchTerm} />
      </div>
    </div>
  );
};

export default Meubles;
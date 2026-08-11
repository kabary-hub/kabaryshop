import React, { useEffect, useState } from "react";
import Products from "../components/Products/products";
import { getAllProducts, filterProductsByTerm } from "../components/Products/products";
import Banner from "../components/Banner/Banner";
import ImgTendance from "../assets/background-pages/tendance.webp";

const Tendances = ({ handleOrder, searchTerm = "" }) => {
  // Produits chargés de façon synchrone (initialisation paresseuse)
  const [tendancesProducts, setTendancesProducts] = useState(() =>
    getAllProducts().filter(item => (item.category || item.categorySlug || "").toLowerCase().trim() === "tendances"),
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadProducts = () => {
    const allProducts = getAllProducts();
    const filtered = allProducts.filter(item => (item.category || item.categorySlug || "").toLowerCase().trim() === "tendances");
    setTendancesProducts(filtered);
  };

  useEffect(() => {
    // Recharger les produits quand le catalogue change (événement global)
    const handleUpdate = () => loadProducts();
    window.addEventListener('productsUpdated', handleUpdate);
    return () => window.removeEventListener('productsUpdated', handleUpdate);
  }, []);

  // Recherche : filtrer les produits tendances par le terme saisi
  const visibleProducts = filterProductsByTerm(tendancesProducts, searchTerm);

  return (
    <div className="pt-10">
      <Banner
        title="Nouvelles tendances"
        subtitle="Découvrez les articles les plus prisés du moment"
        bgImage={ImgTendance}
      />
      <div className="container mx-auto">
        <Products data={visibleProducts} handleOrder={handleOrder} searchTerm={searchTerm} />
      </div>
    </div>
  );
};

export default Tendances;
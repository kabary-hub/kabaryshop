import React, { useEffect, useState } from "react";
import Products from "../components/Products/products";
import { getAllProducts, filterProductsByTerm } from "../components/Products/products";
import Banner from "../components/Banner/Banner";
import ImgTendance from "../assets/background-pages/tendance.jpeg";

const Tendances = ({ handleOrder, searchTerm = "" }) => {
  const [tendancesProducts, setTendancesProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadProducts = () => {
    const allProducts = getAllProducts();
    const filtered = allProducts.filter(item => (item.category || item.categorySlug || "").toLowerCase().trim() === "tendances");
    setTendancesProducts(filtered);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
    const handleUpdate = () => loadProducts();
    window.addEventListener('productsUpdated', handleUpdate);
    return () => window.removeEventListener('productsUpdated', handleUpdate);
  }, []);

  // Recherche : filtrer les produits tendances par le terme saisi
  const visibleProducts = filterProductsByTerm(tendancesProducts, searchTerm);

  if (loading) {
    return (
      <div className="pt-10">
        <Banner
          title="Nouvelles tendances"
          subtitle="Découvrez les articles les plus prisés du moment"
          bgImage={ImgTendance}
        />
        <div className="container mx-auto flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

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
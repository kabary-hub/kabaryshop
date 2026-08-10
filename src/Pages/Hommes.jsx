import React, { useEffect, useState } from "react";
import Products from "../components/Products/products";
import { getAllProducts, filterProductsByTerm } from "../components/Products/products";
import Banner from "../components/Banner/Banner";
import ImgHomme from "../assets/background-pages/homme.jpeg";

const Hommes = ({ handleOrder, searchTerm = "" }) => {
  // Produits chargés de façon synchrone (initialisation paresseuse)
  const [hommesProducts, setHommesProducts] = useState(() =>
    getAllProducts().filter(item => (item.category || item.categorySlug || "").toLowerCase().trim() === "hommes"),
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadProducts = () => {
    const allProducts = getAllProducts();
    const filtered = allProducts.filter(item => (item.category || item.categorySlug || "").toLowerCase().trim() === "hommes");
    setHommesProducts(filtered);
  };

  useEffect(() => {
    // Recharger les produits quand le catalogue change (événement global)
    const handleUpdate = () => loadProducts();
    window.addEventListener('productsUpdated', handleUpdate);
    return () => window.removeEventListener('productsUpdated', handleUpdate);
  }, []);

  // Recherche : filtrer les produits hommes par le terme saisi
  const visibleProducts = filterProductsByTerm(hommesProducts, searchTerm);

  return (
    <div className="pt-2">
      <Banner 
        title="Collection Hommes" 
        subtitle="Le style au masculin, élégant et moderne"
        bgImage={ImgHomme}
      />
      <div className="container mx-auto">
        <Products data={visibleProducts} handleOrder={handleOrder} searchTerm={searchTerm} />
      </div>
    </div>
  );
};

export default Hommes;
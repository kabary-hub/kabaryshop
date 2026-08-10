import React, { useEffect, useState, lazy, Suspense } from "react";
import AOS from "aos";
import Hero from "../components/Hero/Hero";
import Products from "../components/Products/products";
import TopProducts from "../components/TopProducts/TopProducts";
import Wintersale from "../components/Wintersale/Wintersale";
import Subscribe from "../components/Subscribe/Subrscribe";
import { getAllProducts, filterProductsByTerm } from "../components/Products/products";

// 🔥 Code-splitting : react-slick (lourd) n'est chargé que si la page d'accueil
// est visitée, et pas dans le chunk initial.
const Testimonial = lazy(() => import("../components/Testimonial/Testimonial"));

// Testimonial étant chargé en lazy (après AOS.init), on rafraîchit AOS
// à son montage pour que ses animations data-aos se déclenchent.
const LazyTestimonial = () => {
  React.useEffect(() => {
    const timer = setTimeout(() => AOS.refresh(), 50);
    return () => clearTimeout(timer);
  }, []);
  return (
    <Suspense fallback={null}>
      <Testimonial />
    </Suspense>
  );
};

const Home = ({ handleOrder, searchTerm = "" }) => {
  const [homeProducts, setHomeProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadProducts = () => {
    const allProducts = getAllProducts();
    // Afficher les 10 produits les plus récents (toutes catégories confondues)
    const latestProducts = allProducts.slice(0, 10);
    setHomeProducts(latestProducts);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
    const handleUpdate = () => loadProducts();
    window.addEventListener('productsUpdated', handleUpdate);
    return () => window.removeEventListener('productsUpdated', handleUpdate);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Recherche : si un terme est saisi, chercher dans TOUS les produits du site
  const visibleProducts = searchTerm.trim()
    ? filterProductsByTerm(getAllProducts(), searchTerm)
    : homeProducts;

  return (
    <>
      <Hero handleOrder={handleOrder} />
      <Products data={visibleProducts} handleOrder={handleOrder} searchTerm={searchTerm} />
      <TopProducts handleOrder={handleOrder} />
      <Wintersale />
      <Subscribe />
      <LazyTestimonial />
    </>
  );
};

export default Home;

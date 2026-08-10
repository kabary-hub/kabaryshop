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
  // Produits chargés de façon synchrone (initialisation paresseuse)
  const [homeProducts, setHomeProducts] = useState(() => getAllProducts().slice(0, 10));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const loadProducts = () => {
    const allProducts = getAllProducts();
    // Afficher les 10 produits les plus récents (toutes catégories confondues)
    const latestProducts = allProducts.slice(0, 10);
    setHomeProducts(latestProducts);
  };

  useEffect(() => {
    // Recharger les produits quand le catalogue change (événement global)
    const handleUpdate = () => loadProducts();
    window.addEventListener('productsUpdated', handleUpdate);
    return () => window.removeEventListener('productsUpdated', handleUpdate);
  }, []);

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

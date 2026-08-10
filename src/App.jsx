// src/App.jsx
import Navbar from "./components/Navbar/Navbar";
import AOS from "aos";
import "aos/dist/aos.css";
import Footer from "./components/Footer/Footer";
import Popup from "./components/Popup/Popup";
import React, { useState, useEffect, lazy, Suspense } from "react";

import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { UserProvider } from './context/UserContext';
import { logActivity } from './utils/history';
import { updatePageMeta } from './utils/seo';
import { getAllProducts } from './services/productService';
// Synchronisation multi-appareils (Supabase). Ne fait rien si Supabase
// n'est pas configuré : le site reste 100 % local.
// Chargé en lazy pour ne pas gonfler le bundle initial avec supabase-js.
const SyncProvider = lazy(() => import('./services/SyncProvider'));

// 🔥 Code-splitting : chaque page est chargée à la demande (lazy)
// → le chunk initial est beaucoup plus léger, les autres sont chargés
// uniquement quand l'utilisateur visite la page correspondante.
const Home = lazy(() => import("./Pages/Maison"));
const Enfants = lazy(() => import("./Pages/Enfants"));
const Femmes = lazy(() => import("./Pages/Femmes"));
const Hommes = lazy(() => import("./Pages/Hommes"));
const Electroniques = lazy(() => import("./Pages/Electroniques"));
const Meubles = lazy(() => import("./Pages/Meubles"));
const Tendances = lazy(() => import("./Pages/Tendances"));
const Ventes = lazy(() => import("./Pages/Ventes"));
const Notes = lazy(() => import("./Pages/Notes"));
const Contacts = lazy(() => import("./Pages/Contacts"));
const CategoryProducts = lazy(() => import("./Pages/CategoryProducts"));
const SearchResults = lazy(() => import("./Pages/SearchResults"));
const ProductDetail = lazy(() => import("./Pages/ProductDetail"));

// Importation des composants admin (chargés à la demande aussi)
const AdminLayout = lazy(() => import("./admin/AdminLayout"));
const AdminLogin = lazy(() => import("./admin/AdminLogin"));
const Dashboard = lazy(() => import("./admin/Dashboard"));
const Products = lazy(() => import("./admin/Products"));
const Orders = lazy(() => import("./admin/Orders"));
const ProtectedRoute = lazy(() => import("./admin/ProtectedRoute"));
const StaffProtectedRoute = lazy(() =>
  import("./admin/ProtectedRoute").then((m) => ({ default: m.StaffProtectedRoute })),
);
const Users = lazy(() => import("./admin/Users"));
const Categories = lazy(() => import("./admin/Categories"));
const Analytics = lazy(() => import("./admin/Analytics"));
const Settings = lazy(() => import("./admin/Settings"));
const Reviews = lazy(() => import("./admin/Reviews"));
const Subscribers = lazy(() => import("./admin/Subscribers"));
const History = lazy(() => import("./admin/History"));
// Espace staff (livreurs / préparateurs)
const StaffLayout = lazy(() => import("./admin/StaffLayout"));
const StaffOrders = lazy(() => import("./admin/StaffOrders"));
const StaffProducts = lazy(() => import("./admin/StaffProducts"));
const StaffSettings = lazy(() => import("./admin/StaffSettings"));
import NewsletterBanner from "./components/NewsletterBanner/NewsletterBanner";
import WhatsAppButton from "./components/WhatsAppButton/WhatsAppButton";

// Importation des styles admin
import "./admin/admin.css";

// IMPORTANT: Importer le SettingsProvider
import { SettingsProvider, useSettings } from "./context/SettingsContext";

// IMPORTANT: Importer le CartProvider et Cart
import { CartProvider } from "./context/CartContext";
import Cart from "./components/Cart/Cart";

// Navbar publique du site : masquée dans l'espace staff (le staff a sa
// propre navbar interne avec Commandes / Produits / Paramètres).
const SiteNavbar = (props) => {
  const { pathname } = useLocation();
  if (pathname.startsWith("/staff")) return null;
  return <Navbar {...props} />;
};

// ===== SEO : titre + description + canonical uniques par page =====
// Permet au site d'apparaître dans les résultats de recherche (Google…)
// avec des titres pertinents par catégorie au lieu d'un titre générique.
const CATEGORY_SEO = {
  femmes: { title: 'Mode Femmes', desc: 'Vêtements et accessoires pour femmes — robes, talons, tenues tendance. Livraison rapide à Conakry.' },
  hommes: { title: 'Mode Hommes', desc: 'Costumes, chemises et tenues pour hommes — élégance et qualité. Livraison rapide à Conakry.' },
  enfants: { title: 'Mode Enfants', desc: 'Vêtements doux et résistants pour enfants — qualité garantie Kabary Shop. Livraison rapide à Conakry.' },
  electroniques: { title: 'Électroniques', desc: 'Téléphones, accessoires et appareils électroniques — dernières nouveautés au meilleur prix.' },
  meubles: { title: 'Meubles', desc: 'Lits, matelas orthopédiques et meubles de qualité pour équiper votre maison. Livraison à Conakry.' },
  tendances: { title: 'Tendances', desc: 'Nouvelles collections et pièces tendance de la saison chez Kabary Shop.' },
  ventes: { title: 'Ventes & Promotions', desc: 'Soldes et promotions exclusives — jusqu\'à -75 % sur une sélection d\'articles.' },
};

const RouteMeta = () => {
  const { pathname } = useLocation();
  const { settings } = useSettings();

  React.useEffect(() => {
    const siteName = settings.siteName || 'Kabary Shop';

    // Zone admin / staff : ne pas indexer
    if (pathname.startsWith('/admin') || pathname.startsWith('/staff')) {
      updatePageMeta({
        title: `Administration - ${siteName}`,
        path: pathname,
      });
      return;
    }

    // Page produit : titre avec le nom du produit
    const productMatch = pathname.match(/^\/produit\/(.+)$/);
    if (productMatch) {
      const product = getAllProducts().find((p) => String(p.id) === String(productMatch[1]));
      updatePageMeta({
        title: product
          ? `${product.title} - ${siteName}`
          : `Produit - ${siteName}`,
        description: product
          ? `${product.title} — disponible chez ${siteName}. Livraison rapide à Conakry, paiement Mobile Money.`
          : undefined,
        path: pathname,
      });
      return;
    }

    // Catégorie connue
    const clean = pathname.replace(/^\//, '').split('/')[0];
    const category = CATEGORY_SEO[clean];
    if (category) {
      updatePageMeta({
        title: `${category.title} - ${siteName}`,
        description: category.desc,
        path: pathname,
      });
      return;
    }

    // Recherche
    if (pathname.startsWith('/recherche')) {
      updatePageMeta({
        title: `Recherche - ${siteName}`,
        description: `Recherchez un produit dans la boutique ${siteName}.`,
        path: pathname,
      });
      return;
    }

    // Contacts / Notes / autres
    const pageNames = {
      contacts: { title: 'Contact', desc: `Contactez ${siteName} : WhatsApp, téléphone et adresse.` },
      notes: { title: 'Notes', desc: `Notes et informations sur ${siteName}.` },
    };
    const page = pageNames[clean];
    if (page) {
      updatePageMeta({
        title: `${page.title} - ${siteName}`,
        description: page.desc,
        path: pathname,
      });
      return;
    }

    // Accueil / défaut
    updatePageMeta({
      title: `${siteName} — Boutique en ligne en Guinée`,
      description: `Mode femmes, hommes, enfants, électronique, meubles et tendances. Livraison rapide 24h/48h à Conakry, paiement Mobile Money.`,
      path: pathname,
    });
  }, [pathname, settings.siteName]);

  return null;
};

// Journalise les visites de pages (toutes les pages du site)
// Variable module : résiste au double-montage de StrictMode en développement
let lastLoggedPath = null;
const PageVisitTracker = () => {
  const { pathname } = useLocation();

  React.useEffect(() => {
    if (pathname === lastLoggedPath) return;
    lastLoggedPath = pathname;

    // Acteur : utilisateur admin connecté, sinon visiteur
    let actor = { name: "Visiteur", role: "public" };
    try {
      const u = JSON.parse(localStorage.getItem("current_admin_user") || "null");
      if (u && u.name) actor = u;
    } catch {
      // stockage indisponible
    }

    const pageLabel =
      pathname === "/"
        ? "Accueil"
        : pathname.startsWith("/admin")
          ? "Administration"
          : pathname.replace(/^\//, "").split("/")[0] || "Accueil";

    logActivity({
      type: "page",
      action: "visite",
      subject: pathname,
      details: `Page visitée : ${pageLabel}`,
      actor,
    });
  }, [pathname]);

  return null;
};

// Fallback affiché pendant le chargement d'une page (code-splitting)
const PageLoader = () => (
  <div className="flex justify-center items-center min-h-[60vh]">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-gray-500">Chargement...</p>
    </div>
  </div>
);

// Enveloppe les pages chargées en lazy : AOS n'observe que les éléments
// présents au moment de AOS.init() (montage de l'app). Les pages montées
// plus tard (code-splitting) doivent appeler AOS.refresh() après leur
// montage, sinon les animations data-aos ne se déclenchent jamais.
const LazyPage = ({ children }) => {
  // [] : au montage uniquement (la page est démontée/remontée à chaque
  // navigation, donc le refresh rejouera à chaque nouvelle visite).
  React.useEffect(() => {
    const timer = setTimeout(() => AOS.refresh(), 50);
    return () => clearTimeout(timer);
  }, []);
  return children;
};

const App = () => {
  const [orderPopup, setOrderPopup] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const handleOpenCartCheckout = () => {
      setSelectedProduct(null);
      setOrderPopup(true);
    };
    window.addEventListener('openCartCheckout', handleOpenCartCheckout);
    return () => window.removeEventListener('openCartCheckout', handleOpenCartCheckout);
  }, []);

  const handleOrder = (product) => {
    setSelectedProduct(product);
    setOrderPopup(true);
  };

  useEffect(() => {
    AOS.init({
      offset: 100,
      duration: 800,
      easing: "ease-in-sine",
      delay: 100,
    });
    AOS.refresh();
  }, []);

  // 🔐 Raccourci clavier secret : Ctrl+Shift+A (ou Cmd+Shift+A sur Mac)
  // → Redirige vers la page de connexion admin
  useEffect(() => {
    const handleSecretShortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        window.location.href = '/admin/login';
      }
    };
    window.addEventListener('keydown', handleSecretShortcut);
    return () => window.removeEventListener('keydown', handleSecretShortcut);
  }, []);

  return (
    <SettingsProvider>
      <CartProvider>
        <UserProvider>
        <Router>
          <div className="dark:bg-gray-900 dark:text-white min-h-screen">
            {/* SEO : titre + description + canonical par page */}
            <RouteMeta />
            {/* Journalise les visites de toutes les pages */}
            <PageVisitTracker />
            {/* Synchronisation des données entre appareils (Supabase) */}
            <Suspense fallback={null}>
              <SyncProvider />
            </Suspense>
            <SiteNavbar
              handleOrderPopup={handleOrder}
              setSearchTerm={setSearchTerm}
              searchTerm={searchTerm}
            />
            
            <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Page d'accueil */}
              <Route
                path="/"
                element={
                  <LazyPage>
                    <Home
                      handleOrder={handleOrder}
                      searchTerm={searchTerm}
                    />
                  </LazyPage>
                }
              />

              {/* Mes pages statiques */}
              <Route path="/femmes" element={<LazyPage><Femmes handleOrder={handleOrder} searchTerm={searchTerm} /></LazyPage>} />
              <Route path="/enfants" element={<LazyPage><Enfants handleOrder={handleOrder} searchTerm={searchTerm} /></LazyPage>} />
              <Route path="/hommes" element={<LazyPage><Hommes handleOrder={handleOrder} searchTerm={searchTerm} /></LazyPage>} />
              <Route path="/electroniques" element={<LazyPage><Electroniques handleOrder={handleOrder} searchTerm={searchTerm} /></LazyPage>} />
              <Route path="/meubles" element={<LazyPage><Meubles handleOrder={handleOrder} searchTerm={searchTerm} /></LazyPage>} />
              <Route path="/tendances" element={<LazyPage><Tendances handleOrder={handleOrder} searchTerm={searchTerm} /></LazyPage>} />
              <Route path="/ventes" element={<LazyPage><Ventes handleOrder={handleOrder} searchTerm={searchTerm} /></LazyPage>} />
              <Route path="/notes" element={<LazyPage><Notes /></LazyPage>} />
              <Route path="/contacts" element={<LazyPage><Contacts /></LazyPage>} />

              {/* Recherche globale */}
              <Route
                path="/recherche"
                element={
                  <LazyPage>
                    <SearchResults
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      handleOrder={handleOrder}
                    />
                  </LazyPage>
                }
              />

              {/* Page détail produit */}
              <Route path="/produit/:id" element={<LazyPage><ProductDetail handleOrder={handleOrder} /></LazyPage>} />

              {/* Route dynamique pour les catégories */}
              <Route path="/:categorySlug" element={<LazyPage><CategoryProducts handleOrder={handleOrder} searchTerm={searchTerm} /></LazyPage>} />

              {/* Espace staff (livreurs / préparateurs) */}
              <Route
                path="/staff"
                element={
                  <LazyPage>
                    <StaffProtectedRoute>
                      <StaffLayout />
                    </StaffProtectedRoute>
                  </LazyPage>
                }
              >
                <Route index element={<Navigate to="/staff/orders" replace />} />
                <Route path="orders" element={<LazyPage><StaffOrders /></LazyPage>} />
                <Route path="products" element={<LazyPage><StaffProducts /></LazyPage>} />
                <Route path="settings" element={<LazyPage><StaffSettings /></LazyPage>} />
              </Route>

              {/* Routes d'administration */}
              <Route path="/admin/login" element={<LazyPage><AdminLogin /></LazyPage>} />
              
              <Route path="/admin" element={
                <LazyPage>
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                </LazyPage>
              }>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="reviews" element={<Reviews />} />
                <Route path="orders" element={<Orders />} />
                <Route path="users" element={<Users />} />
                <Route path="categories" element={<Categories />} />
                <Route path="analytics" element={<Analytics />} />   
                <Route path="settings" element={<Settings />} />
                <Route path="subscribers" element={<Subscribers />} />
                <Route path="history" element={<History />} />
              </Route>
            </Routes>
            </Suspense>
            
            <Footer />
            
            <Popup 
              orderPopup={orderPopup} 
              setOrderPopup={setOrderPopup} 
              selectedProduct={selectedProduct}
            />
            
            {/* Composant Panier */}
            <Cart />
            
            {/* Bannière Nouveautés pour les abonnés */}
            <NewsletterBanner />

            {/* Bouton WhatsApp flottant (contact client en un tap) */}
            <WhatsAppButton />
          </div>
        </Router>
        </UserProvider>
      </CartProvider>
    </SettingsProvider>
  );
};

export default App;
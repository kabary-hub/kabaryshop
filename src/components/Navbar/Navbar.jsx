// src/components/Navbar/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import Logo from "../../assets/Logo.webp";
import { FaCartShopping } from "react-icons/fa6";
import { FaCaretDown, FaHome } from "react-icons/fa";
import { IoMenu, IoClose } from "react-icons/io5";
import DarkMode from "../DarkMode";
import { useSettings } from "../../context/SettingsContext";
import { useCart } from "../../context/CartContext";
import SearchBar from "../SearchBar/SearchBar";
import { getCategories } from "../../utils/categories";

const DropdownLinks = [
  { id: 1, name: "Nouvelles - Tendances ", link: "/tendances" },
  { id: 2, name: "Plus Vendu", link: "/ventes" },
  { id: 3, name: "Notes", link: "/notes" },
  { id: 4, name: "Contacts", link: "/contacts" },
];

// Liens supplémentaires du menu mobile (pages hors catégories)
const MobileMenuExtras = [
  { id: "notes", name: "Notes", link: "/notes" },
  { id: "contacts", name: "Contacts", link: "/contacts" },
];

const Navbar = ({ setSearchTerm, searchTerm = "" }) => {
  const { settings } = useSettings();
  const { openCart, getTotalItems } = useCart();
  const { pathname } = useLocation();
  // Catégories chargées de façon synchrone (initialisation paresseuse)
  const [categories, setCategories] = useState(() => {
    try {
      // Source unique : les catégories réelles du site (créées au premier
      // chargement si rien n'est enregistré)
      const parsedCategories = getCategories();
      return parsedCategories.filter(cat => cat.status === 'active');
    } catch {
      // Menu sans catégories en cas de stockage illisible
      return [];
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const loadCategories = () => {
    try {
      // Source unique : les catégories réelles du site (créées au premier
      // chargement si rien n'est enregistré)
      const parsedCategories = getCategories();
      const activeCategories = parsedCategories.filter(cat => cat.status === 'active');
      setCategories(activeCategories);
    } catch {
      // On conserve les catégories déjà affichées en cas d'erreur
    }
  };

  useEffect(() => {
    // Recharger les catégories quand elles changent (événements globaux)
    const handleUpdate = () => {
      loadCategories();
    };

    window.addEventListener('categoriesUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('productsUpdated', handleUpdate);

    return () => {
      window.removeEventListener('categoriesUpdated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('productsUpdated', handleUpdate);
    };
  }, []);

  // Fermer les menus quand on change de page
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  // Construire le menu dynamique — « Accueil » porte une petite icône pour se
  // distinguer des autres pages (catégories).
  const menuItems = [
    { id: 1, name: "Accueil", link: "/", isHome: true },
    ...categories.map(cat => ({
      id: `cat-${cat.id}`,
      name: cat.name,
      link: `/${cat.slug}`,
      isCategory: true
    }))
  ];

  const linkClass = ({ isActive }) =>
    `inline-block px-2 py-1 text-sm sm:text-base duration-200 border-b-2 whitespace-nowrap ${
      isActive
        ? "text-secondary border-primary font-semibold"
        : "border-transparent hover:text-primary hover:border-primary/50"
    }`;

  return (
    <header className="sticky top-0 z-[60] shadow-md bg-white dark:bg-gray-900 dark:text-white duration-200">
      {/* Bandeau supérieur : logo + recherche (desktop) + actions */}
      <div className="bg-linear-to-r from-primary/70 to-secondary pt-[env(safe-area-inset-top)]">
        <div className="container flex justify-between items-center gap-1 sm:gap-4 px-2.5 sm:px-10 2xl:px-16 py-2">
          <Link
            to="/"
            className="font-bold text-lg sm:text-3xl flex items-center gap-2 shrink-0 min-w-0"
          >
            {/* Logo : celui des paramètres admin s'il existe, sinon le logo par défaut */}
            {settings.siteLogo ? (
              <img src={settings.siteLogo} alt="Logo" className="w-8 sm:w-9 rounded-full object-cover" />
            ) : (
              <img src={Logo} alt="Logo" className="w-7 sm:w-8" />
            )}
            <span className="truncate">{settings.siteName}</span>
          </Link>

          {/* Barre de recherche (desktop) */}
          <div className="hidden sm:block flex-1 max-w-md xl:max-w-xl 2xl:max-w-2xl mx-auto">
            <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          </div>

          {/* Actions : panier, mode sombre, menu mobile */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <button
              onClick={openCart}
              className="relative bg-white text-secondary py-1 px-2 sm:px-4 rounded-full flex items-center h-9 gap-2 group"
              aria-label="Ouvrir le panier"
            >
              <span className="hidden lg:block">Panier</span>
              <FaCartShopping className="text-xl text-secondary drop-shadow-sm cursor-pointer" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {getTotalItems()}
                </span>
              )}
            </button>

            <DarkMode />

            {/* Bouton menu mobile */}
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="lg:hidden p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {mobileMenuOpen ? (
                <IoClose className="text-2xl" />
              ) : (
                <IoMenu className="text-2xl" />
              )}
            </button>
          </div>
        </div>

        {/* Barre de recherche (mobile) */}
        <div className="sm:hidden px-3 pb-3">
          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </div>
      </div>

      {/* Ligne du menu : catégories */}
      <div className="flex justify-center px-3 sm:px-4 py-1">
        <div className="w-full max-w-[min(96rem,calc(100%-4rem))] 2xl:max-w-[min(120rem,calc(100%-4rem))]">
          <ul className="flex items-center gap-x-4 gap-y-1 overflow-x-auto no-scrollbar sm:overflow-visible sm:flex-wrap sm:justify-center">
            {menuItems.map((data) => (
              <li key={data.id} className="shrink-0">
                <NavLink to={data.link} className={linkClass}>
                  {data.isHome && (
                    <FaHome className="inline mr-1 text-primary text-xs sm:text-sm" aria-hidden="true" />
                  )}
                  {data.name}
                </NavLink>
              </li>
            ))}

            {/* Menu déroulant « Produits tendances » (desktop) */}
            <li className="hidden sm:block group relative">
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-1 px-2 py-1 text-sm sm:text-base whitespace-nowrap"
              >
                Produits tendances
                <FaCaretDown
                  className={`transition-all duration-200 ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`absolute z-40 w-[180px] rounded-md bg-white p-2 text-black shadow-md ${
                  dropdownOpen ? "block" : "hidden group-hover:block"
                }`}
              >
                <ul>
                  {DropdownLinks.map((data) => (
                    <li key={data.id}>
                      <NavLink
                        to={data.link}
                        onClick={() => setDropdownOpen(false)}
                        className="inline-block w-full rounded-md p-2 hover:bg-primary/20"
                      >
                        {data.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            </li>

          </ul>
        </div>
      </div>

      {/* Menu mobile (hamburger) : catégories dynamiques du site */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pb-[env(safe-area-inset-bottom)]">
          <div className="px-4 py-3 space-y-1 max-h-[70vh] overflow-y-auto overscroll-contain">
            {[...menuItems, ...MobileMenuExtras].map((data) => (
              <NavLink
                key={data.id}
                to={data.link}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/15 text-secondary"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`
                }
              >
                {data.isHome && (
                  <FaHome className="text-primary" aria-hidden="true" />
                )}
                {data.name}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

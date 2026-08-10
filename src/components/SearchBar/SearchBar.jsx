// src/components/SearchBar/SearchBar.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IoMdSearch } from "react-icons/io";
import { IoClose, IoSearchOutline } from "react-icons/io5";
import { getAllProducts, filterProductsByTerm } from "../Products/products";
import { useSettings } from "../../context/SettingsContext";
import { convertPrice, formatPrice } from "../../utils/currencyUtils";

// Placeholder adapté à la page active
const placeholderMap = {
  "/": "Rechercher un produit...",
  "/femmes": "Rechercher dans la mode Femmes...",
  "/hommes": "Rechercher dans la mode Hommes...",
  "/enfants": "Rechercher dans la mode Enfants...",
  "/electroniques": "Rechercher dans l'Électronique...",
  "/meubles": "Rechercher dans les Meubles...",
  "/tendances": "Rechercher dans les Tendances...",
  "/ventes": "Rechercher dans les Ventes...",
  "/notes": "Rechercher sur tout le site...",
  "/contacts": "Rechercher sur tout le site...",
};

const getPagePlaceholder = (pathname) => {
  if (pathname.startsWith("/admin")) return "Rechercher...";
  if (placeholderMap[pathname]) return placeholderMap[pathname];
  return "Rechercher dans cette catégorie...";
};

// Pages qui filtrent leurs produits en direct (les autres utilisent /recherche)
const isProductPage = (pathname) =>
  !pathname.startsWith("/admin") &&
  !["/notes", "/contacts", "/recherche"].includes(pathname);

const SearchBar = ({ searchTerm, setSearchTerm, className = "", autoFocus = false }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const term = (searchTerm || "").trim();
  const allResults = React.useMemo(
    () => (term ? filterProductsByTerm(getAllProducts(), term) : []),
    [term]
  );
  const suggestions = allResults.slice(0, 6);
  const totalCount = allResults.length;
  const placeholder = getPagePlaceholder(pathname);

  // Fermer le menu quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fermer le menu quand on change de page
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  const goToGlobalResults = (q) => {
    setOpen(false);
    navigate(`/recherche?q=${encodeURIComponent(q)}`);
  };

  const runSearch = (q) => {
    setOpen(false);
    if (!isProductPage(pathname)) {
      navigate(`/recherche?q=${encodeURIComponent(q)}`);
    } else {
      // Sur une page produits, le filtre en direct est déjà appliqué : on fait défiler
      document
        .getElementById("produits-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!term) return;
    runSearch(term);
  };

  const handlePick = (title) => {
    setSearchTerm(title);
    if (!isProductPage(pathname)) {
      goToGlobalResults(title);
    } else {
      setOpen(false);
    }
  };

  const getFormattedPrice = (product) => {
    if (!product.priceInGNF || product.priceInGNF === 0) return "Prix sur demande";
    return formatPrice(
      convertPrice(product.priceInGNF, settings.currency),
      settings.currency
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      ref={wrapRef}
      role="search"
      className={`relative w-full ${className}`}
    >
      <div className="relative">
        <input
          type="text"
          value={searchTerm || ""}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label="Rechercher"
          className="w-full bg-white text-gray-800 rounded-full border border-gray-300 pl-10 pr-9 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all duration-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500"
        />
        <IoMdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none" />
        {searchTerm ? (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setOpen(false);
            }}
            aria-label="Effacer la recherche"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            <IoClose className="text-lg" />
          </button>
        ) : null}
      </div>

      {/* Suggestions en direct */}
      {open && term && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {suggestions.length > 0 ? (
            <ul className="max-h-72 overflow-y-auto py-1">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(p.title)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <img
                      src={p.img}
                      alt={p.title}
                      loading="lazy"
                      decoding="async"
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate">
                        {p.title}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {p.category}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-primary whitespace-nowrap">
                      {getFormattedPrice(p)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              Aucun produit trouvé pour « {term} »
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              if (term) goToGlobalResults(term);
            }}
            className="w-full flex items-center justify-center gap-2 border-t border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <IoSearchOutline className="text-base" />
            Voir tous les résultats ({totalCount})
          </button>
        </div>
      )}
    </form>
  );
};

export default SearchBar;

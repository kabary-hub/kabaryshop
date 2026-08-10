// src/Pages/SearchResults.jsx
import React, { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Products from "../components/Products/products";
import { getAllProducts, filterProductsByTerm } from "../components/Products/products";
import { IoMdSearch } from "react-icons/io";

const SearchResults = ({ searchTerm, setSearchTerm, handleOrder }) => {
  const [searchParams] = useSearchParams();
  const urlQ = searchParams.get("q");
  // Le terme tapé dans la barre fait foi ; l'URL sert au sync initial (deep link)
  const q = searchTerm || "";

  // Synchroniser le terme de recherche avec l'URL (deep link)
  useEffect(() => {
    if (urlQ && urlQ !== searchTerm) {
      setSearchTerm(urlQ);
    }
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQ]);

  const results = filterProductsByTerm(getAllProducts(), q);

  return (
    <div className="pt-4">
      {/* En-tête de la page */}
      <div className="bg-gradient-to-r from-primary/15 to-secondary/15 border-b border-yellow-600">
        <div className="container mx-auto px-4 py-10 sm:py-12 text-center">
          <div className="flex items-center justify-center gap-2 text-primary mb-3">
            <IoMdSearch className="text-2xl" />
            <p className="text-sm font-bold uppercase tracking-widest">Recherche</p>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold">
            {q ? (
              <>
                Résultats pour « <span className="text-secondary">{q}</span> »
              </>
            ) : (
              "Rechercher un produit"
            )}
          </h1>
          <p className="text-gray-500 mt-3 text-sm sm:text-base">
            {q ? (
              <>
                <span className="font-bold text-secondary">{results.length}</span>{" "}
                produit{results.length > 1 ? "s" : ""} trouvé
                {results.length > 1 ? "s" : ""}
              </>
            ) : (
              "Utilisez la barre de recherche pour trouver un produit."
            )}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {results.length > 0 ? (
          <Products data={results} handleOrder={handleOrder} searchTerm={q} />
        ) : (
          <div className="text-center py-20 px-4">
            <p className="text-xl text-gray-500">
              {q
                ? "Aucun produit ne correspond à votre recherche."
                : "Tapez un mot-clé pour commencer votre recherche."}
            </p>
            <Link
              to="/"
              className="text-primary hover:underline mt-4 inline-block"
            >
              Retour à l'accueil
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;

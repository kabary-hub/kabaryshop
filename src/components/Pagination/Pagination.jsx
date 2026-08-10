// src/components/Pagination/Pagination.jsx
// Composant de pagination réutilisable pour les listes de l'admin
// (produits, commandes, utilisateurs, abonnés, avis, historiques…).
//
// Props :
//   page         : page courante (indexé à partir de 1)
//   totalPages   : nombre total de pages
//   onChange     : (page) => void  — appelée quand l'utilisateur change de page
//   totalItems   : nombre total d'éléments (affiché, optionnel)
//   pageSize     : nombre d'éléments par page (optionnel, pour l'affichage)
//   className    : classes supplémentaires (optionnel)
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({
  page,
  totalPages,
  onChange,
  totalItems,
  pageSize,
  className = "",
}) => {
  if (totalPages <= 1) return null;

  // Construire la liste des pages affichées (avec « … » pour les grandes listes)
  const buildPages = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    if (start > 2) pages.push("left-dots");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("right-dots");
    pages.push(totalPages);
    return pages;
  };

  const pages = buildPages();

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t dark:border-gray-700 ${className}`}>
      {typeof totalItems === "number" && (
        <p className="text-sm text-gray-500">
          {totalItems} élément{totalItems > 1 ? "s" : ""}
          {pageSize ? ` · page ${page}/${totalPages}` : ""}
        </p>
      )}
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Page précédente"
          className="p-2 rounded-lg border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((p, idx) =>
          typeof p === "string" ? (
            <span key={`${p}-${idx}`} className="px-1.5 text-gray-400 select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition ${
                p === page
                  ? "bg-primary text-white"
                  : "border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Page suivante"
          className="p-2 rounded-lg border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;

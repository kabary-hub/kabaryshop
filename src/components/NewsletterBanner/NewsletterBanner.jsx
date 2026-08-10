// src/components/NewsletterBanner/NewsletterBanner.jsx
// Bannière "Nouveautés" : affichée aux visiteurs abonnés (sur ce navigateur)
// lorsqu'un nouveau produit est publié, avec un lien vers les nouveautés.
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import {
  isDeviceSubscribed,
  getRecentPublications,
  getLastSeenPublications,
  markPublicationsSeen,
} from "../../utils/subscribers";

const NewsletterBanner = () => {
  const location = useLocation();
  // Pas de bannière sur les pages d'administration
  const isAdminPage = location.pathname.startsWith("/admin");

  const [visible, setVisible] = useState(() => {
    if (isAdminPage || !isDeviceSubscribed()) return false;
    const lastSeen = getLastSeenPublications();
    const fresh = getRecentPublications().filter(
      (p) => new Date(p.date).getTime() > lastSeen,
    );
    return fresh.length > 0;
  });

  // Se réafficher quand l'admin publie un nouveau produit (même onglet/autre)
  useEffect(() => {
    const handleNewPublications = () => {
      if (!isDeviceSubscribed()) return;
      const lastSeen = getLastSeenPublications();
      const fresh = getRecentPublications().filter(
        (p) => new Date(p.date).getTime() > lastSeen,
      );
      if (fresh.length > 0) setVisible(true);
    };
    window.addEventListener("newPublications", handleNewPublications);
    return () =>
      window.removeEventListener("newPublications", handleNewPublications);
  }, []);

  const handleDismiss = () => {
    markPublicationsSeen();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[9999] max-w-[calc(100vw-2.5rem)] w-[340px] rounded-2xl shadow-2xl border border-primary/30 bg-white dark:bg-gray-900 overflow-hidden newsletter-banner"
    >
      <div className="flex items-start justify-between gap-2 px-4 py-3 bg-gradient-to-r from-primary to-secondary text-white">
        <p className="font-bold flex items-center gap-2 text-sm">
          <Sparkles size={16} />
          Nouveautés du site !
        </p>
        <button
          onClick={handleDismiss}
          aria-label="Fermer la notification"
          className="hover:bg-white/20 rounded-full p-1 transition shrink-0"
        >
          <X size={16} />
        </button>
      </div>
      <div className="px-4 py-3 space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          De nouveaux produits viennent d'être publiés. Venez les découvrir !
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/"
            onClick={handleDismiss}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold hover:opacity-90 transition"
          >
            Voir les nouveautés
          </Link>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsletterBanner;

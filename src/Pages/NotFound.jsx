// src/Pages/NotFound.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Home, MessageCircle } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

// Page 404 : affichée quand un visiteur arrive sur une URL inconnue
// (y compris /admin/login tapé directement, sans jeton d'accès).
const NotFound = () => {
  const { settings } = useSettings();
  const siteName = settings.siteName || "Kabary Shop";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-md w-full">
        <p className="text-7xl sm:text-8xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent select-none">
          404
        </p>
        <div className="mt-2 mb-4 text-5xl" aria-hidden="true">
          🔍
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">
          Page introuvable
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
          Oups ! La page que vous cherchez n'existe pas ou a été déplacée sur{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-200">{siteName}</span>.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary hover:bg-secondary text-white font-semibold px-6 py-2.5 rounded-full transition-colors"
          >
            <Home size={18} />
            Retour à l'accueil
          </Link>
          <Link
            to="/contacts"
            className="inline-flex items-center gap-2 border-2 border-gray-300 dark:border-gray-600 hover:border-primary hover:text-primary font-semibold px-6 py-2.5 rounded-full transition-colors"
          >
            <MessageCircle size={18} />
            Nous contacter
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

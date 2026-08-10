import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

const getStoredTheme = () => {
  const stored = localStorage.getItem("theme");
  return stored === "dark" || stored === "light" ? stored : null;
};

const getSystemTheme = () =>
  window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

// Thème initial : choix sauvegardé → thème calculé par index.html → préférence système
const getInitialTheme = () => {
  const stored = getStoredTheme();
  if (stored) return stored;
  const computed = document.documentElement.getAttribute("data-theme");
  if (computed === "dark" || computed === "light") return computed;
  return getSystemTheme();
};

const DarkMode = () => {
  const [theme, setTheme] = useState(getInitialTheme);

  // Synchroniser la classe <html> avec le thème courant
  useEffect(() => {
    const element = document.documentElement;
    element.classList.toggle("dark", theme === "dark");
    element.setAttribute("data-theme", theme);
  }, [theme]);

  // Suivre la préférence système tant que l'utilisateur n'a pas fait de choix explicite
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      if (getStoredTheme()) return; // choix explicite prioritaire
      setTheme(e.matches ? "dark" : "light");
    };
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  const isDark = theme === "dark";

  const handleToggle = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("theme", next); // persister uniquement le choix explicite
    } catch {
      // Stockage indisponible (navigation privée) : le thème reste appliqué pour la session
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
      title={isDark ? "Mode clair" : "Mode sombre"}
      className="relative w-16 h-9 shrink-0 rounded-full cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-secondary/50"
    >
      {/* Piste */}
      <span
        className={`absolute inset-0 rounded-full border transition-colors duration-500 ${
          isDark
            ? "bg-gray-800 border-secondary/60 shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)]"
            : "bg-white border-primary/40 shadow-sm"
        }`}
      />

      {/* Bouton coulissant aux couleurs du site */}
      <span
        className={`absolute top-1 left-1 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all duration-500 ease-in-out ${
          isDark
            ? "translate-x-7 bg-gradient-to-br from-primary to-secondary shadow-[0_0_12px_rgba(237,137,0,0.6)]"
            : "translate-x-0 bg-gradient-to-br from-primary to-secondary"
        }`}
      >
        {isDark ? (
          <Moon key="moon" size={15} className="text-white animate-icon-swap" />
        ) : (
          <Sun key="sun" size={16} className="text-white animate-icon-swap" />
        )}
      </span>
    </button>
  );
};

export default DarkMode;

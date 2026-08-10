// src/utils/toast.js
// Système de notifications toast réutilisable sur TOUT le site.
// Remplace les alert() / console.log lors des suppressions, ajouts, etc.
//
// Usage :
//   import { showToast } from "../utils/toast";
//   showToast("Produit supprimé avec succès", "success");
//   showToast("Erreur lors de la suppression", "error");
//
// Types disponibles : success (vert) | error (rouge) | warning (ambre) | info (bleu)

let container = null;

// Crée le conteneur fixe des toasts (une seule fois)
const getContainer = () => {
  if (container && document.body.contains(container)) return container;
  container = document.createElement("div");
  container.setAttribute(
    "style",
    "position:fixed;bottom:20px;right:20px;z-index:999999;display:flex;flex-direction:column;gap:10px;max-width:360px;",
  );
  document.body.appendChild(container);
  return container;
};

// Couleurs par type (classes Tailwind)
const STYLES = {
  success: { bg: "bg-green-600", icon: "✅" },
  error: { bg: "bg-red-600", icon: "❌" },
  warning: { bg: "bg-amber-500", icon: "⚠️" },
  info: { bg: "bg-blue-600", icon: "ℹ️" },
};

// Affiche un toast pendant « duration » millisecondes
export const showToast = (message, type = "success", duration = 3000) => {
  const style = STYLES[type] || STYLES.success;
  const el = document.createElement("div");
  el.className =
    "toast-item " +
    style.bg +
    " text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 text-sm font-medium transform transition-all duration-300 opacity-0 translate-y-2";

  const iconSpan = document.createElement("span");
  iconSpan.textContent = style.icon;
  iconSpan.className = "shrink-0 text-base";

  const msgSpan = document.createElement("span");
  msgSpan.textContent = message;
  msgSpan.className = "min-w-0";

  el.appendChild(iconSpan);
  el.appendChild(msgSpan);
  getContainer().appendChild(el);

  // Animation d'entrée
  requestAnimationFrame(() => {
    el.classList.remove("opacity-0", "translate-y-2");
  });

  // Animation de sortie puis suppression
  setTimeout(() => {
    el.classList.add("opacity-0", "translate-y-2");
    setTimeout(() => el.remove(), 300);
  }, duration);
};

// Raccourcis pratiques
export const toastSuccess = (message) => showToast(message, "success");
export const toastError = (message) => showToast(message, "error");
export const toastWarning = (message) => showToast(message, "warning");
export const toastInfo = (message) => showToast(message, "info");

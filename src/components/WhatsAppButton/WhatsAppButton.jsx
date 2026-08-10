// src/components/WhatsAppButton/WhatsAppButton.jsx
// Bouton WhatsApp flottant : toujours visible en bas à droite de l'écran
// (mobile comme desktop) pour permettre aux clients de contacter la boutique
// en un tap. Masqué dans l'espace admin / staff.
import React from "react";
import { useLocation } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import { useSettings } from "../../context/SettingsContext";

const WhatsAppButton = () => {
  const { pathname } = useLocation();
  const { settings } = useSettings();

  // Pas de bouton flottant dans l'administration ni l'espace staff
  if (pathname.startsWith("/admin") || pathname.startsWith("/staff")) {
    return null;
  }

  // Numéro WhatsApp depuis les paramètres admin (sinon aucun bouton)
  const whatsappNumber = String(settings.whatsapp || "").replace(/\D/g, "");
  if (!whatsappNumber) return null;

  const whatsappLink = `https://wa.me/${whatsappNumber}`;

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Discuter avec nous sur WhatsApp"
      title="Discuter avec nous sur WhatsApp"
      className="group fixed left-4 sm:left-6 bottom-4 z-[10002] flex items-center gap-2 no-underline"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      {/* Label déplié (desktop) */}
      <span className="hidden sm:inline-flex items-center bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 text-sm font-semibold px-3 py-1.5 rounded-full shadow-lg border border-green-200 dark:border-green-800 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none order-2">
        Discuter sur WhatsApp
      </span>

      {/* Pastille ronde avec halo animé discret */}
      <span className="relative flex items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-green-500 animate-pulse opacity-20 group-hover:opacity-40"></span>
        <span className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white shadow-xl shadow-green-500/40 hover:scale-110 active:scale-95 transition-transform duration-300">
          <FaWhatsapp className="text-3xl sm:text-4xl" />
        </span>
      </span>
    </a>
  );
};

export default WhatsAppButton;

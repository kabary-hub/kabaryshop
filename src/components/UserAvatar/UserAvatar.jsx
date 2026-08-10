// src/components/UserAvatar/UserAvatar.jsx
// Avatar utilisateur réutilisable partagé par les pages admin (Utilisateurs,
// Commandes, Historiques) et tout autre composant du site.
//
// Priorité d'affichage :
//   1. Photo personnelle de l'utilisateur (importée dans Commandes) ;
//   2. Logo du site configuré dans Paramètres → Identité du site ;
//   3. Initiales du nom (première lettre du prénom + première lettre du nom).
//
// Usage :
//   <UserAvatar user={user} className="w-10 h-10 text-sm" />
import React from "react";
import { useSettings } from "../../context/SettingsContext";

// Initiales d'un utilisateur : première lettre du prénom + première lettre du
// nom (ex. « Admin Principal » → « AP »). Utilisées en l'absence de photo et
// de logo.
const getInitials = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const UserAvatar = ({
  user,
  className = "w-10 h-10 text-sm",
  // Affiche le logo du site en repli (sinon initiales). À désactiver dans les
  // listes où chaque utilisateur doit rester distinct (ex. sélection livreur).
  showSiteLogo = true,
}) => {
  const { settings } = useSettings();
  const name = user?.name || "?";

  // 1) Photo personnelle de l'utilisateur (si importée)
  if (user?.photo) {
    return (
      <img
        src={user.photo}
        alt={name}
        className={`${className} rounded-full object-cover border border-gray-200 dark:border-gray-600`}
      />
    );
  }

  // 2) Logo du site (configuré dans les paramètres)
  if (showSiteLogo && settings.siteLogo) {
    return (
      <img
        src={settings.siteLogo}
        alt={name}
        className={`${className} rounded-full object-cover border border-gray-200 dark:border-gray-600`}
      />
    );
  }

  // 3) Initiales du nom
  return (
    <div
      className={`${className} rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold border border-primary/30`}
    >
      {getInitials(name)}
    </div>
  );
};

export default UserAvatar;

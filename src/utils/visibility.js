// src/utils/visibility.js
// Logique pure de visibilité du site (mode « Ouverture prochaine »).
// Aucune API navigateur : testable en Node.
//
// Règles de l'ouverture automatique :
//   • comingSoon = false              → site EN LIGNE (la bascule manuelle
//                                        depuis l'admin gagne toujours).
//   • comingSoon = true + date passée → site EN LIGNE (ouverture auto).
//   • comingSoon = true + date future → page d'attente (avec compte à rebours).
//   • comingSoon = true + aucune date → page d'attente (indéfiniment).

// Vrai si l'écran « Ouverture prochaine » doit être affiché.
// `now` est injectable pour les tests (timestamp ms).
export const getEffectiveComingSoon = (settings = {}, now = Date.now()) => {
  if (!settings.comingSoon) return false;
  const dateStr = settings.scheduledOpenDate;
  if (!dateStr) return true;
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return true; // date invalide → on reste en attente
  return t > now;
};

// Temps restant avant l'ouverture planifiée, ou null si aucune / dépassée.
// Retourne { days, hours, minutes } (arrondi à la minute).
export const getTimeUntilOpen = (dateStr, now = Date.now()) => {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return null;
  const diff = t - now;
  if (diff <= 0) return null;
  const totalMinutes = Math.floor(diff / 60000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
};

// Date d'ouverture formatée en français, ex. « lundi 15 septembre 2026 ».
export const formatOpenDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

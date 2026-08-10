// src/utils/auth.js
// Gestion centralisée des sessions (admin + staff livreur/préparateur).
//
// Problème corrigé : la déconnexion ne supprimait que quelques clés
// localStorage ; la session sessionStorage.adminLoggedIn restait présente,
// ce qui permettait de revenir sur /admin sans se reconnecter.
// logoutComplete() supprime TOUTES les clés de session, dans localStorage
// ET sessionStorage.

// Supprime TOUTES les clés de session (connexion admin + staff + 2FA)
export const logoutComplete = () => {
  // Clés localStorage liées à la session
  const localKeys = [
    "adminToken",
    "isAuthenticated",
    "current_admin",
    "current_admin_user",
    "current_user",
    "admin_2fa_pending",
    "admin_2fa_code",
    "admin_2fa_expiry",
    "admin_2fa_delivery",
  ];
  localKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // stockage indisponible
    }
  });

  // Clés sessionStorage liées à la session
  const sessionKeys = [
    "adminLoggedIn",
    "admin_2fa_verified",
    "admin_2fa_pending",
    "staffLoggedIn",
    "staffUserId",
  ];
  sessionKeys.forEach((key) => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // stockage indisponible
    }
  });
};

// Vrai si une session admin est active
export const isAdminLoggedIn = () => {
  try {
    return (
      localStorage.getItem("adminToken") ||
      localStorage.getItem("isAuthenticated") === "true" ||
      sessionStorage.getItem("adminLoggedIn") === "true"
    );
  } catch {
    return false;
  }
};

// Vrai si une session staff (livreur/préparateur) est active
export const isStaffLoggedIn = () => {
  try {
    return sessionStorage.getItem("staffLoggedIn") === "true";
  } catch {
    return false;
  }
};

// Utilisateur staff connecté (id stocké en session)
export const getStaffUserId = () => {
  try {
    return Number(sessionStorage.getItem("staffUserId")) || null;
  } catch {
    return null;
  }
};

// Récupère l'utilisateur staff complet depuis app_users
export const getStaffUser = () => {
  const id = getStaffUserId();
  if (!id) return null;
  try {
    const users = JSON.parse(localStorage.getItem("app_users") || "[]");
    return users.find((u) => Number(u.id) === id) || null;
  } catch {
    return null;
  }
};

// Enregistre la session staff
export const setStaffSession = (userId) => {
  sessionStorage.setItem("staffLoggedIn", "true");
  sessionStorage.setItem("staffUserId", String(userId));
};

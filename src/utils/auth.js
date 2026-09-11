// src/utils/auth.js
// Gestion centralisée des sessions (admin + staff livreur/préparateur).
import { signOutSupabase, getSupabase } from '../services/db';
//
// Problème corrigé : la déconnexion ne supprimait que quelques clés
// localStorage ; la session sessionStorage.adminLoggedIn restait présente,
// ce qui permettait de revenir sur /admin sans se reconnecter.
// logoutComplete() supprime TOUTES les clés de session, dans localStorage
// ET sessionStorage.

// Supprime TOUTES les clés de session (connexion admin + staff + 2FA)
export const logoutComplete = () => {
  // 1) Déconnexion cloud en premier (Supabase Auth).
  //    Cela invalide le jeton côté serveur et sur tous les appareils si
  //    la session est active. Les vérifications locales suivantes sont
  //    ensuite incontournables.
  signOutSupabase();

  // 2) Nettoyage local (localStorage) de toutes les clés de session.
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

  // 3) Nettoyage local (sessionStorage) de toutes les clés de session.
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
  // 1) Session Supabase Auth active (priorité : c'est la source de vérité).
  //    Si l'admin est connecté côté cloud, la session est valide même si les
  //    indicateurs locaux sessionStorage ont été partiellement nettoyés.
  try {
    const sb = typeof getSupabase === "function" ? getSupabase() : null;
    if (sb) {
      const { data } = sb.auth.getSession();
      if (data?.session?.user) return true;
    }
  } catch {
    // pas de session cloud : on garde les vérifications locales
  }

  // 2) Fallback local : indicateurs de session (compatibilité sans Supabase).
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
  // 1) Session Supabase Auth active (priorité).
  try {
    const sb = typeof getSupabase === "function" ? getSupabase() : null;
    if (sb) {
      const { data } = sb.auth.getSession();
      if (data?.session?.user) return true;
    }
  } catch {
    // pas de session cloud : on garde les vérifications locales
  }

  // 2) Fallback local.
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

// ====================================================================
// Accès à la page de connexion admin (/admin/login)
// --------------------------------------------------------------------
// La page de connexion n'est PLUS accessible en tapant l'URL directement :
// seuls le raccourci clavier secret (Ctrl+Shift+A) et le lien discret du
// footer posent ce jeton d'accès. Sans lui, AdminLogin redirige vers
// l'accueil. Le jeton est stocké UNIQUEMENT dans sessionStorage : il ne
// vaut que pour l'onglet courant et disparaît à la fermeture de l'onglet
// (pas de persistance entre onglets ni après redémarrage du navigateur).
// ====================================================================
const ADMIN_ACCESS_KEY = "admin_portal_access";

// Pose le jeton d'accès (raccourci clavier, lien discret du footer).
// Supprime aussi l'ancien jeton localStorage posé par les versions
// précédentes : un onglet qui le possédait encore ne doit plus y avoir
// accès une fois le jeton sessionStorage disparu.
export const grantAdminAccess = () => {
  try {
    sessionStorage.setItem(ADMIN_ACCESS_KEY, "1");
    localStorage.removeItem(ADMIN_ACCESS_KEY);
  } catch {
    // stockage indisponible
  }
};

// Vrai si la visite de /admin/login a été autorisée (raccourci ou lien)
export const hasAdminAccess = () => {
  try {
    return sessionStorage.getItem(ADMIN_ACCESS_KEY) === "1";
  } catch {
    return false;
  }
};

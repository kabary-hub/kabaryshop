// src/services/db.js
// Client Supabase (synchronisation multi-appareils + authentification).
//
// Le site fonctionne en local (localStorage) ; Supabase sert de « nuage »
// partagé : chaque clé localStorage est miroitée dans la table `sync_store`
// (voir supabase/migrations/0001_init_sync_store.sql).
//
// SECURITÉ (migration 0002_auth_rls.sql) :
//   • Les visiteurs NON connectés ne peuvent ni lire ni écrire les données
//     sensibles (app_users, order_logs, site_history, shop_orders…) ;
//   • Les admin/staff se connectent via Supabase Auth (email + mot de passe) ;
//     une fois connectés, leur session débloque l'accès complet.
//
// Si VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ne sont pas configurés,
// le site continue de fonctionner exactement comme avant (local uniquement).

import { createClient } from "@supabase/supabase-js";

let client = null;
// Utilisateur Supabase connecté sur cet appareil (null = visiteur)
let currentUser = null;

// Clés localStorage synchronisées avec Supabase
//
// ⚠️ admin_password n'est volontairement PAS synchronisé : le mot de passe
// admin principal est un secret local à chaque appareil (les comptes cloud
// créés via Supabase Auth, eux, sont partagés).
export const SYNC_KEYS = [
  "shop_orders", // commandes
  "app_users", // utilisateurs (rôles, statuts, mots de passe des comptes staff/admin créés)
  "custom_products", // produits personnalisés
  "deleted_products", // IDs des produits supprimés (tombstones)
  "categories", // catégories
  "kabary_settings", // paramètres du site
  "site_history", // journal d'activité
  "order_logs", // logs des commandes
  "site_subscribers", // abonnés newsletter
  "site_publications", // publications récentes
  "product_reviews", // avis produits
  "site_feedback", // avis généraux du site
];

// Table Supabase utilisée pour le miroir clé/valeur
export const SYNC_TABLE = "sync_store";

// Clés réservées aux comptes connectés (admin/staff) : lecture ET écriture
// nécessitent une session Supabase Auth. Les visiteurs ne les voient jamais.
export const SENSITIVE_KEYS = ["app_users", "order_logs", "site_history"];

// Clés que les visiteurs NON connectés peuvent ÉCRIRE (données créées par
// les clients : commandes, avis, feedback, abonnements). Toutes les autres
// écritures exigent une session admin/staff.
export const ANON_WRITABLE_KEYS = [
  "shop_orders",
  "product_reviews",
  "site_feedback",
  "site_subscribers",
];

// Événement déclenché après une connexion / déconnexion Supabase Auth
// (utilisé par SyncProvider pour recharger les données sensibles)
export const AUTH_EVENT = "supabaseAuthChanged";

// Renvoie le client Supabase, ou null si non configuré
export const getSupabase = () => {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  client = createClient(url, anonKey, {
    // Session persistée dans localStorage : un admin connecté reste connecté
    // au prochain chargement, et les requêtes incluent son jeton.
    auth: { persistSession: true },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  // Suivi de la session (connexion, déconnexion, restauration)
  client.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
  });
  // Session déjà enregistrée sur cet appareil (retour de l'admin)
  client.auth
    .getSession()
    .then(({ data }) => {
      currentUser = data.session?.user || null;
    })
    .catch(() => {
      // échec de restauration de session : on reste en mode visiteur
    });
  return client;
};

// Vrai si la synchronisation est activée (variables d'environnement présentes)
export const isSyncConfigured = () => Boolean(getSupabase());

// Vrai si l'appareil dispose d'une session admin/staff (Supabase Auth)
export const hasSupabaseSession = () => Boolean(currentUser);

// Compare la valeur distante (objet) avec la valeur locale (string JSON)
// sans tenir compte des différences de mise en forme.
export const sameValue = (localRaw, remoteValue) => {
  if (localRaw == null) return remoteValue == null;
  try {
    return JSON.stringify(JSON.parse(localRaw)) === JSON.stringify(remoteValue);
  } catch {
    return false;
  }
};

// ========================================================================
// Supabase Auth — connexion admin/staff
// ========================================================================

const emitAuthEvent = () => {
  try {
    window.dispatchEvent(new Event(AUTH_EVENT));
  } catch {
    // environnement sans window (tests)
  }
};

// Connecte l'appareil à Supabase Auth avec des identifiants déjà vérifiés
// localement. Crée automatiquement le compte cloud s'il n'existe pas encore.
//
// Retour : { ok: true } | { ok: false, reason: 'unconfigured' | 'confirm-pending'
//           | 'stale-password' | 'error', message? }
export const ensureSupabaseAuth = async (email, password) => {
  const sb = getSupabase();
  if (!sb) return { ok: false, reason: "unconfigured" };

  // 1) Tentative de connexion
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (!error) {
    currentUser = data.user || null;
    emitAuthEvent();
    return { ok: true };
  }

  // 2) Compte cloud inexistant → création automatique (le mot de passe a été
  //    vérifié localement juste avant, donc la création est sûre)
  const { error: signUpError } = await sb.auth.signUp({ email, password });
  if (!signUpError) {
    const { data: d2, error: err2 } = await sb.auth.signInWithPassword({
      email,
      password,
    });
    if (!err2) {
      currentUser = d2.user || null;
      emitAuthEvent();
      return { ok: true };
    }
    // Compte créé mais confirmation email active → connexion impossible
    return { ok: false, reason: "confirm-pending" };
  }

  const msg = String(signUpError.message || "");
  if (/already registered/i.test(msg)) {
    // Le compte cloud existe avec un AUTRE mot de passe que celui du site :
    // réinitialisation nécessaire dans le dashboard Supabase
    // (Authentication → Users → ⋯ → Reset password).
    return { ok: false, reason: "stale-password" };
  }
  return { ok: false, reason: "error", message: msg };
};

// Déconnexion Supabase (appelée lors de la déconnexion admin/staff)
export const signOutSupabase = async () => {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.auth.signOut();
  } catch {
    // ignore
  }
  currentUser = null;
  emitAuthEvent();
};

// Récupère la liste des utilisateurs (app_users) depuis le nuage avec la
// session en cours. Nécessite d'être connecté à Supabase Auth.
export const fetchCloudAppUsers = async () => {
  const sb = getSupabase();
  if (!sb) return null;
  // Session récupérée au moment de l'appel (évite les courses au login)
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) return null;
  const { data, error } = await sb
    .from(SYNC_TABLE)
    .select("value")
    .eq("key", "app_users")
    .maybeSingle();
  if (error || !data) return null;
  return Array.isArray(data.value) ? data.value : null;
};

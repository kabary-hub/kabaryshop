// src/services/db.js
// Client Supabase (synchronisation multi-appareils).
//
// Le site fonctionne en local (localStorage) ; Supabase sert de « nuage »
// partagé : chaque clé localStorage est miroitée dans la table `sync_store`
// (voir supabase/migrations/0001_init_sync_store.sql).
//
// Si VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ne sont pas configurés,
// le site continue de fonctionner exactement comme avant (local uniquement).
// La synchronisation s'active dès que ces 2 variables sont renseignées.

import { createClient } from "@supabase/supabase-js";

let client = null;

// Clés localStorage synchronisées avec Supabase
//
// ⚠️ admin_password n'est volontairement PAS synchronisé : le mot de passe
// admin est un secret. Le stocker en clair dans une table publique (lisible
// par quiconque possède la clé « anon ») permettrait de détourner le compte
// admin. Il se configure donc séparément sur chaque ordinateur
// (Admin > Paramètres > Sécurité).
export const SYNC_KEYS = [
  "shop_orders", // commandes
  "app_users", // utilisateurs (rôles, mots de passe des comptes staff/admin créés)
  "custom_products", // produits personnalisés
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

// Renvoie le client Supabase, ou null si non configuré
export const getSupabase = () => {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  client = createClient(url, anonKey, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return client;
};

// Vrai si la synchronisation est activée (variables d'environnement présentes)
export const isSyncConfigured = () => Boolean(getSupabase());

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

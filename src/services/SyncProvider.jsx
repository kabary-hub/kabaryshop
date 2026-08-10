// src/services/SyncProvider.jsx
// Synchronisation multi-appareils via Supabase.
//
// Principe : le site continue de lire/écrire le localStorage (aucune
// modification des composants existants nécessaire). Ce composant, monté une
// seule fois dans App.jsx, fait le pont entre le localStorage et la table
// Supabase `sync_store` (clé → valeur JSON, voir src/services/db.js).
//
//   1. Au montage : télécharge toutes les clés depuis le nuage et les
//      applique localement (le nuage fait foi). Les clés locales absentes du
//      nuage sont poussées (première sauvegarde).
//   2. Temps réel : abonnement Supabase Realtime → toute modification faite
//      depuis un autre appareil est appliquée instantanément au localStorage
//      et les événements correspondants sont redéclenchés pour rafraîchir
//      l'interface (ordersUpdated, productsUpdated, userChanged…).
//   3. Événements locaux : quand un composant modifie des données, il
//      déclenche déjà un événement (ordersUpdated, productsUpdated…) ;
//      on pousse la clé correspondante vers le nuage.
//   4. Filet de sécurité : toutes les 10 s, les clés modifiées depuis la
//      dernière poussée sont envoyées (couvre order_logs et toute écriture
//      directe sans événement).
//
// admin_password n'est volontairement PAS synchronisé (secret admin — voir
// src/services/db.js).
//
// Si les variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ne sont pas
// configurées, ce composant ne fait rien : le site reste 100 % local.
//
// ⚠️ Conflits : dernier écrivain gagne (par clé). Pour une petite boutique,
//    c'est acceptable. Une fusion ligne par ligne viendra avec Supabase Auth.

import React, { useEffect } from "react";
import {
  getSupabase,
  isSyncConfigured,
  SYNC_KEYS,
  SYNC_TABLE,
  sameValue,
  ANON_WRITABLE_KEYS,
  hasSupabaseSession,
  AUTH_EVENT,
} from "./db";

// Événements locaux → clés localStorage à pousser vers le nuage
const LOCAL_EVENT_TO_PUSH = {
  ordersUpdated: ["shop_orders"],
  productsUpdated: ["custom_products", "deleted_products"],
  userChanged: ["app_users"],
  settingsUpdated: ["kabary_settings"],
  categoriesUpdated: ["categories"],
  subscribersUpdated: ["site_subscribers"],
  reviewsUpdated: ["product_reviews", "site_feedback"],
  historyUpdated: ["site_history"],
};

// Clé localStorage → événements à redéclencher après une MAJ distante
const KEY_TO_LOCAL_EVENTS = {
  shop_orders: ["ordersUpdated", "storage"],
  app_users: ["userChanged", "storage"],
  custom_products: ["productsUpdated", "storage"],
  deleted_products: ["productsUpdated", "storage"],
  categories: ["categoriesUpdated", "storage"],
  kabary_settings: ["settingsUpdated", "storage"],
  site_history: ["historyUpdated", "storage"],
  order_logs: ["storage"],
  site_subscribers: ["subscribersUpdated", "storage"],
  site_publications: ["newPublications", "storage"],
  product_reviews: ["reviewsUpdated", "storage"],
  site_feedback: ["reviewsUpdated", "storage"],
};

// Fréquence du filet de sécurité (poussée périodique)
const INTERVAL_MS = 10000;
// Fréquence du re-pull périodique : garantit la convergence entre appareils
// même si Realtime Supabase n'est pas actif sur le projet.
const PULL_INTERVAL_MS = 15000;

const SyncProvider = () => {
  useEffect(() => {
    if (!isSyncConfigured()) return undefined;

    const client = getSupabase();
    const lastPushed = new Map();
    // Clés modifiées LOCALEMENT dont la poussée vers le nuage a échoué ou n'a
    // pas encore eu lieu (ex. admin non connecté à Supabase Auth) : le re-pull
    // périodique ne doit PAS écraser ces changements locaux avec la valeur
    // distante périmée, sinon une suppression de produit « reviendrait ».
    // La clé reste « sale » jusqu'à ce que la poussée réussisse.
    const dirtyKeys = new Set();

    // Pousse une clé localStorage vers Supabase (upsert)
    // Une clé sensible (app_users, logs…) ne peut être envoyée que si
    // l'appareil est connecté à Supabase Auth (sinon la politique RLS de
    // la table la rejette silencieusement).
    const canWriteKey = (key) =>
      ANON_WRITABLE_KEYS.includes(key) || hasSupabaseSession();

    const pushKey = async (key) => {
      if (!SYNC_KEYS.includes(key)) return;
      if (!canWriteKey(key)) return;
      let raw;
      try {
        raw = localStorage.getItem(key);
      } catch {
        return;
      }
      if (raw == null) return;
      // Déjà poussé ? (évite le ping-pong quand une MAJ distante a été
      // appliquée puis redéclenche les événements locaux)
      if (lastPushed.get(key) === raw) return;
      let value;
      try {
        value = JSON.parse(raw);
      } catch {
        return; // JSON invalide : on ne pousse pas
      }
      // Upsert via la fonction SQL sécurisée (sync_upsert) : un upsert
      // direct sur la table est bloqué par RLS pour les lignes existantes
      // (comportement PostgreSQL connu avec ON CONFLICT DO UPDATE).
      const { error } = await client.rpc("sync_upsert", {
        p_key: key,
        p_value: value,
      });
      if (error) {
        // Refus RLS attendu quand un VISITEUR tente d'écrire une clé sensible
        // (la synchro de ces clés reprend dès qu'une session admin/staff est
        // active) : on reste silencieux.
        if (!hasSupabaseSession() && String(error.message || "").includes("Accès refusé"))
          return;
        // Échec réel de synchronisation : silencieux côté utilisateur
        // (la poussée sera re-tentée par le filet de sécurité).
      } else {
        lastPushed.set(key, raw);
        // Changement local bien propagé → la clé n'est plus « sale »
        dirtyKeys.delete(key);
      }
    };

    // Redéclenche les événements locaux après une MAJ distante
    const dispatchEvents = (key) => {
      const events = KEY_TO_LOCAL_EVENTS[key] || [];
      events.forEach((evt) => window.dispatchEvent(new Event(evt)));
    };

    // Applique une valeur distante au localStorage (si différente)
    const applyRemote = (key, value) => {
      if (!SYNC_KEYS.includes(key)) return;
      // Garde-fou : un changement LOCAL non encore poussé (suppression de
      // produit, modification…) ne doit pas être écrasé par une valeur
      // distante périmée. La poussée reprendra dès qu'une session cloud sera
      // active, puis la clé redeviendra propre.
      if (dirtyKeys.has(key)) return;
      if (sameValue(localStorage.getItem(key), value)) return;
      try {
        const raw = JSON.stringify(value);
        localStorage.setItem(key, raw);
        // La valeur est maintenant identique au nuage : inutile de la
        // re-pousser quand les événements locaux se déclencheront (cela
        // évite le ping-pong de poussées entre appareils).
        lastPushed.set(key, raw);
        dispatchEvents(key);
      } catch {
        // stockage indisponible
      }
    };

    // ---- 1. Pull (le nuage est la vérité partagée) ----
    const doPull = async () => {
      const { data, error } = await client
        .from(SYNC_TABLE)
        .select("key, value");
      if (error) {
        // Pull impossible (réseau, config…) : on conserve l'état local
        return;
      }
      const remoteKeys = new Set();
      (data || []).forEach((row) => {
        remoteKeys.add(row.key);
        applyRemote(row.key, row.value);
      });
      // Semis : clés locales absentes du nuage → première sauvegarde.
      // (À faire AVANT de marquer lastPushed, sinon la garde anti-ping-pong
      //  dans pushKey empêcherait tout premier envoi.)
      SYNC_KEYS.forEach((key) => {
        if (!remoteKeys.has(key)) pushKey(key);
      });
      // Pour les clés présentes dans le nuage, l'état local est maintenant
      // identique à la valeur distante → on les marque « déjà poussées »
      // pour éviter un double-push à la première passe. Exception : les clés
      // « sales » (modifiées localement, non encore poussées) ne sont PAS
      // marquées, pour que le filet de sécurité les renvoie dès que la
      // session cloud le permettra.
      SYNC_KEYS.forEach((key) => {
        if (remoteKeys.has(key) && !dirtyKeys.has(key)) {
          try {
            lastPushed.set(key, localStorage.getItem(key));
          } catch {
            // ignore
          }
        }
      });
    };
    doPull();

    // Re-pull quand la session Supabase Auth change (connexion → les clés
    // sensibles deviennent lisibles ; déconnexion → retour en mode visiteur)
    const handleAuthChange = () => doPull();
    window.addEventListener(AUTH_EVENT, handleAuthChange);

    // ---- 2. Realtime : propagation instantanée depuis d'autres appareils ----
    const channel = client
      .channel("sync-store-all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: SYNC_TABLE },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const row = payload.new;
          if (!row || !SYNC_KEYS.includes(row.key)) return;
          applyRemote(row.key, row.value);
        },
      )
      .subscribe();

    // ---- 3. Événements locaux → poussée immédiate ----
    const handleLocalEvent = (e) => {
      const keys = LOCAL_EVENT_TO_PUSH[e.type];
      if (!keys) return;
      keys.forEach((key) => {
        // Écho d'une MAJ distante déjà appliquée (valeur identique à la
        // dernière poussée) : ce n'est pas un changement local à protéger.
        let raw;
        try {
          raw = localStorage.getItem(key);
        } catch {
          return;
        }
        if (lastPushed.get(key) === raw) return;
        dirtyKeys.add(key);
        pushKey(key);
      });
    };

    // Filet de sécurité : si une poussée échoue (visiteur non connecté), la
    // clé reste « sale » (dirtyKeys) et sera re-tentée périodiquement ; les
    // écritures directes sans événement sont aussi rattrapées ici.
    const pushKeys = () => {
      SYNC_KEYS.forEach((key) => {
        let raw;
        try {
          raw = localStorage.getItem(key);
        } catch {
          return;
        }
        if (raw == null) return;
        if (lastPushed.get(key) === raw) return;
        pushKey(key);
      });
    };
    Object.keys(LOCAL_EVENT_TO_PUSH).forEach((evt) =>
      window.addEventListener(evt, handleLocalEvent),
    );

    // ---- 4. Filet de sécurité : poussée périodique ----
    const interval = setInterval(() => {
      pushKeys();
    }, INTERVAL_MS);

    // ---- 5. Filet de sécurité : re-pull périodique ----
    // Même si Realtime n'est pas activé sur le projet Supabase (table absente
    // de la publication), chaque appareil re-télécharge régulièrement le nuage
    // : la DERNIÈRE modification finit toujours par être appliquée partout.
    const pullInterval = setInterval(() => {
      doPull();
    }, PULL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      clearInterval(pullInterval);
      window.removeEventListener(AUTH_EVENT, handleAuthChange);
      Object.keys(LOCAL_EVENT_TO_PUSH).forEach((evt) =>
        window.removeEventListener(evt, handleLocalEvent),
      );
      client.removeChannel(channel);
    };
  }, []);

  return null;
};

export default SyncProvider;

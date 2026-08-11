// src/utils/migrations.js
// ============================================================
// Migrations de données versionnées (localStorage)
// ------------------------------------------------------------
// Chaque migration porte un identifiant unique (ex. 'shop_orders_v1').
// runDataMigrations() est appelée une seule fois au démarrage de l'app
// (src/main.jsx), AVANT le premier rendu : les données affichées sont donc
// toujours propres. Les migrations déjà appliquées sont enregistrées dans
// localStorage['data_migrations_applied'] et ne sont jamais rejouées.
//
// Toujours défensif : si le stockage est indisponible (navigation privée…),
// la migration est ignorée silencieusement sans casser le lancement du site.
// ============================================================
import { sanitizeShopOrders } from "./orderSanitizer.js";

export const DATA_MIGRATIONS_KEY = "data_migrations_applied";
export const SHOP_ORDERS_MIGRATION_ID = "shop_orders_v1";
// Rapport de la dernière migration shop_orders : sert à afficher un bandeau
// dans l'espace admin quand des commandes ont réellement été réparées.
// Volontairement PAS synchronisé entre appareils (information locale).
export const MIGRATION_REPORT_KEY = "data_migration_report";

const storeMigrationReport = (report) => {
  // Rapport compact (sans le détail par commande) : suffisant pour le bandeau
  const compact = {
    migration: SHOP_ORDERS_MIGRATION_ID,
    appliedAt: new Date().toISOString(),
    total: report.total ?? 0,
    dropped: report.dropped ?? 0,
    repaired: report.repaired ?? 0,
    note: report.note || "",
  };
  try {
    localStorage.setItem(MIGRATION_REPORT_KEY, JSON.stringify(compact));
  } catch {
    // stockage indisponible
  }
};

const clearMigrationReport = () => {
  try {
    localStorage.removeItem(MIGRATION_REPORT_KEY);
  } catch {
    // stockage indisponible
  }
};

// Rapport de la migration shop_orders (pour le bandeau admin), ou null si
// aucune migration n'a rien réparé / si elle a été fermée.
export const getShopOrdersMigrationReport = () => {
  try {
    const raw = localStorage.getItem(MIGRATION_REPORT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Ferme définitivement le bandeau (rapport supprimé du stockage).
export const dismissShopOrdersMigrationReport = () => {
  clearMigrationReport();
};

// Applique le nettoyage de « shop_orders » dans localStorage.
// Retourne le rapport de la migration, ou null si rien n'était stocké.
const migrateShopOrders = () => {
  const key = "shop_orders";
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null; // stockage indisponible
  }
  if (raw == null) return null; // rien à migrer

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // JSON illisible : la liste est corrompue, on repart sur une liste vide
    try {
      localStorage.setItem(key, JSON.stringify([]));
      window.dispatchEvent(new Event("ordersUpdated"));
    } catch {
      // stockage indisponible
    }
    return {
      replaced: true,
      note: "JSON illisible — liste remplacée par une liste vide",
    };
  }

  const { orders, report } = sanitizeShopOrders(parsed);
  if (report.replaced) {
    try {
      localStorage.setItem(key, JSON.stringify(orders));
      // Rafraîchit les pages ouvertes (page Commandes, tableau de bord…)
      window.dispatchEvent(new Event("ordersUpdated"));
    } catch {
      // stockage indisponible
    }
  }
  return report;
};

// Exécute toutes les migrations non encore appliquées.
// Sûr à appeler à chaque chargement : ne fait rien une fois à jour.
export const runDataMigrations = () => {
  let applied = [];
  try {
    applied = JSON.parse(localStorage.getItem(DATA_MIGRATIONS_KEY) || "[]");
  } catch {
    applied = [];
  }
  if (!Array.isArray(applied)) applied = [];

  if (!applied.includes(SHOP_ORDERS_MIGRATION_ID)) {
    const report = migrateShopOrders();
    applied.push(SHOP_ORDERS_MIGRATION_ID);
    try {
      localStorage.setItem(DATA_MIGRATIONS_KEY, JSON.stringify(applied));
    } catch {
      // stockage indisponible — la migration sera re-tentée au prochain chargement
    }
    if (report) {
      // Bandeau admin : persister le rapport UNIQUEMENT si des commandes ont
      // réellement été réparées (sinon aucun bandeau, ni bandeau périmé).
      if (report.replaced) {
        storeMigrationReport(report);
      } else {
        clearMigrationReport();
      }
      console.info("[migration] shop_orders_v1 appliquée :", report);
    }
  }
};

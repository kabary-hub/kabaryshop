// src/utils/orderArchive.js
// ============================================================
// Archivage automatique des commandes COMPLÉTÉES (rétention)
// ------------------------------------------------------------
// Règle métier :
//   • Une commande « completed » ne peut JAMAIS être supprimée manuellement ;
//   • Quand le nombre de commandes complétées dépasse MAX_COMPLETED_ORDERS
//     (1000), les PLUS ANCIENNES en excédent sont déplacées dans l'archive
//     « site_order_archive » (append-only) au lieu d'être détruites ;
//   • La liste active (shop_orders) reste ainsi toujours sous le plafond,
//     tout en conservant un justificatif complet de chaque commande.
//
// L'archive est une liste à part : elle n'apparaît pas dans les statistiques
// ni dans la liste active des commandes, mais rien n'est jamais perdu.
// ============================================================

// Plafond de commandes complétées conservées dans la liste active.
export const MAX_COMPLETED_ORDERS = 1000;

// Délai de rétention des commandes ANNULÉES : elles ne peuvent pas être
// supprimées manuellement et s'effacent automatiquement après ce nombre
// de jours (à compter de la date d'annulation « cancelledAt »).
export const CANCELLED_RETENTION_DAYS = 10;

// Clé localStorage de l'archive (synchronisée aussi sur Supabase).
export const ARCHIVE_KEY = "site_order_archive";

// Événement déclenché après toute modification de l'archive (synchro cloud).
export const ARCHIVE_UPDATED_EVENT = "archiveUpdated";

// ---- Lecture / écriture de l'archive ----

export const getArchivedOrders = () => {
  try {
    return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || "[]");
  } catch {
    return [];
  }
};

export const saveArchivedOrders = (orders) => {
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new Event(ARCHIVE_UPDATED_EVENT));
  } catch {
    // stockage indisponible : l'archivage est ignoré silencieusement
  }
};

// ---- Application de la règle de rétention ----

// Applique la rétention sur une liste de commandes. Retourne :
//   { orders, archivedCount }
//   • orders        : liste active après archivage des excédents (inchangée si
//                     le plafond n'est pas dépassé) ;
//   • archivedCount : nombre de commandes déplacées vers l'archive (0 sinon).
export const applyOrderRetention = (orders) => {
  if (!Array.isArray(orders)) return { orders, archivedCount: 0 };

  const completed = orders.filter((o) => o?.status === "completed");
  const excess = completed.length - MAX_COMPLETED_ORDERS;
  if (excess <= 0) return { orders, archivedCount: 0 };

  // Les plus anciennes commandes complétées en excédent → archive
  const sorted = [...completed].sort(
    (a, b) => new Date(a?.date || 0) - new Date(b?.date || 0),
  );
  const toArchive = sorted.slice(0, excess);
  const archivedIds = new Set(toArchive.map((o) => String(o?.id)));

  // Marque l'horodatage d'archivage (append-only : on ne modifie rien d'autre)
  const archived = toArchive.map((o) => ({
    ...o,
    archivedAt: new Date().toISOString(),
  }));

  // On préfixe : les plus récemment archivées apparaissent en premier
  saveArchivedOrders([...archived, ...getArchivedOrders()]);

  const kept = orders.filter((o) => !archivedIds.has(String(o?.id)));
  return { orders: kept, archivedCount: archived.length };
};

// ---- Auto-effacement des commandes ANNULÉES ----

// Supprime de la liste active les commandes annulées dont la date
// d'annulation (cancelledAt, sinon la date de la commande) est plus ancienne
// que CANCELLED_RETENTION_DAYS. Retourne :
//   { orders, removedCount }
//   • orders       : liste active sans les annulées expirées ;
//   • removedCount : nombre de commandes annulées effacées (0 sinon).
// Les commandes d'un autre statut ne sont jamais touchées.
export const applyCancelledOrderCleanup = (orders) => {
  if (!Array.isArray(orders)) return { orders, removedCount: 0 };

  const cutoff = Date.now() - CANCELLED_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  const expired = orders.filter((o) => {
    if (o?.status !== "cancelled") return false;
    // Date de référence : l'annulation si connue, sinon la date de la commande
    const ref = new Date(o?.cancelledAt || o?.date).getTime();
    return Number.isFinite(ref) && ref < cutoff;
  });

  if (expired.length === 0) return { orders, removedCount: 0 };

  const expiredIds = new Set(expired.map((o) => String(o?.id)));
  return {
    orders: orders.filter((o) => !expiredIds.has(String(o?.id))),
    removedCount: expired.length,
  };
};

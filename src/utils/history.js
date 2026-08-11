// src/utils/history.js
// Journal d'activité central du site : toutes les actions (pages visitées,
// utilisateurs, rôles, commandes, produits, avis, catégories, abonnés,
// paramètres, connexions) sont enregistrées ici et consultables depuis
// Admin > Historiques.

const HISTORY_KEY = "site_history";
const MAX_ENTRIES = 2000;

// Types d'activité enregistrés
export const HISTORY_TYPES = {
  page: { label: "Pages", icon: "👁️", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  auth: { label: "Connexions", icon: "🔐", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  user: { label: "Utilisateurs & rôles", icon: "👥", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  order: { label: "Commandes", icon: "🛒", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  product: { label: "Produits", icon: "📦", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  review: { label: "Avis", icon: "⭐", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  category: { label: "Catégories", icon: "🗂️", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  subscriber: { label: "Abonnés", icon: "📧", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
  settings: { label: "Paramètres", icon: "⚙️", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
};

// Lis les paramètres sans dépendre du contexte React (pour l'acteur par défaut)
const getCurrentActor = () => {
  try {
    const u = JSON.parse(localStorage.getItem("current_admin_user") || "null");
    if (u && u.name) return u;
  } catch {
    // stockage indisponible
  }
  return { name: "Admin", role: "admin" };
};

// Lit tout le journal (du plus récent au plus ancien)
export const getHistory = () => {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(list)
      ? list.sort((a, b) => new Date(b.date) - new Date(a.date))
      : [];
  } catch {
    return [];
  }
};

// Enregistre une activité dans le journal
// ex. : logActivity({ type: 'user', action: 'créé', subject: 'Boubacar', details: 'Rôle : livreur', actor: { name, role } })
export const logActivity = ({
  type = "page",
  action = "",
  subject = "",
  details = "",
  actor = null,
  link = null,
}) => {
  try {
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      action,
      subject,
      details,
      actor: actor || getCurrentActor(),
      date: new Date().toISOString(),
      link: link || null,
    };
    const list = getHistory();
    list.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
    window.dispatchEvent(new Event("historyUpdated"));
    window.dispatchEvent(new Event("storage"));
    // Journal distant (append-only) : les activités des visiteurs/clients
    // (visites de pages, abonnements, commandes…) sont ajoutées pour que
    // l'admin les retrouve dans Historiques, même si elles proviennent d'un
    // autre appareil. Les actions admin/staff, elles, continuent de se
    // synchroniser via la clé « site_history » (compte connecté requis).
    const role = String(entry.actor?.role || "");
    const isVisitorActivity =
      role === "public" || role === "Client" || entry.actor?.name === "Visiteur";
    if (isVisitorActivity) {
      // Import dynamique : évite de charger supabase-js dans le bundle initial
      // (la synchronisation reste lazy, cf. SyncProvider).
      import("../services/db")
        .then(({ appendActivity }) => appendActivity(entry))
        .catch(() => {
          // journal distant indisponible : l'activité reste dans le localStorage
        });
    }
    return entry;
  } catch {
    // stockage indisponible : on ignore (le journal ne doit jamais faire planter le site)
    return null;
  }
};

// Vide entièrement le journal
export const clearHistory = () => {
  try {
    localStorage.setItem(HISTORY_KEY, "[]");
    window.dispatchEvent(new Event("historyUpdated"));
    window.dispatchEvent(new Event("storage"));
  } catch {
    // stockage indisponible
  }
};

// Compteurs par type (pour la page Historiques)
export const getHistoryStats = (list = getHistory()) => {
  // list optionnel : si fourni, évite une relecture localStorage (permet à la
  // page Historiques de mémoriser sur le journal chargé en état React).
  const entries = list || getHistory();
  const stats = { total: entries.length, today: 0, week: 0, byType: {} };
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  entries.forEach((entry) => {
    const d = new Date(entry.date);
    if (d >= startOfToday) stats.today += 1;
    if (d >= weekAgo) stats.week += 1;
    stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;
  });
  return stats;
};

// Liste des acteurs distincts (filtre de la page)
export const getHistoryActors = (list = getHistory()) => {
  // list optionnel : voir getHistoryStats.
  const entries = list || getHistory();
  const seen = new Map();
  entries.forEach((entry) => {
    const name = entry.actor?.name || "Inconnu";
    if (!seen.has(name)) {
      seen.set(name, { name, role: entry.actor?.role || "" });
    }
  });
  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
};

// Date lisible en français
export const formatHistoryDate = (iso) => {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

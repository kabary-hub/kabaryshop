// src/admin/History.jsx
// Page Historiques : journal complet de l'activité du site.
// Tous les événements enregistrés via src/utils/history.js y sont consultables :
// visites de pages, utilisateurs & rôles, commandes, produits, avis, catégories,
// abonnés, paramètres et connexions. Filtres, recherche, export CSV et
// suppression du journal inclus.
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  History as HistoryIcon,
  Eye,
  Trash2,
  Download,
  Search,
  Users,
  UserCog,
  Filter,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Home,
  FileText,
} from "lucide-react";
import {
  getHistory,
  clearHistory,
  getHistoryStats,
  getHistoryActors,
  formatHistoryDate,
  HISTORY_TYPES,
} from "../utils/history";
import UserAvatar from "../components/UserAvatar/UserAvatar";
import {
  AUTH_EVENT,
  fetchCloudActivity,
  clearCloudActivity,
} from "../services/db";

const PERIODS = [
  { key: "all", label: "Tout" },
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "7 derniers jours" },
  { key: "month", label: "30 derniers jours" },
];

const inPeriod = (iso, period) => {
  const d = new Date(iso);
  const now = new Date();
  if (period === "today") {
    return d.toDateString() === now.toDateString();
  }
  if (period === "week") {
    return now - d <= 7 * 24 * 3600 * 1000;
  }
  if (period === "month") {
    return now - d <= 30 * 24 * 3600 * 1000;
  }
  return true;
};

// Badge d'un type d'activité
const TypeBadge = ({ type }) => {
  const meta = HISTORY_TYPES[type] || HISTORY_TYPES.page;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${meta.color}`}
    >
      <span>{meta.icon}</span>
      {meta.label}
    </span>
  );
};

// Icône selon l'action
const actionIcon = (action) => {
  const a = String(action || "").toLowerCase();
  if (a.includes("suppr") || a.includes("retir") || a.includes("rejet"))
    return <XCircle size={14} className="text-red-500" />;
  if (a.includes("valid") || a.includes("approv") || a.includes("connect"))
    return <CheckCircle2 size={14} className="text-green-500" />;
  return <Clock size={14} className="text-gray-400" />;
};

const History = () => {
  const [entries, setEntries] = useState(getHistory);
  // Entrées distantes (site_activity) : visites/actions des CLIENTS depuis
  // d'autres appareils, remontées via le journal append-only Supabase.
  const [cloudEntries, setCloudEntries] = useState([]);
  const [activeTab, setActiveTab] = useState("activity"); // activity | users | pages
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [confirmClear, setConfirmClear] = useState(false);
  // Masquer les activités des clients (visites, commandes, abonnements…) :
  // ne garder que les actions des admins et du staff.
  const [staffOnly, setStaffOnly] = useState(false);
  // Ligne du journal développée (clic sur une ligne du tableau)
  const [expandedEntryId, setExpandedEntryId] = useState(null);

  // Rafraîchir en direct quand une activité est enregistrée (locale) ou
  // quand le journal distant des clients est mis à jour / la session change.
  useEffect(() => {
    let cancelled = false;
    const loadCloud = async () => {
      const cloud = await fetchCloudActivity();
      if (!cancelled) setCloudEntries(cloud);
    };
    const refresh = () => {
      setEntries(getHistory());
      loadCloud();
    };
    refresh();
    window.addEventListener("historyUpdated", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener(AUTH_EVENT, loadCloud);
    return () => {
      cancelled = true;
      window.removeEventListener("historyUpdated", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(AUTH_EVENT, loadCloud);
    };
  }, []);

  // Journal fusionné : local (site_history) + distant (site_activity).
  // Déduplication par id (une activité d'un client testé sur le MÊME appareil
  // que l'admin existe dans les deux sources), puis tri du plus récent.
  const allEntries = useMemo(() => {
    const map = new Map();
    [...entries, ...cloudEntries].forEach((e) => {
      if (!e || !e.id) return;
      if (!map.has(e.id)) map.set(e.id, e);
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0),
    );
  }, [entries, cloudEntries]);

  const stats = useMemo(() => getHistoryStats(allEntries), [allEntries]);
  const actors = useMemo(() => getHistoryActors(allEntries), [allEntries]);

  // Une activité est-elle liée à un client / visiteur public ?
  const isClientActivity = (e) => {
    const role = e.actor?.role || "";
    return role === "public" || role === "Client" || e.actor?.name === "Visiteur";
  };

  // Filtres appliqués
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return allEntries.filter((e) => {
      if (staffOnly && isClientActivity(e)) return false;
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (actorFilter !== "all" && (e.actor?.name || "Inconnu") !== actorFilter)
        return false;
      if (!inPeriod(e.date, periodFilter)) return false;
      if (term) {
        const haystack = [
          e.action,
          e.subject,
          e.details,
          e.actor?.name,
          e.actor?.role,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [allEntries, searchTerm, typeFilter, periodFilter, actorFilter, staffOnly]);

  // ---- Utilisateurs & rôles (lecture depuis app_users + journal) ----
  const usersWithHistory = useMemo(() => {
    let users = [];
    try {
      users = JSON.parse(localStorage.getItem("app_users") || "[]");
    } catch {
      users = [];
    }
    if (!Array.isArray(users)) users = [];
    return users.map((u) => {
      const userEntries = allEntries.filter(
        (e) =>
          (e.actor?.name || "").toLowerCase() === String(u.name || "").toLowerCase() ||
          (String(e.subject || "").toLowerCase() === String(u.name || "").toLowerCase() &&
            (e.type === "user" || e.type === "auth")),
      );
      const roleChanges = allEntries.filter(
        (e) =>
          e.type === "user" &&
          String(e.subject || "").toLowerCase() === String(u.name || "").toLowerCase() &&
          /rôle|role/i.test(e.action + " " + (e.details || "")),
      );
      return { ...u, history: userEntries.slice(0, 8), roleChanges: roleChanges.slice(0, 10) };
    });
  }, [allEntries]);

  // ---- Pages visitées (agrégat des visites) ----
  const pageStats = useMemo(() => {
    const counts = {};
    allEntries
      .filter((e) => e.type === "page")
      .forEach((e) => {
        const key = e.subject || "(accueil)";
        if (!counts[key]) counts[key] = { path: key, count: 0, last: e.date };
        counts[key].count += 1;
        if (new Date(e.date) > new Date(counts[key].last)) counts[key].last = e.date;
      });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [allEntries]);

  const pageVisits = useMemo(
    () => allEntries.filter((e) => e.type === "page").slice(0, 100),
    [allEntries],
  );

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    clearHistory();
    clearCloudActivity(); // Efface aussi le journal distant des clients
    setConfirmClear(false);
  };

  const exportCSV = () => {
    if (!filtered.length) return;
    const header = ["Date", "Type", "Action", "Sujet", "Détails", "Acteur", "Rôle"];
    const lines = filtered.map((e) => [
      new Date(e.date).toLocaleString("fr-FR"),
      HISTORY_TYPES[e.type]?.label || e.type,
      e.action,
      e.subject,
      (e.details || "").replace(/[\n;]/g, " "),
      e.actor?.name || "",
      e.actor?.role || "",
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historiques_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Les cartes sont cliquables : chacune filtre le journal par ce qu'elle porte.
  const statCards = [
    { label: "Événements totaux", value: stats.total.toLocaleString(), icon: HistoryIcon, color: "bg-blue-100 text-blue-600", period: "all", tab: "activity" },
    { label: "Aujourd'hui", value: stats.today.toLocaleString(), icon: Calendar, color: "bg-green-100 text-green-600", period: "today", tab: "activity" },
    { label: "7 derniers jours", value: stats.week.toLocaleString(), icon: Clock, color: "bg-purple-100 text-purple-600", period: "week", tab: "activity" },
    { label: "Acteurs distincts", value: actors.length, icon: Users, color: "bg-orange-100 text-orange-600", period: "all", tab: "activity" },
  ];

  // Applique le filtre correspondant à une carte de statistiques
  const applyCardFilter = (card) => {
    setActiveTab(card.tab);
    setPeriodFilter(card.period);
    setTypeFilter("all");
  };

  const tabs = [
    { key: "activity", label: "Activité générale", icon: HistoryIcon },
    { key: "users", label: "Utilisateurs & rôles", icon: UserCog },
    { key: "pages", label: "Pages visitées", icon: Eye },
  ];

  const roleLabels = {
    admin: "Administrateur",
    livreur: "Livreur",
    preparateur: "Préparateur",
    Utilisateur: "Utilisateur",
    public: "Visiteur",
    Client: "Client",
  };
  const roleBadge = (role) => {
    const map = {
      admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
      livreur: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      preparateur: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    };
    return map[role] || "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  };

  return (
    <div className="p-4 sm:p-6">
      {/* En-tête */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HistoryIcon className="text-blue-600" />
            Historiques
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Journal complet du site : pages, utilisateurs, rôles, commandes, produits, avis,
            catégories, abonnés, paramètres et connexions. Les activités des clients
            (visites, commandes, abonnements) y sont incluses : utilisez le filtre
            « Admin & staff uniquement » pour ne voir que vos équipes.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportCSV}
            disabled={!filtered.length}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Download size={16} />
            Exporter CSV
          </button>
          <button
            onClick={handleClear}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition border ${
              confirmClear
                ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                : "bg-white dark:bg-gray-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
            }`}
          >
            <Trash2 size={16} />
            {confirmClear ? "Confirmer la suppression ?" : "Effacer le journal"}
          </button>
        </div>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <button
            key={s.label}
            onClick={() => applyCardFilter(s)}
            className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex items-center gap-3 text-left hover:shadow-lg hover:ring-2 hover:ring-blue-400 transition cursor-pointer"
            title={`Filtrer le journal : ${s.label}`}
          >
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
              <s.icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-gray-800 dark:text-white truncate">{s.value}</p>
              <p className="text-xs text-gray-500 truncate">{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === t.key
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ============ ONGLET ACTIVITÉ GÉNÉRALE ============ */}
      {activeTab === "activity" && (
        <>
          {/* Filtres */}
          <div className="rounded-lg shadow p-4 mb-5 space-y-3 bg-white dark:bg-gray-800">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher (action, sujet, acteur, détails)..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-900 text-sm"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg dark:bg-gray-900 text-sm"
              >
                <option value="all">Tous les types</option>
                {Object.entries(HISTORY_TYPES).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.icon} {meta.label}
                  </option>
                ))}
              </select>
              <select
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg dark:bg-gray-900 text-sm"
              >
                <option value="all">Tous les acteurs</option>
                {actors.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name}
                    {a.role ? ` (${roleLabels[a.role] || a.role})` : ""}
                  </option>
                ))}
              </select>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg dark:bg-gray-900 text-sm"
              >
                {PERIODS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setStaffOnly((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition shrink-0 ${
                  staffOnly
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                title="Masquer les visites et actions des clients (visiteurs, commandes, abonnements) pour ne garder que les activités des admins et du staff."
              >
                <ShieldCheck size={15} />
                {staffOnly ? "Admin & staff uniquement" : "Inclure les clients"}
              </button>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Filter size={12} />
              {filtered.length} événement{filtered.length > 1 ? "s" : ""} affiché
              {filtered.length !== allEntries.length ? ` (sur ${allEntries.length} au total)` : ""}
              {staffOnly && " · activités des clients masquées"}
            </p>
          </div>

          {/* Tableau du journal */}
          {filtered.length === 0 ? (
            <div className="text-center py-14 bg-white dark:bg-gray-800 rounded-xl shadow">
              <HistoryIcon size={40} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Aucune activité enregistrée pour le moment.</p>
              <p className="text-sm text-gray-400 mt-1">
                Les visites de pages, connexions et actions admin apparaîtront ici automatiquement.
              </p>
            </div>
          ) : (
            <div className="rounded-xl shadow overflow-hidden bg-white dark:bg-gray-800">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Sujet / Détails</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Acteur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filtered.slice(0, 300).map((e) => (
                      <React.Fragment key={e.id}>
                        <tr
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
                          onClick={() =>
                            setExpandedEntryId(expandedEntryId === e.id ? null : e.id)
                          }
                          title="Cliquer pour voir les détails complets"
                        >
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {formatHistoryDate(e.date)}
                          </td>
                          <td className="px-4 py-3">
                            <TypeBadge type={e.type} />
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 capitalize">
                              {actionIcon(e.action)}
                              {e.action || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {/* Liens cliquables pour les visites de pages */}
                            {e.type === "page" && typeof e.subject === "string" && e.subject.startsWith("/") ? (
                              <Link
                                to={e.subject}
                                onClick={(ev) => ev.stopPropagation()}
                                className="text-sm text-blue-600 hover:underline font-medium"
                              >
                                {e.subject === "/" ? "Accueil" : e.subject}
                              </Link>
                            ) : (
                              <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">
                                {e.subject || "—"}
                              </p>
                            )}
                            {e.details && (
                              <p className="text-xs text-gray-500 mt-0.5 max-w-md truncate">{e.details}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-2">
                              {/* Avatar de l'acteur : photo → logo du site → initiales */}
                              <UserAvatar user={e.actor} className="w-6 h-6 text-[10px] shrink-0" />
                              <span className="text-sm text-gray-700 dark:text-gray-200">
                                {e.actor?.name || "Inconnu"}
                              </span>
                            </span>
                            {e.actor?.role && (
                              <span className="ml-1 text-[10px] text-gray-400">
                                {roleLabels[e.actor.role] || e.actor.role}
                              </span>
                            )}
                          </td>
                        </tr>
                        {/* Ligne de détails complets (clic sur la ligne) */}
                        {expandedEntryId === e.id && (
                          <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                            <td colSpan={5} className="px-4 py-3 text-sm">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                                Détails complets
                              </p>
                              <p className="text-gray-700 dark:text-gray-200">
                                {e.details || "Aucun détail supplémentaire."}
                              </p>
                              {e.type === "page" && typeof e.subject === "string" && e.subject.startsWith("/") && (
                                <Link
                                  to={e.subject}
                                  onClick={() => setExpandedEntryId(null)}
                                  className="inline-block mt-2 text-blue-600 hover:underline text-sm font-medium"
                                >
                                  → Ouvrir la page {e.subject === "/" ? "Accueil" : e.subject}
                                </Link>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============ ONGLET UTILISATEURS & RÔLES ============ */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {usersWithHistory.length === 0 ? (
            <div className="text-center py-14 bg-white dark:bg-gray-800 rounded-xl shadow">
              <Users size={40} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Aucun utilisateur enregistré.</p>
            </div>
          ) : (
            usersWithHistory.map((u) => (
              <div key={u.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                <div className="flex flex-wrap items-center gap-4">
                  <UserAvatar user={u} className="w-12 h-12 text-base shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-lg text-gray-800 dark:text-white">{u.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBadge(u.role)}`}>
                        {roleLabels[u.role] || u.role}
                      </span>
                      {u.status === "active" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                          Actif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          Bloqué
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{u.email}</p>
                    {u.createdAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Enregistré le {formatHistoryDate(u.createdAt)}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">
                      {u.history.length}
                    </p>
                    <p className="text-xs text-gray-400">actions journalisées</p>
                  </div>
                </div>

                {/* Changements de rôle */}
                {u.roleChanges.length > 0 && (
                  <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                      <ShieldCheck size={13} />
                      Historique des rôles
                    </p>
                    <ul className="space-y-1.5">
                      {u.roleChanges.map((rc) => (
                        <li key={rc.id} className="text-xs text-amber-800 dark:text-amber-200 flex flex-wrap items-center gap-2">
                          <Clock size={11} className="shrink-0" />
                          <span className="font-medium capitalize">{rc.action}</span>
                          {rc.details && <span>— {rc.details}</span>}
                          <span className="text-amber-600/70 dark:text-amber-300/60">
                            par {rc.actor?.name} · {formatHistoryDate(rc.date)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Dernières actions de l'utilisateur */}
                {u.history.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                      Dernières actions
                    </p>
                    <ul className="space-y-1.5">
                      {u.history.map((h) => (
                        <li key={h.id} className="text-xs text-gray-600 dark:text-gray-300 flex flex-wrap items-center gap-2">
                          <TypeBadge type={h.type} />
                          <span className="font-medium capitalize">{h.action || "—"}</span>
                          {h.subject && <span className="text-gray-500">— {h.subject}</span>}
                          <span className="text-gray-400 ml-auto">{formatHistoryDate(h.date)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ============ ONGLET PAGES VISITÉES ============ */}
      {activeTab === "pages" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Statistiques par page */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
              <Eye size={18} className="text-blue-500" />
              Pages les plus visitées
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Nombre de visites enregistrées par page du site.
            </p>
            {pageStats.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">Aucune visite enregistrée.</p>
            ) : (
              <div className="space-y-3">
                {pageStats.slice(0, 15).map((p, idx) => {
                  const max = pageStats[0]?.count || 1;
                  const label = p.path === "/" ? "Accueil" : p.path;
                  return (
                    // Lien cliquable vers la page correspondante
                    <Link
                      key={p.path}
                      to={p.path}
                      className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg p-1.5 transition"
                      title={`Ouvrir ${label}`}
                    >
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-200 truncate">
                          <span className="text-gray-400 mr-1.5">{idx + 1}.</span>
                          {p.path === "/" ? (<><Home size={13} className="inline mr-1 text-gray-400" /> Accueil</>) : p.path}
                        </span>
                        <span className="font-bold text-blue-600">{p.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(4, (p.count / max) * 100)}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Journal des visites */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
              <Clock size={18} className="text-green-500" />
              Dernières visites
            </h3>
            <p className="text-xs text-gray-400 mb-4">Les 100 dernières pages consultées.</p>
            {pageVisits.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">
                Aucune visite enregistrée. Les pages seront journalisées dès la prochaine navigation.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[480px] overflow-y-auto">
                {pageVisits.map((v) => (
                  <li key={v.id} className="py-2 flex items-center gap-3">
                    <span className="text-lg flex items-center justify-center">
                      {v.subject === "/" ? (
                        <Home size={16} className="text-gray-400" />
                      ) : (
                        <FileText size={16} className="text-gray-400" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                        {v.subject === "/" ? "Accueil" : v.subject}
                      </p>
                      {v.details && (
                        <p className="text-xs text-gray-400 truncate">{v.details}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatHistoryDate(v.date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default History;

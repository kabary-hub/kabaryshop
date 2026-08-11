// src/admin/AdminLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Grid,  TrendingUp,
  Settings,
  MessageSquare,
  Mail,
  LogOut,
  Menu,
  X,
  Bell,
  CheckCheck,
  ShoppingBag,
  Info,
  AlertTriangle,
  History as HistoryIcon,
  Wrench,
  Globe,
  EyeOff,
  Clock
} from 'lucide-react';
import {
  getAdminAlerts,
  markAllAlertsRead,
  markAlertRead,
} from '../utils/notifications';
import { logActivity } from '../utils/history';
import { logoutComplete } from '../utils/auth';
import { useSettings } from '../context/SettingsContext';
import { showToast } from '../utils/toast';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';
import {
  getShopOrdersMigrationReport,
  dismissShopOrdersMigrationReport,
} from '../utils/migrations';

const AdminLayout = () => {
  const { settings, updateSettings } = useSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  // Confirmation de bascule « site en ligne / page d'attente »
  // (null = aucune, sinon 'online' | 'waiting')
  const [siteModeConfirm, setSiteModeConfirm] = useState(null);
  const [alerts, setAlerts] = useState(getAdminAlerts);
  // Bandeau « commandes réparées par la migration » (présent uniquement si la
  // migration shop_orders a réellement corrigé des données sur cet appareil)
  const [migrationReport, setMigrationReport] = useState(() => getShopOrdersMigrationReport());
  const navigate = useNavigate();

  // Rafraîchir les alertes quand une nouvelle arrive (cloche admin)
  useEffect(() => {
    const refresh = () => setAlerts(getAdminAlerts());
    window.addEventListener('adminAlertsUpdated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('adminAlertsUpdated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // Fermer la cloche quand on clique ailleurs
  useEffect(() => {
    if (!alertsOpen) return undefined;
    const handleClickOutside = (e) => {
      if (!e.target.closest('.admin-alerts-panel') && !e.target.closest('.admin-alerts-toggle')) {
        setAlertsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [alertsOpen]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  const openAlerts = (e) => {
    e.stopPropagation();
    setAlertsOpen((o) => !o);
    if (!alertsOpen && unreadCount > 0) {
      // Marquer comme lues après ouverture
      setTimeout(() => {
        markAllAlertsRead();
        setAlerts(getAdminAlerts());
      }, 800);
    }
  };

  const handleAlertClick = (alert) => {
    markAlertRead(alert.id);
    setAlerts(getAdminAlerts());
    setAlertsOpen(false);
    if (alert.link) {
      navigate(alert.link);
    }
  };

  const formatAlertDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date)) return '';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const alertIcons = {
    order: <ShoppingBag size={15} className="text-blue-500" />,
    success: <CheckCheck size={15} className="text-green-500" />,
    warning: <AlertTriangle size={15} className="text-amber-500" />,
    info: <Info size={15} className="text-gray-500" />,
  };

  // Texte du bandeau de migration selon ce qui a été corrigé
  const migrationMessage = (report) => {
    if (report.note) return report.note;
    const parts = [];
    if (report.repaired > 0) parts.push(`${report.repaired} commande(s) réparée(s)`);
    if (report.dropped > 0) parts.push(`${report.dropped} entrée(s) invalide(s) supprimée(s)`);
    return parts.join(' et ') || 'Des commandes malformées ont été nettoyées.';
  };

  const menuItems = [
    { path: '/admin', name: 'Tableau de bord', icon: LayoutDashboard },
    { path: '/admin/products', name: 'Produits', icon: Package },
    { path: '/admin/reviews', name: 'Avis clients', icon: MessageSquare },
    { path: '/admin/subscribers', name: 'Abonnés', icon: Mail },
    { path: '/admin/orders', name: 'Commandes', icon: ShoppingCart },
    { path: '/admin/users', name: 'Utilisateurs', icon: Users },
    { path: '/admin/categories', name: 'Catégories', icon: Grid },
    { path: '/admin/analytics', name: 'Analytiques', icon: TrendingUp },
    { path: '/admin/history', name: 'Historiques', icon: HistoryIcon },
    { path: '/admin/settings', name: 'Paramètres', icon: Settings },
  ];

  // Bascule le mode « Ouverture prochaine » (1 clic, synchronisé partout)
  const handleToggleSiteMode = (goingOnline) => {
    updateSettings({ ...settings, comingSoon: !goingOnline });
    setSiteModeConfirm(null);
    const siteName = settings.siteName || 'Site';
    if (goingOnline) {
      showToast('Site en ligne : la boutique est visible pour tout le monde', 'success');
      logActivity({
        type: 'settings',
        action: 'mise en ligne du site',
        subject: siteName,
        details: 'Le site est visible pour tous les visiteurs',
        actor: { name: 'Admin', role: 'admin' },
      });
    } else {
      showToast('Page d\'attente activée : le site est masqué', 'info');
      logActivity({
        type: 'settings',
        action: 'activation du mode « ouverture prochaine »',
        subject: siteName,
        details: 'Le site affiche la page d\'attente',
        actor: { name: 'Admin', role: 'admin' },
      });
    }
  };

  const handleLogout = () => {
    let actor = null;
    try {
      const u = JSON.parse(localStorage.getItem('current_admin_user') || 'null');
      if (u && u.name) actor = u;
    } catch {
      // ignore
    }
    logActivity({
      type: 'auth',
      action: 'déconnexion',
      subject: actor?.name || 'Admin',
      details: 'Déconnexion de l\'administration',
      actor: actor || { name: 'Admin', role: 'admin' },
    });
    // Déconnexion COMPLÈTE : supprime toutes les clés de session
    // (localStorage + sessionStorage) pour que la reconnexion soit obligatoire
    logoutComplete();
    window.location.href = '/admin/login';
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-700">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (drawer sur mobile) */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-gray-900 text-white transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold">Admin {settings.siteName}</h2>
            <p className="text-sm text-gray-400">Tableau de bord</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Cloche de notifications (desktop) */}
            <div className="relative">
              <button
                onClick={openAlerts}
                aria-label="Notifications"
                className="admin-alerts-toggle relative p-2 hover:bg-gray-700 rounded-full transition text-gray-300 hover:text-white"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {alertsOpen && (
                <div className="admin-alerts-panel absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border dark:border-gray-700 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <p className="font-semibold text-sm text-gray-800 dark:text-white">Notifications</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => { markAllAlertsRead(); setAlerts(getAdminAlerts()); }}
                        className="text-xs text-primary hover:underline"
                      >
                        Tout marquer lu
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-8">Aucune notification</p>
                    ) : (
                      alerts.map((alert) => (
                        <button
                          key={alert.id}
                          onClick={() => handleAlertClick(alert)}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition border-b dark:border-gray-700/60 ${alert.read ? 'opacity-60' : ''}`}
                        >
                          <span className="mt-0.5 shrink-0">{alertIcons[alert.type] || alertIcons.info}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium truncate text-gray-800 dark:text-white">{alert.title}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{alert.message}</span>
                            <span className="block text-[10px] text-gray-400 mt-0.5">{formatAlertDate(alert.date)}</span>
                          </span>
                          {!alert.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5"></span>}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-gray-300 hover:text-white transition p-1"
              aria-label="Fermer le menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <nav className="p-4 overflow-y-auto h-[calc(100vh-73px)]">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg mb-1 transition ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800'
                }`
              }
            >
              <item.icon size={18} />
              {item.name}
            </NavLink>
          ))}
          {/* Visibilité du site : bascule « en ligne / page d'attente » */}
          <div className="mt-4 p-3 rounded-lg border border-gray-700/70 bg-gray-800/60">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
              {settings.comingSoon ? (
                <Clock size={12} className="text-amber-400" />
              ) : (
                <Globe size={12} className="text-green-400" />
              )}
              Visibilité du site
            </p>
            <div className="flex items-center gap-2 mb-2.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  settings.comingSoon
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-green-500/15 text-green-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    settings.comingSoon ? 'bg-amber-400' : 'bg-green-400'
                  }`}
                />
                {settings.comingSoon ? 'Page d\'attente' : 'Site en ligne'}
              </span>
            </div>
            <button
              onClick={() =>
                setSiteModeConfirm(settings.comingSoon ? 'online' : 'waiting')
              }
              className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                settings.comingSoon
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {settings.comingSoon ? (
                <>
                  <Globe size={15} />
                  Mettre le site en ligne
                </>
              ) : (
                <>
                  <EyeOff size={15} />
                  Masquer le site
                </>
              )}
            </button>
            <p className="mt-2 text-[10px] text-gray-500 leading-snug">
              {settings.comingSoon
                ? 'Les visiteurs voient la page « Ouverture prochaine ».'
                : 'La boutique est visible par tout le monde.'}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition mt-4"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </nav>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Barre de navigation mobile */}
        <div className="md:hidden sticky top-0 z-20 flex items-center gap-3 bg-gray-900 text-white px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
            className="p-1 hover:bg-white/10 rounded transition"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold">Admin {settings.siteName}</span>
          <div className="ml-auto flex items-center gap-2">
            {/* Cloche de notifications (mobile) */}                <div className="relative">
              <button
                onClick={openAlerts}
                aria-label="Notifications"
                className="admin-alerts-toggle relative p-1.5 hover:bg-white/10 rounded transition"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {alertsOpen && (
                <div className="admin-alerts-panel absolute right-0 top-10 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border dark:border-gray-700 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <p className="font-semibold text-sm">Notifications</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => { markAllAlertsRead(); setAlerts(getAdminAlerts()); }}
                        className="text-xs text-primary hover:underline"
                      >
                        Tout marquer lu
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-8">Aucune notification</p>
                    ) : (
                      alerts.map((alert) => (
                        <button
                          key={alert.id}
                          onClick={() => handleAlertClick(alert)}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition border-b dark:border-gray-700/60 ${alert.read ? 'opacity-60' : ''}`}
                        >
                          <span className="mt-0.5 shrink-0">{alertIcons[alert.type] || alertIcons.info}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium truncate">{alert.title}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{alert.message}</span>
                            <span className="block text-[10px] text-gray-400 mt-0.5">{formatAlertDate(alert.date)}</span>
                          </span>
                          {!alert.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5"></span>}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bandeau : des commandes malformées ont été réparées par la migration */}
        {migrationReport && (
          <div className="animate-fadeIn mx-4 md:mx-6 mt-4 md:mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
            <Wrench size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1 text-sm text-amber-800 dark:text-amber-200">
              <p className="font-semibold">Commandes nettoyées automatiquement</p>
              <p className="text-xs opacity-80">
                {migrationMessage(migrationReport)} — vérifiez la liste des commandes.
              </p>
            </div>
            <button
              onClick={() => navigate('/admin/orders')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
            >
              <ShoppingCart size={14} />
              Voir les commandes
            </button>
            <button
              onClick={() => {
                dismissShopOrdersMigrationReport();
                setMigrationReport(null);
              }}
              aria-label="Fermer le bandeau"
              className="rounded-full p-1.5 text-amber-700 transition hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <main className="flex-1 min-w-0 mt-4 md:mt-6 mr-0 md:mr-6 ml-0 md:ml-7 overflow-x-auto">
          <Outlet />
        </main>
      </div>

      {/* Confirmation de bascule de visibilité */}
      <ConfirmModal
        open={Boolean(siteModeConfirm)}
        title={siteModeConfirm === 'online' ? 'Mettre le site en ligne ?' : 'Masquer le site ?'}
        message={
          siteModeConfirm === 'online'
            ? 'La boutique deviendra visible par TOUS les visiteurs (et sur tous les appareils via la synchronisation Supabase). Vous pourrez la remasquer à tout moment avec ce même bouton.'
            : 'Le site affichera à nouveau la page « Ouverture prochaine ». La boutique sera masquée pour tous les visiteurs.'
        }
        confirmLabel={siteModeConfirm === 'online' ? 'Oui, mettre en ligne' : 'Oui, masquer'}
        cancelLabel="Annuler"
        onConfirm={() => handleToggleSiteMode(siteModeConfirm === 'online')}
        onCancel={() => setSiteModeConfirm(null)}
      />
    </div>
  );
};

export default AdminLayout;
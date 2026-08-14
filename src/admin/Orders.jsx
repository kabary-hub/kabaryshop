import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, CheckCircle, XCircle, Clock, MoreVertical, Package, Truck, AlertCircle, User, Calendar, CreditCard, MapPin, Phone, Mail, Search, Users, UserCheck, LogOut, Filter, ChevronDown, ArrowUpDown, Camera, Banknote, Shield, StickyNote, Lightbulb, Archive, Hourglass } from 'lucide-react';
import { logActivity } from '../utils/history';
import { showToast } from '../utils/toast';
import { sendShippingAssignmentEmail } from '../utils/subscribers';
import Pagination from '../components/Pagination/Pagination';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';
import UserAvatar from '../components/UserAvatar/UserAvatar';
import CustomerHistory from './CustomerHistory';
import { normalizePhone } from '../utils/phone';
import { applyOrderRetention, applyCancelledOrderCleanup, getArchivedOrders, MAX_COMPLETED_ORDERS, CANCELLED_RETENTION_DAYS } from '../utils/orderArchive';

// Nombre de commandes affichées par page
const PAGE_SIZE = 8;

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [selectedOrderForShipping, setSelectedOrderForShipping] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterShipper, setFilterShipper] = useState('all');
  const [adminUsers, setAdminUsers] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  // Commande en attente de confirmation de rejet
  const [orderToReject, setOrderToReject] = useState(null);
  // Fiche client : historique de toutes les commandes d'un même numéro
  const [historyCustomer, setHistoryCustomer] = useState(null);

  // Importer / remplacer la photo de l'utilisateur connecté
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Veuillez sélectionner une image valide', 'warning');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const photo = String(reader.result || '');
      // Mettre à jour l'utilisateur connecté (current_admin_user)
      setCurrentUser((prev) => ({ ...prev, photo }));
      // Persister dans app_users pour que la photo suive sur tous les appareils
      try {
        const users = JSON.parse(localStorage.getItem('app_users') || '[]');
        const updated = users.map((u) =>
          String(u.id) === String(currentUser.id) ? { ...u, photo } : u,
        );
        localStorage.setItem('app_users', JSON.stringify(updated));
        window.dispatchEvent(new Event('userChanged'));
      } catch {
        // Persistance secondaire : la photo reste sur current_admin_user
      }
      showToast('Photo de profil mise à jour', 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ==================== CHARGEMENT DES UTILISATEURS ====================
  const loadUsers = () => {
    const savedUsers = localStorage.getItem('app_users');
    if (savedUsers) {
      const parsedUsers = JSON.parse(savedUsers);
      setAdminUsers(parsedUsers);
    }
  };

  // ==================== UTILISATEUR CONNECTÉ ====================
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('current_admin_user');
    if (saved) {
      return JSON.parse(saved);
    }
    return { id: 1, name: 'Admin Principal', role: 'admin', avatar: '' };
  });

  // Sauvegarder l'utilisateur connecté — UNIQUEMENT si la valeur a réellement
  // changé, sinon le dispatch 'userChanged' + le listener handleUserChange
  // (setCurrentUser avec une nouvelle référence) créent une boucle infinie
  // qui fige la page Commandes.
  useEffect(() => {
    const serialized = JSON.stringify(currentUser);
    if (localStorage.getItem('current_admin_user') !== serialized) {
      localStorage.setItem('current_admin_user', serialized);
      window.dispatchEvent(new Event('userChanged'));
    }
  }, [currentUser]);

  // ==================== SYNC AVEC USERS.JSX ====================
  // S'exécute au montage du composant ET à chaque fois que la page devient active
  useEffect(() => {
    // Charger les utilisateurs au montage
    loadUsers();
    
    // Écouter les changements d'utilisateur
    const handleUserChange = () => {
      const updatedUser = localStorage.getItem('current_admin_user');
      if (updatedUser) {
        // Ne met à jour l'état que si la valeur a réellement changé (évite les
        // nouvelles références à chaque événement → aucune boucle de rendu).
        setCurrentUser((prev) => {
          try {
            const parsed = JSON.parse(updatedUser);
            return JSON.stringify(prev) === JSON.stringify(parsed) ? prev : parsed;
          } catch {
            return prev;
          }
        });
      }
      loadUsers(); // Recharger la liste des utilisateurs
    };
    
    // Écouter les changements de route (quand on revient de Users)
    const handleRouteChange = () => {
      loadUsers();
      const updatedUser = localStorage.getItem('current_admin_user');
      if (updatedUser && JSON.parse(updatedUser).id !== currentUser.id) {
        setCurrentUser(JSON.parse(updatedUser));
      }
    };

    // Rafraîchir les commandes quand elles changent : sur cet ordinateur
    // (event ordersUpdated) ou depuis un autre appareil (synchronisation
    // Supabase qui déclenche aussi storage).
    const handleOrdersUpdate = () => loadOrders();

    window.addEventListener('userChanged', handleUserChange);
    window.addEventListener('focus', handleRouteChange); // Quand la page reprend le focus
    window.addEventListener('pageshow', handleRouteChange); // Quand la page est affichée
    window.addEventListener('ordersUpdated', handleOrdersUpdate);
    window.addEventListener('storage', handleOrdersUpdate);
    
    return () => {
      window.removeEventListener('userChanged', handleUserChange);
      window.removeEventListener('focus', handleRouteChange);
      window.removeEventListener('pageshow', handleRouteChange);
      window.removeEventListener('ordersUpdated', handleOrdersUpdate);
      window.removeEventListener('storage', handleOrdersUpdate);
    };
  }, [currentUser.id]);

  // ==================== LOG DES ACTIONS ====================
  const addActionLog = (orderId, action, details) => {
    const logs = JSON.parse(localStorage.getItem('order_logs') || '[]');
    const newLog = {
      id: Date.now(),
      orderId,
      action,
      details,
      user: currentUser.name,
      userRole: currentUser.role,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    localStorage.setItem('order_logs', JSON.stringify(logs));
    // Journal central (page Historiques)
    const order = orders.find(o => String(o.id) === String(orderId));
    const orderRef = order?.reference || `CMD-${orderId}`;
    const actionLabels = {
      shipped: 'expédition',
      completed: 'complétée',
      cancelled: 'annulation',
      rejected: 'rejet',
    };
    logActivity({
      type: 'order',
      action: actionLabels[action] || action,
      subject: `Commande ${orderRef}`,
      details: `${details || ''} · Client : ${order?.customer?.name || '—'}`.trim(),
    });
  };

  // ==================== CHARGEMENT DES COMMANDES ====================
  useEffect(() => {
    loadOrders();
  }, []);

  // ==================== OUVERTURE DEPUIS LE TABLEAU DE BORD ====================
  // Si l'URL contient ?open=<orderId> (clic depuis le Dashboard), ouvrir les détails
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    const openOrderId = searchParams.get('open');
    if (!openOrderId || orders.length === 0) return;
    const target = orders.find(o => String(o.id) === String(openOrderId) || (o.reference && String(o.reference) === String(openOrderId)));
    if (target) {
      viewOrderDetails(target);
      autoOpenedRef.current = true; // ne se déclenche qu'une seule fois
      // Nettoyer l'URL pour ne pas rouvrir la modale à chaque re-rendu
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne doit s'exécuter qu'au chargement des commandes
  }, [orders]);

  const loadOrders = () => {
    const savedOrders = localStorage.getItem('shop_orders');
    if (savedOrders) {
      let parsed = [];
      try {
        parsed = JSON.parse(savedOrders);
      } catch {
        parsed = [];
      }
      // Rétention : dès que les commandes complétées dépassent 1000, les plus
      // anciennes sont archivées automatiquement (site_order_archive) au lieu
      // d'être supprimées — rien n'est perdu.
      const { orders: kept, archivedCount } = applyOrderRetention(parsed);
      // Auto-effacement : les commandes ANNULÉES (non supprimables à la main)
      // disparaissent d'elles-mêmes après CANCELLED_RETENTION_DAYS jours.
      const { orders: cleaned, removedCount } = applyCancelledOrderCleanup(kept);
      if (removedCount > 0) {
        saveOrders(cleaned);
        showToast(`${removedCount} commande(s) annulée(s) effacée(s) automatiquement (plus de ${CANCELLED_RETENTION_DAYS} jours)`, 'info');
        logActivity({
          type: 'order',
          action: 'auto-effacement',
          subject: `${removedCount} commande(s) annulée(s)`,
          details: `Commandes annulées effacées automatiquement après ${CANCELLED_RETENTION_DAYS} jours.`,
        });
      } else if (archivedCount > 0) {
        saveOrders(cleaned);
        showToast(`${archivedCount} commande(s) terminée(s) archivée(s) automatiquement (plafond de 1000 atteint)`, 'info');
        logActivity({
          type: 'order',
          action: 'archivage automatique',
          subject: `${archivedCount} commande(s)`,
          details: `Commandes complétées archivées automatiquement (plafond de ${MAX_COMPLETED_ORDERS} atteint).`,
        });
      } else {
        setOrders(parsed);
      }
    }
    setLoading(false);
  };

  const saveOrders = (newOrders) => {
    setOrders(newOrders);
    localStorage.setItem('shop_orders', JSON.stringify(newOrders));
    window.dispatchEvent(new Event('ordersUpdated'));
  };

  // ==================== FILTRES ====================
  const filterOrdersByPeriod = (ordersToFilter) => {
    if (filterPeriod === 'all') return ordersToFilter;
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return ordersToFilter.filter(order => {
      const orderDate = new Date(order.date);
      if (filterPeriod === 'week') return orderDate >= startOfWeek;
      if (filterPeriod === 'month') return orderDate >= startOfMonth;
      return true;
    });
  };

  const filterOrdersByShipper = (ordersToFilter) => {
    if (filterShipper === 'all') return ordersToFilter;
    if (filterShipper === 'pending') {
      return ordersToFilter.filter(order => !order.shipping);
    }
    return ordersToFilter.filter(order => order.shipping?.by === filterShipper);
  };

  const sortOrders = (ordersToSort) => {
    const sorted = [...ordersToSort];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date) - new Date(b.date);
          break;
        case 'shipper': {
          const shipperA = a.shipping?.by || '';
          const shipperB = b.shipping?.by || '';
          comparison = shipperA.localeCompare(shipperB);
          break;
        }
        case 'status': {
          const statusOrder = { pending: 1, shipped: 2, completed: 3, cancelled: 4 };
          comparison = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
          break;
        }
        case 'amount':
          comparison = a.total - b.total;
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  };

  // Afficher la référence lisible si disponible, sinon l'ID numérique.
  // Null-safe : appelé aussi quand orderToReject est null (la modale de rejet
  // évalue ses props à chaque rendu, même fermée).
  const displayOrderId = (order) =>
    order?.reference || (order ? `CMD-${order.id}` : '');

  const searchFilteredOrders = orders.filter(order => {
    const term = searchTerm.toLowerCase();
    // Le numéro de téléphone est normalisé pour retrouver un client même si le
    // format saisi diffère (+224, espaces, 0 initial…).
    const phoneDigits = normalizePhone(order?.customer?.phone);
    const termDigits = normalizePhone(term);
    return (
      order?.customer?.name?.toLowerCase().includes(term) ||
      String(order?.id ?? '').includes(term) ||
      (order?.reference || '').toLowerCase().includes(term) ||
      (termDigits && phoneDigits && phoneDigits.includes(termDigits))
    );
  });

  let processedOrders = filterOrdersByPeriod(searchFilteredOrders);
  processedOrders = filterOrdersByShipper(processedOrders);
  processedOrders = sortOrders(processedOrders);

  // Remonter à la première page quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterPeriod, filterShipper, sortBy, sortOrder]);
  // Pagination
  const totalPages = Math.max(1, Math.ceil(processedOrders.length / PAGE_SIZE));
  const currentPageOrders = processedOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ==================== GESTION DES EXPÉDITIONS ====================
  const openShippingModal = (order) => {
    setSelectedOrderForShipping(order);
    setShowShippingModal(true);
    setShowActionMenu(null);
  };

  const confirmShipping = async (orderId, shipper) => {
    const order = orders.find(o => o.id === orderId);
    const updatedOrders = orders.map(orderItem =>
      orderItem.id === orderId ? {
        ...orderItem,
        status: 'shipped',
        shipping: {
          by: shipper.name,
          byId: shipper.id,
          role: shipper.role,
          date: new Date().toISOString(),
          notes: `Expédié par ${shipper.name} (${shipper.role === 'livreur' ? 'Livreur' : 'Admin'})`
        }
      } : orderItem
    );
    saveOrders(updatedOrders);
    addActionLog(orderId, 'shipped', `Commande expédiée par ${shipper.name} (${shipper.role})`);
    // Envoyer la commande par email au livreur / préparateur assigné
    const emailResult = await sendShippingAssignmentEmail({
      toEmail: shipper.email,
      toName: shipper.name,
      order,
    });
    if (emailResult.ok) {
      showToast(emailResult.message, 'success');
    } else {
      showToast(`Commande assignée à ${shipper.name}. ${emailResult.message}`, 'warning');
    }
    setShowShippingModal(false);
    setSelectedOrderForShipping(null);
  };

  const updateStatus = (orderId, newStatus) => {
    let updatedOrders = orders.map(order =>
      order.id === orderId ? { ...order, status: newStatus } : order
    );
    // Rétention : une commande passée « complétée » peut déclencher l'archivage
    // automatique des plus anciennes si le plafond de 1000 est dépassé.
    if (newStatus === 'completed') {
      const { orders: kept, archivedCount } = applyOrderRetention(updatedOrders);
      if (archivedCount > 0) {
        updatedOrders = kept;
        showToast(`${archivedCount} commande(s) terminée(s) archivée(s) automatiquement (plafond de 1000 atteint)`, 'info');
        logActivity({
          type: 'order',
          action: 'archivage automatique',
          subject: `${archivedCount} commande(s)`,
          details: `Commandes complétées archivées automatiquement (plafond de ${MAX_COMPLETED_ORDERS} atteint).`,
        });
      }
    }
    saveOrders(updatedOrders);
    addActionLog(orderId, newStatus, `Statut changé en ${newStatus}`);
    setShowActionMenu(null);
  };

  const rejectOrder = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    // Une commande terminée ou déjà annulée ne peut plus être rejetée
    if (order && order.status === 'completed') {
      showToast('Cette commande est terminée : elle ne peut plus être rejetée', 'warning');
      setShowActionMenu(null);
      return;
    }
    if (order && order.status === 'cancelled') {
      showToast('Cette commande annulée ne peut pas être supprimée : elle s\'effacera automatiquement après 10 jours', 'warning');
      setShowActionMenu(null);
      return;
    }
    // Ouvre la modale de confirmation au lieu de window.confirm
    setOrderToReject(order);
  };

  const confirmRejectOrder = () => {
    if (!orderToReject) return;
    const orderId = orderToReject.id;
    // Rejeter ne supprime plus la commande : elle passe au statut « Annulée »
    // (avec sa date d'annulation) et s'effacera automatiquement après 10 jours.
    const updatedOrders = orders.map(order =>
      order.id === orderId
        ? { ...order, status: 'cancelled', cancelledAt: new Date().toISOString() }
        : order
    );
    saveOrders(updatedOrders);
    addActionLog(orderId, 'cancelled', 'Commande annulée (auto-effacement après 10 jours)');
    showToast(`La commande #${displayOrderId(orderToReject)} a été annulée — elle s'effacera automatiquement dans 10 jours`, 'success');
    setOrderToReject(null);
    setShowActionMenu(null);
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  // ==================== FONCTIONS D'AFFICHAGE ====================
  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: <Clock size={14} />, text: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      shipped: { icon: <Truck size={14} />, text: 'Expédiée', color: 'bg-blue-100 text-blue-800' },
      completed: { icon: <CheckCircle size={14} />, text: 'Complétée', color: 'bg-green-100 text-green-800' },
      cancelled: { icon: <XCircle size={14} />, text: 'Annulée', color: 'bg-red-100 text-red-800' }
    };
    return badges[status] || badges.pending;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Jours restants avant l'auto-effacement d'une commande annulée
  // (CANCELLED_RETENTION_DAYS à compter de cancelledAt, sinon la date).
  const getCancelledCountdown = (order) => {
    if (order?.status !== 'cancelled') return null;
    const ref = new Date(order.cancelledAt || order.date).getTime();
    if (!Number.isFinite(ref)) return null;
    const remainingMs =
      CANCELLED_RETENTION_DAYS * 24 * 60 * 60 * 1000 - (Date.now() - ref);
    return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  };

  // ==================== STATISTIQUES ====================
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  // Nombre de commandes archivées (lues une seule fois par rendu)
  const archivedCount = getArchivedOrders().length;

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* En-tête avec utilisateur connecté */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="font-bold text-2xl">Gestion des commandes</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUserModal(true)}
            className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <UserAvatar user={currentUser} className="w-10 h-10 sm:w-11 sm:h-11 text-2xl" />
            <div className="text-left">
              <p className="font-semibold text-sm">{currentUser.name}</p>
              <p className="text-xs text-gray-500">
                {currentUser.role === 'admin' ? 'Administrateur' : currentUser.role === 'livreur' ? 'Livreur' : 'Préparateur'}
              </p>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total commandes</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">En attente</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Complétées</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
          <p className="text-2xl font-bold text-orange-600">{stats.shipped}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Expédiées</p>
        </div>
      </div>
      {/* Archive : les commandes complétées au-delà de 1000 y sont déplacées
          automatiquement (jamais supprimées) — voir src/utils/orderArchive.js */}
      <p className="mb-6 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
        <Archive size={13} />
        <span>
          {archivedCount > 0 ? (
            <>
              {archivedCount} commande(s) terminée(s) archivée(s) — la liste active reste sous le plafond de {MAX_COMPLETED_ORDERS}, rien n'est supprimé (incluses dans la fiche client).
            </>
          ) : (
            <>
              Archivage automatique actif : les commandes complétées au-delà de {MAX_COMPLETED_ORDERS} sont archivées (jamais supprimées, incluses dans la fiche client).
            </>
          )}
          <span className="block mt-0.5">
            Les commandes annulées ne peuvent pas être supprimées : elles s'effacent automatiquement après {CANCELLED_RETENTION_DAYS} jours.
          </span>
        </span>
      </p>

      {/* Barre de recherche et filtres */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par client, téléphone, ID ou référence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 bg-gray-100 dark:focus:ring-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-gray-800"
            />
          </div>

          {/* Fiche client directe : taper un numéro puis cliquer pour voir tout l'historique */}
          <button
            onClick={() => {
              const phoneDigits = normalizePhone(searchTerm);
              if (!phoneDigits) {
                showToast('Saisissez un numéro de téléphone pour ouvrir la fiche client', 'warning');
                return;
              }
              const found = orders.find(
                (o) => normalizePhone(o?.customer?.phone) === phoneDigits,
              );
              if (found) {
                setHistoryCustomer(found.customer);
              } else {
                // Numéro inconnu dans la liste active : la fiche peut quand même
                // exister via l'archive (commandes complétées archivées).
                const archived = getArchivedOrders();
                const foundArchived = archived.find(
                  (o) => normalizePhone(o?.customer?.phone) === phoneDigits,
                );
                if (foundArchived) {
                  setHistoryCustomer(foundArchived.customer);
                } else {
                  showToast('Aucune commande trouvée pour ce numéro', 'warning');
                }
              }
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition flex items-center gap-2 shrink-0"
          >
            <Users size={16} />
            Fiche client
          </button>
          
          {/* Filtre par période */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterPeriod('all')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                filterPeriod === 'all' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Filter size={16} />
              Toutes
            </button>
            <button
              onClick={() => setFilterPeriod('week')}
              className={`px-4 py-2 rounded-lg transition ${
                filterPeriod === 'week' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Cette semaine
            </button>
            <button
              onClick={() => setFilterPeriod('month')}
              className={`px-4 py-2 rounded-lg transition ${
                filterPeriod === 'month' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Ce mois
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          {/* Filtre par expéditeur */}
          <div className="flex-1">
            <select
              value={filterShipper}
              onChange={(e) => setFilterShipper(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 bg-gray-100 dark:focus:ring-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-gray-800"
            >
              <option value="all">Tous les expéditeurs</option>
              <option value="pending">Non expédiées</option>
              {adminUsers.map(user => (
                <option key={user.id} value={user.name}>{user.name}</option>
              ))}
            </select>
          </div>

          {/* Tris */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                if (sortBy === 'date') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('date');
                  setSortOrder('desc');
                }
              }}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                sortBy === 'date' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Calendar size={16} />
              Date
              {sortBy === 'date' && <ArrowUpDown size={14} />}
            </button>
            
            <button
              onClick={() => {
                if (sortBy === 'shipper') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('shipper');
                  setSortOrder('asc');
                }
              }}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                sortBy === 'shipper' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <UserCheck size={16} />
              Expéditeur
              {sortBy === 'shipper' && <ArrowUpDown size={14} />}
            </button>
            
            <button
              onClick={() => {
                if (sortBy === 'status') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('status');
                  setSortOrder('asc');
                }
              }}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                sortBy === 'status' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Clock size={16} />
              Statut
              {sortBy === 'status' && <ArrowUpDown size={14} />}
            </button>
            
            <button
              onClick={() => {
                if (sortBy === 'amount') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('amount');
                  setSortOrder('desc');
                }
              }}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                sortBy === 'amount' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Banknote size={16} />
              Montant
              {sortBy === 'amount' && <ArrowUpDown size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des commandes */}
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Montant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Expédié par</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {processedOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  Aucune commande trouvée
                </td>
              </tr>
            ) : (
              currentPageOrders.map((order) => {
                const statusBadge = getStatusBadge(order.status);
                return (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    onClick={() => viewOrderDetails(order)}
                  >
                    <td className="px-6 py-4 font-medium">#{displayOrderId(order)}</td>
                    <td className="px-6 py-4">{order.customer?.name || '—'}</td>
                    <td className="px-6 py-4">{formatDate(order.date)}</td>
                    <td className="px-6 py-4 font-semibold text-primary">{(order.total || 0).toLocaleString()} GNF</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                        {statusBadge.icon}
                        {statusBadge.text}
                      </span>
                      {/* Compte à rebours : les commandes annulées s'effacent
                          automatiquement après CANCELLED_RETENTION_DAYS jours */}
                      {order.status === 'cancelled' && (() => {
                        const days = getCancelledCountdown(order);
                        if (days === null) return null;
                        return (
                          <span
                            className="block mt-1 text-[11px] text-red-500 font-medium flex items-center gap-1"
                            title="La commande annulée s'effacera automatiquement à cette date"
                          >
                            <Hourglass size={11} />
                            {days <= 0
                              ? 'Auto-effacement aujourd’hui'
                              : `Suppression auto dans ${days} j`}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {order.shipping ? (
                        <div className="flex items-center gap-1">
                          {/* Icône primary quand la commande est complétée */}
                          <UserCheck size={14} className={order.status === 'completed' ? 'text-primary' : 'text-green-500'} />
                          <span className="font-medium">{order.shipping.by}</span>
                          <span className="text-xs text-gray-400 ml-1">
                            ({formatDate(order.shipping.date).split(' ')[0]})
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs flex items-center gap-1">
                          <Clock size={12} />
                          Non expédiée
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setShowActionMenu(showActionMenu === order.id ? null : order.id)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                      >
                        <MoreVertical size={18} />
                      </button>

              {showActionMenu === order.id && (
                <div className="absolute right-6 top-12 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 w-52">
                          <div className="py-1">
                            {order.status === 'pending' && (
                              <button
                                onClick={() => openShippingModal(order)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Truck size={16} />
                                Expédition
                              </button>
                            )}
                            {order.status === 'shipped' && (
                              <button
                                onClick={() => updateStatus(order.id, 'completed')}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <CheckCircle size={16} />
                                Marquer complétée
                              </button>
                            )}
                            {/* Une commande terminée ou déjà annulée ne peut plus être
                                rejetée : les annulées s'effacent seules après 10 jours */}
                            {(order.status === 'pending' || order.status === 'shipped') && (
                              <button
                                onClick={() => rejectOrder(order.id)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                              >
                                <XCircle size={16} />
                                Rejeter la commande
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={processedOrders.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

      {/* Fiche client : historique complet par numéro de téléphone
          (commandes actives + commandes archivées) */}
      {historyCustomer && (
        <CustomerHistory
          customer={historyCustomer}
          orders={orders}
          archivedOrders={getArchivedOrders()}
          onClose={() => setHistoryCustomer(null)}
        />
      )}

      {/* Modal de confirmation de rejet */}
      <ConfirmModal
        open={Boolean(orderToReject)}
        title="Rejeter la commande ?"
        message={`Êtes-vous sûr de vouloir rejeter la commande #${displayOrderId(orderToReject)} de ${orderToReject?.customer?.name || ''} ? Elle sera marquée « Annulée », ne pourra plus être supprimée manuellement et s'effacera automatiquement après 10 jours.`}
        confirmLabel="Rejeter"
        cancelLabel="Annuler"
        danger
        onConfirm={confirmRejectOrder}
        onCancel={() => setOrderToReject(null)}
      />

      {/* Modal de sélection du livreur */}
      {showShippingModal && selectedOrderForShipping && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Expédition de la commande #{displayOrderId(selectedOrderForShipping)}</h2>
                <button
                  onClick={() => setShowShippingModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Client : <strong>{selectedOrderForShipping.customer?.name || '—'}</strong>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Choisir le responsable de l'expédition :</label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {adminUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => confirmShipping(selectedOrderForShipping.id, user)}
                      className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left"
                    >
                      <UserAvatar user={user} className="w-10 h-10 sm:w-11 sm:h-11 text-2xl" showSiteLogo={false} />
                      <div className="flex-1">
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-xs text-gray-500">
                          {user.role === 'admin' ? 'Administrateur' : user.role === 'livreur' ? 'Livreur' : 'Préparateur'}
                        </p>
                      </div>
                      <Truck size={18} className="text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection d'utilisateur */}
      {showUserModal && (
        <div className="fixed inset-0 pt-30 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full max-h-[75vh] overflow-y-auto">
            <div className="p-2">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-gray-900">
                <h2 className="text-xl font-bold">Changer d'utilisateur</h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                Sélectionnez l'utilisateur qui va gérer le site
              </p>

              {/* Photo de l'utilisateur connecté : import cliquable */}
              <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border border-dashed border-primary/40 bg-primary/5">
                <label className="relative cursor-pointer group shrink-0" title="Importer votre photo">
                  <UserAvatar user={currentUser} className="w-10 h-10 sm:w-11 sm:h-11 text-2xl" />
                  <span className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow">
                    <Camera size={12} />
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{currentUser.name}</p>
                  <p className="text-xs text-gray-500">
                    Cliquez sur l'avatar pour importer votre photo
                  </p>
                </div>
                <label className="cursor-pointer shrink-0">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                    <Camera size={14} />
                    Importer
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
              </div>

              <div className="space-y-2">
                {adminUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      const userToSave = {
                        id: user.id,
                        name: user.name,
                        role: user.role,
                        avatar: user.avatar,
                        // Conserver la photo si l'utilisateur en a une
                        photo: user.photo
                      };
                      setCurrentUser(userToSave);
                      localStorage.setItem('current_admin_user', JSON.stringify(userToSave));
                      window.dispatchEvent(new Event('userChanged'));
                      setShowUserModal(false);
                      loadUsers(); // Recharger immédiatement
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition text-left ${
                      currentUser?.id === user.id
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <UserAvatar user={user} className="w-10 h-10 sm:w-11 sm:h-11 text-base" showSiteLogo={false} />
                    <div className="flex-1">
                      <p className="font-semibold">{user.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'livreur' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role === 'admin' ? <><Shield size={11} /> Administrateur</> : 
                           user.role === 'livreur' ? <><Truck size={11} /> Livreur</> : <><Package size={11} /> Préparateur</>}
                        </span>
                        <span className="text-xs text-gray-400">{user.email}</span>
                      </div>
                    </div>
                    {currentUser?.id === user.id && (
                      <CheckCircle size={18} className="text-green-500" />
                    )}
                  </button>
                ))}
              </div>
              
              <div className="mt-4 pt-3 border-t dark:border-gray-700">
                <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                  <Lightbulb size={12} /> Les utilisateurs sont gérés dans l'onglet "Utilisateurs" du menu admin
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal des détails de la commande */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 pt-33 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="px-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold">Détails de la commande #{displayOrderId(selectedOrder)}</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                >
                  ✕
                </button>
              </div>

              {/* Informations client */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 mb-2">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User size={18} /> Informations client
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-400" />
                    <span>{selectedOrder.customer?.name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" />
                    <span>{selectedOrder.customer?.email || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" />
                    <span>{selectedOrder.customer?.phone || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span>{selectedOrder.customer?.address || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span>{formatDate(selectedOrder.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard size={14} className="text-gray-400" />
                    <span>{selectedOrder.paymentMethod || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Informations d'expédition */}
              {selectedOrder.shipping && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 mb-2">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Truck size={18} /> Informations d'expédition
                  </h3>
                  <div className="text-sm space-y-1.5">
                    <p className="flex items-center gap-1.5"><Package size={14} className="text-blue-500 shrink-0" /> Expédié par : <strong>{selectedOrder.shipping.by}</strong></p>
                    <p className="flex items-center gap-1.5"><Calendar size={14} className="text-blue-500 shrink-0" /> Date d'expédition : {formatDate(selectedOrder.shipping.date)}</p>
                    {selectedOrder.shipping.notes && <p className="flex items-start gap-1.5"><StickyNote size={14} className="text-blue-500 shrink-0 mt-0.5" /> Note : {selectedOrder.shipping.notes}</p>}
                  </div>
                </div>
              )}

              {/* Liste des produits */}
              <div className="mb-4">
                <h3 className="font-semibold mb-3">Produits commandés</h3>
                <table className="w-full text-sm">
                  <thead className="border-b dark:border-gray-700">
                    <tr>
                      <th className="text-left py-2">Produit</th>
                      <th className="text-center py-2">ID produit</th>
                      <th className="text-center py-2">Quantité</th>
                      <th className="text-right py-2">Prix unitaire</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item, idx) => (
                      <tr key={idx} className="border-b dark:border-gray-700">
                        <td className="py-2">{item.name}</td>
                        <td className="text-center py-2">
                          {item.id ? (
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-mono">
                              {item.id}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="text-center py-2">{item.quantity}</td>
                        <td className="text-right py-2">{(item.price || 0).toLocaleString()} GNF</td>
                        <td className="text-right py-2">{((item.price || 0) * item.quantity).toLocaleString()} GNF</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="4" className="text-right py-3 font-bold">Total :</td>
                      <td className="text-right py-3 font-bold text-primary">{(selectedOrder.total || 0).toLocaleString()} GNF</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3 pb-10 justify-end">
                {selectedOrder.customer?.phone && (
                  <button
                    onClick={() => {
                      setHistoryCustomer(selectedOrder.customer);
                      setShowDetailsModal(false);
                    }}
                    className="px-4 py-2 bg-primary/10 text-primary border border-primary/30 rounded-lg hover:bg-primary/20 transition flex items-center gap-2"
                  >
                    <Users size={16} />
                    Historique du client
                  </button>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  Fermer
                </button>
                {selectedOrder.status === 'pending' && (
                  <button
                    onClick={() => {
                      openShippingModal(selectedOrder);
                      setShowDetailsModal(false);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
                  >
                    <Truck size={16} />
                    Expédier
                  </button>
                )}
                {selectedOrder.status === 'shipped' && (
                  <button
                    onClick={() => {
                      updateStatus(selectedOrder.id, 'completed');
                      setShowDetailsModal(false);
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                  >
                    <CheckCircle size={16} className="inline mr-2" />
                    Compléter
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
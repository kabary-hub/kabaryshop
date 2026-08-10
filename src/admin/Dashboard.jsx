// src/admin/Dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Package, ShoppingCart, DollarSign, Star, ShoppingBag, Clock, CheckCircle, XCircle, Truck, ChevronRight } from 'lucide-react';
import { getAllProducts } from '../components/Products/products';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Badge de statut (même logique que la page Commandes)
  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: <Clock size={14} />, text: 'En attente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
      shipped: { icon: <Truck size={14} />, text: 'Expédiée', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
      completed: { icon: <CheckCircle size={14} />, text: 'Complétée', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
      cancelled: { icon: <XCircle size={14} />, text: 'Annulée', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
    };
    return badges[status] || badges.pending;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date)) return '—';
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const displayOrderId = (order) => order.reference || `CMD-${order.id}`;

  const generatePopularProducts = (orders) => {
    const productSales = {};
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const key = item.id ? String(item.id) : (item.name || 'Produit inconnu');
          if (!productSales[key]) {
            productSales[key] = { id: item.id || null, name: item.name || 'Produit inconnu', img: item.img || item.image || null, sales: 0, revenue: 0 };
          }
          productSales[key].sales += item.quantity || 1;
          productSales[key].revenue += (item.price || 0) * (item.quantity || 1);
          if (item.img && !productSales[key].img) productSales[key].img = item.img;
        });
      }
    });
    return Object.values(productSales)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  };

  const loadDashboardData = useCallback(() => {
    try {
      // Produits (même source que la boutique : défauts + personnalisés)
      const products = getAllProducts();

      // Commandes
      const savedOrders = localStorage.getItem('shop_orders');
      const orders = savedOrders ? JSON.parse(savedOrders) : [];

      // Utilisateurs enregistrés
      const savedUsers = localStorage.getItem('app_users');
      const users = savedUsers ? JSON.parse(savedUsers) : [];

      const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

      setStats({
        totalProducts: products.length,
        totalOrders: orders.length,
        totalUsers: users.length,
        totalRevenue
      });

      // 5 dernières commandes (les plus récentes d'abord)
      const sortedOrders = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecentOrders(sortedOrders.slice(0, 5));

      // Produits les plus vendus (calculés depuis les commandes)
      setPopularProducts(generatePopularProducts(orders));
    } catch {
      // Données illisibles : le tableau de bord reste sur ses valeurs par défaut
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    // Recharger en direct quand les données du site changent
    const handleUpdate = () => loadDashboardData();
    const events = ['ordersUpdated', 'productsUpdated', 'userChanged', 'subscribersUpdated', 'storage'];
    events.forEach(event => window.addEventListener(event, handleUpdate));
    return () => events.forEach(event => window.removeEventListener(event, handleUpdate));
  }, [loadDashboardData]);

  // Destination de chaque carte de statistiques
  const statCards = [
    { title: 'Produits', value: stats.totalProducts.toLocaleString(), icon: Package, color: 'blue', sub: 'dans la boutique', to: '/admin/products' },
    { title: 'Commandes', value: stats.totalOrders.toLocaleString(), icon: ShoppingCart, color: 'green', sub: 'au total', to: '/admin/orders' },
    { title: 'Utilisateurs', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'purple', sub: 'enregistrés', to: '/admin/users' },
    { title: 'Revenus (GNF)', value: stats.totalRevenue.toLocaleString(), icon: DollarSign, color: 'orange', sub: 'voir les analytiques', to: '/admin/analytics' },
  ];

  const iconStyles = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  const handleProductClick = useCallback((product) => {
    let exists = false;
    try {
      // Si le produit existe encore au catalogue, aller sur sa fiche publique
      exists = getAllProducts().some(p => String(p.id) === String(product.id));
    } catch {
      // Vérification impossible : on considère que le produit n'existe plus
      exists = false;
    }
    if (exists) {
      navigate(`/produit/${product.id}`);
    } else {
      // Sinon, ouvrir la page Produits de l'admin avec la recherche pré-remplie
      navigate(`/admin/products?search=${encodeURIComponent(product.name)}`);
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-5">
        <h1 className="font-bold text-2xl sm:text-3xl">Tableau de bord</h1>
        <span className="text-xs text-gray-400">
          Dernière mise à jour : {new Date().toLocaleString('fr-FR')}
        </span>
      </div>

      {/* Cartes de statistiques (cliquables) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <button
            key={stat.title}
            type="button"
            onClick={() => navigate(stat.to)}
            title={`Aller à : ${stat.title}`}
            className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 sm:p-5 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition duration-200 text-left cursor-pointer group w-full"
          >
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shrink-0 ${iconStyles[stat.color]} group-hover:scale-105 transition-transform`}>
              <stat.icon size={26} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm text-gray-500 truncate">{stat.title}</h3>
              <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white truncate">{stat.value}</p>
              <p className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                {stat.sub}
                <ChevronRight size={11} className="opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Grille basse */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Dernières commandes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <ShoppingCart size={18} className="text-secondary" />
              Dernières commandes
            </h3>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-gray-400">{recentOrders.length} récentes</span>
              <Link
                to="/admin/orders"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
              >
                Voir tout
                <ChevronRight size={12} />
              </Link>
            </div>
          </div>
          {recentOrders.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Aucune commande pour le moment
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => {
                const badge = getStatusBadge(order.status);
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => navigate(`/admin/orders?open=${encodeURIComponent(String(order.id))}`)}
                    title={`Voir la commande ${displayOrderId(order)}`}
                    className="w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow transition cursor-pointer text-left group"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-sm block truncate group-hover:text-primary transition-colors">#{displayOrderId(order)}</span>
                      <span className="text-xs text-gray-400 block">
                        {order.customer?.name || 'Client'} · {formatDate(order.date)}
                      </span>
                    </div>
                    <span className="text-sm font-semibold">{(order.total || 0).toLocaleString()} GNF</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                      {badge.icon}
                      {badge.text}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Produits populaires */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Star size={18} className="text-secondary" />
              Produits les plus vendus
            </h3>
            <Link
              to="/admin/products"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5 shrink-0"
            >
              Voir tout
              <ChevronRight size={12} />
            </Link>
          </div>
          {popularProducts.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Aucune vente enregistrée pour le moment
            </div>
          ) : (
            <div className="space-y-2">
              {popularProducts.map((product) => (
                <button
                  key={product.id || product.name}
                  type="button"
                  onClick={() => handleProductClick(product)}
                  title={`Voir « ${product.name} »`}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow transition cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {product.img && (
                      <img
                        src={product.img}
                        alt={product.name}
                        className="w-8 h-8 rounded object-cover shrink-0"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">{product.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <ShoppingBag size={13} className="text-gray-400" />
                      {product.sales}
                    </span>
                    <span className="text-sm font-semibold">{(product.revenue || 0).toLocaleString()} GNF</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

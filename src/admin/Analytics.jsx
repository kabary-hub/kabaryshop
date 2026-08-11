// src/admin/Analytics.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, ShoppingBag, DollarSign, Calendar, Download, Printer, FileText, ArrowUp, ArrowDown } from 'lucide-react';
import { showToast } from '../utils/toast';
import { useSettings } from '../context/SettingsContext';

const Analytics = () => {
  const { settings } = useSettings();
  const siteName = settings.siteName || 'Kabary Shop';
  const navigate = useNavigate();
  // Période par défaut : cette semaine (l'admin peut choisir aujourd'hui s'il le souhaite)
  const [period, setPeriod] = useState('week');
  const [analyticsData, setAnalyticsData] = useState({
    revenue: { value: 0, change: 0, trend: 'up' },
    orders: { value: 0, change: 0, trend: 'up' },
    users: { value: 0, change: 0, trend: 'up' }
  });
  const [chartData, setChartData] = useState({
    labels: [],
    revenue: [],
    orders: []
  });
  const [topProducts, setTopProducts] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  const loadAnalyticsData = useCallback(() => {
    try {
      // Récupérer les commandes
      const savedOrders = localStorage.getItem('shop_orders');
      const orders = savedOrders ? JSON.parse(savedOrders) : [];
      
      // Récupérer les utilisateurs
      const savedUsers = localStorage.getItem('app_users');
      const users = savedUsers ? JSON.parse(savedUsers) : [];
      
      // Filtrer par période
      const now = new Date();
      let filteredOrders = [];
      let previousPeriodOrders = [];
      
      switch(period) {
        case 'day': {
          // Aujourd'hui
          filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate.toDateString() === now.toDateString();
          });
          
          // Hier
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          previousPeriodOrders = orders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate.toDateString() === yesterday.toDateString();
          });
          break;
        }
        
        case 'week': {
          // Cette semaine (7 derniers jours)
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= weekAgo && orderDate <= now;
          });
          
          // Semaine dernière (7 jours avant)
          const lastWeekStart = new Date(now);
          lastWeekStart.setDate(lastWeekStart.getDate() - 14);
          const lastWeekEnd = new Date(now);
          lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
          previousPeriodOrders = orders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= lastWeekStart && orderDate < lastWeekEnd;
          });
          break;
        }
        
        case 'month': {
          // Ce mois (30 derniers jours)
          const monthAgo = new Date(now);
          monthAgo.setDate(monthAgo.getDate() - 30);
          filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= monthAgo && orderDate <= now;
          });
          
          // Mois dernier (30 jours avant)
          const lastMonthStart = new Date(now);
          lastMonthStart.setDate(lastMonthStart.getDate() - 60);
          const lastMonthEnd = new Date(now);
          lastMonthEnd.setDate(lastMonthEnd.getDate() - 30);
          previousPeriodOrders = orders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= lastMonthStart && orderDate < lastMonthEnd;
          });
          break;
        }
        
        case 'year': {
          // Cette année (365 derniers jours)
          const yearAgo = new Date(now);
          yearAgo.setDate(yearAgo.getDate() - 365);
          filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= yearAgo && orderDate <= now;
          });
          
          // Année dernière (365 jours avant)
          const lastYearStart = new Date(now);
          lastYearStart.setDate(lastYearStart.getDate() - 730);
          const lastYearEnd = new Date(now);
          lastYearEnd.setDate(lastYearEnd.getDate() - 365);
          previousPeriodOrders = orders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= lastYearStart && orderDate < lastYearEnd;
          });
          break;
        }
        
        default:
          filteredOrders = orders;
          previousPeriodOrders = [];
      }

      // Calculer les revenus
      const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      const previousRevenue = previousPeriodOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      
      // Calculer les commandes
      const totalOrders = filteredOrders.length;
      const previousOrders = previousPeriodOrders.length;

      // Calculer les pourcentages de changement
      let revenueChange = 0;
      let ordersChange = 0;
      
      if (previousRevenue > 0) {
        revenueChange = ((totalRevenue - previousRevenue) / previousRevenue) * 100;
      } else if (totalRevenue > 0) {
        revenueChange = 100; // Si pas de revenu avant et revenu maintenant
      }
      
      if (previousOrders > 0) {
        ordersChange = ((totalOrders - previousOrders) / previousOrders) * 100;
      } else if (totalOrders > 0) {
        ordersChange = 100; // Si pas de commandes avant et commandes maintenant
      }

      // Mettre à jour les statistiques
      setAnalyticsData({
        revenue: {
          value: totalRevenue,
          change: revenueChange,
          trend: revenueChange >= 0 ? 'up' : 'down'
        },
        orders: {
          value: totalOrders,
          change: ordersChange,
          trend: ordersChange >= 0 ? 'up' : 'down'
        },
        users: {
          value: users.length,
          change: 0,
          trend: 'up'
        }
      });

      // Générer les données du graphique
      generateChartData(orders, period);

      // Générer les top produits
      generateTopProducts(filteredOrders);

    } catch {
      // Chargement silencieux : on garde les données affichées en cas d'erreur
    }
  }, [period]);

  // Charger les données quand la période change
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Rafraîchir automatiquement quand les données changent : sur cet
  // ordinateur (events) ou depuis un autre appareil (synchronisation
  // Supabase qui déclenche storage).
  useEffect(() => {
    const handleUpdate = () => loadAnalyticsData();
    const events = ['ordersUpdated', 'productsUpdated', 'userChanged', 'storage'];
    events.forEach((evt) => window.addEventListener(evt, handleUpdate));
    return () =>
      events.forEach((evt) => window.removeEventListener(evt, handleUpdate));
  }, [loadAnalyticsData]);

  const generateChartData = (orders, periodType) => {
    const now = new Date();
    let labels = [];
    let revenueData = [];
    let ordersData = [];
    
    switch(periodType) {
      case 'day': {
        // Dernières 24 heures par heure
        for (let i = 23; i >= 0; i--) {
          const hour = new Date(now);
          hour.setHours(hour.getHours() - i);
          const hourLabel = hour.getHours().toString().padStart(2, '0') + 'h';
          labels.push(hourLabel);
          
          const hourOrders = orders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate.getHours() === hour.getHours() && 
                   orderDate.toDateString() === now.toDateString();
          });
          
          revenueData.push(hourOrders.reduce((sum, o) => sum + (o.total || 0), 0));
          ordersData.push(hourOrders.length);
        }
        break;
      }
        
      case 'week': {
        // 7 derniers jours
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        for (let i = 6; i >= 0; i--) {
          const day = new Date(now);
          day.setDate(day.getDate() - i);
          labels.push(days[day.getDay()]);
          
          const dayOrders = orders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate.toDateString() === day.toDateString();
          });
          
          revenueData.push(dayOrders.reduce((sum, o) => sum + (o.total || 0), 0));
          ordersData.push(dayOrders.length);
        }
        break;
      }
        
      case 'month': {
        // 30 derniers jours
        for (let i = 29; i >= 0; i--) {
          const day = new Date(now);
          day.setDate(day.getDate() - i);
          labels.push(day.getDate().toString());
          
          const dayOrders = orders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate.toDateString() === day.toDateString();
          });
          
          revenueData.push(dayOrders.reduce((sum, o) => sum + (o.total || 0), 0));
          ordersData.push(dayOrders.length);
        }
        break;
      }
        
      case 'year': {
        // 12 derniers mois
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        for (let i = 11; i >= 0; i--) {
          const month = new Date(now);
          month.setMonth(month.getMonth() - i);
          labels.push(months[month.getMonth()]);
          
          const monthOrders = orders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate.getMonth() === month.getMonth() && 
                   orderDate.getFullYear() === month.getFullYear();
          });
          
          revenueData.push(monthOrders.reduce((sum, o) => sum + (o.total || 0), 0));
          ordersData.push(monthOrders.length);
        }
        break;
      }
        
      default:
        labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];
        revenueData = [0, 0, 0, 0, 0, 0];
        ordersData = [0, 0, 0, 0, 0, 0];
    }
    
    setChartData({
      labels,
      revenue: revenueData,
      orders: ordersData
    });
  };

  const generateTopProducts = (orders) => {
    const productSales = {};
    
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const key = item.id ? String(item.id) : (item.name || 'Produit inconnu');
          if (!productSales[key]) {
            productSales[key] = { id: item.id || null, name: item.name || 'Produit inconnu', sales: 0, revenue: 0 };
          }
          productSales[key].sales += item.quantity || 1;
          productSales[key].revenue += (item.price || 0) * (item.quantity || 1);
        });
      }
    });
    
    const sorted = Object.values(productSales)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);
    
    setTopProducts(sorted);
  };

  const getPeriodLabel = () => {
    switch(period) {
      case 'day': return 'hier';
      case 'week': return 'la semaine dernière';
      case 'month': return 'le mois dernier';
      case 'year': return 'l\'année dernière';
      default: return '';
    }
  };

  const getCurrentPeriodLabel = () => {
    switch(period) {
      case 'day': return "aujourd'hui";
      case 'week': return 'cette semaine';
      case 'month': return 'ce mois';
      case 'year': return 'cette année';
      default: return '';
    }
  };

  const formatCurrency = (value) => {
    return value.toLocaleString() + ' GNF';
  };

  const formatChange = (change) => {
    if (change === 0) return '0%';
    return (change > 0 ? '+' : '') + change.toFixed(1) + '%';
  };

  // Fonction d'export
  const handleExport = (format) => {
    setExportLoading(true);
    
    try {
      const data = {
        period: getCurrentPeriodLabel(),
        comparedTo: getPeriodLabel(),
        generatedAt: new Date().toLocaleString(),
        stats: {
          revenue: analyticsData.revenue.value,
          revenueChange: analyticsData.revenue.change,
          orders: analyticsData.orders.value,
          ordersChange: analyticsData.orders.change,
          users: analyticsData.users.value
        },
        chartData: chartData,
        topProducts: topProducts
      };

      if (format === 'print') {
        window.print();
      } else if (format === 'csv') {
        exportCSV(data);
      } else if (format === 'json') {
        exportJSON(data);
      }
    } catch {
      // Export en échec → notification visuelle au lieu d'un console.log/alert
      showToast('Erreur lors de l\'export', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const exportCSV = (data) => {
    let csv = `Rapport Analytique ${siteName}\n`;
    csv += `Période: ${data.period}\n`;
    csv += `Comparé à: ${data.comparedTo}\n`;
    csv += `Généré le: ${data.generatedAt}\n\n`;
    csv += 'Statistiques\n';
    csv += `Revenus totaux,${data.stats.revenue}\n`;
    csv += `Variation revenus,${data.stats.revenueChange}%\n`;
    csv += `Commandes,${data.stats.orders}\n`;
    csv += `Variation commandes,${data.stats.ordersChange}%\n`;
    csv += `Utilisateurs,${data.stats.users}\n\n`;
    csv += 'Top Produits\n';
    csv += 'Produit,Ventes,Revenus\n';
    data.topProducts.forEach(p => {
      csv += `${p.name},${p.sales},${p.revenue}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${period}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = (data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${period}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMaxValue = (data) => {
    const max = Math.max(...data);
    return max === 0 ? 1 : max;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="text-secondary" />
            Analytiques {siteName}
          </h1>
          <p className="text-gray-500 mt-1">Statistiques et performances de la boutique</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </select>
          
          <button 
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <FileText size={18} />
            CSV
          </button>
          <button 
            onClick={() => handleExport('print')}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <Printer size={18} />
            Imprimer
          </button>
        </div>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Revenus */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Revenus totaux</p>
              <p className="text-2xl font-bold">{formatCurrency(analyticsData.revenue.value)}</p>
              <div className="flex items-center gap-1 text-sm">
                {analyticsData.revenue.trend === 'up' ? (
                  <ArrowUp className="text-green-500" size={16} />
                ) : (
                  <ArrowDown className="text-red-500" size={16} />
                )}
                <span className={analyticsData.revenue.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                  {formatChange(analyticsData.revenue.change)} vs {getPeriodLabel()}
                </span>
              </div>
            </div>
            <DollarSign className="text-green-500" size={32} />
          </div>
        </div>

        {/* Commandes */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Commandes</p>
              <p className="text-2xl font-bold">{analyticsData.orders.value}</p>
              <div className="flex items-center gap-1 text-sm">
                {analyticsData.orders.trend === 'up' ? (
                  <ArrowUp className="text-green-500" size={16} />
                ) : (
                  <ArrowDown className="text-red-500" size={16} />
                )}
                <span className={analyticsData.orders.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                  {formatChange(analyticsData.orders.change)} vs {getPeriodLabel()}
                </span>
              </div>
            </div>
            <ShoppingBag className="text-blue-500" size={32} />
          </div>
        </div>

        {/* Utilisateurs */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Utilisateurs</p>
              <p className="text-2xl font-bold">{analyticsData.users.value}</p>
              <p className="text-sm text-gray-500">Utilisateurs enregistrés</p>
            </div>
            <Users className="text-purple-500" size={32} />
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
          <h3 className="font-semibold mb-4">Revenus {getCurrentPeriodLabel()}</h3>
          <div className="space-y-3">
            {chartData.labels.map((label, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{label}</span>
                  <span className="font-medium">{formatCurrency(chartData.revenue[index] || 0)}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full h-4 transition-all duration-500"
                    style={{ 
                      width: `${((chartData.revenue[index] || 0) / getMaxValue(chartData.revenue)) * 100}%`,
                      minWidth: '4px'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
          <h3 className="font-semibold mb-4">Commandes {getCurrentPeriodLabel()}</h3>
          <div className="space-y-3">
            {chartData.labels.map((label, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{label}</span>
                  <span className="font-medium">{chartData.orders[index] || 0}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 rounded-full h-4 transition-all duration-500"
                    style={{ 
                      width: `${((chartData.orders[index] || 0) / getMaxValue(chartData.orders)) * 100}%`,
                      minWidth: '4px'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top produits */}
      {/* Conteneur marqué print-area : l'impression n'affiche QUE cette liste */}
      <div className="print-area bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold">Produits les plus vendus</h3>
          <p className="text-sm text-gray-500">Top 10 des produits les plus vendus</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ventes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    Aucune donnée disponible
                  </td>
                </tr>
              ) : (
                topProducts.map((product, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                    onClick={() =>
                      navigate(`/admin/products?search=${encodeURIComponent(product.name)}`)
                    }
                    title="Voir le produit dans la liste"
                  >
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full text-xs font-bold">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{product.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1">
                        <ShoppingBag size={14} className="text-gray-400" />
                        {product.sales}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-green-600">
                      {formatCurrency(product.revenue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Loading Overlay */}
      {exportLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span>Export en cours...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
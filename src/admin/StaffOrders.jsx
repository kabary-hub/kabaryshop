// src/admin/StaffOrders.jsx
// Page « Commandes » de l'espace staff — LECTURE SEULE.
// - Le staff (livreur/préparateur) consulte les commandes sans bouton d'action.
// - Les commandes EN ATTENTE sont masquées par défaut ; elles n'apparaissent
//   que si l'admin a accordé l'accès complet à cet utilisateur
//   (permission ordersFullAccess gérée dans Admin > Utilisateurs).
import React, { useState, useEffect } from "react";
import { Search, Clock, Truck, CheckCircle, XCircle, Eye } from "lucide-react";
import { getStaffUser } from "../utils/auth";
import Pagination from "../components/Pagination/Pagination";

// Nombre de commandes affichées par page
const PAGE_SIZE = 8;

const StaffOrders = () => {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staffUser, setStaffUser] = useState(null);
  const [page, setPage] = useState(1);

  // L'utilisateur staff connecté et sa permission d'accès complet
  useEffect(() => {
    const user = getStaffUser();
    setStaffUser(user);
  }, []);

  const loadOrders = () => {
    try {
      const savedOrders = JSON.parse(localStorage.getItem("shop_orders") || "[]");
      setOrders(savedOrders);
    } catch {
      setOrders([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
    const handleUpdate = () => loadOrders();
    window.addEventListener("ordersUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("ordersUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Accès complet (voir les commandes en attente) accordé par l'admin ?
  const canSeePending = !!staffUser?.ordersFullAccess;

  // Lecture seule : on retire les boutons d'action ; les commandes en attente
  // ne sont visibles que si l'accès complet a été accordé.
  const visibleOrders = orders.filter((order) => {
    if (!canSeePending && order.status === "pending") return false;
    return true;
  });

  const filtered = visibleOrders.filter((order) => {
    const term = searchTerm.toLowerCase();
    return (
      order.customer?.name?.toLowerCase().includes(term) ||
      String(order.id).includes(term) ||
      (order.reference || "").toLowerCase().includes(term)
    );
  });

  // Remonter à la première page quand la recherche change
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPageOrders = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: <Clock size={14} />, text: "En attente", color: "bg-yellow-100 text-yellow-800" },
      shipped: { icon: <Truck size={14} />, text: "Expédiée", color: "bg-blue-100 text-blue-800" },
      completed: { icon: <CheckCircle size={14} />, text: "Complétée", color: "bg-green-100 text-green-800" },
      cancelled: { icon: <XCircle size={14} />, text: "Annulée", color: "bg-red-100 text-red-800" },
    };
    return badges[status] || badges.pending;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const displayOrderId = (order) => order.reference || `CMD-${order.id}`;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="text-blue-600" />
            Commandes (lecture seule)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Vous consultez les commandes. Les actions de gestion sont réservées à l'administrateur.
          </p>
        </div>
        {!canSeePending && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
            <Clock size={15} />
            Commandes en attente masquées
          </span>
        )}
      </div>

      {/* Recherche */}
      <div className="relative max-w-md mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par client, ID ou référence..."
          className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Tableau (lecture seule) */}
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  Aucune commande à afficher.
                </td>
              </tr>
            ) : (
              currentPageOrders.map((order) => {
                const badge = getStatusBadge(order.status);
                return (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-medium">#{displayOrderId(order)}</td>
                    <td className="px-6 py-4">{order.customer?.name}</td>
                    <td className="px-6 py-4">{formatDate(order.date)}</td>
                    <td className="px-6 py-4 font-semibold text-primary">
                      {(order.total || 0).toLocaleString()} GNF
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                        {badge.icon}
                        {badge.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {order.shipping ? (
                        <span className="inline-flex items-center gap-1">
                          <Truck size={14} className="text-green-500" />
                          {order.shipping.by}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Non expédiée</span>
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
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

      {/* Détails de la commande (lecture seule) */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Détails de la commande #{displayOrderId(selectedOrder)}
              </h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p><strong>Client :</strong> {selectedOrder.customer?.name}</p>
              <p><strong>Téléphone :</strong> {selectedOrder.customer?.phone}</p>
              <p><strong>Adresse :</strong> {selectedOrder.customer?.address}</p>
              <p><strong>Paiement :</strong> {selectedOrder.paymentMethod}</p>
              <p><strong>Date :</strong> {formatDate(selectedOrder.date)}</p>
            </div>

            <h3 className="font-semibold mb-2">Articles</h3>
            <table className="w-full text-sm">
              <thead className="border-b dark:border-gray-700">
                <tr>
                  <th className="text-left py-2">Produit</th>
                  <th className="text-center py-2">Qté</th>
                  <th className="text-right py-2">Prix</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {(selectedOrder.items || []).map((item, idx) => (
                  <tr key={idx} className="border-b dark:border-gray-700">
                    <td className="py-2">{item.name}</td>
                    <td className="text-center py-2">{item.quantity}</td>
                    <td className="text-right py-2">{(item.price || 0).toLocaleString()} GNF</td>
                    <td className="text-right py-2">{((item.price || 0) * item.quantity).toLocaleString()} GNF</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" className="text-right py-3 font-bold">Total :</td>
                  <td className="text-right py-3 font-bold text-primary">
                    {(selectedOrder.total || 0).toLocaleString()} GNF
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffOrders;

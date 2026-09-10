// src/pages/TrackOrder.jsx
// Page de suivi de commande public - Kabary Shop
// Lecture privilégiée depuis l'API publique (api/order.js) quand elle est
// disponible (environnement Vercel). Fallback localStorage côté client.

import React, { useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { getPublicOrderByReference } from '../services/supabase.js';
import { formatPrice } from '../utils/currencyUtils';
import { useSettings } from '../context/SettingsContext';
import { logActivity } from '../utils/history';
import { showToast } from '../utils/toast';

const API_BASE =
  typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : '';

const fetchPublicOrder = async (reference) => {
  // 1) Essayer d'abord la lecture locale (localStorage) : c'est la source
  //    la plus rapide et elle fonctionne même sans API ni Supabase.
  const localOrder = await getPublicOrderByReference(reference);
  if (localOrder) {
    return sanitizePublicOrder(localOrder);
  }

  // 2) Si non trouvée localement, essayer l'API publique (Vercel) si
  //    disponible. Utile quand la commande a été créée sur un autre appareil
  //    et synchronisée vers le serveur.
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/order?ref=${encodeURIComponent(reference)}`);
      if (res.ok) {
        return await res.json();
      }
      // La commande n'existe pas sur le serveur non plus : on garde le
      // résultat local (null) pour afficher le message d'erreur.
    } catch {
      // L'API publique indisponible : on conserve le résultat local.
    }
  }

  return null;
};

// Nettoyage des champs sensibles pour l'export public.
const sanitizePublicOrder = (order) => {
  if (!order) return null;
  return {
    reference: order.reference,
    date: order.date || order.created_at,
    status: order.status,
    items: (order.items || []).map((item) => ({
      id: item.id || null,
      name: item.name || item.title || 'Produit',
      quantity: item.quantity || 1,
      price: item.price || 0,
      img: item.img || null,
    })),
    total: order.total || 0,
    payment_method: order.payment_method || 'Mobile Money',
    shipping: order.shipping
      ? {
          by: order.shipping.by,
          date: order.shipping.date,
          notes: order.shipping.notes,
        }
      : null,
    cancelledAt: order.cancelled_at || order.cancelledAt || null,
  };
};

// Logique de suivi principale (importée depuis le service Supabase / fallback localStorage).
// getPublicOrderByReference est conservé pour les usages existants et comme fallback explicite.

const TrackOrder = () => {
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const { ref } = useParams();
  const initialRef = ref || searchParams.get('ref') || '';
  const [reference, setReference] = useState(initialRef);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tracked, setTracked] = useState(false);

  const trackOrder = async () => {
    if (!reference.trim()) {
      setError('Veuillez saisir une référence de commande');
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);
    setTracked(false);

    try {
      const foundOrder = await fetchPublicOrder(reference.trim());
      if (foundOrder) {
        setOrder(foundOrder);
        setTracked(true);
        logActivity({
          type: 'order',
          action: 'suivi public',
          subject: foundOrder.reference,
          details: `Consultation publique de la commande ${foundOrder.reference}`,
          actor: { name: 'Client', role: 'visitor' },
        });
      } else {
        setError('Commande non trouvée. Vérifiez le numéro de référence.');
      }
    } catch (err) {
      setError(err.message || 'Impossible de rechercher la commande. Réessayez plus tard.');
      showToast('Suivi indisponible. Réessayez dans quelques instants.', 'error');
    }

    setLoading(false);
  };

  // Auto-track si la référence est dans l'URL
  React.useEffect(() => {
    if (initialRef && !tracked) {
      trackOrder();
    }
  }, [initialRef, tracked]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'shipped':
        return 'Expédiée';
      case 'completed':
        return 'Complétée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Suivi de Commande</h1>
        <p className="text-gray-600">Entrez votre numéro de référence pour suivre votre commande</p>
      </header>

      {/* Formulaire de suivi */}
      <div className="mb-6">
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="CMD-260908-2401940001-1430"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              trackOrder();
            }
          }}
        />
        <button
          onClick={trackOrder}
          disabled={loading}
          className="w-full mt-3 bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
        >
          {loading ? 'Recherche...' : 'Suivre ma commande'}
        </button>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Détails de la commande */}
      {order && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Détails de la commande</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
          </div>

          <div className="space-y-3 text-sm sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
            <div className="flex justify-between sm:flex-col sm:gap-1">
              <span className="text-gray-600 dark:text-gray-300">Référence :</span>
              <span className="font-mono font-medium text-gray-800 dark:text-white">{order.reference}</span>
            </div>
            <div className="flex justify-between sm:flex-col sm:gap-1">
              <span className="text-gray-600 dark:text-gray-300">Date :</span>
              <span className="text-gray-800 dark:text-white">{formatDate(order.date)}</span>
            </div>
            <div className="flex justify-between sm:flex-col sm:gap-1">
              <span className="text-gray-600 dark:text-gray-300">Paiement :</span>
              <span className="text-gray-800 dark:text-white">{order.payment_method || 'Mobile Money'}</span>
            </div>
          </div>

          {/* Articles */}
          {order.items && order.items.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold mb-3 text-gray-800 dark:text-white">Articles commandés</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 text-gray-600 dark:text-gray-300">Produit</th>
                    <th className="text-center py-2 text-gray-600 dark:text-gray-300">Qté</th>
                    <th className="text-right py-2 text-gray-600 dark:text-gray-300">Prix</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 text-gray-800 dark:text-white">{item.name || item.title || 'Produit'}</td>
                      <td className="text-center py-2 text-gray-800 dark:text-white">{item.quantity || 1}</td>
                      <td className="text-right py-2 text-gray-800 dark:text-white">{formatPrice((item.price || 0) * (item.quantity || 1), settings.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="2" className="text-right py-3 font-bold text-gray-800 dark:text-white">Total :</td>
                    <td className="text-right py-3 font-bold text-primary">
                      {formatPrice(order.total || 0, settings.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Informations d'expédition */}
          {order.shipping && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 rounded">
              <h3 className="font-semibold mb-2 text-gray-800 dark:text-white">Expédition</h3>
              <p className="text-sm text-gray-800 dark:text-white">
                Expédiée par : <strong>{order.shipping.by}</strong>
              </p>
              <p className="text-sm text-gray-800 dark:text-white">
                Date d'expédition : {formatDate(order.shipping.date)}
              </p>
              {order.shipping.notes && (
                <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">
                  Note : {order.shipping.notes}
                </p>
              )}
            </div>
          )}

          {/* Annulation */}
          {order.status === 'cancelled' && order.cancelledAt && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20 rounded">
              <p className="text-sm text-red-700 dark:text-red-300">
                Cette commande a été annulée le {formatDate(order.cancelledAt)}.
              </p>
            </div>
          )}
        </div>
      )}      {/* État de chargement */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-gray-500">Recherche de la commande...</p>
        </div>
      )}

      {/* Pas encore de commande trackée */}
      {!order && !error && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            Entrez votre numéro de référence ci-dessus pour voir les détails de votre commande.
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Vous trouverez ce numéro dans votre email de confirmation ou dans l'application.
          </p>
        </div>
      )}</div>
  );
};

export default TrackOrder;

// src/pages/TrackOrder.jsx
// Page de suivi de commande public - Kabary Shop

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getOrderByReference } from '../services/supabase.js';

const TrackOrder = () => {
  const [searchParams] = useSearchParams();
  const initialRef = searchParams.get('ref') || '';
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
    setTracked(false);

    try {
      const foundOrder = await getOrderByReference(reference.trim());
      if (foundOrder) {
        setOrder(foundOrder);
        setTracked(true);
      } else {
        setError('Commande non trouvée. Vérifiez le numéro de référence.');
      }
    } catch {
      setError('Impossible de rechercher la commande. Réessayez plus tard.');
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
    <div className="max-w-md mx-auto p-6">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Suivi de Commande</h1>
        <p className="text-gray-600">Entrez votre numéro de référence pour suivre votre commande</p>
      </header>

      {/* Formulaire de suivi */}
      <div className="mb-6">
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="CMD-260908-0020"
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Détails de la commande */}
      {order && (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Détails de la commande</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Référence :</span>
              <span className="font-mono font-medium">{order.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date :</span>
              <span>{formatDate(order.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Client :</span>
              <span>{order.customer_name}</span>
            </div>
            {order.customer_email && (
              <div className="flex justify-between">
                <span className="text-gray-600">Email :</span>
                <span className="break-all">{order.customer_email}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Téléphone :</span>
              <span>{order.customer_phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Adresse :</span>
              <span className="break-all">{order.customer_address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mode de paiement :</span>
              <span>{order.payment_method || 'Mobile Money'}</span>
            </div>
          </div>

          {/* Articles */}
          {order.items && order.items.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="font-semibold mb-3">Articles commandés</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Produit</th>
                    <th className="text-center py-2">Qté</th>
                    <th className="text-right py-2">Prix</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2">{item.name || item.title || 'Produit'}</td>
                      <td className="text-center py-2">{item.quantity || 1}</td>
                      <td className="text-right py-2">{((item.price || 0) * (item.quantity || 1)).toLocaleString()} GNF</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="2" className="text-right py-3 font-bold">Total :</td>
                    <td className="text-right py-3 font-bold text-primary">
                      {(order.total || 0).toLocaleString()} GNF
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Informations d'expédition */}
          {order.shipping && (
            <div className="mt-4 pt-4 border-t bg-blue-50 rounded">
              <h3 className="font-semibold mb-2">Expédition</h3>
              <p className="text-sm">
                Expédiée par : <strong>{order.shipping.by}</strong>
              </p>
              <p className="text-sm">
                Date d'expédition : {formatDate(order.shipping.date)}
              </p>
              {order.shipping.notes && (
                <p className="text-sm mt-1">
                  Note : {order.shipping.notes}
                </p>
              )}
            </div>
          )}

          {/* Annulation */}
          {order.status === 'cancelled' && order.cancelledAt && (
            <div className="mt-4 pt-4 border-t bg-red-50 rounded">
              <p className="text-sm text-red-700">
                Cette commande a été annulée le {formatDate(order.cancelledAt)}.
              </p>
            </div>
          )}
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
      )}
    </div>
  );
};

export default TrackOrder;

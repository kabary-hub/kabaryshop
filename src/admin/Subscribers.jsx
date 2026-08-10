// src/admin/Subscribers.jsx
// Gestion des abonnés newsletter : liste, compteur, copier les emails, supprimer.
import React, { useState, useEffect } from 'react';
import { Users, Mail, Trash2, Copy, Check, Info } from 'lucide-react';
import {
  getSubscribers,
  removeSubscriber,
} from '../utils/subscribers';
import { logActivity } from '../utils/history';
import { showToast } from '../utils/toast';
import Pagination from '../components/Pagination/Pagination';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';

// Nombre d'abonnés affichés par page
const PAGE_SIZE = 10;

const Subscribers = () => {
  const [subscribers, setSubscribers] = useState(() => getSubscribers());
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  // Abonné en attente de confirmation de suppression
  const [subscriberToDelete, setSubscriberToDelete] = useState(null);

  useEffect(() => {
    const handleUpdate = () => setSubscribers(getSubscribers());
    window.addEventListener('subscribersUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('subscribersUpdated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleDelete = (email) => {
    // Ouvre la modale de confirmation au lieu de window.confirm
    setSubscriberToDelete(email);
  };

  const confirmDeleteSubscriber = () => {
    if (!subscriberToDelete) return;
    removeSubscriber(subscriberToDelete);
    logActivity({
      type: 'subscriber',
      action: 'désabonnement',
      subject: subscriberToDelete,
      details: 'Abonné supprimé de la liste newsletter',
    });
    showToast(`L'abonné ${subscriberToDelete} a été supprimé`, 'success');
    setSubscriberToDelete(null);
  };

  const handleCopyAll = async () => {
    const emails = subscribers.map((s) => s.email).join(', ');
    if (!emails) return;
    try {
      await navigator.clipboard.writeText(emails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Impossible de copier les emails', 'error');
    }
  };

  const filtered = subscribers.filter((s) =>
    s.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Pagination : remonter à la page 1 quand la recherche change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset volontaire de la pagination
    setPage(1);
  }, [searchTerm]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="text-blue-600" />
            Abonnés newsletter
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {subscribers.length} abonné{subscribers.length > 1 ? 's' : ''} informé
            {subscribers.length > 1 ? 's' : ''} des nouveaux arrivages.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopyAll}
            disabled={!subscribers.length}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copié !' : 'Copier les emails'}
          </button>
        </div>
      </div>

      {/* Rappel configuration email */}
      <div className="mb-6 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 flex gap-3">
        <Info size={18} className="text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-800 dark:text-emerald-200">
          <p className="font-semibold mb-1">Notifications par email</p>
          <p>
            Les emails sont envoyés via Resend (fonction Vercel) : à chaque nouveau produit
            publié sur le site, un email est envoyé à tous les abonnés.
          </p>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative max-w-sm mb-5">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un email..."
          className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        open={Boolean(subscriberToDelete)}
        title="Supprimer l'abonné ?"
        message={`Êtes-vous sûr de vouloir supprimer l'abonné « ${subscriberToDelete || ''} » de la liste newsletter ?`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        danger
        onConfirm={confirmDeleteSubscriber}
        onCancel={() => setSubscriberToDelete(null)}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Mail size={40} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">
            {subscribers.length === 0
              ? 'Aucun abonné pour le moment. Les clients qui s\'abonnent sur la page d\'accueil apparaîtront ici.'
              : 'Aucun abonné ne correspond à la recherche.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Abonné le</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {currentPage.map((sub) => (
                  <tr key={sub.email} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-3 font-medium">{sub.email}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{formatDate(sub.date)}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleDelete(sub.email)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 transition text-sm"
                        title="Supprimer l'abonné"
                      >
                        <Trash2 size={16} />
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
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
        </div>
      )}
    </div>
  );
};

export default Subscribers;

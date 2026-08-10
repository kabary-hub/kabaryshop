// src/admin/Reviews.jsx
import React, { useState, useEffect } from 'react';
import { Star, Check, Trash2, MessageSquare, Reply, Store } from 'lucide-react';
import {
  getAllUserReviews,
  getReviewStatus,
  approveReview,
  deleteUserReview,
  setReviewReply,
  getAllSiteFeedback,
  approveSiteFeedback,
  deleteSiteFeedback,
  setSiteFeedbackReply,
} from '../utils/reviews';
import { getAllProducts } from '../services/productService';
import { logActivity } from '../utils/history';

// Construit la liste des avis utilisateurs (produits + site) avec les infos
// produit (lecture localStorage). Les avis généraux du site portent le
// marqueur isSiteReview=true et productId='site'.
const buildReviewsList = () => {
  const productById = new Map(
    getAllProducts().map((p) => [String(p.id), p]),
  );
  const productReviews = getAllUserReviews().map((review) => ({
    ...review,
    isSiteReview: false,
    status: getReviewStatus(review),
    productTitle:
      productById.get(String(review.productId))?.title || 'Produit supprimé',
    productImg: productById.get(String(review.productId))?.img || '',
  }));
  const siteReviews = getAllSiteFeedback().map((feedback) => ({
    ...feedback,
    isSiteReview: true,
    productId: 'site',
    productTitle: 'Avis général sur la boutique',
    productImg: '',
  }));
  return [...productReviews, ...siteReviews].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
};

const Reviews = () => {
  const [reviews, setReviews] = useState(buildReviewsList);
  const [filter, setFilter] = useState('pending'); // pending | approved | all
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');

  // Se rafraîchir quand un avis est modifié ailleurs (storage / produits / avis)
  useEffect(() => {
    const handleUpdate = () => setReviews(buildReviewsList());
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('productsUpdated', handleUpdate);
    window.addEventListener('reviewsUpdated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('productsUpdated', handleUpdate);
      window.removeEventListener('reviewsUpdated', handleUpdate);
    };
  }, []);

  const handleApprove = (review) => {
    const ok = review.isSiteReview
      ? approveSiteFeedback(review.id)
      : approveReview(review.productId, review.id);
    if (ok) {
      setReviews(buildReviewsList());
      logActivity({
        type: 'review',
        action: 'validation',
        subject: `Avis de ${review.name}`,
        details: `Note : ${review.rating}/5 · ${review.isSiteReview ? 'Avis général sur la boutique' : 'Produit : ' + review.productTitle}`,
      });
    }
  };

  const handleDelete = (review) => {
    if (window.confirm('Supprimer définitivement cet avis ?')) {
      const ok = review.isSiteReview
        ? deleteSiteFeedback(review.id)
        : deleteUserReview(review.productId, review.id);
      if (ok) {
        setReviews(buildReviewsList());
        logActivity({
          type: 'review',
          action: 'suppression',
          subject: `Avis de ${review.name}`,
          details: `${review.isSiteReview ? 'Avis général' : 'Produit : ' + review.productTitle}`,
        });
      }
    }
  };

  const startReply = (review) => {
    // Ouvrir/fermer la zone de réponse (préremplie avec la réponse existante)
    setReplyingId((current) => (current === review.id ? null : review.id));
    setReplyText(review.reply?.text || '');
    setReplyError('');
  };

  const saveReply = (review) => {
    if (!replyText.trim()) {
      setReplyError('La réponse ne peut pas être vide.');
      return;
    }
    // Répondre à un avis général du site : stocker la réponse sur l'avis
    if (review.isSiteReview) {
      if (setSiteFeedbackReply(review.id, replyText)) {
        setReviews(buildReviewsList());
      }
      setReplyingId(null);
      setReplyText('');
      setReplyError('');
      logActivity({
        type: 'review',
        action: review.reply ? 'modification de la réponse' : 'réponse',
        subject: `Réponse à ${review.name}`,
        details: 'Réponse du vendeur ajoutée sur un avis général',
      });
      return;
    }
    if (setReviewReply(review.productId, review.id, replyText)) {
      setReviews(buildReviewsList());
      setReplyingId(null);
      setReplyText('');
      setReplyError('');
      logActivity({
        type: 'review',
        action: review.reply ? 'modification de la réponse' : 'réponse',
        subject: `Réponse à ${review.name}`,
        details: `Produit : ${review.productTitle}`,
      });
    }
  };

  const removeReply = (review) => {
    if (window.confirm('Supprimer la réponse du vendeur à cet avis ?')) {
      if (review.isSiteReview) {
        if (setSiteFeedbackReply(review.id, null)) {
          setReviews(buildReviewsList());
        }
        setReplyingId(null);
        setReplyText('');
        setReplyError('');
        logActivity({
          type: 'review',
          action: 'suppression de la réponse',
          subject: `Réponse à ${review.name}`,
          details: 'Réponse du vendeur supprimée (avis général)',
        });
        return;
      }
      if (setReviewReply(review.productId, review.id, null)) {
        setReviews(buildReviewsList());
        setReplyingId(null);
        setReplyText('');
        setReplyError('');
        logActivity({
          type: 'review',
          action: 'suppression de la réponse',
          subject: `Réponse à ${review.name}`,
          details: `Produit : ${review.productTitle}`,
        });
      }
    }
  };

  const pendingCount = reviews.filter((r) => r.status === 'pending').length;
  const filtered =
    filter === 'all'
      ? reviews
      : reviews.filter((r) => r.status === filter);

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

  const StarRow = ({ value }) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          className={
            i <= Math.round(Number(value))
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300'
          }
        />
      ))}
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Modération des avis</h1>
          <p className="text-sm text-gray-500 mt-1">
            Validez ou supprimez les avis soumis par les clients.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 font-semibold text-sm">
            <MessageSquare size={15} />
            {pendingCount} avis en attente
          </span>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'pending', label: `En attente (${pendingCount})` },
          { key: 'approved', label: `Avis certifiés (${reviews.length - pendingCount})` },
          { key: 'all', label: `Tous (${reviews.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {/* Pas d'icône pour le cas « aucun avis en attente » */}
          {filter !== 'pending' && (
            <MessageSquare size={40} className="mx-auto text-gray-400 mb-3" />
          )}
          <p className="text-gray-500">
            {filter === 'pending'
              ? 'Aucun avis en attente de validation. 🎉'
              : 'Aucun avis soumis par les utilisateurs pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <div
              key={`${review.productId}_${review.id}`}
              className={`rounded-lg border p-4 bg-white dark:bg-gray-900 ${
                review.status === 'pending'
                  ? 'border-amber-300 dark:border-amber-700'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {review.productImg && (
                    <img
                      src={review.productImg}
                      alt={review.productTitle}
                      className="w-12 h-12 object-cover rounded-lg border shrink-0"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {review.productTitle}
                    </p>
                    <p className="text-xs text-gray-500">
                      {review.name} · {formatDate(review.date)}
                      {review.isSiteReview && (
                        <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-medium text-gray-600 dark:text-gray-300">
                          <Store size={10} />
                          Avis site
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StarRow value={review.rating} />
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      review.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {review.status === 'pending' ? 'En attente' : 'Avis certifié'}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
                « {review.comment} »
              </p>                  {/* Réponse du vendeur existante */}
                  {review.reply && review.reply.text && (
                <div className="mt-3 ml-2 sm:ml-6 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <Store size={13} />
                    Réponse du vendeur
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                    {review.reply.text}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {review.reply.date ? formatDate(review.reply.date) : ''}
                  </p>
                </div>
              )}                  {/* Zone de saisie de la réponse */}
                  {replyingId === review.id && (
                    <div className="mt-3 ml-2 sm:ml-6 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mb-2">
                        <Store size={13} />
                        {review.reply ? 'Modifier la réponse' : 'Nouvelle réponse du vendeur'}
                      </p>
                      {review.status === 'pending' && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                          💡 Cet avis est en attente de validation : la réponse sera
                          visible une fois l'avis validé.
                        </p>
                      )}
                  <textarea
                    rows={3}
                    autoFocus
                    value={replyText}
                    onChange={(e) => {
                      setReplyText(e.target.value);
                      if (replyError) setReplyError('');
                    }}
                    placeholder="Écrivez votre réponse au client..."
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-400 transition"
                  />
                  {replyError && (
                    <p role="alert" className="text-xs text-red-500 mt-1 font-medium">
                      {replyError}
                    </p>
                  )}
                  <div className="flex gap-2 mt-2 justify-end">
                    {review.reply && (
                      <button
                        onClick={() => removeReply(review)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition border border-red-200"
                      >
                        <Trash2 size={15} />
                        Supprimer la réponse
                      </button>
                    )}
                    <button
                      onClick={() => startReply(review)}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => saveReply(review)}
                      disabled={!replyText.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Reply size={15} />
                      {review.reply ? 'Mettre à jour' : 'Publier la réponse'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-3 justify-end">
                <button
                  onClick={() => startReply(review)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                    replyingId === review.id
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-white dark:bg-gray-800 text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <Reply size={16} />
                  {review.reply ? 'Modifier la réponse' : 'Répondre'}
                </button>
                {review.status === 'pending' && (
                  <button
                    onClick={() => handleApprove(review)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
                  >
                    <Check size={16} />
                    Valider
                  </button>
                )}
                <button
                  onClick={() => handleDelete(review)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition border border-red-200"
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reviews;

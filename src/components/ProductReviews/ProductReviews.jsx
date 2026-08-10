// src/components/ProductReviews/ProductReviews.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Star, CheckCircle2, Send, MessageSquarePlus, Store } from "lucide-react";
import {
  getAllReviews,
  addUserReview,
  computeStats,
} from "../../utils/reviews";

const AVATAR_COLORS = [
  "bg-pink-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-red-500",
  "bg-teal-500",
  "bg-indigo-500",
];

const avatarColor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const initials = (name) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    // date invalide
    return "";
  }
};

const StarRow = ({ value, size = 16 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        size={size}
        className={
          i <= Math.round(Number(value))
            ? "text-yellow-400 fill-yellow-400"
            : "text-gray-300 dark:text-gray-600"
        }
      />
    ))}
  </div>
);

// Sélecteur d'étoiles interactif pour le formulaire
const StarPicker = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  return (
    <div
      className="flex items-center gap-1 flex-wrap"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          className="p-0.5 rounded-full transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <Star
            size={28}
            className={`transition-colors ${
              i <= (hover || value)
                ? "text-yellow-400 fill-yellow-400 drop-shadow"
                : "text-gray-300 dark:text-gray-600"
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
        {value ? `${value} / 5` : "Cliquez pour noter"}
      </span>
    </div>
  );
};

// NB : doit être monté avec key={productId} (fait dans ProductDetail) pour réinitialiser
// l'état quand on navigue d'un produit à l'autre.
const ProductReviews = ({ productId }) => {
  const [reviews, setReviews] = useState(() => getAllReviews(productId));
  const stats = useMemo(() => computeStats(reviews), [reviews]);

  // Se resynchroniser quand l'admin valide/supprime un avis
  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail && e.detail !== productId) return;
      setReviews(getAllReviews(productId));
    };
    window.addEventListener("reviewsUpdated", handleUpdate);
    return () => window.removeEventListener("reviewsUpdated", handleUpdate);
  }, [productId]);

  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccess(false);
    if (!name.trim()) {
      setError("Veuillez entrer votre nom.");
      return;
    }
    if (!rating) {
      setError("Veuillez choisir une note (étoiles).");
      return;
    }
    if (!comment.trim() || comment.trim().length < 3) {
      setError("Veuillez écrire un court commentaire.");
      return;
    }
    addUserReview(productId, {
      name: name.trim(),
      rating,
      comment: comment.trim(),
      date: new Date().toISOString(),
      verified: false,
    });
    setReviews(getAllReviews(productId));
    setName("");
    setRating(0);
    setComment("");
    setError("");
    setSuccess(true);
    // Notifier la page produit (compteur d'avis dans la ligne de note)
    window.dispatchEvent(new CustomEvent("reviewsUpdated", { detail: productId }));
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <section id="avis" className="mt-16 scroll-mt-24">
      {/* En-tête */}
      <div className="flex items-end justify-between gap-3 flex-wrap mb-6">
        <div>
          <p className="text-sm font-bold text-primary uppercase tracking-widest">
            Vos avis comptent
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold mt-1">Avis clients</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full font-medium">
          <Star size={15} className="text-yellow-400 fill-yellow-400" />
          {stats.count} avis
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Résumé : note moyenne + répartition */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 h-fit lg:sticky lg:top-24">
          <div className="flex items-center gap-4">
            <span className="text-5xl font-bold text-gray-800 dark:text-white">
              {stats.average.toFixed(1)}
            </span>
            <div>
              <StarRow value={stats.average} size={18} />
              <p className="text-sm text-gray-400 mt-1">
                Basé sur {stats.count} avis
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const pct = stats.count
                ? Math.round((stats.distribution[star] / stats.count) * 100)
                : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-right font-medium text-gray-500">
                    {star}
                  </span>
                  <Star
                    size={12}
                    className="text-yellow-400 fill-yellow-400 shrink-0"
                  />
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-gray-400">
                    {stats.distribution[star]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Formulaire + liste */}
        <div className="lg:col-span-2 space-y-6">
          {/* Formulaire d'avis */}
          <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 sm:p-6">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <MessageSquarePlus size={18} className="text-primary" />
              Donner votre avis
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="review-name"
                  className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"
                >
                  Votre nom
                </label>
                <input
                  id="review-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex : Awa Diallo"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3.5 py-2.5 text-sm bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                />
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Votre note
                </span>
                <StarPicker value={rating} onChange={setRating} />
              </div>
              <div>
                <label
                  htmlFor="review-comment"
                  className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"
                >
                  Votre commentaire
                </label>
                <textarea
                  id="review-comment"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Partagez votre expérience avec ce produit..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3.5 py-2.5 text-sm bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition resize-y"
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-red-500 font-medium">
                  {error}
                </p>
              )}
              {success && (
                <p
                  role="status"
                  aria-live="polite"
                  className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} />
                  Merci ! Votre avis a été soumis. Il sera publié après validation
                  par notre équipe.
                </p>
              )}
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              >
                <Send size={16} />
                Publier mon avis
              </button>
            </form>
          </div>

          {/* Liste des avis */}
          {reviews.length === 0 ? (
            <p className="text-gray-500 text-center py-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              Aucun avis pour le moment. Soyez le premier à donner votre avis !
            </p>
          ) : (
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full ${avatarColor(r.name)} flex items-center justify-center text-white font-bold text-sm shrink-0`}
                      >
                        {initials(r.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-1.5 flex-wrap">
                          {r.name}
                          {(r.verified || String(r.id).startsWith("user_")) && (
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full">
                              <CheckCircle2 size={11} />
                              {String(r.id).startsWith("user_")
                                ? "Avis validé"
                                : "Acheteur vérifié"}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDate(r.date)}
                        </p>
                      </div>
                    </div>
                    <StarRow value={r.rating} />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
                    {r.comment}
                  </p>

                  {/* Réponse du vendeur */}
                  {r.reply && r.reply.text && (
                    <div className="mt-3 ml-2 sm:ml-6 pl-4 border-l-2 border-primary/40 bg-gray-50 dark:bg-gray-900/60 rounded-r-xl py-3 pr-3">
                      <p className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                        <Store size={13} />
                        Réponse du vendeur
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-200 mt-1.5 leading-relaxed">
                        {r.reply.text}
                      </p>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {r.reply.date ? formatDate(r.reply.date) : ""}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductReviews;

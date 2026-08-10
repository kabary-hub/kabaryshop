import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Banner from "../components/Banner/Banner";
import ImgNote from "../assets/background-pages/note.jpeg";
import {
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
} from "react-icons/fa";
import { CheckCircle2, Send, MessageSquarePlus, Store, Star as StarIcon } from "lucide-react";
import {
  getSiteFeedback,
  addSiteFeedback,
  getAllReviews,
  computeStats,
} from "../utils/reviews";
import { getAllProducts } from "../services/productService";
import { logActivity } from "../utils/history";

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
    return "";
  }
};

// Étoiles statiques (supporte les demi-étoiles pour la moyenne)
const StaticStars = ({ value, size = 15 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => {
      if (value >= i - 0.25) {
        return <FaStar key={i} size={size} className="text-yellow-400" />;
      }
      if (value >= i - 0.75) {
        return <FaStarHalfAlt key={i} size={size} className="text-yellow-400" />;
      }
      return <FaRegStar key={i} size={size} className="text-gray-300 dark:text-gray-600" />;
    })}
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
          <FaStar
            size={26}
            className={`transition-colors ${
              i <= (hover || value)
                ? "text-yellow-400 drop-shadow"
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

const Notes = () => {
  // ===== Avis généraux du site (validés) =====
  const [siteFeedback, setSiteFeedback] = useState(getSiteFeedback);

  // ===== Avis produits validés (tous produits confondus) =====
  const [productReviews, setProductReviews] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  // ===== Formulaire =====
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const successTimeoutRef = React.useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Nettoyer le minuteur du message de succès au démontage
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  // Charger les données (avis site + avis produits + produits mieux notés)
  const loadData = () => {
    setSiteFeedback(getSiteFeedback());

    const allProducts = getAllProducts();

    // Avis produits validés, avec le nom du produit associé
    const reviews = [];
    const productsWithStats = [];
    allProducts.forEach((product) => {
      const productReviewsList = getAllReviews(product.id);
      productReviewsList.forEach((r) => {
        reviews.push({ ...r, productTitle: product.title, productId: product.id });
      });
      const stats = computeStats(productReviewsList);
      if (stats.count > 0) {
        productsWithStats.push({ product, stats });
      }
    });
    reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    setProductReviews(reviews);

    // Top 6 produits par note moyenne (puis par nombre d'avis)
    productsWithStats.sort(
      (a, b) => b.stats.average - a.stats.average || b.stats.count - a.stats.count
    );
    setTopProducts(productsWithStats.slice(0, 6));
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("reviewsUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("productsUpdated", handleUpdate);
    return () => {
      window.removeEventListener("reviewsUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("productsUpdated", handleUpdate);
    };
  }, []);

  // ===== Statistiques globales =====
  const allVisibleReviews = useMemo(() => {
    const combined = [
      ...siteFeedback.map((r) => ({ ...r, type: "site" })),
      ...productReviews.map((r) => ({ ...r, type: "product" })),
    ];
    return combined.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [siteFeedback, productReviews]);

  const globalStats = useMemo(() => {
    const combinedRatings = [
      ...siteFeedback.map((r) => Number(r.rating)),
      ...productReviews.map((r) => Number(r.rating)),
    ];
    return computeStats(combinedRatings.map((rating) => ({ rating })));
  }, [siteFeedback, productReviews]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccess(false);
    setError("");

    if (!name.trim()) {
      setError("Veuillez entrer votre nom.");
      return;
    }
    if (!rating) {
      setError("Veuillez choisir une note (étoiles).");
      return;
    }
    if (!comment.trim() || comment.trim().length < 3) {
      setError("Veuillez écrire un court message.");
      return;
    }

    addSiteFeedback({
      name: name.trim(),
      rating,
      comment: comment.trim(),
      date: new Date().toISOString(),
    });

    // Journal central : avis général soumis sur la page Notes
    logActivity({
      type: "review",
      action: "soumission d'avis",
      subject: `Avis de ${name.trim()}`,
      details: `Note : ${rating}/5 · En attente de validation admin`,
      actor: { name: name.trim(), role: "Client" },
    });

    // Recharger (l'avis reste masqué tant qu'il n'est pas validé par l'admin)
    loadData();
    setName("");
    setRating(0);
    setComment("");
    setSuccess(true);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => setSuccess(false), 4000);
  };

  return (
    <div className="pt-6 text-secondary">
      <Banner
        title="Vos Avis ICI"
        subtitle="Votre satisfaction est notre priorité"
        bgImage={ImgNote}
      />

      <div className="container mx-auto px-4 py-10">
        {/* En-tête d'accueil */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold mb-6">
            Laissez-nous un message et on répondra dans le plus bref délai{" "}
            <br /> Merci d'avance
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Vous avez aimé votre expérience ? Prenez un instant pour nous laisser
            une note et un commentaire. Votre retour nous motive à faire toujours
            mieux.
          </p>
        </div>

        {/* ===== Résumé de la note globale ===== */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-10 max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center">
              <span className="text-6xl font-bold text-gray-800 dark:text-white">
                {globalStats.average.toFixed(1)}
              </span>
              <div className="flex justify-center mt-2">
                <StaticStars value={globalStats.average} size={20} />
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Basé sur {globalStats.count} avis
              </p>
            </div>
            <div className="flex-1 w-full space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const pct = globalStats.count
                  ? Math.round((globalStats.distribution[star] / globalStats.count) * 100)
                  : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-right font-medium text-gray-500">{star}</span>
                    <FaStar size={12} className="text-yellow-400 shrink-0" />
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-gray-400">
                      {globalStats.distribution[star]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ===== Colonne gauche : formulaire + produits mieux notés ===== */}
          <div className="space-y-6">
            {/* Formulaire d'avis */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 sm:p-6">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <MessageSquarePlus size={18} className="text-primary" />
                Laissez votre note
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="notes-name"
                    className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"
                  >
                    Votre nom
                  </label>
                  <input
                    id="notes-name"
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
                    htmlFor="notes-comment"
                    className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5"
                  >
                    Votre message
                  </label>
                  <textarea
                    id="notes-comment"
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Partagez votre expérience avec notre boutique..."
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
                    Merci ! Votre avis a été soumis. Il sera publié après
                    validation par notre équipe.
                  </p>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg w-full"
                >
                  <Send size={16} />
                  Publier mon avis
                </button>
              </form>
            </div>

            {/* Produits les mieux notés */}
            {topProducts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <StarIcon size={18} className="text-yellow-400 fill-yellow-400" />
                  Produits les mieux notés
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {topProducts.map(({ product, stats }) => (
                    <Link
                      key={product.id}
                      to={`/produit/${product.id}`}
                      className="group bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <img
                          src={product.img}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/300?text=Image";
                          }}
                        />
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-medium truncate">{product.title}</p>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-1">
                            <FaStar size={11} className="text-yellow-400" />
                            <span className="text-xs font-bold">{stats.average.toFixed(1)}</span>
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {stats.count} avis
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ===== Colonne droite : tous les avis ===== */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <StarIcon size={18} className="text-yellow-400 fill-yellow-400" />
                Avis de nos clients
              </h3>
              <span className="inline-flex items-center gap-1.5 text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full font-medium">
                <FaStar size={13} className="text-yellow-400" />
                {globalStats.count} avis
              </span>
            </div>

            {allVisibleReviews.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <p className="text-5xl mb-4">💬</p>
                <p className="text-gray-500">
                  Aucun avis pour le moment. Soyez le premier à nous laisser
                  votre note !
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {allVisibleReviews.map((r) => (
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
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full">
                              <CheckCircle2 size={11} />
                              Avis validé
                            </span>
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(r.date)}
                          </p>
                        </div>
                      </div>
                      <StaticStars value={r.rating} />
                    </div>

                    {/* Produit concerné (avis produit) */}
                    {r.productTitle && (
                      <Link
                        to={`/produit/${r.productId}`}
                        className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-primary hover:underline"
                      >
                        <Store size={13} />
                        À propos de : {r.productTitle}
                      </Link>
                    )}

                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
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
      </div>
    </div>
  );
};

export default Notes;

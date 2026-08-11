// src/Pages/ProductDetail.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Shield,
  RotateCcw,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Minus,
  Plus,
  ArrowLeft,
  X,
  ZoomIn,
} from 'lucide-react';
import { getAllProducts } from '../services/productService';
import { useSettings } from '../context/SettingsContext';
import { convertPrice, formatPrice } from '../utils/currencyUtils';
import { useCart } from '../context/CartContext';
import ShareButton from '../components/ShareButton/ShareButton';
import ProductReviews from '../components/ProductReviews/ProductReviews';
import { getReviewStats } from '../utils/reviews';

const getCategoryStyle = (category) => {
  const styles = {
    femmes: { icon: "👩", color: "bg-pink-500", text: "Mode Femmes" },
    hommes: { icon: "👨", color: "bg-blue-500", text: "Mode Hommes" },
    enfants: { icon: "🧒", color: "bg-green-500", text: "Mode Enfants" },
    electroniques: { icon: "📱", color: "bg-purple-500", text: "Électroniques" },
    meubles: { icon: "🛋️", color: "bg-amber-500", text: "Meubles" },
    tendances: { icon: "🔥", color: "bg-red-500", text: "Tendances" },
    ventes: { icon: "💥", color: "bg-orange-500", text: "Promotions" },
  };
  return styles[category] || { icon: "📦", color: "bg-gray-500", text: category };
};

// Galerie d'images avec image principale, flèches, compteur et miniatures
const ProductGallery = ({ images, extraImages = [], title, badge }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const closeButtonRef = useRef(null);
  const safeImages = [...(images || []), ...(extraImages || [])].filter(Boolean);
  const current = safeImages[Math.min(activeIndex, safeImages.length - 1)] || "";

  const handleImageError = (e) => {
    e.target.src = "https://via.placeholder.com/500x500?text=Image+non+disponible";
  };

  const goPrev = () => setActiveIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
  const goNext = () => setActiveIndex((i) => (i + 1) % safeImages.length);

  // Blocage du scroll de la page pendant que la lightbox est ouverte
  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen]);

  // Déplacer le focus sur le bouton fermer à l'ouverture (accessibilité)
  useEffect(() => {
    if (lightboxOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [lightboxOpen]);

  // Raccourcis clavier dans la lightbox : Échap ferme, ← / → naviguent
  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const handleLightboxKey = (e) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % safeImages.length);
      }
    };
    document.addEventListener("keydown", handleLightboxKey);
    return () => document.removeEventListener("keydown", handleLightboxKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- l'écouteur est rebranché à chaque ouverture, les mises à jour sont fonctionnelles
  }, [lightboxOpen]);

  const handleKeyDown = (e) => {
    // Quand la lightbox est ouverte, son écouteur global gère les flèches :
    // ce handler ne doit plus répondre (sinon double navigation)
    if (lightboxOpen || safeImages.length <= 1) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
    }
  };

  if (!current) return null;

  return (
    <>
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="outline-none focus:ring-2 focus:ring-primary/40 rounded-2xl"
    >
      {/* Image principale */}
      <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 md:p-10 flex items-center justify-center min-h-[300px] lg:min-h-[520px] overflow-hidden">
        <div className="absolute top-4 left-4 z-10">{badge}</div>
        {/* Image principale cliquable -> lightbox plein écran */}
        <div
          onClick={() => setLightboxOpen(true)}
          role="button"
          tabIndex={0}
          aria-haspopup="dialog"
          aria-label="Agrandir l'image en plein écran"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setLightboxOpen(true);
            }
          }}
          className="group relative w-full flex items-center justify-center cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg"
        >
          <img
            key={current}
            src={current}
            alt={title}
            decoding="async"
            // Image principale de la page : priorité de chargement élevée
            // (c'est l'élément le plus important du premier écran / LCP).
            fetchPriority="high"
            className="w-full max-h-[320px] lg:max-h-[440px] object-contain rounded-lg drop-shadow-2xl transition-transform duration-300 hover:scale-105 animate-fadeIn"
            onError={handleImageError}
          />
          <span className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn size={14} />
            Agrandir
          </span>
        </div>
        {safeImages.length > 1 && (
          <>
            <button
              onClick={goPrev}
              aria-label="Photo précédente"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 dark:bg-gray-900/80 text-gray-700 dark:text-gray-200 shadow-md hover:bg-primary hover:text-white transition"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={goNext}
              aria-label="Photo suivante"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 dark:bg-gray-900/80 text-gray-700 dark:text-gray-200 shadow-md hover:bg-primary hover:text-white transition"
            >
              <ChevronRight size={20} />
            </button>
            <span className="absolute bottom-3 right-4 z-10 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs font-medium">
              {activeIndex + 1} / {safeImages.length}
            </span>
          </>
        )}
      </div>

      {/* Miniatures */}
      {safeImages.length > 1 && (
        <>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {safeImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                aria-label={`Voir la photo ${i + 1}`}
                className={`overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                  i === activeIndex
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img
                  src={img}
                  alt={`${title} - photo ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-20 sm:h-24 object-cover"
                  onError={handleImageError}
                />
              </button>
            ))}
          </div>
          {extraImages.length > 0 && (
            <p className="text-center text-xs text-gray-400 mt-2">
              🖼 Les autres photos montrent d'autres modèles de la catégorie
            </p>
          )}
        </>
      )}
    </div>

    {/* ===== Lightbox plein écran ===== */}
    {lightboxOpen && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Galerie plein écran"
        onClick={() => setLightboxOpen(false)}
        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-fadeIn"
      >
        {/* Bouton fermer */}
        <button
          ref={closeButtonRef}
          onClick={() => setLightboxOpen(false)}
          aria-label="Fermer la galerie"
          className="absolute top-4 right-4 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-primary hover:scale-105 transition shadow-lg"
        >
          <X size={24} />
        </button>

        {/* Compteur */}
        {safeImages.length > 1 && (
          <span className="absolute top-6 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm font-medium">
            {activeIndex + 1} / {safeImages.length}
          </span>
        )}

        {/* Image plein écran */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-[92vw] max-h-[85vh]"
        >
          <img
            key={current}
            src={current}
            alt={`${title} - vue plein écran`}
            className="max-w-[92vw] max-h-[85vh] object-contain rounded-lg drop-shadow-2xl animate-fadeIn"
            onError={handleImageError}
          />
        </div>

        {/* Navigation précédent / suivant */}
        {safeImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Photo précédente"
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-primary hover:scale-105 transition shadow-lg"
            >
              <ChevronLeft size={26} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Photo suivante"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-primary hover:scale-105 transition shadow-lg"
            >
              <ChevronRight size={26} />
            </button>
          </>
        )}

        {/* Indication clavier (desktop) */}
        {safeImages.length > 1 && (
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs hidden sm:block">
            ← → pour naviguer · Échap pour fermer
          </p>
        )}
      </div>
    )}
    </>
  );
};

const ProductDetail = ({ handleOrder }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { addToCart } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [notification, setNotification] = useState(null);

  // Dériver le produit et les similaires depuis l'URL (pas de state à synchroniser)
  const { product, related, notFound } = useMemo(() => {
    const all = getAllProducts();
    const found = all.find((p) => String(p.id) === String(id));
    if (!found) {
      return { product: null, related: [], notFound: true };
    }
    const category = (found.category || '').toLowerCase();
    const sameCategory = all.filter(
      (p) =>
        (p.category || '').toLowerCase() === category &&
        String(p.id) !== String(found.id)
    );
    return { product: found, related: sameCategory.slice(0, 8), notFound: false };
  }, [id]);

  // Compteur d'avis synchronisé avec les ajouts (événement émis par ProductReviews)
  const [reviewsVersion, setReviewsVersion] = useState(0);
  useEffect(() => {
    const handleReviewsUpdate = (e) => {
      const changedProduct = e.detail;
      if (changedProduct && changedProduct !== product?.id) return;
      setReviewsVersion((v) => v + 1);
    };
    window.addEventListener('reviewsUpdated', handleReviewsUpdate);
    return () => window.removeEventListener('reviewsUpdated', handleReviewsUpdate);
  }, [product]);
  const reviewStats = useMemo(
    () => (product ? getReviewStats(product.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getReviewStats lit localStorage (source externe) : reviewsVersion force le recalcul après un ajout
    [product, reviewsVersion],
  );

  // Galerie : photo du produit d'abord, puis autres modèles de la même catégorie (avec mention)
  const { ownImages, extraImages } = useMemo(() => {
    const own = (product?.images && product.images.length ? product.images : [product?.img]).filter(Boolean);
    const extras = related.map((p) => p.img).filter((img) => img && img !== product?.img);
    const unique = [...new Set([...own, ...extras])].slice(0, 4);
    const ownSet = new Set(own);
    return {
      ownImages: unique.filter((img) => ownSet.has(img)),
      extraImages: unique.filter((img) => !ownSet.has(img)),
    };
  }, [product, related]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 2500);
  };

  const getFormattedPrice = (p) => {
    if (!p || !p.priceInGNF || p.priceInGNF === 0) {
      return "Prix sur demande";
    }
    const convertedPrice = convertPrice(p.priceInGNF, settings.currency);
    return formatPrice(convertedPrice, settings.currency);
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, quantity);
    showNotification(`✅ ${product.title} ajouté au panier !`);
  };

  const handleOrderClick = () => {
    if (!product) return;
    if (handleOrder) {
      handleOrder(product);
    } else {
      handleAddToCart();
    }
  };

  // ============ État introuvable ============
  if (notFound) {
    return (
      <div className="container mx-auto px-4 py-20 text-center min-h-[60vh]">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-3xl font-bold mb-4">Produit introuvable</h1>
        <p className="text-gray-500 mb-8">
          Le produit que vous recherchez n'existe pas ou n'est plus disponible.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary hover:bg-secondary text-white font-semibold px-6 py-3 rounded-lg transition"
        >
          <ArrowLeft size={18} />
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const categoryStyle = getCategoryStyle(product.category);

  return (
    <div className="min-h-screen">
      {/* Fil d'Ariane */}
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
            <Link to="/" className="hover:text-primary transition">
              Accueil
            </Link>
            <ChevronRight size={14} />
            <Link
              to={`/${product.category}`}
              className="hover:text-primary transition capitalize"
            >
              {categoryStyle.text}
            </Link>
            <ChevronRight size={14} />
            <span className="text-gray-800 dark:text-gray-200 font-medium truncate max-w-[200px] sm:max-w-xs">
              {product.title}
            </span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Bouton retour */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition mb-6"
        >
          <ArrowLeft size={16} />
          Retour
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* ===== Galerie d'images ===== */}
          <ProductGallery
            key={product.id}
            images={ownImages}
            extraImages={extraImages}
            title={product.title}
            badge={
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${categoryStyle.color} text-white text-xs font-semibold rounded-full shadow-lg`}>
                <span className="text-sm">{categoryStyle.icon}</span>
                {categoryStyle.text}
              </span>
            }
          />

          {/* ===== Informations ===== */}
          <div className="flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white leading-tight">
                {product.title}
              </h1>

              {/* Bouton partager */}
              <ShareButton
                product={product}
                className="shrink-0"
                buttonClassName="w-10 h-10 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-primary hover:text-white hover:border-primary"
              />
            </div>

            {/* Couleur */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-sm text-gray-500 dark:text-gray-400">Couleur :</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {product.color || "Multiples couleurs"}
              </span>
              {product.color && product.color !== "Multiples couleurs" && (
                <span
                  className="w-5 h-5 rounded-full border border-gray-300 shadow-sm"
                  style={{ backgroundColor: product.color.toLowerCase() }}
                ></span>
              )}
            </div>

            {/* Prix */}
            <div className="mb-4">
              <span className="text-3xl md:text-4xl font-bold text-primary">
                {getFormattedPrice(product)}
              </span>
              {product.priceInGNF > 0 && (
                <span className="text-sm text-gray-400 ml-2">TTC</span>
              )}
            </div>

            {/* Note (moyenne réelle des avis clients) */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    className={`${
                      i < Math.round(reviewStats.average)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                ))}
              </div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {reviewStats.average.toFixed(1)}
              </span>
              <span className="text-gray-400 text-sm">/ 5</span>
              <a
                href="#avis"
                className="text-gray-400 text-sm ml-1 hover:text-primary transition"
              >
                ({reviewStats.count} avis)
              </a>
            </div>

            {/* Description */}
            {(product.description || product.desc) && (
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                {product.description || product.desc}
              </p>
            )}

            {/* Caractéristiques */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-3 text-lg">
                Caractéristiques
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle size={16} className="text-green-500 shrink-0" />
                  <span>Haute qualité</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Truck size={16} className="text-blue-500 shrink-0" />
                  <span>Livraison rapide</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Shield size={16} className="text-green-500 shrink-0" />
                  <span>Paiement sécurisé</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <RotateCcw size={16} className="text-orange-500 shrink-0" />
                  <span>Retour si non satisfait</span>
                </div>
              </div>
            </div>

            {/* Stock */}
            <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                  En stock - Livraison sous 24h/48h dans tout Conakry
                </span>
              </div>
            </div>

            {/* Sélecteur de quantité */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Quantité :
              </span>
              <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  aria-label="Diminuer la quantité"
                >
                  <Minus size={16} />
                </button>
                <span className="w-12 h-10 flex items-center justify-center font-semibold border-x border-gray-300 dark:border-gray-600">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  aria-label="Augmenter la quantité"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-2 border-2 border-primary text-primary hover:bg-primary hover:text-white py-3.5 px-6 rounded-xl font-semibold transition-all duration-300"
              >
                <ShoppingCart size={20} />
                Ajouter au panier
              </button>
              <button
                onClick={handleOrderClick}
                className="flex-1 group relative flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 text-white py-3.5 px-6 rounded-xl font-semibold overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <span className="absolute inset-0 w-0 bg-white/20 transition-all duration-300 ease-out group-hover:w-full"></span>
                <ShoppingBag size={20} className="relative z-10" />
                <span className="relative z-10">Commander maintenant</span>
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              Livraison gratuite à partir de 300 000 GNF • Paiement à la livraison
            </p>
          </div>
        </div>

        {/* ===== Avis clients ===== */}
        <ProductReviews key={product.id} productId={product.id} />

        {/* ===== Produits similaires ===== */}
        {related.length > 0 && (
          <section className="mt-16">
            <div className="flex items-end justify-between mb-6 gap-3 flex-wrap">
              <div>
                <p className="text-sm font-bold text-primary uppercase tracking-widest">
                  Complétez votre style
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold mt-1">Produits similaires</h2>
              </div>
              <Link
                to={`/${product.category}`}
                className="text-primary hover:underline text-sm font-medium"
              >
                Voir toute la catégorie →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {related.map((item) => (
                <Link
                  key={item.id}
                  to={`/produit/${item.id}`}
                  className="group bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="overflow-hidden aspect-square bg-gray-100 dark:bg-gray-700">
                    <img
                      src={item.img}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/300x300?text=Image";
                      }}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="font-semibold text-sm sm:text-base truncate">{item.title}</h3>
                    <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                      <span className="text-sm sm:text-base font-bold text-secondary">
                        {getFormattedPrice(item)}
                      </span>
                      <div className="flex items-center gap-1">
                        {(() => {
                          const stats = getReviewStats(item.id);
                          return stats.count > 0 ? (
                            <>
                              <Star size={13} className="text-yellow-400 fill-yellow-400" />
                              <span className="text-xs text-gray-400">
                                {stats.average.toFixed(1)} ({stats.count})
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">Aucun avis</span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Notification d'ajout au panier */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-[99999] bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fadeIn">
          {notification}
        </div>
      )}
    </div>
  );
};

export default ProductDetail;

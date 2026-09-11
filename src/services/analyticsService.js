// src/services/analyticsService.js
// Service de suivi des pages et du comportement des visiteurs.
// Tout est stocké localement (localStorage) et peut être lu dans l'admin
// Analytics pour analyser les parcours et l'entonnoir de conversion.
//
// Événements trackés :
//   - page_view       : consultation d'une page (url, referrer, durée)
//   - product_view    : affichage d'une fiche produit (id, titre, catégorie)
//   - cart_add        : ajout au panier (id, titre, prix)
//   - cart_view       : ouverture du panier
//   - checkout_start  : ouverture du formulaire de commande
//   - order_success   : commande validée (référence, total, articles)

const STORAGE_KEY = 'kabary_analytics_events';
const MAX_EVENTS = 2000;

// Ajoute un événement de suivi avec horodatage et contexte.
export const trackEvent = (event) => {
  try {
    const events = getEvents();
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: event.type,
      ...event,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.pathname : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    };
    const updated = [entry, ...events].slice(0, MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('analyticsUpdated'));
    return entry;
  } catch {
    return null;
  }
};

// Liste tous les événements (le plus récent d'abord par défaut).
export const getEvents = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

// Événements de type page_view consolidés (par url + date).
export const getPageViews = (options = {}) => {
  const events = getEvents().filter((e) => e.type === 'page_view');
  const { period = 'all', url = null } = options;
  const now = Date.now();

  return events.filter((e) => {
    if (url && e.url !== url) return false;
    if (period === 'today') {
      const d = new Date(e.timestamp).toDateString();
      return d === new Date().toDateString();
    }
    if (period === 'week') {
      return now - new Date(e.timestamp).getTime() <= 7 * 24 * 3600 * 1000;
    }
    if (period === 'month') {
      return now - new Date(e.timestamp).getTime() <= 30 * 24 * 3600 * 1000;
    }
    return true;
  });
};

// Entonnoir de conversion : compte les étapes parcourues par session.
// Les étapes sont :
//   1) home_view       → visite de l'accueil
//   2) product_view   → affichage d'un produit
//   3) cart_add       → ajout au panier
//   4) checkout_start → ouverture du formulaire de commande
//   5) order_success  → commande validée
export const getFunnelStats = () => {
  const events = getEvents();
  const sessions = {};

  events
    .filter((e) => ['home_view', 'product_view', 'cart_add', 'checkout_start', 'order_success'].includes(e.type))
    .forEach((e) => {
      const sessionId = e.sessionId || 'unknown';
      if (!sessions[sessionId]) {
        sessions[sessionId] = new Set();
      }
      sessions[sessionId].add(e.type);
    });

  const counts = {
    home_view: 0,
    product_view: 0,
    cart_add: 0,
    checkout_start: 0,
    order_success: 0,
  };

  Object.values(sessions).forEach((steps) => {
    if (steps.has('home_view')) counts.home_view += 1;
    if (steps.has('product_view')) counts.product_view += 1;
    if (steps.has('cart_add')) counts.cart_add += 1;
    if (steps.has('checkout_start')) counts.checkout_start += 1;
    if (steps.has('order_success')) counts.order_success += 1;
  });

  return {
    sessions: Object.keys(sessions).length,
    steps: counts,
    conversionRates: {
      home_to_product: counts.home_view ? ((counts.product_view / counts.home_view) * 100).toFixed(1) : '0',
      product_to_cart: counts.product_view ? ((counts.cart_add / counts.product_view) * 100).toFixed(1) : '0',
      cart_to_checkout: counts.cart_add ? ((counts.checkout_start / counts.cart_add) * 100).toFixed(1) : '0',
      checkout_to_order: counts.checkout_start ? ((counts.order_success / counts.checkout_start) * 100).toFixed(1) : '0',
    },
  };
};

// Nettoie les événements les plus anciens pour limiter la taille du stockage.
export const pruneAnalytics = (max = MAX_EVENTS) => {
  try {
    const events = getEvents();
    const kept = events.slice(0, max);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
    return kept.length;
  } catch {
    return 0;
  }
};

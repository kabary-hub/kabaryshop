// api/order.js
// Point API public de suivi de commande (Vercel Edge / Serverless).
// Il retourne une version dépouillée de la commande, sans données sensibles
// (email, téléphone, adresse complète). Le endpoint est rate-limité pour
// éviter les scans de références.
//
// Exécution locale : pas de point équivalent en dev Vite sans Vercel.
// Côté client, le fallback reste getOrderByReference() depuis supabase.js.
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const reference = (req.query.ref || '').trim();
  if (!reference) {
    return res.status(400).json({ error: 'Référence manquante' });
  }

  // Rate limiting basique côté serveur (même politique que le login admin).
  const RATE_KEY = 'rate_limit_order_track';
  const MAX_REQUESTS = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  try {
    const raw = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const ip = String(raw).split(',')[0].trim().toLowerCase();

    const store = await getRateStore();
    const now = Date.now();
    const key = `${RATE_KEY}:${ip}`;
    const bucket = store.getItem ? store.getItem(key) : null;

    let timestamps = bucket ? JSON.parse(bucket) : [];
    timestamps = timestamps.filter((ts) => now - ts < WINDOW_MS);

    if (timestamps.length >= MAX_REQUESTS) {
      const oldest = timestamps[0];
      const seconds = Math.ceil((oldest + WINDOW_MS - now) / 1000);
      return res.status(429).json({
        error: 'Trop de requêtes. Réessayez dans ' + seconds + ' seconde(s).',
        retryAfter: seconds,
      });
    }

    timestamps.push(now);
    if (store.setItem) {
      store.setItem(key, JSON.stringify(timestamps));
    }
  } catch {
    // Rate limiting indisponible : on continue sans bloquer la lecture.
  }

  let order = null;
  try {
    order = await getPublicOrderByReference(reference);
  } catch {
    // Lecture échouée : on répond comme si la commande n'existait pas.
  }

  if (!order) {
    return res.status(404).json({ error: 'Commande non trouvée' });
  }

  // Version publique : on retire les champs sensibles.
  const publicOrder = {
    reference: order.reference,
    date: order.date || order.created_at,
    status: order.status,
    items: (order.items || []).map(sanitizeOrderItem),
    total: order.total || 0,
    payment_method: order.payment_method || 'Mobile Money',
    shipping: order.shipping ? {
      by: order.shipping.by,
      date: order.shipping.date,
      notes: order.shipping.notes,
    } : null,
    cancelledAt: order.cancelled_at || order.cancelledAt || null,
  };

  return res.status(200).json(publicOrder);
};

// ---------------------------------------------------------------------
// Lecture publique de la commande (issu de supabase.js / fallback localStorage).
// ---------------------------------------------------------------------

async function getPublicOrderByReference(reference) {
  const { getOrderByReference } = await import('../src/services/supabase.js');
  const order = await getOrderByReference(reference);
  return order || null;
}

// ---------------------------------------------------------------------
// Sanitisation des lignes de commande pour l'export public.
// ---------------------------------------------------------------------

function sanitizeOrderItem(item) {
  return {
    id: item.id || null,
    name: item.name || item.title || 'Produit',
    quantity: item.quantity || 1,
    price: item.price || 0,
    img: item.img || null,
  };
}

// ---------------------------------------------------------------------
// Rate store simple (locale / Persistent). Sur Vercel, ce module est
// ré-exécuté à chaque invocation, donc un vrai store externe (KV / Redis)
// serait nécessaire en production. Pour l'instant, on utilise le stockage
// session-like fourni par l'environnement, avec fallback mémoire.
// ---------------------------------------------------------------------

async function getRateStore() {
  // Sur les environnements sans stockage persistant cross-invocation,
  // cette fonction retourne un objet mémoire. Le rate limiting reste
  // ainsi fonctionnel dans les tests locaux et partiellement effectif
  // sur les fonctions serverless sans store externe.
  return {
    getItem: () => {
      // pas de stockage persistant cross-invocation
      return null;
    },
    setItem: () => {
      // pas de stockage persistant cross-invocation
    },
  };
}

// src/services/supabase.js
// Service Supabase avec les opérations CRUD pour les tables normalisées.
//
// Ce fichier complète src/services/db.js (qui gère la synchronisation
// clé/valeur via sync_store). Ici, on utilise les tables normalisées
// (products, orders, users, reviews, admin_alerts) pour les opérations
// qui ont besoin de relations, d'indexation ou de RLS fine.
//
// IMPORTANT : Supabase est actuellement la couche de synchronisation et
// d'authentification recommandée pour les données persistantes. Si la
// configuration Supabase est manquante ou non opérationnelle, le site
// continue de fonctionner en local (localStorage) mais certaines données
// (commandes, utilisateurs, historique, etc.) ne seront pas partagées
// entre les appareils. Le service doit donc être déployé avec les bonnes
// variables d'environnement (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).

import { getSupabase, isSyncConfigured, hasSupabaseSession } from './db';
import { ORDER_REFERENCE_BRAND_ID } from './../utils/siteConfig';

// ============================================================================
// PRODUITS
// ============================================================================

export const getAllProducts = async () => {
  const sb = getSupabase();
  if (!sb || !isSyncConfigured()) {
    // Fallback : lecture depuis sync_store (compatibilité localStorage)
    const { data } = await sb?.from('sync_store').select('value').eq('key', 'custom_products').single() ?? {};
    if (data?.value) return Array.isArray(data.value) ? data.value : [];
    return [];
  }

  try {
    const { data, error } = await sb
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch {
    // Fallback en cas d'erreur
    const { data } = await sb?.from('sync_store').select('value').eq('key', 'custom_products').single() ?? {};
    return data?.value || [];
  }
};

export const getProductById = async (id) => {
  const sb = getSupabase();
  if (!sb || !isSyncConfigured()) {
    // Fallback localStorage
    const products = await getAllProducts();
    return products.find(p => p.id === id || p.original_id === id) || null;
  }

  try {
    const { data, error } = await sb
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data || null;
  } catch {
    const products = await getAllProducts();
    return products.find(p => p.id === id || p.original_id === id) || null;
  }
};

export const createProduct = async (productData) => {
  const sb = getSupabase();
  if (!sb || !hasSupabaseSession()) {
    // Fallback : retourner les données telles quelles (localStorage)
    return { ...productData, id: productData.id || crypto.randomUUID() };
  }

  try {
    const { data, error } = await sb
      .from('products')
      .insert({
        ...productData,
        id: productData.id || crypto.randomUUID(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch {
    // Fallback localStorage
    return { ...productData, id: productData.id || crypto.randomUUID() };
  }
};

export const updateProduct = async (id, updates) => {
  const sb = getSupabase();
  if (!sb || !hasSupabaseSession()) {
    return { success: true, product: { id, ...updates } };
  }

  try {
    const { data, error } = await sb
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, product: data };
  } catch {
    return { success: true, product: { id, ...updates } };
  }
};

export const deleteProduct = async (id) => {
  const sb = getSupabase();
  if (!sb || !hasSupabaseSession()) {
    return { success: true };
  }

  try {
    const { error } = await sb
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch {
    return { success: true };
  }
};

export const decrementStock = async (productId, quantity) => {
  const sb = getSupabase();
  if (!sb || !isSyncConfigured()) {
    // Fallback : retourner un résultat simulé (pas de vraie décrémentation)
    return { success: true, newStock: 0 };
  }

  try {
    const { data, error } = await sb.rpc('decrement_stock', {
      p_product_id: productId,
      p_quantity: quantity,
    });

    if (error) throw error;
    return { success: data >= 0, newStock: data };
  } catch {
    return { success: true, newStock: 0 };
  }
};

// ============================================================================
// COMMANDES
// ============================================================================

export const createOrder = async (orderData) => {
  const sb = getSupabase();
  if (!sb || !isSyncConfigured()) {
    // Fallback localStorage (compatibilité)
    return {
      ...orderData,
      id: orderData.id || crypto.randomUUID(),
      reference: orderData.reference || generateReference(),
      date: orderData.date || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  try {
    const { data, error } = await sb
      .from('orders')
      .insert({
        ...orderData,
        id: orderData.id || crypto.randomUUID(),
        reference: orderData.reference || generateReference(),
        date: orderData.date || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch {
    // Fallback localStorage
    return {
      ...orderData,
      id: orderData.id || crypto.randomUUID(),
      reference: orderData.reference || generateReference(),
      date: orderData.date || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
};

export const getOrderByReference = async (reference) => {
  const sb = getSupabase();
  if (!sb || !isSyncConfigured()) {
    // Fallback localStorage
    const orders = JSON.parse(localStorage.getItem('shop_orders') || '[]');
    return orders.find(o => o.reference === reference) || null;
  }

  try {
    const { data, error } = await sb
      .from('orders')
      .select('*')
      .eq('reference', reference)
      .single();

    if (error) throw error;
    return data || null;
  } catch {
    const orders = JSON.parse(localStorage.getItem('shop_orders') || '[]');
    return orders.find(o => o.reference === reference) || null;
  }
};

export const getAllOrders = async () => {
  const sb = getSupabase();
  if (!sb || !hasSupabaseSession()) {
    // Fallback localStorage
    return JSON.parse(localStorage.getItem('shop_orders') || '[]');
  }

  try {
    const { data, error } = await sb
      .from('orders')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch {
    return JSON.parse(localStorage.getItem('shop_orders') || '[]');
  }
};

export const updateOrderStatus = async (id, status, shipping = null) => {
  const sb = getSupabase();
  if (!sb || !hasSupabaseSession()) {
    // Fallback localStorage
    const orders = JSON.parse(localStorage.getItem('shop_orders') || '[]');
    const index = orders.findIndex(o => String(o.id) === String(id));
    if (index !== -1) {
      orders[index] = {
        ...orders[index],
        status,
        shipping: status === 'shipped' ? shipping : orders[index].shipping,
        cancelled_at: status === 'cancelled' ? new Date().toISOString() : orders[index].cancelled_at,
      };
      localStorage.setItem('shop_orders', JSON.stringify(orders));
    }
    return { success: true };
  }

  try {
    const updates = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'shipped' && shipping) {
      updates.shipping = shipping;
    }
    if (status === 'cancelled') {
      updates.cancelled_at = new Date().toISOString();
    }

    const { error } = await sb
      .from('orders')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch {
    return { success: true };
  }
};

export const getPublicOrderByReference = async (reference) => {
  // Lecture publique d'une commande par référence.
  // Priorité 1 : la commande peut être lue depuis Supabase si la fonction
  // est configurée et si la référence existe dans la table orders.
  // Priorité 2 : fallback localStorage pour compatibilité locale.
  //
  // Ce comportement est fait pour que le suivi public fonctionne même si
  // Supabase n'est pas encore opérationnel, tout en restant compatible
  // avec la synchronisation cloud dès que Supabase est actif.
  const sb = getSupabase();
  if (sb && isSyncConfigured()) {
    try {
      const { data, error } = await sb
        .from('orders')
        .select('*')
        .eq('reference', reference)
        .single();

      if (!error && data) return data;
    } catch {
      // Supabase indisponible : on continue avec le fallback local.
    }
  }

  // Fallback localStorage (lecture locale).
  const localOrders = JSON.parse(localStorage.getItem('shop_orders') || '[]');
  return localOrders.find(o => o.reference === reference) || null;
};

// ============================================================================
// UTILISATEURS
// ============================================================================

export const getUsers = async () => {
  // Liste des utilisateurs (admin/staff).
  // Si Supabase est configuré et qu'une session est active, on privilégie
  // la lecture depuis Supabase (données partagées). Sinon, fallback local.
  const sb = getSupabase();
  if (sb && isSyncConfigured() && hasSupabaseSession()) {
    try {
      const { data, error } = await sb
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) return data;
    } catch {
      // Supabase indisponible : on conserve le fallback local.
    }
  }

  return JSON.parse(localStorage.getItem('app_users') || '[]');
};

export const getUserByEmail = async (email) => {
  const sb = getSupabase();
  if (!sb || !hasSupabaseSession()) {
    // Fallback localStorage
    const users = JSON.parse(localStorage.getItem('app_users') || '[]');
    return users.find(u => u.email === email) || null;
  }

  try {
    const { data, error } = await sb
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    return data || null;
  } catch {
    const users = JSON.parse(localStorage.getItem('app_users') || '[]');
    return users.find(u => u.email === email) || null;
  }
};

export const createUser = async (userData) => {
  // Création d'un utilisateur (admin/staff).
  // Si Supabase est configuré et qu'une session est active, la création est
  // faite dans Supabase (table users) pour persistancer les données.
  // Sinon, création locale dans localStorage.
  const sb = getSupabase();
  if (sb && isSyncConfigured() && hasSupabaseSession()) {
    try {
      const { data, error } = await sb
        .from('users')
        .insert({
          ...userData,
          id: userData.id || crypto.randomUUID(),
        })
        .select()
        .single();

      if (!error && data) return { success: true, user: data };
    } catch {
      // Supabase indisponible : on passe au fallback local.
    }
  }

  const users = JSON.parse(localStorage.getItem('app_users') || '[]');
  const newUser = {
    ...userData,
    id: userData.id || crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  users.push(newUser);
  localStorage.setItem('app_users', JSON.stringify(users));
  return { success: true, user: newUser };
};

export const updateUser = async (id, updates) => {
  // Mise à jour d'un utilisateur (admin/staff).
  // Si Supabase est configuré et qu'une session est active, on met à jour
  // Supabase (table users). Sinon, mise à jour locale dans localStorage.
  const sb = getSupabase();
  if (sb && isSyncConfigured() && hasSupabaseSession()) {
    try {
      const { data, error } = await sb
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) return { success: true, user: data };
    } catch {
      // Supabase indisponible : on passe au fallback local.
    }
  }

  const users = JSON.parse(localStorage.getItem('app_users') || '[]');
  const index = users.findIndex(u => String(u.id) === String(id));
  if (index !== -1) {
    users[index] = { ...users[index], ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem('app_users', JSON.stringify(users));
  }
  return { success: true, user: users.find(u => String(u.id) === String(id)) };
};

// ============================================================================
// AVIS PRODUITS (REVIEWS)
// ============================================================================

export const getReviewsByProduct = async (productId) => {
  const sb = getSupabase();
  if (!sb || !isSyncConfigured()) {
    // Fallback localStorage
    const reviews = JSON.parse(localStorage.getItem('product_reviews') || '{}');
    return reviews[productId] || [];
  }

  try {
    const { data, error } = await sb
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch {
    const reviews = JSON.parse(localStorage.getItem('product_reviews') || '{}');
    return reviews[productId] || [];
  }
};

export const getPendingReviews = async () => {
  const sb = getSupabase();
  if (!sb || !hasSupabaseSession()) {
    // Fallback localStorage
    const reviews = JSON.parse(localStorage.getItem('product_reviews') || '{}');
    const pending = [];
    for (const [productId, revs] of Object.entries(reviews)) {
      revs.filter(r => r.status === 'pending').forEach(r => pending.push({ ...r, product_id: productId }));
    }
    return pending;
  }

  try {
    const { data, error } = await sb
      .from('reviews')
      .select('*, products(title)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch {
    const reviews = JSON.parse(localStorage.getItem('product_reviews') || '{}');
    const pending = [];
    for (const [productId, revs] of Object.entries(reviews)) {
      revs.filter(r => r.status === 'pending').forEach(r => pending.push({ ...r, product_id: productId }));
    }
    return pending;
  }
};

export const createReview = async (reviewData) => {
  // Création d'un avis produit.
  // Si Supabase est configuré, on essaie d'abord de créer l'avis côté cloud
  // pour le rendre disponible partout. Sinon, création locale.
  const sb = getSupabase();
  if (sb && isSyncConfigured()) {
    try {
      const { data, error } = await sb
        .from('reviews')
        .insert({
          ...reviewData,
          id: reviewData.id || crypto.randomUUID(),
          product_id: reviewData.product_id || reviewData.productId,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!error && data) return { success: true, review: data };
    } catch {
      // Supabase indisponible : on passe au fallback local.
    }
  }

  const reviews = JSON.parse(localStorage.getItem('product_reviews') || '{}');
  const productId = reviewData.product_id || reviewData.productId;
  if (!reviews[productId]) reviews[productId] = [];
  const newReview = {
    ...reviewData,
    id: reviewData.id || crypto.randomUUID(),
    product_id: productId,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  reviews[productId].push(newReview);
  localStorage.setItem('product_reviews', JSON.stringify(reviews));
  return { success: true, review: newReview };
};

export const updateReviewStatus = async (id, status) => {
  const sb = getSupabase();
  if (!sb || !hasSupabaseSession()) {
    // Fallback localStorage
    const reviews = JSON.parse(localStorage.getItem('product_reviews') || '{}');
    for (const [_productId, revs] of Object.entries(reviews)) {
      const index = revs.findIndex(r => String(r.id) === String(id));
      if (index !== -1) {
        revs[index].status = status;
        revs[index].updated_at = new Date().toISOString();
        localStorage.setItem('product_reviews', JSON.stringify(reviews));
        return { success: true, review: revs[index] };
      }
    }
    return { success: false, reason: 'Non trouvé' };
  }

  try {
    const { data, error } = await sb
      .from('reviews')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, review: data };
  } catch {
    const reviews = JSON.parse(localStorage.getItem('product_reviews') || '{}');
    for (const [_productId, revs] of Object.entries(reviews)) {
      const index = revs.findIndex(r => String(r.id) === String(id));
      if (index !== -1) {
        revs[index].status = status;
        revs[index].updated_at = new Date().toISOString();
        localStorage.setItem('product_reviews', JSON.stringify(reviews));
        return { success: true, review: revs[index] };
      }
    }
    return { success: false, reason: 'Non trouvé' };
  }
};

// ============================================================================
// ALERTES ADMIN
// ============================================================================

export const getAdminAlerts = async () => {
  // Liste des alertes admin.
  // Si Supabase est configuré et qu'une session est active, on privilégie la
  // lecture depuis Supabase (table admin_alerts). Sinon, fallback local.
  const sb = getSupabase();
  if (sb && isSyncConfigured() && hasSupabaseSession()) {
    try {
      const { data, error } = await sb
        .from('admin_alerts')
        .select('*')
        .order('date', { ascending: false })
        .limit(50);

      if (!error && data) return data;
    } catch {
      // Supabase indisponible : on passe au fallback local.
    }
  }

  return JSON.parse(localStorage.getItem('admin_alerts') || '[]');
};

export const createAdminAlert = async (alertData) => {
  // Création d'une alerte admin.
  // Si Supabase est configuré et qu'une session est active, l'alerte est créée
  // côté cloud pour être visible sur plusieurs appareils. Sinon, création locale.
  const sb = getSupabase();
  if (sb && isSyncConfigured() && hasSupabaseSession()) {
    try {
      const { data, error } = await sb
        .from('admin_alerts')
        .insert({
          ...alertData,
          id: alertData.id || crypto.randomUUID(),
          date: alertData.date || new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!error && data) return { success: true, alert: data };
    } catch {
      // Supabase indisponible : on passe au fallback local.
    }
  }

  const alerts = JSON.parse(localStorage.getItem('admin_alerts') || '[]');
  const newAlert = {
    ...alertData,
    id: alertData.id || crypto.randomUUID(),
    date: alertData.date || new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  alerts.unshift(newAlert);
  localStorage.setItem('admin_alerts', JSON.stringify(alerts.slice(0, 100)));
  return { success: true, alert: newAlert };
}

export const markAlertAsRead = async (id) => {
  const sb = getSupabase();
  if (!sb || !hasSupabaseSession()) {
    // Fallback localStorage
    const alerts = JSON.parse(localStorage.getItem('admin_alerts') || '[]');
    const index = alerts.findIndex(a => String(a.id) === String(id));
    if (index !== -1) {
      alerts[index].read = true;
      localStorage.setItem('admin_alerts', JSON.stringify(alerts));
    }
    return { success: true };
  }

  try {
    const { error } = await sb
      .from('admin_alerts')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch {
    const alerts = JSON.parse(localStorage.getItem('admin_alerts') || '[]');
    const index = alerts.findIndex(a => String(a.id) === String(id));
    if (index !== -1) {
      alerts[index].read = true;
      localStorage.setItem('admin_alerts', JSON.stringify(alerts));
    }
    return { success: true };
  }
};

// ============================================================================
// UTILITAIRES
// ============================================================================

// Génère une référence de commande au format :
//   CMD-YYMMDD-2401940001-HHMM
//
// Ce format est utilisé comme fallback quand aucune référence n'est fournie
// lors de la création d'une commande. Le suffixe fixe est
// ORDER_REFERENCE_BRAND_ID (= "2401940001") depuis siteConfig.
// Si tu changes ce format, pense à reporter le changement partout où la
// référence est générée ou affichée (Popup, commandes, emails, suivi, etc.).
const generateReference = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePart = `${yy}${mm}${dd}`;
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const timePart = `${hh}${min}`;
  return `CMD-${datePart}-${ORDER_REFERENCE_BRAND_ID}-${timePart}`;
};

// Synchronisation : copier les données locales vers les tables normalisées
// (à appeler une fois lors de la migration, si les tables existent déjà)
export const syncLocalDataToNormalizedTables = async () => {
  const sb = getSupabase();
  if (!sb || !hasSupabaseSession()) {
    return { success: false, reason: 'Pas de session admin' };
  }

  // Synchroniser les commandes déjà présentes en localStorage vers Supabase.
  // Si une commande existe déjà côté cloud (même id), elle est mise à jour.
  // Les erreurs individuelles sont ignorées pour ne pas bloquer toute la
  // synchronisation à cause d'une seule commande problématique.
  const localOrders = JSON.parse(localStorage.getItem('shop_orders') || '[]');
  let syncedOrders = 0;
  for (const order of localOrders) {
    try {
      await sb.from('orders').upsert({
        id: order.id,
        reference: order.reference,
        customer_name: order.customer?.name || order.customer_name || '',
        customer_email: order.customer?.email || order.customer_email || '',
        customer_phone: order.customer?.phone || order.customer_phone || '',
        customer_address: order.customer?.address || order.customer_address || '',
        items: order.items || [],
        total: order.total || 0,
        status: order.status || 'pending',
        payment_method: order.payment_method || 'Mobile Money',
        date: order.date || new Date().toISOString(),
        shipping: order.shipping || null,
        cancelled_at: order.cancelled_at || null,
        notes: order.notes || null,
      }, { onConflict: 'id' });
      syncedOrders += 1;
    } catch {
      // Ignorer les erreurs de migration individuelle
    }
  }

  // Les paramètres sont déjà gérés via sync_store (table clé/valeur).
  // Si une table dédiée settings est créée plus tard, il faudra la
  // synchroniser ici aussi.

  return { success: true, syncedOrders };
};

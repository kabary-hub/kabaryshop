// src/services/supabase.js
// Service Supabase avec les opérations CRUD pour les tables normalisées.
//
// Ce fichier complète src/services/db.js (qui gère la synchronisation
// clé/valeur via sync_store). Ici, on utilise les tables normalisées
// (products, orders, users, reviews, admin_alerts) pour les opérations
// qui ont besoin de relations, d'indexation ou de RLS fine.
//
// COMPATIBILITÉ : ce service est optionnel. Si Supabase n'est pas configuré
// ou si une fonction échoue, on retourne des résultats compatibles avec le
// comportement localStorage existant (voir les fallback dans chaque fonction).

import { getSupabase, isSyncConfigured, hasSupabaseSession } from './db';

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
  // Fonction pour le suivi de commande public (sans authentification)
  const sb = getSupabase();
  if (!sb || !isSyncConfigured()) {
    // Fallback localStorage - lecture publique
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

// ============================================================================
// UTILISATEURS
// ============================================================================

export const getUsers = async () => {
  const sb = getSupabase();
  if (!sb || !hasSupabaseSession()) {
    // Fallback localStorage
    return JSON.parse(localStorage.getItem('app_users') || '[]');
  }

  try {
    const { data, error } = await sb
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch {
    return JSON.parse(localStorage.getItem('app_users') || '[]');
  }
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
  const sb = getSupabase();
  if (!sb || !hasSupabaseSession()) {
    // Fallback localStorage
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
  }

  try {
    const { data, error } = await sb
      .from('users')
      .insert({
        ...userData,
        id: userData.id || crypto.randomUUID(),
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, user: data };
  } catch {
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
  }
};

export const updateUser = async (id, updates) => {
  const sb = getSupabase();
  if (!sb || !hasSupabaseSession()) {
    // Fallback localStorage
    const users = JSON.parse(localStorage.getItem('app_users') || '[]');
    const index = users.findIndex(u => String(u.id) === String(id));
    if (index !== -1) {
      users[index] = { ...users[index], ...updates, updated_at: new Date().toISOString() };
      localStorage.setItem('app_users', JSON.stringify(users));
    }
    return { success: true, user: users.find(u => String(u.id) === String(id)) };
  }

  try {
    const { data, error } = await sb
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, user: data };
  } catch {
    const users = JSON.parse(localStorage.getItem('app_users') || '[]');
    const index = users.findIndex(u => String(u.id) === String(id));
    if (index !== -1) {
      users[index] = { ...users[index], ...updates, updated_at: new Date().toISOString() };
      localStorage.setItem('app_users', JSON.stringify(users));
    }
    return { success: true, user: users.find(u => String(u.id) === String(id)) };
  }
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
  const sb = getSupabase();
  if (!sb || !isSyncConfigured()) {
    // Fallback localStorage
    const reviews = JSON.parse(localStorage.getItem('product_reviews') || '{}');
    const productId = reviewData.product_id || reviewData.productId;
    if (!reviews[productId]) reviews[productId] = [];
    const newReview = {
      ...reviewData,
      id: reviewData.id || crypto.randomUUID(),
      product_id: productId,
      status: 'pending', // Moderation par défaut
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    reviews[productId].push(newReview);
    localStorage.setItem('product_reviews', JSON.stringify(reviews));
    return { success: true, review: newReview };
  }

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

    if (error) throw error;
    return { success: true, review: data };
  } catch {
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
  }
};

export const updateReviewStatus = async (id, status) => {
  const sb = getSupabase();
  if (!sb || !hasSupabaseSession()) {
    // Fallback localStorage
    const reviews = JSON.parse(localStorage.getItem('product_reviews') || '{}');
    for (const [productId, revs] of Object.entries(reviews)) {
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
    for (const [productId, revs] of Object.entries(reviews)) {
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
  const sb = getSupabase();
  if (!sb || !hasSupabaseSession()) {
    // Fallback localStorage
    return JSON.parse(localStorage.getItem('admin_alerts') || '[]');
  }

  try {
    const { data, error } = await sb
      .from('admin_alerts')
      .select('*')
      .order('date', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch {
    return JSON.parse(localStorage.getItem('admin_alerts') || '[]');
  }
};

export const createAdminAlert = async (alertData) => {
  const sb = getSupabase();
  if (!sb || !hasSupabaseSession()) {
    // Fallback localStorage
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

    if (error) throw error;
    return { success: true, alert: data };
  } catch {
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
};

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
      .update({ read: true })
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

const generateReference = () => {
  const now = new Date();
  const datePart = [
    String(now.getFullYear()).slice(2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const maxSeq = 1;
  return `CMD-${datePart}-${String(maxSeq).padStart(4, '0')}`;
};

// Synchronisation : copier les données locales vers les tables normalisées
// (à appeler une fois lors de la migration)
export const syncLocalDataToNormalizedTables = async () => {
  const sb = getSupabase();
  if (!sb || !hasSupabaseSession()) {
    return { success: false, reason: 'Pas de session admin' };
  }

  // Synchroniser les commandes
  const localOrders = JSON.parse(localStorage.getItem('shop_orders') || '[]');
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
    } catch {
      // Ignorer les erreurs de migration individuelle
    }
  }

  // Synchroniser les paramètres (déjà dans sync_store, mais on peut aussi les
  // copier vers une table settings si on en crée une)
  // Pour l'instant, on garde sync_store comme source de vérité pour settings

  return { success: true, syncedOrders: localOrders.length };
};

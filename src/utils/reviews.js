// src/utils/reviews.js
// Avis clients : avis utilisateurs persistés (validés par l'admin) + statistiques

const STORAGE_KEY = "product_reviews";

// Avis utilisateurs persistés (par produit)
export const getUserReviews = (productId) => {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return all[String(productId)] || [];
  } catch {
    // stockage indisponible
    return [];
  }
};

// Ajouter un avis utilisateur, retourne la liste à jour des avis utilisateurs du produit
export const addUserReview = (productId, review) => {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const key = String(productId);
    const updated = [
      ...(all[key] || []),
      { ...review, id: `user_${Date.now()}`, status: "pending" },
    ];
    all[key] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return updated;
  } catch {
    // stockage indisponible
    return [];
  }
};

// Tous les avis d'un produit (uniquement les avis utilisateurs VALIDÉS), du plus récent au plus ancien.
// Les avis en attente de validation sont masqués côté public.
export const getAllReviews = (productId) => {
  const approved = getUserReviews(productId).filter(
    (r) => !r.status || r.status === "approved",
  );
  return approved.sort((a, b) => new Date(b.date) - new Date(a.date));
};

// ---- Modération (admin) ----

// Tous les avis soumis par les utilisateurs, aplatis avec leur produit (pour l'admin)
export const getAllUserReviews = () => {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const flat = [];
    Object.keys(all).forEach((productId) => {
      (all[productId] || []).forEach((review) => {
        flat.push({ productId, ...review });
      });
    });
    return flat.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch {
    // stockage indisponible
    return [];
  }
};

// Statut normalisé d'un avis (les anciens avis sans statut sont considérés validés)
export const getReviewStatus = (review) => review?.status || "approved";

// Changer le statut d'un avis utilisateur (pending -> approved, ...)
export const setReviewStatus = (productId, reviewId, status) => {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const key = String(productId);
    all[key] = (all[key] || []).map((r) =>
      r.id === reviewId ? { ...r, status } : r,
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event("reviewsUpdated"));
    window.dispatchEvent(new Event("storage"));
    return true;
  } catch {
    // stockage indisponible
    return false;
  }
};

// Valider un avis (le rend visible publiquement)
export const approveReview = (productId, reviewId) =>
  setReviewStatus(productId, reviewId, "approved");

// Supprimer définitivement un avis utilisateur
export const deleteUserReview = (productId, reviewId) => {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const key = String(productId);
    all[key] = (all[key] || []).filter((r) => r.id !== reviewId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event("reviewsUpdated"));
    window.dispatchEvent(new Event("storage"));
    return true;
  } catch {
    // stockage indisponible
    return false;
  }
};

// Répondre à un avis (réponse du vendeur).
// - reply (string non vide) : ajoute/met à jour la réponse avec la date courante
// - reply null/vide : supprime la réponse existante
export const setReviewReply = (productId, reviewId, reply) => {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const key = String(productId);
    all[key] = (all[key] || []).map((r) => {
      if (r.id !== reviewId) return r;
      const updated = { ...r };
      if (reply && reply.trim()) {
        updated.reply = { text: reply.trim(), date: new Date().toISOString() };
      } else {
        delete updated.reply;
      }
      return updated;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event("reviewsUpdated"));
    window.dispatchEvent(new Event("storage"));
    return true;
  } catch {
    // stockage indisponible
    return false;
  }
};

// ---------------------------------------------------------------------------
// Avis généraux du site (page Notes — sans produit associé)
// ---------------------------------------------------------------------------
const FEEDBACK_KEY = "site_feedback";

export const getSiteFeedback = () => {
  try {
    const all = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "[]");
    if (!Array.isArray(all)) return [];
    // Uniquement les avis validés (les en attente sont masqués côté public)
    return all
      .filter((r) => !r.status || r.status === "approved")
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch {
    return [];
  }
};

// Ajouter un avis général du site (statut en attente de validation)
export const addSiteFeedback = (feedback) => {
  try {
    const all = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "[]");
    const updated = [
      { ...feedback, id: `site_${Date.now()}`, status: "pending" },
      ...all,
    ];
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("reviewsUpdated"));
    window.dispatchEvent(new Event("storage"));
    return updated;
  } catch {
    return [];
  }
};

// Tous les avis généraux (y compris en attente) — pour l'admin
export const getAllSiteFeedback = () => {
  try {
    const all = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "[]");
    return Array.isArray(all) ? all.sort((a, b) => new Date(b.date) - new Date(a.date)) : [];
  } catch {
    return [];
  }
};

// Changer le statut d'un avis général
export const setSiteFeedbackStatus = (id, status) => {
  try {
    const all = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "[]");
    const updated = all.map((r) => (r.id === id ? { ...r, status } : r));
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("reviewsUpdated"));
    window.dispatchEvent(new Event("storage"));
    return true;
  } catch {
    return false;
  }
};

export const approveSiteFeedback = (id) => setSiteFeedbackStatus(id, "approved");

// Répondre à un avis général (réponse du vendeur)
// - reply (string non vide) : ajoute/met à jour la réponse
// - reply null/vide : supprime la réponse existante
export const setSiteFeedbackReply = (id, reply) => {
  try {
    const all = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "[]");
    const updated = all.map((r) => {
      if (r.id !== id) return r;
      const copy = { ...r };
      if (reply && reply.trim()) {
        copy.reply = { text: reply.trim(), date: new Date().toISOString() };
      } else {
        delete copy.reply;
      }
      return copy;
    });
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("reviewsUpdated"));
    window.dispatchEvent(new Event("storage"));
    return true;
  } catch {
    return false;
  }
};

// Supprimer un avis général
export const deleteSiteFeedback = (id) => {
  try {
    const all = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "[]");
    const updated = all.filter((r) => r.id !== id);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("reviewsUpdated"));
    window.dispatchEvent(new Event("storage"));
    return true;
  } catch {
    return false;
  }
};

// Statistiques pures : moyenne + répartition par étoiles
export const computeStats = (reviews) => {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (!reviews || !reviews.length) {
    return { average: 0, count: 0, distribution };
  }
  let sum = 0;
  reviews.forEach((r) => {
    const rounded = Math.round(Number(r.rating));
    const key = Math.min(5, Math.max(1, rounded));
    distribution[key] += 1;
    sum += Number(r.rating);
  });
  return {
    average: Math.round((sum / reviews.length) * 10) / 10,
    count: reviews.length,
    distribution,
  };
};

// Statistiques pour un produit donné
export const getReviewStats = (productId) =>
  computeStats(getAllReviews(productId));

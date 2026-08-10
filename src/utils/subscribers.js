// src/utils/subscribers.js
// Abonnés newsletter : liste persistée (localStorage), bannière "Nouveautés"
// dans le site et notification par email (Resend via la fonction Vercel)
// à chaque nouveau produit.

import {
  sendEmail,
  getSiteName,
  buildNewArrivalEmail,
  buildShippingAssignmentEmail,
  buildOrderItemsHtml,
} from "./emailService";

const SUBSCRIBERS_KEY = "site_subscribers";
const DEVICE_SUB_KEY = "site_subscriber_device";
const PUBLICATIONS_KEY = "site_publications";
const LAST_SEEN_KEY = "site_last_seen_publications";
const AUTO_NOTIFY_KEY = "subscriber_auto_notify";

// ---- Liste des abonnés ----

export const getSubscribers = () => {
  try {
    return JSON.parse(localStorage.getItem(SUBSCRIBERS_KEY) || "[]");
  } catch {
    return [];
  }
};

export const isSubscribed = (email) =>
  getSubscribers().some(
    (s) => s.email.toLowerCase() === String(email || "").trim().toLowerCase(),
  );

// Ajoute un abonné (dédupliqué par email). Retourne la liste à jour.
export const addSubscriber = (email) => {
  const normalized = String(email || "").trim().toLowerCase();
  const list = getSubscribers();
  if (normalized && !list.some((s) => s.email === normalized)) {
    list.push({ email: normalized, date: new Date().toISOString() });
    try {
      localStorage.setItem(SUBSCRIBERS_KEY, JSON.stringify(list));
    } catch {
      // stockage indisponible : l'abonnement n'est pas persisté, mais on
      // marque quand même ce navigateur pour ne pas bloquer l'email de confirmation
      markDeviceSubscribed();
      return list;
    }
    window.dispatchEvent(new Event("subscribersUpdated"));
  }
  return list;
};

export const removeSubscriber = (email) => {
  const list = getSubscribers().filter((s) => s.email !== email);
  localStorage.setItem(SUBSCRIBERS_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("subscribersUpdated"));
  return list;
};

// ---- Abonné sur ce navigateur (pour la bannière "Nouveautés") ----

export const markDeviceSubscribed = () => {
  try {
    localStorage.setItem(DEVICE_SUB_KEY, "1");
  } catch {
    // stockage indisponible
  }
};
export const isDeviceSubscribed = () => {
  try {
    return localStorage.getItem(DEVICE_SUB_KEY) === "1";
  } catch {
    return false;
  }
};

// ---- Publications récentes (produits ajoutés par l'admin) ----

export const recordPublication = (product) => {
  try {
    const pubs = JSON.parse(localStorage.getItem(PUBLICATIONS_KEY) || "[]");
    pubs.unshift({
      id: String(product.id || product.originalId || ""),
      title: product.title || "",
      img: product.img || "",
      price: product.prix || "",
      date: new Date().toISOString(),
    });
    // Garder seulement les 6 plus récentes
    localStorage.setItem(PUBLICATIONS_KEY, JSON.stringify(pubs.slice(0, 6)));
    window.dispatchEvent(new Event("newPublications"));
  } catch {
    // stockage indisponible
  }
};

export const getRecentPublications = () => {
  try {
    return JSON.parse(localStorage.getItem(PUBLICATIONS_KEY) || "[]");
  } catch {
    return [];
  }
};

export const getLastSeenPublications = () => {
  const v = localStorage.getItem(LAST_SEEN_KEY);
  return v ? Number(v) : 0;
};

export const markPublicationsSeen = () =>
  localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));

// ---- Notification par email (Resend) ----

export const isAutoNotifyEnabled = () => localStorage.getItem(AUTO_NOTIFY_KEY) !== "0";

export const setAutoNotifyEnabled = (enabled) =>
  localStorage.setItem(AUTO_NOTIFY_KEY, enabled ? "1" : "0");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Envoie un email à chaque abonné, séquentiellement avec une petite pause.
// Retourne { sent, failed }.
const sendToEachSubscriber = async (baseParams, subscribers) => {
  let sent = 0;
  let failed = 0;
  for (const sub of subscribers) {
    const res = await sendEmail({
      ...baseParams,
      to: sub.email,
      toName: sub.email.split("@")[0] || sub.email,
    });
    if (res.ok) sent++;
    else failed++;
    await delay(150);
  }
  return { sent, failed };
};

// Envoie un email à CHAQUE abonné pour annoncer un nouveau produit.
// Le contenu est construit en français par emailService (aucun template
// externe à configurer).
export const notifySubscribersNewProduct = async (product) => {
  if (!isAutoNotifyEnabled()) return;
  const subscribers = getSubscribers();
  if (!subscribers.length) return;

  const siteName = getSiteName();
  const productUrl = `${window.location.origin}/produit/${product.id}`;
  const baseParams = {
    fromName: siteName,
    subject: `🛍️ Nouveau produit : ${product.title || "Nouveauté"}`,
    html: buildNewArrivalEmail({ siteName, product, productUrl }),
  };

  await sendToEachSubscriber(baseParams, subscribers);
};

// ---- Email d'expédition au livreur / préparateur ----
//
// Quand l'admin assigne une commande à un livreur ou préparateur, celui-ci
// reçoit les détails de la commande dans sa boîte Gmail pour passer à
// l'expédition ou à la préparation.

export const sendShippingAssignmentEmail = async ({
  toEmail = "",
  toName = "",
  order = null,
} = {}) => {
  if (!toEmail || !order) {
    return { ok: false, message: "Destinataire ou commande manquante." };
  }

  const siteName = getSiteName();

  // Lignes d'articles lisibles pour le template (prix en GNF)
  const itemsHtml = buildOrderItemsHtml(
    (order.items || []).map((item) => ({
      name: item.name,
      quantity: item.quantity || 1,
      priceLabel: `${(item.price || 0).toLocaleString()} GNF`,
    })),
  );

  const html = buildShippingAssignmentEmail({
    siteName,
    toName: toName || toEmail.split("@")[0] || toEmail,
    order,
    itemsHtml,
    totalLabel: `${(order.total || 0).toLocaleString()} GNF`,
  });

  const res = await sendEmail({
    to: toEmail,
    toName: toName || toEmail.split("@")[0] || toEmail,
    fromName: siteName,
    subject: `📦 Commande ${order.reference || `CMD-${order.id}`} assignée`,
    html,
  });

  if (res.ok) {
    return {
      ok: true,
      message: `Commande envoyée par email à ${toName || toEmail} ✅`,
    };
  }
  return {
    ok: false,
    message: `Échec de l'envoi de l'email à ${toName || toEmail}. ${res.message}`,
  };
};

// ---- Email de test (sans publier de produit) ----

// Envoie un email de test avec un produit fictif pour vérifier que le rendu
// « Nouveaux arrivages » affiche correctement les infos produit.
// toAll=true  → envoie à tous les abonnés (comme une vraie publication)
// toAll=false → envoie à l'adresse fournie dans toEmail
export const sendTestNewArrivalsEmail = async ({
  toEmail = "",
  toAll = false,
} = {}) => {
  // Produit fictif pour simuler une publication
  const sampleProduct = {
    title: "Produit de démonstration",
    prix: "150 000 GNF",
    category: "Femmes",
    img: "https://picsum.photos/300/400",
    id: "test-demo",
  };

  const siteName = getSiteName();
  const productUrl = `${window.location.origin}/produit/test-demo`;
  const baseParams = {
    fromName: siteName,
    subject: `🧪 Email de test — ${sampleProduct.title}`,
    html: buildNewArrivalEmail({ siteName, product: sampleProduct, productUrl }),
  };

  if (toAll) {
    const subscribers = getSubscribers();
    if (!subscribers.length) {
      return { ok: false, message: "Aucun abonné enregistré pour l'instant." };
    }
    const { sent, failed } = await sendToEachSubscriber(baseParams, subscribers);
    return {
      ok: failed === 0,
      message:
        failed === 0
          ? `Test envoyé à ${sent} abonné(s). ✅`
          : `Échec partiel : ${failed}/${sent + failed} abonné(s) n'ont pas reçu le test.`,
    };
  }

  const email = String(toEmail || "").trim();
  if (!email) {
    return { ok: false, message: "Veuillez saisir une adresse email de test." };
  }
  const res = await sendEmail({ ...baseParams, to: email });
  return {
    ok: res.ok,
    message: res.ok
      ? `Email de test envoyé à ${email} ✅`
      : `Échec de l'envoi à ${email}. ${res.message}`,
  };
};

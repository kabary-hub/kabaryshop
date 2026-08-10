// src/utils/notifications.js
// Notifications fonctionnelles pour l'admin :
// 1. Push navigateur  -> Notification API (permission demandée à l'utilisateur)
// 2. Alertes in-app   -> liste persistée (localStorage) affichée dans la cloche admin
// 3. Email (Resend)   -> alerte email admin (nouvelle commande, test)

import {
  sendEmail,
  getSiteName,
  getAdminEmail,
  buildAdminAlertEmail,
} from "./emailService";

// ---------------------------------------------------------------------------
// Lecture des paramètres (sans dépendre du contexte React)
// ---------------------------------------------------------------------------
const getSettings = () => {
  try {
    const s = JSON.parse(localStorage.getItem("kabary_settings") || "{}");
    return s;
  } catch {
    return {};
  }
};

// ---------------------------------------------------------------------------
// PUSH NAVIGATEUR (Notification API)
// ---------------------------------------------------------------------------
export const isPushSupported = () =>
  typeof window !== "undefined" && "Notification" in window;

export const getPushPermission = () =>
  isPushSupported() ? Notification.permission : "unsupported";

// Demande la permission d'afficher des notifications push
export const requestPushPermission = async () => {
  if (!isPushSupported()) {
    return {
      ok: false,
      message:
        "Ce navigateur ne prend pas en charge les notifications push. Utilisez Chrome, Edge ou Firefox.",
    };
  }
  if (Notification.permission === "granted") {
    return { ok: true, message: "Notifications déjà autorisées ✅", permission: "granted" };
  }
  if (Notification.permission === "denied") {
    return {
      ok: false,
      message:
        "Les notifications sont bloquées par le navigateur. Autorisez-les dans les réglages du site (icône 🔒 à côté de l'URL).",
      permission: "denied",
    };
  }
  try {
    const permission = await Notification.requestPermission();
    return {
      ok: permission === "granted",
      message:
        permission === "granted"
          ? "Notifications push activées ✅"
          : "Permission refusée. Vous pouvez la réactiver dans les réglages du navigateur.",
      permission,
    };
  } catch (err) {
    return { ok: false, message: `Erreur : ${err.message || err}` };
  }
};

// Affiche une notification push navigateur (si autorisé)
export const sendBrowserPush = (title, body, icon = "") => {
  if (!isPushSupported() || Notification.permission !== "granted") return false;
  try {
    const options = { body, tag: `push-${Date.now()}` };
    if (icon) options.icon = icon;
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch (err) {
    console.warn("Erreur notification push :", err);
    return false;
  }
};

// ---------------------------------------------------------------------------
// ALERTES IN-APP (cloche admin)
// ---------------------------------------------------------------------------
const ADMIN_ALERTS_KEY = "admin_alerts";

export const getAdminAlerts = () => {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_ALERTS_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveAdminAlerts = (alerts) => {
  try {
    localStorage.setItem(ADMIN_ALERTS_KEY, JSON.stringify(alerts));
    window.dispatchEvent(new Event("adminAlertsUpdated"));
  } catch {
    // stockage indisponible
  }
};

// Ajoute une alerte in-app (la plus récente en premier, 50 max)
export const addAdminAlert = ({ type = "info", title, message, link = null }) => {
  const alerts = getAdminAlerts();
  alerts.unshift({
    id: Date.now(),
    type,
    title,
    message,
    link,
    read: false,
    date: new Date().toISOString(),
  });
  saveAdminAlerts(alerts.slice(0, 50));
  return alerts[0];
};

export const getUnreadAlertsCount = () =>
  getAdminAlerts().filter((a) => !a.read).length;

export const markAllAlertsRead = () => {
  const alerts = getAdminAlerts().map((a) => ({ ...a, read: true }));
  saveAdminAlerts(alerts);
};

export const markAlertRead = (alertId) => {
  const alerts = getAdminAlerts().map((a) =>
    a.id === alertId ? { ...a, read: true } : a
  );
  saveAdminAlerts(alerts);
};

// ---------------------------------------------------------------------------
// EMAIL (Resend) — alertes email admin
// ---------------------------------------------------------------------------
// L'email est envoyé via la fonction Vercel → Resend (aucun template externe
// à configurer, le contenu est construit en français par emailService).
// Ne fait jamais échouer l'appelant.
export const sendAdminEmail = async ({
  subject = "Alerte",
  message = "",
  extra = {},
}) => {
  const siteName = getSiteName();
  const adminEmail = getAdminEmail();
  const fullSubject = `${subject}${extra.order_reference ? ` · ${extra.order_reference}` : ""}`;
  const res = await sendEmail({
    to: adminEmail,
    fromName: siteName,
    subject: fullSubject,
    html: buildAdminAlertEmail({ siteName, subject, message }),
  });
  if (res.ok) {
    return { ok: true, message: `Email envoyé à ${adminEmail} ✅` };
  }
  return {
    ok: false,
    message: `Envoi email impossible : ${res.message}`,
  };
};

// ---------------------------------------------------------------------------
// NOTIFICATION COMPLÈTE (toutes les canaux activés dans les paramètres)
// ---------------------------------------------------------------------------
// Vérifie si un canal est activé dans Admin > Paramètres > Notifications
const isChannelEnabled = (channel, defaultValue = true) => {
  const settings = getSettings();
  const notifs = settings.notifications || {};
  return notifs[channel] !== undefined ? !!notifs[channel] : defaultValue;
};

// Alerte sur nouvelle commande : cloche admin + push + email
export const notifyNewOrder = (order) => {
  const orderRef = order.reference || `CMD-${order.id}`;
  const customerName = order.customer?.name || "Client";
  const total = order.total || 0;

  // 1) Toujours : alerte in-app (cloche admin)
  addAdminAlert({
    type: "order",
    title: `Nouvelle commande #${orderRef}`,
    message: `${customerName} · ${total.toLocaleString()} GNF`,
    link: "/admin/orders",
  });

  // 2) Push navigateur (si activé dans Paramètres)
  if (isChannelEnabled("push", false)) {
    sendBrowserPush(
      `🛒 Nouvelle commande #${orderRef}`,
      `${customerName} · ${total.toLocaleString()} GNF — ouvrez l'admin pour la traiter.`
    );
  }

  // 3) Email admin (si activé dans Paramètres)
  if (isChannelEnabled("email", true)) {
    const items =
      order.items && order.items.length
        ? order.items
            .map(
              (i) =>
                `- ${i.name} x${i.quantity}${i.id ? ` (ID: ${i.id})` : ""}`
            )
            .join("\n")
        : "";
    sendAdminEmail({
      subject: `Nouvelle commande ${orderRef}`,
      message: `${customerName} vient de passer commande.\nRéférence : ${orderRef}\nTotal : ${total.toLocaleString()} GNF\n\n${items}`,
    });
  }
};

// Notification de test depuis Paramètres
// Retourne un tableau de résultats structurés : { ok, message }
export const sendTestNotification = async () => {
  const results = [];

  // Test alerte in-app (toujours)
  addAdminAlert({
    type: "success",
    title: "Test de notification",
    message: "Les alertes in-app fonctionnent correctement ✅",
    link: "/admin",
  });
  results.push({ ok: true, message: "Alerte in-app affichée dans la cloche ✅" });

  // Test push (selon permission)
  const permission = getPushPermission();
  if (permission === "granted") {
    sendBrowserPush(
      `🔔 Test ${getSiteName()}`,
      "Les notifications push fonctionnent correctement ✅"
    );
    results.push({ ok: true, message: "Notification push affichée ✅" });
  } else if (permission === "denied") {
    results.push({
      ok: false,
      message: "Push bloqué par le navigateur — autorisez-le dans les réglages du site.",
    });
  } else {
    results.push({
      ok: false,
      message: "Push non autorisé — cliquez sur « Activer le push » ci-dessus.",
    });
  }

  // Test email (selon paramètres)
  if (isChannelEnabled("email", true)) {
    const res = await sendAdminEmail({
      subject: "Test de notification",
      message: "Ceci est un email de test envoyé depuis les paramètres.",
    });
    results.push({ ok: res.ok, message: res.ok ? "Email de test envoyé ✅" : res.message });
  } else {
    results.push({ ok: true, message: "Email désactivé dans les paramètres (canal ignoré)." });
  }

  return results;
};

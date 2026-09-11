// src/utils/emailService.js
// Service central d'envoi d'emails du site.
//
// Le site est une application React sans serveur : il ne peut pas contenir la
// clé API Resend (elle est SECRÈTE). On passe donc par la fonction Vercel
// `api/send-mail.js`, qui relaie l'email vers Resend avec la clé protégée.
//
// Ce fichier contient :
//   1. `sendEmail` : appel à la fonction Vercel (fetch POST)
//   2. Tous les templates HTML en français (newsletter, arrivages, commande,
//      2FA, expédition, alerte admin) — construits ici, plus besoin de créer
//      des templates dans un tableau de bord externe.
//
// Variables d'environnement (voir .env.example) :
//   VITE_EMAIL_API_URL : URL de la fonction (défaut : /api/send-mail)
//   VITE_SEND_KEY      : clé partagée (optionnelle, si SEND_API_KEY est
//                        configurée côté Vercel)

// Mapping catalogue → URL publique ImgBB.
// Ce fichier est généré par le script d'upload.
// S'il n'existe pas encore, on utilise un mapping vide pour que le module
// ne plante pas à l'initialisation.
import { PUBLIC_PRODUCT_IMAGES } from "./productPublicImages.js";

const safePublicProductImages =
  typeof PUBLIC_PRODUCT_IMAGES === "object" && PUBLIC_PRODUCT_IMAGES !== null
    ? PUBLIC_PRODUCT_IMAGES
    : {};

// Origine PUBLIQUE du site, utilisée pour rendre les URLs absolues dans les
// emails et les liens envoyés hors du navigateur (emails, rapports, etc.).
// On n'utilise JAMAIS window.location.origin pour les emails envoyés côté
// client si le site n'est pas encore déployé : dans ce cas là on retombe sur
// une origine par défaut explicite, sinon les chemins d'images/logos sont morts.
// VITE_BASE_URL (optionnel) permet de pointer vers le domaine final de production.
const getPublicOrigin = () => {
  const env = import.meta.env?.VITE_BASE_URL;
  if (env && env.trim()) return env.trim().replace(/\/+$/, "");
  // Fallback par défaut : précise bien que c'est un fallback et non l'URL finale.
  return "https://kabaryshop.vercel.app";
};

// Transforme une URL éventuellement relative (« /logo2.png ») en URL absolue
// : indispensable dans les emails, car les messageries (Gmail, Outlook…) ne
// peuvent pas résoudre un chemin relatif.
const toAbsoluteUrl = (url) => {
  if (!url) return "";
  if (/^(https?:)?\/\//i.test(url)) return url; // déjà absolue
  if (url.startsWith("/")) {
    return `${getPublicOrigin().replace(/\/$/, "")}${url}`;
  }
  return url;
};

// Fallback publique garanti pour les images envoyées par email.
// Logo du site, utilisable aussi comme fallback produit quand l'image est absente.
const DEFAULT_SITE_LOGO = getPublicOrigin() + "/logo2.png";
const DEFAULT_PRODUCT_IMAGE = getPublicOrigin() + "/logo2.png";

// Retrouve l'URL publique d'une image catalogue à partir de son chemin.
// Accepte « /src/assets/<cat>/<fichier> », « <cat>/<fichier> » et les
// variantes de nom (query ?v=, extension différente) en ignorant la casse.
const toPublicProductImageUrl = (url) => {
  if (!url || /^(https?:)?\/\//i.test(url)) return url; // déjà absolue
  const m = String(url).match(/([^/\\]+)\/([^/\\]+)$/);
  if (!m) return url;
  const folder = decodeURIComponent(m[1]).toLowerCase();
  const file = decodeURIComponent(m[2]).toLowerCase();
  const base = file.replace(/\.[a-z0-9]+$/i, "");
  const keys = Object.keys(safePublicProductImages);
  // 1) clé exacte « cat/fichier.ext » (casse ignorée)
  let hit = keys.find((k) => {
    const i = k.toLowerCase().indexOf("/");
    return (
      i > 0 &&
      k.toLowerCase().slice(0, i) === folder &&
      k.toLowerCase().slice(i + 1) === file
    );
  });
  // 2) même base de nom avec une autre extension (jpg ↔ webp…)
  if (!hitA) {
    hitA = keys.find((k) => {
      const i = k.toLowerCase().indexOf("/");
      return (
        i > 0 &&
        k.toLowerCase().slice(0, i) === folder &&
        k.toLowerCase().slice(i + 1).replace(/\.[a-z0-9]+$/i, "") === base
      );
    });
  }
  return hitA ? (safePublicProductImages[hitA] || hitA) : url;
};

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// URL de la fonction Vercel qui relaie vers Resend.
const getApiUrl = () =>
  (import.meta.env?.VITE_EMAIL_API_URL || "/api/send-mail").replace(/\/$/, "");

// Clé partagée envoyée dans l'en-tête x-send-key (anti-abus, optionnelle).
const getSendKey = () => import.meta.env?.VITE_SEND_KEY || "";

// Nom du site (lu depuis les paramètres stockés, sans dépendre de React).
export const getSiteName = () => {
  try {
    const s = JSON.parse(localStorage.getItem("kabary_settings") || "{}");
    return s.siteName || "Kabary Shop";
  } catch {
    return "Kabary Shop";
  }
};

// Logo du site (URL d'image, lu depuis les paramètres stockés).
// Utilisé dans le bandeau de TOUS les emails envoyés par le site.
// Si le paramètre est vide/relatif, on retourne l'URL absolue correspondante.
export const getSiteLogo = () => {
  try {
    const s = JSON.parse(localStorage.getItem("kabary_settings") || "{}");
    const raw = s.siteLogo || "";
    // Les emails ont besoin d'une URL absolue ; on résout les chemins relatifs
    // (ex : "/logo2.png") vers l'origine du site déployé.
    return toAbsoluteUrl(raw || "/logo2.png");
  } catch {
    return toAbsoluteUrl("/logo2.png");
  }
};

// Coordonnées du site (téléphone, email, adresse) affichées dans le bandeau
// des emails. Lues depuis les paramètres stockés (Paramètres → Coordonnées).
export const getSiteContacts = () => {
  try {
    const s = JSON.parse(localStorage.getItem("kabary_settings") || "{}");
    return {
      phone: s.sitePhone || "",
      email: s.siteEmail || "",
      address: s.siteAddress || "",
    };
  } catch {
    return { phone: "", email: "", address: "" };
  }
};

// Produit à son URL d’image absolue, en acceptant plusieurs formes de stockage
// (principal : img, champs historiques : url/image, ou première image de galerie).
export const getProductImageUrl = (product) => {
  if (!product) return "";
  const raw =
    product.img ||
    product.url ||
    product.image ||
    (Array.isArray(product.images) ? product.images[0] : "") ||
    "";
  // Si le produit n'a pas d'image, on retourne l'URL publique du logo
  // du site, et non un chemin local qui ne serait pas chargé par Gmail.
  return toAbsoluteUrl(raw || "/logo2.png");
};

// Email de l'administrateur (réception des alertes).
// Lit depuis les paramètres du site (Admin > Paramètres > Coordonnées).
// Pas de fallback hardcodé : si non configuré, retourne une chaîne vide.
export const getAdminEmail = () => {
  try {
    const s = JSON.parse(localStorage.getItem("kabary_settings") || "{}");
    return s.adminEmail || s.siteEmail || "";
  } catch {
    return "";
  }
};

// Journal d'envoi optionnel (voir emailLogService).
// Import dynamique uniquement au moment de l'envoi, pour que le module
// de base ne plante pas si ce service est temporairement indisponible.
const _emailLogApi = () => {
  try {
    return import("../services/emailLogService.js");
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Envoi d'un email (via la fonction Vercel → Resend)
// ---------------------------------------------------------------------------

// Envoie un email. Retourne toujours { ok, message, id? } sans jamais lever
// d'exception : l'appelant peut afficher le message à l'utilisateur.
export const sendEmail = async ({
  to = "",
  toName = "",
  fromName = "",
  subject = "",
  html = "",
}) => {
  if (!to || !subject || !html) {
    console.warn('[Email] Paramètres manquants:', { to: !!to, subject: !!subject, html: !!html });
    return { ok: false, message: "Destinataire, sujet ou contenu manquant." };
  }
  const apiUrl = getApiUrl();
  try {
    console.log(`[Email] Envoi vers ${to} via ${apiUrl}`);
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getSendKey() ? { "x-send-key": getSendKey() } : {}),
      },
      body: JSON.stringify({ to, toName, fromName, subject, html }),
    });

    const rawBody = await response.text().catch(() => "");
    let data = {};
    try { data = JSON.parse(rawBody); } catch { /* non-JSON */ }

    if (!response.ok) {
      const detail =
        data.message ||
        (rawBody && !rawBody.startsWith("{")
          ? rawBody.replace(/<[^>]*>/g, "").slice(0, 300)
          : "") ||
        `La fonction d'envoi a répondu (${response.status}).`;
      const hint =
        response.status >= 500
          ? " Vérifiez la configuration RESEND_API_KEY et EMAIL_FROM sur Vercel."
          : "";

      console.error(`[Email] Erreur HTTP ${response.status}:`, detail);
      return { ok: false, message: `${detail}${hint}`.trim() };
    }

    console.log(`[Email] Succès:`, data.message, data.id);
    const result = { ok: true, message: data.message || "Email envoyé", id: data.id };

    try {
      const emailLogModule = _emailLogApi();
      if (emailLogModule && emailLogModule.logSend) {
        emailLogModule.logSend({ to, toName, fromName, subject, html }, result);
      }
    } catch {}

    return result;
  } catch (err) {
    console.error('[Email] Erreur réseau:', err.message);
    const result = {
      ok: false,
      message: `Impossible de joindre la fonction d'envoi (${err.message || err}). Vérifiez que le site est déployé sur Vercel ou que VITE_EMAIL_API_URL est correcte.`,
    };

    try {
      const emailLogModule = _emailLogApi();
      if (emailLogModule && emailLogModule.logSend) {
        emailLogModule.logSend({ to, toName, fromName, subject, html }, result);
      }
    } catch {}

    return result;
  }
};


// ---------------------------------------------------------------------------
// Petits utilitaires de template
// ---------------------------------------------------------------------------

// Échappe les caractères HTML d'une valeur saisie par l'utilisateur.
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

// Remplace une URL d'image par un fallback fiable uniquement quand l'image est absente.
// Si l'image existe (même non publique), on la conserve dans l'email.
// Le fallback n'est utilisé que si l'image est manquante.
const fallbackIfEmpty = (url, fallbackUrl) => {
  if (!url) return fallbackUrl || DEFAULT_SITE_LOGO;
  return url;
};

export const safeImageUrl = (url, fallbackUrl) => {
  if (!fallbackUrl) {
    // Garde un fallback constant par défaut pour ne pas dépendre des appelsants.
    fallbackUrl = DEFAULT_SITE_LOGO;
  }
  // Substitution éventuelle par l'URL publique du catalogue (ImgBB) : les
  // chemins locaux « /src/assets/… » ne sont pas chargeables par Gmail.
  const mapped = toPublicProductImageUrl(url);
  const normalized = fallbackIfEmpty(mapped, fallbackUrl);
  if (!normalized) return fallbackUrl;
  // Chemins dev-only (« /src/assets/… » issus de import.meta.glob en
  // développement) : ces fichiers n'existent PAS sur le site déployé (le
  // build les renomme avec un hash sous /assets/). Une telle URL serait
  // morte dans l'email → on utilise le fallback (logo du site).
  if (/^\/src\//i.test(normalized)) return fallbackUrl;
  const absolute = toAbsoluteUrl(normalized);
  if (!absolute) return fallbackUrl;
  if (/^(https?:)?\/\//i.test(absolute)) return absolute;
  return fallbackUrl;
};

// Mise en page commune : bandeau (logo + nom + contacts), contenu, pied de page.
const emailLayout = ({ siteName, preheader, contentHtml, siteLogoFallback }) => {
  // Logo du site : on utilise un fallback constant si le paramètre est vide ou non public.
  const siteLogo = safeImageUrl(getSiteLogo(), siteLogoFallback || DEFAULT_SITE_LOGO);

  // Contacts du site (téléphone, email, adresse) — Paramètres → Coordonnées.
  const contacts = getSiteContacts();
  // Lignes de contact affichées sous le nom du site (seulement si renseignées).
  const contactLines = [
    contacts.phone && `Téléphone : ${escapeHtml(contacts.phone)}`,
    contacts.email && `Email : ${escapeHtml(contacts.email)}`,
    contacts.address && `Adresse : ${escapeHtml(contacts.address)}`,
  ].filter(Boolean);
  const contactsHtml = contactLines.length
    ? `<p style="margin:6px 0 0;color:#cbd5e1;font-size:11px;line-height:1.7;letter-spacing:0.2px;">${contactLines.join("<br/>")}</p>`
    : "";
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <!-- Bandeau : logo + nom + contacts -->
          <tr>            <td style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:22px 24px;text-align:center;">
              ${siteLogo
                ? `<img src="${escapeHtml(siteLogo)}" alt="${escapeHtml(siteName)}" width="72" height="72" style="width:72px;height:72px;border-radius:50%;object-fit:cover;display:block;max-width:72px;max-height:72px;background-color:#ffffff;padding:3px;box-sizing:border-box;border:2px solid rgba(255,255,255,0.25);" />`
                : `<div style="width:72px;height:72px;border-radius:50%;background-color:#ffffff;padding:3px;margin:0 auto;"><div style="width:100%;height:100%;border-radius:50%;background-color:#0f172a;border:2px solid rgba(255,255,255,0.25);"></div></div>`}
              <div style="display:inline-block;vertical-align:middle;text-align:left;">
                <h1 style="margin:0;color:#ffffff;font-size:20px;letter-spacing:0.5px;">${escapeHtml(siteName)}</h1>
                ${contactsHtml}
              </div>
            </td>
          </tr>
          <!-- Contenu -->
          <tr>
            <td style="padding:28px 24px;">
              ${contentHtml}
            </td>
          </tr>
          <!-- Pied de page -->
          <tr>
            <td style="padding:16px 24px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#64748b;font-size:12px;">
                ${escapeHtml(siteName)} — Merci de votre confiance.<br />
                Cet email vous a été envoyé automatiquement.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

// Encadré coloré réutilisable.
const infoBox = ({ bg = "#f0f9ff", border = "#bae6fd", color = "#0369a1", html }) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${bg};border:1px solid ${border};border-radius:8px;margin:12px 0;">
  <tr><td style="padding:12px 16px;font-size:14px;color:${color};line-height:1.6;">${html}</td></tr>
</table>
`;

// ---------------------------------------------------------------------------
// Templates : confirmation d'abonnement newsletter
// ---------------------------------------------------------------------------
export const buildNewsletterConfirmationEmail = ({ siteName, email }) => {
  const contentHtml = `
    <p style="margin:0 0 14px;color:#334155;font-size:15px;">Bonjour,</p>
    <p style="margin:0 0 14px;color:#475569;font-size:14px;line-height:1.6;">       Votre inscription à la newsletter de <strong>${escapeHtml(siteName)}</strong> est confirmée.

    </p>
    ${infoBox({
      bg: "#f0fdf4",
      border: "#bbf7d0",
      color: "#15803d",
      html: `Adresse enregistrée : <strong>${escapeHtml(email)}</strong>`,
    })}
    <p style="margin:0 0 14px;color:#475569;font-size:14px;line-height:1.6;">
      Vous recevrez désormais nos nouveaux arrivages, promotions et offres
      exclusives directement dans votre boîte mail.
    </p>
    <p style="margin:0;color:#64748b;font-size:13px;">
      Vous pouvez vous désabonner à tout moment en nous contactant.
    </p>
  `;
  return emailLayout({
    siteName,
    preheader: "Votre abonnement est confirmé",
    contentHtml,
  });
};

// ---------------------------------------------------------------------------
// Template : nouveau produit (arrivages) — envoyé à tous les abonnés
// ---------------------------------------------------------------------------
export const buildNewArrivalEmail = ({
  siteName,
  product,
  productUrl,
  productImageFallback,
}) => {
  const title = escapeHtml(product.title || "Nouveau produit");
  const price = escapeHtml(product.prix || "");
  const category = escapeHtml(product.category || "");
  const image = safeImageUrl(getProductImageUrl(product), productImageFallback || DEFAULT_PRODUCT_IMAGE);
  const url = productUrl || "#";

  const contentHtml = `
    <p style="margin:0 0 14px;color:#334155;font-size:15px;">Découvrez notre nouveau produit !</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:14px 0;">
      <tr>
        <td align="center" style="padding:0;background-color:#f8fafc;">
          ${image ? `<img src="${escapeHtml(image)}" alt="${title}" width="300" style="width:100%;max-width:300px;height:auto;display:block;margin:0 auto;" />` : ""}
        </td>
      </tr>
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 4px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">${category}</p>
          <h2 style="margin:0 0 8px;color:#0f172a;font-size:18px;">${title}</h2>
          <p style="margin:0 0 12px;color:#16a34a;font-size:20px;font-weight:bold;">${price}</p>
          <a href="${escapeHtml(url)}" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#15803d);color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:10px 22px;border-radius:8px;">Voir le produit</a>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#64748b;font-size:13px;">
      Merci d'être abonné(e) à <strong>${escapeHtml(siteName)}</strong>.
    </p>
  `;
  return emailLayout({
    siteName,      preheader: `Nouveau produit : ${title}`,
    contentHtml,
  });
};

// Icônes légères utilisées dans les blocs d'information des emails
const EmailInfoIcon = (label) => {
  return `<span style="color:#64748b;font-size:13px;">${escapeHtml(label)}</span>`;
};

// ---------------------------------------------------------------------------
// Template : confirmation de commande (au client)
// ---------------------------------------------------------------------------
export const buildOrderConfirmationEmail = ({
  siteName,
  customerName,
  orderRef,
  orderDate,
  itemsHtml,
  totalLabel,
  address,
}) => {
  // URL absolue vers la page de suivi de commande.
  // Les emails ne peuvent pas résoudre des chemins relatifs : on construit
  // l'URL complète à partir de l'origine du site (déployé sur Vercel).
  // Le lien est généré dynamiquement avec l'origine publique + /track-order?ref=<référence>.
  const trackUrl = `${toAbsoluteUrl('/track-order')}?ref=${encodeURIComponent(orderRef || '')}`;

  const contentHtml = `
    <p style="margin:0 0 14px;color:#334155;font-size:15px;">
      Bonjour ${escapeHtml(customerName || "cher client")}, merci pour votre commande !
    </p>
    ${infoBox({
      html: `Commande : <strong>${escapeHtml(orderRef || "")}</strong><br/>Passée le : ${escapeHtml(orderDate || "")}`,
    })}
    <p style="margin:0 0 8px;color:#0f172a;font-size:14px;font-weight:bold;">Récapitulatif :</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:8px 0 14px;">
      ${itemsHtml}
      <tr>
        <td style="padding:12px 16px;background-color:#f8fafc;border-top:2px solid #e2e8f0;font-size:15px;font-weight:bold;color:#0f172a;">Total</td>
        <td style="padding:12px 16px;background-color:#f8fafc;border-top:2px solid #e2e8f0;font-size:15px;font-weight:bold;color:#16a34a;text-align:right;">${escapeHtml(totalLabel)}</td>
      </tr>
    </table>
    ${address ? infoBox({ bg: "#fefce8", border: "#fde68a", color: "#854d0e", html: `Livraison : <strong>${escapeHtml(address)}</strong>` }) : ""}
    <p style="margin:0 0 14px;color:#475569;font-size:14px;line-height:1.6;">
      Notre équipe prépare votre commande et vous contactera très vite pour la livraison.
    </p>
    <p style="margin:0 0 14px;color:#64748b;font-size:13px;">Paiement à la livraison — Mobile Money.</p>
    <!-- Bouton "Suivre ma commande" : lien direct vers la page de suivi avec la référence -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(trackUrl)}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#15803d);color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 28px;border-radius:8px;">Suivre ma commande</a>
        </td>
      </tr>
    </table>
  `;
  return emailLayout({
    siteName,
    preheader: `Commande ${orderRef || ""} confirmée`,
    contentHtml,
  });
};

// Lignes d'articles d'une commande (format HTML), réutilisées par les templates.
// Pour afficher l'image produit dans les emails de commande, il faut que
// order.items[].image (ou .productImage) soit un URL public ; sinon, un
// fallback générique est utilisé.
export const buildOrderItemsHtml = (items) =>
  (items || [])
    .map(
      (item) => {
        const image = safeImageUrl(item.image || item.productImage || item.img || "", DEFAULT_PRODUCT_IMAGE);
        const priceLabel = item.priceLabel || item.price || "";
        const quantity = item.quantity || 1;
        const name = item.name || "";
        return `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;width:80px;">
          ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;display:block;" />` : ""}
        </td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;">
          ${escapeHtml(name)} <span style="color:#94a3b8;">× ${quantity}</span>
        </td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;text-align:right;">
          ${escapeHtml(priceLabel)}
        </td>
      </tr>`;
      },
    )
    .join("");

// ---------------------------------------------------------------------------
// Template : expédition de commande (au livreur / préparateur)
// ---------------------------------------------------------------------------

export const buildShippingAssignmentEmail = ({
  siteName,
  toName,
  order,
  itemsHtml,
  totalLabel,
}) => {
  const ref = order.reference || `CMD-${order.id}`;
  const customer = order.customer || {};
  const contentHtml = `
    <p style="margin:0 0 14px;color:#334155;font-size:15px;">
      Bonjour <strong>${escapeHtml(toName || "collègue")}</strong>,
    </p>
    <p style="margin:0 0 14px;color:#475569;font-size:14px;line-height:1.6;">
      Une commande vient de vous être assignée pour la <strong>préparation / l'expédition</strong>. Voici tous les détails :
    </p>
    ${infoBox({ html: `Commande : <strong>${escapeHtml(ref)}</strong>` })}
    <p style="margin:0 0 8px;color:#0f172a;font-size:14px;font-weight:bold;">Articles :</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:8px 0 14px;">
      ${itemsHtml}
      <tr>
        <td style="padding:10px 16px;background-color:#f8fafc;border-top:2px solid #e2e8f0;font-size:14px;font-weight:bold;color:#0f172a;">Total</td>
        <td style="padding:10px 16px;background-color:#f8fafc;border-top:2px solid #e2e8f0;font-size:14px;font-weight:bold;color:#16a34a;text-align:right;">${escapeHtml(totalLabel)}</td>
      </tr>
    </table>
    ${infoBox({
      html: `Client : <strong>${escapeHtml(customer.name || "")}</strong><br/>
            Téléphone : <strong>${escapeHtml(customer.phone || "")}</strong><br/>
            Adresse de livraison : <strong>${escapeHtml(customer.address || "")}</strong>`,
    })}
    <p style="margin:0;color:#64748b;font-size:13px;">
      Merci de traiter cette commande dans les meilleurs délais.
    </p>
  `;
  return emailLayout({
    siteName,
    preheader: `Commande ${ref} assignée`,
    contentHtml,
  });
};

// ---------------------------------------------------------------------------
// Template : alerte admin (nouvelle commande, tests)
// ---------------------------------------------------------------------------
// Ce template est conçu pour être utilisé aussi bien par les notifications
// navigateur qu'par les emails envoyés depuis la fonction Vercel → Resend.
// Il affiche les images produits comme l'email de confirmation client.
export const buildAdminAlertEmail = ({
  siteName,
  subject,
  message,
  items = [],
}) => {
  const itemsHtml = buildOrderItemsHtml(items);

  const contentHtml = `
    <p style="margin:0 0 14px;color:#334155;font-size:15px;">
      <strong>${escapeHtml(subject || "Alerte")}</strong>
    </p>
    ${infoBox({ bg: "#fffbeb", border: "#fde68a", color: "#92400e", html: escapeHtml(message || "").replace(/\n/g, "<br/>") })}
    ${itemsHtml ? (
      `<p style="margin:0 0 8px;color:#0f172a;font-size:14px;font-weight:bold;">Articles commandés :</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:8px 0 14px;">
         ${itemsHtml}
       </table>`
    ) : ''}
    <p style="margin:0;color:#64748b;font-size:13px;">
      Connectez-vous à l'administration pour traiter cet événement.
    </p>
  `;
  return emailLayout({
    siteName,
    preheader: subject || "Alerte",
    contentHtml,
  });
};

// ---------------------------------------------------------------------------
// Template : code de vérification 2FA
// ---------------------------------------------------------------------------
export const buildTwoFactorEmail = ({ siteName, code, adminEmail }) => {
  const contentHtml = `
    <p style="margin:0 0 14px;color:#334155;font-size:15px;">
      Votre code de connexion à l'administration de <strong>${escapeHtml(siteName)}</strong> :
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:2px dashed #94a3b8;border-radius:12px;margin:14px 0;">
      <tr>
        <td align="center" style="padding:20px;">
          <span style="font-size:34px;font-weight:bold;letter-spacing:10px;color:#0f172a;font-family:Consolas,Monaco,monospace;">${escapeHtml(code)}</span>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 14px;color:#475569;font-size:14px;line-height:1.6;">
      Ce code est valable <strong>5 minutes</strong>. Si vous n'êtes pas à l'origine
      de cette connexion, ignorez cet email et changez votre mot de passe.
    </p>
    <p style="margin:0;color:#64748b;font-size:13px;">
      Compte concerné : ${escapeHtml(adminEmail || "")}
    </p>
  `;
  return emailLayout({
    siteName,
    preheader: "Votre code de vérification",
    contentHtml,
  });
};

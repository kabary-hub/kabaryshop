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

// Email de l'administrateur (réception des alertes).
export const getAdminEmail = () => {
  try {
    const s = JSON.parse(localStorage.getItem("kabary_settings") || "{}");
    return s.adminEmail || s.siteEmail || "admin@kabary.com";
  } catch {
    return "admin@kabary.com";
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
    return { ok: false, message: "Destinataire, sujet ou contenu manquant." };
  }
  try {
    const response = await fetch(getApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getSendKey() ? { "x-send-key": getSendKey() } : {}),
      },
      body: JSON.stringify({ to, toName, fromName, subject, html }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        message:
          data.message ||
          `La fonction d'envoi a répondu (${response.status}). Vérifiez la configuration Resend/Vercel.`,
      };
    }
    return { ok: true, message: data.message || "Email envoyé", id: data.id };
  } catch (err) {
    return {
      ok: false,
      message: `Impossible de joindre la fonction d'envoi (${err.message || err}). Vérifiez que le site est déployé sur Vercel ou que VITE_EMAIL_API_URL est correcte.`,
    };
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

// Mise en page commune : bandeau, contenu, pied de page.
const emailLayout = ({ siteName, preheader, contentHtml }) => `
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
          <!-- Bandeau -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:22px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;letter-spacing:0.5px;">${escapeHtml(siteName)}</h1>
              <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Boutique en ligne — Livraison 24h/48h</p>
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
    <p style="margin:0 0 14px;color:#475569;font-size:14px;line-height:1.6;">
      Votre inscription à la newsletter de <strong>${escapeHtml(siteName)}</strong> est confirmée ✅
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
}) => {
  const title = escapeHtml(product.title || "Nouveau produit");
  const price = escapeHtml(product.prix || "");
  const category = escapeHtml(product.category || "");
  const image = product.img || "";
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
    siteName,
    preheader: `Nouveau produit : ${title}`,
    contentHtml,
  });
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
  const contentHtml = `
    <p style="margin:0 0 14px;color:#334155;font-size:15px;">
      Bonjour ${escapeHtml(customerName || "cher client")}, merci pour votre commande ! 🎉
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
    ${address ? infoBox({ bg: "#fefce8", border: "#fde68a", color: "#854d0e", html: `📍 Livraison : <strong>${escapeHtml(address)}</strong>` }) : ""}
    <p style="margin:0 0 14px;color:#475569;font-size:14px;line-height:1.6;">
      Notre équipe prépare votre commande et vous contactera très vite pour la livraison.
    </p>
    <p style="margin:0;color:#64748b;font-size:13px;">Paiement à la livraison — Mobile Money.</p>
  `;
  return emailLayout({
    siteName,
    preheader: `Commande ${orderRef || ""} confirmée`,
    contentHtml,
  });
};

// Lignes d'articles d'une commande (format HTML), réutilisées par les templates.
export const buildOrderItemsHtml = (items) =>
  (items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;">
          ${escapeHtml(item.name || "")} <span style="color:#94a3b8;">× ${escapeHtml(item.quantity || 1)}</span>
        </td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;text-align:right;">
          ${escapeHtml(item.priceLabel || "")}
        </td>
      </tr>`,
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
    ${infoBox({ html: `📦 Commande : <strong>${escapeHtml(ref)}</strong>` })}
    <p style="margin:0 0 8px;color:#0f172a;font-size:14px;font-weight:bold;">Articles :</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:8px 0 14px;">
      ${itemsHtml}
      <tr>
        <td style="padding:10px 16px;background-color:#f8fafc;border-top:2px solid #e2e8f0;font-size:14px;font-weight:bold;color:#0f172a;">Total</td>
        <td style="padding:10px 16px;background-color:#f8fafc;border-top:2px solid #e2e8f0;font-size:14px;font-weight:bold;color:#16a34a;text-align:right;">${escapeHtml(totalLabel)}</td>
      </tr>
    </table>
    ${infoBox({
      html: `👤 Client : <strong>${escapeHtml(customer.name || "")}</strong><br/>
            📞 Téléphone : <strong>${escapeHtml(customer.phone || "")}</strong><br/>
            📍 Adresse de livraison : <strong>${escapeHtml(customer.address || "")}</strong>`,
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
export const buildAdminAlertEmail = ({ siteName, subject, message }) => {
  const contentHtml = `
    <p style="margin:0 0 14px;color:#334155;font-size:15px;">
      <strong>${escapeHtml(subject || "Alerte")}</strong>
    </p>
    ${infoBox({ bg: "#fffbeb", border: "#fde68a", color: "#92400e", html: escapeHtml(message || "").replace(/\n/g, "<br/>") })}
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

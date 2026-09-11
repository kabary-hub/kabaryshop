// src/utils/exportUtils.js
// Exports admin (commandes, produits, utilisateurs, emails) sans nouvelle dépendance npm.
//
// Exportables :
//   - exportOrdersCSV(orders, options?)       → téléchargement CSV
//   - exportProductsCSV(products, options?)   → téléchargement CSV
//   - exportUsersCSV(users, options?)         → téléchargement CSV
//   - exportEmailsCSV(logs, options?)         → téléchargement CSV (journal emails)
//   - exportOrdersExcel(orders, options?)     → téléchargement CSV compatible Excel
//   - exportProductsExcel(products, options?) → CSV compatible Excel
//   - exportOrdersPDF(orders, options?)       → génération PDF côté client (nouvelle fenêtre)
//
// Pour les PDF plus élaborés (avec autotable, en-têtes imprimés, pagination),
// il est recommandé d'installer jsPDF + jsPDF-autotable et de remplacer cette
// implémentation. Pour l'instant, on génère un document PDF propre via un
// blob HTML imprimable.

import { EMAIL_TYPES } from '../services/emailLogService.js';

const MIME_CSV = 'text/csv;charset=utf-8;';
export const BOM = '\uFEFF';

// Excel n'ouvre pas un fichier CSV compatitable comme un vrai .xlsx.
// On réserve le MIME xlsx uniquement aux vrais fichiers Office Open XML.
// Pour les exports CSV compatibles Excel, on utilise text/csv avec BOM.
const MIME_XLSX = 'text/csv;charset=utf-8;';

// ---------------------------------------------------------------------
// Helpers blob / téléchargement
// ---------------------------------------------------------------------

/**
 * Télécharge un fichier depuis un blob.
 * @param {string} content - contenu du fichier (déjà encodé si besoin)
 * @param {string} filename - nom du fichier
 * @param {string} mimeType - type MIME (text/csv, application/vnd...)
 * @param {boolean} withBom - ajoute le BOM UTF-8 pour Excel FR
 */
export const downloadBlob = (content, filename, mimeType, withBom = false) => {
  const blob = new Blob([withBom ? BOM + content : content], {
    type: mimeType,
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ---------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------

const SEP = ';';

// Échappe une valeur pour qu'elle soit safe dans un champ CSV.
// Les champs sont entourés de guillemets pour éviter les problèmes
// avec les virgules, point-virgules, sauts de ligne ou guillemets internes.
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
};

const CSV_HEADER = (headers) => headers.map(escapeCSV).join(SEP) + '\n';
const CSV_ROW = (values) => values.map(escapeCSV).join(SEP) + '\n';

export const exportCSV = (headers, rows, filename, mimeType = MIME_CSV) => {
  const lines = [CSV_HEADER(headers)];
  rows.forEach((row) => lines.push(CSV_ROW(row)));
  // CSV brut : toujours avec BOM pour que Excel FR l'ouvre sans mojibake.
  downloadBlob(lines.join(''), filename, mimeType, true);
};

// ---------------------------------------------------------------------
// Commandes
// ---------------------------------------------------------------------

const ORDER_HEADERS = [
  'Référence',
  'Date',
  'Client',
  'Téléphone',
  'Email',
  'Adresse',
  'Mode de paiement',
  'Statut',
  'Total (GNF)',
  'Articles',
  'Quantité totale',
  'Expéditeur',
  'Date d\u00e9p\u00e9dition',
  'Annulation',
];

const orderRows = (orders) =>
  orders.map((order) => {
    const items = (order.items || [])
      .map((item) => `${item.name || item.title || 'Produit'} x${item.quantity || 1}`)
      .join('; ');
    const qty = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
    return [
      order.reference || `CMD-${order.id}`,
      order.date || order.created_at || '',
      order.customer?.name || '',
      order.customer?.phone || '',
      order.customer?.email || '',
      order.customer?.address || '',
      order.payment_method || 'Mobile Money',
      order.status || '',
      order.total || 0,
      items,
      qty,
      order.shipping?.by || '',
      order.shipping?.date || '',
      order.cancelled_at || order.cancelledAt || '',
    ];
  });

export const exportOrdersCSV = (orders, options = {}) => {
  const filename =
    options.filename || `commandes_${new Date().toISOString().slice(0, 10)}.csv`;
  const lines = [CSV_HEADER(ORDER_HEADERS)];
  orderRows(orders).forEach((row) => lines.push(CSV_ROW(row)));
  downloadBlob(lines.join(''), filename, MIME_CSV, true);
};

export const exportOrdersExcel = (orders, options = {}) => {
  const filename =
    options.filename || `commandes_${new Date().toISOString().slice(0, 10)}.csv`;
  const lines = [CSV_HEADER(ORDER_HEADERS)];
  orderRows(orders).forEach((row) => lines.push(CSV_ROW(row)));
  downloadBlob(lines.join(''), filename, MIME_CSV, true);
};

// ---------------------------------------------------------------------
// Produits
// ---------------------------------------------------------------------

const PRODUCT_HEADERS = [
  'ID',
  'Titre',
  'Catégorie',
  'Prix (GNF)',
  'Prix affiché',
  'Couleur',
  'Note',
  'Image principale',
  'Images',
  'Personnalisé',
  'Date de création',
];

const productRows = (products) =>
  products.map((product) => {
    const images = Array.isArray(product.images)
      ? product.images.join('; ')
      : product.img
        ? product.img
        : '';
    return [
      product.id || '',
      product.title || product.name || '',
      product.category || product.categorySlug || '',
      product.priceInGNF || 0,
      product.prix || '',
      product.color || '',
      product.rating || product.rating || 0,
      product.img || '',
      images,
      product.isCustom ? 'Oui' : 'Non',
      product.createdAt || '',
    ];
  });

export const exportProductsCSV = (products, options = {}) => {
  const filename =
    options.filename || `produits_${new Date().toISOString().slice(0, 10)}.csv`;
  const lines = [CSV_HEADER(PRODUCT_HEADERS)];
  productRows(products).forEach((row) => lines.push(CSV_ROW(row)));
  downloadBlob(lines.join(''), filename, MIME_CSV, true);
};

export const exportProductsExcel = (products, options = {}) => {
  const filename =
    options.filename || `produits_${new Date().toISOString().slice(0, 10)}.csv`;
  const lines = [CSV_HEADER(PRODUCT_HEADERS)];
  productRows(products).forEach((row) => lines.push(CSV_ROW(row)));
  downloadBlob(lines.join(''), filename, MIME_CSV, true);
};

// ---------------------------------------------------------------------
// Utilisateurs
// ---------------------------------------------------------------------

const USER_HEADERS = [
  'ID',
  'Nom',
  'Email',
  'Rôle',
  'Statut',
  'Avatar',
  'Date de création',
];

const userRows = (users) =>
  users.map((user) => [
    user.id ?? '',
    user.name || '',
    user.email || '',
    user.role || '',
    user.status || 'active',
    user.avatar || '',
    user.createdAt || '',
  ]);

export const exportUsersCSV = (users, options = {}) => {
  const filename =
    options.filename || `utilisateurs_${new Date().toISOString().slice(0, 10)}.csv`;
  const lines = [CSV_HEADER(USER_HEADERS)];
  userRows(users).forEach((row) => lines.push(CSV_ROW(row)));
  downloadBlob(lines.join(''), filename, MIME_CSV, true);
};

export const exportUsersExcel = (users, options = {}) => {
  const filename =
    options.filename || `utilisateurs_${new Date().toISOString().slice(0, 10)}.csv`;
  const lines = [CSV_HEADER(USER_HEADERS)];
  userRows(users).forEach((row) => lines.push(CSV_ROW(row)));
  downloadBlob(lines.join(''), filename, MIME_CSV, true);
};

// ---------------------------------------------------------------------
// Emails (journal d'envoi)
// ---------------------------------------------------------------------

const EMAIL_HEADERS = [
  'ID',
  'Type',
  'Destinataire',
  'Nom destinataire',
  'Expéditeur (fromName)',
  'Sujet',
  'Statut',
  'Message',
  'Référence',
  'Date d\u00e9p\u00e9dition',
];

export const exportEmailsCSV = (logs, options = {}) => {
  const filename =
    options.filename || `emails_${new Date().toISOString().slice(0, 10)}.csv`;
  const rows = (logs || []).map((entry) => [
    entry.id || '',
    EMAIL_TYPES[entry.type] || entry.type || '',
    entry.to || '',
    entry.toName || '',
    entry.fromName || '',
    entry.subject || '',
    entry.ok ? 'Envoyé' : 'Échec',
    entry.message || '',
    entry.reference || '',
    entry.sentAt || '',
  ]);
  const lines = [CSV_HEADER(EMAIL_HEADERS)];
  rows.forEach((row) => lines.push(CSV_ROW(row)));
  downloadBlob(lines.join(''), filename, MIME_CSV, true);
};

export const exportEmailsExcel = (logs, options = {}) => {
  const filename =
    options.filename || `emails_${new Date().toISOString().slice(0, 10)}.csv`;
  const rows = (logs || []).map((entry) => [
    entry.id || '',
    EMAIL_TYPES[entry.type] || entry.type || '',
    entry.to || '',
    entry.toName || '',
    entry.fromName || '',
    entry.subject || '',
    entry.ok ? 'Envoyé' : 'Échec',
    entry.message || '',
    entry.reference || '',
    entry.sentAt || '',
  ]);
  const lines = [CSV_HEADER(EMAIL_HEADERS)];
  rows.forEach((row) => lines.push(CSV_ROW(row)));
  downloadBlob(lines.join(''), filename, MIME_CSV, true);
};

// ---------------------------------------------------------------------
// PDF client (commandes) — génération via impression HTML
// ---------------------------------------------------------------------

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const currencyLabel = (total) => `${Number(total || 0).toLocaleString('fr-FR')} GNF`;

const orderLinesHTML = (orders) =>
  orders
    .map(
      (order) => `
        <tr class="row">
          <td class="cell label">Référence</td>
          <td class="cell value">${escapeHTML(order.reference || `CMD-${order.id}`)}</td>
          <td class="cell label">Date</td>
          <td class="cell value">${formatDate(order.date)}</td>
        </tr>
        <tr class="row">
          <td class="cell label">Client</td>
          <td class="cell value" colspan="3">${escapeHTML(order.customer?.name || '—')}</td>
        </tr>
        ${
          order.customer?.phone
            ? `<tr class="row"><td class="cell label">Téléphone</td><td class="cell value" colspan="3">${escapeHTML(order.customer.phone)}</td></tr>`
            : ''
        }
        ${
          order.customer?.email
            ? `<tr class="row"><td class="cell label">Email</td><td class="cell value" colspan="3">${escapeHTML(order.customer.email)}</td></tr>`
            : ''
        }
        ${
          order.customer?.address
            ? `<tr class="row"><td class="cell label">Adresse</td><td class="cell value" colspan="3">${escapeHTML(order.customer.address)}</td></tr>`
            : ''
        }
        <tr class="row">
          <td class="cell label">Paiement</td>
          <td class="cell value">${escapeHTML(order.payment_method || 'Mobile Money')}</td>
          <td class="cell label">Statut</td>
          <td class="cell value">${escapeHTML(order.status || '')}</td>
        </tr>
        <tr class="row">
          <td class="cell label">Total</td>
          <td class="cell value" colspan="3">${currencyLabel(order.total)}</td>
        </tr>
        ${
          order.shipping
            ? `
        <tr class="row">
          <td class="cell label">Expédié par</td>
          <td class="cell value">${escapeHTML(order.shipping.by || '')}</td>
          <td class="cell label">Date d'expédition</td>
          <td class="cell value">${formatDate(order.shipping.date)}</td>
        </tr>
        `
            : ''
        }
        ${
          (order.cancelled_at || order.cancelledAt)
            ? `<tr class="row"><td class="cell label">Annulation</td><td class="cell value" colspan="3">${formatDate(order.cancelled_at || order.cancelledAt)}</td></tr>`
            : ''
        }
      `,
    )
    .join('\n');

const itemsTableHTML = (order) => {
  if (!order.items?.length) return '<p class="empty">Aucun article</p>';
  const rows = order.items
    .map(
      (item) => `
        <tr class="item-row">
          <td class="item-name">${escapeHTML(item.name || item.title || 'Produit')}</td>
          <td class="item-qty">${item.quantity || 1}</td>
          <td class="item-price">${currencyLabel((item.price || 0) * (item.quantity || 1))}</td>
        </tr>
      `,
    )
    .join('');
  return `
    <table class="items">
      <thead>
        <tr>
          <th>Article</th>
          <th>Qté</th>
          <th>Prix</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const escapeHTML = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const orderPDFHTML = (orders) => {
  const title = 'Export des commandes — Kabary Shop';
  const generatedAt = new Date().toLocaleString('fr-FR');
  const body = orders.map((order) => `
    <section class="order">
      <header>
        <h2>Commande ${escapeHTML(order.reference || `CMD-${order.id}`)}</h2>
        <span class="meta">Date : ${formatDate(order.date)}</span>
      </header>
      ${orderLinesHTML([order])}
      <div class="items-section">
        <h3>Articles commandés</h3>
        ${itemsTableHTML(order)}
      </div>
    </section>
  `).join('\n');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHTML(title)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #1f2937;
      margin: 0;
      padding: 24px;
      background: #ffffff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #16a34a;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
    }
    .header .meta {
      color: #6b7280;
      font-size: 12px;
    }
    .order {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .order header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .order h2 {
      margin: 0;
      font-size: 16px;
    }
    .order .meta {
      color: #6b7280;
      font-size: 12px;
    }
    .row {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 8px 16px;
      margin-bottom: 6px;
    }
    .cell.label {
      color: #6b7280;
      font-size: 13px;
    }
    .cell.value {
      font-weight: 600;
      font-size: 13px;
    }
    .items-section h3 {
      margin: 12px 0 8px;
      font-size: 13px;
      color: #374151;
    }
    table.items {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    table.items th {
      text-align: left;
      border-bottom: 1px solid #d1d5db;
      padding: 6px 8px;
      background: #f9fafb;
    }
    table.items td {
      padding: 6px 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    .item-price {
      text-align: right;
    }
    .empty {
      color: #9ca3af;
      font-style: italic;
    }
    @media print {
      body { padding: 12px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHTML(title)}</h1>
    <span class="meta">Généré le ${escapeHTML(generatedAt)}</span>
  </div>
  ${body}
</body>
</html>
`;
};

export const exportOrdersPDF = (orders, options = {}) => {
  if (!orders.length) {
    throw new Error('Aucune commande à exporter.');
  }

  const _filename =
    options.filename || `commandes_${new Date().toISOString().slice(0, 10)}.pdf`;

  const html = orderPDFHTML(orders);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'width=900,height=700');

  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error('Impossible d\'ouvrir le document PDF. Vérifiez le blocage des fenêtres pop-up.');
  }

  // Laisser le chargement du blob + déclencher l'impression automatique.
  // L'utilisateur peut ensuite sauvegarder le document en PDF depuis le navigateur.
  win.onload = () => {
    setTimeout(() => {
      win.print();
    }, 300);
  };

  // Nettoyage différé du blob (la fenêtre doit avoir chargé le document).
  setTimeout(() => {
    try {
      if (win.closed) {
        URL.revokeObjectURL(url);
      }
    } catch {
      URL.revokeObjectURL(url);
    }
  }, 5000);
};

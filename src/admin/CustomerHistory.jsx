// src/admin/CustomerHistory.jsx
// ============================================================
// Fiche client : regroupe TOUTES les commandes passées par un même numéro
// de téléphone (quel que soit le format saisi : +224, espaces, 0 initial…).
//
// Fonctionnalités :
//   • total dépensé, nombre de commandes, répartition par statut ;
//   • liste complète des achats (référence, date, statut, montant) ;
//   • impression de la fiche (window.print, zone d'impression dédiée) ;
//   • export CSV (ouvrable dans Excel) ;
//   • envoi du récapitulatif au client par WhatsApp.
// ============================================================

import React from "react";
import {
  X,
  Printer,
  FileDown,
  MessageCircle,
  Phone,
  User,
  MapPin,
  Mail,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Archive,
} from "lucide-react";
import { normalizePhone, formatPhone, toWhatsAppNumber } from "../utils/phone";
import { getSiteName, getSiteLogo, getSiteContacts } from "../utils/emailService";

// État lisible d'un statut de commande (cohérent avec Orders.jsx)
const STATUS_META = {
  pending: { label: "En attente", icon: <Clock size={13} />, color: "bg-yellow-100 text-yellow-800" },
  shipped: { label: "Expédiée", icon: <Truck size={13} />, color: "bg-blue-100 text-blue-800" },
  completed: { label: "Complétée", icon: <CheckCircle size={13} />, color: "bg-green-100 text-green-800" },
  cancelled: { label: "Annulée", icon: <XCircle size={13} />, color: "bg-red-100 text-red-800" },
};

const statusLabel = (status) => STATUS_META[status]?.label || "En attente";

// Échappement HTML complet (nom, email, adresse injectés dans le document
// imprimé ou les exports — même logique que les templates d'email).
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ---- Export CSV (avec BOM UTF-8 pour Excel) ----
const exportCsv = (customer, orders) => {
  const rows = [
    ["Référence", "Date", "Statut", "Montant (GNF)", "Articles"],
    ...orders.map((o) => [
      o.reference || `CMD-${o.id}`,
      formatDate(o.date),
      statusLabel(o.status),
      String((o.total || 0).toLocaleString("fr-FR")),
      (o.items || []).map((it) => `${it.name} x${it.quantity}`).join(" | "),
    ]),
  ];
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `historique-${normalizePhone(customer.phone) || "client"}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ---- Message WhatsApp (récap envoyé au client) ----
const buildWhatsAppMessage = (customer, orders, total, siteName) => {
  const lines = [
    `Bonjour ${customer.name || "cher client"} 👋`,
    `Voici le récapitulatif de vos achats chez ${siteName} :`,
    "",
    ...orders.map(
      (o) =>
        `• ${o.reference || `CMD-${o.id}`} — ${formatDate(o.date)} — ${statusLabel(o.status)} — ${(o.total || 0).toLocaleString("fr-FR")} GNF`,
    ),
    "",
    `Total : ${orders.length} commande(s) pour ${total.toLocaleString("fr-FR")} GNF.`,
    "Merci de votre confiance ! 😊",
  ];
  return lines.join("\n");
};

const sendWhatsApp = (customer, orders, total, siteName) => {
  // Format INTERNATIONAL obligatoire pour wa.me (indicatif pays inclus) :
  // « 620980117 » serait lu comme un numéro indonésien (62).
  const phone = toWhatsAppNumber(customer.phone);
  if (!phone) return;
  const text = encodeURIComponent(buildWhatsAppMessage(customer, orders, total, siteName));
  window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
};

const CustomerHistory = ({ customer, orders = [], archivedOrders = [], onClose }) => {
  // Toutes les commandes du client : même numéro normalisé.
  // Les commandes archivées (complétées au-delà du plafond de 1000) sont
  // incluses : on retrace bien TOUT l'historique d'achat du client.
  const phone = normalizePhone(customer?.phone);
  const active = phone
    ? orders.filter((o) => normalizePhone(o?.customer?.phone) === phone)
    : [];
  const archived = phone
    ? archivedOrders.filter((o) => normalizePhone(o?.customer?.phone) === phone)
    : [];
  const customerOrders = [...active, ...archived].sort(
    (a, b) => new Date(b?.date || 0) - new Date(a?.date || 0),
  );

  const totalSpent = customerOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const byStatus = (status) => customerOrders.filter((o) => o.status === status).length;

  // Le client le plus récent (pour les infos de contact à jour)
  const latest = customerOrders[0] || customer || {};
  const contact = latest.customer || customer || {};

  const printFiche = () => {
    // Logo du site : converti en URL ABSOLUE pour être affiché dans le
    // document imprimé (un chemin relatif ne se charge pas à l'impression).
    const siteLogo = getSiteLogo();
    const logoUrl =
      siteLogo && !/^(https?:)?\/\//i.test(siteLogo)
        ? `${(typeof window !== "undefined" && window.location?.origin) || "https://kabaryshop.vercel.app"}${siteLogo.startsWith("/") ? siteLogo : `/${siteLogo}`}`
        : siteLogo;
    const siteName = getSiteName();
    const contacts = getSiteContacts();

    // Lignes de contact du site (seulement si renseignées)
    const siteContactLines = [
      contacts.phone && `📞 ${escapeHtml(contacts.phone)}`,
      contacts.email && `✉️ ${escapeHtml(contacts.email)}`,
      contacts.address && `📍 ${escapeHtml(contacts.address)}`,
    ].filter(Boolean);

    // Génère un document propre dans une fenêtre dédiée → impression
    const itemsRows = customerOrders
      .map(
        (o) => `
        <tr>
          <td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(o.reference || `CMD-${o.id}`)}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(formatDate(o.date))}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(statusLabel(o.status))}${o.archivedAt ? ' <span class="badge">Archivée</span>' : ""}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;text-align:right;">${(o.total || 0).toLocaleString("fr-FR")} GNF</td>
        </tr>`,
      )
      .join("");

    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Fiche client — ${escapeHtml(contact.name || "Client")}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1e293b; margin: 0; }
    .page { padding: 28px 32px; }
    .header { background: linear-gradient(135deg,#1e293b,#0f172a); color: #fff; padding: 20px 24px; display: flex; align-items: center; gap: 14px; }
    .header img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; background: #fff; padding: 3px; }
    .header h1 { margin: 0; font-size: 20px; }
    .header .contacts { margin: 5px 0 0; font-size: 11px; color: #cbd5e1; line-height: 1.6; }
    h2 { font-size: 15px; margin: 18px 0 8px; }
    .infos { font-size: 13px; color: #475569; line-height: 1.7; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #334155; color: #fff; text-align: left; padding: 6px 10px; }
    td { border: 1px solid #ddd; }
    .total { margin-top: 14px; font-size: 14px; font-weight: bold; }
    .badge { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 10px; background: #f1f5f9; color: #64748b; margin-left: 4px; }
    .signature { margin-top: 26px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <!-- En-tête du site : logo + nom + contacts -->
  <div class="header">
    ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(siteName)}" />` : ""}
    <div>
      <h1>${escapeHtml(siteName)}</h1>
      ${siteContactLines.length ? `<p class="contacts">${siteContactLines.join("<br/>")}</p>` : ""}
    </div>
  </div>
  <div class="page">
    <h2>Fiche client</h2>
    <div class="infos">
      <strong>${escapeHtml(contact.name || "—")}</strong><br/>
      📞 ${escapeHtml(formatPhone(contact.phone) || "—")}${
      contact.email ? `<br/>✉️ ${escapeHtml(contact.email)}` : ""
    }${contact.address ? `<br/>📍 ${escapeHtml(contact.address)}` : ""}
    </div>
    <h2>Historique des achats (${customerOrders.length} commande(s))</h2>
    <table>
      <tr><th>Référence</th><th>Date</th><th>Statut</th><th style="text-align:right;">Montant</th></tr>
      ${itemsRows}
    </table>
    <p class="total">Total dépensé : ${totalSpent.toLocaleString("fr-FR")} GNF</p>
    <p class="signature">Document généré automatiquement par ${escapeHtml(siteName)} — Merci de votre confiance.</p>
  </div>
  <script>window.print();</script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* En-tête */}
        <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
          <div className="min-w-0">
            <h2 className="text-xl font-bold flex items-center gap-2 truncate">
              <User size={20} className="text-primary shrink-0" />
              Fiche client — {contact.name || "Client"}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <Phone size={13} />
                {formatPhone(contact.phone) || "—"}
              </span>
              {contact.email && (
                <span className="flex items-center gap-1.5 min-w-0">
                  <Mail size={13} className="shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </span>
              )}
              {contact.address && (
                <span className="flex items-center gap-1.5 min-w-0">
                  <MapPin size={13} className="shrink-0" />
                  <span className="truncate">{contact.address}</span>
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 pb-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
            <p className="text-xl font-bold text-blue-600">{customerOrders.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Commandes</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
            <p className="text-xl font-bold text-green-600">{totalSpent.toLocaleString("fr-FR")}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">GNF dépensés</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-center">
            <p className="text-xl font-bold text-yellow-600">{byStatus("pending")}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">En attente</p>
          </div>
          <div className="bg-green-100 dark:bg-green-900/40 p-3 rounded-lg text-center">
            <p className="text-xl font-bold text-green-700">{byStatus("completed")}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Complétées</p>
          </div>
        </div>

        {/* Liste des commandes */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {customerOrders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Aucune commande trouvée pour ce numéro.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase border-b dark:border-gray-700">
                <tr>
                  <th className="text-left py-2">Référence</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Statut</th>
                  <th className="text-right py-2">Montant</th>
                </tr>
              </thead>
              <tbody>
                {customerOrders.map((o) => {
                  const meta = STATUS_META[o.status] || STATUS_META.pending;
                  return (
                    <tr key={o.id} className="border-b dark:border-gray-800">
                      <td className="py-2.5 font-medium">{o.reference || `CMD-${o.id}`}</td>
                      <td className="py-2.5 text-gray-500 dark:text-gray-400">{formatDate(o.date)}</td>
                      <td className="py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                          {meta.icon}
                          {meta.label}
                        </span>
                        {o.archivedAt && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 ml-1.5">
                            <Archive size={11} />
                            Archivée
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-primary">
                        {(o.total || 0).toLocaleString("fr-FR")} GNF
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 p-5 pt-3 border-t dark:border-gray-700">
          <button
            onClick={printFiche}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition flex items-center gap-2 text-sm"
          >
            <Printer size={15} />
            Imprimer
          </button>
          <button
            onClick={() => exportCsv(contact, customerOrders)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition flex items-center gap-2 text-sm"
          >
            <FileDown size={15} />
            Exporter CSV
          </button>
          <button
            onClick={() => sendWhatsApp(contact, customerOrders, totalSpent, getSiteName())}
            disabled={!phone}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white rounded-lg transition flex items-center gap-2 text-sm"
          >
            <MessageCircle size={15} />
            Envoyer au client (WhatsApp)
          </button>
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition text-sm"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerHistory;

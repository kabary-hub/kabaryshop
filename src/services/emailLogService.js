// src/services/emailLogService.js
// Journal des emails envoyés par le site (confirmation commande, newsletter,
// arrivages, alerte admin, 2FA, expédition…).
//
// Stockage : localStorage clé `site_email_logs` (liste d'entrées, plafonnée
// à EMAIL_LOG_MAX_ENTRIES). Chaque entrée comporte :
//   - id
//   - type (order_confirmation | newsletter_confirmation | new_arrival
//          | shipping_assignment | admin_alert | two_factor | test | other)
//   - to / toName
//   - subject
//   - fromName
//   - sentAt
//   - ok (succès ou échec de l'envoi)
//   - message (erreur ou confirmation)
//   - reference (ex: référence de commande quand applicable)

// Utilisation :
//   - emailLogService.logSend({ ...sendPayload }, { ok, message, id? })
//     → enregistre l'envoi et retourne l'entrée sauvegardée.
import { ORDER_REFERENCE_STORE_PREFIX } from '../utils/siteConfig';


//   - emailLogService.getLogs(options?) → liste filtrée/triée.
//   - emailLogService.getLogEntry(id) → entrée unique.
//   - emailLogService.clearLogs() → efface le journal (admin only).
//   - emailLogService.pruneLogs(max?) → nettoie les entrées les plus anciennes.

const LOG_KEY = 'site_email_logs';
export const EMAIL_LOG_MAX_ENTRIES = 300;

// Types d'emails reconnus (destinés à être affichés dans l'admin).
export const EMAIL_TYPES = {
  order_confirmation: 'Confirmation de commande',
  newsletter_confirmation: 'Confirmation d\'abonnement',
  new_arrival: 'Nouveaux arrivages',
  shipping_assignment: 'Assignation d\'expédition',
  admin_alert: 'Alerte admin',
  two_factor: 'Code 2FA',
  test: 'Email de test',
  other: 'Autre',
};

// Détecte le type d'email à partir du payload d'envoi (sujet + contexte).
export const detectEmailType = ({ subject = '', to, toName }) => {
  void to;
  void toName;
  const s = String(subject || '').toLowerCase();
  if (/confirm(ation)?\s*:?\s*commande|cde-|commande\s*:?\s*confirm/i.test(s)) {
    return 'order_confirmation';
  }
  if (/confirm(ation)?\s*:?\s*inscription|abonnement|newsletter\s*:?\s*confirm/i.test(s)) {
    return 'newsletter_confirmation';
  }
  if (/nouveau\s*produit|arriv(age|age)|nouveaut/i.test(s)) {
    return 'new_arrival';
  }
  if (/assign/i.test(s) || /expédition/i.test(s)) {
    return 'shipping_assignment';
  }
  if (/code\s*de\s*vérif|deux\s*étapes|2\s*fa/i.test(s)) {
    return 'two_factor';
  }
  if (/test/i.test(s) || /test kabary/i.test(s)) {
    return 'test';
  }
  if (/alert|alerte/i.test(s)) {
    return 'admin_alert';
  }
  return 'other';
};

// Enregistre l'envoi d'un email dans le journal.
//
// Payload d'envoi typique :
//   { to, toName, fromName, subject, html }
//
// Résultat d'envoi typique (retourné par sendEmail) :
//   { ok, message, id? }
export const logSend = (payload = {}, result = {}) => {
  const existing = getLogs();
  const type = detectEmailType(payload);
  const subjectToExtract = payload.subject || '';
  const entry = {
    id: result.id || crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    to: payload.to || '',
    toName: payload.toName || '',
    fromName: payload.fromName || '',
    subject: payload.subject || '',
    ok: !!result?.ok,
    message: result?.message || '',
    reference: extractReference(subjectToExtract),
    sentAt: new Date().toISOString(),
  };

  const updated = [entry, ...existing].slice(0, EMAIL_LOG_MAX_ENTRIES);
  saveLogs(updated);
  window.dispatchEvent(new Event('emailLogsUpdated'));
  return entry;
};

// Extrait une référence de commande lorsque le sujet le permet.
const extractReference = (subject = '') => {
  const match = String(subject || '').match(new RegExp(`CMD-[0-9]{6}-${ORDER_REFERENCE_STORE_PREFIX}[0-9]{4}-[0-9]{4}`));
  return match ? match[0] : '';
};

// Lecture du journal.
export const getLogs = () => {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const saveLogs = (list) => {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(0, EMAIL_LOG_MAX_ENTRIES)));
  } catch {
    // stockage indisponible : le journal reste vide localement
  }
};

// Filtrage / tri.
export const getLogsFiltered = ({
  type = 'all',
  search = '',
  period = 'all',
  onlyFailed = false,
  limit = 200,
} = {}) => {
  const logs = getLogs();
  const term = String(search || '').toLowerCase();
  const now = Date.now();

  return logs
    .filter((entry) => {
      if (type !== 'all' && entry.type !== type) return false;
      if (onlyFailed && entry.ok) return false;
      if (period === 'today') {
        const d = new Date(entry.sentAt);
        if (d.toDateString() !== new Date().toDateString()) return false;
      }
      if (period === 'week') {
        if (now - new Date(entry.sentAt).getTime() > 7 * 24 * 3600 * 1000) return false;
      }
      if (period === 'month') {
        if (now - new Date(entry.sentAt).getTime() > 30 * 24 * 3600 * 1000) return false;
      }
      if (term) {
        const haystack = [entry.subject, entry.to, entry.toName, entry.message, entry.reference]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
    .slice(0, limit);
};

// Entrée unique par id.
export const getLogEntry = (id) => {
  const logs = getLogs();
  return logs.find((e) => e.id === id) || null;
};

// Effacement (réservé à l'admin).
export const clearLogs = () => {
  saveLogs([]);
  window.dispatchEvent(new Event('emailLogsUpdated'));
};

// Nettoyage des entrées les plus anciennes.
export const pruneLogs = (max = EMAIL_LOG_MAX_ENTRIES) => {
  const logs = getLogs();
  const kept = logs.slice(0, max);
  saveLogs(kept);
  return kept.length;
};

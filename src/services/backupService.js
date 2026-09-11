// src/services/backupService.js
// Sauvegarde et restauration des données critiques du site.
// Les sauvegardes sont stockées dans localStorage sous forme de fichiers JSON
// nommés (une archive par exécution). Chaque archive contient :
//   - timestamp
//   - version
//   - sections sauvegardées (orders, users, subscribers, settings, custom_products,
//     deleted_products, categories, reviews, subscribers, history, siteFeedback)
//
// Utilisation :
//   - BackupService.createBackup() → { id, createdAt, fileName, size }
//   - BackupService.getBackupList() → tableau des archives disponibles
//   - BackupService.downloadBackup(id) → téléchargement du fichier JSON
//   - BackupService.restoreBackup(file) → restauration depuis un fichier JSON
//
// Sécurité :
//   - La restauration écrase les sections sauvegardées uniquement.
//   - Une confirmation explicite est requise dans l'interface admin avant
//     d'exécuter une restauration.

const STORAGE_KEY = 'backup_history';
const BACKUP_PREFIX = 'kabary_backup_';
const BACKUP_VERSION = '1.0.0';

// Sections considérées comme critiques et sauvegardées par défaut.
const BACKUP_SECTIONS = [
  'shop_orders',
  'app_users',
  'subscribers',
  'settings',
  'custom_products',
  'deleted_products',
  'categories',
  'reviews',
  'siteFeedback',
  'subscribedProducts',
  'notifications',
];

// Sections de support (logs, métadonnées).
const EXTRA_SECTIONS = [
  'rate_limit_admin_login',
  'admin_password',
  'dashboard_preferences',
];

// ---------------------------------------------------------------------
// Historique des sauvegardes
// ---------------------------------------------------------------------

export const getBackupHistory = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const saveBackupHistory = (list) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // localStorage indisponible : l'historique reste vide localement
  }
};

// ---------------------------------------------------------------------
// Création d'une sauvegarde
// ---------------------------------------------------------------------

export const createBackup = () => {
  const timestamp = Date.now();
  const sections = {};

  for (const key of BACKUP_SECTIONS) {
    try {
      sections[key] = JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      sections[key] = null;
    }
  }

  for (const key of EXTRA_SECTIONS) {
    try {
      sections[key] = localStorage.getItem(key) || null;
    } catch {
      sections[key] = null;
    }
  }

  const archive = {
    version: BACKUP_VERSION,
    createdAt: new Date(timestamp).toISOString(),
    timestamp,
    sections,
  };

  const fileName = `${BACKUP_PREFIX}${timestamp}.json`;
  try {
    localStorage.setItem(fileName, JSON.stringify(archive));
  } catch {
    // échec de stockage : la sauvegarde ne peut pas être conservée
    throw new Error('Impossible de stocker la sauvegarde localement.');
  }

  const entry = {
    id: String(timestamp),
    fileName,
    createdAt: archive.createdAt,
    version: archive.version,
    size: new TextEncoder().encode(JSON.stringify(archive)).length,
    sections: Object.keys(sections),
  };

  const history = getBackupHistory();
  history.unshift(entry);
  saveBackupHistory(history.slice(0, 50)); // on garde les 50 dernières sauvegardes

  window.dispatchEvent(new Event('backupCreated'));
  return entry;
};

// ---------------------------------------------------------------------
// Liste des sauvegardes disponibles
// ---------------------------------------------------------------------

export const getBackupList = () => {
  return getBackupHistory().map((entry) => ({
    ...entry,
    exists: Boolean(localStorage.getItem(entry.fileName)),
  }));
};

// ---------------------------------------------------------------------
// Téléchargement d'une sauvegarde
// ---------------------------------------------------------------------

export const downloadBackup = (entry) => {
  const raw = localStorage.getItem(entry.fileName);
  if (!raw) {
    throw new Error('Sauvegarde introuvable.');
  }

  let archive;
  try {
    archive = JSON.parse(raw);
  } catch {
    throw new Error('Fichier de sauvegarde illisible.');
  }

  const blob = new Blob([JSON.stringify(archive, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = entry.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ---------------------------------------------------------------------
// Restauration depuis un fichier JSON importé
// ---------------------------------------------------------------------

export const restoreBackupFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const archive = JSON.parse(reader.result);
        resolve(applyBackup(archive));
      } catch {
        reject(new Error('Fichier de sauvegarde illisible.'));
      }
    };
    reader.onerror = () => reject(new Error('Impossible de lire le fichier.'));
    reader.readAsText(file);
  });
};

export const restoreBackupById = (id) => {
  const entry = getBackupList().find((e) => e.id === id);
  if (!entry || !entry.exists) {
    throw new Error('Sauvegarde introuvable.');
  }

  const raw = localStorage.getItem(entry.fileName);
  if (!raw) {
    throw new Error('Fichier de sauvegarde introuvable.');
  }

  let archive;
  try {
    archive = JSON.parse(raw);
  } catch {
    throw new Error('Fichier de sauvegarde illisible.');
  }

  return applyBackup(archive);
};

// ---------------------------------------------------------------------
// Application d'une sauvegarde
// ---------------------------------------------------------------------

const applyBackup = (archive) => {
  if (!archive || !archive.sections || typeof archive.sections !== 'object') {
    throw new Error('Archive de sauvegarde invalide.');
  }

  for (const key of Object.keys(archive.sections)) {
    const value = archive.sections[key];
    try {
      if (typeof value === 'string') {
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      // clé non éc writable : on ignore l'erreur pour ne pas bloquer la
      // restauration des autres sections
    }
  }

  window.dispatchEvent(new Event('productsUpdated'));
  window.dispatchEvent(new Event('ordersUpdated'));
  window.dispatchEvent(new Event('userChanged'));
  window.dispatchEvent(new Event('subscribersUpdated'));
  window.dispatchEvent(new Event('storage'));

  return {
    restoredAt: new Date().toISOString(),
    restoredKeys: Object.keys(archive.sections),
  };
};

// ---------------------------------------------------------------------
// Nettoyage des anciennes sauvegardes
// ---------------------------------------------------------------------

export const pruneBackups = (max = 50) => {
  const history = getBackupHistory();
  const toKeep = history.slice(0, max);

  for (const entry of history.slice(max)) {
    try {
      localStorage.removeItem(entry.fileName);
    } catch {
      // suppression impossible : on continue
    }
  }

  saveBackupHistory(toKeep);
  return toKeep.length;
};

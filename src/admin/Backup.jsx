// src/admin/Backup.jsx
// Sauvegarde, téléchargement et restauration des données critiques.
// Compatible avec le service backupService.js.
import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileJson,
  Loader,
} from 'lucide-react';
import { showToast } from '../utils/toast';
import { logActivity } from '../utils/history';
import {
  getBackupList,
  createBackup,
  downloadBackup,
  restoreBackupById,
  restoreBackupFile,
  pruneBackups,
} from '../services/backupService';

const Backup = () => {
  const [history, setHistory] = useState([]);
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [fileRestoring, setFileRestoring] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);

  const refreshHistory = () => {
    setHistory(getBackupList());
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  useEffect(() => {
    const handleBackupCreated = () => refreshHistory();
    window.addEventListener('backupCreated', handleBackupCreated);
    return () => window.removeEventListener('backupCreated', handleBackupCreated);
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    setResult(null);
    try {
      const entry = createBackup();
      showToast('Sauvegarde créee avec succes.', 'success');
      logActivity({
        type: 'backup',
        action: 'creation',
        subject: entry.fileName,
        details: `Sauvegarde manuelle de ${entry.sections.length} sections.`,
        actor: { name: 'Admin', role: 'admin' },
      });
      refreshHistory();
      setResult({ type: 'success', message: `Sauvegarde ${entry.fileName} creee.` });
    } catch (err) {
      showToast(err.message || 'Echec de la sauvegarde.', 'error');
      setResult({ type: 'error', message: err.message || 'Echec de la sauvegarde.' });
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = (entry) => {
    try {
      downloadBackup(entry);
      showToast(`Sauvegarde ${entry.fileName} telechargee.`, 'info');
    } catch (err) {
      showToast(err.message || 'Impossible de telecharger la sauvegarde.', 'error');
    }
  };

  const handleRestoreClick = (entry) => {
    setConfirmRestore(entry.id);
  };

  const confirmDeleteRestore = () => {
    if (!confirmRestore) return;
    setRestoringId(confirmRestore);
    setConfirmRestore(null);
  };

  const handleRestore = () => {
    if (!restoringId) return;
    setResult(null);
    try {
      const info = restoreBackupById(restoringId);
      if (!info || !info.restoredKeys) throw new Error('Resultat de restauration invalide.');
      showToast('Restauration appliquee avec succes.', 'success');
      logActivity({
        type: 'backup',
        action: 'restauration',
        subject: `sauvegarde ${restoringId}`,
        details: `Restauration de ${info.restoredKeys.length} sections.`,
        actor: { name: 'Admin', role: 'admin' },
      });
      setResult({ type: 'success', message: `Restauration terminee. Sections : ${info.restoredKeys.join(', ')}` });
      refreshHistory();
    } catch (err) {
      showToast(err.message || 'Echec de la restauration.', 'error');
      setResult({ type: 'error', message: err.message || 'Echec de la restauration.' });
    } finally {
      setRestoringId(null);
    }
  };

  // Déclencher la restauration automatiquement quand restoringId est défini
  useEffect(() => {
    if (restoringId) {
      handleRestore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleRestore est stable ici
  }, [restoringId]);

  const handleFileRestore = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      showToast('Fichier invalide. Utilisez un fichier JSON de sauvegarde.', 'error');
      return;
    }

    setFileRestoring(true);
    setResult(null);
    try {
      const info = await restoreBackupFile(file);
      showToast('Restauration depuis fichier terminee.', 'success');
      logActivity({
        type: 'backup',
        action: 'restauration fichier',
        subject: file.name,
        details: `Restauration de ${info.restoredKeys.length} sections depuis fichier.`,
        actor: { name: 'Admin', role: 'admin' },
      });
      setResult({ type: 'success', message: `Restauration terminee. Sections : ${info.restoredKeys.join(', ')}` });
      refreshHistory();
    } catch (err) {
      showToast(err.message || 'Echec de la restauration du fichier.', 'error');
      setResult({ type: 'error', message: err.message || 'Echec de la restauration du fichier.' });
    } finally {
      setFileRestoring(false);
      event.target.value = '';
    }
  };

  const handlePrune = () => {
    try {
      const kept = pruneBackups(50);
      showToast(`Nettoyage effectue. ${kept} sauvegarde(s) conservee(s).`, 'info');
      refreshHistory();
    } catch {
      showToast('Nettoyage indisponible.', 'error');
    }
  };

  const newest = history[0];
  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('fr-FR');
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="text-blue-600" />
            Sauvegarde
          </h1>
          <p className="text-gray-500 mt-1">Sauvegardes automatiques et manuelles des données du site</p>
        </div>
      </div>

      {result && (
        <div className={`mb-6 p-4 rounded-lg border text-sm ${result.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {result.message}
        </div>
      )}

      {/* Guide d'aide intégré */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6 bg-blue-50/50 dark:bg-blue-900/10">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-blue-600" />
          <h3 className="font-semibold text-sm">Guide — Sauvegarde & Restauration</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600 dark:text-gray-300">
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">📦 Qu'est-ce qu'une sauvegarde ?</p>
            Une sauvegarde capture l'état actuel des données du site
            (produits, commandes, utilisateurs, paramètres, avis…) dans un
            fichier JSON. Elle permet de restaurer ces données en cas de
            problème ou de les télécharger pour archivage.
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">🔄 Sections sauvegardées</p>
            Les sauvegardes incluent : produits, commandes, utilisateurs,
            catégories, avis, abonnés, paramètres du site, historique des
            activités et logs d'emails. Chaque section est indépendante.
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">⚠️ Avant de restaurer</p>
            La restauration <strong>écrit</strong> les données sauvegardées
            dans le stockage local et <strong>remplace</strong> les données
            actuelles. Vérifiez bien le fichier et la date avant de
            confirmer. Une sauvegarde manuelle avant restauration est
            recommandée.
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-3">
          <p className="flex items-start gap-2">
            <span>💡</span>
            <span>
              <strong>Astuce :</strong> les sauvegardes automatiques sont
              créées périodiquement. Utilisez le bouton « Sauvegarde
              manuelle » pour créer une sauvegarde à la demande avant
              une modification importante.
            </span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Actions */}
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <RefreshCw size={17} className="text-blue-600" />
              Actions
            </h3>

            <button
              type="button"
              onClick={handleCreateBackup}
              disabled={creating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition disabled:opacity-50"
            >
              {creating && <Loader size={16} className="animate-spin" />}
              {creating ? 'Creation en cours...' : <><RefreshCw size={17} /> Sauvegarde manuelle</>}
            </button>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Importer une sauvegarde</label>
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleFileRestore}
                  disabled={fileRestoring}
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-secondary"
                />
              </div>
              <button
                type="button"
                onClick={handlePrune}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                <Trash2 size={17} />
                Nettoyer
              </button>
            </div>

            <p className="text-xs text-gray-500">
              La restauration ecrit les sections sauvegardees dans le stockage local.
              Une confirmation est demandee pour chaque restauration.
            </p>
          </div>

          {newest && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Clock size={17} className="text-blue-600" />
                Derniere sauvegarde
              </h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium">{formatDate(newest.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fichier</span>
                  <span className="font-mono text-xs break-all">{newest.fileName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sections</span>
                  <span>{newest.sections?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Taille</span>
                  <span>{(newest.size || 0).toLocaleString()} octets</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Historique */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <FileJson size={17} className="text-blue-600" />
            Historique des sauvegardes
          </h3>

          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Aucune sauvegarde enregistree.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="font-mono text-xs break-all">{entry.fileName}</span>
                        {!entry.exists && (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 text-xs">
                            <AlertTriangle size={12} /> Inexistante
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Date</span>
                          <span>{formatDate(entry.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sections</span>
                          <span>{entry.sections?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Taille</span>
                          <span>{(entry.size || 0).toLocaleString()} octets</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownload(entry)}
                        disabled={!entry.exists}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <Download size={15} />
                        Telecharger
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRestoreClick(entry)}
                        disabled={!entry.exists || restoringId === entry.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <Upload size={15} />
                        Restaurer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modale de confirmation de restauration */}
      {confirmRestore && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-amber-500" size={22} />
              <h3 className="text-lg font-bold">Restaurer cette sauvegarde ?</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Cette action ecrit les sections sauvegardees dans le stockage local.
              Les donnees actuelles seront remplacees par celles de la sauvegarde.
            </p>
            <div className="text-sm font-mono bg-gray-100 dark:bg-gray-700 rounded p-2 break-all mb-4">
              {history.find((e) => e.id === confirmRestore)?.fileName}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmRestore(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteRestore}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition"
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Indicateur de restauration en cours */}
      {restoringId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 text-center">
            <Loader size={24} className="animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-300">Restauration en cours...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Backup;

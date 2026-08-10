// src/admin/Settings.jsx
import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Lock, Save, X, Key, Mail, Phone, Send, Eye, EyeOff, Megaphone, Loader, MapPin, MessageCircle, Link2, ShieldCheck, RefreshCw, CheckCircle2, BellRing, AlertTriangle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import {
  isAutoNotifyEnabled,
  setAutoNotifyEnabled,
  sendTestNewArrivalsEmail,
} from '../utils/subscribers';
import {
  requestPushPermission,
  getPushPermission,
  sendTestNotification,
  sendBrowserPush,
} from '../utils/notifications';
import { logActivity } from '../utils/history';
import { showToast } from '../utils/toast';
import { isValidPassword, PASSWORD_ERROR_MESSAGE } from '../utils/validation';
import { getSupabase, ensureSupabaseAuth } from '../services/db';

const Settings = () => {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState(settings);
  
  // États pour le changement de mot de passe
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [passwordStep, setPasswordStep] = useState(1);
  
  // États pour afficher/masquer les mots de passe
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewResetPassword, setShowNewResetPassword] = useState(false);
  const [showConfirmResetPassword, setShowConfirmResetPassword] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    recoveryEmail: '',
    recoveryPhone: '',
    verificationCode: '',
    newPasswordAfterReset: '',
    confirmNewPasswordAfterReset: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Configuration des notifications aux abonnés (Resend)
  const [autoNotifySubscribers, setAutoNotifySubscribers] = useState(isAutoNotifyEnabled);

  // Email de test des notifications (pré-rempli avec l'email de contact du site)
  const [testEmail, setTestEmail] = useState(formData.siteEmail || '');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null); // { type: 'success' | 'error', message }

  // Tests des canaux de notification (push / email / alerte in-app)
  const [notifTestRunning, setNotifTestRunning] = useState(false);
  const [notifTestResults, setNotifTestResults] = useState([]);
  const [pushState, setPushState] = useState(() => ({
    permission: getPushPermission(),
    requesting: false,
  }));

  // Récupérer le mot de passe stocké dans localStorage
  // (admin figé dans le code : mot de passe initial Diaraye@620)
  const getStoredPassword = () => {
    const storedPassword = localStorage.getItem('admin_password');
    return storedPassword || 'Diaraye@620'; // Valeur par défaut si rien n'est stocké
  };

  // Sauvegarder le mot de passe dans localStorage
  const savePassword = (newPassword) => {
    localStorage.setItem('admin_password', newPassword);
    // Également sauvegarder dans sessionStorage pour la session en cours
    sessionStorage.setItem('admin_password', newPassword);
  };

  // Met à jour le mot de passe du compte cloud (Supabase Auth) pour que la
  // connexion admin fonctionne depuis n'importe quel appareil.
  const updateCloudPassword = async (newPassword) => {
    const sb = getSupabase();
    if (!sb) return;
    const admin = formData.adminEmail || formData.siteEmail;
    if (!admin) return;
    // Session cloud active → mise à jour directe du mot de passe
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (!error) return;
    // Pas de session active → on tente une (re)création du compte cloud
    const res = await ensureSupabaseAuth(admin, newPassword);
    if (res && res.reason === 'stale-password') {
      // Mot de passe cloud obsolète → notification visuelle au lieu d'un console.warn
      showToast(
        'Le mot de passe cloud est obsolète : réinitialisation requise dans Supabase (Authentication → Users).',
        'warning'
      );
    }
  };

  const handleChange = (section, field, value) => {
    if (section) {
      setFormData({
        ...formData,
        [section]: {
          ...formData[section],
          [field]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [field]: value
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings(formData);
    showToast('Paramètres enregistrés avec succès !', 'success');
    logActivity({
      type: 'settings',
      action: 'modification des paramètres',
      subject: formData.siteName || 'Paramètres du site',
      details: 'Paramètres généraux enregistrés (identité, contact, devise, notifications, sécurité)',
    });
  };

  // Activer / demander la permission des notifications push navigateur
  const handleEnablePush = async () => {
    setPushState((s) => ({ ...s, requesting: true }));
    const result = await requestPushPermission();
    setPushState({ permission: getPushPermission(), requesting: false });
    if (result.ok) {
      // Notifier le changement dans les paramètres
      handleChange('notifications', 'push', true);
      sendBrowserPush(
        `${formData.siteName || 'Notifications activées'}`,
        'Les notifications push sont maintenant actives.'
      );
    }
    setNotifTestResults((prev) => [
      { ok: result.ok, message: result.message },
      ...prev,
    ]);
  };

  // Lancer un test de tous les canaux de notification
  const handleRunNotificationTest = async () => {
    setNotifTestRunning(true);
    setNotifTestResults([]);
    const results = await sendTestNotification();
    setNotifTestResults(results);
    setNotifTestRunning(false);
  };

  // Envoyer un email de test aux abonnés (sans publier de produit)
  const handleSendTest = async (toAll = false) => {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await sendTestNewArrivalsEmail({
        toEmail: testEmail,
        toAll,
      });
      setTestResult({
        type: res.ok ? 'success' : 'error',
        message: res.message,
      });
    } catch (err) {
      setTestResult({
        type: 'error',
        message: `Erreur inattendue : ${err.message || err}`,
      });
    } finally {
      setTestSending(false);
    }
  };

  // Gestion du changement de mot de passe normal
  const handlePasswordChange = (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const currentPassword = getStoredPassword();

    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('Tous les champs sont requis');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (!isValidPassword(passwordData.newPassword)) {
      setPasswordError(PASSWORD_ERROR_MESSAGE);
      return;
    }

    if (passwordData.oldPassword !== currentPassword) {
      setPasswordError('Ancien mot de passe incorrect');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      // Sauvegarder le nouveau mot de passe
      savePassword(passwordData.newPassword);
      // Synchroniser aussi le compte cloud (connexion multi-appareils)
      updateCloudPassword(passwordData.newPassword);
      setPasswordSuccess('Mot de passe modifié avec succès !');
      setPasswordData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
        recoveryEmail: '',
        recoveryPhone: '',
        verificationCode: '',
        newPasswordAfterReset: '',
        confirmNewPasswordAfterReset: ''
      });
      setIsLoading(false);
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    }, 1000);
  };

  // Gestion de la récupération de mot de passe
  const handleForgotPassword = (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordStep === 1) {
      if (!passwordData.recoveryEmail && !passwordData.recoveryPhone) {
        setPasswordError('Veuillez entrer votre email ou numéro de téléphone');
        return;
      }

      setIsLoading(true);
      setTimeout(() => {
        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        localStorage.setItem('resetCode', generatedCode);
        localStorage.setItem('resetCodeExpiry', Date.now() + 300000);
        
        showToast(
          `Code de vérification envoyé à ${passwordData.recoveryEmail || passwordData.recoveryPhone} — Code : ${generatedCode} (simulation)`,
          'info'
        );
        
        setPasswordStep(2);
        setIsLoading(false);
      }, 1000);
    } else if (passwordStep === 2) {
      const savedCode = localStorage.getItem('resetCode');
      const savedExpiry = localStorage.getItem('resetCodeExpiry');

      if (!savedCode || Date.now() > savedExpiry) {
        setPasswordError('Code expiré. Veuillez recommencer.');
        setPasswordStep(1);
        return;
      }

      if (passwordData.verificationCode !== savedCode) {
        setPasswordError('Code invalide');
        return;
      }

      if (!passwordData.newPasswordAfterReset || !passwordData.confirmNewPasswordAfterReset) {
        setPasswordError('Veuillez entrer votre nouveau mot de passe');
        return;
      }

      if (passwordData.newPasswordAfterReset !== passwordData.confirmNewPasswordAfterReset) {
        setPasswordError('Les mots de passe ne correspondent pas');
        return;
      }

      if (!isValidPassword(passwordData.newPasswordAfterReset)) {
        setPasswordError(PASSWORD_ERROR_MESSAGE);
        return;
      }

      setIsLoading(true);
      setTimeout(() => {
        // Sauvegarder le nouveau mot de passe
        savePassword(passwordData.newPasswordAfterReset);
        // Synchroniser aussi le compte cloud (connexion multi-appareils)
        updateCloudPassword(passwordData.newPasswordAfterReset);
        localStorage.removeItem('resetCode');
        localStorage.removeItem('resetCodeExpiry');
        setPasswordSuccess('Mot de passe réinitialisé avec succès !');
        setIsLoading(false);
        setTimeout(() => {
          setShowForgotModal(false);
          setPasswordStep(1);
          setPasswordSuccess('');
          setPasswordData({
            oldPassword: '',
            newPassword: '',
            confirmPassword: '',
            recoveryEmail: '',
            recoveryPhone: '',
            verificationCode: '',
            newPasswordAfterReset: '',
            confirmNewPasswordAfterReset: ''
          });
        }, 2000);
      }, 1000);
    }
  };

  const resetPasswordModals = () => {
    setPasswordStep(1);
    setPasswordError('');
    setPasswordSuccess('');
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setShowNewResetPassword(false);
    setShowConfirmResetPassword(false);
    setPasswordData({
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
      recoveryEmail: '',
      recoveryPhone: '',
      verificationCode: '',
      newPasswordAfterReset: '',
      confirmNewPasswordAfterReset: ''
    });
  };

  const tabs = [
    { id: 'general', name: 'Général', icon: SettingsIcon },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Sécurité', icon: Lock },
  ];

  const inputClass = "w-full max-w-md px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary dark:bg-gray-700 dark:border-gray-600";

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="text-blue-600" />
            Paramètres
          </h1>
          <p className="text-gray-500 mt-1">Gérez la configuration de votre boutique</p>
        </div>
      </div>

      <div className="rounded-lg shadow">
        <div className="border-b">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition ${
                  activeTab === tab.id
                    ? 'text-secondary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                <tab.icon size={18} />
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* ONGLET GÉNÉRAL */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Identité du site */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <SettingsIcon size={17} className="text-blue-600" />
                    Identité du site
                  </h3>                    <div>
                    <label className="block text-sm font-medium mb-2">Nom du site</label>
                    <input
                      type="text"
                      value={formData.siteName}
                      onChange={(e) => handleChange(null, 'siteName', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Logo du site (URL de l'image)</label>
                    <div className="flex items-center gap-3">
                      {formData.siteLogo && (
                        <img
                          src={formData.siteLogo}
                          alt="Aperçu du logo"
                          className="w-12 h-12 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                        />
                      )}
                      <input
                        type="text"
                        value={formData.siteLogo || ''}
                        onChange={(e) => handleChange(null, 'siteLogo', e.target.value)}
                        placeholder="https://exemple.com/logo.png (vide = logo par défaut)"
                        className={inputClass}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Ce logo est utilisé dans la barre de navigation et dans l'espace admin (utilisateurs).
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Slogan / tagline</label>
                    <input
                      type="text"
                      value={formData.siteTagline}
                      onChange={(e) => handleChange(null, 'siteTagline', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Description du site</label>
                    <textarea
                      rows="3"
                      value={formData.siteDescription}
                      onChange={(e) => handleChange(null, 'siteDescription', e.target.value)}
                      className="w-full max-w-2xl px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>

                {/* Bannière héro (promotion personnalisable) */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Megaphone size={17} className="text-blue-600" />
                    Bannière héro (promotion du moment)
                  </h3>
                  <p className="text-sm text-gray-500">
                    Renseignez ces champs pour remplacer le carrousel d'accueil par votre propre promotion.
                    Laissez l'image vide pour conserver le carrousel par défaut.
                  </p>
                  <div>
                    <label className="block text-sm font-medium mb-2">Image de la bannière (URL)</label>
                    <div className="flex items-center gap-3">
                      {formData.heroImage && (
                        <img
                          src={formData.heroImage}
                          alt="Aperçu de la bannière"
                          className="w-16 h-12 rounded-lg object-cover border border-gray-300 dark:border-gray-600"
                        />
                      )}
                      <input
                        type="text"
                        value={formData.heroImage || ''}
                        onChange={(e) => handleChange(null, 'heroImage', e.target.value)}
                        placeholder="https://exemple.com/banniere.jpg (vide = carrousel par défaut)"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Titre de la promotion</label>
                    <input
                      type="text"
                      value={formData.heroTitle || ''}
                      onChange={(e) => handleChange(null, 'heroTitle', e.target.value)}
                      placeholder="Ex : -50 % sur toute la collection"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Texte descriptif</label>
                    <textarea
                      rows="3"
                      value={formData.heroSubtitle || ''}
                      onChange={(e) => handleChange(null, 'heroSubtitle', e.target.value)}
                      placeholder="Ex : Profitez de nos offres exclusives avant la fin du mois..."
                      className="w-full max-w-2xl px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>

                {/* Coordonnées */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Phone size={17} className="text-blue-600" />
                    Coordonnées & contact
                  </h3>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email de contact (affiché sur le site)</label>
                    <input
                      type="email"
                      value={formData.siteEmail}
                      onChange={(e) => handleChange(null, 'siteEmail', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email de l'administrateur (connexion & alertes)</label>
                    <input
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => handleChange(null, 'adminEmail', e.target.value)}
                      className={inputClass}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Utilisé pour la connexion admin et la réception des alertes par email.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.sitePhone}
                      onChange={(e) => handleChange(null, 'sitePhone', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                      <MessageCircle size={15} className="text-green-500" />
                      Numéro WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => handleChange(null, 'whatsapp', e.target.value)}
                      placeholder="+224 6xx xxx xxx"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                      <MapPin size={15} className="text-red-500" />
                      Adresse du site
                    </label>
                    <input
                      type="text"
                      value={formData.siteAddress}
                      onChange={(e) => handleChange(null, 'siteAddress', e.target.value)}
                      placeholder="Quartier, Ville, Pays"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Livraison & devise */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin size={17} className="text-blue-600" />
                    Livraison & devise
                  </h3>
                  <div>
                    <label className="block text-sm font-medium mb-2">Infos de livraison</label>
                    <input
                      type="text"
                      value={formData.deliveryInfo}
                      onChange={(e) => handleChange(null, 'deliveryInfo', e.target.value)}
                      placeholder="Livraison sous 24h/48h dans tout Conakry"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Livraison gratuite à partir de (GNF)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.freeDeliveryThreshold}
                      onChange={(e) => handleChange(null, 'freeDeliveryThreshold', Number(e.target.value) || 0)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Devise</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleChange(null, 'currency', e.target.value)}
                      className={inputClass}
                    >
                      <option value="GNF">GNF (Franc Guinéen)</option>
                      <option value="USD">USD (Dollar US)</option>
                      <option value="EUR">EUR (Euro)</option>
                      <option value="XAF">XAF (Franc CFA CEMAC)</option>
                    </select>
                  </div>
                </div>

                {/* Page contact */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Phone size={17} className="text-blue-600" />
                    Page contact
                  </h3>
                  <div className="grid gap-4 max-w-2xl md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium mb-2">Titre de la bannière</label>
                      <input
                        type="text"
                        value={formData.contactPageTitle}
                        onChange={(e) => handleChange(null, 'contactPageTitle', e.target.value)}
                        placeholder="Contactez-nous"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Sous-titre de la bannière</label>
                      <input
                        type="text"
                        value={formData.contactPageSubtitle}
                        onChange={(e) => handleChange(null, 'contactPageSubtitle', e.target.value)}
                        placeholder="Nous sommes à votre écoute pour toute question"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Titre de la section coordonnées</label>
                      <input
                        type="text"
                        value={formData.contactSectionTitle}
                        onChange={(e) => handleChange(null, 'contactSectionTitle', e.target.value)}
                        placeholder="Nos Coordonnées"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Note WhatsApp</label>
                      <input
                        type="text"
                        value={formData.contactWhatsappNote}
                        onChange={(e) => handleChange(null, 'contactWhatsappNote', e.target.value)}
                        placeholder="Disponible sur WhatsApp 24h/7j"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Titre de la carte de remerciement</label>
                    <input
                      type="text"
                      value={formData.contactThankTitle}
                      onChange={(e) => handleChange(null, 'contactThankTitle', e.target.value)}
                      placeholder="Merci de votre visite !"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Message de la carte de remerciement</label>
                    <textarea
                      rows="3"
                      value={formData.contactThankMessage}
                      onChange={(e) => handleChange(null, 'contactThankMessage', e.target.value)}
                      placeholder="N'hésitez pas à nous contacter pour vos commandes spéciales..."
                      className="w-full max-w-2xl px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Le nom du site et les infos de livraison sont ajoutés
                      automatiquement à la suite de ce message.
                    </p>
                  </div>
                </div>

                {/* Réseaux sociaux */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Link2 size={17} className="text-blue-600" />
                    Réseaux sociaux
                  </h3>
                  <div className="grid gap-4 max-w-2xl">
                    <div>
                      <label className="block text-sm font-medium mb-2">Facebook</label>
                      <input
                        type="url"
                        value={formData.social?.facebook}
                        onChange={(e) => handleChange('social', 'facebook', e.target.value)}
                        placeholder="https://facebook.com/..."
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Instagram</label>
                      <input
                        type="url"
                        value={formData.social?.instagram}
                        onChange={(e) => handleChange('social', 'instagram', e.target.value)}
                        placeholder="https://instagram.com/..."
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">LinkedIn</label>
                      <input
                        type="url"
                        value={formData.social?.linkedin}
                        onChange={(e) => handleChange('social', 'linkedin', e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Telegram</label>
                      <input
                        type="url"
                        value={formData.social?.telegram}
                        onChange={(e) => handleChange('social', 'telegram', e.target.value)}
                        placeholder="https://t.me/..."
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                {/* Notifications push navigateur */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <BellRing size={17} className="text-blue-600" />
                        Notifications push (navigateur)
                      </p>
                      <p className="text-sm text-gray-500">
                        Notifications affichées par le navigateur même hors de l'admin.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notifications.push}
                        onChange={(e) => handleChange('notifications', 'push', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <button
                      type="button"
                      onClick={handleEnablePush}
                      disabled={pushState.requesting}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                        pushState.permission === 'granted'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-300 dark:border-green-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {pushState.requesting ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Demande en cours...
                        </>
                      ) : pushState.permission === 'granted' ? (
                        <>
                          <CheckCircle2 size={16} />
                          Push activé
                        </>
                      ) : (
                        <>
                          <BellRing size={16} />
                          Activer le push
                        </>
                      )}
                    </button>
                    {pushState.permission === 'denied' && (
                      <p className="text-xs text-red-500 flex items-start gap-1">
                        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                        <span>Permission bloquée par le navigateur. Autorisez les notifications dans les réglages du site (icône de cadenas près de l'URL).</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Notifications par email */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Mail size={17} className="text-green-600" />
                        Notifications par email
                      </p>
                      <p className="text-sm text-gray-500">
                        Envoyer une alerte email à {formData.adminEmail || "l'admin"} sur les événements (nouvelles commandes, etc.).
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notifications.email}
                        onChange={(e) => handleChange('notifications', 'email', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-green-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>

                </div>

                {/* Alertes nouvelles commandes */}
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">Alertes nouvelles commandes</p>
                    <p className="text-sm text-gray-500">Cloche admin + push + email à chaque commande</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notifications.orders}
                      onChange={(e) => handleChange('notifications', 'orders', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>

                {/* Test global des notifications */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <p className="font-medium flex items-center gap-2">
                    <Send size={17} className="text-green-600" />
                    Tester les notifications
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Vérifie tous les canaux activés : alerte in-app (cloche), push navigateur et email admin.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 mt-3 max-w-md">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder={formData.siteEmail || 'exemple@email.com'}
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm dark:bg-gray-700 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={handleRunNotificationTest}
                      disabled={notifTestRunning}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {notifTestRunning ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Test en cours...
                        </>
                      ) : (
                        <>
                          <BellRing size={16} />
                          Tester les notifications
                        </>
                      )}
                    </button>
                  </div>
                  {notifTestResults.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {notifTestResults.map((r, i) => (
                        <li
                          key={i}
                          className={`text-sm font-medium ${r.ok ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}
                        >
                          {r.ok ? <CheckCircle2 size={14} className="inline text-green-600" /> : <AlertTriangle size={14} className="inline text-amber-500" />} {r.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Notifications aux abonnés newsletter */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Megaphone size={17} className="text-blue-600" />
                        Notifier les abonnés des nouveaux produits
                      </p>
                      <p className="text-sm text-gray-500">
                        Envoyer un email à tous les abonnés à chaque nouveau
                        produit publié dans la boutique.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoNotifySubscribers}
                        onChange={(e) => {
                          setAutoNotifySubscribers(e.target.checked);
                          setAutoNotifyEnabled(e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>


                  {/* Email de test */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                    <p className="font-medium flex items-center gap-2">
                      <Send size={17} className="text-green-600" />
                      Envoyer un email de test
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Vérifier que le template « Nouveaux arrivages » affiche
                      correctement les infos produit, sans publier de produit.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 mt-3 max-w-md">
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder={formData.siteEmail || 'exemple@email.com'}
                        className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendTest(false)}
                        disabled={testSending || !testEmail.trim()}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testSending ? (
                          <>
                            <Loader size={16} className="animate-spin" />
                            Envoi...
                          </>
                        ) : (
                          <>
                            <Send size={16} />
                            Envoyer le test
                          </>
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSendTest(true)}
                      disabled={testSending}
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-green-600 text-green-600 dark:text-green-400 text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={16} />
                      Envoyer à tous les abonnés
                    </button>
                    {testResult && (
                      <p
                        role="status"
                        className={`mt-3 text-sm font-medium ${
                          testResult.type === 'success'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {testResult.type === 'success' ? <CheckCircle2 size={14} className="inline text-green-600" /> : <AlertTriangle size={14} className="inline text-red-500" />} {testResult.message}
                      </p>
                    )}
                  </div>
                </div>


              </div>
            )}

            {/* ONGLET SÉCURITÉ */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Authentification à deux facteurs */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <ShieldCheck size={17} className="text-emerald-600" />
                        Authentification à deux facteurs (2FA)
                      </p>
                      <p className="text-sm text-gray-500">
                        À chaque connexion admin, un code à 6 chiffres est envoyé par email et demandé après le mot de passe.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.security.twoFactor}
                        onChange={(e) => handleChange('security', 'twoFactor', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-600 border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>

                  {formData.security.twoFactor && (
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                      <p className="flex items-start gap-2">
                        <RefreshCw size={15} className="shrink-0 mt-0.5" />
                        <span>
                          La 2FA est <strong>active</strong>. Le code sera envoyé à{' '}
                          <strong>{formData.adminEmail || 'admin@kabary.com'}</strong> à chaque connexion
                          (valable 5 minutes, avec renvoi possible).
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
                    <p className="text-sm font-medium flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <Mail size={16} />
                      Envoi du code par Resend
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                      Le code à 6 chiffres est envoyé à {formData.adminEmail || "l'adresse admin"}
                      par email via Resend. Si l'envoi échoue, un code de secours s'affiche à l'écran.
                    </p>
                  </div>
                </div>

                {/* Délai d'inactivité */}
                <div>
                  <label className="block text-sm font-medium mb-2">Délai d'inactivité (minutes)</label>
                  <select
                    value={formData.security.sessionTimeout}
                    onChange={(e) => handleChange('security', 'sessionTimeout', parseInt(e.target.value))}
                    className="w-full max-w-xs px-3 py-2 border dark:bg-gray-700 rounded-lg"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 heure</option>
                    <option value="120">2 heures</option>
                  </select>
                </div>
                {/* Changer le mot de passe */}
                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(true);
                      resetPasswordModals();
                    }}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    Changer le mot de passe
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-6">
            <button
              type="submit"
              className="flex items-center gap-2 bg-primary px-6 py-2 rounded-lg hover:bg-secondary transition"
            >
              <Save size={18} />
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>

      {/* MODAL CHANGER MOT DE PASSE */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 pt-20 lg:pt-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Key className="text-primary" />
                Changer votre mot de passe
              </h2>
              <button onClick={() => setShowPasswordModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            {passwordSuccess && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">{passwordSuccess}</div>}
            {passwordError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{passwordError}</div>}

            <form onSubmit={handlePasswordChange}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Ancien mot de passe</label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? "text" : "password"}
                      placeholder='...........'
                      value={passwordData.oldPassword}
                      onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder='Au moins 6 caractères'
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Confirmer le nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder='********'
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setShowForgotModal(true);
                      resetPasswordModals();
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Annuler</button>
                  <button type="submit" disabled={isLoading} className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary disabled:opacity-50">
                    {isLoading ? 'Chargement...' : 'Modifier'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MOT DE PASSE OUBLIÉ */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {passwordStep === 1 ? <Mail className="text-primary" /> : <Key className="text-primary" />}
                {passwordStep === 1 ? 'Récupération de mot de passe' : 'Vérification du code'}
              </h2>
              <button onClick={() => { setShowForgotModal(false); resetPasswordModals(); }} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            {passwordSuccess && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">{passwordSuccess}</div>}
            {passwordError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{passwordError}</div>}

            <form onSubmit={handleForgotPassword}>
              <div className="space-y-4">
                {passwordStep === 1 ? (
                  <div>
                    <label className="block text-sm font-medium mb-2">Email ou numéro de téléphone</label>
                    <input
                      type="text"
                      placeholder="exemple@email.com ou +224 620 980 117"
                      value={passwordData.recoveryEmail || passwordData.recoveryPhone}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.includes('@')) {
                          setPasswordData({...passwordData, recoveryEmail: value, recoveryPhone: ''});
                        } else {
                          setPasswordData({...passwordData, recoveryPhone: value, recoveryEmail: ''});
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Code de validation</label>
                      <input
                        type="text"
                        placeholder="Entrez le code reçu"
                        value={passwordData.verificationCode}
                        onChange={(e) => setPasswordData({...passwordData, verificationCode: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Nouveau mot de passe</label>
                      <div className="relative">
                        <input
                          type={showNewResetPassword ? "text" : "password"}
                          value={passwordData.newPasswordAfterReset}
                          onChange={(e) => setPasswordData({...passwordData, newPasswordAfterReset: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewResetPassword(!showNewResetPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showNewResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Confirmer le nouveau mot de passe</label>
                      <div className="relative">
                        <input
                          type={showConfirmResetPassword ? "text" : "password"}
                          value={passwordData.confirmNewPasswordAfterReset}
                          onChange={(e) => setPasswordData({...passwordData, confirmNewPasswordAfterReset: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmResetPassword(!showConfirmResetPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showConfirmResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (passwordStep === 2) {
                        setPasswordStep(1);
                        setPasswordError('');
                      } else {
                        setShowForgotModal(false);
                        resetPasswordModals();
                      }
                    }}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    {passwordStep === 2 ? 'Retour' : 'Annuler'}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? 'Chargement...' : passwordStep === 1 ? <><Send size={16} /> Envoyer le code</> : <><Key size={16} /> Réinitialiser</>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
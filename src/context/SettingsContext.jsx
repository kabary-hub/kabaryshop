// src/context/SettingsContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

// Valeurs par défaut de toutes les informations modifiables du site
const DEFAULT_SETTINGS = {
  siteName: 'Kabary Shop',
  siteTagline: 'Mode authentique & élégante',
  // Logo du site (URL d'image, modifiable depuis les paramètres admin)
  siteLogo: '',
  // Section héro (image + textes modifiables pour changer la promo à tout moment)
  heroImage: '',
  heroTitle: '',
  heroSubtitle: '',
  siteDescription:
    'Votre destination privilégiée pour une mode authentique et élégante. Qualité supérieure et tendances actuelles pour sublimer votre style au quotidien.',
  siteEmail: 'contact@kabary.com',
  adminEmail: 'admin@kabary.com',
  sitePhone: '+224 123 456 789',
  whatsapp: '+224 620 980 117',
  siteAddress: 'Cobayah-Conakry, Rep. Guinée',
  currency: 'GNF', // Devise par défaut
  language: 'fr',
  social: {
    facebook: 'https://www.facebook.com/boubacarelbalde',
    instagram: '',
    linkedin: 'https://www.linkedin.com/in/boubacar-siddighi-balde',
    whatsapp: 'https://wa.me/224620980117',
    telegram: 'https://t.me/kabary620',
  },
  deliveryInfo: 'Livraison sous 24h/48h dans tout Conakry',
  freeDeliveryThreshold: 300000, // Livraison gratuite à partir de ce montant (GNF)
  // ===== Page contact =====
  contactPageTitle: 'Contactez-nous',
  contactPageSubtitle: 'Nous sommes à votre écoute pour toute question',
  contactSectionTitle: 'Nos Coordonnées',
  contactWhatsappNote: 'Disponible sur WhatsApp 24h/7j',
  contactThankTitle: 'Merci de votre visite !',
  contactThankMessage:
    "N'hésitez pas à nous contacter pour vos commandes spéciales ou pour en savoir plus sur nos délais de livraison. Votre satisfaction est notre priorité.",
  notifications: {
    email: true,
    push: false,
    orders: true,
    promotions: false,
  },
  security: {
    twoFactor: false,
    twoFactorEmailTemplate: '', // Template EmailJS dédié (vide = défaut)
    sessionTimeout: 30,
  },
};

// Fusionne les paramètres sauvegardés avec les valeurs par défaut pour que les
// nouveaux champs existent toujours (rétrocompatibilité).
const mergeWithDefaults = (saved) => {
  const merged = { ...DEFAULT_SETTINGS, ...(saved || {}) };
  merged.social = { ...DEFAULT_SETTINGS.social, ...(saved?.social || {}) };
  merged.notifications = {
    ...DEFAULT_SETTINGS.notifications,
    ...(saved?.notifications || {}),
  };
  merged.security = {
    ...DEFAULT_SETTINGS.security,
    ...(saved?.security || {}),
  };
  return merged;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    let saved = null;
    try {
      const raw = localStorage.getItem('kabary_settings');
      saved = raw ? JSON.parse(raw) : null;
    } catch {
      saved = null;
    }
    return mergeWithDefaults(saved);
  });

  useEffect(() => {
    localStorage.setItem('kabary_settings', JSON.stringify(settings));
    // Mettre à jour le titre du document
    document.title = `${settings.siteName} - Administration`;
    // Déclencher un événement pour notifier les composants du changement de devise
    window.dispatchEvent(new CustomEvent('currencyChanged', { detail: settings.currency }));
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
  }, [settings]);

  const updateSettings = (newSettings) => {
    setSettings(mergeWithDefaults(newSettings));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
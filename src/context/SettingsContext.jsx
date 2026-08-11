// src/context/SettingsContext.jsx
/* eslint-disable react-refresh/only-export-components -- contexte React : un
   Provider (composant) + un hook useSettings() dans le même fichier. */
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
  // Section héro — plusieurs publications personnalisables (carrousel) :
  // chaque diapositive { id, image, title, description } devient une slide.
  heroSlides: [],
  // Anciens champs uniques, conservés pour rétrocompatibilité (1 seule promo)
  heroImage: '',
  heroTitle: '',
  heroSubtitle: '',
  siteDescription:
    'Votre destination privilégiée pour une mode authentique et élégante. Qualité supérieure et tendances actuelles pour sublimer votre style au quotidien.',
  siteEmail: 'boubacarelbalde94@gmail.com',
  adminEmail: 'boubacarelbalde94@gmail.com',
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
  // Mode « Ouverture prochaine » : quand true, le site affiche l'écran
  // d'attente (ComingSoon) à la place de la boutique. Bascule en 1 clic
  // depuis Admin → sidebar → « Mettre le site en ligne / Masquer le site ».
  // Synchronisé sur tous les appareils via Supabase (kabary_settings).
  comingSoon: true,
  // Ouverture automatique planifiée (date ISO, ex. '2026-09-15T09:00:00.000Z') :
  // quand la date est atteinte, le site passe en ligne tout seul (voir
  // src/utils/visibility.js). Vide = aucune planification.
  scheduledOpenDate: '',
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
    // Déclencher un événement pour notifier les composants du changement de devise
    window.dispatchEvent(new CustomEvent('currencyChanged', { detail: settings.currency }));
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
  }, [settings]);

  // Relire les paramètres quand ils changent depuis un autre onglet ou un
  // autre appareil (synchronisation Supabase). Comparaison par valeur pour
  // éviter toute boucle.
  useEffect(() => {
    const handleExternalChange = () => {
      try {
        const raw = localStorage.getItem('kabary_settings');
        if (!raw) return;
        if (JSON.stringify(settings) === raw) return; // rien de nouveau
        const parsed = mergeWithDefaults(JSON.parse(raw));
        if (JSON.stringify(parsed) !== JSON.stringify(settings)) {
          setSettings(parsed);
        }
      } catch {
        // stockage indisponible ou JSON invalide : on ignore
      }
    };
    window.addEventListener('settingsUpdated', handleExternalChange);
    window.addEventListener('storage', handleExternalChange);
    return () => {
      window.removeEventListener('settingsUpdated', handleExternalChange);
      window.removeEventListener('storage', handleExternalChange);
    };
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
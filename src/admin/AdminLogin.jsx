// src/admin/AdminLogin.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, Store, ShieldCheck, RefreshCw, KeyRound, Loader } from 'lucide-react';
import {
  sendEmail,
  buildTwoFactorEmail,
} from '../utils/emailService';
import { useSettings } from '../context/SettingsContext';
import { logActivity } from '../utils/history';
import {
  setStaffSession,
  hasAdminAccess,
  isAdminLoggedIn,
  isStaffLoggedIn,
} from '../utils/auth';
import { isValidPassword, PASSWORD_ERROR_MESSAGE } from '../utils/validation';
import {
  getSupabase,
  ensureSupabaseAuth,
  fetchCloudAppUsers,
  AUTH_EVENT,
} from '../services/db';

// Clés de session pour la 2FA
const PENDING_KEY = 'admin_2fa_pending';
const CODE_KEY = 'admin_2fa_code';
const CODE_EXPIRY_KEY = 'admin_2fa_expiry';
const CODE_DELIVERY_KEY = 'admin_2fa_delivery'; // 'email' | 'demo'

// Grande image e-commerce imposante affichée à gauche de la page de connexion
// (attire naturellement les utilisateurs à revenir se connecter).
// Fallback : image locale de la newsletter si le réseau est indisponible.
import fallbackLoginImage from '../assets/website/banner.jpeg';
const LOGIN_IMAGE =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=80';

// Habillage de la page de connexion : grande image à gauche, formulaire à droite
const AuthShell = ({ siteName, children }) => (
  <div className="min-h-screen flex items-stretch bg-gradient-to-br from-slate-900 via-gray-800 to-gray-900">
    {/* Grande image e-commerce (desktop) */}
    <div className="hidden lg:block lg:w-1/2 relative min-h-screen overflow-hidden">
      <img
        src={LOGIN_IMAGE}
        alt="Boutique e-commerce moderne et élégante"
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = fallbackLoginImage;
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10"></div>
      <div className="absolute bottom-10 left-10 right-10 text-white">
        <p className="text-3xl font-extrabold drop-shadow-lg">Bienvenue sur {siteName}</p>
        <p className="mt-2 text-sm text-white/85 drop-shadow max-w-md">
          Une expérience shopping élégante : qualité, tendances et livraison
          rapide dans toute la Guinée.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
            ✓ Livraison 24h/48h
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
            ✓ Paiement Mobile Money
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
            ✓ Qualité garantie
          </span>
        </div>
      </div>
    </div>

    {/* Formulaire */}
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      {children}
    </div>
  </div>
);

const AdminLogin = () => {
  const { settings } = useSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState('password'); // 'password' | 'verify'
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState(''); // info sur la méthode d'envoi
  const [demoCode, setDemoCode] = useState(''); // repli : code affiché si l'email ne part pas
  const [sending, setSending] = useState(false);
  const [resendIn, setResendIn] = useState(0); // compte à rebours du renvoi (s)
  const navigate = useNavigate();

  const twoFactorEnabled = !!settings.security?.twoFactor;
  const adminEmail = settings.adminEmail || settings.siteEmail || 'boubacarelbalde94@gmail.com';
  const siteName = settings.siteName || 'Kabary Shop';

  // Récupérer le mot de passe stocké dans localStorage
  // (admin figé dans le code : mot de passe initial Diaraye@620,
  // modifiable ensuite dans Admin > Paramètres > Sécurité)
  const getStoredPassword = () => {
    const storedPassword = localStorage.getItem('admin_password');
    return storedPassword || 'Diaraye@620'; // Valeur par défaut si rien n'est stocké
  };

  const clean2FA = () => {
    localStorage.removeItem(CODE_KEY);
    localStorage.removeItem(CODE_EXPIRY_KEY);
    localStorage.removeItem(CODE_DELIVERY_KEY);
    sessionStorage.removeItem(PENDING_KEY);
  };

  // Envoie le code de vérification (email Resend, sinon repli démo)
  const sendVerificationCode = async () => {
    const codeValue = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 5 * 60 * 1000; // valide 5 minutes

    localStorage.setItem(CODE_KEY, codeValue);
    localStorage.setItem(CODE_EXPIRY_KEY, String(expiry));

    let delivery = 'demo';
    const res = await sendEmail({
      to: adminEmail,
      fromName: siteName,
      subject: `Code de vérification ${siteName}`,
      html: buildTwoFactorEmail({ siteName, code: codeValue, adminEmail }),
    });
    if (res.ok) {
      delivery = 'email';
    } else {
      // Envoi du code 2FA impossible → repli sur le code démo affiché
    }

    localStorage.setItem(CODE_DELIVERY_KEY, delivery);

    return {
      code: codeValue,
      delivery,
      message:
        delivery === 'email'
          ? `Un code de vérification a été envoyé à ${adminEmail}.`
          : 'Envoi par email indisponible : utilisez le code de secours ci-dessous.',
    };
  };

  // Profil admin en attente de validation 2FA (pour finaliser la connexion)
  const pendingProfileRef = useRef(null);

  // Démarrer le compte à rebours du renvoi
  const resendIntervalRef = useRef(null);
  const startResendTimer = () => {
    setResendIn(30);
    if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    resendIntervalRef.current = setInterval(() => {
      setResendIn((prev) => {
        if (prev <= 1) {
          clearInterval(resendIntervalRef.current);
          resendIntervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Nettoyer l'intervalle si le composant est démonté
  useEffect(() => {
    return () => {
      if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    };
  }, []);

  // 🔐 Accès restreint : la page de connexion n'est accessible QUE via le
  // raccourci clavier secret (Ctrl+Shift+A) ou le lien discret du footer,
  // qui posent un jeton d'accès (grantAdminAccess). Si un client tape
  // /admin/login directement dans l'URL, il est redirigé vers la page 404
  // (aucune trace de l'existence de l'espace admin).
  // (Une session admin/staff active ou une 2FA en cours reste autorisée.)
  const accessGranted = (() => {
    try {
      return (
        hasAdminAccess() ||
        isAdminLoggedIn() ||
        isStaffLoggedIn() ||
        sessionStorage.getItem('admin_2fa_pending') === '1'
      );
    } catch {
      return false;
    }
  })();

  if (!accessGranted) {
    return <Navigate to="/404" replace />;
  }

  // Recherche n'importe quel utilisateur enregistré (tous rôles) avec cet email
  const findAppUser = () => {
    try {
      const users = JSON.parse(localStorage.getItem('app_users') || '[]');
      const normalized = email.trim().toLowerCase();
      return (
        users.find((u) => (u.email || '').trim().toLowerCase() === normalized) ||
        null
      );
    } catch {
      return null;
    }
  };

  // Termine la connexion admin : 2FA si activée, sinon connexion directe
  const completeAdminLogin = async (profile) => {
    if (twoFactorEnabled) {
      pendingProfileRef.current = profile;
      setSending(true);
      try {
        const result = await sendVerificationCode();
        sessionStorage.setItem(PENDING_KEY, '1');
        setCode('');
        setCodeError('');
        setDeliveryInfo(result.message);
        setDemoCode(result.delivery === 'demo' ? result.code : '');
        setStep('verify');
        startResendTimer();
      } catch (err) {
        setError(`Erreur lors de l'envoi du code : ${err.message || err}`);
      } finally {
        setSending(false);
      }
      return;
    }
    finishAdminSession(profile, false);
  };

  // Vide le formulaire après une connexion réussie : ainsi, même si le
  // navigateur restaure la page (cache de navigation avant/arrière),
  // l'utilisateur ne retrouve pas ses identifiants pré-remplis.
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError('');
  };

  // Établit la session admin et redirige vers /admin
  const finishAdminSession = (profile, via2FA) => {
    localStorage.setItem('adminToken', 'dummy-token');
    localStorage.setItem('isAuthenticated', 'true');
    sessionStorage.setItem('adminLoggedIn', 'true');
    sessionStorage.setItem('admin_2fa_verified', '1');
    // Si l'admin connecté est un utilisateur créé, afficher son identité
    // dans tout le panneau (Utilisateurs, Commandes, Historiques…)
    if (profile && profile.name) {
      localStorage.setItem(
        'current_admin_user',
        JSON.stringify({
          id: profile.id || 1,
          name: profile.name,
          role: 'admin',
          avatar: profile.avatar || '',
        })
      );
      window.dispatchEvent(new Event('userChanged'));
    }
    logActivity({
      type: 'auth',
      action: via2FA ? 'connexion (2FA validée)' : 'connexion',
      subject: profile?.name || email,
      details: via2FA
        ? 'Connexion réussie à l\'administration avec vérification en deux étapes'
        : 'Connexion réussie à l\'administration',
      actor: { name: profile?.name || 'Admin', role: 'admin' },
    });
    resetForm();
    navigate('/admin');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();

    // ====================================================================
    // 1) ADMIN PRINCIPAL (email configuré dans Paramètres > Coordonnées)
    // ====================================================================
    if (trimmedEmail === adminEmail.toLowerCase()) {
      const storedPassword = getStoredPassword();

      // Le mot de passe admin doit respecter la règle 8-15 caractères
      if (storedPassword && !isValidPassword(storedPassword)) {
        setError(PASSWORD_ERROR_MESSAGE);
        return;
      }

      if (password !== storedPassword) {
        // Repli : le mot de passe cloud (Supabase Auth) peut être différent
        // si l'admin a changé son mot de passe sur un autre appareil.
        const res = await ensureSupabaseAuth(trimmedEmail, password);
        if (!res.ok) {
          setError('Email ou mot de passe incorrect');
          logActivity({
            type: 'auth',
            action: 'échec de connexion',
            subject: email || 'Inconnu',
            details: 'Tentative de connexion admin avec identifiants incorrects',
          });
          return;
        }
        await completeAdminLogin(null);
        return;
      }

      // Mot de passe local correct → 2FA si activée, puis connexion.
      // Active aussi la session cloud (compte créé automatiquement si besoin).
      // On ATTEND la session Supabase Auth : sans elle, les données
      // sensibles (utilisateurs, logs…) ne seraient PAS synchronisées entre
      // les ordinateurs (poussée refusée par la politique RLS).
      const cloudSession = await ensureSupabaseAuth(trimmedEmail, password);
      if (cloudSession && !cloudSession.ok) {
        // Session cloud non établie — la synchronisation multi-appareils des
        // données admin (utilisateurs, logs…) restera inactive sur cet appareil.
        // Sans notification bloquante : la connexion admin fonctionne quand même.
      }
      await completeAdminLogin(findAppUser());
      return;
    }

    // ====================================================================
    // 2) AUTRES COMPTES — vérification locale (l'appareil connaît déjà le
    //    compte via app_users synchronisé)
    // ====================================================================
    const foundUser = findAppUser();
    if (foundUser) {
      // Compte bloqué ?
      if (foundUser.status === 'blocked') {
        setError('Ce compte est bloqué. Contactez l\'administrateur.');
        logActivity({
          type: 'auth',
          action: 'échec de connexion (compte bloqué)',
          subject: email || 'Inconnu',
          details: `Tentative de connexion sur le compte bloqué ${foundUser.name}`,
        });
        return;
      }

      // Aucun mot de passe défini par l'administrateur ?
      if (!foundUser.password) {
        setError('Aucun mot de passe défini pour ce compte. L\'administrateur doit en définir un (Admin > Utilisateurs > Modifier).');
        logActivity({
          type: 'auth',
          action: 'échec de connexion (mot de passe manquant)',
          subject: email || 'Inconnu',
          details: `Le compte ${foundUser.name} n'a pas de mot de passe défini`,
        });
        return;
      }

      if (password !== foundUser.password) {
        setError('Email ou mot de passe incorrect');
        logActivity({
          type: 'auth',
          action: 'échec de connexion',
          subject: email || 'Inconnu',
          details: `Tentative de connexion (${foundUser.role}) avec mot de passe incorrect`,
        });
        return;
      }

      // Rôle admin → espace admin
      // (session cloud attendue : nécessaire pour synchroniser les données
      //  sensibles entre les appareils — cf. branche admin principal)
      if (foundUser.role === 'admin') {
        await ensureSupabaseAuth(trimmedEmail, password);
        await completeAdminLogin(foundUser);
        return;
      }

      // Rôle « Utilisateur » : compte client, sans espace admin/staff
      if (foundUser.role === 'Utilisateur') {
        setError(
          'Ce compte est un compte client « Utilisateur » : il n\'a pas accès à l\'espace admin ou staff. Choisissez un rôle Livreur, Préparateur ou Administrateur dans Admin > Utilisateurs.'
        );
        logActivity({
          type: 'auth',
          action: 'échec de connexion (compte client)',
          subject: email || 'Inconnu',
          details: `Tentative de connexion du compte client ${foundUser.name}`,
        });
        return;
      }

      // Livreur / préparateur → espace staff
      // (session cloud attendue : nécessaire pour synchroniser les données)
      await ensureSupabaseAuth(trimmedEmail, password);
      setStaffSession(foundUser.id);
      logActivity({
        type: 'auth',
        action: 'connexion',
        subject: foundUser.name,
        details: `Connexion réussie à l'espace ${foundUser.role === 'livreur' ? 'livreur' : 'préparateur'}`,
        actor: { name: foundUser.name, role: foundUser.role },
      });
      resetForm();
      navigate('/staff/orders');
      return;
    }

    // ====================================================================
    // 3) APPAREIL NEUF — le compte n'est pas encore sur cet appareil :
    //    l'identité est vérifiée par Supabase Auth (compte cloud créé au
    //    préalable par l'admin lors de la création de l'utilisateur)
    // ====================================================================
    const sb = getSupabase();
    if (sb) {
      const { error: authError } = await sb.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (authError) {
        const msg = String(authError.message || '');
        if (/blocked|disabled|banned/i.test(msg)) {
          setError('Ce compte est bloqué. Contactez l\'administrateur.');
        } else if (/not confirmed/i.test(msg)) {
          setError('Ce compte n\'est pas confirmé. Contactez l\'administrateur.');
        } else {
          setError('Email ou mot de passe incorrect');
        }
        logActivity({
          type: 'auth',
          action: 'échec de connexion',
          subject: email || 'Inconnu',
          details: 'Identifiants non reconnus sur cet appareil (vérification Supabase)',
        });
        return;
      }

      // Déclenche le rechargement des données sensibles (app_users,
      // commandes, logs…) maintenant que la session Supabase est active.
      window.dispatchEvent(new Event(AUTH_EVENT));

      // Connecté → récupère la fiche du compte depuis le nuage
      const cloudUsers = await fetchCloudAppUsers();
      const cloudUser = (cloudUsers || []).find(
        (u) => (u.email || '').trim().toLowerCase() === trimmedEmail,
      );
      if (!cloudUser) {
        setError('Compte introuvable dans l\'espace admin. Contactez l\'administrateur.');
        return;
      }
      if (cloudUser.status === 'blocked') {
        setError('Ce compte est bloqué. Contactez l\'administrateur.');
        logActivity({
          type: 'auth',
          action: 'échec de connexion (compte bloqué)',
          subject: email || 'Inconnu',
          details: `Tentative de connexion sur le compte bloqué ${cloudUser.name}`,
        });
        return;
      }

      // Mémorise les utilisateurs localement pour les prochaines visites
      try {
        const existing = JSON.parse(localStorage.getItem('app_users') || '[]');
        const merged = [
          cloudUser,
          ...existing.filter((u) => String(u.id) !== String(cloudUser.id)),
        ];
        localStorage.setItem('app_users', JSON.stringify(merged));
        window.dispatchEvent(new Event('userChanged'));
      } catch {
        // stockage indisponible
      }

      if (cloudUser.role === 'admin') {
        await completeAdminLogin(cloudUser);
        return;
      }
      if (cloudUser.role === 'livreur' || cloudUser.role === 'preparateur') {
        setStaffSession(cloudUser.id);
      logActivity({
        type: 'auth',
        action: 'connexion',
        subject: cloudUser.name,
        details: `Connexion réussie à l'espace ${cloudUser.role === 'livreur' ? 'livreur' : 'préparateur'} (nouvel appareil)`,
        actor: { name: cloudUser.name, role: cloudUser.role },
      });
      resetForm();
      navigate('/staff/orders');
      return;
      }

      setError('Ce compte est un compte client « Utilisateur » : il n\'a pas accès à l\'espace admin ou staff.');
      return;
    }

    // ---- Supabase non configuré : aucune autre source d'identité ----
    setError('Email ou mot de passe incorrect');
    logActivity({
      type: 'auth',
      action: 'échec de connexion',
      subject: email || 'Inconnu',
      details: 'Tentative de connexion avec identifiants incorrects',
    });
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    setSending(true);
    setCodeError('');
    try {
      const result = await sendVerificationCode();
      setDeliveryInfo(result.message);
      setDemoCode(result.delivery === 'demo' ? result.code : '');
      startResendTimer();
    } catch (err) {
      setCodeError(`Erreur : ${err.message || err}`);
    } finally {
      setSending(false);
    }
  };

  const handleVerify = (e) => {
    e.preventDefault();
    setCodeError('');

    const savedCode = localStorage.getItem(CODE_KEY);
    const expiry = Number(localStorage.getItem(CODE_EXPIRY_KEY) || 0);

    if (!savedCode || Date.now() > expiry) {
      setCodeError('Code expiré. Demandez un nouveau code.');
      return;
    }

    if (code.trim() !== savedCode) {
      setCodeError('Code invalide. Vérifiez le code reçu.');
      return;
    }

    // Code valide → connexion
    clean2FA();
    const profile = pendingProfileRef.current;
    pendingProfileRef.current = null;
    finishAdminSession(profile, true);
  };

  const handleBackToPassword = () => {
    clean2FA();
    pendingProfileRef.current = null;
    setStep('password');
    setCode('');
    setCodeError('');
    setDemoCode('');
    setDeliveryInfo('');
    // Le mot de passe est aussi vidé : on revient à l'écran de connexion
    // sans garder d'identifiants pré-remplis.
    setPassword('');
    setShowPassword(false);
  };

  // ==================== ÉCRAN VÉRIFICATION 2FA ====================
  if (step === 'verify') {
    return (
      <AuthShell siteName={siteName}>
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <ShieldCheck size={28} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold">Vérification en deux étapes</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              Entrez le code à 6 chiffres pour confirmer votre identité
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Code de vérification</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                autoFocus
                required
                className="w-full px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {codeError && (
                <div className="mt-2 p-3 bg-red-100 text-red-700 text-sm rounded-lg">
                  {codeError}
                </div>
              )}
            </div>

            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-sm text-emerald-700 dark:text-emerald-300">
              <p className="flex items-start gap-2">
                <KeyRound size={16} className="shrink-0 mt-0.5" />
                <span>{deliveryInfo}</span>
              </p>
              {demoCode && (
                <p className="mt-2 font-mono font-bold text-lg text-center tracking-widest bg-white dark:bg-gray-800 rounded py-1.5">
                  {demoCode}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleBackToPassword}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
              >
                ← Retour
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendIn > 0 || sending}
                className="inline-flex items-center gap-1.5 text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <RefreshCw size={14} className={sending ? 'animate-spin' : ''} />
                {resendIn > 0 ? `Renvoi dans ${resendIn}s` : 'Renvoyer le code'}
              </button>
            </div>

            <button
              type="submit"
              disabled={code.length !== 6}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
            >
              Vérifier et se connecter
            </button>
          </form>
        </div>
      </AuthShell>
  );
  }

  // ==================== ÉCRAN MOT DE PASSE ====================
  return (
    <AuthShell siteName={siteName}>
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Store size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold">Admin {siteName}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Connectez-vous pour accéder au panneau d'administration
          </p>
          {twoFactorEnabled && (
            <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              <ShieldCheck size={14} />
              Authentification à deux facteurs activée
            </span>
          )}
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={adminEmail}
                required
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 à 15 caractères"
                minLength={8}
                maxLength={15}
                required
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label="Afficher ou masquer le mot de passe"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full bg-primary hover:bg-secondary text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <Loader size={18} className="animate-spin" />
                Envoi du code...
              </>
            ) : twoFactorEnabled ? (
              <>
                <ShieldCheck size={18} />
                Se connecter
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>
      </div>
    </AuthShell>
  );
};

export default AdminLogin;

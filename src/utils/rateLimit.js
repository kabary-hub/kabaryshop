// src/utils/rateLimit.js
// Limitation du nombre de tentatives de connexion (anti brute-force).
//
// Règle : MAX_ATTEMPTS tentatives échouées dans une fenêtre de WINDOW_MS
// → blocage de BLOCK_MS millisecondes.
// Le compteur est réinitialisé après une connexion réussie.

const STORAGE_KEY = "login_rate_limit";

const MAX_ATTEMPTS = 5;       // nombre max de tentatives
const WINDOW_MS = 5 * 60 * 1000;  // fenêtre de 5 minutes
const BLOCK_MS = 5 * 60 * 1000;   // blocage de 5 minutes

// Lit l'état du rate limit depuis localStorage
const getState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { attempts: [], blockedUntil: 0 };
  } catch {
    return { attempts: [], blockedUntil: 0 };
  }
};

// Sauvegarde l'état
const saveState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // stockage indisponible
  }
};

// Vérifie si l'utilisateur est actuellement bloqué
// Retourne { blocked: boolean, remainingSeconds: number }
export const checkRateLimit = () => {
  const state = getState();
  const now = Date.now();

  // Si bloqué et la fenêtre de blocage n'est pas expirée
  if (state.blockedUntil > now) {
    return {
      blocked: true,
      remainingSeconds: Math.ceil((state.blockedUntil - now) / 1000),
    };
  }

  // Nettoyer les tentatives hors de la fenêtre
  const recentAttempts = (state.attempts || []).filter(
    (t) => now - t < WINDOW_MS
  );

  if (recentAttempts.length >= MAX_ATTEMPTS) {
    // Blocage : première détection du dépassement
    const newState = {
      attempts: recentAttempts,
      blockedUntil: now + BLOCK_MS,
    };
    saveState(newState);
    return {
      blocked: true,
      remainingSeconds: Math.ceil(BLOCK_MS / 1000),
    };
  }

  return { blocked: false, remainingSeconds: 0 };
};

// Enregistre une tentative échouée
export const recordFailedAttempt = () => {
  const state = getState();
  const now = Date.now();

  // Si déjà bloqué, on ne fait rien de plus
  if (state.blockedUntil > now) return;

  const recentAttempts = (state.attempts || []).filter(
    (t) => now - t < WINDOW_MS
  );
  recentAttempts.push(now);

  const newState = {
    attempts: recentAttempts,
    blockedUntil: recentAttempts.length >= MAX_ATTEMPTS ? now + BLOCK_MS : 0,
  };
  saveState(newState);
};

// Réinitialise le compteur après une connexion réussie
export const resetRateLimit = () => {
  saveState({ attempts: [], blockedUntil: 0 });
};

// src/utils/rateLimit.js
// Rate limiting simple basé sur localStorage pour prévenir le spam

const RATE_LIMITS = {
  order: {
    maxRequests: 3,
    windowMs: 10 * 60 * 1000, // 10 minutes
    key: 'rate_limit_order',
  },
  newsletter: {
    maxRequests: 3,
    windowMs: 24 * 60 * 60 * 1000, // 24 heures
    key: 'rate_limit_newsletter',
  },
  contact: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 heure
    key: 'rate_limit_contact',
  },
  emailTest: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 heure
    key: 'rate_limit_email_test',
  },
};

// Stockage des timestamps des requêtes
const getRequestLog = (key) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRequestLog = (key, timestamps) => {
  try {
    localStorage.setItem(key, JSON.stringify(timestamps));
  } catch {
    // localStorage indisponible
  }
};

export const checkRateLimit = (type) => {
  const config = RATE_LIMITS[type];
  if (!config) {
    return { allowed: true, reason: null };
  }

  const now = Date.now();
  const timestamps = getRequestLog(config.key);

  // Filtrer les timestamps hors de la fenêtre
  const recentTimestamps = timestamps.filter((ts) => now - ts < config.windowMs);

  if (recentTimestamps.length >= config.maxRequests) {
    const oldestInWindow = recentTimestamps[0];
    const retryAfter = Math.ceil((config.windowMs - (now - oldestInWindow)) / 1000);
    return {
      allowed: false,
      reason: `Limite atteinte. Réessayez dans ${retryAfter} secondes.`,
      retryAfter,
      resetAt: oldestInWindow + config.windowMs,
    };
  }

  // Ajouter le timestamp actuel
  recentTimestamps.push(now);
  saveRequestLog(config.key, recentTimestamps);

  const remaining = config.maxRequests - recentTimestamps.length;
  return {
    allowed: true,
    remaining,
    resetAt: now + config.windowMs,
  };
};

export const resetRateLimit = (type) => {
  const config = RATE_LIMITS[type];
  if (config) {
    saveRequestLog(config.key, []);
  }
};

// Enregistrer un échec pour le rate limiting global (utilisé pour AdminLogin)
export const recordFailedAttempt = () => {
  const key = 'rate_limit_admin_login';
  const maxAttempts = 5;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  
  try {
    const stored = localStorage.getItem(key);
    const timestamps = stored ? JSON.parse(stored) : [];
    const now = Date.now();
    
    // Garder uniquement les timestamps dans la fenêtre
    const recentTimestamps = timestamps.filter((ts) => now - ts < windowMs);
    recentTimestamps.push(now);
    
    saveRequestLog(key, recentTimestamps);
    
    return {
      allowed: recentTimestamps.length <= maxAttempts,
      remaining: Math.max(0, maxAttempts - recentTimestamps.length),
      blocked: recentTimestamps.length > maxAttempts,
    };
  } catch {
    return { allowed: true, remaining: maxAttempts, blocked: false };
  }
};

export const resetAdminLoginRateLimit = () => {
  saveRequestLog('rate_limit_admin_login', []);
};

export const getRateLimitInfo = (type) => {
  const config = RATE_LIMITS[type];
  if (!config) {
    return null;
  }

  const timestamps = getRequestLog(config.key);
  const now = Date.now();
  const recentTimestamps = timestamps.filter((ts) => now - ts < config.windowMs);

  return {
    type,
    maxRequests: config.maxRequests,
    windowMs: config.windowMs,
    currentRequests: recentTimestamps.length,
    remaining: config.maxRequests - recentTimestamps.length,
    resetAt: recentTimestamps.length > 0
      ? recentTimestamps[0] + config.windowMs
      : now + config.windowMs,
  };
};

// Hook React pour utiliser le rate limiting dans les composants
export const useRateLimit = (type) => {
  const [info, setInfo] = React.useState(() => getRateLimitInfo(type));

  const check = () => {
    const result = checkRateLimit(type);
    setInfo({
      type,
      maxRequests: RATE_LIMITS[type].maxRequests,
      windowMs: RATE_LIMITS[type].windowMs,
      currentRequests: RATE_LIMITS[type].maxRequests - result.remaining,
      remaining: result.remaining,
      resetAt: result.resetAt,
      allowed: result.allowed,
      reason: result.reason,
      retryAfter: result.retryAfter,
    });
    return result;
  };

  const reset = () => {
    resetRateLimit(type);
    setInfo(getRateLimitInfo(type));
  };

  return { check, reset, info };
};

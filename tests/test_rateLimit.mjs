// tests/test_rateLimit.mjs
// Tests unitaires pour le rate limiting admin login (recordFailedAttempt).
// Exécution : node tests/test_rateLimit.mjs
//
// ⚠️ Ces tests nécessitent un environnement avec localStorage.
// On simule localStorage avec un objet en mémoire.

// ============================================================
// Simulation de localStorage pour Node.js
// ============================================================
const storage = {};
const localStorageSimulator = {
  getItem: (key) => storage[key] || null,
  setItem: (key, value) => { storage[key] = value; },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
};

// Injecter dans le scope global avant d'importer le module
global.localStorage = localStorageSimulator;
global.window = { localStorage: localStorageSimulator };

import { recordFailedAttempt, resetAdminLoginRateLimit } from '../src/utils/rateLimit.js';

// Clé localStorage utilisée par recordFailedAttempt pour le rate limiting admin login
const ADMIN_LOGIN_KEY = 'rate_limit_admin_login';
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

let passed = 0;
let failed = 0;

const assert = (condition, message) => {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.log(`  ❌ ${message}`);
  }
};

// Lit l'état actuel du rate limiting admin login depuis le stockage simulé
const getAdminLoginState = () => {
  try {
    const stored = localStorageSimulator.getItem(ADMIN_LOGIN_KEY);
    const timestamps = stored ? JSON.parse(stored) : [];
    const now = Date.now();
    const recent = timestamps.filter((ts) => now - ts < WINDOW_MS);
    return {
      blocked: recent.length > MAX_ATTEMPTS,
      count: recent.length,
    };
  } catch {
    return { blocked: false, count: 0 };
  }
};

console.log('\n🧪 Tests de rate limiting (admin login)\n');

// ============================================================
// Test 1 : État initial (pas de blocage)
// ============================================================
console.log('1️⃣ État initial :');

resetAdminLoginRateLimit();
const initial = getAdminLoginState();
assert(initial.blocked === false, 'Pas bloqué au démarrage');
assert(initial.count === 0, 'Aucune tentative enregistrée');

// ============================================================
// Test 2 : Tentatives échouées (< 5)
// ============================================================
console.log('\n2️⃣ Tentatives échouées (< 5) :');

resetAdminLoginRateLimit();
for (let i = 0; i < 4; i++) {
  recordFailedAttempt();
}
const after4 = getAdminLoginState();
assert(after4.blocked === false, '4 tentatives → pas encore bloqué');
assert(after4.count === 4, '4 tentatives enregistrées');

// ============================================================
// Test 3 : 5 tentatives = seuil atteint mais pas encore bloqué
// ============================================================
console.log('\n3️⃣ 5 tentatives (seuil) :');

resetAdminLoginRateLimit();
for (let i = 0; i < 5; i++) {
  recordFailedAttempt();
}
const after5 = getAdminLoginState();
assert(after5.blocked === false, '5 tentatives → seuil atteint mais pas bloqué');
assert(after5.count === 5, '5 tentatives enregistrées');

// ============================================================
// Test 4 : 6 tentatives → blocage
// ============================================================
console.log('\n4️⃣ 6 tentatives (dépassement) :');

resetAdminLoginRateLimit();
for (let i = 0; i < 6; i++) {
  recordFailedAttempt();
}
const after6 = getAdminLoginState();
assert(after6.blocked === true, '6 tentatives → bloqué');
assert(after6.count === 6, '6 tentatives enregistrées');

// Vérifier que recordFailedAttempt renvoie bien blocked=true
const lastResult = recordFailedAttempt();
assert(lastResult.blocked === true, 'recordFailedAttempt renvoie blocked=true après 7 tentatives');

// ============================================================
// Test 5 : Réinitialisation après connexion réussie
// ============================================================
console.log('\n5️⃣ Réinitialisation après connexion :');

resetAdminLoginRateLimit();
for (let i = 0; i < 3; i++) {
  recordFailedAttempt();
}
// Vérifier qu'il y a bien 3 tentatives avant reset
const beforeReset = getAdminLoginState();
assert(beforeReset.count === 3, '3 tentatives avant réinitialisation');

resetAdminLoginRateLimit();
const afterReset = getAdminLoginState();
assert(afterReset.blocked === false, 'Réinitialisé → plus bloqué');
assert(afterReset.count === 0, 'Aucune tentative après réinitialisation');

// ============================================================
// Test 6 : Plus de 6 tentatives → toujours bloqué
// ============================================================
console.log('\n6️⃣ Plus de 6 tentatives :');

resetAdminLoginRateLimit();
for (let i = 0; i < 10; i++) {
  recordFailedAttempt();
}
const after10 = getAdminLoginState();
assert(after10.blocked === true, '10 tentatives → toujours bloqué');
assert(after10.count === 10, '10 tentatives enregistrées');
assert(after10.count === 10, '10 tentatives enregistrées');

// ============================================================
// Résumé
// ============================================================
console.log(`\n📊 Résultat : ${passed} passed, ${failed} failed\n`);

process.exit(failed > 0 ? 1 : 0);

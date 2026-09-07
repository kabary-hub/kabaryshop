// tests/test_rateLimit.mjs
// Tests unitaires pour l'utilitaire de rate limiting.
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

// Maintenant on peut importer le module
// Note: on importe le fichier directement avec les bonnes valeurs
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '../src/utils/rateLimit.js';

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

console.log('\n🧪 Tests de rate limiting\n');

// ============================================================
// Test 1 : État initial (pas de blocage)
// ============================================================
console.log('1️⃣ État initial :');

resetRateLimit();
const initial = checkRateLimit();
assert(initial.blocked === false, 'Pas bloqué au démarrage');
assert(initial.remainingSeconds === 0, 'Pas de temps restant');

// ============================================================
// Test 2 : Tentatives échouées (< 5)
// ============================================================
console.log('\n2️⃣ Tentatives échouées (< 5) :');

resetRateLimit();
for (let i = 0; i < 4; i++) {
  recordFailedAttempt();
}
const after4 = checkRateLimit();
assert(after4.blocked === false, '4 tentatives → pas encore bloqué');

// ============================================================
// Test 3 : Blocage après 5 tentatives
// ============================================================
console.log('\n3️⃣ Blocage après 5 tentatives :');

resetRateLimit();
for (let i = 0; i < 5; i++) {
  recordFailedAttempt();
}
const after5 = checkRateLimit();
assert(after5.blocked === true, '5 tentatives → bloqué');
assert(after5.remainingSeconds > 0, 'Temps restant affiché');
assert(after5.remainingSeconds <= 300, 'Temps restant ≤ 5 minutes');

// ============================================================
// Test 4 : Réinitialisation après connexion réussie
// ============================================================
console.log('\n4️⃣ Réinitialisation après connexion :');

resetRateLimit();
for (let i = 0; i < 3; i++) {
  recordFailedAttempt();
}
resetRateLimit();
const afterReset = checkRateLimit();
assert(afterReset.blocked === false, 'Réinitialisé → plus bloqué');
assert(afterReset.remainingSeconds === 0, 'Temps restant = 0');

// ============================================================
// Test 5 : Plus de 5 tentatives → toujours bloqué
// ============================================================
console.log('\n5️⃣ Plus de 5 tentatives :');

resetRateLimit();
for (let i = 0; i < 10; i++) {
  recordFailedAttempt();
}
const after10 = checkRateLimit();
assert(after10.blocked === true, '10 tentatives → toujours bloqué');

// ============================================================
// Résumé
// ============================================================
console.log(`\n📊 Résultat : ${passed} passed, ${failed} failed\n`);

process.exit(failed > 0 ? 1 : 0);

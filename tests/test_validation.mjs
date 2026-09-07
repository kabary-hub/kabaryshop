// tests/test_validation.mjs
// Tests unitaires pour les utilitaires de validation.
// Exécution : node tests/test_validation.mjs

import { cleanPhone, isValidPhone, isValidPassword } from '../src/utils/validation.js';

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

console.log('\n🧪 Tests de validation\n');

// ============================================================
// cleanPhone
// ============================================================
console.log('📱 cleanPhone :');

assert(cleanPhone('620 98 01 17') === '620980117', 'Supprime les espaces');
assert(cleanPhone('+224 620 98 01 17') === '224620980117', 'Supprime le + et les espaces');
assert(cleanPhone('(620) 98-01-17') === '620980117', 'Supprime les parenthèses et tirets');
assert(cleanPhone('620.98.01.17') === '620980117', 'Supprime les points');
assert(cleanPhone('') === '', 'Chaîne vide retourne vide');
assert(cleanPhone(null) === '', 'Null retourne vide');
assert(cleanPhone(undefined) === '', 'Undefined retourne vide');

// ============================================================
// isValidPhone
// ============================================================
console.log('\n📞 isValidPhone :');

assert(isValidPhone('620980117') === true, '9 chiffres → valide');
assert(isValidPhone('620 98 01 17') === true, '9 chiffres avec espaces → valide');
assert(isValidPhone('+224620980117') === true, '12 chiffres avec +224 → valide');
assert(isValidPhone('6209801171234') === true, '13 chiffres → valide');
assert(isValidPhone('12345678') === false, '8 chiffres → invalide (trop court)');
assert(isValidPhone('123456789012345') === false, '15 chiffres → invalide (trop long)');
assert(isValidPhone('') === false, 'Chaîne vide → invalide');
assert(isValidPhone('abc') === false, 'Lettres → invalide');
assert(isValidPhone('123abc') === false, 'Mélange lettres/chiffres → invalide');

// ============================================================
// isValidPassword
// ============================================================
console.log('\n🔒 isValidPassword :');

assert(isValidPassword('Diaraye@620') === true, '11 caractères → valide');
assert(isValidPassword('12345678') === true, '8 caractères minimum → valide');
assert(isValidPassword('123456789012345') === true, '15 caractères maximum → valide');
assert(isValidPassword('1234567') === false, '7 caractères → invalide (trop court)');
assert(isValidPassword('1234567890123456') === false, '16 caractères → invalide (trop long)');
assert(isValidPassword('') === false, 'Chaîne vide → invalide');
assert(isValidPassword(null) === false, 'Null → invalide');
assert(isValidPassword(undefined) === false, 'Undefined → invalide');

// ============================================================
// Résumé
// ============================================================
console.log(`\n📊 Résultat : ${passed} passed, ${failed} failed\n`);

process.exit(failed > 0 ? 1 : 0);

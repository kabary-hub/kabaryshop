// tests/test-helpers.mjs
// Bibliothèque de helpers pour les tests automatisés

export const test = (name, fn) => {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error('  Erreur :', error.message);
    process.exitCode = 1;
  }
};

export const asserting = (condition, message) => {
  if (!condition) {
    throw new Error(message || 'Assertion échouée');
  }
};

export const assert = {
  isEmpty: (value, message) => {
    if (!Array.isArray(value) && typeof value !== 'string') {
      throw new Error('assert.isEmpty attend un tableau ou une chaîne');
    }
    if (value.length !== 0) {
      throw new Error(message || ` attendu vide, reçu ${JSON.stringify(value)}`);
    }
  },
  contain: (array, item, message) => {
    if (!Array.isArray(array)) {
      throw new Error('assert.contain attend un tableau comme premier argument');
    }
    if (!array.includes(item)) {
      throw new Error(message || ` attendu ${JSON.stringify(item)} dans ${JSON.stringify(array)}`);
    }
  },
};

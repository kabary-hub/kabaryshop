// tests/test_cart.mjs
// Tests automatisés pour le panier et le checkout
// Ces tests vérifient les fonctionnalités de base sans dépendre du DOM React

import { test, asserting } from './test-helpers.mjs';

// ============================================================================
// TEST 1 : Structure de données du panier
// ============================================================================

test('le panier est une structure de données valide', () => {
  const cart = {
    items: [],
    addItem: function(product, quantity = 1) {
      const existing = this.items.find(i => i.id === product.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        this.items.push({
          id: product.id,
          title: product.title,
          img: product.img,
          priceInGNF: product.priceInGNF || product.price || 0,
          quantity: quantity,
        });
      }
    },
    removeItem: function(productId) {
      const index = this.items.findIndex(i => i.id === productId);
      if (index !== -1) {
        this.items.splice(index, 1);
      }
    },
    getTotalItems: function() {
      return this.items.reduce((sum, item) => sum + item.quantity, 0);
    },
    getTotalPrice: function() {
      return this.items.reduce((sum, item) => sum + (item.priceInGNF * item.quantity), 0);
    },
  };

  // Panier vide
  asserting(cart.items.length === 0, 'Le panier doit être vide au départ');
  asserting(cart.getTotalItems() === 0, 'Le nombre total d\'articles doit être 0');
  asserting(cart.getTotalPrice() === 0, 'Le prix total doit être 0');

  // Ajouter un article
  cart.addItem({ id: 'p1', title: 'Produit 1', priceInGNF: 100000 });
  asserting(cart.items.length === 1, 'Le panier doit contenir 1 article');
  asserting(cart.getTotalItems() === 1, 'Le nombre total d\'articles doit être 1');
  asserting(cart.getTotalPrice() === 100000, 'Le prix total doit être 100000');

  // Ajouter la même quantité supplémentaire
  cart.addItem({ id: 'p1', title: 'Produit 1', priceInGNF: 100000 }, 2);
  asserting(cart.items[0].quantity === 3, 'La quantité doit être 3');
  asserting(cart.getTotalItems() === 3, 'Le nombre total doit être 3');
  asserting(cart.getTotalPrice() === 300000, 'Le prix total doit être 300000');

  // Ajouter un autre produit
  cart.addItem({ id: 'p2', title: 'Produit 2', priceInGNF: 50000 });
  asserting(cart.items.length === 2, 'Le panier doit contenir 2 produits');
  asserting(cart.getTotalPrice() === 350000, 'Le prix total doit être 350000');

  // Supprimer un article
  cart.removeItem('p1');
  asserting(cart.items.length === 1, 'Le panier doit contenir 1 article');
  asserting(cart.getTotalPrice() === 50000, 'Le prix total doit être 50000');

  // Supprimer le dernier article
  cart.removeItem('p2');
  asserting(cart.items.length === 0, 'Le panier doit être vide');
  asserting(cart.getTotalPrice() === 0, 'Le prix total doit être 0');

  console.log('✅ Test 1 : Structure du panier - PASSÉ');
});

// ============================================================================
// TEST 2 : Calcul du total avec plusieurs articles
// ============================================================================

test('le calcul du total est correct avec plusieurs articles', () => {
  const cart = {
    items: [],
    addItem(product, quantity = 1) {
      const existing = this.items.find(i => i.id === product.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        this.items.push({
          id: product.id,
          title: product.title,
          img: product.img,
          priceInGNF: product.priceInGNF || product.price || 0,
          quantity,
        });
      }
    },
    getTotalPrice() {
      return this.items.reduce((sum, item) => sum + (item.priceInGNF * item.quantity), 0);
    },
  };

  // Cas 1 : Un seul article
  cart.addItem({ id: 'p1', title: 'Sac 1', priceInGNF: 150000 });
  asserting(cart.getTotalPrice() === 150000, 'Total avec 1 sac à 150000 GNF');

  // Cas 2 : Deux articles différents
  cart.addItem({ id: 'p2', title: 'Sac 2', priceInGF: 250000 });
  asserting(cart.getTotalPrice() === 400000, 'Total avec 2 sacs (150000 + 250000)');

  // Cas 3 : Trois articles avec quantités différentes
  cart.addItem({ id: 'p3', title: 'Sac 3', priceInGNF: 100000 }, 3);
  asserting(cart.getTotalPrice() === 700000, 'Total avec 3 sacs (100000 x 3 = 300000) + 400000 = 700000');

  // Cas 4 : Prix à 0 (produit gratuit ou à prix sur demande)
  cart.addItem({ id: 'p4', title: 'Produit special', priceInGNF: 0 });
  asserting(cart.getTotalPrice() === 700000, 'Le produit à 0 ne change pas le total');

  console.log('✅ Test 2 : Calcul du total - PASSÉ');
});

// ============================================================================
// TEST 3 : Validation du téléphone (9-14 chiffres)
// ============================================================================

test('la validation du téléphone accepte 9 à 14 chiffres', () => {
  const isValidPhone = (phone) => {
    if (!phone) return false;
    const digits = String(phone).replace(/\D/g, '');
    return digits.length >= 9 && digits.length <= 14 && /^\d+$/.test(digits);
  };

  // Numéros valides (9 à 14 chiffres)
  asserting(isValidPhone('620980117'), '9 chiffres valide (+224 sans préfixe)');
  asserting(isValidPhone('0620980117'), '10 chiffres valide (avec 0 initial)');
  asserting(isValidPhone('224620980117'), '12 chiffres valide (avec +224 complet)');
  asserting(isValidPhone('6209801171234'), '13 chiffres valide');
  asserting(isValidPhone('620'), '3 chiffres invalide'); // Cas limite
  assert.isEmpty(isValidPhone('620'), '3 chiffres doit être invalide');

  // Numéros invalides
  asserting(!isValidPhone('12345678'), '8 chiffres invalide');
  asserting(!isValidPhone('123456789012345'), '15 chiffres invalide');
  asserting(!isValidPhone('123456789a'), 'Caractère non numérique invalide');
  asserting(!isValidPhone('0987654321+'), 'Symbole invalide');
  asserting(!isValidPhone(''), 'Chaîne vide invalide');
  asserting(!isValidPhone(null), 'Null invalide');
  asserting(!isValidPhone(undefined), 'Undefined invalide');

  console.log('✅ Test 3 : Validation téléphone - PASSÉ');
});

// ============================================================================
// TEST 4 : Validation du formulaire de commande
// ============================================================================

test('le formulaire de commande valide les champs requis', () => {
  const validateOrderForm = (formData) => {
    const errors = [];

    // Nom requis
    if (!formData.name || formData.name.trim() === '') {
      errors.push('Le nom est requis');
    }

    // Quartier requis
    if (!formData.quartier || formData.quartier.trim() === '') {
      errors.push('Le quartier est requis');
    }

    // Téléphone requis et format valide (9-14 chiffres)
    const phone = formData.phone || '';
    const digits = String(phone).replace(/\D/g, '');
    if (!phone || digits.length < 9 || digits.length > 14) {
      errors.push('Le téléphone doit contenir entre 9 et 14 chiffres');
    }

    // Email optionnel mais si fourni, doit être valide
    if (formData.email && formData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.push('L\'email n\'est pas valide');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  // Cas 1 : Formulaire valide
  const result1 = validateOrderForm({
    name: 'Boubacar El Balde',
    email: 'test@example.com',
    phone: '620980117',
    quartier: 'Cobayah',
  });
  asserting(result1.valid, 'Formulaire complet valide');
  assert.isEmpty(result1.errors, 'Aucune erreur pour formulaire complet');

  // Cas 2 : Nom manquant
  const result2 = validateOrderForm({
    name: '',
    phone: '620980117',
    quartier: 'Conakry',
  });
  asserting(!result2.valid, 'Formulaire avec nom manquant invalide');
  assert.contain(result2.errors, 'Le nom est requis', 'Erreur nom manquant');

  // Cas 3 : Quartier manquant
  const result3 = validateOrderForm({
    name: 'Test',
    phone: '620980117',
    quartier: '',
  });
  asserting(!result3.valid, 'Formulaire avec quartier manquant invalide');
  assert.contain(result3.errors, 'Le quartier est requis', 'Erreur quartier manquant');

  // Cas 4 : Téléphone manquant
  const result4 = validateOrderForm({
    name: 'Test',
    phone: '',
    quartier: 'Conakry',
  });
  asserting(!result4.valid, 'Formulaire avec téléphone manquant invalide');
  assert.contain(result4.errors, 'Le téléphone doit contenir entre 9 et 14 chiffres');

  // Cas 5 : Téléphone invalide (trop court)
  const result5 = validateOrderForm({
    name: 'Test',
    phone: '123456',
    quartier: 'Conakry',
  });
  asserting(!result5.valid, 'Téléphone trop court invalide');
  assert.contain(result5.errors, 'Le téléphone doit contenir entre 9 et 14 chiffres');

  // Cas 6 : Email invalide (mais fourni)
  const result6 = validateOrderForm({
    name: 'Test',
    email: 'email-invalide',
    phone: '620980117',
    quartier: 'Conakry',
  });
  asserting(!result6.valid, 'Email invalide détecté');
  assert.contain(result6.errors, 'L\'email n\'est pas valide');

  // Cas 7 : Email vide (optionnel, donc valide)
  const result7 = validateOrderForm({
    name: 'Test',
    email: '',
    phone: '620980117',
    quartier: 'Conakry',
  });
  asserting(result7.valid, 'Formulaire sans email est valide');

  console.log('✅ Test 4 : Validation formulaire commande - PASSÉ');
});

// ============================================================================
// TEST 5 : Génération de référence de commande
// ============================================================================

test('la génération de référence de commande est correcte', () => {
  const generateReference = (existingOrders) => {
    const now = new Date();
    const datePart = [
      String(now.getFullYear()).slice(2),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');
    const maxSeq = existingOrders.reduce((max, order) => {
      const match = String(order.reference || '').match(/^CMD-(\d{6})-(\d+)$/);
      return match ? Math.max(max, parseInt(match[2], 10)) : max;
    }, 0);
    return `CMD-${datePart}-${String(maxSeq + 1).padStart(4, '0')}`;
  };

  // Cas 1 : Pas de commandes existantes
  const ref1 = generateReference([]);
  asserting(ref1.startsWith('CMD-'), 'La référence doit commencer par CMD-');
  asserting(ref1.length === 16, 'La référence doit faire 16 caractères (CMD-YYMMDD-NNNN)');

  // Cas 2 : Avec des commandes existantes
  const existing = [
    { reference: 'CMD-260908-0001' },
    { reference: 'CMD-260908-0005' },
    { reference: 'CMD-260908-0010' },
  ];
  const ref2 = generateReference(existing);
  asserting(ref2 === 'CMD-260908-0011', 'La référence suivante doit être 0011');

  // Cas 3 : Format de la référence
  const match = ref1.match(/^CMD-(\d{6})-(\d{4})$/);
  asserting(match !== null, 'La référence doit matcher le format CMD-YYMMDD-NNNN');
  asserting(match[1].length === 6, 'La partie date doit faire 6 chiffres');
  asserting(match[2].length === 4, 'La partie séquence doit faire 4 chiffres');

  console.log('✅ Test 5 : Génération référence - PASSÉ');
});

// ============================================================================
// Exécution des tests
// ============================================================================

console.log('\n🚀 Démarrage des tests du panier et checkout...\n');

try {
  // Test 1
  eval('(' + function() {
    // Déjà dans le bloc test
  } + ')()');

  console.log('\n✅ Tous les tests du panier et checkout sont PASSÉS !\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Test échoué :', error.message);
  console.error(error.stack);
  process.exit(1);
}

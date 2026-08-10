// Validation légère (sans build) : reproduit la logique de prix de createProducts
import { PRODUCT_DEFAULT_PRICES } from '../src/utils/productDefaultPrices.js';

// Normalise les espaces (y compris l'espace insécable U+00A0 produit par toLocaleString)
const norm = (s) => s.replace(/[\s\u00A0]+/g, ' ').trim();

const simulate = (fileName) => {
  const fullFileName = fileName.split('.')[0];
  const parts = fullFileName.split('_');
  const rawPrice = parts[1];
  const fallbackPrice = PRODUCT_DEFAULT_PRICES[fileName] || 0;
  return {
    priceInGNF: rawPrice ? Number(rawPrice) : fallbackPrice,
    prix: rawPrice
      ? `${Number(rawPrice).toLocaleString().replace(/,/g, ' ')} GNF`
      : fallbackPrice
        ? `${fallbackPrice.toLocaleString().replace(/,/g, ' ')} GNF`
        : 'À définir GNF',
  };
};

const tests = [
  ['femme1.jpg', '180 000 GNF'],
  ['femmetalon11.jpg', '200 000 GNF'],
  ['hommecostum14.jpg', '400 000 GNF'],
  ['chemise bleu dégradé_90000.jpg', '90 000 GNF'],
  ['litclassic complet.jpg', '1 200 000 GNF'],
  ['istockphoto-1030018750-612x612.jpg', '450 000 GNF'],
  ['enfant1.jpg', '70 000 GNF'],
  ['Polo Urbain Soft_75000 .jpg', '75 000 GNF'],
];

let ok = true;
for (const [file, expected] of tests) {
  const r = simulate(file);
  const pass = norm(r.prix) === norm(expected);
  if (!pass) ok = false;
  console.log(`${pass ? '✅' : '❌'} ${file} → ${norm(r.prix)}  (attendu : ${norm(expected)})`);
}

const zero = Object.entries(PRODUCT_DEFAULT_PRICES).filter(([, v]) => !v);
console.log(`\nFichiers sans prix dans le mapping : ${zero.length}`);
console.log(ok && zero.length === 0 ? '✅ TOUT EST CORRECT' : '❌ PROBLÈME DÉTECTÉ');
process.exit(ok && zero.length === 0 ? 0 : 1);

// scripts/assign-prices.mjs
// ============================================================
// Script d'attribution de prix aux produits du catalogue Kabary Shop
// ------------------------------------------------------------
// Les produits par défaut sont générés à partir des NOMS des fichiers
// images, au format  « nom_prix.jpg »  (ex : Chemise Élégance Casual_120000.jpg).
// Quand un fichier ne contient PAS de prix dans son nom, le produit affiche
// « À définir GNF » — c'est le cas de la quasi-totalité du catalogue.
//
// Ce script :
//   1. Scanne les 7 dossiers d'images (femmes, hommes, enfants, électroniques,
//      meubles, tendances, ventes) ;
//   2. Pour chaque fichier SANS prix dans le nom, estime un prix en GNF à
//      partir de sa catégorie et de mots-clés (talon, sac, lit, chemise…) ;
//   3. Génère « src/utils/productDefaultPrices.js » : un mapping
//      nom_de_fichier → prix, utilisé comme prix de secours par
//      createProducts() quand le nom ne contient pas de prix.
//
// Relançable à volonté : il régénère entièrement le fichier de mapping.
// Usage :  node scripts/assign-prices.mjs
// ============================================================

import { readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_ROOT = join(__dirname, "..", "src", "assets");

// Extensions images réellement chargées par import.meta.glob
const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;

// ------------------------------------------------------------
// 1. Dossiers du catalogue → catégorie (slug minuscule)
// ------------------------------------------------------------
const FOLDERS = [
  { dir: "products-women",  category: "femmes" },
  { dir: "hommeimg",        category: "hommes" },
  { dir: "enfantimg",       category: "enfants" },
  { dir: "electroniqueimg", category: "electroniques" },
  { dir: "meubleimg",       category: "meubles" },
  { dir: "tendanceimg",     category: "tendances" },
  { dir: "venteimg",        category: "ventes" },
];

// ------------------------------------------------------------
// 2. Grille d'estimation — prix de base par catégorie (GNF)
// ------------------------------------------------------------
const BASE_PRICE_BY_CATEGORY = {
  femmes:        180_000,
  hommes:        150_000,
  enfants:        70_000,
  electroniques: 450_000,
  meubles:       450_000,
  tendances:     200_000,
  ventes:        180_000,
};

// ------------------------------------------------------------
// 3. Mots-clés → prix (GNF). Règles ordonnées : la PREMIÈRE
//    correspondance gagne, donc on liste du plus spécifique
//    au plus générique.
// ------------------------------------------------------------
const KEYWORD_RULES = [
  // --- Femmes ---
  { match: /mari/i,              price: 800_000, label: "robe de mariage" },
  { match: /talon/i,             price: 200_000, label: "talons" },
  { match: /sac/i,               price: 250_000, label: "sac à main" },
  { match: /lunett/i,            price: 150_000, label: "lunettes" },
  { match: /colier/i,            price: 120_000, label: "collier" },
  { match: /soutien/i,           price: 100_000, label: "soutien-gorge" },
  { match: /sexy/i,              price: 130_000, label: "lingerie" },
  // --- Hommes ---
  { match: /costum/i,            price: 400_000, label: "costume" },
  { match: /chemise/i,           price: 120_000, label: "chemise" },
  { match: /chauss/i,            price: 250_000, label: "chaussures" },
  { match: /pant/i,              price: 120_000, label: "pantalon" },
  { match: /polo/i,              price:  90_000, label: "polo" },
  { match: /ensemble/i,          price: 200_000, label: "ensemble" },
  { match: /pack/i,              price: 150_000, label: "pack" },
  { match: /collection/i,        price: 120_000, label: "collection" },
  // --- Enfants ---
  { match: /chaussur/i,          price:  80_000, label: "chaussures enfant" },
  { match: /pantal/i,            price:  60_000, label: "pantalon enfant" },
  // --- Électroniques ---
  { match: /restaurateur/i,      price: 350_000, label: "équipement restauration" },
  // --- Meubles ---
  { match: /lit/i,               price: 1_200_000, label: "lit" },
  { match: /armoir/i,            price:   700_000, label: "armoire" },
  { match: /bureau/i,            price:   600_000, label: "bureau" },
  { match: /table/i,             price:   500_000, label: "table" },
  { match: /chaise/i,            price:   200_000, label: "chaises" },
  { match: /fauteuil/i,          price:   250_000, label: "fauteuil" },
  { match: /salon/i,             price:   900_000, label: "salon" },
  { match: /coiffeuse/i,         price:   450_000, label: "coiffeuse" },
  { match: /comptoir/i,          price:   550_000, label: "comptoir" },
  { match: /mobilier/i,          price:   500_000, label: "mobilier" },
  { match: /meuble/i,            price:   450_000, label: "meuble" },
  { match: /cafetariat/i,        price:   450_000, label: "cafétariat" },
  { match: /reception|reunions/i, price:  700_000, label: "table réception/réunion" },
  { match: /vip/i,               price:   800_000, label: "salon VIP" },
  { match: /rotin/i,             price:   400_000, label: "rotin" },
  { match: /evier/i,             price:   300_000, label: "évier" },
  // --- Femmes & hommes (génériques) ---
  { match: /femme/i,             price: 180_000, label: "article femme" },
  { match: /homme/i,             price: 150_000, label: "article homme" },
  { match: /enfant/i,            price:  70_000, label: "article enfant" },
];

// ------------------------------------------------------------
// 4. Extraction du prix depuis le nom du fichier (si présent)
//    Format :  nom_123456.ext  → 123456
// ------------------------------------------------------------
const extractPriceFromName = (fileName) => {
  const base = fileName.replace(IMAGE_EXT, "");
  const parts = base.split("_");
  const last = (parts[parts.length - 1] || "").trim();
  if (last && /^\d{3,}$/.test(last)) {
    return Number(last);
  }
  return null; // pas de prix dans le nom
};

// ------------------------------------------------------------
// 5. Estimation d'un prix par mots-clés (+ repli sur la catégorie)
// ------------------------------------------------------------
const estimatePrice = (fileName, category) => {
  const base = fileName.replace(IMAGE_EXT, "");
  for (const rule of KEYWORD_RULES) {
    if (rule.match.test(base)) return rule.price;
  }
  return BASE_PRICE_BY_CATEGORY[category] || 150_000;
};

// ------------------------------------------------------------
// 6. Génération du mapping
// ------------------------------------------------------------
const map = {};      // nom de fichier (avec extension) → prix GNF
const priced = [];   // fichiers dont le prix venait déjà du nom
const assigned = []; // fichiers auxquels un prix a été attribué

// Dossiers « de sélection » (tendances/ventes) : ils contiennent des copies
// d'images des autres catégories. Leur prix doit être le MÊME que celui de la
// catégorie d'origine — on ne doit donc pas écraser un prix déjà trouvé.
const SELECTION_FOLDERS = new Set(["tendanceimg", "venteimg"]);

for (const { dir, category } of FOLDERS) {
  const folderPath = join(ASSETS_ROOT, dir);
  let files = [];
  try {
    files = readdirSync(folderPath).filter((f) => IMAGE_EXT.test(f));
  } catch {
    console.warn(`⚠️  Dossier introuvable, ignoré : ${dir}`);
    continue;
  }

  for (const file of files) {
    const fromName = extractPriceFromName(file);
    const price = fromName ?? estimatePrice(file, category);
    // Les dossiers de sélection n'écrasent pas un prix déjà attribué
    if (!SELECTION_FOLDERS.has(dir) || !(file in map)) {
      map[file] = price;
    }
    if (fromName !== null) {
      priced.push({ file, price, category });
    } else {
      assigned.push({ file, price, category });
    }
  }
}

// ------------------------------------------------------------
// 7. Écriture du fichier src/utils/productDefaultPrices.js
// ------------------------------------------------------------
const lines = [];
lines.push("// src/utils/productDefaultPrices.js");
lines.push("// ⚠️  FICHIER GÉNÉRÉ AUTOMATIQUEMENT — ne pas modifier à la main.");
lines.push("// Source : scripts/assign-prices.mjs  (relancez « node scripts/assign-prices.mjs »");
lines.push("// après avoir ajouté de nouvelles images au catalogue).");
lines.push("//");
lines.push("// Prix de secours (GNF) pour les produits dont le nom de fichier ne contient");
lines.push("// pas de prix. createProducts() les utilise quand « nom_prix » est absent.");
lines.push("export const PRODUCT_DEFAULT_PRICES = {");
Object.entries(map)
  .sort(([a], [b]) => a.localeCompare(b))
  .forEach(([file, price]) => {
    lines.push(`  ${JSON.stringify(file)}: ${price},`);
  });
lines.push("};");

writeFileSync(
  join(__dirname, "..", "src", "utils", "productDefaultPrices.js"),
  lines.join("\n") + "\n",
  "utf8",
);

// ------------------------------------------------------------
// 8. Rapport
// ------------------------------------------------------------
console.log("✅ Mapping généré : src/utils/productDefaultPrices.js");
console.log(`   - ${Object.keys(map).length} fichiers image au total`);
console.log(`   - ${priced.length} produits avaient déjà un prix dans leur nom`);
console.log(`   - ${assigned.length} produits ont reçu un prix estimé`);
console.log("");
console.log("   Exemples de prix attribués :");
assigned.slice(0, 12).forEach(({ file, price, category }) => {
  console.log(`     • ${file}  →  ${price.toLocaleString("fr-FR")} GNF  (${category})`);
});

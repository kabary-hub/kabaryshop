// scripts/optimize-images.mjs
// ============================================================
// Optimisation des images du site Kabary Shop
// ------------------------------------------------------------
// Problème : 460 images pour ~55 Mo (certaines de 1,5 à 2,6 Mo)
// alors qu'elles s'affichent en cartes de 300-450 px.
//
// Ce script :
//   1. Scanne les dossiers d'images (src/assets + avatars public/) ;
//   2. Redimensionne chaque image à la largeur réellement affichée
//      (aucun agrandissement) ;
//   3. Convertit en WebP (qualité réglable par dossier) ;
//   4. Supprime l'original SEULEMENT si le WebP est plus léger
//      (sinon l'original est conservé).
//
// ⚠️  L'extension change (.jpg/.jpeg/.png → .webp) : les imports du
// code ont été mis à jour en conséquence, et productDefaultPrices.js
// est régénéré par « node scripts/assign-prices.mjs ».
// Les fichiers originaux restent récupérables via git.
//
// Usage :  node scripts/optimize-images.mjs
// ============================================================

import { readdirSync, readFileSync, statSync, unlinkSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_ROOT = join(__dirname, "..", "src", "assets");
const PUBLIC_ROOT = join(__dirname, "..", "public");

// Extensions à convertir (les .webp déjà présents sont aussi recompressés)
const RASTER_EXT = /\.(png|jpe?g)$/i;
const WEBP_EXT = /\.webp$/i;

// ------------------------------------------------------------
// 1. Configuration par dossier : largeur max + qualité WebP
//    (largeur = taille d'affichage réelle × 2 pour les écrans retina)
// ------------------------------------------------------------
const FOLDERS = [
  // --- Catalogue produits (cartes de ~300-450 px → 900 px max) ---
  { dir: "products-women",  maxWidth: 900, quality: 78 },
  { dir: "hommeimg",        maxWidth: 900, quality: 78 },
  { dir: "enfantimg",       maxWidth: 900, quality: 78 },
  { dir: "electroniqueimg", maxWidth: 900, quality: 78 },
  { dir: "meubleimg",       maxWidth: 900, quality: 78 },
  { dir: "tendanceimg",     maxWidth: 900, quality: 78 },
  { dir: "venteimg",        maxWidth: 900, quality: 78 },
  // --- Décoratives ---
  { dir: "background-pages", maxWidth: 1920, quality: 82 }, // bannières pleine largeur
  { dir: "hero",             maxWidth: 1100, quality: 82 }, // visuels du slider
  { dir: "wintersale",       maxWidth: 1400, quality: 82 },
  { dir: "website",          maxWidth: 1600, quality: 82 }, // bannière email/newsletter
  { dir: "footer",           maxWidth: 400,  quality: 85 }, // petit logo
  { dir: "topproducts",      maxWidth: 600,  quality: 80 },
  { dir: ".",                maxWidth: 400,  quality: 85 }, // Logo.png (racine assets)
];

// Avatars témoignages (public/) : photos rondes de ~60-96 px
const PUBLIC_AVATARS = { maxWidth: 200, quality: 80 };

// ------------------------------------------------------------
// 2. Optimisation d'un fichier (redimensionne + WebP + remplace)
// ------------------------------------------------------------
const optimizeFile = async (filePath, maxWidth, quality, stats) => {
  const before = statSync(filePath).size;
  try {
    // Lire en mémoire d'abord : libère le fichier source immédiatement
    // (nécessaire sous Windows pour réécrire un .webp en place).
    const img = sharp(readFileSync(filePath));
    const meta = await img.metadata();
    const width = meta.width || 0;

    // Jamais d'agrandissement : si l'image est plus étroite que la
    // cible, on ne redimensionne que si elle est réellement trop large.
    const resize = width > maxWidth ? { width: maxWidth } : undefined;

    const data = await img
      .resize(resize)
      .webp({ quality, effort: 4 })
      .toBuffer();

    if (data.length >= before) {
      // Pas de gain → on garde l'original tel quel
      stats.skipped += 1;
      return;
    }

    // Écrire dans un fichier temporaire puis le renommer par-dessus la
    // destination : évite tout verrou de fichier (Windows) et toute
    // suppression accidentelle.
    // ⚠️  Ne supprimer l'original QUE s'il a réellement été remplacé : pour un
    // .webp déjà existant, outPath === filePath (réécriture en place) — un
    // unlinkSync supprimerait le fichier qu'on vient d'écrire.
    const outPath = filePath.replace(RASTER_EXT, ".webp");
    const tmpPath = `${outPath}.tmp`;
    await sharp(data).toFile(tmpPath);
    renameSync(tmpPath, outPath);
    if (outPath !== filePath) {
      unlinkSync(filePath);
    }

    stats.converted += 1;
    stats.bytesBefore += before;
    stats.bytesAfter += data.length;
  } catch (err) {
    stats.failed.push(`${filePath} (${err.message})`);
  }
};

// ------------------------------------------------------------
// 3. Traitement d'un dossier
// ------------------------------------------------------------
const processFolder = async (folderPath, maxWidth, quality, stats, onlyAvatars = false) => {
  let files = [];
  try {
    files = readdirSync(folderPath).filter((f) => RASTER_EXT.test(f) || WEBP_EXT.test(f));
  } catch {
    return; // dossier absent → ignoré
  }

  for (const file of files) {
    const full = join(folderPath, file);
    if (!statSync(full).isFile()) continue;

    // Avatars public : ne prendre que les images « testim* »
    if (onlyAvatars && !/^testimon\d+\./i.test(file)) continue;

    await optimizeFile(full, maxWidth, quality, stats);
  }
};

// ------------------------------------------------------------
// 4. Exécution
// ------------------------------------------------------------
const stats = { converted: 0, skipped: 0, bytesBefore: 0, bytesAfter: 0, failed: [] };

console.log("🖼  Optimisation des images (redimensionnement + WebP)…\n");

for (const { dir, maxWidth, quality } of FOLDERS) {
  const folderPath = join(ASSETS_ROOT, dir);
  const label = dir === "." ? "src/assets (racine)" : `src/assets/${dir}`;
  const before = stats.converted + stats.skipped;
  await processFolder(folderPath, maxWidth, quality, stats);
  const done = stats.converted + stats.skipped;
  if (done > before) {
    console.log(`  ✔ ${label}  →  ${done - before} image(s) traitées`);
  }
}

// Avatars témoignages dans public/
const beforePub = stats.converted + stats.skipped;
await processFolder(PUBLIC_ROOT, PUBLIC_AVATARS.maxWidth, PUBLIC_AVATARS.quality, stats, true);
if (stats.converted + stats.skipped > beforePub) {
  console.log(`  ✔ public/testimon*  →  ${stats.converted + stats.skipped - beforePub} image(s) traitées`);
}

// ------------------------------------------------------------
// 5. Rapport
// ------------------------------------------------------------
console.log("\n📊  Rapport :");
console.log(`   - Images converties : ${stats.converted}`);
console.log(`   - Images conservées  : ${stats.skipped} (déjà légères)`);
const saved = stats.bytesBefore - stats.bytesAfter;
const pct = stats.bytesBefore > 0 ? Math.round((saved / stats.bytesBefore) * 100) : 0;
console.log(
  `   - Poids avant  : ${(stats.bytesBefore / 1024 / 1024).toFixed(1)} Mo\n` +
  `   - Poids après   : ${(stats.bytesAfter / 1024 / 1024).toFixed(1)} Mo\n` +
  `   - Gain          : ${(saved / 1024 / 1024).toFixed(1)} Mo (${pct} %)`,
);

if (stats.failed.length) {
  console.log(`\n⚠️  ${stats.failed.length} échec(s) :`);
  stats.failed.slice(0, 10).forEach((f) => console.log(`   • ${f}`));
}

console.log("\n✅ Terminé. Pensez à relancer :  node scripts/assign-prices.mjs");

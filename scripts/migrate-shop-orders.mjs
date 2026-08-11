// scripts/migrate-shop-orders.mjs
// ============================================================
// Nettoyage des commandes malformées (localStorage « shop_orders »)
// ------------------------------------------------------------
// Le localStorage vit dans le navigateur : ce script propose TROIS modes.
//
//   MODE 1 — CONSOLE (par défaut)
//     node scripts/migrate-shop-orders.mjs
//   → Affiche un bloc JavaScript SELF-CONTAINED à coller dans la console
//     DevTools (F12 → Console) du site, sur l'onglet où les commandes sont
//     stockées. La migration s'exécute immédiatement et affiche un rapport.
//
//   MODE 2 — FICHIER (test / audit)
//     node scripts/migrate-shop-orders.mjs --file dump.json
//   → Lit un export JSON de « shop_orders », nettoie les commandes et écrit
//     « dump.cleaned.json » (le fichier d'origine n'est JAMAIS modifié).
//     Pour obtenir dump.json : console du site → copy(localStorage.getItem('shop_orders'))
//     → coller dans un fichier.
//
//   MODE 3 — APPLY (nettoyage automatique via Chrome en mode debug)
//     node scripts/migrate-shop-orders.mjs --apply [--url <url>] [--port 9222]
//   → Si un Chrome écoute déjà sur le port (lancé avec --remote-debugging-port=9222
//     sur VOTRE profil habituel), le script s'y connecte et nettoie directement
//     vos données. Sinon, il LANCE Chrome en mode debug (profil temporaire,
//     fenêtre visible), ouvre la page du site et exécute la migration dans son
//     localStorage, puis referme Chrome.
//     Options : --url <url>    page à ouvrir/nettoyer (défaut http://localhost:5173/)
//               --port <n>     port de débogage DevTools (défaut 9222)
//               --keep-open    ne pas fermer Chrome à la fin
//               --headless     Chrome en mode headless (sans fenêtre)
//
//   node scripts/migrate-shop-orders.mjs --help
//
// Aucune dépendance externe : protocole DevTools utilisé via le WebSocket
// natif de Node (>= 22) et fetch.
// ============================================================

import { spawn, execSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sanitizeShopOrders } from "../src/utils/orderSanitizer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SANITIZER_PATH = join(__dirname, "..", "src", "utils", "orderSanitizer.js");

// ------------------------------------------------------------
// Rapport lisible dans le terminal
// ------------------------------------------------------------
const printReport = (report) => {
  console.log("");
  console.log("📦 Rapport de migration shop_orders :");
  console.log(`   • ${report.total ?? 0} commande(s) lue(s)`);
  console.log(`   • ${report.dropped ?? 0} entrée(s) invalide(s) supprimée(s)`);
  console.log(`   • ${report.repaired ?? 0} commande(s) réparée(s)`);
  if (report.note) console.log(`   • Note : ${report.note}`);
  if (report.details && report.details.length > 0) {
    console.log("");
    console.log("   Détail des modifications :");
    report.details.slice(0, 15).forEach((d) => {
      console.log(`     - #${d.id ?? "—"} : ${d.changes.join(", ")}`);
    });
    if (report.details.length > 15) {
      console.log(`     … et ${report.details.length - 15} autre(s)`);
    }
  }
};

// ------------------------------------------------------------
// MODE FICHIER
// ------------------------------------------------------------
const runFileMode = (filePath) => {
  let raw;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    console.error(`❌ Impossible de lire le fichier « ${filePath} » :`, err.message);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("❌ JSON invalide dans le fichier :", err.message);
    process.exit(1);
  }

  const { orders, report } = sanitizeShopOrders(parsed);
  const outPath = filePath.replace(/\.json$/i, "") + ".cleaned.json";
  writeFileSync(outPath, JSON.stringify(orders, null, 2) + "\n", "utf8");

  printReport(report);
  console.log("");
  console.log(`✅ Fichier nettoyé écrit : ${outPath}`);
  console.log("   (le fichier d'origine n'a pas été modifié)");
};

// ------------------------------------------------------------
// MODE CONSOLE — génération du bloc à coller dans DevTools
// ------------------------------------------------------------
const stripExports = (source) =>
  source.replace(/^export\s+(const|function|let|var)\s+/gm, "$1 ");

const buildConsoleSnippet = () => {
  const source = readFileSync(SANITIZER_PATH, "utf8");
  // Retirer les mots-clés « export » pour que le code soit collable tel quel
  const sanitizerCode = stripExports(source);

  const lines = [
    "// ============================================================",
    "// MIGRATION shop_orders — commandes malformées",
    "// 1. Ouvrez la page de votre boutique (même domaine que vos données).",
    "// 2. F12 → onglet Console.",
    "// 3. Collez TOUT ce bloc puis Entrée.",
    "// 4. Rechargez la page (F5) : les pages Commandes/Tableau de bord",
    "//    s'afficheront avec les données nettoyées.",
    "// ============================================================",
    "(() => {",
    "  const KEY = 'shop_orders';",
    "",
  ];

  // Intégrer la logique de nettoyage (sans les « export »)
  for (const line of sanitizerCode.split("\n")) {
    lines.push(`  ${line}`);
  }

  lines.push(
    "",
    "  let raw = null;",
    "  try {",
    "    raw = localStorage.getItem(KEY);",
    "  } catch (err) {",
    "    console.error('[migration shop_orders] Stockage inaccessible :', err);",
    "    return;",
    "  }",
    "  if (raw === null) {",
    "    console.log('[migration shop_orders] Aucune commande stockée — rien à nettoyer.');",
    "    return;",
    "  }",
    "",
    "  let parsed;",
    "  try {",
    "    parsed = JSON.parse(raw);",
    "  } catch {",
    "    localStorage.setItem(KEY, JSON.stringify([]));",
    "    console.warn('[migration shop_orders] JSON illisible — liste remplacée par une liste vide.');",
    "    return;",
    "  }",
    "",
    "  const { orders, report } = sanitizeShopOrders(parsed);",
    "  if (report.replaced) {",
    "    localStorage.setItem(KEY, JSON.stringify(orders));",
    "    window.dispatchEvent(new Event('ordersUpdated'));",
    "  }",
    "  console.log('[migration shop_orders]', report);",
    "  console.log(",
    "    report.replaced",
    "      ? '✅ Commandes nettoyées — rechargez la page pour voir le résultat.'",
    "      : 'ℹ️  Aucune commande à corriger.'",
    "  );",
    "})();",
    "",
  );

  return lines.join("\n");
};

const runConsoleMode = () => {
  console.log("");
  console.log("┌──────────────────────────────────────────────────────────────┐");
  console.log("│  MODE CONSOLE — à coller dans DevTools (F12 → Console)      │");
  console.log("└──────────────────────────────────────────────────────────────┘");
  console.log("");
  console.log(buildConsoleSnippet());
  console.log("");
  console.log("Astuce : sur une machine distante (PC de l'admin), collez ce bloc");
  console.log("dans la console du site, sur l'onglet où les commandes sont stockées.");
  console.log("Ou lancez :  node scripts/migrate-shop-orders.mjs --apply");
};

// ------------------------------------------------------------
// MODE APPLY — nettoyage automatique via Chrome (DevTools Protocol)
// ------------------------------------------------------------

// Chemins courants de Chrome selon la plateforme
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  process.env.PROGRAMFILES &&
    join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
  process.env["PROGRAMFILES(X86)"] &&
    join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
  process.env.LOCALAPPDATA &&
    join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const findChromePath = () => {
  for (const candidate of CHROME_CANDIDATES) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return null;
};

// Expression JS SELF-CONTAINED exécutée DANS la page : lit shop_orders,
// nettoie, réécrit si nécessaire et retourne un résultat compact sérialisable.
// Exportée pour pouvoir être testée sans lancer le CLI.
// expectedOrigin : origine attendue (ex. « http://localhost:5176 ») — si
// fournie, l'expression refuse de s'exécuter sur une autre origine (garde
// anti-nettoyage du mauvais site, même si l'onglet navigue entre-temps).
export const buildApplyExpression = (expectedOrigin = "") => {
  const source = readFileSync(SANITIZER_PATH, "utf8");
  const sanitizerCode = stripExports(source);

  const lines = [
    "(() => {",
    "  const KEY = 'shop_orders';",
    "",
    ...(expectedOrigin
      ? [
          `  if (location.origin !== ${JSON.stringify(expectedOrigin)}) {`,
          "    return { ok: false, error: 'Origine inattendue : ' + location.origin };",
          "  }",
          "",
        ]
      : []),
    ...sanitizerCode.split("\n").map((line) => `  ${line}`),
    "",
    "  let raw = null;",
    "  try {",
    "    raw = localStorage.getItem(KEY);",
    "  } catch (err) {",
    "    return { ok: false, error: String(err) };",
    "  }",
    "  if (raw === null) {",
    "    return { ok: true, skipped: true, note: 'Aucune commande stockée sur cette page.' };",
    "  }",
    "",
    "  let parsed;",
    "  try {",
    "    parsed = JSON.parse(raw);",
    "  } catch {",
    "    localStorage.setItem(KEY, JSON.stringify([]));",
    "    return { ok: true, replaced: true, total: 0, dropped: 0, repaired: 0, note: 'JSON illisible — liste remplacée par une liste vide' };",
    "  }",
    "",
    "  const { orders, report } = sanitizeShopOrders(parsed);",
    "  if (report.replaced) {",
    "    localStorage.setItem(KEY, JSON.stringify(orders));",
    "    window.dispatchEvent(new Event('ordersUpdated'));",
    "  }",
    "  return {",
    "    ok: true,",
    "    replaced: report.replaced,",
    "    total: report.total,",
    "    dropped: report.dropped,",
    "    repaired: report.repaired,",
    "    note: report.note || '',",
    "  };",
    "})()",
  ];
  return lines.join("\n");
};

// Envoie une commande DevTools Protocol et attend la réponse correspondante
const sendCdpCommand = (ws, id, method, params = {}) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeEventListener("message", onMessage);
      reject(new Error(`CDP « ${method} » : délai dépassé`));
    }, 20000);
    function onMessage(event) {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.id !== id) return;
      clearTimeout(timer);
      ws.removeEventListener("message", onMessage);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });

// Attend qu'un onglet « page » soit disponible (Chrome vient peut-être de démarrer)
const waitForPageTarget = async (port, origin) => {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}/json/list`);
      if (res.ok) {
        const targets = await res.json();
        const pages = (targets || []).filter((t) => t.type === "page");
        const match =
          pages.find((t) => t.url && new URL(t.url).origin === origin) || pages[0];
        if (match) return match;
      }
    } catch {
      // Chrome pas encore prêt
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Aucun onglet Chrome détecté sur le port ${port}.`);
};

// Attend que la page soit complètement chargée SUR LE BON SITE. Au lancement,
// Chrome expose d'abord un document about:blank (où localStorage est interdit) :
// on attend la vraie page. On vérifie aussi l'origine : on ne nettoie JAMAIS
// le localStorage d'un autre site (onglet détourné, redirection inattendue).
const waitPageReady = async (ws, nextId, origin) => {
  const deadline = Date.now() + 20000;
  let wrongOriginUrl = "";
  while (Date.now() < deadline) {
    const state = await sendCdpCommand(ws, nextId(), "Runtime.evaluate", {
      expression: "({ ready: document.readyState, href: location.href })",
      returnByValue: true,
    });
    const info = state.result?.value;
    if (info && info.ready === "complete" && info.href && !info.href.startsWith("about:")) {
      try {
        if (new URL(info.href).origin === origin) return;
      } catch {
        // URL illisible — on continue d'attendre
      }
      if (!wrongOriginUrl) wrongOriginUrl = info.href;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(
    wrongOriginUrl
      ? `La page s'est chargée sur une autre origine (${wrongOriginUrl}) — le script refuse de nettoyer un autre site.`
      : "La page ne s'est pas chargée à temps (URL, réseau ou onglet fermé).",
  );
};

// Exécute l'expression de nettoyage dans la page ciblée
const runCleanupOnTarget = async (target, origin) => {
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  try {
    let id = 1;
    const nextId = () => id += 1;
    await waitPageReady(ws, nextId, origin);

    const result = await sendCdpCommand(ws, nextId(), "Runtime.evaluate", {
      expression: buildApplyExpression(origin),
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || "Exception JavaScript dans la page");
    }
    return result.result?.value;
  } finally {
    try {
      ws.close();
    } catch {
      // déjà fermé
    }
  }
};

// Ferme proprement Chrome (uniquement si le script l'a lancé lui-même)
const closeBrowser = async (port) => {
  try {
    const res = await fetch(`http://localhost:${port}/json/version`);
    const info = await res.json();
    if (!info.webSocketDebuggerUrl) return;
    const ws = new WebSocket(info.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
    await sendCdpCommand(ws, 1, "Browser.close");
    try {
      ws.close();
    } catch {
      // déjà fermé
    }
  } catch {
    // Chrome déjà fermé ou port indisponible
  }
};

const runApplyMode = async ({ url, port, keepOpen, headless }) => {
  let origin;
  try {
    origin = new URL(url).origin;
  } catch {
    console.error(`❌ URL invalide : « ${url} »`);
    process.exit(1);
  }

  // 1) Un Chrome en mode debug est-il déjà disponible sur ce port ?
  let existing = false;
  try {
    const res = await fetch(`http://localhost:${port}/json/version`);
    existing = res.ok;
  } catch {
    existing = false;
  }

  let child = null;
  let profileDir = null;

  if (existing) {
    console.log(`🔌 Connexion à Chrome déjà en mode debug sur le port ${port}…`);
  } else {
    const chromePath = findChromePath();
    if (!chromePath) {
      console.error(
        "❌ Chrome introuvable. Définissez la variable d'environnement CHROME_PATH",
        "(ex. CHROME_PATH=\"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe\").",
      );
      process.exit(1);
    }
    profileDir = mkdtempSync(join(tmpdir(), "shop-orders-migration-"));
    console.log(`🚀 Lancement de Chrome (mode debug, port ${port}, profil temporaire)…`);
    child = spawn(
      chromePath,
      [
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${profileDir}`,
        "--no-first-run",
        "--no-default-browser-check",
        ...(headless ? ["--headless=new"] : []),
        url,
      ],
      { stdio: "ignore", windowsHide: true },
    );
    child.on("error", (err) => {
      console.error("❌ Impossible de lancer Chrome :", err.message);
      // Nettoyage du profil temporaire AVANT de quitter (le finally ne s'exécute
      // pas avec process.exit).
      if (profileDir) {
        try {
          rmSync(profileDir, { recursive: true, force: true });
        } catch {
          // profil verrouillé — nettoyage best effort
        }
      }
      process.exit(1);
    });
  }

  // 2) Exécution de la migration dans la page. Le bloc finally garantit que
  //    Chrome lancé par le script est TOUJOURS fermé, même en cas d'erreur.
  try {
    const target = await waitForPageTarget(port, origin);
    console.log(`📄 Onglet ciblé : ${target.url || "(page)"}`);
    const result = await runCleanupOnTarget(target, origin);

    if (!result || !result.ok) {
      console.error("❌ La migration n'a pas pu s'exécuter :", result?.error || "réponse inattendue");
      process.exitCode = 1;
    } else if (result.skipped) {
      console.log(`ℹ️  ${result.note || "Aucune commande stockée sur cette page."}`);
      console.log("   → Ouvrez la page de votre boutique dans ce Chrome (et connectez-vous en admin");
      console.log("     si vos données viennent du cloud), puis relancez :  --apply");
    } else {
      printReport({ ...result, details: [] });
      console.log(
        result.replaced
          ? "\n✅ Commandes nettoyées dans le navigateur."
          : "\nℹ️  Aucune commande à corriger.",
      );
    }
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exitCode = 1;
  } finally {
    // 3) Fermeture : uniquement si le script a lancé Chrome lui-même
    if (child && !keepOpen) {
      console.log("🛑 Fermeture de Chrome…");
      try {
        await closeBrowser(port);
      } catch {
        // déjà fermé
      }
      child.kill();
      // Windows : child.kill() ne tue que le processus racine — tuer l'arbre
      // pour éviter des chrome.exe orphelins qui garderaient le port et le profil.
      if (process.platform === "win32") {
        try {
          execSync(`taskkill /F /T /PID ${child.pid}`, { stdio: "ignore" });
        } catch {
          // déjà fermé
        }
      }
      if (profileDir) {
        // Windows : Chrome met un court instant à libérer les fichiers du profil
        for (let attempt = 0; attempt < 5; attempt += 1) {
          try {
            rmSync(profileDir, { recursive: true, force: true });
            break;
          } catch {
            await new Promise((r) => setTimeout(r, 500));
          }
        }
      }
    } else if (child) {
      console.log(`👀 Chrome laissé ouvert (--keep-open). Profil temporaire : ${profileDir}`);
    } else {
      console.log("ℹ️  Chrome existant laissé ouvert (le script ne le ferme pas).");
    }
  }
};

// ------------------------------------------------------------
// Point d'entrée (le module reste importable pour les tests)
// ------------------------------------------------------------
const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage :
  node scripts/migrate-shop-orders.mjs                  → affiche le bloc à coller dans la console DevTools
  node scripts/migrate-shop-orders.mjs --file dump.json → nettoie un export JSON et écrit dump.cleaned.json
  node scripts/migrate-shop-orders.mjs --apply          → nettoie automatiquement via Chrome (mode debug)
      [--url <url>]     page à ouvrir (défaut http://localhost:5173/)
      [--port <n>]      port de débogage DevTools (défaut 9222)
      [--keep-open]     ne pas fermer Chrome à la fin
      [--headless]      Chrome sans fenêtre
  node scripts/migrate-shop-orders.mjs --help           → cette aide`);
    process.exit(0);
  }

  const getOption = (name, fallback) => {
    const i = args.indexOf(name);
    return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
  };

  if (args.includes("--apply")) {
    const port = Number(getOption("--port", "9222"));
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      console.error("❌ Port invalide :", getOption("--port", "9222"));
      process.exit(1);
    }
    await runApplyMode({
      url: getOption("--url", "http://localhost:5173/"),
      port,
      keepOpen: args.includes("--keep-open"),
      headless: args.includes("--headless"),
    });
  } else {
    const fileIndex = args.indexOf("--file");
    if (fileIndex !== -1) {
      const filePath = args[fileIndex + 1];
      if (!filePath) {
        console.error("❌ Argument manquant : --file <chemin.json>");
        process.exit(1);
      }
      runFileMode(filePath);
    } else {
      runConsoleMode();
    }
  }
}

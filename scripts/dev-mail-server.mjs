// scripts/dev-mail-server.mjs
// ============================================================================
// Serveur de développement qui simule la fonction Vercel api/send-mail.js.
//
// Il expose le même contrat HTTP que la fonction Vercel :
//   POST /api/send-mail   { to, toName, fromName, subject, html }
//
// Deux modes :
//   1. RESEND_API_KEY définie (dans l'environnement ou un fichier .env local)
//      → les emails sont VRAIMENT envoyés via Resend (test de bout en bout).
//   2. Sans RESEND_API_KEY (mode par défaut)
//      → les emails sont simulés : sauvegardés dans /dev-emails et
//        consultables dans le navigateur sur http://localhost:3001/dev-emails
//        (idéal pour vérifier le rendu des templates sans consommer le quota).
//
// Le site Vite est branché dessus via un proxy (/api → localhost:3010) :
//   terminal 1 : node scripts/dev-mail-server.mjs
//   terminal 2 : npm run dev
//
// Port par défaut : 3010 (surchargeable via PORT).
// ============================================================================

import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

// ---- Charge un fichier .env local s'il existe (sans dépendance externe) ----
const root = fileURLToPath(new URL("..", import.meta.url));
const envPath = join(root, ".env");
if (existsSync(envPath)) {
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // fichier .env illisible : on continue sans
  }
}

const PORT = Number(process.env.PORT || 3010);
const API_KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";
const REPLY_TO = process.env.EMAIL_REPLY_TO || "";

// Dossier des emails simulés
const DEV_EMAILS_DIR = join(root, "dev-emails");
let simulatedCount = 0;

// ---------------------------------------------------------------------------
// Lecture du corps JSON d'une requête
// ---------------------------------------------------------------------------
const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });

// ---------------------------------------------------------------------------
// En-têtes CORS (utile en cas d'appel direct, hors proxy)
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-send-key",
  "Content-Type": "application/json; charset=utf-8",
};

const sendJson = (res, status, data) => {
  res.writeHead(status, corsHeaders);
  res.end(JSON.stringify(data));
};

// ---------------------------------------------------------------------------
// Envoi réel via Resend (mode 1)
// ---------------------------------------------------------------------------
const sendWithResend = async ({ to, toName = "", fromName = "", subject, html }) => {
  const { Resend } = await import("resend");
  const resend = new Resend(API_KEY);
  const payload = {
    from: fromName ? `${fromName} <${FROM}>` : FROM,
    to: [to],
    subject,
    html,
  };
  if (REPLY_TO) payload.reply_to = REPLY_TO;
  const { data, error } = await resend.emails.send(payload);
  if (error) {
    return { ok: false, message: error.message || "Échec de l'envoi Resend." };
  }
  return { ok: true, message: "Email envoyé (dev → Resend)", id: data?.id };
};

// ---------------------------------------------------------------------------
// Simulation : sauvegarde de l'email dans /dev-emails (mode 2)
// ---------------------------------------------------------------------------
const simulateSend = ({ to, toName = "", fromName = "", subject, html }) => {
  try {
    mkdirSync(DEV_EMAILS_DIR, { recursive: true });
    simulatedCount += 1;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const base = `${stamp}-${simulatedCount}`;
    const htmlFile = join(DEV_EMAILS_DIR, `${base}.html`);
    const metaFile = join(DEV_EMAILS_DIR, `${base}.json`);

    writeFileSync(
      htmlFile,
      `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><title>${subject}</title></head>
<body style="margin:0;padding:16px;font-family:Arial,sans-serif;background:#f1f5f9;">
  <p style="color:#64748b;font-size:12px;">🧪 Email simulé (mode dev) — ${new Date().toLocaleString("fr-FR")}</p>
  <p style="color:#334155;font-size:13px;">À : <strong>${to}</strong>${toName ? ` (${toName})` : ""} · De : ${fromName || FROM} · Sujet : ${subject}</p>
  <hr style="border:none;border-top:1px solid #cbd5e1;"/>
  ${html}
</body></html>`,
      "utf8",
    );
    writeFileSync(metaFile, JSON.stringify({ to, toName, fromName, subject, date: new Date().toISOString() }, null, 2));

    return {
      ok: true,
      message: `Email simulé (aucune RESEND_API_KEY). Voir http://localhost:${PORT}/dev-emails`,
      id: `sim-${simulatedCount}`,
    };
  } catch (err) {
    return { ok: false, message: `Impossible de sauvegarder l'email simulé : ${err.message}` };
  }
};

// ---------------------------------------------------------------------------
// Page de visualisation des emails simulés
// ---------------------------------------------------------------------------
const renderDevEmailsPage = () => {
  const files = existsSync(DEV_EMAILS_DIR)
    ? readdirSync(DEV_EMAILS_DIR).filter((f) => extname(f) === ".html").sort().reverse()
    : [];
  const items = files
    .map((f) => {
      try {
        const meta = JSON.parse(readFileSync(join(DEV_EMAILS_DIR, f.replace(/\.html$/, ".json")), "utf8"));
        return `<li><a href="/dev-emails/${f}" target="_blank">${meta.subject || f}</a>
          <span style="color:#94a3b8;font-size:12px;">→ ${meta.to || "?"} · ${new Date(meta.date).toLocaleString("fr-FR")}</span></li>`;
      } catch {
        return `<li>${f}</li>`;
      }
    })
    .join("");
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><title>Emails simulés</title></head>
<body style="font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px;margin:0;">
  <h1 style="margin:0 0 6px;">📬 Emails simulés (mode dev)</h1>
  <p style="color:#94a3b8;font-size:13px;">
    ${API_KEY ? "✅ RESEND_API_KEY détectée : les emails sont envoyés réellement, cette page est vide." : "Aucune RESEND_API_KEY : les emails sont sauvegardés ici. Passez une commande, abonnez-vous ou testez la 2FA pour les voir apparaître."}
  </p>
  ${files.length ? `<ul style="line-height:2;">${items}</ul>` : "<p style='color:#64748b;'>Aucun email simulé pour le moment.</p>"}
  <hr style="border-color:#334155;margin:24px 0;"/>
  <p style="font-size:12px;color:#64748b;">Serveur de dev email — pour envoyer réellement, créez un fichier <code>.env</code> à la racine avec <code>RESEND_API_KEY=re_...</code> et relancez ce serveur.</p>
</body></html>`;
};

// ---------------------------------------------------------------------------
// Routeur principal
// ---------------------------------------------------------------------------
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const { pathname } = url;

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // GET /dev-emails → page de visualisation des emails simulés
  if (req.method === "GET" && pathname === "/dev-emails") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderDevEmailsPage());
    return;
  }

  // GET /dev-emails/<fichier> → afficher un email simulé
  if (req.method === "GET" && pathname.startsWith("/dev-emails/")) {
    const name = pathname.replace("/dev-emails/", "");
    // Sécurité : interdire les chemins avec traversée de dossier
    if (name.includes("..") || name.includes("/")) {
      sendJson(res, 400, { ok: false, message: "Nom de fichier invalide." });
      return;
    }
    const file = join(DEV_EMAILS_DIR, name);
    if (existsSync(file)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(readFileSync(file, "utf8"));
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Introuvable");
    return;
  }

  // GET /health → état du serveur
  if (req.method === "GET" && pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      mode: API_KEY ? "resend (envoi réel)" : "simulation (dev-emails)",
      from: FROM,
    });
    return;
  }

  // POST /api/send-mail → même contrat que la fonction Vercel
  if (req.method === "POST" && pathname === "/api/send-mail") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      sendJson(res, 400, { ok: false, message: "JSON invalide." });
      return;
    }

    const { to, toName = "", fromName = "", subject, html } = body;
    if (!to || !subject || !html) {
      sendJson(res, 400, { ok: false, message: "Destinataire, sujet ou contenu manquant." });
      return;
    }

    const result = API_KEY
      ? await sendWithResend({ to, toName, fromName, subject, html })
      : simulateSend({ to, toName, fromName, subject, html });

    sendJson(res, result.ok ? 200 : 500, result);
    return;
  }

  sendJson(res, 404, { ok: false, message: "Route inconnue." });
});

server.listen(PORT, () => {
  console.log("┌──────────────────────────────────────────────────────────┐");
  console.log("│  📧 Serveur de dev email (simule api/send-mail)          │");
  console.log("└──────────────────────────────────────────────────────────┘");
  console.log(`  Port        : http://localhost:${PORT}`);
  console.log(`  Endpoint    : POST /api/send-mail`);
  console.log(`  Mode        : ${API_KEY ? "Resend — ENVOI RÉEL ✅" : "Simulation — emails sauvegardés dans /dev-emails"}`);
  if (!API_KEY) console.log(`  Visualiser  : http://localhost:${PORT}/dev-emails`);
  console.log(`  Expéditeur  : ${FROM}`);
  if (API_KEY) {
    console.log("  💡 Les emails sont envoyés réellement via Resend.");
  } else {
    console.log("  💡 Pour un envoi réel : créez un fichier .env avec RESEND_API_KEY=re_...");
  }
});

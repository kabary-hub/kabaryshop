// api/health.js
// Fonction Vercel (serverless) : état de la configuration email.
//
// Utile pour vérifier d'un coup d'œil que la fonction est bien déployée
// sur Vercel et que les variables d'environnement sont présentes.
// Répond au même contrat que le serveur de dev (scripts/dev-mail-server.mjs) :
//   GET /health  →  { ok, mode, from, ... }
//
// Après déploiement, testez avec :  https://<votre-site>.vercel.app/api/health

export default async function handler(req, res) {
  // Seules les requêtes GET sont acceptées
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Méthode non autorisée' });
  }

  const apiKey = process.env.RESEND_API_KEY;

  return res.status(200).json({
    ok: true,
    mode: apiKey
      ? 'resend (envoi réel)'
      : 'non configuré (RESEND_API_KEY manquante sur Vercel)',
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    replyTo: process.env.EMAIL_REPLY_TO || null,
    apiKeySet: Boolean(apiKey),
  });
}

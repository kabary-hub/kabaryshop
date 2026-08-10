// api/send-mail.js
// Fonction Vercel (serverless) : relaie les emails du site vers Resend.
//
// Pourquoi un serveur ? Resend exige une clé API SECRÈTE (RESEND_API_KEY).
// Elle ne doit jamais être exposée dans le code du navigateur, donc le site
// (React, sans backend) appelle cette fonction, qui se charge de l'envoi.
//
// Variables d'environnement à configurer sur Vercel (voir .env.example) :
//   RESEND_API_KEY : clé API Resend (obligatoire)
//   EMAIL_FROM     : adresse d'expéditeur, ex. "contact@votre-domaine.com"
//                    (sans domaine vérifié, laisser onboarding@resend.dev)
//   EMAIL_REPLY_TO : adresse de réponse (optionnel)
//   SEND_API_KEY   : clé partagée envoyée par le site (optionnel, anti-abus)
import { Resend } from 'resend';

export default async function handler(req, res) {
  // Seules les requêtes POST sont acceptées
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Méthode non autorisée' });
  }

  // Protection simple : le site doit envoyer la clé partagée (si configurée)
  const sendKey = process.env.SEND_API_KEY;
  if (sendKey && req.headers['x-send-key'] !== sendKey) {
    return res.status(401).json({ ok: false, message: 'Clé d\'envoi invalide' });
  }

  const body = req.body || {};
  const { to, toName = '', subject, html, fromName = '' } = body;

  // Validation des champs
  if (!to || !subject || !html) {
    return res.status(400).json({
      ok: false,
      message: 'Destinataire, sujet ou contenu manquant.',
    });
  }
  if (typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ ok: false, message: 'Adresse email invalide.' });
  }
  if (typeof html !== 'string' || html.length > 200000) {
    return res.status(400).json({ ok: false, message: 'Contenu trop volumineux.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      message: 'RESEND_API_KEY non configurée sur Vercel.',
    });
  }

  try {
    const resend = new Resend(apiKey);

    // Expéditeur : EMAIL_FROM si défini, sinon l'adresse de test Resend
    const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const fromDisplay = fromName ? `${fromName} <${from}>` : from;

    const payload = {
      from: fromDisplay,
      to: [to],
      subject: String(subject).slice(0, 200),
      html,
    };
    const replyTo = process.env.EMAIL_REPLY_TO;
    if (replyTo) payload.reply_to = replyTo;

    const { data, error } = await resend.emails.send(payload);
    if (error) {
      return res.status(500).json({ ok: false, message: error.message || 'Échec de l\'envoi.' });
    }
    return res.status(200).json({ ok: true, message: 'Email envoyé', id: data?.id });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || 'Erreur serveur.' });
  }
}

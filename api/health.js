// api/health.js
// Fonction Vercel (serverless) : état de la configuration du site.
//
// Vérifie :
//   - Configuration email (Resend)
//   - Configuration Supabase (synchronisation)
//
// Après déploiement, testez avec :
//   https://<votre-site>.vercel.app/api/health

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Seules les requêtes GET sont acceptées
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Méthode non autorisée' });
  }

  const result = {
    ok: true,
    timestamp: new Date().toISOString(),
    email: {
      configured: Boolean(process.env.RESEND_API_KEY),
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    },
    supabase: {
      configured: false,
      connected: false,
      error: null,
    },
  };

  // Vérifier la connexion Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    result.supabase.configured = true;
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      // Test simple : lire une ligne de la table sync_store
      const { error } = await supabase
        .from('sync_store')
        .select('key')
        .limit(1);

      if (error) {
        result.supabase.error = error.message;
      } else {
        result.supabase.connected = true;
        result.supabase.tablesAccessible = true;
      }
    } catch (err) {
      result.supabase.error = err.message || 'Erreur de connexion';
    }
  }

  // Statut global
  result.ok = result.email.configured || result.supabase.configured;

  return res.status(200).json(result);
}

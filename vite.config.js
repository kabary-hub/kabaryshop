import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 🔥 En développement, les requêtes /api/* (envoi d'emails) sont redirigées
    // vers le serveur de dev email (scripts/dev-mail-server.mjs, port 3010)
    // qui simule la fonction Vercel api/send-mail.js.
    // En production, /api/* est servi directement par Vercel (aucun proxy).
    proxy: {
      '/api': {
        target: 'http://localhost:3010',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 🔥 Séparation des bibliothèques tierces en chunks stables et cacheables
    // (améliore le cache navigateur + charge initiale plus légère)
    rollupOptions: {
      output: {
        // 🔥 Rolldown exige une fonction : chaque bibliothèque tierce est
        // isolée dans un chunk stable et cacheable.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // ⚠️ Ordre important : vérifier les cas spécifiques AVANT la règle
            // générique 'react' (sinon react-icons / lucide-react / react-router
            // seraient absorbés par react-vendor).
            if (id.includes('react-router')) return 'react-router';
            if (id.includes('react-slick') || id.includes('slick-carousel')) return 'slick';
            if (id.includes('react-icons') || id.includes('lucide-react')) return 'icons';
            if (id.includes('@emailjs')) return 'emailjs';
            if (id.includes('aos')) return 'aos';
            if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
          }
        },
      },
    },
  },
})

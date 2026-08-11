import './index.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { runDataMigrations } from './utils/migrations';

// Nettoyage des données locales (commandes malformées…) AVANT le premier
// rendu : l'interface ne lit jamais de données corrompues.
runDataMigrations();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

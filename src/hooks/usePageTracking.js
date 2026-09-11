// src/hooks/usePageTracking.js
// Hook de suivi des pages visitées : déclenche un événement page_view
// à chaque navigation, mesure la durée de séjour et le referrer.
//
// Utilisation : importé dans App.jsx et appelé autour du Router.
// Le hook lit également les événements existants pour calculer des stats
// légères (pages les plus visitées, durée moyenne).

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '../services/analyticsService';

// Identifiant de session anonyme (stable tant que l'onglet reste ouvert).
let sessionId = typeof localStorage !== 'undefined'
  ? (localStorage.getItem('kabary_analytics_session') || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
  : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

if (typeof localStorage !== 'undefined') {
  try {
    localStorage.setItem('kabary_analytics_session', sessionId);
  } catch {
    // impossible de garder la session : on utilise celle en mémoire
  }
}

// Durée de la page précédente (en ms) — utilisée pour enrichir l'événement page_view.
let lastEntryTime = Date.now();
// Déclenche un événement page_view pour la page qui vient de se fermer.
const trackPageExit = (prevPath) => {
  const duration = Date.now() - lastEntryTime;
  trackEvent({
    type: 'page_view',
    url: prevPath,
    referrer: document.referrer || '',
    duration_ms: duration,
    sessionId,
  });
};

// Hook principal : écoute les changements de route et déclenche le suivi.
export const usePageTracking = () => {
  const { pathname } = useLocation();
  const currentPathRef = useRef(pathname);
  const entryTimeRef = useRef(() => Date.now());

  // À chaque changement de route : on track la page qui se ferme, puis on
  // enregistre l'entrée de la nouvelle page.
  useEffect(() => {
    if (currentPathRef.current && currentPathRef.current !== pathname) {
      trackPageExit(currentPathRef.current);
    }

    currentPathRef.current = pathname;
    entryTimeRef.current = Date.now();
    // Page actuelle : ex. "/" → on laisse "home_view" pour l'entonnoir.
    const isHome = pathname === '/';
    trackEvent({
      type: isHome ? 'home_view' : 'page_view',
      url: pathname,
      referrer: document.referrer || '',
      sessionId,
    });
  }, [pathname]);
};

// Export utilitaire : durée moyenne de séjour sur une page donnée (en secondes).
export const getAverageTimeOnPage = (pagePath) => {
  try {
    const events = typeof localStorage !== 'undefined'
      ? JSON.parse(localStorage.getItem('kabary_analytics_events') || '[]')
      : [];
    const views = events.filter(
      (e) => e.type === 'page_view' && e.url === pagePath && typeof e.duration_ms === 'number',
    );
    if (!views.length) return 0;
    const total = views.reduce((sum, e) => sum + e.duration_ms, 0);
    return total / views.length / 1000;
  } catch {
    return 0;
  }
};

// Export utilitaire : nombre de vues pour une page.
export const getPageViewCount = (pagePath) => {
  try {
    const events = typeof localStorage !== 'undefined'
      ? JSON.parse(localStorage.getItem('kabary_analytics_events') || '[]')
      : [];
    return events.filter((e) => e.type === 'page_view' && e.url === pagePath).length;
  } catch {
    return 0;
  }
};

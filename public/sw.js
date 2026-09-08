// sw.js - Service Worker pour Kabary Shop
// Version 1.0 - Cache basique pour le mode hors-ligne partiel

const CACHE_NAME = 'kabary-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/femmes',
  '/hommes',
  '/enfants',
  '/electroniques',
  '/meubles',
  '/tendances',
  '/ventes',
  '/notes',
  '/contacts',
  '/cgv',
  '/confidentialite',
  '/retours',
  '/track',
  '/logo2.png',
];

// Installation : pré-cacher les ressources statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.warn('SW: Certains assets n\'ont pas pu être mis en cache:', error);
      });
    })
  );
  self.skipWaiting();
});

// Activation : nettoyer les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch : stratégie Cache First pour les assets, Network First pour les pages
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorer les requêtes vers d'autres domaines
  if (url.origin !== self.location.origin) {
    return;
  }

  // Pour les pages HTML, utiliser Network First avec fallback cache
  if (event.request.destination === 'document' || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cloner et mettre en cache la réponse
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback : servir la dernière version en cache
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match('/');
          });
        })
    );
  }

  // Pour les autres assets (JS, CSS, images), utiliser Cache First
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).then((response) => {
        // Mettre en cache la réponse si elle est valide
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Gestion des messages du client (pour le nettoyage du cache, etc.)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

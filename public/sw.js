// sw.js - Service Worker pour Kabary Shop
// Cache intelligent avec invalidation automatique à chaque nouveau build.
//
// Stratégie :
//   - Pages HTML (document) : Network First → toujours la version fraîche
//   - JS / CSS / images     : Stale While Revalidate → affiche le cache
//     immédiatement, puis met à jour en arrière-plan
//   - Routes pré-cachées    : installées une fois pour le mode hors-ligne

const CACHE_NAME = 'kabary-cache-v2';
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
  '/track-order',
  '/cgv',
  '/confidentialite',
  '/retours',
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

// Activation : supprimer TOUS les anciens caches (pas seulement les « different names »)
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

// Fetch : Network First pour les pages, Stale-While-Revalidate pour les assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorer les requêtes vers d'autres domaines
  if (url.origin !== self.location.origin) {
    return;
  }

  // Pour les pages HTML : Network First (toujours la version fraîche)
  if (event.request.destination === 'document' || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match('/');
          });
        })
    );
    return;
  }

  // Pour les autres assets (JS, CSS, images) : Stale-While-Revalidate
  // → sert le cache immédiatement, puis met à jour en arrière-plan
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // Lancer la mise à jour en arrière-plan (sans bloquer l'affichage)
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // réseau indisponible : on garde le cache
        });

        // Retourner le cache immédiatement s'il existe, sinon attendre le réseau
        return cachedResponse || fetchPromise;
      });
    })
  );
});

// Gestion des messages du client (pour le nettoyage du cache)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

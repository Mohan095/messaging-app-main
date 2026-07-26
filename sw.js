const CACHE_NAME = 'md-chat-pro-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/firebase-config.js',
  './js/state.js',
  './js/auth.js',
  './js/contacts.js',
  './js/groups.js',
  './js/status.js',
  './js/chat.js',
  './js/media.js',
  './js/settings.js',
  './js/admin.js',
  './js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(e.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});

// Push Notifications
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: 'MD Chat Pro', body: 'New Message received!' };
  const options = {
    body: data.body || 'You have a new message',
    icon: 'https://cdn-icons-png.flaticon.com/512/3670/3670051.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3670/3670051.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    }
  };
  e.waitUntil(self.registration.showNotification(data.title, options));
});

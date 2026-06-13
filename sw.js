// LIFE TRACKER · SERVICE WORKER v4 — FCM Push + Cache
const CACHE_NAME = 'lifetracker-v5';
const STATIC_ASSETS = [
  '/', '/index.html', '/dashboard.html', '/calendar.html',
  '/tasks.html', '/habits.html', '/finance.html',
  '/notes.html', '/assistant.html', '/profile.html',
  '/manifest.json'
];

// INSTALL
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// FETCH — cache first
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// PUSH — recibe notificaciones de FCM y las muestra
self.addEventListener('push', event => {
  let data = { title: 'Life Tracker', body: '' };
  try { data = event.data.json(); } catch (e) {
    try { data.body = event.data.text(); } catch (e2) {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Life Tracker', {
      body: data.body || '',
      vibrate: [200, 100, 200],
      tag: data.tag || 'lt-notification',
      data: { url: data.url || '/dashboard.html' }
    })
  );
});

// NOTIFICATION CLICK
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// MENSAJE desde la app (para notificaciones programadas locales)
self.addEventListener('message', event => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delay, tag, url } = event.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        vibrate: [200, 100, 200], tag: tag || 'lt-scheduled',
        data: { url: url || '/dashboard.html' }
      });
    }, delay);
  }
});

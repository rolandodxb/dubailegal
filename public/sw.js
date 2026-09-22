/*
 * Dubai Legal service worker.
 *
 * Its only job is to receive push messages and show them as system
 * notifications, including when no tab is open. Clicking one focuses an existing
 * tab where possible and navigates it to the page the alert is about.
 */

self.addEventListener('install', (event) => {
  // Take over as soon as possible so a fresh subscription works immediately.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Dubai Legal', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Dubai Legal';
  const options = {
    body: data.body || '',
    tag: data.tag || 'dubai-legal',
    renotify: true,
    data: { link: data.link || '/notifications' },
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/notifications';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            if ('navigate' in client) client.navigate(link);
            return client.focus();
          }
        }
        return self.clients.openWindow(link);
      }),
  );
});

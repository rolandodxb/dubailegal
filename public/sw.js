const CACHE = 'legal-dash-v1';
const OFFLINE_URL = '/offline';
const PRECACHE = ['/offline', '/manifest.webmanifest', '/logo.svg', '/icon-192.png', '/icon-512.png'];

/*
 * Legal Dash service worker.
 *
 * Its only job is to receive push messages and show them as system
 * notifications, including when no tab is open. Clicking one focuses an existing
 * tab where possible and navigates it to the page the alert is about.
 */

self.addEventListener('install', (event) => {
  // The shell is stored so an installed app opens instantly and still works with
  // no network. Failure here is not fatal — the app simply needs the network.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
      // Take over as soon as possible so a fresh subscription works immediately.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  // Old shells are dropped, so an installed app never runs a stale one.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .catch(() => undefined)
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Legal Dash', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Legal Dash';
  const options = {
    body: data.body || '',
    tag: data.tag || 'legal-dash',
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

/* ─────────────────────────────────────────────────────────────────────────────
   Installable app.

   A browser offers to install a site as an app only when it has a manifest, a
   service worker, and that worker handles fetches. This one is deliberately
   conservative:

     · navigations are network-first, so a page is never stale while the network
       is there, with the last good copy of that page as the offline fallback;
     · static assets (icons, the logo, the manifest) are cache-first, because
       they never change;
     · everything else — every API route, every uploaded document, every page
       that reads the session — is left alone. Caching a response that belongs to
       one signed-in member and serving it to another would be a leak, and
       caching a private document would be worse.
   ───────────────────────────────────────────────────────────────────────────── */


/** Only the pages and assets that are safe to keep: never an API or a document. */
function isCacheableAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith('/api/')) return false;
  return /\.(?:css|js|png|jpg|jpeg|svg|webp|ico|woff2?|webmanifest)$/.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Pages: the network is the truth; the cache is only for when it is gone.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match(OFFLINE_URL)) ?? Response.error()),
    );
    return;
  }

  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
            return response;
          }),
      ),
    );
  }
});

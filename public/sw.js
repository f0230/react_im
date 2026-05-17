// sw.js — DTE Service Worker
// Bump CACHE_VERSION on every deploy to invalidate stale caches.
const CACHE_VERSION = 'v1';
const STATIC_CACHE  = `dte-static-${CACHE_VERSION}`;
const API_CACHE     = `dte-api-${CACHE_VERSION}`;
const PAGES_CACHE   = `dte-pages-${CACHE_VERSION}`;

const MAX_API_ENTRIES  = 60;
const MAX_PAGE_ENTRIES = 20;

// ─── URL CLASSIFIERS ───────────────────────────────────────────

const isStaticAsset = (url) =>
  url.pathname.startsWith('/assets/') ||
  /\.(woff2?|ttf|otf|eot|png|jpg|jpeg|webp|avif|svg|ico|gif)$/.test(url.pathname) ||
  url.pathname === '/manifest.webmanifest';

const isApiRequest = (url) =>
  url.pathname.startsWith('/api/');

const isNavigationRequest = (req) =>
  req.mode === 'navigate';

// ─── INSTALL ───────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  // Take control immediately — don't wait for old SW to release clients.
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(['/', '/manifest.webmanifest'])
    )
  );
});

// ─── ACTIVATE ──────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const known = [STATIC_CACHE, API_CACHE, PAGES_CACHE];
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n.startsWith('dte-') && !known.includes(n))
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── MESSAGES ──────────────────────────────────────────────────
// The React app sends messages here for lifecycle events.
self.addEventListener('message', (event) => {
  const { type } = event.data || {};

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (type === 'USER_LOGOUT') {
    // Wipe API cache on logout so the next user starts clean.
    caches.delete(API_CACHE);
  }
});

// ─── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle same-origin GET requests.
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    // JS/CSS/fonts/images — serve from cache, fall back to network.
    event.respondWith(cacheFirst(req, STATIC_CACHE));
  } else if (isApiRequest(url)) {
    // API calls — always try network, fall back to stale data.
    event.respondWith(networkFirst(req, API_CACHE, MAX_API_ENTRIES));
  } else if (isNavigationRequest(req)) {
    // HTML navigation — network-first so routing stays correct.
    event.respondWith(networkFirst(req, PAGES_CACHE, MAX_PAGE_ENTRIES));
  }
  // All other requests fall through to the browser.
});

// ─── STRATEGIES ────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return offlineResponse(request);
  }
}

async function networkFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      trimCache(cache, maxEntries);
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || offlineResponse(request);
  }
}

function offlineResponse(request) {
  const isApi = request.url.includes('/api/');
  if (isApi) {
    return new Response(JSON.stringify({ error: 'offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // For navigation requests, return a minimal offline page.
  return new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>Sin conexión — DTE</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}p{color:#71717a;margin-top:.5rem}</style>
    </head><body><div><h1>Sin conexión</h1><p>Verificá tu conexión y volvé a intentar.</p></div></body></html>`,
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// ─── LRU TRIM ──────────────────────────────────────────────────
// Delete the oldest entries when the cache exceeds maxEntries.
async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    const excess = keys.slice(0, keys.length - maxEntries);
    await Promise.all(excess.map((k) => cache.delete(k)));
  }
}

// ─── BACKGROUND SYNC ───────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-messages') {
    event.waitUntil(broadcastSync('messages'));
  }
  if (event.tag === 'sync-pending-updates') {
    event.waitUntil(broadcastSync('updates'));
  }
});

async function broadcastSync(tag) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((c) => c.postMessage({ type: 'SW_SYNC_COMPLETE', tag }));
}

// ─── PUSH NOTIFICATIONS ────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try { payload = event.data.json(); } catch { return; }

  const {
    title = 'Grupo DTE',
    body  = '',
    icon  = '/icon-192x192.png',
    badge = '/favicon-32x32.png',
    url   = '/dashboard',
  } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const match = clients.find((c) => c.url.startsWith(self.location.origin));
      if (match) {
        match.focus();
        match.navigate(target);
      } else {
        self.clients.openWindow(target);
      }
    })
  );
});

// Service Worker de WiFiMex para Notificaciones en Celular, Escritorio, Background y Resiliencia Offline
const CACHE_NAME = 'wifimex-netops-sw-v5';
const STATIC_CACHE_NAME = 'wifimex-netops-static-v6';
const CORE_STATIC_ASSETS = [
  '/assets/css/style.css',
  '/assets/css/sidebar-compact.css',
  '/assets/css/theme-pro.css',
  '/assets/css/login-redesign.css',
  '/assets/js/api.js',
  '/assets/js/common.js',
  '/assets/js/perfil.js',
  '/assets/brand/wifimex-logo.jpg',
  '/assets/brand/wifimex-network-mark.svg'
];
let networkPushQueue = Promise.resolve();

function isCacheableStaticRequest(request) {
  if (!request || request.method !== 'GET') return false;
  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return false;
  }
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith('/api/')) return false;
  if (url.pathname === '/version.json' || url.pathname === '/sw.js') return false;
  if (request.mode === 'navigate') return true;
  return /\.(?:html|css|js|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|eot)$/i.test(url.pathname) || url.pathname === '/';
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => Promise.all(
        CORE_STATIC_ASSETS.map((assetUrl) => cache.add(assetUrl).catch(() => {}))
      ))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('wifimex-netops-static-') && key !== STATIC_CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .catch(() => {})
      .then(() => self.clients.claim())
  );
});

// Estrategia Network-First con fallback a caché para assets estáticos y vistas HTML
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isCacheableStaticRequest(request)) return;

  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE_NAME);
    try {
      const networkResponse = await fetch(request);
      if (networkResponse && networkResponse.ok && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
        cache.put(request, networkResponse.clone()).catch(() => {});
      }
      return networkResponse;
    } catch (networkErr) {
      const exactMatch = await cache.match(request);
      if (exactMatch) return exactMatch;
      const looseMatch = await cache.match(request, { ignoreSearch: true });
      if (looseMatch) return looseMatch;
      if (request.mode === 'navigate') {
        return new Response(
          '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión · WiFiMex</title><style>body{font-family:Inter,system-ui,sans-serif;background:#f3f6fb;color:#0f172a;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px}.box{max-width:420px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;text-align:center;box-shadow:0 12px 32px rgba(15,23,42,.08)}h1{font-size:18px;margin:0 0 8px}p{font-size:13px;color:#475569;margin:0 0 16px;line-height:1.5}button{background:#0b6ef3;color:#fff;border:0;border-radius:10px;padding:10px 18px;font-weight:700;cursor:pointer}</style></head><body><div class="box"><h1>Sin conexión a internet</h1><p>No se pudo cargar esta pantalla porque no hay conexión y aún no estaba guardada en caché local.</p><button onclick="location.reload()">Reintentar</button></div></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
      throw networkErr;
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || '/ordenes.html?detailKind=network';
  const orderId = event.notification.data?.orderId || '';
  const target = new URL(rawUrl, self.location.origin + '/');
  if (orderId && !target.searchParams.has('orderId')) target.searchParams.set('orderId',orderId);
  const targetUrl = target.href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          // Navegar funciona también si la pestaña aún no tiene el receptor activo.
          if (typeof client.navigate === 'function') {
            try {
              const navigated = await client.navigate(targetUrl);
              if (navigated) return navigated.focus();
            } catch (e) {}
          }
          continue;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = { title: 'WiFiMex', message: 'Nueva actualización en Detalles de Red' };
  try {
    if (event.data) payload = event.data.json();
  } catch (e) {
    if (event.data) payload.message = event.data.text();
  }
  const options = {
    body: payload.message || payload.body || '',
    icon: '/assets/brand/wifimex-logo.jpg',
    badge: '/assets/brand/wifimex-network-mark.svg',
    vibrate: [200, 100, 200],
    tag: payload.tag || ('wifimex-notif-' + Date.now()),
    renotify: false,
    data: {
      url: payload.url || '/ordenes.html?detailKind=network',
      orderId: payload.orderId || ''
    }
  };
  const delivery = networkPushQueue.then(async () => {
    const isNetwork = !String(payload.url || '').includes('detailKind=physical');
    if (!isNetwork) return self.registration.showNotification(payload.title || 'WiFiMex', options);
    const clockKey = self.location.origin + '/__netops-network-summary-clock';
    const cache = await caches.open(CACHE_NAME);
    const previous = await cache.match(clockKey);
    const lastShownAt = previous ? Number(await previous.text()) : 0;
    if (lastShownAt && Date.now() - lastShownAt < 30 * 60 * 1000) return;
    await cache.put(clockKey, new Response(String(Date.now())));
    return self.registration.showNotification('Revisa los detalles de redes', {
      ...options,
      body:'Tienes casos o mensajes pendientes. Abre Detalles de red para revisarlos.',
      tag:'netops-network-network-summary',
      data:{url:'/ordenes.html?detailKind=network',orderId:''}
    });
  });
  networkPushQueue = delivery.catch(() => {});
  event.waitUntil(delivery);
});

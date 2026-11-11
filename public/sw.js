// Service Worker de WiFiMex para Notificaciones en Celular, Escritorio y Background
const CACHE_NAME = 'wifimex-netops-sw-v5';
let networkPushQueue = Promise.resolve();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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

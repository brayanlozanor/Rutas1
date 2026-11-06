// Service Worker de WiFiMex para Notificaciones en Celular, Escritorio y Background
const CACHE_NAME = 'wifimex-netops-sw-v2';

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
  const targetUrl = rawUrl.startsWith('http') ? rawUrl : (self.location.origin + '/' + rawUrl.replace(/^\/+/, ''));

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          try {
            client.postMessage({
              type: 'NETOPS_OPEN_NOTIFICATION_TARGET',
              url: rawUrl,
              orderId
            });
          } catch (e) {}
          return;
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
    renotify: true,
    data: {
      url: payload.url || '/ordenes.html?detailKind=network',
      orderId: payload.orderId || ''
    }
  };
  event.waitUntil(self.registration.showNotification(payload.title || 'WiFiMex', options));
});

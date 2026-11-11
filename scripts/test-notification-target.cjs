const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

(async () => {
  const orders = fs.readFileSync('public/assets/js/ordenes.js', 'utf8');
  const loader = orders.slice(orders.indexOf('async function loadNotificationOrder('), orders.indexOf('async function openOrderTechnicianReport('));
  const calls = [];
  const messages = [];
  const context = {
    state: { workOrders: [{ id: 'current-page' }] },
    fetchDataPage: async (part, params) => {
      calls.push({ part, params });
      return { workOrders: [{ id: params.id, detailKind: 'network', status: 'pendiente' }] };
    },
    notify: (...args) => messages.push(args)
  };
  vm.createContext(context);
  vm.runInContext(loader, context);
  const fetched = await context.loadNotificationOrder('another-page');
  assert.equal(fetched.id, 'another-page');
  assert.equal(calls[0].params.id, 'another-page');
  assert.equal(calls[0].params.q, undefined, 'No deben aplicarse los filtros de la tabla al enlace');
  assert.equal(context.state.workOrders.length, 2);
  await context.loadNotificationOrder('another-page');
  assert.equal(calls.length, 1);
  context.fetchDataPage = async () => ({ workOrders: [] });
  assert.equal(await context.loadNotificationOrder('deleted'), null);
  assert.equal(messages.at(-1)[1], 'warn');
  assert(!orders.includes('function checkUrlForTargetOrder'), 'La apertura no debe competir con la carga inicial');

  const listeners = {};
  const navigation = [];
  const pushes = [];
  const cached = new Map();
  let now = 1800000000000;
  let wait;
  const worker = {
    self: { location: { origin: 'https://example.test' }, addEventListener: (name, fn) => { listeners[name] = fn; },
      clients: { matchAll: async () => [{ navigate: async url => { navigation.push(url); return { focus: async () => {} }; }, focus() {} }], openWindow: async () => assert.fail('No abrir otra pestaña si se puede reutilizar') },
      registration: { showNotification: async (title, options) => pushes.push({ title, options }) }
    }, URL, Response,
    Date: class extends Date { static now() { return now; } },
    caches: { open: async () => ({ match: async key => cached.get(key)?.clone(), put: async (key, value) => cached.set(key,value) }) }
  };
  vm.createContext(worker);
  vm.runInContext(fs.readFileSync('public/sw.js', 'utf8'), worker);
  listeners.notificationclick({ notification: { close() {}, data: { url: '/ordenes.html?detailKind=network' } }, waitUntil: promise => { wait = promise; } });
  await wait;
  assert.equal(navigation[0], 'https://example.test/ordenes.html?detailKind=network');
  const push = () => {
    let delivery;
    listeners.push({ data: { json: () => ({ orderId: 'case-a', message: 'Mensaje' }) }, waitUntil: promise => { delivery = promise; } });
    return delivery;
  };
  await Promise.all([push(),push(),push()]);
  assert.equal(pushes.length, 1, 'Varios push simultaneos deben producir un solo aviso');
  assert.equal(pushes[0].title, 'Revisa los detalles de redes');
  assert.equal(pushes[0].options.renotify, false);
  assert.equal(pushes[0].options.data.orderId, '');
  now += 30 * 60 * 1000;
  await push();
  assert.equal(pushes.length, 2);
  console.log('PASS: notifications fetch missing cases by ID and navigate reliably without a startup timer.');
})().catch(error => { console.error(error); process.exitCode = 1; });

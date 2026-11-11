const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

(async () => {
  const source = fs.readFileSync('public/assets/js/common.js', 'utf8');
  const summary = source.slice(source.indexOf('const NETWORK_SUMMARY_INTERVAL_MS'), source.indexOf('function notifyNetworkDetailEvent('));
  const reminders = source.slice(source.indexOf('function checkPriorityUnresolvedReminders('), source.indexOf('function isOrderAssignedToUser('));
  const events = source.slice(source.indexOf('function notifyNetworkDetailEvent('), source.indexOf('function getStoredNetworkStateCache('));
  let now = 1800000000000;
  let lockQueue = Promise.resolve();
  const storage = new Map();
  const popups = [];
  const desktop = [];
  const inbox = [];
  const createTab = () => {
    const context = {
      Date: class extends Date { static now() { return now; } },
      _netopsSessionStartedAt: now - 10000,
      _netopsRecentlyNotified: new Map(),
      getCurrentUser: () => ({ id: 'user-a', role: 'soporte', name: 'Soporte' }),
      normalizeName: value => String(value).toLowerCase(),
      isUserInCase: () => true, isOrderCreatorOrAssigner: () => false, isOrderAssignedToUser: () => false,
      localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
      navigator: { locks: { request(_name, callback) { lockQueue = lockQueue.then(callback); return lockQueue; } } },
      window: { location: { pathname: '/mapa' } },
      Notification: { permission: 'granted' },
      document: { hidden: true, hasFocus: () => false },
      addNotificationToInbox: item => inbox.push(item),
      playSubtleNotificationTone() {},
      showRightScreenNotification: item => popups.push(item),
      triggerDesktopNotification: item => desktop.push(item)
    };
    vm.createContext(context);
    vm.runInContext(summary + reminders + events, context);
    return context;
  };
  const tab = createTab();
  const orders = Array.from({ length: 100 }, (_, id) => ({ id: String(id), detailKind: 'network', status: 'pendiente' }));
  tab.checkPriorityUnresolvedReminders(orders);
  await lockQueue;
  assert.equal(desktop.length, 0, 'La primera carga debe ser silenciosa');
  now += 30 * 60 * 1000;
  tab.checkPriorityUnresolvedReminders(orders);
  createTab().checkPriorityUnresolvedReminders(orders);
  await lockQueue;
  assert.equal(desktop.length, 1, 'Cien casos y dos pestañas deben generar un solo aviso');
  assert.equal(desktop[0].title, 'Revisa los detalles de redes');
  assert.equal(desktop[0].orderId, undefined);
  assert.equal(desktop[0].url, '/ordenes.html?detailKind=network');
  assert.equal(popups.length, 0, 'No mostrar aviso interno y de escritorio al mismo tiempo');
  tab.checkPriorityUnresolvedReminders(orders);
  await lockQueue;
  assert.equal(desktop.length, 1);

  // A real event is recorded once and cannot replay after a reload.
  now += 30 * 60 * 1000;
  tab.notifyNetworkDetailEvent({ title: 'Mensaje', message: 'Nuevo mensaje', orderId: 'case-a', type: 'chat_message', eventId: 'message-a', force: true });
  await lockQueue;
  assert.equal(desktop.length, 2);
  now += 30 * 60 * 1000;
  createTab().notifyNetworkDetailEvent({ title: 'Mensaje', message: 'Nuevo mensaje', orderId: 'case-a', type: 'chat_message', eventId: 'message-a', force: true });
  await lockQueue;
  assert.equal(desktop.length, 2, 'El mismo mensaje no debe volver a avisar al recargar');

  const before = desktop.length;
  tab.checkPriorityUnresolvedReminders([{ id: 'done', detailKind: 'network', status: 'completada' }]);
  tab.checkPriorityUnresolvedReminders([{ id: 'mine', detailKind: 'network', status: 'pendiente', followUps: [{ action: 'chat_message', byId: 'user-a' }] }]);
  await lockQueue;
  assert.equal(desktop.length, before, 'No recordar casos terminados ni mensajes ya respondidos');
  console.log('PASS: one grouped reminder, shared cooldown across tabs, persistent message deduplication and valid list target.');
})().catch(error => { console.error(error); process.exitCode = 1; });

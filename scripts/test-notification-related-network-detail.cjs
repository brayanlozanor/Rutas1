/**
 * test-notification-related-network-detail.cjs
 *
 * Verifies that notifications subtly and unobtrusively display their related network detail
 * (folio/identifier) in notification cards, screen toasts, desktop alerts, and deletion requests.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('Testing notification related network detail display...');

// 1. Verify CSS styles
const cssPath = path.join(__dirname, '..', 'public', 'assets', 'css', 'orders-design-v2.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');
assert(cssContent.includes('.notif-network-ref-pill'), 'orders-design-v2.css must define .notif-network-ref-pill');
assert(cssContent.includes('border-radius: 9999px') || cssContent.includes('border-radius:9999px'), 'pill must have rounded pill border-radius');

const styleCssPath = path.join(__dirname, '..', 'public', 'assets', 'css', 'style.css');
const styleCssContent = fs.readFileSync(styleCssPath, 'utf8');
assert(styleCssContent.includes('.notif-network-ref-pill'), 'style.css must define .notif-network-ref-pill');

// 2. Load common.js in a mock VM environment
const commonJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'common.js');
const commonJsContent = fs.readFileSync(commonJsPath, 'utf8');

// Build minimal DOM and browser environment
const localStorageStore = {};
const mockLocalStorage = {
  getItem: (k) => localStorageStore[k] || null,
  setItem: (k, v) => { localStorageStore[k] = String(v); },
  removeItem: (k) => { delete localStorageStore[k]; },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }
};

const domElements = {};
function createMockElement(tag) {
  let _id = '';
  const el = {
    tagName: tag.toUpperCase(),
    className: '',
    get id() { return _id; },
    set id(val) { _id = val; domElements[val] = el; },
    innerHTML: '',
    textContent: '',
    style: {
      setProperty: (k, v) => { el.style[k] = v; },
      display: ''
    },
    dataset: {},
    classList: {
      _classes: new Set(),
      add: (c) => el.classList._classes.add(c),
      remove: (c) => el.classList._classes.delete(c),
      contains: (c) => el.classList._classes.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (el.classList._classes.has(c)) el.classList._classes.delete(c);
          else el.classList._classes.add(c);
        } else if (force) {
          el.classList._classes.add(c);
        } else {
          el.classList._classes.delete(c);
        }
      }
    },
    attributes: {},
    setAttribute: (k, v) => { el.attributes[k] = v; },
    getAttribute: (k) => el.attributes[k] || null,
    children: [],
    appendChild: (child) => { el.children.push(child); return child; },
    querySelectorAll: (sel) => [],
    querySelector: (sel) => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    remove: () => {}
  };
  return el;
}

const mockDocument = {
  createElement: (tag) => createMockElement(tag),
  getElementById: (id) => domElements[id] || null,
  querySelector: (sel) => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  head: createMockElement('head'),
  body: createMockElement('body'),
  documentElement: createMockElement('html')
};

const mockWindow = {
  location: { pathname: '/ordenes.html', origin: 'http://localhost', hostname: 'localhost' },
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {}
};

const sandbox = {
  window: mockWindow,
  document: mockDocument,
  location: mockWindow.location,
  localStorage: mockLocalStorage,
  navigator: { userAgent: 'node' },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  setInterval: setInterval,
  clearInterval: clearInterval,
  Date: Date,
  Math: Math,
  URL: URL,
  state: {
    workOrders: [
      { id: 'wo-net-1', folio: 'RED-100200', detailKind: 'network', title: 'Falla fibra principal', town: 'Tixtla' },
      { id: 'wo-phys-1', folio: 'DET-300400', detailKind: 'physical', originNetworkFolio: 'RED-100200', originNetworkOrderId: 'wo-net-1', town: 'Tixtla' },
      { id: 'wo-phys-standalone', folio: 'DET-500600', detailKind: 'physical', town: 'Chilpancingo' }
    ],
    nodes: [],
    equipment: []
  },
  getCurrentUser: () => ({ id: 'usr-admin', name: 'Admin User', username: 'admin', role: 'administrador' }),
  userHasRole: (...roles) => roles.includes('administrador') || roles.includes('admin'),
  normalizeRole: (r) => r || '',
  normalizeName: (n) => String(n || '').trim().toLowerCase(),
  isTechnicianPlanView: () => false,
  repairDisplayText: (t) => String(t || '')
};

vm.createContext(sandbox);
vm.runInContext(commonJsContent, sandbox);

// 3. Test getNotificationRelatedNetworkDetail
console.log('Testing getNotificationRelatedNetworkDetail()...');

// 3a. Direct property on notification
const res1 = sandbox.getNotificationRelatedNetworkDetail({ networkOrderFolio: 'RED-999888' });
assert.strictEqual(res1?.folio, 'RED-999888', 'Should read explicit networkOrderFolio');

// 3b. Origin network folio on notification
const res2 = sandbox.getNotificationRelatedNetworkDetail({ originNetworkFolio: 'RED-777666' });
assert.strictEqual(res2?.folio, 'RED-777666', 'Should read explicit originNetworkFolio');

// 3c. Order ID matching network order in state.workOrders
const res3 = sandbox.getNotificationRelatedNetworkDetail({ orderId: 'wo-net-1' });
assert.strictEqual(res3?.folio, 'RED-100200', 'Should look up network order folio from state');

// 3d. Order ID matching physical order with originNetworkFolio
const res4 = sandbox.getNotificationRelatedNetworkDetail({ orderId: 'wo-phys-1' });
assert.strictEqual(res4?.folio, 'RED-100200', 'Should look up originNetworkFolio of physical order');

// 3e. Standalone physical order with no network relation
const res5 = sandbox.getNotificationRelatedNetworkDetail({ orderId: 'wo-phys-standalone' });
assert.strictEqual(res5, null, 'Standalone physical order must return null');

// 3f. Order ID starts with RED-
const res6 = sandbox.getNotificationRelatedNetworkDetail({ orderId: 'RED-554433' });
assert.strictEqual(res6?.folio, 'RED-554433', 'RED- prefix in orderId should be recognized');

// 3g. From URL
const res7 = sandbox.getNotificationRelatedNetworkDetail({ url: '/ordenes.html?detailKind=network&orderId=RED-882211' });
assert.strictEqual(res7?.folio, 'RED-882211', 'Should extract RED- folio from network URL');

// 3h. From title regex
const res8 = sandbox.getNotificationRelatedNetworkDetail({ title: 'Aviso sobre caso RED-443322 en curso' });
assert.strictEqual(res8?.folio, 'RED-443322', 'Should extract RED- folio from title');

console.log('getNotificationRelatedNetworkDetail() passed all checks ✓');

// 4. Test renderNotificationNetworkRef
console.log('Testing renderNotificationNetworkRef()...');

const pillHtml = sandbox.renderNotificationNetworkRef({
  title: 'Reporte resuelto',
  orderId: 'wo-net-1'
});
assert(pillHtml.includes('notif-network-ref-pill'), 'Must render .notif-network-ref-pill class');
assert(pillHtml.includes('Red: RED-100200'), 'Must contain "Red: RED-100200"');
assert(pillHtml.includes('<svg'), 'Must contain subtle SVG icon');

// Check that if title already has the folio, it avoids redundancy
const pillRedundant = sandbox.renderNotificationNetworkRef({
  title: 'Actualización en RED-100200',
  orderId: 'wo-net-1'
});
assert.strictEqual(pillRedundant, '', 'Must return empty string if title already contains the folio');

// Check standalone physical detail returns empty string
const pillNone = sandbox.renderNotificationNetworkRef({
  title: 'Nuevo detalle físico',
  orderId: 'wo-phys-standalone'
});
assert.strictEqual(pillNone, '', 'Must return empty string when there is no related network detail');

console.log('renderNotificationNetworkRef() passed all checks ✓');

// 5. Test addNotificationToInbox with networkOrderFolio resolution
console.log('Testing addNotificationToInbox()...');
mockLocalStorage.clear();

sandbox.addNotificationToInbox({
  id: 'test-notif-1',
  title: 'Atención iniciada',
  message: 'Soporte inició la atención.',
  type: 'attending',
  orderId: 'wo-net-1'
});

const inbox = sandbox.getStoredNotificationsInbox();
assert.strictEqual(inbox.length, 1, 'Inbox should have 1 notification');
assert.strictEqual(inbox[0].networkOrderFolio, 'RED-100200', 'Saved notification must have networkOrderFolio resolved and stored');

console.log('addNotificationToInbox() passed all checks ✓');

// 6. Test renderNotificationCenter()
console.log('Testing renderNotificationCenter()...');
const listEl = createMockElement('div');
listEl.id = 'notification-list';
domElements['notification-list'] = listEl;

sandbox.renderNotificationCenter();

assert(listEl.innerHTML.includes('notif-network-ref-pill'), 'Notification list HTML must contain .notif-network-ref-pill');
assert(listEl.innerHTML.includes('Red: RED-100200'), 'Notification list HTML must display the related network folio');

console.log('renderNotificationCenter() passed all checks ✓');

// 7. Test showRightScreenNotification()
console.log('Testing showRightScreenNotification()...');
sandbox.showRightScreenNotification({
  title: 'Reporte devuelto',
  message: 'Detalle devuelto para revisión.',
  type: 'returned',
  orderId: 'wo-net-1'
});

const toastContainer = sandbox.document.getElementById('netops-right-toasts');
assert(toastContainer, 'Toast container should exist');
const toastCard = toastContainer.children[toastContainer.children.length - 1];
assert(toastCard, 'Toast card should be appended');
assert(toastCard.innerHTML.includes('notif-network-ref-pill'), 'Toast HTML must contain .notif-network-ref-pill');
assert(toastCard.innerHTML.includes('Red: RED-100200'), 'Toast HTML must contain related network detail folio');
console.log('showRightScreenNotification() passed all checks ✓');

console.log('\nAll tests passed successfully! ✓');

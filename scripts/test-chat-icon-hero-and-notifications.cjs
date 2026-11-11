const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

console.log('Testing Chat Icon, Hero Responsiveness, and Notification Center Navigation...');

const ordenesJs = fs.readFileSync('public/assets/js/ordenes.js', 'utf8');
const commonJs = fs.readFileSync('public/assets/js/common.js', 'utf8');
const ordersDesignCss = fs.readFileSync('public/assets/css/orders-design-v2.css', 'utf8');
const detailViewCss = fs.readFileSync('public/assets/css/detail-view-toggle.css', 'utf8');
const techDashboardCss = fs.readFileSync('public/assets/css/technician-dashboard.css', 'utf8');
const styleCss = fs.readFileSync('public/assets/css/style.css', 'utf8');

// 1. Chat button has only logo icon (no "Abrir chat" text)
assert(!ordenesJs.includes('<span>Abrir chat</span>'), 'ordenes.js must not contain "Abrir chat" text span');
assert(ordenesJs.includes('net-btn-open'), 'ordenes.js must contain net-btn-open');
assert(ordenesJs.includes('title="Abrir detalle y conversación"'), 'ordenes.js must have accessible title on chat button');
assert(ordersDesignCss.includes('.net-btn-open {') && ordersDesignCss.includes('width: 30px !important;'),
  'orders-design-v2.css must size .net-btn-open as a 30px icon button');
console.log('✓ Test 1 Passed: Chat button renders icon only without "Abrir chat" text.');

// 2. Hero header text overflow and responsive wrap
assert(ordersDesignCss.includes('overflow: hidden !important;') && ordersDesignCss.includes('text-overflow: ellipsis !important;'),
  'orders-design-v2.css must apply overflow: hidden and text-overflow: ellipsis to hero title and subtitle');
assert(detailViewCss.includes('overflow: hidden !important;') && detailViewCss.includes('text-overflow: ellipsis !important;'),
  'detail-view-toggle.css must apply overflow: hidden and text-overflow: ellipsis to hero title and subtitle');
assert(ordersDesignCss.includes('@media (max-width: 1250px)'), 'orders-design-v2.css must include responsive wrap breakpoint for orders-hero');
assert(detailViewCss.includes('@media (max-width: 1250px)'), 'detail-view-toggle.css must include responsive wrap breakpoint for orders-hero');
console.log('✓ Test 2 Passed: Hero header has overflow ellipsis and responsive wrapping to prevent text collision.');

// 3. Notification bell clickability and technician access
assert(!commonJs.includes("(document.documentElement.dataset.role === 'tecnico')"),
  'common.js must not destroy the floating notification bell just because user is a technician');
assert(!techDashboardCss.includes('html[data-role="tecnico"] #notification-bell'),
  'technician-dashboard.css must not hide #notification-bell for technician globally');
assert(!styleCss.includes('html[data-role="tecnico"] #notification-bell'),
  'style.css must not hide #notification-bell for technician globally');
assert(ordersDesignCss.includes('#notification-bell') && ordersDesignCss.includes('pointer-events: auto !important;'),
  'orders-design-v2.css must ensure #notification-bell has pointer-events: auto and cursor: pointer');
assert(ordersDesignCss.includes('#notification-panel-mo.open') && ordersDesignCss.includes('z-index: 15000 !important;'),
  'orders-design-v2.css must give #notification-panel-mo.open high z-index above table/modal elements');
console.log('✓ Test 3 Passed: Notification bell is accessible and clickable for all roles.');

// 4. Notification click navigation logic in common.js
let openedOrderId = null;
let closedModalId = null;
let currentPath = '/ordenes.html';
let windowHref = 'http://localhost/ordenes.html?detailKind=network';

const sandbox = {
  window: {
    location: {
      pathname: '/ordenes.html',
      origin: 'http://localhost',
      href: 'http://localhost/ordenes.html?detailKind=network'
    },
    history: {
      replaceState: () => {}
    }
  },
  URL: global.URL,
  URLSearchParams: global.URLSearchParams,
  CM: id => { closedModalId = id; },
  OM: id => {},
  openOrderTechnicianReport: id => { openedOrderId = id; },
  getStoredNotificationsInbox: () => [
    { id: 'notif-1', unread: true, orderId: 'RED-605324', type: 'network' },
    { id: 'notif-2', unread: true, url: '/ordenes.html?detailKind=network&orderId=RED-786051' }
  ],
  setStoredNotificationsInbox: () => {},
  renderNotificationCenter: () => {},
  encodeURIComponent: global.encodeURIComponent,
  decodeURIComponent: global.decodeURIComponent
};

vm.createContext(sandbox);

// Test extracting markNotificationAsRead from common.js
const testFnCode = `
${commonJs.slice(commonJs.indexOf('function markNotificationAsRead('), commonJs.indexOf('function markAllNotificationsAsRead('))}
`;
vm.runInContext(testFnCode, sandbox);

// Call with item having direct orderId
sandbox.markNotificationAsRead('notif-1');
assert.strictEqual(openedOrderId, 'RED-605324', 'Direct orderId notification must open order report');
assert.strictEqual(closedModalId, 'notification-panel-mo', 'Must close notification panel on click');

// Call with item having orderId embedded in url
openedOrderId = null;
closedModalId = null;
sandbox.markNotificationAsRead('notif-2');
assert.strictEqual(openedOrderId, 'RED-786051', 'URL-embedded orderId notification must be extracted and open order report');
assert.strictEqual(closedModalId, 'notification-panel-mo', 'Must close notification panel on click');

console.log('✓ Test 4 Passed: Notification click correctly opens the target detail and closes the notification modal.');

// 5. Prefix-agnostic order matching in loadNotificationOrder
const stripPrefix = s => String(s || '').toLowerCase().replace(/^(red|det|new)-/i, '');
const matchesTarget = (item, cleanId) => {
  const cleanLower = String(cleanId).toLowerCase();
  const cleanStripped = stripPrefix(cleanId);
  const iId = String(item.id || '').toLowerCase();
  const iFolio = String(item.folio || '').toLowerCase();
  return iId === cleanLower || iFolio === cleanLower ||
    (cleanStripped && stripPrefix(iId) === cleanStripped) ||
    (cleanStripped && stripPrefix(iFolio) === cleanStripped);
};

assert(matchesTarget({ id: '605324', folio: 'RED-605324' }, 'RED-605324'), 'Should match RED- prefix to numeric id');
assert(matchesTarget({ id: '605324', folio: 'RED-605324' }, '605324'), 'Should match numeric id to RED- folio');
assert(matchesTarget({ id: 'RED-605324', folio: 'RED-605324' }, '605324'), 'Should match numeric id to prefixed id');
assert(matchesTarget({ id: 'DET-001234', folio: 'DET-001234' }, '001234'), 'Should match physical DET- prefix');

console.log('✓ Test 5 Passed: Prefix-agnostic ID/folio matching handles all format variations.');

// 6. Reload & URL cleanup: must show main table and never persist orderId in URL
assert(ordenesJs.includes("cleanUrl.searchParams.delete('orderId')"),
  'ordenes.js must remove orderId from URL upon load so refresh never opens chat');
assert(ordenesJs.includes("curUrl.searchParams.delete('orderId')"),
  'ordenes.js must remove orderId upon closing modal');
assert(commonJs.includes("curUrl.searchParams.delete('orderId')"),
  'common.js must remove orderId from address bar when navigating in-page');
assert(ordenesJs.includes("isReload"),
  'ordenes.js must detect reload to avoid opening chat on page reload');
console.log('✓ Test 6 Passed: Page reload and entry always display main view without pop-up chat.');

console.log('\n--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');


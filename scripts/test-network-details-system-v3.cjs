const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- TEST: Comprehensive Network Details System & Workflow Verification ---');

const baseDir = path.resolve(__dirname, '..');
const ordenesJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/ordenes.js'), 'utf8');
const ordenesHtml = fs.readFileSync(path.join(baseDir, 'public/ordenes.html'), 'utf8');
const commonJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/common.js'), 'utf8');
const materialJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/material.js'), 'utf8');
const materialHtml = fs.readFileSync(path.join(baseDir, 'public/material.html'), 'utf8');
const planificarHtml = fs.readFileSync(path.join(baseDir, 'public/planificar.html'), 'utf8');
const relationalStoreJs = fs.readFileSync(path.join(baseDir, 'relational-store.js'), 'utf8');
const detailViewToggleCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/detail-view-toggle.css'), 'utf8');
const ordersDesignCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/orders-design-v2.css'), 'utf8');

// 1. Column Fecha y hora replaces Tipo for network details
assert(ordenesJs.includes("activeOrderDetailKind === 'network' ? '<th class=\"order-th-datetime\">Fecha y hora</th>' : '<th>Tipo</th>'"),
  'ordenes.js must conditionally render Fecha y hora th for network details');
assert(ordenesJs.includes('order-datetime-cell'), 'ordenes.js must render order-datetime-cell for network details');
assert(ordenesJs.includes('formatOrderDate(') && ordenesJs.includes('formatOrderTime('),
  'ordenes.js must format date and time in separate spans');
console.log('✓ Item 1 Passed: Column Fecha y hora replaces Tipo for network details.');

// 2. Filters for date, assignee, and "Solo asignados a mí"
assert(ordenesHtml.includes('id="order-filter-wrap-date"'), 'ordenes.html must have date filter container');
assert(ordenesHtml.includes('id="order-filter-wrap-assignee"'), 'ordenes.html must have assignee filter container');
assert(ordenesHtml.includes('id="wo-filter-my-assignments"'), 'ordenes.html must have "Solo asignados a mí" toggle');
assert(ordenesJs.includes("filterOnlyMyAssignments"), 'ordenes.js must include filterOnlyMyAssignments state');
assert(ordenesJs.includes("function toggleOnlyMyAssignments("), 'ordenes.js must include toggleOnlyMyAssignments');
console.log('✓ Item 2 Passed: Date filter, assignee filter, and "Solo asignados a mí" toggle present.');

// 3. Admin full actions regardless of creator
assert(ordenesJs.includes("if (typeof userHasRole === 'function' && userHasRole('administrador', 'admin')) return true;"),
  'canEditOrder must grant full edit access to admin regardless of creator');
assert(commonJs.includes("if (isAdmin) return true;"),
  'canUserRetakeNetworkOrder must allow admin to retake/reassign');
console.log('✓ Item 3 Passed: Admin has full actions regardless of who created the detail.');

// 4. Reopened indicator
assert(ordenesJs.includes('isOrderReopened('), 'ordenes.js must check isOrderReopened');
assert(ordenesJs.includes('order-reopened-badge'), 'ordenes.js must render order-reopened-badge');
assert(detailViewToggleCss.includes('.order-reopened-badge'), 'detail-view-toggle.css must style .order-reopened-badge');
console.log('✓ Item 4 Passed: Reopened badge indicator clearly marks reopened details.');

// 5. Unread chat indicator badge
assert(ordenesJs.includes('getOrderUnreadMessagesCount('), 'ordenes.js must define getOrderUnreadMessagesCount');
assert(ordenesJs.includes('markOrderChatAsRead('), 'ordenes.js must define markOrderChatAsRead');
assert(ordenesJs.includes('net-unread-chat-dot'), 'ordenes.js must render net-unread-chat-dot');
assert(detailViewToggleCss.includes('.net-unread-chat-dot'), 'detail-view-toggle.css must style .net-unread-chat-dot');
console.log('✓ Item 5 Passed: Unread chat badge dot present on net-btn-open.');

// 6. Targeted notifications (admin silenced when not involved)
assert(commonJs.includes('isAdmin && !isUserInvolvedInReport'),
  'common.js must suppress active toasts/sounds for admin when not involved');
console.log('✓ Item 6 Passed: Targeted notifications only alert involved parties; admin views silently.');

// 7. Completely removed review confirmation prompt
assert(ordenesJs.includes('function orderNeedsReviewDecision(order) {') && ordenesJs.includes('return false;'),
  'orderNeedsReviewDecision must return false to bypass prompt');
assert(!ordenesJs.includes('¿Desea iniciar la atención técnica del detalle?'),
  'ordenes.js must eliminate "¿Desea iniciar la atención técnica del detalle?"');
console.log('✓ Item 7 Passed: Unnecessary review decision confirmation removed completely.');

// 8. Reassignment when editing
assert(ordenesJs.includes("appendSharedNetworkFollowUp(w, 'reasignado', 'Reasignación de atención', reassignLabel);"),
  'saveWO must record reassignment when assignee changes on edit');
console.log('✓ Item 8 Passed: Reassigning assignee when editing is supported and audited.');

// 9. Admin statistics modal
assert(ordenesHtml.includes('id="wo-admin-stats-btn"'), 'ordenes.html must have admin stats button');
assert(ordenesHtml.includes('id="admin-network-stats-mo"'), 'ordenes.html must have admin stats modal');
assert(ordenesJs.includes('function openAdminNetworkStatsModal('), 'ordenes.js must define openAdminNetworkStatsModal');
assert(ordenesJs.includes('admin-stats-kpi-grid'), 'ordenes.js must generate admin stats kpi grid');
assert(ordenesJs.includes('Rendimiento de resolución por usuario'), 'ordenes.js must break down resolutions per user');
console.log('✓ Item 9 Passed: Admin statistics summary modal with per-user resolution metrics.');

// 10. Support and Atención personal counters
assert(ordenesHtml.includes('id="wo-my-pending"'), 'ordenes.html must have #wo-my-pending');
assert(ordenesHtml.includes('id="wo-my-done"'), 'ordenes.html must have #wo-my-done');
assert(ordenesJs.includes("set('wo-my-pending', myPending);"), 'renderOrderStats must update wo-my-pending');
assert(ordenesJs.includes("set('wo-my-done', myDone);"), 'renderOrderStats must update wo-my-done');
console.log('✓ Item 10 Passed: Personal stats counters for Soporte and Atención.');

// 11. Notification navigation with active filters
assert(relationalStoreJs.includes("if (requestedId) {"),
  'relational-store.js must isolate requestedId without appending table filters');
assert(ordenesJs.includes('ensureMatchingDetailKind(') && ordenesJs.includes('ensureOrderVisibleInTable('),
  'ordenes.js must ensure matching detail kind and visible row for notification targets');
console.log('✓ Item 11 Passed: Notification navigation reliably reaches details even with table filters.');

// 12. Non-overlapping pagination on mobile / responsive view
assert(ordersDesignCss.includes('position: relative !important;') && ordersDesignCss.includes('z-index: 5 !important;'),
  'orders-design-v2.css must position .order-table-footer relative with z-index');
assert(detailViewToggleCss.includes('.orders-page .order-table-footer'),
  'detail-view-toggle.css must ensure footer never overlaps cards in <=1100px');
console.log('✓ Item 12 Passed: Responsive card table height and pagination overlap protection.');

// 13. Material delivery & reception fixes
assert(materialJs.includes('const reference = (document.getElementById(\'deliver-reference\')?.value || \'\').trim();'),
  'guardarEntrega must safely extract reference');
assert(materialJs.includes('const reference = (document.getElementById(\'receive-reference\')?.value || \'\').trim();'),
  'guardarRecepcion must safely extract reference');
assert(!materialJs.includes('RECIBIÓ EN ALMACÉN'),
  'material.js must not display "RECIBIÓ EN ALMACÉN" (replaced by RECIBIÓ DE CONFORMIDAD)');
assert(!planificarHtml.includes('el oficio formal'),
  'planificar.html must avoid using the word "formal"');
console.log('✓ Item 13 Passed: Material delivery and reception streamlined with dual party signatures.');

// 14. "Mis detalles" button, calendar range picker, and D1 SQLite error fix
assert(ordenesHtml.includes('class="order-my-details-btn" id="wo-filter-my-assignments"'),
  'ordenes.html must place .order-my-details-btn at the beginning of filter bar');
assert(ordenesHtml.includes('id="wo-my-details-count"'),
  'ordenes.html must have #wo-my-details-count badge');
assert(detailViewToggleCss.includes('.order-my-details-btn'),
  'detail-view-toggle.css must style .order-my-details-btn');
assert(detailViewToggleCss.includes('.order-date-picker-box'),
  'detail-view-toggle.css must style .order-date-picker-box');
assert(ordenesJs.includes('function applyCustomDateRange('),
  'ordenes.js must define applyCustomDateRange');
assert(ordenesJs.includes('function clearCustomDateRange('),
  'ordenes.js must define clearCustomDateRange');
assert(ordenesJs.includes('order-date-picker-box'),
  'ordenes.js must render calendar date picker inputs in date filter menu');
assert(ordenesJs.includes("const isCompleted = st === 'completada' || st === 'concluido' || st === 'done';") &&
       ordenesJs.includes("if (isCompleted) return false;"),
  'filteredOrders must exclude completed orders when filterOnlyMyAssignments is active');
assert(relationalStoreJs.includes("COALESCE(w.status,'pendiente') NOT IN ('completada','concluido','done')"),
  'relational-store.js must exclude completed orders when onlyMyAssignments is queried');
assert(relationalStoreJs.includes("orderBy: 'w.rowid DESC'") &&
       relationalStoreJs.includes("query.orderBy ? ` ORDER BY ${query.orderBy}` : ' ORDER BY w.rowid DESC'"),
  'relational-store.js must never generate empty ORDER BY clause, preventing D1 SQLite incomplete input error');
console.log('✓ Item 14 Passed: "Mis detalles" pending-only filter, calendar range picker, and D1 SQL error prevention.');

// 15. "Mis detalles" institutional two-party state logic verification
// Eval common.js to test isOrderPendingForUser directly in Node environment
const sandbox = {
  location: { hostname: 'localhost', href: 'http://localhost' },
  state: {},
  setTimeout: () => {},
  clearTimeout: () => {},
  setInterval: () => {},
  clearInterval: () => {},
  requestAnimationFrame: fn => fn(),
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: { getItem: () => null, setItem: () => {} },
  document: {
    documentElement: { classList: { add: () => {}, remove: () => {} } },
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
  }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(commonJs, sandbox);

const { isOrderPendingForUser } = sandbox;
assert(typeof isOrderPendingForUser === 'function', 'isOrderPendingForUser must be defined');

const userSoporte = { id: 'sop1', username: 'carlos', name: 'Carlos Soporte', role: 'soporte' };
const userAtencion = { id: 'ate1', username: 'ana', name: 'Ana Atencion', role: 'atencion_clientes' };

// Caso A: Reporte Atención -> Soporte, pendiente de resolución
const orderStandardOpen = {
  id: 'wo-101',
  detailKind: 'network',
  status: 'pendiente',
  originRole: 'atencion_clientes',
  targetRole: 'soporte',
  createdById: 'ate1',
  createdByName: 'Ana Atencion',
  assignedUserId: 'sop1',
  assignedUserName: 'Carlos Soporte',
  followUps: []
};
assert(isOrderPendingForUser(orderStandardOpen, userSoporte) === true,
  'Soporte debe ver el detalle asignado cuando falta por resolver sin envíos');
assert(isOrderPendingForUser(orderStandardOpen, userAtencion) === false,
  'Atención no debe ver en "Mis detalles" un reporte que está en manos de Soporte resolviéndose');

// Caso B: Soporte resuelve y manda a confirmar a Atención
const orderStandardResolved = {
  id: 'wo-101',
  detailKind: 'network',
  status: 'resuelto_soporte',
  originRole: 'atencion_clientes',
  targetRole: 'soporte',
  createdById: 'ate1',
  createdByName: 'Ana Atencion',
  assignedUserId: 'sop1',
  assignedUserName: 'Carlos Soporte',
  updatedById: 'sop1',
  technicianReport: { completedBy: 'sop1', completedByName: 'Carlos Soporte' },
  followUps: [
    { action: 'closure_proposed_soporte', byId: 'sop1', byName: 'Carlos Soporte' }
  ]
};
assert(isOrderPendingForUser(orderStandardResolved, userSoporte) === true,
  'Soporte asignado o que resolvió debe conservar el caso en Mis detalles para no perderlo');
assert(isOrderPendingForUser(orderStandardResolved, userAtencion) === true,
  'Atención debe ver en Mis detalles el caso que falta por confirmar o devolver con el cliente');

// Caso C: Atención confirma y concluye
const orderStandardDone = {
  ...orderStandardResolved,
  status: 'completada'
};
assert(isOrderPendingForUser(orderStandardDone, userSoporte) === false,
  'Soporte no debe ver un detalle ya completado');
assert(isOrderPendingForUser(orderStandardDone, userAtencion) === false,
  'Atención no debe ver un detalle ya completado');

// Caso D: Requerimiento Soporte -> Atención (isSentToAttention: true)
const orderReqOpen = {
  id: 'wo-202',
  detailKind: 'network',
  status: 'pendiente',
  originRole: 'soporte',
  targetRole: 'atencion_clientes',
  category: 'verificar_cliente',
  createdById: 'sop1',
  createdByName: 'Carlos Soporte',
  assignedUserId: 'ate1',
  assignedUserName: 'Ana Atencion',
  followUps: []
};
assert(isOrderPendingForUser(orderReqOpen, userAtencion) === true,
  'Atención debe ver el requerimiento asignado mientras falta por resolver');
assert(isOrderPendingForUser(orderReqOpen, userSoporte) === false,
  'Soporte no debe ver el requerimiento mientras Atención lo está resolviendo');

// Caso E: Atención envía respuesta a Soporte para concluir
const orderReqResolved = {
  ...orderReqOpen,
  status: 'resuelto_soporte',
  updatedById: 'ate1',
  followUps: [
    { action: 'closure_proposed_atencion', byId: 'ate1', byName: 'Ana Atencion' }
  ]
};
assert(isOrderPendingForUser(orderReqResolved, userAtencion) === true,
  'Atención asignada o que resolvió debe conservar el caso en Mis detalles para no perderlo');
assert(isOrderPendingForUser(orderReqResolved, userSoporte) === true,
  'Soporte debe ver en Mis detalles el caso que falta por confirmar o devolver');

console.log('✓ Item 15 Passed: "Mis detalles" includes active pending cases and those awaiting confirmation/return so nothing is lost.');

// --- Item 16: Notificaciones pasivas con volumen regulable (no desactivable), cargando no invasivo y cabecera a la izquierda ---
const commonJsStr = fs.readFileSync(path.join(__dirname, '../public/assets/js/common.js'), 'utf8');
const ordersJsStr = fs.readFileSync(path.join(__dirname, '../public/assets/js/ordenes.js'), 'utf8');
const toggleCssStr = fs.readFileSync(path.join(__dirname, '../public/assets/css/detail-view-toggle.css'), 'utf8');
const ordersCssStr = fs.readFileSync(path.join(__dirname, '../public/assets/css/orders-design-v2.css'), 'utf8');

// 1. Notificaciones: volumen regulable y no desactivable
assert(commonJsStr.includes('getNotificationVolume'), 'getNotificationVolume must be present');
assert(commonJsStr.includes('setNotificationVolume'), 'setNotificationVolume must be present');
assert(commonJsStr.includes('Math.max(0.1'), 'Notification volume must enforce a minimum of 0.1 (cannot be deactivated)');
assert(commonJsStr.includes('netops-notif-volume-slider'), 'Volume slider must be present in notification center markup');
assert(commonJsStr.includes('testNotificationVolume'), 'testNotificationVolume must be available');
assert(commonJsStr.includes('vol = typeof getNotificationVolume === \'function\' ? getNotificationVolume() : 0.45'), 'Tone must scale audio gains with user volume');

// 2. Cargando no invasivo en Detalles de red
assert(ordersJsStr.includes('beginLoadingOperation(\'Cargando ordenes\',\'Consultando solo los registros visibles.\', 500)'), 'Delay for orders loading overlay must be increased to 500ms');
assert(toggleCssStr.includes('body.orders-page .loading-overlay'), 'Non-invasive loading overlay rule must exist in detail-view-toggle.css');
assert(toggleCssStr.includes('backdrop-filter: none !important'), 'Loading overlay must not blur background in orders page');
assert(toggleCssStr.includes('pointer-events: none !important'), 'Loading overlay must not block user interactions in orders page');
assert(ordersCssStr.includes('body.orders-page .loading-card'), 'Loading card must have compact styling in orders-design-v2.css');

// 3. Cabecera alineada a la izquierda y título destacado
assert(toggleCssStr.includes('padding-left: 0 !important') && toggleCssStr.includes('margin-left: 0 !important'), 'Hero content must be flush to the left');
assert(toggleCssStr.includes('orders-hero h1') && toggleCssStr.includes('font-size: 16.5px'), 'Hero title Detalles de red must be prominent');
assert(ordersCssStr.includes('orders-hero:before') && ordersCssStr.includes('display: none !important'), 'Decorative pseudo elements that indented the content must be hidden');

console.log('✓ Item 16 Passed: Passive notifications with non-deactivatable volume slider, non-invasive loading, and left-aligned prominent title.');

console.log('\n--- ALL COMPREHENSIVE NETWORK DETAILS & WORKFLOW TESTS PASSED! ---');

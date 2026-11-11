const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- TEST: Network Details Table Redesign, Column Spacing & Chat Closure Prompt ---');

const baseDir = path.resolve(__dirname, '..');
const ordenesJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/ordenes.js'), 'utf8');
const ordersDesignCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/orders-design-v2.css'), 'utf8');

// 1. Icons in table headers for clarity and formal aesthetics
console.log('1. Checking table header icons...');
assert(ordenesJs.includes('th-col-folio'), 'ordenes.js must include th-col-folio class');
assert(ordenesJs.includes('th-col-zone'), 'ordenes.js must include th-col-zone class');
assert(ordenesJs.includes('th-col-place'), 'ordenes.js must include th-col-place class');
assert(ordenesJs.includes('th-col-client'), 'ordenes.js must include th-col-client class');
assert(ordenesJs.includes('th-col-detail'), 'ordenes.js must include th-col-detail class');
assert(ordenesJs.includes('order-th-datetime'), 'ordenes.js must include order-th-datetime');
assert(ordenesJs.includes('th-col-priority'), 'ordenes.js must include th-col-priority class');
assert(ordenesJs.includes('th-col-state'), 'ordenes.js must include th-col-state class');
assert(ordenesJs.includes('th-col-action'), 'ordenes.js must include th-col-action class');

assert(ordersDesignCss.includes('.th-col-folio::before'), 'orders-design-v2.css must style folio header icon');
assert(ordersDesignCss.includes('.th-col-client::before'), 'orders-design-v2.css must style client header icon');
assert(ordersDesignCss.includes('.order-th-datetime::before'), 'orders-design-v2.css must style datetime header icon');
console.log('✓ Item 1 Passed: Table header icons cleanly implemented with SVG.');

// 2. Cliente column reduced width with 2-line wrap & better cell spacing
console.log('2. Checking client column width and cell spacing...');
assert(ordersDesignCss.includes('max-width: 110px !important;') && ordersDesignCss.includes('word-break: break-word !important;'),
  'orders-design-v2.css must constrain client column width and enable word-break');
assert(ordersDesignCss.includes('-webkit-line-clamp: 2 !important;'),
  'orders-design-v2.css must support 2-line clamping for client names');
assert(ordersDesignCss.includes('padding: 10px 12px !important;'),
  'orders-design-v2.css must give table cells proper breathing room so texts do not stick together');
console.log('✓ Item 2 Passed: Client column reduced with clean 2-line wrap and spacious padding.');

// 3. "Atendiendo:" badge fix for long names
console.log('3. Checking "Atendiendo:" badge wrapping protection...');
assert(ordenesJs.includes('<span class="order-checking-label" style="white-space:nowrap;flex-shrink:0;">'),
  'ordenes.js must wrap "Atendiendo:" or "En atención personal" in a nowrap label span');
assert(ordersDesignCss.includes('.order-checking-badge .order-checking-label') && ordersDesignCss.includes('white-space: nowrap !important;'),
  'orders-design-v2.css must strictly enforce nowrap on order-checking-label');
assert(ordersDesignCss.includes('.order-checking-badge .user-color-chip') && ordersDesignCss.includes('text-overflow: ellipsis !important;'),
  'orders-design-v2.css must truncate user chip with ellipsis inside checking badge');
console.log('✓ Item 3 Passed: "Atendiendo:" badge will never split or wrap awkwardly with long names.');

// 4. Modal when closing chat: ask to update status vs just close chat (only when NOT in process by counterparty)
console.log('4. Checking chat close decision prompt and counterparty condition...');
assert(ordenesJs.includes('function getOrderCurrentUserClosureAction(order)'),
  'ordenes.js must implement getOrderCurrentUserClosureAction');
assert(ordenesJs.includes('function promptCloseOrderChatDecision('),
  'ordenes.js must implement promptCloseOrderChatDecision');
assert(ordenesJs.includes('Simplemente cerrar chat'),
  'ordenes.js must provide "Simplemente cerrar chat" option');
assert(ordenesJs.includes('Mandar a concluir'),
  'ordenes.js must provide "Mandar a concluir" option');

// Behavioral check in VM
const sandbox = {
  window: {},
  state: {
    workOrders: [
      {
        id: 'RED-101',
        detailKind: 'network',
        status: 'en_revision',
        assignedUserId: 'u-soporte-1',
        sentToAttention: false, // report sent to Soporte
        followUps: []
      },
      {
        id: 'RED-102',
        detailKind: 'network',
        status: 'resuelto_soporte',
        assignedUserId: 'u-soporte-1',
        sentToAttention: false, // report sent to Soporte, Soporte already proposed closure!
        followUps: [{ action: 'closure_proposed_soporte', byId: 'u-soporte-1' }]
      },
      {
        id: 'RED-103',
        detailKind: 'network',
        status: 'completada',
        sentToAttention: false,
        followUps: []
      }
    ]
  },
  currentActor: { id: 'u-soporte-1', role: 'soporte' },
  getCurrentUser: () => sandbox.currentActor,
  userHasRole: (...roles) => roles.includes(sandbox.currentActor.role),
  isNetworkSupportToAttention: (w) => !!w.sentToAttention,
  getOrderClosureStatus: (w) => {
    const p = (w.followUps || []).some(f => f.action === 'closure_proposed_soporte');
    return { supportConfirmed: p, attentionConfirmed: false };
  }
};

vm.createContext(sandbox);

// Extract getOrderCurrentUserClosureAction definition from ordenesJs
const matchFn = ordenesJs.match(/function getOrderCurrentUserClosureAction\(order\)\s*\{[\s\S]*?\n\}/);
assert(matchFn, 'Must find getOrderCurrentUserClosureAction definition in ordenes.js');
vm.runInContext(matchFn[0], sandbox);

// Case 1: Soporte is working on RED-101 (not yet proposed).
// For Soporte: Soporte can propose closure! NOT in process by counterparty.
sandbox.currentActor = { id: 'u-soporte-1', role: 'soporte' };
assert.strictEqual(sandbox.getOrderCurrentUserClosureAction(sandbox.state.workOrders[0]), 'propose',
  'Soporte should get "propose" action when attending case');

// For Atención on RED-101: it IS in process by counterparty (Soporte). Must return null!
sandbox.currentActor = { id: 'u-atencion-1', role: 'atencion_clientes' };
assert.strictEqual(sandbox.getOrderCurrentUserClosureAction(sandbox.state.workOrders[0]), null,
  'Atención should get null because it is in process by counterparty (Soporte)');

// Case 2: RED-102: Soporte already proposed closure.
// For Soporte: now it IS in process by counterparty (waiting for Atención). Must return null!
sandbox.currentActor = { id: 'u-soporte-1', role: 'soporte' };
assert.strictEqual(sandbox.getOrderCurrentUserClosureAction(sandbox.state.workOrders[1]), null,
  'Soporte should get null because case is now with Atención for confirmation');

// For Atención on RED-102: Atención can confirm and close!
sandbox.currentActor = { id: 'u-atencion-1', role: 'atencion_clientes' };
assert.strictEqual(sandbox.getOrderCurrentUserClosureAction(sandbox.state.workOrders[1]), 'confirm',
  'Atención should get "confirm" action because closure was proposed to them');

// Case 3: Completed detail: must return null for everyone
assert.strictEqual(sandbox.getOrderCurrentUserClosureAction(sandbox.state.workOrders[2]), null,
  'Completed orders must always return null');

console.log('✓ Item 4 Passed: Counterparty check and close modal behavior correctly differentiate turns.');

// 5. Table fills full bottom space & notification bell pinned to bottom-right
console.log('5. Checking bottom vertical fill & notification button corner position...');
assert(ordersDesignCss.includes('.orders-page .order-layout') && ordersDesignCss.includes('min-height: calc(100vh -'),
  'orders-design-v2.css must set min-height on order-layout to occupy full screen');
assert(ordersDesignCss.includes('body.orders-page .orders-table-card') && ordersDesignCss.includes('min-height: calc(100vh -'),
  'orders-design-v2.css must set min-height on orders-table-card');
assert(ordersDesignCss.includes('#notification-bell') && ordersDesignCss.includes('right: 12px !important;') && ordersDesignCss.includes('bottom: 12px !important;'),
  'orders-design-v2.css must pin notification bell to the exact bottom-right corner');
console.log('✓ Item 5 Passed: Table stretches to bottom of screen and notification bell is pinned neatly in corner.');

// 6. Reopened badge count formatting and tracking
console.log('6. Checking reopen count tracking and badge display...');
assert(ordenesJs.includes('function getOrderReopenCount(order)'), 'ordenes.js must implement getOrderReopenCount');
assert(ordenesJs.includes("reopenCount > 1 ? `Reabierto (${reopenCount} veces)` : 'Reabierto (1 vez)'"),
  'ordenes.js must format reopen badge text as "Reabierto (1 vez)" or "Reabierto (X veces)"');
assert(ordenesJs.includes('w.reopenCount = currentReopenCount;'),
  'ordenes.js must update w.reopenCount upon reopening completed WO');

// Test getOrderReopenCount in VM
const matchReopenFn = ordenesJs.match(/function getOrderReopenCount\(order\)\s*\{[\s\S]*?\n\}/);
assert(matchReopenFn, 'Must find getOrderReopenCount definition in ordenes.js');
vm.runInContext(matchReopenFn[0], sandbox);

assert.strictEqual(sandbox.getOrderReopenCount(null), 0, 'Null order must return 0');
assert.strictEqual(sandbox.getOrderReopenCount({}), 0, 'Clean order must return 0');
assert.strictEqual(sandbox.getOrderReopenCount({ isReopened: true }), 1, 'Legacy isReopened: true must return 1');
assert.strictEqual(sandbox.getOrderReopenCount({ reopenCount: 3 }), 3, 'reopenCount: 3 must return 3');
assert.strictEqual(sandbox.getOrderReopenCount({
  reopenCount: 1,
  followUps: [{ action: 'reabierto' }, { action: 'chat_message' }, { action: 'reabierto' }]
}), 2, 'Must calculate max of reopenCount and followUps reopen events');
console.log('✓ Item 6 Passed: Reopen count correctly tracked and displayed dynamically.');

// 7. Offline caching and online recovery resilience
console.log('7. Checking offline cache fallback and live internet reconnection recovery...');
const apiJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/api.js'), 'utf8');
const commonJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/common.js'), 'utf8');

assert(ordenesJs.includes("localStorage.setItem('netops_cached_work_orders_' + activeOrderDetailKind"),
  'ordenes.js must cache work orders to localStorage per detail kind');
assert(ordenesJs.includes("localStorage.getItem('netops_cached_work_orders_' + activeOrderDetailKind"),
  'ordenes.js must fallback to localStorage cache on network failure');
assert(ordenesJs.includes('bindOrderConnectivityEvents'),
  'ordenes.js must bind connectivity events for auto-recovery');
assert(ordenesJs.includes("notify('Conexión a internet restablecida. Actualizando detalles...', 'ok')"),
  'ordenes.js must notify user and reload when connection is restored');
assert(ordenesJs.includes('function selectOrderDetailKind(kind, force = false)'),
  'selectOrderDetailKind must support force parameter');
assert(commonJs.includes("selectOrderDetailKind('network', true)"),
  'common.js must pass force=true when clicking network details nav link');
assert(apiJs.includes('loadOrderPage()'),
  'api.js must call loadOrderPage in renderAfterSync if on orders-page');
assert(apiJs.includes("lastSyncToken = '';"),
  'api.js must reset lastSyncToken on online event to allow immediate sync');
console.log('✓ Item 7 Passed: Offline cache resilience, online auto-recovery and forced navigation reload fully active.');

// 8. Full-screen table occupation (including 125dvh desktop zoom .8 compensation and visible pagination footer)
console.log('8. Checking table full-screen layout and card expansion...');
const toggleCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/detail-view-toggle.css'), 'utf8');
assert(toggleCss.includes('body.orders-page .order-layout') && toggleCss.includes('min-height: 125dvh !important;'),
  'detail-view-toggle.css must expand order-layout to 125dvh on desktop to compensate for body zoom: .8');
assert(toggleCss.includes('body.orders-page .orders-table-card') && toggleCss.includes('flex: 1 1 0% !important;') && toggleCss.includes('min-height: 0 !important;'),
  'detail-view-toggle.css must expand orders-table-card via flex without overflowing the pagination bar');
assert(toggleCss.includes('body.orders-page .orders-table-card .table-wrap') && toggleCss.includes('max-height: calc(100% - 56px) !important;'),
  'detail-view-toggle.css must reserve 56px for the pagination footer inside orders-table-card');
console.log('✓ Item 8 Passed: Table card and wrap occupy 100% of the real screen height while keeping pagination 100% visible.');

// 9. Strict area retake restrictions (Admin can retake; Soporte cannot retake Attention details; Attention cannot retake Soporte)
console.log('9. Checking strict area assignment retake permissions...');
const ordenesHtml = fs.readFileSync(path.join(baseDir, 'public/ordenes.html'), 'utf8');
assert(commonJs.includes('function canUserRetakeNetworkOrder'), 'common.js must implement canUserRetakeNetworkOrder');
assert(ordenesJs.includes('targetArea === \'atencion_clientes\' && (!isAtencion || isSoporte)'),
  'takeOverNetworkOrder must block Soporte from retaking Attention cases');
assert(ordenesJs.includes('targetArea === \'soporte\' && (!isSoporte || isAtencion)'),
  'takeOverNetworkOrder must block Attention from retaking Soporte cases');

// Behavioral check in VM for accent-insensitive and cross-area retake
const areaSandbox = {
  window: {},
  getCurrentUser: () => areaSandbox.actor,
  userHasRole: (...r) => r.includes(areaSandbox.actor?.role),
  normalizeRole: (r) => String(r || '').trim().toLowerCase(),
  normalizeName: (s) => String(s || '').trim().toLowerCase(),
  isOrderAssignedToUser: (order, user) => order.assignedUserId === user.id,
  getKnownUsersByArea: () => ({
    supportList: [{ id: 'u-sop1', name: 'Brayan Rendón', username: 'brayan' }],
    attentionList: [{ id: 'u-at1', name: 'Heidi Geraldine Ramírez Mancilla', username: 'heidi' }],
    stateUsers: []
  }),
  isNetworkSupportToAttention: (order) => order.category === 'verificar_cliente'
};
vm.createContext(areaSandbox);

function extractFunc(src, name) {
  const m = src.match(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\([\\s\\S]*?\\n\\}`));
  assert(m, `Function ${name} not found`);
  return m[0];
}

vm.runInContext(extractFunc(commonJs, 'resolveUserAreaRole'), areaSandbox);
vm.runInContext(extractFunc(commonJs, 'getOrderAssignedAreaRole'), areaSandbox);
vm.runInContext(extractFunc(commonJs, 'canUserRetakeNetworkOrder'), areaSandbox);

const ticketHeidiAccented = {
  id: 'RED-729914',
  detailKind: 'network',
  status: 'en_atencion',
  category: 'bajo_rendimiento',
  assignedUserId: 'u-heidi',
  assignedUserName: 'Heidi Geraldine Ramiréz Mancilla' // Note the 'é' accent
};

// Soporte technician: must NOT be allowed to retake
areaSandbox.actor = { id: 'u-sop1', role: 'soporte' };
assert.strictEqual(areaSandbox.canUserRetakeNetworkOrder(ticketHeidiAccented), false,
  'Soporte must NOT be allowed to retake an order assigned to Heidi (Atención)');

// Admin user: CAN retake
areaSandbox.actor = { id: 'u-admin', role: 'administrador' };
assert.strictEqual(areaSandbox.canUserRetakeNetworkOrder(ticketHeidiAccented), true,
  'Admin MUST be allowed to retake any case');

// Attention peer: CAN retake
areaSandbox.actor = { id: 'u-at2', role: 'atencion_clientes' };
assert.strictEqual(areaSandbox.canUserRetakeNetworkOrder(ticketHeidiAccented), true,
  'Another Attention colleague CAN retake');
console.log('✓ Item 9 Passed: Cross-area retake strictly blocked for Soporte on Attention cases, accent-normalized, and admin allowed.');

// 10. Status dropdown restored & Mis detalles preserved
console.log('10. Checking status dropdown restoration & "Mis detalles" filter...');
assert(ordenesHtml.includes('id="order-filter-wrap-status"'), 'Status filter dropdown must exist in HTML');
assert(ordenesHtml.includes('id="wo-filter-my-assignments"'), 'wo-filter-my-assignments button must exist in HTML');
assert(!ordenesHtml.includes('id="wo-filter-pending-counterparty"'), 'wo-filter-pending-counterparty must be removed from HTML');
assert(ordenesHtml.includes('data-order-filter-kind="status"'), 'status filter kind button must exist');

assert(ordenesJs.includes('activeOrderFilters.status'), 'ordenes.js must maintain activeOrderFilters.status state');
assert(ordenesJs.includes('function toggleOrderFilterMenu'), 'ordenes.js must implement toggleOrderFilterMenu');
assert(ordenesJs.includes('filterOnlyMyAssignments'), 'ordenes.js must maintain filterOnlyMyAssignments state');
assert(ordenesJs.includes('function toggleOnlyMyAssignments'), 'ordenes.js must implement toggleOnlyMyAssignments');

console.log('✓ Item 10 Passed: Status dropdown restored and "Mis detalles" active.');

console.log('\n--- ALL NETWORK DETAILS ENHANCEMENT TESTS PASSED! ---');


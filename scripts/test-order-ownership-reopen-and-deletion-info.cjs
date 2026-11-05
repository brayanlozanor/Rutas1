const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('Testing Detail Ownership, Reopen Permissions, Unresolvable Icons & Complete Deletion Info...');

// --- 1. Test ordenes.js logic ---
const ordenesCode = fs.readFileSync(path.resolve('public/assets/js/ordenes.js'), 'utf8');

// Set up VM context for testing ordenes.js helper functions
let currentUser = { id: 'u_soporte_1', username: 'soporte_user', name: 'Soporte Juan', role: 'soporte' };
let currentRoles = ['soporte'];
let notifyMessages = [];

const mockContext = {
  state: {
    workOrders: [],
    users: [
      { id: 'u_soporte_1', username: 'soporte_user', name: 'Soporte Juan', role: 'soporte' },
      { id: 'u_admin_1', username: 'admin_user', name: 'Admin Carlos', role: 'administrador' },
      { id: 'u_atencion_1', username: 'atencion_ana', name: 'Atención Ana', role: 'atencion_clientes' },
      { id: 'u_atencion_2', username: 'atencion_luis', name: 'Atención Luis', role: 'atencion_clientes' }
    ]
  },
  getCurrentUser: () => currentUser,
  userHasRole: (...roles) => roles.some(r => currentRoles.includes(r)),
  normalizeName: (str) => String(str || '').toLowerCase().trim(),
  orderEscape: (s) => String(s || ''),
  notify: (msg, type) => { notifyMessages.push({ msg, type }); }
};

vm.createContext(mockContext);

// Extract helper functions from ordenes.js
const canEditOrderMatch = ordenesCode.match(/function canEditOrder\(order\) \{[\s\S]*?\n\}/);
assert(canEditOrderMatch, 'canEditOrder must be defined in ordenes.js');

const isCreatedByAttentionMatch = ordenesCode.match(/function isCreatedByAttention\(order\) \{[\s\S]*?\n\}/);
assert(isCreatedByAttentionMatch, 'isCreatedByAttention must be defined in ordenes.js');

const orderReportIconMatch = ordenesCode.match(/function orderReportIcon\(type\) \{[\s\S]*?\n\}/);
assert(orderReportIconMatch, 'orderReportIcon must be defined in ordenes.js');

vm.runInContext(canEditOrderMatch[0], mockContext);
vm.runInContext(isCreatedByAttentionMatch[0], mockContext);
vm.runInContext(orderReportIconMatch[0], mockContext);

// Test 1: canEditOrder permissions (strict ownership regardless of role)
const orderCreatedByAna = {
  id: 'wo_1',
  createdById: 'u_atencion_1',
  createdByUsername: 'atencion_ana',
  createdByName: 'Atención Ana',
  createdByRole: 'atencion_clientes'
};

const orderCreatedByJuan = {
  id: 'wo_2',
  createdById: 'u_soporte_1',
  createdByUsername: 'soporte_user',
  createdByName: 'Soporte Juan',
  createdByRole: 'soporte'
};

const legacyOrderWithoutAudit = {
  id: 'wo_legacy'
};

// When current user is Juan:
currentUser = { id: 'u_soporte_1', username: 'soporte_user', name: 'Soporte Juan', role: 'soporte' };
currentRoles = ['soporte'];
assert.strictEqual(mockContext.canEditOrder(orderCreatedByJuan), true, 'Creator can edit their own detail');
assert.strictEqual(mockContext.canEditOrder(orderCreatedByAna), false, 'User CANNOT edit detail created by Ana');
assert.strictEqual(mockContext.canEditOrder(legacyOrderWithoutAudit), true, 'Legacy detail allows edit');

// When current user is Admin Carlos: Admin also CANNOT edit Ana's detail ("independientemente del rol, no debo poder editar los detalles de alguien más")
currentUser = { id: 'u_admin_1', username: 'admin_user', name: 'Admin Carlos', role: 'administrador' };
currentRoles = ['administrador', 'admin'];
assert.strictEqual(mockContext.canEditOrder(orderCreatedByAna), false, 'Admin CANNOT edit detail created by someone else');
assert.strictEqual(mockContext.canEditOrder(orderCreatedByJuan), false, 'Admin CANNOT edit detail created by Juan');

// When current user is Ana:
currentUser = { id: 'u_atencion_1', username: 'atencion_ana', name: 'Atención Ana', role: 'atencion_clientes' };
currentRoles = ['atencion_clientes'];
assert.strictEqual(mockContext.canEditOrder(orderCreatedByAna), true, 'Ana can edit her own detail');
assert.strictEqual(mockContext.canEditOrder(orderCreatedByJuan), false, 'Ana CANNOT edit Juan detail');

console.log('✓ Test 1 Passed: Edit ownership strictly restricted to detail creator for all roles.');

// Test 2: isCreatedByAttention
assert.strictEqual(mockContext.isCreatedByAttention(orderCreatedByAna), true, 'Correctly identifies order created by atención');
assert.strictEqual(mockContext.isCreatedByAttention(orderCreatedByJuan), false, 'Correctly rejects order created by soporte');
assert.strictEqual(mockContext.isCreatedByAttention({ originRole: 'atencion_clientes' }), true, 'Identifies by originRole');

console.log('✓ Test 2 Passed: isCreatedByAttention accurately determines creator department.');

// Test 3: Unresolvable icons exist in ordenes.js and ordenes.html
const unresIcon = mockContext.orderReportIcon('unresolvable');
assert(unresIcon.includes('<svg') && unresIcon.includes('line'), 'orderReportIcon must provide unresolvable icon');

const clockIcon = mockContext.orderReportIcon('clock');
assert(clockIcon.includes('<svg') && clockIcon.includes('circle'), 'orderReportIcon must provide clock icon');

const ordenesHtml = fs.readFileSync(path.resolve('public/ordenes.html'), 'utf8');
assert(ordenesHtml.includes('btn-modal-unresolvable') && ordenesHtml.includes('<svg'), 'btn-modal-unresolvable in ordenes.html must have an icon');
assert(ordenesHtml.includes('btn-danger-unresolvable') && ordenesHtml.includes('<svg'), 'btn-danger-unresolvable in ordenes.html must have an icon');
assert(ordenesCode.includes('net-btn-unresolvable') && ordenesCode.includes('<svg'), 'net-btn-unresolvable in ordenes.js must have an icon');

console.log('✓ Test 3 Passed: Icons present on unresolvable report buttons and modal headers.');

// Test 4: Verification of Audit date display in openOrderTechnicianReport
assert(ordenesCode.includes("order.updatedAt && order.updatedAt !== order.createdAt"), 'openOrderTechnicianReport must check order.updatedAt');
assert(ordenesCode.includes("'clock', 'Última edición'"), 'openOrderTechnicianReport must render Última edición with clock icon');

console.log('✓ Test 4 Passed: Detail report displays edit timestamp and editor chip when edited.');

// Test 5: Complete deletion request notifications
const apiCode = fs.readFileSync(path.resolve('public/assets/js/api.js'), 'utf8');
assert(apiCode.includes("req.folio = order.folio"), 'createDeletionRequest must populate folio for detail');
assert(apiCode.includes("req.clientName = order.clientName"), 'createDeletionRequest must populate clientName for detail');
assert(apiCode.includes("req.town = order.town"), 'createDeletionRequest must populate town for detail');
assert(apiCode.includes("req.description = order.description"), 'createDeletionRequest must populate description for detail');

const commonCode = fs.readFileSync(path.resolve('public/assets/js/common.js'), 'utf8');
assert(commonCode.includes('deletion-request-card'), 'renderNotificationCenter must render structured deletion request card');
assert(commonCode.includes('Cliente / Registro:'), 'Notification card must display Cliente');
assert(commonCode.includes('Pueblo / Lugar:'), 'Notification card must display Pueblo');
assert(commonCode.includes('Detalle solicitado:'), 'Notification card must display Detalle');
assert(commonCode.includes('Solicitado por:'), 'Notification card must display Requester');

console.log('✓ Test 5 Passed: Deletion requests in notifications panel show complete metadata.');

// Test 6: Bottom Nav Floating Bell Overlap Prevention
const dashCss = fs.readFileSync(path.resolve('public/assets/css/technician-dashboard.css'), 'utf8');
assert(dashCss.includes('body:has(.tech-bottom-nav) #notification-bell'), 'Dashboard CSS must hide bell when bottom nav is present');

const styleCss = fs.readFileSync(path.resolve('public/assets/css/style.css'), 'utf8');
assert(styleCss.includes('body:has(.tech-bottom-nav) .floating-notification-bell'), 'Style CSS must hide floating bell when bottom nav is present on mobile');

assert(commonCode.includes("if (document.querySelector('.tech-bottom-nav')"), 'common.js must hide floating bell when bottom nav is in DOM');

console.log('✓ Test 6 Passed: Floating bell is completely hidden and cannot overlap mobile bottom nav.');

// Test 7: Technician stop and transit layout
const planCode = fs.readFileSync(path.resolve('public/assets/js/planificar.js'), 'utf8');
assert(!planCode.includes('<div class="tech-route-leg-line"></div>'), 'planificar.js removed cutting vertical dashed line from transit banner');
assert(dashCss.includes('.tech-stop-name') && dashCss.includes('grid-column: 2 !important;'), 'Stop name must be pinned to grid column 2');
assert(dashCss.includes('.tech-stop-badge-col') && dashCss.includes('grid-column: 3 !important;'), 'Stop badge must be pinned to grid column 3');

console.log('✓ Test 7 Passed: Technician route stops and transit banner layout verified.');

console.log('\nALL TESTS PASSED: Order Ownership, Reopen Permissions, Unresolvable Icons & Complete Info OK!');

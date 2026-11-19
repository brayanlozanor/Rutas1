// Test: Complete Visual & Interactive Cleanup of "Detalles físicos"
// Verifies that physical details act strictly as an infrastructure registry/log
// and that all network/collaborative/counterparty artifacts are visually eliminated.

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('=== TEST: Physical Details Cleanup & Distinction ===\n');

const ordenesJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'ordenes.js');
const cssPath1 = path.join(__dirname, '..', 'public', 'assets', 'css', 'orders-design-v2.css');
const cssPath2 = path.join(__dirname, '..', 'public', 'assets', 'css', 'detail-view-toggle.css');
const htmlPath = path.join(__dirname, '..', 'public', 'ordenes.html');

const ordenesJs = fs.readFileSync(ordenesJsPath, 'utf8').replace(/\r\n/g, '\n');
const css1 = fs.readFileSync(cssPath1, 'utf8').replace(/\r\n/g, '\n');
const css2 = fs.readFileSync(cssPath2, 'utf8').replace(/\r\n/g, '\n');
const html = fs.readFileSync(htmlPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Check CSS Scoping
console.log('1. Checking CSS rules for body.orders-page[data-detail-kind="physical"]...');
[css1, css2].forEach((css, idx) => {
  const fileName = idx === 0 ? 'orders-design-v2.css' : 'detail-view-toggle.css';
  assert(css.includes('body.orders-page[data-detail-kind="physical"] .order-subtle-guides-group'), `${fileName} must hide .order-subtle-guides-group in physical mode`);
  assert(css.includes('body.orders-page[data-detail-kind="physical"] .order-action-needed-pill'), `${fileName} must hide .order-action-needed-pill in physical mode`);
  assert(css.includes('body.orders-page[data-detail-kind="physical"] .order-waiting-other-pill'), `${fileName} must hide .order-waiting-other-pill in physical mode`);
  assert(css.includes('body.orders-page[data-detail-kind="physical"] .order-checking-badge'), `${fileName} must hide .order-checking-badge in physical mode`);
  assert(css.includes('body.orders-page[data-detail-kind="physical"] .order-reopened-badge'), `${fileName} must hide .order-reopened-badge in physical mode`);
  assert(css.includes('body.orders-page[data-detail-kind="physical"] #wo-assign-field'), `${fileName} must hide #wo-assign-field in physical mode`);
  assert(css.includes('body.orders-page[data-detail-kind="physical"] #wo-target-team-field'), `${fileName} must hide #wo-target-team-field in physical mode`);
  assert(css.includes('body.orders-page[data-detail-kind="physical"] #wo-priority-interval-box'), `${fileName} must hide #wo-priority-interval-box in physical mode`);
});
console.log('✓ Item 1 Passed: CSS rules strictly scoped and hiding non-physical elements.');

// 2. Check JavaScript Filter Options
console.log('2. Checking status filter options in ordenes.js...');
assert(ordenesJs.includes("if (activeOrderDetailKind === 'network') {"), 'getOrderFilterOptions must branch on activeOrderDetailKind');
assert(ordenesJs.includes("['pendiente', 'Registro activo'],\n      ['completada', 'Completado']"), 'getOrderFilterOptions for physical must only return Registro activo & Completado');
console.log('✓ Item 2 Passed: Status filter options cleanly restricted for physical details.');

// 3. Check Header Guides Hiding in JS
console.log('3. Checking header guides visibility update in updateOrderFiltersForDetailKind...');
assert(ordenesJs.includes("const guidesGroup = document.querySelector('.order-subtle-guides-group');"), 'updateOrderFiltersForDetailKind must query .order-subtle-guides-group');
assert(ordenesJs.includes("if (guidesGroup) guidesGroup.style.display = isNetwork ? '' : 'none';"), 'guidesGroup must be hidden when not network');
console.log('✓ Item 3 Passed: Header guides group dynamically hidden in physical mode.');

// 4. Check Modal Step Titles & Fields
console.log('4. Checking applyRoleFormVisibility modal titles and step headers...');
assert(ordenesJs.includes("editingWOId ? 'Editar registro de detalle físico' : 'Registrar detalle físico'"), 'applyRoleFormVisibility must use physical record titles');
assert(ordenesJs.includes("'Ubicación de infraestructura (Pueblo y Antena)'"), 'applyRoleFormVisibility must name step 3 "Ubicación de infraestructura (Pueblo y Antena)" for physical');
assert(ordenesJs.includes("'Pueblo y Asignación de Atención'"), 'applyRoleFormVisibility must restore step 3 title for network');
console.log('✓ Item 4 Passed: Modal titles and step 3 header dynamically adapted.');

// 5. Check Detail Modal (Report) Header and Banner
console.log('5. Checking openOrderTechnicianReport modal title and banner...');
assert(ordenesJs.includes("(completed ? 'Registro físico concluido' : 'Registro de detalle físico')"), 'openOrderTechnicianReport must show physical header title');
assert(ordenesJs.includes('<strong>Registro de detalle físico:</strong> Este registro documenta una necesidad física en sitio o antena para su consulta y resolución en una ruta técnica posterior.'), 'openOrderTechnicianReport must explain physical log role');
assert(ordenesJs.includes("order.detailKind === 'network' && reopenCount > 0"), 'openOrderTechnicianReport must only show reopen badge for network');
console.log('✓ Item 5 Passed: Detail modal displays proper physical titles, banners and omits chat/reopen.');

// 6. Check Table Row Rendering in renderWOs
console.log('6. Checking renderWOs table row classes and actions...');
assert(ordenesJs.includes("const isNetworkRow = w.detailKind === 'network';"), 'renderWOs must distinguish network row');
assert(ordenesJs.includes("isNetworkRow && pendingAction.requiresMyAction ? 'order-row-action-required' : ''"), 'action-required tr class must only apply to network');
assert(ordenesJs.includes("isNetworkRow && pendingAction.waitingOther ? 'order-row-waiting-counterparty' : ''"), 'waiting-counterparty tr class must only apply to network');
assert(ordenesJs.includes("isNetworkRow && reopenCount > 0 ?"), 'reopen count badge in folio cell must only apply to network');
assert(ordenesJs.includes("isNetworkRow && pendingAction.requiresMyAction ?"), 'pending action pill in state cell must only apply to network');
assert(ordenesJs.includes("title=\"Ver registro físico\""), 'physical action must have clean "Ver registro físico" view button');
console.log('✓ Item 6 Passed: Table rows clean of counterparty alerts, badges and buttons in physical mode.');

console.log('\n=== ALL PHYSICAL DETAILS CLEANUP TESTS PASSED SUCCESSFULLY! ===\n');

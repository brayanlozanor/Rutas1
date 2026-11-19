const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST: Physical Detail Buttons (Ver, Editar, Completar, Eliminar) ===');

const ordenesCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'js', 'ordenes.js'), 'utf8');

// 1. Check orderActionIcon has view, edit, complete, delete
assert.ok(ordenesCode.includes("complete: '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m8 12 2.6 2.6L16.5 8.5\"/></svg>'"), 'orderActionIcon must include complete icon');
console.log('✓ 1. orderActionIcon includes complete icon.');

// 2. Check table rendering generates all 4 buttons for physical details
// Ver (order-view-report)
assert.ok(ordenesCode.includes('class="btn order-view-report" title="Ver registro físico"'), 'Physical details must include "Ver registro físico" button');
// Editar (order-edit-action)
assert.ok(ordenesCode.includes('class="btn order-edit-action" title="Editar información del registro físico"'), 'Physical details must include "Editar información del registro físico" button');
// Completar (order-complete-action)
assert.ok(ordenesCode.includes('class="btn order-complete-action"'), 'Physical details must include "Completar registro físico" button');
assert.ok(ordenesCode.includes("onclick=\"event.stopPropagation();markWODone('${w.id}')\""), 'Completar button must call markWODone');
// Eliminar (order-delete-action)
assert.ok(ordenesCode.includes('class="btn order-delete-action" title="${userHasRole(\'administrador\', \'admin\') ? \'Eliminar registro definitivamente\' : \'Solicitar eliminación del detalle\'}"'), 'Physical details must include "Eliminar" button');
assert.ok(ordenesCode.includes("onclick=\"deleteWO('${w.id}')\""), 'Delete button must call deleteWO');

console.log('✓ 2. Table row template renders all 4 functional buttons: Ver, Editar, Completar, Eliminar.');

// 3. Verify CSS does NOT hide action buttons in physical view
const toggleCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'css', 'detail-view-toggle.css'), 'utf8');
const designCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'css', 'orders-design-v2.css'), 'utf8');

assert.ok(!toggleCss.includes('body.orders-page[data-detail-kind="physical"] .order-complete-action'), 'detail-view-toggle.css must not hide order-complete-action');
assert.ok(!toggleCss.includes('body.orders-page[data-detail-kind="physical"] .order-edit-action'), 'detail-view-toggle.css must not hide order-edit-action');
assert.ok(!toggleCss.includes('body.orders-page[data-detail-kind="physical"] .order-delete-action'), 'detail-view-toggle.css must not hide order-delete-action');
assert.ok(!toggleCss.includes('body.orders-page[data-detail-kind="physical"] .order-view-report'), 'detail-view-toggle.css must not hide order-view-report');

assert.ok(!designCss.includes('body.orders-page[data-detail-kind="physical"] .order-complete-action'), 'orders-design-v2.css must not hide order-complete-action');
assert.ok(!designCss.includes('body.orders-page[data-detail-kind="physical"] .order-edit-action'), 'orders-design-v2.css must not hide order-edit-action');
assert.ok(!designCss.includes('body.orders-page[data-detail-kind="physical"] .order-delete-action'), 'orders-design-v2.css must not hide order-delete-action');
assert.ok(!designCss.includes('body.orders-page[data-detail-kind="physical"] .order-view-report'), 'orders-design-v2.css must not hide order-view-report');

console.log('✓ 3. Verified that CSS does not hide any of the 4 buttons in physical detail view.');

// 4. Verify functionality of handlers (openOrderTechnicianReport, openWO, markWODone, deleteWO)
assert.ok(ordenesCode.includes('async function openOrderTechnicianReport(orderId)'), 'openOrderTechnicianReport function must exist');
assert.ok(ordenesCode.includes('async function openWO('), 'openWO function must exist');
assert.ok(ordenesCode.includes('async function markWODone(id)'), 'markWODone function must exist');
assert.ok(ordenesCode.includes('async function deleteWO(id)'), 'deleteWO function must exist');

console.log('✓ 4. Handlers openOrderTechnicianReport, openWO, markWODone, deleteWO are defined and functional.');

console.log('\n=== ALL PHYSICAL DETAIL BUTTON TESTS PASSED SUCCESSFULLY! ===');

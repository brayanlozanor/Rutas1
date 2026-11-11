const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- TEST: Order Row Colors in Mis Detalles & Color Guide Parity ---');

const ordenesHtml = fs.readFileSync(path.join(__dirname, '../public/ordenes.html'), 'utf8');
const ordenesJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/ordenes.js'), 'utf8');
const ordersDesignCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/orders-design-v2.css'), 'utf8');

// 1. Check JS row class construction
console.log('1. Checking JS row class construction...');
assert(ordenesJs.includes("pendingAction.requiresMyAction ? 'order-row-action-required' : ''"),
  'ordenes.js must add order-row-action-required when user must confirm');
assert(ordenesJs.includes("pendingAction.waitingOther ? 'order-row-waiting-counterparty' : ''"),
  'ordenes.js must add order-row-waiting-counterparty when waiting for other part');

// 2. Check CSS styling for order-row-action-required (Ámbar / Amarillo)
console.log('2. Checking CSS for order-row-action-required (Tu turno de confirmar)...');
assert(ordersDesignCss.includes('.orders-page .order-table tbody tr.order-row-action-required>td') ||
       ordersDesignCss.includes('.orders-page .order-table tbody tr.order-row-action-required > td'),
  'orders-design-v2.css must style tr.order-row-action-required > td');
assert(ordersDesignCss.includes('#fffbeb'), 'order-row-action-required must use warm amber/yellow background #fffbeb');
assert(ordersDesignCss.includes('#f59e0b'), 'order-row-action-required must have amber indicator #f59e0b');

// 3. Check CSS styling for order-row-waiting-counterparty (Violeta / Lavanda)
console.log('3. Checking CSS for order-row-waiting-counterparty (Falta confirmar la otra parte)...');
assert(ordersDesignCss.includes('.orders-page .order-table tbody tr.order-row-waiting-counterparty>td') ||
       ordersDesignCss.includes('.orders-page .order-table tbody tr.order-row-waiting-counterparty > td'),
  'orders-design-v2.css must style tr.order-row-waiting-counterparty > td');
assert(ordersDesignCss.includes('#f5f3ff'), 'order-row-waiting-counterparty must use soft lavender/violet background #f5f3ff');
assert(ordersDesignCss.includes('#8b5cf6'), 'order-row-waiting-counterparty must have violet indicator #8b5cf6');

// 4. Check Guía de colores in ordenes.html
console.log('4. Checking Guía de colores modal in ordenes.html...');
assert(ordenesHtml.includes('Colores de fila en la tabla y en "Mis detalles"'),
  'ordenes.html Guía de colores must include section for row colors in table and Mis detalles');
assert(ordenesHtml.includes('Falta por confirmar (Tu turno)') || ordenesHtml.includes('Falta por confirmar'),
  'Guía de colores must explain el detalle que falta por confirmar');
assert(ordenesHtml.includes('Falta confirmar la otra parte') || ordenesHtml.includes('contraparte'),
  'Guía de colores must explain los que faltan por confirmar de la otra parte');
assert(ordenesHtml.includes('Se están atendiendo ya') || ordenesHtml.includes('atendiendo'),
  'Guía de colores must explain que solo aparecen normal los que se están atendiendo ya');

console.log('✓ ALL ROW COLORS & GUIDE TESTS PASSED!');


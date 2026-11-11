const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- TEST: Pagination Format from Image, Always Visible & Physical Stats Hide ---');

const antenasJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/antenas.js'), 'utf8');
const nodosJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/nodos.js'), 'utf8');
const ordenesJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/ordenes.js'), 'utf8');
const ordenesHtml = fs.readFileSync(path.join(__dirname, '../public/ordenes.html'), 'utf8');
const invPagCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/inventory-pagination.css'), 'utf8');
const ordersDesignCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/orders-design-v2.css'), 'utf8');
const ordersTableSimpleCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/orders-table-simple.css'), 'utf8');
const detailToggleCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/detail-view-toggle.css'), 'utf8');

// 1. Check antenas.js and nodos.js pagination
console.log('1. Checking antenas.js & nodos.js pagination...');
assert(antenasJs.includes('<div class="inventory-pagination">'), 'antenas.js must use inventory-pagination');
assert(nodosJs.includes('<div class="inventory-pagination">'), 'nodos.js must use inventory-pagination');

// 2. Check ordenes.js pagination matching the user provided image
console.log('2. Checking ordenes.js pagination matching image format regardless of row count...');
assert(ordenesJs.includes('<div class="inventory-pagination order-table-footer">'), 'ordenes.js must render pagination footer');
assert(ordenesJs.includes('aria-label="Primera página"'), 'ordenes.js must have « button');
assert(ordenesJs.includes('aria-label="Página anterior"'), 'ordenes.js must have ‹ button');
assert(ordenesJs.includes('Página ${orderCurrentPage} de ${totalPages}'), 'ordenes.js must display "Página X de Y" between buttons');
assert(ordenesJs.includes('aria-label="Página siguiente"'), 'ordenes.js must have › button');
assert(ordenesJs.includes('aria-label="Última página"'), 'ordenes.js must have » button');
assert(ordenesJs.includes('de ${totalRows} detalles)'), 'ordenes.js must show total as "(X-Y de Z detalles)"');
assert(ordenesJs.includes('Filas por página'), 'ordenes.js must have label "Filas por página" as in the image');
assert(ordenesJs.includes('<option value="15"'), 'ordenes.js must have 15 option');
assert(ordenesJs.includes('let orderRowsPerPage = 15;'), 'ordenes.js default orderRowsPerPage must be 15');
assert(ordenesJs.includes('${renderOrderPagination(0, 0, 0, 1)}'), 'ordenes.js must render pagination footer even when 0 rows match');
assert(ordenesJs.includes('${renderOrderPagination(totalRows, rangeStart, rangeEnd, totalPages)}'), 'ordenes.js must render pagination footer for all row counts');

// 3. Check CSS for pagination visibility and no viewport overflow clipping
console.log('3. Checking CSS for pagination visibility...');
assert(ordersDesignCss.includes('.orders-page .inventory-page-button'), 'orders-design-v2.css must style page buttons');
assert(ordersDesignCss.includes('.orders-page .order-page-total-label'), 'orders-design-v2.css must style total label');
assert(ordersDesignCss.includes('padding-right: 76px !important;'), 'orders-design-v2.css must ensure clearance for notification button');
assert(!detailToggleCss.includes('min-height: calc(125dvh - 178px)'), 'detail-view-toggle.css must NOT force 125dvh - 178px min-height on table-wrap which clips the pagination bar');
assert(!detailToggleCss.includes('height: calc(125dvh - 128px)'), 'detail-view-toggle.css must NOT force 125dvh - 128px height on orders-table-card which overflows the viewport');
assert(!ordersDesignCss.includes('min-height: calc(125dvh - 180px)'), 'orders-design-v2.css must NOT force 125dvh - 180px min-height on table-wrap');
assert(detailToggleCss.includes('max-height: calc(100% - 56px) !important;'), 'detail-view-toggle.css must reserve 56px for the pagination footer');

// 4. Check "Mis pendientes" and "Mis resueltos" hidden in Detalles físicos
console.log('4. Checking that "Mis pendientes" and "Mis resueltos" are hidden in Detalles físicos...');
assert(ordersDesignCss.includes('body.orders-page[data-detail-kind="physical"] #wo-stat-my-pending-card') &&
       ordersDesignCss.includes('display: none !important;'),
  'orders-design-v2.css must hide my pending and done cards in physical details');
assert(detailToggleCss.includes('body.orders-page[data-detail-kind="physical"] #wo-stat-my-pending-card') &&
       detailToggleCss.includes('display: none !important;'),
  'detail-view-toggle.css must hide my pending and done cards in physical details');
assert(ordenesJs.includes('document.body.dataset.detailKind = activeOrderDetailKind;'),
  'ordenes.js must set dataset.detailKind on body');

// 5. Check "Atendiendo:" badge wrapping protection
console.log('5. Checking "Atendiendo:" badge wrapping protection...');
assert(ordersDesignCss.includes('word-break: keep-all !important;'), 'orders-design-v2.css must enforce word-break: keep-all');
assert(ordersDesignCss.includes('overflow-wrap: normal !important;'), 'orders-design-v2.css must enforce overflow-wrap: normal');
assert(ordersTableSimpleCss.includes('overflow-wrap: normal !important;') && ordersTableSimpleCss.includes('word-break: keep-all !important;'), 'orders-table-simple.css must protect tags and badge');

console.log('✓ ALL PAGINATION IMAGE FORMAT, VISIBILITY & PHYSICAL STATS HIDE TESTS PASSED!');

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- TEST: Network Details Responsive UI & "Sin servicio de internet" Category ---');

const baseDir = path.resolve(__dirname, '..');
const ordenesJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/ordenes.js'), 'utf8');
const commonJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/common.js'), 'utf8');
const ordersDesignCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/orders-design-v2.css'), 'utf8');
const ordersTableSimpleCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/orders-table-simple.css'), 'utf8');

// 1. Verify "sin_internet" in ORDER_CATEGORIES_BY_KIND.network (ordenes.js)
assert(ordenesJs.includes("['sin_internet', 'Sin servicio de internet']"), 'ordenes.js must include sin_internet category');
assert(commonJs.includes("['sin_internet', 'Sin servicio de internet']"), 'common.js must include sin_internet category');
console.log('✓ "Sin servicio de internet" category registered in both ordenes.js and common.js.');

// 2. Verify category helper functions in ordenes.js
const startCategories = ordenesJs.indexOf('const ORDER_CATEGORIES_BY_KIND = {');
assert(startCategories !== -1, 'ORDER_CATEGORIES_BY_KIND must exist');
const categoriesScope = new Function(`
  ${ordenesJs.substring(startCategories, ordenesJs.indexOf('const PHYSICAL_STATS_EXCLUDED_CATEGORIES'))}
  return { ORDER_CATEGORIES_BY_KIND, ORDER_CATEGORIES };
`);
const { ORDER_CATEGORIES_BY_KIND, ORDER_CATEGORIES } = categoriesScope();

assert(ORDER_CATEGORIES_BY_KIND.network.some(([k, label]) => k === 'sin_internet' && label === 'Sin servicio de internet'), 'network categories must contain sin_internet');
assert(ORDER_CATEGORIES.some(([k, label]) => k === 'sin_internet'), 'ORDER_CATEGORIES must contain sin_internet');
console.log('✓ Category mappings validated successfully.');

// 3. Verify Responsive CSS for Cards and Action Buttons
assert(ordersDesignCss.includes('grid-template-columns: repeat(auto-fit, minmax(320px, 1fr))'), 'Card grid must use auto-fit minmax for all screen sizes');
assert(ordersDesignCss.includes('td[data-label="Acción"]'), 'CSS must specifically adapt Acción td');
assert(ordersDesignCss.includes('flex-direction: column !important'), 'Acción td must use column direction to grant full width to actions');
assert(ordersDesignCss.includes('flex-wrap: wrap !important'), 'order-actions must wrap to prevent button cut-off');
assert(ordersTableSimpleCss.includes('flex-wrap:wrap!important'), 'orders-table-simple.css must allow flex-wrap on order-actions');

// 4. Verify that net-btn-open and net-btn-retake share identical width and flex wrapping
assert(ordersDesignCss.includes('width: 88px !important;'), 'net-btn-open/retake must have shared 88px width');

// 5. Verify that pagination footer does not overlap cards when shrinking screen
assert(ordersDesignCss.includes('height: auto !important;'), 'table-wrap must have height: auto in responsive mode');
assert(ordersDesignCss.includes('margin-top: 18px !important;'), 'order-table-footer must have positive top margin');
assert(ordersDesignCss.includes('@media(min-width:1101px)'), 'clamp height must only apply to desktop table view > 1100px');
console.log('✓ Full responsive layout, button visibility, and pagination non-overlapping rules verified.');

console.log('--- ALL NETWORK DETAILS RESPONSIVE TESTS PASSED SUCCESSFULLY! ---');

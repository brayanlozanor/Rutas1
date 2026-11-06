const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Testing Chat Attached History, System Event Highlights & Concealed Full Details Accordion...');

const ordenesJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/ordenes.js'), 'utf8');
const ordersCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/orders-design-v2.css'), 'utf8');

// 1. Check openOrderTechnicianReport structure for network orders
console.log('1. Checking openOrderTechnicianReport network layout...');
assert(ordenesJs.includes("if (order.detailKind === 'network')"), 'Must have dedicated network layout');
assert(ordenesJs.includes('order-report-essential-bar'), 'Essential bar must exist for quick identification');
assert(ordenesJs.includes('order-full-details-accordion'), 'Full details must be in collapsible accordion');
assert(ordenesJs.includes('Ver todos los detalles técnicos y fotos'), 'Accordion summary label must exist');

// 2. Check that separate timeline is eliminated outside the chat for network orders
console.log('2. Checking elimination of external timeline in network orders...');
// In network branch, renderOrderFollowUpTimeline should NOT be called
const networkBranchCode = ordenesJs.substring(
  ordenesJs.indexOf("if (order.detailKind === 'network')"),
  ordenesJs.indexOf("} else {")
);
assert(!networkBranchCode.includes('renderOrderFollowUpTimeline'), 'External timeline must be eliminated for network orders');

// 3. Check that chat attaches and highlights all tracking events
console.log('3. Checking tracking events attached and highlighted inside the chat...');
assert(ordenesJs.includes('system-resolved'), 'Chat must highlight resolution events');
assert(ordenesJs.includes('system-returned'), 'Chat must highlight return events');
assert(ordenesJs.includes('system-completed'), 'Chat must highlight completion events');
assert(ordenesJs.includes('system-retaken'), 'Chat must highlight retaken events');
assert(ordenesJs.includes('system-failed'), 'Chat must highlight failed/unresolvable events');

// Exclude viewed from chat
assert(ordenesJs.includes("action === 'viewed'") && ordenesJs.includes("action === 'review_opened'"), 'Chat must exclude viewed / review_opened noise');

// 4. Check CSS styling for essential bar and details accordion
console.log('4. Checking CSS styling for essential bar and details accordion...');
assert(ordersCss.includes('.order-report-essential-bar'), 'CSS must define .order-report-essential-bar');
assert(ordersCss.includes('.order-full-details-accordion'), 'CSS must define .order-full-details-accordion');
assert(ordersCss.includes('.order-full-details-summary'), 'CSS must define .order-full-details-summary');
assert(ordersCss.includes('.chat-bubble.system.system-resolved'), 'CSS must define .system-resolved');
assert(ordersCss.includes('.chat-bubble.system.system-completed'), 'CSS must define .system-completed');

console.log('\nALL TESTS PASSED: Chat Attached History, System Highlights & Concealed Full Details Verified Successfully!');


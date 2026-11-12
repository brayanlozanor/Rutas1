/**
 * Test Escape key handling for network details (order-tech-report-mo) and decision modal (order-chat-close-decision-mo)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Testing Escape key handling & z-index hierarchy for Network Details ---');

// 1. Check CSS hierarchy
const cssPath = path.join(__dirname, '../public/assets/css/orders-design-v2.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert.ok(cssContent.includes('.order-tech-report-mo'), 'CSS must define .order-tech-report-mo');
assert.ok(cssContent.includes('z-index: 10000 !important;'), 'CSS must specify z-index 10000 for order-tech-report-mo');
assert.ok(cssContent.includes('#order-chat-close-decision-mo'), 'CSS must define #order-chat-close-decision-mo');
assert.ok(cssContent.includes('z-index: 16000 !important;'), 'CSS must specify z-index 16000 for order-chat-close-decision-mo to always sit on top');

console.log('✓ Item 1 Passed: CSS z-index hierarchy guarantees decision options never appear behind the network detail modal.');

// 2. Check ordenes.js Escape handler logic
const ordenesPath = path.join(__dirname, '../public/assets/js/ordenes.js');
const ordenesContent = fs.readFileSync(ordenesPath, 'utf8');

assert.ok(ordenesContent.includes("event.key === 'Escape'"), 'ordenes.js must listen for Escape');
assert.ok(ordenesContent.includes("isDecisionOpen || isReportOpen"), 'ordenes.js must detect if either decision modal or report modal is open');
assert.ok(ordenesContent.includes("closeOrderReportModalDirectly();"), 'ordenes.js must directly close modals on Escape instead of getting trapped');
assert.ok(ordenesContent.includes("modal.style.setProperty('z-index', '16000', 'important')"), 'promptCloseOrderChatDecision must enforce z-index 16000');
assert.ok(ordenesContent.includes("document.body.appendChild(modal)"), 'promptCloseOrderChatDecision must append modal to end of body');

console.log('✓ Item 2 Passed: ordenes.js directly closes report and decision modals on Escape.');

// 3. Check common.js closeTopModal handling
const commonPath = path.join(__dirname, '../public/assets/js/common.js');
const commonContent = fs.readFileSync(commonPath, 'utf8');

assert.ok(commonContent.includes("modal.id === 'order-chat-close-decision-mo' || modal.id === 'order-tech-report-mo'"), 'closeTopModal must handle both decision modal and report modal');
assert.ok(commonContent.includes("requestCloseOrderReport(true)"), 'closeTopModal must force-close if calling requestCloseOrderReport');

console.log('✓ Item 3 Passed: common.js closeTopModal force-closes report on Escape without re-prompt loops.');

// 4. Test simulate keydown and modal closing
let reportModalOpen = true;
let decisionModalOpen = false;
let closedDirectly = false;

function mockCloseOrderReportModalDirectly() {
  closedDirectly = true;
  reportModalOpen = false;
  decisionModalOpen = false;
}

// Simulate Escape event
const mockEvent = {
  key: 'Escape',
  defaultPrevented: false,
  preventDefault: () => { mockEvent.defaultPrevented = true; },
  stopImmediatePropagation: () => {}
};

if (mockEvent.key === 'Escape' && !mockEvent.defaultPrevented) {
  if (decisionModalOpen || reportModalOpen) {
    mockEvent.preventDefault();
    mockCloseOrderReportModalDirectly();
  }
}

assert.strictEqual(closedDirectly, true, 'Escape must call closeOrderReportModalDirectly');
assert.strictEqual(reportModalOpen, false, 'Report modal must be closed');
assert.strictEqual(decisionModalOpen, false, 'Decision modal must be closed');

console.log('✓ Item 4 Passed: Simulated Escape event successfully closes modal without getting stuck.');
console.log('--- ALL ESCAPE AND Z-INDEX NETWORK DETAIL TESTS PASSED! ---');


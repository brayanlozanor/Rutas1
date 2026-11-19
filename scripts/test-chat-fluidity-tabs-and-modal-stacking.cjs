const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const commonJs = fs.readFileSync(path.join(root, 'public/assets/js/common.js'), 'utf8').replace(/\r\n/g, '\n');
const ordenesJs = fs.readFileSync(path.join(root, 'public/assets/js/ordenes.js'), 'utf8').replace(/\r\n/g, '\n');
const designV2Css = fs.readFileSync(path.join(root, 'public/assets/css/orders-design-v2.css'), 'utf8').replace(/\r\n/g, '\n');
const tableSimpleCss = fs.readFileSync(path.join(root, 'public/assets/css/orders-table-simple.css'), 'utf8').replace(/\r\n/g, '\n');
const towerModalCss = fs.readFileSync(path.join(root, 'public/assets/css/tower-material-modal.css'), 'utf8').replace(/\r\n/g, '\n');

console.log('--- TEST: Chat Fluidity, Tab Separation & Modal Stacking ---');

// 1. Verify .insert-physical-record-mo only displays flex when .open
assert(
  designV2Css.includes('.insert-physical-record-mo {\n  z-index: 18000 !important;') &&
  designV2Css.includes('display: none !important;') &&
  designV2Css.includes('.insert-physical-record-mo.open {\n  display: flex !important;'),
  '.insert-physical-record-mo must default to display:none and only display:flex when .open'
);
console.log('✓ 1. .insert-physical-record-mo properly hides on close without locking the screen.');

// 2. Verify z-index consistency across CSS files and dynamic OM stacking in common.js
assert(
  !tableSimpleCss.includes('.order-tech-report-mo {\n    z-index: 13000 !important;'),
  'orders-table-simple.css must not override .order-tech-report-mo to 13000'
);
assert(
  tableSimpleCss.includes('z-index: 10000 !important;'),
  'orders-table-simple.css must keep .order-tech-report-mo at 10000'
);
assert(
  towerModalCss.includes('z-index: 18500 !important;'),
  'tower-material-modal.css must stack above #order-tech-report-mo'
);
assert(
  commonJs.includes("modal.style.setProperty('z-index', String(nextZ), 'important')") &&
  commonJs.includes('document.body.appendChild(modal);'),
  'OM(id) must dynamically elevate newly opened modals above existing .mo.open modals'
);
console.log('✓ 2. Z-index hierarchy and dynamic OM() stacking verified.');

// 3. Verify sticky header/footer and no scrollTop offset hiding the close button
assert(
  !ordenesJs.includes('card.scrollTop = Math.max(0, chatSection.offsetTop - 10);'),
  'openOrderTechnicianReport must not scroll .order-report-head out of view'
);
assert(
  ordenesJs.includes('card.scrollTop = 0;'),
  'openOrderTechnicianReport must keep card.scrollTop at 0 so the sticky header and close button stay visible'
);
assert(
  designV2Css.includes('.order-tech-report-card .order-report-head {\n  position: sticky !important;\n  top: 0 !important;') &&
  designV2Css.includes('.order-tech-report-card .order-report-footer-actions {\n  position: sticky !important;\n  bottom: 0 !important;'),
  'Header and footer actions inside .order-tech-report-card must be sticky'
);
console.log('✓ 3. Sticky chat header/footer and visible close button verified.');

// 4. Verify strict tab separation between Detalles de red and Detalles físicos
assert(
  ordenesJs.includes('if (getOrderDetailKind(w) !== activeOrderDetailKind) return false;'),
  'filteredOrders() must strictly filter by activeOrderDetailKind'
);
assert(
  ordenesJs.includes('window.activeOrderDetailKind = activeOrderDetailKind;') &&
  commonJs.includes("const memKind = String(window.activeOrderDetailKind || document.body?.dataset?.detailKind || '').toLowerCase();"),
  'Active tab state must stay synchronized with sidebar navigation links'
);
console.log('✓ 4. Strict tab separation and sidebar active state synchronization verified.');

// 5. Verify well-placed chat footer actions (Devolver + Cerrar + Confirmar/Mandar a concluir)
assert(
  ordenesJs.includes('class="btn net-btn-return" onclick="openReturnNetworkModal(') &&
  ordenesJs.includes('class="btn bgh net-btn-close-chat" onclick="requestCloseOrderReport()"'),
  'renderOrderFooterActions must provide Devolver and Cerrar buttons in the chat footer'
);
assert(
  ordenesJs.includes("executeChatCloseAction('${order.id}', 'return')"),
  'promptCloseOrderChatDecision must allow returning with observations when awaiting confirmation'
);
console.log('✓ 5. Chat footer actions and close decision options verified.');

console.log('--- ALL CHAT FLUIDITY, TAB ROUTING & MODAL STACKING TESTS PASSED! ---');

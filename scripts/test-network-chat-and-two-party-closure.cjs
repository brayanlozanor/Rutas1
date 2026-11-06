const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('Testing Network Details Chat, Two-Party Closure, Table Actions, UX & Live Sync...');

const commonJs = fs.readFileSync('public/assets/js/common.js', 'utf8');
const ordenesJs = fs.readFileSync('public/assets/js/ordenes.js', 'utf8');
const ordersDesignCss = fs.readFileSync('public/assets/css/orders-design-v2.css', 'utf8');

// Verify JS syntax
new vm.Script(commonJs, { filename: 'common.js' });
new vm.Script(ordenesJs, { filename: 'ordenes.js' });

// 1. Equal Button Length in Main Table (Abrir chat === Retomar)
console.log('1. Checking equal width on Abrir detalle y conversación & Retomar buttons...');
assert(ordenesJs.includes('net-btn-open'), 'ordenes.js must render net-btn-open for network details');
assert(ordenesJs.includes('Abrir detalle y conversación'), 'ordenes.js must preserve accessible "Abrir detalle y conversación" title');
assert(ordenesJs.includes('Abrir chat'), 'ordenes.js must render compact "Abrir chat" label matching Retomar width');
assert(ordenesJs.includes('net-btn-retake'), 'ordenes.js must render net-btn-retake (Retomar)');
assert(
  ordersDesignCss.includes('.orders-page .order-actions .net-btn-open,\r\n.orders-page .order-actions .net-btn-retake') ||
  ordersDesignCss.includes('.orders-page .order-actions .net-btn-open,\n.orders-page .order-actions .net-btn-retake'),
  'orders-design-v2.css must share identical width rule between .net-btn-open and .net-btn-retake in .order-actions'
);
assert(ordersDesignCss.includes('width: 88px !important;'), 'Both action buttons must share exact 88px width');
assert(ordersDesignCss.includes(':not(.net-btn-open)'), 'orders-design-v2.css must exclude net-btn-open from 28px icon-only buttons');
assert(ordenesJs.includes('net-btn-retake-disabled'), 'ordenes.js must render disabled Retomar slot so all rows align vertically');
assert(ordenesJs.includes('order-reopen-disabled'), 'ordenes.js must render disabled Reabrir slot so all rows align vertically');

// 2. Scoped Escape Key Handling
console.log('2. Checking Scoped Escape handling (closes only topmost dialog)...');
assert(commonJs.includes("window.getComputedStyle(el).zIndex"), 'closeTopModal in common.js must sort open modals by computed z-index');
assert(commonJs.includes("modal.id === 'action-confirm-mo'"), 'closeTopModal must cancel action-confirm-mo cleanly without closing underlying chat');
assert(commonJs.includes("modal.id === 'action-prompt-mo'"), 'closeTopModal must cancel action-prompt-mo cleanly without closing underlying chat');
assert(ordenesJs.includes('const hasOtherOpenModal = Array.from(document.querySelectorAll(\'.mo.open\')).some(el => el !== reportModal);'), 'ordenes.js Escape listener must ignore Escape when another modal is open above the chat');

// 3. Real-Time Chat Notifications (Every Message, Cross-Tab & Cross-Device Polling)
console.log('3. Checking per-message chat notifications without throttling...');
assert(commonJs.includes("transition === 'chat_message'"), 'common.js must handle chat_message transition');
assert(commonJs.includes('function getLatestOrderChatMessage('), 'common.js must implement getLatestOrderChatMessage for HTTP polling');
assert(commonJs.includes('lastChatMsgId'), 'common.js must track lastChatMsgId in knownNetworkOrderStates');
assert(commonJs.includes('eventId: msgEventId') && commonJs.includes('eventId: latestChatId'), 'common.js must pass unique eventId per chat message in both BroadcastChannel and HTTP polling');
assert(commonJs.includes('const notifKey = eventId ?'), 'notifyNetworkDetailEvent must deduplicate per message eventId so consecutive messages are never throttled');

// 4. Intense Row Hover & Selected Row Border
console.log('4. Checking intense hover background and selected row border...');
assert(ordenesJs.includes('function selectOrderRow('), 'ordenes.js must implement selectOrderRow');
assert(ordenesJs.includes('order-row-selected'), 'ordenes.js must apply order-row-selected class to selected row');
assert(ordersDesignCss.includes('background-color: #dbeafe !important;'), 'orders-design-v2.css must apply stronger hover background');
assert(ordersDesignCss.includes('tr.order-row-selected > td'), 'orders-design-v2.css must apply crisp border to selected row');

// 5. Directional Two-Party "No realizable"
console.log('5. Checking directional "No realizable" permissions & two-party confirmation...');
assert(ordenesJs.includes('function canRoleDeclareUnresolvable('), 'ordenes.js must implement canRoleDeclareUnresolvable');
assert(ordenesJs.includes('function canRoleConfirmUnresolvable('), 'ordenes.js must implement canRoleConfirmUnresolvable');
assert(!ordenesJs.includes("requestCloseOrderReport();openUnresolvableNetworkModal("), 'Opening No realizable modal must NOT close the chat modal underneath');
assert(ordenesJs.includes('Confirmar no realizable'), 'Counterparty must see Confirmar no realizable action');

// 6. Visual Row & Pill Highlight When User Action Is Required
console.log('6. Checking table row & badge highlight when user action is required...');
assert(ordenesJs.includes('function getOrderPendingUserAction('), 'ordenes.js must implement getOrderPendingUserAction');
assert(ordenesJs.includes('order-row-action-required'), 'ordenes.js must mark rows requiring user confirmation with order-row-action-required');
assert(ordenesJs.includes('order-action-needed-pill'), 'ordenes.js must render order-action-needed-pill in Estado column');
assert(ordersDesignCss.includes('.order-action-needed-pill'), 'orders-design-v2.css must style .order-action-needed-pill');

// 7. Two-Party Mutual Agreement for "Enviar a Detalles Físicos" + Zoom Alignment + Cancel Keeps Chat Open
console.log('7. Checking two-party Enviar a Detalles Físicos, zoom alignment & cancel behavior...');
assert(ordenesJs.includes('function getPhysicalDerivationStatus('), 'ordenes.js must implement getPhysicalDerivationStatus');
assert(ordenesJs.includes('async function confirmSendNetworkToPhysical('), 'ordenes.js must implement confirmSendNetworkToPhysical');
assert(ordenesJs.includes('async function rejectSendNetworkToPhysical('), 'ordenes.js must implement rejectSendNetworkToPhysical');
assert(!ordenesJs.includes("requestCloseOrderReport();promptSendNetworkToPhysical("), 'Clicking Enviar a Detalles Físicos must NOT close #order-tech-report-mo');
assert(commonJs.includes('width: 125vw !important') && commonJs.includes('height: 125dvh !important'), 'common.js must compensate body zoom:0.8 on action-confirm-mo and action-prompt-mo');
assert(ordersDesignCss.includes('width: 125vw !important') && ordersDesignCss.includes('height: 125dvh !important'), 'orders-design-v2.css must compensate body zoom:0.8 on action-confirm-mo and action-prompt-mo');

// 8. Wider, Color-Coded System Action Cards in Chat
console.log('8. Checking wider, distinct color-coded system action cards in chat...');
assert(ordersDesignCss.includes('width: min(94%, 840px) !important;'), 'System action cards in chat must be wide');
for (const cls of [
  '.chat-bubble.system.system-created',
  '.chat-bubble.system.system-attending',
  '.chat-bubble.system.system-retaken',
  '.chat-bubble.system.system-resolved',
  '.chat-bubble.system.system-returned',
  '.chat-bubble.system.system-completed',
  '.chat-bubble.system.system-failed',
  '.chat-bubble.system.system-physical'
]) {
  assert(ordersDesignCss.includes(cls), `orders-design-v2.css must define distinct color palette for ${cls}`);
}

// 9. Immediate Live Chat & Footer Refresh
console.log('9. Checking dynamic in-place live chat, status pill, composer & footer refresh...');
assert(ordenesJs.includes('function renderOrderChatComposerInnerHtml('), 'ordenes.js must separate renderOrderChatComposerInnerHtml for live updates');
assert(ordenesJs.includes('footerEl.outerHTML = renderOrderFooterActions(targetOrder)'), 'updateOrderChatLive must refresh footer action buttons in place');
assert(ordenesJs.includes('pill.innerHTML = getOrderChatStatusBadgeHtml(targetOrder)'), 'updateOrderChatLive must refresh status pill in place');

// 10. Ctrl+V Image Paste in Chat
console.log('10. Checking Ctrl+V image paste inside open case chat...');
assert(ordenesJs.includes('async function attachOrderChatImageFile('), 'ordenes.js must implement attachOrderChatImageFile');
assert(ordenesJs.includes("const chatReportMo = document.getElementById('order-tech-report-mo')"), 'Global paste listener must support #order-tech-report-mo');
assert(ordenesJs.includes('attachOrderChatImageFile(file, true)'), 'Pasting an image in open chat must attach it to the chat composer');

// 11. Behavioral VM Verification of Role Logic (Directional Unresolvable, Closure & Physical Agreement)
console.log('11. Running VM behavioral checks for directional rules and action highlights...');
function extractFunc(src, name) {
  const start = src.indexOf(`function ${name}(`);
  assert(start >= 0, `Could not find function ${name}`);
  let depth = 0;
  let inStr = null;
  let escaped = false;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (inStr) {
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`Unclosed function ${name}`);
}

let activeRole = 'atencion_clientes';
const sandbox = {
  userHasRole: (...roles) => roles.includes(activeRole),
  isNetworkSupportToAttention: (o) => Boolean(o.sentToAttention)
};
vm.createContext(sandbox);
for (const fnName of [
  'canRoleDeclareUnresolvable',
  'canRoleConfirmUnresolvable',
  'getPhysicalDerivationStatus',
  'getOrderClosureStatus',
  'getOrderPendingUserAction'
]) {
  vm.runInContext(extractFunc(ordenesJs, fnName), sandbox);
}

// Case A: Report sent FROM Atención TO Soporte (sentToAttention = false)
const reportToSupport = { id: 'o1', detailKind: 'network', status: 'en_revision', sentToAttention: false, followUps: [] };
activeRole = 'atencion_clientes';
assert.strictEqual(sandbox.canRoleDeclareUnresolvable(reportToSupport), false, 'Atención cannot declare unresolvable when Soporte received the report');
assert.strictEqual(sandbox.canRoleConfirmUnresolvable(reportToSupport), true, 'Atención confirms unresolvable when Soporte received the report');
activeRole = 'soporte';
assert.strictEqual(sandbox.canRoleDeclareUnresolvable(reportToSupport), true, 'Soporte CAN declare unresolvable when Soporte received the report');
assert.strictEqual(sandbox.canRoleConfirmUnresolvable(reportToSupport), false, 'Soporte cannot self-confirm unresolvable');

// Case B: Report sent FROM Soporte TO Atención (sentToAttention = true)
const reportToAttention = { id: 'o2', detailKind: 'network', status: 'en_revision', sentToAttention: true, followUps: [] };
activeRole = 'atencion_clientes';
assert.strictEqual(sandbox.canRoleDeclareUnresolvable(reportToAttention), true, 'Atención CAN declare unresolvable when Atención received the report');
assert.strictEqual(sandbox.canRoleConfirmUnresolvable(reportToAttention), false, 'Atención cannot self-confirm unresolvable');
activeRole = 'soporte';
assert.strictEqual(sandbox.canRoleDeclareUnresolvable(reportToAttention), false, 'Soporte cannot declare unresolvable when Atención received the report');
assert.strictEqual(sandbox.canRoleConfirmUnresolvable(reportToAttention), true, 'Soporte MUST confirm unresolvable when Atención received the report');

// Action highlight when Atención declares no_realizado on reportToAttention -> Soporte sees requiresMyAction = true
reportToAttention.status = 'no_realizado';
activeRole = 'soporte';
assert.strictEqual(sandbox.getOrderPendingUserAction(reportToAttention).requiresMyAction, true, 'Soporte must see requiresMyAction when Atención marks report unresolvable');
activeRole = 'atencion_clientes';
assert.strictEqual(sandbox.getOrderPendingUserAction(reportToAttention).requiresMyAction, false, 'Atención waits for Soporte confirmation');
assert.strictEqual(sandbox.getOrderPendingUserAction(reportToAttention).waitingOther, true, 'Atención sees waitingOther indicator');

// Two-party physical proposal: Soporte proposes -> Atención sees requiresMyAction = true
const physOrder = {
  id: 'o3',
  detailKind: 'network',
  status: 'en_revision',
  sentToAttention: false,
  followUps: [{ action: 'physical_proposed_soporte', byName: 'Carlos Soporte', note: 'Antena dañada' }]
};
activeRole = 'atencion_clientes';
assert.strictEqual(sandbox.getPhysicalDerivationStatus(physOrder).pending, true);
assert.strictEqual(sandbox.getOrderPendingUserAction(physOrder).requiresMyAction, true, 'Atención must see requiresMyAction when Soporte proposes physical derivation');
activeRole = 'soporte';
assert.strictEqual(sandbox.getOrderPendingUserAction(physOrder).requiresMyAction, false, 'Soporte waits for Atención physical confirmation');

// Preserved legacy assertions
assert(ordenesJs.includes('closure_confirmed_atencion'), 'ordenes.js must record attention closure confirmation');
assert(ordenesJs.includes('closure_proposed_atencion'), 'ordenes.js must record closure_proposed_atencion');
assert(ordenesJs.includes('Enviado a concluir · Espera a Soporte'), 'ordenes.js must indicate waiting for Soporte confirmation');
assert(!ordenesJs.includes('⚠️ Confirmar no realizable'), 'Confirmar no realizable pill must not have emoji that causes overflow');
assert(ordersDesignCss.includes('width: 146px !important;'), 'Estado column must have 146px width to fit status + confirmation pill');
assert(commonJs.includes('reg.showNotification(title, options)'), 'common.js must support ServiceWorker/OS right-screen notifications even in background');
assert(ordersDesignCss.includes('100000 !important') && commonJs.includes('100000 !important'), 'z-index 100000 must remain set on confirmation modals');

console.log('12. Checking proportionate Detalle width, logical lifecycle sorting, status filter/sort, 6 distinct state colors & subtle guide modals...');
const ordenesHtml = fs.readFileSync('public/ordenes.html', 'utf8');
assert(ordersDesignCss.includes('width: 18% !important;') && !ordersDesignCss.includes('th:nth-child(5),\n  .orders-page .order-table td:nth-child(5) {\n    width: auto !important;'), 'Detalle column must have proportionate width (18%) instead of auto');
assert(ordenesHtml.includes('<option value="status">Por estado</option>'), 'Sort dropdown must include Por estado');
assert(ordenesHtml.includes('id="network-colors-guide-mo"') && ordenesHtml.includes('id="network-workflow-guide-mo"'), 'ordenes.html must include both color guide and workflow guide modals');
assert(ordenesHtml.includes('openNetworkColorsGuideModal()') && ordenesHtml.includes('openNetworkWorkflowGuideModal()'), 'ordenes.html must include subtle buttons to open both guide modals');
assert(ordenesJs.includes('function getOrderStatusSortRank(order)') && ordenesJs.includes('function getOrderConcludedTimestamp(order)'), 'ordenes.js must implement status sorting and concluded timestamp sorting');

// 13. Exclude "Atención no realizada" / review_deferred from Chat & Enforce Strict Area Retake Rules
console.log('13. Checking exclusion of "Atención no realizada" from chat & strict cross-role retake prevention...');
assert(ordenesJs.includes("label.includes('atención no realizada')") && ordenesJs.includes("action === 'review_deferred'"), 'renderOrderChatMessagesHtml must filter out "Atención no realizada" / review_deferred cards from chat');
assert(!ordenesJs.includes("appendOrderFollowUp(order,'review_deferred','No se atenderá ahora',reason)"), 'saveOrderReviewDecision(false) must not append a chat card when deferring attention');
assert(commonJs.includes("transition === 'review_deferred'"), 'common.js must broadcast notification for review_deferred without chat card');
assert(commonJs.includes('function getOrderAssignedAreaRole(order)') && commonJs.includes('function canUserRetakeNetworkOrder('), 'common.js must resolve assignee area role and strictly enforce canUserRetakeNetworkOrder');

const retakeSandbox = {
  window: {
    netopsAttentionUsers: [{ id: 'u-heidi', name: 'Heidi Geraldine Ramiréz Mancilla', username: 'heidi', role: 'atencion_clientes' }],
    netopsSupportUsers: [{ id: 'u-brayan', name: 'Brayan De Jesus Lozano Rendón', username: 'brayan', role: 'soporte' }]
  },
  localStorage: { getItem: () => '[]' },
  state: { users: [] },
  activeUser: { id: 'u-soporte-2', name: 'Otro Soporte', username: 'soporte2', role: 'soporte' },
  getCurrentUser: () => retakeSandbox.activeUser,
  userHasRole: (...roles) => roles.includes(retakeSandbox.activeUser.role),
  normalizeName: (s) => String(s || '').trim().toLowerCase(),
  orderEscape: (s) => String(s || ''),
  renderUserColorChip: (name) => `<span>${name}</span>`,
  isOrderAssignedToUser: (order, user) => order.assignedUserId === user.id || order.assignedUserName === user.name
};
vm.createContext(retakeSandbox);
for (const fnName of [
  'getKnownUsersByArea',
  'resolveUserAreaRole',
  'getOrderAssignedAreaRole',
  'isNetworkSupportToAttention',
  'canUserRetakeNetworkOrder'
]) {
  vm.runInContext(extractFunc(commonJs, fnName), retakeSandbox);
}
vm.runInContext(extractFunc(ordenesJs, 'renderOrderChatMessagesHtml'), retakeSandbox);

// Verify "Atención no realizada por Heidi Geraldine Ramiréz Mancilla" is NOT rendered in chat
const chatHtmlWithUnattended = retakeSandbox.renderOrderChatMessagesHtml({
  id: 'ord-chat-1',
  detailKind: 'network',
  followUps: [
    { action: 'atencion_no_realizada', label: 'Atención no realizada', byName: 'Heidi Geraldine Ramiréz Mancilla', note: 'a', at: '2026-11-05T14:53:00Z' },
    { action: 'review_deferred', label: 'No se atenderá ahora', byName: 'Heidi Geraldine Ramiréz Mancilla', note: 'ocupada', at: '2026-11-05T14:54:00Z' },
    { action: 'chat_message', byName: 'Heidi Geraldine Ramiréz Mancilla', note: 'Mensaje real en el chat', at: '2026-11-05T14:55:00Z' }
  ]
});
assert(!chatHtmlWithUnattended.includes('Atención no realizada'), 'Chat HTML must NOT render "Atención no realizada" card');
assert(!chatHtmlWithUnattended.includes('No se atenderá ahora'), 'Chat HTML must NOT render "No se atenderá ahora" card');
assert(chatHtmlWithUnattended.includes('Mensaje real en el chat'), 'Chat HTML must still render regular chat messages');

// Verify Soporte CANNOT retake an order assigned to Heidi (Atención a clientes), even if targetRole was omitted
const orderAssignedToAttention = {
  id: 'ord-heidi',
  detailKind: 'network',
  status: 'pendiente',
  category: 'internet_lento', // general category
  createdByRole: 'soporte',
  assignedUserId: 'u-heidi',
  assignedUserName: 'Heidi Geraldine Ramiréz Mancilla'
};
retakeSandbox.activeUser = { id: 'u-soporte-2', name: 'Otro Soporte', username: 'soporte2', role: 'soporte' };
assert.strictEqual(retakeSandbox.isNetworkSupportToAttention(orderAssignedToAttention), true, 'Order assigned to Heidi (Atención) must be identified as Attention area');
assert.strictEqual(retakeSandbox.canUserRetakeNetworkOrder(orderAssignedToAttention), false, 'Soporte user must NEVER be able to retake a case assigned to Atención a clientes');

retakeSandbox.activeUser = { id: 'u-atencion-2', name: 'Otra Atención', username: 'atencion2', role: 'atencion_clientes' };
assert.strictEqual(retakeSandbox.canUserRetakeNetworkOrder(orderAssignedToAttention), true, 'Another Atención user CAN retake a case assigned to Heidi (Atención)');

// Verify Atención CANNOT retake an order assigned to Brayan (Soporte), even if createdByRole was 'administrador'
const orderAssignedToSupport = {
  id: 'ord-brayan',
  detailKind: 'network',
  status: 'en_revision',
  createdByRole: 'administrador',
  assignedUserId: 'u-brayan',
  assignedUserName: 'Brayan De Jesus Lozano Rendón'
};
retakeSandbox.activeUser = { id: 'u-atencion-2', name: 'Otra Atención', username: 'atencion2', role: 'atencion_clientes' };
assert.strictEqual(retakeSandbox.isNetworkSupportToAttention(orderAssignedToSupport), false, 'Order assigned to Brayan (Soporte) must be identified as Support area');
assert.strictEqual(retakeSandbox.canUserRetakeNetworkOrder(orderAssignedToSupport), false, 'Atención user must NEVER be able to retake a case assigned to Soporte técnico');

retakeSandbox.activeUser = { id: 'u-soporte-2', name: 'Otro Soporte', username: 'soporte2', role: 'soporte' };
assert.strictEqual(retakeSandbox.canUserRetakeNetworkOrder(orderAssignedToSupport), true, 'Another Soporte user CAN retake a case assigned to Brayan (Soporte)');

console.log('\nALL 13 TEST GROUPS PASSED: Network Details UX, Chat Sync, Escape Scope, Two-Party Flows, Sorting & Guides Verified!');

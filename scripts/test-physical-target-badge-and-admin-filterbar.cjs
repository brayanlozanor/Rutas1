// Test: Physical destination selector (Pueblo/Torre), "Enviado a físicos" badge & Admin filter bar layout
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('--- TEST: Physical Target (Pueblo/Torre), Sent-to-Physical Badge & Admin Filter Bar ---');

const root = path.join(__dirname, '..');
const ordenesJs = fs.readFileSync(path.join(root, 'public', 'assets', 'js', 'ordenes.js'), 'utf8').replace(/\r\n/g, '\n');
const ordenesHtml = fs.readFileSync(path.join(root, 'public', 'ordenes.html'), 'utf8').replace(/\r\n/g, '\n');
const cssV2 = fs.readFileSync(path.join(root, 'public', 'assets', 'css', 'orders-design-v2.css'), 'utf8').replace(/\r\n/g, '\n');
const toggleCss = fs.readFileSync(path.join(root, 'public', 'assets', 'css', 'detail-view-toggle.css'), 'utf8').replace(/\r\n/g, '\n');

// 1. Static checks for Task 3 (Admin filter bar layout)
console.log('1. Checking admin filter bar layout CSS & HTML...');
assert(ordenesHtml.includes('class="order-filter-topbar"'), 'ordenes.html must have .order-filter-topbar');
assert(ordenesHtml.includes('id="wo-admin-stats-btn"'), 'ordenes.html must include admin stats button');
assert(ordenesHtml.includes('id="wo-clear-filters"'), 'ordenes.html must include Limpiar filtros button');
assert(ordenesHtml.includes('class="order-search-box"'), 'ordenes.html must include search box');
assert(!cssV2.includes('grid-template-columns: 140px 140px minmax(280px, 1fr)'), 'orders-design-v2.css must not use fixed 3-column grid for .order-filter-topbar');
assert(/\.orders-page \.order-filter-topbar\s*\{[^}]*display:\s*flex/s.test(cssV2), '.order-filter-topbar must use flex layout');
assert(/\.orders-page \.order-clear-button\s*\{[^}]*flex:\s*0 0 auto[^}]*white-space:\s*nowrap/s.test(cssV2), '.order-clear-button must be compact with flex: 0 0 auto and white-space: nowrap');
assert(/\.orders-page \.order-search-box\s*\{[^}]*flex:\s*1 1 280px[^}]*min-width:\s*260px/s.test(cssV2), '.order-search-box must dominate available width with flex: 1 and wide min-width');
assert(toggleCss.includes('body.orders-page[data-detail-kind="physical"] .order-sent-physical-badge'), 'detail-view-toggle.css must hide .order-sent-physical-badge in physical view');
console.log('✓ Task 3 CSS & HTML checks passed.');

// 2. Static checks for Task 1 & Task 2 wiring in ordenes.js
console.log('2. Checking Pueblo/Torre modal and Sent-to-Physical badge wiring...');
assert(ordenesJs.includes('id="insert-phys-target-btn-pueblo"'), 'Modal must render Pueblo choice button');
assert(ordenesJs.includes('id="insert-phys-target-btn-torre"'), 'Modal must render Torre choice button');
assert(ordenesJs.includes('id="insert-phys-pueblo-locked"'), 'Modal must render locked Pueblo display');
assert(ordenesJs.includes('id="insert-phys-torre-locked"'), 'Modal must render locked Torre display');
assert(!ordenesJs.includes('id="insert-phys-node-filter"'), 'Modal must NOT allow filtering/choosing another pueblo');
assert(!ordenesJs.includes('id="insert-phys-equipment-filter"'), 'Modal must NOT allow filtering/choosing another tower');
assert(ordenesJs.includes('function getOrderSentToPhysicalInfo('), 'ordenes.js must define getOrderSentToPhysicalInfo');
assert(ordenesJs.includes('function renderSentToPhysicalBadge('), 'ordenes.js must define renderSentToPhysicalBadge');
assert(ordenesJs.includes('${sentPhysicalBadgeHtml}'), 'renderWOs must render sentPhysicalBadgeHtml in table state cell');
console.log('✓ Static wiring checks passed.');

// 3. VM runtime tests for Tasks 1 & 2
console.log('3. Running VM tests for Pueblo/Torre proposal, reload persistence, confirmation & badge...');

const mockState = {
  workOrders: [
    {
      id: 'net-torre-1',
      folio: 'RED-500001',
      detailKind: 'network',
      clientName: 'Carlos Méndez',
      status: 'en_revision',
      nodeId: 'nod-1',
      nodeName: 'R101 · San Marcos',
      region: 'centro',
      priority: 'alta',
      followUps: []
    },
    {
      id: 'net-pueblo-2',
      folio: 'RED-500002',
      detailKind: 'network',
      clientName: 'Ana López',
      status: 'en_revision',
      nodeId: 'nod-1',
      nodeName: 'R101 · San Marcos',
      region: 'centro',
      priority: 'media',
      followUps: []
    },
    {
      id: 'net-normal-3',
      folio: 'RED-500003',
      detailKind: 'network',
      clientName: 'Luis Pérez',
      status: 'pendiente',
      nodeId: 'nod-1',
      nodeName: 'R101 · San Marcos',
      region: 'centro',
      priority: 'baja',
      followUps: []
    }
  ],
  nodes: [
    { id: 'nod-1', nodeCode: 'R101', town: 'San Marcos', name: 'San Marcos', zone: 'centro', location: 'Centro San Marcos', lat: 19.1, lng: -99.1 },
    { id: 'nod-2', nodeCode: 'R102', town: 'El Palmar', name: 'El Palmar', zone: 'norte', location: 'Plaza Palmar', lat: 19.2, lng: -99.2 }
  ],
  equipment: [
    { id: 'ant-1', name: 'Torre Cerro Alto', ip: '10.0.0.10', region: 'centro', location: 'Cerro Alto', lat: 19.15, lng: -99.15 },
    { id: 'ant-2', name: 'Torre Norte', ip: '10.0.0.20', region: 'norte', location: 'Loma Norte', lat: 19.25, lng: -99.25 }
  ],
  users: []
};

function makeEl(initial = {}) {
  return {
    value: initial.value || '',
    innerHTML: '',
    textContent: '',
    disabled: false,
    dataset: {},
    style: { setProperty() {} },
    options: initial.options || [],
    selectedIndex: initial.selectedIndex || 0,
    classList: {
      _set: new Set(),
      toggle(c, v) { if (v) this._set.add(c); else this._set.delete(c); },
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      contains(c) { return this._set.has(c); }
    },
    setAttribute() {},
    focus() {},
    addEventListener() {},
    remove() {}
  };
}

const domElements = {
  'insert-physical-record-mo': Object.assign(makeEl(), { dataset: { enhancedTargetSelector: '2' } }),
  'insert-phys-origin-folio': makeEl(),
  'insert-phys-origin-client': makeEl(),
  'insert-phys-title': makeEl(),
  'insert-phys-subtitle': makeEl(),
  'insert-phys-agreement-notice': makeEl(),
  'insert-phys-target-btn-pueblo': makeEl(),
  'insert-phys-target-btn-torre': makeEl(),
  'insert-phys-target-type': makeEl({ value: 'pueblo' }),
  'insert-phys-pueblo-group': makeEl(),
  'insert-phys-torre-group': makeEl(),
  'insert-phys-pueblo-locked': makeEl(),
  'insert-phys-pueblo-locked-name': makeEl(),
  'insert-phys-torre-locked': makeEl(),
  'insert-phys-torre-locked-name': makeEl(),
  'insert-phys-node-select': makeEl({ value: 'nod-1' }),
  'insert-phys-equipment-select': makeEl({ value: '' }),
  'insert-phys-node': makeEl({ value: 'nod-1' }),
  'insert-phys-equipment': makeEl({ value: '' }),
  'insert-phys-pueblo-hint': makeEl(),
  'insert-phys-torre-hint': makeEl(),
  'insert-phys-category': makeEl({ value: 'alineacion_antena' }),
  'insert-phys-priority': makeEl({ value: 'alta' }),
  'insert-phys-description': makeEl({ value: '' }),
  'insert-phys-save-btn': makeEl(),
  'insert-phys-save-label': makeEl(),
  'insert-phys-reject-btn': makeEl()
};

let currentUser = { id: 'usr-sop-1', role: 'soporte', name: 'Soporte Uno', username: 'sop1' };
const notifications = [];
const confirmations = [];
const savedRecords = [];

const sandbox = {
  window: {},
  state: mockState,
  currentOrderReportId: '',
  document: {
    getElementById: (id) => domElements[id] || null,
    body: { insertAdjacentHTML() {}, appendChild() {} }
  },
  getCurrentUser: () => currentUser,
  userHasRole: (...roles) => roles.includes(currentUser.role),
  getNodeLabel: (n) => n.nodeCode ? `${n.nodeCode} · ${n.town || n.name}` : (n.name || n.town || n.id),
  getZoneLabel: (z) => z || '',
  normalizeName: (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(),
  orderEscape: (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  getOrderFolio: (o) => o.folio || (o.detailKind === 'network' ? 'RED-999999' : 'DET-888888'),
  getOrderDetailKind: (o) => o?.detailKind === 'network' ? 'network' : 'physical',
  orderCategoryLabel: (c) => c === 'alineacion_antena' ? 'Alineación de antena' : c,
  orderCategoriesForKind: () => [['alineacion_antena', 'Alineación de antena'], ['otro', 'Otro']],
  extractCleanPhysicalDescription: (d) => String(d || '').replace(/^[\s\S]*?Falla:\s*/i, '').trim(),
  isNetworkSupportToAttention: () => false,
  getNodeLinkedEquipment: (nodeId) => nodeId === 'nod-1' ? [mockState.equipment[0]] : [],
  generateId: (() => { let seq = 1; return () => 'ph-gen-' + (seq++); })(),
  askConfirmation: async (opts) => { confirmations.push(opts); return true; },
  saveRecord: async (table, rec) => { savedRecords.push({ table, rec: JSON.parse(JSON.stringify(rec)) }); return true; },
  appendSharedNetworkFollowUp: (order, action, label, note) => {
    order.followUps = [...(order.followUps || []), { action, label, note, byId: currentUser.id, byName: currentUser.name, at: new Date().toISOString() }];
  },
  setUpdatedAudit: () => {},
  broadcastNetworkOrderChange: () => {},
  updateOrderChatLive: () => {},
  renderWOs: () => {},
  loadOrderPage: async () => {},
  OM: () => {},
  CM: () => {},
  notify: (msg, type) => { notifications.push({ msg, type }); },
  console,
  setTimeout: () => 0
};
sandbox.window = sandbox;

vm.createContext(sandbox);

// Extract resolveOrderRegisteredNode through end of confirmSendNetworkToPhysical from ordenes.js
const startIdx = ordenesJs.indexOf('function resolveOrderRegisteredNode(');
const endIdx = ordenesJs.indexOf('async function rejectSendNetworkToPhysical(');
assert(startIdx > 0 && endIdx > startIdx, 'Could not locate physical proposal block in ordenes.js');
vm.runInContext(ordenesJs.slice(startIdx, endIdx), sandbox);

(async () => {
  // Case A: Report with a pueblo that has NO associated tower blocks Torre registration
  mockState.workOrders.push({
    id: 'net-no-tower',
    folio: 'RED-500099',
    detailKind: 'network',
    clientName: 'Sin Torre',
    status: 'en_revision',
    nodeId: 'nod-2',
    nodeName: 'R102 · El Palmar',
    region: 'norte',
    priority: 'media',
    followUps: []
  });
  sandbox.openInsertPhysicalRecordModal('net-no-tower');
  sandbox.setInsertPhysTargetType('torre');
  domElements['insert-phys-equipment-select'].value = 'ant-2'; // Attempt to pick unrelated tower
  domElements['insert-phys-equipment'].value = 'ant-2';
  domElements['insert-phys-description'].value = 'Antena sin energía en torre';
  await sandbox.saveInsertedPhysicalRecord();
  assert(notifications.some(n => /no tiene una torre asociada/i.test(n.msg)), 'Must block Torre when report has no associated tower even if another tower value is injected');

  // Case B: Soporte proposes physical detail in TORRE -> strictly locked to report's associated tower (ant-1: Torre Cerro Alto), ignoring attempt to pick ant-2
  notifications.length = 0;
  confirmations.length = 0;
  sandbox.openInsertPhysicalRecordModal('net-torre-1');
  sandbox.setInsertPhysTargetType('torre');
  assert.strictEqual(domElements['insert-phys-equipment-select'].disabled, true, 'Tower select must be locked when single associated tower');
  domElements['insert-phys-equipment-select'].value = 'ant-2'; // Attempt to tamper with unrelated tower
  domElements['insert-phys-equipment'].value = 'ant-2';
  domElements['insert-phys-category'].value = 'alineacion_antena';
  domElements['insert-phys-priority'].value = 'alta';
  domElements['insert-phys-description'].value = 'Ajuste de sectorial en torre asociada';
  await sandbox.saveInsertedPhysicalRecord();

  const torreOrder = mockState.workOrders.find(w => w.id === 'net-torre-1');
  assert(confirmations[0].message.includes('Destino (Torre): Torre Cerro Alto'), 'Proposal confirmation must strictly use report associated tower');
  assert.strictEqual(torreOrder.physicalProposal.targetType, 'torre');
  assert.strictEqual(torreOrder.physicalProposal.equipmentId, 'ant-1', 'Must lock to report associated tower ant-1, never unrelated ant-2');
  assert.strictEqual(torreOrder.physicalProposal.nodeId, '');

  // Simulate full reload from D1 (only followUps survives, top-level physicalProposal is gone!)
  delete torreOrder.physicalProposal;
  const reloadedStatus = sandbox.getPhysicalDerivationStatus(torreOrder);
  assert.strictEqual(reloadedStatus.pending, true, 'Pending status must survive reload');
  assert.strictEqual(reloadedStatus.targetType, 'torre', 'Torre destination must survive reload via followUps.proposal');
  assert.strictEqual(reloadedStatus.targetName, 'Torre Cerro Alto', 'Torre name must survive reload');
  assert.strictEqual(reloadedStatus.proposal.equipmentId, 'ant-1', 'Equipment ID must survive reload');

  // Counterparty (Atención) confirms via confirmSendNetworkToPhysical
  currentUser = { id: 'usr-ate-1', role: 'atencion_clientes', name: 'Atención Uno', username: 'ate1' };
  confirmations.length = 0;
  await sandbox.confirmSendNetworkToPhysical('net-torre-1');

  assert(confirmations[0].message.includes('Destino (Torre): Torre Cerro Alto'), 'Counterparty confirmation must clearly show report associated tower');
  const createdTorrePhys = mockState.workOrders.find(w => w.detailKind === 'physical' && w.sourceOrderId === 'net-torre-1');
  assert(createdTorrePhys, 'Physical detail must be created for Torre');
  assert.strictEqual(createdTorrePhys.visitType, 'torre', 'Torre physical detail must have visitType === torre');
  assert.strictEqual(createdTorrePhys.equipmentId, 'ant-1', 'Torre physical detail must save report associated equipmentId');
  assert.strictEqual(createdTorrePhys.equipmentName, 'Torre Cerro Alto', 'Torre physical detail must save report associated equipmentName');
  assert.strictEqual(createdTorrePhys.nodeId, '', 'Torre physical detail must have empty nodeId');
  assert.strictEqual(createdTorrePhys.nodeName, '', 'Torre physical detail must have empty nodeName');
  assert.strictEqual(createdTorrePhys.assignedUserId, '', 'Physical detail must not be assigned');
  assert.strictEqual(torreOrder.status, 'completada', 'Original network order must be closed');

  // Verify "Enviado a físicos" badge immediately AND after simulated D1 reload
  const immediateInfo = sandbox.getOrderSentToPhysicalInfo(torreOrder);
  assert.strictEqual(immediateInfo.sent, true, 'Immediate sent info must be true');
  assert.strictEqual(immediateInfo.targetType, 'torre');
  assert.strictEqual(immediateInfo.targetName, 'Torre Cerro Alto');
  assert(immediateInfo.formattedDate.length > 0, 'Sent info must include formatted date');

  // Simulate reload: strip closedReason and remove physical order from memory, keeping only followUps
  const reloadedTorreOrder = {
    id: torreOrder.id,
    detailKind: 'network',
    status: 'completada',
    followUps: JSON.parse(JSON.stringify(torreOrder.followUps))
  };
  mockState.workOrders = mockState.workOrders.filter(w => w.id !== createdTorrePhys.id);
  const reloadedInfo = sandbox.getOrderSentToPhysicalInfo(reloadedTorreOrder);
  assert.strictEqual(reloadedInfo.sent, true, 'Reloaded sent info must remain true from followUps');
  assert.strictEqual(reloadedInfo.targetType, 'torre');
  assert.strictEqual(reloadedInfo.targetName, 'Torre Cerro Alto');
  assert(reloadedInfo.formattedDate.length > 0, 'Reloaded sent info must preserve date');

  const badgeHtml = sandbox.renderSentToPhysicalBadge(reloadedTorreOrder, { showTarget: true });
  assert(badgeHtml.includes('order-sent-physical-badge'), 'Badge HTML must include .order-sent-physical-badge');
  assert(badgeHtml.includes('Enviado a físicos'), 'Badge HTML must include "Enviado a físicos"');
  assert(badgeHtml.includes('Torre: Torre Cerro Alto'), 'Badge HTML with showTarget must include destination');
  assert(badgeHtml.includes('<svg'), 'Badge HTML must include icon');

  // Non-sent network order must NOT display badge
  const normalOrder = mockState.workOrders.find(w => w.id === 'net-normal-3');
  assert.strictEqual(sandbox.getOrderSentToPhysicalInfo(normalOrder).sent, false, 'Normal order must not be marked sent to physical');
  assert.strictEqual(sandbox.renderSentToPhysicalBadge(normalOrder), '', 'Normal order must return empty badge');

  // Case C: Admin directly registers physical detail in PUEBLO -> strictly locked to report's own pueblo (nod-1: R101 · San Marcos), ignoring attempt to pick nod-2
  currentUser = { id: 'usr-adm-1', role: 'administrador', name: 'Admin', username: 'admin' };
  sandbox.openInsertPhysicalRecordModal('net-pueblo-2');
  sandbox.setInsertPhysTargetType('pueblo');
  assert.strictEqual(domElements['insert-phys-node-select'].disabled, true, 'Pueblo select must always be disabled/locked');
  domElements['insert-phys-node-select'].value = 'nod-2'; // Attempt to tamper with another pueblo
  domElements['insert-phys-node'].value = 'nod-2';
  domElements['insert-phys-category'].value = 'otro';
  domElements['insert-phys-priority'].value = 'media';
  domElements['insert-phys-description'].value = 'Cambio de cableado en comunidad';
  confirmations.length = 0;
  await sandbox.saveInsertedPhysicalRecord();

  assert(confirmations[0].message.includes('Destino (Pueblo): R101 · San Marcos'), 'Admin confirmation must strictly use report pueblo');
  const createdPuebloPhys = mockState.workOrders.find(w => w.detailKind === 'physical' && w.sourceOrderId === 'net-pueblo-2');
  assert(createdPuebloPhys, 'Physical detail must be created for Pueblo');
  assert.strictEqual(createdPuebloPhys.visitType, 'comunidad', 'Pueblo physical detail must have visitType === comunidad');
  assert.strictEqual(createdPuebloPhys.nodeId, 'nod-1', 'Pueblo physical detail must lock to report nodeId nod-1, never nod-2');
  assert.strictEqual(createdPuebloPhys.nodeName, 'R101 · San Marcos', 'Pueblo physical detail must lock to report nodeName');
  assert.strictEqual(createdPuebloPhys.equipmentId, '', 'Pueblo physical detail must have empty equipmentId');
  assert.strictEqual(createdPuebloPhys.equipmentName, '', 'Pueblo physical detail must have empty equipmentName');

  const puebloOrder = mockState.workOrders.find(w => w.id === 'net-pueblo-2');
  const puebloSentInfo = sandbox.getOrderSentToPhysicalInfo(puebloOrder);
  assert.strictEqual(puebloSentInfo.sent, true);
  assert.strictEqual(puebloSentInfo.targetType, 'pueblo');
  assert.strictEqual(puebloSentInfo.targetName, 'R101 · San Marcos');

  console.log('✓ All VM runtime checks passed!');
  console.log('\n--- ALL TESTS PASSED! ---');
})().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

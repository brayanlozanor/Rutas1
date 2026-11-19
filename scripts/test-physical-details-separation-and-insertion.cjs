// Test: Physical Details Independence, Two-Party Agreement, Summary Confirmation, Network Closure & Creator Reopening
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('--- TEST: Physical Details Independence, Two-Party Agreement, Closure & Creator Reopening ---');

const commonJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'common.js');
const ordenesJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'ordenes.js');
const antenasJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'antenas.js');
const nodosJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'nodos.js');
const cssPath = path.join(__dirname, '..', 'public', 'assets', 'css', 'orders-design-v2.css');

const commonJs = fs.readFileSync(commonJsPath, 'utf8').replace(/\r\n/g, '\n');
const ordenesJs = fs.readFileSync(ordenesJsPath, 'utf8').replace(/\r\n/g, '\n');
const antenasJs = fs.readFileSync(antenasJsPath, 'utf8').replace(/\r\n/g, '\n');
const nodosJs = fs.readFileSync(nodosJsPath, 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Verify function existence and exports
console.log('1. Checking function definitions and exports...');
assert(commonJs.includes('function openInsertPhysicalRecordModal('), 'common.js must implement openInsertPhysicalRecordModal');
assert(commonJs.includes('async function saveInsertedPhysicalRecord('), 'common.js must implement saveInsertedPhysicalRecord');
assert(commonJs.includes('function onInsertPhysEquipmentChange('), 'common.js must implement onInsertPhysEquipmentChange');
assert(commonJs.includes('function onInsertPhysNodeChange('), 'common.js must implement onInsertPhysNodeChange');
assert(commonJs.includes('window.openInsertPhysicalRecordModal = openInsertPhysicalRecordModal'), 'common.js must expose openInsertPhysicalRecordModal on window');
assert(commonJs.includes('function isOrderCreator('), 'common.js must implement isOrderCreator');
assert(ordenesJs.includes('function isOrderCreator('), 'ordenes.js must implement isOrderCreator');
assert(ordenesJs.includes('function getPhysicalDerivationStatus('), 'ordenes.js must implement getPhysicalDerivationStatus');
assert(ordenesJs.includes('async function confirmSendNetworkToPhysical('), 'ordenes.js must implement confirmSendNetworkToPhysical');
console.log('✓ Item 1 Passed: Modal functions and window exports verified.');

// 2. Verify footer actions in Network Details
console.log('2. Checking Network Detail UI options...');
assert(ordenesJs.includes("openInsertPhysicalRecordModal('${order.id}')"), 'ordenes.js footer actions must call openInsertPhysicalRecordModal');
assert(ordenesJs.includes('Registrar detalle físico'), 'ordenes.js must display "Registrar detalle físico" option in footer actions');
assert(ordenesJs.includes("openInsertPhysicalRecordModal('${orderEscape(id)}')"), 'openOrderActions must provide option to insert physical record');
console.log('✓ Item 2 Passed: Option to insert physical record is present in network details.');

// 3. Verify separation: Network order is NOT mutated into physical
console.log('3. Verifying non-destructive behavior (network order stays network)...');
assert(!commonJs.includes("detail.detailKind = 'physical';"), 'common.js must not mutate detail.detailKind to physical');
assert(!ordenesJs.includes("order.detailKind = 'physical';"), 'ordenes.js must not mutate order.detailKind to physical');
console.log('✓ Item 3 Passed: Network orders remain network tickets without being converted to physical.');

// 4. Verify physical records have NO assignees to resolve ("no se asigna a nadie para resolver")
console.log('4. Checking that physical details have no assignees...');
assert(commonJs.includes("assignedUserId: '', // No se asigna a nadie para resolver"), 'common.js must create physical records with empty assignedUserId');
assert(commonJs.includes("assignedUserName: '',"), 'common.js must create physical records with empty assignedUserName');
assert(ordenesJs.includes("assignedUserId: '', // No se asigna a nadie para resolver"), 'ordenes.js confirmSendNetworkToPhysical must create physical records with empty assignedUserId');
console.log('✓ Item 4 Passed: Physical records have no assignees to resolve and display infrastructure tags.');

// 5. Verify creator reopening logic
console.log('5. Checking creator reopening permission in ordenes.js...');
assert(ordenesJs.includes('const isCreator = typeof isOrderCreator === \'function\' ? isOrderCreator(w, currentUser)'), 'reopenCompletedWO must check isCreator');
assert(ordenesJs.includes('if (!isAdmin && !isCreator) {'), 'reopenCompletedWO must permit creator to reopen');
assert(ordenesJs.includes('canReopen = isAdmin || isCreator || (isSentToAttention ? isSoporte : isAtencion);'), 'renderOrderFooterActions must allow creator to reopen');
assert(ordenesJs.includes('if (isAdmin || isCreator) {\n        canReopen = true;'), 'renderWOs must allow creator to reopen');
console.log('✓ Item 5 Passed: Report creator is guaranteed ability to reopen concluded tickets.');

// 6. Verify VM behavior: Proposal -> Agreement Confirmation -> Physical Created & Network Closed
console.log('6. Simulating two-party agreement, confirmation summary, closure & reopening in VM...');
const savedRecords = [];
const confirmationsAsked = [];

const mockState = {
  workOrders: [
    {
      id: 'net-201',
      folio: 'RED-200201',
      detailKind: 'network',
      clientName: 'María Santos',
      status: 'en_revision',
      equipmentId: 'ant-1',
      equipmentName: 'Antena Cerros',
      nodeId: 'nod-1',
      nodeName: 'Pueblo San Marcos',
      priority: 'alta',
      createdById: 'usr-creator-123',
      createdByUsername: 'msantos_agent',
      createdByName: 'María Santos',
      followUps: []
    }
  ],
  equipment: [
    { id: 'ant-1', name: 'Antena Cerros', region: 'centro' },
    { id: 'ant-2', name: 'Antena Norte', region: 'norte' }
  ],
  nodes: [
    { id: 'nod-1', name: 'Pueblo San Marcos', zone: 'centro' },
    { id: 'nod-2', name: 'Pueblo El Palmar', zone: 'norte' }
  ],
  users: []
};

const domElements = {
  'insert-phys-equipment': { value: 'ant-1' },
  'insert-phys-node': { value: 'nod-1' },
  'insert-phys-category': { value: 'alineacion_antena' },
  'insert-phys-priority': { value: 'alta' },
  'insert-phys-description': { value: 'Torre desajustada tras tormenta, requiere llave 14mm' }
};

let currentSimulatedUser = { id: 'usr-soporte-1', role: 'soporte', name: 'Técnico Soporte' };

const sandbox = {
  state: mockState,
  currentInsertPhysNetworkOrderId: 'net-201',
  document: {
    getElementById: (id) => domElements[id] || null,
    body: { insertAdjacentHTML: () => {} }
  },
  getCurrentUser: () => currentSimulatedUser,
  userHasRole: (...roles) => roles.includes(currentSimulatedUser.role),
  getWorkOrderFolio: (order) => order.folio || 'FOL-001',
  getNodeLabel: (node) => node.name,
  orderCategoryLabel: (cat) => cat,
  getOrderCategory: (order) => order.category || 'otro',
  isNetworkSupportToAttention: () => false,
  askConfirmation: async (options) => {
    confirmationsAsked.push(options);
    return true; // Simulate user confirming summary
  },
  saveRecord: async (table, record) => {
    savedRecords.push({ table, record: JSON.parse(JSON.stringify(record)) });
    return true;
  },
  appendSharedNetworkFollowUp: (order, action, title, note) => {
    order.followUps.push({ action, title, note, at: new Date().toISOString() });
  },
  broadcastNetworkOrderChange: () => {},
  updateOrderChatLive: () => {},
  CM: () => {},
  notify: () => {}
};

vm.createContext(sandbox);

// Load isOrderCreator, getPhysicalDerivationStatus and saveInsertedPhysicalRecord
const isOrderCreatorCode = commonJs.substring(
  commonJs.indexOf('function isOrderCreator('),
  commonJs.indexOf('let currentInsertPhysNetworkOrderId =')
);
const getPhysStatusCode = ordenesJs.substring(
  ordenesJs.indexOf('function getPhysicalDerivationStatus('),
  ordenesJs.indexOf('if (typeof window !== \'undefined\') {\n  window.getPhysicalDerivationStatus')
);
const saveFnCode = commonJs.substring(
  commonJs.indexOf('async function saveInsertedPhysicalRecord('),
  commonJs.indexOf('async function sendSharedNetworkToPhysical(')
);

vm.runInContext(isOrderCreatorCode, sandbox);
vm.runInContext(getPhysStatusCode, sandbox);
vm.runInContext(saveFnCode, sandbox);

(async () => {
  // Step A: Soporte proposes physical record
  currentSimulatedUser = { id: 'usr-soporte-1', role: 'soporte', name: 'Agente Soporte' };
  await sandbox.saveInsertedPhysicalRecord();

  // Verify that proposal was recorded and summary was confirmed
  assert(confirmationsAsked.length >= 1, 'Summary confirmation must be asked before sending proposal');
  const proposalConfirmation = confirmationsAsked[0];
  assert(proposalConfirmation.message.includes('Pueblo San Marcos'), 'Confirmation summary must include registered Node/Pueblo');
  assert(!proposalConfirmation.message.includes('Antena:'), 'Confirmation summary must NOT allow or include Antenna selection');
  assert(proposalConfirmation.message.includes('Torre desajustada'), 'Confirmation summary must include description');

  const orderAfterProposal = mockState.workOrders.find(w => w.id === 'net-201');
  assert(orderAfterProposal.physicalProposal, 'Order must store physicalProposal');
  assert.strictEqual(orderAfterProposal.physicalProposal.proposedBy, 'soporte');
  assert.strictEqual(orderAfterProposal.physicalProposal.equipmentId, '', 'Proposal equipmentId must be forcibly empty');
  assert.strictEqual(orderAfterProposal.physicalProposal.nodeId, 'nod-1', 'Proposal nodeId must be the registered pueblo');
  assert.strictEqual(orderAfterProposal.status, 'en_revision', 'Network order remains active while proposal is pending agreement');

  // Step B: Counterparty (Atención a Clientes) confirms agreement
  confirmationsAsked.length = 0;
  currentSimulatedUser = { id: 'usr-atencion-2', role: 'atencion_clientes', name: 'Agente Atención' };
  await sandbox.saveInsertedPhysicalRecord();

  // Verify counterparty confirmation summary was asked
  assert(confirmationsAsked.length >= 1, 'Summary confirmation must be asked before accepting agreement');
  const acceptConfirmation = confirmationsAsked[0];
  assert(acceptConfirmation.title.includes('Confirmar acuerdo'), 'Confirmation modal must title agreement');
  assert(acceptConfirmation.message.includes('Pueblo San Marcos'), 'Confirmation message must include registered pueblo');
  assert(!acceptConfirmation.message.includes('Antena:'), 'Confirmation message must NOT include antenna');
  assert(acceptConfirmation.message.toLowerCase().includes('se cerrará este reporte de red'), 'Confirmation message must notify closure');

  // Verify that new physical record was created strictly in pueblo
  const createdPhysical = mockState.workOrders.find(w => w.detailKind === 'physical');
  assert(createdPhysical, 'A physical workOrder record must be created upon mutual agreement');
  assert.strictEqual(createdPhysical.detailKind, 'physical');
  assert.strictEqual(createdPhysical.equipmentId, '', 'equipmentId must be forcibly empty (registered strictly in pueblo)');
  assert.strictEqual(createdPhysical.equipmentName, '', 'equipmentName must be empty');
  assert.strictEqual(createdPhysical.nodeId, 'nod-1', 'nodeId must be the registered pueblo');
  assert.strictEqual(createdPhysical.nodeName, 'Pueblo San Marcos', 'nodeName must match registered pueblo');
  assert.strictEqual(createdPhysical.visitType, 'comunidad', 'visitType must be comunidad');
  assert.strictEqual(createdPhysical.category, 'alineacion_antena');
  assert.strictEqual(createdPhysical.assignedUserId, '', 'Physical record must have empty assignedUserId');
  assert.strictEqual(createdPhysical.assignedUserName, '', 'Physical record must have empty assignedUserName');
  assert.strictEqual(createdPhysical.originNetworkOrderId, 'net-201');

  // Verify that original network order was CLOSED
  assert.strictEqual(orderAfterProposal.status, 'completada', 'Network order must be CLOSED upon agreement (status === completada)');
  assert.strictEqual(orderAfterProposal.closedReason, 'physical_registered', 'Network order closedReason must be physical_registered');
  assert(Boolean(orderAfterProposal.completedAt), 'Network order completedAt must be set');

  // Step C: Verify creator reopening permission
  const creatorUser = { id: 'usr-creator-123', name: 'María Santos', username: 'msantos_agent', role: 'atencion_clientes' };
  const otherUser = { id: 'usr-other-999', name: 'Otro Usuario', username: 'other', role: 'tecnico' };

  assert.strictEqual(sandbox.isOrderCreator(orderAfterProposal, creatorUser), true, 'Creator must be recognized by isOrderCreator');
  assert.strictEqual(sandbox.isOrderCreator(orderAfterProposal, otherUser), false, 'Non-creator must not be recognized');

  console.log('✓ Item 6 Passed: Two-party agreement, confirmation summary, network closure and creator identity verified.');

  // 7. Check antenas.js, nodos.js and compact UI adjustments
  console.log('7. Checking antenas.js and nodos.js integration...');
  assert(antenasJs.includes('<span>Vinculado a</span>'), 'antenas.js must use "Vinculado a" instead of "Asignado a"');
  assert(css.includes('.insert-physical-record-mo'), 'orders-design-v2.css must style .insert-physical-record-mo');
  assert(css.includes('.insert-physical-record-card'), 'orders-design-v2.css must style .insert-physical-record-card');
  assert(css.includes('max-height: min(92vh, 560px)'), 'orders-design-v2.css must constrain max-height for normal zoom visibility');
  assert(css.includes('.insert-phys-body'), 'orders-design-v2.css must specify scrollable body');
  assert(commonJs.includes('function extractCleanPhysicalDescription('), 'common.js must implement extractCleanPhysicalDescription');
  assert(ordenesJs.includes("Pueblo: ${orderEscape(w.nodeName)}"), 'ordenes.js table must label node tag as Pueblo');
  assert(!ordenesJs.includes("Nodo: ${orderEscape(w.nodeName)}"), 'ordenes.js table must not label node tag as Nodo');
  assert(ordenesJs.includes("filterOnlyMyAssignments && activeOrderDetailKind === 'network'"), 'ordenes.js must restrict Mis detalles filter strictly to network');
  console.log('✓ Item 7 Passed: Antenna/node labels, compact dialog styles, clean description and Pueblo nomenclature verified.');

  console.log('\n--- ALL PHYSICAL DETAILS TWO-PARTY AGREEMENT AND CLOSURE TESTS PASSED! ---');
})().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

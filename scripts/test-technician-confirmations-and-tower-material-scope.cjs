const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- TEST: Technician Custom Confirmations & Antenna-Only Tower Material Scope ---');

const commonJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/common.js'), 'utf8').replace(/\r\n/g, '\n');
const planificarJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/planificar.js'), 'utf8').replace(/\r\n/g, '\n');
const tecnicoRutaJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/tecnico-ruta.js'), 'utf8').replace(/\r\n/g, '\n');

// 1. Verify window.confirm is NOT used in technician completion / report handlers
const extractFn = (source, name) => {
  const match = source.match(new RegExp(`(?:async\\s+)?function\\s+${name}[\\s\\S]*?\\n\\}`));
  return match ? match[0] : '';
};
assert(!extractFn(planificarJs, 'saveTechnicianCompletion').includes('window.confirm('),
  'saveTechnicianCompletion must NOT use native window.confirm');
assert(!extractFn(planificarJs, 'reportPlanDetailIncomplete').includes('window.confirm('),
  'reportPlanDetailIncomplete must NOT use native window.confirm');
assert(!extractFn(planificarJs, 'reportWholeStopIncomplete').includes('window.confirm('),
  'reportWholeStopIncomplete must NOT use native window.confirm');

assert(planificarJs.includes('askConfirmation({') || planificarJs.includes('askConfirmation('),
  'planificar.js must call askConfirmation');
assert(tecnicoRutaJs.includes('askConfirmation({') || tecnicoRutaJs.includes('askConfirmation('),
  'tecnico-ruta.js must call askConfirmation');

console.log('✓ 1. Native confirm eliminated and replaced with askConfirmation in technician workflows.');

// 2. Behavioral test for isDetailForAntennaTower and findAntennaForDetail
const sandbox = {
  state: {
    equipment: [
      { id: 'eq-tower-1', name: 'Torre Zempazulco', lat: 17.1, lng: -99.1 },
      { id: 'eq-linked-to-pueblo', name: 'Antena La Lima', lat: 17.2, lng: -99.2 }
    ],
    nodes: [
      { id: 'node-pueblo-1', town: 'LA LIMA', nodeCode: 'R224', lat: 17.2, lng: -99.2 }
    ]
  },
  getPlanMapStops: () => [
    { id: 'stop-pueblo', type: 'node', nodeId: 'node-pueblo-1', equipmentId: 'eq-linked-to-pueblo', detailIds: ['det-in-pueblo'] },
    { id: 'stop-antenna', type: 'equipment', equipmentId: 'eq-tower-1', detailIds: ['det-in-tower'] }
  ],
  window: {}
};

vm.createContext(sandbox);

// Extract helper functions from common.js
const funcCode = [
  commonJs.match(/function isDetailForAntennaTower[\s\S]*?\n}\n/)?.[0] || '',
  commonJs.match(/function findAntennaForDetail[\s\S]*?\n}\n/)?.[0] || ''
].join('\n');

assert(funcCode.includes('function isDetailForAntennaTower'), 'isDetailForAntennaTower must be defined');
assert(funcCode.includes('function findAntennaForDetail'), 'findAntennaForDetail must be defined');

vm.runInContext(funcCode, sandbox);

// Scenario A: Detail belongs to a pueblo/nodo, but has equipmentId (linked antenna)
const puebloDetailWithLinkedAntenna = {
  id: 'det-in-pueblo',
  nodeId: 'node-pueblo-1',
  equipmentId: 'eq-linked-to-pueblo',
  town: 'LA LIMA',
  visitType: 'comunidad'
};

const stopPueblo = sandbox.getPlanMapStops()[0];
assert.strictEqual(
  sandbox.isDetailForAntennaTower(puebloDetailWithLinkedAntenna, stopPueblo),
  false,
  'Pueblo detail with linked antenna must NOT be considered an antenna/tower detail'
);
assert.strictEqual(
  sandbox.findAntennaForDetail(puebloDetailWithLinkedAntenna, stopPueblo),
  null,
  'findAntennaForDetail must return null for pueblo detail even if linked to antenna'
);
console.log('✓ 2. Pueblo detail with linked antenna correctly returns false/null (no tower material prompted).');

// Scenario B: Detail belongs to a pueblo without equipmentId
const simplePuebloDetail = {
  id: 'det-simple-pueblo',
  nodeId: 'node-pueblo-1',
  town: 'LA LIMA'
};
assert.strictEqual(sandbox.isDetailForAntennaTower(simplePuebloDetail), false);
assert.strictEqual(sandbox.findAntennaForDetail(simplePuebloDetail), null);
console.log('✓ 3. Standard pueblo detail correctly returns null.');

// Scenario C: Detail is directly on an antenna/torre (no nodeId)
const towerDetail = {
  id: 'det-in-tower',
  equipmentId: 'eq-tower-1',
  title: 'Cambio de radio en torre'
};
const stopAntenna = sandbox.getPlanMapStops()[1];
assert.strictEqual(
  sandbox.isDetailForAntennaTower(towerDetail, stopAntenna),
  true,
  'Genuine antenna detail must return true'
);
const matchedAntenna = sandbox.findAntennaForDetail(towerDetail, stopAntenna);
assert(matchedAntenna, 'findAntennaForDetail must return antenna for antenna detail');
assert.strictEqual(matchedAntenna.id, 'eq-tower-1');
console.log('✓ 4. Pure antenna detail correctly returns the antenna object.');

// Scenario D: Antenna detail completed without passing stop
assert.strictEqual(sandbox.isDetailForAntennaTower(towerDetail), true);
assert.strictEqual(sandbox.findAntennaForDetail(towerDetail).id, 'eq-tower-1');
console.log('✓ 5. Pure antenna detail without explicit stop argument resolves correctly.');

console.log('=== ALL TECHNICIAN CONFIRMATION & TOWER MATERIAL SCOPE TESTS PASSED! ===');


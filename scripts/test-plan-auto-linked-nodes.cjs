const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- TEST: Auto-add linked nodes when adding an antenna to the plan ---');

const planJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'planificar.js');
const planJs = fs.readFileSync(planJsPath, 'utf8');

// Set up mock DOM and environment
const mockStorage = {};
const mockElements = {
    'stop-type': { value: 'equipment' },
    'stop-day': { value: 'lunes' },
    'stop-notes': { value: '' },
    'stop-detail-client': { value: '' },
    'stop-detail-phone': { value: '' },
    'stop-detail-location': { value: '' },
    'stop-visit-type': { value: 'mantenimiento' },
    'stop-priority': { value: 'media' },
    'stop-tech-target': { value: 'tech-1' },
    'stop-material': { value: '' },
    'plan-tech': { value: 'tech-1' },
    'plan-day': { value: 'lunes' },
    'equipment-preview': { style: {}, innerHTML: '' },
    'equipment-details': { innerHTML: '', querySelectorAll: () => [] }
};

let lastNotification = '';
const sandbox = {
    console,
    URLSearchParams,
    userHasRole: () => true,
    getCurrentUser: () => ({ role: 'administrador', nombre: 'Admin User' }),
    document: {
        getElementById: id => mockElements[id] || { value: '', innerHTML: '', style: {}, focus: () => {} },
        querySelector: sel => mockElements[sel] || null,
        querySelectorAll: sel => []
    },
    window: {},
    navigator: { userAgent: 'test' },
    localStorage: {
        getItem: k => mockStorage[k] || null,
        setItem: (k, v) => { mockStorage[k] = String(v); },
        removeItem: k => { delete mockStorage[k]; }
    },
    notify: (msg) => { lastNotification = msg; },
    CM: () => {},
    OM: () => {},
    saveDB: () => {},
    loadDB: async () => {},
    renderPlan: () => {},
    gid: prefix => `${prefix}_${Math.random().toString(36).slice(2, 8)}`,
    normalizeName: str => String(str || '').toLowerCase().trim(),
    escapeHtml: str => String(str || ''),
    escapeAttr: str => String(str || ''),
    rById: () => ({ n: 'Centro' }),
    pc: () => '#000',
    pl: () => 'Media',
    sortDetailsByPriority: list => (list || []).slice(),
    getNodeLabel: node => node?.name || 'Nodo',
    getLocationDisplay: loc => ({ label: loc }),
    parseOptionalLocation: () => ({}),
    getNearestRegion: () => 'Centro',
    safeFloat: v => parseFloat(v),
    setCreatedAudit: () => {},
    SHARED_PLAN_ID: '__shared__',
    state: {
        currentUser: { role: 'administrador', nombre: 'Admin User' },
        equipment: [
            {
                id: 'eq-tower-1',
                name: 'Antena Cerros',
                lat: 17.55123,
                lng: -99.50123,
                region: 'Centro',
                linkedNodeIds: ['node-1', 'node-2']
            },
            {
                id: 'eq-tower-2',
                name: 'Torre Costa',
                lat: 16.85000,
                lng: -99.90000,
                region: 'Costa',
                linkedNodeIds: []
            }
        ],
        nodes: [
            { id: 'node-1', name: 'Pueblo San Juan', lat: 17.55400, lng: -99.50500, region: 'Centro', equipmentId: 'eq-tower-1' },
            { id: 'node-2', name: 'Pueblo San Pedro', lat: 17.55800, lng: -99.50900, region: 'Centro', equipmentId: 'eq-tower-1' },
            { id: 'node-3', name: 'Pueblo El Salto', lat: 16.86000, lng: -99.91000, region: 'Costa', equipmentId: 'eq-tower-2' } // linked via equipmentId
        ],
        workOrders: [
            { id: 'wo-1', title: 'Falla fibra', nodeId: 'node-1', equipmentId: 'eq-tower-1', status: 'pendiente', priority: 'alta' },
            // node-2 has 0 work orders
            { id: 'wo-2', title: 'Mantenimiento antena', equipmentId: 'eq-tower-1', status: 'pendiente', priority: 'media' }
        ],
        weekPlan: {
            'tech-1': {
                lunes: [],
                martes: [],
                miercoles: [],
                jueves: [],
                viernes: [],
                sabado: [],
                domingo: []
            },
            '__shared__': {
                general: []
            }
        },
        technicians: [
            { id: 'tech-1', nombre: 'Carlos Tecnico', activo: true }
        ]
    }
};

vm.createContext(sandbox);
vm.runInContext(planJs, sandbox);

// Stub UI render calls so this test focuses on stop and linked nodes state
vm.runInContext("renderPlan = () => {};", sandbox);

// Set active selection inside the VM scope
vm.runInContext("selectedTechId = 'tech-1'; selectedDay = 'lunes';", sandbox);

console.log('Testing Test 1: Add antenna via addEquipmentStopFromMap...');
vm.runInContext("addEquipmentStopFromMap('eq-tower-1');", sandbox);

const lunesStops = sandbox.state.weekPlan['tech-1'].lunes;
console.log('Stops in lunes after adding Antena Cerros:', lunesStops.map(s => `${s.type}: ${s.name}`));

// Assertions for Test 1
assert.strictEqual(lunesStops.length, 3, 'Must have 3 stops: 1 antenna and 2 linked nodes');
assert.strictEqual(lunesStops[0].type, 'equipment', 'First stop must be the antenna');
assert.strictEqual(lunesStops[0].equipmentId, 'eq-tower-1');
assert.deepStrictEqual([...lunesStops[0].detailIds], ['wo-2'], 'Antenna stop must have antenna work orders');

assert.strictEqual(lunesStops[1].type, 'node', 'Second stop must be linked node');
assert.strictEqual(lunesStops[1].nodeId, 'node-1');
assert.strictEqual(lunesStops[1].parentEquipmentId, 'eq-tower-1');
assert.deepStrictEqual([...lunesStops[1].detailIds], ['wo-1'], 'Node 1 must have its work order wo-1');

assert.strictEqual(lunesStops[2].type, 'node', 'Third stop must be linked node 2');
assert.strictEqual(lunesStops[2].nodeId, 'node-2');
assert.strictEqual(lunesStops[2].parentEquipmentId, 'eq-tower-1');
assert.deepStrictEqual([...lunesStops[2].detailIds], [], 'Node 2 has 0 work orders but MUST still be added as a stop');

assert(lastNotification.includes('Antena Cerros') && lastNotification.includes('2 nodo(s) vinculados'), 'Notification must mention antenna and linked nodes');
console.log('✓ Test 1 Passed: Antenna eq-tower-1 and its 2 linked nodes added automatically (even node-2 with 0 work orders).');

// Test 2: Inferred link via equipmentId on node without eq.linkedNodeIds
console.log('Testing Test 2: Add antenna with node linked via node.equipmentId...');
vm.runInContext("selectedDay = 'martes'; addEquipmentStopFromMap('eq-tower-2');", sandbox);
const martesStops = sandbox.state.weekPlan['tech-1'].martes;
console.log('Stops in martes after adding Torre Costa:', martesStops.map(s => `${s.type}: ${s.name}`));
assert.strictEqual(martesStops.length, 2, 'Must have 2 stops: 1 antenna and 1 linked node (Pueblo El Salto)');
assert.strictEqual(martesStops[1].nodeId, 'node-3');
console.log('✓ Test 2 Passed: Torre Costa automatically included Pueblo El Salto linked via node.equipmentId.');

// Test 3: Deduplication - if a node is already in the plan, it is not duplicated
console.log('Testing Test 3: Deduplication when a node is already present in the day plan...');
// Clear stops for miércoles
sandbox.state.weekPlan['tech-1'].miercoles = [{
    id: 'p_existing',
    type: 'node',
    nodeId: 'node-1',
    name: 'Pueblo San Juan',
    lat: 17.55400,
    lng: -99.50500,
    detailIds: []
}];
vm.runInContext("selectedDay = 'miercoles'; addEquipmentStopFromMap('eq-tower-1');", sandbox);
const miercolesStops = sandbox.state.weekPlan['tech-1'].miercoles;
console.log('Stops in miercoles after adding Antena Cerros (node-1 was pre-existing):', miercolesStops.map(s => `${s.type}: ${s.name}`));
assert.strictEqual(miercolesStops.length, 3, 'Must have 3 stops: existing node-1, antenna eq-tower-1, and newly added node-2');
// Verify node-1 only appears once
const node1Count = miercolesStops.filter(s => s.nodeId === 'node-1').length;
assert.strictEqual(node1Count, 1, 'node-1 must not be duplicated');
console.log('✓ Test 3 Passed: Existing nodes in the plan are not duplicated.');

// Test 4: Modal savePlanStop() automatically adds linked nodes
console.log('Testing Test 4: savePlanStop modal adds linked nodes...');
mockElements['stop-type'].value = 'equipment';
mockElements['stop-day'].value = 'jueves';
mockElements['stop-tech-target'].value = 'tech-1';
vm.runInContext("selectedDay = 'jueves'; selectedEquipmentId = 'eq-tower-1'; savePlanStop();", sandbox);

const juevesStops = sandbox.state.weekPlan['tech-1'].jueves;
console.log('Stops in jueves after savePlanStop():', juevesStops.map(s => `${s.type}: ${s.name}`));
assert.strictEqual(juevesStops.length, 3, 'savePlanStop must add antenna and 2 linked nodes');
assert.strictEqual(juevesStops[0].equipmentId, 'eq-tower-1');
assert.strictEqual(juevesStops[1].nodeId, 'node-1');
assert.strictEqual(juevesStops[2].nodeId, 'node-2');
console.log('✓ Test 4 Passed: savePlanStop() modal also adds antenna and linked nodes automatically.');

console.log('\n--- ALL AUTO-LINKED NODES TESTS PASSED SUCCESSFULLY! ---');

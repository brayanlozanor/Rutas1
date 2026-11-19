const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { DatabaseSync } = require('node:sqlite');
const assert = require('assert');

console.log('=== TEST: PRESET ROUTES MATCHING & WIFIMEX DEPARTURE INVARIANT ===\n');

const dbPath = path.join(__dirname, '..', '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject', '009a7fc67a701a4f29d4a14ba1c39515cabc0fc7772a46f7de078e80c7f07606.sqlite');
const db = new DatabaseSync(dbPath, { readOnly: true });

const allNodes = db.prepare("SELECT id, town, node_code, lat, lng FROM nodes WHERE deleted_at IS NULL").all();
const allEq = db.prepare("SELECT id, name, lat, lng FROM equipment WHERE deleted_at IS NULL").all();

console.log(`Loaded ${allNodes.length} active nodes and ${allEq.length} active equipment from D1.`);

const presetRoutesPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'preset-routes.js');
const presetRoutesCode = fs.readFileSync(presetRoutesPath, 'utf8');

const planificarPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'planificar.js');
const planificarCode = fs.readFileSync(planificarPath, 'utf8');

const SHARED_PLAN_ID = '__shared__';

const domStorage = {};
function createMockEl() {
  return {
    value: '',
    textContent: '',
    dataset: {},
    style: { setProperty: () => {} },
    focus: () => {},
    classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
    remove: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null
  };
}

const mockElements = {
  'plan-create-name': { value: 'Ruta Test WiFi-Mex', focus: () => {}, dataset: {}, style: { setProperty: () => {} }, closest: () => null },
  'plan-tech': createMockEl(),
  'plan-day': createMockEl(),
  'general-plan-select': createMockEl(),
  'plan-calendar-box': createMockEl(),
  'plan-map-box': createMockEl()
};

const sandbox = {
  window: {
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  root: {},
  console: console,
  normalizeName: (s) => String(s || '').trim().toLowerCase(),
  sortDetailsByPriority: (arr) => arr || [],
  safeFloat: (v, def) => Number(v) || def || 0,
  userHasRole: () => false,
  getCurrentUser: () => ({ id: 'u-admin', username: 'admin', role: 'administrador' }),
  document: {
    addEventListener: () => {},
    removeEventListener: () => {},
    getElementById: (id) => mockElements[id] || createMockEl(),
    querySelector: () => createMockEl(),
    querySelectorAll: () => [],
    body: { classList: { contains: () => false, add: () => {}, remove: () => {}, toggle: () => {} }, dataset: {} }
  },
  localStorage: {
    getItem: (k) => domStorage[k] || null,
    setItem: (k, v) => { domStorage[k] = String(v); },
    removeItem: (k) => { delete domStorage[k]; }
  },
  sessionStorage: {
    getItem: (k) => domStorage['s_' + k] || null,
    setItem: (k, v) => { domStorage['s_' + k] = String(v); },
    removeItem: (k) => { delete domStorage['s_' + k]; }
  },
  setTimeout: (fn) => fn(),
  requestAnimationFrame: (fn) => fn(),
  SHARED_PLAN_ID,
  gid: (prefix) => prefix + '_test_' + Math.random().toString(36).substring(2, 8),
  notify: (msg, type) => console.log(`  [notify:${type||'info'}] ${msg}`),
  OM: () => {},
  CM: () => {},
  saveDB: async () => {},
  renderPlan: () => {}
};

sandbox.state = {
  nodes: allNodes,
  equipment: allEq,
  technicians: [
    { id: 'tech-1', name: 'Nolve Robles', role: 'tecnico' },
    { id: 'tech-2', name: 'Pablo Navarrete', role: 'tecnico' }
  ],
  weekPlan: {
    [SHARED_PLAN_ID]: {
      _generalPlans: []
    }
  },
  workOrders: []
};
sandbox.window.state = sandbox.state;
sandbox.root = sandbox.window;

vm.createContext(sandbox);

// 1. Run preset-routes.js
vm.runInContext(presetRoutesCode, sandbox);
console.log('✓ preset-routes.js loaded successfully in VM.');

// 2. Run planificar.js
vm.runInContext(planificarCode, sandbox);
console.log('✓ planificar.js loaded successfully in VM.');

// TEST 1: Check that all preset routes stops match registered locations (0 unregistered "parada")
console.log('\n--- Test 1: All preset routes stops must match registered entities ---');
const routes = sandbox.window.getAllPresetRoutes();
console.log(`Auditing ${routes.length} preset routes...`);

let totalStopsCount = 0;
let matchedCount = 0;
const unmatchedStops = [];

routes.forEach(r => {
  const checkStops = [
    ...(r.stops || []).map(s => ({ stop: s, route: r.name })),
    ...(r.continuations || []).flatMap(c => (c.stops || []).map(s => ({ stop: s, route: `${r.name} -> ${c.name}` })))
  ];
  checkStops.forEach(({ stop, route }) => {
    totalStopsCount++;
    const match = sandbox.window.findSystemLocationMatch(stop);
    if (match) {
      matchedCount++;
    } else {
      unmatchedStops.push({ stop, route });
    }
  });
});

console.log(`Matched stops: ${matchedCount} / ${totalStopsCount} (${(matchedCount / totalStopsCount * 100).toFixed(1)}%)`);
if (unmatchedStops.length > 0) {
  console.error('FAILED: Unmatched stops found:', unmatchedStops);
  process.exit(1);
}
assert.strictEqual(matchedCount, totalStopsCount, 'All stops must match registered locations!');
console.log('✓ TEST 1 PASSED: 100% of stops match registered nodes or antennas (0 unregistered generic paradas).');

// TEST 2: Check that attachPresetRouteToPlan begins with WiFi-Mex
console.log('\n--- Test 2: attachPresetRouteToPlan must always start at antenna WiFi-Mex ---');
(async () => {
  // Test attaching 'corredor-chilpancingo-atlixtac'
  await sandbox.window.attachPresetRouteToPlan('corredor-chilpancingo-atlixtac', true, true);
  const generalPlans = sandbox.state.weekPlan[SHARED_PLAN_ID]._generalPlans;
  assert.ok(generalPlans.length > 0, 'General plan should be created');
  const attachedPlan = generalPlans[generalPlans.length - 1];
  console.log(`Created plan: "${attachedPlan.name}" with ${attachedPlan.stops.length} stops.`);
  
  const stop0 = attachedPlan.stops[0];
  console.log(`Stop 0:`, { name: stop0.name, type: stop0.type, equipmentId: stop0.equipmentId });
  assert.strictEqual(stop0.type, 'equipment', 'Stop 0 must be equipment');
  assert.ok(stop0.name.toLowerCase().includes('wifi-mex') || stop0.name.toLowerCase().includes('wifimex'), 'Stop 0 name must be WiFi-Mex');
  assert.strictEqual(stop0.equipmentId, 'eqmr9qmpr81rc', 'Stop 0 equipmentId must be eqmr9qmpr81rc');
  assert.ok(!stop0.name.toLowerCase().includes('palmar'), 'Stop 0 must NOT be El Palmar');
  console.log('✓ TEST 2 PASSED: attachPresetRouteToPlan departs from antenna WiFi-Mex.');

  // TEST 3: Check that saveNewGeneralPlan starts with WiFi-Mex
  console.log('\n--- Test 3: saveNewGeneralPlan must create plan starting at antenna WiFi-Mex ---');
  await sandbox.saveNewGeneralPlan();
  const newestPlan = sandbox.state.weekPlan[SHARED_PLAN_ID]._generalPlans.slice(-1)[0];
  console.log(`New plan: "${newestPlan.name}" stops count: ${newestPlan.stops.length}`);
  assert.ok(newestPlan.stops.length >= 1, 'New plan must have at least 1 initial stop');
  const newStop0 = newestPlan.stops[0];
  console.log(`New plan Stop 0:`, { name: newStop0.name, type: newStop0.type, equipmentId: newStop0.equipmentId });
  assert.strictEqual(newStop0.type, 'equipment', 'Initial stop must be equipment');
  assert.strictEqual(newStop0.equipmentId, 'eqmr9qmpr81rc', 'Initial stop must be WiFi-Mex equipmentId');
  console.log('✓ TEST 3 PASSED: New general plans automatically initialize with WiFi-Mex departure.');

  // TEST 4: Check that legacy plans starting at El Palmar are migrated to WiFi-Mex
  console.log('\n--- Test 4: Legacy plans starting at El Palmar must be migrated to WiFi-Mex ---');
  const legacyPalmarPlan = {
    id: 'gp_legacy_palmar',
    name: 'Ruta Antigua Palmar',
    createdAt: new Date().toISOString(),
    assignedTechId: 'tech-1',
    stops: [
      { id: 'p_old_1', type: 'node', name: 'El Palmar', town: 'EL PALMAR', lat: 17.649, lng: -99.603 },
      { id: 'p_old_2', type: 'node', name: 'Atlixtac', town: 'ATLIXTAC', lat: 17.600, lng: -99.300 }
    ]
  };
  sandbox.state.weekPlan[SHARED_PLAN_ID]._generalPlans.push(legacyPalmarPlan);
  sandbox.selectedGeneralPlanId = legacyPalmarPlan.id;
  sandbox.selectedTechId = 'tech-1';
  sandbox.selectedDay = 'general';

  const stopsRef = sandbox.getPlanStopsRef('tech-1', 'general');
  console.log(`Migrated stops count: ${stopsRef.length}`);
  console.log(`Migrated Stop 0:`, { name: stopsRef[0].name, type: stopsRef[0].type, equipmentId: stopsRef[0].equipmentId });
  assert.strictEqual(stopsRef[0].type, 'equipment', 'Migrated Stop 0 must be equipment');
  assert.strictEqual(stopsRef[0].equipmentId, 'eqmr9qmpr81rc', 'Migrated Stop 0 must be WiFi-Mex');
  assert.strictEqual(stopsRef[1].name, 'Atlixtac', 'Subsequent stops must remain intact');
  console.log('✓ TEST 4 PASSED: Legacy plans starting at El Palmar cleanly migrate to WiFi-Mex.');

  // TEST 5: Verify specific pueblo corrections
  console.log('\n--- Test 5: Verify specific user-reported pueblos/sites match registered entities ---');
  const criticalSamples = [
    'San Juan De Los Pinos',
    'Alto Ventura',
    'Tlalchocohuite',
    'El Pelillo',
    'Puma Rosa',
    'Alcalmani',
    'Te Cruz',
    'Cuatro Bancos',
    'Cerro del Toro Pando',
    'Barrio de los Muertos',
    'El Ahuacatito',
    'Xoyacuautla',
    'Cañada del Totomoxtle',
    'Charco del Pozo',
    'El Cacalote',
    'Plan de Jacarandas',
    'Crucero las Grutas',
    'Las Parotas',
    'Los Huajes',
    'El Cerrito',
    'Barrio la Laja',
    'Las Pulgas',
    'El Papayo',
    'Colonia Hidalgo',
    'Alto del Camarón',
    'Agua del Perro',
    'San Pedro la Junta',
    'San Juan el Chico',
    'San Juan el Grande',
    'Barrio Nuevo Progreso',
    'Barranca de Guadalupe',
    'El Durazno',
    'El Tecorral',
    'Ayutla Regreso',
    'Yerbasanta',
    'Colonia Progreso',
    'Las Bóvedas',
    'Cuahuilotla',
    'Mezcalapa',
    'Coacoyulichán',
    'Pascala del Oro',
    'Estero Verde',
    'Ochuapa',
    'Tlayoyotepec',
    'Arroyo Mixtecolpa',
    'Santiopan',
    'Atlixco',
    'San José Capulín',
    'Juquila',
    'Tenamazapa',
    'Chautipa',
    'Nuevo Balzamar',
    'Balzamar'
  ];

  criticalSamples.forEach(sample => {
    const m = sandbox.window.findSystemLocationMatch(sample);
    assert.ok(m, `Sample "${sample}" must match a system location!`);
    console.log(`  "${sample}" -> matched as ${m.type}: "${m.name}"`);
  });
  console.log(`✓ TEST 5 PASSED: All ${criticalSamples.length} critical samples match registered nodes/antennas.`);

  console.log('\nALL 5 TESTS PASSED SUCCESSFULLY! 100% VERIFIED.\n');
})();

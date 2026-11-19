const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');

console.log('--- TEST 1: Preset routes stop names match nodes.town exactly ---');
const dbPath = path.join(__dirname, '..', '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject', '009a7fc67a701a4f29d4a14ba1c39515cabc0fc7772a46f7de078e80c7f07606.sqlite');
const db = new DatabaseSync(dbPath, { readOnly: true });
const allNodes = db.prepare('SELECT id, town, node_code, lat, lng FROM nodes WHERE deleted_at IS NULL').all();
const allEq = db.prepare('SELECT id, name, lat, lng FROM equipment WHERE deleted_at IS NULL').all();

const presetRoutesCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'js', 'preset-routes.js'), 'utf8');

const ctx = {
  window: {
    state: {
      nodes: allNodes,
      equipment: allEq,
      workOrders: []
    }
  },
  console: console,
  document: { addEventListener: () => {} }
};
vm.createContext(ctx);
vm.runInContext(presetRoutesCode, ctx);

// Test exact matching priority in findSystemLocationMatch
const ameyaltepecMatch = ctx.window.findSystemLocationMatch('Ameyaltepec');
assert.strictEqual(ameyaltepecMatch.town, 'AMEYALTEPEC', 'Ameyaltepec must match AMEYALTEPEC, not ALTEPEC');
console.log('✓ Ameyaltepec matches AMEYALTEPEC correctly');

const altepecMatch = ctx.window.findSystemLocationMatch('Altepec');
assert.strictEqual(altepecMatch.town, 'ALTEPEC', 'Altepec must match ALTEPEC');
console.log('✓ Altepec matches ALTEPEC correctly');

// Check all preset routes
const routes = ctx.window.getAllPresetRoutes();
let totalStops = 0;
let matchedTownStops = 0;
routes.forEach(r => {
  r.stops.forEach(s => {
    totalStops++;
    const m = ctx.window.findSystemLocationMatch(s);
    if (m && m.type === 'node') {
      matchedTownStops++;
      assert.strictEqual(s, m.town, `Stop "${s}" must match registered node town "${m.town}"`);
    }
  });
});
console.log(`✓ All ${matchedTownStops} town stops in preset routes match registered node.town exactly!`);

console.log('\n--- TEST 2: Work orders with status "no_realizado" visible to technician with note ---');
const tecnicoRutaCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'js', 'tecnico-ruta.js'), 'utf8');

const dummyStop = {
  id: 'stop_1',
  name: 'AMEYALTEPEC',
  town: 'AMEYALTEPEC',
  nodeId: 'ndmqwlxfto8s5',
  equipmentId: '',
  detailIds: ['order_not_done', 'order_done'],
  adminReleasedAt: null
};

const dummyWorkOrders = [
  {
    id: 'order_not_done',
    status: 'no_realizado',
    nodeId: 'ndmqwlxfto8s5',
    title: 'Falla de enlace antena cliente',
    clientName: 'Juan Perez',
    clientPhone: '7471234567',
    technicianReport: {
      reason: 'Cliente no se encontraba en su domicilio',
      completedAt: new Date().toISOString()
    }
  },
  {
    id: 'order_done',
    status: 'completada',
    nodeId: 'ndmqwlxfto8s5',
    title: 'Instalación completada',
    clientName: 'Maria Lopez',
    technicianReport: {
      solution: 'Instalación exitosa',
      completedAt: new Date().toISOString()
    }
  }
];

const ctxTech = {
  window: {},
  document: {
    addEventListener: () => {},
    getElementById: () => null,
    querySelectorAll: () => []
  },
  console: console,
  state: {
    nodes: allNodes,
    equipment: allEq,
    workOrders: dummyWorkOrders
  },
  escapeTech: str => String(str || ''),
  formatTechDateTime: d => String(d || ''),
  rById: () => ({ n: 'Centro' }),
  openTowerMaterialModal: () => {},
  openTechDetailReport: () => {},
  scrollTechElementIntoView: () => {},
  sortDetailsByPriority: arr => arr,
  wasTechDetailResolvedDuringStop: () => false,
  getStopProgressForTech: () => ({ total: 1, done: 0 }),
  getTechStopStatus: () => 'pendiente',
  getVisibleTechStopNotes: () => '',
  getTechStopCurrentPosition: () => ({ lat: 17.5, lng: -99.5 }),
  safeFloat: v => parseFloat(v) || 0,
  pc: () => '#ffaa00',
  pl: () => 'Media'
};
vm.createContext(ctxTech);
vm.runInContext(tecnicoRutaCode, ctxTech);

const detailsForTech = ctxTech.window.getStopDetailsForTech(dummyStop);
const notDoneFound = detailsForTech.find(d => d.id === 'order_not_done');
assert.ok(notDoneFound, 'Order marked no_realizado must be returned in getStopDetailsForTech');
console.log('✓ getStopDetailsForTech includes no_realizado detail');

const renderedCard = ctxTech.window.renderTechStop(dummyStop, 'general', 0);
assert.ok(renderedCard.includes('No realizado'), 'Rendered card must include No realizado status');
assert.ok(renderedCard.includes('Cliente no se encontraba en su domicilio'), 'Rendered card must include reason for no realizado');
assert.ok(renderedCard.includes('Terminar detalle'), 'Rendered card must include button to finish detail');
console.log('✓ renderTechStop displays "No realizado" badge, reason note, and "Terminar detalle" action');

console.log('\n--- TEST 3: planificar.js isPendingPlanDetail keeps no_realizado visible ---');
const planificarCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'js', 'planificar.js'), 'utf8');

const ctxPlan = {
  window: { location: { search: '' }, addEventListener: () => {} },
  document: {
    body: { classList: { contains: () => false, add: () => {}, remove: () => {} }, dataset: {} },
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener: () => {}
  },
  console: console,
  state: {
    nodes: allNodes,
    equipment: allEq,
    workOrders: dummyWorkOrders
  }
};
vm.createContext(ctxPlan);
vm.runInContext(planificarCode, ctxPlan);

assert.ok(planificarCode.includes("function isPendingPlanDetail(detail) {\n    return detail && !detail.deletedAt && !['completada', 'eliminada'].includes(detail.status || '');\n}"), 'isPendingPlanDetail must not exclude no_realizado');
console.log('✓ isPendingPlanDetail in planificar.js includes no_realizado as pending');

console.log('\nALL TESTS PASSED!');

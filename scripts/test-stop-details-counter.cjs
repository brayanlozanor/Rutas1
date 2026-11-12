/**
 * Test stop registered details counter and badge integration
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Read preset-routes.js
const presetRoutesPath = path.join(__dirname, '../public/assets/js/preset-routes.js');
const presetRoutesCode = fs.readFileSync(presetRoutesPath, 'utf8');

// Set up mock window and document environment
const mockState = {
  equipment: [
    { id: 'eq-1', name: 'Antena Chilpancingo Centro', sector: 'Centro', lat: 17.55, lng: -99.50 },
    { id: 'eq-2', name: 'Antena Iguala Norte', sector: 'Norte', lat: 18.34, lng: -99.54 }
  ],
  nodes: [
    { id: 'node-1', name: 'Xochipala', zone: 'Centro', equipmentId: 'eq-1', lat: 17.60, lng: -99.60 },
    { id: 'node-2', name: 'Venta Vieja', zone: 'Centro', equipmentId: 'eq-1', lat: 17.65, lng: -99.62 },
    { id: 'node-3', name: 'Palula', zone: 'Norte', equipmentId: 'eq-2', lat: 18.25, lng: -99.50 }
  ],
  workOrders: [
    // Details on eq-1
    { id: 'wo-1', title: 'Fallo enlace Chilpancingo', equipmentId: 'eq-1', status: 'PENDIENTE' },
    // Detail on node-1 (linked to eq-1)
    { id: 'wo-2', title: 'Revisión fibra Xochipala', nodeId: 'node-1', status: 'EN_PROCESO' },
    // Detail on node-2 (linked to eq-1)
    { id: 'wo-3', title: 'Corte energía Venta Vieja', nodeName: 'Venta Vieja', status: 'PENDIENTE' },
    // Deleted detail (should be excluded)
    { id: 'wo-del', title: 'Detalle viejo', equipmentId: 'eq-1', deletedAt: '2026-10-01T00:00:00Z' },
    // Detail on eq-2
    { id: 'wo-4', title: 'Alineación Iguala Norte', equipmentId: 'eq-2', status: 'PENDIENTE' }
  ],
  weekPlan: {
    '__shared_plan__': {
      _generalPlans: []
    }
  }
};

const window = {
  state: mockState,
  getEquipmentLinkedNodeIds: function (eqId) {
    return (mockState.nodes || []).filter(n => n.equipmentId === eqId).map(n => n.id);
  },
  getNodeLinkedEquipment: function (nodeId) {
    const node = (mockState.nodes || []).find(n => n.id === nodeId);
    if (!node || !node.equipmentId) return [];
    return (mockState.equipment || []).filter(e => e.id === node.equipmentId);
  },
  userHasRole: function () {
    return true;
  }
};

global.window = window;
global.state = mockState;
global.getEquipmentLinkedNodeIds = window.getEquipmentLinkedNodeIds;
global.getNodeLinkedEquipment = window.getNodeLinkedEquipment;
global.userHasRole = window.userHasRole;

// Evaluate preset-routes.js in this sandbox
eval(presetRoutesCode);

console.log('--- Testing Stop Registered Details Counter ---');

// 1. Test getStopRegisteredDetails directly
const eq1Details = window.getStopRegisteredDetails('Antena Chilpancingo Centro');
console.log('Antena Chilpancingo Centro details count:', eq1Details.length);
assert.strictEqual(eq1Details.length, 3, 'Should find 3 details: wo-1 (direct eq), wo-2 (node-1), wo-3 (node-2)');
assert.ok(eq1Details.some(d => d.id === 'wo-1'), 'Contains wo-1');
assert.ok(eq1Details.some(d => d.id === 'wo-2'), 'Contains wo-2');
assert.ok(eq1Details.some(d => d.id === 'wo-3'), 'Contains wo-3');
assert.ok(!eq1Details.some(d => d.id === 'wo-del'), 'Excludes deleted work order');

// Test node stop: Xochipala
const xochipalaDetails = window.getStopRegisteredDetails('Xochipala');
console.log('Xochipala details count:', xochipalaDetails.length);
assert.strictEqual(xochipalaDetails.length, 3, 'Node Xochipala resolves its antenna and linked nodes: 3 details');

// Test Palula (node-3 linked to eq-2)
const palulaDetails = window.getStopRegisteredDetails('Palula');
console.log('Palula details count:', palulaDetails.length);
assert.strictEqual(palulaDetails.length, 1, 'Palula should have 1 detail (wo-4)');

// Test stop with no details
const emptyDetails = window.getStopRegisteredDetails('Pueblo Sin Detalle Desconocido');
console.log('Unknown stop details count:', emptyDetails.length);
assert.strictEqual(emptyDetails.length, 0, 'Unknown stop should return empty array');

// 2. Test getRouteTotalRegisteredDetails
const mockRoute = {
  id: 'test-route',
  name: 'Ruta Prueba Centro',
  category: 'CHILPANCINGO / CENTRO',
  stops: ['Antena Chilpancingo Centro', 'Xochipala', 'Venta Vieja']
};

const routeDetails = window.getRouteTotalRegisteredDetails(mockRoute);
console.log('Route total unique details:', routeDetails.length);
assert.strictEqual(routeDetails.length, 3, 'Total unique details across stops should be 3 without duplicates');

// 3. Test CSS file contains all required classes
const cssPath = path.join(__dirname, '../public/assets/css/preset-routes.css');
const cssCode = fs.readFileSync(cssPath, 'utf8');

assert.ok(cssCode.includes('.preset-details-badge'), 'CSS must include .preset-details-badge');
assert.ok(cssCode.includes('.preset-details-badge.has-details'), 'CSS must include .preset-details-badge.has-details');
assert.ok(cssCode.includes('.preset-details-badge.zero-details'), 'CSS must include .preset-details-badge.zero-details');
assert.ok(cssCode.includes('.preset-stop-details-badge'), 'CSS must include .preset-stop-details-badge');
assert.ok(cssCode.includes('.preset-stop-details-badge.has-details'), 'CSS must include .preset-stop-details-badge.has-details');
assert.ok(cssCode.includes('.preset-stop-details-badge.zero-details'), 'CSS must include .preset-stop-details-badge.zero-details');
assert.ok(cssCode.includes('.continuation-title-group'), 'CSS must include .continuation-title-group');
assert.ok(cssCode.includes('.continuation-details-badge'), 'CSS must include .continuation-details-badge');
assert.ok(cssCode.includes('.preset-confirm-badge.badge-has-det'), 'CSS must include .preset-confirm-badge.badge-has-det');
assert.ok(cssCode.includes('.preset-confirm-badge.badge-zero-det'), 'CSS must include .preset-confirm-badge.badge-zero-det');

console.log('✓ All counter logic and CSS assertions passed successfully!');


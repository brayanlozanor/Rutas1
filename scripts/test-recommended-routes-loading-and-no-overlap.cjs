/**
 * Test: Recommended Routes Loading Animation & Card No-Overlap Fix
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const presetRoutesJsPath = path.join(__dirname, '../public/assets/js/preset-routes.js');
const presetRoutesCssPath = path.join(__dirname, '../public/assets/css/preset-routes.css');

const jsCode = fs.readFileSync(presetRoutesJsPath, 'utf8');
const cssCode = fs.readFileSync(presetRoutesCssPath, 'utf8');

console.log('--- Testing Recommended Routes Loading Animation & No-Overlap CSS ---');

// 1. Verify CSS rules for card layout and no-overlap
console.log('1. Checking CSS rules for grid and card auto-sizing...');
assert(cssCode.includes('.preset-routes-body {'), 'preset-routes.css must style .preset-routes-body');
assert(cssCode.includes('grid-auto-rows: auto !important;'), 'preset-routes-body must use grid-auto-rows: auto to allow cards to expand naturally');
assert(!cssCode.includes('grid-auto-rows: minmax(390px, auto) !important;'), 'preset-routes-body must NOT constrain grid-auto-rows to 390px');
assert(cssCode.includes('align-items: stretch !important;'), 'preset-routes-body must stretch items in the same row');

assert(cssCode.includes('.preset-route-card {'), 'preset-routes.css must style .preset-route-card');
assert(cssCode.includes('height: auto !important;'), 'preset-route-card must have height: auto so content does not overflow over lower cards');
assert(cssCode.includes('min-height: 380px !important;'), 'preset-route-card must have min-height: 380px for visual consistency');
assert(!cssCode.includes('min-height: 380px !important;\n  height: 100% !important;'), 'preset-route-card must NOT force height: 100%');

assert(cssCode.includes('.continuation-stops {'), 'preset-routes.css must style .continuation-stops');
assert(cssCode.includes('max-height: 120px !important;'), 'continuation-stops must set max-height to handle large continuations');
assert(cssCode.includes('overflow-y: auto !important;'), 'continuation-stops must scroll if there are many stops');

assert(cssCode.includes('.preset-card-actions {'), 'preset-routes.css must style .preset-card-actions');
assert(cssCode.includes('flex-shrink: 0 !important;'), 'preset-card-actions must have flex-shrink: 0 to prevent squishing');
console.log('✓ Item 1 Passed: Grid and card CSS rules verified - no overlapping.');

// 2. Verify loading animation markup & styles
console.log('2. Checking loading spinner animation styles and markup...');
assert(cssCode.includes('.preset-loading-container {'), 'preset-routes.css must define .preset-loading-container');
assert(cssCode.includes('.preset-loading-spinner {'), 'preset-routes.css must define .preset-loading-spinner');
assert(cssCode.includes('@keyframes preset-spin {'), 'preset-routes.css must define @keyframes preset-spin animation');

assert(jsCode.includes('preset-loading-container'), 'openPresetRoutesModal must display preset-loading-container');
assert(jsCode.includes('preset-loading-spinner'), 'openPresetRoutesModal must display preset-loading-spinner');
assert(jsCode.includes('Cargando catálogo de rutas'), 'openPresetRoutesModal must display loading message');
assert(jsCode.includes('setTimeout('), 'openPresetRoutesModal must yield execution thread with setTimeout for immediate paint');
console.log('✓ Item 2 Passed: Loading animation spinner and deferred render verified.');

// 3. Verify caching mechanism for high performance
console.log('3. Checking performance caching in getStopRegisteredDetails...');
assert(jsCode.includes('const stopDetailsCache = new Map();'), 'preset-routes.js must implement stopDetailsCache');
assert(jsCode.includes('stopDetailsCache.get(targetNorm)'), 'preset-routes.js must return cached results on hit');
assert(jsCode.includes('stopDetailsCache.set(targetNorm, matchedOrders)'), 'preset-routes.js must store computed results in cache');
console.log('✓ Item 3 Passed: Cache implementation verified.');

// 4. Test execution in simulated DOM environment
console.log('4. Running simulated catalog render in DOM environment...');
const mockState = {
  equipment: [
    { id: 'eq-1', name: 'Antena Cerros', linkedNodeIds: ['nod-1'] },
    { id: 'eq-2', name: 'Antena San Marcos', linkedNodeIds: ['nod-2'] }
  ],
  nodes: [
    { id: 'nod-1', name: 'Rancho Nuevo', equipmentId: 'eq-1' },
    { id: 'nod-2', name: 'San Marcos', equipmentId: 'eq-2' }
  ],
  workOrders: [
    { id: 'wo-1', equipmentId: 'eq-1', status: 'pendiente' },
    { id: 'wo-2', nodeId: 'nod-1', status: 'pendiente' }
  ]
};

const domStore = {};
const mockDocument = {
  getElementById: (id) => domStore[id] || null,
  querySelectorAll: () => [],
  createElement: () => ({ style: {} }),
  body: { appendChild: () => {}, insertAdjacentHTML: () => {} }
};

const mockWindow = {
  state: mockState,
  document: mockDocument,
  getEquipmentLinkedNodeIds: (id) => id === 'eq-1' ? ['nod-1'] : [],
  getNodeLinkedEquipment: (id) => id === 'nod-1' ? [{ id: 'eq-1' }] : [],
  userHasRole: () => true
};

global.window = mockWindow;
global.document = mockDocument;
global.state = mockState;
global.getEquipmentLinkedNodeIds = mockWindow.getEquipmentLinkedNodeIds;
global.getNodeLinkedEquipment = mockWindow.getNodeLinkedEquipment;
global.userHasRole = mockWindow.userHasRole;
global.OM = () => {};
global.CM = () => {};

eval(jsCode);

// Container for grid
const gridEl = { innerHTML: '' };
domStore['preset-routes-grid'] = gridEl;
domStore['preset-routes-mo'] = { style: {} };

// Test openPresetRoutesModal: must set loading state
window.openPresetRoutesModal();
assert(gridEl.innerHTML.includes('preset-loading-spinner'), 'openPresetRoutesModal must set loading spinner immediately');

// Run renderPresetRoutesList
window.renderPresetRoutesList();
assert(gridEl.innerHTML.includes('preset-route-card'), 'renderPresetRoutesList must render preset route cards');
assert(gridEl.innerHTML.includes('Ruta Chilpancingo - San Marcos'), 'Catalog must include Ruta Chilpancingo - San Marcos');
assert(gridEl.innerHTML.includes('Continuidad Rancho Nuevo - Santa Elena de la Villa'), 'Must render first continuity');
assert(gridEl.innerHTML.includes('Continuidad Amatal - Moctezuma'), 'Must render second continuity');

console.log('✓ Item 4 Passed: DOM simulation executed successfully without errors.');
console.log('\n--- ALL RECOMMENDED ROUTES LOADING & NO-OVERLAP TESTS PASSED! ---');


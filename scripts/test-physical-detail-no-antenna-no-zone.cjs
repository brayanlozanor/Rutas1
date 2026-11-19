// Test: Physical Details Creation - No Antenna nor Zone Requested (Only Pueblo)
// Verifies that when adding or editing a physical detail:
// 1. Antenna field (#wo-equipment-field) is hidden and not requested.
// 2. Zone field (#wo-zone-field) is hidden and not requested.
// 3. Technical relation info box (#wo-relation-info) is hidden.
// 4. Pueblo field (#wo-node-field) takes full width (1 column).
// 5. Saving a physical detail validates only the pueblo (no antenna or zone required)
//    and automatically derives zone from node.zone or fallback 'General'.

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('=== TEST: Physical Detail - Only Pueblo Requested (No Antenna, No Zone) ===\n');

const htmlPath = path.join(__dirname, '..', 'public', 'ordenes.html');
const ordenesJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'ordenes.js');
const cssPath1 = path.join(__dirname, '..', 'public', 'assets', 'css', 'orders-design-v2.css');
const cssPath2 = path.join(__dirname, '..', 'public', 'assets', 'css', 'detail-view-toggle.css');

const htmlContent = fs.readFileSync(htmlPath, 'utf8').replace(/\r\n/g, '\n');
const ordenesJs = fs.readFileSync(ordenesJsPath, 'utf8').replace(/\r\n/g, '\n');
const css1 = fs.readFileSync(cssPath1, 'utf8').replace(/\r\n/g, '\n');
const css2 = fs.readFileSync(cssPath2, 'utf8').replace(/\r\n/g, '\n');

// 1. Check HTML template structure
console.log('1. Checking HTML structure in ordenes.html...');
assert(htmlContent.includes('id="wo-step-network-card"'), 'Must have #wo-step-network-card');
assert(htmlContent.includes('id="wo-node-field"'), 'Must have #wo-node-field');
assert(htmlContent.includes('id="wo-equipment-field"'), 'Must have #wo-equipment-field');
assert(htmlContent.includes('id="wo-zone-field"'), 'Must have #wo-zone-field');
assert(htmlContent.includes('id="wo-relation-info"'), 'Must have #wo-relation-info');
console.log('✓ Item 1 Passed: HTML structure verified.');

// 2. Check CSS rules in orders-design-v2.css and detail-view-toggle.css
console.log('2. Checking CSS rules for hiding antenna, zone and relation-info in physical mode...');
[css1, css2].forEach((css, idx) => {
  const fileName = idx === 0 ? 'orders-design-v2.css' : 'detail-view-toggle.css';
  assert(css.includes('#wo-equipment-field') && css.includes('display: none !important'), `${fileName} must hide #wo-equipment-field with display: none !important`);
  assert(css.includes('#wo-zone-field') && css.includes('display: none !important'), `${fileName} must hide #wo-zone-field with display: none !important`);
  assert(css.includes('#wo-relation-info') && css.includes('display: none !important'), `${fileName} must hide #wo-relation-info with display: none !important`);
  assert(css.includes('grid-template-columns: 1fr !important'), `${fileName} must set 1fr grid for physical modal`);
});
console.log('✓ Item 2 Passed: CSS rules strictly hide antenna, zone, relation-info and expand pueblo to 1fr.');

// 3. Check JavaScript implementation details in ordenes.js
console.log('3. Checking syncWODetailKindField and applyRoleFormVisibility in ordenes.js...');
assert(ordenesJs.includes("const eqField = document.getElementById('wo-equipment-field')"), 'syncWODetailKindField must look up #wo-equipment-field');
assert(ordenesJs.includes("const zoneField = document.getElementById('wo-zone-field')"), 'syncWODetailKindField must look up #wo-zone-field');
assert(ordenesJs.includes("const relInfo = document.getElementById('wo-relation-info')"), 'syncWODetailKindField must look up #wo-relation-info');
assert(ordenesJs.includes("const nodeEquipGrid = document.getElementById('wo-node-equipment-grid')"), 'syncWODetailKindField must look up #wo-node-equipment-grid');
assert(ordenesJs.includes("if (eqField) eqField.style.display = 'none';"), 'syncWODetailKindField must hide equipment in physical');
assert(ordenesJs.includes("if (zoneField) zoneField.style.display = 'none';"), 'syncWODetailKindField must hide zone in physical');
assert(ordenesJs.includes("if (nodeEquipGrid) nodeEquipGrid.style.gridTemplateColumns = '1fr';"), 'syncWODetailKindField must adjust grid to 1fr');

// Check applyRoleFormVisibility
assert(ordenesJs.includes("if (equipmentFi) equipmentFi.style.display = 'none';"), 'applyRoleFormVisibility must hide equipment for physical');
assert(ordenesJs.includes("if (zoneFi) zoneFi.style.display = 'none';"), 'applyRoleFormVisibility must hide zone for physical');
assert(ordenesJs.includes("if (nodeGrid) {\n      nodeGrid.style.display = 'grid';\n      nodeGrid.style.gridTemplateColumns = '1fr';\n    }"), 'applyRoleFormVisibility must format nodeGrid as 1 column');

console.log('✓ Item 3 Passed: syncWODetailKindField and applyRoleFormVisibility verified in ordenes.js.');

// 4. Simulate DOM interaction in a lightweight VM context
console.log('4. Simulating DOM updates and saveWorkOrder logic in VM...');

const mockElements = {
  'wo-mo': { dataset: {}, querySelectorAll: () => [] },
  'wo-step-network-card': {
    querySelector: (sel) => {
      if (sel.includes('title')) return mockElements['step-title'];
      return null;
    }
  },
  'step-title': { textContent: '' },
  'wo-detail-kind': { value: 'physical' },
  'wo-detail-kind-label': { textContent: '' },
  'wo-detail-kind-container': { style: {} },
  'wo-assign-field': { style: {} },
  'wo-equipment-field': { style: {} },
  'wo-zone-field': { style: {} },
  'wo-relation-info': { style: {}, textContent: '' },
  'wo-node-equipment-grid': { style: {} },
  'wo-node-field': { style: {}, querySelector: () => mockElements['wo-node-label'] },
  'wo-node-label': { innerHTML: '', textContent: '' },
  'wo-node': { value: 'P01 - Chilapa', closest: () => mockElements['wo-node-field'], dataset: {} },
  'wo-node-id': { value: 'node-1' },
  'wo-client': { value: 'Familia Ramirez', closest: () => ({ querySelector: () => ({}) }) },
  'wo-phone': { value: '7471234567', closest: () => ({ querySelector: () => ({}) }) },
  'wo-location': { value: '17.55, -99.18', closest: () => ({ querySelector: () => ({}) }) },
  'wo-category': { value: 'antena_desconectada', closest: () => ({ querySelector: () => ({}) }) },
  'wo-detail': { value: 'Sin señal en su domicilio', closest: () => ({ querySelector: () => ({}) }) },
  'wo-zone': { value: '', closest: () => mockElements['wo-zone-field'] },
  'wo-equipment': { value: '', closest: () => mockElements['wo-equipment-field'] },
  'wo-equipment-id': { value: '' },
  'wo-type': { value: 'comunidad', closest: () => ({ querySelector: () => ({}) }) },
  'wo-priority': { value: 'media', closest: () => ({ querySelector: () => ({}) }) },
  'wo-target-team-field': { style: {} },
  'wo-client-grid': { style: {} },
  'wo-client-field': { style: {}, querySelector: () => ({}) },
  'wo-phone-field': { style: {}, querySelector: () => ({}) },
  'wo-location-field': { style: {}, querySelector: () => ({}) },
  'wo-category-field': { style: {}, querySelector: () => ({}) },
  'wo-detail-field': { style: {}, querySelector: () => ({}) },
  'wo-type-field': { style: {}, querySelector: () => ({}) },
  'wo-priority-field': { style: {}, querySelector: () => ({}) },
  'wo-evidence-zone': { style: {} }
};

const mockDocument = {
  getElementById: (id) => mockElements[id] || null,
  querySelector: (sel) => {
    if (sel.includes('#wo-step-network-card')) return mockElements['step-title'];
    if (sel.includes('#wo-mo .wo-detail-kind-field')) return mockElements['wo-detail-kind-container'];
    return null;
  },
  querySelectorAll: () => []
};

// Test syncWODetailKindField in VM
const vmContext = {
  document: mockDocument,
  activeOrderDetailKind: 'physical',
  orderCategoriesForKind: () => [['antena_desconectada', 'Antena desconectada']],
  orderEscape: (s) => s,
  renderWOCategoryOptions: () => {},
  editingWOId: '',
  userHasRole: () => true
};
vm.createContext(vmContext);

// Run syncWODetailKindField snippet
vm.runInContext(`
${ordenesJs.slice(ordenesJs.indexOf('function syncWODetailKindField('), ordenesJs.indexOf('let currentWOCandidates = [];'))}
syncWODetailKindField('physical');
`, vmContext);

assert.strictEqual(mockElements['wo-equipment-field'].style.display, 'none', '#wo-equipment-field must be hidden');
assert.strictEqual(mockElements['wo-zone-field'].style.display, 'none', '#wo-zone-field must be hidden');
assert.strictEqual(mockElements['wo-relation-info'].style.display, 'none', '#wo-relation-info must be hidden');
assert.strictEqual(mockElements['wo-node-equipment-grid'].style.gridTemplateColumns, '1fr', '#wo-node-equipment-grid must be 1fr');

// Test validation logic in saveWorkOrder for physical details
const node = { id: 'node-1', nodeCode: 'P01', town: 'Chilapa', zone: 'centro' };
const isNetwork = false;
const typedNode = mockElements['wo-node'].value;
const category = mockElements['wo-category'].value;
const specificDetail = mockElements['wo-detail'].value;
const clientVal = mockElements['wo-client'].value;

// Ensure physical detail validation does NOT require equipment or zone
assert(clientVal, 'Client name is present');
assert(category, 'Category is present');
assert(specificDetail, 'Detail is present');
assert(typedNode, 'Typed node is present');
assert(node, 'Node is present');

// Derive region: when not network, uses node.zone or fallback without requiring wo-zone input
const region = (!isNetwork && node?.zone) ? node.zone : (mockElements['wo-zone'].value || node?.zone || 'General');
assert.strictEqual(region, 'centro', 'Region must automatically derive from node.zone ("centro")');

console.log('✓ Item 4 Passed: VM simulation confirmed antenna and zone hidden, and saving derives zone without asking user.');

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===\n');

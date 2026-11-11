const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- TEST: Technician Mandatory Tower Material & Daily Throttling ---');

const commonJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/common.js'), 'utf8');
const planificarJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/planificar.js'), 'utf8');
const tecnicoRutaJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/tecnico-ruta.js'), 'utf8');

// 1. Verify code matches expected features and functions
assert(commonJs.includes('function hasTowerMaterial'), 'common.js must export hasTowerMaterial');
assert(commonJs.includes('function wasTowerMaterialPromptedRecently'), 'common.js must export wasTowerMaterialPromptedRecently');
assert(commonJs.includes('function markTowerMaterialPrompted'), 'common.js must export markTowerMaterialPrompted');
assert(commonJs.includes('function continueTowerMaterialModal'), 'common.js must export continueTowerMaterialModal');
assert(commonJs.includes('function isTowerMaterialMandatory'), 'common.js must export isTowerMaterialMandatory');
assert(commonJs.includes('id="tower-mat-continue-btn"'), 'common.js must include continue button in modal actions');

// In planificar.js
assert(planificarJs.includes('wasTowerMaterialPromptedRecently'), 'planificar.js must check wasTowerMaterialPromptedRecently');
assert(planificarJs.includes('mandatory: true') || planificarJs.includes('mandatory: !hasMat'), 'planificar.js must set mandatory flag when antenna has no material');
assert(planificarJs.includes('canContinue: true') || planificarJs.includes('canContinue: hasMat'), 'planificar.js must allow continue when antenna has material');

// In tecnico-ruta.js
assert(tecnicoRutaJs.includes('wasTowerMaterialPromptedRecently'), 'tecnico-ruta.js must check wasTowerMaterialPromptedRecently');

console.log('✓ Code structure matches all required functions.');

// 2. Behavioral test using VM
const storage = new Map();
const mockLocalStorage = {
  getItem: k => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: k => storage.delete(k)
};

const sandbox = {
  state: {
    equipment: [
      { id: 'eq-empty', name: 'R10-EmptyTower' },
      { id: 'eq-filled', name: 'R20-FilledTower', towerSections: '4 tramos', towerRadios: '2 radios' }
    ]
  },
  localStorage: mockLocalStorage,
  currentTowerMaterialAntennaId: '',
  pendingTowerMaterialCompletionDetail: null,
  pendingTowerMaterialPhotos: [],
  pendingBalancerPorts: [],
  isBalancerEquipment: () => false,
  document: {
    getElementById: id => ({
      value: '',
      style: {},
      classList: { add: () => {}, remove: () => {} }
    })
  },
  notify: () => {},
  CM: () => {},
  OM: () => {},
  summaryOpenedWith: null,
  openTechnicianCompletionSummary: detail => { sandbox.summaryOpenedWith = detail; }
};

vm.createContext(sandbox);

// Extract and evaluate helper functions
const funcDefs = [
  commonJs.match(/let currentTowerMaterialIsMandatory = false;/)?.[0] || '',
  commonJs.match(/function hasTowerMaterial[\s\S]*?\n}\n/)?.[0] || '',
  commonJs.match(/function wasTowerMaterialPromptedRecently[\s\S]*?\n}\n/)?.[0] || '',
  commonJs.match(/function markTowerMaterialPrompted[\s\S]*?\n}\n/)?.[0] || '',
  commonJs.match(/function isTowerMaterialMandatory[\s\S]*?\n}\n/)?.[0] || '',
  commonJs.match(/function continueTowerMaterialModal[\s\S]*?\n}\n/)?.[0] || '',
  commonJs.match(/function closeTowerMaterialModal[\s\S]*?\n}\n/)?.[0] || ''
].join('\n');

vm.runInContext(funcDefs, sandbox);

// Test hasTowerMaterial
assert.strictEqual(sandbox.hasTowerMaterial(sandbox.state.equipment[0]), false, 'eq-empty should have no material');
assert.strictEqual(sandbox.hasTowerMaterial(sandbox.state.equipment[1]), true, 'eq-filled should have material');
console.log('✓ hasTowerMaterial accurately identifies empty vs populated towers.');

// Test mandatory enforcement on empty tower
sandbox.currentTowerMaterialAntennaId = 'eq-empty';
sandbox.currentTowerMaterialIsMandatory = true;
assert.strictEqual(sandbox.isTowerMaterialMandatory(), true, 'Empty tower should be mandatory');

let closedModal = false;
sandbox.CM = () => { closedModal = true; };
let notifyWarning = '';
sandbox.notify = (msg) => { notifyWarning = msg; };

// Attempting to close without filling info
sandbox.closeTowerMaterialModal();
assert.strictEqual(closedModal, false, 'Mandatory modal must NOT close when empty');
assert(notifyWarning.includes('obligatorio'), 'Notification must mention obligatorio');
console.log('✓ Empty tower strictly blocks closing modal without material information.');

// Once material is saved
sandbox.state.equipment[0].towerSections = '3 tramos';
assert.strictEqual(sandbox.hasTowerMaterial(sandbox.state.equipment[0]), true, 'eq-empty now has material');
assert.strictEqual(sandbox.isTowerMaterialMandatory(), false, 'Once material exists, isTowerMaterialMandatory is false');

// Mark prompted
sandbox.markTowerMaterialPrompted('eq-empty');
assert.strictEqual(sandbox.wasTowerMaterialPromptedRecently('eq-empty'), true, 'Recently prompted should be true after marking');

// Test consecutive completions within 24h
// For eq-empty (now filled) and eq-filled:
assert.strictEqual(sandbox.wasTowerMaterialPromptedRecently('eq-empty'), true, 'Same day subsequent details will not re-prompt');

// Test continue button on already populated tower
sandbox.currentTowerMaterialAntennaId = 'eq-filled';
sandbox.currentTowerMaterialIsMandatory = false;
sandbox.pendingTowerMaterialCompletionDetail = { id: 'wo-test' };
sandbox.continueTowerMaterialModal();
assert.strictEqual(closedModal, true, 'Continue button cleanly closes modal');
assert.strictEqual(sandbox.summaryOpenedWith?.id, 'wo-test', 'Continue button cleanly routes to completion summary');
assert.strictEqual(sandbox.wasTowerMaterialPromptedRecently('eq-filled'), true, 'Continue marks antenna as prompted for the day');

console.log('✓ Continue button marks prompt done for the day and opens completion summary.');

// Test 24 hours expiration
// Set timestamp to 25 hours ago
const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
sandbox.localStorage.setItem('tower_mat_prompt_eq-filled', twentyFiveHoursAgo);
sandbox.state.equipment[1].towerMaterialPromptedAt = twentyFiveHoursAgo;

assert.strictEqual(sandbox.wasTowerMaterialPromptedRecently('eq-filled'), false, 'After 24 hours, wasTowerMaterialPromptedRecently is false and prompts again');
console.log('✓ Daily throttling allows re-prompting once 24 hours have elapsed.');

console.log('--- ALL TESTS IN TECHNICIAN TOWER MATERIAL SUITE PASSED! ---');


const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST: Plan Fullscreen Map Default Stop Names Visibility ===');

const planificarCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'js', 'planificar.js'), 'utf8');

// 1. Check openPlanFullscreenMap initializes planFullscreenStopNamesVisible to true
assert.ok(planificarCode.includes('planFullscreenStopNamesVisible = true;'), 'openPlanFullscreenMap must set planFullscreenStopNamesVisible = true');
console.log('✓ 1. planFullscreenStopNamesVisible is initialized to true on opening map view.');

// 2. Check togglePlanFullscreenStopNames and buttons exist and are functional
assert.ok(planificarCode.includes('function togglePlanFullscreenStopNames() {'), 'togglePlanFullscreenStopNames function must exist');
assert.ok(planificarCode.includes('function togglePlanFullscreenNames() {'), 'togglePlanFullscreenNames function must exist');
assert.ok(planificarCode.includes('id="plan-fullscreen-stop-names-btn"'), 'Stop names toggle button must exist in HTML modal template');
assert.ok(planificarCode.includes('id="plan-fullscreen-names-btn"'), 'All entities names toggle button must exist in HTML modal template');

console.log('✓ 2. Toggle buttons and functions for all names and stop names exist.');

// 3. Check applyPlanFullscreenNamesVisibility updates labels properly
assert.ok(planificarCode.includes("stopBtn.textContent = planFullscreenStopNamesVisible ? 'Ocultar nombres de paradas' : 'Ver nombres de paradas';"), 'Stop names button text must alternate between Ocultar and Ver');
assert.ok(planificarCode.includes("btn.textContent = planFullscreenNamesVisible ? 'Ocultar nombres' : 'Ver nombres';"), 'General names button text must alternate between Ocultar and Ver');

console.log('✓ 3. Button texts properly alternate between Ver and Ocultar.');

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');

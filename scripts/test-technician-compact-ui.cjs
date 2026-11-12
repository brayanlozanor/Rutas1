/**
 * Verification test for compact technician UI:
 * - Reduced emojis across technician planning cards, buttons, weather, and specs
 * - Reduced verbose redundant text (clean stop titles, concise actions, omitted empty placeholders)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- 1. Testing JS Code & Regex Patterns ---');
const jsPath = path.join(__dirname, '../public/assets/js/planificar.js');
const jsCode = fs.readFileSync(jsPath, 'utf8');

// Ensure emojis are not present in key technician UI strings
assert.ok(!jsCode.includes('<span class="tower-btn-icon">🗼</span>'), 'towerHeaderBtn must not have 🗼 emoji');
assert.ok(!jsCode.includes('➕ Registrar como pueblo'), 'canRegisterAsNodeBtn must not have ➕ emoji');
assert.ok(!jsCode.includes('Navegar al pueblo'), 'tech navigation button must be concise Navegar');
assert.ok(!jsCode.includes('notify(\'🗼 Detalle completado'), 'completion notification must not have 🗼 emoji');
assert.ok(!jsCode.includes('Por resolver ('), 'Route overview tabs must use Pendientes instead of Por resolver');

console.log('✓ Code pattern assertions passed!');

console.log('--- 2. Testing getTechnicianStopName concise titles in VM ---');
const sandbox = {
    safeFloat: parseFloat,
    escapeHtml: (s) => String(s || ''),
    escapeAttr: (s) => String(s || ''),
    state: {
        equipment: [{ id: 'eq-1', name: 'C5R222-Zempazulco' }],
        nodes: [{ id: 'nd-1', nodeCode: 'R224', town: 'LA LIMA' }],
        technicians: [{ id: 'tech-1', nombre: 'Nolve' }],
        workOrders: []
    }
};

vm.createContext(sandbox);

// Extract getTechnicianStopName from file
const getTechnicianStopNameMatch = jsCode.match(/function getTechnicianStopName[\s\S]*?\n\}/);
assert.ok(getTechnicianStopNameMatch, 'getTechnicianStopName must be defined');
vm.runInContext(getTechnicianStopNameMatch[0], sandbox);

const eqStop = { id: 's-eq', equipmentId: 'eq-1', type: 'equipment' };
const nodeStop = { id: 's-nd', nodeId: 'nd-1', type: 'node' };
const manualStop = { id: 's-mn', name: 'Campamento Norte', type: 'manual' };

const eqName = sandbox.getTechnicianStopName(eqStop, sandbox.state.equipment[0], null);
const nodeName = sandbox.getTechnicianStopName(nodeStop, null, sandbox.state.nodes[0]);
const manualName = sandbox.getTechnicianStopName(manualStop, null, null);

console.log('Antenna name:', eqName);
console.log('Node name:', nodeName);
console.log('Manual stop name:', manualName);

assert.strictEqual(eqName, 'C5R222-Zempazulco', 'Antenna name should be clean without "Antena de" quotes');
assert.strictEqual(nodeName, 'LA LIMA', 'Node name should be clean town name without "Pueblo" prefix');
assert.strictEqual(manualName, 'Campamento Norte', 'Manual stop name should be clean');

console.log('✓ getTechnicianStopName concise names verified!');

console.log('--- 3. Testing HTML template clean text ---');
const htmlPath = path.join(__dirname, '../public/planificar.html');
const htmlCode = fs.readFileSync(htmlPath, 'utf8');

assert.ok(!htmlCode.includes('🌧️ --% lluvia'), 'HTML must not have 🌧️ emoji');
assert.ok(!htmlCode.includes('💨 -- km/h'), 'HTML must not have 💨 emoji');
assert.ok(!htmlCode.includes('📋 Rutas recomendadas'), 'HTML must not have 📋 emoji in recommended routes button');
assert.ok(!htmlCode.includes('🖱️ Scroll horizontal'), 'HTML must not have 🖱️ emoji in scroll hint');
assert.ok(!htmlCode.includes('💡 O selecciona una ruta'), 'HTML must not have 💡 emoji in preset head');

console.log('✓ HTML emoji reductions verified!');

console.log('=== ALL COMPACT TECHNICIAN UI TESTS PASSED SUCCESSFULLY! ===');


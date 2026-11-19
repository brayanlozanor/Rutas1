const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Testing Towns Coverage Urgency Classification and UI ---');

// 1. Verify CSS styles in plan-ui-v2.css
const cssContent = fs.readFileSync(path.join(__dirname, '../public/assets/css/plan-ui-v2.css'), 'utf8');
assert(cssContent.includes('.town-coverage-badge.urgency-nunca'), 'CSS missing .town-coverage-badge.urgency-nunca');
assert(cssContent.includes('.town-coverage-badge.urgency-critica'), 'CSS missing .town-coverage-badge.urgency-critica');
assert(cssContent.includes('.town-coverage-badge.urgency-alta'), 'CSS missing .town-coverage-badge.urgency-alta');
assert(cssContent.includes('.town-coverage-badge.urgency-media'), 'CSS missing .town-coverage-badge.urgency-media');
assert(cssContent.includes('.town-coverage-badge.urgency-baja'), 'CSS missing .town-coverage-badge.urgency-baja');
assert(cssContent.includes('.town-coverage-card.urgency-nunca'), 'CSS missing .town-coverage-card.urgency-nunca');
assert(cssContent.includes('.town-coverage-card.urgency-critica'), 'CSS missing .town-coverage-card.urgency-critica');
assert(cssContent.includes('.town-coverage-card.urgency-alta'), 'CSS missing .town-coverage-card.urgency-alta');
assert(cssContent.includes('.town-coverage-card.urgency-media'), 'CSS missing .town-coverage-card.urgency-media');
assert(cssContent.includes('.town-coverage-card.urgency-baja'), 'CSS missing .town-coverage-card.urgency-baja');
assert(cssContent.includes('.town-coverage-unattended-wait.urgency-nunca'), 'CSS missing .town-coverage-unattended-wait.urgency-nunca');
assert(cssContent.includes('.towns-coverage-urgency-bar'), 'CSS missing .towns-coverage-urgency-bar');
assert(cssContent.includes('.urgency-filter-pill'), 'CSS missing .urgency-filter-pill');
assert(cssContent.includes('.urgency-filter-pill.pill-nunca.active'), 'CSS missing .urgency-filter-pill.pill-nunca.active');
assert(cssContent.includes('.mini-urgency-tag'), 'CSS missing .mini-urgency-tag');
assert(cssContent.includes('.mini-urgency-tag.tag-nunca'), 'CSS missing .mini-urgency-tag.tag-nunca');
console.log('✓ CSS styles for Nunca atendidos and all 4 urgency levels verified.');

// 2. Read and test planificar.js implementations
const jsContent = fs.readFileSync(path.join(__dirname, '../public/assets/js/planificar.js'), 'utf8');

// Mock browser environment for evaluating the coverage logic
const vm = require('vm');
const window = {
    openTownsCoverageModal: null,
    switchTownsCoverageTab: null,
    setTownsCoverageUrgencyFilter: null,
    renderTownsCoverageSection: null,
    calculateTownCoverageData: null,
    getTownUrgencyInfo: null
};

const sandbox = {
    window,
    document: {
        getElementById: () => null,
        createElement: () => ({ innerHTML: '', appendChild: () => {} }),
        body: { appendChild: () => {} }
    },
    state: { nodes: [], workOrders: [] },
    escapeAttr: (s) => (s ? String(s).replace(/"/g, '&quot;') : ''),
    escapeHtml: (s) => (s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''),
    safeFloat: (n) => parseFloat(n) || 0,
    isTechnicianPlanView: () => false,
    OM: () => {},
    CM: () => {},
    Date: Date,
    Math: Math
};

// Extract coverage functions to evaluate in sandbox
const coverageSectionCode = jsContent.substring(
    jsContent.indexOf('/* ==========================================================================\n   COBERTURA DE PUEBLOS:'),
    jsContent.indexOf('function openWeeklyRouteModal()')
);

vm.createContext(sandbox);
vm.runInContext(coverageSectionCode, sandbox);

const { getTownUrgencyInfo, calculateTownCoverageData } = sandbox;

// 3. Test getTownUrgencyInfo unit logic
console.log('\nTesting getTownUrgencyInfo() thresholds:');
const now = Date.now();
const oneDayMs = 24 * 60 * 60 * 1000;

// Test Especial: Nunca atendido (con detalles registrados y 0 completados)
const itemNunca = {
    isUnattended: true,
    isNeverAttended: true,
    total: 3,
    completed: 0,
    oldestPendingDate: new Date(now - 10 * oneDayMs).toISOString()
};
const infoNunca = getTownUrgencyInfo(itemNunca);
assert.strictEqual(infoNunca.level, 'nunca');
assert.strictEqual(infoNunca.rank, 5);
assert.strictEqual(infoNunca.icon, '⛔');
assert.strictEqual(infoNunca.isNeverAttended, true);
assert.strictEqual(infoNunca.label, 'Nunca atendido');
console.log('✓ Especial Nunca atendido correctly classified as level: "nunca", rank: 5, icon: "⛔"');

// Test Crítica: >= 30 days (con atenciones previas)
const itemCritica = {
    isUnattended: true,
    isNeverAttended: false,
    total: 5,
    completed: 1,
    oldestPendingDate: new Date(now - 35 * oneDayMs).toISOString()
};
const infoCritica = getTownUrgencyInfo(itemCritica);
assert.strictEqual(infoCritica.level, 'critica');
assert.strictEqual(infoCritica.rank, 4);
assert.strictEqual(infoCritica.icon, '🚨');
assert(infoCritica.days >= 35);
console.log('✓ Crítica (35 days) correctly classified as level: "critica", rank: 4, icon: "🚨"');

// Test Alta: 14 to 29 days
const itemAlta = {
    isUnattended: true,
    isNeverAttended: false,
    total: 5,
    completed: 1,
    oldestPendingDate: new Date(now - 20 * oneDayMs).toISOString()
};
const infoAlta = getTownUrgencyInfo(itemAlta);
assert.strictEqual(infoAlta.level, 'alta');
assert.strictEqual(infoAlta.rank, 3);
assert.strictEqual(infoAlta.icon, '⚠️');
assert(infoAlta.days >= 20);
console.log('✓ Alta (20 days) correctly classified as level: "alta", rank: 3, icon: "⚠️"');

// Test Media: 7 to 13 days
const itemMedia = {
    isUnattended: true,
    isNeverAttended: false,
    total: 5,
    completed: 1,
    oldestPendingDate: new Date(now - 10 * oneDayMs).toISOString()
};
const infoMedia = getTownUrgencyInfo(itemMedia);
assert.strictEqual(infoMedia.level, 'media');
assert.strictEqual(infoMedia.rank, 2);
assert.strictEqual(infoMedia.icon, '⏳');
assert(infoMedia.days >= 10);
console.log('✓ Media (10 days) correctly classified as level: "media", rank: 2, icon: "⏳"');

// Test Baja: < 7 days
const itemBaja = {
    isUnattended: true,
    isNeverAttended: false,
    total: 5,
    completed: 1,
    oldestPendingDate: new Date(now - 3 * oneDayMs).toISOString()
};
const infoBaja = getTownUrgencyInfo(itemBaja);
assert.strictEqual(infoBaja.level, 'baja');
assert.strictEqual(infoBaja.rank, 1);
assert.strictEqual(infoBaja.icon, '🔵');
assert(infoBaja.days >= 3);
console.log('✓ Baja (3 days) correctly classified as level: "baja", rank: 1, icon: "🔵"');

// Test covered item: should be null
const itemCovered = {
    isUnattended: false,
    oldestPendingDate: new Date(now - 50 * oneDayMs).toISOString()
};
assert.strictEqual(getTownUrgencyInfo(itemCovered), null);
console.log('✓ Covered town correctly returns null for urgency');

// 4. Test calculateTownCoverageData with mock nodes and work orders
console.log('\nTesting calculateTownCoverageData() urgency attachment:');
sandbox.state.nodes = [
    { id: 'node-0', town: 'Pueblo Vacio', nodeCode: 'V00', zone: 'Norte' }, // Sin detalles
    { id: 'node-1', town: 'Pueblo Nunca Atendido', nodeCode: 'N01', zone: 'Norte' }, // 0 completados, 1 pendiente
    { id: 'node-2', town: 'Pueblo Alta', nodeCode: 'A01', zone: 'Sur' }, // 1 completado, 1 pendiente (18 días)
    { id: 'node-3', town: 'Pueblo Media', nodeCode: 'M01', zone: 'Centro' }, // 1 completado, 1 pendiente (9 días)
    { id: 'node-4', town: 'Pueblo Baja', nodeCode: 'B01', zone: 'Oriente' }, // 1 completado, 1 pendiente (2 días)
    { id: 'node-5', town: 'Pueblo Resuelto', nodeCode: 'R01', zone: 'Poniente' } // 83% completado
];

sandbox.state.workOrders = [
    // node-1: 1 order from 45 days ago pending (0 completed -> Nunca atendido)
    { id: 'w1', nodeId: 'node-1', status: 'pendiente', createdAt: new Date(now - 45 * oneDayMs).toISOString() },
    // node-2: 1 completed, 1 pending from 18 days ago (Alta)
    { id: 'w2_c', nodeId: 'node-2', status: 'completada', updatedAt: new Date(now - 30 * oneDayMs).toISOString() },
    { id: 'w2', nodeId: 'node-2', status: 'pendiente', createdAt: new Date(now - 18 * oneDayMs).toISOString() },
    // node-3: 1 completed, 1 pending from 9 days ago (Media)
    { id: 'w3_c', nodeId: 'node-3', status: 'completada', updatedAt: new Date(now - 30 * oneDayMs).toISOString() },
    { id: 'w3', nodeId: 'node-3', status: 'pendiente', createdAt: new Date(now - 9 * oneDayMs).toISOString() },
    // node-4: 1 completed, 1 pending from 2 days ago (Baja)
    { id: 'w4_c', nodeId: 'node-4', status: 'completada', updatedAt: new Date(now - 30 * oneDayMs).toISOString() },
    { id: 'w4', nodeId: 'node-4', status: 'pendiente', createdAt: new Date(now - 2 * oneDayMs).toISOString() },
    // node-5: 5 orders completed, 1 pending (83% completed)
    { id: 'w5', nodeId: 'node-5', status: 'completada', updatedAt: new Date(now - 1 * oneDayMs).toISOString() },
    { id: 'w6', nodeId: 'node-5', status: 'completada', updatedAt: new Date(now - 2 * oneDayMs).toISOString() },
    { id: 'w7', nodeId: 'node-5', status: 'completada', updatedAt: new Date(now - 3 * oneDayMs).toISOString() },
    { id: 'w8', nodeId: 'node-5', status: 'completada', updatedAt: new Date(now - 4 * oneDayMs).toISOString() },
    { id: 'w9', nodeId: 'node-5', status: 'completada', updatedAt: new Date(now - 5 * oneDayMs).toISOString() },
    { id: 'w10', nodeId: 'node-5', status: 'pendiente', createdAt: new Date(now - 6 * oneDayMs).toISOString() }
];

const coverageResults = sandbox.calculateTownCoverageData();
assert.strictEqual(coverageResults.length, 6);

const n0 = coverageResults.find(t => t.id === 'node-0');
assert(!n0.isUnattended, 'Pueblo Vacio sin detalles no debe estar desatendido');
assert(!n0.isNeverAttended, 'Pueblo Vacio sin detalles no debe marcarse como nunca atendido');
console.log('✓ Pueblo sin detalles registrados (node-0) correctamente excluido de nunca atendidos.');

const n1 = coverageResults.find(t => t.id === 'node-1');
assert(n1.isUnattended);
assert(n1.isNeverAttended, 'node-1 debe ser isNeverAttended');
assert.strictEqual(n1.urgency.level, 'nunca');
assert.strictEqual(n1.urgency.rank, 5);
assert.strictEqual(n1.urgency.icon, '⛔');

const n2 = coverageResults.find(t => t.id === 'node-2');
assert(n2.isUnattended);
assert(!n2.isNeverAttended, 'node-2 tiene 1 completado');
assert.strictEqual(n2.urgency.level, 'alta');
assert.strictEqual(n2.urgency.rank, 3);

const n3 = coverageResults.find(t => t.id === 'node-3');
assert(n3.isUnattended);
assert(!n3.isNeverAttended);
assert.strictEqual(n3.urgency.level, 'media');
assert.strictEqual(n3.urgency.rank, 2);

const n4 = coverageResults.find(t => t.id === 'node-4');
assert(n4.isUnattended);
assert(!n4.isNeverAttended);
assert.strictEqual(n4.urgency.level, 'baja');
assert.strictEqual(n4.urgency.rank, 1);

const n5 = coverageResults.find(t => t.id === 'node-5');
assert(n5.isCovered80);
assert(!n5.isUnattended);
assert.strictEqual(n5.urgency, null);

console.log('✓ All 6 towns computed correct urgency levels and coverage status.');

// 5. Test sorting order: Nunca Atendido (rank 5) > Crítica > Alta > Media > Baja
const unattendedItems = coverageResults.filter(t => t.isUnattended);
unattendedItems.sort((a, b) => {
    const rankA = a.urgency ? a.urgency.rank : 0;
    const rankB = b.urgency ? b.urgency.rank : 0;
    if (rankB !== rankA) return rankB - rankA;
    const timeA = a.oldestPendingDate ? new Date(a.oldestPendingDate).getTime() : 0;
    const timeB = b.oldestPendingDate ? new Date(b.oldestPendingDate).getTime() : 0;
    return timeA - timeB;
});

assert.strictEqual(unattendedItems[0].id, 'node-1', 'First must be Nunca Atendido (rank 5)');
assert.strictEqual(unattendedItems[1].id, 'node-2', 'Second should be Alta');
assert.strictEqual(unattendedItems[2].id, 'node-3', 'Third should be Media');
assert.strictEqual(unattendedItems[3].id, 'node-4', 'Fourth should be Baja');
console.log('✓ Unattended towns correctly sorted with Nunca Atendidos at the top.');

// 6. Test section markup generation
const sectionHtml = sandbox.renderTownsCoverageSection();
assert(sectionHtml.includes('Cobertura y Atención de Pueblos'), 'Missing section title');
assert(sectionHtml.includes('mini-urgency-tag tag-nunca'), 'Missing mini tag for nunca');
assert(sectionHtml.includes('mini-urgency-tag tag-alta'), 'Missing mini tag for alta');
assert(sectionHtml.includes('mini-urgency-tag tag-media'), 'Missing mini tag for media');
assert(sectionHtml.includes('mini-urgency-tag tag-baja'), 'Missing mini tag for baja');
assert(sectionHtml.includes('⛔ 1 Nunca atendidos'), 'Should display count 1 for Nunca atendidos');
assert(sectionHtml.includes('⚠️ 1 Alta'), 'Should display count 1 for Alta');
assert(sectionHtml.includes('⏳ 1 Media'), 'Should display count 1 for Media');
assert(sectionHtml.includes('🔵 1 Baja'), 'Should display count 1 for Baja');
assert(sectionHtml.includes('town-coverage-badge urgency-nunca'), 'Should render urgency-nunca badge');
console.log('✓ Section header mini tags and cards rendered with Nunca atendidos correctly.');

console.log('\n--- ALL TOWNS COVERAGE URGENCY TESTS PASSED! ---');

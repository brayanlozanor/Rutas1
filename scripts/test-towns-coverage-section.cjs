const fs = require('fs');
const path = require('path');
const assert = require('assert');

const baseDir = path.join(__dirname, '..');
const planificarJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/planificar.js'), 'utf8');
const planUiCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/plan-ui-v2.css'), 'utf8');
const planificarHtml = fs.readFileSync(path.join(baseDir, 'public/planificar.html'), 'utf8');

console.log('--- TEST 1: Verificando HTML de planificar.html ---');
assert(planificarHtml.includes('btn-towns-coverage'), 'El botón btn-towns-coverage debe estar en planificar.html');
assert(planificarHtml.includes('openTownsCoverageModal()'), 'El botón debe llamar a openTownsCoverageModal()');
assert(planificarHtml.includes('Cobertura de pueblos'), 'El botón debe tener la etiqueta "Cobertura de pueblos"');
console.log('✓ HTML verificado correctamente.');

console.log('--- TEST 2: Verificando CSS en plan-ui-v2.css ---');
const requiredCssClasses = [
    '.btn.btn-towns-coverage',
    '.towns-coverage-modal',
    '.towns-coverage-head',
    '.towns-coverage-tabs',
    '.towns-coverage-tab-btn',
    '.towns-coverage-tab-count',
    '.towns-coverage-body',
    '.towns-coverage-grid',
    '.town-coverage-card',
    '.town-coverage-badge',
    '.town-coverage-progress-wrap',
    '.town-coverage-unattended-wait',
    '.plan-towns-coverage-section',
    '.plan-towns-coverage-header',
    '.plan-towns-coverage-columns',
    '.plan-towns-col',
    '.plan-towns-cards-list'
];
for (const cls of requiredCssClasses) {
    assert(planUiCss.includes(cls), `CSS debe incluir ${cls}`);
}
console.log('✓ Clases CSS verificadas correctamente.');

console.log('--- TEST 3: Evaluando lógica JavaScript de cobertura ---');

// Mock DOM y contexto global para simular el comportamiento
const sandbox = {
    state: {
        nodes: [
            { id: 'node-1', nodeCode: 'R101', town: 'Pueblo Alto', zone: 'Zona Norte', lat: 17.1, lng: -99.2, mapDetailTotal: 10, mapDetailResolved: 9, mapOldestPendingAt: new Date(Date.now() - 3 * 86400000).toISOString() }, // 90% cubierto (>80%)
            { id: 'node-2', nodeCode: 'R102', town: 'Pueblo Medio', zone: 'Zona Sur', lat: 17.2, lng: -99.3, mapDetailTotal: 10, mapDetailResolved: 5 }, // 50% cubierto
            { id: 'node-3', nodeCode: 'R103', town: 'Pueblo Cero', zone: 'Zona Este', lat: 17.3, lng: -99.4, mapDetailTotal: 0, mapDetailResolved: 0 }, // 0 total
            { id: 'node-4', nodeCode: 'R104', town: 'Pueblo Sin Atencion', zone: 'Zona Oeste', lat: 17.4, lng: -99.5, mapDetailTotal: 4, mapDetailResolved: 0, mapOldestPendingAt: new Date(Date.now() - 14 * 86400000).toISOString() }, // 0 resueltos, 4 pendientes -> Sin atención hace 2 semanas
            { id: 'node-5', nodeCode: 'R105', town: 'Pueblo Perfecto', zone: 'Zona Centro', lat: 17.5, lng: -99.6, mapDetailTotal: 5, mapDetailResolved: 5 }, // 100% cubierto
            { id: 'node-6', nodeCode: 'R106', town: 'Pueblo Engañoso', zone: 'Zona Norte', lat: 17.6, lng: -99.7, mapDetailTotal: 0, mapDetailResolved: 0 } // No completados
        ],
        workOrders: [
            { id: 'wo-1', nodeId: 'node-1', status: 'completada' },
            { id: 'wo-4', nodeId: 'node-4', status: 'pendiente', createdAt: new Date(Date.now() - 14 * 86400000).toISOString() }
        ]
    },
    safeFloat: v => parseFloat(v),
    escapeHtml: str => String(str || ''),
    escapeAttr: str => String(str || '').replace(/"/g, '&quot;'),
    window: {}
};

// Extraer funciones
const vm = require('vm');
const context = vm.createContext(sandbox);

// Script con las funciones bajo prueba
const codeToRun = `
${planificarJs.substring(planificarJs.indexOf('function getTownUrgencyInfo'), planificarJs.indexOf('function ensureTownsCoverageModalMarkup'))}
`;

vm.runInContext(codeToRun, context);

// Probar formatTimeAgoCustom
const timeAgo3Days = context.formatTimeAgoCustom(new Date(Date.now() - 3 * 86400000).toISOString());
assert.strictEqual(timeAgo3Days, 'Hace 3 días', 'Debe formatear 3 días');
const timeAgo2Weeks = context.formatTimeAgoCustom(new Date(Date.now() - 14 * 86400000).toISOString());
assert.strictEqual(timeAgo2Weeks, 'Hace 2 semanas', 'Debe formatear 2 semanas');
console.log('✓ formatTimeAgoCustom funciona:', { timeAgo3Days, timeAgo2Weeks });

// Probar calculateTownCoverageData
const results = context.calculateTownCoverageData();
assert.strictEqual(results.length, 6, 'Debe devolver estadísticas para los 6 nodos');

const covered = results.filter(r => r.isCovered80);
console.log('Pueblos con >80% cubierto:', covered.map(c => `${c.townName} (${c.percentage}%, completados: ${c.completed}/${c.total})`));
assert(covered.some(c => c.townName === 'Pueblo Alto'), 'Pueblo Alto (90%) debe estar cubierto');
assert(covered.some(c => c.townName === 'Pueblo Perfecto'), 'Pueblo Perfecto (100%) debe estar cubierto');
assert(!covered.some(c => c.townName === 'Pueblo Medio'), 'Pueblo Medio (50%) no debe estar en >80%');
assert(!covered.some(c => c.townName === 'Pueblo Cero'), 'Pueblo Cero (0 total) no debe estar en >80% (requiere completados > 0)');
assert(!covered.some(c => c.townName === 'Pueblo Engañoso'), 'Pueblo Engañoso no debe estar en >80%');

const unattended = results.filter(r => r.isUnattended);
console.log('Pueblos sin atención:', unattended.map(u => `${u.townName} (pendientes: ${u.pending}, completados: ${u.completed}, fecha: ${u.oldestPendingDate})`));
assert(unattended.some(u => u.townName === 'Pueblo Sin Atencion'), 'Pueblo Sin Atencion debe estar en sin atención');
assert(!unattended.some(u => u.townName === 'Pueblo Alto'), 'Pueblo Alto no es sin atención');
assert(!unattended.some(u => u.townName === 'Pueblo Cero'), 'Pueblo Cero con 0 pendientes no debe estar en sin atención');

// Probar renderTownsCoverageSection
const html = context.renderTownsCoverageSection();
assert(html.includes('plan-towns-coverage-section'), 'Debe generar el contenedor plan-towns-coverage-section');
assert(html.includes('Cobertura y Atención de Pueblos'), 'Debe contener el título');
assert(html.includes('Pueblo Alto'), 'Debe contener Pueblo Alto');
assert(html.includes('Pueblo Sin Atencion'), 'Debe contener Pueblo Sin Atencion');
assert(html.includes('Hace 2 semanas'), 'Debe mostrar el tiempo en espera de Pueblo Sin Atencion');
console.log('✓ renderTownsCoverageSection generó el HTML esperado correctamente.');

console.log('--- TODOS LOS TESTS PASARON EXITOSAMENTE ---');

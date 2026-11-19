const fs = require('fs');
const path = require('path');
const assert = require('assert');

const baseDir = path.join(__dirname, '..');
const planificarJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/planificar.js'), 'utf8');
const planUiCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/plan-ui-v2.css'), 'utf8');

console.log('--- TEST 1: Verificando CSS de town-coverage-resolved-wait ---');
assert(planUiCss.includes('.town-coverage-resolved-wait'), 'CSS debe incluir .town-coverage-resolved-wait');
console.log('✓ CSS contiene .town-coverage-resolved-wait');

console.log('--- TEST 2: Evaluando lógica JavaScript de último resuelto ---');
const vm = require('vm');
const sandbox = {
    state: {
        nodes: [
            {
                id: 'node-1',
                nodeCode: 'R101',
                town: 'Pueblo Alto',
                zone: 'Zona Norte',
                lat: 17.1,
                lng: -99.2,
                mapDetailTotal: 10,
                mapDetailResolved: 9,
                mapOldestPendingAt: new Date(Date.now() - 3 * 86400000).toISOString(),
                mapLatestResolvedAt: new Date(Date.now() - 2 * 3600000).toISOString() // Resuelto hace 2 horas
            },
            {
                id: 'node-4',
                nodeCode: 'R104',
                town: 'Pueblo Sin Atencion',
                zone: 'Zona Oeste',
                lat: 17.4,
                lng: -99.5,
                mapDetailTotal: 4,
                mapDetailResolved: 0,
                mapOldestPendingAt: new Date(Date.now() - 14 * 86400000).toISOString()
            }
        ],
        workOrders: [
            { id: 'wo-1', nodeId: 'node-1', status: 'completada', updatedAt: new Date(Date.now() - 2 * 3600000).toISOString() },
            { id: 'wo-4', nodeId: 'node-4', status: 'pendiente', createdAt: new Date(Date.now() - 14 * 86400000).toISOString() }
        ]
    },
    safeFloat: v => parseFloat(v),
    escapeHtml: str => String(str || ''),
    escapeAttr: str => String(str || '').replace(/"/g, '&quot;'),
    window: {}
};

const context = vm.createContext(sandbox);
const codeToRun = `
${planificarJs.substring(planificarJs.indexOf('function getTownUrgencyInfo'), planificarJs.indexOf('function ensureTownsCoverageModalMarkup'))}
`;

vm.runInContext(codeToRun, context);

const results = context.calculateTownCoverageData();
const puebloAlto = results.find(r => r.townName === 'Pueblo Alto');
assert(puebloAlto, 'Pueblo Alto debe existir');
assert(puebloAlto.isCovered80, 'Pueblo Alto debe tener >80%');
assert(puebloAlto.latestResolvedDate, 'Pueblo Alto debe tener latestResolvedDate');

const html = context.renderTownsCoverageSection();
assert(html.includes('Último resuelto:'), 'El HTML debe incluir la etiqueta "Último resuelto:"');
assert(html.includes('Hace 2 h'), 'Debe mostrar "Hace 2 h" para Pueblo Alto');
console.log('✓ HTML contiene "Último resuelto: Hace 2 h" para pueblos con >80% cubierto.');

console.log('--- TODOS LOS TESTS DE ÚLTIMO RESUELTO PASARON EXITOSAMENTE ---');

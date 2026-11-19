const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Setup mock browser environment
global.window = global;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};
global.window.matchMedia = () => ({ matches: true });
global.window.scrollTo = () => {};
global.window.setTimeout = setTimeout;
global.window.clearTimeout = clearTimeout;
global.window.setInterval = setInterval;
global.window.clearInterval = clearInterval;
global.document = {
    addEventListener: () => {},
    removeEventListener: () => {},
    body: {
        classList: {
            add: (cls) => global.document.body.classes.add(cls),
            remove: (cls) => global.document.body.classes.delete(cls),
            contains: (cls) => global.document.body.classes.has(cls),
            toggle: (cls, force) => {
                if (force === undefined) {
                    if (global.document.body.classes.has(cls)) global.document.body.classes.delete(cls);
                    else global.document.body.classes.add(cls);
                } else if (force) {
                    global.document.body.classes.add(cls);
                } else {
                    global.document.body.classes.delete(cls);
                }
            }
        },
        dataset: {},
        style: { setProperty: () => {} },
        classes: new Set(),
        insertAdjacentHTML: () => {}
    },
    getElementById: (id) => {
        if (!global._mockElements[id]) {
            global._mockElements[id] = {
                id,
                value: '',
                textContent: '',
                innerHTML: '',
                style: { setProperty: () => {}, display: '' },
                classList: { add: () => {}, remove: () => {}, toggle: () => {} },
                addEventListener: () => {},
                dataset: {},
                focus: () => {},
                remove: () => {},
                closest: () => null,
                appendChild: () => {},
                replaceChild: () => {},
                insertBefore: () => {}
            };
        }
        return global._mockElements[id];
    },
    querySelector: (sel) => {
        return {
            textContent: '',
            style: { setProperty: () => {}, display: '' },
            classList: { add: () => {}, remove: () => {}, toggle: () => {} },
            remove: () => {},
            closest: () => null,
            querySelector: () => null,
            querySelectorAll: () => []
        };
    },
    querySelectorAll: () => []
};
global._mockElements = {};
try {
    Object.defineProperty(global.navigator, 'geolocation', {
        value: {
            getCurrentPosition: (success) => {
                success({ coords: { latitude: 17.2734, longitude: -98.788 } });
            }
        },
        configurable: true
    });
    Object.defineProperty(global.navigator, 'clipboard', {
        value: {
            writeText: async () => true
        },
        configurable: true
    });
} catch (_) {}
global.location = { href: 'http://localhost:8080/planificar.html?view=tecnico', search: '?view=tecnico' };
global.sessionStorage = {
    getItem: () => null,
    setItem: () => {}
};
global.localStorage = {
    getItem: () => null,
    setItem: () => {}
};

// Mock dependencies
global.state = {
    generalPlans: [
        {
            id: 'plan-1',
            name: 'Plan de Prueba Celular',
            assignedTechId: 'tech-1',
            stops: [
                {
                    id: 'stop-1',
                    name: 'Ayutla Centro',
                    scheduledDate: '2026-11-18',
                    detailIds: ['w-1'],
                    details: []
                }
            ]
        }
    ],
    workOrders: [
        {
            id: 'w-1',
            title: 'Instalación de antena cliente Juan',
            clientName: 'Juan Perez',
            clientPhone: '7441234567',
            status: 'pendiente',
            detailKind: 'physical',
            priority: 'media',
            category: 'instalacion',
            visitType: 'instalacion',
            stopId: 'stop-1',
            detailLocation: '17.273400, -98.788000',
            lat: 17.2734,
            lng: -98.788,
            createdAt: new Date().toISOString()
        }
    ],
    equipment: [
        { id: 'eq-1', name: 'Torre Ayutla', region: 'Costa Chica', lat: 17.273, lng: -98.788 }
    ],
    nodes: [
        { id: 'node-1', name: 'Ayutla', town: 'Ayutla', zone: 'Costa Chica', lat: 17.273, lng: -98.788 }
    ],
    technicians: [
        { id: 'tech-1', nombre: 'Carlos Tecnico', usuario: 'carlos' }
    ]
};

global.getCurrentUser = () => ({
    id: 'user-tech-1',
    name: 'Carlos Tecnico',
    username: 'carlos',
    role: 'tecnico'
});
global.userHasRole = (...roles) => roles.includes('tecnico');
global.notify = (msg, tone) => {
    // console.log(`[NOTIFY ${tone || 'info'}]: ${msg}`);
};
global.saveDB = async () => true;
global.OM = (id) => {};
global.CM = (id) => {};
global.escapeHtml = (s) => String(s || '');
global.escapeAttr = (s) => String(s || '');
global.stopActionIcon = () => '✏️';
global.planCategoryLabel = (c) => c;
global.pl = (p) => p;
global.pc = () => '#0284c7';
global.getDetailLocationInfo = () => ({ hasLocation: true, label: '17.27, -98.78', url: '#' });
global.getWorkOrderRequestedText = (d, fb) => d.title || fb;
global.formatPlanDateTime = (d) => String(d || '');
global.getAdminTechReportPhotos = () => [];
global.planEvidenceGalleries = new Map();
global.safeFloat = (v) => parseFloat(v);
global.localDateKey = () => '2026-11-18';
global.formatCalendarDate = () => 'Mié 18 de Nov';
global.parseOptionalLocation = (val) => {
    if (!val) return { location: '', lat: '', lng: '', valid: true, hasLocation: false };
    const parts = val.split(',').map(s => s.trim());
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return { location: `${Number(parts[0]).toFixed(6)}, ${Number(parts[1]).toFixed(6)}`, lat: Number(parts[0]), lng: Number(parts[1]), valid: true, hasLocation: true };
    }
    return { location: val, lat: '', lng: '', valid: true, hasLocation: true };
};
global.setCreatedAudit = (item, act) => { item.createdByName = 'Carlos Tecnico'; };
global.setUpdatedAudit = (item, act) => { item.modifiedByName = 'Carlos Tecnico'; };
global.getNodeLabel = (n) => n?.name || n?.town || 'Pueblo';
global.gid = (p) => `${p}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
global.renderPlan = () => {};
global.renderPlanKpis = () => {};
global.renderPlanDays = () => {};
global.renderPlanMap = () => {};

// Mock normalizeName or load common.js / api.js
global.normalizeName = (str) => String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
global.normalizeRole = (r) => String(r || '').toLowerCase().trim();

// Load planificar.js
const planificarPath = fs.existsSync(path.join(__dirname, '../public/assets/js/planificar.js'))
  ? path.join(__dirname, '../public/assets/js/planificar.js')
  : path.join(__dirname, '../Rutas-main/public/assets/js/planificar.js');
const planificarCode = fs.readFileSync(planificarPath, 'utf8');
eval(planificarCode);

console.log('--- TEST 1: isTechnicianPlanView is true ---');
assert.strictEqual(isTechnicianPlanView(), true, 'isTechnicianPlanView should be true');

console.log('--- TEST 2: getDetailFolio works without ReferenceError ---');
const folio = getDetailFolio(state.workOrders[0]);
assert.ok(folio && typeof folio === 'string', 'getDetailFolio returned valid string');
console.log('Generated folio:', folio);

console.log('--- TEST 3: Technician saving NEW detail via saveTechnicianAddDetail ---');
document.getElementById('tech-add-stop').value = 'stop-1';
document.getElementById('tech-add-client').value = 'Maria Lopez';
document.getElementById('tech-add-phone').value = '7449876543';
document.getElementById('tech-add-type').value = 'instalacion';
document.getElementById('tech-add-priority').value = 'alta';
document.getElementById('tech-add-work').value = 'Instalación de paquete 50MB en domicilio';
document.getElementById('tech-add-notes').value = 'Llevar 30m de cable drop';
document.getElementById('tech-add-location').value = '17.275000, -98.789000';

(async () => {
    await saveTechnicianAddDetail();
    const newDetail = state.workOrders.find(w => w.clientName === 'Maria Lopez');
    assert.ok(newDetail, 'New detail should be in state.workOrders');
    assert.strictEqual(newDetail.status, 'pendiente', 'New detail must be pending');
    assert.strictEqual(newDetail.detailKind, 'physical', 'Must be physical detail');
    assert.strictEqual(newDetail.priority, 'alta', 'Priority must be alta');
    assert.strictEqual(newDetail.clientPhone, '7449876543', 'Phone must match');
    assert.strictEqual(newDetail.stopId, 'stop-1', 'Must link to stop-1');
    assert.ok(state.generalPlans[0].stops[0].detailIds.includes(newDetail.id), 'Stop detailIds must include new detail');
    console.log('Saved new detail:', newDetail.folio, newDetail.clientName, newDetail.title);

    console.log('--- TEST 4: Technician editing pending detail via savePlanDetailEditor ---');
    // Open editor
    openPlanDetailEditor('w-1', 'stop-1');
    document.getElementById('pde-client').value = 'Juan Perez Modificado';
    document.getElementById('pde-phone').value = '7445551234';
    document.getElementById('pde-title').value = 'Instalación modificada de antena cliente Juan';
    document.getElementById('pde-description').value = 'Notas extras actualizadas por tecnico';
    document.getElementById('pde-priority').value = 'muy_alta';
    document.getElementById('pde-location').value = '17.273400, -98.788000';
    document.getElementById('pde-category').value = 'instalacion';
    document.getElementById('pde-type').value = 'instalacion';

    await savePlanDetailEditor('w-1', 'stop-1', '2026-11-18');
    const updated = state.workOrders.find(w => w.id === 'w-1');
    assert.strictEqual(updated.clientName, 'Juan Perez Modificado');
    assert.strictEqual(updated.clientPhone, '7445551234');
    assert.strictEqual(updated.priority, 'muy_alta');
    assert.strictEqual(updated.modifiedByName, 'Carlos Tecnico');
    assert.ok(updated.modifiedAt, 'Must have modifiedAt timestamp');
    console.log('Updated detail verified:', updated.clientName, updated.priority, updated.modifiedByName);

    console.log('--- TEST 5: editPlanDetailFromReport allows technician to edit ---');
    // Clear editor card before calling
    document.getElementById('plan-detail-editor-card').innerHTML = '';
    editPlanDetailFromReport('stop-1', '2026-11-18', 'w-1');
    const editorCardHtml = document.getElementById('plan-detail-editor-card').innerHTML;
    assert.ok(editorCardHtml.includes('Editar detalle pendiente'), 'editPlanDetailFromReport should open the editor without permission errors');
    assert.ok(editorCardHtml.includes('Juan Perez Modificado'), 'Editor must show client name');

    console.log('--- TEST 6: All mobile buttons and actions exist and run ---');
    assert.strictEqual(typeof openTechnicianDetails, 'function');
    assert.strictEqual(typeof openTechnicianRouteMap, 'function');
    assert.strictEqual(typeof openTechnicianAddMenu, 'function');
    assert.strictEqual(typeof openTechnicianProductivitySummary, 'function');
    assert.strictEqual(typeof selectTechnicianAgendaDate, 'function');
    assert.strictEqual(typeof shiftTechnicianAgendaWeek, 'function');
    assert.strictEqual(typeof toggleTechnicianSummaryMode, 'function');
    assert.strictEqual(typeof setTechnicianAddNoPhone, 'function');
    assert.strictEqual(typeof useCurrentTechnicianCoordinatesForAdd, 'function');
    assert.strictEqual(typeof useCurrentTechnicianCoordinatesForEditor, 'function');

    // Call them
    openTechnicianAddMenu();
    openTechnicianAddDetailModal();
    setTechnicianAddNoPhone();
    assert.strictEqual(document.getElementById('tech-add-phone').value, 'No tiene número');

    useCurrentTechnicianCoordinatesForAdd();
    assert.strictEqual(document.getElementById('tech-add-location').value, '17.273400, -98.788000');

    openTechnicianDetails();
    assert.strictEqual(document.body.dataset.techView, 'details');

    openTechnicianRouteMap();
    assert.strictEqual(document.body.dataset.techView, 'map');

    toggleTechnicianSummaryMode();
    assert.strictEqual(global.getTechnicianSummaryMode(), 'general');
    toggleTechnicianSummaryMode();
    assert.strictEqual(global.getTechnicianSummaryMode(), 'day');

    console.log('ALL TESTS PASSED SUCCESSFULLY!');
})();

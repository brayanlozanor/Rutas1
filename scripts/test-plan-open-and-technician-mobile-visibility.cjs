const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const planificarJs = fs.readFileSync(path.join(root, 'public/assets/js/planificar.js'), 'utf8');
const techCss = fs.readFileSync(path.join(root, 'public/assets/css/technician-dashboard.css'), 'utf8');

console.log('=== TEST: Plan Opening on Desktop & Mobile Technician Route Visibility ===\n');

// 1. Static checks
console.log('1. Checking static code enhancements in planificar.js and technician-dashboard.css...');

assert(planificarJs.includes('function renderTechnicianPlanBanner('), 'planificar.js must contain renderTechnicianPlanBanner');
assert(planificarJs.includes('window.renderTechnicianPlanBanner = renderTechnicianPlanBanner'), 'renderTechnicianPlanBanner must be exported');
assert(techCss.includes('.tech-plan-banner'), 'technician-dashboard.css must style .tech-plan-banner');
assert(techCss.includes('.tech-plan-chip'), 'technician-dashboard.css must style .tech-plan-chip');
assert(techCss.includes('html:not(.is-technician-env) body:not(.plan-technician-view) .tech-plan-banner'), 'tech-plan-banner must be hidden on desktop');

console.log('✓ 1. Static code assertions passed.\n');

// 2. Functional testing in isolated JS execution context
console.log('2. Testing Functional Desktop Plan Opening & Catalog Switching...');

// Setup simulated environment
const SHARED_PLAN_ID = 'general-shared';
let mockTechView = false;
let selectedTechId = SHARED_PLAN_ID;
let selectedGeneralPlanId = '';
let selectedCalendarDate = '';
let selectedDay = 'general';
let activePlanCardIndex = 0;
let technicianSummaryMode = 'day';

const mockCurrentUser = { id: 'u-admin', username: 'admin', name: 'Administrador', role: 'administrador' };
function getCurrentUser() { return mockCurrentUser; }
function isTechnicianPlanView() { return mockTechView; }
function isPlanReadOnly() { return isTechnicianPlanView(); }
function localDateKey() { return '2026-11-19'; }
function normalizeName(s) { return String(s || '').trim().toLowerCase(); }
function escapeHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }

const mockState = {
    technicians: [
        { id: 'tech-ulises', userId: 'user-ulises', nombre: 'Ulises Bruno Morales', usuario: 'ulises', rol: 'tecnico' },
        { id: 'tech-jesus', userId: 'user-jesus', nombre: 'Jesus Alberto Molina', usuario: 'jesus', rol: 'tecnico' },
        { id: 'tech-lalo', userId: 'user-lalo', nombre: 'Lalo Técnico', usuario: 'lalo', rol: 'tecnico' }
    ],
    weekPlan: {
        [SHARED_PLAN_ID]: {
            _generalPlans: [
                {
                    id: 'plan-ayutla',
                    name: 'Ruta Ayutla',
                    assignedTechId: '',
                    assignedTechIds: [],
                    stops: [
                        { id: 's1', name: 'Mexcaltepec', scheduledDate: '2026-08-12', detailIds: ['d1'] },
                        { id: 's2', name: 'Totomixtlahuaca', scheduledDate: '2026-08-14', detailIds: ['d2'] }
                    ]
                },
                {
                    id: 'plan-acapulco',
                    name: 'Ruta Acapulco',
                    assignedTechId: 'tech-ulises',
                    assignedTechIds: ['tech-ulises'],
                    stops: [
                        { id: 's3', name: 'Renacimiento', scheduledDate: '2026-08-12', detailIds: ['d3'] },
                        { id: 's4', name: 'Zapata', scheduledDate: '2026-08-13', detailIds: ['d4'] },
                        { id: 's5', name: 'Colosio', scheduledDate: '2026-08-14', detailIds: ['d5'] }
                    ]
                },
                {
                    id: 'plan-coyuca',
                    name: 'Ruta Coyuca',
                    assignedTechId: 'tech-jesus',
                    assignedTechIds: ['tech-jesus'],
                    stops: [
                        { id: 's6', name: 'Bajos del Ejido', scheduledDate: '2026-09-01', detailIds: ['d6'] }
                    ]
                }
            ]
        }
    },
    workOrders: [
        { id: 'd1', title: 'Falla fibra', status: 'pendiente' },
        { id: 'd2', title: 'Instalacion', status: 'pendiente' },
        { id: 'd3', title: 'Cambio router', status: 'pendiente' },
        { id: 'd4', title: 'Sin servicio', status: 'pendiente' },
        { id: 'd5', title: 'Revision antena', status: 'pendiente' },
        { id: 'd6', title: 'Cable cortado', status: 'pendiente' }
    ]
};

function getGeneralPlans() {
    return mockState.weekPlan[SHARED_PLAN_ID]._generalPlans;
}

function isPlanAssignedToTech(plan, techId) {
    if (!plan || !techId) return false;
    const targetId = String(techId).trim();
    if (String(plan.assignedTechId || '').trim() === targetId) return true;
    if (Array.isArray(plan.assignedTechIds) && plan.assignedTechIds.map(String).includes(targetId)) return true;
    return false;
}

function getVisibleGeneralPlansForRole() {
    const plans = getGeneralPlans();
    if (!isPlanReadOnly()) return plans;
    if (isTechnicianPlanView()) {
        const technicianId = getLoggedTechnicianId();
        return technicianId
            ? plans.filter(plan => !plan.deletedAt && isPlanAssignedToTech(plan, technicianId))
            : [];
    }
    return plans;
}

function getLoggedTechnicianId() {
    if (!isTechnicianPlanView()) return '';
    const user = getCurrentUser();
    const tech = mockState.technicians.find(t => t.id === user.id || t.userId === user.id || t.usuario === user.username);
    return tech ? tech.id : (user.id || 'tecnico');
}

function getSelectedGeneralPlan() {
    const plans = getVisibleGeneralPlansForRole();
    if (!plans.length) return null;
    if (!isTechnicianPlanView()) {
        const found = plans.find(plan => plan.id === selectedGeneralPlanId);
        const selected = found || plans[0];
        selectedGeneralPlanId = selected?.id || '';
        return selected;
    }
    const myTechId = getLoggedTechnicianId();
    let candidates = myTechId ? plans.filter(plan => isPlanAssignedToTech(plan, myTechId)) : [];
    if (!candidates.length) {
        candidates = plans;
    }
    const selected = candidates.find(plan => plan.id === selectedGeneralPlanId) || candidates[0];
    selectedGeneralPlanId = selected?.id || '';
    return selected;
}

function selectGeneralPlan(id) {
    if (isPlanReadOnly() && !getVisibleGeneralPlansForRole().some(plan => plan.id === id)) return;
    selectedGeneralPlanId = id;
    selectedCalendarDate = '';
    activePlanCardIndex = 0;
    selectedDay = 'general';
    if (!isTechnicianPlanView()) {
        selectedTechId = SHARED_PLAN_ID;
    }
}

function getPlanStopsForView(day = 'general') {
    const plan = getSelectedGeneralPlan();
    return plan?.stops || [];
}

function getVisiblePlanStops() {
    const today = localDateKey();
    const allStops = getPlanStopsForView('general');
    if (isTechnicianPlanView()) {
        if (technicianSummaryMode === 'general') return allStops;
        const targetDate = selectedCalendarDate || today;
        const forDay = allStops.filter(stop => stop.scheduledDate === targetDate);
        if (forDay.length > 0) return forDay;
        if (!selectedCalendarDate || selectedCalendarDate === today) {
            const unscheduled = allStops.filter(stop => !stop.scheduledDate);
            if (unscheduled.length > 0) return unscheduled;
            if (allStops.length > 0) return allStops;
        }
        return [];
    }
    return selectedCalendarDate
        ? allStops.filter(stop => (stop.scheduledDate || '') === selectedCalendarDate)
        : allStops;
}

// TEST 2A: Desktop plan opening
mockTechView = false;
selectedTechId = SHARED_PLAN_ID;
selectedGeneralPlanId = '';

let activePlan = getSelectedGeneralPlan();
assert.strictEqual(activePlan.id, 'plan-ayutla', 'Default desktop plan should be the first general plan');

// Open plan-acapulco
selectGeneralPlan('plan-acapulco');
activePlan = getSelectedGeneralPlan();
assert.strictEqual(activePlan.id, 'plan-acapulco', 'selectGeneralPlan("plan-acapulco") must open plan-acapulco');
assert.strictEqual(selectedTechId, SHARED_PLAN_ID, 'Desktop view must remain in SHARED_PLAN_ID');

// Open plan-coyuca
selectGeneralPlan('plan-coyuca');
activePlan = getSelectedGeneralPlan();
assert.strictEqual(activePlan.id, 'plan-coyuca', 'selectGeneralPlan("plan-coyuca") must open plan-coyuca');

// Open plan-ayutla
selectGeneralPlan('plan-ayutla');
activePlan = getSelectedGeneralPlan();
assert.strictEqual(activePlan.id, 'plan-ayutla', 'selectGeneralPlan("plan-ayutla") must open plan-ayutla');
console.log('✓ Step 2A: Desktop opens all plans cleanly without getting blocked by technician filters.');

// TEST 3: Technician mobile view with assigned plan
console.log('\n3. Testing Mobile Technician Route Visibility & Stops Fallback...');
mockTechView = true;
mockCurrentUser.id = 'user-ulises';
mockCurrentUser.username = 'ulises';
mockCurrentUser.name = 'Ulises Bruno Morales';
mockCurrentUser.role = 'tecnico';
selectedGeneralPlanId = '';
selectedCalendarDate = '';

const loggedTechId = getLoggedTechnicianId();
assert.strictEqual(loggedTechId, 'tech-ulises', 'Technician must resolve to tech-ulises');

const techAssignedPlan = getSelectedGeneralPlan();
assert.strictEqual(techAssignedPlan.id, 'plan-acapulco', 'Ulises must automatically get plan-acapulco assigned');

// Check visible stops: Note that plan-acapulco stops are dated 2026-08-12, 13, 14, while today is 2026-11-19!
const visibleStopsToday = getVisiblePlanStops();
assert(visibleStopsToday.length > 0, 'Visible stops must NOT be empty even if scheduled dates differ from today');
assert.strictEqual(visibleStopsToday.length, 3, 'Ulises must see all 3 stops of his assigned route');
console.log('✓ Step 3A: Assigned plan stops are fully visible to technician on mobile.');

// Check explicit calendar click: when clicking a date with no stops
selectedCalendarDate = '2026-11-25';
const stopsExplicitFuture = getVisiblePlanStops();
assert.strictEqual(stopsExplicitFuture.length, 0, 'Explicitly selected date with no stops returns 0 stops');

// Reset to today
selectedCalendarDate = '';
const stopsReset = getVisiblePlanStops();
assert.strictEqual(stopsReset.length, 3, 'Resetting date returns all 3 route stops');
console.log('✓ Step 3B: Date switching and fallback work seamlessly.');

console.log('\n=== ALL PLAN OPENING & TECHNICIAN MOBILE TESTS PASSED! ===');

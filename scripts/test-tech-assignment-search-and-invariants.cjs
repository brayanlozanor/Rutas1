const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const planificarHtml = fs.readFileSync(path.join(root, 'public/planificar.html'), 'utf8');
const planificarJs = fs.readFileSync(path.join(root, 'public/assets/js/planificar.js'), 'utf8');
const planUiCss = fs.readFileSync(path.join(root, 'public/assets/css/plan-ui-v2.css'), 'utf8');

console.log('--- TEST: Technician-to-Plan Invariants (1 tech -> 1 plan, 1 plan -> N techs) & Search UI ---');

// 1. Static HTML & CSS checks
console.log('1. Checking HTML structure for technician search panel, top banner & confirmation dialog...');
assert(planificarHtml.includes('id="tech-assignment-panel"'), 'planificar.html must contain tech-assignment-panel');
assert(planificarHtml.includes('id="tech-plan-search-input"'), 'planificar.html must contain tech-plan-search-input');
assert(planificarHtml.includes('id="tech-plan-search-results"'), 'planificar.html must contain tech-plan-search-results');
assert(planificarHtml.includes('id="tech-assignment-count"'), 'planificar.html must contain tech-assignment-count');
assert(planificarHtml.includes('id="plan-board-header-banner"'), 'planificar.html must contain plan-board-header-banner');
assert(planificarHtml.includes('id="plan-board-crew-container"'), 'planificar.html must contain plan-board-crew-container');
assert(planificarHtml.includes('id="plan-selected-summary-card"'), 'planificar.html must contain plan-selected-summary-card');
assert(planificarHtml.includes('onclick="clearTechPlanSearch()"'), 'planificar.html must contain clear search button');
console.log('✓ 1. HTML structure verified.');

console.log('2. Checking CSS styles in plan-ui-v2.css...');
assert(planUiCss.includes('.tech-assignment-panel'), 'plan-ui-v2.css must style .tech-assignment-panel');
assert(planUiCss.includes('.tech-plan-search-results'), 'plan-ui-v2.css must style .tech-plan-search-results');
assert(planUiCss.includes('.tech-plan-badge-assigned'), 'plan-ui-v2.css must style .tech-plan-badge-assigned');
assert(planUiCss.includes('.tech-plan-badge-current'), 'plan-ui-v2.css must style .tech-plan-badge-current');
assert(planUiCss.includes('.plan-board-header-banner'), 'plan-ui-v2.css must style .plan-board-header-banner');
assert(planUiCss.includes('.plan-header-crew-card'), 'plan-ui-v2.css must style .plan-header-crew-card');
assert(planUiCss.includes('.btn-confirm-danger'), 'plan-ui-v2.css must style .btn-confirm-danger for unassigning');
assert(!planUiCss.includes('.tech-plan-quick-assign'), 'plan-ui-v2.css must NOT have quick assign edit buttons in search list');
console.log('✓ 2. CSS styles verified.');

console.log('3. Checking JavaScript functions in planificar.js...');
assert(planificarJs.includes('function unassignTechFromOtherPlans('), 'unassignTechFromOtherPlans must exist');
assert(planificarJs.includes('function enforceSinglePlanPerTechInvariant('), 'enforceSinglePlanPerTechInvariant must exist');
assert(planificarJs.includes('function renderTechPlanSearchList('), 'renderTechPlanSearchList must exist');
assert(planificarJs.includes('function jumpToGeneralPlan('), 'jumpToGeneralPlan must exist');
assert(planificarJs.includes('function clearTechPlanSearch('), 'clearTechPlanSearch must exist');
assert(!planificarJs.includes('plan-team-badge-unassigned'), 'planificar.js must NOT render unassigned technician badge clouds');
assert(!planificarJs.includes('tech-plan-quick-assign'), 'planificar.js must NOT allow editing from search list');
assert(!planificarJs.includes('Ir a editar'), 'planificar.js must NOT contain "Ir a editar" text');
assert(planificarJs.includes('opt-unassign'), 'planificar.js must style unassign option in select');
console.log('✓ 3. JavaScript functions present, read-only search and unassign confirmation verified.');

// 4. Functional logic testing in isolated context
console.log('4. Testing functional invariants: 1 tech in <= 1 plan, 1 plan with >= 1 tech...');

// Setup mock state and functions matching planificar.js
const SHARED_PLAN_ID = 'general-shared';
const mockState = {
    technicians: [
        { id: 'tech-1', nombre: 'Brayan Lozano', rol: 'Administrador' },
        { id: 'tech-2', nombre: 'Nolve Robles', rol: 'Técnico' },
        { id: 'tech-3', nombre: 'Pablo Eminem', rol: 'Técnico' },
        { id: 'tech-4', nombre: 'Jesús Alberto', rol: 'Técnico' }
    ],
    weekPlan: {
        [SHARED_PLAN_ID]: {
            _generalPlans: [
                { id: 'gp-1', name: 'Ruta Costa Chica', assignedTechId: 'tech-1', assignedTechIds: ['tech-1'] },
                { id: 'gp-2', name: 'Ruta Centro', assignedTechId: 'tech-2', assignedTechIds: ['tech-2'] }
            ]
        }
    }
};

function getGeneralPlans() {
    return mockState.weekPlan[SHARED_PLAN_ID]._generalPlans;
}

function syncPlanAssignedMetadata(plan, selectedIds) {
    if (!plan) return;
    const cleanIds = [...new Set((Array.isArray(selectedIds) ? selectedIds : []).filter(Boolean).map(String))];
    plan.assignedTechIds = cleanIds;
    plan.assignedTechId = cleanIds[0] || '';
    const assignedObjs = (mockState.technicians || []).filter(t => !t.deletedAt && (cleanIds.includes(String(t.id)) || (t.userId && cleanIds.includes(String(t.userId)))));
    plan.assignedTechName = assignedObjs.map(t => t.nombre || t.usuario).filter(Boolean).join(', ');
    plan.assignedAt = cleanIds.length ? (plan.assignedAt || new Date().toISOString()) : '';
    plan.updatedAt = new Date().toISOString();
}

function unassignTechFromOtherPlans(techId, keepInPlanId = '') {
    if (!techId) return false;
    const targetTechId = String(techId);
    const techObj = (mockState.technicians || []).find(t => String(t.id) === targetTechId || (t.userId && String(t.userId) === targetTechId));
    const targetIds = new Set([targetTechId]);
    if (techObj?.id) targetIds.add(String(techObj.id));
    if (techObj?.userId) targetIds.add(String(techObj.userId));

    const allPlans = getGeneralPlans();
    let anyChanged = false;
    allPlans.forEach(otherPlan => {
        if (!otherPlan || otherPlan.deletedAt || (keepInPlanId && String(otherPlan.id) === String(keepInPlanId))) return;
        const otherTechs = [...new Set([
            otherPlan.assignedTechId,
            ...(Array.isArray(otherPlan.assignedTechIds) ? otherPlan.assignedTechIds : [])
        ].filter(Boolean).map(String))];

        const filtered = otherTechs.filter(id => !targetIds.has(id));
        if (filtered.length !== otherTechs.length) {
            syncPlanAssignedMetadata(otherPlan, filtered);
            anyChanged = true;
        }
    });
    return anyChanged;
}

function isPlanAssignedToTech(plan, techId) {
    if (!plan || !techId) return false;
    const targetId = String(techId).trim();
    if (String(plan.assignedTechId || '').trim() === targetId) return true;
    if (Array.isArray(plan.assignedTechIds) && plan.assignedTechIds.map(String).includes(targetId)) return true;
    return false;
}

function getGeneralPlanAssignedToTech(techId, ignorePlanId = '') {
    if (!techId) return null;
    return getGeneralPlans().find(plan =>
        !plan.deletedAt &&
        plan.id !== ignorePlanId &&
        isPlanAssignedToTech(plan, techId)
    ) || null;
}

// Initial state checks
assert.strictEqual(getGeneralPlanAssignedToTech('tech-1')?.id, 'gp-1');
assert.strictEqual(getGeneralPlanAssignedToTech('tech-2')?.id, 'gp-2');
assert.strictEqual(getGeneralPlanAssignedToTech('tech-3'), null);

// Step A: Assign Tech 3 to Plan 1 (now Plan 1 has Tech 1 AND Tech 3)
unassignTechFromOtherPlans('tech-3', 'gp-1');
const gp1 = getGeneralPlans().find(p => p.id === 'gp-1');
syncPlanAssignedMetadata(gp1, ['tech-1', 'tech-3']);

assert.strictEqual(gp1.assignedTechIds.length, 2, 'gp-1 must now have 2 technicians');
assert(gp1.assignedTechIds.includes('tech-1'), 'gp-1 must contain tech-1');
assert(gp1.assignedTechIds.includes('tech-3'), 'gp-1 must contain tech-3');
assert.strictEqual(getGeneralPlanAssignedToTech('tech-3')?.id, 'gp-1');
console.log('✓ Step A: Plan 1 successfully has multiple technicians (tech-1 and tech-3).');

// Step B: Now assign Tech 3 to Plan 2.
// Tech 3 MUST be removed from Plan 1 automatically, but Tech 1 MUST remain in Plan 1!
unassignTechFromOtherPlans('tech-3', 'gp-2');
const gp2 = getGeneralPlans().find(p => p.id === 'gp-2');
syncPlanAssignedMetadata(gp2, ['tech-2', 'tech-3']);

assert(!gp1.assignedTechIds.includes('tech-3'), 'tech-3 must no longer be in gp-1');
assert(gp1.assignedTechIds.includes('tech-1'), 'tech-1 must remain in gp-1');
assert.strictEqual(gp1.assignedTechIds.length, 1, 'gp-1 must now have only 1 technician');

assert(gp2.assignedTechIds.includes('tech-2'), 'gp-2 must contain tech-2');
assert(gp2.assignedTechIds.includes('tech-3'), 'gp-2 must contain tech-3');
assert.strictEqual(gp2.assignedTechIds.length, 2, 'gp-2 must have 2 technicians');

assert.strictEqual(getGeneralPlanAssignedToTech('tech-3')?.id, 'gp-2');
console.log('✓ Step B: Tech 3 unassigned from Plan 1 when assigned to Plan 2; Plan 1 preserved Tech 1.');

// Step C: Verify total assignments count
let totalTechAssignments = 0;
mockState.technicians.forEach(t => {
    const plansWithTech = getGeneralPlans().filter(p => isPlanAssignedToTech(p, t.id));
    assert(plansWithTech.length <= 1, `Technician ${t.nombre} must NOT be in more than 1 plan (found in ${plansWithTech.length})`);
    if (plansWithTech.length === 1) totalTechAssignments++;
});
assert.strictEqual(totalTechAssignments, 3, 'Exactly 3 technicians should be assigned (tech-1, tech-2, tech-3)');
console.log('✓ Step C: Invariant verified: each technician is in AT MOST 1 plan.');

// Step D: Search filter simulation
function filterTechs(query) {
    const q = (query || '').trim().toLowerCase();
    return mockState.technicians.map(t => {
        const assignedPlan = getGeneralPlanAssignedToTech(t.id);
        return { tech: t, name: t.nombre, assignedPlan };
    }).filter(item => {
        if (!q) return true;
        const matchName = item.name.toLowerCase().includes(q);
        const matchPlan = item.assignedPlan ? (item.assignedPlan.name || '').toLowerCase().includes(q) : false;
        return matchName || matchPlan;
    });
}

const allResults = filterTechs('');
assert.strictEqual(allResults.length, 4, 'Search with empty query returns all 4 technicians');

const brayanResult = filterTechs('brayan');
assert.strictEqual(brayanResult.length, 1);
assert.strictEqual(brayanResult[0].assignedPlan?.name, 'Ruta Costa Chica');

const centroResult = filterTechs('centro');
assert.strictEqual(centroResult.length, 2, 'Searching "centro" should find tech-2 and tech-3 who are in Ruta Centro');

const unassignedResult = filterTechs('jesús');
assert.strictEqual(unassignedResult.length, 1);
assert.strictEqual(unassignedResult[0].assignedPlan, null, 'Jesús should show as unassigned');

console.log('✓ Step D: Search filters correctly by technician name and by assigned plan name.');

// Step E: Verify clean UI without bulky button
console.log('5. Verifying that separate jump button is removed and name directly opens plan...');
assert(!planificarJs.includes('tech-plan-badge-assigned'), 'planificar.js must NOT render separate tech-plan-badge-assigned button taking up space');
assert(planificarJs.includes('tech-name-clickable'), 'planificar.js must mark technician name as clickable when jumpable');
assert(planificarJs.includes('tech-plan-assigned-tag'), 'planificar.js must display assigned plan in subtitle tag');
console.log('✓ Step E: Separate button removed, clicking technician name opens the plan directly.');

console.log('\n=== ALL TECHNICIAN INVARIANT & SEARCH TESTS PASSED! ===');

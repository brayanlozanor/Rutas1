const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- TEST: Plan Assignment Menu Tabs & Header Chips with Unassign ---');

const rootDir = path.resolve(__dirname, '..');
const planificarHtml = fs.readFileSync(path.join(rootDir, 'public', 'planificar.html'), 'utf8');
const planUiCss = fs.readFileSync(path.join(rootDir, 'public', 'assets', 'css', 'plan-ui-v2.css'), 'utf8');
const planificarJs = fs.readFileSync(path.join(rootDir, 'public', 'assets', 'js', 'planificar.js'), 'utf8');

// 1. HTML Verification
console.log('1. Checking HTML structure for menu tabs and containers...');
assert(planificarHtml.includes('id="plan-assign-menu-box"'), 'plan-assign-menu-box must exist');
assert(planificarHtml.includes('id="plan-tab-btn-team"'), 'plan-tab-btn-team must exist');
assert(planificarHtml.includes('id="plan-tab-btn-search"'), 'plan-tab-btn-search must exist');
assert(planificarHtml.includes('id="plan-tab-btn-plans"'), 'plan-tab-btn-plans must exist');
assert(planificarHtml.includes('id="plan-team-management-view"'), 'plan-team-management-view must exist');
assert(planificarHtml.includes('id="tech-assignment-panel"'), 'tech-assignment-panel must exist');
assert(planificarHtml.includes('id="plan-catalog-management-view"'), 'plan-catalog-management-view must exist');
assert(planificarHtml.includes('id="plan-board-crew-container"'), 'plan-board-crew-container must exist');
console.log('✓ 1. HTML structure verified.');

// 2. CSS Verification
console.log('2. Checking CSS styles in plan-ui-v2.css...');
assert(planUiCss.includes('.plan-header-chips-row'), 'CSS must include .plan-header-chips-row');
assert(planUiCss.includes('.plan-header-tech-chip'), 'CSS must include .plan-header-tech-chip');
assert(planUiCss.includes('.header-chip-remove'), 'CSS must include .header-chip-remove');
assert(planUiCss.includes('.plan-assign-menu-box'), 'CSS must include .plan-assign-menu-box');
assert(planUiCss.includes('.plan-assign-nav'), 'CSS must include .plan-assign-nav');
assert(planUiCss.includes('.plan-assign-nav-btn'), 'CSS must include .plan-assign-nav-btn');
assert(planUiCss.includes('.plan-team-card'), 'CSS must include .plan-team-card');
assert(planUiCss.includes('.btn-team-unassign'), 'CSS must include .btn-team-unassign');
assert(planUiCss.includes('.btn-team-add'), 'CSS must include .btn-team-add');
assert(planUiCss.includes('.btn-team-transfer'), 'CSS must include .btn-team-transfer');
assert(planUiCss.includes('.plan-catalog-item'), 'CSS must include .plan-catalog-item');
console.log('✓ 2. CSS styles verified.');

// 3. JavaScript Function Signatures
console.log('3. Checking JavaScript functions in planificar.js...');
assert(planificarJs.includes('function renderPlanBoardCrew('), 'renderPlanBoardCrew must exist');
assert(planificarJs.includes('function unassignTechFromHeader('), 'unassignTechFromHeader must exist');
assert(planificarJs.includes('function assignTechToCurrentPlan('), 'assignTechToCurrentPlan must exist');
assert(planificarJs.includes('function unassignTechFromCurrentPlan('), 'unassignTechFromCurrentPlan must exist');
assert(planificarJs.includes('function switchPlanAssignTab('), 'switchPlanAssignTab must exist');
assert(planificarJs.includes('function renderPlanTeamManagementView('), 'renderPlanTeamManagementView must exist');
assert(planificarJs.includes('function renderPlanCatalogManagementView('), 'renderPlanCatalogManagementView must exist');
console.log('✓ 3. JavaScript functions present and exported.');

// 4. Functional Execution Simulation
console.log('4. Simulating header chips rendering with multiple technicians and unassign...');

// Mock environment
const elements = {};
function getOrCreateElement(id) {
    if (!elements[id]) {
        elements[id] = {
            id,
            innerHTML: '',
            textContent: '',
            style: {},
            classList: {
                classes: new Set(),
                add(c) { this.classes.add(c); },
                remove(c) { this.classes.delete(c); },
                toggle(c, v) { if (v) this.classes.add(c); else this.classes.delete(c); },
                contains(c) { return this.classes.has(c); }
            },
            setAttribute(k, v) { this[k] = v; },
            getAttribute(k) { return this[k]; }
        };
    }
    return elements[id];
}

const mockDoc = {
    getElementById(id) {
        return getOrCreateElement(id);
    }
};

// Create a sandbox execution of renderPlanBoardCrew
const sandbox = {
    document: mockDoc,
    isTechnicianPlanView: () => false,
    escapeHtml: str => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    escapeAttr: str => String(str).replace(/"/g, '&quot;'),
    getGeneralPlanAssignedTechs: (plan) => {
        const ids = [...new Set([plan.assignedTechId, ...(Array.isArray(plan.assignedTechIds) ? plan.assignedTechIds : [])].filter(Boolean))].map(String);
        return (sandbox.state.technicians || []).filter(t => !t.deletedAt && (ids.includes(String(t.id)) || (t.userId && ids.includes(String(t.userId)))));
    },
    state: {
        technicians: [
            { id: 'tech-1', nombre: 'Lalo Ruiz', usuario: 'lalo', rol: 'Técnico' },
            { id: 'tech-2', nombre: 'Carlos López', usuario: 'carlos', rol: 'Instalador' },
            { id: 'tech-3', nombre: 'María Gomez', usuario: 'maria', rol: 'Soporte' }
        ]
    }
};

// Eval definition of renderPlanBoardCrew into sandbox
const renderCrewCode = planificarJs.match(/function renderPlanBoardCrew[\s\S]*?window\.renderPlanBoardCrew = renderPlanBoardCrew;/)[0];
const fn = new Function('document', 'isTechnicianPlanView', 'escapeHtml', 'escapeAttr', 'getGeneralPlanAssignedTechs', 'state', 'window', `
    ${renderCrewCode}
    return renderPlanBoardCrew;
`);
const mockWindow = {};
const testRenderPlanBoardCrew = fn(sandbox.document, sandbox.isTechnicianPlanView, sandbox.escapeHtml, sandbox.escapeAttr, sandbox.getGeneralPlanAssignedTechs, sandbox.state, mockWindow);

// Test A: Plan with 2 technicians
const planTwoTechs = {
    id: 'plan-alpha',
    name: 'Ruta Montaña',
    assignedTechId: 'tech-1',
    assignedTechIds: ['tech-1', 'tech-2']
};

testRenderPlanBoardCrew(planTwoTechs);
const crewHtml = mockDoc.getElementById('plan-board-crew-container').innerHTML;
assert(crewHtml.includes('Técnico(s) asignado(s) (2)'), 'Header must indicate 2 assigned technicians');
assert(crewHtml.includes('Lalo Ruiz'), 'Header must contain Lalo Ruiz chip');
assert(crewHtml.includes('Carlos López'), 'Header must contain Carlos López chip');
assert(crewHtml.includes("unassignTechFromHeader('tech-1'"), 'Lalo chip must have unassignTechFromHeader');
assert(crewHtml.includes("unassignTechFromHeader('tech-2'"), 'Carlos chip must have unassignTechFromHeader');
console.log('✓ Step A: Header correctly renders multiple chips with unassign buttons for every technician.');

// Test B: Empty crew
const planEmptyTechs = {
    id: 'plan-beta',
    name: 'Ruta Norte',
    assignedTechId: '',
    assignedTechIds: []
};
testRenderPlanBoardCrew(planEmptyTechs);
const emptyCrewHtml = mockDoc.getElementById('plan-board-crew-container').innerHTML;
assert(emptyCrewHtml.includes('unassigned'), 'Unassigned card rendered when crew is empty');
assert(emptyCrewHtml.includes('Sin técnico asignado a esta ruta'), 'Clear warning rendered when unassigned');
console.log('✓ Step B: Header correctly renders unassigned state when no technicians are in plan.');

console.log('\n=== ALL PLAN ASSIGNMENT MENU & HEADER UNASSIGN TESTS PASSED! ===');

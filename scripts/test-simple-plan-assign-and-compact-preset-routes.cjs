const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const planificarHtml = fs.readFileSync(path.join(root, 'public/planificar.html'), 'utf8');
const planificarJs = fs.readFileSync(path.join(root, 'public/assets/js/planificar.js'), 'utf8');
const presetRoutesJs = fs.readFileSync(path.join(root, 'public/assets/js/preset-routes.js'), 'utf8');
const presetRoutesCss = fs.readFileSync(path.join(root, 'public/assets/css/preset-routes.css'), 'utf8').replace(/\r\n/g, '\n');

console.log('--- TEST: Sidebar Cleanup, Compact Preset Route Actions & Simple Plan Assignment ---');

// 1. Verify removal of the two sidebar buttons in planificar.html
console.log('1. Checking removal of duplicate Rutas recomendadas & Eliminar planes pasados in sidebar...');
assert(!planificarHtml.includes('deletePastGeneralPlans()'), 'planificar.html must not contain Eliminar planes pasados button');
const sidebarMatch = planificarHtml.match(/<aside class="plan-sidebar">[\s\S]*?<\/aside>/)?.[0] || '';
assert(sidebarMatch, 'plan-sidebar must exist in planificar.html');
assert(!sidebarMatch.includes('openPresetRoutesModal()'), 'plan-sidebar must not contain duplicate Rutas recomendadas button');
assert(planificarHtml.includes('class="btn btn-preset-routes" onclick="openPresetRoutesModal()"'), 'Main command bar must still have Rutas recomendadas button');
console.log('✓ 1. Sidebar buttons removed cleanly.');

// 2. Verify compact preset route cards and well-placed attach buttons
console.log('2. Checking compact text and 2-column button grid in preset routes...');
assert(presetRoutesJs.includes('<span>Crear plan</span>'), 'Primary attach button must use concise label "Crear plan"');
assert(presetRoutesJs.includes('<span>+ Adjuntar</span>'), 'Secondary attach button must use concise label "+ Adjuntar"');
assert(presetRoutesJs.includes('<span>Maps</span>'), 'Maps button must use concise label "Maps"');
assert(presetRoutesCss.includes('.preset-route-card .preset-route-notes,\n.preset-route-card .preset-continuation-box {\n  display: none !important;'), 'Notes and continuation boxes must be hidden in card to avoid overloading');
assert(presetRoutesCss.includes('.preset-card-actions {\n  display: grid !important;\n  grid-template-columns: 1fr 1fr !important;'), 'Card actions must use a 2-column grid at the bottom of the card');
assert(presetRoutesCss.includes('overflow: visible !important;'), 'Preset route card must not clip its action buttons');
console.log('✓ 2. Preset route cards are compact and attach buttons are always visible.');

// 3. Verify simple, direct plan selection and 1-or-many technician assignment
console.log('3. Checking simple plan selection and technician assignment...');
assert(planificarJs.includes('function syncPlanAssignedMetadata(plan, selectedIds)'), 'syncPlanAssignedMetadata helper must exist');
assert(planificarJs.includes('async function toggleTechInCurrentPlan(techId)'), 'toggleTechInCurrentPlan must exist for 1-click multi-tech assignment');
assert(planificarJs.includes('window.toggleTechInCurrentPlan = toggleTechInCurrentPlan;'), 'toggleTechInCurrentPlan must be exposed on window');
assert(planificarJs.includes('if (isPlanReadOnly() && selectedTechId && selectedTechId !== SHARED_PLAN_ID)'), 'getSelectedGeneralPlan must not filter out plans for admin/soporte');
assert(planificarJs.includes('const selectablePlans = getGeneralPlans();'), 'initPlanSelectors must list all general plans in #general-plan-select');
console.log('✓ 3. Simple plan selection and 1-or-multi technician assignment verified.');

console.log('\n=== ALL SIDEBAR, PRESET ROUTES & SIMPLE PLAN ASSIGNMENT TESTS PASSED! ===');


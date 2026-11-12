const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- TEST: Technician No-Admin Empty State & Assigned Details Badge ---');

const planificarJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/planificar.js'), 'utf8');

// 1. Check getLoggedTechnicianId and ensureLoggedTechnicianRecord
assert(planificarJs.includes('function getLoggedTechnicianId()'), 'getLoggedTechnicianId must exist');
assert(planificarJs.includes('function ensureLoggedTechnicianRecord()'), 'ensureLoggedTechnicianRecord must exist');
assert(planificarJs.includes("return userId || user?.username || user?.name || 'tecnico';"), 'getLoggedTechnicianId must have safe fallback');
console.log('✓ 1. getLoggedTechnicianId and ensureLoggedTechnicianRecord verified.');

// 2. Check enhanced isPlanAssignedToTech
assert(planificarJs.includes('function isPlanAssignedToTech(plan, techId)'), 'isPlanAssignedToTech must exist');
assert(planificarJs.includes('plan.assignedTechName'), 'isPlanAssignedToTech must check plan.assignedTechName');
assert(planificarJs.includes('techNames.some'), 'isPlanAssignedToTech must check techNames against plan');
console.log('✓ 2. Resilient isPlanAssignedToTech matching verified.');

// 3. Check initPlanSelectors for technician
assert(planificarJs.includes('if (isTechnicianPlanView()) {'), 'Technician branch must be isolated in initPlanSelectors');
assert(planificarJs.includes('ensureLoggedTechnicianRecord();'), 'initPlanSelectors must call ensureLoggedTechnicianRecord');
assert(planificarJs.includes('techSelect.disabled = true;'), 'techSelect must be disabled for technicians');
console.log('✓ 3. Technician plan and tech selector isolation verified.');

// 4. Check renderPlanDays empty states: NEVER "Selecciona o crea un tecnico" for technicians
assert(planificarJs.includes("isTechnicianPlanView() ? '<p>No tienes trabajos asignados para hoy.</p>' : 'Selecciona o crea un tecnico para empezar a planificar.'"), 'renderPlanDays must not show admin message to technicians');
assert(planificarJs.includes("isTechnicianPlanView() ? '<p>No tienes planes de trabajo asignados actualmente.</p>' : 'No hay planes asignados a tecnicos todavia.'"), 'renderPlanDays must show technician-specific no plans message');
console.log('✓ 4. Admin empty states prevented for technicians in renderPlanDays.');

// 5. Check unscheduled stops fallback in getVisiblePlanStops and renderTechnicianDayMap
assert(planificarJs.includes('const unscheduled = allStops.filter(stop => !stop.scheduledDate);'), 'Must fallback to unscheduled stops for technicians');
assert(planificarJs.includes('if (unscheduled.length > 0) return unscheduled;'), 'getVisiblePlanStops must return unscheduled stops when today has none');
console.log('✓ 5. Unscheduled stops fallback verified.');

// 6. Check that technician notifications and header bell are removed
assert(!planificarJs.includes('<button type="button" class="tech-header-bell"'), 'Header bell must be removed for technicians');
assert(planificarJs.includes('function updateTechnicianMobileBellBadge()'), 'updateTechnicianMobileBellBadge must exist');
assert(planificarJs.includes('existingBell.remove()') || planificarJs.includes('bell.remove()'), 'updateTechnicianMobileBellBadge or header setup must clean up bell');
assert(planificarJs.includes('function checkAndTriggerTechnicianProductivityBriefings() {\n    return;\n}'), 'Productivity briefings must be silenced for technicians');
console.log('✓ 6. Technician notifications and bell completely removed as requested.');

console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');


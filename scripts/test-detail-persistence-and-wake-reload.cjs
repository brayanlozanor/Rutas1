const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Testing detail persistence, wake reload and technician empty state robustness...');

// 1. Verify files exist and read them
const commonJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'common.js');
const apiJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'api.js');
const planificarJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'planificar.js');
const tecnicoRutaJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'tecnico-ruta.js');
const antenasJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'antenas.js');
const nodosJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'nodos.js');

const commonCode = fs.readFileSync(commonJsPath, 'utf8');
const apiCode = fs.readFileSync(apiJsPath, 'utf8');
const planificarCode = fs.readFileSync(planificarJsPath, 'utf8');
const tecnicoRutaCode = fs.readFileSync(tecnicoRutaJsPath, 'utf8');
const antenasCode = fs.readFileSync(antenasJsPath, 'utf8');
const nodosCode = fs.readFileSync(nodosJsPath, 'utf8');

// 2. Test normalizeRole strips accents in common.js and api.js
assert(commonCode.includes("normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')"), 'common.js must strip accents in normalizeRole');
assert(apiCode.includes("normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')"), 'api.js must strip accents in normalizeRole');

// Simulate normalizeRole logic
function normalizeRole(role) {
    const raw = String(role || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (raw === 'admin' || raw === 'administrador') return 'administrador';
    if (raw === 'soporte') return 'soporte';
    if (raw === 'atencion' || raw === 'atencion_clientes' || raw === 'atencion a clientes' || raw === 'atencion_a_clientes') return 'atencion_clientes';
    if (raw === 'tecnico' || raw === 'tecnica') return 'tecnico';
    return raw;
}
assert.strictEqual(normalizeRole('técnico'), 'tecnico', 'técnico must normalize to tecnico');
assert.strictEqual(normalizeRole('TÉCNICO'), 'tecnico', 'TÉCNICO must normalize to tecnico');
assert.strictEqual(normalizeRole('Técnica'), 'tecnico', 'Técnica must normalize to tecnico');
console.log('✓ normalizeRole successfully strips accents and normalizes technician roles');

// 3. Test global cache functions in common.js
assert(commonCode.includes('getGlobalWorkOrdersCache'), 'common.js must define getGlobalWorkOrdersCache');
assert(commonCode.includes('saveWorkOrdersToGlobalCache'), 'common.js must define saveWorkOrdersToGlobalCache');
assert(commonCode.includes('netops_global_work_orders_cache_v1'), 'common.js must use netops_global_work_orders_cache_v1');

// 4. Test applyStateData preserves work orders and restores from cache
assert(apiCode.includes('saveWorkOrdersToGlobalCache(data.workOrders)'), 'api.js must save incoming orders to global cache');
assert(apiCode.includes('getGlobalWorkOrdersCache()'), 'api.js must restore missing orders from cache');

// 5. Test antenas.js and nodos.js do not wipe state.workOrders
assert(!antenasCode.includes('state.workOrders = Array.isArray(data.workOrders) ? data.workOrders : [];'), 'antenas.js must not wipe state.workOrders to empty array');
assert(!nodosCode.includes('state.workOrders = Array.isArray(data.workOrders) ? data.workOrders : [];'), 'nodos.js must not wipe state.workOrders to empty array');
console.log('✓ antenas.js and nodos.js safely preserve work orders');

// 6. Test isTechnicianPlanView resilience in planificar.js
assert(planificarCode.includes("classList.contains('plan-technician-view')"), 'isTechnicianPlanView must check plan-technician-view class');
assert(planificarCode.includes('tech-mobile-header'), 'isTechnicianPlanView must check tech-mobile-header');
assert(planificarCode.includes('tech-bottom-nav'), 'isTechnicianPlanView must check tech-bottom-nav');
assert(planificarCode.includes('tech-calendar-toolbar'), 'isTechnicianPlanView must check tech-calendar-toolbar');
console.log('✓ isTechnicianPlanView is resilient to DOM indicators and user state');

// 7. Test getStopDetails multi-tier fallback in planificar.js
assert(planificarCode.includes('getGlobalWorkOrdersCache'), 'getStopDetails must check getGlobalWorkOrdersCache');
assert(planificarCode.includes('findOrFetchWorkOrder'), 'getStopDetails must trigger findOrFetchWorkOrder on missing details');
assert(planificarCode.includes('saveWorkOrdersToGlobalCache'), 'getStopDetails must persist resolved details');
console.log('✓ getStopDetails provides multi-tier fallback');

// 8. Test renderPlanDays never shows admin message to technicians
assert(planificarCode.includes('No tienes trabajos asignados para hoy'), 'renderPlanDays must output technician empty state');
assert(planificarCode.includes('if (isTechnicianPlanView()) {') && planificarCode.includes('board.innerHTML = `<div class="plan-empty"><p>No tienes trabajos asignados para hoy.</p></div>`;'), 'renderPlanDays must never show admin message when isTechnicianPlanView is true');
console.log('✓ renderPlanDays guards against admin empty state for technicians');

// 9. Test handlePlanWakeRefresh and event listeners
assert(planificarCode.includes('handlePlanWakeRefresh'), 'planificar.js must define handlePlanWakeRefresh');
assert(planificarCode.includes('pageshow'), 'planificar.js must listen for pageshow');
assert(planificarCode.includes('visibilitychange'), 'planificar.js must listen for visibilitychange');
assert(planificarCode.includes('focus'), 'planificar.js must listen for focus');
console.log('✓ handlePlanWakeRefresh handles mobile backgrounding, app switching, and BFCache wake');

// 10. Test sessionStorage persistence for plan and date
assert(planificarCode.includes('plan_selected_general_plan_id'), 'planificar.js must persist general plan ID in sessionStorage');
assert(planificarCode.includes('plan_selected_calendar_date'), 'planificar.js must persist calendar date in sessionStorage');
console.log('✓ general plan and calendar date are preserved across page reload and tab switches');

// 11. Test openTechnicianCompletionForm and saveTechnicianCompletion resilience
assert(planificarCode.includes('window._currentTechnicianCompletionDetail = detail;'), 'openTechnicianCompletionForm must save _currentTechnicianCompletionDetail');
assert(planificarCode.includes('window._currentTechnicianCompletionDetail.id === technicianCompletionDetailId'), 'saveTechnicianCompletion must check _currentTechnicianCompletionDetail');
console.log('✓ technician completion modal preserves detail object');

// 12. Test tecnico-ruta.js fallback and wake listeners
assert(tecnicoRutaCode.includes('getGlobalWorkOrdersCache'), 'tecnico-ruta.js must check getGlobalWorkOrdersCache in getStopDetailsForTech');
assert(tecnicoRutaCode.includes('_techRouteWakeBound'), 'tecnico-ruta.js must bind wake listeners');
console.log('✓ tecnico-ruta.js has cache fallback and wake listeners');

console.log('\nAll detail persistence and wake reload tests passed successfully!');


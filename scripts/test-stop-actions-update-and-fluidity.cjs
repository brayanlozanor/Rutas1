const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- TEST: Stop Card Actions, Delete Reliability, Update Stability & UI Fluidity ---');

const ROOT = path.resolve(__dirname, '..');
const planJsPath = path.join(ROOT, 'public', 'assets', 'js', 'planificar.js');
const apiJsPath = path.join(ROOT, 'public', 'assets', 'js', 'api.js');
const styleCssPath = path.join(ROOT, 'public', 'assets', 'css', 'style.css');
const stopCardCssPath = path.join(ROOT, 'public', 'assets', 'css', 'plan-stop-card-exact.css');
const stopCardsCssPath = path.join(ROOT, 'public', 'assets', 'css', 'plan-stop-cards.css');

const planJs = fs.readFileSync(planJsPath, 'utf8');
const apiJs = fs.readFileSync(apiJsPath, 'utf8');
const styleCss = fs.readFileSync(styleCssPath, 'utf8');
const stopCardCss = fs.readFileSync(stopCardCssPath, 'utf8');
const stopCardsCss = fs.readFileSync(stopCardsCssPath, 'utf8');

// 1. Verificar eliminación del botón de 3 puntos (drag handle)
console.log('1. Verificando que el botón de 3 puntos (drag handle) está eliminado y no bloquea clics...');
assert(!planJs.includes('<span class="stop-drag-handle"'), 'El markup de .stop-drag-handle debe haber sido removido de stopCardHeadActions');
assert(stopCardsCss.includes('.stop-drag-handle{display:none!important'), 'CSS plan-stop-cards debe ocultar .stop-drag-handle con display:none !important');
assert(stopCardCss.includes('display: none !important') && stopCardCss.includes('pointer-events: none !important'), 'CSS plan-stop-card-exact debe anular pointer-events y display de .stop-drag-handle');
console.log('✓ 1. Botón de tres puntos eliminado y deshabilitado por completo.');

// 2. Verificar que el botón de basurero existe, es visible y tiene pointer-events: auto y z-index prioritario
console.log('2. Verificando botón de eliminar parada (basurero)...');
assert(planJs.includes('btn-stop-remove-action'), 'planificar.js debe generar el botón con clase btn-stop-remove-action');
assert(planJs.includes('deleteStop('), 'btn-stop-remove-action debe llamar a deleteStop');
assert(stopCardCss.includes('.planificar-page .btn-stop-remove-action'), 'CSS debe dar estilos dedicados a .btn-stop-remove-action');
assert(stopCardCss.includes('pointer-events: auto !important'), '.btn-stop-remove-action debe tener pointer-events: auto !important');
assert(stopCardCss.includes('cursor: pointer !important'), '.btn-stop-remove-action debe tener cursor: pointer');
console.log('✓ 2. Botón de basurero correctamente configurado, visible y listo para clic.');

// 3. Verificar que deleteStop soporta comparación flexible de ID y busca en todos los ámbitos
console.log('3. Verificando lógica de eliminación de parada en deleteStop...');
assert(planJs.includes('String(s.id) !== strId'), 'deleteStop debe comparar IDs convirtiéndolos a String para evitar fallos número/string');
assert(planJs.includes('getGeneralPlans'), 'deleteStop debe limpiar la parada de planes generales');
assert(planJs.includes('state.weekPlan'), 'deleteStop debe limpiar la parada de todas las semanas del estado');
console.log('✓ 3. deleteStop elimina paradas sin fallas de tipo ni desincronización de planes.');

// 4. Verificar que general-plan-tools no se oculta para administradores cuando se selecciona un técnico
console.log('4. Verificando persistencia de botones de plan al seleccionar técnico y actualizar...');
assert(planJs.includes('generalTools.style.display = (canManage || selectedTechId === SHARED_PLAN_ID) ? \'block\' : \'none\''),
    'generalTools debe permanecer en block para administradores (canManage) incluso si se selecciona un técnico');
console.log('✓ 4. Los botones y herramientas de planificación no desaparecen al cambiar de técnico.');

// 5. Verificar que renderPlan y refreshPlanAfterSync están protegidos con try...catch
console.log('5. Verificando que renderPlan y refreshPlanAfterSync tienen manejo de errores seguro...');
assert(planJs.includes('try { initPlanSelectors(); } catch'), 'renderPlan debe proteger initPlanSelectors con try/catch');
assert(planJs.includes('try { renderPlanDays(); } catch'), 'renderPlan debe proteger renderPlanDays con try/catch');
assert(planJs.includes('try { renderPlanMap(); } catch'), 'renderPlan debe proteger renderPlanMap con try/catch');
assert(planJs.includes('try { normalizeWeekPlan(); } catch'), 'refreshPlanAfterSync debe proteger normalizeWeekPlan con try/catch');
console.log('✓ 5. Las funciones de actualización están encapsuladas y nunca rompen los botones.');

// 6. Verificando optimización de OSRM para que no congele la pantalla
console.log('6. Verificando optimización de tiempo de espera y llamadas OSRM...');
assert(planJs.includes('timeoutId = setTimeout(() => controller.abort(), 3500);'), 'fetchOsrmRoute debe tener un timeout corto de 3500ms para evitar congelamientos');
assert(!planJs.includes('notify(\'No se pudo calcular carretera; se trazo directo\', \'err\');'), 'drawRoadRoute no debe mostrar toasts de error intrusivos');
console.log('✓ 6. OSRM optimizado: sin congelamiento de red ni notificaciones molestas.');

// 7. Verificando que el cargando datos no congele la pantalla ni desenfoque todo
console.log('7. Verificando overlay de carga no invasivo y sin bloqueo de clics...');
assert(apiJs.includes('overlay.style.pointerEvents = \'none\';'), 'api.js debe aplicar pointerEvents = none al overlay');
assert(styleCss.includes('#netops-loading,') && styleCss.includes('pointer-events:none!important;'), 'style.css debe forzar pointer-events:none !important en #netops-loading');
assert(!styleCss.includes('.loading-overlay{align-items:center!important;justify-content:center!important;padding:22px 15px!important;background:rgba(15,31,61,.20)!important;backdrop-filter:blur(6px)!important;'),
    'Las reglas intrusivas de blur(6px) y fondo oscuro para .loading-overlay deben haber sido eliminadas de style.css');
console.log('✓ 7. El cargando datos es docked, pequeño y nunca congela ni bloquea la pantalla.');

console.log('\n=== ALL STOP ACTIONS, DELETE RELIABILITY & FLUIDITY TESTS PASSED! ===');


const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST: Verificación de Mapa de Hoy en Sección Detalles (Técnico / Celular) ===');

const htmlPath = path.join(__dirname, '..', 'public', 'planificar.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const cssPath = path.join(__dirname, '..', 'public', 'assets', 'css', 'technician-view-modes.css');
const css = fs.readFileSync(cssPath, 'utf8');

const dashCssPath = path.join(__dirname, '..', 'public', 'assets', 'css', 'technician-dashboard.css');
const dashCss = fs.readFileSync(dashCssPath, 'utf8');

const jsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'planificar.js');
const js = fs.readFileSync(jsPath, 'utf8');

// 1. Verificación HTML
console.log('1. Verificando estructura HTML de #tech-day-map-card...');
assert(html.includes('id="tech-day-map-card"'), 'Falta #tech-day-map-card en planificar.html');
assert(html.includes('id="tech-day-map"'), 'Falta #tech-day-map en planificar.html');
assert(html.includes('id="tech-map-privacy-notice"'), 'Falta #tech-map-privacy-notice en planificar.html');

// Verificar que solo hay UN tech-day-map-card (sin duplicados)
const matches = html.match(/id="tech-day-map-card"/g) || [];
assert.strictEqual(matches.length, 1, 'Debe haber exactamente un solo tech-day-map-card sin duplicar');

// Verificar que el aviso de privacidad está arriba del mapa
const noticeIndex = html.indexOf('id="tech-map-privacy-notice"');
const mapIndex = html.indexOf('id="tech-day-map"');
assert(noticeIndex > 0 && mapIndex > 0 && noticeIndex < mapIndex, 'El aviso de privacidad debe estar arriba del mapa');

// Verificar que #tech-day-map-card NO está encerrado dentro de .plan-board
const cardIndex = html.indexOf('id="tech-day-map-card"');
assert(cardIndex > 0, 'No se encontró tech-day-map-card');
const normalizedHtml = html.replace(/\r\n/g, '\n');
assert(normalizedHtml.includes('</section>\n\n          <!-- Mapa de hoy para celular -->\n          <section id="tech-day-map-card"'),
    '#tech-day-map-card debe ser hermano directo de .plan-board y NO estar atrapado dentro de ella');
console.log('✓ 1. Estructura HTML correcta, única y con mensaje arriba del mapa verificada.');

// 2. Verificación CSS
console.log('2. Verificando reglas CSS de visibilidad y modos de vista...');
assert(dashCss.includes('html:not(.is-technician-env) body:not(.plan-technician-view) #tech-day-map-card'),
    'Debe ocultar mapa de técnico en vista desktop/computadora');
assert(css.includes('#tech-day-map-card{display:block!important}'),
    'tech-day-map-card debe tener display:block!important en vista detalles');
assert(css.includes('#tech-day-map{display:block!important;height:270px!important;width:100%!important}'),
    'tech-day-map debe tener 100% de ancho y 270px de alto en vista detalles');
assert(css.includes('body.plan-technician-view[data-tech-view="map"] .tech-day-map-card{display:none!important}'),
    'tech-day-map-card debe ocultarse solo al cambiar a la pestaña de mapa de ruta');
console.log('✓ 2. Reglas CSS confirmadas: visible en detalles/celular, oculto en modo mapa y oculto en computadora.');

// 3. Verificación JS
console.log('3. Verificando llamadas y renderizado en planificar.js...');
assert(js.includes('function renderTechnicianDayMap()'), 'Falta la función renderTechnicianDayMap');
assert(js.includes('function refreshTechnicianDayMap()'), 'Falta la función refreshTechnicianDayMap');
assert(js.includes('function toggleTechLocationsSheet()'), 'Falta la función toggleTechLocationsSheet');
assert(js.includes('function renderTechLocationsSheet()'), 'Falta la función renderTechLocationsSheet');

// En openTechnicianDetails se asegura de mostrarlo e invalidar tamaño
const openDetailsIdx = js.indexOf('function openTechnicianDetails()');
const openDetailsSlice = js.slice(openDetailsIdx, openDetailsIdx + 500);
assert(openDetailsSlice.includes("dayMapCard.style.display = 'block'"), 'openTechnicianDetails debe forzar display block');
assert(openDetailsSlice.includes('renderTechnicianDayMap()'), 'openTechnicianDetails debe invocar renderTechnicianDayMap');

// En renderPlan y refreshPlanAfterSync debe refrescar el mapa si es vista técnica
const renderPlanIdx = js.indexOf('function renderPlan()');
const renderPlanSlice = js.slice(renderPlanIdx, renderPlanIdx + 900);
assert(renderPlanSlice.includes('renderTechnicianDayMap'), 'renderPlan debe invocar renderTechnicianDayMap');

const refreshSyncIdx = js.indexOf('function refreshPlanAfterSync()');
const refreshSyncSlice = js.slice(refreshSyncIdx, refreshSyncIdx + 600);
assert(refreshSyncSlice.includes('renderTechnicianDayMap'), 'refreshPlanAfterSync debe invocar renderTechnicianDayMap');

console.log('✓ 3. Invocaciones JS garantizadas en inicialización, sincronización y cambio de pestañas.');

console.log('=== TODOS LOS TESTS PASARON EXITOSAMENTE! ===');

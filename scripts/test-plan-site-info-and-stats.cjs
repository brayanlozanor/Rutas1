const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- TEST: Plan Site Technical Material Info, Sidebar Stats & Transit Clean Info ---');

const planJsPath = path.join(__dirname, '../public/assets/js/planificar.js');
const planJs = fs.readFileSync(planJsPath, 'utf8');

// 1. Check renderActiveSiteInformation:
// Details list and generic stop material assignment removed completely
assert(!planJs.includes('Detalles de red en este sitio'), 'renderActiveSiteInformation must NOT contain "Detalles de red en este sitio"');
assert(!planJs.includes('site-detail-card'), 'renderActiveSiteInformation must NOT render detail cards');
assert(!planJs.includes('+ Asignar Material'), 'renderActiveSiteInformation must NOT contain "+ Asignar Material" button');
assert(!planJs.includes('No hay material asignado ni registrado para esta parada'), 'Must NOT show generic stop material placeholder');
assert(planJs.includes('Material en torre'), 'renderActiveSiteInformation must render "Material en torre" for antennas');
assert(planJs.includes('Datos del sitio'), 'renderActiveSiteInformation must render simplified title "Datos del sitio"');
assert(planJs.includes('Equipo del nodo'), 'renderActiveSiteInformation must render simplified title "Equipo del nodo"');
console.log('✓ Item 1 Passed: Simplified labels in site info; antennas display tower material clearly.');

// 2. Check renderSidebarPlanSummary:
// Repetitive itinerary replaced with simple statistics
assert(!planJs.includes('Itinerario de sitios'), 'renderSidebarPlanSummary must NOT contain repetitive "Itinerario de sitios"');
assert(planJs.includes('sidebar-plan-stats-box'), 'renderSidebarPlanSummary must contain .sidebar-plan-stats-box');
assert(planJs.includes('Resumen de ruta'), 'renderSidebarPlanSummary must display "Resumen de ruta"');
assert(planJs.includes('Tiempo de viaje'), 'renderSidebarPlanSummary must display "Tiempo de viaje"');
assert(planJs.includes('Pueblos en ruta'), 'renderSidebarPlanSummary must display "Pueblos en ruta"');
console.log('✓ Item 2 Passed: Simplified non-technical operation statistics in sidebar.');

// 3. Check transitConnectorHtml:
// "Avanzar siguiente →" removed, keeping only transit distance & time info
assert(!planJs.includes('Avanzar siguiente →'), 'transitConnectorHtml must NOT contain "Avanzar siguiente →"');
assert(!planJs.includes('advancePlanCard(1)" style="cursor:pointer;"'), 'Transit connector must not trigger advance forward on click');
assert(planJs.includes('plan-card-transit-box'), 'plan-card-transit-box must remain to display route distance and time');
console.log('✓ Item 3 Passed: "Avanzar siguiente →" removed; transit distance and duration info remains cleanly.');

console.log('--- ALL SITE INFO, STATS & TRANSIT TESTS PASSED! ---');

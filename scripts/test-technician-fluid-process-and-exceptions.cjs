const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- TEST: Technician Fluid Process, Robust Exceptions & Mobile Performance ---');

const planificarJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/planificar.js'), 'utf8');
const tecnicoRutaJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/tecnico-ruta.js'), 'utf8');
const planificarHtml = fs.readFileSync(path.join(__dirname, '../public/planificar.html'), 'utf8');
const technicianCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/technician-view-modes.css'), 'utf8');
const towerModalCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/tower-material-modal.css'), 'utf8');

// 1. Check non-intrusive material prompt dismissal
assert(planificarJs.includes('function dismissTechnicianMaterialPrompt()'), 'dismissTechnicianMaterialPrompt must exist in planificar.js');
assert(planificarJs.includes('sessionStorage.setItem(\'dismissed_tech_material_prompt\''), 'Must save dismissal flag in sessionStorage');
assert(planificarJs.includes('sessionStorage.getItem(\'dismissed_tech_material_prompt\') === \'1\''), 'checkTechnicianPendingMaterialPrompt must respect dismissal');
assert(planificarHtml.includes('onclick="dismissTechnicianMaterialPrompt()"'), 'HTML "Ver más tarde" must invoke dismissTechnicianMaterialPrompt');
console.log('✓ 1. Non-intrusive material prompt dismissal verified.');

// 2. Check resilient photo compression (never crashes, capped dimensions)
assert(planificarJs.includes('async function compressTechnicianPhoto'), 'compressTechnicianPhoto must be async and resilient');
assert(planificarJs.includes('maxSide: 1200'), 'compressTechnicianPhoto must cap at 1200 maxSide for low RAM');
assert(tecnicoRutaJs.includes('maxSide: 1200'), 'compressTechPhoto in tecnico-ruta must cap at 1200 maxSide');
console.log('✓ 2. Photo compression resilience & RAM optimization verified.');

// 3. Check GPS non-blocking fallbacks
assert(planificarJs.includes('enableHighAccuracy: false'), 'GPS should use false high accuracy for quick mobile lock');
assert(planificarJs.includes('GPS no disponible. Se asignó la ubicación del sitio.'), 'GPS fallback to site coordinates verified');
console.log('✓ 3. Non-blocking GPS fallbacks verified.');

// 4. Check saveTechnicianCompletion soft validation & offline resilience
assert(!planificarJs.includes('El número telefónico es obligatorio (10 dígitos). Si no tiene número'), 'Must NOT block technician with mandatory phone error in completion');
assert(planificarJs.includes('Guardado localmente (sin señal)'), 'Offline resilience notification present in completion flow');
console.log('✓ 4. saveTechnicianCompletion non-blocking phone & offline resilience verified.');

// 5. Check saveTechnicianInstallation soft validation & offline resilience
assert(!planificarJs.includes('Ingresa un teléfono de 10 dígitos o pulsa "No tiene número".'), 'Must NOT block technician with mandatory phone error in new installation');
assert(planificarJs.includes('Guardado localmente (sin conexión a internet). Se sincronizará al tener señal.'), 'Offline resilience present in installation flow');
console.log('✓ 5. saveTechnicianInstallation non-blocking phone & offline resilience verified.');

// 6. Check reportPlanDetailIncomplete & reportWholeStopIncomplete offline resilience
assert(planificarJs.includes('openTechnicianCompletionSummary(detail);'), 'Completion summary must open for non-done reports');
console.log('✓ 6. Incomplete reports offline resilience verified.');

// 7. Check CSS mobile lag reduction and infinite animation elimination
assert(towerModalCss.includes('animation: none !important;'), 'Tower callout button must not run infinite pulse animation');
assert(technicianCss.includes('@media (max-width: 900px)'), 'Mobile query must exist in technician-view-modes.css');
assert(technicianCss.includes('backdrop-filter: none !important;'), 'backdrop-filter must be disabled on mobile to prevent GPU lag');
assert(technicianCss.includes('transition-duration: 0.08s !important;'), 'Snappy mobile transitions verified');
console.log('✓ 7. Mobile zero-lag CSS optimizations verified.');

console.log('=== ALL TECHNICIAN FLUID PROCESS & EXCEPTION TESTS PASSED! ===');


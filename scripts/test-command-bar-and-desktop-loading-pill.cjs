const fs = require('fs');
const path = require('path');
const assert = require('assert');

const baseDir = path.join(__dirname, '..');
const planificarHtml = fs.readFileSync(path.join(baseDir, 'public/planificar.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/style.css'), 'utf8');
const presetRoutesCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/preset-routes.css'), 'utf8');
const presetRoutesJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/preset-routes.js'), 'utf8');
const planificarJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/planificar.js'), 'utf8');

console.log('--- TEST: Command Bar Visual Upgrades & Non-Blocking Corner Loading Pill ---');

// 1. Quitar lo de agregar continuidad
console.log('1. Verifying removal of continuity banner and recommendations...');
assert(planificarHtml.includes('id="plan-continuity-recommendations-banner" style="display:none !important;"'), 
  'Continuity banner in planificar.html must be forced display:none !important');

assert(presetRoutesCss.includes('#plan-continuity-recommendations-banner') && presetRoutesCss.includes('display: none !important'),
  'preset-routes.css must permanently hide #plan-continuity-recommendations-banner with display:none !important');

// Test checkPlanContinuityRecommendations in preset-routes.js
let bannerDisplay = 'flex';
let bannerHtml = 'some content';
const fakeBanner = {
  style: {
    get display() { return bannerDisplay; },
    set display(v) { bannerDisplay = v; }
  },
  get innerHTML() { return bannerHtml; },
  set innerHTML(v) { bannerHtml = v; }
};

const vm = require('vm');
const sandbox = {
  document: {
    getElementById: (id) => (id === 'plan-continuity-recommendations-banner' ? fakeBanner : null)
  },
  window: {},
  root: {}
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(presetRoutesJs, sandbox);
sandbox.checkPlanContinuityRecommendations();

assert.strictEqual(bannerDisplay, 'none', 'checkPlanContinuityRecommendations must force banner to display: none');
assert.strictEqual(bannerHtml, '', 'checkPlanContinuityRecommendations must clear banner HTML');
console.log('✓ 1. Continuity recommendations banner completely removed and silenced.');

// 2. Botón de rutas recomendadas y vista mapa resaltan visualmente
console.log('2. Verifying prominent styling for Vista mapa & Rutas recomendadas buttons...');
assert(planificarHtml.includes('class="btn btn-plan-map-view"'), 'planificar.html must have btn-plan-map-view');
assert(planificarHtml.includes('class="btn btn-preset-routes"'), 'planificar.html must have btn-preset-routes');
assert(planificarHtml.includes('class="btn bc btn-plan-add-stop"'), 'planificar.html must have btn-plan-add-stop');

// Icons in buttons
assert(planificarHtml.includes('togglePlanMapSize()') && planificarHtml.includes('Vista mapa'), 'Vista mapa button must trigger togglePlanMapSize()');
assert(planificarHtml.includes('openPresetRoutesModal()') && planificarHtml.includes('Rutas recomendadas'), 'Rutas recomendadas button must trigger openPresetRoutesModal()');

// CSS styles
assert(styleCss.includes('.btn.btn-plan-map-view'), 'style.css must have .btn.btn-plan-map-view definition');
assert(styleCss.includes('059669'), 'btn-plan-map-view must use emerald gradient');
assert(styleCss.includes('.btn.btn-preset-routes'), 'style.css must have .btn.btn-preset-routes definition');
assert(styleCss.includes('7c3aed'), 'btn-preset-routes must use purple gradient');
assert(styleCss.includes('.btn.btn-plan-add-stop'), 'style.css must have .btn.btn-plan-add-stop definition');
assert(styleCss.includes('.plan-command-bar{display:flex;flex-wrap:wrap;align-items:center;'), 'plan-command-bar must use flex wrap layout for clean alignment');
console.log('✓ 2. Vista mapa and Rutas recomendadas buttons visually highlighted with icons and distinct gradients.');

// 3. Cargando datos pequeño, en esquina, sin congelar la pantalla (escritorio y móvil)
console.log('3. Verifying non-intrusive, corner-docked loading indicator that never freezes screen...');
// Check global loading overlay in style.css
assert(styleCss.includes('inset:14px 18px auto auto!important'), 'loading-overlay must be pinned to top-right corner');
assert(styleCss.includes('pointer-events:none!important'), 'loading-overlay must have pointer-events: none to avoid freezing screen');
assert(styleCss.includes('backdrop-filter:none!important'), 'loading-overlay must have backdrop-filter: none');
assert(styleCss.includes('background:transparent!important'), 'loading-overlay must have transparent background');
assert(styleCss.includes('max-width:215px!important'), 'loading-card must be compact pill max-width 215px');
assert(styleCss.includes('border-radius:999px!important'), 'loading-card must have pill border-radius 999px');
assert(styleCss.includes('border-top-color:#38bdf8!important'), 'loading spinner ring must have cyan accent');
console.log('✓ 3. Loading overlay is non-intrusive, docked in corner, and never freezes the desktop or mobile screen.');

console.log('\n=== ALL COMMAND BAR & NON-BLOCKING LOADING TESTS PASSED! ===');


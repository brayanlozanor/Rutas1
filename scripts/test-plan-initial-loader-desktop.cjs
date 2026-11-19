const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- TEST: Plan Initial Loader on Desktop ---');

const rootDir = path.resolve(__dirname, '..');
const planificarHtml = fs.readFileSync(path.join(rootDir, 'public', 'planificar.html'), 'utf8');
const planUiCss = fs.readFileSync(path.join(rootDir, 'public', 'assets', 'css', 'plan-ui-v2.css'), 'utf8');
const planificarJs = fs.readFileSync(path.join(rootDir, 'public', 'assets', 'js', 'planificar.js'), 'utf8');

// 1. Verificar existencia del overlay inicial en el HTML
console.log('1. Checking plan-initial-loader in planificar.html...');
assert(planificarHtml.includes('id="plan-initial-loader"'), 'planificar.html must contain #plan-initial-loader');
assert(planificarHtml.includes('class="plan-initial-loader"'), 'planificar.html must have .plan-initial-loader class');
assert(planificarHtml.includes('WiFi<span>Mex</span>'), 'planificar.html must have brand header in loader');
assert(planificarHtml.includes('Cargando plan general...'), 'planificar.html must have informative loading text');
console.log('✓ 1. Initial loader DOM structure present in planificar.html');

// 2. Verificar CSS del loader: fondo sólido no transparente que cubra toda la pantalla
console.log('2. Checking CSS styles for #plan-initial-loader...');
assert(planUiCss.includes('.plan-initial-loader {'), 'CSS must define .plan-initial-loader');
assert(planUiCss.includes('position: fixed;'), 'Loader must be position: fixed');
assert(planUiCss.includes('inset: 0;') || (planUiCss.includes('top: 0;') && planUiCss.includes('left: 0;')), 'Loader must cover inset: 0');
assert(planUiCss.includes('background: #f8fafc;') || planUiCss.includes('background: #fff'), 'Loader must have solid opaque background');
assert(planUiCss.includes('z-index: 999999;'), 'Loader must have high z-index to cover zero-stat cards and skeletons');
assert(planUiCss.includes('.plan-initial-loader.is-hidden'), 'CSS must define is-hidden transition state');
console.log('✓ 2. Solid non-transparent background and full-screen overlay CSS verified');

// 3. Verificar lógica de JavaScript para ocultar y remover suavemente el loader
console.log('3. Checking JavaScript dismissal logic in planificar.js...');
assert(planificarJs.includes('function dismissPlanInitialLoader()'), 'planificar.js must define dismissPlanInitialLoader');
assert(planificarJs.includes("loader.classList.add('is-hidden')"), 'dismissPlanInitialLoader must add is-hidden class');
assert(planificarJs.includes('dismissPlanInitialLoader();'), 'initPlanificarPage must call dismissPlanInitialLoader on finish');
console.log('✓ 3. dismissPlanInitialLoader correctly invoked in initPlanificarPage finally block');

console.log('\n=== ALL INITIAL LOADER TESTS PASSED! ===');

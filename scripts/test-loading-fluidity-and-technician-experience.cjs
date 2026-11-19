const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- TEST: Dual Loading Overlay & Zero-Friction Technician Experience ---');

const apiJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/api.js'), 'utf8');
const planificarJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/planificar.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/style.css'), 'utf8');
const techCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/technician-dashboard.css'), 'utf8');

// 1. Dual-mode Loading Overlay in api.js
console.log('1. Verificando lógica dual de carga en api.js...');
assert(apiJs.includes("forceCenter || !window.netopsInitialLoadDone"), 'showLoading must check forceCenter or initial load');
assert(apiJs.includes("overlay.classList.add('loading-centered')"), 'showLoading must add loading-centered on initial load');
assert(apiJs.includes("overlay.classList.add('loading-docked')"), 'showLoading must add loading-docked for background syncs');
assert(apiJs.includes("window.netopsInitialLoadDone = true"), 'hideLoading must set window.netopsInitialLoadDone to true');
assert(apiJs.includes("overlay.style.pointerEvents = 'none'"), 'Loading overlay must have pointer-events none');
console.log('✓ 1. api.js implementa carga centrada en apertura y pill de esquina en sincronizaciones.');

// 2. Centered & Docked CSS styling in style.css
console.log('2. Verificando estilos en style.css...');
assert(styleCss.includes('.loading-overlay.loading-centered'), 'style.css must have .loading-overlay.loading-centered');
assert(styleCss.includes('#netops-loading.loading-centered'), 'style.css must have #netops-loading.loading-centered');
assert(styleCss.includes('pointer-events:none!important'), 'Overlay in style.css must have pointer-events none');
console.log('✓ 2. style.css define diseño centrado WiFiMex y docked sin bloqueo.');

// 3. Technician & Mobile View non-intrusive CSS in technician-dashboard.css
console.log('3. Verificando estilos en technician-dashboard.css...');
assert(techCss.includes('.loading-overlay:not(.loading-centered)'), 'technician-dashboard.css must style docked pill with :not(.loading-centered)');
assert(techCss.includes('body.plan-technician-view .loading-overlay:not(.loading-centered)'), 'technician view must style docked pill');
assert(techCss.includes('.loading-overlay.loading-centered'), 'technician-dashboard.css must preserve centered initial loading');
assert(techCss.includes('body.plan-technician-view .loading-overlay.loading-centered'), 'technician view must support centered initial loading');
assert(techCss.includes('body.plan-technician-view .nt'), 'technician view must customize toast notifications');
assert(techCss.includes('bottom: 84px !important'), 'technician toasts must be above bottom nav');
console.log('✓ 3. technician-dashboard.css garantiza carga centrada inicial, pill esquinero docked y toasts no invasivos.');

// 4. Fluidity and freeze prevention in planificar.js
console.log('4. Verificando prevención de congelamientos en planificar.js...');
assert(planificarJs.includes('_scheduleDebouncedRenderPlanDays'), 'planificar.js must debounce renderPlanDays on background detail fetches');
assert(planificarJs.includes('safetyHideTimer'), 'initPlanificarPage must have a safety timeout for hideLoading');
assert(planificarJs.includes('maxLegAttempts = Math.min(routedPoints.length - 1, 6)'), 'fetchRoadRoute must cap per-leg routing calls to avoid freeze');
assert(planificarJs.includes('navigator.share({') && planificarJs.includes('files: [file]'), 'WhatsApp sharing on mobile must share image file directly without text');
console.log('✓ 4. planificar.js cuenta con debouncing, límites de OSRM, timeout de seguridad y WhatsApp fluido.');

console.log('=== ALL DUAL LOADING & TECHNICIAN FLUIDITY TESTS PASSED SUCCESSFULLY! ===');


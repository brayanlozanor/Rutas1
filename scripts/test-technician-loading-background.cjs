const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Testing Technician Mobile Loading Background and Early Skeletons ---');

// 1. Verify planificar.html markup and early detection script
const htmlPath = path.join(__dirname, '../public/planificar.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

assert(htmlContent.includes('is-technician-env'), 'planificar.html missing is-technician-env early check in head');
assert(htmlContent.includes('plan-technician-view'), 'planificar.html missing plan-technician-view early body class');
assert(htmlContent.includes('tech-mobile-header'), 'planificar.html missing tech-mobile-header in static DOM');
assert(htmlContent.includes('tech-progress-card'), 'planificar.html missing tech-progress-card in static DOM');
assert(htmlContent.includes('tech-calendar-toolbar'), 'planificar.html missing tech-calendar-toolbar in static DOM');
assert(htmlContent.includes('tech-skeleton-placeholder'), 'planificar.html missing tech-skeleton-placeholder');
assert(htmlContent.includes('tech-day-map-card'), 'planificar.html missing tech-day-map-card in static DOM');
assert(htmlContent.includes('tech-bottom-nav'), 'planificar.html missing tech-bottom-nav');
assert(!htmlContent.includes('id="tech-bottom-nav" aria-label="Opciones del técnico"\n    style="display:none;"'), 'tech-bottom-nav should not have hardcoded style="display:none;"');

assert(htmlContent.includes('id="plan-initial-loader"'), 'planificar.html missing plan-initial-loader');
assert(htmlContent.includes("el.style.background = '#ffffff'") || htmlContent.includes("background:#ffffff"), 'plan-initial-loader must handle solid white background on mobile');

console.log('✓ planificar.html contains early technician detection script, mobile skeleton elements, and responsive initial loader.');

// 2. Verify technician-dashboard.css and plan-ui-v2.css rules
const cssPath = path.join(__dirname, '../public/assets/css/technician-dashboard.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');
const planUiPath = path.join(__dirname, '../public/assets/css/plan-ui-v2.css');
const planUiContent = fs.readFileSync(planUiPath, 'utf8');

assert(planUiContent.includes('.plan-initial-loader'), 'plan-ui-v2.css missing rule for plan-initial-loader');
assert(cssContent.includes('body.plan-technician-view .plan-initial-loader'), 'technician-dashboard.css missing plan-initial-loader solid background rule');
assert(cssContent.includes('background: #ffffff !important;'), 'technician-dashboard.css missing background: #ffffff !important for technician loading');

assert(cssContent.includes('html.is-technician-env body .topbar'), 'CSS missing topbar hiding for is-technician-env');
assert(cssContent.includes('html.is-technician-env body .hero-panel'), 'CSS missing hero-panel hiding for is-technician-env');
assert(cssContent.includes('html.is-technician-env body .plan-kpi-bar'), 'CSS missing plan-kpi-bar hiding for is-technician-env');
assert(cssContent.includes('html.is-technician-env body .plan-sidebar'), 'CSS missing plan-sidebar hiding for is-technician-env');
assert(cssContent.includes('html.is-technician-env body #plan-skeleton-placeholder'), 'CSS missing desktop skeleton hiding for is-technician-env');

assert(cssContent.includes('html.is-technician-env body .tech-mobile-header'), 'CSS missing mobile header show for is-technician-env');
assert(cssContent.includes('html.is-technician-env body .tech-progress-compact'), 'CSS missing progress bar show for is-technician-env');
assert(cssContent.includes('html.is-technician-env body .tech-calendar-toolbar'), 'CSS missing calendar toolbar show for is-technician-env');
assert(cssContent.includes('html.is-technician-env body #tech-day-map-card'), 'CSS missing map card show for is-technician-env');
assert(cssContent.includes('html.is-technician-env body #tech-skeleton-placeholder'), 'CSS missing mobile skeleton show for is-technician-env');

assert(cssContent.includes('html:not(.is-technician-env) body:not(.plan-technician-view) .tech-mobile-header'), 'CSS missing hiding mobile header on desktop');
assert(cssContent.includes('html:not(.is-technician-env) body:not(.plan-technician-view) #tech-skeleton-placeholder'), 'CSS missing hiding mobile skeleton on desktop');

console.log('✓ technician-dashboard.css styles verified for immediate mobile background separation.');

// 3. Verify planificar.js early configuration and deduplication
const jsPath = path.join(__dirname, '../public/assets/js/planificar.js');
const jsContent = fs.readFileSync(jsPath, 'utf8');

assert(jsContent.includes('try { configureTechnicianDashboard(); } catch (_) { }'), 'planificar.js should call configureTechnicianDashboard immediately in initPlanificarPage');
assert(jsContent.includes('const toolbar = document.querySelector(\'.tech-calendar-toolbar\');'), 'planificar.js missing toolbar lookup');
assert(jsContent.includes('titleStrong.textContent = `Hola, ${firstName}`'), 'planificar.js should update existing tech-mobile-header');

console.log('✓ planificar.js contains early dashboard setup and update logic.');

console.log('\n--- ALL TECHNICIAN LOADING BACKGROUND TESTS PASSED! ---');

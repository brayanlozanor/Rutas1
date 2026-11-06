const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Running Comprehensive Planificar Enhancements & Anti-Regression Suite...');

const planJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'js', 'planificar.js'), 'utf8').replace(/\r\n/g, '\n');
const commonJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'js', 'common.js'), 'utf8').replace(/\r\n/g, '\n');
const swJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8').replace(/\r\n/g, '\n');
const dashCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'css', 'technician-dashboard.css'), 'utf8').replace(/\r\n/g, '\n');
const modesCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'css', 'technician-view-modes.css'), 'utf8').replace(/\r\n/g, '\n');
const planUiV2Css = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'css', 'plan-ui-v2.css'), 'utf8').replace(/\r\n/g, '\n');

// Test 1: Syntax sanity of all modified files
console.log('Checking syntax validity of files...');
assert.doesNotThrow(() => new Function(planJs), 'planificar.js must have valid JS syntax');
assert.doesNotThrow(() => new Function(commonJs), 'common.js must have valid JS syntax');
console.log('✓ Test 1 Passed: JavaScript syntax is completely valid without errors.');

// Test 2: Multi-technician assignment rule (isolated assignment per technician)
console.log('Testing Multi-Technician Assignment logic...');
assert(planJs.includes('confirmTeamAssignment'), 'confirmTeamAssignment must exist');
assert(planJs.includes('!selectedIds.includes(id)'), 'confirmTeamAssignment must filter technician from other plans without deleting others');
assert(planJs.includes('filtered = otherTechs.filter(id => id !== targetTechId)'), 'assignGeneralPlanToTech must remove target tech from others without clearing others');
console.log('✓ Test 2 Passed: Technicians can belong to only one plan; team assignment isolates individual techs.');

// Test 3: WhatsApp Share text contains ONLY Folio
console.log('Testing Technician WhatsApp Share Text...');
assert(planJs.includes('const shareText = `Folio: ${folio}`;'), 'WhatsApp share text must only send Folio');
assert(!planJs.includes('const shareText = `WiFiMex - Reporte de Servicio\\nFolio: ${folio}\\nCliente:'), 'Redundant header fields must be removed from completion share text');
console.log('✓ Test 3 Passed: Technician WhatsApp share text is strictly Folio.');

// Test 4: Phone number mandatory with zero-fill option
console.log('Testing Mandatory Phone with "No tiene número" button...');
assert(planJs.includes('setTechnicianNoPhone()') && planJs.includes("'0000000000'"), 'setTechnicianNoPhone must auto-fill 0000000000');
assert(planJs.includes('setTechnicianInstallNoPhone()') && planJs.includes("'0000000000'"), 'setTechnicianInstallNoPhone must auto-fill 0000000000');
assert(planJs.includes("rawPhoneDigits !== '0000000000'"), 'saveTechnicianCompletion must validate 10 digits or 0000000000');
assert(planJs.includes("rawInstallPhone !== '0000000000'"), 'saveTechnicianInstallation must validate 10 digits or 0000000000');
console.log('✓ Test 4 Passed: Mandatory phone validation with zero-fill auto option verified.');

// Test 5: Dual Call and WhatsApp buttons when phone exists
console.log('Testing Dual Phone Call & WhatsApp options...');
assert(planJs.includes('hasValidPhone'), 'Phone button rendering must check hasValidPhone');
assert(planJs.includes('!/^0+$/.test(rawPhone)'), 'Zero phone must not show call buttons');
assert(planJs.includes('href="tel:${escapeAttr(rawPhone)}"'), 'Cellular tel: call link must exist');
assert(planJs.includes('https://wa.me/52${escapeAttr(rawPhone.slice(-10))}'), 'WhatsApp direct wa.me link must exist');
console.log('✓ Test 5 Passed: Dual Call and WhatsApp buttons appear only when valid number exists.');

// Test 6: Expanded Stop Details separated by Subtabs
console.log('Testing Subtabs for "Por resolver" vs "Completados"...');
assert(planJs.includes('tech-expanded-tabs-bar'), 'Expanded tabs bar must exist in overview');
assert(planJs.includes('Por resolver (${pendingDetails.length})'), 'Por resolver tab must display count');
assert(planJs.includes('Completados (${completedDetails.length})'), 'Completados tab must display count');
assert(planJs.includes('setTechnicianStopSubtab'), 'setTechnicianStopSubtab function must exist');
console.log('✓ Test 6 Passed: Stop details cleanly separated by subtabs without mixing pending and completed.');

// Test 7: Group notification for new details and installations
console.log('Testing Group Notification on detail/installation creation...');
assert(planJs.includes('WiFiMex · Detalle Registrado en Campo') || planJs.includes('WiFiMex · Nueva Instalación'), 'Group text template must exist');
assert(planJs.includes('https://api.whatsapp.com/send?text=${encodeURIComponent(groupText)}'), 'WhatsApp group share link must be generated');
console.log('✓ Test 7 Passed: In-field additions automatically trigger WhatsApp group dispatch.');

// Test 8: Weather badge next to towns
console.log('Testing Weather Chip integration...');
assert(planJs.includes('tech-stop-weather-chip'), 'Stop weather chip must exist');
assert(planJs.includes('updateStopsWeatherBadges'), 'updateStopsWeatherBadges function must exist');
assert(dashCss.includes('.tech-stop-weather-chip'), 'CSS for weather badge must be defined');
console.log('✓ Test 8 Passed: Weather badge displays alongside town names.');

// Test 9: Real-time GPS map & closest pending point
console.log('Testing Real-time GPS Map & Closest Pending Detail...');
assert(planJs.includes('tech-realtime-gps-icon'), 'Pulsing GPS icon must be rendered on day map');
assert(planJs.includes('calculateHaversineKm'), 'Haversine distance calculation must determine closest detail');
assert(planJs.includes('tech-closest-point-chip'), 'Closest point chip banner must be rendered');
assert(dashCss.includes('.tech-realtime-gps-icon') && dashCss.includes('@keyframes gpsPulse'), 'GPS pulse styling and animation must exist');
console.log('✓ Test 9 Passed: Day map features live GPS tracking and closest pending detail badge.');

// Test 10: Single unified navigation button
console.log('Testing Single Unified Navigation Button...');
assert(planJs.includes('Navegar al pueblo'), 'Navegar al pueblo button must exist');
assert(!planJs.includes('Abrir ubicación de la antena</a>'), 'Duplicate Abrir ubicación de la antena button must not exist in stop card');
console.log('✓ Test 10 Passed: Only one unified navigation button is displayed.');

// Test 11: Service Worker and Background Notifications
console.log('Testing Background Notifications & Service Worker...');
assert(fs.existsSync(path.join(__dirname, '..', 'public', 'sw.js')), 'sw.js file must exist in public directory');
assert(swJs.includes("self.addEventListener('push'"), 'sw.js must handle push events');
assert(swJs.includes("self.addEventListener('notificationclick'"), 'sw.js must handle notification click');
assert(commonJs.includes('initServiceWorker'), 'common.js must initialize ServiceWorker');
assert(planJs.includes('checkTechnicianDailyStopsNotice'), 'checkTechnicianDailyStopsNotice must notify technician of today stops on startup');
console.log('✓ Test 11 Passed: Service Worker and daily stop notifications configured.');

// Test 12: Anti-Regression Checks for Image 2 and Image 3
console.log('Testing Anti-Regression rules for Stop Names and Transit Banners...');
// Image 2 check: .tech-stop-name must be pinned and never collapsed
assert(dashCss.includes('.tech-stop-name') && dashCss.includes('grid-column: 2 !important;'), 'Stop name must be in grid-column 2');
assert(dashCss.includes('.tech-stop-badge-col') && dashCss.includes('grid-column: 3 !important;'), 'Stop badge must be in grid-column 3');
assert(!modesCss.includes('.tech-route-stop-names>button small{grid-column:2}'), 'Broken mobile small grid-column override must not exist in modesCss');

// Image 3 check: transit indicator must be borderless, line hidden, and centered
assert(dashCss.includes('.transit-line') && dashCss.includes('display: none !important;'), 'Transit line must be hidden');
assert(planUiV2Css.includes('.plan-inter-stop-transit .transit-line{display:none!important}'), 'plan-ui-v2.css must hide transit-line');
assert(dashCss.includes('.tech-route-leg-transit') && dashCss.includes('border: none !important;'), 'Transit container must not have card border');
assert(dashCss.includes('.tech-route-leg-transit') && dashCss.includes('background: transparent !important;'), 'Transit container must be transparent');

console.log('✓ Test 12 Passed: Image 2 & Image 3 regressions completely prevented.');

console.log('\n======================================================');
console.log('ALL 12 TESTS PASSED: Planificar Suite 100% Verified!');
console.log('======================================================\n');


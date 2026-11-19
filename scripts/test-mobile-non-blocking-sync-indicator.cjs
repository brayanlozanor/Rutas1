const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- TEST: Mobile Non-Blocking Realtime Sync & Compact Indicator ---');

const apiJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/api.js'), 'utf8').replace(/\r\n/g, '\n');
const planificarJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/planificar.js'), 'utf8').replace(/\r\n/g, '\n');
const techCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/technician-dashboard.css'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/style.css'), 'utf8');

// 1. Check api.js loadDB honors showOverlay: false
assert(apiJs.includes('options.showOverlay !== false'), 'loadDB must check options.showOverlay !== false');
assert(apiJs.includes('!(isTechOrMobile && (options.preferCache || options.background))'), 'loadDB must suppress overlay on mobile background/cache operations');
console.log('✓ 1. api.js loadDB correctly silences overlay on background/wake sync.');

// 2. Check planificar.js handlePlanWakeRefresh passes silent options
assert(planificarJs.includes('showOverlay: false, globalFeedback: false'), 'handlePlanWakeRefresh must pass showOverlay: false and globalFeedback: false');
console.log('✓ 2. planificar.js handlePlanWakeRefresh runs silently without blocking overlay.');

// 3. Check CSS rules for mobile loading overlay
assert(techCss.includes('pointer-events: none !important'), 'technician-dashboard.css must set pointer-events: none on mobile loading overlay');
assert(techCss.includes('background: transparent !important'), 'technician-dashboard.css must eliminate screen-covering background');
assert(techCss.includes('backdrop-filter: none !important'), 'technician-dashboard.css must eliminate screen blur on mobile');
assert(styleCss.includes('pointer-events:none!important'), 'style.css must set pointer-events:none on mobile loading overlay');
assert(styleCss.includes('background:transparent!important'), 'style.css must eliminate screen-covering background in mobile media query');
console.log('✓ 3. CSS sets non-blocking, non-blurring compact pill on mobile screens.');

console.log('=== ALL MOBILE NON-BLOCKING SYNC TESTS PASSED! ===');


const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Testing Real-Time Only Notifications & No Reload/Refresh Notification Spam...');

const commonJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'js', 'common.js'), 'utf8');
const dashCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'css', 'technician-dashboard.css'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'css', 'style.css'), 'utf8');
const planJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'js', 'planificar.js'), 'utf8');

// Test 1: Session warmup and cooldown variables exist in common.js
assert(commonJs.includes('_netopsSessionStartedAt'), 'Must track session start timestamp');
assert(commonJs.includes('_netopsInitialPollDone'), 'Must track whether initial poll was completed in session');
assert(commonJs.includes('_netopsRecentlyNotified'), 'Must have recent notification deduplication cache');
console.log('✓ Test 1 Passed: Session tracking and deduplication structures exist.');

// Test 2: Initial poll in checkNetworkOrderNotifications is completely silent
assert(commonJs.includes('const isFirstSessionPoll = !_netopsInitialPollDone;'), 'checkNetworkOrderNotifications must detect first poll in session');
assert(commonJs.includes('_netopsInitialPollDone = true;'), 'checkNetworkOrderNotifications must mark first poll done');
assert(commonJs.includes('if (isFirstSessionPoll) {'), 'Must have dedicated silent branch for first poll');
console.log('✓ Test 2 Passed: First poll in session populates cache silently without firing notifications.');

// Test 3: Subsequent polls require orders to be fresh (happening right now <= 25s)
assert(commonJs.includes('isHappeningNow') && commonJs.includes('Math.abs(now - orderTime) <= 25000'), 'Periodic pollers must verify the change happened within 25 seconds');
assert(commonJs.includes('if (isHappeningNow && currentStatus === \'pendiente\')'), 'New order notification must require isHappeningNow');
assert(commonJs.includes('if (isHappeningNow && !isOwnUpdater && prev.status !== currentStatus)'), 'Status change notification must require isHappeningNow');
console.log('✓ Test 3 Passed: Periodic background pollers only notify changes happening right now in real time.');

// Test 4: Priority reminder does not fire upon page reload or initial open
assert(commonJs.includes('if (!lastTime) {\n      // Al abrir o recargar la página, inicializar silenciosamente'), 'checkPriorityUnresolvedReminders must not blast notifications on load/reload');
assert(!commonJs.includes('if ((now - orderTime) >= intervalMs) {\n        lastReminders[key] = now;\n        touched = true;\n        notifyNetworkDetailEvent'), 'Old initial reminder blast must be gone');
console.log('✓ Test 4 Passed: Priority reminders do not fire immediately upon reload/refresh.');

// Test 5: Inbox deduplication preserves unread: false on reload/refresh
assert(commonJs.includes('function addNotificationToInbox'), 'addNotificationToInbox must exist');
assert(!commonJs.includes('inbox[existingIdx].unread = true;'), 'addNotificationToInbox must NOT reset unread to true on already existing item');
console.log('✓ Test 5 Passed: Read notifications in inbox stay read on page reload or refresh.');

// Test 6: Desktop notifications do not renotify
assert(commonJs.includes('renotify: false'), 'Desktop notification must set renotify: false');
assert(!commonJs.includes('renotify: true'), 'renotify: true must not exist');
console.log('✓ Test 6 Passed: Desktop notification spam chime prevented.');

// Test 7: Floating bell is completely removed/hidden for technician, on bottom nav, and on planificar.html
assert(commonJs.includes("if (document.querySelector('.tech-bottom-nav') || document.body.classList.contains('plan-technician-view')") && commonJs.includes('btn.remove()'), 'ensureNotificationCenter must remove bell for tech or bottom nav');
assert(commonJs.includes("if (document.querySelector('.tech-bottom-nav') || document.body.classList.contains('plan-technician-view')") && commonJs.includes('bell.remove()'), 'renderNotificationCenter must remove bell for tech or bottom nav');
assert(dashCss.includes('body.plan-technician-view #notification-bell') && dashCss.includes('#notification-bell.technician-bell'), 'Dashboard CSS must hide bell for technicians');
assert(styleCss.includes('body.plan-technician-view #notification-bell') && styleCss.includes('.tech-bottom-nav ~ #notification-bell'), 'Style CSS must hide bell without relying exclusively on :has()');
console.log('✓ Test 7 Passed: Floating bell is removed and cannot overlap bottom nav or duplicate header bell.');

// Test 8: Live events via handleNetworkOrderEvent pass force: true and check freshness
assert(commonJs.includes('if (payload.timestamp && Math.abs(Date.now() - payload.timestamp) > 30000) return;'), 'handleNetworkOrderEvent must drop stale events older than 30s');
assert(commonJs.includes('force: true'), 'Live real-time user events must pass force: true');
console.log('✓ Test 8 Passed: Live user events are delivered immediately in real time.');

// Test 9: Route stop button and transit indicator layout
assert(dashCss.includes('.tech-stop-name') && dashCss.includes('grid-column: 2 !important'), 'Stop name must be in grid-column 2');
assert(dashCss.includes('.tech-stop-badge-col') && dashCss.includes('grid-column: 3 !important'), 'Stop badge must be in grid-column 3');
assert(dashCss.includes('.tech-route-leg-transit .tech-route-leg-line') && dashCss.includes('display: none !important'), 'Dashed vertical line in transit leg must be hidden');
console.log('✓ Test 9 Passed: Route stop names and transit indicator styling intact.');

console.log('\nALL 9 TESTS PASSED: Real-time notification timing & UI stabilization verified!');

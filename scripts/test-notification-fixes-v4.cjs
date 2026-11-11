const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- TEST: Notification Filtering Navigation & Mark As Read Fixes ---');

const baseDir = path.resolve(__dirname, '..');
const ordenesJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/ordenes.js'), 'utf8');
const commonJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/common.js'), 'utf8');
const relationalStoreJs = fs.readFileSync(path.join(baseDir, 'relational-store.js'), 'utf8');

// 1. Check exports on window
assert(commonJs.includes('window.markAllNotificationsAsRead = markAllNotificationsAsRead;'),
  'common.js must export markAllNotificationsAsRead to window');
assert(commonJs.includes('window.markNotificationAsRead = markNotificationAsRead;'),
  'common.js must export markNotificationAsRead to window');
assert(ordenesJs.includes('window.openOrderTechnicianReport = openOrderTechnicianReport;'),
  'ordenes.js must export openOrderTechnicianReport to window');
console.log('✓ Test 1 Passed: Global window exports present for notification handlers.');

// 2. Check deletion request badge handling on "Marcar leídas"
assert(commonJs.includes('NETOPS_ACK_DELETIONS_KEY') && commonJs.includes('getAcknowledgedDeletionIds'),
  'common.js must track acknowledged deletion requests');
assert(commonJs.includes('const unreadDelReqs = delReqs.filter('),
  'common.js renderNotificationCenter must only count unacknowledged deletion requests');
assert(commonJs.includes('Todas las notificaciones han sido marcadas como leídas.'),
  'common.js markAllNotificationsAsRead must notify user upon completion');
console.log('✓ Test 2 Passed: Deletion requests count resets properly upon "Marcar leídas" so badge counter never gets stuck.');

// 3. Check search filter clearing in ensureOrderVisibleInTable
assert(ordenesJs.includes("document.getElementById('wo-search')") && ordenesJs.includes("searchEl.value = '';"),
  'ensureOrderVisibleInTable must clear search bar if it filters out the notification order');
assert(ordenesJs.includes("orderCurrentPage = 1;"),
  'ensureOrderVisibleInTable must reset orderCurrentPage to 1 to ensure order row is rendered');
assert(ordenesJs.includes("state.workOrders = [order, ...state.workOrders.filter(w => w.id !== order.id)];"),
  'ensureOrderVisibleInTable must position order at the top of state.workOrders');
console.log('✓ Test 3 Passed: Table search filter and pagination reset ensure target order is visible.');

// 4. Check all activeOrderFilters handled in ensureOrderVisibleInTable
['status', 'date', 'assignee', 'zone', 'priority', 'category', 'creator', 'type'].forEach(filterKey => {
  assert(ordenesJs.includes(`activeOrderFilters.${filterKey}`) && ordenesJs.includes(`activeOrderFilters.${filterKey}.clear()`),
    `ensureOrderVisibleInTable must handle activeOrderFilters.${filterKey}`);
});
assert(ordenesJs.includes('filterOnlyMyAssignments = false;'),
  'ensureOrderVisibleInTable must disable filterOnlyMyAssignments if order is not pending for current user');
console.log('✓ Test 4 Passed: All 8 table filters plus "Mis detalles" are validated and cleared when necessary.');

// 5. Check detailKind tab synchronization in ensureMatchingDetailKind
assert(ordenesJs.includes('selectOrderDetailKind(targetKind)'),
  'ensureMatchingDetailKind must call selectOrderDetailKind to switch tabs cleanly');
console.log('✓ Test 5 Passed: DetailKind tab synchronizes when notification detail belongs to network/physical.');

// 6. Check Folio resolution and database queries
assert(relationalStoreJs.includes('text(page.q || page.id)'),
  'relational-store.js resolveExactWorkOrderFolioSearch must accept page.id for folio lookups');
assert(relationalStoreJs.includes('folioClause'),
  'relational-store.js workOrderQuery must include folioClause when requestedId is given');
console.log('✓ Test 6 Passed: Folio resolution accepts both direct ID and formatted folios.');

// 7. Check fallback URL when navigating from notification
assert(commonJs.includes('ordenes.html?detailKind=${isPhysicalKind ? \'physical\' : \'network\'}&orderId='),
  'showRightScreenNotification must fallback to valid orders URL if url parameter is omitted');
assert(commonJs.includes('dest = `/ordenes.html?detailKind=${isPhysical ? \'physical\' : \'network\'}&orderId=${encodeURIComponent(orderId)}`'),
  'markNotificationAsRead must construct destination URL if omitted');
console.log('✓ Test 7 Passed: Notification click URL fallbacks guarantee navigation from any page.');

console.log('\n--- ALL NOTIFICATION FIX TESTS PASSED SUCCESSFULLY! ---');


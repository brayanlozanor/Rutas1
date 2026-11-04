const fs = require('fs');
const assert = require('assert');

console.log('Testing Modern Modal Design, Compact Evidence Strip, Concise Statuses & Unresolvable Flow...');

const commonJs = fs.readFileSync('public/assets/js/common.js', 'utf8');
const ordenesJs = fs.readFileSync('public/assets/js/ordenes.js', 'utf8');
const ordenesHtml = fs.readFileSync('public/ordenes.html', 'utf8');
const ordersDesignCss = fs.readFileSync('public/assets/css/orders-design-v2.css', 'utf8');

// 1. Modern Modal Design in ordenes.html and CSS
console.log('1. Checking modern modal design and step cards...');
assert(ordenesHtml.includes('modal-modern'), 'ordenes.html must use modal-modern class in #wo-mo');
assert(ordenesHtml.includes('modal-section-card'), 'ordenes.html must have modal-section-card elements in #wo-mo');
assert(ordenesHtml.includes('step-badge'), 'ordenes.html must have step-badge in #wo-mo');
assert(ordenesHtml.includes('modal-modern-footer'), 'ordenes.html must have modal-modern-footer in #wo-mo');
assert(ordenesHtml.includes('btn-modal-primary'), 'ordenes.html must use btn-modal-primary in #wo-mo');
assert(ordenesHtml.includes('btn-modal-secondary'), 'ordenes.html must use btn-modal-secondary in #wo-mo');
assert(ordersDesignCss.includes('.modal-modern {'), 'orders-design-v2.css must define .modal-modern');
assert(ordersDesignCss.includes('.modal-section-card {'), 'orders-design-v2.css must define .modal-section-card');
assert(ordersDesignCss.includes('.step-badge {'), 'orders-design-v2.css must define .step-badge');

// Check that form input IDs are preserved
const requiredIds = [
  'wo-client', 'wo-phone', 'wo-location', 'wo-category', 'wo-detail',
  'wo-node', 'wo-equipment', 'wo-relation-info', 'wo-zone',
  'wo-target-team-field', 'wo-target-btn-soporte', 'wo-target-btn-atencion',
  'wo-assign-field', 'wo-assign-all-btn', 'wo-assign-all-text', 'wo-assign-users-grid',
  'wo-assigned-user', 'wo-assigned-names', 'wo-type', 'wo-priority',
  'wo-priority-minutes', 'wo-priority-interval-box', 'wo-evidence-zone',
  'wo-evidence-input', 'wo-evidence-preview'
];
requiredIds.forEach(id => {
  assert(ordenesHtml.includes(`id="${id}"`), `ordenes.html must preserve input id: ${id}`);
});

// 2. Upgraded Formal Notification Tone
console.log('2. Checking upgraded notification sound...');
assert(commonJs.includes('659.25'), 'common.js must contain E5 659.25Hz');
assert(commonJs.includes('830.61'), 'common.js must contain G#5 830.61Hz');
assert(commonJs.includes('987.77'), 'common.js must contain B5 987.77Hz');
assert(commonJs.includes('1318.51'), 'common.js must contain overtone E6 1318.51Hz');
assert(commonJs.includes('0.24'), 'common.js must feature peak gain around 0.24');

// 3. Clean and Simple Notification Messages (No Folios in Titles, No (a) Parentheses)
console.log('3. Checking clean notification titles and messages...');
assert(!commonJs.includes("`Concluido #${order.id}`"), 'common.js must not format Concluido with #id in title');
assert(!commonJs.includes("`Resuelto #${order.id}`"), 'common.js must not format Resuelto with #id in title');
assert(!commonJs.includes("`Devuelto #${order.id}`"), 'common.js must not format Devuelto with #id in title');
assert(!commonJs.includes("`Reabierto #${order.id}`"), 'common.js must not format Reabierto with #id in title');
assert(!commonJs.includes("' (' + order.clientName + ')'"), 'common.js must not format clientName as (clientName)');
assert(commonJs.includes("title: 'Reporte concluido'"), 'common.js must have clean title Reporte concluido');
assert(commonJs.includes("title: 'Reporte no realizable'"), 'common.js must have clean title Reporte no realizable');
assert(commonJs.includes("transition === 'unresolvable'"), 'common.js must handle unresolvable transition');

// 4. Concise Department-Neutral Status Labels
console.log('4. Checking concise and neutral status labels...');
assert(ordenesJs.includes("label: 'En atención'"), 'ordenes.js must label en_revision as En atención');
assert(ordenesJs.includes("label: 'Resuelto'"), 'ordenes.js must label resuelto_soporte as Resuelto');
assert(ordenesJs.includes("label: 'Devuelto'"), 'ordenes.js must label devuelto_soporte as Devuelto');
assert(ordenesJs.includes("label: 'No realizado'"), 'ordenes.js must label no_realizado as No realizado');
assert(ordenesJs.includes("className: 'is-unresolvable'"), 'ordenes.js must assign is-unresolvable class');
assert(!ordenesJs.includes("'Pendiente (Soporte)'"), 'ordenes.js must not contain redundant Pendiente (Soporte)');
assert(!ordenesJs.includes("'Resuelto por Soporte'"), 'ordenes.js must not contain redundant Resuelto por Soporte');
assert(!ordenesJs.includes("'Devuelto a Soporte'"), 'ordenes.js must not contain redundant Devuelto a Soporte');

// 5. Evidence across all steps and compact evidence strip
console.log('5. Checking evidence attachment across all steps and compact gallery strip...');
assert(ordenesHtml.includes('id="netret-file-input"'), 'ordenes.html must have netret-file-input in return modal');
assert(ordenesHtml.includes('id="netret-evidence-preview"'), 'ordenes.html must have netret-evidence-preview in return modal');
assert(ordenesHtml.includes('id="network-unresolvable-mo"'), 'ordenes.html must have network-unresolvable-mo modal');
assert(ordenesHtml.includes('id="netunres-file-input"'), 'ordenes.html must have netunres-file-input in unresolvable modal');
assert(ordenesHtml.includes('id="netunres-reason"'), 'ordenes.html must have netunres-reason in unresolvable modal');
assert(ordenesHtml.includes('openUnresolvableNetworkModalFromResolve()'), 'ordenes.html must link unresolvable from resolve modal');
assert(ordenesJs.includes('function handleNetretEvidenceFiles'), 'ordenes.js must implement handleNetretEvidenceFiles');
assert(ordenesJs.includes('function handleNetunresEvidenceFiles'), 'ordenes.js must implement handleNetunresEvidenceFiles');
assert(ordenesJs.includes('function openUnresolvableNetworkModal'), 'ordenes.js must implement openUnresolvableNetworkModal');
assert(ordenesJs.includes('function submitNetworkUnresolvable'), 'ordenes.js must implement submitNetworkUnresolvable');
assert(ordenesJs.includes('function confirmNetworkUnresolvableConcluded'), 'ordenes.js must implement confirmNetworkUnresolvableConcluded');
assert(ordenesJs.includes('order-report-evidence-strip'), 'ordenes.js must render order-report-evidence-strip in openOrderTechnicianReport');
assert(ordersDesignCss.includes('.order-report-evidence-strip {'), 'orders-design-v2.css must define .order-report-evidence-strip');
assert(ordersDesignCss.includes('.evidence-strip-thumb {'), 'orders-design-v2.css must define .evidence-strip-thumb');

const styleCss = fs.readFileSync('public/assets/css/style.css', 'utf8');

// 6. Visual Hierarchy & Non-Overlapping Notification Bell
console.log('6. Checking visual hierarchy and non-overlapping notification bell...');
assert(styleCss.includes('.floating-notification-bell .notification-bell-icon:before'), 'style.css must target notification-bell-icon:before');
assert(styleCss.includes('content:none!important;'), 'style.css must disable emoji pseudo-element on notification-bell-icon');
assert(!styleCss.includes('content:"\\1F514"'), 'style.css must not have emoji bell content');
assert(ordersDesignCss.includes('.order-place-main'), 'orders-design-v2.css must define .order-place-main');
assert(ordersDesignCss.includes('.order-client-main'), 'orders-design-v2.css must define .order-client-main');
assert(ordersDesignCss.includes('.order-detail-text'), 'orders-design-v2.css must define .order-detail-text');
assert(ordersDesignCss.includes('.order-assignment-tags .user-color-chip'), 'orders-design-v2.css must style user-color-chip discretely');
assert(ordersDesignCss.includes('padding-right: 74px !important;'), 'orders-design-v2.css must provide right-side clearance in order-table-footer');

assert(!ordenesJs.includes('title: `¿Reabrir detalle #${folio}?`'), 'ordenes.js must not include folio in reopen title');
assert(!ordenesJs.includes('title: `¿Devolver detalle #${folio}?`'), 'ordenes.js must not include folio in return title');
assert(!ordenesJs.includes('title: `¿Concluir detalle #${folio}?`'), 'ordenes.js must not include folio in conclude title');
assert(!ordenesJs.includes('title: `¿Declarar reporte #${folio} no realizable?`'), 'ordenes.js must not include folio in unresolvable title');
assert(!ordenesJs.includes('title: `¿Concluir trámite de reporte #${folio}?`'), 'ordenes.js must not include folio in unresolvable concluded title');

console.log('ALL TESTS PASSED: Modern modal design, compact evidence strip, concise statuses, unresolvable flow, visual hierarchy & notification bell OK!');


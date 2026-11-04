const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Static Plan, Image Section Removal, Admin Evidence Optionality & Involved Notifications...');

const ordenesJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/ordenes.js'), 'utf8');
const commonJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/common.js'), 'utf8');
const planJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/planificar.js'), 'utf8');
const planCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/plan-reference.css'), 'utf8');
const planHtml = fs.readFileSync(path.join(__dirname, '../public/planificar.html'), 'utf8');

// 1. Image section removal in Planificar
console.log('1. Checking image section removal in planificar.js...');
assert(!planJs.includes('${extraDetailsHtml}'), 'planificar.js must not render extraDetailsHtml in day-body');
assert(planJs.includes('weatherMemoryCache = new Map()'), 'planificar.js must cache weather in memory for instant card switches');

// 2. Static Desktop Layout in Planificar
console.log('2. Checking static desktop layout in plan-reference.css and planificar.html...');
assert(planCss.includes('#plan-panel') && (planCss.includes('height: 100%!important') || planCss.includes('height:100%!important')), 'plan-reference.css must lock plan-panel height to 100% on desktop');
assert(planCss.includes('.plan-days') && (planCss.includes('overflow-y: auto!important') || planCss.includes('overflow-y:auto!important')), 'plan-reference.css must make plan-days the dedicated static scrollable box');
assert(planCss.includes('.hero-panel.compact-hero') && (planCss.includes('display: none!important') || planCss.includes('display:none!important')), 'plan-reference.css must hide redundant hero on desktop');
assert(!planHtml.includes('id="plan-panel" class="panel active" style="height:100%;overflow:auto"'), 'planificar.html must not force overflow:auto on plan-panel inline');

// 3. Admin Evidence is strictly Optional (No mandatory legend for Admin)
console.log('3. Checking Admin evidence optionality in ordenes.js...');
assert(ordenesJs.includes("const isAdmin = typeof userHasRole === 'function' && userHasRole('administrador', 'admin');"), 'ordenes.js must detect admin in syncWODetailKindField');
assert(ordenesJs.includes("if (isAdmin || !isAttention || editingWOId)"), 'ordenes.js must mark evidence Opcional when admin');
assert(!ordenesJs.includes("Reporte: cliente, categoría, detalle específico, evidencias obligatorias y pueblo."), 'ordenes.js must not show evidencias obligatorias in subtitle');
assert(ordenesJs.includes("!isAdminUser && !woEvidencePhotos.length && !existingEvidences.length && userHasRole('atencion_clientes')"), 'ordenes.js saveWO must not enforce evidence on admin');

// 4. Order Detail shows Captured By, Assigned To, and Resolved By
console.log('4. Checking Captured by, Assigned to and Resolved by in openOrderTechnicianReport...');
assert(ordenesJs.includes("orderReportField('user', 'Capturado por'"), 'ordenes.js must display Capturado por');
assert(ordenesJs.includes("orderReportField('user', 'Asignado a'"), 'ordenes.js must display Asignado a');
assert(ordenesJs.includes("orderReportField('check', 'Resuelto por'"), 'ordenes.js must display Resuelto por');
assert(ordenesJs.includes("Aceptado y concluido por Atención"), 'ordenes.js must display acceptance by Attention when resolved and completed');

// 5. Notifications for All Involved Users
console.log('5. Checking notifications to all involved parties in common.js...');
assert(commonJs.includes("isUserInvolvedInReport"), 'common.js must define isUserInvolvedInReport');
assert(commonJs.includes("isCreatedByMe || isAssignedToMe || isPrevAssignee || isResolverMe || isReviewerMe"), 'common.js must check all roles for involved user');

console.log('ALL TESTS PASSED: Static Plan, Image Section Removal, Admin Evidence Optionality & Involved Notifications OK!');

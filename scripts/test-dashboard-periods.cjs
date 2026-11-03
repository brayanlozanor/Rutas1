const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const dashboardHtml = fs.readFileSync('public/dashboard.html','utf8');

for(const label of ['Detalles físicos totales','Agregados hoy','Agregados este mes','Pendientes físicos actuales','Solucionados totales']) assert.match(dashboardHtml,new RegExp(label));

const elements = {
  'dashboard-from': { value: '' },
  'dashboard-to': { value: '' },
  'dashboard-performance-title': { textContent: '' },
  'dashboard-daily-caption': { textContent: '' },
  'dashboard-daily-chart': { innerHTML: '' },
  'dashboard-tech': { value: '' },
  'dashboard-tech-table': { innerHTML: '' }
};
const periodSelects = [{ value: '' }, { value: '' }];
const context = {
  state: {
    users: [
      { id:'admin-abraham',name:'Abraham Paula Iglesias',username:'abraham',role:'administrador',status:'activo' },
      { id:'user-lalo',name:'Lalo',username:'lalo',role:'tecnico',status:'activo' },
      { id:'user-nolve',name:'Nolve Robles Nava',username:'nolve',role:'tecnico',status:'activo' },
      { id:'user-tecn1',name:'TecN1',username:'tecn1',role:'tecnico',status:'activo' },
      { id:'inactive',name:'Técnico inactivo',username:'inactive',role:'tecnico',status:'inactivo' }
    ],
    technicians: [
      { id: 'abraham', userId:'admin-abraham', nombre: 'Abraham Paula Iglesias' },
      { id: 'lalo', userId:'user-lalo', nombre: 'Lalo' },
      { id: 'nolve', userId:'user-nolve', nombre: 'Nolve Robles Nava' },
      { id: 'tecn1', userId:'user-tecn1', nombre: 'TecN1' },
      { id: 'extra', nombre: 'Técnico no visible' }
    ]
  },
  normalizeName: value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
  document: {
    getElementById: id => elements[id] || null,
    querySelectorAll: selector => selector === '[data-dashboard-period]' ? periodSelects : []
  }
};

vm.createContext(context);
vm.runInContext(fs.readFileSync('public/assets/js/dashboard.js', 'utf8'), context);
context.renderAdminDashboard = () => {};

assert.deepEqual(
  Array.from(context.dashboardTechnicianDirectory(), item => item.name),
  ['Lalo', 'Nolve Robles Nava', 'TecN1']
);

assert.equal(context.dashboardMatchesDimensions({
  id:'admin-completion',status:'completada',completedAt:new Date().toISOString(),updatedById:'admin-abraham'
}),true,'Los detalles completados por administradores deben contar en los totales generales');

assert.equal(context.dashboardGoalForPeriod({fromKey:'2026-09-01',toKey:'2026-09-30',from:0,to:0}),88);

for (const [range, title] of [
  ['day', 'Rendimiento diario'],
  ['week', 'Rendimiento semanal'],
  ['fortnight', 'Rendimiento quincenal'],
  ['month', 'Rendimiento mensual']
]) {
  context.setDashboardPeriod(range);
  assert.equal(elements['dashboard-performance-title'].textContent, title);
  assert.ok(elements['dashboard-from'].value);
  assert.ok(elements['dashboard-to'].value);
  assert.deepEqual(periodSelects.map(select => select.value), [range, range]);
}

assert.equal(context.dashboardGoalForPeriod({fromKey:'2026-09-01',toKey:'2026-09-30',from:0,to:0}),350);

context.renderDashboardDailyChart([
  {status:'completada',completedAt:'2026-09-01T12:00:00'},
  {status:'completada',completedAt:'2026-09-01T14:00:00'},
  {status:'completada',completedAt:'2026-09-02T12:00:00'}
],{fromKey:'2026-09-01',toKey:'2026-09-02'});
assert.match(elements['dashboard-daily-chart'].innerHTML,/<svg[\s\S]*<polyline/);
assert.match(elements['dashboard-daily-chart'].innerHTML,/dashboard-line-node/);
assert.doesNotMatch(elements['dashboard-daily-chart'].innerHTML,/analytics-bar-item/);

context.renderDashboardTechTable([
  {status:'completada',completedAt:'2026-09-01T12:00:00',updatedById:'user-lalo'},
  {status:'completada',completedAt:'2026-09-01T13:00:00',updatedById:'admin-abraham'}
],{from:new Date('2026-09-01T00:00:00').getTime(),to:new Date('2026-09-01T23:59:59').getTime()});
assert.match(elements['dashboard-tech-table'].innerHTML,/dashboard-distribution-donut/);
assert.match(elements['dashboard-tech-table'].innerHTML,/Oficina/);
assert.match(elements['dashboard-tech-table'].innerHTML,/>2<\/strong><span>Solucionados/);

context.setDashboardCustomRange();
assert.deepEqual(periodSelects.map(select => select.value), ['custom', 'custom']);
assert.equal(elements['dashboard-performance-title'].textContent, 'Rendimiento personalizado');

console.log('Dashboard periods and technician allowlist: OK');

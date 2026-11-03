const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const elements = {
  'history-date': { value: '2026-08-23' },
  'history-user': { value: '', innerHTML: '' },
  'history-action': { value: '', innerHTML: '' },
  'history-search': { value: '' }
};
const context = {
  state: {
    users: [
      { id:'u1', name:'Lalo', username:'lalo' },
      { id:'u1-copy', name:'Lalo repetido', username:'LALO' },
      { id:'u2', name:'Nolve Robles Nava', username:'nolve' },
      { id:'deleted', name:'Usuario eliminado', username:'deleted', deletedAt:'2026-08-20' }
    ],
    technicians: [{ id:'tech-extra', nombre:'No debe aparecer' }],
    auditLog: [
      { id:'a1', at:'2026-08-23T08:00:00', byId:'u1', byName:'Lalo', byUsername:'lalo', action:'inició sesión' },
      { id:'a2', at:'2026-08-23T09:00:00', byId:'u2', byName:'Nolve Robles Nava', byUsername:'nolve', action:'registró nueva instalación', orderId:'work-2', orderCategory:'instalacion' },
      { id:'a3', at:'2026-08-23T10:00:00', byId:'u2', byName:'Nolve Robles Nava', byUsername:'nolve', action:'terminó detalle técnico' }
    ]
  },
  getWorkOrderFolio: order => order.category === 'instalacion' ? 'NEW-000002' : 'DET-000002',
  normalizeName: value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
  document: { getElementById: id => elements[id] || null }
};

vm.createContext(context);
vm.runInContext(fs.readFileSync('public/assets/js/historial.js','utf8'),context);
context.state.users.push({id:'principal',name:'Abraham Paula Iglesias',username:'abraham',role:'administrador'});
context.state.auditLog.push({id:'a4',at:'2026-08-23T11:00:00',byId:'principal',byName:'Abraham Paula Iglesias',byUsername:'abraham',action:'modificó usuario'});
context.populateHistoryFilters();

assert.match(elements['history-user'].innerHTML,/Lalo/);
assert.match(elements['history-user'].innerHTML,/Nolve Robles Nava/);
assert.doesNotMatch(elements['history-user'].innerHTML,/Usuario eliminado|No debe aparecer|Lalo repetido/);
assert.doesNotMatch(elements['history-user'].innerHTML,/Abraham/);
assert.equal(context.historyRowsForViewer().some(row=>row.byUsername==='abraham'),false);
assert.match(elements['history-action'].innerHTML,/Inició sesión/);
assert.match(elements['history-action'].innerHTML,/instalación nueva/);
assert.match(elements['history-action'].innerHTML,/Completó un detalle/);

elements['history-user'].value='u2';
assert.equal(context.getFilteredHistoryRows().length,2);
elements['history-action'].value='detail-completed';
assert.equal(context.getFilteredHistoryRows().length,1);
elements['history-action'].value='';
elements['history-search'].value='NEW-000002';
assert.equal(context.getFilteredHistoryRows().length,1);
assert.equal(context.historyOrderFolio(context.state.auditLog[1]),'NEW-000002');

const bounds=context.historyDateBounds();
assert.equal(bounds.fromKey,'2026-08-23');
assert.equal(bounds.toKey,'2026-08-23');
console.log('History calendar, users and actions: OK');

const fs = require('node:fs');
const vm = require('node:vm');

const planner = fs.readFileSync('public/assets/js/planificar.js', 'utf8');
const login = fs.readFileSync('public/assets/js/login.js', 'utf8');

function extractFunction(name) {
  const start = planner.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`No se encontro ${name}`);
  const next = planner.indexOf('\nfunction ', start + 10);
  return planner.slice(start, next < 0 ? planner.length : next);
}

const context = {
  state: { workOrders: [] },
  sortDetailsByPriority: items => items.slice()
};
vm.createContext(context);
vm.runInContext([
  extractFunction('isPendingPlanDetail'),
  extractFunction('getPlanDetailCompletionTime'),
  extractFunction('wasDetailResolvedDuringStop'),
  extractFunction('getStopResolvedHistory'),
  extractFunction('getStopDetails'),
  'this.readDetails = getStopDetails;',
  'this.readCompleted = getStopResolvedHistory;'
].join('\n'), context);

const stop = {
  id: 'stop-current',
  type: 'equipment',
  equipmentId: 'eq-1',
  detailIds: ['assigned-pending', 'assigned-completed'],
  createdAt: '2026-09-02T10:00:00.000Z'
};
context.state.workOrders = [
  { id:'assigned-pending', status:'pendiente', equipmentId:'eq-moved' },
  { id:'assigned-completed', status:'completada', equipmentId:'eq-moved', completedAt:'2026-09-02T11:00:00.000Z' },
  { id:'live-pending', status:'pendiente', equipmentId:'eq-1' },
  { id:'old-completed', status:'completada', equipmentId:'eq-1', completedAt:'2026-09-01T09:00:00.000Z' }
];

const visibleIds = context.readDetails(stop).map(item => item.id);
for (const id of ['assigned-pending', 'assigned-completed', 'live-pending']) {
  if (!visibleIds.includes(id)) throw new Error(`La parada oculto ${id}`);
}
if (visibleIds.includes('old-completed')) throw new Error('Un plan nuevo heredo un resuelto anterior');

const completedIds = context.readCompleted(stop).map(item => item.id);
if (!completedIds.includes('assigned-completed')) throw new Error('El completado del plan no aparece');
if (completedIds.includes('old-completed')) throw new Error('El historial incluye un completado anterior al plan');

if (!planner.includes('class="stop-detail-switch pending') || !planner.includes('class="stop-detail-switch completed')) {
  throw new Error('Faltan los contadores visibles de pendientes y completados');
}
if (!login.includes("role === 'tecnico' ? 'planificar.html' : 'dashboard.html'")) {
  throw new Error('El inicio de sesion administrativo no abre el dashboard');
}

console.log('Dashboard inicial y visibilidad de detalles por plan: OK');

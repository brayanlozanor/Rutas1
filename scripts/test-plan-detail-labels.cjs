const fs = require('node:fs');

const js = fs.readFileSync('public/assets/js/planificar.js','utf8');
const css = fs.readFileSync('public/assets/css/plan-stop-detail-grid.css','utf8');

const start = js.indexOf('function renderPlanDetailRow(');
const end = js.indexOf('\nfunction openPlanDetailReport(',start);
if (start < 0 || end < 0) throw new Error('No se encontro renderPlanDetailRow');
const render = js.slice(start,end);

if (!render.includes("const visibleClientName = detail.clientName || 'Sin nombre registrado'")) {
  throw new Error('Falta el nombre de cliente con respaldo');
}
const clientLabels = (render.match(/<b>Cliente:<\/b>/g)||[]).length;
const detailLabels = (render.match(/<b>Detalle:<\/b>/g)||[]).length;
if (clientLabels < 2) throw new Error('Cliente no aparece en pendientes y resueltos');
if (detailLabels < 3) throw new Error('Detalle no aparece en todas las variantes');
if (!css.includes('Cliente y detalle siempre visibles en pendientes y resueltos')) {
  throw new Error('Falta la regla visual para mostrar los datos');
}
if (!css.includes('.stop-resolved-panel>.plan-detail-row.completed-summary')) {
  throw new Error('Falta el ajuste de tarjetas resueltas');
}

console.log('Planificar muestra cliente y detalle en pendientes y resueltos: OK');

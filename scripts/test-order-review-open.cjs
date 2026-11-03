const fs = require('fs');

const orders = fs.readFileSync('public/assets/js/ordenes.js','utf8');
const common = fs.readFileSync('public/assets/js/common.js','utf8');
const nodes = fs.readFileSync('public/assets/js/nodos.js','utf8');
const antennas = fs.readFileSync('public/assets/js/antenas.js','utf8');
const store = fs.readFileSync('relational-store.js','utf8');
const schema = fs.readFileSync('schema-relational-v3.sql','utf8');

const requirements = [
  [orders.includes("order.status = 'en_revision'"), 'Abrir no cambia la orden a En revisión'],
  [orders.includes("userHasRole('administrador','admin')"), 'La apertura no está restringida a administradores'],
  [orders.includes("order.detailKind !== 'network'"), 'Abrir un detalle físico todavía registra una vista'],
  [orders.includes("order.detailKind === 'network' ? orderViewedSummary(order) : ''"), 'Los detalles físicos todavía muestran el seguimiento Visto'],
  [orders.includes("appendOrderFollowUp(order,'review_opened','En revisión')"), 'No se registra el seguimiento de apertura'],
  [orders.includes("'Abierta para revisión', orderReviewOpenedSummary(order)"), 'El detalle no muestra la hora de apertura'],
  [orders.includes("order.reviewOpenedAt = ''") && orders.includes("order.reviewOpenedById = ''"), 'Volver a enviar no reinicia la revisión'],
  [common.includes('async function markSharedDetailInReviewOnOpen'), 'Pueblos y antenas no comparten la apertura automática'],
  [nodes.includes("markSharedDetailInReviewOnOpen(d,'refreshNodeNetworkDetailViews')"), 'Abrir desde Pueblos no inicia la revisión'],
  [antennas.includes("markSharedDetailInReviewOnOpen(d,'refreshAntennaNetworkDetailViews')"), 'Abrir desde Antenas no inicia la revisión'],
  [store.includes("COALESCE(NULLIF(work_orders.review_opened_at,''),NULLIF(excluded.review_opened_at,''))"), 'La primera apertura no está protegida ante aperturas simultáneas'],
  [store.includes("work_orders.status='en_revision'"), 'Un guardado pendiente antiguo puede deshacer En revisión'],
  [schema.includes('review_opened_at TEXT') && schema.includes('review_opened_by TEXT'), 'Faltan columnas de apertura en el esquema']
];

for (const [valid,message] of requirements) {
  if (!valid) throw new Error(message);
}

console.log('Automatic administrator review opening and timestamp: OK');

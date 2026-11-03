const fs = require('fs');

const common = fs.readFileSync('public/assets/js/common.js','utf8');
const orders = fs.readFileSync('public/assets/js/ordenes.js','utf8');
const nodes = fs.readFileSync('public/assets/js/nodos.js','utf8');
const antennas = fs.readFileSync('public/assets/js/antenas.js','utf8');
const planning = fs.readFileSync('public/assets/js/planificar.js','utf8');
const nodesHtml = fs.readFileSync('public/nodos.html','utf8');
const antennasHtml = fs.readFileSync('public/antenas.html','utf8');

const checks = [
  [orders.includes('return `${code} · ${name}`'), 'Órdenes debe mostrar la clave R junto al lugar'],
  [nodesHtml.includes("selectNodeDetailKind('network')") && nodesHtml.includes("selectNodeDetailKind('physical')"), 'Pueblos necesita selector Red/Físicos'],
  [antennasHtml.includes("selectAntennaDetailKind('network')") && antennasHtml.includes("selectAntennaDetailKind('physical')"), 'Antenas necesita selector Red/Físicos'],
  [nodes.includes('detailKind:nodeDetailKind') && antennas.includes('detailKind:antennaDetailKind'), 'Los formularios deben persistir el tipo'],
  [nodes.includes("=== nodeDetailKind") && antennas.includes("=== antennaDetailKind"), 'Las listas deben filtrarse por tipo'],
  [nodes.includes("openSharedNetworkDetailActions('${d.id}','refreshNodeNetworkDetailViews')"), 'Pueblos debe abrir las acciones compartidas de red'],
  [antennas.includes("openSharedNetworkDetailActions('${d.id}','refreshAntennaNetworkDetailViews')"), 'Antenas debe abrir las acciones compartidas de red'],
  [common.includes('requireEvidence:true') && common.includes('copySharedNetworkDetail'), 'Las acciones compartidas deben conservar evidencia y copia controlada'],
  [common.includes("['bajo_rendimiento', 'Lentitud de la red']"), 'Las categorías de red deben estar disponibles fuera de Órdenes'],
  [common.includes("['resurtir_antena', 'Resurtir antena']") && common.includes("['solicitud_respaldo', 'Solicitud de respaldo']"), 'Las categorías administrativas deben estar disponibles en Pueblos y Antenas'],
  [orders.includes("['resurtir_antena', 'Resurtir antena']") && orders.includes("['solicitud_respaldo', 'Solicitud de respaldo']"), 'Las categorías administrativas deben estar disponibles en Órdenes'],
  [planning.includes("'resurtir_antena','solicitud_respaldo'") && planning.includes("solicitud_respaldo: 'Solicitud de respaldo'"), 'Las categorías administrativas deben estar disponibles en Planificar'],
  [common.includes("['instalacion', 'Nueva instalación']") && orders.includes("['instalacion', 'Nueva instalación']") && planning.includes("instalacion: 'Nueva instalación'"), 'Nueva instalación debe estar disponible en todos los formularios físicos']
];

for (const [valid,message] of checks) if (!valid) throw new Error(message);
console.log('Entity detail kind tabs, R label and shared network actions: OK');

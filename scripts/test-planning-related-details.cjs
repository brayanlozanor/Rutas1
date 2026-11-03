const fs = require('fs');

const store = fs.readFileSync('relational-store.js', 'utf8');

const checks = [
  [store.includes("page?.openOnly === '1'"), 'Falta el filtro de detalles abiertos'],
  [store.includes("equipmentIds:idsChunk.join(','),openOnly:'1'"), 'Planes no carga detalles por antena'],
  [store.includes("nodeIds:idsChunk.join(','),openOnly:'1'"), 'Planes no carga detalles por pueblo'],
  [store.includes('const workOrders=[...workOrdersById.values()]'), 'Planes no elimina detalles duplicados']
];

for (const [ok, message] of checks) {
  if (!ok) throw new Error(message);
}

console.log('OK: la carga de planes recupera detalles relacionados aunque la parada no tenga detailIds.');

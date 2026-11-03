const fs = require('fs');

const api = fs.readFileSync('public/assets/js/api.js','utf8');
const worker = fs.readFileSync('worker.js','utf8');
const store = fs.readFileSync('relational-store.js','utf8');
const planning = fs.readFileSync('public/assets/js/planificar.js','utf8');
const planHtml = fs.readFileSync('public/planificar.html','utf8');

function assert(condition,message){if(!condition)throw new Error(message);}

assert(api.includes("currentPage === 'planificar.html' ? {includeMapCatalog:'1'} : {}"),'Planificar no solicita el catalogo completo');
assert(worker.includes("'includeMapCatalog'"),'Worker no acepta includeMapCatalog');
assert(store.includes("includeMapCatalog?loadPlanningMapCatalog(env):Promise.resolve(null)"),'Planning no carga el catalogo ligero');
assert(store.includes('WHERE e.deleted_at IS NULL AND e.lat IS NOT NULL AND e.lng IS NOT NULL'),'El catalogo no filtra antenas ubicables activas');
assert(store.includes('WHERE n.deleted_at IS NULL AND n.lat IS NOT NULL AND n.lng IS NOT NULL'),'El catalogo no filtra pueblos ubicables activos');
assert(store.includes('mapVeryHigh:Number(row.map_very_high)||0'),'El catalogo no incluye prioridades de antenas');
assert(store.includes('mapPlannedOpen:Number(row.map_planned_open)||0'),'El catalogo no distingue detalles planificados');
assert(store.includes('mapDetailResolved:Number(row.map_detail_resolved)||0'),'El catalogo no incluye el resumen global de detalles');
assert(planning.includes('bounds.forEach(point => completeBounds.extend(point))'),'Ajustar no incluye el catalogo completo');
assert(planning.includes('Mostrando ${mapEquipment.length} antenas y ${mapNodes.length} pueblos con ubicación'),'El mapa no informa cuantos puntos ubicables recibio');
assert(planning.includes("return {key:'critico',label:'Crítico',color:'#ef4444'"),'Planificar no usa el color critico del Mapa Mikrotik');
assert(planning.includes("return {key:'atencion',label:'Atención',color:'#f59e0b'"),'Planificar no usa el color de atencion del Mapa Mikrotik');
assert(planning.includes("return {key:'pendiente',label:'Pendiente',color:'#3b82f6'"),'Planificar no usa el color pendiente del Mapa Mikrotik');
assert(planning.includes("return {key:'despejado',label:'Despejado',color:'#22c55e'"),'Planificar no usa el color despejado del Mapa Mikrotik');
const planningAssetVersion = planHtml.match(/planificar\.js\?v=(\d{8})[^"'\s]*/);
assert(planningAssetVersion && planningAssetVersion[1] >= '20260831','Planificar conserva en cache el mapa anterior');

console.log('Planificar full antenna/node map catalog: OK');

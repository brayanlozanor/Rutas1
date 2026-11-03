const fs = require('fs');
const vm = require('vm');

const api = fs.readFileSync('public/assets/js/api.js', 'utf8');
const common = fs.readFileSync('public/assets/js/common.js', 'utf8');
const relational = fs.readFileSync('relational-store.js', 'utf8');
const planner = fs.readFileSync('public/assets/js/planificar.js', 'utf8');
const antennas = fs.readFileSync('public/assets/js/antenas.js', 'utf8');
const nodes = fs.readFileSync('public/assets/js/nodos.js', 'utf8');
const technicianRoute = fs.readFileSync('public/assets/js/tecnico-ruta.js', 'utf8');

const requestedMatch = api.match(/function getWorkOrderRequestedText[\s\S]*?\n}\n/);
if (!requestedMatch) throw new Error('Missing getWorkOrderRequestedText');

const context = {
  normalizeName: value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
};
vm.createContext(context);
vm.runInContext(`${requestedMatch[0]}; this.cleanRequested = getWorkOrderRequestedText;`, context);

const repeated = 'Revisar panel solar y antena no prende - Revisar panel solar y antena no prende';
const cleaned = context.cleanRequested({ title:'Revisar panel solar y antena no prende', description:repeated });
if (cleaned !== 'Revisar panel solar y antena no prende') {
  throw new Error(`Repeated detail was not collapsed: ${cleaned}`);
}

if (!common.includes('const saved = await context.onComplete(result);')) {
  throw new Error('Completion modal does not await the save callback');
}
if (!common.includes("button.textContent = 'Guardando...'")) {
  throw new Error('Completion button is not locked while saving');
}
for(const feature of ["addEventListener('wheel'",'evidence-viewer-thumbs','downloadCurrentEvidence','toggleEvidenceFullscreen',"event.key === 'ArrowLeft'","event.key === 'ArrowRight'","event.key === 'Escape'"]){
  if(!common.includes(feature))throw new Error(`Evidence viewer is missing ${feature}`);
}
for(const source of [antennas,nodes,technicianRoute]){
  if(!source.includes('openEvidenceGalleryEncoded'))throw new Error('An evidence entry point still opens isolated photos');
}
if (!relational.includes('await markPlannedWorkOrders(env,result.workOrders);')) {
  throw new Error('Related map details are missing their planning assignment flag');
}
if (!api.includes("status.key === 'pendiente' && !details.some")) {
  throw new Error('Blue pending state is not restricted to planned details');
}
if (!planner.includes("<div><small>Pueblo o comunidad</small><strong>${escapeHtml(town)}</strong></div>")) {
  throw new Error('Technician completion summary does not show the resolved town');
}
if (!planner.includes("['PUEBLO O COMUNIDAD', town]")) {
  throw new Error('Shared technician image does not show the resolved town');
}
if (!planner.includes('technicianReportTextsMatch(solution, requestedDetail)') || !planner.includes("...(completedWork ? [['TRABAJO REALIZADO', completedWork]] : [])")) {
  throw new Error('Shared technician report does not suppress repeated work text');
}

console.log('Detail completion, shared report deduplication, town and planned-blue rules: OK');

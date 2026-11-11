const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- TEST: Preset Routes Catalog, Recommendations & 1-Click Route Attachment ---');

const baseDir = path.resolve(__dirname, '..');
const presetRoutesJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/preset-routes.js'), 'utf8');
const presetRoutesCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/preset-routes.css'), 'utf8');
const planificarHtml = fs.readFileSync(path.join(baseDir, 'public/planificar.html'), 'utf8');
const rutasHtml = fs.readFileSync(path.join(baseDir, 'public/rutas.html'), 'utf8');

// 1. Verificar carga en sandbox y total de rutas
console.log('1. Checking dataset size and routes initialization...');
const sandbox = {
  window: {},
  document: {
    body: { classList: { contains: () => false }, insertAdjacentHTML: () => {} },
    getElementById: () => null,
    querySelectorAll: () => []
  },
  state: {
    equipment: [
      { id: 'eq-tetelilla', name: 'R59-Tetelilla', lat: 18.10352, lng: -99.43566, region: 'Norte' },
      { id: 'eq-xilocintla', name: 'R38-Xilocintla', lat: 18.16839, lng: -99.38332, region: 'Norte' }
    ],
    nodes: [
      { id: 'nd-xochipala', name: 'Xochipala', lat: 17.8152, lng: -99.6451, zone: 'Centro' },
      { id: 'nd-xalitla', name: 'Xalitla', lat: 18.0055, lng: -99.5441, zone: 'Norte' }
    ],
    weekPlan: {
      __shared_plan__: { _generalPlans: [] }
    }
  },
  gid: (prefix) => `${prefix}_test_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  saveDB: async () => {},
  renderPlan: () => {},
  notify: () => {}
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(presetRoutesJs, sandbox);

assert(Array.isArray(sandbox.PRESET_ROUTES_DATA), 'PRESET_ROUTES_DATA must be an array');
assert(sandbox.PRESET_ROUTES_DATA.length >= 50, `Expected at least 50 preset routes/recorridos, found ${sandbox.PRESET_ROUTES_DATA.length}`);
console.log(`✓ Item 1 Passed: Found ${sandbox.PRESET_ROUTES_DATA.length} pre-made routes and recorridos.`);

// 2. Verificar corredores clave y enlaces a Google Maps
console.log('2. Checking key corridors, towns and Google Maps URLs...');
const findRoute = (id) => sandbox.PRESET_ROUTES_DATA.find(r => r.id === id);

const rIguala = findRoute('corredor-chilpancingo-iguala');
assert(rIguala, 'Ruta Chilpancingo - Iguala must exist');
assert.strictEqual(rIguala.mapsUrl, 'https://maps.app.goo.gl/bLtgPSxBvy1mvBXP7');
assert(rIguala.stops.includes('Xochipala') && rIguala.stops.includes('Tecuexcontitlán'), 'Must include Xochipala and Tecuexcontitlán');
assert(rIguala.continuations.length > 0, 'Must include continuation for Sasamulco / Tlacuitlapa');
assert.strictEqual(rIguala.continuations[0].mapsUrl, 'https://maps.app.goo.gl/DK5SWkYiojBo9VZt7');

const rRioBalsas = findRoute('corredor-chilpancingo-rio-balsas');
assert(rRioBalsas, 'Ruta Chilpancingo - Río Balsas must exist');
assert.strictEqual(rRioBalsas.mapsUrl, 'https://maps.app.goo.gl/3auiFE1kp3s2i4UG9');
assert(rRioBalsas.continuations.some(c => c.mapsUrl === 'https://maps.app.goo.gl/n2EYZDJLgGJUWsHk7'), 'Must include continuation to Totolcintla');

const rCaxitepec = findRoute('corredor-ayutla-caxitepec');
assert(rCaxitepec, 'Ruta Ayutla - Caxitepec must exist');
assert.strictEqual(rCaxitepec.mapsUrl, 'https://maps.app.goo.gl/2KJVHsiXSJQCWnNu5');
assert(rCaxitepec.continuations.some(c => c.stops.includes('Yerba Santa')), 'Must include continuity to Yerba Santa');

const rOmetepec = findRoute('corredor-ometepec-llano-grande');
assert(rOmetepec, 'Ruta Ometepec - Llano Grande must exist');
assert.strictEqual(rOmetepec.mapsUrl, 'https://maps.app.goo.gl/UCCcNzGh7E8M9yrW8');

const rCoyuca = findRoute('corredor-coyuca-la-remontita');
assert(rCoyuca, 'Ruta Coyuca - La Remontita must exist');
assert.strictEqual(rCoyuca.mapsUrl, 'https://maps.app.goo.gl/KEGvf6FAjEB6k5Qw6');

const rRecorridoTlayolapa = findRoute('recorrido-tlayolapa');
assert(rRecorridoTlayolapa, 'Recorrido Tlayolapa must exist');
assert.strictEqual(rRecorridoTlayolapa.stops.length, 14, 'Recorrido Tlayolapa must have 14 stops');
assert.strictEqual(rRecorridoTlayolapa.stops[0], 'Villa Guerrero');
assert.strictEqual(rRecorridoTlayolapa.stops[1], 'Tlayolapa');

console.log('✓ Item 2 Passed: Corridors, stops and Google Maps URLs verified accurately.');

// 3. Recomendaciones de continuidad geográficas
console.log('3. Checking continuity recommendations logic...');
const recsForAhuetlixpa = sandbox.findContinuityRecommendations(['Ahuetlixpa']);
assert(recsForAhuetlixpa.length > 0, 'Must recommend continuity for Ahuetlixpa');
assert(recsForAhuetlixpa[0].stops.includes('San Juan Totolcintla'), 'Must recommend Totolcintla');

const recsForSasamulco = sandbox.findContinuityRecommendations(['Tecuexcontitlán']);
assert(recsForSasamulco.length > 0, 'Must recommend continuity for Tecuexcontitlán / Sasamulco');
assert(recsForSasamulco[0].stops.includes('Tlacuitlapa'), 'Must recommend Tlacuitlapa');

console.log('✓ Item 3 Passed: Continuity engine suggests proper routes.');

// 4. Creación y adjunción de una ruta preestablecida a un plan nuevo
console.log('4. Testing attachPresetRouteToPlan behavior...');
vm.runInContext(`
  attachPresetRouteToPlan('corredor-iguala-xochimilco', true);
`, sandbox);

const plans = sandbox.state.weekPlan.__shared_plan__._generalPlans;
assert(plans.length === 1, 'A new general plan must have been created');
const createdPlan = plans[0];
assert.strictEqual(createdPlan.name, 'Ruta Iguala - Xochimilco');
assert.strictEqual(createdPlan.stops.length, 9, 'Must have 9 stops for Iguala - Xochimilco');

// Verificar vinculación con antenas registradas (Tetelilla y Xilocintla)
const tetelillaStop = createdPlan.stops.find(s => s.name === 'R59-Tetelilla');
assert(tetelillaStop, 'Tetelilla must have matched registered equipment R59-Tetelilla');
assert.strictEqual(tetelillaStop.equipmentId, 'eq-tetelilla');
assert.strictEqual(tetelillaStop.lat, 18.10352);

console.log('✓ Item 4 Passed: 1-click route attachment created plan with equipment-linked coordinates.');

// 5. Verificación de HTML y CSS
console.log('5. Checking HTML and CSS links and markup...');
assert(planificarHtml.includes('assets/css/preset-routes.css'), 'planificar.html must link preset-routes.css');
assert(planificarHtml.includes('assets/js/preset-routes.js'), 'planificar.html must link preset-routes.js');
assert(planificarHtml.includes('openPresetRoutesModal()'), 'planificar.html must contain openPresetRoutesModal trigger');
assert(planificarHtml.includes('plan-continuity-recommendations-banner'), 'planificar.html must have continuity banner container');
assert(planificarHtml.includes('plan-create-preset-suggestions'), 'planificar.html must have preset suggestions in create modal');

assert(rutasHtml.includes('assets/css/preset-routes.css'), 'rutas.html must link preset-routes.css');
assert(rutasHtml.includes('assets/js/preset-routes.js'), 'rutas.html must link preset-routes.js');
assert(rutasHtml.includes('openPresetRoutesModal'), 'rutas.html must contain openPresetRoutesModal button');

assert(presetRoutesCss.includes('.preset-routes-dialog-card'), 'preset-routes.css must style dialog card');
assert(presetRoutesCss.includes('.preset-route-card'), 'preset-routes.css must style route card');
assert(presetRoutesCss.includes('.preset-stops-flow'), 'preset-routes.css must style stops flow');
assert(presetRoutesCss.includes('.plan-continuity-banner'), 'preset-routes.css must style continuity banner');

console.log('✓ Item 5 Passed: HTML and CSS integration complete and verified.');

console.log('\n--- ALL PRESET ROUTES TESTS PASSED! ---');


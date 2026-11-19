const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('🧪 Iniciando verificación de correcciones móviles y sanitización de paradas...');

const baseDir = path.resolve(__dirname, '..');
const cssTechDashboardPath = path.join(baseDir, 'public', 'assets', 'css', 'technician-dashboard.css');
const cssTecnicoRutaPath = path.join(baseDir, 'public', 'assets', 'css', 'tecnico-ruta.css');
const cssPlanUiPath = path.join(baseDir, 'public', 'assets', 'css', 'plan-ui-v2.css');
const jsPresetRoutesPath = path.join(baseDir, 'public', 'assets', 'js', 'preset-routes.js');
const jsPlanificarPath = path.join(baseDir, 'public', 'assets', 'js', 'planificar.js');

// 1. Verificación de CSS
const cssTechDashboard = fs.readFileSync(cssTechDashboardPath, 'utf8');
const cssTecnicoRuta = fs.readFileSync(cssTecnicoRutaPath, 'utf8');
const cssPlanUi = fs.readFileSync(cssPlanUiPath, 'utf8');

console.log('1️⃣ Validando que la barra inferior móvil (.tech-bottom-nav) no tenga fuentes desbordantes (21px/24px) en los textos:');
assert(!cssTechDashboard.includes('.tech-bottom-nav span{font-size:21px'), 'technician-dashboard.css no debe tener font-size:21px en tech-bottom-nav span');
assert(!cssTecnicoRuta.includes('.tech-bottom-nav button span{font-size:24px'), 'tecnico-ruta.css no debe tener font-size:24px en tech-bottom-nav span');
assert(!cssTecnicoRuta.includes('.tech-bottom-nav button span{font-size:21px'), 'tecnico-ruta.css no debe tener font-size:21px en tech-bottom-nav span');
console.log('  ✅ Reglas de 21px/24px eliminadas correctamente de .tech-bottom-nav span.');

console.log('2️⃣ Validando distribución de 3 columnas en la barra inferior (.tech-bottom-nav):');
assert(cssTechDashboard.includes('grid-template-columns: repeat(3, minmax(0, 1fr))') || cssTechDashboard.includes('grid-template-columns:repeat(3,minmax(0,1fr))'), 'Debe existir grid-template-columns con 3 columnas en technician-dashboard.css');
assert(cssPlanUi.includes('grid-template-columns: repeat(3, minmax(0, 1fr)) !important') || cssPlanUi.includes('grid-template-columns:repeat(3,minmax(0,1fr))'), 'Debe existir grid-template-columns con 3 columnas en plan-ui-v2.css');
console.log('  ✅ Barra inferior fijada a 3 columnas exactas.');

console.log('3️⃣ Validando espacio inferior seguro (padding-bottom) para evitar que la barra tape tarjetas:');
assert(cssTechDashboard.includes('calc(85px + env(safe-area-inset-bottom'), 'technician-dashboard.css debe incluir padding-bottom con safe area');
assert(cssPlanUi.includes('calc(85px + env(safe-area-inset-bottom'), 'plan-ui-v2.css debe incluir padding-bottom con safe area');
console.log('  ✅ Espacio inferior de seguridad validado.');

// 4. Verificación de preset-routes.js con nodo que tiene town: 'El Palmar' pero NO name
console.log('4️⃣ Validando lógica de nodo registrado y notas en preset-routes.js:');
const presetRoutesCode = fs.readFileSync(jsPresetRoutesPath, 'utf8');

const mockWindow = {
  state: {
    equipment: [],
    nodes: [
      { id: 'node_100', town: 'El Palmar', lat: 17.64904, lng: -99.60340 }
    ],
    workOrders: []
  }
};

const context = {
  window: mockWindow,
  state: mockWindow.state,
  document: { addEventListener: () => {} },
  navigator: {},
  root: mockWindow,
  console: console,
  gid: (prefix) => `${prefix}_test_123`
};
vm.createContext(context);
vm.runInContext(presetRoutesCode, context);

// Simular buildStopObject mediante la API pública o llamando findSystemLocationMatch
const matched = context.window.findSystemLocationMatch ? context.window.findSystemLocationMatch('El Palmar') : null;
// Si findSystemLocationMatch es interna, verificar llamando attach o build directo en el contexto
const testStopObj = context.window.buildStopObject('El Palmar', 0, 'Parada 1 de Ruta Chilpancingo - Atlixtac');

console.log('  Resultado de buildStopObject con pueblo "El Palmar":', {
  name: testStopObj.name,
  town: testStopObj.town,
  notes: testStopObj.notes
});

assert.strictEqual(testStopObj.name, 'El Palmar', 'El nombre de la parada debe ser "El Palmar"');
assert.strictEqual(testStopObj.town, 'El Palmar', 'El pueblo de la parada debe ser "El Palmar"');
assert(!testStopObj.notes.includes('undefined'), 'Las notas nunca deben contener "undefined"');
assert(testStopObj.notes.includes('El Palmar'), 'Las notas deben incluir "El Palmar"');
console.log('  ✅ preset-routes.js resuelve nodos por town sin generar "undefined".');

// 5. Verificación de getVisibleStopNotes en planificar.js
console.log('5️⃣ Validando sanitización de notas con "undefined" en planificar.js:');
const planificarCode = fs.readFileSync(jsPlanificarPath, 'utf8');

// Extraer la función getVisibleStopNotes
const fnMatch = planificarCode.match(/function getVisibleStopNotes\s*\([\s\S]*?\n\}/);
assert(fnMatch, 'Debe encontrarse getVisibleStopNotes en planificar.js');

const sandbox = {
  getStopDetails: () => []
};
vm.createContext(sandbox);
vm.runInContext(fnMatch[0], sandbox);

const corruptedStop1 = {
  name: 'El Palmar',
  town: 'El Palmar',
  notes: 'Parada 1 de Ruta Chilpancingo - Atlixtac: undefined (Pueblo registrado)'
};

const sanitized1 = sandbox.getVisibleStopNotes(corruptedStop1, []);
console.log('  Resultado sanitizado 1 (con stop.name):', sanitized1);
assert(!sanitized1.includes('undefined'), 'Nota sanitizada no debe incluir "undefined"');
assert(sanitized1.includes('El Palmar'), 'Nota sanitizada debe incluir "El Palmar"');

const corruptedStop2 = {
  name: '',
  town: 'El Palmar',
  notes: 'Parada 1 de Ruta Chilpancingo - Atlixtac: undefined (Pueblo registrado)'
};
const sanitized2 = sandbox.getVisibleStopNotes(corruptedStop2, []);
console.log('  Resultado sanitizado 2 (con stop.town):', sanitized2);
assert(!sanitized2.includes('undefined'), 'Nota sanitizada no debe incluir "undefined"');
assert(sanitized2.includes('El Palmar'), 'Nota sanitizada debe incluir "El Palmar"');

const corruptedStop3 = {
  notes: 'Ruta 1: undefined'
};
const sanitized3 = sandbox.getVisibleStopNotes(corruptedStop3, []);
console.log('  Resultado sanitizado 3 (sin fallback):', sanitized3);
assert(!sanitized3.includes('undefined'), 'Nota sanitizada no debe incluir "undefined"');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE DISPOSICIÓN MÓVIL Y NOTAS PASARON EXITOSAMENTE!');

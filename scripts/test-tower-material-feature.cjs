const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- TEST: Tower Material (Material de Torres / Antenas) ---');

// Mock state
const state = {
  equipment: [
    {
      id: 'eq-1',
      name: 'R73-Atetetla',
      region: 'montana',
      towerSections: '4 tramos de 3m',
      towerRadios: '2 Rocket Prism 5AC, 1 LiteBeam AC',
      towerBatteries: '2 pilas de gel 100ah',
      towerPanels: '2 paneles de 450w',
      towerExtraNotes: 'Gabinete metalico, regulador MPPT 40A',
      towerMaterialPhotos: ['data:image/webp;base64,mock1', 'data:image/webp;base64,mock2'],
      towerMaterialUpdatedAt: '2026-11-09T10:00:00.000Z',
      towerMaterialUpdatedByName: 'Juan Pérez'
    },
    {
      id: 'eq-2',
      name: 'R12-Metlatonoc',
      region: 'costa_chica'
      // sin material registrado
    }
  ],
  nodes: [
    { id: 'node-1', nodeCode: 'N01', town: 'Atetetla' }
  ],
  workOrders: [
    { id: 'wo-1', title: 'Cambio de radio en torre', equipmentId: 'eq-1' },
    { id: 'wo-2', title: 'Revisión cliente en pueblo', nodeId: 'node-1' },
    { id: 'wo-3', title: 'Revisión en torre sin datos previos', equipmentId: 'eq-2' }
  ]
};

// 1. Test findAntennaForDetail
function findAntennaForDetail(detail, stop = null) {
  if (!detail) return null;
  if (detail.nodeId && !detail.equipmentId) return null;
  if (detail.equipmentId) {
    const eq = (state.equipment || []).find(e => e.id === detail.equipmentId && !e.deletedAt);
    if (eq) return eq;
  }
  if (stop && stop.equipmentId && !stop.nodeId && !detail.nodeId) {
    const eq = (state.equipment || []).find(e => e.id === stop.equipmentId && !e.deletedAt);
    if (eq) return eq;
  }
  return null;
}

assert.strictEqual(findAntennaForDetail(state.workOrders[0])?.id, 'eq-1', 'Antenna detail must return eq-1');
assert.strictEqual(findAntennaForDetail(state.workOrders[1]), null, 'Node detail must NOT return an antenna');
assert.strictEqual(findAntennaForDetail(state.workOrders[2])?.id, 'eq-2', 'Antenna detail must return eq-2');
console.log('✓ findAntennaForDetail works as expected (torres sí, nodos no).');

// 2. Test getTowerMaterialShortSummary
function getTowerMaterialShortSummary(eq) {
  if (!eq) return '';
  const parts = [];
  if (eq.towerSections) parts.push(String(eq.towerSections).trim());
  if (eq.towerRadios) parts.push(String(eq.towerRadios).trim());
  if (eq.towerBatteries) parts.push(String(eq.towerBatteries).trim());
  if (eq.towerPanels) parts.push(String(eq.towerPanels).trim());
  if (!parts.length && eq.towerExtraNotes) parts.push(String(eq.towerExtraNotes).trim().slice(0, 45));
  if (!parts.length && eq.towerMaterialNotes) parts.push(String(eq.towerMaterialNotes).trim().slice(0, 45));
  return parts.filter(Boolean).join(' · ') || 'Sin material registrado';
}

const summary1 = getTowerMaterialShortSummary(state.equipment[0]);
assert(summary1.includes('4 tramos de 3m'), 'Summary must contain sections');
assert(summary1.includes('2 Rocket Prism 5AC'), 'Summary must contain radios');
assert(summary1.includes('2 pilas de gel 100ah'), 'Summary must contain batteries');
assert(summary1.includes('2 paneles de 450w'), 'Summary must contain panels');

const summary2 = getTowerMaterialShortSummary(state.equipment[1]);
assert.strictEqual(summary2, 'Sin material registrado', 'Empty equipment must return Sin material registrado');
console.log('✓ getTowerMaterialShortSummary formats cleanly.');

// 3. Test simulating save and edit (free text with typos/custom terms allowed)
function saveTowerMaterialSim(antennaId, formValues, currentUser) {
  const antenna = (state.equipment || []).find(e => e.id === antennaId);
  if (!antenna) return false;

  const sections = String(formValues.sections || '').trim();
  const radios = String(formValues.radios || '').trim();
  const batteries = String(formValues.batteries || '').trim();
  const panels = String(formValues.panels || '').trim();
  const extra = String(formValues.extra || '').trim();

  const parts = [];
  if (sections) parts.push(`Tramos: ${sections}`);
  if (radios) parts.push(`Radios: ${radios}`);
  if (batteries) parts.push(`Pilas: ${batteries}`);
  if (panels) parts.push(`Paneles: ${panels}`);
  if (extra) parts.push(extra);
  const combinedNotes = parts.join('\n');

  antenna.towerSections = sections;
  antenna.towerRadios = radios;
  antenna.towerBatteries = batteries;
  antenna.towerPanels = panels;
  antenna.towerExtraNotes = extra;
  antenna.towerMaterialNotes = combinedNotes;
  antenna.towerMaterialPhotos = Array.isArray(formValues.photos) ? formValues.photos.slice() : [];
  antenna.towerMaterialUpdatedAt = new Date().toISOString();
  antenna.towerMaterialUpdatedByName = currentUser.name || 'Usuario';
  antenna.towerMaterialUpdatedById = currentUser.id || '';
  return true;
}

// Save free text with typos and informal language including radios
saveTowerMaterialSim('eq-2', {
  sections: '3 tramos viejos d 3mts mas 1 tubo de 2 pulg',
  radios: '2 roket prisim y una antena chika litbin',
  batteries: '3 pilas lth usadas y una nueva d gel',
  panels: '2 paneles grandotes y 1 chiko',
  extra: 'El cableado ase falso contacto en la terminal',
  photos: ['photo1.webp', 'photo2.webp']
}, { id: 'tech-1', name: 'Carlos Técnico' });

const eq2 = state.equipment[1];
assert.strictEqual(eq2.towerSections, '3 tramos viejos d 3mts mas 1 tubo de 2 pulg');
assert.strictEqual(eq2.towerRadios, '2 roket prisim y una antena chika litbin');
assert.strictEqual(eq2.towerBatteries, '3 pilas lth usadas y una nueva d gel');
assert.strictEqual(eq2.towerPanels, '2 paneles grandotes y 1 chiko');
assert.strictEqual(eq2.towerMaterialPhotos.length, 2);
assert.strictEqual(eq2.towerMaterialUpdatedByName, 'Carlos Técnico');
console.log('✓ Simulating free text save accepts any informal terminology (including radios) and persists properly.');

// 4. Test re-editing: pre-existing values are available
const prefilledSections = eq2.towerSections;
const prefilledRadios = eq2.towerRadios;
assert.strictEqual(prefilledSections, '3 tramos viejos d 3mts mas 1 tubo de 2 pulg');
assert.strictEqual(prefilledRadios, '2 roket prisim y una antena chika litbin');

// Update again by Soporte/Admin
saveTowerMaterialSim('eq-2', {
  sections: '4 tramos de 3m galvanizados',
  radios: '2 Rocket Prism 5AC Gen2, 1 LiteBeam 5AC 23dBi',
  batteries: eq2.towerBatteries, // keeps existing
  panels: '3 paneles solares 450W', // updated
  extra: 'Cableado corregido y terminales nuevas',
  photos: [...eq2.towerMaterialPhotos, 'photo3.webp']
}, { id: 'admin-1', name: 'Soporte NetOps' });

assert.strictEqual(eq2.towerSections, '4 tramos de 3m galvanizados');
assert.strictEqual(eq2.towerRadios, '2 Rocket Prism 5AC Gen2, 1 LiteBeam 5AC 23dBi');
assert.strictEqual(eq2.towerBatteries, '3 pilas lth usadas y una nueva d gel');
assert.strictEqual(eq2.towerPanels, '3 paneles solares 450W');
assert.strictEqual(eq2.towerMaterialPhotos.length, 3);
assert.strictEqual(eq2.towerMaterialUpdatedByName, 'Soporte NetOps');
console.log('✓ Subsequent re-editing preserves previous values and allows partial/full updates by Soporte & Admin.');

// 5. Verify non-strict UI integration: eye-catching button & reminder
const planificarJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/planificar.js'), 'utf8');
const tecnicoRutaJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/tecnico-ruta.js'), 'utf8');
const commonJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/common.js'), 'utf8');
const relationalStoreJs = fs.readFileSync(path.join(__dirname, '../relational-store.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../public/assets/css/tower-material-modal.css'), 'utf8');

assert(planificarJs.includes('btn-tower-callout'), 'planificar.js must include btn-tower-callout');
assert(planificarJs.includes('clickable-stop-title') && planificarJs.includes('${towerHeaderBtn}'), 'planificar.js must place towerHeaderBtn next to antenna title');
// Confirm button is NOT inside renderPlanDetailRow
const detailRowMatch = planificarJs.match(/function renderPlanDetailRow[\s\S]*?return `[\s\S]*?<\/div>`;\r?\n}/);
assert(detailRowMatch && !detailRowMatch[0].includes('btn-tower-callout') && !detailRowMatch[0].includes('tower-detail-pill'), 'renderPlanDetailRow must NOT contain tower buttons');

assert(planificarJs.includes('tech-summary-tower-reminder'), 'planificar.js must include tech-summary-tower-reminder in completion summary');
assert(planificarJs.includes('openTechnicianCompletionSummary(detail)'), 'saveTechnicianCompletion must open standard completion summary');
assert(tecnicoRutaJs.includes('btn-tower-callout'), 'tecnico-ruta.js must include btn-tower-callout');
assert(tecnicoRutaJs.includes('tech-stop-head') && tecnicoRutaJs.includes('${towerBtn}'), 'tecnico-ruta.js must place towerBtn next to stop name');
const techDetailMatch = tecnicoRutaJs.match(/function renderTechDetail[\s\S]*?return `[\s\S]*?<\/div>\s*`;\r?\n\s*}/);
assert(techDetailMatch && !techDetailMatch[0].includes('btn-tower-callout'), 'renderTechDetail must NOT contain tower material button');

assert(commonJs.includes('tower-mat-radios'), 'common.js must include tower-mat-radios field');
assert(relationalStoreJs.includes('tower_radios'), 'relational-store.js must persist tower_radios');
assert(css.includes('.btn-tower-callout'), 'CSS must define .btn-tower-callout');
assert(css.includes('.tech-summary-tower-reminder'), 'CSS must define .tech-summary-tower-reminder');
console.log('✓ Eye-catching button next to antenna name (not in details), radios field and non-strict completion reminder verified.');

console.log('--- ALL TESTS PASSED SUCCESSFULLY! ---');

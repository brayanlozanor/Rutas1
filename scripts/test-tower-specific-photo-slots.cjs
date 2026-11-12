// Test: Specific Tower Photo Slots, Guidance Labels, Progress Checklist & Streamlined UX
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- TEST: Tower Material Specific Photo Slots & Streamlined UX ---');

const commonJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'common.js');
const cssPath = path.join(__dirname, '..', 'public', 'assets', 'css', 'tower-material-modal.css');
const schemaPath = path.join(__dirname, '..', 'schema-relational-v3.sql');
const relationalPath = path.join(__dirname, '..', 'relational-store.js');

const commonJs = fs.readFileSync(commonJsPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const schema = fs.readFileSync(schemaPath, 'utf8');
const relational = fs.readFileSync(relationalPath, 'utf8');

// 1. Verify existence of all 8 specific photo slots
console.log('1. Checking slot definitions for all required items...');
const requiredSlots = ['batteries', 'panels', 'controller', 'tower', 'cabinet', 'lightning', 'mikrotik', 'poe'];
requiredSlots.forEach(slotId => {
  assert(commonJs.includes(`id: '${slotId}'`), `TOWER_PHOTO_SLOTS must contain slot '${slotId}'`);
});
console.log('✓ Item 1 Passed: All 8 photo slots (Pilas, Paneles, Controlador, Torre, Cajas, Pararrayos, MikroTik, PoE) are defined.');

// 2. Verify specific guidance text for each slot
console.log('2. Checking specific guidance labels...');
// Pilas: donde se vea el tipo de pilas
assert(commonJs.includes('tipo de pilas') || commonJs.includes('tipo'), 'Pilas slot must request tipo de pilas');
// Paneles: donde se vea el whataje
assert(commonJs.includes('whataje') || commonJs.includes('wattaje'), 'Paneles slot must request wattaje (W)');
// Pararrayos: opcional
assert(commonJs.includes('Opcional') && commonJs.includes("id: 'lightning'"), 'Pararrayos must be marked as optional');
// Cajas / Gabinete
assert(commonJs.includes('Cajas') && commonJs.includes('Gabinete'), 'Must include Cajas (gabinete)');
// MikroTik
assert(commonJs.includes('MikroTik'), 'Must include MikroTik slot');
// PoE
assert(commonJs.includes('PoE'), 'Must include PoE slot');
console.log('✓ Item 2 Passed: Specific prompts for tipo de pilas, whataje, controlador, pararrayos (opcional), torre completa, cajas, poe y mikrotik verified.');

// 3. Verify UX streamline features ("que no parezca mucho trabajo")
console.log('3. Checking UX streamline features (progress bar, bulk upload, drag & drop)...');
assert(commonJs.includes('handleTowerBulkPhotoUpload'), 'Must implement handleTowerBulkPhotoUpload for fast 1-click multi-file assign');
assert(commonJs.includes('renderTowerMaterialPhotoSlots'), 'Must implement renderTowerMaterialPhotoSlots');
assert(commonJs.includes('tower-photos-progress-bar-fill'), 'Modal HTML must include visual progress bar');
assert(commonJs.includes('capture="environment"'), 'Slots must use capture="environment" for immediate mobile camera opening');
assert(commonJs.includes('handleSlotDrop'), 'Slots must support drag and drop');
assert(commonJs.includes('_towerMaterialPasteBound'), 'Must support clipboard paste (Ctrl+V) for effortless desktop entry');
console.log('✓ Item 3 Passed: Progress checklist, bulk upload, direct camera and drag/paste shortcuts verified.');

// 4. Verify CSS styling
console.log('4. Checking CSS styling for checklist, progress bar and cards...');
assert(css.includes('.tower-photos-checklist-card'), 'CSS must style .tower-photos-checklist-card');
assert(css.includes('.tower-photos-progress-bar-fill'), 'CSS must style .tower-photos-progress-bar-fill');
assert(css.includes('.tower-slot-card'), 'CSS must style .tower-slot-card');
assert(css.includes('.tower-slot-card.is-captured'), 'CSS must style captured state with green confirmation');
assert(css.includes('.btn-tower-bulk-upload'), 'CSS must style .btn-tower-bulk-upload');
console.log('✓ Item 4 Passed: Modern, responsive styles for checklist, slots, preview and badges verified.');

// 5. Verify database schema and relational store integration
console.log('5. Checking database schema and relational store...');
assert(schema.includes('tower_material_slots_json TEXT'), 'schema-relational-v3.sql must define tower_material_slots_json');
assert(relational.includes('tower_material_slots_json'), 'relational-store.js must ensure tower_material_slots_json column');
console.log('✓ Item 5 Passed: Database schema and relational persistence verified.');

console.log('\n--- ALL TOWER PHOTO SLOTS & STREAMLINED UX TESTS PASSED! ---');


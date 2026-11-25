const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

console.log('--- TEST: Material Modal Ctrl+V Paste, Dispatch Filters & Streamlined Flow ---');

const baseDir = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(baseDir, 'public/material.html'), 'utf8');
const matJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/material.js'), 'utf8');
const css = fs.readFileSync(path.join(baseDir, 'public/assets/css/material-dispatches.css'), 'utf8');

// 1. Static HTML & CSS assertions for larger modal + Ctrl+V image paste UX
assert.match(html, /id="material-mo"[\s\S]*?class="md modal-modern material-catalog-modal"/);
assert.match(html, /Pega una imagen con Ctrl\+V o selecciona archivo/);
assert.match(html, /id="mat-foto-remove-btn"[^>]+onclick="quitarFotoMaterial\(\)"/);
assert.match(html, /id="mat-foto-preview-actions"/);
assert.match(css, /#material-mo \.md\.material-catalog-modal[\s\S]*?max-width:\s*680px/);
assert.match(css, /\.material-photo-remove-btn/);
console.log('✓ 1. Modal de Agregar/Editar material ampliado y con UI de pegado Ctrl+V + vista previa + quitar.');

// 2. Static HTML & CSS assertions for Date Range Filters & Clear Button
assert.match(html, /id="dispatch-date-from"[^>]+type="date"|type="date"[^>]+id="dispatch-date-from"/);
assert.match(html, /id="dispatch-date-to"[^>]+type="date"|type="date"[^>]+id="dispatch-date-to"/);
assert.match(html, /id="dispatch-clear-filters-btn"[^>]+onclick="limpiarFiltrosDispatches\(\)"/);
assert.match(html, /id="tech-dispatch-date-from"/);
assert.match(html, /id="tech-dispatch-date-to"/);
assert.match(html, /id="tech-dispatch-clear-filters-btn"[^>]+onclick="limpiarFiltrosDispatchesTecnico\(\)"/);
assert.match(css, /\.dispatch-date-range-group/);
assert.match(css, /\.dispatch-clear-filters-btn/);
assert.match(css, /\.dispatch-step-tracker/);
console.log('✓ 2. Filtros de rango de fechas (Desde/Hasta), texto/folio/técnico y botón Limpiar presentes en HTML y CSS.');

// 3. Verify redundant confirmations removed in Entrega y Recepción flows
const extractFn = (source, name) => {
  const start = source.indexOf(`async function ${name}(`);
  assert(start >= 0, `Function ${name} must exist`);
  const nextFn = source.indexOf('\nfunction ', start + 1);
  const nextAsync = source.indexOf('\nasync function ', start + 1);
  const candidates = [nextFn, nextAsync].filter(i => i > start);
  const end = candidates.length ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
};

for (const fnName of ['guardarEdicionEnvio', 'guardarEntregaTecnicoASoporte', 'aceptarRecepcionTecnico', 'aceptarEntregaTecnico']) {
  const body = extractFn(matJs, fnName);
  assert(!body.includes('askConfirmation('), `${fnName} must not trigger redundant askConfirmation modal`);
}
console.log('✓ 3. Confirmaciones redundantes eliminadas en flujos de entrega, edición y recepción.');

// 4. Runtime sandbox execution for Ctrl+V paste, remove photo, save photo, date range filter & flow states
function makeEl(id, extra = {}) {
  const classes = new Set(extra.classes || []);
  return {
    id,
    value: extra.value ?? '',
    hidden: extra.hidden ?? false,
    disabled: extra.disabled ?? false,
    textContent: '',
    innerHTML: '',
    src: '',
    style: {},
    dataset: {},
    options: [],
    selectedOptions: [],
    children: [],
    classList: {
      add: (...c) => c.forEach(x => classes.add(x)),
      remove: (...c) => c.forEach(x => classes.delete(x)),
      toggle: (c, force) => {
        if (force === undefined) classes.has(c) ? classes.delete(c) : classes.add(c);
        else if (force) classes.add(c);
        else classes.delete(c);
      },
      contains: c => classes.has(c)
    },
    addEventListener: () => {},
    removeAttribute(attr) { if (attr === 'src') this.src = ''; },
    contains: () => false
  };
}

const elements = new Map([
  ['material-mo', makeEl('material-mo', { classes: ['mo', 'open'] })],
  ['mat-foto', makeEl('mat-foto')],
  ['mat-foto-preview', makeEl('mat-foto-preview', { hidden: true })],
  ['mat-foto-placeholder', makeEl('mat-foto-placeholder', { hidden: false })],
  ['mat-foto-preview-actions', makeEl('mat-foto-preview-actions', { hidden: true })],
  ['mat-foto-status-text', makeEl('mat-foto-status-text')],
  ['mat-foto-dropzone', makeEl('mat-foto-dropzone')],
  ['mat-nombre', makeEl('mat-nombre', { value: 'Antena LiteBeam 5AC' })],
  ['mat-cantidad', makeEl('mat-cantidad', { value: '5' })],
  ['mat-minimo', makeEl('mat-minimo', { value: '2' })],
  ['mat-unidad', makeEl('mat-unidad', { value: 'pieza' })],
  ['mat-package-size', makeEl('mat-package-size', { value: '1' })],
  ['mat-desc', makeEl('mat-desc', { value: 'CPE 5GHz' })],
  ['dispatch-search', makeEl('dispatch-search')],
  ['dispatch-folio-filter', makeEl('dispatch-folio-filter')],
  ['dispatch-tech-filter', makeEl('dispatch-tech-filter', { value: 'all' })],
  ['dispatch-date-from', makeEl('dispatch-date-from')],
  ['dispatch-date-to', makeEl('dispatch-date-to')],
  ['dispatch-clear-filters-btn', makeEl('dispatch-clear-filters-btn')],
  ['dispatch-active-filters-summary', makeEl('dispatch-active-filters-summary')],
  ['dispatches-grid', makeEl('dispatches-grid')],
  ['dispatches-empty', makeEl('dispatches-empty')],
  ['dispatches-empty-title', makeEl('dispatches-empty-title')],
  ['dispatches-empty-desc', makeEl('dispatches-empty-desc')],
  ['dispatches-pagination', makeEl('dispatches-pagination')],
  ['count-status-all', makeEl('count-status-all')],
  ['count-status-pending_receipt', makeEl('count-status-pending_receipt')],
  ['count-status-received', makeEl('count-status-received')],
  ['count-status-pending_handover', makeEl('count-status-pending_handover')],
  ['count-status-completed', makeEl('count-status-completed')],
  ['admin-badge-pending', makeEl('admin-badge-pending')],
  ['chip-status-all', makeEl('chip-status-all', { classes: ['active'] })],
  ['chip-status-pending_receipt', makeEl('chip-status-pending_receipt')],
  ['chip-status-received', makeEl('chip-status-received')],
  ['chip-status-pending_handover', makeEl('chip-status-pending_handover')],
  ['chip-status-completed', makeEl('chip-status-completed')]
]);

const notifications = [];
const savedMaterials = [];

const sandbox = {
  console,
  Date,
  Math,
  Number,
  String,
  Boolean,
  Array,
  Object,
  Map,
  Set,
  RegExp,
  Promise,
  setTimeout,
  clearTimeout,
  window: {},
  document: {
    getElementById: id => elements.get(id) || null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => makeEl('tmp'),
    body: { appendChild: () => {}, dataset: {} },
    documentElement: { dataset: {} }
  },
  state: {
    materials: [],
    technicians: [
      { id: 'tech-1', nombre: 'Carlos López', estado: 'activo' },
      { id: 'tech-2', nombre: 'Ana Ruiz', estado: 'activo' }
    ],
    materialMovements: [
      {
        id: 'mm-1001',
        type: 'give',
        deliveryFolio: 'ENT-000101',
        technicianId: 'tech-1',
        technicianName: 'Carlos López',
        materialName: 'Cable UTP Cat6',
        quantity: 2,
        unit: 'rollo',
        items: [{ materialName: 'Cable UTP Cat6', quantity: 2, unit: 'rollo' }],
        status: 'pending_receipt',
        at: '2026-11-05T15:00:00.000Z'
      },
      {
        id: 'mm-1002',
        type: 'give',
        deliveryFolio: 'ENT-000102',
        technicianId: 'tech-2',
        technicianName: 'Ana Ruiz',
        materialName: 'Antena 5GHz',
        quantity: 3,
        unit: 'pieza',
        items: [{ materialName: 'Antena 5GHz', quantity: 3, unit: 'pieza' }],
        status: 'pending_handover',
        returnGiverSignature: 'data:image/png;base64,techSig',
        returnReceiverSignature: null,
        returnedChange: 1,
        usedQuantity: 2,
        at: '2026-11-12T18:30:00.000Z'
      },
      {
        id: 'mm-1003',
        type: 'give',
        deliveryFolio: 'ENT-000103',
        technicianId: 'tech-1',
        technicianName: 'Carlos López',
        materialName: 'Conectores RJ45',
        quantity: 50,
        unit: 'pieza',
        items: [{ materialName: 'Conectores RJ45', quantity: 50, unit: 'pieza' }],
        status: 'completed',
        returnGiverSignature: 'data:image/png;base64,t',
        returnReceiverSignature: 'data:image/png;base64,s',
        returnedChange: 10,
        usedQuantity: 40,
        at: '2026-11-20T14:00:00.000Z'
      }
    ],
    auditLog: []
  },
  escapeHtml: s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  normalizeName: s => String(s || '').trim().toLowerCase(),
  normalizeRole: s => String(s || '').trim().toLowerCase(),
  getCurrentUser: () => ({ id: 'admin-1', name: 'Soporte Admin', role: 'admin' }),
  gid: prefix => `${prefix}-test-${Math.random().toString(36).slice(2, 6)}`,
  notify: (msg, type = 'ok') => notifications.push({ msg, type }),
  OM: id => elements.get(id)?.classList.add('open'),
  CM: id => elements.get(id)?.classList.remove('open'),
  compressAdminDetailCompletionImage: async file => `data:image/jpeg;base64,COMPRESSED_${file.name || 'clipboard'}`,
  saveRecord: async (table, rec) => {
    if (table === 'materials') savedMaterials.push(rec);
    return true;
  },
  saveRecordWithAudit: async (table, rec) => {
    if (table === 'materials') savedMaterials.push(rec);
    return true;
  },
  fetchDataPage: async () => ({ materials: sandbox.state.materials, total: sandbox.state.materials.length })
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(matJs, sandbox);

(async () => {
  // Test A: Paste image via clipboardData.items when #material-mo is open
  let prevented = false;
  const fakeImageFile = { type: 'image/png', name: 'screenshot.png' };
  const pasteEvent = {
    target: elements.get('mat-nombre'),
    preventDefault: () => { prevented = true; },
    clipboardData: {
      items: [{ kind: 'file', type: 'image/png', getAsFile: () => fakeImageFile }],
      getData: () => ''
    }
  };
  sandbox.handleMaterialClipboardPaste(pasteEvent);
  await new Promise(r => setTimeout(r, 20));

  assert.equal(prevented, true, 'Paste event with image must call preventDefault()');
  assert.equal(elements.get('mat-foto-preview').hidden, false, 'Preview img must be visible after Ctrl+V paste');
  assert.equal(elements.get('mat-foto-placeholder').hidden, true, 'Placeholder must hide when photo is present');
  assert.equal(elements.get('mat-foto-preview-actions').hidden, false, 'Preview actions (Quitar imagen) must be visible');
  assert.equal(elements.get('mat-foto-preview').src, 'data:image/jpeg;base64,COMPRESSED_screenshot.png');

  // Test B: Save material persists pasted image in rec.photo
  await sandbox.guardarMaterial();
  assert.equal(savedMaterials.length, 1, 'Material should be saved');
  assert.equal(savedMaterials[0].photo, 'data:image/jpeg;base64,COMPRESSED_screenshot.png', 'Saved material must store pasted image in photo field');

  // Test C: Remove image via quitarFotoMaterial()
  sandbox.quitarFotoMaterial();
  assert.equal(elements.get('mat-foto-preview').hidden, true, 'Preview img must hide after quitarFotoMaterial()');
  assert.equal(elements.get('mat-foto-placeholder').hidden, false, 'Placeholder must reappear after quitarFotoMaterial()');
  assert.equal(elements.get('mat-foto-preview-actions').hidden, true, 'Preview actions must hide after quitarFotoMaterial()');
  assert.equal(elements.get('mat-foto-preview').src, '');
  console.log('✓ 4. Pegado de imagen con Ctrl+V, vista previa, guardado en campo photo y botón Quitar validados en runtime.');

  // Test D: Date range filtering (Desde / Hasta) + Clear Filters
  elements.get('dispatch-date-from').value = '2026-11-10';
  elements.get('dispatch-date-to').value = '2026-11-15';
  sandbox.renderAdminDispatches();
  assert.equal(elements.get('count-status-all').textContent, 1, 'Date range Nov 10-15 must match exactly 1 dispatch (mm-1002)');
  assert(elements.get('dispatches-grid').innerHTML.includes('ENT-000102') || elements.get('dispatches-grid').innerHTML.includes('REC-000102'), 'Grid must render mm-1002');
  assert(elements.get('dispatches-grid').innerHTML.includes('Confirmar recepción'), 'Admin card must show direct Confirmar recepción button when technician initiated return');
  assert.equal(elements.get('dispatch-clear-filters-btn').disabled, false, 'Clear button must be enabled when date filter is active');

  // Test E: Clear filters restores all 3 dispatches
  sandbox.limpiarFiltrosDispatches();
  assert.equal(elements.get('dispatch-date-from').value, '');
  assert.equal(elements.get('dispatch-date-to').value, '');
  assert.equal(elements.get('count-status-all').textContent, 3, 'Clearing filters must restore all 3 dispatches');
  assert.equal(elements.get('dispatch-clear-filters-btn').disabled, true, 'Clear button must disable when no filters active');

  // Test F: Flow meta & step tracker distinguish tech-initiated return vs support-initiated reception
  const techReturnMeta = sandbox.getDispatchFlowMeta(sandbox.state.materialMovements[1]);
  assert.equal(techReturnMeta.awaitingSupportReception, true);
  assert.equal(techReturnMeta.awaitingTechHandover, false);
  assert.equal(techReturnMeta.step, 3);
  const trackerHtml = sandbox.renderDispatchStepTracker(sandbox.state.materialMovements[1]);
  assert(trackerHtml.includes('Entregado') && trackerHtml.includes('Recibido') && trackerHtml.includes('Devolución') && trackerHtml.includes('Cerrado'));
  console.log('✓ 5. Filtros por rango de fechas, botón Limpiar y estados claros de entrega/recepción validados en runtime.');

  console.log('--- ALL MATERIAL PASTE & DISPATCH FILTER TESTS PASSED! ---');
})().catch(err => {
  console.error(err);
  process.exit(1);
});

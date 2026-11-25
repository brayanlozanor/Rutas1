const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const planificarJs = fs.readFileSync(path.join(root, 'public/assets/js/planificar.js'), 'utf8');
const planificarHtml = fs.readFileSync(path.join(root, 'public/planificar.html'), 'utf8');
const presetRoutesJs = fs.readFileSync(path.join(root, 'public/assets/js/preset-routes.js'), 'utf8');
const rutasJs = fs.readFileSync(path.join(root, 'public/assets/js/rutas.js'), 'utf8');
const tecnicoRutaJs = fs.readFileSync(path.join(root, 'public/assets/js/tecnico-ruta.js'), 'utf8');

console.log('=== VERIFICATION SUITE: Planificar, Técnico y Rutas (6 tareas) ===\n');

function makeStorage() {
  const store = {};
  return {
    getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    _store: store
  };
}

function makeEl(id = '') {
  return {
    id,
    value: '',
    innerHTML: '',
    textContent: '',
    dataset: {},
    style: { setProperty: () => {}, removeProperty: () => {} },
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      toggle(c, force) { if (force === undefined) { if (this._set.has(c)) this._set.delete(c); else this._set.add(c); } else if (force) this._set.add(c); else this._set.delete(c); },
      contains(c) { return this._set.has(c); }
    },
    setAttribute() {},
    getAttribute() { return ''; },
    addEventListener() {},
    focus() {},
    remove() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null
  };
}

const domEls = {};
const getEl = id => (domEls[id] || (domEls[id] = makeEl(id)));
const ls = makeStorage();
const ss = makeStorage();

let mockTechMode = false;
let mockUser = { id: 'u-admin', username: 'admin', name: 'Admin', role: 'administrador' };
let saveCalls = 0;

const sandbox = {
  console,
  URLSearchParams,
  Date,
  Math,
  JSON,
  Set,
  Map,
  Array,
  Object,
  Number,
  String,
  Boolean,
  RegExp,
  Promise,
  setTimeout: fn => { if (typeof fn === 'function') fn(); return 1; },
  clearTimeout: () => {},
  requestAnimationFrame: fn => { if (typeof fn === 'function') fn(); },
  localStorage: ls,
  sessionStorage: ss,
  navigator: { onLine: true },
  window: {
    location: { search: '' },
    innerWidth: 1280,
    matchMedia: () => ({ matches: false }),
    addEventListener: () => {},
    removeEventListener: () => {},
    scrollY: 0,
    scrollTo: () => {},
    netopsCloudLoadOk: true
  },
  document: {
    documentElement: makeEl('html'),
    body: Object.assign(makeEl('body'), {
      insertAdjacentHTML: () => {},
      appendChild: el => { if (el?.id) domEls[el.id] = el; }
    }),
    getElementById: id => getEl(id),
    createElement: tag => makeEl(tag),
    querySelector: () => makeEl('q'),
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  state: {
    equipment: [
      { id: 'eq-wm-real', name: 'Torre WiFi Mex Central', lat: 17.53111, lng: -99.49888, region: 'Centro' }
    ],
    nodes: [
      { id: 'nd-1', nodeCode: 'R101', town: 'AMEYALTEPEC', name: 'AMEYALTEPEC', lat: 17.95, lng: -99.55, zone: 'Centro' }
    ],
    technicians: [
      { id: 'tech-carlos', userId: 'user-carlos', nombre: 'Carlos Perez', usuario: 'carlos', rol: 'tecnico', estado: 'activo' },
      { id: 'tech-lalo', userId: 'user-lalo', nombre: 'Lalo Ruiz', usuario: 'lalo', rol: 'tecnico', estado: 'activo' }
    ],
    workOrders: [
      {
        id: 'wo-nodone-old',
        folio: 'DET-100100',
        nodeId: 'nd-1',
        title: 'Cambiar radio dañado',
        clientName: 'Pedro Ramirez',
        priority: 'alta',
        status: 'no_realizado',
        completedAt: '2026-11-19T18:30:00.000Z',
        technicianReport: {
          result: 'no_realizado',
          reason: 'No había acceso a la azotea',
          stopId: 'stop-old-plan-a',
          planId: 'plan-old-a',
          completedAt: '2026-11-19T18:30:00.000Z'
        },
        incompleteHistory: [{ type: 'detalle', reason: 'No había acceso a la azotea', at: '2026-11-19T18:30:00.000Z', stopId: 'stop-old-plan-a' }]
      },
      {
        id: 'wo-done-today',
        folio: 'DET-100101',
        nodeId: 'nd-1',
        title: 'Ajuste de antena',
        status: 'completada',
        completedAt: '2026-11-23T15:00:00.000Z'
      },
      {
        id: 'wo-nodone-today',
        folio: 'DET-100102',
        nodeId: 'nd-1',
        title: 'Revisión de cableado',
        status: 'no_realizado',
        completedAt: '2026-11-23T16:00:00.000Z',
        technicianReport: {
          result: 'no_realizado',
          reason: 'Lluvia intensa',
          stopId: 'stop-new-plan-b',
          planId: 'plan-b',
          completedAt: '2026-11-23T16:00:00.000Z'
        }
      }
    ],
    weekPlan: {
      __shared__: {
        _generalPlans: [
          {
            id: 'plan-b',
            name: 'Ruta Carlos',
            assignedTechId: 'tech-carlos',
            assignedTechIds: ['tech-carlos'],
            assignedTechName: 'Carlos Perez',
            stops: [
              {
                id: 'stop-new-plan-b',
                type: 'node',
                nodeId: 'nd-1',
                name: 'AMEYALTEPEC',
                lat: 17.95,
                lng: -99.55,
                scheduledDate: '2026-11-23',
                detailIds: ['wo-nodone-old', 'wo-done-today', 'wo-nodone-today'],
                planJoinedAt: '2026-11-23T08:00:00.000Z',
                createdAt: '2026-11-23T08:00:00.000Z'
              }
            ]
          },
          {
            id: 'plan-c',
            name: 'Ruta Norte',
            assignedTechId: '',
            assignedTechIds: [],
            stops: []
          }
        ]
      }
    },
    routes: [],
    materials: []
  },
  getCurrentUser: () => mockUser,
  userHasRole: (...roles) => roles.includes(mockUser.role),
  normalizeRole: r => String(r || '').toLowerCase().trim(),
  normalizeName: s => String(s || '').trim().toLowerCase(),
  escapeHtml: s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  escapeAttr: s => String(s ?? '').replace(/"/g, '&quot;'),
  safeFloat: v => { const n = parseFloat(v); return Number.isFinite(n) ? n : NaN; },
  gid: p => `${p}_${Math.random().toString(36).slice(2, 8)}`,
  localDateKey: () => '2026-11-23',
  formatCalendarDate: d => d,
  sortDetailsByPriority: arr => arr || [],
  pc: () => '#f59e0b',
  pl: p => p || 'Media',
  getDetailFolio: d => d.folio || d.id,
  getWorkOrderRequestedText: d => d.title || '',
  getPlanDetailCategory: () => 'general',
  planCategoryLabel: () => 'General',
  renderDetailLocation: () => '',
  getDetailLocationInfo: () => ({ hasLocation: false }),
  getNodeLabel: n => n?.town || n?.name || '',
  getEquipmentLinkedNodeIds: () => [],
  cloneData: x => JSON.parse(JSON.stringify(x)),
  notify: () => {},
  OM: () => {},
  CM: () => {},
  askConfirmation: async () => true,
  saveDB: async () => { saveCalls++; return true; },
  checkAuth: () => true,
  initCommon: () => {}
};
sandbox.window.state = sandbox.state;
vm.createContext(sandbox);
vm.runInContext(presetRoutesJs, sandbox);
vm.runInContext(planificarJs, sandbox);

(async () => {
  // ---- TASK 1: no_realizado re-appearance & dated badge ----
  console.log('1. Testing Task 1 (no_realizado re-appearance + badge with date)...');
  const stopB = sandbox.state.weekPlan.__shared__._generalPlans[0].stops[0];
  const oldNoDone = sandbox.state.workOrders[0];
  const todayNoDone = sandbox.state.workOrders[2];

  assert.strictEqual(sandbox.isPendingPlanDetail(oldNoDone), true, 'isPendingPlanDetail must include no_realizado');
  const detailsInStopB = sandbox.getStopDetails(stopB);
  assert.ok(detailsInStopB.some(d => d.id === 'wo-nodone-old'), 'Old no_realizado detail must appear in new stopB');
  assert.strictEqual(sandbox.isDetailPendingInStop(oldNoDone, stopB), true, 'Old no_realizado detail must be pending in new stopB');
  assert.strictEqual(sandbox.isDetailPendingInStop(todayNoDone, stopB), false, 'Today no_realizado in same stopB is already attempted for stopB');

  const badgeLabel = sandbox.formatNoRealizadoBadgeLabel(oldNoDone);
  assert.ok(badgeLabel.startsWith('No realizado · ') && badgeLabel.includes('2026'), `Expected dated badge, got "${badgeLabel}"`);

  // Switch to technician view and check rendered HTML in pending group
  mockUser = { id: 'user-carlos', username: 'carlos', name: 'Carlos Perez', role: 'tecnico' };
  const pendingHtml = sandbox.renderPlanDetailsGrouped(detailsInStopB, stopB, 'general', 'pending');
  assert.ok(pendingHtml.includes('wo-nodone-old') && pendingHtml.includes(badgeLabel), 'Pending group must render old no_realizado with dated badge');
  assert.ok(pendingHtml.includes('No había acceso a la azotea'), 'Pending group must show previous reason');
  assert.ok(pendingHtml.includes("openTechnicianCompletionForm('wo-nodone-old')"), 'Technician must be able to complete re-assigned no_realizado detail');
  console.log(`✓ Task 1 passed (badge: "${badgeLabel}").`);

  // ---- TASK 2: Offline resilience ----
  console.log('2. Testing Task 2 (Offline snapshot persistence & never clearing screen)...');
  sandbox.savePlanificarOfflineSnapshot();
  assert.ok(ls.getItem('netops_planificar_offline_snapshot_v1'), 'Offline snapshot must be stored in localStorage');

  const backup = sandbox.capturePlanStateBackup();
  // Simulate network failure wiping state
  sandbox.state.weekPlan = {};
  sandbox.state.workOrders = [];
  sandbox.window.netopsCloudLoadOk = false;
  const restored = sandbox.restorePlanBackupIfNeeded(backup);
  assert.strictEqual(restored, true, 'Backup must restore when cloud load fails');
  assert.strictEqual(sandbox.state.workOrders.length, 3, 'All workOrders must be preserved after offline failure');

  // Simulate cold start offline from localStorage snapshot
  sandbox.state.weekPlan = {};
  sandbox.state.workOrders = [];
  sandbox.state.equipment = [];
  sandbox.state.nodes = [];
  const hydrated = sandbox.hydratePlanificarFromOfflineSnapshot();
  assert.strictEqual(hydrated, true, 'Must hydrate from offline snapshot');
  assert.strictEqual(sandbox.state.workOrders.length, 3, 'Snapshot must restore workOrders');
  assert.strictEqual(sandbox.state.equipment.length, 1, 'Snapshot must restore equipment');
  console.log('✓ Task 2 passed (snapshot save, offline cold boot, and failure rollback verified).');

  // ---- TASK 3: Technician assignment end-to-end via unified left menu ----
  console.log('3. Testing Task 3 (Technician assignment persistence + unified left menu)...');
  assert.ok(planificarHtml.includes('id="plan-assign-menu-box"'), 'planificar.html must have unified left assignment menu');
  assert.ok(!planificarHtml.includes('id="plan-tech-assign-panel-mo"'), 'planificar.html must not duplicate assignment in a redundant modal');
  assert.ok(planificarJs.includes('renderTechnicianMobileLoadingHtml'), 'planificar.js must include mobile loading animation');
  assert.ok(planificarJs.includes('stop-action-count'), 'planificar.js must include labeled Pendientes/Completados desktop buttons');

  mockUser = { id: 'u-soporte', username: 'soporte', name: 'Soporte', role: 'soporte' };
  assert.strictEqual(sandbox.canAssignPlanTechnicians(), true, 'soporte must be allowed to assign technicians');
  mockUser = { id: 'u-admin', username: 'admin', name: 'Admin', role: 'administrador' };
  assert.strictEqual(sandbox.canAssignPlanTechnicians(), true, 'administrador must be allowed to assign technicians');
  const prevSaves = saveCalls;
  // Move Carlos from plan-b ("Ruta Carlos") to plan-c ("Ruta Norte") via dedicated panel
  await sandbox.assignTechInPanel('plan-c', 'tech-carlos');
  assert.ok(saveCalls > prevSaves, 'assignTechInPanel must persist via saveDB');
  const planB = sandbox.state.weekPlan.__shared__._generalPlans.find(p => p.id === 'plan-b');
  const planC = sandbox.state.weekPlan.__shared__._generalPlans.find(p => p.id === 'plan-c');
  assert.deepStrictEqual(Array.from(planC.assignedTechIds), ['tech-carlos'], 'plan-c must have Carlos assigned');
  assert.deepStrictEqual(Array.from(planB.assignedTechIds), [], 'plan-b must no longer have Carlos');
  assert.strictEqual(sandbox.isPlanAssignedToTech(planB, 'tech-carlos'), false, 'Unassigned plan named "Ruta Carlos" must NOT falsely match Carlos');
  assert.strictEqual(sandbox.isPlanAssignedToTech(planC, 'tech-carlos'), true, 'plan-c must match Carlos');

  // Unassign Carlos from plan-c
  await sandbox.unassignTechInPanel('plan-c', 'tech-carlos');
  assert.deepStrictEqual(Array.from(planC.assignedTechIds), [], 'unassignTechInPanel must clear assignedTechIds');
  assert.strictEqual(planC.assignedTechId, '', 'unassignTechInPanel must clear assignedTechId');

  // Test __unassign__ option in assignGeneralPlanToTech
  await sandbox.assignTechInPanel('plan-c', 'tech-lalo');
  sandbox.selectGeneralPlan('plan-c');
  const unassignPromise = sandbox.assignGeneralPlanToTech('__unassign__');
  sandbox.resolvePlanAssignment(true);
  await unassignPromise;
  assert.strictEqual(planC.assignedTechId, '', '__unassign__ must clear assignedTechId, never store literal __unassign__');
  assert.deepStrictEqual(Array.from(planC.assignedTechIds), [], '__unassign__ must clear assignedTechIds');
  console.log('✓ Task 3 passed (assign, move, unassign, __unassign__, mobile visibility sync verified).');

  // ---- TASK 4: WiFi-Mex principal origin in ALL routes ----
  console.log('4. Testing Task 4 (WiFi-Mex principal stop/origin in all routes)...');
  const wmOrigin = sandbox.findWiFiMexOriginData();
  assert.strictEqual(wmOrigin.equipmentId, 'eq-wm-real', 'Must find real WiFi-Mex tower case-insensitively with spaces');
  assert.strictEqual(wmOrigin.lat, 17.53111, 'Must use real coordinates of WiFi-Mex tower');

  const routed = sandbox.ensureRoutePointsStartAtWiFiMex([{ id: 's1', name: 'AMEYALTEPEC', lat: 17.95, lng: -99.55 }]);
  assert.strictEqual(routed.length, 2, 'Must prepend WiFi-Mex origin to routes not starting at WiFi-Mex');
  assert.strictEqual(routed[0].lat, 17.53111, 'Route origin must have WiFi-Mex real lat');

  const dirUrl = sandbox.getDrivingDirectionsUrl([{ name: 'AMEYALTEPEC', lat: 17.95, lng: -99.55 }]);
  assert.ok(dirUrl.includes('origin=17.53111%2C-99.49888'), `Driving URL must start from WiFi-Mex, got ${dirUrl}`);

  // Test rutas.js WiFi-Mex origin helper
  const rutasCtx = {
    window: {},
    document: { getElementById: () => makeEl(), body: makeEl(), querySelectorAll: () => [] },
    state: { equipment: [{ id: 'eq-w', name: 'wifi-mex', lat: 17.5322, lng: -99.4977 }], nodes: [], routes: [] }
  };
  vm.createContext(rutasCtx);
  vm.runInContext(rutasJs, rutasCtx);
  const rutasCoords = rutasCtx.ensureRouteCoordsStartAtWiFiMex([{ name: 'Iguala', lat: 18.34, lng: -99.54 }]);
  assert.strictEqual(rutasCoords.length, 2, 'rutas.js must prepend WiFi-Mex origin');
  assert.strictEqual(rutasCoords[0].lat, 17.5322, 'rutas.js must use real WiFi-Mex coordinates');

  // Test tecnico-ruta.js WiFi-Mex origin + dated no_realizado badge
  const techCtx = {
    window: {},
    document: { getElementById: () => null, querySelectorAll: () => [], addEventListener: () => {}, body: makeEl() },
    localStorage: makeStorage(),
    sessionStorage: makeStorage(),
    navigator: { onLine: true },
    state: { equipment: [{ id: 'eq-w2', name: 'WIFI MEX', lat: 17.5333, lng: -99.4966 }], nodes: [], workOrders: [] },
    safeFloat: v => { const n = parseFloat(v); return Number.isFinite(n) ? n : NaN; },
    escapeTech: s => String(s || ''),
    formatTechDateTime: s => String(s || ''),
    rById: () => ({ n: 'Centro' }),
    sortDetailsByPriority: a => a,
    pc: () => '#f59e0b',
    pl: () => 'Media'
  };
  vm.createContext(techCtx);
  vm.runInContext(tecnicoRutaJs, techCtx);
  const techRouted = techCtx.window.ensureTechStopsStartAtWiFiMex([{ id: 's1', name: 'AMEYALTEPEC', lat: 17.95, lng: -99.55 }]);
  assert.strictEqual(techRouted[0].lat, 17.5333, 'tecnico-ruta.js must prepend real WiFi-Mex origin');
  const techBadge = techCtx.window.formatTechNoRealizadoBadge(oldNoDone);
  assert.ok(techBadge.startsWith('No realizado · ') && techBadge.includes('2026'), `tecnico-ruta.js badge must include date, got "${techBadge}"`);
  console.log('✓ Task 4 passed (WiFi-Mex real-coordinate origin verified in planificar.js, preset-routes.js, rutas.js, tecnico-ruta.js).');

  // ---- TASK 5: Clean technician summary ----
  console.log('5. Testing Task 5 (Clean technician self-progress summary)...');
  await sandbox.assignTechInPanel('plan-b', 'tech-carlos');
  sandbox.selectGeneralPlan('plan-b');
  mockUser = { id: 'user-carlos', username: 'carlos', name: 'Carlos Perez', role: 'tecnico' };
  const stats = sandbox.getTechnicianDayProgressStats('2026-11-23');
  assert.strictEqual(stats.completed, 1, 'Should count 1 completed');
  assert.strictEqual(stats.pending, 1, 'Should count 1 pending (re-assigned old no_realizado)');
  assert.strictEqual(stats.noRealizadoToday, 1, 'Should count 1 no_realizado marked today');

  sandbox.openTechnicianProductivitySummary();
  const summaryHtml = getEl('tech-productivity-modal-body').innerHTML;
  assert.ok(summaryHtml.includes('Completados') && summaryHtml.includes('Pendientes') && summaryHtml.includes('No realizados'), 'Summary modal must show Completados, Pendientes, No realizados');
  assert.ok(!summaryHtml.includes('Por confirmar') && !summaryHtml.includes('Ver material'), 'Summary modal must NOT show administrative material dispatch noise');
  console.log('✓ Task 5 passed (clean technician summary verified).');

  // ---- TASK 6: Fast non-blocking technician load ----
  console.log('6. Testing Task 6 (Fast non-blocking technician load, no intrusive popups/banners)...');
  const initFnMatch = planificarJs.match(/async function initPlanificarPage\(\)[\s\S]*?\n\}/);
  assert.ok(initFnMatch, 'initPlanificarPage must exist');
  assert.ok(!initFnMatch[0].includes('checkTechnicianPendingMaterialPrompt('), 'initPlanificarPage must NOT auto-open blocking material popup');
  assert.ok(planificarHtml.includes('id="tech-map-privacy-notice" style="display:none !important;"'), 'Intrusive map privacy banner must be hidden');
  assert.ok(planificarHtml.includes("el.style.pointerEvents = 'none'"), 'Initial loader must be non-blocking for technicians');
  console.log('✓ Task 6 passed (non-blocking technician boot verified).');

  console.log('\n=== ALL 6 TASK VERIFICATIONS PASSED 100%! ===');
})().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});

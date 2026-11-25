const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync('public/planificar.html', 'utf8');
const apiJs = fs.readFileSync('public/assets/js/api.js', 'utf8');
const planJs = fs.readFileSync('public/assets/js/planificar.js', 'utf8');

function extractFn(src, name) {
  const asyncIdx = src.indexOf(`async function ${name}(`);
  const idx = asyncIdx >= 0 ? asyncIdx : src.indexOf(`function ${name}(`);
  assert.ok(idx >= 0, `Missing ${name}`);
  const startBrace = src.indexOf('{', src.indexOf(') {', idx));
  let depth = 0;
  for (let i = startBrace; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    if (depth === 0) return src.slice(idx, i + 1);
  }
  throw new Error(`Incomplete ${name}`);
}

// 1. Static HTML never claims empty stops while loading
assert.ok(!html.includes('No tienes paradas asignadas para hoy.'), 'planificar.html must not show empty text in initial skeleton');
assert.ok(html.includes('Cargando tu ruta y detalles...'), 'planificar.html must show active loading text in mobile skeleton');
assert.ok(html.includes('tech-mobile-loading-bar'), 'planificar.html must include indeterminate loading bar');

// 2. autoSyncTick does NOT block when a button is focused
const syncCtx = {
  syncBusy: false,
  document: { hidden: false, activeElement: { tagName: 'BUTTON' }, querySelector: () => null, getElementById: () => null },
  location: { pathname: '/planificar.html' },
  window: { netopsCloudLoadOk: true },
  state: { workOrders: [] },
  lastSyncToken: '2026-11-24T10:00:00.000Z',
  isLocalDirty: () => false,
  fetchRemoteSyncMeta: async () => ({ updatedAt: '2026-11-24T10:00:15.000Z' }),
  syncCalls: 0,
  syncFromCloud: async () => { syncCtx.syncCalls++; return true; },
  console
};
vm.createContext(syncCtx);
vm.runInContext(
  `${extractFn(apiJs, 'isUserEditingNow')}\n${extractFn(apiJs, 'autoSyncTick')}\nthis.autoSyncTick = autoSyncTick; this.isUserEditingNow = isUserEditingNow;`,
  syncCtx
);

(async () => {
  assert.strictEqual(Boolean(syncCtx.isUserEditingNow()), false, 'Focused button must not block auto-sync');
  const synced = await syncCtx.autoSyncTick({ silent: true, force: false });
  assert.strictEqual(synced, true, 'autoSyncTick must pull updated details even with focused button');
  assert.strictEqual(syncCtx.syncCalls, 1, 'syncFromCloud must be called once when token changes');

  // 3. Test planificar.js loading states & automatic new detail matching
  const els = {};
  const makeEl = (id) => {
    const classes = new Set();
    const el = {
      id, innerHTML: '', textContent: '', style: {}, dataset: {},
      classList: {
        add: (...c) => c.forEach(x => classes.add(x)),
        remove: (...c) => c.forEach(x => classes.delete(x)),
        toggle: (c, f) => (f ? classes.add(c) : classes.delete(c)),
        contains: c => classes.has(c)
      },
      querySelector: () => null,
      insertAdjacentHTML: () => {},
      insertAdjacentElement: () => {},
      insertBefore: () => {},
      parentNode: null
    };
    els[id] = el;
    return el;
  };
  [
    'plan-days', 'tech-plan-banner', 'tech-progress-card',
    'tech-progress-percent-badge', 'tech-progress-bar-fill',
    'tech-stat-pueblos', 'tech-stat-detalles', 'tech-day-map-date',
    'tech-day-map-card', 'tech-route-overview-title',
    'tech-route-overview-date', 'tech-route-overview-kpis',
    'tech-route-stop-names'
  ].forEach(makeEl);
  const shellEl = makeEl('plan-shell');

  const toasts = [];
  const planCtx = {
    window: { innerWidth: 390, location: { search: '?view=tecnico', pathname: '/planificar.html' }, netopsCloudLoadOk: true, scrollY: 0, scrollTo: () => {}, addEventListener: () => {} },
    document: {
      body: { classList: { add: () => {}, remove: () => {}, contains: () => true }, dataset: { techView: 'details' } },
      documentElement: { classList: { contains: () => true } },
      getElementById: id => els[id] || null,
      querySelector: sel => sel === '.plan-shell' ? shellEl : null,
      createElement: () => makeEl('dyn-' + Math.random()),
      addEventListener: () => {}
    },
    localStorage: { _m: {}, getItem(k) { return this._m[k] || null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } },
    sessionStorage: { _m: {}, getItem(k) { return this._m[k] || null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } },
    navigator: { onLine: true },
    requestAnimationFrame: fn => fn(),
    setTimeout: () => 1,
    clearTimeout: () => {},
    console,
    state: { weekPlan: {}, workOrders: [], nodes: [], equipment: [], technicians: [{ id: 't1', userId: 'u1', nombre: 'Carlos', usuario: 'carlos' }], routes: [], materials: [] },
    getCurrentUser: () => ({ id: 'u1', username: 'carlos', name: 'Carlos', role: 'tecnico' }),
    userHasRole: (...roles) => roles.includes('tecnico'),
    normalizeRole: r => String(r || '').toLowerCase(),
    normalizeName: v => String(v || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' '),
    escapeHtml: s => String(s ?? ''),
    escapeAttr: s => String(s ?? ''),
    gid: p => p + Math.random().toString(36).slice(2, 8),
    safeFloat: v => parseFloat(v),
    localDateKey: () => '2026-11-24',
    formatCalendarDate: d => d,
    notify: (msg) => toasts.push(msg),
    cloneData: x => JSON.parse(JSON.stringify(x)),
    sortDetailsByPriority: arr => arr,
    URLSearchParams
  };
  vm.createContext(planCtx);
  vm.runInContext(planJs, planCtx);

  // 3A. During initial cloud loading (empty state), top redundant banners stay hidden and bottom loading card is shown
  planCtx.renderTechnicianPlanBanner();
  assert.strictEqual(els['tech-plan-banner'].style.display, 'none', 'Banner must stay hidden while initial load is in flight');
  assert.ok(!els['tech-plan-banner'].innerHTML.includes('Sin ruta asignada'), 'Banner must NOT say Sin ruta asignada while loading');

  planCtx.updateTechnicianProgressCard();
  assert.strictEqual(els['tech-progress-card'].style.display, 'none', 'Progress card must stay hidden while initial load is in flight');

  planCtx.renderTechnicianRouteOverview();
  assert.strictEqual(els['tech-route-overview-title'].textContent, 'Cargando tu ruta...', 'Route overview must show loading title');
  assert.ok(els['tech-route-stop-names'].innerHTML.includes('Cargando ruta y detalles...'), 'Route overview must show loading skeleton');

  planCtx.renderPlanDays();
  assert.ok(els['plan-days'].innerHTML.includes('Cargando ruta y detalles...'), 'Plan days must show animated loading state');
  assert.ok(els['plan-days'].innerHTML.includes('tech-mobile-loading-bar'), 'Plan days loading must include indeterminate bar');
  assert.ok(!els['plan-days'].innerHTML.includes('No tienes planes'), 'Plan days must NOT show empty state while loading');

  // 3B. Now assign a plan with 3 stops (node, equipment, manual town) and simulate initial load done
  planCtx.state.nodes = [{ id: 'n1', name: 'Chilapa', town: 'Chilapa' }];
  planCtx.state.equipment = [{ id: 'eq1', name: 'Torre Sur' }];
  planCtx.state.weekPlan = {
    __shared__: {
      _generalPlans: [{
        id: 'gp1', name: 'Ruta Sur', assignedTechId: 't1', assignedTechIds: ['t1'],
        stops: [
          { id: 's1', nodeId: 'n1', name: 'Chilapa', scheduledDate: '2026-11-24', detailIds: [] },
          { id: 's2', equipmentId: 'eq1', name: 'Torre Sur', scheduledDate: '2026-11-24', detailIds: [] },
          { id: 's3', name: 'Ayahualulco', scheduledDate: '2026-11-24', detailIds: [] }
        ]
      }]
    }
  };
  planCtx.state.workOrders = [
    { id: 'wo1', nodeId: 'n1', detailKind: 'physical', status: 'pendiente', title: 'Sin señal' }
  ];
  vm.runInContext("_planInitialCloudLoading = false; selectedTechId = 't1'; selectedGeneralPlanId = 'gp1'; snapshotKnownTechPendingDetails();", planCtx);

  // 3C. Admin uploads 3 new details: node physical, equipment physical, manual town physical, PLUS 1 network detail (excluded)
  planCtx.state.workOrders.push(
    { id: 'wo2', nodeId: 'n1', detailKind: 'physical', status: 'pendiente', title: 'Cable dañado', nodeName: 'Chilapa' },
    { id: 'wo3', equipmentId: 'eq1', detailKind: 'physical', status: 'pendiente', title: 'Revisar sectorial' },
    { id: 'wo4', town: 'Ayahualulco', detailKind: 'physical', status: 'pendiente', title: 'Cambio de POE' },
    { id: 'wo-net', nodeId: 'n1', detailKind: 'network', status: 'pendiente', title: 'Soporte remoto' }
  );
  const s1Details = planCtx.getStopDetails(planCtx.state.weekPlan.__shared__._generalPlans[0].stops[0]);
  const s2Details = planCtx.getStopDetails(planCtx.state.weekPlan.__shared__._generalPlans[0].stops[1]);
  const s3Details = planCtx.getStopDetails(planCtx.state.weekPlan.__shared__._generalPlans[0].stops[2]);

  assert.strictEqual(JSON.stringify(Array.from(s1Details).map(d => d.id).sort()), JSON.stringify(['wo1', 'wo2']), 'Node stop must automatically include new physical detail and exclude network detail');
  assert.strictEqual(JSON.stringify(Array.from(s2Details).map(d => d.id)), JSON.stringify(['wo3']), 'Equipment stop must automatically include new tower physical detail');
  assert.strictEqual(JSON.stringify(Array.from(s3Details).map(d => d.id)), JSON.stringify(['wo4']), 'Manual town stop must automatically include new matching town physical detail');

  // 3D. notifyNewTechnicianDetailsIfAny detects the 3 newly arrived details
  const newCount = planCtx.notifyNewTechnicianDetailsIfAny();
  assert.strictEqual(newCount, 3, 'Must detect 3 newly added pending details');
  assert.ok(toasts.some(t => t.includes('3 detalles nuevos')), 'Must notify technician with reassuring toast');

  // 3E. Connection error with empty cache shows Retry card instead of empty route message
  planCtx.state.weekPlan = { __shared__: { _generalPlans: [] } };
  planCtx.state.workOrders = [];
  planCtx.state.nodes = [];
  planCtx.state.equipment = [];
  planCtx.window.netopsCloudLoadOk = false;
  vm.runInContext("selectedTechId = ''; selectedGeneralPlanId = ''; renderPlanDays();", planCtx);
  assert.ok(els['plan-days'].innerHTML.includes('Reintentar carga'), 'Must show Reintentar carga when network failed with no cache');

  console.log('✓ ALL LIVE SYNC AND LOADING VERIFICATIONS PASSED 100%!');
})().catch(err => {
  console.error(err);
  process.exit(1);
});

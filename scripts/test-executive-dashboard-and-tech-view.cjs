const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function makeElement(id) {
  const attrs = new Map();
  const classes = new Set();
  return {
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    hidden: false,
    disabled: false,
    style: { _map: {}, setProperty(k, v) { this._map[k] = v; } },
    classList: {
      add(c) { classes.add(c); },
      remove(c) { classes.delete(c); },
      toggle(c, force) {
        if (force === undefined) { if (classes.has(c)) classes.delete(c); else classes.add(c); }
        else if (force) classes.add(c); else classes.delete(c);
      },
      contains(c) { return classes.has(c); }
    },
    setAttribute(k, v) { attrs.set(k, String(v)); },
    getAttribute(k) { return attrs.get(k) || ''; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; }
  };
}

function createDashboardSandbox({ role = 'administrador', user = null, search = '' } = {}) {
  const elements = new Map();
  const getEl = id => {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  };
  const currentUser = user || (role === 'tecnico'
    ? { id: 'u-lalo', name: 'Lalo', username: 'lalo', role: 'tecnico' }
    : { id: 'u-admin', name: 'Admin', username: 'admin', role: 'administrador' });

  let goalLoads = 0;
  const bodyClasses = new Set();
  const sandbox = {
    console, Date, Math, Map, Set, Array, Object, Number, String, Boolean, JSON, RegExp, URLSearchParams,
    CSS: { escape: s => s },
    window: { location: { href: `https://app.test/dashboard.html${search}`, search }, history: { replaceState() {} }, netopsPageMeta: {} },
    location: { href: `https://app.test/dashboard.html${search}`, search },
    document: {
      body: { classList: { add: c => bodyClasses.add(c), remove: c => bodyClasses.delete(c), toggle: (c, f) => f ? bodyClasses.add(c) : bodyClasses.delete(c), contains: c => bodyClasses.has(c) } },
      getElementById: getEl,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {}
    },
    state: {
      users: [
        { id: 'u-admin', name: 'Admin', username: 'admin', role: 'administrador', status: 'activo' },
        { id: 'u-lalo', name: 'Lalo', username: 'lalo', role: 'tecnico', status: 'activo' },
        { id: 'u-nolve', name: 'Nolve', username: 'nolve', role: 'tecnico', status: 'activo' }
      ],
      technicians: [
        { id: 't-lalo', userId: 'u-lalo', nombre: 'Lalo', usuario: 'lalo' },
        { id: 't-nolve', userId: 'u-nolve', nombre: 'Nolve', usuario: 'nolve' }
      ],
      workOrders: []
    },
    initCommon() {},
    normalizeName: s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''),
    normalizeRole: r => String(r || '').trim().toLowerCase(),
    getCurrentUser: () => currentUser,
    userHasRole: (...roles) => roles.includes(currentUser.role),
    loadDB: async () => {},
    fetch: async () => { goalLoads++; return { ok: true, json: async () => ({ ok: true, monthlyGoal: 350 }) }; },
    API: 'https://api.test'
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('public/assets/js/dashboard.js', 'utf8'), sandbox);
  return { sandbox, getEl, getGoalLoads: () => goalLoads, bodyClasses };
}

(async () => {
  // 1. Static HTML/CSS executive simplification checks
  const dashboardHtml = fs.readFileSync('public/dashboard.html', 'utf8');
  const analyticsCss = fs.readFileSync('public/assets/css/admin-analytics.css', 'utf8');
  assert.doesNotMatch(dashboardHtml, /class="dashboard-period-kpis"/, 'La segunda fila redundante de KPIs debe eliminarse');
  assert.match(dashboardHtml, /id="dashboard-weekly-chart"/);
  assert.match(dashboardHtml, /id="dashboard-status-chart"/);
  assert.match(dashboardHtml, /id="dashboard-tooltip"/);
  assert.match(dashboardHtml, /id="dashboard-tech-view"/);
  assert.match(analyticsCss, /html\[data-role="tecnico"\] #dashboard-admin-view/);

  // No emojis in technician section
  const techSection = dashboardHtml.match(/<section id="dashboard-tech-view"[\s\S]*?<\/section>\s*<\/main>/)?.[0] || '';
  assert.ok(techSection.length > 100);
  assert.equal(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(techSection), false, 'La vista de técnico no debe tener emojis');

  // 2. Admin executive interactive visual charts verification
  const now = new Date();
  const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0).toISOString();
  const adminEnv = createDashboardSandbox({ role: 'administrador' });
  adminEnv.sandbox.state.workOrders = [
    { id: 'o1', detailKind: 'physical', status: 'completada', region: 'Centro', createdAt: todayIso, completedAt: todayIso, updatedById: 'u-lalo', technicianReport: { completedBy: 'u-lalo', completedByName: 'Lalo', completedAt: todayIso } },
    { id: 'o2', detailKind: 'physical', status: 'pendiente', region: 'Centro', createdAt: todayIso, assignedTechId: 't-lalo' },
    { id: 'o3', detailKind: 'physical', status: 'no_realizado', region: 'Costa', createdAt: todayIso, updatedAt: todayIso, assignedTechId: 't-nolve' }
  ];
  const todayKey = adminEnv.sandbox.dashboardDateKey(now);
  adminEnv.getEl('dashboard-from').value = todayKey;
  adminEnv.getEl('dashboard-to').value = todayKey;
  adminEnv.sandbox.renderAdminDashboard();

  const dailyHtml = adminEnv.getEl('dashboard-daily-chart').innerHTML;
  assert.match(dailyHtml, /dashboard-line-path/);
  assert.match(dailyHtml, /dashboard-line-created/);
  assert.match(dailyHtml, /data-tip-title="/);
  assert.match(dailyHtml, /data-tip-lines="/);

  const distHtml = adminEnv.getEl('dashboard-tech-table').innerHTML;
  assert.match(distHtml, /dashboard-donut-svg/);
  assert.match(distHtml, /dashboard-donut-arc/);
  assert.match(distHtml, /dashboard-dist-bar/);
  assert.match(distHtml, /data-slice-idx="0"/);

  const weeklyHtml = adminEnv.getEl('dashboard-weekly-chart').innerHTML;
  assert.match(weeklyHtml, /dashboard-weekly-svg/);
  assert.match(weeklyHtml, /dashboard-week-group/);
  assert.match(weeklyHtml, /dashboard-bar-rect/);

  const statusHtml = adminEnv.getEl('dashboard-status-chart').innerHTML;
  assert.match(statusHtml, /dashboard-seg-bar/);
  assert.match(statusHtml, /dashboard-zone-row/);
  assert.match(statusHtml, /Centro/);

  assert.ok(adminEnv.getEl('dashboard-compliance-arc').getAttribute('stroke-dashoffset'));
  console.log('✓ Admin executive KPIs & interactive SVG charts verified.');

  // 3. Technician view isolation (only personal progress, no admin metrics)
  const techEnv = createDashboardSandbox({ role: 'tecnico' });
  techEnv.sandbox.state.workOrders = [
    { id: 't1', detailKind: 'physical', status: 'completada', createdAt: todayIso, completedAt: todayIso, assignedTechId: 't-lalo', technicianReport: { completedBy: 'u-lalo', completedAt: todayIso } },
    { id: 't2', detailKind: 'physical', status: 'pendiente', createdAt: todayIso, assignedTechId: 't-lalo' },
    { id: 't3', detailKind: 'physical', status: 'no_realizado', createdAt: todayIso, updatedAt: todayIso, assignedTechId: 't-lalo' },
    // Another technician's order + network order must NOT count for Lalo
    { id: 'other1', detailKind: 'physical', status: 'completada', createdAt: todayIso, completedAt: todayIso, assignedTechId: 't-nolve', technicianReport: { completedBy: 'u-nolve', completedAt: todayIso } },
    { id: 'net1', detailKind: 'network', status: 'completada', createdAt: todayIso, completedAt: todayIso, updatedById: 'u-lalo' }
  ];
  assert.equal(techEnv.sandbox.isTechnicianDashboardView(), true);
  await techEnv.sandbox.initAdminDashboard();

  assert.equal(techEnv.getEl('dashboard-admin-view').hidden, true, 'Admin view must be hidden for technicians');
  assert.equal(techEnv.getEl('dashboard-tech-view').hidden, false, 'Tech view must be visible for technicians');
  assert.equal(techEnv.getGoalLoads(), 0, 'Technician must not fetch admin company goal');
  assert.equal(techEnv.getEl('tech-kpi-completed').textContent, '1');
  assert.equal(techEnv.getEl('tech-kpi-pending').textContent, '1');
  assert.equal(techEnv.getEl('tech-kpi-notdone').textContent, '1');
  assert.equal(techEnv.getEl('tech-kpi-progress').textContent, '33%');
  assert.match(techEnv.getEl('tech-dash-donut').innerHTML, /dashboard-donut-svg/);
  assert.match(techEnv.getEl('tech-dash-bars').innerHTML, /dashboard-weekly-svg/);
  console.log('✓ Technician view shows only personal progress (completados/pendientes/no realizados/progreso) without admin metrics.');

  // 4. History technician isolation & visual bar
  const histEls = new Map();
  const getHistEl = id => {
    if (!histEls.has(id)) histEls.set(id, makeElement(id));
    return histEls.get(id);
  };
  getHistEl('history-date').value = '2026-08-23';
  const histCtx = {
    Date, Map, Set, Array, Object, Number, String, Math,
    window: { netopsPageMeta: { audit: { total: 99, offset: 0, stats: { created: 40, updated: 30, completed: 20, deleted: 9 } } } },
    state: {
      users: [{ id: 'u-lalo', name: 'Lalo', username: 'lalo', role: 'tecnico' }],
      technicians: [{ id: 't-lalo', userId: 'u-lalo', nombre: 'Lalo', usuario: 'lalo' }],
      auditLog: [
        { id: 'h1', at: '2026-08-23T09:00:00', byId: 'u-lalo', byName: 'Lalo', byUsername: 'lalo', action: 'completó detalle' },
        { id: 'h2', at: '2026-08-23T10:00:00', byId: 'u-other', byName: 'Otro', byUsername: 'otro', action: 'eliminó usuario' }
      ]
    },
    getCurrentUser: () => ({ id: 'u-lalo', name: 'Lalo', username: 'lalo', role: 'tecnico' }),
    userHasRole: (...roles) => roles.includes('tecnico'),
    normalizeName: s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''),
    normalizeRole: r => String(r || '').trim().toLowerCase(),
    document: { getElementById: getHistEl }
  };
  vm.createContext(histCtx);
  vm.runInContext(fs.readFileSync('public/assets/js/historial.js', 'utf8'), histCtx);
  histCtx.rebuildHistoryTechnicianAliases();
  histCtx.renderHistoryWindow();

  assert.equal(getHistEl('history-kpi-total').textContent, '1', 'Technician history must not show global audit total');
  assert.equal(getHistEl('history-kpi-completed').textContent, '1');
  assert.equal(getHistEl('history-kpi-deleted').textContent, '0');
  assert.match(getHistEl('history-visual-bar').innerHTML, /history-vbar-track/);
  console.log('✓ Technician history isolates personal stats and renders visual proportion bar.');

  console.log('\nALL EXECUTIVE DASHBOARD & TECHNICIAN VIEW TESTS PASSED!');
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

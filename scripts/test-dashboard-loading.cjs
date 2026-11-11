const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

(async () => {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { value: '', closest: () => null });
    return elements.get(id);
  };
  const rows = Array.from({ length: 375 }, (_, id) => ({ id: `order-${id}` }));
  const calls = [];
  let active = 0;
  let peak = 0;
  let renders = 0;
  const context = {
    console, Date, state: { workOrders: [] },
    window: { netopsCloudLoadOk: true },
    document: { getElementById: element, querySelectorAll: () => [] },
    initCommon() {}, userHasRole: () => true,
    async fetchDataPage(part, params) {
      calls.push(params.offset);
      active += 1;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 5));
      active -= 1;
      return { workOrders: rows.slice(params.offset, params.offset + params.limit), total: rows.length, stats: { total: 500 } };
    },
    async loadDB() {
      assert.equal(context.window.netopsGetDataPartParams('operations').limit, 100);
      context.state.workOrders = rows.slice(0, 100);
      context.window.netopsPageMeta = { operations: { total: 375, limit: 100, stats: { total: 500 } } };
    },
    notify(message) { throw new Error(message); }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('public/assets/js/dashboard.js', 'utf8'), context);
  context.loadDashboardGoal = async () => {};
  context.populateDashboardFilters = () => {};
  context.renderAdminDashboard = () => { renders += 1; };
  await context.initAdminDashboard();
  assert.deepEqual(calls.slice().sort((a, b) => a - b), [100, 200, 300], 'La pagina inicial no debe descargarse dos veces');
  assert.equal(peak, 3, 'Las paginas restantes deben cargarse en paralelo con concurrencia limitada');
  assert.equal(context.state.workOrders.length, 375);
  assert.equal(new Set(context.state.workOrders.map(row => row.id)).size, 375);
  assert.equal(renders, 1, 'Los indicadores deben mostrarse con todos los registros');
  assert.equal(vm.runInContext('dashboardGlobalStats.total', context), 500);

  // An older filter response must never overwrite a newer selection.
  const pending = [];
  context.fetchDataPage = () => new Promise(resolve => pending.push(resolve));
  const oldLoad = context.loadDashboardData();
  const newLoad = context.loadDashboardData();
  pending[1]({ workOrders: [{ id: 'new-filter' }], total: 1, stats: { total: 1 } });
  await newLoad;
  pending[0]({ workOrders: [{ id: 'old-filter' }], total: 1, stats: { total: 100 } });
  await oldLoad;
  assert.equal(context.state.workOrders[0].id, 'new-filter');
  assert.equal(vm.runInContext('dashboardGlobalStats.total', context), 1);
  console.log('PASS: dashboard reuses initial data, loads remaining pages concurrently and ignores stale responses.');
})().catch(error => { console.error(error); process.exitCode = 1; });

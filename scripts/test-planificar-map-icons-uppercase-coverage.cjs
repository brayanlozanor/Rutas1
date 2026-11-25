const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const planJs = fs.readFileSync('public/assets/js/planificar.js', 'utf8');
const apiJs = fs.readFileSync('public/assets/js/api.js', 'utf8');
const storeJs = fs.readFileSync('relational-store.js', 'utf8');
const planCss = fs.readFileSync('public/assets/css/plan-ui-v2.css', 'utf8');

// 1. Verify relational-store.js physical-only coverage SQL and uppercase nodes
assert.ok(storeJs.includes("COALESCE(w.detail_kind,'physical') <> 'network'"), 'loadPlanningMapCatalog must exclude network details');
assert.ok(storeJs.includes('async function ensureNodesUppercase(env)'), 'relational-store.js must include one-time uppercase nodes migration');
assert.ok(storeJs.includes('upperTownText(rec.town || rec.name)'), 'upsertNode must store town in uppercase');

// 2. Verify CSS icons are strictly scoped to Planificar
assert.ok(planCss.includes('body.planificar-page .plan-map-entity-icon.is-tower'), 'Tower icon CSS must be scoped to planificar-page');
assert.ok(planCss.includes('body.planificar-page .plan-map-entity-icon.is-town'), 'Town icon CSS must be scoped to planificar-page');
assert.ok(planCss.includes('body.planificar-page .plan-stop-icon.is-tower'), 'Tower stop icon CSS must be scoped to planificar-page');
assert.ok(planCss.includes('body.planificar-page .plan-stop-icon.is-town'), 'Town stop icon CSS must be scoped to planificar-page');

// 3. VM runtime verification of api.js uppercase normalization (pueblos ONLY, antenas untouched)
const apiCtx = {
  window: {},
  state: {
    nodes: [{ id: 'n1', nodeCode: '240', town: 'porvenir' }, { id: 'n2', nodeCode: 'r114', town: 'Peña Blanca' }],
    equipment: [{ id: 'eq1', name: 'Torre Cerro Alto' }],
    workOrders: [{ id: 'w1', nodeId: 'n1', nodeCode: '240', town: 'porvenir', nodeName: 'porvenir' }]
  }
};
vm.createContext(apiCtx);
const fnStart = apiJs.indexOf('function formatTownUpper(');
const fnEnd = apiJs.indexOf('function normalizeEquipmentData(');
vm.runInContext(apiJs.slice(fnStart, fnEnd), apiCtx);
apiCtx.normalizeNodesUppercase();
assert.strictEqual(apiCtx.state.nodes[0].town, 'PORVENIR', 'Existing lowercase pueblo must convert to uppercase');
assert.strictEqual(apiCtx.state.nodes[1].town, 'PEÑA BLANCA', 'Accented Spanish pueblo must convert to uppercase');
assert.strictEqual(apiCtx.state.nodes[1].nodeCode, 'R114', 'Node code must convert to uppercase');
assert.strictEqual(apiCtx.state.equipment[0].name, 'Torre Cerro Alto', 'Equipment/antenna name must NOT be modified');
assert.strictEqual(apiCtx.getNodeLabel(apiCtx.state.nodes[0]), '240 · PORVENIR');

// 4. VM runtime verification of Planificar map labels, icons, and physical-only coverage
const planCtx = {
  window: { addEventListener: () => {} },
  document: { addEventListener: () => {}, getElementById: () => null },
  state: {
    nodes: [
      { id: 'n1', nodeCode: '240', town: 'porvenir', zone: 'centro', lat: 17.5, lng: -99.5 },
      { id: 'n2', nodeCode: 'R10', town: 'san josé', zone: 'norte', lat: 17.6, lng: -99.6 }
    ],
    equipment: [
      { id: 'eq1', name: 'Torre Cerro Alto', lat: 17.55, lng: -99.55 }
    ],
    workOrders: [
      { id: 'w-phys-1', nodeId: 'n1', detailKind: 'physical', status: 'pendiente', createdAt: '2026-11-01T10:00:00Z' },
      { id: 'w-net-1', nodeId: 'n1', detailKind: 'network', status: 'completada', createdAt: '2026-11-01T10:00:00Z' },
      { id: 'w-net-2', nodeId: 'n1', detailKind: 'network', status: 'completada', createdAt: '2026-11-01T10:00:00Z' },
      { id: 'w-net-3', nodeId: 'n2', detailKind: 'network', status: 'pendiente', createdAt: '2026-11-01T10:00:00Z' },
      { id: 'w-cat-red', nodeId: 'n2', category: 'soporte_red', status: 'pendiente', createdAt: '2026-11-01T10:00:00Z' }
    ]
  },
  L: { divIcon: (opts) => opts },
  escapeHtml: s => String(s ?? ''),
  escapeAttr: s => String(s ?? ''),
  safeFloat: v => parseFloat(v),
  normalizeName: s => String(s || '').trim().toLowerCase(),
  getNodeLabel: n => (n.nodeCode ? `${n.nodeCode} · ` : '') + (n.town || ''),
  Date, Math
};
vm.createContext(planCtx);
const covCode = planJs.slice(
  planJs.indexOf('/* ==========================================================================\n   COBERTURA DE PUEBLOS:'),
  planJs.indexOf('function openWeeklyRouteModal()')
);
const iconCode = planJs.slice(
  planJs.indexOf('const PLAN_TOWER_ICON_SVG ='),
  planJs.indexOf('function renderPlanFullscreenConnections(')
);
vm.runInContext(`${covCode}\n${iconCode}`, planCtx);

// 4A. Coverage MUST ignore all network details
const cov = planCtx.calculateTownCoverageData();
const covN1 = cov.find(c => c.id === 'n1');
const covN2 = cov.find(c => c.id === 'n2');
assert.strictEqual(covN1.total, 1, 'n1 must only count its 1 physical detail, ignoring 2 network details');
assert.strictEqual(covN1.completed, 0, 'n1 completed must not count completed network details');
assert.strictEqual(covN1.townName, 'PORVENIR', 'Coverage town name must be uppercase');
assert.strictEqual(covN2.total, 0, 'n2 with only network details must have 0 physical coverage total');
assert.strictEqual(covN2.isUnattended, false, 'n2 with only network details must NOT be marked unattended');
assert.strictEqual(covN2.townName, 'SAN JOSÉ', 'Coverage accented town name must be uppercase');

// 4B. Route map labels include node number ('240 PORVENIR') and keep antenna name untouched
assert.strictEqual(planCtx.getPlanMapStopDisplayName({ nodeId: 'n1', name: 'porvenir' }), '240 PORVENIR');
assert.strictEqual(planCtx.getPlanMapStopDisplayName({ equipmentId: 'eq1', name: 'Torre Cerro Alto' }), 'Torre Cerro Alto');

// 4C. Distinct icons for Antena/Torre vs Pueblo/Nodo
const towerIcon = planCtx.makePlanPointIcon('#ef4444', '', 'tower');
const townIcon = planCtx.makePlanPointIcon('#22c55e', '', 'town');
assert.ok(towerIcon.html.includes('is-tower') && !towerIcon.html.includes('is-town'), 'Tower point icon must use is-tower');
assert.ok(townIcon.html.includes('is-town') && !townIcon.html.includes('is-tower'), 'Town point icon must use is-town');
assert.notStrictEqual(towerIcon.html, townIcon.html, 'Tower and town icons must be visually distinct');

const towerStopIcon = planCtx.makePlanStopMarkerIcon({ equipmentId: 'eq1', name: 'Torre Cerro Alto' }, 1);
const townStopIcon = planCtx.makePlanStopMarkerIcon({ nodeId: 'n1', name: 'porvenir' }, 2);
assert.ok(towerStopIcon.html.includes('is-tower'), 'Tower stop icon must use is-tower');
assert.ok(townStopIcon.html.includes('is-town'), 'Town stop icon must use is-town');

// 5. Full VM execution of renderPlanFullscreenMap (Vista mapa) + renderPlanMap (Vista del plan)
const addedMarkers = [];
const addedPolylines = [];
const addedGeoJsons = [];
const makeLayerGroup = () => {
  const layers = [];
  return {
    _layers: layers,
    addTo() { return this; },
    clearLayers() { layers.length = 0; },
    addLayer(l) { layers.push(l); },
    eachLayer(fn) { layers.forEach(fn); },
    bringToFront() {}
  };
};
const makeMarker = (ll, opts) => {
  const el = makeEl('');
  const m = {
    ll, opts, tooltip: '', popup: '', _el: el,
    addTo() { addedMarkers.push(m); return m; },
    bindTooltip(t) { m.tooltip = t; return m; },
    bindPopup(p) { m.popup = p; return m; },
    getElement() { return el; },
    openTooltip() { throw new Error('Vista mapa must NOT call openTooltip() in loops'); },
    closeTooltip() {},
    setZIndexOffset() {}
  };
  return m;
};
const els = {};
const makeEl = (id) => {
  const classes = new Set();
  const el = {
    id, innerHTML: '', textContent: '', style: {}, dataset: {},
    classList: {
      add(c) { classes.add(c); },
      remove(c) { classes.delete(c); },
      toggle(c, v) { if (v === undefined ? !classes.has(c) : v) classes.add(c); else classes.delete(c); },
      contains(c) { return classes.has(c); }
    },
    addEventListener() {},
    insertAdjacentHTML() {},
    querySelectorAll() { return []; },
    remove() {}
  };
  if (id) els[id] = el;
  return el;
};
makeEl('plan-fullscreen-map');
makeEl('plan-fullscreen-icons-btn');
makeEl('plan-fullscreen-names-btn');
makeEl('plan-fullscreen-stop-names-btn');
makeEl('plan-fullscreen-route-info');
makeEl('plan-fullscreen-catalog-info');

let fetchCalls = 0;
let mockOsrmShouldSucceed = false;

const fullCtx = {
  window: { innerWidth: 1400, location: { search: '', pathname: '/planificar.html' }, addEventListener: () => {} },
  document: {
    body: { classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, dataset: {}, appendChild(el) { if (el.id) els[el.id] = el; } },
    documentElement: { classList: { contains() { return false; } } },
    getElementById: id => els[id] || null,
    createElement: () => makeEl(''),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  navigator: { onLine: true },
  AbortController,
  fetch: async () => {
    fetchCalls++;
    if (!mockOsrmShouldSucceed) throw new Error('offline');
    return {
      ok: true,
      status: 200,
      json: async () => ({
        routes: [{
          distance: 15400,
          duration: 1200,
          geometry: { type: 'LineString', coordinates: [[-99.5, 17.55], [-99.6, 17.60]] }
        }]
      })
    };
  },
  setTimeout: () => 1,
  clearTimeout: () => {},
  requestAnimationFrame: fn => fn(),
  URLSearchParams,
  console,
  L: {
    map: () => ({
      setView() { return this; },
      getPane() { return null; },
      createPane() { return { style: {} }; },
      invalidateSize() {},
      fitBounds() {},
      getSize() { return { x: 1200, y: 700 }; },
      removeLayer() {}
    }),
    tileLayer: () => ({ addTo() { return this; } }),
    layerGroup: makeLayerGroup,
    marker: makeMarker,
    polyline: (ll, opts) => {
      const p = { ll, opts, addTo() { addedPolylines.push(p); return p; }, bindPopup() { return p; }, bringToFront() {} };
      return p;
    },
    divIcon: opts => opts,
    latLngBounds: () => ({ _pts: [], extend(p) { this._pts.push(p); }, isValid() { return this._pts.length > 0; } }),
    geoJSON: (geom, opts) => {
      const g = { geom, opts, addTo() { addedGeoJsons.push(g); return g; }, getBounds() { return { isValid: () => true }; }, bringToFront() {} };
      return g;
    }
  },
  state: {
    equipment: [
      { id: 'eq1', name: 'Torre Cerro Alto', ip: '10.0.0.1', lat: 17.55, lng: -99.55, linkedNodeIds: ['n1'] },
      { id: 'eq2', name: 'Torre Externa', ip: '10.0.0.2', lat: 17.80, lng: -99.80, linkedNodeIds: [] }
    ],
    nodes: [{ id: 'n1', nodeCode: '240', town: 'PORVENIR', zone: 'centro', lat: 17.60, lng: -99.60 }],
    workOrders: [{ id: 'w1', nodeId: 'n1', detailKind: 'physical', status: 'pendiente', priority: 'alta', title: 'Sin señal' }],
    technicians: [],
    weekPlan: {
      __shared__: {
        _generalPlans: [{
          id: 'gp1', name: 'Plan 1',
          stops: [{ id: 's1', nodeId: 'n1', name: 'PORVENIR', lat: 17.60, lng: -99.60, detailIds: ['w1'] }]
        }]
      }
    }
  },
  getCurrentUser: () => ({ id: 'u1', role: 'administrador', name: 'Admin' }),
  userHasRole: (...roles) => roles.includes('administrador'),
  normalizeRole: r => String(r || '').toLowerCase(),
  normalizeName: s => String(s || '').trim().toLowerCase(),
  escapeHtml: s => String(s ?? ''),
  escapeAttr: s => String(s ?? ''),
  safeFloat: v => parseFloat(v),
  localDateKey: () => '2026-11-25',
  formatCalendarDate: d => d,
  getNodeLabel: n => (n.nodeCode ? `${n.nodeCode} · ` : '') + (n.town || ''),
  getZoneLabel: z => z || '',
  getEquipmentLinkedNodeIds: id => id === 'eq1' ? ['n1'] : [],
  getEntityOpenDetails: () => [],
  getEntityPriorityStatus: () => ({ color: '#22c55e', label: 'Despejado' }),
  renderMapEntityDetailStats: () => '',
  sortDetailsByPriority: a => a,
  pc: () => '#ef4444',
  pl: p => p,
  vl: v => v || '',
  renderDetailLocation: () => '',
  renderMapStopDetailStats: () => '',
  notify: () => {},
  getDetailFolio: d => d.id,
  getWorkOrderRequestedText: d => d.title || ''
};
vm.createContext(fullCtx);
vm.runInContext(planJs, fullCtx);

(async () => {
  vm.runInContext("selectedTechId = SHARED_PLAN_ID; selectedGeneralPlanId = 'gp1';", fullCtx);
  const modal = fullCtx.ensurePlanFullscreenModal();
  assert.ok(modal.innerHTML.includes('id="plan-fullscreen-icons-btn"'), 'Vista mapa modal must include toggle button for icons');
  vm.runInContext("planFullscreenMap = L.map('plan-fullscreen-map');", fullCtx);

  // 5A. Vista mapa default mode: fast zero-SVG markers + lazy popups + circles by default + immediate route path even offline!
  await fullCtx.renderPlanFullscreenMap(true);
  assert.strictEqual(addedMarkers.length, 4, 'Vista mapa must render 2 antennas + 1 pueblo + 1 stop');
  assert.ok(!els['plan-fullscreen-map'].classList.contains('plan-icons-mode'), 'Vista mapa must start in circle mode (no plan-icons-mode)');
  assert.ok(addedMarkers.every(m => !m.opts.icon.html.includes('<svg')), 'Vista mapa markers must have ZERO inline <svg> DOM nodes for 60fps performance');
  assert.ok(addedMarkers.every(m => typeof m.popup === 'function'), 'Vista mapa popups must be lazy functions (built only on click)');
  assert.ok(addedMarkers.some(m => m.opts.icon.html.includes('plan-fs-node is-tower') && m._planFastLabel.includes('Torre Cerro Alto')), 'Vista mapa must render antennas with fast tower marker');
  assert.ok(addedMarkers.some(m => m.opts.icon.html.includes('plan-fs-node is-town') && m._planFastLabel === '240 PORVENIR'), 'Vista mapa must render pueblos with fast town marker and node number');
  assert.ok(addedMarkers.some(m => m.opts.icon.html.includes('plan-fs-stop') && m._planFastLabel === '1. 240 PORVENIR'), 'Vista mapa must render stops with fast stop marker');
  assert.ok(addedPolylines.some(p => p.opts?.pane === 'planFullscreenRoutePane'), 'Vista mapa MUST draw visible route line immediately on planFullscreenRoutePane');
  assert.strictEqual(els['plan-fullscreen-icons-btn'].textContent, 'Ver iconos');

  // 5B. Toggle Ver iconos AND Ver nombres simultaneously: instant O(1) CSS class toggle, ZERO marker recreation, ZERO openTooltip() calls!
  const markersBeforeToggle = addedMarkers.length;
  fullCtx.togglePlanFullscreenIcons();
  assert.strictEqual(addedMarkers.length, markersBeforeToggle, 'Toggling Ver iconos MUST NOT rebuild markers');
  assert.ok(els['plan-fullscreen-map'].classList.contains('plan-icons-mode'), 'Toggling Ver iconos must enable .plan-icons-mode on map');
  assert.strictEqual(els['plan-fullscreen-icons-btn'].textContent, 'Ver círculos');
  assert.ok(els['plan-fullscreen-icons-btn'].classList.contains('is-active'));

  fullCtx.togglePlanFullscreenNames();
  assert.ok(!els['plan-fullscreen-map'].classList.contains('plan-entity-names-hidden'), 'Toggling Ver nombres must show labels via CSS');
  assert.ok(addedMarkers.filter(m => m._planLabelType === 'entity').every(m => m.getElement().classList.contains('label-in-view')), 'Visible entity markers must get .label-in-view without openTooltip()');

  // 5C. Sidebar Vista del plan (renderPlanMap) renders ONLY active plan stops + WiFi-Mex origin AND draws immediate route offline
  addedMarkers.length = 0;
  addedPolylines.length = 0;
  vm.runInContext("planMap = L.map('plan-map');", fullCtx);
  await fullCtx.renderPlanMap();
  assert.strictEqual(addedMarkers.length, 2, 'Vista del plan must render ONLY WiFi-Mex origin + 1 plan stop (no unrelated catalog antennas)');
  assert.ok(addedMarkers.some(m => m.tooltip === '2. 240 PORVENIR'), 'Vista del plan stop tooltip must show ONLY order + node number + name');
  assert.ok(!addedMarkers.some(m => m.tooltip.includes('Torre Externa')), 'Vista del plan must NOT show unrelated antennas');
  assert.ok(addedPolylines.length >= 2, 'Vista del plan MUST draw immediate visible route path even when OSRM fails');

  // 5D. When OSRM succeeds in Vista del plan, route upgrades to GeoJSON AND is cached so Vista mapa reuses it with 0 extra fetch calls!
  mockOsrmShouldSucceed = true;
  fetchCalls = 0;
  addedGeoJsons.length = 0;
  await fullCtx.renderPlanMap();
  assert.strictEqual(fetchCalls, 1, 'Vista del plan should call OSRM once');
  assert.ok(addedGeoJsons.length >= 2, 'Vista del plan must draw road GeoJSON layers when OSRM succeeds');

  addedGeoJsons.length = 0;
  await fullCtx.renderPlanFullscreenMap(false);
  assert.strictEqual(fetchCalls, 1, 'Vista mapa MUST reuse cached OSRM road route with 0 extra network calls');
  assert.ok(addedGeoJsons.length >= 3, 'Vista mapa must draw cached road GeoJSON layers instantaneously');

  console.log('✓ ALL 3 NEW REQUIREMENTS + FAST ROUTES + VISTA MAPA CIRCLE/ICON TOGGLE VERIFIED 100%!');
})().catch(e => {
  console.error(e);
  process.exit(1);
});

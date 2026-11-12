const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- TEST: Technician Recommended Routes & Preset Route Add Confirmation ---');

const baseDir = path.resolve(__dirname, '..');
const presetRoutesJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/preset-routes.js'), 'utf8');
const presetRoutesCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/preset-routes.css'), 'utf8');
const planificarJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/planificar.js'), 'utf8');
const ordersDesignCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/orders-design-v2.css'), 'utf8');
const detailToggleCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/detail-view-toggle.css'), 'utf8');

// 1. Mobile technician bottom navigation check
console.log('1. Checking technician mobile bottom navigation...');
assert(planificarJs.includes('openTechnicianRecommendedRoutes()'), 'Technician bottom nav must have openTechnicianRecommendedRoutes()');
assert(planificarJs.includes('Recomendadas</button>'), 'Technician bottom nav must have "Recomendadas" button');

// Validate 0 emojis in technician bottom navigation and no add menu in bottom nav
const navMatch = planificarJs.match(/tech-bottom-nav[\s\S]*?<\/nav>/)?.[0] || '';
assert(navMatch, 'tech-bottom-nav markup must exist');
assert(!navMatch.includes('openTechnicianAddMenu()'), 'Technician bottom nav must NOT have openTechnicianAddMenu()');
const emojiPattern = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
assert.strictEqual(emojiPattern.test(navMatch), false, 'Technician bottom nav must contain 0 emojis');
console.log('✓ Item 1 Passed: Technician bottom navigation has "Recomendadas" button with 0 emojis.');

// 2. Preset Routes Catalog actions removed for technicians
console.log('2. Checking preset routes catalog behavior for technicians...');
assert(presetRoutesJs.includes('!isTech ? `'), 'Preset route card actions must be omitted for technicians');
assert(presetRoutesJs.includes('Los técnicos solo pueden consultar las rutas recomendadas.'), 'Technicians must be blocked from attaching routes');
console.log('✓ Item 2 Passed: Technicians can view catalog without add/attach buttons.');

// 3. Confirmation modal and summary verification
console.log('3. Checking confirmation modal and summary generation...');
assert(presetRoutesJs.includes('root.showPresetRouteConfirmModal'), 'showPresetRouteConfirmModal must be defined');
assert(presetRoutesJs.includes('root.confirmAndAttachPresetRoute'), 'confirmAndAttachPresetRoute must be defined');
assert(presetRoutesJs.includes("'preset-route-confirm-mo'"), 'Confirmation modal must use preset-route-confirm-mo');
assert(presetRoutesJs.includes('preset-confirm-stops-list'), 'Confirmation modal must render sequential stops list');
assert(presetRoutesJs.includes('preset-confirm-dest-banner'), 'Confirmation modal must display destination mode banner');

// Simulate confirmation modal in DOM environment
let insertedHtml = '';
let modalOpened = '';
const sandbox = {
  window: {},
  document: {
    body: {
      classList: { contains: () => false },
      appendChild: (el) => { sandbox.document._lastAppended = el; },
      insertAdjacentHTML: () => {}
    },
    getElementById: (id) => {
      if (id === 'preset-route-confirm-mo') {
        return {
          id: 'preset-route-confirm-mo',
          set innerHTML(val) { insertedHtml = val; },
          get innerHTML() { return insertedHtml; }
        };
      }
      return null;
    },
    querySelectorAll: () => []
  },
  OM: (id) => { modalOpened = id; },
  CM: () => {},
  notify: () => {},
  isTechnicianPlanView: () => false,
  userHasRole: () => false,
  state: {
    equipment: [
      { id: 'eq-1', name: 'Antena Principal', lat: 17.5, lng: -99.5 }
    ],
    nodes: [
      { id: 'nd-1', name: 'Xochipala', lat: 17.8152, lng: -99.6451 }
    ],
    weekPlan: {
      __shared_plan__: { _generalPlans: [] }
    }
  }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(presetRoutesJs, sandbox);

// Call attachPresetRouteToPlan without confirmed flag in DOM env
sandbox.attachPresetRouteToPlan('corredor-chilpancingo-iguala', true, false);

assert.strictEqual(modalOpened, 'preset-route-confirm-mo', 'Opening modal must trigger OM("preset-route-confirm-mo")');
assert(insertedHtml.includes('¿Confirmar agregar ruta recomendada?'), 'Confirmation dialog title must exist');
assert(insertedHtml.includes('Ruta Chilpancingo - Iguala'), 'Route title must appear in summary');
assert(insertedHtml.includes('Xochipala'), 'Stops like Xochipala must appear in summary list');
assert(insertedHtml.includes('confirmAndAttachPresetRoute'), 'Action button must call confirmAndAttachPresetRoute');
console.log('✓ Item 3 Passed: Confirmation modal with structured summary renders correctly.');

// 4. CSS Verification for Confirmation Modal & Header Stats Bar Overlap Fix
console.log('4. Checking CSS rules for confirm dialog and responsive headers...');
assert(presetRoutesCss.includes('.preset-confirm-modal-overlay'), 'preset-routes.css must style confirm overlay');
assert(presetRoutesCss.includes('.preset-confirm-dialog-card'), 'preset-routes.css must style confirm dialog card');
assert(presetRoutesCss.includes('.preset-confirm-stops-list'), 'preset-routes.css must style stops list');

assert(detailToggleCss.includes('@media (max-width: 1250px)'), 'detail-view-toggle.css must have responsive breakpoint for hero');
assert(ordersDesignCss.includes('@media (max-width: 1250px)'), 'orders-design-v2.css must have responsive breakpoint for hero');
assert(detailToggleCss.includes('flex-direction: column !important'), 'detail-view-toggle.css must stack hero column to prevent overlapping');
assert(ordersDesignCss.includes('flex-direction: column !important'), 'orders-design-v2.css must stack hero column to prevent overlapping');
console.log('✓ Item 4 Passed: Confirmation CSS and responsive non-overlapping header styles verified.');

// 5. Anti-regression: Stop card duplicate switches and title corruption
console.log('5. Checking planificar.js stop cards for title sanitization and single switch block...');
assert(!planificarJs.includes('class="stop-detail-switch'), 'Duplicate switches must be completely omitted from stop cards');
assert(planificarJs.includes('/^Ver\\s+(detalles|pendientes|completados)/i'), 'Stop name must reject "Ver detalles" string');
console.log('✓ Item 5 Passed: Planificar stop card title and switch duplication protected.');

// 6. Role protection: Continuity recommendations banner strictly for soporte and admin, NOT technicians
console.log('6. Checking continuity recommendations banner role protection (soporte & admin only)...');
const techViewModesCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/technician-view-modes.css'), 'utf8');

assert(presetRoutesJs.includes("userHasRole('administrador', 'admin', 'soporte')"), 'preset-routes.js must restrict continuity recommendations to admin/soporte');
assert(presetRoutesJs.includes("Solo administradores y soporte pueden agregar continuidades al plan."), 'addContinuityStopsToCurrentPlan must notify and reject non-admin/soporte');
assert(planificarJs.includes("const canSeeContinuity = !isTechnicianPlanView() && canManagePlanStops();"), 'planificar.js must guard checkPlanContinuityRecommendations call');

assert(presetRoutesCss.includes('#plan-continuity-recommendations-banner'), 'preset-routes.css must include rule to hide banner in tech view');
assert(techViewModesCss.includes('#plan-continuity-recommendations-banner'), 'technician-view-modes.css must hide banner in tech view');

// Functional test in sandbox for continuity banner role check
let bannerDisplay = '';
let bannerHtml = '';
const continuityBannerEl = {
  id: 'plan-continuity-recommendations-banner',
  style: {
    get display() { return bannerDisplay; },
    set display(val) { bannerDisplay = val; }
  },
  set innerHTML(val) { bannerHtml = val; },
  get innerHTML() { return bannerHtml; }
};

const continuitySandbox = {
  window: {},
  document: {
    getElementById: (id) => {
      if (id === 'plan-continuity-recommendations-banner') return continuityBannerEl;
      return null;
    }
  },
  getPlanStopsRef: () => [{ name: 'Ayutla' }, { name: 'Tierra Blanca' }],
  userHasRole: (role) => role === 'tecnico',
  isTechnicianPlanView: () => true,
  notify: () => {}
};
continuitySandbox.window = continuitySandbox;
continuitySandbox.global = continuitySandbox;
vm.createContext(continuitySandbox);
vm.runInContext(presetRoutesJs, continuitySandbox);

// Run as technician
continuitySandbox.checkPlanContinuityRecommendations();
assert.strictEqual(bannerDisplay, 'none', 'Banner must be hidden for technicians');
assert.strictEqual(bannerHtml, '', 'Banner HTML must be empty for technicians');

// Run as admin
continuitySandbox.userHasRole = (...roles) => roles.includes('administrador') || roles.includes('soporte');
continuitySandbox.isTechnicianPlanView = () => false;
continuitySandbox.checkPlanContinuityRecommendations();
assert.strictEqual(bannerDisplay, 'flex', 'Banner must be visible for admin/soporte');
assert(bannerHtml.includes('Recomendación de continuidad'), 'Banner must display recommendation for admin/soporte');
console.log('✓ Item 6 Passed: Continuity banner strictly restricted to soporte & admin.');

// 7. Continuity confirm modal, deduplication and automatic banner dismissal
console.log('7. Checking continuity confirm modal, deduplication and banner dismissal...');
assert(presetRoutesJs.includes('root.showContinuityConfirmModal'), 'showContinuityConfirmModal must be defined');
assert(presetRoutesJs.includes('root.confirmAndAddContinuity'), 'confirmAndAddContinuity must be defined');
assert(presetRoutesJs.includes('isStopAlreadyInList'), 'isStopAlreadyInList must be defined');
assert(presetRoutesCss.includes('.badge-exists'), 'preset-routes.css must include badge-exists style');
assert(presetRoutesCss.includes('.stop-already-exists'), 'preset-routes.css must include stop-already-exists style');

// Functional test for continuity confirmation and deduplication
let lastConfirmHtml = '';
let lastOpenedModal = '';
let planStops = [
  { name: 'Sasamulco', equipmentId: '', nodeId: '' },
  { name: 'Xochipala', equipmentId: '', nodeId: '' }
];

const continuityConfirmSandbox = {
  window: {},
  document: {
    body: {},
    querySelectorAll: () => [],
    getElementById: (id) => {
      if (id === 'preset-route-confirm-mo') {
        return {
          id: 'preset-route-confirm-mo',
          set innerHTML(val) { lastConfirmHtml = val; },
          get innerHTML() { return lastConfirmHtml; }
        };
      }
      if (id === 'plan-continuity-recommendations-banner') {
        return continuityBannerEl;
      }
      return null;
    }
  },
  getPlanStopsRef: () => planStops,
  userHasRole: (...roles) => roles.includes('administrador'),
  isTechnicianPlanView: () => false,
  OM: (id) => { lastOpenedModal = id; },
  CM: () => {},
  notify: () => {},
  saveDB: async () => true,
  renderPlan: () => {}
};
continuityConfirmSandbox.window = continuityConfirmSandbox;
continuityConfirmSandbox.global = continuityConfirmSandbox;
vm.createContext(continuityConfirmSandbox);
vm.runInContext(presetRoutesJs, continuityConfirmSandbox);

// Trigger addContinuityStopsToCurrentPlan without confirmed flag
continuityConfirmSandbox.addContinuityStopsToCurrentPlan('Continuidad Sasamulco - Tlacuitlapa', false);
assert.strictEqual(lastOpenedModal, 'preset-route-confirm-mo', 'Must open confirm modal on continuity add click');
assert(lastConfirmHtml.includes('¿Confirmar agregar continuidad al plan?'), 'Must have continuity confirm dialog title');
assert(lastConfirmHtml.includes('Continuidad Sasamulco - Tlacuitlapa'), 'Summary must show continuity name');
assert(lastConfirmHtml.includes('Ya en el plan'), 'Pre-existing stop Sasamulco must be tagged as already in plan');

// Now confirm addition
const initialCount = planStops.length;
continuityConfirmSandbox.confirmAndAddContinuity('Continuidad Sasamulco - Tlacuitlapa');
assert(planStops.length > initialCount, 'New non-duplicate stops must be added to plan');

// Verify that Sasamulco was NOT duplicated in planStops
const sasamulcoCount = planStops.filter(s => s.name === 'Sasamulco').length;
assert.strictEqual(sasamulcoCount, 1, 'Sasamulco must not be duplicated in planStops');

// Verify that continuity banner was dismissed and hidden
assert.strictEqual(bannerDisplay, 'none', 'Banner must be hidden immediately after adding continuity');
assert.strictEqual(bannerHtml, '', 'Banner content must be cleared after adding continuity');

console.log('✓ Item 7 Passed: Continuity confirm modal, deduplication and banner dismissal verified.');

// 8. Recommended routes creation and editing by admin & soporte (forbidden for technicians)
console.log('8. Checking create & edit recommended routes functionality...');
assert(presetRoutesJs.includes('canManagePresetRoutes'), 'canManagePresetRoutes must be defined');
assert(presetRoutesJs.includes('openCreatePresetRouteModal'), 'openCreatePresetRouteModal must be defined');
assert(presetRoutesJs.includes('openEditPresetRouteModal'), 'openEditPresetRouteModal must be defined');
assert(presetRoutesJs.includes('savePresetRouteForm'), 'savePresetRouteForm must be defined');
assert(presetRoutesJs.includes('deleteCustomPresetRoute'), 'deleteCustomPresetRoute must be defined');
assert(presetRoutesJs.includes('preset-add-new-btn'), 'Markup must include + Nueva ruta recomendada button');
assert(presetRoutesJs.includes('preset-edit-btn'), 'Markup must include Editar button for route cards');

// Verify permission logic
assert.strictEqual(sandbox.canManagePresetRoutes(), false, 'Non-admin/soporte cannot manage preset routes');
sandbox.userHasRole = (role) => role === 'tecnico';
assert.strictEqual(sandbox.canManagePresetRoutes(), false, 'Technician cannot manage preset routes');
sandbox.userHasRole = (...roles) => roles.includes('soporte');
assert.strictEqual(sandbox.canManagePresetRoutes(), true, 'Soporte can manage preset routes');
sandbox.userHasRole = (...roles) => roles.includes('administrador') || roles.includes('admin');
assert.strictEqual(sandbox.canManagePresetRoutes(), true, 'Admin can manage preset routes');

// Test creating a custom route
const initialRoutesCount = sandbox.getAllPresetRoutes().length;
const testCustomRoute = {
  id: 'custom_route_test_1',
  name: 'Ruta Personalizada Prueba',
  category: 'Chilpancingo / Centro',
  mapsUrl: 'https://maps.app.goo.gl/test',
  notes: 'Notas de prueba',
  stops: ['Tixtla', 'Chilapa'],
  continuations: [],
  isCustom: true
};
sandbox.saveCustomPresetRoutes([testCustomRoute]);
const updatedRoutes = sandbox.getAllPresetRoutes();
assert.strictEqual(updatedRoutes.length, initialRoutesCount + 1, 'Custom route must be added to all routes');
const foundCustom = updatedRoutes.find(r => r.id === 'custom_route_test_1');
assert(foundCustom, 'Custom route must be findable');
assert.strictEqual(foundCustom.name, 'Ruta Personalizada Prueba', 'Custom route name must match');
console.log('✓ Item 8 Passed: Admin & Soporte create/edit routes and custom routes store verified.');

// 9. Quick configuration on add: route name, technician assignment, and editable stops
console.log('9. Checking quick configuration on route add (name, techs, editable stops)...');
assert(presetRoutesJs.includes('preset-confirm-plan-name'), 'Confirm modal must include plan name input');
assert(presetRoutesJs.includes('preset-quick-techs-list'), 'Confirm modal must include quick tech assignment list');
assert(presetRoutesJs.includes('preset-confirm-stop-input'), 'Confirm modal must include editable stop inputs');

// Check quick options application in attachPresetRouteToPlan
let planCreated = null;
sandbox.state.weekPlan.__shared_plan__._generalPlans = [
  { id: 'gp_old', name: 'Plan Anterior', assignedTechId: 'tech-1', assignedTechIds: ['tech-1'], stops: [] }
];
sandbox.state.technicians = [
  { id: 'tech-1', nombre: 'Carlos López' },
  { id: 'tech-2', nombre: 'Jesus Ramirez' }
];

sandbox.selectGeneralPlan = (id) => {
  planCreated = sandbox.state.weekPlan.__shared_plan__._generalPlans.find(p => p.id === id);
};

// Attach with quick options (custom name, renamed stops, assigned tech-1 and tech-2)
sandbox.attachPresetRouteToPlan('custom_route_test_1', true, true, {
  customPlanName: 'Mi Ruta Personalizada Renombrada',
  customStops: [
    { originalName: 'Tixtla', newName: 'Tixtla Centro' },
    { originalName: 'Chilapa', newName: 'Chilapa de Alvarez' }
  ],
  selectedTechIds: ['tech-1', 'tech-2']
});

assert(planCreated, 'Plan must be created and selected');
assert.strictEqual(planCreated.name, 'Mi Ruta Personalizada Renombrada', 'Plan name must reflect custom quick configuration name');
assert.deepStrictEqual(planCreated.assignedTechIds, ['tech-1', 'tech-2'], 'Plan must assign selected technicians');
assert.strictEqual(planCreated.assignedTechId, 'tech-1', 'First selected tech must be primary assignedTechId');
assert.strictEqual(planCreated.stops[0].name, 'Tixtla Centro', 'First stop must reflect edited stop name');
assert.strictEqual(planCreated.stops[1].name, 'Chilapa de Alvarez', 'Second stop must reflect edited stop name');

// Check that tech-1 was unassigned from old plan to respect 1-plan-per-tech invariant
const oldPlan = sandbox.state.weekPlan.__shared_plan__._generalPlans.find(p => p.id === 'gp_old');
assert(!oldPlan.assignedTechIds.includes('tech-1'), 'Assigned technician must be unassigned from other plans');

console.log('✓ Item 9 Passed: Quick configuration on add (custom plan name, tech assignment, stop rename) verified.');

console.log('\n--- ALL TECHNICIAN RECOMMENDED ROUTES & CONFIRMATION TESTS PASSED! ---');

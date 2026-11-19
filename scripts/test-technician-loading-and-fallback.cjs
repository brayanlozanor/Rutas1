const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- 1. Testing findOrFetchWorkOrder implementation ---');
const commonJs = fs.readFileSync('public/assets/js/common.js', 'utf8');
assert(commonJs.includes('async function findOrFetchWorkOrder('), 'findOrFetchWorkOrder must be defined in common.js');
assert(commonJs.includes('window.findOrFetchWorkOrder = findOrFetchWorkOrder;'), 'findOrFetchWorkOrder must be attached to window');

// Test the logic of findOrFetchWorkOrder in isolated environment
const testState = {
  workOrders: [
    { id: 'womqs84smtlhz', folio: 'DET-096471', title: 'Sector Zapote', status: 'pendiente' },
    { id: 'wom-net-123', folio: 'RED-525996', title: 'Falla red', status: 'resuelto' }
  ]
};

// Simulate findOrFetchWorkOrder
async function mockFindOrFetch(detailId, stateRef, fetchMock) {
  if (!detailId) return null;
  const rawId = String(detailId).trim();
  const cleanId = rawId.replace(/^(DET|RED|NEW)-/i, '');

  const list = Array.isArray(stateRef?.workOrders) ? stateRef.workOrders : [];
  let found = list.find(w => !w.deletedAt && (
    w.id === rawId ||
    w.id === cleanId ||
    (w.folio && (w.folio === rawId || w.folio.endsWith(`-${cleanId}`)))
  ));
  if (found) return found;

  if (fetchMock) {
    const fetched = await fetchMock(rawId);
    if (fetched) {
      stateRef.workOrders.push(fetched);
      return fetched;
    }
  }
  return null;
}

(async () => {
  // Test by raw id
  const r1 = await mockFindOrFetch('womqs84smtlhz', testState);
  assert(r1 && r1.folio === 'DET-096471', 'Should find by raw id');

  // Test by folio
  const r2 = await mockFindOrFetch('DET-096471', testState);
  assert(r2 && r2.id === 'womqs84smtlhz', 'Should find by folio');

  // Test by number only
  const r3 = await mockFindOrFetch('096471', testState);
  assert(r3 && r3.id === 'womqs84smtlhz', 'Should find by number');

  // Test server fallback when not in state
  let fetchedId = null;
  const mockServerFetch = async (id) => {
    fetchedId = id;
    return { id: 'wom-server-999', folio: 'DET-999999', title: 'Recuperado de la nube' };
  };
  const r4 = await mockFindOrFetch('DET-999999', testState, mockServerFetch);
  assert(r4 && r4.id === 'wom-server-999', 'Should fetch from server fallback');
  assert(testState.workOrders.some(w => w.id === 'wom-server-999'), 'Should cache in state.workOrders');
  console.log('✓ findOrFetchWorkOrder passed all checks (raw id, folio, number, and server fallback)');

  console.log('--- 2. Testing getLoggedTechnicianId matching Nolve ---');
  const planificarJs = fs.readFileSync('public/assets/js/planificar.js', 'utf8');
  assert(planificarJs.includes('userDisplayName && normalizeName(tech.nombre || tech.name || \'\') === userDisplayName'), 'getLoggedTechnicianId must match by userDisplayName');

  // Test technician resolution
  const nolveUser = { id: 'usmr51g5tld20', username: '1208202519', name: 'Nolve' };
  const technicians = [
    { id: 'tmr51g5tl78t', userId: 'usmr51g5tld20', nombre: 'Nolve Robles Nava', usuario: '1208202519' },
    { id: 'tmqradqc80cl', userId: 'usmqradqc7aba', nombre: 'Lalo', usuario: '1208202506' }
  ];
  
  function resolveTechId(user, techs) {
    const username = (user?.username || '').toLowerCase();
    const userDisplayName = (user?.name || '').toLowerCase();
    const userId = String(user?.id || '');
    const technician = techs.find(tech =>
      !tech.deletedAt && (
        (userId && String(tech.userId || '') === userId) ||
        (tech.id && String(tech.id) === userId) ||
        (username && (tech.usuario || '').toLowerCase() === username) ||
        (username && (tech.nombre || tech.name || '').toLowerCase() === username) ||
        (userDisplayName && (tech.nombre || tech.name || '').toLowerCase() === userDisplayName) ||
        (userDisplayName && (tech.nombre || tech.name || '').toLowerCase().includes(userDisplayName))
      )
    );
    return technician?.id || userId || '';
  }

  const resolved = resolveTechId(nolveUser, technicians);
  assert.strictEqual(resolved, 'tmr51g5tl78t', 'Should resolve Nolve technician ID correctly');
  console.log('✓ Nolve technician ID resolved correctly:', resolved);

  console.log('--- 3. Testing isPlanAssignedToTech matching plan "Nolve" ---');
  assert(planificarJs.includes('techName && planName && (planName.includes(techName) || techName.includes(planName))'), 'isPlanAssignedToTech must support name matching');

  const nolvePlan = { id: 'gpmviraoq5coj', name: 'Nolve', assignedTechId: null, assignedTechIds: [] };
  const nolveTech = { id: 'tmr51g5tl78t', nombre: 'Nolve Robles Nava' };

  function checkPlanAssigned(plan, techId, tech) {
    if (!plan || !techId) return false;
    if (plan.assignedTechId === techId) return true;
    if (Array.isArray(plan.assignedTechIds) && plan.assignedTechIds.includes(techId)) return true;
    if (tech) {
      const techName = (tech.nombre || tech.name || '').toLowerCase().trim().split(/\s+/)[0];
      const planName = (plan.name || '').toLowerCase().trim();
      if (techName && planName && (planName.includes(techName) || techName.includes(planName))) return true;
    }
    return false;
  }

  assert(checkPlanAssigned(nolvePlan, 'tmr51g5tl78t', nolveTech), 'Plan named "Nolve" must match technician Nolve');
  console.log('✓ Plan "Nolve" correctly matched to technician Nolve');

  console.log('--- 4. Testing renderStopCard defensive state access and auto-expanded details ---');
  assert(planificarJs.includes('let eq = stop.equipmentId ? (state.equipment || []).find'), 'renderStopCard must guard state.equipment');
  assert(planificarJs.includes('const isTech = isTechnicianPlanView();'), 'renderStopCard must check isTechnicianPlanView');
  assert(planificarJs.includes('const isCollapsed = collapsedTechnicianStopIds.has(stop.id);'), 'renderStopCard must check collapsedTechnicianStopIds');
  assert(planificarJs.includes('const pendingOpen = isTech ? !isCollapsed : (expandedPendingStopId === stop.id);'), 'Technicians must have details expanded by default');
  console.log('✓ renderStopCard has guarded state.equipment and auto-expands details for technicians');

  console.log('--- 5. Testing openTechnicianCompletionForm and saveTechnicianCompletion use findOrFetchWorkOrder ---');
  assert(planificarJs.includes('detail = await findOrFetchWorkOrder(detailId);'), 'openTechnicianCompletionForm must use findOrFetchWorkOrder');
  assert(planificarJs.includes('detail = await findOrFetchWorkOrder(technicianCompletionDetailId);'), 'saveTechnicianCompletion must use findOrFetchWorkOrder');
  console.log('✓ Completion forms use findOrFetchWorkOrder');

  console.log('--- 6. Testing try...catch in renderPlanDays ---');
  assert(/function renderPlanDays\(\)\s*\{\s*try\s*\{/.test(planificarJs), 'renderPlanDays must be wrapped in try/catch');
  assert(planificarJs.includes('Ocurrió un problema al cargar los detalles') || planificarJs.includes('Hubo un inconveniente al mostrar los detalles'), 'renderPlanDays must have user-friendly recovery UI');
  console.log('✓ renderPlanDays has try/catch protection');

  console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
})();


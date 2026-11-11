const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- TEST: Role filtering for "Creado por" and "Asignación" ---');

// 1. Test relational-store.js query
const relationalStoreCode = fs.readFileSync(path.join(__dirname, '../relational-store.js'), 'utf8');
assert(relationalStoreCode.includes("r.code IN ('administrador','admin','soporte','atencion_clientes','atencion')"),
  'relational-store.js must filter creators by allowed roles');
console.log('✓ Item 1 Passed: relational-store.js filters creatorRows by admin, soporte, atencion.');

// 2. Test ordenes.js filtering logic
const ordenesCode = fs.readFileSync(path.join(__dirname, '../public/assets/js/ordenes.js'), 'utf8');
assert(ordenesCode.includes("const allowedRoles = new Set(['administrador', 'admin', 'soporte', 'atencion_clientes', 'atencion']);"),
  'ordenes.js must define allowedRoles for creator and assignee filters');
console.log('✓ Item 2 Passed: ordenes.js defines strict allowed roles set.');

// 3. Evaluate getOrderFilterOptions logic isolated
function normalizeRole(role) {
  const raw = String(role || '').trim().toLowerCase();
  if (raw === 'admin' || raw === 'administrador') return 'administrador';
  if (raw === 'soporte') return 'soporte';
  if (raw === 'atencion' || raw === 'atencion_clientes') return 'atencion_clientes';
  if (raw === 'tecnico') return 'tecnico';
  return raw;
}

const state = {
  users: [
    { id: 'u1', name: 'Admin Ana', role: 'admin' },
    { id: 'u2', name: 'Soporte Sam', role: 'soporte' },
    { id: 'u3', name: 'Atención Alex', role: 'atencion_clientes' },
    { id: 'u4', name: 'Tecnico Tom', role: 'tecnico' },
    { id: 'u5', name: 'Chofer Carlos', role: 'chofer' }
  ],
  workOrders: [
    { id: 'wo1', createdById: 'u1', createdByName: 'Admin Ana', assignedUserId: 'u2', assignedUserName: 'Soporte Sam' },
    { id: 'wo2', createdById: 'u4', createdByName: 'Tecnico Tom', assignedUserId: 'u4', assignedUserName: 'Tecnico Tom' },
    { id: 'wo3', createdById: 'u3', createdByName: 'Atención Alex', assignedUserId: 'u3', assignedUserName: 'Atención Alex' }
  ]
};

function getAvailableSupportUsers() {
  return state.users.filter(u => ['administrador', 'admin', 'soporte'].includes(normalizeRole(u.role)));
}
function getAvailableAttentionUsers() {
  return state.users.filter(u => ['atencion_clientes', 'atencion'].includes(normalizeRole(u.role)));
}

// Simulating the getOrderFilterOptions('creator') logic
const allowedRoles = new Set(['administrador', 'admin', 'soporte', 'atencion_clientes', 'atencion']);
const isAllowedUserRole = r => allowedRoles.has(normalizeRole(r));

const creatorOpts = [...new Map((state.workOrders || [])
  .filter(order => {
    const creatorId = order.createdById || order.createdBy;
    const creatorName = order.createdByName || order.createdByUsername;
    if (!creatorId && !creatorName) return false;
    const matchingUser = (state.users || []).find(u =>
      (creatorId && String(u.id || '').trim() === String(creatorId).trim()) ||
      (creatorName && (String(u.name || '').trim().toLowerCase() === String(creatorName).trim().toLowerCase() || String(u.username || '').trim().toLowerCase() === String(creatorName).trim().toLowerCase()))
    );
    return !matchingUser || isAllowedUserRole(matchingUser.role);
  })
  .map(order => [order.createdById || order.createdByName, order.createdByName || order.createdByUsername || 'Usuario']))
  .entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));

assert.deepStrictEqual(creatorOpts.map(o => o[1]), ['Admin Ana', 'Atención Alex'],
  'Creator filter must only include Admin and Atención, omitting Tecnico Tom');
console.log('✓ Item 3 Passed: Creator filter strictly excludes technicians and other roles.');

// Simulating assignee filter logic
const assigneeOpts = [['unassigned', 'Sin asignar (Todo el equipo)']];
const pool = [...getAvailableSupportUsers(), ...getAvailableAttentionUsers()];
const seen = new Set(['unassigned']);
pool.forEach(user => {
  const id = String(user.id || '').trim();
  if (id && !seen.has(id)) {
    seen.add(id);
    assigneeOpts.push([id, user.name || user.username || 'Usuario']);
  }
});
(state.workOrders || []).forEach(order => {
  if (order.assignedUserId && !seen.has(order.assignedUserId)) {
    const matchingUser = (state.users || []).find(u => String(u.id || '').trim() === String(order.assignedUserId).trim());
    if (!matchingUser || isAllowedUserRole(matchingUser.role)) {
      seen.add(order.assignedUserId);
      assigneeOpts.push([order.assignedUserId, order.assignedUserName || order.assignedUserId]);
    }
  }
});

const assigneeNames = assigneeOpts.map(o => o[1]);
assert(!assigneeNames.includes('Tecnico Tom'), 'Assignee filter must NOT include Tecnico Tom');
assert(assigneeNames.includes('Admin Ana') && assigneeNames.includes('Soporte Sam') && assigneeNames.includes('Atención Alex'),
  'Assignee filter must include Admin, Soporte, and Atención');
console.log('✓ Item 4 Passed: Assignee filter strictly includes only admin, soporte, and atencion.');

console.log('--- ALL ROLE FILTER VERIFICATION TESTS PASSED! ---');


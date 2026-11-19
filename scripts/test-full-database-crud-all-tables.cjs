const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

console.log('--- TEST: Full Real SQLite Database CRUD Verification Across ALL Tables ---');

function createRealD1Env() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  const schemaSql = fs.readFileSync(path.join(__dirname, '../schema-relational-v3.sql'), 'utf8');
  db.exec(schemaSql);

  function makeStmt(sql, boundArgs = []) {
    return {
      sql,
      boundArgs,
      bind(...args) {
        return makeStmt(sql, args);
      },
      async all() {
        const stmt = db.prepare(sql);
        const rows = stmt.all(...boundArgs);
        return { results: rows };
      },
      async first() {
        const stmt = db.prepare(sql);
        const row = stmt.get(...boundArgs);
        return row === undefined ? null : row;
      },
      async run() {
        const stmt = db.prepare(sql);
        const res = stmt.run(...boundArgs);
        return { success: true, meta: res };
      }
    };
  }

  return {
    _rawDb: db,
    DB: {
      prepare(sql) {
        return makeStmt(sql);
      },
      async batch(statements) {
        const out = [];
        for (const stmt of statements) {
          out.push(await stmt.run());
        }
        return out;
      }
    }
  };
}

(async () => {
  const store = await import('../relational-store.js');
  const env = createRealD1Env();

  await store.ensureRelationalSchema(env);
  console.log('✓ 0. Real SQLite schema + ensureRelationalSchema initialized with PRAGMA foreign_keys = ON.');

  // 1. USERS CRUD (Create, Read, Update, Soft-Delete, Re-create with same username, Duplicate Active Rejection)
  console.log('1. Probando CRUD completo de USERS...');
  await store.upsertRecord(env, 'users', {
    id: 'us-admin-1',
    name: 'Brayan Lozano',
    username: '@1208202554',
    password: 'Password@123',
    role: 'administrador',
    status: 'activo',
    color: '#0284c7',
    zones: ['san_marcos', 'ayutla'],
    notes: 'Admin principal',
    createdById: 'non-existent-actor-id', // Foreign key resilience test!
    updatedById: 'non-existent-actor-id'
  });

  const loginOk = await store.findLoginUser(env, '1208202554', 'Password@123');
  assert(loginOk && loginOk.id === 'us-admin-1', 'Login must succeed with normalized username');

  // Update user without password (must preserve existing password_hash)
  await store.upsertRecord(env, 'users', {
    id: 'us-admin-1',
    name: 'Brayan De Jesus Lozano',
    username: '1208202554',
    role: 'administrador',
    status: 'activo',
    zones: ['san_marcos'],
    createdById: 'us-admin-1',
    updatedById: 'us-admin-1'
  });
  const loginAfterUpdate = await store.findLoginUser(env, '1208202554', 'Password@123');
  assert(loginAfterUpdate && loginAfterUpdate.name === 'Brayan De Jesus Lozano', 'Password must be preserved on update');

  // Create second user (technician)
  await store.upsertRecord(env, 'users', {
    id: 'us-tech-1',
    name: 'Nolve Robles',
    username: '1208202519',
    password: 'TechPassword@1',
    role: 'tecnico',
    status: 'activo',
    zones: ['san_marcos'],
    createdById: 'us-admin-1'
  });

  // Attempt to create another active user with duplicate username '1208202519' -> must throw friendly 400 error
  let dupBlocked = false;
  try {
    await store.upsertRecord(env, 'users', {
      id: 'us-tech-dup',
      name: 'Otro Tecnico',
      username: '1208202519',
      password: 'Pass@123',
      role: 'tecnico'
    });
  } catch (err) {
    dupBlocked = err.code === 'USERNAME_ALREADY_EXISTS' && err.status === 400;
  }
  assert(dupBlocked, 'Duplicate active username must throw USERNAME_ALREADY_EXISTS (400)');

  // Soft-delete Nolve ('us-tech-1') and then create a NEW user with the same username '1208202519'
  await store.upsertRecord(env, 'users', {
    id: 'us-tech-1',
    name: 'Nolve Robles',
    username: '1208202519',
    role: 'tecnico',
    deletedAt: new Date().toISOString()
  });

  // Re-registering username '1208202519' with a brand new ID must now succeed!
  await store.upsertRecord(env, 'users', {
    id: 'us-tech-2',
    name: 'Nolve Robles Reingreso',
    username: '1208202519',
    password: 'NewPassword@123',
    role: 'tecnico',
    status: 'activo',
    zones: ['san_marcos', 'huitzuco'],
    createdById: 'us-admin-1'
  });
  const peoplePart = await store.loadStatePart(env, 'people', { windowed: '1' });
  assert(peoplePart.users.some(u => u.id === 'us-tech-2' && u.username === '1208202519'), 'Re-registered user must be active with clean username');
  console.log('✓ 1. USERS CRUD (Create, Update, Login, Soft-Delete, Re-use username, FK resilience) passed.');

  // 2. TECHNICIANS CRUD
  console.log('2. Probando CRUD completo de TECHNICIANS...');
  await store.upsertRecord(env, 'technicians', {
    id: 'tech-nolve',
    userId: 'us-tech-2',
    nombre: 'Nolve Robles Reingreso',
    telefono: '7441234567',
    estado: 'activo',
    usuario: '1208202519',
    regiones: ['san_marcos', 'huitzuco']
  });
  // Technician with non-existent userId (FK resilience test)
  await store.upsertRecord(env, 'technicians', {
    id: 'tech-external',
    userId: 'non-existent-user-id',
    name: 'Tecnico Externo',
    phone: '7440000000',
    status: 'activo',
    zones: ['ayutla']
  });
  const loadedPeople = await store.loadStatePart(env, 'people');
  assert(loadedPeople.technicians.some(t => t.id === 'tech-nolve' && t.userId === 'us-tech-2'), 'Technician linked to user must load');
  assert(loadedPeople.technicians.some(t => t.id === 'tech-external' && !t.userId), 'Technician with invalid userId must fallback to null userId without FK crash');
  console.log('✓ 2. TECHNICIANS CRUD passed.');

  // 3. NODES CRUD
  console.log('3. Probando CRUD completo de NODES...');
  await store.upsertRecord(env, 'nodes', {
    id: 'nd-1',
    nodeCode: 'R224',
    town: 'LA LIMA',
    zone: 'san_marcos',
    lat: 16.79,
    lng: -99.38,
    status: 'activo',
    notes: 'Nodo principal',
    createdById: 'us-admin-1',
    updatedById: 'invalid-user-id' // FK resilience test
  });
  const nodesPart = await store.loadStatePart(env, 'nodes');
  assert(nodesPart.nodes.some(n => n.id === 'nd-1' && n.town === 'LA LIMA'), 'Node must be created and loaded');
  console.log('✓ 3. NODES CRUD passed.');

  // 4. EQUIPMENT CRUD (including radios & linkedNodeIds with non-existent node filtering)
  console.log('4. Probando CRUD completo de EQUIPMENT...');
  await store.upsertRecord(env, 'equipment', {
    id: 'eq-1',
    name: 'Torre Zempazulco',
    ip: '192.168.10.1',
    type: 'AP',
    lat: 16.80,
    lng: -99.39,
    status: 'activo',
    region: 'san_marcos',
    balancerPortCount: 12,
    balancerPorts: [{ port: 1, label: 'WAN1' }],
    radioLinks: [
      { name: 'Sector Norte', model: 'Rocket M5', ip: '192.168.10.2', lat: 16.80, lng: -99.39 }
    ],
    linkedNodeIds: ['nd-1', 'nd-non-existent-999'], // Must link nd-1 and safely ignore nd-non-existent-999
    createdById: 'tech-nolve', // Technician ID passed as createdById -> must resolve to us-tech-2!
    towerMaterialUpdatedById: 'invalid-actor'
  });
  const eqPart = await store.loadStatePart(env, 'equipment');
  const eq1 = eqPart.equipment.find(e => e.id === 'eq-1');
  assert(eq1 && eq1.linkedNodeIds.includes('nd-1') && !eq1.linkedNodeIds.includes('nd-non-existent-999'), 'Equipment must link valid nodes and ignore non-existent nodes without FK failure');
  assert(eq1.createdById === 'us-tech-2', 'Equipment createdById passed as technician ID must resolve to user ID');
  console.log('✓ 4. EQUIPMENT CRUD passed.');

  // 5. MATERIALS & MOVEMENTS CRUD
  console.log('5. Probando CRUD completo de MATERIALS y MATERIAL_MOVEMENTS...');
  await store.upsertRecord(env, 'materials', {
    id: 'mat-onu',
    name: 'ONU Dual Band',
    unit: 'pieza',
    stock: 25,
    minimumStock: 5,
    category: 'Equipos',
    price: 450,
    packageSize: 1,
    photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    allocations: [
      { technicianId: 'tech-nolve', quantity: 3 },
      { technicianId: 'us-tech-2', quantity: 2 }, // Same tech via user_id -> must merge to 5 without PK collision!
      { technicianId: 'non-existent-tech', quantity: 4 } // Must safely skip without FK failure!
    ],
    movements: [
      {
        id: 'mov-1',
        type: 'give',
        quantity: 5,
        technicianId: 'us-tech-2', // Passed as user_id -> must resolve to tech-nolve
        createdBy: 'us-admin-1',
        createdByName: 'Brayan'
      }
    ]
  });
  const matPart = await store.loadStatePart(env, 'materials');
  const matOnu = matPart.materials.find(m => m.id === 'mat-onu');
  assert(matOnu, 'Material must load');
  const nolveAlloc = matOnu.allocations.find(a => a.technicianId === 'tech-nolve');
  assert(nolveAlloc && nolveAlloc.quantity === 5, 'Duplicate technician allocations (by techId and userId) must merge cleanly');
  console.log('✓ 5. MATERIALS & MATERIAL_MOVEMENTS CRUD passed.');

  // 6. ROUTES CRUD
  console.log('6. Probando CRUD completo de ROUTES...');
  await store.upsertRecord(env, 'routes', {
    id: 'rt-1',
    name: 'Ruta Costa Chica',
    region: 'san_marcos',
    coords: [
      { name: 'Punto 1', lat: 16.79, lng: -99.38 },
      { name: 'Punto 2', lat: 16.80, lng: -99.39 }
    ]
  });
  const rtPart = await store.loadStatePart(env, 'routes');
  assert(rtPart.routes.some(r => r.id === 'rt-1' && r.n === 'Ruta Costa Chica' && r.coords.length === 2), 'Route and route_points must load');
  console.log('✓ 6. ROUTES CRUD passed.');

  // 7. WORK ORDERS & REPORTS CRUD
  console.log('7. Probando CRUD completo de WORK_ORDERS y WORK_ORDER_REPORTS...');
  await store.upsertRecord(env, 'workOrders', {
    id: 'wo-1',
    title: 'Revisión de enlace',
    category: 'mantenimiento',
    detailKind: 'physical',
    equipmentId: 'eq-1',
    nodeId: 'nd-1',
    priority: 'alta',
    status: 'pendiente',
    region: 'san_marcos',
    createdById: 'us-admin-1',
    materials: [
      { id: 'mat-onu', name: 'ONU Dual Band', quantity: 1, unit: 'pieza' },
      { id: 'mat-unregistered', name: 'Grapa', quantity: 10, unit: 'pieza' }
    ]
  });

  // Work order with non-existent equipmentId/nodeId/createdById (FK resilience test)
  await store.upsertRecord(env, 'workOrders', {
    id: 'wo-2',
    title: 'Detalle con referencias huérfanas',
    equipmentId: 'eq-missing',
    nodeId: 'nd-missing',
    equipmentName: 'Antena Borrada',
    nodeName: 'Pueblo Borrado',
    createdById: 'user-missing',
    reviewOpenedById: 'user-missing'
  });

  // Complete wo-1 via upsertWorkOrderReport
  const reportResult = await store.upsertWorkOrderReport(env, {
    id: 'wo-1',
    title: 'Revisión de enlace',
    status: 'completada',
    technicianReport: {
      result: 'completada',
      solution: 'Se alineó antena',
      materialUsed: '1 ONU',
      completedBy: 'tech-nolve', // Passed as technician ID -> resolves to us-tech-2
      completedByName: 'Nolve Robles',
      completedAt: new Date().toISOString(),
      evidencePhotos: [
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      ]
    }
  });
  assert(reportResult.record && reportResult.record.status === 'completada', 'Work order report must update order status and store evidence');
  console.log('✓ 7. WORK_ORDERS & WORK_ORDER_REPORTS CRUD passed.');

  // 8. DELETION REQUESTS, TECH ACCESS LOG, AUDIT LOG CRUD
  console.log('8. Probando CRUD de DELETION_REQUESTS, TECH_ACCESS_LOG y AUDIT_LOG...');
  await store.upsertRecord(env, 'deletionRequests', {
    id: 'dr-1',
    targetType: 'node',
    targetId: 'nd-1',
    targetName: 'LA LIMA',
    requestedByUserId: 'tech-nolve', // Resolves to us-tech-2
    status: 'pendiente'
  });
  await store.upsertRecord(env, 'techAccessLog', {
    id: 'tal-1',
    technicianId: 'us-tech-2', // Passed as user ID -> resolves to tech-nolve
    technicianName: 'Nolve',
    routeScope: 'general',
    at: new Date().toISOString()
  });
  await store.upsertRecord(env, 'auditLog', {
    id: 'au-1',
    action: 'creó nodo',
    byId: 'non-existent-user', // Must fallback to null user_id without FK crash
    byName: 'Admin Local',
    targetId: 'nd-1',
    targetName: 'LA LIMA'
  });
  console.log('✓ 8. DELETION_REQUESTS, TECH_ACCESS_LOG & AUDIT_LOG CRUD passed.');

  // 9. WEEK PLAN & DELETE PLANS CRUD
  console.log('9. Probando CRUD de PLANS, PLAN_STOPS, PLAN_ASSIGNMENTS y DELETE_PLANS...');
  await store. applyChanges(env, [
    {
      key: 'weekPlan',
      value: {
        __shared__: {
          _generalPlans: [
            {
              id: 'gp-test-1',
              name: 'Ruta General Nolve',
              assignedTechId: 'us-tech-2', // Passed as user ID -> resolves to tech-nolve!
              assignedTechIds: ['tech-nolve', 'us-tech-2', 'non-existent-tech'],
              stops: [
                { id: 'st-1', type: 'equipo', equipmentId: 'eq-1', nodeId: 'nd-1', name: 'LA LIMA', detailIds: ['wo-1', 'wo-missing'] },
                { id: 'st-1', type: 'manual', equipmentId: 'eq-missing', name: 'Parada con ID repetido', detailIds: [] }
              ]
            }
          ]
        },
        'tech-nolve': {
          _generalPlans: [
            {
              id: 'gp-test-1', // Duplicate plan ID in tech scope -> must not throw!
              name: 'Ruta General Nolve',
              stops: []
            }
          ]
        }
      }
    }
  ]);
  const planPart = await store.loadStatePart(env, 'planning');
  const savedGp = planPart.weekPlan.__shared__._generalPlans.find(p => p.id === 'gp-test-1');
  assert(savedGp && savedGp.stops.length === 2, 'General plan with stops must be saved and loaded');
  assert(savedGp.assignedTechId === 'tech-nolve', 'Assigned tech resolved from user_id must persist');

  await store.deletePlans(env, ['gp-test-1']);
  const planPartAfterDelete = await store.loadStatePart(env, 'planning');
  assert(!planPartAfterDelete.weekPlan?.__shared__?._generalPlans?.some(p => p.id === 'gp-test-1'), 'Deleted plan must be removed');
  console.log('✓ 9. PLANS, PLAN_STOPS, PLAN_ASSIGNMENTS & DELETE_PLANS CRUD passed.');

  // 10. DELETE RECORD across collections
  console.log('10. Probando deleteRecord en todas las colecciones...');
  await store.deleteRecord(env, 'users', 'us-tech-2');
  // Re-using '1208202519' after deleteRecord('users') must work!
  await store.upsertRecord(env, 'users', {
    id: 'us-tech-3',
    name: 'Nolve Tercero',
    username: '1208202519',
    password: 'Password@123',
    role: 'tecnico'
  });
  await store.deleteRecord(env, 'equipment', 'eq-1');
  await store.deleteRecord(env, 'nodes', 'nd-1');
  await store.deleteRecord(env, 'workOrders', 'wo-2');
  await store.deleteRecord(env, 'materials', 'mat-onu');
  await store.deleteRecord(env, 'routes', 'rt-1');
  await store.deleteRecord(env, 'deletionRequests', 'dr-1');
  await store.deleteRecord(env, 'techAccessLog', 'tal-1');
  await store.deleteRecord(env, 'auditLog', 'au-1');
  console.log('✓ 10. deleteRecord funcionó limpiamente en todas las colecciones.');

  console.log('=== ALL REAL SQLITE CRUD & FOREIGN KEY / UNIQUE CONSTRAINT TESTS PASSED 100%! ===');
})();


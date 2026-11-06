const LIST_KEYS = new Set([
  'equipment', 'nodes', 'workOrders', 'technicians', 'users',
  'techAccessLog', 'deletionRequests', 'auditLog', 'materials', 'routes',
  'materialMovements'
]);

const DAY_KEYS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo','general'];
const PASSWORD_SCHEME = 'pbkdf2_sha256';
// Cloudflare Workers Web Crypto acepta como máximo 100,000 iteraciones PBKDF2.
const PASSWORD_ITERATIONS = 100000;
const D1_IN_CHUNK_SIZE = 50;
const INSTALLATION_CATEGORIES = Object.freeze([
  'instalacion',
  'nueva_instalacion',
  'instalacion_nueva'
]);
const PHYSICAL_STATS_EXCLUDED_CATEGORIES = Object.freeze([
  ...INSTALLATION_CATEGORIES,
  'reubicacion_antena',
  'reubicacion',
  'resurtir_antena',
  'surtir_antena',
  'solicitud_respaldo',
  'solicitud_de_respaldo'
]);

function chunkValues(values,size=D1_IN_CHUNK_SIZE) {
  const source=Array.isArray(values)?values:[];
  const chunks=[];
  for(let offset=0;offset<source.length;offset+=size)chunks.push(source.slice(offset,offset+size));
  return chunks;
}

function parseJson(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function text(value, fallback = '') {
  return value === null || value === undefined ? fallback : String(value);
}

function nullableText(value) {
  const s = text(value).trim();
  return s === '' ? null : s;
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function boolInt(value, fallback = true) {
  if (value === null || value === undefined) return fallback ? 1 : 0;
  return value === false || value === 0 || String(value).toLowerCase() === 'false' ? 0 : 1;
}

function normalizeRole(role) {
  const value = text(role).trim().toLowerCase();
  return value === 'admin' ? 'administrador' : (value || 'tecnico');
}

function clone(value) {
  try { return JSON.parse(JSON.stringify(value)); } catch { return value; }
}

function generatedId(prefix = 'id') {
  return `${prefix}-${crypto.randomUUID()}`;
}

function workOrderFolio(order) {
  const isNetwork = order?.detail_kind === 'network' || /_red$|^red_/.test(String(order?.category || ''));
  const prefix = isNetwork ? 'RED' : (order?.category === 'instalacion' ? 'NEW' : 'DET');
  const source = text(order?.id || order?.created_at || 'detalle');
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) hash = ((hash * 31) + source.charCodeAt(index)) >>> 0;
  return `${prefix}-${String(hash % 1000000).padStart(6, '0')}`;
}

function isInstallationCategory(category) {
  return INSTALLATION_CATEGORIES.includes(text(category).trim().toLowerCase());
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function derivePassword(password, salt, iterations = PASSWORD_ITERATIONS) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(password || '')),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name:'PBKDF2', hash:'SHA-256', salt, iterations },
    material,
    256
  );
  return new Uint8Array(bits);
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derivePassword(password, salt);
  return `${PASSWORD_SCHEME}$${PASSWORD_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(derived)}`;
}

async function verifyPassword(password, encoded) {
  const parts = String(encoded || '').split('$');
  if (parts.length !== 4 || parts[0] !== PASSWORD_SCHEME) return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 100000) return false;
  try {
    const expected = base64UrlToBytes(parts[3]);
    const actual = await derivePassword(password, base64UrlToBytes(parts[2]), iterations);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
    return difference === 0;
  } catch {
    return false;
  }
}

async function all(env, sql, binds = []) {
  const result = await env.DB.prepare(sql).bind(...binds).all();
  return result.results || [];
}

async function first(env, sql, binds = []) {
  return env.DB.prepare(sql).bind(...binds).first();
}

async function run(env, sql, binds = []) {
  return env.DB.prepare(sql).bind(...binds).run();
}

async function getLegacyAppDataValue(env, key) {
  try {
    const row = await first(env, 'SELECT value FROM app_data WHERE key=?', [key]);
    return row?.value ?? null;
  } catch (error) {
    if (/no such table:\s*app_data/i.test(String(error?.message || error))) return null;
    throw error;
  }
}

async function ensureTechnicianMaterialStockTable(env) {
  await run(env, `CREATE TABLE IF NOT EXISTS technician_material_stock (
    material_id TEXT NOT NULL,
    technician_id TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0 CHECK(quantity >= 0),
    updated_at TEXT,
    PRIMARY KEY(material_id, technician_id),
    FOREIGN KEY(material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY(technician_id) REFERENCES technicians(id) ON DELETE CASCADE
  )`);
}

async function ensureMaterialTrackingTables(env) {
  await run(env, `CREATE TABLE IF NOT EXISTS material_photos (
    id TEXT PRIMARY KEY,
    material_id TEXT NOT NULL UNIQUE,
    storage_type TEXT NOT NULL DEFAULT 'inline_data_url',
    storage_key TEXT NOT NULL,
    created_at TEXT,
    FOREIGN KEY(material_id) REFERENCES materials(id) ON DELETE CASCADE
  )`);
  await run(env, `CREATE TABLE IF NOT EXISTS material_movements (
    id TEXT PRIMARY KEY,
    material_id TEXT NOT NULL,
    movement_type TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    technician_id TEXT,
    returned_change REAL NOT NULL DEFAULT 0,
    returned_damaged REAL NOT NULL DEFAULT 0,
    used_quantity REAL NOT NULL DEFAULT 0,
    new_installations INTEGER NOT NULL DEFAULT 0,
    reference TEXT,
    reason TEXT,
    created_by TEXT,
    created_by_name_legacy TEXT,
    created_at TEXT NOT NULL,
    status TEXT DEFAULT 'pending_receipt',
    accepted_at TEXT,
    accepted_by TEXT,
    accepted_by_name TEXT,
    handover_accepted_at TEXT,
    handover_accepted_by TEXT,
    handover_accepted_by_name TEXT,
    notes TEXT,
    updated_at TEXT,
    raw_json TEXT,
    FOREIGN KEY(material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY(technician_id) REFERENCES technicians(id) ON DELETE SET NULL
  )`);
  await run(env, 'CREATE INDEX IF NOT EXISTS idx_material_movements_material_at ON material_movements(material_id,created_at DESC)');
  const columns = new Set((await all(env, 'PRAGMA table_info(material_movements)')).map(c => c.name));
  const movementCols = [
    ['status', "TEXT DEFAULT 'pending_receipt'"],
    ['accepted_at', 'TEXT'],
    ['accepted_by', 'TEXT'],
    ['accepted_by_name', 'TEXT'],
    ['handover_accepted_at', 'TEXT'],
    ['handover_accepted_by', 'TEXT'],
    ['handover_accepted_by_name', 'TEXT'],
    ['notes', 'TEXT'],
    ['updated_at', 'TEXT'],
    ['raw_json', 'TEXT']
  ];
  for (const [name, definition] of movementCols) {
    if (columns.has(name)) continue;
    try {
      await run(env, `ALTER TABLE material_movements ADD COLUMN ${name} ${definition}`);
    } catch (e) {
      if (!/duplicate column name/i.test(String(e?.message || e))) throw e;
    }
  }
}

async function syncMaterialInventorySchema(env) {
  const columns = new Set((await all(env, 'PRAGMA table_info(materials)')).map(column => column.name));
  const requiredColumns = [
    ['stock', 'REAL NOT NULL DEFAULT 0'],
    ['minimum_stock', 'REAL NOT NULL DEFAULT 0'],
    ['category', 'TEXT'],
    ['price', 'REAL NOT NULL DEFAULT 0'],
    ['package_size', 'REAL NOT NULL DEFAULT 1']
  ];
  for (const [name, definition] of requiredColumns) {
    if (columns.has(name)) continue;
    try {
      await run(env, `ALTER TABLE materials ADD COLUMN ${name} ${definition}`);
    } catch (error) {
      // Dos solicitudes pueden detectar la misma columna faltante al mismo tiempo.
      // Si otra ya la agrego, la migracion esta completa y podemos continuar.
      if (!/duplicate column name/i.test(String(error?.message || error))) throw error;
    }
  }
  await ensureTechnicianMaterialStockTable(env);
  await ensureMaterialTrackingTables(env);
}

async function syncWorkOrderColumns(env) {
  let colInfo;
  try {
    colInfo = await all(env, 'PRAGMA table_info(work_orders)');
  } catch (e) {
    return;
  }
  if (!colInfo || colInfo.length === 0) return;
  const columns = new Set(colInfo.map(column => column.name));
  const hadDetailKind = columns.has('detail_kind');
  const requiredColumns = [
    ['category', 'TEXT'],
    ['client_phone', 'TEXT'],
    ['detail_kind', "TEXT NOT NULL DEFAULT 'physical'"],
    ['review_opened_at', 'TEXT'],
    ['review_opened_by', 'TEXT'],
    ['reviewed_at', 'TEXT'],
    ['last_resent_at', 'TEXT'],
    ['follow_ups_json', 'TEXT'],
    ['source_order_id', 'TEXT'],
    ['assigned_user_id', 'TEXT'],
    ['assigned_user_name', 'TEXT'],
    ['target_role', 'TEXT'],
    ['origin_role', 'TEXT']
  ];
  for (const [name, definition] of requiredColumns) {
    if (columns.has(name)) continue;
    try {
      await run(env, `ALTER TABLE work_orders ADD COLUMN ${name} ${definition}`);
    } catch (error) {
      if (!/duplicate column name/i.test(String(error?.message || error))) {
        // Ignorar si ya existe
      }
    }
  }
  if (hadDetailKind) {
    const migrationKey = 'work_orders_physical_backfill_v1';
    try {
      const migrated = await first(env, 'SELECT value_json FROM app_settings WHERE key=?', [migrationKey]);
      if (!migrated) {
        await run(env, "UPDATE work_orders SET detail_kind='physical' WHERE COALESCE(detail_kind,'')=''");
        await run(env, `INSERT INTO app_settings(key,value_json,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO NOTHING`, [migrationKey,JSON.stringify({completed:true}),new Date().toISOString()]);
      }
    } catch (e) {
      // Ignore if app_settings is not ready yet
    }
  }
  try {
    await run(env, 'CREATE INDEX IF NOT EXISTS idx_work_orders_detail_kind ON work_orders(detail_kind)');
    await run(env, 'CREATE INDEX IF NOT EXISTS idx_work_orders_target_role ON work_orders(target_role)');
    await run(env, 'CREATE INDEX IF NOT EXISTS idx_work_orders_origin_role ON work_orders(origin_role)');
    await run(env, 'CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_user ON work_orders(assigned_user_id)');
  } catch (e) {
    // Indexes may already exist
  }
}

async function syncUserColumns(env) {
  try {
    const colInfo = await all(env, 'PRAGMA table_info(users)');
    if (!colInfo || colInfo.length === 0) return;
    const columns = new Set(colInfo.map(c => c.name));
    if (!columns.has('color')) {
      await run(env, 'ALTER TABLE users ADD COLUMN color TEXT');
    }
  } catch (e) {
    // Ignore if already added or concurrency
  }
}

async function ensurePlansColumns(env) {
  try {
    const colInfo = await all(env, 'PRAGMA table_info(plans)');
    if (!colInfo || colInfo.length === 0) return;
    const columns = new Set(colInfo.map(c => c.name));
    if (!columns.has('scheduled_date')) {
      try {
        await run(env, 'ALTER TABLE plans ADD COLUMN scheduled_date TEXT');
      } catch (e) {
        if (!/duplicate column name/i.test(String(e?.message || error))) throw e;
      }
    }
  } catch (e) {
    // Table plans might not exist yet
  }
}

async function ensurePerformanceIndices(env) {
  const stmts = [
    'CREATE INDEX IF NOT EXISTS idx_audit_log_target_at ON audit_log(target_id, at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_work_order_materials_order ON work_order_materials(work_order_id, id)',
    'CREATE INDEX IF NOT EXISTS idx_work_order_reports_order ON work_order_reports(work_order_id)',
    'CREATE INDEX IF NOT EXISTS idx_work_order_evidence_order_created ON work_order_evidence(work_order_id, created_at, id)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_radios_equipment_position ON equipment_radios(equipment_id, position)',
    'CREATE INDEX IF NOT EXISTS idx_equipment_nodes_equipment_position ON equipment_nodes(equipment_id, position, node_id)',
    'CREATE INDEX IF NOT EXISTS idx_plan_stops_plan_position ON plan_stops(plan_id, position)',
    'CREATE INDEX IF NOT EXISTS idx_plan_stop_orders_stop_position ON plan_stop_orders(plan_stop_id, position, work_order_id)'
  ];
  for (const sql of stmts) {
    try {
      await run(env, sql);
    } catch (e) {
      // Ignorar si los índices o tablas aún no existen
    }
  }
}

let schemaEnsuredPromise = null;
let schemaEnsuredAt = 0;
const SCHEMA_CHECK_INTERVAL_MS = 60 * 1000;

export async function ensureRelationalSchema(env) {
  const now = Date.now();
  if (schemaEnsuredPromise && (now - schemaEnsuredAt) < SCHEMA_CHECK_INTERVAL_MS) {
    return schemaEnsuredPromise;
  }
  schemaEnsuredPromise = (async () => {
    try {
      await run(env, `CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value_json TEXT, updated_at TEXT)`);
    } catch (e) {
      // Ignore if table exists or concurrency
    }
    await syncWorkOrderColumns(env).catch(e => console.warn('[ensureRelationalSchema] work_orders:', e));
    await syncUserColumns(env).catch(e => console.warn('[ensureRelationalSchema] users:', e));
    await syncMaterialInventorySchema(env).catch(e => console.warn('[ensureRelationalSchema] materials:', e));
    await ensurePlansColumns(env).catch(e => console.warn('[ensureRelationalSchema] plans:', e));
    await ensurePerformanceIndices(env).catch(e => console.warn('[ensureRelationalSchema] indices:', e));
    await ensureWorkOrderRelationRecovery(env).catch(e => console.warn('[ensureRelationalSchema] recovery:', e));
    schemaEnsuredAt = Date.now();
  })().catch(err => {
    schemaEnsuredPromise = null;
    throw err;
  });
  return schemaEnsuredPromise;
}

async function batchChunks(env, statements, size = 80) {
  for (let i = 0; i < statements.length; i += size) {
    await env.DB.batch(statements.slice(i, i + size));
  }
}

async function ensureWorkOrderRelationRecovery(env) {
  const migrationKey='work_order_relation_recovery_v1';
  if(await first(env,'SELECT value_json FROM app_settings WHERE key=?',[migrationKey]))return;

  const missingRows=await all(env,`SELECT id,equipment_id,node_id,equipment_name_legacy,node_code_legacy,node_name_legacy,town_legacy
    FROM work_orders
    WHERE deleted_at IS NULL AND (equipment_id IS NULL OR node_id IS NULL)`);
  const missingById=new Map(missingRows.map(row=>[row.id,row]));
  const [equipmentRows,nodeRows]=await Promise.all([
    all(env,'SELECT id,name FROM equipment WHERE deleted_at IS NULL'),
    all(env,'SELECT id,node_code,town FROM nodes WHERE deleted_at IS NULL')
  ]);
  const equipmentById=new Map(equipmentRows.map(row=>[row.id,row]));
  const nodeById=new Map(nodeRows.map(row=>[row.id,row]));
  const statements=[];
  const queueRecovery=(row,source={})=>{
    if(!row)return;
    const requestedEquipmentId=nullableText(source.equipmentId);
    const requestedNodeId=nullableText(source.nodeId);
    const equipmentId=!row.equipment_id&&requestedEquipmentId&&equipmentById.has(requestedEquipmentId)?requestedEquipmentId:null;
    const nodeId=!row.node_id&&requestedNodeId&&nodeById.has(requestedNodeId)?requestedNodeId:null;
    const equipment=equipmentById.get(equipmentId||row.equipment_id)||null;
    const node=nodeById.get(nodeId||row.node_id)||null;
    const equipmentName=nullableText(source.equipmentName)||equipment?.name||null;
    const nodeCode=nullableText(source.nodeCode)||node?.node_code||null;
    const town=nullableText(source.town)||node?.town||null;
    const nodeName=nullableText(source.nodeName)||(nodeCode&&town?`${nodeCode} · ${town}`:town)||null;
    const recoveredRelation=!!equipmentId||!!nodeId;
    const labelOnlyRecovery=!row.equipment_id&&!row.node_id&&(!!equipmentName||!!nodeCode||!!nodeName||!!town);
    if(!recoveredRelation&&!labelOnlyRecovery)return;
    statements.push(env.DB.prepare(`UPDATE work_orders SET
      equipment_id=COALESCE(equipment_id,?),node_id=COALESCE(node_id,?),
      equipment_name_legacy=COALESCE(NULLIF(equipment_name_legacy,''),?),
      node_code_legacy=COALESCE(NULLIF(node_code_legacy,''),?),
      node_name_legacy=COALESCE(NULLIF(node_name_legacy,''),?),
      town_legacy=COALESCE(NULLIF(town_legacy,''),?) WHERE id=?`)
      .bind(equipmentId,nodeId,equipmentName,nodeCode,nodeName,town,row.id));
    if(equipmentId)row.equipment_id=equipmentId;
    if(nodeId)row.node_id=nodeId;
  };

  const legacyOrders=parseJson(await getLegacyAppDataValue(env,'workOrders'),[]);
  if(Array.isArray(legacyOrders)){
    for(const legacy of legacyOrders)queueRecovery(missingById.get(legacy?.id),legacy);
  }

  const planLinks=await all(env,`SELECT pso.work_order_id,ps.equipment_id,ps.node_id,ps.name,ps.raw_json
    FROM plan_stop_orders pso JOIN plan_stops ps ON ps.id=pso.plan_stop_id
    ORDER BY COALESCE(ps.created_at,'' ) DESC,ps.rowid DESC`);
  for(const link of planLinks){
    const raw=parseJson(link.raw_json,{})||{};
    queueRecovery(missingById.get(link.work_order_id),{
      equipmentId:link.equipment_id||raw.equipmentId,
      nodeId:link.node_id||raw.nodeId,
      equipmentName:raw.equipmentName||(link.node_id?'':link.name),
      nodeCode:raw.nodeCode,
      nodeName:raw.nodeName||(link.node_id?link.name:''),
      town:raw.town
    });
  }
  if(statements.length)await batchChunks(env,statements);
  await run(env,`INSERT INTO app_settings(key,value_json,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO NOTHING`,[migrationKey,JSON.stringify({completed:true,recovered:statements.length}),new Date().toISOString()]);
}

async function getZoneMaps(env) {
  const rows = await all(env, 'SELECT id, code, name FROM zones');
  return {
    byId: new Map(rows.map(row => [Number(row.id), row.code])),
    byCode: new Map(rows.map(row => [row.code, Number(row.id)]))
  };
}

async function ensureZone(env, code) {
  const clean = nullableText(code);
  if (!clean) return null;
  let row = await first(env, 'SELECT id FROM zones WHERE code = ?', [clean]);
  if (row?.id) return Number(row.id);
  await run(env, 'INSERT OR IGNORE INTO zones(code, name) VALUES (?, ?)', [clean, clean.replaceAll('_', ' ').toUpperCase()]);
  row = await first(env, 'SELECT id FROM zones WHERE code = ?', [clean]);
  return row?.id ? Number(row.id) : null;
}

async function ensureRole(env, role) {
  const code = normalizeRole(role);
  let row = await first(env, 'SELECT id FROM roles WHERE code = ?', [code]);
  if (row?.id) return Number(row.id);
  await run(env, 'INSERT OR IGNORE INTO roles(code, name) VALUES (?, ?)', [code, code.replaceAll('_', ' ')]);
  row = await first(env, 'SELECT id FROM roles WHERE code = ?', [code]);
  return row?.id ? Number(row.id) : null;
}

async function getUserMap(env) {
  const rows = await all(env, `SELECT u.id,u.name,u.username,r.code AS role FROM users u JOIN roles r ON r.id=u.role_id`);
  return new Map(rows.map(row => [row.id, row]));
}

async function getLatestAuditMap(env, targetIds = null) {
  const ids = Array.isArray(targetIds) ? targetIds.filter(Boolean) : null;
  if (ids && !ids.length) return new Map();
  if (ids && ids.length > D1_IN_CHUNK_SIZE) {
    const combined = new Map();
    for (const idsChunk of chunkValues(ids)) {
      const chunk = await getLatestAuditMap(env, idsChunk);
      for (const [targetId, row] of chunk) combined.set(targetId, row);
    }
    return combined;
  }
  const filter = ids ? ` AND target_id IN (${ids.map(() => '?').join(',')})` : '';
  const rows = await all(env, `
    SELECT a.target_id,a.action,a.at,a.by_name_legacy,a.by_role_legacy
    FROM audit_log a
    INNER JOIN (
      SELECT target_id, MAX(COALESCE(at, '')) AS latest_at
      FROM audit_log WHERE target_id IS NOT NULL AND target_id <> ''${filter} GROUP BY target_id
    ) x ON x.target_id=a.target_id AND COALESCE(a.at,'')=x.latest_at
  `, ids || []);
  const map = new Map();
  for (const row of rows) if (!map.has(row.target_id)) map.set(row.target_id, row);
  return map;
}

function addActorFields(out, prefix, user) {
  if (!user) return;
  out[`${prefix}Id`] = user.id;
  out[`${prefix}Name`] = user.name || '';
  out[`${prefix}Username`] = user.username || '';
  out[`${prefix}Role`] = normalizeRole(user.role);
}

function addLastAction(out, audit) {
  if (!audit) return;
  out.lastAction = audit.action || '';
  out.lastActionAt = audit.at || '';
  out.lastActionBy = audit.by_name_legacy || '';
  out.lastActionByRole = audit.by_role_legacy || '';
}

async function loadEquipment(env, ctx, page = null) {
  const limit = page?.paged === '1' ? Math.max(1, Math.min(100, Number(page.limit) || 50)) : null;
  const offset = page ? Math.max(0, Number(page.offset) || 0) : 0;
  const requestedId = nullableText(page?.id);
  const query = nullableText(page?.q)?.toLowerCase();
  const clauses = [];
  const binds = [];
  if (page?.windowed === '1'||page?.scoped==='1') clauses.push('e.deleted_at IS NULL');
  if (requestedId) { clauses.push('e.id=?'); binds.push(requestedId); }
  const requestedIds=csvValues(page?.equipmentIds);
  if(requestedIds.length){clauses.push(`e.id IN (${requestedIds.map(()=>'?').join(',')})`);binds.push(...requestedIds);}
  const requestedNodeIds=csvValues(page?.nodeIds);
  if(requestedNodeIds.length){clauses.push(`EXISTS (SELECT 1 FROM equipment_nodes en WHERE en.equipment_id=e.id AND en.node_id IN (${requestedNodeIds.map(()=>'?').join(',')}))`);binds.push(...requestedNodeIds);}
  if (query) {
    clauses.push("e.deleted_at IS NULL AND (lower(e.name) LIKE ? OR lower(e.ip) LIKE ? OR lower(COALESCE(e.ssid,'')) LIKE ? OR lower(COALESCE(e.notes,'')) LIKE ? OR lower(COALESCE(z.code,'')) LIKE ?)");
    const like = `%${query}%`;
    binds.push(like,like,like,like,like);
  }
  const zone=nullableText(page?.zone);
  if (zone&&zone!=='all') { clauses.push('z.code=?'); binds.push(zone); }
  const north=nullableNumber(page?.north),south=nullableNumber(page?.south),east=nullableNumber(page?.east),west=nullableNumber(page?.west);
  if(north!==null&&south!==null&&east!==null&&west!==null){clauses.push('e.lat BETWEEN ? AND ? AND e.lng BETWEEN ? AND ?');binds.push(south,north,west,east);}
  const priority=nullableText(page?.priority);
  if (priority&&priority!=='all') {
    const priorityCase="CASE WHEN COALESCE(p.very_high,0)>0 OR COALESCE(p.high_count,0)>=3 THEN 'critico' WHEN COALESCE(p.high_count,0)>0 OR COALESCE(p.medium_count,0)>=2 OR COALESCE(p.low_count,0)>=4 THEN 'atencion' WHEN COALESCE(p.medium_count,0)>0 OR COALESCE(p.low_count,0)>0 THEN 'pendiente' ELSE 'despejado' END";
    clauses.push(`${priorityCase}=?`); binds.push(priority);
  }
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  const pagination = !requestedId && limit ? ' LIMIT ? OFFSET ?' : '';
  if (pagination) binds.push(limit,offset);
  const priorityJoin=" LEFT JOIN (SELECT equipment_id,SUM(CASE WHEN priority='muy_alta' THEN 1 ELSE 0 END) very_high,SUM(CASE WHEN priority='alta' THEN 1 ELSE 0 END) high_count,SUM(CASE WHEN priority='media' THEN 1 ELSE 0 END) medium_count,SUM(CASE WHEN priority='baja' THEN 1 ELSE 0 END) low_count FROM work_orders WHERE deleted_at IS NULL AND COALESCE(status,'pendiente') NOT IN ('completada','done') AND node_id IS NULL GROUP BY equipment_id) p ON p.equipment_id=e.id";
  const rows = await all(env, `SELECT e.*, z.code AS zone_code FROM equipment e LEFT JOIN zones z ON z.id=e.zone_id${priorityJoin}${where} ORDER BY e.rowid${pagination}`, binds);
  if (!rows.length) return [];
  if (!ctx.audit) ctx.audit = await getLatestAuditMap(env, rows.map(row => row.id));
  const ids = rows.map(row => row.id);
  const radios = [];
  const links = [];
  for (let offset = 0; offset < ids.length; offset += 90) {
    const chunk = ids.slice(offset, offset + 90);
    const placeholders = chunk.map(() => '?').join(',');
    const [chunkRadios,chunkLinks] = await Promise.all([
      all(env, `SELECT * FROM equipment_radios WHERE equipment_id IN (${placeholders}) ORDER BY equipment_id, position`, chunk),
      all(env, `SELECT equipment_id,node_id,position FROM equipment_nodes WHERE equipment_id IN (${placeholders}) ORDER BY equipment_id,position,node_id`, chunk)
    ]);
    radios.push(...chunkRadios);
    links.push(...chunkLinks);
  }
  const radiosBy = new Map();
  for (const r of radios) {
    const list = radiosBy.get(r.equipment_id) || [];
    list.push({ name:r.name||'', model:r.model||'', antennaType:r.antenna_type||'', sector:r.sector||'', port:r.port||'', ip:r.ip||'', ssid:r.ssid||'', gateway:r.gateway||'', location:r.location_raw||'', lat:r.lat ?? '', lng:r.lng ?? '' });
    radiosBy.set(r.equipment_id, list);
  }
  const linksBy = new Map();
  for (const link of links) {
    const list = linksBy.get(link.equipment_id) || [];
    list.push(link.node_id); linksBy.set(link.equipment_id, list);
  }
  return rows.map(row => {
    const out = {
      id:row.id, name:row.name, ip:row.ip||'', type:row.type||'', lat:row.lat ?? '', lng:row.lng ?? '',
      status:row.status||'', provider:row.provider||'', notes:row.notes||'', region:row.zone_code||''
    };
    if (row.ssid !== null) out.ssid = row.ssid || '';
    if (row.radio_summary_legacy) out.radioSummary = row.radio_summary_legacy;
    if (row.radio_models_legacy) out.radioModels = row.radio_models_legacy;
    if (row.radio_names_legacy) out.radioNames = row.radio_names_legacy;
    if (row.station_names_legacy) out.stationNames = row.station_names_legacy;
    if (row.radio_free_text_legacy) out.radioFreeText = row.radio_free_text_legacy;
    if (radiosBy.has(row.id)) out.radioLinks = radiosBy.get(row.id);
    if (linksBy.has(row.id)) out.linkedNodeIds = linksBy.get(row.id);
    if (row.created_at) out.createdAt = row.created_at;
    if (row.updated_at) out.updatedAt = row.updated_at;
    if (row.deleted_at) out.deletedAt = row.deleted_at;
    if (row.purged_at) out.purgedAt = row.purged_at;
    addActorFields(out, 'createdBy', ctx.users.get(row.created_by));
    addActorFields(out, 'updatedBy', ctx.users.get(row.updated_by));
    addLastAction(out, ctx.audit.get(row.id));
    return out;
  });
}

async function loadNodes(env, ctx, page = null) {
  const limit = page?.paged === '1' ? Math.max(1, Math.min(100, Number(page.limit) || 50)) : null;
  const offset = page ? Math.max(0, Number(page.offset) || 0) : 0;
  const requestedId = nullableText(page?.id);
  const query = nullableText(page?.q)?.toLowerCase();
  const clauses = [];
  const binds = [];
  if (page?.windowed === '1'||page?.scoped==='1') clauses.push('n.deleted_at IS NULL');
  if (requestedId) { clauses.push('n.id=?'); binds.push(requestedId); }
  const requestedIds=csvValues(page?.nodeIds);
  if(requestedIds.length){clauses.push(`n.id IN (${requestedIds.map(()=>'?').join(',')})`);binds.push(...requestedIds);}
  if (query) {
    clauses.push("n.deleted_at IS NULL AND (lower(n.node_code) LIKE ? OR lower(n.town) LIKE ? OR lower(COALESCE(n.notes,'')) LIKE ? OR lower(COALESCE(z.code,'')) LIKE ?)");
    const like = `%${query}%`;
    binds.push(like,like,like,like);
  }
  const zone=nullableText(page?.zone);
  if (zone&&zone!=='all') { clauses.push('z.code=?'); binds.push(zone); }
  const north=nullableNumber(page?.north),south=nullableNumber(page?.south),east=nullableNumber(page?.east),west=nullableNumber(page?.west);
  if(north!==null&&south!==null&&east!==null&&west!==null){clauses.push('n.lat BETWEEN ? AND ? AND n.lng BETWEEN ? AND ?');binds.push(south,north,west,east);}
  const priority=nullableText(page?.priority);
  if (priority&&priority!=='all') {
    const priorityCase="CASE WHEN COALESCE(p.very_high,0)>0 OR COALESCE(p.high_count,0)>=3 THEN 'critico' WHEN COALESCE(p.high_count,0)>0 OR COALESCE(p.medium_count,0)>=2 OR COALESCE(p.low_count,0)>=4 THEN 'atencion' WHEN COALESCE(p.medium_count,0)>0 OR COALESCE(p.low_count,0)>0 THEN 'pendiente' ELSE 'despejado' END";
    clauses.push(`${priorityCase}=?`); binds.push(priority);
  }
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  const pagination = !requestedId && limit ? ' LIMIT ? OFFSET ?' : '';
  if (pagination) binds.push(limit,offset);
  const priorityJoin=" LEFT JOIN (SELECT node_id,SUM(CASE WHEN priority='muy_alta' THEN 1 ELSE 0 END) very_high,SUM(CASE WHEN priority='alta' THEN 1 ELSE 0 END) high_count,SUM(CASE WHEN priority='media' THEN 1 ELSE 0 END) medium_count,SUM(CASE WHEN priority='baja' THEN 1 ELSE 0 END) low_count FROM work_orders WHERE deleted_at IS NULL AND COALESCE(status,'pendiente') NOT IN ('completada','done') AND node_id IS NOT NULL GROUP BY node_id) p ON p.node_id=n.id";
  const rows = await all(env, `SELECT n.*, z.code AS zone_code FROM nodes n LEFT JOIN zones z ON z.id=n.zone_id${priorityJoin}${where} ORDER BY n.rowid${pagination}`, binds);
  if (!ctx.audit) ctx.audit = await getLatestAuditMap(env, rows.map(row => row.id));
  return rows.map(row => {
    const out = { id:row.id, createdAt:row.created_at||'', nodeCode:row.node_code, town:row.town, zone:row.zone_code||'', lat:row.lat ?? '', lng:row.lng ?? '', status:row.status||'', notes:row.notes||'' };
    if (row.updated_at) out.updatedAt = row.updated_at;
    if (row.deleted_at) out.deletedAt = row.deleted_at;
    addActorFields(out,'createdBy',ctx.users.get(row.created_by));
    addActorFields(out,'updatedBy',ctx.users.get(row.updated_by));
    addActorFields(out,'deletedBy',ctx.users.get(row.deleted_by));
    addLastAction(out, ctx.audit.get(row.id));
    return out;
  });
}

async function loadPlanningMapCatalog(env) {
  const [equipmentRows,nodeRows,linkRows]=await Promise.all([
    all(env,`SELECT e.id,e.name,e.ip,e.type,e.lat,e.lng,e.status,e.provider,e.notes,e.ssid,z.code AS region,
      COALESCE(p.very_high,0) AS map_very_high,COALESCE(p.high_count,0) AS map_high,
      COALESCE(p.medium_count,0) AS map_medium,COALESCE(p.low_count,0) AS map_low,
      COALESCE(p.planned_open,0) AS map_planned_open,COALESCE(p.detail_total,0) AS map_detail_total,
      COALESCE(p.detail_resolved,0) AS map_detail_resolved
      FROM equipment e LEFT JOIN zones z ON z.id=e.zone_id
      LEFT JOIN (
        SELECT w.equipment_id AS entity_id,
          SUM(CASE WHEN COALESCE(w.status,'pendiente') NOT IN ('completada','done') AND w.priority='muy_alta' THEN 1 ELSE 0 END) AS very_high,
          SUM(CASE WHEN COALESCE(w.status,'pendiente') NOT IN ('completada','done') AND w.priority='alta' THEN 1 ELSE 0 END) AS high_count,
          SUM(CASE WHEN COALESCE(w.status,'pendiente') NOT IN ('completada','done') AND w.priority='media' THEN 1 ELSE 0 END) AS medium_count,
          SUM(CASE WHEN COALESCE(w.status,'pendiente') NOT IN ('completada','done') AND w.priority='baja' THEN 1 ELSE 0 END) AS low_count,
          SUM(CASE WHEN COALESCE(w.status,'pendiente') NOT IN ('completada','done') AND planned.work_order_id IS NOT NULL THEN 1 ELSE 0 END) AS planned_open,
          COUNT(*) AS detail_total,
          SUM(CASE WHEN COALESCE(w.status,'pendiente') IN ('completada','no_realizado','done') THEN 1 ELSE 0 END) AS detail_resolved
        FROM work_orders w LEFT JOIN (SELECT DISTINCT work_order_id FROM plan_stop_orders) planned ON planned.work_order_id=w.id
        WHERE w.deleted_at IS NULL AND w.node_id IS NULL GROUP BY w.equipment_id
      ) p ON p.entity_id=e.id
      WHERE e.deleted_at IS NULL AND e.lat IS NOT NULL AND e.lng IS NOT NULL ORDER BY e.rowid`),
    all(env,`SELECT n.id,n.node_code,n.town,n.lat,n.lng,n.status,n.notes,z.code AS zone,
      COALESCE(p.very_high,0) AS map_very_high,COALESCE(p.high_count,0) AS map_high,
      COALESCE(p.medium_count,0) AS map_medium,COALESCE(p.low_count,0) AS map_low,
      COALESCE(p.planned_open,0) AS map_planned_open,COALESCE(p.detail_total,0) AS map_detail_total,
      COALESCE(p.detail_resolved,0) AS map_detail_resolved
      FROM nodes n LEFT JOIN zones z ON z.id=n.zone_id
      LEFT JOIN (
        SELECT w.node_id AS entity_id,
          SUM(CASE WHEN COALESCE(w.status,'pendiente') NOT IN ('completada','done') AND w.priority='muy_alta' THEN 1 ELSE 0 END) AS very_high,
          SUM(CASE WHEN COALESCE(w.status,'pendiente') NOT IN ('completada','done') AND w.priority='alta' THEN 1 ELSE 0 END) AS high_count,
          SUM(CASE WHEN COALESCE(w.status,'pendiente') NOT IN ('completada','done') AND w.priority='media' THEN 1 ELSE 0 END) AS medium_count,
          SUM(CASE WHEN COALESCE(w.status,'pendiente') NOT IN ('completada','done') AND w.priority='baja' THEN 1 ELSE 0 END) AS low_count,
          SUM(CASE WHEN COALESCE(w.status,'pendiente') NOT IN ('completada','done') AND planned.work_order_id IS NOT NULL THEN 1 ELSE 0 END) AS planned_open,
          COUNT(*) AS detail_total,
          SUM(CASE WHEN COALESCE(w.status,'pendiente') IN ('completada','no_realizado','done') THEN 1 ELSE 0 END) AS detail_resolved
        FROM work_orders w LEFT JOIN (SELECT DISTINCT work_order_id FROM plan_stop_orders) planned ON planned.work_order_id=w.id
        WHERE w.deleted_at IS NULL AND w.node_id IS NOT NULL GROUP BY w.node_id
      ) p ON p.entity_id=n.id
      WHERE n.deleted_at IS NULL AND n.lat IS NOT NULL AND n.lng IS NOT NULL ORDER BY n.rowid`),
    all(env,`SELECT en.equipment_id,en.node_id FROM equipment_nodes en JOIN equipment e ON e.id=en.equipment_id JOIN nodes n ON n.id=en.node_id WHERE e.deleted_at IS NULL AND n.deleted_at IS NULL ORDER BY en.equipment_id,en.position,en.node_id`)
  ]);
  const linksByEquipment=new Map();
  for(const row of linkRows){const list=linksByEquipment.get(row.equipment_id)||[];list.push(row.node_id);linksByEquipment.set(row.equipment_id,list);}
  return {
    equipment:equipmentRows.map(row=>({id:row.id,name:row.name||'',ip:row.ip||'',type:row.type||'',lat:row.lat,lng:row.lng,status:row.status||'',provider:row.provider||'',notes:row.notes||'',region:row.region||'',ssid:row.ssid||'',linkedNodeIds:linksByEquipment.get(row.id)||[],mapVeryHigh:Number(row.map_very_high)||0,mapHigh:Number(row.map_high)||0,mapMedium:Number(row.map_medium)||0,mapLow:Number(row.map_low)||0,mapPlannedOpen:Number(row.map_planned_open)||0,mapDetailTotal:Number(row.map_detail_total)||0,mapDetailResolved:Number(row.map_detail_resolved)||0})),
    nodes:nodeRows.map(row=>({id:row.id,nodeCode:row.node_code||'',town:row.town||'',lat:row.lat,lng:row.lng,status:row.status||'',notes:row.notes||'',zone:row.zone||'',mapVeryHigh:Number(row.map_very_high)||0,mapHigh:Number(row.map_high)||0,mapMedium:Number(row.map_medium)||0,mapLow:Number(row.map_low)||0,mapPlannedOpen:Number(row.map_planned_open)||0,mapDetailTotal:Number(row.map_detail_total)||0,mapDetailResolved:Number(row.map_detail_resolved)||0}))
  };
}

async function loadReportsAndEvidence(env, workOrderIds = null) {
  const ids = Array.isArray(workOrderIds) ? workOrderIds.filter(Boolean) : null;
  if (ids && !ids.length) return new Map();
  const reports=[];
  const evidence=[];
  const idChunks=ids?chunkValues(ids):[null];
  for(const idsChunk of idChunks){
    const filter=idsChunk?` WHERE work_order_id IN (${idsChunk.map(()=>'?').join(',')})`:'';
    reports.push(...await all(env,`SELECT * FROM work_order_reports${filter}`,idsChunk||[]));
    evidence.push(...await all(env,`SELECT id,work_order_id,created_at FROM work_order_evidence${filter} ORDER BY created_at,id`,idsChunk||[]));
  }
  // La columna storage_key puede contener la foto completa como data URL.
  // Para armar la lista solo necesitamos metadatos; no cargamos las imagenes
  // (decenas de MB) en cada GET /api/data.
  const evidenceBy = new Map();
  for (const ev of evidence) {
    const list = evidenceBy.get(ev.work_order_id) || [];
    list.push(`/api/evidence/${encodeURIComponent(ev.id)}`);
    evidenceBy.set(ev.work_order_id, list);
  }
  const map = new Map();
  for (const row of reports) {
    const report = parseJson(row.raw_json, {}) || {};
    report.result = row.result || report.result || '';
    report.solution = row.solution || report.solution || '';
    report.materialUsed = row.material_used || report.materialUsed || '';
    report.reason = row.reason || report.reason || '';
    report.completedBy = row.completed_by || report.completedBy || '';
    report.completedByName = row.completed_by_name_legacy || report.completedByName || '';
    report.completedAt = row.completed_at || report.completedAt || '';
    const photos = evidenceBy.get(row.work_order_id) || [];
    report.evidencePhoto = photos[0] || '';
    report.evidencePhotos = photos;
    map.set(row.work_order_id, report);
  }
  return map;
}

function csvValues(value) {
  return [...new Set(text(value).split(',').map(item => item.trim()).filter(Boolean))].slice(0,D1_IN_CHUNK_SIZE);
}

function entitySummaryQuery(part,page={}) {
  const equipment=part==='equipment';
  const alias=equipment?'e':'n';
  const table=equipment?'equipment e':'nodes n';
  const idColumn=equipment?'equipment_id':'node_id';
  const ownOrders=equipment?' AND node_id IS NULL':' AND node_id IS NOT NULL';
  const clauses=[`${alias}.deleted_at IS NULL`];
  const binds=[];
  const requestedId=nullableText(page?.id);
  if(requestedId){clauses.push(`${alias}.id=?`);binds.push(requestedId);}
  const query=nullableText(page?.q)?.toLowerCase();
  if(query){const like=`%${query}%`;clauses.push(equipment?"(lower(e.name) LIKE ? OR lower(e.ip) LIKE ? OR lower(COALESCE(e.ssid,'')) LIKE ? OR lower(COALESCE(e.notes,'')) LIKE ? OR lower(COALESCE(z.code,'')) LIKE ?)":"(lower(n.node_code) LIKE ? OR lower(n.town) LIKE ? OR lower(COALESCE(n.notes,'')) LIKE ? OR lower(COALESCE(z.code,'')) LIKE ?)");binds.push(like,like,like,like,...(equipment?[like]:[]));}
  const zone=nullableText(page?.zone);
  if(zone&&zone!=='all'){clauses.push('z.code=?');binds.push(zone);}
  const priorityCase="CASE WHEN COALESCE(p.very_high,0)>0 OR COALESCE(p.high_count,0)>=3 THEN 'critico' WHEN COALESCE(p.high_count,0)>0 OR COALESCE(p.medium_count,0)>=2 OR COALESCE(p.low_count,0)>=4 THEN 'atencion' WHEN COALESCE(p.medium_count,0)>0 OR COALESCE(p.low_count,0)>0 THEN 'pendiente' ELSE 'despejado' END";
  const priority=nullableText(page?.priority);
  if(priority&&priority!=='all'){clauses.push(`${priorityCase}=?`);binds.push(priority);}
  const join=` LEFT JOIN zones z ON z.id=${alias}.zone_id LEFT JOIN (SELECT ${idColumn} entity_id,SUM(CASE WHEN priority='muy_alta' THEN 1 ELSE 0 END) very_high,SUM(CASE WHEN priority='alta' THEN 1 ELSE 0 END) high_count,SUM(CASE WHEN priority='media' THEN 1 ELSE 0 END) medium_count,SUM(CASE WHEN priority='baja' THEN 1 ELSE 0 END) low_count FROM work_orders WHERE deleted_at IS NULL AND COALESCE(status,'pendiente') NOT IN ('completada','done')${ownOrders} GROUP BY ${idColumn}) p ON p.entity_id=${alias}.id`;
  return {sql:`SELECT ${priorityCase} priority_key FROM ${table}${join} WHERE ${clauses.join(' AND ')}`,binds};
}

function workOrderQuery(page = {}) {
  const requestedId = nullableText(page?.id);
  const clauses = [];
  const binds = [];
  if (requestedId) {
    clauses.push('w.id=?');
    binds.push(requestedId);
  } else if (page?.openOnly === '1') {
    clauses.push('w.deleted_at IS NULL');
    clauses.push("COALESCE(w.status,'pendiente') NOT IN ('completada','no_realizado','eliminada')");
  } else if (page?.windowed === '1'||page?.scoped==='1') {
    clauses.push('w.deleted_at IS NULL');
  }
  const query = nullableText(page?.q)?.toLowerCase();
  if (query) {
    const like = `%${query}%`;
    const folioIds=Array.isArray(page?._workOrderFolioIds)?page._workOrderFolioIds.filter(Boolean):[];
    const folioClause=folioIds.length?` OR w.id IN (${folioIds.map(()=>'?').join(',')})`:'';
    clauses.push(`(lower(w.id) LIKE ? OR lower(COALESCE(w.client_name,'')) LIKE ? OR lower(COALESCE(w.title,'')) LIKE ? OR lower(COALESCE(w.description,'')) LIKE ? OR lower(COALESCE(w.node_code_legacy,'')) LIKE ? OR lower(COALESCE(w.node_name_legacy,'')) LIKE ? OR lower(COALESCE(w.town_legacy,'')) LIKE ? OR lower(COALESCE(w.equipment_name_legacy,'')) LIKE ? OR lower(COALESCE(z.code,'')) LIKE ?${folioClause})`);
    binds.push(like,like,like,like,like,like,like,like,like);
    binds.push(...folioIds);
  }
  const filterColumns = {status:'w.status',type:'w.visit_type',zone:'z.code',priority:'w.priority',category:'w.category',creator:'w.created_by'};
  for (const [key,column] of Object.entries(filterColumns)) {
    const values = csvValues(page?.[key]);
    if (!values.length) continue;
    clauses.push(`${column} IN (${values.map(() => '?').join(',')})`);
    binds.push(...values);
  }
  const detailKind=nullableText(page?.detailKind);
  if(detailKind){clauses.push("COALESCE(w.detail_kind,'physical')=?");binds.push(detailKind);}
  const equipmentIds=csvValues(page?.equipmentIds);
  if (equipmentIds.length) { clauses.push(`w.equipment_id IN (${equipmentIds.map(()=>'?').join(',')}) AND w.node_id IS NULL`); binds.push(...equipmentIds); }
  const nodeIds=csvValues(page?.nodeIds);
  if (nodeIds.length) { clauses.push(`w.node_id IN (${nodeIds.map(()=>'?').join(',')})`); binds.push(...nodeIds); }
  const workOrderIds=csvValues(page?.workOrderIds);
  if(workOrderIds.length){clauses.push(`w.id IN (${workOrderIds.map(()=>'?').join(',')})`);binds.push(...workOrderIds);}
  const from=nullableText(page?.from),to=nullableText(page?.to);
  if(from){clauses.push('(w.created_at>=? OR w.completed_at>=?)');binds.push(from,from);}
  if(to){clauses.push('(w.created_at<? OR w.completed_at<?)');binds.push(to,to);}
  const sort = text(page?.sort);
  const statusRank = `CASE
    WHEN w.status IN ('resuelto_soporte', 'no_realizado') THEN 0
    WHEN COALESCE(w.status,'pendiente') IN ('pendiente','devuelto_soporte') THEN 1
    WHEN w.status = 'en_revision' THEN 2
    WHEN w.status = 'revisado' THEN 3
    WHEN w.status = 'completada' THEN 4
    ELSE 3
  END`;
  const detailedStatusRank = `CASE
    WHEN w.status = 'resuelto_soporte' THEN 0
    WHEN w.status = 'no_realizado' THEN 1
    WHEN w.status = 'devuelto_soporte' THEN 2
    WHEN COALESCE(w.status,'pendiente') = 'pendiente' THEN 3
    WHEN w.status = 'en_revision' THEN 4
    WHEN w.status = 'revisado' THEN 5
    WHEN w.status = 'completada' THEN 6
    ELSE 5
  END`;
  const resentFirst = "CASE WHEN w.status='pendiente' AND w.last_resent_at IS NOT NULL THEN 0 ELSE 1 END, w.last_resent_at DESC";
  const priorityRank = "CASE COALESCE(w.priority,'media') WHEN 'muy_alta' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END";
  const selectedOrder = sort === 'status' ? `${detailedStatusRank} ASC, ${priorityRank}, COALESCE(w.completed_at, w.updated_at, w.created_at) DESC, w.rowid DESC`
    : sort === 'newest' ? 'COALESCE(w.completed_at, w.created_at) DESC, w.rowid DESC'
    : sort === 'oldest' ? 'COALESCE(w.completed_at, w.created_at) ASC, w.rowid ASC'
    : sort === 'town' ? "lower(COALESCE(w.town_legacy,w.node_name_legacy,w.node_code_legacy,'')) ASC, w.rowid ASC"
    : sort === 'client' ? "lower(COALESCE(w.client_name,'')) ASC, w.rowid ASC"
    : `${priorityRank}, COALESCE(w.completed_at, w.created_at) DESC, w.rowid DESC`;
  const orderBy = `${statusRank} ASC, ${resentFirst}, ${selectedOrder}`;
  return {where:clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '',binds,orderBy};
}

async function resolveExactWorkOrderFolioSearch(env,page) {
  if(!page||page._workOrderFolioResolved)return;
  page._workOrderFolioResolved=true;
  const requested=text(page.q).trim().toUpperCase();
  const prefixed=/^(DET|NEW|RED)-\d{6}$/.test(requested);
  const numberOnly=/^\d{6}$/.test(requested);
  if(!prefixed&&!numberOnly)return;
  const detailKind=page.detailKind==='network'?'network':page.detailKind==='physical'?'physical':'';
  const rows=detailKind
    ? await all(env,"SELECT id,category FROM work_orders WHERE deleted_at IS NULL AND COALESCE(detail_kind,'physical')=?",[detailKind])
    : await all(env,'SELECT id,category FROM work_orders WHERE deleted_at IS NULL');
  page._workOrderFolioIds=rows.filter(row=>{
    const folio=workOrderFolio(row);
    return prefixed ? folio===requested : folio.endsWith(`-${requested}`);
  }).map(row=>row.id);
}

async function loadWorkOrders(env, ctx, page = null) {
  await resolveExactWorkOrderFolioSearch(env,page);
  const requestedId = nullableText(page?.id);
  const limit = page ? Math.max(1, Math.min(100, Number(page.limit) || 75)) : null;
  const offset = page ? Math.max(0, Number(page.offset) || 0) : 0;
  const query = workOrderQuery(page);
  const pagination = !requestedId && limit ? ' LIMIT ? OFFSET ?' : '';
  const binds = [...query.binds];
  if (pagination) binds.push(limit,offset);
  const rows = await all(env, `SELECT w.*,z.code AS zone_code,e.name AS linked_equipment_name FROM work_orders w LEFT JOIN zones z ON z.id=w.zone_id LEFT JOIN equipment e ON e.id=w.equipment_id${query.where} ORDER BY ${query.orderBy}${pagination}`, binds);
  const ids = rows.map(row => row.id);
  if (!ids.length) return [];
  if (!ctx.audit) ctx.audit = await getLatestAuditMap(env,ids);
  const materials=[];
  for(const idsChunk of chunkValues(ids)){
    const placeholders=idsChunk.map(()=>'?').join(',');
    materials.push(...await all(env,`SELECT * FROM work_order_materials WHERE work_order_id IN (${placeholders}) ORDER BY work_order_id,id`,idsChunk));
  }
  const matsBy = new Map();
  for (const row of materials) {
    const list = matsBy.get(row.work_order_id) || [];
    const raw = parseJson(row.raw_json, null);
    list.push(raw || { id:row.material_id||'', name:row.material_name_legacy||'', quantity:row.quantity ?? 0, unit:row.unit_legacy||'' });
    matsBy.set(row.work_order_id, list);
  }
  const reports = await loadReportsAndEvidence(env, ids);
  return rows.map(row => {
    const isInstallation = isInstallationCategory(row.category);
    const out = {
      id:row.id, title:row.title, category:row.category||'', detailKind:row.detail_kind||'physical', priority:row.priority||'', visitType:row.visit_type||'', region:row.zone_code||'', status:isInstallation?'completada':row.status||'', createdAt:row.created_at||'', followUps:parseJson(row.follow_ups_json,[])||[]
    };
    out.equipmentId = row.equipment_id || '';
    out.nodeId = row.node_id || '';
    out.equipmentName = row.linked_equipment_name || row.equipment_name_legacy || '';
    out.nodeCode = row.node_code_legacy || '';
    out.nodeName = row.node_name_legacy || '';
    out.town = row.town_legacy || '';
    if (row.legacy_technician_id !== null) out.technicianId = row.legacy_technician_id || '';
    if (row.legacy_desc !== null) out.desc = row.legacy_desc || '';
    if (row.description !== null) out.description = row.description || '';
    out.materials = matsBy.get(row.id) || [];
    if (row.lat !== null) out.lat = row.lat;
    if (row.lng !== null) out.lng = row.lng;
    if (row.detail_location !== null) out.detailLocation = row.detail_location || '';
    if (row.client_name !== null) out.clientName = row.client_name || '';
    if (row.client_phone !== null && row.client_phone !== undefined) out.clientPhone = row.client_phone || '';
    if (row.updated_at) out.updatedAt = row.updated_at;
    const completedAt = isInstallation ? (row.completed_at || row.created_at) : row.completed_at;
    if (completedAt) out.completedAt = completedAt;
    if (row.review_opened_at) out.reviewOpenedAt = row.review_opened_at;
    addActorFields(out,'reviewOpenedBy',ctx.users.get(row.review_opened_by));
    out.assignedUserId = row.assigned_user_id || '';
    const firstAssignedId = String(row.assigned_user_id || '').split(',')[0].trim();
    let assignedUserObj = firstAssignedId ? ctx.users?.get(firstAssignedId) : null;
    if (!assignedUserObj && row.assigned_user_name && ctx.users) {
      const targetName = String(row.assigned_user_name).split(',')[0].trim().toLowerCase();
      if (targetName) {
        for (const u of ctx.users.values()) {
          if (String(u.name || '').trim().toLowerCase() === targetName || String(u.username || '').trim().toLowerCase() === targetName) {
            assignedUserObj = u;
            break;
          }
        }
      }
    }
    out.assignedUserName = assignedUserObj?.name || row.assigned_user_name || '';
    if (assignedUserObj?.role) out.assignedUserRole = normalizeRole(assignedUserObj.role);
    out.targetRole = row.target_role || '';
    out.originRole = row.origin_role || '';
    if (row.reviewed_at) out.reviewedAt = row.reviewed_at;
    if (row.last_resent_at) out.lastResentAt = row.last_resent_at;
    if (row.source_order_id) out.sourceOrderId = row.source_order_id;
    if (row.deleted_at) out.deletedAt = row.deleted_at;
    addActorFields(out,'createdBy',ctx.users.get(row.created_by));
    addActorFields(out,'updatedBy',ctx.users.get(row.updated_by));
    addActorFields(out,'deletedBy',ctx.users.get(row.deleted_by));
    addLastAction(out,ctx.audit.get(row.id));
    if (reports.has(row.id)) out.technicianReport = reports.get(row.id);
    return out;
  });
}

async function loadAllWorkOrderPages(env, users, page) {
  const result=[];
  const limit=100;
  for(let offset=0;;offset+=limit){
    const rows=await loadWorkOrders(env,{users,audit:null},{...page,limit:String(limit),offset:String(offset)});
    result.push(...rows);
    if(rows.length<limit)break;
  }
  return result;
}

async function markPlannedWorkOrders(env, workOrders) {
  const rows = Array.isArray(workOrders) ? workOrders : [];
  const ids = rows.map(order => order?.id).filter(Boolean);
  if (!ids.length) return rows;
  const planned = new Set();
  for (const idsChunk of chunkValues(ids)) {
    const placeholders = idsChunk.map(() => '?').join(',');
    const links = await all(env, `SELECT DISTINCT work_order_id FROM plan_stop_orders WHERE work_order_id IN (${placeholders})`, idsChunk);
    links.forEach(link => planned.add(link.work_order_id));
  }
  rows.forEach(order => { order.isPlanned = planned.has(order.id); });
  return rows;
}

function userQuery(page={}) {
  const clauses=[];
  const binds=[];
  if (page?.windowed==='1'||page?.scoped==='1') clauses.push('u.deleted_at IS NULL');
  if (page?.hidePrincipal==='1') clauses.push("lower(u.username)<>'abraham'");
  const query=nullableText(page?.q)?.toLowerCase();
  if (query) { const like=`%${query}%`; clauses.push("(lower(u.name) LIKE ? OR lower(u.username) LIKE ? OR lower(COALESCE(u.phone,'')) LIKE ?)"); binds.push(like,like,like); }
  const role=nullableText(page?.role);
  if (role && role!=='all') { clauses.push('r.code=?'); binds.push(role); }
  return {where:clauses.length?` WHERE ${clauses.join(' AND ')}`:'',binds};
}

async function loadUsers(env, page = null) {
  const limit = page?.paged === '1' ? Math.max(1,Math.min(100,Number(page.limit)||50)) : null;
  const offset = page ? Math.max(0,Number(page.offset)||0) : 0;
  const query=userQuery(page);
  const binds=[...query.binds];
  if (limit) binds.push(limit,offset);
  const rows = await all(env, `SELECT u.*,r.code AS role_code FROM users u JOIN roles r ON r.id=u.role_id${query.where} ORDER BY lower(u.name),u.rowid${limit?' LIMIT ? OFFSET ?':''}`,binds);
  if (!rows.length) return [];
  const zones = await all(env, `SELECT uz.user_id,z.code FROM user_zones uz JOIN zones z ON z.id=uz.zone_id ORDER BY uz.user_id,z.id`);
  const zonesBy = new Map();
  for (const row of zones) { const list=zonesBy.get(row.user_id)||[]; list.push(row.code); zonesBy.set(row.user_id,list); }
  const ctx = {
    users:new Map(rows.map(row=>[row.id,{...row,role:row.role_code}])),
    audit:await getLatestAuditMap(env, rows.map(row => row.id))
  };
  return rows.map(row => {
    const out = { id:row.id,name:row.name,username:row.username,role:normalizeRole(row.role_code),active:!!row.active,phone:row.phone||'',color:row.color||'',status:row.status||'activo',zones:zonesBy.get(row.id)||[],notes:row.notes||'',hasPassword:!!(row.password_hash||row.password_legacy) };
    if (row.created_at) out.createdAt=row.created_at;
    if (row.updated_at) out.updatedAt=row.updated_at;
    if (row.deleted_at) out.deletedAt=row.deleted_at;
    addActorFields(out,'createdBy',ctx.users.get(row.created_by));
    addActorFields(out,'updatedBy',ctx.users.get(row.updated_by));
    addLastAction(out,ctx.audit.get(row.id));
    return out;
  });
}

async function loadTechnicians(env, userIds = null) {
  const selectedIds=Array.isArray(userIds)?userIds.filter(Boolean):null;
  if (selectedIds && !selectedIds.length) return [];
  if(selectedIds&&selectedIds.length>D1_IN_CHUNK_SIZE){
    const combined=[];
    for(const idsChunk of chunkValues(selectedIds))combined.push(...await loadTechnicians(env,idsChunk));
    return combined;
  }
  const where=selectedIds?` WHERE user_id IN (${selectedIds.map(()=>'?').join(',')})`:'';
  const rows = await all(env, `SELECT * FROM technicians${where} ORDER BY rowid`,selectedIds||[]);
  if (!rows.length) return [];
  const zones = await all(env, `SELECT tz.technician_id,z.code FROM technician_zones tz JOIN zones z ON z.id=tz.zone_id ORDER BY tz.technician_id,z.id`);
  const zonesBy = new Map();
  for (const row of zones) { const list=zonesBy.get(row.technician_id)||[]; list.push(row.code); zonesBy.set(row.technician_id,list); }
  return rows.map(row => ({ id:row.id,nombre:row.name,telefono:row.phone||'',estado:row.status||'',regiones:zonesBy.get(row.id)||[],notas:row.notes||'',...(row.username_legacy!==null?{usuario:row.username_legacy||''}:{}),...(row.created_at?{createdAt:row.created_at}:{}),...(row.deleted_at?{deletedAt:row.deleted_at}:{}),...(row.user_id?{userId:row.user_id}:{}) }));
}

function routeQuery(page={}) {
  const query=nullableText(page?.q)?.toLowerCase();
  return query ? {where:" WHERE lower(name) LIKE ? OR lower(COALESCE(region_legacy,'')) LIKE ?",binds:[`%${query}%`,`%${query}%`]} : {where:'',binds:[]};
}

function materialQuery(page={}) {
  const clauses=[];
  const binds=[];
  if (page?.windowed==='1') clauses.push('deleted_at IS NULL');
  const query=nullableText(page?.q)?.toLowerCase();
  if (query) { clauses.push("(lower(name) LIKE ? OR lower(COALESCE(notes,'')) LIKE ? OR lower(COALESCE(category,'')) LIKE ?)"); const like=`%${query}%`; binds.push(like,like,like); }
  const category=nullableText(page?.category);
  if (category&&category!=='all') { clauses.push('category=?'); binds.push(category); }
  const status=nullableText(page?.stockStatus);
  if (status==='available') clauses.push('stock > minimum_stock');
  if (status==='low') clauses.push('stock > 0 AND stock <= minimum_stock');
  if (status==='empty') clauses.push('stock <= 0');
  return {where:clauses.length?` WHERE ${clauses.join(' AND ')}`:'',binds};
}

function auditQuery(page={}) {
  const clauses=[];
  const binds=[];
  if (page?.hidePrincipal==='1') clauses.push("NOT (lower(COALESCE(by_username_legacy,''))='abraham' OR lower(COALESCE(by_name_legacy,'')) IN ('abraham','abraham paula iglesias') OR user_id IN (SELECT id FROM users WHERE lower(username)='abraham'))");
  const query=nullableText(page?.q)?.toLowerCase();
  if (query) { const like=`%${query}%`; clauses.push("(lower(COALESCE(by_name_legacy,'')) LIKE ? OR lower(COALESCE(by_username_legacy,'')) LIKE ? OR lower(COALESCE(action,'')) LIKE ? OR lower(COALESCE(target_name,'')) LIKE ? OR lower(COALESCE(target_type,'')) LIKE ? OR lower(COALESCE(target_id,'')) LIKE ?)"); binds.push(like,like,like,like,like,like); }
  const from=nullableText(page?.from);
  const to=nullableText(page?.to);
  if (from) { clauses.push('at>=?'); binds.push(from); }
  if (to) { clauses.push('at<?'); binds.push(to); }
  const user=nullableText(page?.user);
  if (user) { clauses.push('(user_id=? OR by_username_legacy=? OR by_name_legacy=?)'); binds.push(user,user,user); }
  const action=nullableText(page?.action);
  if (action==='session-login') clauses.push("lower(action) LIKE '%sesi%n%'");
  else if (action==='new-installation') clauses.push("lower(action) LIKE '%instalaci%n%'");
  else if (action==='detail-completed') clauses.push("lower(action) LIKE '%complet%' AND lower(action) LIKE '%detalle%'");
  else if (action==='detail-not-done') clauses.push("lower(action) LIKE '%no%realizado%'");
  else if (action?.startsWith('action:')) { clauses.push('lower(action)=?'); binds.push(action.slice(7).toLowerCase()); }
  const viewerRole=nullableText(page?.viewerRole);
  const viewerId=nullableText(page?.viewerId);
  if (viewerRole==='atencion_clientes') clauses.push("lower(COALESCE(by_role_legacy,''))='tecnico'");
  else if (viewerRole && viewerRole!=='administrador' && viewerRole!=='admin' && viewerId) { clauses.push('user_id=?'); binds.push(viewerId); }
  return {where:clauses.length?` WHERE ${clauses.join(' AND ')}`:'',binds};
}

async function loadRoutes(env, page = null) {
  const limit = page?.paged === '1' ? Math.max(1, Math.min(100, Number(page.limit) || 50)) : null;
  const offset = page ? Math.max(0, Number(page.offset) || 0) : 0;
  const query=routeQuery(page);
  const binds=[...query.binds];
  if (limit) binds.push(limit,offset);
  const rows = await all(env, `SELECT * FROM routes${query.where} ORDER BY rowid${limit ? ' LIMIT ? OFFSET ?' : ''}`, binds);
  if (!rows.length) return [];
  const ids = rows.map(row => row.id);
  const points=[];
  for(const idsChunk of chunkValues(ids)){
    const placeholders=idsChunk.map(()=>'?').join(',');
    points.push(...await all(env,`SELECT * FROM route_points WHERE route_id IN (${placeholders}) ORDER BY route_id,position`,idsChunk));
  }
  const by = new Map();
  for (const p of points) { const list=by.get(p.route_id)||[]; list.push({lat:p.lat,lng:p.lng,name:p.name||''}); by.set(p.route_id,list); }
  return rows.map(row => ({ id:row.id,n:row.name,r:row.region_legacy||'',coords:by.get(row.id)||[] }));
}

async function loadMaterials(env, page = null) {
  const limit = page?.paged === '1' ? Math.max(1, Math.min(100, Number(page.limit) || 50)) : null;
  const offset = page ? Math.max(0, Number(page.offset) || 0) : 0;
  const query=materialQuery(page);
  const binds=[...query.binds];
  if (limit) binds.push(limit,offset);
  const rows = await all(env, `SELECT * FROM materials${query.where} ORDER BY rowid${limit ? ' LIMIT ? OFFSET ?' : ''}`, binds);
  if (!rows.length) return [];
  const ids = rows.map(row => row.id);
  let assigned=[];
  try {
    for(const idsChunk of chunkValues(ids)){
      const placeholders=idsChunk.map(()=>'?').join(',');
      assigned.push(...await all(env,`SELECT * FROM technician_material_stock WHERE quantity > 0 AND material_id IN (${placeholders}) ORDER BY material_id,technician_id`,idsChunk));
    }
  } catch (error) {
    if (!String(error?.message || error).includes('no such table: technician_material_stock')) throw error;
    await ensureTechnicianMaterialStockTable(env);
    assigned=[];
    for(const idsChunk of chunkValues(ids)){
      const placeholders=idsChunk.map(()=>'?').join(',');
      assigned.push(...await all(env,`SELECT * FROM technician_material_stock WHERE quantity > 0 AND material_id IN (${placeholders}) ORDER BY material_id,technician_id`,idsChunk));
    }
  }
  const byMaterial = new Map();
  for (const row of assigned) { const list=byMaterial.get(row.material_id)||[]; list.push({technicianId:row.technician_id,quantity:Number(row.quantity)||0,updatedAt:row.updated_at||''}); byMaterial.set(row.material_id,list); }
  const photos=[];
  const movements=[];
  for (const idsChunk of chunkValues(ids)) {
    const placeholders=idsChunk.map(()=>'?').join(',');
    photos.push(...await all(env,`SELECT id,material_id FROM material_photos WHERE material_id IN (${placeholders})`,idsChunk));
    movements.push(...await all(env,`SELECT * FROM material_movements WHERE material_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 100`,idsChunk));
  }
  const photoByMaterial = new Map(photos.map(photo => [photo.material_id,`/api/material-photo/${encodeURIComponent(photo.id)}`]));
  const movementsByMaterial = new Map();
  for (const movement of movements) {
    const list=movementsByMaterial.get(movement.material_id)||[];
    let extra = {};
    if (movement.raw_json) {
      try { extra = JSON.parse(movement.raw_json) || {}; } catch (e) {}
    }
    list.push({
      ...extra,
      id:movement.id,
      materialId:movement.material_id,
      type:movement.movement_type||extra.type||'',
      quantity:Number(movement.quantity)||Number(extra.quantity)||0,
      technicianId:movement.technician_id||extra.technicianId||'',
      returnedChange:Number(movement.returned_change)||Number(extra.returnedChange)||0,
      returnedDamaged:Number(movement.returned_damaged)||Number(extra.returnedDamaged)||0,
      usedQuantity:Number(movement.used_quantity)||Number(extra.usedQuantity)||0,
      newInstallations:!!movement.new_installations,
      reference:movement.reference||extra.reference||'',
      reason:movement.reason||extra.reason||'',
      createdBy:movement.created_by||extra.createdBy||'',
      createdByName:movement.created_by_name_legacy||extra.createdByName||'',
      at:movement.created_at||extra.at||'',
      status:movement.status||extra.status||'pending_receipt',
      acceptedAt:movement.accepted_at||extra.acceptedAt||null,
      acceptedBy:movement.accepted_by||extra.acceptedBy||null,
      acceptedByName:movement.accepted_by_name||extra.acceptedByName||null,
      handoverAcceptedAt:movement.handover_accepted_at||extra.handoverAcceptedAt||null,
      handoverAcceptedBy:movement.handover_accepted_by||extra.handoverAcceptedBy||null,
      handoverAcceptedByName:movement.handover_accepted_by_name||extra.handoverAcceptedByName||null,
      notes:movement.notes||extra.notes||'',
      updatedAt:movement.updated_at||extra.updatedAt||movement.created_at||''
    });
    movementsByMaterial.set(movement.material_id,list);
  }
  return rows.map(row => ({ id:row.id,name:row.name,unit:row.unit||'',status:row.status||'',notes:row.notes||'',stock:Number(row.stock)||0,minimumStock:Number(row.minimum_stock)||0,category:row.category||'',price:Number(row.price)||0,packageSize:Number(row.package_size)||1,photo:photoByMaterial.get(row.id)||'',movements:movementsByMaterial.get(row.id)||[],allocations:byMaterial.get(row.id)||[],...(row.created_at?{createdAt:row.created_at}:{}),...(row.updated_at?{updatedAt:row.updated_at}:{}),...(row.deleted_at?{deletedAt:row.deleted_at}:{}) }));
}

async function loadAllMaterialMovements(env) {
  await ensureMaterialTrackingTables(env);
  const rows = await all(env, `SELECT mm.*, t.name AS tech_db_name, t.user_id AS tech_db_user_id 
    FROM material_movements mm 
    LEFT JOIN technicians t ON t.id = mm.technician_id 
    WHERE (mm.movement_type IN ('give', 'dispatch', 'settle', 'reception', 'return') OR (mm.technician_id IS NOT NULL AND mm.technician_id != ''))
      AND mm.movement_type NOT IN ('entry', 'adjustment', 'initial')
    ORDER BY mm.created_at DESC`);
  return rows.map(movement => {
    let extra = {};
    if (movement.raw_json) {
      try { extra = JSON.parse(movement.raw_json) || {}; } catch (e) {}
    }
    const items = Array.isArray(extra.items) && extra.items.length ? extra.items : [{
      materialId: movement.material_id,
      materialName: extra.materialName || movement.material_name || 'Material',
      quantity: Number(movement.quantity) || 0,
      unit: extra.unit || movement.unit || 'pieza'
    }];

    const src = String(movement.id || movement.created_at || 'delivery');
    let hash = 0;
    for (let i = 0; i < src.length; i++) hash = ((hash * 31) + src.charCodeAt(i)) >>> 0;
    const numHash = Math.abs(hash) % 1000000;
    const numFolioStr = String(numHash).padStart(6, '0');

    let deliveryFolio = extra.deliveryFolio || '';
    if (!deliveryFolio || !String(deliveryFolio).startsWith('ENT-')) {
      if (String(movement.id).startsWith('ENT-')) {
        deliveryFolio = movement.id;
      } else {
        deliveryFolio = `ENT-${numFolioStr}`;
      }
    }

    let receiptFolio = extra.receiptFolio || (extra.returnDetails && extra.returnDetails.folio) || null;
    const hasReturn = movement.status === 'pending_handover' || movement.status === 'completed' || extra.returnDetails || movement.returned_change > 0 || movement.used_quantity > 0 || movement.returned_damaged > 0;
    if (!receiptFolio && hasReturn) {
      receiptFolio = `REC-${numFolioStr}`;
    }

    // El folio actual visible cambia según el estado del ciclo de vida
    const isReceivedOrClosed = movement.status === 'pending_handover' || movement.status === 'completed';
    const currentFolio = isReceivedOrClosed ? (receiptFolio || `REC-${numFolioStr}`) : deliveryFolio;

    return {
      ...extra,
      id: movement.id,
      folio: currentFolio,
      currentFolio: currentFolio,
      deliveryFolio: deliveryFolio,
      receiptFolio: receiptFolio || `REC-${numFolioStr}`,
      materialId: movement.material_id,
      materialName: extra.materialName || movement.material_name || (items.length > 1 ? `${items[0].materialName} (+${items.length - 1} más)` : items[0].materialName),
      quantity: Number(movement.quantity) || Number(extra.quantity) || items.reduce((s, it) => s + (Number(it.quantity) || 0), 0),
      unit: extra.unit || movement.unit || items[0].unit || 'pieza',
      items: items,
      technicianId: movement.technician_id || extra.technicianId || '',
      technicianUserId: movement.tech_db_user_id || extra.technicianUserId || '',
      technicianName: extra.technicianName || movement.tech_db_name || movement.technician_name || '',
      type: movement.movement_type || extra.type || 'give',
      returnedChange: Number(movement.returned_change) || Number(extra.returnedChange) || 0,
      returnedDamaged: Number(movement.returned_damaged) || Number(extra.returnedDamaged) || 0,
      usedQuantity: Number(movement.used_quantity) || Number(extra.usedQuantity) || 0,
      reference: movement.reference || extra.reference || '',
      reason: movement.reason || extra.reason || '',
      status: movement.status || extra.status || 'pending_receipt',
      createdBy: movement.created_by || extra.createdBy || '',
      createdByName: movement.created_by_name_legacy || extra.createdByName || 'Soporte',
      at: movement.created_at || extra.at || '',
      createdAt: movement.created_at || extra.createdAt || '',
      acceptedAt: movement.accepted_at || extra.acceptedAt || null,
      acceptedBy: movement.accepted_by || extra.acceptedBy || null,
      acceptedByName: movement.accepted_by_name || extra.acceptedByName || null,
      handoverAcceptedAt: movement.handover_accepted_at || extra.handoverAcceptedAt || null,
      handoverAcceptedBy: movement.handover_accepted_by || extra.handoverAcceptedBy || null,
      handoverAcceptedByName: movement.handover_accepted_by_name || extra.handoverAcceptedByName || null,
      notes: movement.notes || extra.notes || '',
      isEdited: !!extra.isEdited,
      editedAt: extra.editedAt || null,
      editedByName: extra.editedByName || '',
      returnDetails: extra.returnDetails || null,
      updatedAt: movement.updated_at || extra.updatedAt || movement.created_at || ''
    };
  });
}

async function loadAudit(env, page = null) {
  const limit = page ? Math.max(1, Math.min(100, Number(page.limit) || 75)) : null;
  const offset = page ? Math.max(0, Number(page.offset) || 0) : 0;
  const query=auditQuery(page);
  const binds=[...query.binds];
  if (limit) binds.push(limit,offset);
  const rows = await all(env, `SELECT * FROM audit_log${query.where} ORDER BY at DESC,rowid DESC${limit ? ' LIMIT ? OFFSET ?' : ''}`, binds);
  const orderIds = [...new Set(rows.map(row => row.target_id).filter(Boolean))];
  const orders = [];
  for (const idsChunk of chunkValues(orderIds)) {
    const placeholders = idsChunk.map(() => '?').join(',');
    orders.push(...await all(env, `SELECT id,category FROM work_orders WHERE id IN (${placeholders})`, idsChunk));
  }
  const ordersById = new Map(orders.map(order => [order.id,order]));
  return rows.map(row => {
    const raw = parseJson(row.raw_json,{}) || {};
    const order = ordersById.get(row.target_id);
    return { id:row.id,action:row.action||'',at:row.at||'',byId:row.user_id||'',byName:row.by_name_legacy||'',byUsername:row.by_username_legacy||'',byRole:row.by_role_legacy||'',targetId:row.target_id||'',targetName:row.target_name||'',targetType:row.target_type||'',...(order?{orderId:order.id,orderCategory:order.category||''}:{}),...(raw.updatedAt?{updatedAt:raw.updatedAt}:{}) };
  });
}

async function loadTechAccess(env) {
  const rows = await all(env, 'SELECT * FROM tech_access_log ORDER BY rowid');
  return rows.map(row => ({ id:row.id,technicianId:row.technician_id||'',technicianName:row.technician_name_legacy||'',routeScope:row.route_scope||'',scopeLabel:row.scope_label||'',at:row.at||'',userAgent:row.user_agent||'',...(row.updated_at?{updatedAt:row.updated_at}:{}) }));
}

async function loadDeletionRequests(env) {
  const rows = await all(env, 'SELECT * FROM deletion_requests ORDER BY rowid');
  return rows.map(row => {
    const raw = parseJson(row.raw_json,{}) || {};
    return { ...raw,id:row.id,targetType:row.target_type||raw.targetType,targetId:row.target_id||raw.targetId,targetName:row.target_name||raw.targetName,nodeId:row.node_id||raw.nodeId,detailId:row.detail_id||raw.detailId,requestedByUserId:row.requested_by||raw.requestedByUserId,requestedByName:row.requested_by_name_legacy||raw.requestedByName,status:row.status||raw.status,code:row.code||raw.code,createdAt:row.created_at||raw.createdAt,updatedAt:row.updated_at||raw.updatedAt,resolvedAt:row.resolved_at||raw.resolvedAt,approvedBy:row.approved_by_name_legacy||raw.approvedBy,rejectedBy:row.rejected_by_name_legacy||raw.rejectedBy,completedBy:row.completed_by_name_legacy||raw.completedBy };
  });
}

async function loadWeekPlan(env,page={}) {
  let plans;
  const viewerRole=nullableText(page?.viewerRole),viewerId=nullableText(page?.viewerId);
  let scopedTechnicianId='';
  if(viewerRole==='tecnico'&&viewerId){const technician=await first(env,'SELECT id FROM technicians WHERE user_id=? AND deleted_at IS NULL',[viewerId]);scopedTechnicianId=technician?.id||'';plans=scopedTechnicianId?await all(env,"SELECT DISTINCT p.* FROM plans p LEFT JOIN plan_assignments a ON a.plan_id=p.id WHERE COALESCE(p.scope_key,p.technician_id,'') IN (?,'','__shared__') OR a.technician_id=? ORDER BY p.rowid",[scopedTechnicianId,scopedTechnicianId]):[];}else plans=await all(env,'SELECT * FROM plans ORDER BY rowid');
  const planIds=plans.map(plan=>plan.id);
  const assignments=[];
  const stops=[];
  for(const idsChunk of chunkValues(planIds)){
    const planFilter=` WHERE plan_id IN (${idsChunk.map(()=>'?').join(',')})`;
    assignments.push(...await all(env,`SELECT * FROM plan_assignments${planFilter} ORDER BY assigned_at,rowid`,idsChunk));
    stops.push(...await all(env,`SELECT * FROM plan_stops${planFilter} ORDER BY plan_id,position`,idsChunk));
  }
  const stopIds=stops.map(stop=>stop.id);
  const links=[];
  for(const idsChunk of chunkValues(stopIds))links.push(...await all(env,`SELECT * FROM plan_stop_orders WHERE plan_stop_id IN (${idsChunk.map(()=>'?').join(',')}) ORDER BY plan_stop_id,position,work_order_id`,idsChunk));
  const assignmentByPlan = new Map();
  for (const assignment of assignments) {
    if (!assignmentByPlan.has(assignment.plan_id)) assignmentByPlan.set(assignment.plan_id, assignment);
  }
  const detailsByStop = new Map();
  for (const link of links) { const list=detailsByStop.get(link.plan_stop_id)||[]; list.push(link.work_order_id); detailsByStop.set(link.plan_stop_id,list); }
  const stopsByPlan = new Map();
  for (const row of stops) {
    const raw = parseJson(row.raw_json,{}) || {};
    const stop = { ...raw,id:raw.id || row.id,type:row.stop_type||raw.type||'',name:row.name||raw.name||'',lat:row.lat ?? raw.lat ?? '',lng:row.lng ?? raw.lng ?? '',detailIds:detailsByStop.get(row.id)||[],notes:row.notes||raw.notes||'',createdAt:row.created_at||raw.createdAt||'' };
    if (row.equipment_id) stop.equipmentId=row.equipment_id;
    if (row.node_id) stop.nodeId=row.node_id;
    if (row.auto_assigned !== null && row.auto_assigned !== undefined) stop.autoAssigned=!!row.auto_assigned;
    const list=stopsByPlan.get(row.plan_id)||[]; list.push(stop); stopsByPlan.set(row.plan_id,list);
  }
  const out = {};
  const ensureScope = key => {
    if (!out[key]) out[key] = {lunes:[],martes:[],miercoles:[],jueves:[],viernes:[],sabado:[],domingo:[],general:[]};
    return out[key];
  };
  const technicianRows = scopedTechnicianId?[{id:scopedTechnicianId}]:await all(env, 'SELECT id FROM technicians ORDER BY rowid');
  ensureScope('__shared__');
  ensureScope('');
  for (const technician of technicianRows) ensureScope(technician.id);
  for (const plan of plans) {
    const scopeKey = plan.scope_key ?? plan.technician_id ?? '';
    const scope = ensureScope(scopeKey);
    const planStops = stopsByPlan.get(plan.id)||[];
    if (plan.legacy_source === 'weekPlan _generalPlans') {
      if (!Array.isArray(scope._generalPlans)) scope._generalPlans=[];
      const assignment = assignmentByPlan.get(plan.id);
      scope._generalPlans.push({
        id:plan.id,
        name:plan.name,
        stops:planStops,
        assignedTechId:assignment?.technician_id || '',
        assignedAt:assignment?.assigned_at || '',
        scheduledDate:plan.scheduled_date || '',
        ...(plan.created_at?{createdAt:plan.created_at}:{})
      });
    } else {
      const day = DAY_KEYS.includes(plan.day_key) ? plan.day_key : 'general';
      scope[day] = planStops;
    }
  }
  return out;
}

async function getAppSetting(env, key, fallback = {}) {
  const row = await first(env, 'SELECT value_json FROM app_settings WHERE key=?', [key]);
  if (row) return parseJson(row.value_json, fallback);
  return parseJson(await getLegacyAppDataValue(env,key), fallback);
}

async function setAppSetting(env,key,value) {
  const now=new Date().toISOString();
  await run(env, `INSERT INTO app_settings(key,value_json,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`, [key,JSON.stringify(value??{}),now]);
  return now;
}

export async function getDashboardGoal(env) {
  const setting=await getAppSetting(env,'dashboardGoal',{});
  const monthlyGoal=Number(setting?.monthlyGoal);
  return {
    monthlyGoal:Number.isInteger(monthlyGoal)&&monthlyGoal>0?monthlyGoal:350,
    updatedAt:String(setting?.updatedAt||'')
  };
}

export async function setDashboardGoal(env,monthlyGoal) {
  const value=Number(monthlyGoal);
  if(!Number.isInteger(value)||value<1||value>100000) throw new Error('La meta mensual debe ser un entero entre 1 y 100000');
  const updatedAt=new Date().toISOString();
  await setAppSetting(env,'dashboardGoal',{monthlyGoal:value,updatedAt});
  return {monthlyGoal:value,updatedAt};
}

export async function loadState(env) {
  const [usersMap,auditMap] = await Promise.all([getUserMap(env),getLatestAuditMap(env)]);
  const ctx={users:usersMap,audit:auditMap};
  const [equipment,nodes,workOrders,technicians,users,techAccessLog,deletionRequests,auditLog,materials,routes,weekPlan,prepChecked,syncMeta] = await Promise.all([
    loadEquipment(env,ctx),loadNodes(env,ctx),loadWorkOrders(env,ctx),loadTechnicians(env),loadUsers(env),loadTechAccess(env),loadDeletionRequests(env),loadAudit(env),loadMaterials(env),loadRoutes(env),loadWeekPlan(env),getAppSetting(env,'prepChecked',{}),getAppSetting(env,'syncMeta',{})
  ]);
  return {equipment,nodes,workOrders,technicians,users,techAccessLog,deletionRequests,auditLog,materials,routes,weekPlan,prepChecked,syncMeta:syncMeta||{}};
}

export async function loadStatePart(env, part, page = {}) {
  if (part === 'equipment' || part === 'nodes') {
    const usersMap = await getUserMap(env);
    const ctx={users:usersMap,audit:null};
    const key = part;
    const records = part === 'equipment' ? await loadEquipment(env,ctx,page) : await loadNodes(env,ctx,page);
    const summary=entitySummaryQuery(part,page);
    const summaryRows=await all(env,summary.sql,summary.binds);
    const stats={total:summaryRows.length,critical:0,warning:0,pending:0,clear:0};
    for(const row of summaryRows){if(row.priority_key==='critico')stats.critical+=1;else if(row.priority_key==='atencion')stats.warning+=1;else if(row.priority_key==='pendiente')stats.pending+=1;else stats.clear+=1;}
    const result={[key]:records,total:summaryRows.length,stats};
    if(page?.includeRelated==='1'&&records.length){
      const ids=records.map(record=>record.id);
      result.workOrders=[];
      const relationKey=part==='equipment'?'equipmentIds':'nodeIds';
      for(const idsChunk of chunkValues(ids)){
        for(let relatedOffset=0;;relatedOffset+=100){
          const related=await loadWorkOrders(env,{users:usersMap,audit:null},{limit:'100',offset:String(relatedOffset),windowed:'1',[relationKey]:idsChunk.join(',')});
          result.workOrders.push(...related);
          if(related.length<100)break;
        }
      }
      result.workOrders=[...new Map(result.workOrders.map(order=>[order.id,order])).values()];
      await markPlannedWorkOrders(env,result.workOrders);
      const detailIds=new Set(result.workOrders.map(order=>order.id));
      const idSet=new Set(ids);
      result.deletionRequests=(await loadDeletionRequests(env)).filter(request=>idSet.has(request.targetId)||detailIds.has(request.targetId)||idSet.has(request.nodeId)||detailIds.has(request.detailId));
      if(part==='equipment'){
        const nodeIds=[...new Set(records.flatMap(record=>record.linkedNodeIds||[]))];
        result.nodes=[];
        for(const idsChunk of chunkValues(nodeIds))result.nodes.push(...await loadNodes(env,ctx,{paged:'1',limit:'100',nodeIds:idsChunk.join(',')}));
        // Incluir todos los pueblos disponibles para permitir vinculación en antenas
        const allSystemNodes = await loadNodes(env,ctx,{limit:'1000'});
        const existingNodeIdSet = new Set(result.nodes.map(n => n.id));
        for (const n of allSystemNodes) {
          if (!existingNodeIdSet.has(n.id)) result.nodes.push(n);
        }
      } else {
        const linked=[];
        for(const idsChunk of chunkValues(ids))linked.push(...await all(env,`SELECT DISTINCT equipment_id FROM equipment_nodes WHERE node_id IN (${idsChunk.map(()=>'?').join(',')})`,idsChunk));
        const equipmentIds=linked.map(row=>row.equipment_id);
        result.equipment=[];
        for(const idsChunk of chunkValues([...new Set(equipmentIds)]))result.equipment.push(...await loadEquipment(env,ctx,{paged:'1',limit:'100',equipmentIds:idsChunk.join(',')}));
      }
    }
    return result;
  }
  if (part === 'materials') {
    const query=materialQuery(page);
    const [materials,totalRow,statsRow,materialMovements] = await Promise.all([
      loadMaterials(env,page),
      first(env,`SELECT COUNT(*) AS total FROM materials${query.where}`,query.binds),
      first(env,`SELECT COUNT(*) AS total,SUM(CASE WHEN stock<=minimum_stock THEN 1 ELSE 0 END) AS low FROM materials WHERE deleted_at IS NULL`),
      loadAllMaterialMovements(env)
    ]);
    const technicians = await loadTechnicians(env);
    return {materials,materialMovements,technicians,total:Number(totalRow?.total)||0,stats:{total:Number(statsRow?.total)||0,low:Number(statsRow?.low)||0}};
  }
  if (part === 'routes') {
    const query=routeQuery(page);
    const [routes,totalRow] = await Promise.all([loadRoutes(env,page),first(env,`SELECT COUNT(*) AS total FROM routes${query.where}`,query.binds)]);
    return {routes,total:Number(totalRow?.total)||0};
  }
  if (part === 'infrastructure') {
    const [usersMap,auditMap] = await Promise.all([getUserMap(env),getLatestAuditMap(env)]);
    const ctx={users:usersMap,audit:auditMap};
    const [equipment,nodes,materials,routes] = await Promise.all([
      loadEquipment(env,ctx),loadNodes(env,ctx),loadMaterials(env),loadRoutes(env)
    ]);
    return {equipment,nodes,materials,routes};
  }
  if (part === 'operations') {
    await ensureWorkOrderRelationRecovery(env);
    const usersMap = await getUserMap(env);
    const workOrders=await loadWorkOrders(env,{users:usersMap,audit:null},page);
    const placeNodes=page?.includeMapCatalog==='1'
      ? (await all(env,"SELECT id,node_code,town FROM nodes WHERE deleted_at IS NULL ORDER BY rowid")).map(row=>({id:row.id,nodeCode:row.node_code||'',town:row.town||''}))
      : [];
    const visibleIds=new Set(workOrders.map(order=>order.id));
    const deletionRequests=(page?.windowed==='1'||page?.scoped==='1')?(await loadDeletionRequests(env)).filter(request=>visibleIds.has(request.targetId)||visibleIds.has(request.detailId)):[];
    const query=workOrderQuery(page);
    const [supportUsers, attentionUsers] = await Promise.all([
      all(env,`SELECT u.id,u.name,u.username,u.color,r.code AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.deleted_at IS NULL AND (u.active IS NULL OR u.active=1) AND r.code IN ('administrador','admin','soporte') ORDER BY lower(u.name),lower(u.username)`),
      all(env,`SELECT u.id,u.name,u.username,u.color,r.code AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.deleted_at IS NULL AND (u.active IS NULL OR u.active=1) AND r.code IN ('atencion_clientes','atencion') ORDER BY lower(u.name),lower(u.username)`)
    ]);
    const mappedSupportUsers = supportUsers.map(user=>({id:user.id,name:user.name||user.username||'Soporte',username:user.username,color:user.color||'',role:normalizeRole(user.role)}));
    const mappedAttentionUsers = attentionUsers.map(user=>({id:user.id,name:user.name||user.username||'Atención',username:user.username,color:user.color||'',role:normalizeRole(user.role)}));
    if (page?.windowed !== '1') {
      const totalRow=await first(env,`SELECT COUNT(*) AS total FROM work_orders w LEFT JOIN zones z ON z.id=w.zone_id${query.where}`,query.binds);
      return {workOrders,deletionRequests,total:Number(totalRow?.total)||0,supportUsers:mappedSupportUsers,attentionUsers:mappedAttentionUsers};
    }
    const statsDetailKind=page?.detailKind==='network'?'network':'physical';
    const excludedStatsCategories=statsDetailKind==='physical'?PHYSICAL_STATS_EXCLUDED_CATEGORIES:[];
    const statsCategoryClause=excludedStatsCategories.length?` AND lower(COALESCE(category,'')) NOT IN (${excludedStatsCategories.map(()=>'?').join(',')})`:'';
    const [totalRow,statsRow,creatorRows]=await Promise.all([
      first(env,`SELECT COUNT(*) AS total FROM work_orders w LEFT JOIN zones z ON z.id=w.zone_id${query.where}`,query.binds),
      first(env,`SELECT COUNT(*) AS total, SUM(CASE WHEN COALESCE(status,'pendiente') NOT IN ('completada','no_realizado') THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN COALESCE(status,'pendiente') NOT IN ('completada','no_realizado') AND priority IN ('muy_alta','alta') THEN 1 ELSE 0 END) AS critical, SUM(CASE WHEN status='completada' THEN 1 ELSE 0 END) AS done FROM work_orders WHERE deleted_at IS NULL AND COALESCE(detail_kind,'physical')=?${statsCategoryClause}`,[statsDetailKind,...excludedStatsCategories]),
      all(env,`SELECT DISTINCT u.id,u.name,u.username,u.color FROM work_orders w JOIN users u ON u.id=w.created_by WHERE w.deleted_at IS NULL ORDER BY lower(u.name),lower(u.username)`)
    ]);
    return {
      workOrders,
      deletionRequests,
      total:Number(totalRow?.total)||0,
      stats:{total:Number(statsRow?.total)||0,pending:Number(statsRow?.pending)||0,critical:Number(statsRow?.critical)||0,done:Number(statsRow?.done)||0},
      creators:creatorRows.map(user=>({id:user.id,name:user.name||user.username||'Usuario',color:user.color||''})),
      supportUsers:mappedSupportUsers,
      attentionUsers:mappedAttentionUsers,
      ...(placeNodes.length?{nodes:placeNodes}:{})
    };
  }
  if (part === 'people') {
    const query=userQuery(page);
    const [users,totalRow,statsRow] = await Promise.all([
      loadUsers(env,page),
      first(env,`SELECT COUNT(*) AS total FROM users u JOIN roles r ON r.id=u.role_id${query.where}`,query.binds),
      first(env,page?.hidePrincipal==='1'?"SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL AND lower(username)<>'abraham'":'SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL')
    ]);
    const technicians=await loadTechnicians(env,users.map(user=>user.id));
    return {technicians,users,total:Number(totalRow?.total)||0,stats:{total:Number(statsRow?.total)||0}};
  }
  if (part === 'activity') {
    const [techAccessLog,deletionRequests] = await Promise.all([
      loadTechAccess(env),loadDeletionRequests(env)
    ]);
    return {techAccessLog,deletionRequests};
  }
  if (part === 'audit') {
    const query=auditQuery(page);
    const auditLog=await loadAudit(env,page);
    const statsRow=await first(env,`SELECT COUNT(*) AS total,SUM(CASE WHEN lower(action) LIKE '%elimin%' OR lower(action) LIKE '%borr%' THEN 1 ELSE 0 END) AS deleted,SUM(CASE WHEN lower(action) LIKE '%cre%' OR lower(action) LIKE '%agreg%' OR lower(action) LIKE '%registr%' THEN 1 ELSE 0 END) AS created,SUM(CASE WHEN lower(action) LIKE '%complet%' OR lower(action) LIKE '%termin%' THEN 1 ELSE 0 END) AS completed FROM audit_log${query.where}`,query.binds);
    const total=Number(statsRow?.total)||0;
    const directoryQuery=auditQuery({...page,q:'',user:'',action:''});
    const actorRows=await all(env,`SELECT user_id,MAX(by_name_legacy) name,MAX(by_username_legacy) username,MAX(by_role_legacy) role FROM audit_log${directoryQuery.where} GROUP BY COALESCE(user_id,by_username_legacy,by_name_legacy) ORDER BY lower(MAX(by_name_legacy))`,directoryQuery.binds);
    const users=actorRows.map(row=>({id:row.user_id||row.username||row.name,name:row.name||row.username||'Usuario',username:row.username||'',role:normalizeRole(row.role||'')}));
    return {auditLog,users,total,stats:{total,created:Number(statsRow?.created)||0,completed:Number(statsRow?.completed)||0,deleted:Number(statsRow?.deleted)||0,updated:Math.max(0,total-(Number(statsRow?.created)||0)-(Number(statsRow?.completed)||0)-(Number(statsRow?.deleted)||0))}};
  }
  if (part === 'planning') {
    const includeMapCatalog=page?.includeMapCatalog==='1';
    const [weekPlan,prepChecked,syncMeta,mapCatalog] = await Promise.all([
      loadWeekPlan(env,page),getAppSetting(env,'prepChecked',{}),getAppSetting(env,'syncMeta',{}),includeMapCatalog?loadPlanningMapCatalog(env):Promise.resolve(null)
    ]);
    const scopes=Object.values(weekPlan||{});
    const stops=[];
    for(const scope of scopes){for(const [day,value] of Object.entries(scope||{})){if(day==='_generalPlans'){for(const plan of value||[])stops.push(...(plan.stops||[]));}else if(Array.isArray(value))stops.push(...value);}}
    const equipmentIds=[...new Set(stops.map(stop=>stop.equipmentId).filter(Boolean))];
    const nodeIds=[...new Set(stops.map(stop=>stop.nodeId).filter(Boolean))];
    const detailIds=[...new Set(stops.flatMap(stop=>stop.detailIds||[]).filter(Boolean))];
    const usersMap=await getUserMap(env);const ctx={users:usersMap,audit:null};
    const equipment=mapCatalog?.equipment||[];
    if(!mapCatalog)for(const idsChunk of chunkValues(equipmentIds))equipment.push(...await loadEquipment(env,ctx,{paged:'1',limit:'100',equipmentIds:idsChunk.join(',')}));
    const nodes=mapCatalog?.nodes||[];
    if(!mapCatalog)for(const idsChunk of chunkValues(nodeIds))nodes.push(...await loadNodes(env,ctx,{paged:'1',limit:'100',nodeIds:idsChunk.join(',')}));
    const workOrdersById=new Map();
    const appendWorkOrders=rows=>rows.forEach(order=>workOrdersById.set(order.id,order));
    for(const idsChunk of chunkValues(detailIds))appendWorkOrders(await loadAllWorkOrderPages(env,usersMap,{workOrderIds:idsChunk.join(',')}));
    // Una parada puede haberse guardado antes de que el navegador cargara sus
    // ordenes. Recuperar tambien los detalles abiertos por entidad evita que el
    // plan quede permanentemente en 0/0 aunque la ficha de la antena o pueblo si
    // los muestre. Los terminados historicos siguen entrando solo por vinculo.
    for(const idsChunk of chunkValues(equipmentIds))appendWorkOrders(await loadAllWorkOrderPages(env,usersMap,{equipmentIds:idsChunk.join(','),openOnly:'1'}));
    for(const idsChunk of chunkValues(nodeIds))appendWorkOrders(await loadAllWorkOrderPages(env,usersMap,{nodeIds:idsChunk.join(','),openOnly:'1'}));
    const workOrders=[...workOrdersById.values()];
    const visibleIds=new Set([...equipmentIds,...nodeIds,...detailIds]);
    const deletionRequests=(await loadDeletionRequests(env)).filter(request=>visibleIds.has(request.targetId)||visibleIds.has(request.nodeId)||visibleIds.has(request.detailId));
    const materialMovements = await loadAllMaterialMovements(env);
    const technicians = await loadTechnicians(env);
    return {weekPlan,prepChecked,syncMeta:syncMeta||{},equipment,nodes,workOrders,deletionRequests,materialMovements,technicians};
  }
  throw new Error(`Seccion de datos no permitida: ${part}`);
}

export async function getSyncMeta(env) {
  const row=await first(env,'SELECT value_json,updated_at FROM app_settings WHERE key=?',['syncMeta']);
  const value=row ? parseJson(row.value_json,{}) : parseJson(await getLegacyAppDataValue(env,'syncMeta'),{});
  return {updatedAt:value?.updatedAt||row?.updated_at||'',serverTime:new Date().toISOString()};
}

export async function touchSync(env) {
  const now=new Date().toISOString();
  await setAppSetting(env,'syncMeta',{updatedAt:now});
  return now;
}

async function replaceZones(env, ownerTable, ownerColumn, ownerId, zones) {
  const mapTable = ownerTable;
  await run(env, `DELETE FROM ${mapTable} WHERE ${ownerColumn}=?`, [ownerId]);
  const statements=[];
  for (const code of Array.isArray(zones)?zones:[]) {
    const zoneId=await ensureZone(env,code);
    if (!zoneId) continue;
    statements.push(env.DB.prepare(`INSERT OR IGNORE INTO ${mapTable}(${ownerColumn},zone_id) VALUES(?,?)`).bind(ownerId,zoneId));
  }
  if (statements.length) await batchChunks(env,statements);
}

async function upsertEquipment(env, rec) {
  const zoneId=await ensureZone(env,rec.region);
  await run(env, `INSERT INTO equipment(id,name,ip,type,lat,lng,status,provider,notes,zone_id,ssid,radio_summary_legacy,radio_models_legacy,radio_names_legacy,station_names_legacy,radio_free_text_legacy,created_at,updated_at,deleted_at,purged_at,created_by,updated_by)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,ip=excluded.ip,type=excluded.type,lat=excluded.lat,lng=excluded.lng,status=excluded.status,provider=excluded.provider,notes=excluded.notes,zone_id=excluded.zone_id,ssid=excluded.ssid,radio_summary_legacy=excluded.radio_summary_legacy,radio_models_legacy=excluded.radio_models_legacy,radio_names_legacy=excluded.radio_names_legacy,station_names_legacy=excluded.station_names_legacy,radio_free_text_legacy=excluded.radio_free_text_legacy,created_at=COALESCE(equipment.created_at,excluded.created_at),updated_at=excluded.updated_at,deleted_at=excluded.deleted_at,purged_at=excluded.purged_at,created_by=COALESCE(equipment.created_by,excluded.created_by),updated_by=excluded.updated_by`,
    [rec.id,text(rec.name),text(rec.ip),text(rec.type),nullableNumber(rec.lat),nullableNumber(rec.lng),text(rec.status),text(rec.provider),text(rec.notes),zoneId,rec.ssid??null,rec.radioSummary??null,rec.radioModels??null,rec.radioNames??null,rec.stationNames??null,rec.radioFreeText??null,rec.createdAt??null,rec.updatedAt??null,rec.deletedAt??null,rec.purgedAt??null,nullableText(rec.createdById),nullableText(rec.updatedById)]);
  if (Array.isArray(rec.radioLinks)) {
    await run(env,'DELETE FROM equipment_radios WHERE equipment_id=?',[rec.id]);
    const stmts=rec.radioLinks.map((r,i)=>env.DB.prepare(`INSERT INTO equipment_radios(id,equipment_id,position,name,model,antenna_type,sector,port,ip,ssid,gateway,location_raw,lat,lng) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(generatedId('er'),rec.id,i,text(r.name),text(r.model),text(r.antennaType),text(r.sector),text(r.port),text(r.ip),text(r.ssid),text(r.gateway),text(r.location),nullableNumber(r.lat),nullableNumber(r.lng)));
    if (stmts.length) await batchChunks(env,stmts);
  }
  if (Array.isArray(rec.linkedNodeIds)) {
    await run(env,'DELETE FROM equipment_nodes WHERE equipment_id=?',[rec.id]);
    const cleanNodeIds = rec.linkedNodeIds.filter(Boolean);
    if (cleanNodeIds.length) {
      // Regla: un pueblo solo puede asignarse a una antena
      for (const chunk of chunkValues(cleanNodeIds)) {
        const ph = chunk.map(() => '?').join(',');
        await run(env, `DELETE FROM equipment_nodes WHERE node_id IN (${ph})`, chunk);
      }
      const stmts=cleanNodeIds.map((nodeId,i)=>env.DB.prepare('INSERT OR IGNORE INTO equipment_nodes(equipment_id,node_id,position,created_at) VALUES(?,?,?,?)').bind(rec.id,nodeId,i,new Date().toISOString()));
      await batchChunks(env,stmts);
    }
  }
}

async function upsertNode(env,rec) {
  const zoneId=await ensureZone(env,rec.zone);
  await run(env, `INSERT INTO nodes(id,node_code,town,zone_id,lat,lng,status,notes,created_at,updated_at,deleted_at,created_by,updated_by,deleted_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
   ON CONFLICT(id) DO UPDATE SET node_code=excluded.node_code,town=excluded.town,zone_id=excluded.zone_id,lat=excluded.lat,lng=excluded.lng,status=excluded.status,notes=excluded.notes,created_at=COALESCE(nodes.created_at,excluded.created_at),updated_at=excluded.updated_at,deleted_at=excluded.deleted_at,created_by=COALESCE(nodes.created_by,excluded.created_by),updated_by=excluded.updated_by,deleted_by=excluded.deleted_by`,
   [rec.id,text(rec.nodeCode),text(rec.town),zoneId,nullableNumber(rec.lat),nullableNumber(rec.lng),text(rec.status),text(rec.notes),rec.createdAt??null,rec.updatedAt??null,rec.deletedAt??null,nullableText(rec.createdById),nullableText(rec.updatedById),nullableText(rec.deletedById)]);
}

async function upsertWorkOrder(env,rec) {
  const zoneId=await ensureZone(env,rec.region);
  const isInstallation=isInstallationCategory(rec.category);
  const status=isInstallation?'completada':text(rec.status);
  const completedAt=isInstallation?(rec.completedAt||rec.technicianReport?.completedAt||rec.createdAt||new Date().toISOString()):(rec.completedAt??null);
  const relationProperties=['equipmentId','nodeId','equipmentName','nodeCode','nodeName','town'];
  const missingRelationProperty=relationProperties.some(property=>!Object.prototype.hasOwnProperty.call(rec,property));
  const existingRelation=missingRelationProperty&&rec.id
    ? await first(env,'SELECT equipment_id,node_id,equipment_name_legacy,node_code_legacy,node_name_legacy,town_legacy FROM work_orders WHERE id=?',[rec.id])
    : null;
  const relationValue=(property,column)=>Object.prototype.hasOwnProperty.call(rec,property)?rec[property]:(existingRelation?.[column]??null);
  const equipmentId=nullableText(relationValue('equipmentId','equipment_id'));
  const nodeId=nullableText(relationValue('nodeId','node_id'));
  const equipmentName=relationValue('equipmentName','equipment_name_legacy');
  const nodeCode=relationValue('nodeCode','node_code_legacy');
  const nodeName=relationValue('nodeName','node_name_legacy');
  const town=relationValue('town','town_legacy');
  const assignedUserId=nullableText(rec.assignedUserId || rec.assignedTo || rec.assignedToUserId);
  const assignedUserName=nullableText(rec.assignedUserName || rec.assignedToName);
  const targetRole=nullableText(rec.targetRole);
  const originRole=nullableText(rec.originRole);
  const insertSql = `INSERT INTO work_orders(id,title,category,detail_kind,review_opened_at,review_opened_by,reviewed_at,last_resent_at,follow_ups_json,source_order_id,description,legacy_desc,client_name,client_phone,equipment_id,node_id,equipment_name_legacy,node_code_legacy,node_name_legacy,town_legacy,priority,visit_type,zone_id,status,detail_location,lat,lng,legacy_technician_id,created_at,updated_at,completed_at,deleted_at,created_by,updated_by,deleted_by,target_role,origin_role,assigned_user_id,assigned_user_name)
   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
   ON CONFLICT(id) DO UPDATE SET title=excluded.title,category=excluded.category,detail_kind=excluded.detail_kind,review_opened_at=CASE WHEN excluded.status='pendiente' AND excluded.last_resent_at IS NOT NULL THEN NULL ELSE COALESCE(NULLIF(work_orders.review_opened_at,''),NULLIF(excluded.review_opened_at,'')) END,review_opened_by=CASE WHEN excluded.status='pendiente' AND excluded.last_resent_at IS NOT NULL THEN NULL WHEN NULLIF(work_orders.review_opened_at,'') IS NULL THEN excluded.review_opened_by ELSE work_orders.review_opened_by END,reviewed_at=excluded.reviewed_at,last_resent_at=excluded.last_resent_at,follow_ups_json=excluded.follow_ups_json,source_order_id=excluded.source_order_id,description=excluded.description,legacy_desc=excluded.legacy_desc,client_name=excluded.client_name,client_phone=excluded.client_phone,equipment_id=excluded.equipment_id,node_id=excluded.node_id,equipment_name_legacy=excluded.equipment_name_legacy,node_code_legacy=excluded.node_code_legacy,node_name_legacy=excluded.node_name_legacy,town_legacy=excluded.town_legacy,priority=excluded.priority,visit_type=excluded.visit_type,zone_id=excluded.zone_id,status=CASE WHEN work_orders.status='en_revision' AND excluded.status='pendiente' AND excluded.last_resent_at IS NULL THEN work_orders.status ELSE excluded.status END,detail_location=excluded.detail_location,lat=excluded.lat,lng=excluded.lng,legacy_technician_id=excluded.legacy_technician_id,created_at=COALESCE(work_orders.created_at,excluded.created_at),updated_at=excluded.updated_at,completed_at=excluded.completed_at,deleted_at=excluded.deleted_at,created_by=COALESCE(work_orders.created_by,excluded.created_by),updated_by=excluded.updated_by,deleted_by=excluded.deleted_by,target_role=COALESCE(excluded.target_role,work_orders.target_role),origin_role=COALESCE(excluded.origin_role,work_orders.origin_role),assigned_user_id=excluded.assigned_user_id,assigned_user_name=excluded.assigned_user_name`;
  const insertBinds = [rec.id,text(rec.title),rec.category??null,rec.detailKind==='network'?'network':'physical',nullableText(rec.reviewOpenedAt),nullableText(rec.reviewOpenedById),rec.reviewedAt??null,rec.lastResentAt??null,JSON.stringify(Array.isArray(rec.followUps)?rec.followUps:[]),nullableText(rec.sourceOrderId),rec.description??null,rec.desc??null,rec.clientName??null,rec.clientPhone??rec.phone??null,equipmentId,nodeId,equipmentName,nodeCode,nodeName,town,text(rec.priority),text(rec.visitType),zoneId,status,rec.detailLocation??null,nullableNumber(rec.lat),nullableNumber(rec.lng),rec.technicianId??null,rec.createdAt??null,rec.updatedAt??null,completedAt,rec.deletedAt??null,nullableText(rec.createdById),nullableText(rec.updatedById),nullableText(rec.deletedById),targetRole,originRole,assignedUserId,assignedUserName];

  try {
    await run(env, insertSql, insertBinds);
  } catch (error) {
    if (/no column named/i.test(String(error?.message || error))) {
      await ensureRelationalSchema(env);
      await run(env, insertSql, insertBinds);
    } else {
      throw error;
    }
  }
  if (Array.isArray(rec.materials)) {
    await run(env,'DELETE FROM work_order_materials WHERE work_order_id=?',[rec.id]);
    const stmts=[];
    for (let i=0;i<rec.materials.length;i++) {
      const m=rec.materials[i];
      const obj=typeof m==='object'&&m?m:{name:text(m)};
      const materialId=nullableText(obj.id);
      const materialExists=materialId ? await first(env,'SELECT id FROM materials WHERE id=?',[materialId]) : null;
      stmts.push(env.DB.prepare('INSERT INTO work_order_materials(id,work_order_id,material_id,material_name_legacy,quantity,unit_legacy,raw_json) VALUES(?,?,?,?,?,?,?)').bind(generatedId(`wom-${i}`),rec.id,materialExists?.id||null,obj.name||obj.nombre||text(m),nullableNumber(obj.quantity??obj.cantidad),obj.unit||obj.unidad||'',JSON.stringify(obj)));
    }
    if (stmts.length) await batchChunks(env,stmts);
  }
  if (rec.technicianReport && typeof rec.technicianReport==='object') await upsertWorkOrderReport(env,rec);
}

async function upsertUser(env,rec) {
  const roleId=await ensureRole(env,rec.role);
  const password = text(rec.password).trim();
  const passwordHash = password ? await hashPassword(password) : null;
  const existing = await first(env,'SELECT id,password_hash,password_legacy FROM users WHERE id=?',[rec.id]);
  if (!existing && !passwordHash) throw new Error('La contrasena es obligatoria para usuarios nuevos');
  await run(env, `INSERT INTO users(id,name,username,password_legacy,password_hash,role_id,legacy_role,phone,color,status,active,notes,created_at,updated_at,deleted_at,created_by,updated_by) VALUES(?,?,?,NULL,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,username=excluded.username,password_legacy=CASE WHEN excluded.password_hash IS NOT NULL THEN NULL ELSE users.password_legacy END,password_hash=COALESCE(excluded.password_hash,users.password_hash),role_id=excluded.role_id,legacy_role=excluded.legacy_role,phone=excluded.phone,color=excluded.color,status=excluded.status,active=excluded.active,notes=excluded.notes,created_at=COALESCE(users.created_at,excluded.created_at),updated_at=excluded.updated_at,deleted_at=excluded.deleted_at,created_by=COALESCE(users.created_by,excluded.created_by),updated_by=excluded.updated_by`,
    [rec.id,text(rec.name),text(rec.username),passwordHash,roleId,text(rec.role),text(rec.phone),nullableText(rec.color),text(rec.status,'activo'),boolInt(rec.active,true),text(rec.notes),rec.createdAt??null,rec.updatedAt??null,rec.deletedAt??null,nullableText(rec.createdById),nullableText(rec.updatedById)]);
  await replaceZones(env,'user_zones','user_id',rec.id,rec.zones);
}

async function upsertTechnician(env,rec) {
  await run(env, `INSERT INTO technicians(id,user_id,name,phone,status,username_legacy,password_legacy,notes,created_at,deleted_at) VALUES(?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,name=excluded.name,phone=excluded.phone,status=excluded.status,username_legacy=excluded.username_legacy,password_legacy=excluded.password_legacy,notes=excluded.notes,created_at=COALESCE(technicians.created_at,excluded.created_at),deleted_at=excluded.deleted_at`,
    [rec.id,nullableText(rec.userId),text(rec.nombre),text(rec.telefono),text(rec.estado),rec.usuario??null,rec.password??null,text(rec.notas),rec.createdAt??null,rec.deletedAt??null]);
  await replaceZones(env,'technician_zones','technician_id',rec.id,rec.regiones);
}

async function upsertMaterial(env,rec) {
  await run(env, `INSERT INTO materials(id,name,unit,status,notes,created_at,updated_at,deleted_at,stock,minimum_stock,category,price,package_size) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,unit=excluded.unit,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at,deleted_at=excluded.deleted_at,stock=excluded.stock,minimum_stock=excluded.minimum_stock,category=excluded.category,price=excluded.price,package_size=excluded.package_size`, [rec.id,text(rec.name||rec.nombre),text(rec.unit||rec.unidad),text(rec.status,'activo'),text(rec.notes||rec.desc),rec.createdAt??null,rec.updatedAt??new Date().toISOString(),rec.deletedAt??null,Number(rec.stock??rec.cantidad)||0,Number(rec.minimumStock)||0,text(rec.category||rec.categoria),Number(rec.price??rec.precio)||0,Math.max(1,Number(rec.packageSize)||1)]);
  if (Object.prototype.hasOwnProperty.call(rec,'photo') && /^data:image\/[a-z0-9.+-]+;base64,/i.test(String(rec.photo||''))) {
    await run(env,'DELETE FROM material_photos WHERE material_id=?',[rec.id]);
    await run(env,'INSERT INTO material_photos(id,material_id,storage_type,storage_key,created_at) VALUES(?,?,?,?,?)',[generatedId('mp'),rec.id,'inline_data_url',rec.photo,rec.updatedAt||new Date().toISOString()]);
  }
  if (Array.isArray(rec.allocations)) {
    await run(env,'DELETE FROM technician_material_stock WHERE material_id=?',[rec.id]);
    const now=new Date().toISOString();
    const stmts=rec.allocations.filter(x=>x?.technicianId && Number(x.quantity)>0).map(x=>env.DB.prepare('INSERT INTO technician_material_stock(material_id,technician_id,quantity,updated_at) VALUES(?,?,?,?)').bind(rec.id,x.technicianId,Number(x.quantity),x.updatedAt||now));
    if (stmts.length) await batchChunks(env,stmts);
  }
  const movements = Array.isArray(rec.movements) ? rec.movements : (rec.movement && typeof rec.movement === 'object' ? [rec.movement] : []);
  for (const movement of movements) {
    if (!movement?.id) continue;
    await upsertMaterialMovement(env, { ...movement, materialId: movement.materialId || rec.id });
  }
}

async function upsertMaterialMovement(env, movement) {
  if (!movement?.id) throw new Error('Movimiento de material sin id');
  await ensureMaterialTrackingTables(env);
  const now = movement.updatedAt || new Date().toISOString();
  let materialId = movement.materialId || movement.material_id;
  if (!materialId) {
    materialId = 'mat-' + Math.random().toString(36).slice(2, 10);
  }

  // Asegurar que el material exista en la tabla materials para que no falle la foreign key de SQLite
  const matExists = await first(env, 'SELECT id FROM materials WHERE id = ?', [materialId]);
  if (!matExists) {
    await run(env, `INSERT INTO materials(id, name, unit, stock, minimum_stock, package_size) VALUES(?, ?, ?, 0, 0, 1)`, [
      materialId,
      movement.materialName || 'Material general',
      movement.unit || 'pieza'
    ]);
  }

  // Asegurar que el technician_id sea válido para la foreign key a technicians
  let techId = nullableText(movement.technicianId || movement.technician_id);
  let techName = movement.technicianName || movement.technician_name || '';
  if (techId) {
    const tech = await first(env, 'SELECT id, name FROM technicians WHERE id = ? OR user_id = ?', [techId, techId]);
    if (tech) {
      techId = tech.id;
      if (!techName) techName = tech.name;
    } else {
      techId = null;
    }
  }

  const rawMovement = {
    ...movement,
    technicianId: techId || movement.technicianId || '',
    technicianName: techName || movement.technicianName || ''
  };

  await run(env, `INSERT INTO material_movements(
    id, material_id, movement_type, quantity, technician_id,
    returned_change, returned_damaged, used_quantity, new_installations,
    reference, reason, created_by, created_by_name_legacy, created_at,
    status, accepted_at, accepted_by, accepted_by_name,
    handover_accepted_at, handover_accepted_by, handover_accepted_by_name,
    notes, updated_at, raw_json
  ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    material_id = excluded.material_id,
    movement_type = excluded.movement_type,
    quantity = excluded.quantity,
    technician_id = excluded.technician_id,
    returned_change = excluded.returned_change,
    returned_damaged = excluded.returned_damaged,
    used_quantity = excluded.used_quantity,
    new_installations = excluded.new_installations,
    reference = excluded.reference,
    reason = excluded.reason,
    status = excluded.status,
    accepted_at = excluded.accepted_at,
    accepted_by = excluded.accepted_by,
    accepted_by_name = excluded.accepted_by_name,
    handover_accepted_at = excluded.handover_accepted_at,
    handover_accepted_by = excluded.handover_accepted_by,
    handover_accepted_by_name = excluded.handover_accepted_by_name,
    notes = excluded.notes,
    updated_at = excluded.updated_at,
    raw_json = excluded.raw_json`, [
    movement.id, materialId, text(movement.type || movement.movementType, 'give'),
    Number(movement.quantity) || 0, techId,
    Number(movement.returnedChange || movement.returned_change) || 0,
    Number(movement.returnedDamaged || movement.returned_damaged) || 0,
    Number(movement.usedQuantity || movement.used_quantity) || 0,
    movement.newInstallations || movement.new_installations ? 1 : 0,
    text(movement.reference), text(movement.reason),
    nullableText(movement.createdBy || movement.created_by),
    text(movement.createdByName || movement.created_by_name_legacy),
    movement.at || movement.createdAt || movement.created_at || now,
    text(movement.status, 'pending_receipt'),
    nullableText(movement.acceptedAt || movement.accepted_at),
    nullableText(movement.acceptedBy || movement.accepted_by),
    nullableText(movement.acceptedByName || movement.accepted_by_name),
    nullableText(movement.handoverAcceptedAt || movement.handover_accepted_at),
    nullableText(movement.handoverAcceptedBy || movement.handover_accepted_by),
    nullableText(movement.handoverAcceptedByName || movement.handover_accepted_by_name),
    text(movement.notes), now,
    JSON.stringify(rawMovement)
  ]);
}

async function upsertRoute(env,rec) {
  await run(env, `INSERT INTO routes(id,name,region_legacy) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,region_legacy=excluded.region_legacy`, [rec.id,text(rec.n),text(rec.r)]);
  if (Array.isArray(rec.coords)) {
    await run(env,'DELETE FROM route_points WHERE route_id=?',[rec.id]);
    const stmts=rec.coords.map((p,i)=>env.DB.prepare('INSERT INTO route_points(id,route_id,position,name,lat,lng) VALUES(?,?,?,?,?,?)').bind(generatedId('rp'),rec.id,i,text(p.name),nullableNumber(p.lat),nullableNumber(p.lng)));
    if (stmts.length) await batchChunks(env,stmts);
  }
}

export async function deleteRecord(env,listKey,id) {
  if (listKey !== 'routes') throw new Error('Eliminacion directa no permitida');
  const routeId=nullableText(id);
  if (!routeId) throw new Error('Ruta sin id');
  await run(env,'DELETE FROM route_points WHERE route_id=?',[routeId]);
  await run(env,'DELETE FROM routes WHERE id=?',[routeId]);
  return touchSync(env);
}

async function upsertAudit(env,rec) {
  await run(env, `INSERT INTO audit_log(id,action,at,user_id,by_name_legacy,by_username_legacy,by_role_legacy,target_id,target_name,target_type,raw_json) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET action=excluded.action,at=excluded.at,user_id=excluded.user_id,by_name_legacy=excluded.by_name_legacy,by_username_legacy=excluded.by_username_legacy,by_role_legacy=excluded.by_role_legacy,target_id=excluded.target_id,target_name=excluded.target_name,target_type=excluded.target_type,raw_json=excluded.raw_json`, [rec.id,text(rec.action),text(rec.at),nullableText(rec.byId),text(rec.byName),text(rec.byUsername),text(rec.byRole),text(rec.targetId),text(rec.targetName),text(rec.targetType),JSON.stringify(rec)]);
}

async function upsertTechAccess(env,rec) {
  await run(env, `INSERT INTO tech_access_log(id,technician_id,technician_name_legacy,route_scope,scope_label,at,user_agent,updated_at,raw_json) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET technician_id=excluded.technician_id,technician_name_legacy=excluded.technician_name_legacy,route_scope=excluded.route_scope,scope_label=excluded.scope_label,at=excluded.at,user_agent=excluded.user_agent,updated_at=excluded.updated_at,raw_json=excluded.raw_json`, [rec.id,nullableText(rec.technicianId),text(rec.technicianName),text(rec.routeScope),text(rec.scopeLabel),text(rec.at),text(rec.userAgent),rec.updatedAt??null,JSON.stringify(rec)]);
}

async function upsertDeletionRequest(env,rec) {
  await run(env, `INSERT INTO deletion_requests(id,target_type,target_id,target_name,node_id,detail_id,requested_by,requested_by_name_legacy,status,code,created_at,updated_at,resolved_at,approved_by_name_legacy,rejected_by_name_legacy,completed_by_name_legacy,raw_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
   ON CONFLICT(id) DO UPDATE SET target_type=excluded.target_type,target_id=excluded.target_id,target_name=excluded.target_name,node_id=excluded.node_id,detail_id=excluded.detail_id,requested_by=excluded.requested_by,requested_by_name_legacy=excluded.requested_by_name_legacy,status=excluded.status,code=excluded.code,created_at=excluded.created_at,updated_at=excluded.updated_at,resolved_at=excluded.resolved_at,approved_by_name_legacy=excluded.approved_by_name_legacy,rejected_by_name_legacy=excluded.rejected_by_name_legacy,completed_by_name_legacy=excluded.completed_by_name_legacy,raw_json=excluded.raw_json`, [rec.id,rec.targetType??null,rec.targetId??null,rec.targetName??null,rec.nodeId??null,rec.detailId??null,nullableText(rec.requestedByUserId),rec.requestedByName??null,text(rec.status),rec.code??null,rec.createdAt??null,rec.updatedAt??null,rec.resolvedAt??null,rec.approvedBy??null,rec.rejectedBy??null,rec.completedBy??null,JSON.stringify(rec)]);
}

async function upsertRecordInternal(env,key,rec) {
  if (!rec?.id) throw new Error(`Registro ${key} sin id`);
  switch(key) {
    case 'equipment': return upsertEquipment(env,rec);
    case 'nodes': return upsertNode(env,rec);
    case 'workOrders': return upsertWorkOrder(env,rec);
    case 'users': return upsertUser(env,rec);
    case 'technicians': return upsertTechnician(env,rec);
    case 'materials': return upsertMaterial(env,rec);
    case 'materialMovements': return upsertMaterialMovement(env,rec);
    case 'routes': return upsertRoute(env,rec);
    case 'auditLog': return upsertAudit(env,rec);
    case 'techAccessLog': return upsertTechAccess(env,rec);
    case 'deletionRequests': return upsertDeletionRequest(env,rec);
    default: throw new Error(`Coleccion no soportada: ${key}`);
  }
}

export async function upsertRecord(env,key,rec) {
  if (!LIST_KEYS.has(key)) throw new Error(`Coleccion no permitida: ${key}`);
  await upsertRecordInternal(env,key,rec);
  const now=await touchSync(env);
  return {record:rec,time:now};
}

export async function upsertRecords(env,key,records,{touch=true}={}) {
  if (!LIST_KEYS.has(key)) throw new Error(`Coleccion no permitida: ${key}`);
  for (const rec of Array.isArray(records)?records:[]) await upsertRecordInternal(env,key,rec);
  return touch ? touchSync(env) : null;
}

function planStopSqlRecord(planId,stop,index) {
  return { dbId:`ps-${planId}-${stop.id||index}`, planId, position:index, stop };
}

async function replaceWeekPlanUnsafe(env,weekPlan) {
  const incoming=weekPlan&&typeof weekPlan==='object'?weekPlan:{};
  const planStatements=[];
  const assignmentStatements=[];
  const stopRecords=[];
  const seenPlanIds=new Set();
  const equipmentIds=new Set((await all(env,'SELECT id FROM equipment')).map(row=>row.id));
  const nodeIds=new Set((await all(env,'SELECT id FROM nodes')).map(row=>row.id));
  const workOrderIds=new Set((await all(env,'SELECT id FROM work_orders')).map(row=>row.id));
  for (const [scopeKey,scopeValue] of Object.entries(incoming)) {
    const scope=scopeValue&&typeof scopeValue==='object'?scopeValue:{};
    for (const day of DAY_KEYS) {
      const stops=Array.isArray(scope[day])?scope[day]:[];
      if (!stops.length) continue;
      const planId=`pl-${scopeKey||'blank'}-${day}`;
      if (seenPlanIds.has(planId)) throw new Error(`Plan duplicado: ${planId}`);
      seenPlanIds.add(planId);
      const techExists=scopeKey && scopeKey!=='__shared__' ? await first(env,'SELECT id FROM technicians WHERE id=?',[scopeKey]) : null;
      planStatements.push(env.DB.prepare('INSERT INTO plans(id,name,scope_type,scope_key,day_key,technician_id,status,scheduled_date,created_at,legacy_source) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(planId,`Legacy ${scopeKey} ${day}`,scopeKey==='__shared__'?'shared':'technician',scopeKey,day,techExists?.id||null,'activo',null,null,'weekPlan array'));
      stops.forEach((stop,i)=>stopRecords.push(planStopSqlRecord(planId,stop,i)));
    }
    for (const plan of Array.isArray(scope._generalPlans)?scope._generalPlans:[]) {
      const planId=plan.id||generatedId('gp');
      if (seenPlanIds.has(planId)) throw new Error(`Plan duplicado: ${planId}`);
      seenPlanIds.add(planId);
      const techExists=scopeKey && scopeKey!=='__shared__' ? await first(env,'SELECT id FROM technicians WHERE id=?',[scopeKey]) : null;
      planStatements.push(env.DB.prepare('INSERT INTO plans(id,name,scope_type,scope_key,day_key,technician_id,status,scheduled_date,created_at,legacy_source) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(planId,text(plan.name,'Plan general'),scopeKey==='__shared__'?'shared':'technician',scopeKey,'general',techExists?.id||null,'activo',plan.scheduledDate??null,plan.createdAt??null,'weekPlan _generalPlans'));
      if (plan.assignedTechId) {
        const assignedTech = await first(env,'SELECT id FROM technicians WHERE id=?',[plan.assignedTechId]);
        if (assignedTech?.id) {
          assignmentStatements.push(env.DB.prepare('INSERT INTO plan_assignments(id,plan_id,technician_id,assigned_at) VALUES(?,?,?,?)').bind(`pa-${planId}-${assignedTech.id}`,planId,assignedTech.id,plan.assignedAt??new Date().toISOString()));
        }
      }
      (Array.isArray(plan.stops)?plan.stops:[]).forEach((stop,i)=>stopRecords.push(planStopSqlRecord(planId,stop,i)));
    }
  }
  // La validacion termina antes de borrar el plan vigente. Asi un payload
  // inconsistente no puede dejar la agenda vacia.
  await run(env,'DELETE FROM plans');
  if (planStatements.length) await batchChunks(env,planStatements);
  if (assignmentStatements.length) await batchChunks(env,assignmentStatements);
  const stopStatements=[];
  const linkStatements=[];
  for (const item of stopRecords) {
    const s=item.stop||{};
    const equipmentId=equipmentIds.has(s.equipmentId)?s.equipmentId:null;
    const nodeId=nodeIds.has(s.nodeId)?s.nodeId:null;
    stopStatements.push(env.DB.prepare('INSERT INTO plan_stops(id,plan_id,position,stop_type,equipment_id,node_id,name,lat,lng,notes,site_status,auto_assigned,created_at,raw_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(item.dbId,item.planId,item.position,text(s.type),equipmentId,nodeId,text(s.name),nullableNumber(s.lat),nullableNumber(s.lng),text(s.notes),s.siteStatus??null,s.autoAssigned===undefined?null:boolInt(s.autoAssigned),s.createdAt??null,JSON.stringify(s)));
    (Array.isArray(s.detailIds)?s.detailIds:[]).forEach((workOrderId,i)=>{
      if (workOrderIds.has(workOrderId)) linkStatements.push(env.DB.prepare('INSERT OR IGNORE INTO plan_stop_orders(plan_stop_id,work_order_id,position) VALUES(?,?,?)').bind(item.dbId,workOrderId,i));
    });
  }
  if (stopStatements.length) await batchChunks(env,stopStatements);
  if (linkStatements.length) await batchChunks(env,linkStatements);
}

export async function replaceWeekPlan(env,weekPlan,{touch=true}={}) {
  const previous=await loadWeekPlan(env);
  try {
    await replaceWeekPlanUnsafe(env,weekPlan);
  } catch (error) {
    // D1 no ofrece una transaccion interactiva entre varios lotes. Restauramos
    // el ultimo plan valido si algun lote posterior al DELETE llega a fallar.
    try { await replaceWeekPlanUnsafe(env,previous); }
    catch (restoreError) { console.error('No se pudo restaurar weekPlan',restoreError); }
    throw error;
  }
  return touch ? touchSync(env) : null;
}

export async function deletePlans(env, planIds) {
  const ids = [...new Set(
    (Array.isArray(planIds) ? planIds : [])
      .map(id => text(id).trim())
      .filter(Boolean)
  )];
  if (!ids.length) throw new Error('No se recibieron planes para eliminar');

  const placeholders = ids.map(() => '?').join(',');
  const existing = await all(env, `SELECT id FROM plans WHERE id IN (${placeholders})`, ids);
  const existingIds = existing.map(row => row.id);
  if (!existingIds.length) return {deletedIds:ids,time:await touchSync(env)};

  const marks = existingIds.map(() => '?').join(',');
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM plan_stop_orders WHERE plan_stop_id IN (SELECT id FROM plan_stops WHERE plan_id IN (${marks}))`).bind(...existingIds),
    env.DB.prepare(`DELETE FROM plan_stops WHERE plan_id IN (${marks})`).bind(...existingIds),
    env.DB.prepare(`DELETE FROM plan_assignments WHERE plan_id IN (${marks})`).bind(...existingIds),
    env.DB.prepare(`DELETE FROM plans WHERE id IN (${marks})`).bind(...existingIds)
  ]);

  const remaining = await all(env, `SELECT id FROM plans WHERE id IN (${marks})`, existingIds);
  if (remaining.length) throw new Error('D1 no confirmó la eliminación de todos los planes');
  return {deletedIds:ids,time:await touchSync(env)};
}

export async function applyChanges(env,changes) {
  const touched=[];
  for (const change of Array.isArray(changes)?changes:[]) {
    const key=text(change?.key).trim();
    if (LIST_KEYS.has(key)) {
      const records=Array.isArray(change.records)?change.records:(Array.isArray(change.value)?change.value:[]);
      if (records.length) { await upsertRecords(env,key,records,{touch:false}); touched.push(key); }
    } else if (key==='weekPlan' && change.value && typeof change.value==='object') {
      const current=await loadWeekPlan(env);
      const merged=mergeWeekPlan(current,change.value);
      await replaceWeekPlan(env,merged,{touch:false}); touched.push(key);
    } else if (key==='prepChecked') {
      const current=await getAppSetting(env,'prepChecked',{});
      await setAppSetting(env,'prepChecked',{...(current||{}),...(change.value||{})}); touched.push(key);
    }
  }
  const now=await touchSync(env);
  return {touched:[...new Set(touched)],time:now};
}

function recordTime(item) {
  const fields=['deletedAt','updatedAt','lastActionAt','completedAt','createdAt'];
  return fields.reduce((max,key)=>{ const t=Date.parse(item?.[key]||''); return Number.isFinite(t)?Math.max(max,t):max; },0);
}
function mergeRecords(remote,incoming) {
  const map=new Map((Array.isArray(remote)?remote:[]).filter(x=>x?.id).map(x=>[x.id,clone(x)]));
  for (const item of Array.isArray(incoming)?incoming:[]) {
    if (!item?.id) continue;
    const prev=map.get(item.id);
    if (!prev) map.set(item.id,clone(item));
    else map.set(item.id,recordTime(item)>=recordTime(prev)?{...prev,...clone(item)}:{...clone(item),...prev});
  }
  return [...map.values()];
}

// Para planificación el ORDEN del arreglo entrante es dato de negocio.
// Conservamos ese orden y solo mezclamos campos por id. Los registros remotos
// que no llegaron se anexan al final para no desaparecer cambios concurrentes.
function mergeRecordsKeepIncomingOrder(remote,incoming) {
  const r=Array.isArray(remote)?remote:[];
  const l=Array.isArray(incoming)?incoming:[];
  const remoteById=new Map(r.filter(x=>x?.id).map(x=>[x.id,x]));
  const incomingIds=new Set();
  const out=[];
  for (const item of l) {
    if (!item?.id) continue;
    incomingIds.add(item.id);
    const prev=remoteById.get(item.id);
    if (!prev) out.push(clone(item));
    else out.push(recordTime(item)>=recordTime(prev)?{...clone(prev),...clone(item)}:{...clone(item),...clone(prev)});
  }
  for (const item of r) {
    if (item?.id && !incomingIds.has(item.id)) out.push(clone(item));
  }
  return out;
}
function mergePlanObject(remote,local) {
  const out={...(remote||{}),...(local||{})};
  for (const key of new Set([...Object.keys(remote||{}),...Object.keys(local||{})])) {
    if (key==='_generalPlans') {
      const r=Array.isArray(remote?.[key])?remote[key]:[]; const l=Array.isArray(local?.[key])?local[key]:[];
      const plans=mergeRecordsKeepIncomingOrder(r,l);
      out[key]=plans.map(p=>{ const rp=r.find(x=>x.id===p.id)||{}; const lp=l.find(x=>x.id===p.id)||{}; return {...p,stops:mergeRecordsKeepIncomingOrder(rp.stops,lp.stops)}; });
    } else if (Array.isArray(remote?.[key])||Array.isArray(local?.[key])) out[key]=mergeRecordsKeepIncomingOrder(remote?.[key],local?.[key]);
  }
  return out;
}
function mergeWeekPlan(remote,local) {
  const out={};
  for (const key of new Set([...Object.keys(remote||{}),...Object.keys(local||{})])) out[key]=mergePlanObject(remote?.[key],local?.[key]);
  return out;
}

export async function saveFullState(env,state) {
  for (const key of LIST_KEYS) {
    const records=Array.isArray(state?.[key])?state[key]:[];
    if (records.length) await upsertRecords(env,key,records,{touch:false});
  }
  if (state?.weekPlan && typeof state.weekPlan==='object') {
    const current=await loadWeekPlan(env);
    await replaceWeekPlan(env,mergeWeekPlan(current,state.weekPlan),{touch:false});
  }
  if (state?.prepChecked && typeof state.prepChecked==='object') await setAppSetting(env,'prepChecked',state.prepChecked);
  return touchSync(env);
}

async function findLegacyEvidenceDataUrl(env,workOrderId,index=0) {
  const list=parseJson(await getLegacyAppDataValue(env,'workOrders'),[]);
  const order=Array.isArray(list)?list.find(item=>item?.id===workOrderId):null;
  const report=order?.technicianReport;
  const photos=[];
  if (Array.isArray(report?.evidencePhotos)) photos.push(...report.evidencePhotos.filter(Boolean));
  if (report?.evidencePhoto && !photos.includes(report.evidencePhoto)) photos.push(report.evidencePhoto);
  return photos[index]||'';
}

export async function getEvidenceDataUrl(env,evidenceId) {
  const row=await first(env,'SELECT * FROM work_order_evidence WHERE id=?',[evidenceId]);
  if (!row) return '';
  if (row.storage_type==='inline_data_url') return row.storage_key||'';
  if (row.storage_type==='legacy_app_data') {
    return parseJson(await getLegacyAppDataValue(env,row.storage_key),{})?.dataUrl||'';
  }
  if (row.storage_type==='legacy_work_order_report') {
    const siblings=await all(env,'SELECT id FROM work_order_evidence WHERE work_order_id=? ORDER BY created_at,id',[row.work_order_id]);
    const index=Math.max(0,siblings.findIndex(x=>x.id===row.id));
    return findLegacyEvidenceDataUrl(env,row.work_order_id,index);
  }
  return '';
}

export async function getMaterialPhotoDataUrl(env,photoId) {
  const row=await first(env,'SELECT storage_type,storage_key FROM material_photos WHERE id=?',[photoId]);
  if (!row || row.storage_type!=='inline_data_url') return '';
  return row.storage_key||'';
}

export async function recordWorkOrderReviewExit(env,workOrderId,actor={}) {
  const id=nullableText(workOrderId);
  if(!id)return {recorded:false,reason:'missing_id'};
  const row=await first(env,'SELECT id,status,review_opened_at,follow_ups_json FROM work_orders WHERE id=? AND deleted_at IS NULL',[id]);
  if(!row)return {recorded:false,reason:'not_found'};
  if(row.review_opened_at||['completada','no_realizado','revisado','en_revision'].includes(text(row.status)))return {recorded:false,reason:'decision_completed'};
  const followUps=Array.isArray(parseJson(row.follow_ups_json,[]))?parseJson(row.follow_ups_json,[]):[];
  const actorId=text(actor.id).trim();
  const now=new Date();
  const duplicate=followUps.slice().reverse().find(item=>item?.action==='review_exit_unconfirmed'&&text(item.byId).trim()===actorId&&now.getTime()-new Date(item.at||0).getTime()<60000);
  if(duplicate)return {recorded:true,deduplicated:true};
  followUps.push({id:generatedId('ofu'),action:'review_exit_unconfirmed',label:'Salió sin confirmar la revisión',note:'El administrador salió o recargó la página sin responder si atendería el detalle.',at:now.toISOString(),byId:actorId,byName:text(actor.name||actor.username||'Administrador')});
  await run(env,"UPDATE work_orders SET follow_ups_json=? WHERE id=? AND review_opened_at IS NULL AND COALESCE(status,'pendiente') NOT IN ('completada','no_realizado','revisado','en_revision')",[JSON.stringify(followUps.slice(-50)),id]);
  await touchSync(env);
  return {recorded:true};
}

export async function upsertWorkOrderReport(env,incomingWorkOrder) {
  if (!incomingWorkOrder?.id) throw new Error('Detalle tecnico invalido');
  const exists=await first(env,'SELECT id FROM work_orders WHERE id=?',[incomingWorkOrder.id]);
  if (!exists) throw new Error('No se encontro el detalle en D1');
  const rec=clone(incomingWorkOrder);
  const report=rec.technicianReport&&typeof rec.technicianReport==='object'?rec.technicianReport:null;
  if (!report) { await upsertWorkOrder(env,rec); const time=await touchSync(env); return {record:rec,time}; }
  const photos=[];
  if (Array.isArray(report.evidencePhotos)) photos.push(...report.evidencePhotos.filter(Boolean));
  if (report.evidencePhoto && !photos.includes(report.evidencePhoto)) photos.push(report.evidencePhoto);
  const cleanReport={...report}; delete cleanReport.evidencePhoto; delete cleanReport.evidencePhotos;
  delete rec.technicianReport;
  await upsertWorkOrder(env,rec);
  const reportRow=await first(env,'SELECT id FROM work_order_reports WHERE work_order_id=?',[rec.id]);
  const reportId=reportRow?.id||generatedId('wr');
  const completedTechnician=nullableText(report.completedBy) ? await first(env,'SELECT user_id FROM technicians WHERE id=?',[report.completedBy]) : null;
  const completedDirectUser=!completedTechnician && nullableText(report.completedBy) ? await first(env,'SELECT id FROM users WHERE id=?',[report.completedBy]) : null;
  const completedUserId=completedTechnician?.user_id || completedDirectUser?.id || null;
  await run(env, `INSERT INTO work_order_reports(id,work_order_id,result,solution,material_used,reason,completed_by,completed_by_name_legacy,completed_at,evidence_photo_legacy,raw_json) VALUES(?,?,?,?,?,?,?,?,?,NULL,?)
    ON CONFLICT(work_order_id) DO UPDATE SET result=excluded.result,solution=excluded.solution,material_used=excluded.material_used,reason=excluded.reason,completed_by=excluded.completed_by,completed_by_name_legacy=excluded.completed_by_name_legacy,completed_at=excluded.completed_at,evidence_photo_legacy=NULL,raw_json=excluded.raw_json`, [reportId,rec.id,text(report.result),text(report.solution),text(report.materialUsed),text(report.reason),completedUserId,text(report.completedByName),report.completedAt??null,JSON.stringify(cleanReport)]);
  const existingEvidence = await all(env,'SELECT * FROM work_order_evidence WHERE work_order_id=?',[rec.id]);
  const existingEvidenceById = new Map(existingEvidence.map(item => [item.id, item]));
  await run(env,'DELETE FROM work_order_evidence WHERE work_order_id=?',[rec.id]);
  const stmts=[];
  for (let i=0;i<photos.length;i++) {
    const photo=photos[i];
    if (!photo) continue;
    if (/^\/api\/evidence\//.test(photo)) {
      const id=decodeURIComponent(photo.split('/api/evidence/')[1].split(/[?#]/)[0]);
      const old=existingEvidenceById.get(id) || null;
      if (old) stmts.push(env.DB.prepare('INSERT OR REPLACE INTO work_order_evidence(id,work_order_id,report_id,evidence_type,storage_type,storage_key,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(old.id,rec.id,reportId,'photo',old.storage_type,old.storage_key,old.created_by,old.created_at));
    } else if (/^data:image\//i.test(photo)) {
      stmts.push(env.DB.prepare('INSERT INTO work_order_evidence(id,work_order_id,report_id,evidence_type,storage_type,storage_key,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(generatedId('we'),rec.id,reportId,'photo','inline_data_url',photo,completedUserId,report.completedAt||new Date().toISOString()));
    }
  }
  if (stmts.length) await batchChunks(env,stmts,20);
  const time=await touchSync(env);
  const stateOrder=(await loadWorkOrders(env,{users:await getUserMap(env),audit:null},{id:rec.id}))[0];
  return {record:stateOrder,time};
}

export async function findLoginUser(env,username,password) {
  const row=await first(env, `SELECT u.id,u.name,u.username,u.password_legacy,u.password_hash,u.status,u.active,u.deleted_at,r.code AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE lower(u.username)=lower(?) LIMIT 1`, [username]);
  if (!row || row.deleted_at || row.active===0 || text(row.status,'activo').toLowerCase()==='inactivo') return null;
  const supplied = text(password).trim();
  let valid = row.password_hash ? await verifyPassword(supplied,row.password_hash) : false;
  if (!row.password_hash && text(row.password_legacy).trim()===supplied) {
    valid = true;
    await run(env,'UPDATE users SET password_hash=?,password_legacy=NULL,updated_at=? WHERE id=?',[await hashPassword(supplied),new Date().toISOString(),row.id]);
  }
  if (!valid) return null;
  return {id:row.id,name:row.name,username:row.username,role:normalizeRole(row.role),status:row.status||'activo'};
}

export { LIST_KEYS };


const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
};

const DEFAULT_USERS = [
  { id: 'u-abraham', name: 'Abraham', username: 'abraham', password: 'Abraham@123', role: 'administrador', status: 'activo', zones: ['san_marcos','ayutla','heroes'], notes: 'Administrador principal', createdAt: '2026-06-23T00:00:00.000Z' },
  { id: 'u-brayan', name: 'Brayan', username: 'brayan', password: 'Brayan@123', role: 'administrador', status: 'activo', zones: ['san_marcos','huitzuco'], notes: 'Administrador', createdAt: '2026-06-23T00:00:00.000Z' },
  { id: 'u-atencion', name: 'Atención a clientes', username: 'atencion', password: 'Atencion@123', role: 'atencion_clientes', status: 'activo', zones: ['san_marcos','ayutla'], notes: 'Captura de nodos y órdenes', createdAt: '2026-06-23T00:00:00.000Z' }
];

const DEFAULT_KEYS = {
  equipment: [],
  nodes: [],
  workOrders: [],
  technicians: [],
  users: DEFAULT_USERS,
  techAccessLog: [],
  deletionRequests: [],
  auditLog: [],
  materials: [],
  routes: [],
  weekPlan: {},
  prepChecked: {},
  syncMeta: {}
};

const LIST_CHANGE_KEYS = [
  'equipment',
  'nodes',
  'workOrders',
  'technicians',
  'users',
  'techAccessLog',
  'deletionRequests',
  'auditLog',
  'materials',
  'routes'
];

const RECORD_PREFIX_BY_KEY = {
  equipment: 'equipment',
  nodes: 'node',
  workOrders: 'workOrder',
  technicians: 'technician',
  users: 'user',
  techAccessLog: 'techAccess',
  deletionRequests: 'deletionRequest',
  auditLog: 'audit',
  materials: 'material',
  routes: 'route'
};

const EVIDENCE_PREFIX = 'evidence:';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch (e) { return fallback; }
}

async function ensureTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS app_data (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '[]',
      updated_at DATETIME DEFAULT (datetime('now'))
    )
  `).run();
}

async function getAppData(env, key, fallbackValue) {
  const fallback = fallbackValue ?? DEFAULT_KEYS[key] ?? [];
  const row = await env.DB.prepare('SELECT value FROM app_data WHERE key = ?').bind(key).first();
  return safeJsonParse(row?.value, fallback);
}

async function setAppData(env, key, value) {
  await env.DB.prepare(
    `INSERT INTO app_data (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  ).bind(key, JSON.stringify(value)).run();
}

// Batch write: guarda múltiples claves en paralelo usando D1 batch()
async function batchSetAppData(env, entries) {
  if (!entries || !entries.length) return;
  const stmt = `INSERT INTO app_data (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`;
  const statements = entries.map(([key, value]) =>
    env.DB.prepare(stmt).bind(key, JSON.stringify(value))
  );
  await env.DB.batch(statements);
}

function isEvidenceKey(key) {
  return String(key || '').startsWith(EVIDENCE_PREFIX);
}

function isDataUrl(value) {
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(String(value || ''));
}

function evidenceUrl(id) {
  return `/api/evidence/${encodeURIComponent(id)}`;
}

function evidenceIdFromUrl(value) {
  const raw = String(value || '');
  const match = raw.match(/\/api\/evidence\/([^?#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function saveEvidencePhoto(env, workOrderId, value) {
  const existingId = evidenceIdFromUrl(value);
  if (existingId) return evidenceUrl(existingId);
  if (!isDataUrl(value)) return value;
  const id = `${workOrderId}-${crypto.randomUUID()}`;
  await setAppData(env, `${EVIDENCE_PREFIX}${id}`, {
    id,
    dataUrl: value,
    createdAt: new Date().toISOString()
  });
  return evidenceUrl(id);
}

async function normalizeReportEvidence(env, workOrder) {
  const report = workOrder?.technicianReport;
  if (!report || typeof report !== 'object') return workOrder;
  const photos = [];
  if (Array.isArray(report.evidencePhotos)) photos.push(...report.evidencePhotos.filter(Boolean));
  if (report.evidencePhoto && !photos.includes(report.evidencePhoto)) photos.push(report.evidencePhoto);
  const savedPhotos = [];
  for (const photo of photos) {
    const saved = await saveEvidencePhoto(env, workOrder.id, photo);
    if (saved && !savedPhotos.includes(saved)) savedPhotos.push(saved);
  }
  workOrder.technicianReport = {
    ...report,
    evidencePhoto: savedPhotos[0] || '',
    evidencePhotos: savedPhotos
  };
  return workOrder;
}

function dataUrlToImageResponse(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return json({ ok: false, error: 'Evidencia invalida' }, 404);
  const bytes = Uint8Array.from(atob(match[2]), ch => ch.charCodeAt(0));
  return new Response(bytes, {
    headers: {
      ...CORS,
      'Content-Type': match[1],
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}

function cloneData(value) {
  try { return JSON.parse(JSON.stringify(value || {})); } catch (e) { return {}; }
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function coordKey(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(6) : '';
}

function recordKey(item, fallbackPrefix = 'item') {
  if (!item || typeof item !== 'object') return '';
  if (item.id) return String(item.id);
  return [
    fallbackPrefix,
    normalizeText(item.name || item.n || item.title || item.nodeCode || item.username || ''),
    normalizeText(item.town || item.equipmentId || item.nodeId || ''),
    item.createdAt || '',
    coordKey(item.lat),
    coordKey(item.lng)
  ].join('|');
}

function getRecordUpdatedAt(item) {
  if (!item || typeof item !== 'object') return 0;
  const dates = [
    item.deletedAt,
    item.archivedAt,
    item.updatedAt,
    item.resolvedAt,
    item.assignedAt,
    item.lastActionAt,
    item.completedAt,
    item.finishedAt,
    item.technicianReport?.completedAt,
    item.startedAt,
    item.createdAt
  ];
  return dates.reduce((latest, value) => {
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? Math.max(latest, time) : latest;
  }, 0);
}

function mergeRecordVersions(current, incoming) {
  const prev = current && typeof current === 'object' ? current : {};
  const next = incoming && typeof incoming === 'object' ? incoming : {};
  
  const prevTechTime = prev.technicianReport?.completedAt ? new Date(prev.technicianReport.completedAt).getTime() : 0;
  const nextTechTime = next.technicianReport?.completedAt ? new Date(next.technicianReport.completedAt).getTime() : 0;
  
  const incomingHasNewReport = next.technicianReport && !prev.technicianReport;
  const incomingHasNewerReport = nextTechTime > prevTechTime;
  
  const nextIsNewer = incomingHasNewReport || incomingHasNewerReport || (getRecordUpdatedAt(next) > getRecordUpdatedAt(prev));
  
  const merged = nextIsNewer ? { ...prev, ...next } : { ...next, ...prev };
  
  if (prev.deletedAt || next.deletedAt) merged.deletedAt = prev.deletedAt || next.deletedAt;
  if (prev.archivedAt || next.archivedAt) merged.archivedAt = prev.archivedAt || next.archivedAt;
  
  // Preservar reporte del tecnico: si el remoto ya tiene reporte y el incoming no, mantener el remoto
  if (prev.technicianReport && !next.technicianReport) {
    merged.technicianReport = prev.technicianReport;
    // Si estamos restaurando el reporte, también debemos restaurar el status para no dejarlo inconsistente
    if (prev.status === 'completada' || prev.status === 'no_realizado') {
      merged.status = prev.status;
      merged.completedAt = prev.completedAt;
    }
  }
  
  return merged;
}

function mergeRecords(remoteList, incomingList, fallbackPrefix) {
  const byKey = new Map();
  const order = [];
  const add = item => {
    if (!item || typeof item !== 'object') return;
    const copy = cloneData(item);
    const key = recordKey(copy, fallbackPrefix) || `${fallbackPrefix}|${byKey.size}`;
    if (!order.includes(key)) order.push(key);
    if (!byKey.has(key)) {
      byKey.set(key, copy);
      return;
    }
    const prev = byKey.get(key);
    byKey.set(key, mergeRecordVersions(prev, copy));
  };
  (Array.isArray(remoteList) ? remoteList : []).forEach(add);
  (Array.isArray(incomingList) ? incomingList : []).forEach(add);
  return order.map(key => byKey.get(key)).filter(Boolean);
}

// Garantiza que registros remotos sin deletedAt no desaparezcan del resultado final
function safePreserveRemote(mergedList, remoteList, fallbackPrefix) {
  if (!Array.isArray(remoteList) || !remoteList.length) return mergedList;
  const mergedKeys = new Set((mergedList || []).map(item => recordKey(item, fallbackPrefix)));
  const preserved = (remoteList || []).filter(item => {
    if (!item || item.deletedAt) return false;
    const key = recordKey(item, fallbackPrefix);
    return key && !mergedKeys.has(key);
  });
  return preserved.length ? [...(mergedList || []), ...preserved] : (mergedList || []);
}

function mergeGeneralPlans(remotePlans, incomingPlans) {
  const merged = mergeRecords(remotePlans, incomingPlans, 'generalPlan');
  return merged.map(plan => {
    const key = recordKey(plan, 'generalPlan');
    const remote = (remotePlans || []).find(item => recordKey(item, 'generalPlan') === key) || {};
    const incoming = (incomingPlans || []).find(item => recordKey(item, 'generalPlan') === key) || {};
    const stops = plan.deletedAt ? (incoming.stops || remote.stops || []) : mergeRecords(remote.stops, incoming.stops, 'planStop');
    return { ...plan, stops };
  });
}

function mergePlanObject(remotePlan, incomingPlan) {
  const remote = remotePlan && typeof remotePlan === 'object' ? remotePlan : {};
  const incoming = incomingPlan && typeof incomingPlan === 'object' ? incomingPlan : {};
  const out = mergeRecordVersions(cloneData(remote), cloneData(incoming));
  const keys = new Set([...Object.keys(remote), ...Object.keys(incoming)]);
  keys.forEach(key => {
    if (key === '_generalPlans') {
      out._generalPlans = mergeGeneralPlans(remote._generalPlans, incoming._generalPlans);
      return;
    }
    if (Array.isArray(remote[key]) || Array.isArray(incoming[key])) {
      out[key] = mergeRecords(remote[key], incoming[key], 'planStop');
    }
  });
  return out;
}

function mergeWeekPlan(remoteWeekPlan, incomingWeekPlan) {
  const remote = remoteWeekPlan && typeof remoteWeekPlan === 'object' ? remoteWeekPlan : {};
  const incoming = incomingWeekPlan && typeof incomingWeekPlan === 'object' ? incomingWeekPlan : {};
  const out = {};
  new Set([...Object.keys(remote), ...Object.keys(incoming)]).forEach(id => {
    out[id] = mergePlanObject(remote[id], incoming[id]);
  });
  return out;
}

async function getAllAppData(env) {
  await ensureDefaults(env);
  const result = await env.DB.prepare('SELECT key, value FROM app_data').all();
  const data = {};
  for (const row of result.results || []) {
    if (!(row.key in DEFAULT_KEYS)) continue;
    data[row.key] = safeJsonParse(row.value, row.value);
  }
  return data;
}

function mergeIncomingState(remote, incoming) {
  const r = remote || {};
  const inc = incoming || {};
  // Para cada lista: merge primero, luego preservar remotos que no aparecieron en el resultado
  const mergeAndPreserve = (key, prefix) => {
    const merged = mergeRecords(r[key], inc[key], prefix);
    return safePreserveRemote(merged, r[key], prefix);
  };
  return {
    equipment:        mergeAndPreserve('equipment',        'equipment'),
    nodes:            mergeAndPreserve('nodes',            'node'),
    workOrders:       mergeAndPreserve('workOrders',       'workOrder'),
    technicians:      mergeAndPreserve('technicians',      'technician'),
    users:            mergeAndPreserve('users',            'user'),
    techAccessLog:    mergeAndPreserve('techAccessLog',    'techAccess'),
    deletionRequests: mergeAndPreserve('deletionRequests', 'deletionRequest'),
    auditLog:         mergeAndPreserve('auditLog',         'audit'),
    materials:        mergeAndPreserve('materials',        'material'),
    routes:           mergeAndPreserve('routes',           'route'),
    weekPlan:    mergeWeekPlan(r.weekPlan, inc.weekPlan),
    prepChecked: { ...(r.prepChecked || {}), ...(inc.prepChecked || {}) },
    syncMeta:    { updatedAt: new Date().toISOString() }
  };
}


function mergeIncomingChanges(remote, changes) {
  const merged = cloneData(remote);
  const touched = new Set();

  for (const change of Array.isArray(changes) ? changes : []) {
    if (!change || typeof change !== 'object') continue;
    const key = String(change.key || '').trim();
    if (!key || !(key in DEFAULT_KEYS)) continue;

    if (LIST_CHANGE_KEYS.includes(key)) {
      const records = Array.isArray(change.records)
        ? change.records
        : (Array.isArray(change.value) ? change.value : []);
      if (!records.length) continue;
      merged[key] = mergeRecords(merged[key], records, RECORD_PREFIX_BY_KEY[key] || key);
      touched.add(key);
      continue;
    }

    if (key === 'weekPlan') {
      const value = change.value && typeof change.value === 'object' ? change.value : {};
      if (!Object.keys(value).length) continue;
      merged.weekPlan = mergeWeekPlan(merged.weekPlan, value);
      touched.add(key);
      continue;
    }

    if (key === 'prepChecked') {
      const value = change.value && typeof change.value === 'object' ? change.value : {};
      if (!Object.keys(value).length) continue;
      merged.prepChecked = { ...(merged.prepChecked || {}), ...value };
      touched.add(key);
    }
  }

  merged.syncMeta = { updatedAt: new Date().toISOString() };
  touched.add('syncMeta');
  return { merged, touched: [...touched] };
}

async function saveWorkOrderReport(env, incomingWorkOrder) {
  if (!incomingWorkOrder || typeof incomingWorkOrder !== 'object' || !incomingWorkOrder.id) {
    throw new Error('Detalle tecnico invalido');
  }
  const cleanIncoming = await normalizeReportEvidence(env, cloneData(incomingWorkOrder));
  const current = await getAppData(env, 'workOrders', []);
  const list = Array.isArray(current) ? current : [];
  const index = list.findIndex(item => item && item.id === cleanIncoming.id);
  if (index < 0) throw new Error('No se encontro el detalle en D1');

  const previous = list[index] || {};
  const next = mergeRecordVersions(previous, cleanIncoming);
  list[index] = next;
  await setAppData(env, 'workOrders', list);
  await setAppData(env, 'syncMeta', { updatedAt: new Date().toISOString() });
  return next;
}

async function ensureDefaults(env) {
  await ensureTable(env);
  // Insertar todas las claves por defecto en batch (solo si no existen)
  const defaultStatements = Object.entries(DEFAULT_KEYS).map(([key, value]) =>
    env.DB.prepare(
      `INSERT OR IGNORE INTO app_data (key, value, updated_at) VALUES (?, ?, datetime('now'))`
    ).bind(key, JSON.stringify(value))
  );
  await env.DB.batch(defaultStatements);

  const users = await getAppData(env, 'users', []);
  const list = Array.isArray(users) ? users : [];
  let changed = false;
  for (const defaultUser of DEFAULT_USERS) {
    const exists = list.some(user =>
      String(user?.username || '').trim().toLowerCase() === defaultUser.username
    );
    if (!exists) {
      list.push(defaultUser);
      changed = true;
    }
  }
  if (changed || !Array.isArray(users) || users.length === 0) {
    await setAppData(env, 'users', list);
  }
}

function cleanUserForSession(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: normalizeRole(user.role || 'tecnico'),
    status: user.status || 'activo'
  };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const isApiRequest = url.pathname.startsWith('/api/');

    if (!isApiRequest) {
      if (env.ASSETS) {
        const assetResponse = await env.ASSETS.fetch(request);
        const headers = new Headers(assetResponse.headers);
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        headers.set('Pragma', 'no-cache');
        return new Response(assetResponse.body, {
          status: assetResponse.status,
          statusText: assetResponse.statusText,
          headers
        });
      }
      return json({ error: 'Ruta no encontrada' }, 404);
    }

    try {
      await ensureDefaults(env);
    } catch (err) {
      return json({ success: false, error: `D1 no disponible: ${err.message}` }, 500);
    }

    if (request.method === 'POST' && url.pathname === '/api/login') {
      try {
        const body = await request.json();
        const username = String(body.username || '').trim().toLowerCase();
        const password = String(body.password || '').trim();
        const users = await getAppData(env, 'users', DEFAULT_USERS);
        const found = (Array.isArray(users) ? users : []).find(user =>
          !user.deletedAt &&
          String(user.username || '').trim().toLowerCase() === username &&
          String(user.password || '').trim() === password &&
          String(user.status || 'activo').toLowerCase() !== 'inactivo'
        );

        if (found) {
          return json({
            success: true,
            token: crypto.randomUUID(),
            user: cleanUserForSession(found)
          });
        }

        const adminUser = String(env.ADMIN_USER || 'admin').trim().toLowerCase();
        const adminPass = String(env.ADMIN_PASS || 'admin').trim();
        if (username === adminUser && password === adminPass) {
          return json({
            success: true,
            token: crypto.randomUUID(),
            user: { id: 'env-admin', name: env.ADMIN_NAME || 'Administrador', username: env.ADMIN_USER || 'admin', role: 'administrador', status: 'activo' }
          });
        }

        return json({ success: false, message: 'Usuario o contraseña incorrectos' }, 401);
      } catch (err) {
        return json({ success: false, message: err.message }, 400);
      }
    }

    if (request.method === 'GET' && url.pathname === '/api/data') {
      try {
        const result = await env.DB.prepare('SELECT key, value, updated_at FROM app_data').all();
        const data = {};
        for (const row of result.results || []) {
          if (!(row.key in DEFAULT_KEYS) && row.key !== 'debug_log') continue;
          data[row.key] = safeJsonParse(row.value, row.value);
        }
        data.__serverTime = new Date().toISOString();
        if (data.debug_log) {
            data.syncMeta = data.syncMeta || {};
            data.syncMeta.debug = data.debug_log;
        }
        return json(data);
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    if (request.method === 'GET' && url.pathname === '/api/sync-meta') {
      try {
        const row = await env.DB.prepare(
          `SELECT value, updated_at FROM app_data WHERE key = 'syncMeta'`
        ).first();
        const meta = safeJsonParse(row?.value, {});
        return json({
          ok: true,
          updatedAt: meta.updatedAt || row?.updated_at || '',
          serverTime: new Date().toISOString()
        });
      } catch (err) {
        return json({ ok: false, error: err.message }, 500);
      }
    }

    if (request.method === 'GET' && url.pathname.startsWith('/api/evidence/')) {
      try {
        const id = decodeURIComponent(url.pathname.replace('/api/evidence/', ''));
        const evidence = await getAppData(env, `${EVIDENCE_PREFIX}${id}`, null);
        if (!evidence?.dataUrl) return json({ ok: false, error: 'Evidencia no encontrada' }, 404);
        return dataUrlToImageResponse(evidence.dataUrl);
      } catch (err) {
        return json({ ok: false, error: err.message }, 500);
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/data') {
      try {
        const body = await request.json();
        const current = await getAllAppData(env);
        const merged = mergeIncomingState(current, body || {});
        // Usar batch write para todas las claves en paralelo
        const entries = Object.keys(DEFAULT_KEYS)
          .filter(key => merged[key] !== undefined)
          .map(key => [key, merged[key]]);
        await batchSetAppData(env, entries);
        return json({ ok: true, time: new Date().toISOString() });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // Endpoint rápido: actualiza un único registro de una lista por ID
    if (request.method === 'POST' && url.pathname === '/api/record') {
      try {
        const body = await request.json();
        const listKey = String(body?.listKey || '').trim();
        const record = body?.record;
        if (!listKey || !LIST_CHANGE_KEYS.includes(listKey) || !record || typeof record !== 'object') {
          return json({ ok: false, error: 'Parametros invalidos' }, 400);
        }
        const list = await getAppData(env, listKey, []);
        const arr = Array.isArray(list) ? list : [];
        const prefix = RECORD_PREFIX_BY_KEY[listKey] || listKey;
        const recKey = record.id ? String(record.id) : null;
        if (!recKey) return json({ ok: false, error: 'Registro sin id' }, 400);
        const idx = arr.findIndex(item => item && (item.id === recKey));
        if (idx >= 0) {
          arr[idx] = mergeRecordVersions(arr[idx], record);
        } else {
          arr.push(record);
        }
        const now = new Date().toISOString();
        await batchSetAppData(env, [
          [listKey, arr],
          ['syncMeta', { updatedAt: now }]
        ]);
        return json({ ok: true, time: now, record: idx >= 0 ? arr[idx] : arr[arr.length - 1] });
      } catch (err) {
        return json({ ok: false, error: err.message }, 500);
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/work-order-report') {
      try {
        const body = await request.json();
        const saved = await saveWorkOrderReport(env, body?.workOrder);
        return json({ ok: true, time: new Date().toISOString(), workOrder: saved });
      } catch (err) {
        return json({ ok: false, error: err.message }, 500);
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/changes') {
      try {
        const body = await request.json();
        const current = await getAllAppData(env);
        const { merged, touched } = mergeIncomingChanges(current, body?.changes || []);
        
        if (!touched.length) {
          return json({ ok: true, time: new Date().toISOString(), touched: [] });
        }

        // Batch write solo las claves tocadas
        const entries = touched
          .filter(key => merged[key] !== undefined)
          .map(key => [key, merged[key]]);
        await batchSetAppData(env, entries);
        
        return json({ ok: true, time: new Date().toISOString(), touched });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    if (url.pathname === '/api/ping') {
      return json({ ok: true, time: new Date().toISOString() });
    }

    return json({ error: 'Ruta no encontrada' }, 404);
  }
};

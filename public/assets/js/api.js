// ==========================================
// assets/js/api.js
// Contiene: state, loadDB, saveDB, helpers y funciones compartidas
// ==========================================

function getDefaultApiBase() {
    const host = location.hostname.replace(/\.+$/, '');
    const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    const isFile = location.protocol === 'file:' || !host;
    return isLocalHost ? location.origin : (isFile ? (localStorage.getItem('netops_api_url') || 'https://netops-api.asistencias.workers.dev') : '');
}

var API = window.API || getDefaultApiBase();
window.API = API;

// ==================== ESTADO GLOBAL ====================
let state = {
    equipment: [],
    nodes: [],
    workOrders: [],
    technicians: [],
    users: [],
    techAccessLog: [],
    deletionRequests: [],
    auditLog: [],
    materials: [],
    materialMovements: [],
    weekPlan: {},
    routes: [],
    prepChecked: {},
    syncMeta: {}
};
let syncTimer = null;
let syncWakeTimer = null;
let syncBusy = false;
let saveQueue = Promise.resolve();
let lastCloudFingerprint = '';
let lastSyncToken = '';
let syncListenersBound = false;
let lastVersionCheckAt = 0;
const APP_VERSION = '20260708-relational-savefix1';
let syncFailCount = 0;
let lastLocalSaveAt = 0;
const BACKUP_KEY = 'netops_backup';
const LAST_GOOD_STATE_KEY = 'netops_last_good_state_v1';
const PENDING_CHANGES_KEY = 'netops_pending_changes_v1';
const LIST_DATA_KEYS = ['equipment', 'nodes', 'workOrders', 'technicians', 'users', 'techAccessLog', 'deletionRequests', 'auditLog', 'materials', 'materialMovements', 'routes'];
const OBJECT_DATA_KEYS = ['weekPlan', 'prepChecked'];
const DATA_PARTS_BY_PAGE = {
    'antenas.html': ['equipment'],
    'nodos.html': ['nodes'],
    'ordenes.html': ['operations'],
    'mapa.html': ['equipment', 'nodes'],
    'planificar.html': ['people', 'materials', 'planning'],
    'tecnico-ruta.html': ['people', 'materials', 'planning'],
    'material.html': ['materials'],
    'rutas.html': ['routes'],
    'tecnicos.html': ['people'],
    'dashboard.html': ['operations', 'people'],
    'historial.html': ['audit']
};
const ALL_DATA_PARTS = ['equipment', 'nodes', 'materials', 'routes', 'operations', 'people', 'activity', 'audit', 'planning'];
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
    materialMovements: 'mm',
    routes: 'route'
};

let loadingTimer = null;
let loadingOperationId = 0;
const loadingOperations = new Set();

function ensureLoadingOverlay() {
    let overlay = document.getElementById('netops-loading');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'netops-loading';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-card">
                <div class="loading-brand"><span class="loading-ring"></span><img src="assets/brand/wifimex-logo.jpg" alt="WiFiMex"></div>
                <div class="loading-copy"><strong id="netops-loading-title">Esperando...</strong><span id="netops-loading-sub">Sincronizando información con la nube.</span><i class="loading-progress"></i></div>
            </div>`;
        document.body.appendChild(overlay);
    }
    return overlay;
}

function showLoading(title = 'Esperando...', subtitle = 'Sincronizando informacion con la nube.') {
    if (!document.body) return;
    const overlay = ensureLoadingOverlay();
    const titleEl = document.getElementById('netops-loading-title');
    const subEl = document.getElementById('netops-loading-sub');
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = subtitle;
    overlay.classList.add('show');
}

function hideLoading() {
    clearTimeout(loadingTimer);
    loadingTimer = null;
    const overlay = document.getElementById('netops-loading');
    if (overlay) overlay.classList.remove('show');
}

function delayedLoading(title, subtitle, delay = 500) {
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => showLoading(title, subtitle), delay);
}

function stopDelayedLoading() {
    clearTimeout(loadingTimer);
    loadingTimer = null;
    hideLoading();
}

function beginLoadingOperation(title, subtitle, delay = 180) {
    const operationId = ++loadingOperationId;
    loadingOperations.add(operationId);
    const overlay = document.getElementById('netops-loading');
    if (overlay?.classList.contains('show')) showLoading(title, subtitle);
    else delayedLoading(title, subtitle, delay);
    return operationId;
}

function endLoadingOperation(operationId) {
    if (operationId) loadingOperations.delete(operationId);
    if (!loadingOperations.size) stopDelayedLoading();
}

function ensureSyncStatusIndicator() {
    return;
}

function setSyncStatus(text, mode = 'ok') {
    ensureSyncStatusIndicator();
    const pills = document.querySelectorAll('[data-sync-status]');
    pills.forEach(pill => {
        pill.textContent = text;
        pill.className = `sync-pill ${mode}`;
    });
}

function setCloudOfflineStatus(text = 'Sin conexion') {
    syncFailCount++;
    if (syncFailCount >= 3 || isLocalDirty()) setSyncStatus(text, isLocalDirty() ? 'warn' : 'err');
}

function clearCloudOfflineStatus() {
    syncFailCount = 0;
}

function hasRemoteContent(data) {
    if (!data || typeof data !== 'object') return false;
    const keys = ['equipment', 'nodes', 'workOrders', 'users', 'routes', 'technicians', 'deletionRequests', 'auditLog'];
    return keys.some(key => Array.isArray(data[key]) && data[key].length > 0);
}

function getMapEntityDetailStats(type, id) {
    const field = type === 'node' ? 'nodeId' : 'equipmentId';
    const collection = type === 'node' ? state.nodes : state.equipment;
    const entity = (collection || []).find(item => item && item.id === id);
    if (Number.isFinite(Number(entity?.mapDetailTotal)) && Number.isFinite(Number(entity?.mapDetailResolved))) {
        const total = Number(entity.mapDetailTotal) || 0;
        const resolved = Number(entity.mapDetailResolved) || 0;
        return { total, resolved, pending:Math.max(0, total - resolved) };
    }
    const details = (state.workOrders || []).filter(detail => detail && !detail.deletedAt && detail[field] === id);
    const resolved = details.filter(detail => detail.status === 'completada' || detail.status === 'no_realizado').length;
    return { total:details.length, resolved, pending:Math.max(0, details.length - resolved) };
}

function renderMapEntityDetailStats(type, id) {
    const stats = getMapEntityDetailStats(type, id);
    return `<div class="map-detail-stats"><strong>${stats.total}<small>detalles</small></strong><span class="pending">${stats.pending} pendientes</span><span class="resolved">${stats.resolved} resueltos</span></div>`;
}

function getMapStopDetailStats(stop) {
    const ids = new Set(Array.isArray(stop?.detailIds) ? stop.detailIds : []);
    const details = (state.workOrders || []).filter(detail => detail && !detail.deletedAt && ids.has(detail.id));
    const resolved = details.filter(detail => detail.status === 'completada' || detail.status === 'no_realizado').length;
    return { total:details.length, resolved, pending:Math.max(0, details.length - resolved) };
}

function renderMapStopDetailStats(stop) {
    const stats = getMapStopDetailStats(stop);
    return `<div class="map-detail-stats"><strong>${stats.total}<small>detalles</small></strong><span class="pending">${stats.pending} pendientes</span><span class="resolved">${stats.resolved} resueltos</span></div>`;
}

function markLocalDirty() {
    localStorage.setItem('netops_dirty', '1');
}

function clearLocalDirty() {
    localStorage.removeItem('netops_dirty');
}

function isLocalDirty() {
    return localStorage.getItem('netops_dirty') === '1';
}

function hasPendingLocalChanges() {
    return isLocalDirty() || getPendingChanges().length > 0;
}

function createApiError(response, data = {}, context = 'operacion') {
    if (response.status === 401 && !/\/api\/login(?:\?|$)/.test(response.url || '')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.netopsSessionRedirecting) {
            window.netopsSessionRedirecting = true;
            setTimeout(() => { window.location.href = 'login.html?session=expired'; }, 0);
        }
    }
    const error = new Error(data.error || data.message || `El servidor rechazo ${context} (HTTP ${response.status})`);
    error.syncType = data.errorType || (response.status >= 500 ? 'SERVIDOR' : 'DATOS_INVALIDOS');
    error.syncCode = data.errorCode || `HTTP_${response.status}`;
    error.requestId = data.requestId || response.headers?.get?.('cf-ray') || '';
    error.httpStatus = response.status;
    return error;
}

function describeSyncError(error) {
    const detail = String(error?.message || error || 'Error desconocido');
    let type = error?.syncType || '';
    if (!navigator.onLine) type = 'CONEXION';
    else if (error?.name === 'AbortError' || /tiempo de espera|timeout|aborted/i.test(detail)) type = 'TIEMPO_DE_ESPERA';
    else if (!type && (error instanceof TypeError || /failed to fetch|networkerror|network request/i.test(detail))) type = 'CONEXION';
    else if (!type) type = 'SERVIDOR';
    const labels = {
        CONEXION: 'Error de conexion',
        TIEMPO_DE_ESPERA: 'Tiempo de espera agotado',
        SERVIDOR: 'Error del servidor',
        BASE_DE_DATOS: 'Error de base de datos D1',
        DATOS_INVALIDOS: 'Datos invalidos'
    };
    const reference = error?.requestId ? ` Referencia: ${error.requestId}.` : '';
    return `${labels[type] || 'Error de sincronizacion'}: ${detail}.${reference}`.replace('..', '.');
}

function restoreLastConfirmedState() {
    if (!_previousStateSaved || typeof _previousStateSaved !== 'object') return false;
    applyStateData(cloneData(_previousStateSaved));
    localStorage.removeItem(PENDING_CHANGES_KEY);
    clearLocalDirty();
    if (typeof renderAfterSync === 'function') renderAfterSync();
    return true;
}

function blockMutationsFor(error) {
    window.netopsMutationsBlocked = true;
    window.netopsLastSyncError = describeSyncError(error);
}

function allowMutations() {
    window.netopsMutationsBlocked = false;
    window.netopsLastSyncError = '';
}

function rejectBlockedMutation() {
    if (!window.netopsMutationsBlocked) return false;
    restoreLastConfirmedState();
    if (typeof notify === 'function') {
        notify(`${window.netopsLastSyncError || 'Sin sincronizacion confirmada.'} No se ejecuto el cambio.`, 'err');
    }
    return true;
}

async function postStateToCloud() {
    // Timeout de 30s para conexiones lentas
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 30000);
    try {
        const res = await fetch(`${API}/api/data`, {
            method: 'POST',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state),
            signal: ctrl.signal
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok !== true) throw createApiError(res, data, 'el guardado general');
        lastCloudFingerprint = getDataFingerprint(state);
        lastSyncToken = data.time || getSyncTokenFromState(state) || lastSyncToken;
        return data;
    } finally {
        clearTimeout(tid);
    }
}

async function postChangesToCloud(changes) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 30000);
    try {
        const res = await fetch(`${API}/api/changes`, {
            method: 'POST',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ changes: Array.isArray(changes) ? changes : [] }),
            signal: ctrl.signal
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok !== true) throw createApiError(res, data, 'el guardado de cambios');
        lastCloudFingerprint = getDataFingerprint(state);
        lastSyncToken = data.time || getSyncTokenFromState(state) || lastSyncToken;
        return data;
    } finally {
        clearTimeout(tid);
    }
}

// Guarda un único registro via /api/record (el endpoint más rápido)
async function deletePlansFromCloud(ids) {
    const planIds = [...new Set(
        (Array.isArray(ids) ? ids : [])
            .map(id => String(id || '').trim())
            .filter(Boolean)
    )];
    if (!planIds.length) throw new Error('No se recibieron planes para eliminar');

    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 30000);
    try {
        const res = await fetch(`${API}/api/plans/delete`, {
            method: 'POST',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: planIds }),
            signal: ctrl.signal
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok !== true) throw createApiError(res, data, 'la eliminacion de planes');

        const confirmed = new Set(Array.isArray(data.deletedIds) ? data.deletedIds : []);
        const missing = planIds.filter(id => !confirmed.has(id));
        if (missing.length) throw new Error(`D1 no confirmó la eliminación de ${missing.length} plan(es)`);
        lastSyncToken = data.time || lastSyncToken;
        return data;
    } finally {
        clearTimeout(tid);
    }
}

async function postRecordToCloud(listKey, record) {
    if (!listKey || !record?.id) throw new Error('listKey o record.id faltante');
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 30000);
    try {
        const res = await fetch(`${API}/api/record`, {
            method: 'POST',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ listKey, record }),
            signal: ctrl.signal
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok !== true) throw createApiError(res, data, 'el registro');
        lastCloudFingerprint = getDataFingerprint(state);
        lastSyncToken = data.time || lastSyncToken;
        return data;
    } finally {
        clearTimeout(tid);
    }
}

async function postWorkOrderReportToCloud(workOrder) {
    if (!workOrder?.id) throw new Error('Reporte sin id de detalle');
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 30000);
    try {
        const res = await fetch(`${API}/api/work-order-report`, {
            method: 'POST',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workOrder }),
            signal: ctrl.signal
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok !== true) throw createApiError(res, data, 'el reporte tecnico');
        lastCloudFingerprint = getDataFingerprint(state);
        lastSyncToken = data.time || lastSyncToken;
        return data;
    } finally {
        clearTimeout(tid);
    }
}

async function fetchRemoteSyncMeta(timeoutMs = 5000) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(`${API}/api/sync-meta?t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
            signal: ctrl.signal
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok !== true) throw createApiError(res, data, 'la consulta de sincronizacion');
        return data;
    } finally {
        clearTimeout(tid);
    }
}

async function fetchDataPage(part, params = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), Math.max(5000, Number(timeoutMs) || 10000));
    try {
        const query = new URLSearchParams({ part:String(part || ''), paged:'1', t:String(Date.now()) });
        Object.entries(params || {}).forEach(([key,value]) => {
            if (value !== undefined && value !== null && String(value) !== '') query.set(key,String(value));
        });
        const response = await fetch(`${API}/api/data?${query}`, {
            signal:controller.signal,
            cache:'no-store',
            headers:{'Cache-Control':'no-cache'}
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw createApiError(response,body,`la consulta de ${part}`);
        return body;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function deleteCloudRecord(listKey,id) {
    const response=await fetch(`${API}/api/delete-record`,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({listKey,id})});
    const body=await response.json().catch(()=>({}));
    if(!response.ok||body.ok!==true)throw createApiError(response,body,`la eliminacion de ${listKey}`);
    return true;
}

function getSyncTokenFromState(data = state) {
    return String(data?.syncMeta?.updatedAt || '');
}

async function autoSyncTick({ force = false, silent = true } = {}) {
    if (syncBusy || document.hidden) return false;
    if (!force && (isLocalDirty() || isUserEditingNow())) return false;
    try {
        const meta = await fetchRemoteSyncMeta(5000);
        const token = String(meta.updatedAt || '');
        if (!token) return false;
        if (!lastSyncToken) {
            lastSyncToken = token;
            return false;
        }
        // `force` permite comprobar al volver a la pestaña, pero nunca debe
        // descargar toda la pantalla si D1 no cambió.
        if (token === lastSyncToken) return false;
        const changed = await syncFromCloud({ silent, force: true });
        if (changed) lastSyncToken = token;
        return changed;
    } catch (e) {
        if (!silent) console.log('No se pudo revisar sincronizacion', e);
        return false;
    }
}


// ==================== REGIONES ====================
const REGS = window.REGS || [
    {id:'san_marcos',      n:'SAN MARCOS',      c:'#0ea5e9', lat:16.79, lng:-99.38},
    {id:'ayutla',          n:'AYUTLA',          c:'#8b5cf6', lat:16.96, lng:-99.10},
    {id:'heroes',          n:'HEROES',          c:'#22c55e', lat:17.46, lng:-99.48},
    {id:'maria_dolores',   n:'MARIA DOLORES',   c:'#f59e0b', lat:17.13, lng:-99.05},
    {id:'acapulco',        n:'ACAPULCO',        c:'#ef4444', lat:16.85, lng:-99.90},
    {id:'huitzuco',        n:'HUITZUCO',        c:'#f97316', lat:18.30, lng:-99.33},
    {id:'zumpango',        n:'ZUMPANGO',        c:'#14b8a6', lat:17.64, lng:-99.53},
    {id:'iguala',          n:'IGUALA',          c:'#eab308', lat:18.35, lng:-99.54},
    {id:'ometepec',        n:'OMETEPEC',        c:'#ec4899', lat:16.69, lng:-98.41},
    {id:'coyuca',          n:'COYUCA',          c:'#10b981', lat:16.98, lng:-100.09}
];
window.REGS = REGS;

// ==================== HELPERS ====================
const gid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2,5);

function safeFloat(val) {
    if (val === null || val === undefined) return NaN;
    return parseFloat(String(val).replace(',', '.').trim());
}

function parseLocationCoordinates(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    const patterns = [
        /@(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/,
        /(?:query|q|destination)=(-?\d{1,2}(?:\.\d+)?)(?:%2C|,|%20|\s)+(-?\d{1,3}(?:\.\d+)?)/i,
        /(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)/
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (!match) continue;
        const lat = Number(match[1]);
        const lng = Number(match[2]);
        if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
    return null;
}

function normalizeName(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

function getWorkOrderRequestedText(detail, fallback = '') {
    const values = [detail?.title, detail?.desc, detail?.description]
        .map(value => typeof repairDisplayText === 'function' ? repairDisplayText(value) : String(value || ''))
        .map(value => value.trim())
        .filter(Boolean);
    const pieces = [];
    const keyOf = value => normalizeName(String(value || '').replace(/\s+/g, ' '));
    for (const value of values) {
        for (const part of value.split(/\s+(?:—|–|-)\s+/).map(item => item.trim()).filter(Boolean)) {
            const key = keyOf(part);
            if (!key) continue;
            const exact = pieces.findIndex(item => item.key === key);
            if (exact >= 0) continue;
            const shorter = pieces.findIndex(item => key.startsWith(`${item.key} `) && item.key.length >= 12);
            if (shorter >= 0) {
                pieces[shorter] = { key, text:part };
                continue;
            }
            if (pieces.some(item => item.key.startsWith(`${key} `) && key.length >= 12)) continue;
            pieces.push({ key, text:part });
        }
    }
    return pieces.map(item => item.text).join(' — ') || fallback;
}

function coordKey(value) {
    const num = safeFloat(value);
    return isNaN(num) ? '' : num.toFixed(6);
}


function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}') || {};
    } catch (e) {
        return {};
    }
}

function normalizeRole(role) {
    return String(role || '').trim().toLowerCase();
}

function userHasRole(...roles) {
    const currentRole = normalizeRole(getCurrentUser().role);
    return roles.map(normalizeRole).includes(currentRole);
}

function getTechnicianUsers() {
    return (state.users || []).filter(user => !user.deletedAt && normalizeRole(user.role) === 'tecnico');
}

function ensureTechnicianMirror(user) {
    if (!user || normalizeRole(user.role) !== 'tecnico') return;
    const existing = (state.technicians || []).find(t => t.userId === user.id || t.usuario === user.username);
    const payload = {
        nombre: user.name,
        telefono: user.phone || '',
        estado: user.status === 'inactivo' ? 'inactivo' : 'activo',
        usuario: user.username,
        password: user.password,
        notas: user.notes || '',
        regiones: Array.isArray(user.zones) ? user.zones : []
    };
    if (existing) Object.assign(existing, payload);
    else state.technicians.push({ id: gid('t'), userId: user.id, ...payload });
}

function syncTechniciansFromUsers() {
    if (!Array.isArray(state.technicians)) state.technicians = [];
    getTechnicianUsers().forEach(ensureTechnicianMirror);
}


function getActorStamp(action = 'movimiento') {
    const user = getCurrentUser();
    return {
        action,
        at: new Date().toISOString(),
        byId: user.id || '',
        byName: user.name || user.username || 'Usuario',
        byUsername: user.username || '',
        byRole: user.role || ''
    };
}

function setCreatedAudit(item, action = 'creó') {
    if (!item || typeof item !== 'object') return item;
    const stamp = getActorStamp(action);
    item.createdAt = item.createdAt || stamp.at;
    item.createdById = item.createdById || stamp.byId;
    item.createdByName = item.createdByName || stamp.byName;
    item.createdByUsername = item.createdByUsername || stamp.byUsername;
    item.createdByRole = item.createdByRole || stamp.byRole;
    item.lastAction = action;
    item.lastActionAt = stamp.at;
    item.lastActionBy = stamp.byName;
    item.lastActionByRole = stamp.byRole;
    recordAudit(action, item);
    return item;
}

function setUpdatedAudit(item, action = 'modificó') {
    if (!item || typeof item !== 'object') return item;
    const stamp = getActorStamp(action);
    item.updatedAt = stamp.at;
    item.updatedById = stamp.byId;
    item.updatedByName = stamp.byName;
    item.updatedByUsername = stamp.byUsername;
    item.updatedByRole = stamp.byRole;
    item.lastAction = action;
    item.lastActionAt = stamp.at;
    item.lastActionBy = stamp.byName;
    item.lastActionByRole = stamp.byRole;
    recordAudit(action, item);
    return item;
}

function setDeletedAudit(item, action = 'eliminó') {
    if (!item || typeof item !== 'object') return item;
    const stamp = getActorStamp(action);
    item.deletedAt = stamp.at;
    item.deletedById = stamp.byId;
    item.deletedByName = stamp.byName;
    item.deletedByUsername = stamp.byUsername;
    item.deletedByRole = stamp.byRole;
    item.lastAction = action;
    item.lastActionAt = stamp.at;
    item.lastActionBy = stamp.byName;
    item.lastActionByRole = stamp.byRole;
    recordAudit(action, item);
    return item;
}

function recordAudit(action, item, extra = {}) {
    if (!Array.isArray(state.auditLog)) state.auditLog = [];
    const stamp = getActorStamp(action);
    state.auditLog.push({
        id: gid('au'),
        action,
        at: stamp.at,
        byId: stamp.byId,
        byName: stamp.byName,
        byUsername: stamp.byUsername,
        byRole: stamp.byRole,
        targetId: item?.id || '',
        targetName: item?.name || item?.nodeName || item?.nodeCode || item?.equipmentName || item?.title || item?.description || '',
        targetType: item?.nodeId ? 'nodo/detalle' : (item?.equipmentId ? 'antena/detalle' : item?.role ? 'usuario' : item?.town ? 'nodo' : 'registro'),
        ...extra
    });
    // El historial administrativo necesita conservar actividad de meses
    // anteriores; limitarlo a 800 movimientos borraba días antiguos.
    if (state.auditLog.length > 10000) state.auditLog = state.auditLog.slice(-10000);
}

function formatAuditLine(item) {
    if (!item) return '';
    const chunks = [];
    const hiddenActor = (name = '', username = '', id = '') => `${name} ${username} ${id}`.toLowerCase().includes('abraham');
    if (item.createdByName && !hiddenActor(item.createdByName, item.createdByUsername, item.createdById)) chunks.push(`Creado por ${item.createdByName}`);
    if (item.updatedByName && !hiddenActor(item.updatedByName, item.updatedByUsername, item.updatedById)) chunks.push(`Modificado por ${item.updatedByName}`);
    if (item.deletedByName && !hiddenActor(item.deletedByName, item.deletedByUsername, item.deletedById)) chunks.push(`Eliminado por ${item.deletedByName}`);
    if (item.lastActionBy && !chunks.length && !hiddenActor(item.lastActionBy)) chunks.push(`${item.lastAction || 'Movimiento'} por ${item.lastActionBy}`);
    return chunks.join(' · ');
}

function renderAuditMeta(item, esc = value => String(value ?? '')) {
    const line = formatAuditLine(item);
    if (!line) return '';
    return `<div class="audit-meta">${esc(line)}</div>`;
}

function equipmentDuplicateOf(name, lat, lng, ignoreId = '') {
    const cleanName = normalizeName(name);
    const cleanLat = coordKey(lat);
    const cleanLng = coordKey(lng);
    if (!cleanName || !cleanLat || !cleanLng) return null;
    return (state.equipment || []).find(eq =>
        eq.id !== ignoreId &&
        normalizeName(eq.name) === cleanName &&
        coordKey(eq.lat) === cleanLat &&
        coordKey(eq.lng) === cleanLng
    ) || null;
}

const te = t => ({ptp:'PTP', ptmp:'PTMP', sector:'Sector', mikrotik:'Mikrotik', balancer:'Balanceador', antenna:'Antena', tower:'Torre'}[t] || 'Antena');

const vl = v => ({comunidad:'Comunidad', punto_venta:'Pto Venta', torre:'Torre', troncal:'Troncal'}[v] || v || '');

const vc = v => ({comunidad:'badge bon', punto_venta:'badge bwa', torre:'badge bwa', troncal:'badge bwa'}[v] || 'badge bty');

const pl = p => ({muy_alta:'Muy Alta', alta:'Alta', media:'Media', baja:'Baja'}[p] || p);

const pc = p => ({muy_alta:'var(--re)', alta:'#e67e22', media:'var(--am)', baja:'var(--gr)'}[p] || 'var(--mu)');

const priorityRank = p => ({ muy_alta: 0, alta: 1, media: 2, baja: 3 }[p] ?? 9);
const visitTypeRank = type => ({ torre: 0, troncal: 1, punto_venta: 2, comunidad: 3 }[type] ?? 9);

function isCompletedOrder(order) {
    return !!order && (order.status === 'completada' || order.status === 'done');
}

function comparePriority(a, b) {
    const doneA = isCompletedOrder(a) ? 1 : 0;
    const doneB = isCompletedOrder(b) ? 1 : 0;
    return doneA - doneB ||
        priorityRank(a?.priority) - priorityRank(b?.priority) ||
        visitTypeRank(a?.visitType) - visitTypeRank(b?.visitType) ||
        new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
}

function sortDetailsByPriority(details) {
    return (Array.isArray(details) ? details : []).slice().sort(comparePriority);
}

function parseOptionalLocation(value) {
    const rawLocation = String(value || '').trim();
    if (!rawLocation) return { location: '', lat: '', lng: '', valid: true, hasLocation: false, label: 'Sin ubicacion', url: '' };
    let location = rawLocation;
    try {
        location = decodeURIComponent(rawLocation.replace(/\+/g, ' '));
    } catch(e) {}

    const pairPattern = /([-+]?\d{1,3}(?:\.\d+)?)\s*(?:,|\s+)\s*([-+]?\d{1,3}(?:\.\d+)?)/g;
    let match;
    while ((match = pairPattern.exec(location))) {
        const lat = safeFloat(match[1]);
        const lng = safeFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
            return {
                location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                lat,
                lng,
                valid: true,
                hasLocation: true,
                label: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                url: `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`
            };
        }
    }
    const looksLikeUrl = /^https?:\/\//i.test(rawLocation);
    const isMapsUrl = looksLikeUrl && /(maps\.app\.goo\.gl|google\.[^/]+\/maps|goo\.gl\/maps|maps\.google)/i.test(rawLocation);
    return {
        location: rawLocation,
        lat: '',
        lng: '',
        valid: true,
        hasLocation: !!rawLocation,
        label: isMapsUrl ? 'Abrir Maps' : rawLocation,
        url: isMapsUrl ? rawLocation : ''
    };
}

function getLocationDisplay(value) {
    const parsed = parseOptionalLocation(value);
    return {
        ...parsed,
        label: parsed.hasLocation ? (parsed.label || parsed.location) : 'Sin ubicacion'
    };
}

function normalizeWorkOrderLocationList(workOrders) {
    (workOrders || []).forEach(workOrder => {
        const raw = String(workOrder?.detailLocation || '').trim();
        if (!raw) return;
        const parsed = parseOptionalLocation(raw);
        if (!parsed.valid) return;
        workOrder.detailLocation = parsed.location;
        workOrder.lat = parsed.lat;
        workOrder.lng = parsed.lng;
    });
}

function normalizeWorkOrderLocations() {
    normalizeWorkOrderLocationList(state.workOrders);
}

const rById = id => REGS.find(r => id && r.id === id) || {n: id || 'General', c: '#64748b'};
const getZoneLabel = id => rById(id).n;

function isOpenOrder(order) {
    return !!order && !order.deletedAt && order.status !== 'completada' && order.status !== 'done';
}

function getEquipmentLinkedNodeIds(equipmentId) {
    const eq = (state.equipment || []).find(item => item && item.id === equipmentId);
    const ids = Array.isArray(eq?.linkedNodeIds) ? eq.linkedNodeIds : [];
    return ids.filter(Boolean);
}

function getEquipmentLinkedNodes(equipmentId) {
    const ids = new Set(getEquipmentLinkedNodeIds(equipmentId));
    return (state.nodes || []).filter(node => node && !node.deletedAt && ids.has(node.id));
}

function getNodeLinkedEquipment(nodeId) {
    return (state.equipment || []).filter(eq =>
        eq && !eq.deletedAt && Array.isArray(eq.linkedNodeIds) && eq.linkedNodeIds.includes(nodeId)
    );
}

function getEquipmentRelationLabel(equipmentId) {
    const nodes = getEquipmentLinkedNodes(equipmentId);
    return nodes.length ? `Pueblos compartidos: ${nodes.map(getNodeLabel).join(', ')}` : 'Sin pueblos vinculados';
}

function getNodeRelationLabel(nodeId) {
    const equipment = getNodeLinkedEquipment(nodeId);
    return equipment.length ? `Antenas vinculadas: ${equipment.map(eq => eq.name || eq.ip || 'Antena').join(', ')}` : 'Sin antena vinculada';
}

function getEntityOpenDetails(type, id) {
    return (state.workOrders || []).filter(order => {
        if (!isOpenOrder(order)) return false;
        if (type === 'equipment') {
            // Si ya tiene nodeId, el detalle pertenece al nodo. equipmentId
            // se conserva solo como referencia de la antena de origen.
            return !order.nodeId && order.equipmentId === id;
        }
        if (type === 'node') return order.nodeId === id || order.nodeCode === id;
        return false;
    });
}

function getPriorityStatusFromDetails(details) {
    const list = Array.isArray(details) ? details.filter(isOpenOrder) : [];
    const counts = { muy_alta:0, alta:0, media:0, baja:0 };
    list.forEach(item => {
        const p = item.priority || item.prioridad || 'media';
        if (counts[p] !== undefined) counts[p]++;
    });
    if (counts.muy_alta > 0 || counts.alta >= 3) return { key:'critico', label:'Crítico', color:'#ef4444', count:list.length, counts };
    if (counts.alta > 0 || counts.media >= 2 || counts.baja >= 4) return { key:'atencion', label:'Atención', color:'#f59e0b', count:list.length, counts };
    if (counts.media > 0 || counts.baja > 0) return { key:'pendiente', label:'Pendiente', color:'#3b82f6', count:list.length, counts };
    return { key:'despejado', label:'Despejado', color:'#22c55e', count:0, counts };
}

function getEntityPriorityStatus(type, id) {
    const details = getEntityOpenDetails(type, id);
    const status = getPriorityStatusFromDetails(details);
    if (status.key === 'pendiente' && !details.some(detail => detail?.isPlanned || isDetailAssignedToPlan(detail?.id))) {
        return getPriorityStatusFromDetails([]);
    }
    return status;
}

function isDetailAssignedToPlan(detailId) {
    if (!detailId) return false;
    const plans = state.weekPlan && typeof state.weekPlan === 'object' ? state.weekPlan : {};
    for (const scope of Object.values(plans)) {
        for (const [day, value] of Object.entries(scope || {})) {
            const stops = day === '_generalPlans'
                ? (Array.isArray(value) ? value.flatMap(plan => plan?.stops || []) : [])
                : (Array.isArray(value) ? value : []);
            if (stops.some(stop => !stop?.deletedAt && (stop.detailIds || []).includes(detailId))) return true;
        }
    }
    return false;
}

function getEntityPriorityText(status) {
    return `Crítico: tiene prioridad muy alta o 3+ altas. Atención: tiene alta, 2+ medias o 4+ bajas. Pendiente: tiene media/baja. Despejado: sin detalles pendientes.`;
}


function isPendingDeletionRequest(req) {
    return req && !['completed', 'rejected', 'missing'].includes(req.status);
}

function getRequestTargetType(req) {
    if (req?.targetType) return req.targetType;
    if (req?.nodeId) return 'node';
    if (req?.detailId) return 'detail';
    return 'item';
}

function getRequestTargetId(req) {
    return req?.targetId || req?.nodeId || req?.detailId || '';
}

function getRequestTargetLabel(req) {
    if (req?.targetName) return req.targetName;
    if (req?.nodeName) return req.nodeName;
    if (req?.detailName) return req.detailName;
    return 'Elemento';
}

function findDeletionRequest(targetType, targetId) {
    return (state.deletionRequests || []).find(req =>
        isPendingDeletionRequest(req) &&
        getRequestTargetType(req) === targetType &&
        getRequestTargetId(req) === targetId
    ) || null;
}

function getPendingDeletionRequests() {
    return (state.deletionRequests || []).filter(isPendingDeletionRequest)
        .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
}

async function createDeletionRequest(targetType, targetId, targetName) {
    const auditStart=Array.isArray(state.auditLog)?state.auditLog.length:0;
    if (!Array.isArray(state.deletionRequests)) state.deletionRequests = [];
    const existing = findDeletionRequest(targetType, targetId);
    if (existing) return existing;
    const user = getCurrentUser();
    const req = {
        id: gid('dr'),
        targetType,
        targetId,
        targetName,
        requestedByUserId: user.id || '',
        requestedByName: user.name || user.username || 'Usuario',
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    if (targetType === 'node') { req.nodeId = targetId; req.nodeName = targetName; }
    if (targetType === 'detail') { req.detailId = targetId; req.detailName = targetName; }
    if (targetType === 'equipment') { req.equipmentId = targetId; req.equipmentName = targetName; }
    state.deletionRequests.push(req);
    recordAudit('solicitó eliminación', req, { targetType, targetId });
    await saveRecordWithAudit('deletionRequests',req,auditStart);
    if (typeof renderNotificationCenter === 'function') renderNotificationCenter();
    return req;
}

async function generateDeletionCode(id) {
    const req = (state.deletionRequests || []).find(item => item.id === id);
    if (!req) return;
    req.code = String(Math.floor(100000 + Math.random() * 900000));
    req.status = 'code_ready';
    req.updatedAt = new Date().toISOString();
    req.approvedBy = getCurrentUser().name || getCurrentUser().username || 'Administrador';
    recordAudit('generó código de eliminación', req);
    await saveDB();
    if (typeof renderDeletionRequests === 'function') renderDeletionRequests();
    if (typeof renderNotificationCenter === 'function') renderNotificationCenter();
    notify('Código generado.');
}

async function rejectDeletionRequest(id) {
    const req = (state.deletionRequests || []).find(item => item.id === id);
    if (!req) return;
    const ok = typeof askConfirmation === 'function'
        ? await askConfirmation({
            title: 'Rechazar solicitud',
            message: `No se eliminara ${getRequestTargetLabel(req)}.`,
            confirmText: 'Rechazar',
            tone: 'danger'
        })
        : confirm(`Rechazar solicitud para ${getRequestTargetLabel(req)}?`);
    if (!ok) return;
    req.status = 'rejected';
    req.updatedAt = new Date().toISOString();
    req.rejectedBy = getCurrentUser().name || getCurrentUser().username || 'Administrador';
    recordAudit('rechazo eliminacion', req);
    await saveDB();
    if (typeof renderDeletionRequests === 'function') renderDeletionRequests();
    if (typeof renderNotificationCenter === 'function') renderNotificationCenter();
    notify('Solicitud rechazada.');
}

function applyDeletionRequestTarget(req) {
    const targetType = getRequestTargetType(req);
    const targetId = getRequestTargetId(req);
    let target = null;
    let action = 'aprobo eliminacion solicitada';
    if (targetType === 'node') {
        target = (state.nodes || []).find(item => item.id === targetId && !item.deletedAt);
        action = 'aprobo eliminacion de nodo';
    } else if (targetType === 'equipment') {
        target = (state.equipment || []).find(item => item.id === targetId && !item.deletedAt);
        action = 'aprobo eliminacion de antena';
    } else if (targetType === 'detail') {
        target = (state.workOrders || []).find(item => item.id === targetId && !item.deletedAt);
        action = 'aprobo eliminacion de detalle';
    }
    if (!target) return false;
    setDeletedAudit(target, action);
    return true;
}

async function approveDeletionRequest(id) {
    const req = (state.deletionRequests || []).find(item => item.id === id);
    if (!req || !isPendingDeletionRequest(req)) return;
    const ok = typeof askConfirmation === 'function'
        ? await askConfirmation({
            title: 'Aprobar eliminacion',
            message: `Se eliminara ${getRequestTargetLabel(req)} para todos los usuarios.`,
            confirmText: 'Aprobar y eliminar',
            tone: 'ok'
        })
        : confirm(`Eliminar ${getRequestTargetLabel(req)}?`);
    if (!ok) return;
    if (!applyDeletionRequestTarget(req)) {
        req.status = 'missing';
        req.updatedAt = new Date().toISOString();
        await saveDB();
        notify('No se encontro el registro; se cerro la solicitud.', 'err');
        if (typeof renderDeletionRequests === 'function') renderDeletionRequests();
        if (typeof renderNotificationCenter === 'function') renderNotificationCenter();
        return;
    }
    req.status = 'completed';
    req.resolvedAt = new Date().toISOString();
    req.updatedAt = new Date().toISOString();
    req.approvedBy = getCurrentUser().name || getCurrentUser().username || 'Administrador';
    recordAudit('aprobo eliminacion solicitada', req);
    await saveDB();
    if (typeof renderNodos === 'function') renderNodos();
    if (typeof renderAntenas === 'function') renderAntenas();
    if (typeof renderAntennaDetailList === 'function') renderAntennaDetailList();
    if (typeof renderNodeDetailList === 'function') renderNodeDetailList();
    if (typeof renderWOs === 'function') renderWOs();
    if (typeof renderDeletionRequests === 'function') renderDeletionRequests();
    if (typeof renderNotificationCenter === 'function') renderNotificationCenter();
    notify('Solicitud aprobada y eliminada.');
}

function completeDeletionRequest(targetType, targetId) {
    const req = findDeletionRequest(targetType, targetId);
    if (req) {
        req.status = 'completed';
        req.resolvedAt = new Date().toISOString();
        req.updatedAt = new Date().toISOString();
        req.completedBy = getCurrentUser().name || getCurrentUser().username || 'Usuario';
    }
}

async function handleProtectedDelete({ targetType, targetId, targetName, applyDelete, refresh }) {
    if (userHasRole('administrador', 'admin')) {
        const ok = typeof askConfirmation === 'function'
            ? await askConfirmation({
                title: 'Eliminar registro',
                message: `Se eliminara ${targetName}. Esta accion se guardara en la nube.`,
                confirmText: 'Eliminar',
                tone: 'danger'
            })
            : confirm(`Eliminar ${targetName}?`);
        if (!ok) return false;
        const auditStart=Array.isArray(state.auditLog)?state.auditLog.length:0;
        applyDelete();
        completeDeletionRequest(targetType, targetId);
        const keyByType={equipment:'equipment',node:'nodes',detail:'workOrders'};
        const targetByType={equipment:state.equipment,node:state.nodes,detail:state.workOrders};
        const record=(targetByType[targetType]||[]).find(item=>item.id===targetId);
        if(record)await saveRecordWithAudit(keyByType[targetType],record,auditStart);
        const request=(state.deletionRequests||[]).find(item=>getRequestTargetType(item)===targetType&&getRequestTargetId(item)===targetId);
        if(request)await saveRecord('deletionRequests',request);
        if (typeof refresh === 'function') refresh();
        if (typeof renderNotificationCenter === 'function') renderNotificationCenter();
        notify('Eliminado.');
        return true;
    }

    const req = findDeletionRequest(targetType, targetId);
    if (!req) {
        const ok = typeof askConfirmation === 'function'
            ? await askConfirmation({
                title: 'Solicitar eliminacion',
                message: `Se enviara una solicitud a administradores para eliminar ${targetName}.`,
                confirmText: 'Enviar solicitud',
                tone: 'ok'
            })
            : confirm(`Se enviara solicitud de eliminacion para ${targetName}. Continuar?`);
        if (!ok) return false;
        await createDeletionRequest(targetType, targetId, targetName);
        notify('Solicitud enviada al administrador.');
        return false;
    }

    notify('La solicitud esta pendiente de aprobacion por administrador.', 'err');
    return false;
}
function getNodeLabel(node) {
    if (!node) return '';
    return `${node.nodeCode || node.code || ''}${node.town ? ' · ' + node.town : ''}`.trim();
}

function normalizeEquipmentData() {
    if (!Array.isArray(state.equipment)) state.equipment = [];
    const kept = [];
    state.equipment.forEach(eq => {
        // Las antenas/Mikrotiks asignan zona por ubicación automáticamente.
        applyEquipmentRegion(eq);
        const dup = kept.find(item =>
            normalizeName(item.name) === normalizeName(eq.name) &&
            coordKey(item.lat) === coordKey(eq.lat) &&
            coordKey(item.lng) === coordKey(eq.lng)
        );
        if (dup) {
            replaceEquipmentReferences(eq.id, dup.id);
            return;
        }
        kept.push(eq);
    });
    state.equipment = kept;
}

function isLocalRouteOrigin() {
    const host = location.hostname.replace(/\.+$/, '');
    return location.protocol === 'file:' ||
        !host ||
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1';
}

function getCleanPublicOrigin() {
    if (isLocalRouteOrigin()) return '';
    const protocol = location.protocol || 'https:';
    const host = location.hostname.replace(/\.+$/, '');
    const port = location.port ? `:${location.port}` : '';
    return `${protocol}//${host}${port}`;
}

function getCurrentPageBase(pageName) {
    const origin = getCleanPublicOrigin();
    if (!origin) return '';
    const cleanPath = location.pathname.replace(/\/+$/, '/');
    const escapedPage = String(pageName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pagePattern = new RegExp(`${escapedPage}$`, 'i');
    const basePath = pagePattern.test(cleanPath)
        ? cleanPath.replace(pagePattern, '')
        : cleanPath.replace(/[^/]*$/, '');
    return `${origin}${basePath}`;
}

function getPublicRouteBase(pageName) {
    return isLocalRouteOrigin() ? '' : getCurrentPageBase(pageName);
}

function buildPublicRouteLink(pageName, targetPage, query) {
    const base = getPublicRouteBase(pageName);
    if (!base) return '';
    return `${base}${targetPage}${query || ''}`;
}

// ==================== ESTADO DE ANTENA ====================
function getAntennaStatus(eqId) {
    const wos = state.workOrders.filter(w => !w.deletedAt && w.equipmentId === eqId && w.status !== 'completada');
    let counts = { muy_alta: 0, alta: 0, media: 0, baja: 0 };
    
    wos.forEach(w => {
        if (counts[w.priority] !== undefined) counts[w.priority]++;
    });

    if (counts.muy_alta >= 1) return { color: '#e74c3c', text: 'Crítico' };
    if (counts.alta >= 3)     return { color: '#9b59b6', text: 'Peligro' };
    if (counts.media > 5)     return { color: '#e67e22', text: 'Advertencia' };
    if (counts.baja >= 7)     return { color: '#f39c12', text: 'Atención' };
    return { color: '#2ecc71', text: 'Estable' };
}

// ==================== BASE DE DATOS (Local + Nube) ====================
function safeParse(val) {
    if (!val) return [];
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch(e) { return []; }
    }
    return val;
}

function hasKeys(obj) {
    return !!obj && typeof obj === 'object' && !Array.isArray(obj) && Object.keys(obj).length > 0;
}

function getUpdatedAt(data) {
    const value = data?.syncMeta?.updatedAt;
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
}

function chooseLatestState(localState, remoteState) {
    const localTime = getUpdatedAt(localState);
    const remoteTime = getUpdatedAt(remoteState);
    const keys = ['equipment', 'nodes', 'workOrders', 'technicians', 'users', 'techAccessLog', 'deletionRequests', 'auditLog', 'materials', 'routes'];
    const count = data => keys.reduce((sum, key) => sum + (Array.isArray(data[key]) ? data[key].length : 0), 0);
    const remoteCount = count(remoteState);

    if (remoteTime && localTime) return remoteTime >= localTime ? remoteState : localState;
    if (localTime && !remoteTime) return localState;
    if (remoteTime && !localTime) return remoteState;
    if (remoteCount) return remoteState;

    return count(remoteState) >= count(localState) ? remoteState : localState;
}

function cloneData(value) {
    try {
        return JSON.parse(JSON.stringify(value || {}));
    } catch(e) {
        return {};
    }
}

function recordKey(item, fallbackPrefix = 'item') {
    if (!item || typeof item !== 'object') return '';
    if (item.id) return String(item.id);
    return [
        fallbackPrefix,
        normalizeName(item.name || item.n || item.title || ''),
        item.createdAt || '',
        item.equipmentId || '',
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
    
    if (prev.technicianReport && !next.technicianReport) {
        merged.technicianReport = prev.technicianReport;
        if (prev.status === 'completada' || prev.status === 'no_realizado') {
            merged.status = prev.status;
            merged.completedAt = prev.completedAt;
        }
    }
    
    return merged;
}

function mergeRecords(remoteList, localList, fallbackPrefix) {
    const byKey = new Map();
    const order = [];
    const rememberOrder = item => {
        if (!item || typeof item !== 'object') return;
        const copy = cloneData(item);
        const key = recordKey(copy, fallbackPrefix) || `${fallbackPrefix}|${order.length}|${Math.random()}`;
        if (!order.includes(key)) order.push(key);
    };
    const add = item => {
        if (!item || typeof item !== 'object') return;
        const copy = cloneData(item);
        const key = recordKey(copy, fallbackPrefix) || `${fallbackPrefix}|${byKey.size}|${Math.random()}`;
        if (byKey.has(key)) {
            const prev = byKey.get(key);
            byKey.set(key, mergeRecordVersions(prev, copy));
        } else {
            byKey.set(key, copy);
        }
    };
    (Array.isArray(remoteList) ? remoteList : []).forEach(add);
    (Array.isArray(localList) ? localList : []).forEach(add);
    (Array.isArray(localList) ? localList : []).forEach(rememberOrder);
    (Array.isArray(remoteList) ? remoteList : []).forEach(rememberOrder);
    return order.map(key => byKey.get(key)).filter(Boolean);
}

function mergeGeneralPlans(remotePlans, localPlans) {
    const merged = mergeRecords(remotePlans, localPlans, 'generalPlan');
    return merged.map(plan => {
        const key = recordKey(plan, 'generalPlan');
        const remote = (remotePlans || []).find(item => recordKey(item, 'generalPlan') === key) || {};
        const local = (localPlans || []).find(item => recordKey(item, 'generalPlan') === key) || {};
        const stops = plan.deletedAt ? (Array.isArray(local.stops) ? local.stops : remote.stops) : mergeRecords(remote.stops, local.stops, 'planStop');
        return { ...plan, stops };
    });
}

function mergePlanObject(remotePlan, localPlan) {
    const remote = remotePlan && typeof remotePlan === 'object' ? remotePlan : {};
    const local = localPlan && typeof localPlan === 'object' ? localPlan : {};
    const out = mergeRecordVersions(cloneData(remote), cloneData(local));
    const keys = new Set([...Object.keys(remote), ...Object.keys(local)]);
    keys.forEach(key => {
        if (key === '_generalPlans') {
            out._generalPlans = mergeGeneralPlans(remote._generalPlans, local._generalPlans);
            return;
        }
        if (Array.isArray(remote[key]) || Array.isArray(local[key])) {
            out[key] = mergeRecords(remote[key], local[key], 'planStop');
        }
    });
    return out;
}

function mergeWeekPlan(remoteWeekPlan, localWeekPlan) {
    const remote = remoteWeekPlan && typeof remoteWeekPlan === 'object' ? remoteWeekPlan : {};
    const local = localWeekPlan && typeof localWeekPlan === 'object' ? localWeekPlan : {};
    const out = {};
    const techIds = new Set([...Object.keys(remote), ...Object.keys(local)]);
    techIds.forEach(techId => {
        out[techId] = mergePlanObject(remote[techId], local[techId]);
    });
    return out;
}

function mergeAppStates(remoteState = {}, localState = {}) {
    const merged = {
        equipment: mergeRecords(remoteState.equipment, localState.equipment, 'equipment'),
        nodes: mergeRecords(remoteState.nodes, localState.nodes, 'node'),
        workOrders: mergeRecords(remoteState.workOrders, localState.workOrders, 'workOrder'),
        technicians: mergeRecords(remoteState.technicians, localState.technicians, 'technician'),
        users: mergeRecords(remoteState.users, localState.users, 'user'),
        techAccessLog: mergeRecords(remoteState.techAccessLog, localState.techAccessLog, 'techAccess'),
        deletionRequests: mergeRecords(remoteState.deletionRequests, localState.deletionRequests, 'deletionRequest'),
        auditLog: mergeRecords(remoteState.auditLog, localState.auditLog, 'audit'),
        materials: mergeRecords(remoteState.materials, localState.materials, 'material'),
        routes: mergeRecords(remoteState.routes, localState.routes, 'route'),
        weekPlan: mergeWeekPlan(remoteState.weekPlan, localState.weekPlan),
        prepChecked: { ...(remoteState.prepChecked || {}), ...(localState.prepChecked || {}) },
        syncMeta: {}
    };
    const newest = Math.max(getUpdatedAt(localState), getUpdatedAt(remoteState), Date.now());
    merged.syncMeta.updatedAt = new Date(newest).toISOString();
    return merged;
}

function getLocalBackupState() {
    try {
        return JSON.parse(localStorage.getItem(BACKUP_KEY) || '{}') || {};
    } catch(e) {
        return {};
    }
}

function getPageDataParts(parts = null) {
    if (Array.isArray(parts) && parts.length) {
        return [...new Set(parts.map(part => String(part || '').trim()).filter(part => ALL_DATA_PARTS.includes(part)))];
    }
    const route = (location.pathname.split('/').pop() || '').toLowerCase();
    const page = route && !route.includes('.') ? `${route}.html` : route;
    return DATA_PARTS_BY_PAGE[page] ? [...DATA_PARTS_BY_PAGE[page]] : ['people', 'activity'];
}

function getStateCacheKey(parts = null) {
    return `${LAST_GOOD_STATE_KEY}:${getPageDataParts(parts).slice().sort().join(',')}`;
}

function getLastGoodCloudState(parts = null) {
    try {
        const cached = JSON.parse(localStorage.getItem(getStateCacheKey(parts)) || 'null');
        return cached && cached.data && typeof cached.data === 'object' ? cached : null;
    } catch(e) {
        return null;
    }
}

function saveLastGoodCloudState(data, parts = null) {
    try {
        localStorage.setItem(getStateCacheKey(parts || data?.__loadedParts), JSON.stringify({
            savedAt: new Date().toISOString(),
            data
        }));
    } catch(e) {
        console.warn('No se pudo conservar la ultima copia de nube.', e);
    }
}

function stableJson(value) {
    try {
        return JSON.stringify(value || null);
    } catch(e) {
        return '';
    }
}

function getPendingChanges() {
    try {
        const pending = JSON.parse(localStorage.getItem(PENDING_CHANGES_KEY) || '[]');
        return Array.isArray(pending) ? pending : [];
    } catch(e) {
        return [];
    }
}

function setPendingChanges(changes) {
    const compacted = compactChanges(changes);
    if (!compacted.length) {
        localStorage.removeItem(PENDING_CHANGES_KEY);
        return;
    }
    localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(compacted));
}

function compactChanges(changes) {
    const compact = {};
    (Array.isArray(changes) ? changes : []).forEach(change => {
        if (!change || typeof change !== 'object') return;
        const key = String(change.key || '').trim();
        if (!key) return;

        if (LIST_DATA_KEYS.includes(key)) {
            const records = Array.isArray(change.records) ? change.records : [];
            if (!records.length) return;
            const previous = compact[key]?.records || [];
            compact[key] = {
                key,
                records: mergeRecords(previous, records, RECORD_PREFIX_BY_KEY[key] || key)
            };
            return;
        }

        if (key === 'weekPlan') {
            compact[key] = {
                key,
                value: mergeWeekPlan(compact[key]?.value || {}, change.value || {})
            };
            return;
        }

        if (key === 'prepChecked') {
            compact[key] = {
                key,
                value: { ...(compact[key]?.value || {}), ...(change.value || {}) }
            };
        }
    });
    return Object.values(compact);
}

function buildStateChanges(previousState = {}, nextState = {}) {
    const changes = [];

    LIST_DATA_KEYS.forEach(key => {
        const prefix = RECORD_PREFIX_BY_KEY[key] || key;
        const previousRecords = Array.isArray(previousState[key]) ? previousState[key] : [];
        const nextRecords = Array.isArray(nextState[key]) ? nextState[key] : [];
        const previousByKey = new Map();
        previousRecords.forEach(item => {
            const itemKey = recordKey(item, prefix);
            if (itemKey) previousByKey.set(itemKey, stableJson(item));
        });
        const changedRecords = nextRecords.filter(item => {
            const itemKey = recordKey(item, prefix);
            return itemKey && previousByKey.get(itemKey) !== stableJson(item);
        }).map(item => {
            const copy = cloneData(item);
            if (!copy.updatedAt && !copy.deletedAt && !copy.archivedAt) copy.updatedAt = new Date().toISOString();
            return copy;
        });
        if (changedRecords.length) changes.push({ key, records: changedRecords });
    });

    OBJECT_DATA_KEYS.forEach(key => {
        const previousValue = previousState[key] || {};
        const nextValue = nextState[key] || {};
        if (stableJson(previousValue) !== stableJson(nextValue)) {
            changes.push({ key, value: cloneData(nextValue) });
        }
    });

    return compactChanges(changes);
}

function queueStateChanges(previousState, nextState) {
    const changes = buildStateChanges(previousState || {}, nextState || {});
    if (!changes.length) return 0;
    setPendingChanges([...getPendingChanges(), ...changes]);
    return changes.length;
}

async function flushPendingChanges({ fallbackFull = true } = {}) {
    const pending = getPendingChanges();
    if (!pending.length) {
        if (fallbackFull) await postStateToCloud();
        return true;
    }

    try {
        await postChangesToCloud(pending);
        localStorage.removeItem(PENDING_CHANGES_KEY);
        return true;
    } catch(e) {
        if (!fallbackFull) throw e;
        await postStateToCloud();
        localStorage.removeItem(PENDING_CHANGES_KEY);
        return true;
    }
}


async function fetchRemoteState(timeoutMs = 5000, options = {}) {
    const controller = new AbortController();
    const effectiveTimeoutMs = Math.max(5000, Number(timeoutMs) || 5000);
    const timeoutId = setTimeout(() => controller.abort(), effectiveTimeoutMs);
    const requestedParts = getPageDataParts(options.parts);
    const currentRoute = (location.pathname.split('/').pop() || '').toLowerCase();
    const currentPage = currentRoute && !currentRoute.includes('.') ? `${currentRoute}.html` : currentRoute;
    let d = {};
    const pageMeta = {};
    try {
        const PAGE_SIZE = 100;
        const syncMetaPart = requestedParts.includes('planning') ? '' : (requestedParts[0] || '');
        const requestPart = async (part, offset = 0, limit = PAGE_SIZE, params = {}, includeSyncMeta = false) => {
            let lastError;
            for (let attempt = 0; attempt < 4; attempt += 1) {
                const query = new URLSearchParams({ part, offset:String(offset), limit:String(limit), paged:'1', t:String(Date.now()) });
                if (includeSyncMeta) query.set('includeSyncMeta','1');
                Object.entries(params || {}).forEach(([key,value]) => {
                    if (value !== undefined && value !== null && String(value) !== '') query.set(key,String(value));
                });
                const res = await fetch(`${API}/api/data?${query}`, {
                    signal: controller.signal,
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache' }
                });
                const body = await res.json().catch(() => ({}));
                if (res.ok) return body;
                lastError = createApiError(res, body, `la carga de ${part}`);
                if (res.status !== 503 || attempt === 3) throw lastError;
                await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
            }
            throw lastError;
        };
        const requestPaged = async (part, key, params = {}) => {
            const first = await requestPart(part,0,PAGE_SIZE,params,part === syncMetaPart);
            const mergedBody = { ...first };
            const mergePage = page => {
                for (const [pageKey,value] of Object.entries(page || {})) {
                    if (!Array.isArray(value)) continue;
                    const current = Array.isArray(mergedBody[pageKey]) ? mergedBody[pageKey] : [];
                    const combined = [...current, ...value];
                    mergedBody[pageKey] = [...new Map(combined.map((item,index) => [item?.id || `${pageKey}-${index}`, item])).values()];
                }
            };
            const total = Number(first.total) || (Array.isArray(first[key]) ? first[key].length : 0);
            const offsets = [];
            for (let offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) offsets.push(offset);
            let next = 0;
            const concurrency = params?.includeRelated === '1' ? 2 : 4;
            const workers = Array.from({length:Math.min(concurrency,offsets.length)}, async () => {
                while (next < offsets.length) {
                    const offset = offsets[next++];
                    const page = await requestPart(part,offset,PAGE_SIZE,params);
                    mergePage(page);
                }
            });
            await Promise.all(workers);
            return mergedBody;
        };
        const windowParams = part => {
            const params = window.netopsGetDataPartParams?.(part);
            return params?.windowed === '1' ? params : null;
        };
        const scopedParams = part => {
            const params = window.netopsGetDataPartParams?.(part);
            return params?.scoped === '1' ? params : null;
        };
        const loadPagedOrWindowed = (part,key) => {
            const params = windowParams(part);
            return params
                ? requestPart(part,Number(params.offset)||0,Number(params.limit)||20,params,part === syncMetaPart)
                : requestPaged(part,key,scopedParams(part)||{});
        };
        const taskByPart = {
            equipment: () => loadPagedOrWindowed('equipment','equipment'),
            nodes: () => loadPagedOrWindowed('nodes','nodes'),
            materials: () => loadPagedOrWindowed('materials','materials'),
            routes: () => loadPagedOrWindowed('routes','routes'),
            operations: () => loadPagedOrWindowed('operations','workOrders'),
            people: () => loadPagedOrWindowed('people','users'),
            activity: () => requestPart('activity'),
            audit: () => loadPagedOrWindowed('audit','auditLog'),
            planning: () => requestPart('planning',0,PAGE_SIZE,currentPage === 'planificar.html' ? {includeMapCatalog:'1'} : {})
        };
        const tasks = requestedParts.map(part => taskByPart[part]).filter(Boolean);
        const results = new Array(tasks.length);
        let taskIndex = 0;
        const loaders = Array.from({length:Math.min(4,tasks.length)}, async () => {
            while (taskIndex < tasks.length) {
                const index = taskIndex++;
                results[index] = await tasks[index]();
            }
        });
        await Promise.all(loaders);
        const mergeBody = body => {
            for (const [key,value] of Object.entries(body||{})) {
                if (Array.isArray(value) && Array.isArray(d[key])) {
                    const merged=[...d[key],...value];
                    d[key]=[...new Map(merged.map((item,index)=>[item?.id||`${key}-${index}`,item])).values()];
                } else d[key]=value;
            }
        };
        requestedParts.forEach((part,index) => {
            const body = results[index] || {};
            mergeBody(body);
            const params = windowParams(part);
            if (params) pageMeta[part] = {
                total:Number(body.total)||0,
                offset:Number(params.offset)||0,
                limit:Number(params.limit)||20,
                stats:body.stats||{},
                creators:Array.isArray(body.creators)?body.creators:[]
            };
        });
        for (let index=requestedParts.length;index<results.length;index+=1) mergeBody(results[index]||{});
    } catch (error) {
        if (error?.name === 'AbortError') {
            const timeoutError = new Error(`El servidor no respondio en ${Math.round(effectiveTimeoutMs / 1000)} segundos`);
            timeoutError.syncType = 'TIEMPO_DE_ESPERA';
            timeoutError.syncCode = 'REQUEST_TIMEOUT';
            throw timeoutError;
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
    const remoteState = {
        equipment: safeParse(d.equipment),
        nodes: safeParse(d.nodes),
        workOrders: safeParse(d.workOrders),
        technicians: safeParse(d.technicians),
        users: safeParse(d.users),
        techAccessLog: safeParse(d.techAccessLog),
        deletionRequests: safeParse(d.deletionRequests),
        auditLog: safeParse(d.auditLog),
        materials: safeParse(d.materials),
        routes: safeParse(d.routes),
        weekPlan: d.weekPlan || {},
        prepChecked: d.prepChecked || {},
        syncMeta: d.syncMeta || {},
        __loadedParts: requestedParts,
        __pageMeta: pageMeta
    };
    normalizeWorkOrderLocationList(remoteState.workOrders);
    return remoteState;
}
function applyStateData(data) {
    window.netopsPageMeta = data?.__pageMeta || {};
    state.equipment   = Array.isArray(data.equipment) ? data.equipment : [];
    state.nodes       = Array.isArray(data.nodes) ? data.nodes : [];
    state.workOrders  = Array.isArray(data.workOrders) ? data.workOrders : [];
    state.technicians = Array.isArray(data.technicians) ? data.technicians : [];
    state.users       = Array.isArray(data.users) ? data.users : [];
    state.techAccessLog = Array.isArray(data.techAccessLog) ? data.techAccessLog : [];
    state.deletionRequests = Array.isArray(data.deletionRequests) ? data.deletionRequests : [];
    state.auditLog = Array.isArray(data.auditLog) ? data.auditLog : [];
    state.materials   = Array.isArray(data.materials) ? data.materials : [];
    state.materialMovements = Array.isArray(data.materialMovements) ? data.materialMovements : (state.materialMovements || []);
    state.routes      = Array.isArray(data.routes) ? data.routes : [];
    state.weekPlan    = data.weekPlan || {};
    state.prepChecked = data.prepChecked || {};
    state.syncMeta    = data.syncMeta || {};
    normalizeStateTextEncoding(state);
    if (state.syncMeta.debug) {
        console.log('DEBUG WORKER LOG:', state.syncMeta.debug);
    }
    normalizeWorkOrderLocations();
    normalizeEquipmentData();
    syncTechniciansFromUsers();
}

function normalizeStateTextEncoding(root) {
    const seen = new WeakSet();
    const repair = value => {
        if (typeof repairDisplayText === 'function') return repairDisplayText(value);
        let text = String(value ?? '');
        for (let attempt = 0; attempt < 3 && (/[\u00c2\u00c3\u00ce\u00cf\u00e2\u00ee\u00f0]/.test(text) || /(?:ï¿½|â€|ðŸ)/.test(text)); attempt += 1) {
            try { text = decodeURIComponent(escape(text)); } catch (e) { break; }
        }
        return text;
    };
    const walk = value => {
        if (!value || typeof value !== 'object' || seen.has(value)) return;
        seen.add(value);
        Object.keys(value).forEach(key => {
            const item = value[key];
            if (typeof item === 'string' && (/[\u00c2\u00c3\u00ce\u00cf\u00e2\u00ee\u00f0]/.test(item) || /(?:ï¿½|â€|ðŸ)/.test(item))) value[key] = repair(item);
            else if (item && typeof item === 'object') walk(item);
        });
    };
    walk(root);
}

function getDataFingerprint(data) {
    const clean = cloneData(data);
    if (clean.syncMeta) delete clean.syncMeta;
    try {
        return JSON.stringify(clean);
    } catch(e) {
        return '';
    }
}

function renderAfterSync() {
    // Mapa principal: refrescar marcadores SIN hacer fit (preserva zoom/posicion del usuario)
    if (typeof updateMapMarkers === 'function') {
        try { updateMapMarkers({ fit: false }); } catch(e) { console.warn('No se pudo refrescar mapa', e); }
    }

    // Solo refrescar stats del mapa si existe
    if (typeof renderMapStats === 'function') {
        try { renderMapStats(); } catch(e) {}
    }

    // Detectar si hay un modal de detalles abierto (antenas o nodos)
    // Si está abierto, NO llamar renderAntenas/renderNodos completo (cerraria el panel)
    // sino solo refrescar la lista de detalles dentro del panel
    const antennaDetailOpen = !!document.getElementById('ant-detail-mo')?.classList.contains('open');
    const nodeDetailOpen = !!document.getElementById('node-detail-mo')?.classList.contains('open');

    const renderers = [
        'renderWOs',
        'renderRutas',
        'renderRutaSelect',
        'renderMateriales',
        'renderTecnicos',
        'renderUsuarios',
        'renderStats',
        'renderDeletionRequests',
        'renderNotificationCenter'
    ];
    renderers.forEach(name => {
        if (typeof window[name] === 'function') {
            try { window[name](); } catch(e) { console.warn(`No se pudo refrescar ${name}`, e); }
        }
    });

    // renderAntenas: si el panel de detalles esta abierto, solo refrescar la lista interna
    if (typeof renderAntenas === 'function') {
        if (antennaDetailOpen) {
            // Refrescar lista de detalles sin cerrar el panel
            if (typeof renderAntennaDetailList === 'function') {
                try { renderAntennaDetailList(); } catch(e) {}
            }
        } else {
            try { renderAntenas(); } catch(e) { console.warn('No se pudo refrescar renderAntenas', e); }
        }
    }

    // renderNodos: igual, si el panel de detalles esta abierto, solo refrescar la lista interna
    if (typeof renderNodos === 'function') {
        if (nodeDetailOpen) {
            if (typeof renderNodeDetailList === 'function') {
                try { renderNodeDetailList(); } catch(e) {}
            }
        } else {
            try { renderNodos(); } catch(e) { console.warn('No se pudo refrescar renderNodos', e); }
        }
    }

    // renderPlan: refrescar solo si no hay modal de plan abierto en planificar.js
    const planModalOpen = !!document.querySelector('#plan-stop-mo.open, #plan-detail-mo.open, #plan-general-mo.open');
    if (!planModalOpen && typeof renderPlan === 'function') {
        try {
            if (typeof refreshPlanAfterSync === 'function') refreshPlanAfterSync();
            else renderPlan();
        } catch(e) { console.warn('No se pudo refrescar renderPlan', e); }
    }

    // renderTechRoute solo en la pagina del tecnico
    if (typeof renderTechRoute === 'function') {
        try { renderTechRoute(); } catch(e) {}
    }

    // Refrescar mapa de planificacion en tiempo real si esta abierto
    const planMapContainer = document.getElementById('plan-fullscreen-container');
    if (planMapContainer && planMapContainer.style.display !== 'none') {
        if (typeof renderPlanFullscreenMap === 'function') {
            try { renderPlanFullscreenMap(false); } catch(e) { console.warn('No se pudo refrescar mapa de planificacion', e); }
        }
    }

    notifyNewTechAccess();
}

function isAdminAppPage() {
    const page = (location.pathname.split('/').pop() || '').toLowerCase();
    return page !== 'login.html' && page !== 'tecnico-ruta.html' && !!localStorage.getItem('token');
}

function getAccessTime(log) {
    const time = new Date(log?.at || log?.createdAt || 0).getTime();
    return Number.isFinite(time) ? time : 0;
}

function getAccessLabel(log) {
    const tech = (state.technicians || []).find(t => t.id === log.technicianId);
    const name = log.technicianName || tech?.nombre || 'Tecnico';
    const scope = log.scopeLabel || (log.routeScope === 'general' ? 'Plan general' : 'Ruta asignada');
    return `${name} entro a ${scope}`;
}

function notifyNewTechAccess() {
    if (!isAdminAppPage() || typeof notify !== 'function') return;
    const logs = (state.techAccessLog || [])
        .filter(log => log && !log.deletedAt)
        .slice()
        .sort((a, b) => getAccessTime(a) - getAccessTime(b));
    const latest = logs.reduce((max, log) => Math.max(max, getAccessTime(log)), 0);
    const seenKey = 'netops_last_seen_tech_access_at';
    const seen = Number(localStorage.getItem(seenKey) || 0);

    if (!seen) {
        if (latest) localStorage.setItem(seenKey, String(latest));
        return;
    }

    const fresh = logs.filter(log => getAccessTime(log) > seen);
    if (!fresh.length) return;
    const last = fresh[fresh.length - 1];
    notify(fresh.length === 1 ? getAccessLabel(last) : `${fresh.length} accesos nuevos. Ultimo: ${getAccessLabel(last)}`);
    localStorage.setItem(seenKey, String(Math.max(...fresh.map(getAccessTime))));
}

function isUserEditingNow() {
    const active = document.activeElement;
    const tag = active?.tagName?.toLowerCase();
    const page = (location.pathname.split('/').pop() || '').toLowerCase();
    const editableFocused = ['input', 'textarea', 'select'].includes(tag) || active?.isContentEditable;
    const modalOpen = !!document.querySelector('.mo.open');
    if (page === 'tecnico-ruta.html') return editableFocused || modalOpen;
    const fieldFocused = editableFocused || tag === 'button';
    const expandedMapOpen = !!document.querySelector('.map-expanded');
    const leafletPopupOpen = !!document.querySelector('.leaflet-popup');
    // Tambien proteger cuando el mapa de planificacion este abierto (el usuario puede estar navegando)
    const planMapOpen = (() => {
        const c = document.getElementById('plan-fullscreen-container');
        return c && c.style.display !== 'none';
    })();
    return fieldFocused || modalOpen || expandedMapOpen || leafletPopupOpen || planMapOpen;
}


async function syncFromCloud({ silent = true, force = false, parts = null } = {}) {
    if (syncBusy) return false;
    // NOTA: NO bloqueamos en isUserEditingNow() para lecturas de la nube.
    // El mapa expandido, popups de Leaflet o modales de solo-vista no impiden
    // que el admin vea los reportes del técnico. Solo bloqueamos si hay cambios
    // locales no guardados (isLocalDirty) para no sobreescribir ediciones.
    if (isLocalDirty() && !force) return false;

    syncBusy = true;
    try {
        const remoteState = await fetchRemoteState(8000, { parts });
        const remoteFingerprint = getDataFingerprint(remoteState);
        if (remoteFingerprint && remoteFingerprint === lastCloudFingerprint) return false;

        document.documentElement.classList.add('no-sidebar-transition');
        applyStateData(remoteState);
        saveLastGoodCloudState(remoteState, parts);
        window.netopsCloudLoadOk = true;
        window.netopsUsingCachedState = false;
        allowMutations();
        localStorage.removeItem(BACKUP_KEY);
        lastCloudFingerprint = getDataFingerprint(state);
        lastSyncToken = getSyncTokenFromState(state) || lastSyncToken;
        renderAfterSync();
        clearCloudOfflineStatus();
        setSyncStatus('Sincronizado', 'ok');
        if (!silent && typeof notify === 'function') notify('Datos actualizados desde la nube');
        requestAnimationFrame(() => requestAnimationFrame(() => {
            document.documentElement.classList.remove('no-sidebar-transition');
        }));
        return true;
    } catch(e) {
        console.log('No se pudo actualizar desde la nube', e);
        document.documentElement.classList.remove('no-sidebar-transition');
        if (!silent) setCloudOfflineStatus('Sin conexión');
        else if (syncFailCount >= 2) setCloudOfflineStatus('Conexión lenta');
        return false;
    } finally {
        syncBusy = false;
    }
}
async function retryPendingCloudSave({ silent = true } = {}) {
    if (syncBusy || !hasPendingLocalChanges() || isUserEditingNow()) return false;
    syncBusy = true;
    setSyncStatus('Subiendo pendientes...', 'warn');
    try {
        if (!getPendingChanges().length) queueStateChanges(getLocalBackupState(), state);
        await flushPendingChanges({ fallbackFull: true });
        localStorage.setItem(BACKUP_KEY, JSON.stringify(state));
        clearLocalDirty();
        clearCloudOfflineStatus();
        lastCloudFingerprint = getDataFingerprint(state);
        setSyncStatus('Sincronizado', 'ok');
        renderAfterSync();
        if (!silent && typeof notify === 'function') notify('Pendientes subidos a la nube');
        return true;
    } catch(e) {
        console.log('No se pudieron subir pendientes', e);
        setCloudOfflineStatus('Pendiente de subir');
        return false;
    } finally {
        syncBusy = false;
    }
}

let _versionBannerShown = false;

function _isTechRoutePage() {
    return (location.pathname.split('/').pop() || '').toLowerCase() === 'tecnico-ruta.html';
}

function _showVersionBanner(remoteVersion) {
    if (_versionBannerShown) return;
    _versionBannerShown = true;
    // Mostrar banner no invasivo con botón de actualizar
    let banner = document.getElementById('netops-version-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'netops-version-banner';
        banner.className = 'netops-version-banner';
        banner.style.cssText = 'position:fixed;bottom:70px;right:20px;z-index:9000;background:#0a3458;color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:12px 16px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);animation:slideUp .3s ease';
        banner.innerHTML = `<span>Hay una version nueva disponible. Cierra y abre la pagina cuando quieras actualizar.</span><button onclick="document.getElementById('netops-version-banner').remove()" style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:11px">Cerrar</button>`;
        document.body.appendChild(banner);
    }
}

async function checkAppVersion({ force = false } = {}) {
    // En la página del técnico nunca recargar automáticamente
    if (_isTechRoutePage()) return false;
    const now = Date.now();
    if (!force && now - lastVersionCheckAt < 60000) return false;
    lastVersionCheckAt = now;
    try {
        const res = await fetch(`version.json?ts=${now}`, { cache: 'no-store' });
        if (!res.ok) return false;
        const info = await res.json();
        const remoteVersion = String(info.version || '').trim();
        if (!remoteVersion) return false;
        const seenKey = 'netops_app_version_seen';
        const seen = localStorage.getItem(seenKey) || APP_VERSION;
        localStorage.setItem(seenKey, remoteVersion);
        if (remoteVersion === seen || remoteVersion === APP_VERSION) return false;
        // Nunca recargar automáticamente — solo mostrar banner
        _showVersionBanner(remoteVersion);
        return false;
    } catch(e) {
        return false;
    }
}

function startAutoSync() {
    if (syncTimer) clearInterval(syncTimer);
    // Un minuto conserva actualizacion cercana a tiempo real y reduce 67 %
    // del sondeo inactivo frente al intervalo anterior de 20 segundos.
    syncTimer = setInterval(() => {
        autoSyncTick({ silent: true });
    }, 60000);
    if (!syncListenersBound) {
        syncListenersBound = true;
        const scheduleWakeSync = ({ silent = true, force = true, delay = 1200 } = {}) => {
            clearTimeout(syncWakeTimer);
            syncWakeTimer = setTimeout(() => {
                syncWakeTimer = null;
                autoSyncTick({ silent, force });
            }, delay);
        };
        window.addEventListener('online', () => {
            scheduleWakeSync({ silent: false, delay: 0 });
        });
        window.addEventListener('focus', () => {
            scheduleWakeSync();
        });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                scheduleWakeSync();
            }
        });
    }
}
async function loadDB(options = {}) {
    // La retroalimentación de red es global. Se puede silenciar únicamente
    // para procesos automáticos pasando { globalFeedback:false }.
    const showOverlay = options.globalFeedback !== false;
    const overlayDelay = Number.isFinite(Number(options.overlayDelay)) ? Math.max(0, Number(options.overlayDelay)) : 0;
    const loadingTitle = options.loadingTitle || 'Cargando datos';
    const loadingSubtitle = options.loadingSubtitle || 'Consultando la informacion actualizada.';
    const loadingOperation = showOverlay ? beginLoadingOperation(loadingTitle, loadingSubtitle, overlayDelay) : 0;
    setSyncStatus('Cargando...', 'warn');

    try {
        let remoteState;
        try {
            remoteState = await fetchRemoteState(12000, { parts: options.parts });
        } catch (firstError) {
            console.warn('Primer intento de carga fallido; reintentando.', firstError);
            remoteState = await fetchRemoteState(20000, { parts: options.parts });
        }

        // Un guardado fallido deja deltas en el navegador. Nunca aceptar el
        // estado remoto (que puede haber quedado parcial) ni borrar esa cola
        // antes de intentar recuperarla.
        const pendingChanges = getPendingChanges();
        if (pendingChanges.length) {
            setSyncStatus('Recuperando cambios...', 'warn');
            await postChangesToCloud(pendingChanges);
            localStorage.removeItem(PENDING_CHANGES_KEY);
            clearLocalDirty();
            remoteState = await fetchRemoteState(20000, { parts: options.parts });
        }
        applyStateData(remoteState);
        saveLastGoodCloudState(remoteState, options.parts);
        localStorage.removeItem(BACKUP_KEY);
        localStorage.removeItem(PENDING_CHANGES_KEY);
        clearLocalDirty();
        clearCloudOfflineStatus();
        lastCloudFingerprint = getDataFingerprint(state);
        lastSyncToken = getSyncTokenFromState(state);
        // IMPORTANTE: la referencia de cambios debe partir del estado recién
        // cargado desde D1. Sin esto, el primer guardado compara contra {} y
        // considera modificadas todas las colecciones.
        _previousStateSaved = cloneData(state);
        allowMutations();
        setSyncStatus('Sincronizado', 'ok');
    } catch(e) {
        console.log('No se pudo cargar desde Cloudflare/D1.', e);
        setSyncStatus('Error de sincronizacion', 'warn');
        window.netopsCloudLoadOk = false;
        const cached = getLastGoodCloudState(options.parts);
        if (cached?.data) {
            applyStateData(cached.data);
            _previousStateSaved = cloneData(state);
            window.netopsUsingCachedState = true;
        } else {
            window.netopsUsingCachedState = false;
        }
        const reason = describeSyncError(e);
        blockMutationsFor(e);
        if (typeof notify === 'function') {
            notify(cached?.data
                ? `${reason} No se ejecuto ningun cambio y se muestra la ultima informacion confirmada.`
                : `${reason} No se ejecuto ningun cambio.`, 'warn');
        }
    } finally {
        if (showOverlay) endLoadingOperation(loadingOperation);
    }

    startAutoSync();
    notifyNewTechAccess();

    console.log(`Datos cargados | Equipos: ${state.equipment.length} | Nodos: ${(state.nodes||[]).length} | Rutas: ${state.routes.length}`);
}

let _previousStateSaved = null;

async function runSaveDB() {
    if (rejectBlockedMutation()) return false;
    if (syncBusy) {
        setSyncStatus('Guardando...', 'warn');
        await new Promise(resolve => setTimeout(resolve, 60));
    }

    syncBusy = true;
    lastLocalSaveAt = Date.now();
    const suppressLoading = Number(window.netopsSuppressLoadingUntil || 0) > Date.now();
    if (suppressLoading) window.netopsSuppressLoadingUntil = 0;
    const loadingOperation = !suppressLoading
        ? beginLoadingOperation('Guardando informacion', 'Confirmando los cambios en la nube.', 160)
        : 0;
    setSyncStatus('Guardando...', 'warn');
    state.syncMeta = { updatedAt: new Date().toISOString() };
    normalizeEquipmentData();
    syncTechniciansFromUsers();

    // Calcular cambios delta respecto al estado previo guardado
    const prevState = _previousStateSaved || {};
    const changes = buildStateChanges(prevState, state);

    try {
        if (changes.length > 0) {
            // Estrategia 1: enviar solo los cambios (más rápido)
            await postChangesToCloud(changes);
        } else {
            // Sin cambios detectados: forzar sync de metadatos
            await postChangesToCloud([{ key: 'syncMeta', value: state.syncMeta }]);
        }
        _previousStateSaved = cloneData(state);
        localStorage.removeItem(BACKUP_KEY);
        localStorage.removeItem(PENDING_CHANGES_KEY);
        clearLocalDirty();
        clearCloudOfflineStatus();
        setSyncStatus('Guardado', 'ok');
        lastCloudFingerprint = getDataFingerprint(state);
        setTimeout(() => setSyncStatus('Sincronizado', 'ok'), 1200);
        return true;
    } catch(e) {
        // En modo relacional NUNCA subir el estado completo como fallback.
        // Conservamos solo los registros delta para reintentar después.
        console.log('No se pudo guardar el delta relacional', e);
        restoreLastConfirmedState();
        setSyncStatus('No guardado', 'err');
        if (typeof notify === 'function') notify(`${describeSyncError(e)} No se ejecuto el cambio; se restauro la ultima version confirmada.`, 'err');
        return false;
    } finally {
        syncBusy = false;
        setTimeout(() => endLoadingOperation(loadingOperation), 220);
        if (typeof renderNotificationCenter === 'function') renderNotificationCenter();
    }
}

async function saveDB() {
    const run = saveQueue.then(runSaveDB, runSaveDB);
    saveQueue = run.catch(() => {});
    return run;
}

// Guarda un único registro de forma rápida sin enviar todo el estado
async function saveRecord(listKey, record) {
    if (rejectBlockedMutation()) return false;
    if (!listKey || !record?.id) {
        console.warn('saveRecord: listKey o record.id faltante');
        return saveDB();
    }
    const loadingOperation = beginLoadingOperation('Guardando informacion', 'Confirmando los cambios en la nube.', 160);
    setSyncStatus('Guardando...', 'warn');
    try {
        await postRecordToCloud(listKey, record);
        // Actualizar el estado local y prevState para que el cambio persista de inmediato
        if (state[listKey] && Array.isArray(state[listKey])) {
            const idx = state[listKey].findIndex(item => item?.id === record.id);
            if (idx >= 0) state[listKey][idx] = cloneData(record);
            else state[listKey].unshift(cloneData(record));
        }
        if (_previousStateSaved) {
            const arr = _previousStateSaved[listKey];
            if (Array.isArray(arr)) {
                const idx = arr.findIndex(item => item?.id === record.id);
                if (idx >= 0) arr[idx] = cloneData(record);
                else arr.push(cloneData(record));
            }
        }
        clearCloudOfflineStatus();
        setSyncStatus('Guardado', 'ok');
        setTimeout(() => setSyncStatus('Sincronizado', 'ok'), 1200);
        if (typeof notify === 'function') notify('Guardado correctamente.');
        return true;
    } catch(e) {
        console.log('saveRecord fallo; se cancela el cambio local', e);
        restoreLastConfirmedState();
        setSyncStatus('No guardado', 'err');
        if (typeof notify === 'function') notify(`${describeSyncError(e)} No se ejecuto el cambio; se restauro la ultima version confirmada.`, 'err');
        return false;
    } finally {
        setTimeout(() => endLoadingOperation(loadingOperation), 220);
    }
}

async function saveRecordWithAudit(listKey,record,auditStart=0) {
    let ok=await saveRecord(listKey,record);
    if(ok)for(const audit of (state.auditLog||[]).slice(Math.max(0,Number(auditStart)||0)))ok=(await saveRecord('auditLog',audit))&&ok;
    return ok;
}

function saveDBInBackground({ notifyUser = true, delay = 250 } = {}) {
    window.setTimeout(() => {
        saveDB().then(ok => {
            if (notifyUser && ok && typeof notify === 'function') notify('Guardado correctamente.');
        });
    }, delay);

    return true;
}

// ==================== IMPORTACION CSV RUTAS
// ==================== IMPORTACION CSV RUTAS ====================
function parseCoord(val) {
    if (!val) return NaN;
    let s = val.toString().trim();
    if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
    return parseFloat(s);
}

async function impCSVRutas(input) {
    if (typeof userHasRole === 'function' && !userHasRole('administrador', 'admin')) {
        if (typeof notify === 'function') notify('Solo el administrador puede subir rutas.', 'err');
        if (input) input.value = '';
        return;
    }
    const files = input.files;
    if (!files.length) return;

    let rutasAgregadas = 0;

    for (let f = 0; f < files.length; f++) {
        const file = files[f];
        const defaultName = file.name.replace(/\.[^/.]+$/, "");
        const text = await file.text();
        const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);

        let rawCoords = [];

        for (let i = 0; i < lines.length; i++) {
            if (i === 0 && lines[i].toLowerCase().includes('lat')) continue;

            let sep = lines[i].includes(';') ? ';' : (lines[i].includes('\t') ? '\t' : ',');
            const cols = lines[i].split(new RegExp(sep + '(?=(?:(?:[^"]*"){2})*[^"]*$)', 'g'))
                                .map(c => c.replace(/^"|"$/g, '').trim());

            let pNom = '', lat = NaN, lng = NaN;

            if (cols.length >= 4) {
                lat = parseCoord(cols[2]);
                lng = parseCoord(cols[3]);
                pNom = cols[1];
            } else if (cols.length === 3) {
                if (!isNaN(parseCoord(cols[1])) && !isNaN(parseCoord(cols[2]))) {
                    lat = parseCoord(cols[1]);
                    lng = parseCoord(cols[2]);
                    pNom = cols[0];
                }
            } else if (cols.length >= 2) {
                lat = parseCoord(cols[0]);
                lng = parseCoord(cols[1]);
            }

            if (!isNaN(lat) && !isNaN(lng)) {
                rawCoords.push({ lat, lng, name: pNom || `Punto ${rawCoords.length + 1}` });
            }
        }

        // Compresión inteligente
        let coords = rawCoords.length > 80 
            ? rawCoords.filter((_, i) => i % Math.ceil(rawCoords.length / 80) === 0 || i === rawCoords.length - 1)
            : rawCoords;

        if (coords.length >= 2) {
            state.routes.push({
                id: gid('r'),
                n: defaultName,
                coords: coords
            });
            rutasAgregadas++;
        }
    }

    if (rutasAgregadas > 0) {
        saveDB();
        if (typeof renderRutas === 'function') renderRutas();
        if (typeof renderRutaSelect === 'function') renderRutaSelect();
        notify(`${rutasAgregadas} ruta(s) importada(s) correctamente`);
    } else {
        notify('No se encontraron coordenadas válidas en los archivos', 'err');
    }

    input.value = '';
}

// ==================== OTRAS FUNCIONES UTILES ====================
function getNearestRegion(lat, lng) {
    if (isNaN(lat) || isNaN(lng)) return '';
    let minD = Infinity, reg = '';
    REGS.forEach(r => {
        if (!r.lat) return;
        let d = Math.sqrt(Math.pow(r.lat - lat, 2) + Math.pow(r.lng - lng, 2));
        if (d < minD) { minD = d; reg = r.id; }
    });
    return reg;
}

function applyEquipmentRegion(eq) {
    const lat = safeFloat(eq?.lat);
    const lng = safeFloat(eq?.lng);
    if (!eq || isNaN(lat) || isNaN(lng)) return '';
    eq.lat = lat;
    eq.lng = lng;
    eq.region = getNearestRegion(lat, lng);
    return eq.region;
}

function replaceEquipmentReferences(fromId, toId) {
    (state.workOrders || []).forEach(wo => {
        if (wo.equipmentId === fromId) wo.equipmentId = toId;
    });

    const visitStops = stops => {
        if (!Array.isArray(stops)) return;
        stops.forEach(stop => {
            if (stop.equipmentId === fromId) stop.equipmentId = toId;
        });
    };

    Object.values(state.weekPlan || {}).forEach(plan => {
        if (!plan || typeof plan !== 'object') return;
        Object.values(plan).forEach(value => {
            if (Array.isArray(value)) visitStops(value);
        });
        if (Array.isArray(plan._generalPlans)) {
            plan._generalPlans.forEach(gp => visitStops(gp.stops));
        }
    });
}

function addEquipmentUnique(eq) {
    applyEquipmentRegion(eq);
    const duplicate = equipmentDuplicateOf(eq.name, eq.lat, eq.lng);
    if (duplicate) return { ok: false, duplicate };
    state.equipment.push({ id: gid('e'), ...eq });
    normalizeEquipmentData();
    return { ok: true };
}

// Exportar funciones para que puedan ser usadas desde otros archivos
window.state = state;
window.loadDB = loadDB;
window.fetchDataPage = fetchDataPage;
window.saveDB = saveDB;
window.deletePlansFromCloud = deletePlansFromCloud;
window.saveRecord = saveRecord;
window.saveDBInBackground = saveDBInBackground;
window.gid = gid;
window.safeFloat = safeFloat;
window.te = te;
window.vl = vl;
window.vc = vc;
window.pl = pl;
window.pc = pc;
window.rById = rById;
window.getAntennaStatus = getAntennaStatus;
window.getNearestRegion = getNearestRegion;
window.getLocationDisplay = getLocationDisplay;
window.applyEquipmentRegion = applyEquipmentRegion;
window.normalizeEquipmentData = normalizeEquipmentData;
window.equipmentDuplicateOf = equipmentDuplicateOf;
window.addEquipmentUnique = addEquipmentUnique;

window.getEquipmentLinkedNodeIds = getEquipmentLinkedNodeIds;
window.getEquipmentLinkedNodes = getEquipmentLinkedNodes;
window.getNodeLinkedEquipment = getNodeLinkedEquipment;
window.getEquipmentRelationLabel = getEquipmentRelationLabel;
window.getNodeRelationLabel = getNodeRelationLabel;
window.impCSVRutas = impCSVRutas;
window.syncFromCloud = syncFromCloud;
window.retryPendingCloudSave = retryPendingCloudSave;
window.hasPendingLocalChanges = hasPendingLocalChanges;
window.postWorkOrderReportToCloud = postWorkOrderReportToCloud;
window.checkAppVersion = checkAppVersion;
window.startAutoSync = startAutoSync;

console.log("api.js cargado correctamente");

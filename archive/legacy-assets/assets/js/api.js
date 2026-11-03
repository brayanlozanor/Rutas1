// ==========================================
// assets/js/api.js
// Contiene: state, loadDB, saveDB, helpers y funciones compartidas
// ==========================================

function getDefaultApiBase() {
    const host = location.hostname.replace(/\.+$/, '');
    const isLocal = location.protocol === 'file:' || !host || host === 'localhost' || host === '127.0.0.1' || host === '::1';
    if (isLocal) return localStorage.getItem('netops_api_url') || 'https://netops-api.asistencias.workers.dev';
    if (host === 'netops-api.asistencias.workers.dev') return location.origin;
    return localStorage.getItem('netops_api_url') || 'https://netops-api.asistencias.workers.dev';
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
    materials: [],
    weekPlan: {},
    routes: [],
    prepChecked: {},
    syncMeta: {}
};
let syncTimer = null;
let syncBusy = false;
let lastCloudFingerprint = '';

let loadingTimer = null;

function ensureLoadingOverlay() {
    let overlay = document.getElementById('netops-loading');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'netops-loading';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-card">
                <div class="loading-spinner"></div>
                <strong id="netops-loading-title">Esperando...</strong>
                <span id="netops-loading-sub">Sincronizando información con la nube.</span>
            </div>`;
        document.body.appendChild(overlay);
    }
    return overlay;
}

function showLoading(title = 'Esperando...', subtitle = 'Sincronizando información con la nube.') {
    if (!document.body) return;
    const overlay = ensureLoadingOverlay();
    const titleEl = document.getElementById('netops-loading-title');
    const subEl = document.getElementById('netops-loading-sub');
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = subtitle;
    overlay.classList.add('show');
}

function hideLoading() {
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

function setSyncStatus(text, mode = 'ok') {
    const pills = document.querySelectorAll('[data-sync-status]');
    pills.forEach(pill => {
        pill.textContent = text;
        pill.className = `sync-pill ${mode}`;
    });
}

function hasRemoteContent(data) {
    if (!data || typeof data !== 'object') return false;
    const keys = ['equipment', 'nodes', 'workOrders', 'users', 'routes', 'technicians', 'deletionRequests'];
    return keys.some(key => Array.isArray(data[key]) && data[key].length > 0);
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

async function postStateToCloud() {
    const res = await fetch(`${API}/api/data`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
    });
    if (!res.ok) throw new Error(`Error nube ${res.status}`);
    lastCloudFingerprint = getDataFingerprint(state);
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

function normalizeName(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
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

const te = t => ({ptp:'📡', ptmp:'📶', sector:'🔺', mikrotik:'🔧', balancer:'⚖️', antenna:'📻', tower:'🗼'}[t] || '📻');

const vl = v => ({comunidad:'🏠 Comunidad', punto_venta:'🏪 Pto Venta', torre:'🗼 Torre', troncal:'🛤️ Troncal'}[v] || v || '');

const vc = v => ({comunidad:'badge bon', punto_venta:'badge bwa', torre:'badge bwa', troncal:'badge bwa'}[v] || 'badge bty');

const pl = p => ({muy_alta:'🚨 Muy Alta', alta:'🔴 Alta', media:'🟡 Media', baja:'🟢 Baja'}[p] || p);

const pc = p => ({muy_alta:'var(--re)', alta:'#e67e22', media:'var(--am)', baja:'var(--gr)'}[p] || 'var(--mu)');

const priorityRank = p => ({ muy_alta: 0, alta: 1, media: 2, baja: 3 }[p] ?? 9);
const visitTypeRank = type => ({ torre: 0, troncal: 1, punto_venta: 2, comunidad: 3 }[type] ?? 9);

function comparePriority(a, b) {
    return visitTypeRank(a?.visitType) - visitTypeRank(b?.visitType) ||
        priorityRank(a?.priority) - priorityRank(b?.priority) ||
        new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0);
}

function sortDetailsByPriority(details) {
    return (Array.isArray(details) ? details : []).slice().sort(comparePriority);
}

function parseOptionalLocation(value) {
    const rawLocation = String(value || '').trim();
    if (!rawLocation) return { location: '', lat: '', lng: '', valid: true };
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
                valid: true
            };
        }
    }
    return { location: rawLocation, lat: '', lng: '', valid: false };
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

function getEntityOpenDetails(type, id) {
    return (state.workOrders || []).filter(order => {
        if (!isOpenOrder(order)) return false;
        if (type === 'equipment') return order.equipmentId === id;
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
    return getPriorityStatusFromDetails(getEntityOpenDetails(type, id));
}

function getEntityPriorityText(status) {
    return `Crítico: tiene prioridad muy alta o 3+ altas. Atención: tiene alta, 2+ medias o 4+ bajas. Pendiente: tiene media/baja. Despejado: sin detalles pendientes.`;
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
    const keys = ['equipment', 'nodes', 'workOrders', 'technicians', 'users', 'techAccessLog', 'deletionRequests', 'materials', 'routes'];
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
            const merged = { ...prev, ...copy };
            if (prev.deletedAt || copy.deletedAt) merged.deletedAt = prev.deletedAt || copy.deletedAt;
            if (prev.archivedAt || copy.archivedAt) merged.archivedAt = prev.archivedAt || copy.archivedAt;
            byKey.set(key, merged);
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
    const out = { ...cloneData(remote), ...cloneData(local) };
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


async function fetchRemoteState(timeoutMs = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${API}/api/data?t=${Date.now()}`, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`Error nube ${res.status}`);
    const d = await res.json();
    const remoteState = {
        equipment: safeParse(d.equipment),
        nodes: safeParse(d.nodes),
        workOrders: safeParse(d.workOrders),
        technicians: safeParse(d.technicians),
        users: safeParse(d.users),
        techAccessLog: safeParse(d.techAccessLog),
        deletionRequests: safeParse(d.deletionRequests),
        materials: safeParse(d.materials),
        routes: safeParse(d.routes),
        weekPlan: d.weekPlan || {},
        prepChecked: d.prepChecked || {},
        syncMeta: d.syncMeta || {}
    };
    normalizeWorkOrderLocationList(remoteState.workOrders);
    return remoteState;
}
function applyStateData(data) {
    state.equipment   = Array.isArray(data.equipment) ? data.equipment : [];
    state.nodes       = Array.isArray(data.nodes) ? data.nodes : [];
    state.workOrders  = Array.isArray(data.workOrders) ? data.workOrders : [];
    state.technicians = Array.isArray(data.technicians) ? data.technicians : [];
    state.users       = Array.isArray(data.users) ? data.users : [];
    state.techAccessLog = Array.isArray(data.techAccessLog) ? data.techAccessLog : [];
    state.deletionRequests = Array.isArray(data.deletionRequests) ? data.deletionRequests : [];
    state.materials   = Array.isArray(data.materials) ? data.materials : [];
    state.routes      = Array.isArray(data.routes) ? data.routes : [];
    state.weekPlan    = data.weekPlan || {};
    state.prepChecked = data.prepChecked || {};
    state.syncMeta    = data.syncMeta || {};
    normalizeWorkOrderLocations();
    normalizeEquipmentData();
    syncTechniciansFromUsers();
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
    const renderers = [
        'renderAntenas',
        'renderWOs',
        'renderPlan',
        'renderRutas',
        'renderRutaSelect',
        'renderMateriales',
        'renderTecnicos',
        'renderUsuarios',
        'renderNodos',
        'renderTechRoute',
        'updateMapMarkers',
        'renderStats'
    ];
    renderers.forEach(name => {
        if (typeof window[name] === 'function') {
            try { window[name](); } catch(e) { console.warn(`No se pudo refrescar ${name}`, e); }
        }
    });
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
    if (page === 'tecnico-ruta.html') return editableFocused;
    const fieldFocused = editableFocused || tag === 'button';
    const modalOpen = !!document.querySelector('.mo.open');
    const expandedMapOpen = !!document.querySelector('.map-expanded');
    const leafletPopupOpen = !!document.querySelector('.leaflet-popup');
    return fieldFocused || modalOpen || expandedMapOpen || leafletPopupOpen;
}


async function syncFromCloud({ silent = true, force = false } = {}) {
    if (syncBusy) return false;
    if (!force && isUserEditingNow()) return false;
    if (isLocalDirty() && !force) return false;

    syncBusy = true;
    try {
        const remoteState = await fetchRemoteState(8000);
        const remoteFingerprint = getDataFingerprint(remoteState);
        if (remoteFingerprint && remoteFingerprint === lastCloudFingerprint) return false;

        applyStateData(remoteState);
        localStorage.setItem('netops_backup', JSON.stringify(state));
        lastCloudFingerprint = getDataFingerprint(state);
        renderAfterSync();
        setSyncStatus('Sincronizado', 'ok');
        if (!silent && typeof notify === 'function') notify('Datos actualizados desde la nube');
        return true;
    } catch(e) {
        console.log('No se pudo actualizar desde la nube', e);
        setSyncStatus('Sin conexión', 'err');
        return false;
    } finally {
        syncBusy = false;
    }
}
function startAutoSync() {
    if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
    }
    syncTimer = setInterval(() => {
        syncFromCloud({ silent: true }).catch(e => console.log('Auto sync fallo', e));
    }, 8000);
}


async function loadDB() {
    delayedLoading('Cargando...', 'Esperando datos de la nube.', 250);
    setSyncStatus('Cargando...', 'warn');

    let localState = {};
    try {
        const ls = localStorage.getItem('netops_backup');
        if (ls) localState = JSON.parse(ls) || {};
    } catch(e) {}

    try {
        const remoteState = await fetchRemoteState(10000);

        if (isLocalDirty()) {
            applyStateData(mergeAppStates(remoteState, localState));
            state.syncMeta = { updatedAt: new Date().toISOString() };
            await postStateToCloud();
            clearLocalDirty();
        } else {
            applyStateData(hasRemoteContent(remoteState) ? remoteState : mergeAppStates(localState, remoteState));
        }

        localStorage.setItem('netops_backup', JSON.stringify(state));
        lastCloudFingerprint = getDataFingerprint(state);
        setSyncStatus('Sincronizado', 'ok');
    } catch(e) {
        console.log('Servidor offline. Usando respaldo local.', e);
        applyStateData(localState);
        setSyncStatus('Solo esta laptop', 'err');
        if (typeof notify === 'function') notify('No se pudo cargar la nube. Se mostró el respaldo de esta laptop.', 'err');
    } finally {
        stopDelayedLoading();
    }

    startAutoSync();
    notifyNewTechAccess();

    console.log(`Datos cargados | Equipos: ${state.equipment.length} | Nodos: ${(state.nodes||[]).length} | Rutas: ${state.routes.length}`);
}

async function saveDB() {
    while (syncBusy) {
        await new Promise(resolve => setTimeout(resolve, 250));
    }

    syncBusy = true;
    delayedLoading('Guardando...', 'Subiendo cambios para todos los usuarios.', 400);
    setSyncStatus('Guardando...', 'warn');

    state.syncMeta = { updatedAt: new Date().toISOString() };
    normalizeEquipmentData();
    syncTechniciansFromUsers();
    markLocalDirty();

    try {
        localStorage.setItem('netops_backup', JSON.stringify(state));
    } catch(e) {
        console.error('Error guardando en localStorage', e);
    }

    try {
        const remoteState = await fetchRemoteState(8000);
        applyStateData(mergeAppStates(remoteState, state));
        state.syncMeta = { updatedAt: new Date().toISOString() };
        localStorage.setItem('netops_backup', JSON.stringify(state));
        await postStateToCloud();
        clearLocalDirty();
        setSyncStatus('Sincronizado', 'ok');
        renderAfterSync();
        return true;
    } catch(e) {
        console.log('No se pudo guardar en la nube', e);
        setSyncStatus('Pendiente de subir', 'err');
        if (typeof notify === 'function') notify('Guardado solo en esta laptop. Revisa internet/API porque no subió a la nube.', 'err');
        return false;
    } finally {
        stopDelayedLoading();
        syncBusy = false;
    }
}

// ==================== IMPORTACIÓN CSV RUTAS
// ==================== IMPORTACIÓN CSV RUTAS ====================
function parseCoord(val) {
    if (!val) return NaN;
    let s = val.toString().trim();
    if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
    return parseFloat(s);
}

async function impCSVRutas(input) {
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
        notify(`${rutasAgregadas} ruta(s) importada(s) correctamente ✓`);
    } else {
        notify('No se encontraron coordenadas válidas en los archivos', 'err');
    }

    input.value = '';
}

// ==================== OTRAS FUNCIONES ÚTILES ====================
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
window.saveDB = saveDB;
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
window.applyEquipmentRegion = applyEquipmentRegion;
window.normalizeEquipmentData = normalizeEquipmentData;
window.equipmentDuplicateOf = equipmentDuplicateOf;
window.addEquipmentUnique = addEquipmentUnique;
window.impCSVRutas = impCSVRutas;
window.syncFromCloud = syncFromCloud;
window.startAutoSync = startAutoSync;

console.log("✅ api.js cargado correctamente");

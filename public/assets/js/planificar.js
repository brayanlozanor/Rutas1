const GENERAL_PLAN_DAY = { id: 'general', label: 'General' };
const SHARED_PLAN_ID = '__shared__';
const PLAN_DAYS = [
    GENERAL_PLAN_DAY,
    { id: 'lunes', label: 'Lunes' },
    { id: 'martes', label: 'Martes' },
    { id: 'miercoles', label: 'Miercoles' },
    { id: 'jueves', label: 'Jueves' },
    { id: 'viernes', label: 'Viernes' },
    { id: 'sabado', label: 'Sabado' },
    { id: 'domingo', label: 'Domingo' }
];

let selectedTechId = '';
let selectedDay = 'general';
let selectedGeneralPlanId = 'general-1';
let selectedCalendarDate = '';
let selectedEquipmentId = '';
let planMap = null;
let planRouteLayer = null;
let planRouteRenderId = 0;
let planRouteRenderAt = 0;  // timestamp del último render de ruta iniciado
let planMarkers = [];
let planAntennaMarkers = [];
let planMapExpanded = false;
let planFullscreenMap = null;
let planFullscreenLayerGroup = null;
let planFullscreenRouteLayer = null;
let planFullscreenDirectRouteLayer = null;
let planFullscreenLinkLayer = null;
let planFullscreenMarkerLayer = null;
let planFullscreenEntityMarkers = [];
let planFullscreenLabelRaf = 0;
let planFullscreenRouteRenderId = 0;
let planFullscreenNamesVisible = false;
let planFullscreenStopNamesVisible = false;
let planFullscreenIconsMode = false;
const planRoadRouteCache = new Map();
const planRoadRouteInFlight = new Map();
let captureMap = null;
let captureMarker = null;
let editingStopContext = null;
let routeFullMap = null;
let routeFullLayer = null;
let routeFullMarkers = [];
let technicianDayMap = null;
let technicianDayMapLayer = null;
let currentPlanTechRouteLink = '';
let lastFocusedStartedStopId = '';
const expandedResolvedStops = new Set();
let planCardDisplayMode = 'all';
let activePlanCardIndex = 0;
let expandedPendingStopId = '';
const collapsedTechnicianStopIds = new Set();
let expandedCompletedStopId = '';
const planEvidenceGalleries = new Map();
let technicianInstallationPhotos = [];
let technicianNewEntryMode = 'installation';
let technicianInstallationSelectedNodeId = '';
let adminPlannerWeekStart = '';
let planCalendarExpanded = false;
let adminWeekMapScope = 'general';
let adminWeekRouteMap = null;
let adminWeekRouteLayer = null;
let adminWeekRouteRenderId = 0;
let technicianSummaryMode = 'day';
let technicianCompletionDetailId = '';
let technicianCompletionPhotos = [];
let pendingPlanAssignmentResolver = null;

function isPlanReadOnly() {
    return isTechnicianPlanView();
}

function canManagePlanStops() {
    return typeof userHasRole === 'function' && userHasRole('administrador', 'admin', 'soporte');
}

function canAssignPlanTechnicians() {
    return canManagePlanStops() && !isTechnicianPlanView();
}

function isTechnicianPlanView() {
    if (typeof window !== 'undefined' && window.location && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const v = (params.get('view') || '').toLowerCase().trim();
        if (v === 'tecnico' || v === 'tech' || v === 'mobile' || v === 'celular') return true;
        if (v === 'admin' || v === 'desktop' || v === 'pc') return false;
    }

    const isMobileScreen = typeof window !== 'undefined' && (
        (typeof window.innerWidth === 'number' && window.innerWidth > 0 && window.innerWidth <= 768) ||
        (window.matchMedia && window.matchMedia('(max-width: 768px)').matches)
    );

    if (typeof userHasRole === 'function' && userHasRole('tecnico')) return true;

    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    const role = typeof normalizeRole === 'function' ? normalizeRole(user?.role) : String(user?.role || '').toLowerCase().trim();
    if (role === 'tecnico') return true;

    const isAdminOrOffice = role === 'administrador' || role === 'admin' || role === 'soporte' || role === 'atencion_clientes' ||
        (typeof userHasRole === 'function' && userHasRole('administrador', 'admin', 'soporte', 'atencion_clientes'));

    if (isAdminOrOffice) {
        return Boolean(isMobileScreen);
    }

    if (typeof document !== 'undefined' && document.body && (
        document.body.classList.contains('plan-technician-view') ||
        (document.body.dataset && document.body.dataset.techView)
    )) {
        return true;
    }

    const username = (user?.username || '').toLowerCase();
    const name = (user?.name || '').toLowerCase();
    const userId = String(user?.id || '');
    if (Array.isArray(state?.technicians) && state.technicians.some(t =>
        !t.deletedAt && (
            (userId && String(t.userId || '') === userId) ||
            (t.id && String(t.id) === userId) ||
            (username && (t.usuario || '').toLowerCase() === username) ||
            (name && (t.nombre || '').toLowerCase() === name)
        )
    )) {
        return true;
    }

    return Boolean(isMobileScreen);
}

function getLoggedTechnicianId() {
    if (!isTechnicianPlanView()) return '';
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    const username = normalizeName(user?.username || '');
    const userDisplayName = normalizeName(user?.name || '');
    const userFirstName = userDisplayName.split(' ')[0] || '';
    const userId = String(user?.id || '').trim();

    const generalPlans = (state.weekPlan?.[SHARED_PLAN_ID]?._generalPlans || []).filter(p => p && !p.deletedAt);
    const planHasTechId = id => {
        const clean = String(id || '').trim();
        if (!clean) return false;
        return generalPlans.some(p =>
            String(p.assignedTechId || '').trim() === clean ||
            (Array.isArray(p.assignedTechIds) && p.assignedTechIds.map(String).includes(clean))
        );
    };

    // 1. Buscar TODOS los registros de técnicos que correspondan al usuario logueado
    const matchingTechs = (state.technicians || []).filter(tech => {
        if (!tech || tech.deletedAt) return false;
        const tName = normalizeName(tech.nombre || tech.name || '');
        const tUser = normalizeName(tech.usuario || '');
        return (
            (userId && String(tech.userId || '') === userId) ||
            (tech.id && String(tech.id) === userId) ||
            (username && tUser === username) ||
            (username && normalizeName(tech.nombre || tech.name || '') === username) ||
            (userDisplayName && normalizeName(tech.nombre || tech.name || '') === userDisplayName) ||
            (userDisplayName && userDisplayName.length >= 3 && tName && (tName.includes(userDisplayName) || userDisplayName.includes(tName))) ||
            (userFirstName && userFirstName.length >= 3 && tName && (tName === userFirstName || tName.startsWith(`${userFirstName} `)))
        );
    });

    // Si hay múltiples registros para el mismo técnico, priorizar el que realmente tiene un plan asignado
    if (matchingTechs.length > 0) {
        const withAssignedPlan = matchingTechs.find(t => planHasTechId(t.id) || (t.userId && planHasTechId(t.userId)));
        const chosen = withAssignedPlan || matchingTechs[0];
        if (chosen && chosen.id) return String(chosen.id);
    }

    // 2. Si no se encontró en técnicos, buscar en planes generales reales (weekPlan.__shared__._generalPlans)
    const matchingPlan = generalPlans.find(plan => {
        const assignedIds = [plan.assignedTechId, ...(Array.isArray(plan.assignedTechIds) ? plan.assignedTechIds : [])].filter(Boolean).map(String);
        if (userId && assignedIds.includes(userId)) return true;
        const pName = normalizeName(plan.name || '');
        const pTechName = normalizeName(plan.assignedTechName || plan.technician || '');
        return (username && (pName.includes(username) || pTechName.includes(username))) ||
            (userDisplayName && userDisplayName.length >= 3 && (pName.includes(userDisplayName) || pTechName.includes(userDisplayName))) ||
            (userFirstName && userFirstName.length >= 3 && (pName.includes(userFirstName) || pTechName.includes(userFirstName)));
    });
    if (matchingPlan) {
        const assignedId = String(matchingPlan.assignedTechId || (Array.isArray(matchingPlan.assignedTechIds) ? matchingPlan.assignedTechIds[0] : '') || '').trim();
        if (assignedId) return assignedId;
    }

    // 3. Fallback seguro: para técnico logueado nunca devolver cadena vacía
    return userId || user?.username || user?.name || 'tecnico';
}

function ensureLoggedTechnicianRecord() {
    if (!isTechnicianPlanView()) return;
    const myTechId = getLoggedTechnicianId();
    if (!myTechId) return;
    if (!Array.isArray(state.technicians)) state.technicians = [];
    let tech = state.technicians.find(t => !t.deletedAt && (String(t.id) === myTechId || String(t.userId || '') === myTechId));
    if (!tech) {
        const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
        tech = {
            id: myTechId,
            userId: String(user?.id || myTechId),
            nombre: user?.name || user?.username || 'Técnico',
            usuario: user?.username || '',
            rol: 'tecnico',
            estado: 'activo'
        };
        state.technicians.push(tech);
    }
}

function resetPlanMapScrollLock() {
    document.body.classList.remove('plan-fullscreen-open');
    document.body.classList.remove('plan-map-open');
    document.body.classList.remove('modal-open');
    document.body.classList.remove('lock-scroll');
    document.body.classList.remove('no-scroll');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.documentElement.style.overflow = '';
    document.documentElement.style.position = '';
    document.documentElement.classList.remove('lock-scroll');
    document.documentElement.classList.remove('no-scroll');
    const oldBox = document.getElementById('plan-map-box');
    if (oldBox) oldBox.classList.remove('map-expanded');
}

const PLANIFICAR_OFFLINE_SNAPSHOT_KEY = 'netops_planificar_offline_snapshot_v1';
const PLAN_WIFIMEX_REGEX = /wifi[\s_-]*mex/i;
const PLAN_WIFIMEX_FALLBACK = {
    type: 'equipment',
    equipmentId: 'eqmr9qmpr81rc',
    name: 'WiFi-Mex',
    lat: 17.5288335,
    lng: -99.4977258,
    region: ''
};

function findWiFiMexOriginData() {
    if (typeof findWiFiMexOrigin === 'function') {
        const found = findWiFiMexOrigin();
        if (found && Number.isFinite(Number(found.lat)) && Number.isFinite(Number(found.lng))) {
            return found;
        }
    }
    const eqList = Array.isArray(state?.equipment) ? state.equipment : [];
    const wmEq = eqList.find(e => e && !e.deletedAt && (
        e.id === 'eqmr9qmpr81rc' ||
        PLAN_WIFIMEX_REGEX.test(String(e.name || ''))
    ));
    if (wmEq) {
        const lat = Number(wmEq.lat);
        const lng = Number(wmEq.lng);
        return {
            type: 'equipment',
            equipmentId: wmEq.id,
            name: wmEq.name || 'WiFi-Mex',
            lat: Number.isFinite(lat) && !(lat === 0 && lng === 0) ? lat : PLAN_WIFIMEX_FALLBACK.lat,
            lng: Number.isFinite(lng) && !(lat === 0 && lng === 0) ? lng : PLAN_WIFIMEX_FALLBACK.lng,
            region: wmEq.region || ''
        };
    }
    const nodeList = Array.isArray(state?.nodes) ? state.nodes : [];
    const wmNode = nodeList.find(n => n && !n.deletedAt && PLAN_WIFIMEX_REGEX.test(String(n.town || n.name || '')));
    if (wmNode) {
        const lat = Number(wmNode.lat);
        const lng = Number(wmNode.lng);
        return {
            type: 'equipment',
            equipmentId: wmNode.equipmentId || PLAN_WIFIMEX_FALLBACK.equipmentId,
            nodeId: wmNode.id,
            name: wmNode.town || wmNode.name || 'WiFi-Mex',
            lat: Number.isFinite(lat) && !(lat === 0 && lng === 0) ? lat : PLAN_WIFIMEX_FALLBACK.lat,
            lng: Number.isFinite(lng) && !(lat === 0 && lng === 0) ? lng : PLAN_WIFIMEX_FALLBACK.lng,
            region: wmNode.zone || wmNode.region || ''
        };
    }
    return { ...PLAN_WIFIMEX_FALLBACK };
}

function buildWiFiMexOriginStop(existingId = '') {
    const wm = findWiFiMexOriginData();
    const nowIso = new Date().toISOString();
    return {
        id: existingId || (typeof gid === 'function' ? gid('p') : `p_${Date.now()}_wifimex`),
        type: 'equipment',
        equipmentId: wm.equipmentId || PLAN_WIFIMEX_FALLBACK.equipmentId,
        linkedNodeIds: (typeof getEquipmentLinkedNodeIds === 'function' && wm.equipmentId ? getEquipmentLinkedNodeIds(wm.equipmentId) : []),
        includeLinkedNodeDetails: false,
        name: wm.name || 'WiFi-Mex',
        lat: Number(wm.lat) || PLAN_WIFIMEX_FALLBACK.lat,
        lng: Number(wm.lng) || PLAN_WIFIMEX_FALLBACK.lng,
        region: wm.region || '',
        detailIds: [],
        notes: 'Salida / Base Central WiFi-Mex',
        materialPlanned: '',
        assignedTechId: '',
        siteStatus: 'pendiente',
        planJoinedAt: nowIso,
        createdAt: nowIso
    };
}

function isWiFiMexStop(stop) {
    if (!stop) return false;
    if (stop.equipmentId === 'eqmr9qmpr81rc') return true;
    const label = String(stop.name || stop.town || '');
    return PLAN_WIFIMEX_REGEX.test(label);
}

function ensureRoutePointsStartAtWiFiMex(points) {
    const valid = (Array.isArray(points) ? points : []).filter(p => p && !isNaN(safeFloat(p.lat)) && !isNaN(safeFloat(p.lng)));
    if (!valid.length) return [];
    if (isWiFiMexStop(valid[0])) return valid;
    const wm = findWiFiMexOriginData();
    const originPoint = {
        id: 'wifimex-origin',
        equipmentId: wm.equipmentId,
        name: wm.name || 'WiFi-Mex',
        mapLabel: `Base · ${wm.name || 'WiFi-Mex'}`,
        lat: safeFloat(wm.lat),
        lng: safeFloat(wm.lng),
        isOrigin: true
    };
    return [originPoint, ...valid];
}

function getDetailNoRealizadoAt(detail) {
    if (!detail) return '';
    const hist = Array.isArray(detail.incompleteHistory) ? detail.incompleteHistory : [];
    const lastAttempt = hist.length ? hist[hist.length - 1] : null;
    return detail.technicianReport?.completedAt || lastAttempt?.at || detail.completedAt || detail.updatedAt || '';
}

function formatNoRealizadoDate(detail) {
    const at = getDetailNoRealizadoAt(detail);
    if (!at) return '';
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');
}

function formatNoRealizadoBadgeLabel(detail) {
    const dateText = formatNoRealizadoDate(detail);
    return dateText ? `No realizado · ${dateText}` : 'No realizado';
}

function wasNoRealizadoInCurrentStop(detail, stop) {
    if (!detail || !stop || detail.status !== 'no_realizado') return false;
    const reportStopId = detail.technicianReport?.stopId;
    if (reportStopId) {
        if (String(reportStopId) !== String(stop.id)) return false;
        const joinedAt = new Date(stop.planJoinedAt || stop.createdAt || '').getTime();
        const completedAt = getPlanDetailCompletionTime(detail);
        if (Number.isFinite(joinedAt) && Number.isFinite(completedAt)) {
            return completedAt >= joinedAt;
        }
        return true;
    }
    const joinedAt = new Date(stop.planJoinedAt || stop.createdAt || '').getTime();
    if (!Number.isFinite(joinedAt)) return false;
    const completedAt = getPlanDetailCompletionTime(detail);
    return Number.isFinite(completedAt) && completedAt >= joinedAt;
}

function isDetailCompletedInStop(detail, stop) {
    if (!detail || detail.deletedAt) return false;
    if (detail.status === 'completada') return true;
    if (detail.status === 'no_realizado') return wasNoRealizadoInCurrentStop(detail, stop);
    return false;
}

function isDetailPendingInStop(detail, stop) {
    if (!detail || detail.deletedAt) return false;
    if (['completada', 'eliminada'].includes(detail.status || '')) return false;
    if (detail.status === 'no_realizado') return !wasNoRealizadoInCurrentStop(detail, stop);
    return true;
}

function wasDetailNoRealizadoOnDate(detail, dateKey) {
    if (!detail || detail.status !== 'no_realizado') return false;
    const at = getDetailNoRealizadoAt(detail);
    if (!at) return false;
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return false;
    const localKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return localKey === dateKey;
}

function hasLoadedPlanData(targetState = state) {
    if (!targetState || typeof targetState !== 'object') return false;
    const sharedPlans = targetState.weekPlan?.[SHARED_PLAN_ID]?._generalPlans;
    const hasStops = Array.isArray(sharedPlans) && sharedPlans.some(p => !p.deletedAt && Array.isArray(p.stops) && p.stops.length > 0);
    const hasPlans = Array.isArray(sharedPlans) && sharedPlans.some(p => !p.deletedAt);
    const hasOrders = Array.isArray(targetState.workOrders) && targetState.workOrders.length > 0;
    const hasNodes = Array.isArray(targetState.nodes) && targetState.nodes.length > 0;
    const hasEq = Array.isArray(targetState.equipment) && targetState.equipment.length > 0;
    return Boolean(hasStops || hasOrders || hasNodes || hasEq || hasPlans);
}

function savePlanificarOfflineSnapshot() {
    try {
        if (typeof localStorage === 'undefined' || !hasLoadedPlanData(state)) return;
        const payload = {
            savedAt: new Date().toISOString(),
            selectedGeneralPlanId: selectedGeneralPlanId || '',
            selectedCalendarDate: selectedCalendarDate || '',
            weekPlan: state.weekPlan || {},
            workOrders: (state.workOrders || []).slice(0, 2000),
            nodes: state.nodes || [],
            equipment: state.equipment || [],
            technicians: state.technicians || [],
            routes: state.routes || [],
            materials: state.materials || []
        };
        try {
            localStorage.setItem(PLANIFICAR_OFFLINE_SNAPSHOT_KEY, JSON.stringify(payload));
        } catch (_) {
            // Reintentar compactando fotos base64 pesadas para garantizar persistencia offline
            const compactOrders = (payload.workOrders || []).map(w => {
                if (!w || !w.technicianReport) return w;
                const rep = { ...w.technicianReport };
                if (typeof rep.evidencePhoto === 'string' && rep.evidencePhoto.length > 16000) rep.evidencePhoto = '';
                if (Array.isArray(rep.evidencePhotos)) rep.evidencePhotos = rep.evidencePhotos.filter(p => typeof p === 'string' && p.length <= 16000);
                return { ...w, technicianReport: rep };
            });
            localStorage.setItem(PLANIFICAR_OFFLINE_SNAPSHOT_KEY, JSON.stringify({ ...payload, workOrders: compactOrders }));
        }
    } catch (err) {
        console.warn('No se pudo guardar snapshot offline de planificar:', err);
    }
}

function loadPlanificarOfflineSnapshot() {
    try {
        if (typeof localStorage === 'undefined') return null;
        const raw = localStorage.getItem(PLANIFICAR_OFFLINE_SNAPSHOT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
        return null;
    }
}

function hydratePlanificarFromOfflineSnapshot() {
    const snap = loadPlanificarOfflineSnapshot();
    if (!snap) return false;
    let hydrated = false;
    if (snap.weekPlan && typeof snap.weekPlan === 'object' && Object.keys(snap.weekPlan).length) {
        state.weekPlan = snap.weekPlan;
        hydrated = true;
    }
    if (Array.isArray(snap.workOrders) && snap.workOrders.length) {
        if (!Array.isArray(state.workOrders) || !state.workOrders.length) {
            state.workOrders = snap.workOrders.slice();
        } else {
            const map = new Map(state.workOrders.map(w => [w.id, w]));
            snap.workOrders.forEach(w => {
                if (w?.id && !map.has(w.id)) {
                    state.workOrders.push(w);
                    map.set(w.id, w);
                }
            });
        }
        hydrated = true;
    }
    if (Array.isArray(snap.nodes) && snap.nodes.length && !(state.nodes || []).length) { state.nodes = snap.nodes; hydrated = true; }
    if (Array.isArray(snap.equipment) && snap.equipment.length && !(state.equipment || []).length) { state.equipment = snap.equipment; hydrated = true; }
    if (Array.isArray(snap.technicians) && snap.technicians.length && !(state.technicians || []).length) { state.technicians = snap.technicians; hydrated = true; }
    if (Array.isArray(snap.routes) && snap.routes.length && !(state.routes || []).length) { state.routes = snap.routes; hydrated = true; }
    if (Array.isArray(snap.materials) && snap.materials.length && !(state.materials || []).length) { state.materials = snap.materials; hydrated = true; }
    if (snap.selectedGeneralPlanId && !selectedGeneralPlanId) {
        selectedGeneralPlanId = snap.selectedGeneralPlanId;
    }
    return hydrated;
}

function capturePlanStateBackup() {
    if (!hasLoadedPlanData(state)) return null;
    const copy = val => (typeof cloneData === 'function' ? cloneData(val) : JSON.parse(JSON.stringify(val)));
    return {
        weekPlan: copy(state.weekPlan || {}),
        workOrders: copy(state.workOrders || []),
        nodes: copy(state.nodes || []),
        equipment: copy(state.equipment || []),
        technicians: copy(state.technicians || []),
        routes: copy(state.routes || []),
        materials: copy(state.materials || [])
    };
}

function restorePlanBackupIfNeeded(backup) {
    if (!backup) return false;
    const cloudFailed = typeof window !== 'undefined' && window.netopsCloudLoadOk === false;
    const backupPlans = backup.weekPlan?.[SHARED_PLAN_ID]?._generalPlans || [];
    const currentPlans = state.weekPlan?.[SHARED_PLAN_ID]?._generalPlans || [];
    const backupStopsCount = backupPlans.reduce((n, p) => n + ((p?.stops || []).filter(s => !s.deletedAt).length), 0);
    const currentStopsCount = currentPlans.reduce((n, p) => n + ((p?.stops || []).filter(s => !s.deletedAt).length), 0);
    const lostOrders = (backup.workOrders?.length || 0) > 0 && !(state.workOrders || []).length;
    const lostStops = backupStopsCount > 0 && currentStopsCount === 0;
    if (cloudFailed || lostOrders || lostStops) {
        if (backup.weekPlan && Object.keys(backup.weekPlan).length) state.weekPlan = backup.weekPlan;
        if (backup.workOrders?.length) state.workOrders = backup.workOrders;
        if (backup.nodes?.length && !(state.nodes || []).length) state.nodes = backup.nodes;
        if (backup.equipment?.length && !(state.equipment || []).length) state.equipment = backup.equipment;
        if (backup.technicians?.length && !(state.technicians || []).length) state.technicians = backup.technicians;
        if (backup.routes?.length && !(state.routes || []).length) state.routes = backup.routes;
        if (backup.materials?.length && !(state.materials || []).length) state.materials = backup.materials;
        return true;
    }
    return false;
}

function updatePlanOfflineIndicator(isOffline) {
    try {
        if (typeof document === 'undefined' || !document.body) return;
        let pill = document.getElementById('plan-offline-indicator');
        if (!isOffline) {
            if (pill) pill.style.display = 'none';
            return;
        }
        if (!pill) {
            pill = document.createElement('div');
            pill.id = 'plan-offline-indicator';
            pill.className = 'plan-offline-indicator';
            pill.setAttribute('role', 'status');
            pill.setAttribute('aria-live', 'polite');
            pill.innerHTML = '<span class="plan-offline-dot"></span><span>Sin conexión · Caché local</span>';
            document.body.appendChild(pill);
        }
        pill.style.display = 'inline-flex';
    } catch (_) { }
}

if (typeof window !== 'undefined') {
    window.findWiFiMexOriginData = findWiFiMexOriginData;
    window.buildWiFiMexOriginStop = buildWiFiMexOriginStop;
    window.ensureRoutePointsStartAtWiFiMex = ensureRoutePointsStartAtWiFiMex;
    window.formatNoRealizadoBadgeLabel = formatNoRealizadoBadgeLabel;
    window.savePlanificarOfflineSnapshot = savePlanificarOfflineSnapshot;
    window.loadPlanificarOfflineSnapshot = loadPlanificarOfflineSnapshot;
    window.hydratePlanificarFromOfflineSnapshot = hydratePlanificarFromOfflineSnapshot;
}

function dismissPlanInitialLoader() {
    try {
        const loader = document.getElementById('plan-initial-loader');
        if (loader) {
            loader.classList.add('is-hidden');
            setTimeout(() => {
                try { loader.remove(); } catch (_) { }
            }, 320);
        }
        if (typeof hideLoading === 'function') hideLoading();
    } catch (_) { }
}

function mergeGlobalWorkOrdersCacheIntoPlanState() {
    if (typeof getGlobalWorkOrdersCache !== 'function') return;
    const cached = getGlobalWorkOrdersCache() || {};
    const cachedList = Object.values(cached);
    if (!cachedList.length) return;
    if (!Array.isArray(state.workOrders) || state.workOrders.length === 0) {
        state.workOrders = cachedList;
    } else {
        const existingMap = new Map(state.workOrders.map(w => [w.id, w]));
        for (const ord of cachedList) {
            if (ord?.id && !existingMap.has(ord.id)) {
                state.workOrders.push(ord);
                existingMap.set(ord.id, ord);
            }
        }
    }
}

let _planInitialCloudLoading = true;
let _planCloudSyncing = true;
let _planificarInitStarted = false;
let _knownTechPendingDetailIds = null;

function collectCurrentTechnicianPendingDetails() {
    if (!isTechnicianPlanView()) return [];
    const stops = getPlanStopsForView('general');
    const detailsMap = new Map();
    stops.forEach(stop => {
        getStopDetails(stop).forEach(detail => {
            if (detail && detail.id && isDetailPendingInStop(detail, stop)) {
                detailsMap.set(detail.id, { detail, stop });
            }
        });
    });
    return Array.from(detailsMap.values());
}

function snapshotKnownTechPendingDetails() {
    if (!isTechnicianPlanView()) return;
    _knownTechPendingDetailIds = new Set(collectCurrentTechnicianPendingDetails().map(item => item.detail.id));
}

function notifyNewTechnicianDetailsIfAny() {
    if (!isTechnicianPlanView()) return 0;
    const currentEntries = collectCurrentTechnicianPendingDetails();
    const currentIds = new Set(currentEntries.map(item => item.detail.id));
    if (_knownTechPendingDetailIds === null) {
        _knownTechPendingDetailIds = currentIds;
        return 0;
    }
    const newlyAdded = currentEntries.filter(item => !_knownTechPendingDetailIds.has(item.detail.id));
    _knownTechPendingDetailIds = currentIds;
    if (!newlyAdded.length) return 0;
    if (typeof notify === 'function') {
        if (newlyAdded.length === 1) {
            const entry = newlyAdded[0];
            const place = entry.stop?.name || entry.detail?.nodeName || entry.detail?.town || '';
            const label = place ? ` en ${place}` : '';
            notify(`Se agregó 1 detalle nuevo${label} a tu lista.`);
        } else {
            notify(`Se agregaron ${newlyAdded.length} detalles nuevos a tu lista.`);
        }
    }
    return newlyAdded.length;
}

function renderTechnicianMobileLoadingHtml(titleText = 'Cargando ruta y detalles...', subText = 'Consultando paradas asignadas...') {
    return `
        <div class="tech-mobile-loading-state" role="status" aria-live="polite" aria-label="Cargando ruta y detalles">
            <div class="tech-mobile-loading-banner">
                <div class="tech-mobile-loading-top">
                    <span class="tech-mobile-loader-ring" aria-hidden="true"></span>
                    <div class="tech-mobile-loading-copy">
                        <span class="tech-mobile-loading-pill"><i class="tech-mobile-pulse-dot" aria-hidden="true"></i>Sincronizando datos</span>
                        <strong>${escapeHtml(titleText)}</strong>
                        <span>${escapeHtml(subText)}</span>
                    </div>
                </div>
                <div class="tech-mobile-loading-bar" aria-hidden="true"><span class="tech-mobile-loading-bar-fill"></span></div>
            </div>
            <div class="tech-skeleton-card" aria-hidden="true">
                <div class="tech-skeleton-line is-title"></div>
                <div class="tech-skeleton-line is-sub"></div>
                <div class="tech-skeleton-line is-full"></div>
                <div class="tech-skeleton-pills">
                    <span class="tech-skeleton-pill"></span>
                    <span class="tech-skeleton-pill"></span>
                </div>
            </div>
            <div class="tech-skeleton-card" aria-hidden="true">
                <div class="tech-skeleton-line is-title"></div>
                <div class="tech-skeleton-line is-sub"></div>
                <div class="tech-skeleton-line is-full"></div>
                <div class="tech-skeleton-pills">
                    <span class="tech-skeleton-pill"></span>
                    <span class="tech-skeleton-pill"></span>
                </div>
            </div>
        </div>
    `;
}

function renderTechnicianMobileSyncingStripHtml(titleText = 'Sincronizando datos...', subText = 'Buscando actualizaciones y nuevos detalles en tu ruta') {
    return `
        <div class="tech-mobile-syncing-strip" role="status" aria-live="polite" aria-label="Sincronizando datos">
            <div class="tech-mobile-syncing-strip-row">
                <span class="tech-mobile-loader-ring" aria-hidden="true"></span>
                <div class="tech-mobile-syncing-strip-text">
                    <strong>${escapeHtml(titleText)}</strong>
                    <small>${escapeHtml(subText)}</small>
                </div>
            </div>
            <div class="tech-mobile-loading-bar" aria-hidden="true"><span class="tech-mobile-loading-bar-fill"></span></div>
        </div>
    `;
}

function renderDesktopPlanLoadingHtml() {
    return `
        <div class="plan-desktop-loading-state" role="status" aria-live="polite" aria-label="Cargando plan y paradas">
            <div class="tech-mobile-loading-banner">
                <div class="tech-mobile-loading-top">
                    <span class="tech-mobile-loader-ring" aria-hidden="true"></span>
                    <div class="tech-mobile-loading-copy">
                        <span class="tech-mobile-loading-pill"><i class="tech-mobile-pulse-dot" aria-hidden="true"></i>Cargando información</span>
                        <strong>Cargando plan y paradas asignadas...</strong>
                        <span>Consultando rutas, pueblos y detalles actualizados.</span>
                    </div>
                </div>
                <div class="tech-mobile-loading-bar" aria-hidden="true"><span></span></div>
            </div>
            <div class="tech-skeleton-card" aria-hidden="true">
                <div class="tech-skeleton-line is-title"></div>
                <div class="tech-skeleton-line is-sub"></div>
                <div class="tech-skeleton-line is-full"></div>
            </div>
            <div class="tech-skeleton-card" aria-hidden="true">
                <div class="tech-skeleton-line is-title"></div>
                <div class="tech-skeleton-line is-sub"></div>
                <div class="tech-skeleton-line is-full"></div>
            </div>
        </div>
    `;
}

function renderTechnicianConnectionErrorHtml() {
    return `
        <div class="tech-connection-retry-card" role="alert">
            <div class="tech-connection-retry-icon" aria-hidden="true">📡</div>
            <strong>No fue posible cargar la ruta</strong>
            <p>No se pudo establecer conexión con el servidor. Intente recargar en unos momentos.</p>
            <button type="button" class="btn bc tech-connection-retry-btn" onclick="retryTechnicianPlanLoad()">Reintentar carga</button>
        </div>
    `;
}

async function retryTechnicianPlanLoad() {
    _planInitialCloudLoading = true;
    _planCloudSyncing = true;
    const board = document.getElementById('plan-days');
    if (board) board.innerHTML = isTechnicianPlanView() ? renderTechnicianMobileLoadingHtml('Reintentando conexión...', 'Descargando tu ruta y detalles desde el servidor...') : renderDesktopPlanLoadingHtml();
    renderTechnicianPlanBanner();
    updateTechnicianProgressCard();
    const dateLabel = document.getElementById('tech-day-map-date');
    if (dateLabel) dateLabel.textContent = `${formatCalendarDate(selectedCalendarDate || localDateKey())} · Cargando ubicaciones...`;
    try {
        await loadDB({ showOverlay: false, preferCache: false, globalFeedback: false });
        _planInitialCloudLoading = false;
        _planCloudSyncing = false;
        if (isTechnicianPlanView()) ensureLoggedTechnicianRecord();
        normalizeWeekPlan();
        initPlanSelectors();
        savePlanificarOfflineSnapshot();
        updatePlanOfflineIndicator(window.netopsCloudLoadOk === false);
        configureTechnicianDashboard();
        renderPlan();
        snapshotKnownTechPendingDetails();
    } catch (err) {
        _planInitialCloudLoading = false;
        _planCloudSyncing = false;
        console.warn('Reintento de carga fallido:', err);
        updatePlanOfflineIndicator(true);
        renderTechnicianPlanBanner();
        updateTechnicianProgressCard();
        renderPlanDays();
    }
}
window.retryTechnicianPlanLoad = retryTechnicianPlanLoad;

async function initPlanificarPage() {
    if (_planificarInitStarted) return;
    _planificarInitStarted = true;
    if (!checkAuth()) return;
    _planInitialCloudLoading = true;
    _planCloudSyncing = true;
    initCommon();
    const isTechView = isTechnicianPlanView();
    if (isTechView) {
        document.body.classList.add('plan-technician-view');
        applyTechnicianViewportLayout();
        const logo = document.querySelector('.logo-link');
        if (logo) logo.href = 'planificar.html';
        try { configureTechnicianDashboard(); } catch (_) { }
    } else {
        applyTechnicianViewportLayout();
    }
    const stopSearch = document.getElementById('plan-stop-search');
    if (stopSearch) stopSearch.placeholder = 'Buscar cliente, pueblo o antena...';
    resetPlanMapScrollLock();

    let hydratedFromCache = false;
    try {
        // 1. Hidratar primero desde el snapshot offline dedicado de planificar
        if (hydratePlanificarFromOfflineSnapshot()) {
            hydratedFromCache = true;
        }
        // 2. Complementar desde getLastGoodCloudState si falta información
        if (!hydratedFromCache && typeof getLastGoodCloudState === 'function' && typeof applyStateData === 'function') {
            const cachedState = getLastGoodCloudState();
            if (cachedState?.data && typeof cachedState.data === 'object') {
                applyStateData(cachedState.data);
                hydratedFromCache = true;
            }
        }
        mergeGlobalWorkOrdersCacheIntoPlanState();
        if (hydratedFromCache) {
            if (isTechView) {
                ensureLoggedTechnicianRecord();
            }
            normalizeWeekPlan();
            initPlanSelectors();
            const hasCachedAssignedPlan = isTechView
                ? Boolean(getSelectedGeneralPlan() && getVisiblePlanStops().length > 0)
                : Boolean(getGeneralPlans().some(p => !p.deletedAt && (p.stops || []).some(s => !s.deletedAt)));
            if (hasCachedAssignedPlan) {
                _planInitialCloudLoading = false;
            }
            configureTechnicianDashboard();
            renderPlan();
            if (hasCachedAssignedPlan) snapshotKnownTechPendingDetails();
            setTimeout(initPlanMap, 40);
            dismissPlanInitialLoader();
        } else if (isTechView) {
            // En vista técnico mostrar animación de carga fluida en lugar de pantalla bloqueante o mensaje vacío prematuro
            dismissPlanInitialLoader();
            const board = document.getElementById('plan-days');
            if (board) board.innerHTML = renderTechnicianMobileLoadingHtml();
            renderTechnicianPlanBanner();
            updateTechnicianProgressCard();
            const mapDate = document.getElementById('tech-day-map-date');
            if (mapDate) mapDate.textContent = `${formatCalendarDate(selectedCalendarDate || localDateKey())} · Cargando ubicaciones...`;
            document.getElementById('tech-day-map-card')?.classList.add('is-loading');
        } else {
            const board = document.getElementById('plan-days');
            if (board) board.innerHTML = renderDesktopPlanLoadingHtml();
        }
    } catch (cacheErr) {
        console.warn('Cache hydration warning:', cacheErr);
        if (isTechView) dismissPlanInitialLoader();
    }

    const isOfflineNow = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (isOfflineNow) {
        _planInitialCloudLoading = false;
        _planCloudSyncing = false;
        updatePlanOfflineIndicator(true);
        dismissPlanInitialLoader();
        if (!hydratedFromCache) {
            try {
                normalizeWeekPlan();
                initPlanSelectors();
                configureTechnicianDashboard();
                renderPlan();
            } catch (_) { }
        } else {
            try { renderPlanDays(); } catch (_) { }
        }
        return;
    }

    const safetyHideTimer = setTimeout(() => {
        dismissPlanInitialLoader();
    }, isTechView ? 1200 : 3500);

    const backupBeforeLoad = capturePlanStateBackup();
    try {
        await loadDB({ showOverlay: false, preferCache: true, globalFeedback: false });
        let restored = restorePlanBackupIfNeeded(backupBeforeLoad);
        mergeGlobalWorkOrdersCacheIntoPlanState();
        if (isTechnicianPlanView()) {
            ensureLoggedTechnicianRecord();
        }
        normalizeWeekPlan();
        initPlanSelectors();

        // Si en vista técnico aún no aparece ningún plan asignado tras la primera lectura,
        // hacer 1 reintento fresco sin caché manteniendo la tarjeta animada de carga antes de declarar vacío.
        if (isTechnicianPlanView() && !getVisibleGeneralPlansForRole().length && navigator.onLine !== false) {
            try {
                await new Promise(resolve => setTimeout(resolve, 750));
                await loadDB({ showOverlay: false, preferCache: false, globalFeedback: false });
                restored = restorePlanBackupIfNeeded(backupBeforeLoad) || restored;
                mergeGlobalWorkOrdersCacheIntoPlanState();
                ensureLoggedTechnicianRecord();
                normalizeWeekPlan();
                initPlanSelectors();
            } catch (retryErr) {
                console.warn('Reintento automático de plan técnico falló:', retryErr);
            }
        }

        _planInitialCloudLoading = false;
        _planCloudSyncing = false;
        if (restored || (typeof window !== 'undefined' && window.netopsCloudLoadOk === false)) {
            updatePlanOfflineIndicator(true);
        } else {
            updatePlanOfflineIndicator(false);
            savePlanificarOfflineSnapshot();
        }
        configureTechnicianDashboard();
        renderPlan();
        snapshotKnownTechPendingDetails();
        setTimeout(initPlanMap, 100);
    } catch (err) {
        _planInitialCloudLoading = false;
        _planCloudSyncing = false;
        console.warn('Error durante la carga inicial de Planificar:', err);
        restorePlanBackupIfNeeded(backupBeforeLoad);
        mergeGlobalWorkOrdersCacheIntoPlanState();
        updatePlanOfflineIndicator(true);
        try {
            normalizeWeekPlan();
            initPlanSelectors();
            configureTechnicianDashboard();
            renderPlan();
            snapshotKnownTechPendingDetails();
            setTimeout(initPlanMap, 100);
        } catch (_) { }
    } finally {
        _planInitialCloudLoading = false;
        _planCloudSyncing = false;
        clearTimeout(safetyHideTimer);
        dismissPlanInitialLoader();
    }
}

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', () => {
        try { initPlanificarPage(); } catch (_) { }
    });
}

let _lastPlanWakeTime = 0;
async function handlePlanWakeRefresh() {
    const now = Date.now();
    if (now - _lastPlanWakeTime < 1200) return;
    _lastPlanWakeTime = now;

    try {
        mergeGlobalWorkOrdersCacheIntoPlanState();
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            updatePlanOfflineIndicator(true);
            return;
        }
        if (isTechnicianPlanView()) {
            ensureLoggedTechnicianRecord();
            selectedTechId = getLoggedTechnicianId();
        }
        const backupBeforeRefresh = capturePlanStateBackup();
        if (navigator.onLine && typeof loadDB === 'function') {
            await loadDB({ showOverlay: false, globalFeedback: false, preferCache: false });
            const restored = restorePlanBackupIfNeeded(backupBeforeRefresh);
            mergeGlobalWorkOrdersCacheIntoPlanState();
            if (restored || (typeof window !== 'undefined' && window.netopsCloudLoadOk === false)) {
                updatePlanOfflineIndicator(true);
            } else {
                updatePlanOfflineIndicator(false);
                savePlanificarOfflineSnapshot();
            }
            if (isTechnicianPlanView()) {
                ensureLoggedTechnicianRecord();
                selectedTechId = getLoggedTechnicianId();
            }
            initPlanSelectors();
            renderPlan();
            notifyNewTechnicianDetailsIfAny();
        }
        if (planMap) {
            setTimeout(() => { try { planMap.invalidateSize(); } catch (_) { } }, 100);
        }
    } catch (e) {
        console.warn('Wake refresh quiet sync error:', e);
        updatePlanOfflineIndicator(true);
    }
}

if (typeof window !== 'undefined' && !window._planWakeRefreshBound) {
    window._planWakeRefreshBound = true;
    window.addEventListener('pageshow', () => { handlePlanWakeRefresh(); });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) handlePlanWakeRefresh();
    });
    window.addEventListener('offline', () => {
        savePlanificarOfflineSnapshot();
        updatePlanOfflineIndicator(true);
    });
    window.addEventListener('online', () => {
        updatePlanOfflineIndicator(false);
        handlePlanWakeRefresh();
    });
}

function checkTechnicianDailyStopsNotice() {
    return;
}

function configureTechnicianDashboard() {
    checkTechnicianDailyStopsNotice();
    if (!isTechnicianPlanView()) {
        applyTechnicianViewportLayout();
        return;
    }
    const continuityBanner = document.getElementById('plan-continuity-recommendations-banner');
    if (continuityBanner) {
        continuityBanner.style.display = 'none';
        continuityBanner.innerHTML = '';
    }
    applyTechnicianViewportLayout();
    if (!document.body.dataset.techView) document.body.dataset.techView = 'details';
    if (!selectedCalendarDate) selectedCalendarDate = localDateKey();
    const user = getCurrentUser();
    const firstName = String(user?.name || user?.username || 'Tecnico').trim().split(/\s+/)[0];
    const todayText = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const hero = document.querySelector('.hero-panel');
    if (hero) {
        hero.classList.add('tech-dashboard-hero');
        hero.innerHTML = `<div><div class="tech-hero-eyebrow">Mi día</div><h1>¡Hola, ${escapeHtml(firstName)}!</h1><p>${escapeHtml(todayText.charAt(0).toUpperCase() + todayText.slice(1))}</p></div><div class="tech-hero-signal" aria-hidden="true"><span></span><i></i><b></b></div>`;
    }
    const shell = document.querySelector('.plan-shell');
    const calendar = document.getElementById('plan-calendar');
    const kpis = document.querySelector('.plan-kpi-bar');
    const mapBox = document.getElementById('plan-map-box');
    const board = document.querySelector('.plan-board');
    if (shell) {
        const today = new Date(`${selectedCalendarDate}T12:00:00`);
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        const allStops = getPlanStopsForView('general');
        const days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + index);
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const active = dateKey === selectedCalendarDate ? 'active' : '';
            const dayStopsCount = allStops.filter(s => (s.scheduledDate || '') === dateKey).length;
            const hasWork = dayStopsCount > 0 ? 'has-work' : '';
            return `<button type="button" class="tech-week-day ${active} ${hasWork}" onclick="selectTechnicianAgendaDate('${dateKey}')"><small>${date.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')}</small><strong>${date.getDate()}</strong>${dayStopsCount > 0 ? '<i class="tech-work-dot" title="Trabajo asignado"></i>' : ''}</button>`;
        }).join('');
        const toolbarInner = `
            <div class="tech-agenda-title">
                <h1>Mi agenda</h1>
                <button type="button" class="tech-today-pill" onclick="selectTechnicianAgendaDate('${localDateKey()}')">Hoy</button>
            </div>
            <div class="tech-day-label">Elige el día</div>
            <div class="tech-month-row">
                <button type="button" onclick="shiftTechnicianAgendaWeek(-1)" aria-label="Semana anterior">&#8249;</button>
                <strong>${today.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</strong>
                <button type="button" onclick="shiftTechnicianAgendaWeek(1)" aria-label="Semana siguiente">&#8250;</button>
            </div>
            <div class="tech-week-strip">${days}</div>
        `;
        const existingToolbar = document.querySelector('.tech-calendar-toolbar');
        if (existingToolbar) {
            existingToolbar.innerHTML = toolbarInner;
        } else {
            shell.insertAdjacentHTML('afterbegin', `<section class="tech-calendar-toolbar">${toolbarInner}</section>`);
        }
    }
    const toolbar = document.querySelector('.tech-calendar-toolbar');
    toolbar?.querySelector('.tech-summary-toggle')?.remove();

    // Inyectar barra compacta de progreso en móvil/pantalla técnica (máxima prioridad a los detalles)
    if (shell && !document.getElementById('tech-progress-card')) {
        const progressCardHtml = `
            <section class="tech-progress-compact" id="tech-progress-card">
                <div class="tech-progress-compact-row">
                    <div class="tech-progress-compact-info">
                        <svg class="tech-progress-compact-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                        <span class="tech-progress-compact-label">Avance</span>
                        <strong class="tech-progress-compact-pct" id="tech-progress-percent-badge">0%</strong>
                        <span class="tech-progress-compact-sep">·</span>
                        <span class="tech-progress-compact-detail" id="tech-stat-detalles">0 de 0</span>
                        <span class="tech-progress-compact-sep">·</span>
                        <span class="tech-progress-compact-pueblos" id="tech-stat-pueblos">0 pueblos</span>
                        <span class="tech-compact-urgent-tag" id="tech-stat-pill-urgent" style="display:none">
                            <span id="tech-stat-urgentes">0</span>
                        </span>
                    </div>
                    <button type="button" class="tech-compact-summary-btn" onclick="openTechnicianProductivitySummary()" title="Ver resumen del día">
                        Resumen
                    </button>
                </div>
                <div class="tech-progress-bar-track">
                    <div class="tech-progress-bar-fill" id="tech-progress-bar-fill" style="width: 0%"></div>
                </div>
            </section>
        `;
        if (toolbar) {
            toolbar.insertAdjacentHTML('afterend', progressCardHtml);
        } else {
            shell.insertAdjacentHTML('afterbegin', progressCardHtml);
        }
    }
    if (!document.getElementById('tech-weather-card')) {
        const progressCard = document.getElementById('tech-progress-compact');
        if (progressCard) {
            progressCard.insertAdjacentHTML('afterend', '<section id="tech-weather-card" class="tech-weather-card" style="display:none;"></section>');
        }
    }

    if (shell && calendar && calendar.parentElement !== shell && typeof shell.appendChild === 'function') shell.appendChild(calendar);
    if (mapBox) {
        mapBox.classList?.add?.('tech-route-map-card');
        const head = mapBox.querySelector?.('.plan-map-panel-head');
        if (head) head.innerHTML = `<strong><span class="tech-map-icon">◇</span> Mapa de paradas</strong>`;
        if (!document.getElementById('tech-route-overview') && typeof mapBox.insertAdjacentHTML === 'function') {
            mapBox.insertAdjacentHTML('beforebegin', `<section id="tech-route-overview" class="tech-route-overview"><div class="tech-route-overview-head"><span>Tu ruta</span><h2 id="tech-route-overview-title">Ruta asignada</h2><small id="tech-route-overview-date"></small></div><div id="tech-route-overview-kpis" class="tech-route-overview-kpis"></div><div id="tech-route-travel-summary" class="tech-route-travel-summary"></div><div id="tech-route-stop-names" class="tech-route-stop-names"></div></section>`);
        }
    }
    if (board) {
        board.classList?.add?.('tech-today-board');
        const title = board.querySelector?.('#plan-title');
        if (title) title.textContent = 'Trabajos de hoy';
        let dayMapCard = document.getElementById('tech-day-map-card');
        if (!dayMapCard) {
            if (typeof board.insertAdjacentHTML === 'function') {
                board.insertAdjacentHTML('afterend', `<section id="tech-day-map-card" class="tech-day-map-card">
    <div>
        <strong>Mapa de hoy</strong>
        <small id="tech-day-map-date"></small>
    </div>
    <div class="tech-map-privacy-notice" id="tech-map-privacy-notice" style="margin:0 14px 10px;padding:10px 12px;border-radius:10px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:11px;line-height:1.4;display:flex;align-items:flex-start;gap:8px;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Tu ubicación solo se utiliza localmente en este dispositivo para calcular la ruta y no se almacena ni se usa para ningún otro fin.</span>
    </div>
    <div id="tech-day-map" class="tech-day-map"></div>
    <div id="tech-locations-sheet" class="tech-map-locations-sheet" style="display:none;"></div>
</section>`);
                dayMapCard = document.getElementById('tech-day-map-card');
            }
        } else if (dayMapCard.parentElement === board && typeof board.after === 'function') {
            board.after(dayMapCard);
        }
        if (dayMapCard && typeof dayMapCard.querySelector === 'function' && !dayMapCard.querySelector('#tech-day-map')) {
            dayMapCard.innerHTML = `
    <div>
        <strong>Mapa de hoy</strong>
        <small id="tech-day-map-date"></small>
    </div>
    <div class="tech-map-privacy-notice" id="tech-map-privacy-notice" style="margin:0 14px 10px;padding:10px 12px;border-radius:10px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:11px;line-height:1.4;display:flex;align-items:flex-start;gap:8px;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Tu ubicación solo se utiliza localmente en este dispositivo para calcular la ruta y no se almacena ni se usa para ningún otro fin.</span>
    </div>
    <div id="tech-day-map" class="tech-day-map"></div>
    <div id="tech-locations-sheet" class="tech-map-locations-sheet" style="display:none;"></div>`;
        }
        if (dayMapCard && (!document.body.dataset.techView || document.body.dataset.techView === 'details')) {
            dayMapCard.style.display = 'block';
        }
    }
    if (!document.querySelector('.tech-mobile-header')) {
        document.body.insertAdjacentHTML('afterbegin', `<header class="tech-mobile-header">
            <button type="button" class="tech-header-logout" onclick="logout()" aria-label="Cerrar sesión" title="Cerrar sesión">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5"></path><path d="M15 12H3"></path><path d="M14 4h4a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-4"></path></svg>
            </button>
            <div class="tech-header-title">
                <strong>Hola, ${escapeHtml(firstName)}</strong>
                <small>${escapeHtml(todayText.charAt(0).toUpperCase() + todayText.slice(1))}</small>
            </div>
            <div class="tech-header-spacer" style="width:40px;height:40px;" aria-hidden="true"></div>
        </header>`);
    } else {
        const headerEl = document.querySelector('.tech-mobile-header');
        const titleStrong = headerEl?.querySelector('.tech-header-title strong');
        const titleSmall = headerEl?.querySelector('.tech-header-title small');
        if (titleStrong) titleStrong.textContent = `Hola, ${firstName}`;
        if (titleSmall) titleSmall.textContent = todayText.charAt(0).toUpperCase() + todayText.slice(1);
        const existingBell = document.querySelector('.tech-header-bell');
        if (existingBell) existingBell.remove();
        const existingBadge = document.getElementById('tech-mobile-bell-count');
        if (existingBadge) existingBadge.remove();
    }
    if (!document.querySelector('.tech-bottom-nav')) {
        document.body.insertAdjacentHTML('beforeend', `<nav class="tech-bottom-nav tech-bottom-nav-three" aria-label="Opciones del técnico"><button class="active" type="button" onclick="openTechnicianDetails()"><svg class="tech-nav-svg" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v0Zm0 9h6m-6 4h4"/></svg>Detalles</button><button type="button" onclick="openTechnicianRouteMap()"><svg class="tech-nav-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>Ruta</button><button type="button" onclick="openTechnicianRecommendedRoutes()"><svg class="tech-nav-svg" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/></svg>Recomendadas</button></nav>`);
    }
    renderTechnicianRouteOverview();
    renderTechnicianPlanBanner();
    updateTechnicianProgressCard();
    updateTechnicianMobileBellBadge();
    setTimeout(renderTechnicianDayMap, 0);
    requestTechnicianRealtimeWeather();
}

function renderTechnicianPlanBanner() {
    if (!isTechnicianPlanView()) {
        const existing = document.getElementById('tech-plan-banner');
        if (existing) existing.style.display = 'none';
        return;
    }
    const shell = document.querySelector('.plan-shell');
    if (!shell) return;
    const myTechId = getLoggedTechnicianId();
    const allGeneralPlans = getGeneralPlans().filter(p => !p.deletedAt);
    let techPlans = allGeneralPlans.filter(p => isPlanAssignedToTech(p, myTechId));
    if (!techPlans.length && allGeneralPlans.length > 0) {
        techPlans = allGeneralPlans;
    }
    const currentPlan = getSelectedGeneralPlan();
    let banner = document.getElementById('tech-plan-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'tech-plan-banner';
        banner.className = 'tech-plan-banner';
        const progressCard = document.getElementById('tech-progress-card');
        if (progressCard && progressCard.parentNode === shell) {
            shell.insertBefore(banner, progressCard);
        } else {
            shell.insertAdjacentElement('afterbegin', banner);
        }
    }

    if (!techPlans.length || !currentPlan) {
        if (_planInitialCloudLoading) {
            banner.className = 'tech-plan-banner is-loading-hidden';
            banner.innerHTML = '';
            banner.style.display = 'none';
            return;
        }
        banner.classList.remove('is-loading-hidden');
        if (typeof window !== 'undefined' && window.netopsCloudLoadOk === false) {
            banner.className = 'tech-plan-banner is-empty';
            banner.innerHTML = `
                <span class="tech-plan-banner-icon">📡</span>
                <div class="tech-plan-banner-text">
                    <strong style="font-size:13px;color:#92400e;">Sin conexión con el servidor</strong>
                    <small style="font-size:11px;color:#b45309;">Pulsa reintentar para descargar tu ruta.</small>
                </div>
                <button type="button" class="btn bsm bc" onclick="retryTechnicianPlanLoad()" style="margin-left:auto;white-space:nowrap;">Reintentar</button>
            `;
            banner.style.display = 'flex';
            return;
        }
        banner.className = 'tech-plan-banner is-empty';
        banner.innerHTML = `
            <span class="tech-plan-banner-icon">⚠️</span>
            <div class="tech-plan-banner-text">
                <strong style="font-size:13px;color:#92400e;">Sin ruta asignada</strong>
                <small style="font-size:11px;color:#b45309;">Actualmente no hay un plan de trabajo asignado.</small>
            </div>
        `;
        banner.style.display = 'flex';
        return;
    }

    const currentStopsCount = (currentPlan.stops || []).filter(s => !s.deletedAt).length;

    if (techPlans.length <= 1) {
        banner.className = 'tech-plan-banner';
        banner.innerHTML = `
            <div class="tech-plan-banner-pill">
                <span class="tech-plan-banner-icon">🗺️</span>
                <div class="tech-plan-banner-text">
                    <span class="tech-plan-banner-label">Ruta asignada</span>
                    <strong class="tech-plan-banner-name">${escapeHtml(currentPlan.name)}</strong>
                </div>
                <span class="tech-plan-banner-count">${currentStopsCount} parada${currentStopsCount === 1 ? '' : 's'}</span>
            </div>
        `;
        banner.style.display = 'block';
    } else {
        banner.className = 'tech-plan-banner';
        banner.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <span class="tech-plan-banner-label">Tus rutas asignadas (${techPlans.length}):</span>
                <span class="tech-plan-banner-count">${currentStopsCount} parada${currentStopsCount === 1 ? '' : 's'} en actual</span>
            </div>
            <div class="tech-plan-banner-chips">
                ${techPlans.map(p => {
                    const isActive = currentPlan && p.id === currentPlan.id;
                    const stopCount = (p.stops || []).filter(s => !s.deletedAt).length;
                    return `
                        <button type="button" class="tech-plan-chip ${isActive ? 'is-active' : ''}" onclick="selectGeneralPlan('${escapeAttr(p.id)}')">
                            <span>🗺️</span>
                            <strong>${escapeHtml(p.name)}</strong>
                            <small>(${stopCount})</small>
                        </button>
                    `;
                }).join('')}
            </div>
        `;
        banner.style.display = 'block';
    }
}
window.renderTechnicianPlanBanner = renderTechnicianPlanBanner;

function getTechnicianPendingDispatches() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    const username = normalizeName(user?.username || '');
    const userDisplayName = normalizeName(user?.name || '');
    const userId = String(user?.id || '');
    const tech = (state.technicians || []).find(t =>
        !t.deletedAt && (
            (userId && String(t.userId || '') === userId) ||
            (t.id && String(t.id) === userId) ||
            (username && normalizeName(t.usuario || '') === username) ||
            (username && normalizeName(t.nombre || '') === username) ||
            (userDisplayName && normalizeName(t.nombre || '') === userDisplayName)
        )
    );
    const techId = tech?.id || '';
    const techUserId = tech?.userId || '';
    const techNombre = normalizeName(tech?.nombre || '');
    const techUsuario = normalizeName(tech?.usuario || '');

    const isMatch = mov => {
        if (!mov) return false;
        const movTechId = String(mov.technicianId || '');
        const movTechUserId = String(mov.technicianUserId || '');
        if (techId && (movTechId === techId || movTechUserId === techId)) return true;
        if (techUserId && (movTechId === techUserId || movTechUserId === techUserId)) return true;
        if (userId && (movTechId === userId || movTechUserId === userId)) return true;
        const movName = normalizeName(mov.technicianName || '');
        if (movName) {
            if (username && movName === username) return true;
            if (userDisplayName && movName === userDisplayName) return true;
            if (techNombre && movName === techNombre) return true;
            if (techUsuario && movName === techUsuario) return true;
        }
        return false;
    };

    const pending = [];
    const seen = new Set();

    // 1. Movimientos directos desde la tabla de movimientos de material
    const directMovements = Array.isArray(state.materialMovements) ? state.materialMovements : [];
    for (const mov of directMovements) {
        if (!mov || !mov.id || seen.has(mov.id)) continue;
        if (isMatch(mov)) {
            const status = mov.status || 'pending_receipt';
            if (status === 'pending_receipt' || status === 'pending_handover') {
                seen.add(mov.id);
                const items = Array.isArray(mov.items) && mov.items.length
                    ? mov.items
                    : [{ materialId: mov.materialId || '', materialName: mov.materialName || 'Material', quantity: Number(mov.quantity) || 0, unit: mov.unit || 'pieza' }];
                pending.push({
                    ...mov,
                    items,
                    status,
                    isEdited: !!mov.isEdited,
                    editedAt: mov.editedAt || null,
                    editedByName: mov.editedByName || '',
                    returnDetails: mov.returnDetails || null
                });
            }
        }
    }

    // 2. Historial en state.materials
    for (const m of (state.materials || [])) {
        for (const mov of (m.movements || [])) {
            if (!mov || !mov.id || seen.has(mov.id)) continue;
            if (isMatch(mov)) {
                const status = mov.status || 'pending_receipt';
                if (status === 'pending_receipt' || status === 'pending_handover') {
                    seen.add(mov.id);
                    const items = Array.isArray(mov.items) && mov.items.length
                        ? mov.items
                        : [{ materialId: mov.materialId || m.id, materialName: mov.materialName || m.name, quantity: Number(mov.quantity) || 0, unit: mov.unit || m.unit || 'pieza' }];
                    pending.push({
                        ...mov,
                        materialId: mov.materialId || m.id,
                        materialName: mov.materialName || m.name,
                        items,
                        status,
                        isEdited: !!mov.isEdited,
                        editedAt: mov.editedAt || null,
                        editedByName: mov.editedByName || '',
                        returnDetails: mov.returnDetails || null
                    });
                }
            }
        }
    }
    return pending;
}

function dismissTechnicianMaterialPrompt() {
    try {
        sessionStorage.setItem('dismissed_tech_material_prompt', '1');
    } catch (_) { }
    if (typeof CM === 'function') CM('tech-pending-material-prompt-mo');
}
window.dismissTechnicianMaterialPrompt = dismissTechnicianMaterialPrompt;

function checkTechnicianPendingMaterialPrompt(force = false) {
    if (!isTechnicianPlanView()) return;
    if (!force) {
        try {
            if (sessionStorage.getItem('dismissed_tech_material_prompt') === '1') return;
        } catch (_) { }
    }
    const pending = getTechnicianPendingDispatches();
    const promptMo = document.getElementById('tech-pending-material-prompt-mo');
    const container = document.getElementById('tech-pending-prompt-content');
    if (!promptMo || !container) return;

    if (!pending.length) {
        if (typeof CM === 'function') CM('tech-pending-material-prompt-mo');
        return;
    }

    const hasPendingReceipt = pending.some(d => d.status === 'pending_receipt');
    const hasPendingHandover = pending.some(d => d.status === 'pending_handover');

    const promptTitle = document.getElementById('tech-pending-prompt-title');
    const promptDesc = document.getElementById('tech-pending-prompt-desc');
    if (promptTitle && promptDesc) {
        if (hasPendingReceipt && !hasPendingHandover) {
            promptTitle.textContent = 'Material entregado';
            promptDesc.textContent = 'Soporte te asignó material. Confirma lo que recibiste para usarlo hoy.';
        } else if (!hasPendingReceipt && hasPendingHandover) {
            promptTitle.textContent = 'Confirmar material devuelto';
            promptDesc.textContent = 'Soporte anotó el material que devolviste. Confirma las cantidades para cerrar la entrega.';
        } else {
            promptTitle.textContent = 'Avisos de material';
            promptDesc.textContent = 'Revisa y confirma las entregas y recepciones de material pendientes con soporte.';
        }
    }

    container.innerHTML = pending.map(d => {
        const isReceipt = d.status === 'pending_receipt';
        const isHandover = d.status === 'pending_handover';
        const isEdited = !!d.isEdited;
        const items = Array.isArray(d.items) && d.items.length ? d.items : [{ materialName: d.materialName, quantity: d.quantity, unit: d.unit || 'pieza' }];
        const dateStr = d.at ? new Date(d.at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : 'Reciente';

        // Determinar folios claros ENT-###### y REC-###### con id único compartido
        let numFolioStr = '';
        if (d.deliveryFolio && /^ENT-(\d+)/i.test(d.deliveryFolio)) {
            numFolioStr = d.deliveryFolio.match(/^ENT-(\d+)/i)[1].padStart(6, '0');
        } else if (d.receiptFolio && /^REC-(\d+)/i.test(d.receiptFolio)) {
            numFolioStr = d.receiptFolio.match(/^REC-(\d+)/i)[1].padStart(6, '0');
        } else if (d.folio && /^(?:ENT|REC)-(\d+)/i.test(d.folio)) {
            numFolioStr = d.folio.match(/^(?:ENT|REC)-(\d+)/i)[1].padStart(6, '0');
        } else {
            let hash = 0;
            const str = String(d.id || '0');
            for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
            numFolioStr = String(Math.abs(hash) % 1000000).padStart(6, '0');
        }

        const deliveryFolio = `ENT-${numFolioStr}`;
        const receiptFolio = `REC-${numFolioStr}`;
        const currentFolio = isHandover ? receiptFolio : deliveryFolio;

        if (isReceipt) {
            const itemsHtml = items.map(it => `
                <div class="dispatch-item-line">
                    <span class="mat-name">${escapeHtml(it.materialName)}</span>
                    <span class="mat-qty">${Number(it.quantity || 0).toLocaleString('es-MX')} ${escapeHtml(it.unit || 'pieza')}</span>
                </div>
            `).join('');

            return `
                <div class="dispatch-card" style="margin-bottom:12px;background:#fff;border:1px solid #dfe6ef;border-radius:14px;padding:16px">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                        <span class="dispatch-folio-tag delivery" style="display:inline-flex;padding:3px 8px;border-radius:6px;font-family:monospace;font-size:12px;font-weight:800;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe">${escapeHtml(deliveryFolio)}</span>
                        <span class="dispatch-badge status-pending_receipt">Por confirmar</span>
                    </div>

                    ${isEdited ? `
                        <div class="dispatch-edited-warning">
                            <span class="dispatch-edited-badge">Cambio en material</span>
                            <p>Soporte actualizó las piezas de esta entrega. Revísalas antes de confirmar.</p>
                        </div>
                    ` : ''}

                    <div class="dispatch-items-table">
                        <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:4px">
                            Materiales entregados (${items.length}):
                        </div>
                        ${itemsHtml}
                    </div>

                    <div style="font-size:12px;color:#64748b;margin:8px 0">
                        <div>Entregó soporte: <strong>${escapeHtml(d.createdByName || 'Soporte')}</strong> · ${dateStr}</div>
                        ${d.reference ? `<div>Referencia: <strong>${escapeHtml(d.reference)}</strong></div>` : ''}
                        ${d.notes ? `<div style="font-style:italic;margin-top:2px">${escapeHtml(d.notes)}</div>` : ''}
                    </div>

                    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:6px">
                        <button type="button" class="btn bg2" onclick="confirmarRecepcionDesdePlan('${d.id}')" style="min-height:46px;font-size:13px;font-weight:800;border-radius:10px">
                            ${isEdited ? 'Confirmar recepción (actualizado)' : '✓ Confirmar que recibí'}
                        </button>
                        <button type="button" class="btn br" onclick="rechazarRecepcionDesdePlan('${d.id}')" style="min-height:46px;padding:0 14px;font-size:12px;font-weight:800;border-radius:10px;background:#fee2e2;color:#dc2626;border:1px solid #fecdd3" title="No estoy de acuerdo con este material y deseo devolverlo a soporte">
                            Devolver
                        </button>
                    </div>
                </div>
            `;
        }

        // isHandover (Soporte colocó cantidades y espera confirmación del técnico)
        const returnDateStr = d.receivedAt ? new Date(d.receivedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : dateStr;
        const returnAdmin = d.receivedByAdminName || d.returnDetails?.adminReceivedByName || 'Soporte';
        const returnNotes = d.receiveNotes || d.returnDetails?.adminNotes || d.notes || '';
        const returnItems = Array.isArray(d.returnDetails?.items) && d.returnDetails.items.length ? d.returnDetails.items : null;

        let returnBreakdownHtml = '';
        if (returnItems) {
            returnBreakdownHtml = returnItems.map(rit => `
                <div style="padding:6px 0;border-bottom:1px dashed #fed7aa;display:flex;justify-content:space-between;align-items:center;font-size:12px">
                    <div>
                        <strong style="color:#0b1f46">${escapeHtml(rit.materialName)}</strong>
                        <div style="font-size:11px;color:#64748b">Entregado original: ${Number(rit.deliveredQuantity || 0).toLocaleString('es-MX')} ${escapeHtml(rit.unit || 'pieza')}</div>
                    </div>
                    <div style="text-align:right">
                        <span style="color:#047857;font-weight:800">Devuelto: ${Number(rit.returnedGood || 0).toLocaleString('es-MX')}</span>
                        ${rit.usedQuantity > 0 ? `<div style="color:#0284c7;font-weight:700;font-size:11px">Utilizado: ${Number(rit.usedQuantity).toLocaleString('es-MX')}</div>` : ''}
                        ${rit.returnedDamaged > 0 ? `<div style="color:#dc2626;font-weight:700;font-size:11px">Dañado: ${Number(rit.returnedDamaged).toLocaleString('es-MX')}</div>` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            returnBreakdownHtml = `
                <div style="font-size:12px;padding:4px 0">
                    <div>Material: <strong>${escapeHtml(d.materialName)}</strong></div>
                    <div style="color:#047857;font-weight:700;margin-top:2px">Devuelto buen estado: ${Number(d.returnedChange || 0).toLocaleString('es-MX')} ${escapeHtml(d.unit || 'pieza')}</div>
                    ${d.usedQuantity > 0 ? `<div style="color:#0284c7;font-weight:700">Utilizado: ${Number(d.usedQuantity).toLocaleString('es-MX')}</div>` : ''}
                    ${d.returnedDamaged > 0 ? `<div style="color:#dc2626;font-weight:700">Dañado: ${Number(d.returnedDamaged).toLocaleString('es-MX')}</div>` : ''}
                </div>
            `;
        }

        return `
            <div class="dispatch-card" style="margin-bottom:12px;background:#fff;border:1px solid #dfe6ef;border-radius:14px;padding:16px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                    <span class="dispatch-folio-tag receipt" style="display:inline-flex;padding:3px 8px;border-radius:6px;font-family:monospace;font-size:12px;font-weight:800;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0">${escapeHtml(receiptFolio)}</span>
                    <span class="dispatch-badge status-pending_handover">Por confirmar devolución</span>
                </div>

                <div style="background:#fff8f1;border:1px solid #fed7aa;border-radius:10px;padding:10px 14px;margin:8px 0">
                    <div style="font-size:11px;font-weight:800;color:#9a3412;text-transform:uppercase;margin-bottom:6px">
                        Cantidades registradas por Soporte:
                    </div>
                    ${returnBreakdownHtml}
                </div>

                <div style="font-size:12px;color:#64748b;margin:8px 0">
                    <div>Recibió soporte: <strong>${escapeHtml(returnAdmin)}</strong> · ${returnDateStr}</div>
                    <div>Folio de entrega base: <span style="font-family:monospace;font-weight:700;color:#1d4ed8">${escapeHtml(deliveryFolio)}</span></div>
                    ${d.reference ? `<div>Referencia: <strong>${escapeHtml(d.reference)}</strong></div>` : ''}
                    ${returnNotes ? `<div style="font-style:italic;margin-top:2px">Notas de recepción: ${escapeHtml(returnNotes)}</div>` : ''}
                </div>

                <div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:6px">
                    <button type="button" class="btn bc" onclick="confirmarEntregaTecnicoDesdePlan('${d.id}')" style="min-height:46px;font-size:13px;font-weight:800;border-radius:10px;background:#ea580c;border-color:#ea580c">
                        ✓ Confirmar devolución
                    </button>
                    <button type="button" class="btn br" onclick="rechazarEntregaDesdePlan('${d.id}')" style="min-height:46px;padding:0 14px;font-size:12px;font-weight:800;border-radius:10px;background:#fee2e2;color:#dc2626;border:1px solid #fecdd3" title="No estoy de acuerdo con las cantidades y deseo devolverlo a soporte">
                        Devolver
                    </button>
                </div>
            </div>
        `;
    }).join('');

    if (typeof OM === 'function') OM('tech-pending-material-prompt-mo');
}

async function confirmarRecepcionDesdePlan(dispatchId) {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    const now = new Date().toISOString();
    let targetDispatch = null;

    if (Array.isArray(state.materialMovements)) {
        targetDispatch = state.materialMovements.find(x => x.id === dispatchId);
    }
    if (!targetDispatch) {
        for (const m of (state.materials || [])) {
            for (const mov of (m.movements || [])) {
                if (mov.id === dispatchId) {
                    targetDispatch = mov;
                    break;
                }
            }
            if (targetDispatch) break;
        }
    }

    if (!targetDispatch) return notify('Envío de material no encontrado.', 'err');

    const itemsText = Array.isArray(targetDispatch.items) && targetDispatch.items.length
        ? targetDispatch.items.map(i => `${i.quantity} ${i.unit} de ${i.materialName}`).join(', ')
        : `${targetDispatch.quantity} ${targetDispatch.unit} de ${targetDispatch.materialName}`;

    // Cerrar aviso para dar paso directo y limpio a la firma digital en celular/web
    if (typeof CM === 'function') CM('tech-pending-material-prompt-mo');

    // FIRMA DIGITAL DEL TÉCNICO EN CELULAR / WEB (OBLIGATORIA)
    const techSignerName = user.name || user.username || targetDispatch.technicianName || 'Técnico';
    const sig = typeof promptDigitalSignature === 'function'
        ? await promptDigitalSignature({
            title: 'Firma de recepción de material',
            subtitle: `Firma con tu dedo para confirmar que recibiste: ${itemsText}.`,
            signerName: techSignerName,
            role: 'Recibe (Técnico)'
        })
        : (typeof window.promptDigitalSignature === 'function'
            ? await window.promptDigitalSignature({
                title: 'Firma de recepción de material',
                subtitle: `Firma con tu dedo para confirmar que recibiste: ${itemsText}.`,
                signerName: techSignerName,
                role: 'Recibe (Técnico)'
            })
            : null);

    if (!sig || !sig.signature) {
        if (typeof OM === 'function') OM('tech-pending-material-prompt-mo');
        if (typeof notify === 'function') notify('Firma requerida para confirmar recepción.', 'warn');
        return;
    }

    targetDispatch.status = 'received';
    targetDispatch.acceptedAt = now;
    targetDispatch.acceptedBy = user.id || '';
    targetDispatch.acceptedByName = techSignerName;
    targetDispatch.receiverSignature = sig.signature;
    targetDispatch.receiverSignatureAt = sig.timestamp || now;
    targetDispatch.receiverSignatureName = sig.signerName || techSignerName;
    targetDispatch.receiverSignatureRole = sig.role || 'Recibe (Técnico)';
    targetDispatch.updatedAt = now;

    if (Array.isArray(state.materialMovements)) {
        const idx = state.materialMovements.findIndex(x => x.id === dispatchId);
        if (idx >= 0) state.materialMovements[idx] = { ...targetDispatch };
    }

    for (const m of (state.materials || [])) {
        const idx = (m.movements || []).findIndex(x => x.id === dispatchId);
        if (idx >= 0) {
            m.movements[idx] = { ...targetDispatch };
            m.updatedAt = now;
        }
    }

    if (typeof saveRecord === 'function') {
        await saveRecord('materialMovements', targetDispatch);
    }
    if (typeof notify === 'function') notify('✓ Recepción física confirmada y firmada de conformidad.', 'ok');

    checkTechnicianPendingMaterialPrompt();
}

async function rechazarRecepcionDesdePlan(dispatchId) {
    if (typeof askReasonPrompt !== 'function') return;
    const motivo = await askReasonPrompt({
        title: 'Devolución de entrega a Soporte Técnico',
        message: 'Indique formalmente el motivo de no conformidad o devolución física del material asignado:',
        placeholder: 'Especifique el motivo, material faltante o inconsistencia física...',
        confirmText: 'Registrar devolución'
    });
    if (!motivo) return;

    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    const now = new Date().toISOString();
    let targetDispatch = null;
    if (Array.isArray(state.materialMovements)) {
        targetDispatch = state.materialMovements.find(x => x.id === dispatchId);
    }
    if (!targetDispatch) {
        for (const m of (state.materials || [])) {
            for (const mov of (m.movements || [])) {
                if (mov.id === dispatchId) {
                    targetDispatch = mov;
                    break;
                }
            }
            if (targetDispatch) break;
        }
    }
    if (!targetDispatch) return notify('Envío de material no encontrado.', 'err');

    targetDispatch.status = 'rejected_delivery';
    targetDispatch.rejectionReason = motivo;
    targetDispatch.rejectedAt = now;
    targetDispatch.rejectedBy = user.id || '';
    targetDispatch.rejectedByName = user.name || user.username || 'Técnico';
    targetDispatch.updatedAt = now;

    if (Array.isArray(state.materialMovements)) {
        const idx = state.materialMovements.findIndex(x => x.id === dispatchId);
        if (idx >= 0) state.materialMovements[idx] = { ...targetDispatch };
    }
    for (const m of (state.materials || [])) {
        const idx = (m.movements || []).findIndex(x => x.id === dispatchId);
        if (idx >= 0) {
            m.movements[idx] = { ...targetDispatch };
            m.updatedAt = now;
        }
    }

    if (typeof saveRecord === 'function') {
        await saveRecord('materialMovements', targetDispatch);
    }
    if (typeof notify === 'function') notify('La entrega de material ha sido devuelta a Soporte Técnico para su corrección.', 'ok');
    checkTechnicianPendingMaterialPrompt();
}

async function rechazarEntregaDesdePlan(dispatchId) {
    if (typeof askReasonPrompt !== 'function') return;
    const motivo = await askReasonPrompt({
        title: 'Devolución de recepción a Soporte Técnico',
        message: 'Indique formalmente el motivo de inconformidad con las cantidades registradas por Soporte Técnico:',
        placeholder: 'Especifique las observaciones o cantidades reales...',
        confirmText: 'Registrar inconformidad'
    });
    if (!motivo) return;

    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    const now = new Date().toISOString();
    let targetDispatch = null;
    if (Array.isArray(state.materialMovements)) {
        targetDispatch = state.materialMovements.find(x => x.id === dispatchId);
    }
    if (!targetDispatch) {
        for (const m of (state.materials || [])) {
            for (const mov of (m.movements || [])) {
                if (mov.id === dispatchId) {
                    targetDispatch = mov;
                    break;
                }
            }
            if (targetDispatch) break;
        }
    }
    if (!targetDispatch) return notify('Envío de material no encontrado.', 'err');

    targetDispatch.status = 'rejected_receipt';
    targetDispatch.receiptRejectionReason = motivo;
    targetDispatch.receiptRejectedAt = now;
    targetDispatch.receiptRejectedBy = user.id || '';
    targetDispatch.receiptRejectedByName = user.name || user.username || 'Técnico';
    targetDispatch.updatedAt = now;

    if (Array.isArray(state.materialMovements)) {
        const idx = state.materialMovements.findIndex(x => x.id === dispatchId);
        if (idx >= 0) state.materialMovements[idx] = { ...targetDispatch };
    }
    for (const m of (state.materials || [])) {
        const idx = (m.movements || []).findIndex(x => x.id === dispatchId);
        if (idx >= 0) {
            m.movements[idx] = { ...targetDispatch };
            m.updatedAt = now;
        }
    }

    if (typeof saveRecord === 'function') {
        await saveRecord('materialMovements', targetDispatch);
    }
    if (typeof notify === 'function') notify('La recepción de material ha sido devuelta a Soporte Técnico para su corrección.', 'ok');
    checkTechnicianPendingMaterialPrompt();
}


async function confirmarEntregaTecnicoDesdePlan(dispatchId) {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    const now = new Date().toISOString();
    let targetDispatch = null;

    if (Array.isArray(state.materialMovements)) {
        targetDispatch = state.materialMovements.find(x => x.id === dispatchId);
    }
    if (!targetDispatch) {
        for (const m of (state.materials || [])) {
            for (const mov of (m.movements || [])) {
                if (mov.id === dispatchId) {
                    targetDispatch = mov;
                    break;
                }
            }
            if (targetDispatch) break;
        }
    }

    if (!targetDispatch) return notify('Envío de material no encontrado.', 'err');

    // Cerrar aviso para dar paso directo y limpio a la firma digital en celular/web
    if (typeof CM === 'function') CM('tech-pending-material-prompt-mo');

    // FIRMA DIGITAL DEL TÉCNICO EN CELULAR / WEB (OBLIGATORIA)
    const techSignerName = user.name || user.username || targetDispatch.technicianName || 'Técnico';
    const sig = typeof promptDigitalSignature === 'function'
        ? await promptDigitalSignature({
            title: 'Firma de devolución de material',
            subtitle: 'Firma con tu dedo para certificar la devolución del material a Soporte Técnico.',
            signerName: techSignerName,
            role: 'Entrega (Técnico)'
        })
        : (typeof window.promptDigitalSignature === 'function'
            ? await window.promptDigitalSignature({
                title: 'Firma de devolución de material',
                subtitle: 'Firma con tu dedo para certificar la devolución del material a Soporte Técnico.',
                signerName: techSignerName,
                role: 'Entrega (Técnico)'
            })
            : null);

    if (!sig || !sig.signature) {
        if (typeof OM === 'function') OM('tech-pending-material-prompt-mo');
        if (typeof notify === 'function') notify('Firma requerida para confirmar devolución.', 'warn');
        return;
    }

    targetDispatch.status = targetDispatch.returnReceiverSignature ? 'completed' : 'pending_handover';
    targetDispatch.handoverAcceptedAt = now;
    targetDispatch.handoverAcceptedBy = user.id || '';
    targetDispatch.handoverAcceptedByName = techSignerName;
    targetDispatch.returnGiverSignature = sig.signature;
    targetDispatch.returnGiverSignatureAt = sig.timestamp || now;
    targetDispatch.returnGiverSignatureName = sig.signerName || techSignerName;
    targetDispatch.returnGiverSignatureRole = sig.role || 'Entrega (Técnico)';
    if (targetDispatch.returnDetails) {
        targetDispatch.returnDetails.techConfirmedAt = now;
        targetDispatch.returnDetails.techConfirmedBy = user.id || '';
        targetDispatch.returnDetails.techConfirmedByName = techSignerName;
    }
    targetDispatch.updatedAt = now;

    if (Array.isArray(state.materialMovements)) {
        const idx = state.materialMovements.findIndex(x => x.id === dispatchId);
        if (idx >= 0) state.materialMovements[idx] = { ...targetDispatch };
    }

    for (const m of (state.materials || [])) {
        const idx = (m.movements || []).findIndex(x => x.id === dispatchId);
        if (idx >= 0) {
            m.movements[idx] = { ...targetDispatch };
            m.updatedAt = now;
        }
    }

    if (typeof saveRecord === 'function') {
        await saveRecord('materialMovements', targetDispatch);
    }
    if (typeof notify === 'function') notify('✓ Entrega de material confirmada y firmada de conformidad.', 'ok');

    checkTechnicianPendingMaterialPrompt();
}

function setTechnicianNavActive(index) {
    document.querySelectorAll('.tech-bottom-nav-three > *').forEach((item, itemIndex) => item.classList.toggle('active', itemIndex === index));
}

function openTechnicianDetails() {
    document.body.dataset.techView = 'details';
    setTechnicianNavActive(0);
    applyTechnicianViewportLayout();
    const dayMapCard = document.getElementById('tech-day-map-card');
    if (dayMapCard) dayMapCard.style.display = 'block';
    try { document.querySelector('.tech-calendar-toolbar')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); } catch (_) { }
    setTimeout(() => {
        renderTechnicianDayMap();
        try { technicianDayMap?.invalidateSize(); } catch (_) { }
    }, 80);
    requestTechnicianRealtimeWeather();
}

function openTechnicianRouteMap() {
    document.body.dataset.techView = 'map';
    setTechnicianNavActive(1);
    const box = document.getElementById('plan-map-box');
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) { }
    setTimeout(() => {
        renderTechnicianRouteOverview();
        if (typeof initPlanMap === 'function' && !planMap) {
            initPlanMap();
        }
        planMap?.invalidateSize();
        renderPlanMap();
        setTimeout(() => planMap?.invalidateSize(), 120);
    }, 180);
}

function openTechnicianRecommendedRoutes() {
    setTechnicianNavActive(2);
    if (typeof openPresetRoutesModal === 'function') {
        openPresetRoutesModal();
    }
}

const expandedTechRouteStopIds = new Set();

function getDetailLocationInfo(detail) {
    if (!detail) return { hasLocation: false, label: 'Sin ubicación', url: '' };
    const raw = detail.detailLocation || detail.technicianReport?.location || '';
    if (raw && typeof getLocationDisplay === 'function') {
        const loc = getLocationDisplay(raw);
        if (loc && (loc.hasLocation || loc.url)) {
            return {
                hasLocation: true,
                label: loc.label || (loc.lat && loc.lng ? `${loc.lat}, ${loc.lng}` : 'Ubicación registrada'),
                url: loc.url || (loc.lat && loc.lng ? `https://www.google.com/maps?q=${loc.lat},${loc.lng}` : '')
            };
        }
    }
    const lat = safeFloat(detail.lat);
    const lng = safeFloat(detail.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
        return {
            hasLocation: true,
            label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            url: `https://www.google.com/maps?q=${lat},${lng}`
        };
    }
    return {
        hasLocation: false,
        label: 'Sin ubicación registrada',
        url: ''
    };
}

function toggleTechnicianRouteStopDetails(stopId) {
    if (expandedTechRouteStopIds.has(stopId)) {
        expandedTechRouteStopIds.delete(stopId);
    } else {
        expandedTechRouteStopIds.add(stopId);
    }
    renderTechnicianRouteOverview();
}

function renderTechnicianRouteOverview() {
    if (!isTechnicianPlanView()) return;
    const plan = getSelectedGeneralPlan();
    const stops = getPlanStopsForView('general');
    const totals = stops.reduce((result, stop) => {
        const progress = getStopProgress(stop);
        result.details += progress.total;
        result.done += progress.done;
        result.pending += progress.pending;
        return result;
    }, { details: 0, done: 0, pending: 0 });
    const title = document.getElementById('tech-route-overview-title');
    const dateBox = document.getElementById('tech-route-overview-date');
    const kpis = document.getElementById('tech-route-overview-kpis');
    if (_planInitialCloudLoading && !stops.length) {
        if (title) title.textContent = 'Cargando tu ruta...';
        if (dateBox) dateBox.textContent = 'Sincronizando paradas asignadas...';
        if (kpis) kpis.innerHTML = `<div><strong>…</strong><small>pueblos</small></div><div><strong>…</strong><small>trabajos</small></div><div><strong>…</strong><small>listos</small></div><div><strong>…</strong><small>pendientes</small></div>`;
        const travelSummaryLoading = document.getElementById('tech-route-travel-summary');
        if (travelSummaryLoading) { travelSummaryLoading.style.display = 'none'; travelSummaryLoading.innerHTML = ''; }
        const namesLoading = document.getElementById('tech-route-stop-names');
        if (namesLoading) namesLoading.innerHTML = renderTechnicianMobileLoadingHtml();
        return;
    }
    if (title) title.textContent = plan?.name || 'Ruta asignada';
    if (dateBox) dateBox.textContent = `${stops.length} parada${stops.length === 1 ? '' : 's'} programada${stops.length === 1 ? '' : 's'}`;
    if (kpis) kpis.innerHTML = `<div><strong>${stops.length}</strong><small>pueblos</small></div><div><strong>${totals.details}</strong><small>trabajos</small></div><div><strong>${totals.done}</strong><small>listos</small></div><div><strong>${totals.pending}</strong><small>pendientes</small></div>`;
    const feasibility = calculateDayRouteFeasibility(stops);
    const travelSummary = document.getElementById('tech-route-travel-summary');
    if (travelSummary) {
        if (stops.length > 1 && feasibility && feasibility.totalKm > 0) {
            travelSummary.style.display = 'flex';
            travelSummary.innerHTML = `
                <div class="tech-route-travel-chip">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
                    <span>Carretera total: <strong>~${feasibility.totalKm} km</strong></span>
                </div>
                <div class="tech-route-travel-chip">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>Traslado acumulado: <strong>~${feasibility.travelFormatted}</strong></span>
                </div>
            `;
        } else {
            travelSummary.style.display = 'none';
            travelSummary.innerHTML = '';
        }
    }
    const names = document.getElementById('tech-route-stop-names');
    if (names) names.innerHTML = stops.length ? stops.map((stop, index) => {
        const equipment = stop.equipmentId ? (state.equipment || []).find(item => item.id === stop.equipmentId && !item.deletedAt) : null;
        const node = stop.nodeId ? (state.nodes || []).find(item => item.id === stop.nodeId && !item.deletedAt) : null;
        const progress = getStopProgress(stop);
        const isExpanded = expandedTechRouteStopIds.has(stop.id);
        const stopName = getTechnicianStopName(stop, equipment, node);
        const details = getStopDetails(stop);
        const pendingDetails = details.filter(d => isDetailPendingInStop(d, stop));
        const completedDetails = details.filter(d => isDetailCompletedInStop(d, stop));

        let currentSubtab = techStopSubtabs.get(stop.id);
        if (!currentSubtab) {
            currentSubtab = pendingDetails.length > 0 ? 'pending' : (completedDetails.length > 0 ? 'completed' : 'pending');
        }
        const activeList = currentSubtab === 'completed' ? completedDetails : pendingDetails;

        const detailsHtml = isExpanded ? `
            <div class="tech-route-stop-expanded-details" id="tech-stop-expanded-${escapeAttr(stop.id)}">
                <div class="tech-expanded-tabs-bar">
                    <button type="button" class="tech-stop-subtab ${currentSubtab === 'pending' ? 'active' : ''}" onclick="event.stopPropagation();setTechnicianStopSubtab('${escapeAttr(stop.id)}','pending')">
                        Pendientes (${pendingDetails.length})
                    </button>
                    <button type="button" class="tech-stop-subtab ${currentSubtab === 'completed' ? 'active' : ''}" onclick="event.stopPropagation();setTechnicianStopSubtab('${escapeAttr(stop.id)}','completed')">
                        Completados (${completedDetails.length})
                    </button>
                </div>
                ${activeList.length ? activeList.map(detail => {
            const done = detail.status === 'completada';
            const noDone = detail.status === 'no_realizado';
            const noDoneBadgeLabel = noDone ? formatNoRealizadoBadgeLabel(detail) : '';
            const noDoneReason = noDone ? String(detail.technicianReport?.reason || '').trim() : '';
            const reattendableNoDone = noDone && isDetailPendingInStop(detail, stop);
            const category = getPlanDetailCategory(detail);
            const folio = getDetailFolio(detail);
            const hasClient = !!(detail.clientName && String(detail.clientName).trim());
            const client = hasClient ? detail.clientName.trim() : '';
            const rawPhone = String(detail.clientPhone || detail.phone || detail.technicianReport?.phone || '').replace(/\D/g, '');
            const hasValidPhone = rawPhone.length >= 7 && !/^0+$/.test(rawPhone);
            const detailText = getWorkOrderRequestedText(detail, 'Sin especificación');
            const locInfo = getDetailLocationInfo(detail);

            const phoneBtn = hasValidPhone ? `
                        <a href="tel:${escapeAttr(rawPhone)}" class="tech-call-btn" title="Llamar al cliente" onclick="event.stopPropagation()">
                            <svg class="tech-btn-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            Llamar
                        </a>
                        <a href="https://wa.me/52${escapeAttr(rawPhone.slice(-10))}" target="_blank" rel="noopener" class="tech-wa-btn" title="Enviar WhatsApp al cliente" onclick="event.stopPropagation()">
                            <svg class="tech-btn-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.9 11.9 0 0 0 12 0C5.4 0 0 5.4 0 12c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.6c1.7 1 3.7 1.6 5.7 1.6 6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.5zm-8.5 18.5c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4c-1-1.6-1.5-3.4-1.5-5.4 0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10-10 10zm5.5-7.5c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.5-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.7-.9-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6s1.1 3 1.3 3.2c.2.2 2.2 3.4 5.3 4.8.7.3 1.3.5 1.8.7.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2.1-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg>
                            WhatsApp
                        </a>` : '';

            const actionsHtml = `
                        <button type="button" class="btn bsm bgh" onclick="event.stopPropagation();openPlanDetailReport('${escapeAttr(detail.id)}','${escapeAttr(stop.id)}')">Detalle</button>
                        ${done
                    ? `<button type="button" class="btn bsm tech-detail-edit" onclick="event.stopPropagation();openTechnicianCompletionForm('${escapeAttr(detail.id)}')">Editar</button>`
                    : (noDone && !reattendableNoDone
                        ? `<button type="button" class="btn bsm bg2 tech-detail-finish tech-detail-finish-later" onclick="event.stopPropagation();openTechnicianCompletionForm('${escapeAttr(detail.id)}')">Terminar</button>`
                        : `<button type="button" class="btn bsm bg2 tech-detail-finish" onclick="event.stopPropagation();openTechnicianCompletionForm('${escapeAttr(detail.id)}')">Terminar</button><button type="button" class="btn bsm ba tech-detail-incomplete" onclick="event.stopPropagation();reportPlanDetailIncomplete('${escapeAttr(detail.id)}','${escapeAttr(stop.id)}')">No realizado</button>`)}`;

            const gpsHtml = locInfo.hasLocation ? `
                        <div class="tech-detail-location-badge has-gps">
                            <svg class="tech-gps-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                            <a class="order-location-link" href="${escapeAttr(locInfo.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Maps (${escapeHtml(locInfo.label)})</a>
                        </div>` : '';

            return `
                        <div class="tech-inline-detail-card ${done ? 'is-done' : (noDone ? 'is-nodone' : 'is-pending')}" style="border-left-color:${pc(detail.priority)}">
                            <div class="tech-inline-detail-top">
                                <div class="tech-inline-detail-badges">
                                    <span class="detail-folio">${escapeHtml(folio)}</span>
                                    <span class="badge ${done ? 'bgn' : (noDone ? 'ba tech-no-realizado-badge' : 'bty')}">${done ? 'Completado' : (noDone ? escapeHtml(noDoneBadgeLabel) : 'Pendiente')}</span>
                                    <span class="plan-category-badge category-${escapeAttr(category)}">${escapeHtml(planCategoryLabel(category))}</span>
                                    <span class="priority-badge priority-${escapeAttr(detail.priority || 'media')}"><span class="priority-dot"></span>${escapeHtml(pl(detail.priority || 'media'))}</span>
                                </div>
                            </div>
                            <div class="tech-inline-detail-body">
                                ${client ? `<div class="tech-inline-detail-client"><strong>Cliente:</strong> ${escapeHtml(client)}</div>` : ''}
                                ${hasValidPhone ? `<div class="tech-inline-detail-phone"><strong>Teléfono:</strong> <a href="tel:${escapeAttr(rawPhone)}" onclick="event.stopPropagation()">${escapeHtml(detail.clientPhone || detail.phone || detail.technicianReport?.phone || rawPhone)}</a></div>` : ''}
                                <div class="tech-inline-detail-desc">${escapeHtml(detailText)}</div>
                                ${noDoneReason ? `<div class="tech-no-realizado-reason-chip"><strong>Motivo anterior:</strong> ${escapeHtml(noDoneReason)}</div>` : ''}
                                ${gpsHtml}
                            </div>
                            <div class="tech-inline-detail-actions">
                                ${phoneBtn}
                                ${actionsHtml}
                            </div>
                        </div>
                    `;
        }).join('') : `<div class="tech-route-detail-empty">${currentSubtab === 'completed' ? 'Sin trabajos completados en esta parada.' : 'Sin trabajos pendientes en esta parada.'}</div>`}
            </div>` : '';

        let legTransitHtml = '';
        if (index > 0 && feasibility && feasibility.legs && feasibility.legs[index - 1]) {
            const leg = feasibility.legs[index - 1];
            legTransitHtml = `
                <div class="tech-route-leg-transit">
                    <div class="tech-route-leg-badge" title="Distancia estimada por carretera (38 km/h)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
                        <span><b>~${leg.minutes} min</b> (${leg.km} km)</span>
                    </div>
                </div>`;
        }
        return legTransitHtml + `
            <div class="tech-route-stop-item ${isExpanded ? 'expanded' : ''}">
                <button type="button" class="tech-route-stop-btn ${isExpanded ? 'active' : ''}" onclick="toggleTechnicianRouteStopDetails('${escapeAttr(stop.id)}')">
                    <span>${index + 1}</span>
                    <strong class="tech-stop-name">${escapeHtml(stopName)}<span class="tech-stop-weather-chip" id="tech-overview-weather-${escapeAttr(stop.id)}"></span></strong>
                    <div class="tech-stop-badge-col">
                        <small class="tech-stop-progress-text">${progress.done}/${progress.total} listos</small>
                        <svg class="tech-chevron-icon ${isExpanded ? 'open' : ''}" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                </button>
                ${detailsHtml}
            </div>
        `;
    }).join('') : '<div class="plan-empty">No hay paradas para este día.</div>';
    updateStopsWeatherBadges(stops);
}

const techStopSubtabs = new Map();
function setTechnicianStopSubtab(stopId, tabName) {
    techStopSubtabs.set(stopId, tabName);
    renderTechnicianRouteOverview();
}

function openTechnicianRouteStop(stopId) {
    const marker = planMarkers.find(item => item._planStopId === stopId);
    const mapBox = document.getElementById('plan-map-box');
    if (!marker || !planMap) return notify('Esta parada no tiene una ubicación disponible.', 'err');
    const position = marker.getLatLng();
    planMap.setView(position, Math.max(planMap.getZoom(), 15), { animate: true });
    marker.openPopup();
    mapBox?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function selectTechnicianAgendaDate(dateKey) {
    selectedCalendarDate = dateKey;
    if (dateKey) {
        sessionStorage.setItem('plan_selected_calendar_date', dateKey);
    }
    technicianSummaryMode = 'day';
    document.querySelector('.tech-calendar-toolbar')?.remove();
    configureTechnicianDashboard();
    renderPlanKpis();
    renderPlanDays();
    renderPlanMap();
    renderTechnicianDayMap();
}

function toggleTechnicianSummaryMode() {
    technicianSummaryMode = technicianSummaryMode === 'general' ? 'day' : 'general';
    const button = document.querySelector('.tech-summary-toggle');
    if (button) button.textContent = technicianSummaryMode === 'general' ? 'Ver resumen del día' : 'Ver resumen general';
    const title = document.getElementById('plan-title');
    if (title) title.textContent = technicianSummaryMode === 'general' ? 'Todos los detalles' : 'Detalles del día';
    renderPlanKpis();
    renderPlanDays();
    if (isTechnicianPlanView()) {
        setTimeout(renderTechnicianDayMap, 60);
    }
}

function getTechnicianSummaryMode() {
    return technicianSummaryMode;
}

function renderTechnicianDayMap() {
    if (!isTechnicianPlanView() || typeof L === 'undefined') return;
    const element = document.getElementById('tech-day-map');
    if (!element) return;
    if (!selectedTechId && isTechnicianPlanView()) {
        selectedTechId = getLoggedTechnicianId();
    }
    if (!technicianDayMap || technicianDayMap.getContainer?.() !== element) {
        if (technicianDayMap) {
            try { technicianDayMap.remove(); } catch (_) { }
            technicianDayMap = null;
        }
        if (element._leaflet_id) {
            delete element._leaflet_id;
            element.innerHTML = '';
        }
        try {
            technicianDayMap = L.map(element, { scrollWheelZoom: false }).setView([17.55, -99.50], 8);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(technicianDayMap);
            technicianDayMapLayer = L.layerGroup().addTo(technicianDayMap);
        } catch (mapErr) {
            console.warn('Error inicializando mapa de hoy del técnico:', mapErr);
            return;
        }
    }
    if (!technicianDayMapLayer) {
        technicianDayMapLayer = L.layerGroup().addTo(technicianDayMap);
    } else {
        technicianDayMapLayer.clearLayers();
    }
    if (typeof ResizeObserver !== 'undefined' && !element._hasTechResizeObserver) {
        element._hasTechResizeObserver = true;
        try {
            const ro = new ResizeObserver(() => {
                try { technicianDayMap?.invalidateSize(); } catch (_) { }
            });
            ro.observe(element);
        } catch (_) { }
    }
    const date = selectedCalendarDate || localDateKey();
    const points = [];
    const allStops = getPlanStopsForView('general');
    let targetStops = allStops.filter(stop => stop.scheduledDate === date);
    if (!targetStops.length && (!selectedCalendarDate || selectedCalendarDate === localDateKey())) {
        const unscheduled = allStops.filter(stop => !stop.scheduledDate);
        if (unscheduled.length) targetStops = unscheduled;
        else if (allStops.length) targetStops = allStops;
    }
    if (technicianSummaryMode === 'general') {
        targetStops = allStops;
    }
    targetStops.forEach(stop => {
        if (stop.equipmentId && !stop.nodeId) {
            const equipment = (state.equipment || []).find(item => item.id === stop.equipmentId && !item.deletedAt);
            const lat = safeFloat(equipment?.lat);
            const lng = safeFloat(equipment?.lng);
            if (!isNaN(lat) && !isNaN(lng)) points.push({ lat, lng, name: equipment?.name || stop.name || 'Sin nombre', stop, isAntenna: true });
        }
        const stopLat = safeFloat(stop.lat);
        const stopLng = safeFloat(stop.lng);
        if (!isNaN(stopLat) && !isNaN(stopLng) && !(stopLat === 0 && stopLng === 0)) {
            const stopDisplay = typeof getPlanMapStopDisplayName === 'function' ? getPlanMapStopDisplayName(stop) : (stop.name || 'Sin nombre');
            points.push({ lat: stopLat, lng: stopLng, name: stopDisplay, stop, isAntenna: Boolean(stop.equipmentId && !stop.nodeId) });
        }
        getStopDetails(stop).forEach(detail => {
            const parsed = typeof parseOptionalLocation === 'function' ? parseOptionalLocation(detail.detailLocation || '') : {};
            const lat = safeFloat(detail.lat ?? parsed.lat);
            const lng = safeFloat(detail.lng ?? parsed.lng);
            const fallbackLat = safeFloat(parsed.lat);
            const fallbackLng = safeFloat(parsed.lng);
            const validPoint = (a, b) => !isNaN(a) && !isNaN(b) && !(a === 0 && b === 0);
            if (validPoint(lat, lng)) points.push({ lat, lng, name: `${getDetailFolio(detail)} · ${detail.clientName || detail.title || 'Detalle'}`, detail, stop });
            else if (validPoint(fallbackLat, fallbackLng)) points.push({ lat: fallbackLat, lng: fallbackLng, name: `${getDetailFolio(detail)} · ${detail.clientName || detail.title || 'Detalle'}`, detail, stop });
        });
    });
    const routedPoints = ensureRoutePointsStartAtWiFiMex(points);
    routedPoints.forEach((point, index) => {
        const markerOpts = typeof makePlanStopMarkerIcon === 'function'
            ? { icon: makePlanStopMarkerIcon(point.detail ? { ...point.stop, isDetail: true } : (point.isOrigin ? point : { ...(point.stop || {}), isAntenna: point.isAntenna }), index + 1) }
            : {};
        const marker = L.marker([point.lat, point.lng], markerOpts).bindTooltip(point.isOrigin ? `Base · ${point.name}` : `${index + 1}. ${point.name}`).addTo(technicianDayMapLayer);
        if (point.isOrigin) {
            marker.bindPopup(`
                <div class="plan-map-popup">
                    <strong>${escapeHtml(point.name || 'WiFi-Mex')}</strong>
                    <div style="font-size:11px;color:#0f766e;font-weight:700;margin:3px 0">Parada principal · Base de salida</div>
                    <div style="font-size:11px;color:#64748b">${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}</div>
                </div>
            `);
        } else if (point.detail) {
            const d = point.detail;
            const folio = getDetailFolio(d);
            const client = d.clientName || 'Sin cliente';
            const locInfo = getDetailLocationInfo(d);
            marker.bindPopup(`
                <div class="plan-map-popup">
                    <strong>${index + 1}. ${escapeHtml(folio)}</strong>
                    <div style="font-size:12px;font-weight:700;margin:3px 0">${escapeHtml(client)}</div>
                    <div style="font-size:11px;color:#64748b;margin-bottom:6px">${escapeHtml(d.title || d.desc || '')}</div>
                    ${locInfo.hasLocation ? `<div style="margin-top:6px"><a class="order-location-link" href="${escapeAttr(locInfo.url)}" target="_blank" rel="noopener">Abrir en Google Maps</a></div>` : ''}
                </div>
            `);
        } else if (point.stop) {
            marker.bindPopup(`
                <div class="plan-map-popup">
                    <strong>${index + 1}. ${escapeHtml(point.name)}</strong>
                    <div style="font-size:11px;color:#64748b;margin:3px 0">${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}</div>
                    <div style="margin-top:6px"><a class="order-location-link" href="https://www.google.com/maps?q=${point.lat},${point.lng}" target="_blank" rel="noopener">Abrir en Google Maps</a></div>
                </div>
            `);
        }
    });
    const applyPointsBounds = () => {
        if (routedPoints.length) technicianDayMap.fitBounds(routedPoints.map(point => [point.lat, point.lng]), { padding: [28, 28], maxZoom: 15 });
        else technicianDayMap.setView([17.55, -99.50], 8);
    };

    const drawUserPosition = (userLat, userLng) => {
        if (!technicianDayMap || !technicianDayMapLayer) return;
        try {
            const pulseIcon = L.divIcon({
                className: 'tech-realtime-gps-icon',
                html: '<div class="gps-pulse-outer"></div><div class="gps-pulse-inner"></div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            L.marker([userLat, userLng], { icon: pulseIcon, zIndexOffset: 1000 })
                .bindPopup('<strong>Tu ubicación en tiempo real</strong>')
                .addTo(technicianDayMapLayer);

            let closest = null;
            let minKm = Infinity;
            routedPoints.forEach(p => {
                if (p.detail && isDetailPendingInStop(p.detail, p.stop)) {
                    const km = calculateHaversineKm(userLat, userLng, p.lat, p.lng);
                    if (km < minKm) {
                        minKm = km;
                        closest = { ...p, km };
                    }
                }
            });

            const chipContainer = element.closest('.tech-day-map-card') || element.parentElement;
            let chip = document.getElementById('tech-closest-point-chip');
            if (!chip && chipContainer) {
                chip = document.createElement('div');
                chip.id = 'tech-closest-point-chip';
                chip.className = 'tech-closest-point-chip';
                element.before(chip);
            }
            if (chip) {
                if (closest) {
                    chip.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg><span>Detalle más cercano: <b>${escapeHtml(closest.name)}</b> (~${closest.km.toFixed(1)} km)</span>`;
                    chip.onclick = () => {
                        technicianDayMap?.setView([closest.lat, closest.lng], 16, { animate: true });
                    };
                    chip.style.display = 'flex';
                } else {
                    chip.style.display = 'none';
                }
            }

            const allCoords = points.map(p => [p.lat, p.lng]).concat([[userLat, userLng]]);
            technicianDayMap.fitBounds(allCoords, { padding: [28, 28], maxZoom: 15 });
        } catch (gpsDrawErr) {
            console.warn('No se pudo dibujar la ubicación del técnico:', gpsDrawErr);
            applyPointsBounds();
        }
    };

    // Reutiliza la última posición GPS (máx. 2 min) para no pedir GPS en cada redibujado.
    const cachedGps = window._techLastGpsPosition;
    if (cachedGps && (Date.now() - cachedGps.at) < 120000) {
        drawUserPosition(cachedGps.lat, cachedGps.lng);
    } else if (navigator.geolocation && !window._techGpsRequestInFlight) {
        applyPointsBounds();
        window._techGpsRequestInFlight = true;
        navigator.geolocation.getCurrentPosition(pos => {
            window._techGpsRequestInFlight = false;
            window._techLastGpsPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude, at: Date.now() };
            drawUserPosition(pos.coords.latitude, pos.coords.longitude);
        }, () => {
            window._techGpsRequestInFlight = false;
        }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 });
    } else {
        applyPointsBounds();
    }
    const dateLabel = document.getElementById('tech-day-map-date');
    const dayMapCardEl = document.getElementById('tech-day-map-card');
    if (_planInitialCloudLoading && points.length === 0) {
        if (dateLabel) dateLabel.textContent = `${formatCalendarDate(date)} · Cargando ubicaciones...`;
        if (dayMapCardEl) dayMapCardEl.classList.add('is-loading');
    } else {
        if (dateLabel) dateLabel.textContent = `${formatCalendarDate(date)} · ${points.length} ubicaci${points.length === 1 ? 'ón' : 'ones'}`;
        if (dayMapCardEl) dayMapCardEl.classList.remove('is-loading');
    }
    setTimeout(() => technicianDayMap?.invalidateSize(), 50);
}

function toggleTechLocationsSheet() {
    const sheet = document.getElementById('tech-locations-sheet');
    const btn = document.getElementById('tech-toggle-sheet-btn');
    if (!sheet) return;
    if (sheet.style.display === 'none' || !sheet.style.display) {
        renderTechLocationsSheet();
        sheet.style.display = 'block';
        if (btn) btn.textContent = 'Ocultar paradas';
    } else {
        sheet.style.display = 'none';
        if (btn) btn.textContent = 'Ver paradas';
    }
}

function refreshTechnicianDayMap() {
    notify('Actualizando mapa y coordenadas...');
    if (typeof renderTechnicianDayMap === 'function') {
        renderTechnicianDayMap();
    }
    const sheet = document.getElementById('tech-locations-sheet');
    if (sheet && sheet.style.display !== 'none') {
        renderTechLocationsSheet();
    }
}

function renderTechLocationsSheet() {
    const sheet = document.getElementById('tech-locations-sheet');
    if (!sheet) return;
    const date = selectedCalendarDate || (typeof localDateKey === 'function' ? localDateKey() : new Date().toISOString().slice(0, 10));
    const allStops = typeof getPlanStopsForView === 'function' ? getPlanStopsForView('general') : [];
    const dayStops = allStops.filter(s => (s.scheduledDate || '') === date);

    if (!dayStops.length) {
        sheet.innerHTML = '<div style="color:#64748b;font-size:12px;text-align:center;padding:12px;">No hay paradas programadas para este día.</div>';
        return;
    }

    sheet.innerHTML = dayStops.map((stop, idx) => {
        const details = getStopDetails(stop);
        const name = stop.type === 'equipment' ? (stop.nodeName || stop.name) : stop.name;
        const coords = getStopCoordinates(stop);
        const hasCoords = coords && coords.lat && coords.lng;
        return `
            <div class="tech-location-item" style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;">
                <div>
                    <strong>${idx + 1}. ${escapeHtml(name)}</strong>
                    <div style="font-size:11px;color:#64748b;">${details.length} detalle(s)${hasCoords ? ' · Con GPS' : ' · Sin GPS'}</div>
                </div>
                ${hasCoords ? `<button type="button" class="btn bsm bgh" onclick="technicianDayMap?.setView([${coords.lat}, ${coords.lng}], 16, { animate: true })" style="padding:4px 8px;font-size:11px;">Ver</button>` : ''}
            </div>
        `;
    }).join('');
}

function shiftTechnicianAgendaWeek(offset) {
    const date = new Date(`${selectedCalendarDate || localDateKey()}T12:00:00`);
    date.setDate(date.getDate() + (Number(offset) || 0) * 7);
    selectTechnicianAgendaDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
}

function applyTechnicianViewportLayout() {
    if (typeof document === 'undefined' || !document.body) return;
    const isTech = isTechnicianPlanView();
    const body = document.body;
    const main = document.querySelector('.main');
    const topbar = document.querySelector('.topbar');
    const bottomNav = document.getElementById('tech-bottom-nav') || document.querySelector('.tech-bottom-nav');

    if (isTech) {
        document.documentElement?.classList.add('is-technician-env');
        body.classList.add('plan-technician-view');
        body.style?.setProperty?.('padding-left', '0', 'important');
        body.style?.setProperty?.('width', '100%', 'important');
        main?.style?.setProperty?.('width', '100%', 'important');
        main?.style?.setProperty?.('margin-left', '0', 'important');
        main?.style?.setProperty?.('padding-left', '0', 'important');
        main?.style?.setProperty?.('transform', 'none', 'important');
        topbar?.style?.setProperty?.('display', 'none', 'important');
        if (bottomNav && bottomNav.style) bottomNav.style.setProperty('display', 'grid', 'important');
        const bell = document.getElementById('notification-bell');
        if (bell) bell.remove();
    } else {
        document.documentElement?.classList.remove('is-technician-env');
        document.body.classList.remove('plan-technician-view');
        if (body.dataset) delete body.dataset.techView;
        if (bottomNav && bottomNav.style) bottomNav.style.setProperty('display', 'none', 'important');
        const mobile = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
            ? window.matchMedia('(max-width: 760px)').matches
            : false;
        if (mobile) {
            body.style?.setProperty?.('padding-left', '0', 'important');
            body.style?.setProperty?.('width', '100%', 'important');
            main?.style?.setProperty?.('width', '100%', 'important');
            main?.style?.setProperty?.('margin-left', '0', 'important');
            main?.style?.setProperty?.('transform', 'none', 'important');
            topbar?.style?.setProperty?.('display', 'none', 'important');
        } else {
            body.style?.removeProperty?.('padding-left');
            body.style?.removeProperty?.('width');
            main?.style?.removeProperty?.('width');
            main?.style?.removeProperty?.('margin-left');
            main?.style?.removeProperty?.('padding-left');
            main?.style?.removeProperty?.('transform');
            topbar?.style?.removeProperty?.('display');
        }
    }
    if (!window.__techViewportLayoutBound) {
        window.__techViewportLayoutBound = true;
        window.addEventListener('resize', applyTechnicianViewportLayout, { passive: true });
        window.addEventListener('orientationchange', applyTechnicianViewportLayout, { passive: true });
    }
}

function normalizeWeekPlan() {
    if (!state.weekPlan || Array.isArray(state.weekPlan)) state.weekPlan = {};
    ensureTechPlan(SHARED_PLAN_ID);
    ensureGeneralPlanSystem();
    (state.technicians || []).filter(t => !t.deletedAt).forEach(t => ensureTechPlan(t.id));
}

function ensureTechPlan(techId) {
    if (!techId) return;
    if (!state.weekPlan[techId]) state.weekPlan[techId] = {};
    PLAN_DAYS.forEach(d => {
        if (!Array.isArray(state.weekPlan[techId][d.id])) state.weekPlan[techId][d.id] = [];
    });
}

function ensureGeneralPlanSystem() {
    if (!state.weekPlan || typeof state.weekPlan !== 'object') state.weekPlan = {};
    if (!state.weekPlan[SHARED_PLAN_ID]) state.weekPlan[SHARED_PLAN_ID] = { _generalPlans: [] };
    const shared = state.weekPlan[SHARED_PLAN_ID];
    if (!Array.isArray(shared._generalPlans)) {
        const legacyStops = Array.isArray(shared.general) ? shared.general : [];
        shared._generalPlans = [{
            id: 'general-1',
            name: 'Plan general 1',
            createdAt: new Date().toISOString(),
            stops: legacyStops
        }];
        shared.general = [];
    }
    if (!shared._generalPlans.length && Array.isArray(state.generalPlans) && state.generalPlans.length) {
        shared._generalPlans = state.generalPlans;
    }
    if (!shared._generalPlans.length) {
        shared._generalPlans.push({
            id: gid('gp'),
            name: 'Plan general 1',
            createdAt: new Date().toISOString(),
            assignedTechId: '',
            materialSummary: '',
            stops: []
        });
    }
    const visiblePlans = shared._generalPlans.filter(plan => !plan.deletedAt);
    if (!visiblePlans.length) {
        shared._generalPlans.push({
            id: gid('gp'),
            name: 'Plan general 1',
            createdAt: new Date().toISOString(),
            assignedTechId: '',
            materialSummary: '',
            stops: []
        });
    }
    const activePlans = shared._generalPlans.filter(plan => !plan.deletedAt);
    if (!selectedGeneralPlanId || !activePlans.some(plan => plan.id === selectedGeneralPlanId)) {
        selectedGeneralPlanId = activePlans[0].id;
    }
}

function getGeneralPlans() {
    ensureGeneralPlanSystem();
    const visiblePlans = state.weekPlan[SHARED_PLAN_ID]._generalPlans.filter(plan => !plan.deletedAt);
    if (!visiblePlans.length) {
        const plan = {
            id: gid('gp'),
            name: 'Plan general 1',
            createdAt: new Date().toISOString(),
            assignedTechId: '',
            materialSummary: '',
            stops: []
        };
        state.weekPlan[SHARED_PLAN_ID]._generalPlans.push(plan);
        return [plan];
    }
    return visiblePlans;
}

function isPlanAssignedToTech(plan, techId) {
    if (!plan || !techId) return false;
    const targetId = String(techId || '').trim();
    if (String(plan.assignedTechId || '').trim() === targetId) return true;
    if (Array.isArray(plan.assignedTechIds) && plan.assignedTechIds.map(String).includes(targetId)) return true;

    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    const isLoggedTech = isTechnicianPlanView();
    const targetNorm = normalizeName(targetId);
    const userIdStr = isLoggedTech && user?.id ? String(user.id).trim() : '';
    const userNameNorm = isLoggedTech ? normalizeName(user?.name || '') : '';
    const userUsernameNorm = isLoggedTech ? normalizeName(user?.username || '') : '';
    const userFirstNorm = userNameNorm.split(' ')[0] || '';

    const matchingTechs = (state.technicians || []).filter(t => {
        if (!t || t.deletedAt) return false;
        const tId = String(t.id || '').trim();
        const tUid = String(t.userId || '').trim();
        const tUser = normalizeName(t.usuario || '');
        const tName = normalizeName(t.nombre || t.name || '');
        if (tId === targetId || (tUid && tUid === targetId)) return true;
        if (targetNorm && (tUser === targetNorm || tName === targetNorm)) return true;
        if (isLoggedTech) {
            if (userIdStr && (tId === userIdStr || tUid === userIdStr)) return true;
            if (userUsernameNorm && (tUser === userUsernameNorm || tName === userUsernameNorm)) return true;
            if (userNameNorm && tName && (tName === userNameNorm || (userNameNorm.length >= 3 && (tName.includes(userNameNorm) || userNameNorm.includes(tName))))) return true;
            if (userFirstNorm && userFirstNorm.length >= 3 && tName && (tName === userFirstNorm || tName.startsWith(`${userFirstNorm} `))) return true;
        }
        return false;
    });
    const tech = matchingTechs[0] || null;

    const techNames = [...new Set([
        ...matchingTechs.flatMap(t => [t?.nombre, t?.name, t?.usuario]),
        isLoggedTech ? user?.name : null,
        isLoggedTech ? user?.username : null
    ].filter(Boolean).map(normalizeName))];

    const techIds = [...new Set([
        targetId,
        ...matchingTechs.flatMap(t => [t?.id ? String(t.id) : null, t?.userId ? String(t.userId) : null]),
        isLoggedTech && user?.id ? String(user.id) : null,
        isLoggedTech && user?.username ? String(user.username) : null
    ].filter(Boolean))];

    const namesMatchPerson = (candidateName) => {
        const c = normalizeName(candidateName || '');
        if (!c) return false;
        return techNames.some(tName =>
            tName === c ||
            (tName.length >= 3 && c.length >= 3 && (c.includes(tName) || tName.includes(c)))
        );
    };

    const explicitIds = [...new Set([plan.assignedTechId, ...(Array.isArray(plan.assignedTechIds) ? plan.assignedTechIds : [])].filter(Boolean).map(String))];
    if (explicitIds.length > 0) {
        if (explicitIds.some(id => techIds.includes(id))) return true;
        // También resolver si alguno de los IDs asignados pertenece a otro registro del mismo técnico/usuario
        const resolvedByPerson = explicitIds.some(assignedId => {
            const assignedTech = (state.technicians || []).find(t => t && (String(t.id || '') === assignedId || String(t.userId || '') === assignedId));
            if (assignedTech) {
                if (assignedTech.userId && techIds.includes(String(assignedTech.userId))) return true;
                if (namesMatchPerson(assignedTech.nombre || assignedTech.name) || namesMatchPerson(assignedTech.usuario)) return true;
            }
            const assignedUser = (state.users || []).find(u => u && String(u.id || '') === assignedId);
            if (assignedUser) {
                if (techIds.includes(String(assignedUser.id))) return true;
                if (namesMatchPerson(assignedUser.name) || namesMatchPerson(assignedUser.username)) return true;
            }
            return false;
        });
        return resolvedByPerson;
    }

    if (plan.explicitlyUnassigned === true) {
        return false;
    }

    const planAssignedNames = [
        plan.assignedTechName,
        plan.assignedTo,
        plan.technician,
        plan.techName
    ].filter(Boolean).map(normalizeName);

    if (planAssignedNames.some(pName => techNames.some(tName => pName === tName || pName.includes(tName) || tName.includes(pName)))) {
        return true;
    }

    const planName = normalizeName(plan.name || '');
    const techName = normalizeName(tech?.nombre || tech?.name || '');
    if (techName && planName && (planName.includes(techName) || techName.includes(planName))) return true;
    if (planName && techNames.some(tName => tName && tName.length >= 3 && (planName.includes(tName) || tName.includes(planName)))) {
        return true;
    }

    return false;
}

function getVisibleGeneralPlansForRole() {
    const plans = getGeneralPlans();
    if (!isPlanReadOnly()) return plans;
    if (isTechnicianPlanView()) {
        const technicianId = getLoggedTechnicianId();
        const assigned = technicianId
            ? plans.filter(plan => !plan.deletedAt && isPlanAssignedToTech(plan, technicianId))
            : [];
        if (assigned.length > 0) return assigned;
        // Si quien abre en celular es administrador/soporte/atención (no rol técnico) y no tiene plan propio,
        // permitirle ver los planes activos con paradas en lugar de bloquear con "No tienes planes asignados".
        const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
        const role = typeof normalizeRole === 'function' ? normalizeRole(user?.role) : String(user?.role || '').toLowerCase().trim();
        const isActualTech = role === 'tecnico' || (typeof userHasRole === 'function' && userHasRole('tecnico'));
        if (!isActualTech) {
            const activeWithStops = plans.filter(plan => !plan.deletedAt && Array.isArray(plan.stops) && plan.stops.some(s => !s.deletedAt));
            if (activeWithStops.length) return activeWithStops;
            return plans.filter(plan => !plan.deletedAt);
        }
        return [];
    }
    return plans.filter(plan => !plan.deletedAt && (plan.assignedTechId || (Array.isArray(plan.assignedTechIds) && plan.assignedTechIds.length)));
}

function getPlanStopsRef(techId = selectedTechId, day = selectedDay) {
    ensureTechPlan(techId);
    if (day === 'general') {
        const activePlan = getSelectedGeneralPlan();
        const plan = (activePlan && (techId === SHARED_PLAN_ID || isPlanAssignedToTech(activePlan, techId)))
            ? activePlan
            : (techId === SHARED_PLAN_ID
                ? activePlan
                : (getGeneralPlans().find(item => !item.deletedAt && isPlanAssignedToTech(item, techId)) || activePlan));
        if (plan) {
            if (!Array.isArray(plan.stops)) plan.stops = [];
            if (plan.stops.length > 0) {
                const firstStop = plan.stops[0];
                const firstStopLabel = String(firstStop?.name || firstStop?.town || '').toLowerCase();
                if (!isWiFiMexStop(firstStop) && firstStopLabel.includes('palmar')) {
                    plan.stops[0] = buildWiFiMexOriginStop(firstStop.id || '');
                }
            }
            return plan.stops;
        }
        if (techId === SHARED_PLAN_ID) return [];
    }
    if (!state.weekPlan[techId]) state.weekPlan[techId] = {};
    if (!Array.isArray(state.weekPlan[techId][day])) state.weekPlan[techId][day] = [];
    return state.weekPlan[techId][day];
}

function visibleStops(stops) {
    return (Array.isArray(stops) ? stops : []).filter(stop => !stop.deletedAt);
}

function isEntityInAnyPlan(type, entityId) {
    if (!entityId) return false;
    const field = type === 'equipment' ? 'equipmentId' : 'nodeId';
    return Object.values(state.weekPlan || {}).some(scope => {
        if (!scope || typeof scope !== 'object') return false;
        const regularStops = PLAN_DAYS.some(day =>
            visibleStops(scope[day.id]).some(stop => stop[field] === entityId)
        );
        if (regularStops) return true;
        return (Array.isArray(scope._generalPlans) ? scope._generalPlans : [])
            .filter(plan => plan && !plan.deletedAt)
            .some(plan => visibleStops(plan.stops).some(stop => stop[field] === entityId));
    });
}

function getPlanningMapStatus(type, entityId) {
    const collection = type === 'node' ? state.nodes : state.equipment;
    const entity = (collection || []).find(item => item && item.id === entityId);
    if (!entity || !Number.isFinite(Number(entity.mapVeryHigh))) return getEntityPriorityStatus(type, entityId);
    const counts = {
        muy_alta: Number(entity.mapVeryHigh) || 0,
        alta: Number(entity.mapHigh) || 0,
        media: Number(entity.mapMedium) || 0,
        baja: Number(entity.mapLow) || 0
    };
    const count = counts.muy_alta + counts.alta + counts.media + counts.baja;
    if (counts.muy_alta > 0 || counts.alta >= 3) return { key: 'critico', label: 'Crítico', color: '#ef4444', count, counts };
    if (counts.alta > 0 || counts.media >= 2 || counts.baja >= 4) return { key: 'atencion', label: 'Atención', color: '#f59e0b', count, counts };
    if ((counts.media > 0 || counts.baja > 0) && Number(entity.mapPlannedOpen) > 0) return { key: 'pendiente', label: 'Pendiente', color: '#3b82f6', count, counts };
    return { key: 'despejado', label: 'Despejado', color: '#22c55e', count: 0, counts };
}

function getSelectedGeneralPlan() {
    const plans = getVisibleGeneralPlansForRole();
    if (!plans.length) return null;
    if (!isTechnicianPlanView()) {
        const found = plans.find(plan => plan.id === selectedGeneralPlanId);
        const selected = found || plans[0];
        selectedGeneralPlanId = selected?.id || '';
        return selected;
    }
    const myTechId = getLoggedTechnicianId();
    let candidates = myTechId ? plans.filter(plan => isPlanAssignedToTech(plan, myTechId)) : [];
    if (!candidates.length) {
        candidates = plans;
    }
    const selected = candidates.find(plan => plan.id === selectedGeneralPlanId) || candidates[0];
    selectedGeneralPlanId = selected?.id || '';
    return selected;
}

function formatShortDate(value) {
    if (!value) return 'sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'sin fecha';
    return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function initPlanSelectors() {
    const techSelect = document.getElementById('plan-tech');
    const generalPlanSelect = document.getElementById('general-plan-select');
    const generalTools = document.getElementById('general-plan-tools');
    const activeTechs = (state.technicians || []).filter(t => !t.deletedAt && t.estado !== 'inactivo');
    const visibleGeneralPlans = getVisibleGeneralPlansForRole();

    if (isTechnicianPlanView()) {
        ensureLoggedTechnicianRecord();
        const myTechId = getLoggedTechnicianId();
        selectedTechId = myTechId;
        selectedDay = 'general';

        const myTech = (state.technicians || []).find(t => !t.deletedAt && (String(t.id) === myTechId || String(t.userId || '') === myTechId)) || {
            id: myTechId,
            nombre: getCurrentUser()?.name || getCurrentUser()?.username || 'Técnico'
        };

        let techPlans = visibleGeneralPlans.filter(plan => !plan.deletedAt && isPlanAssignedToTech(plan, myTechId));
        if (!techPlans.length) {
            techPlans = getGeneralPlans().filter(plan => !plan.deletedAt && isPlanAssignedToTech(plan, myTechId));
        }
        if (!techPlans.length && getGeneralPlans().length > 0) {
            techPlans = getGeneralPlans().filter(plan => !plan.deletedAt);
        }

        const savedPlanId = sessionStorage.getItem('plan_selected_general_plan_id');
        if (savedPlanId && techPlans.some(plan => plan.id === savedPlanId)) {
            selectedGeneralPlanId = savedPlanId;
        } else {
            selectedGeneralPlanId = techPlans.some(plan => plan.id === selectedGeneralPlanId)
                ? selectedGeneralPlanId
                : (techPlans[0]?.id || '');
        }
        if (selectedGeneralPlanId) {
            sessionStorage.setItem('plan_selected_general_plan_id', selectedGeneralPlanId);
        }

        const savedDate = sessionStorage.getItem('plan_selected_calendar_date');
        if (savedDate && !selectedCalendarDate) {
            selectedCalendarDate = savedDate;
        }

        techSelect.innerHTML = `<option value="${escapeAttr(myTech.id)}" selected>${escapeHtml(myTech.nombre)}</option>`;
        techSelect.value = myTech.id;
        techSelect.disabled = true;

        const daySel = document.getElementById('plan-day');
        if (daySel) daySel.value = 'general';

        generalPlanSelect.innerHTML = techPlans.length
            ? techPlans.map(plan => `<option value="${plan.id}" ${plan.id === selectedGeneralPlanId ? 'selected' : ''}>${escapeHtml(plan.name)}</option>`).join('')
            : '<option value="">Sin planes asignados</option>';
        generalPlanSelect.value = selectedGeneralPlanId;
        renderGeneralPlanAssigneeSelect();
        generalTools.style.display = 'none';
        return;
    }

    if (isPlanReadOnly()) {
        const assignedPlans = visibleGeneralPlans.filter(plan => plan.assignedTechId || (Array.isArray(plan.assignedTechIds) && plan.assignedTechIds.length));
        const assignedTechIds = [...new Set(assignedPlans.flatMap(plan => [plan.assignedTechId, ...(Array.isArray(plan.assignedTechIds) ? plan.assignedTechIds : [])].filter(Boolean)))];
        const assignedTechs = activeTechs.filter(tech => assignedTechIds.includes(tech.id));
        if (!assignedTechs.some(tech => tech.id === selectedTechId)) {
            selectedTechId = assignedTechs[0]?.id || '';
        }
        selectedDay = 'general';
        const techPlans = assignedPlans.filter(plan => isPlanAssignedToTech(plan, selectedTechId));
        const savedPlanId = sessionStorage.getItem('plan_selected_general_plan_id');
        if (savedPlanId && techPlans.some(plan => plan.id === savedPlanId)) {
            selectedGeneralPlanId = savedPlanId;
        } else {
            selectedGeneralPlanId = techPlans.some(plan => plan.id === selectedGeneralPlanId)
                ? selectedGeneralPlanId
                : (techPlans[0]?.id || '');
        }
        if (selectedGeneralPlanId) {
            sessionStorage.setItem('plan_selected_general_plan_id', selectedGeneralPlanId);
        }

        const savedDate = sessionStorage.getItem('plan_selected_calendar_date');
        if (savedDate && !selectedCalendarDate) {
            selectedCalendarDate = savedDate;
        }
        techSelect.innerHTML = assignedTechs.length
            ? assignedTechs.map(tech => `<option value="${escapeAttr(tech.id)}" ${tech.id === selectedTechId ? 'selected' : ''}>${escapeHtml(tech.nombre)}</option>`).join('')
            : '<option value="">Sin técnicos con plan asignado</option>';
        techSelect.value = selectedTechId;
        techSelect.disabled = true;
        document.getElementById('plan-day').value = 'general';
        generalPlanSelect.innerHTML = techPlans.length
            ? techPlans.map(plan => `<option value="${plan.id}" ${plan.id === selectedGeneralPlanId ? 'selected' : ''}>${escapeHtml(plan.name)}</option>`).join('')
            : '<option value="">Sin planes asignados</option>';
        generalPlanSelect.value = selectedGeneralPlanId;
        renderGeneralPlanAssigneeSelect();
        generalTools.style.display = 'none';
        return;
    }

    techSelect.disabled = false;

    const techLabel = document.getElementById('plan-tech-label');
    const techField = document.getElementById('plan-tech-field');
    if (techLabel) techLabel.style.display = 'none';
    if (techField) techField.style.display = 'none';

    if (!selectedTechId) {
        selectedTechId = SHARED_PLAN_ID;
        selectedDay = 'general';
    }

    const options = [`<option value="${SHARED_PLAN_ID}" ${selectedTechId === SHARED_PLAN_ID ? 'selected' : ''}>Plan general compartido</option>`];
    options.push(...activeTechs.map(t => `<option value="${t.id}" ${t.id === selectedTechId ? 'selected' : ''}>${escapeHtml(t.nombre)}</option>`));
    techSelect.innerHTML = options.join('');
    document.getElementById('plan-day').value = selectedDay;
    ensureTechPlan(selectedTechId);
    ensureGeneralPlanSystem();
    const selectedGeneralPlan = getSelectedGeneralPlan();
    const selectablePlans = getGeneralPlans().filter(plan => !plan.deletedAt);
    generalPlanSelect.innerHTML = selectablePlans.length
        ? selectablePlans.map(plan => `<option value="${plan.id}" ${plan.id === selectedGeneralPlanId ? 'selected' : ''}>${escapeHtml(plan.name)} · ${formatShortDate(plan.createdAt)}</option>`).join('')
        : '<option value="">Sin plan asignado</option>';
    generalPlanSelect.value = selectedGeneralPlan?.id || '';
    renderGeneralPlanAssigneeSelect();
    if (generalTools) generalTools.style.display = 'block';
}

function selectPlanTech(id) {
    selectedTechId = id;
    selectedCalendarDate = '';
    const calBox = document.getElementById('plan-calendar');
    if (calBox) calBox.dataset.unscheduledFilter = '0';
    activePlanCardIndex = 0;
    ensureTechPlan(id);
    selectedDay = id === SHARED_PLAN_ID ? 'general' : getInitialDayForTech(id);
    document.getElementById('plan-day').value = selectedDay;
    renderPlan();
}

function selectGeneralPlan(id) {
    if (isPlanReadOnly() && !getVisibleGeneralPlansForRole().some(plan => plan.id === id)) return;
    selectedGeneralPlanId = id;
    if (id) {
        sessionStorage.setItem('plan_selected_general_plan_id', id);
    }
    selectedCalendarDate = '';
    const calBox = document.getElementById('plan-calendar');
    if (calBox) calBox.dataset.unscheduledFilter = '0';
    activePlanCardIndex = 0;
    selectedDay = 'general';
    if (!isTechnicianPlanView()) {
        selectedTechId = SHARED_PLAN_ID;
        const techInput = document.getElementById('plan-tech');
        if (techInput) techInput.value = SHARED_PLAN_ID;
    }
    const dayInput = document.getElementById('plan-day');
    if (dayInput) dayInput.value = 'general';
    const genSelect = document.getElementById('general-plan-select');
    if (genSelect) genSelect.value = id;
    renderPlan();
}

function createGeneralPlan() {
    if (isPlanReadOnly()) return;
    const input = document.getElementById('plan-create-name');
    const date = document.getElementById('plan-create-date');
    if (input) input.value = '';
    if (date) date.textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (typeof renderCreatePlanQuickChips === 'function') {
        renderCreatePlanQuickChips();
    }
    OM('plan-create-mo');
    setTimeout(() => input?.focus(), 80);
}

function closeCreateGeneralPlanModal() {
    CM('plan-create-mo');
}

async function saveNewGeneralPlan() {
    if (isPlanReadOnly()) return;
    const input = document.getElementById('plan-create-name');
    const planName = String(input?.value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!planName) {
        notify('Debes escribir un nombre para crear el plan', 'err');
        input?.focus();
        return;
    }
    const plan = {
        id: gid('gp'),
        name: planName,
        createdAt: new Date().toISOString(),
        assignedTechId: '',
        assignedTechIds: [],
        materialSummary: '',
        stops: [buildWiFiMexOriginStop()]
    };
    state.weekPlan[SHARED_PLAN_ID]._generalPlans.push(plan);
    selectedGeneralPlanId = plan.id;
    selectedTechId = SHARED_PLAN_ID;
    selectedDay = 'general';
    const techSelect = document.getElementById('plan-tech');
    const daySelect = document.getElementById('plan-day');
    const generalSelect = document.getElementById('general-plan-select');
    if (techSelect) techSelect.value = SHARED_PLAN_ID;
    if (daySelect) daySelect.value = 'general';
    if (generalSelect) generalSelect.value = plan.id;
    closeCreateGeneralPlanModal();
    savePlanificarOfflineSnapshot();
    await saveDB();
    savePlanificarOfflineSnapshot();
    selectedGeneralPlanId = plan.id;
    renderPlan();
    const refreshedSelect = document.getElementById('general-plan-select');
    if (refreshedSelect) refreshedSelect.value = plan.id;
    notify(`Plan “${planName}” creado`);
}

async function deleteGeneralPlan() {
    if (!canManagePlanStops()) return notify('Solo un administrador puede eliminar planes', 'err');
    const plans = getGeneralPlans();
    if (plans.length <= 1) {
        notify('Debes conservar al menos un plan general', 'err');
        return;
    }
    const current = getSelectedGeneralPlan();
    if (!current) return;
    const ok = await askConfirmation({ title: 'Eliminar plan', message: `Se quitará “${current.name}” y sus paradas de la planificación. Las órdenes no se borrarán.`, confirmText: 'Eliminar plan', cancelText: 'Conservar', tone: 'danger' });
    if (!ok) return;
    try {
        await deletePlansFromCloud([current.id]);
        const sharedPlans = state.weekPlan[SHARED_PLAN_ID]._generalPlans;
        state.weekPlan[SHARED_PLAN_ID]._generalPlans = sharedPlans.filter(plan => plan.id !== current.id);
        selectedGeneralPlanId = getGeneralPlans()[0]?.id || '';
        renderPlan();
        notify('Plan general eliminado definitivamente');
    } catch (error) {
        console.error('No se pudo eliminar el plan', error);
        notify(`No se eliminó el plan: ${error?.message || 'error de conexión'}`, 'err');
    }
}

async function deletePastGeneralPlans() {
    if (!canManagePlanStops()) return notify('Solo un administrador puede eliminar planes', 'err');
    const plans = getGeneralPlans();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pastPlans = plans.filter(plan => {
        if (plan.id === selectedGeneralPlanId) return false;
        const created = new Date(plan.createdAt || 0);
        if (Number.isNaN(created.getTime())) return false;
        created.setHours(0, 0, 0, 0);
        return created < today;
    });

    if (!pastPlans.length) {
        notify('No hay planes generales pasados para eliminar');
        return;
    }
    const ok = await askConfirmation({ title: 'Eliminar planes anteriores', message: `Se quitarán ${pastPlans.length} plan(es) anteriores. El plan actual se conserva y las órdenes no se borran.`, confirmText: 'Eliminar anteriores', cancelText: 'Cancelar', tone: 'danger' });
    if (!ok) return;

    try {
        await deletePlansFromCloud(pastPlans.map(plan => plan.id));
        const removedIds = new Set(pastPlans.map(plan => plan.id));
        const sharedPlans = state.weekPlan[SHARED_PLAN_ID]._generalPlans;
        state.weekPlan[SHARED_PLAN_ID]._generalPlans = sharedPlans.filter(plan => !removedIds.has(plan.id));
        selectedGeneralPlanId = getGeneralPlans().some(plan => plan.id === selectedGeneralPlanId)
            ? selectedGeneralPlanId
            : (getGeneralPlans()[0]?.id || '');
        renderPlan();
        notify(`${pastPlans.length} plan(es) eliminado(s) definitivamente`);
    } catch (error) {
        console.error('No se pudieron eliminar los planes', error);
        notify(`No se eliminaron los planes: ${error?.message || 'error de conexión'}`, 'err');
    }
}

function selectPlanDay(day) {
    selectedDay = 'general';
    renderPlan();
    renderPlanMap();
}

function getSelectedTech() {
    if (selectedTechId === SHARED_PLAN_ID) {
        return { id: SHARED_PLAN_ID, nombre: 'Plan general compartido', telefono: '', regiones: [] };
    }
    return (state.technicians || []).find(t => t.id === selectedTechId && !t.deletedAt);
}

function getPlanStops(day = selectedDay) {
    return selectedTechId ? visibleStops(getPlanStopsRef(selectedTechId, day)) : [];
}

function getPlanStopsForView(day = 'general') {
    return getPlanStops(day).slice().sort((a, b) => {
        if (!!a.startedAt !== !!b.startedAt) return a.startedAt ? -1 : 1;
        if (a.startedAt && b.startedAt) return new Date(b.startedAt) - new Date(a.startedAt);
        return 0;
    });
}

function renderPlan() {
    initPlanSelectors();
    renderEquipmentDatalist();
    renderMaterialDatalist();
    renderPlanMaterialSummary();
    renderPlanSummary();
    renderGeneralPlanAssigneeSelect();
    renderPlanKpis();
    renderPlanCalendar();
    renderPlanDays();
    renderPlanMap();
    applyPlanReadOnlyMode();
    configureTechnicianDashboard();
    renderTechnicianPlanBanner();
    if (isTechnicianPlanView()) {
        setTimeout(renderTechnicianDayMap, 60);
    }
    if (typeof checkPlanContinuityRecommendations === 'function') {
        const canSeeContinuity = !isTechnicianPlanView() && canManagePlanStops();
        if (canSeeContinuity) {
            checkPlanContinuityRecommendations();
        } else {
            const banner = document.getElementById('plan-continuity-recommendations-banner');
            if (banner) {
                banner.style.display = 'none';
                banner.innerHTML = '';
            }
        }
    }
}

function ensurePlanReadyAfterSync() {
    _planInitialCloudLoading = false;
    _planCloudSyncing = false;
    if (isTechnicianPlanView()) {
        ensureLoggedTechnicianRecord();
        if (!selectedTechId) selectedTechId = getLoggedTechnicianId();
    }
    normalizeWeekPlan();
    if (!getSelectedGeneralPlan() || (isTechnicianPlanView() && !isPlanAssignedToTech(getSelectedGeneralPlan(), getLoggedTechnicianId()))) {
        initPlanSelectors();
    }
    savePlanificarOfflineSnapshot();
    updatePlanOfflineIndicator(typeof window !== 'undefined' && window.netopsCloudLoadOk === false);
}

function refreshPlanAfterSync() {
    const scrollY = window.scrollY;
    ensurePlanReadyAfterSync();
    renderPlanMaterialSummary();
    renderPlanSummary();
    renderPlanKpis();
    renderPlanCalendar();
    renderPlanDays();
    applyPlanReadOnlyMode();
    configureTechnicianDashboard();
    renderTechnicianPlanBanner();
    updateTechnicianProgressCard();
    if (isTechnicianPlanView()) {
        setTimeout(renderTechnicianDayMap, 60);
        notifyNewTechnicianDetailsIfAny();
    }
    requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'auto' }));
}

function getTechnicianAssignedDetailsCount() {
    if (!isTechnicianPlanView()) return 0;
    const todayKey = selectedCalendarDate || localDateKey();
    const allStops = getPlanStopsForView('general');
    let targetStops = allStops.filter(s => (s.scheduledDate || '') === todayKey);
    if (!targetStops.length) {
        targetStops = allStops;
    }
    const detailsMap = new Map();
    targetStops.forEach(s => {
        getStopDetails(s).forEach(d => {
            if (d && d.id && !['completada', 'no_realizado'].includes(d.status || '')) {
                detailsMap.set(d.id, d);
            }
        });
    });
    const techId = getLoggedTechnicianId();
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    const username = normalizeName(user?.username || '');
    const userDisplayName = normalizeName(user?.name || '');
    (state.workOrders || []).forEach(w => {
        if (!w || w.deletedAt || ['completada', 'no_realizado'].includes(w.status || '')) return;
        const matchesTech = (techId && (w.technicianId === techId || w.assignedTechId === techId)) ||
            (username && (normalizeName(w.technician || '') === username || normalizeName(w.assignedTechName || '') === username)) ||
            (userDisplayName && (normalizeName(w.technician || '') === userDisplayName || normalizeName(w.assignedTechName || '') === userDisplayName));
        if (matchesTech) {
            detailsMap.set(w.id, w);
        }
    });
    return detailsMap.size;
}

function updateTechnicianMobileBellBadge() {
    const bell = document.querySelector('.tech-header-bell');
    if (bell) bell.remove();
    const badge = document.getElementById('tech-mobile-bell-count');
    if (badge) badge.remove();
}

function getTechnicianDayProgressStats(dateKey = '') {
    const targetDate = dateKey || selectedCalendarDate || localDateKey();
    const todayKey = localDateKey();
    const allStops = getPlanStopsForView('general');
    let dayStops = allStops.filter(s => (s.scheduledDate || '') === targetDate);
    if (!dayStops.length && (!selectedCalendarDate || targetDate === todayKey)) {
        const unscheduled = allStops.filter(s => !s.scheduledDate);
        if (unscheduled.length) dayStops = unscheduled;
        else if (allStops.length) dayStops = allStops;
    }
    const uniqueDetailsMap = new Map();
    dayStops.forEach(s => {
        getStopDetails(s).forEach(d => { if (d?.id) uniqueDetailsMap.set(d.id, { detail: d, stop: s }); });
        getStopResolvedHistory(s).forEach(d => { if (d?.id && !uniqueDetailsMap.has(d.id)) uniqueDetailsMap.set(d.id, { detail: d, stop: s }); });
    });
    const entries = Array.from(uniqueDetailsMap.values());

    let completed = 0;
    let noRealizadoToday = 0;
    let pending = 0;

    entries.forEach(({ detail, stop }) => {
        if (detail.status === 'completada') {
            completed++;
        } else if (detail.status === 'no_realizado' && (wasNoRealizadoInCurrentStop(detail, stop) || wasDetailNoRealizadoOnDate(detail, targetDate))) {
            noRealizadoToday++;
        } else {
            pending++;
        }
    });

    const totalDetails = entries.length;
    const completedStops = dayStops.filter(s => {
        const prog = getStopProgress(s);
        return prog.complete || s.adminReleasedAt;
    }).length;
    const totalStops = dayStops.length;

    let pct = 0;
    if (totalDetails > 0) {
        pct = Math.round((completed / totalDetails) * 100);
    } else if (totalStops > 0) {
        pct = completedStops === totalStops ? 100 : Math.round((completedStops / totalStops) * 100);
    }

    return {
        date: targetDate,
        totalDetails,
        completed,
        pending,
        noRealizadoToday,
        totalStops,
        completedStops,
        pct
    };
}

function updateTechnicianProgressCard() {
    if (!isTechnicianPlanView()) return;
    const stats = getTechnicianDayProgressStats();
    const card = document.getElementById('tech-progress-card');
    const pctBadge = document.getElementById('tech-progress-percent-badge');
    const barFill = document.getElementById('tech-progress-bar-fill');
    const pueblosEl = document.getElementById('tech-stat-pueblos');
    const detallesEl = document.getElementById('tech-stat-detalles');

    const isLoadingEmpty = _planInitialCloudLoading && stats.totalStops === 0 && stats.totalDetails === 0;
    if (card) {
        card.classList.toggle('is-loading', isLoadingEmpty);
        card.classList.toggle('is-loading-hidden', isLoadingEmpty);
        card.style.display = isLoadingEmpty ? 'none' : '';
    }
    if (barFill) barFill.classList.toggle('is-loading', isLoadingEmpty);

    if (isLoadingEmpty) {
        return;
    }

    if (pctBadge) {
        pctBadge.textContent = `${stats.pct}%`;
        pctBadge.classList.toggle('complete', stats.pct === 100 && (stats.totalDetails > 0 || stats.totalStops > 0));
    }

    if (barFill) {
        barFill.style.width = `${stats.pct}%`;
        barFill.classList.toggle('complete', stats.pct === 100 && (stats.totalDetails > 0 || stats.totalStops > 0));
    }

    if (pueblosEl) pueblosEl.textContent = `${stats.completedStops}/${stats.totalStops}`;

    if (detallesEl) detallesEl.textContent = `${stats.completed} de ${stats.totalDetails}`;

    const doneEl = document.getElementById('tech-stat-done-count');
    if (doneEl) doneEl.textContent = String(stats.completed);

    const pendEl = document.getElementById('tech-stat-pending-count');
    if (pendEl) pendEl.textContent = String(stats.pending);

    const noDoneEl = document.getElementById('tech-stat-nodone-count');
    if (noDoneEl) noDoneEl.textContent = String(stats.noRealizadoToday);

    const noDonePill = document.getElementById('tech-stat-nodone-pill');
    if (noDonePill) noDonePill.classList.toggle('has-items', stats.noRealizadoToday > 0);
}

function openTechnicianProductivitySummary() {
    if (!isTechnicianPlanView()) return;
    const date = selectedCalendarDate || localDateKey();
    const stats = getTechnicianDayProgressStats(date);
    const user = getCurrentUser();
    const techName = user?.name || user?.username || 'Técnico';
    const dateFormatted = typeof formatCalendarDate === 'function' ? formatCalendarDate(date) : date;

    let modal = document.getElementById('tech-productivity-summary-mo');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="mo" id="tech-productivity-summary-mo">
                <div class="md tech-productivity-modal" role="dialog" aria-modal="true" style="max-width:460px;">
                    <div id="tech-productivity-modal-body"></div>
                </div>
            </div>
        `);
        modal = document.getElementById('tech-productivity-summary-mo');
        modal.addEventListener('click', e => { if (e.target === modal) CM('tech-productivity-summary-mo'); });
    }

    const body = document.getElementById('tech-productivity-modal-body');
    body.innerHTML = `
        <div class="modal-head" style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;border-bottom:1px solid #e2e8f0;padding-bottom:10px;">
            <div>
                <span style="font-size:11px;font-weight:800;color:#0284c7;text-transform:uppercase;letter-spacing:0.04em;">Mi avance</span>
                <h2 style="margin:2px 0 0;font-size:19px;color:#0f172a;">Resumen del día</h2>
                <small style="color:#64748b;">${escapeHtml(techName)} · ${escapeHtml(dateFormatted)}</small>
            </div>
            <button class="btn bgh" type="button" onclick="CM('tech-productivity-summary-mo')" style="padding:6px 12px;font-size:12px;font-weight:700;">Cerrar</button>
        </div>

        <div style="background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%);color:#fff;border-radius:16px;padding:18px 20px;text-align:center;margin-bottom:14px;box-shadow:0 8px 20px rgba(2,132,199,0.16);">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;opacity:0.9;">Avance completado</div>
            <div style="font-size:42px;font-weight:900;line-height:1.1;margin:4px 0;">${stats.pct}%</div>
            <div style="font-size:13px;opacity:0.95;">${stats.completed} de ${stats.totalDetails} trabajos completados</div>
            <div style="margin-top:12px;background:rgba(255,255,255,0.22);height:9px;border-radius:999px;overflow:hidden;">
                <div style="width:${stats.pct}%;background:#22c55e;height:100%;border-radius:999px;transition:width 0.35s ease;"></div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;margin-bottom:16px;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 10px;text-align:center;">
                <div style="font-size:10px;font-weight:800;color:#15803d;text-transform:uppercase;">Completados</div>
                <div style="font-size:24px;font-weight:900;color:#16a34a;margin-top:4px;">${stats.completed}</div>
            </div>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:12px 10px;text-align:center;">
                <div style="font-size:10px;font-weight:800;color:#1d4ed8;text-transform:uppercase;">Pendientes</div>
                <div style="font-size:24px;font-weight:900;color:#2563eb;margin-top:4px;">${stats.pending}</div>
            </div>
            <div style="background:${stats.noRealizadoToday > 0 ? '#fef2f2' : '#f8fafc'};border:1px solid ${stats.noRealizadoToday > 0 ? '#fecaca' : '#e2e8f0'};border-radius:12px;padding:12px 10px;text-align:center;">
                <div style="font-size:10px;font-weight:800;color:${stats.noRealizadoToday > 0 ? '#b91c1c' : '#64748b'};text-transform:uppercase;">No realizados</div>
                <div style="font-size:24px;font-weight:900;color:${stats.noRealizadoToday > 0 ? '#dc2626' : '#475569'};margin-top:4px;">${stats.noRealizadoToday}</div>
            </div>
        </div>

        <div style="display:flex;justify-content:flex-end;">
            <button type="button" class="btn bgh" onclick="CM('tech-productivity-summary-mo')">Cerrar</button>
        </div>
    `;
    OM('tech-productivity-summary-mo');
}

function checkAndTriggerTechnicianProductivityBriefings() {
    return;
}

function renderPlanKpis() {
    const today = typeof localDateKey === 'function' ? localDateKey() : new Date().toISOString().slice(0, 10);
    const allStops = getPlanStops('general');
    const stops = isTechnicianPlanView()
        ? allStops.filter(stop => stop.scheduledDate === (selectedCalendarDate || today))
        : allStops;
    const collectDetails = sourceStops => {
        const detailsById = new Map();
        sourceStops.forEach(stop => {
            getStopDetails(stop).forEach(detail => detailsById.set(detail.id, detail));
            getStopResolvedHistory(stop).forEach(detail => detailsById.set(detail.id, detail));
        });
        return Array.from(detailsById.values());
    };
    const setTechKpi = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };

    if (isTechnicianPlanView()) {
        updateTechnicianProgressCard();
        renderTechnicianRouteOverview();
        checkAndTriggerTechnicianProductivityBriefings();
        updateTechnicianMobileBellBadge();
        return;
    }
    const uniqueById = new Map();

    stops.forEach(stop => {
        // El resumen pertenece al plan seleccionado. Los resueltos anteriores
        // a la fecha en que se agregó la parada no forman parte de este plan.
        getStopDetails(stop).forEach(detail => uniqueById.set(detail.id, detail));
        getStopResolvedHistory(stop).forEach(detail => uniqueById.set(detail.id, detail));
    });

    const unique = Array.from(uniqueById.values());
    const done = unique.filter(detail => ['completada', 'no_realizado'].includes(detail.status || '')).length;
    const pending = Math.max(0, unique.length - done);
    const percent = unique.length ? Math.round((done / unique.length) * 100) : 0;
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    set('plan-kpi-stops', stops.length);
    set('plan-kpi-total', unique.length);
    set('plan-kpi-done', done);
    set('plan-kpi-pending', pending);
    set('plan-kpi-percent', `${percent}%`);
    set('plan-kpi-ring', `${percent}%`);
    set('plan-kpi-progress-label', `${done} de ${unique.length} completados`);
    const ring = document.getElementById('plan-kpi-ring');
    if (ring) ring.style.setProperty('--plan-progress', `${percent * 3.6}deg`);
}

function applyPlanReadOnlyMode() {
    const readOnly = isPlanReadOnly();
    const canAssign = canAssignPlanTechnicians();
    document.body.classList.toggle('plan-readonly', readOnly);
    document.body.classList.toggle('plan-technician-view', isTechnicianPlanView());
    document.querySelectorAll('.btn-assign-techs').forEach(btn => {
        btn.style.display = canAssign ? '' : 'none';
    });
    const assignee = document.getElementById('general-plan-assignee');
    const assigneeBox = assignee?.closest('.fi');
    const assigneeLabel = assigneeBox?.previousElementSibling;
    if (assigneeBox) assigneeBox.style.display = readOnly ? 'none' : '';
    if (assigneeLabel?.classList?.contains('sbt')) assigneeLabel.style.display = readOnly ? 'none' : '';
}

function renderPlanSummaryLegacy() {
    const tech = getSelectedTech();
    const box = document.getElementById('plan-summary');
    if (!tech) {
        if (box) box.innerHTML = '<div class="plan-empty">No hay tecnicos registrados. Agrega uno en la ventana Tecnicos.</div>';
        document.getElementById('plan-title').textContent = 'Plan semanal';
        return;
    }

    const generalPlan = getSelectedGeneralPlan();
    document.getElementById('plan-title').textContent = selectedTechId === SHARED_PLAN_ID
        ? `Plan semanal de ${tech.nombre} · ${generalPlan.name}`
        : `Plan semanal de ${tech.nombre}`;

    const total = PLAN_DAYS.reduce((sum, d) => sum + getPlanStops(d.id).length, 0);
    const pending = PLAN_DAYS.reduce((sum, day) => sum + getPlanStops(day.id).reduce((acc, stop) => acc + getStopProgress(stop).pending, 0), 0);
    const generalCount = getPlanStops('general').length;

    if (box) box.innerHTML = `
        <div class="card" style="margin:0;cursor:default">
            <div class="ct2">${escapeHtml(tech.nombre)}</div>
            <div class="cs">${tech.id === SHARED_PLAN_ID ? 'Sin tecnico asignado' : (tech.telefono ? escapeHtml(tech.telefono) : 'Sin telefono')} · ${total} paradas semanales${selectedTechId === SHARED_PLAN_ID ? ` · creado ${formatShortDate(generalPlan.createdAt)}` : ''}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                <span class="badge" style="background:var(--cy);color:#fff">${getPlanStops().length} en ${dayLabel(selectedDay)}</span>
                <span class="badge" style="background:var(--am);color:#fff">${generalCount} en general</span>
                <span class="badge bty">${pending} detalles ligados</span>
            </div>
        </div>`;
}

function renderPlanSummary() {
    const tech = getSelectedTech();
    const box = document.getElementById('plan-summary');
    if (!tech) {
        if (box) box.innerHTML = '<div class="plan-empty">No hay tecnicos registrados. Agrega uno en la ventana Tecnicos.</div>';
        document.getElementById('plan-title').textContent = 'Plan general';
        return;
    }

    const generalPlan = getSelectedGeneralPlan();
    if (isPlanReadOnly() && !generalPlan) {
        if (box) box.innerHTML = '<div class="plan-empty">No hay planes asignados a tecnicos todavia.</div>';
        document.getElementById('plan-title').textContent = 'Planes asignados';
        return;
    }
    const assignedTech = generalPlan ? getGeneralPlanAssignedTech(generalPlan) : null;
    document.getElementById('plan-title').textContent = isTechnicianPlanView()
        ? 'Detalles del día'
        : (selectedTechId === SHARED_PLAN_ID
            ? `Plan asignado a ${assignedTech?.nombre || tech.nombre} - ${generalPlan?.name || 'Plan general'}`
            : `Plan general de ${tech.nombre}`);

    const stops = getPlanStops('general');
    const pending = stops.reduce((acc, stop) => acc + getStopProgress(stop).pending, 0);

    if (box) box.innerHTML = `
        <div class="card" style="margin:0;cursor:default">
            <div class="ct2">${escapeHtml(assignedTech?.nombre || tech.nombre)}</div>
            <div class="cs">${assignedTech?.telefono ? escapeHtml(assignedTech.telefono) : (tech.id === SHARED_PLAN_ID ? 'Tecnico asignado por administrador' : 'Sin telefono')} - ${stops.length} paradas en general${selectedTechId === SHARED_PLAN_ID ? ` - creado ${formatShortDate(generalPlan?.createdAt)}` : ''}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                <span class="badge" style="background:var(--cy);color:#fff">${stops.length} en General</span>
                <span class="badge bty">${pending} detalles ligados</span>
            </div>
        </div>`;

    if (typeof renderPlanBoardCrew === 'function') {
        renderPlanBoardCrew(generalPlan);
    }
}

function renderPlanBoardCrew(plan) {
    const crewContainer = document.getElementById('plan-board-crew-container');
    if (!crewContainer) return;

    if (isTechnicianPlanView()) {
        crewContainer.innerHTML = '';
        return;
    }

    const assignedTechs = plan ? getGeneralPlanAssignedTechs(plan) : [];
    if (assignedTechs.length > 0) {
        crewContainer.innerHTML = `
            <div class="plan-header-crew-box">
                <div class="plan-header-crew-meta">
                    <span class="crew-card-label">Técnico(s) asignado(s) (${assignedTechs.length})</span>
                </div>
                <div class="plan-header-chips-row">
                    ${assignedTechs.map(t => {
                        const name = (t.nombre || t.usuario || 'Técnico').trim();
                        const initials = name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'T';
                        return `
                            <div class="plan-header-tech-chip" title="Asignado: ${escapeAttr(name)}">
                                <span class="header-chip-avatar">${escapeHtml(initials)}</span>
                                <span class="header-chip-name">${escapeHtml(name)}</span>
                                ${(typeof isPlanReadOnly === 'function' && isPlanReadOnly()) ? '' : `<button type="button" class="header-chip-remove" onclick="unassignTechFromHeader('${escapeAttr(t.id)}', event)" title="Desasignar a ${escapeAttr(name)} de este plan" aria-label="Desasignar de este plan">✕</button>`}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } else {
        crewContainer.innerHTML = `
            <div class="plan-header-crew-card unassigned" title="Este plan no tiene técnicos asignados">
                <span class="crew-card-icon">⚠️</span>
                <div class="crew-card-info">
                    <span class="crew-card-label">Estado de asignación</span>
                    <strong class="crew-card-names">Sin técnico asignado a esta ruta</strong>
                </div>
            </div>
        `;
    }
}
window.renderPlanBoardCrew = renderPlanBoardCrew;

async function unassignTechFromHeader(techId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    return unassignTechFromCurrentPlan(techId);
}
window.unassignTechFromHeader = unassignTechFromHeader;

let _planTechAssignBusy = false;

async function toggleTechInCurrentPlan(techId) {
    if (!canAssignPlanTechnicians() || _planTechAssignBusy) return;
    const plan = getSelectedGeneralPlan();
    if (!plan || !techId) return;
    _planTechAssignBusy = true;
    try {
        const targetTechId = String(techId);
        const targetTech = (state.technicians || []).find(t => !t.deletedAt && (String(t.id) === targetTechId || (t.userId && String(t.userId) === targetTechId)));
        const canonicalId = targetTech?.id ? String(targetTech.id) : targetTechId;
        const targetAliasSet = new Set([targetTechId, canonicalId, targetTech?.userId ? String(targetTech.userId) : ''].filter(Boolean));
        const currentIds = getPlanRawAssignedTechIds(plan);
        const alreadyIn = currentIds.some(id => targetAliasSet.has(id));
        let nextIds;
        if (alreadyIn) {
            nextIds = currentIds.filter(id => !targetAliasSet.has(id));
        } else {
            unassignTechFromOtherPlans(canonicalId, plan.id);
            nextIds = [...currentIds, canonicalId];
        }
        syncPlanAssignedMetadata(plan, nextIds);
        savePlanificarOfflineSnapshot();
        renderPlan();
        const saved = await saveDB();
        if (!saved) {
            notify('Guardado localmente. Se sincronizará al conectar.', 'warn');
            return;
        }
        savePlanificarOfflineSnapshot();
        const assigned = getGeneralPlanAssignedTechs(plan);
        notify(assigned.length ? `Plan asignado a: ${assigned.map(t => t.nombre || t.usuario).join(', ')}` : 'Plan sin técnico asignado');
    } finally {
        _planTechAssignBusy = false;
    }
}
window.toggleTechInCurrentPlan = toggleTechInCurrentPlan;

async function assignTechToCurrentPlan(techId) {
    if (!canAssignPlanTechnicians()) {
        notify('Solo administrador o soporte puede asignar técnicos.', 'err');
        return;
    }
    if (_planTechAssignBusy) return;
    const plan = getSelectedGeneralPlan();
    if (!plan || !techId) return;
    const targetTechId = String(techId);
    const targetTech = (state.technicians || []).find(t => !t.deletedAt && (String(t.id) === targetTechId || (t.userId && String(t.userId) === targetTechId)));
    if (!targetTech) return;
    const canonicalTechId = String(targetTech.id);

    const existingIdsBefore = getPlanRawAssignedTechIds(plan);
    if (existingIdsBefore.includes(canonicalTechId)) {
        notify(`${targetTech.nombre || targetTech.usuario} ya está asignado a este plan.`);
        return;
    }

    const occupiedPlan = getGeneralPlanAssignedToTech(canonicalTechId, plan.id);
    const confirmed = await requestPlanAssignmentConfirmation({
        plan,
        tech: targetTech,
        occupiedPlan,
        unassign: false
    });

    if (!confirmed) return;

    _planTechAssignBusy = true;
    try {
        // Re-leer el plan y su lista ACTUAL de técnicos después del diálogo para jamás perder
        // otros técnicos que ya estén asignados al mismo plan.
        const freshPlan = getGeneralPlans().find(p => String(p.id) === String(plan.id)) || plan;
        const freshIds = getPlanRawAssignedTechIds(freshPlan);
        if (freshIds.includes(canonicalTechId)) {
            notify(`${targetTech.nombre || targetTech.usuario} ya está asignado a este plan.`);
            return;
        }

        unassignTechFromOtherPlans(canonicalTechId, freshPlan.id);

        const newIds = [...freshIds, canonicalTechId];
        syncPlanAssignedMetadata(freshPlan, newIds);
        savePlanificarOfflineSnapshot();
        renderPlan();

        const saved = await saveDB();
        if (!saved) {
            notify('Guardado localmente. Se sincronizará al conectar.', 'warn');
            return;
        }
        savePlanificarOfflineSnapshot();
        renderPlan();
        notify(`Técnico ${targetTech.nombre || targetTech.usuario} asignado a ${freshPlan.name}`);
    } finally {
        _planTechAssignBusy = false;
    }
}
window.assignTechToCurrentPlan = assignTechToCurrentPlan;

async function unassignTechFromCurrentPlan(techId) {
    if (!canAssignPlanTechnicians()) {
        notify('Solo administrador o soporte puede desasignar técnicos.', 'err');
        return;
    }
    if (_planTechAssignBusy) return;
    const plan = getSelectedGeneralPlan();
    if (!plan || !techId) return;
    const targetTechId = String(techId);
    const targetTech = (state.technicians || []).find(t => String(t.id) === targetTechId || (t.userId && String(t.userId) === targetTechId));

    const confirmed = await requestPlanAssignmentConfirmation({
        plan,
        tech: targetTech,
        unassign: true
    });

    if (!confirmed) return;

    _planTechAssignBusy = true;
    try {
        // Re-leer el equipo actual tras confirmar y quitar ÚNICAMENTE al técnico elegido,
        // preservando intactos a los demás técnicos asignados a este plan.
        const freshPlan = getGeneralPlans().find(p => String(p.id) === String(plan.id)) || plan;
        const targetAliasSet = new Set([
            targetTechId,
            targetTech?.id ? String(targetTech.id) : '',
            targetTech?.userId ? String(targetTech.userId) : ''
        ].filter(Boolean));
        const newIds = getPlanRawAssignedTechIds(freshPlan).filter(id => !targetAliasSet.has(id));
        syncPlanAssignedMetadata(freshPlan, newIds);
        savePlanificarOfflineSnapshot();
        renderPlan();

        const saved = await saveDB();
        if (!saved) {
            notify('Guardado localmente. Se sincronizará al conectar.', 'warn');
            return;
        }
        savePlanificarOfflineSnapshot();
        renderPlan();
        const techName = targetTech ? (targetTech.nombre || targetTech.usuario) : 'Técnico';
        notify(`Técnico ${techName} desasignado de ${freshPlan.name}`);
    } finally {
        _planTechAssignBusy = false;
    }
}
window.unassignTechFromCurrentPlan = unassignTechFromCurrentPlan;

function switchPlanAssignTab(tabId) {
    const tabs = ['plans', 'team', 'search'];
    if (!tabs.includes(tabId)) tabId = 'plans';

    tabs.forEach(t => {
        const btn = document.getElementById(`plan-tab-btn-${t}`);
        const panel = document.getElementById(`plan-assign-tab-${t}`);
        if (btn) {
            btn.classList.toggle('is-active', t === tabId);
            btn.setAttribute('aria-selected', t === tabId ? 'true' : 'false');
        }
        if (panel) {
            panel.classList.toggle('is-active', t === tabId);
            panel.style.display = (t === tabId) ? 'block' : 'none';
        }
    });

    if (tabId === 'plans') {
        renderPlanCatalogManagementView();
    } else if (tabId === 'team') {
        renderPlanTeamManagementView();
    } else if (tabId === 'search') {
        renderTechPlanSearchList();
    }
}
window.switchPlanAssignTab = switchPlanAssignTab;

function renderPlanTeamManagementView() {
    const container = document.getElementById('plan-team-management-view');
    if (!container) return;

    const plan = getSelectedGeneralPlan();
    const allTechs = (state.technicians || []).filter(t => !t.deletedAt && t.estado !== 'inactivo');
    const badgeTeam = document.getElementById('plan-tab-badge-team');
    const badgeTotal = document.getElementById('plan-tab-badge-total');

    if (!plan) {
        container.innerHTML = '<div class="plan-team-empty-hint">Selecciona o crea un plan general arriba para gestionar su cuadrilla.</div>';
        if (badgeTeam) badgeTeam.textContent = '0';
        if (badgeTotal) badgeTotal.textContent = String(allTechs.length);
        return;
    }

    const assignedTechs = getGeneralPlanAssignedTechs(plan);
    const assignedIdsSet = new Set(assignedTechs.map(t => String(t.id)));
    if (badgeTeam) badgeTeam.textContent = String(assignedTechs.length);
    if (badgeTotal) badgeTotal.textContent = String(allTechs.length);

    const availableTechs = [];
    const otherPlanTechs = [];

    allTechs.forEach(t => {
        if (assignedIdsSet.has(String(t.id))) return;
        const occupied = getGeneralPlanAssignedToTech(t.id, plan.id);
        if (occupied) {
            otherPlanTechs.push({ tech: t, occupiedPlan: occupied });
        } else {
            availableTechs.push(t);
        }
    });

    let assignedHtml = '';
    if (assignedTechs.length === 0) {
        assignedHtml = `<div class="plan-team-empty-hint">Sin técnicos en este plan. Elige uno disponible abajo para agregarlo.</div>`;
    } else {
        assignedHtml = `
            <div class="plan-team-list">
                ${assignedTechs.map(t => {
                    const name = (t.nombre || t.usuario || 'Técnico').trim();
                    const role = (t.rol || t.telefono || 'Técnico de campo').trim();
                    const initials = name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'T';
                    return `
                        <div class="plan-team-card is-assigned">
                            <div class="plan-team-card-left">
                                <span class="plan-team-avatar">${escapeHtml(initials)}</span>
                                <div class="plan-team-info">
                                    <strong class="plan-team-name" title="${escapeAttr(name)}">${escapeHtml(name)}</strong>
                                    <small class="plan-team-sub">${escapeHtml(role)}</small>
                                </div>
                            </div>
                            <button type="button" class="btn-team-unassign" onclick="unassignTechFromCurrentPlan('${escapeAttr(t.id)}')" title="Quitar a ${escapeAttr(name)} de este plan">✕ Desasignar</button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    let availableHtml = '';
    if (availableTechs.length === 0 && otherPlanTechs.length === 0) {
        availableHtml = `<div class="plan-team-empty-hint">Todos los técnicos registrados están en este plan.</div>`;
    } else {
        let availList = '';
        if (availableTechs.length > 0) {
            availList += `
                <div class="plan-team-section-title">Disponibles (${availableTechs.length})</div>
                <div class="plan-team-list">
                    ${availableTechs.map(t => {
                        const name = (t.nombre || t.usuario || 'Técnico').trim();
                        const role = (t.rol || t.telefono || 'Técnico de campo').trim();
                        const initials = name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'T';
                        return `
                            <div class="plan-team-card is-available">
                                <div class="plan-team-card-left">
                                    <span class="plan-team-avatar">${escapeHtml(initials)}</span>
                                    <div class="plan-team-info">
                                        <strong class="plan-team-name" title="${escapeAttr(name)}">${escapeHtml(name)}</strong>
                                        <small class="plan-team-sub">${escapeHtml(role)}</small>
                                    </div>
                                </div>
                                <button type="button" class="btn-team-add" onclick="assignTechToCurrentPlan('${escapeAttr(t.id)}')" title="Asignar a ${escapeAttr(plan.name)}">+ Asignar</button>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        if (otherPlanTechs.length > 0) {
            availList += `
                <div class="plan-team-section-title" style="margin-top:10px;">En otro plan (${otherPlanTechs.length})</div>
                <div class="plan-team-list">
                    ${otherPlanTechs.map(({ tech: t, occupiedPlan }) => {
                        const name = (t.nombre || t.usuario || 'Técnico').trim();
                        const role = (t.rol || t.telefono || 'Técnico de campo').trim();
                        const initials = name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'T';
                        return `
                            <div class="plan-team-card is-other">
                                <div class="plan-team-card-left">
                                    <span class="plan-team-avatar" style="background:#fef3c7;color:#b45309;">${escapeHtml(initials)}</span>
                                    <div class="plan-team-info">
                                        <strong class="plan-team-name" title="${escapeAttr(name)}">${escapeHtml(name)}</strong>
                                        <small class="plan-team-sub" title="En “${escapeAttr(occupiedPlan.name)}”">En: “${escapeHtml(occupiedPlan.name)}”</small>
                                    </div>
                                </div>
                                <button type="button" class="btn-team-transfer" onclick="assignTechToCurrentPlan('${escapeAttr(t.id)}')" title="Mover desde “${escapeAttr(occupiedPlan.name)}” a este plan">Mover</button>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        availableHtml = availList;
    }

    container.innerHTML = `
        <div class="plan-team-view-header">
            <div class="plan-team-header-info">
                <span class="plan-team-subtitle">Equipo asignado al plan:</span>
                <strong class="plan-team-title">${escapeHtml(plan.name)}</strong>
            </div>
            <span class="plan-team-count-badge">${assignedTechs.length} técnico(s)</span>
        </div>
        <div class="plan-team-section-title">En este plan (${assignedTechs.length})</div>
        ${assignedHtml}
        ${availableHtml}
    `;
}
window.renderPlanTeamManagementView = renderPlanTeamManagementView;

function renderPlanCatalogManagementView() {
    const container = document.getElementById('plan-catalog-management-view');
    if (!container) return;

    const plans = getGeneralPlans().filter(p => !p.deletedAt);
    const currentPlan = getSelectedGeneralPlan();
    const badgePlans = document.getElementById('plan-tab-badge-plans');
    if (badgePlans) badgePlans.textContent = String(plans.length);

    if (!plans.length) {
        container.innerHTML = '<div class="plan-team-empty-hint">No hay planes registrados. Presiona "+ Nuevo" para crear uno.</div>';
        return;
    }

    container.innerHTML = `
        <div class="plan-catalog-list">
            ${plans.map(p => {
                const isCurrent = currentPlan && String(p.id) === String(currentPlan.id);
                const assigned = getGeneralPlanAssignedTechs(p);
                const stopCount = (p.stops || []).length;
                const crewNames = assigned.length ? assigned.map(t => t.nombre || t.usuario).join(', ') : 'Sin técnico';
                return `
                    <div class="plan-catalog-item ${isCurrent ? 'is-active' : ''}" onclick="selectGeneralPlan('${escapeAttr(p.id)}')" title="Abrir plan “${escapeAttr(p.name)}”">
                        <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">
                            <span style="font-size:14px;line-height:1;">🗺️</span>
                            <div style="display:flex;flex-direction:column;min-width:0;flex:1;">
                                <strong style="font-size:11px;color:${isCurrent ? '#1d4ed8' : '#0f172a'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.name)}</strong>
                                <small style="font-size:9px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${stopCount} parada(s) · ${escapeHtml(crewNames)}</small>
                            </div>
                        </div>
                        <span class="plan-catalog-badge ${isCurrent ? 'current' : ''}">${isCurrent ? 'Activo' : 'Abrir'}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}
window.renderPlanCatalogManagementView = renderPlanCatalogManagementView;

// --- Inteligencia de Ruta, Clima y Viabilidad para Vista de Escritorio ---

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function estimateRouteTravel(lat1, lon1, lat2, lon2) {
    const directKm = calculateHaversineKm(lat1, lon1, lat2, lon2);
    if (isNaN(directKm) || directKm <= 0.05) return { km: 0.1, minutes: 2, formatted: '~2 min (mismo poblado)' };
    const roadKm = Math.round(directKm * 1.32 * 10) / 10;
    const minutes = Math.max(3, Math.round((roadKm / 38) * 60) + 2);
    const timeFormatted = minutes >= 60
        ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? (minutes % 60) + 'm' : ''}`.trim()
        : `${minutes} min`;
    return {
        km: roadKm,
        minutes,
        formatted: `~${timeFormatted} (${roadKm} km)`
    };
}

function calculateDayRouteFeasibility(stops, activeIndex = 0) {
    const validStops = (stops || []).filter(s => !s.deletedAt);
    let totalKm = 0;
    let totalTravelMinutes = 0;
    const legs = [];

    for (let i = 0; i < validStops.length - 1; i++) {
        const s1 = validStops[i];
        const s2 = validStops[i + 1];
        const pos1 = getStopCurrentPosition(s1);
        const pos2 = getStopCurrentPosition(s2);
        if (!isNaN(pos1.lat) && !isNaN(pos1.lng) && !isNaN(pos2.lat) && !isNaN(pos2.lng)) {
            const leg = estimateRouteTravel(pos1.lat, pos1.lng, pos2.lat, pos2.lng);
            totalKm += leg.km;
            totalTravelMinutes += leg.minutes;
            legs.push({ from: s1, to: s2, ...leg });
        } else {
            legs.push({ from: s1, to: s2, km: 0, minutes: 0, formatted: 'Sin coordenadas' });
        }
    }

    const travelHours = Math.floor(totalTravelMinutes / 60);
    const travelRemMinutes = totalTravelMinutes % 60;
    const travelFormatted = travelHours > 0
        ? `${travelHours}h ${travelRemMinutes > 0 ? travelRemMinutes + 'm' : ''}`.trim()
        : `${totalTravelMinutes} min`;

    // Active leg metrics (site to site)
    const idx = Math.max(0, Math.min(validStops.length - 1, activeIndex));
    const currStop = validStops[idx] || null;
    let legNext = null;
    let legPrev = null;

    if (currStop && idx < validStops.length - 1) {
        const sNext = validStops[idx + 1];
        const p1 = getStopCurrentPosition(currStop);
        const p2 = getStopCurrentPosition(sNext);
        if (!isNaN(p1.lat) && !isNaN(p1.lng) && !isNaN(p2.lat) && !isNaN(p2.lng)) {
            legNext = { toName: sNext.name || 'Siguiente parada', ...estimateRouteTravel(p1.lat, p1.lng, p2.lat, p2.lng) };
        } else {
            legNext = { toName: sNext.name || 'Siguiente parada', km: 0, minutes: 0, formatted: 'Sin coordenadas' };
        }
    }

    if (currStop && idx > 0) {
        const sPrev = validStops[idx - 1];
        const p1 = getStopCurrentPosition(sPrev);
        const p2 = getStopCurrentPosition(currStop);
        if (!isNaN(p1.lat) && !isNaN(p1.lng) && !isNaN(p2.lat) && !isNaN(p2.lng)) {
            legPrev = { fromName: sPrev.name || 'Parada anterior', ...estimateRouteTravel(p1.lat, p1.lng, p2.lat, p2.lng) };
        } else {
            legPrev = { fromName: sPrev.name || 'Parada anterior', km: 0, minutes: 0, formatted: 'Sin coordenadas' };
        }
    }

    let status = 'optima';
    let statusLabel = validStops.length > 0 ? `Sitio ${idx + 1} de ${validStops.length}` : 'Sin paradas';
    let statusDesc = legNext ? `Hacia ${legNext.toName} (~${legNext.minutes} min)` : (validStops.length > 0 ? 'Último sitio del plan' : 'No hay paradas');
    let statusClass = 'bgn';

    // Keep backwards compatibility for serviceMinutes, workdayFormatted if any other code references them
    const serviceMinutes = validStops.length * 45;
    const totalWorkdayMinutes = totalTravelMinutes + serviceMinutes;
    const workdayHours = Math.floor(totalWorkdayMinutes / 60);
    const workdayRemMinutes = totalWorkdayMinutes % 60;
    const workdayFormatted = workdayHours > 0 ? `${workdayHours}h ${workdayRemMinutes > 0 ? workdayRemMinutes + 'm' : ''}`.trim() : `${workdayRemMinutes}m`;

    return {
        stopsCount: validStops.length,
        activeIndex: idx,
        activeStop: currStop,
        totalKm: Math.round(totalKm * 10) / 10,
        totalTravelMinutes,
        travelFormatted,
        serviceMinutes,
        totalWorkdayMinutes,
        workdayFormatted,
        status,
        statusLabel,
        statusDesc,
        statusClass,
        legs,
        legNext,
        legPrev
    };
}

let lastWeatherFetchCoords = null;

function getWmoWeatherInfo(code) {
    if (code === 0) return { label: 'Soleado / Despejado', icon: '', condition: 'good' };
    if (code === 1 || code === 2) return { label: 'Mayormente despejado', icon: '', condition: 'good' };
    if (code === 3) return { label: 'Nublado', icon: '', condition: 'fair' };
    if (code === 45 || code === 48) return { label: 'Niebla / Neblina', icon: '', condition: 'caution' };
    if (code >= 51 && code <= 55) return { label: 'Llovizna ligera', icon: '', condition: 'caution' };
    if (code >= 61 && code <= 65) return { label: 'Lluvia constante', icon: '', condition: 'warning' };
    if (code >= 80 && code <= 82) return { label: 'Chubascos', icon: '', condition: 'warning' };
    if (code >= 95) return { label: 'Tormenta eléctrica', icon: '', condition: 'alert' };
    return { label: 'Tiempo templado', icon: '', condition: 'good' };
}

let lastWeatherWidgetData = null;
const weatherMemoryCache = new Map();

async function fetchTownWeather(lat, lng, townName) {
    const latNum = safeFloat(lat);
    const lngNum = safeFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) {
        renderWeatherFallback(townName);
        return;
    }

    const coordKey = `${latNum.toFixed(2)}_${lngNum.toFixed(2)}`;
    const cacheKey = `wm_wx_${coordKey}`;
    if (weatherMemoryCache.has(coordKey)) {
        const memoryData = weatherMemoryCache.get(coordKey);
        lastWeatherWidgetData = memoryData;
        renderWeatherWidget(memoryData, townName);
        return memoryData;
    }
    try {
        const cachedStr = sessionStorage.getItem(cacheKey);
        if (cachedStr) {
            const cached = JSON.parse(cachedStr);
            if (Date.now() - cached.timestamp < 3600000) {
                weatherMemoryCache.set(coordKey, cached.data);
                lastWeatherWidgetData = cached.data;
                renderWeatherWidget(cached.data, townName);
                return cached.data;
            }
        }
    } catch (e) { }

    lastWeatherFetchCoords = coordKey;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latNum.toFixed(4)}&longitude=${lngNum.toFixed(4)}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=precipitation_probability_max,temperature_2m_max,temperature_2m_min&timezone=auto`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Weather fetch failed');
        const data = await res.json();

        const temp = Math.round(data.current?.temperature_2m ?? 24);
        const code = data.current?.weather_code ?? 1;
        const wind = Math.round(data.current?.wind_speed_10m ?? 8);
        const rainProb = data.daily?.precipitation_probability_max?.[0] ?? Math.round(data.current?.precipitation ? 60 : 10);
        const weatherInfo = getWmoWeatherInfo(code);

        const weatherObj = {
            temp,
            wind,
            rainProb,
            icon: weatherInfo.icon,
            label: weatherInfo.label,
            condition: weatherInfo.condition
        };

        try {
            weatherMemoryCache.set(coordKey, weatherObj);
            sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: weatherObj }));
        } catch (e) { }

        lastWeatherWidgetData = weatherObj;
        renderWeatherWidget(weatherObj, townName);
        return weatherObj;
    } catch (err) {
        renderWeatherFallback(townName);
    }
}


function updateStopsWeatherBadges(stops) {
    if (!stops || !stops.length) return;
    stops.forEach(stop => {
        const p = getStopCurrentPosition(stop);
        if (isNaN(p.lat) || isNaN(p.lng)) return;
        const els = [
            document.getElementById(`tech-stop-weather-${stop.id}`),
            document.getElementById(`tech-overview-weather-${stop.id}`)
        ].filter(Boolean);
        if (!els.length) return;
        const coordKey = `${safeFloat(p.lat).toFixed(2)}_${safeFloat(p.lng).toFixed(2)}`;
        if (weatherMemoryCache.has(coordKey)) {
            const w = weatherMemoryCache.get(coordKey);
            const label = w.temp !== undefined ? `${w.temp}°C ${w.label || ''}` : (w.label || '');
            els.forEach(el => {
                el.textContent = label;
                el.style.display = 'inline-flex';
            });
            return;
        }
        fetchTownWeather(p.lat, p.lng, stop.name).then(w => {
            if (w) {
                const label = w.temp !== undefined ? `${w.temp}°C ${w.label || ''}` : (w.label || '');
                els.forEach(el => {
                    el.textContent = label;
                    el.style.display = 'inline-flex';
                });
            }
        }).catch(() => { });
    });
}

function renderWeatherWidget(wx, townName) {
    const tempEl = document.getElementById('weather-temp');
    const townEl = document.getElementById('weather-town');
    const iconEl = document.getElementById('weather-icon');
    const descEl = document.getElementById('weather-desc');
    const rainEl = document.getElementById('weather-rain');
    const windEl = document.getElementById('weather-wind');
    const alertEl = document.getElementById('weather-road-alert');
    if (!tempEl || !townEl) return;

    tempEl.textContent = `${wx.temp}°C`;
    townEl.textContent = townName ? `Zona ${townName}` : 'Clima en zona';
    if (iconEl) iconEl.textContent = wx.icon || '';
    if (descEl) descEl.textContent = wx.label || 'Tiempo favorable';
    if (rainEl) rainEl.textContent = `${wx.rainProb}% lluvia`;
    if (windEl) windEl.textContent = `${wx.wind} km/h`;

    if (alertEl) {
        if (wx.rainProb >= 60 || wx.condition === 'warning' || wx.condition === 'alert') {
            alertEl.className = 'weather-road-alert alert-warning';
            alertEl.textContent = 'Alerta de lluvia: precaución en terracerías';
        } else if (wx.wind >= 35) {
            alertEl.className = 'weather-road-alert alert-warning';
            alertEl.textContent = 'Viento fuerte: precaución al subir torres';
        } else {
            alertEl.className = 'weather-road-alert';
            alertEl.textContent = 'Condiciones favorables para ruta de campo';
        }
    }
}


let techRealtimeWeatherCoords = null;
let techRealtimeWeatherActive = false;

function hideTechnicianWeather() {
    techRealtimeWeatherActive = false;
    const card = document.getElementById('tech-weather-card');
    if (card) {
        card.style.display = 'none';
        card.classList.remove('has-weather');
        card.innerHTML = '';
    }
}

function getTechnicianWeatherIconSvg(condition) {
    if (condition === 'alert') {
        return '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/></svg>';
    }
    if (condition === 'warning') {
        return '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>';
    }
    if (condition === 'caution') {
        return '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 19v1"/><path d="M8 14v1"/><path d="M12 21v1"/><path d="M12 16v1"/><path d="M16 19v1"/><path d="M16 14v1"/></svg>';
    }
    if (condition === 'fair') {
        return '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 0 1 2.5 8.242"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
}

async function requestTechnicianRealtimeWeather(forceRefresh = false) {
    if (!isTechnicianPlanView()) {
        hideTechnicianWeather();
        return;
    }

    if (!('geolocation' in navigator) || !navigator.geolocation || typeof navigator.geolocation.getCurrentPosition !== 'function') {
        hideTechnicianWeather();
        return;
    }

    if (techRealtimeWeatherCoords && !forceRefresh) {
        await fetchAndRenderTechnicianWeather(techRealtimeWeatherCoords.lat, techRealtimeWeatherCoords.lng);
        return;
    }

    try {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = safeFloat(pos.coords?.latitude);
                const lng = safeFloat(pos.coords?.longitude);
                if (isNaN(lat) || isNaN(lng)) {
                    hideTechnicianWeather();
                    return;
                }
                techRealtimeWeatherCoords = { lat, lng };
                await fetchAndRenderTechnicianWeather(lat, lng);
            },
            (err) => {
                techRealtimeWeatherCoords = null;
                hideTechnicianWeather();
            },
            {
                enableHighAccuracy: false,
                timeout: 8000,
                maximumAge: 300000
            }
        );
    } catch (e) {
        techRealtimeWeatherCoords = null;
        hideTechnicianWeather();
    }
}

async function fetchAndRenderTechnicianWeather(lat, lng) {
    if (!isTechnicianPlanView()) {
        hideTechnicianWeather();
        return;
    }
    const card = document.getElementById('tech-weather-card');
    if (!card) return;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=precipitation_probability_max,temperature_2m_max,temperature_2m_min&timezone=auto`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) {
            hideTechnicianWeather();
            return;
        }
        const data = await res.json();
        const temp = Math.round(data.current?.temperature_2m ?? 24);
        const code = data.current?.weather_code ?? 1;
        const wind = Math.round(data.current?.wind_speed_10m ?? 8);
        const rainProb = data.daily?.precipitation_probability_max?.[0] ?? Math.round(data.current?.precipitation ? 60 : 10);
        const info = getWmoWeatherInfo(code);
        const weatherSvg = getTechnicianWeatherIconSvg(info.condition);

        card.innerHTML = `
            <div class="tech-weather-card-inner">
                <div class="tech-weather-left">
                    <div class="tech-weather-icon-wrap" aria-hidden="true">${weatherSvg}</div>
                    <div class="tech-weather-main">
                        <div class="tech-weather-temp">${temp}&#176;C</div>
                        <div class="tech-weather-title">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span>Clima en tu ubicaci&oacute;n actual</span>
                        </div>
                    </div>
                </div>
                <div class="tech-weather-right">
                    <div class="tech-weather-desc">${escapeHtml(info.label || 'Tiempo favorable')}</div>
                    <div class="tech-weather-metrics">
                        <span class="tech-wx-metric" title="Probabilidad de lluvia">
                            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                            ${rainProb}% lluvia
                        </span>
                        <span class="tech-wx-metric" title="Velocidad del viento">
                            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.7 7.7A2.5 2.5 0 1 1 19 12H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>
                            ${wind} km/h
                        </span>
                    </div>
                    <div class="tech-wx-road ${info.condition === 'warning' || info.condition === 'alert' ? 'caution' : ''}">
                        ${info.condition === 'warning' || info.condition === 'alert' ? 'Precauci&oacute;n en terracer&iacute;a' : 'Caminos transitables'}
                    </div>
                </div>
            </div>
        `;
        card.style.display = 'block';
        card.classList.add('has-weather');
        techRealtimeWeatherActive = true;
    } catch (e) {
        hideTechnicianWeather();
    }
}

function renderWeatherFallback(townName) {
    const tempEl = document.getElementById('weather-temp');
    const townEl = document.getElementById('weather-town');
    const descEl = document.getElementById('weather-desc');
    const alertEl = document.getElementById('weather-road-alert');
    if (tempEl) tempEl.textContent = 'Guerrero';
    if (townEl) townEl.textContent = townName ? `Zona ${townName}` : 'Clima en zona';
    if (descEl) descEl.textContent = 'Pronóstico local listo para ruta';
    if (alertEl) {
        alertEl.className = 'weather-road-alert';
        alertEl.textContent = 'Caminos transitables';
    }
}

function getVisiblePlanStops() {
    const query = normalizeName(document.getElementById('plan-stop-search')?.value || '');
    const today = localDateKey();
    const allStops = getPlanStopsForView('general').filter(stop => {
        if (!query) return true;
        const details = getStopDetails(stop);
        return normalizeName([stop.name, ...details.flatMap(detail => [detail.clientName, detail.title, detail.description])].filter(Boolean).join(' ')).includes(query);
    });
    if (isTechnicianPlanView()) {
        if (technicianSummaryMode === 'general') return allStops;
        const targetDate = selectedCalendarDate || today;
        const forDay = allStops.filter(stop => stop.scheduledDate === targetDate);
        if (forDay.length > 0) return forDay;
        // Si no hay paradas fechadas específicamente para hoy:
        // 1. Mostrar las paradas sin fecha asignada de su plan
        // 2. Si todas las paradas tienen otra fecha, mostrarlas para que el técnico no quede bloqueado
        if (!selectedCalendarDate || selectedCalendarDate === today) {
            const unscheduled = allStops.filter(stop => !stop.scheduledDate);
            if (unscheduled.length > 0) return unscheduled;
            if (allStops.length > 0) return allStops;
        }
        return [];
    }
    return (selectedCalendarDate
        ? allStops.filter(stop => (stop.scheduledDate || '') === selectedCalendarDate)
        : (document.getElementById('plan-calendar')?.dataset.unscheduledFilter === '1'
            ? allStops.filter(stop => !stop.scheduledDate)
            : allStops));
}

function advancePlanCard(offset) {
    const visible = getVisiblePlanStops();
    if (!visible.length) return;
    activePlanCardIndex = Math.max(0, Math.min(visible.length - 1, activePlanCardIndex + offset));
    renderPlanDays();
}

function selectPlanCardIndex(idx) {
    const visible = getVisiblePlanStops();
    if (idx >= 0 && idx < visible.length) {
        activePlanCardIndex = idx;
        renderPlanDays();
    }
}

function togglePlanDisplayMode() {
    planCardDisplayMode = planCardDisplayMode === 'card' ? 'all' : 'card';
    const isCard = planCardDisplayMode === 'card';
    const weatherBox = document.getElementById('plan-weather-box');
    if (weatherBox) {
        weatherBox.classList.toggle('is-hidden', !isCard);
        weatherBox.style.setProperty('display', isCard ? 'block' : 'none', 'important');
    }
    renderPlanDays();
}

function panPlanMapToActiveStop(stop) {
    if (!planMap) return;
    try {
        planMap.invalidateSize();
    } catch (e) { }
    if (!stop) return;
    const pos = getStopCurrentPosition(stop);
    if (!isNaN(pos.lat) && !isNaN(pos.lng)) {
        try {
            planMap.panTo([pos.lat, pos.lng], { animate: true, duration: 0.5 });
        } catch (e) { }
    }
}

function renderActiveStopExtraDetails(stop) {
    if (!stop) return '';
    const eq = stop.equipmentId ? (state.equipment || []).find(e => e.id === stop.equipmentId && !e.deletedAt) : null;
    const node = stop.nodeId ? (state.nodes || []).find(n => n.id === stop.nodeId && !n.deletedAt) : null;
    const pos = getStopCurrentPosition(stop);
    const hasCoords = !isNaN(pos.lat) && !isNaN(pos.lng);
    const mapsUrl = hasCoords ? `https://www.google.com/maps/dir/?api=1&destination=${pos.lat},${pos.lng}` : '';
    const details = getStopDetails(stop);

    let siteSpecs = [];
    if (eq?.ip || node?.ip) siteSpecs.push(`<span><b>IP:</b> ${escapeHtml(eq?.ip || node?.ip)}</span>`);
    if (eq?.model) siteSpecs.push(`<span><b>Modelo:</b> ${escapeHtml(eq.model)}</span>`);
    if (node?.town || stop.town) siteSpecs.push(`<span><b>Comunidad:</b> ${escapeHtml(node?.town || stop.town)}</span>`);
    if (hasCoords) siteSpecs.push(`<span><b>Coordenadas:</b> ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}</span>`);

    const plannedMat = (stop.materialPlanned || '').trim();

    return `
        <div class="plan-site-extra-details">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <h4 style="margin:0;font-size:11px;font-weight:800;color:#183a61;">Información del sitio activo</h4>
                ${mapsUrl ? `<a href="${escapeAttr(mapsUrl)}" target="_blank" rel="noopener" style="font-size:10px;font-weight:800;color:#0874e8;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">📍 Navegar en Maps</a>` : ''}
            </div>
            ${siteSpecs.length ? `<div style="display:flex;flex-wrap:wrap;gap:10px;font-size:11px;color:#284360;margin-bottom:10px;padding:6px 10px;background:#ffffff;border:1px solid #e2ecf5;border-radius:6px;">${siteSpecs.join(' · ')}</div>` : ''}
            ${stop.notes ? `<div style="font-size:11px;color:#475e77;margin-bottom:8px;padding:6px 9px;background:#ffffff;border:1px solid #e4edf5;border-radius:6px;"><strong>Nota del sitio:</strong> ${escapeHtml(stop.notes)}</div>` : ''}
            <div style="padding:8px 10px;background:#f6f9fc;border:1px solid #dce7f2;border-radius:6px;">
                <strong style="font-size:11px;color:#183a61;">Material de la parada:</strong>
                <span style="font-size:11px;color:#45607d;">${plannedMat ? escapeHtml(plannedMat) : 'Sin material específico registrado.'}</span>
            </div>
        </div>
    `;
}

function renderActiveSiteInformation(stop) {
    if (!stop) return '';
    const eq = stop.equipmentId ? (state.equipment || []).find(e => e.id === stop.equipmentId && !e.deletedAt) : null;
    const node = stop.nodeId ? (state.nodes || []).find(n => n.id === stop.nodeId && !n.deletedAt) : null;
    const pos = getStopCurrentPosition(stop);
    const hasCoords = !isNaN(pos.lat) && !isNaN(pos.lng);
    const mapsUrl = hasCoords ? `https://www.google.com/maps/dir/?api=1&destination=${pos.lat},${pos.lng}` : '';
    const details = getStopDetails(stop);
    const pendingDetails = details.filter(d => !['completada', 'no_realizado'].includes(d.status || ''));

    const plan = getSelectedGeneralPlan();
    const assignedTechs = getGeneralPlanAssignedTechs(plan);
    const assignedNames = assignedTechs.map(t => t.nombre || t.usuario).join(', ');

    let tags = [];
    if (eq?.ip || node?.ip) tags.push(`<span><b>IP:</b> ${escapeHtml(eq?.ip || node?.ip)}</span>`);
    if (eq?.model || node?.modelo) tags.push(`<span><b>Modelo:</b> ${escapeHtml(eq?.model || node?.modelo)}</span>`);
    if (node?.town || stop.town) tags.push(`<span><b>Pueblo:</b> ${escapeHtml(node?.town || stop.town)}</span>`);
    if (hasCoords) tags.push(`<span><b>GPS:</b> ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}</span>`);
    if (assignedNames) tags.push(`<span><b>Equipo:</b> ${escapeHtml(assignedNames)}</span>`);

    const noteText = stop.notes || node?.notas || eq?.notas || '';

    // Material en la torre (solo para antenas)
    let towerHtml = '';
    if (eq && !stop.nodeId) {
        const specs = [];
        if (eq.towerSections) specs.push(`<span class="site-spec-chip"><b>Tramos:</b> ${escapeHtml(eq.towerSections)}</span>`);
        if (eq.altura_torre) specs.push(`<span class="site-spec-chip"><b>Altura:</b> ${escapeHtml(eq.altura_torre)} m</span>`);
        if (eq.towerRadios) specs.push(`<span class="site-spec-chip"><b>Radios:</b> ${escapeHtml(eq.towerRadios)}</span>`);
        if (eq.towerBatteries) specs.push(`<span class="site-spec-chip"><b>Baterías:</b> ${escapeHtml(eq.towerBatteries)}</span>`);
        if (eq.towerPanels) specs.push(`<span class="site-spec-chip"><b>Paneles:</b> ${escapeHtml(eq.towerPanels)}</span>`);
        if (eq.frecuencia) specs.push(`<span class="site-spec-chip"><b>Frecuencia:</b> ${escapeHtml(eq.frecuencia)} MHz</span>`);
        if (eq.canal) specs.push(`<span class="site-spec-chip"><b>Canal:</b> ${escapeHtml(eq.canal)}</span>`);
        if (eq.ssid) specs.push(`<span class="site-spec-chip"><b>Red/SSID:</b> ${escapeHtml(eq.ssid)}</span>`);
        if (eq.mac) specs.push(`<span class="site-spec-chip"><b>MAC:</b> ${escapeHtml(eq.mac)}</span>`);
        const extraMat = (eq.towerMaterialNotes || eq.towerExtraNotes || '').trim();
        const photos = Array.isArray(eq.towerMaterialPhotos) ? eq.towerMaterialPhotos.filter(Boolean) : [];

        towerHtml = `
            <div class="site-tower-section" style="margin-top:10px;padding:10px 12px;background:#f8fbff;border:1px solid #d4e4f7;border-radius:9px;">
                <div style="margin-bottom:6px;">
                    <strong style="font-size:11px;font-weight:800;color:#0874e8;display:flex;align-items:center;gap:6px;">
                        Material en torre
                    </strong>
                </div>
                ${specs.length ? `<div class="site-spec-grid" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">${specs.join('')}</div>` : '<div style="font-size:10px;color:#71829a;">Sin material registrado.</div>'}
                ${extraMat ? `<div style="font-size:10.5px;color:#355171;background:#ffffff;padding:6px 9px;border-radius:6px;border:1px solid #e2edf8;margin-top:6px;"><b>Notas:</b> ${escapeHtml(extraMat)}</div>` : ''}
                ${photos.length ? `
                    <div style="margin-top:6px;">
                        <small style="font-size:9.5px;font-weight:700;color:#547192;display:block;margin-bottom:4px;">Fotos de equipo (${photos.length}):</small>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            ${photos.map((p, i) => {
            const slotNames = { batteries: 'Pilas', panels: 'Paneles', controller: 'Controlador', tower: 'Torre', cabinet: 'Gabinete', lightning: 'Pararrayos', mikrotik: 'MikroTik', poe: 'PoE' };
            const slotKey = (eq.towerMaterialSlots && typeof eq.towerMaterialSlots === 'object') ? Object.keys(eq.towerMaterialSlots).find(k => eq.towerMaterialSlots[k] === p) : null;
            const slotLabel = slotKey && slotNames[slotKey] ? slotNames[slotKey] : `Foto ${i + 1}`;
            return `<a href="${escapeAttr(p)}" target="_blank" rel="noopener" style="display:inline-block;position:relative;border-radius:6px;overflow:hidden;border:1px solid #ccdff2;" title="${escapeAttr(slotLabel)}"><img src="${escapeAttr(p)}" style="width:44px;height:44px;object-fit:cover;display:block;" alt="${escapeAttr(slotLabel)}">${slotKey ? `<span style="position:absolute;bottom:0;left:0;right:0;background:rgba(15,23,42,0.7);color:#fff;font-size:8px;font-weight:700;text-align:center;padding:1px 0;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(slotNames[slotKey] || '')}</span>` : ''}</a>`;
        }).join('')}
                        </div>
                    </div>` : ''}
            </div>
        `;
    }

    // Datos del nodo
    let nodeHtml = '';
    if (node) {
        const nodeSpecs = [];
        if (node.nodeCode || node.code) nodeSpecs.push(`<span class="site-spec-chip"><b>Código:</b> ${escapeHtml(node.nodeCode || node.code)}</span>`);
        if (node.segmento_red) nodeSpecs.push(`<span class="site-spec-chip"><b>Red:</b> ${escapeHtml(node.segmento_red)}</span>`);
        if (node.tipo_enlace) nodeSpecs.push(`<span class="site-spec-chip"><b>Enlace:</b> ${escapeHtml(node.tipo_enlace)}</span>`);
        if (node.routerOS) nodeSpecs.push(`<span class="site-spec-chip"><b>Router:</b> ${escapeHtml(node.routerOS)}</span>`);
        if (node.modelo) nodeSpecs.push(`<span class="site-spec-chip"><b>Modelo:</b> ${escapeHtml(node.modelo)}</span>`);
        if (node.cobertura) nodeSpecs.push(`<span class="site-spec-chip"><b>Cobertura:</b> ${escapeHtml(node.cobertura)}</span>`);

        nodeHtml = `
            <div class="site-node-section" style="margin-top:10px;padding:10px 12px;background:#f6fbf9;border:1px solid #c9ecdc;border-radius:9px;">
                <div style="margin-bottom:6px;">
                    <strong style="font-size:11px;font-weight:800;color:#0e8354;">Equipo del nodo</strong>
                </div>
                ${nodeSpecs.length ? `<div class="site-spec-grid" style="display:flex;flex-wrap:wrap;gap:6px;">${nodeSpecs.join('')}</div>` : '<div style="font-size:10px;color:#71829a;">Sin datos adicionales.</div>'}
            </div>
        `;
    }

    return `
        <div class="site-extra-info-panel">
            <div class="site-info-header">
                <div class="site-info-title-group">
                    <span class="site-info-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg></span>
                    <div>
                        <h3>Datos del sitio</h3>
                        <small>${escapeHtml(stop.name || eq?.name || node?.name || 'Sitio seleccionado')}</small>
                    </div>
                </div>
                ${mapsUrl ? `
                    <a class="btn bc site-maps-btn" href="${escapeAttr(mapsUrl)}" target="_blank" rel="noopener" title="Abrir en Google Maps">
                        <span>Abrir Maps</span>
                    </a>
                ` : ''}
            </div>
            ${tags.length ? `<div class="site-tags-row">${tags.join('')}</div>` : ''}
            ${towerHtml}
            ${nodeHtml}
            ${noteText ? `<div class="site-notes-strip" style="margin-top:8px;"><strong>Nota:</strong> ${escapeHtml(noteText)}</div>` : ''}
        </div>
    `;
}

function renderSidebarPlanSummary(stops) {
    const container = document.getElementById('plan-sidebar-summary');
    if (!container) return;
    const validStops = (stops || []).filter(s => !s.deletedAt);
    if (!validStops.length) {
        container.innerHTML = '';
        return;
    }
    const plan = getSelectedGeneralPlan();
    const assignedTechs = getGeneralPlanAssignedTechs(plan);
    const techCount = assignedTechs.length || (plan?.assignedTechId ? 1 : 0);
    const crewLabel = techCount > 1 ? `Equipo: ${techCount} técnicos` : (assignedTechs[0]?.nombre || '1 técnico');

    let totalDetails = 0;
    let completedDetails = 0;
    let completedStops = 0;
    let antennasCount = 0;
    let nodesCount = 0;
    let manualCount = 0;
    let withMaterialCount = 0;
    const coveredTownsSet = new Set();

    validStops.forEach(s => {
        const details = getStopDetails(s);
        totalDetails += details.length;
        const resolved = details.filter(d => ['completada', 'no_realizado'].includes(d.status || ''));
        completedDetails += resolved.length;
        if (s.completedAt || (details.length > 0 && resolved.length === details.length)) {
            completedStops++;
        }

        const eq = s.equipmentId ? (state.equipment || []).find(e => e.id === s.equipmentId && !e.deletedAt) : null;
        const node = s.nodeId ? (state.nodes || []).find(n => n.id === s.nodeId && !n.deletedAt) : null;

        if (s.nodeId || node) {
            nodesCount++;
        } else if (s.equipmentId || eq) {
            antennasCount++;
        } else {
            manualCount++;
        }

        const town = s.town || node?.town || eq?.town || '';
        if (town) coveredTownsSet.add(town.trim().toUpperCase());

        const hasTowerMat = eq && (eq.towerSections || eq.towerRadios || eq.towerBatteries || eq.towerPanels || eq.towerMaterialNotes || eq.towerExtraNotes || (Array.isArray(eq.towerMaterialPhotos) && eq.towerMaterialPhotos.length));
        if (hasTowerMat) withMaterialCount++;
    });

    const percent = totalDetails > 0 ? Math.round((completedDetails / totalDetails) * 100) : (validStops.length > 0 ? Math.round((completedStops / validStops.length) * 100) : 0);
    const metrics = calculateDayRouteFeasibility(validStops, 0);
    const avgLegKm = validStops.length > 1 ? (metrics.totalKm / (validStops.length - 1)).toFixed(1) : '0.0';
    const coveredTownsCount = coveredTownsSet.size;

    container.innerHTML = `
        <div class="sidebar-summary-card">
            <div class="sidebar-summary-row">
                <strong style="font-size:11px;font-weight:800;color:#102b50;">Resumen del Plan</strong>
                <span style="font-size:10px;font-weight:700;color:#0874e8;">${escapeHtml(crewLabel)}</span>
            </div>
            <div style="background:#e5edf6;border-radius:999px;height:6px;overflow:hidden;margin:2px 0;">
                <div style="background:linear-gradient(90deg,#0874e8,#10b981);height:100%;width:${percent}%;transition:width .3s;"></div>
            </div>
            <div class="sidebar-summary-stats">
                <div>
                    <small>Avance</small>
                    <b>${percent}%</b>
                </div>
                <div>
                    <small>Detalles</small>
                    <b>${completedDetails}/${totalDetails}</b>
                </div>
                <div>
                    <small>Carretera</small>
                    <b>~${metrics.totalKm}km</b>
                </div>
            </div>

            <!-- Resumen de ruta simplificado -->
            <div class="sidebar-plan-stats-box" style="margin-top:8px;border-top:1px solid #e1ecf6;padding-top:7px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <span style="font-size:9.5px;font-weight:800;color:#203c5c;text-transform:uppercase;letter-spacing:.02em;">Resumen de ruta</span>
                    <span style="font-size:8.5px;color:#0874e8;font-weight:700;">${validStops.length} lugar(es)</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:5px;">
                    <div class="sidebar-stat-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 7px;background:#ffffff;border:1px solid #e6eef6;border-radius:6px;font-size:10.5px;">
                        <span style="color:#50647c;display:flex;align-items:center;gap:5px;">Antenas</span>
                        <b style="color:#102b50;">${antennasCount}</b>
                    </div>
                    <div class="sidebar-stat-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 7px;background:#ffffff;border:1px solid #e6eef6;border-radius:6px;font-size:10.5px;">
                        <span style="color:#50647c;display:flex;align-items:center;gap:5px;">Nodos</span>
                        <b style="color:#102b50;">${nodesCount}</b>
                    </div>
                    ${manualCount > 0 ? `
                    <div class="sidebar-stat-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 7px;background:#ffffff;border:1px solid #e6eef6;border-radius:6px;font-size:10.5px;">
                        <span style="color:#50647c;display:flex;align-items:center;gap:5px;">Otros puntos</span>
                        <b style="color:#102b50;">${manualCount}</b>
                    </div>` : ''}
                    <div class="sidebar-stat-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 7px;background:#ffffff;border:1px solid #e6eef6;border-radius:6px;font-size:10.5px;">
                        <span style="color:#50647c;display:flex;align-items:center;gap:5px;">Tiempo de viaje</span>
                        <b style="color:#102b50;">~${metrics.travelFormatted}</b>
                    </div>
                    <div class="sidebar-stat-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 7px;background:#ffffff;border:1px solid #e6eef6;border-radius:6px;font-size:10.5px;">
                        <span style="color:#50647c;display:flex;align-items:center;gap:5px;">Distancia promedio</span>
                        <b style="color:#102b50;">~${avgLegKm} km</b>
                    </div>
                    ${antennasCount > 0 ? `
                    <div class="sidebar-stat-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 7px;background:#ffffff;border:1px solid #e6eef6;border-radius:6px;font-size:10.5px;">
                        <span style="color:#50647c;display:flex;align-items:center;gap:5px;">Torres con material</span>
                        <b style="color:#102b50;">${withMaterialCount} / ${antennasCount}</b>
                    </div>` : ''}
                    ${coveredTownsCount > 0 ? `
                    <div class="sidebar-stat-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 7px;background:#ffffff;border:1px solid #e6eef6;border-radius:6px;font-size:10.5px;">
                        <span style="color:#50647c;display:flex;align-items:center;gap:5px;">Pueblos en ruta</span>
                        <b style="color:#102b50;">${coveredTownsCount}</b>
                    </div>` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderPlanPlacesIntelligence(stops) {
    const valid = (stops || []).filter(s => !s.deletedAt);
    if (!valid.length) return '';

    const cards = valid.map((stop, idx) => {
        const eq = stop.equipmentId ? (state.equipment || []).find(e => e.id === stop.equipmentId && !e.deletedAt) : null;
        const node = stop.nodeId ? (state.nodes || []).find(n => n.id === stop.nodeId && !n.deletedAt) : null;
        const pos = getStopCurrentPosition(stop);
        const hasCoords = !isNaN(pos.lat) && !isNaN(pos.lng);
        const details = getStopDetails(stop);
        const pending = details.filter(d => !['completada', 'no_realizado'].includes(d.status || ''));
        const mapsUrl = hasCoords ? `https://www.google.com/maps/dir/?api=1&destination=${pos.lat},${pos.lng}` : '';

        let legText = '';
        if (idx > 0) {
            const prev = valid[idx - 1];
            const p1 = getStopCurrentPosition(prev);
            if (hasCoords && !isNaN(p1.lat) && !isNaN(p1.lng)) {
                const leg = estimateRouteTravel(p1.lat, p1.lng, pos.lat, pos.lng);
                legText = `~${leg.minutes} min (${leg.km} km) desde parada ${idx}`;
            }
        } else {
            legText = 'Punto inicial de ruta';
        }

        const chips = [];
        if (eq?.ip || node?.ip) chips.push(`IP: <b>${escapeHtml(eq?.ip || node?.ip)}</b>`);
        if (eq?.model || node?.modelo) chips.push(`Mod: <b>${escapeHtml(eq?.model || node?.modelo)}</b>`);
        if (eq?.towerSections) chips.push(`Torre: <b>${escapeHtml(eq.towerSections)}</b>`);
        if (node?.segmento_red) chips.push(`Red: <b>${escapeHtml(node.segmento_red)}</b>`);

        return `
            <div class="place-intel-card" onclick="panPlanMapToActiveStop({lat:${pos.lat},lng:${pos.lng}})" title="Clic para centrar en mapa">
                <div class="place-intel-head">
                    <span class="place-seq-badge">${idx + 1}</span>
                    <div style="min-width:0;flex:1;">
                        <strong class="place-name">${escapeHtml(stop.name || eq?.name || node?.name || 'Parada')}</strong>
                        <small class="place-town">${escapeHtml(stop.town || node?.town || (eq ? 'Antena' : 'Sitio'))}</small>
                    </div>
                    ${mapsUrl ? `<a href="${escapeAttr(mapsUrl)}" target="_blank" rel="noopener" class="place-maps-link" onclick="event.stopPropagation()" title="Ver en Google Maps">Maps</a>` : ''}
                </div>
                ${chips.length ? `<div class="place-chips-row">${chips.map(c => `<span>${c}</span>`).join('')}</div>` : ''}
                <div class="place-intel-foot">
                    <span class="place-leg-info">${escapeHtml(legText)}</span>
                    <span class="place-orders-badge ${pending.length ? 'has-pending' : 'all-done'}">${pending.length ? `${pending.length} pend.` : 'Al corriente'}</span>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="day-col plan-route-places-intel" style="margin-top:14px;background:#ffffff;border:1px solid #d5e3ef;border-radius:12px;overflow:hidden;">
            <div class="day-head" style="background:#eef4fb;color:#102b50;font-weight:800;display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border-bottom:1px solid #d0e0f0;">
                <span style="display:inline-flex;align-items:center;gap:6px;"><b>Infraestructura y Lugares en la Ruta (${valid.length})</b></span>
                <span style="font-size:10px;color:#556d88;font-weight:700;">Información técnica y geográfica de campo</span>
            </div>
            <div class="places-summary-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:10px;padding:12px;background:#f7fafe;">
                ${cards}
            </div>
        </div>
    `;
}

function renderRouteIntelligenceWidget(stops, activeIndex = 0) {
    const box = document.getElementById('plan-route-intel-box');
    if (!box) return;
    const metrics = calculateDayRouteFeasibility(stops, activeIndex);

    const nextDistEl = document.getElementById('intel-next-dist');
    const nextTimeEl = document.getElementById('intel-next-time');
    const prevDistEl = document.getElementById('intel-prev-dist');
    const totalDistEl = document.getElementById('intel-total-dist');
    const badgeEl = document.getElementById('intel-feasibility-badge');
    const statusEl = document.getElementById('intel-route-status');
    const stripEl = document.getElementById('plan-day-intel-strip');

    if (nextDistEl) {
        nextDistEl.textContent = metrics.legNext ? `${metrics.legNext.km} km` : (metrics.stopsCount > 1 ? 'Fin de ruta' : '-');
    }
    if (nextTimeEl) {
        nextTimeEl.textContent = metrics.legNext ? `~${metrics.legNext.minutes} min` : '-';
    }
    if (prevDistEl) {
        prevDistEl.textContent = metrics.legPrev ? `${metrics.legPrev.km} km` : (metrics.stopsCount > 0 ? 'Punto de partida' : '-');
    }
    if (totalDistEl) {
        totalDistEl.textContent = `${metrics.totalKm} km`;
    }

    // Backwards-compatibility for older elements if still present
    const kmEl = document.getElementById('intel-km');
    const travelEl = document.getElementById('intel-travel-time');
    const stopsTimeEl = document.getElementById('intel-stops-time');
    const workdayEl = document.getElementById('intel-workday');
    if (kmEl) kmEl.textContent = `${metrics.totalKm} km`;
    if (travelEl) travelEl.textContent = metrics.travelFormatted;
    if (stopsTimeEl) stopsTimeEl.textContent = `${metrics.serviceMinutes} min`;
    if (workdayEl) workdayEl.textContent = metrics.workdayFormatted;

    if (badgeEl) {
        badgeEl.className = `badge ${metrics.statusClass}`;
        badgeEl.textContent = metrics.statusLabel;
    }
    if (statusEl) {
        statusEl.textContent = metrics.statusDesc;
    }

    if (stripEl) {
        stripEl.style.display = 'none';
        stripEl.innerHTML = '';
    }

    // Weather widget update: ALWAYS matches active stop in card mode, or first stop
    const targetStop = metrics.activeStop || stops[0];
    if (targetStop) {
        const p = getStopCurrentPosition(targetStop);
        if (!isNaN(p.lat) && !isNaN(p.lng)) {
            fetchTownWeather(p.lat, p.lng, targetStop.name);
        } else {
            renderWeatherFallback(targetStop.name);
        }
    } else {
        renderWeatherFallback();
    }
}

function renderPlanDays() {
    try {
        const board = document.getElementById('plan-days');
        if (!board) return;
        if (_planInitialCloudLoading) {
            const hasVisibleAssignedStops = Boolean(getSelectedGeneralPlan() && getVisiblePlanStops().length > 0);
            if (!hasVisibleAssignedStops) {
                board.innerHTML = isTechnicianPlanView() ? renderTechnicianMobileLoadingHtml() : renderDesktopPlanLoadingHtml();
                return;
            }
        }
        if (isTechnicianPlanView()) {
            if (!selectedTechId) {
                selectedTechId = getLoggedTechnicianId();
            }
            if (!selectedTechId) {
                board.innerHTML = (typeof window !== 'undefined' && window.netopsCloudLoadOk === false && getPlanStopsForView('general').length === 0)
                    ? renderTechnicianConnectionErrorHtml()
                    : `<div class="plan-empty"><p>No tienes trabajos asignados para hoy.</p></div>`;
                return;
            }
        }
        if (!selectedTechId) {
            board.innerHTML = `<div class="plan-empty">${isTechnicianPlanView() ? '<p>No tienes trabajos asignados para hoy.</p>' : 'Selecciona o crea un tecnico para empezar a planificar.'}</div>`;
            return;
        }
        if (isPlanReadOnly() && !getSelectedGeneralPlan()) {
            const myTechId = isTechnicianPlanView() ? getLoggedTechnicianId() : selectedTechId;
            const candidatePlans = getGeneralPlans().filter(plan => !plan.deletedAt && isPlanAssignedToTech(plan, myTechId));
            if (candidatePlans.length) {
                selectedGeneralPlanId = candidatePlans[0].id;
                sessionStorage.setItem('plan_selected_general_plan_id', selectedGeneralPlanId);
            } else if (getGeneralPlans().filter(p => !p.deletedAt).length) {
                selectedGeneralPlanId = getGeneralPlans().filter(p => !p.deletedAt)[0].id;
                sessionStorage.setItem('plan_selected_general_plan_id', selectedGeneralPlanId);
            }
        }
        if (isPlanReadOnly() && !getSelectedGeneralPlan()) {
            board.innerHTML = (isTechnicianPlanView() && typeof window !== 'undefined' && window.netopsCloudLoadOk === false && getPlanStopsForView('general').length === 0)
                ? renderTechnicianConnectionErrorHtml()
                : `<div class="plan-empty">${isTechnicianPlanView() ? '<p>No tienes planes de trabajo asignados actualmente.</p>' : 'No hay planes asignados a tecnicos todavia.'}${isTechnicianPlanView() ? '<button type="button" class="btn bsm bc" onclick="retryTechnicianPlanLoad()" style="margin-top:12px;font-weight:700;">Actualizar ruta</button>' : ''}</div>`;
            return;
        }
        selectedDay = 'general';
        const daySelect = document.getElementById('plan-day');
        if (daySelect) daySelect.value = 'general';
        const today = localDateKey();
        const visible = getVisiblePlanStops();

        if (visible.length === 0) {
            if (isTechnicianPlanView() && typeof window !== 'undefined' && window.netopsCloudLoadOk === false && getPlanStopsForView('general').length === 0) {
                board.innerHTML = renderTechnicianConnectionErrorHtml();
                return;
            }
            const isFiltered = Boolean(selectedCalendarDate || document.getElementById('plan-calendar')?.dataset.unscheduledFilter === '1');
            board.innerHTML = `<div class="plan-empty">
                <p>${isTechnicianPlanView() ? `No tienes paradas asignadas para ${formatCalendarDate(selectedCalendarDate || today)}.` : 'No hay paradas que coincidan con la búsqueda o filtro de fecha.'}</p>
                ${isTechnicianPlanView() && technicianSummaryMode !== 'general' ? `<button type="button" class="btn bsm bg2" onclick="toggleTechnicianSummaryMode()" style="margin-top:12px;font-weight:700;">Ver todos los detalles del plan</button>` : ''}
                ${isFiltered && !isTechnicianPlanView() ? `<button type="button" class="btn bsm bgh" onclick="clearPlanCalendarFilter()" style="margin-top:10px;">Mostrar todas las paradas del plan</button>` : ''}
            </div>`;
            if (!isTechnicianPlanView()) {
                renderRouteIntelligenceWidget([], 0);
                renderSidebarPlanSummary([]);
            }
            return;
        }

        // Desktop view and Card-by-Card mode:
        if (!isTechnicianPlanView() && planCardDisplayMode === 'card') {
            if (activePlanCardIndex >= visible.length) activePlanCardIndex = Math.max(0, visible.length - 1);
            if (activePlanCardIndex < 0) activePlanCardIndex = 0;

            const activeStop = visible[activePlanCardIndex];
            const isFirst = activePlanCardIndex === 0;
            const isLast = activePlanCardIndex === visible.length - 1;
            const key = activeStop.scheduledDate || '';
            const groupLabel = !key ? 'Sin fecha asignada' : (key < today ? `Pendientes anteriores · ${formatCalendarDate(key)}` : (key === today ? `Trabajo de hoy · ${formatCalendarDate(key)}` : formatCalendarDate(key)));

            const metrics = calculateDayRouteFeasibility(visible, activePlanCardIndex);

            // 1. Navigation controls (Anterior / Siguiente / Counter + Metrics + Ver todo el plan)
            const navigatorHtml = `
            <div class="plan-card-navigator">
                <div class="plan-card-nav-controls">
                    <button type="button" class="plan-card-nav-btn" onclick="advancePlanCard(-1)" ${isFirst ? 'disabled' : ''} title="Ver parada anterior">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m15 18-6-6 6-6"/></svg>
                        <span>Anterior</span>
                    </button>
                    <span class="plan-card-step-badge">
                        Sitio <strong>${activePlanCardIndex + 1}</strong> de <strong>${visible.length}</strong>
                    </span>
                    <button type="button" class="plan-card-nav-btn" onclick="advancePlanCard(1)" ${isLast ? 'disabled' : ''} title="Ver siguiente parada">
                        <span>Siguiente</span>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                </div>
                <div class="plan-card-nav-metrics">
                    <span><b>${visible.length}</b> sitio${visible.length === 1 ? '' : 's'} en el plan</span>
                    <span><b>~${metrics.totalKm} km</b> carretera total</span>
                    <span><b>~${metrics.travelFormatted}</b> traslado acumulado</span>
                </div>
                <button type="button" class="plan-view-toggle-btn" onclick="togglePlanDisplayMode()" title="Ver la lista completa de paradas">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                    <span>Ver todo el plan</span>
                </button>
            </div>
        `;

            // 2. Horizontal pills strip to jump to any site directly
            const pillsHtml = `
            <div class="plan-site-pills-row" title="Selecciona directamente cualquier sitio del plan">
                ${visible.map((s, idx) => {
                const isActive = idx === activePlanCardIndex ? 'active' : '';
                const label = escapeHtml(s.name || `Sitio ${idx + 1}`);
                return `<button type="button" class="plan-site-pill ${isActive}" onclick="selectPlanCardIndex(${idx})"><small>${idx + 1}.</small> <span>${label}</span></button>`;
            }).join('')}
            </div>
        `;

            // 3. Card HTML
            const cardHtml = renderStopCard(activeStop, 'general', activePlanCardIndex);

            // 4. Conector de traslado hacia el siguiente sitio
            let transitConnectorHtml = '';
            if (!isLast) {
                const nextStop = visible[activePlanCardIndex + 1];
                const p1 = getStopCurrentPosition(activeStop);
                const p2 = getStopCurrentPosition(nextStop);
                let transitText = 'Próximo sitio';
                if (!isNaN(p1.lat) && !isNaN(p1.lng) && !isNaN(p2.lat) && !isNaN(p2.lng)) {
                    const leg = estimateRouteTravel(p1.lat, p1.lng, p2.lat, p2.lng);
                    transitText = `~${leg.minutes} min (${leg.km} km) de ${escapeHtml(activeStop.name || 'Sitio actual')} a ${escapeHtml(nextStop.name || 'Siguiente sitio')}`;
                } else {
                    transitText = `Siguiente: ${escapeHtml(nextStop.name || 'Próximo sitio')}`;
                }
                transitConnectorHtml = `
                <div class="plan-card-transit-box" title="Estimación de recorrido hacia ${escapeAttr(nextStop.name || 'siguiente sitio')}">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
                    <span>${transitText}</span>
                </div>
            `;
            }

            // 5. Rich site details
            const extraDetailsHtml = renderActiveStopExtraDetails(activeStop);
            const siteInfoHtml = renderActiveSiteInformation(activeStop);

            board.innerHTML = `
            ${navigatorHtml}
            ${pillsHtml}
            <div class="day-col ${key && key < today ? 'plan-overdue-group' : ''}">
                <div class="day-head"><span>${escapeHtml(groupLabel)}</span></div>
                <div class="day-body">
                    ${cardHtml}
                    ${transitConnectorHtml}
                    ${siteInfoHtml}
                </div>
            </div>
        `;

            renderRouteIntelligenceWidget(visible, activePlanCardIndex);
            renderSidebarPlanSummary(visible);
            panPlanMapToActiveStop(activeStop);
            updateStopsWeatherBadges([activeStop]);
            return;
        }

        // Default Full List / Technician View
        const groups = new Map();
        visible.forEach(stop => {
            const key = stop.scheduledDate || '';
            const list = groups.get(key) || [];
            list.push(stop);
            groups.set(key, list);
        });
        const keys = [...groups.keys()].sort((a, b) => String(a || '9999').localeCompare(String(b || '9999')));
        const allMetrics = calculateDayRouteFeasibility(visible, 0);
        const listModeBanner = !isTechnicianPlanView() ? `
        <div class="plan-card-navigator plan-list-mode-banner" style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;padding:8px 12px;background:#ffffff;border:1px solid #dce7f2;border-radius:10px;flex-shrink:0;">
            <div class="plan-card-nav-metrics" style="justify-content:flex-start;">
                <span><b>${visible.length}</b> sitio${visible.length === 1 ? '' : 's'} en el plan</span>
                <span><b>~${allMetrics.totalKm} km</b> carretera total</span>
                <span><b>~${allMetrics.travelFormatted}</b> traslado acumulado</span>
            </div>
            <button type="button" class="plan-view-toggle-btn" onclick="togglePlanDisplayMode()" title="Ver las paradas en tarjetas individuales">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>
                <span>Ver por cartas</span>
            </button>
        </div>` : '';

        const daysHtml = keys.map(key => {
            const stops = groups.get(key) || [];
            const label = !key ? 'Sin fecha asignada' : (key < today ? `Pendientes anteriores · ${formatCalendarDate(key)}` : (key === today ? `Trabajo de hoy · ${formatCalendarDate(key)}` : formatCalendarDate(key)));
            const dayMetrics = calculateDayRouteFeasibility(stops);
            const dayTravelBadge = isTechnicianPlanView() && stops.length > 1 && dayMetrics.totalKm > 0
                ? `<span class="tech-day-travel-badge" title="Distancia total por carretera para este día"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>~${dayMetrics.totalKm} km (${dayMetrics.travelFormatted})</span>`
                : '';
            const stopsHtml = stops.map((stop, index) => {
                let transitHtml = '';
                if (index > 0) {
                    const prevStop = stops[index - 1];
                    const p1 = getStopCurrentPosition(prevStop);
                    const p2 = getStopCurrentPosition(stop);
                    if (!isNaN(p1.lat) && !isNaN(p1.lng) && !isNaN(p2.lat) && !isNaN(p2.lng)) {
                        const leg = estimateRouteTravel(p1.lat, p1.lng, p2.lat, p2.lng);
                        const prevEq = prevStop.equipmentId ? (state.equipment || []).find(item => item.id === prevStop.equipmentId && !item.deletedAt) : null;
                        const prevNode = prevStop.nodeId ? (state.nodes || []).find(item => item.id === prevStop.nodeId && !item.deletedAt) : null;
                        const currEq = stop.equipmentId ? (state.equipment || []).find(item => item.id === stop.equipmentId && !item.deletedAt) : null;
                        const currNode = stop.nodeId ? (state.nodes || []).find(item => item.id === stop.nodeId && !item.deletedAt) : null;
                        const prevName = isTechnicianPlanView() ? getTechnicianStopName(prevStop, prevEq, prevNode) : (prevStop.name || 'Parada anterior');
                        const currName = isTechnicianPlanView() ? getTechnicianStopName(stop, currEq, currNode) : (stop.name || 'Siguiente parada');
                        transitHtml = `
                        <div class="plan-inter-stop-transit">
                            <div class="transit-line"></div>
                            <div class="transit-badge" title="Tiempo estimado en carretera (38 km/h)">
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
                                <span><b>~${leg.minutes} min</b> (${leg.km} km)${isTechnicianPlanView() ? '' : ` de <b>${escapeHtml(prevName)}</b> a <b>${escapeHtml(currName)}</b>`}</span>
                            </div>
                        </div>`;
                    }
                }
                return transitHtml + renderStopCard(stop, 'general', index);
            }).join('');
            return `<div class="day-col ${key && key < today ? 'plan-overdue-group' : ''}"><div class="day-head"><span>${escapeHtml(label)}</span>${dayTravelBadge}</div><div class="day-body">${stopsHtml}</div></div>`;
        }).join('');
        const placesIntelligenceHtml = !isTechnicianPlanView() ? renderPlanPlacesIntelligence(visible) : '';
        const techSyncStripHtml = (isTechnicianPlanView() && _planCloudSyncing) ? renderTechnicianMobileSyncingStripHtml() : '';
        board.innerHTML = techSyncStripHtml + listModeBanner + (daysHtml ? (daysHtml + placesIntelligenceHtml) : `<div class="plan-empty">${isTechnicianPlanView() ? `No tienes paradas asignadas para ${formatCalendarDate(selectedCalendarDate || today)}.` : 'No hay paradas en esta fecha.'}</div>`);
        updateStopsWeatherBadges(visible);

        if (!isTechnicianPlanView()) {
            renderRouteIntelligenceWidget(visible, 0);
            renderSidebarPlanSummary(visible);
        }
    } catch (err) {
        console.error('Error rendering plan days:', err);
        const board = document.getElementById('plan-days');
        if (board) {
            board.innerHTML = `
                <div class="plan-empty" style="padding:24px 16px;text-align:center;">
                    <p style="font-weight:700;color:#0f172a;margin-bottom:8px;">Hubo un inconveniente al mostrar los detalles.</p>
                    <p style="font-size:13px;color:#64748b;margin-bottom:14px;">Tus datos están a salvo en la nube. Pulsa el botón para recargar la vista.</p>
                    <button type="button" class="btn bsm bg2" onclick="renderPlan()" style="padding:8px 18px;font-weight:700;">Reintentar carga</button>
                </div>`;
        }
    }
}

function stopActionIcon(type) {
    const icons = {
        edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.8 4 4-.8L18.5 7.9l-3.2-3.2L4 16ZM13.8 6.2l3.2 3.2"/></svg>',
        delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7M14 10v7"/></svg>',
        completed: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m8 12 2.6 2.6L16.5 9"/></svg>',
        pending: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></svg>'
    };
    return icons[type] || '';
}

function renderStopCard(stop, day, index) {
    let eq = stop.equipmentId ? (state.equipment || []).find(e => e.id === stop.equipmentId && !e.deletedAt) : null;
    let node = stop.nodeId ? (state.nodes || []).find(n => n.id === stop.nodeId && !n.deletedAt) : null;
    const details = getStopDetails(stop);
    const pendingDetails = details.filter(detail => isDetailPendingInStop(detail, stop));
    const progress = getStopProgress(stop);
    const adminStatus = getStopAdminStatus(stop, progress);
    const visibleNotes = getVisibleStopNotes(stop, details);
    const materialText = stop.materialPlanned || details.map(d => d.materialPlanned || d.technicianReport?.materialUsed || '').filter(Boolean).join(', ');
    const position = getStopCurrentPosition(stop);
    const lat = !isNaN(position.lat) ? position.lat.toFixed(5) : '';
    const lng = !isNaN(position.lng) ? position.lng.toFixed(5) : '';

    // Auto-resolución de paradas por proximidad GPS si dicen "Parada", no tienen nodo/antena o son manuales
    if (!node && !eq && !isNaN(position.lat) && !isNaN(position.lng)) {
        let closestNode = null;
        let minNodeDist = 0.6; // 600 metros
        (state.nodes || []).forEach(n => {
            if (n.deletedAt || isNaN(n.lat) || isNaN(n.lng)) return;
            const dist = calculateHaversineKm(position.lat, position.lng, Number(n.lat), Number(n.lng));
            if (dist < minNodeDist) {
                minNodeDist = dist;
                closestNode = n;
            }
        });
        if (closestNode) {
            node = closestNode;
            stop.nodeId = closestNode.id;
            stop.type = 'node';
            if (!stop.name || stop.name === 'Parada' || stop.name.toLowerCase().startsWith('parada')) {
                stop.name = closestNode.town || closestNode.name;
            }
        } else {
            let closestEq = null;
            let minEqDist = 0.6;
            (state.equipment || []).forEach(e => {
                if (e.deletedAt || isNaN(e.lat) || isNaN(e.lng)) return;
                const dist = calculateHaversineKm(position.lat, position.lng, Number(e.lat), Number(e.lng));
                if (dist < minEqDist) {
                    minEqDist = dist;
                    closestEq = e;
                }
            });
            if (closestEq) {
                eq = closestEq;
                stop.equipmentId = closestEq.id;
                stop.type = 'equipment';
                if (!stop.name || stop.name === 'Parada' || stop.name.toLowerCase().startsWith('parada')) {
                    stop.name = closestEq.name;
                }
            }
        }
    }

    const doneClass = progress.complete || stop.adminReleasedAt ? 'done' : '';
    const resolved = getStopResolvedHistory(stop);
    const resolvedOpen = expandedResolvedStops.has(stop.id);
    const compactStop = !isTechnicianPlanView();
    const isTech = isTechnicianPlanView();
    const isCollapsed = collapsedTechnicianStopIds.has(stop.id);
    const pendingOpen = isTech ? !isCollapsed : (expandedPendingStopId === stop.id);
    const stopExpanded = isTech ? (pendingOpen || expandedCompletedStopId === stop.id) : (expandedPendingStopId === stop.id || resolvedOpen || expandedCompletedStopId === stop.id);
    const history = getStopHistorySummary(stop);
    const isCorruptText = text => !text || /^Ver\s+(detalles|pendientes|completados)/i.test(String(text).trim());
    const validEqName = eq && !isCorruptText(eq.name) ? eq.name : '';
    const validNodeName = node && !isCorruptText(node.town || node.name) ? (node.nodeCode ? `${node.nodeCode} · ${node.town || node.name}` : (node.town || node.name)) : '';
    const validStopName = !isCorruptText(stop?.name) && String(stop?.name).trim().toLowerCase() !== 'parada' ? stop.name : '';
    const technicianStopName = getTechnicianStopName(stop, eq, node);
    const cleanStopTitle = isTechnicianPlanView()
        ? technicianStopName
        : (validNodeName || validEqName || validStopName || (stop?.type === 'equipment' ? 'Torre o antena' : (stop?.type === 'node' ? 'Pueblo' : 'Parada')));
    const antennaLocationUrl = eq && !isNaN(safeFloat(eq.lat)) && !isNaN(safeFloat(eq.lng)) ? `https://www.google.com/maps?q=${safeFloat(eq.lat)},${safeFloat(eq.lng)}` : '';
    const puebloNavUrl = (lat && lng) ? `https://www.google.com/maps?q=${lat},${lng}` : '';
    const towerAnt = (eq && !stop.nodeId) ? eq : null;
    const hasTowerMat = towerAnt ? !!(towerAnt.towerSections || towerAnt.towerRadios || towerAnt.towerBatteries || towerAnt.towerPanels || towerAnt.towerExtraNotes || towerAnt.towerMaterialNotes || (Array.isArray(towerAnt.towerMaterialPhotos) && towerAnt.towerMaterialPhotos.length)) : false;
    const towerHeaderBtn = towerAnt ? `<button type="button" class="btn bsm btn-tower-callout btn-tower-header ${hasTowerMat ? 'is-registered' : 'is-pending'}" onclick="event.stopPropagation(); openTowerMaterialModal(\'${escapeAttr(towerAnt.id)}\')" title="Torre ${escapeAttr(towerAnt.name)}"><span class="tower-btn-label">Torre</span><span class="tower-btn-tag">${hasTowerMat ? '✓' : 'Registrar'}</span></button>` : '';

    const canRegisterAsNodeBtn = (!node && !eq && canManagePlanStops())
        ? `<button type="button" class="btn-register-pueblo-chip" onclick="event.stopPropagation(); openRegisterStopAsNodeModal('${escapeAttr(stop.id)}')" title="Registrar este sitio como nuevo pueblo en el catálogo">+ Pueblo</button>`
        : '';

    const removeBtnHtml = canManagePlanStops()
        ? `<button type="button" class="btn-stop-remove-action" title="Eliminar parada de la ruta" aria-label="Eliminar ${escapeAttr(cleanStopTitle)} de la ruta" onclick="event.stopPropagation(); deleteStop('${escapeAttr(day)}', '${escapeAttr(stop.id)}')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg></button>`
        : '';

    return `
        <div class="stop-card ${compactStop ? 'plan-stop-compact' : ''} ${stopExpanded ? 'is-expanded' : ''} ${stop.type === 'manual' ? 'manual' : ''} ${doneClass}" data-stop-id="${escapeAttr(stop.id)}" data-stop-day="${escapeAttr(day)}" ondragover="allowPlanStopDrop(event)" ondragleave="clearPlanStopDrop(event)" ondrop="dropPlanStop(event,'${escapeAttr(day)}','${escapeAttr(stop.id)}')">
            <div class="stop-card-heading">
                <div class="stop-heading-copy">
                    <div class="stop-title clickable-stop-title" role="button" tabindex="0" aria-controls="plan-stop-details-${escapeAttr(stop.id)}" aria-expanded="${pendingOpen}" onkeydown="if(event.key === 'Enter' || event.key === ' '){event.preventDefault();this.click()}" title="${escapeAttr(cleanStopTitle)}" onclick="togglePlanStopDetails('${escapeAttr(stop.id)}')">
                        <span class="stop-title-text">${escapeHtml(cleanStopTitle)}</span>
                        <span class="tech-stop-weather-chip" id="tech-stop-weather-${escapeAttr(stop.id)}"></span>
                        ${towerHeaderBtn}
                    </div>
                    <div class="stop-meta">
                        ${isTechnicianPlanView() ? (stop.type === 'equipment' ? 'Antena' : 'Pueblo') : (stop.type === 'manual' ? 'Comunidad / punto manual' : (stop.type === 'node' ? 'Nodo vinculado' : 'Antena registrada'))}${lat && lng ? ` · ${lat}, ${lng}` : ''}
                        ${canRegisterAsNodeBtn}
                    </div>
                </div>
                <div class="stop-card-head-actions">
                    ${removeBtnHtml}
                    ${isPlanReadOnly() ? '' : `<span class="stop-drag-handle" draggable="true" role="button" tabindex="0" title="Arrastra para cambiar el orden" aria-label="Arrastra para cambiar el orden" ondragstart="startPlanStopDrag(event,'${escapeAttr(day)}','${escapeAttr(stop.id)}')" ondragend="endPlanStopDrag()">&#8942;</span>`}
                </div>
            </div>
            ${isTechnicianPlanView() && (puebloNavUrl || antennaLocationUrl) ? `
                <div class="tech-stop-actions-row">
                    <a class="tech-nav-direction-btn" href="${escapeAttr(antennaLocationUrl || puebloNavUrl)}" target="_blank" rel="noopener" onclick="event.stopPropagation()"><svg class="tech-btn-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg> Navegar</a>
                </div>` : ''}
            <div class="stop-state-row">
                <span class="badge ${adminStatus.cls}">${adminStatus.text}</span>
                <span class="badge bty">${isTechnicianPlanView() ? `${progress.done}/${progress.total} listos` : `${progress.done}/${progress.total} detalles hechos`}</span>
            </div>
            <!-- El bloque superior de stop-detail-switches se omite para evitar duplicar pendientes y completados con el bloque inferior -->
            ${isPlanReadOnly() ? (!isTechnicianPlanView() && stop.scheduledDate ? `<div class="plan-stop-date">Programada: <strong>${escapeHtml(formatCalendarDate(stop.scheduledDate))}</strong></div>` : '') : `<label class="plan-stop-date-editor"><span>Día asignado<strong>${escapeHtml(formatCalendarDate(stop.scheduledDate))}</strong></span><input type="date" value="${escapeAttr(stop.scheduledDate || '')}" onchange="assignStopCalendarDate('${escapeAttr(stop.id)}',this.value)"></label>`}
            ${!isTechnicianPlanView() && history ? `<div class="stop-history-insight"><strong>${history.count} incidencias resueltas</strong><span>Ultima: ${escapeHtml(history.lastDate)}</span></div>` : ''}
            ${(stop.startedAt || stop.adminReleasedAt) ? `
                <div class="stop-timeline">
                    ${stop.startedAt ? `<span>Inicio tecnico: <strong>${formatPlanDateTime(stop.startedAt)}</strong></span>` : ''}
                    ${stop.adminReleasedAt ? `<span>Salida admin: <strong>${formatPlanDateTime(stop.adminReleasedAt)}</strong></span>` : ''}
                </div>` : ''}
            ${materialText ? `<div class="plan-material-chip">Material: ${escapeHtml(materialText)}</div>` : ''}
            ${visibleNotes ? `<div class="stop-notes">${escapeHtml(visibleNotes)}</div>` : ''}
            <div class="stop-details plan-stop-details-panel" id="plan-stop-details-${escapeAttr(stop.id)}" style="display:${pendingOpen ? 'flex' : 'none'}">${renderPlanDetailsGrouped(details, stop, day, 'pending')}</div>
            ${isTechnicianPlanView() && resolved.length ? `<div class="stop-details plan-stop-details-panel completed-only" id="plan-stop-completed-${escapeAttr(stop.id)}" style="display:${expandedCompletedStopId === stop.id ? 'flex' : 'none'}">${renderPlanDetailsGrouped(resolved, stop, day, 'completed')}</div>` : ''}
            ${!isTechnicianPlanView() && resolved.length ? `<div class="stop-resolved-panel" id="plan-stop-resolved-${escapeAttr(stop.id)}" ${resolvedOpen ? '' : 'hidden'}>${resolved.map(detail => renderPlanDetailRow(detail, stop, day, true)).join('')}</div>` : ''}
            <div class="stop-actions">
                ${isTechnicianPlanView() ? `
                <button type="button" class="btn bsm bgh stop-action-pending" title="${pendingOpen ? 'Ocultar' : `Pendientes (${pendingDetails.length})`}" aria-label="${pendingOpen ? 'Ocultar' : `Pendientes (${pendingDetails.length})`}" aria-controls="plan-stop-details-${escapeAttr(stop.id)}" aria-expanded="${pendingOpen ? 'true' : 'false'}" data-pending-count="${pendingDetails.length}" onclick="togglePlanStopDetails('${escapeAttr(stop.id)}')">${pendingOpen ? 'Ocultar' : `Pendientes (${pendingDetails.length})`}</button>
                ${resolved.length ? `<button type="button" class="btn bsm plan-resolved-toggle stop-action-completed ${expandedCompletedStopId === stop.id ? 'active' : ''}" title="${expandedCompletedStopId === stop.id ? 'Ocultar' : `Completados (${resolved.length})`}" aria-label="${expandedCompletedStopId === stop.id ? 'Ocultar' : `Completados (${resolved.length})`}" aria-controls="plan-stop-completed-${escapeAttr(stop.id)}" aria-expanded="${expandedCompletedStopId === stop.id ? 'true' : 'false'}" data-completed-count="${resolved.length}" onclick="toggleTechnicianCompleted('${escapeAttr(stop.id)}')">${expandedCompletedStopId === stop.id ? 'Ocultar' : `Completados (${resolved.length})`}</button>` : `<button type="button" class="btn bsm plan-resolved-toggle stop-action-completed" title="0 completados" aria-label="0 completados" disabled data-completed-count="0">0 completados</button>`}
                ` : `
                <button type="button" class="btn bsm bgh stop-action-pending" title="${pendingOpen ? 'Ocultar detalles pendientes' : `Ver detalles pendientes (${pendingDetails.length})`}" aria-label="${pendingOpen ? 'Ocultar pendientes' : `Pendientes (${pendingDetails.length})`}" aria-controls="plan-stop-details-${escapeAttr(stop.id)}" aria-expanded="${pendingOpen ? 'true' : 'false'}" data-pending-count="${pendingDetails.length}" onclick="togglePlanStopDetails('${escapeAttr(stop.id)}')"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>${pendingOpen ? 'Ocultar' : 'Pendientes'}</span><span class="stop-action-count">${pendingDetails.length}</span></button>
                ${resolved.length ? `<button type="button" class="btn bsm plan-resolved-toggle stop-action-completed ${resolvedOpen ? 'active' : ''}" title="${resolvedOpen ? 'Ocultar detalles completados' : `Ver detalles completados (${resolved.length})`}" aria-label="${resolvedOpen ? 'Ocultar completados' : `Completados (${resolved.length})`}" aria-controls="plan-stop-resolved-${escapeAttr(stop.id)}" aria-expanded="${resolvedOpen ? 'true' : 'false'}" data-completed-count="${resolved.length}" onclick="toggleResolvedStop('${escapeAttr(stop.id)}')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>${resolvedOpen ? 'Ocultar' : 'Completados'}</span><span class="stop-action-count">${resolved.length}</span></button>` : `<button type="button" class="btn bsm plan-resolved-toggle stop-action-completed" title="0 detalles completados" aria-label="0 completados" disabled data-completed-count="0"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>Completados</span><span class="stop-action-count">0</span></button>`}
                ${canManagePlanStops() ? `<button class="btn bsm stop-action-delete" title="Eliminar parada" aria-label="Eliminar parada" onclick="deleteStop('${day}','${stop.id}')">${stopActionIcon('delete')}</button>` : ''}
                `}
            </div>
        </div>`;
}

let draggedPlanStop = null;

function startPlanStopDrag(event, day, stopId) {
    if (isPlanReadOnly()) return event.preventDefault();
    draggedPlanStop = { day, stopId };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', stopId);
    event.currentTarget.closest('.stop-card')?.classList.add('dragging');
}

function allowPlanStopDrop(event) {
    if (!draggedPlanStop) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const card = event.currentTarget;
    card.classList.remove('drop-before', 'drop-after');
    card.classList.add(event.clientY > card.getBoundingClientRect().top + card.offsetHeight / 2 ? 'drop-after' : 'drop-before');
}

function clearPlanStopDrop(event) {
    event.currentTarget.classList.remove('drop-before', 'drop-after');
}

function endPlanStopDrag() {
    document.querySelectorAll('.stop-card.dragging,.stop-card.drop-before,.stop-card.drop-after').forEach(card => card.classList.remove('dragging', 'drop-before', 'drop-after'));
    draggedPlanStop = null;
}

async function dropPlanStop(event, day, targetId) {
    event.preventDefault();
    const drag = draggedPlanStop;
    const targetCard = event.currentTarget;
    const insertAfter = targetCard.classList.contains('drop-after');
    endPlanStopDrag();
    if (!drag || drag.day !== day || drag.stopId === targetId) return;
    const ref = getPlanStopsRef(selectedTechId, day);
    const sourceIndex = ref.findIndex(item => item.id === drag.stopId);
    const originalTargetIndex = ref.findIndex(item => item.id === targetId);
    if (sourceIndex < 0 || originalTargetIndex < 0) return;
    const source = ref[sourceIndex];
    const target = ref[originalTargetIndex];
    if ((source.scheduledDate || '') !== (target.scheduledDate || '')) {
        return notify('Para cambiar de dia usa el selector de fecha de la parada.', 'warn');
    }
    const snapshot = ref.slice();
    ref.splice(sourceIndex, 1);
    const targetIndex = ref.findIndex(item => item.id === targetId);
    ref.splice(targetIndex + (insertAfter ? 1 : 0), 0, source);
    const saved = await saveDB();
    if (!saved) {
        ref.splice(0, ref.length, ...snapshot);
        notify('No se pudo guardar el nuevo orden. No se aplicaron cambios.', 'err');
    }
    renderPlan();
}

function getTechnicianStopName(stop, equipment, node) {
    const isCorrupt = name => !name || /^Ver\s+(detalles|pendientes|completados)/i.test(String(name).trim());
    const validEq = equipment && !isCorrupt(equipment.name) ? equipment.name : '';
    const validNode = node && !isCorrupt(node.town || node.name) ? (node.town || node.name) : '';
    const validStopName = !isCorrupt(stop?.name) ? stop.name : '';
    if (equipment || stop?.type === 'equipment' || stop?.equipmentId) {
        return validEq || validStopName || 'Antena';
    }
    if (node || stop?.type === 'node' || stop?.nodeId) {
        const raw = validNode || stop?.town || validStopName || 'Pueblo';
        const clean = String(raw).replace(/^\s*R\s*\d+\s*[·:._-]*\s*/i, '').trim() || String(raw).trim();
        return clean || 'Pueblo';
    }
    return validStopName || 'Parada';
}

function toggleResolvedStop(stopId) {
    const closing = expandedResolvedStops.has(stopId);
    expandedResolvedStops.clear();
    expandedPendingStopId = '';
    if (!closing) expandedResolvedStops.add(stopId);
    renderPlanDays();
}

function togglePlanStopDetails(stopId) {
    if (isTechnicianPlanView()) {
        if (collapsedTechnicianStopIds.has(stopId)) {
            collapsedTechnicianStopIds.delete(stopId);
        } else {
            collapsedTechnicianStopIds.add(stopId);
        }
        renderPlanDays();
        return;
    }
    expandedPendingStopId = expandedPendingStopId === stopId ? '' : stopId;
    expandedCompletedStopId = '';
    expandedResolvedStops.clear();
    renderPlanDays();
}

function toggleTechnicianCompleted(stopId) {
    const panelId = `plan-stop-completed-${stopId}`;
    const panel = document.getElementById(panelId);
    const pendingPanel = document.getElementById(`plan-stop-details-${stopId}`);
    const stopCard = document.querySelector(`.stop-card[data-stop-id="${stopId}"]`);
    const pendingButton = stopCard?.querySelector('.stop-action-pending');
    const button = stopCard?.querySelector('.stop-action-completed');
    const opening = expandedCompletedStopId !== stopId || panel?.style.display === 'none';
    document.querySelectorAll('.plan-stop-details-panel.completed-only').forEach(item => { item.style.display = 'none'; });
    document.querySelectorAll('.stop-actions .stop-action-completed').forEach(item => {
        item.classList.remove('active');
        item.setAttribute('aria-expanded', 'false');
        if (Number(item.dataset.completedCount || '0') > 0) {
            item.textContent = `Ver completados (${item.dataset.completedCount || '0'})`;
        }
    });
    expandedCompletedStopId = opening ? stopId : '';
    expandedPendingStopId = '';
    expandedResolvedStops.clear();
    if (pendingPanel) pendingPanel.style.display = 'none';
    if (pendingButton) {
        pendingButton.setAttribute('aria-expanded', 'false');
        pendingButton.textContent = `Ver pendientes (${pendingButton.dataset.pendingCount || '0'})`;
    }
    if (panel) panel.style.display = opening ? 'flex' : 'none';
    if (button) {
        button.classList.toggle('active', opening);
        button.setAttribute('aria-expanded', opening ? 'true' : 'false');
        button.textContent = opening ? 'Ocultar' : `Ver completados (${button.dataset.completedCount || '0'})`;
    }
}

function renderEquipmentDatalist() {
    const list = document.getElementById('equipment-list');
    if (!list) return;
    list.innerHTML = (state.equipment || []).map(eq => `<option value="${escapeAttr(eq.name)}">${escapeAttr(eq.ip || '')}</option>`).join('');
}

function renderMaterialDatalist() {
    const list = document.getElementById('material-list');
    if (!list) return;
    const names = new Set();
    (state.materials || []).forEach(m => {
        const name = m.name || m.nombre || m.title || m.descripcion || '';
        if (name) names.add(name);
    });
    (state.workOrders || []).forEach(w => {
        const mat = w.materialPlanned || w.materialUsed || w.technicianReport?.materialUsed || '';
        if (mat) String(mat).split(/[,\n]/).map(x => x.trim()).filter(Boolean).forEach(x => names.add(x));
    });
    list.innerHTML = Array.from(names).slice(0, 80).map(name => `<option value="${escapeAttr(name)}"></option>`).join('');
}

function getCurrentPlanMaterialContainer() {
    if (selectedTechId === SHARED_PLAN_ID && selectedDay === 'general') return getSelectedGeneralPlan() || {};
    ensureTechPlan(selectedTechId);
    return state.weekPlan[selectedTechId] || {};
}

function renderPlanMaterialSummary() {
    const input = document.getElementById('plan-material-summary');
    const preview = document.getElementById('plan-material-preview');
    const container = getCurrentPlanMaterialContainer();
    const material = container.materialSummary || '';
    if (input && input.dataset.dirty !== '1') {
        input.value = material;
        input.dataset.dirty = '0';
    }
    if (preview) {
        preview.innerHTML = material
            ? `<strong>Material capturado:</strong><br>${escapeHtml(material).replace(/\n/g, '<br>')}`
            : 'Sin material capturado.';
    }
}

function openPlanMaterialModal() {
    const input = document.getElementById('plan-material-summary');
    const sub = document.getElementById('plan-material-modal-sub');
    const container = getCurrentPlanMaterialContainer();
    if (input) {
        input.value = container.materialSummary || '';
        input.dataset.dirty = '0';
    }
    if (sub) {
        const plan = getSelectedGeneralPlan();
        const assignee = getGeneralPlanAssignedTech(plan);
        sub.textContent = selectedTechId === SHARED_PLAN_ID
            ? `${plan?.name || 'Plan general'}${assignee ? ` · Asignado a ${assignee.nombre}` : ' · Sin técnico asignado'}`
            : `${getSelectedTech()?.nombre || 'Técnico'} · Material del plan`;
    }
    OM('plan-material-mo');
    setTimeout(() => input?.focus(), 80);
}

function markPlanMaterialDirty() {
    const input = document.getElementById('plan-material-summary');
    if (input) input.dataset.dirty = '1';
}

async function savePlanMaterialSummary() {
    const input = document.getElementById('plan-material-summary');
    if (!input) return;
    const container = getCurrentPlanMaterialContainer();
    container.materialSummary = input.value.trim();
    input.dataset.dirty = '0';
    renderPlanMaterialSummary();
    await saveDB();
    CM('plan-material-mo');
    notify('Material del plan guardado');
}

function getGeneralPlanAssignedTech(plan = getSelectedGeneralPlan()) {
    if (!plan) return null;
    const techId = plan.assignedTechId || (Array.isArray(plan.assignedTechIds) && plan.assignedTechIds[0]);
    if (!techId) return null;
    return (state.technicians || []).find(t => t.id === techId && !t.deletedAt) || null;
}

function getGeneralPlanAssignedTechs(plan = getSelectedGeneralPlan()) {
    if (!plan) return [];
    const ids = [...new Set([plan.assignedTechId, ...(Array.isArray(plan.assignedTechIds) ? plan.assignedTechIds : [])].filter(Boolean).map(String))];
    return (state.technicians || []).filter(t => !t.deletedAt && (ids.includes(String(t.id)) || (t.userId && ids.includes(String(t.userId)))));
}

function getGeneralPlanAssignedToTech(techId, ignorePlanId = '') {
    if (!techId) return null;
    return getGeneralPlans().find(plan =>
        !plan.deletedAt &&
        plan.id !== ignorePlanId &&
        isPlanAssignedToTech(plan, techId)
    ) || null;
}

function getPlanRawAssignedTechIds(plan = getSelectedGeneralPlan()) {
    if (!plan) return [];
    const baseList = Array.isArray(plan.assignedTechIds)
        ? [...plan.assignedTechIds, ...(plan.assignedTechIds.length === 0 && !plan.explicitlyUnassigned && plan.assignedTechId ? [plan.assignedTechId] : [])]
        : [plan.assignedTechId];
    const seen = new Set();
    const out = [];
    baseList.filter(Boolean).map(String).forEach(rawId => {
        const tech = (state.technicians || []).find(t => !t.deletedAt && (String(t.id) === rawId || (t.userId && String(t.userId) === rawId)));
        const canonId = tech?.id ? String(tech.id) : rawId;
        if (canonId && !seen.has(canonId)) {
            seen.add(canonId);
            out.push(canonId);
        }
    });
    return out;
}

function syncPlanAssignedMetadata(plan, selectedIds) {
    if (!plan) return;
    const rawIds = [...new Set((Array.isArray(selectedIds) ? selectedIds : []).filter(Boolean).map(String))];
    const resolvedTechs = [];
    const canonicalIds = [];
    const seen = new Set();
    rawIds.forEach(rawId => {
        const tech = (state.technicians || []).find(t => !t.deletedAt && (String(t.id) === rawId || (t.userId && String(t.userId) === rawId)));
        const canonId = tech?.id ? String(tech.id) : rawId;
        if (canonId && !seen.has(canonId)) {
            seen.add(canonId);
            canonicalIds.push(canonId);
            if (tech) resolvedTechs.push(tech);
        }
    });
    const nowIso = new Date().toISOString();
    plan.assignedTechIds = canonicalIds;
    plan.assignedTechId = canonicalIds[0] || '';
    plan.assignedTechName = resolvedTechs.map(t => t.nombre || t.usuario).filter(Boolean).join(', ');
    plan.assignedAt = canonicalIds.length ? nowIso : '';
    plan.explicitlyUnassigned = canonicalIds.length === 0;
    plan.updatedAt = nowIso;
}

function unassignTechFromOtherPlans(techId, keepInPlanId = '') {
    if (!techId) return false;
    const targetTechId = String(techId);
    const techObj = (state.technicians || []).find(t => String(t.id) === targetTechId || (t.userId && String(t.userId) === targetTechId));
    const targetIds = new Set([targetTechId]);
    if (techObj?.id) targetIds.add(String(techObj.id));
    if (techObj?.userId) targetIds.add(String(techObj.userId));

    const allPlans = getGeneralPlans();
    let anyChanged = false;
    allPlans.forEach(otherPlan => {
        if (!otherPlan || otherPlan.deletedAt || (keepInPlanId && String(otherPlan.id) === String(keepInPlanId))) return;
        const otherTechs = getPlanRawAssignedTechIds(otherPlan);

        const filtered = otherTechs.filter(id => !targetIds.has(id));
        if (filtered.length !== otherTechs.length) {
            syncPlanAssignedMetadata(otherPlan, filtered);
            anyChanged = true;
        }
    });
    return anyChanged;
}

function enforceSinglePlanPerTechInvariant() {
    const plans = getGeneralPlans();
    if (!Array.isArray(plans) || !plans.length) return false;
    const claimedTechs = new Map();
    let anyChanged = false;

    plans.forEach(plan => {
        if (!plan || plan.deletedAt) return;
        const currentIds = [...new Set([
            plan.assignedTechId,
            ...(Array.isArray(plan.assignedTechIds) ? plan.assignedTechIds : [])
        ].filter(Boolean).map(String))];

        const validIds = [];
        for (const tid of currentIds) {
            const tObj = (state.technicians || []).find(t => String(t.id) === tid || (t.userId && String(t.userId) === tid));
            const idKey = tObj?.id ? String(tObj.id) : tid;
            const userKey = tObj?.userId ? String(tObj.userId) : null;

            if (claimedTechs.has(idKey) || (userKey && claimedTechs.has(userKey))) {
                anyChanged = true;
                continue;
            }
            claimedTechs.set(idKey, plan.id);
            if (userKey) claimedTechs.set(userKey, plan.id);
            validIds.push(tid);
        }

        if (validIds.length !== currentIds.length || plan.assignedTechId !== (validIds[0] || '')) {
            syncPlanAssignedMetadata(plan, validIds);
            anyChanged = true;
        }
    });
    return anyChanged;
}

function renderGeneralPlanAssigneeSelect() {
    const sel = document.getElementById('general-plan-assignee');
    const badgesContainer = document.getElementById('general-plan-team-badges');
    const plan = getSelectedGeneralPlan();
    const assignedTechs = getGeneralPlanAssignedTechs(plan);
    const assignedIdsSet = new Set(assignedTechs.map(t => String(t.id)));
    const currentAssigned = assignedTechs[0]?.id || plan?.assignedTechId || '';
    const techs = (state.technicians || []).filter(t => !t.deletedAt && t.estado !== 'inactivo');

    if (sel) {
        const options = [];
        if (assignedTechs.length === 0) {
            options.push('<option value="" selected>👤 Sin técnico asignado (elegir para asignar)</option>');
        } else if (assignedTechs.length === 1) {
            options.push('<option value="__unassign__" class="opt-unassign" style="color:#b91c1c;background:#fff1f2;font-weight:800;">✕ Quitar técnico asignado</option>');
        } else {
            options.push(`<option value="__team__" selected>👥 Equipo asignado (${assignedTechs.length} técnicos)</option>`);
            options.push('<option value="__unassign__" class="opt-unassign" style="color:#b91c1c;background:#fff1f2;font-weight:800;">✕ Desasignar todos los técnicos</option>');
        }

        options.push(...techs.map(t => {
            const inTeam = assignedIdsSet.has(String(t.id));
            const otherPlan = getGeneralPlanAssignedToTech(t.id, plan?.id || '');
            const marker = inTeam
                ? '  ✓ (Asignado a este plan)'
                : (otherPlan ? `  ⚠️ (en "${otherPlan.name || 'otro plan'}")` : '');
            const isSel = assignedTechs.length === 1 && String(t.id) === String(currentAssigned);
            return `<option value="${escapeAttr(t.id)}" ${isSel ? 'selected' : ''}>👤 ${escapeHtml(t.nombre || t.usuario || 'Técnico')}${escapeHtml(marker)}</option>`;
        }));
        options.push('<option value="__team__">👥 Asignar varios técnicos...</option>');
        sel.innerHTML = options.join('');

        if (assignedTechs.length > 1) {
            sel.value = '__team__';
        } else if (assignedTechs.length === 1) {
            sel.value = String(assignedTechs[0].id);
        } else {
            sel.value = '';
        }
    }

    if (badgesContainer) {
        if (assignedTechs.length > 0) {
            badgesContainer.innerHTML = assignedTechs.map(t => `
                <span class="plan-team-badge" title="Técnico asignado a este plan">
                    <span>${escapeHtml(t.nombre || t.usuario)}</span>
                    <button type="button" class="plan-team-badge-remove" onclick="unassignTechFromCurrentPlan('${escapeAttr(t.id)}')" title="Quitar del plan">&times;</button>
                </span>
            `).join('');
        } else {
            badgesContainer.innerHTML = '';
        }
    }

    // Actualizar tarjeta resumen en la barra lateral
    const summaryCard = document.getElementById('plan-selected-summary-card');
    if (summaryCard) {
        if (plan) {
            const stopCount = (plan.stops || []).length;
            const techHtml = assignedTechs.length
                ? `<div class="plan-summary-crew-chips">${assignedTechs.map(t => `<span class="plan-sidebar-tech-badge"><span>●</span><strong>${escapeHtml(t.nombre || t.usuario)}</strong></span>`).join('')}</div>`
                : `<span class="plan-sidebar-tech-badge unassigned"><span>!</span><strong>Sin técnico asignado</strong></span>`;
            summaryCard.innerHTML = `
                <div class="plan-summary-top-meta">
                    <span class="plan-summary-status-pill">Ruta activa</span>
                    <span class="plan-summary-stops-counter">${stopCount} parada${stopCount === 1 ? '' : 's'}</span>
                </div>
                <strong class="plan-summary-title-text" title="${escapeAttr(plan.name)}">${escapeHtml(plan.name)}</strong>
                <div class="plan-summary-crew-row">
                    <span class="plan-summary-crew-tag-label">Equipo asignado (${assignedTechs.length}):</span>
                    ${techHtml}
                </div>
            `;
            summaryCard.style.display = 'block';
        } else {
            summaryCard.style.display = 'none';
        }
    }

    const hintId = 'general-plan-assignee-hint';
    let hint = document.getElementById(hintId);
    if (hint) {
        hint.textContent = assignedTechs.length > 0
            ? `Asignado a: ${assignedTechs.map(t => t.nombre || t.usuario).join(', ')}.`
            : 'Elige un técnico arriba para asignarlo a este plan.';
    }

    if (typeof renderPlanTeamManagementView === 'function') renderPlanTeamManagementView();
    if (typeof renderTechPlanSearchList === 'function') renderTechPlanSearchList();
    if (typeof renderPlanCatalogManagementView === 'function') renderPlanCatalogManagementView();
}

function renderTechPlanSearchList() {
    const listEl = document.getElementById('tech-plan-search-results');
    const inputEl = document.getElementById('tech-plan-search-input');
    const clearBtn = document.getElementById('tech-plan-search-clear');
    const countEl = document.getElementById('tech-assignment-count');
    if (!listEl) return;

    const query = (inputEl?.value || '').trim().toLowerCase();
    if (clearBtn) {
        clearBtn.style.display = query ? 'block' : 'none';
    }

    const currentPlan = getSelectedGeneralPlan();
    const currentPlanId = currentPlan?.id || '';
    const allTechs = (state.technicians || []).filter(t => !t.deletedAt && t.estado !== 'inactivo');

    let assignedCount = 0;
    const techDataList = allTechs.map(t => {
        const assignedPlan = getGeneralPlanAssignedToTech(t.id);
        if (assignedPlan) assignedCount++;
        const name = (t.nombre || t.usuario || 'Técnico').trim();
        const role = (t.rol || t.telefono || 'Técnico de campo').trim();
        const initials = name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'T';
        return {
            tech: t,
            name,
            role,
            initials,
            assignedPlan
        };
    });

    if (countEl) {
        countEl.textContent = `${assignedCount}/${allTechs.length}`;
    }

    const filtered = techDataList.filter(item => {
        if (!query) return true;
        const matchName = item.name.toLowerCase().includes(query);
        const matchRole = item.role.toLowerCase().includes(query);
        const matchPlan = item.assignedPlan ? (item.assignedPlan.name || '').toLowerCase().includes(query) : false;
        return matchName || matchRole || matchPlan;
    });

    if (!filtered.length) {
        listEl.innerHTML = query
            ? `<div class="tech-plan-search-empty">Sin resultados para "${escapeHtml(query)}"</div>`
            : '<div class="tech-plan-search-empty">No hay técnicos registrados</div>';
        return;
    }

    listEl.innerHTML = filtered.map(item => {
        const { tech, name, role, initials, assignedPlan } = item;
        const isCurrentPlan = assignedPlan && String(assignedPlan.id) === String(currentPlanId);
        const isJumpable = !!assignedPlan && !isCurrentPlan;
        const canQuickAssign = !assignedPlan && canAssignPlanTechnicians() && Boolean(currentPlanId);

        let statusHtml = '';
        if (isCurrentPlan) {
            statusHtml = `
                <span class="tech-plan-badge-current" title="Mostrando la ruta asignada de este técnico">
                    ✓ Ruta activa
                </span>
            `;
        } else if (isJumpable) {
            statusHtml = `
                <span class="tech-route-open-pill" title="Clic para desplegar la ruta asignada de ${escapeAttr(name)}">Ver ruta →</span>
            `;
        } else if (canQuickAssign) {
            statusHtml = `
                <button type="button" class="btn-team-add" onclick="event.stopPropagation(); assignTechToCurrentPlan('${escapeAttr(tech.id)}')" title="Asignar a la ruta actual">+ Asignar</button>
            `;
        } else {
            statusHtml = `
                <span class="tech-plan-badge-unassigned" title="Técnico sin ruta asignada">Sin ruta</span>
            `;
        }

        const clickAttr = assignedPlan
            ? `onclick="jumpToGeneralPlan('${escapeAttr(assignedPlan.id)}')" style="cursor:pointer;" title="Clic para desplegar la ruta “${escapeAttr(assignedPlan.name)}”"`
            : '';

        return `
            <div class="tech-plan-search-item ${isCurrentPlan ? 'is-current-plan' : ''} ${isJumpable ? 'is-jumpable' : ''}" ${clickAttr}>
                <div class="tech-plan-item-left">
                    <span class="tech-avatar-mini-circle">${escapeHtml(initials)}</span>
                    <div class="tech-plan-name-wrap">
                        <strong class="${assignedPlan ? 'tech-name-clickable' : ''}" title="${assignedPlan ? `Desplegar ruta “${escapeAttr(assignedPlan.name)}”` : escapeAttr(name)}">${escapeHtml(name)}</strong>
                        <small title="${assignedPlan ? `Ruta: ${escapeAttr(assignedPlan.name)}` : escapeAttr(role)}">${assignedPlan ? `<span class="tech-plan-assigned-tag">Ruta: <b>${escapeHtml(assignedPlan.name)}</b></span>` : escapeHtml(role)}</small>
                    </div>
                </div>
                ${statusHtml ? `
                <div class="tech-plan-item-right">
                    ${statusHtml}
                </div>` : ''}
            </div>
        `;
    }).join('');
}
window.renderTechPlanSearchList = renderTechPlanSearchList;

function jumpToGeneralPlan(planId) {
    if (!planId) return;
    const plan = getGeneralPlans().find(p => p.id === planId && !p.deletedAt);
    if (!plan) {
        notify('El plan no existe o fue eliminado.', 'err');
        return;
    }
    selectGeneralPlan(planId);
    notify(`Plan abierto: ${plan.name}`);
    const sel = document.getElementById('general-plan-select');
    if (sel) {
        sel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}
window.jumpToGeneralPlan = jumpToGeneralPlan;

function clearTechPlanSearch() {
    const input = document.getElementById('tech-plan-search-input');
    if (input) {
        input.value = '';
        input.focus();
    }
    renderTechPlanSearchList();
}
window.clearTechPlanSearch = clearTechPlanSearch;

function openTeamAssignmentModal() {
    const plan = getSelectedGeneralPlan();
    if (!plan) {
        notify('Selecciona o crea un plan primero.', 'err');
        return;
    }
    const currentTechIds = new Set([plan.assignedTechId, ...(Array.isArray(plan.assignedTechIds) ? plan.assignedTechIds : [])].filter(Boolean));
    const listEl = document.getElementById('plan-team-tech-list');
    const techs = (state.technicians || []).filter(t => !t.deletedAt && t.estado !== 'inactivo');
    if (!listEl) return;
    if (!techs.length) {
        listEl.innerHTML = '<div style="padding:10px;color:#64758e;font-size:12px;">No hay técnicos activos registrados.</div>';
    } else {
        listEl.innerHTML = techs.map(t => {
            const checked = currentTechIds.has(t.id) ? 'checked' : '';
            const initials = (t.nombre || t.usuario || 'T').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            const otherPlan = getGeneralPlanAssignedToTech(t.id, plan.id);
            const otherPlanTag = otherPlan
                ? `<small style="display:block;color:#b45309;font-size:11px;font-weight:800;margin-top:2px;">Actualmente asignado a: “${escapeHtml(otherPlan.name || 'otro plan')}”</small>`
                : '';
            return `
                <label class="plan-team-tech-option">
                    <input type="checkbox" name="plan-team-member" value="${escapeAttr(t.id)}" ${checked}>
                    <span class="tech-avatar-mini">${escapeHtml(initials)}</span>
                    <span class="tech-info-mini">
                        <strong>${escapeHtml(t.nombre || t.usuario)}</strong>
                        <small>${escapeHtml(t.telefono || t.rol || 'Técnico de campo')}</small>
                        ${otherPlanTag}
                    </span>
                </label>
            `;
        }).join('');
    }
    OM('plan-team-mo');
}

async function confirmTeamAssignment() {
    const plan = getSelectedGeneralPlan();
    if (!plan) return;
    const checkboxes = Array.from(document.querySelectorAll('#plan-team-tech-list input[name="plan-team-member"]:checked'));
    const selectedIds = checkboxes.map(cb => cb.value);

    // Verificar si alguno de los técnicos seleccionados ya tiene otro plan asignado antes de moverlo
    const conflicts = selectedIds
        .map(id => ({
            tech: (state.technicians || []).find(t => t.id === id && !t.deletedAt),
            otherPlan: getGeneralPlanAssignedToTech(id, plan.id)
        }))
        .filter(item => item.otherPlan);

    if (conflicts.length === 1) {
        const { tech, otherPlan } = conflicts[0];
        const confirmed = await requestPlanAssignmentConfirmation({
            plan,
            tech,
            occupiedPlan: otherPlan,
            unassign: false
        });
        if (!confirmed) return;
    } else if (conflicts.length > 1) {
        const detailLines = conflicts
            .map(item => `• ${item.tech?.nombre || item.tech?.usuario || 'Técnico'}: asignado al plan “${item.otherPlan.name || 'otro plan'}”`)
            .join('\n');
        const confirmed = await askConfirmation({
            title: 'Técnicos ya asignados a otro plan',
            message: `Los siguientes técnicos ya tienen otro plan asignado:\n${detailLines}\n\n¿Deseas pasarlos al plan “${plan.name || 'actual'}”?`,
            confirmText: 'Sí, pasarlos a este plan',
            cancelText: 'Cancelar',
            tone: 'ok'
        });
        if (!confirmed) return;
    }

    // Un técnico solo puede pertenecer a un plan: remover de otros planes
    selectedIds.forEach(id => unassignTechFromOtherPlans(id, plan.id));
    syncPlanAssignedMetadata(plan, selectedIds);
    savePlanificarOfflineSnapshot();

    const saved = await saveDB();
    if (!saved) {
        notify('No se pudo guardar la asignación del equipo.', 'err');
        return;
    }
    savePlanificarOfflineSnapshot();
    CM('plan-team-mo');
    renderPlan();
    if (selectedIds.length === 0) {
        notify('Plan sin equipo asignado');
    } else if (selectedIds.length === 1) {
        const t = (state.technicians || []).find(x => String(x.id) === String(selectedIds[0]));
        notify(`Plan asignado a ${t?.nombre || 'técnico'}`);
    } else {
        notify(`Equipo de ${selectedIds.length} técnicos asignado al plan`);
    }
}

async function removeTechFromPlanTeam(techId) {
    const plan = getSelectedGeneralPlan();
    if (!plan || !techId) return;
    const current = new Set([plan.assignedTechId, ...(Array.isArray(plan.assignedTechIds) ? plan.assignedTechIds : [])].filter(Boolean).map(String));
    current.delete(String(techId));
    syncPlanAssignedMetadata(plan, Array.from(current));
    savePlanificarOfflineSnapshot();
    const saved = await saveDB();
    if (!saved) {
        notify('Error al actualizar el equipo del plan.', 'err');
        return;
    }
    savePlanificarOfflineSnapshot();
    renderPlan();
    notify('Técnico removido del equipo del plan');
}

let techAssignPanelSelectedPlanId = '';
let techAssignPanelPlanFilter = '';
let techAssignPanelTechFilter = '';

function openTechAssignPanelModal(planId = '') {
    if (!canAssignPlanTechnicians()) {
        notify('Solo administrador o soporte puede asignar técnicos.', 'err');
        return;
    }
    if (planId) {
        selectGeneralPlan(planId);
    }
    switchPlanAssignTab('team');
    const menuBox = document.getElementById('plan-assign-menu-box');
    if (menuBox && typeof menuBox.scrollIntoView === 'function') {
        menuBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function closeTechAssignPanelModal() {
    CM('plan-tech-assign-panel-mo');
}

function selectTechAssignPanelPlan(planId) {
    techAssignPanelSelectedPlanId = String(planId || '');
    renderTechAssignPanelModal();
}

function updateTechAssignPanelPlanFilter(val) {
    techAssignPanelPlanFilter = String(val || '');
    renderTechAssignPanelModal();
}

function updateTechAssignPanelTechFilter(val) {
    techAssignPanelTechFilter = String(val || '');
    renderTechAssignPanelModal();
}

function openPlanFromAssignPanel(planId) {
    if (!planId) return;
    selectGeneralPlan(planId);
    closeTechAssignPanelModal();
}

async function assignTechInPanel(planId, techId) {
    if (!canAssignPlanTechnicians() || !planId || !techId) return;
    const plan = getGeneralPlans().find(p => !p.deletedAt && String(p.id) === String(planId));
    if (!plan) return;
    const targetTechId = String(techId);
    const targetTech = (state.technicians || []).find(t => !t.deletedAt && (String(t.id) === targetTechId || String(t.userId || '') === targetTechId));
    if (!targetTech) return;
    const canonicalTechId = String(targetTech.id);

    const currentIds = getGeneralPlanAssignedTechs(plan).map(t => String(t.id));
    if (currentIds.includes(canonicalTechId)) {
        notify(`${targetTech.nombre || targetTech.usuario} ya está asignado a ${plan.name}.`);
        return;
    }

    unassignTechFromOtherPlans(canonicalTechId, plan.id);
    syncPlanAssignedMetadata(plan, [...currentIds, canonicalTechId]);
    savePlanificarOfflineSnapshot();
    renderTechAssignPanelModal();
    renderPlan();

    const saved = await saveDB();
    if (!saved) {
        notify('Guardado localmente. Se sincronizará al conectar.', 'warn');
        return;
    }
    savePlanificarOfflineSnapshot();
    renderTechAssignPanelModal();
    renderPlan();
    notify(`${targetTech.nombre || targetTech.usuario} asignado a "${plan.name}" ✓`);
}

async function unassignTechInPanel(planId, techId) {
    if (!canAssignPlanTechnicians() || !planId || !techId) return;
    const plan = getGeneralPlans().find(p => !p.deletedAt && String(p.id) === String(planId));
    if (!plan) return;
    const targetTechId = String(techId);
    const targetTech = (state.technicians || []).find(t => !t.deletedAt && (String(t.id) === targetTechId || String(t.userId || '') === targetTechId));
    const currentIds = getGeneralPlanAssignedTechs(plan).map(t => String(t.id));
    const nextIds = currentIds.filter(id => id !== targetTechId && (!targetTech || id !== String(targetTech.id)));

    syncPlanAssignedMetadata(plan, nextIds);
    savePlanificarOfflineSnapshot();
    renderTechAssignPanelModal();
    renderPlan();

    const saved = await saveDB();
    if (!saved) {
        notify('Guardado localmente. Se sincronizará al conectar.', 'warn');
        return;
    }
    savePlanificarOfflineSnapshot();
    renderTechAssignPanelModal();
    renderPlan();
    notify(`${targetTech?.nombre || targetTech?.usuario || 'Técnico'} quitado de "${plan.name}"`);
}

function renderTechAssignPanelModal() {
    const body = document.getElementById('tech-assign-panel-body');
    if (!body) return;
    const prevPlansScroll = body.querySelector('.tap-col-plans .tap-list')?.scrollTop || 0;
    const prevTechsScroll = body.querySelector('.tap-col-techs .tap-list')?.scrollTop || 0;
    const activeEl = document.activeElement;
    const activeSearchId = (activeEl && body.contains(activeEl) && activeEl.dataset?.tapSearch) ? activeEl.dataset.tapSearch : '';
    const activeSelStart = activeSearchId && typeof activeEl.selectionStart === 'number' ? activeEl.selectionStart : null;
    const activeSelEnd = activeSearchId && typeof activeEl.selectionEnd === 'number' ? activeEl.selectionEnd : null;
    const plans = getGeneralPlans().filter(p => !p.deletedAt);
    const allTechs = (state.technicians || []).filter(t => !t.deletedAt && t.estado !== 'inactivo');

    if (!plans.length) {
        body.innerHTML = '<div class="plan-team-empty-hint" style="padding:20px;text-align:center;">No hay planes creados todavía. Crea un plan primero para asignar técnicos.</div>';
        return;
    }

    let selectedPlan = plans.find(p => String(p.id) === String(techAssignPanelSelectedPlanId)) || getSelectedGeneralPlan() || plans[0];
    techAssignPanelSelectedPlanId = selectedPlan?.id || '';

    const planQuery = techAssignPanelPlanFilter.trim().toLowerCase();
    const filteredPlans = plans.filter(p => {
        if (!planQuery) return true;
        const crew = getGeneralPlanAssignedTechs(p).map(t => t.nombre || t.usuario || '').join(' ').toLowerCase();
        return String(p.name || '').toLowerCase().includes(planQuery) || crew.includes(planQuery);
    });

    const assignedTechs = selectedPlan ? getGeneralPlanAssignedTechs(selectedPlan) : [];
    const assignedSet = new Set(assignedTechs.map(t => String(t.id)));
    const techQuery = techAssignPanelTechFilter.trim().toLowerCase();

    const availableTechs = [];
    const otherPlanTechs = [];
    allTechs.forEach(t => {
        if (assignedSet.has(String(t.id))) return;
        const label = `${t.nombre || ''} ${t.usuario || ''} ${t.rol || ''}`.toLowerCase();
        if (techQuery && !label.includes(techQuery)) return;
        const occupied = selectedPlan ? getGeneralPlanAssignedToTech(t.id, selectedPlan.id) : null;
        if (occupied) otherPlanTechs.push({ tech: t, occupiedPlan: occupied });
        else availableTechs.push(t);
    });

    const filteredAssigned = assignedTechs.filter(t => {
        if (!techQuery) return true;
        return `${t.nombre || ''} ${t.usuario || ''} ${t.rol || ''}`.toLowerCase().includes(techQuery);
    });

    const plansListHtml = filteredPlans.length ? filteredPlans.map(p => {
        const isSel = selectedPlan && String(p.id) === String(selectedPlan.id);
        const crew = getGeneralPlanAssignedTechs(p);
        const stopsCount = (p.stops || []).filter(s => !s.deletedAt).length;
        return `
            <button type="button" class="tap-plan-item ${isSel ? 'is-selected' : ''}" onclick="selectTechAssignPanelPlan('${escapeAttr(p.id)}')">
                <div class="tap-plan-item-top">
                    <strong class="tap-plan-name">${escapeHtml(p.name || 'Plan general')}</strong>
                    <span class="tap-plan-stops">${stopsCount} parada${stopsCount === 1 ? '' : 's'}</span>
                </div>
                <div class="tap-plan-crew">
                    ${crew.length
                        ? crew.map(t => `<span class="tap-crew-chip">${escapeHtml(t.nombre || t.usuario)}</span>`).join('')
                        : '<span class="tap-crew-empty">Sin técnico asignado</span>'}
                </div>
            </button>
        `;
    }).join('') : '<div class="tap-empty">Sin planes que coincidan.</div>';

    const renderTechCard = (t, actionHtml, subtitleExtra = '') => {
        const name = (t.nombre || t.usuario || 'Técnico').trim();
        const initials = name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'T';
        return `
            <div class="tap-tech-row">
                <div class="tap-tech-info">
                    <span class="tap-tech-avatar">${escapeHtml(initials)}</span>
                    <div class="tap-tech-meta">
                        <strong>${escapeHtml(name)}</strong>
                        <small>${escapeHtml(t.usuario ? `@${t.usuario}` : (t.rol || 'Técnico'))}${subtitleExtra}</small>
                    </div>
                </div>
                ${actionHtml}
            </div>
        `;
    };

    const assignedHtml = filteredAssigned.length
        ? filteredAssigned.map(t => renderTechCard(
            t,
            `<button type="button" class="btn-team-unassign" onclick="unassignTechInPanel('${escapeAttr(selectedPlan.id)}','${escapeAttr(t.id)}')">✕ Quitar</button>`
        )).join('')
        : '<div class="tap-empty">Aún no hay técnicos asignados a este plan.</div>';

    const availableHtml = availableTechs.length
        ? availableTechs.map(t => renderTechCard(
            t,
            `<button type="button" class="btn-team-add" onclick="assignTechInPanel('${escapeAttr(selectedPlan.id)}','${escapeAttr(t.id)}')">+ Asignar</button>`
        )).join('')
        : '<div class="tap-empty">No hay técnicos libres disponibles.</div>';

    const otherHtml = otherPlanTechs.length
        ? otherPlanTechs.map(({ tech: t, occupiedPlan }) => renderTechCard(
            t,
            `<button type="button" class="btn-team-transfer" onclick="assignTechInPanel('${escapeAttr(selectedPlan.id)}','${escapeAttr(t.id)}')">Mover aquí</button>`,
            ` · En: ${escapeHtml(occupiedPlan.name || 'otro plan')}`
        )).join('')
        : '';

    body.innerHTML = `
        <div class="tap-grid">
            <div class="tap-col tap-col-plans">
                <div class="tap-col-head">
                    <strong>Planes (${plans.length})</strong>
                    <input type="text" class="tap-search" data-tap-search="plans" placeholder="Filtrar plan o técnico..." value="${escapeAttr(techAssignPanelPlanFilter)}" oninput="updateTechAssignPanelPlanFilter(this.value)">
                </div>
                <div class="tap-list">${plansListHtml}</div>
            </div>
            <div class="tap-col tap-col-techs">
                <div class="tap-col-head">
                    <div class="tap-selected-plan-bar">
                        <div>
                            <small>Plan seleccionado</small>
                            <strong>${escapeHtml(selectedPlan?.name || '')}</strong>
                        </div>
                        <button type="button" class="btn bsm bgh" onclick="openPlanFromAssignPanel('${escapeAttr(selectedPlan?.id || '')}')">Ver en tablero</button>
                    </div>
                    <input type="text" class="tap-search" data-tap-search="techs" placeholder="Buscar técnico..." value="${escapeAttr(techAssignPanelTechFilter)}" oninput="updateTechAssignPanelTechFilter(this.value)">
                </div>
                <div class="tap-list">
                    <div class="tap-section-label">Asignados a este plan (${assignedTechs.length})</div>
                    ${assignedHtml}
                    <div class="tap-section-label" style="margin-top:12px;">Disponibles (${availableTechs.length})</div>
                    ${availableHtml}
                    ${otherHtml ? `<div class="tap-section-label" style="margin-top:12px;">Asignados en otro plan (${otherPlanTechs.length})</div>${otherHtml}` : ''}
                </div>
            </div>
        </div>
    `;

    const nextPlansList = body.querySelector('.tap-col-plans .tap-list');
    const nextTechsList = body.querySelector('.tap-col-techs .tap-list');
    if (nextPlansList) nextPlansList.scrollTop = prevPlansScroll;
    if (nextTechsList) nextTechsList.scrollTop = prevTechsScroll;
    if (activeSearchId) {
        const nextInput = body.querySelector(`[data-tap-search="${activeSearchId}"]`);
        if (nextInput) {
            nextInput.focus();
            if (activeSelStart !== null && activeSelEnd !== null) {
                try { nextInput.setSelectionRange(activeSelStart, activeSelEnd); } catch (_) {}
            }
        }
    }
}

if (typeof window !== 'undefined') {
    window.canAssignPlanTechnicians = canAssignPlanTechnicians;
    window.openTechAssignPanelModal = openTechAssignPanelModal;
    window.closeTechAssignPanelModal = closeTechAssignPanelModal;
    window.selectTechAssignPanelPlan = selectTechAssignPanelPlan;
    window.updateTechAssignPanelPlanFilter = updateTechAssignPanelPlanFilter;
    window.updateTechAssignPanelTechFilter = updateTechAssignPanelTechFilter;
    window.openPlanFromAssignPanel = openPlanFromAssignPanel;
    window.assignTechInPanel = assignTechInPanel;
    window.unassignTechInPanel = unassignTechInPanel;
    window.renderTechAssignPanelModal = renderTechAssignPanelModal;
}

function openDuplicateGeneralPlanModal() {
    const plan = getSelectedGeneralPlan();
    if (!plan) {
        notify('Selecciona o crea un plan general antes de duplicar.', 'err');
        return;
    }
    const nameInput = document.getElementById('plan-duplicate-name');
    const techSelect = document.getElementById('plan-duplicate-tech');
    const subTitle = document.getElementById('plan-duplicate-subtitle');
    if (nameInput) {
        nameInput.value = `${plan.name} (Copia)`;
    }
    if (subTitle) {
        subTitle.textContent = `Copia de "${plan.name}" (${(plan.stops || []).length} paradas) para asignación independiente.`;
    }
    if (techSelect) {
        const techs = (state.technicians || []).filter(t => !t.deletedAt && t.estado !== 'inactivo');
        techSelect.innerHTML = ['<option value="" selected>Sin técnico asignado (asignar después)</option>']
            .concat(techs.map(t => {
                const otherPlan = getGeneralPlanAssignedToTech(t.id, '');
                const label = `${t.nombre || t.usuario || 'Técnico'}${otherPlan ? ` · asignado a "${otherPlan.name || 'otro plan'}"` : ''}`;
                return `<option value="${escapeAttr(t.id)}">${escapeHtml(label)}</option>`;
            }))
            .join('');
    }
    OM('plan-duplicate-mo');
}

async function confirmDuplicateGeneralPlan() {
    const origPlan = getSelectedGeneralPlan();
    if (!origPlan) {
        notify('No se encontró el plan de origen.', 'err');
        return;
    }
    const nameInput = document.getElementById('plan-duplicate-name');
    const techSelect = document.getElementById('plan-duplicate-tech');
    const newName = (nameInput?.value || '').trim() || `${origPlan.name} (Copia)`;
    const targetTechId = techSelect?.value || '';
    const targetTech = targetTechId ? (state.technicians || []).find(t => t.id === targetTechId && !t.deletedAt) : null;
    const occupiedPlan = targetTechId ? getGeneralPlanAssignedToTech(targetTechId, '') : null;

    if (occupiedPlan) {
        const confirmed = await requestPlanAssignmentConfirmation({
            plan: { name: newName },
            tech: targetTech,
            occupiedPlan,
            unassign: false
        });
        if (!confirmed) return;
    }

    if (targetTechId) {
        const allGeneralPlans = getGeneralPlans();
        allGeneralPlans.forEach(otherPlan => {
            if (!otherPlan || otherPlan.deletedAt) return;
            const otherTechs = Array.isArray(otherPlan.assignedTechIds)
                ? [...otherPlan.assignedTechIds]
                : (otherPlan.assignedTechId ? [otherPlan.assignedTechId] : []);
            if (otherTechs.includes(targetTechId) || otherPlan.assignedTechId === targetTechId) {
                const filtered = otherTechs.filter(id => id !== targetTechId);
                otherPlan.assignedTechIds = filtered;
                otherPlan.assignedTechId = filtered[0] || '';
                if (!filtered.length) {
                    otherPlan.assignedAt = '';
                }
                otherPlan.updatedAt = new Date().toISOString();
            }
        });
    }

    // Create deep clone of stops with fresh unique IDs
    const clonedStops = (origPlan.stops || []).map(s => {
        const newStopId = gid('st');
        const cloned = deepClone(s);
        cloned.id = newStopId;
        cloned.createdAt = new Date().toISOString();
        cloned.startedAt = '';
        cloned.adminReleasedAt = '';
        cloned.completedAt = '';
        cloned.details = Array.isArray(s.details) ? s.details.map(d => {
            const clonedDetail = deepClone(d);
            clonedDetail.id = gid('dt');
            clonedDetail.stopId = newStopId;
            clonedDetail.status = 'pendiente';
            clonedDetail.completedAt = '';
            clonedDetail.technicianReport = null;
            return clonedDetail;
        }) : [];
        return cloned;
    });

    const newPlan = {
        id: gid('gp'),
        name: newName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignedTechId: targetTechId,
        assignedTechIds: targetTechId ? [targetTechId] : [],
        assignedAt: targetTechId ? new Date().toISOString() : '',
        materialSummary: origPlan.materialSummary || '',
        stops: clonedStops
    };

    if (!Array.isArray(state.weekPlan[SHARED_PLAN_ID]._generalPlans)) {
        state.weekPlan[SHARED_PLAN_ID]._generalPlans = [];
    }
    state.weekPlan[SHARED_PLAN_ID]._generalPlans.push(newPlan);
    selectedGeneralPlanId = newPlan.id;

    const saved = await saveDB();
    if (!saved) {
        notify('No se pudo guardar el plan duplicado.', 'err');
        return;
    }
    CM('plan-duplicate-mo');
    renderPlan();
    const assignedTech = targetTechId ? (state.technicians || []).find(t => t.id === targetTechId) : null;
    notify(`Plan duplicado: "${newName}" con ${clonedStops.length} paradas${assignedTech ? ` asignado a ${assignedTech.nombre}` : ''}`);
}

function localDateKey(offset = 0) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
}

function formatCalendarDate(value) {
    if (!value) return 'Sin fecha';
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

function renderPlanCalendar() {
    const box = document.getElementById('plan-calendar');
    if (!box) return;
    const plan = getSelectedGeneralPlan();
    const stops = (plan?.stops || []).filter(stop => !stop.deletedAt);
    const today = localDateKey();
    if (!isTechnicianPlanView()) {
        if (!planCalendarExpanded) {
            box.classList.add('is-collapsed');
            const hasFilter = Boolean(selectedCalendarDate || box.dataset.unscheduledFilter === '1');
            const filterLabel = selectedCalendarDate ? formatCalendarDate(selectedCalendarDate) : (box.dataset.unscheduledFilter === '1' ? 'Sin fecha asignada' : '');
            box.innerHTML = `
                <div class="plan-calendar-collapsed-bar" style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:10px;">
                    <div style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="togglePlanCalendar(true)">
                        <span style="font-size:12px;font-weight:800;color:#18385c;">Agenda del plan</span>
                        ${hasFilter ? `<span class="badge by" style="font-size:10px;padding:3px 8px;">Filtrado: ${escapeHtml(filterLabel)}</span>` : '<span style="font-size:11px;color:#71879d;">(Todas las paradas visibles)</span>'}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        ${hasFilter ? `<button type="button" class="btn bsm bgh" onclick="clearPlanCalendarFilter()" style="font-size:10px;padding:4px 9px;">Mostrar todo</button>` : ''}
                        <button type="button" class="btn bsm bgh" onclick="togglePlanCalendar(true)" style="font-size:10px;padding:4px 9px;">Ver semana</button>
                    </div>
                </div>`;
            return;
        }
        box.classList.remove('is-collapsed');
        const mondayKey = getAdminPlannerMonday(today);
        const monday = new Date(`${mondayKey}T12:00:00`);
        const weekDates = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + index);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        });
        const dayCards = weekDates.map(date => {
            const dayStops = stops.filter(stop => stop.scheduledDate === date);
            const summary = dayStops.reduce((totals, stop) => {
                const progress = getStopProgress(stop);
                totals.total += progress.total;
                totals.done += progress.done;
                totals.pending += progress.pending;
                return totals;
            }, { total: 0, done: 0, pending: 0 });
            const dateClass = date === today ? 'today' : (date < today ? 'past' : 'future');
            return `<button type="button" class="plan-calendar-item plan-calendar-dashboard-card ${dateClass} ${selectedCalendarDate === date ? 'active' : ''}" onclick="setPlanCalendarFilter('${date}')" aria-pressed="${selectedCalendarDate === date}">
                <span class="plan-calendar-date">${escapeHtml(formatCalendarDate(date))}</span>
                <strong>${dayStops.length} parada${dayStops.length === 1 ? '' : 's'}</strong>
                <div class="plan-calendar-detail-count"><b>${summary.total}</b><span>detalles</span></div>
                <div class="plan-calendar-status"><span class="done">${summary.done} resueltos</span><span class="pending">${summary.pending} pendientes</span></div>
            </button>`;
        }).join('');
        const unscheduledStops = stops.filter(stop => !stop.scheduledDate);
        const unscheduledDetails = unscheduledStops.reduce((sum, stop) => sum + getStopProgress(stop).total, 0);
        const range = `${formatCalendarDate(weekDates[0])} — ${formatCalendarDate(weekDates[6])}`;
        const unscheduledActive = box.dataset.unscheduledFilter === '1';
        box.innerHTML = `<div class="plan-calendar-head"><div><span class="section-chip">Agenda del plan</span><h2>Resumen semanal: ${escapeHtml(plan?.name || 'Plan')}</h2><small class="plan-calendar-week-range">${escapeHtml(range)}</small></div><div class="plan-calendar-head-actions"><span class="plan-calendar-total">${stops.length} paradas totales</span>${selectedCalendarDate || unscheduledActive ? `<button type="button" class="btn bsm bgh" onclick="clearPlanCalendarFilter()">Borrar filtro</button>` : '<span class="plan-calendar-help">Selecciona un día para filtrar.</span>'}<button type="button" class="btn bsm bgh" onclick="togglePlanCalendar(false)">Ocultar</button></div></div><div class="plan-calendar-grid plan-calendar-dashboard">${dayCards}</div>${unscheduledStops.length ? `<button type="button" class="plan-calendar-unscheduled ${unscheduledActive ? 'active' : ''}" onclick="setUnscheduledPlanFilter()"><strong>${unscheduledStops.length} paradas sin fecha</strong><span>${unscheduledDetails} detalles todavía por asignar a un día</span></button>` : ''}`;
        return;
    }
    const counts = new Map();
    stops.forEach(stop => counts.set(stop.scheduledDate || '', (counts.get(stop.scheduledDate || '') || 0) + 1));
    const dates = [...counts.keys()]
        .filter(date => !isTechnicianPlanView() || (!!date && date <= today))
        .sort((a, b) => String(a || '9999').localeCompare(String(b || '9999')));
    const title = isTechnicianPlanView() ? 'Mi calendario de trabajo' : `Calendario del plan: ${plan?.name || 'Plan'}`;
    const items = dates.map(date => {
        const dateClass = !date ? 'unscheduled' : (date < today ? 'past' : (date === today ? 'today' : 'future'));
        return `<button type="button" class="plan-calendar-item ${dateClass} ${selectedCalendarDate === date ? 'active' : ''}" onclick="setPlanCalendarFilter('${escapeAttr(date)}')">
            <span class="plan-calendar-date">${escapeHtml(formatCalendarDate(date))}</span>
            <strong>${counts.get(date)} parada${counts.get(date) === 1 ? '' : 's'}</strong>
            <small>${date === today ? 'Trabajo de hoy' : (date && date < today ? 'Pendientes anteriores' : 'Dentro de este plan')}</small>
        </button>`;
    }).join('');
    box.innerHTML = `<div class="plan-calendar-head"><div><span class="section-chip">Agenda del plan</span><h2>${title}</h2></div>${isTechnicianPlanView() ? '<span class="badge bg2">Hoy y pendientes</span>' : '<span class="plan-calendar-help">Asigna una fecha distinta a cada parada del plan.</span>'}</div><div class="plan-calendar-grid">${items || '<div class="plan-empty">Este plan todavía no tiene paradas.</div>'}</div>`;
}

function togglePlanCalendar(expanded) {
    planCalendarExpanded = expanded !== false;
    renderPlanCalendar();
}

function setPlanCalendarFilter(value) {
    const box = document.getElementById('plan-calendar');
    if (box) box.dataset.unscheduledFilter = '0';
    selectedCalendarDate = selectedCalendarDate === value ? '' : value;
    activePlanCardIndex = 0;
    renderPlanCalendar();
    renderPlanDays();
}

function clearPlanCalendarFilter() {
    selectedCalendarDate = '';
    const box = document.getElementById('plan-calendar');
    if (box) box.dataset.unscheduledFilter = '0';
    activePlanCardIndex = 0;
    renderPlanCalendar();
    renderPlanDays();
}

function setUnscheduledPlanFilter() {
    selectedCalendarDate = '';
    const box = document.getElementById('plan-calendar');
    if (box) box.dataset.unscheduledFilter = '1';
    activePlanCardIndex = 0;
    renderPlanCalendar();
    renderPlanDays();
}

function getAdminPlannerMonday(value = localDateKey()) {
    const date = new Date(`${value}T12:00:00`);
    const offset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getAdminPlannerWeekDates() {
    const monday = new Date(`${adminPlannerWeekStart || getAdminPlannerMonday()}T12:00:00`);
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    });
}

function openAdminWeekPlanner() {
    if (!canManagePlanStops()) return notify('Solo un administrador puede organizar el plan por semana', 'err');
    adminPlannerWeekStart = getAdminPlannerMonday(selectedCalendarDate || localDateKey());
    renderAdminWeekPlanner();
    document.body.classList.add('plan-week-planner-open');
    OM('plan-week-planner-mo');
    setTimeout(() => {
        initAdminWeekRouteMap();
        renderAdminWeekRouteMap();
    }, 120);
}

function closeAdminWeekPlanner() {
    CM('plan-week-planner-mo');
    document.body.classList.remove('plan-week-planner-open');
}

function shiftAdminPlannerWeek(offset) {
    const monday = new Date(`${adminPlannerWeekStart || getAdminPlannerMonday()}T12:00:00`);
    monday.setDate(monday.getDate() + (Number(offset) || 0) * 7);
    adminPlannerWeekStart = getAdminPlannerMonday(`${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`);
    renderAdminWeekPlanner();
}

function renderAdminWeekPlanner() {
    const board = document.getElementById('plan-week-board');
    if (!board) return;
    const plan = getSelectedGeneralPlan();
    const stops = (plan?.stops || []).filter(stop => !stop.deletedAt);
    const dates = getAdminPlannerWeekDates();
    const dayNamesShort = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    const renderCard = (stop, instanceKey) => {
        const details = getStopDetails(stop);
        const progress = getStopProgress(stop);
        const detailPanelId = `plan-week-details-${instanceKey}`;
        const detailRows = details.map(detail => {
            const resolved = detail.status === 'completada' || detail.status === 'no_realizado';
            return `<div class="plan-week-detail ${resolved ? 'resolved' : ''}"><span>${escapeHtml(detail.title || 'Detalle')}</span><b>${resolved ? 'Resuelto' : 'Pendiente'}</b></div>`;
        }).join('') || '<div class="plan-week-empty-detail">Esta parada no tiene detalles.</div>';

        const quickMoveOptions = [
            '<option value="" disabled selected>Mover a día...</option>',
            '<option value="">Sin fecha (disponibles)</option>',
            ...dates.map((d, idx) => `<option value="${d}" ${stop.scheduledDate === d ? 'disabled' : ''}>${dayNamesShort[idx]} · ${formatCalendarDate(d)}</option>`)
        ].join('');

        return `<article class="plan-week-stop" draggable="true" ondragstart="startAdminWeekDrag(event,'${escapeAttr(stop.id)}')" ondragover="allowAdminWeekCardDrop(event)" ondragleave="event.currentTarget.classList.remove('drop-after')" ondrop="dropAdminWeekStopOnCard(event,'${escapeAttr(stop.scheduledDate || '')}','${escapeAttr(stop.id)}')">
        <strong>${escapeHtml(stop.name || 'Parada')}</strong>
        <small>${escapeHtml(stop.type === 'manual' ? 'Punto manual' : (stop.type === 'node' ? 'Nodo' : 'Antena'))}</small>
        <div class="plan-week-progress"><span>${progress.total} detalles</span><span class="resolved">${progress.done} resueltos</span><span>${progress.pending} pendientes</span></div>
        <div class="plan-week-quick-move-wrap">
            <select class="plan-week-quick-move" onchange="moveAdminWeekStopToDay('${escapeAttr(stop.id)}', this.value)" onclick="event.stopPropagation()">
                ${quickMoveOptions}
            </select>
        </div>
        <button class="plan-week-details-toggle" type="button" onclick="toggleAdminWeekStopDetails(event,'${detailPanelId}')">Ver detalles</button>
        <div id="${detailPanelId}" class="plan-week-details" hidden>${detailRows}</div>
    </article>`;
    };

    const columns = [{ date: '', label: 'Paradas disponibles', source: true }, ...dates.map(date => ({ date, label: formatCalendarDate(date), source: false }))];
    board.innerHTML = columns.map((column, columnIndex) => {
        const columnStops = column.source
            ? stops.filter(stop => !dates.includes(stop.scheduledDate))
            : stops.filter(stop => stop.scheduledDate === column.date);
        const dropEvents = `ondragover="allowAdminWeekDrop(event)" ondrop="dropAdminWeekStop(event,'${column.date}')"`;
        const feasibility = column.source ? null : calculateDayRouteFeasibility(columnStops);
        const workloadBadge = feasibility && columnStops.length > 0
            ? `<span class="plan-week-workload-badge" title="Jornada estimada: traslado + servicio">~${feasibility.workdayFormatted}</span>`
            : '';

        return `<section class="plan-week-column ${column.source ? 'plan-week-source' : ''}" ${dropEvents}>
            <header onclick="${column.source ? '' : `setAdminWeekMapScope('${column.date}')`}" style="${column.source ? '' : 'cursor:pointer'}" title="${column.source ? '' : 'Clic para enfocar ruta en el mapa'}">
                <span>${escapeHtml(column.label)}</span>
                <div class="plan-week-column-header-info">
                    ${workloadBadge}
                    <b>${columnStops.length}</b>
                </div>
            </header>
            <div class="plan-week-dropzone">${columnStops.map((stop, index) => renderCard(stop, `${columnIndex}-${index}`)).join('') || `<div class="plan-week-empty">${column.source ? 'No hay paradas disponibles' : 'Suelta una parada aquí'}</div>`}</div>
        </section>`;
    }).join('');

    const range = document.getElementById('plan-week-range');
    if (range) range.textContent = `${formatCalendarDate(dates[0])} — ${formatCalendarDate(dates[6])}`;
    const sub = document.getElementById('plan-week-planner-sub');
    if (sub) sub.textContent = `${plan?.name || 'Plan general'} · ${stops.length} paradas`;
    renderAdminWeekMapOptions(dates, stops);
    if (adminWeekRouteMap) renderAdminWeekRouteMap();
    setupWeekBoardWheelScroll();
}

function scrollWeekBoard(offset) {
    const board = document.getElementById('plan-week-board');
    if (board) {
        board.scrollBy({ left: offset, behavior: 'smooth' });
    }
}

function setupWeekBoardWheelScroll() {
    const board = document.getElementById('plan-week-board');
    if (!board || board.dataset.wheelListenerAttached) return;
    board.dataset.wheelListenerAttached = 'true';

    board.addEventListener('wheel', (e) => {
        // Si el cursor está sobre una zona de tarjetas que tiene scroll vertical interno, permitirlo
        const dropzone = e.target.closest('.plan-week-dropzone');
        if (dropzone && dropzone.scrollHeight > dropzone.clientHeight + 4) {
            const atTop = dropzone.scrollTop <= 1 && e.deltaY < 0;
            const atBottom = dropzone.scrollTop + dropzone.clientHeight >= dropzone.scrollHeight - 2 && e.deltaY > 0;
            if (!atTop && !atBottom) {
                return; // Scroll vertical natural dentro de la columna
            }
        }

        // De lo contrario, traducir inmediatamente el scroll de la rueda en desplazamiento horizontal fluido
        if (e.deltaY !== 0 || e.deltaX !== 0) {
            e.preventDefault();
            const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
            board.scrollBy({
                left: delta * 1.6,
                behavior: 'auto'
            });
        }
    }, { passive: false });
}

async function moveAdminWeekStopToDay(stopId, targetDate) {
    const plan = getSelectedGeneralPlan();
    if (!plan) return;
    const stop = (plan.stops || []).find(s => s.id === stopId && !s.deletedAt);
    if (!stop) return;
    stop.scheduledDate = targetDate || '';
    stop.updatedAt = new Date().toISOString();
    await saveDB();
    renderAdminWeekPlanner();
    renderPlan();
    notify(targetDate ? `Parada asignada al ${formatCalendarDate(targetDate)}` : 'Parada desasignada a disponibles');
}

function renderAdminWeekMapOptions(dates = getAdminPlannerWeekDates(), stops = visibleStops(getSelectedGeneralPlan()?.stops)) {
    const calendar = document.getElementById('plan-week-map-scope');
    if (!calendar) return;
    if (adminWeekMapScope !== 'general' && !dates.includes(adminWeekMapScope)) adminWeekMapScope = 'general';
    const assigned = stops.filter(stop => dates.includes(stop.scheduledDate)).length;
    const dayNames = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
    const general = `<button type="button" class="plan-week-map-general ${adminWeekMapScope === 'general' ? 'active' : ''}" onclick="setAdminWeekMapScope('general')"><span>Semana</span><strong>${assigned}</strong><small>paradas</small></button>`;
    const days = dates.map((date, index) => {
        const dayNumber = new Date(`${date}T12:00:00`).getDate();
        const count = stops.filter(stop => stop.scheduledDate === date).length;
        return `<button type="button" class="plan-week-map-day ${adminWeekMapScope === date ? 'active' : ''}" onclick="setAdminWeekMapScope('${escapeAttr(date)}')" aria-label="${escapeAttr(formatCalendarDate(date))}, ${count} paradas"><span>${dayNames[index]}</span><strong>${dayNumber}</strong><small>${count}</small></button>`;
    }).join('');
    calendar.innerHTML = `${general}<div class="plan-week-map-days">${days}</div>`;
}

function setAdminWeekMapScope(value) {
    adminWeekMapScope = value || 'general';
    renderAdminWeekMapOptions();
    renderAdminWeekRouteMap();
}

function initAdminWeekRouteMap() {
    const element = document.getElementById('plan-week-route-map');
    if (!element || typeof L === 'undefined') return;
    if (!adminWeekRouteMap) {
        adminWeekRouteMap = L.map(element, { scrollWheelZoom: true }).setView([17.55, -99.50], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19
        }).addTo(adminWeekRouteMap);
    }
    setTimeout(() => adminWeekRouteMap?.invalidateSize(), 80);
}

function getAdminWeekMapStops() {
    const dates = getAdminPlannerWeekDates();
    const stops = visibleStops(getSelectedGeneralPlan()?.stops)
        .map((stop, index) => ({ ...stop, _planIndex: index, lat: safeFloat(stop.lat), lng: safeFloat(stop.lng) }))
        .filter(stop => !isNaN(stop.lat) && !isNaN(stop.lng));
    const selected = adminWeekMapScope === 'general'
        ? stops.filter(stop => dates.includes(stop.scheduledDate)).sort((a, b) => String(a.scheduledDate).localeCompare(String(b.scheduledDate)) || a._planIndex - b._planIndex)
        : stops.filter(stop => stop.scheduledDate === adminWeekMapScope);
    return selected.map((stop, index) => ({ ...stop, order: index + 1 }));
}

async function renderAdminWeekRouteMap() {
    initAdminWeekRouteMap();
    if (!adminWeekRouteMap) return;
    const renderId = ++adminWeekRouteRenderId;
    if (adminWeekRouteLayer) adminWeekRouteMap.removeLayer(adminWeekRouteLayer);
    adminWeekRouteLayer = L.layerGroup().addTo(adminWeekRouteMap);
    const rawStops = getAdminWeekMapStops();
    const stops = ensureRoutePointsStartAtWiFiMex(rawStops).map((s, idx) => ({ ...s, order: idx + 1 }));
    const info = document.getElementById('plan-week-map-info');
    const label = adminWeekMapScope === 'general' ? 'General de la semana' : formatCalendarDate(adminWeekMapScope);
    if (info) info.textContent = `${label} · ${rawStops.length} parada${rawStops.length === 1 ? '' : 's'}`;
    if (!stops.length) {
        adminWeekRouteMap.setView([17.55, -99.50], 8);
        return;
    }
    const latLngs = stops.map(stop => [stop.lat, stop.lng]);
    if (latLngs.length > 1) {
        L.polyline(latLngs, { color: '#fff', weight: 8, opacity: .96, interactive: false }).addTo(adminWeekRouteLayer);
        L.polyline(latLngs, { color: '#f59e0b', weight: 4, opacity: .95, dashArray: '8 6', interactive: false }).addTo(adminWeekRouteLayer);
    }
    stops.forEach(stop => {
        const progress = getStopProgress(stop);
        const stopLabel = getPlanMapStopDisplayName(stop);
        const marker = L.marker([stop.lat, stop.lng], {
            icon: makePlanStopMarkerIcon(stop, stop.order)
        }).addTo(adminWeekRouteLayer);
        marker.bindTooltip(`${stop.isOrigin ? 'Base · ' : `${stop.order}. `}${escapeHtml(stopLabel)}`, { direction: 'top', offset: [0, -14] });
        marker.bindPopup(`<div style="min-width:190px"><strong>${stop.isOrigin ? 'Base · ' : `${stop.order}. `}${escapeHtml(stopLabel)}</strong><div class="map-detail-stats"><strong>${progress.total}<small>detalles</small></strong><span class="pending">${progress.pending} pendientes</span><span class="resolved">${progress.done} resueltos</span></div></div>`);
    });
    adminWeekRouteMap.fitBounds(latLngs, { padding: [28, 28], maxZoom: 15 });
    setTimeout(() => adminWeekRouteMap?.invalidateSize(), 80);
    if (stops.length < 2) return;
    try {
        const route = await fetchRoadRouteChunked(stops, 24);
        if (renderId !== adminWeekRouteRenderId || !adminWeekRouteLayer) return;
        adminWeekRouteLayer.eachLayer(layer => {
            if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) adminWeekRouteLayer.removeLayer(layer);
        });
        L.geoJSON(route.geometry, { style: { color: '#fff', weight: 9, opacity: .98, interactive: false } }).addTo(adminWeekRouteLayer);
        L.geoJSON(route.geometry, { style: { color: '#0b63ce', weight: 5, opacity: .97, interactive: false } }).addTo(adminWeekRouteLayer);
        if (info) info.textContent = `${label} · ${stops.length} paradas · ${(Number(route.distance || 0) / 1000).toFixed(1)} km`;
    } catch (error) {
        if (renderId === adminWeekRouteRenderId && info) info.textContent = `${label} · ruta directa · ${stops.length} paradas`;
    }
}

function startAdminWeekDrag(event, stopId) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', stopId);
    event.currentTarget.classList.add('dragging');
    event.currentTarget.addEventListener('dragend', () => event.currentTarget.classList.remove('dragging'), { once: true });
}

function toggleAdminWeekStopDetails(event, panelId) {
    event.preventDefault();
    event.stopPropagation();
    const panel = document.getElementById(panelId);
    if (!panel) return;
    panel.hidden = !panel.hidden;
    event.currentTarget.textContent = panel.hidden ? 'Ver detalles' : 'Ocultar detalles';
}

function allowAdminWeekDrop(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

function allowAdminWeekCardDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    const card = event.currentTarget;
    card.classList.toggle('drop-after', event.clientY > card.getBoundingClientRect().top + card.offsetHeight / 2);
}

function dropAdminWeekStop(event, date) {
    event.preventDefault();
    event.stopPropagation();
    const stopId = event.dataTransfer.getData('text/plain');
    if (stopId) moveStopToWeekPosition(stopId, date);
}

function dropAdminWeekStopOnCard(event, date, targetId) {
    event.preventDefault();
    event.stopPropagation();
    const stopId = event.dataTransfer.getData('text/plain');
    const after = event.clientY > event.currentTarget.getBoundingClientRect().top + event.currentTarget.offsetHeight / 2;
    event.currentTarget.classList.remove('drop-after');
    if (stopId && stopId !== targetId) moveStopToWeekPosition(stopId, date, targetId, after);
}

async function moveStopToWeekPosition(stopId, date, targetId = '', after = true) {
    const plan = getSelectedGeneralPlan();
    const ref = plan?.stops;
    if (!Array.isArray(ref)) return;
    const sourceIndex = ref.findIndex(stop => stop.id === stopId && !stop.deletedAt);
    if (sourceIndex < 0) return;
    const [stop] = ref.splice(sourceIndex, 1);
    stop.scheduledDate = date || '';
    stop.updatedAt = new Date().toISOString();
    let insertAt = ref.length;
    if (targetId) {
        const targetIndex = ref.findIndex(item => item.id === targetId);
        if (targetIndex >= 0) insertAt = targetIndex + (after ? 1 : 0);
    }
    ref.splice(insertAt, 0, stop);
    const saved = await saveDB();
    if (!saved) return;
    renderPlan();
    renderAdminWeekPlanner();
    notify(date ? `Parada movida a ${formatCalendarDate(date)}` : 'Parada devuelta a disponibles');
}

async function assignStopCalendarDate(stopId, value) {
    if (isPlanReadOnly()) return;
    const stop = getPlanStops('general').find(item => item.id === stopId);
    if (!stop) return;
    stop.scheduledDate = value || '';
    stop.updatedAt = new Date().toISOString();
    let saved = await saveDB();
    if (!saved && ['localhost', '127.0.0.1', '::1'].includes(location.hostname)) {
        try {
            const response = await fetch(`${location.origin}/api/changes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ changes: [{ key: 'weekPlan', value: state.weekPlan }] })
            });
            saved = response.ok;
        } catch (error) {
            console.warn('Reintento local de calendario fallido', error);
        }
    }
    if (!saved) return notify('No se pudo guardar el día de la parada.', 'err');
    renderPlan();
    notify(value ? `Parada asignada a ${formatCalendarDate(value)}` : 'Parada sin fecha');
}

function getIncompleteReason(message) {
    return new Promise(resolve => {
        let modal = document.getElementById('tech-incomplete-reason-mo');
        if (!modal) {
            document.body.insertAdjacentHTML('beforeend', `<div class="mo tech-incomplete-reason-mo" id="tech-incomplete-reason-mo"><div class="md tech-incomplete-reason-card"><div class="tech-incomplete-icon">!</div><h2>¿Por qué no se terminó?</h2><p id="tech-incomplete-reason-copy"></p><textarea id="tech-incomplete-reason-input" maxlength="500" rows="4" placeholder="Describe brevemente qué pasó..."></textarea><small id="tech-incomplete-reason-error"></small><div class="tech-incomplete-actions"><button type="button" class="btn bgh" id="tech-incomplete-cancel">Cancelar</button><button type="button" class="btn ba" id="tech-incomplete-save">Guardar reporte</button></div></div></div>`);
            modal = document.getElementById('tech-incomplete-reason-mo');
        }
        const input = document.getElementById('tech-incomplete-reason-input');
        const error = document.getElementById('tech-incomplete-reason-error');
        document.getElementById('tech-incomplete-reason-copy').textContent = message;
        input.value = '';
        error.textContent = '';
        const finish = value => { CM('tech-incomplete-reason-mo'); resolve(value); };
        document.getElementById('tech-incomplete-cancel').onclick = () => finish(null);
        document.getElementById('tech-incomplete-save').onclick = () => {
            const clean = input.value.trim().replace(/\s+/g, ' ').slice(0, 500);
            if (!clean) { error.textContent = 'Escribe qué pasó para continuar.'; input.focus(); return; }
            finish(clean);
        };
        OM('tech-incomplete-reason-mo');
        setTimeout(() => input.focus(), 80);
    });
}

async function reportPlanDetailIncomplete(detailId, stopId) {
    if (!isTechnicianPlanView()) return;
    const reason = await getIncompleteReason('¿Por qué motivo no se pudo terminar este trabajo?:');
    if (!reason) return;
    const ok = await askConfirmation({
        title: 'No se pudo realizar',
        message: '¿Confirmas marcar este trabajo como no realizado el día de hoy?',
        confirmText: 'Confirmar no realizado',
        cancelText: 'Cancelar',
        tone: 'danger'
    });
    if (!ok) return;
    let detail = (state.workOrders || []).find(item => item.id === detailId && !item.deletedAt);
    if (!detail && window._currentTechnicianCompletionDetail && window._currentTechnicianCompletionDetail.id === detailId) {
        detail = window._currentTechnicianCompletionDetail;
    }
    if (!detail && typeof getGlobalWorkOrdersCache === 'function') {
        detail = getGlobalWorkOrdersCache()[detailId] || null;
    }
    if (!detail && typeof findOrFetchWorkOrder === 'function') {
        detail = await findOrFetchWorkOrder(detailId);
    }
    if (!detail) {
        const allStops = getPlanStopsForView('general');
        for (const s of allStops) {
            const found = (s.details || []).find(d => d.id === detailId);
            if (found) { detail = found; break; }
        }
    }
    if (!detail) return notify('No se encontró el detalle.', 'err');
    const allPlanStops = typeof getPlanMapStops === 'function' ? getPlanMapStops() : getPlanStopsForView('general');
    const stop = (stopId ? allPlanStops.find(item => item.id === stopId) : null)
        || allPlanStops.find(item => (item.detailIds || []).includes(detail.id))
        || null;
    const activePlan = typeof getSelectedGeneralPlan === 'function' ? getSelectedGeneralPlan() : null;
    const now = new Date().toISOString();
    const actor = getCurrentUser();
    const attempt = { type: 'detalle', reason, at: now, stopId: stop?.id || stopId || '', planId: activePlan?.id || '', byId: actor.id || '', byName: actor.name || actor.username || '' };
    // Se considera atendido en estadisticas, registrado formalmente en detalles fisicos
    // y disponible para envio de reporte por WhatsApp.
    detail.status = 'no_realizado';
    detail.detailKind = 'physical';
    detail.completedAt = now;
    detail.updatedAt = now;
    detail.technicianReport = { ...(detail.technicianReport || {}), result: 'no_realizado', reason, stopId: stop?.id || stopId || '', planId: activePlan?.id || '', completedAt: now, completedBy: actor.id || '', completedByName: actor.name || actor.username || '' };
    detail.incompleteHistory = [...(detail.incompleteHistory || []), attempt];
    setUpdatedAudit(detail, 'reportó detalle no terminado');
    if (typeof prepareTechnicianSummaryFile === 'function') {
        prepareTechnicianSummaryFile({ ...detail, technicianReport: { ...(detail.technicianReport || {}) } }).catch(() => { });
    }
    if (stop) {
        try { syncStopCompletion(stop); } catch (syncErr) { console.warn('syncStopCompletion failed:', syncErr); }
        stop.updatedAt = now;
    }
    savePlanificarOfflineSnapshot();
    let saved = false;
    try {
        saved = await saveDB();
    } catch (saveErr) {
        console.warn('saveDB error:', saveErr);
    }
    if (!saved) {
        notify('Guardado localmente (sin señal). Se sincronizará al reconectar.', 'warn');
    }
    window._currentTechnicianCompletionDetail = detail;
    window._lastReportedDetail = detail;
    try { renderPlan(); } catch (renderErr) { console.warn('renderPlan after incomplete failed:', renderErr); }
    openTechnicianCompletionSummary(detail);
}

async function reportWholeStopIncomplete(stopId) {
    if (!isTechnicianPlanView()) return;
    const reason = await getIncompleteReason('¿Por qué motivo no se pudo terminar esta parada?:');
    if (!reason) return;
    const ok = await askConfirmation({
        title: 'Posponer parada completa',
        message: '¿Confirmas pasar esta parada completa para el día de mañana?',
        confirmText: 'Pasar para mañana',
        cancelText: 'Cancelar',
        tone: 'warning'
    });
    if (!ok) return;
    const stop = getPlanStops('general').find(item => item.id === stopId && !item.deletedAt);
    if (!stop) return;
    const now = new Date().toISOString();
    const actor = getCurrentUser();
    const attempt = { type: 'parada', reason, at: now, byId: actor.id || '', byName: actor.name || actor.username || '' };
    stop.incompleteHistory = [...(stop.incompleteHistory || []), attempt];
    stop.lastIncompleteReason = reason;
    stop.scheduledDate = localDateKey(1);
    stop.siteStatus = 'pendiente';
    stop.updatedAt = now;
    getStopDetails(stop).filter(detail => !['completada', 'no_realizado'].includes(detail.status || '')).forEach(detail => {
        detail.incompleteHistory = [...(detail.incompleteHistory || []), attempt];
        detail.updatedAt = now;
    });
    let saved = false;
    try {
        saved = await saveDB();
    } catch (saveErr) {
        console.warn('saveDB error:', saveErr);
    }
    if (!saved) {
        notify('Guardado localmente (sin señal). Se sincronizará al reconectar.', 'warn');
    }
    renderPlan();
    notify('La parada completa se pasó para el día de mañana.', 'ok');
}

async function assignGeneralPlanDate(value) {
    if (isPlanReadOnly()) return;
    const plan = getSelectedGeneralPlan();
    if (!plan) return;
    plan.scheduledDate = value || '';
    plan.updatedAt = new Date().toISOString();
    const saved = await saveDB();
    if (!saved) return notify('No se pudo guardar la fecha.', 'err');
    renderPlan();
    notify(value ? `Plan programado para ${formatCalendarDate(value)}` : 'Fecha retirada del plan');
}

function requestPlanAssignmentConfirmation({ plan, tech, occupiedPlan = null, unassign = false }) {
    if (pendingPlanAssignmentResolver) pendingPlanAssignmentResolver(false);
    const title = document.getElementById('plan-assignment-title');
    const message = document.getElementById('plan-assignment-message');
    const planName = document.getElementById('plan-assignment-plan');
    const techName = document.getElementById('plan-assignment-tech');
    const warning = document.getElementById('plan-assignment-warning');
    const confirm = document.getElementById('plan-assignment-confirm')?.querySelector('span:last-child');
    const techDisplayName = tech?.nombre || tech?.usuario || 'este técnico';
    const currentPlanName = plan?.name || 'Plan general';
    const occupiedPlanName = occupiedPlan?.name || 'otro plan';

    if (title) {
        title.textContent = unassign
            ? 'Dejar plan sin técnico'
            : (occupiedPlan ? 'Técnico ya asignado a otro plan' : 'Asignar técnico a la ruta');
    }
    if (message) {
        message.textContent = unassign
            ? 'La ruta volverá al plan general compartido.'
            : (occupiedPlan
                ? `El técnico ${techDisplayName} ya tiene asignado el plan “${occupiedPlanName}”. ¿Deseas pasarlo al plan “${currentPlanName}”?`
                : 'El técnico podrá consultar y trabajar esta ruta desde su agenda.');
    }
    if (planName) planName.textContent = currentPlanName;
    if (techName) techName.textContent = unassign ? 'Sin técnico asignado' : techDisplayName;
    if (warning) {
        warning.hidden = !occupiedPlan;
        warning.textContent = occupiedPlan
            ? `Actualmente tiene asignado el plan “${occupiedPlanName}”. Si confirmas, dejará “${occupiedPlanName}” y pasará al plan “${currentPlanName}”.`
            : '';
    }
    if (confirm) confirm.textContent = unassign ? 'Quitar asignación' : (occupiedPlan ? 'Sí, pasar a este plan' : 'Confirmar asignación');
    OM('plan-assignment-mo');
    return new Promise(resolve => { pendingPlanAssignmentResolver = resolve; });
}

function resolvePlanAssignment(confirmed) {
    CM('plan-assignment-mo');
    const resolve = pendingPlanAssignmentResolver;
    pendingPlanAssignmentResolver = null;
    if (resolve) resolve(!!confirmed);
}

async function assignGeneralPlanToTech(techId) {
    if (techId === '__team__') {
        openTeamAssignmentModal();
        return;
    }
    const plan = getSelectedGeneralPlan();
    if (!plan) return;
    const targetTechId = (!techId || techId === '__unassign__') ? '' : String(techId);
    const currentAssignedIds = getGeneralPlanAssignedTechs(plan).map(t => String(t.id));
    if (targetTechId && currentAssignedIds.length === 1 && currentAssignedIds[0] === targetTechId) return;
    if (!targetTechId && currentAssignedIds.length === 0) return;
    const targetTech = targetTechId ? (state.technicians || []).find(item => !item.deletedAt && (String(item.id) === targetTechId || String(item.userId || '') === targetTechId)) : null;
    const occupied = targetTechId ? getGeneralPlanAssignedToTech(targetTechId, plan.id) : null;
    const confirmed = await requestPlanAssignmentConfirmation({ plan, tech: targetTech, occupiedPlan: occupied, unassign: !targetTechId });
    if (!confirmed) {
        renderGeneralPlanAssigneeSelect();
        return;
    }
    if (targetTechId) {
        const canonicalId = String(targetTech?.id || targetTechId);
        unassignTechFromOtherPlans(canonicalId, plan.id);
        const freshIds = getPlanRawAssignedTechIds(plan);
        const nextIds = freshIds.includes(canonicalId) ? freshIds : [...freshIds, canonicalId];
        syncPlanAssignedMetadata(plan, nextIds);
    } else {
        syncPlanAssignedMetadata(plan, []);
    }
    savePlanificarOfflineSnapshot();
    const saved = await saveDB();
    if (!saved) {
        notify('No se pudo guardar la asignación del plan en D1.', 'err');
        return;
    }
    savePlanificarOfflineSnapshot();
    renderPlan();
    const tech = getGeneralPlanAssignedTech(plan);
    notify(tech ? `Plan asignado a ${tech.nombre}` : 'Plan sin técnico asignado');
}

function renderPlanTechTargetSelect(selected = selectedTechId) {
    const sel = document.getElementById('stop-tech-target');
    if (!sel) return;
    const techs = (state.technicians || []).filter(t => !t.deletedAt && t.estado !== 'inactivo');
    sel.innerHTML = [`<option value="${SHARED_PLAN_ID}">Plan general compartido</option>`]
        .concat(techs.map(t => `<option value="${escapeAttr(t.id)}">${escapeHtml(t.nombre)}</option>`)).join('');
    sel.value = selected || SHARED_PLAN_ID;
}

function getStopCurrentPosition(stop) {
    const eq = stop?.equipmentId ? (state.equipment || []).find(e => e.id === stop.equipmentId && !e.deletedAt) : null;
    const node = stop?.nodeId ? (state.nodes || []).find(n => n.id === stop.nodeId && !n.deletedAt) : null;
    return {
        lat: safeFloat(eq?.lat ?? node?.lat ?? stop?.lat),
        lng: safeFloat(eq?.lng ?? node?.lng ?? stop?.lng)
    };
}

function renderPlanDetailMeta(detail) {
    const rows = [];
    if (detail.desc) rows.push(`<small>${escapeHtml(detail.desc)}</small>`);
    rows.push(renderDetailLocation(detail.detailLocation));
    return rows.join('');
}

function renderPlanDetailsGrouped(details, stop, day, mode = 'all') {
    const list = Array.isArray(details) ? details : [];
    const pending = list.filter(detail => isDetailPendingInStop(detail, stop));
    const completed = list.filter(detail => isDetailCompletedInStop(detail, stop));
    const pendingHtml = pending.map(detail => renderPlanDetailRow(detail, stop, day)).join('');
    const completedHtml = completed.map(detail => renderPlanDetailRow(detail, stop, day, true)).join('');
    if (mode === 'pending') return `<div class="plan-detail-group"><strong>Pendientes</strong>${pendingHtml || '<div class="plan-empty compact">No hay detalles pendientes.</div>'}</div>`;
    if (mode === 'completed') return `<div class="plan-detail-group completed"><strong>Completados</strong>${completedHtml || '<div class="plan-empty compact">No hay detalles completados.</div>'}</div>`;
    return `<div class="plan-detail-group"><strong>Pendientes</strong>${pendingHtml || '<div class="plan-empty compact">No hay detalles pendientes.</div>'}</div>${completed.length ? `<div class="plan-detail-group completed"><strong>Completados</strong>${completedHtml}</div>` : ''}`;
}

function renderPlanDetailRow(detail, stop, day, historical = false) {
    const done = detail.status === 'completada';
    const noDone = detail.status === 'no_realizado';
    const noDoneBadgeLabel = noDone ? formatNoRealizadoBadgeLabel(detail) : '';
    const noDoneReason = noDone ? String(detail.technicianReport?.reason || '').trim() : '';
    const reattendableNoDone = noDone && isDetailPendingInStop(detail, stop);
    const category = getPlanDetailCategory(detail);
    const technicianDetailText = getWorkOrderRequestedText(detail, 'Sin detalle registrado');
    const technicianDescription = '';
    const hasClient = !!(detail.clientName && String(detail.clientName).trim());
    const visibleClientName = hasClient ? detail.clientName.trim() : '';
    const technicianLocation = detail.detailLocation
        || detail.technicianReport?.location
        || ((!isNaN(safeFloat(detail.lat)) && !isNaN(safeFloat(detail.lng))) ? `${detail.lat}, ${detail.lng}` : '');
    const rawPhoneStr = String(detail.clientPhone || detail.phone || detail.technicianReport?.phone || '').trim();
    const rawPhone = rawPhoneStr.replace(/\D/g, '');
    const hasValidPhone = rawPhone.length >= 7 && !/^0+$/.test(rawPhone);
    const clientPhoneHtml = (rawPhoneStr && rawPhoneStr !== '0000000000')
        ? `<div class="detail-client-phone-line"><b>Teléfono:</b> ${hasValidPhone ? `<a href="tel:${escapeAttr(rawPhone)}">${escapeHtml(rawPhoneStr)}</a>` : `<span>${escapeHtml(rawPhoneStr)}</span>`}</div>`
        : '';
    const phoneCallBtn = (isTechnicianPlanView() && hasValidPhone)
        ? `<a href="tel:${escapeAttr(rawPhone)}" class="tech-call-btn" title="Llamar al cliente"><svg class="tech-btn-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Llamar</a>`
        : '';
    const technicianActions = isTechnicianPlanView()
        ? (done
            ? `${phoneCallBtn}<button type="button" class="btn bsm tech-detail-edit" onclick="openTechnicianCompletionForm('${escapeAttr(detail.id)}')">Editar</button>`
            : (noDone && !reattendableNoDone
                ? `${phoneCallBtn}<button type="button" class="btn bsm bg2 tech-detail-finish tech-detail-finish-later" onclick="openTechnicianCompletionForm('${escapeAttr(detail.id)}')">Terminar</button>`
                : `${phoneCallBtn}<button type="button" class="btn bsm bg2 tech-detail-finish" onclick="openTechnicianCompletionForm('${escapeAttr(detail.id)}')">Terminar</button><button type="button" class="btn bsm ba tech-detail-incomplete" onclick="reportPlanDetailIncomplete('${escapeAttr(detail.id)}','${escapeAttr(stop.id)}')">No realizado</button>`))
        : '';
    const statusLine = done
        ? `<div class="detail-status-line"><span class="detail-folio">${escapeHtml(getDetailFolio(detail))}</span><span class="plan-category-badge category-${escapeAttr(category)}">${escapeHtml(planCategoryLabel(category))}</span></div>`
        : `<div class="detail-status-line">${noDone ? `<span class="badge ba tech-no-realizado-badge">${escapeHtml(noDoneBadgeLabel)}</span>` : `<span class="priority-badge priority-${escapeAttr(detail.priority || 'media')}"><span class="priority-dot"></span>${escapeHtml(pl(detail.priority || 'media'))}</span>`}<span class="detail-folio">${escapeHtml(getDetailFolio(detail))}</span><span class="plan-category-badge category-${escapeAttr(category)}">${escapeHtml(planCategoryLabel(category))}</span></div>`;
    const completedSummary = done ? `
                ${hasClient ? `<div class="detail-client-line"><b>Cliente:</b> ${escapeHtml(visibleClientName)}</div>` : ''}
                ${clientPhoneHtml}
                <strong class="detail-title-line">${isTechnicianPlanView() ? '' : '<b>Detalle:</b> '}${escapeHtml(technicianDetailText)}</strong>
                ${technicianDescription ? `<small class="detail-description-line"><b>Información:</b> ${escapeHtml(technicianDescription)}</small>` : ''}
                ${renderDetailLocation(detail.detailLocation || detail.technicianReport?.location)}
                ${detail.technicianReport?.modifiedAt || detail.modifiedAt ? `<small class="detail-modified-line"><b>Modificado:</b> ${escapeHtml(formatPlanDateTime(detail.technicianReport?.modifiedAt || detail.modifiedAt))}</small>` : ''}` : `
                ${hasClient ? `<div class="detail-client-line"><b>Cliente:</b> ${escapeHtml(visibleClientName)}</div>` : (!isTechnicianPlanView() ? '<div class="detail-client-line is-empty"><b>Cliente:</b> Sin nombre registrado</div>' : '')}
                ${clientPhoneHtml}
                ${isTechnicianPlanView() ? `
                    <strong class="detail-title-line">${escapeHtml(technicianDetailText)}</strong>
                    ${technicianDescription ? `<small class="detail-description-line"><b>Información:</b> ${escapeHtml(technicianDescription)}</small>` : ''}
                    ${noDoneReason ? `<div class="tech-no-realizado-reason-chip"><strong>Motivo anterior:</strong> ${escapeHtml(noDoneReason)}</div>` : ''}
                    ${technicianLocation ? renderDetailLocation(technicianLocation) : ''}
                ` : `
                    <strong class="detail-title-line"><b>Detalle:</b> ${escapeHtml(technicianDetailText)}</strong>
                    ${technicianDescription ? `<small class="detail-description-line"><b>Información:</b> ${escapeHtml(technicianDescription)}</small>` : ''}
                    ${renderPlanDetailMeta(detail)}
                `}
                ${noDone && !isTechnicianPlanView() ? renderAdminTechReport(detail) : ''}`;
    return `
        <div class="plan-detail-row ${done ? 'done completed-summary' : ''} ${noDone ? 'not-done' : 'pending-summary'}" style="border-left-color:${pc(detail.priority)}">
            <div class="plan-detail-main">
                ${statusLine}
                ${completedSummary}
            </div>
            <div class="plan-detail-actions">
                <button class="btn bsm bgh plan-detail-open" title="Ver detalle completo" aria-label="Ver detalle completo" onclick="openPlanDetailReport('${escapeAttr(detail.id)}','${escapeAttr(stop.id)}','${escapeAttr(day)}')"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2.3 12s3.5-6 9.7-6 9.7 6 9.7 6-3.5 6-9.7 6-9.7-6-9.7-6Z"/><circle cx="12" cy="12" r="2.8"/></svg><span>${isTechnicianPlanView() ? 'Detalle' : 'Ver detalle'}</span></button>
                ${technicianActions}
                ${!historical && !isTechnicianPlanView() && canManagePlanStops() ? `<button class="btn bsm br plan-detail-delete" title="Eliminar detalle" aria-label="Eliminar detalle" onclick="deletePlanDetailFromStop('${escapeAttr(stop.id)}','${escapeAttr(day)}','${escapeAttr(detail.id)}')">${stopActionIcon('delete')}</button>` : ''}
            </div>
        </div>`;
}

async function openPlanDetailReport(detailId, stopId = '', day = selectedDay) {
    let detail = (state.workOrders || []).find(item => item.id === detailId && !item.deletedAt);
    if (!detail && typeof findOrFetchWorkOrder === 'function') {
        detail = await findOrFetchWorkOrder(detailId);
    }
    if (!detail) return notify('No se encontró el detalle solicitado.', 'err');
    const candidateStops = visibleStops(getPlanStopsRef(selectedTechId, day));
    const stop = candidateStops.find(item => item.id === stopId)
        || candidateStops.find(item => Array.isArray(item.detailIds) && item.detailIds.includes(detail.id))
        || candidateStops.find(item => (detail.equipmentId && item.equipmentId === detail.equipmentId) || (detail.nodeId && item.nodeId === detail.nodeId));
    const report = detail.technicianReport || {};
    const resolved = ['completada', 'no_realizado'].includes(detail.status || '') || !!report.completedAt;
    const noDone = detail.status === 'no_realizado' || report.result === 'no_realizado';
    const photos = getAdminTechReportPhotos(report);
    const galleryKey = `detail-report-${detail.id}`;
    planEvidenceGalleries.set(galleryKey, photos.slice());
    const requested = getWorkOrderRequestedText(detail, 'Sin descripcion capturada');
    const completedWork = getTechnicianReportCompletedWork(detail, requested);
    const location = detail.detailLocation || report.location || ((!isNaN(safeFloat(detail.lat)) && !isNaN(safeFloat(detail.lng))) ? `${detail.lat}, ${detail.lng}` : 'Sin ubicacion capturada');
    const typeLabels = { comunidad: 'Comunidad', torre: 'Torre', troncal: 'Troncal', punto_venta: 'Punto de venta' };
    const statusText = resolved ? (noDone ? 'No realizado' : 'Completada') : 'Pendiente';
    const dateValue = resolved ? (report.completedAt || detail.completedAt || detail.updatedAt) : (detail.createdAt || detail.updatedAt);
    let modal = document.getElementById('plan-detail-report-mo');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', '<div class="mo plan-detail-report-mo" id="plan-detail-report-mo"><div class="plan-detail-report-card" id="plan-detail-report-card"></div></div>');
        modal = document.getElementById('plan-detail-report-mo');
        modal.addEventListener('click', event => { if (event.target === modal) CM('plan-detail-report-mo'); });
    }
    const field = (icon, label, value, tone = '') => `<div class="plan-report-field ${tone}"><span class="plan-report-field-icon">${icon}</span><div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value || 'Sin registro')}</strong></div></div>`;
    const editButton = resolved && detail.status === 'completada' && isTechnicianPlanView()
        ? `<button type="button" class="btn plan-detail-report-edit" onclick="CM('plan-detail-report-mo');openTechnicianCompletionForm('${escapeAttr(detail.id)}')">Editar reporte</button>`
        : (!resolved && stop ? `<button type="button" class="btn plan-detail-report-edit" title="Editar detalle" aria-label="Editar detalle" onclick="editPlanDetailFromReport('${escapeAttr(stop.id)}','${escapeAttr(day)}','${escapeAttr(detail.id)}')">${stopActionIcon('edit')}</button>` : '');
    const card = document.getElementById('plan-detail-report-card');
    card.innerHTML = `
        <header class="plan-detail-report-head">
            <span class="plan-detail-report-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
            <div><h2>${resolved ? 'Reporte del trabajo' : 'Trabajo pendiente'}</h2><p>${escapeHtml(stop?.name || detail.town || 'Detalle del plan')}</p></div>
            <div class="plan-detail-report-head-actions">${editButton}<button type="button" class="btn bgh" onclick="CM('plan-detail-report-mo')">Cerrar</button></div>
        </header>
        <div class="plan-detail-report-grid">
            ${field('•', 'Cliente', detail.clientName || 'Sin nombre')}
            ${field('•', 'Teléfono', report.phone || detail.clientPhone || detail.phone || 'Sin teléfono')}
            ${field('•', 'Lugar', detail.nodeName || detail.equipmentName || detail.town || stop?.name || 'Sin lugar')}
            ${field('•', 'Ubicación', location)}
            ${field(resolved && !noDone ? '✓' : '•', 'Estado', statusText, resolved && !noDone ? 'success' : (noDone ? 'warning' : 'pending'))}
            ${field('•', resolved ? 'Técnico' : 'Capturado por', resolved ? (report.completedByName || detail.completedByName || 'Sin técnico') : (detail.createdByName || detail.createdByUsername || 'Sin registro'))}
            ${field('•', resolved ? 'Fecha de atención' : 'Fecha programada', dateValue ? formatPlanDateTime(dateValue) : 'Sin fecha')}
            ${report.modifiedAt || detail.modifiedAt ? field('•', 'Última modificación', formatPlanDateTime(report.modifiedAt || detail.modifiedAt)) : ''}
            ${field('•', 'Tipo de trabajo', typeLabels[detail.visitType] || detail.visitType || 'Sin tipo')}
            ${field('•', 'Prioridad', pl(detail.priority || 'media'))}
            ${field('•', 'Categoría', planCategoryLabel(getPlanDetailCategory(detail)))}
        </div>
        <section class="plan-detail-report-wide"><span>•</span><div><small>Trabajo solicitado</small><strong>${escapeHtml(requested)}</strong></div></section>
        ${resolved && (noDone || completedWork || report.observations || report.materialUsed) ? `<section class="plan-detail-report-wide ${noDone ? 'warning' : 'success'}"><span>${noDone ? '•' : '✓'}</span><div>${noDone || completedWork ? `<small>${noDone ? 'Motivo reportado' : 'Trabajo realizado'}</small><strong>${escapeHtml(noDone ? (report.reason || 'No se capturó un motivo') : completedWork)}</strong>` : ''}${report.observations ? `<p><b>Notas:</b> ${escapeHtml(report.observations)}</p>` : ''}${report.materialUsed ? `<p><b>Material usado:</b> ${escapeHtml(report.materialUsed)}</p>` : ''}</div></section>` : (!resolved ? '<div class="plan-detail-report-pending-note">Este trabajo sigue pendiente con los datos registrados.</div>' : '')}
        ${photos.length ? `<section class="plan-detail-report-evidence"><small>Fotos del trabajo</small><div>${photos.map((photo, index) => `<button type="button" onclick="openPlanEvidenceGallery('${escapeAttr(galleryKey)}',${index})"><img src="${escapeAttr(photo)}" alt="Evidencia ${index + 1}"><span>${index + 1}</span></button>`).join('')}</div></section>` : (resolved ? '<div class="plan-detail-report-no-evidence">Sin fotografías de evidencia.</div>' : '')}
        <footer class="plan-detail-report-footer"><span>Folio: <b>${escapeHtml(getDetailFolio(detail))}</b></span><button type="button" class="btn bgh" onclick="CM('plan-detail-report-mo')">Cerrar</button></footer>`;
    OM('plan-detail-report-mo');
}

function editPlanDetailFromReport(stopId, day, detailId) {
    const detail = (state.workOrders || []).find(item => item.id === detailId && !item.deletedAt);
    if (detail && ['completada', 'no_realizado'].includes(detail.status) && !canManagePlanStops()) {
        return notify('No tienes permiso para editar este detalle finalizado.', 'warn');
    }
    CM('plan-detail-report-mo');
    openPlanDetailEditor(detailId, stopId, day);
}

function planDetailEditorOptions(items, selected, label) {
    return items.map(item => `<option value="${escapeAttr(item.id)}" ${item.id === selected ? 'selected' : ''}>${escapeHtml(label(item))}</option>`).join('');
}

function openPlanDetailEditor(detailId, stopId = '', day = selectedDay) {
    const detail = (state.workOrders || []).find(item => item.id === detailId && !item.deletedAt);
    if (!detail) return notify('No se encontro el detalle solicitado.', 'err');
    const equipment = (state.equipment || []).filter(item => !item.deletedAt);
    const nodes = (state.nodes || []).filter(item => !item.deletedAt);
    const zones = [...new Set([...(state.regions || []).map(item => item.n || item.code || item.id || item), ...(state.equipment || []).map(item => item.region), ...(state.nodes || []).map(item => item.zone), detail.region].filter(Boolean))].sort();
    let modal = document.getElementById('plan-detail-editor-mo');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', '<div class="mo plan-detail-editor-mo" id="plan-detail-editor-mo"><form class="plan-detail-editor-card" id="plan-detail-editor-card"></form></div>');
        modal = document.getElementById('plan-detail-editor-mo');
        modal.addEventListener('click', event => { if (event.target === modal) CM('plan-detail-editor-mo'); });
    }
    const selectedNode = detail.nodeId ? nodes.find(item => item.id === detail.nodeId) : null;
    const selectedTargetLabel = selectedNode ? getNodeLabel(selectedNode) : (detail.nodeName || detail.equipmentName || equipment.find(item => item.id === detail.equipmentId)?.name || detail.town || '');
    const targetOptions = equipment.map(item => `<option value="${escapeAttr(item.name || item.ip || 'Antena')}" data-type="equipment" data-id="${escapeAttr(item.id)}">Antena</option>`).concat(nodes.map(item => `<option value="${escapeAttr(getNodeLabel(item))}" data-type="node" data-id="${escapeAttr(item.id)}">Pueblo</option>`)).join('');
    const field = (icon, label, control, wide = false) => `<label class="plan-detail-editor-field ${wide ? 'wide' : ''}"><span class="plan-report-field-icon">${icon}</span><span><small>${label}</small>${control}</span></label>`;
    const card = document.getElementById('plan-detail-editor-card');
    card.innerHTML = `
        <header class="plan-detail-report-head"><span class="plan-detail-report-icon">&#128203;</span><div><h2>Editar detalle pendiente</h2><p>${escapeHtml(getDetailFolio(detail))} &middot; ${escapeHtml(detail.nodeName || detail.equipmentName || detail.town || 'Sin lugar')}</p></div><button type="button" class="btn bgh" onclick="CM('plan-detail-editor-mo')">Cerrar &nbsp; &times;</button></header>
        <div class="plan-detail-editor-grid">
            ${field('&#128100;', 'Nombre del cliente', `<input id="pde-client" value="${escapeAttr(detail.clientName || '')}" placeholder="Nombre del cliente">`)}
            ${field('&#9742;', 'Numero telefonico (opcional)', `<input id="pde-phone" type="tel" value="${escapeAttr(detail.clientPhone || detail.phone || '')}" placeholder="Numero de telefono (opcional)">`)}
            ${field('&#128205;', 'Pueblo o antena', `<input id="pde-target" list="pde-target-options" value="${escapeAttr(selectedTargetLabel)}" placeholder="Escribe para buscar o agregar"><datalist id="pde-target-options">${targetOptions}</datalist>`)}
            ${field('&#8982;', 'Ubicacion / coordenadas', `<input id="pde-location" value="${escapeAttr(detail.detailLocation || '')}" placeholder="17.273400, -98.788000 o enlace de Maps">`)}
            ${field('&#128506;', 'Zona', `<select id="pde-zone"><option value="">Sin zona</option>${zones.map(zone => `<option value="${escapeAttr(zone)}" ${zone === detail.region ? 'selected' : ''}>${escapeHtml(zone)}</option>`).join('')}</select>`)}
            ${field('&#9881;', 'Tipo de trabajo', `<select id="pde-type">${[['comunidad', 'Comunidad'], ['torre', 'Torre'], ['troncal', 'Troncal'], ['punto_venta', 'Punto de venta']].map(([value, label]) => `<option value="${value}" ${value === detail.visitType ? 'selected' : ''}>${label}</option>`).join('')}</select>`)}
            ${field('&#9670;', 'Categoria', `<select id="pde-category">${['otro', 'instalacion', 'alineacion_antena', 'antena_desconectada', 'antena_quemada', 'antena_inalambrica', 'reubicacion_antena', 'resurtir_antena', 'solicitud_respaldo'].map(value => `<option value="${value}" ${value === getPlanDetailCategory(detail) ? 'selected' : ''}>${escapeHtml(planCategoryLabel(value))}</option>`).join('')}</select>`)}
            ${field('&#9873;', 'Prioridad', `<select id="pde-priority">${['baja', 'media', 'alta', 'muy_alta'].map(value => `<option value="${value}" ${value === (detail.priority || 'media') ? 'selected' : ''}>${escapeHtml(pl(value))}</option>`).join('')}</select>`)}
            ${field('&#128203;', 'Detalle solicitado', `<textarea id="pde-title" rows="3">${escapeHtml(detail.title || '')}</textarea>`, true)}
            ${field('&#128221;', 'Notas / observaciones', `<textarea id="pde-description" rows="2" placeholder="Notas opcionales">${escapeHtml(detail.description || detail.desc || '')}</textarea>`, true)}
        </div>
        <div class="plan-detail-editor-dates"><span><small>Fecha de registro</small><b>${escapeHtml(formatPlanDateTime(detail.createdAt) || 'Sin fecha')}</b></span><span><small>Ultima edicion</small><b>${escapeHtml(formatPlanDateTime(detail.updatedAt) || 'Sin ediciones')}</b></span></div>
        <footer class="plan-detail-report-footer"><span>ID de orden: <b>${escapeHtml(getDetailFolio(detail))}</b></span><div><button type="button" class="btn bgh" onclick="CM('plan-detail-editor-mo')">Cancelar</button><button type="submit" class="btn bc">&#128190; Guardar cambios</button></div></footer>`;
    card.onsubmit = event => { event.preventDefault(); savePlanDetailEditor(detailId, stopId, day); };
    OM('plan-detail-editor-mo');
}

async function savePlanDetailEditor(detailId, stopId, day) {
    const detail = (state.workOrders || []).find(item => item.id === detailId && !item.deletedAt);
    if (!detail) return;
    const title = document.getElementById('pde-title').value.trim();
    const parsedLocation = parseOptionalLocation(document.getElementById('pde-location').value);
    if (!title) return notify('Escribe el detalle solicitado.', 'err');
    if (!parsedLocation.valid) return notify('La ubicacion no es valida.', 'err');
    const targetInput = document.getElementById('pde-target');
    const typedTarget = targetInput.value.trim();
    const selectedTarget = Array.from(document.getElementById('pde-target-options')?.options || []).find(option => option.value === typedTarget);
    const targetType = selectedTarget?.dataset.type || '';
    const targetId = selectedTarget?.dataset.id || '';
    const eq = targetType === 'equipment' ? (state.equipment || []).find(item => item.id === targetId) : null;
    const node = targetType === 'node' ? (state.nodes || []).find(item => item.id === targetId) : null;
    detail.title = title;
    detail.description = document.getElementById('pde-description').value.trim();
    detail.desc = detail.description;
    detail.clientName = document.getElementById('pde-client').value.trim();
    detail.clientPhone = document.getElementById('pde-phone').value.trim();
    detail.category = document.getElementById('pde-category').value;
    detail.priority = document.getElementById('pde-priority').value;
    detail.visitType = document.getElementById('pde-type').value;
    detail.region = document.getElementById('pde-zone').value || eq?.region || node?.zone || '';
    detail.detailLocation = parsedLocation.location;
    detail.lat = parsedLocation.lat;
    detail.lng = parsedLocation.lng;
    detail.equipmentId = eq?.id || '';
    detail.equipmentName = eq?.name || '';
    detail.nodeId = node?.id || '';
    detail.nodeCode = node?.nodeCode || '';
    detail.nodeName = node ? getNodeLabel(node) : '';
    detail.town = node?.town || (!eq ? typedTarget : '');
    const nowIso = new Date().toISOString();
    detail.modifiedAt = nowIso;
    detail.updatedAt = nowIso;
    const actorUser = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    detail.modifiedByName = actorUser?.name || actorUser?.username || 'Usuario';
    setUpdatedAudit(detail, 'edito detalle pendiente');
    const saved = await saveDB();
    if (!saved) return notify('No se pudo guardar el detalle.', 'err');
    CM('plan-detail-editor-mo');
    renderPlan();
    notify('Detalle actualizado');
    openPlanDetailReport(detailId, stopId, day);
}

function getPlanDetailCategory(detail) {
    if (detail?.category) return detail.category;
    const text = normalizeName([detail?.title, detail?.description].filter(Boolean).join(' '));
    if (/nueva instalacion|instalacion nueva/.test(text)) return 'instalacion';
    if (/alinear|alineacion/.test(text)) return 'alineacion_antena';
    if (/desconect/.test(text)) return 'antena_desconectada';
    if (/quemad/.test(text)) return 'antena_quemada';
    if (/reubica|cambio de lugar/.test(text)) return 'reubicacion_antena';
    if (/resurt|surtir|reabastec/.test(text)) return 'resurtir_antena';
    if (/respaldo/.test(text)) return 'solicitud_respaldo';
    return 'otro';
}

function planCategoryLabel(value) {
    return ({
        instalacion: 'Nueva instalación',
        alineacion_antena: 'Alineacion de antena',
        antena_desconectada: 'Antena desconectada',
        antena_quemada: 'Equipo quemado',
        antena_inalambrica: 'Antena inalambrica',
        reubicacion_antena: 'Reubicacion de antena',
        resurtir_antena: 'Resurtir antena',
        solicitud_respaldo: 'Solicitud de respaldo',
        otro: 'Otro'
    })[value] || 'Otro';
}

function renderAdminTechReport(detail) {
    const report = detail.technicianReport || {};
    if (!report || (!report.solution && !report.reason && !report.materialUsed && !report.completedAt)) return '';
    const photos = getAdminTechReportPhotos(report);
    const photo = photos.length ? renderEvidenceThumbnails(photos, detail.id) : '<span class="no-evidence">Sin foto</span>';
    return `<div class="admin-tech-report"><div class="admin-tech-report-copy"><b>Reporte técnico:</b> ${report.result === 'no_realizado' ? 'No realizado' : 'Terminado'}${report.solution ? ` · Trabajo realizado: ${escapeHtml(report.solution)}` : ''}${report.observations ? ` · Observaciones: ${escapeHtml(report.observations)}` : ''}${report.phone ? ` · Teléfono: ${escapeHtml(report.phone)}` : ''}${report.reason ? ` · Motivo: ${escapeHtml(report.reason)}` : ''}${report.materialUsed ? ` · Material: ${escapeHtml(report.materialUsed)}` : ''}</div>${photo}</div>`;
}

function renderEvidenceThumbnails(photos, detailId) {
    const key = String(detailId || `gallery-${planEvidenceGalleries.size}`);
    planEvidenceGalleries.set(key, photos.slice());
    return `<div class="evidence-thumbnails">${photos.map((photo, index) => `
        <button type="button" class="evidence-thumb" onclick="openPlanEvidenceGallery('${escapeAttr(key)}',${index})" title="Abrir evidencia ${index + 1}">
            <img src="${escapeAttr(photo)}" alt="Evidencia ${index + 1}" loading="lazy">
            <span>${index + 1}</span>
        </button>`).join('')}</div>`;
}

function openPlanEvidenceGallery(key, index = 0) {
    openEvidenceGallery(planEvidenceGalleries.get(String(key)) || [], index);
}

function getStopHistorySummary(stop) {
    const history = getStopResolvedHistory(stop);
    if (!history.length) return null;
    const last = history[0];
    return {
        count: history.length,
        lastDate: formatPlanDateTime(last.completedAt || last.updatedAt || last.createdAt) || 'Sin fecha'
    };
}

function getPlanDetailCompletionTime(detail) {
    const value = detail?.completedAt || detail?.technicianReport?.completedAt || '';
    const time = value ? new Date(value).getTime() : NaN;
    return Number.isFinite(time) ? time : NaN;
}

function wasDetailResolvedDuringStop(detail, stop) {
    if (!detail || !stop || !['completada', 'no_realizado'].includes(detail.status || '')) return false;
    const joinedAt = new Date(stop.planJoinedAt || stop.createdAt || '').getTime();
    const completedAt = getPlanDetailCompletionTime(detail);

    // Los planes nuevos nunca heredan trabajos terminados antes de agregar
    // la antena o el pueblo. Para datos antiguos sin fechas se conserva el
    // vínculo explícito únicamente cuando tampoco existe fecha de ingreso.
    if (Number.isFinite(joinedAt)) return Number.isFinite(completedAt) && completedAt >= joinedAt;
    return (stop.detailIds || []).includes(detail.id);
}

function getStopResolvedHistory(stop) {
    const explicitIds = new Set(stop?.detailIds || []);
    const isResolvedForThisStop = detail => {
        if (!detail || detail.deletedAt) return false;
        if (detail.status === 'completada') return explicitIds.has(detail.id) || wasDetailResolvedDuringStop(detail, stop);
        if (detail.status === 'no_realizado') return wasNoRealizadoInCurrentStop(detail, stop);
        return false;
    };
    const resolved = (state.workOrders || []).filter(detail => {
        if (!isResolvedForThisStop(detail)) return false;
        if (explicitIds.has(detail.id)) return true;
        if (stop.equipmentId && !detail.nodeId && detail.equipmentId === stop.equipmentId) return true;
        return !!(stop.nodeId && detail.nodeId === stop.nodeId);
    });

    if (explicitIds.size > 0 && typeof getGlobalWorkOrdersCache === 'function') {
        const globalCache = getGlobalWorkOrdersCache();
        explicitIds.forEach(id => {
            if (!resolved.some(r => r.id === id) && globalCache[id] && isResolvedForThisStop(globalCache[id])) {
                resolved.push(globalCache[id]);
            }
        });
    }

    return resolved.sort((a, b) => new Date(b.completedAt || b.updatedAt || b.createdAt || 0) - new Date(a.completedAt || a.updatedAt || a.createdAt || 0));
}

function getAdminTechReportPhotos(report = {}) {
    const photos = [];
    if (Array.isArray(report.evidencePhotos)) photos.push(...report.evidencePhotos.filter(Boolean));
    if (report.evidencePhoto && !photos.includes(report.evidencePhoto)) photos.push(report.evidencePhoto);
    return photos;
}

function renderStopTechReportSummary(details = []) {
    const reported = details.filter(detail => {
        const report = detail.technicianReport || {};
        return detail.status === 'completada' || detail.status === 'no_realizado' || !!report.completedAt;
    });
    if (!reported.length) return '';
    return `
        <div class="plan-stop-report-summary">
            ${reported.slice(0, 4).map(detail => {
        const report = detail.technicianReport || {};
        const isNoDone = detail.status === 'no_realizado' || report.result === 'no_realizado';
        const photos = getAdminTechReportPhotos(report);
        return `
                    <div class="plan-stop-report-item ${isNoDone ? 'not-done' : 'done'}">
                        <span class="badge ${isNoDone ? 'ba' : 'bg2'}">${isNoDone ? 'No realizado' : 'Terminado'}</span>
                        <strong>${escapeHtml(detail.title || 'Detalle')}</strong>
                        ${detail.clientName ? `<small>Cliente: ${escapeHtml(detail.clientName)}</small>` : ''}
                        ${report.solution ? `<small>Solución: ${escapeHtml(report.solution)}</small>` : ''}
                        ${report.reason ? `<small>Motivo: ${escapeHtml(report.reason)}</small>` : ''}
                        ${report.materialUsed ? `<small>Material: ${escapeHtml(report.materialUsed)}</small>` : ''}
                        ${photos.length ? renderEvidenceThumbnails(photos, `${detail.id}-summary`) : '<small>Sin evidencia</small>'}
                    </div>`;
    }).join('')}
            ${reported.length > 4 ? `<small class="plan-stop-report-more">+ ${reported.length - 4} reportes más en Ver detalles</small>` : ''}
        </div>`;
}

function focusNewestStartedStop(stops) {
    const started = (stops || []).find(stop => stop.startedAt && !stop.adminReleasedAt) ||
        (stops || []).find(stop => stop.startedAt);
    const startedId = started?.id || '';
    if (!startedId) {
        lastFocusedStartedStopId = '';
        return;
    }
    if (lastFocusedStartedStopId === startedId) return;
    lastFocusedStartedStopId = startedId;
    setTimeout(() => {
        const card = Array.from(document.querySelectorAll('.stop-card'))
            .find(node => node.dataset.stopId === startedId);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
}

async function openPlanStopModal(day = selectedDay) {
    if (!canManagePlanStops()) return notify('Solo un administrador puede agregar paradas', 'err');
    if (!selectedTechId) {
        notify('Primero agrega o selecciona un tecnico', 'err');
        return;
    }

    await loadDB({ showOverlay: false, preferCache: true });
    if (isTechnicianPlanView()) {
        ensureLoggedTechnicianRecord();
    }
    normalizeWeekPlan();
    selectedDay = selectedTechId === SHARED_PLAN_ID ? 'general' : day;
    renderPlanStopPicker();
    OM('plan-stop-mo');
    return;
}

let planStopPickerType = 'equipment';
let planStopPickerSelected = null;

function renderPlanStopPicker() {
    const card = document.querySelector('#plan-stop-mo>.md');
    if (!card) return;
    card.className = 'md plan-stop-picker-card';
    card.innerHTML = `
      <header class="plan-stop-picker-head"><div><h2>Buscar antena o pueblo</h2><p>Selecciona una antena, torre o pueblo para agregar la parada</p></div><button type="button" class="plan-stop-picker-close" onclick="CM('plan-stop-mo')" aria-label="Cerrar">&times;</button></header>
      <div class="plan-stop-picker-tabs"><button type="button" class="${planStopPickerType === 'equipment' ? 'active' : ''}" onclick="setPlanStopPickerType('equipment')">&#128225; Antena / Torre</button><button type="button" class="${planStopPickerType === 'node' ? 'active' : ''}" onclick="setPlanStopPickerType('node')">&#8962; Pueblo</button></div>
      <label class="plan-stop-picker-search"><span>&#128269;</span><input id="plan-stop-picker-query" placeholder="Escribe nombre, clave o IP..." oninput="renderPlanStopPickerResults()"></label>
      <div class="plan-stop-picker-filters"><button type="button" class="active">&#10148; Todos</button></div>
      <div class="plan-stop-picker-divider"></div><strong class="plan-stop-picker-label">Resultados</strong>
      <div id="plan-stop-picker-results" class="plan-stop-picker-results"></div>
      <div id="plan-stop-picker-selected" class="plan-stop-picker-selected-wrap"></div>`;
    renderPlanStopPickerResults();
    requestAnimationFrame(() => document.getElementById('plan-stop-picker-query')?.focus());
}

function setPlanStopPickerType(type) {
    planStopPickerType = type === 'node' ? 'node' : 'equipment';
    planStopPickerSelected = null;
    renderPlanStopPicker();
}

function getPlanStopPickerItems() {
    if (planStopPickerType === 'node') return (state.nodes || []).filter(item => !item.deletedAt).map(item => ({ id: item.id, type: 'node', title: getNodeLabel(item), subtitle: `Comunidad · ${getNodePlanDetails(item.id).length} detalles`, search: [getNodeLabel(item), item.nodeCode, item.town, item.zone].join(' ') }));
    return (state.equipment || []).filter(item => !item.deletedAt).map(item => {
        const linkedNodes = typeof getAllLinkedNodesForEquipment === 'function' ? getAllLinkedNodesForEquipment(item.id) : [];
        const linkedCount = linkedNodes.length;
        const linkedText = linkedCount ? ` · ${linkedCount} nodo(s) vinculado(s)` : '';
        return {
            id: item.id,
            type: 'equipment',
            title: item.name || 'Antena',
            subtitle: `Antena / Torre${item.ip ? ` · IP ${item.ip}` : (item.region ? ` · Zona ${getZoneLabel(item.region)}` : '')}${linkedText}`,
            search: [item.name, item.ip, item.region, item.ssid, ...linkedNodes.map(n => getNodeLabel(n))].join(' ')
        };
    });
}

function getNodePlanDetails(nodeId) {
    return (state.workOrders || []).filter(item => !item.deletedAt && item.nodeId === nodeId);
}

function renderPlanStopPickerResults() {
    const query = normalizeName(document.getElementById('plan-stop-picker-query')?.value || '');
    const items = getPlanStopPickerItems().filter(item => !query || normalizeName(item.search).includes(query)).slice(0, 60);
    const box = document.getElementById('plan-stop-picker-results');
    if (!box) return;
    box.innerHTML = items.length ? items.map(item => `<div class="plan-stop-picker-result"><span class="${item.type}">${item.type === 'node' ? '&#8962;' : '&#128225;'}</span><div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.subtitle)}</small></div><button type="button" onclick="selectPlanStopPickerItem('${escapeAttr(item.type)}','${escapeAttr(item.id)}')" aria-label="Seleccionar ${escapeAttr(item.title)}">+</button></div>`).join('') : '<div class="empty-state">No se encontraron resultados.</div>';
    renderPlanStopPickerSelected();
}

function selectPlanStopPickerItem(type, id) {
    planStopPickerSelected = getPlanStopPickerItems().find(item => item.type === type && item.id === id) || null;
    if (!planStopPickerSelected) {
        notify('No se pudo encontrar la parada seleccionada', 'err');
        return;
    }
    addSelectedPlanStop();
}

function renderPlanStopPickerSelected() {
    const box = document.getElementById('plan-stop-picker-selected');
    if (!box) return;
    if (!planStopPickerSelected) { box.innerHTML = ''; return; }
    const item = planStopPickerSelected;
    let linkedInfo = '';
    if (item.type === 'equipment') {
        const linked = typeof getAllLinkedNodesForEquipment === 'function' ? getAllLinkedNodesForEquipment(item.id) : [];
        if (linked.length) {
            linkedInfo = `<div style="font-size:12px;color:#0284c7;font-weight:600;margin-top:4px">&#10003; Incluye automáticamente ${linked.length} nodo(s) vinculado(s): ${escapeHtml(linked.map(getNodeLabel).join(', '))}</div>`;
        }
    }
    box.innerHTML = `<div class="plan-stop-picker-divider"></div><strong class="plan-stop-picker-label">Seleccionado:</strong><div class="plan-stop-picker-result selected"><span class="${item.type}">${item.type === 'node' ? '&#8962;' : '&#128225;'}</span><div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.subtitle)}</small>${linkedInfo}</div><button type="button" onclick="planStopPickerSelected=null;renderPlanStopPickerSelected()" aria-label="Quitar">&times;</button></div><button type="button" class="btn bc plan-stop-picker-add" onclick="addSelectedPlanStop()">Agregar parada</button>`;
}

function addSelectedPlanStop() {
    if (!canManagePlanStops()) return notify('Solo un administrador puede agregar paradas', 'err');
    if (!planStopPickerSelected) return;
    const item = planStopPickerSelected;
    CM('plan-stop-mo');
    if (item.type === 'node') addNodeStopFromMap(item.id);
    else addEquipmentStopFromMap(item.id);
    planStopPickerSelected = null;
}

async function openLegacyPlanStopModal(day = selectedDay) {
    await loadDB({ showOverlay: false, preferCache: true });
    if (isTechnicianPlanView()) {
        ensureLoggedTechnicianRecord();
    }
    normalizeWeekPlan();
    renderEquipmentDatalist();
    renderMaterialDatalist();
    selectedEquipmentId = '';
    document.getElementById('stop-day').value = day;
    document.getElementById('stop-type').value = 'equipment';
    document.getElementById('stop-equipment-search').value = '';
    document.getElementById('manual-name').value = '';
    document.getElementById('manual-lat').value = '';
    document.getElementById('manual-lng').value = '';
    document.getElementById('stop-notes').value = '';
    const clientInput = document.getElementById('stop-detail-client');
    if (clientInput) clientInput.value = '';
    const phoneInput = document.getElementById('stop-detail-phone');
    if (phoneInput) phoneInput.value = '';
    document.getElementById('stop-detail-location').value = '';
    const materialInput = document.getElementById('stop-material');
    if (materialInput) materialInput.value = '';
    renderPlanTechTargetSelect(selectedTechId);
    document.getElementById('equipment-preview').style.display = 'none';
    document.getElementById('equipment-details').innerHTML = '';
    document.getElementById('plan-modal-sub').textContent = `${getSelectedTech()?.nombre || ''} · ${dayLabel(day)}`;
    toggleStopType();
    OM('plan-stop-mo');
}

function toggleStopType() {
    const type = document.getElementById('stop-type').value;
    document.getElementById('equipment-fields').style.display = type === 'equipment' ? 'block' : 'none';
    document.getElementById('manual-fields').style.display = type === 'manual' ? 'block' : 'none';

    if (type === 'manual') {
        setTimeout(initCaptureMap, 150);
    }
}

function selectEquipmentFromInput() {
    const value = document.getElementById('stop-equipment-search').value.trim().toLowerCase();
    if (!value) {
        selectedEquipmentId = '';
        renderSelectedEquipment(null);
        return;
    }
    const eq = (state.equipment || []).find(e => e.name.toLowerCase() === value || (e.ip && e.ip.toLowerCase() === value))
        || (state.equipment || []).find(e => e.name.toLowerCase().includes(value) || (e.ip && e.ip.toLowerCase().includes(value)));
    selectedEquipmentId = eq ? eq.id : '';
    renderSelectedEquipment(eq);
}

function renderSelectedEquipment(eq) {
    const preview = document.getElementById('equipment-preview');
    const detailsBox = document.getElementById('equipment-details');

    if (!eq) {
        preview.style.display = 'none';
        detailsBox.innerHTML = '';
        return;
    }

    const activeDetails = getEquipmentPlanDetailGroups(eq.id).all;
    const linkedNodes = getAllLinkedNodesForEquipment(eq.id);
    preview.style.display = 'block';
    preview.innerHTML = `<strong>${escapeHtml(eq.name)}</strong><br><span class="mono">${escapeHtml(eq.ip || 'Sin IP')}</span> · ${escapeHtml(rById(eq.region).n)} · ${safeFloat(eq.lat).toFixed(5)}, ${safeFloat(eq.lng).toFixed(5)}${linkedNodes.length ? `<br><small style="color:#0284c7"><strong>&#10003; Nodos vinculados que se agregarán automáticamente:</strong> ${escapeHtml(linkedNodes.map(getNodeLabel).join(', '))}</small>` : ''}`;

    detailsBox.innerHTML = `
        <div class="sbt" style="margin-top:12px">Detalles pendientes de esta antena y nodos vinculados</div>
        ${activeDetails.length ? activeDetails.map(w => `
            <label class="detail-check">
                <input type="checkbox" class="detail-pick" value="${w.id}" checked>
                <span><strong style="color:${pc(w.priority)}">${pl(w.priority)}</strong>${w.clientName ? ` · Cliente: ${escapeHtml(w.clientName)}` : ''}<br>${escapeHtml(w.title)}${w.desc ? `<br><small>${escapeHtml(w.desc)}</small>` : ''}${w.detailLocation ? `<br><small>${escapeHtml(getLocationDisplay(w.detailLocation).label)}</small>` : ''}</span>
            </label>`).join('') : '<div class="plan-empty">Esta antena no tiene detalles pendientes. Puedes escribir uno nuevo abajo.</div>'}`;
    decoratePlanDetailOrigins(detailsBox, activeDetails);
}

function decoratePlanDetailOrigins(container, details) {
    if (!container) return;
    container.querySelectorAll('.detail-check').forEach(label => {
        const detailId = label.querySelector('.detail-pick')?.value || '';
        const detail = (details || []).find(item => item.id === detailId);
        const span = label.querySelector('span');
        if (!detail || !span || span.dataset.originAdded) return;
        span.dataset.originAdded = '1';
        span.insertAdjacentHTML('afterbegin', `<small class="detail-origin-tag">${escapeHtml(getPlanDetailOriginLabel(detail))}</small>`);
    });
}

function isPendingPlanDetail(detail) {
    return detail && !detail.deletedAt && !['completada', 'eliminada'].includes(detail.status || '');
}

function getPlanDetailOriginLabel(detail) {
    if (!detail) return 'Detalle';
    if (detail.nodeId) {
        const node = (state.nodes || []).find(item => item.id === detail.nodeId && !item.deletedAt);
        return `Pueblo: ${getNodeLabel(node) || detail.nodeName || detail.nodeCode || 'sin nombre'}`;
    }
    if (detail.equipmentId) {
        const eq = (state.equipment || []).find(item => item.id === detail.equipmentId && !item.deletedAt);
        return `Antena: ${eq?.name || detail.equipmentName || 'sin nombre'}`;
    }
    return 'Manual';
}

function getAllLinkedNodesForEquipment(equipmentId) {
    if (!equipmentId) return [];
    const eq = (state.equipment || []).find(e => e.id === equipmentId && !e.deletedAt);
    const nodeMap = new Map();

    if (typeof getEquipmentLinkedNodes === 'function') {
        try {
            const fromApi = getEquipmentLinkedNodes(equipmentId) || [];
            fromApi.forEach(n => {
                if (n && n.id && !n.deletedAt) nodeMap.set(n.id, n);
            });
        } catch (_) { }
    }

    if (eq && Array.isArray(eq.linkedNodeIds)) {
        eq.linkedNodeIds.forEach(id => {
            if (!id || nodeMap.has(id)) return;
            const node = (state.nodes || []).find(n => n && n.id === id && !n.deletedAt);
            if (node) nodeMap.set(node.id, node);
        });
    }

    (state.nodes || []).forEach(node => {
        if (node && !node.deletedAt && node.equipmentId === equipmentId) {
            nodeMap.set(node.id, node);
        }
    });

    (state.workOrders || []).forEach(wo => {
        if (wo && !wo.deletedAt && wo.equipmentId === equipmentId && wo.nodeId && !nodeMap.has(wo.nodeId)) {
            const node = (state.nodes || []).find(n => n && n.id === wo.nodeId && !n.deletedAt);
            if (node) nodeMap.set(node.id, node);
        }
    });

    return Array.from(nodeMap.values());
}

function getEquipmentPlanDetailGroups(equipmentId, onlyIds = null) {
    const selected = (Array.isArray(onlyIds) && onlyIds.length) ? new Set(onlyIds) : null;
    const linkedNodes = getAllLinkedNodesForEquipment(equipmentId);
    const linkedNodeIds = new Set(linkedNodes.map(n => n.id));
    if (typeof getEquipmentLinkedNodeIds === 'function') {
        try {
            getEquipmentLinkedNodeIds(equipmentId).forEach(id => linkedNodeIds.add(id));
        } catch (_) { }
    }
    const antenna = [];
    const byNode = new Map();
    linkedNodes.forEach(node => {
        byNode.set(node.id, []);
    });
    (state.workOrders || []).forEach(w => {
        if (!isPendingPlanDetail(w)) return;
        if (selected && !selected.has(w.id)) return;
        if (w.nodeId && linkedNodeIds.has(w.nodeId)) {
            if (!byNode.has(w.nodeId)) byNode.set(w.nodeId, []);
            byNode.get(w.nodeId).push(w);
            return;
        }
        if (w.equipmentId === equipmentId) antenna.push(w);
    });
    const sort = list => sortDetailsByPriority(list);
    const nodes = Array.from(byNode.entries()).map(([nodeId, details]) => ({ nodeId, details: sort(details) }));
    return {
        antenna: sort(antenna),
        nodes,
        all: sort([...antenna, ...nodes.flatMap(group => group.details)])
    };
}

function buildLinkedNodeStops(eq, selectedDetailIds, targetTechId, materialPlanned, day = selectedDay) {
    if (!eq) return [];
    const linkedNodes = getAllLinkedNodesForEquipment(eq.id);
    if (!linkedNodes.length) return [];

    const existingStops = getPlanStopsRef(targetTechId, day).filter(stop => !stop.deletedAt);
    const existingNodeIds = new Set(existingStops.map(stop => stop.nodeId).filter(Boolean));
    const existingNames = new Set(existingStops.map(stop => normalizeName(stop.name || '')).filter(Boolean));
    const addedNodeIds = new Set();

    const allowedDetailIds = Array.isArray(selectedDetailIds) ? new Set(selectedDetailIds) : null;

    const stops = [];
    linkedNodes.forEach(node => {
        if (!node || node.deletedAt) return;
        const nodeLabel = getNodeLabel(node);
        if (existingNodeIds.has(node.id) || existingNames.has(normalizeName(nodeLabel)) || addedNodeIds.has(node.id)) {
            return;
        }
        addedNodeIds.add(node.id);

        const nodePendingOrders = (state.workOrders || []).filter(order => {
            if (!isPendingPlanDetail(order)) return false;
            if (order.nodeId !== node.id) return false;
            if (allowedDetailIds !== null) return allowedDetailIds.has(order.id);
            return true;
        });
        const sortedOrders = sortDetailsByPriority(nodePendingOrders);

        const lat = !isNaN(safeFloat(node.lat)) ? safeFloat(node.lat) : safeFloat(eq.lat);
        const lng = !isNaN(safeFloat(node.lng)) ? safeFloat(node.lng) : safeFloat(eq.lng);

        stops.push({
            id: gid('p'),
            type: 'node',
            nodeId: node.id,
            equipmentId: '',
            parentEquipmentId: eq.id,
            name: nodeLabel,
            lat,
            lng,
            region: node.region || node.zone || eq.region || '',
            detailIds: sortedOrders.map(order => order.id),
            notes: '',
            materialPlanned: materialPlanned || '',
            assignedTechId: targetTechId === SHARED_PLAN_ID ? '' : targetTechId,
            siteStatus: 'pendiente',
            createdAt: new Date().toISOString()
        });
    });

    return stops.filter(stop => stop && !isNaN(stop.lat) && !isNaN(stop.lng));
}

function savePlanStop() {
    const type = document.getElementById('stop-type').value;
    const day = document.getElementById('stop-day').value;
    const notes = document.getElementById('stop-notes').value.trim();
    const clientName = document.getElementById('stop-detail-client')?.value.trim() || '';
    const clientPhone = document.getElementById('stop-detail-phone')?.value.trim() || '';
    const detailLocation = parseOptionalLocation(document.getElementById('stop-detail-location')?.value);
    const visitType = document.getElementById('stop-visit-type').value;
    const priority = document.getElementById('stop-priority').value;
    const detailIds = Array.from(document.querySelectorAll('.detail-pick:checked')).map(el => el.value);
    const targetTechId = document.getElementById('stop-tech-target')?.value || selectedTechId || SHARED_PLAN_ID;
    const materialPlanned = document.getElementById('stop-material')?.value.trim() || '';
    let stop;

    if (type === 'equipment') {
        const eq = (state.equipment || []).find(e => e.id === selectedEquipmentId);
        if (!eq) {
            notify('Selecciona una antena registrada', 'err');
            return;
        }

        let createdId = '';
        if (notes) {
            createdId = createWorkOrderForStop({
                title: notes,
                clientName,
                clientPhone,
                equipmentId: eq.id,
                region: eq.region || '',
                visitType,
                priority,
                materialPlanned,
                ...detailLocation
            });
        }

        const linkedNodeIds = typeof getEquipmentLinkedNodeIds === 'function' ? getEquipmentLinkedNodeIds(eq.id) : (Array.isArray(eq.linkedNodeIds) ? eq.linkedNodeIds : []);
        const selectedGroups = getEquipmentPlanDetailGroups(eq.id, detailIds);
        const antennaDetailIds = selectedGroups.antenna.map(detail => detail.id);
        const allDetailIds = Array.from(new Set(createdId ? [...antennaDetailIds, createdId] : antennaDetailIds));

        stop = {
            id: gid('p'),
            type: 'equipment',
            equipmentId: eq.id,
            linkedNodeIds,
            includeLinkedNodeDetails: false,
            name: eq.name,
            lat: safeFloat(eq.lat),
            lng: safeFloat(eq.lng),
            detailIds: allDetailIds,
            notes: createdId ? '' : notes,
            materialPlanned,
            assignedTechId: targetTechId === SHARED_PLAN_ID ? '' : targetTechId,
            siteStatus: 'pendiente',
            createdAt: new Date().toISOString()
        };
        stop._linkedNodeStops = buildLinkedNodeStops(eq, detailIds, targetTechId, materialPlanned, day);
    } else {
        const name = document.getElementById('manual-name').value.trim();
        const lat = safeFloat(document.getElementById('manual-lat').value);
        const lng = safeFloat(document.getElementById('manual-lng').value);
        if (!name || isNaN(lat) || isNaN(lng)) {
            notify('Agrega nombre y coordenadas validas', 'err');
            return;
        }

        const createdId = notes ? createWorkOrderForStop({
            title: notes,
            clientName,
            clientPhone,
            equipmentId: '',
            region: getNearestRegion(lat, lng),
            visitType,
            priority,
            materialPlanned,
            locationName: name,
            ...detailLocation
        }) : '';

        stop = {
            id: gid('p'),
            type: 'manual',
            name,
            lat,
            lng,
            region: getNearestRegion(lat, lng),
            detailIds: createdId ? [createdId] : [],
            notes: createdId ? '' : notes,
            materialPlanned,
            assignedTechId: targetTechId === SHARED_PLAN_ID ? '' : targetTechId,
            visitType,
            siteStatus: 'pendiente',
            createdAt: new Date().toISOString()
        };
    }

    setCreatedAudit(stop, 'agregó parada al plan');
    ensureTechPlan(targetTechId);
    const linkedNodeStopCount = stop._linkedNodeStops?.length || 0;
    if (targetTechId === SHARED_PLAN_ID && day === 'general') {
        getPlanStopsRef(SHARED_PLAN_ID, 'general').push(stop, ...(stop._linkedNodeStops || []));
    } else {
        getPlanStopsRef(targetTechId, day).push(stop, ...(stop._linkedNodeStops || []));
    }
    const eqName = stop.type === 'equipment' ? ((state.equipment || []).find(e => e.id === stop.equipmentId)?.name || stop.name) : stop.name;
    delete stop._linkedNodeStops;
    selectedTechId = targetTechId;
    selectedDay = day;
    document.getElementById('plan-tech').value = selectedTechId;
    document.getElementById('plan-day').value = day;
    CM('plan-stop-mo');
    saveDB();
    renderPlan();
    notify(linkedNodeStopCount ? `${eqName} y ${linkedNodeStopCount} nodo(s) vinculados agregados al plan` : 'Parada agregada al plan');
}

function createWorkOrderForStop({ title, clientName = '', clientPhone = '', equipmentId, nodeId = '', region, visitType, priority, locationName = '', location = '', lat = '', lng = '', materialPlanned = '' }) {
    const id = gid('w');
    const newOrder = {
        id,
        title,
        clientName,
        clientPhone,
        equipmentId: equipmentId || '',
        nodeId: nodeId || '',
        priority,
        technicianId: selectedTechId,
        desc: locationName ? `Ubicacion manual: ${locationName}${lat && lng ? ` (${lat}, ${lng})` : ''}` : '',
        detailLocation: location || '',
        lat: lat || '',
        lng: lng || '',
        visitType,
        region: region || '',
        status: 'pendiente',
        createdAt: new Date().toISOString(),
        materialPlanned,
        materials: materialPlanned ? [materialPlanned] : []
    };
    hydrateWorkOrderLocationFromLinkedEntity(newOrder);
    setCreatedAudit(newOrder, 'agregó detalle desde plan');
    state.workOrders.push(newOrder);
    return id;
}

function hydrateWorkOrderLocationFromLinkedEntity(order) {
    if (!order || (!order.equipmentId && !order.nodeId)) return order;
    if (!isNaN(safeFloat(order.lat)) && !isNaN(safeFloat(order.lng))) return order;
    const eq = order.equipmentId ? (state.equipment || []).find(item => item.id === order.equipmentId && !item.deletedAt) : null;
    const node = order.nodeId ? (state.nodes || []).find(item => item.id === order.nodeId && !item.deletedAt) : null;
    const lat = safeFloat(eq?.lat ?? node?.lat);
    const lng = safeFloat(eq?.lng ?? node?.lng);
    if (isNaN(lat) || isNaN(lng)) return order;
    order.lat = lat;
    order.lng = lng;
    if (!String(order.detailLocation || '').trim()) order.detailLocation = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    return order;
}

function addEquipmentStopFromMap(eqId) {
    if (!canManagePlanStops()) return notify('Solo un administrador puede agregar paradas', 'err');
    if (!selectedTechId) {
        notify('Primero selecciona un tecnico o plan general', 'err');
        return;
    }
    const eq = (state.equipment || []).find(item => item.id === eqId);
    if (!eq) return;
    const day = selectedTechId === SHARED_PLAN_ID ? 'general' : selectedDay;
    const stops = getPlanStops(day);
    if (stops.some(stop => stop.equipmentId === eq.id)) {
        notify('Esa antena ya esta en este plan', 'err');
        return;
    }

    const groups = getEquipmentPlanDetailGroups(eq.id);
    const activeDetails = groups.antenna.map(w => w.id);
    const linkedNodeStops = buildLinkedNodeStops(eq, null, selectedTechId, '', day);

    getPlanStopsRef(selectedTechId, day).push({
        id: gid('p'),
        type: 'equipment',
        equipmentId: eq.id,
        linkedNodeIds: typeof getEquipmentLinkedNodeIds === 'function' ? getEquipmentLinkedNodeIds(eq.id) : (Array.isArray(eq.linkedNodeIds) ? eq.linkedNodeIds : []),
        includeLinkedNodeDetails: false,
        name: eq.name,
        lat: safeFloat(eq.lat),
        lng: safeFloat(eq.lng),
        detailIds: activeDetails,
        notes: '',
        siteStatus: 'pendiente',
        planJoinedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
    }, ...linkedNodeStops);

    selectedDay = day;
    document.getElementById('plan-day').value = day;
    saveDB();
    renderPlan();
    if (linkedNodeStops.length) {
        const nodeNames = linkedNodeStops.map(s => s.name).join(', ');
        notify(`${eq.name} y sus ${linkedNodeStops.length} nodo(s) vinculados agregados al plan (${nodeNames})`);
    } else {
        notify(`${eq.name} agregado como parada`);
    }
}

function addNodeStopFromMap(nodeId) {
    if (!canManagePlanStops()) return notify('Solo un administrador puede agregar paradas', 'err');
    if (!selectedTechId) {
        notify('Primero selecciona un tecnico o plan general', 'err');
        return;
    }
    const node = (state.nodes || []).find(item => item.id === nodeId && !item.deletedAt);
    if (!node) return;
    const day = selectedTechId === SHARED_PLAN_ID ? 'general' : selectedDay;
    const stops = getPlanStops(day);
    if (stops.some(stop => stop.nodeId === node.id)) {
        notify('Ese pueblo ya esta en este plan', 'err');
        return;
    }
    const details = sortDetailsByPriority((state.workOrders || []).filter(order => isPendingPlanDetail(order) && order.nodeId === node.id));
    getPlanStopsRef(selectedTechId, day).push({
        id: gid('p'),
        type: 'node',
        nodeId: node.id,
        equipmentId: '',
        name: getNodeLabel(node),
        lat: safeFloat(node.lat),
        lng: safeFloat(node.lng),
        region: node.region || node.zone || getNearestRegion(node.lat, node.lng) || '',
        detailIds: details.map(detail => detail.id),
        notes: '',
        siteStatus: 'pendiente',
        planJoinedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
    });
    selectedDay = day;
    document.getElementById('plan-day').value = day;
    saveDB();
    renderPlan();
    notify(`${getNodeLabel(node)} agregado como parada`);
}

function removeStopFromFullscreen(day, stopId) {
    if (!canManagePlanStops()) return notify('Solo un administrador puede eliminar paradas', 'err');
    const stop = getPlanStopsRef(selectedTechId, day).find(item => item.id === stopId && !item.deletedAt);
    if (!stop) return;
    setDeletedAudit(stop, 'elimino parada desde mapa');
    saveDB();
    renderPlan();
    setTimeout(() => renderPlanFullscreenMap(true), 160);
    notify('Parada quitada del plan');
}

const _pendingDetailFetchIds = new Set();
let _debouncedRenderPlanDaysTimer = null;

function _scheduleDebouncedRenderPlanDays() {
    if (_debouncedRenderPlanDaysTimer) return;
    _debouncedRenderPlanDaysTimer = setTimeout(() => {
        _debouncedRenderPlanDaysTimer = null;
        if (typeof renderPlanDays === 'function') renderPlanDays();
        if (typeof updateTechnicianMobileBellBadge === 'function') updateTechnicianMobileBellBadge();
    }, 180);
}

function getStopDetails(stop) {
    if (!stop) return [];
    const ids = new Set(stop.detailIds || []);
    const details = new Map();

    // 1. Incorporar detalles embebidos directamente en la parada si existen
    if (Array.isArray(stop.details)) {
        stop.details.forEach(d => {
            if (d && d.id && !d.deletedAt) {
                details.set(d.id, d);
            }
        });
    }

    // 2. Incorporar desde state.workOrders
    const stopNameNorm = (!stop.nodeId && !stop.equipmentId) ? normalizeName(stop.name || stop.town || '') : '';
    (state.workOrders || []).forEach(w => {
        if (!w || w.deletedAt) return;
        const explicitLink = ids.has(w.id);
        const isNetworkOnly = w.detailKind === 'network';
        if (isNetworkOnly && !explicitLink) return;
        const matchesEquipment = stop.equipmentId && !w.nodeId && w.equipmentId === stop.equipmentId;
        const matchesNode = stop.nodeId && w.nodeId === stop.nodeId;
        const matchesManualTown = Boolean(
            stopNameNorm &&
            (
                (w.nodeName && normalizeName(w.nodeName) === stopNameNorm) ||
                (w.town && normalizeName(w.town) === stopNameNorm)
            )
        );

        const isResolved = ['completada', 'no_realizado'].includes(w.status || '');
        const resolvedInThisPlan = isResolved && wasDetailResolvedDuringStop(w, stop);
        const isPlanRelevant = isPendingPlanDetail(w);

        // detailIds es la asignacion persistida de esta parada. No debe
        // desaparecer si despues cambia la antena, el pueblo o la ubicacion.
        if (explicitLink || ((matchesEquipment || matchesNode || matchesManualTown) && (isPlanRelevant || resolvedInThisPlan))) {
            details.set(w.id, w);
        }
    });

    // 3. Si hay IDs explícitos faltantes, recuperar del caché persistente global de órdenes
    if (ids.size > 0 && details.size < ids.size && typeof getGlobalWorkOrdersCache === 'function') {
        const globalCache = getGlobalWorkOrdersCache();
        ids.forEach(id => {
            if (!details.has(id) && globalCache[id] && !globalCache[id].deletedAt) {
                const cachedOrder = globalCache[id];
                details.set(id, cachedOrder);
                if (Array.isArray(state.workOrders) && !state.workOrders.some(w => w.id === id)) {
                    state.workOrders.push(cachedOrder);
                }
            }
        });
    }

    // 4. Si aún faltan IDs explícitos, solicitar recuperación transparente en segundo plano
    if (ids.size > 0 && details.size < ids.size && typeof findOrFetchWorkOrder === 'function') {
        ids.forEach(id => {
            if (!details.has(id) && !_pendingDetailFetchIds.has(id)) {
                _pendingDetailFetchIds.add(id);
                findOrFetchWorkOrder(id).then(fetched => {
                    _pendingDetailFetchIds.delete(id);
                    if (fetched) {
                        if (typeof saveWorkOrdersToGlobalCache === 'function') {
                            saveWorkOrdersToGlobalCache([fetched]);
                        }
                        _scheduleDebouncedRenderPlanDays();
                    }
                }).catch(() => {
                    _pendingDetailFetchIds.delete(id);
                });
            }
        });
    }

    // Mantener la memoria global actualizada con todos los detalles confirmados
    if (details.size > 0 && typeof saveWorkOrdersToGlobalCache === 'function') {
        saveWorkOrdersToGlobalCache(Array.from(details.values()));
    }

    return typeof sortDetailsByPriority === 'function'
        ? sortDetailsByPriority(Array.from(details.values()))
        : Array.from(details.values());
}

function getStopProgress(stop) {
    const details = getStopDetails(stop);
    const total = details.length;
    const done = details.filter(detail => isDetailCompletedInStop(detail, stop)).length;
    const pending = total - done;
    const complete = total ? pending === 0 : stop.siteStatus === 'hecho';
    return { total, done, pending, complete };
}

function getVisibleStopNotes(stop, details = getStopDetails(stop)) {
    let note = String(stop.notes || '').trim();
    if (!note) return '';
    if (/undefined/i.test(note)) {
        const fallbackName = (stop.name && stop.name.toLowerCase() !== 'parada' && stop.name.toLowerCase() !== 'undefined') ? stop.name : (stop.town || '');
        if (fallbackName) {
            note = note.replace(/:\s*undefined(\s*\(Pueblo registrado\))?/gi, `: ${fallbackName} (Pueblo registrado)`).replace(/\bundefined\b/gi, fallbackName).trim();
        } else {
            note = note.replace(/:\s*undefined(\s*\(Pueblo registrado\))?/gi, '').replace(/\bundefined\b/gi, '').trim();
        }
    }
    const duplicatedAsDetail = (details || []).some(detail => String(detail.title || '').trim().toLowerCase() === note.toLowerCase());
    return duplicatedAsDetail ? '' : note;
}

function getStopAdminStatus(stop, progress) {
    if (stop.adminReleasedAt) return { text: 'Salida dada', cls: 'bg2' };
    if (progress.complete) return { text: 'Listo para salida', cls: 'bty' };
    if (stop.startedAt) return { text: 'En proceso', cls: 'bc' };
    return { text: 'Pendiente', cls: 'bty' };
}

function formatPlanDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function getVisibleStopIndexForAction(day, key) {
    const stops = getPlanStopsForView(day);
    if (typeof key === 'number') return key;
    const numeric = Number(key);
    if (Number.isInteger(numeric) && numeric >= 0 && !stops.some(stop => stop.id === key)) return numeric;
    return stops.findIndex(stop => stop.id === key);
}

async function moveStop(day, key, dir) {
    const ref = getPlanStopsRef(selectedTechId, day);
    const stops = getPlanStopsForView(day);
    const index = getVisibleStopIndexForAction(day, key);
    const next = index + dir;
    if (index < 0) return;
    if (next < 0 || next >= stops.length) return;
    const currentIndex = ref.findIndex(stop => stop.id === stops[index].id);
    const nextIndex = ref.findIndex(stop => stop.id === stops[next].id);
    if (currentIndex < 0 || nextIndex < 0) return;
    [ref[currentIndex], ref[nextIndex]] = [ref[nextIndex], ref[currentIndex]];
    const ok = await saveDB();
    if (!ok) notify('No se pudo guardar el nuevo orden.', 'err');
    renderPlan();
}

async function setStopOrder(day, key, value) {
    const ref = getPlanStopsRef(selectedTechId, day);
    const stops = getPlanStopsForView(day);
    const index = getVisibleStopIndexForAction(day, key);
    if (index < 0) return;
    const target = Math.max(0, Math.min(stops.length - 1, parseInt(value, 10) - 1));
    if (isNaN(target) || target === index) {
        renderPlan();
        return;
    }
    const stop = stops[index];
    const actualIndex = ref.findIndex(item => item.id === stop.id);
    if (actualIndex < 0) return;
    ref.splice(actualIndex, 1);
    const targetStop = stops[target];
    const actualTarget = ref.findIndex(item => item.id === targetStop.id);
    const insertAt = actualTarget < 0 ? ref.length : actualTarget + (target > index ? 1 : 0);
    ref.splice(insertAt, 0, stop);
    const ok = await saveDB();
    if (!ok) notify('No se pudo guardar el nuevo orden.', 'err');
    renderPlan();
}

async function setMapStopOrder(day, stopId, value) {
    const ref = getPlanStopsRef(selectedTechId, day);
    const stops = visibleStops(ref);
    const index = stops.findIndex(stop => stop.id === stopId);
    if (index < 0) return;
    const target = Math.max(0, Math.min(stops.length - 1, parseInt(value, 10) - 1));
    if (isNaN(target) || target === index) {
        renderPlanMap();
        return;
    }
    const stop = stops[index];
    const actualIndex = ref.findIndex(item => item.id === stop.id);
    if (actualIndex < 0) return;
    ref.splice(actualIndex, 1);
    const targetStop = stops[target];
    const actualTarget = ref.findIndex(item => item.id === targetStop.id);
    const insertAt = actualTarget < 0 ? ref.length : actualTarget + (target > index ? 1 : 0);
    ref.splice(insertAt, 0, stop);
    const ok = await saveDB();
    if (!ok) { notify('No se pudo guardar el nuevo orden.', 'err'); return; }
    renderPlanDays();
    renderPlanSummary();
    renderPlanMap();
    notify('Orden de paradas guardado');
}

async function deleteStop(day, id) {
    if (!canManagePlanStops()) return notify('Solo un administrador o soporte puede eliminar paradas de la ruta', 'err');

    const currentPlan = typeof getSelectedGeneralPlan === 'function' ? getSelectedGeneralPlan() : null;
    let stop = null;
    let parentPlan = currentPlan;

    // 1. Buscar en el plan general actualmente seleccionado
    if (currentPlan && Array.isArray(currentPlan.stops)) {
        stop = currentPlan.stops.find(s => s.id === id && !s.deletedAt);
    }
    // 2. Buscar en getPlanStopsRef
    if (!stop) {
        const ref = getPlanStopsRef(selectedTechId, day);
        if (Array.isArray(ref)) {
            stop = ref.find(s => s.id === id && !s.deletedAt);
        }
    }
    // 3. Buscar en todos los planes generales registrados
    if (!stop) {
        (typeof getGeneralPlans === 'function' ? getGeneralPlans() : []).forEach(p => {
            const found = (p.stops || []).find(s => s.id === id && !s.deletedAt);
            if (found) {
                stop = found;
                parentPlan = p;
            }
        });
    }
    if (!stop) return notify('No se encontró la parada a eliminar', 'err');

    const stopType = stop.type === 'equipment' ? 'Antena' : (stop.type === 'node' ? 'Pueblo' : 'Parada');
    const stopName = stop.name || 'esta parada';
    const planName = parentPlan?.name || currentPlan?.name || 'la ruta';

    const ok = await askConfirmation({
        title: 'Eliminar parada de la ruta',
        message: `¿Estás seguro de quitar “${stopName}” (${stopType}) de la ruta “${planName}”?\n\nLos reportes, órdenes y detalles registrados para este sitio se conservarán intactos.`,
        confirmText: 'Sí, eliminar de la ruta',
        cancelText: 'Cancelar',
        tone: 'danger'
    });
    if (!ok) return;

    setDeletedAudit(stop, `eliminó ${stopType.toLowerCase()} "${stopName}" de la ruta`);

    // Quitar del array activo de paradas del plan
    if (parentPlan && Array.isArray(parentPlan.stops)) {
        const idx = parentPlan.stops.findIndex(s => s.id === id);
        if (idx !== -1) {
            parentPlan.stops.splice(idx, 1);
        }
    }
    const dayStops = getPlanStopsRef(selectedTechId, day);
    if (Array.isArray(dayStops)) {
        const idx = dayStops.findIndex(s => s.id === id);
        if (idx !== -1) {
            dayStops.splice(idx, 1);
        }
    }

    const saved = await saveDB();
    if (!saved) return;
    renderPlan();
    notify(`Se quitó “${stopName}” de la ruta ✓`);
}

function openRegisterStopAsNodeModal(stopId) {
    if (!canManagePlanStops()) return notify('Solo un administrador o soporte puede registrar nuevos pueblos', 'err');

    const currentPlan = typeof getSelectedGeneralPlan === 'function' ? getSelectedGeneralPlan() : null;
    let stop = null;
    if (currentPlan && Array.isArray(currentPlan.stops)) {
        stop = currentPlan.stops.find(s => s.id === stopId && !s.deletedAt);
    }
    if (!stop) {
        (typeof getGeneralPlans === 'function' ? getGeneralPlans() : []).forEach(p => {
            const found = (p.stops || []).find(s => s.id === stopId && !s.deletedAt);
            if (found) stop = found;
        });
    }
    if (!stop) return notify('No se encontró la parada para registrar', 'err');

    const modal = document.getElementById('register-node-from-stop-mo');
    if (!modal) return;

    const stopPos = getStopCurrentPosition(stop);
    const lat = !isNaN(stopPos.lat) ? stopPos.lat.toFixed(5) : (!isNaN(stop.lat) ? Number(stop.lat).toFixed(5) : '');
    const lng = !isNaN(stopPos.lng) ? stopPos.lng.toFixed(5) : (!isNaN(stop.lng) ? Number(stop.lng).toFixed(5) : '');

    let initialTown = '';
    if (stop.name && stop.name.trim().toLowerCase() !== 'parada') {
        initialTown = stop.name.trim();
    } else if (stop.notes && !stop.notes.startsWith('Parada')) {
        initialTown = stop.notes.replace(/^[^:]+:\s*/, '').replace(/\s*\(Pueblo registrado\)/i, '').trim();
    }

    const existingCodes = (state.nodes || []).map(n => {
        const m = String(n.nodeCode || '').match(/^R(\d+)$/i);
        return m ? parseInt(m[1], 10) : 0;
    });
    const maxCode = existingCodes.length ? Math.max(...existingCodes) : 0;
    const nextCode = 'R' + (maxCode + 1);

    const stopIdInput = document.getElementById('reg-node-stop-id');
    const townInput = document.getElementById('reg-node-town');
    const codeInput = document.getElementById('reg-node-code');
    const coordsInput = document.getElementById('reg-node-coords');

    if (stopIdInput) stopIdInput.value = stop.id;
    if (townInput) townInput.value = String(initialTown || '').trim().toLocaleUpperCase('es-MX');
    if (codeInput) codeInput.value = String(nextCode || '').trim().toLocaleUpperCase('es-MX');
    if (coordsInput) coordsInput.value = (lat && lng) ? `${lat}, ${lng}` : '';

    const eqSelect = document.getElementById('reg-node-eq');
    if (eqSelect) {
        eqSelect.innerHTML = '<option value="">-- Sin antena matriz vinculada --</option>' +
            (state.equipment || []).filter(e => !e.deletedAt).map(e => `<option value="${escapeAttr(e.id)}">${escapeHtml(e.name)}</option>`).join('');
        if (stop.equipmentId) eqSelect.value = stop.equipmentId;
    }

    OM('register-node-from-stop-mo');
    setTimeout(() => document.getElementById('reg-node-town')?.focus(), 80);
}

async function saveNewNodeFromStop() {
    if (!canManagePlanStops()) return notify('Solo un administrador o soporte puede registrar nuevos pueblos', 'err');
    const stopId = document.getElementById('reg-node-stop-id')?.value;
    const town = String(document.getElementById('reg-node-town')?.value || '').trim().toLocaleUpperCase('es-MX');
    const nodeCode = String(document.getElementById('reg-node-code')?.value || '').trim().toLocaleUpperCase('es-MX');
    const zone = document.getElementById('reg-node-zone')?.value || 'general';
    const coordsRaw = document.getElementById('reg-node-coords')?.value?.trim();
    const eqId = document.getElementById('reg-node-eq')?.value || null;

    if (!town) return notify('Por favor escribe el nombre del pueblo o comunidad', 'err');
    if (!nodeCode) return notify('Por favor ingresa la clave del pueblo (ej. R225)', 'err');

    let lat = 17.55;
    let lng = -99.50;
    if (coordsRaw) {
        const parts = coordsRaw.split(/[,;\s]+/).map(Number);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            lat = parts[0];
            lng = parts[1];
        }
    }

    // Verificar si ya existe pueblo con ese nombre o clave
    const duplicate = (state.nodes || []).find(n => !n.deletedAt && (normalizeName(n.nodeCode) === normalizeName(nodeCode) || normalizeName(n.town) === normalizeName(town)));
    if (duplicate) {
        const ok = await askConfirmation({
            title: 'Pueblo ya registrado',
            message: `Ya existe el pueblo “${duplicate.town}” con clave ${duplicate.nodeCode}. ¿Deseas vincular esta parada a dicho pueblo?`,
            confirmText: 'Vincular a existente',
            cancelText: 'Corregir datos'
        });
        if (!ok) return;

        const currentPlan = typeof getSelectedGeneralPlan === 'function' ? getSelectedGeneralPlan() : null;
        let targetStop = null;
        if (currentPlan && Array.isArray(currentPlan.stops)) {
            targetStop = currentPlan.stops.find(s => s.id === stopId);
        }
        if (targetStop) {
            targetStop.nodeId = duplicate.id;
            targetStop.type = 'node';
            targetStop.name = duplicate.town || duplicate.name;
            await saveDB();
            CM('register-node-from-stop-mo');
            renderPlan();
            return notify(`Parada vinculada al pueblo existente “${duplicate.town}” ✓`);
        }
    }

    const newNode = {
        id: (typeof gid === 'function' ? gid('nd') : 'nd_' + Date.now()),
        nodeCode: nodeCode.toLocaleUpperCase('es-MX'),
        town: town.toLocaleUpperCase('es-MX'),
        name: town.toLocaleUpperCase('es-MX'),
        zone,
        lat,
        lng,
        equipmentId: eqId || '',
        status: 'activo',
        notes: 'Registrado desde la planificación de ruta',
        createdAt: new Date().toISOString()
    };

    if (!Array.isArray(state.nodes)) state.nodes = [];
    state.nodes.push(newNode);

    if (typeof setCreatedAudit === 'function') {
        setCreatedAudit(newNode, 'registró nuevo pueblo desde ruta');
    }

    if (typeof saveRecord === 'function') {
        await saveRecord('nodes', newNode).catch(() => { });
    }

    // Vincular parada
    const currentPlan = typeof getSelectedGeneralPlan === 'function' ? getSelectedGeneralPlan() : null;
    let targetStop = null;
    if (currentPlan && Array.isArray(currentPlan.stops)) {
        targetStop = currentPlan.stops.find(s => s.id === stopId);
    }
    if (!targetStop) {
        (typeof getGeneralPlans === 'function' ? getGeneralPlans() : []).forEach(p => {
            const found = (p.stops || []).find(s => s.id === stopId);
            if (found) targetStop = found;
        });
    }
    if (targetStop) {
        targetStop.nodeId = newNode.id;
        targetStop.type = 'node';
        targetStop.name = newNode.town;
        targetStop.lat = lat;
        targetStop.lng = lng;
    }

    await saveDB();
    CM('register-node-from-stop-mo');
    renderPlan();
    notify(`Pueblo “${town}” registrado con clave ${newNode.nodeCode} y vinculado a la ruta ✓`);
}

async function clearAllPlanningContext() {
    const confirmed = await askConfirmation({ title: 'Eliminar toda la planificación', message: 'Se eliminarán todos los planes semanales y generales.', confirmText: 'Eliminar todo', cancelText: 'Cancelar', tone: 'danger' });
    if (!confirmed) return;
    Object.values(state.weekPlan || {}).forEach(plan => {
        if (!plan || typeof plan !== 'object') return;
        Object.values(plan).forEach(value => {
            if (Array.isArray(value)) value.forEach(stop => stop.deletedAt = new Date().toISOString());
        });
        if (Array.isArray(plan._generalPlans)) {
            plan._generalPlans.forEach(generalPlan => {
                generalPlan.deletedAt = new Date().toISOString();
                (generalPlan.stops || []).forEach(stop => stop.deletedAt = new Date().toISOString());
            });
        }
    });
    normalizeWeekPlan();
    selectedTechId = getInitialPlanTechId((state.technicians || []).filter(t => !t.deletedAt && t.estado !== 'inactivo'));
    selectedDay = selectedTechId === SHARED_PLAN_ID ? 'general' : getInitialDayForTech(selectedTechId);
    await saveDB();
    renderPlan();
    notify('Se elimino todo el contexto de planificacion');
}

function initPlanMap() {
    if (planMap || typeof L === 'undefined' || !document.getElementById('plan-map')) return;
    planMap = L.map('plan-map').setView([17.55, -99.50], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
    }).addTo(planMap);
    setTimeout(() => planMap?.invalidateSize(), 100);
    renderPlanMap();
}

async function renderPlanMap() {
    if (!planMap) return;
    planRouteRenderAt = Date.now();
    const renderId = ++planRouteRenderId;
    if (planRouteLayer) {
        planMap.removeLayer(planRouteLayer);
        planRouteLayer = null;
    }
    planMarkers.forEach(m => planMap.removeLayer(m));
    planMarkers = [];
    planAntennaMarkers.forEach(m => planMap.removeLayer(m));
    planAntennaMarkers = [];

    // En "Vista del plan" solo se muestran las antenas y pueblos/nodos pertenecientes a este plan.
    const rawPoints = getPlanMapStops()
        .filter(s => !isNaN(safeFloat(s.lat)) && !isNaN(safeFloat(s.lng)))
        .map(s => ({
            lat: safeFloat(s.lat),
            lng: safeFloat(s.lng),
            name: s.name,
            id: s.id,
            equipmentId: s.equipmentId || '',
            nodeId: s.nodeId || '',
            type: s.type || '',
            day: s.mapDay || selectedDay,
            index: s.mapIndex,
            mapLabel: s.mapLabel || s.name,
            stop: s
        }));
    const points = ensureRoutePointsStartAtWiFiMex(rawPoints);

    if (!points.length) {
        planMap.setView([17.55, -99.50], 8);
        return;
    }

    points.forEach((p, i) => {
        const stopRef = p.stop || p;
        const stopLabel = p.isOrigin ? (p.name || 'WiFi-Mex') : getPlanMapStopDisplayName(stopRef);
        const marker = L.marker([p.lat, p.lng], {
            icon: makePlanStopMarkerIcon(p.isOrigin ? p : stopRef, i + 1)
        }).addTo(planMap);
        marker._planStopId = p.id;
        marker.bindTooltip(p.isOrigin ? `Base · ${stopLabel}` : `${i + 1}. ${stopLabel}`, { direction: 'top', offset: [0, -16] });
        marker.bindPopup(p.isOrigin ? `
            <div class="plan-map-popup">
                <strong>${escapeHtml(stopLabel)}</strong>
                <div style="font-size:11px;color:#0f766e;font-weight:700;margin-top:3px">Parada principal · Base de salida</div>
                <div style="font-size:11px;color:#64748b;margin-top:2px">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</div>
            </div>
        ` : (isTechnicianPlanView() ? `
            <div class="plan-map-popup plan-map-popup-wide">
                <strong>${i + 1}. ${escapeHtml(stopLabel)}</strong>
                <div style="font-size:11px;color:#64748b;margin:5px 0 9px">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</div>
                ${renderFullscreenStopDetails(p.stop)}
            </div>
        ` : `
            <div class="plan-map-popup">
                <strong>${escapeHtml(stopLabel)}</strong>
                ${renderMapStopDetailStats(p.stop)}
                <label>Orden</label>
                <div class="plan-popup-row">
                    <input id="map-order-${escapeAttr(p.id)}" class="stop-order-input" type="number" min="1" max="${points.length}" value="${i + 1}">
                    <button class="btn bsm bc" onclick="setMapStopOrder('${escapeAttr(p.day)}','${escapeAttr(p.id)}',document.getElementById('map-order-${escapeAttr(p.id)}').value)">Reordenar</button>
                </div>
            </div>
        `), { maxWidth: 420 });
        planMarkers.push(marker);
    });

    if (points.length > 1) {
        await drawRoadRoute(points, renderId);
    } else {
        fitPlanMapView(points);
    }
    // Limpiar timestamp al finalizar para permitir re-renders normales
    if (renderId === planRouteRenderId) planRouteRenderAt = 0;
}


function getOrderedRouteStops() {
    return getPlanMapStops()
        .map((stop, index) => ({
            ...stop,
            order: index + 1,
            lat: safeFloat(stop.lat),
            lng: safeFloat(stop.lng),
            details: getStopDetails(stop),
            progress: getStopProgress(stop)
        }))
        .filter(stop => !isNaN(stop.lat) && !isNaN(stop.lng));
}

let weeklyRouteSelectedDay = 'all';
let weeklyRouteListCollapsed = false;

function toggleRouteListFullscreen() {
    weeklyRouteListCollapsed = !weeklyRouteListCollapsed;
    const modal = document.querySelector('#plan-route-mo .route-full-modal');
    const btnLabel = document.getElementById('route-toggle-list-text');
    if (modal) {
        if (weeklyRouteListCollapsed) {
            modal.classList.add('map-maximized');
            if (btnLabel) btnLabel.textContent = 'Ver lista';
        } else {
            modal.classList.remove('map-maximized');
            if (btnLabel) btnLabel.textContent = 'Maximizar mapa';
        }
    }
    setTimeout(() => {
        if (routeFullMap) routeFullMap.invalidateSize();
    }, 120);
}

function getFilteredWeeklyRouteStops() {
    const allStops = getOrderedRouteStops();
    if (weeklyRouteSelectedDay === 'all') return allStops;
    return allStops.filter(s => (s.scheduledDate || 'unscheduled') === weeklyRouteSelectedDay);
}

function renderWeeklyRouteDayFilters(allStops) {
    const filterBox = document.getElementById('plan-route-day-filters');
    if (!filterBox) return;

    const dateCounts = new Map();
    allStops.forEach(s => {
        const key = s.scheduledDate || 'unscheduled';
        dateCounts.set(key, (dateCounts.get(key) || 0) + 1);
    });

    const sortedDates = [...dateCounts.keys()].sort((a, b) => {
        if (a === 'unscheduled') return 1;
        if (b === 'unscheduled') return -1;
        return a.localeCompare(b);
    });

    const pills = [
        `<button type="button" class="route-day-pill ${weeklyRouteSelectedDay === 'all' ? 'active' : ''}" onclick="selectWeeklyRouteDay('all')"><span>Todos los días</span><small>${allStops.length}</small></button>`,
        ...sortedDates.map(dateKey => {
            const count = dateCounts.get(dateKey) || 0;
            const label = dateKey === 'unscheduled' ? 'Sin fecha' : formatCalendarDate(dateKey);
            return `<button type="button" class="route-day-pill ${weeklyRouteSelectedDay === dateKey ? 'active' : ''}" onclick="selectWeeklyRouteDay('${escapeAttr(dateKey)}')"><span>${escapeHtml(label)}</span><small>${count}</small></button>`;
        })
    ];

    filterBox.innerHTML = pills.join('');
}

function selectWeeklyRouteDay(dayKey) {
    weeklyRouteSelectedDay = dayKey;
    const allStops = getOrderedRouteStops();
    renderWeeklyRouteDayFilters(allStops);
    renderWeeklyRouteView();
    const filteredStops = getFilteredWeeklyRouteStops();
    renderRouteFullMap(filteredStops);
}

function renderWeeklyRouteView() {
    const allStops = getOrderedRouteStops();
    const stops = getFilteredWeeklyRouteStops();
    const tech = getSelectedTech();
    const generalPlan = getSelectedGeneralPlan();
    const totalDetails = stops.reduce((sum, stop) => sum + stop.progress.total, 0);
    const pendingDetails = stops.reduce((sum, stop) => sum + stop.progress.pending, 0);
    const doneDetails = totalDetails - pendingDetails;
    const feasibility = calculateDayRouteFeasibility(stops);

    const dayLabelStr = weeklyRouteSelectedDay === 'all'
        ? 'Todos los días'
        : (weeklyRouteSelectedDay === 'unscheduled' ? 'Sin fecha asignada' : formatCalendarDate(weeklyRouteSelectedDay));

    const label = selectedTechId === SHARED_PLAN_ID
        ? `${tech?.nombre || 'Plan general compartido'} - ${generalPlan?.name || 'Plan general'} (${dayLabelStr})`
        : `${tech?.nombre || 'Tecnico'} - ${dayLabelStr}`;

    const subEl = document.getElementById('plan-route-sub');
    if (subEl) {
        subEl.innerHTML = `
            <span>${escapeHtml(label)}</span>
            <span>${stops.length} paradas</span>
            <span>${totalDetails} detalles</span>
            <span>${pendingDetails} pendientes</span>
            <span>${doneDetails} hechos</span>
        `;
    }

    const statsEl = document.getElementById('plan-route-day-stats');
    if (statsEl) {
        statsEl.innerHTML = `
            <span>~${feasibility.totalKm} km</span> · 
            <span>~${feasibility.travelFormatted} traslado</span> · 
            <span>Jornada: <b>~${feasibility.workdayFormatted}</b></span> · 
            <span class="badge ${feasibility.statusClass}">${feasibility.statusLabel}</span>
        `;
    }

    renderWeeklyRouteList(stops);
}

/* ==========================================================================
   COBERTURA DE PUEBLOS: MONITOREO DE >80% COMPLETADOS Y SIN ATENCIÓN
   ========================================================================== */
let townsCoverageCurrentTab = 'covered'; // 'covered' | 'unattended'
let townsCoverageSearchQuery = '';
let townsCoverageUrgencyFilter = 'all'; // 'all' | 'nunca' | 'critica' | 'alta' | 'media' | 'baja'

function getTownUrgencyInfo(item) {
    if (!item || !item.isUnattended) return null;
    let days = 0;
    if (item.oldestPendingDate) {
        const d = new Date(item.oldestPendingDate);
        if (!isNaN(d.getTime())) {
            const diffMs = Date.now() - d.getTime();
            days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }
    }

    let baseLevel = 'baja';
    let baseRank = 1;
    let icon = '🔵';
    let label = 'Urgencia Baja';
    let shortLabel = 'Baja';
    let badgeClass = 'urgency-baja';
    let color = '#2563eb';

    if (days >= 30) {
        baseLevel = 'critica';
        baseRank = 4;
        icon = '🚨';
        label = 'Urgencia Crítica';
        shortLabel = 'Crítica';
        badgeClass = 'urgency-critica';
        color = '#dc2626';
    } else if (days >= 14) {
        baseLevel = 'alta';
        baseRank = 3;
        icon = '⚠️';
        label = 'Urgencia Alta';
        shortLabel = 'Alta';
        badgeClass = 'urgency-alta';
        color = '#ea580c';
    } else if (days >= 7) {
        baseLevel = 'media';
        baseRank = 2;
        icon = '⏳';
        label = 'Urgencia Media';
        shortLabel = 'Media';
        badgeClass = 'urgency-media';
        color = '#d97706';
    }

    // Clasificación especial para los que NUNCA se han atendido (solo si tiene detalles registrados)
    const isNever = Boolean(item.isNeverAttended || (item.completed === 0 && Number(item.total) > 0));
    if (isNever) {
        return {
            level: 'nunca',
            timeLevel: baseLevel,
            isNeverAttended: true,
            rank: 5,
            days,
            icon: '⛔',
            timeIcon: icon,
            label: 'Nunca atendido',
            shortLabel: 'Nunca atendido',
            badgeClass: 'urgency-nunca',
            color: '#b91c1c'
        };
    }

    return {
        level: baseLevel,
        timeLevel: baseLevel,
        isNeverAttended: false,
        rank: baseRank,
        days,
        icon,
        timeIcon: icon,
        label,
        shortLabel,
        badgeClass,
        color
    };
}

function formatTimeAgoCustom(dateString) {
    if (!dateString) return 'Sin fecha registrada';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    const now = new Date();
    const diffMs = now - date;
    if (diffMs < 0) return 'Reciente';
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 60) return `Hace ${Math.max(1, diffMinutes)} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Hace 1 día';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return 'Hace 1 semana';
    if (diffWeeks < 5) return `Hace ${diffWeeks} semanas`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return 'Hace 1 mes';
    if (diffMonths < 12) return `Hace ${diffMonths} meses`;
    const diffYears = Math.floor(diffDays / 365);
    return `Hace ${diffYears} año${diffYears === 1 ? '' : 's'}`;
}

function isPhysicalCoverageOrder(w) {
    if (!w || w.deletedAt) return false;
    if (w.detailKind === 'network' || w.detail_kind === 'network') return false;
    const cat = String(w.category || '').trim().toLowerCase();
    if (/_red$|^red_/.test(cat)) return false;
    return true;
}

function calculateTownCoverageData() {
    const nodes = (state.nodes || []).filter(n => n && !n.deletedAt);
    const workOrders = (state.workOrders || []).filter(isPhysicalCoverageOrder);

    // Mapeo por ID de nodo (solo detalles físicos, nunca de red)
    const townStats = nodes.map(node => {
        const id = node.id;
        const code = String(node.nodeCode || '').trim().toLocaleUpperCase('es-MX');
        const townName = String(node.town || node.name || code || 'PUEBLO SIN NOMBRE').trim().toLocaleUpperCase('es-MX');
        const zone = node.zone || node.region || '';

        // 1. Obtener detalles directamente asociados en memoria
        const nodeOrders = workOrders.filter(w => w.nodeId === id || (code && w.nodeCode === code));

        let total = nodeOrders.length;
        let completed = nodeOrders.filter(w => ['completada', 'no_realizado', 'done'].includes(w.status || '')).length;
        let pending = Math.max(0, total - completed);

        // Si el catálogo precargado en node tiene estadísticas del servidor más completas, utilizarlas como base
        if (Number.isFinite(Number(node.mapDetailTotal)) && Number(node.mapDetailTotal) > total) {
            total = Number(node.mapDetailTotal);
            completed = Math.max(completed, Number(node.mapDetailResolved) || 0);
            pending = Math.max(0, total - completed);
        }

        // Determinar fecha del detalle más antiguo pendiente / sin atención
        let oldestPendingDate = node.mapOldestPendingAt || null;
        let latestResolvedDate = node.mapLatestResolvedAt || null;
        nodeOrders.forEach(w => {
            const isResolved = ['completada', 'no_realizado', 'done'].includes(w.status || '');
            const dateVal = w.updatedAt || w.updated_at || w.createdAt || w.created_at;
            if (!isResolved) {
                if (dateVal) {
                    if (!oldestPendingDate || new Date(dateVal) < new Date(oldestPendingDate)) {
                        oldestPendingDate = dateVal;
                    }
                }
            } else {
                if (dateVal) {
                    if (!latestResolvedDate || new Date(dateVal) > new Date(latestResolvedDate)) {
                        latestResolvedDate = dateVal;
                    }
                }
            }
        });

        // Si no hay detalles pero el nodo tiene createdAt, usarlo como referencia secundaria
        if (!oldestPendingDate && (node.createdAt || node.created_at)) {
            oldestPendingDate = node.createdAt || node.created_at;
        }

        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        const hasCompleted = completed > 0;
        const isCovered80 = hasCompleted && total > 0 && (completed / total) >= 0.8;
        const effectivePending = Math.max(pending, Number(node.mapUnattendedCount) || 0);
        const hasRegisteredDetails = total > 0 || nodeOrders.length > 0 || (Number(node.mapDetailTotal) > 0);
        const isNeverAttended = hasRegisteredDetails && completed === 0 && (effectivePending > 0 || total > 0);
        const isUnattended = hasRegisteredDetails && effectivePending > 0 && !isCovered80;

        const townObj = {
            id,
            node,
            code,
            townName,
            zone,
            total,
            completed,
            pending: effectivePending,
            percentage,
            hasCompleted,
            isCovered80,
            isNeverAttended,
            isUnattended,
            oldestPendingDate,
            latestResolvedDate,
            lat: safeFloat(node.lat),
            lng: safeFloat(node.lng)
        };
        townObj.urgency = getTownUrgencyInfo(townObj);
        return townObj;
    });

    return townStats;
}

function renderTownsCoverageSection() {
    const allData = calculateTownCoverageData();
    const coveredList = allData.filter(item => item.isCovered80);
    const unattendedList = allData.filter(item => item.isUnattended);

    if (!allData.length) return '';

    // Ordenar listas
    const sortedCovered = [...coveredList].sort((a, b) => b.percentage - a.percentage || b.completed - a.completed);
    const sortedUnattended = [...unattendedList].sort((a, b) => {
        const rankA = a.urgency ? a.urgency.rank : 0;
        const rankB = b.urgency ? b.urgency.rank : 0;
        if (rankB !== rankA) return rankB - rankA;
        const timeA = a.oldestPendingDate ? new Date(a.oldestPendingDate).getTime() : 0;
        const timeB = b.oldestPendingDate ? new Date(b.oldestPendingDate).getTime() : 0;
        return timeA - timeB;
    });

    const previewCovered = sortedCovered.slice(0, 3);
    const previewUnattended = sortedUnattended.slice(0, 3);

    // Conteo por niveles de urgencia
    const nuncaCount = unattendedList.filter(i => i.isNeverAttended || i.urgency?.level === 'nunca').length;
    const criticaCount = unattendedList.filter(i => i.urgency?.level === 'critica' || i.urgency?.timeLevel === 'critica').length;
    const altaCount = unattendedList.filter(i => i.urgency?.level === 'alta' || i.urgency?.timeLevel === 'alta').length;
    const mediaCount = unattendedList.filter(i => i.urgency?.level === 'media' || i.urgency?.timeLevel === 'media').length;
    const bajaCount = unattendedList.filter(i => i.urgency?.level === 'baja' || i.urgency?.timeLevel === 'baja').length;

    const renderCard = (item, isCovered) => {
        const timeAgoText = formatTimeAgoCustom(item.oldestPendingDate);
        const resolvedAgoText = item.latestResolvedDate ? formatTimeAgoCustom(item.latestResolvedDate) : 'Sin fecha reciente';
        const hasCoords = !isNaN(item.lat) && !isNaN(item.lng);
        const isNever = !isCovered && Boolean(item.isNeverAttended || item.urgency?.level === 'nunca');
        const cardUrgencyClass = !isCovered && item.urgency ? `urgency-${item.urgency.level}` : '';
        return `
            <div class="town-coverage-card ${cardUrgencyClass}${isNever ? ' is-never-attended' : ''}">
                <div class="town-coverage-card-head">
                    <div class="town-coverage-card-title">
                        <strong title="${escapeAttr(item.townName)}">${escapeHtml(item.townName)}</strong>
                        <small>${escapeHtml(item.code ? item.code + ' · ' : '')}${escapeHtml(item.zone || 'Sin zona')}</small>
                    </div>
                    ${isCovered
                ? `<span class="town-coverage-badge badge-green">${item.percentage}% Hecho</span>`
                : (isNever
                    ? `<span class="town-coverage-badge urgency-nunca" title="Pueblo con detalles registrados que nunca ha recibido atención">⛔ Nunca atendido</span>`
                    : `<span class="town-coverage-badge ${item.urgency ? item.urgency.badgeClass : 'badge-red'}" title="${item.urgency ? item.urgency.label + ' (' + item.urgency.days + ' días sin atención)' : 'Sin atención'}">${item.urgency ? item.urgency.icon + ' ' + item.urgency.label : 'Sin atención'}</span>`)
            }
                </div>
                ${isCovered ? `
                    <div class="town-coverage-progress-wrap">
                        <div class="town-coverage-progress-fill" style="width:${item.percentage}%"></div>
                    </div>
                    <div class="town-coverage-metrics-row">
                        <span>Avance: <b>${item.completed} de ${item.total}</b></span>
                        <span>Faltan: <b>${item.pending}</b></span>
                    </div>
                    <div class="town-coverage-resolved-wait" style="margin-top:2px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <span>Último resuelto: <strong>${resolvedAgoText}</strong></span>
                    </div>
                ` : `
                    <div class="town-coverage-unattended-wait ${cardUrgencyClass}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;color:inherit;flex-shrink:0;">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>Sin atender: <strong>${timeAgoText}</strong> ${isNever ? `<span class="town-urgency-tag nunca">(Nunca atendido · ${item.urgency ? item.urgency.days : 0} d)</span>` : (item.urgency ? `<span class="town-urgency-tag">(${item.urgency.days} d)</span>` : '')}</span>
                    </div>
                    <div class="town-coverage-metrics-row" style="margin-top:2px;">
                        <span>Pendientes: <b>${item.pending} detalles</b> ${isNever ? '<small style="color:#b91c1c;font-weight:800;">(0 atendidos)</small>' : (item.completed > 0 ? `<small style="color:#64748b;font-weight:700;">(${item.completed} resueltos)</small>` : '')}</span>
                    </div>
                `}
                <div class="town-coverage-actions">
                    ${hasCoords ? `
                        <button type="button" class="btn bsm bgh" onclick="panPlanMapToActiveStop({lat:${item.lat},lng:${item.lng}})" title="Centrar este pueblo en el mapa">
                            📍 Mapa
                        </button>
                    ` : ''}
                    <button type="button" class="btn bsm bc" onclick="addNodeStopFromMap('${escapeAttr(item.id)}')" title="Agregar este pueblo al plan activo">
                        ＋ Plan
                    </button>
                </div>
            </div>
        `;
    };

    return `
        <div class="plan-towns-coverage-section">
            <div class="plan-towns-coverage-header">
                <div class="plan-towns-coverage-title-group">
                    <div class="plan-towns-coverage-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11M8 14v4m4-4v4m4-4v4" />
                        </svg>
                    </div>
                    <div>
                        <div class="plan-towns-coverage-title">Cobertura y Atención de Pueblos</div>
                        <div class="plan-towns-coverage-subtitle">Pueblos con >80% de detalles físicos cubiertos y localidades esperando atención física</div>
                    </div>
                </div>
                <div class="plan-towns-coverage-header-actions">
                    <button type="button" class="plan-towns-pill-btn pill-covered" onclick="openTownsCoverageModal('covered')" title="Ver todos los pueblos con >80% completado">
                        <span class="pill-dot green"></span>
                        <span>>80% Cubierto: <b>${coveredList.length}</b></span>
                    </button>
                    <button type="button" class="plan-towns-pill-btn pill-unattended" onclick="openTownsCoverageModal('unattended', 'all')" title="Ver pueblos pendientes sin atención">
                        <span class="pill-dot red"></span>
                        <span>Sin atención: <b>${unattendedList.length}</b></span>
                    </button>
                    <button type="button" class="btn bsm bc" onclick="openTownsCoverageModal()" title="Abrir ventana completa de cobertura con búsqueda">
                        Ver todos y filtrar
                    </button>
                </div>
            </div>

            <div class="plan-towns-coverage-columns">
                <!-- Columna 1: >80% Cubierto -->
                <div class="plan-towns-col">
                    <div class="plan-towns-col-head">
                        <div class="plan-towns-col-title">
                            <span class="col-indicator green"></span>
                            <span>Más del 80% cubierto (${coveredList.length})</span>
                        </div>
                        <small style="font-size:11px;color:#15803d;font-weight:700;">Solo con detalles hechos</small>
                    </div>
                    <div class="plan-towns-cards-list">
                        ${previewCovered.length ? previewCovered.map(item => renderCard(item, true)).join('') : `
                            <div class="plan-towns-col-empty">
                                <span>No hay pueblos con >80% de avance completado aún.</span>
                            </div>
                        `}
                    </div>
                    ${coveredList.length > 3 ? `
                        <button type="button" class="plan-towns-col-more-btn" onclick="openTownsCoverageModal('covered')">
                            Ver todos los ${coveredList.length} pueblos cubiertos →
                        </button>
                    ` : ''}
                </div>

                <!-- Columna 2: Sin atención -->
                <div class="plan-towns-col">
                    <div class="plan-towns-col-head">
                        <div class="plan-towns-col-title">
                            <span class="col-indicator red"></span>
                            <span>Sin atención (${unattendedList.length})</span>
                        </div>
                        <div class="plan-towns-urgency-mini-tags">
                            ${nuncaCount > 0 ? `<button type="button" class="mini-urgency-tag tag-nunca" onclick="openTownsCoverageModal('unattended', 'nunca')" title="Pueblos con detalles registrados que nunca se han atendido">⛔ ${nuncaCount} Nunca atendidos</button>` : ''}
                            ${criticaCount > 0 ? `<button type="button" class="mini-urgency-tag tag-critica" onclick="openTownsCoverageModal('unattended', 'critica')" title="Ver pueblos con urgencia crítica (≥30 días)">🚨 ${criticaCount} Crítica</button>` : ''}
                            ${altaCount > 0 ? `<button type="button" class="mini-urgency-tag tag-alta" onclick="openTownsCoverageModal('unattended', 'alta')" title="Ver pueblos con urgencia alta (14-29 días)">⚠️ ${altaCount} Alta</button>` : ''}
                            ${mediaCount > 0 ? `<button type="button" class="mini-urgency-tag tag-media" onclick="openTownsCoverageModal('unattended', 'media')" title="Ver pueblos con urgencia media (7-13 días)">⏳ ${mediaCount} Media</button>` : ''}
                            ${bajaCount > 0 ? `<button type="button" class="mini-urgency-tag tag-baja" onclick="openTownsCoverageModal('unattended', 'baja')" title="Ver pueblos con urgencia baja (<7 días)">🔵 ${bajaCount} Baja</button>` : ''}
                        </div>
                    </div>
                    <div class="plan-towns-cards-list">
                        ${previewUnattended.length ? previewUnattended.map(item => renderCard(item, false)).join('') : `
                            <div class="plan-towns-col-empty">
                                <span>No hay pueblos con detalles pendientes sin atención.</span>
                            </div>
                        `}
                    </div>
                    ${unattendedList.length > 3 ? `
                        <button type="button" class="plan-towns-col-more-btn" onclick="openTownsCoverageModal('unattended')">
                            Ver todos los ${unattendedList.length} pueblos sin atención →
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function ensureTownsCoverageModalMarkup() {
    let modal = document.getElementById('towns-coverage-mo');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'towns-coverage-mo';
        modal.className = 'mo plan-dialog-overlay';
        modal.innerHTML = `
            <div class="towns-coverage-modal">
                <header class="towns-coverage-head">
                    <div class="towns-coverage-title-group">
                        <div class="towns-coverage-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11M8 14v4m4-4v4m4-4v4" />
                            </svg>
                        </div>
                        <div>
                            <h2>Cobertura de Pueblos</h2>
                            <p>Seguimiento operativo de detalles físicos por pueblo</p>
                        </div>
                    </div>
                    <button type="button" class="plan-dialog-close" onclick="CM('towns-coverage-mo')" aria-label="Cerrar ventana">✕</button>
                </header>

                <div class="towns-coverage-tabs">
                    <button type="button" class="towns-coverage-tab-btn active" id="tab-btn-covered" onclick="switchTownsCoverageTab('covered')">
                        <span>✓ Más del 80% cubierto</span>
                        <span class="towns-coverage-tab-count count-covered" id="badge-count-covered">0</span>
                    </button>
                    <button type="button" class="towns-coverage-tab-btn" id="tab-btn-unattended" onclick="switchTownsCoverageTab('unattended')">
                        <span>⚠️ Sin atención</span>
                        <span class="towns-coverage-tab-count count-unattended" id="badge-count-unattended">0</span>
                    </button>
                    <div style="margin-left:auto;padding-bottom:10px;">
                        <input id="towns-coverage-search" placeholder="Buscar pueblo o clave..." oninput="onTownsCoverageSearchInput(this.value)" style="box-sizing:border-box;height:34px;padding:0 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:12px;width:210px;outline:none;">
                    </div>
                </div>

                <div class="towns-coverage-body" id="towns-coverage-content"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    return modal;
}

function openTownsCoverageModal(tab = 'covered', urgencyFilter = 'all') {
    ensureTownsCoverageModalMarkup();
    townsCoverageCurrentTab = tab;
    townsCoverageUrgencyFilter = urgencyFilter || 'all';
    townsCoverageSearchQuery = '';
    const searchInput = document.getElementById('towns-coverage-search');
    if (searchInput) searchInput.value = '';
    updateTownsCoverageTabsUI();
    renderTownsCoverageContent();
    OM('towns-coverage-mo');
}

function switchTownsCoverageTab(tab) {
    townsCoverageCurrentTab = tab;
    townsCoverageUrgencyFilter = 'all';
    updateTownsCoverageTabsUI();
    renderTownsCoverageContent();
}

function setTownsCoverageUrgencyFilter(filter) {
    townsCoverageUrgencyFilter = filter || 'all';
    renderTownsCoverageContent();
}

function onTownsCoverageSearchInput(val) {
    townsCoverageSearchQuery = (val || '').toLowerCase().trim();
    renderTownsCoverageContent();
}

function updateTownsCoverageTabsUI() {
    const btnCovered = document.getElementById('tab-btn-covered');
    const btnUnattended = document.getElementById('tab-btn-unattended');
    if (btnCovered) btnCovered.classList.toggle('active', townsCoverageCurrentTab === 'covered');
    if (btnUnattended) btnUnattended.classList.toggle('active', townsCoverageCurrentTab === 'unattended');
}

function renderTownsCoverageContent() {
    const container = document.getElementById('towns-coverage-content');
    if (!container) return;

    const allData = calculateTownCoverageData();

    // 1. Pueblos con más del 80% cubierto (solo si tiene detalles completados)
    const coveredList = allData.filter(item => item.isCovered80);

    // 2. Pueblos que aún no se les ha dado atención (0 completados y con pendientes)
    const unattendedList = allData.filter(item => item.isUnattended);

    // Conteo por niveles de urgencia
    const criticaTotal = unattendedList.filter(i => i.urgency?.level === 'critica').length;
    const altaTotal = unattendedList.filter(i => i.urgency?.level === 'alta').length;
    const mediaTotal = unattendedList.filter(i => i.urgency?.level === 'media').length;
    const bajaTotal = unattendedList.filter(i => i.urgency?.level === 'baja').length;

    // Actualizar badges numéricos
    const badgeCovered = document.getElementById('badge-count-covered');
    const badgeUnattended = document.getElementById('badge-count-unattended');
    if (badgeCovered) badgeCovered.textContent = coveredList.length;
    if (badgeUnattended) badgeUnattended.textContent = unattendedList.length;

    let targetList = townsCoverageCurrentTab === 'covered' ? coveredList : unattendedList;

    // Filtrar por urgencia si estamos en pestaña sin atención
    if (townsCoverageCurrentTab === 'unattended' && townsCoverageUrgencyFilter !== 'all') {
        targetList = targetList.filter(item => item.urgency?.level === townsCoverageUrgencyFilter);
    }

    if (townsCoverageSearchQuery) {
        targetList = targetList.filter(item => {
            const q = townsCoverageSearchQuery;
            return item.townName.toLowerCase().includes(q) || item.code.toLowerCase().includes(q) || item.zone.toLowerCase().includes(q);
        });
    }

    let urgencyBarHtml = '';
    if (townsCoverageCurrentTab === 'unattended') {
        urgencyBarHtml = `
            <div class="towns-coverage-urgency-bar">
                <span class="urgency-bar-label">Nivel de urgencia:</span>
                <button type="button" class="urgency-filter-pill ${townsCoverageUrgencyFilter === 'all' ? 'active' : ''}" onclick="setTownsCoverageUrgencyFilter('all')">
                    Todas (${unattendedList.length})
                </button>
                <button type="button" class="urgency-filter-pill pill-critica ${townsCoverageUrgencyFilter === 'critica' ? 'active' : ''}" onclick="setTownsCoverageUrgencyFilter('critica')" title="≥30 días sin atención">
                    🚨 Crítica (${criticaTotal})
                </button>
                <button type="button" class="urgency-filter-pill pill-alta ${townsCoverageUrgencyFilter === 'alta' ? 'active' : ''}" onclick="setTownsCoverageUrgencyFilter('alta')" title="14 a 29 días sin atención">
                    ⚠️ Alta (${altaTotal})
                </button>
                <button type="button" class="urgency-filter-pill pill-media ${townsCoverageUrgencyFilter === 'media' ? 'active' : ''}" onclick="setTownsCoverageUrgencyFilter('media')" title="7 a 13 días sin atención">
                    ⏳ Media (${mediaTotal})
                </button>
                <button type="button" class="urgency-filter-pill pill-baja ${townsCoverageUrgencyFilter === 'baja' ? 'active' : ''}" onclick="setTownsCoverageUrgencyFilter('baja')" title="Menos de 7 días sin atención">
                    🔵 Baja (${bajaTotal})
                </button>
            </div>
        `;
    }

    if (!targetList.length) {
        container.innerHTML = `
            ${urgencyBarHtml}
            <div class="towns-coverage-empty">
                <strong>No hay pueblos en esta categoría</strong>
                <p>${townsCoverageCurrentTab === 'covered' ? 'Ningún pueblo supera actualmente el 80% de cobertura con detalles hechos.' : (townsCoverageUrgencyFilter !== 'all' ? `No se encontraron pueblos con nivel de urgencia "${townsCoverageUrgencyFilter}".` : 'Todos los pueblos con detalles ya han recibido al menos una atención.')}</p>
            </div>
        `;
        return;
    }

    // Ordenar listas
    if (townsCoverageCurrentTab === 'covered') {
        // Ordenar por porcentaje descendente y mayor total de detalles
        targetList.sort((a, b) => b.percentage - a.percentage || b.completed - a.completed);
    } else {
        // Ordenar por urgencia (mayor rango primero) y luego por fecha más antigua (mayor tiempo en espera)
        targetList.sort((a, b) => {
            const rankA = a.urgency ? a.urgency.rank : 0;
            const rankB = b.urgency ? b.urgency.rank : 0;
            if (rankB !== rankA) return rankB - rankA;
            const timeA = a.oldestPendingDate ? new Date(a.oldestPendingDate).getTime() : 0;
            const timeB = b.oldestPendingDate ? new Date(b.oldestPendingDate).getTime() : 0;
            return timeA - timeB;
        });
    }

    const cardsHtml = targetList.map(item => {
        const timeAgoText = formatTimeAgoCustom(item.oldestPendingDate);
        const resolvedAgoText = item.latestResolvedDate ? formatTimeAgoCustom(item.latestResolvedDate) : 'Sin fecha reciente';
        const hasCoords = !isNaN(item.lat) && !isNaN(item.lng);
        const cardUrgencyClass = townsCoverageCurrentTab === 'unattended' && item.urgency ? `urgency-${item.urgency.level}` : '';

        return `
            <div class="town-coverage-card ${cardUrgencyClass}">
                <div class="town-coverage-card-head">
                    <div class="town-coverage-card-title">
                        <strong title="${escapeAttr(item.townName)}">${escapeHtml(item.townName)}</strong>
                        <small>${escapeHtml(item.code ? item.code + ' · ' : '')}${escapeHtml(item.zone || 'Sin zona asignada')}</small>
                    </div>
                    ${townsCoverageCurrentTab === 'covered'
                ? `<span class="town-coverage-badge badge-green">${item.percentage}% Hecho</span>`
                : `<span class="town-coverage-badge ${item.urgency ? item.urgency.badgeClass : 'badge-red'}" title="${item.urgency ? item.urgency.label + ' (' + item.urgency.days + ' días sin atención)' : 'Sin atención'}">${item.urgency ? item.urgency.icon + ' ' + item.urgency.label : 'Sin atención'}</span>`
            }
                </div>

                ${townsCoverageCurrentTab === 'covered' ? `
                    <div class="town-coverage-progress-wrap">
                        <div class="town-coverage-progress-fill" style="width:${item.percentage}%"></div>
                    </div>
                    <div class="town-coverage-metrics-row">
                        <span>Avance: <b>${item.completed} de ${item.total}</b></span>
                        <span>Faltantes: <b>${item.pending}</b></span>
                    </div>
                    <div class="town-coverage-resolved-wait" style="margin-top:2px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <span>Último resuelto: <strong>${resolvedAgoText}</strong></span>
                    </div>
                ` : `
                    <div class="town-coverage-unattended-wait ${cardUrgencyClass}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;color:inherit;flex-shrink:0;">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>Sin atender: <strong>${timeAgoText}</strong> ${item.urgency ? `<span class="town-urgency-tag">(${item.urgency.days} días)</span>` : ''}</span>
                    </div>
                    <div class="town-coverage-metrics-row" style="margin-top:2px;">
                        <span>Detalles acumulados: <b>${item.total || item.pending} pendientes</b></span>
                    </div>
                `}

                <div class="town-coverage-actions">
                    ${hasCoords ? `
                        <button type="button" class="btn bsm bgh" onclick="panPlanMapToActiveStop({lat:${item.lat},lng:${item.lng}}); CM('towns-coverage-mo');" title="Centrar este pueblo en el mapa">
                            📍 Ver en mapa
                        </button>
                    ` : ''}
                    <button type="button" class="btn bsm bc" onclick="addNodeStopFromMap('${escapeAttr(item.id)}'); CM('towns-coverage-mo');" title="Agregar parada de este pueblo al plan activo">
                        ＋ Agregar al plan
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        ${urgencyBarHtml}
        <div class="towns-coverage-grid">
            ${cardsHtml}
        </div>
    `;
}

window.openTownsCoverageModal = openTownsCoverageModal;
window.switchTownsCoverageTab = switchTownsCoverageTab;
window.setTownsCoverageUrgencyFilter = setTownsCoverageUrgencyFilter;
window.onTownsCoverageSearchInput = onTownsCoverageSearchInput;
window.renderTownsCoverageSection = renderTownsCoverageSection;
window.calculateTownCoverageData = calculateTownCoverageData;
window.getTownUrgencyInfo = getTownUrgencyInfo;

function openWeeklyRouteModal() {
    weeklyRouteSelectedDay = 'all';
    weeklyRouteListCollapsed = false;
    const modal = document.querySelector('#plan-route-mo .route-full-modal');
    if (modal) modal.classList.remove('map-maximized');
    const btnLabel = document.getElementById('route-toggle-list-text');
    if (btnLabel) btnLabel.textContent = 'Maximizar mapa';

    const allStops = getOrderedRouteStops();
    renderWeeklyRouteDayFilters(allStops);
    renderWeeklyRouteView();
    OM('plan-route-mo');

    setTimeout(() => {
        initRouteFullMap();
        renderRouteFullMap(getFilteredWeeklyRouteStops());
    }, 100);
}

function closeWeeklyRouteModal() {
    CM('plan-route-mo');
    setTimeout(() => routeFullMap?.invalidateSize(), 80);
}

function stripExcelText(value) {
    return String(value ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function excelCell(value) {
    return escapeHtml(stripExcelText(value));
}

function getWeeklyRouteExportRows(stops = getFilteredWeeklyRouteStops()) {
    const rows = [];
    stops.forEach((stop, idx) => {
        const orderNum = idx + 1;
        const region = rById(getStopRegion(stop)).n;
        if (!stop.details.length) {
            rows.push({
                order: orderNum,
                comunidad: stop.name || 'Parada',
                region,
                prioridad: '',
                tipo: '',
                detalle: stop.notes || 'Sin detalles ligados.',
                comentario: '',
                estado: stop.progress.complete ? 'Hecho' : 'Pendiente'
            });
            return;
        }

        stop.details.forEach(detail => {
            rows.push({
                order: orderNum,
                comunidad: stop.name || 'Parada',
                region,
                prioridad: stripExcelText(pl(detail.priority)),
                tipo: stripExcelText(vl(detail.visitType)),
                detalle: detail.title || '',
                comentario: detail.desc || stop.notes || '',
                estado: detail.status === 'completada' ? 'Hecho' : 'Pendiente'
            });
        });
    });
    return rows;
}

function downloadExcelHtml(filename, html) {
    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function exportWeeklyRouteExcel() {
    const stops = getFilteredWeeklyRouteStops ? getFilteredWeeklyRouteStops() : getOrderedRouteStops();
    if (!stops.length) {
        notify('No hay paradas para exportar en este filtro', 'err');
        return;
    }

    const tech = getSelectedTech();
    const generalPlan = getSelectedGeneralPlan();
    const dayLabelStr = weeklyRouteSelectedDay === 'all' ? 'semanal_completa' : (weeklyRouteSelectedDay === 'unscheduled' ? 'sin_fecha' : weeklyRouteSelectedDay);
    const label = selectedTechId === SHARED_PLAN_ID
        ? `${tech?.nombre || 'Plan general compartido'} - ${generalPlan?.name || 'Plan general'}`
        : `${tech?.nombre || 'Tecnico'} - ${dayLabel(selectedDay)}`;
    const rows = getWeeklyRouteExportRows(stops);
    const totalDetails = stops.reduce((sum, stop) => sum + stop.progress.total, 0);
    const pendingDetails = stops.reduce((sum, stop) => sum + stop.progress.pending, 0);
    const safeName = `${stripExcelText(label).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'ruta'}_${dayLabelStr}`;
    const date = new Date().toISOString().slice(0, 10);

    const tableRows = rows.map(row => `
        <tr>
            <td>${excelCell(row.order)}</td>
            <td>${excelCell(row.comunidad)}</td>
            <td>${excelCell(row.region)}</td>
            <td>${excelCell(row.prioridad)}</td>
            <td>${excelCell(row.tipo)}</td>
            <td>${excelCell(row.detalle)}</td>
            <td>${excelCell(row.comentario)}</td>
            <td>${excelCell(row.estado)}</td>
        </tr>
    `).join('');

    const html = `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body{font-family:Arial,sans-serif}
                table{border-collapse:collapse;width:100%}
                th,td{border:1px solid #000;padding:6px;vertical-align:top}
                th{background:#f3f6fb;font-weight:bold;text-align:center}
                .title{font-size:16px;font-weight:bold;text-align:center;background:#fff}
                .summary{font-weight:bold;background:#eef5ff}
            </style>
        </head>
        <body>
            <table>
                <tr><th class="title" colspan="8">${excelCell(label)} (${excelCell(weeklyRouteSelectedDay === 'all' ? 'Todos los días' : formatCalendarDate(weeklyRouteSelectedDay))})</th></tr>
                <tr class="summary">
                    <td colspan="2">Paradas: ${stops.length}</td>
                    <td colspan="2">Detalles: ${totalDetails}</td>
                    <td colspan="2">Pendientes: ${pendingDetails}</td>
                    <td colspan="2">Hechos: ${totalDetails - pendingDetails}</td>
                </tr>
                <tr>
                    <th>ORDEN</th>
                    <th>COMUNIDAD</th>
                    <th>REGION</th>
                    <th>PRIORIDAD</th>
                    <th>TIPO</th>
                    <th>DETALLE</th>
                    <th>COMENTARIO</th>
                    <th>ESTADO</th>
                </tr>
                ${tableRows}
            </table>
        </body>
        </html>
    `;

    downloadExcelHtml(`${safeName}_${date}.xls`, html);
    notify('Excel de la ruta descargado');
}

function renderWeeklyRouteList(stops) {
    const box = document.getElementById('plan-route-list');
    if (!box) return;
    if (!stops.length) {
        box.innerHTML = '<div class="plan-empty">No hay paradas con coordenadas para este filtro.</div>';
        return;
    }

    box.innerHTML = stops.map((stop, index) => {
        let transitBadge = '';
        if (index > 0) {
            const prev = stops[index - 1];
            if (!isNaN(prev.lat) && !isNaN(prev.lng) && !isNaN(stop.lat) && !isNaN(stop.lng)) {
                const leg = estimateRouteTravel(prev.lat, prev.lng, stop.lat, stop.lng);
                transitBadge = `
                    <div class="plan-inter-stop-transit">
                        <div class="transit-line"></div>
                        <div class="transit-badge" title="Tiempo estimado en carretera (38 km/h)">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
                            <span><b>~${leg.minutes} min</b> (${leg.km} km)</span>
                        </div>
                    </div>`;
            }
        }

        const region = rById(getStopRegion(stop)).n;
        const adminStatus = getStopAdminStatus(stop, stop.progress);
        const visibleNotes = getVisibleStopNotes(stop, stop.details);
        const detailRows = stop.details.length
            ? stop.details.map(detail => `
                <div class="route-detail-line ${detail.status === 'completada' ? 'done' : ''} ${detail.status === 'no_realizado' ? 'not-done' : ''}">
                    <span style="border-color:${pc(detail.priority)}">${detail.status === 'completada' ? 'Hecho' : (detail.status === 'no_realizado' ? 'No realizado' : pl(detail.priority))}</span>
                    <strong>${escapeHtml(detail.title || 'Detalle')}</strong>
                    ${detail.clientName ? `<small><b>Cliente:</b> ${escapeHtml(detail.clientName)}</small>` : ''}
                    ${detail.desc ? `<small>${escapeHtml(detail.desc)}</small>` : ''}
                    ${renderDetailLocation(detail.detailLocation)}
                    ${renderAdminTechReport(detail)}
                    <div class="route-detail-actions">
                        ${detail.status === 'completada' ? '' : `<button class="btn bsm bg2" onclick="toggleRouteDetailStatus('${escapeAttr(detail.id)}')">Hecho</button>`}
                        <button class="btn bsm br" onclick="deleteRouteDetail('${escapeAttr(detail.id)}')">Eliminar</button>
                    </div>
                </div>`).join('')
            : '<div class="ant-muted">Sin detalles ligados.</div>';

        const dayTag = stop.scheduledDate ? `<small style="font-size:9px;background:#eef5fc;color:#1d4ed8;border-radius:4px;padding:2px 5px;margin-left:6px;font-weight:700">${formatCalendarDate(stop.scheduledDate)}</small>` : '';

        return `
            ${transitBadge}
            <div class="route-stop-card" data-route-stop-id="${escapeAttr(stop.id)}">
                <div class="route-stop-top">
                    <span class="route-stop-num">${index + 1}</span>
                    <div>
                        <div class="route-stop-name">${escapeHtml(stop.name || 'Parada')} ${dayTag}</div>
                        <div class="route-stop-meta">${escapeHtml(region)} - ${stop.lat.toFixed(5)}, ${stop.lng.toFixed(5)}</div>
                    </div>
                </div>
                <div class="route-stop-status">
                    <span class="badge ${adminStatus.cls}">${adminStatus.text}</span>
                    <span class="badge bty">${stop.progress.done}/${stop.progress.total} detalles hechos</span>
                </div>
                ${(stop.startedAt || stop.adminReleasedAt) ? `
                    <div class="route-stop-timeline">
                        ${stop.startedAt ? `<span>Inicio tecnico: <strong>${formatPlanDateTime(stop.startedAt)}</strong></span>` : ''}
                        ${stop.adminReleasedAt ? `<span>Salida admin: <strong>${formatPlanDateTime(stop.adminReleasedAt)}</strong></span>` : ''}
                    </div>` : ''}
                ${visibleNotes ? `<div class="route-stop-notes">${escapeHtml(visibleNotes)}</div>` : ''}
                <div class="route-stop-details">${detailRows}</div>
                <div class="route-stop-actions">
                    ${stop.progress.complete ? '' : `<button class="btn bsm bg2" onclick="toggleRouteStopCompletion('${escapeAttr(stop.day || selectedDay)}','${escapeAttr(stop.id)}')">Marcar sitio hecho</button>`}
                    <button class="btn bsm ${stop.progress.complete && !stop.adminReleasedAt ? 'bc' : 'bgh'}" onclick="releaseRouteStopFromAdmin('${escapeAttr(stop.day || selectedDay)}','${escapeAttr(stop.id)}')" ${stop.progress.complete && !stop.adminReleasedAt ? '' : 'disabled'}>Dar salida</button>
                </div>
            </div>`;
    }).join('');
    focusNewestStartedStop(getPlanStopsForView('general'));
}

function refreshWeeklyRouteModal() {
    const modal = document.getElementById('plan-route-mo');
    if (modal?.classList.contains('open')) {
        openWeeklyRouteModal();
    } else {
        renderPlan();
    }
}

async function toggleRouteDetailStatus(detailId) {
    const detail = (state.workOrders || []).find(w => w.id === detailId && !w.deletedAt);
    if (!detail) return;
    detail.status = detail.status === 'completada' ? 'pendiente' : 'completada';
    detail.completedAt = detail.status === 'completada' ? new Date().toISOString() : '';
    setUpdatedAudit(detail, detail.status === 'completada' ? 'marcó detalle hecho' : 'restableció detalle');
    getPlanMapStops().forEach(stop => {
        if ((stop.detailIds || []).includes(detailId) || (stop.equipmentId && stop.equipmentId === detail.equipmentId)) {
            syncStopCompletion(stop);
            stop.updatedAt = new Date().toISOString();
        }
    });
    const saved = await saveDB();
    if (!saved) {
        notify('No se pudo guardar en la nube. Intenta de nuevo.', 'err');
        return;
    }
    refreshWeeklyRouteModal();
    notify(detail.status === 'completada' ? 'Detalle marcado como hecho' : 'Detalle restablecido');
}

async function deleteRouteDetail(detailId) {
    const detail = (state.workOrders || []).find(w => w.id === detailId && !w.deletedAt);
    if (!detail) return;
    const confirmed = await askConfirmation({ title: 'Eliminar detalle', message: 'Este detalle se quitará de la ruta.', confirmText: 'Eliminar', cancelText: 'Cancelar', tone: 'danger' });
    if (!confirmed) return;
    getPlanMapStops().forEach(stop => {
        stop.detailIds = (stop.detailIds || []).filter(id => id !== detailId);
        syncStopCompletion(stop);
    });
    detail.deletedAt = new Date().toISOString();
    detail.status = 'eliminada';
    await saveDB();
    refreshWeeklyRouteModal();
    notify('Detalle eliminado');
}

async function toggleRouteStopCompletion(day, stopId) {
    await toggleStopCompletion(selectedTechId, day, stopId);
    refreshWeeklyRouteModal();
}

async function releaseRouteStopFromAdmin(day, stopId) {
    await releaseStopFromAdmin(selectedTechId, day, stopId);
    refreshWeeklyRouteModal();
}

function initRouteFullMap() {
    const el = document.getElementById('plan-route-full-map');
    if (!el || typeof L === 'undefined') return;
    if (!routeFullMap) {
        routeFullMap = L.map('plan-route-full-map').setView([17.55, -99.50], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19
        }).addTo(routeFullMap);
    }
    setTimeout(() => routeFullMap.invalidateSize(), 120);
}

function clearRouteFullMap() {
    if (!routeFullMap) return;
    if (routeFullLayer) {
        routeFullMap.removeLayer(routeFullLayer);
        routeFullLayer = null;
    }
    routeFullMarkers.forEach(marker => routeFullMap.removeLayer(marker));
    routeFullMarkers = [];
}

function getRouteFullPopupHtml(stop) {
    const region = rById(getStopRegion(stop)).n;
    const details = Array.isArray(stop.details) ? stop.details : [];
    const detailHtml = details.length ? details.slice(0, 10).map(detail => `
        <div class="route-popup-detail ${detail.status === 'completada' ? 'done' : ''}">
            <span style="border-color:${pc(detail.priority)}">${pl(detail.priority)}</span>
            <strong>${escapeHtml(detail.title || 'Detalle')}</strong>
            <small>${detail.status === 'completada' ? 'Hecho' : 'Pendiente'} · ${escapeHtml(vl(detail.visitType))}${detail.clientName ? ` · Cliente: ${escapeHtml(detail.clientName)}` : ''}</small>
        </div>`).join('') : '<div class="ant-muted">Sin detalles ligados.</div>';
    const more = details.length > 10 ? `<div class="ant-muted">+ ${details.length - 10} detalles mas en la lista lateral.</div>` : '';
    return `
        <div class="route-popup">
            <div class="route-popup-title">${stop.order}. ${escapeHtml(stop.name || 'Parada')}</div>
            <div class="route-popup-meta">${escapeHtml(region)} · ${Number(stop.lat).toFixed(5)}, ${Number(stop.lng).toFixed(5)}</div>
            ${stop.material ? `<div class="route-popup-material"><strong>Material:</strong> ${escapeHtml(stop.material)}</div>` : ''}
            <div class="route-popup-summary">${stop.progress?.done || 0}/${stop.progress?.total || 0} detalles hechos</div>
            <div class="route-popup-details">${detailHtml}${more}</div>
            <div class="route-popup-actions">
                <button class="btn bsm bc" onclick="scrollRouteStopIntoView('${escapeAttr(stop.id)}')">Ver en lista</button>
            </div>
        </div>`;
}

function scrollRouteStopIntoView(stopId) {
    const card = document.querySelector(`[data-route-stop-id="${CSS.escape(String(stopId))}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('route-stop-flash');
    setTimeout(() => card.classList.remove('route-stop-flash'), 1400);
}

function addRouteFullLine(latLngs, options = {}) {
    if (!routeFullLayer) routeFullLayer = L.layerGroup().addTo(routeFullMap);
    const line = L.polyline(latLngs, options).addTo(routeFullLayer);
    if (typeof line.bringToFront === 'function') line.bringToFront();
    return line;
}

async function renderRouteFullMap(stops) {
    if (!routeFullMap) return;
    clearRouteFullMap();
    const routedStops = ensureRoutePointsStartAtWiFiMex(stops);
    if (!routedStops.length) {
        routeFullMap.setView([17.55, -99.50], 8);
        return;
    }

    const latLngs = routedStops.map(stop => [stop.lat, stop.lng]);
    routeFullLayer = L.layerGroup().addTo(routeFullMap);

    // Linea de respaldo visible siempre. Asi el mapa grande nunca queda sin ruta.
    if (latLngs.length > 1) {
        addRouteFullLine(latLngs, { color: '#ffffff', weight: 9, opacity: .95, interactive: false });
        addRouteFullLine(latLngs, { color: '#f59e0b', weight: 5, opacity: .95, dashArray: '10 7', interactive: false });
    }

    routedStops.forEach((stop, index) => {
        const orderNum = index + 1;
        const dayAbbr = stop.scheduledDate ? formatCalendarDate(stop.scheduledDate).slice(0, 3) : '';
        const stopLabel = stop.isOrigin ? (stop.name || 'WiFi-Mex') : getPlanMapStopDisplayName(stop);
        const marker = L.marker([stop.lat, stop.lng], {
            icon: makePlanStopMarkerIcon(stop, orderNum, { dayAbbr: weeklyRouteSelectedDay === 'all' ? dayAbbr : '' }),
            zIndexOffset: 1000
        }).addTo(routeFullMap);
        marker.bindTooltip(`${stop.isOrigin ? 'Base · ' : `${orderNum}. `}${escapeHtml(stopLabel)}${dayAbbr ? ` (${dayAbbr})` : ''}`, { permanent: true, direction: 'right', offset: [16, 0], className: 'plan-map-stop-label' });
        marker.bindPopup(stop.isOrigin ? `<div class="plan-map-popup"><strong>${escapeHtml(stopLabel)}</strong><div style="font-size:11px;color:#0f766e;font-weight:700;">Parada principal · Base de salida</div></div>` : getRouteFullPopupHtml({ ...stop, name: stopLabel, order: orderNum }), { maxWidth: 420, className: 'route-map-popup' });
        routeFullMarkers.push(marker);
    });

    const fitStops = () => routeFullMap.fitBounds(latLngs, { padding: [46, 46] });
    fitStops();
    setTimeout(() => {
        routeFullMap.invalidateSize();
        fitStops();
        if (routeFullLayer && typeof routeFullLayer.bringToFront === 'function') routeFullLayer.bringToFront();
        routeFullMarkers.forEach(marker => marker.setZIndexOffset(1200));
    }, 140);

    if (routedStops.length === 1) return;

    try {
        const route = await fetchRoadRouteChunked(routedStops, 24);

        // Ruta guiada por carretera arriba de la linea directa.
        if (!routeFullLayer) routeFullLayer = L.layerGroup().addTo(routeFullMap);
        routeFullLayer.clearLayers();
        L.geoJSON(route.geometry, { style: { color: '#ffffff', weight: 10, opacity: .98, interactive: false } }).addTo(routeFullLayer);
        L.geoJSON(route.geometry, { style: { color: '#0b63ce', weight: 6, opacity: .96, interactive: false } }).addTo(routeFullLayer);
        L.geoJSON(route.geometry, { style: { color: '#38bdf8', weight: 2, opacity: .98, interactive: false } }).addTo(routeFullLayer);

        const km = (route.distance / 1000).toFixed(1);
        const min = Math.round(route.duration / 60);
        const sub = document.getElementById('plan-route-sub');
        if (sub && !sub.textContent.includes('Ruta guiada')) {
            sub.insertAdjacentHTML('beforeend', `<span>Ruta guiada: ${km} km · ${min} min</span>`);
        }
        if (routeFullLayer && typeof routeFullLayer.bringToFront === 'function') routeFullLayer.bringToFront();
        routeFullMarkers.forEach(marker => marker.setZIndexOffset(1400));
    } catch (e) {
        const sub = document.getElementById('plan-route-sub');
        if (sub && !sub.textContent.includes('Linea directa')) {
            sub.insertAdjacentHTML('beforeend', '<span>Linea directa visible; carretera no disponible</span>');
        }
    }
}

function renderPlanAntennaMarkers() {
    (state.equipment || []).forEach(eq => {
        const lat = safeFloat(eq.lat);
        const lng = safeFloat(eq.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const status = getPlanningMapStatus('equipment', eq.id);
        const marker = L.circleMarker([lat, lng], {
            radius: 5,
            color: '#fff',
            weight: 1.5,
            fillColor: status.color,
            fillOpacity: 0.9
        }).addTo(planMap);

        const details = sortDetailsByPriority(getEntityOpenDetails('equipment', eq.id));
        marker.bindTooltip(`${eq.name}${eq.ip ? ` · ${eq.ip}` : ''}`, { direction: 'top', offset: [0, -8] });
        marker.bindPopup(`
            <div style="min-width:220px;font-family:'Manrope',sans-serif">
                <div style="font-weight:900;font-size:13px;margin-bottom:4px">${escapeHtml(eq.name)}</div>
                ${eq.ip ? `<div class="mono" style="font-size:10px;color:#64748b">${escapeHtml(eq.ip)}</div>` : ''}
                <div style="margin:8px 0"><span class="badge" style="background:${status.color};color:#fff">${status.label}</span></div>
                ${details.length
                ? details.slice(0, 4).map(d => `<div style="font-size:11px;margin-top:6px"><strong style="color:${pc(d.priority)}">${escapeHtml(d.title)}</strong></div>`).join('')
                : '<div style="font-size:11px;color:#64748b">Sin detalles pendientes</div>'}
            </div>
        `);

        planAntennaMarkers.push(marker);
    });
}

function fitPlanMapToAntennas() {
    if (planMapExpanded) return;
    const antennaPoints = (state.equipment || [])
        .filter(eq => !isNaN(safeFloat(eq.lat)) && !isNaN(safeFloat(eq.lng)))
        .map(eq => [safeFloat(eq.lat), safeFloat(eq.lng)]);
    if (!antennaPoints.length) {
        planMap.setView([17.55, -99.50], 8);
        return;
    }
    planMap.fitBounds(antennaPoints, { padding: [25, 25] });
}

function renderPlanAntennaMarkers() {
    (state.equipment || []).forEach(eq => {
        if (!eq || eq.deletedAt) return;
        const lat = safeFloat(eq.lat);
        const lng = safeFloat(eq.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const st = getPlanningMapStatus('equipment', eq.id);
        const marker = L.marker([lat, lng], {
            icon: makePlanPointIcon(st.color, '', 'tower'),
            zIndexOffset: 80
        }).addTo(planMap);

        marker.bindTooltip(`${eq.name}${eq.ip ? ` · ${eq.ip}` : ''}`, {
            direction: 'top',
            offset: [0, -12]
        });

        marker.on('click', () => {
            const details = sortDetailsByPriority(getEntityOpenDetails('equipment', eq.id));
            marker.bindPopup(`
                <div style="min-width:200px;font-family:'Manrope',sans-serif">
                    <div style="font-weight:900;font-size:13px;margin-bottom:4px">${escapeHtml(eq.name)}</div>
                    <div class="mono" style="font-size:10px;color:#64748b">${escapeHtml(eq.ip || 'Sin IP')}</div>
                    <div style="margin:8px 0"><span class="badge" style="background:${st.color};color:#fff">${st.label}</span></div>
                    ${renderMapEntityDetailStats('equipment', eq.id)}
                    ${details.length ? details.slice(0, 4).map(d => `<div style="font-size:11px;margin-top:6px"><strong style="color:${pc(d.priority)}">${escapeHtml(d.title)}</strong></div>`).join('') : '<div style="font-size:11px;color:#64748b">Sin detalles pendientes</div>'}
                    ${canManagePlanStops() ? `<button class="btn bsm bc" style="margin-top:10px;width:100%" onclick="addEquipmentStopFromMap('${escapeAttr(eq.id)}')">Agregar parada</button>` : ''}
                </div>
            `).openPopup();
        });

        planAntennaMarkers.push(marker);
    });
}

function fitPlanMapToAntennas() {
    if (planMapExpanded) return;
    const points = (state.equipment || [])
        .filter(eq => !isNaN(safeFloat(eq.lat)) && !isNaN(safeFloat(eq.lng)))
        .map(eq => [safeFloat(eq.lat), safeFloat(eq.lng)]);
    if (!points.length && typeof fitPlanMapView !== 'function') {
        planMap.setView([17.55, -99.50], 8);
        return;
    }
    if (typeof fitPlanMapView === 'function') {
        fitPlanMapView([]);
        return;
    }
    planMap.fitBounds(points, { padding: [25, 25] });
}

function fitPlanMapView(routePoints) {
    if (planMapExpanded || !planMap) return;
    const routeLatLngs = (routePoints || [])
        .map(point => [safeFloat(point.lat), safeFloat(point.lng)])
        .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
    if (!routeLatLngs.length) {
        planMap.setView([17.55, -99.50], 8);
        return;
    }
    if (routeLatLngs.length === 1) {
        planMap.setView(routeLatLngs[0], 12);
        return;
    }
    planMap.fitBounds(routeLatLngs, { padding: [30, 30], maxZoom: 13 });
}

function getRoadRouteCacheKey(points) {
    const valid = (points || [])
        .map(point => ({ lat: safeFloat(point.lat), lng: safeFloat(point.lng) }))
        .filter(point => !isNaN(point.lat) && !isNaN(point.lng));
    if (valid.length < 2) return '';
    return valid.map(p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
}

function cacheRoadRoute(key, route) {
    if (!key || !route || route.isDirectFallback) return;
    if (planRoadRouteCache.size >= 60) {
        const oldestKey = planRoadRouteCache.keys().next().value;
        if (oldestKey) planRoadRouteCache.delete(oldestKey);
    }
    planRoadRouteCache.set(key, route);
}

function buildDirectRouteResult(validPoints) {
    const features = [];
    for (let i = 0; i < validPoints.length - 1; i++) {
        const from = validPoints[i];
        const to = validPoints[i + 1];
        features.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[from.lng, from.lat], [to.lng, to.lat]] },
            properties: { kind: 'direct' }
        });
    }
    return {
        geometry: { type: 'FeatureCollection', features },
        distance: 0,
        duration: 0,
        partial: true,
        directLegs: features.length,
        isDirectFallback: true
    };
}

async function fetchOsrmRoute(points) {
    const validPoints = (points || [])
        .map(point => ({ lat: safeFloat(point.lat), lng: safeFloat(point.lng) }))
        .filter(point => !isNaN(point.lat) && !isNaN(point.lng));
    if (validPoints.length < 2) throw new Error('Sin puntos suficientes');

    const coords = validPoints.map(point => `${point.lng},${point.lat}`).join(';');
    const baseUrl = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=simplified&geometries=geojson&steps=false&continue_straight=false`;
    const unlimited = validPoints.map(() => 'unlimited').join(';');
    const urls = [`${baseUrl}&radiuses=${unlimited}`, baseUrl];

    let lastError = null;
    for (const url of urls) {
        if (url.length > 8000) {
            lastError = new Error('URL demasiado larga para OSRM');
            continue;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        try {
            const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) {
                const err = new Error(`OSRM ${res.status}`);
                err.status = res.status;
                // Solo reintentar otro formato de URL si OSRM rechazó los parámetros (400).
                if (res.status !== 400) throw err;
                lastError = err;
                continue;
            }
            const data = await res.json();
            if (data.routes && data.routes[0]) return data.routes[0];
            lastError = new Error('Sin ruta por carretera');
        } catch (e) {
            clearTimeout(timeoutId);
            lastError = e;
            // Si hubo timeout, caída de red, 429 o 5xx, no insistir contra el mismo servidor.
            if (e?.name === 'AbortError' || (e?.status && e.status !== 400) || !e?.status) {
                break;
            }
        }
    }
    throw lastError || new Error('OSRM no disponible');
}


async function fetchRoadRoute(points, maxPoints = 25) {
    const validPoints = (points || [])
        .map(point => ({ lat: safeFloat(point.lat), lng: safeFloat(point.lng) }))
        .filter(point => !isNaN(point.lat) && !isNaN(point.lng));
    if (validPoints.length < 2) throw new Error('Sin puntos suficientes');

    const routedPoints = validPoints.length > maxPoints ? thinRoutePoints(validPoints, maxPoints) : validPoints;
    const cacheKey = getRoadRouteCacheKey(routedPoints);
    if (cacheKey && planRoadRouteCache.has(cacheKey)) {
        return planRoadRouteCache.get(cacheKey);
    }
    if (cacheKey && planRoadRouteInFlight.has(cacheKey)) {
        return planRoadRouteInFlight.get(cacheKey);
    }

    const work = (async () => {
        try {
            const fullRoute = await fetchOsrmRoute(routedPoints);
            const result = { ...fullRoute, partial: false, directLegs: 0, isDirectFallback: false };
            cacheRoadRoute(cacheKey, result);
            return result;
        } catch (e) {
            // Si OSRM no responde (timeout / red / 429 / 5xx), regresar trazo directo al instante sin bloquear.
            const isRoutingRejection = e?.status === 400 || String(e?.message || '').includes('Sin ruta');
            if (!isRoutingRejection || routedPoints.length <= 2) {
                return buildDirectRouteResult(routedPoints);
            }
        }

        // Solo si OSRM rechazó una parada específica, resolver tramos en paralelo (máx. 6 tramos).
        const legCount = routedPoints.length - 1;
        const maxLegAttempts = Math.min(legCount, 6);
        const legResults = await Promise.all(
            Array.from({ length: legCount }, async (_, i) => {
                const from = routedPoints[i];
                const to = routedPoints[i + 1];
                if (i < maxLegAttempts) {
                    try {
                        const leg = await fetchOsrmRoute([from, to]);
                        return {
                            feature: { type: 'Feature', geometry: leg.geometry, properties: { kind: 'road' } },
                            distance: Number(leg.distance || 0),
                            duration: Number(leg.duration || 0),
                            isRoad: true
                        };
                    } catch (err) { }
                }
                return {
                    feature: {
                        type: 'Feature',
                        geometry: { type: 'LineString', coordinates: [[from.lng, from.lat], [to.lng, to.lat]] },
                        properties: { kind: 'direct' }
                    },
                    distance: 0,
                    duration: 0,
                    isRoad: false
                };
            })
        );

        const features = legResults.map(r => r.feature);
        const distance = legResults.reduce((acc, r) => acc + r.distance, 0);
        const duration = legResults.reduce((acc, r) => acc + r.duration, 0);
        const roadLegs = legResults.filter(r => r.isRoad).length;
        const directLegs = legResults.length - roadLegs;
        const result = {
            geometry: { type: 'FeatureCollection', features },
            distance,
            duration,
            partial: directLegs > 0,
            directLegs,
            isDirectFallback: roadLegs === 0
        };
        if (roadLegs > 0) cacheRoadRoute(cacheKey, result);
        return result;
    })();

    if (cacheKey) {
        planRoadRouteInFlight.set(cacheKey, work);
        work.finally(() => planRoadRouteInFlight.delete(cacheKey));
    }
    return work;
}

async function fetchRoadRouteChunked(points, chunkSize = 24) {
    const validPoints = (points || [])
        .map(point => ({ lat: safeFloat(point.lat), lng: safeFloat(point.lng) }))
        .filter(point => !isNaN(point.lat) && !isNaN(point.lng));
    if (validPoints.length < 2) throw new Error('Sin puntos suficientes');

    const fullKey = getRoadRouteCacheKey(validPoints);
    if (fullKey && planRoadRouteCache.has(fullKey)) {
        return planRoadRouteCache.get(fullKey);
    }
    if (validPoints.length <= chunkSize) return fetchRoadRoute(validPoints, chunkSize);

    const segments = [];
    for (let start = 0; start < validPoints.length - 1; start += chunkSize - 1) {
        const segment = validPoints.slice(start, Math.min(start + chunkSize, validPoints.length));
        if (segment.length >= 2) segments.push(segment);
    }

    const routes = await Promise.all(segments.map(seg => fetchRoadRoute(seg, chunkSize)));
    const features = [];
    let distance = 0;
    let duration = 0;
    let partial = false;
    let directLegs = 0;
    let anyRoad = false;

    for (const route of routes) {
        distance += Number(route.distance || 0);
        duration += Number(route.duration || 0);
        partial = partial || !!route.partial;
        directLegs += Number(route.directLegs || 0);
        if (!route.isDirectFallback) anyRoad = true;
        if (route.geometry?.type === 'FeatureCollection') {
            features.push(...(route.geometry.features || []));
        } else if (route.geometry) {
            features.push({ type: 'Feature', geometry: route.geometry, properties: { kind: route.partial ? 'partial' : 'road' } });
        }
    }

    if (!features.length) throw new Error('Sin ruta por carretera');
    const combined = {
        geometry: { type: 'FeatureCollection', features },
        distance,
        duration,
        partial,
        directLegs,
        isDirectFallback: !anyRoad
    };
    if (anyRoad) cacheRoadRoute(fullKey, combined);
    return combined;
}

function renderPlanMapRouteLayer(route, latLngs) {
    if (!planMap) return;
    if (planRouteLayer) {
        planMap.removeLayer(planRouteLayer);
        planRouteLayer = null;
    }
    planRouteLayer = L.layerGroup().addTo(planMap);
    if (route && route.geometry && !route.isDirectFallback) {
        L.geoJSON(route.geometry, {
            style: { color: '#ffffff', weight: 9, opacity: 0.92, lineCap: 'round', lineJoin: 'round' },
            interactive: false
        }).addTo(planRouteLayer);
        L.geoJSON(route.geometry, {
            style: { color: '#0b63ce', weight: 5, opacity: 0.96, lineCap: 'round', lineJoin: 'round' },
            interactive: false
        }).addTo(planRouteLayer);
        L.geoJSON(route.geometry, {
            style: { color: '#38bdf8', weight: 2, opacity: 0.9, lineCap: 'round', lineJoin: 'round' },
            interactive: false
        }).addTo(planRouteLayer);
        return;
    }
    if (Array.isArray(latLngs) && latLngs.length >= 2) {
        L.polyline(latLngs, {
            color: '#ffffff',
            weight: 8,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
            interactive: false
        }).addTo(planRouteLayer);
        L.polyline(latLngs, {
            color: '#0b63ce',
            weight: 4.5,
            opacity: 0.9,
            dashArray: '10 8',
            lineCap: 'round',
            lineJoin: 'round',
            interactive: false
        }).addTo(planRouteLayer);
    }
}

async function drawRoadRoute(points, renderId = planRouteRenderId) {
    if (!planMap) return;
    const latLngs = (points || [])
        .map(p => [safeFloat(p.lat), safeFloat(p.lng)])
        .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
    if (latLngs.length < 2) {
        fitPlanMapView(points);
        return;
    }

    const cacheKey = getRoadRouteCacheKey(points);
    const cachedRoute = cacheKey ? planRoadRouteCache.get(cacheKey) : null;
    if (cachedRoute) {
        renderPlanMapRouteLayer(cachedRoute, latLngs);
        fitPlanMapView(points);
        return;
    }

    // Trazar de inmediato el camino visible (0ms) mientras se obtiene la carretera real en segundo plano.
    renderPlanMapRouteLayer(null, latLngs);
    fitPlanMapView(points);

    try {
        const route = await fetchRoadRouteChunked(points, 24);
        if (renderId !== planRouteRenderId || !planMap) return;
        if (route && !route.isDirectFallback) {
            renderPlanMapRouteLayer(route, latLngs);
        }
    } catch (e) {
        // El trazo directo ya quedó dibujado y visible; no mostrar errores intrusivos.
    }
}

function thinRoutePoints(points, maxPoints) {
    const step = Math.ceil(points.length / maxPoints);
    const thin = points.filter((_, i) => i % step === 0);
    const last = points[points.length - 1];
    if (thin[thin.length - 1] !== last) thin.push(last);
    return thin;
}


function togglePlanMapSize() {
    openPlanFullscreenMap();
}

function ensurePlanFullscreenModal() {
    let modal = document.getElementById('plan-map-fullscreen-mo');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'plan-map-fullscreen-mo';
    modal.className = 'mo plan-map-fullscreen-modal';
    modal.innerHTML = `
        <div class="plan-fullscreen-card">
            <div class="plan-fullscreen-head">
                <div>
                    <h2>Mapa del plan</h2>
                    <p id="plan-fullscreen-route-info">Vista general de paradas, antenas y pueblos del plan.</p>
                    <span id="plan-fullscreen-catalog-info" class="plan-fullscreen-catalog-info"></span>
                </div>
                <div class="plan-fullscreen-actions">
                    <button class="btn bgh" id="plan-fullscreen-icons-btn" type="button" onclick="togglePlanFullscreenIcons()">Ver iconos</button>
                    <button class="btn bgh" id="plan-fullscreen-names-btn" type="button" onclick="togglePlanFullscreenNames()">Ver nombres</button>
                    <button class="btn bgh" id="plan-fullscreen-stop-names-btn" type="button" onclick="togglePlanFullscreenStopNames()">Ver nombres de paradas</button>
                    <button class="btn bc" type="button" onclick="renderPlanFullscreenMap(true)">Ajustar</button>
                    <button class="btn bgh" type="button" onclick="closePlanFullMap()">Cerrar</button>
                </div>
            </div>
            <div id="plan-fullscreen-map" class="plan-fullscreen-map"></div>
            <div class="plan-map-legend plan-fullscreen-legend">
                <span><i style="background:#0984e3"></i> Ruta del plan</span>
                <span><i class="plan-legend-icon is-tower" aria-hidden="true">${PLAN_TOWER_ICON_SVG}</i> Antena / Torre</span>
                <span><i class="plan-legend-icon is-town" aria-hidden="true">${PLAN_TOWN_ICON_SVG}</i> Pueblo / Nodo</span>
                <span><i class="plan-legend-link"></i> Conexión vinculada</span>
                <span><i style="background:#ef4444"></i> Crítico</span>
                <span><i style="background:#f59e0b"></i> Atención</span>
                <span><i style="background:#3b82f6"></i> Pendiente</span>
                <span><i style="background:#22c55e"></i> Despejado</span>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', event => {
        if (event.target === modal) closePlanFullMap();
    });
    if (!document.body.dataset.planFullscreenEscBound) {
        document.body.dataset.planFullscreenEscBound = '1';
        document.addEventListener('keydown', event => {
            const currentModal = document.getElementById('plan-map-fullscreen-mo');
            if (event.key === 'Escape' && currentModal?.classList.contains('open')) closePlanFullMap();
        });
    }
    return modal;
}

function ensurePlanFullscreenPanes() {
    if (!planFullscreenMap) return;
    if (!planFullscreenMap.getPane('planFullscreenRouteGlowPane')) {
        const pane = planFullscreenMap.createPane('planFullscreenRouteGlowPane');
        pane.style.zIndex = 440;
        pane.style.pointerEvents = 'none';
    }
    if (!planFullscreenMap.getPane('planFullscreenRoutePane')) {
        const pane = planFullscreenMap.createPane('planFullscreenRoutePane');
        pane.style.zIndex = 450;
        pane.style.pointerEvents = 'none';
    }
    // Con preferCanvas:true, Leaflet requiere un renderer dedicado por cada pane personalizado
    // para que las rutas se pinten siempre visibles y sin desfase sobre el canvas de conexiones.
    if (!planFullscreenMap._routeGlowRenderer && typeof L !== 'undefined' && typeof L.svg === 'function') {
        planFullscreenMap._routeGlowRenderer = L.svg({ pane: 'planFullscreenRouteGlowPane', padding: 0.5 });
    }
    if (!planFullscreenMap._routeMainRenderer && typeof L !== 'undefined' && typeof L.svg === 'function') {
        planFullscreenMap._routeMainRenderer = L.svg({ pane: 'planFullscreenRoutePane', padding: 0.5 });
    }
}

function openPlanFullscreenMap() {
    const modal = ensurePlanFullscreenModal();
    // Cada apertura empieza limpia: circulos por defecto y nombres ocultos
    // para que el mapa se vea despejado; el usuario puede activar iconos o nombres con un clic.
    planFullscreenNamesVisible = false;
    planFullscreenStopNamesVisible = false;
    planFullscreenIconsMode = false;
    updatePlanFullscreenIconsButton();
    modal.style.display = '';
    modal.style.pointerEvents = '';
    modal.classList.add('open');
    document.body.classList.add('plan-fullscreen-open');

    setTimeout(() => {
        if (!planFullscreenMap) {
            planFullscreenMap = L.map('plan-fullscreen-map', {
                zoomControl: true,
                preferCanvas: true
            }).setView([17.55, -99.50], 8);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
                maxZoom: 19
            }).addTo(planFullscreenMap);
            ensurePlanFullscreenPanes();
            planFullscreenRouteLayer = L.layerGroup().addTo(planFullscreenMap);
            planFullscreenLayerGroup = planFullscreenRouteLayer;
            planFullscreenLinkLayer = L.layerGroup().addTo(planFullscreenMap);
            planFullscreenMarkerLayer = L.layerGroup().addTo(planFullscreenMap);
            if (typeof planFullscreenMap.on === 'function') {
                planFullscreenMap.on('zoomstart', () => {
                    document.getElementById('plan-fullscreen-map')?.classList.add('plan-is-zooming');
                });
                planFullscreenMap.on('zoomend moveend', () => {
                    document.getElementById('plan-fullscreen-map')?.classList.remove('plan-is-zooming');
                    if (planFullscreenNamesVisible) schedulePlanFullscreenViewportLabels();
                });
            }
        } else {
            ensurePlanFullscreenPanes();
            if (!planFullscreenRouteLayer) planFullscreenRouteLayer = L.layerGroup().addTo(planFullscreenMap);
            if (!planFullscreenLinkLayer) planFullscreenLinkLayer = L.layerGroup().addTo(planFullscreenMap);
            if (!planFullscreenMarkerLayer) planFullscreenMarkerLayer = L.layerGroup().addTo(planFullscreenMap);
            planFullscreenLayerGroup = planFullscreenRouteLayer;
        }
        planFullscreenMap.invalidateSize(true);
        renderPlanFullscreenMap(true);
    }, 80);
}

function closePlanFullMap() {
    const modal = document.getElementById('plan-map-fullscreen-mo');
    if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
        modal.style.pointerEvents = 'none';
    }
    if (planFullscreenMap) {
        planFullscreenMap.off();
        planFullscreenMap.remove();
    }
    planFullscreenMap = null;
    planFullscreenLayerGroup = null;
    planFullscreenRouteLayer = null;
    planFullscreenDirectRouteLayer = null;
    planFullscreenLinkLayer = null;
    planFullscreenMarkerLayer = null;
    planFullscreenEntityMarkers = [];
    if (planFullscreenLabelRaf && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(planFullscreenLabelRaf);
        planFullscreenLabelRaf = 0;
    }
    planFullscreenRouteRenderId++;
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    resetPlanMapScrollLock();
    setTimeout(resetPlanMapScrollLock, 80);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 120);
}


function renderFullscreenStopDetails(stop) {
    const details = getStopDetails(stop);
    if (!details.length) {
        return '<div class="plan-popup-empty">Sin detalles ligados a esta parada.</div>';
    }
    const pending = details.filter(d => d.status !== 'completada' && d.status !== 'no_realizado').length;
    const done = details.length - pending;
    return `
        <div class="plan-popup-detail-summary">
            <span>${details.length} detalles</span>
            <span>${pending} pendientes</span>
            <span>${done} hechos</span>
        </div>
        <div class="plan-popup-detail-list">
            ${details.slice(0, 14).map(detail => {
        const isDone = detail.status === 'completada';
        const isNoDone = detail.status === 'no_realizado';
        const report = detail.technicianReport || {};
        const photos = getAdminTechReportPhotos(report);
        return `
                    <div class="plan-popup-detail ${isDone ? 'done' : ''} ${isNoDone ? 'not-done' : ''}" style="border-left-color:${pc(detail.priority)}">
                        <div class="plan-popup-detail-title">
                            <span class="badge ${isDone ? 'bg2' : (isNoDone ? 'ba' : 'bty')}">${isDone ? 'Hecho' : (isNoDone ? 'No realizado' : pl(detail.priority))}</span>
                            <strong>${escapeHtml(detail.title || 'Detalle')}</strong>
                        </div>
                        <small>${escapeHtml(vl(detail.visitType) || '')}${detail.clientName ? ` · Cliente: ${escapeHtml(detail.clientName)}` : ''}</small>
                        ${renderDetailLocation(detail.detailLocation)}
                        ${report.reason ? `<small><b>Motivo:</b> ${escapeHtml(report.reason)}</small>` : ''}
                        ${report.solution ? `<small><b>Solución:</b> ${escapeHtml(report.solution)}</small>` : ''}
                        ${report.materialUsed ? `<small><b>Material:</b> ${escapeHtml(report.materialUsed)}</small>` : ''}
                        ${photos.length ? renderEvidenceThumbnails(photos, `${detail.id}-popup`) : ''}
                    </div>`;
    }).join('')}
            ${details.length > 14 ? `<div class="plan-popup-more">+ ${details.length - 14} detalles más</div>` : ''}
        </div>`;
}

function setFullscreenRouteInfo(message) {
    const el = document.getElementById('plan-fullscreen-route-info');
    if (el) el.textContent = message || 'Vista general de paradas, antenas y pueblos del plan.';
}

function syncPlanFullscreenViewportLabels() {
    planFullscreenLabelRaf = 0;
    if (!planFullscreenMap || !planFullscreenNamesVisible || !planFullscreenEntityMarkers.length) return;
    const hasBounds = typeof planFullscreenMap.getBounds === 'function';
    const bounds = hasBounds ? planFullscreenMap.getBounds()?.pad?.(0.12) : null;
    const zoom = typeof planFullscreenMap.getZoom === 'function' ? Number(planFullscreenMap.getZoom() || 10) : 12;
    const canProject = typeof planFullscreenMap.latLngToContainerPoint === 'function';
    // Cuando el mapa está muy alejado, evitamos encimar cientos de etiquetas en el mismo píxel
    // (ahorra >80% de tiempo de pintado y mantiene el mapa legible). Al acercar se ven todas.
    const declutter = canProject && zoom < 12;
    const cellW = zoom <= 8 ? 128 : (zoom === 9 ? 112 : (zoom === 10 ? 92 : 70));
    const cellH = zoom <= 9 ? 26 : 22;
    const occupied = declutter ? new Set() : null;

    for (let i = 0; i < planFullscreenEntityMarkers.length; i++) {
        const entry = planFullscreenEntityMarkers[i];
        const el = typeof entry.marker?.getElement === 'function' ? entry.marker.getElement() : null;
        if (!el) continue;
        let show = !bounds || (typeof bounds.contains === 'function' ? bounds.contains([entry.lat, entry.lng]) : true);
        if (show && declutter) {
            const pt = planFullscreenMap.latLngToContainerPoint([entry.lat, entry.lng]);
            const cellKey = `${Math.floor(pt.x / cellW)}:${Math.floor(pt.y / cellH)}`;
            if (occupied.has(cellKey)) {
                show = false;
            } else {
                occupied.add(cellKey);
            }
        }
        el.classList.toggle('label-in-view', show);
    }
}

function schedulePlanFullscreenViewportLabels() {
    if (planFullscreenLabelRaf) return;
    if (typeof requestAnimationFrame === 'function') {
        planFullscreenLabelRaf = requestAnimationFrame(syncPlanFullscreenViewportLabels);
    } else {
        syncPlanFullscreenViewportLabels();
    }
}

function applyPlanFullscreenNamesVisibility() {
    const mapEl = document.getElementById('plan-fullscreen-map');
    if (mapEl) {
        mapEl.classList.toggle('plan-entity-names-hidden', !planFullscreenNamesVisible);
        mapEl.classList.toggle('plan-stop-names-hidden', !planFullscreenStopNamesVisible);
        mapEl.classList.toggle('plan-icons-mode', planFullscreenIconsMode);
    }
    const btn = document.getElementById('plan-fullscreen-names-btn');
    if (btn) {
        btn.textContent = planFullscreenNamesVisible ? 'Ocultar nombres' : 'Ver nombres';
        btn.classList.toggle('is-active', planFullscreenNamesVisible);
    }
    const stopBtn = document.getElementById('plan-fullscreen-stop-names-btn');
    if (stopBtn) {
        stopBtn.textContent = planFullscreenStopNamesVisible ? 'Ocultar nombres de paradas' : 'Ver nombres de paradas';
        stopBtn.classList.toggle('is-active', planFullscreenStopNamesVisible);
    }
    if (planFullscreenNamesVisible) {
        schedulePlanFullscreenViewportLabels();
    }
}

function togglePlanFullscreenNames() {
    planFullscreenNamesVisible = !planFullscreenNamesVisible;
    applyPlanFullscreenNamesVisibility();
}

function togglePlanFullscreenStopNames() {
    planFullscreenStopNamesVisible = !planFullscreenStopNamesVisible;
    applyPlanFullscreenNamesVisibility();
}

function updatePlanFullscreenIconsButton() {
    const btn = document.getElementById('plan-fullscreen-icons-btn');
    if (btn) {
        btn.textContent = planFullscreenIconsMode ? 'Ver círculos' : 'Ver iconos';
        btn.classList.toggle('is-active', planFullscreenIconsMode);
    }
    const mapEl = document.getElementById('plan-fullscreen-map');
    if (mapEl) {
        mapEl.classList.toggle('plan-icons-mode', planFullscreenIconsMode);
    }
}

function togglePlanFullscreenIcons() {
    planFullscreenIconsMode = !planFullscreenIconsMode;
    updatePlanFullscreenIconsButton();
}

function addFullscreenRouteLine(layer) {
    if (!planFullscreenMap) return layer;
    if (!planFullscreenRouteLayer) planFullscreenRouteLayer = L.layerGroup().addTo(planFullscreenMap);
    layer.addTo(planFullscreenRouteLayer);
    if (typeof layer.bringToFront === 'function') layer.bringToFront();
    if (typeof layer.eachLayer === 'function') {
        layer.eachLayer(item => {
            if (typeof item.bringToFront === 'function') item.bringToFront();
        });
    }
    return layer;
}

function setFullscreenDirectRoute(latLngs) {
    if (!planFullscreenMap) return;
    ensurePlanFullscreenPanes();
    if (planFullscreenDirectRouteLayer) {
        planFullscreenMap.removeLayer(planFullscreenDirectRouteLayer);
        planFullscreenDirectRouteLayer = null;
    }
    if (!Array.isArray(latLngs) || latLngs.length < 2) return;
    const glowRenderer = planFullscreenMap._routeGlowRenderer || undefined;
    const mainRenderer = planFullscreenMap._routeMainRenderer || undefined;
    planFullscreenDirectRouteLayer = L.layerGroup().addTo(planFullscreenMap);
    L.polyline(latLngs, {
        pane: 'planFullscreenRouteGlowPane',
        renderer: glowRenderer,
        color: '#ffffff',
        weight: 10,
        opacity: 0.92,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false
    }).addTo(planFullscreenDirectRouteLayer);
    L.polyline(latLngs, {
        pane: 'planFullscreenRoutePane',
        renderer: mainRenderer,
        color: '#0b63ce',
        weight: 5,
        opacity: 0.95,
        dashArray: '10 8',
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false
    }).addTo(planFullscreenDirectRouteLayer);
}

function getDrivingDirectionsUrl(stops) {
    const rawPoints = (stops || [])
        .map(stop => ({ lat: safeFloat(stop.lat), lng: safeFloat(stop.lng), name: stop.name || '', equipmentId: stop.equipmentId || '' }))
        .filter(point => !isNaN(point.lat) && !isNaN(point.lng));
    const points = ensureRoutePointsStartAtWiFiMex(rawPoints);
    if (points.length < 2) return '';
    const origin = points[0];
    const destination = points[points.length - 1];
    const middle = points.slice(1, -1).slice(0, 23);
    const params = new URLSearchParams({
        api: '1',
        travelmode: 'driving',
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`
    });
    if (middle.length) params.set('waypoints', middle.map(point => `${point.lat},${point.lng}`).join('|'));
    return `https://www.google.com/maps/dir/?${params.toString()}`;
}

const PLAN_TOWER_ICON_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v16"/><path d="M7.5 21 12 7l4.5 14"/><path d="M9 15h6"/><path d="M8 19h8"/><circle cx="12" cy="5" r="1.4" fill="currentColor"/><path d="M8.5 2.8a5 5 0 0 0 0 5.4"/><path d="M15.5 2.8a5 5 0 0 1 0 5.4"/></svg>';
const PLAN_TOWN_ICON_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 12 3l9 8"/><path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10"/><path d="M9.5 21v-6h5v6"/></svg>';
const PLAN_ORIGIN_ICON_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="m12 2 2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"/></svg>';

function isPlanStopTower(stop) {
    if (!stop) return false;
    if (stop.isOrigin) return false;
    if (stop.isAntenna) return true;
    if (stop.type === 'equipment' || stop.type === 'tower' || stop.type === 'antenna') return true;
    return Boolean(stop.equipmentId && !stop.nodeId);
}

function formatPlanNodeMapLabel(node, fallbackName = '') {
    const toUpper = v => String(v || '').trim().toLocaleUpperCase('es-MX');
    if (!node) return toUpper(fallbackName || 'PUEBLO');
    const code = toUpper(node.nodeCode || node.code || '');
    const town = toUpper(node.town || node.name || fallbackName || '');
    if (!code) return town || 'PUEBLO';
    if (!town) return code;
    if (town === code || town.startsWith(`${code} `) || town.startsWith(`${code}·`) || town.startsWith(`${code} ·`)) {
        return town.replace(/\s*·\s*/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return `${code} ${town}`;
}

function getPlanMapStopDisplayName(stop) {
    if (!stop) return 'Parada';
    if (stop.isOrigin) return stop.name || 'WiFi-Mex';
    if (isPlanStopTower(stop)) {
        const eq = stop.equipmentId ? (state.equipment || []).find(e => e && !e.deletedAt && e.id === stop.equipmentId) : null;
        return (eq?.name || stop.name || 'Antena').trim();
    }
    let node = stop.nodeId ? (state.nodes || []).find(n => n && !n.deletedAt && n.id === stop.nodeId) : null;
    if (!node && stop.name) {
        const norm = typeof normalizeName === 'function' ? normalizeName(stop.name) : String(stop.name).trim().toLowerCase();
        node = (state.nodes || []).find(n => n && !n.deletedAt && (
            (typeof normalizeName === 'function' ? normalizeName(n.town || n.name) : String(n.town || n.name || '').trim().toLowerCase()) === norm ||
            (typeof normalizeName === 'function' ? normalizeName(getNodeLabel(n)) : String(getNodeLabel(n) || '').trim().toLowerCase()) === norm
        )) || null;
    }
    if (node) return formatPlanNodeMapLabel(node, stop.name || '');
    const rawCode = String(stop.nodeCode || '').trim().toLocaleUpperCase('es-MX');
    const rawName = String(stop.name || 'PUEBLO').trim().toLocaleUpperCase('es-MX');
    if (rawCode && !rawName.startsWith(rawCode)) return `${rawCode} ${rawName}`;
    return rawName;
}

function makePlanPointIcon(color, label = '', shape = 'circle', useIcons = true) {
    const isTower = shape === 'square' || shape === 'tower' || shape === 'antenna';
    if (!useIcons) {
        return L.divIcon({
            html: `<div class="plan-fullscreen-point-marker plan-point-circle is-dot" style="--point-color:${escapeAttr(color || '#22c55e')}">${label ? `<span class="plan-point-micro-label">${escapeHtml(label)}</span>` : ''}</div>`,
            className: '',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
    }
    const svg = isTower ? PLAN_TOWER_ICON_SVG : PLAN_TOWN_ICON_SVG;
    const size = isTower ? 26 : 24;
    const anchor = Math.round(size / 2);
    return L.divIcon({
        html: `<div class="plan-fullscreen-point-marker plan-map-entity-icon ${isTower ? 'plan-point-square is-tower' : 'plan-point-circle is-town'}" style="--point-color:${escapeAttr(color || '#22c55e')}">${svg}${label ? `<span class="plan-point-micro-label">${escapeHtml(label)}</span>` : ''}</div>`,
        className: '',
        iconSize: [size, size],
        iconAnchor: [anchor, anchor]
    });
}

function makePlanFullscreenStopCircleIcon(orderNum) {
    return L.divIcon({
        html: `<div class="plan-fullscreen-stop-marker">${escapeHtml(String(orderNum || ''))}</div>`,
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

function makePlanFullscreenFastEntityIcon(color, kind, labelText) {
    const isTower = kind === 'tower' || kind === 'square' || kind === 'antenna';
    return L.divIcon({
        html: `<div class="plan-fs-node ${isTower ? 'is-tower' : 'is-town'}" style="--point-color:${escapeAttr(color || '#22c55e')}"><span class="plan-fast-label">${escapeHtml(labelText || '')}</span></div>`,
        className: 'plan-fs-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

function makePlanFullscreenFastStopIcon(stop, orderNum, labelText) {
    const isOrigin = Boolean(stop?.isOrigin);
    const isTower = !isOrigin && isPlanStopTower(stop);
    const kindClass = isOrigin ? 'is-origin' : (isTower ? 'is-tower' : 'is-town');
    const badge = isOrigin ? '★' : String(orderNum || '');
    return L.divIcon({
        html: `<div class="plan-fs-stop ${kindClass}"><span class="plan-fs-stop-glyph" aria-hidden="true"></span><span class="plan-fs-stop-num">${escapeHtml(badge)}</span><span class="plan-fast-stop-label">${escapeHtml(labelText || '')}</span></div>`,
        className: 'plan-fs-marker plan-fs-stop-wrap',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
}

function makePlanStopMarkerIcon(stop, orderNum, options = {}) {
    const isOrigin = Boolean(stop?.isOrigin);
    const isTower = !isOrigin && isPlanStopTower(stop);
    const dayAbbr = String(options.dayAbbr || '').trim();
    const kindClass = isOrigin ? 'is-origin' : (isTower ? 'is-tower' : 'is-town');
    const svg = isOrigin ? PLAN_ORIGIN_ICON_SVG : (isTower ? PLAN_TOWER_ICON_SVG : PLAN_TOWN_ICON_SVG);
    const badge = isOrigin ? '★' : String(orderNum || '');
    return L.divIcon({
        html: `<div class="plan-stop-icon ${kindClass}">${svg}<span class="plan-stop-icon-num">${escapeHtml(badge)}</span>${dayAbbr ? `<span class="plan-stop-icon-day">${escapeHtml(dayAbbr)}</span>` : ''}</div>`,
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
    });
}

function renderPlanFullscreenConnections(bounds = []) {
    if (!planFullscreenLinkLayer) return;
    const inferredLinks = new Map();
    (state.workOrders || []).forEach(order => {
        if (!order || order.deletedAt || !order.equipmentId || !order.nodeId) return;
        if (!inferredLinks.has(order.equipmentId)) inferredLinks.set(order.equipmentId, new Set());
        inferredLinks.get(order.equipmentId).add(order.nodeId);
    });
    (state.equipment || []).filter(eq => !eq.deletedAt).forEach(eq => {
        const eqLat = safeFloat(eq.lat);
        const eqLng = safeFloat(eq.lng);
        if (isNaN(eqLat) || isNaN(eqLng)) return;
        const linkedIds = new Set(getEquipmentLinkedNodeIds(eq.id));
        (inferredLinks.get(eq.id) || new Set()).forEach(nodeId => linkedIds.add(nodeId));
        (state.nodes || []).filter(node => node && !node.deletedAt && linkedIds.has(node.id)).forEach(node => {
            const nodeLat = safeFloat(node.lat);
            const nodeLng = safeFloat(node.lng);
            if (isNaN(nodeLat) || isNaN(nodeLng)) return;
            L.polyline([[eqLat, eqLng], [nodeLat, nodeLng]], {
                color: '#0ea5e9',
                weight: 3,
                opacity: .72,
                dashArray: '7 7'
            }).addTo(planFullscreenLinkLayer).bindPopup(
                `<strong>${escapeHtml(eq.name || 'Antena')}</strong><br>→ ${escapeHtml(getNodeLabel(node) || 'Nodo')}`
            );
            bounds.push([eqLat, eqLng], [nodeLat, nodeLng]);
        });
    });
}

function renderFullscreenRoadGeometry(route, stopsCount) {
    if (!planFullscreenMap || !route?.geometry) return null;
    planFullscreenRouteLayer.clearLayers();
    if (planFullscreenDirectRouteLayer) {
        planFullscreenMap.removeLayer(planFullscreenDirectRouteLayer);
        planFullscreenDirectRouteLayer = null;
    }

    ensurePlanFullscreenPanes();
    const glowRenderer = planFullscreenMap._routeGlowRenderer || undefined;
    const mainRenderer = planFullscreenMap._routeMainRenderer || undefined;
    const roadOutline = addFullscreenRouteLine(L.geoJSON(route.geometry, {
        pane: 'planFullscreenRouteGlowPane',
        renderer: glowRenderer,
        style: {
            pane: 'planFullscreenRouteGlowPane',
            renderer: glowRenderer,
            color: '#ffffff',
            weight: 12,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
        },
        interactive: false
    }));
    addFullscreenRouteLine(L.geoJSON(route.geometry, {
        pane: 'planFullscreenRoutePane',
        renderer: mainRenderer,
        style: {
            pane: 'planFullscreenRoutePane',
            renderer: mainRenderer,
            color: '#075eaa',
            weight: 6.5,
            opacity: 0.98,
            lineCap: 'round',
            lineJoin: 'round'
        },
        interactive: false
    }));
    addFullscreenRouteLine(L.geoJSON(route.geometry, {
        pane: 'planFullscreenRoutePane',
        renderer: mainRenderer,
        style: {
            pane: 'planFullscreenRoutePane',
            renderer: mainRenderer,
            color: '#00a3ff',
            weight: 2.8,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round'
        },
        interactive: false
    }));
    const km = (Number(route.distance || 0) / 1000).toFixed(1);
    const min = Math.round(Number(route.duration || 0) / 60);
    setFullscreenRouteInfo(`Ruta por carretera en orden de numeración: ${km} km · ${min} min · ${stopsCount} paradas.`);
    const roadBounds = roadOutline?.getBounds?.();
    return roadBounds?.isValid?.() ? roadBounds : null;
}

async function drawFullscreenOrderedRoute(stops, renderId) {
    if (!planFullscreenMap) return null;
    ensurePlanFullscreenPanes();
    if (!planFullscreenRouteLayer) planFullscreenRouteLayer = L.layerGroup().addTo(planFullscreenMap);
    if (!stops || stops.length < 2) {
        setFullscreenRouteInfo(stops?.length ? 'Una sola parada en el plan.' : 'Sin paradas para trazar ruta.');
        return null;
    }

    const latLngs = stops
        .map(stop => [safeFloat(stop.lat), safeFloat(stop.lng)])
        .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
    if (latLngs.length < 2) return null;

    const cacheKey = getRoadRouteCacheKey(stops);
    const cachedRoute = cacheKey ? planRoadRouteCache.get(cacheKey) : null;
    if (cachedRoute && !cachedRoute.isDirectFallback) {
        return renderFullscreenRoadGeometry(cachedRoute, stops.length);
    }

    setFullscreenRouteInfo(`Trazando ruta en orden de numeración: ${stops.length} paradas...`);
    planFullscreenRouteLayer.clearLayers();
    setFullscreenDirectRoute(latLngs);

    try {
        const route = await fetchRoadRouteChunked(stops, 24);
        if (renderId !== planFullscreenRouteRenderId || !planFullscreenMap) return null;
        if (route && !route.isDirectFallback) {
            return renderFullscreenRoadGeometry(route, stops.length);
        }
        setFullscreenRouteInfo(`Ruta directa en orden de numeración · ${stops.length} paradas.`);
        return L.latLngBounds(latLngs);
    } catch (e) {
        if (renderId !== planFullscreenRouteRenderId) return null;
        setFullscreenRouteInfo(`Ruta directa en orden de numeración · ${stops.length} paradas.`);
        return L.latLngBounds(latLngs);
    }
}

async function renderPlanFullscreenMap(forceFit = false) {
    if (!planFullscreenMap) return;
    const renderId = ++planFullscreenRouteRenderId;
    ensurePlanFullscreenPanes();
    if (!planFullscreenRouteLayer) planFullscreenRouteLayer = L.layerGroup().addTo(planFullscreenMap);
    if (!planFullscreenLinkLayer) planFullscreenLinkLayer = L.layerGroup().addTo(planFullscreenMap);
    if (!planFullscreenMarkerLayer) planFullscreenMarkerLayer = L.layerGroup().addTo(planFullscreenMap);
    planFullscreenLayerGroup = planFullscreenRouteLayer;
    planFullscreenRouteLayer.clearLayers();
    if (planFullscreenDirectRouteLayer) {
        planFullscreenMap.removeLayer(planFullscreenDirectRouteLayer);
        planFullscreenDirectRouteLayer = null;
    }
    planFullscreenLinkLayer.clearLayers();
    planFullscreenMarkerLayer.clearLayers();
    planFullscreenEntityMarkers = [];

    const bounds = [];
    const addBound = (lat, lng) => {
        if (!isNaN(lat) && !isNaN(lng)) bounds.push([lat, lng]);
    };
    const routeBounds = [];
    const addRouteBound = (lat, lng) => {
        if (!isNaN(lat) && !isNaN(lng)) routeBounds.push([lat, lng]);
    };

    const stops = getPlanMapStops()
        .map((stop, index) => {
            const pos = getStopCurrentPosition(stop);
            return {
                ...stop,
                ...pos,
                mapOrder: index + 1,
                lat: safeFloat(pos.lat),
                lng: safeFloat(pos.lng)
            };
        })
        .filter(stop => !isNaN(stop.lat) && !isNaN(stop.lng));
    const stopByEquipmentId = new Map(stops.filter(stop => stop.equipmentId).map(stop => [stop.equipmentId, stop]));
    const stopByNodeId = new Map(stops.filter(stop => stop.nodeId).map(stop => [stop.nodeId, stop]));
    const directionsUrl = getDrivingDirectionsUrl(stops);
    const infoEl = document.getElementById('plan-fullscreen-route-info');
    document.querySelectorAll('.plan-drive-link').forEach(link => link.remove());
    if (infoEl && directionsUrl) {
        infoEl.insertAdjacentHTML('afterend', `<a class="btn bsm bc plan-drive-link" href="${escapeAttr(directionsUrl)}" target="_blank" rel="noopener">Abrir ruta en Google Maps</a>`);
    }

    // Dibujamos primero conexiones, catálogo (antenas + pueblos) y paradas de inmediato,
    // y en paralelo calculamos la ruta por carretera sin bloquear la aparición de marcadores.
    updatePlanFullscreenIconsButton();
    const routedStops = ensureRoutePointsStartAtWiFiMex(stops);
    const roadRoutePromise = drawFullscreenOrderedRoute(routedStops, renderId).catch(() => null);
    renderPlanFullscreenConnections(bounds);

    const mapEquipment = (state.equipment || []).filter(eq => eq && !eq.deletedAt && !isNaN(safeFloat(eq.lat)) && !isNaN(safeFloat(eq.lng)));
    const mapNodes = (state.nodes || []).filter(node => node && !node.deletedAt && !isNaN(safeFloat(node.lat)) && !isNaN(safeFloat(node.lng)));
    const catalogInfo = document.getElementById('plan-fullscreen-catalog-info');
    if (catalogInfo) catalogInfo.textContent = `Mostrando ${mapEquipment.length} antenas y ${mapNodes.length} pueblos con ubicación`;

    mapEquipment.forEach(eq => {
        const existingStop = stopByEquipmentId.get(eq.id);
        const lat = safeFloat(eq.lat);
        const lng = safeFloat(eq.lng);
        if (isNaN(lat) || isNaN(lng)) return;
        const st = getPlanningMapStatus('equipment', eq.id);
        const eqLabel = `${eq.name || 'Antena'}${eq.ip ? ` · ${eq.ip}` : ''}`;
        const marker = L.marker([lat, lng], {
            icon: makePlanFullscreenFastEntityIcon(st.color, 'tower', eqLabel),
            zIndexOffset: existingStop ? 900 : 100
        }).addTo(planFullscreenMarkerLayer);
        marker._planLabelType = 'entity';
        marker._planFastLabel = eqLabel;
        marker.bindPopup(() => `
            <div style="min-width:220px;font-family:'Manrope',sans-serif">
                <div style="font-weight:900;font-size:13px;margin-bottom:4px">${escapeHtml(eq.name || 'Antena')}</div>
                <div class="mono" style="font-size:10px;color:#64748b">${escapeHtml(eq.ip || 'Sin IP')}</div>
                <div style="margin:8px 0"><span class="badge" style="background:${st.color};color:#fff">${st.label}</span></div>
                ${renderMapEntityDetailStats('equipment', eq.id)}
                ${!canManagePlanStops() ? '' : (existingStop
                ? `<button class="btn bsm br" style="margin-top:10px;width:100%" onclick="removeStopFromFullscreen('${escapeAttr(existingStop.mapDay || selectedDay)}','${escapeAttr(existingStop.id)}')">Quitar parada</button>`
                : `<button class="btn bsm bc" style="margin-top:10px;width:100%" onclick="addEquipmentStopFromMap('${escapeAttr(eq.id)}'); setTimeout(() => renderPlanFullscreenMap(true), 180)">Agregar parada</button>`)}
            </div>
        `);
        planFullscreenEntityMarkers.push({ marker, lat, lng });
        addBound(lat, lng);
    });

    mapNodes.forEach(node => {
        const existingStop = stopByNodeId.get(node.id);
        const lat = safeFloat(node.lat);
        const lng = safeFloat(node.lng);
        if (isNaN(lat) || isNaN(lng)) return;
        const st = getPlanningMapStatus('node', node.id);
        const nodeMapLabel = formatPlanNodeMapLabel(node);
        const marker = L.marker([lat, lng], {
            icon: makePlanFullscreenFastEntityIcon(st.color || '#22c55e', 'town', nodeMapLabel || 'NODO'),
            zIndexOffset: existingStop ? 900 : 80
        }).addTo(planFullscreenMarkerLayer);
        marker._planLabelType = 'entity';
        marker._planFastLabel = nodeMapLabel || 'NODO';
        marker.bindPopup(() => `
            <div style="min-width:220px;font-family:'Manrope',sans-serif">
                <div style="font-weight:900;font-size:13px;margin-bottom:4px">${escapeHtml(nodeMapLabel || 'NODO')}</div>
                <div style="font-size:11px;color:#64748b">${escapeHtml(getZoneLabel(node.zone || node.region || ''))}</div>
                <div style="margin:8px 0"><span class="badge" style="background:${st.color};color:#fff">${escapeHtml(st.label || 'Nodo')}</span></div>
                ${renderMapEntityDetailStats('node', node.id)}
                ${!canManagePlanStops() ? '' : (existingStop
                ? `<button class="btn bsm br" style="margin-top:10px;width:100%" onclick="removeStopFromFullscreen('${escapeAttr(existingStop.mapDay || selectedDay)}','${escapeAttr(existingStop.id)}')">Quitar parada</button>`
                : `<button class="btn bsm bc" style="margin-top:10px;width:100%" onclick="addNodeStopFromMap('${escapeAttr(node.id)}'); setTimeout(() => renderPlanFullscreenMap(true), 180)">Agregar parada</button>`)}
            </div>
        `);
        planFullscreenEntityMarkers.push({ marker, lat, lng });
        addBound(lat, lng);
    });

    stops.forEach((stop, index) => {
        const stopDisplayLabel = getPlanMapStopDisplayName(stop);
        const stopFullLabel = `${index + 1}. ${stopDisplayLabel}`;
        const marker = L.marker([stop.lat, stop.lng], {
            icon: makePlanFullscreenFastStopIcon(stop, index + 1, stopFullLabel),
            zIndexOffset: 1100
        }).addTo(planFullscreenMarkerLayer);
        marker._planLabelType = 'stop';
        marker._planFastLabel = stopFullLabel;
        marker.bindPopup(() => `
            <div class="plan-map-popup plan-map-popup-wide">
                <strong>${index + 1}. ${escapeHtml(stopDisplayLabel)}</strong>
                <div style="font-size:11px;color:#64748b;margin-bottom:8px">${safeFloat(stop.lat).toFixed(5)}, ${safeFloat(stop.lng).toFixed(5)}</div>
                ${stop.materialPlanned ? `<div class="plan-popup-material"><b>Material estimado:</b> ${escapeHtml(stop.materialPlanned)}</div>` : ''}
                <label>Detalles de la parada</label>
                ${renderFullscreenStopDetails(stop)}
                <label style="margin-top:10px">Cambiar orden</label>
                <div class="plan-popup-row">
                    <input id="fs-map-order-${escapeAttr(stop.id)}" class="stop-order-input" type="number" min="1" max="${stops.length}" value="${index + 1}">
                    <button class="btn bsm bc" onclick="setMapStopOrder('${escapeAttr(stop.mapDay || selectedDay)}','${escapeAttr(stop.id)}',document.getElementById('fs-map-order-${escapeAttr(stop.id)}').value); setTimeout(() => renderPlanFullscreenMap(true), 220)">Reordenar</button>
                </div>
                ${canManagePlanStops() ? `<button class="btn bsm br" style="margin-top:10px;width:100%" onclick="removeStopFromFullscreen('${escapeAttr(stop.mapDay || selectedDay)}','${escapeAttr(stop.id)}')">Quitar parada</button>` : ''}
            </div>
        `, { maxWidth: 420 });
        addBound(stop.lat, stop.lng);
        addRouteBound(stop.lat, stop.lng);
    });

    if (forceFit || !planFullscreenMap._netopsHasFit) {
        // "Ajustar" debe incluir todo lo visible, no solamente la carretera.
        // bounds contiene todas las antenas, pueblos y conexiones vinculadas.
        const completeBounds = L.latLngBounds([]);
        bounds.forEach(point => completeBounds.extend(point));
        routeBounds.forEach(point => completeBounds.extend(point));
        if (completeBounds.isValid()) {
            const mapSize = planFullscreenMap.getSize();
            const horizontalPadding = mapSize.x < 760 ? 28 : 54;
            const verticalPadding = mapSize.y < 520 ? 28 : 48;
            planFullscreenMap.fitBounds(completeBounds, {
                paddingTopLeft: [horizontalPadding, verticalPadding],
                paddingBottomRight: [horizontalPadding, verticalPadding],
                maxZoom: 12
            });
        } else {
            planFullscreenMap.setView([17.55, -99.50], 8);
        }
        planFullscreenMap._netopsHasFit = true;
    }
    if (planFullscreenLinkLayer && typeof planFullscreenLinkLayer.bringToFront === 'function') {
        planFullscreenLinkLayer.bringToFront();
    }
    if (planFullscreenRouteLayer && typeof planFullscreenRouteLayer.bringToFront === 'function') {
        planFullscreenRouteLayer.bringToFront();
    }
    if (planFullscreenDirectRouteLayer && typeof planFullscreenDirectRouteLayer.bringToFront === 'function') {
        planFullscreenDirectRouteLayer.bringToFront();
    }
    if (planFullscreenMarkerLayer && typeof planFullscreenMarkerLayer.bringToFront === 'function') {
        planFullscreenMarkerLayer.bringToFront();
    }
    applyPlanFullscreenNamesVisibility();
    setTimeout(() => planFullscreenMap?.invalidateSize?.(true), 60);

    const roadRouteBounds = await roadRoutePromise;
    if (renderId !== planFullscreenRouteRenderId || !planFullscreenMap) return;
    if (roadRouteBounds?.isValid?.() && forceFit && !bounds.length && !routeBounds.length) {
        planFullscreenMap.fitBounds(roadRouteBounds, { padding: [40, 40], maxZoom: 12 });
    }
    if (planFullscreenMarkerLayer && typeof planFullscreenMarkerLayer.bringToFront === 'function') {
        planFullscreenMarkerLayer.bringToFront();
    }
}

function initCaptureMap() {
    const el = document.getElementById('capture-map');
    if (!el) return;
    if (!captureMap) {
        captureMap = L.map('capture-map').setView([17.55, -99.50], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19
        }).addTo(captureMap);
        captureMap.on('click', e => {
            document.getElementById('manual-lat').value = e.latlng.lat.toFixed(6);
            document.getElementById('manual-lng').value = e.latlng.lng.toFixed(6);
            if (captureMarker) captureMap.removeLayer(captureMarker);
            captureMarker = L.marker(e.latlng).addTo(captureMap);
        });
    }
    setTimeout(() => captureMap.invalidateSize(), 80);
}

function dayLabel(id) {
    return PLAN_DAYS.find(d => d.id === id)?.label || id;
}

function autoDistributeGeneralStops() {
    if (selectedTechId !== SHARED_PLAN_ID) {
        notify('Selecciona "Plan general compartido" para repartir', 'err');
        return;
    }

    const generalPlan = getSelectedGeneralPlan();
    const generalStops = visibleStops(generalPlan?.stops);
    if (!generalStops.length) {
        notify('No hay paradas en General para repartir', 'err');
        return;
    }

    const targetDays = [GENERAL_PLAN_DAY];
    const techs = (state.technicians || []).filter(t => !t.deletedAt && t.estado !== 'inactivo');
    if (!techs.length) {
        notify('No hay tecnicos activos para asignar', 'err');
        return;
    }

    state.prepChecked = state.prepChecked || {};
    state.prepChecked.lastAutoDistribute = JSON.parse(JSON.stringify({
        weekPlan: state.weekPlan,
        selectedGeneralPlanId
    }));

    const buckets = {};
    techs.forEach(tech => {
        ensureTechPlan(tech.id);
        buckets[tech.id] = {};
        targetDays.forEach(day => {
            buckets[tech.id][day.id] = [...state.weekPlan[tech.id][day.id]];
        });
    });

    const orderedStops = orderStopsByRegionAndDistance(generalStops);
    orderedStops.forEach(stop => {
        const { techId, dayId } = pickBestAssignmentForStop(stop, buckets, techs, targetDays);
        buckets[techId][dayId].push({ ...stop, autoAssigned: true });
    });

    techs.forEach(tech => {
        targetDays.forEach(day => {
            state.weekPlan[tech.id][day.id] = buckets[tech.id][day.id];
        });
    });
    (generalPlan.stops || []).forEach(stop => {
        if (!stop.deletedAt) stop.deletedAt = new Date().toISOString();
    });
    saveDB();
    renderPlan();
    notify('Paradas generales distribuidas por tecnico y dia');
}

function undoAutoDistribute() {
    const snapshot = state.prepChecked?.lastAutoDistribute;
    if (!snapshot?.weekPlan) {
        notify('No hay una distribucion reciente para deshacer', 'err');
        return;
    }
    state.weekPlan = JSON.parse(JSON.stringify(snapshot.weekPlan));
    selectedGeneralPlanId = snapshot.selectedGeneralPlanId || selectedGeneralPlanId;
    state.prepChecked.lastAutoDistribute = null;
    saveDB();
    renderPlan();
    notify('Distribucion revertida');
}

function orderStopsByRegionAndDistance(stops) {
    const pending = [...stops].sort((a, b) => {
        const regionA = getStopRegion(a);
        const regionB = getStopRegion(b);
        if (regionA !== regionB) return regionA.localeCompare(regionB);
        return (a.name || '').localeCompare(b.name || '');
    });

    const ordered = [];
    while (pending.length) {
        if (!ordered.length) {
            ordered.push(pending.shift());
            continue;
        }
        const last = ordered[ordered.length - 1];
        let bestIndex = 0;
        let bestDistance = Infinity;
        pending.forEach((stop, index) => {
            const distance = getStopDistance(last, stop);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestIndex = index;
            }
        });
        ordered.push(pending.splice(bestIndex, 1)[0]);
    }
    return ordered;
}

function pickBestAssignmentForStop(stop, buckets, techs, targetDays) {
    let bestTechId = techs[0].id;
    let bestDay = targetDays[0].id;
    let bestScore = Infinity;

    techs.forEach(tech => {
        targetDays.forEach(day => {
            const dayStops = buckets[tech.id][day.id];
            const activeDayStops = visibleStops(dayStops);
            const last = activeDayStops[activeDayStops.length - 1];
            const distance = last ? getStopDistance(last, stop) : 0;
            const regionPenalty = last && getStopRegion(last) !== getStopRegion(stop) ? 35 : 0;
            const zonePenalty = tech.regiones?.length && !tech.regiones.includes(getStopRegion(stop)) ? 50 : 0;
            const score = activeDayStops.length * 120 + distance + regionPenalty + zonePenalty;
            if (score < bestScore) {
                bestScore = score;
                bestTechId = tech.id;
                bestDay = day.id;
            }
        });
    });

    return { techId: bestTechId, dayId: bestDay };
}

function getStopRegion(stop) {
    if (stop.region) return stop.region;
    if (stop.equipmentId) {
        const eq = (state.equipment || []).find(e => e.id === stop.equipmentId);
        const pos = getStopCurrentPosition(stop);
        return eq?.region || getNearestRegion(pos.lat, pos.lng) || 'general';
    }
    const pos = getStopCurrentPosition(stop);
    return getNearestRegion(pos.lat, pos.lng) || 'general';
}

function getStopDistance(a, b) {
    const aLat = safeFloat(a.lat);
    const aLng = safeFloat(a.lng);
    const bLat = safeFloat(b.lat);
    const bLng = safeFloat(b.lng);
    if ([aLat, aLng, bLat, bLng].some(Number.isNaN)) return 9999;
    return Math.sqrt(Math.pow(aLat - bLat, 2) + Math.pow(aLng - bLng, 2));
}

function getInitialPlanTechId(activeTechs) {
    return SHARED_PLAN_ID;
}

function getInitialDayForTech(techId) {
    return 'general';
}

function hasAnyStopsForTech(techId) {
    return PLAN_DAYS.some(day => getPlanStopsForTech(techId, day.id).length > 0);
}

function getPlanStopsForTech(techId, day) {
    return visibleStops(getPlanStopsRef(techId, day));
}

function getPlanMapStopsLegacy() {
    if (selectedTechId === SHARED_PLAN_ID) {
        return getPlanStops('general').map((stop, index) => ({
            ...stop,
            mapDay: 'general',
            mapIndex: index,
            mapLabel: `General · ${index + 1}. ${stop.name || getSelectedGeneralPlan().name}`
        }));
    }

    return getPlanStops(selectedDay).map((stop, index) => ({
        ...stop,
        mapDay: selectedDay,
        mapIndex: index,
        mapLabel: `${dayLabel(selectedDay)} · ${index + 1}. ${stop.name || 'Parada'}`
    }));
}

function getPlanMapStops() {
    const day = selectedTechId === SHARED_PLAN_ID ? 'general' : selectedDay;
    const stops = getPlanStopsForView(day)
        .filter(stop => !stop.deletedAt)
        .sort((a, b) => String(a.scheduledDate || '9999').localeCompare(String(b.scheduledDate || '9999')));
    return stops.map((stop, index) => {
        const equipment = stop.equipmentId ? (state.equipment || []).find(item => item.id === stop.equipmentId && !item.deletedAt) : null;
        const node = stop.nodeId ? (state.nodes || []).find(item => item.id === stop.nodeId && !item.deletedAt) : null;
        const stopName = isTechnicianPlanView()
            ? (node ? formatPlanNodeMapLabel(node, stop.name || '') : getTechnicianStopName(stop, equipment, node))
            : getPlanMapStopDisplayName(stop);
        return { ...stop, ...getStopCurrentPosition(stop), mapDay: day, mapIndex: index, mapLabel: `${index + 1}. ${stopName}` };
    });
}


function setTechnicianNoPhone() {
    const el = document.getElementById('tech-completion-phone');
    if (el) el.value = '0000000000';
}
function setTechnicianInstallNoPhone() {
    const el = document.getElementById('tech-install-phone');
    if (el) el.value = '0000000000';
}

async function openTechnicianCompletionForm(detailId) {
    if (!isTechnicianPlanView()) return;
    let detail = (state.workOrders || []).find(item => item.id === detailId && !item.deletedAt);
    if (!detail && typeof getGlobalWorkOrdersCache === 'function') {
        detail = getGlobalWorkOrdersCache()[detailId] || null;
    }
    if (!detail && typeof findOrFetchWorkOrder === 'function') {
        detail = await findOrFetchWorkOrder(detailId);
    }
    if (!detail) {
        const allStops = getPlanStopsForView('general');
        for (const s of allStops) {
            const found = (s.details || []).find(d => d.id === detailId);
            if (found) { detail = found; break; }
        }
    }
    if (!detail) return notify('No se encontró el detalle.', 'err');
    window._currentTechnicianCompletionDetail = detail;
    if (Array.isArray(state.workOrders) && !state.workOrders.some(w => w.id === detail.id)) {
        state.workOrders.push(detail);
    }
    if (typeof saveWorkOrdersToGlobalCache === 'function') {
        saveWorkOrdersToGlobalCache([detail]);
    }
    const editingCompleted = detail.status === 'completada';
    technicianCompletionDetailId = detail.id;
    technicianCompletionPhotos = getAdminTechReportPhotos(detail.technicianReport || {}).slice(0, 6);
    let modal = document.getElementById('tech-completion-mo');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `<div class="mo" id="tech-completion-mo"><div class="md tech-installation-modal tech-completion-modal"><div class="tech-installation-head"><div><div class="mt2">Terminar trabajo</div><small>Anota lo que hiciste y toma foto de evidencia.</small></div><button class="btn bsm bgh" type="button" onclick="closeTechnicianCompletionForm()">Cerrar</button></div><div class="row2"><div class="fi"><label>Cliente</label><input id="tech-completion-client" placeholder="Nombre completo"></div><div class="fi"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><label style="margin:0;">Teléfono</label><button type="button" class="btn bsm bgh" style="font-size:11px;padding:2px 8px;height:24px;min-height:24px;cursor:pointer;" onclick="setTechnicianNoPhone()">No tiene número</button></div><input id="tech-completion-phone" type="tel" inputmode="tel" placeholder="10 dígitos (o 'No tiene número')"></div></div><div class="fi"><label>Ubicación (coordenadas)</label><div class="tech-coordinate-row"><input id="tech-completion-location" class="mono" placeholder="18.09563, -99.19604"><button class="btn bgh" type="button" onclick="useCurrentTechnicianCoordinates()">Mi ubicación actual</button></div></div><div class="fi"><label>Detalle realizado <span style="color:#ef4444;font-weight:900;">* (Obligatorio)</span></label><textarea id="tech-completion-work" rows="3" placeholder="Describe el trabajo o detalle realizado..."></textarea></div><div class="fi" id="tech-completion-material-wrap"><label>Material utilizado <span style="color:#ef4444;font-weight:900;">* (Obligatorio)</span></label><textarea id="tech-completion-material" rows="3" placeholder="Describe el material utilizado "></textarea></div><div class="fi"><label>Notas extras <span class="optional-label">Opcional</span></label><textarea id="tech-completion-notes" rows="2" placeholder="Comentarios adicionales (opcional)..."></textarea></div><div class="tech-evidence-box"><strong>Fotos del trabajo</strong><small>Toma o sube al menos 1 foto (máx. 6).</small><div class="tech-evidence-actions"><label class="btn bc">Tomar foto<input type="file" accept="image/*" capture="environment" onchange="addTechnicianCompletionPhotos(this.files);this.value=''" hidden></label><label class="btn bgh">De galería<input type="file" accept="image/*" multiple onchange="addTechnicianCompletionPhotos(this.files);this.value=''" hidden></label></div><div id="tech-completion-evidence-preview" class="tech-install-evidence-preview"></div></div><div class="tech-completion-actions-row" style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;"><button class="btn bc bfu" type="button" style="flex:1 1 200px;" onclick="saveTechnicianCompletion()">Guardar y terminar</button><button class="btn ba tech-modal-btn-incomplete" type="button" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;font-weight:800;padding:0 18px;min-height:50px;border-radius:14px;cursor:pointer;" onclick="markCurrentDetailIncompleteFromModal()">No se pudo realizar</button></div></div></div>`);
        modal = document.getElementById('tech-completion-mo');
    }
    const completionPhone = document.getElementById('tech-completion-phone');
    const completionPhoneLabel = completionPhone?.closest('.fi')?.querySelector('label');
    if (completionPhoneLabel) completionPhoneLabel.innerHTML = 'Teléfono <span class="optional-label">Opcional</span>';
    if (completionPhone) completionPhone.placeholder = '10 dígitos (o "No tiene número")';
    const modalTitle = modal.querySelector('.tech-installation-head .mt2');
    const modalSubtitle = modal.querySelector('.tech-installation-head small');
    const saveButton = modal.querySelector('.tech-completion-actions-row button.bfu') || modal.querySelector('.tech-completion-modal > button:last-child');
    const incompleteBtn = modal.querySelector('.tech-modal-btn-incomplete');
    if (incompleteBtn) incompleteBtn.style.display = editingCompleted ? 'none' : 'inline-flex';
    if (modalTitle) modalTitle.textContent = editingCompleted ? 'Editar trabajo' : 'Terminar trabajo';
    if (modalSubtitle) modalSubtitle.textContent = editingCompleted
        ? 'Modifica los datos del reporte.'
        : 'Anota lo que hiciste y toma foto de evidencia.';
    if (saveButton) saveButton.textContent = editingCompleted ? 'Guardar cambios' : 'Guardar y terminar';
    document.getElementById('tech-completion-client').value = detail.clientName || '';
    document.getElementById('tech-completion-phone').value = detail.clientPhone || detail.phone || detail.technicianReport?.phone || '';
    document.getElementById('tech-completion-location').value = detail.detailLocation || (!isNaN(safeFloat(detail.lat)) && !isNaN(safeFloat(detail.lng)) ? `${detail.lat}, ${detail.lng}` : '');
    document.getElementById('tech-completion-work').value = detail.technicianReport?.solution || '';
    document.getElementById('tech-completion-notes').value = detail.technicianReport?.observations || '';
    const compMatInput = document.getElementById('tech-completion-material');
    if (compMatInput) {
        compMatInput.value = detail.technicianReport?.materialUsed || '';
        compMatInput.classList.remove('is-invalid-input');
        compMatInput.oninput = () => compMatInput.classList.remove('is-invalid-input');
    }
    const compWorkInput = document.getElementById('tech-completion-work');
    if (compWorkInput) {
        compWorkInput.classList.remove('is-invalid-input');
        compWorkInput.oninput = () => compWorkInput.classList.remove('is-invalid-input');
        const workLabel = compWorkInput.closest('.fi')?.querySelector('label');
        if (workLabel) workLabel.innerHTML = 'Detalle realizado <span style="color:#ef4444;font-weight:900;">* (Obligatorio)</span>';
    }

    renderTechnicianCompletionPhotos();
    OM('tech-completion-mo');
}

function markCurrentDetailIncompleteFromModal() {
    const detailId = technicianCompletionDetailId;
    if (!detailId) return;
    const stop = getPlanStopsForView('general').find(s => (s.detailIds || []).includes(detailId));
    CM('tech-completion-mo');
    reportPlanDetailIncomplete(detailId, stop?.id || '');
}

async function closeTechnicianCompletionForm() {
    const work = document.getElementById('tech-completion-work')?.value.trim() || '';
    const mat = document.getElementById('tech-completion-material')?.value.trim() || '';
    const notes = document.getElementById('tech-completion-notes')?.value.trim() || '';
    const hasPhotos = technicianCompletionPhotos && technicianCompletionPhotos.length > 0;
    if (work || mat || notes || hasPhotos) {
        const ok = await askConfirmation({
            title: 'Descartar cambios',
            message: 'Tienes información o fotos sin guardar. ¿Deseas salir sin terminar?',
            confirmText: 'Salir sin guardar',
            cancelText: 'Continuar editando',
            tone: 'danger'
        });
        if (!ok) return;
    }
    technicianCompletionPhotos = [];
    technicianCompletionDetailId = '';
    CM('tech-completion-mo');
}

function useCurrentTechnicianCoordinates() {
    const input = document.getElementById('tech-completion-location');
    const detail = (state.workOrders || []).find(item => item.id === technicianCompletionDetailId && !item.deletedAt);
    const stop = (typeof getPlanMapStops === 'function' ? getPlanMapStops().find(s => (s.detailIds || []).includes(technicianCompletionDetailId) || s.id === detail?.stopId) : null);

    if (!navigator.geolocation) {
        if (input && !input.value) {
            if (stop && stop.lat && stop.lng) {
                input.value = `${Number(stop.lat).toFixed(6)}, ${Number(stop.lng).toFixed(6)}`;
                notify('Ubicación del sitio asignada.', 'ok');
                return;
            } else if (detail && detail.lat && detail.lng) {
                input.value = `${Number(detail.lat).toFixed(6)}, ${Number(detail.lng).toFixed(6)}`;
                notify('Ubicación previa asignada.', 'ok');
                return;
            }
        }
        return notify('Este dispositivo no permite GPS. Puedes escribir las coordenadas manualmente.', 'warn');
    }

    navigator.geolocation.getCurrentPosition(position => {
        if (input) input.value = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        notify('Ubicación GPS obtenida.', 'ok');
    }, () => {
        if (input && !input.value) {
            if (stop && stop.lat && stop.lng) {
                input.value = `${Number(stop.lat).toFixed(6)}, ${Number(stop.lng).toFixed(6)}`;
                notify('GPS no disponible. Se asignó la ubicación del sitio.', 'warn');
                return;
            } else if (detail && detail.lat && detail.lng) {
                input.value = `${Number(detail.lat).toFixed(6)}, ${Number(detail.lng).toFixed(6)}`;
                notify('GPS no disponible. Se asignó la ubicación previa.', 'warn');
                return;
            }
        }
        notify('GPS no disponible en este momento.', 'warn');
    }, { enableHighAccuracy: false, timeout: 7000, maximumAge: 60000 });
}

async function addTechnicianCompletionPhotos(fileList) {
    const files = Array.from(fileList || []).filter(file => /^image\//i.test(file.type));
    const available = Math.max(0, 6 - technicianCompletionPhotos.length);
    if (!available) return notify('Puedes agregar máximo 6 fotos.', 'err');
    for (const file of files.slice(0, available)) {
        try {
            const photo = await compressTechnicianPhoto(file);
            if (photo) technicianCompletionPhotos.push(photo);
        } catch (error) {
            console.warn('Error reading photo:', error);
        }
    }
    if (files.length > available) notify('Sólo se agregaron las primeras 6 fotos.', 'err');
    renderTechnicianCompletionPhotos();
}

function renderTechnicianCompletionPhotos() {
    const box = document.getElementById('tech-completion-evidence-preview');
    if (!box) return;
    box.innerHTML = technicianCompletionPhotos.length
        ? technicianCompletionPhotos.map((photo, index) => `<div><img src="${photo}" alt="Evidencia ${index + 1}"><button type="button" onclick="removeTechnicianCompletionPhoto(${index})" aria-label="Eliminar foto">×</button></div>`).join('')
        : '<span>Agrega al menos una foto del trabajo.</span>';
}

async function removeTechnicianCompletionPhoto(index) {
    const ok = (typeof askConfirmation === 'function')
        ? await askConfirmation({
            title: 'Quitar foto',
            message: '¿Deseas quitar esta foto de evidencia?',
            confirmText: 'Quitar foto',
            cancelText: 'Cancelar',
            tone: 'danger'
        })
        : true;
    if (!ok) return;
    technicianCompletionPhotos.splice(index, 1);
    renderTechnicianCompletionPhotos();
}

async function saveTechnicianCompletion() {
    let detail = (state.workOrders || []).find(item => item.id === technicianCompletionDetailId && !item.deletedAt);
    if (!detail && window._currentTechnicianCompletionDetail && window._currentTechnicianCompletionDetail.id === technicianCompletionDetailId) {
        detail = window._currentTechnicianCompletionDetail;
        if (Array.isArray(state.workOrders) && !state.workOrders.some(w => w.id === detail.id)) {
            state.workOrders.push(detail);
        }
    }
    if (!detail && typeof getGlobalWorkOrdersCache === 'function') {
        detail = getGlobalWorkOrdersCache()[technicianCompletionDetailId] || null;
    }
    if (!detail && typeof findOrFetchWorkOrder === 'function') {
        detail = await findOrFetchWorkOrder(technicianCompletionDetailId);
    }
    if (!detail) {
        const allStops = getPlanStopsForView('general');
        for (const s of allStops) {
            const found = (s.details || []).find(d => d.id === technicianCompletionDetailId);
            if (found) { detail = found; break; }
        }
    }
    if (!detail) return notify('No se encontró el detalle.', 'err');
    const editingCompleted = detail.status === 'completada';
    const previousReport = detail.technicianReport || {};
    const originalCompletedAt = detail.completedAt || previousReport.completedAt || '';
    const rawClientName = document.getElementById('tech-completion-client')?.value.trim() || '';
    const phone = document.getElementById('tech-completion-phone')?.value.trim() || '';
    const location = document.getElementById('tech-completion-location')?.value.trim() || '';
    const workDone = document.getElementById('tech-completion-work')?.value.trim() || '';
    const observations = document.getElementById('tech-completion-notes')?.value.trim() || '';

    const clientName = rawClientName || detail.clientName || detail.title || 'Cliente';

    const rawPhoneDigits = phone.replace(/\D/g, '');
    const finalPhone = (!phone || !rawPhoneDigits || (rawPhoneDigits.length < 10 && rawPhoneDigits !== '0000000000'))
        ? (phone || 'No tiene número')
        : phone;

    const associatedStop = (typeof getPlanMapStops === 'function'
        ? getPlanMapStops().find(s => (s.detailIds || []).includes(detail.id) || s.id === detail.stopId)
        : null) || null;

    const coordinates = location.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
    let finalLat = 0;
    let finalLng = 0;
    let finalLocation = location;
    if (coordinates && Math.abs(Number(coordinates[1])) <= 90 && Math.abs(Number(coordinates[2])) <= 180) {
        finalLat = Number(coordinates[1]);
        finalLng = Number(coordinates[2]);
        finalLocation = `${finalLat.toFixed(6)}, ${finalLng.toFixed(6)}`;
    } else if (!isNaN(safeFloat(detail.lat)) && !isNaN(safeFloat(detail.lng)) && (safeFloat(detail.lat) !== 0 || safeFloat(detail.lng) !== 0)) {
        finalLat = safeFloat(detail.lat);
        finalLng = safeFloat(detail.lng);
        finalLocation = `${finalLat.toFixed(6)}, ${finalLng.toFixed(6)}`;
    } else if (associatedStop && !isNaN(safeFloat(associatedStop.lat)) && !isNaN(safeFloat(associatedStop.lng))) {
        finalLat = safeFloat(associatedStop.lat);
        finalLng = safeFloat(associatedStop.lng);
        finalLocation = `${finalLat.toFixed(6)}, ${finalLng.toFixed(6)}`;
    }

    const materialUsed = document.getElementById('tech-completion-material')?.value.trim() || '';

    if (!workDone) {
        const workInput = document.getElementById('tech-completion-work');
        if (workInput) {
            workInput.classList.add('is-invalid-input');
            workInput.focus();
            workInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return notify('El detalle realizado es obligatorio. Por favor describe el trabajo que realizaste.', 'err');
    }

    if (!materialUsed) {
        const matInput = document.getElementById('tech-completion-material');
        if (matInput) {
            matInput.classList.add('is-invalid-input');
            matInput.focus();
            matInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return notify('El material utilizado es obligatorio. Por favor anota qué material usaste.', 'err');
    }

    if (!technicianCompletionPhotos.length) return notify('Agrega al menos una foto del trabajo.', 'warn');

    const confirmMsg = editingCompleted
        ? '¿Deseas guardar los cambios realizados en este reporte?'
        : '¿Confirmas que este trabajo quedó listo y deseas terminarlo?';
    const confirmed = await askConfirmation({
        title: editingCompleted ? 'Guardar cambios' : '¿Confirmar trabajo terminado?',
        message: confirmMsg,
        confirmText: editingCompleted ? 'Guardar cambios' : 'Confirmar y terminar',
        cancelText: 'Revisar',
        tone: 'ok'
    });
    if (!confirmed) return;

    const now = new Date().toISOString();
    const actor = getCurrentUser();
    detail.clientName = clientName;
    detail.clientPhone = finalPhone;
    detail.detailLocation = finalLocation || 'Sin coordenadas registradas';
    detail.lat = finalLat;
    detail.lng = finalLng;
    detail.status = 'completada';
    detail.detailKind = 'physical';
    detail.folio = getDetailFolio(detail);
    detail.completedAt = editingCompleted && originalCompletedAt ? originalCompletedAt : now;
    detail.updatedAt = now;
    if (editingCompleted) detail.modifiedAt = now;
    detail.technicianReport = {
        ...previousReport,
        result: 'terminado',
        solution: workDone,
        materialUsed,
        observations,
        reason: '',
        phone: finalPhone,
        location: detail.detailLocation,
        evidencePhotos: technicianCompletionPhotos.slice(),
        completedAt: detail.completedAt,
        completedBy: editingCompleted ? (previousReport.completedBy || actor.id || '') : (actor.id || ''),
        completedByName: editingCompleted ? (previousReport.completedByName || actor.name || actor.username || '') : (actor.name || actor.username || ''),
        ...(editingCompleted ? { modifiedAt: now, modifiedBy: actor.id || '', modifiedByName: actor.name || actor.username || '' } : {})
    };
    savePlanificarOfflineSnapshot();
    setUpdatedAudit(detail, editingCompleted ? 'modificó detalle terminado' : 'marcó detalle hecho con evidencia');
    // Pre-generar la imagen del reporte con las fotos en memoria antes de saveDB() para que el envío por WhatsApp en celular sea instantáneo
    const _localPhotosSnapshot = technicianCompletionPhotos.slice();
    if (typeof prepareTechnicianSummaryFile === 'function') {
        prepareTechnicianSummaryFile({
            ...detail,
            technicianReport: { ...(detail.technicianReport || {}), evidencePhotos: _localPhotosSnapshot }
        }).catch(() => { });
    }
    getPlanMapStops().forEach(stop => {
        if ((stop.detailIds || []).includes(detail.id) || (stop.equipmentId && stop.equipmentId === detail.equipmentId)) {
            syncStopCompletion(stop);
            stop.updatedAt = now;
        }
    });
    let saved = false;
    try {
        saved = await saveDB();
    } catch (saveErr) {
        console.warn('saveDB failed:', saveErr);
    }
    if (!saved) {
        notify('Guardado localmente (sin señal). Se sincronizará al tener conexión.', 'warn');
    }
    CM('tech-completion-mo');
    technicianCompletionPhotos = [];
    technicianCompletionDetailId = '';
    window._currentTechnicianCompletionDetail = detail;
    window._lastReportedDetail = detail;
    try { renderPlan(); } catch (renderErr) { console.warn('renderPlan after completion failed:', renderErr); }

    const isTech = isTechnicianPlanView() || (typeof userHasRole === 'function' && userHasRole('tecnico'));
    const towerAntenna = (isTech && typeof findAntennaForDetail === 'function') ? findAntennaForDetail(detail, associatedStop) : null;
    let promptedTowerModal = false;

    if (towerAntenna && !editingCompleted) {
        const hasMat = typeof hasTowerMaterial === 'function' ? hasTowerMaterial(towerAntenna) : false;
        const promptedRecently = typeof wasTowerMaterialPromptedRecently === 'function' && wasTowerMaterialPromptedRecently(towerAntenna.id);

        if (!hasMat) {
            // Si no tiene nada, sí o sí tiene que colocar información obligatoria
            if (typeof openTowerMaterialModal === 'function') {
                openTowerMaterialModal(towerAntenna.id, {
                    completionDetail: detail,
                    fromCompletion: true,
                    mandatory: true,
                    detailTitle: detail.title || detail.clientName || 'Trabajo en torre'
                });
                promptedTowerModal = true;
            }
        } else if (!promptedRecently) {
            // Si ya tiene algo, puede editarlo o pulsar en Continuar; no repite en al menos un día
            if (typeof openTowerMaterialModal === 'function') {
                openTowerMaterialModal(towerAntenna.id, {
                    completionDetail: detail,
                    fromCompletion: true,
                    mandatory: false,
                    canContinue: true,
                    detailTitle: detail.title || detail.clientName || 'Trabajo en torre'
                });
                promptedTowerModal = true;
            }
        }
    }

    if (!promptedTowerModal) {
        openTechnicianCompletionSummary(detail);
    }
}

function openTechnicianCompletionSummary(detail) {
    if (!detail) detail = window._currentTechnicianCompletionDetail || window._lastReportedDetail;
    if (!detail) return;
    window._currentTechnicianCompletionDetail = detail;
    window._lastReportedDetail = detail;
    if (typeof prepareTechnicianSummaryFile === 'function') {
        setTimeout(() => { prepareTechnicianSummaryFile(detail).catch(() => {}); }, 0);
    }
    const date = selectedCalendarDate || localDateKey();
    const dayStops = getPlanStopsForView('general').filter(stop => stop.scheduledDate === date);
    const detailsById = new Map();
    dayStops.forEach(stop => {
        getStopDetails(stop).forEach(item => detailsById.set(item.id, item));
        getStopResolvedHistory(stop).forEach(item => detailsById.set(item.id, item));
    });
    const dayDetails = Array.from(detailsById.values());
    const completed = dayDetails.filter(item => ['completada', 'no_realizado'].includes(item.status || '')).length;
    const pending = Math.max(0, dayDetails.length - completed);
    const report = detail.technicianReport || {};
    const requestedDetail = getTechnicianReportRequestedText(detail);
    const completedWork = getTechnicianReportCompletedWork(detail, requestedDetail);
    const town = getTechnicianReportTown(detail);
    const photos = getAdminTechReportPhotos(report);
    const user = getCurrentUser();
    const isNoDone = detail.status === 'no_realizado' || report.result === 'no_realizado';
    const isInstallation = detail.category === 'instalacion';

    let modal = document.getElementById('tech-completion-summary-mo');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', '<div class="mo tech-completion-summary-mo" id="tech-completion-summary-mo"><div class="tech-completion-summary-card" id="tech-completion-summary-card"></div></div>');
        modal = document.getElementById('tech-completion-summary-mo');
    }
    const card = document.getElementById('tech-completion-summary-card');
    if (!card) return;

    const checkIcon = isNoDone
        ? `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.8" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
        : `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.8" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;

    card.innerHTML = `<div class="tech-summary-report-head"><span class="tech-summary-report-check ${isNoDone ? 'is-unsolved' : ''}">${checkIcon}</span><div><small>${isNoDone ? 'NO SE PUDO TERMINAR' : (isInstallation ? 'NUEVA INSTALACIÓN' : 'TRABAJO TERMINADO')}</small><h2>${isNoDone ? 'Trabajo no realizado' : (isInstallation ? 'Nueva instalación' : '¡Trabajo terminado!')}</h2></div></div>
        <div class="tech-summary-report-progress"><strong>${completed} de ${dayDetails.length}</strong><span>trabajos listos hoy</span><b>${pending} pendiente${pending === 1 ? '' : 's'}</b></div>
        ${(() => {
            const associatedStop = (typeof getPlanStopsForView === 'function' ? getPlanStopsForView('general') : []).find(s => (s.detailIds || []).includes(detail?.id) || s.id === detail?.stopId) || null;
            const isTownStop = !!(associatedStop && (associatedStop.nodeId || associatedStop.type === 'node'));
            const isDirectTowerStop = !!(associatedStop && (associatedStop.equipmentId || associatedStop.type === 'equipment' || associatedStop.category === 'torre') && !associatedStop.nodeId);
            const towerAnt = (!isTownStop && isDirectTowerStop && typeof findAntennaForDetail === 'function') ? findAntennaForDetail(detail, associatedStop) : null;
            if (!towerAnt) return '';
            const hasMat = !!(towerAnt.towerSections || towerAnt.towerRadios || towerAnt.towerBatteries || towerAnt.towerPanels || towerAnt.towerExtraNotes || towerAnt.towerMaterialNotes || (Array.isArray(towerAnt.towerMaterialPhotos) && towerAnt.towerMaterialPhotos.length));
            return `
                <div class="tech-summary-tower-reminder">
                    <div class="tower-reminder-head">
                        <span class="tower-reminder-icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 4 22h16L12 2z"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="6" y1="17" x2="18" y2="17"/><circle cx="12" cy="2" r="1"/></svg></span>
                        <div class="tower-reminder-text-wrap">
                            <span class="tower-reminder-kicker">TORRE: ${escapeHtml(towerAnt.name || 'Antena')}</span>
                            <strong>${hasMat ? '¿Se cambió material en esta torre?' : '¿Revisaste el material de la torre?'}</strong>
                            <p>${hasMat ? 'Esta torre ya tiene material anotado. Si agregaste o cambiaste tramos, radios, pilas o paneles, mantén los datos al día:' : 'Si cambiaste tramos, radios, pilas o paneles, anótalo aquí con fotos:'}</p>
                        </div>
                    </div>
                    <button type="button" class="btn btn-tower-featured" onclick="openTowerMaterialModal('${escapeAttr(towerAnt.id)}')">
                        <span class="tower-btn-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 4 22h16L12 2z"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="6" y1="17" x2="18" y2="17"/></svg></span>
                        <span>${hasMat ? 'Ver / editar material de torre' : 'Anotar material de torre'}</span>
                    </button>
                </div>
            `;
        })()}
        <div class="tech-summary-report-grid">
            <div><small>Técnico</small><strong>${escapeHtml(user.name || user.nombre || user.username || 'Técnico')}</strong></div>
            <div><small>Fecha y hora</small><strong>${escapeHtml(new Date(report.completedAt || detail.completedAt || Date.now()).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }))}</strong></div>
            ${report.modifiedAt || detail.modifiedAt ? `<div><small>Última modificación</small><strong>${escapeHtml(formatPlanDateTime(report.modifiedAt || detail.modifiedAt))}</strong></div>` : ''}
            <div><small>Cliente</small><strong>${escapeHtml(detail.clientName || 'Sin nombre')}</strong></div>
            <div><small>Pueblo</small><strong>${escapeHtml(town)}</strong></div>
            <div><small>Ubicación</small><strong>${escapeHtml(detail.detailLocation || report.location || 'Sin ubicación')}</strong></div>
        </div>
        <div class="tech-summary-report-detail tech-summary-report-attended"><small>Trabajo solicitado</small><span class="tech-summary-folio">${escapeHtml(getDetailFolio(detail))}</span><strong>${escapeHtml(requestedDetail)}</strong></div>
        ${isNoDone ? `
            <div class="tech-summary-report-detail" style="border-left:4px solid #ef4444;background:#fef2f2;padding:12px 14px;border-radius:10px;">
                <small style="color:#b91c1c;font-weight:900;">¿Por qué no se pudo terminar?</small>
                <strong style="color:#991b1b;font-size:14px;display:block;margin-top:3px;">${escapeHtml(report.reason || 'Sin motivo especificado')}</strong>
            </div>
        ` : ''}
        ${completedWork ? `<div class="tech-summary-report-detail"><small>Trabajo realizado</small><strong>${escapeHtml(completedWork)}</strong></div>` : ''}
        ${(!isNoDone && report.materialUsed) ? `<div class="tech-summary-report-detail" style="border-left:4px solid #0284c7;background:#f0f9ff;"><small style="color:#0284c7;font-weight:800;">Material utilizado</small><strong style="color:#0369a1;">${escapeHtml(report.materialUsed)}</strong></div>` : ''}
        ${report.observations ? `<div class="tech-summary-report-detail"><small>Notas extras</small><strong>${escapeHtml(report.observations)}</strong></div>` : ''}
        ${photos.length ? `<div class="tech-summary-report-photos">${photos.slice(0, 4).map((photo, index) => `<img src="${escapeAttr(photo)}" alt="Evidencia ${index + 1}">`).join('')}</div>` : ''}
        <div class="tech-summary-report-footer"><span>WiFiMex · ${isNoDone ? 'Incidencia' : 'Avance'} del ${escapeHtml(formatCalendarDate(date))}</span><div><button type="button" class="btn bgh" onclick="copyTechnicianOrderNumber('${escapeAttr(detail.id)}')">Copiar folio</button><button type="button" class="btn tech-whatsapp-share" onclick="shareTechnicianCompletion('${escapeAttr(detail.id)}')">Enviar por WhatsApp</button>${(() => {
            const associatedStop = (typeof getPlanStopsForView === 'function' ? getPlanStopsForView('general') : []).find(s => (s.detailIds || []).includes(detail?.id) || s.id === detail?.stopId) || null;
            const isTownStop = !!(associatedStop && (associatedStop.nodeId || associatedStop.type === 'node'));
            const isDirectTowerStop = !!(associatedStop && (associatedStop.equipmentId || associatedStop.type === 'equipment' || associatedStop.category === 'torre') && !associatedStop.nodeId);
            if (isTownStop || !isDirectTowerStop) return '';
            const towerAnt = typeof findAntennaForDetail === 'function' ? findAntennaForDetail(detail, associatedStop) : null;
            const antId = towerAnt?.id || detail.equipmentId;
            if (!antId) return '';
            const hasMat = towerAnt ? !!(towerAnt.towerSections || towerAnt.towerRadios || towerAnt.towerBatteries || towerAnt.towerPanels || towerAnt.towerExtraNotes || towerAnt.towerMaterialNotes || (Array.isArray(towerAnt.towerMaterialPhotos) && towerAnt.towerMaterialPhotos.length)) : false;
            return `<button type="button" class="btn btn-tower-callout ${hasMat ? 'is-registered' : 'is-pending'}" onclick="openTowerMaterialModal('${escapeAttr(antId)}')"><span class="tower-btn-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 4 22h16L12 2z"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="6" y1="17" x2="18" y2="17"/></svg></span> <span>Material torre</span></button>`;
        })()}<button type="button" class="btn bgh" onclick="CM('tech-completion-summary-mo')">Cerrar</button></div></div>`;
    OM('tech-completion-summary-mo');
}

function getTechnicianReportTown(detail) {
    const directTown = String(detail?.town || '').trim();
    if (directTown) return directTown;
    const node = detail?.nodeId
        ? (state.nodes || []).find(item => item.id === detail.nodeId && !item.deletedAt)
        : null;
    const nodeTown = String(node?.town || node?.name || detail?.nodeName || '').trim();
    if (nodeTown) return nodeTown.replace(/^\s*R\s*\d+\s*[·:._-]*\s*/i, '').trim() || nodeTown;
    const stop = getPlanStopsForView('general').find(item => {
        if ((item.detailIds || []).includes(detail?.id)) return true;
        if (detail?.nodeId && item.nodeId === detail.nodeId) return true;
        return false;
    });
    if (!stop) return 'Sin pueblo registrado';
    const stopNode = stop.nodeId
        ? (state.nodes || []).find(item => item.id === stop.nodeId && !item.deletedAt)
        : null;
    const stopTown = String(stopNode?.town || stopNode?.name || stop.town || stop.nodeName || (stop.type !== 'equipment' ? stop.name : '') || '').trim();
    return stopTown.replace(/^\s*R\s*\d+\s*[·:._-]*\s*/i, '').trim() || stopTown || 'Sin pueblo registrado';
}

function getTechnicianReportRequestedText(detail) {
    if (typeof getWorkOrderRequestedText === 'function') {
        return getWorkOrderRequestedText(detail, detail?.title || 'Detalle');
    }
    return detail?.title || detail?.description || 'Detalle';
}

function technicianReportTextsMatch(left, right) {
    const norm = typeof normalizeName === 'function' ? normalizeName : s => String(s || '').trim().toLowerCase();
    const key = value => norm(typeof repairDisplayText === 'function' ? repairDisplayText(value) : value)
        .replace(/[^a-z0-9ñ]+/g, ' ')
        .trim();
    const leftKey = key(left);
    const rightKey = key(right);
    return !!leftKey && leftKey === rightKey;
}

function getTechnicianReportCompletedWork(detail, requestedDetail = getTechnicianReportRequestedText(detail)) {
    const solution = String(detail?.technicianReport?.solution || '').trim();
    if (!solution) return '';
    if (technicianReportTextsMatch(solution, requestedDetail) || technicianReportTextsMatch(solution, detail?.title)) return '';
    return solution;
}

function getDetailFolio(detail) {
    const prefix = detail?.category === 'instalacion' ? 'NEW' : 'DET';
    if (detail?.folio) return String(detail.folio).replace(/^(DET|NEW)-/i, `${prefix}-`);
    const source = String(detail?.id || detail?.createdAt || 'detalle');
    let hash = 0;
    for (let index = 0; index < source.length; index += 1) hash = ((hash * 31) + source.charCodeAt(index)) >>> 0;
    return `${prefix}-${String(hash % 1000000).padStart(6, '0')}`;
}

function drawSummaryWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach(word => {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
        else line = test;
    });
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((value, index) => ctx.fillText(value, x, y + (index * lineHeight)));
    return Math.min(lines.length, maxLines) * lineHeight;
}

function loadTechnicianSummaryImage(src) {
    return new Promise(resolve => {
        if (!src) return resolve(null);
        let done = false;
        const finish = value => { if (!done) { done = true; resolve(value); } };
        const image = new Image();
        if (!/^data:|^blob:/i.test(String(src))) image.crossOrigin = 'anonymous';
        image.onload = () => finish(image);
        image.onerror = () => finish(null);
        setTimeout(() => finish(null), 6000);
        image.src = src;
    });
}

async function createTechnicianSummaryImage(detail) {
    const report = detail.technicianReport || {};
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    const isInstallation = detail.category === 'instalacion';
    const isNoDone = detail.status === 'no_realizado' || report.result === 'no_realizado';
    const isNewPending = detail.status === 'pendiente' || !detail.status;
    const requestedDetail = typeof getTechnicianReportRequestedText === 'function'
        ? getTechnicianReportRequestedText(detail)
        : (detail.title || detail.description || 'Detalle');
    const completedWork = typeof getTechnicianReportCompletedWork === 'function'
        ? getTechnicianReportCompletedWork(detail, requestedDetail)
        : (report.solution || '');
    const town = typeof getTechnicianReportTown === 'function' ? getTechnicianReportTown(detail) : (detail.town || 'Sin pueblo');
    const materialUsed = report.materialUsed || '';
    const clientPhoneStr = String(detail.clientPhone || detail.phone || detail.telefono || report.phone || '').trim();
    const rawDate = report.completedAt || detail.completedAt || detail.createdAt || Date.now();
    const dateTimeStr = new Date(rawDate).toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    const phoneDisplay = clientPhoneStr || 'Sin teléfono';
    const fields = isInstallation ? [
        ['NÚMERO DE ORDEN', getDetailFolio(detail)],
        ['TÉCNICO', report.completedByName || user.name || user.username || 'Técnico'],
        ['CLIENTE', detail.clientName || 'Sin nombre'],
        ['TELÉFONO', phoneDisplay],
        ['PUEBLO O COMUNIDAD', town],
        ['UBICACIÓN', detail.detailLocation || 'Sin ubicación'],
        ['DETALLES DE LA INSTALACIÓN', report.solution || 'Sin observaciones adicionales']
    ] : (isNoDone ? [
        ['FOLIO DEL DETALLE', getDetailFolio(detail)],
        ['TÉCNICO', report.completedByName || user.name || user.nombre || user.username || 'Técnico'],
        ['CLIENTE', detail.clientName || 'Sin nombre'],
        ['TELÉFONO', phoneDisplay],
        ['PUEBLO O COMUNIDAD', town],
        ['UBICACIÓN', detail.detailLocation || report.location || 'Sin ubicación'],
        ['DETALLE NO CONCLUIDO', requestedDetail],
        ['MOTIVO DE NO CONCLUSIÓN', report.reason || 'Sin motivo especificado']
    ] : (isNewPending ? [
        ['NUEVO DETALLE EN RUTA', getDetailFolio(detail)],
        ['TÉCNICO', detail.createdByName || user.name || user.username || 'Técnico'],
        ['CLIENTE', detail.clientName || 'Sin nombre'],
        ['TELÉFONO', phoneDisplay],
        ['PUEBLO O COMUNIDAD', town],
        ['UBICACIÓN', detail.detailLocation || 'Sin ubicación'],
        ['TRABAJO SOLICITADO', requestedDetail || detail.title || 'Detalle en ruta']
    ] : [
        ['FOLIO DEL DETALLE', getDetailFolio(detail)],
        ['TÉCNICO', report.completedByName || user.name || user.nombre || user.username || 'Técnico'],
        ['CLIENTE', detail.clientName || 'Sin nombre'],
        ['TELÉFONO', phoneDisplay],
        ['PUEBLO O COMUNIDAD', town],
        ['UBICACIÓN', detail.detailLocation || report.location || 'Sin ubicación'],
        ['DETALLE ATENDIDO', requestedDetail],
        ...(completedWork ? [['TRABAJO REALIZADO', completedWork]] : []),
        ['MATERIAL UTILIZADO', materialUsed || 'Sin material registrado']
    ]));

    const photos = getAdminTechReportPhotos(report).slice(0, 4);
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    const totalBoxesHeight = fields.reduce((sum, [label]) => {
        const isMultiLine = label === 'DETALLES DE LA INSTALACIÓN' || label === 'MOTIVO DE NO CONCLUSIÓN' || label === 'TRABAJO REALIZADO' || label === 'MATERIAL UTILIZADO';
        const boxHeight = isMultiLine ? 134 : 106;
        return sum + boxHeight + 12;
    }, 0);
    const baseHeight = 244 + totalBoxesHeight + (photos.length ? 220 : 0) + 90;
    canvas.height = Math.max(1300, baseHeight);

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = isNoDone ? '#fff1f2' : (isNewPending ? '#f0f9ff' : '#eaf4fb');
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(54, 48, 972, canvas.height - 96);

    if (isNoDone) {
        ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(126, 130, 48, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 52px sans-serif'; ctx.fillText('!', 116, 148);
        ctx.fillStyle = '#b91c1c'; ctx.font = 'bold 23px sans-serif'; ctx.fillText('REPORTE DE INCIDENCIA', 202, 107);
        ctx.fillStyle = '#10264a'; ctx.font = 'bold 48px sans-serif'; ctx.fillText('Detalle no realizado', 202, 162);
    } else if (isNewPending) {
        ctx.fillStyle = '#0284c7'; ctx.beginPath(); ctx.arc(126, 130, 48, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 52px sans-serif'; ctx.fillText('+', 111, 148);
        ctx.fillStyle = '#0369a1'; ctx.font = 'bold 23px sans-serif'; ctx.fillText('NUEVO DETALLE EN RUTA', 202, 107);
        ctx.fillStyle = '#10264a'; ctx.font = 'bold 48px sans-serif'; ctx.fillText('Trabajo registrado', 202, 162);
    } else {
        ctx.fillStyle = '#0aa35d'; ctx.beginPath(); ctx.arc(126, 130, 48, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 52px sans-serif'; ctx.fillText('✓', 106, 148);
        ctx.fillStyle = '#0874e8'; ctx.font = 'bold 23px sans-serif'; ctx.fillText(isInstallation ? 'NUEVA ORDEN REGISTRADA' : 'REPORTE DE TRABAJO TERMINADO', 202, 107);
        ctx.fillStyle = '#10264a'; ctx.font = 'bold 48px sans-serif'; ctx.fillText(isInstallation ? 'Nueva instalación' : 'Detalle terminado', 202, 162);
    }
    ctx.fillStyle = '#d8e7f2'; ctx.fillRect(84, 204, 912, 2);

    let y = 244;
    fields.forEach(([label, value], index) => {
        const isFirst = index === 0;
        const isPhone = label === 'TELÉFONO';
        const isMultiLine = label === 'DETALLES DE LA INSTALACIÓN' || label === 'MOTIVO DE NO CONCLUSIÓN' || label === 'TRABAJO REALIZADO' || label === 'MATERIAL UTILIZADO';
        const boxHeight = isMultiLine ? 134 : 106;

        ctx.fillStyle = isFirst ? (isNoDone ? '#fee2e2' : '#e9f4ff') : '#f8fbfe';
        ctx.fillRect(84, y, 912, boxHeight);

        if (isFirst) {
            // Folio a la izquierda
            ctx.textAlign = 'left';
            ctx.fillStyle = isNoDone ? '#b91c1c' : '#667b92';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText(label, 108, y + 31);

            ctx.fillStyle = isNoDone ? '#991b1b' : '#0868bd';
            ctx.font = 'bold 38px sans-serif';
            ctx.fillText(value, 108, y + 72);

            // Fecha y hora a toda la derecha
            ctx.textAlign = 'right';
            ctx.fillStyle = isNoDone ? '#b91c1c' : '#667b92';
            ctx.font = 'bold 18px sans-serif';
            ctx.fillText('FECHA Y HORA', 972, y + 31);

            ctx.fillStyle = '#10264a';
            ctx.font = 'bold 26px sans-serif';
            ctx.fillText(dateTimeStr, 972, y + 72);

            ctx.textAlign = 'left';
        } else if (isPhone) {
            ctx.textAlign = 'left';
            ctx.fillStyle = '#667b92';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText('TELÉFONO', 108, y + 31);

            ctx.fillStyle = (value && value !== 'Sin teléfono') ? '#0284c7' : '#64748b';
            ctx.font = 'bold 28px sans-serif';
            drawSummaryWrappedText(ctx, value, 108, y + 72, 852, 34, 1);
        } else if (label === 'CLIENTE') {
            ctx.textAlign = 'left';
            ctx.fillStyle = '#667b92';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText(label, 108, y + 31);
            ctx.fillStyle = '#10264a';
            ctx.font = 'bold 28px sans-serif';
            drawSummaryWrappedText(ctx, value, 108, y + 72, 852, 34, 1);
            const phoneText = phoneDisplay;
            void phoneText;
        } else {
            ctx.textAlign = 'left';
            ctx.fillStyle = isNoDone && index === 0 ? '#b91c1c' : '#667b92';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText(label, 108, y + 31);

            ctx.fillStyle = '#10264a';
            ctx.font = 'bold 28px sans-serif';
            drawSummaryWrappedText(ctx, value, 108, y + 72, 852, 34, isMultiLine ? 2 : 1);
        }

        y += boxHeight + 12;
    });

    if (photos.length) {
        const images = await Promise.all(photos.map(loadTechnicianSummaryImage));
        const gap = 12;
        const width = (912 - (gap * (photos.length - 1))) / photos.length;
        images.forEach((image, index) => {
            if (!image) return;
            const x = 84 + (index * (width + gap));
            const ratio = Math.max(width / image.width, 176 / image.height);
            const sw = width / ratio, sh = 176 / ratio;
            ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, width, 176);
        });
    }

    ctx.fillStyle = '#10264a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('WiFiMex · Reporte de servicio', 84, canvas.height - 37);
    return canvas;
}

function getTechnicianDayProgressSummary(dateKey) {
    try {
        const date = dateKey || selectedCalendarDate || (typeof localDateKey === 'function' ? localDateKey() : new Date().toISOString().slice(0, 10));
        const allStops = typeof getPlanStopsForView === 'function' ? getPlanStopsForView('general') : [];
        const dayStops = allStops.filter(s => (s.scheduledDate || '') === date);
        const detailsMap = new Map();
        dayStops.forEach(s => {
            if (typeof getStopDetails === 'function') getStopDetails(s).forEach(d => detailsMap.set(d.id, d));
            if (typeof getStopResolvedHistory === 'function') getStopResolvedHistory(s).forEach(d => detailsMap.set(d.id, d));
        });
        const list = Array.from(detailsMap.values());
        if (!list.length) return null;
        const completed = list.filter(d => ['completada', 'no_realizado'].includes(d.status || '')).length;
        const pending = Math.max(0, list.length - completed);
        return { completed, total: list.length, pending };
    } catch (_) {
        return null;
    }
}

function findTechnicianCompletionDetail(detailId) {
    if (detailId && typeof detailId === 'object') return detailId;
    if (window._currentTechnicianCompletionDetail && (!detailId || window._currentTechnicianCompletionDetail.id === detailId)) {
        return window._currentTechnicianCompletionDetail;
    }
    if (window._lastReportedDetail && (!detailId || window._lastReportedDetail.id === detailId)) {
        return window._lastReportedDetail;
    }
    if (detailId) {
        const found = (state.workOrders || []).find(item => item.id === detailId && !item.deletedAt);
        if (found) return found;
        if (typeof getGlobalWorkOrdersCache === 'function') {
            const cache = getGlobalWorkOrdersCache() || {};
            const cached = Array.isArray(cache)
                ? cache.find(item => item && item.id === detailId)
                : cache[detailId];
            if (cached && !cached.deletedAt) return cached;
        }
        const stops = typeof getPlanStopsForView === 'function' ? getPlanStopsForView('general') : [];
        for (const stop of stops) {
            const details = typeof getStopDetails === 'function' ? getStopDetails(stop) : (stop.details || []);
            const inStop = details.find(d => d.id === detailId);
            if (inStop) return inStop;
            const resolved = typeof getStopResolvedHistory === 'function' ? getStopResolvedHistory(stop) : [];
            const inResolved = resolved.find(d => d.id === detailId);
            if (inResolved) return inResolved;
        }
    }
    return window._currentTechnicianCompletionDetail || window._lastReportedDetail || null;
}

function buildTechnicianWhatsAppMessage(detail) {
    if (!detail) return '';
    const folio = getDetailFolio(detail);
    const report = detail.technicianReport || {};
    const isNoDone = detail.status === 'no_realizado' || report.result === 'no_realizado';
    const isInstallation = detail.category === 'instalacion';
    const requested = typeof getTechnicianReportRequestedText === 'function'
        ? getTechnicianReportRequestedText(detail)
        : (detail.title || detail.description || 'Detalle');
    const completedWork = typeof getTechnicianReportCompletedWork === 'function'
        ? getTechnicianReportCompletedWork(detail, requested)
        : (report.solution || '');
    const town = typeof getTechnicianReportTown === 'function'
        ? getTechnicianReportTown(detail)
        : (detail.town || '');
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    const techName = report.completedByName || user?.name || user?.nombre || user?.username || 'Técnico';
    const clientName = detail.clientName || 'Sin cliente';
    const rawPhone = String(detail.clientPhone || detail.phone || report.phone || '').trim();
    const dateObj = new Date(report.completedAt || detail.completedAt || detail.createdAt || Date.now());
    const dateStr = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
        : '';
    const locationRaw = String(detail.detailLocation || report.location || '').trim();

    let locLabel = locationRaw;
    let mapsUrl = '';
    if (locationRaw) {
        if (typeof getLocationDisplay === 'function') {
            const parsed = getLocationDisplay(locationRaw);
            locLabel = parsed.label || locationRaw;
            if (parsed.url) mapsUrl = parsed.url;
        }
        if (!mapsUrl && typeof parseOptionalLocation === 'function') {
            const parsed = parseOptionalLocation(locationRaw);
            if (parsed?.url) mapsUrl = parsed.url;
            else if (parsed?.lat && parsed?.lng) {
                mapsUrl = `https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`;
            }
        }
        if (!mapsUrl) {
            const m = locationRaw.match(/([-+]?\d{1,3}(?:\.\d+)?)\s*(?:,|\s+)\s*([-+]?\d{1,3}(?:\.\d+)?)/);
            if (m) mapsUrl = `https://www.google.com/maps?q=${m[1]},${m[2]}`;
        }
    }

    const titleHeader = isNoDone
        ? '⚠️ *WiFiMex · Reporte de Incidencia*'
        : (isInstallation ? '🚀 *WiFiMex · Nueva Instalación*' : '✅ *WiFiMex · Reporte de Trabajo Terminado*');

    const lines = [titleHeader, ''];
    lines.push(`*Folio:* ${folio}`);
    lines.push(`*Técnico:* ${techName}`);
    if (dateStr) lines.push(`*Fecha y hora:* ${dateStr}`);
    lines.push(`*Cliente:* ${clientName}`);
    if (rawPhone && rawPhone !== 'Sin teléfono' && rawPhone !== 'No tiene número') {
        lines.push(`*Teléfono:* ${rawPhone}`);
    }
    if (town && town !== 'Sin pueblo' && town !== 'Sin pueblo registrado') {
        lines.push(`*Pueblo:* ${town}`);
    }
    if (locLabel && locLabel !== 'Sin ubicación') {
        lines.push(`*Ubicación:* ${locLabel}`);
    }
    if (mapsUrl) {
        lines.push(`*Google Maps:* ${mapsUrl}`);
    }

    if (isNoDone) {
        if (requested) lines.push(`*Trabajo solicitado:* ${requested}`);
        lines.push(`*Motivo no realizado:* ${report.reason || 'Sin motivo especificado'}`);
    } else if (isInstallation) {
        const installNotes = report.solution || requested || 'Nueva instalación realizada';
        lines.push(`*Equipo / Notas:* ${installNotes}`);
    } else {
        if (requested) lines.push(`*Trabajo solicitado:* ${requested}`);
        if (completedWork) lines.push(`*Trabajo realizado:* ${completedWork}`);
    }

    if (report.observations) {
        lines.push(`*Notas extras:* ${report.observations}`);
    }

    const progress = getTechnicianDayProgressSummary();
    if (progress && progress.total > 0) {
        lines.push(`*Avance de hoy:* ${progress.completed} de ${progress.total} trabajos listos (${progress.pending} pendientes)`);
    }

    return lines.join('\n');
}

async function copyTextToClipboard(text) {
    if (!text) return false;
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (_) {}
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        textarea.remove();
        return ok;
    } catch (_) {
        return false;
    }
}

async function copyTechnicianOrderNumber(detailId, announce = true) {
    const detail = findTechnicianCompletionDetail(detailId);
    if (!detail) {
        if (announce) notify('No se encontró el detalle para copiar el folio.', 'err');
        return false;
    }
    const folio = getDetailFolio(detail);
    const copied = await copyTextToClipboard(folio);
    if (announce) {
        if (copied) notify(`Folio copiado: ${folio}`);
        else notify('No se pudo copiar el folio.', 'err');
    }
    return copied;
}


const _cachedTechnicianSummaryFiles = new Map();

function getTechnicianSummaryCacheKey(detail) {
    if (!detail) return '';
    const report = detail.technicianReport || {};
    return [
        detail.id || '',
        detail.status || '',
        detail.updatedAt || '',
        report.completedAt || '',
        report.solution || '',
        report.reason || '',
        Array.isArray(report.evidencePhotos) ? report.evidencePhotos.length : 0
    ].join('_');
}

async function prepareTechnicianSummaryFile(detail) {
    if (!detail) return null;
    const cleanFolio = getDetailFolio(detail).replace(/[^a-zA-Z0-9_-]/g, '-');
    const fileName = `reporte-${cleanFolio}.png`;
    try {
        const canvas = await createTechnicianSummaryImage(detail);
        if (!canvas) return null;
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) return null;
        let file = null;
        try {
            file = new File([blob], fileName, { type: 'image/png' });
        } catch (_) {
            file = blob;
            file.name = fileName;
        }
        const result = { blob, file, fileName };
        const key = getTechnicianSummaryCacheKey(detail);
        if (key) _cachedTechnicianSummaryFiles.set(key, result);
        return result;
    } catch (err) {
        console.warn('Error preparando imagen de reporte:', err);
        return null;
    }
}

let _technicianShareInProgress = false;

async function shareTechnicianCompletion(detailId) {
    const detail = findTechnicianCompletionDetail(detailId);
    if (!detail) {
        notify('No se encontró el detalle para compartir.', 'err');
        return;
    }
    if (_technicianShareInProgress) return;
    _technicianShareInProgress = true;
    const buttons = Array.from(document.querySelectorAll('.tech-whatsapp-share'));
    buttons.forEach(btn => { btn.disabled = true; btn.dataset.label = btn.dataset.label || btn.textContent; btn.textContent = 'Preparando imagen...'; });
    try {
        const cleanFolio = getDetailFolio(detail).replace(/[^a-zA-Z0-9_-]/g, '-');
        const fileName = `reporte-${cleanFolio}.png`;
        const key = getTechnicianSummaryCacheKey(detail);
        let prepared = _cachedTechnicianSummaryFiles.get(key) || null;
        if (!prepared) prepared = await prepareTechnicianSummaryFile(detail);
        if (!prepared || !prepared.blob) {
            notify('No se pudo generar la imagen del reporte. Intenta de nuevo.', 'err');
            return;
        }
        const { blob } = prepared;
        const file = prepared.file || new File([blob], fileName, { type: 'image/png' });
        const isMobile = typeof window !== 'undefined' && (
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '') ||
            (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent || '')) ||
            (window.innerWidth > 0 && window.innerWidth <= 820) ||
            (window.matchMedia && window.matchMedia('(max-width: 820px)').matches)
        );

        // 1. Compartir directamente el archivo de imagen en celular (SOLO FOTO, SIN TEXTO, NUNCA GUARDAR EN EL DISPOSITIVO)
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            let canShareFile = true;
            if (typeof navigator.canShare === 'function') {
                try { canShareFile = navigator.canShare({ files: [file] }); } catch (_) { canShareFile = true; }
            }
            if (canShareFile) {
                try {
                    await navigator.share({
                        files: [file]
                    });
                    // Compartido exitosamente mediante la hoja nativa
                    return;
                } catch (shareErr) {
                    if (shareErr && shareErr.name === 'AbortError') {
                        // El técnico canceló la ventana de compartir; no descargar ni guardar nada
                        return;
                    }
                    console.warn('navigator.share error:', shareErr);
                }
            }
        }

        // 2. Si Web Share no está disponible:
        // Intentar copiar la imagen al portapapeles (sin guardar archivo)
        let copiedImage = false;
        if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.write === 'function' && typeof ClipboardItem !== 'undefined') {
            try {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                copiedImage = true;
            } catch (_) {}
        }

        if (isMobile) {
            // EN CELULAR: REGLA ESTRICTA - NUNCA GUARDAR EN EL DISPOSITIVO
            if (copiedImage) {
                notify('Imagen copiada. Abre WhatsApp para pegarla.', 'ok');
            } else {
                notify('Abre WhatsApp para compartir la imagen.', 'ok');
            }
            setTimeout(() => { try { window.location.href = 'whatsapp://send'; } catch (_) {} }, 350);
            return;
        }

        // 3. Solo en computadora (escritorio) como respaldo si no hay Web Share ni portapapeles:
        if (copiedImage) {
            notify('Imagen copiada al portapapeles (pégala en WhatsApp Web con Ctrl+V).', 'ok');
            setTimeout(() => {
                try { window.open('https://web.whatsapp.com', '_blank'); } catch (_) {}
            }, 350);
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                try { document.body.removeChild(a); } catch (_) {}
                try { URL.revokeObjectURL(url); } catch (_) {}
            }, 1500);
            notify('Imagen descargada para compartir en WhatsApp Web.', 'ok');
            setTimeout(() => {
                try { window.open('https://web.whatsapp.com', '_blank'); } catch (_) {}
            }, 350);
        }
    } finally {
        _technicianShareInProgress = false;
        buttons.forEach(btn => { btn.disabled = false; btn.textContent = btn.dataset.label || 'Enviar por WhatsApp'; });
    }
}

function closeTechnicianAddModal() {
    CM('tech-add-detail-mo');
}

function setTechnicianAddNoPhone() {
    const el = document.getElementById('tech-add-phone');
    if (el) el.value = 'No tiene número';
}

function useCurrentTechnicianCoordinatesForAdd() {
    if (!navigator.geolocation) return notify('Tu dispositivo no soporta geolocalización.', 'err');
    navigator.geolocation.getCurrentPosition(pos => {
        const input = document.getElementById('tech-add-location');
        if (input) input.value = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        notify('Ubicación obtenida con éxito.', 'ok');
    }, err => {
        console.warn('Geolocation error:', err);
        notify('No se pudo obtener tu ubicación GPS.', 'warn');
    }, { enableHighAccuracy: true, timeout: 8000 });
}

function useCurrentTechnicianCoordinatesForEditor() {
    if (!navigator.geolocation) return notify('Tu dispositivo no soporta geolocalización.', 'err');
    navigator.geolocation.getCurrentPosition(pos => {
        const input = document.getElementById('pde-location');
        if (input) input.value = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        notify('Ubicación obtenida con éxito.', 'ok');
    }, err => {
        console.warn('Geolocation error:', err);
        notify('No se pudo obtener tu ubicación GPS.', 'warn');
    }, { enableHighAccuracy: true, timeout: 8000 });
}

function openTechnicianAddDetailModal(stopId) {
    return openTechnicianAddModal(stopId);
}

function openTechnicianAddModal(preselectedStopId) {
    const planStops = typeof getPlanMapStops === 'function' ? getPlanMapStops() : getPlanStopsForView('general');
    const nodes = (state.nodes || []).filter(n => !n.deletedAt);
    const equipment = (state.equipment || []).filter(e => !e.deletedAt);

    let modal = document.getElementById('tech-add-detail-mo');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="mo" id="tech-add-detail-mo">
                <div class="md tech-add-detail-dialog" style="max-width:540px;">
                    <div class="material-modal-head">
                        <div>
                            <div class="mt2">Registrar Detalle en Ruta</div>
                            <small>Agrega un nuevo servicio o cliente a la agenda de hoy.</small>
                        </div>
                        <button type="button" class="btn bsm bgh" onclick="closeTechnicianAddModal()">✕</button>
                    </div>
                    <div class="fi" style="margin-top:10px;">
                        <label>Parada / Pueblo del plan</label>
                        <select id="tech-add-stop" onchange="const cb=document.getElementById('tech-add-custom-target-box');if(cb)cb.style.display=this.value==='__custom__'?'block':'none';"></select>
                    </div>
                    <div class="fi" id="tech-add-custom-target-box" style="display:none;">
                        <label>Pueblo o Antena (búsqueda)</label>
                        <input id="tech-add-target" list="tech-add-target-options" placeholder="Escribe el pueblo o antena...">
                        <datalist id="tech-add-target-options"></datalist>
                    </div>
                    <div class="row2">
                        <div class="fi">
                            <label>Nombre del cliente</label>
                            <input id="tech-add-client" placeholder="Ej. Juan Pérez">
                        </div>
                        <div class="fi">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                <label style="margin:0;">Teléfono</label>
                                <button type="button" class="btn bsm bgh" style="font-size:11px;padding:2px 8px;height:24px;min-height:24px;cursor:pointer;" onclick="setTechnicianAddNoPhone()">No tiene número</button>
                            </div>
                            <input id="tech-add-phone" placeholder="10 dígitos">
                        </div>
                    </div>
                    <div class="fi">
                        <label>Trabajo solicitado</label>
                        <input id="tech-add-work" placeholder="Ej. Reparación de fibra / Alineación">
                    </div>
                    <div class="fi">
                        <label>Ubicación / Coordenadas GPS (opcional)</label>
                        <div class="tech-coordinate-row" style="display:flex;gap:8px;">
                            <input id="tech-add-location" class="mono" placeholder="17.123456, -99.123456 o enlace Maps" style="flex:1;">
                            <button class="btn bgh" type="button" onclick="useCurrentTechnicianCoordinatesForAdd()">Mi ubicación actual</button>
                        </div>
                    </div>
                    <div class="row2">
                        <div class="fi">
                            <label>Tipo de visita</label>
                            <select id="tech-add-type">
                                <option value="instalacion">Instalación</option>
                                <option value="servicio">Servicio / Falla</option>
                                <option value="retiro">Retiro</option>
                                <option value="revision">Revisión</option>
                            </select>
                        </div>
                        <div class="fi">
                            <label>Prioridad</label>
                            <select id="tech-add-priority">
                                <option value="baja">Baja</option>
                                <option value="media" selected>Media</option>
                                <option value="alta">Alta</option>
                                <option value="critica">Crítica</option>
                            </select>
                        </div>
                    </div>
                    <div class="fi">
                        <label>Notas adicionales</label>
                        <textarea id="tech-add-notes" rows="2" placeholder="Detalles extra..."></textarea>
                    </div>
                    <div class="card-actions" style="margin-top:14px;">
                        <button type="button" class="btn bgh" onclick="closeTechnicianAddModal()">Cancelar</button>
                        <button type="button" class="btn bc" onclick="saveTechnicianAddDetail()">💾 Guardar detalle</button>
                    </div>
                </div>
            </div>
        `);
        modal = document.getElementById('tech-add-detail-mo');
        modal.addEventListener('click', event => { if (event.target === modal) closeTechnicianAddModal(); });
    }

    const stopSelect = document.getElementById('tech-add-stop');
    if (stopSelect) {
        let stopOptions = `<option value="">-- Selecciona una parada de la ruta --</option>`;
        planStops.forEach((s, idx) => {
            const isSel = (preselectedStopId && s.id === preselectedStopId) || (idx === 0 && !preselectedStopId);
            const eq = s.equipmentId ? equipment.find(e => e.id === s.equipmentId) : null;
            const node = s.nodeId ? nodes.find(n => n.id === s.nodeId) : null;
            const sName = isTechnicianPlanView() ? getTechnicianStopName(s, eq, node) : (s.name || 'Parada');
            stopOptions += `<option value="${escapeAttr(s.id)}" ${isSel ? 'selected' : ''}>${idx + 1}. ${escapeHtml(sName)}</option>`;
        });
        stopOptions += `<option value="__custom__">➕ Registrar en otro pueblo o antena...</option>`;
        stopSelect.innerHTML = stopOptions;
    }

    const targetDatalist = document.getElementById('tech-add-target-options');
    if (targetDatalist) {
        targetDatalist.innerHTML = equipment.map(item => `<option value="${escapeAttr(item.name || item.ip || 'Antena')}" data-type="equipment" data-id="${escapeAttr(item.id)}">Antena</option>`).concat(nodes.map(item => `<option value="${escapeAttr(getNodeLabel(item))}" data-type="node" data-id="${escapeAttr(item.id)}">Pueblo</option>`)).join('');
    }

    const clientEl = document.getElementById('tech-add-client');
    if (clientEl) clientEl.value = '';
    const phoneEl = document.getElementById('tech-add-phone');
    if (phoneEl) phoneEl.value = '';
    const locEl = document.getElementById('tech-add-location');
    if (locEl) locEl.value = '';
    const workEl = document.getElementById('tech-add-work');
    if (workEl) workEl.value = '';
    const notesEl = document.getElementById('tech-add-notes');
    if (notesEl) notesEl.value = '';
    const typeEl = document.getElementById('tech-add-type');
    if (typeEl) typeEl.value = 'instalacion';
    const prioEl = document.getElementById('tech-add-priority');
    if (prioEl) prioEl.value = 'media';
    const customBox = document.getElementById('tech-add-custom-target-box');
    if (customBox) customBox.style.display = (planStops.length === 0 || stopSelect?.value === '__custom__') ? 'block' : 'none';

    OM('tech-add-detail-mo');
}

async function saveTechnicianAddDetail() {
    const client = document.getElementById('tech-add-client')?.value.trim() || '';
    const phone = document.getElementById('tech-add-phone')?.value.trim() || 'No tiene número';
    const work = document.getElementById('tech-add-work')?.value.trim() || '';
    const notes = document.getElementById('tech-add-notes')?.value.trim() || '';
    const locVal = document.getElementById('tech-add-location')?.value.trim() || '';
    const type = document.getElementById('tech-add-type')?.value || 'instalacion';
    const priority = document.getElementById('tech-add-priority')?.value || 'media';
    const stopId = document.getElementById('tech-add-stop')?.value || '';
    const customTarget = document.getElementById('tech-add-target')?.value.trim() || '';

    if (!work && !client) {
        return notify('Escribe el nombre del cliente o el trabajo solicitado.', 'warn');
    }

    const parsedLoc = parseOptionalLocation(locVal);
    if (!parsedLoc.valid) {
        return notify('La ubicación o coordenadas no son válidas.', 'warn');
    }

    const plan = getSelectedGeneralPlan();
    const planStops = typeof getPlanMapStops === 'function' ? getPlanMapStops() : getPlanStopsForView('general');
    let stop = null;

    if (stopId && stopId !== '__custom__') {
        stop = planStops.find(s => s.id === stopId) || (plan?.stops || []).find(s => s.id === stopId);
    }

    let node = null;
    let eq = null;

    if (!stop && customTarget) {
        const cleanTarget = normalizeName(customTarget);
        eq = (state.equipment || []).find(e => !e.deletedAt && normalizeName(e.name || e.ip) === cleanTarget);
        if (!eq) {
            node = (state.nodes || []).find(n => !n.deletedAt && (normalizeName(n.name) === cleanTarget || normalizeName(n.town) === cleanTarget));
        }
        if (plan) {
            const now = new Date().toISOString();
            const newStop = {
                id: gid('stop'),
                name: eq ? eq.name : (node ? getNodeLabel(node) : customTarget),
                equipmentId: eq ? eq.id : '',
                nodeId: node ? node.id : '',
                equipmentName: eq ? eq.name : '',
                nodeName: node ? getNodeLabel(node) : '',
                town: node?.town || eq?.town || customTarget,
                lat: parsedLoc.lat || safeFloat(eq?.lat ?? node?.lat) || 0,
                lng: parsedLoc.lng || safeFloat(eq?.lng ?? node?.lng) || 0,
                region: node?.zone || eq?.region || '',
                scheduledDate: selectedCalendarDate || localDateKey(),
                detailIds: [],
                details: [],
                createdAt: now
            };
            if (!Array.isArray(plan.stops)) plan.stops = [];
            plan.stops.push(newStop);
            stop = newStop;
        }
    }

    const id = gid('w');
    const actor = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    const now = new Date().toISOString();
    const folio = typeof getNextWorkOrderFolio === 'function'
        ? getNextWorkOrderFolio(type)
        : (typeof getDetailFolio === 'function' ? getDetailFolio({ id, category: type, visitType: type }) : `DET-${String(id).slice(-6)}`);

    let finalLat = parsedLoc.lat || (stop ? safeFloat(stop.lat) : '') || '';
    let finalLng = parsedLoc.lng || (stop ? safeFloat(stop.lng) : '') || '';
    let finalLoc = parsedLoc.location || (stop && stop.lat && stop.lng ? `${Number(stop.lat).toFixed(6)}, ${Number(stop.lng).toFixed(6)}` : '');

    const newOrder = {
        id,
        folio,
        title: work || `Trabajo para ${client || 'cliente'}`,
        desc: notes,
        description: notes,
        clientName: client,
        clientPhone: phone,
        phone,
        telefono: phone,
        equipmentId: eq?.id || stop?.equipmentId || '',
        equipmentName: eq?.name || stop?.equipmentName || '',
        nodeId: node?.id || stop?.nodeId || '',
        nodeName: node ? getNodeLabel(node) : (stop?.nodeName || ''),
        nodeCode: node?.nodeCode || stop?.nodeCode || '',
        town: node?.town || eq?.town || stop?.town || stop?.name || '',
        region: eq?.region || node?.zone || stop?.region || '',
        visitType: type,
        category: type,
        priority,
        technicianId: selectedTechId || actor.id || '',
        technicianName: actor.name || actor.username || 'Técnico',
        detailLocation: finalLoc,
        lat: finalLat,
        lng: finalLng,
        status: 'pendiente',
        detailKind: 'physical',
        createdAt: now,
        createdById: actor.id || '',
        createdByName: actor.name || actor.username || 'Técnico',
        createdByRole: actor.role || 'tecnico',
        updatedAt: now
    };

    if (!Array.isArray(state.workOrders)) state.workOrders = [];
    state.workOrders.push(newOrder);
    setCreatedAudit(newOrder, 'creó detalle desde móvil');

    if (stop) {
        if (!Array.isArray(stop.detailIds)) stop.detailIds = [];
        if (!stop.detailIds.includes(newOrder.id)) stop.detailIds.push(newOrder.id);
        if (!Array.isArray(stop.details)) stop.details = [];
        if (!stop.details.some(d => d.id === newOrder.id)) stop.details.push(newOrder);
        newOrder.stopId = stop.id;
        expandedTechRouteStopIds.add(stop.id);
    }

    let saved = false;
    try {
        if (typeof saveRecord === 'function') {
            saved = await saveRecord('workOrders', newOrder);
        } else if (typeof saveDB === 'function') {
            saved = await saveDB();
        }
    } catch (saveErr) {
        console.warn('save error:', saveErr);
    }
    if (!saved && typeof saveDB === 'function') {
        try { await saveDB(); } catch (_) {}
    }

    closeTechnicianAddModal();
    notify(`Detalle guardado: ${folio}`, 'ok');
    renderPlan();
    renderPlanDays();
    if (isTechnicianPlanView()) {
        setTimeout(renderTechnicianDayMap, 60);
    }
}
function openTechnicianAddMenu() {
    let modal = document.getElementById('tech-add-menu-mo');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `<div class="mo" id="tech-add-menu-mo"><div class="md tech-add-menu-card"><div class="tech-installation-head"><div><div class="mt2">¿Qué deseas agregar?</div><small>Elige una opción:</small></div><button class="btn bsm bgh" onclick="CM('tech-add-menu-mo')">Cerrar</button></div><div class="tech-add-menu-options"><button type="button" onclick="CM('tech-add-menu-mo');openTechnicianInstallationForm('installation')"><svg class="tech-btn-svg" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><strong>Nueva instalación</strong><small>Cliente nuevo que se instaló hoy.</small></button><button type="button" onclick="CM('tech-add-menu-mo');openTechnicianInstallationForm('detail')"><svg class="tech-btn-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg><strong>Trabajo extra</strong><small>Servicio o arreglo hecho en un pueblo de tu ruta.</small></button></div></div></div>`);
        modal = document.getElementById('tech-add-menu-mo');
    }
    setTechnicianNavActive(2);
    OM('tech-add-menu-mo');
}

function openTechnicianInstallationForm(mode = 'installation') {
    technicianNewEntryMode = mode === 'detail' ? 'detail' : 'installation';
    let modal = document.getElementById('tech-installation-mo');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `<div class="mo" id="tech-installation-mo"><div class="md tech-installation-modal"><div class="tech-installation-head"><div><div class="mt2">Nueva instalación</div><small id="tech-installation-day-label">Anota los datos del cliente y sube fotos.</small></div><button class="btn bsm bgh" type="button" onclick="CM('tech-installation-mo')">Cerrar</button></div><div class="row2"><div class="fi"><label>Nombre del cliente</label><input id="tech-install-client" placeholder="Nombre completo"></div><div class="fi"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><label style="margin:0;">Teléfono</label><button type="button" class="btn bsm bgh" style="font-size:11px;padding:2px 8px;height:24px;min-height:24px;cursor:pointer;" onclick="setTechnicianInstallNoPhone()">No tiene número</button></div><input id="tech-install-phone" type="tel" inputmode="tel" placeholder="10 dígitos (o 'No tiene número')"></div></div><div class="fi"><label>Ubicación (coordenadas)</label><input id="tech-install-location" placeholder="Calle, colonia o enlace de Maps"></div><div class="fi"><label>Pueblo</label><input id="tech-install-town" list="tech-install-town-options" placeholder="Selecciona una sugerencia o escribe el pueblo"><datalist id="tech-install-town-options"></datalist><small id="tech-install-town-help">Pueblos de tu ruta de hoy o escribe otro.</small></div><div class="fi"><label>Equipo o notas <span class="optional-label">Opcional</span></label><textarea id="tech-install-detail" rows="3" placeholder="Antena, router, número de contrato o referencias (opcional)..."></textarea></div><div class="tech-evidence-box"><strong>Fotos del trabajo</strong><small>Toma fotos o elígelas de tu celular (máx. 6).</small><div class="tech-evidence-actions"><label class="btn bc">Tomar foto<input type="file" accept="image/*" capture="environment" onchange="addTechnicianInstallationPhotos(this.files);this.value=''" hidden></label><label class="btn bgh">De galería<input type="file" accept="image/*" multiple onchange="addTechnicianInstallationPhotos(this.files);this.value=''" hidden></label></div><div id="tech-install-evidence-preview" class="tech-install-evidence-preview"></div></div><button class="btn bc bfu" type="button" onclick="saveTechnicianInstallation()">Guardar nueva instalación</button></div></div>`);
        modal = document.getElementById('tech-installation-mo');
    }
    const installationPhone = document.getElementById('tech-install-phone');
    const installationPhoneLabel = installationPhone?.closest('.fi')?.querySelector('label');
    if (installationPhoneLabel) installationPhoneLabel.innerHTML = 'Teléfono <span class="optional-label">Opcional</span>';
    if (installationPhone) installationPhone.placeholder = '10 dígitos (o "No tiene número")';
    technicianInstallationPhotos = [];
    technicianInstallationSelectedNodeId = '';
    configureTechnicianInstallationFields();
    configureTechnicianEntryMode();
    ['tech-install-client','tech-install-phone','tech-install-location','tech-install-town','tech-install-detail'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    renderTechnicianInstallationPhotos();
    renderTechnicianInstallationTownOptions();
    const dayLabel = document.getElementById('tech-installation-day-label');
    if (dayLabel) dayLabel.textContent = `Ruta del ${formatCalendarDate(selectedCalendarDate || localDateKey())}. Puedes elegir un pueblo de hoy o escribir otro.`;
    setTechnicianNavActive(2);
    OM('tech-installation-mo');
}

function configureTechnicianEntryMode() {
    const isDetail = technicianNewEntryMode === 'detail';
    const modal = document.getElementById('tech-installation-mo');
    const title = modal?.querySelector('.mt2');
    if (title) title.textContent = isDetail ? 'Trabajo extra' : 'Nueva instalación';
    const submit = modal?.querySelector('button.bfu');
    if (submit) submit.textContent = isDetail ? 'Guardar trabajo' : 'Guardar nueva instalación';
    const descriptionLabel = document.getElementById('tech-install-detail')?.closest('.fi')?.querySelector('label');
    if (descriptionLabel) descriptionLabel.innerHTML = isDetail ? '¿Qué trabajo hiciste?' : 'Equipo o notas <span class="optional-label">Opcional</span>';
    const clientField = document.getElementById('tech-install-client')?.closest('.row2');
    let stopBox = document.getElementById('tech-entry-stop-box');
    if (!stopBox && clientField) {
        clientField.insertAdjacentHTML('beforebegin', '<div class="fi" id="tech-entry-stop-box"><label>Pueblo o parada donde se hizo</label><select id="tech-entry-stop"></select></div>');
        stopBox = document.getElementById('tech-entry-stop-box');
    }
    if (stopBox) stopBox.style.display = isDetail ? 'block' : 'none';
    const select = document.getElementById('tech-entry-stop');
    if (select && isDetail) {
        const stops = getPlanStopsForView('general');
        select.innerHTML = '<option value="">Selecciona una parada</option>' + stops.map(stop => {
            const equipment = stop.equipmentId ? (state.equipment || []).find(item => item.id === stop.equipmentId && !item.deletedAt) : null;
            const node = stop.nodeId ? (state.nodes || []).find(item => item.id === stop.nodeId && !item.deletedAt) : null;
            return `<option value="${escapeAttr(stop.id)}">${escapeHtml(getTechnicianStopName(stop, equipment, node))}</option>`;
        }).join('');
    }
}

function configureTechnicianInstallationFields() {
    const location = document.getElementById('tech-install-location');
    const locationBox = location?.closest('.fi');
    const locationLabel = locationBox?.querySelector('label');
    if (locationLabel) locationLabel.textContent = 'Ubicación (coordenadas)';
    if (location) location.placeholder = 'Ej. 17.529973, -99.496335';
    if (locationBox && !document.getElementById('tech-install-use-location')) {
        location.insertAdjacentElement('afterend', Object.assign(document.createElement('button'), { id:'tech-install-use-location', type:'button', className:'btn bgh tech-install-location-button', textContent:'Mi ubicación actual' }));
        document.getElementById('tech-install-use-location').onclick = useCurrentInstallationCoordinates;
    }
    const town = document.getElementById('tech-install-town');
    if (town) {
        town.removeAttribute('list');
        town.setAttribute('autocomplete', 'off');
        town.oninput = () => {
            technicianInstallationSelectedNodeId = '';
            renderTechnicianTownSuggestions();
        };
        town.onfocus = renderTechnicianTownSuggestions;
        const box = town.closest('.fi');
        if (box && !document.getElementById('tech-install-town-suggestions')) box.insertAdjacentHTML('beforeend', '<div id="tech-install-town-suggestions" class="tech-install-town-suggestions"></div>');
    }
}

function useCurrentInstallationCoordinates() {
    if (!navigator.geolocation) return notify('Este celular no permite obtener la ubicación por GPS.', 'warn');
    const button = document.getElementById('tech-install-use-location');
    if (button) { button.disabled = true; button.textContent = 'Obteniendo ubicación...'; }
    navigator.geolocation.getCurrentPosition(position => {
        const field = document.getElementById('tech-install-location');
        if (field) field.value = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        if (button) { button.disabled = false; button.textContent = 'Ubicación agregada'; }
        notify('Ubicación GPS agregada.', 'ok');
    }, () => {
        if (button) { button.disabled = false; button.textContent = 'Usar mi ubicación'; }
        notify('No se pudo obtener GPS en este momento.', 'warn');
    }, { enableHighAccuracy: false, timeout: 7000, maximumAge: 60000 });
}

function getTechnicianRouteTowns() {
    const values = new Set();
    getPlanStopsForView('general').forEach(stop => {
        const node = stop.nodeId ? (state.nodes || []).find(item => item.id === stop.nodeId && !item.deletedAt) : null;
        [stop.town, stop.nodeName, node?.town, node?.name].filter(Boolean).forEach(value => {
            const clean = String(value).replace(/^\s*R\s*\d+\s*[·:._-]*\s*/i, '').trim();
            if (clean) values.add(clean);
        });
    });
    return [...values].sort((a,b) => a.localeCompare(b, 'es'));
}

function getTechnicianTownSuggestionOptions() {
    const nodes = (state.nodes || []).filter(node => !node.deletedAt);
    const options = [];
    getTechnicianRouteTowns().forEach(town => {
        const matches = nodes.filter(node => normalizeName(node.town || node.name || '') === normalizeName(town));
        if (matches.length) {
            matches.forEach(node => options.push({
                town: String(node.town || town).trim(),
                nodeId: node.id || '',
                label: getNodeLabel(node) || String(node.town || town).trim()
            }));
        } else {
            options.push({town,nodeId:'',label:town});
        }
    });
    return [...new Map(options.map(option => [`${option.nodeId}|${normalizeName(option.town)}`,option])).values()]
        .sort((left,right) => left.label.localeCompare(right.label,'es'));
}

function renderTechnicianTownSuggestions() {
    const field = document.getElementById('tech-install-town');
    const menu = document.getElementById('tech-install-town-suggestions');
    if (!field || !menu) return;
    const query = normalizeName(field.value || '');
    const matches = getTechnicianTownSuggestionOptions().filter(option => !query || normalizeName(`${option.label} ${option.town}`).includes(query)).slice(0, 8);
    menu.innerHTML = matches.map(option => `<button type="button" data-town="${encodeURIComponent(option.town)}" data-node-id="${escapeAttr(option.nodeId)}" onclick="selectTechnicianTown(decodeURIComponent(this.dataset.town),this.dataset.nodeId)">${escapeHtml(option.label)}</button>`).join('');
    menu.classList.toggle('open', matches.length > 0);
}

function selectTechnicianTown(value,nodeId = '') {
    const field = document.getElementById('tech-install-town');
    if (field) field.value = value;
    technicianInstallationSelectedNodeId = nodeId || '';
    document.getElementById('tech-install-town-suggestions')?.classList.remove('open');
}

function renderTechnicianInstallationTownOptions() {
    const date = selectedCalendarDate || localDateKey();
    const values = new Set(getTechnicianRouteTowns());
    getPlanStopsForView('general').filter(stop => stop.scheduledDate === date).forEach(stop => {
        [stop.name, stop.town, stop.nodeName, stop.nodeCode].filter(Boolean).forEach(value => values.add(String(value).trim()));
        const node = stop.nodeId ? (state.nodes || []).find(item => item.id === stop.nodeId && !item.deletedAt) : null;
        [node?.name, node?.town, node?.nodeCode].filter(Boolean).forEach(value => values.add(String(value).trim()));
        getStopDetails(stop).forEach(detail => {
            [detail.town, detail.nodeName, detail.nodeCode].filter(Boolean).forEach(value => values.add(String(value).trim()));
        });
    });
    const list = document.getElementById('tech-install-town-options');
    if (list) list.innerHTML = [...values].sort((a,b) => a.localeCompare(b,'es')).map(value => `<option value="${escapeAttr(value)}"></option>`).join('');
    const help = document.getElementById('tech-install-town-help');
    if (help) help.textContent = values.size ? `${values.size} pueblo${values.size === 1 ? '' : 's'} sugerido${values.size === 1 ? '' : 's'} para este día. También puedes escribir otro.` : 'Este día no tiene pueblos sugeridos; escribe la localidad manualmente.';
}

async function addTechnicianInstallationPhotos(fileList) {
    const files = Array.from(fileList || []).filter(file => /^image\//i.test(file.type));
    const available = Math.max(0, 6 - technicianInstallationPhotos.length);
    if (!available) return notify('Puedes agregar máximo 6 fotografías.', 'err');
    for (const file of files.slice(0, available)) {
        try { technicianInstallationPhotos.push(await compressTechnicianPhoto(file)); }
        catch (error) { notify(`No se pudo leer ${file.name || 'una foto'}.`, 'err'); }
    }
    if (files.length > available) notify('Sólo se agregaron las primeras 6 fotografías.', 'err');
    renderTechnicianInstallationPhotos();
}

async function compressTechnicianPhoto(file) {
    if (!file) return '';
    try {
        if (typeof optimizeImageForUpload === 'function') {
            const opt = await optimizeImageForUpload(file, { maxSide: 1200, targetBytes: 300 * 1024 });
            if (opt) return opt;
        }
    } catch (e) {
        console.warn('optimizeImageForUpload error:', e);
    }
    return new Promise(resolve => {
        try {
            const reader = new FileReader();
            reader.onerror = () => resolve('');
            reader.onload = () => {
                const dataUrl = reader.result;
                const image = new Image();
                image.onerror = () => resolve(typeof dataUrl === 'string' ? dataUrl : '');
                image.onload = () => {
                    try {
                        const max = 1200;
                        const scale = Math.min(1, max / Math.max(image.width || 1, image.height || 1));
                        const canvas = document.createElement('canvas');
                        canvas.width = Math.max(1, Math.round(image.width * scale));
                        canvas.height = Math.max(1, Math.round(image.height * scale));
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                            resolve(canvas.toDataURL('image/jpeg', 0.72));
                            return;
                        }
                    } catch (canvasErr) {
                        console.warn('Canvas draw error:', canvasErr);
                    }
                    resolve(typeof dataUrl === 'string' ? dataUrl : '');
                };
                image.src = dataUrl;
            };
            reader.readAsDataURL(file);
        } catch (readErr) {
            console.warn('FileReader error:', readErr);
            resolve('');
        }
    });
}

function renderTechnicianInstallationPhotos() {
    const box = document.getElementById('tech-install-evidence-preview');
    if (!box) return;
    box.innerHTML = technicianInstallationPhotos.length
        ? technicianInstallationPhotos.map((photo, index) => `<div><img src="${photo}" alt="Evidencia ${index + 1}"><button type="button" onclick="removeTechnicianInstallationPhoto(${index})" aria-label="Eliminar foto">×</button></div>`).join('')
        : '<span>Sin fotografías agregadas.</span>';
}

async function removeTechnicianInstallationPhoto(index) {
    const ok = (typeof askConfirmation === 'function')
        ? await askConfirmation({
            title: 'Quitar foto',
            message: '¿Deseas quitar esta foto de evidencia?',
            confirmText: 'Quitar foto',
            cancelText: 'Cancelar',
            tone: 'danger'
        })
        : true;
    if (!ok) return;
    technicianInstallationPhotos.splice(index, 1);
    renderTechnicianInstallationPhotos();
}

async function saveTechnicianInstallation() {
    const isDetail = technicianNewEntryMode === 'detail';
    const stopId = document.getElementById('tech-entry-stop')?.value || '';
    const selectedStop = isDetail ? getPlanStopsForView('general').find(stop => stop.id === stopId) : null;
    const clientName = document.getElementById('tech-install-client')?.value.trim() || '';
    const phone = document.getElementById('tech-install-phone')?.value.trim() || '';
    let detailLocation = document.getElementById('tech-install-location')?.value.trim() || '';
    const enteredTown = document.getElementById('tech-install-town')?.value.trim() || '';
    const description = document.getElementById('tech-install-detail')?.value.trim() || '';
    const selectedNode = selectedStop?.nodeId ? (state.nodes || []).find(item => item.id === selectedStop.nodeId && !item.deletedAt) : null;
    const town = enteredTown || selectedNode?.town || selectedStop?.town || selectedStop?.name || '';
    if (isDetail && !selectedStop) return notify('Elige el pueblo donde hiciste el trabajo.', 'err');
    if (isDetail && !description) return notify('Escribe qué trabajo hiciste.', 'err');
    const rawInstallPhone = phone.replace(/\D/g, '');
    const finalInstallPhone = (!phone || !rawInstallPhone || (rawInstallPhone.length < 10 && rawInstallPhone !== '0000000000'))
        ? (phone || 'No tiene número')
        : phone;

    if (!detailLocation && selectedStop && selectedStop.lat && selectedStop.lng) {
        detailLocation = `${Number(selectedStop.lat).toFixed(6)}, ${Number(selectedStop.lng).toFixed(6)}`;
    }
    const parsedLocation = typeof parseOptionalLocation === 'function' ? parseOptionalLocation(detailLocation) : {};

    if (!clientName || !town || !technicianInstallationPhotos.length) {
        notify('Completa nombre, pueblo y agrega al menos una foto.', 'warn');
        return;
    }
    const confirmTitle = isDetail ? '¿Guardar detalle terminado?' : '¿Registrar nueva instalación?';
    const confirmMessage = isDetail
        ? `¿Confirmas registrar y terminar este trabajo en ${town}?`
        : `¿Confirmas registrar esta nueva instalación para ${clientName} en ${town}?`;
    const confirmed = (typeof askConfirmation === 'function')
        ? await askConfirmation({
            title: confirmTitle,
            message: confirmMessage,
            confirmText: isDetail ? 'Guardar y terminar' : 'Registrar instalación',
            cancelText: 'Revisar',
            tone: 'ok'
        })
        : true;
    if (!confirmed) return;

    const technicianId = getLoggedTechnicianId();
    const createdAt = new Date().toISOString();
    const matchingTownNodes = (state.nodes || []).filter(node => !node.deletedAt && normalizeName(node.town || node.name || '') === normalizeName(town));
    const installationNode = isDetail ? null : ((state.nodes || []).find(node => node.id === technicianInstallationSelectedNodeId && !node.deletedAt) || (matchingTownNodes.length === 1 ? matchingTownNodes[0] : null));
    const order = {
        id: gid('wo'),
        clientName,
        detailLocation,
        town,
        title: isDetail ? description : 'Nueva instalación',
        category: isDetail ? 'otro' : 'instalacion',
        description: `${finalInstallPhone ? `Teléfono: ${finalInstallPhone}` : ''}${finalInstallPhone && description ? '\n' : ''}${description}`,
        clientPhone: finalInstallPhone,
        visitType: isDetail ? 'detalle' : 'presencial',
        priority: 'media',
        status: 'completada',
        completedAt: createdAt,
        equipmentId: isDetail ? (selectedStop?.equipmentId || '') : '',
        nodeId: isDetail ? (selectedStop?.nodeId || '') : '',
        nodeCode: isDetail ? (selectedNode?.nodeCode || '') : (installationNode?.nodeCode || installationNode?.code || ''),
        equipmentName: isDetail && selectedStop?.equipmentId ? ((state.equipment || []).find(item => item.id === selectedStop.equipmentId)?.name || selectedStop.name || '') : '',
        nodeName: isDetail && selectedStop?.nodeId ? (selectedNode?.town || selectedStop.name || '') : (installationNode?.town || installationNode?.name || ''),
        technicianId,
        lat: parsedLocation.lat || (selectedStop?.lat || ''),
        lng: parsedLocation.lng || (selectedStop?.lng || ''),
        requestedDate: selectedCalendarDate || localDateKey(),
        createdAt,
        technicianReport: {
            result: isDetail ? 'terminado' : 'solicitud_instalacion',
            solution: description,
            phone: finalInstallPhone,
            location: detailLocation || 'Sin ubicación registrada',
            town,
            completedByName: getCurrentUser()?.name || getCurrentUser()?.username || 'Técnico',
            completedAt: createdAt,
            evidencePhotos: technicianInstallationPhotos.slice()
        }
    };
    order.folio = getDetailFolio(order);
    setCreatedAudit(order, isDetail ? 'agregó detalle completado en parada' : 'registró nueva instalación');
    if (!Array.isArray(state.workOrders)) state.workOrders = [];
    state.workOrders.push(order);
    if (isDetail && selectedStop && !(selectedStop.detailIds || []).includes(order.id)) selectedStop.detailIds = [...(selectedStop.detailIds || []), order.id];
    let saved = false;
    try {
        saved = isDetail ? await saveDB() : await saveRecord('workOrders', order);
    } catch (saveErr) {
        console.warn('save error:', saveErr);
    }
    if (!saved) {
        if (typeof saveDB === 'function') {
            try { await saveDB(); } catch (_) {}
        }
        notify('Guardado localmente (sin conexión a internet). Se sincronizará al tener señal.', 'warn');
    }
    CM('tech-installation-mo');
    technicianInstallationPhotos = [];
    window._currentTechnicianCompletionDetail = order;
    window._lastReportedDetail = order;
    if (isDetail) {
        renderPlan();
        const isTech = isTechnicianPlanView() || (typeof userHasRole === 'function' && userHasRole('tecnico'));
        const towerAntenna = (isTech && typeof findAntennaForDetail === 'function') ? findAntennaForDetail(order, selectedStop) : null;
        let promptedTowerModal = false;
        if (towerAntenna) {
            const hasMat = typeof hasTowerMaterial === 'function' ? hasTowerMaterial(towerAntenna) : false;
            const promptedRecently = typeof wasTowerMaterialPromptedRecently === 'function' && wasTowerMaterialPromptedRecently(towerAntenna.id);
            if (!hasMat) {
                if (typeof openTowerMaterialModal === 'function') {
                    openTowerMaterialModal(towerAntenna.id, {
                        completionDetail: order,
                        fromCompletion: true,
                        mandatory: true,
                        detailTitle: order.title || order.clientName || 'Trabajo en torre'
                    });
                    promptedTowerModal = true;
                }
            } else if (!promptedRecently) {
                if (typeof openTowerMaterialModal === 'function') {
                    openTowerMaterialModal(towerAntenna.id, {
                        completionDetail: order,
                        fromCompletion: true,
                        mandatory: false,
                        canContinue: true,
                        detailTitle: order.title || order.clientName || 'Trabajo en torre'
                    });
                    promptedTowerModal = true;
                }
            }
        }
        if (!promptedTowerModal) {
            openTechnicianCompletionSummary(order);
        }
    } else {
        openTechnicianInstallationSummary(order);
    }
}

function openTechnicianInstallationSummary(order) {
    if (!order) order = window._currentTechnicianCompletionDetail || window._lastReportedDetail;
    if (!order) return;
    window._currentTechnicianCompletionDetail = order;
    window._lastReportedDetail = order;
    if (typeof prepareTechnicianSummaryFile === 'function') {
        setTimeout(() => { prepareTechnicianSummaryFile(order).catch(() => {}); }, 0);
    }
    const report = order.technicianReport || {};
    const photos = getAdminTechReportPhotos(report);
    let modal = document.getElementById('tech-installation-summary-mo');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', '<div class="mo tech-completion-summary-mo" id="tech-installation-summary-mo"><div class="tech-completion-summary-card" id="tech-installation-summary-card"></div></div>');
        modal = document.getElementById('tech-installation-summary-mo');
    }
    const card = document.getElementById('tech-installation-summary-card');
    card.innerHTML = `<div class="tech-summary-report-head"><span class="tech-summary-report-check">✓</span><div><small>NUEVA ORDEN REGISTRADA</small><h2>Nueva instalación</h2></div></div>
        <div class="tech-install-summary-folio"><small>Folio de orden</small><strong>${escapeHtml(getDetailFolio(order))}</strong></div>
        <div class="tech-summary-report-grid"><div><small>Técnico</small><strong>${escapeHtml(report.completedByName || 'Técnico')}</strong></div><div><small>Fecha y hora</small><strong>${escapeHtml(new Date(order.createdAt).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'}))}</strong></div><div><small>Cliente</small><strong>${escapeHtml(order.clientName || 'Sin nombre')}</strong></div><div><small>Teléfono</small><strong>${escapeHtml(order.clientPhone || 'Sin teléfono')}</strong></div><div><small>Pueblo</small><strong>${escapeHtml(order.town || 'Sin pueblo')}</strong></div><div><small>Ubicación</small><strong>${escapeHtml(order.detailLocation || 'Sin ubicación')}</strong></div></div>
        <div class="tech-summary-report-detail"><small>Equipo o notas</small><strong>${escapeHtml(report.solution || 'Sin observaciones adicionales')}</strong></div>
        ${photos.length ? `<div class="tech-summary-report-photos">${photos.slice(0,4).map((photo,index) => `<img src="${escapeAttr(photo)}" alt="Evidencia ${index + 1}">`).join('')}</div>` : ''}
        <div class="tech-summary-report-footer"><span>Listo, quedó registrada en el sistema.</span><div><button type="button" class="btn bgh" onclick="copyTechnicianOrderNumber('${escapeAttr(order.id)}')">Copiar folio</button><button type="button" class="btn tech-whatsapp-share" onclick="shareTechnicianCompletion('${escapeAttr(order.id)}')">Enviar por WhatsApp</button><button type="button" class="btn bgh" onclick="CM('tech-installation-summary-mo')">Cerrar</button></div></div>`;
    OM('tech-installation-summary-mo');
}

function escapeHtml(value) {
    const clean = typeof repairDisplayText === 'function' ? repairDisplayText(value) : String(value ?? '');
    return clean.replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[ch]));
}

function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
}

function renderDetailLocation(value) {
    const loc = getLocationDisplay(value || '');
    if (loc.url || loc.hasLocation) {
        return `<div class="tech-detail-location-badge has-gps"><svg class="tech-gps-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg><strong>Con ubicación GPS:</strong> <a class="order-location-link" href="${escapeAttr(loc.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Abrir Maps</a><span class="order-location-muted">${escapeHtml(loc.label)}</span></div>`;
    }
    return `<div class="tech-detail-location-badge no-gps"><svg class="tech-gps-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/><line x1="2" y1="2" x2="22" y2="22"/></svg><span class="order-location-muted no-location">${escapeHtml(loc.label || 'Sin ubicación registrada')}</span></div>`;
}

function openEditStopModal(techId, day, stopId) {
    const stop = getPlanStopsRef(techId, day).find(s => s.id === stopId && !s.deletedAt);
    if (!stop) return;

    editingStopContext = { originalTechId: techId, originalDay: day, stopId };
    document.getElementById('edit-stop-sub').textContent = `${getSelectedTechLabel(techId)} · ${dayLabel(day)}`;
    document.getElementById('edit-stop-name').value = stop.name || '';
    document.getElementById('edit-stop-notes').value = stop.notes || '';
    const editMaterial = document.getElementById('edit-stop-material');
    if (editMaterial) editMaterial.value = stop.materialPlanned || '';
    document.getElementById('edit-stop-day').value = day;
    document.getElementById('new-detail-title').value = '';
    const newClient = document.getElementById('new-detail-client');
    if (newClient) newClient.value = '';
    const newPhone = document.getElementById('new-detail-phone');
    if (newPhone) newPhone.value = '';
    const newMat = document.getElementById('new-detail-material');
    if (newMat) newMat.value = '';

    const techOptions = [`<option value="${SHARED_PLAN_ID}">Plan general compartido</option>`]
        .concat((state.technicians || []).filter(t => !t.deletedAt).map(t => `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`));
    document.getElementById('edit-stop-tech').innerHTML = techOptions.join('');
    document.getElementById('edit-stop-tech').value = techId;

    renderEditableDetails(stop);
    OM('plan-edit-mo');
}

function getSelectedTechLabel(techId) {
    if (techId === SHARED_PLAN_ID) return 'Plan general compartido';
    return (state.technicians || []).find(t => t.id === techId && !t.deletedAt)?.nombre || 'Tecnico';
}

function renderEditableDetails(stop) {
    const box = document.getElementById('edit-stop-details');
    const details = getStopDetails(stop);
    if (!details.length) {
        box.innerHTML = '<div class="plan-empty">Esta parada no tiene detalles ligados. Puedes agregar uno nuevo abajo.</div>';
        return;
    }

    box.innerHTML = details.map(detail => `
        <div class="linked-detail" data-detail-id="${detail.id}">
            <div class="linked-detail-head">
                <span class="linked-detail-priority" style="color:${pc(detail.priority)}">${pl(detail.priority)}</span>
                <div class="linked-detail-actions">
                    <span class="badge ${detail.status === 'completada' ? 'bg2' : 'bty'}">${detail.status === 'completada' ? 'Hecho' : 'Pendiente'}</span>
                    ${detail.status === 'completada' ? '' : `<button class="btn bsm bg2" onclick="toggleLinkedDetailStatus('${detail.id}')">Hecho</button>`}
                    <button class="btn bsm br" onclick="removeLinkedDetail('${detail.id}')">Eliminar detalle</button>
                </div>
            </div>
            ${renderAdminTechReport(detail)}
            <div class="linked-detail-grid">
                <div class="linked-detail-field">
                    <label>Cliente</label>
                    <input class="edit-detail-client" value="${escapeHtml(detail.clientName || '')}" placeholder="Nombre del cliente">
                </div>
                <div class="linked-detail-field">
                    <label>Titulo</label>
                    <textarea rows="3" class="edit-detail-title">${escapeHtml(detail.title || '')}</textarea>
                </div>
                <div class="linked-detail-field">
                    <label>Descripcion</label>
                    <textarea rows="3" class="edit-detail-desc">${escapeHtml(detail.desc || '')}</textarea>
                </div>
                <div class="linked-detail-field">
                    <label>Ubicacion del detalle (opcional)</label>
                    <input class="edit-detail-location mono" value="${escapeHtml(detail.detailLocation || '')}" placeholder="18.09563, -99.19604">
                </div>
            </div>
        </div>
    `).join('');
}

function removeLinkedDetail(detailId) {
    const stop = getEditingStop();
    if (!stop) return;
    stop.detailIds = (stop.detailIds || []).filter(id => id !== detailId);
    const detail = (state.workOrders || []).find(w => w.id === detailId && !w.deletedAt);
    if (detail) {
        detail.deletedAt = new Date().toISOString();
        detail.status = 'eliminada';
    }
    syncStopCompletion(stop);
    renderEditableDetails(stop);
}

function toggleLinkedDetailStatus(detailId) {
    const detail = (state.workOrders || []).find(w => w.id === detailId && !w.deletedAt);
    if (!detail) return;
    detail.status = detail.status === 'completada' ? 'pendiente' : 'completada';
    detail.completedAt = detail.status === 'completada' ? new Date().toISOString() : '';
    setUpdatedAudit(detail, detail.status === 'completada' ? 'marcó detalle hecho' : 'restableció detalle');
    const stop = getEditingStop();
    if (!stop) return;
    syncStopCompletion(stop);
    stop.updatedAt = new Date().toISOString();
    renderEditableDetails(stop);
}

async function togglePlanDetailStatus(detailId) {
    const detail = (state.workOrders || []).find(w => w.id === detailId && !w.deletedAt);
    if (!detail) return;
    if (detail.status !== 'completada' && userHasRole('administrador', 'admin', 'soporte', 'atencion_clientes')) {
        openAdminDetailCompletion(detail, async completion => {
            if (completion.withInformation) {
                detail.clientName = completion.clientName;
                detail.clientPhone = completion.clientPhone;
                detail.detailLocation = completion.detailLocation;
                detail.technicianReport = completion.technicianReport;
            }
            detail.status = 'completada';
            detail.completedAt = new Date().toISOString();
            setUpdatedAudit(detail, completion.withInformation ? 'completó detalle del plan con información' : 'marcó listo detalle del plan');
            getPlanMapStops().forEach(stop => {
                if ((stop.detailIds || []).includes(detailId) || (stop.equipmentId && stop.equipmentId === detail.equipmentId)) {
                    syncStopCompletion(stop);
                    stop.updatedAt = new Date().toISOString();
                }
            });
            const saved = await saveDB();
            if (!saved) {
                notify('No se pudo guardar en la nube. Intenta de nuevo.', 'err');
                return false;
            }
            renderPlan();
            notify(completion.withInformation ? 'Información guardada y detalle completado' : 'Detalle marcado como hecho');
            const towerAnt = typeof findAntennaForDetail === 'function' ? findAntennaForDetail(detail) : null;
            if (towerAnt) {
                notify('Detalle completado. Recuerda verificar o registrar el material de la torre.', 'ok', 6000);
            }
            return true;
        });
        return;
    }
    detail.status = detail.status === 'completada' ? 'pendiente' : 'completada';
    detail.completedAt = detail.status === 'completada' ? new Date().toISOString() : '';
    setUpdatedAudit(detail, detail.status === 'completada' ? 'marcó detalle hecho' : 'restableció detalle');
    getPlanMapStops().forEach(stop => {
        if ((stop.detailIds || []).includes(detailId) || (stop.equipmentId && stop.equipmentId === detail.equipmentId)) {
            syncStopCompletion(stop);
            stop.updatedAt = new Date().toISOString();
        }
    });
    const saved = await saveDB();
    if (!saved) {
        notify('No se pudo guardar en la nube. Intenta de nuevo.', 'err');
        return;
    }
    renderPlan();
    notify(detail.status === 'completada' ? 'Detalle marcado como hecho' : 'Detalle restablecido');
    if (detail.status === 'completada') {
        const towerAnt = typeof findAntennaForDetail === 'function' ? findAntennaForDetail(detail) : null;
        if (towerAnt) {
            notify('Detalle completado. Recuerda verificar o registrar el material de la torre.', 'ok', 6000);
        }
    }
}

async function deletePlanDetailFromStop(stopId, day, detailId) {
    const detail = (state.workOrders || []).find(w => w.id === detailId && !w.deletedAt);
    if (!detail) return;
    const confirmed = await askConfirmation({ title:'Eliminar detalle', message:'Este detalle se quitará de la parada.', confirmText:'Eliminar', cancelText:'Cancelar', tone:'danger' });
    if (!confirmed) return;
    detail.deletedAt = new Date().toISOString();
    detail.status = 'eliminada';
    const stop = getPlanStopsRef(selectedTechId, day).find(item => item.id === stopId && !item.deletedAt);
    if (stop) {
        stop.detailIds = (stop.detailIds || []).filter(id => id !== detailId);
        syncStopCompletion(stop);
    }
    await saveDB();
    renderPlan();
    notify('Detalle eliminado');
}

function syncStopCompletion(stop) {
    if (!stop) return;
    const progress = getStopProgress(stop);
    stop.siteStatus = progress.pending === 0 ? 'hecho' : (stop.startedAt ? 'en_proceso' : 'pendiente');
    if (progress.pending > 0) {
        delete stop.adminReleasedAt;
        delete stop.adminReleasedBy;
    }
}

async function toggleStopCompletion(techId, day, stopId) {
    const stop = getPlanStopsRef(techId, day).find(item => item.id === stopId && !item.deletedAt);
    if (!stop) return;

    const markDone = !getStopProgress(stop).complete;
    stop.siteStatus = markDone ? 'hecho' : 'pendiente';
    stop.updatedAt = new Date().toISOString();
    if (!markDone) {
        delete stop.adminReleasedAt;
        delete stop.adminReleasedBy;
    }
    getStopDetails(stop).forEach(detail => {
        detail.status = markDone ? 'completada' : 'pendiente';
        detail.completedAt = markDone ? new Date().toISOString() : '';
        setUpdatedAudit(detail, markDone ? 'marcó detalle hecho' : 'restableció detalle');
    });
    const saved = await saveDB();
    if (!saved) {
        notify('No se pudo guardar en la nube. Intenta de nuevo.', 'err');
        return;
    }
    renderPlan();
    notify(markDone ? 'Sitio marcado como hecho' : 'Sitio marcado como pendiente');
}

async function releaseStopFromAdmin(techId, day, stopId) {
    const stop = getPlanStopsRef(techId, day).find(item => item.id === stopId && !item.deletedAt);
    if (!stop) return;
    const progress = getStopProgress(stop);
    if (!progress.complete) {
        notify('Primero marca listos todos los detalles', 'err');
        return;
    }
    stop.adminReleasedAt = new Date().toISOString();
    stop.adminReleasedBy = 'admin';
    stop.siteStatus = 'hecho';
    stop.updatedAt = new Date().toISOString();
    setDeletedAudit(stop, 'dio salida y retiro parada del plan');
    expandedResolvedStops.delete(stop.id);
    const saved = await saveDB();
    if (!saved) {
        notify('No se pudo guardar en la nube. Intenta de nuevo.', 'err');
        return;
    }
    renderPlan();
    notify('Salida dada. La parada salio del plan y su historial quedo guardado.');
}

function getEditingStop() {
    if (!editingStopContext) return null;
    return getPlanStopsRef(editingStopContext.originalTechId, editingStopContext.originalDay)
        .find(s => s.id === editingStopContext.stopId && !s.deletedAt) || null;
}

function saveStopEdits() {
    const stop = getEditingStop();
    if (!stop || !editingStopContext) return;
    const locationInputs = Array.from(document.querySelectorAll('#edit-stop-details .edit-detail-location'));
    const invalidLocation = locationInputs.find(input => {
        const raw = input.value.trim();
        return raw && !parseOptionalLocation(raw).valid;
    });
    const newLocationInput = document.getElementById('new-detail-location');
    const newLocationInvalid = newLocationInput?.value.trim() && !parseOptionalLocation(newLocationInput.value).valid;
    if (invalidLocation || newLocationInvalid) {
        const input = invalidLocation || newLocationInput;
        input?.focus();
        notify('Ubicacion invalida. Usa: 17.273400 -98.788000', 'err');
        return;
    }

    stop.name = document.getElementById('edit-stop-name').value.trim() || stop.name;
    stop.notes = document.getElementById('edit-stop-notes').value.trim();
    stop.materialPlanned = document.getElementById('edit-stop-material')?.value.trim() || '';

    document.querySelectorAll('#edit-stop-details .linked-detail').forEach(node => {
        const detailId = node.getAttribute('data-detail-id');
        const detail = (state.workOrders || []).find(w => w.id === detailId && !w.deletedAt);
        if (!detail) return;
        detail.clientName = node.querySelector('.edit-detail-client')?.value.trim() || '';
        detail.title = node.querySelector('.edit-detail-title').value.trim() || detail.title;
        detail.desc = node.querySelector('.edit-detail-desc').value.trim();
        const detailLocation = parseOptionalLocation(node.querySelector('.edit-detail-location')?.value);
        detail.detailLocation = detailLocation.location;
        detail.lat = detailLocation.lat;
        detail.lng = detailLocation.lng;
    });

    const newTitle = document.getElementById('new-detail-title').value.trim();
    if (newTitle) {
        const detailLocation = parseOptionalLocation(document.getElementById('new-detail-location')?.value);
        const detailId = createWorkOrderForStop({
            title: newTitle,
            clientName: document.getElementById('new-detail-client')?.value.trim() || '',
            clientPhone: document.getElementById('new-detail-phone')?.value.trim() || '',
            equipmentId: stop.equipmentId || '',
            nodeId: stop.nodeId || '',
            region: getStopRegion(stop),
            visitType: document.getElementById('new-detail-type').value,
            priority: document.getElementById('new-detail-priority').value,
            materialPlanned: document.getElementById('new-detail-material')?.value.trim() || stop.materialPlanned || '',
            locationName: stop.type === 'manual' ? stop.name : '',
            ...detailLocation
        });
        stop.detailIds = [...(stop.detailIds || []), detailId];
    }

    syncStopCompletion(stop);

    const targetTechId = document.getElementById('edit-stop-tech').value;
    const targetDay = document.getElementById('edit-stop-day').value;
    setCreatedAudit(stop, 'agregó parada al plan');
    ensureTechPlan(targetTechId);

    if (targetTechId !== editingStopContext.originalTechId || targetDay !== editingStopContext.originalDay) {
        const movedStop = { ...stop };
        delete movedStop.deletedAt;
        stop.deletedAt = new Date().toISOString();

        if (targetTechId === SHARED_PLAN_ID && targetDay === 'general') {
            getPlanStopsRef(SHARED_PLAN_ID, 'general').push(movedStop);
        } else {
            getPlanStopsRef(targetTechId, targetDay).push(movedStop);
        }
        editingStopContext.originalTechId = targetTechId;
        editingStopContext.originalDay = targetDay;
        selectedTechId = targetTechId;
        selectedDay = targetDay;
        document.getElementById('plan-tech').value = targetTechId;
        document.getElementById('plan-day').value = targetDay;
    }

    saveDB();
    renderPlan();
    CM('plan-edit-mo');
    editingStopContext = null;
    notify('Parada actualizada');
}

function getPlanTechRouteLink() {
    return new URL('planificar.html', location.href).href;
}

function openPlanTechQR() {
    currentPlanTechRouteLink = getPlanTechRouteLink();
    if (!currentPlanTechRouteLink) {
        notify('El QR solo se genera desde tu dominio publicado, no desde archivo local', 'err');
        return;
    }
    const tech = getSelectedTech();
    const assigned = selectedTechId === SHARED_PLAN_ID ? getGeneralPlanAssignedTech() : null;
    const label = selectedTechId === SHARED_PLAN_ID
        ? (assigned ? `Plan general asignado a ${assigned.nombre}` : 'Plan general compartido')
        : (tech?.nombre || 'Tecnico');
    const sub = document.getElementById('plan-tech-qr-sub');
    const input = document.getElementById('plan-tech-route-link');
    const img = document.getElementById('plan-tech-qr-img');
    if (sub) sub.textContent = label;
    if (input) input.value = currentPlanTechRouteLink;
    if (img) img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(currentPlanTechRouteLink)}`;
    OM('plan-tech-qr-mo');
}

function openPlanTechRouteLink() {
    if (currentPlanTechRouteLink) window.open(currentPlanTechRouteLink, '_blank');
}

function copyPlanTechRouteLink() {
    const input = document.getElementById('plan-tech-route-link');
    if (!input) return;
    input.select();
    document.execCommand('copy');
    notify('Link copiado');
}

if (typeof window !== 'undefined') {
    window.scrollWeekBoard = scrollWeekBoard;
    window.setupWeekBoardWheelScroll = setupWeekBoardWheelScroll;
    window.openRegisterStopAsNodeModal = openRegisterStopAsNodeModal;
    window.saveNewNodeFromStop = saveNewNodeFromStop;
    window.deleteStop = deleteStop;
    window.buildTechnicianWhatsAppMessage = buildTechnicianWhatsAppMessage;
    window.shareTechnicianCompletion = shareTechnicianCompletion;
    window.copyTechnicianOrderNumber = copyTechnicianOrderNumber;
    window.openTechnicianCompletionSummary = openTechnicianCompletionSummary;
    window.openTechnicianInstallationSummary = openTechnicianInstallationSummary;
    window.findTechnicianCompletionDetail = findTechnicianCompletionDetail;
}

function renderDetailLocation(value) {
    const loc = typeof getLocationDisplay === 'function' ? getLocationDisplay(value || '') : (typeof getDetailLocationInfo === 'function' ? getDetailLocationInfo(value || '') : { url: '', hasLocation: false, label: value || '' });
    if (loc.url || loc.hasLocation) {
        return `<div class="tech-detail-location-badge has-gps"><svg class="tech-gps-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg><strong>Con ubicación GPS:</strong> <a class="order-location-link" href="${escapeAttr(loc.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Abrir Maps</a><span class="order-location-muted">${escapeHtml(loc.label)}</span></div>`;
    }
    return `<div class="tech-detail-location-badge no-gps"><svg class="tech-gps-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/><line x1="2" y1="2" x2="22" y2="22"/></svg><span class="order-location-muted no-location">${escapeHtml(loc.label || 'Sin ubicación registrada')}</span></div>`;
}

function refreshTechnicianDayMap() {
    if (technicianDayMap) {
        technicianDayMap.remove();
        technicianDayMap = null;
    }
    renderTechnicianDayMap();
}

function toggleTechLocationsSheet() {
    const sheet = document.getElementById('tech-locations-sheet');
    const btn = document.getElementById('tech-toggle-sheet-btn');
    if (!sheet) return;
    if (sheet.style.display === 'none' || !sheet.style.display) {
        renderTechLocationsSheet();
        sheet.style.display = 'block';
        if (btn) btn.textContent = 'Ocultar paradas';
    } else {
        sheet.style.display = 'none';
        if (btn) btn.textContent = 'Ver paradas';
    }
}

function renderTechLocationsSheet() {
    const sheet = document.getElementById('tech-locations-sheet');
    if (!sheet) return;
    const date = selectedCalendarDate || (typeof localDateKey === 'function' ? localDateKey() : new Date().toISOString().slice(0, 10));
    const stops = getPlanMapStops().filter(s => !s.deletedAt && (s.scheduledDate === date || (!s.scheduledDate && date === localDateKey())));
    if (!stops.length) {
        sheet.innerHTML = '<p style="color:#64748b;font-size:12px;margin:0;">No hay paradas programadas para hoy.</p>';
        return;
    }
    sheet.innerHTML = `<div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:8px;">Paradas de la ruta (${stops.length})</div>` +
        stops.map((s, idx) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e2e8f0;font-size:12px;">
                <span><b>${idx + 1}.</b> ${escapeHtml(s.name || 'Parada')}</span>
                <span style="color:#64748b;font-size:11px;">${(s.detailIds || []).length} detalles</span>
            </div>
        `).join('');
}

if (typeof window !== 'undefined') {
    window.scrollWeekBoard = scrollWeekBoard;
    window.setupWeekBoardWheelScroll = setupWeekBoardWheelScroll;
    window.openRegisterStopAsNodeModal = openRegisterStopAsNodeModal;
    window.saveNewNodeFromStop = saveNewNodeFromStop;
    window.deleteStop = deleteStop;
    window.buildTechnicianWhatsAppMessage = buildTechnicianWhatsAppMessage;
    window.shareTechnicianCompletion = shareTechnicianCompletion;
    window.copyTechnicianOrderNumber = copyTechnicianOrderNumber;
    window.openTechnicianCompletionSummary = openTechnicianCompletionSummary;
    window.openTechnicianInstallationSummary = openTechnicianInstallationSummary;
    window.findTechnicianCompletionDetail = findTechnicianCompletionDetail;
    window.prepareTechnicianSummaryFile = prepareTechnicianSummaryFile;
    window.getTechnicianSummaryCacheKey = getTechnicianSummaryCacheKey;
    window.getTechnicianSummaryMode = getTechnicianSummaryMode;
    window.setTechnicianAddNoPhone = setTechnicianAddNoPhone;
    window.useCurrentTechnicianCoordinatesForAdd = useCurrentTechnicianCoordinatesForAdd;
    window.useCurrentTechnicianCoordinatesForEditor = useCurrentTechnicianCoordinatesForEditor;
    window.openTechnicianAddModal = openTechnicianAddModal;
    window.openTechnicianAddDetailModal = openTechnicianAddDetailModal;
    window.closeTechnicianAddModal = closeTechnicianAddModal;
    window.saveTechnicianAddDetail = saveTechnicianAddDetail;
    window.refreshTechnicianDayMap = refreshTechnicianDayMap;
    window.toggleTechLocationsSheet = toggleTechLocationsSheet;
    window.renderTechLocationsSheet = renderTechLocationsSheet;
}

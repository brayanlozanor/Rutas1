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
let selectedEquipmentId = '';
let planMap = null;
let planRouteLayer = null;
let planRouteRenderId = 0;
let planMarkers = [];
let planAntennaMarkers = [];
let planMapExpanded = false;
let captureMap = null;
let captureMarker = null;
let editingStopContext = null;
let routeFullMap = null;
let routeFullLayer = null;
let routeFullMarkers = [];
let currentPlanTechRouteLink = '';
let lastFocusedStartedStopId = '';

async function initPlanificarPage() {
    if (!checkAuth()) return;
    await loadDB();
    initCommon();
    normalizeWeekPlan();
    initPlanSelectors();
    renderPlan();
    setTimeout(initPlanMap, 100);
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
    if (!shared._generalPlans.length) {
        shared._generalPlans.push({
            id: gid('gp'),
            name: 'Plan general 1',
            createdAt: new Date().toISOString(),
            stops: []
        });
    }
    const visiblePlans = shared._generalPlans.filter(plan => !plan.deletedAt);
    if (!visiblePlans.length) {
        shared._generalPlans.push({
            id: gid('gp'),
            name: 'Plan general 1',
            createdAt: new Date().toISOString(),
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
            stops: []
        };
        state.weekPlan[SHARED_PLAN_ID]._generalPlans.push(plan);
        return [plan];
    }
    return visiblePlans;
}

function getPlanStopsRef(techId = selectedTechId, day = selectedDay) {
    ensureTechPlan(techId);
    if (techId === SHARED_PLAN_ID && day === 'general') {
        const plan = getSelectedGeneralPlan();
        if (!Array.isArray(plan.stops)) plan.stops = [];
        return plan.stops;
    }
    if (!state.weekPlan[techId]) state.weekPlan[techId] = {};
    if (!Array.isArray(state.weekPlan[techId][day])) state.weekPlan[techId][day] = [];
    return state.weekPlan[techId][day];
}

function visibleStops(stops) {
    return (Array.isArray(stops) ? stops : []).filter(stop => !stop.deletedAt);
}

function getSelectedGeneralPlan() {
    const plans = getGeneralPlans();
    const selected = plans.find(plan => plan.id === selectedGeneralPlanId) || plans[0];
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

    if (!selectedTechId) {
        selectedTechId = getInitialPlanTechId(activeTechs);
        selectedDay = selectedTechId === SHARED_PLAN_ID ? 'general' : getInitialDayForTech(selectedTechId);
    }

    const options = [`<option value="${SHARED_PLAN_ID}" ${selectedTechId === SHARED_PLAN_ID ? 'selected' : ''}>Plan general compartido</option>`];
    options.push(...activeTechs.map(t => `<option value="${t.id}" ${t.id === selectedTechId ? 'selected' : ''}>${escapeHtml(t.nombre)}</option>`));
    techSelect.innerHTML = options.join('');
    document.getElementById('plan-day').value = selectedDay;
    ensureTechPlan(selectedTechId);
    ensureGeneralPlanSystem();
    const selectedGeneralPlan = getSelectedGeneralPlan();
    generalPlanSelect.innerHTML = getGeneralPlans().map(plan => `<option value="${plan.id}" ${plan.id === selectedGeneralPlanId ? 'selected' : ''}>${escapeHtml(plan.name)} · ${formatShortDate(plan.createdAt)}</option>`).join('');
    generalPlanSelect.value = selectedGeneralPlan?.id || selectedGeneralPlanId;
    generalTools.style.display = selectedTechId === SHARED_PLAN_ID ? 'block' : 'none';
}

function selectPlanTech(id) {
    selectedTechId = id;
    ensureTechPlan(id);
    selectedDay = id === SHARED_PLAN_ID ? 'general' : getInitialDayForTech(id);
    document.getElementById('plan-day').value = selectedDay;
    renderPlan();
}

function selectGeneralPlan(id) {
    selectedGeneralPlanId = id;
    selectedTechId = SHARED_PLAN_ID;
    selectedDay = 'general';
    document.getElementById('plan-tech').value = SHARED_PLAN_ID;
    document.getElementById('plan-day').value = 'general';
    renderPlan();
}

async function createGeneralPlan() {
    const plans = getGeneralPlans();
    const usedNumbers = plans
        .map(plan => parseInt(String(plan.name || '').match(/Plan general\s+(\d+)/i)?.[1] || '0', 10))
        .filter(Number.isFinite);
    const nextNumber = Math.max(0, ...usedNumbers) + 1;
    const plan = {
        id: gid('gp'),
        name: `Plan general ${nextNumber}`,
        createdAt: new Date().toISOString(),
        stops: []
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
    await saveDB();
    selectedGeneralPlanId = plan.id;
    renderPlan();
    const refreshedSelect = document.getElementById('general-plan-select');
    if (refreshedSelect) refreshedSelect.value = plan.id;
    notify('Nuevo plan general creado');
}

function deleteGeneralPlan() {
    const plans = getGeneralPlans();
    if (plans.length <= 1) {
        notify('Debes conservar al menos un plan general', 'err');
        return;
    }
    const current = getSelectedGeneralPlan();
    if (!current || !confirm(`Eliminar ${current.name}?`)) return;
    current.deletedAt = new Date().toISOString();
    selectedGeneralPlanId = getGeneralPlans()[0].id;
    saveDB();
    renderPlan();
    notify('Plan general eliminado');
}

function deletePastGeneralPlans() {
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
    if (!confirm(`Eliminar ${pastPlans.length} plan(es) pasado(s)? El plan actual se conserva.`)) return;

    pastPlans.forEach(plan => plan.deletedAt = new Date().toISOString());
    selectedGeneralPlanId = getGeneralPlans().some(plan => plan.id === selectedGeneralPlanId)
        ? selectedGeneralPlanId
        : getGeneralPlans()[0].id;
    saveDB();
    renderPlan();
    notify('Planes pasados eliminados');
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
    renderPlanSummary();
    renderPlanDays();
    renderPlanMap();
}

function renderPlanSummaryLegacy() {
    const tech = getSelectedTech();
    const box = document.getElementById('plan-summary');
    if (!tech) {
        box.innerHTML = '<div class="plan-empty">No hay tecnicos registrados. Agrega uno en la ventana Tecnicos.</div>';
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

    box.innerHTML = `
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
        box.innerHTML = '<div class="plan-empty">No hay tecnicos registrados. Agrega uno en la ventana Tecnicos.</div>';
        document.getElementById('plan-title').textContent = 'Plan general';
        return;
    }

    const generalPlan = getSelectedGeneralPlan();
    document.getElementById('plan-title').textContent = selectedTechId === SHARED_PLAN_ID
        ? `Plan general de ${tech.nombre} - ${generalPlan.name}`
        : `Plan general de ${tech.nombre}`;

    const stops = getPlanStops('general');
    const pending = stops.reduce((acc, stop) => acc + getStopProgress(stop).pending, 0);

    box.innerHTML = `
        <div class="card" style="margin:0;cursor:default">
            <div class="ct2">${escapeHtml(tech.nombre)}</div>
            <div class="cs">${tech.id === SHARED_PLAN_ID ? 'Sin tecnico asignado' : (tech.telefono ? escapeHtml(tech.telefono) : 'Sin telefono')} - ${stops.length} paradas en general${selectedTechId === SHARED_PLAN_ID ? ` - creado ${formatShortDate(generalPlan.createdAt)}` : ''}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                <span class="badge" style="background:var(--cy);color:#fff">${stops.length} en General</span>
                <span class="badge bty">${pending} detalles ligados</span>
            </div>
        </div>`;
}

function renderPlanDays() {
    const board = document.getElementById('plan-days');
    if (!selectedTechId) {
        board.innerHTML = '<div class="plan-empty">Selecciona o crea un tecnico para empezar a planificar.</div>';
        return;
    }
    selectedDay = 'general';
    const daySelect = document.getElementById('plan-day');
    if (daySelect) daySelect.value = 'general';

    board.innerHTML = [GENERAL_PLAN_DAY].map(day => {
        const stops = getPlanStopsForView(day.id);
        return `
            <div class="day-col">
                <div class="day-head">
                    <span>${day.label}</span>
                    <button class="btn bsm bc" onclick="selectPlanDay('${day.id}')">${stops.length} paradas</button>
                </div>
                <div class="day-body">
                    ${stops.length ? stops.map((stop, index) => renderStopCard(stop, day.id, index)).join('') : `<div class="plan-empty">Sin paradas en ${day.label.toLowerCase()}. Agrega antenas o comunidades.</div>`}
                </div>
            </div>`;
    }).join('');
}

function renderStopCard(stop, day, index) {
    const eq = stop.equipmentId ? state.equipment.find(e => e.id === stop.equipmentId) : null;
    const details = getStopDetails(stop);
    const progress = getStopProgress(stop);
    const adminStatus = getStopAdminStatus(stop, progress);
    const visibleNotes = getVisibleStopNotes(stop, details);
    const position = getStopCurrentPosition(stop);
    const lat = !isNaN(position.lat) ? position.lat.toFixed(5) : '';
    const lng = !isNaN(position.lng) ? position.lng.toFixed(5) : '';
    const doneClass = progress.complete || stop.adminReleasedAt ? 'done' : '';

    return `
        <div class="stop-card ${stop.type === 'manual' ? 'manual' : ''} ${doneClass}" data-stop-id="${escapeAttr(stop.id)}">
            <div class="stop-title" title="${escapeAttr(stop.name || eq?.name || 'Parada')}">${index + 1}. ${escapeHtml(stop.name || eq?.name || 'Parada')}</div>
            <div class="stop-meta">${stop.type === 'manual' ? 'Comunidad / punto manual' : 'Antena registrada'}${lat && lng ? ` · ${lat}, ${lng}` : ''}</div>
            <div class="stop-state-row">
                <span class="badge ${adminStatus.cls}">${adminStatus.text}</span>
                <span class="badge bty">${progress.done}/${progress.total} detalles hechos</span>
            </div>
            ${(stop.startedAt || stop.adminReleasedAt) ? `
                <div class="stop-timeline">
                    ${stop.startedAt ? `<span>Inicio tecnico: <strong>${formatPlanDateTime(stop.startedAt)}</strong></span>` : ''}
                    ${stop.adminReleasedAt ? `<span>Salida admin: <strong>${formatPlanDateTime(stop.adminReleasedAt)}</strong></span>` : ''}
                </div>` : ''}
            ${details.length ? `<div class="stop-details">${details.map(d => renderPlanDetailRow(d, stop, day)).join('')}</div>` : ''}
            ${visibleNotes ? `<div class="stop-notes">${escapeHtml(visibleNotes)}</div>` : ''}
            <div class="stop-actions">
                <input class="stop-order-input" type="number" min="1" max="${getPlanStops(day).length}" value="${index + 1}" title="Orden en ruta" onchange="setStopOrder('${day}','${escapeAttr(stop.id)}',this.value)">
                <button class="btn bsm bgh" onclick="moveStop('${day}','${escapeAttr(stop.id)}',-1)">Subir</button>
                <button class="btn bsm bgh" onclick="moveStop('${day}','${escapeAttr(stop.id)}',1)">Bajar</button>
                <button class="btn bsm ${progress.complete ? 'bgh' : 'bg2'}" onclick="toggleStopCompletion('${selectedTechId}','${day}','${stop.id}')">${progress.complete ? 'Restablecer' : 'Hecho'}</button>
                <button class="btn bsm ${progress.complete && !stop.adminReleasedAt ? 'bc' : 'bgh'}" onclick="releaseStopFromAdmin('${selectedTechId}','${day}','${stop.id}')" ${progress.complete && !stop.adminReleasedAt ? '' : 'disabled'}>Dar salida</button>
                <button class="btn bsm bc" onclick="openEditStopModal('${selectedTechId}','${day}','${stop.id}')">Editar</button>
                <button class="btn bsm br" onclick="deleteStop('${day}','${stop.id}')">Eliminar</button>
            </div>
        </div>`;
}

function renderEquipmentDatalist() {
    const list = document.getElementById('equipment-list');
    if (!list) return;
    list.innerHTML = (state.equipment || []).map(eq => `<option value="${escapeAttr(eq.name)}">${escapeAttr(eq.ip || '')}</option>`).join('');
}

function getStopCurrentPosition(stop) {
    const eq = stop?.equipmentId ? (state.equipment || []).find(e => e.id === stop.equipmentId && !e.deletedAt) : null;
    return {
        lat: safeFloat(eq?.lat ?? stop?.lat),
        lng: safeFloat(eq?.lng ?? stop?.lng)
    };
}

function renderPlanDetailRow(detail, stop, day) {
    const done = detail.status === 'completada';
    return `
        <div class="plan-detail-row ${done ? 'done' : ''}" style="border-left-color:${pc(detail.priority)}">
            <div class="plan-detail-main">
                <span class="badge ${done ? 'bg2' : 'bty'}">${done ? 'Hecho' : pl(detail.priority)}</span>
                <strong>${escapeHtml(detail.title || 'Detalle')}</strong>
                ${detail.desc ? `<small>${escapeHtml(detail.desc)}</small>` : ''}
            </div>
            <div class="plan-detail-actions">
                <button class="btn bsm ${done ? 'bgh' : 'bg2'}" onclick="togglePlanDetailStatus('${escapeAttr(detail.id)}')">${done ? 'Restablecer' : 'Hecho'}</button>
                <button class="btn bsm br" onclick="deletePlanDetailFromStop('${escapeAttr(stop.id)}','${escapeAttr(day)}','${escapeAttr(detail.id)}')">Eliminar</button>
            </div>
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

function openPlanStopModal(day = selectedDay) {
    if (!selectedTechId) {
        notify('Primero agrega o selecciona un tecnico', 'err');
        return;
    }

    selectedEquipmentId = '';
    document.getElementById('stop-day').value = day;
    document.getElementById('stop-type').value = 'equipment';
    document.getElementById('stop-equipment-search').value = '';
    document.getElementById('manual-name').value = '';
    document.getElementById('manual-lat').value = '';
    document.getElementById('manual-lng').value = '';
    document.getElementById('stop-notes').value = '';
    document.getElementById('stop-detail-location').value = '';
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

    const activeDetails = sortDetailsByPriority((state.workOrders || []).filter(w => w.equipmentId === eq.id && w.status !== 'completada'));
    preview.style.display = 'block';
    preview.innerHTML = `<strong>${escapeHtml(eq.name)}</strong><br><span class="mono">${escapeHtml(eq.ip || 'Sin IP')}</span> · ${escapeHtml(rById(eq.region).n)} · ${safeFloat(eq.lat).toFixed(5)}, ${safeFloat(eq.lng).toFixed(5)}`;

    detailsBox.innerHTML = `
        <div class="sbt" style="margin-top:12px">Detalles pendientes de esta antena</div>
        ${activeDetails.length ? activeDetails.map(w => `
            <label class="detail-check">
                <input type="checkbox" class="detail-pick" value="${w.id}" checked>
                <span><strong style="color:${pc(w.priority)}">${pl(w.priority)}</strong><br>${escapeHtml(w.title)}${w.desc ? `<br><small>${escapeHtml(w.desc)}</small>` : ''}</span>
            </label>`).join('') : '<div class="plan-empty">Esta antena no tiene detalles pendientes. Puedes escribir uno nuevo abajo.</div>'}`;
}

function savePlanStop() {
    const type = document.getElementById('stop-type').value;
    const day = document.getElementById('stop-day').value;
    const notes = document.getElementById('stop-notes').value.trim();
    const detailLocation = parseOptionalLocation(document.getElementById('stop-detail-location')?.value);
    const visitType = document.getElementById('stop-visit-type').value;
    const priority = document.getElementById('stop-priority').value;
    const detailIds = Array.from(document.querySelectorAll('.detail-pick:checked')).map(el => el.value);
    let stop;

    if (type === 'equipment') {
        const eq = state.equipment.find(e => e.id === selectedEquipmentId);
        if (!eq) {
            notify('Selecciona una antena registrada', 'err');
            return;
        }

        let createdId = '';
        if (notes) {
            createdId = createWorkOrderForStop({
                title: notes,
                equipmentId: eq.id,
                region: eq.region || '',
                visitType,
                priority,
                ...detailLocation
            });
        }

        stop = {
            id: gid('p'),
            type: 'equipment',
            equipmentId: eq.id,
            name: eq.name,
            lat: safeFloat(eq.lat),
            lng: safeFloat(eq.lng),
            detailIds: createdId ? [...detailIds, createdId] : detailIds,
            notes: createdId ? '' : notes,
            siteStatus: 'pendiente',
            createdAt: new Date().toISOString()
        };
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
            equipmentId: '',
            region: getNearestRegion(lat, lng),
            visitType,
            priority,
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
            visitType,
            siteStatus: 'pendiente',
            createdAt: new Date().toISOString()
        };
    }

    ensureTechPlan(selectedTechId);
    if (selectedTechId === SHARED_PLAN_ID && day === 'general') {
        getPlanStopsRef(SHARED_PLAN_ID, 'general').push(stop);
    } else {
        getPlanStopsRef(selectedTechId, day).push(stop);
    }
    selectedDay = day;
    document.getElementById('plan-day').value = day;
    CM('plan-stop-mo');
    saveDB();
    renderPlan();
    notify('Parada agregada al plan');
}

function createWorkOrderForStop({ title, equipmentId, region, visitType, priority, locationName = '', location = '', lat = '', lng = '' }) {
    const id = gid('w');
    state.workOrders.push({
        id,
        title,
        equipmentId: equipmentId || '',
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
        materials: []
    });
    return id;
}

function addEquipmentStopFromMap(eqId) {
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

    const activeDetails = (state.workOrders || [])
        .filter(w => w.equipmentId === eq.id && w.status !== 'completada')
        .map(w => w.id);

    getPlanStopsRef(selectedTechId, day).push({
        id: gid('p'),
        type: 'equipment',
        equipmentId: eq.id,
        name: eq.name,
        lat: safeFloat(eq.lat),
        lng: safeFloat(eq.lng),
        detailIds: activeDetails,
        notes: '',
        siteStatus: 'pendiente',
        createdAt: new Date().toISOString()
    });

    selectedDay = day;
    document.getElementById('plan-day').value = day;
    saveDB();
    renderPlan();
    notify(`${eq.name} agregado como parada`);
}

function getStopDetails(stop) {
    const ids = new Set(stop.detailIds || []);
    const details = new Map();
    (state.workOrders || []).forEach(w => {
        if (w.deletedAt) return;
        const linkedToStop = ids.has(w.id);
        const currentAntennaDetail = stop.equipmentId && w.equipmentId === stop.equipmentId && w.status !== 'completada';
        if (linkedToStop || currentAntennaDetail) details.set(w.id, w);
    });
    return sortDetailsByPriority(Array.from(details.values()));
}

function getStopProgress(stop) {
    const details = getStopDetails(stop);
    const total = details.length;
    const done = details.filter(detail => detail.status === 'completada').length;
    const pending = total - done;
    const complete = total ? pending === 0 : stop.siteStatus === 'hecho';
    return { total, done, pending, complete };
}

function getVisibleStopNotes(stop, details = getStopDetails(stop)) {
    const note = String(stop.notes || '').trim();
    if (!note) return '';
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

function moveStop(day, key, dir) {
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
    saveDB();
    renderPlan();
}

function setStopOrder(day, key, value) {
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
    saveDB();
    renderPlan();
}

function setMapStopOrder(day, stopId, value) {
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
    saveDB();
    renderPlanDays();
    renderPlanSummary();
    renderPlanMap();
    notify('Ruta recalculada con el nuevo orden');
}

function deleteStop(day, id) {
    const stop = getPlanStopsRef(selectedTechId, day).find(s => s.id === id);
    if (stop) stop.deletedAt = new Date().toISOString();
    saveDB();
    renderPlan();
    notify('Parada eliminada');
}

function clearDayPlan() {
    if (!selectedTechId || !confirm(`Limpiar el plan de ${dayLabel(selectedDay)}?`)) return;
    getPlanStopsRef(selectedTechId, selectedDay).forEach(stop => stop.deletedAt = new Date().toISOString());
    saveDB();
    renderPlan();
}

function clearTechPlan() {
    const tech = getSelectedTech();
    if (!tech || !confirm(`Limpiar todo el plan semanal de ${tech.nombre}?`)) return;
    if (selectedTechId === SHARED_PLAN_ID) {
        getGeneralPlans().forEach(plan => (plan.stops || []).forEach(stop => stop.deletedAt = new Date().toISOString()));
    } else {
        PLAN_DAYS.forEach(d => getPlanStopsRef(selectedTechId, d.id).forEach(stop => stop.deletedAt = new Date().toISOString()));
    }
    saveDB();
    renderPlan();
}

function clearAllPlanningContext() {
    if (!confirm('Esto eliminara todos los planes semanales y generales. ¿Deseas continuar?')) return;
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
    saveDB();
    renderPlan();
    notify('Se elimino todo el contexto de planificacion');
}

function initPlanMap() {
    if (planMap || !document.getElementById('plan-map')) return;
    planMap = L.map('plan-map').setView([17.55, -99.50], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
    }).addTo(planMap);
    renderPlanMap();
}

async function renderPlanMap() {
    if (!planMap) return;
    const renderId = ++planRouteRenderId;
    if (planRouteLayer) {
        planMap.removeLayer(planRouteLayer);
        planRouteLayer = null;
    }
    planMarkers.forEach(m => planMap.removeLayer(m));
    planMarkers = [];
    planAntennaMarkers.forEach(m => planMap.removeLayer(m));
    planAntennaMarkers = [];
    renderPlanAntennaMarkers();

    const points = getPlanMapStops()
        .filter(s => !isNaN(safeFloat(s.lat)) && !isNaN(safeFloat(s.lng)))
        .map(s => ({
            lat: safeFloat(s.lat),
            lng: safeFloat(s.lng),
            name: s.name,
            id: s.id,
            day: s.mapDay || selectedDay,
            index: s.mapIndex,
            mapLabel: s.mapLabel || s.name
        }));

    if (!points.length) {
        fitPlanMapToAntennas();
        return;
    }

    points.forEach((p, i) => {
        const marker = L.marker([p.lat, p.lng], {
            icon: L.divIcon({
                html: `<div style="background:var(--cy);color:#fff;border:2px solid #fff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:900;box-shadow:0 4px 12px rgba(0,0,0,.25)">${i + 1}</div>`,
                className: '',
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            })
        }).addTo(planMap);
        marker.bindTooltip(p.mapLabel || `${i + 1}. ${p.name || 'Parada'}`);
        marker.bindPopup(`
            <div class="plan-map-popup">
                <strong>${escapeHtml(p.name || 'Parada')}</strong>
                <label>Orden</label>
                <div class="plan-popup-row">
                    <input id="map-order-${escapeAttr(p.id)}" class="stop-order-input" type="number" min="1" max="${points.length}" value="${i + 1}">
                    <button class="btn bsm bc" onclick="setMapStopOrder('${escapeAttr(p.day)}','${escapeAttr(p.id)}',document.getElementById('map-order-${escapeAttr(p.id)}').value)">Reordenar</button>
                </div>
            </div>
        `);
        planMarkers.push(marker);
    });

    if (points.length > 1) {
        await drawRoadRoute(points, renderId);
    } else {
        fitPlanMapView(points);
    }
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

function openWeeklyRouteModal() {
    const stops = getOrderedRouteStops();
    const tech = getSelectedTech();
    const generalPlan = getSelectedGeneralPlan();
    const totalDetails = stops.reduce((sum, stop) => sum + stop.progress.total, 0);
    const pendingDetails = stops.reduce((sum, stop) => sum + stop.progress.pending, 0);
    const doneDetails = totalDetails - pendingDetails;
    const label = selectedTechId === SHARED_PLAN_ID
        ? `${tech?.nombre || 'Plan general compartido'} - ${generalPlan?.name || 'Plan general'}`
        : `${tech?.nombre || 'Tecnico'} - ${dayLabel(selectedDay)}`;

    document.getElementById('plan-route-sub').innerHTML = `
        <span>${escapeHtml(label)}</span>
        <span>${stops.length} paradas</span>
        <span>${totalDetails} detalles en total</span>
        <span>${pendingDetails} pendientes</span>
        <span>${doneDetails} hechos</span>
    `;
    renderWeeklyRouteList(stops);
    OM('plan-route-mo');

    setTimeout(() => {
        initRouteFullMap();
        renderRouteFullMap(stops);
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

function getWeeklyRouteExportRows(stops = getOrderedRouteStops()) {
    const rows = [];
    stops.forEach(stop => {
        const region = rById(getStopRegion(stop)).n;
        if (!stop.details.length) {
            rows.push({
                order: stop.order,
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
                order: stop.order,
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
    const stops = getOrderedRouteStops();
    if (!stops.length) {
        notify('No hay paradas para exportar', 'err');
        return;
    }

    const tech = getSelectedTech();
    const generalPlan = getSelectedGeneralPlan();
    const label = selectedTechId === SHARED_PLAN_ID
        ? `${tech?.nombre || 'Plan general compartido'} - ${generalPlan?.name || 'Plan general'}`
        : `${tech?.nombre || 'Tecnico'} - ${dayLabel(selectedDay)}`;
    const rows = getWeeklyRouteExportRows(stops);
    const totalDetails = stops.reduce((sum, stop) => sum + stop.progress.total, 0);
    const pendingDetails = stops.reduce((sum, stop) => sum + stop.progress.pending, 0);
    const safeName = stripExcelText(label).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'ruta_semanal';
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
                <tr><th class="title" colspan="8">${excelCell(label)}</th></tr>
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
        box.innerHTML = '<div class="plan-empty">No hay paradas con coordenadas para mostrar en la ruta.</div>';
        return;
    }

    box.innerHTML = stops.map(stop => {
        const region = rById(getStopRegion(stop)).n;
        const adminStatus = getStopAdminStatus(stop, stop.progress);
        const visibleNotes = getVisibleStopNotes(stop, stop.details);
        const detailRows = stop.details.length
            ? stop.details.map(detail => `
                <div class="route-detail-line ${detail.status === 'completada' ? 'done' : ''}">
                    <span style="border-color:${pc(detail.priority)}">${pl(detail.priority)}</span>
                    <strong>${escapeHtml(detail.title || 'Detalle')}</strong>
                    ${detail.desc ? `<small>${escapeHtml(detail.desc)}</small>` : ''}
                    <div class="route-detail-actions">
                        <button class="btn bsm ${detail.status === 'completada' ? 'bgh' : 'bg2'}" onclick="toggleRouteDetailStatus('${escapeAttr(detail.id)}')">${detail.status === 'completada' ? 'Restablecer' : 'Hecho'}</button>
                        <button class="btn bsm br" onclick="deleteRouteDetail('${escapeAttr(detail.id)}')">Eliminar</button>
                    </div>
                </div>`).join('')
            : '<div class="ant-muted">Sin detalles ligados.</div>';

        return `
            <div class="route-stop-card">
                <div class="route-stop-top">
                    <span class="route-stop-num">${stop.order}</span>
                    <div>
                        <div class="route-stop-name">${escapeHtml(stop.name || 'Parada')}</div>
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
                    <button class="btn bsm ${stop.progress.complete ? 'bgh' : 'bg2'}" onclick="toggleRouteStopCompletion('${escapeAttr(stop.day || selectedDay)}','${escapeAttr(stop.id)}')">${stop.progress.complete ? 'Restablecer sitio' : 'Marcar sitio hecho'}</button>
                    <button class="btn bsm ${stop.progress.complete && !stop.adminReleasedAt ? 'bc' : 'bgh'}" onclick="releaseRouteStopFromAdmin('${escapeAttr(stop.day || selectedDay)}','${escapeAttr(stop.id)}')" ${stop.progress.complete && !stop.adminReleasedAt ? '' : 'disabled'}>Dar salida</button>
                    <button class="btn bsm bc" onclick="openEditStopModal('${escapeAttr(selectedTechId)}','${escapeAttr(stop.day || selectedDay)}','${escapeAttr(stop.id)}')">Editar</button>
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

function toggleRouteDetailStatus(detailId) {
    const detail = (state.workOrders || []).find(w => w.id === detailId && !w.deletedAt);
    if (!detail) return;
    detail.status = detail.status === 'completada' ? 'pendiente' : 'completada';
    getPlanMapStops().forEach(stop => {
        if ((stop.detailIds || []).includes(detailId) || (stop.equipmentId && stop.equipmentId === detail.equipmentId)) {
            syncStopCompletion(stop);
        }
    });
    saveDB();
    refreshWeeklyRouteModal();
    notify(detail.status === 'completada' ? 'Detalle marcado como hecho' : 'Detalle restablecido');
}

function deleteRouteDetail(detailId) {
    const detail = (state.workOrders || []).find(w => w.id === detailId && !w.deletedAt);
    if (!detail || !confirm('Eliminar este detalle?')) return;
    getPlanMapStops().forEach(stop => {
        stop.detailIds = (stop.detailIds || []).filter(id => id !== detailId);
        syncStopCompletion(stop);
    });
    detail.deletedAt = new Date().toISOString();
    detail.status = 'eliminada';
    saveDB();
    refreshWeeklyRouteModal();
    notify('Detalle eliminado');
}

function toggleRouteStopCompletion(day, stopId) {
    toggleStopCompletion(selectedTechId, day, stopId);
    refreshWeeklyRouteModal();
}

function releaseRouteStopFromAdmin(day, stopId) {
    releaseStopFromAdmin(selectedTechId, day, stopId);
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

async function renderRouteFullMap(stops) {
    if (!routeFullMap) return;
    clearRouteFullMap();
    if (!stops.length) {
        routeFullMap.setView([17.55, -99.50], 8);
        return;
    }

    stops.forEach(stop => {
        const marker = L.marker([stop.lat, stop.lng], {
            icon: L.divIcon({
                html: `<div class="route-map-marker">${stop.order}</div>`,
                className: '',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(routeFullMap);
        marker.bindTooltip(`${stop.order}. ${escapeHtml(stop.name || 'Parada')}`);
        routeFullMarkers.push(marker);
    });

    const fitStops = () => routeFullMap.fitBounds(stops.map(stop => [stop.lat, stop.lng]), { padding: [35, 35] });
    if (stops.length === 1) {
        fitStops();
        return;
    }

    try {
        const routedStops = stops.length > 25 ? thinRoutePoints(stops, 25) : stops;
        const coords = routedStops.map(stop => `${stop.lng},${stop.lat}`).join(';');
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
        if (!res.ok) throw new Error('OSRM no disponible');
        const data = await res.json();
        if (!data.routes || !data.routes[0]) throw new Error('Sin ruta por carretera');
        routeFullLayer = L.geoJSON(data.routes[0].geometry, {
            style: { color: '#0984e3', weight: 6, opacity: .9, dashArray: '12 6' }
        }).addTo(routeFullMap);
        fitStops();
    } catch (e) {
        routeFullLayer = L.polyline(stops.map(stop => [stop.lat, stop.lng]), {
            color: '#0984e3',
            weight: 5,
            dashArray: '10 8'
        }).addTo(routeFullMap);
        fitStops();
        notify('No se pudo calcular carretera; se trazo directo', 'err');
    }
}

function renderPlanAntennaMarkers() {
    (state.equipment || []).forEach(eq => {
        const lat = safeFloat(eq.lat);
        const lng = safeFloat(eq.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const status = getAntennaStatus(eq.id);
        const marker = L.circleMarker([lat, lng], {
            radius: 5,
            color: '#fff',
            weight: 1.5,
            fillColor: status.color,
            fillOpacity: 0.9
        }).addTo(planMap);

        const details = sortDetailsByPriority((state.workOrders || []).filter(w => w.equipmentId === eq.id && w.status !== 'completada'));
        marker.bindTooltip(`${eq.name}${eq.ip ? ` · ${eq.ip}` : ''}`, { direction: 'top', offset: [0, -8] });
        marker.bindPopup(`
            <div style="min-width:220px;font-family:'Manrope',sans-serif">
                <div style="font-weight:900;font-size:13px;margin-bottom:4px">${escapeHtml(eq.name)}</div>
                ${eq.ip ? `<div class="mono" style="font-size:10px;color:#64748b">${escapeHtml(eq.ip)}</div>` : ''}
                <div style="margin:8px 0"><span class="badge" style="background:${status.color};color:#fff">${status.text}</span></div>
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
        const lat = safeFloat(eq.lat);
        const lng = safeFloat(eq.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const st = getAntennaStatus(eq.id);
        const marker = L.circleMarker([lat, lng], {
            radius: 5,
            color: '#fff',
            weight: 2,
            fillColor: st.color,
            fillOpacity: 0.92
        }).addTo(planMap);

        marker.bindTooltip(`${eq.name}${eq.ip ? ` · ${eq.ip}` : ''}`, {
            direction: 'top',
            offset: [0, -8]
        });

        marker.on('click', () => {
            const details = sortDetailsByPriority((state.workOrders || []).filter(w => w.equipmentId === eq.id && w.status !== 'completada'));
            marker.bindPopup(`
                <div style="min-width:200px;font-family:'Manrope',sans-serif">
                    <div style="font-weight:900;font-size:13px;margin-bottom:4px">${escapeHtml(eq.name)}</div>
                    <div class="mono" style="font-size:10px;color:#64748b">${escapeHtml(eq.ip || 'Sin IP')}</div>
                    <div style="margin:8px 0"><span class="badge" style="background:${st.color};color:#fff">${st.text}</span></div>
                    ${details.length ? details.slice(0, 4).map(d => `<div style="font-size:11px;margin-top:6px"><strong style="color:${pc(d.priority)}">${escapeHtml(d.title)}</strong></div>`).join('') : '<div style="font-size:11px;color:#64748b">Sin detalles pendientes</div>'}
                    <button class="btn bsm bc" style="margin-top:10px;width:100%" onclick="addEquipmentStopFromMap('${escapeAttr(eq.id)}')">Agregar parada</button>
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
    if (planMapExpanded) return;
    const antennaPoints = (state.equipment || [])
        .filter(eq => !isNaN(safeFloat(eq.lat)) && !isNaN(safeFloat(eq.lng)))
        .map(eq => [safeFloat(eq.lat), safeFloat(eq.lng)]);
    const routeLatLngs = (routePoints || [])
        .map(point => [safeFloat(point.lat), safeFloat(point.lng)])
        .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
    const allPoints = [...antennaPoints, ...routeLatLngs];
    if (!allPoints.length) {
        planMap.setView([17.55, -99.50], 8);
        return;
    }
    planMap.fitBounds(allPoints, { padding: [25, 25] });
}

async function drawRoadRoute(points, renderId = planRouteRenderId) {
    const fallback = () => {
        if (renderId !== planRouteRenderId) return;
        planRouteLayer = L.polyline(points.map(p => [p.lat, p.lng]), {
            color: '#0984e3',
            weight: 4,
            dashArray: '10 8'
        }).addTo(planMap);
        fitPlanMapView(points);
    };

    try {
        const routedPoints = points.length > 25 ? thinRoutePoints(points, 25) : points;
        const coords = routedPoints.map(p => `${p.lng},${p.lat}`).join(';');
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
        if (!res.ok) throw new Error('OSRM no disponible');
        const data = await res.json();
        if (!data.routes || !data.routes[0]) throw new Error('Sin ruta por carretera');
        if (renderId !== planRouteRenderId) return;

        planRouteLayer = L.geoJSON(data.routes[0].geometry, {
            style: {
                color: '#0984e3',
                weight: 5,
                opacity: 0.86,
                dashArray: '12 6'
            }
        }).addTo(planMap);
        fitPlanMapView(points);

        const km = (data.routes[0].distance / 1000).toFixed(1);
        const min = Math.round(data.routes[0].duration / 60);
        if (!planMapExpanded) notify(`Ruta por carretera: ${km} km · ${min} min`);
    } catch (e) {
        if (renderId !== planRouteRenderId) return;
        fallback();
        if (!planMapExpanded) notify('No se pudo calcular carretera; se trazo directo', 'err');
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
    const box = document.getElementById('plan-map-box');
    const btn = box?.querySelector('.plan-map-actions .btn');
    if (!box) return;

    planMapExpanded = !planMapExpanded;
    box.classList.toggle('map-expanded', planMapExpanded);
    document.body.classList.toggle('plan-map-open', planMapExpanded);
    if (btn) btn.textContent = planMapExpanded ? 'Cerrar mapa grande' : 'Agrandar mapa';

    setTimeout(() => {
        if (planMap) {
            planMap.invalidateSize();
            renderPlanMap();
        }
    }, 180);
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
        const eq = state.equipment.find(e => e.id === stop.equipmentId);
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
    const techWithStops = activeTechs.find(t => hasAnyStopsForTech(t.id));
    if (techWithStops) return techWithStops.id;
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
    return getPlanStopsForView('general').map((stop, index) => ({
        ...stop,
        ...getStopCurrentPosition(stop),
        mapDay: 'general',
        mapIndex: index,
        mapLabel: `General - ${index + 1}. ${stop.name || 'Parada'}`
    }));
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
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

function openEditStopModal(techId, day, stopId) {
    const stop = getPlanStopsRef(techId, day).find(s => s.id === stopId && !s.deletedAt);
    if (!stop) return;

    editingStopContext = { originalTechId: techId, originalDay: day, stopId };
    document.getElementById('edit-stop-sub').textContent = `${getSelectedTechLabel(techId)} · ${dayLabel(day)}`;
    document.getElementById('edit-stop-name').value = stop.name || '';
    document.getElementById('edit-stop-notes').value = stop.notes || '';
    document.getElementById('edit-stop-day').value = day;
    document.getElementById('new-detail-title').value = '';

    const techOptions = [`<option value="${SHARED_PLAN_ID}">Plan general compartido</option>`]
        .concat((state.technicians || []).filter(t => !t.deletedAt).map(t => `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`));
    document.getElementById('edit-stop-tech').innerHTML = techOptions.join('');
    document.getElementById('edit-stop-tech').value = techId;

    renderEditableDetails(stop);
    OM('plan-edit-mo');
}

function getSelectedTechLabel(techId) {
    if (techId === SHARED_PLAN_ID) return 'Plan general compartido';
    return state.technicians.find(t => t.id === techId && !t.deletedAt)?.nombre || 'Tecnico';
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
                    <button class="btn bsm ${detail.status === 'completada' ? 'bgh' : 'bg2'}" onclick="toggleLinkedDetailStatus('${detail.id}')">${detail.status === 'completada' ? 'Pendiente' : 'Hecho'}</button>
                    <button class="btn bsm br" onclick="removeLinkedDetail('${detail.id}')">Eliminar detalle</button>
                </div>
            </div>
            <div class="linked-detail-grid">
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
    const detail = state.workOrders.find(w => w.id === detailId && !w.deletedAt);
    if (detail) {
        detail.deletedAt = new Date().toISOString();
        detail.status = 'eliminada';
    }
    syncStopCompletion(stop);
    renderEditableDetails(stop);
}

function toggleLinkedDetailStatus(detailId) {
    const detail = state.workOrders.find(w => w.id === detailId && !w.deletedAt);
    if (!detail) return;
    detail.status = detail.status === 'completada' ? 'pendiente' : 'completada';
    const stop = getEditingStop();
    if (!stop) return;
    syncStopCompletion(stop);
    renderEditableDetails(stop);
}

function togglePlanDetailStatus(detailId) {
    const detail = state.workOrders.find(w => w.id === detailId && !w.deletedAt);
    if (!detail) return;
    detail.status = detail.status === 'completada' ? 'pendiente' : 'completada';
    getPlanMapStops().forEach(stop => {
        if ((stop.detailIds || []).includes(detailId) || (stop.equipmentId && stop.equipmentId === detail.equipmentId)) {
            syncStopCompletion(stop);
        }
    });
    saveDB();
    renderPlan();
    notify(detail.status === 'completada' ? 'Detalle marcado como hecho' : 'Detalle restablecido');
}

function deletePlanDetailFromStop(stopId, day, detailId) {
    const detail = state.workOrders.find(w => w.id === detailId && !w.deletedAt);
    if (!detail || !confirm('Eliminar este detalle?')) return;
    detail.deletedAt = new Date().toISOString();
    detail.status = 'eliminada';
    const stop = getPlanStopsRef(selectedTechId, day).find(item => item.id === stopId && !item.deletedAt);
    if (stop) {
        stop.detailIds = (stop.detailIds || []).filter(id => id !== detailId);
        syncStopCompletion(stop);
    }
    saveDB();
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

function toggleStopCompletion(techId, day, stopId) {
    const stop = getPlanStopsRef(techId, day).find(item => item.id === stopId && !item.deletedAt);
    if (!stop) return;

    const markDone = !getStopProgress(stop).complete;
    stop.siteStatus = markDone ? 'hecho' : 'pendiente';
    if (!markDone) {
        delete stop.adminReleasedAt;
        delete stop.adminReleasedBy;
    }
    getStopDetails(stop).forEach(detail => {
        detail.status = markDone ? 'completada' : 'pendiente';
    });
    saveDB();
    renderPlan();
    notify(markDone ? 'Sitio marcado como hecho' : 'Sitio marcado como pendiente');
}

function releaseStopFromAdmin(techId, day, stopId) {
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
    saveDB();
    renderPlan();
    notify('Salida dada por administrador');
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

    document.querySelectorAll('#edit-stop-details .linked-detail').forEach(node => {
        const detailId = node.getAttribute('data-detail-id');
        const detail = state.workOrders.find(w => w.id === detailId && !w.deletedAt);
        if (!detail) return;
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
            equipmentId: stop.equipmentId || '',
            region: getStopRegion(stop),
            visitType: document.getElementById('new-detail-type').value,
            priority: document.getElementById('new-detail-priority').value,
            locationName: stop.type === 'manual' ? stop.name : '',
            ...detailLocation
        });
        stop.detailIds = [...(stop.detailIds || []), detailId];
    }

    syncStopCompletion(stop);

    const targetTechId = document.getElementById('edit-stop-tech').value;
    const targetDay = document.getElementById('edit-stop-day').value;
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
    if (selectedTechId === SHARED_PLAN_ID) {
        return buildPublicRouteLink('planificar.html', 'tecnico-ruta.html', `?plan=general&generalPlan=${encodeURIComponent(selectedGeneralPlanId || '')}&appv=20260605-1`);
    }
    return buildPublicRouteLink('planificar.html', 'tecnico-ruta.html', `?tech=${encodeURIComponent(selectedTechId)}&appv=20260605-1`);
}

function openPlanTechQR() {
    currentPlanTechRouteLink = getPlanTechRouteLink();
    if (!currentPlanTechRouteLink) {
        notify('El QR solo se genera desde tu dominio publicado, no desde archivo local', 'err');
        return;
    }
    const tech = getSelectedTech();
    const label = selectedTechId === SHARED_PLAN_ID
        ? 'Plan general compartido (entra cualquier tecnico con cuenta)'
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

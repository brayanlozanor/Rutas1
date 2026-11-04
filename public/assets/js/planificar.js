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
let planFullscreenRouteRenderId = 0;
let planFullscreenNamesVisible = false;
let planFullscreenStopNamesVisible = false;
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
let expandedPendingStopId = '';
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
    return typeof userHasRole === 'function' && userHasRole('tecnico');
}

function canManagePlanStops() {
    return typeof userHasRole === 'function' && userHasRole('administrador', 'admin');
}

function isTechnicianPlanView() {
    return typeof userHasRole === 'function' && userHasRole('tecnico');
}

function getLoggedTechnicianId() {
    if (!isTechnicianPlanView()) return '';
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    const username = normalizeName(user?.username || '');
    const userId = String(user?.id || '');
    const technician = (state.technicians || []).find(tech =>
        !tech.deletedAt && (
            (userId && String(tech.userId || '') === userId) ||
            (username && normalizeName(tech.usuario || '') === username)
        )
    );
    return technician?.id || '';
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

async function initPlanificarPage() {
    if (!checkAuth()) return;
    initCommon();
    const stopSearch = document.getElementById('plan-stop-search');
    if (stopSearch) stopSearch.placeholder = 'Buscar cliente, pueblo o antena...';
    resetPlanMapScrollLock();
    await loadDB({ showOverlay: false, preferCache: true });
    if (isTechnicianPlanView()) {
        const logo = document.querySelector('.logo-link');
        if (logo) logo.href = 'planificar.html';
    }
    normalizeWeekPlan();
    initPlanSelectors();
    configureTechnicianDashboard();
    renderPlan();
    if (isTechnicianPlanView()) {
        checkTechnicianPendingMaterialPrompt();
        setTimeout(checkTechnicianPendingMaterialPrompt, 350);
    }
    setTimeout(initPlanMap, 100);
}

function configureTechnicianDashboard() {
    if (!isTechnicianPlanView()) return;
    applyTechnicianViewportLayout();
    if (!document.body.dataset.techView) document.body.dataset.techView = 'details';
    if (!selectedCalendarDate) selectedCalendarDate = localDateKey();
    const user = getCurrentUser();
    const firstName = String(user?.name || user?.username || 'Tecnico').trim().split(/\s+/)[0];
    const todayText = new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    const hero = document.querySelector('.hero-panel');
    if (hero) {
        hero.classList.add('tech-dashboard-hero');
        hero.innerHTML = `<div><div class="tech-hero-eyebrow">Mi jornada</div><h1>¡Hola, ${escapeHtml(firstName)}!</h1><p>${escapeHtml(todayText.charAt(0).toUpperCase() + todayText.slice(1))}</p></div><div class="tech-hero-signal" aria-hidden="true"><span></span><i></i><b></b></div>`;
    }
    const shell = document.querySelector('.plan-shell');
    const calendar = document.getElementById('plan-calendar');
    const kpis = document.querySelector('.plan-kpi-bar');
    const mapBox = document.getElementById('plan-map-box');
    const board = document.querySelector('.plan-board');
    if (shell && !document.querySelector('.tech-calendar-toolbar')) {
        const today = new Date(`${selectedCalendarDate}T12:00:00`);
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        const allStops = getPlanStopsForView('general');
        const days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + index);
            const dateKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
            const active = dateKey === selectedCalendarDate ? 'active' : '';
            const dayStopsCount = allStops.filter(s => (s.scheduledDate || '') === dateKey).length;
            const hasWork = dayStopsCount > 0 ? 'has-work' : '';
            return `<button type="button" class="tech-week-day ${active} ${hasWork}" onclick="selectTechnicianAgendaDate('${dateKey}')"><small>${date.toLocaleDateString('es-MX',{weekday:'short'}).replace('.','')}</small><strong>${date.getDate()}</strong>${dayStopsCount > 0 ? '<i class="tech-work-dot" title="Trabajo asignado"></i>' : ''}</button>`;
        }).join('');
        shell.insertAdjacentHTML('afterbegin', `<section class="tech-calendar-toolbar">
            <div class="tech-agenda-title">
                <h1>Mi agenda</h1>
                <button type="button" class="tech-today-pill" onclick="selectTechnicianAgendaDate('${localDateKey()}')">Hoy</button>
            </div>
            <div class="tech-day-label">Selecciona el día</div>
            <div class="tech-month-row">
                <button type="button" onclick="shiftTechnicianAgendaWeek(-1)" aria-label="Semana anterior">&#8249;</button>
                <strong>${today.toLocaleDateString('es-MX',{month:'long',year:'numeric'})}</strong>
                <button type="button" onclick="shiftTechnicianAgendaWeek(1)" aria-label="Semana siguiente">&#8250;</button>
            </div>
            <div class="tech-week-strip">${days}</div>
        </section>`);
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
                    <button type="button" class="tech-compact-summary-btn" onclick="openTechnicianProductivitySummary()" title="Ver resumen formal de productividad">
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

    if (shell && calendar && calendar.parentElement !== shell) shell.appendChild(calendar);
    if (mapBox) {
        mapBox.classList.add('tech-route-map-card');
        const head = mapBox.querySelector('.plan-map-panel-head');
        if (head) head.innerHTML = `<strong><span class="tech-map-icon">◇</span> Ubicaciones de las paradas</strong>`;
        if (!document.getElementById('tech-route-overview')) {
            mapBox.insertAdjacentHTML('beforebegin', `<section id="tech-route-overview" class="tech-route-overview"><div class="tech-route-overview-head"><span>Plan asignado</span><h2 id="tech-route-overview-title">Mi ruta</h2><small id="tech-route-overview-date"></small></div><div id="tech-route-overview-kpis" class="tech-route-overview-kpis"></div><div id="tech-route-stop-names" class="tech-route-stop-names"></div></section>`);
        }
    }
    if (board) {
        board.classList.add('tech-today-board');
        const title = board.querySelector('#plan-title');
        if (title) title.textContent = 'Detalles del día';
        if (!document.getElementById('tech-day-map-card')) {
            board.insertAdjacentHTML('afterend', `<section id="tech-day-map-card" class="tech-day-map-card"><div><strong>Ubicaciones del día</strong><small id="tech-day-map-date"></small></div><div id="tech-day-map" class="tech-day-map"></div></section>`);
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
            <button type="button" class="tech-header-bell" onclick="openNotificationPanel()" aria-label="Notificaciones y material" title="Avisos y material">
                <svg class="tech-bell-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span class="tech-header-badge" id="tech-mobile-bell-count" style="display:none">0</span>
            </button>
        </header>`);
    }
    if (!document.querySelector('.tech-bottom-nav')) {
        document.body.insertAdjacentHTML('beforeend', `<nav class="tech-bottom-nav tech-bottom-nav-three" aria-label="Opciones del técnico"><button class="active" type="button" onclick="openTechnicianDetails()"><svg class="tech-nav-svg" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v0Zm0 9h6m-6 4h4"/></svg>Detalles</button><button type="button" onclick="openTechnicianRouteMap()"><svg class="tech-nav-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>Ruta</button><button type="button" onclick="openTechnicianAddMenu()"><svg class="tech-nav-svg" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Agregar</button></nav>`);
    }
    renderTechnicianRouteOverview();
    updateTechnicianProgressCard();
    updateTechnicianMobileBellBadge();
    setTimeout(renderTechnicianDayMap, 0);
}

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
        if (techId && movTechId === techId) return true;
        if (techUserId && movTechId === techUserId) return true;
        if (userId && movTechId === userId) return true;
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

function checkTechnicianPendingMaterialPrompt() {
    if (!isTechnicianPlanView()) return;
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
            promptTitle.textContent = 'Entrega de material pendiente';
            promptDesc.textContent = 'Soporte te ha entregado material. Confirma la recepción para poder utilizarlo en tu jornada.';
        } else if (!hasPendingReceipt && hasPendingHandover) {
            promptTitle.textContent = 'Confirmar entrega de material a Soporte';
            promptDesc.textContent = 'Soporte registró material recibido. Confirma haberlo entregado conforme a las cantidades indicadas.';
        } else {
            promptTitle.textContent = 'Acciones de material pendientes';
            promptDesc.textContent = 'Revisa y confirma las entregas y recepciones de material pendientes con soporte.';
        }
    }

    container.innerHTML = pending.map(d => {
        const isReceipt = d.status === 'pending_receipt';
        const isHandover = d.status === 'pending_handover';
        const isEdited = !!d.isEdited;
        const items = Array.isArray(d.items) && d.items.length ? d.items : [{ materialName: d.materialName, quantity: d.quantity, unit: d.unit || 'pieza' }];
        const dateStr = d.at ? new Date(d.at).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' }) : 'Reciente';

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
                        <span class="dispatch-badge status-pending_receipt">Por recibir</span>
                    </div>

                    ${isEdited ? `
                        <div class="dispatch-edited-warning">
                            <span class="dispatch-edited-badge">Modificado</span>
                            <p>Soporte actualizó los materiales de esta entrega. Por favor revísalos antes de confirmar.</p>
                        </div>
                    ` : ''}

                    <div class="dispatch-items-table">
                        <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:4px">
                            Materiales a recibir (${items.length}):
                        </div>
                        ${itemsHtml}
                    </div>

                    <div style="font-size:12px;color:#64748b;margin:8px 0">
                        <div>Entregado por soporte: <strong>${escapeHtml(d.createdByName || 'Soporte')}</strong> el ${dateStr}</div>
                        ${d.reference ? `<div>Referencia: <strong>${escapeHtml(d.reference)}</strong></div>` : ''}
                        ${d.notes ? `<div style="font-style:italic;margin-top:2px">${escapeHtml(d.notes)}</div>` : ''}
                    </div>

                    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:6px">
                        <button type="button" class="btn bg2" onclick="confirmarRecepcionDesdePlan('${d.id}')" style="min-height:46px;font-size:13px;font-weight:800;border-radius:10px">
                            ${isEdited ? 'Confirmar recepción (actualizado)' : 'Confirmar que recibí'}
                        </button>
                        <button type="button" class="btn br" onclick="rechazarRecepcionDesdePlan('${d.id}')" style="min-height:46px;padding:0 14px;font-size:12px;font-weight:800;border-radius:10px;background:#fee2e2;color:#dc2626;border:1px solid #fecdd3" title="No estoy de acuerdo con este material y deseo devolverlo a soporte">
                            Devolver
                        </button>
                    </div>
                </div>
            `;
        }

        // isHandover (Soporte colocó cantidades y espera confirmación del técnico)
        const returnDateStr = d.receivedAt ? new Date(d.receivedAt).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' }) : dateStr;
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
                    <span class="dispatch-badge status-pending_handover">Por confirmar entrega</span>
                </div>

                <div style="background:#fff8f1;border:1px solid #fed7aa;border-radius:10px;padding:10px 14px;margin:8px 0">
                    <div style="font-size:11px;font-weight:800;color:#9a3412;text-transform:uppercase;margin-bottom:6px">
                        Cantidades registradas por Soporte:
                    </div>
                    ${returnBreakdownHtml}
                </div>

                <div style="font-size:12px;color:#64748b;margin:8px 0">
                    <div>Recibido por soporte: <strong>${escapeHtml(returnAdmin)}</strong> el ${returnDateStr}</div>
                    <div>Folio de entrega base: <span style="font-family:monospace;font-weight:700;color:#1d4ed8">${escapeHtml(deliveryFolio)}</span></div>
                    ${d.reference ? `<div>Referencia: <strong>${escapeHtml(d.reference)}</strong></div>` : ''}
                    ${returnNotes ? `<div style="font-style:italic;margin-top:2px">Notas de recepción: ${escapeHtml(returnNotes)}</div>` : ''}
                </div>

                <div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:6px">
                    <button type="button" class="btn bc" onclick="confirmarEntregaTecnicoDesdePlan('${d.id}')" style="min-height:46px;font-size:13px;font-weight:800;border-radius:10px;background:#ea580c;border-color:#ea580c">
                        Confirmar entrega a soporte
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

    // BOTÓN EXTRA DE CONFIRMACIÓN OBLIGATORIO
    const confirmed = await askConfirmation({
        title: 'Confirmación de recepción física de material',
        message: `¿Confirma de conformidad haber recibido físicamente la totalidad de los materiales y cantidades entregados por Soporte Técnico? (${itemsText})`,
        confirmText: 'Confirmar recepción',
        cancelText: 'Cancelar',
        tone: 'ok'
    });
    if (!confirmed) return;

    targetDispatch.status = 'received';
    targetDispatch.acceptedAt = now;
    targetDispatch.acceptedBy = user.id || '';
    targetDispatch.acceptedByName = user.name || user.username || 'Técnico';
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
    if (typeof notify === 'function') notify('Recepción física de material confirmada satisfactoriamente.', 'ok');

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

    // BOTÓN EXTRA DE CONFIRMACIÓN OBLIGATORIO
    const confirmed = await askConfirmation({
        title: 'Confirmar entrega a soporte',
        message: '¿Confirmas haber entregado el material a soporte conforme a las cantidades detalladas?',
        confirmText: 'Sí, confirmar entrega',
        cancelText: 'Cancelar',
        tone: 'ok'
    });
    if (!confirmed) return;

    targetDispatch.status = 'completed';
    targetDispatch.handoverAcceptedAt = now;
    targetDispatch.handoverAcceptedBy = user.id || '';
    targetDispatch.handoverAcceptedByName = user.name || user.username || 'Técnico';
    if (targetDispatch.returnDetails) {
        targetDispatch.returnDetails.techConfirmedAt = now;
        targetDispatch.returnDetails.techConfirmedBy = user.id || '';
        targetDispatch.returnDetails.techConfirmedByName = user.name || user.username || 'Técnico';
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
    if (typeof notify === 'function') notify('Has confirmado la entrega del material a soporte.');

    checkTechnicianPendingMaterialPrompt();
}

function setTechnicianNavActive(index) {
    document.querySelectorAll('.tech-bottom-nav-three > *').forEach((item, itemIndex) => item.classList.toggle('active', itemIndex === index));
}

function openTechnicianDetails() {
    document.body.dataset.techView = 'details';
    setTechnicianNavActive(0);
    applyTechnicianViewportLayout();
    document.querySelector('.tech-calendar-toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(renderTechnicianDayMap, 80);
}

function openTechnicianRouteMap() {
    document.body.dataset.techView = 'map';
    setTechnicianNavActive(1);
    const box = document.getElementById('plan-map-box');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
        renderTechnicianRouteOverview();
        planMap?.invalidateSize();
        renderPlanMap();
    }, 180);
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
    }, { details:0, done:0, pending:0 });
    const title = document.getElementById('tech-route-overview-title');
    if (title) title.textContent = plan?.name || 'Mi ruta asignada';
    const dateBox = document.getElementById('tech-route-overview-date');
    if (dateBox) dateBox.textContent = `${stops.length} parada${stops.length === 1 ? '' : 's'} asignada${stops.length === 1 ? '' : 's'} en el plan`;
    const kpis = document.getElementById('tech-route-overview-kpis');
    if (kpis) kpis.innerHTML = `<div><strong>${stops.length}</strong><small>paradas</small></div><div><strong>${totals.details}</strong><small>detalles</small></div><div><strong>${totals.done}</strong><small>completados</small></div><div><strong>${totals.pending}</strong><small>faltantes</small></div>`;
    const names = document.getElementById('tech-route-stop-names');
    if (names) names.innerHTML = stops.length ? stops.map((stop, index) => {
        const equipment = stop.equipmentId ? (state.equipment || []).find(item => item.id === stop.equipmentId && !item.deletedAt) : null;
        const node = stop.nodeId ? (state.nodes || []).find(item => item.id === stop.nodeId && !item.deletedAt) : null;
        return `<button type="button" onclick="openTechnicianRouteStop('${escapeAttr(stop.id)}')"><span>${index + 1}</span><strong>${escapeHtml(getTechnicianStopName(stop, equipment, node))}</strong><small>${getStopProgress(stop).done}/${getStopProgress(stop).total} detalles hechos</small></button>`;
    }).join('') : '<div class="plan-empty">No hay paradas para este día.</div>';
}

function openTechnicianRouteStop(stopId) {
    const marker = planMarkers.find(item => item._planStopId === stopId);
    const mapBox = document.getElementById('plan-map-box');
    if (!marker || !planMap) return notify('Esta parada no tiene una ubicación disponible.', 'err');
    const position = marker.getLatLng();
    planMap.setView(position, Math.max(planMap.getZoom(), 15), { animate:true });
    marker.openPopup();
    mapBox?.scrollIntoView({ behavior:'smooth', block:'center' });
}

function selectTechnicianAgendaDate(dateKey) {
    selectedCalendarDate = dateKey;
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
}

function renderTechnicianDayMap() {
    if (!isTechnicianPlanView() || typeof L === 'undefined') return;
    const element = document.getElementById('tech-day-map');
    if (!element) return;
    if (!technicianDayMap) {
        technicianDayMap = L.map(element, { scrollWheelZoom: false }).setView([17.55, -99.50], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap', maxZoom:19 }).addTo(technicianDayMap);
        technicianDayMapLayer = L.layerGroup().addTo(technicianDayMap);
    }
    technicianDayMapLayer.clearLayers();
    const date = selectedCalendarDate || localDateKey();
    const points = [];
    getPlanStopsForView('general').filter(stop => stop.scheduledDate === date).forEach(stop => {
        if (stop.equipmentId) {
            const equipment = (state.equipment || []).find(item => item.id === stop.equipmentId && !item.deletedAt);
            const lat = safeFloat(equipment?.lat);
            const lng = safeFloat(equipment?.lng);
            if (!isNaN(lat) && !isNaN(lng)) points.push({ lat, lng, name:`Antena de "${equipment?.name || stop.name || 'Sin nombre'}"` });
        }
        getStopDetails(stop).forEach(detail => {
            const parsed = typeof parseOptionalLocation === 'function' ? parseOptionalLocation(detail.detailLocation || '') : {};
            const lat = safeFloat(detail.lat ?? parsed.lat);
            const lng = safeFloat(detail.lng ?? parsed.lng);
            if (!isNaN(lat) && !isNaN(lng)) points.push({ lat, lng, name: `${getDetailFolio(detail)} · ${detail.clientName || detail.title || 'Detalle'}` });
        });
    });
    points.forEach((point, index) => L.marker([point.lat, point.lng]).bindTooltip(`${index + 1}. ${point.name}`).addTo(technicianDayMapLayer));
    if (points.length) technicianDayMap.fitBounds(points.map(point => [point.lat, point.lng]), { padding:[28,28], maxZoom:15 });
    else technicianDayMap.setView([17.55, -99.50], 8);
    const dateLabel = document.getElementById('tech-day-map-date');
    if (dateLabel) dateLabel.textContent = `${formatCalendarDate(date)} · ${points.length} ubicación${points.length === 1 ? '' : 'es'}`;
    setTimeout(() => technicianDayMap?.invalidateSize(), 50);
}

function shiftTechnicianAgendaWeek(offset) {
    const date = new Date(`${selectedCalendarDate || localDateKey()}T12:00:00`);
    date.setDate(date.getDate() + (Number(offset) || 0) * 7);
    selectTechnicianAgendaDate(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`);
}

function applyTechnicianViewportLayout() {
    const mobile = window.matchMedia('(max-width: 760px)').matches;
    const body = document.body;
    const main = document.querySelector('.main');
    const topbar = document.querySelector('.topbar');
    if (mobile) {
        body.style.setProperty('padding-left', '0', 'important');
        body.style.setProperty('width', '100%', 'important');
        main?.style.setProperty('width', '100%', 'important');
        main?.style.setProperty('margin-left', '0', 'important');
        main?.style.setProperty('transform', 'none', 'important');
        topbar?.style.setProperty('display', 'none', 'important');
    } else {
        body.style.removeProperty('padding-left');
        body.style.removeProperty('width');
        main?.style.removeProperty('width');
        main?.style.removeProperty('margin-left');
        main?.style.removeProperty('transform');
        topbar?.style.removeProperty('display');
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

function getVisibleGeneralPlansForRole() {
    const plans = getGeneralPlans();
    if (!isPlanReadOnly()) return plans;
    if (isTechnicianPlanView()) {
        const technicianId = getLoggedTechnicianId();
        return technicianId
            ? plans.filter(plan => !plan.deletedAt && plan.assignedTechId === technicianId)
            : [];
    }
    return plans.filter(plan => !plan.deletedAt && plan.assignedTechId);
}

function getPlanStopsRef(techId = selectedTechId, day = selectedDay) {
    ensureTechPlan(techId);
    if (day === 'general') {
        const plan = techId === SHARED_PLAN_ID
            ? getSelectedGeneralPlan()
            : getGeneralPlans().find(item => !item.deletedAt && item.assignedTechId === techId);
        if (plan) {
            if (!Array.isArray(plan.stops)) plan.stops = [];
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
        muy_alta:Number(entity.mapVeryHigh) || 0,
        alta:Number(entity.mapHigh) || 0,
        media:Number(entity.mapMedium) || 0,
        baja:Number(entity.mapLow) || 0
    };
    const count = counts.muy_alta + counts.alta + counts.media + counts.baja;
    if (counts.muy_alta > 0 || counts.alta >= 3) return {key:'critico',label:'Crítico',color:'#ef4444',count,counts};
    if (counts.alta > 0 || counts.media >= 2 || counts.baja >= 4) return {key:'atencion',label:'Atención',color:'#f59e0b',count,counts};
    if ((counts.media > 0 || counts.baja > 0) && Number(entity.mapPlannedOpen) > 0) return {key:'pendiente',label:'Pendiente',color:'#3b82f6',count,counts};
    return {key:'despejado',label:'Despejado',color:'#22c55e',count:0,counts};
}

function getSelectedGeneralPlan() {
    const plans = getVisibleGeneralPlansForRole();
    if (!plans.length) return null;
    let candidates = plans;
    if (selectedTechId && selectedTechId !== SHARED_PLAN_ID) {
        candidates = plans.filter(plan => plan.assignedTechId === selectedTechId);
        if (!candidates.length) return null;
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

    if (isPlanReadOnly()) {
        const assignedPlans = visibleGeneralPlans.filter(plan => plan.assignedTechId);
        const assignedTechIds = [...new Set(assignedPlans.map(plan => plan.assignedTechId))];
        const assignedTechs = activeTechs.filter(tech => assignedTechIds.includes(tech.id));
        if (!assignedTechs.some(tech => tech.id === selectedTechId)) {
            selectedTechId = assignedTechs[0]?.id || '';
        }
        selectedDay = 'general';
        const techPlans = assignedPlans.filter(plan => plan.assignedTechId === selectedTechId);
        selectedGeneralPlanId = techPlans.some(plan => plan.id === selectedGeneralPlanId)
            ? selectedGeneralPlanId
            : (techPlans[0]?.id || '');
        techSelect.innerHTML = assignedTechs.length
            ? assignedTechs.map(tech => `<option value="${escapeAttr(tech.id)}" ${tech.id === selectedTechId ? 'selected' : ''}>${escapeHtml(tech.nombre)}</option>`).join('')
            : '<option value="">Sin técnicos con plan asignado</option>';
        techSelect.value = selectedTechId;
        techSelect.disabled = isTechnicianPlanView();
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
    const selectablePlans = selectedTechId === SHARED_PLAN_ID
        ? getGeneralPlans()
        : getGeneralPlans().filter(plan => !plan.deletedAt && plan.assignedTechId === selectedTechId);
    generalPlanSelect.innerHTML = selectablePlans.length
        ? selectablePlans.map(plan => `<option value="${plan.id}" ${plan.id === selectedGeneralPlanId ? 'selected' : ''}>${escapeHtml(plan.name)} · ${formatShortDate(plan.createdAt)}</option>`).join('')
        : '<option value="">Sin plan asignado</option>';
    generalPlanSelect.value = selectedGeneralPlan?.id || '';
    renderGeneralPlanAssigneeSelect();
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
    if (isPlanReadOnly() && !getVisibleGeneralPlansForRole().some(plan => plan.id === id)) return;
    selectedGeneralPlanId = id;
    selectedCalendarDate = '';
    selectedDay = 'general';
    if (!isPlanReadOnly() && selectedTechId === SHARED_PLAN_ID) {
        document.getElementById('plan-tech').value = SHARED_PLAN_ID;
    }
    document.getElementById('plan-day').value = 'general';
    renderPlan();
}

function createGeneralPlan() {
    if (isPlanReadOnly()) return;
    const input = document.getElementById('plan-create-name');
    const date = document.getElementById('plan-create-date');
    if (input) input.value = '';
    if (date) date.textContent = new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
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
        materialSummary: '',
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
    closeCreateGeneralPlanModal();
    await saveDB();
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
    const ok = await askConfirmation({ title:'Eliminar plan', message:`Se quitará “${current.name}” y sus paradas de la planificación. Las órdenes no se borrarán.`, confirmText:'Eliminar plan', cancelText:'Conservar', tone:'danger' });
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
    const ok = await askConfirmation({ title:'Eliminar planes anteriores', message:`Se quitarán ${pastPlans.length} plan(es) anteriores. El plan actual se conserva y las órdenes no se borran.`, confirmText:'Eliminar anteriores', cancelText:'Cancelar', tone:'danger' });
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
    renderPlanKpis();
    renderPlanCalendar();
    renderPlanDays();
    renderPlanMap();
    applyPlanReadOnlyMode();
    configureTechnicianDashboard();
}

function refreshPlanAfterSync() {
    const scrollY = window.scrollY;
    normalizeWeekPlan();
    renderPlanMaterialSummary();
    renderPlanSummary();
    renderPlanKpis();
    renderPlanCalendar();
    renderPlanDays();
    applyPlanReadOnlyMode();
    configureTechnicianDashboard();
    requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'auto' }));
}

function updateTechnicianMobileBellBadge() {
    const rawInbox = typeof getStoredNotificationsInbox === 'function' ? getStoredNotificationsInbox() : [];
    const techInbox = rawInbox.filter(x => x.isMaterial || x.category === 'material' || x.type === 'material' || x.isProductivity || x.type === 'productivity');
    const unreadCount = techInbox.filter(x => x.unread).length;
    const badge = document.getElementById('tech-mobile-bell-count');
    if (badge) {
        badge.textContent = unreadCount > 9 ? '+9' : String(unreadCount);
        badge.style.display = unreadCount > 0 ? 'grid' : 'none';
    }
}

function updateTechnicianProgressCard() {
    if (!isTechnicianPlanView()) return;
    const todayKey = selectedCalendarDate || localDateKey();
    const allStops = getPlanStopsForView('general');
    const dayStops = allStops.filter(s => (s.scheduledDate || '') === todayKey);
    const dayDetails = [];
    dayStops.forEach(s => {
        getStopDetails(s).forEach(d => dayDetails.push(d));
        getStopResolvedHistory(s).forEach(d => dayDetails.push(d));
    });
    const uniqueDetailsMap = new Map();
    dayDetails.forEach(d => uniqueDetailsMap.set(d.id, d));
    const uniqueDetails = Array.from(uniqueDetailsMap.values());

    const isDone = d => ['completada', 'no_realizado'].includes(d.status || '');
    const completedDetails = uniqueDetails.filter(isDone).length;
    const totalDetails = uniqueDetails.length;
    const pendingDetails = Math.max(0, totalDetails - completedDetails);

    const completedStops = dayStops.filter(s => {
        const prog = getStopProgress(s);
        return prog.complete || s.adminReleasedAt;
    }).length;
    const totalStops = dayStops.length;

    const highPriorityCount = uniqueDetails.filter(d => !isDone(d) && (
        String(d.priority || '').toLowerCase() === 'alta' ||
        String(d.priority || '').toLowerCase() === 'urgente'
    )).length;

    let pct = 0;
    if (totalDetails > 0) {
        pct = Math.round((completedDetails / totalDetails) * 100);
    } else if (totalStops > 0) {
        pct = completedStops === totalStops ? 100 : Math.round((completedStops / totalStops) * 100);
    } else {
        pct = 100;
    }

    const pctBadge = document.getElementById('tech-progress-percent-badge');
    if (pctBadge) {
        pctBadge.textContent = `${pct}%`;
        pctBadge.classList.toggle('complete', pct === 100 && (totalDetails > 0 || totalStops > 0));
    }

    const barFill = document.getElementById('tech-progress-bar-fill');
    if (barFill) {
        barFill.style.width = `${pct}%`;
        barFill.classList.toggle('complete', pct === 100 && (totalDetails > 0 || totalStops > 0));
    }

    const pueblosEl = document.getElementById('tech-stat-pueblos');
    if (pueblosEl) pueblosEl.textContent = `${completedStops}/${totalStops} pueblos`;

    const detallesEl = document.getElementById('tech-stat-detalles');
    if (detallesEl) detallesEl.textContent = `${completedDetails} de ${totalDetails}`;

    const urgentesEl = document.getElementById('tech-stat-urgentes');
    const urgentPill = document.getElementById('tech-stat-pill-urgent');
    if (urgentesEl) {
        urgentesEl.textContent = highPriorityCount > 0 ? `${highPriorityCount} alta prioridad` : '';
    }
    if (urgentPill) {
        urgentPill.style.display = highPriorityCount > 0 ? 'inline-flex' : 'none';
    }
}

function openTechnicianProductivitySummary() {
    if (!isTechnicianPlanView()) return;
    const date = selectedCalendarDate || localDateKey();
    const allStops = getPlanStopsForView('general');
    const dayStops = allStops.filter(s => (s.scheduledDate || '') === date);
    const dayDetails = [];
    dayStops.forEach(s => {
        getStopDetails(s).forEach(d => dayDetails.push(d));
        getStopResolvedHistory(s).forEach(d => dayDetails.push(d));
    });
    const uniqueDetailsMap = new Map();
    dayDetails.forEach(d => uniqueDetailsMap.set(d.id, d));
    const uniqueDetails = Array.from(uniqueDetailsMap.values());

    const isDone = d => ['completada', 'no_realizado'].includes(d.status || '');
    const completedDetails = uniqueDetails.filter(isDone).length;
    const totalDetails = uniqueDetails.length;
    const pendingDetails = Math.max(0, totalDetails - completedDetails);

    const completedStops = dayStops.filter(s => {
        const prog = getStopProgress(s);
        return prog.complete || s.adminReleasedAt;
    }).length;
    const totalStops = dayStops.length;

    const highPriorityCount = uniqueDetails.filter(d => !isDone(d) && (
        String(d.priority || '').toLowerCase() === 'alta' ||
        String(d.priority || '').toLowerCase() === 'urgente'
    )).length;

    let pct = 0;
    if (totalDetails > 0) {
        pct = Math.round((completedDetails / totalDetails) * 100);
    } else if (totalStops > 0) {
        pct = completedStops === totalStops ? 100 : Math.round((completedStops / totalStops) * 100);
    } else {
        pct = 100;
    }

    const pendingDispatches = typeof getTechnicianPendingDispatches === 'function' ? getTechnicianPendingDispatches() : [];
    const user = getCurrentUser();
    const techName = user?.name || user?.username || 'Técnico';
    const dateFormatted = typeof formatCalendarDate === 'function' ? formatCalendarDate(date) : date;

    let modal = document.getElementById('tech-productivity-summary-mo');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="mo" id="tech-productivity-summary-mo">
                <div class="md tech-productivity-modal" role="dialog" aria-modal="true" style="max-width:540px;">
                    <div id="tech-productivity-modal-body"></div>
                </div>
            </div>
        `);
        modal = document.getElementById('tech-productivity-summary-mo');
        modal.addEventListener('click', e => { if (e.target === modal) CM('tech-productivity-summary-mo'); });
    }

    let statusNote = '';
    if (pct === 100 && (totalDetails > 0 || totalStops > 0)) {
        statusNote = '<strong>Jornada completada con éxito.</strong> Todos los detalles y paradas programadas para esta fecha han sido atendidos satisfactoriamente.';
    } else if (highPriorityCount > 0) {
        statusNote = `<strong>Atención prioritaria:</strong> Tienes ${highPriorityCount} detalle(s) de prioridad alta pendientes de atención. Se recomienda resolverlos a la brevedad.`;
    } else if (pct >= 50) {
        statusNote = '<strong>Buen ritmo de avance:</strong> Has superado la mitad de los servicios programados para hoy.';
    } else {
        statusNote = '<strong>Jornada en curso:</strong> Revisa tu agenda para continuar con las paradas y detalles programados.';
    }

    const body = document.getElementById('tech-productivity-modal-body');
    body.innerHTML = `
        <div class="modal-head" style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;border-bottom:1px solid #e2e8f0;padding-bottom:10px;">
            <div>
                <span style="font-size:11px;font-weight:800;color:#0284c7;text-transform:uppercase;letter-spacing:0.04em;">Desempeño y Productividad</span>
                <h2 style="margin:2px 0 0;font-size:20px;color:#0f172a;">Resumen Diario de Campo</h2>
                <small style="color:#64748b;">${escapeHtml(techName)} · ${escapeHtml(dateFormatted)}</small>
            </div>
            <button class="btn bgh" type="button" onclick="CM('tech-productivity-summary-mo')" style="padding:6px 12px;font-size:12px;font-weight:700;">Cerrar</button>
        </div>

        <div style="background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%);color:#fff;border-radius:16px;padding:20px;text-align:center;margin-bottom:16px;box-shadow:0 8px 20px rgba(2,132,199,0.18);">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;opacity:0.9;">Nivel de Avance Registrado</div>
            <div style="font-size:44px;font-weight:900;line-height:1.1;margin:6px 0;">${pct}%</div>
            <div style="font-size:13px;opacity:0.95;">${completedDetails} de ${totalDetails} detalles concluidos</div>
            <div style="margin-top:12px;background:rgba(255,255,255,0.2);height:8px;border-radius:999px;overflow:hidden;">
                <div style="width:${pct}%;background:#22c55e;height:100%;transition:width 0.4s ease;"></div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;">
                <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Pueblos Asignados</div>
                <div style="font-size:20px;font-weight:800;color:#0f172a;margin-top:3px;">${completedStops} / ${totalStops}</div>
                <small style="font-size:11px;color:#64748b;">${totalStops - completedStops} restantes</small>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;">
                <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Detalles de Servicio</div>
                <div style="font-size:20px;font-weight:800;color:#0f172a;margin-top:3px;">${completedDetails} / ${totalDetails}</div>
                <small style="font-size:11px;color:#64748b;">${pendingDetails} pendientes</small>
            </div>
            <div style="background:${highPriorityCount > 0 ? '#fff7ed' : '#f0fdf4'};border:1px solid ${highPriorityCount > 0 ? '#fdba74' : '#bbf7d0'};border-radius:12px;padding:12px 14px;">
                <div style="font-size:11px;font-weight:800;color:${highPriorityCount > 0 ? '#c2410c' : '#15803d'};text-transform:uppercase;">Prioridad Alta</div>
                <div style="font-size:20px;font-weight:800;color:${highPriorityCount > 0 ? '#ea580c' : '#16a34a'};margin-top:3px;">${highPriorityCount}</div>
                <small style="font-size:11px;color:${highPriorityCount > 0 ? '#9a3412' : '#166534'};">${highPriorityCount > 0 ? 'Requieren atención' : 'Al día'}</small>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;">
                <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Material de Campo</div>
                <div style="font-size:14px;font-weight:800;color:#0f172a;margin-top:5px;">${pendingDispatches.length ? 'Entregas pendientes' : 'En orden'}</div>
                <small style="font-size:11px;color:#64748b;">${pendingDispatches.length ? `${pendingDispatches.length} por confirmar` : 'Sin pendientes'}</small>
            </div>
        </div>

        <div style="background:#f1f5f9;border-left:4px solid #0284c7;border-radius:8px;padding:10px 14px;font-size:12px;color:#334155;line-height:1.45;margin-bottom:16px;">
            ${statusNote}
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;">
            ${pendingDispatches.length ? `<button type="button" class="btn bg2" onclick="CM('tech-productivity-summary-mo');checkTechnicianPendingMaterialPrompt();">Ver material pendiente</button>` : ''}
            <button type="button" class="btn bgh" onclick="CM('tech-productivity-summary-mo')">Cerrar resumen</button>
        </div>
    `;
    OM('tech-productivity-summary-mo');
}

function checkAndTriggerTechnicianProductivityBriefings() {
    if (!isTechnicianPlanView()) return;
    const todayKey = localDateKey();
    const allStops = getPlanStopsForView('general');
    const dayStops = allStops.filter(s => (s.scheduledDate || '') === todayKey);
    const dayDetails = [];
    dayStops.forEach(s => {
        getStopDetails(s).forEach(d => dayDetails.push(d));
        getStopResolvedHistory(s).forEach(d => dayDetails.push(d));
    });
    const uniqueDetailsMap = new Map();
    dayDetails.forEach(d => uniqueDetailsMap.set(d.id, d));
    const uniqueDetails = Array.from(uniqueDetailsMap.values());

    const isDone = d => ['completada', 'no_realizado'].includes(d.status || '');
    const completedDetails = uniqueDetails.filter(isDone).length;
    const totalDetails = uniqueDetails.length;
    const completedStops = dayStops.filter(s => {
        const prog = getStopProgress(s);
        return prog.complete || s.adminReleasedAt;
    }).length;
    const totalStops = dayStops.length;
    const highPriorityCount = uniqueDetails.filter(d => !isDone(d) && (
        String(d.priority || '').toLowerCase() === 'alta' ||
        String(d.priority || '').toLowerCase() === 'urgente'
    )).length;
    const pct = totalDetails > 0 ? Math.round((completedDetails / totalDetails) * 100) : (totalStops > 0 ? (completedStops === totalStops ? 100 : Math.round((completedStops / totalStops) * 100)) : 100);

    const now = new Date();
    const hour = now.getHours();

    // 1. Resumen Matutino (8:00 AM en adelante)
    const morningKey = `tech_brief_morning_${todayKey}`;
    if (hour >= 8 && !localStorage.getItem(morningKey)) {
        if (totalStops > 0 || totalDetails > 0) {
            if (typeof addNotificationToInbox === 'function') {
                addNotificationToInbox({
                    id: `morning_brief_${todayKey}`,
                    title: 'Resumen matutino de ruta',
                    message: `Buen día. Tienes asignados ${totalStops} pueblo(s) con ${totalDetails} detalle(s) programados para hoy${highPriorityCount > 0 ? ` (${highPriorityCount} con prioridad alta)` : ''}. Consulta el orden en tu agenda.`,
                    type: 'productivity',
                    isProductivity: true,
                    createdAt: new Date().toISOString()
                });
            }
            localStorage.setItem(morningKey, '1');
            if (typeof renderNotificationCenter === 'function') renderNotificationCenter();
            updateTechnicianMobileBellBadge();
        }
    }

    // 2. Cierre de Jornada (6:00 PM / 18:00 en adelante)
    const eveningKey = `tech_brief_evening_${todayKey}`;
    if (hour >= 18 && !localStorage.getItem(eveningKey)) {
        if (totalStops > 0 || totalDetails > 0) {
            if (typeof addNotificationToInbox === 'function') {
                addNotificationToInbox({
                    id: `evening_brief_${todayKey}`,
                    title: 'Cierre de jornada técnica',
                    message: `Resumen de actividades: Has concluido ${completedDetails} de ${totalDetails} detalle(s) (${pct}%) en ${totalStops} pueblo(s). Tu avance registrado hoy es del ${pct}%.`,
                    type: 'productivity',
                    isProductivity: true,
                    createdAt: new Date().toISOString()
                });
            }
            localStorage.setItem(eveningKey, '1');
            if (typeof renderNotificationCenter === 'function') renderNotificationCenter();
            updateTechnicianMobileBellBadge();
        }
    }
}

function renderPlanKpis() {
    const today = typeof localDateKey === 'function' ? localDateKey() : new Date().toISOString().slice(0,10);
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
    document.body.classList.toggle('plan-readonly', readOnly);
    document.body.classList.toggle('plan-technician-view', isTechnicianPlanView());
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
}

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

function calculateDayRouteFeasibility(stops) {
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

    const serviceMinutes = validStops.length * 45;
    const totalWorkdayMinutes = totalTravelMinutes + serviceMinutes;
    const workdayHours = Math.floor(totalWorkdayMinutes / 60);
    const workdayRemMinutes = totalWorkdayMinutes % 60;
    const workdayFormatted = workdayHours > 0 
        ? `${workdayHours}h ${workdayRemMinutes > 0 ? workdayRemMinutes + 'm' : ''}`.trim() 
        : `${workdayRemMinutes}m`;

    const travelHours = Math.floor(totalTravelMinutes / 60);
    const travelRemMinutes = totalTravelMinutes % 60;
    const travelFormatted = travelHours > 0 
        ? `${travelHours}h ${travelRemMinutes > 0 ? travelRemMinutes + 'm' : ''}`.trim() 
        : `${totalTravelMinutes} min`;

    let status = 'optima';
    let statusLabel = 'Jornada adecuada';
    let statusDesc = 'Tiempo equilibrado de traslado y trabajo en campo.';
    let statusClass = 'bgn';

    if (validStops.length === 0) {
        status = 'vacia';
        statusLabel = 'Sin paradas';
        statusDesc = 'No hay paradas programadas para esta fecha.';
        statusClass = 'bgh';
    } else if (totalWorkdayMinutes > 540) {
        status = 'sobrecarga';
        statusLabel = 'Sobrecarga de jornada';
        statusDesc = 'Supera 9 horas estimadas. Se sugiere redistribuir paradas.';
        statusClass = 'br';
    } else if (totalWorkdayMinutes > 420) {
        status = 'completa';
        statusLabel = 'Jornada completa';
        statusDesc = 'Ruta extensa pero viable en jornada normal.';
        statusClass = 'by';
    }

    return {
        stopsCount: validStops.length,
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
        legs
    };
}

let lastWeatherFetchCoords = null;

function getWmoWeatherInfo(code) {
    if (code === 0) return { label: 'Soleado / Despejado', icon: '☀️', condition: 'good' };
    if (code === 1 || code === 2) return { label: 'Mayormente despejado', icon: '🌤️', condition: 'good' };
    if (code === 3) return { label: 'Nublado', icon: '☁️', condition: 'fair' };
    if (code === 45 || code === 48) return { label: 'Niebla / Neblina', icon: '🌫️', condition: 'caution' };
    if (code >= 51 && code <= 55) return { label: 'Llovizna ligera', icon: '🌦️', condition: 'caution' };
    if (code >= 61 && code <= 65) return { label: 'Lluvia constante', icon: '🌧️', condition: 'warning' };
    if (code >= 80 && code <= 82) return { label: 'Chubascos', icon: '🌧️', condition: 'warning' };
    if (code >= 95) return { label: 'Tormenta eléctrica', icon: '⛈️', condition: 'alert' };
    return { label: 'Tiempo templado', icon: '⛅', condition: 'good' };
}

async function fetchTownWeather(lat, lng, townName) {
    const latNum = safeFloat(lat);
    const lngNum = safeFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) return;

    const cacheKey = `wm_wx_${latNum.toFixed(2)}_${lngNum.toFixed(2)}`;
    try {
        const cachedStr = sessionStorage.getItem(cacheKey);
        if (cachedStr) {
            const cached = JSON.parse(cachedStr);
            if (Date.now() - cached.timestamp < 3600000) {
                renderWeatherWidget(cached.data, townName);
                return;
            }
        }
    } catch (e) {}

    const coordKey = `${latNum.toFixed(2)}_${lngNum.toFixed(2)}`;
    if (lastWeatherFetchCoords === coordKey) return;
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
            sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: weatherObj }));
        } catch (e) {}

        renderWeatherWidget(weatherObj, townName);
    } catch (err) {
        renderWeatherFallback(townName);
    }
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
    if (iconEl) iconEl.textContent = wx.icon || '⛅';
    if (descEl) descEl.textContent = wx.label || 'Tiempo favorable';
    if (rainEl) rainEl.textContent = `🌧️ ${wx.rainProb}% lluvia`;
    if (windEl) windEl.textContent = `💨 ${wx.wind} km/h`;

    if (alertEl) {
        if (wx.rainProb >= 60 || wx.condition === 'warning' || wx.condition === 'alert') {
            alertEl.className = 'weather-road-alert alert-warning';
            alertEl.textContent = '⚠️ Alerta de lluvia: precaución en terracerías';
        } else if (wx.wind >= 35) {
            alertEl.className = 'weather-road-alert alert-warning';
            alertEl.textContent = '⚠️ Viento fuerte: precaución al subir torres';
        } else {
            alertEl.className = 'weather-road-alert';
            alertEl.textContent = '✓ Condiciones favorables para ruta de campo';
        }
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
        alertEl.textContent = '✓ Caminos transitables';
    }
}

function renderRouteIntelligenceWidget(stops) {
    const box = document.getElementById('plan-route-intel-box');
    if (!box) return;
    const feasibility = calculateDayRouteFeasibility(stops);

    const kmEl = document.getElementById('intel-km');
    const travelEl = document.getElementById('intel-travel-time');
    const stopsTimeEl = document.getElementById('intel-stops-time');
    const workdayEl = document.getElementById('intel-workday');
    const badgeEl = document.getElementById('intel-feasibility-badge');
    const statusEl = document.getElementById('intel-route-status');
    const stripEl = document.getElementById('plan-day-intel-strip');

    if (kmEl) kmEl.textContent = `${feasibility.totalKm} km`;
    if (travelEl) travelEl.textContent = feasibility.travelFormatted;
    if (stopsTimeEl) stopsTimeEl.textContent = `${feasibility.serviceMinutes} min`;
    if (workdayEl) workdayEl.textContent = feasibility.workdayFormatted;
    if (badgeEl) {
        badgeEl.className = `badge ${feasibility.statusClass}`;
        badgeEl.textContent = feasibility.statusLabel;
    }
    if (statusEl) statusEl.textContent = feasibility.statusDesc;

    if (stripEl) {
        if (stops.length > 0) {
            stripEl.style.display = 'flex';
            stripEl.innerHTML = `
                <div class="intel-summary">
                    <span><b>📍 ${stops.length}</b> paradas</span>
                    <span><b>🚗 ~${feasibility.totalKm} km</b> carretera</span>
                    <span><b>⏱️ ~${feasibility.travelFormatted}</b> traslado</span>
                    <span><b>🛠️ ${feasibility.serviceMinutes} min</b> servicio</span>
                    <span>Jornada est: <b>~${feasibility.workdayFormatted}</b></span>
                </div>
                <div><span class="badge ${feasibility.statusClass}">${feasibility.statusLabel}</span></div>
            `;
        } else {
            stripEl.style.display = 'none';
        }
    }

    const firstStopWithPos = stops.find(s => {
        const p = getStopCurrentPosition(s);
        return !isNaN(p.lat) && !isNaN(p.lng);
    });
    if (firstStopWithPos) {
        const p = getStopCurrentPosition(firstStopWithPos);
        fetchTownWeather(p.lat, p.lng, firstStopWithPos.name);
    } else {
        renderWeatherFallback();
    }
}

function renderPlanDays() {
    const board = document.getElementById('plan-days');
    if (!selectedTechId) {
        board.innerHTML = '<div class="plan-empty">Selecciona o crea un tecnico para empezar a planificar.</div>';
        return;
    }
    if (isPlanReadOnly() && !getSelectedGeneralPlan()) {
        board.innerHTML = '<div class="plan-empty">No hay planes asignados a tecnicos todavia.</div>';
        return;
    }
    selectedDay = 'general';
    const daySelect = document.getElementById('plan-day');
    if (daySelect) daySelect.value = 'general';
    const query = normalizeName(document.getElementById('plan-stop-search')?.value || '');
    const today = localDateKey();
    const allStops = getPlanStopsForView('general').filter(stop => {
        if (!query) return true;
        const details = getStopDetails(stop);
        return normalizeName([stop.name, ...details.flatMap(detail => [detail.clientName, detail.title, detail.description])].filter(Boolean).join(' ')).includes(query);
    });
    const visible = isTechnicianPlanView()
        ? (technicianSummaryMode === 'general' ? allStops : allStops.filter(stop => stop.scheduledDate === (selectedCalendarDate || today)))
        : (selectedCalendarDate
            ? allStops.filter(stop => (stop.scheduledDate || '') === selectedCalendarDate)
            : (document.getElementById('plan-calendar')?.dataset.unscheduledFilter === '1'
                ? allStops.filter(stop => !stop.scheduledDate)
                : allStops));
    const groups = new Map();
    visible.forEach(stop => {
        const key = stop.scheduledDate || '';
        const list = groups.get(key) || [];
        list.push(stop);
        groups.set(key, list);
    });
    const keys = [...groups.keys()].sort((a,b) => String(a || '9999').localeCompare(String(b || '9999')));
    board.innerHTML = keys.map(key => {
        const stops = groups.get(key) || [];
        const label = !key ? 'Sin fecha asignada' : (key < today ? `Pendientes anteriores · ${formatCalendarDate(key)}` : (key === today ? `Trabajo de hoy · ${formatCalendarDate(key)}` : formatCalendarDate(key)));
        const stopsHtml = stops.map((stop, index) => {
            let transitHtml = '';
            if (index > 0 && !isTechnicianPlanView()) {
                const prevStop = stops[index - 1];
                const p1 = getStopCurrentPosition(prevStop);
                const p2 = getStopCurrentPosition(stop);
                if (!isNaN(p1.lat) && !isNaN(p1.lng) && !isNaN(p2.lat) && !isNaN(p2.lng)) {
                    const leg = estimateRouteTravel(p1.lat, p1.lng, p2.lat, p2.lng);
                    const prevName = prevStop.name || 'Parada anterior';
                    const currName = stop.name || 'Siguiente parada';
                    transitHtml = `
                        <div class="plan-inter-stop-transit">
                            <div class="transit-line"></div>
                            <div class="transit-badge" title="Tiempo estimado en carretera (38 km/h)">
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
                                <span><b>~${leg.minutes} min</b> (${leg.km} km) de <b>${escapeHtml(prevName)}</b> a <b>${escapeHtml(currName)}</b></span>
                            </div>
                        </div>`;
                }
            }
            return transitHtml + renderStopCard(stop, 'general', index);
        }).join('');
        return `<div class="day-col"><div class="day-head"><span>${escapeHtml(label)}</span></div><div class="day-body">${stopsHtml}</div></div>`;
    }).join('') || `<div class="plan-empty">${isTechnicianPlanView() ? `No tienes paradas asignadas para ${formatCalendarDate(selectedCalendarDate || today)}.` : 'No hay paradas en esta fecha.'}</div>`;

    if (!isTechnicianPlanView()) {
        renderRouteIntelligenceWidget(visible);
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
    const eq = stop.equipmentId ? state.equipment.find(e => e.id === stop.equipmentId) : null;
    const node = stop.nodeId ? (state.nodes || []).find(n => n.id === stop.nodeId && !n.deletedAt) : null;
    const details = getStopDetails(stop);
    const pendingDetails = details.filter(detail => !['completada', 'no_realizado'].includes(detail.status || ''));
    const progress = getStopProgress(stop);
    const adminStatus = getStopAdminStatus(stop, progress);
    const visibleNotes = getVisibleStopNotes(stop, details);
    const materialText = stop.materialPlanned || details.map(d => d.materialPlanned || d.technicianReport?.materialUsed || '').filter(Boolean).join(', ');
    const position = getStopCurrentPosition(stop);
    const lat = !isNaN(position.lat) ? position.lat.toFixed(5) : '';
    const lng = !isNaN(position.lng) ? position.lng.toFixed(5) : '';
    const doneClass = progress.complete || stop.adminReleasedAt ? 'done' : '';
    const resolved = getStopResolvedHistory(stop);
    const resolvedOpen = expandedResolvedStops.has(stop.id);
    const history = getStopHistorySummary(stop);
    const technicianStopName = getTechnicianStopName(stop, eq, node);
    const antennaLocationUrl = eq && !isNaN(safeFloat(eq.lat)) && !isNaN(safeFloat(eq.lng)) ? `https://www.google.com/maps?q=${safeFloat(eq.lat)},${safeFloat(eq.lng)}` : '';

    return `
        <div class="stop-card ${stop.type === 'manual' ? 'manual' : ''} ${doneClass}" data-stop-id="${escapeAttr(stop.id)}" data-stop-day="${escapeAttr(day)}" ondragover="allowPlanStopDrop(event)" ondragleave="clearPlanStopDrop(event)" ondrop="dropPlanStop(event,'${escapeAttr(day)}','${escapeAttr(stop.id)}')">
            <div class="stop-card-heading"><div class="stop-heading-copy"><div class="stop-title clickable-stop-title" title="${escapeAttr(technicianStopName)}" onclick="togglePlanStopDetails('${escapeAttr(stop.id)}')">${escapeHtml(isTechnicianPlanView() ? technicianStopName : (stop.name || eq?.name || node?.name || 'Parada'))}</div><div class="stop-meta">${stop.type === 'manual' ? 'Comunidad / punto manual' : (stop.type === 'node' ? 'Nodo vinculado' : 'Antena registrada')}${lat && lng ? ` · ${lat}, ${lng}` : ''}</div></div>${isPlanReadOnly() ? '' : `<span class="stop-drag-handle" draggable="true" role="button" tabindex="0" title="Arrastra para cambiar el orden" aria-label="Arrastra para cambiar el orden" ondragstart="startPlanStopDrag(event,'${escapeAttr(day)}','${escapeAttr(stop.id)}')" ondragend="endPlanStopDrag()">&#8942;</span>`}</div>
            ${isTechnicianPlanView() && (lat && lng) ? `<a class="tech-nav-direction-btn" href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener"><svg class="tech-btn-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg> Navegar al pueblo</a>` : ''}
            ${isTechnicianPlanView() && antennaLocationUrl ? `<a class="order-location-link tech-antenna-location" href="${escapeAttr(antennaLocationUrl)}" target="_blank" rel="noopener">Abrir ubicación de la antena</a>` : ''}
            <div class="stop-state-row">
                <span class="badge ${adminStatus.cls}">${adminStatus.text}</span>
                <span class="badge bty">${progress.done}/${progress.total} detalles hechos</span>
            </div>
            <div class="stop-detail-switches" aria-label="Estado de los detalles de la parada">
                <button type="button" class="stop-detail-switch pending ${expandedPendingStopId === stop.id ? 'active' : ''}" aria-controls="plan-stop-details-${escapeAttr(stop.id)}" aria-expanded="${expandedPendingStopId === stop.id ? 'true' : 'false'}" onclick="togglePlanStopDetails('${escapeAttr(stop.id)}')"><span>Pendientes</span><strong>${pendingDetails.length}</strong></button>
                <button type="button" class="stop-detail-switch completed ${(resolvedOpen || expandedCompletedStopId === stop.id) ? 'active' : ''}" ${resolved.length ? `aria-controls="${isTechnicianPlanView() ? 'plan-stop-completed' : 'plan-stop-resolved'}-${escapeAttr(stop.id)}" aria-expanded="${(resolvedOpen || expandedCompletedStopId === stop.id) ? 'true' : 'false'}" onclick="${isTechnicianPlanView() ? 'toggleTechnicianCompleted' : 'toggleResolvedStop'}('${escapeAttr(stop.id)}')"` : 'disabled'}><span>Completados</span><strong>${resolved.length}</strong></button>
            </div>
            ${isPlanReadOnly() ? (stop.scheduledDate ? `<div class="plan-stop-date">Programada: <strong>${escapeHtml(formatCalendarDate(stop.scheduledDate))}</strong></div>` : '') : `<label class="plan-stop-date-editor"><span>Día asignado<strong>${escapeHtml(formatCalendarDate(stop.scheduledDate))}</strong></span><input type="date" value="${escapeAttr(stop.scheduledDate || '')}" onchange="assignStopCalendarDate('${escapeAttr(stop.id)}',this.value)"></label>`}
            ${history ? `<div class="stop-history-insight"><strong>${history.count} incidencias resueltas</strong><span>Ultima: ${escapeHtml(history.lastDate)}</span></div>` : ''}
            ${(stop.startedAt || stop.adminReleasedAt) ? `
                <div class="stop-timeline">
                    ${stop.startedAt ? `<span>Inicio tecnico: <strong>${formatPlanDateTime(stop.startedAt)}</strong></span>` : ''}
                    ${stop.adminReleasedAt ? `<span>Salida admin: <strong>${formatPlanDateTime(stop.adminReleasedAt)}</strong></span>` : ''}
                </div>` : ''}
            ${materialText ? `<div class="plan-material-chip">Material: ${escapeHtml(materialText)}</div>` : ''}
            ${visibleNotes ? `<div class="stop-notes">${escapeHtml(visibleNotes)}</div>` : ''}
            <div class="stop-details plan-stop-details-panel" id="plan-stop-details-${escapeAttr(stop.id)}" style="display:${expandedPendingStopId === stop.id ? 'flex' : 'none'}">${renderPlanDetailsGrouped(details, stop, day, 'pending')}</div>
            ${isTechnicianPlanView() && resolved.length ? `<div class="stop-details plan-stop-details-panel completed-only" id="plan-stop-completed-${escapeAttr(stop.id)}" style="display:${expandedCompletedStopId === stop.id ? 'flex' : 'none'}">${renderPlanDetailsGrouped(resolved, stop, day, 'completed')}</div>` : ''}
            ${!isTechnicianPlanView() && resolved.length ? `<div class="stop-resolved-panel" id="plan-stop-resolved-${escapeAttr(stop.id)}" ${resolvedOpen ? '' : 'hidden'}>${resolved.map(detail => renderPlanDetailRow(detail, stop, day, true)).join('')}</div>` : ''}
            <div class="stop-actions">
                ${isPlanReadOnly() ? `
                <button type="button" class="btn bsm bgh stop-action-pending" title="${expandedPendingStopId === stop.id ? 'Ocultar detalles' : `Ver detalles (${pendingDetails.length})`}" aria-label="${expandedPendingStopId === stop.id ? 'Ocultar detalles' : `Ver detalles (${pendingDetails.length})`}" aria-controls="plan-stop-details-${escapeAttr(stop.id)}" aria-expanded="${expandedPendingStopId === stop.id ? 'true' : 'false'}" data-pending-count="${pendingDetails.length}" onclick="togglePlanStopDetails('${escapeAttr(stop.id)}')">${expandedPendingStopId === stop.id ? 'Ocultar detalles' : `Ver detalles (${pendingDetails.length})`}</button>
                ${isTechnicianPlanView() && resolved.length ? `<button type="button" class="btn bsm plan-resolved-toggle stop-action-completed ${expandedCompletedStopId === stop.id ? 'active' : ''}" title="${expandedCompletedStopId === stop.id ? 'Ocultar completados' : `Ver completados (${resolved.length})`}" aria-label="${expandedCompletedStopId === stop.id ? 'Ocultar completados' : `Ver completados (${resolved.length})`}" aria-controls="plan-stop-completed-${escapeAttr(stop.id)}" aria-expanded="${expandedCompletedStopId === stop.id ? 'true' : 'false'}" data-completed-count="${resolved.length}" onclick="toggleTechnicianCompleted('${escapeAttr(stop.id)}')">${expandedCompletedStopId === stop.id ? 'Ocultar completados' : `Ver completados (${resolved.length})`}</button>` : ''}
                ` : `
                ${canManagePlanStops() ? `<button class="btn bsm stop-action-delete" title="Eliminar parada" aria-label="Eliminar parada" onclick="deleteStop('${day}','${stop.id}')">${stopActionIcon('delete')}</button>` : ''}
                ${resolved.length ? `<button class="btn bsm plan-resolved-toggle stop-action-completed ${resolvedOpen ? 'active' : ''}" title="${resolvedOpen ? 'Ocultar completados' : `Ver completados (${resolved.length})`}" aria-label="${resolvedOpen ? 'Ocultar completados' : `Ver completados (${resolved.length})`}" onclick="toggleResolvedStop('${escapeAttr(stop.id)}')">${stopActionIcon('completed')}</button>` : `<button class="btn bsm stop-action-completed" title="Sin completados" aria-label="Sin detalles completados" disabled>${stopActionIcon('completed')}</button>`}
                <button class="btn bsm stop-action-pending" title="${expandedPendingStopId === stop.id ? 'Ocultar pendientes' : `Ver pendientes (${pendingDetails.length})`}" aria-label="${expandedPendingStopId === stop.id ? 'Ocultar pendientes' : `Ver pendientes (${pendingDetails.length})`}" onclick="togglePlanStopDetails('${escapeAttr(stop.id)}')">${stopActionIcon('pending')}</button>
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
    if (node || stop?.type === 'node' || stop?.nodeId) {
        const raw = node?.town || node?.name || stop?.town || stop?.name || 'Pueblo';
        const clean = String(raw).replace(/^\s*R\s*\d+\s*[·:._-]*\s*/i, '').trim() || String(raw).trim();
        return `Pueblo ${clean}`;
    }
    if (equipment || stop?.type === 'equipment' || stop?.equipmentId) {
        return `Antena de "${equipment?.name || stop?.name || 'Sin nombre'}"`;
    }
    return stop?.name || 'Parada';
}

function toggleResolvedStop(stopId) {
    const closing = expandedResolvedStops.has(stopId);
    expandedResolvedStops.clear();
    expandedPendingStopId = '';
    if (!closing) expandedResolvedStops.add(stopId);
    renderPlanDays();
}

function togglePlanStopDetails(stopId) {
    expandedPendingStopId = expandedPendingStopId === stopId ? '' : stopId;
    expandedCompletedStopId = '';
    expandedResolvedStops.clear();
    renderPlanDays();
}

function toggleTechnicianCompleted(stopId) {
    const panelId = `plan-stop-completed-${stopId}`;
    const panel = document.getElementById(panelId);
    const pendingPanel = document.getElementById(`plan-stop-details-${stopId}`);
    const pendingButton = Array.from(document.querySelectorAll('[aria-controls^="plan-stop-details-"]'))
        .find(item => item.getAttribute('aria-controls') === `plan-stop-details-${stopId}`);
    const button = Array.from(document.querySelectorAll('[aria-controls^="plan-stop-completed-"]'))
        .find(item => item.getAttribute('aria-controls') === panelId);
    const opening = expandedCompletedStopId !== stopId || panel?.style.display === 'none';
    document.querySelectorAll('.plan-stop-details-panel.completed-only').forEach(item => { item.style.display = 'none'; });
    document.querySelectorAll('[aria-controls^="plan-stop-completed-"]').forEach(item => {
        item.classList.remove('active');
        item.setAttribute('aria-expanded', 'false');
        item.textContent = `Ver completados (${item.dataset.completedCount || '0'})`;
    });
    expandedCompletedStopId = opening ? stopId : '';
    expandedPendingStopId = '';
    expandedResolvedStops.clear();
    if (pendingPanel) pendingPanel.style.display = 'none';
    if (pendingButton) {
        pendingButton.setAttribute('aria-expanded', 'false');
        pendingButton.textContent = `Ver detalles (${pendingButton.dataset.pendingCount || '0'})`;
    }
    if (panel) panel.style.display = opening ? 'flex' : 'none';
    if (button) {
        button.classList.toggle('active', opening);
        button.setAttribute('aria-expanded', opening ? 'true' : 'false');
        button.textContent = opening ? 'Ocultar completados' : `Ver completados (${button.dataset.completedCount || '0'})`;
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
    if (!plan?.assignedTechId) return null;
    return (state.technicians || []).find(t => t.id === plan.assignedTechId && !t.deletedAt) || null;
}

function getGeneralPlanAssignedToTech(techId, ignorePlanId = '') {
    if (!techId) return null;
    return getGeneralPlans().find(plan =>
        !plan.deletedAt &&
        plan.id !== ignorePlanId &&
        plan.assignedTechId === techId
    ) || null;
}

function renderGeneralPlanAssigneeSelect() {
    const sel = document.getElementById('general-plan-assignee');
    if (!sel) return;
    const plan = getSelectedGeneralPlan();
    const currentAssigned = plan?.assignedTechId || '';
    const techs = (state.technicians || []).filter(t => !t.deletedAt && t.estado !== 'inactivo');
    const availableTechs = techs;
    sel.innerHTML = ['<option value="">Sin técnico asignado</option>']
        .concat(availableTechs.map(t => {
            const current = t.id === currentAssigned ? ' · asignado aquí' : '';
            return `<option value="${escapeAttr(t.id)}">${escapeHtml(t.nombre || t.usuario || 'Técnico')}${current}</option>`;
        }))
        .join('');
    sel.value = currentAssigned;
    const hintId = 'general-plan-assignee-hint';
    let hint = document.getElementById(hintId);
    if (!hint && sel.parentElement) {
        hint = document.createElement('div');
        hint.id = hintId;
        hint.className = 'mini-help';
        sel.parentElement.appendChild(hint);
    }
    const blocked = techs.filter(t => t.id !== currentAssigned && getGeneralPlanAssignedToTech(t.id, plan?.id || ''));
    if (hint) {
        hint.textContent = blocked.length
            ? `${blocked.length} tecnico(s) ya tienen otro plan; si eliges uno se movera a este plan.`
            : 'Puedes dejarlo sin tecnico o asignarlo a un tecnico activo.';
    }
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
    return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleDateString('es-MX', { weekday:'short', day:'numeric', month:'short' });
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
            box.innerHTML = `<button type="button" class="plan-calendar-show" onclick="togglePlanCalendar(true)"><span>Agenda del plan</span><strong>Ver semana</strong></button>`;
            return;
        }
        box.classList.remove('is-collapsed');
        const mondayKey = getAdminPlannerMonday(today);
        const monday = new Date(`${mondayKey}T12:00:00`);
        const weekDates = Array.from({ length:7 }, (_, index) => {
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
            }, { total:0, done:0, pending:0 });
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
        .sort((a,b) => String(a || '9999').localeCompare(String(b || '9999')));
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
    renderPlanCalendar();
    renderPlanDays();
}

function clearPlanCalendarFilter() {
    selectedCalendarDate = '';
    const box = document.getElementById('plan-calendar');
    if (box) box.dataset.unscheduledFilter = '0';
    renderPlanCalendar();
    renderPlanDays();
}

function setUnscheduledPlanFilter() {
    selectedCalendarDate = '';
    const box = document.getElementById('plan-calendar');
    if (box) box.dataset.unscheduledFilter = '1';
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
            '<option value="" disabled selected>📅 Mover a día...</option>',
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

    const columns = [{ date:'', label:'Paradas disponibles', source:true }, ...dates.map(date => ({ date, label:formatCalendarDate(date), source:false }))];
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
            <div class="plan-week-dropzone">${columnStops.map((stop,index) => renderCard(stop, `${columnIndex}-${index}`)).join('') || `<div class="plan-week-empty">${column.source ? 'No hay paradas disponibles' : 'Suelta una parada aquí'}</div>`}</div>
        </section>`;
    }).join('');

    const range = document.getElementById('plan-week-range');
    if (range) range.textContent = `${formatCalendarDate(dates[0])} — ${formatCalendarDate(dates[6])}`;
    const sub = document.getElementById('plan-week-planner-sub');
    if (sub) sub.textContent = `${plan?.name || 'Plan general'} · ${stops.length} paradas`;
    renderAdminWeekMapOptions(dates, stops);
    if (adminWeekRouteMap) renderAdminWeekRouteMap();
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
        adminWeekRouteMap = L.map(element, { scrollWheelZoom:true }).setView([17.55, -99.50], 8);
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
        .map((stop, index) => ({ ...stop, _planIndex:index, lat:safeFloat(stop.lat), lng:safeFloat(stop.lng) }))
        .filter(stop => !isNaN(stop.lat) && !isNaN(stop.lng));
    const selected = adminWeekMapScope === 'general'
        ? stops.filter(stop => dates.includes(stop.scheduledDate)).sort((a,b) => String(a.scheduledDate).localeCompare(String(b.scheduledDate)) || a._planIndex - b._planIndex)
        : stops.filter(stop => stop.scheduledDate === adminWeekMapScope);
    return selected.map((stop, index) => ({ ...stop, order:index + 1 }));
}

async function renderAdminWeekRouteMap() {
    initAdminWeekRouteMap();
    if (!adminWeekRouteMap) return;
    const renderId = ++adminWeekRouteRenderId;
    if (adminWeekRouteLayer) adminWeekRouteMap.removeLayer(adminWeekRouteLayer);
    adminWeekRouteLayer = L.layerGroup().addTo(adminWeekRouteMap);
    const stops = getAdminWeekMapStops();
    const info = document.getElementById('plan-week-map-info');
    const label = adminWeekMapScope === 'general' ? 'General de la semana' : formatCalendarDate(adminWeekMapScope);
    if (info) info.textContent = `${label} · ${stops.length} parada${stops.length === 1 ? '' : 's'}`;
    if (!stops.length) {
        adminWeekRouteMap.setView([17.55, -99.50], 8);
        return;
    }
    const latLngs = stops.map(stop => [stop.lat, stop.lng]);
    if (latLngs.length > 1) {
        L.polyline(latLngs, { color:'#fff', weight:8, opacity:.96, interactive:false }).addTo(adminWeekRouteLayer);
        L.polyline(latLngs, { color:'#f59e0b', weight:4, opacity:.95, dashArray:'8 6', interactive:false }).addTo(adminWeekRouteLayer);
    }
    stops.forEach(stop => {
        const progress = getStopProgress(stop);
        const marker = L.marker([stop.lat, stop.lng], {
            icon:L.divIcon({ html:`<div class="route-map-marker">${stop.order}</div>`, className:'', iconSize:[28,28], iconAnchor:[14,14] })
        }).addTo(adminWeekRouteLayer);
        marker.bindTooltip(`${stop.order}. ${escapeHtml(stop.name || 'Parada')}`, { direction:'top', offset:[0,-12] });
        marker.bindPopup(`<div style="min-width:190px"><strong>${stop.order}. ${escapeHtml(stop.name || 'Parada')}</strong><div class="map-detail-stats"><strong>${progress.total}<small>detalles</small></strong><span class="pending">${progress.pending} pendientes</span><span class="resolved">${progress.done} resueltos</span></div></div>`);
    });
    adminWeekRouteMap.fitBounds(latLngs, { padding:[28,28], maxZoom:15 });
    setTimeout(() => adminWeekRouteMap?.invalidateSize(), 80);
    if (stops.length < 2) return;
    try {
        const route = await fetchRoadRouteChunked(stops, 24);
        if (renderId !== adminWeekRouteRenderId || !adminWeekRouteLayer) return;
        adminWeekRouteLayer.eachLayer(layer => {
            if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) adminWeekRouteLayer.removeLayer(layer);
        });
        L.geoJSON(route.geometry, { style:{ color:'#fff', weight:9, opacity:.98, interactive:false } }).addTo(adminWeekRouteLayer);
        L.geoJSON(route.geometry, { style:{ color:'#0b63ce', weight:5, opacity:.97, interactive:false } }).addTo(adminWeekRouteLayer);
        if (info) info.textContent = `${label} · ${stops.length} paradas · ${(Number(route.distance || 0) / 1000).toFixed(1)} km`;
    } catch (error) {
        if (renderId === adminWeekRouteRenderId && info) info.textContent = `${label} · ruta directa · ${stops.length} paradas`;
    }
}

function startAdminWeekDrag(event, stopId) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', stopId);
    event.currentTarget.classList.add('dragging');
    event.currentTarget.addEventListener('dragend', () => event.currentTarget.classList.remove('dragging'), { once:true });
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
    if (!saved && ['localhost','127.0.0.1','::1'].includes(location.hostname)) {
        try {
            const response = await fetch(`${location.origin}/api/changes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ changes: [{ key:'weekPlan', value:state.weekPlan }] })
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
            document.body.insertAdjacentHTML('beforeend', `<div class="mo tech-incomplete-reason-mo" id="tech-incomplete-reason-mo"><div class="md tech-incomplete-reason-card"><div class="tech-incomplete-icon">!</div><h2>No se pudo terminar</h2><p id="tech-incomplete-reason-copy"></p><textarea id="tech-incomplete-reason-input" maxlength="500" rows="4" placeholder="Escribe el motivo..."></textarea><small id="tech-incomplete-reason-error"></small><div class="tech-incomplete-actions"><button type="button" class="btn bgh" id="tech-incomplete-cancel">Cancelar</button><button type="button" class="btn ba" id="tech-incomplete-save">Guardar motivo</button></div></div></div>`);
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
            if (!clean) { error.textContent = 'Escribe el motivo para continuar.'; input.focus(); return; }
            finish(clean);
        };
        OM('tech-incomplete-reason-mo');
        setTimeout(() => input.focus(), 80);
    });
}

async function reportPlanDetailIncomplete(detailId, stopId) {
    if (!isTechnicianPlanView()) return;
    const reason = await getIncompleteReason('Escribe el motivo por el cual no se concluyó este detalle de servicio:');
    if (!reason) return;
    if (!window.confirm('¿Confirma el registro de este detalle como no realizado en la visita actual?')) return;
    const detail = (state.workOrders || []).find(item => item.id === detailId && !item.deletedAt);
    const stop = getPlanStops('general').find(item => item.id === stopId && !item.deletedAt);
    if (!detail || !stop) return;
    const now = new Date().toISOString();
    const actor = getCurrentUser();
    const attempt = { type:'detalle', reason, at:now, byId:actor.id || '', byName:actor.name || actor.username || '' };
    // Se considera atendido en estadisticas, aunque el tecnico puede
    // terminarlo posteriormente desde la lista de no realizados.
    detail.status = 'no_realizado';
    detail.completedAt = now;
    detail.updatedAt = now;
    detail.technicianReport = { ...(detail.technicianReport || {}), result:'no_realizado', reason, completedAt:now, completedBy:actor.id || '', completedByName:actor.name || actor.username || '' };
    detail.incompleteHistory = [...(detail.incompleteHistory || []), attempt];
    setUpdatedAudit(detail, 'reportó detalle no terminado');
    syncStopCompletion(stop);
    stop.updatedAt = now;
    const saved = await saveDB();
    if (!saved) return notify('No se pudo guardar el reporte en la nube.', 'err');
    renderPlan();
    notify('Se ha registrado el motivo de no conclusión. El detalle permanece disponible para su posterior atención.', 'ok');
}

async function reportWholeStopIncomplete(stopId) {
    if (!isTechnicianPlanView()) return;
    const reason = await getIncompleteReason('Escribe el motivo por el cual no se pudo concluir esta parada completa:');
    if (!reason) return;
    if (!window.confirm('¿Confirma reprogramar esta parada para continuar el día de mañana?')) return;
    const stop = getPlanStops('general').find(item => item.id === stopId && !item.deletedAt);
    if (!stop) return;
    const now = new Date().toISOString();
    const actor = getCurrentUser();
    const attempt = { type:'parada', reason, at:now, byId:actor.id || '', byName:actor.name || actor.username || '' };
    stop.incompleteHistory = [...(stop.incompleteHistory || []), attempt];
    stop.lastIncompleteReason = reason;
    stop.scheduledDate = localDateKey(1);
    stop.siteStatus = 'pendiente';
    stop.updatedAt = now;
    getStopDetails(stop).filter(detail => !['completada','no_realizado'].includes(detail.status || '')).forEach(detail => {
        detail.incompleteHistory = [...(detail.incompleteHistory || []), attempt];
        detail.updatedAt = now;
    });
    const saved = await saveDB();
    if (!saved) return notify('No se pudo guardar el reporte en la nube.', 'err');
    renderPlan();
    notify('La parada completa ha sido reprogramada para continuar el día de mañana.', 'ok');
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
    if (title) title.textContent = unassign ? 'Dejar plan sin técnico' : 'Asignar técnico a la ruta';
    if (message) message.textContent = unassign ? 'La ruta volverá al plan general compartido.' : 'El técnico podrá consultar y trabajar esta ruta desde su agenda.';
    if (planName) planName.textContent = plan?.name || 'Plan general';
    if (techName) techName.textContent = unassign ? 'Sin técnico asignado' : (tech?.nombre || 'Técnico');
    if (warning) {
        warning.hidden = !occupiedPlan;
        warning.textContent = occupiedPlan ? `Este técnico está asignado a “${occupiedPlan.name || 'otro plan'}”. Al continuar se moverá a esta ruta.` : '';
    }
    if (confirm) confirm.textContent = unassign ? 'Quitar asignación' : (occupiedPlan ? 'Asignar y mover' : 'Confirmar asignación');
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
    const plan = getSelectedGeneralPlan();
    if (!plan) return;
    const targetTechId = techId || '';
    if (targetTechId === (plan.assignedTechId || '')) return;
    const targetTech = targetTechId ? (state.technicians || []).find(item => item.id === targetTechId && !item.deletedAt) : null;
    const occupied = targetTechId ? getGeneralPlanAssignedToTech(targetTechId, plan.id) : null;
    const confirmed = await requestPlanAssignmentConfirmation({ plan, tech: targetTech, occupiedPlan: occupied, unassign: !targetTechId });
    if (!confirmed) {
        renderGeneralPlanAssigneeSelect();
        return;
    }
    if (occupied) {
        occupied.assignedTechId = '';
        occupied.assignedAt = '';
        occupied.updatedAt = new Date().toISOString();
    }
    plan.assignedTechId = targetTechId;
    plan.assignedAt = targetTechId ? new Date().toISOString() : '';
    plan.updatedAt = new Date().toISOString();
    const saved = await saveDB();
    if (!saved) {
        notify('No se pudo guardar la asignación del plan en D1.', 'err');
        return;
    }
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
    const pending = list.filter(detail => !['completada', 'no_realizado'].includes(detail.status || ''));
    const completed = list.filter(detail => ['completada', 'no_realizado'].includes(detail.status || ''));
    const pendingHtml = pending.map(detail => renderPlanDetailRow(detail, stop, day)).join('');
    const completedHtml = completed.map(detail => renderPlanDetailRow(detail, stop, day, true)).join('');
    if (mode === 'pending') return `<div class="plan-detail-group"><strong>Pendientes</strong>${pendingHtml || '<div class="plan-empty compact">No hay detalles pendientes.</div>'}</div>`;
    if (mode === 'completed') return `<div class="plan-detail-group completed"><strong>Completados</strong>${completedHtml || '<div class="plan-empty compact">No hay detalles completados.</div>'}</div>`;
    return `<div class="plan-detail-group"><strong>Pendientes</strong>${pendingHtml || '<div class="plan-empty compact">No hay detalles pendientes.</div>'}</div>${completed.length ? `<div class="plan-detail-group completed"><strong>Completados</strong>${completedHtml}</div>` : ''}`;
}

function renderPlanDetailRow(detail, stop, day, historical = false) {
    const done = detail.status === 'completada';
    const noDone = detail.status === 'no_realizado';
    const category = getPlanDetailCategory(detail);
    const technicianDetailText = getWorkOrderRequestedText(detail, 'Sin detalle registrado');
    const technicianDescription = '';
    const visibleClientName = detail.clientName || 'Sin nombre registrado';
    const technicianLocation = detail.detailLocation
        || detail.technicianReport?.location
        || ((!isNaN(safeFloat(detail.lat)) && !isNaN(safeFloat(detail.lng))) ? `${detail.lat}, ${detail.lng}` : '');
    const rawPhone = String(detail.clientPhone || detail.phone || detail.technicianReport?.phone || '').replace(/\D/g, '');
    const phoneCallBtn = (isTechnicianPlanView() && rawPhone)
        ? `<a href="tel:${escapeAttr(rawPhone)}" class="tech-call-btn" title="Llamar al cliente"><svg class="tech-btn-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Llamar</a>`
        : '';
    const technicianActions = isTechnicianPlanView()
        ? (done
            ? `${phoneCallBtn}<button type="button" class="btn bsm tech-detail-edit" onclick="openTechnicianCompletionForm('${escapeAttr(detail.id)}')">Editar solución</button>`
            : (noDone
                ? `${phoneCallBtn}<button type="button" class="btn bsm bg2 tech-detail-finish tech-detail-finish-later" onclick="openTechnicianCompletionForm('${escapeAttr(detail.id)}')">Concluir detalle</button>`
                : `${phoneCallBtn}<button type="button" class="btn bsm bg2 tech-detail-finish" onclick="openTechnicianCompletionForm('${escapeAttr(detail.id)}')">Concluir detalle</button><button type="button" class="btn bsm ba tech-detail-incomplete" onclick="reportPlanDetailIncomplete('${escapeAttr(detail.id)}','${escapeAttr(stop.id)}')">No realizado</button>`))
        : '';
    const statusLine = done
        ? `<div class="detail-status-line"><span class="detail-folio">${escapeHtml(getDetailFolio(detail))}</span><span class="plan-category-badge category-${escapeAttr(category)}">${escapeHtml(planCategoryLabel(category))}</span></div>`
        : `<div class="detail-status-line">${noDone ? '<span class="badge ba">No realizado</span>' : `<span class="priority-badge priority-${escapeAttr(detail.priority || 'media')}"><span class="priority-dot"></span>${escapeHtml(pl(detail.priority || 'media'))}</span>`}<span class="detail-folio">${escapeHtml(getDetailFolio(detail))}</span><span class="plan-category-badge category-${escapeAttr(category)}">${escapeHtml(planCategoryLabel(category))}</span></div>`;
    const completedSummary = done ? `
                <div class="detail-client-line ${detail.clientName ? '' : 'is-empty'}"><b>Cliente:</b> ${escapeHtml(visibleClientName)}</div>
                <strong class="detail-title-line"><b>Detalle:</b> ${escapeHtml(technicianDetailText)}</strong>
                ${technicianDescription ? `<small class="detail-description-line"><b>Información:</b> ${escapeHtml(technicianDescription)}</small>` : ''}
                ${renderDetailLocation(detail.detailLocation || detail.technicianReport?.location)}
                ${detail.technicianReport?.modifiedAt || detail.modifiedAt ? `<small class="detail-modified-line"><b>Modificado:</b> ${escapeHtml(formatPlanDateTime(detail.technicianReport?.modifiedAt || detail.modifiedAt))}</small>` : ''}` : `
                <div class="detail-client-line ${detail.clientName ? '' : 'is-empty'}"><b>Cliente:</b> ${escapeHtml(visibleClientName)}</div>
                ${isTechnicianPlanView() ? `
                    <strong class="detail-title-line"><b>Detalle:</b> ${escapeHtml(technicianDetailText)}</strong>
                    ${technicianDescription ? `<small class="detail-description-line"><b>Información:</b> ${escapeHtml(technicianDescription)}</small>` : ''}
                    ${technicianLocation ? renderDetailLocation(technicianLocation) : '<div class="order-location-muted no-location">Sin ubicación registrada</div>'}
                ` : `
                    <strong class="detail-title-line"><b>Detalle:</b> ${escapeHtml(technicianDetailText)}</strong>
                    ${technicianDescription ? `<small class="detail-description-line"><b>Información:</b> ${escapeHtml(technicianDescription)}</small>` : ''}
                    ${renderPlanDetailMeta(detail)}
                `}
                ${noDone ? renderAdminTechReport(detail) : ''}`;
    return `
        <div class="plan-detail-row ${done ? 'done completed-summary' : ''} ${noDone ? 'not-done' : 'pending-summary'}" style="border-left-color:${pc(detail.priority)}">
            <div class="plan-detail-main">
                ${statusLine}
                ${completedSummary}
            </div>
            <div class="plan-detail-actions">
                <button class="btn bsm bgh plan-detail-open" title="Ver detalle completo" aria-label="Ver detalle completo" onclick="openPlanDetailReport('${escapeAttr(detail.id)}','${escapeAttr(stop.id)}','${escapeAttr(day)}')"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2.3 12s3.5-6 9.7-6 9.7 6 9.7 6-3.5 6-9.7 6-9.7-6-9.7-6Z"/><circle cx="12" cy="12" r="2.8"/></svg><span>Ver detalle</span></button>
                ${technicianActions}
                ${!historical && !isTechnicianPlanView() && canManagePlanStops() ? `<button class="btn bsm br plan-detail-delete" title="Eliminar detalle" aria-label="Eliminar detalle" onclick="deletePlanDetailFromStop('${escapeAttr(stop.id)}','${escapeAttr(day)}','${escapeAttr(detail.id)}')">${stopActionIcon('delete')}</button>` : ''}
            </div>
        </div>`;
}

function openPlanDetailReport(detailId, stopId = '', day = selectedDay) {
    const detail = (state.workOrders || []).find(item => item.id === detailId && !item.deletedAt);
    if (!detail) return notify('No se encontro el detalle solicitado.', 'err');
    const candidateStops = visibleStops(getPlanStopsRef(selectedTechId, day));
    const stop = candidateStops.find(item => item.id === stopId)
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
    const typeLabels = { comunidad:'Comunidad', torre:'Torre', troncal:'Troncal', punto_venta:'Punto de venta' };
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
        ? `<button type="button" class="btn plan-detail-report-edit" onclick="CM('plan-detail-report-mo');openTechnicianCompletionForm('${escapeAttr(detail.id)}')">Editar terminado</button>`
        : (!resolved && !isPlanReadOnly() && stop ? `<button type="button" class="btn plan-detail-report-edit" title="Editar detalle" aria-label="Editar detalle" onclick="editPlanDetailFromReport('${escapeAttr(stop.id)}','${escapeAttr(day)}','${escapeAttr(detail.id)}')">${stopActionIcon('edit')}</button>` : '');
    const card = document.getElementById('plan-detail-report-card');
    card.innerHTML = `
        <header class="plan-detail-report-head">
            <span class="plan-detail-report-icon">&#128203;</span>
            <div><h2>${resolved ? 'Reporte del tecnico' : 'Detalle pendiente'}</h2><p>&#9679; ${escapeHtml(stop?.name || detail.town || 'Detalle del plan')}</p></div>
            <div class="plan-detail-report-head-actions">${editButton}<button type="button" class="btn bgh" onclick="CM('plan-detail-report-mo')">Cerrar &nbsp; &times;</button></div>
        </header>
        <div class="plan-detail-report-grid">
            ${field('&#128100;', 'Nombre del cliente', detail.clientName || 'Sin nombre')}
            ${field('&#9742;', 'Numero telefonico', report.phone || detail.clientPhone || detail.phone || 'Sin telefono')}
            ${field('&#9679;', 'Lugar', detail.nodeName || detail.equipmentName || detail.town || stop?.name || 'Sin lugar')}
            ${field('&#8982;', resolved ? 'Ubicacion capturada' : 'Ubicacion registrada', location)}
            ${field(resolved && !noDone ? '&#10003;' : '&#9679;', 'Estado', statusText, resolved && !noDone ? 'success' : (noDone ? 'warning' : 'pending'))}
            ${field('&#128100;', resolved ? 'Tecnico' : 'Capturado por', resolved ? (report.completedByName || detail.completedByName || 'Sin tecnico') : (detail.createdByName || detail.createdByUsername || 'Sin registro'))}
            ${field('&#128197;', resolved ? 'Fecha y hora del reporte' : 'Fecha de captura', dateValue ? formatPlanDateTime(dateValue) : 'Sin fecha')}
            ${report.modifiedAt || detail.modifiedAt ? field('&#9998;', 'Última modificación', formatPlanDateTime(report.modifiedAt || detail.modifiedAt)) : ''}
            ${field('&#9881;', 'Tipo de trabajo', typeLabels[detail.visitType] || detail.visitType || 'Sin tipo')}
            ${field('&#9873;', 'Prioridad', pl(detail.priority || 'media'))}
            ${field('&#9670;', 'Categoria', planCategoryLabel(getPlanDetailCategory(detail)))}
        </div>
        <section class="plan-detail-report-wide"><span>&#128203;</span><div><small>Detalle solicitado</small><strong>${escapeHtml(requested)}</strong></div></section>
        ${resolved && (noDone || completedWork || report.observations || report.materialUsed) ? `<section class="plan-detail-report-wide ${noDone ? 'warning' : 'success'}"><span>${noDone ? '&#9888;' : '&#10003;'}</span><div>${noDone || completedWork ? `<small>${noDone ? 'Motivo reportado' : 'Trabajo realizado'}</small><strong>${escapeHtml(noDone ? (report.reason || 'No se capturo un motivo') : completedWork)}</strong>` : ''}${report.observations ? `<p><b>Observaciones:</b> ${escapeHtml(report.observations)}</p>` : ''}${report.materialUsed ? `<p><b>Material utilizado:</b> ${escapeHtml(report.materialUsed)}</p>` : ''}</div></section>` : (!resolved ? '<div class="plan-detail-report-pending-note">Este detalle sigue pendiente. Se muestran los datos capturados al registrarlo.</div>' : '')}
        ${photos.length ? `<section class="plan-detail-report-evidence"><small>Evidencias</small><div>${photos.map((photo,index) => `<button type="button" onclick="openPlanEvidenceGallery('${escapeAttr(galleryKey)}',${index})"><img src="${escapeAttr(photo)}" alt="Evidencia ${index + 1}"><span>${index + 1}</span></button>`).join('')}</div></section>` : (resolved ? '<div class="plan-detail-report-no-evidence">El tecnico no adjunto evidencias.</div>' : '')}
        <footer class="plan-detail-report-footer"><span>ID de orden: <b>${escapeHtml(getDetailFolio(detail))}</b></span><button type="button" class="btn bgh" onclick="CM('plan-detail-report-mo')">Cerrar</button></footer>`;
    OM('plan-detail-report-mo');
}

function editPlanDetailFromReport(stopId, day, detailId) {
    if (isPlanReadOnly()) return notify('No tienes permiso para editar este detalle.', 'warn');
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
            ${field('&#9881;', 'Tipo de trabajo', `<select id="pde-type">${[['comunidad','Comunidad'],['torre','Torre'],['troncal','Troncal'],['punto_venta','Punto de venta']].map(([value,label]) => `<option value="${value}" ${value === detail.visitType ? 'selected' : ''}>${label}</option>`).join('')}</select>`)}
            ${field('&#9670;', 'Categoria', `<select id="pde-category">${['otro','instalacion','alineacion_antena','antena_desconectada','antena_quemada','antena_inalambrica','reubicacion_antena','resurtir_antena','solicitud_respaldo'].map(value => `<option value="${value}" ${value === getPlanDetailCategory(detail) ? 'selected' : ''}>${escapeHtml(planCategoryLabel(value))}</option>`).join('')}</select>`)}
            ${field('&#9873;', 'Prioridad', `<select id="pde-priority">${['baja','media','alta','muy_alta'].map(value => `<option value="${value}" ${value === (detail.priority || 'media') ? 'selected' : ''}>${escapeHtml(pl(value))}</option>`).join('')}</select>`)}
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
    return (state.workOrders || []).filter(detail => {
        if (detail.deletedAt || !['completada', 'no_realizado'].includes(detail.status || '')) return false;
        if (explicitIds.has(detail.id)) return true;
        if (!wasDetailResolvedDuringStop(detail, stop)) return false;
        if (stop.equipmentId && !detail.nodeId && detail.equipmentId === stop.equipmentId) return true;
        return !!(stop.nodeId && detail.nodeId === stop.nodeId);
    }).sort((a, b) => new Date(b.completedAt || b.updatedAt || b.createdAt || 0) - new Date(a.completedAt || a.updatedAt || a.createdAt || 0));
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
    if (planStopPickerType === 'node') return (state.nodes || []).filter(item => !item.deletedAt).map(item => ({ id:item.id, type:'node', title:getNodeLabel(item), subtitle:`Comunidad · ${getNodePlanDetails(item.id).length} detalles`, search:[getNodeLabel(item),item.nodeCode,item.town,item.zone].join(' ') }));
    return (state.equipment || []).filter(item => !item.deletedAt).map(item => ({ id:item.id, type:'equipment', title:item.name || 'Antena', subtitle:`Antena / Torre${item.ip ? ` · IP ${item.ip}` : (item.region ? ` · Zona ${getZoneLabel(item.region)}` : '')}`, search:[item.name,item.ip,item.region,item.ssid].join(' ') }));
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
    box.innerHTML = `<div class="plan-stop-picker-divider"></div><strong class="plan-stop-picker-label">Seleccionado:</strong><div class="plan-stop-picker-result selected"><span class="${item.type}">${item.type === 'node' ? '&#8962;' : '&#128225;'}</span><div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.subtitle)}</small></div><button type="button" onclick="planStopPickerSelected=null;renderPlanStopPickerSelected()" aria-label="Quitar">&times;</button></div><button type="button" class="btn bc plan-stop-picker-add" onclick="addSelectedPlanStop()">Agregar parada</button>`;
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
    const linkedNodes = getEquipmentLinkedNodes(eq.id);
    preview.style.display = 'block';
    preview.innerHTML = `<strong>${escapeHtml(eq.name)}</strong><br><span class="mono">${escapeHtml(eq.ip || 'Sin IP')}</span> · ${escapeHtml(rById(eq.region).n)} · ${safeFloat(eq.lat).toFixed(5)}, ${safeFloat(eq.lng).toFixed(5)}${linkedNodes.length ? `<br><small><strong>Nodos vinculados:</strong> ${escapeHtml(linkedNodes.map(getNodeLabel).join(', '))}</small>` : ''}`;

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
    return detail && !detail.deletedAt && !['completada', 'eliminada', 'no_realizado'].includes(detail.status || '');
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

function getEquipmentPlanDetailGroups(equipmentId, onlyIds = null) {
    const selected = onlyIds ? new Set(onlyIds) : null;
    const linkedNodeIds = new Set(getEquipmentLinkedNodeIds(equipmentId));
    const antenna = [];
    const byNode = new Map();
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
    const groups = getEquipmentPlanDetailGroups(eq.id, selectedDetailIds);
    const existing = new Set(getPlanStopsRef(targetTechId, day)
        .filter(stop => !stop.deletedAt)
        .map(stop => stop.nodeId)
        .filter(Boolean));
    return groups.nodes
        .map(group => {
            const node = (state.nodes || []).find(item => item.id === group.nodeId && !item.deletedAt);
            if (!node || existing.has(node.id) || !group.details.length) return null;
            return {
                id: gid('p'),
                type: 'node',
                nodeId: node.id,
                equipmentId: '',
                parentEquipmentId: eq.id,
                name: getNodeLabel(node),
                lat: safeFloat(node.lat),
                lng: safeFloat(node.lng),
                region: node.region || eq.region || '',
                detailIds: group.details.map(detail => detail.id),
                notes: '',
                materialPlanned,
                assignedTechId: targetTechId === SHARED_PLAN_ID ? '' : targetTechId,
                siteStatus: 'pendiente',
                createdAt: new Date().toISOString()
            };
        })
        .filter(stop => stop && !isNaN(stop.lat) && !isNaN(stop.lng));
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
        const eq = state.equipment.find(e => e.id === selectedEquipmentId);
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

        const linkedNodeIds = getEquipmentLinkedNodeIds(eq.id);
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
    delete stop._linkedNodeStops;
    selectedTechId = targetTechId;
    selectedDay = day;
    document.getElementById('plan-tech').value = selectedTechId;
    document.getElementById('plan-day').value = day;
    CM('plan-stop-mo');
    saveDB();
    renderPlan();
    notify(linkedNodeStopCount ? `Parada y ${linkedNodeStopCount} nodo(s) vinculados agregados al plan` : 'Parada agregada al plan');
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
    const linkedNodeStops = buildLinkedNodeStops(eq, groups.all.map(w => w.id), selectedTechId, '', day);

    getPlanStopsRef(selectedTechId, day).push({
        id: gid('p'),
        type: 'equipment',
        equipmentId: eq.id,
        linkedNodeIds: getEquipmentLinkedNodeIds(eq.id),
        includeLinkedNodeDetails: false,
        name: eq.name,
        lat: safeFloat(eq.lat),
        lng: safeFloat(eq.lng),
        detailIds: activeDetails,
        notes: '',
        siteStatus: 'pendiente',
        createdAt: new Date().toISOString()
    }, ...linkedNodeStops);

    selectedDay = day;
    document.getElementById('plan-day').value = day;
    saveDB();
    renderPlan();
    notify(linkedNodeStops.length ? `${eq.name} y ${linkedNodeStops.length} nodo(s) agregados como paradas` : `${eq.name} agregado como parada`);
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

function getStopDetails(stop) {
    const ids = new Set(stop.detailIds || []);
    const details = new Map();
    (state.workOrders || []).forEach(w => {
        if (w.deletedAt) return;
        const explicitLink = ids.has(w.id);
        const matchesEquipment = stop.equipmentId && !w.nodeId && w.equipmentId === stop.equipmentId;
        const matchesNode = stop.nodeId && w.nodeId === stop.nodeId;

        const isResolved = ['completada', 'no_realizado'].includes(w.status || '');
        const resolvedInThisPlan = isResolved && wasDetailResolvedDuringStop(w, stop);
        const isPlanRelevant = isPendingPlanDetail(w);

        // detailIds es la asignacion persistida de esta parada. No debe
        // desaparecer si despues cambia la antena, el pueblo o la ubicacion.
        if (explicitLink || ((matchesEquipment || matchesNode) && (isPlanRelevant || resolvedInThisPlan))) {
            details.set(w.id, w);
        }
    });
    return sortDetailsByPriority(Array.from(details.values()));
}

function getStopProgress(stop) {
    const details = getStopDetails(stop);
    const total = details.length;
    const done = details.filter(detail => detail.status === 'completada' || detail.status === 'no_realizado').length;
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
    if (!canManagePlanStops()) return notify('Solo un administrador puede eliminar paradas', 'err');
    const stop = getPlanStopsRef(selectedTechId, day).find(s => s.id === id && !s.deletedAt);
    if (!stop) return;
    const ok = await askConfirmation({
        title: 'Eliminar parada',
        message: `Vas a quitar “${stop.name || 'esta parada'}” del plan. Los detalles y órdenes no se borrarán.`,
        confirmText: 'Sí, quitar parada',
        cancelText: 'Conservar',
        tone: 'danger'
    });
    if (!ok) return;
    setDeletedAudit(stop, 'eliminó parada del plan');
    const saved = await saveDB();
    if (!saved) return;
    renderPlan();
    notify('Parada eliminada');
}

async function clearAllPlanningContext() {
    const confirmed = await askConfirmation({ title:'Eliminar toda la planificación', message:'Se eliminarán todos los planes semanales y generales.', confirmText:'Eliminar todo', cancelText:'Cancelar', tone:'danger' });
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
    if (!isTechnicianPlanView()) renderPlanAntennaMarkers();

    const points = getPlanMapStops()
        .filter(s => !isNaN(safeFloat(s.lat)) && !isNaN(safeFloat(s.lng)))
        .map(s => ({
            lat: safeFloat(s.lat),
            lng: safeFloat(s.lng),
            name: s.name,
            id: s.id,
            day: s.mapDay || selectedDay,
            index: s.mapIndex,
            mapLabel: s.mapLabel || s.name,
            stop: s
        }));

    if (!points.length) {
        if (isTechnicianPlanView()) planMap.setView([17.55, -99.50], 8);
        else fitPlanMapToAntennas();
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
        marker._planStopId = p.id;
        marker.bindTooltip(p.mapLabel || `${i + 1}. ${p.name || 'Parada'}`);
        marker.bindPopup(isTechnicianPlanView() ? `
            <div class="plan-map-popup plan-map-popup-wide">
                <strong>${escapeHtml(p.mapLabel || p.name || 'Parada')}</strong>
                <div style="font-size:11px;color:#64748b;margin:5px 0 9px">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</div>
                ${renderFullscreenStopDetails(p.stop)}
            </div>
        ` : `
            <div class="plan-map-popup">
                <strong>${escapeHtml(p.name || 'Parada')}</strong>
                ${renderMapStopDetailStats(p.stop)}
                <label>Orden</label>
                <div class="plan-popup-row">
                    <input id="map-order-${escapeAttr(p.id)}" class="stop-order-input" type="number" min="1" max="${points.length}" value="${i + 1}">
                    <button class="btn bsm bc" onclick="setMapStopOrder('${escapeAttr(p.day)}','${escapeAttr(p.id)}',document.getElementById('map-order-${escapeAttr(p.id)}').value)">Reordenar</button>
                </div>
            </div>
        `, { maxWidth:420 });
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
            <span>🚗 ~${feasibility.totalKm} km</span> · 
            <span>⏱️ ~${feasibility.travelFormatted} traslado</span> · 
            <span>Jornada: <b>~${feasibility.workdayFormatted}</b></span> · 
            <span class="badge ${feasibility.statusClass}">${feasibility.statusLabel}</span>
        `;
    }

    renderWeeklyRouteList(stops);
}

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
    const confirmed = await askConfirmation({ title:'Eliminar detalle', message:'Este detalle se quitará de la ruta.', confirmText:'Eliminar', cancelText:'Cancelar', tone:'danger' });
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
    if (!stops.length) {
        routeFullMap.setView([17.55, -99.50], 8);
        return;
    }

    const latLngs = stops.map(stop => [stop.lat, stop.lng]);
    routeFullLayer = L.layerGroup().addTo(routeFullMap);

    // Linea de respaldo visible siempre. Asi el mapa grande nunca queda sin ruta.
    if (latLngs.length > 1) {
        addRouteFullLine(latLngs, { color: '#ffffff', weight: 9, opacity: .95, interactive: false });
        addRouteFullLine(latLngs, { color: '#f59e0b', weight: 5, opacity: .95, dashArray: '10 7', interactive: false });
    }

    stops.forEach((stop, index) => {
        const orderNum = index + 1;
        const dayAbbr = stop.scheduledDate ? formatCalendarDate(stop.scheduledDate).slice(0, 3) : '';
        const marker = L.marker([stop.lat, stop.lng], {
            icon: L.divIcon({
                html: `<div class="route-map-marker" style="${dayAbbr && weeklyRouteSelectedDay === 'all' ? 'height:34px;width:34px;font-size:11px;' : ''}">${orderNum}${dayAbbr && weeklyRouteSelectedDay === 'all' ? `<span style="display:block;font-size:7px;line-height:1;opacity:.85">${escapeHtml(dayAbbr)}</span>` : ''}</div>`,
                className: '',
                iconSize: [34, 34],
                iconAnchor: [17, 17]
            }),
            zIndexOffset: 1000
        }).addTo(routeFullMap);
        marker.bindTooltip(`${orderNum}. ${escapeHtml(stop.name || 'Parada')}${dayAbbr ? ` (${dayAbbr})` : ''}`, { permanent: true, direction: 'right', offset: [12, 0], className: 'plan-map-stop-label' });
        marker.bindPopup(getRouteFullPopupHtml({ ...stop, order: orderNum }), { maxWidth: 420, className: 'route-map-popup' });
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

    if (stops.length === 1) return;

    try {
        const route = await fetchRoadRouteChunked(stops, 24);

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
        const lat = safeFloat(eq.lat);
        const lng = safeFloat(eq.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const st = getPlanningMapStatus('equipment', eq.id);
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

async function fetchOsrmRoute(points) {
    const validPoints = (points || [])
        .map(point => ({ lat: safeFloat(point.lat), lng: safeFloat(point.lng) }))
        .filter(point => !isNaN(point.lat) && !isNaN(point.lng));
    if (validPoints.length < 2) throw new Error('Sin puntos suficientes');

    const coords = validPoints.map(point => `${point.lng},${point.lat}`).join(';');
    const baseUrl = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false&continue_straight=false`;
    const unlimited = validPoints.map(() => 'unlimited').join(';');
    const radiuses = validPoints.map(() => 100000).join(';');
    const urls = [`${baseUrl}&radiuses=${unlimited}`, `${baseUrl}&radiuses=${radiuses}`, baseUrl];

    let lastError = null;
    for (const url of urls) {
        // Si la URL es demasiado larga el servidor la puede rechazar, omitir
        if (url.length > 8000) {
            lastError = new Error('URL demasiado larga para OSRM');
            continue;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        try {
            const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`OSRM ${res.status}`);
            const data = await res.json();
            if (data.routes && data.routes[0]) return data.routes[0];
            lastError = new Error('Sin ruta por carretera');
        } catch (e) {
            clearTimeout(timeoutId);
            lastError = e;
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
    try {
        const fullRoute = await fetchOsrmRoute(routedPoints);
        return { ...fullRoute, partial: false, directLegs: 0 };
    } catch (e) {
        // Si una parada rompe la ruta completa, calculamos carretera tramo por tramo.
    }

    const features = [];
    let distance = 0;
    let duration = 0;
    let roadLegs = 0;
    let directLegs = 0;

    for (let i = 0; i < routedPoints.length - 1; i++) {
        const from = routedPoints[i];
        const to = routedPoints[i + 1];
        try {
            const leg = await fetchOsrmRoute([from, to]);
            features.push({ type: 'Feature', geometry: leg.geometry, properties: { kind: 'road' } });
            distance += Number(leg.distance || 0);
            duration += Number(leg.duration || 0);
            roadLegs++;
        } catch (e) {
            features.push({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [[from.lng, from.lat], [to.lng, to.lat]] },
                properties: { kind: 'direct' }
            });
            directLegs++;
        }
    }

    // Si todos los tramos fallan, no lanzamos error. Retornamos las lineas directas.
    return {
        geometry: { type: 'FeatureCollection', features },
        distance,
        duration,
        partial: directLegs > 0,
        directLegs
    };
}

async function fetchRoadRouteChunked(points, chunkSize = 24) {
    const validPoints = (points || [])
        .map(point => ({ lat: safeFloat(point.lat), lng: safeFloat(point.lng) }))
        .filter(point => !isNaN(point.lat) && !isNaN(point.lng));
    if (validPoints.length < 2) throw new Error('Sin puntos suficientes');
    if (validPoints.length <= chunkSize) return fetchRoadRoute(validPoints, chunkSize);

    const features = [];
    let distance = 0;
    let duration = 0;
    let partial = false;
    let directLegs = 0;

    for (let start = 0; start < validPoints.length - 1; start += chunkSize - 1) {
        const segment = validPoints.slice(start, Math.min(start + chunkSize, validPoints.length));
        if (segment.length < 2) continue;
        const route = await fetchRoadRoute(segment, chunkSize);
        distance += Number(route.distance || 0);
        duration += Number(route.duration || 0);
        partial = partial || !!route.partial;
        directLegs += Number(route.directLegs || 0);
        if (route.geometry?.type === 'FeatureCollection') {
            features.push(...(route.geometry.features || []));
        } else if (route.geometry) {
            features.push({ type: 'Feature', geometry: route.geometry, properties: { kind: route.partial ? 'partial' : 'road' } });
        }
    }

    if (!features.length) throw new Error('Sin ruta por carretera');
    return {
        geometry: { type: 'FeatureCollection', features },
        distance,
        duration,
        partial,
        directLegs
    };
}

async function drawRoadRoute(points, renderId = planRouteRenderId) {
    const fallback = () => {
        if (renderId !== planRouteRenderId) return;
        planRouteLayer = L.polyline(points.map(p => [p.lat, p.lng]), {
            color: '#0984e3',
            weight: 4,
            opacity: 0.7,
            dashArray: '10 8'
        }).addTo(planMap);
        fitPlanMapView(points);
    };

    try {
        const route = await fetchRoadRoute(points, 25);
        if (renderId !== planRouteRenderId) return;

        planRouteLayer = L.layerGroup().addTo(planMap);
        L.geoJSON(route.geometry, {
            style: { color: '#ffffff', weight: 9, opacity: 0.92, lineCap: 'round', lineJoin: 'round' }
        }).addTo(planRouteLayer);
        L.geoJSON(route.geometry, {
            style: { color: '#0b63ce', weight: 5, opacity: 0.96, lineCap: 'round', lineJoin: 'round' }
        }).addTo(planRouteLayer);
        fitPlanMapView(points);

        const km = (route.distance / 1000).toFixed(1);
        const min = Math.round(route.duration / 60);
    } catch (e) {
        if (renderId !== planRouteRenderId) return;
        fallback();
        if (!planMapExpanded && !isTechnicianPlanView()) notify('No se pudo calcular carretera; se trazo directo', 'err');
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
                    <p id="plan-fullscreen-route-info">Arrastra, haz zoom y revisa paradas/antenas sin recargar la página.</p>
                    <span id="plan-fullscreen-catalog-info" class="plan-fullscreen-catalog-info"></span>
                </div>
                <div class="plan-fullscreen-actions">
                    <button class="btn bgh" id="plan-fullscreen-names-btn" type="button" onclick="togglePlanFullscreenNames()">Ver nombres</button>
                    <button class="btn bgh" id="plan-fullscreen-stop-names-btn" type="button" onclick="togglePlanFullscreenStopNames()">Ver nombres de paradas</button>
                    <button class="btn bc" type="button" onclick="renderPlanFullscreenMap(true)">Ajustar</button>
                    <button class="btn bgh" type="button" onclick="closePlanFullMap()">Cerrar</button>
                </div>
            </div>
            <div id="plan-fullscreen-map" class="plan-fullscreen-map"></div>
            <div class="plan-map-legend plan-fullscreen-legend">
                <span><i style="background:#0984e3"></i> Ruta del plan</span>
                <span><i class="plan-legend-square"></i> Antena</span>
                <span><i class="plan-legend-circle"></i> Nodo / pueblo</span>
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
        pane.style.zIndex = 640;
        pane.style.pointerEvents = 'none';
    }
    if (!planFullscreenMap.getPane('planFullscreenRoutePane')) {
        const pane = planFullscreenMap.createPane('planFullscreenRoutePane');
        pane.style.zIndex = 650;
        pane.style.pointerEvents = 'none';
    }
}

function openPlanFullscreenMap() {
    const modal = ensurePlanFullscreenModal();
    // Cada apertura empieza limpia: los nombres se pueden activar despues sin
    // tapar los puntos mientras Leaflet ajusta todas las ubicaciones.
    planFullscreenNamesVisible = false;
    planFullscreenStopNamesVisible = false;
    modal.style.display = '';
    modal.style.pointerEvents = '';
    modal.classList.add('open');
    document.body.classList.add('plan-fullscreen-open');

    setTimeout(() => {
        if (!planFullscreenMap) {
            planFullscreenMap = L.map('plan-fullscreen-map', {
                zoomControl: true
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
    if (el) el.textContent = message || 'Arrastra, haz zoom y revisa paradas/antenas sin recargar la página.';
}

function applyPlanFullscreenNamesVisibility() {
    const mapEl = document.getElementById('plan-fullscreen-map');
    if (mapEl) {
        mapEl.classList.toggle('plan-entity-names-hidden', !planFullscreenNamesVisible);
        mapEl.classList.toggle('plan-stop-names-hidden', !planFullscreenStopNamesVisible);
    }
    const btn = document.getElementById('plan-fullscreen-names-btn');
    if (btn) btn.textContent = planFullscreenNamesVisible ? 'Ocultar nombres' : 'Ver nombres';
    const stopBtn = document.getElementById('plan-fullscreen-stop-names-btn');
    if (stopBtn) stopBtn.textContent = planFullscreenStopNamesVisible ? 'Ocultar nombres de paradas' : 'Ver nombres de paradas';
    if (planFullscreenMarkerLayer && typeof planFullscreenMarkerLayer.eachLayer === 'function') {
        planFullscreenMarkerLayer.eachLayer(marker => {
            if (!marker?.getTooltip) return;
            if (marker._planLabelType === 'entity') {
                if (planFullscreenNamesVisible) marker.openTooltip();
                else marker.closeTooltip();
            }
            if (marker._planLabelType === 'stop') {
                if (planFullscreenStopNamesVisible) marker.openTooltip();
                else marker.closeTooltip();
            }
        });
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

function addFullscreenRouteLine(layer) {
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
    if (!planFullscreenMap || !latLngs?.length) return;
    if (planFullscreenDirectRouteLayer) {
        planFullscreenMap.removeLayer(planFullscreenDirectRouteLayer);
        planFullscreenDirectRouteLayer = null;
    }
    planFullscreenDirectRouteLayer = L.layerGroup().addTo(planFullscreenMap);
    L.polyline(latLngs, {
        color: '#ffffff',
        weight: 13,
        opacity: 0.98,
        interactive: false
    }).addTo(planFullscreenDirectRouteLayer);
    L.polyline(latLngs, {
        color: '#0b84d8',
        weight: 7,
        opacity: 1,
        dashArray: '10 7',
        interactive: false
    }).addTo(planFullscreenDirectRouteLayer);
    if (typeof planFullscreenDirectRouteLayer.bringToFront === 'function') planFullscreenDirectRouteLayer.bringToFront();
}

function getDrivingDirectionsUrl(stops) {
    const points = (stops || [])
        .map(stop => ({ lat: safeFloat(stop.lat), lng: safeFloat(stop.lng) }))
        .filter(point => !isNaN(point.lat) && !isNaN(point.lng));
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

function makePlanPointIcon(color, label = '', shape = 'circle') {
    return L.divIcon({
        html: `<div class="plan-fullscreen-point-marker plan-point-${shape === 'square' ? 'square' : 'circle'}" style="--point-color:${escapeAttr(color || '#22c55e')}">${escapeHtml(label || '')}</div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
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

async function drawFullscreenOrderedRoute(stops, renderId) {
    if (!planFullscreenMap) return;
    ensurePlanFullscreenPanes();
    if (!planFullscreenRouteLayer) planFullscreenRouteLayer = L.layerGroup().addTo(planFullscreenMap);
    if (!stops || stops.length < 2) {
        setFullscreenRouteInfo(stops?.length ? 'Una sola parada en el plan.' : 'Sin paradas para trazar ruta.');
        return;
    }

    const latLngs = stops
        .map(stop => [safeFloat(stop.lat), safeFloat(stop.lng)])
        .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
    if (latLngs.length < 2) return;

    setFullscreenRouteInfo(`Calculando ruta por carretera en orden de numeracion: ${stops.length} paradas...`);
    planFullscreenRouteLayer.clearLayers();
    setFullscreenDirectRoute(latLngs);

    try {
        const route = await fetchRoadRouteChunked(stops, 24);
        if (renderId !== planFullscreenRouteRenderId) return;

        planFullscreenRouteLayer.clearLayers();
        if (planFullscreenDirectRouteLayer) {
            planFullscreenMap.removeLayer(planFullscreenDirectRouteLayer);
            planFullscreenDirectRouteLayer = null;
        }

        const roadOutline = addFullscreenRouteLine(L.geoJSON(route.geometry, {
            style: {
                color: '#ffffff',
                weight: 13,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round'
            },
            interactive: false
        }));
        addFullscreenRouteLine(L.geoJSON(route.geometry, {
            style: {
                color: '#075eaa',
                weight: 7,
                opacity: 0.98,
                lineCap: 'round',
                lineJoin: 'round'
            },
            interactive: false
        }));
        addFullscreenRouteLine(L.geoJSON(route.geometry, {
            style: {
                color: '#00a3ff',
                weight: 3,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round'
            },
            interactive: false
        }));
        const km = (route.distance / 1000).toFixed(1);
        const min = Math.round(route.duration / 60);
        setFullscreenRouteInfo(`Ruta por carretera en orden de numeracion: ${km} km - ${min} min - ${stops.length} paradas.`);
        const roadBounds = roadOutline?.getBounds?.();
        return roadBounds?.isValid?.() ? roadBounds : null;
    } catch (e) {
        if (renderId !== planFullscreenRouteRenderId) return;
        setFullscreenRouteInfo('Ruta directa en orden de numeracion. No se pudo calcular carretera.');
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

    // Primero dibujamos la ruta en el orden exacto de la numeración.
    const roadRouteBounds = await drawFullscreenOrderedRoute(stops, renderId);
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
        const marker = L.marker([lat, lng], {
            icon: makePlanPointIcon(st.color, '', 'square'),
            zIndexOffset: existingStop ? 900 : 100
        }).addTo(planFullscreenMarkerLayer);
        marker._planLabelType = 'entity';
        marker.bindTooltip(`${eq.name || 'Antena'}${eq.ip ? ` · ${eq.ip}` : ''}`, { direction: 'top', offset: [0, -8], permanent: false, className: 'plan-map-name-label' });
        marker.bindPopup(`
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
        addBound(lat, lng);
    });

    mapNodes.forEach(node => {
        const existingStop = stopByNodeId.get(node.id);
        const lat = safeFloat(node.lat);
        const lng = safeFloat(node.lng);
        if (isNaN(lat) || isNaN(lng)) return;
        const st = getPlanningMapStatus('node', node.id);
        const marker = L.marker([lat, lng], {
            icon: makePlanPointIcon(st.color || '#22c55e', '', 'circle'),
            zIndexOffset: existingStop ? 900 : 80
        }).addTo(planFullscreenMarkerLayer);
        marker._planLabelType = 'entity';
        marker.bindTooltip(getNodeLabel(node) || 'Nodo', { direction: 'top', offset: [0, -8], permanent: false, className: 'plan-map-name-label' });
        marker.bindPopup(`
            <div style="min-width:220px;font-family:'Manrope',sans-serif">
                <div style="font-weight:900;font-size:13px;margin-bottom:4px">${escapeHtml(getNodeLabel(node) || 'Nodo')}</div>
                <div style="font-size:11px;color:#64748b">${escapeHtml(getZoneLabel(node.zone || node.region || ''))}</div>
                <div style="margin:8px 0"><span class="badge" style="background:${st.color};color:#fff">${escapeHtml(st.label || 'Nodo')}</span></div>
                ${renderMapEntityDetailStats('node', node.id)}
                ${!canManagePlanStops() ? '' : (existingStop
                    ? `<button class="btn bsm br" style="margin-top:10px;width:100%" onclick="removeStopFromFullscreen('${escapeAttr(existingStop.mapDay || selectedDay)}','${escapeAttr(existingStop.id)}')">Quitar parada</button>`
                    : `<button class="btn bsm bc" style="margin-top:10px;width:100%" onclick="addNodeStopFromMap('${escapeAttr(node.id)}'); setTimeout(() => renderPlanFullscreenMap(true), 180)">Agregar parada</button>`)}
            </div>
        `);
        addBound(lat, lng);
    });

    stops.forEach((stop, index) => {
        const detailsHtml = renderFullscreenStopDetails(stop);
        const marker = L.marker([stop.lat, stop.lng], {
            icon: L.divIcon({
                html: `<div class="plan-fullscreen-stop-marker">${index + 1}</div>`,
                className: '',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            }),
            zIndexOffset: 1100
        }).addTo(planFullscreenMarkerLayer);
        marker._planLabelType = 'stop';
        marker.bindTooltip(`${index + 1}. ${escapeHtml(stop.name || 'Parada')}`, { permanent: true, direction: 'right', offset: [14, 0], className: 'plan-map-stop-label' });
        marker.bindPopup(`
            <div class="plan-map-popup plan-map-popup-wide">
                <strong>${index + 1}. ${escapeHtml(stop.name || 'Parada')}</strong>
                <div style="font-size:11px;color:#64748b;margin-bottom:8px">${safeFloat(stop.lat).toFixed(5)}, ${safeFloat(stop.lng).toFixed(5)}</div>
                ${stop.materialPlanned ? `<div class="plan-popup-material"><b>Material estimado:</b> ${escapeHtml(stop.materialPlanned)}</div>` : ''}
                <label>Detalles de la parada</label>
                ${detailsHtml}
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
        if (roadRouteBounds?.isValid?.()) completeBounds.extend(roadRouteBounds);
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
    setTimeout(() => planFullscreenMap.invalidateSize(true), 60);
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
    if (isPlanReadOnly()) return SHARED_PLAN_ID;
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
    const day = selectedTechId === SHARED_PLAN_ID ? 'general' : selectedDay;
    const stops = getPlanStopsForView(day)
        .filter(stop => !stop.deletedAt)
        .sort((a, b) => String(a.scheduledDate || '9999').localeCompare(String(b.scheduledDate || '9999')));
    return stops.map((stop, index) => {
        const equipment = stop.equipmentId ? (state.equipment || []).find(item => item.id === stop.equipmentId && !item.deletedAt) : null;
        const node = stop.nodeId ? (state.nodes || []).find(item => item.id === stop.nodeId && !item.deletedAt) : null;
        return { ...stop, ...getStopCurrentPosition(stop), mapDay:day, mapIndex:index, mapLabel:`${index + 1}. ${isTechnicianPlanView() ? getTechnicianStopName(stop, equipment, node) : (stop.name || 'Parada')}` };
    });
}

function openTechnicianCompletionForm(detailId) {
    if (!isTechnicianPlanView()) return;
    const detail = (state.workOrders || []).find(item => item.id === detailId && !item.deletedAt);
    if (!detail) return notify('No se encontró el detalle.', 'err');
    const editingCompleted = detail.status === 'completada';
    technicianCompletionDetailId = detailId;
    technicianCompletionPhotos = getAdminTechReportPhotos(detail.technicianReport || {}).slice(0, 6);
    let modal = document.getElementById('tech-completion-mo');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `<div class="mo" id="tech-completion-mo"><div class="md tech-installation-modal tech-completion-modal"><div class="tech-installation-head"><div><div class="mt2">Terminar detalle</div><small>Completa el reporte antes de marcar el trabajo como terminado.</small></div><button class="btn bsm bgh" type="button" onclick="CM('tech-completion-mo')">Cerrar</button></div><div class="row2"><div class="fi"><label>Nombre del cliente</label><input id="tech-completion-client" placeholder="Nombre completo"></div><div class="fi"><label>Número telefónico</label><input id="tech-completion-phone" type="tel" inputmode="tel" placeholder="Ej. 747 123 4567"></div></div><div class="fi"><label>Ubicación en coordenadas</label><div class="tech-coordinate-row"><input id="tech-completion-location" class="mono" placeholder="18.09563, -99.19604"><button class="btn bgh" type="button" onclick="useCurrentTechnicianCoordinates()">Usar mi ubicación</button></div></div><div class="fi"><label>¿Qué se hizo en el detalle?</label><textarea id="tech-completion-work" rows="4" placeholder="Describe el trabajo realizado"></textarea></div><div class="fi"><label>Observaciones <span class="optional-label">Opcional</span></label><textarea id="tech-completion-notes" rows="3" placeholder="Observaciones adicionales"></textarea></div><div class="tech-evidence-box"><strong>Evidencias obligatorias</strong><small>Agrega al menos una fotografía. Máximo 6.</small><div class="tech-evidence-actions"><label class="btn bc">Tomar foto<input type="file" accept="image/*" capture="environment" onchange="addTechnicianCompletionPhotos(this.files);this.value=''" hidden></label><label class="btn bgh">Seleccionar de galería<input type="file" accept="image/*" multiple onchange="addTechnicianCompletionPhotos(this.files);this.value=''" hidden></label></div><div id="tech-completion-evidence-preview" class="tech-install-evidence-preview"></div></div><button class="btn bc bfu" type="button" onclick="saveTechnicianCompletion()">Guardar y marcar como terminado</button></div></div>`);
        modal = document.getElementById('tech-completion-mo');
    }
    const completionPhone = document.getElementById('tech-completion-phone');
    const completionPhoneLabel = completionPhone?.closest('.fi')?.querySelector('label');
    if (completionPhoneLabel) completionPhoneLabel.innerHTML = 'Numero telefonico <span class="optional-label">Opcional</span>';
    if (completionPhone) completionPhone.placeholder = 'Ej. 747 123 4567 (opcional)';
    const modalTitle = modal.querySelector('.tech-installation-head .mt2');
    const modalSubtitle = modal.querySelector('.tech-installation-head small');
    const saveButton = modal.querySelector('.tech-completion-modal > button:last-child');
    if (modalTitle) modalTitle.textContent = editingCompleted ? 'Editar detalle terminado' : 'Terminar detalle';
    if (modalSubtitle) modalSubtitle.textContent = editingCompleted
        ? 'Corrige la información necesaria. Se registrará la fecha y hora de modificación.'
        : 'Completa el reporte antes de marcar el trabajo como terminado.';
    if (saveButton) saveButton.textContent = editingCompleted ? 'Guardar modificaciones' : 'Guardar y marcar como terminado';
    document.getElementById('tech-completion-client').value = detail.clientName || '';
    document.getElementById('tech-completion-phone').value = detail.clientPhone || detail.phone || detail.technicianReport?.phone || '';
    document.getElementById('tech-completion-location').value = detail.detailLocation || (!isNaN(safeFloat(detail.lat)) && !isNaN(safeFloat(detail.lng)) ? `${detail.lat}, ${detail.lng}` : '');
    document.getElementById('tech-completion-work').value = detail.technicianReport?.solution || '';
    document.getElementById('tech-completion-notes').value = detail.technicianReport?.observations || '';
    renderTechnicianCompletionPhotos();
    OM('tech-completion-mo');
}

function useCurrentTechnicianCoordinates() {
    if (!navigator.geolocation) return notify('Este dispositivo no permite obtener la ubicación.', 'err');
    navigator.geolocation.getCurrentPosition(position => {
        const input = document.getElementById('tech-completion-location');
        if (input) input.value = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
    }, () => notify('No se pudo obtener la ubicación. Revisa el permiso de ubicación.', 'err'), { enableHighAccuracy:true, timeout:12000 });
}

async function addTechnicianCompletionPhotos(fileList) {
    const files = Array.from(fileList || []).filter(file => /^image\//i.test(file.type));
    const available = Math.max(0, 6 - technicianCompletionPhotos.length);
    if (!available) return notify('Puedes agregar máximo 6 fotografías.', 'err');
    for (const file of files.slice(0, available)) {
        try { technicianCompletionPhotos.push(await compressTechnicianPhoto(file)); }
        catch (error) { notify(`No se pudo leer ${file.name || 'una foto'}.`, 'err'); }
    }
    if (files.length > available) notify('Sólo se agregaron las primeras 6 fotografías.', 'err');
    renderTechnicianCompletionPhotos();
}

function renderTechnicianCompletionPhotos() {
    const box = document.getElementById('tech-completion-evidence-preview');
    if (!box) return;
    box.innerHTML = technicianCompletionPhotos.length
        ? technicianCompletionPhotos.map((photo, index) => `<div><img src="${photo}" alt="Evidencia ${index + 1}"><button type="button" onclick="removeTechnicianCompletionPhoto(${index})" aria-label="Eliminar foto">×</button></div>`).join('')
        : '<span>Debes agregar al menos una fotografía.</span>';
}

function removeTechnicianCompletionPhoto(index) {
    technicianCompletionPhotos.splice(index, 1);
    renderTechnicianCompletionPhotos();
}

async function saveTechnicianCompletion() {
    const detail = (state.workOrders || []).find(item => item.id === technicianCompletionDetailId && !item.deletedAt);
    if (!detail) return notify('No se encontró el detalle.', 'err');
    const editingCompleted = detail.status === 'completada';
    const previousReport = detail.technicianReport || {};
    const originalCompletedAt = detail.completedAt || previousReport.completedAt || '';
    const clientName = document.getElementById('tech-completion-client')?.value.trim() || '';
    const phone = document.getElementById('tech-completion-phone')?.value.trim() || '';
    const location = document.getElementById('tech-completion-location')?.value.trim() || '';
    const workDone = document.getElementById('tech-completion-work')?.value.trim() || '';
    const observations = document.getElementById('tech-completion-notes')?.value.trim() || '';
    const coordinates = location.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!clientName) return notify('Escribe el nombre del cliente.', 'err');
    if (!coordinates || Math.abs(Number(coordinates[1])) > 90 || Math.abs(Number(coordinates[2])) > 180) return notify('Escribe coordenadas válidas, por ejemplo: 18.09563, -99.19604.', 'err');
    if (!workDone) return notify('Describe qué se hizo en el detalle.', 'err');
    if (!technicianCompletionPhotos.length) return notify('Debes agregar al menos una evidencia fotográfica.', 'err');

    const confirmMsg = editingCompleted
        ? '¿Confirma que desea guardar las modificaciones realizadas al reporte de este servicio?'
        : '¿Confirma que este detalle de servicio ha sido solucionado satisfactoriamente?';
    if (!window.confirm(confirmMsg)) return;

    const now = new Date().toISOString();
    const actor = getCurrentUser();
    detail.clientName = clientName;
    detail.clientPhone = phone;
    detail.detailLocation = `${Number(coordinates[1]).toFixed(6)}, ${Number(coordinates[2]).toFixed(6)}`;
    detail.lat = Number(coordinates[1]);
    detail.lng = Number(coordinates[2]);
    detail.status = 'completada';
    detail.folio = getDetailFolio(detail);
    detail.completedAt = editingCompleted && originalCompletedAt ? originalCompletedAt : now;
    detail.updatedAt = now;
    if (editingCompleted) detail.modifiedAt = now;
    detail.technicianReport = {
        ...previousReport,
        result:'terminado',
        solution:workDone,
        observations,
        reason:'',
        phone,
        location:detail.detailLocation,
        evidencePhotos:technicianCompletionPhotos.slice(),
        completedAt:detail.completedAt,
        completedBy:previousReport.completedBy || actor.id || '',
        completedByName:previousReport.completedByName || actor.name || actor.username || '',
        ...(editingCompleted ? { modifiedAt:now, modifiedBy:actor.id || '', modifiedByName:actor.name || actor.username || '' } : {})
    };
    setUpdatedAudit(detail, editingCompleted ? 'modificó detalle terminado' : 'marcó detalle hecho con evidencia');
    getPlanMapStops().forEach(stop => {
        if ((stop.detailIds || []).includes(detail.id) || (stop.equipmentId && stop.equipmentId === detail.equipmentId)) {
            syncStopCompletion(stop);
            stop.updatedAt = now;
        }
    });
    const saved = await saveDB();
    if (!saved) return notify('No se pudo guardar el reporte en la nube.', 'err');
    CM('tech-completion-mo');
    technicianCompletionPhotos = [];
    technicianCompletionDetailId = '';
    renderPlan();
    openTechnicianCompletionSummary(detail);
    notify(editingCompleted ? `Reporte de solución actualizado satisfactoriamente (${formatPlanDateTime(now)}).` : 'Detalle concluido y reporte registrado satisfactoriamente.', 'ok');
}

function openTechnicianCompletionSummary(detail) {
    const date = selectedCalendarDate || localDateKey();
    const dayStops = getPlanStopsForView('general').filter(stop => stop.scheduledDate === date);
    const detailsById = new Map();
    dayStops.forEach(stop => {
        getStopDetails(stop).forEach(item => detailsById.set(item.id, item));
        getStopResolvedHistory(stop).forEach(item => detailsById.set(item.id, item));
    });
    const dayDetails = Array.from(detailsById.values());
    const completed = dayDetails.filter(item => ['completada','no_realizado'].includes(item.status || '')).length;
    const pending = Math.max(0, dayDetails.length - completed);
    const report = detail.technicianReport || {};
    const requestedDetail = getTechnicianReportRequestedText(detail);
    const completedWork = getTechnicianReportCompletedWork(detail, requestedDetail);
    const town = getTechnicianReportTown(detail);
    const photos = getAdminTechReportPhotos(report);
    const user = getCurrentUser();
    let modal = document.getElementById('tech-completion-summary-mo');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', '<div class="mo tech-completion-summary-mo" id="tech-completion-summary-mo"><div class="tech-completion-summary-card" id="tech-completion-summary-card"></div></div>');
        modal = document.getElementById('tech-completion-summary-mo');
    }
    const card = document.getElementById('tech-completion-summary-card');
    if (!card) return;
    card.innerHTML = `<div class="tech-summary-report-head"><span class="tech-summary-report-check">✓</span><div><small>REPORTE DE AVANCE</small><h2>Detalle terminado</h2></div></div>
        <div class="tech-summary-report-progress"><strong>${completed} de ${dayDetails.length}</strong><span>detalles completados hoy</span><b>${pending} pendiente${pending === 1 ? '' : 's'}</b></div>
        <div class="tech-summary-report-grid">
            <div><small>Técnico</small><strong>${escapeHtml(user.name || user.nombre || user.username || 'Técnico')}</strong></div>
            <div><small>Fecha y hora</small><strong>${escapeHtml(new Date(report.completedAt || detail.completedAt || Date.now()).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'}))}</strong></div>
            ${report.modifiedAt || detail.modifiedAt ? `<div><small>Última modificación</small><strong>${escapeHtml(formatPlanDateTime(report.modifiedAt || detail.modifiedAt))}</strong></div>` : ''}
            <div><small>Cliente</small><strong>${escapeHtml(detail.clientName || 'Sin nombre')}</strong></div>
            <div><small>Pueblo o comunidad</small><strong>${escapeHtml(town)}</strong></div>
            <div><small>Ubicación</small><strong>${escapeHtml(detail.detailLocation || report.location || 'Sin ubicación')}</strong></div>
        </div>
        <div class="tech-summary-report-detail tech-summary-report-attended"><small>Detalle atendido</small><span class="tech-summary-folio">${escapeHtml(getDetailFolio(detail))}</span><strong>${escapeHtml(requestedDetail)}</strong></div>
        ${completedWork ? `<div class="tech-summary-report-detail"><small>Trabajo realizado</small><strong>${escapeHtml(completedWork)}</strong></div>` : ''}
        ${report.observations ? `<div class="tech-summary-report-detail"><small>Observaciones</small><strong>${escapeHtml(report.observations)}</strong></div>` : ''}
        ${photos.length ? `<div class="tech-summary-report-photos">${photos.slice(0,4).map((photo,index) => `<img src="${escapeAttr(photo)}" alt="Evidencia ${index + 1}">`).join('')}</div>` : ''}
        <div class="tech-summary-report-footer"><span>WiFiMex · Avance del ${escapeHtml(formatCalendarDate(date))}</span><div><button type="button" class="btn bgh" onclick="copyTechnicianOrderNumber('${escapeAttr(detail.id)}')">Copiar orden</button><button type="button" class="btn tech-whatsapp-share" onclick="shareTechnicianCompletion('${escapeAttr(detail.id)}')">Compartir evidencia</button><button type="button" class="btn bgh" onclick="CM('tech-completion-summary-mo')">Cerrar</button></div></div>`;
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
    return getWorkOrderRequestedText(detail, detail?.title || 'Detalle');
}

function technicianReportTextsMatch(left, right) {
    const key = value => normalizeName(typeof repairDisplayText === 'function' ? repairDisplayText(value) : value)
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
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
    });
}

async function createTechnicianSummaryImage(detail) {
    const report = detail.technicianReport || {};
    const user = getCurrentUser();
    const isInstallation = detail.category === 'instalacion';
    const requestedDetail = getTechnicianReportRequestedText(detail);
    const completedWork = getTechnicianReportCompletedWork(detail, requestedDetail);
    const town = getTechnicianReportTown(detail);
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1700;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#eaf4fb'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(54, 48, 972, canvas.height - 96);
    ctx.fillStyle = '#0aa35d'; ctx.beginPath(); ctx.arc(126, 130, 48, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 52px sans-serif'; ctx.fillText('✓', 108, 148);
    ctx.fillStyle = '#0874e8'; ctx.font = 'bold 23px sans-serif'; ctx.fillText(isInstallation ? 'NUEVA ORDEN REGISTRADA' : 'REPORTE DE AVANCE', 202, 107);
    ctx.fillStyle = '#10264a'; ctx.font = 'bold 48px sans-serif'; ctx.fillText(isInstallation ? 'Nueva instalación' : 'Detalle terminado', 202, 162);
    ctx.fillStyle = '#d8e7f2'; ctx.fillRect(84, 204, 912, 2);
    const fields = isInstallation ? [
        ['NÚMERO DE ORDEN', getDetailFolio(detail)],
        ['TÉCNICO', report.completedByName || user.name || user.username || 'Técnico'],
        ['FECHA Y HORA', new Date(detail.createdAt || Date.now()).toLocaleString('es-MX')],
        ['CLIENTE', detail.clientName || 'Sin nombre'],
        ['TELÉFONO', detail.clientPhone || 'Sin teléfono'],
        ['PUEBLO O COMUNIDAD', town],
        ['UBICACIÓN', detail.detailLocation || 'Sin ubicación'],
        ['DETALLES DE LA INSTALACIÓN', report.solution || 'Sin observaciones adicionales']
    ] : [
        ['FOLIO DEL DETALLE', getDetailFolio(detail)],
        ['TÉCNICO', user.name || user.nombre || user.username || 'Técnico'],
        ['FECHA Y HORA', new Date(report.completedAt || detail.completedAt || Date.now()).toLocaleString('es-MX')],
        ['CLIENTE', detail.clientName || 'Sin nombre'],
        ['PUEBLO O COMUNIDAD', town],
        ['UBICACIÓN', detail.detailLocation || report.location || 'Sin ubicación'],
        ['DETALLE ATENDIDO', requestedDetail],
        ...(completedWork ? [['TRABAJO REALIZADO', completedWork]] : [])
    ];
    let y = 244;
    fields.forEach(([label, value], index) => {
        const boxHeight = index >= (isInstallation ? 7 : 5) ? 132 : 104;
        ctx.fillStyle = index === 0 ? '#e9f4ff' : '#f8fbfe'; ctx.fillRect(84, y, 912, boxHeight);
        ctx.fillStyle = '#667b92'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(label, 108, y + 31);
        ctx.fillStyle = index === 0 ? '#0868bd' : '#10264a'; ctx.font = index === 0 ? 'bold 39px sans-serif' : 'bold 28px sans-serif';
        drawSummaryWrappedText(ctx, value, 108, y + 72, 852, 34, index >= (isInstallation ? 7 : 5) ? 2 : 1);
        y += boxHeight + 12;
    });
    const photos = getAdminTechReportPhotos(report).slice(0, 4);
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
    ctx.fillStyle = '#10264a'; ctx.font = 'bold 22px sans-serif'; ctx.fillText('WiFiMex · Reporte de servicio', 84, canvas.height - 37);
    return canvas;
}

async function copyTechnicianOrderNumber(detailId, announce = true) {
    const detail = (state.workOrders || []).find(item => item.id === detailId && !item.deletedAt);
    if (!detail) return false;
    const text = `Número de orden: ${getDetailFolio(detail)}`;
    try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
        else {
            const input = document.createElement('textarea');
            input.value = text;
            input.setAttribute('readonly', '');
            input.style.position = 'fixed';
            input.style.opacity = '0';
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            input.remove();
        }
        if (announce) notify(`${text} copiado.`);
        return true;
    } catch (error) {
        if (announce) notify('No se pudo copiar el número de orden.', 'err');
        return false;
    }
}

async function shareTechnicianCompletion(detailId) {
    const detail = (state.workOrders || []).find(item => item.id === detailId && !item.deletedAt);
    if (!detail) return;
    const folio = getDetailFolio(detail);
    const shareText = `Número de orden: ${folio}`;
    let canvas;
    let blob;
    try {
        canvas = await createTechnicianSummaryImage(detail);
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
    } catch (error) {
        return notify('No se pudo crear la imagen del resumen.', 'err');
    }
    if (!blob) return notify('No se pudo crear la imagen del resumen.', 'err');
    const file = new File([blob], `${folio}.png`, { type:'image/png' });
    const copied = await copyTechnicianOrderNumber(detailId, false);
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files:[file] }))) {
        try {
            await navigator.share({ title:`Detalle ${folio}`, text:shareText, files:[file] });
            if (copied) notify('Evidencia compartida. El número de orden también quedó copiado.');
            return;
        }
        catch (error) { if (error?.name === 'AbortError') return; }
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    notify(copied
        ? 'Imagen descargada y número de orden copiado. Ya puedes pegarlo en WhatsApp.'
        : 'Imagen descargada. Ya puedes enviarla por WhatsApp.');
}

function openTechnicianAddMenu() {
    let modal = document.getElementById('tech-add-menu-mo');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `<div class="mo" id="tech-add-menu-mo"><div class="md tech-add-menu-card"><div class="tech-installation-head"><div><div class="mt2">¿Qué quieres agregar?</div><small>Selecciona el tipo de registro.</small></div><button class="btn bsm bgh" onclick="CM('tech-add-menu-mo')">Cerrar</button></div><div class="tech-add-menu-options"><button type="button" onclick="CM('tech-add-menu-mo');openTechnicianInstallationForm('installation')"><svg class="tech-btn-svg" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><strong>Instalación nueva</strong><small>Registrar una orden nueva con folio NEW.</small></button><button type="button" onclick="CM('tech-add-menu-mo');openTechnicianInstallationForm('detail')"><svg class="tech-btn-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg><strong>Agregar detalle</strong><small>Guardar un trabajo completado en una parada.</small></button></div></div></div>`);
        modal = document.getElementById('tech-add-menu-mo');
    }
    setTechnicianNavActive(2);
    OM('tech-add-menu-mo');
}

function openTechnicianInstallationForm(mode = 'installation') {
    technicianNewEntryMode = mode === 'detail' ? 'detail' : 'installation';
    let modal = document.getElementById('tech-installation-mo');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `<div class="mo" id="tech-installation-mo"><div class="md tech-installation-modal"><div class="tech-installation-head"><div><div class="mt2">Nueva instalación</div><small id="tech-installation-day-label">Captura los datos y agrega evidencia fotográfica.</small></div><button class="btn bsm bgh" type="button" onclick="CM('tech-installation-mo')">Cerrar</button></div><div class="row2"><div class="fi"><label>Nombre de la persona</label><input id="tech-install-client" placeholder="Nombre completo"></div><div class="fi"><label>Número telefónico</label><input id="tech-install-phone" type="tel" inputmode="tel" placeholder="Ej. 747 123 4567"></div></div><div class="fi"><label>Dirección o ubicación</label><input id="tech-install-location" placeholder="Calle, colonia o enlace de Maps"></div><div class="fi"><label>Pueblo o comunidad</label><input id="tech-install-town" list="tech-install-town-options" placeholder="Selecciona una sugerencia o escribe otra localidad"><datalist id="tech-install-town-options"></datalist><small id="tech-install-town-help">Sugerencias basadas en las actividades del día.</small></div><div class="fi"><label>Descripción de la instalación <span class="optional-label">Opcional</span></label><textarea id="tech-install-detail" rows="4" placeholder="Equipo requerido, referencias u observaciones (opcional)"></textarea></div><div class="tech-evidence-box"><strong>Evidencia fotográfica</strong><small>Toma fotografías o selecciónalas desde el celular. Máximo 6.</small><div class="tech-evidence-actions"><label class="btn bc">Tomar foto<input type="file" accept="image/*" capture="environment" onchange="addTechnicianInstallationPhotos(this.files);this.value=''" hidden></label><label class="btn bgh">Subir fotos<input type="file" accept="image/*" multiple onchange="addTechnicianInstallationPhotos(this.files);this.value=''" hidden></label></div><div id="tech-install-evidence-preview" class="tech-install-evidence-preview"></div></div><button class="btn bc bfu" type="button" onclick="saveTechnicianInstallation()">Guardar nueva instalación</button></div></div>`);
        modal = document.getElementById('tech-installation-mo');
    }
    const installationPhone = document.getElementById('tech-install-phone');
    const installationPhoneLabel = installationPhone?.closest('.fi')?.querySelector('label');
    if (installationPhoneLabel) installationPhoneLabel.innerHTML = 'Numero telefonico <span class="optional-label">Opcional</span>';
    if (installationPhone) installationPhone.placeholder = 'Ej. 747 123 4567 (opcional)';
    technicianInstallationPhotos = [];
    technicianInstallationSelectedNodeId = '';
    configureTechnicianInstallationFields();
    configureTechnicianEntryMode();
    ['tech-install-client','tech-install-phone','tech-install-location','tech-install-town','tech-install-detail'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    renderTechnicianInstallationPhotos();
    renderTechnicianInstallationTownOptions();
    const dayLabel = document.getElementById('tech-installation-day-label');
    if (dayLabel) dayLabel.textContent = `Actividad del ${formatCalendarDate(selectedCalendarDate || localDateKey())}. Puedes elegir un pueblo sugerido o escribir otro.`;
    setTechnicianNavActive(2);
    OM('tech-installation-mo');
}

function configureTechnicianEntryMode() {
    const isDetail = technicianNewEntryMode === 'detail';
    const modal = document.getElementById('tech-installation-mo');
    const title = modal?.querySelector('.mt2');
    if (title) title.textContent = isDetail ? 'Agregar detalle completado' : 'Nueva instalación';
    const submit = modal?.querySelector('button.bfu');
    if (submit) submit.textContent = isDetail ? 'Guardar detalle completado' : 'Guardar nueva instalación';
    const descriptionLabel = document.getElementById('tech-install-detail')?.closest('.fi')?.querySelector('label');
    if (descriptionLabel) descriptionLabel.innerHTML = isDetail ? 'Trabajo realizado' : 'Descripción de la instalación <span class="optional-label">Opcional</span>';
    const clientField = document.getElementById('tech-install-client')?.closest('.row2');
    let stopBox = document.getElementById('tech-entry-stop-box');
    if (!stopBox && clientField) {
        clientField.insertAdjacentHTML('beforebegin', '<div class="fi" id="tech-entry-stop-box"><label>Parada donde se realizó</label><select id="tech-entry-stop"></select></div>');
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
    if (locationLabel) locationLabel.textContent = 'Coordenadas de la instalación';
    if (location) location.placeholder = 'Ej. 17.529973, -99.496335';
    if (locationBox && !document.getElementById('tech-install-use-location')) {
        location.insertAdjacentElement('afterend', Object.assign(document.createElement('button'), { id:'tech-install-use-location', type:'button', className:'btn bgh tech-install-location-button', textContent:'Usar mi ubicación' }));
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
    if (!navigator.geolocation) return notify('Este celular no permite obtener la ubicación.', 'err');
    const button = document.getElementById('tech-install-use-location');
    if (button) { button.disabled = true; button.textContent = 'Obteniendo ubicación...'; }
    navigator.geolocation.getCurrentPosition(position => {
        const field = document.getElementById('tech-install-location');
        if (field) field.value = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        if (button) { button.disabled = false; button.textContent = 'Ubicación agregada'; }
    }, () => {
        if (button) { button.disabled = false; button.textContent = 'Usar mi ubicación'; }
        notify('No se pudo obtener la ubicación. Revisa el permiso del navegador.', 'err');
    }, { enableHighAccuracy:true, timeout:12000, maximumAge:30000 });
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

function compressTechnicianPhoto(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            const image = new Image();
            image.onerror = reject;
            image.onload = () => {
                const max = 1600;
                const scale = Math.min(1, max / Math.max(image.width, image.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(image.width * scale));
                canvas.height = Math.max(1, Math.round(image.height * scale));
                canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', .78));
            };
            image.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

function renderTechnicianInstallationPhotos() {
    const box = document.getElementById('tech-install-evidence-preview');
    if (!box) return;
    box.innerHTML = technicianInstallationPhotos.length
        ? technicianInstallationPhotos.map((photo, index) => `<div><img src="${photo}" alt="Evidencia ${index + 1}"><button type="button" onclick="removeTechnicianInstallationPhoto(${index})" aria-label="Eliminar foto">×</button></div>`).join('')
        : '<span>Sin fotografías agregadas.</span>';
}

function removeTechnicianInstallationPhoto(index) {
    technicianInstallationPhotos.splice(index, 1);
    renderTechnicianInstallationPhotos();
}

async function saveTechnicianInstallation() {
    const isDetail = technicianNewEntryMode === 'detail';
    const stopId = document.getElementById('tech-entry-stop')?.value || '';
    const selectedStop = isDetail ? getPlanStopsForView('general').find(stop => stop.id === stopId) : null;
    const clientName = document.getElementById('tech-install-client')?.value.trim() || '';
    const phone = document.getElementById('tech-install-phone')?.value.trim() || '';
    const detailLocation = document.getElementById('tech-install-location')?.value.trim() || '';
    const enteredTown = document.getElementById('tech-install-town')?.value.trim() || '';
    const description = document.getElementById('tech-install-detail')?.value.trim() || '';
    const parsedLocation = typeof parseOptionalLocation === 'function' ? parseOptionalLocation(detailLocation) : {};
    const selectedNode = selectedStop?.nodeId ? (state.nodes || []).find(item => item.id === selectedStop.nodeId && !item.deletedAt) : null;
    const town = enteredTown || selectedNode?.town || selectedStop?.town || selectedStop?.name || '';
    if (isDetail && !selectedStop) return notify('Selecciona la parada donde realizaste el detalle.', 'err');
    if (isDetail && !description) return notify('Describe el trabajo realizado.', 'err');
    if (!clientName || !detailLocation || !town || !technicianInstallationPhotos.length) {
        notify('Completa nombre, ubicación, comunidad y agrega al menos una foto.', 'err');
        return;
    }
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
        description: `${phone ? `Teléfono: ${phone}` : ''}${phone && description ? '\n' : ''}${description}`,
        clientPhone: phone,
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
        lat: parsedLocation.lat || '',
        lng: parsedLocation.lng || '',
        requestedDate: selectedCalendarDate || localDateKey(),
        createdAt,
        technicianReport: {
            result: isDetail ? 'terminado' : 'solicitud_instalacion',
            solution: description,
            phone,
            location: detailLocation,
            town,
            completedByName: getCurrentUser()?.name || getCurrentUser()?.username || 'Técnico',
            completedAt: createdAt,
            evidencePhotos: technicianInstallationPhotos.slice()
        }
    };
    order.folio = getDetailFolio(order);
    setCreatedAudit(order, isDetail ? 'agregó detalle completado en parada' : 'registró nueva instalación');
    state.workOrders.push(order);
    if (isDetail && selectedStop && !(selectedStop.detailIds || []).includes(order.id)) selectedStop.detailIds = [...(selectedStop.detailIds || []), order.id];
    const saved = isDetail ? await saveDB() : await saveRecord('workOrders', order);
    if (!saved) {
        state.workOrders = state.workOrders.filter(item => item.id !== order.id);
        if (selectedStop) selectedStop.detailIds = (selectedStop.detailIds || []).filter(id => id !== order.id);
        notify('No se pudo guardar la solicitud.', 'err');
        return;
    }
    CM('tech-installation-mo');
    technicianInstallationPhotos = [];
    if (isDetail) {
        renderPlan();
        openTechnicianCompletionSummary(order);
    } else {
        openTechnicianInstallationSummary(order);
    }
}

function openTechnicianInstallationSummary(order) {
    const report = order.technicianReport || {};
    const photos = getAdminTechReportPhotos(report);
    let modal = document.getElementById('tech-installation-summary-mo');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', '<div class="mo tech-completion-summary-mo" id="tech-installation-summary-mo"><div class="tech-completion-summary-card" id="tech-installation-summary-card"></div></div>');
        modal = document.getElementById('tech-installation-summary-mo');
    }
    const card = document.getElementById('tech-installation-summary-card');
    card.innerHTML = `<div class="tech-summary-report-head"><span class="tech-summary-report-check">✓</span><div><small>NUEVA ORDEN REGISTRADA</small><h2>Nueva instalación</h2></div></div>
        <div class="tech-install-summary-folio"><small>Número de orden</small><strong>${escapeHtml(getDetailFolio(order))}</strong></div>
        <div class="tech-summary-report-grid"><div><small>Técnico</small><strong>${escapeHtml(report.completedByName || 'Técnico')}</strong></div><div><small>Fecha y hora</small><strong>${escapeHtml(new Date(order.createdAt).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'}))}</strong></div><div><small>Cliente</small><strong>${escapeHtml(order.clientName || 'Sin nombre')}</strong></div><div><small>Teléfono</small><strong>${escapeHtml(order.clientPhone || 'Sin teléfono')}</strong></div><div><small>Pueblo o comunidad</small><strong>${escapeHtml(order.town || 'Sin pueblo')}</strong></div><div><small>Ubicación</small><strong>${escapeHtml(order.detailLocation || 'Sin ubicación')}</strong></div></div>
        <div class="tech-summary-report-detail"><small>Detalles de la instalación</small><strong>${escapeHtml(report.solution || 'Sin observaciones adicionales')}</strong></div>
        ${photos.length ? `<div class="tech-summary-report-photos">${photos.slice(0,4).map((photo,index) => `<img src="${escapeAttr(photo)}" alt="Evidencia ${index + 1}">`).join('')}</div>` : ''}
        <div class="tech-summary-report-footer"><span>El administrador podrá programar esta orden.</span><div><button type="button" class="btn bgh" onclick="copyTechnicianOrderNumber('${escapeAttr(order.id)}')">Copiar orden</button><button type="button" class="btn tech-whatsapp-share" onclick="shareTechnicianCompletion('${escapeAttr(order.id)}')">Compartir evidencia</button><button type="button" class="btn bgh" onclick="CM('tech-installation-summary-mo')">Cerrar</button></div></div>`;
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
    if (loc.url) {
        return `<a class="order-location-link" href="${escapeAttr(loc.url)}" target="_blank" rel="noopener">Abrir Maps</a><div class="order-location-muted">${escapeHtml(loc.label)}</div>`;
    }
    return `<div class="order-location-muted ${loc.hasLocation ? '' : 'no-location'}">${escapeHtml(loc.label || 'Sin ubicacion')}</div>`;
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
    detail.completedAt = detail.status === 'completada' ? new Date().toISOString() : '';
    setUpdatedAudit(detail, detail.status === 'completada' ? 'marcó detalle hecho' : 'restableció detalle');
    const stop = getEditingStop();
    if (!stop) return;
    syncStopCompletion(stop);
    stop.updatedAt = new Date().toISOString();
    renderEditableDetails(stop);
}

async function togglePlanDetailStatus(detailId) {
    const detail = state.workOrders.find(w => w.id === detailId && !w.deletedAt);
    if (!detail) return;
    if (detail.status !== 'completada' && userHasRole('administrador', 'admin', 'atencion_clientes')) {
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
}

async function deletePlanDetailFromStop(stopId, day, detailId) {
    const detail = state.workOrders.find(w => w.id === detailId && !w.deletedAt);
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
        const detail = state.workOrders.find(w => w.id === detailId && !w.deletedAt);
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

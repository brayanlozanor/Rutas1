    const TECH_ROUTE_DAYS = [
      { id: 'general', label: 'Plan general' },
      { id: 'lunes', label: 'Lunes' },
      { id: 'martes', label: 'Martes' },
      { id: 'miercoles', label: 'Miercoles' },
      { id: 'jueves', label: 'Jueves' },
      { id: 'viernes', label: 'Viernes' },
      { id: 'sabado', label: 'Sabado' },
      { id: 'domingo', label: 'Domingo' }
    ];

    let techRouteId = '';
    let techRouteScope = 'tech';
    let techRouteGeneralPlanId = '';
    let loggedTech = null;
    let techRouteMap = null;
    let techRouteLayer = null;
    let techRouteMarkers = [];
    let techRouteFullMap = null;
    let techRouteFullLayer = null;
    let techRouteFullMarkers = [];
    let techLastMapStops = [];
    let techRouteMapFingerprint = '';
    let techRemoteFingerprint = '';
    let currentTechDetailReportId = '';
    let currentTechDetailReportMode = 'terminado';
    let currentTechNoMaterial = false;
    let currentOpenTechStopId = '';
    let pendingTechEvidencePhotos = [];
    let techLiveTimer = null;
    const SHARED_ROUTE_ID = '__shared__';

    async function initTechRoutePage() {
      const token = localStorage.getItem('token');
      const appUser = getCurrentUser && getCurrentUser();
      const role = normalizeRole(appUser?.role || '');

      // Esta vista ya no usa login propio. Si no hay sesión normal, mandamos al login principal.
      if (!token || role !== 'tecnico') {
        location.replace('login.html');
        return;
      }

      await loadDB();
      const params = new URLSearchParams(location.search);
      techRouteScope = params.get('plan') === 'general' ? 'general' : 'tech';
      techRouteId = params.get('tech') || '';
      techRouteGeneralPlanId = params.get('generalPlan') || '';

      const appTech = findTechFromAppUser(appUser);
      if (!appTech || !canTechOpenCurrentRoute(appTech.id)) {
        if (window.netopsCloudLoadOk === false) {
          showTechCloudUnavailable(appTech);
          return;
        }
        showTechNoAccess();
        return;
      }

      loggedTech = appTech;
      techRouteId = techRouteScope === 'general' ? appTech.id : (techRouteId || appTech.id);
      if (techRouteScope === 'general') getGeneralPlanForTechRoute(appTech.id);
      saveTechSession(appTech.id);
      registerTechAccess(appTech);
      showTechRouteApp();
    }

    function bindTechLoginKeys() {
      ['tech-login-user', 'tech-login-pass'].forEach(id => {
        const input = document.getElementById(id);
        if (!input || input.dataset.boundEnter) return;
        input.dataset.boundEnter = '1';
        input.addEventListener('keydown', event => {
          if (event.key === 'Enter') {
            event.preventDefault();
            loginTechRoute();
          }
        });
      });
    }

    async function reloadTechRoute() {
      await loadDB();
      normalizeTechRoutePlan();
      renderTechRoute();
    }

    function getTechRemoteFingerprint(data) {
      try {
        return JSON.stringify({
          weekPlan: data.weekPlan || {},
          workOrders: data.workOrders || [],
          equipment: data.equipment || [],
          nodes: data.nodes || []
        });
      } catch (e) {
        return '';
      }
    }

    function isTechBusyEditing() {
      const active = document.activeElement;
      const tag = active?.tagName?.toLowerCase();
      return !!document.querySelector('.mo.open') || ['input', 'textarea', 'select'].includes(tag);
    }

    async function checkTechRouteUpdates() {
      if (isTechBusyEditing() || document.hidden || (typeof hasPendingLocalChanges === 'function' && hasPendingLocalChanges())) return;
      try {
        const data = await fetchRemoteState(30000);
        const fingerprint = getTechRemoteFingerprint(data);
        if (!fingerprint || fingerprint === techRemoteFingerprint) return;
        techRemoteFingerprint = fingerprint;
        applyStateData({
          equipment: data.equipment,
          nodes: data.nodes,
          workOrders: data.workOrders,
          technicians: data.technicians,
          users: data.users,
          techAccessLog: data.techAccessLog,
          deletionRequests: data.deletionRequests,
          materials: data.materials,
          routes: data.routes,
          weekPlan: data.weekPlan || {},
          prepChecked: data.prepChecked || {},
          syncMeta: data.syncMeta || {}
        });
        normalizeTechRoutePlan();
        if (loggedTech && !canTechOpenCurrentRoute(loggedTech.id)) {
          showTechNoAccess();
          return;
        }
        if (techRouteScope === 'general' && loggedTech) getGeneralPlanForTechRoute(loggedTech.id);
        renderTechRoute();
      } catch (e) {
        console.log('No se pudo verificar actualización de ruta', e);
      }
    }

    function startTechLiveSync() {
      if (techLiveTimer) clearInterval(techLiveTimer);
      techRemoteFingerprint = getTechRemoteFingerprint(state);
      checkTechRouteUpdates();
      techLiveTimer = null;
    }

    function readTechSession() {
      try {
        const exact = localStorage.getItem(getTechSessionKey()) || sessionStorage.getItem(getTechSessionKey());
        if (exact) return JSON.parse(exact);
        if (techRouteScope === 'general') {
          const latest = localStorage.getItem('netops_tech_session:general:latest') || sessionStorage.getItem('netops_tech_session:general:latest');
          if (latest) return JSON.parse(latest);
          const keys = Object.keys(localStorage).filter(k => k.startsWith('netops_tech_session:general:'));
          for (const key of keys.reverse()) {
            const val = localStorage.getItem(key);
            if (val) return JSON.parse(val);
          }
        }
        return null;
      } catch(e) {
        return null;
      }
    }

    function getTechSessionKey() {
      const routeKey = techRouteScope === 'general'
        ? `general:${techRouteGeneralPlanId || 'latest'}`
        : `tech:${techRouteId || 'open'}`;
      return `netops_tech_session:${routeKey}`;
    }

    function saveTechSession(technicianId) {
      const payload = JSON.stringify({
        technicianId,
        at: new Date().toISOString()
      });
      localStorage.setItem(getTechSessionKey(), payload);
      sessionStorage.setItem(getTechSessionKey(), payload);
    }

    function getAllGeneralPlansForTechRoute() {
      normalizeTechRoutePlan();
      return (state.weekPlan[SHARED_ROUTE_ID]._generalPlans || []).filter(plan => !plan.deletedAt);
    }

    function isPlanAssignedTo(plan, technicianId) {
      if (!plan || !technicianId) return false;
      if (plan.assignedTechId === technicianId) return true;
      if (Array.isArray(plan.assignedTechIds) && plan.assignedTechIds.includes(technicianId)) return true;
      return false;
    }

    function getAssignedGeneralPlansForTech(technicianId) {
      const plans = getAllGeneralPlansForTechRoute();
      if (!technicianId) return [];
      return plans.filter(plan => isPlanAssignedTo(plan, technicianId));
    }

    function getDirectGeneralPlanForTech(technicianId) {
      if (!technicianId) return null;
      const direct = state.weekPlan?.[technicianId];
      const stops = Array.isArray(direct?.general) ? direct.general : [];
      if (!stops.some(stop => !stop.deletedAt)) return null;
      const tech = (state.technicians || []).find(item => item.id === technicianId && !item.deletedAt) || loggedTech;
      return {
        id: `direct-general-${technicianId}`,
        name: `Plan general de ${tech?.nombre || 'técnico'}`,
        assignedTechId: technicianId,
        createdAt: direct.createdAt || '',
        materialSummary: direct.materialSummary || '',
        stops,
        directTechnicianPlan: true
      };
    }

    function getGeneralPlanForTechRoute(preferredTechId = '') {
      normalizeTechRoutePlan();
      const plans = getAllGeneralPlansForTechRoute();
      if (!plans.length) return null;
      const technicianId = preferredTechId || loggedTech?.id || techRouteId || '';
      const explicit = techRouteGeneralPlanId ? plans.find(item => item.id === techRouteGeneralPlanId) : null;
      if (explicit && isPlanAssignedTo(explicit, technicianId)) return explicit;

      if (techRouteScope === 'general' && technicianId) {
        const assigned = plans.filter(plan => isPlanAssignedTo(plan, technicianId));
        const assignedWithStops = assigned.filter(plan => Array.isArray(plan.stops) && plan.stops.some(stop => !stop.deletedAt));
        const chosen = assignedWithStops[assignedWithStops.length - 1] || assigned[assigned.length - 1];
        if (chosen) {
          techRouteGeneralPlanId = chosen.id;
          return chosen;
        }
        const directPlan = getDirectGeneralPlanForTech(technicianId);
        if (directPlan) {
          techRouteGeneralPlanId = directPlan.id;
          return directPlan;
        }
      }

      techRouteGeneralPlanId = '';
      return null;
    }

    function canTechOpenCurrentRoute(technicianId) {
      if (!technicianId) return false;
      if (techRouteScope !== 'general') return !techRouteId || techRouteId === technicianId;
      const plan = getGeneralPlanForTechRoute(technicianId);
      return !!plan && isPlanAssignedTo(plan, technicianId);
    }

    function findTechFromAppUser(user) {
      if (!user) return null;
      let tech = (state.technicians || []).find(t => !t.deletedAt && (t.userId === user.id || normalizeName(t.usuario) === normalizeName(user.username)));
      if (tech) return tech;
      const source = (state.users || []).find(u => !u.deletedAt && (u.id === user.id || normalizeName(u.username) === normalizeName(user.username)) && normalizeRole(u.role) === 'tecnico');
      if (!source) return null;
      tech = {
        id: gid('t'),
        userId: source.id,
        nombre: source.name || source.username || 'Técnico',
        telefono: source.phone || '',
        estado: source.status === 'inactivo' ? 'inactivo' : 'activo',
        usuario: source.username || '',
        password: source.password || '',
        regiones: Array.isArray(source.zones) ? source.zones : [],
        notas: source.notes || '',
        createdAt: new Date().toISOString()
      };
      if (!Array.isArray(state.technicians)) state.technicians = [];
      state.technicians.push(tech);
      saveDB();
      return tech;
    }

    function findTechByCredentials(username, password) {
      const user = String(username || '').trim().toLowerCase();
      const pass = String(password || '').trim();
      let tech = (state.technicians || []).find(t => !t.deletedAt && t.estado !== 'inactivo' && String(t.usuario || '').trim().toLowerCase() === user && String(t.password || '').trim() === pass);
      if (tech) return tech;
      const appUser = (state.users || []).find(u => !u.deletedAt && normalizeRole(u.role) === 'tecnico' && String(u.username || '').trim().toLowerCase() === user && String(u.password || '').trim() === pass && String(u.status || 'activo').toLowerCase() !== 'inactivo');
      return appUser ? findTechFromAppUser(appUser) : null;
    }

    function canUseTechSession(session) {
      if (!session?.technicianId) return false;
      const startedAt = new Date(session.at || 0).getTime();
      if (!Number.isFinite(startedAt) || Date.now() - startedAt > 1000 * 60 * 60 * 24 * 14) return false;
      const tech = (state.technicians || []).find(t => t.id === session.technicianId && !t.deletedAt && t.estado !== 'inactivo');
      if (!tech) return false;
      return canTechOpenCurrentRoute(tech.id);
    }

    function showTechCloudUnavailable(appTech) {
      loggedTech = appTech || null;
      document.getElementById('tech-login-view').style.display = 'none';
      document.getElementById('tech-route-shell').style.display = 'block';
      const title = document.getElementById('tech-route-title');
      const sub = document.getElementById('tech-route-sub');
      const list = document.getElementById('tech-route-list');
      if (title) title.textContent = 'No pudimos verificar tu ruta';
      if (sub) sub.textContent = window.netopsLastSyncError || 'No fue posible confirmar la sincronizacion con el servidor.';
      if (list) list.innerHTML = `
        <div class="tech-route-empty-callout tech-cloud-unavailable">
          <b>Tu asignación no fue rechazada.</b>
          <span>No se ejecutara ningun cambio hasta confirmar la comunicacion. Reintenta sin cerrar tu sesion.</span>
          <button type="button" class="btn bc" onclick="location.reload()">Reintentar sincronizacion</button>
        </div>`;
      const map = document.querySelector('.tech-route-map-wrap');
      if (map) map.style.display = 'none';
      document.getElementById('tech-route-summary').innerHTML = '';
      document.getElementById('tech-plan-picker').style.display = 'none';
      updateTechSyncIndicator();
    }

    function showTechLogin() {
      location.replace('login.html');
    }

    function showTechNoAccess() {
      document.getElementById('tech-login-view').style.display = 'none';
      document.getElementById('tech-route-shell').style.display = 'block';
      const list = document.getElementById('tech-route-list');
      const title = document.getElementById('tech-route-title');
      const sub = document.getElementById('tech-route-sub');
      if (title) title.textContent = 'Ruta no asignada';
      if (sub) sub.textContent = 'Tu usuario técnico no tiene un plan asignado o no tiene permiso para abrir esta ruta.';
      if (list) list.innerHTML = '<div class="tech-route-empty-callout">No tienes ruta asignada. Pide al administrador que te asigne un plan desde Planificar.</div>';
      const map = document.querySelector('.tech-route-map-wrap');
      if (map) map.style.display = 'none';
      const summary = document.getElementById('tech-route-summary');
      if (summary) summary.style.display = 'none';
    }

    function loginTechRoute() {
      const user = document.getElementById('tech-login-user').value.trim().toLowerCase();
      const pass = document.getElementById('tech-login-pass').value.trim();
      const error = document.getElementById('tech-login-error');
      const match = findTechByCredentials(user, pass);
      if (!match) {
        if (error) error.textContent = 'Usuario o contraseña incorrectos.';
        return;
      }
      if (!canTechOpenCurrentRoute(match.id)) {
        if (error) error.textContent = 'Esta ruta está asignada a otro técnico.';
        return;
      }
      loggedTech = match;
      techRouteId = techRouteScope === 'general' || !techRouteId ? match.id : techRouteId;
      if (techRouteScope === 'general') getGeneralPlanForTechRoute(match.id);
      saveTechSession(match.id);
      registerTechAccess(match);
      showTechRouteApp();
    }

    function toggleTechPassword(inputId, button) {
      const input = document.getElementById(inputId);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.textContent = show ? 'Ocultar' : 'Ver';
    }

    function showTechRouteApp() {
      document.getElementById('tech-login-view').style.display = 'none';
      document.getElementById('tech-route-shell').style.display = 'block';
      const label = document.getElementById('tech-session-label');
      if (label) label.textContent = loggedTech?.nombre || 'Tecnico';
      const menuUser = document.getElementById('tech-menu-user');
      if (menuUser) menuUser.textContent = loggedTech?.nombre || 'Técnico';
      updateTechSyncIndicator();
      normalizeTechRoutePlan();
      initTechRouteMap();
      renderTechRoute();
      startTechLiveSync();
    }

    function updateTechSyncIndicator() {
      const dot = document.getElementById('tech-sync-dot');
      if (!dot) return;
      dot.classList.toggle('offline', window.netopsCloudLoadOk === false);
      dot.title = window.netopsCloudLoadOk === false
        ? 'Mostrando la última información guardada'
        : 'Información sincronizada';
    }

    function toggleTechMobileMenu(force) {
      const menu = document.getElementById('tech-mobile-menu');
      if (!menu) return;
      const open = typeof force === 'boolean' ? force : !menu.classList.contains('open');
      menu.classList.toggle('open', open);
      menu.setAttribute('aria-hidden', String(!open));
    }

    function scrollTechHome() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function scrollTechStops() {
      scrollTechElementIntoView(document.getElementById('tech-route-list'));
    }

    function scrollTechReports() {
      const report = document.querySelector('.tech-report-mini, .route-detail-line.done, .route-detail-line.not-done');
      if (report) scrollTechElementIntoView(report);
      else notify('Todavía no hay reportes capturados.');
    }

    async function registerTechAccess(tech) {
      if (!tech) return;
      if (!Array.isArray(state.techAccessLog)) state.techAccessLog = [];
      state.techAccessLog.push({
        id: gid('ta'),
        technicianId: tech.id,
        technicianName: tech.nombre || '',
        routeScope: techRouteScope,
        scopeLabel: techRouteScope === 'general' ? 'Plan general compartido' : 'Ruta asignada',
        at: new Date().toISOString(),
        userAgent: navigator.userAgent || ''
      });
      try { await saveDB(); } catch(e) { console.log('No se pudo guardar acceso', e); }
    }

    function logoutTechRoute() {
      if (techLiveTimer) clearInterval(techLiveTimer);
      sessionStorage.removeItem(getTechSessionKey());
      localStorage.removeItem(getTechSessionKey());
      localStorage.removeItem('netops_tech_session');
      Object.keys(localStorage).filter(k => k.startsWith('netops_tech_session:')).forEach(k => localStorage.removeItem(k));
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      loggedTech = null;
      location.href = 'login.html';
    }

    function normalizeTechRoutePlan() {
      if (!state.weekPlan || Array.isArray(state.weekPlan)) state.weekPlan = {};
      if (!state.weekPlan[SHARED_ROUTE_ID]) state.weekPlan[SHARED_ROUTE_ID] = {};
      if (!Array.isArray(state.weekPlan[SHARED_ROUTE_ID]._generalPlans)) {
        state.weekPlan[SHARED_ROUTE_ID]._generalPlans = [{
          id: 'general-1',
          name: 'Plan general 1',
          createdAt: new Date().toISOString(),
          stops: Array.isArray(state.weekPlan[SHARED_ROUTE_ID].general) ? state.weekPlan[SHARED_ROUTE_ID].general : []
        }];
      }
      if (!state.weekPlan[techRouteId]) state.weekPlan[techRouteId] = {};
      TECH_ROUTE_DAYS.forEach(day => {
        if (day.id === 'general') return;
        if (!Array.isArray(state.weekPlan[techRouteId][day.id])) state.weekPlan[techRouteId][day.id] = [];
      });
    }

    function getSharedGeneralStopsRef() {
      const plan = getGeneralPlanForTechRoute();
      if (!plan) return [];
      if (!Array.isArray(plan.stops)) plan.stops = [];
      return plan.stops;
    }

    function getTechRouteStopsRef(day) {
      normalizeTechRoutePlan();
      if (day === 'general') return getSharedGeneralStopsRef();
      return state.weekPlan[techRouteId][day] || [];
    }

    function visibleTechStops(day) {
      return getTechRouteStopsRef(day).filter(stop => !stop.deletedAt);
    }

    function orderedTechStopsForView(day) {
      return visibleTechStops(day).slice().sort((a, b) => {
        if (!!a.startedAt !== !!b.startedAt) return a.startedAt ? -1 : 1;
        if (a.startedAt && b.startedAt) return new Date(b.startedAt) - new Date(a.startedAt);
        return 0;
      });
    }

    function getTechDetailCompletionTime(detail) {
      const value = detail?.completedAt || detail?.technicianReport?.completedAt || '';
      const time = value ? new Date(value).getTime() : NaN;
      return Number.isFinite(time) ? time : NaN;
    }

    function wasTechDetailResolvedDuringStop(detail, stop) {
      if (!detail || !stop || !['completada', 'no_realizado'].includes(detail.status || '')) return false;
      const joinedAt = new Date(stop.planJoinedAt || stop.createdAt || '').getTime();
      const completedAt = getTechDetailCompletionTime(detail);
      if (Number.isFinite(joinedAt)) return Number.isFinite(completedAt) && completedAt >= joinedAt;
      return (stop.detailIds || []).includes(detail.id);
    }

    function getStopDetailsForTech(stop) {
      const ids = new Set(stop.detailIds || []);
      const details = new Map();
      const linkedNodeIds = new Set([...(stop.linkedNodeIds || []), ...(stop.equipmentId ? getEquipmentLinkedNodeIds(stop.equipmentId) : [])]);
      (state.workOrders || []).forEach(w => {
        if (w.deletedAt) return;
        const linked = ids.has(w.id);
        const open = !['completada', 'eliminada', 'no_realizado'].includes(w.status || '');
        const resolved = ['completada', 'no_realizado'].includes(w.status || '');
        const resolvedInThisPlan = resolved && wasTechDetailResolvedDuringStop(w, stop);
        const sameEquipment = stop.equipmentId
          && (w.equipmentId === stop.equipmentId || (stop.includeLinkedNodeDetails !== false && w.nodeId && linkedNodeIds.has(w.nodeId)))
          && (open || resolvedInThisPlan);
        const sameNode = stop.nodeId && w.nodeId === stop.nodeId && (open || resolvedInThisPlan);
        if ((linked && (!resolved || resolvedInThisPlan)) || sameEquipment || sameNode) details.set(w.id, w);
      });
      return sortDetailsByPriority(Array.from(details.values()));
    }

    function getStopProgressForTech(stop) {
      const details = getStopDetailsForTech(stop);
      const done = details.filter(d => d.status === 'completada' || d.status === 'no_realizado').length;
      return { total: details.length, done, pending: details.length - done, complete: details.length ? done === details.length : stop.siteStatus === 'hecho' };
    }

    function getVisibleTechStopNotes(stop, details) {
      const note = String(stop.notes || '').trim();
      if (!note) return '';
      const duplicatedAsDetail = (details || []).some(detail => String(detail.title || '').trim().toLowerCase() === note.toLowerCase());
      return duplicatedAsDetail ? '' : note;
    }

    function getTechStopStatus(stop, progress) {
      if (stop.adminReleasedAt) return { text: 'Salida autorizada', cls: 'bg2' };
      if (progress.complete) return { text: 'Listo, esperando salida', cls: 'bty' };
      if (stop.startedAt) return { text: 'En proceso', cls: 'bc' };
      return { text: 'Pendiente', cls: 'bty' };
    }

    function formatTechDateTime(value) {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    }

    function getStopRegionForTech(stop) {
      if (stop.region) return stop.region;
      const eq = stop.equipmentId ? (state.equipment || []).find(e => e.id === stop.equipmentId) : null;
      return eq?.region || '';
    }

    function getAllRouteStops() {
      return TECH_ROUTE_DAYS.flatMap(day => visibleTechStops(day.id).map((stop, index) => {
        const eq = stop.equipmentId ? (state.equipment || []).find(e => e.id === stop.equipmentId) : null;
        const position = getTechStopCurrentPosition(stop, eq);
        return {
          ...stop,
          day: day.id,
          dayLabel: day.label,
          index,
          name: stop.name || eq?.name || 'Parada',
          lat: position.lat,
          lng: position.lng,
          details: getStopDetailsForTech(stop),
          progress: getStopProgressForTech(stop),
          region: getStopRegionForTech(stop)
        };
      })).filter(stop => !isNaN(stop.lat) && !isNaN(stop.lng));
    }

    function getTechStopCurrentPosition(stop, eq = null) {
      const antenna = eq || (stop?.equipmentId ? (state.equipment || []).find(e => e.id === stop.equipmentId && !e.deletedAt) : null);
      const node = stop?.nodeId ? (state.nodes || []).find(n => n.id === stop.nodeId && !n.deletedAt) : null;
      return {
        lat: safeFloat(antenna?.lat ?? node?.lat ?? stop?.lat),
        lng: safeFloat(antenna?.lng ?? node?.lng ?? stop?.lng)
      };
    }

    function getTechRoutePlanMaterial() {
      if (techRouteScope === 'general') return getGeneralPlanForTechRoute()?.materialSummary || '';
      return state.weekPlan?.[techRouteId]?.materialSummary || '';
    }

    function getTechInventorySummary() {
      const technicianId=loggedTech?.id||techRouteId;
      return (state.materials||[]).map(m=>({m,q:Number((m.allocations||[]).find(x=>x.technicianId===technicianId)?.quantity)||0})).filter(x=>x.q>0).map(x=>`${x.m.name}: ${x.q} ${x.m.unit}`).join(' · ');
    }

    function renderTechPlanPicker() {
      const box = document.getElementById('tech-plan-picker');
      if (!box) return;
      if (techRouteScope !== 'general') {
        box.style.display = 'none';
        box.innerHTML = '';
        return;
      }
      const current = getGeneralPlanForTechRoute(loggedTech?.id || techRouteId);
      if (!current) {
        box.style.display = 'grid';
        box.innerHTML = '<div class="tech-route-empty-callout" style="grid-column:1/-1">No tienes un plan asignado todavía. Pide al administrador que te asigne un plan en Planificar.</div>';
        return;
      }
      const stopsCount = (current.stops || []).filter(s => !s.deletedAt).length;
      box.style.display = 'grid';
      box.innerHTML = `
        <div class="tech-plan-card">
          <label>Plan asignado</label>
          <strong>${escapeTech(current.name || 'Plan general')}</strong>
          <small>${stopsCount} paradas asignadas · selección bloqueada por administrador</small>
        </div>
        <div class="tech-plan-pill">👷 ${escapeTech(loggedTech?.nombre || 'Técnico')}</div>
        <div class="tech-plan-pill">📦 ${getTechInventorySummary() ? escapeTech(getTechInventorySummary()) : 'Sin material asignado'}</div>
      `;
    }

    function selectTechGeneralPlan(planId) {
      // El técnico no puede cambiar de plan. El plan se asigna desde el panel del administrador.
      notify('El plan lo asigna el administrador.', 'err');
    }

    function renderTechRoute() {
      const tech = (state.technicians || []).find(t => t.id === techRouteId && !t.deletedAt) || loggedTech;
      const activePlan = techRouteScope === 'general' ? getGeneralPlanForTechRoute(tech?.id || techRouteId) : null;
      renderTechPlanPicker();
      document.getElementById('tech-route-title').textContent = techRouteScope === 'general'
        ? (activePlan?.name || 'Sin plan asignado')
        : (tech ? tech.nombre : 'Ruta no encontrada');
      if (techRouteScope === 'general' && !activePlan) {
        document.getElementById('tech-route-sub').textContent = '0 paradas · 0 pendientes · 0 hechos';
        document.getElementById('tech-route-summary').innerHTML = '<span>Sin plan asignado</span>';
        document.getElementById('tech-route-list').innerHTML = '<div class="plan-empty tech-route-empty-callout"><b>No tienes plan asignado.</b><br>Cuando el administrador te asigne uno, aparecerá aquí automáticamente.</div>';
        renderTechRouteMap([]);
        return;
      }
      const stops = getAllRouteStops();
      const pending = stops.reduce((sum, stop) => sum + stop.progress.pending, 0);
      const done = stops.reduce((sum, stop) => sum + stop.progress.done, 0);
      document.getElementById('tech-route-sub').textContent = `${tech?.nombre || 'Técnico'} · ${stops.length} paradas · ${pending} pendientes · ${done} hechos`;
      const planMaterial = getTechRoutePlanMaterial();
      document.getElementById('tech-route-summary').innerHTML = `
        <span>${stops.length} paradas</span>
        <span>${pending} pendientes</span>
        <span>${done} hechos</span>
        ${planMaterial ? `<span class="tech-material-summary">📦 Material del plan: ${escapeTech(planMaterial)}</span>` : ''}
      `;

      document.getElementById('tech-route-list').innerHTML = TECH_ROUTE_DAYS.map(day => {
        const dayStops = orderedTechStopsForView(day.id);
        if (!dayStops.length) return '';
        return `
          <section class="tech-day-block">
            <h2>${day.label}</h2>
            ${dayStops.map((stop, index) => renderTechStop(stop, day, index)).join('')}
          </section>
        `;
      }).join('') || '<div class="plan-empty tech-route-empty-callout"><b>No hay paradas asignadas todavía.</b><br>Revisa con el administrador que tu plan tenga paradas y esté asignado a tu usuario técnico.</div>';
      renderTechRouteMap(stops);
    }

    function renderTechStop(stop, day, index) {
      const eq = stop.equipmentId ? (state.equipment || []).find(e => e.id === stop.equipmentId) : null;
      const node = stop.nodeId ? (state.nodes || []).find(n => n.id === stop.nodeId && !n.deletedAt) : null;
      const name = stop.name || eq?.name || node?.name || 'Parada';
      const progress = getStopProgressForTech(stop);
      const details = getStopDetailsForTech(stop);
      const active = details.filter(d => d.status !== 'completada' && d.status !== 'no_realizado');
      const reported = details.filter(d => d.status === 'completada' || d.status === 'no_realizado');
      const region = rById(getStopRegionForTech(stop));
      const status = getTechStopStatus(stop, progress);
      const visibleNotes = getVisibleTechStopNotes(stop, details);
      const position = getTechStopCurrentPosition(stop, eq);
      const lat = position.lat;
      const lng = position.lng;
      return `
        <article class="tech-stop-card ${stop.adminReleasedAt ? 'done' : ''}" data-stop-id="${escapeTech(stop.id)}">
          <div class="tech-stop-head">
            <span class="route-stop-num">${index + 1}</span>
            <div>
              <h3>${escapeTech(name)}</h3>
              <p>${escapeTech(region.n)}${eq?.ip ? ` · ${escapeTech(eq.ip)}` : ''}</p>
            </div>
          </div>
          <div class="route-stop-status">
            <span class="badge ${status.cls}">${status.text}</span>
            <span class="badge bty">${progress.done}/${progress.total} detalles hechos</span>
          </div>
          <div class="route-stop-timeline">
            ${stop.startedAt ? `<span>Inicio: <strong>${formatTechDateTime(stop.startedAt)}</strong></span>` : '<span>Sin iniciar</span>'}
            ${stop.adminReleasedAt ? `<span>Salida admin: <strong>${formatTechDateTime(stop.adminReleasedAt)}</strong></span>` : ''}
          </div>
          ${stop.adminReleasedAt ? '' : `
            <div class="tech-order-actions">
              <button class="btn bsm bc" onclick="toggleTechStopDetails('${escapeTech(stop.id)}')">Ver detalles</button>
            </div>
            ${visibleNotes ? `<div class="route-stop-notes">${escapeTech(visibleNotes)}</div>` : ''}
            <div class="tech-stop-details-panel" id="tech-stop-details-${escapeTech(stop.id)}" style="display:${currentOpenTechStopId === stop.id ? 'block' : 'none'}">
            <div class="tech-detail-section">
              <strong>Pendiente</strong>
              ${active.length ? active.map(detail => renderTechDetail(detail, day.id, stop.id)).join('') : '<div class="ant-muted">Sin pendientes.</div>'}
            </div>
            <div class="tech-detail-section">
              <strong>Reportados / terminados</strong>
              ${reported.length ? reported.map(detail => renderTechDetail(detail, day.id, stop.id)).join('') : '<div class="ant-muted">Sin historial todavía.</div>'}
            </div>
            </div>
          `}
        </article>
      `;
    }

    function startTechStop(day, stopId) {
      const stop = getTechRouteStopsRef(day).find(item => item.id === stopId && !item.deletedAt);
      if (!stop || stop.startedAt) return;
      stop.startedAt = new Date().toISOString();
      stop.startedBy = loggedTech?.id || techRouteId || '';
      stop.startedByName = loggedTech?.nombre || '';
      stop.siteStatus = stop.siteStatus === 'hecho' ? 'hecho' : 'en_proceso';
      saveDB();
      renderTechRoute();
      scrollToTechStop(stopId);
      notify('Detalles iniciados');
    }

    function scrollToTechStop(stopId) {
      const escaped = window.CSS?.escape ? CSS.escape(stopId) : String(stopId).replace(/"/g, '\\"');
      const card = document.querySelector(`[data-stop-id="${escaped}"]`);
      scrollTechElementIntoView(card);
    }

    function scrollTechElementIntoView(element, behavior = 'smooth') {
      if (!element) return;
      const topbar = document.querySelector('.tech-only-topbar');
      const topbarStyle = topbar ? window.getComputedStyle(topbar) : null;
      const stickyOffset = topbar && topbarStyle?.position === 'sticky'
        ? topbar.getBoundingClientRect().height
        : 0;
      const extraOffset = window.matchMedia('(max-width: 760px)').matches ? 12 : 18;
      const top = element.getBoundingClientRect().top + window.scrollY - stickyOffset - extraOffset;
      window.scrollTo({ top: Math.max(0, top), left: 0, behavior });
    }

    function renderTechDetail(detail, day = '', stopId = '') {
      const detailLocation = getTechDetailLocationLabel(detail);
      const detailMapsUrl = getDetailMapsUrl(detail);
      const report = detail.technicianReport || {};
      const reportPhotos = getTechReportPhotos(report);
      const reportGallery = encodeURIComponent(JSON.stringify(reportPhotos));
      const done = detail.status === 'completada';
      const noDone = detail.status === 'no_realizado';
      const reportHtml = (report.solution || report.reason || report.materialUsed || report.completedAt) ? `
        <div class="tech-report-mini">
          <b>${noDone ? 'No realizado' : 'Reporte'}:</b>
          ${report.solution ? `<span>Solución: ${escapeTech(report.solution)}</span>` : ''}
          ${report.reason ? `<span>Motivo: ${escapeTech(report.reason)}</span>` : ''}
          ${report.materialUsed ? `<span>Material: ${escapeTech(report.materialUsed)}</span>` : ''}
          ${report.completedAt ? `<span>${formatTechDateTime(report.completedAt)}</span>` : ''}
          ${reportPhotos.map((photo, index) => `<button type="button" class="evidence-link" data-evidence-gallery="${reportGallery}" onclick="openEvidenceGalleryEncoded(this.dataset.evidenceGallery,${index})">Ver foto ${index + 1}</button>`).join('')}
        </div>` : '';
      return `
        <div class="route-detail-line ${done ? 'done' : ''} ${noDone ? 'not-done' : ''}">
          <span class="detail-status-line ${done ? 'done-status' : (noDone ? 'not-done-status' : '')}" style="border-color:${pc(detail.priority)}">${done ? 'Terminado' : (noDone ? 'No realizado' : `<span class="priority-badge priority-${escapeTech(detail.priority || 'media')}"><span class="priority-dot"></span>${escapeTech(pl(detail.priority || 'media'))}</span>`)}</span>
          ${detail.clientName ? `<small class="detail-client-line"><b>Cliente:</b> ${escapeTech(detail.clientName)}</small>` : ''}
          <strong class="detail-title-line">${escapeTech(detail.title || 'Detalle')}</strong>
          ${detail.desc ? `<small>${escapeTech(detail.desc)}</small>` : ''}          ${detailMapsUrl ? `<small><a class="order-location-link" href="${escapeTech(detailMapsUrl)}" target="_blank" rel="noopener">Abrir Maps</a> ${escapeTech(detailLocation)}</small>` : (detailLocation ? `<small>${escapeTech(detailLocation)}</small>` : '')}
          ${detail.materialPlanned ? `<small>📦 Material sugerido: ${escapeTech(detail.materialPlanned)}</small>` : ''}
          ${reportHtml}
          <div class="tech-detail-actions">
            ${done
              ? `<span class="tech-locked-done">Reporte enviado</span>`
              : (noDone
                ? `<button class="btn bsm bg2" onclick="openTechDetailReport('${escapeTech(detail.id)}','terminado')">Terminar detalle</button><span class="tech-locked-done">No realizado enviado</span>`
                : `<button class="btn bsm bg2" onclick="openTechDetailReport('${escapeTech(detail.id)}','terminado')">Terminar</button><button class="btn bsm ba" onclick="openTechDetailReport('${escapeTech(detail.id)}','no_realizado')">No lo hice</button>`)}
          </div>
        </div>
      `;
    }

    function toggleTechStopDetails(stopId) {
      const targetPanelId = `tech-stop-details-${stopId}`;
      document.querySelectorAll('.tech-stop-details-panel').forEach(panel => {
        if (panel.id !== targetPanelId) panel.style.display = 'none';
      });
      const panel = document.getElementById(targetPanelId);
      if (panel) {
        const open = panel.style.display === 'none';
        panel.style.display = open ? 'block' : 'none';
        currentOpenTechStopId = open ? stopId : '';
        if (open) {
          requestAnimationFrame(() => scrollTechElementIntoView(panel));
        }
      }
    }

    let techMaterialItems = [];
    function techMaterialAvailable(material) { return Number((material.allocations||[]).find(x=>x.technicianId===(loggedTech?.id||techRouteId))?.quantity)||0; }
    function renderTechMaterialRows() {
      const box=document.getElementById('tech-material-rows'); if(!box)return;
      const materials=(state.materials||[]).filter(m=>!m.deletedAt&&techMaterialAvailable(m)>0);
      if(!materials.length){box.innerHTML='<div class="inventory-alert">No tienes material asignado. Solicítalo al administrador.</div>';return;}
      if(!techMaterialItems.length) techMaterialItems=[{materialId:'',quantity:1}];
      box.innerHTML=techMaterialItems.map((item,index)=>`<div class="tech-inventory-row"><select onchange="updateTechMaterialItem(${index},'materialId',this.value)"><option value="">Selecciona material</option>${materials.map(m=>`<option value="${m.id}" ${item.materialId===m.id?'selected':''}>${escapeTech(m.name)} · tienes ${techMaterialAvailable(m)} ${escapeTech(m.unit)}</option>`).join('')}</select><input type="number" min="0.01" step="0.01" value="${item.quantity}" onchange="updateTechMaterialItem(${index},'quantity',this.value)"><button type="button" class="btn bsm br" onclick="removeTechMaterialRow(${index})">×</button></div>`).join('');
    }
    function updateTechMaterialItem(i,key,value){techMaterialItems[i][key]=key==='quantity'?Number(value):value;}
    function addTechMaterialRow(){techMaterialItems.push({materialId:'',quantity:1});renderTechMaterialRows();}
    function removeTechMaterialRow(i){techMaterialItems.splice(i,1);renderTechMaterialRows();}

    function openTechDetailReport(detailId, mode = 'terminado') {
      const detail = (state.workOrders || []).find(w => w.id === detailId && !w.deletedAt);
      if (!detail) return;
      currentTechDetailReportId = detailId;
      currentTechDetailReportMode = mode;
      pendingTechEvidencePhotos = [];
      const isNoDone = mode === 'no_realizado';
      techMaterialItems=Array.isArray(detail.technicianReport?.materialItems)?cloneData(detail.technicianReport.materialItems):[];
      renderTechMaterialRows();
      document.getElementById('tech-detail-report-title').textContent = isNoDone ? 'No se pudo terminar' : 'Terminar detalle';
      document.getElementById('tech-detail-report-sub').textContent = detail.title || 'Detalle';
      document.getElementById('tech-report-solution').value = detail.technicianReport?.solution || '';
      const previousMaterial = detail.technicianReport?.materialUsed || detail.materialPlanned || '';
      setTechNoMaterial(previousMaterial === 'No se usó nada');
      document.getElementById('tech-report-reason').value = detail.technicianReport?.reason || '';
      const cameraInput = document.getElementById('tech-report-photo-camera');
      const galleryInput = document.getElementById('tech-report-photo-gallery');
      if (cameraInput) cameraInput.value = '';
      if (galleryInput) galleryInput.value = '';
      const fileLabel = document.getElementById('tech-photo-file-label');
      if (fileLabel) fileLabel.textContent = 'Toca aquí para elegir evidencia';
      document.getElementById('tech-report-solution-box').style.display = isNoDone ? 'none' : 'block';
      document.getElementById('tech-report-material-box').style.display = isNoDone ? 'none' : 'block';
      document.getElementById('tech-report-photo-box').style.display = isNoDone ? 'none' : 'block';
      document.getElementById('tech-report-reason-box').style.display = isNoDone ? 'block' : 'none';
      document.getElementById('tech-report-save-done').style.display = isNoDone ? 'none' : 'inline-flex';
      document.getElementById('tech-report-save-no').style.display = isNoDone ? 'inline-flex' : 'none';
      const preview = document.getElementById('tech-report-photo-preview');
      preview.innerHTML = getTechReportPhotos(detail.technicianReport).map((photo, index) => `<img src="${photo}" alt="evidencia ${index + 1}">`).join('');
      renderTechPhotoPicker(detail.technicianReport || {});
      OM('tech-detail-report-mo');
    }


    function setTechNoMaterial(active) {
      currentTechNoMaterial = !!active;
      const btn = document.getElementById('tech-no-material-btn');
      if (btn) btn.classList.toggle('active', currentTechNoMaterial);
      const rows=document.getElementById('tech-material-rows'); if(rows)rows.style.display=currentTechNoMaterial?'none':'block';
    }

    function toggleTechNoMaterial() {
      setTechNoMaterial(!currentTechNoMaterial);
    }

    function getTechReportPhotos(report = {}) {
      const photos = [];
      if (Array.isArray(report.evidencePhotos)) photos.push(...report.evidencePhotos.filter(Boolean));
      if (report.evidencePhoto && !photos.includes(report.evidencePhoto)) photos.push(report.evidencePhoto);
      return photos;
    }

    function renderTechPhotoPicker(existingReport = {}) {
      const preview = document.getElementById('tech-report-photo-preview');
      const label = document.getElementById('tech-photo-file-label');
      if (!preview) return;
      const existing = getTechReportPhotos(existingReport);
      const existingHtml = existing.map((photo, index) => `
        <div class="tech-photo-thumb">
          <img src="${photo}" alt="foto guardada ${index + 1}">
          <span>Guardada ${index + 1}</span>
        </div>`).join('');
      const pendingHtml = pendingTechEvidencePhotos.map((photo, index) => `
        <div class="tech-photo-thumb">
          <img src="${photo}" alt="foto nueva ${index + 1}">
          <button type="button" onclick="removePendingTechPhoto(${index})">Quitar</button>
        </div>`).join('');
      preview.innerHTML = existingHtml + pendingHtml;
      if (label) label.textContent = pendingTechEvidencePhotos.length
        ? `${pendingTechEvidencePhotos.length} foto(s) nueva(s)`
        : 'Toca aquí para elegir evidencia';
    }

    function removePendingTechPhoto(index) {
      pendingTechEvidencePhotos.splice(index, 1);
      const detail = (state.workOrders || []).find(w => w.id === currentTechDetailReportId && !w.deletedAt);
      renderTechPhotoPicker(detail?.technicianReport || {});
    }

    function compressTechPhoto(file) {
      if (!file) return Promise.resolve('');
      return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
          img.onload = () => {
            const max = 1600;
            const scale = Math.min(1, max / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/webp', 0.82));
          };
          img.onerror = reject;
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    async function previewTechReportPhoto(inputId = 'tech-report-photo-gallery') {
      const input = document.getElementById(inputId);
      const files = Array.from(input?.files || []);
      for (const file of files) {
        const photo = await compressTechPhoto(file);
        if (photo) pendingTechEvidencePhotos.push(photo);
      }
      if (input) input.value = '';
      const detail = (state.workOrders || []).find(w => w.id === currentTechDetailReportId && !w.deletedAt);
      renderTechPhotoPicker(detail?.technicianReport || {});
    }

    async function readTechPhotoFiles() {
      return pendingTechEvidencePhotos.slice();
    }

    async function saveTechDetailReport(mode) {
      const detail = (state.workOrders || []).find(w => w.id === currentTechDetailReportId && !w.deletedAt);
      if (!detail) return;
      const solution = document.getElementById('tech-report-solution').value.trim();
      const usedItems=currentTechNoMaterial?[]:techMaterialItems.filter(x=>x.materialId&&Number(x.quantity)>0);
      const invalidItem=usedItems.find(item=>{const m=(state.materials||[]).find(x=>x.id===item.materialId);return !m||Number(item.quantity)>techMaterialAvailable(m);});
      if(invalidItem){const m=(state.materials||[]).find(x=>x.id===invalidItem.materialId);hideLoading();notify(`Solo tienes ${techMaterialAvailable(m)} ${m?.unit||''} de ${m?.name||'ese material'}. Te faltan ${Math.max(0,Number(invalidItem.quantity)-techMaterialAvailable(m))}.`,'err');return;}
      const materialUsed=currentTechNoMaterial?'No se usó nada':usedItems.map(item=>{const m=(state.materials||[]).find(x=>x.id===item.materialId);return `${item.quantity} ${m?.unit||''} de ${m?.name||'material'}`;}).join(', ');
      const reason = document.getElementById('tech-report-reason').value.trim();
      const existingPhotos = getTechReportPhotos(detail.technicianReport);
      const evidencePhotos = mode === 'terminado' ? [...existingPhotos, ...(await readTechPhotoFiles())] : [];
      if (mode === 'terminado' && !solution) {
        hideLoading();
        notify('Escribe qué solución le diste.', 'err');
        return;
      }
      if (mode === 'terminado' && !currentTechNoMaterial && !usedItems.length) {
        hideLoading();
        notify('Agrega el material usado o selecciona No se usó nada.', 'err');
        return;
      }
      if (mode === 'terminado' && !evidencePhotos.length) {
        hideLoading();
        notify('Agrega una foto de evidencia.', 'err');
        return;
      }
      if (mode === 'no_realizado' && !reason) {
        hideLoading();
        notify('Escribe por qué no se pudo terminar.', 'err');
        return;
      }
      const detailIndex = (state.workOrders || []).findIndex(w => w.id === detail.id);
      const originalDetail = cloneData(detail);
      const originalStops = [];
      const completedAt = new Date().toISOString();
      const stopWithDetail = TECH_ROUTE_DAYS
        .flatMap(day => visibleTechStops(day.id))
        .find(stop => getStopDetailsForTech(stop).some(item => item.id === detail.id));
      if (stopWithDetail) currentOpenTechStopId = stopWithDetail.id;
      detail.status = mode === 'terminado' ? 'completada' : 'no_realizado';
      detail.completedAt = mode === 'terminado' ? completedAt : '';
      detail.updatedAt = completedAt;
      detail.lastActionAt = completedAt;
      detail.lastAction = mode === 'terminado' ? 'terminó detalle técnico' : 'reportó detalle no realizado';
      detail.lastActionBy = loggedTech?.nombre || '';
      detail.technicianReport = {
        result: mode,
        solution: mode === 'terminado' ? solution : '',
        materialUsed: mode === 'terminado' ? materialUsed : '',
        materialItems: mode === 'terminado' ? usedItems : [],
        reason: mode === 'no_realizado' ? reason : '',
        evidencePhoto: mode === 'terminado' ? (evidencePhotos[0] || '') : '',
        evidencePhotos: mode === 'terminado' ? evidencePhotos : [],
        completedBy: loggedTech?.id || techRouteId || '',
        completedByName: loggedTech?.nombre || '',
        completedAt
      };
      if (typeof recordAudit === 'function') {
        recordAudit(detail.lastAction, detail, {
          byId: loggedTech?.id || techRouteId || '',
          byName: loggedTech?.nombre || 'Tecnico',
          byUsername: loggedTech?.usuario || '',
          byRole: 'tecnico'
        });
      }
      // Recalcular estado de todas las paradas donde aparece este detalle
      TECH_ROUTE_DAYS.forEach(day => visibleTechStops(day.id).forEach(stop => {
        const linkedToStop = (stop.detailIds || []).includes(detail.id);
        const matchesEquipment = stop.equipmentId && stop.equipmentId === detail.equipmentId;
        const matchesNode = stop.nodeId && stop.nodeId === detail.nodeId;
        
        if (linkedToStop || matchesEquipment || matchesNode) {
          originalStops.push({ stop, data: cloneData(stop) });
          const progress = getStopProgressForTech(stop);
          stop.siteStatus = progress.pending === 0 ? 'hecho' : 'en_proceso';
          stop.updatedAt = completedAt;
        }
      }));
      // Usar saveDB() directo (con cola) para garantizar que el reporte llega a la nube.
      // saveDBInBackground tenía una race condition: retryPendingCloudSave bloquea si hay
      // algún input activo (isUserEditingNow), causando que el admin no vea el cambio.
      notify(mode === 'terminado'
        ? 'Guardando reporte...'
        : 'Guardando...');
      try {
        const saved = await postWorkOrderReportToCloud(cloneData(detail));
        if(mode==='terminado') for(const item of usedItems){const m=(state.materials||[]).find(x=>x.id===item.materialId);const a=(m.allocations||[]).find(x=>x.technicianId===(loggedTech?.id||techRouteId));a.quantity=Math.max(0,Number(a.quantity)-Number(item.quantity));m.updatedAt=completedAt;await saveRecord('materials',m);}
        if (detailIndex >= 0 && saved?.workOrder) state.workOrders[detailIndex] = saved.workOrder;
        CM('tech-detail-report-mo');
        pendingTechEvidencePhotos = [];
        renderTechRoute();
        notify(mode === 'terminado'
          ? 'Detalle terminado y guardado correctamente.'
          : 'Reporte guardado correctamente.');
      } catch (e) {
        if (detailIndex >= 0) state.workOrders[detailIndex] = originalDetail;
        originalStops.forEach(item => Object.assign(item.stop, item.data));
        renderTechRoute();
        notify(`No se pudo guardar: ${e.message || e}. Inténtalo otra vez.`, 'err');
      }
    }

    async function reopenTechDetail(detailId) {
      notify('El técnico no puede reabrir detalles. Solicítalo al administrador.', 'err');
      return;
    }


    function getTechDetailLocationLabel(detail) {
      const saved = String(detail.detailLocation || '').trim();
      if (saved && typeof getLocationDisplay === 'function') return getLocationDisplay(saved).label || saved;
      if (saved) return saved;
      const lat = safeFloat(detail.lat);
      const lng = safeFloat(detail.lng);
      return !isNaN(lat) && !isNaN(lng) ? `${lat}, ${lng}` : '';
    }

    function getDetailMapsUrl(detail) {
      const saved = String(detail.detailLocation || '').trim();
      if (saved && typeof getLocationDisplay === 'function') {
        const loc = getLocationDisplay(saved);
        if (loc.url) return loc.url;
      }
      const lat = safeFloat(detail.lat);
      const lng = safeFloat(detail.lng);
      return getMapsUrl(lat, lng);
    }

    function getMapsUrl(lat, lng, label = '') {
      if (isNaN(lat) || isNaN(lng)) return '';
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
    }

    async function fetchTechOsrmRoute(points) {
      const valid = (points || [])
        .map(point => ({ lat: safeFloat(point.lat), lng: safeFloat(point.lng) }))
        .filter(point => !isNaN(point.lat) && !isNaN(point.lng));
      if (valid.length < 2) throw new Error('Sin puntos suficientes');
      const coords = valid.map(point => `${point.lng},${point.lat}`).join(';');
      const baseUrl = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false&continue_straight=false`;
      const urls = [
        `${baseUrl}&radiuses=${valid.map(() => 'unlimited').join(';')}`,
        `${baseUrl}&radiuses=${valid.map(() => 100000).join(';')}`,
        baseUrl
      ];
      let lastError = null;
      for (const url of urls) {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) throw new Error(`OSRM ${res.status}`);
          const data = await res.json();
          if (data.routes && data.routes[0]) return data.routes[0];
          lastError = new Error('Sin ruta por carretera');
        } catch(e) {
          lastError = e;
        }
      }
      throw lastError || new Error('OSRM no disponible');
    }

    async function fetchTechRoadRoute(points, chunkSize = 24) {
      const valid = (points || [])
        .map(point => ({ lat: safeFloat(point.lat), lng: safeFloat(point.lng) }))
        .filter(point => !isNaN(point.lat) && !isNaN(point.lng));
      if (valid.length < 2) throw new Error('Sin puntos suficientes');

      const features = [];
      let distance = 0;
      let duration = 0;
      const fetchSegment = async segment => {
        try {
          const route = await fetchTechOsrmRoute(segment);
          distance += Number(route.distance || 0);
          duration += Number(route.duration || 0);
          features.push({ type: 'Feature', geometry: route.geometry, properties: { kind: 'road' } });
        } catch(e) {
          for (let i = 0; i < segment.length - 1; i++) {
            const from = segment[i];
            const to = segment[i + 1];
            features.push({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: [[from.lng, from.lat], [to.lng, to.lat]] },
              properties: { kind: 'direct' }
            });
          }
        }
      };

      for (let start = 0; start < valid.length - 1; start += chunkSize - 1) {
        const segment = valid.slice(start, Math.min(start + chunkSize, valid.length));
        if (segment.length >= 2) await fetchSegment(segment);
      }
      if (!features.length) throw new Error('Sin ruta por carretera');
      return { geometry: { type: 'FeatureCollection', features }, distance, duration };
    }

    function moveTechStop(day, stopId, dir) {
      const ref = getTechRouteStopsRef(day);
      const visible = ref.filter(stop => !stop.deletedAt);
      const index = visible.findIndex(stop => stop.id === stopId);
      const next = index + dir;
      if (index < 0 || next < 0 || next >= visible.length) return;
      const actual = ref.findIndex(stop => stop.id === visible[index].id);
      const actualNext = ref.findIndex(stop => stop.id === visible[next].id);
      [ref[actual], ref[actualNext]] = [ref[actualNext], ref[actual]];
      saveDB();
      renderTechRoute();
      notify('Orden actualizado');
    }

    function initTechRouteMap() {
      if (typeof L === 'undefined') return;
      if (techRouteMap) {
        setTimeout(() => techRouteMap.invalidateSize(), 80);
        return;
      }
      techRouteMap = L.map('tech-route-map', {
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomControl: false,
        tap: false
      }).setView([17.55, -99.50], 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
      }).addTo(techRouteMap);
    }

    async function renderTechRouteMap(stops) {
      if (!techRouteMap) return;
      techLastMapStops = cloneData(stops || []);
      const fingerprint = getTechRouteMapFingerprint(stops);
      if (fingerprint && fingerprint === techRouteMapFingerprint) {
        setTimeout(() => techRouteMap.invalidateSize(), 80);
        return;
      }
      techRouteMapFingerprint = fingerprint;
      if (techRouteLayer) {
        techRouteMap.removeLayer(techRouteLayer);
        techRouteLayer = null;
      }
      techRouteMarkers.forEach(marker => techRouteMap.removeLayer(marker));
      techRouteMarkers = [];
      if (!stops.length) return;
      stops.forEach((stop, index) => {
        const marker = L.marker([stop.lat, stop.lng], {
          icon: L.divIcon({
            html: `<div class="route-map-marker">${index + 1}</div>`,
            className: '',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        }).addTo(techRouteMap);
        marker.bindPopup(`<div style="min-width:190px"><strong>${escapeTech(stop.name)}</strong><br>${escapeTech(stop.dayLabel)}${renderMapStopDetailStats(stop)}</div>`);
        techRouteMarkers.push(marker);
      });
      if (stops.length > 1) {
        try {
          const route = await fetchTechRoadRoute(stops, 24);
          techRouteLayer = L.geoJSON(route.geometry, {
            style: { color: '#0984e3', weight: 6, opacity: .9 }
          }).addTo(techRouteMap);
        } catch (e) {
          techRouteLayer = L.polyline(stops.map(stop => [stop.lat, stop.lng]), { color: '#0984e3', weight: 5, dashArray: '10 8' }).addTo(techRouteMap);
          notify('No se pudo calcular carretera; se trazo directo', 'err');
        }
      }
      techRouteMap.fitBounds(stops.map(stop => [stop.lat, stop.lng]), { padding: [28, 28] });
      setTimeout(() => techRouteMap.invalidateSize(), 80);
    }

    function openTechRouteMapConfirm() {
      OM('tech-map-confirm-mo');
    }

    function openTechFullscreenMap() {
      CM('tech-map-confirm-mo');
      OM('tech-map-full-mo');
      setTimeout(async () => {
        initTechFullscreenMap();
        await renderTechFullscreenMap(techLastMapStops);
      }, 80);
    }

    function closeTechFullscreenMap() {
      CM('tech-map-full-mo');
      document.body.classList.remove('modal-open');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }

    function initTechFullscreenMap() {
      if (typeof L === 'undefined') return;
      if (techRouteFullMap) {
        setTimeout(() => techRouteFullMap.invalidateSize(), 80);
        return;
      }
      techRouteFullMap = L.map('tech-route-map-full').setView([17.55, -99.50], 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
      }).addTo(techRouteFullMap);
    }

    async function renderTechFullscreenMap(stops) {
      if (!techRouteFullMap) return;
      if (techRouteFullLayer) {
        techRouteFullMap.removeLayer(techRouteFullLayer);
        techRouteFullLayer = null;
      }
      techRouteFullMarkers.forEach(marker => techRouteFullMap.removeLayer(marker));
      techRouteFullMarkers = [];
      const visible = (stops || []).filter(stop => !isNaN(safeFloat(stop.lat)) && !isNaN(safeFloat(stop.lng)));
      if (!visible.length) return;
      visible.forEach((stop, index) => {
        const marker = L.marker([stop.lat, stop.lng], {
          icon: L.divIcon({
            html: `<div class="route-map-marker">${index + 1}</div>`,
            className: '',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        }).addTo(techRouteFullMap);
        marker.bindTooltip(`${index + 1}. ${escapeTech(stop.name || 'Parada')}`, { permanent: true, direction: 'right', offset: [12, 0] });
        marker.bindPopup(`<div style="min-width:190px"><strong>${escapeTech(stop.name)}</strong><br>${escapeTech(stop.dayLabel || '')}${renderMapStopDetailStats(stop)}</div>`);
        techRouteFullMarkers.push(marker);
      });
      if (visible.length > 1) {
        try {
          const route = await fetchTechRoadRoute(visible, 24);
          techRouteFullLayer = L.geoJSON(route.geometry, {
            style: { color: '#0984e3', weight: 6, opacity: .9 }
          }).addTo(techRouteFullMap);
        } catch(e) {
          techRouteFullLayer = L.polyline(visible.map(stop => [stop.lat, stop.lng]), { color: '#0984e3', weight: 5, dashArray: '10 8' }).addTo(techRouteFullMap);
        }
      }
      techRouteFullMap.fitBounds(visible.map(stop => [stop.lat, stop.lng]), { padding: [34, 34] });
      setTimeout(() => techRouteFullMap.invalidateSize(), 120);
    }

    function getTechRouteMapFingerprint(stops) {
      try {
        return JSON.stringify((stops || []).map(stop => ({
          id: stop.id,
          lat: Number(safeFloat(stop.lat)).toFixed(6),
          lng: Number(safeFloat(stop.lng)).toFixed(6),
          pending: stop.progress?.pending ?? 0
        })));
      } catch(e) {
        return '';
      }
    }

    function thinTechRoutePoints(points, maxPoints) {
      if (points.length <= maxPoints) return points;
      const keep = [points[0]];
      const step = (points.length - 1) / (maxPoints - 1);
      for (let i = 1; i < maxPoints - 1; i++) {
        keep.push(points[Math.round(i * step)]);
      }
      keep.push(points[points.length - 1]);
      return keep;
    }

    function escapeTech(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[ch]));
    }

try{document.documentElement.dataset.role=(JSON.parse(localStorage.getItem('user')||'{}').role||'').toLowerCase()}catch(e){}

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
    let techRouteMapFingerprint = '';
    let currentTechDetailReportId = '';
    let currentTechDetailReportMode = 'terminado';
    let currentTechNoMaterial = false;
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
      if (isTechBusyEditing() || document.hidden) return;
      try {
        const res = await fetch(`${API || ''}/api/data?ts=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const fingerprint = getTechRemoteFingerprint(data);
        if (!fingerprint || fingerprint === techRouteMapFingerprint) return;
        techRouteMapFingerprint = fingerprint;
        applyStateData({
          equipment: safeParse(data.equipment),
          nodes: safeParse(data.nodes),
          workOrders: safeParse(data.workOrders),
          technicians: safeParse(data.technicians),
          users: safeParse(data.users),
          techAccessLog: safeParse(data.techAccessLog),
          deletionRequests: safeParse(data.deletionRequests),
          materials: safeParse(data.materials),
          routes: safeParse(data.routes),
          weekPlan: data.weekPlan || {},
          prepChecked: data.prepChecked || {},
          syncMeta: data.syncMeta || {}
        });
        normalizeTechRoutePlan();
        renderTechRoute();
      } catch (e) {
        console.log('No se pudo verificar actualización de ruta', e);
      }
    }

    function startTechLiveSync() {
      if (techLiveTimer) clearInterval(techLiveTimer);
      techRouteMapFingerprint = '';
      checkTechRouteUpdates();
      techLiveTimer = setInterval(checkTechRouteUpdates, 15000);
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
      if (techRouteScope === 'general') {
        localStorage.setItem('netops_tech_session:general:latest', payload);
        sessionStorage.setItem('netops_tech_session:general:latest', payload);
      }
    }

    function getAllGeneralPlansForTechRoute() {
      normalizeTechRoutePlan();
      return (state.weekPlan[SHARED_ROUTE_ID]._generalPlans || []).filter(plan => !plan.deletedAt);
    }

    function getAssignedGeneralPlansForTech(technicianId) {
      const plans = getAllGeneralPlansForTechRoute();
      if (!technicianId) return [];
      return plans.filter(plan => plan.assignedTechId === technicianId);
    }

    function getGeneralPlanForTechRoute(preferredTechId = '') {
      normalizeTechRoutePlan();
      const plans = getAllGeneralPlansForTechRoute();
      if (!plans.length) return null;
      const technicianId = preferredTechId || loggedTech?.id || techRouteId || '';
      const explicit = techRouteGeneralPlanId ? plans.find(item => item.id === techRouteGeneralPlanId) : null;
      if (explicit && explicit.assignedTechId === technicianId) return explicit;

      if (techRouteScope === 'general' && technicianId) {
        const assigned = plans.filter(plan => plan.assignedTechId === technicianId);
        const assignedWithStops = assigned.filter(plan => Array.isArray(plan.stops) && plan.stops.some(stop => !stop.deletedAt));
        const chosen = assignedWithStops[assignedWithStops.length - 1] || assigned[assigned.length - 1];
        if (chosen) {
          techRouteGeneralPlanId = chosen.id;
          return chosen;
        }
      }

      techRouteGeneralPlanId = '';
      return null;
    }

    function canTechOpenCurrentRoute(technicianId) {
      if (!technicianId) return false;
      if (techRouteScope !== 'general') return !techRouteId || techRouteId === technicianId;
      const plan = getGeneralPlanForTechRoute(technicianId);
      return !!plan && plan.assignedTechId === technicianId;
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
      normalizeTechRoutePlan();
      initTechRouteMap();
      renderTechRoute();
      startTechLiveSync();
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

    function getStopDetailsForTech(stop) {
      const ids = new Set(stop.detailIds || []);
      const details = new Map();
      (state.workOrders || []).forEach(w => {
        if (w.deletedAt) return;
        const linked = ids.has(w.id);
        const sameEquipment = stop.equipmentId && w.equipmentId === stop.equipmentId;
        if (linked || sameEquipment) details.set(w.id, w);
      });
      return sortDetailsByPriority(Array.from(details.values()));
    }

    function getStopProgressForTech(stop) {
      const details = getStopDetailsForTech(stop);
      const done = details.filter(d => d.status === 'completada').length;
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
      return {
        lat: safeFloat(antenna?.lat ?? stop?.lat),
        lng: safeFloat(antenna?.lng ?? stop?.lng)
      };
    }

    function getTechRoutePlanMaterial() {
      if (techRouteScope === 'general') return getGeneralPlanForTechRoute()?.materialSummary || '';
      return state.weekPlan?.[techRouteId]?.materialSummary || '';
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
        <div class="tech-plan-pill">📦 ${current.materialSummary ? escapeTech(current.materialSummary) : 'Sin material capturado'}</div>
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
        ? `${activePlan?.name || 'Sin plan asignado'} · ${tech?.nombre || 'Técnico'}`
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
      document.getElementById('tech-route-sub').textContent = `${stops.length} paradas · ${pending} pendientes · ${done} hechos`;
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
      const name = stop.name || eq?.name || 'Parada';
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
            <div class="tech-stop-details-panel" id="tech-stop-details-${escapeTech(stop.id)}" style="display:none">
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
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function renderTechDetail(detail, day = '', stopId = '') {
      const detailLocation = getTechDetailLocationLabel(detail);
      const detailMapsUrl = getDetailMapsUrl(detail);
      const report = detail.technicianReport || {};
      const done = detail.status === 'completada';
      const noDone = detail.status === 'no_realizado';
      const reportHtml = (report.solution || report.reason || report.materialUsed || report.completedAt) ? `
        <div class="tech-report-mini">
          <b>${noDone ? 'No realizado' : 'Reporte'}:</b>
          ${report.solution ? `<span>Solución: ${escapeTech(report.solution)}</span>` : ''}
          ${report.reason ? `<span>Motivo: ${escapeTech(report.reason)}</span>` : ''}
          ${report.materialUsed ? `<span>Material: ${escapeTech(report.materialUsed)}</span>` : ''}
          ${report.completedAt ? `<span>${formatTechDateTime(report.completedAt)}</span>` : ''}
          ${report.evidencePhoto ? `<button type="button" class="evidence-link" data-evidence="${encodeURIComponent(report.evidencePhoto)}" onclick="openEvidenceEncoded(this.dataset.evidence)">Ver foto</button>` : ''}
        </div>` : '';
      return `
        <div class="route-detail-line ${done ? 'done' : ''} ${noDone ? 'not-done' : ''}">
          <span style="border-color:${pc(detail.priority)}">${done ? '✅ Terminado' : (noDone ? '⚠️ No realizado' : pl(detail.priority))}</span>
          <strong>${escapeTech(detail.title || 'Detalle')}</strong>
          ${detail.desc ? `<small>${escapeTech(detail.desc)}</small>` : ''}
          ${detail.materialPlanned ? `<small>📦 Material sugerido: ${escapeTech(detail.materialPlanned)}</small>` : ''}
          ${reportHtml}
          <div class="tech-detail-actions">
            ${done || noDone
              ? `<span class="tech-locked-done">Reporte enviado</span>`
              : `<button class="btn bsm bg2" onclick="openTechDetailReport('${escapeTech(detail.id)}','terminado')">Terminar</button><button class="btn bsm ba" onclick="openTechDetailReport('${escapeTech(detail.id)}','no_realizado')">No lo hice</button>`}
          </div>
        </div>
      `;
    }

    function toggleTechStopDetails(stopId) {
      document.querySelectorAll('.tech-stop-details-panel').forEach(panel => {
        if (panel.id !== `tech-stop-details-${stopId}`) panel.style.display = 'none';
      });
      const panel = document.getElementById(`tech-stop-details-${stopId}`);
      if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    function fillTechMaterialList() {
      const list = document.getElementById('tech-material-list');
      if (!list) return;
      const names = new Set();
      (state.materials || []).forEach(m => {
        const name = m.name || m.nombre || m.title || m.descripcion || '';
        if (name) names.add(name);
      });
      (state.workOrders || []).forEach(w => {
        const mat = w.materialPlanned || w.technicianReport?.materialUsed || '';
        if (mat) String(mat).split(/[,\n]/).map(x => x.trim()).filter(Boolean).forEach(x => names.add(x));
      });
      list.innerHTML = Array.from(names).map(name => `<option value="${escapeTech(name)}"></option>`).join('');
    }

    function openTechDetailReport(detailId, mode = 'terminado') {
      const detail = (state.workOrders || []).find(w => w.id === detailId && !w.deletedAt);
      if (!detail) return;
      currentTechDetailReportId = detailId;
      currentTechDetailReportMode = mode;
      fillTechMaterialList();
      document.getElementById('tech-detail-report-title').textContent = mode === 'no_realizado' ? 'Reportar detalle no realizado' : 'Terminar detalle';
      document.getElementById('tech-detail-report-sub').textContent = detail.title || 'Detalle';
      document.getElementById('tech-report-solution').value = detail.technicianReport?.solution || '';
      const previousMaterial = detail.technicianReport?.materialUsed || detail.materialPlanned || '';
      document.getElementById('tech-report-material').value = previousMaterial === 'No se usó nada' ? '' : previousMaterial;
      setTechNoMaterial(previousMaterial === 'No se usó nada');
      document.getElementById('tech-report-reason').value = detail.technicianReport?.reason || '';
      document.getElementById('tech-report-photo').value = '';
      const fileLabel = document.getElementById('tech-photo-file-label');
      if (fileLabel) fileLabel.textContent = 'Toca aquí para elegir evidencia';
      document.getElementById('tech-report-reason-box').style.display = mode === 'no_realizado' ? 'block' : 'none';
      const preview = document.getElementById('tech-report-photo-preview');
      preview.innerHTML = detail.technicianReport?.evidencePhoto ? `<img src="${detail.technicianReport.evidencePhoto}" alt="evidencia">` : '';
      OM('tech-detail-report-mo');
    }


    function setTechNoMaterial(active) {
      currentTechNoMaterial = !!active;
      const btn = document.getElementById('tech-no-material-btn');
      const input = document.getElementById('tech-report-material');
      if (btn) btn.classList.toggle('active', currentTechNoMaterial);
      if (input) {
        input.disabled = currentTechNoMaterial;
        if (currentTechNoMaterial) input.value = '';
      }
    }

    function toggleTechNoMaterial() {
      setTechNoMaterial(!currentTechNoMaterial);
    }

    function previewTechReportPhoto() {
      const file = document.getElementById('tech-report-photo')?.files?.[0];
      const label = document.getElementById('tech-photo-file-label');
      const preview = document.getElementById('tech-report-photo-preview');
      if (label) label.textContent = file ? file.name : 'Toca aquí para elegir evidencia';
      if (!file || !preview) return;
      const reader = new FileReader();
      reader.onload = () => { preview.innerHTML = `<img src="${reader.result}" alt="evidencia">`; };
      reader.readAsDataURL(file);
    }

    function readTechPhotoFile() {
      const file = document.getElementById('tech-report-photo')?.files?.[0];
      if (!file) return Promise.resolve('');
      return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
          img.onload = () => {
            const max = 1280;
            const scale = Math.min(1, max / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.72));
          };
          img.onerror = reject;
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    async function saveTechDetailReport(mode) {
      const detail = (state.workOrders || []).find(w => w.id === currentTechDetailReportId && !w.deletedAt);
      if (!detail) return;
      const solution = document.getElementById('tech-report-solution').value.trim();
      const materialInput = document.getElementById('tech-report-material').value.trim();
      const materialUsed = currentTechNoMaterial ? 'No se usó nada' : materialInput;
      const reason = document.getElementById('tech-report-reason').value.trim();
      const existingPhoto = detail.technicianReport?.evidencePhoto || '';
      const evidencePhoto = await readTechPhotoFile();
      if (mode === 'terminado' && !solution) {
        notify('Escribe qué solución le diste.', 'err');
        return;
      }
      if (!materialUsed) {
        notify('Agrega el material usado o selecciona No se usó nada.', 'err');
        return;
      }
      if (mode === 'terminado' && !evidencePhoto && !existingPhoto) {
        notify('Agrega una foto de evidencia.', 'err');
        return;
      }
      if (mode === 'no_realizado' && !reason) {
        notify('Escribe por qué no se pudo terminar.', 'err');
        return;
      }
      detail.status = mode === 'terminado' ? 'completada' : 'no_realizado';
      detail.technicianReport = {
        result: mode,
        solution,
        materialUsed,
        reason: mode === 'no_realizado' ? reason : '',
        evidencePhoto: evidencePhoto || existingPhoto,
        completedBy: loggedTech?.id || techRouteId || '',
        completedByName: loggedTech?.nombre || '',
        completedAt: new Date().toISOString()
      };
      // Recalcular estado de todas las paradas donde aparece este detalle
      TECH_ROUTE_DAYS.forEach(day => visibleTechStops(day.id).forEach(stop => {
        if ((stop.detailIds || []).includes(detail.id) || (stop.equipmentId && stop.equipmentId === detail.equipmentId)) {
          const progress = getStopProgressForTech(stop);
          stop.siteStatus = progress.pending === 0 ? 'hecho' : 'en_proceso';
        }
      }));
      await saveDB();
      CM('tech-detail-report-mo');
      renderTechRoute();
      notify(mode === 'terminado' ? 'Detalle terminado con evidencia' : 'Detalle reportado como no realizado');
    }

    async function reopenTechDetail(detailId) {
      notify('El técnico no puede reabrir detalles. Solicítalo al administrador.', 'err');
      return;
    }


    function getTechDetailLocationLabel(detail) {
      const saved = String(detail.detailLocation || '').trim();
      if (saved) return saved;
      const lat = safeFloat(detail.lat);
      const lng = safeFloat(detail.lng);
      return !isNaN(lat) && !isNaN(lng) ? `${lat}, ${lng}` : '';
    }

    function getDetailMapsUrl(detail) {
      const lat = safeFloat(detail.lat);
      const lng = safeFloat(detail.lng);
      return getMapsUrl(lat, lng);
    }

    function getMapsUrl(lat, lng, label = '') {
      if (isNaN(lat) || isNaN(lng)) return '';
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
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
      techRouteMap = L.map('tech-route-map').setView([17.55, -99.50], 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
      }).addTo(techRouteMap);
    }

    async function renderTechRouteMap(stops) {
      if (!techRouteMap) return;
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
        marker.bindPopup(`<strong>${escapeTech(stop.name)}</strong><br>${escapeTech(stop.dayLabel)}<br>${stop.progress.pending} pendientes`);
        techRouteMarkers.push(marker);
      });
      if (stops.length > 1) {
        try {
          const routedStops = stops.length > 25 ? thinTechRoutePoints(stops, 25) : stops;
          const coords = routedStops.map(stop => `${stop.lng},${stop.lat}`).join(';');
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
          if (!res.ok) throw new Error('OSRM no disponible');
          const data = await res.json();
          if (!data.routes || !data.routes[0]) throw new Error('Sin ruta por carretera');
          techRouteLayer = L.geoJSON(data.routes[0].geometry, {
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
  
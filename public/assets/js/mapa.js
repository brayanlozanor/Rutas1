let mapaView;
let equipmentMarkers = {};
let nodeMarkers = {};
let planLayer;
let linkLayer;
let didInitialFit = false;
let mapaPageStarted = false;
let mapaResizeObserver = null;
function mapRemoteParams(){return {scoped:'1',includeRelated:'1'};}
const previousMapDataPartParams=window.netopsGetDataPartParams;
window.netopsGetDataPartParams=part=>(part==='equipment'||part==='nodes')?mapRemoteParams():previousMapDataPartParams?.(part);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
}


function isAttentionRole() {
  return typeof userHasRole === 'function' && userHasRole('atencion_clientes');
}

function applyMapRoleRestrictions() {
  if (!isAttentionRole()) return;
  const view = document.getElementById('map-view-filter');
  if (view) view.value = 'both';
  const search = document.getElementById('map-search');
  if (search) search.placeholder = 'Buscar antena, pueblo o zona...';
  const labels = document.getElementById('map-show-labels');
  const labelsText = document.getElementById('map-label-text');
  const plan = document.getElementById('map-show-plan');
  if (labels) labels.checked = false;
  if (labelsText) labelsText.textContent = 'Ver nombres de pueblos';
  if (plan) plan.checked = false;
  document.querySelectorAll('[data-map-admin-only], .map-plan-toggle, #map-plan-select, .map-links-toggle, .map-legend-equipment').forEach(el => el.style.display = 'none');
}

function initMapaPage() {
  if (mapaPageStarted) return;
  mapaPageStarted = true;
  if (!checkAuth()) return;
  const nodeOnlyOption = document.querySelector('#map-view-filter option[value="nodes"]');
  if (nodeOnlyOption) nodeOnlyOption.textContent = 'Solo pueblos';
  fillMapFilters();
  applyMapRoleRestrictions();
  initMapCanvas();
  renderMapStats();
  updateMapMarkers({ fit: true });
  loadDB({ showOverlay: false, preferCache: true }).then(() => {
    fillMapFilters();
    applyMapRoleRestrictions();
    renderMapStats();
    updateMapMarkers({ fit: false });
    markMapReady();
  }).catch(error => {
    console.warn('No se pudo cargar el mapa desde la nube.', error);
    markMapReady('Error Cloudflare/D1');
  });
}

function hydrateMapFromLocalBackup() {
  localStorage.removeItem('netops_backup');
}

function fillMapFilters() {
  const zone = document.getElementById('map-zone-filter');
  if (zone) zone.innerHTML = '<option value="all">Todas las zonas</option>' + REGS.map(r => `<option value="${r.id}">${r.n}</option>`).join('');
  renderMapPlanOptions();
  renderMapSearchOptions();
}

function renderMapPlanOptions() {
  const select = document.getElementById('map-plan-select');
  if (!select) return;
  const previous = select.value || 'all';
  const options = collectMapPlanGroups().map(group => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.label)} (${group.stops.length})</option>`);
  select.innerHTML = '<option value="all">Todos los planes</option>' + options.join('');
  select.value = Array.from(select.options).some(option => option.value === previous) ? previous : 'all';
}

function renderMapSearchOptions() {
  const list = document.getElementById('map-search-options');
  if (!list) return;
  const rows = [];
  (state.equipment || []).filter(e => !e.deletedAt).slice(0, 180).forEach(eq => rows.push(`<option value="${escapeHtml(eq.name || '')}">${escapeHtml(eq.ip || getZoneLabel(eq.region))}</option>`));
  (state.nodes || []).filter(n => !n.deletedAt).slice(0, 180).forEach(n => rows.push(`<option value="${escapeHtml(getNodeLabel(n))}">${escapeHtml(getZoneLabel(n.zone))}</option>`));
  list.innerHTML = rows.join('');
}

function initMapCanvas() {
  if (mapaView) {
    setTimeout(() => mapaView.invalidateSize(), 50);
    return;
  }
  const mapEl = document.getElementById('map');
  if (mapEl) {
    mapEl.classList.add('map-is-loading');
    if (!document.getElementById('map-loading-note')) {
      const note = document.createElement('div');
      note.id = 'map-loading-note';
      note.className = 'map-loading-note';
      note.textContent = 'Cargando mapa...';
      mapEl.appendChild(note);
    }
  }
  mapaView = L.map('map').setView([17.35, -99.35], 8);
  const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'OpenStreetMap',
    maxZoom: 19
  });
  tiles.on('load', () => markMapReady());
  tiles.on('tileerror', () => markMapReady('Mapa base no disponible. Revisa conexion.'));
  tiles.addTo(mapaView);
  planLayer = L.layerGroup().addTo(mapaView);
  linkLayer = L.layerGroup().addTo(mapaView);
  setupMapResponsiveResize(mapEl);
  setTimeout(() => markMapReady(), 4000);
}

function setupMapResponsiveResize(mapEl) {
  if (!mapEl || mapaResizeObserver) return;
  let resizeFrame = 0;
  const refreshMapSize = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      if (mapaView) mapaView.invalidateSize({ pan: false, debounceMoveend: true });
    });
  };
  if ('ResizeObserver' in window) {
    mapaResizeObserver = new ResizeObserver(refreshMapSize);
    mapaResizeObserver.observe(mapEl);
    const sidebar = document.querySelector('.topbar.app-sidebar');
    if (sidebar) mapaResizeObserver.observe(sidebar);
  } else {
    mapaResizeObserver = { disconnect() {} };
  }
  window.addEventListener('resize', refreshMapSize, { passive: true });
  window.addEventListener('orientationchange', refreshMapSize, { passive: true });
}

function markMapReady(message = '') {
  const mapEl = document.getElementById('map');
  const note = document.getElementById('map-loading-note');
  if (!mapEl) return;
  mapEl.classList.remove('map-is-loading');
  if (note) {
    if (message) note.textContent = message;
    else note.remove();
  }
  if (mapaView) setTimeout(() => mapaView.invalidateSize(), 80);
}

function getMapFilters() {
  return {
    view: document.getElementById('map-view-filter')?.value || 'both',
    zone: document.getElementById('map-zone-filter')?.value || 'all',
    query: normalizeName(document.getElementById('map-search')?.value || ''),
    labels: !!document.getElementById('map-show-labels')?.checked,
    plan: !!document.getElementById('map-show-plan')?.checked,
    planId: document.getElementById('map-plan-select')?.value || 'all',
    links: true
  };
}

function filteredEquipment() {
  const { zone, query } = getMapFilters();
  return (state.equipment || []).filter(eq => {
    if (eq.deletedAt) return false;
    if (zone !== 'all' && eq.region !== zone) return false;
    if (!query) return true;
    return [eq.name, eq.ip, eq.ssid, getZoneLabel(eq.region)].some(val => normalizeName(val).includes(query));
  });
}

function filteredNodes() {
  const { zone, query } = getMapFilters();
  return (state.nodes || []).filter(node => {
    if (node.deletedAt) return false;
    if (zone !== 'all' && node.zone !== zone) return false;
    if (!query) return true;
    return [node.nodeCode, node.town, node.name, getZoneLabel(node.zone), getNodeLabel(node)].some(val => normalizeName(val).includes(query));
  });
}

function equipmentIcon(color) {
  return L.divIcon({
    className: 'custom-map-icon',
    html: `<div style="width:16px;height:16px;border-radius:4px;background:${color};border:2px solid #fff;box-shadow:0 4px 12px rgba(15,23,42,.28)"></div>`,
    iconSize: [16,16],
    iconAnchor: [8,8]
  });
}

function nodeIcon(color) {
  return L.divIcon({
    className: 'custom-map-icon',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 4px 12px rgba(15,23,42,.28)"></div>`,
    iconSize: [16,16],
    iconAnchor: [8,8]
  });
}

function planIcon() {
  return L.divIcon({
    className: 'custom-map-icon',
    html: '<div style="width:12px;height:12px;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 4px 12px rgba(37,99,235,.35)"></div>',
    iconSize: [12,12],
    iconAnchor: [6,6]
  });
}

function clearMarkerCollections() {
  Object.values(equipmentMarkers).forEach(marker => mapaView.removeLayer(marker));
  Object.values(nodeMarkers).forEach(marker => mapaView.removeLayer(marker));
  equipmentMarkers = {};
  nodeMarkers = {};
  if (planLayer) planLayer.clearLayers();
  if (linkLayer) linkLayer.clearLayers();
}

function updateMapMarkers(options = {}) {
  if (!mapaView) return;

  // Preservar la vista actual ANTES de re-crear los marcadores.
  // Esto evita que el mapa salte al centro/zoom por defecto durante el auto-sync.
  const currentCenter = mapaView.getCenter();
  const currentZoom = mapaView.getZoom();

  clearMarkerCollections();
  const { view, labels, plan, links } = getMapFilters();
  const bounds = [];

  if (view === 'both' || view === 'equipment') {
    filteredEquipment().forEach(eq => {
      const lat = safeFloat(eq.lat), lng = safeFloat(eq.lng);
      if (isNaN(lat) || isNaN(lng)) return;
      const st = getEntityPriorityStatus('equipment', eq.id);
      const marker = L.marker([lat, lng], { icon: equipmentIcon(st.color) }).addTo(mapaView);
      marker.bindPopup(`
        <div style="min-width:230px">
          <strong style="display:block;font-size:15px">${escapeHtml(eq.name || 'Equipo')}</strong>
          <div class="entity-sub">${escapeHtml(getZoneLabel(eq.region))}</div>
          ${eq.ip ? `<div style="margin-top:8px;font-size:12px"><strong>IP:</strong> ${escapeHtml(eq.ip)}</div>` : ''}
          <div style="margin-top:8px"><span class="badge zone">Mikrotik</span> <span class="badge" style="background:${st.color}22;color:${st.color};border-color:${st.color}55">${st.label} - ${st.count}</span></div>
          ${renderMapEntityDetailStats('equipment', eq.id)}
          ${getEquipmentLinkedNodes(eq.id).length ? `<div style="margin-top:7px;font-size:12px"><strong>Nodos vinculados:</strong> ${getEquipmentLinkedNodes(eq.id).length}</div>` : ''}${isAttentionRole() ? '' : `<button class="btn bc bfu" style="margin-top:10px" onclick="openMapEntityDetails('equipment','${eq.id}')">Mostrar detalles</button>`}
        </div>`);
      if (labels && !isAttentionRole()) marker.bindTooltip(eq.name || 'Mikrotik', { permanent:true, direction:'top', offset:[0,-10], opacity:.9 });
      equipmentMarkers[eq.id] = marker;
      bounds.push([lat, lng]);
    });
  }

  if (view === 'both' || view === 'nodes') {
    filteredNodes().forEach(node => {
      const lat = safeFloat(node.lat), lng = safeFloat(node.lng);
      if (isNaN(lat) || isNaN(lng)) return;
      const st = getEntityPriorityStatus('node', node.id);
      const marker = L.marker([lat, lng], { icon: nodeIcon(st.color) }).addTo(mapaView);
      marker.bindPopup(`
        <div style="min-width:230px">
          <strong style="display:block;font-size:15px">${escapeHtml(getNodeLabel(node) || 'Pueblo')}</strong>
          <div class="entity-sub">${escapeHtml(getZoneLabel(node.zone))}</div>
          <div style="margin-top:8px"><span class="badge success">Pueblo</span> <span class="badge" style="background:${st.color}22;color:${st.color};border-color:${st.color}55">${st.label} - ${st.count}</span></div>
          ${renderMapEntityDetailStats('node', node.id)}
          ${node.notes ? `<div style="margin-top:6px;font-size:12px;color:#475569">${escapeHtml(node.notes)}</div>` : ''}
          <button class="btn bc bfu" style="margin-top:10px" onclick="openMapEntityDetails('node','${node.id}')">Mostrar detalles</button>
        </div>`);
      if (labels) marker.bindTooltip(getNodeLabel(node), { permanent:true, direction:'top', offset:[0,-10], opacity:.9 });
      nodeMarkers[node.id] = marker;
      bounds.push([lat, lng]);
    });
  }

  if (links) renderAntennaNodeLinksOverlay(bounds);
  if (plan) renderPlanOverlay(bounds);

  renderMapStats();

  if (options.fit && !didInitialFit && bounds.length) {
    // Solo hacer fit al cargar por primera vez
    mapaView.fitBounds(bounds, { padding:[36,36] });
    didInitialFit = true;
  } else if (!options.fit && didInitialFit && currentCenter && currentZoom !== undefined) {
    // Restaurar la posicion y zoom que tenia el usuario ANTES del re-render.
    // animate:false evita el efecto visual de "salto" o "recarga".
    mapaView.setView(currentCenter, currentZoom, { animate: false, duration: 0 });
  }
}

function renderAntennaNodeLinksOverlay(bounds = []) {
  if (!linkLayer) return;
  const inferredLinks = new Map();
  (state.workOrders || []).forEach(order => {
    if (!order || order.deletedAt || !order.equipmentId || !order.nodeId) return;
    if (!inferredLinks.has(order.equipmentId)) inferredLinks.set(order.equipmentId, new Set());
    inferredLinks.get(order.equipmentId).add(order.nodeId);
  });
  (state.equipment || []).filter(eq => !eq.deletedAt).forEach(eq => {
    const eqLat = safeFloat(eq.lat), eqLng = safeFloat(eq.lng);
    if (isNaN(eqLat) || isNaN(eqLng)) return;
    const linkedIds = new Set(getEquipmentLinkedNodeIds(eq.id));
    (inferredLinks.get(eq.id) || new Set()).forEach(nodeId => linkedIds.add(nodeId));
    const linkedNodes = (state.nodes || []).filter(node => node && !node.deletedAt && linkedIds.has(node.id));
    linkedNodes.forEach(node => {
      const nLat = safeFloat(node.lat), nLng = safeFloat(node.lng);
      if (isNaN(nLat) || isNaN(nLng)) return;
      L.polyline([[eqLat, eqLng], [nLat, nLng]], { color:'#0ea5e9', weight:3, opacity:.7, dashArray:'7 7' }).addTo(linkLayer)
        .bindPopup(`<strong>${escapeHtml(eq.name || 'Antena')}</strong><br>-> ${escapeHtml(getNodeLabel(node))}`);
      bounds.push([eqLat, eqLng], [nLat, nLng]);
    });
  });
}

function findOrderLatLng(order) {
  let lat = safeFloat(order.lat || order.detailLat), lng = safeFloat(order.lng || order.detailLng);
  if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  if (order.equipmentId) {
    const eq = (state.equipment || []).find(e => e.id === order.equipmentId);
    lat = safeFloat(eq?.lat); lng = safeFloat(eq?.lng);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }
  if (order.nodeId) {
    const node = (state.nodes || []).find(n => n.id === order.nodeId);
    lat = safeFloat(node?.lat); lng = safeFloat(node?.lng);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }
  return null;
}

function normalizeMapPlanStop(stop, index, group) {
  if (!stop || stop.deletedAt) return null;
  let lat = safeFloat(stop.lat);
  let lng = safeFloat(stop.lng);
  if ((isNaN(lat) || isNaN(lng)) && stop.equipmentId) {
    const eq = (state.equipment || []).find(item => item.id === stop.equipmentId && !item.deletedAt);
    lat = safeFloat(eq?.lat);
    lng = safeFloat(eq?.lng);
  }
  if (isNaN(lat) || isNaN(lng)) return null;
  return {
    ...stop,
    lat,
    lng,
    order: index + 1,
    groupId: group.id,
    groupLabel: group.label,
    name: stop.name || stop.equipmentName || 'Parada'
  };
}

function collectMapPlanGroups() {
  const groups = [];
  const weekPlan = state.weekPlan && typeof state.weekPlan === 'object' ? state.weekPlan : {};
  Object.entries(weekPlan).forEach(([ownerId, plan]) => {
    if (!plan || typeof plan !== 'object') return;
    if (Array.isArray(plan._generalPlans)) {
      plan._generalPlans.filter(item => !item.deletedAt).forEach((general, idx) => {
        const rawStops = Array.isArray(general.stops) ? general.stops : [];
        const group = {
          id: `general:${general.id || idx}`,
          label: general.name || `Plan general ${idx + 1}`,
          stops: []
        };
        group.stops = rawStops.map((stop, i) => normalizeMapPlanStop(stop, i, group)).filter(Boolean);
        if (group.stops.length) groups.push(group);
      });
    }
    Object.entries(plan).forEach(([day, stops]) => {
      if (!Array.isArray(stops)) return;
      const tech = (state.technicians || []).find(item => item.id === ownerId);
      const group = {
        id: `${ownerId}:${day}`,
        label: `${tech?.nombre || ownerId} - ${day}`,
        stops: []
      };
      group.stops = stops.map((stop, i) => normalizeMapPlanStop(stop, i, group)).filter(Boolean);
      if (group.stops.length) groups.push(group);
    });
  });
  return groups;
}

function renderPlanOverlay(bounds = []) {
  if (!planLayer) return;
  const selected = getMapFilters().planId;
  const groups = collectMapPlanGroups().filter(group => selected === 'all' || group.id === selected);
  const colors = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];
  groups.forEach((group, groupIndex) => {
    const color = colors[groupIndex % colors.length];
    const points = group.stops.map(stop => [stop.lat, stop.lng]);
    group.stops.forEach(stop => {
      const marker = L.marker([stop.lat, stop.lng], { icon: planIcon() }).addTo(planLayer);
      marker.bindTooltip(`${stop.order}. ${escapeHtml(stop.name)}`, { direction:'top', offset:[0,-8] });
      marker.bindPopup(`<div style="min-width:190px"><strong>${escapeHtml(group.label)}</strong><br>${stop.order}. ${escapeHtml(stop.name)}<br>${Number(stop.lat).toFixed(5)}, ${Number(stop.lng).toFixed(5)}${renderMapStopDetailStats(stop)}</div>`);
      bounds.push([stop.lat, stop.lng]);
    });
    if (points.length > 1) {
      L.polyline(points, { color:'#ffffff', weight:7, opacity:.9, interactive:false }).addTo(planLayer);
      L.polyline(points, { color, weight:4, opacity:.92, dashArray:'10 6', interactive:false }).addTo(planLayer);
    }
  });
}

function renderMapStats() {
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const nodes = (state.nodes || []).filter(x => !x.deletedAt);
  const equipment = (state.equipment || []).filter(x => !x.deletedAt);
  set('map-stat-equipment', equipment.length);
  set('map-stat-nodes', nodes.length);
  set('map-stat-visible', filteredEquipment().length + filteredNodes().length);
  const statusRows = [...equipment.map(x => getEntityPriorityStatus('equipment',x.id)), ...nodes.map(x => getEntityPriorityStatus('node',x.id))];
  set('map-stat-critical', statusRows.filter(s => s.key === 'critico').length);
}

function openMapEntityDetails(type, id) {
  if (type === 'equipment') {
    localStorage.setItem('netops_open_antenna_details', id);
    location.href = 'antenas.html';
    return;
  }
  localStorage.setItem('netops_open_node_details', id);
  location.href = 'nodos.html';
}

function fitAllMap() {
  if (!mapaView) return;
  const points = [];
  Object.values(equipmentMarkers).forEach(marker => points.push(marker.getLatLng()));
  Object.values(nodeMarkers).forEach(marker => points.push(marker.getLatLng()));
  if (points.length) mapaView.fitBounds(points, { padding:[36,36] });
}

function centerDefaultMap() {
  if (!mapaView) return;
  mapaView.setView([17.35, -99.35], 8);
}

function toggleMapFullscreen() {
  const card = document.getElementById('map-card');
  if (!card) return;
  const expanded = document.body.classList.toggle('map-app-expanded');
  const button = card.querySelector('.map-expand-button');
  if (button) {
    button.title = expanded ? 'Salir de pantalla grande' : 'Agrandar mapa';
    button.setAttribute('aria-label', button.title);
    button.innerHTML = expanded
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3v6H3M15 3v6h6M21 15h-6v6M3 15h6v6"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/></svg>';
  }
  setTimeout(() => mapaView && mapaView.invalidateSize(), 250);
}

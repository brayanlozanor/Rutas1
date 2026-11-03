let mapaView;
let equipmentMarkers = {};
let nodeMarkers = {};
let planLayer;
let didInitialFit = false;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
}

function initMapaPage() {
  if (!checkAuth()) return;
  loadDB().then(() => {
    initCommon();
    fillMapFilters();
    initMapCanvas();
    renderMapStats();
    updateMapMarkers({ fit: true });
  });
}

function fillMapFilters() {
  const zone = document.getElementById('map-zone-filter');
  if (zone) zone.innerHTML = '<option value="all">Todas las zonas</option>' + REGS.map(r => `<option value="${r.id}">${r.n}</option>`).join('');
  renderMapSearchOptions();
}

function renderMapSearchOptions() {
  const list = document.getElementById('map-search-options');
  if (!list) return;
  const rows = [];
  (state.equipment || []).filter(e => !e.deletedAt).forEach(eq => rows.push(`<option value="${escapeHtml(eq.name || '')}">${escapeHtml(eq.ip || getZoneLabel(eq.region))}</option>`));
  (state.nodes || []).filter(n => !n.deletedAt).forEach(n => rows.push(`<option value="${escapeHtml(getNodeLabel(n))}">${escapeHtml(getZoneLabel(n.zone))}</option>`));
  list.innerHTML = rows.join('');
}

function initMapCanvas() {
  mapaView = L.map('map').setView([17.35, -99.35], 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
  }).addTo(mapaView);
  planLayer = L.layerGroup().addTo(mapaView);
}

function getMapFilters() {
  return {
    view: document.getElementById('map-view-filter')?.value || 'both',
    zone: document.getElementById('map-zone-filter')?.value || 'all',
    query: normalizeName(document.getElementById('map-search')?.value || ''),
    labels: !!document.getElementById('map-show-labels')?.checked,
    plan: !!document.getElementById('map-show-plan')?.checked
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
}

function updateMapMarkers(options = {}) {
  if (!mapaView) return;
  clearMarkerCollections();
  const { view, labels, plan } = getMapFilters();
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
          <div style="margin-top:8px"><span class="badge zone">Mikrotik</span> <span class="badge" style="background:${st.color}22;color:${st.color};border-color:${st.color}55">${st.label} · ${st.count}</span></div>
          <button class="btn bc bfu" style="margin-top:10px" onclick="openMapEntityDetails('equipment','${eq.id}')">Mostrar detalles</button>
        </div>`);
      if (labels) marker.bindTooltip(eq.name || 'Mikrotik', { permanent:true, direction:'top', offset:[0,-10], opacity:.9 });
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
          <strong style="display:block;font-size:15px">${escapeHtml(getNodeLabel(node) || 'Nodo')}</strong>
          <div class="entity-sub">${escapeHtml(getZoneLabel(node.zone))}</div>
          <div style="margin-top:8px"><span class="badge success">Nodo</span> <span class="badge" style="background:${st.color}22;color:${st.color};border-color:${st.color}55">${st.label} · ${st.count}</span></div>
          ${node.notes ? `<div style="margin-top:6px;font-size:12px;color:#475569">${escapeHtml(node.notes)}</div>` : ''}
          <button class="btn bc bfu" style="margin-top:10px" onclick="openMapEntityDetails('node','${node.id}')">Mostrar detalles</button>
        </div>`);
      if (labels) marker.bindTooltip(getNodeLabel(node), { permanent:true, direction:'top', offset:[0,-10], opacity:.9 });
      nodeMarkers[node.id] = marker;
      bounds.push([lat, lng]);
    });
  }

  if (plan) renderPlanOverlay(bounds);

  renderMapStats();
  if (options.fit && !didInitialFit && bounds.length) {
    mapaView.fitBounds(bounds, { padding:[36,36] });
    didInitialFit = true;
  }
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

function renderPlanOverlay(bounds = []) {
  if (!planLayer) return;
  const points = [];
  (state.workOrders || []).filter(isOpenOrder).slice(0, 300).forEach(order => {
    const ll = findOrderLatLng(order);
    if (!ll) return;
    const marker = L.marker(ll, { icon: planIcon() }).addTo(planLayer);
    marker.bindPopup(`<strong>${escapeHtml(order.clientName || order.title || 'Detalle')}</strong><br><span>${escapeHtml(pl(order.priority || 'media'))}</span><br>${escapeHtml(order.description || order.title || '')}`);
    points.push(ll); bounds.push(ll);
  });
  if (points.length > 1) L.polyline(points, { color:'#2563eb', weight:2, opacity:.45 }).addTo(planLayer);
}

function renderMapStats() {
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  set('map-stat-equipment', (state.equipment || []).filter(x => !x.deletedAt).length);
  set('map-stat-nodes', (state.nodes || []).filter(x => !x.deletedAt).length);
  set('map-stat-visible', filteredEquipment().length + filteredNodes().length);
  set('map-stat-critical', [...(state.equipment || []).filter(x=>!x.deletedAt).map(x=>getEntityPriorityStatus('equipment',x.id)), ...(state.nodes || []).filter(x=>!x.deletedAt).map(x=>getEntityPriorityStatus('node',x.id))].filter(s => s.key === 'critico').length);
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
  card.classList.toggle('map-fullscreen');
  setTimeout(() => mapaView && mapaView.invalidateSize(), 250);
}

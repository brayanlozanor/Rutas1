let mapaView;
let equipmentMarkers = {};
let nodeMarkers = {};
let locationMarkers = [];
let planLayer;
let linkLayer;
let didInitialFit = false;
let mapaPageStarted = false;
let mapaResizeObserver = null;

const MAP_COINCIDENT_TOLERANCE = 0.0001; // ~10-11m de tolerancia para consolidar ubicaciones coincidentes
const MAP_PRIORITY_RANK = { critico: 3, atencion: 2, pendiente: 1, despejado: 0 };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
}

function dedupeEntitiesById(list) {
  const byId = new Map();
  (Array.isArray(list) ? list : []).forEach((item, index) => {
    if (!item || item.deletedAt) return;
    const rawId = item.id !== undefined && item.id !== null ? String(item.id).trim() : '';
    const key = rawId || `__anon_${index}`;
    const existing = byId.get(key);
    if (!existing) {
      byId.set(key, item);
      return;
    }
    const existingHasCoords = !isNaN(safeFloat(existing.lat)) && !isNaN(safeFloat(existing.lng));
    const currentHasCoords = !isNaN(safeFloat(item.lat)) && !isNaN(safeFloat(item.lng));
    if (!existingHasCoords && currentHasCoords) {
      byId.set(key, item);
    }
  });
  return Array.from(byId.values());
}

function areCoordsCoincident(latA, lngA, latB, lngB, tolerance = MAP_COINCIDENT_TOLERANCE) {
  if ([latA, lngA, latB, lngB].some(v => typeof v !== 'number' || Number.isNaN(v))) return false;
  return Math.abs(latA - latB) <= tolerance + 1e-9 && Math.abs(lngA - lngB) <= tolerance + 1e-9;
}

function getConsolidatedGroupStatus(entries) {
  const fallback = { key: 'despejado', label: 'Despejado', color: '#22c55e', count: 0 };
  if (!Array.isArray(entries) || !entries.length) return fallback;
  let worst = entries[0].status || fallback;
  let totalCount = 0;
  entries.forEach(entry => {
    const st = entry.status || fallback;
    totalCount += Number(st.count) || 0;
    const rankCurrent = MAP_PRIORITY_RANK[st.key] ?? 0;
    const rankWorst = MAP_PRIORITY_RANK[worst.key] ?? 0;
    if (rankCurrent > rankWorst || (rankCurrent === rankWorst && (Number(st.count) || 0) > (Number(worst.count) || 0))) {
      worst = st;
    }
  });
  return {
    key: worst.key || 'despejado',
    label: worst.label || 'Despejado',
    color: worst.color || '#22c55e',
    count: totalCount
  };
}

function groupCoincidentMapEntries(entries, tolerance = MAP_COINCIDENT_TOLERANCE) {
  const seenKeys = new Set();
  const groups = [];
  (Array.isArray(entries) ? entries : []).forEach(entry => {
    if (!entry || !entry.item) return;
    const idStr = entry.id !== undefined && entry.id !== null ? String(entry.id).trim() : '';
    const uniqueKey = `${entry.type}:${idStr}`;
    if (idStr && seenKeys.has(uniqueKey)) return;
    if (idStr) seenKeys.add(uniqueKey);
    const lat = Number(entry.lat);
    const lng = Number(entry.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    const match = groups.find(group => areCoordsCoincident(lat, lng, group.lat, group.lng, tolerance));
    if (match) {
      match.entries.push(entry);
      match.sumLat += lat;
      match.sumLng += lng;
      match.lat = match.sumLat / match.entries.length;
      match.lng = match.sumLng / match.entries.length;
    } else {
      groups.push({
        lat,
        lng,
        sumLat: lat,
        sumLng: lng,
        entries: [entry]
      });
    }
  });

  return groups.map(group => {
    group.entries.sort((a, b) => {
      const rankDiff = (MAP_PRIORITY_RANK[b.status?.key] ?? 0) - (MAP_PRIORITY_RANK[a.status?.key] ?? 0);
      if (rankDiff !== 0) return rankDiff;
      if (a.type !== b.type) return a.type === 'equipment' ? -1 : 1;
      const nameA = a.type === 'equipment' ? (a.item.name || '') : (getNodeLabel(a.item) || '');
      const nameB = b.type === 'equipment' ? (b.item.name || '') : (getNodeLabel(b.item) || '');
      return String(nameA).localeCompare(String(nameB), 'es', { numeric: true });
    });
    const equipmentCount = group.entries.filter(e => e.type === 'equipment').length;
    const nodeCount = group.entries.filter(e => e.type === 'node').length;
    const kind = equipmentCount > 0 && nodeCount > 0 ? 'mixed' : (equipmentCount > 0 ? 'equipment' : 'node');
    return {
      lat: group.lat,
      lng: group.lng,
      entries: group.entries,
      equipmentCount,
      nodeCount,
      kind,
      status: getConsolidatedGroupStatus(group.entries)
    };
  });
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
  loadDB({ loadingTitle: 'Cargando mapa', loadingSubtitle: 'Consultando sitios y estados.', overlayDelay: 180 }).then(() => {
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
  const seenValues = new Set();
  dedupeEntitiesById(state.equipment).slice(0, 180).forEach(eq => {
    const val = String(eq.name || '').trim();
    const key = val.toLowerCase();
    if (!val || seenValues.has(key)) return;
    seenValues.add(key);
    rows.push(`<option value="${escapeHtml(val)}">${escapeHtml(eq.ip || getZoneLabel(eq.region))}</option>`);
  });
  dedupeEntitiesById(state.nodes).slice(0, 180).forEach(n => {
    const val = String(getNodeLabel(n) || '').trim();
    const key = val.toLowerCase();
    if (!val || seenValues.has(key)) return;
    seenValues.add(key);
    rows.push(`<option value="${escapeHtml(val)}">${escapeHtml(getZoneLabel(n.zone))}</option>`);
  });
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
  return dedupeEntitiesById(state.equipment).filter(eq => {
    if (zone !== 'all' && eq.region !== zone) return false;
    if (!query) return true;
    return [eq.name, eq.ip, eq.ssid, getZoneLabel(eq.region)].some(val => normalizeName(val).includes(query));
  });
}

function filteredNodes() {
  const { zone, query } = getMapFilters();
  return dedupeEntitiesById(state.nodes).filter(node => {
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

function consolidatedLocationIcon(group) {
  const count = group.entries.length;
  const color = group.status?.color || '#0874e8';
  const kind = group.kind || 'mixed';
  const radius = kind === 'node' ? '50%' : (kind === 'equipment' ? '6px' : '8px');
  const ring = kind === 'mixed'
    ? 'box-shadow:0 0 0 2px #0874e8,0 4px 12px rgba(15,23,42,.34);'
    : 'box-shadow:0 4px 12px rgba(15,23,42,.32);';
  const mixedDot = kind === 'mixed'
    ? '<span class="map-cluster-mixed-dot" style="position:absolute;top:-3px;right:-3px;width:9px;height:9px;border-radius:50%;background:#0874e8;border:1.5px solid #fff"></span>'
    : '';
  return L.divIcon({
    className: `custom-map-icon map-cluster-marker map-cluster-${kind}`,
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:${radius};background:${color};border:2px solid #fff;color:#fff;font:800 11px/1 Inter,Manrope,sans-serif;${ring}">${count}${mixedDot}</div>`,
    iconSize: [24,24],
    iconAnchor: [12,12]
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
  const removed = new Set();
  const removeOnce = marker => {
    if (!marker || removed.has(marker)) return;
    removed.add(marker);
    if (mapaView && typeof mapaView.removeLayer === 'function') mapaView.removeLayer(marker);
  };
  locationMarkers.forEach(removeOnce);
  Object.values(equipmentMarkers).forEach(removeOnce);
  Object.values(nodeMarkers).forEach(removeOnce);
  locationMarkers = [];
  equipmentMarkers = {};
  nodeMarkers = {};
  if (planLayer) planLayer.clearLayers();
  if (linkLayer) linkLayer.clearLayers();
}

function renderSingleEntityPopup(entry) {
  const st = entry.status || getEntityPriorityStatus(entry.type, entry.id);
  if (entry.type === 'equipment') {
    const eq = entry.item;
    const linkedCount = getEquipmentLinkedNodes(eq.id).length;
    return `
      <div style="min-width:230px">
        <strong style="display:block;font-size:15px">${escapeHtml(eq.name || 'Equipo')}</strong>
        <div class="entity-sub">${escapeHtml(getZoneLabel(eq.region))}</div>
        ${eq.ip ? `<div style="margin-top:8px;font-size:12px"><strong>IP:</strong> ${escapeHtml(eq.ip)}</div>` : ''}
        <div style="margin-top:8px"><span class="badge zone">Mikrotik</span> <span class="badge" style="background:${st.color}22;color:${st.color};border-color:${st.color}55">${st.label} - ${st.count}</span></div>
        ${renderMapEntityDetailStats('equipment', eq.id)}
        ${linkedCount ? `<div style="margin-top:7px;font-size:12px"><strong>Nodos vinculados:</strong> ${linkedCount}</div>` : ''}${isAttentionRole() ? '' : `<button class="btn bc bfu" style="margin-top:10px" onclick="openMapEntityDetails('equipment','${escapeHtml(eq.id)}')">Mostrar detalles</button>`}
      </div>`;
  }
  const node = entry.item;
  return `
    <div style="min-width:230px">
      <strong style="display:block;font-size:15px">${escapeHtml(getNodeLabel(node) || 'Pueblo')}</strong>
      <div class="entity-sub">${escapeHtml(getZoneLabel(node.zone))}</div>
      <div style="margin-top:8px"><span class="badge success">Pueblo</span> <span class="badge" style="background:${st.color}22;color:${st.color};border-color:${st.color}55">${st.label} - ${st.count}</span></div>
      ${renderMapEntityDetailStats('node', node.id)}
      ${node.notes ? `<div style="margin-top:6px;font-size:12px;color:#475569">${escapeHtml(node.notes)}</div>` : ''}
      <button class="btn bc bfu" style="margin-top:10px" onclick="openMapEntityDetails('node','${escapeHtml(node.id)}')">Mostrar detalles</button>
    </div>`;
}

function renderConsolidatedLocationPopup(group) {
  if (!group || !group.entries || !group.entries.length) return '';
  if (group.entries.length === 1) return renderSingleEntityPopup(group.entries[0]);

  const parts = [];
  if (group.equipmentCount > 0) parts.push(`${group.equipmentCount} ${group.equipmentCount === 1 ? 'antena' : 'antenas'}`);
  if (group.nodeCount > 0) parts.push(`${group.nodeCount} ${group.nodeCount === 1 ? 'pueblo' : 'pueblos'}`);
  const headerTitle = group.kind === 'mixed'
    ? 'Ubicación compartida'
    : (group.kind === 'equipment' ? `${group.equipmentCount} antenas en esta ubicación` : `${group.nodeCount} pueblos en esta ubicación`);
  const summarySubtitle = parts.join(' · ');
  const stGroup = group.status;

  const itemsHtml = group.entries.map(entry => {
    const st = entry.status || getEntityPriorityStatus(entry.type, entry.id);
    if (entry.type === 'equipment') {
      const eq = entry.item;
      const linkedCount = getEquipmentLinkedNodes(eq.id).length;
      return `
        <div class="map-consolidated-item">
          <div class="map-consolidated-item-head">
            <strong>${escapeHtml(eq.name || 'Equipo')}</strong>
            <span class="badge zone">Mikrotik</span>
          </div>
          <div class="entity-sub">${escapeHtml(getZoneLabel(eq.region))}${eq.ip ? ` · IP: ${escapeHtml(eq.ip)}` : ''}</div>
          <div style="margin-top:5px"><span class="badge" style="background:${st.color}22;color:${st.color};border-color:${st.color}55">${st.label} - ${st.count}</span></div>
          ${renderMapEntityDetailStats('equipment', eq.id)}
          ${linkedCount ? `<div style="margin-top:5px;font-size:11px;color:#475569"><strong>Nodos vinculados:</strong> ${linkedCount}</div>` : ''}
          ${isAttentionRole() ? '' : `<button class="btn bc bfu map-consolidated-btn" onclick="openMapEntityDetails('equipment','${escapeHtml(eq.id)}')">Mostrar detalles</button>`}
        </div>`;
    }
    const node = entry.item;
    return `
      <div class="map-consolidated-item">
        <div class="map-consolidated-item-head">
          <strong>${escapeHtml(getNodeLabel(node) || 'Pueblo')}</strong>
          <span class="badge success">Pueblo</span>
        </div>
        <div class="entity-sub">${escapeHtml(getZoneLabel(node.zone))}</div>
        <div style="margin-top:5px"><span class="badge" style="background:${st.color}22;color:${st.color};border-color:${st.color}55">${st.label} - ${st.count}</span></div>
        ${renderMapEntityDetailStats('node', node.id)}
        ${node.notes ? `<div style="margin-top:5px;font-size:11px;color:#475569">${escapeHtml(node.notes)}</div>` : ''}
        <button class="btn bc bfu map-consolidated-btn" onclick="openMapEntityDetails('node','${escapeHtml(node.id)}')">Mostrar detalles</button>
      </div>`;
  }).join('');

  return `
    <div class="map-consolidated-popup">
      <div class="map-consolidated-head">
        <div>
          <strong>${escapeHtml(headerTitle)}</strong>
          <div class="map-consolidated-sub">${escapeHtml(summarySubtitle)} · ${group.lat.toFixed(5)}, ${group.lng.toFixed(5)}</div>
        </div>
        <span class="badge" style="background:${stGroup.color}22;color:${stGroup.color};border-color:${stGroup.color}55">${stGroup.label}</span>
      </div>
      <div class="map-consolidated-list">${itemsHtml}</div>
    </div>`;
}

function buildConsolidatedTooltipText(group) {
  const attention = isAttentionRole();
  const visibleEntries = group.entries.filter(entry => !attention || entry.type === 'node');
  if (!visibleEntries.length) return '';
  if (group.entries.length === 1) {
    const only = visibleEntries[0];
    return only.type === 'equipment' ? (only.item.name || 'Mikrotik') : (getNodeLabel(only.item) || 'Pueblo');
  }
  const uniqueNames = [];
  const seenNorm = new Set();
  visibleEntries.forEach(entry => {
    const label = entry.type === 'equipment' ? (entry.item.name || 'Mikrotik') : (getNodeLabel(entry.item) || 'Pueblo');
    const norm = typeof normalizeName === 'function' ? normalizeName(label) : String(label).trim().toLowerCase();
    if (!label || seenNorm.has(norm)) return;
    seenNorm.add(norm);
    uniqueNames.push(label);
  });
  if (!uniqueNames.length) return `${visibleEntries.length} sitios`;
  if (uniqueNames.length === 1) return `${uniqueNames[0]} (${group.entries.length})`;
  if (uniqueNames.length === 2) return `${uniqueNames[0]} · ${uniqueNames[1]}`;
  return `${uniqueNames[0]} · ${uniqueNames[1]} +${uniqueNames.length - 2}`;
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
  const mappableEntries = [];

  if (view === 'both' || view === 'equipment') {
    filteredEquipment().forEach(eq => {
      const lat = safeFloat(eq.lat), lng = safeFloat(eq.lng);
      if (isNaN(lat) || isNaN(lng)) return;
      mappableEntries.push({
        type: 'equipment',
        id: eq.id,
        item: eq,
        lat,
        lng,
        status: getEntityPriorityStatus('equipment', eq.id)
      });
    });
  }

  if (view === 'both' || view === 'nodes') {
    filteredNodes().forEach(node => {
      const lat = safeFloat(node.lat), lng = safeFloat(node.lng);
      if (isNaN(lat) || isNaN(lng)) return;
      mappableEntries.push({
        type: 'node',
        id: node.id,
        item: node,
        lat,
        lng,
        status: getEntityPriorityStatus('node', node.id)
      });
    });
  }

  const locationGroups = groupCoincidentMapEntries(mappableEntries);

  locationGroups.forEach(group => {
    const icon = group.entries.length === 1
      ? (group.entries[0].type === 'equipment' ? equipmentIcon(group.status.color) : nodeIcon(group.status.color))
      : consolidatedLocationIcon(group);
    const marker = L.marker([group.lat, group.lng], { icon }).addTo(mapaView);
    marker.bindPopup(renderConsolidatedLocationPopup(group), { maxWidth: 340 });

    if (labels) {
      const tooltipText = buildConsolidatedTooltipText(group);
      if (tooltipText) {
        marker.bindTooltip(escapeHtml(tooltipText), { permanent: true, direction: 'top', offset: [0, -10], opacity: .92 });
      }
    }

    locationMarkers.push(marker);
    group.entries.forEach(entry => {
      if (entry.type === 'equipment') equipmentMarkers[entry.id] = marker;
      else nodeMarkers[entry.id] = marker;
    });
    bounds.push([group.lat, group.lng]);
  });

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
  const activeNodes = dedupeEntitiesById(state.nodes);
  const nodesById = new Map(activeNodes.map(node => [node.id, node]));
  const drawnPairs = new Set();

  dedupeEntitiesById(state.equipment).forEach(eq => {
    const eqLat = safeFloat(eq.lat), eqLng = safeFloat(eq.lng);
    if (isNaN(eqLat) || isNaN(eqLng)) return;
    const linkedIds = Array.from(new Set(getEquipmentLinkedNodeIds(eq.id)));
    linkedIds.forEach(nodeId => {
      const pairKey = `${eq.id}::${nodeId}`;
      if (drawnPairs.has(pairKey)) return;
      drawnPairs.add(pairKey);
      const node = nodesById.get(nodeId);
      if (!node) return;
      const nLat = safeFloat(node.lat), nLng = safeFloat(node.lng);
      if (isNaN(nLat) || isNaN(nLng)) return;
      if (areCoordsCoincident(eqLat, eqLng, nLat, nLng)) return;
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
  const nodes = dedupeEntitiesById(state.nodes);
  const equipment = dedupeEntitiesById(state.equipment);
  const { view } = getMapFilters();
  const visibleCount = (view === 'both' || view === 'equipment' ? filteredEquipment().length : 0)
    + (view === 'both' || view === 'nodes' ? filteredNodes().length : 0);
  set('map-stat-equipment', equipment.length);
  set('map-stat-nodes', nodes.length);
  set('map-stat-visible', visibleCount);
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
  const points = locationMarkers.length
    ? locationMarkers.map(marker => marker.getLatLng())
    : [
        ...Object.values(equipmentMarkers).map(marker => marker.getLatLng()),
        ...Object.values(nodeMarkers).map(marker => marker.getLatLng())
      ];
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

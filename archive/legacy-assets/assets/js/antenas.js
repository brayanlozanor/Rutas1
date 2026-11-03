let editingAntennaId = null;
let currentDetailAntennaId = null;

function antennaEscape(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch])); }

function initAntenasPage() {
  if (!checkAuth()) return;
  loadDB().then(() => {
    initCommon();
    fillAntennaZoneFilters();
    renderAntennaSearchOptions();
    renderAntenas();
    const openId = localStorage.getItem('netops_open_antenna_details');
    if (openId) { localStorage.removeItem('netops_open_antenna_details'); setTimeout(() => openAntennaDetails(openId), 300); }
  });
}

function fillAntennaZoneFilters() {
  const el = document.getElementById('ant-filter-zone');
  if (el) el.innerHTML = '<option value="all">Todas las zonas</option>' + REGS.map(r => `<option value="${r.id}">${r.n}</option>`).join('');
}

function renderAntennaSearchOptions() {
  const list = document.getElementById('ant-search-options');
  if (!list) return;
  list.innerHTML = (state.equipment || []).filter(e => !e.deletedAt).map(eq => `<option value="${antennaEscape(eq.name || '')}">${antennaEscape(eq.ip || getZoneLabel(eq.region))}</option>`).join('');
}

function antennaFilters() {
  return { query: normalizeName(document.getElementById('ant-search')?.value || ''), zone: document.getElementById('ant-filter-zone')?.value || 'all', priority: document.getElementById('ant-filter-priority')?.value || 'all' };
}

function getFilteredAntennas() {
  const { query, zone, priority } = antennaFilters();
  return (state.equipment || []).filter(eq => {
    if (eq.deletedAt) return false;
    if (zone !== 'all' && eq.region !== zone) return false;
    const st = getEntityPriorityStatus('equipment', eq.id);
    if (priority !== 'all' && st.key !== priority) return false;
    if (!query) return true;
    return [eq.name, eq.ip, eq.ssid, getZoneLabel(eq.region)].some(val => normalizeName(val).includes(query));
  });
}

function openAntennaModal() { resetAntennaForm(); OM('antena-mo'); }

function resetAntennaForm() {
  editingAntennaId = null;
  document.getElementById('ant-form-title').textContent = 'Registrar antena';
  ['ant-name','ant-ip','ant-ssid','ant-lat','ant-lng','ant-notes','ant-zone-preview'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('ant-type').value = 'mikrotik';
}

function previewAntennaZone() {
  const lat = safeFloat(document.getElementById('ant-lat').value);
  const lng = safeFloat(document.getElementById('ant-lng').value);
  const zone = getNearestRegion(lat, lng);
  document.getElementById('ant-zone-preview').value = zone ? getZoneLabel(zone) : '';
  return zone;
}

function saveAntenna() {
  const lat = safeFloat(document.getElementById('ant-lat').value);
  const lng = safeFloat(document.getElementById('ant-lng').value);
  const payload = { name: document.getElementById('ant-name').value.trim(), ip: document.getElementById('ant-ip').value.trim(), ssid: document.getElementById('ant-ssid').value.trim(), lat, lng, type: document.getElementById('ant-type').value, notes: document.getElementById('ant-notes').value.trim(), region: getNearestRegion(lat, lng), status:'online' };
  if (!payload.name || isNaN(payload.lat) || isNaN(payload.lng)) { notify('Captura nombre y coordenadas válidas.', 'err'); return; }
  if (editingAntennaId) {
    const antenna = (state.equipment || []).find(item => item.id === editingAntennaId); if (!antenna) return;
    const duplicate = equipmentDuplicateOf(payload.name, payload.lat, payload.lng, editingAntennaId);
    if (duplicate) { notify('Ya existe otra antena con ese nombre y coordenadas.', 'err'); return; }
    Object.assign(antenna, payload, { updatedAt:new Date().toISOString() }); notify('Antena actualizada.');
  } else {
    const duplicate = equipmentDuplicateOf(payload.name, payload.lat, payload.lng);
    if (duplicate) { notify('La antena ya existe con ese nombre y coordenadas.', 'err'); return; }
    state.equipment.push({ id: gid('eq'), createdAt:new Date().toISOString(), ...payload }); notify('Antena agregada correctamente.');
  }
  saveDB(); CM('antena-mo'); resetAntennaForm(); renderAntennaSearchOptions(); renderAntenas();
}

function editAntenna(id) {
  const antenna = (state.equipment || []).find(item => item.id === id && !item.deletedAt); if (!antenna) return;
  editingAntennaId = id; document.getElementById('ant-form-title').textContent = 'Editar antena';
  document.getElementById('ant-name').value = antenna.name || ''; document.getElementById('ant-ip').value = antenna.ip || ''; document.getElementById('ant-ssid').value = antenna.ssid || ''; document.getElementById('ant-lat').value = antenna.lat ?? ''; document.getElementById('ant-lng').value = antenna.lng ?? ''; document.getElementById('ant-type').value = antenna.type || 'mikrotik'; document.getElementById('ant-notes').value = antenna.notes || ''; previewAntennaZone(); OM('antena-mo');
}

function deleteAntenna(id) {
  const antenna = (state.equipment || []).find(item => item.id === id && !item.deletedAt); if (!antenna) return;
  if (!confirm(`¿Eliminar la antena ${antenna.name}?`)) return;
  antenna.deletedAt = new Date().toISOString(); saveDB(); renderAntenas(); notify('Antena eliminada.');
}

function renderAntennaStats() {
  const all = (state.equipment || []).filter(e => !e.deletedAt);
  const statuses = all.map(e => getEntityPriorityStatus('equipment', e.id));
  const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  set('ant-total', all.length); set('ant-critical', statuses.filter(s=>s.key==='critico').length); set('ant-warning', statuses.filter(s=>s.key==='atencion').length); set('ant-clear', statuses.filter(s=>s.key==='despejado').length);
}

function renderAntenas() {
  renderAntennaStats();
  const wrap = document.getElementById('antenas-grid'); if (!wrap) return;
  const antennas = getFilteredAntennas();
  if (!antennas.length) { wrap.innerHTML = '<div class="empty-state">No hay antenas para el filtro actual.</div>'; return; }
  wrap.innerHTML = `<div class="list-grid">${antennas.map(eq => {
    const st = getEntityPriorityStatus('equipment', eq.id); const details = getEntityOpenDetails('equipment', eq.id);
    return `<article class="entity-card ${st.key}"><div class="entity-title"><div><h3>${antennaEscape(eq.name || 'Antena')}</h3><div class="entity-sub">${antennaEscape(getZoneLabel(eq.region))}</div></div><span class="badge" style="background:${st.color}22;color:${st.color};border-color:${st.color}55">${st.label}</span></div><div class="meta-list"><div class="meta-row"><span>IP</span><strong>${antennaEscape(eq.ip || '—')}</strong></div><div class="meta-row"><span>SSID</span><strong>${antennaEscape(eq.ssid || '—')}</strong></div><div class="meta-row"><span>Coordenadas</span><strong>${antennaEscape(`${Number(eq.lat).toFixed(6)}, ${Number(eq.lng).toFixed(6)}`)}</strong></div><div class="meta-row"><span>Detalles pendientes</span><strong>${details.length}</strong></div></div>${eq.notes ? `<div class="help-box" style="background:#f8fbff;border-color:#dbeafe;color:#37516f">${antennaEscape(eq.notes)}</div>` : ''}<div class="card-actions"><button class="btn bc" onclick="openAntennaDetails('${eq.id}')">Ver detalles</button><button class="btn bo2" onclick="openAntennaDetails('${eq.id}', true)">Agregar detalle</button><button class="btn bgh" onclick="editAntenna('${eq.id}')">Editar antena</button></div></article>`;
  }).join('')}</div>`;
}

function openAntennaDetails(id, focusAdd = false) {
  const antenna = (state.equipment || []).find(item => item.id === id && !item.deletedAt); if (!antenna) return;
  currentDetailAntennaId = id;
  const st = getEntityPriorityStatus('equipment', id);
  document.getElementById('ant-detail-title').textContent = `Detalles · ${antenna.name}`;
  document.getElementById('ant-detail-sub').textContent = `${getZoneLabel(antenna.region)} · Estado por prioridad: ${st.label}`;
  document.getElementById('ant-detail-text').value = '';
  document.getElementById('ant-detail-priority').value = 'media';
  renderAntennaDetailList(); OM('ant-detail-mo');
  if (focusAdd) setTimeout(() => document.getElementById('ant-detail-text')?.focus(), 150);
}

function saveAntennaDetail() {
  const antenna = (state.equipment || []).find(item => item.id === currentDetailAntennaId && !item.deletedAt); if (!antenna) return;
  const text = document.getElementById('ant-detail-text').value.trim(); if (!text) { notify('Escribe el detalle.', 'err'); return; }
  state.workOrders.push({ id: gid('wo'), equipmentId: antenna.id, equipmentName: antenna.name, title: text, description: text, visitType: document.getElementById('ant-detail-type').value, priority: document.getElementById('ant-detail-priority').value, region: antenna.region, lat: antenna.lat, lng: antenna.lng, status:'pendiente', createdAt:new Date().toISOString() });
  document.getElementById('ant-detail-text').value = ''; saveDB(); renderAntennaDetailList(); renderAntenas(); notify('Detalle agregado.');
}

function markAntennaDetailDone(id) { const d=(state.workOrders||[]).find(x=>x.id===id); if(!d)return; d.status='completada'; d.completedAt=new Date().toISOString(); saveDB(); renderAntennaDetailList(); renderAntenas(); }
function deleteAntennaDetail(id) { const d=(state.workOrders||[]).find(x=>x.id===id); if(!d)return; if(!confirm('¿Eliminar este detalle?'))return; d.deletedAt=new Date().toISOString(); saveDB(); renderAntennaDetailList(); renderAntenas(); }

function renderAntennaDetailList() {
  const wrap = document.getElementById('ant-detail-list'); if (!wrap) return;
  const details = (state.workOrders || []).filter(d => !d.deletedAt && d.equipmentId === currentDetailAntennaId).sort(comparePriority);
  if (!details.length) { wrap.innerHTML = '<div class="empty-state">Sin detalles registrados.</div>'; return; }
  wrap.innerHTML = details.map(d => `<div class="detail-item ${d.status === 'completada' ? 'done' : ''}"><div class="detail-title">${antennaEscape(d.title || d.description || 'Detalle')}</div><div class="detail-meta"><span>${antennaEscape(pl(d.priority || 'media'))}</span><span>${antennaEscape(vl(d.visitType || 'torre'))}</span><span>${d.status === 'completada' ? 'Completada' : 'Pendiente'}</span></div><div class="card-actions"><button class="btn bg2" onclick="markAntennaDetailDone('${d.id}')">Listo</button><button class="btn br" onclick="deleteAntennaDetail('${d.id}')">Eliminar</button></div></div>`).join('');
}

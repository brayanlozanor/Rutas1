let editingAntennaId = null;
let currentDetailAntennaId = null;
let editingAntennaDetailId = null;
let movingAntennaDetailId = '';
let antennaDetailEditReturnId = '';
let antennaDetailListScrollTop = 0;
let antennaCurrentPage = 1;
let antennaRowsPerPage = 20;
let antennaLoadSequence = 0;
let antennaDetailKind = 'physical';

function antennaRemoteParams(){const f=antennaFilters();return {windowed:'1',includeRelated:'1',offset:(antennaCurrentPage-1)*antennaRowsPerPage,limit:antennaRowsPerPage,q:document.getElementById('ant-search')?.value.trim()||'',zone:f.zone,priority:f.priority};}
const previousAntennaDataPartParams=window.netopsGetDataPartParams;
window.netopsGetDataPartParams=part=>part==='equipment'?antennaRemoteParams():previousAntennaDataPartParams?.(part);
async function loadAntennaPage(){const sequence=++antennaLoadSequence;try{const params=antennaRemoteParams();const data=await fetchDataPage('equipment',params);if(sequence!==antennaLoadSequence)return false;const total=Number(data.total)||0;if(total>0&&Number(params.offset)>=total){antennaCurrentPage=Math.max(1,Math.ceil(total/antennaRowsPerPage));return loadAntennaPage();}state.equipment=Array.isArray(data.equipment)?data.equipment:[];state.nodes=Array.isArray(data.nodes)?data.nodes:[];state.workOrders=Array.isArray(data.workOrders)?data.workOrders:[];state.deletionRequests=Array.isArray(data.deletionRequests)?data.deletionRequests:[];if(typeof _previousStateSaved!=='undefined'&&_previousStateSaved){for(const key of ['equipment','nodes','workOrders','deletionRequests'])_previousStateSaved[key]=cloneData(state[key]);}window.netopsPageMeta=window.netopsPageMeta||{};window.netopsPageMeta.equipment={total,offset:Number(params.offset)||0,limit:antennaRowsPerPage,stats:data.stats||{}};renderAntennaSearchOptions();renderAntenas();return true;}catch(error){notify(describeSyncError(error),'err');return false;}}


function renderAdminTechReport(detail) {
  const report = detail?.technicianReport || {};
  const photos = [...new Set([...(Array.isArray(report.evidencePhotos) ? report.evidencePhotos : []), report.evidencePhoto].filter(Boolean))];
  const gallery = encodeURIComponent(JSON.stringify(photos));
  if (!report.solution && !report.reason && !report.materialUsed && !photos.length && !report.completedAt) return '';
  const status = report.result === 'no_realizado' ? 'No realizado' : 'Terminado';
  return `<div class="detail-tech-report">
    <strong>Reporte técnico · ${status}</strong>
    ${report.solution ? `<span>Solución: ${antennaEscape(report.solution)}</span>` : ''}
    ${report.reason ? `<span>Motivo: ${antennaEscape(report.reason)}</span>` : ''}
    ${report.materialUsed ? `<span>Material: ${antennaEscape(report.materialUsed)}</span>` : ''}
    ${report.completedByName ? `<span>Técnico: ${antennaEscape(report.completedByName)}</span>` : ''}
    ${report.completedAt ? `<span>Fecha: ${new Date(report.completedAt).toLocaleString('es-MX')}</span>` : ''}
    ${photos.map((photo, index) => `<button type="button" class="evidence-link" data-evidence-gallery="${gallery}" onclick="openEvidenceGalleryEncoded(this.dataset.evidenceGallery,${index})">Ver evidencia ${photos.length > 1 ? index + 1 : ''}</button>`).join('')}
  </div>`;
}

function antennaEscape(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch])); }

function initAntenasPage() {
  if (!checkAuth()) return;
  initCommon();
  setupAntennaDetailEscapeNavigation();
  loadDB({
    showOverlay: true,
    overlayDelay: 0,
    loadingTitle: 'Cargando informacion',
    loadingSubtitle: 'Preparando esta ventana...'
  }).then(() => {
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
  // Mantener pocas sugerencias evita que el navegador se ponga pesado al escribir.
  list.innerHTML = (state.equipment || [])
    .filter(e => !e.deletedAt)
    .slice(0, 80)
    .map(eq => `<option value="${antennaEscape(eq.name || '')}">${antennaEscape(eq.ip || getZoneLabel(eq.region))}</option>`)
    .join('');
}

function buildAntennaPriorityIndex() {
  const equipment = (state.equipment || []).filter(eq => eq && !eq.deletedAt);
  const detailsByEquipment = new Map();
  const linkedNodeToEquipment = new Map();
  equipment.forEach(eq => {
    detailsByEquipment.set(eq.id, []);
    (Array.isArray(eq.linkedNodeIds) ? eq.linkedNodeIds : []).forEach(nodeId => {
      if (!nodeId) return;
      if (!linkedNodeToEquipment.has(nodeId)) linkedNodeToEquipment.set(nodeId, []);
      linkedNodeToEquipment.get(nodeId).push(eq.id);
    });
  });

  (state.workOrders || []).forEach(order => {
    if (!isOpenOrder(order)) return;

    // Un detalle con nodeId pertenece al nodo, aunque conserve equipmentId
    // para recordar la antena de origen. La tarjeta de antena solo cuenta
    // detalles propios de la antena.
    if (!order.nodeId && order.equipmentId && detailsByEquipment.has(order.equipmentId)) {
      detailsByEquipment.get(order.equipmentId).push(order);
    }
  });

  const statusByEquipment = new Map();
  detailsByEquipment.forEach((details, eqId) => {
    statusByEquipment.set(eqId, getPriorityStatusFromDetails(details));
  });
  return { detailsByEquipment, statusByEquipment };
}

function antennaFilters() {
  return { query: normalizeName(document.getElementById('ant-search')?.value || ''), zone: document.getElementById('ant-filter-zone')?.value || 'all', priority: document.getElementById('ant-filter-priority')?.value || 'all' };
}

function resetAntennaPagination() {
  antennaCurrentPage = 1;
  void loadAntennaPage();
}

function changeAntennaPage(nextPage) {
  const page = Number(nextPage);
  if (!Number.isFinite(page) || page < 1) return;
  antennaCurrentPage = page;
  void loadAntennaPage();
  document.querySelector('.antennas-page .inventory-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function changeAntennaPageSize(value) {
  const size = Number(value);
  antennaRowsPerPage = [20, 50, 100].includes(size) ? size : 20;
  antennaCurrentPage = 1;
  void loadAntennaPage();
}

function getFilteredAntennas(index = buildAntennaPriorityIndex()) {
  const { query, zone, priority } = antennaFilters();
  return (state.equipment || []).filter(eq => {
    if (eq.deletedAt) return false;
    if (zone !== 'all' && eq.region !== zone) return false;
    const st = index.statusByEquipment.get(eq.id) || getPriorityStatusFromDetails([]);
    if (priority !== 'all' && st.key !== priority) return false;
    if (!query) return true;
    const haystack = `${eq.name || ''} ${eq.ip || ''} ${eq.ssid || ''} ${getZoneLabel(eq.region)}`.toLowerCase();
    return normalizeName(haystack).includes(query);
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

async function saveAntenna() {
  const auditCountBefore=Array.isArray(state.auditLog)?state.auditLog.length:0;
  let antennaToSave=null;
  const lat = safeFloat(document.getElementById('ant-lat').value);
  const lng = safeFloat(document.getElementById('ant-lng').value);
  const payload = { name: document.getElementById('ant-name').value.trim(), ip: document.getElementById('ant-ip').value.trim(), ssid: document.getElementById('ant-ssid').value.trim(), lat, lng, type: document.getElementById('ant-type').value, notes: document.getElementById('ant-notes').value.trim(), region: getNearestRegion(lat, lng), status:'online' };
  if (!payload.name || isNaN(payload.lat) || isNaN(payload.lng)) { notify('Captura nombre y coordenadas válidas.', 'err'); return; }
  if (editingAntennaId) {
    const antenna = (state.equipment || []).find(item => item.id === editingAntennaId); if (!antenna) return;
    const duplicate = equipmentDuplicateOf(payload.name, payload.lat, payload.lng, editingAntennaId);
    if (duplicate) { notify('Ya existe otra antena con ese nombre y coordenadas.', 'err'); return; }
    Object.assign(antenna, payload, { updatedAt:new Date().toISOString() }); setUpdatedAudit(antenna, 'modificó antena'); antennaToSave=antenna; notify('Antena actualizada.');
  } else {
    const duplicate = equipmentDuplicateOf(payload.name, payload.lat, payload.lng);
    if (duplicate) { notify('La antena ya existe con ese nombre y coordenadas.', 'err'); return; }
    const newAntenna = { id: gid('eq'), createdAt:new Date().toISOString(), ...payload }; setCreatedAudit(newAntenna, 'agregó antena'); state.equipment.push(newAntenna); antennaToSave=newAntenna; notify('Antena agregada correctamente.');
  }
  let ok=await saveRecord('equipment',antennaToSave);if(ok)for(const audit of (state.auditLog||[]).slice(auditCountBefore))ok=(await saveRecord('auditLog',audit))&&ok;
  CM('antena-mo'); resetAntennaForm(); if(ok)await loadAntennaPage();else{renderAntennaSearchOptions();renderAntenas();}
}

function editAntenna(id) {
  const antenna = (state.equipment || []).find(item => item.id === id && !item.deletedAt); if (!antenna) return;
  editingAntennaId = id; document.getElementById('ant-form-title').textContent = 'Editar antena';
  document.getElementById('ant-name').value = antenna.name || ''; document.getElementById('ant-ip').value = antenna.ip || ''; document.getElementById('ant-ssid').value = antenna.ssid || ''; document.getElementById('ant-lat').value = antenna.lat ?? ''; document.getElementById('ant-lng').value = antenna.lng ?? ''; document.getElementById('ant-type').value = antenna.type || 'mikrotik'; document.getElementById('ant-notes').value = antenna.notes || ''; previewAntennaZone(); OM('antena-mo');
}

async function deleteAntenna(id) {
  const antenna = (state.equipment || []).find(item => item.id === id && !item.deletedAt); if (!antenna) return;
  await handleProtectedDelete({
    targetType:'equipment',
    targetId:id,
    targetName:antenna.name || 'antena',
    applyDelete:() => { setDeletedAudit(antenna, 'elimino antena'); },
    refresh:() => { renderAntenas(); }
  });
}
function renderAntennaStats(index = buildAntennaPriorityIndex(), filteredAntennas = null) {
  const all = Array.isArray(filteredAntennas) ? filteredAntennas : (state.equipment || []).filter(e => !e.deletedAt);
  const statuses = all.map(e => index.statusByEquipment.get(e.id) || getPriorityStatusFromDetails([]));
  const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  const stats=window.netopsPageMeta?.equipment?.stats||{};
  set('ant-total', Number.isFinite(Number(stats.total))?Number(stats.total):all.length);
  set('ant-critical', Number.isFinite(Number(stats.critical))?Number(stats.critical):statuses.filter(s=>s.key==='critico').length);
  set('ant-warning', Number.isFinite(Number(stats.warning))?Number(stats.warning):statuses.filter(s=>s.key==='atencion').length);
  set('ant-clear', Number.isFinite(Number(stats.clear))?Number(stats.clear):statuses.filter(s=>s.key==='despejado').length);
}

function renderAntenas() {
  const index = buildAntennaPriorityIndex();
  const wrap = document.getElementById('antenas-grid'); if (!wrap) return;
  const antennas = getFilteredAntennas(index);
  renderAntennaStats(index, antennas);
  if (!antennas.length) { antennaCurrentPage = 1; wrap.innerHTML = '<div class="empty-state">No hay antenas para el filtro actual.</div>'; return; }
  const total=Number(window.netopsPageMeta?.equipment?.total)||antennas.length;
  const totalPages = Math.max(1, Math.ceil(total / antennaRowsPerPage));
  antennaCurrentPage = Math.min(Math.max(antennaCurrentPage, 1), totalPages);
  const rangeStart = (antennaCurrentPage - 1) * antennaRowsPerPage;
  const rangeEnd = Math.min(rangeStart + antennas.length, total);
  const visible = antennas;
  wrap.innerHTML = `<div class="list-grid">${visible.map(eq => {
    const st = index.statusByEquipment.get(eq.id) || getPriorityStatusFromDetails([]); const details = index.detailsByEquipment.get(eq.id) || [];
    const deleteReq = findDeletionRequest('equipment', eq.id);
    return `<article class="entity-card antenna-compact-card ${st.key}"><div class="entity-title"><div><h3>${antennaEscape(eq.name || 'Antena')}</h3><div class="entity-sub">${antennaEscape(getZoneLabel(eq.region))}</div></div><span class="badge" style="background:${st.color}22;color:${st.color};border-color:${st.color}55">${st.label}</span></div><div class="meta-list antenna-compact-meta"><div class="meta-row"><span>Coordenadas</span><strong>${antennaEscape(`${Number(eq.lat).toFixed(6)}, ${Number(eq.lng).toFixed(6)}`)}</strong></div><div class="meta-row"><span>Detalles pendientes</span><strong>${details.length}</strong></div></div><div class="antenna-icon-actions"><button class="ant-icon-btn primary" title="Ver detalles" aria-label="Ver detalles" onclick="openAntennaDetails('${eq.id}')"><svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="ant-icon-btn add" title="Agregar detalle" aria-label="Agregar detalle" onclick="openAntennaDetails('${eq.id}', true)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg></button><button class="ant-icon-btn link" title="Nodos vinculados" aria-label="Nodos vinculados" onclick="openAntennaNodeLinks('${eq.id}')"><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg></button><button class="ant-icon-btn edit" title="Editar antena" aria-label="Editar antena" onclick="editAntenna('${eq.id}')"><svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button><button class="ant-icon-btn delete" title="${userHasRole('administrador','admin') ? 'Eliminar' : (deleteReq ? 'Solicitud enviada' : 'Solicitar baja')}" aria-label="Eliminar antena" onclick="deleteAntenna('${eq.id}')"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6"/></svg></button></div></article>`;
  }).join('')}</div>${renderAntennaPagination(total, rangeStart, rangeEnd, totalPages)}`;
  wrap.querySelectorAll('.ant-icon-btn.link').forEach(button => {
    button.title = 'Pueblos vinculados';
    button.setAttribute('aria-label', 'Pueblos vinculados');
  });
}

function renderAntennaPagination(total, rangeStart, rangeEnd, totalPages) {
  return `<div class="inventory-pagination">
    <div class="inventory-page-nav">
      <button type="button" class="inventory-page-button" aria-label="Página anterior" onclick="changeAntennaPage(${antennaCurrentPage - 1})" ${antennaCurrentPage === 1 ? 'disabled' : ''}>‹</button>
      <button type="button" class="inventory-page-button" aria-label="Página siguiente" onclick="changeAntennaPage(${antennaCurrentPage + 1})" ${antennaCurrentPage === totalPages ? 'disabled' : ''}>›</button>
      <span><strong>${rangeStart + 1}-${rangeEnd}</strong> de <strong>${total}</strong> antenas</span>
      <span class="inventory-page-indicator">Página ${antennaCurrentPage} de ${totalPages}</span>
    </div>
    <label class="inventory-page-size"><span>Elementos por página:</span><select onchange="changeAntennaPageSize(this.value)"><option value="20" ${antennaRowsPerPage === 20 ? 'selected' : ''}>20</option><option value="50" ${antennaRowsPerPage === 50 ? 'selected' : ''}>50</option><option value="100" ${antennaRowsPerPage === 100 ? 'selected' : ''}>100</option></select></label>
  </div>`;
}


function resetAntennaDetailForm() {
  editingAntennaDetailId = null;
  const title = document.getElementById('ant-detail-form-title');
  if (title) title.textContent = 'Agregar detalle';
  const client = document.getElementById('ant-detail-client');
  if (client) client.value = '';
  const phone = document.getElementById('ant-detail-phone');
  if (phone) phone.value = '';
  document.getElementById('ant-detail-text').value = '';
  const loc = document.getElementById('ant-detail-location');
  if (loc) loc.value = '';
  const zone = document.getElementById('ant-detail-zone');
  if (zone) zone.value = '';
  const target = document.getElementById('ant-detail-target');
  if (target) target.value = 'equipment';
  const category = document.getElementById('ant-detail-category');
  if (category) category.value = '';
  updateAntennaDetailRequirements();
  document.getElementById('ant-detail-type').value = 'torre';
  document.getElementById('ant-detail-priority').value = 'baja';
  const btn = document.getElementById('ant-detail-save-btn');
  if (btn) btn.textContent = 'Guardar detalle';
}

function renderAntennaDetailCategoryOptions(selected = '') {
  const select = document.getElementById('ant-detail-category');
  if (!select) return;
  const options = detailCategoriesForKind(antennaDetailKind);
  select.innerHTML = `<option value="">-- Selecciona una categoría --</option>${options.map(([id,label]) => `<option value="${antennaEscape(id)}">${antennaEscape(label)}</option>`).join('')}`;
  select.value = options.some(([id]) => id === selected) ? selected : '';
  updateAntennaDetailRequirements();
}

function selectAntennaDetailKind(kind) {
  antennaDetailKind = kind === 'network' ? 'network' : 'physical';
  ['physical','network'].forEach(value => document.getElementById(`ant-detail-kind-${value}`)?.classList.toggle('is-active',value === antennaDetailKind));
  renderAntennaDetailCategoryOptions(document.getElementById('ant-detail-category')?.value || '');
  renderAntennaDetailList();
}

function refreshAntennaNetworkDetailViews() {
  renderAntennaDetailList();
  renderAntenas();
}

function ensureAntennaDetailViewControls() {
  let trigger = document.getElementById('ant-detail-add-trigger');
  const listSection = document.getElementById('ant-detail-list')?.closest('section');
  const heading = listSection?.querySelector(':scope > h3');
  if (!trigger && listSection && heading) {
    const bar = document.createElement('div');
    bar.className = 'detail-list-heading';
    trigger = document.createElement('button');
    trigger.id = 'ant-detail-add-trigger';
    trigger.type = 'button';
    trigger.className = 'btn detail-add-trigger';
    trigger.onclick = toggleAntennaDetailForm;
    heading.before(bar);
    bar.append(heading, trigger);
  }
  if (!document.getElementById('ant-detail-form-cancel')) {
    const formTitle = document.getElementById('ant-detail-form-title');
    const cancel = document.createElement('button');
    cancel.id = 'ant-detail-form-cancel';
    cancel.type = 'button';
    cancel.className = 'btn detail-form-cancel';
    cancel.textContent = 'Volver a detalles';
    cancel.onclick = cancelAntennaDetailEditing;
    formTitle?.insertAdjacentElement('afterend', cancel);
  }
  return trigger;
}

function setAntennaDetailFormVisible(visible, focusForm = false) {
  const modal = document.getElementById('ant-detail-mo');
  const trigger = ensureAntennaDetailViewControls();
  if (!modal) return;
  modal.classList.toggle('detail-view-only', !visible);
  modal.classList.toggle('detail-form-visible', visible);
  if (trigger) {
    trigger.textContent = 'Agregar detalle';
    trigger.setAttribute('aria-expanded', visible ? 'true' : 'false');
  }
  if (visible && focusForm) {
    setTimeout(() => document.getElementById('ant-detail-category')?.focus(), 100);
  }
}

function toggleAntennaDetailForm() {
  const modal = document.getElementById('ant-detail-mo');
  const opening = !!modal?.classList.contains('detail-view-only');
  if (opening) {
    antennaDetailEditReturnId = '';
    antennaDetailListScrollTop = document.querySelector('#ant-detail-mo>.md>.modal-grid')?.scrollTop || 0;
  }
  resetAntennaDetailForm();
  if (opening) {
    const antenna = (state.equipment || []).find(item => item.id === currentDetailAntennaId && !item.deletedAt);
    renderAntennaDetailTargetOptions('equipment');
    const zone = document.getElementById('ant-detail-zone');
    if (zone) zone.value = antenna?.region || '';
  }
  setAntennaDetailFormVisible(opening, opening);
}

function cancelAntennaDetailEditing() {
  resetAntennaDetailForm();
  setAntennaDetailFormVisible(false);
  const scroller = document.querySelector('#ant-detail-mo>.md>.modal-grid');
  requestAnimationFrame(() => { if (scroller) scroller.scrollTop = antennaDetailListScrollTop; });
  const returnId = antennaDetailEditReturnId;
  antennaDetailEditReturnId = '';
  if (returnId) setTimeout(() => openAntennaDetailView(returnId), 30);
}

function setupAntennaDetailEscapeNavigation() {
  const modal = document.getElementById('ant-detail-mo');
  if (!modal || modal.dataset.escapeNavigation === '1') return;
  modal.dataset.escapeNavigation = '1';
  modal.addEventListener('netops:before-modal-close', event => {
    if (!modal.classList.contains('detail-form-visible')) return;
    event.preventDefault();
    cancelAntennaDetailEditing();
  });
}

function openAntennaDetails(id, focusAdd = false) {
  if (!document.getElementById('ant-detail-phone')) document.getElementById('ant-detail-client')?.closest('.fi')?.insertAdjacentHTML('afterend', '<div class="fi"><label>Numero telefonico <span class="optional-label">Opcional</span></label><input id="ant-detail-phone" type="tel" placeholder="Numero de telefono (opcional)"></div>');
  const antenna = (state.equipment || []).find(item => item.id === id && !item.deletedAt); if (!antenna) return;
  const detailField = document.getElementById('ant-detail-text')?.closest('.fi');
  if (detailField && !document.getElementById('ant-detail-category')) {
    detailField.insertAdjacentHTML('beforebegin', '<div class="fi wo-category-field"><label>Categoría</label><select id="ant-detail-category" required onchange="updateAntennaDetailRequirements()"></select></div>');
  }
  renderAntennaDetailCategoryOptions();
  currentDetailAntennaId = id;
  const st = getEntityPriorityStatus('equipment', id);
  const zone = document.getElementById('ant-detail-zone');
  if (zone) zone.innerHTML = REGS.map(r => `<option value="${r.id}">${r.n}</option>`).join('');
  const links = document.getElementById('ant-detail-links');
  if (links) links.innerHTML = `<div>${antennaEscape(getEquipmentRelationLabel(id))}</div>`;
  document.getElementById('ant-detail-title').textContent = `Detalles · ${antenna.name}`;
  document.getElementById('ant-detail-sub').textContent = `${getZoneLabel(antenna.region)} · Estado por prioridad: ${st.label}`;
  resetAntennaDetailForm();
  renderAntennaDetailTargetOptions('equipment');
  if (zone) zone.value = antenna.region || '';
  renderAntennaDetailList(); OM('ant-detail-mo');
  setAntennaDetailFormVisible(focusAdd, focusAdd);
}


function refreshAntennaDetailRelationsUI(selectedTarget = '') {
  const links = document.getElementById('ant-detail-links');
  if (links && currentDetailAntennaId) {
    links.innerHTML = `<div>${antennaEscape(getEquipmentRelationLabel(currentDetailAntennaId))}</div>`;
  }
  renderAntennaDetailTargetOptions(selectedTarget || (document.getElementById('ant-detail-target')?.value || 'equipment'));
}

function renderAntennaDetailTargetOptions(selectedValue = 'equipment') {
  const select = document.getElementById('ant-detail-target');
  const antenna = (state.equipment || []).find(item => item.id === currentDetailAntennaId && !item.deletedAt);
  if (!select || !antenna) return;
  const linkedIds = new Set(getEquipmentLinkedNodeIds(antenna.id));
  const nodes = (state.nodes || []).filter(node => !node.deletedAt && linkedIds.has(node.id));
  select.innerHTML = [`<option value="equipment">Antena · ${antennaEscape(antenna.name || 'actual')}</option>`]
    .concat(nodes.map(node => `<option value="node:${antennaEscape(node.id)}">Pueblo · ${antennaEscape(getNodeLabel(node))}</option>`)).join('');
  const valid = Array.from(select.options).some(option => option.value === selectedValue);
  select.value = valid ? selectedValue : 'equipment';
  if (select.value.startsWith('node:')) document.getElementById('ant-detail-type').value = 'comunidad';
  select.onchange = () => {
    if (select.value.startsWith('node:')) document.getElementById('ant-detail-type').value = 'comunidad';
  };
}

function updateAntennaDetailRequirements() {
  const category = document.getElementById('ant-detail-category')?.value || '';
  const textarea = document.getElementById('ant-detail-text');
  const field = textarea?.closest('.fi');
  const optional = antennaDetailKind === 'physical' && category === 'antena_desconectada';
  if (!textarea || !field) return;
  textarea.required = !optional;
  field.hidden = optional;
  if (optional) textarea.value = '';
}

async function saveAntennaDetail() {
  if (!document.getElementById('ant-detail-phone')) document.getElementById('ant-detail-client')?.closest('.fi')?.insertAdjacentHTML('afterend', '<div class="fi"><label>Numero telefonico <span class="optional-label">Opcional</span></label><input id="ant-detail-phone" type="tel" placeholder="Numero de telefono (opcional)"></div>');
  const antenna = (state.equipment || []).find(item => item.id === currentDetailAntennaId && !item.deletedAt); if (!antenna) return;
  const text = document.getElementById('ant-detail-text').value.trim();
  const category = document.getElementById('ant-detail-category')?.value || '';
  if (!category) { notify('Selecciona la categoria.', 'err'); return; }
  if (category !== 'antena_desconectada' && !text) { notify('Escribe el detalle.', 'err'); return; }
  const detailLocation = parseOptionalLocation(document.getElementById('ant-detail-location')?.value);
  const targetValue = document.getElementById('ant-detail-target')?.value || 'equipment';
  const targetNodeId = targetValue.startsWith('node:') ? targetValue.slice(5) : '';
  const targetNode = targetNodeId ? (state.nodes || []).find(node => node.id === targetNodeId && !node.deletedAt) : null;
  if (targetNodeId && !targetNode) { notify('Selecciona un pueblo vinculado válido.', 'err'); return; }
  const payload = {
    clientName: document.getElementById('ant-detail-client')?.value.trim() || '', clientPhone: document.getElementById('ant-detail-phone')?.value.trim() || '', category, detailKind:antennaDetailKind,
    title: text || detailCategoryLabel(category), description: text, detailLocation: detailLocation.location,
    lat: detailLocation.lat || '', lng: detailLocation.lng || '',
    visitType: targetNode ? 'comunidad' : document.getElementById('ant-detail-type').value,
    priority: document.getElementById('ant-detail-priority').value,
    region: document.getElementById('ant-detail-zone')?.value || antenna.region,
    equipmentId: antenna.id, equipmentName: antenna.name || '',
    nodeId: targetNode?.id || '', nodeCode: targetNode?.nodeCode || '',
    nodeName: targetNode ? getNodeLabel(targetNode) : '', town: targetNode?.town || '',
    updatedAt:new Date().toISOString()
  };
  if (editingAntennaDetailId) {
    const d = (state.workOrders || []).find(x => x.id === editingAntennaDetailId && !x.deletedAt);
    if (!d) return;
    Object.assign(d, payload);
    setUpdatedAudit(d, 'modificó detalle de antena');
    notify('Detalle actualizado.');
  } else {
    const newDetail = { id: gid('wo'), ...payload, status:'pendiente', createdAt:new Date().toISOString() };
    newDetail.folio = getWorkOrderFolio(newDetail);
    setCreatedAudit(newDetail, 'agregó detalle de antena');
    state.workOrders.push(newDetail);
    notify('Detalle agregado.');
  }
  const savedDetail = editingAntennaDetailId
    ? await saveRecord('workOrders', (state.workOrders || []).find(x => x.id === editingAntennaDetailId))
    : await saveRecord('workOrders', state.workOrders[state.workOrders.length - 1]);
  if (!savedDetail) return;
  resetAntennaDetailForm();
  antennaDetailEditReturnId = '';
  setAntennaDetailFormVisible(false);
  renderAntennaDetailList(); renderAntenas();
}

function editAntennaDetail(id, fromReadView = false) {
  const d = (state.workOrders || []).find(x => x.id === id && !x.deletedAt); if (!d) return;
  antennaDetailListScrollTop = document.querySelector('#ant-detail-mo>.md>.modal-grid')?.scrollTop || antennaDetailListScrollTop;
  if (!fromReadView) antennaDetailEditReturnId = '';
  setAntennaDetailFormVisible(true);
  editingAntennaDetailId = id;
  selectAntennaDetailKind(d.detailKind === 'network' ? 'network' : 'physical');
  const title = document.getElementById('ant-detail-form-title');
  if (title) title.textContent = 'Editar detalle';
  renderAntennaDetailTargetOptions(d.nodeId ? `node:${d.nodeId}` : 'equipment');
  const client = document.getElementById('ant-detail-client');
  if (client) client.value = d.clientName || '';
  const phone = document.getElementById('ant-detail-phone');
  if (phone) phone.value = d.clientPhone || d.phone || '';
  renderAntennaDetailCategoryOptions(d.category || 'otro');
  const category = document.getElementById('ant-detail-category');
  if (category) category.value = d.category || 'otro';
  updateAntennaDetailRequirements();
  document.getElementById('ant-detail-text').value = d.title || d.description || '';
  const loc = document.getElementById('ant-detail-location');
  if (loc) loc.value = d.detailLocation || '';
  const zone = document.getElementById('ant-detail-zone');
  if (zone) zone.value = d.region || '';
  document.getElementById('ant-detail-type').value = d.visitType || 'torre';
  if (d.nodeId) document.getElementById('ant-detail-type').value = 'comunidad';
  document.getElementById('ant-detail-priority').value = d.priority || 'media';
  const btn = document.getElementById('ant-detail-save-btn');
  if (btn) btn.textContent = 'Actualizar detalle';
  document.getElementById('ant-detail-text')?.focus();
}

async function markAntennaDetailDone(id) {
  const d=(state.workOrders||[]).find(x=>x.id===id); if(!d)return;
  if (d.status !== 'completada' && userHasRole('administrador','admin','atencion_clientes')) {
    openAdminDetailCompletion(d, async completion => {
      const auditStart=Array.isArray(state.auditLog)?state.auditLog.length:0;
      if (completion.withInformation) {
        d.clientName = completion.clientName;
        d.clientPhone = completion.clientPhone;
        d.detailLocation = completion.detailLocation;
        d.technicianReport = completion.technicianReport;
      }
      d.status='completada';
      d.completedAt=new Date().toISOString();
      setUpdatedAudit(d, completion.withInformation ? 'completó detalle de antena con información' : 'marcó listo detalle de antena');
      const saved = await saveRecordWithAudit('workOrders',d,auditStart);
      if (!saved) return false;
      renderAntennaDetailList(); renderAntenas();
      return true;
    });
    return;
  }
  const auditStart=Array.isArray(state.auditLog)?state.auditLog.length:0;
  if (d.status === 'completada') { d.status='pendiente'; d.completedAt=''; setUpdatedAudit(d, 'reabrió detalle de antena'); }
  else { d.status='completada'; d.completedAt=new Date().toISOString(); setUpdatedAudit(d, 'marcó listo detalle de antena'); }
  await saveRecordWithAudit('workOrders',d,auditStart); renderAntennaDetailList(); renderAntenas();
}

async function deleteAntennaDetail(id) {
  const d=(state.workOrders||[]).find(x=>x.id===id && !x.deletedAt); if(!d)return;
  const label = d.title || d.description || 'detalle';
  await handleProtectedDelete({
    targetType:'detail',
    targetId:id,
    targetName:label,
    applyDelete:() => { setDeletedAudit(d, 'eliminó detalle de antena'); },
    refresh:() => { renderAntennaDetailList(); renderAntenas(); }
  });
}

function ensureAntennaDetailReadModal() {
  if (document.getElementById('ant-detail-read-mo')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="mo detail-readonly-mo" id="ant-detail-read-mo">
      <div class="md detail-readonly-card">
        <div class="modal-head"><div><h2 id="ant-detail-read-title">Detalle de orden</h2><p>Información completa del detalle registrado.</p></div><button class="btn bgh" onclick="CM('ant-detail-read-mo')">Cerrar</button></div>
        <div class="detail-readonly-body" id="ant-detail-read-body"></div>
      </div>
    </div>`);
}

async function openAntennaDetailView(id) {
  let d = (state.workOrders || []).find(item => item.id === id && !item.deletedAt);
  if (!d) return;
  await markSharedDetailInReviewOnOpen(d,'refreshAntennaNetworkDetailViews');
  d = (state.workOrders || []).find(item => item.id === id && !item.deletedAt) || d;
  ensureAntennaDetailReadModal();
  const node = d.nodeId ? (state.nodes || []).find(item => item.id === d.nodeId && !item.deletedAt) : null;
  const location = getLocationDisplay(d.detailLocation || '');
  const body = document.getElementById('ant-detail-read-body');
  document.getElementById('ant-detail-read-title').textContent = `Orden ${getWorkOrderFolio(d)}`;
  body.innerHTML = `
    <div class="detail-readonly-folio"><span>Número de orden</span><strong>${antennaEscape(getWorkOrderFolio(d))}</strong><em class="${d.status === 'completada' ? 'is-done' : ''}">${antennaEscape(sharedNetworkDetailStatus(d).label)}</em></div>
    <div class="detail-readonly-grid">
      <div><span>Cliente</span><strong>${antennaEscape(d.clientName || 'Sin nombre')}</strong></div>
      <div><span>Teléfono</span><strong>${antennaEscape(d.clientPhone || d.phone || 'Sin teléfono')}</strong></div>
      <div><span>Categoría</span><strong>${antennaEscape(detailCategoryLabel(d.category))}</strong></div>
      <div><span>Tipo de detalle</span><strong>${d.detailKind === 'network' ? 'Detalle de red' : 'Detalle físico'}</strong></div>
      <div><span>Prioridad</span><strong>${antennaEscape(pl(d.priority || 'media'))}</strong></div>
      <div><span>Tipo de trabajo</span><strong>${antennaEscape(vl(d.visitType || 'torre'))}</strong></div>
      <div><span>Zona</span><strong>${antennaEscape(getZoneLabel(d.region) || 'Sin zona')}</strong></div>
      <div><span>Asignado a</span><strong>${antennaEscape(node ? `Pueblo · ${getNodeLabel(node)}` : `Antena · ${d.equipmentName || 'actual'}`)}</strong></div>
      <div><span>Fecha de registro</span><strong>${antennaEscape(d.createdAt ? new Date(d.createdAt).toLocaleString('es-MX') : 'Sin fecha')}</strong></div>
      ${d.reviewOpenedAt ? `<div><span>Abierta para revisión</span><strong>${antennaEscape(sharedDetailReviewOpenedSummary(d))}</strong></div>` : ''}
      <div class="detail-readonly-wide"><span>Detalle</span><strong>${antennaEscape(getWorkOrderRequestedText(d, 'Sin descripción'))}</strong></div>
      <div class="detail-readonly-wide"><span>Ubicación</span><strong>${antennaEscape(location.label || 'Sin ubicación')}</strong>${location.url ? `<a href="${antennaEscape(location.url)}" target="_blank" rel="noopener">Abrir Maps</a>` : ''}</div>
    </div>
    ${d.status === 'completada' ? renderAdminTechReport(d) : ''}
    ${renderAuditMeta(d, antennaEscape)}
    <div class="detail-readonly-actions"><button class="btn bgh" onclick="CM('ant-detail-read-mo')">Cerrar</button><button class="btn bc" onclick="editAntennaDetailFromView('${antennaEscape(d.id)}')">Editar detalle</button></div>`;
  OM('ant-detail-read-mo');
}

function editAntennaDetailFromView(id) {
  antennaDetailEditReturnId = id;
  antennaDetailListScrollTop = document.querySelector('#ant-detail-mo>.md>.modal-grid')?.scrollTop || antennaDetailListScrollTop;
  CM('ant-detail-read-mo');
  editAntennaDetail(id, true);
}

function toggleAntennaCompletedDetails() {
  const list = document.getElementById('ant-completed-details');
  const button = document.getElementById('ant-completed-toggle');
  if (!list || !button) return;
  const show = list.hidden;
  list.hidden = !show;
  button.textContent = show ? 'Ocultar completados' : `Ver completados (${button.dataset.count || '0'})`;
  button.setAttribute('aria-expanded', show ? 'true' : 'false');
}

function renderAntennaDetailList() {
  const wrap = document.getElementById('ant-detail-list'); if (!wrap) return;
  const linkedNodeIds = new Set(getEquipmentLinkedNodeIds(currentDetailAntennaId));
  const details = (state.workOrders || []).filter(d => !d.deletedAt && (d.equipmentId === currentDetailAntennaId || (d.nodeId && linkedNodeIds.has(d.nodeId))) && (d.detailKind === 'network' ? 'network' : 'physical') === antennaDetailKind).sort(comparePriority);
  if (!details.length) { wrap.innerHTML = '<div class="empty-state">Sin detalles registrados.</div>'; return; }
  const renderDetail = d => {
    const done = d.status === 'completada';
    const detailStatus = sharedNetworkDetailStatus(d);
    const req = findDeletionRequest('detail', d.id);
    const loc = getLocationDisplay(d.detailLocation || '');
    const detailNode = d.nodeId ? (state.nodes || []).find(n => n.id === d.nodeId && !n.deletedAt) : null;
    const nodeLabel = detailNode ? getNodeLabel(detailNode) : (d.nodeName || d.nodeCode || '');
    const locationHtml = loc.url
      ? `<a class="order-location-link" href="${antennaEscape(loc.url)}" target="_blank" rel="noopener">Abrir Maps</a><div class="order-location-muted">${antennaEscape(loc.label)}</div>`
      : `<div class="order-location-muted ${loc.hasLocation ? '' : 'no-location'}">${antennaEscape(loc.label || 'Sin ubicacion')}</div>`;
    return `<div class="detail-item ${done ? 'done' : ''}">
      <div class="detail-card-folio"><span>Número de orden</span><strong>${antennaEscape(getWorkOrderFolio(d))}</strong></div>
      ${d.clientName ? `<div class="detail-title detail-client-name">${antennaEscape(d.clientName)}</div>` : ''}
      <div class="detail-title detail-category-name">Categoria: ${antennaEscape(detailCategoryLabel(d.category))}</div>
      <div class="detail-title detail-description">${antennaEscape(getWorkOrderRequestedText(d, detailCategoryLabel(d.category)))}</div>
      ${nodeLabel ? `<div class="entity-sub"><span class="badge success">Detalle de pueblo</span> ${antennaEscape(nodeLabel)}</div>` : ''}
      <div class="detail-meta"><span>${d.detailKind === 'network' ? 'Red' : 'Físico'}</span><span>${antennaEscape(pl(d.priority || 'media'))}</span><span>${antennaEscape(vl(d.visitType || 'torre'))}</span><span>${antennaEscape(detailStatus.label)}</span>${req ? `<span class="badge warning">${req.status === 'code_ready' ? 'Código listo' : 'Solicitud enviada'}</span>` : ''}</div>
      <div class="detail-location">${locationHtml}</div>
      ${renderAuditMeta(d, antennaEscape)}
      <div class="card-actions">
        <button class="btn detail-card-action detail-view-action" title="Ver detalle" aria-label="Ver detalle" onclick="openAntennaDetailView('${d.id}')"><svg class="detail-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="3"/></svg></button>
        <button class="btn bgh detail-card-action detail-edit-action" title="Editar" aria-label="Editar" onclick="editAntennaDetail('${d.id}')"><svg class="detail-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4.2-1 10.6-10.6a2.4 2.4 0 0 0-3.4-3.4L4.8 15.6 4 20Z"/><path d="m14 6.4 3.4 3.4"/></svg></button>
        ${d.nodeId ? '' : `<button class="btn bgh detail-card-action detail-move-action" title="Mover a pueblo" aria-label="Mover a pueblo" onclick="openMoveDetailToNode('${d.id}')"><svg class="detail-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 4 4 4-4 4M19 8H5M9 20l-4-4 4-4M5 16h14"/></svg></button>`}
        ${d.detailKind === 'network' ? `<button class="btn bgh detail-card-action detail-network-action" title="Acciones de red" aria-label="Acciones de red" onclick="openSharedNetworkDetailActions('${d.id}','refreshAntennaNetworkDetailViews')"><svg class="detail-action-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>` : `<button class="btn bg2 detail-card-action detail-complete-action" title="${done ? 'Reabrir' : 'Completar'}" aria-label="${done ? 'Reabrir' : 'Completar'}" onclick="markAntennaDetailDone('${d.id}')">${done ? '<svg class="detail-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 1-2.3-5.7"/><path d="M20 4v7h-7"/></svg>' : '<svg class="detail-action-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16.5 8.5"/></svg>'}</button>`}
        <button class="btn br" title="Eliminar" aria-label="Eliminar" onclick="deleteAntennaDetail('${d.id}')">${userHasRole('administrador','admin') ? 'Eliminar' : (req && req.status === 'code_ready' ? 'Ingresar código' : 'Solicitar eliminar')}</button>
      </div>
    </div>`;
  };
  const pending = details.filter(d => d.status !== 'completada');
  const completed = details.filter(d => d.status === 'completada');
  wrap.innerHTML = `${pending.map(renderDetail).join('')}${completed.length ? `<div class="detail-section-label"><strong>Completados</strong><button id="ant-completed-toggle" class="btn detail-completed-toggle" data-count="${completed.length}" aria-expanded="false" onclick="toggleAntennaCompletedDetails()">Ver completados (${completed.length})</button></div><div id="ant-completed-details" class="completed-details-list-unified" hidden>${completed.map(renderDetail).join('')}</div>` : ''}`;
}


// ===== Vinculación Antena -> Nodos =====
function ensureMoveDetailNodeModal() {
  if (document.getElementById('ant-move-detail-node-mo')) return;
  const div = document.createElement('div');
  div.className = 'mo';
  div.id = 'ant-move-detail-node-mo';
  div.innerHTML = `
    <div class="md" style="max-width:620px">
      <div class="modal-head">
        <div><h2>Mover detalle a pueblo</h2><p>El detalle quedara ligado al pueblo seleccionado.</p></div>
        <button class="btn bgh" onclick="CM('ant-move-detail-node-mo')">Cerrar</button>
      </div>
      <div class="fi"><label>Pueblo destino</label><select id="ant-move-detail-node-select"></select></div>
      <div class="card-actions"><button class="btn bc" onclick="moveAntennaDetailToNode()">Mover a pueblo</button><button class="btn bgh" onclick="CM('ant-move-detail-node-mo')">Cancelar</button></div>
    </div>`;
  document.body.appendChild(div);
}

function openMoveDetailToNode(detailId) {
  const antenna = (state.equipment || []).find(eq => eq.id === currentDetailAntennaId && !eq.deletedAt);
  const detail = (state.workOrders || []).find(d => d.id === detailId && !d.deletedAt);
  if (!antenna || !detail) return;
  ensureMoveDetailNodeModal();
  movingAntennaDetailId = detailId;
  const linkedIds = new Set(getEquipmentLinkedNodeIds(antenna.id));
  const linkedNodes = (state.nodes || []).filter(n => !n.deletedAt && linkedIds.has(n.id));
  const otherNodes = (state.nodes || []).filter(n => !n.deletedAt && !linkedIds.has(n.id)).slice(0, 250);
  const options = [];
  if (linkedNodes.length) options.push('<optgroup label="Pueblos vinculados a esta antena">', ...linkedNodes.map(n => `<option value="${n.id}">${antennaEscape(getNodeLabel(n))}</option>`), '</optgroup>');
  if (otherNodes.length) options.push('<optgroup label="Otros pueblos">', ...otherNodes.map(n => `<option value="${n.id}">${antennaEscape(getNodeLabel(n))}</option>`), '</optgroup>');
  document.getElementById('ant-move-detail-node-select').innerHTML = options.join('') || '<option value="">No hay pueblos registrados</option>';
  OM('ant-move-detail-node-mo');
}

async function moveAntennaDetailToNode() {
  const detail = (state.workOrders || []).find(d => d.id === movingAntennaDetailId && !d.deletedAt);
  const nodeId = document.getElementById('ant-move-detail-node-select')?.value || '';
  const node = (state.nodes || []).find(n => n.id === nodeId && !n.deletedAt);
  const antenna = (state.equipment || []).find(eq => eq.id === currentDetailAntennaId && !eq.deletedAt);
  if (!detail || !node || !antenna) { notify('Selecciona un pueblo válido.', 'err'); return; }
  detail.nodeId = node.id;
  detail.nodeCode = node.nodeCode || '';
  detail.nodeName = getNodeLabel(node);
  detail.town = node.town || '';
  detail.equipmentId = antenna.id;
  detail.equipmentName = antenna.name || '';
  if (!Array.isArray(antenna.linkedNodeIds)) antenna.linkedNodeIds = [];
  if (!antenna.linkedNodeIds.includes(node.id)) antenna.linkedNodeIds.push(node.id);
  setUpdatedAudit(detail, `movió detalle a pueblo ${getNodeLabel(node)}`);
  setUpdatedAudit(antenna, `vinculó pueblo ${getNodeLabel(node)}`);
  const detailSaved = await saveRecord('workOrders', detail);
  const antennaSaved = await saveRecord('equipment', antenna);
  if (!detailSaved || !antennaSaved) return;
  CM('ant-move-detail-node-mo');
  renderAntennaDetailList();
  renderAntenas();
  notify('Detalle movido al pueblo');
}

function ensureAntennaQuickNodeModal() {
  if (document.getElementById('ant-quick-node-mo')) return;
  const div = document.createElement('div');
  div.className = 'mo';
  div.id = 'ant-quick-node-mo';
  div.innerHTML = `
    <div class="md town-create-modal antenna-town-create-modal">
      <div class="modal-head"><div><h2>Agregar pueblo vinculado</h2><p>Registra el pueblo y enlázalo a esta antena.</p></div><button class="btn bgh" onclick="CM('ant-quick-node-mo')">Cerrar</button></div>
      <div class="modal-grid"><div class="fi"><label>Clave del pueblo</label><input id="ant-qnode-code" placeholder="R191"></div><div class="fi"><label>Pueblo / colonia</label><input id="ant-qnode-town" placeholder="TECOMATE"></div></div>
      <div class="modal-grid"><div class="fi"><label>Zona</label><select id="ant-qnode-zone"></select></div><div class="fi"><label>Estado</label><select id="ant-qnode-status"><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></div></div>
      <div class="fi town-location-field"><label>Ubicación</label><input id="ant-qnode-location" class="mono" placeholder="17.000000, -99.000000 o pega un enlace de Google Maps"><small>Pega latitud y longitud juntas; también se acepta un enlace de Maps.</small></div>
      <div class="fi"><label>Notas / observaciones</label><textarea id="ant-qnode-notes" placeholder="Escribe alguna observación (opcional)..."></textarea></div>
      <div class="card-actions"><button class="btn bgh" onclick="CM('ant-quick-node-mo')">Cancelar</button><button class="btn bc" onclick="saveAntennaQuickNode()">Guardar pueblo vinculado</button></div>
      <div class="town-create-note">Este pueblo quedará vinculado a la antena actual y aparecerá en el mapa.</div>
    </div>`;
  document.body.appendChild(div);
}

function openAntennaQuickNodeModal(antennaId = currentDetailAntennaId) {
  const antenna = (state.equipment || []).find(eq => eq.id === antennaId && !eq.deletedAt);
  if (!antenna) return;
  currentDetailAntennaId = antenna.id;
  ensureAntennaQuickNodeModal();
  document.getElementById('ant-qnode-zone').innerHTML = REGS.map(r => `<option value="${r.id}">${r.n}</option>`).join('');
  document.getElementById('ant-qnode-zone').value = antenna.region || '';
  ['ant-qnode-code','ant-qnode-town','ant-qnode-notes','ant-qnode-location'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('ant-qnode-status').value = 'activo';
  OM('ant-quick-node-mo');
}

async function saveAntennaQuickNode() {
  const antenna = (state.equipment || []).find(eq => eq.id === currentDetailAntennaId && !eq.deletedAt);
  if (!antenna) return;
  const location = parseLocationCoordinates(document.getElementById('ant-qnode-location').value);
  const payload = {
    nodeCode: document.getElementById('ant-qnode-code').value.trim(),
    town: document.getElementById('ant-qnode-town').value.trim(),
    zone: document.getElementById('ant-qnode-zone').value,
    lat: location?.lat ?? NaN,
    lng: location?.lng ?? NaN,
    status: document.getElementById('ant-qnode-status').value,
    notes: document.getElementById('ant-qnode-notes').value.trim()
  };
  if (!payload.nodeCode || !payload.town || !payload.zone || isNaN(payload.lat) || isNaN(payload.lng)) { notify('Clave, pueblo, zona y una ubicación válida son obligatorios.', 'err'); return; }
  const duplicate = (state.nodes || []).find(node => !node.deletedAt && normalizeName(node.nodeCode) === normalizeName(payload.nodeCode) && normalizeName(node.town) === normalizeName(payload.town));
  if (duplicate) { notify('Ya existe ese mismo nodo con ese pueblo.', 'err'); return; }
  const node = { id: gid('nd'), createdAt: new Date().toISOString(), ...payload };
  setCreatedAudit(node, 'agrego nodo desde antena');
  state.nodes.push(node);
  if (!Array.isArray(antenna.linkedNodeIds)) antenna.linkedNodeIds = [];
  antenna.linkedNodeIds.push(node.id);
  setUpdatedAudit(antenna, `vinculo nodo ${getNodeLabel(node)}`);
  const nodeSaved = await saveRecord('nodes', node);
  const antennaSaved = nodeSaved ? await saveRecord('equipment', antenna) : false;
  if (!nodeSaved || !antennaSaved) {
    notify('No se pudo guardar o vincular el nodo en D1. Intenta otra vez.', 'err');
    return;
  }
  CM('ant-quick-node-mo');
  refreshAntennaDetailRelationsUI(`node:${node.id}`);
  renderAntennaDetailList();
  if (linkingAntennaId === antenna.id) renderAntennaNodeLinks();
  renderAntenas();
  notify('Nodo creado y vinculado a la antena');
}

let linkingAntennaId = '';
let antennaNodeLinkMap = null;
let antennaNodeLinkLayer = null;

function ensureAntennaNodeModal() {
  if (document.getElementById('ant-node-link-mo')) return;
  const div = document.createElement('div');
  div.className = 'mo';
  div.id = 'ant-node-link-mo';
  div.innerHTML = `
    <div class="md ant-node-link-modal">
      <div class="modal-head ant-node-link-head">
        <div>
          <h2 id="ant-node-link-title">Pueblos vinculados</h2>
          <p>Asigna los pueblos/nodos que salen de esta antena. En el mapa podrás ver las uniones.</p>
        </div>
        <button class="ant-node-link-close" type="button" onclick="closeAntennaNodeLinks()" aria-label="Cerrar">&times;</button>
      </div>
      <div class="ant-node-link-layout">
        <section class="ant-node-link-search-panel">
          <h3><span class="ant-node-section-icon">&#128269;</span>Buscar pueblo</h3>
          <div class="ant-node-search-box">
            <span>&#128269;</span><input id="ant-node-link-search" placeholder="Escribe R114, pueblo o zona..." autocomplete="off" oninput="renderAntennaNodeLinkSuggestions()" onfocus="renderAntennaNodeLinkSuggestions()">
          </div>
          <div class="small-help">Puedes asignar varios pueblos a una misma antena. Ejemplo: R114 Barrio Guadalupe, R114 Chinameca, etc.</div>
          <button class="ant-node-create-button" type="button" onclick="openAntennaQuickNodeModal(linkingAntennaId)"><b>+</b> Crear pueblo nuevo vinculado</button>
          <div class="ant-node-suggestions-head"><span>&#10024;</span><strong id="ant-node-suggestions-title">Sugerencias</strong></div>
          <div id="ant-node-link-suggestions" class="ant-node-suggestions-list"></div>
        </section>
        <section class="ant-node-link-assigned-panel">
          <h3><span class="ant-node-section-icon">&#128279;</span>Pueblos asignados</h3>
          <div id="ant-node-link-list" class="ant-node-linked-list"></div>
          <div class="ant-node-map-card">
            <div class="ant-node-map-title"><span>&#128506;</span><div><strong>Vista en el mapa</strong><small>Así se conectan los pueblos con esta antena.</small></div></div>
            <div id="ant-node-link-map" class="ant-node-link-map"></div>
          </div>
        </section>
      </div>
    </div>`;
  document.body.appendChild(div);
}

async function openAntennaNodeLinks(id) {
  const eq = (state.equipment || []).find(item => item.id === id && !item.deletedAt);
  if (!eq) return;
  ensureAntennaNodeModal();
  linkingAntennaId = id;
  document.getElementById('ant-node-link-title').textContent = `Pueblos de ${eq.name || 'antena'}`;
  document.getElementById('ant-node-link-search').value = '';

  // Asegurar que state.nodes contenga todos los pueblos registrados para vincular
  if (!state.nodes || state.nodes.length < 5) {
    try {
      const nodeData = await fetchDataPage('nodes', { limit: 1000 });
      if (Array.isArray(nodeData.nodes)) {
        state.nodes = nodeData.nodes;
      }
    } catch (e) {}
  }

  renderAntennaNodeLinks();
  document.body.classList.add('ant-node-link-open');
  OM('ant-node-link-mo');
  setTimeout(renderAntennaNodeLinkMap, 100);
}

function closeAntennaNodeLinks() {
  CM('ant-node-link-mo');
  document.body.classList.remove('ant-node-link-open');
}

function getCurrentLinkedNodeIds() {
  const eq = (state.equipment || []).find(item => item.id === linkingAntennaId);
  if (!eq) return [];
  if (!Array.isArray(eq.linkedNodeIds)) eq.linkedNodeIds = [];
  return eq.linkedNodeIds;
}

function renderAntennaNodeLinkSuggestions() {
  const q = normalizeName(document.getElementById('ant-node-link-search')?.value || '');
  const menu = document.getElementById('ant-node-link-suggestions');
  if (!menu) return;
  const currentLinked = new Set(getCurrentLinkedNodeIds());
  
  // Buscar entre todos los nodos disponibles
  const allAvailable = (state.nodes || []).filter(n => n && !n.deletedAt && !currentLinked.has(n.id));
  const matches = allAvailable
    .filter(n => !q || [getNodeLabel(n), n.nodeCode, n.town, getZoneLabel(n.zone)].some(v => normalizeName(v).includes(q)))
    .slice(0, 8);

  const title = document.getElementById('ant-node-suggestions-title');
  if (title) title.textContent = q ? `Resultados (${matches.length})` : 'Pueblos sugeridos para vincular';
  if (!matches.length) {
    menu.innerHTML = `<div class="ant-node-no-results">${q ? 'No se encontraron pueblos con esa búsqueda.' : 'No hay más pueblos disponibles para vincular.'}</div>`;
    return;
  }

  menu.innerHTML = matches.map(n => {
    const otherEq = (state.equipment || []).find(e => e.id !== linkingAntennaId && !e.deletedAt && Array.isArray(e.linkedNodeIds) && e.linkedNodeIds.includes(n.id));
    const isReassign = !!otherEq;
    const btnText = isReassign ? 'Reasignar' : 'Vincular';
    const statusNote = otherEq ? ` · <span style="color:#d97706;font-weight:700;">En antena: ${antennaEscape(otherEq.name)}</span>` : '';
    return `<article class="ant-node-suggestion" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <span class="ant-node-pin">&#9906;</span>
      <div style="flex:1;min-width:0;">
        <strong>${antennaEscape(getNodeLabel(n))}</strong>
        <small>${antennaEscape(getZoneLabel(n.zone))}${statusNote}</small>
      </div>
      <button type="button" class="${isReassign ? 'bgh' : ''}" style="${isReassign ? 'background:#e0f2fe;color:#0284c7;border:1px solid #bae6fd;' : ''}" onmousedown="event.preventDefault();addNodeToAntenna('${n.id}')">${btnText}</button>
    </article>`;
  }).join('');
}

async function addNodeToAntenna(nodeId) {
  const eq = (state.equipment || []).find(item => item.id === linkingAntennaId);
  const node = (state.nodes || []).find(n => n.id === nodeId && !n.deletedAt);
  if (!eq || !node) return;

  if (!Array.isArray(eq.linkedNodeIds)) eq.linkedNodeIds = [];

  // Regla estricta institucional: Un pueblo solo puede asignarse a una antena
  // Si ya estaba asignado a otra antena, desvincularlo de la antena previa
  const otherAntenna = (state.equipment || []).find(item => item.id !== eq.id && Array.isArray(item.linkedNodeIds) && item.linkedNodeIds.includes(nodeId));
  if (otherAntenna) {
    otherAntenna.linkedNodeIds = otherAntenna.linkedNodeIds.filter(id => id !== nodeId);
    setUpdatedAudit(otherAntenna, `desvinculó nodo ${getNodeLabel(node)} (reasignado a ${eq.name})`);
    await saveRecord('equipment', otherAntenna).catch(() => {});
  }

  if (!eq.linkedNodeIds.includes(nodeId)) {
    eq.linkedNodeIds.push(nodeId);
    setUpdatedAudit(eq, `vinculó nodo ${getNodeLabel(node)}`);
    const saved = await saveRecord('equipment', eq);
    if (!saved) {
      eq.linkedNodeIds = eq.linkedNodeIds.filter(id => id !== nodeId);
      notify('No se pudo vincular el nodo.', 'err');
      return;
    }
  }

  node.equipmentId = eq.id;
  node.equipmentName = eq.name || '';
  await saveRecord('nodes', node).catch(() => {});

  document.getElementById('ant-node-link-search').value = '';
  const menu = document.getElementById('ant-node-link-suggestions');
  if (menu) menu.innerHTML = '';
  renderAntennaNodeLinks();
  if (currentDetailAntennaId === eq.id) refreshAntennaDetailRelationsUI(`node:${nodeId}`);
  renderAntenas();
  notify(`Pueblo "${getNodeLabel(node)}" vinculado a ${eq.name || 'la antena'}.`, 'ok');
}

async function removeNodeFromAntenna(nodeId) {
  const eq = (state.equipment || []).find(item => item.id === linkingAntennaId);
  if (!eq || !Array.isArray(eq.linkedNodeIds)) return;
  const node = (state.nodes || []).find(n => n.id === nodeId);
  const prevIds = [...eq.linkedNodeIds];
  eq.linkedNodeIds = eq.linkedNodeIds.filter(id => id !== nodeId);
  setUpdatedAudit(eq, `quitó nodo ${node ? getNodeLabel(node) : nodeId}`);
  const saved = await saveRecord('equipment', eq);
  if (!saved) {
    eq.linkedNodeIds = prevIds;
    notify('No se pudo quitar el vínculo.', 'err');
    return;
  }
  if (node) {
    node.equipmentId = '';
    node.equipmentName = '';
    await saveRecord('nodes', node).catch(() => {});
  }
  renderAntennaNodeLinks();
  if (currentDetailAntennaId === eq.id) refreshAntennaDetailRelationsUI('equipment');
  renderAntenas();
  notify('Pueblo desvinculado.', 'ok');
}

function renderAntennaNodeLinks() {
  const list = document.getElementById('ant-node-link-list');
  if (!list) return;
  const nodes = getEquipmentLinkedNodes(linkingAntennaId);
  if (!nodes.length) {
    list.innerHTML = '<div class="ant-node-empty"><span>&#128279;</span><strong>Esta antena todavía no tiene pueblos vinculados.</strong><small>Los pueblos que asignes aparecerán aquí y sus conexiones se mostrarán en el mapa.</small></div>';
    renderAntennaNodeLinkSuggestions();
    renderAntennaNodeLinkMap();
    return;
  }
  list.innerHTML = nodes.map(n => `<div class="ant-node-linked-row"><span class="ant-node-pin">&#9906;</span><div><strong>${antennaEscape(getNodeLabel(n))}</strong><small>${antennaEscape(getZoneLabel(n.zone))}</small></div><button type="button" onclick="removeNodeFromAntenna('${n.id}')" aria-label="Quitar ${antennaEscape(getNodeLabel(n))}">&times;</button></div>`).join('');
  renderAntennaNodeLinkSuggestions();
  renderAntennaNodeLinkMap();
}

function renderAntennaNodeLinkMap() {
  const element = document.getElementById('ant-node-link-map');
  if (!element || typeof L === 'undefined' || !document.getElementById('ant-node-link-mo')?.classList.contains('open')) return;
  if (!antennaNodeLinkMap) {
    antennaNodeLinkMap = L.map(element, { zoomControl:true, scrollWheelZoom:false }).setView([17.55, -99.50], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap', maxZoom:19 }).addTo(antennaNodeLinkMap);
  }
  if (antennaNodeLinkLayer) antennaNodeLinkMap.removeLayer(antennaNodeLinkLayer);
  antennaNodeLinkLayer = L.layerGroup().addTo(antennaNodeLinkMap);
  const antenna = (state.equipment || []).find(item => item.id === linkingAntennaId && !item.deletedAt);
  const antennaLat = safeFloat(antenna?.lat);
  const antennaLng = safeFloat(antenna?.lng);
  const points = [];
  if (!isNaN(antennaLat) && !isNaN(antennaLng)) {
    points.push([antennaLat, antennaLng]);
    L.marker([antennaLat, antennaLng], {
      icon:L.divIcon({ className:'', html:'<div class="ant-node-map-marker antenna"><img src="assets/icons/antenna-module-256-v1.png" alt=""></div>', iconSize:[38,38], iconAnchor:[19,19] })
    }).bindPopup(`<strong>${antennaEscape(antenna?.name || 'Antena')}</strong>`).addTo(antennaNodeLinkLayer);
    getEquipmentLinkedNodes(linkingAntennaId).forEach(node => {
      const lat = safeFloat(node.lat);
      const lng = safeFloat(node.lng);
      if (isNaN(lat) || isNaN(lng)) return;
      points.push([lat, lng]);
      L.polyline([[antennaLat, antennaLng], [lat, lng]], { color:'#72839a', weight:2, dashArray:'7 7', opacity:.8 }).addTo(antennaNodeLinkLayer);
      L.marker([lat, lng], {
        icon:L.divIcon({ className:'', html:'<div class="ant-node-map-marker node"></div>', iconSize:[18,18], iconAnchor:[9,9] })
      }).bindPopup(`<strong>${antennaEscape(getNodeLabel(node))}</strong><br><small>${antennaEscape(getZoneLabel(node.zone))}</small>`).addTo(antennaNodeLinkLayer);
    });
  }
  if (points.length > 1) antennaNodeLinkMap.fitBounds(points, { padding:[28,28], maxZoom:14 });
  else if (points.length === 1) antennaNodeLinkMap.setView(points[0], 13);
  else antennaNodeLinkMap.setView([17.55, -99.50], 8);
  setTimeout(() => antennaNodeLinkMap?.invalidateSize(), 60);
}

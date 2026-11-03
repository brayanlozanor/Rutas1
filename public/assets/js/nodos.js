let editingNodeId = null;
let currentDetailNodeId = null;
let editingNodeDetailId = null;
let nodeDetailEditReturnId = '';
let nodeDetailListScrollTop = 0;
let nodeCurrentPage = 1;
let nodeRowsPerPage = 20;
let nodeLoadSequence = 0;
let nodeDetailKind = 'physical';

function nodeRemoteParams(){const f=buildNodeFilters();return {windowed:'1',includeRelated:'1',offset:(nodeCurrentPage-1)*nodeRowsPerPage,limit:nodeRowsPerPage,q:document.getElementById('node-search')?.value.trim()||'',zone:f.zone,priority:f.priority};}
const previousNodeDataPartParams=window.netopsGetDataPartParams;
window.netopsGetDataPartParams=part=>part==='nodes'?nodeRemoteParams():previousNodeDataPartParams?.(part);
async function loadNodePage(){const sequence=++nodeLoadSequence;try{const params=nodeRemoteParams();const data=await fetchDataPage('nodes',params);if(sequence!==nodeLoadSequence)return false;const total=Number(data.total)||0;if(total>0&&Number(params.offset)>=total){nodeCurrentPage=Math.max(1,Math.ceil(total/nodeRowsPerPage));return loadNodePage();}state.nodes=Array.isArray(data.nodes)?data.nodes:[];state.equipment=Array.isArray(data.equipment)?data.equipment:[];state.workOrders=Array.isArray(data.workOrders)?data.workOrders:[];state.deletionRequests=Array.isArray(data.deletionRequests)?data.deletionRequests:[];if(typeof _previousStateSaved!=='undefined'&&_previousStateSaved){for(const key of ['nodes','equipment','workOrders','deletionRequests'])_previousStateSaved[key]=cloneData(state[key]);}window.netopsPageMeta=window.netopsPageMeta||{};window.netopsPageMeta.nodes={total,offset:Number(params.offset)||0,limit:nodeRowsPerPage,stats:data.stats||{}};renderNodeSearchOptions();renderNodos();renderDeletionRequests();return true;}catch(error){notify(describeSyncError(error),'err');return false;}}


function renderAdminTechReport(detail) {
  const report = detail?.technicianReport || {};
  const photos = [...new Set([...(Array.isArray(report.evidencePhotos) ? report.evidencePhotos : []), report.evidencePhoto].filter(Boolean))];
  const gallery = encodeURIComponent(JSON.stringify(photos));
  if (!report.solution && !report.reason && !report.materialUsed && !photos.length && !report.completedAt) return '';
  const status = report.result === 'no_realizado' ? 'No realizado' : 'Terminado';
  return `<div class="detail-tech-report">
    <strong>Reporte técnico · ${status}</strong>
    ${report.solution ? `<span>Solución: ${nodeEscape(report.solution)}</span>` : ''}
    ${report.reason ? `<span>Motivo: ${nodeEscape(report.reason)}</span>` : ''}
    ${report.materialUsed ? `<span>Material: ${nodeEscape(report.materialUsed)}</span>` : ''}
    ${report.completedByName ? `<span>Técnico: ${nodeEscape(report.completedByName)}</span>` : ''}
    ${report.completedAt ? `<span>Fecha: ${new Date(report.completedAt).toLocaleString('es-MX')}</span>` : ''}
    ${photos.map((photo, index) => `<button type="button" class="evidence-link" data-evidence-gallery="${gallery}" onclick="openEvidenceGalleryEncoded(this.dataset.evidenceGallery,${index})">Ver evidencia ${photos.length > 1 ? index + 1 : ''}</button>`).join('')}
  </div>`;
}

function nodeEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
}

function initNodosPage() {
  if (!checkAuth()) return;
  initCommon();
  setupNodeDetailEscapeNavigation();
  applyPuebloTerminology();
  loadDB({ showOverlay: true, overlayDelay: 0, loadingTitle: 'Cargando informacion', loadingSubtitle: 'Preparando esta ventana...' }).then(() => {
    fillNodeZoneFilters();
    renderNodeSearchOptions();
    renderNodos();
    renderDeletionRequests();
    const openId = localStorage.getItem('netops_open_node_details');
    if (openId) { localStorage.removeItem('netops_open_node_details'); setTimeout(() => openNodeDetails(openId), 300); }
  });
}

function applyPuebloTerminology() {
  document.title = 'WiFiMex · Pueblos';
  const hero = document.querySelector('.inventory-hero');
  if (hero) {
    const chip = hero.querySelector('.section-chip');
    const title = hero.querySelector('h1');
    const copy = hero.querySelector('p');
    if (chip) chip.textContent = 'Pueblos / Gestión';
    if (title) title.textContent = 'Pueblos';
    if (copy) copy.textContent = 'Los pueblos pueden seleccionar zona manual. Los colores reflejan sus detalles pendientes.';
  }
  const totalLabel = document.querySelector('.stat-total .label');
  if (totalLabel) totalLabel.textContent = 'Pueblos';
  const newButton = document.querySelector('button[onclick="openNodeModal()"]');
  if (newButton) newButton.textContent = '+ Nuevo pueblo';
  const search = document.getElementById('node-search');
  if (search) search.placeholder = 'Buscar pueblo o zona...';
  const formTitle = document.getElementById('node-form-title');
  if (formTitle) formTitle.textContent = 'Agregar pueblo';
  const codeLabel = document.getElementById('node-code')?.closest('.fi')?.querySelector('label');
  if (codeLabel) codeLabel.textContent = 'Clave del pueblo';
  const saveButton = document.querySelector('#node-mo button[onclick="saveNode()"]');
  if (saveButton) saveButton.textContent = 'Guardar pueblo';
  const detailSub = document.getElementById('node-detail-sub');
  if (detailSub) detailSub.textContent = 'Detalles pendientes de este pueblo.';
}

function fillNodeZoneFilters() {
  const options = REGS.map(r => `<option value="${r.id}">${r.n}</option>`).join('');
  ['node-zone','node-filter-zone'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = (id === 'node-filter-zone' ? '<option value="all">Todas las zonas</option>' : '<option value="">Selecciona zona</option>') + options;
  });
}

function renderNodeSearchOptions() {
  const list = document.getElementById('node-search-options');
  if (list) {
    list.innerHTML = (state.nodes || []).filter(n => !n.deletedAt).slice(0, 220).map(n => `<option value="${nodeEscape(getNodeLabel(n))}">${nodeEscape(getZoneLabel(n.zone))}</option>`).join('');
  }
  renderNodeFormOptions();
}

function renderNodeFormOptions() {
  const codeList = document.getElementById('node-code-options');
  const townList = document.getElementById('node-town-options');
  const nodes = (state.nodes || []).filter(n => !n.deletedAt);
  if (codeList) {
    const codes = [...new Set(nodes.map(n => String(n.nodeCode || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'es', { numeric:true })).slice(0,220);
    codeList.innerHTML = codes.map(code => `<option value="${nodeEscape(code)}"></option>`).join('');
  }
  if (townList) {
    const towns = [...new Set(nodes.map(n => String(n.town || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'es', { numeric:true })).slice(0,220);
    townList.innerHTML = towns.map(town => `<option value="${nodeEscape(town)}"></option>`).join('');
  }
}

function getNodeFormWarnings(nodeCode, town) {
  const code = normalizeName(nodeCode);
  const townKey = normalizeName(town);
  const warnings = [];
  const nodes = (state.nodes || []).filter(n => !n.deletedAt && n.id !== editingNodeId);
  if (code) {
    const sameCode = nodes.filter(n => normalizeName(n.nodeCode) === code);
    if (sameCode.length) {
      const pueblos = sameCode.map(n => n.town).filter(Boolean).slice(0, 6).join(', ');
      warnings.push(`<div class="node-warning"><strong>Este pueblo/R ya existe.</strong><span class="muted">Puedes repetirlo si es otro pueblo. Pueblos ya registrados: ${nodeEscape(pueblos || 'sin nombre')}</span></div>`);
    }
  }
  if (townKey) {
    const sameTown = nodes.filter(n => normalizeName(n.town) === townKey);
    if (sameTown.length) {
      const codigos = sameTown.map(n => n.nodeCode).filter(Boolean).slice(0, 6).join(', ');
      warnings.push(`<div class="node-warning"><strong>Ese pueblo/colonia ya aparece registrado.</strong><span class="muted">Revisa si es el mismo lugar antes de guardar. Clave(s): ${nodeEscape(codigos || 'sin clave')}</span></div>`);
    }
  }
  return warnings;
}

function updateNodeDuplicateWarnings() {
  const box = document.getElementById('node-duplicate-warnings');
  if (!box) return;
  const nodeCode = document.getElementById('node-code')?.value || '';
  const town = document.getElementById('node-town')?.value || '';
  box.innerHTML = getNodeFormWarnings(nodeCode, town).join('');
}

function openNodeModal() {
  resetNodeForm();
  renderNodeFormOptions();
  updateNodeDuplicateWarnings();
  OM('node-mo');
}

function resetNodeForm() {
  editingNodeId = null;
  document.getElementById('node-form-title').textContent = 'Agregar pueblo';
  ['node-code','node-town','node-location','node-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('node-zone').value = '';
  document.getElementById('node-status').value = 'activo';
  updateNodeDuplicateWarnings();
}


async function saveNode() {
  const location = parseLocationCoordinates(document.getElementById('node-location').value);
  const payload = {
    nodeCode: document.getElementById('node-code').value.trim(),
    town: document.getElementById('node-town').value.trim(),
    zone: document.getElementById('node-zone').value,
    lat: location?.lat ?? NaN,
    lng: location?.lng ?? NaN,
    status: document.getElementById('node-status').value,
    notes: document.getElementById('node-notes').value.trim()
  };
  if (!payload.nodeCode || !payload.town || !payload.zone || isNaN(payload.lat) || isNaN(payload.lng)) {
    notify('Falta información o la ubicación no es válida. Ejemplo: 17.000000, -99.000000.', 'err');
    return;
  }
  const exactDuplicate = (state.nodes || []).find(node =>
    !node.deletedAt &&
    node.id !== editingNodeId &&
    normalizeName(node.nodeCode) === normalizeName(payload.nodeCode) &&
    normalizeName(node.town) === normalizeName(payload.town)
  );
  if (exactDuplicate) {
    notify('Ya existe esa misma clave con ese mismo pueblo/colonia.', 'err');
    return;
  }
  const auditCountBefore = Array.isArray(state.auditLog) ? state.auditLog.length : 0;
  let nodeToSave = null;
  const wasEditing = !!editingNodeId;
  if (editingNodeId) {
    const node = (state.nodes || []).find(item => item.id === editingNodeId);
    if (!node) return;
    Object.assign(node, payload, { updatedAt:new Date().toISOString() });
    setUpdatedAudit(node, 'modificó nodo');
    nodeToSave = node;
    notify('Pueblo actualizado.');
  } else {
    const newNode = { id: gid('nd'), createdAt:new Date().toISOString(), ...payload };
    setCreatedAudit(newNode, 'agregó nodo');
    state.nodes.push(newNode);
    nodeToSave = newNode;
    notify('Pueblo registrado correctamente.');
  }

  // Guardado dirigido: una fila de nodes y únicamente los eventos de auditoría
  // generados por esta acción. No se sincroniza el estado completo.
  const ok = await saveRecord('nodes', nodeToSave);
  if (ok) {
    const newAuditRows = (state.auditLog || []).slice(auditCountBefore);
    for (const auditRow of newAuditRows) await saveRecord('auditLog', auditRow);
    notify(wasEditing ? 'Pueblo actualizado y sincronizado.' : 'Pueblo registrado y sincronizado.');
  }
  CM('node-mo');
  resetNodeForm();
  renderNodeSearchOptions();
  renderNodos();
}

function editNode(id) {
  const node = (state.nodes || []).find(item => item.id === id && !item.deletedAt);
  if (!node) return;
  editingNodeId = id;
  document.getElementById('node-form-title').textContent = 'Editar pueblo';
  document.getElementById('node-code').value = node.nodeCode || '';
  document.getElementById('node-town').value = node.town || '';
  document.getElementById('node-zone').value = node.zone || '';
  document.getElementById('node-location').value = Number.isFinite(Number(node.lat)) && Number.isFinite(Number(node.lng)) ? `${node.lat}, ${node.lng}` : '';
  document.getElementById('node-status').value = node.status || 'activo';
  document.getElementById('node-notes').value = node.notes || '';
  renderNodeFormOptions();
  updateNodeDuplicateWarnings();
  OM('node-mo');
}

function getNodeDeletionRequest(nodeId) {
  return findDeletionRequest('node', nodeId);
}

async function deleteNode(id) {
  const node = (state.nodes || []).find(item => item.id === id && !item.deletedAt);
  if (!node) return;
  await handleProtectedDelete({
    targetType:'node',
    targetId:id,
    targetName:getNodeLabel(node),
    applyDelete:() => { setDeletedAudit(node, 'eliminó nodo'); },
    refresh:() => { renderNodos(); renderDeletionRequests(); }
  });
}

function buildNodeFilters() {
  return {
    query: normalizeName(document.getElementById('node-search')?.value || ''),
    zone: document.getElementById('node-filter-zone')?.value || 'all',
    priority: document.getElementById('node-filter-priority')?.value || 'all'
  };
}

function filteredNodesList() {
  const { query, zone, priority } = buildNodeFilters();
  return (state.nodes || []).filter(node => {
    if (node.deletedAt) return false;
    if (zone !== 'all' && node.zone !== zone) return false;
    const st = getEntityPriorityStatus('node', node.id);
    if (priority !== 'all' && st.key !== priority) return false;
    if (!query) return true;
    return [node.nodeCode, node.town, node.notes, getZoneLabel(node.zone), getNodeLabel(node)].some(val => normalizeName(val).includes(query));
  });
}

function resetNodePagination() {
  nodeCurrentPage = 1;
  void loadNodePage();
}

function changeNodePage(nextPage) {
  const page = Number(nextPage);
  if (!Number.isFinite(page) || page < 1) return;
  nodeCurrentPage = page;
  void loadNodePage();
  document.querySelector('.nodes-page .inventory-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function changeNodePageSize(value) {
  const size = Number(value);
  nodeRowsPerPage = [20, 50, 100].includes(size) ? size : 20;
  nodeCurrentPage = 1;
  void loadNodePage();
}

function renderNodos() {
  const nodes = filteredNodesList();
  const statuses = nodes.map(node => getEntityPriorityStatus('node', node.id));
  const meta=window.netopsPageMeta?.nodes||{};
  const stats=meta.stats||{};
  const total=Number.isFinite(Number(meta.total))?Number(meta.total):nodes.length;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('node-total', Number.isFinite(Number(stats.total))?Number(stats.total):total);
  set('node-critical', Number.isFinite(Number(stats.critical))?Number(stats.critical):statuses.filter(s => s.key === 'critico').length);
  set('node-warning', Number.isFinite(Number(stats.warning))?Number(stats.warning):statuses.filter(s => s.key === 'atencion').length);
  set('node-request-total', getFilteredNodeDeletionRequests(nodes).length);
  const wrap = document.getElementById('nodos-grid');
  if (!wrap) return;
  if (!nodes.length) { nodeCurrentPage = 1; wrap.innerHTML = '<div class="empty-state">No hay pueblos para el filtro actual.</div>'; return; }
  const totalPages = Math.max(1, Math.ceil(total / nodeRowsPerPage));
  nodeCurrentPage = Math.min(Math.max(nodeCurrentPage, 1), totalPages);
  const rangeStart = (nodeCurrentPage - 1) * nodeRowsPerPage;
  const rangeEnd = Math.min(rangeStart + nodes.length, total);
  const visibleNodes = nodes;
  wrap.innerHTML = `<div class="list-grid">${visibleNodes.map(node => {
    const st = getEntityPriorityStatus('node', node.id);
    const detailCount = getEntityOpenDetails('node', node.id).length;
    return `<article class="entity-card pueblo-card ${st.key}">
      <div class="entity-title"><div><h3>${nodeEscape(getNodeLabel(node))}</h3></div><span class="badge" style="background:${st.color}22;color:${st.color};border-color:${st.color}55">${st.label}</span></div>
      <div class="meta-list"><div class="meta-row"><span>Ubicaci&oacute;n</span><strong>${nodeEscape(`${Number(node.lat).toFixed(6)}, ${Number(node.lng).toFixed(6)}`)}</strong></div><div class="meta-row"><span>Detalles pendientes</span><strong>${detailCount}</strong></div></div>
      <div class="antenna-icon-actions node-icon-actions"><button class="ant-icon-btn primary" title="Ver detalles" aria-label="Ver detalles" onclick="openNodeDetails('${node.id}')"><svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="ant-icon-btn add" title="Agregar detalle" aria-label="Agregar detalle" onclick="openNodeDetails('${node.id}', true)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg></button><button class="ant-icon-btn edit" title="Editar nodo" aria-label="Editar nodo" onclick="editNode('${node.id}')"><svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button><button class="ant-icon-btn delete" title="${userHasRole('administrador','admin') ? 'Eliminar' : 'Solicitar baja'}" aria-label="${userHasRole('administrador','admin') ? 'Eliminar' : 'Solicitar baja'}" onclick="deleteNode('${node.id}')"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6"/></svg></button></div>
    </article>`;
  }).join('')}</div>${renderNodePagination(total, rangeStart, rangeEnd, totalPages)}`;
  wrap.querySelectorAll('button[onclick^="editNode"]').forEach(button => {
    button.title = 'Editar pueblo';
    button.setAttribute('aria-label', 'Editar pueblo');
  });
}

function renderNodePagination(total, rangeStart, rangeEnd, totalPages) {
  return `<div class="inventory-pagination">
    <div class="inventory-page-nav">
      <button type="button" class="inventory-page-button" aria-label="Página anterior" onclick="changeNodePage(${nodeCurrentPage - 1})" ${nodeCurrentPage === 1 ? 'disabled' : ''}>‹</button>
      <button type="button" class="inventory-page-button" aria-label="Página siguiente" onclick="changeNodePage(${nodeCurrentPage + 1})" ${nodeCurrentPage === totalPages ? 'disabled' : ''}>›</button>
      <span><strong>${rangeStart + 1}-${rangeEnd}</strong> de <strong>${total}</strong> pueblos</span>
      <span class="inventory-page-indicator">Página ${nodeCurrentPage} de ${totalPages}</span>
    </div>
    <label class="inventory-page-size"><span>Elementos por página:</span><select onchange="changeNodePageSize(this.value)"><option value="20" ${nodeRowsPerPage === 20 ? 'selected' : ''}>20</option><option value="50" ${nodeRowsPerPage === 50 ? 'selected' : ''}>50</option><option value="100" ${nodeRowsPerPage === 100 ? 'selected' : ''}>100</option></select></label>
  </div>`;
}

function getFilteredNodeDeletionRequests(nodes = filteredNodesList()) {
  const nodeIds = new Set(nodes.map(node => node.id));
  const detailIds = new Set((state.workOrders || []).filter(detail => !detail.deletedAt && nodeIds.has(detail.nodeId)).map(detail => detail.id));
  return getPendingDeletionRequests().filter(req => {
    const type = getRequestTargetType(req);
    const id = getRequestTargetId(req);
    return (type === 'node' && nodeIds.has(id)) || (type === 'detail' && detailIds.has(id));
  });
}
function openNodeEquipmentLinks(id) {
  const node = (state.nodes || []).find(item => item.id === id && !item.deletedAt);
  if (!node) return;
  let modal = document.getElementById('node-equipment-links-mo');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'node-equipment-links-mo';
    modal.className = 'mo';
    modal.innerHTML = `<div class="md" style="max-width:620px"><div class="modal-head"><div><h2 id="node-equipment-links-title">Antenas vinculadas</h2><p>Equipos relacionados con este nodo.</p></div><button class="btn bgh" onclick="CM('node-equipment-links-mo')">Cerrar</button></div><div id="node-equipment-links-list" class="detail-list"></div></div>`;
    document.body.appendChild(modal);
  }
  const linked = getNodeLinkedEquipment(id);
  document.getElementById('node-equipment-links-title').textContent = `Antenas vinculadas · ${getNodeLabel(node)}`;
  document.getElementById('node-equipment-links-list').innerHTML = linked.length
    ? linked.map(eq => `<div class="detail-item"><div class="detail-title">${nodeEscape(eq.name || 'Antena')}</div><div class="entity-sub">${nodeEscape(eq.ip || getZoneLabel(eq.region))}</div></div>`).join('')
    : '<div class="empty-state">Sin antenas vinculadas.</div>';
  OM('node-equipment-links-mo');
}

function renderDeletionRequests() {
  const wrap = document.getElementById('node-requests');
  const totalEl = document.getElementById('node-request-total');
  let requests = getFilteredNodeDeletionRequests();
  if (totalEl) totalEl.textContent = requests.length;
  if (!wrap) return;
  const user = getCurrentUser();
  if (!userHasRole('administrador','admin')) requests = requests.filter(req => req.requestedByUserId === user.id);
  if (!requests.length) { wrap.innerHTML = '<div class="empty-state">No hay solicitudes pendientes.</div>'; return; }
  wrap.innerHTML = requests.map(req => {
    const label = getRequestTargetLabel(req);
    const type = getRequestTargetType(req) === 'detail' ? 'Detalle' : (getRequestTargetType(req) === 'equipment' ? 'Antena' : 'Pueblo');
    return `<div class="delete-request"><div class="entity-title"><div><h3 style="font-size:16px">${nodeEscape(label)}</h3><div class="entity-sub">${type} - Solicito: ${nodeEscape(req.requestedByName || 'usuario')}</div></div><span class="badge warning">Pendiente</span></div><div class="card-actions">${userHasRole('administrador','admin') ? `<button class="btn bg2" onclick="approveDeletionRequest('${req.id}')">Aprobar</button><button class="btn bgh" onclick="rejectDeletionRequest('${req.id}')">Rechazar</button>` : ''}</div></div>`;
  }).join('');
}

function resetNodeDetailForm() {
  editingNodeDetailId = null;
  const title = document.getElementById('node-detail-form-title');
  if (title) title.textContent = 'Agregar detalle';
  const client = document.getElementById('node-detail-client');
  if (client) client.value = '';
  const phone = document.getElementById('node-detail-phone');
  if (phone) phone.value = '';
  document.getElementById('node-detail-text').value = '';
  const loc = document.getElementById('node-detail-location');
  if (loc) loc.value = '';
  const category = document.getElementById('node-detail-category');
  if (category) category.value = '';
  updateNodeDetailRequirements();
  document.getElementById('node-detail-type').value = 'comunidad';
  document.getElementById('node-detail-priority').value = 'baja';
  const btn = document.getElementById('node-detail-save-btn');
  if (btn) btn.textContent = 'Guardar detalle';
}

function renderNodeDetailCategoryOptions(selected = '') {
  const select = document.getElementById('node-detail-category');
  if (!select) return;
  const options = detailCategoriesForKind(nodeDetailKind);
  select.innerHTML = `<option value="">-- Selecciona una categoría --</option>${options.map(([id,label]) => `<option value="${nodeEscape(id)}">${nodeEscape(label)}</option>`).join('')}`;
  select.value = options.some(([id]) => id === selected) ? selected : '';
  updateNodeDetailRequirements();
}

function selectNodeDetailKind(kind) {
  nodeDetailKind = kind === 'network' ? 'network' : 'physical';
  ['physical','network'].forEach(value => document.getElementById(`node-detail-kind-${value}`)?.classList.toggle('is-active',value === nodeDetailKind));
  renderNodeDetailCategoryOptions(document.getElementById('node-detail-category')?.value || '');
  renderNodeDetailList();
}

function refreshNodeNetworkDetailViews() {
  renderNodeDetailList();
  renderNodos();
}

function ensureNodeDetailViewControls() {
  let trigger = document.getElementById('node-detail-add-trigger');
  const listSection = document.getElementById('node-detail-list')?.closest('section');
  const heading = listSection?.querySelector(':scope > h3');
  if (!trigger && listSection && heading) {
    const bar = document.createElement('div');
    bar.className = 'detail-list-heading';
    trigger = document.createElement('button');
    trigger.id = 'node-detail-add-trigger';
    trigger.type = 'button';
    trigger.className = 'btn detail-add-trigger';
    trigger.onclick = toggleNodeDetailForm;
    heading.before(bar);
    bar.append(heading, trigger);
  }
  if (!document.getElementById('node-detail-form-cancel')) {
    const formTitle = document.getElementById('node-detail-form-title');
    const cancel = document.createElement('button');
    cancel.id = 'node-detail-form-cancel';
    cancel.type = 'button';
    cancel.className = 'btn detail-form-cancel';
    cancel.textContent = 'Volver a detalles';
    cancel.onclick = cancelNodeDetailEditing;
    formTitle?.insertAdjacentElement('afterend', cancel);
  }
  return trigger;
}

function setNodeDetailFormVisible(visible, focusForm = false) {
  const modal = document.getElementById('node-detail-mo');
  const trigger = ensureNodeDetailViewControls();
  if (!modal) return;
  modal.classList.toggle('detail-view-only', !visible);
  modal.classList.toggle('detail-form-visible', visible);
  if (trigger) {
    trigger.textContent = 'Agregar detalle';
    trigger.setAttribute('aria-expanded', visible ? 'true' : 'false');
  }
  if (visible && focusForm) {
    setTimeout(() => document.getElementById('node-detail-category')?.focus(), 100);
  }
}

function toggleNodeDetailForm() {
  const modal = document.getElementById('node-detail-mo');
  const opening = !!modal?.classList.contains('detail-view-only');
  if (opening) {
    nodeDetailEditReturnId = '';
    nodeDetailListScrollTop = document.querySelector('#node-detail-mo>.md>.modal-grid')?.scrollTop || 0;
  }
  resetNodeDetailForm();
  setNodeDetailFormVisible(opening, opening);
}

function cancelNodeDetailEditing() {
  resetNodeDetailForm();
  setNodeDetailFormVisible(false);
  const scroller = document.querySelector('#node-detail-mo>.md>.modal-grid');
  requestAnimationFrame(() => { if (scroller) scroller.scrollTop = nodeDetailListScrollTop; });
  const returnId = nodeDetailEditReturnId;
  nodeDetailEditReturnId = '';
  if (returnId) setTimeout(() => openNodeDetailView(returnId), 30);
}

function setupNodeDetailEscapeNavigation() {
  const modal = document.getElementById('node-detail-mo');
  if (!modal || modal.dataset.escapeNavigation === '1') return;
  modal.dataset.escapeNavigation = '1';
  modal.addEventListener('netops:before-modal-close', event => {
    if (!modal.classList.contains('detail-form-visible')) return;
    event.preventDefault();
    cancelNodeDetailEditing();
  });
}

function openNodeDetails(id, focusAdd = false) {
  if (!document.getElementById('node-detail-phone')) document.getElementById('node-detail-client')?.closest('.fi')?.insertAdjacentHTML('afterend', '<div class="fi"><label>Numero telefonico <span class="optional-label">Opcional</span></label><input id="node-detail-phone" type="tel" placeholder="Numero de telefono (opcional)"></div>');
  const node = (state.nodes || []).find(item => item.id === id && !item.deletedAt); if (!node) return;
  const detailField = document.getElementById('node-detail-text')?.closest('.fi');
  if (detailField && !document.getElementById('node-detail-category')) {
    detailField.insertAdjacentHTML('beforebegin', '<div class="fi wo-category-field"><label>Categoría</label><select id="node-detail-category" required onchange="updateNodeDetailRequirements()"></select></div>');
  }
  renderNodeDetailCategoryOptions();
  currentDetailNodeId = id;
  const st = getEntityPriorityStatus('node', id);
  const links = document.getElementById('node-detail-links');
  if (links) links.textContent = getNodeRelationLabel(id);
  document.getElementById('node-detail-title').textContent = `Detalles · ${getNodeLabel(node)}`;
  document.getElementById('node-detail-sub').textContent = `${getZoneLabel(node.zone)} · Estado por prioridad: ${st.label}`;
  resetNodeDetailForm();
  renderNodeDetailList(); OM('node-detail-mo');
  setNodeDetailFormVisible(focusAdd, focusAdd);
}

async function saveNodeDetail() {
  const node = (state.nodes || []).find(item => item.id === currentDetailNodeId && !item.deletedAt); if (!node) return;
  const text = document.getElementById('node-detail-text').value.trim();
  const category = document.getElementById('node-detail-category')?.value || '';
  if (!category) { notify('Selecciona la categoria.', 'err'); return; }
  if (category !== 'antena_desconectada' && !text) { notify('Escribe el detalle.', 'err'); return; }
  const detailLocation = parseOptionalLocation(document.getElementById('node-detail-location')?.value);
  const linkedEquipment = getNodeLinkedEquipment(node.id)[0] || null;
  const payload = { clientName: document.getElementById('node-detail-client')?.value.trim() || '', clientPhone: document.getElementById('node-detail-phone')?.value.trim() || '', category, detailKind:nodeDetailKind, title: text || detailCategoryLabel(category), description: text, detailLocation: detailLocation.location, lat: detailLocation.lat || '', lng: detailLocation.lng || '', equipmentId: linkedEquipment?.id || '', equipmentName: linkedEquipment?.name || '', visitType: 'comunidad', priority: document.getElementById('node-detail-priority').value, updatedAt:new Date().toISOString() };
  if (editingNodeDetailId) {
    const d = (state.workOrders || []).find(x => x.id === editingNodeDetailId && !x.deletedAt);
    if (!d) return;
    Object.assign(d, payload);
    setUpdatedAudit(d, 'modificó detalle de nodo');
    notify('Detalle actualizado.');
  } else {
    const newDetail = { id: gid('wo'), nodeId: node.id, nodeCode: node.nodeCode, nodeName: getNodeLabel(node), town: node.town, ...payload, region: node.zone, status:'pendiente', createdAt:new Date().toISOString() };
    newDetail.folio = getWorkOrderFolio(newDetail);
    setCreatedAudit(newDetail, 'agregó detalle de nodo');
    state.workOrders.push(newDetail);
    notify('Detalle agregado.');
  }
  const savedDetail = editingNodeDetailId
    ? await saveRecord('workOrders', (state.workOrders || []).find(x => x.id === editingNodeDetailId))
    : await saveRecord('workOrders', state.workOrders[state.workOrders.length - 1]);
  if (!savedDetail) return;
  resetNodeDetailForm();
  nodeDetailEditReturnId = '';
  setNodeDetailFormVisible(false);
  renderNodeDetailList(); renderNodos();
}

function editNodeDetail(id, fromReadView = false) {
  const d = (state.workOrders || []).find(x => x.id === id && !x.deletedAt); if (!d) return;
  nodeDetailListScrollTop = document.querySelector('#node-detail-mo>.md>.modal-grid')?.scrollTop || nodeDetailListScrollTop;
  if (!fromReadView) nodeDetailEditReturnId = '';
  setNodeDetailFormVisible(true);
  editingNodeDetailId = id;
  selectNodeDetailKind(d.detailKind === 'network' ? 'network' : 'physical');
  const title = document.getElementById('node-detail-form-title');
  if (title) title.textContent = 'Editar detalle';
  const client = document.getElementById('node-detail-client');
  if (client) client.value = d.clientName || '';
  const phone = document.getElementById('node-detail-phone');
  if (phone) phone.value = d.clientPhone || d.phone || '';
  renderNodeDetailCategoryOptions(d.category || 'otro');
  const category = document.getElementById('node-detail-category');
  if (category) category.value = d.category || 'otro';
  updateNodeDetailRequirements();
  document.getElementById('node-detail-text').value = d.title || d.description || '';
  const loc = document.getElementById('node-detail-location');
  if (loc) loc.value = d.detailLocation || '';
  document.getElementById('node-detail-type').value = d.visitType || 'comunidad';
  document.getElementById('node-detail-priority').value = d.priority || 'media';
  const btn = document.getElementById('node-detail-save-btn');
  if (btn) btn.textContent = 'Actualizar detalle';
  document.getElementById('node-detail-text')?.focus();
}

async function markNodeDetailDone(id) {
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
      setUpdatedAudit(d, completion.withInformation ? 'completó detalle de pueblo con información' : 'marcó listo detalle de pueblo');
      const saved = await saveRecordWithAudit('workOrders',d,auditStart);
      if (!saved) return false;
      renderNodeDetailList(); renderNodos();
      return true;
    });
    return;
  }
  const auditStart=Array.isArray(state.auditLog)?state.auditLog.length:0;
  if (d.status === 'completada') { d.status='pendiente'; d.completedAt=''; setUpdatedAudit(d, 'reabrió detalle de nodo'); }
  else { d.status='completada'; d.completedAt=new Date().toISOString(); setUpdatedAudit(d, 'marcó listo detalle de nodo'); }
  await saveRecordWithAudit('workOrders',d,auditStart); renderNodeDetailList(); renderNodos();
}

function updateNodeDetailRequirements() {
  const category = document.getElementById('node-detail-category')?.value || '';
  const textarea = document.getElementById('node-detail-text');
  const field = textarea?.closest('.fi');
  const optional = nodeDetailKind === 'physical' && category === 'antena_desconectada';
  if (!textarea || !field) return;
  textarea.required = !optional;
  field.hidden = optional;
  if (optional) textarea.value = '';
}

async function deleteNodeDetail(id) {
  const d=(state.workOrders||[]).find(x=>x.id===id && !x.deletedAt); if(!d)return;
  const label = d.title || d.description || 'detalle';
  await handleProtectedDelete({
    targetType:'detail',
    targetId:id,
    targetName:label,
    applyDelete:() => { setDeletedAudit(d, 'eliminó detalle de nodo'); },
    refresh:() => { renderNodeDetailList(); renderNodos(); renderDeletionRequests(); }
  });
}
function ensureNodeDetailReadModal() {
  if (document.getElementById('node-detail-read-mo')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="mo detail-readonly-mo" id="node-detail-read-mo">
      <div class="md detail-readonly-card">
        <div class="modal-head"><div><h2 id="node-detail-read-title">Detalle de orden</h2><p>Información completa del detalle registrado.</p></div><button class="btn bgh" onclick="CM('node-detail-read-mo')">Cerrar</button></div>
        <div class="detail-readonly-body" id="node-detail-read-body"></div>
      </div>
    </div>`);
}

async function openNodeDetailView(id) {
  let d = (state.workOrders || []).find(item => item.id === id && !item.deletedAt);
  if (!d) return;
  await markSharedDetailInReviewOnOpen(d,'refreshNodeNetworkDetailViews');
  d = (state.workOrders || []).find(item => item.id === id && !item.deletedAt) || d;
  ensureNodeDetailReadModal();
  const node = (state.nodes || []).find(item => item.id === d.nodeId && !item.deletedAt);
  const location = getLocationDisplay(d.detailLocation || '');
  const body = document.getElementById('node-detail-read-body');
  document.getElementById('node-detail-read-title').textContent = `Orden ${getWorkOrderFolio(d)}`;
  body.innerHTML = `
    <div class="detail-readonly-folio"><span>Número de orden</span><strong>${nodeEscape(getWorkOrderFolio(d))}</strong><em class="${d.status === 'completada' ? 'is-done' : ''}">${nodeEscape(sharedNetworkDetailStatus(d).label)}</em></div>
    <div class="detail-readonly-grid">
      <div><span>Cliente</span><strong>${nodeEscape(d.clientName || 'Sin nombre')}</strong></div>
      <div><span>Teléfono</span><strong>${nodeEscape(d.clientPhone || d.phone || 'Sin teléfono')}</strong></div>
      <div><span>Categoría</span><strong>${nodeEscape(detailCategoryLabel(d.category))}</strong></div>
      <div><span>Tipo de detalle</span><strong>${d.detailKind === 'network' ? 'Detalle de red' : 'Detalle físico'}</strong></div>
      <div><span>Prioridad</span><strong>${nodeEscape(pl(d.priority || 'media'))}</strong></div>
      <div><span>Tipo de trabajo</span><strong>${nodeEscape(vl(d.visitType || 'comunidad'))}</strong></div>
      <div><span>Zona</span><strong>${nodeEscape(getZoneLabel(d.region || node?.zone) || 'Sin zona')}</strong></div>
      <div><span>Pueblo</span><strong>${nodeEscape(node ? getNodeLabel(node) : (d.nodeName || d.town || 'Sin pueblo'))}</strong></div>
      <div><span>Fecha de registro</span><strong>${nodeEscape(d.createdAt ? new Date(d.createdAt).toLocaleString('es-MX') : 'Sin fecha')}</strong></div>
      ${d.reviewOpenedAt ? `<div><span>Abierta para revisión</span><strong>${nodeEscape(sharedDetailReviewOpenedSummary(d))}</strong></div>` : ''}
      <div class="detail-readonly-wide"><span>Detalle</span><strong>${nodeEscape(getWorkOrderRequestedText(d, 'Sin descripción'))}</strong></div>
      <div class="detail-readonly-wide"><span>Ubicación</span><strong>${nodeEscape(location.label || 'Sin ubicación')}</strong>${location.url ? `<a href="${nodeEscape(location.url)}" target="_blank" rel="noopener">Abrir Maps</a>` : ''}</div>
    </div>
    ${d.status === 'completada' ? renderAdminTechReport(d) : ''}
    ${renderAuditMeta(d, nodeEscape)}
    <div class="detail-readonly-actions"><button class="btn bgh" onclick="CM('node-detail-read-mo')">Cerrar</button><button class="btn bc" onclick="editNodeDetailFromView('${nodeEscape(d.id)}')">Editar detalle</button></div>`;
  OM('node-detail-read-mo');
}

function editNodeDetailFromView(id) {
  nodeDetailEditReturnId = id;
  nodeDetailListScrollTop = document.querySelector('#node-detail-mo>.md>.modal-grid')?.scrollTop || nodeDetailListScrollTop;
  CM('node-detail-read-mo');
  editNodeDetail(id, true);
}

function toggleNodeCompletedDetails() {
  const list = document.getElementById('node-completed-details');
  const button = document.getElementById('node-completed-toggle');
  if (!list || !button) return;
  const show = list.hidden;
  list.hidden = !show;
  button.textContent = show ? 'Ocultar completados' : `Ver completados (${button.dataset.count || '0'})`;
  button.setAttribute('aria-expanded', show ? 'true' : 'false');
}

function renderNodeDetailList() {
  const wrap = document.getElementById('node-detail-list'); if (!wrap) return;
  const details = (state.workOrders || []).filter(d => !d.deletedAt && d.nodeId === currentDetailNodeId && (d.detailKind === 'network' ? 'network' : 'physical') === nodeDetailKind).sort(comparePriority);
  if (!details.length) { wrap.innerHTML = '<div class="empty-state">Sin detalles registrados.</div>'; return; }
  const renderDetail = d => {
    const done = d.status === 'completada';
    const detailStatus = sharedNetworkDetailStatus(d);
    const req = findDeletionRequest('detail', d.id);
    const loc = getLocationDisplay(d.detailLocation || '');
    const locationHtml = loc.url
      ? `<a class="order-location-link" href="${nodeEscape(loc.url)}" target="_blank" rel="noopener">Abrir Maps</a><div class="order-location-muted">${nodeEscape(loc.label)}</div>`
      : `<div class="order-location-muted ${loc.hasLocation ? '' : 'no-location'}">${nodeEscape(loc.label || 'Sin ubicacion')}</div>`;
    return `<div class="detail-item ${done ? 'done' : ''}">
      <div class="detail-card-folio"><span>Número de orden</span><strong>${nodeEscape(getWorkOrderFolio(d))}</strong></div>
      ${d.clientName ? `<div class="detail-title detail-client-name">${nodeEscape(d.clientName)}</div>` : ''}
      <div class="detail-title detail-category-name">Categoria: ${nodeEscape(detailCategoryLabel(d.category))}</div>
      <div class="detail-title detail-description">${nodeEscape(getWorkOrderRequestedText(d, detailCategoryLabel(d.category)))}</div>
      <div class="detail-meta"><span>${d.detailKind === 'network' ? 'Red' : 'Físico'}</span><span>${nodeEscape(pl(d.priority || 'media'))}</span><span>${nodeEscape(vl(d.visitType || 'comunidad'))}</span><span>${nodeEscape(detailStatus.label)}</span>${req ? `<span class="badge warning">${req.status === 'code_ready' ? 'Código listo' : 'Solicitud enviada'}</span>` : ''}</div>
      <div class="detail-location">${locationHtml}</div>
      ${renderAuditMeta(d, nodeEscape)}
      <div class="card-actions">
        <button class="btn detail-card-action detail-view-action" title="Ver detalle" aria-label="Ver detalle" onclick="openNodeDetailView('${d.id}')"><svg class="detail-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="3"/></svg></button>
        <button class="btn bgh detail-card-action detail-edit-action" title="Editar" aria-label="Editar" onclick="editNodeDetail('${d.id}')"><svg class="detail-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4.2-1 10.6-10.6a2.4 2.4 0 0 0-3.4-3.4L4.8 15.6 4 20Z"/><path d="m14 6.4 3.4 3.4"/></svg></button>
        ${d.detailKind === 'network' ? `<button class="btn bgh detail-card-action detail-network-action" title="Acciones de red" aria-label="Acciones de red" onclick="openSharedNetworkDetailActions('${d.id}','refreshNodeNetworkDetailViews')"><svg class="detail-action-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>` : `<button class="btn bg2 detail-card-action detail-complete-action" title="${done ? 'Reabrir' : 'Completar'}" aria-label="${done ? 'Reabrir' : 'Completar'}" onclick="markNodeDetailDone('${d.id}')">${done ? '<svg class="detail-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 1-2.3-5.7"/><path d="M20 4v7h-7"/></svg>' : '<svg class="detail-action-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16.5 8.5"/></svg>'}</button>`}
        <button class="btn br" title="Eliminar" aria-label="Eliminar" onclick="deleteNodeDetail('${d.id}')">${userHasRole('administrador','admin') ? 'Eliminar' : (req && req.status === 'code_ready' ? 'Ingresar código' : 'Solicitar eliminar')}</button>
      </div>
    </div>`;
  };
  const pending = details.filter(d => d.status !== 'completada');
  const completed = details.filter(d => d.status === 'completada');
  wrap.innerHTML = `${pending.map(renderDetail).join('')}${completed.length ? `<div class="detail-section-label"><strong>Completados</strong><button id="node-completed-toggle" class="btn detail-completed-toggle" data-count="${completed.length}" aria-expanded="false" onclick="toggleNodeCompletedDetails()">Ver completados (${completed.length})</button></div><div id="node-completed-details" class="completed-details-list-unified" hidden>${completed.map(renderDetail).join('')}</div>` : ''}`;
}

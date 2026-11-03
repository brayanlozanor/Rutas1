let editingNodeId = null;
let currentDetailNodeId = null;

function nodeEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
}

function initNodosPage() {
  if (!checkAuth()) return;
  loadDB().then(() => {
    initCommon();
    fillNodeZoneFilters();
    renderNodeSearchOptions();
    renderNodos();
    renderDeletionRequests();
    const openId = localStorage.getItem('netops_open_node_details');
    if (openId) { localStorage.removeItem('netops_open_node_details'); setTimeout(() => openNodeDetails(openId), 300); }
  });
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
  if (!list) return;
  list.innerHTML = (state.nodes || []).filter(n => !n.deletedAt).map(n => `<option value="${nodeEscape(getNodeLabel(n))}">${nodeEscape(getZoneLabel(n.zone))}</option>`).join('');
}

function openNodeModal() {
  resetNodeForm();
  OM('node-mo');
}

function resetNodeForm() {
  editingNodeId = null;
  document.getElementById('node-form-title').textContent = 'Registrar nodo';
  ['node-code','node-town','node-lat','node-lng','node-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('node-zone').value = '';
  document.getElementById('node-status').value = 'activo';
}

async function saveNode() {
  const payload = {
    nodeCode: document.getElementById('node-code').value.trim(),
    town: document.getElementById('node-town').value.trim(),
    zone: document.getElementById('node-zone').value,
    lat: safeFloat(document.getElementById('node-lat').value),
    lng: safeFloat(document.getElementById('node-lng').value),
    status: document.getElementById('node-status').value,
    notes: document.getElementById('node-notes').value.trim()
  };
  if (!payload.nodeCode || !payload.town || !payload.zone || isNaN(payload.lat) || isNaN(payload.lng)) {
    notify('Falta información: nodo, pueblo, zona y coordenadas son obligatorios.', 'err');
    return;
  }
  const duplicate = (state.nodes || []).find(node => !node.deletedAt && node.id !== editingNodeId && normalizeName(node.nodeCode) === normalizeName(payload.nodeCode));
  if (duplicate) {
    notify('Ya existe un nodo con ese código.', 'err');
    return;
  }
  if (editingNodeId) {
    const node = (state.nodes || []).find(item => item.id === editingNodeId);
    if (!node) return;
    Object.assign(node, payload, { updatedAt:new Date().toISOString() });
    notify('Nodo actualizado.');
  } else {
    state.nodes.push({ id: gid('nd'), createdAt:new Date().toISOString(), ...payload });
    notify('Nodo registrado correctamente.');
  }
  const ok = await saveDB();
  if (ok) notify(editingNodeId ? 'Nodo actualizado y sincronizado.' : 'Nodo registrado y sincronizado.');
  CM('node-mo');
  resetNodeForm();
  renderNodeSearchOptions();
  renderNodos();
}

function editNode(id) {
  const node = (state.nodes || []).find(item => item.id === id && !item.deletedAt);
  if (!node) return;
  editingNodeId = id;
  document.getElementById('node-form-title').textContent = 'Editar nodo';
  document.getElementById('node-code').value = node.nodeCode || '';
  document.getElementById('node-town').value = node.town || '';
  document.getElementById('node-zone').value = node.zone || '';
  document.getElementById('node-lat').value = node.lat ?? '';
  document.getElementById('node-lng').value = node.lng ?? '';
  document.getElementById('node-status').value = node.status || 'activo';
  document.getElementById('node-notes').value = node.notes || '';
  OM('node-mo');
}

function getNodeDeletionRequest(nodeId) {
  return (state.deletionRequests || []).find(req => req.nodeId === nodeId && !['completed','rejected'].includes(req.status));
}

async function createDeletionRequest(node) {
  const user = getCurrentUser();
  state.deletionRequests.push({
    id: gid('dr'),
    nodeId: node.id,
    nodeName: `${node.nodeCode} · ${node.town}`,
    requestedByUserId: user.id || '',
    requestedByName: user.name || user.username || 'Usuario',
    status: 'pending',
    createdAt: new Date().toISOString()
  });
  await saveDB();
  renderDeletionRequests();
}

async function deleteNode(id) {
  const node = (state.nodes || []).find(item => item.id === id && !item.deletedAt);
  if (!node) return;
  const request = getNodeDeletionRequest(id);
  if (userHasRole('administrador','admin')) {
    if (!confirm(`¿Eliminar el nodo ${node.nodeCode} · ${node.town}?`)) return;
    node.deletedAt = new Date().toISOString();
    if (request) {
      request.status = 'completed';
      request.resolvedAt = new Date().toISOString();
    }
    await saveDB();
    renderNodos();
    renderDeletionRequests();
    notify('Nodo eliminado.');
    return;
  }

  if (!request) {
    if (!confirm(`Se enviará solicitud de eliminación para ${node.nodeCode}. ¿Continuar?`)) return;
    await createDeletionRequest(node);
    notify('Solicitud enviada. Espera el código de autorización.');
    return;
  }

  if (request.status !== 'code_ready') {
    notify('La solicitud aún no tiene código de autorización.', 'err');
    return;
  }

  const code = prompt(`Ingresa el código de eliminación para ${node.nodeCode}`) || '';
  if (code.trim() !== String(request.code || '').trim()) {
    notify('Código incorrecto.', 'err');
    return;
  }
  node.deletedAt = new Date().toISOString();
  request.status = 'completed';
  request.resolvedAt = new Date().toISOString();
  await saveDB();
  renderNodos();
  renderDeletionRequests();
  notify('Nodo eliminado con autorización.');
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

function renderNodos() {
  const all = (state.nodes || []).filter(item => !item.deletedAt);
  const statuses = all.map(node => getEntityPriorityStatus('node', node.id));
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('node-total', all.length);
  set('node-critical', statuses.filter(s => s.key === 'critico').length);
  set('node-warning', statuses.filter(s => s.key === 'atencion').length);
  const wrap = document.getElementById('nodos-grid');
  if (!wrap) return;
  const nodes = filteredNodesList();
  if (!nodes.length) { wrap.innerHTML = '<div class="empty-state">No hay nodos para el filtro actual.</div>'; return; }
  wrap.innerHTML = `<div class="list-grid">${nodes.map(node => {
    const request = getNodeDeletionRequest(node.id);
    const st = getEntityPriorityStatus('node', node.id);
    const detailCount = getEntityOpenDetails('node', node.id).length;
    return `<article class="entity-card ${st.key}">
      <div class="entity-title"><div><h3>${nodeEscape(getNodeLabel(node))}</h3><div class="entity-sub">${nodeEscape(getZoneLabel(node.zone))}</div></div><span class="badge" style="background:${st.color}22;color:${st.color};border-color:${st.color}55">${st.label}</span></div>
      <div class="meta-list"><div class="meta-row"><span>Lat / Lng</span><strong>${nodeEscape(`${Number(node.lat).toFixed(6)}, ${Number(node.lng).toFixed(6)}`)}</strong></div><div class="meta-row"><span>Detalles pendientes</span><strong>${detailCount}</strong></div></div>
      ${node.notes ? `<div class="help-box" style="background:#f8fbff;border-color:#dbeafe;color:#37516f">${nodeEscape(node.notes)}</div>` : ''}
      ${request ? `<div class="delete-request"><strong>Solicitud:</strong> ${nodeEscape(request.status === 'code_ready' ? 'Código listo' : 'Pendiente')}<br><small>Solicitado por ${nodeEscape(request.requestedByName || 'usuario')}</small></div>` : ''}
      <div class="card-actions"><button class="btn bc" onclick="openNodeDetails('${node.id}')">Ver detalles</button><button class="btn bo2" onclick="openNodeDetails('${node.id}', true)">Agregar detalle</button><button class="btn bgh" onclick="editNode('${node.id}')">Editar</button><button class="btn br" onclick="deleteNode('${node.id}')">${userHasRole('administrador','admin') ? 'Eliminar' : (request && request.status === 'code_ready' ? 'Ingresar código' : 'Solicitar eliminación')}</button></div>
    </article>`;
  }).join('')}</div>`;
}
async function generateDeletionCode(id) {
  const req = (state.deletionRequests || []).find(item => item.id === id);
  if (!req) return;
  req.code = String(Math.floor(100000 + Math.random() * 900000));
  req.status = 'code_ready';
  req.updatedAt = new Date().toISOString();
  await saveDB();
  renderDeletionRequests();
  notify('Código generado.');
}

async function rejectDeletionRequest(id) {
  const req = (state.deletionRequests || []).find(item => item.id === id);
  if (!req) return;
  req.status = 'rejected';
  req.updatedAt = new Date().toISOString();
  await saveDB();
  renderDeletionRequests();
  renderNodos();
}

function renderDeletionRequests() {
  const wrap = document.getElementById('node-requests');
  const totalEl = document.getElementById('node-request-total');
  const pendingCount = (state.deletionRequests || []).filter(req => !['completed','rejected'].includes(req.status)).length;
  if (totalEl) totalEl.textContent = pendingCount;
  if (!wrap) return;
  const user = getCurrentUser();
  let requests = (state.deletionRequests || []).filter(req => !['completed','rejected'].includes(req.status));
  if (!userHasRole('administrador','admin')) {
    requests = requests.filter(req => req.requestedByUserId === user.id);
  }
  if (!requests.length) {
    wrap.innerHTML = '<div class="empty-state">No hay solicitudes pendientes.</div>';
    return;
  }
  wrap.innerHTML = requests.map(req => `
    <div class="delete-request">
      <div class="entity-title"><div><h3 style="font-size:16px">${nodeEscape(req.nodeName)}</h3><div class="entity-sub">Solicitó: ${nodeEscape(req.requestedByName || 'usuario')}</div></div><span class="badge warning">${req.status === 'code_ready' ? 'Código listo' : 'Pendiente'}</span></div>
      ${req.status === 'code_ready' ? `<div class="request-code">${nodeEscape(req.code)}</div>` : ''}
      <div class="card-actions">
        ${userHasRole('administrador','admin') && req.status !== 'code_ready' ? `<button class="btn bc" onclick="generateDeletionCode('${req.id}')">Generar código</button>` : ''}
        ${userHasRole('administrador','admin') ? `<button class="btn bgh" onclick="rejectDeletionRequest('${req.id}')">Rechazar</button>` : ''}
      </div>
    </div>`).join('');
}


function openNodeDetails(id, focusAdd = false) {
  const node = (state.nodes || []).find(item => item.id === id && !item.deletedAt); if (!node) return;
  currentDetailNodeId = id;
  const st = getEntityPriorityStatus('node', id);
  document.getElementById('node-detail-title').textContent = `Detalles · ${getNodeLabel(node)}`;
  document.getElementById('node-detail-sub').textContent = `${getZoneLabel(node.zone)} · Estado por prioridad: ${st.label}`;
  document.getElementById('node-detail-text').value = '';
  document.getElementById('node-detail-priority').value = 'media';
  renderNodeDetailList(); OM('node-detail-mo');
  if (focusAdd) setTimeout(() => document.getElementById('node-detail-text')?.focus(), 150);
}

function saveNodeDetail() {
  const node = (state.nodes || []).find(item => item.id === currentDetailNodeId && !item.deletedAt); if (!node) return;
  const text = document.getElementById('node-detail-text').value.trim(); if (!text) { notify('Escribe el detalle.', 'err'); return; }
  state.workOrders.push({ id: gid('wo'), nodeId: node.id, nodeCode: node.nodeCode, nodeName: getNodeLabel(node), town: node.town, title: text, description: text, visitType: document.getElementById('node-detail-type').value, priority: document.getElementById('node-detail-priority').value, region: node.zone, lat: node.lat, lng: node.lng, status:'pendiente', createdAt:new Date().toISOString() });
  document.getElementById('node-detail-text').value = ''; saveDB(); renderNodeDetailList(); renderNodos(); notify('Detalle agregado.');
}
function markNodeDetailDone(id) { const d=(state.workOrders||[]).find(x=>x.id===id); if(!d)return; d.status='completada'; d.completedAt=new Date().toISOString(); saveDB(); renderNodeDetailList(); renderNodos(); }
function deleteNodeDetail(id) { const d=(state.workOrders||[]).find(x=>x.id===id); if(!d)return; if(!confirm('¿Eliminar este detalle?'))return; d.deletedAt=new Date().toISOString(); saveDB(); renderNodeDetailList(); renderNodos(); }
function renderNodeDetailList() {
  const wrap = document.getElementById('node-detail-list'); if (!wrap) return;
  const details = (state.workOrders || []).filter(d => !d.deletedAt && d.nodeId === currentDetailNodeId).sort(comparePriority);
  if (!details.length) { wrap.innerHTML = '<div class="empty-state">Sin detalles registrados.</div>'; return; }
  wrap.innerHTML = details.map(d => `<div class="detail-item ${d.status === 'completada' ? 'done' : ''}"><div class="detail-title">${nodeEscape(d.title || d.description || 'Detalle')}</div><div class="detail-meta"><span>${nodeEscape(pl(d.priority || 'media'))}</span><span>${nodeEscape(vl(d.visitType || 'comunidad'))}</span><span>${d.status === 'completada' ? 'Completada' : 'Pendiente'}</span></div><div class="card-actions"><button class="btn bg2" onclick="markNodeDetailDone('${d.id}')">Listo</button><button class="btn br" onclick="deleteNodeDetail('${d.id}')">Eliminar</button></div></div>`).join('');
}

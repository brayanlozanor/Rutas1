function orderEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

let editingWOId = '';

function initOrdenesPage() {
  if (!checkAuth()) return;
  loadDB().then(() => {
    initCommon();
    fillOrderSelects();
    renderWOs();
  });
}

function fillOrderSelects() {
  const zone = document.getElementById('wo-zone');
  if (zone) zone.innerHTML = '<option value="">-- Selecciona zona --</option>' + REGS.map(r => `<option value="${r.id}">${r.n}</option>`).join('');
  renderNodeOptions();
}

function renderNodeOptions() {
  const list = document.getElementById('wo-node-options');
  if (!list) return;
  list.innerHTML = (state.nodes || [])
    .filter(n => !n.deletedAt)
    .map(n => `<option value="${orderEscape(getNodeLabel(n))}">${orderEscape(getZoneLabel(n.zone))}</option>`)
    .join('');
}

function findNodeFromInput() {
  const q = normalizeName(document.getElementById('wo-node').value);
  if (!q) return null;
  return (state.nodes || []).find(n => !n.deletedAt && (
    normalizeName(getNodeLabel(n)) === q ||
    normalizeName(n.nodeCode) === q ||
    normalizeName(n.town) === q
  )) || (state.nodes || []).find(n => !n.deletedAt && normalizeName(getNodeLabel(n)).includes(q));
}

function syncWOFromNode() {
  const n = findNodeFromInput();
  if (!n) return;
  document.getElementById('wo-node-id').value = n.id;
  document.getElementById('wo-node').value = getNodeLabel(n);
  document.getElementById('wo-town').value = n.town || '';
  document.getElementById('wo-zone').value = n.zone || '';
  const loc = document.getElementById('wo-location');
  if (!loc.value.trim()) loc.value = `${Number(n.lat).toFixed(6)}, ${Number(n.lng).toFixed(6)}`;
}

function getOrderEquipment(order) {
  if (!order?.equipmentId) return null;
  return (state.equipment || []).find(eq => eq.id === order.equipmentId) || null;
}

function getOrderNode(order) {
  if (order?.nodeId) {
    const byId = (state.nodes || []).find(node => node.id === order.nodeId);
    if (byId) return byId;
  }
  if (order?.nodeCode) {
    const clean = normalizeName(order.nodeCode);
    return (state.nodes || []).find(node =>
      normalizeName(node.nodeCode) === clean ||
      normalizeName(getNodeLabel(node)) === clean
    ) || null;
  }
  return null;
}

function getOrderTarget(order) {
  const eq = getOrderEquipment(order);
  if (eq) {
    return {
      kind: 'Antena',
      name: eq.name || order.equipmentName || 'Antena sin nombre',
      sub: [eq.ip, getZoneLabel(eq.region || order.region)].filter(Boolean).join(' - '),
      zone: eq.region || order.region
    };
  }

  const node = getOrderNode(order);
  if (node) {
    return {
      kind: 'Nodo',
      name: getNodeLabel(node) || order.nodeName || order.nodeCode || 'Nodo sin nombre',
      sub: [node.town, getZoneLabel(node.zone || order.region)].filter(Boolean).join(' - '),
      zone: node.zone || order.region
    };
  }

  return {
    kind: order.equipmentName ? 'Antena' : 'Nodo',
    name: order.equipmentName || order.nodeName || order.nodeCode || 'Sin antena/nodo',
    sub: [order.town, getZoneLabel(order.region)].filter(Boolean).join(' - '),
    zone: order.region
  };
}

function getOrderSearchText(order) {
  const target = getOrderTarget(order);
  return [
    order.clientName,
    target.kind,
    target.name,
    target.sub,
    order.nodeName,
    order.nodeCode,
    order.equipmentName,
    order.town,
    order.description,
    order.title,
    getZoneLabel(order.region)
  ].join(' ');
}

function openWO(id = '') {
  editingWOId = id;
  clearWOForm();
  if (id) {
    const w = (state.workOrders || []).find(x => x.id === id);
    if (w) {
      const target = getOrderTarget(w);
      document.getElementById('wo-modal-title').textContent = 'Editar detalle';
      document.getElementById('wo-id').value = w.id;
      document.getElementById('wo-client').value = w.clientName || '';
      document.getElementById('wo-location').value = w.detailLocation || w.location || '';
      document.getElementById('wo-detail').value = w.description || w.title || '';
      document.getElementById('wo-node-id').value = w.nodeId || '';
      document.getElementById('wo-node').value = w.nodeName || w.nodeCode || target.name || '';
      document.getElementById('wo-town').value = w.town || '';
      document.getElementById('wo-zone').value = w.region || target.zone || '';
      document.getElementById('wo-type').value = w.visitType || 'comunidad';
      document.getElementById('wo-priority').value = w.priority || 'media';
    }
  }
  OM('wo-mo');
}

function clearWOForm() {
  document.getElementById('wo-modal-title').textContent = 'Agregar detalle manual';
  ['wo-id', 'wo-node-id', 'wo-client', 'wo-location', 'wo-detail', 'wo-node', 'wo-town'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('wo-zone').value = '';
  document.getElementById('wo-type').value = 'comunidad';
  document.getElementById('wo-priority').value = 'media';
}

async function saveWO() {
  const node = findNodeFromInput();
  const parsed = parseOptionalLocation(document.getElementById('wo-location').value);
  const payload = {
    clientName: document.getElementById('wo-client').value.trim(),
    detailLocation: document.getElementById('wo-location').value.trim(),
    title: document.getElementById('wo-detail').value.trim(),
    description: document.getElementById('wo-detail').value.trim(),
    nodeId: node?.id || document.getElementById('wo-node-id').value,
    nodeCode: node?.nodeCode || document.getElementById('wo-node').value.trim(),
    nodeName: node ? getNodeLabel(node) : document.getElementById('wo-node').value.trim(),
    town: document.getElementById('wo-town').value.trim(),
    region: document.getElementById('wo-zone').value,
    visitType: document.getElementById('wo-type').value,
    priority: document.getElementById('wo-priority').value,
    lat: parsed.valid ? parsed.lat : (node?.lat || ''),
    lng: parsed.valid ? parsed.lng : (node?.lng || ''),
    status: 'pendiente'
  };

  if (!payload.clientName || !payload.title || !payload.nodeName || !payload.region) {
    notify('Completa cliente, detalle, nodo y zona.', 'err');
    return;
  }

  if (editingWOId) {
    const w = (state.workOrders || []).find(x => x.id === editingWOId);
    if (!w) return;
    Object.assign(w, payload, { updatedAt: new Date().toISOString() });
    notify('Detalle actualizado.');
  } else {
    state.workOrders.push({ id: gid('wo'), createdAt: new Date().toISOString(), ...payload });
    notify('Detalle guardado.');
  }

  const ok = await saveDB();
  if (ok) notify('Detalle sincronizado.');
  CM('wo-mo');
  renderWOs();
}

function orderFilters() {
  return {
    q: normalizeName(document.getElementById('wo-search')?.value || ''),
    status: document.getElementById('wo-status-filter')?.value || 'all',
    priority: document.getElementById('wo-priority-filter')?.value || 'all'
  };
}

function filteredOrders() {
  const f = orderFilters();
  return (state.workOrders || [])
    .filter(w => !w.deletedAt)
    .filter(w => {
      if (f.status !== 'all' && (w.status || 'pendiente') !== f.status) return false;
      if (f.priority !== 'all' && (w.priority || 'media') !== f.priority) return false;
      if (!f.q) return true;
      return normalizeName(getOrderSearchText(w)).includes(f.q);
    })
    .sort(comparePriority);
}

function renderOrderStats() {
  const all = (state.workOrders || []).filter(w => !w.deletedAt);
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  set('wo-total', all.length);
  set('wo-pending', all.filter(w => isOpenOrder(w)).length);
  set('wo-critical', all.filter(w => isOpenOrder(w) && (w.priority === 'muy_alta' || w.priority === 'alta')).length);
  set('wo-done', all.filter(w => w.status === 'completada').length);
}

async function markWODone(id) {
  const w = (state.workOrders || []).find(x => x.id === id);
  if (!w) return;
  w.status = 'completada';
  w.completedAt = new Date().toISOString();
  await saveDB();
  renderWOs();
}

async function deleteWO(id) {
  const w = (state.workOrders || []).find(x => x.id === id);
  if (!w) return;
  if (!confirm('Eliminar este detalle?')) return;
  w.deletedAt = new Date().toISOString();
  await saveDB();
  renderWOs();
}

function renderWOs() {
  renderOrderStats();
  const wrap = document.getElementById('orders-table');
  if (!wrap) return;

  const rows = filteredOrders();
  if (!rows.length) {
    wrap.innerHTML = '<div class="empty-state">No hay detalles con esos filtros.</div>';
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrap clean">
      <table class="table order-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Antena / Nodo / Zona</th>
            <th>Detalle</th>
            <th>Tipo</th>
            <th>Prioridad</th>
            <th>Estado</th>
            <th>Accion</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(w => {
            const target = getOrderTarget(w);
            return `
              <tr>
                <td><strong>${orderEscape(w.clientName || '--')}</strong><br><small>${orderEscape(w.detailLocation || '')}</small></td>
                <td>
                  <span class="badge zone">${orderEscape(target.kind)}</span>
                  <strong class="order-target-name">${orderEscape(target.name)}</strong>
                  <br><small>${orderEscape(target.sub || getZoneLabel(w.region) || '--')}</small>
                </td>
                <td>${orderEscape(w.description || w.title || '')}</td>
                <td>${orderEscape(vl(w.visitType || 'comunidad'))}</td>
                <td><span class="badge" style="background:${pc(w.priority)}22;color:${pc(w.priority)};border-color:${pc(w.priority)}55">${orderEscape(pl(w.priority || 'media'))}</span></td>
                <td>${w.status === 'completada' ? 'Completada' : 'Pendiente'}</td>
                <td>
                  <div class="card-actions">
                    <button class="btn bc" onclick="openWO('${w.id}')">Editar</button>
                    <button class="btn bg2" onclick="markWODone('${w.id}')">OK</button>
                    <button class="btn br" onclick="deleteWO('${w.id}')">X</button>
                  </div>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

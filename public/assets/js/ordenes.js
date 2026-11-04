
function initOrderFontScale() {}
function setOrderFontScale() {}

function getTimelineStepClass(action = '', label = '') {
  const text = (action + ' ' + label).toLowerCase();
  if (text.includes('cread') || text.includes('nuev') || action === 'created') return 'step-kind-created';
  if (text.includes('revis') || text.includes('aten') || action === 'en_revision' || action === 'attending') return 'step-kind-attending';
  if (text.includes('retom') || text.includes('reasign') || action === 'retaken') return 'step-kind-retaken';
  if (text.includes('resuelt') || text.includes('soluc') || text.includes('respond') || action === 'resuelto_soporte' || action === 'resolved') return 'step-kind-resolved';
  if (text.includes('devuelt') || action === 'devuelto_soporte' || action === 'returned') return 'step-kind-returned';
  if (text.includes('concl') || text.includes('finaliz') || text.includes('conform') || action === 'completada' || action === 'done') return 'step-kind-completed';
  if (text.includes('reab') || action === 'reopened') return 'step-kind-reopened';
  return 'step-kind-created';
}

function renderOrderFollowUpTimeline(followUps = []) {
  if (!Array.isArray(followUps) || !followUps.length) return '';
  return `
    <section class="order-report-block">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <small style="font-weight:900;text-transform:uppercase;letter-spacing:.05em;color:#475569;font-size:11px;">Historial de seguimiento cronológico (${followUps.length} ${followUps.length === 1 ? 'paso' : 'pasos'})</small>
      </div>
      <div class="order-follow-up-timeline">
        ${followUps.slice().reverse().map(step => {
          const stepClass = getTimelineStepClass(step.action || '', step.label || '');
          const stepTime = step.at ? new Date(step.at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : 'Fecha no registrada';
          const actorChip = step.byName ? renderUserColorChip(step.byName, step.byId || step.byUserId) : '';
          return `
            <div class="timeline-step-card ${stepClass}">
              <div class="timeline-step-head">
                <div class="timeline-step-left">
                  <span class="timeline-action-badge">${orderEscape(step.label || step.action || 'Actualización')}</span>
                  ${actorChip}
                </div>
                <span class="timeline-step-time">${orderEscape(stepTime)}</span>
              </div>
              ${step.note ? `<div class="timeline-step-note">${orderEscape(step.note)}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

// scripts/test-network-order-action-requirements.cjs: ${w.detailKind === 'network' ? `<button class="btn order-workflow-action"` : ''}
function orderEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function orderActionIcon(type) {
  const icons = {
    view: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.8 4 4-.8L18.5 7.9l-3.2-3.2L4 16ZM13.8 6.2l3.2 3.2"/></svg>',
    reopen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 1-2.3-5.7"/><path d="M20 4v7h-7"/></svg>',
    actions: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
    delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7M14 10v7"/></svg>'
  };
  return icons[type] || '';
}

function orderReportIcon(type) {
  const icons = {
    clipboard: '<svg viewBox="0 0 24 24"><path d="M9 5V3h6v2M7 5h10v16H7z"/><path d="M10 10h4M10 14h4M10 18h4"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3"/><path d="M5 20c0-4 2.5-7 7-7s7 3 7 7"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M7 3l3 4-2 2c1.5 3 3.5 5 6.5 6.5l2-2 4 3c-1 3-3 4-5 3-6-2-10-6-12-12-1-2 0-4 3.5-4.5Z"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Z"/><circle cx="12" cy="9" r="2"/></svg>',
    target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
    check: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="m8 12 3 3 5-6"/></svg>',
    calendar: '<svg viewBox="0 0 24 24"><path d="M5 5h14v15H5zM8 3v4M16 3v4M5 9h14"/></svg>',
    work: '<svg viewBox="0 0 24 24"><path d="M4 8h16v11H4zM9 8V5h6v3M4 12h16"/></svg>',
    flag: '<svg viewBox="0 0 24 24"><path d="M6 21V4M6 5h11l-2 4 2 4H6"/></svg>',
    tag: '<svg viewBox="0 0 24 24"><path d="m3 12 9-9h7v7l-9 9z"/><circle cx="16" cy="6" r="1"/></svg>'
  };
  return icons[type] || icons.clipboard;
}

function orderReportField(icon, label, value, options = {}) {
  const content = options.raw ? value : orderEscape(value);
  return `<article class="order-report-field ${options.className || ''}"><span class="order-report-field-icon">${orderReportIcon(icon)}</span><div><small>${orderEscape(label)}</small><strong>${content}</strong></div></article>`;
}

let editingWOId = '';
let copyingWOFromId = '';
let activeOrderDetailKind = new URLSearchParams(window.location.search).get('detailKind') === 'network' ? 'network' : 'physical';
const ORDER_CATEGORIES_BY_KIND = {
  physical: [
    ['instalacion', 'Nueva instalación'],
    ['alineacion_antena', 'Alineación de antena'],
    ['antena_desconectada', 'Antena desconectada'],
    ['antena_quemada', 'Equipo quemado'],
    ['antena_inalambrica', 'Antena inalámbrica'],
    ['reubicacion_antena', 'Reubicación de antena'],
    ['resurtir_antena', 'Resurtir antena'],
    ['solicitud_respaldo', 'Solicitud de respaldo'],
    ['otro', 'Otro']
  ],
  network: [
    ['bajo_rendimiento', 'Lentitud de la red'],
    ['intermitencia', 'Intermitencia'],
    ['fallo_fichas', 'Aislado'],
    ['portal_cautivo', 'No abre portal'],
    ['cobertura_reducida', 'No tiene el mismo alcance'],
    ['otro_red', 'Otro de red']
  ],
  support_to_attention: [
    ['preguntar_luz', 'Preguntar si hay luz en comunidad'],
    ['verificar_cliente', 'Contactar cliente por falla general'],
    ['confirmar_servicio', 'Validar calidad con clientes clave'],
    ['reporte_zona', 'Aviso de afectación o mantenimiento'],
    ['otro_soporte', 'Otro requerimiento para Atención']
  ]
};
const ORDER_CATEGORIES = [...ORDER_CATEGORIES_BY_KIND.physical,...ORDER_CATEGORIES_BY_KIND.network,...ORDER_CATEGORIES_BY_KIND.support_to_attention];
const PHYSICAL_STATS_EXCLUDED_CATEGORIES = new Set(['instalacion','nueva_instalacion','instalacion_nueva','reubicacion_antena','reubicacion','resurtir_antena','surtir_antena','solicitud_respaldo','solicitud_de_respaldo']);
let woEvidencePhotos = [];

const activeOrderFilters = {
  status: new Set(),
  type: new Set(),
  zone: new Set(),
  priority: new Set(),
  category: new Set(),
  creator: new Set()
};
let orderCurrentPage = 1;
let orderRowsPerPage = 15;
let orderLoadSequence = 0;
let orderNodeLookupSequence = 0;
let orderEquipmentLookupSequence = 0;
const ORDER_REVIEW_DECISION_KEY = 'netops_pending_order_review_decision';
let pendingOrderReviewDecisionId = '';
let currentOrderReportId = '';
let pendingOrderReviewReload = false;
let pendingOrderReviewDestination = '';
let requestedOrderCopyId = new URLSearchParams(window.location.search).get('copyOrderId') || '';

function orderRemoteParams(page = orderCurrentPage) {
  const filters = orderFilters();
  const params = {
    windowed:'1',
    offset:Math.max(0,(page - 1) * orderRowsPerPage),
    limit:orderRowsPerPage,
    q:document.getElementById('wo-search')?.value.trim() || '',
    sort:filters.sort,
    detailKind:activeOrderDetailKind,
    includeMapCatalog:(state.nodes || []).length ? '' : '1'
  };
  if (requestedOrderCopyId) params.id = requestedOrderCopyId;
  ['status','type','zone','priority','category','creator'].forEach(key => {
    if (filters[key]?.size) params[key] = [...filters[key]].join(',');
  });
  return params;
}

window.netopsGetDataPartParams = part => part === 'operations' ? orderRemoteParams() : null;

async function loadOrderPage({ scroll = false } = {}) {
  const sequence = ++orderLoadSequence;
  const previousTableScrollLeft = document.querySelector('.orders-table-card .table-wrap')?.scrollLeft || 0;
  const loadingOperation = beginLoadingOperation('Cargando ordenes','Consultando solo los registros visibles.',180);
  try {
    const params = orderRemoteParams();
    const data = await fetchDataPage('operations',params);
    if (sequence !== orderLoadSequence) return false;
    const remoteTotal = Number(data.total) || 0;
    if (remoteTotal > 0 && Number(params.offset) >= remoteTotal) {
      orderCurrentPage = Math.max(1,Math.ceil(remoteTotal / orderRowsPerPage));
      return loadOrderPage({scroll});
    }
    state.workOrders = Array.isArray(data.workOrders) ? data.workOrders : [];
    if (Array.isArray(data.nodes)) state.nodes = data.nodes;
    if (Array.isArray(data.supportUsers)) {
      window.netopsSupportUsers = data.supportUsers;
      try { localStorage.setItem('netops_cached_support_users', JSON.stringify(data.supportUsers)); } catch (e) {}
    }
    if (typeof _previousStateSaved !== 'undefined' && _previousStateSaved) {
      _previousStateSaved.workOrders = cloneData(state.workOrders);
    }
    window.netopsPageMeta = window.netopsPageMeta || {};
    window.netopsPageMeta.operations = {
      total:Number(data.total)||0,
      offset:Number(params.offset)||0,
      limit:Number(params.limit)||orderRowsPerPage,
      stats:data.stats||{},
      creators:Array.isArray(data.creators)?data.creators:[]
    };
    renderOrderFilterMenus();
    renderWOs();
    const currentTableWrap = document.querySelector('.orders-table-card .table-wrap');
    if (currentTableWrap && previousTableScrollLeft > 0) currentTableWrap.scrollLeft = previousTableScrollLeft;
    if (scroll) document.querySelector('.orders-table-card')?.scrollIntoView({behavior:'smooth',block:'start'});
    return true;
  } catch (error) {
    if (sequence === orderLoadSequence) notify(describeSyncError(error),'err');
    return false;
  } finally {
    endLoadingOperation(loadingOperation);
  }
}

function mergeOrderLookupRecords(key,records) {
  const current = Array.isArray(state[key]) ? state[key] : [];
  const merged = new Map(current.filter(item => item?.id).map(item => [item.id,item]));
  (Array.isArray(records) ? records : []).forEach(item => { if (item?.id) merged.set(item.id,item); });
  state[key] = [...merged.values()];
  if (typeof _previousStateSaved !== 'undefined' && _previousStateSaved) {
    _previousStateSaved[key] = cloneData(state[key]);
  }
}

const ORDER_FILTER_META = {
  status: { label: 'Estado', options: [['pendiente', 'Pendiente'], ['en_revision', 'En atención'], ['resuelto_soporte', 'Resuelto'], ['devuelto_soporte', 'Devuelto'], ['no_realizado', 'No realizado'], ['completada', 'Concluido']] },
  type: { label: 'Tipo', options: [['comunidad', 'Comunidad'], ['torre', 'Torre'], ['troncal', 'Troncal'], ['punto_venta', 'Punto de venta']] },
  priority: { label: 'Prioridad', options: [['muy_alta', 'Muy alta'], ['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']] },
  category: { label: 'Categoría', options: ORDER_CATEGORIES }
};

function orderCategoryLabel(value) {
  return ORDER_CATEGORIES.find(([id]) => id === value)?.[1] || value || 'Sin categoria';
}

function orderCategoriesForKind(kind) {
  if (kind === 'network') {
    // Se muestran todas las categorías de red y soporte sin filtrar por área
    return [...ORDER_CATEGORIES_BY_KIND.network, ...ORDER_CATEGORIES_BY_KIND.support_to_attention];
  }
  return ORDER_CATEGORIES_BY_KIND.physical;
}

function renderWOCategoryOptions(kind, selected = '') {
  const select = document.getElementById('wo-category');
  if (!select) return;
  const options = orderCategoriesForKind(kind);
  select.innerHTML = `<option value="">-- Selecciona una categoría --</option>${options.map(([id,label]) => `<option value="${id}">${orderEscape(label)}</option>`).join('')}`;
  select.value = options.some(([id]) => id === selected) ? selected : '';
}

function syncWODetailKindField(kind) {
  const resolved = kind === 'network' ? 'network' : 'physical';
  const input = document.getElementById('wo-detail-kind');
  const label = document.getElementById('wo-detail-kind-label');
  if (input) input.value = resolved;
  if (label) label.textContent = resolved === 'network' ? 'Detalle de red' : 'Detalle físico';
  const assignField = document.getElementById('wo-assign-field');
  if (assignField) {
    assignField.style.display = resolved === 'network' ? '' : 'none';
  }
  renderWOCategoryOptions(resolved,document.getElementById('wo-category')?.value || '');
}

let currentWOCandidates = [];
let currentWOSelectedUserIds = new Set();

let adminNetworkTargetRole = 'soporte'; // 'soporte' | 'atencion_clientes'

function getActiveNetworkTargetRole() {
  if (typeof userHasRole === 'function') {
    if (userHasRole('soporte')) return 'atencion_clientes';
    if (userHasRole('atencion_clientes')) return 'soporte';
  }
  return adminNetworkTargetRole || 'soporte';
}

function switchAdminNetworkTarget(target) {
  adminNetworkTargetRole = target === 'atencion_clientes' ? 'atencion_clientes' : 'soporte';
  applyRoleFormVisibility();
  renderWOAssignedUserOptions();
}

function getAvailableSupportUsers() {
  if (Array.isArray(state?.users) && state.users.length) {
    const fromState = state.users.filter(u => !u.deletedAt && ['administrador', 'admin', 'soporte'].includes(normalizeRole(u.role)) && u.active !== false);
    if (fromState.length) return fromState;
  }
  if (Array.isArray(window.netopsSupportUsers) && window.netopsSupportUsers.length) {
    return window.netopsSupportUsers;
  }
  try {
    const cached = JSON.parse(localStorage.getItem('netops_cached_support_users') || '[]');
    if (Array.isArray(cached) && cached.length) {
      window.netopsSupportUsers = cached;
      return cached;
    }
  } catch (e) {}
  if (Array.isArray(state.users)) {
    const fromState = state.users.filter(u => ['administrador', 'admin', 'soporte'].includes(String(u.role).toLowerCase()) && u.active !== false);
    if (fromState.length) return fromState;
  }
  return [];
}

function getAvailableAttentionUsers() {
  if (Array.isArray(state?.users) && state.users.length) {
    const fromState = state.users.filter(u => !u.deletedAt && ['atencion_clientes', 'atencion'].includes(normalizeRole(u.role)) && u.active !== false);
    if (fromState.length) return fromState;
  }
  if (Array.isArray(window.netopsAttentionUsers) && window.netopsAttentionUsers.length) {
    return window.netopsAttentionUsers;
  }
  try {
    const cached = JSON.parse(localStorage.getItem('netops_cached_attention_users') || '[]');
    if (Array.isArray(cached) && cached.length) {
      window.netopsAttentionUsers = cached;
      return cached;
    }
  } catch (e) {}
  if (Array.isArray(state.users)) {
    const fromState = state.users.filter(u => ['atencion_clientes', 'atencion'].includes(String(u.role).toLowerCase()) && u.active !== false);
    if (fromState.length) return fromState;
  }
  return [];
}

async function renderWOAssignedUserOptions(selectedIds = '') {
  const container = document.getElementById('wo-assign-users-grid');
  const allBtn = document.getElementById('wo-assign-all-btn');
  const allBtnText = document.getElementById('wo-assign-all-text');
  const assignLabel = document.getElementById('wo-assign-label');
  const hiddenIdInput = document.getElementById('wo-assigned-user');
  const hiddenNamesInput = document.getElementById('wo-assigned-names');
  if (!container) return;

  const targetRole = getActiveNetworkTargetRole();
  const targetIsAttention = targetRole === 'atencion_clientes';

  let candidates = targetIsAttention ? getAvailableAttentionUsers() : getAvailableSupportUsers();
  if (!candidates.length && typeof fetchDataPage === 'function') {
    try {
      const res = await fetchDataPage('operations', { windowed: '1', limit: 1 });
      if (Array.isArray(res?.supportUsers)) {
        window.netopsSupportUsers = res.supportUsers;
        try { localStorage.setItem('netops_cached_support_users', JSON.stringify(res.supportUsers)); } catch (e) {}
      }
      if (Array.isArray(res?.attentionUsers)) {
        window.netopsAttentionUsers = res.attentionUsers;
        try { localStorage.setItem('netops_cached_attention_users', JSON.stringify(res.attentionUsers)); } catch (e) {}
      }
      candidates = targetIsAttention ? getAvailableAttentionUsers() : getAvailableSupportUsers();
    } catch (e) {}
  }

  currentWOCandidates = candidates;

  if (assignLabel) {
    assignLabel.textContent = targetIsAttention ? 'Asignación a Atención a clientes' : 'Asignación a Soporte técnico';
  }
  if (allBtnText) {
    allBtnText.textContent = targetIsAttention ? 'Todo el equipo de Atención a clientes' : 'Todo el equipo de Soporte técnico';
  }

  currentWOSelectedUserIds.clear();
  if (selectedIds) {
    const list = Array.isArray(selectedIds)
      ? selectedIds
      : String(selectedIds).split(',').map(s => s.trim()).filter(Boolean);
    list.forEach(id => {
      const cand = candidates.find(c => String(c.id).toLowerCase() === id.toLowerCase() || String(c.username || '').toLowerCase() === id.toLowerCase());
      if (cand) currentWOSelectedUserIds.add(cand.id);
      else if (id) currentWOSelectedUserIds.add(id);
    });
  }

  updateWOAssignUI();
}

function updateWOAssignUI() {
  const container = document.getElementById('wo-assign-users-grid');
  const allBtn = document.getElementById('wo-assign-all-btn');
  const hiddenIdInput = document.getElementById('wo-assigned-user');
  const hiddenNamesInput = document.getElementById('wo-assigned-names');
  if (!container) return;

  const isAll = currentWOSelectedUserIds.size === 0;
  if (allBtn) {
    allBtn.classList.toggle('is-active', isAll);
  }

  let html = '';
  currentWOCandidates.forEach(u => {
    const uid = String(u.id || '').trim();
    const uname = String(u.name || u.username || 'Usuario').trim();
    const isSel = currentWOSelectedUserIds.has(uid);
    html += `
      <button type="button" class="wo-assign-user-pill ${isSel ? 'is-selected' : ''}" data-uid="${orderEscape(uid)}" onclick="toggleWOAssignUser('${orderEscape(uid)}')">
        <svg class="wo-assign-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        <span class="wo-assign-avatar" aria-hidden="true">👤</span>
        <span class="wo-assign-name">${orderEscape(uname)}</span>
      </button>
    `;
  });

  if (!currentWOCandidates.length) {
    html = '<div style="font-size:12px;color:#94a3b8;font-style:italic;padding:4px;">No hay miembros registrados para este rol.</div>';
  }

  container.innerHTML = html;

  if (isAll) {
    if (hiddenIdInput) hiddenIdInput.value = '';
    if (hiddenNamesInput) hiddenNamesInput.value = '';
  } else {
    const selIds = Array.from(currentWOSelectedUserIds);
    const selNames = selIds.map(id => {
      const u = currentWOCandidates.find(c => c.id === id);
      return u ? (u.name || u.username) : id;
    });
    if (hiddenIdInput) hiddenIdInput.value = selIds.join(', ');
    if (hiddenNamesInput) hiddenNamesInput.value = selNames.join(', ');
  }
}

function toggleWOAssignAll() {
  currentWOSelectedUserIds.clear();
  updateWOAssignUI();
}

function toggleWOAssignUser(uid) {
  if (currentWOSelectedUserIds.has(uid)) {
    currentWOSelectedUserIds.delete(uid);
  } else {
    currentWOSelectedUserIds.add(uid);
  }
  updateWOAssignUI();
}

function getOrderCategory(order) {
  if (order?.category) return order.category;
  const text = normalizeName([order?.title, order?.description].filter(Boolean).join(' '));
  if (/nueva instalacion|instalacion nueva/.test(text)) return 'instalacion';
  if (/alinear|alineacion/.test(text)) return 'alineacion_antena';
  if (/desconect/.test(text)) return 'antena_desconectada';
  if (/quemad/.test(text)) return 'antena_quemada';
  if (/inalambr/.test(text)) return 'antena_inalambrica';
  if (/reubica|cambio de lugar/.test(text)) return 'reubicacion_antena';
  return 'otro';
}

function initOrdenesPage() {
  if (!checkAuth()) return;
  initCommon();
  clearPendingOrderReviewDecision();
  if (!document.body.dataset.orderReviewUnloadBound) {
    document.body.dataset.orderReviewUnloadBound = '1';
    window.addEventListener('pagehide',recordUnconfirmedOrderReviewExit);
    document.addEventListener('keydown',event => {
      const reloadShortcut = event.key === 'F5' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r');
      if (reloadShortcut && pendingOrderReviewDecisionId) {
        event.preventDefault();
        pendingOrderReviewReload = true;
        showOrderReviewDecision(pendingOrderReviewDecisionId);
        return;
      }
      if (event.key !== 'Escape' || !document.getElementById('order-tech-report-mo')?.classList.contains('open')) return;
      if (document.getElementById('order-review-decision-mo')?.classList.contains('open')) return;
      event.preventDefault();
      requestCloseOrderReport();
    });
    document.addEventListener('click',interceptOrderReviewNavigation,true);
  }
  const puebloField = document.getElementById('wo-node');
  const puebloLabel = puebloField?.closest('.fi')?.querySelector('label');
  if (puebloLabel) puebloLabel.textContent = 'Pueblo';
  const orderModalCopy = document.querySelector('#wo-mo .modal-head p');
  if (orderModalCopy) orderModalCopy.textContent = 'Orden: cliente, categoría, detalle específico, pueblo, zona, tipo y prioridad.';
  setupOrderControls();
  updateOrderDetailTabs();
  initOrderFontScale();
  loadDB({ showOverlay: false, preferCache: !requestedOrderCopyId }).then(() => {
    fillOrderSelects();
    renderWOs();
    if (requestedOrderCopyId) {
      const copyId = requestedOrderCopyId;
      requestedOrderCopyId = '';
      const url = new URL(window.location.href);
      url.searchParams.delete('copyOrderId');
      window.history.replaceState({},'',url);
      void openWOCopy(copyId);
    }
  });
}

function setupOrderControls() {
  renderActiveOrderFilters();
  renderOrderFilterMenus();
  if (!document.body.dataset.orderFilterCloseBound) {
    document.body.dataset.orderFilterCloseBound = '1';
    document.addEventListener('click', event => {
      if (!event.target.closest('.order-filter-menu-wrap')) closeOrderFilterMenus();
    });
  }
  const duplicateTownField = document.getElementById('wo-town')?.closest('.fi');
  if (duplicateTownField) duplicateTownField.remove();
  document.getElementById('wo-zone')?.closest('.fi')?.classList.add('wo-zone-field');
  const equipmentInput = document.getElementById('wo-equipment');
  if (equipmentInput) {
    equipmentInput.readOnly = true;
    equipmentInput.placeholder = 'Se asigna automáticamente al elegir un pueblo';
    equipmentInput.removeAttribute('oninput');
    equipmentInput.removeAttribute('onfocus');
    equipmentInput.removeAttribute('onblur');
  }
  const equipmentField = document.getElementById('wo-equipment-field') || document.getElementById('wo-equipment')?.closest('.fi');
  if (equipmentField) equipmentField.classList.add('wo-equipment-readonly');
  bindWOEvidenceEvents();
  syncWODetailKindField(document.getElementById('wo-detail-kind')?.value || activeOrderDetailKind);
  if (typeof applyRoleFormVisibility === 'function') applyRoleFormVisibility();
}

function bindWOEvidenceEvents() {
  const modal = document.getElementById('wo-mo');
  const zone = document.getElementById('wo-evidence-zone');
  if (modal && !modal.dataset.woPasteBound) {
    modal.dataset.woPasteBound = '1';
    modal.addEventListener('paste', event => {
      const files = Array.from(event.clipboardData?.items || [])
        .filter(item => item.kind === 'file' && /^image\//i.test(item.type))
        .map(item => item.getAsFile()).filter(Boolean);
      if (!files.length) return;
      event.preventDefault();
      void addWOEvidenceFiles(files);
    });
  }
  if (zone && !zone.dataset.dropBound) {
    zone.dataset.dropBound = '1';
    zone.addEventListener('dragover', event => { event.preventDefault(); zone.classList.add('is-dragging'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-dragging'));
    zone.addEventListener('drop', event => {
      event.preventDefault();
      zone.classList.remove('is-dragging');
      void addWOEvidenceFiles(event.dataTransfer?.files || []);
    });
  }
}

function compressWOEvidenceImage(file) {
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const maxSize = 1600;
        const scale = Math.min(1,maxSize / Math.max(image.width,image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1,Math.round(image.width * scale));
        canvas.height = Math.max(1,Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL('image/jpeg',.78));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function addWOEvidenceFiles(fileList) {
  const files = Array.from(fileList || []).filter(file => /^image\//i.test(file.type));
  const available = Math.max(0,6 - woEvidencePhotos.length);
  if (!available) return notify('Puedes agregar máximo 6 evidencias.','err');
  for (const file of files.slice(0,available)) {
    try { woEvidencePhotos.push(await compressWOEvidenceImage(file)); }
    catch { notify('No se pudo leer una de las evidencias.','err'); }
  }
  if (files.length > available) notify('Sólo se conservaron las primeras 6 evidencias.','warn');
  renderWOEvidencePhotos();
}

function renderWOEvidencePhotos() {
  const preview = document.getElementById('wo-evidence-preview');
  if (!preview) return;
  preview.innerHTML = woEvidencePhotos.length
    ? woEvidencePhotos.map((photo,index) => `<div><img src="${orderEscape(photo)}" alt="Evidencia ${index + 1}"><button type="button" onclick="removeWOEvidencePhoto(${index})" aria-label="Quitar evidencia">×</button></div>`).join('')
    : '<p>Sin evidencias adjuntas.</p>';
}

function removeWOEvidencePhoto(index) {
  woEvidencePhotos.splice(index,1);
  renderWOEvidencePhotos();
}

function updateOrderDetailTabs() {
  const labels = {network:'Detalles de red',physical:'Detalles físicos'};
  ['network','physical'].forEach(kind => {
    const tab = document.getElementById(`order-tab-${kind}`);
    const active = kind === activeOrderDetailKind;
    tab?.classList.toggle('is-active',active);
    tab?.setAttribute('aria-selected',String(active));
  });
  const heroTitle = document.getElementById('orders-hero-title');
  const heroSub = document.getElementById('orders-hero-subtitle');
  if (activeOrderDetailKind === 'physical') {
    if (heroTitle) heroTitle.textContent = 'Detalles físicos';
    if (heroSub) heroSub.textContent = 'Administra, prioriza y consulta los detalles de trabajo de campo y pueblos.';
  } else {
    if (heroTitle) heroTitle.textContent = 'Detalles de red';
    if (heroSub) heroSub.textContent = 'Administra, prioriza y atiende los reportes y requerimientos de red.';
  }
  const newButton = document.querySelector('.order-new-button');
  if (newButton) newButton.setAttribute('aria-label',`Nuevo ${labels[activeOrderDetailKind].toLowerCase().replace(/s$/,'')}`);
  if (typeof updateActiveNavLink === 'function') updateActiveNavLink();
}

function selectOrderDetailKind(kind) {
  const next = kind === 'physical' ? 'physical' : 'network';
  if (next === activeOrderDetailKind) return;
  activeOrderDetailKind = next;
  orderCurrentPage = 1;
  activeOrderFilters.category.clear();
  updateOrderDetailTabs();
  renderActiveOrderFilters();
  renderOrderFilterMenus();
  const url = new URL(window.location.href);
  url.searchParams.set('detailKind',next);
  window.history.replaceState({},'',url);
  void loadOrderPage();
}

function clearOrderFilters() {
  const search = document.getElementById('wo-search');
  if (search) search.value = '';
  Object.values(activeOrderFilters).forEach(values => values.clear());
  const sort = document.getElementById('wo-sort');
  if (sort) sort.value = 'priority';
  orderCurrentPage = 1;
  renderActiveOrderFilters();
  renderOrderFilterMenus();
  void loadOrderPage();
}

function getOrderFilterOptions(kind) {
  if (kind === 'category') return orderCategoriesForKind(activeOrderDetailKind);
  if (kind === 'status') {
    if (activeOrderDetailKind === 'network') {
      return [
        ['pendiente', 'Pendiente'],
        ['en_revision', 'En atención'],
        ['resuelto_soporte', 'Resuelto'],
        ['devuelto_soporte', 'Devuelto'],
        ['no_realizado', 'No realizado'],
        ['completada', 'Concluido']
      ];
    }
    return ORDER_FILTER_META.status.options;
  }
  if (kind === 'zone') return (REGS || []).map(region => [region.id, region.n]);
  if (kind === 'creator') {
    const remoteCreators = window.netopsPageMeta?.operations?.creators;
    if (Array.isArray(remoteCreators) && remoteCreators.length) return remoteCreators.map(user => [user.id,user.name]);
    return [...new Map((state.workOrders || [])
      .filter(order => order.createdById || order.createdByName)
      .map(order => [order.createdById || order.createdByName, order.createdByName || order.createdByUsername || 'Usuario']))
      .entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  }
  return ORDER_FILTER_META[kind]?.options || [];
}

function renderOrderFilterMenus() {
  document.querySelectorAll('[data-order-filter-menu]').forEach(menu => {
    const kind = menu.dataset.orderFilterMenu;
    const options = getOrderFilterOptions(kind);
    menu.innerHTML = options.length ? options.map(([value, label]) => {
      const selected = activeOrderFilters[kind]?.has(String(value));
      const safeValue = encodeURIComponent(value).replace(/'/g, '%27');
      return `<button type="button" class="order-filter-option ${selected ? 'is-selected' : ''}" onclick="toggleOrderFilterOption('${kind}','${safeValue}',event)"><span class="order-filter-check">${selected ? '✓' : ''}</span><span>${orderEscape(label)}</span></button>`;
    }).join('') : '<span class="order-filter-menu-empty">Sin opciones disponibles</span>';
  });
  updateOrderFilterButtons();
}

function toggleOrderFilterMenu(kind, button, event) {
  event?.stopPropagation();
  const menu = button?.parentElement?.querySelector(`[data-order-filter-menu="${kind}"]`);
  if (!menu) return;
  const willOpen = !menu.classList.contains('is-open');
  closeOrderFilterMenus();
  if (willOpen) {
    renderOrderFilterMenus();
    menu.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
  }
}

function closeOrderFilterMenus() {
  document.querySelectorAll('.order-filter-menu.is-open').forEach(menu => menu.classList.remove('is-open'));
  document.querySelectorAll('[data-order-filter-kind]').forEach(button => button.setAttribute('aria-expanded', 'false'));
}

function toggleOrderFilterOption(kind, encodedValue, event) {
  event?.stopPropagation();
  const value = decodeURIComponent(encodedValue);
  const values = activeOrderFilters[kind];
  if (!values) return;
  values.has(value) ? values.delete(value) : values.add(value);
  orderCurrentPage = 1;
  renderActiveOrderFilters();
  renderOrderFilterMenus();
  document.querySelector(`[data-order-filter-menu="${kind}"]`)?.classList.add('is-open');
  document.querySelector(`[data-order-filter-kind="${kind}"]`)?.setAttribute('aria-expanded', 'true');
  void loadOrderPage();
}

function updateOrderFilterButtons() {
  document.querySelectorAll('[data-order-filter-kind]').forEach(button => {
    const kind = button.dataset.orderFilterKind;
    const count = activeOrderFilters[kind]?.size || 0;
    const baseLabel = ORDER_FILTER_META[kind]?.label || (kind === 'zone' ? 'Zona' : 'Creado por');
    const label = button.querySelector('span');
    if (label) label.textContent = count ? `${baseLabel} · ${count}` : baseLabel;
    button.classList.toggle('is-active', count > 0);
  });
}

function removeOrderFilter(kind, encodedValue) {
  const value = decodeURIComponent(encodedValue);
  activeOrderFilters[kind]?.delete(value);
  orderCurrentPage = 1;
  renderActiveOrderFilters();
  renderOrderFilterMenus();
  void loadOrderPage();
}

function getOrderFilterOptionLabel(kind, value) {
  return getOrderFilterOptions(kind).find(([id]) => String(id) === String(value))?.[1] || value;
}

function resetOrderPagination() {
  orderCurrentPage = 1;
  void loadOrderPage();
}

function changeOrderPage(nextPage) {
  const page = Number(nextPage);
  if (!Number.isFinite(page) || page < 1) return;
  orderCurrentPage = page;
  const pageMeta = window.netopsPageMeta?.operations || {};
  const isServerWindowed = Number.isFinite(Number(pageMeta.total)) && Number(pageMeta.total) > 0 && (state.workOrders || []).length <= orderRowsPerPage;
  if (isServerWindowed && typeof loadOrderPage === 'function') {
    void loadOrderPage({scroll:true});
  } else {
    renderWOs();
    document.querySelector('.orders-table-card')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
}

function changeOrderPageSize(value) {
  const size = Number(value);
  orderRowsPerPage = [10, 15, 20, 50, 100].includes(size) ? size : 15;
  orderCurrentPage = 1;
  const pageMeta = window.netopsPageMeta?.operations || {};
  const isServerWindowed = Number.isFinite(Number(pageMeta.total)) && Number(pageMeta.total) > 0 && (state.workOrders || []).length <= orderRowsPerPage;
  if (isServerWindowed && typeof loadOrderPage === 'function') {
    void loadOrderPage();
  } else {
    renderWOs();
  }
}

function renderActiveOrderFilters() {
  const wrap = document.getElementById('wo-active-filters');
  if (!wrap) return;
  const row = document.getElementById('wo-active-filter-row');
  const chips = Object.entries(activeOrderFilters).flatMap(([kind, values]) => [...values].map(value => {
    const groupLabel = ORDER_FILTER_META[kind]?.label || (kind === 'zone' ? 'Zona' : 'Creado por');
    const valueLabel = getOrderFilterOptionLabel(kind, value);
    const safeValue = encodeURIComponent(value).replace(/'/g, '%27');
    return `<button type="button" class="order-filter-chip" onclick="removeOrderFilter('${kind}','${safeValue}')"><span>${orderEscape(groupLabel)}: <strong>${orderEscape(valueLabel)}</strong></span><b aria-hidden="true">×</b></button>`;
  }));
  wrap.innerHTML = chips.join('');
  row?.classList.toggle('is-empty', !chips.length);
  updateOrderFilterButtons();
}

function fillOrderSelects() {
  const zone = document.getElementById('wo-zone');
  if (zone) zone.innerHTML = '<option value="">-- Selecciona zona --</option>' + REGS.map(r => `<option value="${r.id}">${r.n}</option>`).join('');
  renderOrderFilterMenus();
  renderNodeOptions();
}


function renderNodeOptions() {
  // Ahora usamos un autocomplete propio para que el usuario pueda escribir libremente.
  const menu = document.getElementById('wo-node-suggestions');
  if (menu) menu.innerHTML = '';
  const eqMenu = document.getElementById('wo-equipment-suggestions');
  if (eqMenu) eqMenu.innerHTML = '';
}

function getMatchingNodesForInput(limit = 8) {
  const q = normalizeName(document.getElementById('wo-node')?.value || '');
  if (!q) return [];
  return (state.nodes || [])
    .filter(n => !n.deletedAt)
    .filter(n => [getNodeLabel(n), n.nodeCode, n.town, getZoneLabel(n.zone), n.notes]
      .some(val => normalizeName(val).includes(q)))
    .slice(0, limit);
}

function getSelectedNodeByHiddenId() {
  const id = document.getElementById('wo-node-id')?.value || '';
  if (!id) return null;
  return (state.nodes || []).find(n => !n.deletedAt && n.id === id) || null;
}

function findNodeFromInput() {
  const selected = getSelectedNodeByHiddenId();
  if (selected) return selected;
  const q = normalizeName(document.getElementById('wo-node')?.value || '');
  if (!q) return null;
  // Solo tomar coincidencia exacta. Ya no auto-asignamos por texto parcial.
  return (state.nodes || []).find(n => !n.deletedAt && (
    normalizeName(getNodeLabel(n)) === q ||
    normalizeName(n.nodeCode) === q ||
    normalizeName(n.town) === q
  )) || null;
}

async function renderWONodeSuggestions() {
  const input = document.getElementById('wo-node');
  const hidden = document.getElementById('wo-node-id');
  const menu = document.getElementById('wo-node-suggestions');
  if (!input || !menu) return;

  const selected = getSelectedNodeByHiddenId();
  if (selected && normalizeName(input.value) !== normalizeName(getNodeLabel(selected))) {
    hidden.value = '';
  }
  if (input.dataset.newNodeName && normalizeName(input.dataset.newNodeName) !== normalizeName(input.value)) {
    delete input.dataset.newNodeName;
    input.classList.remove('wo-new-node-selected');
    const saveButton = document.querySelector('#wo-mo .card-actions .bc');
    if (saveButton) saveButton.textContent = 'Guardar detalle';
  }

  const rawQuery = input.value.trim();
  if (!rawQuery) {
    menu.classList.remove('open');
    menu.innerHTML = '';
    return;
  }

  const sequence = ++orderNodeLookupSequence;
  await new Promise(resolve => setTimeout(resolve,150));
  if (sequence !== orderNodeLookupSequence) return;
  try {
    const data = await fetchDataPage('nodes',{q:rawQuery,limit:8,offset:0});
    if (sequence !== orderNodeLookupSequence) return;
    mergeOrderLookupRecords('nodes',data.nodes);
  } catch (error) {
    if (sequence === orderNodeLookupSequence) console.warn('No se pudo buscar pueblos',error);
  }
  const matches = getMatchingNodesForInput();
  const exactMatch = matches.some(node => [getNodeLabel(node),node.nodeCode,node.town].some(value => normalizeName(value) === normalizeName(rawQuery)));
  menu.innerHTML = matches.map(n => `
    <button type="button" onmousedown="chooseWONode('${n.id}')">
      <strong>${orderEscape(getNodeLabel(n))}</strong>
      <small>${orderEscape(getZoneLabel(n.zone))}${n.town ? ' · ' + orderEscape(n.town) : ''}</small>
    </button>`).join('') + (!exactMatch ? `<button type="button" class="wo-add-node-option" onmousedown="chooseNewWONode()"><strong>＋ Agregar pueblo “${orderEscape(rawQuery)}”</strong><small>Abrir formulario completo de pueblo</small></button>` : '');
  menu.classList.add('open');
}

function hideWONodeSuggestionsSoon() {
  setTimeout(() => {
    const menu = document.getElementById('wo-node-suggestions');
    if (menu) menu.classList.remove('open');
  }, 180);
}

async function chooseWONode(id) {
  const n = (state.nodes || []).find(node => !node.deletedAt && node.id === id);
  if (!n) return;
  document.getElementById('wo-node-id').value = n.id;
  document.getElementById('wo-node').value = getNodeLabel(n);
  delete document.getElementById('wo-node').dataset.newNodeName;
  document.getElementById('wo-node').classList.remove('wo-new-node-selected');
  const saveButton = document.querySelector('#wo-mo .card-actions .bc');
  if (saveButton && (!document.getElementById('wo-detail-kind') || document.getElementById('wo-detail-kind').value !== 'network')) {
    saveButton.textContent = 'Guardar detalle';
  }
  if (document.getElementById('wo-zone')) document.getElementById('wo-zone').value = n.zone || '';
  // Importante: en órdenes por nodo NO se autollenan coordenadas del nodo.
  // La ubicación de la tabla debe ser solo la que el usuario capture en "Ubicación".
  const isNetwork = (document.getElementById('wo-detail-kind')?.value || activeOrderDetailKind) === 'network';
  if (!isNetwork) {
    if (document.getElementById('wo-equipment-id')) document.getElementById('wo-equipment-id').value = '';
    if (document.getElementById('wo-equipment')) document.getElementById('wo-equipment').value = 'Consultando antenas vinculadas...';
    try {
      const data = await fetchDataPage('equipment',{nodeIds:n.id,paged:'1',windowed:'1',limit:100,offset:0});
      mergeOrderLookupRecords('equipment',data.equipment);
    } catch (error) {
      console.warn('No se pudieron consultar las antenas del pueblo',error);
    }
    const linked = getNodeLinkedEquipment(n.id);
    if (document.getElementById('wo-equipment')) {
      document.getElementById('wo-equipment').value = linked.length
        ? linked.map(item => item.name || item.ip || 'Antena').join(', ')
        : 'Sin antena vinculada';
    }
    if (linked.length === 1 && document.getElementById('wo-equipment-id')) {
      document.getElementById('wo-equipment-id').value = linked[0].id;
    }
  } else {
    if (document.getElementById('wo-equipment-id')) document.getElementById('wo-equipment-id').value = '';
    if (document.getElementById('wo-equipment')) document.getElementById('wo-equipment').value = '';
  }
  const menu = document.getElementById('wo-node-suggestions');
  if (menu) menu.classList.remove('open');
  updateWORelationInfo();
}

function chooseNewWONode() {
  const input = document.getElementById('wo-node');
  const name = input?.value.trim() || '';
  if (!input || !name) return;
  document.getElementById('wo-node-suggestions')?.classList.remove('open');
  openWOQuickNodeModal(name);
}

function ensureWOQuickNodeModal() {
  if (document.getElementById('wo-quick-node-mo')) return;
  const modal = document.createElement('div');
  modal.className = 'mo';
  modal.id = 'wo-quick-node-mo';
  modal.innerHTML = `
    <div class="md town-create-modal">
      <div class="modal-head"><div><h2>Agregar pueblo</h2><p>Registra el pueblo y su ubicación igual que en la sección Pueblos.</p></div><button class="btn bgh" type="button" onclick="CM('wo-quick-node-mo')">Cerrar</button></div>
      <div class="modal-grid"><div class="fi"><label>Clave del pueblo</label><input id="wo-qnode-code" placeholder="R114" oninput="renderWOQuickNodeWarnings()"></div><div class="fi"><label>Pueblo / colonia</label><input id="wo-qnode-town" placeholder="Barrio Guadalupe" oninput="renderWOQuickNodeWarnings()"></div></div>
      <div id="wo-qnode-warnings" class="node-warnings"></div>
      <div class="modal-grid"><div class="fi"><label>Zona</label><select id="wo-qnode-zone"></select></div><div class="fi"><label>Estado</label><select id="wo-qnode-status"><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></div></div>
      <div class="fi town-location-field"><label>Ubicación</label><input id="wo-qnode-location" class="mono" placeholder="17.000000, -99.000000 o pega un enlace de Google Maps"><small>Pega latitud y longitud juntas; también se acepta un enlace de Maps.</small></div>
      <div class="fi"><label>Notas / observaciones</label><textarea id="wo-qnode-notes" placeholder="Observaciones, pueblos que atiende, referencia..."></textarea></div>
      <div class="card-actions"><button class="btn bgh" type="button" onclick="CM('wo-quick-node-mo')">Cancelar</button><button class="btn bc" type="button" onclick="saveWOQuickNode()">Guardar pueblo</button></div>
      <div class="town-create-note">El pueblo se guardará ahora y quedará seleccionado en el nuevo detalle.</div>
    </div>`;
  document.body.appendChild(modal);
}

function openWOQuickNodeModal(name = '') {
  ensureWOQuickNodeModal();
  document.getElementById('wo-qnode-zone').innerHTML = `<option value="">Selecciona zona</option>${REGS.map(region => `<option value="${region.id}">${orderEscape(region.n)}</option>`).join('')}`;
  document.getElementById('wo-qnode-code').value = '';
  document.getElementById('wo-qnode-town').value = String(name || '').trim();
  document.getElementById('wo-qnode-zone').value = document.getElementById('wo-zone')?.value || '';
  document.getElementById('wo-qnode-status').value = 'activo';
  document.getElementById('wo-qnode-location').value = '';
  document.getElementById('wo-qnode-notes').value = '';
  renderWOQuickNodeWarnings();
  OM('wo-quick-node-mo');
  setTimeout(() => document.getElementById('wo-qnode-code')?.focus(),0);
}

function renderWOQuickNodeWarnings() {
  const box = document.getElementById('wo-qnode-warnings');
  if (!box) return;
  const code = normalizeName(document.getElementById('wo-qnode-code')?.value || '');
  const town = normalizeName(document.getElementById('wo-qnode-town')?.value || '');
  const nodes = (state.nodes || []).filter(node => !node.deletedAt);
  const warnings = [];
  if (code) {
    const matches = nodes.filter(node => normalizeName(node.nodeCode) === code);
    if (matches.length) warnings.push(`<div class="node-warning"><strong>Esta clave ya existe.</strong><span class="muted">Pueblos registrados: ${orderEscape(matches.map(node => node.town).filter(Boolean).slice(0,6).join(', ') || 'sin nombre')}</span></div>`);
  }
  if (town) {
    const matches = nodes.filter(node => normalizeName(node.town) === town);
    if (matches.length) warnings.push(`<div class="node-warning"><strong>Ese pueblo/colonia ya está registrado.</strong><span class="muted">Clave(s): ${orderEscape(matches.map(node => node.nodeCode).filter(Boolean).slice(0,6).join(', ') || 'sin clave')}</span></div>`);
  }
  box.innerHTML = warnings.join('');
}

async function saveWOQuickNode() {
  const location = parseLocationCoordinates(document.getElementById('wo-qnode-location').value);
  const payload = {
    nodeCode:document.getElementById('wo-qnode-code').value.trim(),
    town:document.getElementById('wo-qnode-town').value.trim(),
    zone:document.getElementById('wo-qnode-zone').value,
    lat:location?.lat ?? NaN,
    lng:location?.lng ?? NaN,
    status:document.getElementById('wo-qnode-status').value,
    notes:document.getElementById('wo-qnode-notes').value.trim()
  };
  if (!payload.nodeCode) return showWOQuickNodeError('wo-qnode-code','Escribe la clave del pueblo.');
  if (!payload.town) return showWOQuickNodeError('wo-qnode-town','Escribe el pueblo o colonia.');
  if (!payload.zone) return showWOQuickNodeError('wo-qnode-zone','Selecciona la zona.');
  if (isNaN(payload.lat) || isNaN(payload.lng)) return showWOQuickNodeError('wo-qnode-location','Escribe coordenadas válidas o pega un enlace de Google Maps.');
  const duplicate = (state.nodes || []).find(node => !node.deletedAt && normalizeName(node.nodeCode) === normalizeName(payload.nodeCode) && normalizeName(node.town) === normalizeName(payload.town));
  if (duplicate) return showWOQuickNodeError('wo-qnode-town','Ya existe esa misma clave con ese mismo pueblo/colonia.');
  const auditStart = Array.isArray(state.auditLog) ? state.auditLog.length : 0;
  const node = {id:gid('nd'),createdAt:new Date().toISOString(),...payload};
  setCreatedAudit(node,'agregó pueblo desde orden');
  state.nodes.push(node);
  const saved = await saveRecord('nodes',node);
  if (!saved) return;
  for (const audit of (state.auditLog || []).slice(auditStart)) await saveRecord('auditLog',audit);
  CM('wo-quick-node-mo');
  await chooseWONode(node.id);
  notify('Pueblo registrado y seleccionado.');
}

function showWOQuickNodeError(fieldId,message) {
  const field = document.getElementById(fieldId);
  notify(message,'err');
  field?.classList.add('wo-field-invalid');
  field?.focus({preventScroll:true});
  field?.scrollIntoView({behavior:'smooth',block:'center'});
  setTimeout(() => field?.classList.remove('wo-field-invalid'),2400);
}

function getSelectedEquipmentByHiddenId() {
  const id = document.getElementById('wo-equipment-id')?.value || '';
  if (!id) return null;
  return (state.equipment || []).find(eq => !eq.deletedAt && eq.id === id) || null;
}

function getMatchingEquipmentForInput(limit = 8) {
  const q = normalizeName(document.getElementById('wo-equipment')?.value || '');
  if (!q) return [];
  return (state.equipment || [])
    .filter(eq => !eq.deletedAt)
    .filter(eq => [eq.name, eq.ip, eq.ssid, getZoneLabel(eq.region), eq.notes]
      .some(val => normalizeName(val).includes(q)))
    .slice(0, limit);
}

async function renderWOEquipmentSuggestions() {
  const input = document.getElementById('wo-equipment');
  const hidden = document.getElementById('wo-equipment-id');
  const menu = document.getElementById('wo-equipment-suggestions');
  if (!input || !menu) return;
  const selected = getSelectedEquipmentByHiddenId();
  if (selected && normalizeName(input.value) !== normalizeName(selected.name || selected.ip)) hidden.value = '';
  const rawQuery = input.value.trim();
  if (!rawQuery) {
    menu.classList.remove('open');
    menu.innerHTML = '';
    return;
  }
  const sequence = ++orderEquipmentLookupSequence;
  await new Promise(resolve => setTimeout(resolve,150));
  if (sequence !== orderEquipmentLookupSequence) return;
  try {
    const data = await fetchDataPage('equipment',{q:rawQuery,limit:8,offset:0});
    if (sequence !== orderEquipmentLookupSequence) return;
    mergeOrderLookupRecords('equipment',data.equipment);
  } catch (error) {
    if (sequence === orderEquipmentLookupSequence) console.warn('No se pudo buscar antenas',error);
  }
  const matches = getMatchingEquipmentForInput();
  if (!matches.length) {
    menu.classList.remove('open');
    menu.innerHTML = '';
    return;
  }
  menu.innerHTML = matches.map(eq => `
    <button type="button" onmousedown="chooseWOEquipment('${eq.id}')">
      <strong>${orderEscape(eq.name || 'Antena')}</strong>
      <small>${orderEscape([eq.ip, getZoneLabel(eq.region)].filter(Boolean).join(' - '))}</small>
    </button>`).join('');
  menu.classList.add('open');
}

function hideWOEquipmentSuggestionsSoon() {
  setTimeout(() => {
    const menu = document.getElementById('wo-equipment-suggestions');
    if (menu) menu.classList.remove('open');
  }, 180);
}

function chooseWOEquipment(id, fillZone = true) {
  const eq = (state.equipment || []).find(item => !item.deletedAt && item.id === id);
  if (!eq) return;
  document.getElementById('wo-equipment-id').value = eq.id;
  document.getElementById('wo-equipment').value = eq.name || eq.ip || 'Antena';
  if (fillZone && eq.region) document.getElementById('wo-zone').value = eq.region;
  const menu = document.getElementById('wo-equipment-suggestions');
  if (menu) menu.classList.remove('open');
  updateWORelationInfo();
}

function updateWORelationInfo() {
  const box = document.getElementById('wo-relation-info');
  if (!box) return;
  const isNetwork = (document.getElementById('wo-detail-kind')?.value || activeOrderDetailKind) === 'network';
  if (isNetwork) {
    box.style.display = 'none';
    box.textContent = '';
    return;
  }
  const node = getSelectedNodeByHiddenId();
  const eq = getSelectedEquipmentByHiddenId();
  const lines = [];
  if (eq) {
    const eqLabel = getEquipmentRelationLabel(eq.id);
    if (eqLabel && eqLabel !== 'Sin pueblos vinculados') lines.push(eqLabel);
  }
  if (node) {
    const nodeLabel = getNodeRelationLabel(node.id);
    if (nodeLabel && nodeLabel !== 'Sin antena vinculada') lines.push(nodeLabel);
  }
  const newNodeName = document.getElementById('wo-node')?.dataset.newNodeName || '';
  box.classList.toggle('is-new-node', Boolean(newNodeName));
  if (newNodeName) {
    box.style.display = 'block';
    box.textContent = `Pueblo nuevo listo: “${newNodeName}”. Selecciona su zona y guarda el detalle.`;
  } else if (lines.length) {
    box.style.display = 'block';
    box.textContent = lines.join(' | ');
  } else if (!node && !eq) {
    box.style.display = 'block';
    box.textContent = 'Selecciona un pueblo registrado o usa la opción “Agregar pueblo”. La antena se asignará automáticamente.';
  } else {
    box.style.display = 'none';
  }
}

function syncWOFromNode() {
  // Compatibilidad por si algún HTML viejo llama esta función.
  const exact = findNodeFromInput();
  if (exact) chooseWONode(exact.id);
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

  const cleanCode = normalizeName(order?.nodeCode || order?.nodeName || '');
  const cleanTown = normalizeName(order?.town || '');
  if (!cleanCode && !cleanTown) return null;

  const nodes = (state.nodes || []).filter(node => !node.deletedAt);

  // Si hay varios R iguales, preferimos el que coincide con el pueblo/colonia de la orden.
  if (cleanTown) {
    const byCodeAndTown = nodes.find(node => (
      normalizeName(node.nodeCode) === cleanCode ||
      normalizeName(getNodeLabel(node)) === cleanCode ||
      normalizeName(node.nodeCode) === normalizeName(String(order?.nodeCode || ''))
    ) && normalizeName(node.town) === cleanTown);
    if (byCodeAndTown) return byCodeAndTown;

    const byTown = nodes.find(node => normalizeName(node.town) === cleanTown);
    if (byTown) return byTown;
  }

  if (cleanCode) {
    return nodes.find(node =>
      normalizeName(node.nodeCode) === cleanCode ||
      normalizeName(getNodeLabel(node)) === cleanCode
    ) || null;
  }
  return null;
}

function buildOrderNodeLabel(order, node = null) {
  if (node) return getNodeLabel(node);
  const code = String(order?.nodeCode || '').trim();
  const name = String(order?.nodeName || '').trim();
  const town = String(order?.town || '').trim();

  if (name && town && normalizeName(name) !== normalizeName(town)) return name;
  if (code && town && !normalizeName(code).includes(normalizeName(town))) return `${code} · ${town}`;
  return name || code || town || '';
}

function getOrderTarget(order) {
  const eq = getOrderEquipment(order);
  const node = getOrderNode(order);
  const nodeLabel = buildOrderNodeLabel(order, node);
  const nodeZone = node?.zone || order.region;

  if (eq) {
    return {
      kind: 'Antena',
      name: eq.name || order.equipmentName || 'Antena sin nombre',
      sub: [eq.ip, getZoneLabel(eq.region || order.region)].filter(Boolean).join(' - '),
      zone: eq.region || order.region,
      nodeLabel,
      nodeZone
    };
  }

  if (node) {
    const linkedEquipment = getNodeLinkedEquipment(node.id);
    return {
      kind: 'Pueblo',
      name: nodeLabel || order.nodeName || order.nodeCode || 'Pueblo sin nombre',
      sub: [node.town, getZoneLabel(node.zone || order.region)].filter(Boolean).join(' - '),
      zone: node.zone || order.region,
      nodeLabel,
      nodeZone,
      linkedEquipment
    };
  }

  return {
    kind: order.equipmentName ? 'Antena' : 'Pueblo',
    name: order.equipmentName || nodeLabel || order.nodeName || order.nodeCode || 'Sin antena/nodo',
    sub: [order.town, getZoneLabel(order.region)].filter(Boolean).join(' - '),
    zone: order.region,
    nodeLabel,
    nodeZone: order.region
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
    orderCategoryLabel(getOrderCategory(order)),
    order.description,
    order.title,
    getZoneLabel(order.region),
    getOrderFolio(order)
  ].join(' ');
}

function getOrderFolio(order) {
  const isNetwork = order?.detailKind === 'network' || /_red$|^red_/.test(String(order?.category || ''));
  const prefix = isNetwork ? 'RED' : (order?.category === 'instalacion' ? 'NEW' : 'DET');
  if (order?.folio) return String(order.folio).replace(/^(DET|NEW|RED)-/i, `${prefix}-`);
  const source = String(order?.id || order?.createdAt || 'detalle');
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) hash = ((hash * 31) + source.charCodeAt(index)) >>> 0;
  return `${prefix}-${String(hash % 1000000).padStart(6, '0')}`;
}

function getOrderDisplayType(order) {
  if (order?.category === 'instalacion') return 'Instalación nueva';
  if (order?.visitType === 'detalle') return 'Detalle agregado';
  return vl(order?.visitType || 'comunidad');
}

async function ensureOrderRelationRecords(order) {
  const tasks = [];
  if (order?.nodeId && !(state.nodes || []).some(item => item.id === order.nodeId)) {
    tasks.push(fetchDataPage('nodes',{id:order.nodeId,limit:1}).then(data => mergeOrderLookupRecords('nodes',data.nodes)));
  }
  if (order?.equipmentId && !(state.equipment || []).some(item => item.id === order.equipmentId)) {
    tasks.push(fetchDataPage('equipment',{id:order.equipmentId,limit:1}).then(data => mergeOrderLookupRecords('equipment',data.equipment)));
  }
  if (tasks.length) await Promise.all(tasks);
}

function applyRoleFormVisibility() {
  const isSoporte = typeof userHasRole === 'function' && userHasRole('administrador', 'admin', 'soporte');
  const isAtencion = typeof userHasRole === 'function' && userHasRole('atencion_clientes');
  const kindVal = document.getElementById('wo-detail-kind')?.value || activeOrderDetailKind;
  const isNetworkOrder = kindVal === 'network';

  const clientInput = document.getElementById('wo-client');
  const clientFi = clientInput?.closest('.fi') || document.getElementById('wo-client-field');
  const clientGrid = clientFi?.closest('.modal-grid') || document.getElementById('wo-client-grid');
  const phoneFi = document.getElementById('wo-phone')?.closest('.fi') || document.getElementById('wo-phone-field');
  const locationFi = document.getElementById('wo-location')?.closest('.fi') || document.getElementById('wo-location-field');
  const nodeInput = document.getElementById('wo-node');
  const nodeFi = nodeInput?.closest('.fi') || document.getElementById('wo-node-field');
  const nodeGrid = nodeFi?.closest('.modal-grid') || document.getElementById('wo-node-equipment-grid');
  const equipmentFi = document.getElementById('wo-equipment')?.closest('.fi') || document.getElementById('wo-equipment-field');
  const relationInfo = document.getElementById('wo-relation-info');
  const zoneInput = document.getElementById('wo-zone');
  const zoneFi = zoneInput?.closest('.fi') || document.getElementById('wo-zone-field');
  const assignFi = document.getElementById('wo-assign-field');
  const typeFi = document.getElementById('wo-type')?.closest('.fi') || document.getElementById('wo-type-field');
  const priorityFi = document.getElementById('wo-priority')?.closest('.fi') || document.getElementById('wo-priority-field');
  const priorityIntervalBox = document.getElementById('wo-priority-interval-box');
  const priorityLabel = priorityFi?.querySelector('label') || document.getElementById('wo-priority-label');
  const evidenceZone = document.getElementById('wo-evidence-zone');
  const detailKindFi = document.querySelector('#wo-mo .wo-detail-kind-field') || document.getElementById('wo-detail-kind-container');

  const categoryFi = document.getElementById('wo-category')?.closest('.fi') || document.getElementById('wo-category-field');
  const categoryLabel = categoryFi?.querySelector('label') || document.getElementById('wo-category-label');
  const detailFi = document.getElementById('wo-detail')?.closest('.fi') || document.getElementById('wo-detail-field');
  const detailLabel = detailFi?.querySelector('label') || document.getElementById('wo-detail-label');
  const detailTextarea = document.getElementById('wo-detail');
  const modalTitle = document.getElementById('wo-modal-title');
  const modalSub = document.querySelector('#wo-mo .modal-head p') || document.getElementById('wo-modal-subtitle');
  const saveBtn = document.querySelector('#wo-mo .card-actions .bc');

  if (!isNetworkOrder) {
    // ==========================================
    // DETALLE FÍSICO (Comunidad, antenas, campo)
    // ==========================================
    if (detailKindFi) detailKindFi.style.display = '';
    const detailKindLabel = document.getElementById('wo-detail-kind-label');
    if (detailKindLabel) detailKindLabel.textContent = 'Detalle físico';

    if (modalTitle) modalTitle.textContent = editingWOId ? 'Editar detalle físico' : 'Agregar detalle manual';
    if (modalSub) modalSub.textContent = 'Orden: cliente, categoría, detalle específico, pueblo, zona, tipo y prioridad.';
    if (saveBtn) saveBtn.textContent = 'Guardar detalle';

    // Cliente y teléfono (2 columnas en modal-grid)
    if (clientGrid) clientGrid.style.display = '';
    if (clientFi) {
      clientFi.style.display = '';
      const cLabel = clientFi.querySelector('label');
      if (cLabel) cLabel.textContent = 'NOMBRE CLIENTE';
    }
    if (clientInput) clientInput.placeholder = 'Nombre del cliente';

    if (phoneFi) {
      phoneFi.style.display = '';
      const pLabel = phoneFi.querySelector('label');
      if (pLabel) pLabel.textContent = 'NUMERO TELEFONICO OPCIONAL';
      const pInput = document.getElementById('wo-phone');
      if (pInput) pInput.placeholder = 'Numero de telefono (opcional)';
    }

    // Ubicación opcional (1 columna)
    if (locationFi) {
      locationFi.style.display = '';
      const lLabel = locationFi.querySelector('label');
      if (lLabel) lLabel.textContent = 'UBICACIÓN OPCIONAL';
      const lInput = document.getElementById('wo-location');
      if (lInput) lInput.placeholder = 'Solo si el cliente/detalle tiene ubicación propia';
    }

    // Categoría
    if (categoryFi) categoryFi.style.display = '';
    if (categoryLabel) categoryLabel.textContent = 'CATEGORÍA';

    // Detalle específico
    if (detailFi) detailFi.style.display = '';
    if (detailLabel) detailLabel.textContent = 'DETALLE ESPECÍFICO';
    if (detailTextarea) detailTextarea.placeholder = 'Describe exactamente lo que sucede, horario, alcance, equipo o referencia...';

    // Pueblo y Antena asignada (grid de 2 columnas)
    if (nodeGrid) {
      nodeGrid.style.display = 'grid';
      nodeGrid.style.gridTemplateColumns = '1fr 1fr';
    }
    if (nodeFi) {
      nodeFi.style.display = '';
      nodeFi.style.gridColumn = '';
      const nLabel = nodeFi.querySelector('label');
      if (nLabel) nLabel.textContent = 'PUEBLO';
    }
    if (nodeInput) nodeInput.placeholder = 'Busca un pueblo o escribe uno nuevo...';

    if (equipmentFi) {
      equipmentFi.style.display = '';
      const eLabel = equipmentFi.querySelector('label');
      if (eLabel) eLabel.textContent = 'ANTENA ASIGNADA';
      const eInput = document.getElementById('wo-equipment');
      if (eInput) {
        eInput.readOnly = true;
        eInput.placeholder = 'Se asigna automáticamente al elegir un pueblo';
      }
    }

    // Relation info box
    if (relationInfo) {
      relationInfo.style.display = '';
      updateWORelationInfo();
    }

    // Zona (visible y editable en detalles físicos)
    if (zoneFi) {
      zoneFi.style.display = '';
      const zLabel = zoneFi.querySelector('label');
      if (zLabel) zLabel.textContent = 'ZONA';
    }

    // Asignación (OCULTO en detalles físicos)
    if (assignFi) assignFi.style.display = 'none';

    // Tipo de trabajo y Prioridad
    if (typeFi) {
      typeFi.style.display = '';
      const tLabel = typeFi.querySelector('label');
      if (tLabel) tLabel.textContent = 'TIPO DE TRABAJO';
    }
    if (priorityFi) {
      priorityFi.style.display = '';
      if (priorityLabel) priorityLabel.textContent = 'PRIORIDAD';
    }
    // Ocultar caja de intervalo/recordatorio en físicos
    if (priorityIntervalBox) priorityIntervalBox.style.display = 'none';

    // Evidencias (OPCIONAL en detalles físicos)
    if (evidenceZone) {
      evidenceZone.style.display = '';
      const evidenceCopy = document.querySelector('#wo-evidence-zone .wo-evidence-copy strong');
      if (evidenceCopy) {
        evidenceCopy.innerHTML = 'Adjuntar evidencias <span class="optional-label" style="font-weight:normal;color:#64748b;margin-left:4px;">Opcional</span>';
      }
    }
    return;
  }

  // ==========================================
  // DETALLES DE RED
  // ==========================================
  if (detailKindFi) detailKindFi.style.display = 'none';
  if (equipmentFi) equipmentFi.style.display = 'none';
  if (relationInfo) relationInfo.style.display = 'none';
  if (zoneFi) zoneFi.style.display = 'none';
  if (priorityIntervalBox) priorityIntervalBox.style.display = 'inline-flex';

  const targetRole = getActiveNetworkTargetRole();
  const targetIsAttention = targetRole === 'atencion_clientes';
  const isAdmin = userHasRole('administrador', 'admin');

  const adminTargetFi = document.getElementById('wo-target-team-field');
  if (adminTargetFi) {
    adminTargetFi.style.display = isAdmin ? '' : 'none';
    const btnSoporte = document.getElementById('wo-target-btn-soporte');
    const btnAtencion = document.getElementById('wo-target-btn-atencion');
    if (btnSoporte) {
      btnSoporte.className = `btn bsm ${targetIsAttention ? 'bgh' : 'bc'}`;
    }
    if (btnAtencion) {
      btnAtencion.className = `btn bsm ${targetIsAttention ? 'bc' : 'bgh'}`;
    }
  }

  if (targetIsAttention) {
    // ------------------------------------------
    // DIRIGIDO A ATENCIÓN A CLIENTES (Requerimiento)
    // ------------------------------------------
    if (clientGrid) clientGrid.style.display = '';
    if (clientFi) {
      clientFi.style.display = '';
      const cLabel = clientFi.querySelector('label');
      if (cLabel) cLabel.textContent = 'Nombre del cliente (opcional)';
    }
    if (clientInput) clientInput.placeholder = 'Nombre del cliente (opcional si es consulta general)';
    if (phoneFi) {
      phoneFi.style.display = '';
      const pLabel = phoneFi.querySelector('label');
      if (pLabel) pLabel.textContent = 'Teléfono (opcional)';
    }
    if (locationFi) locationFi.style.display = 'none';
    if (nodeGrid) nodeGrid.style.display = 'none';
    if (typeFi) typeFi.style.display = 'none';
    if (evidenceZone) evidenceZone.style.display = 'none';

    if (assignFi) {
      assignFi.style.display = '';
      assignFi.style.gridColumn = '1 / -1';
    }
    const assignLabel = document.getElementById('wo-assign-label');
    if (assignLabel) assignLabel.textContent = 'Asignación a Atención a clientes';

    if (categoryLabel) categoryLabel.textContent = 'Categoría del requerimiento';
    if (detailLabel) detailLabel.textContent = 'Mensaje / Requerimiento para Atención a clientes';
    if (detailTextarea) detailTextarea.placeholder = 'Describe lo que necesitas consultar o solicitar a Atención a clientes...';
    if (priorityLabel) priorityLabel.textContent = 'Prioridad y frecuencia de recordatorio';

    if (modalTitle) modalTitle.textContent = editingWOId ? 'Editar requerimiento para Atención a clientes' : 'Nuevo requerimiento para Atención a clientes';
    if (modalSub) modalSub.textContent = 'Envía un requerimiento a Atención a clientes (el nombre del cliente es opcional).';
    if (saveBtn) saveBtn.textContent = editingWOId ? 'Actualizar requerimiento' : 'Enviar a Atención a clientes';
  } else {
    // ------------------------------------------
    // DIRIGIDO A SOPORTE TÉCNICO
    // ------------------------------------------
    if (clientGrid) clientGrid.style.display = '';
    if (clientFi) {
      clientFi.style.display = '';
      const cLabel = clientFi.querySelector('label');
      if (cLabel) cLabel.textContent = 'Nombre del cliente (opcional)';
    }
    if (clientInput) clientInput.placeholder = 'Nombre del cliente (opcional si es falla general)';

    if (phoneFi) {
      phoneFi.style.display = '';
      const pLabel = phoneFi.querySelector('label');
      if (pLabel) pLabel.textContent = 'Numero telefonico';
      const pInput = document.getElementById('wo-phone');
      if (pInput) pInput.placeholder = 'Numero de telefono (opcional)';
    }

    if (locationFi) {
      locationFi.style.display = '';
      const lLabel = locationFi.querySelector('label');
      if (lLabel) lLabel.textContent = 'Ubicación (opcional)';
      const lInput = document.getElementById('wo-location');
      if (lInput) lInput.placeholder = 'Coordenadas o referencia de ubicación';
    }

    if (categoryLabel) categoryLabel.textContent = 'Categoría';
    if (detailLabel) detailLabel.textContent = 'Detalle específico';
    if (detailTextarea) detailTextarea.placeholder = 'Describe exactamente lo que reportó el cliente...';

    // En red para soporte, pueblo va a ancho completo, sin antena
    if (nodeGrid) {
      nodeGrid.style.display = '';
      nodeGrid.style.gridTemplateColumns = '1fr';
    }
    if (nodeFi) {
      nodeFi.style.display = '';
      nodeFi.style.gridColumn = '1 / -1';
      const nLabel = nodeFi.querySelector('label');
      if (nLabel) nLabel.textContent = 'Pueblo';
    }
    if (nodeInput) nodeInput.placeholder = 'Busca un pueblo o escribe uno nuevo...';

    if (assignFi) {
      assignFi.style.display = '';
      assignFi.style.gridColumn = '1 / -1';
    }
    const assignLabel = document.getElementById('wo-assign-label');
    if (assignLabel) assignLabel.textContent = 'Asignación a Soporte técnico';

    if (typeFi) {
      typeFi.style.display = '';
      const tLabel = typeFi.querySelector('label');
      if (tLabel) tLabel.textContent = 'Tipo de trabajo';
    }
    if (priorityLabel) priorityLabel.textContent = 'Prioridad y frecuencia de recordatorio';

    if (evidenceZone) {
      evidenceZone.style.display = '';
      const evidenceCopy = document.querySelector('#wo-evidence-zone .wo-evidence-copy strong');
      if (evidenceCopy) {
        const isAdmin = typeof userHasRole === 'function' && userHasRole('administrador', 'admin');
        const isAttention = typeof userHasRole === 'function' && userHasRole('atencion_clientes');
        if (isAdmin || !isAttention || editingWOId) {
          evidenceCopy.innerHTML = 'Adjuntar evidencias <span class="optional-label" id="wo-evidence-req-label" style="font-weight:normal;color:#64748b;margin-left:4px;">Opcional</span>';
        } else {
          evidenceCopy.innerHTML = 'Adjuntar evidencias <span class="required-indicator" id="wo-evidence-req-label" style="color:#ef4444;font-weight:700;margin-left:4px;">* Obligatorio para Atención</span>';
        }
      }
    }

    if (modalTitle) modalTitle.textContent = editingWOId ? 'Editar reporte para Soporte' : 'Nuevo reporte de red para Soporte';
    if (modalSub) modalSub.textContent = 'Reporte: cliente, categoría, detalle específico y pueblo vinculado.';
    if (saveBtn) saveBtn.textContent = editingWOId ? 'Guardar detalle' : 'Enviar reporte a Soporte';
  }
}

async function openWO(id = '') {
  if (id) {
    const existing = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
    if (existing && (existing.status === 'completada' || existing.status === 'no_realizado')) {
      notify('Los detalles completados no pueden ser editados. Puedes reabrirlo con el botón de reabrir.', 'warn');
      return;
    }
  }
  editingWOId = id;
  copyingWOFromId = '';
  clearWOForm();
  if (!id) adminNetworkTargetRole = 'soporte';
  if (!document.getElementById('wo-phone')) document.getElementById('wo-client')?.closest('.fi')?.insertAdjacentHTML('afterend', '<div class="fi"><label>Numero telefonico <span class="optional-label">Opcional</span></label><input id="wo-phone" type="tel" placeholder="Numero de telefono (opcional)"></div>');
  let selectedAssignee = '';
  if (id) {
    const w = (state.workOrders || []).find(x => x.id === id);
    if (w) {
      try { await ensureOrderRelationRecords(w); } catch (error) { console.warn('No se pudieron cargar las relaciones de la orden',error); }
      const target = getOrderTarget(w);
      if (w.detailKind === 'network') {
        adminNetworkTargetRole = isNetworkSupportToAttention(w) ? 'atencion_clientes' : 'soporte';
      }
      selectedAssignee = w.assignedUserId || '';
      document.getElementById('wo-modal-title').textContent = 'Editar detalle';
      document.getElementById('wo-id').value = w.id;
      document.getElementById('wo-client').value = w.clientName || '';
      document.getElementById('wo-phone').value = w.clientPhone || w.phone || '';
      document.getElementById('wo-location').value = w.detailLocation || w.location || '';
      document.getElementById('wo-detail').value = w.description || w.title || '';
      syncWODetailKindField(w.detailKind === 'network' ? 'network' : 'physical');
      document.getElementById('wo-category').value = getOrderCategory(w);
      document.getElementById('wo-node-id').value = w.nodeId || '';
      document.getElementById('wo-node').value = w.nodeName || w.nodeCode || ''; // si estaba ligado a antena no forzamos nodo
      if (document.getElementById('wo-equipment-id')) document.getElementById('wo-equipment-id').value = w.equipmentId || '';
      if (document.getElementById('wo-equipment')) document.getElementById('wo-equipment').value = w.equipmentName || getOrderEquipment(w)?.name || '';
      document.getElementById('wo-zone').value = w.region || target.zone || '';
      document.getElementById('wo-type').value = w.visitType || 'comunidad';
      document.getElementById('wo-priority').value = w.priority || 'media';
      updateWOPriorityReminderHint(w.reminderIntervalMin);
      const report = w.technicianReport || {};
      woEvidencePhotos = [...new Set([...(Array.isArray(w.evidencePhotos) ? w.evidencePhotos : []),(Array.isArray(report.evidencePhotos) ? report.evidencePhotos : []),report.evidencePhoto].flat().filter(Boolean))].slice(0,6);
    }
  }
  renderWOAssignedUserOptions(selectedAssignee);
  updateWORelationInfo();
  setupOrderControls();
  renderWOEvidencePhotos();
    const reqLabel = document.getElementById('wo-evidence-req-label');
  const isAdminUser = typeof userHasRole === 'function' && userHasRole('administrador', 'admin');
  const isAttentionUser = typeof userHasRole === 'function' && userHasRole('atencion_clientes');
  const isNetworkKind = (document.getElementById('wo-detail-kind')?.value || activeOrderDetailKind) === 'network';
  if (reqLabel) {
    if (!isAdminUser && isAttentionUser && isNetworkKind && !editingWOId) {
      reqLabel.innerHTML = '<b class="req-star" style="color:#dc2626;font-weight:800;">* Obligatorio para Atención</b>';
    } else {
      reqLabel.innerHTML = '<span class="optional-label" style="font-weight:normal;color:#64748b;">Opcional</span>';
    }
  }
  applyRoleFormVisibility();
  OM('wo-mo');
}

function onWOPriorityChange(explicitMins) {
  const prioSelect = document.getElementById('wo-priority');
  const minutesInput = document.getElementById('wo-priority-minutes');
  if (!prioSelect || !minutesInput) return;
  const prio = prioSelect.value || 'media';
  if (explicitMins && Number(explicitMins) > 0) {
    minutesInput.value = Number(explicitMins);
    return;
  }
  const intervals = typeof getPriorityReminderMinutes === 'function' ? getPriorityReminderMinutes() : { baja: 45, media: 30, alta: 20, muy_alta: 10 };
  const mins = intervals[prio] || (prio === 'baja' ? 45 : prio === 'media' ? 30 : prio === 'alta' ? 20 : 10);
  minutesInput.value = mins;
}

function onWOPriorityMinutesInput() {
  const prioSelect = document.getElementById('wo-priority');
  const minutesInput = document.getElementById('wo-priority-minutes');
  if (!prioSelect || !minutesInput) return;
  const prio = prioSelect.value || 'media';
  const val = parseInt(minutesInput.value, 10);
  if (!isNaN(val) && val > 0 && typeof setPriorityReminderMinutes === 'function') {
    setPriorityReminderMinutes({ [prio]: val });
  }
}

function onWOPriorityMinutesChange() {
  onWOPriorityMinutesInput();
}

function updateWOPriorityReminderHint(explicitMins) {
  onWOPriorityChange(explicitMins);
}

function clearWOForm() {
  document.getElementById('wo-modal-title').textContent = 'Agregar detalle manual';
  ['wo-id', 'wo-node-id', 'wo-equipment-id', 'wo-client', 'wo-phone', 'wo-location', 'wo-detail', 'wo-node', 'wo-equipment', 'wo-assigned-user'].forEach(id => { const field = document.getElementById(id); if (field) field.value = ''; });
  const nodeInput = document.getElementById('wo-node');
  if (nodeInput) {
    delete nodeInput.dataset.newNodeName;
    nodeInput.classList.remove('wo-new-node-selected');
  }
  document.querySelectorAll('#wo-mo .wo-field-invalid').forEach(field => field.classList.remove('wo-field-invalid'));
  const saveButton = document.querySelector('#wo-mo .card-actions .bc');
  if (saveButton) saveButton.textContent = 'Guardar detalle';
  document.getElementById('wo-zone').value = '';
  document.getElementById('wo-type').value = 'comunidad';
  document.getElementById('wo-priority').value = 'baja';
  updateWOPriorityReminderHint();
  syncWODetailKindField(activeOrderDetailKind);
  renderWOAssignedUserOptions('');
  document.getElementById('wo-category').value = '';
  woEvidencePhotos = [];
  renderWOEvidencePhotos();
  const menu = document.getElementById('wo-node-suggestions');
  if (menu) menu.classList.remove('open');
  const eqMenu = document.getElementById('wo-equipment-suggestions');
  if (eqMenu) eqMenu.classList.remove('open');
  updateWORelationInfo();
  const reqLabel = document.getElementById('wo-evidence-req-label');
  const isAdminUser = typeof userHasRole === 'function' && userHasRole('administrador', 'admin');
  const isAttentionUser = typeof userHasRole === 'function' && userHasRole('atencion_clientes');
  const isNetworkKind = (document.getElementById('wo-detail-kind')?.value || activeOrderDetailKind) === 'network';
  if (reqLabel) {
    if (!isAdminUser && isAttentionUser && isNetworkKind && !editingWOId) {
      reqLabel.innerHTML = '<b class="req-star" style="color:#dc2626;font-weight:800;">* Obligatorio para Atención</b>';
    } else {
      reqLabel.innerHTML = '<span class="optional-label" style="font-weight:normal;color:#64748b;">Opcional</span>';
    }
  }
  applyRoleFormVisibility();
}

function showWOFieldError(fieldId,message) {
  const field = document.getElementById(fieldId);
  notify(message,'err');
  if (!field) return;
  document.querySelectorAll('#wo-mo .wo-field-invalid').forEach(item => item.classList.remove('wo-field-invalid'));
  field.classList.add('wo-field-invalid');
  field.focus({preventScroll:true});
  field.scrollIntoView({behavior:'smooth',block:'center'});
  setTimeout(() => field.classList.remove('wo-field-invalid'),2400);
}


async function saveWO() {
  const isSoporte = typeof userHasRole === 'function' && userHasRole('administrador', 'admin', 'soporte');
  const isAtencion = typeof userHasRole === 'function' && userHasRole('atencion_clientes');
  const kindVal = document.getElementById('wo-detail-kind')?.value || activeOrderDetailKind;
  const isNetwork = kindVal === 'network';
  const targetRole = isNetwork ? getActiveNetworkTargetRole() : '';
  const targetIsAttention = targetRole === 'atencion_clientes';
  const originRole = isNetwork ? (targetIsAttention ? 'soporte' : 'atencion_clientes') : '';

  let node = findNodeFromInput();
  const equipment = getSelectedEquipmentByHiddenId();
  const typedNode = document.getElementById('wo-node')?.value.trim() || '';
  const existingWO = editingWOId ? (state.workOrders || []).find(x => x.id === editingWOId) : null;
  const parsed = parseOptionalLocation(document.getElementById('wo-location')?.value || '');
  const category = document.getElementById('wo-category')?.value || '';
  const specificDetail = document.getElementById('wo-detail')?.value.trim() || '';
  const region = document.getElementById('wo-zone')?.value || node?.zone || equipment?.region || '';

  if (!isNetwork) {
    if (!document.getElementById('wo-client')?.value.trim()) return showWOFieldError('wo-client', 'Escribe el nombre del cliente.');
    if (!category) return showWOFieldError('wo-category', 'Selecciona la categoría del detalle.');
    if (!specificDetail) return showWOFieldError('wo-detail', 'Escribe el detalle específico del problema.');
    if (!typedNode) return showWOFieldError('wo-node', 'Busca un pueblo o escribe uno nuevo.');
    if (!node) return showWOFieldError('wo-node', 'Selecciona un pueblo registrado o pulsa “Agregar pueblo” para crearlo.');
    // En detalles físicos las evidencias son opcionales
  } else if (targetIsAttention) {
    if (!category) return showWOFieldError('wo-category', 'Selecciona la categoría del requerimiento.');
    if (!specificDetail) return showWOFieldError('wo-detail', 'Escribe el texto o mensaje del requerimiento para Atención a clientes.');
  } else {
    // Para reportes dirigidos a Soporte
    if (!category) return showWOFieldError('wo-category', 'Selecciona la categoría del detalle.');
    if (!specificDetail) return showWOFieldError('wo-detail', 'Escribe el detalle específico del problema.');
    if (!typedNode) return showWOFieldError('wo-node', 'Busca un pueblo o escribe uno nuevo.');
    if (!node) return showWOFieldError('wo-node', 'Selecciona un pueblo registrado o pulsa “Agregar pueblo” para crearlo.');

    // Evidencia obligatoria al subir reporte de red desde Atención a clientes (Opcional para Administrador)
    const existingEvidences = (existingWO?.technicianReport?.evidencePhotos || []).filter(Boolean);
    const isAdminUser = typeof userHasRole === 'function' && userHasRole('administrador', 'admin');
    if (!isAdminUser && !woEvidencePhotos.length && !existingEvidences.length && userHasRole('atencion_clientes')) {
      notify('Como Atención a clientes es obligatorio adjuntar al menos una evidencia fotográfica o captura.', 'err');
      const evZone = document.getElementById('wo-evidence-zone');
      if (evZone) {
        evZone.classList.add('wo-field-invalid');
        evZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => evZone.classList.remove('wo-field-invalid'), 2400);
      }
      return;
    }
  }

  const effectiveDetail = specificDetail || orderCategoryLabel(category);
  const assignedUserId = isNetwork ? (document.getElementById('wo-assigned-user')?.value.trim() || '') : '';
  const assignedUserName = isNetwork ? (document.getElementById('wo-assigned-names')?.value.trim() || '') : '';

  const selectedPriority = document.getElementById('wo-priority')?.value || 'media';
  const customReminderMins = isNetwork ? parseInt(document.getElementById('wo-priority-minutes')?.value, 10) : undefined;
  if (isNetwork && !isNaN(customReminderMins) && customReminderMins > 0 && typeof setPriorityReminderMinutes === 'function') {
    setPriorityReminderMinutes({ [selectedPriority]: customReminderMins });
  }

  // Antena asignada vinculada para órdenes físicas
  let linkedEquipmentId = '';
  let linkedEquipmentName = '';
  if (!isNetwork) {
    if (equipment?.id) {
      linkedEquipmentId = equipment.id;
      linkedEquipmentName = equipment.name || '';
    } else if (node?.id) {
      const linked = getNodeLinkedEquipment(node.id);
      if (linked.length) {
        linkedEquipmentId = linked.map(e => e.id).join(',');
        linkedEquipmentName = linked.map(e => e.name || e.ip || 'Antena').join(', ');
      }
    }
    if (!linkedEquipmentId && document.getElementById('wo-equipment-id')?.value) {
      linkedEquipmentId = document.getElementById('wo-equipment-id').value;
    }
    if (!linkedEquipmentName && document.getElementById('wo-equipment')?.value) {
      linkedEquipmentName = document.getElementById('wo-equipment').value;
    }
  }

  const payload = {
    clientName: (targetIsAttention && isNetwork)
      ? (document.getElementById('wo-client')?.value.trim() || 'Atención a clientes')
      : document.getElementById('wo-client').value.trim(),
    clientPhone: (!targetIsAttention || !isNetwork) ? (document.getElementById('wo-phone')?.value.trim() || '') : '',
    detailLocation: (!targetIsAttention || !isNetwork) ? (document.getElementById('wo-location')?.value.trim() || '') : '',
    category,
    detailKind: isNetwork ? 'network' : 'physical',
    targetRole,
    originRole,
    assignedUserId,
    assignedUserName,
    title: effectiveDetail,
    description: specificDetail,
    nodeId: (targetIsAttention && isNetwork) ? '' : (node?.id || ''),
    nodeCode: (targetIsAttention && isNetwork) ? (node?.nodeCode || typedNode || 'REQ') : (node?.nodeCode || typedNode),
    nodeName: (targetIsAttention && isNetwork) ? (node ? getNodeLabel(node) : (typedNode || 'Atención a clientes')) : (node ? getNodeLabel(node) : typedNode),
    town: (targetIsAttention && isNetwork) ? (node?.town || typedNode || 'General') : (node?.town || typedNode),
    region: (targetIsAttention && isNetwork) ? (region || 'General') : (region || node?.zone || ''),
    visitType: (!isNetwork && document.getElementById('wo-type')?.value) ? document.getElementById('wo-type').value : (isNetwork && !targetIsAttention && document.getElementById('wo-type')?.value ? document.getElementById('wo-type').value : 'comunidad'),
    priority: selectedPriority,
    reminderIntervalMin: (!isNaN(customReminderMins) && customReminderMins > 0) ? customReminderMins : undefined,
    // Para órdenes de NODO solo guardamos lat/lng cuando el usuario capturó ubicación válida.
    // No usamos la ubicación del nodo porque la orden puede ser de un cliente o referencia distinta.
    lat: (!targetIsAttention || !isNetwork) ? (parsed.lat || '') : '',
    lng: (!targetIsAttention || !isNetwork) ? (parsed.lng || '') : '',
    status: existingWO?.status || 'pendiente',
    equipmentId: linkedEquipmentId,
    equipmentName: linkedEquipmentName
  };
  const existingReport = existingWO?.technicianReport;
  if (woEvidencePhotos.length || existingReport) {
    payload.evidencePhotos = woEvidencePhotos.slice();
    payload.technicianReport = {
      ...(existingReport || {}),
      result:existingReport?.result || 'pendiente',
      evidencePhotos:woEvidencePhotos.slice(),
      evidencePhoto:woEvidencePhotos[0] || ''
    };
  }

  let savedOrder;
  if (editingWOId) {
    const w = (state.workOrders || []).find(x => x.id === editingWOId);
    if (!w) return;
    Object.assign(w, payload, { updatedAt: new Date().toISOString() });
    savedOrder = w;
    setUpdatedAudit(w, 'modificó orden');
  } else {
    const newOrder = { id: gid('wo'), createdAt: new Date().toISOString(), ...payload };
    if (copyingWOFromId) newOrder.sourceOrderId = copyingWOFromId;
    newOrder.folio = getOrderFolio(newOrder);
    setCreatedAudit(newOrder, 'agregó orden');
    state.workOrders.push(newOrder);
    savedOrder = newOrder;
  }

  const ok = await saveRecord('workOrders', savedOrder);
  if (!ok) return;

  CM('wo-mo');

  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(savedOrder, editingWOId ? 'updated' : 'new_order');
    }
  } catch (e) {
    console.warn('broadcastNetworkOrderChange error:', e);
  }

  if (!editingWOId) {
    const search = document.getElementById('wo-search');
    if (search) search.value = '';
    Object.values(activeOrderFilters).forEach(values => values.clear());
    const sort = document.getElementById('wo-sort');
    if (sort) sort.value = 'newest';
    orderCurrentPage = 1;
    renderActiveOrderFilters();
    renderOrderFilterMenus();
  }
  notify(editingWOId ? 'Detalle actualizado y sincronizado.' : 'Detalle creado y visible en la lista.');
  await loadOrderPage({scroll:!editingWOId});
}

function orderFilters() {
  return {
    q: normalizeName(document.getElementById('wo-search')?.value || ''),
    status: activeOrderFilters.status,
    type: activeOrderFilters.type,
    zone: activeOrderFilters.zone,
    priority: activeOrderFilters.priority,
    category: activeOrderFilters.category,
    creator: activeOrderFilters.creator,
    sort: document.getElementById('wo-sort')?.value || 'priority'
  };
}

function getOrderLifecycleRank(order) {
  const status = String(order?.status || 'pendiente').toLowerCase();
  const isSentToAttention = typeof isNetworkSupportToAttention === 'function' ? isNetworkSupportToAttention(order) : false;

  // 1° Resolver/Responder (requerimientos en atención) y Resolver (reportes de red en atención)
  if (status === 'en_revision') {
    return isSentToAttention ? 0 : 1;
  }
  // 2° Atender: pendientes y devueltos para iniciar atención
  if (status === 'pendiente' || status === 'devuelto_soporte') return 2;
  // 3° Y al final los resueltos (resueltos por soporte / en validación y completados)
  if (status === 'resuelto_soporte') return 3;
  if (['completada', 'no_realizado', 'revisado'].includes(status)) return 4;
  return 3;
}

function getOrderPriorityRank(order) {
  const prio = String(order?.priority || 'media').toLowerCase();
  if (prio === 'muy_alta') return 0;
  if (prio === 'alta') return 1;
  if (prio === 'media') return 2;
  return 3;
}

function filteredOrders() {
  const rawList = (state.workOrders || []).filter(w => !w.deletedAt);
  const activeSort = document.getElementById('wo-sort')?.value || 'priority';

  return rawList.slice().sort((a, b) => {
    // 1° Ciclo de vida: Atender -> Resolver -> Por validar -> Completados al final
    const rankA = getOrderLifecycleRank(a);
    const rankB = getOrderLifecycleRank(b);
    if (rankA !== rankB) return rankA - rankB;

    // Resent first
    const resentA = (a.status === 'pendiente' && a.lastResentAt) ? 0 : 1;
    const resentB = (b.status === 'pendiente' && b.lastResentAt) ? 0 : 1;
    if (resentA !== resentB) return resentA - resentB;

    if (activeSort === 'newest') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (activeSort === 'oldest') {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    }
    if (activeSort === 'town') {
      return (getOrderTown(a) || '').localeCompare(getOrderTown(b) || '', 'es');
    }
    if (activeSort === 'client') {
      return (a.clientName || '').localeCompare(b.clientName || '', 'es');
    }

    // Default: Prioridad y fecha
    const prioA = getOrderPriorityRank(a);
    const prioB = getOrderPriorityRank(b);
    if (prioA !== prioB) return prioA - prioB;

    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

function getOrderTown(order) {
  return getOrderNode(order)?.town || order.town || order.nodeName || order.nodeCode || '';
}

function formatOrderDate(value) {
  const date = new Date(value || 0);
  return isNaN(date.getTime()) ? '--' : date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function renderOrderStats() {
  const all = (state.workOrders || []).filter(w => !w.deletedAt);
  const counted = activeOrderDetailKind === 'physical'
    ? all.filter(w => !PHYSICAL_STATS_EXCLUDED_CATEGORIES.has(String(getOrderCategory(w) || '').toLowerCase()))
    : all;
  const remote = window.netopsPageMeta?.operations?.stats || {};
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  set('wo-total', Number.isFinite(Number(remote.total)) ? Number(remote.total) : counted.length);
  set('wo-pending', Number.isFinite(Number(remote.pending)) ? Number(remote.pending) : counted.filter(w => isOpenOrder(w)).length);
  set('wo-critical', Number.isFinite(Number(remote.critical)) ? Number(remote.critical) : counted.filter(w => isOpenOrder(w) && (w.priority === 'muy_alta' || w.priority === 'alta')).length);
  set('wo-done', Number.isFinite(Number(remote.done)) ? Number(remote.done) : counted.filter(w => w.status === 'completada').length);
}

async function markWODone(id) {
  const w = (state.workOrders || []).find(x => x.id === id);
  if (!w) return;
  const auditStart=Array.isArray(state.auditLog)?state.auditLog.length:0;
  if (w.status !== 'completada' && (w.detailKind === 'network' || userHasRole('administrador', 'admin', 'atencion_clientes'))) {
    openAdminDetailCompletion(w, async completion => {
      if (completion.withInformation) {
        w.clientName = completion.clientName;
        w.clientPhone = completion.clientPhone;
        w.detailLocation = completion.detailLocation;
        w.technicianReport = { ...(w.technicianReport || {}), ...completion.technicianReport };
      }
      w.status = 'completada';
      w.completedAt = new Date().toISOString();
      w.lastResentAt = '';
      appendOrderFollowUp(w,'solved','Solucionado',completion.note || '');
      setUpdatedAudit(w, completion.withInformation ? 'completó orden con información' : 'marcó lista orden');
      const saved = await saveRecordWithAudit('workOrders',w,auditStart);
      if (!saved) { notify('No se pudo guardar en la nube. Intenta de nuevo.', 'err'); return false; }
      try {
        if (typeof broadcastNetworkOrderChange === 'function') {
          broadcastNetworkOrderChange(w, 'confirmed');
        }
      } catch (e) {}
      await loadOrderPage();
      notify(completion.withInformation ? 'Información guardada y orden completada' : 'Orden completada');
      return true;
    }, w.detailKind === 'network' ? {
      forceInformation:true,
      freshEvidence:true,
      requireEvidence:true,
      hideSolution:true,
      subtitle:'Adjunta una captura donde el cliente confirme que el servicio mejoró antes de solucionar.',
      evidenceTitle:'Captura de confirmación del cliente <span>Obligatoria</span>',
      evidenceHelp:'Sube o pega una captura del mensaje donde el cliente confirme que mejoró. Esta evidencia es obligatoria.',
      evidenceError:'Adjunta la captura donde el cliente confirma que el servicio mejoró.'
    } : {});
    return;
  }
  w.status = 'completada';
  w.completedAt = new Date().toISOString();
  w.lastResentAt = '';
  appendOrderFollowUp(w,'solved','Solucionado');
  setUpdatedAudit(w, 'marcó lista orden');
  await saveRecordWithAudit('workOrders',w,auditStart);
  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(w, 'confirmed');
    }
  } catch (e) {}
  await loadOrderPage();
}

async function reopenCompletedWO(id) {
  const w = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!w) return notify('No se encontró el detalle solicitado.', 'err');
  if (w.status !== 'completada' && w.status !== 'no_realizado') {
    return notify('El detalle no se encuentra en estado concluido.', 'warn');
  }

  const isSentToAttention = isNetworkSupportToAttention(w);
  const isSoporte = userHasRole('administrador', 'admin', 'soporte');
  const isAtencion = userHasRole('atencion_clientes');

  // Regla institucional estricta: solo el área solicitante puede reabrir lo que envió a la contraparte
  if (w.detailKind === 'network') {
    if (isSentToAttention && !isSoporte) {
      return notify('Acción restringida: Únicamente el personal de Soporte técnico puede reabrir requerimientos dirigidos a Atención a clientes.', 'warn');
    }
    if (!isSentToAttention && !isAtencion) {
      return notify('Acción restringida: Únicamente el personal de Atención a clientes puede reabrir reportes de red dirigidos a Soporte técnico.', 'warn');
    }
  } else {
    if (!isSoporte) {
      return notify('Acción restringida: Únicamente Soporte técnico o Administración pueden reabrir detalles físicos concluidos.', 'warn');
    }
  }

  const folio = getOrderFolio(w);
  const confirmed = await askConfirmation({
    title: '¿Reabrir detalle?',
    message: 'El detalle volverá a estar pendiente para nueva atención.',
    confirmText: 'Sí, reabrir',
    cancelText: 'Cancelar',
    tone: 'warn'
  });
  if (!confirmed) return;

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || (isSoporte ? 'Soporte técnico' : 'Atención a clientes');
  const now = new Date().toISOString();

  w.status = 'pendiente';
  w.completedAt = '';
  w.updatedAt = now;
  w.updatedById = currentUser.id || '';
  w.reviewOpenedById = '';
  w.reviewOpenedByName = '';
  w.reviewOpenedByUsername = '';
  w.reviewOpenedAt = '';

  const reOpenLabel = isSentToAttention ? 'Requerimiento reabierto por Soporte técnico' : 'Reporte reabierto por Atención a clientes';
  appendSharedNetworkFollowUp(w, 'reabierto', reOpenLabel, `Reabierto formalmente por ${userName} para nueva revisión y atención.`);
  setUpdatedAudit(w, isSentToAttention ? 'reabrió requerimiento a Atención a clientes' : 'reabrió reporte de red a Soporte técnico');

  const auditStart = Array.isArray(state.auditLog) ? state.auditLog.length : 0;
  const saved = await saveRecordWithAudit('workOrders', w, auditStart);
  if (!saved) return notify('No se pudo reabrir el detalle. Por favor intente nuevamente.', 'err');

  if (typeof broadcastNetworkOrderChange === 'function') {
    broadcastNetworkOrderChange(w, 'reopened');
  }

  notify('Detalle reabierto.', 'ok');
  await loadOrderPage();
}

function getOrderStatusMeta(order) {
  if (order?.status === 'completada') return {label:getOrderCategory(order) === 'instalacion' ? 'Completado' : 'Concluido',className:'is-done',title:'Detalle concluido satisfactoriamente'};
  if (order?.status === 'resuelto_soporte') {
    return {
      label: 'Resuelto',
      title: 'Reporte resuelto',
      className: 'is-resolving'
    };
  }
  if (order?.status === 'devuelto_soporte') {
    return {
      label: 'Devuelto',
      title: 'Reporte devuelto para revisión',
      className: 'is-returned'
    };
  }
  if (order?.status === 'no_realizado') {
    return {
      label: 'No realizado',
      className: 'is-unresolvable',
      title: 'No fue posible solucionar la incidencia'
    };
  }
  if (order?.status === 'revisado') return {label:'Revisado',className:'is-reviewed',title:'Revisado'};
  if (order?.status === 'en_revision') {
    return {
      label: 'En atención',
      title: 'En proceso de atención',
      className: 'is-reviewing'
    };
  }
  return {label:'Pendiente',className:'is-pending',title:'Pendiente de atención'};
}

function orderReviewOpenedSummary(order) {
  if (!order?.reviewOpenedAt) return '';
  const openedAt = new Date(order.reviewOpenedAt);
  const dateLabel = Number.isNaN(openedAt.getTime()) ? order.reviewOpenedAt : openedAt.toLocaleString('es-MX');
  const actor = order.reviewOpenedByName || order.reviewOpenedByUsername || '';
  return actor ? `${dateLabel} · ${actor}` : dateLabel;
}

function orderViewedSummary(order) {
  const viewed = (Array.isArray(order?.followUps) ? order.followUps : []).slice().reverse().find(item => item.action === 'viewed');
  if (!viewed) return '';
  const viewedAt = new Date(viewed.at || '');
  const dateLabel = Number.isNaN(viewedAt.getTime()) ? String(viewed.at || '') : viewedAt.toLocaleString('es-MX');
  return viewed.byName ? `${dateLabel} · ${viewed.byName}` : dateLabel;
}

function orderNeedsReviewDecision(order) {
  return !!order && order.detailKind === 'network' && !order.deletedAt && !userHasRole('administrador','admin') && userHasRole('soporte') &&
    !order.reviewOpenedAt && !['completada','no_realizado','revisado','en_revision'].includes(order.status);
}

function rememberPendingOrderReviewDecision(orderId) {
  pendingOrderReviewDecisionId = String(orderId || '');
  if (pendingOrderReviewDecisionId) sessionStorage.setItem(ORDER_REVIEW_DECISION_KEY,pendingOrderReviewDecisionId);
}

function clearPendingOrderReviewDecision() {
  pendingOrderReviewDecisionId = '';
  sessionStorage.removeItem(ORDER_REVIEW_DECISION_KEY);
}

function interceptOrderReviewNavigation(event) {
  if (!pendingOrderReviewDecisionId || currentOrderReportId !== pendingOrderReviewDecisionId) return;
  if (!document.getElementById('order-tech-report-mo')?.classList.contains('open')) return;
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href]');
  if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
  const href = link.getAttribute('href') || '';
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  pendingOrderReviewReload = false;
  pendingOrderReviewDestination = new URL(link.href,window.location.href).href;
  showOrderReviewDecision(pendingOrderReviewDecisionId);
}

function recordUnconfirmedOrderReviewExit() {
  if (!pendingOrderReviewDecisionId || !userHasRole('administrador','admin','soporte')) return;
  const endpoint = `${typeof API === 'string' ? API : ''}/api/work-orders/review-exit`;
  const payload = new Blob([JSON.stringify({orderId:pendingOrderReviewDecisionId})],{type:'application/json'});
  const sent = typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(endpoint,payload);
  if (!sent) {
    void fetch(endpoint,{method:'POST',body:payload,credentials:'include',keepalive:true}).catch(() => {});
  }
}

async function markWOViewedOnOpen(order) {
  if (!order || order.deletedAt || !userHasRole('administrador','admin','soporte')) return false;
  if (order.detailKind !== 'network') return false;
  if (order.status === 'completada' || order.status === 'no_realizado') return false;
  const actor = getCurrentUser();
  const auditStart = Array.isArray(state.auditLog) ? state.auditLog.length : 0;
  appendOrderFollowUp(order,'viewed','Visto');
  setUpdatedAudit(order,'vio detalle de orden');
  const saved = await saveRecordWithAudit('workOrders',order,auditStart);
  if (saved && orderNeedsReviewDecision(order)) rememberPendingOrderReviewDecision(order.id);
  return saved;
}

function ensureOrderReviewDecisionModal() {
  let modal = document.getElementById('order-review-decision-mo');
  if (modal) return modal;
  document.body.insertAdjacentHTML('beforeend', `<div class="mo order-review-decision-mo" id="order-review-decision-mo">
    <div class="md order-review-decision-card" role="dialog" aria-modal="true" aria-labelledby="order-review-decision-title">
      <div id="order-review-decision-choice">
        <span class="order-review-decision-icon"><svg style="width:28px;height:28px;stroke:currentColor;fill:none;stroke-width:2;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
        <span id="order-review-decision-context" class="order-review-decision-context"></span>
        <h2 id="order-review-decision-title">¿Desea iniciar la atención técnica del detalle?</h2>
        <p>El detalle ha sido registrado como visto. Confirme si comenzará la atención técnica en este momento.</p>
        <div class="order-review-decision-actions"><button type="button" class="btn bc" onclick="saveOrderReviewDecision(true)">Iniciar atención técnica</button><button type="button" class="btn bgh" onclick="showOrderReviewReason()">Posponer atención</button></div>
      </div>
      <div id="order-review-decision-reason" hidden>
        <h2>Motivo por el cual se pospone la atención</h2>
        <p>El motivo quedará registrado en el historial de seguimiento del reporte.</p>
        <label class="fi"><span>Motivo de postergación <em>Obligatorio</em></span><textarea id="order-review-reason" rows="4" placeholder="Describa el motivo por el cual no se atiende en este momento..."></textarea></label>
        <div class="order-review-decision-actions"><button type="button" class="btn bgh" onclick="showOrderReviewDecisionChoice()">Volver</button><button type="button" class="btn bc" onclick="saveOrderReviewDecision(false)">Guardar motivo</button></div>
      </div>
    </div>
  </div>`);
  modal = document.getElementById('order-review-decision-mo');
  modal.addEventListener('netops:before-modal-close',event => event.preventDefault());
  return modal;
}

function showOrderReviewDecisionChoice() {
  const choice = document.getElementById('order-review-decision-choice');
  const reason = document.getElementById('order-review-decision-reason');
  if (choice) choice.hidden = false;
  if (reason) reason.hidden = true;
}

function showOrderReviewReason() {
  const choice = document.getElementById('order-review-decision-choice');
  const reason = document.getElementById('order-review-decision-reason');
  if (choice) choice.hidden = true;
  if (reason) reason.hidden = false;
  setTimeout(() => document.getElementById('order-review-reason')?.focus(),50);
}

function showOrderReviewDecision(orderId) {
  const order = (state.workOrders || []).find(item => item.id === orderId && !item.deletedAt);
  if (!order || !orderNeedsReviewDecision(order)) {
    clearPendingOrderReviewDecision();
    CM('order-tech-report-mo');
    return;
  }
  rememberPendingOrderReviewDecision(order.id);
  const modal = ensureOrderReviewDecisionModal();
  const context = document.getElementById('order-review-decision-context');
  if (context) context.textContent = `${getOrderFolio(order)} · ${getOrderPlace(order)}`;
  const reason = document.getElementById('order-review-reason');
  if (reason) reason.value = '';
  showOrderReviewDecisionChoice();
  OM(modal.id);
}

function requestCloseOrderReport() {
  if (pendingOrderReviewDecisionId && currentOrderReportId === pendingOrderReviewDecisionId) {
    pendingOrderReviewReload = false;
    pendingOrderReviewDestination = '';
    showOrderReviewDecision(pendingOrderReviewDecisionId);
    return;
  }
  currentOrderReportId = '';
  CM('order-tech-report-mo');
}

async function saveOrderReviewDecision(attendNow) {
  const order = (state.workOrders || []).find(item => item.id === pendingOrderReviewDecisionId && !item.deletedAt);
  if (!order) {
    pendingOrderReviewDestination = '';
    clearPendingOrderReviewDecision();
    CM('order-review-decision-mo');
    return notify('No se encontró el detalle solicitado.','err');
  }
  const reason = document.getElementById('order-review-reason')?.value.trim() || '';
  if (!attendNow && !reason) {
    notify('Escribe el motivo por el que no se revisará en este momento.','err');
    document.getElementById('order-review-reason')?.focus();
    return;
  }
  const buttons = document.querySelectorAll('#order-review-decision-mo button');
  buttons.forEach(button => { button.disabled = true; });
  const actor = getCurrentUser();
  const auditStart = Array.isArray(state.auditLog) ? state.auditLog.length : 0;
  if (attendNow) {
    order.status = 'en_revision';
    order.reviewOpenedAt = new Date().toISOString();
    order.reviewOpenedById = actor.id || '';
    order.reviewOpenedByName = actor.name || actor.username || 'Administrador';
    order.reviewOpenedByUsername = actor.username || '';
    appendOrderFollowUp(order,'review_opened','En revisión');
    setUpdatedAudit(order,'confirmó que atenderá el detalle');
  } else {
    appendOrderFollowUp(order,'review_deferred','No se atenderá ahora',reason);
    setUpdatedAudit(order,'pospuso la revisión del detalle');
  }
  const saved = await saveRecordWithAudit('workOrders',order,auditStart);
  buttons.forEach(button => { button.disabled = false; });
  if (!saved) return;
  const shouldReload = pendingOrderReviewReload;
  const destination = pendingOrderReviewDestination;
  pendingOrderReviewReload = false;
  pendingOrderReviewDestination = '';
  clearPendingOrderReviewDecision();
  currentOrderReportId = '';
  CM('order-review-decision-mo');
  CM('order-tech-report-mo');
  if (destination) {
    window.location.href = destination;
    return;
  }
  if (shouldReload) {
    window.location.reload();
    return;
  }
  await loadOrderPage();
  notify(attendNow ? 'El detalle quedó En revisión.' : 'El motivo quedó guardado y el detalle sigue pendiente.');
}

function getOrderActionNote() {
  return document.getElementById('order-action-note')?.value.trim() || '';
}

function appendOrderFollowUp(order,action,label,note = '') {
  const actor = getCurrentUser();
  const event = {
    id:gid('ofu'),
    action,
    label,
    note:String(note || '').trim(),
    at:new Date().toISOString(),
    byId:actor.id || '',
    byName:actor.name || actor.username || 'Usuario'
  };
  order.followUps = [...(Array.isArray(order.followUps) ? order.followUps : []),event].slice(-50);
  return event;
}

function resetOrderReportForResend(order) {
  const report = order.technicianReport;
  if (!report || typeof report !== 'object') return;
  const hadResult = report.result && report.result !== 'pendiente';
  if (hadResult || report.completedAt) {
    report.history = [...(Array.isArray(report.history) ? report.history : []),{
      result:report.result || '',
      solution:report.solution || '',
      reason:report.reason || '',
      observations:report.observations || '',
      completedAt:report.completedAt || '',
      completedByName:report.completedByName || ''
    }].slice(-20);
  }
  report.result = 'pendiente';
  report.completedAt = '';
  report.completedBy = '';
  report.completedByName = '';
  report.solution = '';
  report.reason = '';
}

async function saveOrderWorkflow(order,auditAction,message,{ firstPage = false } = {}) {
  const auditStart = Array.isArray(state.auditLog) ? state.auditLog.length : 0;
  order.updatedAt = new Date().toISOString();
  setUpdatedAudit(order,auditAction);
  const saved = await saveRecordWithAudit('workOrders',order,auditStart);
  if (!saved) return false;
  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      const trans = order.detailKind === 'physical' ? 'sent_to_physical' : (order.status === 'pendiente' ? 'resent' : 'updated');
      broadcastNetworkOrderChange(order, trans);
    }
  } catch (e) {}
  CM('order-actions-mo');
  if (firstPage) orderCurrentPage = 1;
  await loadOrderPage();
  notify(message);
  return true;
}

async function markWOReviewed(id) {
  const order = (state.workOrders || []).find(item => item.id === id && !item.deletedAt);
  if (!order || order.status === 'completada') return;
  const note = getOrderActionNote();
  if (!note) {
    notify('Describe qué se hizo para intentar solucionarlo.','err');
    document.getElementById('order-action-note')?.focus();
    return;
  }
  order.status = 'revisado';
  order.reviewedAt = new Date().toISOString();
  order.lastResentAt = '';
  appendOrderFollowUp(order,'reviewed','Revisado',note);
  await saveOrderWorkflow(order,'revisó detalle','Detalle marcado como revisado.');
}

async function markWOSameIssue(id) {
  const order = (state.workOrders || []).find(item => item.id === id && !item.deletedAt);
  if (!order || order.status === 'completada') return;
  const note = getOrderActionNote();
  const now = new Date().toISOString();
  order.status = 'no_realizado';
  order.completedAt = now;
  order.lastResentAt = '';
  order.technicianReport = {
    ...(order.technicianReport || {}),
    result:'no_realizado',
    reason:note || 'El problema continúa sin solución.',
    completedAt:now
  };
  appendOrderFollowUp(order,'same_issue','Sigue el mismo tema',note);
  await saveOrderWorkflow(order,'marcó que sigue el mismo tema','Detalle marcado como no solucionado.');
}

async function resendWO(id) {
  const order = (state.workOrders || []).find(item => item.id === id && !item.deletedAt);
  if (!order) return;
  if (order.status === 'completada') return notify('Un detalle solucionado debe copiarse como uno nuevo.','warn');
  const note = getOrderActionNote();
  order.status = 'pendiente';
  order.completedAt = '';
  order.reviewOpenedAt = '';
  order.reviewOpenedById = '';
  order.reviewOpenedByName = '';
  order.reviewOpenedByUsername = '';
  order.reviewedAt = '';
  order.lastResentAt = new Date().toISOString();
  resetOrderReportForResend(order);
  appendOrderFollowUp(order,'resent','Volver a enviar',note);
  await saveOrderWorkflow(order,'volvió a enviar detalle',note ? 'Detalle reenviado con información nueva.' : 'Detalle reenviado sin crear otro folio.',{ firstPage:true });
}

async function sendWOToPhysical(id) {
  const order = (state.workOrders || []).find(item => item.id === id && !item.deletedAt);
  if (!order || order.detailKind !== 'network') return;
  const note = getOrderActionNote();
  if (!note) {
    notify('Describe el detalle físico que se presentó.','err');
    document.getElementById('order-action-note')?.focus();
    return;
  }
  const previousCategory = orderCategoryLabel(getOrderCategory(order));
  const previousDetail = order.description || order.title || '';
  order.detailKind = 'physical';
  order.category = 'otro';
  order.title = note;
  order.description = note;
  order.status = 'pendiente';
  order.completedAt = '';
  order.reviewOpenedAt = '';
  order.reviewOpenedById = '';
  order.reviewOpenedByName = '';
  order.reviewOpenedByUsername = '';
  order.reviewedAt = '';
  order.lastResentAt = new Date().toISOString();
  resetOrderReportForResend(order);
  appendOrderFollowUp(order,'physical','Enviado a detalle físico',`${note} · Origen de red: ${previousCategory}${previousDetail ? ` · Reporte original: ${previousDetail}` : ''}`);
  await saveOrderWorkflow(order,'envió detalle a físicos','El mismo folio fue enviado a Detalles físicos.');
}

async function promptSendNetworkToPhysical(id) {
  const order = (state.workOrders || []).find(item => item.id === id && !item.deletedAt);
  if (!order) return notify('No se encontró el detalle solicitado.', 'err');

  const client = order.clientName || 'el cliente';
  const folio = getOrderFolio(order);
  const promptMessage = `Derivar folio ${folio} (${client}) directo a Detalles Físicos.\n\nEscribe el motivo o instrucción para la visita en campo:`;
  const defaultNote = 'Requiere visita presencial para revisión física en sitio.';
  const reason = window.prompt(promptMessage, defaultNote);
  if (reason === null) return;
  const note = reason.trim() || defaultNote;

  const previousCategory = orderCategoryLabel(getOrderCategory(order));
  const previousDetail = order.description || order.title || '';
  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || 'Atención a clientes';
  const now = new Date().toISOString();

  order.detailKind = 'physical';
  order.category = 'otro';
  order.title = note;
  order.description = note;
  order.status = 'pendiente';
  order.completedAt = '';
  order.reviewOpenedAt = '';
  order.reviewOpenedById = '';
  order.reviewOpenedByName = '';
  order.reviewOpenedByUsername = '';
  order.reviewedAt = '';
  order.lastResentAt = now;
  order.updatedAt = now;
  order.updatedById = currentUser.id || '';

  resetOrderReportForResend(order);
  appendSharedNetworkFollowUp(
    order,
    'physical',
    'Derivado a Detalle Físico',
    `${note} · Solicitado por: ${userName} · Origen: ${previousCategory}${previousDetail ? ` · Reporte original: ${previousDetail}` : ''}`
  );
  setUpdatedAudit(order, 'derivó detalle de red a detalles físicos para visita en campo');

  const saved = await saveRecord('workOrders', order);
  if (!saved) {
    notify('No se pudo derivar la orden a detalles físicos. Intente nuevamente.', 'err');
    return;
  }

  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(order, 'sent_to_physical');
    }
  } catch (e) {
    console.warn('broadcastNetworkOrderChange error:', e);
  }

  notify(`El folio ${folio} fue transferido a Detalles Físicos exitosamente.`, 'ok');
  await loadOrderPage();
}

async function openWOCopy(id) {
  const source = (state.workOrders || []).find(item => item.id === id && !item.deletedAt);
  if (!source) return;
  if (source.status !== 'completada') return notify('Solo puedes copiar un detalle que ya esté solucionado. Para uno abierto usa Volver a enviar.','warn');
  CM('order-actions-mo');
  await openWO(id);
  editingWOId = '';
  copyingWOFromId = id;
  document.getElementById('wo-id').value = '';
  document.getElementById('wo-modal-title').textContent = 'Copiar como nuevo detalle';
  const saveButton = document.querySelector('#wo-mo .card-actions .bc');
  if (saveButton) saveButton.textContent = 'Crear nuevo detalle';
  woEvidencePhotos = [];
  renderWOEvidencePhotos();
}

function solveWOFromActions(id) {
  CM('order-actions-mo');
  void markWODone(id);
}

function hideOrderActionForm() {
  const form = document.getElementById('order-action-form');
  if (form) form.hidden = true;
}

function showOrderActionForm(id,mode) {
  const settings = {
    reviewed:{label:'¿Qué se hizo para intentar solucionarlo?',hint:'Obligatorio',placeholder:'Describe la revisión, ajuste o prueba realizada...',button:'Guardar como revisado',handler:'markWOReviewed'},
    physical:{label:'¿Qué detalle físico se presentó?',hint:'Obligatorio',placeholder:'Describe la falla física detectada y lo que debe atenderse...',button:'Enviar a detalles físicos',handler:'sendWOToPhysical'},
    same:{label:'Información nueva',hint:'Opcional',placeholder:'Agrega únicamente lo nuevo que reportó el cliente, si existe...',button:'Guardar: sigue el mismo tema',handler:'markWOSameIssue'}
  };
  const setting = settings[mode];
  const form = document.getElementById('order-action-form');
  if (!setting || !form) return;
  document.getElementById('order-action-note-label').textContent = setting.label;
  const hint = document.getElementById('order-action-note-hint');
  hint.textContent = setting.hint;
  hint.classList.toggle('is-required',mode !== 'same');
  const textarea = document.getElementById('order-action-note');
  textarea.value = '';
  textarea.placeholder = setting.placeholder;
  const confirm = document.getElementById('order-action-confirm');
  confirm.textContent = setting.button;
  confirm.setAttribute('onclick',`${setting.handler}('${id}')`);
  form.hidden = false;
  setTimeout(() => textarea.focus(),50);
}

function openOrderActions(id) {
  const order = (state.workOrders || []).find(item => item.id === id && !item.deletedAt);
  if (!order) return notify('No se encontró el detalle solicitado.','err');
  if (order.detailKind !== 'network') return notify('Estas acciones solo están disponibles para detalles de red.','warn');
  const status = getOrderStatusMeta(order);
  const solved = order.status === 'completada';
  let modal = document.getElementById('order-actions-mo');
  if (!modal) {
    document.body.insertAdjacentHTML('beforeend','<div class="mo order-actions-mo" id="order-actions-mo"><div class="md order-actions-card" id="order-actions-card"></div></div>');
    modal = document.getElementById('order-actions-mo');
  }
  document.getElementById('order-actions-card').innerHTML = `
    <div class="modal-head"><div><h2>Acciones del detalle</h2><p>${orderEscape(getOrderFolio(order))} · Creado ${orderEscape(formatOrderDate(order.createdAt))}</p></div><button type="button" class="wo-modal-close" aria-label="Cerrar" onclick="CM('order-actions-mo')"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="order-action-current"><span>Estado actual</span><strong class="order-status-badge ${status.className}">${status.label}</strong></div>
    ${order.reviewOpenedAt ? `<p class="order-action-review-meta">Abierta para revisión: <strong>${orderEscape(orderReviewOpenedSummary(order))}</strong></p>` : ''}
    <div class="order-workflow-actions">
      ${!solved ? `<button type="button" class="btn action-reviewed" onclick="showOrderActionForm('${orderEscape(id)}','reviewed')">Revisado</button><button type="button" class="btn action-solved" onclick="solveWOFromActions('${orderEscape(id)}')">Solucionado</button>` : ''}
      ${!solved && order.detailKind === 'network' ? `<button type="button" class="btn action-physical" onclick="showOrderActionForm('${orderEscape(id)}','physical')">Detalle físico</button>` : ''}
      ${!solved ? `<button type="button" class="btn action-same" onclick="showOrderActionForm('${orderEscape(id)}','same')">Sigue el mismo tema</button><button type="button" class="btn action-resend" onclick="resendWO('${orderEscape(id)}')">Volver a enviar</button>` : ''}
      <button type="button" class="btn action-copy" ${solved ? `onclick="openWOCopy('${orderEscape(id)}')"` : 'disabled title="Disponible cuando esté solucionado"'}>Copiar como nuevo</button>
    </div>
    <div id="order-action-form" class="order-action-form" hidden>
      <label class="fi order-action-note"><span><b id="order-action-note-label"></b> <em id="order-action-note-hint"></em></span><textarea id="order-action-note" rows="3"></textarea></label>
      <div><button type="button" class="btn bgh" onclick="hideOrderActionForm()">Cancelar</button><button type="button" class="btn bc" id="order-action-confirm">Guardar</button></div>
    </div>
    <p class="order-action-help">Volver a enviar conserva el folio y la fecha de creación. Copiar genera un folio nuevo y solo está disponible al estar solucionado.</p>`;
  OM('order-actions-mo');
}

async function deleteWO(id) {
  const w = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!w) return;
  await handleProtectedDelete({
    targetType:'detail',
    targetId:id,
    targetName:w.clientName || w.title || w.description || 'detalle',
    applyDelete:() => {
      setDeletedAudit(w, 'elimino orden');
      try {
        if (typeof broadcastNetworkOrderChange === 'function') {
          broadcastNetworkOrderChange(w, 'deleted');
        }
      } catch (e) {}
    },
    refresh:() => { void loadOrderPage(); }
  });
}

function getOrderLocationInfo(order) {
  const raw = String(order.detailLocation || order.location || '').trim();

  // En la tabla de Órdenes solo se muestra la ubicación capturada en la orden.
  // No usamos coordenadas del nodo ni de la antena, porque esa columna es del cliente/detalle.
  const parsed = getLocationDisplay(raw);
  const lat = safeFloat(parsed.lat);
  const lng = safeFloat(parsed.lng);
  const hasCoords = !isNaN(lat) && !isNaN(lng);
  return {
    raw,
    source: raw ? 'manual' : 'none',
    lat,
    lng,
    hasCoords,
    hasLocation: parsed.hasLocation,
    label: parsed.label,
    url: parsed.url
  };
}

function renderOrderLocationCell(order) {
  const loc = getOrderLocationInfo(order);
  if (!loc.url) {
    return `<span class="order-location-muted ${loc.hasLocation ? '' : 'no-location'}">${orderEscape(loc.label || 'Sin ubicacion')}</span>`;
  }
  return `
    <a class="order-location-link" href="${loc.url}" target="_blank" rel="noopener">Abrir Maps</a>
    <div class="order-location-muted">${orderEscape(loc.label)}</div>`;
}

function getOrderPlace(order) {
  const node = getOrderNode(order);
  const code = String(node?.nodeCode || order.nodeCode || '').trim();
  const name = String(node?.town || order.town || order.nodeName || '').trim();
  if (code && name && !normalizeName(name).includes(normalizeName(code))) return `${code} · ${name}`;
  if (name || code) return name || code;
  const equipment = order.equipmentId ? (state.equipment || []).find(item => item.id === order.equipmentId && !item.deletedAt) : null;
  return equipment?.name || order.equipmentName || 'Sin lugar ligado';
}

function getOrderReportPhotos(order) {
  if (!order) return [];
  const list = [];
  const seen = new Set();
  const add = (url) => {
    if (url && typeof url === 'string' && !seen.has(url)) {
      seen.add(url);
      list.push(url);
    }
  };

  // 1. Fotos adjuntas al registrar la orden
  if (Array.isArray(order.evidencePhotos)) order.evidencePhotos.forEach(add);
  if (order.evidencePhoto) add(order.evidencePhoto);

  // 2. Fotos del reporte técnico
  const report = order.technicianReport || {};
  if (Array.isArray(report.evidencePhotos)) report.evidencePhotos.forEach(add);
  if (Array.isArray(report.photos)) report.photos.forEach(add);
  if (report.evidencePhoto) add(report.evidencePhoto);

  // 3. Fotos en seguimientos de devolución, resolución o no realizable
  if (Array.isArray(order.followUps)) {
    for (const f of order.followUps) {
      if (Array.isArray(f.photos)) f.photos.forEach(add);
      if (Array.isArray(f.evidencePhotos)) f.evidencePhotos.forEach(add);
      if (f.photo) add(f.photo);
    }
  }

  return list;
}

function orderHasViewableReport(order) {
  const report = order?.technicianReport || {};
  const hasDetails = !!(report.solution || report.reason || report.observations || report.materialUsed);
  return hasDetails && getOrderReportPhotos(order).length > 0;
}

async function openOrderTechnicianReport(orderId) {
  let order = (state.workOrders || []).find(item => item.id === orderId && !item.deletedAt);
  if (!order) return notify('No se encontro el detalle solicitado.', 'err');
  if (typeof markNotificationReadByOrderId === 'function') {
    markNotificationReadByOrderId(orderId);
  }
  await markWOViewedOnOpen(order);
  order = (state.workOrders || []).find(item => item.id === orderId && !item.deletedAt) || order;
  currentOrderReportId = order.id;
  const report = order.technicianReport || {};
  const completed = order.status === 'completada' || !!report.completedAt;
  const reportStatus = getOrderStatusMeta(order).label;
  const detailDate = completed ? (report.completedAt || order.completedAt || order.updatedAt) : (order.createdAt || order.updatedAt);
  const photos = getOrderReportPhotos(order);
  const legacyPhone = String(order.description || '').match(/Tel[eé]fono:\s*([^\n]+)/i)?.[1]?.trim() || '';
  const phone = order.clientPhone || order.phone || report.phone || legacyPhone || 'Sin número registrado';
  const capturedLocation = report.location || order.detailLocation || 'Sin ubicación registrada';
  const requestedDetail = getWorkOrderRequestedText(order, orderCategoryLabel(getOrderCategory(order)));
  const materialItems = Array.isArray(report.materialItems) ? report.materialItems : [];
  const viewedSummary = order.detailKind === 'network' ? orderViewedSummary(order) : '';
  const visibleFollowUps = (Array.isArray(order.followUps) ? order.followUps : [])
    .filter(item => order.detailKind === 'network' || item.action !== 'viewed');
  let modal = document.getElementById('order-tech-report-mo');
  if (!modal) {
    document.body.insertAdjacentHTML('beforeend', '<div class="mo order-tech-report-mo" id="order-tech-report-mo"><div class="md order-tech-report-card" id="order-tech-report-card"></div></div>');
    modal = document.getElementById('order-tech-report-mo');
    modal.addEventListener('click',event => { if (event.target === modal) requestCloseOrderReport(); });
    modal.addEventListener('netops:before-modal-close',event => {
      if (!pendingOrderReviewDecisionId || currentOrderReportId !== pendingOrderReviewDecisionId) return;
      event.preventDefault();
      requestCloseOrderReport();
    });
  }
  const card = document.getElementById('order-tech-report-card');
  card.classList.toggle('is-completed-report', completed);
  card.innerHTML = `<div class="modal-head order-report-head"><div class="order-report-head-main"><span class="order-report-title-icon">${orderReportIcon('clipboard')}</span><div><h2>${completed ? 'Reporte del técnico' : 'Detalle de la orden'}</h2><p>${orderReportIcon('pin')}<span>${orderEscape(getOrderPlace(order))}</span><em>${orderEscape(getOrderFolio(order))}</em></p></div></div><button type="button" class="order-report-close" aria-label="Cerrar" onclick="requestCloseOrderReport()"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="order-report-summary">
      ${orderReportField('user', 'Nombre del cliente', order.clientName || 'Sin nombre')}
      ${orderReportField('phone', 'Número telefónico', phone)}
      ${orderReportField('pin', 'Lugar', getOrderPlace(order))}
      ${orderReportField('target', 'Ubicación capturada', capturedLocation)}
      ${orderReportField('check', 'Estado', `<span class="order-report-status ${order.status === 'completada' ? 'is-completed' : (order.status === 'resuelto_soporte' ? 'is-resolving' : (order.status === 'devuelto_soporte' ? 'is-returned' : (order.status === 'no_realizado' ? 'is-failed' : 'is-pending')))}">${orderEscape(reportStatus)}</span>`, { raw: true, className: 'status-field' })}
      ${orderReportField('user', 'Capturado por', renderUserColorChip(order.createdByName || order.createdByUsername || 'Sin registro', order.createdById), { raw: true })}
      ${orderReportField('user', 'Asignado a', order.assignedUserName ? renderUserColorChip(order.assignedUserName, order.assignedUserId) : '<span style="color:#64748b;font-weight:600;font-size:12px;">Sin asignar</span>', { raw: true })}
      ${orderReportField('check', 'Resuelto por', (() => {
        const resolverName = report.completedByName || order.completedByName || (visibleFollowUps.find(f => f.action === 'resuelto_soporte' || f.action === 'solved')?.user) || '';
        const resolverId = report.completedBy || report.completedById || '';
        if (resolverName) {
          const chip = renderUserColorChip(resolverName, resolverId);
          if (order.status === 'completada') {
            return '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' + chip + ' <span style="font-size:11px;color:#059669;font-weight:700;">✓ Aceptado y concluido por Atención</span></div>';
          }
          if (order.status === 'resuelto_soporte') {
            return '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' + chip + ' <span style="font-size:11px;color:#d97706;font-weight:700;">⏳ En revisión de Atención</span></div>';
          }
          return chip;
        }
        if (order.status === 'no_realizado') {
          return '<span style="color:#dc2626;font-weight:600;font-size:12px;font-style:italic;">No realizable (Sin resolver)</span>';
        }
        return '<span style="color:#64748b;font-weight:600;font-size:12px;font-style:italic;">Pendiente de resolución</span>';
      })(), { raw: true })}
      ${orderReportField('calendar', 'Fecha de creación', order.createdAt ? new Date(order.createdAt).toLocaleString('es-MX') : 'Sin fecha')}
      ${viewedSummary ? orderReportField('check', 'Visto', viewedSummary) : ''}
      ${order.reviewOpenedAt ? orderReportField('calendar', 'Abierta para revisión', orderReviewOpenedSummary(order)) : ''}
      ${completed ? orderReportField('calendar', 'Fecha y hora del reporte', detailDate ? new Date(detailDate).toLocaleString('es-MX') : 'Sin fecha') : ''}
      ${orderReportField('work', 'Tipo de trabajo', getOrderDisplayType(order))}
      ${orderReportField('flag', 'Prioridad', pl(order.priority || 'media'))}
      ${orderReportField('tag', 'Categoría', orderCategoryLabel(getOrderCategory(order)))}
    </div>
    <section class="order-report-block order-report-request"><span class="order-report-field-icon">${orderReportIcon('clipboard')}</span><div><small>Detalle solicitado</small><p>${orderEscape(requestedDetail)}</p></div></section>
    ${report.solution ? `<section class="order-report-block"><small>Trabajo realizado</small><p>${orderEscape(report.solution)}</p></section>` : ''}
    ${report.observations ? `<section class="order-report-block"><small>Observaciones</small><p>${orderEscape(report.observations)}</p></section>` : ''}
    ${report.reason ? `<section class="order-report-block warning"><small>Motivo</small><p>${orderEscape(report.reason)}</p></section>` : ''}
    ${report.materialUsed ? `<section class="order-report-block"><small>Material utilizado</small><p>${orderEscape(report.materialUsed)}</p></section>` : ''}
    ${renderOrderFollowUpTimeline(visibleFollowUps)}
    ${materialItems.length ? `<section class="order-report-block"><small>Materiales registrados</small><div class="order-report-materials">${materialItems.map(item => `<span><strong>${orderEscape(item.name || item.nombre || 'Material')}</strong> · ${orderEscape(item.quantity ?? item.cantidad ?? '')} ${orderEscape(item.unit || item.unidad || '')}</span>`).join('')}</div></section>` : ''}
    <section class="order-report-evidence-strip">
      <div class="evidence-strip-head">
        <strong>Evidencias gráficas registradas (${photos.length})</strong>
        <span class="evidence-strip-sub">Fotografías y capturas del flujo completo</span>
      </div>
      ${photos.length ? `
        <div class="evidence-strip-grid">
          ${photos.map((photo, index) => `
            <button type="button" class="evidence-strip-thumb" onclick="openOrderReportEvidence('${orderEscape(order.id)}', ${index})" title="Ver evidencia ${index + 1}">
              <img src="${orderEscape(photo)}" alt="Evidencia ${index + 1}">
              <span class="evidence-strip-num">${index + 1}</span>
            </button>
          `).join('')}
        </div>
      ` : `
        <div class="evidence-strip-empty">Sin evidencias fotográficas adjuntas.</div>
      `}
    </section>
    ${!completed ? (order.status === 'resuelto_soporte' ? '<div class="order-report-pending" style="background:#ecfdf5;color:#047857;border-color:#a7f3d0"><strong>✓ Resuelto por Soporte:</strong> En espera de que Atención a clientes confirme la satisfacción con el cliente.</div>' : (order.status === 'devuelto_soporte' ? `<div class="order-report-pending" style="background:#fff1f2;color:#be123c;border-color:#fecdd3"><strong>⚠️ Devuelto a Soporte:</strong> ${orderEscape(order.returnReason || 'Atención a clientes indicó que el cliente sigue presentando fallas.')}${order.returnByName ? `<div style="font-size:12px;margin-top:5px;color:#9f1239;">Devuelto por: <strong>${orderEscape(order.returnByName)}</strong></div>` : ''}</div>` : '<div class="order-report-pending">Esta orden sigue pendiente. Se muestran los datos capturados al registrarla.</div>')) : ''}` +
    ((order.detailKind === 'network' && (userHasRole('atencion_clientes') || userHasRole('administrador', 'admin')) && (order.status === 'resuelto_soporte' || order.status === 'no_realizado')) ? `
      <div class="order-report-conclude-actions" style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;padding-top:14px;border-top:1px solid #e2e8f0;flex-wrap:wrap;">
        ${order.status === 'resuelto_soporte' ? `
          <button type="button" class="btn net-btn-confirm" onclick="requestCloseOrderReport();confirmNetworkClientSatisfied('${order.id}')" title="Confirmar satisfacción del cliente y concluir reporte"><svg class="btn-action-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Conforme</button>
          <button type="button" class="btn net-btn-return" onclick="requestCloseOrderReport();openReturnNetworkModal('${order.id}')" title="Devolver reporte a Soporte"><svg class="btn-action-svg" viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg> Devolver</button>
        ` : `
          <button type="button" class="btn net-btn-confirm" onclick="requestCloseOrderReport();confirmNetworkUnresolvableConcluded('${order.id}')" title="Concluir trámite formalmente"><svg class="btn-action-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Concluir</button>
          <button type="button" class="btn net-btn-return" onclick="requestCloseOrderReport();openReturnNetworkModal('${order.id}')" title="Devolver reporte a Soporte"><svg class="btn-action-svg" viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg> Devolver</button>
        `}
        <button type="button" class="btn net-btn-physical" onclick="requestCloseOrderReport();promptSendNetworkToPhysical('${order.id}')" title="Derivar este reporte directo a Detalles Físicos"><svg class="btn-action-svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> Enviar a Detalles Físicos</button>
      </div>
    ` : '');
  OM('order-tech-report-mo');
}

function openOrderReportEvidence(orderId, index) {
  const order = (state.workOrders || []).find(item => item.id === orderId && !item.deletedAt);
  if (order) openEvidenceGallery(getOrderReportPhotos(order), index);
}

function renderWOs() {
  renderOrderStats();
  const wrap = document.getElementById('orders-table');
  if (!wrap) return;

  const allRows = filteredOrders();
  if (!allRows.length) {
    orderCurrentPage = 1;
    wrap.innerHTML = '<div class="empty-state">No hay detalles con esos filtros.</div>';
    return;
  }

  const pageMeta = window.netopsPageMeta?.operations || {};
  const isServerWindowed = Number.isFinite(Number(pageMeta.total)) && Number(pageMeta.total) > 0 && allRows.length <= orderRowsPerPage;
  const totalRows = isServerWindowed ? Number(pageMeta.total) : allRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / orderRowsPerPage));
  orderCurrentPage = Math.min(Math.max(orderCurrentPage, 1), totalPages);

  let rangeStart = 0;
  let rangeEnd = 0;
  let rows = [];

  if (isServerWindowed) {
    rangeStart = Number.isFinite(Number(pageMeta.offset)) ? Number(pageMeta.offset) : (orderCurrentPage - 1) * orderRowsPerPage;
    rangeEnd = Math.min(rangeStart + allRows.length, totalRows);
    rows = allRows;
  } else {
    rangeStart = (orderCurrentPage - 1) * orderRowsPerPage;
    rangeEnd = Math.min(rangeStart + orderRowsPerPage, totalRows);
    rows = allRows.slice(rangeStart, rangeEnd);
  }

  wrap.innerHTML = `
    <div class="table-wrap clean">
      <table class="table order-table">
        <thead>
          <tr>
            <th>Folio</th>
            <th>Zona</th>
            <th>Lugar</th>
            <th>Cliente</th>
            <th>Detalle</th>
            <th>Tipo</th>
            <th>Prioridad</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(w => {
            const target = getOrderTarget(w);
            const rowReported = w.status === 'completada' || w.status === 'no_realizado';
            const rowStatus = getOrderStatusMeta(w);
            const isSoporte = userHasRole('soporte');
            const isAtencion = userHasRole('atencion_clientes');
            const isAdmin = userHasRole('administrador', 'admin');
            const currentActor = getCurrentUser();

            const isSentToAttention = isNetworkSupportToAttention(w);
            let canReopen = false;
            if (rowReported) {
              if (w.detailKind === 'network') {
                if (isSentToAttention) {
                  // Requerimiento enviado por Soporte a Atención: solo Soporte puede reabrirlo
                  canReopen = isSoporte || isAdmin;
                } else {
                  // Reporte de red enviado por Atención a Soporte: solo Atención puede reabrirlo
                  canReopen = isAtencion || isAdmin;
                }
              } else {
                canReopen = isSoporte;
              }
            }

            let networkQuickActions = '';
            if (w.detailKind === 'network') {
              if (w.status === 'pendiente' || w.status === 'devuelto_soporte') {
                if (isSentToAttention) {
                  // Requerimiento enviado por Soporte hacia Atención a clientes
                  if (isAtencion) {
                    networkQuickActions = `
                      <button type="button" class="btn net-btn-attend" onclick="startAttendingNetworkOrder('${w.id}')" title="Iniciar atención y seguimiento de este requerimiento"><svg class="btn-action-svg" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Atender</button>
                    `;
                  } else {
                    networkQuickActions = `<span class="net-pill-waiting" title="En espera de atención por Atención a clientes">En Atención</span>`;
                  }
                } else {
                  // Detalle de red recibido por Soporte: primero tendrá el botón que diga "Atender"
                  if (isSoporte) {
                    networkQuickActions = `
                      <button type="button" class="btn net-btn-attend" onclick="startAttendingNetworkOrder('${w.id}')" title="Iniciar atención técnica de este reporte"><svg class="btn-action-svg" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Atender</button>
                    `;
                  } else {
                    networkQuickActions = `<span class="net-pill-waiting" title="En espera de atención técnica por Soporte">En Soporte</span>`;
                  }
                }
              } else if (w.status === 'en_revision') {
                // Ya se encuentra en atención: el cuadrito cambió de color y ahora se puede Resolver
                if (isSentToAttention) {
                  if (isAtencion) {
                    networkQuickActions = `
                      <button type="button" class="btn net-btn-resolve" onclick="openResolveNetworkModal('${w.id}')" title="Registrar respuesta formal al requerimiento"><svg class="btn-action-svg" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Responder</button>
                    `;
                  } else {
                    networkQuickActions = `<span class="net-pill-waiting" title="Atención a clientes está atendiendo este requerimiento">En atención</span>`;
                  }
                } else {
                  // Detalle de red en atención por Soporte
                  if (isSoporte) {
                    const isAssignedToOther = w.assignedUserId && !isOrderAssignedToUser(w, currentActor);
                    const isCheckingByOther = w.reviewOpenedById && w.reviewOpenedById !== currentActor.id;
                    const canRetake = isAssignedToOther || isCheckingByOther;

                    if (canRetake) {
                      networkQuickActions = `
                        <button type="button" class="btn net-btn-retake" onclick="takeOverNetworkOrder('${w.id}')" title="Asumir titularidad de la atención técnica"><svg class="btn-action-svg" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg> Retomar</button>
                        <button type="button" class="btn net-btn-resolve" onclick="openResolveNetworkModal('${w.id}')" title="Registrar solución técnica y enviar a validación"><svg class="btn-action-svg" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> Resolver</button>
                        <button type="button" class="btn net-btn-unresolvable" onclick="openUnresolvableNetworkModal('${w.id}')" title="Declarar reporte no realizable por imposibilidad técnica">No realizable</button>
                      `;
                    } else {
                      networkQuickActions = `
                        <button type="button" class="btn net-btn-resolve" onclick="openResolveNetworkModal('${w.id}')" title="Registrar solución técnica y enviar a validación"><svg class="btn-action-svg" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> Resolver</button>
                      `;
                    }
                  } else {
                    networkQuickActions = `<span class="net-pill-waiting" title="Soporte técnico está atendiendo este reporte">En atención</span>`;
                  }
                }
              } else if (w.status === 'resuelto_soporte') {
                if (isSentToAttention) {
                  // Requerimiento que Soporte envió a Atención y ya fue respondido: Soporte valida si queda Conforme o lo Devuelve
                  if (isSoporte) {
                    networkQuickActions = `
                      <button type="button" class="btn net-btn-confirm" onclick="confirmNetworkClientSatisfied('${w.id}')" title="Confirmar respuesta de Atención y concluir requerimiento"><svg class="btn-action-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Conforme</button>
                      <button type="button" class="btn net-btn-return" onclick="openReturnNetworkModal('${w.id}')" title="Devolver requerimiento a Atención con observaciones"><svg class="btn-action-svg" viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg> Devolver</button>
                    `;
                  } else {
                    networkQuickActions = `<span class="net-pill-waiting" title="Esperando que Soporte técnico valide la respuesta">En validación</span>`;
                  }
                } else {
                  // Reporte de red que Soporte resolvió: SOLO Atención a clientes debe validar con el cliente. Soporte NO lo valida.
                  if (isAtencion) {
                    networkQuickActions = `
                      <button type="button" class="btn net-btn-confirm" onclick="confirmNetworkClientSatisfied('${w.id}')" title="Confirmar satisfacción del cliente y concluir reporte"><svg class="btn-action-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Conforme</button>
                      <button type="button" class="btn net-btn-return" onclick="openReturnNetworkModal('${w.id}')" title="Devolver reporte a Soporte por falla persistente o inconformidad"><svg class="btn-action-svg" viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg> Devolver</button>
                      <button type="button" class="btn net-btn-physical" onclick="promptSendNetworkToPhysical('${w.id}')" title="Derivar este reporte directo a Detalles Físicos"><svg class="btn-action-svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> A Físicos</button>
                    `;
                  } else {
                    networkQuickActions = `<span class="net-pill-waiting" title="Esperando que Atención a clientes valide la conformidad con el cliente">Por validar</span>`;
                  }
                }
              } else if (w.status === 'no_realizado') {
                if (isAtencion) {
                  networkQuickActions = `
                    <button type="button" class="btn net-btn-confirm" onclick="confirmNetworkUnresolvableConcluded('${w.id}')" title="Concluir trámite indicando imposibilidad técnica"><svg class="btn-action-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Concluir</button>
                    <button type="button" class="btn net-btn-return" onclick="openReturnNetworkModal('${w.id}')" title="Devolver reporte a Soporte con nuevas observaciones"><svg class="btn-action-svg" viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg> Devolver</button>
                    <button type="button" class="btn net-btn-physical" onclick="promptSendNetworkToPhysical('${w.id}')" title="Derivar este reporte directo a Detalles Físicos"><svg class="btn-action-svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> A Físicos</button>
                  `;
                } else {
                  networkQuickActions = `<span class="net-pill-waiting" style="background:#fef2f2;color:#b91c1c;border-color:#fecdd3;" title="Soporte reportó imposibilidad técnica para solucionar este reporte">No realizado</span>`;
                }
              }
            }

            return `
              <tr class="${rowReported ? 'order-row-done' : ''}">
                <td data-label="Folio"><strong class="order-folio">${orderEscape(getOrderFolio(w))}</strong></td>
                <td data-label="Zona">${orderEscape(getZoneLabel(target.zone || w.region) || '--')}</td>
                <td data-label="Lugar"><strong class="order-place-main">${orderEscape(getOrderPlace(w))}</strong></td>
                <td data-label="Cliente"><strong class="order-client-main">${orderEscape(w.clientName || '--')}</strong>${w.clientPhone ? `<div class="order-client-phone">${orderEscape(w.clientPhone)}</div>` : ''}</td>
                <td data-label="Detalle">
                  <span class="order-category-badge">${orderEscape(orderCategoryLabel(getOrderCategory(w)))}</span>
                  ${w.description ? `<div class="order-detail-text">${orderEscape(w.description)}</div>` : (w.title && w.title !== orderCategoryLabel(getOrderCategory(w)) ? `<div class="order-detail-text">${orderEscape(w.title)}</div>` : '')}
                  <div class="order-assignment-tags" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;">
                    ${w.assignedUserName ? (w.assignedUserName.split(',').map(s => s.trim()).filter(Boolean).map(name => renderUserColorChip(name, w.assignedUserId)).join('')) : ''}
                    ${w.reviewOpenedByName && !['completada','no_realizado'].includes(w.status) && !((w.assignedUserName || '').includes(w.reviewOpenedByName)) ? `
                      <span class="order-checking-badge" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:2px 7px;border-radius:12px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;">
                        <svg style="width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${w.reviewOpenedById === (currentActor.id || '') ? 'En atención personal' : `Atendiendo: `}${renderUserColorChip(w.reviewOpenedByName, w.reviewOpenedById)}
                      </span>
                    ` : ''}
                  </div>
                </td>
                <td data-label="Tipo">${orderEscape(getOrderDisplayType(w))}</td>
                <td data-label="Prioridad"><span class="priority-badge priority-${orderEscape(w.priority || 'media')}"><span class="priority-dot"></span>${orderEscape(pl(w.priority || 'media'))}</span></td>
                <td data-label="Estado"><span class="order-status-badge ${rowStatus.className}">${orderEscape(rowStatus.label)}</span></td>
                <td data-label="Acción">
                  <div class="order-actions">
                    ${networkQuickActions}
                    <button class="btn order-view-report" title="Ver detalle completo" aria-label="Ver detalle completo" onclick="openOrderTechnicianReport('${w.id}')">${orderActionIcon('view')}</button>
                    ${rowReported ? (canReopen ? `
                      <button class="btn order-reopen-action" title="Reabrir detalle para nueva atención" aria-label="Reabrir detalle para nueva atención" onclick="reopenCompletedWO('${w.id}')">${orderActionIcon('reopen')}</button>
                    ` : '') : `
                      <button class="btn order-edit-action" title="Editar información del detalle" aria-label="Editar información del detalle" onclick="openWO('${w.id}')">${orderActionIcon('edit')}</button>
                    `}
                    <button class="btn order-delete-action" title="${userHasRole('administrador','admin') ? 'Eliminar detalle definitivamente' : 'Solicitar eliminación del detalle'}" aria-label="${userHasRole('administrador','admin') ? 'Eliminar detalle definitivamente' : 'Solicitar eliminación del detalle'}" onclick="deleteWO('${w.id}')">${orderActionIcon('delete')}</button>
                  </div>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="order-table-footer">
      <div class="order-pagination-nav">
        <button type="button" class="order-page-button" aria-label="Primera página" title="Primera página" onclick="changeOrderPage(1)" ${orderCurrentPage === 1 ? 'disabled' : ''}>«</button>
        <button type="button" class="order-page-button" aria-label="Página anterior" title="Página anterior" onclick="changeOrderPage(${orderCurrentPage - 1})" ${orderCurrentPage === 1 ? 'disabled' : ''}>‹</button>
        <span class="order-page-indicator">Página <strong>${orderCurrentPage}</strong> de <strong>${totalPages}</strong></span>
        <button type="button" class="order-page-button" aria-label="Página siguiente" title="Página siguiente" onclick="changeOrderPage(${orderCurrentPage + 1})" ${orderCurrentPage === totalPages ? 'disabled' : ''}>›</button>
        <button type="button" class="order-page-button" aria-label="Última página" title="Última página" onclick="changeOrderPage(${totalPages})" ${orderCurrentPage === totalPages ? 'disabled' : ''}>»</button>
        <span class="order-page-count" style="margin-left:8px;color:#64748b;font-size:11px;">(<strong>${totalRows ? rangeStart + 1 : 0}-${rangeEnd}</strong> de <strong>${totalRows}</strong> detalles)</span>
      </div>
      <label class="order-page-size"><span>Filas por página:</span><select onchange="changeOrderPageSize(this.value)"><option value="10" ${orderRowsPerPage === 10 ? 'selected' : ''}>10</option><option value="15" ${orderRowsPerPage === 15 ? 'selected' : ''}>15</option><option value="20" ${orderRowsPerPage === 20 ? 'selected' : ''}>20</option><option value="50" ${orderRowsPerPage === 50 ? 'selected' : ''}>50</option></select></label>
    </div>`;
}

/* ==========================================================================
   CONTROLADORES DE MODALES Y ACCIONES PARA DETALLES DE RED
   (Resolver detalle de Soporte y Devolver / Conforme de Atención a clientes)
   ========================================================================== */

let netresEvidencePhotos = [];

function renderNetresEvidencePhotos() {
  const container = document.getElementById('netres-evidence-preview');
  if (!container) return;
  if (!netresEvidencePhotos.length) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = netresEvidencePhotos.map((photo, index) => `
    <div class="netres-evidence-item">
      <img src="${orderEscape(photo)}" alt="Evidencia ${index + 1}" style="cursor:zoom-in" onclick="openEvidenceGallery(netresEvidencePhotos, ${index})" title="Clic para ampliar y explorar evidencia">
      <button type="button" aria-label="Eliminar" onclick="removeNetresEvidencePhoto(${index})">&times;</button>
    </div>
  `).join('');
}

function removeNetresEvidencePhoto(index) {
  netresEvidencePhotos.splice(index, 1);
  renderNetresEvidencePhotos();
}

async function handleNetresEvidenceFile(event) {
  const file = event.target?.files?.[0];
  if (!file) return;
  try {
    const dataUrl = await compressWOEvidenceImage(file);
    if (dataUrl) {
      netresEvidencePhotos.push(dataUrl);
      renderNetresEvidencePhotos();
    }
  } catch (err) {
    notify('No se pudo procesar la imagen seleccionada.', 'err');
  } finally {
    event.target.value = '';
  }
}

function openResolveNetworkModal(id) {
  if (userHasRole('administrador', 'admin')) {
    return notify('Acción restringida: El rol administrador no puede resolver reportes directamente.', 'warn');
  }
  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle de red.', 'err');
  if (typeof markNotificationReadByOrderId === 'function') {
    markNotificationReadByOrderId(id);
  }

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || 'Soporte';

  // Si nadie lo está checando todavía y el usuario es Soporte, marcar inicio de revisión
  if (!order.reviewOpenedById && !userHasRole('administrador', 'admin') && userHasRole('soporte', 'atencion_clientes')) {
    order.reviewOpenedById = currentUser.id || '';
    order.reviewOpenedByName = userName;
    order.reviewOpenedByUsername = currentUser.username || '';
    order.reviewOpenedAt = new Date().toISOString();
    if (order.status === 'pendiente') {
      order.status = 'en_revision';
    }
    saveRecord('workOrders', order).catch(() => {});
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(order, 'checking');
    }
    setTimeout(() => { if (typeof renderWOs === 'function') renderWOs(); }, 60);
  }

  document.getElementById('netres-order-id').value = order.id;
  document.getElementById('netres-solution').value = '';
  netresEvidencePhotos = [];
  renderNetresEvidencePhotos();

  const isSentToAttention = isNetworkSupportToAttention(order);
  const modalTitle = document.getElementById('netres-modal-title');
  const modalSub = document.getElementById('netres-modal-subtitle');
  if (modalTitle) {
    modalTitle.textContent = isSentToAttention ? 'Responder requerimiento a Soporte' : 'Resolver detalle de red';
  }
  if (modalSub) {
    modalSub.textContent = isSentToAttention
      ? 'Registra la respuesta o confirmación para Soporte técnico.'
      : 'Registra la solución técnica implementada y notifica a Atención a clientes.';
  }

  const summary = document.getElementById('netres-order-summary');
  const returnFollowUp = (Array.isArray(order.followUps) ? order.followUps : [])
    .slice()
    .reverse()
    .find(f => f.action === 'devuelto_soporte');

  if (summary) {
    const isCheckingByOther = order.reviewOpenedByName && order.reviewOpenedById !== currentUser.id;
    const isAssignedToOther = order.assignedUserId && !isOrderAssignedToUser(order, currentUser);

    summary.innerHTML = `
      ${isCheckingByOther ? `
        <div class="netres-checking-alert" style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;padding:10px 14px;border-radius:10px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div>
            <strong>${orderEscape(order.reviewOpenedByName)} se encuentra atendiendo este detalle</strong>
            <div style="font-size:12px;color:#b45309;">${orderEscape(orderReviewOpenedSummary(order) || 'Iniciado recientemente')}</div>
          </div>
          <button type="button" class="btn" style="background:#f59e0b;color:#fff;font-size:12px;font-weight:800;padding:6px 12px;border-radius:8px;border:none;cursor:pointer;" onclick="takeOverNetworkOrder('${order.id}')">Asignarme y continuar atención</button>
        </div>
      ` : (isAssignedToOther ? `
        <div class="netres-reassign-banner" style="background:#f0f9ff;border:1px solid #bae6fd;color:#0369a1;padding:8px 12px;border-radius:8px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <span>Este reporte estaba asignado a <strong>${orderEscape(order.assignedUserName || 'otro compañero')}</strong>. Puedes resolverlo directamente o asumir la asignación.</span>
          <button type="button" class="btn" style="background:#0284c7;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;border:none;cursor:pointer;" onclick="takeOverNetworkOrder('${order.id}')">Tomar asignación del reporte</button>
        </div>
      ` : '')}
      <div class="netres-summary-row">
        <span><strong>Folio:</strong> ${orderEscape(getOrderFolio(order))}</span>
        <span><strong>Cliente:</strong> ${orderEscape(order.clientName || 'Sin nombre')}</span>
      </div>
      <div class="netres-summary-row">
        <span><strong>Asignado a:</strong> ${orderEscape(order.assignedUserName || (isSentToAttention ? 'Todo el equipo de Atención' : 'Todo el equipo de Soporte'))}</span>
        <span><strong>Reportado por:</strong> ${orderEscape(order.createdByName || order.createdByUsername || (isSentToAttention ? 'Soporte técnico' : 'Atención a clientes'))}</span>
      </div>
      ${order.clientPhone || order.phone ? `
      <div class="netres-summary-row">
        <span><strong>Teléfono:</strong> ${orderEscape(order.clientPhone || order.phone)}</span>
      </div>` : ''}
      <div class="netres-summary-detail">
        <strong>Detalle reportado:</strong> ${orderEscape(order.description || order.title || orderCategoryLabel(getOrderCategory(order)))}
      </div>
      ${order.status === 'devuelto_soporte' ? `
        <div class="netres-alert-returned" style="background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;padding:12px 14px;border-radius:9px;margin-top:12px;">
          <div style="font-size:12px;font-weight:800;display:flex;align-items:center;gap:6px;">⚠️ Motivo de devolución (${isSentToAttention ? 'Aclaración solicitada' : 'Cliente no conforme'}):</div>
          <div style="margin-top:5px;font-size:13px;font-weight:600;line-height:1.45;color:#7f1d1d;">${orderEscape(order.returnReason || returnFollowUp?.note || 'Se solicitó aclaración o revisión.')}</div>
          ${order.returnByName ? `<div style="font-size:11px;color:#991b1b;margin-top:4px;opacity:0.9;">Devuelto por: <strong>${orderEscape(order.returnByName)}</strong></div>` : ''}
        </div>
      ` : ''}
    `;
  }

  // Escuchar pegado de capturas con Ctrl + V dentro del modal
  const modal = document.getElementById('network-resolve-mo');
  if (modal && !modal.dataset.pasteBound) {
    modal.dataset.pasteBound = '1';
    modal.addEventListener('paste', async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            const dataUrl = await compressWOEvidenceImage(blob);
            if (dataUrl) {
              netresEvidencePhotos.push(dataUrl);
              renderNetresEvidencePhotos();
              notify('Captura adjuntada correctamente.', 'ok');
            }
          }
        }
      }
    });
  }

  OM('network-resolve-mo');
  setTimeout(() => document.getElementById('netres-solution')?.focus(), 100);
}

async function submitNetworkResolution() {
  if (userHasRole('administrador', 'admin')) {
    return notify('Acción restringida: El rol administrador no puede resolver reportes directamente.', 'warn');
  }
  const id = document.getElementById('netres-order-id')?.value;
  const solution = document.getElementById('netres-solution')?.value.trim();
  if (!id) return;
  if (!solution) {
    notify('Por favor describa con claridad la solución o intervención técnica aplicada.', 'err');
    document.getElementById('netres-solution')?.focus();
    return;
  }

  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle de red solicitado.', 'err');

  const isSentToAttention = isNetworkSupportToAttention(order);
  const folio = getOrderFolio(order);
  const confirmed = await askConfirmation({
    title: isSentToAttention ? '¿Confirmar envío de respuesta?' : '¿Confirmar resolución técnica?',
    message: isSentToAttention
      ? `Se remitirá formalmente la respuesta a Soporte técnico para su verificación. ¿Desea proceder?`
      : `Se registrará la solución técnica del reporte. El estado cambiará a "Resuelto" para su validación. ¿Desea proceder?`,
    confirmText: isSentToAttention ? 'Confirmar y enviar respuesta' : 'Confirmar y registrar solución',
    cancelText: 'Continuar editando',
    tone: 'ok'
  });
  if (!confirmed) return;

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || (isSentToAttention ? 'Atención a clientes' : 'Soporte técnico');
  const now = new Date().toISOString();

  order.status = 'resuelto_soporte';
  order.updatedAt = now;
  order.updatedById = currentUser.id || '';
  if (!order.assignedUserId) {
    order.assignedUserId = currentUser.id || '';
    order.assignedUserName = userName || '';
  }

  const prevReport = order.technicianReport && typeof order.technicianReport === 'object' ? order.technicianReport : {};
  order.technicianReport = {
    ...prevReport,
    solution,
    result: 'resuelto',
    completedByName: userName,
    completedBy: currentUser.id || '',
    completedAt: now,
    evidencePhotos: netresEvidencePhotos.slice(),
    evidencePhoto: netresEvidencePhotos[0] || prevReport.evidencePhoto || ''
  };

  const actionTag = isSentToAttention ? 'Atendido por Atención a clientes' : 'Resuelto por Soporte técnico';
  appendSharedNetworkFollowUp(order, 'resuelto_soporte', actionTag, solution);
  setUpdatedAudit(order, isSentToAttention ? 'respondió requerimiento a Soporte' : 'resolvió reporte de red');

  let saved = false;
  try {
    if (typeof postWorkOrderReportToCloud === 'function') {
      const res = await postWorkOrderReportToCloud(order);
      saved = res?.ok === true;
    }
  } catch (err) {
    console.warn('Error en postWorkOrderReportToCloud, intentando saveRecord', err);
  }

  if (!saved) {
    saved = await saveRecord('workOrders', order);
  }

  if (!saved) {
    notify('No fue posible guardar la resolución técnica. Por favor intente nuevamente.', 'err');
    return;
  }

  CM('network-resolve-mo');
  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(order, 'resolved');
    }
  } catch (e) {
    console.warn('broadcastNetworkOrderChange error:', e);
  }
  notify('Detalle resuelto.', 'ok');
  await loadOrderPage();
}

async function startAttendingNetworkOrder(id) {
  if (userHasRole('administrador', 'admin')) {
    return notify('Acción restringida: El rol administrador no puede atender reportes directamente.', 'warn');
  }
  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle de red.', 'err');
  if (typeof markNotificationReadByOrderId === 'function') {
    markNotificationReadByOrderId(id);
  }

  const isSentToAttention = isNetworkSupportToAttention(order);
  const folio = getOrderFolio(order);
  const confirmed = await askConfirmation({
    title: 'Iniciar atención',
    message: '¿Iniciar la atención de este detalle?',
    confirmText: 'Sí, atender',
    cancelText: 'Cancelar',
    tone: 'ok'
  });
  if (!confirmed) return;

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || (isSentToAttention ? 'Atención a clientes' : 'Soporte técnico');
  const now = new Date().toISOString();

  order.status = 'en_revision';
  order.reviewOpenedAt = now;
  order.reviewOpenedById = currentUser.id || '';
  order.reviewOpenedByName = userName;
  order.reviewOpenedByUsername = currentUser.username || '';
  if (!order.assignedUserId) {
    order.assignedUserId = currentUser.id || '';
    order.assignedUserName = userName;
  }
  order.updatedAt = now;
  order.updatedById = currentUser.id || '';

  const followUpLabel = isSentToAttention ? 'Atención iniciada por Atención a clientes' : 'Atención técnica iniciada por Soporte';
  appendSharedNetworkFollowUp(order, 'en_atencion', followUpLabel, `${userName} inició la atención formal de este detalle.`);
  setUpdatedAudit(order, isSentToAttention ? 'inició atención de requerimiento' : 'inició atención técnica de reporte de red');

  renderWOs();

  const ok = await saveRecord('workOrders', order);
  if (!ok) {
    renderWOs();
    return notify('No fue posible iniciar la atención. Por favor intente nuevamente.', 'err');
  }

  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(order, 'attending');
    }
  } catch (e) {
    console.warn('broadcastNetworkOrderChange error:', e);
  }

  notify('Detalle en atención.', 'ok');
  renderWOs();
}

async function takeOverNetworkOrder(id) {
  if (userHasRole('administrador', 'admin')) {
    return notify('Acción restringida: El rol administrador no puede asumir la atención de reportes.', 'warn');
  }
  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle de red.', 'err');

  const currentAttendant = order.reviewOpenedByName || order.assignedUserName || 'otro integrante del equipo';
  const folio = getOrderFolio(order);
  const confirmed = await askConfirmation({
    title: 'Reasignar atención',
    message: `Actualmente lo atiende ${currentAttendant}. ¿Deseas atenderlo tú?`,
    confirmText: 'Sí, atender',
    cancelText: 'Cancelar',
    tone: 'warning'
  });
  if (!confirmed) return;

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || 'Soporte técnico';
  const now = new Date().toISOString();
  const prevAssigneeId = order.assignedUserId || order.reviewOpenedById || '';
  const prevAssignee = order.assignedUserName || 'Sin asignación previa';
  const prevAssigneeName = order.assignedUserName || order.reviewOpenedByName || '';

  order.assignedUserId = currentUser.id || '';
  order.assignedUserName = userName;
  order.reviewOpenedById = currentUser.id || '';
  order.reviewOpenedByName = userName;
  order.reviewOpenedByUsername = currentUser.username || '';
  order.reviewOpenedAt = now;
  order.updatedAt = now;
  order.updatedById = currentUser.id || '';
  if (order.status === 'pendiente') {
    order.status = 'en_revision';
  }

  appendSharedNetworkFollowUp(order, 'retomado', 'Atención reasignada', `${userName} asumió la titularidad técnica del reporte (asignación previa: ${prevAssignee}).`);
  setUpdatedAudit(order, 'retomó atención de reporte de red');

  renderWOs();

  const ok = await saveRecord('workOrders', order);
  if (!ok) {
    renderWOs();
    return notify('No fue posible reasignar la atención. Por favor intente de nuevo.', 'err');
  }

  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(order, 'retaken', { prevAssigneeId, prevAssigneeName });
    }
  } catch (e) {
    console.warn('broadcastNetworkOrderChange error:', e);
  }

  notify('Detalle a tu cargo.', 'ok');

  if (document.getElementById('network-resolve-mo')?.classList.contains('open') && document.getElementById('netres-order-id')?.value === id) {
    openResolveNetworkModal(id);
  }
  renderWOs();
}

function openReturnNetworkModal(id) {
  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle solicitado.', 'err');
  if (typeof markNotificationReadByOrderId === 'function') {
    markNotificationReadByOrderId(id);
  }

  document.getElementById('netret-order-id').value = order.id;
  document.getElementById('netret-reason').value = '';
  netretEvidencePhotos = [];
  renderNetretEvidencePreview();

  const isSentToAttention = isNetworkSupportToAttention(order);
  const titleEl = document.querySelector('#network-return-mo .modal-head h2');
  const subEl = document.querySelector('#network-return-mo .modal-head p');
  const labelEl = document.querySelector('#network-return-mo .fi label');
  const submitBtn = document.querySelector('#network-return-mo .btn-warning-return');

  if (titleEl) titleEl.textContent = isSentToAttention ? 'Devolver requerimiento a Atención a clientes' : 'Devolver reporte a Soporte técnico';
  if (subEl) subEl.textContent = isSentToAttention
    ? 'Especifique con claridad las observaciones técnicas para que Atención a clientes aclare o precise el requerimiento.'
    : 'Especifique las observaciones manifestadas por el cliente o la persistencia de la falla para reabrir la atención técnica.';
  if (labelEl) labelEl.innerHTML = (isSentToAttention ? 'Observaciones técnicas / Aclaración solicitada' : 'Motivo de devolución / Observaciones del cliente') + ' <span class="required-indicator">*</span>';
  if (submitBtn) submitBtn.textContent = isSentToAttention ? 'Confirmar devolución a Atención' : 'Confirmar devolución a Soporte';

  const summary = document.getElementById('netret-order-summary');
  const solutionText = order.technicianReport?.solution || '';
  if (summary) {
    summary.innerHTML = `
      <div class="netres-summary-row">
        <span><strong>Folio:</strong> ${orderEscape(getOrderFolio(order))}</span>
        <span><strong>Cliente:</strong> ${orderEscape(order.clientName || 'Sin nombre')}</span>
      </div>
      <div class="netres-summary-row">
        <span><strong>Asignado a:</strong> ${orderEscape(order.assignedUserName || (isSentToAttention ? 'Todo el equipo de Atención a clientes' : 'Todo el equipo de Soporte técnico'))}</span>
      </div>
      ${solutionText ? `
        <div class="netres-summary-detail">
          <strong>${isSentToAttention ? 'Respuesta provista por Atención' : 'Solución técnica previa de Soporte'}:</strong> ${orderEscape(solutionText)}
        </div>
      ` : ''}
    `;
  }

  OM('network-return-mo');
  setTimeout(() => document.getElementById('netret-reason')?.focus(), 100);
}

async function submitNetworkReturn() {
  const id = document.getElementById('netret-order-id')?.value;
  const reason = document.getElementById('netret-reason')?.value.trim();
  if (!id) return;
  if (!reason) {
    notify('Por favor ingrese el motivo de la devolución y las observaciones pertinentes.', 'err');
    document.getElementById('netret-reason')?.focus();
    return;
  }

  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle solicitado.', 'err');

  const isSentToAttention = isNetworkSupportToAttention(order);
  const folio = getOrderFolio(order);
  const confirmed = await askConfirmation({
    title: '¿Devolver detalle?',
    message: 'El detalle se devolverá para revisión con las observaciones indicadas.',
    confirmText: 'Sí, devolver',
    cancelText: 'Cancelar',
    tone: 'warning'
  });
  if (!confirmed) return;

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || (isSentToAttention ? 'Soporte técnico' : 'Atención a clientes');
  const now = new Date().toISOString();

  order.status = 'devuelto_soporte';
  order.updatedAt = now;
  order.updatedById = currentUser.id || '';
  order.returnReason = reason;
  order.returnByName = userName;
  order.returnAt = now;
  order.reviewOpenedById = '';
  order.reviewOpenedByName = '';
  order.reviewOpenedByUsername = '';
  order.reviewOpenedAt = '';

  const returnLabel = isSentToAttention ? 'Devuelto a Atención a clientes (Aclaración solicitada)' : 'Devuelto a Soporte técnico (Cliente no conforme)';
  appendSharedNetworkFollowUp(order, 'devuelto_soporte', returnLabel, reason, netretEvidencePhotos);
  if (Array.isArray(netretEvidencePhotos) && netretEvidencePhotos.length) {
    order.evidencePhotos = [...(Array.isArray(order.evidencePhotos) ? order.evidencePhotos : []), ...netretEvidencePhotos];
  }
  setUpdatedAudit(order, isSentToAttention ? 'devolvió requerimiento a Atención a clientes' : 'devolvió reporte a Soporte técnico tras consulta con cliente');

  const saved = await saveRecord('workOrders', order);
  if (!saved) {
    notify('No se pudo procesar la devolución. Por favor intente nuevamente.', 'err');
    return;
  }

  CM('network-return-mo');
  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(order, 'returned');
    }
  } catch (e) {
    console.warn('broadcastNetworkOrderChange error:', e);
  }
  notify('Detalle devuelto.', 'warn');
  await loadOrderPage();
}

async function confirmNetworkClientSatisfied(id) {
  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle solicitado.', 'err');

  const isSentToAttention = isNetworkSupportToAttention(order);
  const client = order.clientName || 'el cliente titular';
  const folio = getOrderFolio(order);
  const confirmed = await askConfirmation({
    title: '¿Concluir detalle?',
    message: '¿Confirma que el detalle ha sido solventado satisfactoriamente?',
    confirmText: 'Sí, concluir',
    cancelText: 'Cancelar',
    tone: 'ok'
  });

  if (!confirmed) return;

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || (isSentToAttention ? 'Soporte técnico' : 'Atención a clientes');
  const now = new Date().toISOString();

  order.status = 'completada';
  order.completedAt = now;
  order.updatedAt = now;
  order.updatedById = currentUser.id || '';

  const confirmLabel = isSentToAttention ? 'Concluido a conformidad de Soporte técnico' : 'Finalizado a conformidad del cliente';
  const confirmNote = isSentToAttention
    ? `${userName} validó la respuesta de Atención a clientes y dio por concluido el requerimiento a entera conformidad.`
    : `${userName} consultó con el cliente, quien confirmó la total solución de la incidencia de red. Cerrado satisfactoriamente.`;
  appendSharedNetworkFollowUp(order, 'completada', confirmLabel, confirmNote);
  setUpdatedAudit(order, isSentToAttention ? 'concluyó requerimiento a conformidad' : 'finalizó reporte de red conforme con cliente');

  const saved = await saveRecord('workOrders', order);
  if (!saved) {
    notify('No fue posible concluir la orden. Por favor intente nuevamente.', 'err');
    return;
  }

  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(order, 'confirmed');
    }
  } catch (e) {
    console.warn('broadcastNetworkOrderChange error:', e);
  }
  notify('Detalle concluido.', 'ok');
  await loadOrderPage();
}

// Auto-apertura si se recibe orderId en la URL
(function checkUrlForTargetOrder() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const targetId = params.get('orderId');
  if (targetId) {
    setTimeout(() => {
      openOrderTechnicianReport(targetId);
    }, 600);
  }
})();


/* ==========================================================================
   EVIDENCIAS EN DEVOLUCIÓN DE REPORTE (#network-return-mo)
   ========================================================================== */
let netretEvidencePhotos = [];

function handleNetretEvidenceFiles(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  readNetretFiles(files);
  event.target.value = '';
}

function readNetretFiles(files) {
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (dataUrl && !netretEvidencePhotos.includes(dataUrl)) {
        netretEvidencePhotos.push(dataUrl);
        renderNetretEvidencePreview();
      }
    };
    reader.readAsDataURL(file);
  });
}

function renderNetretEvidencePreview() {
  const container = document.getElementById('netret-evidence-preview');
  if (!container) return;
  container.innerHTML = netretEvidencePhotos.map((photo, idx) => `
    <div class="netres-evidence-thumb">
      <img src="${orderEscape(photo)}" alt="Evidencia ${idx + 1}" onclick="openEvidenceGallery(netretEvidencePhotos, ${idx})">
      <button type="button" class="netres-thumb-remove" onclick="removeNetretEvidencePhoto(${idx})" title="Eliminar foto">✕</button>
    </div>
  `).join('');
}

function removeNetretEvidencePhoto(idx) {
  netretEvidencePhotos.splice(idx, 1);
  renderNetretEvidencePreview();
}

/* ==========================================================================
   NOTIFICACIÓN DE REPORTE NO REALIZABLE (#network-unresolvable-mo)
   ========================================================================== */
let netunresEvidencePhotos = [];

function openUnresolvableNetworkModal(id) {
  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle solicitado.', 'err');
  if (typeof markNotificationReadByOrderId === 'function') {
    markNotificationReadByOrderId(id);
  }

  document.getElementById('netunres-order-id').value = order.id;
  document.getElementById('netunres-reason').value = '';
  netunresEvidencePhotos = [];
  renderNetunresEvidencePreview();

  const summary = document.getElementById('netunres-order-summary');
  if (summary) {
    summary.innerHTML = `
      <div class="netres-summary-row">
        <span><strong>Folio:</strong> ${orderEscape(getOrderFolio(order))}</span>
        <span><strong>Cliente:</strong> ${orderEscape(order.clientName || 'Sin nombre')}</span>
      </div>
      <div class="netres-summary-row">
        <span><strong>Pueblo:</strong> ${orderEscape(order.town || order.nodeName || 'Red')}</span>
        <span><strong>Asignado:</strong> ${orderEscape(order.assignedUserName || 'Equipo de Soporte')}</span>
      </div>
      <div class="netres-summary-detail">
        <strong>Detalle reportado:</strong> ${orderEscape(order.description || order.title || 'Incidencia técnica')}
      </div>
    `;
  }

  OM('network-unresolvable-mo');
  setTimeout(() => document.getElementById('netunres-reason')?.focus(), 100);
}

function openUnresolvableNetworkModalFromResolve() {
  const currentId = document.getElementById('netres-order-id')?.value;
  if (!currentId) return;
  CM('network-resolve-mo');
  openUnresolvableNetworkModal(currentId);
}

function handleNetunresEvidenceFiles(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  readNetunresFiles(files);
  event.target.value = '';
}

function readNetunresFiles(files) {
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (dataUrl && !netunresEvidencePhotos.includes(dataUrl)) {
        netunresEvidencePhotos.push(dataUrl);
        renderNetunresEvidencePreview();
      }
    };
    reader.readAsDataURL(file);
  });
}

function renderNetunresEvidencePreview() {
  const container = document.getElementById('netunres-evidence-preview');
  if (!container) return;
  container.innerHTML = netunresEvidencePhotos.map((photo, idx) => `
    <div class="netres-evidence-thumb">
      <img src="${orderEscape(photo)}" alt="Evidencia ${idx + 1}" onclick="openEvidenceGallery(netunresEvidencePhotos, ${idx})">
      <button type="button" class="netres-thumb-remove" onclick="removeNetunresEvidencePhoto(${idx})" title="Eliminar foto">✕</button>
    </div>
  `).join('');
}

function removeNetunresEvidencePhoto(idx) {
  netunresEvidencePhotos.splice(idx, 1);
  renderNetunresEvidencePreview();
}

async function submitNetworkUnresolvable() {
  const id = document.getElementById('netunres-order-id')?.value;
  const reason = document.getElementById('netunres-reason')?.value.trim();
  if (!id) return;
  if (!reason) {
    notify('Por favor ingrese la justificación técnica por la cual no es posible solucionar el reporte.', 'err');
    document.getElementById('netunres-reason')?.focus();
    return;
  }

  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle solicitado.', 'err');

  const folio = getOrderFolio(order);
  const confirmed = await askConfirmation({
    title: '¿Declarar reporte no realizable?',
    message: 'El estado del reporte cambiará a "No realizado" con la justificación técnica especificada. ¿Desea continuar?',
    confirmText: 'Sí, declarar no realizable',
    cancelText: 'Cancelar',
    tone: 'danger'
  });
  if (!confirmed) return;

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || 'Personal de soporte';
  const now = new Date().toISOString();

  order.status = 'no_realizado';
  order.updatedAt = now;
  order.updatedById = currentUser.id || '';
  order.unresolvableReason = reason;
  order.unresolvableByName = userName;
  order.unresolvableAt = now;
  order.technicianReport = {
    ...(order.technicianReport || {}),
    result: 'no_realizado',
    reason: reason,
    evidencePhotos: [...(order.technicianReport?.evidencePhotos || []), ...netunresEvidencePhotos]
  };

  appendSharedNetworkFollowUp(order, 'no_realizado', 'Atención no realizada', reason, netunresEvidencePhotos);
  setUpdatedAudit(order, 'declaró reporte no realizable por causas técnicas');

  const saved = await saveRecord('workOrders', order);
  if (!saved) {
    notify('No se pudo guardar la notificación. Intente nuevamente.', 'err');
    return;
  }

  CM('network-unresolvable-mo');
  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(order, 'unresolvable');
    }
  } catch (e) {
    console.warn('broadcastNetworkOrderChange error:', e);
  }
  notify('Reporte marcado como no realizado.', 'ok');
  await loadOrderPage();
}

async function confirmNetworkUnresolvableConcluded(id) {
  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle solicitado.', 'err');

  const folio = getOrderFolio(order);
  const confirmed = await askConfirmation({
    title: '¿Concluir trámite de reporte?',
    message: '¿Confirma dar por concluido este reporte registrando la imposibilidad técnica?',
    confirmText: 'Sí, concluir trámite',
    cancelText: 'Cancelar',
    tone: 'warning'
  });
  if (!confirmed) return;

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || 'Atención a clientes';
  const now = new Date().toISOString();

  order.status = 'completada';
  order.completedAt = now;
  order.completedByName = userName;
  order.updatedAt = now;
  order.updatedById = currentUser.id || '';

  appendSharedNetworkFollowUp(order, 'completada', 'Concluido sin solución técnica', `Atención a clientes (${userName}) dio por concluido formalmente el reporte tras valorar la imposibilidad técnica.`);
  setUpdatedAudit(order, 'concluyó reporte sin solución técnica aplicada');

  const saved = await saveRecord('workOrders', order);
  if (!saved) {
    notify('No se pudo concluir el reporte. Intente nuevamente.', 'err');
    return;
  }

  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(order, 'confirmed');
    }
  } catch (e) {
    console.warn('broadcastNetworkOrderChange error:', e);
  }
  notify('Detalle concluido.', 'ok');
  await loadOrderPage();
}

// Escucha global de pegado (Ctrl + V) para evidencias en modales de devolución y no realizable
document.addEventListener('paste', (e) => {
  const returnMo = document.getElementById('network-return-mo');
  if (returnMo && returnMo.classList.contains('open')) {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItems = items.filter(x => x.type.startsWith('image/'));
    if (imgItems.length) {
      e.preventDefault();
      readNetretFiles(imgItems.map(x => x.getAsFile()).filter(Boolean));
    }
  }
  const unresMo = document.getElementById('network-unresolvable-mo');
  if (unresMo && unresMo.classList.contains('open')) {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItems = items.filter(x => x.type.startsWith('image/'));
    if (imgItems.length) {
      e.preventDefault();
      readNetunresFiles(imgItems.map(x => x.getAsFile()).filter(Boolean));
    }
  }
});

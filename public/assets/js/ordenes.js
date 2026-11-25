
function initOrderFontScale() { }
function setOrderFontScale() { }

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
    complete: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16.5 8.5"/></svg>',
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
    tag: '<svg viewBox="0 0 24 24"><path d="m3 12 9-9h7v7l-9 9z"/><circle cx="16" cy="6" r="1"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/></svg>',
    unresolvable: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>'
  };
  return icons[type] || icons.clipboard;
}

function orderReportField(icon, label, value, options = {}) {
  const content = options.raw ? value : orderEscape(value);
  return `<article class="order-report-field ${options.className || ''}"><span class="order-report-field-icon">${orderReportIcon(icon)}</span><div><small>${orderEscape(label)}</small><strong>${content}</strong></div></article>`;
}

function canEditOrder(order) {
  if (!order) return false;
  // En detalles físicos cualquier usuario autenticado puede editar
  const kind = (typeof getOrderDetailKind === 'function' ? getOrderDetailKind(order) : order.detailKind) || activeOrderDetailKind;
  if (kind === 'physical') return true;

  if (typeof userHasRole === 'function' && userHasRole('administrador', 'admin')) return true;
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
  if (!user) return false;
  const uid = String(user.id || '').trim();
  const uname = normalizeName(user.username || '');
  const uFullName = normalizeName(user.name || '');

  const orderCreatedById = String(order.createdById || '').trim();
  const orderCreatedByUsername = normalizeName(order.createdByUsername || '');
  const orderCreatedByName = normalizeName(order.createdByName || '');

  if (uid && orderCreatedById && uid === orderCreatedById) return true;
  if (uname && orderCreatedByUsername && uname === orderCreatedByUsername) return true;
  if (uFullName && orderCreatedByName && uFullName === orderCreatedByName) return true;

  if (!orderCreatedById && !orderCreatedByUsername && !orderCreatedByName) {
    return true;
  }
  return false;
}

function isCreatedByAttention(order) {
  if (!order) return false;
  if (order.originRole === 'atencion_clientes' || order.originRole === 'atencion') return true;
  if (order.createdByRole === 'atencion_clientes' || order.createdByRole === 'atencion') return true;
  const user = (state.users || []).find(u =>
    (order.createdById && String(u.id) === String(order.createdById)) ||
    (order.createdByUsername && normalizeName(u.username) === normalizeName(order.createdByUsername))
  );
  if (user && (user.role === 'atencion_clientes' || user.role === 'atencion')) return true;
  return false;
}

function isOrderCreator(order, user) {
  if (!order || !user) return false;
  const uid = user.id ? String(user.id).trim() : '';
  const uname = user.username ? String(user.username).trim().toLowerCase() : '';
  const name = user.name ? String(user.name).trim().toLowerCase() : '';

  if (uid && order.createdById && String(order.createdById).trim() === uid) return true;
  if (uname && order.createdByUsername && String(order.createdByUsername).trim().toLowerCase() === uname) return true;
  if (name && order.createdByName && String(order.createdByName).trim().toLowerCase() === name) return true;
  return false;
}

let editingWOId = '';
let copyingWOFromId = '';
let activeOrderDetailKind = new URLSearchParams(window.location.search).get('detailKind') === 'physical' ? 'physical' : 'network';
if (typeof window !== 'undefined') window.activeOrderDetailKind = activeOrderDetailKind;

if (typeof window !== 'undefined' && typeof window.getZoneLabel !== 'function') {
  window.getZoneLabel = function (id) {
    const regList = (typeof window !== 'undefined' && window.REGS) || (typeof REGS !== 'undefined' && REGS) || [];
    const found = regList.find(r => id && r.id === id);
    return found?.n || id || 'General';
  };
}

if (typeof window !== 'undefined' && typeof window.isOpenOrder !== 'function') {
  window.isOpenOrder = function (order) {
    return !!order && !order.deletedAt && order.status !== 'completada' && order.status !== 'done';
  };
}

function getOrderDetailKind(order) {
  if (order?.detailKind === 'network' || order?.detailKind === 'physical') return order.detailKind;
  return /_red$|^red_/.test(String(order?.category || '')) ? 'network' : 'physical';
}
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
    ['sin_internet', 'Sin servicio de internet'],
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
const ORDER_CATEGORIES = [...ORDER_CATEGORIES_BY_KIND.physical, ...ORDER_CATEGORIES_BY_KIND.network, ...ORDER_CATEGORIES_BY_KIND.support_to_attention];
const PHYSICAL_STATS_EXCLUDED_CATEGORIES = new Set(['instalacion', 'nueva_instalacion', 'instalacion_nueva', 'reubicacion_antena', 'reubicacion', 'resurtir_antena', 'surtir_antena', 'solicitud_respaldo', 'solicitud_de_respaldo']);
let woEvidencePhotos = [];

const activeOrderFilters = {
  status: new Set(),
  type: new Set(),
  date: new Set(),
  assignee: new Set(),
  zone: new Set(),
  priority: new Set(),
  category: new Set(),
  creator: new Set()
};
let filterOnlyMyAssignments = false;
let filterOnlyPendingCounterparty = false;
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
let _currentlyLoadedNotificationOrder = null;

function orderRemoteParams(page = orderCurrentPage) {
  const filters = orderFilters();
  const useWideRoleWindow = Boolean(filterOnlyMyAssignments && activeOrderDetailKind === 'network');
  const params = {
    windowed: '1',
    offset: useWideRoleWindow ? 0 : Math.max(0, (page - 1) * orderRowsPerPage),
    limit: useWideRoleWindow ? 100 : orderRowsPerPage,
    q: document.getElementById('wo-search')?.value.trim() || '',
    sort: filters.sort,
    detailKind: activeOrderDetailKind,
    includeMapCatalog: (state.nodes || []).length ? '' : '1'
  };
  if (requestedOrderCopyId) params.id = requestedOrderCopyId;
  ['status', 'type', 'zone', 'priority', 'category', 'creator', 'date', 'assignee'].forEach(key => {
    if (filters[key]?.size) params[key] = [...filters[key]].join(',');
  });
  if (filterOnlyMyAssignments && activeOrderDetailKind === 'network') {
    const actor = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    params.onlyMyAssignments = actor.id || actor.username || '1';
  }
  return params;
}

window.netopsGetDataPartParams = part => part === 'operations' ? orderRemoteParams() : null;

async function loadOrderPage({ scroll = false } = {}) {
  const sequence = ++orderLoadSequence;
  const previousTableScrollLeft = document.querySelector('.orders-table-card .table-wrap')?.scrollLeft || 0;
  const loadingOperation = beginLoadingOperation('Cargando ordenes', 'Consultando solo los registros visibles.', 500);
  try {
    const params = orderRemoteParams();
    const data = await fetchDataPage('operations', params);
    if (sequence !== orderLoadSequence) return false;
    const remoteTotal = Number(data.total) || 0;
    if (remoteTotal > 0 && Number(params.offset) >= remoteTotal) {
      orderCurrentPage = Math.max(1, Math.ceil(remoteTotal / orderRowsPerPage));
      return loadOrderPage({ scroll });
    }
    state.workOrders = Array.isArray(data.workOrders) ? data.workOrders : [];
    if (_currentlyLoadedNotificationOrder && getOrderDetailKind(_currentlyLoadedNotificationOrder) === activeOrderDetailKind && !state.workOrders.some(w => w.id === _currentlyLoadedNotificationOrder.id)) {
      state.workOrders.unshift(_currentlyLoadedNotificationOrder);
    }
    if (Array.isArray(data.nodes)) state.nodes = data.nodes;
    if (Array.isArray(data.supportUsers)) {
      window.netopsSupportUsers = data.supportUsers;
      try { localStorage.setItem('netops_cached_support_users', JSON.stringify(data.supportUsers)); } catch (e) { }
    }
    if (Array.isArray(data.attentionUsers)) {
      window.netopsAttentionUsers = data.attentionUsers;
      try { localStorage.setItem('netops_cached_attention_users', JSON.stringify(data.attentionUsers)); } catch (e) { }
    }
    if (typeof _previousStateSaved !== 'undefined' && _previousStateSaved) {
      _previousStateSaved.workOrders = cloneData(state.workOrders);
    }
    window.netopsPageMeta = window.netopsPageMeta || {};
    window.netopsPageMeta.operations = {
      total: Number(data.total) || 0,
      offset: Number(params.offset) || 0,
      limit: Number(params.limit) || orderRowsPerPage,
      stats: data.stats || {},
      creators: Array.isArray(data.creators) ? data.creators : []
    };
    try {
      localStorage.setItem('netops_cached_work_orders_' + activeOrderDetailKind, JSON.stringify({
        workOrders: state.workOrders,
        nodes: state.nodes,
        pageMeta: window.netopsPageMeta.operations,
        savedAt: new Date().toISOString()
      }));
    } catch (e) { }
    renderOrderFilterMenus();
    renderWOs();
    const currentTableWrap = document.querySelector('.orders-table-card .table-wrap');
    if (currentTableWrap && previousTableScrollLeft > 0) currentTableWrap.scrollLeft = previousTableScrollLeft;
    if (scroll && currentTableWrap) currentTableWrap.scrollTop = 0;
    return true;
  } catch (error) {
    let restoredFromCache = false;
    try {
      const rawCached = localStorage.getItem('netops_cached_work_orders_' + activeOrderDetailKind);
      if (rawCached) {
        const cached = JSON.parse(rawCached);
        if (cached && Array.isArray(cached.workOrders) && cached.workOrders.length > 0) {
          state.workOrders = cached.workOrders;
          if (Array.isArray(cached.nodes) && cached.nodes.length) state.nodes = cached.nodes;
          if (cached.pageMeta) {
            window.netopsPageMeta = window.netopsPageMeta || {};
            window.netopsPageMeta.operations = cached.pageMeta;
          }
          if (typeof _previousStateSaved !== 'undefined' && _previousStateSaved) {
            _previousStateSaved.workOrders = cloneData(state.workOrders);
          }
          renderOrderFilterMenus();
          renderWOs();
          restoredFromCache = true;
        }
      }
    } catch (e) { }

    if (sequence === orderLoadSequence) {
      if (restoredFromCache) {
        notify('Sin conexión a internet. Mostrando los últimos datos confirmados.', 'warn');
      } else {
        notify(describeSyncError(error), 'err');
        state.workOrders = state.workOrders || [];
        renderOrderFilterMenus();
        renderWOs();
      }
    }
    return restoredFromCache;
  } finally {
    endLoadingOperation(loadingOperation);
  }
}

function mergeOrderLookupRecords(key, records) {
  const current = Array.isArray(state[key]) ? state[key] : [];
  const merged = new Map(current.filter(item => item?.id).map(item => [item.id, item]));
  (Array.isArray(records) ? records : []).forEach(item => { if (item?.id) merged.set(item.id, item); });
  state[key] = [...merged.values()];
  if (typeof _previousStateSaved !== 'undefined' && _previousStateSaved) {
    _previousStateSaved[key] = cloneData(state[key]);
  }
}

const ORDER_FILTER_META = {
  status: { label: 'Estado', options: [['pendiente', 'Pendiente'], ['en_revision', 'En atención'], ['resuelto_soporte', 'Resuelto'], ['devuelto_soporte', 'Devuelto'], ['no_realizado', 'No realizado'], ['completada', 'Concluido']] },
  type: { label: 'Tipo', options: [['comunidad', 'Comunidad'], ['torre', 'Torre'], ['troncal', 'Troncal'], ['punto_venta', 'Punto de venta']] },
  date: { label: 'Fecha', options: [['today', 'Hoy'], ['yesterday', 'Ayer'], ['last7', 'Últimos 7 días'], ['last30', 'Últimos 30 días'], ['this_month', 'Este mes']] },
  assignee: { label: 'Asignación', options: [] },
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
  select.innerHTML = `<option value="">-- Selecciona una categoría --</option>${options.map(([id, label]) => `<option value="${id}">${orderEscape(label)}</option>`).join('')}`;
  select.value = options.some(([id]) => id === selected) ? selected : '';
}

function syncWODetailKindField(kind) {
  const resolved = kind === 'network' ? 'network' : 'physical';
  const input = document.getElementById('wo-detail-kind');
  const label = document.getElementById('wo-detail-kind-label');
  if (input) input.value = resolved;
  if (label) label.textContent = resolved === 'network' ? 'Detalle de red' : 'Detalle físico';
  const modal = document.getElementById('wo-mo');
  if (modal) {
    modal.dataset.kind = resolved;
    modal.dataset.detailKind = resolved;
  }
  const assignField = document.getElementById('wo-assign-field');
  if (assignField) {
    assignField.style.display = resolved === 'network' ? '' : 'none';
  }
  const eqField = document.getElementById('wo-equipment-field') || document.getElementById('wo-equipment')?.closest('.fi');
  const zoneField = document.getElementById('wo-zone-field') || document.getElementById('wo-zone')?.closest('.fi');
  const relInfo = document.getElementById('wo-relation-info');
  const nodeEquipGrid = document.getElementById('wo-node-equipment-grid');
  if (resolved === 'physical') {
    if (eqField) eqField.style.display = 'none';
    if (zoneField) zoneField.style.display = 'none';
    if (relInfo) {
      relInfo.style.display = 'none';
      relInfo.textContent = '';
    }
    if (nodeEquipGrid) nodeEquipGrid.style.gridTemplateColumns = '1fr';
  }
  renderWOCategoryOptions(resolved, document.getElementById('wo-category')?.value || '');
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
  } catch (e) { }
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
  } catch (e) { }
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
        try { localStorage.setItem('netops_cached_support_users', JSON.stringify(res.supportUsers)); } catch (e) { }
      }
      if (Array.isArray(res?.attentionUsers)) {
        window.netopsAttentionUsers = res.attentionUsers;
        try { localStorage.setItem('netops_cached_attention_users', JSON.stringify(res.attentionUsers)); } catch (e) { }
      }
      candidates = targetIsAttention ? getAvailableAttentionUsers() : getAvailableSupportUsers();
    } catch (e) { }
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
    window.addEventListener('pagehide', recordUnconfirmedOrderReviewExit);
    document.addEventListener('keydown', event => {
      const reloadShortcut = event.key === 'F5' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r');
      if (reloadShortcut && pendingOrderReviewDecisionId) {
        event.preventDefault();
        pendingOrderReviewReload = true;
        showOrderReviewDecision(pendingOrderReviewDecisionId);
        return;
      }
      if (event.key === 'Escape' && !event.defaultPrevented) {
        const decisionModal = document.getElementById('order-chat-close-decision-mo');
        const reportModal = document.getElementById('order-tech-report-mo');
        const isDecisionOpen = decisionModal?.classList.contains('open');
        const isReportOpen = reportModal?.classList.contains('open');

        if (isDecisionOpen || isReportOpen) {
          const hasOtherOpenModal = Array.from(document.querySelectorAll('.mo.open')).some(el => el !== reportModal);
          const hasHigherModal = Array.from(document.querySelectorAll('.mo.open')).some(el => el !== reportModal && el !== decisionModal);
          if (hasHigherModal || (hasOtherOpenModal && !isDecisionOpen)) return; // Permitir que ventanas modales superiores cierren primero
          event.preventDefault();
          event.stopImmediatePropagation();
          closeOrderReportModalDirectly();
          return;
        }
      }
    });
    document.addEventListener('click', interceptOrderReviewNavigation, true);
  }
  const puebloField = document.getElementById('wo-node');
  const puebloLabel = puebloField?.closest('.fi')?.querySelector('label');
  if (puebloLabel) puebloLabel.textContent = 'Pueblo';
  const orderModalCopy = document.querySelector('#wo-mo .modal-head p');
  if (orderModalCopy) orderModalCopy.textContent = 'Orden: cliente, categoría, detalle específico, pueblo, zona, tipo y prioridad.';
  setupOrderControls();
  updateOrderDetailTabs();
  initOrderFontScale();
  bindOrderConnectivityEvents();
  try {
    const rawCached = localStorage.getItem('netops_cached_work_orders_' + activeOrderDetailKind);
    if (rawCached) {
      const cached = JSON.parse(rawCached);
      if (cached && Array.isArray(cached.workOrders) && cached.workOrders.length > 0) {
        state.workOrders = cached.workOrders;
        if (Array.isArray(cached.nodes) && cached.nodes.length) state.nodes = cached.nodes;
        if (cached.pageMeta) {
          window.netopsPageMeta = window.netopsPageMeta || {};
          window.netopsPageMeta.operations = cached.pageMeta;
        }
      }
    }
  } catch (_) { }
  renderOrderFilterMenus();
  if (Array.isArray(state.workOrders) && state.workOrders.length > 0) {
    renderWOs();
  }
  loadDB({ showOverlay: false, preferCache: !requestedOrderCopyId }).then(() => {
    fillOrderSelects();
    return loadOrderPage();
  }).catch(() => {
    return loadOrderPage();
  }).then(() => {
    const isReload = (() => {
      try {
        const navEntries = typeof performance !== 'undefined' && performance.getEntriesByType && performance.getEntriesByType('navigation');
        if (navEntries && navEntries[0]) return navEntries[0].type === 'reload';
        if (typeof performance !== 'undefined' && performance.navigation) return performance.navigation.type === 1;
      } catch (e) { }
      return false;
    })();

    const urlParams = new URLSearchParams(window.location.search);
    const notificationOrderId = urlParams.get('orderId') || urlParams.get('id');
    if (notificationOrderId) {
      try {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('orderId');
        cleanUrl.searchParams.delete('id');
        window.history.replaceState({}, '', cleanUrl);
      } catch (e) { }
      if (!isReload) {
        void openOrderTechnicianReport(notificationOrderId);
      }
    }
    if (requestedOrderCopyId) {
      const copyId = requestedOrderCopyId;
      requestedOrderCopyId = '';
      const url = new URL(window.location.href);
      url.searchParams.delete('copyOrderId');
      window.history.replaceState({}, '', url);
      void openWOCopy(copyId);
    }
  });
}

function bindOrderConnectivityEvents() {
  if (document.body.dataset.orderConnectivityBound) return;
  document.body.dataset.orderConnectivityBound = '1';

  window.addEventListener('online', () => {
    notify('Conexión a internet restablecida. Actualizando detalles...', 'ok');
    loadOrderPage();
  });

  const handleOrderWakeRefresh = () => {
    if (navigator.onLine && ((state.workOrders || []).length === 0 || !window.netopsCloudLoadOk)) {
      loadOrderPage();
    }
  };

  window.addEventListener('focus', handleOrderWakeRefresh);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) handleOrderWakeRefresh();
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
  if (typeof optimizeImageForUpload === 'function') return optimizeImageForUpload(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const maxSize = 1600;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', .78));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function addWOEvidenceFiles(fileList) {
  const files = Array.from(fileList || []).filter(file => /^image\//i.test(file.type));
  const available = Math.max(0, 6 - woEvidencePhotos.length);
  if (!available) return notify('Puedes agregar máximo 6 evidencias.', 'err');
  for (const file of files.slice(0, available)) {
    try { woEvidencePhotos.push(await compressWOEvidenceImage(file)); }
    catch { notify('No se pudo leer una de las evidencias.', 'err'); }
  }
  if (files.length > available) notify('Sólo se conservaron las primeras 6 evidencias.', 'warn');
  renderWOEvidencePhotos();
}

function renderWOEvidencePhotos() {
  const preview = document.getElementById('wo-evidence-preview');
  if (!preview) return;
  preview.innerHTML = woEvidencePhotos.length
    ? woEvidencePhotos.map((photo, index) => `<div><img src="${orderEscape(photo)}" alt="Evidencia ${index + 1}"><button type="button" onclick="removeWOEvidencePhoto(${index})" aria-label="Quitar evidencia">×</button></div>`).join('')
    : '<p>Sin evidencias adjuntas.</p>';
}

function removeWOEvidencePhoto(index) {
  woEvidencePhotos.splice(index, 1);
  renderWOEvidencePhotos();
}

function updateOrderDetailTabs() {
  if (typeof window !== 'undefined') {
    window.activeOrderDetailKind = activeOrderDetailKind;
  }
  if (document.body) {
    document.body.dataset.detailKind = activeOrderDetailKind;
  }
  const labels = { network: 'Detalles de red', physical: 'Detalles físicos' };
  ['network', 'physical'].forEach(kind => {
    const tab = document.getElementById(`order-tab-${kind}`);
    const active = kind === activeOrderDetailKind;
    tab?.classList.toggle('is-active', active);
    tab?.setAttribute('aria-selected', String(active));
  });
  const heroTitle = document.getElementById('orders-hero-title');
  const heroSub = document.getElementById('orders-hero-subtitle');
  if (activeOrderDetailKind === 'physical') {
    document.title = 'WiFiMex · Detalles físicos';
    if (heroTitle) heroTitle.textContent = 'Detalles físicos';
    if (heroSub) heroSub.textContent = 'Registro de infraestructura física para consulta y resolución en campo.';
  } else {
    document.title = 'WiFiMex · Detalles de red';
    if (heroTitle) heroTitle.textContent = 'Detalles de red';
    if (heroSub) heroSub.textContent = 'Administra, prioriza y atiende los reportes y requerimientos de red.';
  }
  const newButton = document.querySelector('.order-new-button');
  if (newButton) newButton.setAttribute('aria-label', `Nuevo ${labels[activeOrderDetailKind].toLowerCase().replace(/s$/, '')}`);
  if (typeof updateOrderFiltersForDetailKind === 'function') updateOrderFiltersForDetailKind();
  if (typeof updateActiveNavLink === 'function') updateActiveNavLink();
}

function selectOrderDetailKind(kind, force = false) {
  const next = kind === 'physical' ? 'physical' : 'network';
  const hasOrders = Array.isArray(state.workOrders) && state.workOrders.length > 0;
  if (!force && hasOrders && next === activeOrderDetailKind) return;
  if (force && currentOrderReportId && typeof closeOrderReportModalDirectly === 'function') {
    closeOrderReportModalDirectly();
  }
  activeOrderDetailKind = next;
  if (typeof window !== 'undefined') {
    window.activeOrderDetailKind = activeOrderDetailKind;
  }
  if (_currentlyLoadedNotificationOrder && getOrderDetailKind(_currentlyLoadedNotificationOrder) !== next) {
    _currentlyLoadedNotificationOrder = null;
  }
  if (next !== 'network') {
    filterOnlyMyAssignments = false;
  }
  orderCurrentPage = 1;
  activeOrderFilters.category.clear();
  activeOrderFilters.status.clear();
  closeOrderFilterMenus();
  updateOrderDetailTabs();
  updateOrderFiltersForDetailKind();
  renderActiveOrderFilters();
  renderOrderFilterMenus();
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('detailKind', next);
    window.history.replaceState({}, '', url);
  } catch (e) { }
  try {
    const rawCached = typeof localStorage !== 'undefined' ? localStorage.getItem('netops_cached_work_orders_' + next) : null;
    if (rawCached) {
      const cached = JSON.parse(rawCached);
      if (cached && Array.isArray(cached.workOrders)) {
        state.workOrders = cached.workOrders;
        if (cached.pageMeta) {
          window.netopsPageMeta = window.netopsPageMeta || {};
          window.netopsPageMeta.operations = cached.pageMeta;
        }
      }
    }
  } catch (e) { }
  if (typeof renderWOs === 'function') renderWOs();
  void loadOrderPage({ scroll: true });
}

function clearOrderFilters() {
  const search = document.getElementById('wo-search');
  if (search) search.value = '';
  Object.values(activeOrderFilters).forEach(values => values.clear());
  filterOnlyMyAssignments = false;
  filterOnlyPendingCounterparty = false;
  const btnMy = document.getElementById('wo-filter-my-assignments');
  if (btnMy) btnMy.classList.remove('is-active');
  const sort = document.getElementById('wo-sort');
  if (sort) sort.value = 'priority';
  orderCurrentPage = 1;
  renderActiveOrderFilters();
  renderOrderFilterMenus();
  void loadOrderPage();
}

function toggleOnlyMyAssignments(forceVal) {
  if (activeOrderDetailKind !== 'network') {
    filterOnlyMyAssignments = false;
    return;
  }
  filterOnlyMyAssignments = typeof forceVal === 'boolean' ? forceVal : !filterOnlyMyAssignments;
  const btn = document.getElementById('wo-filter-my-assignments');
  if (btn) btn.classList.toggle('is-active', filterOnlyMyAssignments);
  orderCurrentPage = 1;
  renderActiveOrderFilters();
  void loadOrderPage();
}

function toggleOnlyPendingCounterparty(forceVal) {
  filterOnlyPendingCounterparty = false;
}

function updateOrderFiltersForDetailKind() {
  const isNetwork = activeOrderDetailKind === 'network';
  if (!isNetwork) {
    filterOnlyMyAssignments = false;
  }
  const wrapStatus = document.getElementById('order-filter-wrap-status');
  const wrapType = document.getElementById('order-filter-wrap-type');
  const wrapDate = document.getElementById('order-filter-wrap-date');
  const wrapAssignee = document.getElementById('order-filter-wrap-assignee');
  const btnMyAssignments = document.getElementById('wo-filter-my-assignments');
  const btnAdminStats = document.getElementById('wo-admin-stats-btn');
  const isAdmin = typeof userHasRole === 'function' && userHasRole('administrador', 'admin');
  const isSupportOrAttention = typeof userHasRole === 'function' && (userHasRole('soporte') || userHasRole('atencion_clientes') || isAdmin);

  if (wrapStatus) wrapStatus.style.display = '';
  if (wrapType) wrapType.style.display = isNetwork ? 'none' : '';
  if (wrapDate) wrapDate.style.display = isNetwork ? '' : 'none';
  if (wrapAssignee) wrapAssignee.style.display = isNetwork ? '' : 'none';
  if (btnMyAssignments) {
    btnMyAssignments.style.display = isNetwork ? '' : 'none';
    btnMyAssignments.classList.toggle('is-active', isNetwork && filterOnlyMyAssignments);
  }
  if (btnAdminStats) btnAdminStats.style.display = (isAdmin && isNetwork) ? 'inline-flex' : 'none';

  const myPendingCard = document.getElementById('wo-stat-my-pending-card');
  const myDoneCard = document.getElementById('wo-stat-my-done-card');
  if (myPendingCard) myPendingCard.style.display = (isNetwork && isSupportOrAttention) ? '' : 'none';
  if (myDoneCard) myDoneCard.style.display = (isNetwork && isSupportOrAttention) ? '' : 'none';

  // Ocultar guías de flujo y colores en detalles físicos (son exclusivas de la coordinación de red)
  const guidesGroup = document.querySelector('.order-subtle-guides-group');
  if (guidesGroup) guidesGroup.style.display = isNetwork ? '' : 'none';
}

function getOrderFilterOptions(kind) {
  if (kind === 'category') return orderCategoriesForKind(activeOrderDetailKind);
  if (kind === 'date') {
    return [
      ['today', 'Hoy'],
      ['yesterday', 'Ayer'],
      ['last7', 'Últimos 7 días'],
      ['last30', 'Últimos 30 días'],
      ['this_month', 'Este mes']
    ];
  }
  if (kind === 'assignee') {
    const opts = [['unassigned', 'Sin asignar (Todo el equipo)']];
    const allowedRoles = new Set(['administrador', 'admin', 'soporte', 'atencion_clientes', 'atencion']);
    const isAllowedUserRole = r => allowedRoles.has(typeof normalizeRole === 'function' ? normalizeRole(r) : String(r || '').toLowerCase());
    const pool = [...getAvailableSupportUsers(), ...getAvailableAttentionUsers()];
    const seen = new Set(['unassigned']);
    pool.forEach(user => {
      const id = String(user.id || '').trim();
      if (id && !seen.has(id)) {
        seen.add(id);
        opts.push([id, user.name || user.username || 'Usuario']);
      }
    });
    (state.workOrders || []).forEach(order => {
      if (order.assignedUserId && !seen.has(order.assignedUserId)) {
        const matchingUser = (state.users || []).find(u => String(u.id || '').trim() === String(order.assignedUserId).trim());
        if (!matchingUser || isAllowedUserRole(matchingUser.role)) {
          seen.add(order.assignedUserId);
          opts.push([order.assignedUserId, order.assignedUserName || order.assignedUserId]);
        }
      }
    });
    return opts;
  }
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
    return [
      ['pendiente', 'Registro activo'],
      ['completada', 'Completado']
    ];
  }
  if (kind === 'zone') return (REGS || []).map(region => [region.id, region.n]);
  if (kind === 'creator') {
    const allowedRoles = new Set(['administrador', 'admin', 'soporte', 'atencion_clientes', 'atencion']);
    const isAllowedUserRole = r => allowedRoles.has(typeof normalizeRole === 'function' ? normalizeRole(r) : String(r || '').toLowerCase());
    const remoteCreators = window.netopsPageMeta?.operations?.creators;
    if (Array.isArray(remoteCreators) && remoteCreators.length) {
      return remoteCreators
        .filter(user => {
          if (!user) return false;
          const matchingUser = (state.users || []).find(u => String(u.id || '').trim() === String(user.id || '').trim() || String(u.username || '').trim().toLowerCase() === String(user.username || '').trim().toLowerCase());
          return !matchingUser || isAllowedUserRole(matchingUser.role);
        })
        .map(user => [user.id, user.name]);
    }
    return [...new Map((state.workOrders || [])
      .filter(order => {
        const creatorId = order.createdById || order.createdBy;
        const creatorName = order.createdByName || order.createdByUsername;
        if (!creatorId && !creatorName) return false;
        const matchingUser = (state.users || []).find(u =>
          (creatorId && String(u.id || '').trim() === String(creatorId).trim()) ||
          (creatorName && (String(u.name || '').trim().toLowerCase() === String(creatorName).trim().toLowerCase() || String(u.username || '').trim().toLowerCase() === String(creatorName).trim().toLowerCase()))
        );
        return !matchingUser || isAllowedUserRole(matchingUser.role);
      })
      .map(order => [order.createdById || order.createdByName, order.createdByName || order.createdByUsername || 'Usuario']))
      .entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  }
  return ORDER_FILTER_META[kind]?.options || [];
}

function getStatusFilterDotClass(statusValue) {
  const s = String(statusValue || '').toLowerCase();
  if (s === 'pendiente') return 'is-pending';
  if (s === 'en_revision') return 'is-reviewing';
  if (s === 'resuelto_soporte') return 'is-resolving';
  if (s === 'devuelto_soporte') return 'is-returned';
  if (s === 'no_realizado') return 'is-unresolvable';
  if (s === 'completada') return 'is-done';
  if (s === 'revisado') return 'is-reviewed';
  return 'is-pending';
}

function sortOrdersByStatusFromFilter(event) {
  event?.stopPropagation();
  const sortSelect = document.getElementById('wo-sort');
  if (sortSelect) {
    sortSelect.value = 'status';
    closeOrderFilterMenus();
    resetOrderPagination();
  }
}

function renderOrderFilterMenus() {
  const currentSort = document.getElementById('wo-sort')?.value || 'priority';
  document.querySelectorAll('[data-order-filter-menu]').forEach(menu => {
    const kind = menu.dataset.orderFilterMenu;
    const options = getOrderFilterOptions(kind);
    const statusSortHeader = kind === 'status'
      ? `<button type="button" class="order-filter-option order-filter-sort-shortcut ${currentSort === 'status' ? 'is-selected' : ''}" onclick="sortOrdersByStatusFromFilter(event)"><span class="order-filter-check">${currentSort === 'status' ? '✓' : '⇅'}</span><span>Ordenar tabla por estado</span></button><div class="order-filter-menu-divider"></div>`
      : '';
    let customDateFooter = '';
    if (kind === 'date') {
      let currentFrom = '';
      let currentTo = '';
      const rangeEntry = [...(activeOrderFilters.date || [])].find(v => v.startsWith('range:') || v.includes('_'));
      if (rangeEntry) {
        const parts = rangeEntry.replace('range:', '').split('_');
        currentFrom = parts[0] || '';
        currentTo = parts[1] || '';
      }
      customDateFooter = `
        <div class="order-filter-menu-divider"></div>
        <div class="order-date-picker-box" onclick="event.stopPropagation()">
          <span class="order-date-picker-title"><svg style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2.2;vertical-align:-1px;margin-right:4px;" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Rango con calendario</span>
          <div class="order-date-picker-fields">
            <label class="order-date-picker-label">
              <span>Desde:</span>
              <input type="date" id="wo-date-from" class="order-date-picker-input" value="${orderEscape(currentFrom)}">
            </label>
            <label class="order-date-picker-label">
              <span>Hasta:</span>
              <input type="date" id="wo-date-to" class="order-date-picker-input" value="${orderEscape(currentTo)}">
            </label>
          </div>
          <div class="order-date-picker-actions">
            <button type="button" class="btn bc order-date-picker-apply" onclick="applyCustomDateRange(event)">Aplicar rango</button>
            ${rangeEntry ? `<button type="button" class="btn bgh order-date-picker-clear" onclick="clearCustomDateRange(event)">Limpiar</button>` : ''}
          </div>
        </div>
      `;
    }
    menu.innerHTML = options.length ? statusSortHeader + options.map(([value, label]) => {
      const selected = activeOrderFilters[kind]?.has(String(value));
      const safeValue = encodeURIComponent(value).replace(/'/g, '%27');
      const dotHtml = kind === 'status'
        ? `<span class="order-filter-status-dot ${getStatusFilterDotClass(value)}" aria-hidden="true"></span>`
        : '';
      return `<button type="button" class="order-filter-option ${selected ? 'is-selected' : ''}" onclick="toggleOrderFilterOption('${kind}','${safeValue}',event)"><span class="order-filter-check">${selected ? '✓' : ''}</span>${dotHtml}<span>${orderEscape(label)}</span></button>`;
    }).join('') + customDateFooter : '<span class="order-filter-menu-empty">Sin opciones disponibles</span>' + customDateFooter;
  });
  updateOrderFilterButtons();
}

function applyCustomDateRange(event) {
  event?.stopPropagation();
  const fromEl = document.getElementById('wo-date-from');
  const toEl = document.getElementById('wo-date-to');
  const fromVal = fromEl?.value || '';
  const toVal = toEl?.value || '';
  if (!fromVal && !toVal) {
    if (typeof notify === 'function') notify('Selecciona al menos una fecha para el rango.', 'warn');
    return;
  }
  if (!activeOrderFilters.date) activeOrderFilters.date = new Set();
  activeOrderFilters.date.clear();
  activeOrderFilters.date.add(`range:${fromVal}_${toVal}`);
  orderCurrentPage = 1;
  renderActiveOrderFilters();
  renderOrderFilterMenus();
  closeOrderFilterMenus();
  void loadOrderPage();
}

function clearCustomDateRange(event) {
  event?.stopPropagation();
  if (activeOrderFilters.date) {
    [...activeOrderFilters.date].forEach(val => {
      if (val.startsWith('range:') || val.includes('_')) {
        activeOrderFilters.date.delete(val);
      }
    });
  }
  orderCurrentPage = 1;
  renderActiveOrderFilters();
  renderOrderFilterMenus();
  closeOrderFilterMenus();
  void loadOrderPage();
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
    const baseLabel = ORDER_FILTER_META[kind]?.label || (kind === 'zone' ? 'Zona' : (kind === 'assignee' ? 'Asignación' : (kind === 'date' ? 'Fecha' : 'Creado por')));
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
  if (kind === 'date') {
    if (value.startsWith('range:') || value.includes('_')) {
      const parts = value.replace('range:', '').split('_');
      if (parts[0] && parts[1]) return `${parts[0]} al ${parts[1]}`;
      if (parts[0]) return `Desde ${parts[0]}`;
      if (parts[1]) return `Hasta ${parts[1]}`;
    }
  }
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
  if (typeof loadOrderPage === 'function' && !filterOnlyMyAssignments) {
    void loadOrderPage({ scroll: true });
  } else {
    renderWOs();
    const currentTableWrap = document.querySelector('.orders-table-card .table-wrap');
    if (currentTableWrap) currentTableWrap.scrollTop = 0;
  }
}

function changeOrderPageSize(value) {
  const size = Number(value);
  orderRowsPerPage = [5, 10, 15, 20, 25, 50, 100].includes(size) ? size : 15;
  orderCurrentPage = 1;
  if (typeof loadOrderPage === 'function') {
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
    const groupLabel = ORDER_FILTER_META[kind]?.label || (kind === 'zone' ? 'Zona' : (kind === 'assignee' ? 'Asignación' : (kind === 'date' ? 'Fecha' : 'Creado por')));
    const valueLabel = getOrderFilterOptionLabel(kind, value);
    const safeValue = encodeURIComponent(value).replace(/'/g, '%27');
    return `<button type="button" class="order-filter-chip" onclick="removeOrderFilter('${kind}','${safeValue}')"><span>${orderEscape(groupLabel)}: <strong>${orderEscape(valueLabel)}</strong></span><b aria-hidden="true">×</b></button>`;
  }));
  if (filterOnlyMyAssignments && activeOrderDetailKind === 'network') {
    chips.unshift(`<button type="button" class="order-filter-chip is-my-assignment-chip" onclick="toggleOnlyMyAssignments(false)"><span><strong>★ Mis detalles</strong></span><b aria-hidden="true">×</b></button>`);
  }
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
  await new Promise(resolve => setTimeout(resolve, 150));
  if (sequence !== orderNodeLookupSequence) return;
  try {
    const data = await fetchDataPage('nodes', { q: rawQuery, limit: 8, offset: 0 });
    if (sequence !== orderNodeLookupSequence) return;
    mergeOrderLookupRecords('nodes', data.nodes);
  } catch (error) {
    if (sequence === orderNodeLookupSequence) console.warn('No se pudo buscar pueblos', error);
  }
  const matches = getMatchingNodesForInput();
  const exactMatch = matches.some(node => [getNodeLabel(node), node.nodeCode, node.town].some(value => normalizeName(value) === normalizeName(rawQuery)));
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
      const data = await fetchDataPage('equipment', { nodeIds: n.id, paged: '1', windowed: '1', limit: 100, offset: 0 });
      mergeOrderLookupRecords('equipment', data.equipment);
    } catch (error) {
      console.warn('No se pudieron consultar las antenas del pueblo', error);
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
      <div class="modal-grid"><div class="fi"><label>Clave del pueblo</label><input id="wo-qnode-code" placeholder="R114" style="text-transform:uppercase" oninput="this.value=this.value.toLocaleUpperCase('es-MX');renderWOQuickNodeWarnings()"></div><div class="fi"><label>Pueblo / colonia</label><input id="wo-qnode-town" placeholder="BARRIO GUADALUPE" style="text-transform:uppercase" oninput="this.value=this.value.toLocaleUpperCase('es-MX');renderWOQuickNodeWarnings()"></div></div>
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
  document.getElementById('wo-qnode-town').value = String(name || '').trim().toLocaleUpperCase('es-MX');
  document.getElementById('wo-qnode-zone').value = document.getElementById('wo-zone')?.value || '';
  document.getElementById('wo-qnode-status').value = 'activo';
  document.getElementById('wo-qnode-location').value = '';
  document.getElementById('wo-qnode-notes').value = '';
  renderWOQuickNodeWarnings();
  OM('wo-quick-node-mo');
  setTimeout(() => document.getElementById('wo-qnode-code')?.focus(), 0);
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
    if (matches.length) warnings.push(`<div class="node-warning"><strong>Esta clave ya existe.</strong><span class="muted">Pueblos registrados: ${orderEscape(matches.map(node => node.town).filter(Boolean).slice(0, 6).join(', ') || 'sin nombre')}</span></div>`);
  }
  if (town) {
    const matches = nodes.filter(node => normalizeName(node.town) === town);
    if (matches.length) warnings.push(`<div class="node-warning"><strong>Ese pueblo/colonia ya está registrado.</strong><span class="muted">Clave(s): ${orderEscape(matches.map(node => node.nodeCode).filter(Boolean).slice(0, 6).join(', ') || 'sin clave')}</span></div>`);
  }
  box.innerHTML = warnings.join('');
}

async function saveWOQuickNode() {
  const location = parseLocationCoordinates(document.getElementById('wo-qnode-location').value);
  const toUpperTown = v => String(v || '').trim().toLocaleUpperCase('es-MX');
  const payload = {
    nodeCode: toUpperTown(document.getElementById('wo-qnode-code').value),
    town: toUpperTown(document.getElementById('wo-qnode-town').value),
    zone: document.getElementById('wo-qnode-zone').value,
    lat: location?.lat ?? NaN,
    lng: location?.lng ?? NaN,
    status: document.getElementById('wo-qnode-status').value,
    notes: document.getElementById('wo-qnode-notes').value.trim()
  };
  if (!payload.nodeCode) return showWOQuickNodeError('wo-qnode-code', 'Escribe la clave del pueblo.');
  if (!payload.town) return showWOQuickNodeError('wo-qnode-town', 'Escribe el pueblo o colonia.');
  if (!payload.zone) return showWOQuickNodeError('wo-qnode-zone', 'Selecciona la zona.');
  if (isNaN(payload.lat) || isNaN(payload.lng)) return showWOQuickNodeError('wo-qnode-location', 'Escribe coordenadas válidas o pega un enlace de Google Maps.');
  const duplicate = (state.nodes || []).find(node => !node.deletedAt && normalizeName(node.nodeCode) === normalizeName(payload.nodeCode) && normalizeName(node.town) === normalizeName(payload.town));
  if (duplicate) return showWOQuickNodeError('wo-qnode-town', 'Ya existe esa misma clave con ese mismo pueblo/colonia.');
  const auditStart = Array.isArray(state.auditLog) ? state.auditLog.length : 0;
  const node = { id: gid('nd'), createdAt: new Date().toISOString(), ...payload };
  setCreatedAudit(node, 'agregó pueblo desde orden');
  state.nodes.push(node);
  const saved = await saveRecord('nodes', node);
  if (!saved) return;
  for (const audit of (state.auditLog || []).slice(auditStart)) await saveRecord('auditLog', audit);
  CM('wo-quick-node-mo');
  await chooseWONode(node.id);
  notify('Pueblo registrado y seleccionado.');
}

function showWOQuickNodeError(fieldId, message) {
  const field = document.getElementById(fieldId);
  notify(message, 'err');
  field?.classList.add('wo-field-invalid');
  field?.focus({ preventScroll: true });
  field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => field?.classList.remove('wo-field-invalid'), 2400);
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
  await new Promise(resolve => setTimeout(resolve, 150));
  if (sequence !== orderEquipmentLookupSequence) return;
  try {
    const data = await fetchDataPage('equipment', { q: rawQuery, limit: 8, offset: 0 });
    if (sequence !== orderEquipmentLookupSequence) return;
    mergeOrderLookupRecords('equipment', data.equipment);
  } catch (error) {
    if (sequence === orderEquipmentLookupSequence) console.warn('No se pudo buscar antenas', error);
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
  if (!isNetwork || isNetwork) {
    // Tanto en detalle físico (solo pueblo, sin solicitar antena ni zona) como en red se mantiene oculta la caja
    box.style.display = 'none';
    box.textContent = '';
    return;
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
    tasks.push(fetchDataPage('nodes', { id: order.nodeId, limit: 1 }).then(data => mergeOrderLookupRecords('nodes', data.nodes)));
  }
  if (order?.equipmentId && !(state.equipment || []).some(item => item.id === order.equipmentId)) {
    tasks.push(fetchDataPage('equipment', { id: order.equipmentId, limit: 1 }).then(data => mergeOrderLookupRecords('equipment', data.equipment)));
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

    if (modalTitle) modalTitle.textContent = editingWOId ? 'Editar registro de detalle físico' : 'Registrar detalle físico';
    if (modalSub) modalSub.textContent = 'Registro de infraestructura física para consulta y resolución posterior en ruta.';
    if (saveBtn) saveBtn.textContent = 'Guardar registro';

    const stepNetworkTitle = document.querySelector('#wo-step-network-card .modal-section-card-title span:last-child');
    if (stepNetworkTitle) stepNetworkTitle.textContent = 'Pueblo'; // Anteriormente 'Ubicación de infraestructura (Pueblo y Antena)', ahora solo pueblo

    const targetTeamFi = document.getElementById('wo-target-team-field');
    if (targetTeamFi) targetTeamFi.style.display = 'none';

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

    // Pueblo (1 sola columna a ancho completo; en detalle físico NO se solicita antena ni zona)
    if (nodeGrid) {
      nodeGrid.style.display = 'grid';
      nodeGrid.style.gridTemplateColumns = '1fr';
    }
    if (nodeFi) {
      nodeFi.style.display = '';
      nodeFi.style.gridColumn = '1 / -1';
      const nLabel = nodeFi.querySelector('label');
      if (nLabel) nLabel.innerHTML = 'Pueblo vinculado <b class="req-star" style="color:#ef4444;font-size:11px;margin-left:4px;">* Obligatorio</b>';
    }
    if (nodeInput) nodeInput.placeholder = 'Busca un pueblo o escribe uno nuevo...';

    // Antena asignada: OCULTA (no se solicita antena en detalle físico)
    if (equipmentFi) equipmentFi.style.display = 'none';

    // Relation info box: OCULTO en detalle físico
    if (relationInfo) {
      relationInfo.style.display = 'none';
      relationInfo.textContent = '';
    }

    // Zona: OCULTA (no se solicita zona en detalle físico, solo pueblo)
    if (zoneFi) zoneFi.style.display = 'none';

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
  const stepNetworkTitle = document.querySelector('#wo-step-network-card .modal-section-card-title span:last-child');
  if (stepNetworkTitle) stepNetworkTitle.textContent = 'Pueblo y Asignación de Atención';

  if (detailKindFi) detailKindFi.style.display = 'none';
  if (equipmentFi) equipmentFi.style.display = 'none';
  if (relationInfo) relationInfo.style.display = 'none';
  if (zoneFi) zoneFi.style.display = 'none';
  if (priorityIntervalBox) priorityIntervalBox.style.display = 'none';

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
    if (locationFi) {
      locationFi.style.display = '';
      const lLabel = locationFi.querySelector('label');
      if (lLabel) lLabel.textContent = 'Ubicación GPS (opcional)';
      const lInput = document.getElementById('wo-location');
      if (lInput) lInput.placeholder = 'Coordenadas o referencia de ubicación';
    }
    if (nodeGrid) {
      nodeGrid.style.display = '';
      nodeGrid.style.gridTemplateColumns = '1fr';
    }
    if (nodeFi) {
      nodeFi.style.display = '';
      nodeFi.style.gridColumn = '1 / -1';
      const nLabel = nodeFi.querySelector('label');
      if (nLabel) nLabel.innerHTML = 'Pueblo vinculado <b class="req-star">* Obligatorio</b>';
    }
    if (nodeInput) nodeInput.placeholder = 'Busca un pueblo o escribe uno nuevo...';
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
    if (priorityLabel) priorityLabel.textContent = 'Prioridad';

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
    if (priorityLabel) priorityLabel.textContent = 'Prioridad';

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
    if (existing && !canEditOrder(existing)) {
      notify('Acción restringida: Solo el usuario que creó este detalle puede editarlo.', 'warn');
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
      try { await ensureOrderRelationRecords(w); } catch (error) { console.warn('No se pudieron cargar las relaciones de la orden', error); }
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
      const wNode = getOrderNode(w);
      document.getElementById('wo-node-id').value = w.nodeId || wNode?.id || '';
      document.getElementById('wo-node').value = wNode ? getNodeLabel(wNode) : (w.nodeName || w.nodeCode || w.town || '');
      if (document.getElementById('wo-equipment-id')) document.getElementById('wo-equipment-id').value = w.equipmentId || '';
      if (document.getElementById('wo-equipment')) document.getElementById('wo-equipment').value = w.equipmentName || getOrderEquipment(w)?.name || '';
      document.getElementById('wo-zone').value = w.region || target.zone || '';
      document.getElementById('wo-type').value = w.visitType || 'comunidad';
      document.getElementById('wo-priority').value = w.priority || 'media';
      updateWOPriorityReminderHint(w.reminderIntervalMin);
      const report = w.technicianReport || {};
      woEvidencePhotos = [...new Set([...(Array.isArray(w.evidencePhotos) ? w.evidencePhotos : []), (Array.isArray(report.evidencePhotos) ? report.evidencePhotos : []), report.evidencePhoto].flat().filter(Boolean))].slice(0, 6);
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

function showWOFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  notify(message, 'err');
  if (!field) return;
  document.querySelectorAll('#wo-mo .wo-field-invalid').forEach(item => item.classList.remove('wo-field-invalid'));
  field.classList.add('wo-field-invalid');
  field.focus({ preventScroll: true });
  field.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => field.classList.remove('wo-field-invalid'), 2400);
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
    if (!typedNode) return showWOFieldError('wo-node', 'Busca un pueblo o escribe uno nuevo.');
    if (!node) return showWOFieldError('wo-node', 'Selecciona un pueblo registrado o pulsa “Agregar pueblo” para crearlo.');
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
    clientPhone: document.getElementById('wo-phone')?.value.trim() || '',
    detailLocation: document.getElementById('wo-location')?.value.trim() || '',
    category,
    detailKind: isNetwork ? 'network' : 'physical',
    targetRole,
    originRole,
    assignedUserId,
    assignedUserName,
    assignedUserRole: isNetwork ? (targetIsAttention ? 'atencion_clientes' : 'soporte') : '',
    title: effectiveDetail,
    description: specificDetail,
    nodeId: node?.id || '',
    nodeCode: node?.nodeCode || typedNode || '',
    nodeName: node ? getNodeLabel(node) : typedNode,
    town: node?.town || typedNode || '',
    region: region || node?.zone || 'General',
    visitType: (!isNetwork && document.getElementById('wo-type')?.value) ? document.getElementById('wo-type').value : (isNetwork && !targetIsAttention && document.getElementById('wo-type')?.value ? document.getElementById('wo-type').value : 'comunidad'),
    priority: selectedPriority,
    reminderIntervalMin: (!isNaN(customReminderMins) && customReminderMins > 0) ? customReminderMins : undefined,
    // Para órdenes de NODO solo guardamos lat/lng cuando el usuario capturó ubicación válida.
    // No usamos la ubicación del nodo porque la orden puede ser de un cliente o referencia distinta.
    lat: parsed.lat || '',
    lng: parsed.lng || '',
    status: existingWO?.status || 'pendiente',
    equipmentId: linkedEquipmentId,
    equipmentName: linkedEquipmentName
  };
  const existingReport = existingWO?.technicianReport;
  if (woEvidencePhotos.length || existingReport) {
    payload.evidencePhotos = woEvidencePhotos.slice();
    payload.technicianReport = {
      ...(existingReport || {}),
      result: existingReport?.result || 'pendiente',
      evidencePhotos: woEvidencePhotos.slice(),
      evidencePhoto: woEvidencePhotos[0] || ''
    };
  }

  let savedOrder;
  if (editingWOId) {
    const w = (state.workOrders || []).find(x => x.id === editingWOId);
    if (!w) return;
    if (!canEditOrder(w)) {
      notify('Acción no permitida: Solo el usuario que creó este detalle puede editarlo.', 'err');
      return;
    }
    const oldAssigneeId = w.assignedUserId || '';
    const oldAssigneeName = w.assignedUserName || '';
    const newAssigneeId = payload.assignedUserId || '';
    const newAssigneeName = payload.assignedUserName || '';

    // Reasignación de quién contestará/atenderá el detalle
    if (isNetwork && (oldAssigneeId !== newAssigneeId || oldAssigneeName !== newAssigneeName)) {
      w.reviewOpenedById = '';
      w.reviewOpenedByName = '';
      w.reviewOpenedByUsername = '';
      w.reviewOpenedAt = '';
      const reassignLabel = newAssigneeName ? `Reasignado a ${newAssigneeName}` : 'Reasignado al equipo general';
      appendSharedNetworkFollowUp(w, 'reasignado', 'Reasignación de atención', reassignLabel);
    }

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
  await loadOrderPage({ scroll: !editingWOId });
}

function orderFilters() {
  return {
    q: normalizeName(document.getElementById('wo-search')?.value || ''),
    status: activeOrderFilters.status,
    type: activeOrderFilters.type,
    date: activeOrderFilters.date,
    assignee: activeOrderFilters.assignee,
    zone: activeOrderFilters.zone,
    priority: activeOrderFilters.priority,
    category: activeOrderFilters.category,
    creator: activeOrderFilters.creator,
    onlyMyAssignments: filterOnlyMyAssignments,
    sort: document.getElementById('wo-sort')?.value || 'priority'
  };
}

function getNetworkOrderTurnGroup(order) {
  const status = String(order?.status || 'pendiente').toLowerCase();
  if (status === 'completada' || status === 'concluido' || status === 'done') {
    return { group: 'done', rank: 2, label: 'Concluidos' };
  }
  const kind = typeof getOrderDetailKind === 'function' ? getOrderDetailKind(order) : (order?.detailKind || 'physical');
  if (kind !== 'network') {
    return { group: 'my_action', rank: 0, label: 'Activos' };
  }

  const pendingAction = typeof getOrderPendingUserAction === 'function'
    ? getOrderPendingUserAction(order)
    : (typeof getNetworkPendingActionMeta === 'function' ? getNetworkPendingActionMeta(order) : null);

  if (pendingAction?.requiresMyAction) {
    return { group: 'my_action', rank: 0, label: 'Pendientes de tu acción' };
  }
  if (pendingAction?.waitingOther) {
    return { group: 'other_area', rank: 1, label: 'Corresponde a otra área' };
  }

  const isSoporte = typeof userHasRole === 'function' && userHasRole('soporte');
  const isAtencion = typeof userHasRole === 'function' && userHasRole('atencion_clientes');
  const isAdmin = typeof userHasRole === 'function' && userHasRole('administrador', 'admin');
  const isSentToAttention = typeof isNetworkSupportToAttention === 'function' ? isNetworkSupportToAttention(order) : false;
  const assignedArea = typeof getOrderAssignedAreaRole === 'function' ? getOrderAssignedAreaRole(order) : '';
  const belongsToAttention = assignedArea ? (assignedArea === 'atencion_clientes') : isSentToAttention;

  if (isAtencion && !isSoporte && !isAdmin) {
    return belongsToAttention
      ? { group: 'my_action', rank: 0, label: 'Pendientes de tu acción' }
      : { group: 'other_area', rank: 1, label: 'Corresponde a otra área (Soporte técnico)' };
  }
  if (isSoporte && !isAtencion && !isAdmin) {
    return !belongsToAttention
      ? { group: 'my_action', rank: 0, label: 'Pendientes de tu acción' }
      : { group: 'other_area', rank: 1, label: 'Corresponde a otra área (Atención a clientes)' };
  }

  // Administrador ve los activos que requieren atención arriba y en espera abajo
  if (status === 'resuelto_soporte' || status === 'no_realizado' || status === 'revisado') {
    return { group: 'other_area', rank: 1, label: 'En espera de confirmación' };
  }
  return { group: 'my_action', rank: 0, label: 'Pendientes de atención' };
}

function getOrderLifecycleRank(order) {
  const status = String(order?.status || 'pendiente').toLowerCase();
  // 3° Al final de todo: Concluidos
  if (status === 'completada' || status === 'concluido' || status === 'done') return 3;

  const pendingAction = typeof getOrderPendingUserAction === 'function'
    ? getOrderPendingUserAction(order)
    : (typeof getNetworkPendingActionMeta === 'function' ? getNetworkPendingActionMeta(order) : null);

  const kind = typeof getOrderDetailKind === 'function' ? getOrderDetailKind(order) : (order?.detailKind || 'physical');
  if (kind === 'network') {
    const turn = getNetworkOrderTurnGroup(order);
    if (turn.group === 'my_action') {
      return pendingAction?.requiresMyAction ? 0 : 1;
    }
    if (turn.group === 'other_area') {
      return 2;
    }
    return 3;
  }

  // 2° En medio: los que faltan por responder/confirmar de la otra parte
  if (pendingAction?.waitingOther || status === 'resuelto_soporte' || status === 'no_realizado' || status === 'revisado') {
    return 2;
  }

  // 1° Al inicio: los que faltan por resolver (acción requerida por mí, pendientes, en revisión o devueltos)
  if (pendingAction?.requiresMyAction) return 0;
  return 1;
}

function getOrderStatusSortRank(order) {
  const status = String(order?.status || 'pendiente').toLowerCase();
  if (status === 'completada' || status === 'concluido' || status === 'done') return 5;

  const pendingAction = typeof getOrderPendingUserAction === 'function'
    ? getOrderPendingUserAction(order)
    : (typeof getNetworkPendingActionMeta === 'function' ? getNetworkPendingActionMeta(order) : null);

  const kind = typeof getOrderDetailKind === 'function' ? getOrderDetailKind(order) : (order?.detailKind || 'physical');
  if (kind === 'network') {
    const turn = getNetworkOrderTurnGroup(order);
    if (turn.group === 'other_area') return 3;
    if (pendingAction?.requiresMyAction) return 0;
    if (status === 'devuelto_soporte') return 1;
    return 2;
  }

  if (pendingAction?.waitingOther || status === 'resuelto_soporte' || status === 'no_realizado' || status === 'revisado') {
    return 3;
  }
  if (pendingAction?.requiresMyAction) return 0;
  if (status === 'devuelto_soporte') return 1;
  return 2;
}

function getOrderPriorityRank(order) {
  const prio = String(order?.priority || 'media').toLowerCase();
  if (prio === 'muy_alta') return 0;
  if (prio === 'alta') return 1;
  if (prio === 'media') return 2;
  return 3;
}

function getOrderConcludedTimestamp(order) {
  return new Date(order?.completedAt || order?.updatedAt || order?.createdAt || 0).getTime();
}

function filteredOrders() {
  const currentActor = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
  const actorId = String(currentActor?.id || '').toLowerCase();
  const actorName = normalizeName(currentActor?.name || currentActor?.username || '');

  const rawList = (state.workOrders || []).filter(w => {
    if (w.deletedAt) return false;
    if (getOrderDetailKind(w) !== activeOrderDetailKind) return false;

    // Filtro "Mis detalles"
    // Solo los que faltan por resolver (sin envíos) o los que faltan por confirmar de este lado (solo en red)
    if (filterOnlyMyAssignments && activeOrderDetailKind === 'network') {
      const st = String(w.status || 'pendiente').toLowerCase();
      const isCompleted = st === 'completada' || st === 'concluido' || st === 'done';
      if (isCompleted) return false;

      if (typeof isOrderPendingForUser === 'function') {
        if (!isOrderPendingForUser(w, currentActor)) return false;
      } else {
        const isMine = (typeof isOrderAssignedToUser === 'function' && isOrderAssignedToUser(w, currentActor)) ||
          (w.assignedUserId && String(w.assignedUserId).toLowerCase().includes(actorId)) ||
          (w.assignedUserName && normalizeName(w.assignedUserName).includes(actorName)) ||
          (w.reviewOpenedById && String(w.reviewOpenedById).toLowerCase() === actorId);
        if (!isMine) return false;
      }
    }

    // Filtro por estado
    if (activeOrderFilters.status && activeOrderFilters.status.size > 0) {
      const st = String(w.status || 'pendiente').toLowerCase();
      const matchesStatus = [...activeOrderFilters.status].some(s => {
        const sel = String(s).toLowerCase();
        if (sel === st) return true;
        if (sel === 'resuelto_soporte' && (st === 'resuelto' || st === 'por_confirmar')) return true;
        if (sel === 'completada' && (st === 'concluido' || st === 'done')) return true;
        return false;
      });
      if (!matchesStatus) return false;
    }

    // Filtro por asignación
    if (activeOrderFilters.assignee && activeOrderFilters.assignee.size > 0) {
      const hasAssigneeMatch = [...activeOrderFilters.assignee].some(selId => {
        if (selId === 'unassigned') {
          return !w.assignedUserId && !w.assignedUserName;
        }
        return (w.assignedUserId && String(w.assignedUserId).includes(selId)) ||
          (w.assignedUserName && normalizeName(w.assignedUserName).includes(normalizeName(selId)));
      });
      if (!hasAssigneeMatch) return false;
    }

    // Filtro por fecha
    if (activeOrderFilters.date && activeOrderFilters.date.size > 0) {
      const orderDate = new Date(w.createdAt || w.updatedAt || 0);
      const matchesDate = [...activeOrderFilters.date].some(dOpt => {
        const now = new Date();
        if (dOpt === 'today') {
          return orderDate.toDateString() === now.toDateString();
        }
        if (dOpt === 'yesterday') {
          const y = new Date();
          y.setDate(y.getDate() - 1);
          return orderDate.toDateString() === y.toDateString();
        }
        if (dOpt === 'last7') {
          return (now.getTime() - orderDate.getTime()) <= 7 * 86400000;
        }
        if (dOpt === 'last30') {
          return (now.getTime() - orderDate.getTime()) <= 30 * 86400000;
        }
        if (dOpt === 'this_month') {
          return orderDate.getFullYear() === now.getFullYear() && orderDate.getMonth() === now.getMonth();
        }
        if (dOpt.startsWith('range:') || dOpt.includes('_')) {
          const parts = dOpt.replace('range:', '').split('_');
          const dFrom = parts[0] ? new Date(parts[0] + 'T00:00:00') : null;
          const dTo = parts[1] ? new Date(parts[1] + 'T23:59:59.999') : null;
          const t = orderDate.getTime();
          if (dFrom && dTo) return t >= dFrom.getTime() && t <= dTo.getTime();
          if (dFrom) return t >= dFrom.getTime();
          if (dTo) return t <= dTo.getTime();
          return false;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(dOpt)) {
          const dt = new Date(dOpt + 'T00:00:00');
          return orderDate.toDateString() === dt.toDateString();
        }
        return false;
      });
      if (!matchesDate) return false;
    }

    return true;
  });

  const activeSort = document.getElementById('wo-sort')?.value || 'priority';

  return rawList.slice().sort((a, b) => {
    // 1° Orden lógico principal: Acción requerida al principio -> Activos -> En espera -> Concluidos hasta abajo
    const rankA = activeSort === 'status' ? getOrderStatusSortRank(a) : getOrderLifecycleRank(a);
    const rankB = activeSort === 'status' ? getOrderStatusSortRank(b) : getOrderLifecycleRank(b);
    if (rankA !== rankB) return rankA - rankB;

    // Si ambos están concluidos, ordenar por fecha de conclusión (más recientes primero, salvo orden explícito)
    const isDoneA = String(a?.status || '').toLowerCase() === 'completada';
    const isDoneB = String(b?.status || '').toLowerCase() === 'completada';
    if (isDoneA && isDoneB) {
      if (activeSort === 'oldest') {
        return getOrderConcludedTimestamp(a) - getOrderConcludedTimestamp(b);
      }
      if (activeSort === 'town') {
        return (getOrderTown(a) || '').localeCompare(getOrderTown(b) || '', 'es');
      }
      if (activeSort === 'client') {
        return (a.clientName || '').localeCompare(b.clientName || '', 'es');
      }
      return getOrderConcludedTimestamp(b) - getOrderConcludedTimestamp(a);
    }

    // Reenviados primero dentro de pendientes
    const resentA = (a.status === 'pendiente' && a.lastResentAt) ? 0 : 1;
    const resentB = (b.status === 'pendiente' && b.lastResentAt) ? 0 : 1;
    if (resentA !== resentB) return resentA - resentB;

    if (activeSort === 'status') {
      const statusCmp = getOrderStatusSortRank(a) - getOrderStatusSortRank(b);
      if (statusCmp !== 0) return statusCmp;
    }
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

function formatOrderTime(value) {
  const date = new Date(value || 0);
  return isNaN(date.getTime()) ? '--' : date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
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

  // Contadores personales para Soporte y Atención
  const currentActor = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
  const actorId = String(currentActor.id || '').toLowerCase();
  const actorName = normalizeName(currentActor.name || currentActor.username || '');

  const networkOrders = all.filter(w => w.detailKind === 'network');
  const myPending = all.filter(w => !w.deletedAt && (typeof isOrderPendingForUser === 'function' ? isOrderPendingForUser(w, currentActor) : false)).length;

  const myDone = networkOrders.filter(w => {
    if (w.status !== 'completada' && w.status !== 'resuelto_soporte') return false;
    const rep = w.technicianReport || {};
    const repId = String(rep.completedById || rep.completedBy || '').toLowerCase();
    const repName = normalizeName(rep.completedByName || w.completedByName || '');
    if (actorId && repId && repId === actorId) return true;
    if (actorName && repName && repName === actorName) return true;
    const followUps = Array.isArray(w.followUps) ? w.followUps : [];
    return followUps.some(f => (f.action === 'solved' || f.action === 'concluded') && ((f.byId && String(f.byId).toLowerCase() === actorId) || (normalizeName(f.byName || '') === actorName)));
  }).length;

  set('wo-my-pending', myPending);
  set('wo-my-done', myDone);
  const myPendingCard = document.getElementById('wo-stat-my-pending-card');
  const myDoneCard = document.getElementById('wo-stat-my-done-card');
  const isNetwork = activeOrderDetailKind === 'network';
  const isAdmin = typeof userHasRole === 'function' && userHasRole('administrador', 'admin');
  const isSupportOrAttention = typeof userHasRole === 'function' && (userHasRole('soporte') || userHasRole('atencion_clientes') || isAdmin);
  if (myPendingCard) myPendingCard.style.display = (isNetwork && isSupportOrAttention) ? '' : 'none';
  if (myDoneCard) myDoneCard.style.display = (isNetwork && isSupportOrAttention) ? '' : 'none';
  const myDetailsBadge = document.getElementById('wo-my-details-count');
  if (myDetailsBadge) {
    myDetailsBadge.textContent = String(myPending);
    myDetailsBadge.style.display = myPending > 0 ? 'inline-flex' : 'none';
  }
  const counterpartyPending = networkOrders.filter(w => !w.deletedAt && (typeof isOrderWaitingCounterparty === 'function' ? isOrderWaitingCounterparty(w, currentActor) : false)).length;
  const counterpartyBadge = document.getElementById('wo-pending-counterparty-count');
  if (counterpartyBadge) {
    counterpartyBadge.textContent = String(counterpartyPending);
    counterpartyBadge.style.display = counterpartyPending > 0 ? 'inline-flex' : 'none';
  }
  if (typeof updateOrderFiltersForDetailKind === 'function') {
    updateOrderFiltersForDetailKind();
  }
}

async function markWODone(id) {
  const w = (state.workOrders || []).find(x => x.id === id);
  if (!w) return;
  const auditStart = Array.isArray(state.auditLog) ? state.auditLog.length : 0;
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
      appendOrderFollowUp(w, 'solved', 'Solucionado', completion.note || '');
      setUpdatedAudit(w, completion.withInformation ? 'completó orden con información' : 'marcó lista orden');
      const saved = await saveRecordWithAudit('workOrders', w, auditStart);
      if (!saved) { notify('No se pudo guardar en la nube. Intenta de nuevo.', 'err'); return false; }
      try {
        if (typeof broadcastNetworkOrderChange === 'function') {
          broadcastNetworkOrderChange(w, 'confirmed');
        }
      } catch (e) { }
      await loadOrderPage();
      notify(completion.withInformation ? 'Información guardada y orden completada' : 'Orden completada');
      return true;
    }, w.detailKind === 'network' ? {
      forceInformation: true,
      freshEvidence: true,
      requireEvidence: true,
      hideSolution: true,
      subtitle: 'Adjunta una captura donde el cliente confirme que el servicio mejoró antes de solucionar.',
      evidenceTitle: 'Captura de confirmación del cliente <span>Obligatoria</span>',
      evidenceHelp: 'Sube o pega una captura del mensaje donde el cliente confirme que mejoró. Esta evidencia es obligatoria.',
      evidenceError: 'Adjunta la captura donde el cliente confirma que el servicio mejoró.'
    } : {});
    return;
  }
  w.status = 'completada';
  w.completedAt = new Date().toISOString();
  w.lastResentAt = '';
  appendOrderFollowUp(w, 'solved', 'Solucionado');
  setUpdatedAudit(w, 'marcó lista orden');
  await saveRecordWithAudit('workOrders', w, auditStart);
  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(w, 'confirmed');
    }
  } catch (e) { }
  await loadOrderPage();
}

async function reopenCompletedWO(id) {
  const w = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!w) return notify('No se encontró el detalle solicitado.', 'err');
  if (w.status !== 'completada' && w.status !== 'no_realizado') {
    return notify('El detalle no se encuentra en estado concluido.', 'warn');
  }

  const isSentToAttention = isNetworkSupportToAttention(w);
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
  const isCreator = typeof isOrderCreator === 'function' ? isOrderCreator(w, currentUser) : (
    Boolean(currentUser && (
      (w.createdById && String(w.createdById).trim() === String(currentUser.id).trim()) ||
      (w.createdByUsername && String(w.createdByUsername).toLowerCase().trim() === String(currentUser.username || '').toLowerCase().trim()) ||
      (w.createdByName && String(w.createdByName).toLowerCase().trim() === String(currentUser.name || '').toLowerCase().trim())
    ))
  );
  const isAdmin = userHasRole('administrador', 'admin');
  const isSoporte = userHasRole('administrador', 'admin', 'soporte');
  const isAtencion = userHasRole('atencion_clientes');

  // Regla institucional:
  // Quien creó el reporte SIEMPRE puede reabrirlo (al igual que el Administrador).
  // Si no es el creador ni administrador, solo el área solicitante puede reabrir lo que envió a la contraparte.
  if (!isAdmin && !isCreator) {
    if (w.detailKind === 'network') {
      if (isSentToAttention && !isSoporte) {
        return notify('Acción restringida: Únicamente el creador del reporte o personal autorizado de Soporte puede reabrirlo.', 'warn');
      }
      if (!isSentToAttention && !isAtencion) {
        return notify('Acción restringida: Únicamente el creador del reporte o personal autorizado de Atención a clientes puede reabrirlo.', 'warn');
      }
    } else {
      if (!isSoporte && !(isAtencion && isCreatedByAttention(w))) {
        return notify('Acción restringida: Únicamente el creador del reporte o personal autorizado puede reabrirlo.', 'warn');
      }
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

  const userName = currentUser.name || currentUser.username || (isSoporte ? 'Soporte técnico' : 'Atención a clientes');
  const now = new Date().toISOString();

  w.status = 'pendiente';
  w.completedAt = '';
  w.closedReason = '';
  if (w.technicianReport && w.technicianReport.result === 'completada') {
    w.technicianReport.result = 'pendiente';
  }
  w.updatedAt = now;
  w.updatedById = currentUser.id || '';
  w.isReopened = true;
  w.reopenedAt = now;
  const currentReopenCount = (typeof getOrderReopenCount === 'function' ? getOrderReopenCount(w) : (Number(w.reopenCount) || 0)) + 1;
  w.reopenCount = currentReopenCount;
  w.reviewOpenedById = '';
  w.reviewOpenedByName = '';
  w.reviewOpenedByUsername = '';
  w.reviewOpenedAt = '';

  const reOpenLabel = isCreator ? 'Detalle reabierto por el creador' : (isSentToAttention ? 'Requerimiento reabierto por Soporte técnico' : 'Reporte reabierto por Atención a clientes');
  appendSharedNetworkFollowUp(w, 'reabierto', reOpenLabel, `Reabierto formalmente por ${userName} para nueva revisión y atención (reapertura #${currentReopenCount}).`);
  setUpdatedAudit(w, 'reabrió detalle concluido');

  const auditStart = Array.isArray(state.auditLog) ? state.auditLog.length : 0;
  const saved = await saveRecordWithAudit('workOrders', w, auditStart);
  if (!saved) return notify('No se pudo reabrir el detalle. Por favor intente nuevamente.', 'err');

  if (typeof broadcastNetworkOrderChange === 'function') {
    broadcastNetworkOrderChange(w, 'reopened');
  }

  notify('Detalle reabierto.', 'ok');
  if (typeof updateOrderChatLive === 'function') {
    updateOrderChatLive(w);
  }
  await loadOrderPage();
}

function getOrderStatusMeta(order) {
  const isPhysical = (typeof getOrderDetailKind === 'function' ? getOrderDetailKind(order) : order?.detailKind) === 'physical';
  if (order?.status === 'completada') {
    return {
      label: isPhysical ? 'Completado' : (getOrderCategory(order) === 'instalacion' ? 'Completado' : 'Concluido'),
      className: 'is-done',
      title: isPhysical ? 'Detalle físico resuelto y concluido' : 'Detalle concluido satisfactoriamente'
    };
  }
  if (isPhysical) {
    return {
      label: 'Registro activo',
      className: 'is-pending',
      title: 'Registro de detalle físico pendiente de atención'
    };
  }
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
  if (order?.status === 'revisado') return { label: 'Revisado', className: 'is-reviewed', title: 'Revisado' };
  if (order?.status === 'en_revision') {
    return {
      label: 'En atención',
      title: 'En proceso de atención',
      className: 'is-reviewing'
    };
  }
  return { label: 'Pendiente', className: 'is-pending', title: 'Pendiente de atención' };
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
  // Desactivado: no se solicita confirmación de inicio de atención al abrir/cerrar detalles (userHasRole('administrador','admin'))
  return false;
}

function rememberPendingOrderReviewDecision(orderId) {
  pendingOrderReviewDecisionId = String(orderId || '');
  if (pendingOrderReviewDecisionId) sessionStorage.setItem(ORDER_REVIEW_DECISION_KEY, pendingOrderReviewDecisionId);
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
  pendingOrderReviewDestination = new URL(link.href, window.location.href).href;
  showOrderReviewDecision(pendingOrderReviewDecisionId);
}

function recordUnconfirmedOrderReviewExit() {
  if (!pendingOrderReviewDecisionId || !userHasRole('administrador', 'admin', 'soporte')) return;
  const endpoint = `${typeof API === 'string' ? API : ''}/api/work-orders/review-exit`;
  const payload = new Blob([JSON.stringify({ orderId: pendingOrderReviewDecisionId })], { type: 'application/json' });
  const sent = typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(endpoint, payload);
  if (!sent) {
    void fetch(endpoint, { method: 'POST', body: payload, credentials: 'include', keepalive: true }).catch(() => { });
  }
}

function hasUserViewedOrderInCurrentCycle(order, actor = getCurrentUser()) {
  const followUps = Array.isArray(order?.followUps) ? order.followUps : [];
  let start = 0;
  for (let i = followUps.length - 1; i >= 0; i--) {
    const act = String(followUps[i]?.action || '').trim().toLowerCase();
    if (act === 'reabierto' || act === 'reopened' || act === 'resent') { start = i + 1; break; }
  }
  const actorId = String(actor?.id || '').trim().toLowerCase();
  const actorNames = [actor?.name, actor?.username].map(v => normalizeName(v || '')).filter(Boolean);
  if (!actorId && !actorNames.length) return false;
  return followUps.slice(start).some(item => {
    if (String(item?.action || '').trim().toLowerCase() !== 'viewed') return false;
    const itemId = String(item?.byId || item?.byUserId || '').trim().toLowerCase();
    if (actorId && itemId) return actorId === itemId;
    const itemName = normalizeName(item?.byName || item?.byUsername || '');
    return !!itemName && actorNames.includes(itemName);
  });
}

async function markWOViewedOnOpen(order) {
  if (!order || order.deletedAt || !userHasRole('administrador', 'admin', 'soporte', 'atencion_clientes')) return false;
  if (order.detailKind !== 'network') return false;
  if (order.status === 'completada' || order.status === 'no_realizado') return false;
  const actor = getCurrentUser();
  // Solo se registra la primera vista de cada usuario por ciclo (se reinicia al reabrir/reenviar)
  if (hasUserViewedOrderInCurrentCycle(order, actor)) {
    if (orderNeedsReviewDecision(order)) rememberPendingOrderReviewDecision(order.id);
    return false;
  }
  const auditStart = Array.isArray(state.auditLog) ? state.auditLog.length : 0;
  appendOrderFollowUp(order, 'viewed', 'Visto');
  setUpdatedAudit(order, 'vio detalle de orden');
  const saved = await saveRecordWithAudit('workOrders', order, auditStart);
  if (saved && orderNeedsReviewDecision(order)) rememberPendingOrderReviewDecision(order.id);
  return saved;
}

function ensureOrderReviewDecisionModal() {
  return null;
}

function showOrderReviewDecisionChoice() { }

function showOrderReviewReason() { }

function showOrderReviewDecision(orderId) {
  clearPendingOrderReviewDecision();
  CM('order-tech-report-mo');
}

function closeOrderReportModalDirectly() {
  clearPendingOrderReviewDecision();
  currentOrderReportId = '';
  CM('order-tech-report-mo');
  CM('order-chat-close-decision-mo');
  try {
    const curUrl = new URL(window.location.href);
    if (curUrl.searchParams.has('orderId') || curUrl.searchParams.has('id')) {
      curUrl.searchParams.delete('orderId');
      curUrl.searchParams.delete('id');
      window.history.replaceState({}, '', curUrl);
    }
  } catch (e) { }
}

function getOrderCurrentUserClosureAction(order) {
  if (!order || order.detailKind !== 'network') return null;
  if (order.status === 'completada' || order.status === 'no_realizado') return null;
  const currentUser = getCurrentUser();
  const isSoporte = userHasRole('soporte');
  const isAtencion = userHasRole('atencion_clientes');
  const isAdmin = userHasRole('administrador', 'admin');
  const isSentToAttention = isNetworkSupportToAttention(order);
  const closureStatus = typeof getOrderClosureStatus === 'function' ? getOrderClosureStatus(order) : {};

  if (isSentToAttention) {
    if (closureStatus.attentionConfirmed || order.status === 'resuelto_soporte') {
      if (isSoporte || isAdmin) return 'confirm';
      return null;
    } else {
      if (isAtencion || isAdmin) return 'propose';
      return null;
    }
  } else {
    if (closureStatus.supportConfirmed || order.status === 'resuelto_soporte') {
      if (isAtencion || isAdmin) return 'confirm';
      return null;
    } else {
      if (isSoporte || isAdmin) return 'propose';
      return null;
    }
  }
}

let _closingChatAfterResolution = false;

function promptCloseOrderChatDecision(order, actionType) {
  let modal = document.getElementById('order-chat-close-decision-mo');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'order-chat-close-decision-mo';
    modal.className = 'mo';
    document.body.appendChild(modal);
  }
  if (!modal.dataset.backdropBound) {
    modal.dataset.backdropBound = '1';
    modal.addEventListener('click', event => {
      if (event.target === modal) dismissCloseOrderChatDecision();
    });
  }
  modal.style.setProperty('z-index', '16000', 'important');
  // Asegurar siempre que esté después de order-tech-report-mo en el DOM para nunca quedar detrás
  if (modal.parentElement === document.body) {
    document.body.appendChild(modal);
  }

  const isPropose = actionType === 'propose';
  const folio = getOrderFolio(order);
  const title = isPropose ? '¿Mandar a concluir este caso?' : '¿Confirmar conclusión del caso?';
  const message = isPropose
    ? 'Puedes mandar a concluir este caso para su validación, o simplemente cerrar la conversación.'
    : 'La contraparte ya envió a concluir este caso. Puedes confirmar la conformidad y cerrarlo definitivamente, devolverlo con observaciones, o simplemente cerrar la ventana.';
  const actionBtnText = isPropose ? 'Mandar a concluir' : 'Confirmar y cerrar';
  const actionBtnIcon = isPropose
    ? '<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2.2;margin-right:6px;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>'
    : '<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2.5;margin-right:6px;"><polyline points="20 6 9 17 4 12"/></svg>';

  modal.innerHTML = `
    <div class="md modal-modern" style="max-width:440px;padding:22px 24px;border-radius:18px;background:#ffffff;box-shadow:0 24px 50px rgba(15,23,42,0.24);text-align:left;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="width:38px;height:38px;border-radius:10px;background:#eff6ff;color:#0874e8;display:grid;place-items:center;flex-shrink:0;">
            <svg style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </span>
          <div>
            <h3 style="margin:0;font-size:15.5px;font-weight:800;color:#0f172a;">${orderEscape(title)}</h3>
            <p style="margin:2px 0 0;font-size:11.5px;color:#64748b;font-weight:700;">${orderEscape(folio)} · ${orderEscape(getOrderPlace(order))}</p>
          </div>
        </div>
        <button type="button" class="btn bgh" style="width:28px;height:28px;padding:0;display:grid;place-items:center;border-radius:8px;color:#64748b;" onclick="dismissCloseOrderChatDecision()" title="Volver al chat">
          <svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;stroke-width:2.2;fill:none;"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <p style="margin:0 0 18px;font-size:13px;line-height:1.5;color:#334155;">${orderEscape(message)}</p>

      <div style="display:flex;flex-direction:column;gap:8px;">
        <button type="button" class="btn ${isPropose ? 'bc' : 'btn-ok-success'}" style="width:100%;justify-content:center;min-height:38px;font-size:13px;font-weight:800;border-radius:10px;padding:8px 16px;" onclick="executeChatCloseAction('${order.id}', '${actionType}')">
          ${actionBtnIcon}${orderEscape(actionBtnText)}
        </button>
        ${!isPropose ? `
        <button type="button" class="btn net-btn-return" style="width:100%;justify-content:center;min-height:36px;font-size:12.5px;font-weight:700;border-radius:10px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;" onclick="executeChatCloseAction('${order.id}', 'return')">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.2;margin-right:6px;"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>Devolver con observaciones
        </button>
        ` : ''}
        <button type="button" class="btn bgh" style="width:100%;justify-content:center;min-height:36px;font-size:12.5px;font-weight:700;border-radius:10px;color:#475569;" onclick="confirmJustCloseOrderReport()">
          Simplemente cerrar chat
        </button>
      </div>
    </div>
  `;

  OM('order-chat-close-decision-mo');
}

function dismissCloseOrderChatDecision() {
  _closingChatAfterResolution = false;
  CM('order-chat-close-decision-mo');
}

function confirmJustCloseOrderReport() {
  _closingChatAfterResolution = false;
  CM('order-chat-close-decision-mo');
  closeOrderReportModalDirectly();
}

async function executeChatCloseAction(orderId, actionType) {
  CM('order-chat-close-decision-mo');
  _closingChatAfterResolution = true;
  if (actionType === 'propose') {
    await proposeTwoPartyClosure(orderId);
  } else if (actionType === 'confirm') {
    await confirmTwoPartyClosure(orderId);
  } else if (actionType === 'return') {
    openReturnNetworkModal(orderId);
  }
}

function requestCloseOrderReport(forceClose = false) {
  if (!forceClose && currentOrderReportId) {
    const order = (state.workOrders || []).find(x => x.id === currentOrderReportId && !x.deletedAt);
    if (order && order.detailKind === 'network' && order.status !== 'completada' && order.status !== 'no_realizado') {
      const actionType = getOrderCurrentUserClosureAction(order);
      if (actionType) {
        return promptCloseOrderChatDecision(order, actionType);
      }
    }
  }
  closeOrderReportModalDirectly();
}

async function saveOrderReviewDecision(attendNow) {
  const order = (state.workOrders || []).find(item => item.id === pendingOrderReviewDecisionId && !item.deletedAt);
  if (!order) {
    pendingOrderReviewDestination = '';
    clearPendingOrderReviewDecision();
    CM('order-review-decision-mo');
    return notify('No se encontró el detalle solicitado.', 'err');
  }
  const reason = document.getElementById('order-review-reason')?.value.trim() || '';
  if (!attendNow && !reason) {
    notify('Escribe el motivo por el que no se revisará en este momento.', 'err');
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
    appendOrderFollowUp(order, 'review_opened', 'En revisión');
    setUpdatedAudit(order, 'confirmó que atenderá el detalle');
  } else {
    setUpdatedAudit(order, 'pospuso la revisión del detalle');
  }
  const saved = await saveRecordWithAudit('workOrders', order, auditStart);
  buttons.forEach(button => { button.disabled = false; });
  if (!saved) return;
  if (!attendNow && typeof broadcastNetworkOrderChange === 'function') {
    try { broadcastNetworkOrderChange(order, 'review_deferred', { reason }); } catch (e) { }
  }
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

function appendOrderFollowUp(order, action, label, note = '') {
  const actor = getCurrentUser();
  const event = {
    id: gid('ofu'),
    action,
    label,
    note: String(note || '').trim(),
    at: new Date().toISOString(),
    byId: actor.id || '',
    byName: actor.name || actor.username || 'Usuario'
  };
  order.followUps = [...(Array.isArray(order.followUps) ? order.followUps : []), event].slice(-50);
  return event;
}

function resetOrderReportForResend(order) {
  const report = order.technicianReport;
  if (!report || typeof report !== 'object') return;
  const hadResult = report.result && report.result !== 'pendiente';
  if (hadResult || report.completedAt) {
    report.history = [...(Array.isArray(report.history) ? report.history : []), {
      result: report.result || '',
      solution: report.solution || '',
      reason: report.reason || '',
      observations: report.observations || '',
      completedAt: report.completedAt || '',
      completedByName: report.completedByName || ''
    }].slice(-20);
  }
  report.result = 'pendiente';
  report.completedAt = '';
  report.completedBy = '';
  report.completedByName = '';
  report.solution = '';
  report.reason = '';
}

async function saveOrderWorkflow(order, auditAction, message, { firstPage = false } = {}) {
  const auditStart = Array.isArray(state.auditLog) ? state.auditLog.length : 0;
  order.updatedAt = new Date().toISOString();
  setUpdatedAudit(order, auditAction);
  const saved = await saveRecordWithAudit('workOrders', order, auditStart);
  if (!saved) return false;
  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      const trans = order.detailKind === 'physical' ? 'sent_to_physical' : (order.status === 'pendiente' ? 'resent' : 'updated');
      broadcastNetworkOrderChange(order, trans);
    }
  } catch (e) { }
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
    notify('Describe qué se hizo para intentar solucionarlo.', 'err');
    document.getElementById('order-action-note')?.focus();
    return;
  }
  order.status = 'revisado';
  order.reviewedAt = new Date().toISOString();
  order.lastResentAt = '';
  appendOrderFollowUp(order, 'reviewed', 'Revisado', note);
  await saveOrderWorkflow(order, 'revisó detalle', 'Detalle marcado como revisado.');
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
    result: 'no_realizado',
    reason: note || 'El problema continúa sin solución.',
    completedAt: now
  };
  appendOrderFollowUp(order, 'same_issue', 'Sigue el mismo tema', note);
  await saveOrderWorkflow(order, 'marcó que sigue el mismo tema', 'Detalle marcado como no solucionado.');
}

async function resendWO(id) {
  const order = (state.workOrders || []).find(item => item.id === id && !item.deletedAt);
  if (!order) return;
  if (order.status === 'completada') return notify('Un detalle solucionado debe copiarse como uno nuevo.', 'warn');
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
  appendOrderFollowUp(order, 'resent', 'Volver a enviar', note);
  await saveOrderWorkflow(order, 'volvió a enviar detalle', note ? 'Detalle reenviado con información nueva.' : 'Detalle reenviado sin crear otro folio.', { firstPage: true });
}

function resolveOrderRegisteredNode(order) {
  if (typeof window !== 'undefined' && typeof window.resolveOrderRegisteredNode === 'function' && window.resolveOrderRegisteredNode !== resolveOrderRegisteredNode) {
    return window.resolveOrderRegisteredNode(order);
  }
  if (!order) return { nodeId: '', nodeName: 'Pueblo registrado' };
  let nodeId = order.nodeId ? String(order.nodeId) : '';
  let nodeName = order.nodeName ? String(order.nodeName).trim() : '';

  if (nodeId) {
    const nd = (state.nodes || []).find(n => !n.deletedAt && String(n.id) === nodeId)
      || (state.nodes || []).find(n => String(n.id) === nodeId);
    if (nd) {
      const label = typeof getNodeLabel === 'function' ? getNodeLabel(nd) : (nd.name || nd.id);
      return { nodeId: String(nd.id), nodeName: label };
    }
    if (nodeName) return { nodeId, nodeName };
  }

  const candidateName = (nodeName || order.town || order.detailLocation || '').trim().toLowerCase();
  if (candidateName) {
    const nd = (state.nodes || []).find(n => !n.deletedAt && (
      (n.name || '').trim().toLowerCase() === candidateName ||
      (n.town || '').trim().toLowerCase() === candidateName ||
      candidateName.includes((n.name || '').trim().toLowerCase())
    ));
    if (nd) {
      const label = typeof getNodeLabel === 'function' ? getNodeLabel(nd) : (nd.name || nd.id);
      return { nodeId: String(nd.id), nodeName: label };
    }
  }

  if (order.equipmentId && typeof getEquipmentLinkedNodeIds === 'function') {
    const linkedNodeIds = getEquipmentLinkedNodeIds(order.equipmentId);
    if (linkedNodeIds && linkedNodeIds.length > 0) {
      const nd = (state.nodes || []).find(n => !n.deletedAt && String(n.id) === String(linkedNodeIds[0]))
        || (state.nodes || []).find(n => String(n.id) === String(linkedNodeIds[0]));
      if (nd) {
        const label = typeof getNodeLabel === 'function' ? getNodeLabel(nd) : (nd.name || nd.id);
        return { nodeId: String(nd.id), nodeName: label };
      }
      return { nodeId: String(linkedNodeIds[0]), nodeName: nodeName || 'Pueblo vinculado' };
    }
  }

  return {
    nodeId: nodeId || '',
    nodeName: nodeName || order.detailLocation || order.town || 'Pueblo registrado'
  };
}
if (typeof window !== 'undefined') {
  window.resolveOrderRegisteredNode = resolveOrderRegisteredNode;
}

async function sendWOToPhysical(id) {
  const order = (state.workOrders || []).find(item => item.id === id && !item.deletedAt);
  if (!order || order.detailKind !== 'network') return;
  const note = getOrderActionNote();
  if (!note) {
    notify('Describe el detalle físico que se presentó.', 'err');
    document.getElementById('order-action-note')?.focus();
    return;
  }
  const now = new Date().toISOString();
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
  const orderFolio = typeof getWorkOrderFolio === 'function' ? getWorkOrderFolio(order) : (order.folio || order.id);
  const registeredNode = resolveOrderRegisteredNode(order);
  const nodeId = registeredNode.nodeId || order.nodeId || '';
  const nodeName = registeredNode.nodeName || order.nodeName || 'Pueblo registrado';
  const targetPlace = nodeName;

  const newPhysical = {
    id: typeof generateId === 'function' ? generateId() : ('ph_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    detailKind: 'physical',
    category: 'otro',
    title: note.length > 80 ? (note.slice(0, 77) + '...') : note,
    description: note,
    priority: order.priority || 'media',
    visitType: 'comunidad',
    equipmentId: '',
    equipmentName: '',
    nodeId: nodeId,
    nodeName: nodeName,
    region: order.region || '',
    detailLocation: order.detailLocation || nodeName,
    clientName: '',
    clientPhone: '',
    assignedUserId: '', // No se asigna a nadie para resolver
    assignedUserName: '',
    status: 'pendiente',
    createdById: currentUser.id || '',
    createdByName: currentUser.name || currentUser.username || 'Personal',
    createdAt: now,
    updatedAt: now,
    sourceOrderId: order.id,
    originNetworkOrderId: order.id,
    originNetworkFolio: orderFolio,
    followUps: [
      {
        action: 'physical_record_created',
        user: currentUser.name || currentUser.username || 'Sistema',
        at: now,
        note: `Registro físico creado en pueblo ${nodeName} desde el detalle de red ${orderFolio}`
      }
    ]
  };
  const physicalFolio = typeof getOrderFolio === 'function' ? getOrderFolio(newPhysical) : '';

  state.workOrders = state.workOrders || [];
  state.workOrders.push(newPhysical);
  await saveRecord('workOrders', newPhysical);

  hideOrderActionForm();
  const physEvent = appendOrderFollowUp(order, 'physical', 'Detalle físico registrado', `${note} · Vinculado a pueblo: ${targetPlace}`);
  if (physEvent) {
    physEvent.physicalOrderId = newPhysical.id;
    physEvent.physicalOrderFolio = physicalFolio;
    physEvent.physicalTargetType = 'pueblo';
    physEvent.physicalTargetName = targetPlace;
    physEvent.sentToPhysicalAt = now;
  }
  await saveOrderWorkflow(order, 'registró detalle físico en pueblo', `Se creó registro físico en ${targetPlace}.`);
  notify(`Detalle físico registrado exitosamente en ${targetPlace}. El caso de red permanece activo.`, 'ok');
}

function getPhysicalDerivationStatus(order) {
  const followUps = Array.isArray(order?.followUps) ? order.followUps : [];
  let resetIdx = -1;
  for (let i = followUps.length - 1; i >= 0; i--) {
    const act = String(followUps[i]?.action || '').toLowerCase();
    if (act === 'reopened' || act === 'reabierto' || act === 'physical_rejected' || act === 'physical') {
      resetIdx = i;
      break;
    }
  }
  const relevant = resetIdx >= 0 ? followUps.slice(resetIdx + 1) : followUps;
  let latestProp = null;
  for (let i = relevant.length - 1; i >= 0; i--) {
    const act = String(relevant[i]?.action || '').toLowerCase();
    if (act === 'physical_proposed_soporte' || act === 'physical_proposed_atencion') {
      latestProp = relevant[i];
      break;
    }
  }
  if (!latestProp || order?.detailKind === 'physical' || order?.status === 'completada') {
    return { pending: false, proposedBy: '', proposedByName: '', note: '', at: '', proposal: null, targetType: '', targetName: '' };
  }
  const savedProposal = (latestProp.proposal && typeof latestProp.proposal === 'object')
    ? latestProp.proposal
    : ((order?.physicalProposal && typeof order.physicalProposal === 'object') ? order.physicalProposal : null);
  const targetType = (savedProposal?.targetType === 'torre' || (!savedProposal?.targetType && savedProposal?.equipmentId) || /^Torre:/i.test(String(latestProp.note || '').trim()))
    ? 'torre'
    : 'pueblo';
  const targetName = targetType === 'torre'
    ? (savedProposal?.equipmentName || '')
    : (savedProposal?.nodeName || '');
  return {
    pending: true,
    proposedBy: latestProp.action === 'physical_proposed_soporte' ? 'soporte' : 'atencion',
    proposedByName: latestProp.byName || latestProp.user || '',
    note: latestProp.note || 'Requiere visita presencial para revisión física en sitio.',
    at: latestProp.at || '',
    proposal: savedProposal,
    targetType,
    targetName
  };
}
if (typeof window !== 'undefined') {
  window.getPhysicalDerivationStatus = getPhysicalDerivationStatus;
}

function getOrderSentToPhysicalInfo(order) {
  const empty = {
    sent: false,
    at: '',
    formattedDate: '',
    targetType: '',
    targetName: '',
    physicalOrderId: '',
    physicalOrderFolio: ''
  };
  if (!order) return empty;
  const kind = typeof getOrderDetailKind === 'function' ? getOrderDetailKind(order) : (order.detailKind || 'physical');
  if (kind !== 'network') return empty;

  const followUps = Array.isArray(order.followUps) ? order.followUps : [];
  let physFu = null;
  for (let i = followUps.length - 1; i >= 0; i--) {
    const act = String(followUps[i]?.action || '').toLowerCase();
    if (act === 'physical') {
      physFu = followUps[i];
      break;
    }
  }

  const linkedPhys = (typeof state !== 'undefined' && Array.isArray(state.workOrders))
    ? state.workOrders.find(item => (
      item && !item.deletedAt && item.detailKind === 'physical' && (
        (item.sourceOrderId && String(item.sourceOrderId) === String(order.id)) ||
        (item.originNetworkOrderId && String(item.originNetworkOrderId) === String(order.id))
      )
    ))
    : null;

  const reportSolution = String(order.technicianReport?.solution || '');
  const hasReportPhysicalMark = /pase a detalle f[ií]sico|derivado a detalle f[ií]sico/i.test(reportSolution);
  const hasClosedReasonMark = order.closedReason === 'physical_registered';

  if (!physFu && !linkedPhys && !hasClosedReasonMark && !hasReportPhysicalMark) {
    return empty;
  }

  const at = physFu?.sentToPhysicalAt || physFu?.at || linkedPhys?.createdAt || order.technicianReport?.completedAt || order.completedAt || '';
  let formattedDate = '';
  if (at) {
    const d = new Date(at);
    if (!Number.isNaN(d.getTime())) {
      formattedDate = d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
  }

  const combinedText = `${physFu?.note || ''} ${reportSolution}`;
  const targetType = physFu?.physicalTargetType
    || (linkedPhys ? (linkedPhys.equipmentId ? 'torre' : 'pueblo') : '')
    || (/(?:en\s+torre|vinculado\s+a\s+torre|torre:)/i.test(combinedText) ? 'torre' : (/(?:en\s+pueblo|vinculado\s+a\s+pueblo|pueblo:)/i.test(combinedText) ? 'pueblo' : ''));

  let targetName = physFu?.physicalTargetName
    || (linkedPhys ? (linkedPhys.equipmentName || linkedPhys.nodeName || '') : '');
  if (!targetName && combinedText) {
    const matchTarget = combinedText.match(/(?:en\s+(?:torre|pueblo)|vinculado\s+a\s+(?:torre|pueblo))\s+([^:"·\n.]+)/i);
    if (matchTarget && matchTarget[1]) targetName = matchTarget[1].trim();
  }

  const physicalOrderId = physFu?.physicalOrderId || linkedPhys?.id || '';
  const physicalOrderFolio = physFu?.physicalOrderFolio
    || (linkedPhys ? (typeof getOrderFolio === 'function' ? getOrderFolio(linkedPhys) : (linkedPhys.folio || '')) : '');

  return {
    sent: true,
    at,
    formattedDate,
    targetType,
    targetName,
    physicalOrderId,
    physicalOrderFolio
  };
}

function renderSentToPhysicalBadge(order, options = {}) {
  const info = getOrderSentToPhysicalInfo(order);
  if (!info.sent) return '';
  const targetKindLabel = info.targetType === 'torre' ? 'Torre' : (info.targetType === 'pueblo' ? 'Pueblo' : '');
  const targetSummary = [targetKindLabel, info.targetName].filter(Boolean).join(': ');
  const tooltipParts = ['Enviado a detalles físicos'];
  if (targetSummary) tooltipParts.push(targetSummary);
  if (info.physicalOrderFolio) tooltipParts.push(`Folio ${info.physicalOrderFolio}`);
  if (info.formattedDate) tooltipParts.push(info.formattedDate);
  const titleAttr = orderEscape(tooltipParts.join(' · '));

  const showTarget = Boolean(options.showTarget && targetSummary);
  const showDate = options.showDate !== false && Boolean(info.formattedDate);

  return `<span class="order-sent-physical-badge${showDate ? ' has-date' : ''}" title="${titleAttr}" data-sent-physical="1">`
    + `<span class="order-sent-physical-main">`
    + `<svg class="order-sent-physical-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`
    + `<span>Enviado a físicos</span>`
    + (showTarget ? `<span class="order-sent-physical-target">· ${orderEscape(targetSummary)}</span>` : '')
    + `</span>`
    + (showDate ? `<span class="order-sent-physical-date">${orderEscape(info.formattedDate)}</span>` : '')
    + `</span>`;
}

if (typeof window !== 'undefined') {
  window.getOrderSentToPhysicalInfo = getOrderSentToPhysicalInfo;
  window.renderSentToPhysicalBadge = renderSentToPhysicalBadge;
}

let ordenesPhysModalOrderId = '';
let ordenesPhysModalRefreshCb = null;
let ordenesPhysModalTargetType = 'pueblo';
let ordenesPhysModalLookupSeq = 0;

function resolveOrderAssociatedEquipment(order) {
  if (!order) return { equipmentId: '', equipmentName: '', eq: null, linkedList: [] };
  const activeEq = (state.equipment || []).filter(e => e && !e.deletedAt);
  const allEq = (state.equipment || []).filter(Boolean);
  const findEqById = id => activeEq.find(e => String(e.id) === String(id)) || allEq.find(e => String(e.id) === String(id)) || null;

  const explicitId = String(order.equipmentId || '').trim();
  if (explicitId) {
    const eq = findEqById(explicitId);
    const name = (eq?.name || order.equipmentName || '').trim();
    const entry = eq || { id: explicitId, name: name || 'Torre del reporte' };
    return {
      equipmentId: explicitId,
      equipmentName: name || entry.name,
      eq: eq || null,
      linkedList: [entry]
    };
  }

  const registeredNode = resolveOrderRegisteredNode(order);
  const linkedMap = new Map();
  if (registeredNode.nodeId) {
    if (typeof getNodeLinkedEquipment === 'function') {
      (getNodeLinkedEquipment(registeredNode.nodeId) || []).forEach(eq => {
        if (eq && !eq.deletedAt && eq.id) linkedMap.set(String(eq.id), eq);
      });
    }
    const nd = (state.nodes || []).find(n => n && !n.deletedAt && String(n.id) === String(registeredNode.nodeId))
      || (state.nodes || []).find(n => n && String(n.id) === String(registeredNode.nodeId));
    if (nd?.equipmentId) {
      const directEq = findEqById(nd.equipmentId);
      if (directEq) linkedMap.set(String(directEq.id), directEq);
    }
    activeEq.forEach(eq => {
      if (Array.isArray(eq.linkedNodeIds) && eq.linkedNodeIds.map(String).includes(String(registeredNode.nodeId))) {
        linkedMap.set(String(eq.id), eq);
      }
    });
  }

  const linkedList = Array.from(linkedMap.values())
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'));
  if (linkedList.length) {
    const primary = linkedList[0];
    return {
      equipmentId: String(primary.id),
      equipmentName: String(primary.name || primary.ip || 'Torre asociada').trim(),
      eq: primary,
      linkedList
    };
  }

  return { equipmentId: '', equipmentName: '', eq: null, linkedList: [] };
}

function ensureInsertPhysicalRecordModal() {
  let modal = document.getElementById('insert-physical-record-mo');
  if (modal && modal.dataset.enhancedTargetSelector !== '2') {
    modal.remove();
    modal = null;
  }
  if (!modal) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="mo insert-physical-record-mo" id="insert-physical-record-mo" data-enhanced-target-selector="2" style="z-index:15000 !important;">
        <div class="md insert-physical-record-card" style="max-width:560px;width:95%;">
          <div class="modal-head" style="padding:12px 18px 10px;">
            <div>
              <h2 id="insert-phys-title" style="font-size:16px;margin:0 0 2px;">Proponer detalle físico</h2>
              <p id="insert-phys-subtitle" style="font-size:12px;color:#64748b;margin:0;">Elige si se registrará en el pueblo o en la torre asociada del reporte</p>
            </div>
            <button type="button" class="wo-modal-close" aria-label="Cerrar" onclick="CM('insert-physical-record-mo')">
              <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>
            </button>
          </div>

          <div class="insert-phys-body" style="padding:12px 18px;display:flex;flex-direction:column;gap:10px;">
            <div id="insert-phys-origin-info" style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;font-size:11.5px;color:#1e40af;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span>Detalle de red: <strong id="insert-phys-origin-folio"></strong> · <span id="insert-phys-origin-client"></span></span>
            </div>

            <div id="insert-phys-agreement-notice" style="padding:8px 12px;background:#f5f3ff;border:1px solid #ddd6fe;border-left:3px solid #7c3aed;border-radius:6px;font-size:11.5px;color:#5b21b6;line-height:1.4;">
              <strong>ℹ️ Acuerdo mutuo:</strong> Ambas partes deben estar de acuerdo. Elige si el detalle físico se registrará en el <strong>pueblo</strong> o en la <strong>torre asociada</strong> de este reporte.
            </div>

            <div class="fi" style="margin-bottom:0;">
              <label style="font-weight:700;font-size:11.5px;color:#334155;margin-bottom:5px;display:block;">
                ¿Dónde se registrará el detalle físico? <span style="color:#ef4444;">*</span>
              </label>
              <div class="insert-phys-target-toggle" role="group" aria-label="Destino del detalle físico">
                <button type="button" id="insert-phys-target-btn-pueblo" class="insert-phys-target-btn is-active" data-target-type="pueblo" aria-pressed="true" onclick="setInsertPhysTargetType('pueblo')">
                  <span class="insert-phys-target-btn-icon" aria-hidden="true">🏘️</span>
                  <span class="insert-phys-target-btn-copy">
                    <strong>Pueblo</strong>
                    <small>Pueblo del reporte</small>
                  </span>
                </button>
                <button type="button" id="insert-phys-target-btn-torre" class="insert-phys-target-btn" data-target-type="torre" aria-pressed="false" onclick="setInsertPhysTargetType('torre')">
                  <span class="insert-phys-target-btn-icon" aria-hidden="true">🗼</span>
                  <span class="insert-phys-target-btn-copy">
                    <strong>Torre</strong>
                    <small>Torre asociada al reporte</small>
                  </span>
                </button>
              </div>
              <input type="hidden" id="insert-phys-target-type" value="pueblo">
              <input type="hidden" id="insert-phys-node" value="">
              <input type="hidden" id="insert-phys-equipment" value="">
            </div>

            <div id="insert-phys-pueblo-group" class="insert-phys-selector-box">
              <div class="insert-phys-selector-head">
                <label>Pueblo de destino</label>
                <span class="insert-phys-target-pill">Asociado al reporte</span>
              </div>
              <div id="insert-phys-pueblo-locked" class="insert-phys-locked-value">
                <span aria-hidden="true">🏘️</span>
                <strong id="insert-phys-pueblo-locked-name">Pueblo del reporte</strong>
              </div>
              <select id="insert-phys-node-select" class="fi-select" style="display:none;" disabled aria-hidden="true" tabindex="-1"></select>
              <div id="insert-phys-pueblo-hint" class="insert-phys-target-hint">Pueblo asignado al reporte de origen.</div>
            </div>

            <div id="insert-phys-torre-group" class="insert-phys-selector-box" style="display:none;">
              <div class="insert-phys-selector-head">
                <label>Torre / Antena asociada</label>
                <span class="insert-phys-target-pill is-tower">Asociada al reporte</span>
              </div>
              <div id="insert-phys-torre-locked" class="insert-phys-locked-value">
                <span aria-hidden="true">🗼</span>
                <strong id="insert-phys-torre-locked-name">Torre asociada al reporte</strong>
              </div>
              <select id="insert-phys-equipment-select" class="fi-select" style="display:none;width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;" onchange="onInsertPhysEquipmentChange()" disabled></select>
              <div id="insert-phys-torre-hint" class="insert-phys-target-hint">Torre vinculada al reporte de origen.</div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;" class="insert-phys-grid">
              <div class="fi">
                <label style="font-weight:700;font-size:11.5px;color:#334155;margin-bottom:4px;display:block;">Categoría física</label>
                <select id="insert-phys-category" class="fi-select" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;">
                </select>
              </div>

              <div class="fi">
                <label style="font-weight:700;font-size:11.5px;color:#334155;margin-bottom:4px;display:block;">Prioridad</label>
                <select id="insert-phys-priority" class="fi-select" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;">
                  <option value="baja">Baja</option>
                  <option value="media" selected>Media</option>
                  <option value="alta">Alta</option>
                  <option value="muy_alta">Muy alta</option>
                </select>
              </div>
            </div>

            <div class="fi" style="margin-bottom:0;">
              <label style="font-weight:700;font-size:11.5px;color:#334155;margin-bottom:4px;display:block;">
                Falla física en sitio <span style="color:#ef4444;">*</span>
              </label>
              <textarea id="insert-phys-description" rows="2" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;resize:vertical;font-family:inherit;box-sizing:border-box;" placeholder="Describe la falla física..."></textarea>
            </div>
          </div>

          <div class="card-actions" style="display:flex;justify-content:flex-end;gap:8px;padding:10px 18px;border-top:1px solid #e2e8f0;background:#f8fafc;">
            <button type="button" class="btn bgh bsm" onclick="CM('insert-physical-record-mo')">Cancelar</button>
            <button type="button" class="btn net-btn-unresolvable bsm" id="insert-phys-reject-btn" style="display:none;" onclick="rejectPhysicalRecordProposalFromModal()">Rechazar</button>
            <button type="button" class="btn bc bsm" id="insert-phys-save-btn" style="background:#7c3aed;border-color:#6d28d9;color:#fff;" onclick="saveInsertedPhysicalRecord()">
              <span id="insert-phys-save-label">📨 Proponer detalle físico</span>
            </button>
          </div>
        </div>
      </div>
    `);
    modal = document.getElementById('insert-physical-record-mo');
    if (modal && typeof modal.addEventListener === 'function') {
      modal.addEventListener('click', event => {
        if (event.target === modal) CM('insert-physical-record-mo');
      });
    }
  }
  if (modal) {
    if (modal.style && typeof modal.style.setProperty === 'function') {
      modal.style.setProperty('z-index', '18000', 'important');
    }
    if (modal.parentElement && typeof document !== 'undefined' && modal.parentElement === document.body && typeof document.body.appendChild === 'function') {
      document.body.appendChild(modal);
    }
  }
}

function getInsertPhysSelectedTargetInfo(order) {
  const targetType = (document.getElementById('insert-phys-target-type')?.value || ordenesPhysModalTargetType) === 'torre' ? 'torre' : 'pueblo';
  if (targetType === 'torre') {
    const associated = resolveOrderAssociatedEquipment(order);
    return {
      targetType: 'torre',
      targetLabel: 'Torre',
      equipmentId: associated.equipmentId,
      equipmentName: associated.equipmentName,
      eq: associated.eq,
      nodeId: '',
      nodeName: '',
      nd: null,
      targetPlace: associated.equipmentName || 'Sin torre asociada'
    };
  }

  // El pueblo siempre es estrictamente el mismo del reporte (no modificable).
  const registeredNode = resolveOrderRegisteredNode(order);
  const nodeId = String(registeredNode.nodeId || '').trim();
  const nd = nodeId
    ? ((state.nodes || []).find(n => !n.deletedAt && String(n.id) === nodeId)
      || (state.nodes || []).find(n => String(n.id) === nodeId)
      || null)
    : null;
  const nodeName = (nd
    ? (typeof getNodeLabel === 'function' ? getNodeLabel(nd) : (nd.name || nd.town || nd.nodeCode || ''))
    : (registeredNode.nodeName || order?.nodeName || 'Pueblo registrado')).trim();
  return {
    targetType: 'pueblo',
    targetLabel: 'Pueblo',
    equipmentId: '',
    equipmentName: '',
    eq: null,
    nodeId,
    nodeName,
    nd,
    targetPlace: nodeName || 'Pueblo registrado'
  };
}

function updateInsertPhysDynamicNotice() {
  const order = (state.workOrders || []).find(item => item.id === ordenesPhysModalOrderId && !item.deletedAt);
  const physStatus = order ? getPhysicalDerivationStatus(order) : { pending: false };
  const target = getInsertPhysSelectedTargetInfo(order);
  const noticeEl = document.getElementById('insert-phys-agreement-notice');
  const subtitleEl = document.getElementById('insert-phys-subtitle');
  const isSoporte = userHasRole('soporte');
  const isAtencion = userHasRole('atencion_clientes');
  const isAdmin = userHasRole('administrador', 'admin');
  const placeLabel = target.targetType === 'torre'
    ? (target.equipmentName ? `la torre ${target.equipmentName}` : 'la torre seleccionada')
    : `el pueblo ${target.nodeName || 'seleccionado'}`;

  if (physStatus.pending) {
    const canConfirm = physStatus.proposedBy === 'soporte' ? (isAtencion || isAdmin) : (isSoporte || isAdmin);
    if (noticeEl) {
      if (canConfirm) {
        noticeEl.innerHTML = `<strong>🤝 Acuerdo mutuo:</strong> ${orderEscape(physStatus.proposedByName || 'La contraparte')} propuso registrar este detalle físico en <strong>${orderEscape(placeLabel)}</strong> y cerrar este reporte de red.`;
      } else {
        noticeEl.innerHTML = `<strong>⏳ Esperando acuerdo:</strong> Propuesta enviada a la contraparte para registrar en <strong>${orderEscape(placeLabel)}</strong>.`;
      }
    }
    return;
  }

  if (subtitleEl) {
    subtitleEl.textContent = target.targetType === 'torre'
      ? (isAdmin ? 'Registro directo en torre / antena' : 'Registro en torre · Requiere acuerdo mutuo')
      : (isAdmin ? 'Registro directo en pueblo / comunidad' : 'Registro en pueblo · Requiere acuerdo mutuo');
  }
  if (noticeEl) {
    noticeEl.innerHTML = isAdmin
      ? `<strong>🔧 Registro directo:</strong> Se registrará el detalle físico en <strong>${orderEscape(placeLabel)}</strong> y se cerrará este reporte de red.`
      : `<strong>ℹ️ Acuerdo mutuo:</strong> Ambas partes deben estar de acuerdo. Al confirmarse, se guardará en <strong>${orderEscape(placeLabel)}</strong> y se cerrará el reporte de red.`;
  }
}

function setInsertPhysTargetType(targetType, options = {}) {
  const normalized = targetType === 'torre' ? 'torre' : 'pueblo';
  ordenesPhysModalTargetType = normalized;

  const hiddenType = document.getElementById('insert-phys-target-type');
  if (hiddenType) hiddenType.value = normalized;

  const btnPueblo = document.getElementById('insert-phys-target-btn-pueblo');
  const btnTorre = document.getElementById('insert-phys-target-btn-torre');
  if (btnPueblo) {
    btnPueblo.classList.toggle('is-active', normalized === 'pueblo');
    btnPueblo.setAttribute('aria-pressed', normalized === 'pueblo' ? 'true' : 'false');
  }
  if (btnTorre) {
    btnTorre.classList.toggle('is-active', normalized === 'torre');
    btnTorre.setAttribute('aria-pressed', normalized === 'torre' ? 'true' : 'false');
  }

  const puebloGroup = document.getElementById('insert-phys-pueblo-group');
  const torreGroup = document.getElementById('insert-phys-torre-group');
  if (puebloGroup) puebloGroup.style.display = normalized === 'pueblo' ? 'flex' : 'none';
  if (torreGroup) torreGroup.style.display = normalized === 'torre' ? 'flex' : 'none';

  const nodeHidden = document.getElementById('insert-phys-node');
  const eqHidden = document.getElementById('insert-phys-equipment');
  const nodeSelect = document.getElementById('insert-phys-node-select');
  const eqSelect = document.getElementById('insert-phys-equipment-select');
  if (normalized === 'torre') {
    if (eqHidden) eqHidden.value = eqSelect?.value || '';
    if (nodeHidden) nodeHidden.value = '';
  } else {
    if (nodeHidden) nodeHidden.value = nodeSelect?.value || '';
    if (eqHidden) eqHidden.value = '';
  }

  if (!options.silent) {
    updateInsertPhysDynamicNotice();
  }
}

function populateInsertPhysNodeSelect(order) {
  const select = document.getElementById('insert-phys-node-select');
  const lockedBox = document.getElementById('insert-phys-pueblo-locked');
  const lockedName = document.getElementById('insert-phys-pueblo-locked-name');
  const registeredNode = resolveOrderRegisteredNode(order);
  const regId = String(registeredNode.nodeId || '').trim();
  const regNodeObj = regId
    ? ((state.nodes || []).find(n => !n.deletedAt && String(n.id) === regId)
      || (state.nodes || []).find(n => String(n.id) === regId)
      || null)
    : null;
  const label = regNodeObj
    ? (typeof getNodeLabel === 'function' ? getNodeLabel(regNodeObj) : (regNodeObj.name || regNodeObj.town || regNodeObj.id))
    : (registeredNode.nodeName || order?.nodeName || 'Sin pueblo registrado');
  const zoneTxt = regNodeObj?.zone ? ` (${getZoneLabel(regNodeObj.zone)})` : '';
  const hasNode = Boolean(regId || (registeredNode.nodeName && registeredNode.nodeName !== 'Pueblo registrado'));

  if (select) {
    select.innerHTML = `<option value="${orderEscape(regId)}" data-label="${orderEscape(label)}">${orderEscape(label)}${orderEscape(zoneTxt)}</option>`;
    select.value = regId;
    select.disabled = true;
    if (select.style) select.style.display = 'none';
  }
  if (lockedName) {
    lockedName.textContent = `${label}${zoneTxt}`;
  }
  if (lockedBox && lockedBox.classList) {
    lockedBox.classList.toggle('is-missing', !hasNode);
  }

  const nodeHidden = document.getElementById('insert-phys-node');
  if (nodeHidden && ordenesPhysModalTargetType === 'pueblo') {
    nodeHidden.value = regId;
  }

  const hintEl = document.getElementById('insert-phys-pueblo-hint');
  if (hintEl) {
    hintEl.textContent = hasNode
      ? 'Pueblo asignado al reporte de origen.'
      : 'Este reporte no cuenta con un pueblo registrado.';
  }
}

function populateInsertPhysEquipmentSelect(order, _preferredEquipmentId = '', _filterText = '', options = {}) {
  const select = document.getElementById('insert-phys-equipment-select');
  const lockedBox = document.getElementById('insert-phys-torre-locked');
  const lockedName = document.getElementById('insert-phys-torre-locked-name');
  const associated = resolveOrderAssociatedEquipment(order);
  const isLoading = Boolean(options.loading);

  const selectedEq = associated.eq || (associated.linkedList || [])[0] || null;
  const selectedId = selectedEq ? String(selectedEq.id) : associated.equipmentId;
  const selectedLabel = selectedEq
    ? String(selectedEq.name || selectedEq.ip || 'Torre asociada').trim()
    : (associated.equipmentName || '');
  const selectedMeta = selectedEq
    ? [selectedEq.ip, getZoneLabel(selectedEq.region)].filter(Boolean).join(' · ')
    : '';

  if (select) {
    if (selectedId) {
      select.innerHTML = `<option value="${orderEscape(selectedId)}" data-label="${orderEscape(selectedLabel)}">${orderEscape(selectedLabel)}${selectedMeta ? ' — ' + orderEscape(selectedMeta) : ''}</option>`;
      select.value = selectedId;
    } else {
      select.innerHTML = '<option value="">Sin torre asociada</option>';
      select.value = '';
    }
    select.disabled = true;
    if (select.style) select.style.display = 'none';
  }

  if (lockedBox) {
    if (lockedBox.style) lockedBox.style.display = 'flex';
    if (lockedBox.classList) lockedBox.classList.toggle('is-missing', !selectedId && !isLoading);
  }
  if (lockedName) {
    if (selectedId) {
      lockedName.textContent = selectedMeta ? `${selectedLabel} (${selectedMeta})` : selectedLabel;
    } else {
      lockedName.textContent = isLoading ? 'Buscando torre asociada al reporte...' : 'Sin torre asociada a este reporte';
    }
  }

  const eqHidden = document.getElementById('insert-phys-equipment');
  if (eqHidden && ordenesPhysModalTargetType === 'torre') {
    eqHidden.value = selectedId || '';
  }

  const hintEl = document.getElementById('insert-phys-torre-hint');
  if (hintEl) {
    if (selectedId) {
      hintEl.textContent = 'Torre vinculada al reporte de origen.';
    } else if (isLoading) {
      hintEl.textContent = 'Consultando torre vinculada al reporte...';
    } else {
      hintEl.textContent = 'Este reporte no tiene una torre vinculada; regístrelo en el pueblo del reporte.';
    }
  }
}

async function loadInsertPhysRemoteTargets(order, _preferredNodeId = '', preferredEquipmentId = '') {
  if (typeof fetchDataPage !== 'function') return;
  const seq = ++ordenesPhysModalLookupSeq;
  const registeredNode = resolveOrderRegisteredNode(order);
  const tasks = [];

  if (registeredNode.nodeId) {
    tasks.push(
      fetchDataPage('equipment', { nodeIds: registeredNode.nodeId, paged: '1', windowed: '1', limit: 30, offset: 0 })
        .then(data => mergeOrderLookupRecords('equipment', data?.equipment))
        .catch(() => { })
    );
    if (!(state.nodes || []).some(n => String(n.id) === String(registeredNode.nodeId))) {
      tasks.push(
        fetchDataPage('nodes', { id: registeredNode.nodeId, limit: 1 })
          .then(data => mergeOrderLookupRecords('nodes', data?.nodes))
          .catch(() => { })
      );
    }
  }
  const explicitEqId = String(order?.equipmentId || preferredEquipmentId || '').trim();
  if (explicitEqId && !(state.equipment || []).some(e => String(e.id) === explicitEqId)) {
    tasks.push(
      fetchDataPage('equipment', { id: explicitEqId, limit: 1 })
        .then(data => mergeOrderLookupRecords('equipment', data?.equipment))
        .catch(() => { })
    );
  }

  if (!tasks.length) return;
  const initialAssociated = resolveOrderAssociatedEquipment(order);
  if (!initialAssociated.equipmentId) {
    populateInsertPhysEquipmentSelect(order, preferredEquipmentId, '', { loading: true });
  }
  await Promise.all(tasks);
  if (seq !== ordenesPhysModalLookupSeq || ordenesPhysModalOrderId !== order?.id) return;

  populateInsertPhysNodeSelect(order);
  populateInsertPhysEquipmentSelect(order, preferredEquipmentId, '', { loading: false });
  setInsertPhysTargetType(ordenesPhysModalTargetType, { silent: true });
  updateInsertPhysDynamicNotice();
}

async function filterInsertPhysTargetOptions() {
  // Pueblo y torre están fijos al reporte de origen; no se permite filtrar otros destinos.
}

function onInsertPhysEquipmentChange() {
  const select = document.getElementById('insert-phys-equipment-select');
  const eqHidden = document.getElementById('insert-phys-equipment');
  if (eqHidden && select) eqHidden.value = select.value || '';
  updateInsertPhysDynamicNotice();
}

function onInsertPhysNodeChange() {
  const select = document.getElementById('insert-phys-node-select');
  const nodeHidden = document.getElementById('insert-phys-node');
  if (nodeHidden && select) nodeHidden.value = select.value || '';
  updateInsertPhysDynamicNotice();
}

async function rejectPhysicalRecordProposalFromModal() {
  const orderId = ordenesPhysModalOrderId;
  CM('insert-physical-record-mo');
  if (typeof rejectSendNetworkToPhysical === 'function') {
    return rejectSendNetworkToPhysical(orderId);
  }
}

function openInsertPhysicalRecordModal(orderId, refreshCallback) {
  const order = (state.workOrders || []).find(item => item.id === orderId && !item.deletedAt);
  if (!order) return notify('No se encontró el detalle de red.', 'err');

  ordenesPhysModalOrderId = orderId;
  ordenesPhysModalRefreshCb = typeof refreshCallback === 'function' ? refreshCallback : null;

  ensureInsertPhysicalRecordModal();

  const folio = typeof getOrderFolio === 'function' ? getOrderFolio(order) : (order.folio || order.id);
  const folioEl = document.getElementById('insert-phys-origin-folio');
  if (folioEl) folioEl.textContent = folio;

  const clientEl = document.getElementById('insert-phys-origin-client');
  if (clientEl) clientEl.textContent = order.clientName || order.title || 'Reporte de red';

  const catSelect = document.getElementById('insert-phys-category');
  const categories = (typeof orderCategoriesForKind === 'function' ? orderCategoriesForKind('physical') : null)
    || (typeof detailCategoriesForKind === 'function' ? detailCategoriesForKind('physical') : null)
    || [
      ['alineacion_antena', 'Alineación de antena'],
      ['antena_desconectada', 'Antena desconectada'],
      ['antena_quemada', 'Equipo quemado'],
      ['antena_inalambrica', 'Antena inalámbrica'],
      ['reubicacion_antena', 'Reubicación de antena'],
      ['resurtir_antena', 'Resurtir antena'],
      ['solicitud_respaldo', 'Solicitud de respaldo'],
      ['instalacion', 'Nueva instalación'],
      ['otro', 'Otro']
    ];
  if (catSelect) {
    catSelect.innerHTML = categories.map(([catId, catLabel]) => `<option value="${orderEscape(catId)}">${orderEscape(catLabel)}</option>`).join('');
  }

  const physStatus = getPhysicalDerivationStatus(order);
  const isSoporte = userHasRole('soporte');
  const isAtencion = userHasRole('atencion_clientes');
  const isAdmin = userHasRole('administrador', 'admin');

  const titleEl = document.getElementById('insert-phys-title');
  const subtitleEl = document.getElementById('insert-phys-subtitle');
  const noticeEl = document.getElementById('insert-phys-agreement-notice');
  const saveBtn = document.getElementById('insert-phys-save-btn');
  const saveLabel = document.getElementById('insert-phys-save-label');
  const rejectBtn = document.getElementById('insert-phys-reject-btn');
  const prioritySelect = document.getElementById('insert-phys-priority');
  const descText = document.getElementById('insert-phys-description');
  const registeredNode = resolveOrderRegisteredNode(order);

  const prop = physStatus.proposal || order.physicalProposal || {};
  const initialTargetType = physStatus.pending
    ? ((prop.targetType === 'torre' || (!prop.targetType && prop.equipmentId) || physStatus.targetType === 'torre') ? 'torre' : 'pueblo')
    : ((order.equipmentId && !registeredNode.nodeId) ? 'torre' : 'pueblo');
  const preferredNodeId = physStatus.pending ? (prop.nodeId || registeredNode.nodeId || '') : (registeredNode.nodeId || '');
  const preferredEquipmentId = physStatus.pending ? (prop.equipmentId || '') : (order.equipmentId || '');

  populateInsertPhysNodeSelect(order, preferredNodeId, '');
  populateInsertPhysEquipmentSelect(order, preferredEquipmentId, '');
  setInsertPhysTargetType(initialTargetType, { silent: true });

  const canEditFields = !physStatus.pending || (physStatus.proposedBy === 'soporte' ? (isAtencion || isAdmin) : (isSoporte || isAdmin));
  ['insert-phys-target-btn-pueblo', 'insert-phys-target-btn-torre', 'insert-phys-category', 'insert-phys-priority', 'insert-phys-description'].forEach(elId => {
    const el = document.getElementById(elId);
    if (el) el.disabled = !canEditFields;
  });
  const lockedNodeSel = document.getElementById('insert-phys-node-select');
  if (lockedNodeSel) lockedNodeSel.disabled = true;
  const lockedEqSel = document.getElementById('insert-phys-equipment-select');
  if (lockedEqSel) lockedEqSel.disabled = true;

  if (physStatus.pending) {
    const canConfirm = physStatus.proposedBy === 'soporte' ? (isAtencion || isAdmin) : (isSoporte || isAdmin);
    if (catSelect) catSelect.value = prop.category || 'otro';
    if (prioritySelect) prioritySelect.value = prop.priority || order.priority || 'media';
    const rawDesc = prop.description || physStatus.note || '';
    const cleanDesc = typeof extractCleanPhysicalDescription === 'function' ? extractCleanPhysicalDescription(rawDesc) : rawDesc;
    if (descText) descText.value = cleanDesc;

    if (canConfirm) {
      if (titleEl) titleEl.textContent = 'Confirmar acuerdo: Detalle físico';
      if (subtitleEl) subtitleEl.textContent = `Propuesta de ${physStatus.proposedByName || (physStatus.proposedBy === 'soporte' ? 'Soporte técnico' : 'Atención a clientes')}`;
      if (noticeEl) {
        noticeEl.style.display = 'block';
        noticeEl.style.background = '#fef3c7';
        noticeEl.style.borderColor = '#fde68a';
        noticeEl.style.borderLeftColor = '#f59e0b';
        noticeEl.style.color = '#92400e';
      }
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.style.display = 'inline-flex';
        saveBtn.style.background = '#059669';
        saveBtn.style.borderColor = '#047857';
      }
      if (saveLabel) saveLabel.textContent = '✅ Confirmar y cerrar reporte';
      if (rejectBtn) rejectBtn.style.display = 'inline-flex';
    } else {
      if (titleEl) titleEl.textContent = 'Propuesta enviada (Espera de acuerdo)';
      if (subtitleEl) subtitleEl.textContent = `Esperando confirmación de ${physStatus.proposedBy === 'soporte' ? 'Atención a clientes' : 'Soporte técnico'}`;
      if (noticeEl) {
        noticeEl.style.display = 'block';
        noticeEl.style.background = '#eff6ff';
        noticeEl.style.borderColor = '#bfdbfe';
        noticeEl.style.borderLeftColor = '#3b82f6';
        noticeEl.style.color = '#1e40af';
      }
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.display = 'inline-flex';
        saveBtn.style.background = '#94a3b8';
        saveBtn.style.borderColor = '#64748b';
      }
      if (saveLabel) saveLabel.textContent = '⏳ Esperando acuerdo';
      if (rejectBtn) rejectBtn.style.display = 'none';
    }
  } else {
    if (prioritySelect) prioritySelect.value = order.priority || 'media';
    if (descText) descText.value = '';
    if (titleEl) titleEl.textContent = isAdmin ? 'Registrar detalle físico' : 'Proponer detalle físico';
    if (noticeEl) {
      noticeEl.style.display = 'block';
      noticeEl.style.background = '#f5f3ff';
      noticeEl.style.borderColor = '#ddd6fe';
      noticeEl.style.borderLeftColor = '#7c3aed';
      noticeEl.style.color = '#5b21b6';
    }
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.style.display = 'inline-flex';
      saveBtn.style.background = '#7c3aed';
      saveBtn.style.borderColor = '#6d28d9';
    }
    if (saveLabel) saveLabel.textContent = isAdmin ? '🔧 Confirmar y registrar' : '📨 Proponer detalle físico';
    if (rejectBtn) rejectBtn.style.display = 'none';
  }

  updateInsertPhysDynamicNotice();
  OM('insert-physical-record-mo');
  void loadInsertPhysRemoteTargets(order, preferredNodeId, preferredEquipmentId);
  setTimeout(() => descText?.focus(), 80);
}

async function saveInsertedPhysicalRecord() {
  const orderId = ordenesPhysModalOrderId;
  const order = (state.workOrders || []).find(item => item.id === orderId && !item.deletedAt);

  const target = getInsertPhysSelectedTargetInfo(order);
  const isTower = target.targetType === 'torre';

  if (isTower && !target.equipmentId) {
    notify('Este reporte no tiene una torre asociada para registrar el detalle físico.', 'warn');
    return;
  }
  if (!isTower && !target.nodeId && !target.nodeName) {
    notify('Este reporte no tiene un pueblo registrado para el detalle físico.', 'warn');
    return;
  }

  const category = document.getElementById('insert-phys-category')?.value || 'otro';
  const priority = document.getElementById('insert-phys-priority')?.value || 'media';
  const rawDescription = document.getElementById('insert-phys-description')?.value.trim() || '';
  const description = typeof extractCleanPhysicalDescription === 'function' ? extractCleanPhysicalDescription(rawDescription) : rawDescription;

  if (!description) {
    notify('Por favor escribe la descripción o falla física del registro.', 'warn');
    document.getElementById('insert-phys-description')?.focus();
    return;
  }

  const categoryLabel = typeof orderCategoryLabel === 'function' ? orderCategoryLabel(category) : category;
  const physStatus = order ? getPhysicalDerivationStatus(order) : { pending: false };
  const currentUser = getCurrentUser();
  const isSoporte = userHasRole('soporte');
  const isAtencion = userHasRole('atencion_clientes');
  const isAdmin = userHasRole('administrador', 'admin');
  const now = new Date().toISOString();
  const orderFolio = order ? (typeof getOrderFolio === 'function' ? getOrderFolio(order) : (order.folio || order.id)) : '';

  const isAgreementConfirmation = physStatus.pending && (physStatus.proposedBy === 'soporte' ? (isAtencion || isAdmin) : (isSoporte || isAdmin));
  const isDirectAdminRegistration = !physStatus.pending && isAdmin;

  const destinationLine = isTower ? `• Destino (Torre): ${target.equipmentName}` : `• Destino (Pueblo): ${target.nodeName}`;
  const destinationPhrase = isTower ? `torre ${target.equipmentName}` : `pueblo ${target.nodeName}`;

  if (isAgreementConfirmation || isDirectAdminRegistration) {
    if (typeof askConfirmation === 'function') {
      const propBy = physStatus.proposedByName ? `\n• Propuesto por: ${physStatus.proposedByName}` : '';
      const confirmed = await askConfirmation({
        title: isDirectAdminRegistration ? '¿Registrar detalle físico y cerrar reporte?' : '¿Confirmar acuerdo y registrar detalle físico?',
        message: `${destinationLine}\n• Categoría: ${categoryLabel}\n• Falla: ${description}${propBy}\n\nSe registrará en ${isTower ? 'la torre elegida' : 'el pueblo elegido'} y se cerrará este reporte de red.`,
        confirmText: 'Confirmar y cerrar reporte',
        cancelText: 'Cancelar',
        tone: 'ok'
      });
      if (!confirmed) return;
    }

    const eq = target.eq;
    const nd = target.nd;
    const newPhysical = {
      id: typeof generateId === 'function' ? generateId() : ('ph_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      detailKind: 'physical',
      category,
      title: description.length > 80 ? (description.slice(0, 77) + '...') : description,
      description,
      priority,
      visitType: isTower ? 'torre' : 'comunidad',
      equipmentId: isTower ? target.equipmentId : '',
      equipmentName: isTower ? target.equipmentName : '',
      nodeId: isTower ? '' : (target.nodeId || ''),
      nodeCode: isTower ? '' : (nd?.nodeCode || order?.nodeCode || ''),
      nodeName: isTower ? '' : target.nodeName,
      town: isTower ? '' : (nd?.town || order?.town || ''),
      region: isTower
        ? (eq?.region || eq?.zone || order?.region || '')
        : (nd?.zone || nd?.region || order?.region || ''),
      detailLocation: isTower
        ? (eq?.location || eq?.name || target.equipmentName)
        : (nd?.location || order?.detailLocation || target.nodeName),
      lat: isTower
        ? (eq?.lat ?? '')
        : (nd?.lat ?? order?.lat ?? ''),
      lng: isTower
        ? (eq?.lng ?? '')
        : (nd?.lng ?? order?.lng ?? ''),
      clientName: '',
      clientPhone: '',
      assignedUserId: '', // No se asigna a nadie para resolver
      assignedUserName: '',
      status: 'pendiente',
      createdById: currentUser.id || '',
      createdByName: currentUser.name || currentUser.username || 'Personal',
      createdAt: now,
      updatedAt: now,
      sourceOrderId: order ? order.id : '',
      originNetworkOrderId: order ? order.id : '',
      originNetworkFolio: orderFolio,
      followUps: [
        {
          action: 'physical_record_created',
          user: currentUser.name || currentUser.username || 'Sistema',
          at: now,
          note: orderFolio
            ? `Registro físico creado en ${destinationPhrase} desde reporte de red ${orderFolio}`
            : `Registro físico creado en ${destinationPhrase}`
        }
      ]
    };
    const physicalFolio = typeof getOrderFolio === 'function' ? getOrderFolio(newPhysical) : '';

    state.workOrders = state.workOrders || [];
    state.workOrders.push(newPhysical);
    const physSaved = await saveRecord('workOrders', newPhysical);
    if (physSaved === false) {
      state.workOrders = state.workOrders.filter(item => item.id !== newPhysical.id);
      notify('No se pudo guardar el detalle físico. Intente nuevamente.', 'err');
      return;
    }

    if (order) {
      order.status = 'completada';
      order.completedAt = now;
      order.closedReason = 'physical_registered';
      order.reviewOpenedAt = '';
      order.reviewOpenedById = '';
      order.reviewOpenedByName = '';
      order.reviewOpenedByUsername = '';
      order.technicianReport = {
        ...(order.technicianReport || {}),
        result: 'completada',
        solution: `Concluido por pase a detalle físico en ${destinationPhrase}: ${description}`,
        completedAt: now
      };
      if (typeof appendSharedNetworkFollowUp === 'function') {
        appendSharedNetworkFollowUp(
          order,
          'physical',
          `Enviado a Detalle Físico (${target.targetLabel})`,
          `Registrado en ${destinationPhrase}: "${description}". Reporte de red cerrado.`
        );
        const lastFu = Array.isArray(order.followUps) && order.followUps.length ? order.followUps[order.followUps.length - 1] : null;
        if (lastFu) {
          lastFu.physicalOrderId = newPhysical.id;
          lastFu.physicalOrderFolio = physicalFolio;
          lastFu.physicalTargetType = target.targetType;
          lastFu.physicalTargetName = target.targetPlace;
          lastFu.sentToPhysicalAt = now;
        }
      }
      delete order.physicalProposal;
      order.updatedAt = now;
      order.updatedById = currentUser.id || '';
      setUpdatedAudit(order, `registró detalle físico en ${destinationPhrase} y cerró reporte de red`);
      await saveRecord('workOrders', order);
      try {
        if (typeof broadcastNetworkOrderChange === 'function') {
          broadcastNetworkOrderChange(order, 'sent_to_physical');
        }
      } catch (e) { }
      updateOrderChatLive(order);
    }

    CM('insert-physical-record-mo');
    renderWOs();
    if (typeof renderAntennaDetailList === 'function') renderAntennaDetailList();
    if (typeof renderNodeDetailList === 'function') renderNodeDetailList();
    if (typeof ordenesPhysModalRefreshCb === 'function') {
      try { ordenesPhysModalRefreshCb(); } catch (e) { }
    }

    notify(`Detalle físico registrado en ${destinationPhrase} y reporte de red cerrado.`, 'ok');
  } else {
    if (typeof askConfirmation === 'function') {
      const confirmed = await askConfirmation({
        title: '¿Enviar propuesta de detalle físico?',
        message: `${destinationLine}\n• Categoría: ${categoryLabel}\n• Falla: ${description}\n\nSe enviará a la contraparte para su acuerdo mutuo.`,
        confirmText: 'Enviar propuesta',
        cancelText: 'Cancelar',
        tone: 'primary'
      });
      if (!confirmed) return;
    }

    if (order) {
      const proposedBy = (isSoporte && !isAtencion) ? 'soporte' : (isAtencion ? 'atencion' : (isNetworkSupportToAttention(order) ? 'soporte' : 'atencion'));
      const roleLabel = proposedBy === 'soporte' ? 'Soporte técnico' : 'Atención a clientes';

      const proposalPayload = {
        targetType: target.targetType,
        equipmentId: isTower ? target.equipmentId : '',
        equipmentName: isTower ? target.equipmentName : '',
        nodeId: isTower ? '' : target.nodeId,
        nodeName: isTower ? '' : target.nodeName,
        category,
        priority,
        description,
        proposedBy,
        proposedByName: currentUser.name || currentUser.username || roleLabel,
        at: now
      };
      order.physicalProposal = proposalPayload;
      if (typeof appendSharedNetworkFollowUp === 'function') {
        appendSharedNetworkFollowUp(
          order,
          `physical_proposed_${proposedBy}`,
          `Pase a Detalles Físicos (${target.targetLabel}) propuesto por ${roleLabel}`,
          `${target.targetLabel}: ${target.targetPlace} · Categoría: ${categoryLabel} · Falla: ${description}`
        );
        const lastFu = Array.isArray(order.followUps) && order.followUps.length ? order.followUps[order.followUps.length - 1] : null;
        if (lastFu) {
          lastFu.proposal = { ...proposalPayload };
        }
      }
      order.updatedAt = now;
      order.updatedById = currentUser.id || '';
      setUpdatedAudit(order, `propuso derivar detalle de red a físico en ${destinationPhrase}`);
      await saveRecord('workOrders', order);
      try {
        if (typeof broadcastNetworkOrderChange === 'function') {
          broadcastNetworkOrderChange(order, 'physical_proposed', { proposedBy });
        }
      } catch (e) { }
      updateOrderChatLive(order);
    }

    CM('insert-physical-record-mo');
    renderWOs();
    if (typeof ordenesPhysModalRefreshCb === 'function') {
      try { ordenesPhysModalRefreshCb(); } catch (e) { }
    }

    notify(`Propuesta enviada al chat (${target.targetLabel}: ${target.targetPlace}). Se requiere acuerdo de la contraparte.`, 'ok');
  }
}

if (typeof window !== 'undefined') {
  window.ensureInsertPhysicalRecordModal = ensureInsertPhysicalRecordModal;
  window.setInsertPhysTargetType = setInsertPhysTargetType;
  window.filterInsertPhysTargetOptions = filterInsertPhysTargetOptions;
  window.onInsertPhysEquipmentChange = onInsertPhysEquipmentChange;
  window.onInsertPhysNodeChange = onInsertPhysNodeChange;
  window.rejectPhysicalRecordProposalFromModal = rejectPhysicalRecordProposalFromModal;
  window.openInsertPhysicalRecordModal = openInsertPhysicalRecordModal;
  window.saveInsertedPhysicalRecord = saveInsertedPhysicalRecord;
}

async function promptSendNetworkToPhysical(id) {
  if (typeof openInsertPhysicalRecordModal === 'function') {
    return openInsertPhysicalRecordModal(id);
  }
  const order = (state.workOrders || []).find(item => item.id === id && !item.deletedAt);
  if (!order) return notify('No se encontró el detalle solicitado.', 'err');
  if (order.status === 'completada') {
    return notify('El caso ya está concluido. Reábrelo primero si requiere visita física.', 'warn');
  }

  const physStatus = getPhysicalDerivationStatus(order);
  const isSoporte = userHasRole('soporte');
  const isAtencion = userHasRole('atencion_clientes');
  const isAdmin = userHasRole('administrador', 'admin');

  // Si la contraparte ya propuso enviarlo a físicos, permitir confirmar directamente
  if (physStatus.pending) {
    const canConfirm = physStatus.proposedBy === 'soporte' ? (isAtencion || isAdmin) : (isSoporte || isAdmin);
    if (canConfirm) {
      return confirmSendNetworkToPhysical(id);
    }
    return notify('Ya enviaste la propuesta para pasar a Detalles Físicos. En espera de confirmación de la otra parte.', 'warn');
  }

  const note = await askReasonPrompt({
    title: 'Proponer envío a Detalles Físicos',
    message: 'Para enviar a Detalles Físicos ambas partes deben estar de acuerdo. Indica el motivo o instrucción para visita en campo:',
    placeholder: 'Describe por qué requiere revisión física en sitio...',
    initialValue: 'Requiere visita presencial para revisión física en sitio.',
    confirmText: 'Enviar propuesta',
    cancelText: 'Cancelar',
    tone: 'primary',
    emptyWarning: 'Por favor indica el motivo para enviar a Detalles Físicos.'
  });
  if (!note || !note.trim()) return;

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || (isSoporte ? 'Soporte técnico' : 'Atención a clientes');
  const proposedBy = (isSoporte && !isAtencion) ? 'soporte' : (isAtencion ? 'atencion' : (isNetworkSupportToAttention(order) ? 'soporte' : 'atencion'));
  const roleLabel = proposedBy === 'soporte' ? 'Soporte técnico' : 'Atención a clientes';
  const now = new Date().toISOString();

  order.updatedAt = now;
  order.updatedById = currentUser.id || '';

  appendSharedNetworkFollowUp(
    order,
    `physical_proposed_${proposedBy}`,
    `Pase a Detalles Físicos propuesto por ${roleLabel}`,
    note.trim()
  );
  setUpdatedAudit(order, 'propuso derivar detalle de red a detalles físicos');

  updateOrderChatLive(order);
  renderWOs();

  const saved = await saveRecord('workOrders', order);
  if (!saved) {
    notify('No se pudo registrar la propuesta. Intente nuevamente.', 'err');
    return;
  }

  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(order, 'physical_proposed', { proposedBy });
    }
  } catch (e) {
    console.warn('broadcastNetworkOrderChange error:', e);
  }

  updateOrderChatLive(order);
  renderWOs();
  notify('Propuesta enviada al chat. La otra parte debe confirmar para transferir a Detalles Físicos.', 'ok');
}

async function confirmSendNetworkToPhysical(id) {
  const order = (state.workOrders || []).find(item => item.id === id && !item.deletedAt);
  if (!order) return notify('No se encontró el detalle solicitado.', 'err');

  const physStatus = getPhysicalDerivationStatus(order);
  if (!physStatus.pending) {
    return promptSendNetworkToPhysical(id);
  }

  const isSoporte = userHasRole('soporte');
  const isAtencion = userHasRole('atencion_clientes');
  const isAdmin = userHasRole('administrador', 'admin');
  const canConfirm = physStatus.proposedBy === 'soporte' ? (isAtencion || isAdmin) : (isSoporte || isAdmin);
  if (!canConfirm) {
    return notify('La otra parte involucrada debe confirmar el acuerdo para enviar a Detalles Físicos.', 'warn');
  }

  const prop = physStatus.proposal || order.physicalProposal || {};
  const isTower = prop.targetType === 'torre' || (!prop.targetType && Boolean(prop.equipmentId)) || physStatus.targetType === 'torre';
  const registeredNode = typeof resolveOrderRegisteredNode === 'function'
    ? resolveOrderRegisteredNode(order)
    : { nodeId: order.nodeId || '', nodeName: order.nodeName || 'Pueblo registrado' };

  const associatedEq = typeof resolveOrderAssociatedEquipment === 'function'
    ? resolveOrderAssociatedEquipment(order)
    : { equipmentId: String(order.equipmentId || '').trim(), equipmentName: order.equipmentName || '', eq: null, linkedList: [] };

  let equipmentId = '';
  let eq = null;
  if (isTower) {
    const propEqId = String(prop.equipmentId || '').trim();
    const allowedFromLinked = (associatedEq.linkedList || []).find(item => String(item.id) === propEqId);
    if (allowedFromLinked) {
      equipmentId = String(allowedFromLinked.id);
      eq = allowedFromLinked;
    } else {
      equipmentId = associatedEq.equipmentId || propEqId;
      eq = associatedEq.eq || (equipmentId
        ? ((state.equipment || []).find(e => !e.deletedAt && String(e.id) === equipmentId)
          || (state.equipment || []).find(e => String(e.id) === equipmentId)
          || null)
        : null);
    }
    if (equipmentId && !eq && typeof fetchDataPage === 'function') {
      try {
        const eqData = await fetchDataPage('equipment', { id: equipmentId, limit: 1 });
        mergeOrderLookupRecords('equipment', eqData?.equipment);
        eq = (state.equipment || []).find(e => String(e.id) === equipmentId) || null;
      } catch (e) { }
    }
  }
  const equipmentName = isTower ? (eq?.name || associatedEq.equipmentName || prop.equipmentName || 'Torre asociada') : '';

  const nodeId = isTower ? '' : String(registeredNode.nodeId || order.nodeId || '').trim();
  const nd = (!isTower && nodeId)
    ? ((state.nodes || []).find(n => !n.deletedAt && String(n.id) === nodeId)
      || (state.nodes || []).find(n => String(n.id) === nodeId)
      || null)
    : null;
  const nodeName = isTower
    ? ''
    : ((nd && typeof getNodeLabel === 'function' ? getNodeLabel(nd) : '') || registeredNode.nodeName || order.nodeName || 'Pueblo registrado');

  const targetType = isTower ? 'torre' : 'pueblo';
  const targetLabel = isTower ? 'Torre' : 'Pueblo';
  const targetPlace = isTower ? equipmentName : nodeName;
  const destinationPhrase = isTower ? `torre ${equipmentName}` : `pueblo ${nodeName}`;
  const category = prop.category || 'otro';
  const priority = prop.priority || order.priority || 'media';
  const rawDescription = prop.description || physStatus.note || order.description || order.title || 'Revisión física en sitio';
  const description = typeof extractCleanPhysicalDescription === 'function' ? extractCleanPhysicalDescription(rawDescription) : rawDescription;
  const categoryLabel = typeof orderCategoryLabel === 'function' ? orderCategoryLabel(category) : category;

  const folio = getOrderFolio(order);
  const propBy = physStatus.proposedByName ? `\n• Propuesto por: ${physStatus.proposedByName}` : '';
  const confirmed = await askConfirmation({
    title: '¿Confirmar acuerdo y registrar detalle físico?',
    message: `• Destino (${targetLabel}): ${targetPlace}\n• Categoría: ${categoryLabel}\n• Falla: ${description}${propBy}\n\nSe registrará en ${isTower ? 'la torre elegida' : 'el pueblo elegido'} y se cerrará este reporte de red.`,
    confirmText: 'Confirmar y cerrar reporte',
    cancelText: 'Cancelar',
    tone: 'ok'
  });
  if (!confirmed) return;

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || (isSoporte ? 'Soporte técnico' : 'Atención a clientes');
  const now = new Date().toISOString();

  const newPhysical = {
    id: typeof generateId === 'function' ? generateId() : ('ph_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    detailKind: 'physical',
    category: category,
    title: description.length > 80 ? (description.slice(0, 77) + '...') : description,
    description: description,
    priority: priority,
    visitType: isTower ? 'torre' : 'comunidad',
    equipmentId: isTower ? equipmentId : '',
    equipmentName: isTower ? equipmentName : '',
    nodeId: isTower ? '' : nodeId,
    nodeCode: isTower ? '' : (nd?.nodeCode || order.nodeCode || ''),
    nodeName: isTower ? '' : nodeName,
    town: isTower ? '' : (nd?.town || order.town || ''),
    region: isTower
      ? (eq?.region || eq?.zone || order.region || '')
      : (nd?.zone || nd?.region || order.region || ''),
    detailLocation: isTower
      ? (eq?.location || eq?.name || equipmentName)
      : (nd?.location || order.detailLocation || nodeName),
    lat: isTower ? (eq?.lat ?? '') : (nd?.lat ?? order.lat ?? ''),
    lng: isTower ? (eq?.lng ?? '') : (nd?.lng ?? order.lng ?? ''),
    clientName: '',
    clientPhone: '',
    assignedUserId: '', // No se asigna a nadie para resolver
    assignedUserName: '',
    status: 'pendiente',
    createdById: currentUser.id || '',
    createdByName: userName,
    createdAt: now,
    updatedAt: now,
    sourceOrderId: order.id,
    originNetworkOrderId: order.id,
    originNetworkFolio: folio,
    followUps: [
      {
        action: 'physical_record_created',
        user: userName,
        at: now,
        note: `Registro físico creado por acuerdo mutuo en ${destinationPhrase} desde reporte de red ${folio}`
      }
    ]
  };
  const physicalFolio = typeof getOrderFolio === 'function' ? getOrderFolio(newPhysical) : '';

  state.workOrders = state.workOrders || [];
  state.workOrders.push(newPhysical);
  const physSaved = await saveRecord('workOrders', newPhysical);
  if (physSaved === false) {
    state.workOrders = state.workOrders.filter(item => item.id !== newPhysical.id);
    notify('No se pudo guardar el detalle físico. Intente nuevamente.', 'err');
    return;
  }

  // Cerrar el reporte de red original
  order.status = 'completada';
  order.completedAt = now;
  order.closedReason = 'physical_registered';
  order.reviewOpenedAt = '';
  order.reviewOpenedById = '';
  order.reviewOpenedByName = '';
  order.reviewOpenedByUsername = '';
  order.updatedAt = now;
  order.updatedById = currentUser.id || '';
  order.technicianReport = {
    ...(order.technicianReport || {}),
    result: 'completada',
    solution: `Concluido por pase a detalle físico acordado por ambas partes en ${destinationPhrase}: ${description}`,
    completedAt: now
  };

  appendSharedNetworkFollowUp(
    order,
    'physical',
    `Enviado a Detalle Físico (${targetLabel}) por acuerdo mutuo`,
    `Acuerdo mutuo completado. Registrado en ${destinationPhrase}: "${description}". Reporte de red cerrado.`
  );
  const lastFu = Array.isArray(order.followUps) && order.followUps.length ? order.followUps[order.followUps.length - 1] : null;
  if (lastFu) {
    lastFu.physicalOrderId = newPhysical.id;
    lastFu.physicalOrderFolio = physicalFolio;
    lastFu.physicalTargetType = targetType;
    lastFu.physicalTargetName = targetPlace;
    lastFu.sentToPhysicalAt = now;
  }
  delete order.physicalProposal;
  setUpdatedAudit(order, `confirmó acuerdo mutuo y cerró detalle de red con registro físico en ${destinationPhrase}`);

  const saved = await saveRecord('workOrders', order);
  if (!saved) {
    notify('No se pudo guardar la actualización del reporte. Intente nuevamente.', 'err');
    return;
  }

  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(order, 'sent_to_physical');
    }
  } catch (e) {
    console.warn('broadcastNetworkOrderChange error:', e);
  }

  if (currentOrderReportId === order.id) {
    currentOrderReportId = '';
    CM('order-tech-report-mo');
  }

  notify(`Acuerdo completado: Detalle físico registrado en ${destinationPhrase} y reporte de red ${folio} cerrado.`, 'ok');
  await loadOrderPage();
}

async function rejectSendNetworkToPhysical(id) {
  const order = (state.workOrders || []).find(item => item.id === id && !item.deletedAt);
  if (!order) return notify('No se encontró el detalle solicitado.', 'err');
  const physStatus = getPhysicalDerivationStatus(order);
  if (!physStatus.pending) return;

  const reason = await askReasonPrompt({
    title: 'Rechazar pase a Detalles Físicos',
    message: 'Indica brevemente por qué este caso debe continuar atendiéndose en Detalles de Red:',
    placeholder: 'Ej. Aún podemos validar configuración remota con el cliente...',
    confirmText: 'Mantener en Red',
    cancelText: 'Cancelar',
    tone: 'danger',
    emptyWarning: 'Por favor indica el motivo para mantener el caso en Detalles de Red.'
  });
  if (!reason || !reason.trim()) return;

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || 'Usuario';
  const now = new Date().toISOString();
  order.updatedAt = now;
  order.updatedById = currentUser.id || '';

  appendSharedNetworkFollowUp(
    order,
    'physical_rejected',
    'Pase a Detalles Físicos descartado',
    `${userName}: ${reason.trim()}`
  );
  setUpdatedAudit(order, 'descartó propuesta de envío a detalles físicos');

  updateOrderChatLive(order);
  renderWOs();

  const saved = await saveRecord('workOrders', order);
  if (!saved) return notify('No se pudo guardar la respuesta.', 'err');

  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(order, 'updated');
    }
  } catch (e) { }

  updateOrderChatLive(order);
  renderWOs();
  notify('El caso permanece en Detalles de Red.', 'ok');
}

async function openWOCopy(id) {
  const source = (state.workOrders || []).find(item => item.id === id && !item.deletedAt);
  if (!source) return;
  if (source.status !== 'completada') return notify('Solo puedes copiar un detalle que ya esté solucionado. Para uno abierto usa Volver a enviar.', 'warn');
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

function showOrderActionForm(id, mode) {
  const settings = {
    reviewed: { label: '¿Qué se hizo para intentar solucionarlo?', hint: 'Obligatorio', placeholder: 'Describe la revisión, ajuste o prueba realizada...', button: 'Guardar como revisado', handler: 'markWOReviewed' },
    physical: { label: '¿Qué detalle físico se presentó?', hint: 'Obligatorio', placeholder: 'Describe la falla física detectada y lo que debe atenderse...', button: 'Enviar a detalles físicos', handler: 'sendWOToPhysical' },
    same: { label: 'Información nueva', hint: 'Opcional', placeholder: 'Agrega únicamente lo nuevo que reportó el cliente, si existe...', button: 'Guardar: sigue el mismo tema', handler: 'markWOSameIssue' }
  };
  const setting = settings[mode];
  const form = document.getElementById('order-action-form');
  if (!setting || !form) return;
  document.getElementById('order-action-note-label').textContent = setting.label;
  const hint = document.getElementById('order-action-note-hint');
  hint.textContent = setting.hint;
  hint.classList.toggle('is-required', mode !== 'same');
  const textarea = document.getElementById('order-action-note');
  textarea.value = '';
  textarea.placeholder = setting.placeholder;
  const confirm = document.getElementById('order-action-confirm');
  confirm.textContent = setting.button;
  confirm.setAttribute('onclick', `${setting.handler}('${id}')`);
  form.hidden = false;
  setTimeout(() => textarea.focus(), 50);
}

function openOrderActions(id) {
  const order = (state.workOrders || []).find(item => item.id === id && !item.deletedAt);
  if (!order) return notify('No se encontró el detalle solicitado.', 'err');
  if (order.detailKind !== 'network') return notify('Estas acciones solo están disponibles para detalles de red.', 'warn');
  const status = getOrderStatusMeta(order);
  const solved = order.status === 'completada';
  let modal = document.getElementById('order-actions-mo');
  if (!modal) {
    document.body.insertAdjacentHTML('beforeend', '<div class="mo order-actions-mo" id="order-actions-mo"><div class="md order-actions-card" id="order-actions-card"></div></div>');
    modal = document.getElementById('order-actions-mo');
  }
  document.getElementById('order-actions-card').innerHTML = `
    <div class="modal-head"><div><h2>Acciones del detalle</h2><p>${orderEscape(getOrderFolio(order))} · Creado ${orderEscape(formatOrderDate(order.createdAt))}</p></div><button type="button" class="wo-modal-close" aria-label="Cerrar" onclick="CM('order-actions-mo')"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="order-action-current"><span>Estado actual</span><strong class="order-status-badge ${status.className}">${status.label}</strong></div>
    ${order.reviewOpenedAt ? `<p class="order-action-review-meta">Abierta para revisión: <strong>${orderEscape(orderReviewOpenedSummary(order))}</strong></p>` : ''}
    <div class="order-workflow-actions">
      ${!solved ? `<button type="button" class="btn action-reviewed" onclick="showOrderActionForm('${orderEscape(id)}','reviewed')">Revisado</button><button type="button" class="btn action-solved" onclick="solveWOFromActions('${orderEscape(id)}')">Solucionado</button>` : ''}
      ${!solved && order.detailKind === 'network' ? `<button type="button" class="btn action-physical" onclick="openInsertPhysicalRecordModal('${orderEscape(id)}')">Registrar detalle físico</button>` : ''}
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
    targetType: 'detail',
    targetId: id,
    targetName: w.clientName || w.title || w.description || 'detalle',
    applyDelete: () => {
      setDeletedAudit(w, 'elimino orden');
      try {
        if (typeof broadcastNetworkOrderChange === 'function') {
          broadcastNetworkOrderChange(w, 'deleted');
        }
      } catch (e) { }
    },
    refresh: () => { void loadOrderPage(); }
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


let orderChatAttachedPhoto = '';
let selectedOrderRowId = '';

function selectOrderRow(orderId, event) {
  if (!orderId) return;
  selectedOrderRowId = String(orderId);
  const rows = document.querySelectorAll('#orders-table .order-table tbody tr[data-order-id]');
  rows.forEach(tr => {
    tr.classList.toggle('order-row-selected', tr.getAttribute('data-order-id') === selectedOrderRowId);
  });
}

function canRoleDeclareUnresolvable(order) {
  if (!order || order.detailKind !== 'network') return false;
  if (userHasRole('administrador', 'admin')) return true;
  const isSentToAttention = isNetworkSupportToAttention(order);
  // Solo quien recibe el reporte puede enviarlo como no realizable
  return isSentToAttention ? userHasRole('atencion_clientes') : userHasRole('soporte');
}

function canRoleConfirmUnresolvable(order) {
  if (!order || order.detailKind !== 'network') return false;
  if (userHasRole('administrador', 'admin')) return true;
  const isSentToAttention = isNetworkSupportToAttention(order);
  // Quien envió el reporte debe confirmar que no se puede realizar
  return isSentToAttention ? userHasRole('soporte') : userHasRole('atencion_clientes');
}

function isUserInCase(order, user) {
  if (!order || !user) return false;
  if (typeof userHasRole === 'function' && userHasRole('administrador', 'admin')) return true;

  const uid = String(user.id || '').trim().toLowerCase();
  const uname = String(user.username || '').trim().toLowerCase();
  const name = String(user.name || '').trim().toLowerCase();

  if (isOrderCreatorOrAssigner(order, user)) return true;
  if (isOrderAssignedToUser(order, user)) return true;

  const reviewId = String(order.reviewOpenedById || '').trim().toLowerCase();
  const reviewName = String(order.reviewOpenedByName || '').trim().toLowerCase();
  if (reviewId && (reviewId === uid || reviewId === uname)) return true;
  if (reviewName && (reviewName === name || reviewName === uname)) return true;

  const followUps = Array.isArray(order.followUps) ? order.followUps : [];
  const participated = followUps.some(f => {
    const fId = String(f.byId || f.byUserId || '').trim().toLowerCase();
    const fName = String(f.byName || '').trim().toLowerCase();
    return (fId && (fId === uid || fId === uname)) || (fName && (fName === name || fName === uname));
  });
  if (participated) return true;

  return false;
}

function getOrderClosureStatus(order) {
  const followUps = Array.isArray(order?.followUps) ? order.followUps : [];
  let lastResetIdx = -1;
  for (let i = followUps.length - 1; i >= 0; i--) {
    const act = String(followUps[i]?.action || '').toLowerCase();
    if (act === 'reopened' || act === 'reabierto' || act === 'devuelto_soporte') {
      lastResetIdx = i;
      break;
    }
  }
  const relevantFollowUps = lastResetIdx >= 0 ? followUps.slice(lastResetIdx + 1) : followUps;
  const isSentToAttention = isNetworkSupportToAttention(order);

  const supportConfirmed = relevantFollowUps.find(f =>
    f.action === 'closure_proposed_soporte' ||
    f.action === 'closure_confirmed_soporte' ||
    (!isSentToAttention && f.action === 'resuelto_soporte')
  );

  const attentionConfirmed = relevantFollowUps.find(f =>
    f.action === 'closure_proposed_atencion' ||
    f.action === 'closure_confirmed_atencion' ||
    f.action === 'confirmed_atencion' ||
    (isSentToAttention && f.action === 'resuelto_soporte')
  );

  return {
    supportConfirmed: !!supportConfirmed,
    supportBy: supportConfirmed?.byName || '',
    supportAt: supportConfirmed?.at || '',
    attentionConfirmed: !!attentionConfirmed,
    attentionBy: attentionConfirmed?.byName || '',
    attentionAt: attentionConfirmed?.at || '',
    bothConfirmed: (!!supportConfirmed && !!attentionConfirmed) || order?.status === 'completada'
  };
}

function getOrderPendingUserAction(order) {
  if (!order || (typeof getOrderDetailKind === 'function' ? getOrderDetailKind(order) : order.detailKind) !== 'network' || order.status === 'completada') {
    return { requiresMyAction: false, waitingOther: false, badge: '', kind: '' };
  }
  const isSoporte = userHasRole('soporte');
  const isAtencion = userHasRole('atencion_clientes');
  const isAdmin = userHasRole('administrador', 'admin');
  const isSentToAttention = isNetworkSupportToAttention(order);

  if (order.status === 'no_realizado') {
    if (canRoleConfirmUnresolvable(order)) {
      return { requiresMyAction: true, waitingOther: false, badge: 'Confirmar no realizable', kind: 'unresolvable' };
    }
    return {
      requiresMyAction: false,
      waitingOther: true,
      badge: isSentToAttention ? 'Espera a Soporte' : 'Espera a Atención',
      kind: 'unresolvable'
    };
  }

  const closureStatus = getOrderClosureStatus(order);
  const closurePending = order.status === 'resuelto_soporte' || (isSentToAttention ? closureStatus.attentionConfirmed : closureStatus.supportConfirmed);
  if (closurePending) {
    const myTurn = isSentToAttention ? (isSoporte || isAdmin) : (isAtencion || isAdmin);
    if (myTurn) {
      return { requiresMyAction: true, waitingOther: false, badge: 'Confirmar cierre', kind: 'closure' };
    }
    return {
      requiresMyAction: false,
      waitingOther: true,
      badge: isSentToAttention ? 'Espera a Soporte' : 'Espera a Atención',
      kind: 'closure'
    };
  }

  const physStatus = getPhysicalDerivationStatus(order);
  if (physStatus.pending) {
    const myTurn = physStatus.proposedBy === 'soporte' ? (isAtencion || isAdmin) : (isSoporte || isAdmin);
    if (myTurn) {
      return { requiresMyAction: true, waitingOther: false, badge: 'Confirmar a Físicos', kind: 'physical' };
    }
    return {
      requiresMyAction: false,
      waitingOther: true,
      badge: 'Propuesto a Físicos',
      kind: 'physical'
    };
  }

  return { requiresMyAction: false, waitingOther: false, badge: '', kind: '' };
}

function getOrderChatStatusBadgeHtml(order) {
  const isCompleted = order.status === 'completada';
  const closureStatus = getOrderClosureStatus(order);
  const physStatus = getPhysicalDerivationStatus(order);
  const sentPhysicalInfo = getOrderSentToPhysicalInfo(order);
  const sentPhysicalBadge = sentPhysicalInfo.sent ? renderSentToPhysicalBadge(order, { showTarget: true }) : '';
  const isSentToAttention = isNetworkSupportToAttention(order);

  if (isCompleted) {
    return `${sentPhysicalBadge}<span class="closure-badge completed">${sentPhysicalInfo.sent ? 'Caso concluido' : 'Caso concluido por ambas partes'}</span>`;
  }
  if (order.status === 'no_realizado') {
    return `${sentPhysicalBadge}<span class="closure-badge waiting" style="background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;">No realizable · Espera a ${isSentToAttention ? 'Soporte' : 'Atención'}</span>`;
  }
  if (physStatus.pending) {
    const targetHint = physStatus.targetType === 'torre' ? ' (Torre)' : (physStatus.targetType === 'pueblo' ? ' (Pueblo)' : '');
    return `${sentPhysicalBadge}<span class="closure-badge waiting" style="background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe;">Pase a Físicos${targetHint} propuesto · Espera acuerdo</span>`;
  }
  if (isSentToAttention) {
    if (closureStatus.attentionConfirmed || order.status === 'resuelto_soporte') {
      return `${sentPhysicalBadge}<span class="closure-badge waiting">Atención envió a concluir · Espera a Soporte</span>`;
    }
    return `${sentPhysicalBadge}<span class="closure-badge" style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;">En proceso por Atención a clientes</span>`;
  }
  if (closureStatus.supportConfirmed || order.status === 'resuelto_soporte') {
    return `${sentPhysicalBadge}<span class="closure-badge waiting">Soporte propuso cierre · Espera a Atención</span>`;
  }
  return `${sentPhysicalBadge}<span class="closure-badge" style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;">Conversación activa</span>`;
}

function renderOrderChatComposerInnerHtml(order) {
  const currentUser = getCurrentUser();
  const isInCase = isUserInCase(order, currentUser);
  const isCompleted = order.status === 'completada';
  const isSentToAttention = isNetworkSupportToAttention(order);

  if (isCompleted) {
    // REGLA: Mientras el detalle esté concluido no se puede seguir conversando hasta que se vuelva a abrir
    return `
      <div class="order-chat-closed-banner" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 16px;background:#f8fafc;border-radius:10px;color:#64748b;font-size:12px;font-weight:600;border:1px dashed #cbd5e1;text-align:center;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Detalle concluido. La conversación está cerrada y no se pueden enviar más mensajes mientras el detalle esté cerrado. Debe reabrirse para continuar.</span>
      </div>
    `;
  }
  if (!isInCase) {
    const canRetake = typeof canUserRetakeNetworkOrder === 'function'
      ? canUserRetakeNetworkOrder(order, currentUser)
      : (!isCompleted && order.status !== 'no_realizado' && (isSentToAttention ? userHasRole('atencion_clientes') : userHasRole('soporte')));
    return `
      <div class="order-chat-restricted-banner">
        <span>Solo los involucrados en este caso pueden enviar mensajes.</span>
        ${canRetake ? `
          <button type="button" class="btn net-btn-retake" onclick="takeOverAndJoinChat('${order.id}')" style="min-height:30px;padding:3px 10px;font-size:11px;">
            Retomar caso para participar
          </button>
        ` : ''}
      </div>
    `;
  }
  return `
    <div class="order-chat-composer">
      <input type="file" id="order-chat-file" accept="image/*" style="display:none;" onchange="handleOrderChatFileSelect(event)">
      <button type="button" class="order-chat-attach-btn" onclick="document.getElementById('order-chat-file').click()" title="Adjuntar imagen o pegar con Ctrl+V">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
      </button>
      <input type="text" id="order-chat-input" class="order-chat-input" placeholder="Escribe un mensaje o pega una captura con Ctrl+V..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendOrderChatMessage('${order.id}');}">
      <button type="button" class="order-chat-send-btn" onclick="sendOrderChatMessage('${order.id}')">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        Enviar
      </button>
    </div>
    <div id="order-chat-photo-preview" style="display:none;margin-top:8px;align-items:center;gap:8px;"></div>
  `;
}

function renderOrderChat(order, options = {}) {
  const statusBadgeHtml = getOrderChatStatusBadgeHtml(order);
  const messagesHtml = renderOrderChatMessagesHtml(order);
  const includeComposer = options.includeComposer !== false;
  const composerHtml = includeComposer ? renderOrderChatComposerInnerHtml(order) : '';

  return `
    <section class="order-chat-section">
      <div class="order-chat-head">
        <div class="order-chat-head-left">
          <span class="order-chat-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </span>
          <div>
            <strong style="font-size:13.5px;color:#0f172a;">Conversación y Seguimiento del Caso</strong>
            <p style="margin:0;font-size:11px;color:#64748b;">Mensajes directos entre los involucrados en esta orden</p>
          </div>
        </div>
        <div class="order-chat-status-pill">
          ${statusBadgeHtml}
        </div>
      </div>
      <div id="order-chat-messages" class="order-chat-messages">
        ${messagesHtml}
      </div>
      ${includeComposer ? `<div class="order-chat-composer-wrap">${composerHtml}</div>` : ''}
    </section>
  `;
}

function renderOrderChatMessagesHtml(order) {
  const currentUser = getCurrentUser();
  const uId = String(currentUser.id || '').toLowerCase();
  const uName = normalizeName(currentUser.name || currentUser.username || '');
  const followUps = Array.isArray(order.followUps) ? order.followUps : [];

  if (!followUps.length) {
    return `<div style="text-align:center;padding:24px 12px;color:#94a3b8;font-size:12px;">No hay mensajes registrados aún en este caso. Escribe el primer mensaje a continuación.</div>`;
  }

  const items = [];
  for (let idx = 0; idx < followUps.length; idx++) {
    const step = followUps[idx];
    const action = String(step.action || '').toLowerCase();
    const label = String(step.label || '').toLowerCase();
    const normLabel = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // REGLA INSTITUCIONAL: Excluir estrictamente el "visto" y "atención no realizada" (solo notificación) del chat
    if (
      action === 'viewed' ||
      action === 'review_opened' ||
      action === 'review_deferred' ||
      action === 'review_exit_unconfirmed' ||
      action === 'atencion_no_realizada' ||
      normLabel.includes('visto') ||
      normLabel.includes('abierta para revision') ||
      label.includes('atención no realizada') ||
      normLabel.includes('atencion no realizada') ||
      normLabel.includes('no se atendera') ||
      normLabel.includes('salio sin confirmar') ||
      normLabel.includes('pospuso la revision')
    ) {
      continue;
    }

    // Evitar duplicar tarjetas si resuelto_soporte viene seguido inmediatamente por closure_proposed_* con la misma nota
    if (action === 'resuelto_soporte') {
      const nextStep = followUps[idx + 1];
      const nextAct = String(nextStep?.action || '').toLowerCase();
      if ((nextAct === 'closure_proposed_soporte' || nextAct === 'closure_proposed_atencion') && String(nextStep?.note || '').trim() === String(step.note || '').trim()) {
        continue;
      }
    }

    // Omitir espejos automáticos heredados cuando ya existe la tarjeta ancha de acción en el flujo
    if (action === 'chat_message' && (step.isAutoActionMirror || /^(\[Enviado a concluir|\[Conclusión registrada|\[Resolución técnica registrada|✓ \[Caso concluido formalmente\]|\[Observación de devolución)/.test(String(step.note || '').trim()))) {
      const prevAct = String(followUps[idx - 1]?.action || '').toLowerCase();
      if (prevAct && prevAct !== 'chat_message') {
        continue;
      }
    }

    const atStr = step.at ? new Date(step.at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

    if (action === 'chat_message') {
      const isMine = (step.byId && String(step.byId).toLowerCase() === uId) ||
        (step.byUserId && String(step.byUserId).toLowerCase() === uId) ||
        (step.byName && normalizeName(step.byName) === uName);
      const role = step.byRole || (step.label ? step.label : 'Usuario');
      const authorChip = renderUserColorChip(step.byName || 'Usuario', step.byId || step.byUserId);
      const photos = Array.isArray(step.photos) ? step.photos : (step.photo ? [step.photo] : []);

      items.push(`
        <div class="chat-bubble ${isMine ? 'mine' : 'theirs'}">
          <div class="chat-bubble-author">
            ${authorChip}
            <span class="chat-bubble-role-badge">${orderEscape(role)}</span>
          </div>
          ${step.note ? `<div class="chat-bubble-text">${orderEscape(step.note)}</div>` : ''}
          ${photos.length ? `
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
              ${photos.map((ph) => `
                <img src="${orderEscape(ph)}" class="chat-bubble-photo-thumb" onclick="openEvidenceGallery(['${orderEscape(ph)}'], 0)" alt="Evidencia adjunta" title="Clic para ampliar imagen">
              `).join('')}
            </div>
          ` : ''}
          <div class="chat-bubble-time">${orderEscape(atStr)}</div>
        </div>
      `);
    } else if (action === 'reabierto' || action === 'reopened') {
      items.push(`
        <div class="chat-system-divider">
          <span class="chat-divider-pill">Caso reabierto por ${orderEscape(step.byName || 'Usuario')} (${orderEscape(atStr)}) · Historial previo conservado</span>
        </div>
      `);
    } else {
      // Cuadros de acción anchos con paleta de colores distintiva por cada tipo de acción
      let systemClass = 'system-created';
      let icon = '📌';
      if (action === 'resuelto_soporte' || action.startsWith('closure_proposed') || label.includes('resuelto') || label.includes('solución') || label.includes('conclusión enviada')) {
        systemClass = 'system-resolved';
        icon = '🛠️';
      } else if (action === 'devuelto_soporte' || label.includes('devuelto') || label.includes('retorno')) {
        systemClass = 'system-returned';
        icon = '↩️';
      } else if (action === 'completada' || action === 'concluido' || action.startsWith('closure_confirmed') || label.includes('concluid') || label.includes('cierre confirmado')) {
        systemClass = 'system-completed';
        icon = '✓';
      } else if (action === 'retomado' || label.includes('retomado') || label.includes('reasign')) {
        systemClass = 'system-retaken';
        icon = '🔄';
      } else if (action === 'en_atencion' || action === 'atencion_iniciada' || label.includes('atención iniciada') || label.includes('atención técnica iniciada')) {
        systemClass = 'system-attending';
        icon = '⚡';
      } else if (action === 'no_realizado' || action === 'physical_rejected' || label.includes('no realizable') || label.includes('no realizada') || label.includes('descartado')) {
        systemClass = 'system-failed';
        icon = '🚫';
      } else if (action === 'physical' || action.startsWith('physical_proposed') || label.includes('físico')) {
        systemClass = 'system-physical';
        icon = '📋';
      } else if (action === 'created' || label.includes('creado') || label.includes('registrad')) {
        systemClass = 'system-created';
        icon = '🆕';
      }

      const systemTitle = step.label || (action === 'resuelto_soporte' ? 'Resolución técnica' : (action === 'devuelto_soporte' ? 'Observaciones de retorno' : (action === 'retomado' ? 'Caso reasignado' : action)));
      const stepPhotos = Array.isArray(step.photos) ? step.photos : (Array.isArray(step.evidencePhotos) ? step.evidencePhotos : (step.photo ? [step.photo] : []));
      items.push(`
        <div class="chat-bubble system ${systemClass}">
          <div class="chat-system-card-head">
            <span class="chat-system-title"><strong>${orderEscape(systemTitle)}</strong>${step.byName ? ` <span class="chat-system-author">por <strong>${orderEscape(step.byName)}</strong></span>` : ''}</span>
            ${atStr ? `<small class="chat-system-time">${orderEscape(atStr)}</small>` : ''}
          </div>
          ${step.note ? `<div class="chat-system-note">${orderEscape(step.note)}</div>` : ''}
          ${stepPhotos.length ? `
            <div class="chat-system-photos">
              ${stepPhotos.map(ph => `
                <img src="${orderEscape(ph)}" class="chat-bubble-photo-thumb" onclick="openEvidenceGallery(['${orderEscape(ph)}'], 0)" alt="Evidencia" title="Clic para ampliar evidencia">
              `).join('')}
            </div>
          ` : ''}
        </div>
      `);
    }
  }

  if (!items.length) {
    return `<div style="text-align:center;padding:24px 12px;color:#94a3b8;font-size:12px;">Inicia la conversación escribiendo a continuación.</div>`;
  }

  return items.join('');
}

function renderOrderFooterActions(order) {
  if (order.detailKind !== 'network') {
    return `
      <div class="order-report-footer-actions">
        <div class="footer-actions-left"></div>
        <div class="footer-actions-right">
          <button type="button" class="btn bgh" onclick="requestCloseOrderReport()">Cerrar</button>
        </div>
      </div>
    `;
  }

  const currentUser = getCurrentUser();
  const isSoporte = userHasRole('soporte');
  const isAtencion = userHasRole('atencion_clientes');
  const isAdmin = userHasRole('administrador', 'admin');
  const isCompleted = order.status === 'completada';
  const isUnresolvablePending = order.status === 'no_realizado';
  const rowReported = isCompleted || isUnresolvablePending;
  const isSentToAttention = isNetworkSupportToAttention(order);

  const isCreator = typeof isOrderCreator === 'function' ? isOrderCreator(order, currentUser) : (
    Boolean(currentUser && (
      (order.createdById && String(order.createdById).trim() === String(currentUser.id).trim()) ||
      (order.createdByUsername && String(order.createdByUsername).toLowerCase().trim() === String(currentUser.username || '').toLowerCase().trim()) ||
      (order.createdByName && String(order.createdByName).toLowerCase().trim() === String(currentUser.name || '').toLowerCase().trim())
    ))
  );

  let canReopen = false;
  if (isCompleted) {
    canReopen = isAdmin || isCreator || (isSentToAttention ? isSoporte : isAtencion);
  }

  const isAssignedToOther = (order.assignedUserId || order.assignedUserName) && !isOrderAssignedToUser(order, currentUser);
  const isCheckingByOther = order.reviewOpenedById && order.reviewOpenedById !== currentUser.id;
  const assignedArea = typeof getOrderAssignedAreaRole === 'function' ? getOrderAssignedAreaRole(order) : '';
  const targetArea = assignedArea || (isSentToAttention ? 'atencion_clientes' : 'soporte');
  const belongsToAttention = targetArea === 'atencion_clientes';
  const allowedRoleToRetake = isAdmin || (belongsToAttention
    ? (isAtencion && !isSoporte)
    : (isSoporte && !isAtencion));
  const canRetake = typeof canUserRetakeNetworkOrder === 'function'
    ? canUserRetakeNetworkOrder(order, currentUser)
    : (!rowReported && allowedRoleToRetake && (isAssignedToOther || isCheckingByOther || !order.assignedUserId));

  const closureStatus = getOrderClosureStatus(order);
  const physStatus = getPhysicalDerivationStatus(order);
  const sentPhysicalInfo = getOrderSentToPhysicalInfo(order);
  const canDeclareUnres = canRoleDeclareUnresolvable(order);
  const canConfirmUnres = canRoleConfirmUnresolvable(order);

  let physicalActionHtml = '';
  if (!isCompleted) {
    if (physStatus.pending) {
      const canConfirmPhys = physStatus.proposedBy === 'soporte' ? (isAtencion || isAdmin) : (isSoporte || isAdmin);
      const targetHint = physStatus.targetType === 'torre'
        ? (physStatus.targetName ? ` · Torre: ${physStatus.targetName}` : ' · Torre')
        : (physStatus.targetName ? ` · Pueblo: ${physStatus.targetName}` : ' · Pueblo');
      if (canConfirmPhys) {
        physicalActionHtml = `
          <button type="button" class="btn net-btn-physical net-btn-physical-confirm" onclick="confirmSendNetworkToPhysical('${order.id}')" title="Confirmar acuerdo para enviar a Detalles Físicos (${orderEscape(physStatus.targetType === 'torre' ? 'Torre' : 'Pueblo')})">
            <svg class="btn-action-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Aceptar pase a Físicos
          </button>
          <button type="button" class="btn net-btn-unresolvable" onclick="rejectSendNetworkToPhysical('${order.id}')" title="Mantener este caso en Detalles de Red">
            Rechazar pase
          </button>
        `;
      } else {
        physicalActionHtml = `
          <span class="closure-badge waiting" style="background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe;">Pase a Físicos propuesto${orderEscape(targetHint)} · Espera acuerdo</span>
        `;
      }
    } else {
      physicalActionHtml = `
        <button type="button" class="btn net-btn-physical" onclick="openInsertPhysicalRecordModal('${order.id}')" title="Proponer o registrar un detalle físico en pueblo o torre vinculado a este caso">
          <svg class="btn-action-svg" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> Registrar detalle físico
        </button>
      `;
    }
  }

  let unresolvableActionHtml = '';
  if (!isCompleted && !isUnresolvablePending && canDeclareUnres) {
    unresolvableActionHtml = `
      <button type="button" class="btn net-btn-unresolvable" onclick="openUnresolvableNetworkModal('${order.id}')" title="Notificar como no realizable (la otra parte deberá confirmar)">
        <svg class="btn-action-svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> No realizable
      </button>
    `;
  }

  let closureButtonsHtml = '';
  if (isCompleted) {
    closureButtonsHtml = `
      ${sentPhysicalInfo.sent ? renderSentToPhysicalBadge(order, { showTarget: true }) : ''}
      <span class="closure-badge completed">Concluido por ambas partes</span>
      ${canReopen ? `
        <button type="button" class="btn order-reopen-action" style="min-height:34px;padding:0 14px;font-size:12px;font-weight:800;gap:6px;" onclick="reopenCompletedWO('${order.id}')" title="Reabrir detalle para nueva atención">
          ${orderActionIcon('reopen')} Reabrir detalle
        </button>
      ` : ''}
    `;
  } else if (isUnresolvablePending) {
    if (canConfirmUnres) {
      closureButtonsHtml = `
        <button type="button" class="btn net-btn-return" onclick="openReturnNetworkModal('${order.id}')" title="Devolver caso con observaciones para continuar la atención">
          <svg class="btn-action-svg" viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg> Devolver
        </button>
        <button type="button" class="btn net-btn-confirm" style="background:linear-gradient(135deg,#dc2626,#b91c1c);border-color:#b91c1c;" onclick="confirmNetworkUnresolvableConcluded('${order.id}')" title="Confirmar que no se puede realizar y concluir el caso">
          <svg class="btn-action-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Confirmar no realizable
        </button>
      `;
    } else {
      closureButtonsHtml = `
        <span class="closure-badge waiting" style="background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;">No realizable enviado · Espera a ${isSentToAttention ? 'Soporte' : 'Atención'}</span>
      `;
    }
  } else {
    // REGLA INSTITUCIONAL:
    // Si el detalle fue asignado a Atención (isSentToAttention):
    //   - Atención manda a concluir.
    //   - Soporte no puede retomar ni enviar a concluir; solo confirma y cierra una vez que Atención lo envió.
    // Si el detalle fue asignado a Soporte (!isSentToAttention):
    //   - Soporte manda a concluir.
    //   - Atención no puede retomar ni enviar a concluir; solo confirma satisfacción y cierra una vez que Soporte lo envió.
    if (isSentToAttention) {
      if (closureStatus.attentionConfirmed || order.status === 'resuelto_soporte') {
        if (isSoporte || isAdmin) {
          closureButtonsHtml = `
            <button type="button" class="btn net-btn-return" onclick="openReturnNetworkModal('${order.id}')" title="Devolver caso a Atención a clientes con observaciones">
              <svg class="btn-action-svg" viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg> Devolver
            </button>
            <button type="button" class="btn net-btn-confirm" onclick="confirmTwoPartyClosure('${order.id}')" title="Confirmar solución y concluir caso formalmente">
              <svg class="btn-action-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Confirmar y cerrar
            </button>
          `;
        } else {
          closureButtonsHtml = `
            <span class="closure-badge waiting">Enviado a concluir · Espera a Soporte</span>
          `;
        }
      } else {
        if (isAtencion || isAdmin) {
          closureButtonsHtml = `
            <button type="button" class="btn net-btn-resolve" onclick="proposeTwoPartyClosure('${order.id}')" title="Mandar a concluir este caso a Soporte técnico">
              <svg class="btn-action-svg" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> Mandar a concluir
            </button>
          `;
        } else {
          closureButtonsHtml = `
            <span class="closure-badge waiting">En proceso por Atención a clientes</span>
          `;
        }
      }
    } else {
      if (closureStatus.supportConfirmed || order.status === 'resuelto_soporte') {
        if (isAtencion || isAdmin) {
          closureButtonsHtml = `
            <button type="button" class="btn net-btn-return" onclick="openReturnNetworkModal('${order.id}')" title="Devolver reporte a Soporte técnico con observaciones">
              <svg class="btn-action-svg" viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg> Devolver
            </button>
            <button type="button" class="btn net-btn-confirm" onclick="confirmTwoPartyClosure('${order.id}')" title="Confirmar satisfacción del cliente y concluir caso">
              <svg class="btn-action-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Confirmar y cerrar
            </button>
          `;
        } else {
          closureButtonsHtml = `
            <span class="closure-badge waiting">Cierre propuesto · Espera a Atención</span>
          `;
        }
      } else {
        if (isSoporte || isAdmin) {
          closureButtonsHtml = `
            <button type="button" class="btn net-btn-resolve" onclick="proposeTwoPartyClosure('${order.id}')" title="Registrar solución técnica y mandar a concluir">
              <svg class="btn-action-svg" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> Mandar a concluir
            </button>
          `;
        } else {
          closureButtonsHtml = `
            <span class="closure-badge waiting">En atención por Soporte técnico</span>
          `;
        }
      }
    }
  }

  return `
    <div class="order-report-footer-actions">
      <div class="footer-actions-left">
        ${canRetake ? `
          <button type="button" class="btn net-btn-retake" onclick="takeOverAndJoinChat('${order.id}')" title="Asignarme la atención de este caso">
            <svg class="btn-action-svg" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg> Retomar caso
          </button>
        ` : ''}
        ${physicalActionHtml}
        ${unresolvableActionHtml}
      </div>
      <div class="footer-actions-right">
        ${closureButtonsHtml}
        <button type="button" class="btn bgh net-btn-close-chat" onclick="requestCloseOrderReport()" title="Cerrar ventana">Cerrar</button>
      </div>
    </div>
  `;
}

async function sendOrderChatMessage(orderId) {
  let order = (state.workOrders || []).find(x => x.id === orderId && !x.deletedAt);
  if (!order && typeof findOrFetchWorkOrder === 'function') {
    order = await findOrFetchWorkOrder(orderId);
  }
  if (!order) return notify('No se encontró el detalle.', 'err');

  // REGLA: mientras el detalle esté concluido no se puede seguir conversando hasta que se vuelva a abrir
  if (order.status === 'completada') {
    return notify('El detalle está concluido. Debe reabrirse para continuar la conversación.', 'warn');
  }

  const currentUser = getCurrentUser();
  if (typeof isUserInCase === 'function' && !isUserInCase(order, currentUser)) {
    return notify('Solo los involucrados en este caso pueden enviar mensajes. Puedes presionar "Retomar caso" para participar.', 'warn');
  }

  const input = document.getElementById('order-chat-input');
  const text = (input?.value || '').trim();
  const photo = orderChatAttachedPhoto || '';

  if (!text && !photo) {
    if (input) input.focus();
    return notify('Por favor escribe un mensaje para enviar.', 'warn');
  }

  const userName = currentUser.name || currentUser.username || 'Usuario';
  const userRole = currentUser.role || (userHasRole('soporte') ? 'soporte' : (userHasRole('atencion_clientes') ? 'atencion_clientes' : 'administrador'));
  const now = new Date().toISOString();

  const msgEntry = {
    id: gid('cmsg'),
    action: 'chat_message',
    label: 'Mensaje',
    note: text,
    at: now,
    byId: currentUser.id || '',
    byUserId: currentUser.id || '',
    byName: userName,
    byRole: userRole,
    photos: photo ? [photo] : []
  };

  order.followUps = [...(Array.isArray(order.followUps) ? order.followUps : []), msgEntry].slice(-60);
  order.updatedAt = now;
  order.updatedById = currentUser.id || '';

  if (order.status === 'resuelto_soporte' || order.status === 'devuelto_soporte' || order.status === 'pendiente') {
    order.status = 'en_revision';
  }

  if (!order.reviewOpenedById) {
    order.reviewOpenedById = currentUser.id || '';
    order.reviewOpenedByName = userName;
    order.reviewOpenedAt = now;
  }

  if (input) input.value = '';
  orderChatAttachedPhoto = '';
  const preview = document.getElementById('order-chat-photo-preview');
  if (preview) {
    preview.style.display = 'none';
    preview.innerHTML = '';
  }

  updateOrderChatLive(order);
  renderWOs();

  setUpdatedAudit(order, 'envió mensaje en detalle de red');
  const auditStart = Array.isArray(state.auditLog) ? state.auditLog.length : 0;
  const ok = await saveRecordWithAudit('workOrders', order, auditStart);

  if (ok) {
    try {
      if (typeof broadcastNetworkOrderChange === 'function') {
        broadcastNetworkOrderChange(order, 'chat_message', {
          messageId: msgEntry.id,
          messageText: text || (photo ? 'Imagen adjunta' : ''),
          hasPhoto: !!photo,
          senderName: userName,
          senderId: currentUser.id || '',
          senderRole: userRole
        });
      }
    } catch (e) {
      console.warn('broadcast error:', e);
    }
  }

  const activeInput = document.getElementById('order-chat-input');
  if (activeInput) activeInput.focus();
}

function setOrderChatAttachedPhoto(dataUrl) {
  if (!dataUrl) return;
  orderChatAttachedPhoto = dataUrl;
  const preview = document.getElementById('order-chat-photo-preview');
  if (preview) {
    preview.style.display = 'flex';
    preview.innerHTML = `
      <div style="position:relative;display:inline-block;">
        <img src="${orderChatAttachedPhoto}" style="max-height:60px;max-width:90px;border-radius:6px;border:1px solid #cbd5e1;object-fit:cover;cursor:zoom-in;" onclick="openEvidenceGallery([orderChatAttachedPhoto], 0)" title="Clic para ampliar">
        <button type="button" onclick="removeOrderChatAttachedPhoto()" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;background:#ef4444;color:#fff;border:none;border-radius:50%;cursor:pointer;font-size:11px;display:grid;place-items:center;">✕</button>
      </div>
      <span style="font-size:11px;color:#64748b;">Imagen adjunta lista para enviar con el mensaje</span>
    `;
  }
}

async function attachOrderChatImageFile(file, fromPaste = false) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    return notify('Por favor selecciona un archivo de imagen válido.', 'warn');
  }
  try {
    let dataUrl = '';
    if (typeof compressWOEvidenceImage === 'function') {
      dataUrl = await compressWOEvidenceImage(file);
    }
    if (!dataUrl) {
      dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target?.result || '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    if (dataUrl) {
      setOrderChatAttachedPhoto(dataUrl);
      if (fromPaste) notify('Imagen pegada lista para enviar en el chat.', 'ok');
      document.getElementById('order-chat-input')?.focus();
    }
  } catch (err) {
    notify('No se pudo adjuntar la imagen.', 'err');
  }
}

function handleOrderChatFileSelect(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  void attachOrderChatImageFile(file, false);
  if (event?.target) event.target.value = '';
}

function removeOrderChatAttachedPhoto() {
  orderChatAttachedPhoto = '';
  const fileInput = document.getElementById('order-chat-file');
  if (fileInput) fileInput.value = '';
  const preview = document.getElementById('order-chat-photo-preview');
  if (preview) {
    preview.style.display = 'none';
    preview.innerHTML = '';
  }
}

async function takeOverAndJoinChat(orderId) {
  await takeOverNetworkOrder(orderId);
  openOrderTechnicianReport(orderId);
}

async function proposeTwoPartyClosure(orderId) {
  let order = (state.workOrders || []).find(x => x.id === orderId && !x.deletedAt);
  if (!order && typeof findOrFetchWorkOrder === 'function') {
    order = await findOrFetchWorkOrder(orderId);
  }
  if (!order) return notify('No se encontró el detalle.', 'err');

  const currentUser = getCurrentUser();
  const isSoporte = userHasRole('soporte');
  const isAtencion = userHasRole('atencion_clientes');
  const isAdmin = userHasRole('administrador', 'admin');
  const isSentToAttention = isNetworkSupportToAttention(order);

  if (isSentToAttention) {
    if (!isAtencion && !isAdmin) {
      return notify('Acción restringida: Este detalle está asignado a Atención a clientes. Solo Atención puede mandar a concluir.', 'warn');
    }
    const note = await askReasonPrompt({
      title: 'Mandar a concluir caso',
      message: 'Indica el motivo o confirmación para mandar a concluir este caso a Soporte técnico:',
      placeholder: 'Ej. Cliente contactado, servicio restablecido y validado...',
      confirmText: 'Mandar a concluir',
      cancelText: 'Cancelar',
      initialValue: ''
    });
    if (!note || !note.trim()) return;

    const now = new Date().toISOString();
    order.status = 'resuelto_soporte';
    order.updatedAt = now;
    order.updatedById = currentUser.id || '';
    order.attentionSolvedAt = now;
    order.attentionSolvedById = currentUser.id || '';
    order.attentionSolvedByName = currentUser.name || currentUser.username || 'Atención a clientes';

    appendSharedNetworkFollowUp(
      order,
      'closure_proposed_atencion',
      'Conclusión enviada por Atención a clientes',
      note.trim()
    );

    setUpdatedAudit(order, 'envió a concluir detalle de red');
    updateOrderChatLive(order);
    renderWOs();

    const auditStart = Array.isArray(state.auditLog) ? state.auditLog.length : 0;
    await saveRecordWithAudit('workOrders', order, auditStart);

    try {
      if (typeof broadcastNetworkOrderChange === 'function') {
        broadcastNetworkOrderChange(order, 'resolved');
      }
    } catch (e) { }

    notify('Caso enviado a concluir. En espera de confirmación de Soporte técnico.', 'ok');
    updateOrderChatLive(order);
    renderWOs();
    if (_closingChatAfterResolution) {
      _closingChatAfterResolution = false;
      closeOrderReportModalDirectly();
    }
  } else {
    if (!isSoporte && !isAdmin) {
      return notify('Acción restringida: Este reporte está en manos de Soporte técnico. Solo Soporte puede mandar a concluir.', 'warn');
    }
    openResolveNetworkModal(orderId);
  }
}

async function confirmTwoPartyClosure(orderId) {
  let order = (state.workOrders || []).find(x => x.id === orderId && !x.deletedAt);
  if (!order && typeof findOrFetchWorkOrder === 'function') {
    order = await findOrFetchWorkOrder(orderId);
  }
  if (!order) return notify('No se encontró el detalle.', 'err');

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || 'Usuario';
  const isSoporte = userHasRole('soporte');
  const isAtencion = userHasRole('atencion_clientes');

  const confirmed = await askConfirmation({
    title: '¿Confirmar cierre del caso?',
    message: 'Se confirmará la conformidad del servicio y el detalle quedará oficialmente concluido por ambas partes.',
    confirmText: 'Sí, confirmar y cerrar',
    cancelText: 'Cancelar',
    tone: 'ok'
  });
  if (!confirmed) return;

  const now = new Date().toISOString();
  order.status = 'completada';
  order.completedAt = now;
  order.updatedAt = now;
  order.updatedById = currentUser.id || '';

  const confirmAction = isSoporte ? 'closure_confirmed_soporte' : 'closure_confirmed_atencion';
  const roleLabel = isSoporte ? 'Soporte técnico' : (isAtencion ? 'Atención a clientes' : 'Administración');

  appendSharedNetworkFollowUp(
    order,
    confirmAction,
    `Cierre confirmado por ${roleLabel}`,
    `${userName} confirmó la conformidad del servicio. Caso concluido por ambas partes.`
  );

  setUpdatedAudit(order, 'concluyó detalle de red por mutuo acuerdo');
  updateOrderChatLive(order);
  renderWOs();

  const auditStart = Array.isArray(state.auditLog) ? state.auditLog.length : 0;
  const saved = await saveRecordWithAudit('workOrders', order, auditStart);
  if (!saved) return notify('No se pudo guardar el cierre. Intente nuevamente.', 'err');

  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(order, 'confirmed');
    }
  } catch (e) { }

  notify('Detalle concluido satisfactoriamente por ambas partes.', 'ok');
  updateOrderChatLive(order);
  renderWOs();
  if (_closingChatAfterResolution) {
    _closingChatAfterResolution = false;
    closeOrderReportModalDirectly();
  }
}

function updateOrderChatLive(updatedOrder) {
  if (!updatedOrder) return;
  let targetOrder = updatedOrder;
  const existing = (state.workOrders || []).find(x => x.id === updatedOrder.id);
  if (existing && existing !== updatedOrder) {
    Object.assign(existing, updatedOrder);
    targetOrder = existing;
  }
  const modal = document.getElementById('order-tech-report-mo');
  if (modal && modal.classList.contains('open') && currentOrderReportId === targetOrder.id) {
    const messagesBox = document.getElementById('order-chat-messages');
    if (messagesBox) {
      messagesBox.innerHTML = renderOrderChatMessagesHtml(targetOrder);
      messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    const pill = modal.querySelector('.order-chat-status-pill');
    if (pill) {
      pill.innerHTML = getOrderChatStatusBadgeHtml(targetOrder);
    }

    const composerWrap = modal.querySelector('.order-chat-composer-wrap');
    if (composerWrap) {
      const currentUser = getCurrentUser();
      const shouldHaveActiveInput = targetOrder.status !== 'completada' && isUserInCase(targetOrder, currentUser);
      const hasActiveInput = !!composerWrap.querySelector('#order-chat-input');
      if (!shouldHaveActiveInput || !hasActiveInput) {
        composerWrap.innerHTML = renderOrderChatComposerInnerHtml(targetOrder);
        if (shouldHaveActiveInput && orderChatAttachedPhoto) {
          setOrderChatAttachedPhoto(orderChatAttachedPhoto);
        }
      }
    }

    const footerEl = modal.querySelector('.order-report-footer-actions');
    if (footerEl) {
      footerEl.outerHTML = renderOrderFooterActions(targetOrder);
    }

    const essentialStatusEl = modal.querySelector('.order-report-essential-bar .order-report-status');
    if (essentialStatusEl) {
      const statusMeta = getOrderStatusMeta(targetOrder);
      essentialStatusEl.className = `order-report-status ${targetOrder.status === 'completada' ? 'is-completed' : (targetOrder.status === 'resuelto_soporte' ? 'is-resolving' : (targetOrder.status === 'devuelto_soporte' ? 'is-returned' : (targetOrder.status === 'no_realizado' ? 'is-failed' : 'is-pending')))}`;
      essentialStatusEl.textContent = statusMeta.label;
      const statusWrap = essentialStatusEl.parentElement;
      if (statusWrap) {
        statusWrap.querySelectorAll('.order-sent-physical-badge').forEach(el => el.remove());
        const sentHtml = renderSentToPhysicalBadge(targetOrder, { showTarget: true });
        if (sentHtml) essentialStatusEl.insertAdjacentHTML('afterend', sentHtml);
      }
    }
    const headMetaP = modal.querySelector('.order-report-head-main p');
    if (headMetaP) {
      headMetaP.querySelectorAll('.order-sent-physical-badge').forEach(el => el.remove());
      const headSentHtml = renderSentToPhysicalBadge(targetOrder, { compact: true });
      if (headSentHtml) headMetaP.insertAdjacentHTML('beforeend', headSentHtml);
    }

    const essentialItems = modal.querySelectorAll('.order-report-essential-bar .essential-bar-item');
    if (essentialItems[3]) {
      const assignedDiv = essentialItems[3].querySelector('div');
      if (assignedDiv) {
        assignedDiv.innerHTML = targetOrder.assignedUserName
          ? renderUserColorChip(targetOrder.assignedUserName, targetOrder.assignedUserId)
          : '<span style="color:#64748b;font-weight:600;font-size:12px;">Sin asignar</span>';
      }
    }
  }
}

function formatOrderDate(dateVal) {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return String(dateVal);
  }
}

function formatOrderTime(dateVal) {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

function getOrderReopenCount(order) {
  if (!order) return 0;
  let count = Number(order.reopenCount) || 0;
  if (Array.isArray(order.followUps)) {
    const followUpsCount = order.followUps.filter(f => f && (f.action === 'reabierto' || f.action === 'reopened')).length;
    count = Math.max(count, followUpsCount);
  }
  if (count === 0 && (order.isReopened || order.reopenedAt)) {
    count = 1;
  }
  return count;
}

function isOrderReopened(order) {
  return getOrderReopenCount(order) > 0;
}

function getOrderUnreadMessagesCount(order, actor = getCurrentUser()) {
  if (!order || order.detailKind !== 'network' || !Array.isArray(order.followUps)) return 0;
  const actorId = String(actor?.id || '').toLowerCase();
  const actorName = normalizeName(actor?.name || actor?.username || '');
  let lastReadStr = '';
  try {
    lastReadStr = localStorage.getItem('order_chat_read_' + (actor?.id || 'anon') + '_' + order.id) || '';
  } catch (e) { }
  const lastReadTime = lastReadStr ? new Date(lastReadStr).getTime() : 0;

  return order.followUps.filter(f => {
    if (f.action !== 'chat_message') return false;
    const isMine = (f.byId && String(f.byId).toLowerCase() === actorId) || (normalizeName(f.byName || '') === actorName);
    if (isMine) return false;
    const msgTime = f.at ? new Date(f.at).getTime() : 0;
    return msgTime > lastReadTime;
  }).length;
}

function markOrderChatAsRead(orderId, actor = getCurrentUser()) {
  if (!orderId) return;
  try {
    localStorage.setItem('order_chat_read_' + (actor?.id || 'anon') + '_' + orderId, new Date().toISOString());
  } catch (e) { }
}

function ensureMatchingDetailKind(order) {
  if (!order || !order.detailKind) return;
  const targetKind = order.detailKind === 'network' ? 'network' : 'physical';
  if (targetKind !== activeOrderDetailKind) {
    if (typeof selectOrderDetailKind === 'function') {
      selectOrderDetailKind(targetKind);
    } else {
      activeOrderDetailKind = targetKind;
      if (typeof updateOrderDetailTabs === 'function') updateOrderDetailTabs();
    }
  }
}

function ensureOrderVisibleInTable(order) {
  if (!order) return;
  let filtersChanged = false;

  // 1. Limpiar búsqueda de texto si el filtro oculta este detalle
  const searchEl = document.getElementById('wo-search');
  if (searchEl && searchEl.value.trim()) {
    const q = (typeof normalizeName === 'function' ? normalizeName(searchEl.value.trim()) : searchEl.value.trim().toLowerCase());
    const orderFolio = typeof getOrderFolio === 'function' ? getOrderFolio(order) : (order.folio || '');
    const tokens = [
      order.id,
      orderFolio,
      order.clientName,
      order.title,
      order.description,
      order.desc,
      order.town,
      order.nodeName,
      order.nodeCode
    ].filter(Boolean).map(s => typeof normalizeName === 'function' ? normalizeName(String(s)) : String(s).toLowerCase());
    const matchesSearch = tokens.some(t => t.includes(q));
    if (!matchesSearch) {
      searchEl.value = '';
      filtersChanged = true;
    }
  }

  // 2. Filtro de estado
  if (activeOrderFilters.status && activeOrderFilters.status.size > 0) {
    if (!activeOrderFilters.status.has(order.status)) {
      activeOrderFilters.status.clear();
      filtersChanged = true;
    }
  }

  // 3. Filtro de fecha
  if (activeOrderFilters.date && activeOrderFilters.date.size > 0) {
    activeOrderFilters.date.clear();
    filtersChanged = true;
  }

  // 4. Filtro "Mis detalles"
  if (filterOnlyMyAssignments) {
    const currentActor = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    const isPendingForMe = typeof isOrderPendingForUser === 'function'
      ? isOrderPendingForUser(order, currentActor)
      : (typeof isOrderAssignedToUser === 'function' && isOrderAssignedToUser(order, currentActor));
    if (!isPendingForMe) {
      filterOnlyMyAssignments = false;
      const myBtn = document.getElementById('wo-filter-my-assignments');
      if (myBtn) myBtn.classList.remove('is-active');
      filtersChanged = true;
    }
  }

  // 5. Filtro de asignado
  if (activeOrderFilters.assignee && activeOrderFilters.assignee.size > 0) {
    const matchesAssignee = [...activeOrderFilters.assignee].some(selId => {
      if (selId === 'unassigned') return !order.assignedUserId && !order.assignedUserName;
      return (order.assignedUserId && String(order.assignedUserId).includes(selId)) ||
        (order.assignedUserName && normalizeName(order.assignedUserName).includes(normalizeName(selId)));
    });
    if (!matchesAssignee) {
      activeOrderFilters.assignee.clear();
      filtersChanged = true;
    }
  }

  // 6. Filtro de zona / pueblo
  if (activeOrderFilters.zone && activeOrderFilters.zone.size > 0) {
    const orderZone = order.zoneId || order.region || (typeof getOrderNode === 'function' ? getOrderNode(order)?.zoneCode : '');
    if (!orderZone || !activeOrderFilters.zone.has(orderZone)) {
      activeOrderFilters.zone.clear();
      filtersChanged = true;
    }
  }

  // 7. Filtro de prioridad
  if (activeOrderFilters.priority && activeOrderFilters.priority.size > 0) {
    if (!activeOrderFilters.priority.has(order.priority)) {
      activeOrderFilters.priority.clear();
      filtersChanged = true;
    }
  }

  // 8. Filtro de categoría
  if (activeOrderFilters.category && activeOrderFilters.category.size > 0) {
    if (!activeOrderFilters.category.has(order.category)) {
      activeOrderFilters.category.clear();
      filtersChanged = true;
    }
  }

  // 9. Filtro de creador
  if (activeOrderFilters.creator && activeOrderFilters.creator.size > 0) {
    const orderCreator = order.createdById || order.createdBy;
    if (!orderCreator || !activeOrderFilters.creator.has(orderCreator)) {
      activeOrderFilters.creator.clear();
      filtersChanged = true;
    }
  }

  // 10. Filtro de tipo de visita
  if (activeOrderFilters.type && activeOrderFilters.type.size > 0) {
    const orderType = order.visitType || order.type;
    if (!orderType || !activeOrderFilters.type.has(orderType)) {
      activeOrderFilters.type.clear();
      filtersChanged = true;
    }
  }

  // Garantizar que la orden esté en state.workOrders y sea visible
  if (!Array.isArray(state.workOrders)) state.workOrders = [];
  state.workOrders = [order, ...state.workOrders.filter(w => w.id !== order.id)];
  _currentlyLoadedNotificationOrder = order;
  orderCurrentPage = 1;

  if (filtersChanged) {
    if (typeof updateOrderFilterButtons === 'function') updateOrderFilterButtons();
    if (typeof renderActiveOrderFilters === 'function') renderActiveOrderFilters();
    if (typeof renderOrderFilterMenus === 'function') renderOrderFilterMenus();
  }
  if (typeof renderWOs === 'function') renderWOs();
  if (typeof renderOrdersTable === 'function') renderOrdersTable();
}

async function loadNotificationOrder(orderId) {
  if (!orderId) return null;
  const cleanId = String(orderId).trim();
  const cleanLower = cleanId.toLowerCase();
  const stripPrefix = s => String(s || '').toLowerCase().replace(/^(red|det|new)-/i, '');
  const cleanStripped = stripPrefix(cleanId);
  const matchesTarget = item => {
    if (!item || item.deletedAt) return false;
    const iId = String(item.id || '').toLowerCase();
    const iFolio = String(item.folio || (typeof getOrderFolio === 'function' ? getOrderFolio(item) : '')).toLowerCase();
    return iId === cleanLower || iFolio === cleanLower ||
      (cleanStripped && stripPrefix(iId) === cleanStripped) ||
      (cleanStripped && stripPrefix(iFolio) === cleanStripped);
  };

  const existing = (state.workOrders || []).find(matchesTarget);
  if (existing) {
    _currentlyLoadedNotificationOrder = existing;
    if (typeof ensureMatchingDetailKind === 'function') ensureMatchingDetailKind(existing);
    if (typeof ensureOrderVisibleInTable === 'function') ensureOrderVisibleInTable(existing);
    return existing;
  }
  try {
    const data = await fetchDataPage('operations', { id: cleanId, limit: 1, offset: 0 });
    let order = (data.workOrders || []).find(matchesTarget) || (data.workOrders || [])[0];
    if ((!order || order.deletedAt) && cleanStripped && cleanStripped !== cleanLower) {
      try {
        const fallbackData = await fetchDataPage('operations', { id: cleanStripped, limit: 1, offset: 0 });
        order = (fallbackData.workOrders || []).find(matchesTarget) || (fallbackData.workOrders || [])[0];
      } catch (e) { }
    }
    if (!order || order.deletedAt) {
      notify('Este detalle ya no está disponible. Puedes revisar los demás en la lista.', 'warn');
      return null;
    }
    _currentlyLoadedNotificationOrder = order;
    state.workOrders = [order, ...(state.workOrders || []).filter(item => item.id !== order.id)];
    if (typeof ensureMatchingDetailKind === 'function') ensureMatchingDetailKind(order);
    if (typeof ensureOrderVisibleInTable === 'function') ensureOrderVisibleInTable(order);
    return order;
  } catch (error) {
    notify(typeof describeSyncError === 'function' ? describeSyncError(error) : 'No se pudo cargar el detalle. Intenta de nuevo.', 'err');
    return null;
  }
}

async function openOrderTechnicianReport(orderId) {
  let order = await loadNotificationOrder(orderId);
  if (!order) return;
  if (typeof markNotificationReadByOrderId === 'function') {
    markNotificationReadByOrderId(orderId);
  }
  await markWOViewedOnOpen(order);
  order = (state.workOrders || []).find(item => item.id === orderId && !item.deletedAt) || order;
  const currentActor = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
  if (typeof markOrderChatAsRead === 'function') {
    markOrderChatAsRead(order.id, currentActor);
    const unreadDot = document.querySelector(`tr[data-order-id="${order.id}"] .net-unread-chat-dot`);
    if (unreadDot) unreadDot.remove();
  }
  currentOrderReportId = order.id;
  selectedOrderRowId = String(order.id);
  selectOrderRow(order.id);
  const rowEl = document.querySelector(`tr[data-order-id="${order.id}"]`);
  if (rowEl) {
    rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
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
    modal.addEventListener('click', event => { if (event.target === modal) requestCloseOrderReport(); });
    modal.addEventListener('netops:before-modal-close', event => {
      if (!pendingOrderReviewDecisionId || currentOrderReportId !== pendingOrderReviewDecisionId) return;
      event.preventDefault();
      requestCloseOrderReport();
    });
  }
  const card = document.getElementById('order-tech-report-card');
  card.classList.toggle('is-completed-report', completed);

  let bodyContent = '';
  const sentPhysicalInfo = order.detailKind === 'network' ? getOrderSentToPhysicalInfo(order) : { sent: false };
  if (order.detailKind === 'network') {
    // REGLA DE DETALLES DE RED:
    // El chat va al frente de inmediato con el seguimiento adjunto como eventos resaltados.
    // Los metadatos completos y las fotos van ocultos bajo "Ver todos los detalles y fotos".
    bodyContent = `
      <div class="order-chat-scroll-body">
      <div class="order-report-essential-bar">
        <div class="essential-bar-item">
          <small>CLIENTE</small>
          <strong>${orderEscape(order.clientName || 'Sin cliente')}</strong>
          ${order.clientPhone ? `<span class="essential-phone">${orderEscape(order.clientPhone)}</span>` : ''}
        </div>
        <div class="essential-bar-item">
          <small>LUGAR</small>
          <strong>${orderEscape(getOrderPlace(order))}</strong>
        </div>
        <div class="essential-bar-item">
          <small>ESTADO</small>
          <span class="order-report-status ${order.status === 'completada' ? 'is-completed' : (order.status === 'resuelto_soporte' ? 'is-resolving' : (order.status === 'devuelto_soporte' ? 'is-returned' : (order.status === 'no_realizado' ? 'is-failed' : 'is-pending')))}">${orderEscape(reportStatus)}</span>
          ${sentPhysicalInfo.sent ? renderSentToPhysicalBadge(order, { showTarget: true }) : ''}
        </div>
        <div class="essential-bar-item">
          <small>ASIGNADO A</small>
          <div>${order.assignedUserName ? renderUserColorChip(order.assignedUserName, order.assignedUserId) : '<span style="color:#64748b;font-weight:600;font-size:12px;">Sin asignar</span>'}</div>
        </div>
        <div class="essential-bar-item wide">
          <small>DETALLE SOLICITADO</small>
          <div class="essential-request-text"><span class="order-category-badge" style="margin-right:6px;">${orderEscape(orderCategoryLabel(getOrderCategory(order)))}</span>${orderEscape(requestedDetail)}</div>
        </div>
      </div>

      <details class="order-full-details-accordion">
        <summary class="order-full-details-summary">
          <span class="summary-toggle-title">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <strong>Ver todos los detalles técnicos y fotos</strong> (${photos.length} fotos)
          </span>
          <span class="summary-toggle-hint">Mostrar / Ocultar ▾</span>
        </summary>
        <div class="order-full-details-content">
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
          return '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' + chip + ' <span style="font-size:11px;color:#059669;font-weight:700;">Aceptado y concluido por Atención</span></div>';
        }
        if (order.status === 'resuelto_soporte') {
          return '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' + chip + ' <span style="font-size:11px;color:#d97706;font-weight:700;">En revisión de Atención</span></div>';
        }
        return chip;
      }
      if (order.status === 'no_realizado') {
        return '<span style="color:#dc2626;font-weight:600;font-size:12px;font-style:italic;">No realizable (Sin resolver)</span>';
      }
      return '<span style="color:#64748b;font-weight:600;font-size:12px;font-style:italic;">Pendiente de resolución</span>';
    })(), { raw: true })}
            ${orderReportField('calendar', 'Fecha de creación', order.createdAt ? new Date(order.createdAt).toLocaleString('es-MX') : 'Sin fecha')}
            ${order.updatedAt && order.updatedAt !== order.createdAt ? orderReportField('clock', 'Última edición', `${new Date(order.updatedAt).toLocaleString('es-MX')}${order.updatedByName ? ` por ${renderUserColorChip(order.updatedByName, order.updatedById)}` : ''}`, { raw: true }) : ''}
            ${completed ? orderReportField('calendar', 'Fecha y hora del reporte', detailDate ? new Date(detailDate).toLocaleString('es-MX') : 'Sin fecha') : ''}
            ${orderReportField('work', 'Tipo de trabajo', getOrderDisplayType(order))}
            ${orderReportField('flag', 'Prioridad', pl(order.priority || 'media'))}
            ${orderReportField('tag', 'Categoría', orderCategoryLabel(getOrderCategory(order)))}
            ${sentPhysicalInfo.sent ? orderReportField('work', 'Enviado a físicos', `${renderSentToPhysicalBadge(order, { showTarget: true })}${sentPhysicalInfo.physicalOrderFolio ? ` <span style="font-size:11px;color:#475569;font-weight:700;margin-left:4px;">(${orderEscape(sentPhysicalInfo.physicalOrderFolio)})</span>` : ''}`, { raw: true }) : ''}
      ${order.equipmentId ? orderReportField('work', 'Torre / Antena', `<button type="button" class="btn bsm bg2" onclick="openTowerMaterialModal('${order.equipmentId}')" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:3px 10px;margin-top:2px;">🗼 Ver material de torre</button>`, { raw: true }) : ''}
          </div>
          <section class="order-report-block order-report-request"><span class="order-report-field-icon">${orderReportIcon('clipboard')}</span><div><small>Detalle solicitado</small><p>${orderEscape(requestedDetail)}</p></div></section>
          ${report.solution ? `<section class="order-report-block"><small>Trabajo realizado</small><p>${orderEscape(report.solution)}</p></section>` : ''}
          ${report.observations ? `<section class="order-report-block"><small>Observaciones</small><p>${orderEscape(report.observations)}</p></section>` : ''}
          ${report.reason ? `<section class="order-report-block warning"><small>Motivo</small><p>${orderEscape(report.reason)}</p></section>` : ''}
          ${report.materialUsed ? `<section class="order-report-block"><small>Material utilizado</small><p>${orderEscape(report.materialUsed)}</p></section>` : ''}
          ${materialItems.length ? `<section class="order-report-block"><small>Materiales registrados</small><div class="order-report-materials">${materialItems.map(item => `<span><strong>${orderEscape(item.name || item.nombre || 'Material')}</strong> · ${orderEscape(item.quantity ?? item.cantidad ?? '')} ${orderEscape(item.unit || item.unidad || '')}</span>`).join('')}</div></section>` : ''}
          <div class="order-report-evidence-strip" style="margin-top:12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;padding:12px;">
            <div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Evidencias fotográficas (${photos.length})
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
              <div class="evidence-strip-empty" style="padding:8px;text-align:center;color:#94a3b8;font-size:11.5px;">Sin evidencias fotográficas adjuntas.</div>
            `}
          </div>
        </div>
      </details>

      ${renderOrderChat(order, { includeComposer: false })}
      </div>
      <div class="order-chat-fixed-bottom">
        <div class="order-chat-composer-wrap">
          ${renderOrderChatComposerInnerHtml(order)}
        </div>
        ${renderOrderFooterActions(order)}
      </div>
    `;
  } else {
    // Vista para detalles físicos de infraestructura (antenas y nodos)
    bodyContent = `
      <div class="physical-record-banner" style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #6366f1;padding:12px 14px;border-radius:10px;margin-bottom:14px;font-size:12.5px;color:#334155;display:flex;align-items:center;gap:10px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" style="flex-shrink:0;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        <div><strong>Registro de detalle físico:</strong> Este registro documenta una necesidad física en sitio o antena para su consulta y resolución en una ruta técnica posterior.</div>
      </div>
      <div class="order-report-summary">
        ${order.equipmentName ? orderReportField('work', 'Antena vinculada', `${orderEscape(order.equipmentName)} ${order.equipmentId ? `<button type="button" class="btn bsm bg2" onclick="openTowerMaterialModal('${order.equipmentId}')" style="display:inline-flex;align-items:center;gap:6px;font-size:11px;padding:2px 8px;margin-left:6px;">🗼 Material de torre</button>` : ''}`, { raw: true }) : ''}
        ${order.nodeName ? orderReportField('pin', 'Pueblo', orderEscape(order.nodeName)) : orderReportField('pin', 'Lugar', getOrderPlace(order))}
        ${orderReportField('target', 'Ubicación capturada', capturedLocation)}
        ${orderReportField('check', 'Estado', `<span class="order-report-status ${order.status === 'completada' ? 'is-completed' : 'is-pending'}">${order.status === 'completada' ? 'Completado' : 'Registro activo'}</span>`, { raw: true, className: 'status-field' })}
        ${orderReportField('user', 'Registrado por', renderUserColorChip(order.createdByName || order.createdByUsername || 'Sin registro', order.createdById), { raw: true })}
        ${orderReportField('calendar', 'Fecha de registro', order.createdAt ? new Date(order.createdAt).toLocaleString('es-MX') : 'Sin fecha')}
        ${order.updatedAt && order.updatedAt !== order.createdAt ? orderReportField('clock', 'Última edición', `${new Date(order.updatedAt).toLocaleString('es-MX')}${order.updatedByName ? ` por ${renderUserColorChip(order.updatedByName, order.updatedById)}` : ''}`, { raw: true }) : ''}
        ${orderReportField('work', 'Tipo de trabajo', getOrderDisplayType(order))}
        ${orderReportField('flag', 'Prioridad', pl(order.priority || 'media'))}
        ${orderReportField('tag', 'Categoría', orderCategoryLabel(getOrderCategory(order)))}
        ${order.originNetworkFolio ? orderReportField('tag', 'Origen de red', `<a href="/ordenes.html?detailKind=network&orderId=${encodeURIComponent(order.originNetworkOrderId || order.originNetworkFolio)}" onclick="event.preventDefault();openOrderTechnicianReport('${orderEscape(order.originNetworkOrderId || order.originNetworkFolio)}')" style="color:#2563eb;font-weight:700;text-decoration:underline;">Folio ${orderEscape(order.originNetworkFolio)}</a>`, { raw: true }) : ''}
      </div>
      <section class="order-report-block order-report-request"><span class="order-report-field-icon">${orderReportIcon('clipboard')}</span><div><small>Detalle solicitado</small><p>${orderEscape(requestedDetail)}</p></div></section>
      ${report.solution ? `<section class="order-report-block"><small>Trabajo realizado</small><p>${orderEscape(report.solution)}</p></section>` : ''}
      ${report.observations ? `<section class="order-report-block"><small>Observaciones</small><p>${orderEscape(report.observations)}</p></section>` : ''}
      ${report.reason ? `<section class="order-report-block warning"><small>Motivo</small><p>${orderEscape(report.reason)}</p></section>` : ''}
      ${report.materialUsed ? `<section class="order-report-block"><small>Material utilizado</small><p>${orderEscape(report.materialUsed)}</p></section>` : ''}
      ${renderOrderFollowUpTimeline(visibleFollowUps)}
      ${materialItems.length ? `<section class="order-report-block"><small>Materiales registrados</small><div class="order-report-materials">${materialItems.map(item => `<span><strong>${orderEscape(item.name || item.nombre || 'Material')}</strong> · ${orderEscape(item.quantity ?? item.cantidad ?? '')} ${orderEscape(item.unit || item.unidad || '')}</span>`).join('')}</div></section>` : ''}
      <div class="order-report-evidence-strip" style="margin-top:10px;">
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
          <div class="evidence-strip-empty" style="padding:8px;text-align:center;color:#94a3b8;font-size:11.5px;">Sin evidencias fotográficas adjuntas.</div>
        `}
      </div>
      ${renderOrderFooterActions(order)}
    `;
  }

  const reopenCount = typeof getOrderReopenCount === 'function' ? getOrderReopenCount(order) : ((order.isReopened || order.reopenedAt) ? 1 : 0);
  const reopenLabel = reopenCount > 1 ? `Reabierto (${reopenCount} veces)` : 'Reabierto (1 vez)';
  const reopenTitle = reopenCount > 1 ? `Detalle reabierto ${reopenCount} veces` : 'Detalle reabierto 1 vez';
  const modalHeaderTitle = (order.detailKind === 'physical')
    ? (completed ? 'Registro físico concluido' : 'Registro de detalle físico')
    : (completed ? 'Reporte del técnico' : 'Detalle de la orden');
  const headerIcon = orderReportIcon(order.detailKind === 'physical' ? 'work' : 'clipboard');

  if (card && card.classList) {
    card.classList.toggle('is-network-chat-card', order.detailKind === 'network');
  }
  card.innerHTML = `<div class="modal-head order-report-head"><div class="order-report-head-main"><span class="order-report-title-icon">${headerIcon}</span><div><h2>${modalHeaderTitle}</h2><p>${orderReportIcon('pin')}<span>${orderEscape(getOrderPlace(order))}</span><em>${orderEscape(getOrderFolio(order))}</em>${order.detailKind === 'network' && reopenCount > 0 ? `<span class="order-reopened-badge" style="margin-left:6px;" title="${reopenTitle}"><svg class="order-reopened-icon" viewBox="0 0 24 24"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg> ${reopenLabel}</span>` : ''}${sentPhysicalInfo.sent ? renderSentToPhysicalBadge(order, { compact: true }) : ''}</p></div></div><button type="button" class="order-report-close" aria-label="Cerrar" onclick="requestCloseOrderReport()"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    ${bodyContent}`;
  OM('order-tech-report-mo');

  if (order.detailKind === 'network') {
    requestAnimationFrame(() => {
      setTimeout(() => {
        card.scrollTop = 0;
        const messagesBox = document.getElementById('order-chat-messages');
        if (messagesBox) {
          messagesBox.scrollTop = messagesBox.scrollHeight;
        }
        const chatInput = document.getElementById('order-chat-input');
        if (chatInput && order.status !== 'completada') {
          chatInput.focus();
        }
      }, 50);
    });
  }
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
    wrap.innerHTML = `
      <div class="table-wrap clean">
        <table class="table order-table">
          <thead>
            <tr>
              <th class="th-col-folio">Folio</th>
              <th class="th-col-zone">Zona</th>
              <th class="th-col-place">Lugar</th>
              <th class="th-col-client">Cliente</th>
              <th class="th-col-detail">Detalle</th>
              ${activeOrderDetailKind === 'network' ? '<th class="order-th-datetime">Fecha y hora</th>' : '<th>Tipo</th>'}
              <th class="th-col-priority">Prioridad</th>
              <th class="th-col-state">Estado</th>
              <th class="th-col-action">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="9" style="text-align:center;padding:36px 16px;">
                <div class="empty-state">No hay detalles con esos filtros.</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      ${renderOrderPagination(0, 0, 0, 1)}`;
    return;
  }

  const pageMeta = window.netopsPageMeta?.operations || {};
  const isServerWindowed = !filterOnlyMyAssignments && Number.isFinite(Number(pageMeta.total)) && Number(pageMeta.total) > 0 && allRows.length <= orderRowsPerPage;
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

  const networkGroupCounts = activeOrderDetailKind === 'network'
    ? rows.reduce((acc, w) => {
      const g = getNetworkOrderTurnGroup(w).group;
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, { my_action: 0, other_area: 0, done: 0 })
    : null;
  const showTurnDividers = Boolean(
    activeOrderDetailKind === 'network' &&
    networkGroupCounts &&
    ((networkGroupCounts.my_action > 0 && (networkGroupCounts.other_area > 0 || networkGroupCounts.done > 0)) ||
      (networkGroupCounts.other_area > 0 && networkGroupCounts.done > 0) ||
      networkGroupCounts.my_action > 0 ||
      networkGroupCounts.other_area > 0)
  );
  let lastRenderedTurnGroup = '';

  wrap.innerHTML = `
    <div class="table-wrap clean">
      <table class="table order-table">
        <thead>
          <tr>
            <th class="th-col-folio">Folio</th>
            <th class="th-col-zone">Zona</th>
            <th class="th-col-place">Lugar</th>
            <th class="th-col-client">Cliente</th>
            <th class="th-col-detail">Detalle</th>
            ${activeOrderDetailKind === 'network' ? '<th class="order-th-datetime">Fecha y hora</th>' : '<th>Tipo</th>'}
            <th class="th-col-priority">Prioridad</th>
            <th class="th-col-state">Estado</th>
            <th class="th-col-action">Acción</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(w => {
    let dividerRowHtml = '';
    if (showTurnDividers) {
      const turnMeta = getNetworkOrderTurnGroup(w);
      if (turnMeta.group !== lastRenderedTurnGroup) {
        lastRenderedTurnGroup = turnMeta.group;
        const count = networkGroupCounts[turnMeta.group] || 0;
        const icon = turnMeta.group === 'my_action' ? '⚡' : (turnMeta.group === 'other_area' ? '↔' : '✓');
        const subText = turnMeta.group === 'my_action'
          ? 'Requieren respuesta o acción de tu parte'
          : (turnMeta.group === 'other_area' ? 'En atención o espera de confirmación de otra área' : 'Casos finalizados');
        dividerRowHtml = `
          <tr class="order-turn-divider-row is-${turnMeta.group}" data-turn-group="${turnMeta.group}">
            <td colspan="9">
              <div class="order-turn-divider-inner">
                <span class="order-turn-divider-pill is-${turnMeta.group}">
                  <span class="order-turn-divider-icon" aria-hidden="true">${icon}</span>
                  <strong>${orderEscape(turnMeta.label)}</strong>
                  <span class="order-turn-divider-count">${count}</span>
                </span>
                <span class="order-turn-divider-sub">${orderEscape(subText)}</span>
                <span class="order-turn-divider-line" aria-hidden="true"></span>
              </div>
            </td>
          </tr>
        `;
      }
    }
    const target = getOrderTarget(w);
    const rowReported = w.status === 'completada' || w.status === 'no_realizado';
    const rowStatus = getOrderStatusMeta(w);
    const isSoporte = userHasRole('soporte');
    const isAtencion = userHasRole('atencion_clientes');
    const isAdmin = userHasRole('administrador', 'admin');
    const currentActor = getCurrentUser();
    const isReopened = typeof isOrderReopened === 'function' ? isOrderReopened(w) : false;
    const reopenCount = typeof getOrderReopenCount === 'function' ? getOrderReopenCount(w) : (isReopened ? 1 : 0);
    const reopenLabel = reopenCount > 1 ? `Reabierto (${reopenCount} veces)` : 'Reabierto (1 vez)';
    const reopenTitle = reopenCount > 1 ? `Detalle reabierto ${reopenCount} veces` : 'Detalle reabierto 1 vez';
    const unreadChatCount = typeof getOrderUnreadMessagesCount === 'function' ? getOrderUnreadMessagesCount(w, currentActor) : 0;

    const isSentToAttention = isNetworkSupportToAttention(w);
    const isCreator = typeof isOrderCreator === 'function' ? isOrderCreator(w, currentActor) : (
      Boolean(currentActor && (
        (w.createdById && String(w.createdById).trim() === String(currentActor.id).trim()) ||
        (w.createdByUsername && String(w.createdByUsername).toLowerCase().trim() === String(currentActor.username || '').toLowerCase().trim()) ||
        (w.createdByName && String(w.createdByName).toLowerCase().trim() === String(currentActor.name || '').toLowerCase().trim())
      ))
    );
    let canReopen = false;
    if (rowReported) {
      if (isAdmin || isCreator) {
        canReopen = true;
      } else if (w.detailKind === 'network') {
        if (isSentToAttention) {
          // Requerimiento enviado por Soporte a Atención: solo Soporte puede reabrirlo
          canReopen = isSoporte;
        } else {
          // Reporte de red enviado por Atención a Soporte: solo Atención puede reabrirlo
          canReopen = isAtencion;
        }
      } else {
        canReopen = isSoporte || (isAtencion && isCreatedByAttention(w));
      }
    }

    const pendingAction = getOrderPendingUserAction(w);
    const rowIsDoneVisual = w.detailKind === 'network' ? (w.status === 'completada') : rowReported;
    let networkQuickActions = '';
    if (w.detailKind === 'network') {
      const isAssignedToOther = (w.assignedUserId || w.assignedUserName) && !isOrderAssignedToUser(w, currentActor);
      const isCheckingByOther = w.reviewOpenedById && w.reviewOpenedById !== currentActor.id;
      const assignedArea = typeof getOrderAssignedAreaRole === 'function' ? getOrderAssignedAreaRole(w) : '';
      const targetArea = assignedArea || (isSentToAttention ? 'atencion_clientes' : 'soporte');
      const belongsToAttention = targetArea === 'atencion_clientes';
      const allowedRoleToRetake = isAdmin || (belongsToAttention
        ? (isAtencion && !isSoporte)
        : (isSoporte && !isAtencion));
      const canRetake = typeof canUserRetakeNetworkOrder === 'function'
        ? canUserRetakeNetworkOrder(w, currentActor)
        : (!rowReported && allowedRoleToRetake && (isAssignedToOther || isCheckingByOther || !w.assignedUserId));

      const retakeDisabledReason = rowReported
        ? 'El detalle ya fue concluido'
        : (!allowedRoleToRetake
          ? (belongsToAttention ? 'Asignado a Atención a clientes' : 'Asignado a Soporte técnico')
          : 'Ya estás a cargo de este caso');

      networkQuickActions = `
                <button type="button" class="btn net-btn-open" onclick="event.stopPropagation();selectOrderRow('${w.id}');openOrderTechnicianReport('${w.id}')" title="Abrir detalle y conversación" aria-label="Abrir detalle y conversación">
                  <svg class="btn-action-svg" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  ${unreadChatCount > 0 ? `<span class="net-unread-chat-dot" title="${unreadChatCount} nuevo(s) mensaje(s)">${unreadChatCount}</span>` : ''}
                </button>
                ${canRetake ? `
                  <button type="button" class="btn net-btn-retake" onclick="event.stopPropagation();selectOrderRow('${w.id}');takeOverNetworkOrder('${w.id}')" title="Asignarme la atención de este caso">
                    <svg class="btn-action-svg" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg> Retomar
                  </button>
                ` : `
                  <button type="button" class="btn net-btn-retake net-btn-retake-disabled" disabled title="${orderEscape(retakeDisabledReason)}" aria-label="${orderEscape(retakeDisabledReason)}">
                    <svg class="btn-action-svg" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg> Retomar
                  </button>
                `}
              `;
    }

    const isNetworkRow = w.detailKind === 'network';
    const sentPhysicalBadgeHtml = isNetworkRow ? renderSentToPhysicalBadge(w, { compact: true }) : '';
    const trClasses = [
      rowIsDoneVisual ? 'order-row-done' : (w.detailKind === 'physical' ? 'order-row-open' : ''),
      selectedOrderRowId === String(w.id) ? 'order-row-selected' : '',
      isNetworkRow && pendingAction.requiresMyAction ? 'order-row-action-required' : '',
      isNetworkRow && pendingAction.waitingOther ? 'order-row-waiting-counterparty' : ''
    ].filter(Boolean).join(' ');

    return `${dividerRowHtml}
              <tr data-order-id="${orderEscape(w.id)}" onclick="selectOrderRow('${w.id}', event)" class="${trClasses}">
                <td data-label="Folio">
                  <div class="order-folio-cell">
                    <strong class="order-folio">${orderEscape(getOrderFolio(w))}</strong>
                    ${isNetworkRow && reopenCount > 0 ? `<span class="order-reopened-badge" title="${reopenTitle}"><svg class="order-reopened-icon" viewBox="0 0 24 24"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg> ${reopenLabel}</span>` : ''}
                  </div>
                </td>
                <td data-label="Zona">${orderEscape(getZoneLabel(target.zone || w.region) || '--')}</td>
                <td data-label="Lugar"><strong class="order-place-main">${orderEscape(getOrderPlace(w))}</strong></td>
                <td data-label="Cliente" class="order-td-client"><strong class="order-client-main" title="${orderEscape(w.clientName || '--')}">${orderEscape(w.clientName || '--')}</strong>${w.clientPhone ? `<div class="order-client-phone">${orderEscape(w.clientPhone)}</div>` : ''}</td>
                <td data-label="Detalle">
                  <span class="order-category-badge">${orderEscape(orderCategoryLabel(getOrderCategory(w)))}</span>
                  ${w.description ? `<div class="order-detail-text">${orderEscape(w.description)}</div>` : (w.title && w.title !== orderCategoryLabel(getOrderCategory(w)) ? `<div class="order-detail-text">${orderEscape(w.title)}</div>` : '')}
                  ${w.detailKind === 'physical' ? `
                    <div class="order-infrastructure-tags" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;">
                      ${w.equipmentName ? `<span class="order-equip-tag" style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:10px;background:#ede9fe;color:#6d28d9;border:1px solid #ddd6fe;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07 19.07 4.93"/></svg> Antena: ${orderEscape(w.equipmentName)}</span>` : ''}
                      ${w.nodeName ? `<span class="order-node-tag" style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:10px;background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> Pueblo: ${orderEscape(w.nodeName)}</span>` : ''}
                      ${w.originNetworkFolio ? `<span class="order-origin-tag" style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;">Red: ${orderEscape(w.originNetworkFolio)}</span>` : ''}
                      ${w.updatedByName && w.updatedAt && w.updatedAt !== w.createdAt ? `<span class="order-editor-tag" style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;" title="Última edición por ${orderEscape(w.updatedByName)} el ${new Date(w.updatedAt).toLocaleString('es-MX')}">✏️ Editado por: ${renderUserColorChip(w.updatedByName, w.updatedById)}</span>` : ''}
                    </div>
                  ` : `
                    <div class="order-assignment-tags" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;">
                      ${w.assignedUserName ? (w.assignedUserName.split(',').map(s => s.trim()).filter(Boolean).map(name => renderUserColorChip(name, w.assignedUserId)).join('')) : ''}
                      ${w.reviewOpenedByName && !['completada', 'no_realizado'].includes(w.status) && !((w.assignedUserName || '').includes(w.reviewOpenedByName)) ? `
                        <span class="order-checking-badge" title="Atendiendo actualmente: ${orderEscape(w.reviewOpenedByName)}" style="display:inline-flex;align-items:center;flex-wrap:nowrap;white-space:nowrap;word-break:keep-all;overflow-wrap:normal;gap:4px;font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:12px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;max-width:100%;box-sizing:border-box;">
                          <svg style="width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2;flex-shrink:0;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          <span class="order-checking-label" style="white-space:nowrap;flex-shrink:0;">${w.reviewOpenedById === (currentActor.id || '') ? 'En atención' : 'Atendiendo:'}</span>
                          ${renderUserColorChip(w.reviewOpenedByName, w.reviewOpenedById)}
                        </span>
                      ` : ''}
                    </div>
                  `}
                </td>
                ${activeOrderDetailKind === 'network' ? `
                  <td data-label="Fecha y hora" class="order-datetime-cell">
                    <div class="order-datetime-val">
                      <span class="order-datetime-date">${formatOrderDate(w.createdAt || w.updatedAt)}</span>
                      <span class="order-datetime-time">${formatOrderTime(w.createdAt || w.updatedAt)}</span>
                    </div>
                  </td>
                ` : `
                  <td data-label="Tipo">${orderEscape(getOrderDisplayType(w))}</td>
                `}
                <td data-label="Prioridad"><span class="priority-badge priority-${orderEscape(w.priority || 'media')}"><span class="priority-dot"></span>${orderEscape(pl(w.priority || 'media'))}</span></td>
                <td data-label="Estado">
                  <div class="order-state-cell">
                    <span class="order-status-badge ${rowStatus.className}">${orderEscape(rowStatus.label)}</span>
                    ${sentPhysicalBadgeHtml}
                    ${isNetworkRow && pendingAction.requiresMyAction ? `<button type="button" class="order-action-needed-pill is-${pendingAction.kind || 'action'}-pill" onclick="event.stopPropagation();selectOrderRow('${w.id}');openOrderTechnicianReport('${w.id}')" title="Se requiere tu confirmación en este detalle">${orderEscape(pendingAction.badge)}</button>` : (isNetworkRow && pendingAction.waitingOther ? `<span class="order-waiting-other-pill is-${pendingAction.kind || 'waiting'}-pill">${orderEscape(pendingAction.badge)}</span>` : '')}
                  </div>
                </td>
                <td data-label="Acción">
                  <div class="order-actions">
                    ${isNetworkRow ? `
                      ${networkQuickActions}
                      ${rowReported ? (canReopen ? `
                        <button class="btn order-reopen-action" title="Reabrir detalle para nueva atención" aria-label="Reabrir detalle para nueva atención" onclick="event.stopPropagation();reopenCompletedWO('${w.id}')">${orderActionIcon('reopen')}</button>
                      ` : `
                        <button class="btn order-reopen-action order-reopen-disabled" disabled style="opacity:0.35;cursor:not-allowed;" title="No tienes permiso para reabrir este detalle" aria-label="No tienes permiso para reabrir este detalle">${orderActionIcon('reopen')}</button>
                      `) : (canEditOrder(w) ? `
                        <button class="btn order-edit-action" title="Editar información del detalle" aria-label="Editar información del detalle" onclick="openWO('${w.id}')">${orderActionIcon('edit')}</button>
                      ` : `
                        <button class="btn order-edit-action order-edit-disabled" disabled style="opacity:0.35;cursor:not-allowed;" title="Solo quien creó el detalle puede editarlo" aria-label="Solo quien creó el detalle puede editarlo">${orderActionIcon('edit')}</button>
                      `)}
                      <button class="btn order-delete-action" title="${userHasRole('administrador', 'admin') ? 'Eliminar detalle definitivamente' : 'Solicitar eliminación del detalle'}" aria-label="${userHasRole('administrador', 'admin') ? 'Eliminar detalle definitivamente' : 'Solicitar eliminación del detalle'}" onclick="deleteWO('${w.id}')">${orderActionIcon('delete')}</button>
                    ` : `
                      <button class="btn order-view-report" title="Ver registro físico" aria-label="Ver registro físico" onclick="openOrderTechnicianReport('${w.id}')">${orderActionIcon('view')}</button>
                      ${canEditOrder(w) ? `
                        <button class="btn order-edit-action" title="Editar información del registro físico" aria-label="Editar información del registro físico" onclick="openWO('${w.id}')">${orderActionIcon('edit')}</button>
                      ` : `
                        <button class="btn order-edit-action order-edit-disabled" disabled style="opacity:0.35;cursor:not-allowed;" title="Solo quien creó el detalle puede editarlo" aria-label="Solo quien creó el detalle puede editarlo">${orderActionIcon('edit')}</button>
                      `}
                      ${rowReported ? (canReopen ? `
                        <button class="btn order-reopen-action" title="Reabrir detalle para nueva atención" aria-label="Reabrir detalle para nueva atención" onclick="event.stopPropagation();reopenCompletedWO('${w.id}')">${orderActionIcon('reopen')}</button>
                      ` : `
                        <button class="btn order-reopen-action order-reopen-disabled" disabled style="opacity:0.35;cursor:not-allowed;" title="No tienes permiso para reabrir este detalle" aria-label="No tienes permiso para reabrir este detalle">${orderActionIcon('reopen')}</button>
                      `) : `
                        <button class="btn order-complete-action" style="border-color:#a7f3d0!important;background:#ecfdf5!important;color:#059669!important;" title="Completar registro físico" aria-label="Completar registro físico" onclick="event.stopPropagation();markWODone('${w.id}')">${orderActionIcon('complete')}</button>
                      `}
                      <button class="btn order-delete-action" title="${userHasRole('administrador', 'admin') ? 'Eliminar registro definitivamente' : 'Solicitar eliminación del detalle'}" aria-label="${userHasRole('administrador', 'admin') ? 'Eliminar registro definitivamente' : 'Solicitar eliminación del detalle'}" onclick="deleteWO('${w.id}')">${orderActionIcon('delete')}</button>
                    `}
                  </div>
                </td>
              </tr>`;
  }).join('')}
        </tbody>
      </table>
    </div>
    ${renderOrderPagination(totalRows, rangeStart, rangeEnd, totalPages)}`;
}

function renderOrderPagination(totalRows, rangeStart, rangeEnd, totalPages) {
  return `<div class="inventory-pagination order-table-footer">
    <div class="inventory-page-nav order-pagination-nav">
      <button type="button" class="inventory-page-button order-page-button" aria-label="Primera página" title="Primera página" onclick="changeOrderPage(1)" ${orderCurrentPage <= 1 ? 'disabled' : ''}>«</button>
      <button type="button" class="inventory-page-button order-page-button" aria-label="Página anterior" title="Página anterior" onclick="changeOrderPage(${orderCurrentPage - 1})" ${orderCurrentPage <= 1 ? 'disabled' : ''}>‹</button>
      <span class="inventory-page-indicator order-page-indicator">Página ${orderCurrentPage} de ${totalPages}</span>
      <button type="button" class="inventory-page-button order-page-button" aria-label="Página siguiente" title="Página siguiente" onclick="changeOrderPage(${orderCurrentPage + 1})" ${orderCurrentPage >= totalPages ? 'disabled' : ''}>›</button>
      <button type="button" class="inventory-page-button order-page-button" aria-label="Última página" title="Última página" onclick="changeOrderPage(${totalPages})" ${orderCurrentPage >= totalPages ? 'disabled' : ''}>»</button>
      <span class="order-page-total-label">(${totalRows ? rangeStart + 1 : 0}-${rangeEnd} de ${totalRows} detalles)</span>
    </div>
    <label class="inventory-page-size order-page-size"><span>Filas por página:</span><select onchange="changeOrderPageSize(this.value)"><option value="5" ${orderRowsPerPage === 5 ? 'selected' : ''}>5</option><option value="10" ${orderRowsPerPage === 10 ? 'selected' : ''}>10</option><option value="15" ${orderRowsPerPage === 15 ? 'selected' : ''}>15</option><option value="25" ${orderRowsPerPage === 25 ? 'selected' : ''}>25</option><option value="50" ${orderRowsPerPage === 50 ? 'selected' : ''}>50</option><option value="100" ${orderRowsPerPage === 100 ? 'selected' : ''}>100</option></select></label>
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
    saveRecord('workOrders', order).catch(() => { });
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
    const canRetakeHere = typeof canUserRetakeNetworkOrder === 'function' ? canUserRetakeNetworkOrder(order, currentUser) : false;
    const isCheckingByOther = canRetakeHere && order.reviewOpenedByName && order.reviewOpenedById !== currentUser.id;
    const isAssignedToOther = canRetakeHere && (order.assignedUserId || order.assignedUserName) && !isOrderAssignedToUser(order, currentUser);

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
          <div style="font-size:12px;font-weight:800;display:flex;align-items:center;gap:6px;">Motivo de devolución (${isSentToAttention ? 'Aclaración solicitada' : 'Cliente no conforme'}):</div>
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

  const unresModalBtn = document.querySelector('#network-resolve-mo .btn-modal-unresolvable');
  if (unresModalBtn) {
    unresModalBtn.style.display = canRoleDeclareUnresolvable(order) ? '' : 'none';
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
  const isSoporte = userHasRole('soporte');
  const isAtencion = userHasRole('atencion_clientes');

  if (isSentToAttention && isSoporte && !userHasRole('administrador', 'admin')) {
    return notify('Acción restringida: Los detalles asignados a Atención a clientes deben ser atendidos y concluidos por Atención.', 'warn');
  }
  if (!isSentToAttention && isAtencion && !userHasRole('administrador', 'admin')) {
    return notify('Acción restringida: Los detalles asignados a Soporte técnico deben ser resueltos por Soporte.', 'warn');
  }

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
  appendSharedNetworkFollowUp(order, 'resuelto_soporte', actionTag, solution, netresEvidencePhotos);
  if (isSentToAttention) {
    appendSharedNetworkFollowUp(order, 'closure_proposed_atencion', 'Conclusión enviada por Atención a clientes', solution, netresEvidencePhotos);
  } else {
    appendSharedNetworkFollowUp(order, 'closure_proposed_soporte', 'Resolución confirmada por Soporte', solution, netresEvidencePhotos);
  }
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
  updateOrderChatLive(order);
  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(order, 'resolved');
    }
  } catch (e) {
    console.warn('broadcastNetworkOrderChange error:', e);
  }
  notify('Detalle resuelto.', 'ok');
  await loadOrderPage();
  updateOrderChatLive(order);
  if (_closingChatAfterResolution) {
    _closingChatAfterResolution = false;
    closeOrderReportModalDirectly();
  }
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

  updateOrderChatLive(order);
  notify('Detalle en atención.', 'ok');
  renderWOs();
}

async function takeOverNetworkOrder(id) {
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
  const uRole = (typeof normalizeRole === 'function' ? normalizeRole(currentUser?.role) : String(currentUser?.role || '')).trim().toLowerCase();
  const isAdmin = uRole === 'administrador' || uRole === 'admin';
  const isSoporte = uRole === 'soporte';
  const isAtencion = uRole === 'atencion_clientes' || uRole === 'atencion';

  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle de red.', 'err');

  const assignedArea = typeof getOrderAssignedAreaRole === 'function' ? getOrderAssignedAreaRole(order) : '';
  const isSentToAttention = isNetworkSupportToAttention(order);
  const targetArea = assignedArea || (isSentToAttention ? 'atencion_clientes' : 'soporte');

  if (!isAdmin) {
    if (targetArea === 'atencion_clientes' && (!isAtencion || isSoporte)) {
      return notify('Acción restringida: Este caso fue asignado a Atención a clientes y no puede ser retomado por Soporte técnico.', 'warn');
    }
    if (targetArea === 'soporte' && (!isSoporte || isAtencion)) {
      return notify('Acción restringida: Este caso fue asignado a Soporte técnico y no puede ser retomado por Atención a clientes.', 'warn');
    }
    if (typeof canUserRetakeNetworkOrder === 'function' && !canUserRetakeNetworkOrder(order, currentUser)) {
      return notify('Acción restringida: No es posible retomar este caso con tu rol actual.', 'warn');
    }
  }

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

  updateOrderChatLive(order);
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
  updateOrderChatLive(order);
  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(order, 'returned');
    }
  } catch (e) {
    console.warn('broadcastNetworkOrderChange error:', e);
  }
  notify('Detalle devuelto.', 'warn');
  await loadOrderPage();
  updateOrderChatLive(order);
  if (_closingChatAfterResolution) {
    _closingChatAfterResolution = false;
    closeOrderReportModalDirectly();
  }
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
  updateOrderChatLive(order);
  notify('Detalle concluido.', 'ok');
  await loadOrderPage();
  updateOrderChatLive(order);
}

// Los enlaces de notificación se abren después de terminar initOrdenesPage.


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
    compressWOEvidenceImage(file).then(dataUrl => {
      if (dataUrl && !netretEvidencePhotos.includes(dataUrl)) {
        netretEvidencePhotos.push(dataUrl);
        renderNetretEvidencePreview();
      }
    }).catch(() => notify('No se pudo procesar la imagen.', 'err'));
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
  const isSentToAttention = isNetworkSupportToAttention(order);
  if (!canRoleDeclareUnresolvable(order)) {
    return notify(
      isSentToAttention
        ? 'Acción restringida: Solo Atención a clientes (quien recibe el reporte) puede notificarlo como no realizable.'
        : 'Acción restringida: Solo Soporte técnico (quien recibe el reporte) puede notificarlo como no realizable.',
      'warn'
    );
  }
  if (typeof markNotificationReadByOrderId === 'function') {
    markNotificationReadByOrderId(id);
  }

  document.getElementById('netunres-order-id').value = order.id;
  document.getElementById('netunres-reason').value = '';
  netunresEvidencePhotos = [];
  renderNetunresEvidencePreview();

  const subTitle = document.querySelector('#network-unresolvable-mo .modal-modern-subtitle');
  if (subTitle) {
    subTitle.textContent = isSentToAttention
      ? 'Indique el motivo por el cual no es posible realizar este requerimiento. Soporte técnico deberá confirmarlo para cerrar.'
      : 'Indique la justificación técnica por la cual no es posible resolver este reporte. Atención a clientes deberá confirmarlo para cerrar.';
  }

  const summary = document.getElementById('netunres-order-summary');
  if (summary) {
    summary.innerHTML = `
      <div class="netres-summary-row">
        <span><strong>Folio:</strong> ${orderEscape(getOrderFolio(order))}</span>
        <span><strong>Cliente:</strong> ${orderEscape(order.clientName || 'Sin nombre')}</span>
      </div>
      <div class="netres-summary-row">
        <span><strong>Pueblo:</strong> ${orderEscape(order.town || order.nodeName || 'Red')}</span>
        <span><strong>Asignado:</strong> ${orderEscape(order.assignedUserName || (isSentToAttention ? 'Equipo de Atención' : 'Equipo de Soporte'))}</span>
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
    compressWOEvidenceImage(file).then(dataUrl => {
      if (dataUrl && !netunresEvidencePhotos.includes(dataUrl)) {
        netunresEvidencePhotos.push(dataUrl);
        renderNetunresEvidencePreview();
      }
    }).catch(() => notify('No se pudo procesar la imagen.', 'err'));
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
    notify('Por favor ingrese la justificación por la cual no es posible realizar el reporte.', 'err');
    document.getElementById('netunres-reason')?.focus();
    return;
  }

  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle solicitado.', 'err');
  const isSentToAttention = isNetworkSupportToAttention(order);
  if (!canRoleDeclareUnresolvable(order)) {
    return notify(
      isSentToAttention
        ? 'Acción restringida: Solo Atención a clientes puede enviar este reporte como no realizable.'
        : 'Acción restringida: Solo Soporte técnico puede enviar este reporte como no realizable.',
      'warn'
    );
  }

  const counterpartyName = isSentToAttention ? 'Soporte técnico' : 'Atención a clientes';
  const confirmed = await askConfirmation({
    title: '¿Declarar reporte no realizable?',
    message: `El reporte pasará a "No realizado" y se notificará a ${counterpartyName} para que confirme que no se puede realizar. ¿Desea continuar?`,
    confirmText: 'Sí, notificar no realizable',
    cancelText: 'Cancelar',
    tone: 'danger'
  });
  if (!confirmed) return;

  const currentUser = getCurrentUser();
  const declarerRoleLabel = isSentToAttention ? 'Atención a clientes' : 'Soporte técnico';
  const userName = currentUser.name || currentUser.username || declarerRoleLabel;
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

  appendSharedNetworkFollowUp(order, 'no_realizado', `Notificado como no realizable por ${declarerRoleLabel}`, reason, netunresEvidencePhotos);
  setUpdatedAudit(order, 'declaró reporte no realizable en espera de confirmación');

  const saved = await saveRecord('workOrders', order);
  if (!saved) {
    notify('No se pudo guardar la notificación. Intente nuevamente.', 'err');
    return;
  }

  CM('network-unresolvable-mo');
  updateOrderChatLive(order);
  try {
    if (typeof broadcastNetworkOrderChange === 'function') {
      broadcastNetworkOrderChange(order, 'unresolvable');
    }
  } catch (e) {
    console.warn('broadcastNetworkOrderChange error:', e);
  }
  notify(`Notificado como no realizable. En espera de confirmación de ${counterpartyName}.`, 'ok');
  await loadOrderPage();
  updateOrderChatLive(order);
}

async function confirmNetworkUnresolvableConcluded(id) {
  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle solicitado.', 'err');

  const isSentToAttention = isNetworkSupportToAttention(order);
  if (!canRoleConfirmUnresolvable(order)) {
    return notify(
      isSentToAttention
        ? 'Acción restringida: Soporte técnico debe confirmar que el reporte no se puede realizar.'
        : 'Acción restringida: Atención a clientes debe confirmar que el reporte no se puede realizar.',
      'warn'
    );
  }

  const confirmed = await askConfirmation({
    title: '¿Concluir trámite de reporte?',
    message: '¿Confirma que no es posible realizar este detalle para dar por concluido el caso por ambas partes?',
    confirmText: 'Sí, confirmar y concluir',
    cancelText: 'Cancelar',
    tone: 'ok'
  });
  if (!confirmed) return;

  const currentUser = getCurrentUser();
  const confirmRoleLabel = isSentToAttention ? 'Soporte técnico' : 'Atención a clientes';
  const userName = currentUser.name || currentUser.username || confirmRoleLabel;
  const now = new Date().toISOString();

  order.status = 'completada';
  order.completedAt = now;
  order.completedByName = userName;
  order.updatedAt = now;
  order.updatedById = currentUser.id || '';

  appendSharedNetworkFollowUp(
    order,
    'completada',
    `No realizable confirmado por ${confirmRoleLabel}`,
    `${confirmRoleLabel} (${userName}) confirmó que el caso no se puede realizar y dio por concluido formalmente el detalle.`
  );
  setUpdatedAudit(order, 'confirmó reporte no realizable y concluyó trámite');

  updateOrderChatLive(order);
  renderWOs();

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
  notify('Confirmado como no realizable y concluido.', 'ok');
  await loadOrderPage();
  updateOrderChatLive(order);
}

// Escucha global de pegado (Ctrl + V) para evidencias en modales y en el chat del caso
document.addEventListener('paste', (e) => {
  const returnMo = document.getElementById('network-return-mo');
  if (returnMo && returnMo.classList.contains('open')) {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItems = items.filter(x => x.type.startsWith('image/'));
    if (imgItems.length) {
      e.preventDefault();
      readNetretFiles(imgItems.map(x => x.getAsFile()).filter(Boolean));
    }
    return;
  }
  const unresMo = document.getElementById('network-unresolvable-mo');
  if (unresMo && unresMo.classList.contains('open')) {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItems = items.filter(x => x.type.startsWith('image/'));
    if (imgItems.length) {
      e.preventDefault();
      readNetunresFiles(imgItems.map(x => x.getAsFile()).filter(Boolean));
    }
    return;
  }
  const resolveMo = document.getElementById('network-resolve-mo');
  if (resolveMo && resolveMo.classList.contains('open')) {
    return;
  }
  const confirmMo = document.getElementById('action-confirm-mo');
  const promptMo = document.getElementById('action-prompt-mo');
  if (confirmMo?.classList.contains('open') || promptMo?.classList.contains('open')) {
    return;
  }
  const chatReportMo = document.getElementById('order-tech-report-mo');
  if (chatReportMo && chatReportMo.classList.contains('open')) {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find(x => x.type && x.type.startsWith('image/'));
    if (imgItem) {
      const chatInput = document.getElementById('order-chat-input');
      if (!chatInput) {
        notify('Debes ser participante activo en un caso abierto para adjuntar imágenes en el chat.', 'warn');
        return;
      }
      const file = imgItem.getAsFile();
      if (file) {
        e.preventDefault();
        void attachOrderChatImageFile(file, true);
      }
    }
  }
});

function openNetworkColorsGuideModal() {
  if (typeof OM === 'function') {
    OM('network-colors-guide-mo');
  } else {
    document.getElementById('network-colors-guide-mo')?.classList.add('open');
  }
}

function openNetworkWorkflowGuideModal() {
  if (typeof OM === 'function') {
    OM('network-workflow-guide-mo');
  } else {
    document.getElementById('network-workflow-guide-mo')?.classList.add('open');
  }
}

let adminStatsFilterPeriod = 'all';
let adminStatsFilterArea = 'all';
let adminStatsSearchUser = '';
let adminStatsLoadingRemote = false;

function formatAdminStatsDuration(msList) {
  if (!Array.isArray(msList) || !msList.length) return 'Sin datos';
  const valid = msList.filter(ms => Number.isFinite(ms) && ms > 0);
  if (!valid.length) return 'Inmediato';
  const avgMs = valid.reduce((a, b) => a + b, 0) / valid.length;
  const totalMins = Math.max(1, Math.round(avgMs / 60000));
  if (totalMins < 60) return `${totalMins} min`;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

function normalizeAdminStatsKey(str) {
  return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function buildAdminStatsDonutSvg(segments, total) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  if (!total || total <= 0) {
    return `
      <svg viewBox="0 0 160 160" class="admin-stats-donut-svg">
        <circle cx="80" cy="80" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="20"></circle>
        <text x="80" y="76" text-anchor="middle" class="admin-stats-donut-num">0</text>
        <text x="80" y="96" text-anchor="middle" class="admin-stats-donut-sub">Casos</text>
      </svg>
    `;
  }
  let offset = 0;
  const circles = segments.filter(s => s.count > 0).map(s => {
    const ratio = s.count / total;
    const dash = ratio * circumference;
    const gap = Math.max(0, circumference - dash);
    const currentOffset = offset;
    offset += dash;
    return `<circle cx="80" cy="80" r="${radius}" fill="none" stroke="${s.color}" stroke-width="20" stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}" stroke-dashoffset="${(-currentOffset).toFixed(2)}" transform="rotate(-90 80 80)"><title>${orderEscape(s.label)}: ${s.count} (${Math.round(ratio * 100)}%)</title></circle>`;
  }).join('');

  return `
    <svg viewBox="0 0 160 160" class="admin-stats-donut-svg">
      <circle cx="80" cy="80" r="${radius}" fill="none" stroke="#f1f5f9" stroke-width="20"></circle>
      ${circles}
      <text x="80" y="76" text-anchor="middle" class="admin-stats-donut-num">${total}</text>
      <text x="80" y="96" text-anchor="middle" class="admin-stats-donut-sub">Casos totales</text>
    </svg>
  `;
}

function buildAdminStatsTimelineSvg(dailyBuckets) {
  if (!Array.isArray(dailyBuckets) || !dailyBuckets.length) {
    return `<div style="padding:28px;text-align:center;color:#64748b;font-size:12.5px;">No hay suficientes registros fechados para graficar la curva temporal.</div>`;
  }
  const width = 620;
  const height = 195;
  const padLeft = 34;
  const padRight = 16;
  const padTop = 20;
  const padBottom = 36;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const maxVal = Math.max(4, ...dailyBuckets.map(d => Math.max(d.created, d.resolved)));

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(step => {
    const y = Math.round(padTop + plotH * (1 - step));
    const val = Math.round(maxVal * step);
    return `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="${step === 0 ? 'none' : '3 3'}" stroke-width="1" />
      <text x="${padLeft - 6}" y="${y + 4}" text-anchor="end" fill="#64748b" font-size="10" font-weight="600">${val}</text>
    `;
  }).join('');

  const slotW = plotW / dailyBuckets.length;
  const barW = Math.max(6, Math.min(18, Math.floor(slotW * 0.34)));

  const bars = dailyBuckets.map((bucket, idx) => {
    const centerX = padLeft + idx * slotW + slotW / 2;
    const hCreated = Math.round((bucket.created / maxVal) * plotH);
    const hResolved = Math.round((bucket.resolved / maxVal) * plotH);
    const yCreated = padTop + plotH - hCreated;
    const yResolved = padTop + plotH - hResolved;
    return `
      <g class="admin-stats-chart-col">
        <rect x="${(centerX - barW - 1).toFixed(1)}" y="${yCreated}" width="${barW}" height="${Math.max(2, hCreated)}" rx="3" fill="#0284c7">
          <title>${bucket.label} · Capturados: ${bucket.created}</title>
        </rect>
        <rect x="${(centerX + 1).toFixed(1)}" y="${yResolved}" width="${barW}" height="${Math.max(2, hResolved)}" rx="3" fill="#059669">
          <title>${bucket.label} · Resueltos/Concluidos: ${bucket.resolved}</title>
        </rect>
        ${bucket.created > 0 ? `<text x="${(centerX - barW / 2 - 1).toFixed(1)}" y="${Math.max(11, yCreated - 4)}" text-anchor="middle" fill="#0369a1" font-size="9.5" font-weight="700">${bucket.created}</text>` : ''}
        ${bucket.resolved > 0 ? `<text x="${(centerX + barW / 2 + 1).toFixed(1)}" y="${Math.max(11, yResolved - 4)}" text-anchor="middle" fill="#047857" font-size="9.5" font-weight="700">${bucket.resolved}</text>` : ''}
        <text x="${centerX.toFixed(1)}" y="${height - 14}" text-anchor="middle" fill="#475569" font-size="10" font-weight="600">${orderEscape(bucket.shortLabel)}</text>
      </g>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" class="admin-stats-timeline-svg">
      ${gridLines}
      ${bars}
    </svg>
  `;
}

function setAdminStatsFilter(filterType, value) {
  if (filterType === 'period') adminStatsFilterPeriod = value || 'all';
  if (filterType === 'area') adminStatsFilterArea = value || 'all';
  if (filterType === 'search') adminStatsSearchUser = String(value || '');
  renderAdminNetworkStatsContent();
}

async function refreshAdminNetworkStatsDataset({ silent = false } = {}) {
  if (adminStatsLoadingRemote || typeof fetchDataPage !== 'function') return;
  adminStatsLoadingRemote = true;
  if (!silent) renderAdminNetworkStatsContent();
  try {
    const res = await fetchDataPage('operations', {
      windowed: '1',
      detailKind: 'network',
      adminStats: '1',
      limit: 2000,
      offset: 0
    });
    if (res && Array.isArray(res.workOrders)) {
      window.netopsAdminStatsOrders = res.workOrders;
      window.netopsAdminStatsFetched = true;
    }
    if (Array.isArray(res?.supportUsers)) {
      window.netopsSupportUsers = res.supportUsers;
    }
    if (Array.isArray(res?.attentionUsers)) {
      window.netopsAttentionUsers = res.attentionUsers;
    }
  } catch (e) {
    console.warn('No se pudo cargar el universo extendido de estadísticas:', e);
  } finally {
    adminStatsLoadingRemote = false;
    if (document.getElementById('admin-network-stats-mo')?.classList.contains('open')) {
      renderAdminNetworkStatsContent();
    }
  }
}

function openAdminNetworkStatsModal() {
  renderAdminNetworkStatsContent();
  if (typeof OM === 'function') {
    OM('admin-network-stats-mo');
  }
  if (!window.netopsAdminStatsFetched && typeof fetchDataPage === 'function') {
    void refreshAdminNetworkStatsDataset({ silent: true });
  }
}

function renderAdminNetworkStatsContent() {
  const content = document.getElementById('admin-network-stats-content');
  if (!content) return;

  // 1. Unificar órdenes de red disponibles (remotas completas + estado local)
  const mergedOrdersMap = new Map();
  (window.netopsAdminStatsOrders || []).forEach(w => {
    if (w && w.id && !w.deletedAt && w.detailKind === 'network') mergedOrdersMap.set(w.id, w);
  });
  (state.workOrders || []).forEach(w => {
    if (w && w.id && !w.deletedAt && w.detailKind === 'network') mergedOrdersMap.set(w.id, w);
  });
  const rawNetworkOrders = Array.from(mergedOrdersMap.values());

  // 2. Filtrado por periodo seleccionado
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthPrefix = todayStr.slice(0, 7);
  const allNetwork = rawNetworkOrders.filter(w => {
    if (adminStatsFilterPeriod === 'all') return true;
    const rawDate = w.createdAt || w.updatedAt || '';
    if (!rawDate) return false;
    const dStr = String(rawDate).slice(0, 10);
    if (adminStatsFilterPeriod === 'today') return dStr === todayStr;
    if (adminStatsFilterPeriod === 'this_month') return dStr.startsWith(currentMonthPrefix);
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return false;
    const diffDays = (now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24);
    if (adminStatsFilterPeriod === 'last7') return diffDays <= 7;
    if (adminStatsFilterPeriod === 'last30') return diffDays <= 30;
    return true;
  });

  // 3. Métricas globales de alto nivel
  const total = allNetwork.length;
  const completed = allNetwork.filter(w => w.status === 'completada').length;
  const awaitingConfirmation = allNetwork.filter(w => w.status === 'resuelto_soporte').length;
  const inReviewActive = allNetwork.filter(w => w.status === 'en_atencion' || w.status === 'en_revision').length;
  const inAttention = inReviewActive + awaitingConfirmation;
  const returnedActive = allNetwork.filter(w => w.status === 'devuelto_soporte').length;
  const pendingStrict = allNetwork.filter(w => !w.status || w.status === 'pendiente').length;
  const pending = pendingStrict + returnedActive;
  const unresolvable = allNetwork.filter(w => w.status === 'no_realizado').length;
  const solvedOrCompleted = completed + awaitingConfirmation;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const resolutionRate = total > 0 ? Math.round((solvedOrCompleted / total) * 100) : 0;

  // Contabilizar casos con devolución o reapertura histórica
  let totalReturnedOrReopened = 0;
  let totalFirstContactResolved = 0;
  let totalChatSteps = 0;
  const globalResolutionTimesMs = [];
  const globalFirstResponseTimesMs = [];

  allNetwork.forEach(w => {
    const fups = Array.isArray(w.followUps) ? w.followUps : [];
    totalChatSteps += fups.length;
    const hadReturn = w.status === 'devuelto_soporte' || Boolean(w.returnAt) || (typeof isOrderReopened === 'function' && isOrderReopened(w)) ||
      fups.some(f => ['devuelto_soporte', 'reabierto', 'reopened', 'resent'].includes(String(f.action || '').toLowerCase()));
    if (hadReturn) totalReturnedOrReopened++;
    if ((w.status === 'completada' || w.status === 'resuelto_soporte') && !hadReturn) {
      totalFirstContactResolved++;
    }
    const createdMs = w.createdAt ? new Date(w.createdAt).getTime() : NaN;
    if (Number.isFinite(createdMs)) {
      const repCompletedAt = w.technicianReport?.completedAt || w.completedAt;
      const resolvedMs = repCompletedAt ? new Date(repCompletedAt).getTime() : NaN;
      if (Number.isFinite(resolvedMs) && resolvedMs >= createdMs) {
        globalResolutionTimesMs.push(resolvedMs - createdMs);
      }
      const firstStepAt = w.reviewOpenedAt || fups[0]?.at || '';
      const firstRespMs = firstStepAt ? new Date(firstStepAt).getTime() : NaN;
      if (Number.isFinite(firstRespMs) && firstRespMs >= createdMs) {
        globalFirstResponseTimesMs.push(firstRespMs - createdMs);
      }
    }
  });

  const fcrRate = solvedOrCompleted > 0 ? Math.round((totalFirstContactResolved / solvedOrCompleted) * 100) : 100;
  const reworkRate = total > 0 ? Math.round((totalReturnedOrReopened / total) * 100) : 0;
  const avgResolutionLabel = formatAdminStatsDuration(globalResolutionTimesMs);
  const avgFirstResponseLabel = formatAdminStatsDuration(globalFirstResponseTimesMs);

  // 4. Directorio de personal autorizado (Admin, Soporte, Atención)
  const allowedRoleSet = new Set(['administrador', 'admin', 'soporte', 'atencion_clientes', 'atencion']);
  const normalizeAreaCode = rawRole => {
    const r = typeof normalizeRole === 'function' ? normalizeRole(rawRole) : String(rawRole || '').trim().toLowerCase();
    if (r === 'administrador' || r === 'admin') return 'administrador';
    if (r === 'atencion_clientes' || r === 'atencion' || r.includes('atencion')) return 'atencion_clientes';
    if (r === 'soporte' || r.includes('soporte')) return 'soporte';
    return '';
  };
  const getAreaDisplayName = code => {
    if (code === 'administrador') return 'Administración';
    if (code === 'atencion_clientes') return 'Atención a Clientes';
    return 'Soporte Técnico';
  };

  const catalogById = new Map();
  const catalogByName = new Map();
  const forbiddenNames = new Set();
  const forbiddenIds = new Set();

  (state.users || []).forEach(u => {
    if (!u || u.deletedAt) return;
    const normR = typeof normalizeRole === 'function' ? normalizeRole(u.role) : String(u.role || '').toLowerCase();
    if (!allowedRoleSet.has(normR)) {
      if (u.id) forbiddenIds.add(String(u.id).trim().toLowerCase());
      if (u.name) forbiddenNames.add(normalizeAdminStatsKey(u.name));
      if (u.username) forbiddenNames.add(normalizeAdminStatsKey(u.username));
      return;
    }
    const areaCode = normalizeAreaCode(u.role) || 'soporte';
    const entry = {
      id: String(u.id || '').trim(),
      name: (u.name || u.username || 'Usuario').trim(),
      username: (u.username || '').trim(),
      color: u.color || '',
      areaCode,
      role: getAreaDisplayName(areaCode)
    };
    if (entry.id) catalogById.set(entry.id.toLowerCase(), entry);
    if (entry.name) catalogByName.set(normalizeAdminStatsKey(entry.name), entry);
    if (entry.username) catalogByName.set(normalizeAdminStatsKey(entry.username), entry);
  });

  [...(window.netopsSupportUsers || []), ...(typeof getAvailableSupportUsers === 'function' ? getAvailableSupportUsers() : [])].forEach(u => {
    if (!u) return;
    const areaCode = normalizeAreaCode(u.role) || 'soporte';
    const entry = {
      id: String(u.id || '').trim(),
      name: (u.name || u.username || 'Soporte').trim(),
      username: (u.username || '').trim(),
      color: u.color || '',
      areaCode,
      role: getAreaDisplayName(areaCode)
    };
    if (entry.id && !catalogById.has(entry.id.toLowerCase())) catalogById.set(entry.id.toLowerCase(), entry);
    if (entry.name && !catalogByName.has(normalizeAdminStatsKey(entry.name))) catalogByName.set(normalizeAdminStatsKey(entry.name), entry);
  });

  [...(window.netopsAttentionUsers || []), ...(typeof getAvailableAttentionUsers === 'function' ? getAvailableAttentionUsers() : [])].forEach(u => {
    if (!u) return;
    const entry = {
      id: String(u.id || '').trim(),
      name: (u.name || u.username || 'Atención').trim(),
      username: (u.username || '').trim(),
      color: u.color || '',
      areaCode: 'atencion_clientes',
      role: getAreaDisplayName('atencion_clientes')
    };
    if (entry.id && !catalogById.has(entry.id.toLowerCase())) catalogById.set(entry.id.toLowerCase(), entry);
    if (entry.name && !catalogByName.has(normalizeAdminStatsKey(entry.name))) catalogByName.set(normalizeAdminStatsKey(entry.name), entry);
  });

  const resolversMap = {};
  const ensureUserRecord = (rawId, rawName, fallbackRoleHint = 'Soporte Técnico') => {
    const idClean = String(rawId || '').trim();
    const nameClean = String(rawName || '').trim();
    if (!idClean && !nameClean) return null;
    if (idClean && forbiddenIds.has(idClean.toLowerCase())) return null;
    if (nameClean && forbiddenNames.has(normalizeAdminStatsKey(nameClean))) return null;

    const catEntry = (idClean && catalogById.get(idClean.toLowerCase())) ||
      (nameClean && catalogByName.get(normalizeAdminStatsKey(nameClean))) || null;

    const canonicalName = catEntry?.name || nameClean || idClean;
    const mapKey = normalizeAdminStatsKey(canonicalName);
    if (!mapKey || forbiddenNames.has(mapKey)) return null;

    let areaCode = catEntry?.areaCode || normalizeAreaCode(fallbackRoleHint) || 'soporte';
    let roleLabel = catEntry?.role || getAreaDisplayName(areaCode);

    if (!resolversMap[mapKey]) {
      resolversMap[mapKey] = {
        key: mapKey,
        id: catEntry?.id || idClean || '',
        name: canonicalName,
        username: catEntry?.username || '',
        color: catEntry?.color || '',
        areaCode,
        role: roleLabel,
        created: 0,
        assigned: 0,
        solved: 0,
        confirmed: 0,
        inProgress: 0,
        pending: 0,
        returned: 0,
        retaken: 0,
        chatMessages: 0,
        resolutionTimesMs: [],
        firstResponseTimesMs: [],
        categories: {},
        zones: {},
        lastActivityAt: ''
      };
    }
    return resolversMap[mapKey];
  };

  // Pre-poblar con todos los miembros del catálogo para ver también quiénes tienen 0 actividad
  catalogByName.forEach(entry => {
    ensureUserRecord(entry.id, entry.name, entry.areaCode);
  });

  // 5. Métricas por Área Operativa (Soporte Técnico, Atención a Clientes, Administración)
  const createAreaBucket = (code, title, subtitle, color, accentBg) => ({
    code,
    title,
    subtitle,
    color,
    accentBg,
    created: 0,
    assigned: 0,
    solved: 0,
    completed: 0,
    awaitingConfirmation: 0,
    inAttention: 0,
    pending: 0,
    returned: 0,
    firstContactSolved: 0,
    chatMessages: 0,
    resolutionTimesMs: [],
    responseTimesMs: []
  });

  const areaStats = {
    soporte: createAreaBucket('soporte', 'Soporte Técnico', 'Atención de fallas, enlaces y solución en campo o sistema', '#0284c7', '#f0f9ff'),
    atencion_clientes: createAreaBucket('atencion_clientes', 'Atención a Clientes', 'Recepción de reportes, llamadas y confirmación con el cliente', '#7c3aed', '#f5f3ff'),
    administrador: createAreaBucket('administrador', 'Administración', 'Coordinación general, asignaciones y revisión de casos', '#0f172a', '#f8fafc')
  };

  // Flujo bidireccional entre áreas
  const flowStats = {
    atencionToSoporte: { total: 0, completed: 0, awaiting: 0, inProgress: 0, pending: 0, returned: 0 },
    soporteToAtencion: { total: 0, completed: 0, awaiting: 0, inProgress: 0, pending: 0, returned: 0 }
  };

  // Prioridades, Categorías, Zonas, Pueblos y Serie Temporal
  const priorityStats = {
    muy_alta: { label: 'Muy alta', color: '#dc2626', total: 0, solved: 0, pending: 0 },
    alta: { label: 'Alta', color: '#ea580c', total: 0, solved: 0, pending: 0 },
    media: { label: 'Media', color: '#0284c7', total: 0, solved: 0, pending: 0 },
    baja: { label: 'Baja', color: '#64748b', total: 0, solved: 0, pending: 0 }
  };
  const categoriesMap = {};
  const categoriesDetailMap = {};
  const zonesMap = {};
  const zonesDetailMap = {};
  const townsDetailMap = {};
  const dailyTimelineMap = new Map();

  const registerUserTouch = (userRec, catLabel, zoneLabel, isoDate) => {
    if (!userRec) return;
    if (catLabel) userRec.categories[catLabel] = (userRec.categories[catLabel] || 0) + 1;
    if (zoneLabel) userRec.zones[zoneLabel] = (userRec.zones[zoneLabel] || 0) + 1;
    if (isoDate && (!userRec.lastActivityAt || isoDate > userRec.lastActivityAt)) {
      userRec.lastActivityAt = isoDate;
    }
  };

  allNetwork.forEach(w => {
    const catLabel = orderCategoryLabel(getOrderCategory(w)) || 'General';
    const zoneLabel = w.region || w.zone || 'General';
    const townLabel = (typeof getOrderPlace === 'function' ? getOrderPlace(w) : (w.town || w.nodeName || '')).trim() || 'Sin localidad';
    const prioKey = ['muy_alta', 'alta', 'media', 'baja'].includes(w.priority) ? w.priority : 'media';
    const isSolvedState = w.status === 'completada' || w.status === 'resuelto_soporte';
    const isCompletedState = w.status === 'completada';
    const isSentToAttention = typeof isNetworkSupportToAttention === 'function' ? isNetworkSupportToAttention(w) : (w.targetRole === 'atencion_clientes' || w.originRole === 'soporte');
    const targetAreaCode = isSentToAttention ? 'atencion_clientes' : 'soporte';
    const originAreaCode = isSentToAttention ? 'soporte' : 'atencion_clientes';

    const fups = Array.isArray(w.followUps) ? w.followUps : [];
    const hadReturn = w.status === 'devuelto_soporte' || Boolean(w.returnAt) || (typeof isOrderReopened === 'function' && isOrderReopened(w)) ||
      fups.some(f => ['devuelto_soporte', 'reabierto', 'reopened', 'resent'].includes(String(f.action || '').toLowerCase()));

    // Flujo inter-áreas
    const flowBucket = isSentToAttention ? flowStats.soporteToAtencion : flowStats.atencionToSoporte;
    flowBucket.total++;
    if (isCompletedState) flowBucket.completed++;
    else if (w.status === 'resuelto_soporte') flowBucket.awaiting++;
    else if (w.status === 'en_atencion' || w.status === 'en_revision') flowBucket.inProgress++;
    else flowBucket.pending++;
    if (hadReturn) flowBucket.returned++;

    // Prioridad
    priorityStats[prioKey].total++;
    if (isSolvedState) priorityStats[prioKey].solved++;
    else priorityStats[prioKey].pending++;

    // Categorías
    categoriesMap[catLabel] = (categoriesMap[catLabel] || 0) + 1;
    if (!categoriesDetailMap[catLabel]) categoriesDetailMap[catLabel] = { total: 0, solved: 0, pending: 0, returned: 0 };
    categoriesDetailMap[catLabel].total++;
    if (isSolvedState) categoriesDetailMap[catLabel].solved++;
    else categoriesDetailMap[catLabel].pending++;
    if (hadReturn) categoriesDetailMap[catLabel].returned++;

    // Zonas
    zonesMap[zoneLabel] = (zonesMap[zoneLabel] || 0) + 1;
    if (!zonesDetailMap[zoneLabel]) zonesDetailMap[zoneLabel] = { total: 0, solved: 0, pending: 0 };
    zonesDetailMap[zoneLabel].total++;
    if (isSolvedState) zonesDetailMap[zoneLabel].solved++;
    else zonesDetailMap[zoneLabel].pending++;

    // Pueblos / Localidades
    if (!townsDetailMap[townLabel]) townsDetailMap[townLabel] = { total: 0, solved: 0, pending: 0, zone: zoneLabel };
    townsDetailMap[townLabel].total++;
    if (isSolvedState) townsDetailMap[townLabel].solved++;
    else townsDetailMap[townLabel].pending++;

    // Serie temporal diaria
    const createdDay = w.createdAt ? String(w.createdAt).slice(0, 10) : '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(createdDay)) {
      if (!dailyTimelineMap.has(createdDay)) dailyTimelineMap.set(createdDay, { date: createdDay, created: 0, resolved: 0 });
      dailyTimelineMap.get(createdDay).created++;
    }
    const resolvedIso = w.technicianReport?.completedAt || w.completedAt || '';
    const resolvedDay = resolvedIso ? String(resolvedIso).slice(0, 10) : '';
    if (isSolvedState && /^\d{4}-\d{2}-\d{2}$/.test(resolvedDay)) {
      if (!dailyTimelineMap.has(resolvedDay)) dailyTimelineMap.set(resolvedDay, { date: resolvedDay, created: 0, resolved: 0 });
      dailyTimelineMap.get(resolvedDay).resolved++;
    }

    // Tiempos de la orden
    const createdMs = w.createdAt ? new Date(w.createdAt).getTime() : NaN;
    const resolvedMs = resolvedIso ? new Date(resolvedIso).getTime() : NaN;
    const durationMs = (Number.isFinite(createdMs) && Number.isFinite(resolvedMs) && resolvedMs >= createdMs) ? (resolvedMs - createdMs) : null;
    const firstTouchIso = w.reviewOpenedAt || fups[0]?.at || '';
    const firstTouchMs = firstTouchIso ? new Date(firstTouchIso).getTime() : NaN;
    const responseMs = (Number.isFinite(createdMs) && Number.isFinite(firstTouchMs) && firstTouchMs >= createdMs) ? (firstTouchMs - createdMs) : null;

    // Creador
    const creatorUser = ensureUserRecord(w.createdById || w.createdBy, w.createdByName || w.createdByUsername, originAreaCode);
    const creatorArea = creatorUser?.areaCode || originAreaCode;
    if (areaStats[creatorArea]) areaStats[creatorArea].created++;
    if (creatorUser) {
      creatorUser.created++;
      registerUserTouch(creatorUser, catLabel, zoneLabel, w.createdAt);
    }

    // Área destino (Asignación de área)
    if (areaStats[targetAreaCode]) {
      areaStats[targetAreaCode].assigned++;
      if (isCompletedState) areaStats[targetAreaCode].completed++;
      if (w.status === 'resuelto_soporte') areaStats[targetAreaCode].awaitingConfirmation++;
      if (isSolvedState) {
        areaStats[targetAreaCode].solved++;
        if (!hadReturn) areaStats[targetAreaCode].firstContactSolved++;
      }
      if (w.status === 'en_atencion' || w.status === 'en_revision') areaStats[targetAreaCode].inAttention++;
      if (!w.status || w.status === 'pendiente' || w.status === 'devuelto_soporte') areaStats[targetAreaCode].pending++;
      if (hadReturn) areaStats[targetAreaCode].returned++;
      if (durationMs !== null) areaStats[targetAreaCode].resolutionTimesMs.push(durationMs);
      if (responseMs !== null) areaStats[targetAreaCode].responseTimesMs.push(responseMs);
    }

    // Usuario asignado
    if (w.assignedUserId || w.assignedUserName) {
      const assignedIds = String(w.assignedUserId || '').split(',').map(s => s.trim()).filter(Boolean);
      const assignedNames = String(w.assignedUserName || '').split(',').map(s => s.trim()).filter(Boolean);
      const countAssignees = Math.max(assignedIds.length, assignedNames.length);
      for (let i = 0; i < countAssignees; i++) {
        const assigneeUser = ensureUserRecord(assignedIds[i] || '', assignedNames[i] || assignedIds[i] || '', targetAreaCode);
        if (assigneeUser) {
          assigneeUser.assigned++;
          if (!w.status || w.status === 'pendiente' || w.status === 'devuelto_soporte') {
            assigneeUser.pending++;
          }
          registerUserTouch(assigneeUser, catLabel, zoneLabel, w.updatedAt || w.createdAt);
        }
      }
    }

    // Usuario que resolvió
    const rep = w.technicianReport || {};
    const repName = rep.completedByName || w.completedByName;
    const repId = rep.completedBy || rep.completedById || '';
    const repRole = rep.completedByRole || (targetAreaCode === 'atencion_clientes' ? 'Atención a clientes' : 'Soporte');
    const solveFollowUp = fups.find(f => ['solved', 'concluded', 'resuelto_soporte', 'closure_proposed_soporte', 'closure_proposed_atencion'].includes(String(f.action || '').toLowerCase()));
    const finalResolverName = repName || solveFollowUp?.byName;
    const finalResolverId = repId || solveFollowUp?.byId;
    const finalResolverRole = repRole || solveFollowUp?.byRole || (w.originRole === 'soporte' ? 'Atención a clientes' : 'Soporte');

    if (finalResolverName && isSolvedState) {
      const resolverUser = ensureUserRecord(finalResolverId, finalResolverName, finalResolverRole);
      if (resolverUser) {
        resolverUser.solved++;
        if (durationMs !== null) resolverUser.resolutionTimesMs.push(durationMs);
        registerUserTouch(resolverUser, catLabel, zoneLabel, resolvedIso || w.updatedAt);
      }
    }

    // Usuario en atención activa
    if (w.status === 'en_atencion' || w.status === 'en_revision' || (w.reviewOpenedById && w.status !== 'completada')) {
      const holderName = w.reviewOpenedByName || w.assignedUserName;
      const holderId = w.reviewOpenedById || w.assignedUserId;
      if (holderName) {
        const firstHolderName = String(holderName).split(',')[0].trim();
        const firstHolderId = String(holderId || '').split(',')[0].trim();
        const holderUser = ensureUserRecord(firstHolderId, firstHolderName, targetAreaCode);
        if (holderUser) {
          holderUser.inProgress++;
          if (responseMs !== null) holderUser.firstResponseTimesMs.push(responseMs);
          registerUserTouch(holderUser, catLabel, zoneLabel, w.reviewOpenedAt || w.updatedAt);
        }
      }
    }

    // Análisis de bitácora / followUps por usuario y área
    fups.forEach(step => {
      const stepUser = ensureUserRecord(step.byId || step.byUserId, step.byName || step.byUsername, targetAreaCode);
      if (!stepUser) return;
      const act = String(step.action || '').toLowerCase();
      stepUser.chatMessages++;
      if (areaStats[stepUser.areaCode]) areaStats[stepUser.areaCode].chatMessages++;
      if (act === 'completada' || act === 'confirmed') {
        stepUser.confirmed++;
        if (stepUser.areaCode === 'administrador') areaStats.administrador.completed++;
      } else if (act === 'devuelto_soporte' || act === 'returned') {
        stepUser.returned++;
      } else if (act === 'retomado' || act === 'reasignado') {
        stepUser.retaken++;
        if (stepUser.areaCode === 'administrador') areaStats.administrador.assigned++;
      }
      if (step.at && (!stepUser.lastActivityAt || step.at > stepUser.lastActivityAt)) {
        stepUser.lastActivityAt = step.at;
      }
    });
  });

  // 6. Ordenar y filtrar lista de personal
  const allUsersList = Object.values(resolversMap);
  const searchNorm = normalizeAdminStatsKey(adminStatsSearchUser);
  const resolversList = allUsersList
    .filter(u => {
      if (adminStatsFilterArea !== 'all' && u.areaCode !== adminStatsFilterArea) return false;
      if (searchNorm && !normalizeAdminStatsKey(u.name).includes(searchNorm) && !normalizeAdminStatsKey(u.role).includes(searchNorm)) return false;
      return true;
    })
    .sort((a, b) => {
      const aIsAdmin = a.areaCode === 'administrador';
      const bIsAdmin = b.areaCode === 'administrador';
      if (aIsAdmin !== bIsAdmin) return aIsAdmin ? 1 : -1;
      if (b.solved !== a.solved) return b.solved - a.solved;
      if (b.inProgress !== a.inProgress) return b.inProgress - a.inProgress;
      if (b.assigned !== a.assigned) return b.assigned - a.assigned;
      if (b.created !== a.created) return b.created - a.created;
      return a.name.localeCompare(b.name, 'es');
    });

  // Contar integrantes por área
  const areaMembersCount = { soporte: 0, atencion_clientes: 0, administrador: 0 };
  const areaActiveMembersCount = { soporte: 0, atencion_clientes: 0, administrador: 0 };
  allUsersList.forEach(u => {
    if (areaMembersCount[u.areaCode] !== undefined) {
      areaMembersCount[u.areaCode]++;
      if (u.solved > 0 || u.created > 0 || u.assigned > 0 || u.inProgress > 0 || u.chatMessages > 0) {
        areaActiveMembersCount[u.areaCode]++;
      }
    }
  });

  const categoriesList = Object.entries(categoriesMap).sort((a, b) => b[1] - a[1]);
  const zonesList = Object.entries(zonesMap).sort((a, b) => b[1] - a[1]);
  const townsList = Object.entries(townsDetailMap).sort((a, b) => b[1].total - a[1].total).slice(0, 8);

  // Construir buckets de los últimos 10 días con actividad para la gráfica temporal
  const sortedTimelineDays = Array.from(dailyTimelineMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-10)
    .map(item => {
      const parts = item.date.split('-');
      const shortLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : item.date;
      return { ...item, label: item.date, shortLabel };
    });

  // Segmentos para la Gráfica de Dona de Estados
  const statusSegments = [
    { key: 'completada', label: 'Concluidos definitivos', count: completed, color: '#059669' },
    { key: 'resuelto_soporte', label: 'Resueltos (Por confirmar)', count: awaitingConfirmation, color: '#10b981' },
    { key: 'en_revision', label: 'En atención activa', count: inReviewActive, color: '#d97706' },
    { key: 'pendiente', label: 'Pendientes sin abrir', count: pendingStrict, color: '#dc2626' },
    { key: 'devuelto_soporte', label: 'Devueltos / En retrabajo', count: returnedActive, color: '#e11d48' },
    { key: 'no_realizado', label: 'No realizados', count: unresolvable, color: '#64748b' }
  ];

  // Máximo para barras comparativas entre áreas
  const maxAreaMetric = Math.max(1, ...Object.values(areaStats).flatMap(a => [a.created, a.assigned, a.solved, a.inAttention + a.pending]));

  content.innerHTML = `
    <!-- Barra de Controles Ejecutivos -->
    <div class="admin-stats-toolbar">
      <div class="admin-stats-toolbar-group">
        <span class="admin-stats-toolbar-label">Periodo:</span>
        <div class="admin-stats-pill-group">
          ${[
      ['all', 'Todo el historial'],
      ['today', 'Hoy'],
      ['last7', 'Últimos 7 días'],
      ['last30', 'Últimos 30 días'],
      ['this_month', 'Este mes']
    ].map(([val, lbl]) => `
            <button type="button" class="admin-stats-filter-pill ${adminStatsFilterPeriod === val ? 'is-active' : ''}" onclick="setAdminStatsFilter('period','${val}')">${lbl}</button>
          `).join('')}
        </div>
      </div>
      <div class="admin-stats-toolbar-group">
        <span class="admin-stats-toolbar-label">Área:</span>
        <div class="admin-stats-pill-group">
          ${[
      ['all', 'Soporte y Atención (Todas)'],
      ['soporte', 'Soporte Técnico'],
      ['atencion_clientes', 'Atención a Clientes'],
      ['administrador', 'Supervisión Admin']
    ].map(([val, lbl]) => `
            <button type="button" class="admin-stats-filter-pill ${adminStatsFilterArea === val ? 'is-active' : ''}" onclick="setAdminStatsFilter('area','${val}')">${lbl}</button>
          `).join('')}
        </div>
      </div>
      <div class="admin-stats-toolbar-actions">
        <button type="button" class="btn bsm bgh" onclick="refreshAdminNetworkStatsDataset()" ${adminStatsLoadingRemote ? 'disabled' : ''}>
          ${adminStatsLoadingRemote ? '⏳ Sincronizando...' : '↻ Actualizar universo'}
        </button>
      </div>
    </div>

    <!-- 8 KPIs Principales -->
    <div class="admin-stats-kpi-grid admin-stats-kpi-grid-8">
      <div class="admin-stats-kpi-card total">
        <small>Total reportes</small>
        <strong>${total}</strong>
        <span>${flowStats.atencionToSoporte.total} de atención · ${flowStats.soporteToAtencion.total} de soporte</span>
      </div>
      <div class="admin-stats-kpi-card success">
        <small>Resueltos y cerrados</small>
        <strong>${completed}</strong>
        <span>${rate}% cerrados (${solvedOrCompleted} con solución: ${resolutionRate}%)</span>
      </div>
      <div class="admin-stats-kpi-card warning">
        <small>En revisión</small>
        <strong>${inAttention}</strong>
        <span>${inReviewActive} en proceso · ${awaitingConfirmation} por confirmar</span>
      </div>
      <div class="admin-stats-kpi-card pending">
        <small>Pendientes</small>
        <strong>${pending}</strong>
        <span>${pendingStrict} nuevos · ${returnedActive} reabiertos</span>
      </div>
      <div class="admin-stats-kpi-card info">
        <small>Solución directa</small>
        <strong>${fcrRate}%</strong>
        <span>${totalFirstContactResolved} casos sin reabrir</span>
      </div>
      <div class="admin-stats-kpi-card danger-soft">
        <small>Casos devueltos</small>
        <strong>${totalReturnedOrReopened}</strong>
        <span>${reworkRate}% requirieron nueva revisión</span>
      </div>
      <div class="admin-stats-kpi-card purple">
        <small>Tiempo de solución</small>
        <strong>${avgResolutionLabel}</strong>
        <span>Promedio desde el reporte</span>
      </div>
      <div class="admin-stats-kpi-card slate">
        <small>Primer contacto</small>
        <strong>${avgFirstResponseLabel}</strong>
        <span>${totalChatSteps} notas en seguimiento</span>
      </div>
    </div>

    <!-- SECCIÓN 1: DESEMPEÑO EXTENSO POR ÁREA OPERATIVA -->
    <div class="admin-stats-section">
      <div class="admin-stats-section-head">
        <div class="admin-stats-section-title">
          <span>🏢</span> Desempeño y Productividad por Área Operativa
        </div>
        <span class="admin-stats-section-badge">Soporte y Atención</span>
      </div>
      <div class="admin-stats-areas-grid">
        ${[areaStats.soporte, areaStats.atencion_clientes]
      .filter(a => adminStatsFilterArea === 'all' || a.code === adminStatsFilterArea)
      .map(area => {
        const membersTotal = areaMembersCount[area.code] || 0;
        const membersActive = areaActiveMembersCount[area.code] || 0;
        const effRate = area.assigned > 0 ? Math.round((area.solved / area.assigned) * 100) : (area.solved > 0 ? 100 : 0);
        const closeRate = area.assigned > 0 ? Math.round((area.completed / area.assigned) * 100) : 0;
        const fcrAreaRate = area.solved > 0 ? Math.round((area.firstContactSolved / area.solved) * 100) : 100;
        const avgResTime = formatAdminStatsDuration(area.resolutionTimesMs);
        const avgRespTime = formatAdminStatsDuration(area.responseTimesMs);
        return `
              <div class="admin-stats-area-card" style="border-top: 4px solid ${area.color};">
                <div class="admin-stats-area-head" style="background:${area.accentBg};">
                  <div>
                    <h4>${orderEscape(area.title)}</h4>
                    <p>${orderEscape(area.subtitle)}</p>
                  </div>
                  <span class="admin-stats-area-members-badge" style="color:${area.color};">
                    👥 ${membersActive}/${membersTotal} activos
                  </span>
                </div>
                <div class="admin-stats-area-metrics-grid">
                  <div class="admin-stats-area-metric">
                    <small>Registrados</small>
                    <strong>${area.created}</strong>
                  </div>
                  <div class="admin-stats-area-metric">
                    <small>Asignados</small>
                    <strong>${area.assigned}</strong>
                  </div>
                  <div class="admin-stats-area-metric is-emerald">
                    <small>Solucionados</small>
                    <strong>${area.solved}</strong>
                  </div>
                  <div class="admin-stats-area-metric is-blue">
                    <small>Cerrados</small>
                    <strong>${area.completed}</strong>
                  </div>
                  <div class="admin-stats-area-metric is-amber">
                    <small>En revisión</small>
                    <strong>${area.inAttention} / ${area.awaitingConfirmation}</strong>
                  </div>
                  <div class="admin-stats-area-metric is-red">
                    <small>Pendientes</small>
                    <strong>${area.pending} (${area.returned} dev.)</strong>
                  </div>
                </div>
                <div class="admin-stats-area-bars">
                  <div class="admin-stats-area-bar-item">
                    <div class="admin-stats-area-bar-label">
                      <span>Efectividad del área</span>
                      <strong>${effRate}%</strong>
                    </div>
                    <div class="admin-stats-bar-track"><div class="admin-stats-bar-fill" style="width:${Math.min(100, effRate)}%;background:${area.color};"></div></div>
                  </div>
                  <div class="admin-stats-area-bar-item">
                    <div class="admin-stats-area-bar-label">
                      <span>Solución directa</span>
                      <strong>${fcrAreaRate}% (${closeRate}% cerrados)</strong>
                    </div>
                    <div class="admin-stats-bar-track"><div class="admin-stats-bar-fill" style="width:${Math.min(100, fcrAreaRate)}%;background:#059669;"></div></div>
                  </div>
                </div>
                <div class="admin-stats-area-footer">
                  <span>⏱️ Tiempo promedio: <strong>${avgResTime}</strong></span>
                  <span>⚡ Respuesta inicial: <strong>${avgRespTime}</strong></span>
                  <span>💬 Mensajes: <strong>${area.chatMessages}</strong></span>
                </div>
              </div>
            `;
      }).join('')}
        ${(adminStatsFilterArea === 'all' || adminStatsFilterArea === 'administrador') ? `
          <div class="admin-stats-admin-unified-bar">
            <div class="admin-stats-admin-unified-bar-info">
              <span style="font-size:20px;">🛡️</span>
              <div>
                <strong>Supervisión de Administración</strong>
                <span>Coordinación general, asignaciones y revisión de casos</span>
              </div>
            </div>
            <div class="admin-stats-admin-unified-bar-kpis">
              <span>Registrados por Admin: <strong>${areaStats.administrador.created}</strong></span>
              <span>•</span>
              <span>Reasignaciones: <strong>${areaStats.administrador.assigned}</strong></span>
              <span>•</span>
              <span>Casos aprobados: <strong>${areaStats.administrador.completed}</strong></span>
              <span>•</span>
              <span>Supervisores: <strong>${areaActiveMembersCount.administrador}/${areaMembersCount.administrador}</strong></span>
            </div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- SECCIÓN 2: GRÁFICAS VISUALES DE INTELIGENCIA OPERATIVA -->
    <div class="admin-stats-grid-2">
      <!-- Gráfica 1: Dona de Estado Operativo -->
      <div class="admin-stats-section">
        <div class="admin-stats-section-head">
          <div class="admin-stats-section-title"><span>🍩</span> Gráfica de Distribución por Estado</div>
          <span class="admin-stats-section-badge">${total} casos</span>
        </div>
        <div class="admin-stats-donut-layout">
          <div class="admin-stats-donut-wrap">
            ${buildAdminStatsDonutSvg(statusSegments, total)}
          </div>
          <div class="admin-stats-donut-legend">
            ${statusSegments.map(seg => {
        const pct = total > 0 ? Math.round((seg.count / total) * 100) : 0;
        return `
                <div class="admin-stats-legend-item">
                  <span class="admin-stats-legend-dot" style="background:${seg.color};"></span>
                  <span class="admin-stats-legend-name">${orderEscape(seg.label)}</span>
                  <strong class="admin-stats-legend-val">${seg.count} <small>(${pct}%)</small></strong>
                </div>
              `;
      }).join('')}
          </div>
        </div>
      </div>

      <!-- Gráfica 2: Comparativa Multidimensional entre Áreas -->
      <div class="admin-stats-section">
        <div class="admin-stats-section-head">
          <div class="admin-stats-section-title"><span>📊</span> Comparativa de Volumen y Resolución por Área</div>
          <span class="admin-stats-section-badge">Soporte vs Atención</span>
        </div>
        <div class="admin-stats-comparative-chart">
          <div class="admin-stats-comp-legend">
            <span><i style="background:#0284c7;"></i> Capturados</span>
            <span><i style="background:#6366f1;"></i> Asignados</span>
            <span><i style="background:#059669;"></i> Resueltos</span>
            <span><i style="background:#d97706;"></i> Activos/Pend.</span>
          </div>
          ${[areaStats.soporte, areaStats.atencion_clientes]
      .filter(a => adminStatsFilterArea === 'all' || a.code === adminStatsFilterArea)
      .map(area => {
        const wCreated = Math.round((area.created / maxAreaMetric) * 100);
        const wAssigned = Math.round((area.assigned / maxAreaMetric) * 100);
        const wSolved = Math.round((area.solved / maxAreaMetric) * 100);
        const activeLoad = area.inAttention + area.pending;
        const wActive = Math.round((activeLoad / maxAreaMetric) * 100);
        return `
              <div class="admin-stats-comp-group">
                <div class="admin-stats-comp-header">
                  <strong>${orderEscape(area.title)}</strong>
                  <span>${area.solved} resueltos de ${area.assigned} asignados · ${area.created} capturados</span>
                </div>
                <div class="admin-stats-comp-bars">
                  <div class="admin-stats-comp-bar-row">
                    <small>Capturados</small>
                    <div class="admin-stats-comp-track"><div style="width:${wCreated}%;background:#0284c7;"></div></div>
                    <b>${area.created}</b>
                  </div>
                  <div class="admin-stats-comp-bar-row">
                    <small>Asignados</small>
                    <div class="admin-stats-comp-track"><div style="width:${wAssigned}%;background:#6366f1;"></div></div>
                    <b>${area.assigned}</b>
                  </div>
                  <div class="admin-stats-comp-bar-row">
                    <small>Resueltos</small>
                    <div class="admin-stats-comp-track"><div style="width:${wSolved}%;background:#059669;"></div></div>
                    <b>${area.solved}</b>
                  </div>
                  <div class="admin-stats-comp-bar-row">
                    <small>En cola/atención</small>
                    <div class="admin-stats-comp-track"><div style="width:${wActive}%;background:#d97706;"></div></div>
                    <b>${activeLoad}</b>
                  </div>
                </div>
              </div>
            `;
      }).join('')}
          <div class="admin-stats-comp-admin-footer">
            <span>🛡️ <b>Administración (Supervisión Unificada):</b> ${areaStats.administrador.created} casos creados · ${areaStats.administrador.assigned} reasignaciones · ${areaStats.administrador.completed} cierres</span>
            <span style="font-weight:700;color:#0f172a;">${areaActiveMembersCount.administrador} supervisor(es)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- SECCIÓN 2B: CURVA TEMPORAL Y FLUJO INTER-ÁREAS / PRIORIDADES -->
    <div class="admin-stats-grid-2">
      <!-- Gráfica 3: Evolución Diaria de Ingreso vs Resolución -->
      <div class="admin-stats-section">
        <div class="admin-stats-section-head">
          <div class="admin-stats-section-title"><span>📈</span> Ritmo Diario: Casos Capturados vs Resueltos</div>
          <div class="admin-stats-comp-legend">
            <span><i style="background:#0284c7;"></i> Capturados</span>
            <span><i style="background:#059669;"></i> Resueltos</span>
          </div>
        </div>
        <div class="admin-stats-timeline-wrap">
          ${buildAdminStatsTimelineSvg(sortedTimelineDays)}
        </div>
      </div>

      <!-- Gráfica 4: Flujo Inter-Áreas y Desempeño por Prioridad -->
      <div class="admin-stats-section">
        <div class="admin-stats-section-head">
          <div class="admin-stats-section-title"><span>🔄</span> Flujo Inter-Áreas y Cumplimiento por Prioridad</div>
          <span class="admin-stats-section-badge">Atención ↔ Soporte</span>
        </div>
        <div class="admin-stats-flow-boxes">
          <div class="admin-stats-flow-card">
            <div class="admin-stats-flow-title">
              <strong>Atención a Clientes ➔ Soporte Técnico</strong>
              <span>${flowStats.atencionToSoporte.total} reportes</span>
            </div>
            <div class="admin-stats-flow-pills">
              <span class="is-ok">✓ ${flowStats.atencionToSoporte.completed} concluidos</span>
              <span class="is-rev">👁 ${flowStats.atencionToSoporte.awaiting} por confirmar</span>
              <span class="is-att">⚡ ${flowStats.atencionToSoporte.inProgress} en atención</span>
              <span class="is-pend">⏳ ${flowStats.atencionToSoporte.pending} pendientes</span>
              <span class="is-ret">↩ ${flowStats.atencionToSoporte.returned} devueltos</span>
            </div>
          </div>
          <div class="admin-stats-flow-card">
            <div class="admin-stats-flow-title">
              <strong>Soporte Técnico ➔ Atención a Clientes</strong>
              <span>${flowStats.soporteToAtencion.total} requerimientos</span>
            </div>
            <div class="admin-stats-flow-pills">
              <span class="is-ok">✓ ${flowStats.soporteToAtencion.completed} concluidos</span>
              <span class="is-rev">👁 ${flowStats.soporteToAtencion.awaiting} por confirmar</span>
              <span class="is-att">⚡ ${flowStats.soporteToAtencion.inProgress} en atención</span>
              <span class="is-pend">⏳ ${flowStats.soporteToAtencion.pending} pendientes</span>
              <span class="is-ret">↩ ${flowStats.soporteToAtencion.returned} devueltos</span>
            </div>
          </div>
        </div>
        <div class="admin-stats-priority-breakdown">
          <div class="admin-stats-subhead">Efectividad según Nivel de Prioridad</div>
          ${Object.values(priorityStats).map(p => {
        const pRate = p.total > 0 ? Math.round((p.solved / p.total) * 100) : 0;
        return `
              <div class="admin-stats-prio-row">
                <span class="admin-stats-prio-label"><i style="background:${p.color};"></i> ${p.label}</span>
                <div class="admin-stats-bar-track"><div class="admin-stats-bar-fill" style="width:${pRate}%;background:${p.color};"></div></div>
                <strong class="admin-stats-prio-val">${p.solved}/${p.total} (${pRate}%)</strong>
              </div>
            `;
      }).join('')}
        </div>
      </div>
    </div>

    <!-- SECCIÓN 3: RENDIMIENTO DE RESOLUCIÓN Y GESTIÓN POR USUARIO (TABLA EXTENSA) -->
    <div class="admin-stats-section">
      <div class="admin-stats-section-head">
        <div class="admin-stats-section-title">
          <span>👨‍💻</span> Rendimiento de resolución por usuario
        </div>
        <div class="admin-stats-user-search-wrap">
          <input type="search" class="admin-stats-user-search" placeholder="Buscar personal o área..." value="${orderEscape(adminStatsSearchUser)}" oninput="setAdminStatsFilter('search', this.value)">
        </div>
      </div>
      <div class="admin-stats-table-wrap">
        <table class="admin-stats-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Personal</th>
              <th>Área</th>
              <th style="text-align:center;">Registrados</th>
              <th style="text-align:center;">Asignados</th>
              <th style="text-align:center;">Solucionados</th>
              <th style="text-align:center;">Cerrados</th>
              <th style="text-align:center;">En revisión</th>
              <th style="text-align:center;">Pendientes</th>
              <th style="text-align:center;">Reabiertos</th>
              <th style="text-align:center;">Mensajes</th>
              <th style="text-align:center;">Tiempo Prom.</th>
              <th style="text-align:right;">Efectividad / Total</th>
            </tr>
          </thead>
          <tbody>
            ${resolversList.length ? resolversList.map((r, idx) => {
        const isAdmin = r.areaCode === 'administrador';
        const pctTotal = solvedOrCompleted > 0 ? Math.round((r.solved / solvedOrCompleted) * 100) : (completed > 0 ? Math.round((r.solved / completed) * 100) : 0);
        const workloadBase = Math.max(r.assigned, r.solved + r.inProgress + r.pending);
        const effIndividual = workloadBase > 0 ? Math.round((r.solved / workloadBase) * 100) : (r.solved > 0 ? 100 : 0);
        const avgUserTime = formatAdminStatsDuration(r.resolutionTimesMs);
        const roleBadgeClass = isAdmin ? 'is-admin' : (r.areaCode === 'atencion_clientes' ? 'is-atencion' : 'is-soporte');
        return `
                <tr class="${isAdmin ? 'is-admin-row' : ''}">
                  <td style="font-weight:700;color:#64748b;">${idx + 1}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:7px;">
                      ${typeof renderUserColorChip === 'function' ? renderUserColorChip(r.name, r.id) : `<strong>${orderEscape(r.name)}</strong>`}
                    </div>
                  </td>
                  <td><span class="admin-stats-role-pill ${roleBadgeClass}">${isAdmin ? 'Supervisión' : orderEscape(r.role)}</span></td>
                  <td style="text-align:center;font-weight:700;color:#0284c7;">${r.created}</td>
                  <td style="text-align:center;font-weight:700;color:#4f46e5;">${r.assigned}</td>
                  <td style="text-align:center;font-weight:800;color:${isAdmin ? '#0f172a' : '#047857'};">${isAdmin ? (r.solved || '—') : r.solved}</td>
                  <td style="text-align:center;font-weight:700;color:#0d9488;">${r.confirmed}</td>
                  <td style="text-align:center;font-weight:700;color:#d97706;">${r.inProgress}</td>
                  <td style="text-align:center;font-weight:700;color:#dc2626;">${r.pending}</td>
                  <td style="text-align:center;font-size:11.5px;color:#475569;">${r.returned}</td>
                  <td style="text-align:center;font-weight:700;color:#334155;">${r.chatMessages}</td>
                  <td style="text-align:center;font-size:11.5px;font-weight:600;color:#0f172a;">${isAdmin ? 'Supervisión' : avgUserTime}</td>
                  <td style="text-align:right;min-width:155px;">
                    ${isAdmin ? `
                      <div style="font-size:11px;color:#0f172a;font-weight:800;text-align:right;">Supervisión</div>
                      <div class="admin-stats-bar-track"><div class="admin-stats-bar-fill" style="width:100%;background:#0f172a;"></div></div>
                    ` : `
                      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
                        <span style="color:#047857;font-weight:700;">Efec: ${effIndividual}%</span>
                        <span style="font-weight:800;color:#0f172a;">Global: ${pctTotal}%</span>
                      </div>
                      <div class="admin-stats-bar-track"><div class="admin-stats-bar-fill" style="width:${Math.max(pctTotal, effIndividual > 0 ? 6 : 0)}%;"></div></div>
                    `}
                  </td>
                </tr>
              `;
      }).join('') : `<tr><td colspan="13" style="text-align:center;color:#64748b;padding:18px;">Sin registros para los filtros seleccionados.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <!-- SECCIÓN 4: RADIOGRAFÍA INDIVIDUAL POR INTEGRANTE (FICHAS DE DESEMPEÑO) -->
    <div class="admin-stats-section">
      <div class="admin-stats-section-head">
        <div class="admin-stats-section-title">
          <span>🪪</span> Radiografía Individual de Desempeño por Integrante
        </div>
        <span class="admin-stats-section-badge">${resolversList.length} integrantes</span>
      </div>
      <div class="admin-stats-profiles-grid">
        ${resolversList.length ? resolversList.map(r => {
        const isAdmin = r.areaCode === 'administrador';
        const lastActLabel = r.lastActivityAt ? new Date(r.lastActivityAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : 'Sin actividad reciente';

        if (isAdmin) {
          return `
              <div class="admin-stats-profile-card is-admin-profile" style="border-top: 3px solid #0f172a; background: #f8fafc;">
                <div class="admin-stats-profile-top">
                  <div>
                    <div class="admin-stats-profile-name">${typeof renderUserColorChip === 'function' ? renderUserColorChip(r.name, r.id) : `<strong>${orderEscape(r.name)}</strong>`}</div>
                    <span class="admin-stats-profile-role" style="color:#0f172a;font-weight:700;">Supervisión General</span>
                  </div>
                  <span class="admin-stats-load-badge is-ok" style="background:#0f172a;color:#fff;">Supervisión</span>
                </div>
                <div class="admin-stats-profile-kpis" style="grid-template-columns: repeat(3, 1fr);">
                  <div><small>Registrados</small><strong>${r.created}</strong></div>
                  <div><small>Reasignaciones</small><strong>${r.assigned + r.retaken}</strong></div>
                  <div><small>Cerrados</small><strong style="color:#0f172a;">${r.confirmed}</strong></div>
                </div>
                <div style="font-size:11.5px;color:#475569;margin-top:6px;line-height:1.45;">
                  Coordinación de reportes: <b>${r.chatMessages}</b> notas en seguimiento y enlace entre Soporte y Atención.
                </div>
                <div class="admin-stats-profile-foot" style="margin-top:8px;">
                  Última actividad: <strong>${orderEscape(lastActLabel)}</strong>
                </div>
              </div>
            `;
        }

        const workloadBase = Math.max(1, r.solved + r.inProgress + r.pending);
        const wSolved = Math.round((r.solved / workloadBase) * 100);
        const wInProg = Math.round((r.inProgress / workloadBase) * 100);
        const wPend = Math.max(0, 100 - wSolved - wInProg);
        const effInd = (r.assigned > 0 || r.solved > 0) ? Math.round((r.solved / Math.max(r.assigned, r.solved + r.inProgress + r.pending)) * 100) : 0;
        const topCats = Object.entries(r.categories).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const topZones = Object.entries(r.zones).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const avgRes = formatAdminStatsDuration(r.resolutionTimesMs);
        const avgResp = formatAdminStatsDuration(r.firstResponseTimesMs);
        const loadStatus = (r.inProgress + r.pending) >= 5 ? ['Carga Alta', 'is-high'] : ((r.inProgress + r.pending) >= 1 ? ['En atención', 'is-medium'] : (r.solved > 0 || r.created > 0 ? ['Al día', 'is-ok'] : ['Sin pendientes', 'is-idle']));

        return `
            <div class="admin-stats-profile-card">
              <div class="admin-stats-profile-top">
                <div>
                  <div class="admin-stats-profile-name">${typeof renderUserColorChip === 'function' ? renderUserColorChip(r.name, r.id) : `<strong>${orderEscape(r.name)}</strong>`}</div>
                  <span class="admin-stats-profile-role">${orderEscape(r.role)}</span>
                </div>
                <span class="admin-stats-load-badge ${loadStatus[1]}">${loadStatus[0]}</span>
              </div>

              <div class="admin-stats-profile-kpis">
                <div><small>Registrados</small><strong>${r.created}</strong></div>
                <div><small>Asignados</small><strong>${r.assigned}</strong></div>
                <div><small>Solucionados</small><strong style="color:#047857;">${r.solved}</strong></div>
                <div><small>Cerrados</small><strong style="color:#0284c7;">${r.confirmed}</strong></div>
                <div><small>En revisión</small><strong style="color:#d97706;">${r.inProgress}</strong></div>
                <div><small>Pendientes</small><strong style="color:#dc2626;">${r.pending}</strong></div>
              </div>

              <div class="admin-stats-profile-stack-wrap">
                <div class="admin-stats-profile-stack-head">
                  <span>Efectividad: <strong>${effInd}%</strong></span>
                  <span>Notas: <strong>${r.chatMessages}</strong></span>
                </div>
                <div class="admin-stats-stacked-bar">
                  <div style="width:${wSolved}%;background:#059669;" title="Solucionados: ${r.solved}"></div>
                  <div style="width:${wInProg}%;background:#d97706;" title="En revisión: ${r.inProgress}"></div>
                  <div style="width:${wPend}%;background:#ef4444;" title="Pendientes: ${r.pending}"></div>
                </div>
              </div>

              <div class="admin-stats-profile-meta">
                <div><span>⏱️ Tiempo solución:</span> <strong>${avgRes}</strong></div>
                <div><span>⚡ Primer contacto:</span> <strong>${avgResp}</strong></div>
              </div>

              <div class="admin-stats-profile-tags">
                <small>Categorías frecuentes:</small>
                <div class="admin-stats-tag-row">
                  ${topCats.length ? topCats.map(([c, cnt]) => `<span class="admin-stats-mini-tag">${orderEscape(c)} <b>(${cnt})</b></span>`).join('') : '<span class="admin-stats-mini-empty">Sin categorías</span>'}
                </div>
              </div>

              <div class="admin-stats-profile-tags">
                <small>Zonas principales:</small>
                <div class="admin-stats-tag-row">
                  ${topZones.length ? topZones.map(([z, cnt]) => `<span class="admin-stats-mini-tag is-zone">${orderEscape(z)} <b>(${cnt})</b></span>`).join('') : '<span class="admin-stats-mini-empty">Sin zonas</span>'}
                </div>
              </div>

              <div class="admin-stats-profile-foot">
                Última actividad: <strong>${orderEscape(lastActLabel)}</strong>
              </div>
            </div>
          `;
      }).join('') : `<div style="grid-column:1/-1;text-align:center;color:#64748b;padding:20px;">Sin integrantes para este filtro.</div>`}
      </div>
    </div>

    <!-- SECCIÓN 5: DESGLOSE POR CATEGORÍA, ZONA / REGIÓN Y LOCALIDADES CRÍTICAS -->
    <div class="admin-stats-grid-3">
      <div class="admin-stats-section">
        <div class="admin-stats-section-title"><span>📊</span> Distribución por categoría</div>
        <div class="admin-stats-cat-list">
          ${categoriesList.length ? categoriesList.map(([cat, count]) => {
        const catPct = total > 0 ? Math.round((count / total) * 100) : 0;
        const det = categoriesDetailMap[cat] || { solved: 0, pending: 0, returned: 0 };
        const effCat = count > 0 ? Math.round((det.solved / count) * 100) : 0;
        return `
              <div class="admin-stats-cat-row">
                <div class="admin-stats-cat-header">
                  <span>${orderEscape(cat)}</span>
                  <strong>${count} (${catPct}%)</strong>
                </div>
                <div class="admin-stats-cat-sub">
                  <span>✓ ${det.solved} resueltos (${effCat}%)</span>
                  <span>⏳ ${det.pending} activos</span>
                </div>
                <div class="admin-stats-bar-track"><div class="admin-stats-bar-fill" style="width:${catPct}%;"></div></div>
              </div>
            `;
      }).join('') : '<div style="color:#64748b;font-size:12px;">Sin datos de categorías.</div>'}
        </div>
      </div>

      <div class="admin-stats-section">
        <div class="admin-stats-section-title"><span>📍</span> Distribución por zona / región</div>
        <div class="admin-stats-cat-list">
          ${zonesList.length ? zonesList.map(([zone, count]) => {
        const zonePct = total > 0 ? Math.round((count / total) * 100) : 0;
        const det = zonesDetailMap[zone] || { solved: 0, pending: 0 };
        const effZone = count > 0 ? Math.round((det.solved / count) * 100) : 0;
        return `
              <div class="admin-stats-cat-row">
                <div class="admin-stats-cat-header">
                  <span>${orderEscape(zone)}</span>
                  <strong>${count} (${zonePct}%)</strong>
                </div>
                <div class="admin-stats-cat-sub">
                  <span>✓ ${det.solved} resueltos (${effZone}%)</span>
                  <span>⏳ ${det.pending} activos</span>
                </div>
                <div class="admin-stats-bar-track"><div class="admin-stats-bar-fill zone" style="width:${zonePct}%;"></div></div>
              </div>
            `;
      }).join('') : '<div style="color:#64748b;font-size:12px;">Sin datos de zonas.</div>'}
        </div>
      </div>

      <div class="admin-stats-section">
        <div class="admin-stats-section-title"><span>🏘️</span> Localidades con Mayor Incidencia</div>
        <div class="admin-stats-cat-list">
          ${townsList.length ? townsList.map(([town, info]) => {
        const townPct = total > 0 ? Math.round((info.total / total) * 100) : 0;
        const effTown = info.total > 0 ? Math.round((info.solved / info.total) * 100) : 0;
        return `
              <div class="admin-stats-cat-row">
                <div class="admin-stats-cat-header">
                  <span>${orderEscape(town)} <small style="color:#64748b;">(${orderEscape(info.zone)})</small></span>
                  <strong>${info.total} (${townPct}%)</strong>
                </div>
                <div class="admin-stats-cat-sub">
                  <span>✓ ${info.solved} resueltos (${effTown}%)</span>
                  <span>⏳ ${info.pending} pendientes</span>
                </div>
                <div class="admin-stats-bar-track"><div class="admin-stats-bar-fill" style="width:${townPct}%;background:#7c3aed;"></div></div>
              </div>
            `;
      }).join('') : '<div style="color:#64748b;font-size:12px;">Sin datos de localidades.</div>'}
        </div>
      </div>
    </div>
  `;
}

if (typeof window !== 'undefined') {
  window.openOrderTechnicianReport = openOrderTechnicianReport;
  window.loadNotificationOrder = loadNotificationOrder;
  window.ensureOrderVisibleInTable = ensureOrderVisibleInTable;
  window.ensureMatchingDetailKind = ensureMatchingDetailKind;
  window.selectOrderRow = selectOrderRow;
  window.requestCloseOrderReport = requestCloseOrderReport;
  window.closeOrderReportModalDirectly = closeOrderReportModalDirectly;
  window.promptCloseOrderChatDecision = promptCloseOrderChatDecision;
  window.dismissCloseOrderChatDecision = dismissCloseOrderChatDecision;
  window.confirmJustCloseOrderReport = confirmJustCloseOrderReport;
  window.executeChatCloseAction = executeChatCloseAction;
  window.getOrderCurrentUserClosureAction = getOrderCurrentUserClosureAction;
  window.openAdminNetworkStatsModal = openAdminNetworkStatsModal;
  window.renderAdminNetworkStatsContent = renderAdminNetworkStatsContent;
  window.setAdminStatsFilter = setAdminStatsFilter;
  window.refreshAdminNetworkStatsDataset = refreshAdminNetworkStatsDataset;
}

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
  ]
};
const ORDER_CATEGORIES = [...ORDER_CATEGORIES_BY_KIND.physical,...ORDER_CATEGORIES_BY_KIND.network];
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
let orderRowsPerPage = 20;
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
    if (Array.isArray(data.supportUsers)) window.netopsSupportUsers = data.supportUsers;
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
  status: { label: 'Estado', options: [['pendiente', 'Pendiente'], ['en_revision', 'En revisión'], ['revisado', 'Revisado'], ['no_realizado', 'No solucionado'], ['completada', 'Solucionado']] },
  type: { label: 'Tipo', options: [['comunidad', 'Comunidad'], ['torre', 'Torre'], ['troncal', 'Troncal'], ['punto_venta', 'Punto de venta']] },
  priority: { label: 'Prioridad', options: [['muy_alta', 'Muy alta'], ['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']] },
  category: { label: 'Categoría', options: ORDER_CATEGORIES }
};

function orderCategoryLabel(value) {
  return ORDER_CATEGORIES.find(([id]) => id === value)?.[1] || value || 'Sin categoria';
}

function orderCategoriesForKind(kind) {
  return ORDER_CATEGORIES_BY_KIND[kind === 'network' ? 'network' : 'physical'];
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

function renderWOAssignedUserOptions(selectedId = '') {
  const select = document.getElementById('wo-assigned-user');
  if (!select) return;
  const users = Array.isArray(window.netopsSupportUsers) && window.netopsSupportUsers.length
    ? window.netopsSupportUsers
    : (Array.isArray(state.users) ? state.users.filter(u => ['administrador', 'admin'].includes(String(u.role).toLowerCase()) && u.active !== false) : []);

  let html = '<option value="">-- Sin asignar (Todo Soporte) --</option>';
  users.forEach(u => {
    const uid = String(u.id || '').trim();
    const uname = String(u.name || u.username || 'Soporte').trim();
    const isSel = (selectedId && (uid === selectedId || String(u.username || '').trim() === selectedId)) ? 'selected' : '';
    html += `<option value="${orderEscape(uid)}" data-name="${orderEscape(uname)}" ${isSel}>👤 ${orderEscape(uname)}</option>`;
  });
  select.innerHTML = html;
  if (selectedId) select.value = selectedId;
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
  const detailField = document.getElementById('wo-detail')?.closest('.fi');
  const firstModalGrid = document.querySelector('#wo-mo .modal-grid');
  if (firstModalGrid && !document.getElementById('wo-detail-kind')) {
    firstModalGrid.insertAdjacentHTML('beforebegin', '<div class="fi wo-detail-kind-field"><label>Tipo de detalle</label><div id="wo-detail-kind-label" class="wo-detail-kind-readonly">Detalle físico</div><input id="wo-detail-kind" type="hidden" value="physical"></div>');
  }
  if (detailField && !document.getElementById('wo-category')) {
    detailField.insertAdjacentHTML('beforebegin', '<div class="fi wo-category-field"><label>Categoría</label><select id="wo-category" required></select></div>');
    const label = detailField.querySelector('label');
    if (label) label.textContent = 'Detalle específico';
    const textarea = document.getElementById('wo-detail');
    if (textarea) textarea.placeholder = 'Describe exactamente lo que sucede, horario, alcance, equipo o referencia...';
  }
  const duplicateTownField = document.getElementById('wo-town')?.closest('.fi');
  if (duplicateTownField) duplicateTownField.remove();
  document.getElementById('wo-zone')?.closest('.fi')?.classList.add('wo-zone-field');
  const equipmentField = document.getElementById('wo-equipment')?.closest('.fi');
  const equipmentInput = document.getElementById('wo-equipment');
  if (equipmentInput) {
    equipmentInput.readOnly = true;
    equipmentInput.placeholder = 'Se asigna automáticamente al elegir un pueblo';
    equipmentInput.removeAttribute('oninput');
    equipmentInput.removeAttribute('onfocus');
    equipmentInput.removeAttribute('onblur');
  }
  if (equipmentField) equipmentField.classList.add('wo-equipment-readonly');
  const actions = document.querySelector('#wo-mo .card-actions');
  if (actions && !document.getElementById('wo-evidence-zone')) {
    actions.insertAdjacentHTML('beforebegin', `<section id="wo-evidence-zone" class="wo-evidence-zone" tabindex="0">
      <input id="wo-evidence-input" type="file" accept="image/*" multiple hidden onchange="addWOEvidenceFiles(this.files);this.value=''">
      <div class="wo-evidence-copy"><strong>Adjuntar evidencias <span>Opcional</span></strong><small>Arrastra imágenes aquí, selecciónalas o pega una captura con Ctrl + V. Máximo 6.</small></div>
      <label class="btn bgh wo-evidence-button" for="wo-evidence-input">Seleccionar imágenes</label>
      <div id="wo-evidence-preview" class="wo-evidence-preview"></div>
    </section>`);
  }
  bindWOEvidenceEvents();
  syncWODetailKindField(document.getElementById('wo-detail-kind')?.value || activeOrderDetailKind);
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
  const newButton = document.querySelector('.order-new-button');
  if (newButton) newButton.setAttribute('aria-label',`Nuevo ${labels[activeOrderDetailKind].toLowerCase().replace(/s$/,'')}`);
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
        ['pendiente', 'Pendiente (Soporte)'],
        ['resuelto_soporte', 'Resuelto por Soporte'],
        ['devuelto_soporte', 'Devuelto a Soporte'],
        ['completada', 'Solucionado']
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
  void loadOrderPage({scroll:true});
}

function changeOrderPageSize(value) {
  const size = Number(value);
  orderRowsPerPage = [20, 50, 100].includes(size) ? size : 20;
  orderCurrentPage = 1;
  void loadOrderPage();
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
  if (saveButton) saveButton.textContent = 'Guardar detalle';
  document.getElementById('wo-zone').value = n.zone || '';
  // Importante: en órdenes por nodo NO se autollenan coordenadas del nodo.
  // La ubicación de la tabla debe ser solo la que el usuario capture en "Ubicación".
  document.getElementById('wo-equipment-id').value = '';
  document.getElementById('wo-equipment').value = 'Consultando antenas vinculadas...';
  try {
    const data = await fetchDataPage('equipment',{nodeIds:n.id,paged:'1',windowed:'1',limit:100,offset:0});
    mergeOrderLookupRecords('equipment',data.equipment);
  } catch (error) {
    console.warn('No se pudieron consultar las antenas del pueblo',error);
  }
  const linked = getNodeLinkedEquipment(n.id);
  document.getElementById('wo-equipment').value = linked.length
    ? linked.map(item => item.name || item.ip || 'Antena').join(', ')
    : 'Sin antena vinculada';
  if (linked.length === 1) document.getElementById('wo-equipment-id').value = linked[0].id;
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
  const node = getSelectedNodeByHiddenId();
  const eq = getSelectedEquipmentByHiddenId();
  const lines = [];
  if (eq) lines.push(getEquipmentRelationLabel(eq.id));
  if (node) lines.push(getNodeRelationLabel(node.id));
  const newNodeName = document.getElementById('wo-node')?.dataset.newNodeName || '';
  box.classList.toggle('is-new-node',Boolean(newNodeName));
  box.textContent = newNodeName
    ? `Pueblo nuevo listo: “${newNodeName}”. Selecciona su zona y guarda el detalle.`
    : (lines.length ? lines.join(' | ') : 'Selecciona un pueblo registrado o usa la opción “Agregar pueblo”. La antena se asignará automáticamente.');
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
  const prefix = order?.category === 'instalacion' ? 'NEW' : 'DET';
  if (order?.folio) return String(order.folio).replace(/^(DET|NEW)-/i, `${prefix}-`);
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

async function openWO(id = '') {
  editingWOId = id;
  copyingWOFromId = '';
  clearWOForm();
  if (!document.getElementById('wo-phone')) document.getElementById('wo-client')?.closest('.fi')?.insertAdjacentHTML('afterend', '<div class="fi"><label>Numero telefonico <span class="optional-label">Opcional</span></label><input id="wo-phone" type="tel" placeholder="Numero de telefono (opcional)"></div>');
  let selectedAssignee = '';
  if (id) {
    const w = (state.workOrders || []).find(x => x.id === id);
    if (w) {
      try { await ensureOrderRelationRecords(w); } catch (error) { console.warn('No se pudieron cargar las relaciones de la orden',error); }
      const target = getOrderTarget(w);
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
      document.getElementById('wo-equipment-id').value = w.equipmentId || '';
      document.getElementById('wo-equipment').value = w.equipmentName || getOrderEquipment(w)?.name || '';
      document.getElementById('wo-zone').value = w.region || target.zone || '';
      document.getElementById('wo-type').value = w.visitType || 'comunidad';
      document.getElementById('wo-priority').value = w.priority || 'media';
      const report = w.technicianReport || {};
      woEvidencePhotos = [...new Set([...(Array.isArray(report.evidencePhotos) ? report.evidencePhotos : []),report.evidencePhoto].filter(Boolean))].slice(0,6);
    }
  }
  renderWOAssignedUserOptions(selectedAssignee);
  updateWORelationInfo();
  setupOrderControls();
  renderWOEvidencePhotos();
  OM('wo-mo');
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
  let node = findNodeFromInput();
  const equipment = getSelectedEquipmentByHiddenId();
  const typedNode = document.getElementById('wo-node').value.trim();
  const existingWO = editingWOId ? (state.workOrders || []).find(x => x.id === editingWOId) : null;
  const parsed = parseOptionalLocation(document.getElementById('wo-location').value);
  const category = document.getElementById('wo-category')?.value || '';
  const specificDetail = document.getElementById('wo-detail').value.trim();
  const region = document.getElementById('wo-zone').value || node?.zone || equipment?.region || '';
  if (!document.getElementById('wo-client').value.trim()) return showWOFieldError('wo-client','Escribe el nombre del cliente.');
  if (!category) return showWOFieldError('wo-category','Selecciona la categoría del detalle.');
  if (!specificDetail) return showWOFieldError('wo-detail','Escribe el detalle específico del problema.');
  if (!typedNode) return showWOFieldError('wo-node','Busca un pueblo o escribe uno nuevo.');
  if (!node) return showWOFieldError('wo-node','Selecciona un pueblo registrado o pulsa “Agregar pueblo” para crearlo.');
  if (!region) return showWOFieldError('wo-zone','Selecciona la zona del detalle.');
  const effectiveDetail = specificDetail || orderCategoryLabel(category);
  const isNetwork = document.getElementById('wo-detail-kind')?.value === 'network';
  const assignSelect = document.getElementById('wo-assigned-user');
  const assignedUserId = isNetwork ? (assignSelect?.value || '') : '';
  const assignedOption = assignSelect && assignSelect.selectedIndex >= 0 ? assignSelect.options[assignSelect.selectedIndex] : null;
  const assignedUserName = (isNetwork && assignedUserId) ? (assignedOption?.getAttribute('data-name') || assignedOption?.text?.replace(/^👤\s*/, '') || '') : '';

  const payload = {
    clientName: document.getElementById('wo-client').value.trim(),
    clientPhone: document.getElementById('wo-phone')?.value.trim() || '',
    detailLocation: document.getElementById('wo-location').value.trim(),
    category,
    detailKind: isNetwork ? 'network' : 'physical',
    assignedUserId,
    assignedUserName,
    title: effectiveDetail,
    description: specificDetail,
    nodeId: node?.id || '',
    nodeCode: node?.nodeCode || typedNode,
    nodeName: node ? getNodeLabel(node) : typedNode,
    town: node?.town || typedNode,
    region,
    visitType: document.getElementById('wo-type').value,
    priority: document.getElementById('wo-priority').value,
    // Para órdenes de NODO solo guardamos lat/lng cuando el usuario capturó ubicación válida.
    // No usamos la ubicación del nodo porque la orden puede ser de un cliente o referencia distinta.
    lat: parsed.lat || '',
    lng: parsed.lng || '',
    status: existingWO?.status || 'pendiente',
    equipmentId: equipment?.id || '',
    equipmentName: equipment?.name || ''
  };
  const existingReport = existingWO?.technicianReport;
  if (woEvidencePhotos.length || existingReport) {
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
  if (savedOrder.detailKind === 'network' && typeof broadcastNetworkOrderChange === 'function') {
    broadcastNetworkOrderChange(savedOrder, editingWOId ? 'updated' : 'new_order');
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
  CM('wo-mo');
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

function filteredOrders() {
  // La API ya entrega únicamente la categoría activa. Volver a filtrarla aquí
  // ocultaba toda la página cuando un Worker anterior no incluía detailKind.
  return (state.workOrders || []).filter(w => !w.deletedAt);
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
  await loadOrderPage();
}

function getOrderStatusMeta(order) {
  if (order?.status === 'completada') return {label:getOrderCategory(order) === 'instalacion' ? 'Completado' : 'Solucionado',className:'is-done'};
  if (order?.status === 'resuelto_soporte') return {label:'Resuelto por Soporte (Validar)',className:'is-resolving'};
  if (order?.status === 'devuelto_soporte') return {label:'Devuelto a Soporte',className:'is-returned'};
  if (order?.status === 'no_realizado') return {label:'No solucionado',className:'is-unsolved'};
  if (order?.status === 'revisado') return {label:'Revisado',className:'is-reviewed'};
  if (order?.status === 'en_revision') return {label:'En revisión',className:'is-reviewing'};
  return {label:'Pendiente',className:'is-pending'};
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
  return !!order && order.detailKind === 'network' && !order.deletedAt && userHasRole('administrador','admin') &&
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
  if (!pendingOrderReviewDecisionId || !userHasRole('administrador','admin')) return;
  const endpoint = `${typeof API === 'string' ? API : ''}/api/work-orders/review-exit`;
  const payload = new Blob([JSON.stringify({orderId:pendingOrderReviewDecisionId})],{type:'application/json'});
  const sent = typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(endpoint,payload);
  if (!sent) {
    void fetch(endpoint,{method:'POST',body:payload,credentials:'include',keepalive:true}).catch(() => {});
  }
}

async function markWOViewedOnOpen(order) {
  if (!order || order.deletedAt || !userHasRole('administrador','admin')) return false;
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
        <span class="order-review-decision-icon">?</span>
        <span id="order-review-decision-context" class="order-review-decision-context"></span>
        <h2 id="order-review-decision-title">¿Va a atender ahorita el detalle?</h2>
        <p>El detalle ya quedó registrado como visto. Confirma si comenzarás a revisarlo en este momento.</p>
        <div class="order-review-decision-actions"><button type="button" class="btn bc" onclick="saveOrderReviewDecision(true)">Sí, atender ahora</button><button type="button" class="btn bgh" onclick="showOrderReviewReason()">No, ahora no</button></div>
      </div>
      <div id="order-review-decision-reason" hidden>
        <h2>¿Por qué no lo revisará en este momento?</h2>
        <p>El motivo quedará guardado en el seguimiento del detalle.</p>
        <label class="fi"><span>Motivo <em>Obligatorio</em></span><textarea id="order-review-reason" rows="4" placeholder="Escribe el motivo..."></textarea></label>
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
    applyDelete:() => { setDeletedAudit(w, 'elimino orden'); },
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
  const report = order?.technicianReport || {};
  const photos = Array.isArray(report.evidencePhotos) ? report.evidencePhotos.filter(Boolean) : [];
  if (report.evidencePhoto && !photos.includes(report.evidencePhoto)) photos.unshift(report.evidencePhoto);
  return photos;
}

function orderHasViewableReport(order) {
  const report = order?.technicianReport || {};
  const hasDetails = !!(report.solution || report.reason || report.observations || report.materialUsed);
  return hasDetails && getOrderReportPhotos(order).length > 0;
}

async function openOrderTechnicianReport(orderId) {
  let order = (state.workOrders || []).find(item => item.id === orderId && !item.deletedAt);
  if (!order) return notify('No se encontro el detalle solicitado.', 'err');
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
      ${orderReportField('user', completed ? (order.detailKind === 'network' ? 'Resuelto por' : 'Técnico') : 'Capturado por', completed ? (report.completedByName || 'Sin registro') : (order.createdByName || order.createdByUsername || 'Sin registro'))}
      ${order.assignedUserName ? orderReportField('user', 'Asignado a (Soporte)', order.assignedUserName) : ''}
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
    ${visibleFollowUps.length ? `<section class="order-report-block order-follow-up-history"><small>Seguimiento</small>${visibleFollowUps.slice().reverse().map(item => `<div><strong>${orderEscape(item.label || item.action || 'Actualización')}</strong><span>${orderEscape(item.at ? new Date(item.at).toLocaleString('es-MX') : '')}${item.byName ? ` · ${orderEscape(item.byName)}` : ''}</span>${item.note ? `<p>${orderEscape(item.note)}</p>` : ''}</div>`).join('')}</section>` : ''}
    ${materialItems.length ? `<section class="order-report-block"><small>Materiales registrados</small><div class="order-report-materials">${materialItems.map(item => `<span><strong>${orderEscape(item.name || item.nombre || 'Material')}</strong> · ${orderEscape(item.quantity ?? item.cantidad ?? '')} ${orderEscape(item.unit || item.unidad || '')}</span>`).join('')}</div></section>` : ''}
    ${photos.length ? `<section class="order-report-evidence"><small>${completed ? 'Evidencias' : 'Imágenes adjuntas al crear el detalle'}</small><div>${photos.map((photo,index) => `<button type="button" onclick="openOrderReportEvidence('${orderEscape(order.id)}',${index})"><img src="${orderEscape(photo)}" alt="Evidencia ${index + 1}"><span>${index + 1}</span></button>`).join('')}</div></section>` : (completed ? '<div class="order-report-empty">No se adjuntaron evidencias gráficas.</div>' : '')}
    ${!completed ? (order.status === 'resuelto_soporte' ? '<div class="order-report-pending" style="background:#ecfdf5;color:#047857;border-color:#a7f3d0"><strong>✓ Resuelto por Soporte:</strong> En espera de que Atención a clientes confirme la satisfacción con el cliente.</div>' : (order.status === 'devuelto_soporte' ? '<div class="order-report-pending" style="background:#fff1f2;color:#be123c;border-color:#fecdd3"><strong>⚠️ Devuelto a Soporte:</strong> Atención a clientes indicó que el cliente sigue presentando fallas.</div>' : '<div class="order-report-pending">Esta orden sigue pendiente. Se muestran los datos capturados al registrarla.</div>')) : ''}`;
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
  const remoteTotal = Number(pageMeta.total);
  const totalRows = Number.isFinite(remoteTotal) ? remoteTotal : allRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / orderRowsPerPage));
  orderCurrentPage = Math.min(Math.max(orderCurrentPage, 1), totalPages);
  const rangeStart = Number.isFinite(Number(pageMeta.offset)) ? Number(pageMeta.offset) : (orderCurrentPage - 1) * orderRowsPerPage;
  const rangeEnd = Math.min(rangeStart + allRows.length, totalRows);
  const rows = allRows;

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
            const isSoporte = userHasRole('administrador', 'admin');
            const isAtencion = userHasRole('atencion_clientes');
            const currentActor = getCurrentUser();

            let networkQuickActions = '';
            if (w.detailKind === 'network') {
              if (w.status === 'pendiente' || w.status === 'devuelto_soporte' || w.status === 'en_revision') {
                if (isSoporte) {
                  const isAssignedToOther = w.assignedUserId && w.assignedUserId !== currentActor.id;
                  const isCheckingByOther = w.reviewOpenedById && w.reviewOpenedById !== currentActor.id;
                  const canRetake = isAssignedToOther || isCheckingByOther;

                  networkQuickActions = `
                    <button type="button" class="btn net-btn-resolve" onclick="openResolveNetworkModal('${w.id}')" title="Resolver detalle técnico y notificar a Atención a clientes">🔧 Resolver</button>
                    ${canRetake ? `<button type="button" class="btn net-btn-retake" onclick="takeOverNetworkOrder('${w.id}')" title="Retomar este reporte y ponértelo a tu cargo">✋ Retomar</button>` : ''}
                  `;
                } else {
                  networkQuickActions = `<span class="net-pill-waiting" title="En espera de atención técnica por Soporte">⏳ En Soporte</span>`;
                }
              } else if (w.status === 'resuelto_soporte') {
                if (isAtencion || isSoporte) {
                  networkQuickActions = `
                    <button type="button" class="btn net-btn-confirm" onclick="confirmNetworkClientSatisfied('${w.id}')" title="Cliente confirmó servicio: finalizar y cerrar">✓ Conforme</button>
                    <button type="button" class="btn net-btn-return" onclick="openReturnNetworkModal('${w.id}')" title="Cliente no conforme: devolver a Soporte">↩ Devolver</button>
                  `;
                } else {
                  networkQuickActions = `<span class="net-pill-waiting" title="Esperando que Atención a clientes valide con el cliente">⏳ Por validar</span>`;
                }
              }
            }

            return `
              <tr class="${rowReported ? 'order-row-done' : ''}">
                <td data-label="Folio"><strong class="order-folio">${orderEscape(getOrderFolio(w))}</strong></td>
                <td data-label="Zona">${orderEscape(getZoneLabel(target.zone || w.region) || '--')}</td>
                <td data-label="Lugar"><strong>${orderEscape(getOrderPlace(w))}</strong></td>
                <td data-label="Cliente"><strong>${orderEscape(w.clientName || '--')}</strong></td>
                <td data-label="Detalle">
                  <span class="order-category-badge">${orderEscape(orderCategoryLabel(getOrderCategory(w)))}</span>
                  ${w.description ? `<div>${orderEscape(w.description)}</div>` : (w.title && w.title !== orderCategoryLabel(getOrderCategory(w)) ? `<div>${orderEscape(w.title)}</div>` : '')}
                  <div class="order-assignment-tags" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px;">
                    ${w.assignedUserName ? `<span class="order-assigned-badge" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:2px 7px;border-radius:12px;background:#e0f2fe;color:#0369a1;" title="Asignado a ${orderEscape(w.assignedUserName)}">👤 ${orderEscape(w.assignedUserName)}</span>` : ''}
                    ${w.reviewOpenedByName && !['completada','no_realizado'].includes(w.status) ? `<span class="order-checking-badge" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:2px 7px;border-radius:12px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;" title="Abierto para checar: ${orderEscape(w.reviewOpenedByName)} (${orderEscape(orderReviewOpenedSummary(w))})">👀 ${w.reviewOpenedById === (currentActor.id || '') ? 'Checándolo tú' : `Checando: ${orderEscape(w.reviewOpenedByName)}`}</span>` : ''}
                  </div>
                </td>
                <td data-label="Tipo">${orderEscape(getOrderDisplayType(w))}</td>
                <td data-label="Prioridad"><span class="priority-badge priority-${orderEscape(w.priority || 'media')}"><span class="priority-dot"></span>${orderEscape(pl(w.priority || 'media'))}</span></td>
                <td data-label="Estado"><span class="order-status-badge ${rowStatus.className}">${rowStatus.label}</span></td>
                <td data-label="Acción">
                  <div class="order-actions">
                    ${networkQuickActions}
                    <button class="btn order-view-report" title="Ver detalle completo" aria-label="Ver detalle completo" onclick="openOrderTechnicianReport('${w.id}')">${orderActionIcon('view')}</button>
                    <button class="btn order-edit-action" title="Editar detalle" aria-label="Editar detalle" onclick="openWO('${w.id}')">${orderActionIcon('edit')}</button>
                    <button class="btn order-delete-action" title="${userHasRole('administrador','admin') ? 'Eliminar detalle' : 'Solicitar eliminar'}" aria-label="${userHasRole('administrador','admin') ? 'Eliminar detalle' : 'Solicitar eliminar'}" onclick="deleteWO('${w.id}')">${orderActionIcon('delete')}</button>
                  </div>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="order-table-footer">
      <div class="order-pagination-nav">
        <button type="button" class="order-page-button" aria-label="Página anterior" onclick="changeOrderPage(${orderCurrentPage - 1})" ${orderCurrentPage === 1 ? 'disabled' : ''}>‹</button>
        <button type="button" class="order-page-button" aria-label="Página siguiente" onclick="changeOrderPage(${orderCurrentPage + 1})" ${orderCurrentPage === totalPages ? 'disabled' : ''}>›</button>
        <span><strong>${totalRows ? rangeStart + 1 : 0}-${rangeEnd}</strong> de <strong>${totalRows}</strong> detalles</span>
        <span class="order-page-indicator">Página ${orderCurrentPage} de ${totalPages}</span>
      </div>
      <label class="order-page-size"><span>Filas por página:</span><select onchange="changeOrderPageSize(this.value)"><option value="20" ${orderRowsPerPage === 20 ? 'selected' : ''}>20</option><option value="50" ${orderRowsPerPage === 50 ? 'selected' : ''}>50</option><option value="100" ${orderRowsPerPage === 100 ? 'selected' : ''}>100</option></select></label>
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
      <img src="${orderEscape(photo)}" alt="Evidencia ${index + 1}">
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
  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle de red.', 'err');

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || 'Soporte';

  // Si nadie lo está checando todavía y el usuario es Soporte, marcar inicio de revisión
  if (!order.reviewOpenedById && userHasRole('administrador', 'admin')) {
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

  const summary = document.getElementById('netres-order-summary');
  const returnFollowUp = (Array.isArray(order.followUps) ? order.followUps : [])
    .slice()
    .reverse()
    .find(f => f.action === 'devuelto_soporte');

  if (summary) {
    const isCheckingByOther = order.reviewOpenedByName && order.reviewOpenedById !== currentUser.id;
    const isAssignedToOther = order.assignedUserId && order.assignedUserId !== currentUser.id;

    summary.innerHTML = `
      ${isCheckingByOther ? `
        <div class="netres-checking-alert" style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;padding:10px 14px;border-radius:10px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div>
            <strong>👀 ${orderEscape(order.reviewOpenedByName)} está checando este detalle</strong>
            <div style="font-size:12px;color:#b45309;">${orderEscape(orderReviewOpenedSummary(order) || 'Iniciado recientemente')}</div>
          </div>
          <button type="button" class="btn" style="background:#f59e0b;color:#fff;font-size:12px;font-weight:800;padding:6px 12px;border-radius:8px;border:none;cursor:pointer;" onclick="takeOverNetworkOrder('${order.id}')">✋ Retomar yo este reporte</button>
        </div>
      ` : (isAssignedToOther ? `
        <div class="netres-reassign-banner" style="background:#f0f9ff;border:1px solid #bae6fd;color:#0369a1;padding:8px 12px;border-radius:8px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <span>Este reporte estaba asignado a <strong>${orderEscape(order.assignedUserName || 'otro compañero')}</strong>. Puedes resolverlo directamente o retomarlo a tu cargo.</span>
          <button type="button" class="btn" style="background:#0284c7;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;border:none;cursor:pointer;" onclick="takeOverNetworkOrder('${order.id}')">✋ Retomar y ponérmelo a mí</button>
        </div>
      ` : '')}
      <div class="netres-summary-row">
        <span><strong>Folio:</strong> ${orderEscape(getOrderFolio(order))}</span>
        <span><strong>Cliente:</strong> ${orderEscape(order.clientName || 'Sin nombre')}</span>
      </div>
      <div class="netres-summary-row">
        <span><strong>Asignado a:</strong> ${orderEscape(order.assignedUserName || 'Todo el equipo de Soporte')}</span>
        <span><strong>Reportado por:</strong> ${orderEscape(order.createdByName || order.createdByUsername || 'Atención a clientes')}</span>
      </div>
      ${order.clientPhone || order.phone ? `
      <div class="netres-summary-row">
        <span><strong>Teléfono:</strong> ${orderEscape(order.clientPhone || order.phone)}</span>
      </div>` : ''}
      <div class="netres-summary-detail">
        <strong>Detalle reportado:</strong> ${orderEscape(order.description || order.title || orderCategoryLabel(getOrderCategory(order)))}
      </div>
      ${order.status === 'devuelto_soporte' && returnFollowUp ? `
        <div class="netres-alert-returned">
          <strong>⚠️ Detalle devuelto por Atención a clientes tras consultar con el cliente:</strong>
          <span>${orderEscape(returnFollowUp.note || 'El cliente indica que continúa la falla.')}</span>
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
  const id = document.getElementById('netres-order-id')?.value;
  const solution = document.getElementById('netres-solution')?.value.trim();
  if (!id) return;
  if (!solution) {
    notify('Describe la solución técnica aplicada.', 'err');
    document.getElementById('netres-solution')?.focus();
    return;
  }

  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle de red.', 'err');

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || 'Soporte';
  const now = new Date().toISOString();

  order.status = 'resuelto_soporte';
  order.updatedAt = now;
  order.updatedById = currentUser.id || '';
  order.assignedUserId = currentUser.id || order.assignedUserId || '';
  order.assignedUserName = userName || order.assignedUserName || '';

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

  appendSharedNetworkFollowUp(order, 'resuelto_soporte', 'Resuelto por Soporte', solution);
  setUpdatedAudit(order, 'resolvió detalle de red');

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
    notify('No se pudo guardar la solución. Intenta nuevamente.', 'err');
    return;
  }

  CM('network-resolve-mo');
  if (typeof broadcastNetworkOrderChange === 'function') {
    broadcastNetworkOrderChange(order, 'resolved');
  }
  notify('Detalle resuelto. Se notificó a Atención a clientes en tiempo real.', 'ok');
  await loadOrderPage();
}

async function takeOverNetworkOrder(id) {
  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle de red.', 'err');

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || 'Soporte';
  const now = new Date().toISOString();
  const prevAssignee = order.assignedUserName || 'Sin asignar';

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

  appendSharedNetworkFollowUp(order, 'retomado', 'Retomado por Soporte', `${userName} retomó este reporte (antes: ${prevAssignee}).`);
  setUpdatedAudit(order, 'retomó detalle de red');

  const ok = await saveRecord('workOrders', order);
  if (!ok) return notify('No se pudo guardar la reasignación. Intenta de nuevo.', 'err');

  if (typeof broadcastNetworkOrderChange === 'function') {
    broadcastNetworkOrderChange(order, 'retaken');
  }

  notify(`Has retomado el reporte #${getOrderFolio(order)}. Ahora está asignado a ti.`, 'ok');

  if (document.getElementById('network-resolve-mo')?.classList.contains('open') && document.getElementById('netres-order-id')?.value === id) {
    openResolveNetworkModal(id);
  }
  renderWOs();
}

function openReturnNetworkModal(id) {
  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle.', 'err');

  document.getElementById('netret-order-id').value = order.id;
  document.getElementById('netret-reason').value = '';

  const summary = document.getElementById('netret-order-summary');
  const solutionText = order.technicianReport?.solution || '';
  if (summary) {
    summary.innerHTML = `
      <div class="netres-summary-row">
        <span><strong>Folio:</strong> ${orderEscape(getOrderFolio(order))}</span>
        <span><strong>Cliente:</strong> ${orderEscape(order.clientName || 'Sin nombre')}</span>
      </div>
      <div class="netres-summary-row">
        <span><strong>Asignado a:</strong> ${orderEscape(order.assignedUserName || 'Todo el equipo de Soporte')}</span>
      </div>
      ${solutionText ? `
        <div class="netres-summary-detail">
          <strong>Solución previa de Soporte:</strong> ${orderEscape(solutionText)}
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
    notify('Escribe qué indicó el cliente o qué persiste.', 'err');
    document.getElementById('netret-reason')?.focus();
    return;
  }

  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle.', 'err');

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || 'Atención a clientes';
  const now = new Date().toISOString();

  order.status = 'devuelto_soporte';
  order.updatedAt = now;
  order.updatedById = currentUser.id || '';

  appendSharedNetworkFollowUp(order, 'devuelto_soporte', 'Devuelto a Soporte (Cliente no conforme)', reason);
  setUpdatedAudit(order, 'devolvió detalle a Soporte tras consultar con cliente');

  const saved = await saveRecord('workOrders', order);
  if (!saved) {
    notify('No se pudo devolver el detalle. Intenta de nuevo.', 'err');
    return;
  }

  CM('network-return-mo');
  if (typeof broadcastNetworkOrderChange === 'function') {
    broadcastNetworkOrderChange(order, 'returned');
  }
  notify('Detalle devuelto a Soporte. Soporte ha sido notificado en tiempo real.', 'warn');
  await loadOrderPage();
}

async function confirmNetworkClientSatisfied(id) {
  const order = (state.workOrders || []).find(x => x.id === id && !x.deletedAt);
  if (!order) return notify('No se encontró el detalle.', 'err');

  const client = order.clientName || 'el cliente';
  const confirmed = await askConfirmation({
    title: '¿Confirmar solución con el cliente?',
    message: `¿Consultaste con ${client} y confirmó que el servicio de red quedó solucionado y funcionando correctamente?`,
    confirmText: '✓ Sí, servicio solucionado',
    cancelText: 'Cancelar',
    tone: 'ok'
  });

  if (!confirmed) return;

  const currentUser = getCurrentUser();
  const userName = currentUser.name || currentUser.username || 'Atención a clientes';
  const now = new Date().toISOString();

  order.status = 'completada';
  order.completedAt = now;
  order.updatedAt = now;
  order.updatedById = currentUser.id || '';

  appendSharedNetworkFollowUp(order, 'completada', 'Finalizado y conforme', 'Cliente confirmó solución satisfactoria. Cerrado por Atención a clientes.');
  setUpdatedAudit(order, 'finalizó detalle conforme con cliente');

  const saved = await saveRecord('workOrders', order);
  if (!saved) {
    notify('No se pudo finalizar la orden.', 'err');
    return;
  }

  if (typeof broadcastNetworkOrderChange === 'function') {
    broadcastNetworkOrderChange(order, 'confirmed');
  }
  notify('Detalle completado y cerrado exitosamente.', 'ok');
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


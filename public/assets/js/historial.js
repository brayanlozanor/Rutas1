let historyPage = 1;
let historyPageSize = 25;
let historyUserDirectory = new Map();
let historyTechnicianAliases = new Set();
let historyLoadSequence = 0;

function historyRemoteParams() {
  const date=document.getElementById('history-date')?.value||historyDateKey();
  const start=new Date(`${date}T00:00:00`); const end=new Date(start); end.setDate(end.getDate()+1);
  return {windowed:'1',offset:(historyPage-1)*historyPageSize,limit:historyPageSize,q:document.getElementById('history-search')?.value.trim()||'',user:document.getElementById('history-user')?.value||'',action:document.getElementById('history-action')?.value||'',from:start.toISOString(),to:end.toISOString()};
}
const historyGlobal=typeof window!=='undefined'?window:globalThis;
const previousHistoryDataPartParams=historyGlobal.netopsGetDataPartParams;
historyGlobal.netopsGetDataPartParams=part=>part==='audit'?historyRemoteParams():previousHistoryDataPartParams?.(part);
async function loadHistoryPage(){const sequence=++historyLoadSequence;try{const params=historyRemoteParams();const data=await fetchDataPage('audit',params);if(sequence!==historyLoadSequence)return;const total=Number(data.total)||0;if(total>0&&Number(params.offset)>=total){historyPage=Math.max(1,Math.ceil(total/historyPageSize));return loadHistoryPage();}state.auditLog=Array.isArray(data.auditLog)?data.auditLog:[];if(Array.isArray(data.users)&&data.users.length)state.users=data.users;if(typeof _previousStateSaved!=='undefined'&&_previousStateSaved)_previousStateSaved.auditLog=cloneData(state.auditLog);window.netopsPageMeta=window.netopsPageMeta||{};window.netopsPageMeta.audit={total,offset:Number(params.offset)||0,limit:historyPageSize,stats:data.stats||{}};populateHistoryFilters();renderHistoryWindow();}catch(error){notify(describeSyncError(error),'err');}}
function resetHistoryPagination(){historyPage=1;void loadHistoryPage();}

function isAttentionHistoryView() {
  return typeof userHasRole === 'function' && userHasRole('atencion_clientes');
}

function historyUserRole(user) {
  return normalizeRole(user?.role || user?.rol || user?.tipo || '');
}

function rebuildHistoryTechnicianAliases() {
  historyTechnicianAliases = new Set();
  const technicianUsers = (state.users || []).filter(user => !user.deletedAt && historyUserRole(user) === 'tecnico');
  technicianUsers.forEach(user => {
    [user.id,user.userId,user.username,user.usuario,user.name,user.nombre].map(normalizeName).filter(Boolean).forEach(alias => historyTechnicianAliases.add(alias));
  });
  (state.technicians || []).filter(tech => !tech.deletedAt).forEach(tech => {
    const linkedAliases = [tech.userId,tech.usuario,tech.username,tech.nombre,tech.name].map(normalizeName).filter(Boolean);
    if (linkedAliases.some(alias => historyTechnicianAliases.has(alias))) {
      [tech.id,...linkedAliases].map(normalizeName).filter(Boolean).forEach(alias => historyTechnicianAliases.add(alias));
    }
  });
}

function historyRowBelongsToTechnician(row) {
  if (normalizeName(row?.byRole) === 'tecnico') return true;
  return [row?.byId,row?.byUsername,row?.byName].map(normalizeName).filter(Boolean).some(alias => historyTechnicianAliases.has(alias));
}

function historyRowBelongsToSupport(row) {
  const role = normalizeRole(row?.byRole || '');
  if (role === 'administrador' || role === 'admin') return true;
  const user = (state.users || []).find(u => u.id === row?.byId || u.username === row?.byUsername);
  if (user && (user.role === 'administrador' || user.role === 'admin')) return true;
  return false;
}

function isDetailCompletionOrResolution(row) {
  const text = normalizeName(String(row?.action || ''));
  // Técnico completando un detalle
  if (/completo|completó|termino|terminó|marco listo|marcó listo|marco detalle hecho|marcó detalle hecho/.test(text)) return true;
  // Soporte resolviendo detalle de red
  if (/resolvio|resolvió|solucion|resuelto/.test(text)) return true;
  return false;
}

function historyRowBelongsToPrincipal(row) {
  return [row?.byUsername,row?.byName].map(normalizeName).some(value=>value==='abraham'||value==='abraham paula iglesias');
}

function historyRowsForViewer() {
  const rows = (state.auditLog || []).filter(row=>!historyRowBelongsToPrincipal(row));
  if (isAttentionHistoryView()) {
    // Atención a clientes solo ve cuando un técnico completa detalles y cuando soporte resuelve uno
    return rows.filter(row => {
      const isTech = historyRowBelongsToTechnician(row);
      const isSupp = historyRowBelongsToSupport(row);
      if (isTech && isDetailCompletionOrResolution(row)) return true;
      if (isSupp && isDetailCompletionOrResolution(row)) return true;
      return false;
    });
  }
  // Soporte / Administrador sigue teniendo acceso a todos
  return rows;
}

function historyDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function historyEscape(value) {
  return typeof escapeHtml === 'function' ? escapeHtml(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function historyActionType(action = '') {
  const text = normalizeName(String(action));
  if (/elimin|borro|borró|quito|quitó|limpio|limpió|retiro|retiró/.test(text)) return 'delete';
  if (/agrego|agregó|creo|creó|registro|registró|vinculo|vinculó/.test(text)) return 'create';
  if (/completo|completó|termino|terminó|solucion|marco listo|marcó listo|marco detalle hecho|marcó detalle hecho/.test(text)) return 'complete';
  return 'update';
}

function historyActionLabel(type) {
  return ({create:'Agregado',update:'Modificado',complete:'Completado',delete:'Eliminado'})[type] || 'Movimiento';
}

function historyActionFilterKey(action = '') {
  const text = normalizeName(String(action || 'movimiento'));
  if (/inicio.*sesion|iniciar.*sesion|acceso.*plataforma/.test(text)) return 'session-login';
  if (/nueva.*instalacion|instalacion.*nueva|registro.*instalacion/.test(text)) return 'new-installation';
  if (/complet.*detalle|detalle.*complet|termino.*detalle/.test(text)) return 'detail-completed';
  if (/detalle.*no.*realizado|reporto.*no.*realizado/.test(text)) return 'detail-not-done';
  return `action:${text}`;
}

function historyActionFilterLabel(key, action = '') {
  const labels = {
    'session-login':'Inició sesión',
    'new-installation':'Registró una instalación nueva',
    'detail-completed':'Completó un detalle',
    'detail-not-done':'Reportó un detalle no realizado'
  };
  return labels[key] || String(action || 'Movimiento').trim();
}

function historyDateBounds() {
  const dateKey = document.getElementById('history-date')?.value || historyDateKey();
  return { from:new Date(`${dateKey}T00:00:00`).getTime(), to:new Date(`${dateKey}T23:59:59.999`).getTime(), fromKey:dateKey, toKey:dateKey };
}

function historyOrderFolio(row) {
  if (!row?.orderId) return '';
  if (typeof getWorkOrderFolio === 'function') {
    return getWorkOrderFolio({id:row.orderId,category:row.orderCategory || ''});
  }
  return row.orderId;
}

function getFilteredHistoryRows() {
  const bounds = historyDateBounds();
  const user = document.getElementById('history-user')?.value || '';
  const action = document.getElementById('history-action')?.value || '';
  const query = normalizeName(document.getElementById('history-search')?.value || '');
  return historyRowsForViewer().filter(row => {
    const time = new Date(row.at || row.createdAt || 0).getTime();
    if (!Number.isFinite(time) || time < bounds.from || time > bounds.to) return false;
    if (user) {
      const allowedAliases = historyUserDirectory.get(user) || new Set([normalizeName(user)]);
      const rowAliases = [row.byId,row.byUsername,row.byName].map(normalizeName).filter(Boolean);
      if (!rowAliases.some(alias => allowedAliases.has(alias))) return false;
    }
    if (action && historyActionFilterKey(row.action) !== action) return false;
    if (query && !normalizeName([row.byName,row.byUsername,row.action,row.targetName,row.targetType,row.targetId,historyOrderFolio(row)].join(' ')).includes(query)) return false;
    return true;
  }).sort((a,b) => new Date(b.at || 0) - new Date(a.at || 0));
}

function populateHistoryFilters() {
  const userSelect = document.getElementById('history-user');
  const actionSelect = document.getElementById('history-action');
  const currentUsers = new Map();
  historyUserDirectory = new Map();
  (state.users || []).filter(user => !user.deletedAt && normalizeName(user.username||user.name)!=='abraham' && normalizeName(user.name)!=='abraham paula iglesias' && (!isAttentionHistoryView() || historyUserRole(user) === 'tecnico')).forEach(user => {
    const name = String(user.name || user.nombre || user.username || '').trim();
    const username = String(user.username || user.usuario || '').trim();
    const fingerprint = normalizeName(username || name);
    if (!fingerprint) return;
    const key = String(user.id || user.userId || username || name).trim();
    const aliases = new Set([user.id,user.userId,username,name].map(normalizeName).filter(Boolean));
    if (currentUsers.has(fingerprint)) {
      const existing = currentUsers.get(fingerprint);
      aliases.forEach(alias => existing.aliases.add(alias));
      return;
    }
    currentUsers.set(fingerprint,{key,name:name || username,aliases});
  });
  const users = [...currentUsers.values()].sort((a,b) => a.name.localeCompare(b.name));
  users.forEach(user => historyUserDirectory.set(user.key,user.aliases));
  userSelect.innerHTML = `<option value="">${isAttentionHistoryView() ? 'Todos los técnicos' : 'Todos los usuarios'}</option>` + users.map(user => `<option value="${historyEscape(user.key)}">${historyEscape(user.name)}</option>`).join('');

  const actions = new Map([
    ['session-login','Inició sesión'],
    ['new-installation','Registró una instalación nueva'],
    ['detail-completed','Completó un detalle'],
    ['detail-not-done','Reportó un detalle no realizado']
  ]);
  historyRowsForViewer().forEach(row => {
    const key = historyActionFilterKey(row.action);
    if (!actions.has(key)) actions.set(key,historyActionFilterLabel(key,row.action));
  });
  actionSelect.innerHTML = '<option value="">Todas las acciones</option>' + [...actions.entries()].map(([key,label]) => `<option value="${historyEscape(key)}">${historyEscape(label)}</option>`).join('');
}

function toggleHistoryAdvancedFilters() {
  const panel = document.getElementById('history-advanced-filters');
  if (!panel) return;
  panel.hidden = !panel.hidden;
  document.querySelectorAll('.history-filter-trigger,.history-more-filters').forEach(button => button.classList.toggle('active',!panel.hidden));
}

function renderHistory(keepPage = false) {
  if (!keepPage) historyPage = 1;
  const rows = getFilteredHistoryRows();
  const counts = {create:0,update:0,complete:0,delete:0};
  rows.forEach(row => counts[historyActionType(row.action)]++);
  const set = (id,value) => { const el=document.getElementById(id); if(el) el.textContent=String(value); };
  set('history-kpi-total', rows.length); set('history-kpi-created', counts.create); set('history-kpi-updated', counts.update); set('history-kpi-completed', counts.complete); set('history-kpi-deleted', counts.delete);
  const bounds = historyDateBounds();
  const format = key => new Date(`${key}T12:00:00`).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'});
  set('history-period-label', bounds.fromKey === bounds.toKey ? format(bounds.fromKey) : `${format(bounds.fromKey)} — ${format(bounds.toKey)}`);
  set('history-results-label', `${rows.length} movimiento${rows.length === 1 ? '' : 's'} encontrado${rows.length === 1 ? '' : 's'}`);
  const pages = Math.max(1, Math.ceil(rows.length / historyPageSize));
  historyPage = Math.min(historyPage, pages);
  const start = (historyPage - 1) * historyPageSize;
  const visible = rows.slice(start, start + historyPageSize);
  const list = document.getElementById('history-list');
  list.innerHTML = visible.length ? visible.map(row => {
    const type = historyActionType(row.action);
    const date = new Date(row.at || row.createdAt || 0);
    const orderFolio = historyOrderFolio(row);
    const reference = orderFolio
      ? `<span class="history-order-folio" title="Identificador interno: ${historyEscape(row.targetId || row.orderId)}">Orden ${historyEscape(orderFolio)}</span>`
      : (row.targetId ? `<small>ID: ${historyEscape(row.targetId)}</small>` : '');
    return `<article class="history-row"><div class="history-time" data-label="Fecha y hora"><strong>${historyEscape(date.toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'}))} ${historyEscape(date.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}))}</strong></div><div class="history-actor" data-label="Usuario"><strong>${historyEscape(row.byName || row.byUsername || 'Usuario')}</strong><small>${historyEscape(row.byUsername || row.byRole || '')}</small></div><div data-label="Acción"><span class="history-action-badge ${type}">${historyActionLabel(type)}</span></div><div class="history-target" data-label="Elemento"><strong>${historyEscape(row.targetType || 'Registro')}</strong><small>${historyEscape(row.targetName || '')}</small></div><div class="history-action-copy" data-label="Detalle"><strong>${historyEscape(row.action || 'Movimiento')}</strong>${reference}</div><strong class="history-row-menu" aria-hidden="true">⋮</strong></article>`;
  }).join('') : '<div class="analytics-empty">No hay movimientos que coincidan con estos filtros.</div>';
  set('history-page-label', rows.length ? `Mostrando ${start + 1}–${Math.min(start + historyPageSize,rows.length)} de ${rows.length}` : '0 resultados');
  set('history-page-number', historyPage);
  document.getElementById('history-prev').disabled = historyPage <= 1;
  document.getElementById('history-next').disabled = historyPage >= pages;
}

function renderHistoryWindow() {
  const requestedPage=historyPage;
  historyPage=1;
  renderHistory(true);
  historyPage=requestedPage;
  const meta=window.netopsPageMeta?.audit||{};
  const total=Number(meta.total)||0;
  const stats=meta.stats||{};
  const offset=Number(meta.offset)||0;
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=String(value);};
  set('history-kpi-total',total);set('history-kpi-created',Number(stats.created)||0);set('history-kpi-updated',Number(stats.updated)||0);set('history-kpi-completed',Number(stats.completed)||0);set('history-kpi-deleted',Number(stats.deleted)||0);
  set('history-results-label',`${total} movimiento${total===1?'':'s'} encontrado${total===1?'':'s'}`);
  set('history-page-label',total?`Mostrando ${offset+1}-${Math.min(offset+(state.auditLog||[]).length,total)} de ${total}`:'0 resultados');
  set('history-page-number',historyPage);
  const pages=Math.max(1,Math.ceil(total/historyPageSize));
  document.getElementById('history-prev').disabled=historyPage<=1;
  document.getElementById('history-next').disabled=historyPage>=pages;
}

function resetHistoryFilters() {
  ['history-user','history-action','history-search'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  const calendar = document.getElementById('history-date');
  if (calendar) calendar.value = historyDateKey();
  resetHistoryPagination();
}

function changeHistoryPage(delta) { historyPage += Number(delta) || 0; void loadHistoryPage(); }
function changeHistoryPageSize(value) { historyPageSize = Number(value) || 25; historyPage = 1; void loadHistoryPage(); }

async function initHistoryPage() {
  initCommon();
  if (!userHasRole('administrador','admin','atencion_clientes')) { location.href='mapa.html'; return; }
  const today = historyDateKey();
  document.getElementById('history-date').value = today;
  await loadDB({ loadingTitle:'Cargando historial', loadingSubtitle:'Consultando los movimientos registrados.' });
  rebuildHistoryTechnicianAliases();
  if (isAttentionHistoryView()) {
    const eyebrow = document.querySelector('.history-eyebrow');
    const heading = document.querySelector('.history-heading h1');
    const copy = document.querySelector('.history-heading p');
    const search = document.getElementById('history-search');
    if (eyebrow) eyebrow.textContent = 'Operación / Detalles resueltos';
    if (heading) heading.textContent = 'Historial de detalles completados';
    if (copy) copy.textContent = 'Consulta los detalles completados por técnicos y los resueltos por soporte técnico.';
    if (search) search.placeholder = 'Buscar técnico, soporte, folio o cliente...';
  }
  populateHistoryFilters();
  renderHistoryWindow();
}

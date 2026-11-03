let editingUserId = null;
let userCurrentPage = 1;
const userPageSize = 20;
let userLoadSequence = 0;

function userRemoteParams() {
  return {windowed:'1',offset:(userCurrentPage-1)*userPageSize,limit:userPageSize,q:document.getElementById('user-search')?.value.trim()||'',role:document.getElementById('user-filter-role')?.value||'all'};
}
const previousUserDataPartParams=window.netopsGetDataPartParams;
window.netopsGetDataPartParams=part=>part==='people'?userRemoteParams():previousUserDataPartParams?.(part);

async function loadUserPage() {
  const sequence=++userLoadSequence;
  try {
    const params=userRemoteParams();
    const data=await fetchDataPage('people',params);
    if(sequence!==userLoadSequence)return false;
    const total=Number(data.total)||0;
    if(total>0&&Number(params.offset)>=total){userCurrentPage=Math.max(1,Math.ceil(total/userPageSize));return loadUserPage();}
    state.users=Array.isArray(data.users)?data.users:[];
    state.technicians=Array.isArray(data.technicians)?data.technicians:[];
    if(typeof _previousStateSaved!=='undefined'&&_previousStateSaved){_previousStateSaved.users=cloneData(state.users);_previousStateSaved.technicians=cloneData(state.technicians);}
    window.netopsPageMeta=window.netopsPageMeta||{};
    window.netopsPageMeta.people={total,offset:Number(params.offset)||0,limit:userPageSize,stats:data.stats||{}};
    renderUsuarios();
    return true;
  } catch(error) { notify(describeSyncError(error),'err'); return false; }
}
function resetUserPagination(){userCurrentPage=1;void loadUserPage();}
function changeUserPage(page){const next=Number(page);if(!Number.isFinite(next)||next<1)return;userCurrentPage=next;void loadUserPage();}

function userEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
}

function initUsuariosPage() {
  if (!checkAuth()) return;
  if(typeof isPrincipalAdministratorClient!=='function'||!isPrincipalAdministratorClient()){location.href='mapa.html';return;}
  initCommon();
  loadDB({ showOverlay: false, preferCache: true }).then(() => {
    fillUserZoneOptions();
    renderUsuarios();
  });
}

function fillUserZoneOptions(selected = []) {
  const select = document.getElementById('user-zones');
  if (!select) return;
  select.innerHTML = REGS.map(r => `<option value="${r.id}" ${selected.includes(r.id) ? 'selected' : ''}>${r.n}</option>`).join('');
}

function selectedUserZones() {
  return Array.from(document.getElementById('user-zones').selectedOptions).map(opt => opt.value);
}

function normalizeUserRoleValue(role) {
  const clean = normalizeRole(role);
  if (clean === 'admin' || clean === 'administrador') return 'administrador';
  if (clean === 'atencion' || clean === 'atencion_clientes') return 'atencion_clientes';
  if (clean === 'tecnico') return 'tecnico';
  return '';
}

function openUserModal() {
  resetUserForm();
  OM('user-mo');
}

function resetUserForm() {
  editingUserId = null;
  document.getElementById('user-form-title').textContent = 'Agregar usuario';
  ['user-name','user-username','user-password','user-phone','user-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('user-role').value = 'tecnico';
  document.getElementById('user-status').value = 'activo';
  fillUserZoneOptions([]);
}

async function saveUser() {
  const auditCountBefore=Array.isArray(state.auditLog)?state.auditLog.length:0;
  let userToSave=null;
  const payload = {
    name: document.getElementById('user-name').value.trim(),
    username: document.getElementById('user-username').value.trim(),
    password: document.getElementById('user-password').value.trim(),
    phone: document.getElementById('user-phone').value.trim(),
    role: normalizeUserRoleValue(document.getElementById('user-role').value),
    status: document.getElementById('user-status').value,
    zones: selectedUserZones(),
    notes: document.getElementById('user-notes').value.trim()
  };
  if (!payload.name || !payload.username || (!editingUserId && !payload.password) || !payload.role) {
    notify(editingUserId ? 'Captura nombre, usuario y rol.' : 'Captura nombre, usuario, contraseña y rol.', 'err');
    return;
  }
  const exists = (state.users || []).find(user => !user.deletedAt && user.id !== editingUserId && normalizeName(user.username) === normalizeName(payload.username));
  if (exists) {
    notify('Ese nombre de usuario ya existe.', 'err');
    return;
  }
  if (editingUserId) {
    const user = (state.users || []).find(item => item.id === editingUserId);
    if (!user) return;
    if (!payload.password) delete payload.password;
    Object.assign(user, payload, { updatedAt:new Date().toISOString() });
    setUpdatedAudit(user, 'modificó usuario');
    ensureTechnicianMirror(user);
    userToSave=user;
    notify('Usuario actualizado.');
  } else {
    const user = { id: gid('us'), createdAt:new Date().toISOString(), ...payload };
    setCreatedAudit(user, 'creó usuario');
    state.users.push(user);
    ensureTechnicianMirror(user);
    userToSave=user;
    notify('Usuario creado.');
  }
  let ok=await saveRecord('users',userToSave);
  const technician=(state.technicians||[]).find(item=>item.userId===userToSave.id||normalizeName(item.usuario)===normalizeName(userToSave.username));
  if(ok&&technician)ok=await saveRecord('technicians',technician);
  if(ok)for(const audit of (state.auditLog||[]).slice(auditCountBefore))ok=(await saveRecord('auditLog',audit))&&ok;
  if (ok) notify(editingUserId ? 'Usuario actualizado y sincronizado.' : 'Usuario creado y sincronizado.');
  CM('user-mo');
  resetUserForm();
  if(ok) await loadUserPage(); else renderUsuarios();
}

function editUser(id) {
  const user = (state.users || []).find(item => item.id === id && !item.deletedAt);
  if (!user) return;
  editingUserId = id;
  document.getElementById('user-form-title').textContent = 'Editar usuario';
  document.getElementById('user-name').value = user.name || '';
  document.getElementById('user-username').value = user.username || '';
  document.getElementById('user-password').value = '';
  document.getElementById('user-password').placeholder = 'Dejar vacío para conservar la contraseña';
  document.getElementById('user-phone').value = user.phone || '';
  document.getElementById('user-role').value = normalizeUserRoleValue(user.role) || 'tecnico';
  document.getElementById('user-status').value = user.status || 'activo';
  document.getElementById('user-notes').value = user.notes || '';
  fillUserZoneOptions(Array.isArray(user.zones) ? user.zones : []);
  OM('user-mo');
}

async function deleteUser(id) {
  const user = (state.users || []).find(item => item.id === id && !item.deletedAt);
  if (!user) return;
  const confirmed = await askConfirmation({ title:'Eliminar usuario', message:`Se eliminará a ${user.name}.`, confirmText:'Eliminar', cancelText:'Cancelar', tone:'danger' });
  if (!confirmed) return;
  const auditCountBefore=Array.isArray(state.auditLog)?state.auditLog.length:0;
  setDeletedAudit(user, 'eliminó usuario');
  const tech = (state.technicians || []).find(item => item.userId === user.id || item.usuario === user.username);
  if (tech) tech.deletedAt = new Date().toISOString();
  let ok=await saveRecord('users',user);
  if(ok&&tech)ok=await saveRecord('technicians',tech);
  if(ok)for(const audit of (state.auditLog||[]).slice(auditCountBefore))ok=(await saveRecord('auditLog',audit))&&ok;
  if(ok) await loadUserPage(); else renderUsuarios();
  notify('Usuario eliminado.');
}

function userFilters() {
  return {
    query: normalizeName(document.getElementById('user-search')?.value || ''),
    role: document.getElementById('user-filter-role')?.value || 'all'
  };
}

function renderUsuarios() {
  const wrap = document.getElementById('usuarios-grid');
  const totalEl = document.getElementById('user-total');
  const users = (state.users || []).filter(user => !user.deletedAt && normalizeName(user.username)!=='abraham').filter(user => {
    const { query, role } = userFilters();
    if (role !== 'all' && user.role !== role) return false;
    if (!query) return true;
    return [user.name, user.username, user.phone, formatRoleLabel(user.role)].some(val => normalizeName(val).includes(query));
  });
  const meta=window.netopsPageMeta?.people||{};
  const filteredTotal=Number.isFinite(Number(meta.total))?Number(meta.total):users.length;
  if (totalEl) totalEl.textContent = Number.isFinite(Number(meta.stats?.total))?Number(meta.stats.total):(state.users || []).filter(user => !user.deletedAt&&normalizeName(user.username)!=='abraham').length;
  if (!wrap) return;
  if (!users.length) {
    wrap.innerHTML = '<div class="empty-state">No hay usuarios para el filtro actual.</div>';
    return;
  }
  const totalPages=Math.max(1,Math.ceil(filteredTotal/userPageSize));
  wrap.innerHTML = `<div class="list-grid">${users.map(user => `
    <article class="entity-card">
      <div class="entity-title">
        <div>
          <h3>${userEscape(user.name)}</h3>
          <div class="entity-sub">@${userEscape(user.username)}</div>
        </div>
        <span class="badge zone">${userEscape(formatRoleLabel(user.role))}</span>
      </div>
      <div class="meta-list">
        <div class="meta-row"><span>Estatus</span><strong class="user-status ${user.status === 'inactivo' ? 'is-inactive' : 'is-active'}">${userEscape(user.status || 'activo')}</strong></div>
        <div class="meta-row"><span>Teléfono</span><strong>${userEscape(user.phone || '—')}</strong></div>
        <div class="meta-row"><span>Zonas</span><strong>${userEscape((user.zones || []).map(getZoneLabel).join(', ') || '—')}</strong></div>
      </div>
      ${user.notes ? `<div class="help-box" style="background:#f8fbff;border-color:#dbeafe;color:#37516f">${userEscape(user.notes)}</div>` : ''}
      ${renderAuditMeta(user, userEscape)}
      <div class="card-actions">
        <button class="btn bc" onclick="editUser('${user.id}')">Editar</button>
        <button class="btn br" onclick="deleteUser('${user.id}')">Eliminar</button>
      </div>
    </article>`).join('')}</div><div class="inventory-pagination"><span>Mostrando ${filteredTotal?((userCurrentPage-1)*userPageSize)+1:0}-${Math.min(userCurrentPage*userPageSize,filteredTotal)} de ${filteredTotal}</span><div><button class="btn bgh" ${userCurrentPage<=1?'disabled':''} onclick="changeUserPage(${userCurrentPage-1})">Anterior</button><span>Página ${userCurrentPage} de ${totalPages}</span><button class="btn bgh" ${userCurrentPage>=totalPages?'disabled':''} onclick="changeUserPage(${userCurrentPage+1})">Siguiente</button></div></div>`;
}

let editingUserId = null;

function userEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
}

function initUsuariosPage() {
  if (!checkAuth()) return;
  loadDB().then(() => {
    initCommon();
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
  if (clean === 'admin') return 'administrador';
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
  if (!payload.name || !payload.username || !payload.password || !payload.role) {
    notify('Captura nombre, usuario, contraseña y rol.', 'err');
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
    Object.assign(user, payload, { updatedAt:new Date().toISOString() });
    ensureTechnicianMirror(user);
    notify('Usuario actualizado.');
  } else {
    const user = { id: gid('us'), createdAt:new Date().toISOString(), ...payload };
    state.users.push(user);
    ensureTechnicianMirror(user);
    notify('Usuario creado.');
  }
  const ok = await saveDB();
  if (ok) notify(editingUserId ? 'Usuario actualizado y sincronizado.' : 'Usuario creado y sincronizado.');
  CM('user-mo');
  resetUserForm();
  renderUsuarios();
}

function editUser(id) {
  const user = (state.users || []).find(item => item.id === id && !item.deletedAt);
  if (!user) return;
  editingUserId = id;
  document.getElementById('user-form-title').textContent = 'Editar usuario';
  document.getElementById('user-name').value = user.name || '';
  document.getElementById('user-username').value = user.username || '';
  document.getElementById('user-password').value = user.password || '';
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
  if (!confirm(`¿Eliminar al usuario ${user.name}?`)) return;
  user.deletedAt = new Date().toISOString();
  const tech = (state.technicians || []).find(item => item.userId === user.id || item.usuario === user.username);
  if (tech) tech.deletedAt = new Date().toISOString();
  await saveDB();
  renderUsuarios();
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
  const users = (state.users || []).filter(user => !user.deletedAt).filter(user => {
    const { query, role } = userFilters();
    if (role !== 'all' && user.role !== role) return false;
    if (!query) return true;
    return [user.name, user.username, user.phone, formatRoleLabel(user.role)].some(val => normalizeName(val).includes(query));
  });
  if (totalEl) totalEl.textContent = (state.users || []).filter(user => !user.deletedAt).length;
  if (!wrap) return;
  if (!users.length) {
    wrap.innerHTML = '<div class="empty-state">No hay usuarios para el filtro actual.</div>';
    return;
  }
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
        <div class="meta-row"><span>Estatus</span><strong>${userEscape(user.status || 'activo')}</strong></div>
        <div class="meta-row"><span>Teléfono</span><strong>${userEscape(user.phone || '—')}</strong></div>
        <div class="meta-row"><span>Zonas</span><strong>${userEscape((user.zones || []).map(getZoneLabel).join(', ') || '—')}</strong></div>
      </div>
      ${user.notes ? `<div class="help-box" style="background:#f8fbff;border-color:#dbeafe;color:#37516f">${userEscape(user.notes)}</div>` : ''}
      <div class="card-actions">
        <button class="btn bc" onclick="editUser('${user.id}')">Editar</button>
        <button class="btn br" onclick="deleteUser('${user.id}')">Eliminar</button>
      </div>
    </article>`).join('')}</div>`;
}

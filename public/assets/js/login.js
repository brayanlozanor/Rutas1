function togglePassword(button){
  const input = document.getElementById('password');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  if (button) {
    button.classList.toggle('is-visible', show);
    button.setAttribute('aria-label', show ? 'Ocultar contrasena' : 'Mostrar contrasena');
    button.setAttribute('title', show ? 'Ocultar contrasena' : 'Mostrar contrasena');
  }
}

document.getElementById('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!username || !password) {
    notify('Ingresa usuario y contrasena.', 'err');
    return;
  }
  try {
    delayedLoading('Entrando...', 'Validando acceso.', 350);
    const res = await fetch(`${API}/api/login?t=${Date.now()}`, {
      cache: 'no-store',
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 401) throw createApiError(res, data, 'el inicio de sesion');
    if (!res.ok || !data.success) {
      notify(data.message || 'Usuario o contrasena incorrectos.', 'err');
      return;
    }
    localStorage.removeItem('netops_dirty');
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user || {}));
    const role = (data.user?.role || '').toLowerCase();
    location.href = role === 'tecnico' ? 'planificar.html' : 'dashboard.html';
  } catch (error) {
    notify(typeof describeSyncError === 'function' ? describeSyncError(error) : `Error de conexion: ${error?.message || error}`, 'err');
  } finally {
    stopDelayedLoading();
  }
});

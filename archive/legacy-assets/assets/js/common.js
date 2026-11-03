(() => {
    const fallbackApi = 'https://netops-api.asistencias.workers.dev';
    const host = location.hostname.replace(/\.+$/, '');
    window.API = host === 'netops-api.asistencias.workers.dev' ? location.origin : fallbackApi;
})();

const ROLE_PAGE_ACCESS = {
    atencion_clientes: new Set(['mapa.html', 'nodos.html', 'ordenes.html', '']),
    tecnico: new Set(['tecnico-ruta.html', 'login.html'])
};

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}') || {};
    } catch (e) {
        return {};
    }
}

function normalizeRole(role) {
    return String(role || '').trim().toLowerCase();
}

function getCurrentPageName() {
    const current = (location.pathname.split('/').pop() || '').toLowerCase();
    if (!current) return 'mapa.html';
    return current.includes('.') ? current : `${current}.html`;
}

function userHasRole(...roles) {
    const role = normalizeRole(getCurrentUser().role);
    return roles.map(normalizeRole).includes(role);
}

function canAccessCurrentPage() {
    const role = normalizeRole(getCurrentUser().role);
    const allowed = ROLE_PAGE_ACCESS[role];
    if (!allowed) return true;
    return allowed.has(getCurrentPageName());
}

function checkAuth() {
    const current = getCurrentPageName();
    if (current === 'login.html' || current === 'tecnico-ruta.html') return true;
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    if (!canAccessCurrentPage()) {
        window.location.href = 'mapa.html';
        return false;
    }
    return true;
}

function logout() {
    openLogoutModal();
}

function confirmLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function ensureLogoutModal() {
    let modal = document.getElementById('logout-confirm-mo');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'logout-confirm-mo';
    modal.className = 'mo logout-confirm-mo';
    modal.innerHTML = `
        <div class="logout-card" role="dialog" aria-modal="true" aria-labelledby="logout-title">
            <div class="logout-icon">Salir</div>
            <div class="logout-copy">
                <h2 id="logout-title">Cerrar sesion</h2>
                <p>Se cerrara el acceso en este navegador. Tus cambios guardados quedan sincronizados en la nube.</p>
            </div>
            <div class="logout-actions">
                <button class="btn bgh" onclick="CM('logout-confirm-mo')">Cancelar</button>
                <button class="btn br" onclick="confirmLogout()">Cerrar sesion</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', event => {
        if (event.target === modal) CM('logout-confirm-mo');
    });
    return modal;
}

function openLogoutModal() {
    ensureLogoutModal();
    OM('logout-confirm-mo');
}

function notify(message, type = 'ok') {
    let nt = document.getElementById('nt');
    if (!nt) {
        nt = document.createElement('div');
        nt.id = 'nt';
        nt.className = 'nt';
        document.body.appendChild(nt);
    }
    nt.textContent = message;
    nt.className = `nt show ${type === 'err' ? 'err' : ''}`;
    setTimeout(() => nt.classList.remove('show'), 3000);
}

function OM(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
}

function CM(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
}

function closeTopModal() {
    const openModals = Array.from(document.querySelectorAll('.mo.open'));
    const modal = openModals[openModals.length - 1];
    if (!modal) return false;
    modal.classList.remove('open');
    return true;
}

document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (closeTopModal()) event.preventDefault();
});

function formatRoleLabel(role) {
    return ({
        administrador: 'Administrador',
        admin: 'Administrador',
        atencion_clientes: 'Atencion a clientes',
        tecnico: 'Tecnico'
    })[normalizeRole(role)] || 'Usuario';
}

function ensureSyncPill() {
    const topbar = document.querySelector('.topbar .sbar');
    if (!topbar || topbar.querySelector('[data-sync-status]')) return;
    const pill = document.createElement('div');
    pill.setAttribute('data-sync-status', '');
    pill.className = 'sync-pill warn';
    pill.textContent = 'Cargando...';
    topbar.insertBefore(pill, topbar.firstChild);
}

function hydrateTopbarUser() {
    const user = getCurrentUser();
    document.querySelectorAll('[data-user-name]').forEach(el => {
        el.textContent = user.name ? `${user.name} - ${formatRoleLabel(user.role)}` : 'Sesion activa';
    });
}

function hydrateLogoLinks() {
    document.querySelectorAll('.logo-link').forEach(el => {
        el.setAttribute('href', 'mapa.html');
    });
}

function applyRoleNavigation(role) {
    const allowed = ROLE_PAGE_ACCESS[role];
    if (!allowed) return;
    document.querySelectorAll('.nav .nb').forEach(link => {
        const href = String(link.getAttribute('href') || '').split('?')[0].toLowerCase();
        link.style.display = allowed.has(href) ? '' : 'none';
    });
}

function applyPagePermissions() {
    const role = normalizeRole(getCurrentUser().role);
    applyRoleNavigation(role);

    document.querySelectorAll('[data-hide-for]').forEach(el => {
        const list = String(el.getAttribute('data-hide-for') || '').split(',').map(normalizeRole);
        if (list.includes(role)) el.style.display = 'none';
    });
    if (role === 'atencion_clientes') {
        document.querySelectorAll('[data-admin-only]').forEach(el => el.style.display = 'none');
    }
}

function initCommon() {
    const current = getCurrentPageName();
    if (current === 'tecnico-ruta.html' || current === 'login.html') return;
    if (!checkAuth()) return;
    document.querySelectorAll('.nav .nb').forEach(link => {
        const href = link.getAttribute('href');
        if (href === current) link.classList.add('active');
        else link.classList.remove('active');
    });
    ensureSyncPill();
    hydrateTopbarUser();
    hydrateLogoLinks();
    applyPagePermissions();
}

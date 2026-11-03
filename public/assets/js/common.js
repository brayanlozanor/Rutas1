(() => {
    const host = location.hostname.replace(/\.+$/, '');
    const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    const isFile = location.protocol === 'file:' || !host;
    window.API = isLocalHost ? location.origin : (isFile ? (localStorage.getItem('netops_api_url') || 'https://netops-api.asistencias.workers.dev') : '');
})();

const ROLE_PAGE_ACCESS = {
    atencion_clientes: new Set(['dashboard.html', 'mapa.html', 'nodos.html', 'planificar.html', 'ordenes.html', 'historial.html', '']),
    tecnico: new Set(['planificar.html', 'login.html', 'material.html'])
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

function repairDisplayText(value) {
    let text = String(value ?? '');
    const windows1252 = new Map([
        [0x20ac,0x80],[0x201a,0x82],[0x0192,0x83],[0x201e,0x84],[0x2026,0x85],
        [0x2020,0x86],[0x2021,0x87],[0x02c6,0x88],[0x2030,0x89],[0x0160,0x8a],
        [0x2039,0x8b],[0x0152,0x8c],[0x017d,0x8e],[0x2018,0x91],[0x2019,0x92],
        [0x201c,0x93],[0x201d,0x94],[0x2022,0x95],[0x2013,0x96],[0x2014,0x97],
        [0x02dc,0x98],[0x2122,0x99],[0x0161,0x9a],[0x203a,0x9b],[0x0153,0x9c],
        [0x017e,0x9e],[0x0178,0x9f]
    ]);
    const decodeWindows1252AsUtf8 = input => {
        const bytes = [];
        for (const character of input) {
            const code = character.codePointAt(0);
            if (code <= 0xff) bytes.push(code);
            else if (windows1252.has(code)) bytes.push(windows1252.get(code));
            else return input;
        }
        try {
            return new TextDecoder('utf-8', { fatal:true }).decode(Uint8Array.from(bytes));
        } catch (error) {
            return input;
        }
    };
    const hasMojibake = input => /[\u00c2\u00c3\u00ce\u00cf\u00e2\u00ee\u00f0]/.test(input) || /(?:ï¿½|â€|ðŸ)/.test(input);
    for (let attempt = 0; attempt < 3; attempt += 1) {
        text = text.replace(/(?:\u00ce|\u00ee)(?:\u0094|\u201c|\u201d)/g, '\u0394');
        if (!hasMojibake(text)) break;
        const decoded = decodeWindows1252AsUtf8(text);
        if (decoded === text) break;
        text = decoded;
    }
    return text;
}

function escapeHtml(value) {
    return repairDisplayText(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
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

function isPrincipalAdministratorClient() {
    const user=getCurrentUser();
    return userHasRole('administrador','admin')&&normalizeName(user.username)==='abraham';
}

function canAccessCurrentPage() {
    const role = normalizeRole(getCurrentUser().role);
    const allowed = ROLE_PAGE_ACCESS[role];
    if (!allowed) return true;
    return allowed.has(getCurrentPageName());
}

function checkAuth() {
    const current = getCurrentPageName();
    if (current === 'login.html') return true;
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    if (!canAccessCurrentPage()) {
        const role = normalizeRole(getCurrentUser().role);
        window.location.href = role === 'tecnico' ? 'planificar.html' : 'dashboard.html';
        return false;
    }
    return true;
}

function logout() {
    if (typeof hideLoading === 'function') hideLoading();
    document.getElementById('wifimex-activity')?.classList.remove('show');
    openLogoutModal();
}

async function confirmLogout() {
    try {
        const apiBase = typeof API === 'string' ? API : '';
        await fetch(`${apiBase}/api/logout`, { method:'POST', cache:'no-store', credentials:'same-origin' });
    } catch (error) {
        console.warn('No se pudo cerrar la sesion remota', error);
    } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
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
                <button class="btn bgh" onclick="CM('logout-confirm-mo')">No, cancelar</button>
                <button class="btn br" onclick="confirmLogout()">Sí, cerrar sesión</button>
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
    nt.className = `nt show${type === 'err' ? ' err' : type === 'warn' ? ' warn' : ''}`;
    const technicianNotice = document.documentElement.dataset.role === 'tecnico' || document.body.classList.contains('plan-technician-view');
    document.body.classList.toggle('notification-visible', technicianNotice);
    const delay = type === 'warn' ? 4500 : 3000;
    clearTimeout(nt._hideTimer);
    nt._hideTimer = setTimeout(() => {
        nt.classList.remove('show');
        document.body.classList.remove('notification-visible');
    }, delay);
}

function OM(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
}

function CM(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
}

let adminDetailCompletionContext = null;
let adminDetailCompletionPhotos = [];

function ensureAdminDetailCompletionModal() {
    let modal = document.getElementById('admin-detail-completion-mo');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'admin-detail-completion-mo';
    modal.className = 'mo admin-detail-completion-mo';
    modal.innerHTML = `
        <div class="md admin-detail-completion-card" role="dialog" aria-modal="true" aria-labelledby="admin-detail-completion-title">
            <div class="admin-detail-completion-head">
                <div><h2 id="admin-detail-completion-title">Completar detalle</h2><p id="admin-detail-completion-subtitle">Confirma cómo deseas cerrar esta orden.</p></div>
                <button type="button" class="btn bgh" onclick="CM('admin-detail-completion-mo')" aria-label="Cerrar">×</button>
            </div>
            <div id="admin-detail-completion-choice" class="admin-detail-completion-choice">
                <div class="admin-completion-symbol">✓</div>
                <h3>¿Deseas completar este detalle?</h3>
                <p>Puedes cerrarlo ahora o corroborar y agregar información antes de completarlo.</p>
                <div class="admin-detail-completion-choice-actions">
                    <button type="button" class="btn bg2" onclick="finishAdminDetailCompletion(false)">Completar</button>
                    <button type="button" class="btn bc" onclick="showAdminDetailCompletionForm()">Agregar información</button>
                </div>
            </div>
            <div id="admin-detail-completion-form" class="admin-detail-completion-form" hidden>
                <div id="admin-completion-existing" class="admin-completion-existing"></div>
                <div class="admin-completion-fields">
                    <div id="admin-completion-solution-field" class="fi admin-completion-wide"><label id="admin-completion-solution-label">Solución <span>Opcional</span></label><textarea id="admin-completion-solution" rows="3" placeholder="Describe cómo se solucionó"></textarea></div>
                    <div class="fi admin-completion-wide"><label>Observación <span>Opcional</span></label><textarea id="admin-completion-observations" rows="2" placeholder="Notas u observaciones adicionales"></textarea></div>
                </div>
                <div class="admin-completion-evidence" id="admin-completion-paste-zone" tabindex="0">
                    <div><strong id="admin-completion-evidence-title">Evidencias <span>Opcional</span></strong><small id="admin-completion-evidence-help">Sube imágenes o pega una captura con Ctrl + V. Máximo 6.</small></div>
                    <label class="btn bgh">Subir evidencias<input type="file" accept="image/*" multiple hidden onchange="addAdminDetailCompletionFiles(this.files);this.value=''"> </label>
                    <div id="admin-completion-evidence-preview" class="admin-completion-evidence-preview"></div>
                </div>
                <div class="admin-detail-completion-form-actions">
                    <button type="button" class="btn bgh" onclick="showAdminDetailCompletionChoice()">Volver</button>
                    <button type="button" class="btn bc" onclick="finishAdminDetailCompletion(true)">Guardar y completar</button>
                </div>
            </div>
        </div>`;
    modal.addEventListener('click', event => { if (event.target === modal) CM(modal.id); });
    modal.addEventListener('paste', event => {
        if (document.getElementById('admin-detail-completion-form')?.hidden) return;
        const files = Array.from(event.clipboardData?.items || [])
            .filter(item => item.kind === 'file' && /^image\//i.test(item.type))
            .map(item => item.getAsFile()).filter(Boolean);
        if (!files.length) return;
        event.preventDefault();
        addAdminDetailCompletionFiles(files);
    });
    document.body.appendChild(modal);
    return modal;
}

function openAdminDetailCompletion(detail, onComplete, options = {}) {
    const modal = ensureAdminDetailCompletionModal();
    const report = detail?.technicianReport || {};
    const description = String(detail?.description || detail?.desc || '');
    const legacyPhone = description.match(/Tel[eé]fono:\s*([^\n]+)/i)?.[1]?.trim() || '';
    const clientName = detail?.clientName || detail?.customerName || report.clientName || '';
    const clientPhone = detail?.clientPhone || detail?.phone || report.phone || legacyPhone;
    const coordinates = detail?.lat !== undefined && detail?.lng !== undefined && String(detail.lat).trim() && String(detail.lng).trim()
        ? `${detail.lat}, ${detail.lng}`
        : '';
    const detailLocation = detail?.detailLocation || report.location || detail?.location || coordinates;
    const place = detail?.nodeName || detail?.equipmentName || detail?.town || detail?.locationName || '';
    const requested = typeof getWorkOrderRequestedText === 'function'
        ? getWorkOrderRequestedText(detail, 'Sin descripción registrada')
        : (detail?.description || detail?.title || detail?.desc || 'Sin descripción registrada');
    adminDetailCompletionContext = { detail, onComplete, options };
    adminDetailCompletionPhotos = options.freshEvidence ? [] : [...new Set([...(Array.isArray(report.evidencePhotos) ? report.evidencePhotos : []), report.evidencePhoto].filter(Boolean))].slice(0, 6);
    document.getElementById('admin-detail-completion-title').textContent = `Completar ${typeof getWorkOrderFolio === 'function' ? getWorkOrderFolio(detail) : 'detalle'}`;
    document.getElementById('admin-detail-completion-subtitle').textContent = options.subtitle || 'Confirma cómo deseas cerrar esta orden.';
    document.getElementById('admin-completion-existing').innerHTML = `
        <label><small>Nombre <span>Opcional</span></small><input id="admin-completion-name" value="${escapeHtml(clientName)}" placeholder="Nombre del cliente"></label>
        <label><small>Teléfono <span>Opcional</span></small><input id="admin-completion-phone" type="tel" value="${escapeHtml(clientPhone)}" placeholder="Número telefónico"></label>
        <div><small>Lugar</small><strong>${escapeHtml(place || 'Sin lugar registrado')}</strong></div>
        <label><small>Ubicación <span>Opcional</span></small><input id="admin-completion-location" value="${escapeHtml(detailLocation)}" placeholder="Coordenadas, dirección o enlace de Maps"></label>
        <div class="wide"><small>Detalle solicitado</small><strong>${escapeHtml(requested || 'Sin descripción registrada')}</strong></div>`;
    document.getElementById('admin-completion-solution').value = report.solution || '';
    document.getElementById('admin-completion-observations').value = report.observations || '';
    const solutionField = document.getElementById('admin-completion-solution-field');
    solutionField.hidden = Boolean(options.hideSolution);
    solutionField.classList.toggle('hidden', Boolean(options.hideSolution));
    document.getElementById('admin-completion-solution-label').innerHTML = options.solutionLabel || 'Solución <span>Opcional</span>';
    document.getElementById('admin-completion-evidence-title').innerHTML = options.evidenceTitle || 'Evidencias <span>Opcional</span>';
    document.getElementById('admin-completion-evidence-help').textContent = options.evidenceHelp || 'Sube imágenes o pega una captura con Ctrl + V. Máximo 6.';
    if (options.forceInformation) showAdminDetailCompletionForm();
    else showAdminDetailCompletionChoice();
    renderAdminDetailCompletionPhotos();
    OM(modal.id);
}

function showAdminDetailCompletionChoice() {
    const choice = document.getElementById('admin-detail-completion-choice');
    const form = document.getElementById('admin-detail-completion-form');
    if (choice) choice.hidden = false;
    if (form) form.hidden = true;
}

function showAdminDetailCompletionForm() {
    const choice = document.getElementById('admin-detail-completion-choice');
    const form = document.getElementById('admin-detail-completion-form');
    if (choice) choice.hidden = true;
    if (form) form.hidden = false;
    setTimeout(() => document.getElementById('admin-completion-name')?.focus(), 50);
}

function compressAdminDetailCompletionImage(file) {
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

async function addAdminDetailCompletionFiles(fileList) {
    const files = Array.from(fileList || []).filter(file => /^image\//i.test(file.type));
    const available = Math.max(0, 6 - adminDetailCompletionPhotos.length);
    if (!available) return notify('Puedes agregar máximo 6 evidencias.', 'err');
    for (const file of files.slice(0, available)) {
        try { adminDetailCompletionPhotos.push(await compressAdminDetailCompletionImage(file)); }
        catch (error) { notify('No se pudo leer una de las evidencias.', 'err'); }
    }
    if (files.length > available) notify('Sólo se conservaron las primeras 6 evidencias.', 'warn');
    renderAdminDetailCompletionPhotos();
}

function renderAdminDetailCompletionPhotos() {
    const preview = document.getElementById('admin-completion-evidence-preview');
    if (!preview) return;
    preview.innerHTML = adminDetailCompletionPhotos.length
        ? adminDetailCompletionPhotos.map((photo, index) => `<div><img src="${escapeHtml(photo)}" alt="Evidencia ${index + 1}"><button type="button" onclick="removeAdminDetailCompletionPhoto(${index})" aria-label="Quitar evidencia">×</button></div>`).join('')
        : '<p>Sin evidencias agregadas.</p>';
}

function removeAdminDetailCompletionPhoto(index) {
    adminDetailCompletionPhotos.splice(index, 1);
    renderAdminDetailCompletionPhotos();
}

async function finishAdminDetailCompletion(includeInformation) {
    const context = adminDetailCompletionContext;
    if (!context || typeof context.onComplete !== 'function') return CM('admin-detail-completion-mo');
    const options = context.options || {};
    if (options.forceInformation && !includeInformation) {
        showAdminDetailCompletionForm();
        return;
    }
    const solution = options.hideSolution ? '' : (document.getElementById('admin-completion-solution')?.value.trim() || '');
    if (includeInformation && !options.hideSolution && options.requireSolution && !solution) {
        notify(options.solutionError || 'Describe qué se hizo para solucionarlo.', 'err');
        document.getElementById('admin-completion-solution')?.focus();
        return;
    }
    if (includeInformation && options.requireEvidence && !adminDetailCompletionPhotos.length) {
        notify(options.evidenceError || 'Adjunta la captura de confirmación del cliente.', 'err');
        document.getElementById('admin-completion-paste-zone')?.focus();
        return;
    }
    const button = document.querySelector(`button[onclick="finishAdminDetailCompletion(${includeInformation ? 'true' : 'false'})"]`);
    if (button?.disabled) return;
    if (button) {
        button.disabled = true;
        button.dataset.previousText = button.textContent;
        button.textContent = 'Guardando...';
    }
    const now = new Date().toISOString();
    const actor = getCurrentUser();
    const result = includeInformation ? {
        withInformation: true,
        clientName: document.getElementById('admin-completion-name')?.value.trim() || '',
        clientPhone: document.getElementById('admin-completion-phone')?.value.trim() || '',
        detailLocation: document.getElementById('admin-completion-location')?.value.trim() || '',
        technicianReport: {
            ...(context.detail?.technicianReport || {}),
            result: 'terminado',
            ...(options.hideSolution ? {} : { solution }),
            observations: document.getElementById('admin-completion-observations')?.value.trim() || '',
            phone: document.getElementById('admin-completion-phone')?.value.trim() || '',
            location: document.getElementById('admin-completion-location')?.value.trim() || '',
            evidencePhotos: adminDetailCompletionPhotos.slice(),
            evidencePhoto: adminDetailCompletionPhotos[0] || '',
            completedAt: now,
            completedBy: actor.id || '',
            completedByName: actor.name || actor.username || ''
        }
    } : { withInformation: false };
    try {
        const saved = await context.onComplete(result);
        if (saved === false) return;
        CM('admin-detail-completion-mo');
        adminDetailCompletionContext = null;
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = button.dataset.previousText || (includeInformation ? 'Guardar y completar' : 'Completar');
            delete button.dataset.previousText;
        }
    }
}


let evidenceGallery = [];
let evidenceGalleryIndex = 0;
let evidenceZoom = 1;
let evidencePanX = 0;
let evidencePanY = 0;
let isPanningEvidence = false;
let evidencePointerStartX = 0;
let evidencePointerStartY = 0;
let evidenceGalleryVersion = 0;

function ensureEvidenceModal() {
    let modal = document.getElementById('evidence-viewer-mo');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'evidence-viewer-mo';
    modal.className = 'mo evidence-viewer-mo';
    modal.innerHTML = `
        <div class="evidence-viewer-card" role="dialog" aria-modal="true" aria-labelledby="evidence-viewer-title" tabindex="-1">
            <header class="evidence-viewer-head">
                <span class="evidence-viewer-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m5 17 4-4 3 3 3-4 4 5"/></svg></span>
                <div>
                    <h2 id="evidence-viewer-title">Visualizador de evidencia</h2>
                    <p id="evidence-viewer-subtitle">Arrastra para desplazarte sobre la imagen · Rueda o controles para zoom</p>
                </div>
                <button type="button" class="evidence-viewer-close" onclick="closeEvidenceViewer()"><span>Cerrar</span><b aria-hidden="true">×</b></button>
            </header>
            <div class="evidence-viewer-body">
                <div class="evidence-viewer-canvas" id="evidence-viewer-canvas">
                    <img id="evidence-viewer-img" alt="Evidencia fotográfica" draggable="false" ondblclick="toggleEvidenceZoom()" title="Haz doble clic o usa la rueda para zoom · Arrastra para mover">
                </div>
                <button type="button" class="evidence-nav evidence-prev" onclick="stepEvidenceGallery(-1)" aria-label="Foto anterior">&#8249;</button>
                <button type="button" class="evidence-nav evidence-next" onclick="stepEvidenceGallery(1)" aria-label="Foto siguiente">&#8250;</button>
            </div>
            <div class="evidence-viewer-tools">
                <div class="evidence-viewer-position"><span aria-hidden="true"><svg style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></span><strong id="evidence-viewer-count">1 / 1</strong></div>
                <div class="evidence-zoom-tools">
                    <button type="button" onclick="zoomEvidence(-0.25)" title="Alejar" aria-label="Alejar">−</button>
                    <button id="evidence-zoom-value" type="button" onclick="resetEvidenceZoom()" title="Restablecer vista original">100%</button>
                    <button type="button" onclick="zoomEvidence(0.25)" title="Acercar" aria-label="Acercar">+</button>
                </div>
                <div class="evidence-file-tools">
                    <button type="button" onclick="toggleEvidenceFullscreen()" title="Pantalla completa" aria-label="Pantalla completa"><svg style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg></button>
                    <button type="button" onclick="downloadCurrentEvidence()" title="Descargar imagen" aria-label="Descargar imagen"><svg style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
                </div>
            </div>
            <div id="evidence-viewer-thumbs" class="evidence-viewer-thumbs" aria-label="Miniaturas de evidencias"></div>
        </div>`;
    document.body.appendChild(modal);

    modal.addEventListener('click', event => {
        if (event.target === modal) closeEvidenceViewer();
    });

    const canvas = modal.querySelector('.evidence-viewer-canvas');
    if (canvas) {
        canvas.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            isPanningEvidence = true;
            evidencePointerStartX = e.clientX - evidencePanX;
            evidencePointerStartY = e.clientY - evidencePanY;
            try { canvas.setPointerCapture?.(e.pointerId); } catch (_) {}
            canvas.style.cursor = 'grabbing';
        });

        canvas.addEventListener('pointermove', (e) => {
            if (!isPanningEvidence) return;
            evidencePanX = e.clientX - evidencePointerStartX;
            evidencePanY = e.clientY - evidencePointerStartY;
            const img = document.getElementById('evidence-viewer-img');
            if (img) {
                img.style.transform = `translate(${evidencePanX}px, ${evidencePanY}px) scale(${evidenceZoom})`;
            }
        });

        const endPan = (e) => {
            if (isPanningEvidence) {
                isPanningEvidence = false;
                if (canvas) canvas.style.cursor = 'grab';
                try { canvas.releasePointerCapture?.(e.pointerId); } catch (_) {}
            }
        };

        canvas.addEventListener('pointerup', endPan);
        canvas.addEventListener('pointercancel', endPan);
    }

    modal.querySelector('.evidence-viewer-body')?.addEventListener('wheel', event => {
        event.preventDefault();
        zoomEvidence(event.deltaY < 0 ? 0.25 : -0.25);
    }, { passive: false });

    // Navegación rápida por teclado
    modal.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('open')) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closeEvidenceViewer();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            stepEvidenceGallery(-1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            stepEvidenceGallery(1);
        } else if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            zoomEvidence(0.25);
        } else if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            zoomEvidence(-0.25);
        } else if (e.key === '0') {
            e.preventDefault();
            resetEvidenceZoom();
        }
    });

    return modal;
}

function updateEvidenceViewer() {
    const img = document.getElementById('evidence-viewer-img');
    if (img) {
        const currentSrc = evidenceGallery[evidenceGalleryIndex] || '';
        if (img.getAttribute('src') !== currentSrc) img.src = currentSrc;
        img.style.transform = `translate(${evidencePanX}px, ${evidencePanY}px) scale(${evidenceZoom})`;
    }
    const count = document.getElementById('evidence-viewer-count');
    if (count) count.textContent = `${evidenceGalleryIndex + 1} / ${evidenceGallery.length || 1}`;
    const zoomValue = document.getElementById('evidence-zoom-value');
    if (zoomValue) zoomValue.textContent = `${Math.round(evidenceZoom * 100)}%`;
    document.querySelectorAll('.evidence-nav').forEach(button => button.hidden = evidenceGallery.length < 2);
    const thumbs = document.getElementById('evidence-viewer-thumbs');
    if (thumbs) {
        if (thumbs.dataset.galleryVersion !== String(evidenceGalleryVersion)) {
            thumbs.replaceChildren();
            evidenceGallery.forEach((src, index) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.setAttribute('aria-label', `Ver evidencia ${index + 1}`);
                button.onclick = () => selectEvidenceGallery(index);
                const thumb = document.createElement('img');
                thumb.src = src;
                thumb.alt = `Miniatura ${index + 1}`;
                button.appendChild(thumb);
                thumbs.appendChild(button);
            });
            thumbs.dataset.galleryVersion = String(evidenceGalleryVersion);
        }
        Array.from(thumbs.children).forEach((button, index) => button.classList.toggle('active', index === evidenceGalleryIndex));
    }
}

function openEvidenceGallery(items, index = 0) {
    evidenceGallery = (Array.isArray(items) ? items : [items]).filter(Boolean);
    if (!evidenceGallery.length) return notify('No hay evidencia para mostrar.', 'err');
    evidenceGalleryVersion++;
    evidenceGalleryIndex = Math.max(0, Math.min(evidenceGallery.length - 1, Number(index) || 0));
    evidenceZoom = 1;
    evidencePanX = 0;
    evidencePanY = 0;
    const modal = ensureEvidenceModal();
    updateEvidenceViewer();
    modal.classList.add('open');
    modal.querySelector('.evidence-viewer-card')?.focus();
}

function closeEvidenceViewer() {
    const modal = document.getElementById('evidence-viewer-mo');
    if (modal) modal.classList.remove('open');
    if (document.fullscreenElement?.closest?.('#evidence-viewer-mo')) void document.exitFullscreen?.();
    evidenceZoom = 1;
    evidencePanX = 0;
    evidencePanY = 0;
}

function selectEvidenceGallery(index) {
    evidenceGalleryIndex = Math.max(0, Math.min(evidenceGallery.length - 1, Number(index) || 0));
    evidenceZoom = 1;
    evidencePanX = 0;
    evidencePanY = 0;
    updateEvidenceViewer();
}

function stepEvidenceGallery(direction) {
    if (evidenceGallery.length < 2) return;
    evidenceGalleryIndex = (evidenceGalleryIndex + direction + evidenceGallery.length) % evidenceGallery.length;
    evidenceZoom = 1;
    evidencePanX = 0;
    evidencePanY = 0;
    updateEvidenceViewer();
}

function zoomEvidence(delta) {
    evidenceZoom = Math.max(0.5, Math.min(5, evidenceZoom + delta));
    updateEvidenceViewer();
}

function resetEvidenceZoom() {
    evidenceZoom = 1;
    evidencePanX = 0;
    evidencePanY = 0;
    updateEvidenceViewer();
}

function toggleEvidenceZoom() {
    if (evidenceZoom > 1 || evidencePanX !== 0 || evidencePanY !== 0) {
        evidenceZoom = 1;
        evidencePanX = 0;
        evidencePanY = 0;
    } else {
        evidenceZoom = 2;
    }
    updateEvidenceViewer();
}

async function toggleEvidenceFullscreen() {
    const card=document.querySelector('#evidence-viewer-mo .evidence-viewer-card');
    try{if(document.fullscreenElement)await document.exitFullscreen();else await card?.requestFullscreen?.();}catch(error){notify('No se pudo abrir la vista de pantalla completa.','warn');}
}

function downloadCurrentEvidence() {
    const src=evidenceGallery[evidenceGalleryIndex];
    if(!src)return;
    const link=document.createElement('a');link.href=src;link.download=`evidencia-${evidenceGalleryIndex+1}.jpg`;link.target='_blank';link.rel='noopener';document.body.appendChild(link);link.click();link.remove();
}

function openEvidenceModal(src) {
    if (!src) {
        notify('No hay evidencia para mostrar.', 'err');
        return;
    }
    openEvidenceGallery([src], 0);
}

function openEvidenceEncoded(encoded) {
    try {
        openEvidenceModal(decodeURIComponent(encoded || ''));
    } catch (e) {
        openEvidenceModal(encoded || '');
    }
}

function _injectActionConfirmStyles() {
    if (document.getElementById('action-confirm-styles')) return;
    const style = document.createElement('style');
    style.id = 'action-confirm-styles';
    style.textContent = `
        #action-confirm-mo {
            box-sizing: border-box !important;
            position: fixed !important;
            z-index: 2147483000 !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100dvh !important;
            padding: 18px !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: hidden !important;
            isolation: isolate !important;
        }
        @media (min-width: 901px) {
            #action-confirm-mo { height: 125dvh !important; }
        }
        #action-confirm-mo.open { display:flex; animation: acmo-fadein .18s ease; }
        @keyframes acmo-fadein { from { opacity:0; } to { opacity:1; } }
        .action-confirm-card {
            background: #fff;
            border-radius: 20px;
            padding: 32px 28px 24px;
            width: min(420px, 94vw);
            box-shadow: 0 24px 64px rgba(15,23,42,.28), 0 0 0 1px rgba(203,213,225,.6);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            text-align: center;
            animation: accard-in .22s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes accard-in { from { transform: scale(.88) translateY(12px); opacity:0; } to { transform: scale(1) translateY(0); opacity:1; } }
        .action-confirm-icon-wrap {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            position: relative;
        }
        .action-confirm-icon-wrap.danger {
            background: rgba(231,76,60,.12);
            color: #e74c3c;
        }
        .action-confirm-icon-wrap.ok {
            background: rgba(46,204,113,.12);
            color: #27ae60;
        }
        .action-confirm-icon-wrap::after {
            content: '';
            position: absolute;
            inset: -6px;
            border-radius: 50%;
            border: 2px solid currentColor;
            opacity: .25;
            animation: acring 1.6s ease-in-out infinite;
        }
        @keyframes acring { 0%,100% { transform:scale(1); opacity:.25; } 50% { transform:scale(1.12); opacity:.08; } }
        .action-confirm-copy h2 {
            font-size: 17px;
            font-weight: 800;
            color: #1e293b;
            margin-bottom: 6px;
        }
        .action-confirm-copy p {
            font-size: 13px;
            color: #64748b;
            font-weight: 600;
            line-height: 1.55;
            max-width: 320px;
        }
        .action-confirm-actions {
            display: flex;
            gap: 10px;
            width: 100%;
            justify-content: center;
            margin-top: 4px;
        }
        .action-confirm-actions .btn {
            flex: 1;
            max-width: 160px;
            padding: 11px 16px;
            font-size: 12px;
            font-weight: 800;
            border-radius: 10px;
            transition: all .15s;
        }
        .action-confirm-actions .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.15); }
        .action-confirm-actions .btn-cancel-confirm {
            background: #f1f5f9;
            color: #475569;
            border: none;
        }
        .action-confirm-actions .btn-cancel-confirm:hover { background: #e2e8f0; }
        .action-confirm-actions .btn-ok-danger {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: #fff;
            border: none;
            box-shadow: 0 4px 14px rgba(239,68,68,.35);
        }
        .action-confirm-actions .btn-ok-success {
            background: linear-gradient(135deg, #22c55e, #16a34a);
            color: #fff;
            border: none;
            box-shadow: 0 4px 14px rgba(34,197,94,.35);
        }
        .action-confirm-card {
            width:min(560px,calc(100vw - 30px));
            padding:24px 30px 26px;
            display:grid;
            grid-template-columns:72px minmax(0,1fr);
            align-items:center;
            gap:18px 22px;
            border:1px solid rgba(222,55,65,.18);
            border-radius:24px;
            text-align:left;
        }
        .action-confirm-icon-wrap { width:68px; height:68px; grid-row:1; border:2px solid rgba(231,76,60,.2); }
        .action-confirm-copy h2 { margin:0 0 7px; color:#102b50; font-size:22px; }
        .action-confirm-copy p { max-width:none; margin:0; color:#687b92; font-size:12px; }
        .action-confirm-actions { grid-column:1/-1; display:grid; grid-template-columns:1fr 1fr; gap:16px; width:100%; margin-top:2px; padding-top:18px; border-top:1px solid #e2eaf2; }
        .action-confirm-actions .btn { max-width:none; min-height:50px; border-radius:11px; }
        @media(max-width:560px){.action-confirm-card{grid-template-columns:58px minmax(0,1fr);padding:20px}.action-confirm-icon-wrap{width:56px;height:56px}.action-confirm-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
}

function ensureActionConfirmModal() {
    _injectActionConfirmStyles();
    let modal = document.getElementById('action-confirm-mo');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'action-confirm-mo';
    modal.className = 'mo action-confirm-mo';
    modal.innerHTML = `
        <div class="action-confirm-card" role="dialog" aria-modal="true">
            <div class="action-confirm-icon-wrap danger" id="action-confirm-icon-wrap">
                <span id="action-confirm-icon">🗑️</span>
            </div>
            <div class="action-confirm-copy">
                <h2 id="action-confirm-title">Confirmar accion</h2>
                <p id="action-confirm-message"></p>
            </div>
            <div class="action-confirm-actions">
                <button class="btn btn-cancel-confirm" id="action-confirm-cancel" type="button">Cancelar</button>
                <button class="btn btn-ok-danger" id="action-confirm-ok" type="button">Confirmar</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    return modal;
}

function askConfirmation({ title = 'Confirmar accion', message = '', confirmText = 'Confirmar', cancelText = 'Cancelar', tone = 'danger' } = {}) {
    const modal = ensureActionConfirmModal();
    const titleEl = document.getElementById('action-confirm-title');
    const messageEl = document.getElementById('action-confirm-message');
    const ok = document.getElementById('action-confirm-ok');
    const cancel = document.getElementById('action-confirm-cancel');
    const icon = document.getElementById('action-confirm-icon');
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (ok) {
        ok.textContent = confirmText;
        ok.className = `btn ${tone === 'ok' ? 'bg2' : 'br'}`;
    }
    if (cancel) cancel.textContent = cancelText;
    const iconWrap = document.getElementById('action-confirm-icon-wrap');
    if (icon) icon.textContent = tone === 'ok' ? '✅' : '🗑️';
    if (iconWrap) {
        iconWrap.className = `action-confirm-icon-wrap ${tone === 'ok' ? 'ok' : 'danger'}`;
    }
    if (ok) {
        ok.className = `btn ${tone === 'ok' ? 'btn-ok-success' : 'btn-ok-danger'}`;
    }
    modal.classList.add('open');
    return new Promise(resolve => {
        const done = value => {
            modal.classList.remove('open');
            ok?.removeEventListener('click', onOk);
            cancel?.removeEventListener('click', onCancel);
            modal.removeEventListener('click', onOutside);
            resolve(value);
        };
        const onOk = () => done(true);
        const onCancel = () => done(false);
        const onOutside = event => {
            if (event.target === modal) done(false);
        };
        ok?.addEventListener('click', onOk);
        cancel?.addEventListener('click', onCancel);
        modal.addEventListener('click', onOutside);
    });
}

function ensureActionPromptModal() {
    _injectActionConfirmStyles();
    let modal = document.getElementById('action-prompt-mo');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'action-prompt-mo';
    modal.className = 'mo action-confirm-mo';
    modal.innerHTML = `
        <div class="action-confirm-card" role="dialog" aria-modal="true" style="border-color:rgba(239,68,68,.3);max-width:540px">
            <div class="action-confirm-icon-wrap danger" id="action-prompt-icon-wrap" style="background:#fff1f2;border:2px solid #fecdd3;color:#e11d48;font-size:24px;display:grid;place-items:center">
                <span>↩️</span>
            </div>
            <div class="action-confirm-copy" style="width:100%">
                <h2 id="action-prompt-title" style="color:#0f172a;margin:0 0 6px">Devolver a soporte</h2>
                <p id="action-prompt-message" style="color:#64748b;margin:0">Indica el motivo por el cual no estás de acuerdo con el material o cantidades indicadas:</p>
                <div style="margin-top:12px">
                    <textarea id="action-prompt-input" rows="3" placeholder="Escribe el motivo aquí..." style="width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;font-size:13px;font-family:inherit;resize:vertical;outline:none"></textarea>
                </div>
            </div>
            <div class="action-confirm-actions">
                <button class="btn btn-cancel-confirm" id="action-prompt-cancel" type="button">Cancelar</button>
                <button class="btn btn-ok-danger" id="action-prompt-ok" type="button" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff">Devolver a soporte</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    return modal;
}

function askReasonPrompt({ title = 'Devolver a soporte', message = '', placeholder = 'Indica el motivo...', confirmText = 'Devolver a soporte', cancelText = 'Cancelar' } = {}) {
    const modal = ensureActionPromptModal();
    const titleEl = document.getElementById('action-prompt-title');
    const messageEl = document.getElementById('action-prompt-message');
    const inputEl = document.getElementById('action-prompt-input');
    const ok = document.getElementById('action-prompt-ok');
    const cancel = document.getElementById('action-prompt-cancel');
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (inputEl) {
        inputEl.placeholder = placeholder;
        inputEl.value = '';
    }
    if (ok) ok.textContent = confirmText;
    if (cancel) cancel.textContent = cancelText;

    modal.classList.add('open');
    setTimeout(() => inputEl?.focus(), 80);

    return new Promise(resolve => {
        const done = val => {
            modal.classList.remove('open');
            ok?.removeEventListener('click', onOk);
            cancel?.removeEventListener('click', onCancel);
            modal.removeEventListener('click', onOutside);
            resolve(val);
        };
        const onOk = () => {
            const text = (inputEl?.value || '').trim();
            if (!text) {
                if (typeof notify === 'function') notify('Por favor indica el motivo para devolver a soporte.', 'warn');
                inputEl?.focus();
                return;
            }
            done(text);
        };
        const onCancel = () => done(null);
        const onOutside = event => {
            if (event.target === modal) done(null);
        };
        ok?.addEventListener('click', onOk);
        cancel?.addEventListener('click', onCancel);
        modal.addEventListener('click', onOutside);
    });
}

function closeTopModal() {
    const openModals = Array.from(document.querySelectorAll('.mo.open'));
    const modal = openModals[openModals.length - 1];
    if (!modal) return false;
    // Si es el mapa fullscreen del planificador, delegar al cierre especializado para limpiar overflow
    if (modal.id === 'plan-map-fullscreen-mo' && typeof closePlanFullMap === 'function') {
        closePlanFullMap();
        return true;
    }
    if(modal.id==='evidence-viewer-mo'){
        closeEvidenceViewer();
        return true;
    }
    const beforeClose = new CustomEvent('netops:before-modal-close', {
        cancelable: true,
        detail: { reason: 'escape' }
    });
    if (!modal.dispatchEvent(beforeClose)) return true;
    modal.classList.remove('open');
    return true;
}

document.addEventListener('keydown', event => {
    const evidenceOpen = document.getElementById('evidence-viewer-mo')?.classList.contains('open');
    if (evidenceOpen && event.key === 'ArrowLeft') { stepEvidenceGallery(-1); event.preventDefault(); return; }
    if (evidenceOpen && event.key === 'ArrowRight') { stepEvidenceGallery(1); event.preventDefault(); return; }
    if (evidenceOpen && (event.key === '+' || event.key === '=')) { zoomEvidence(0.25); event.preventDefault(); return; }
    if (evidenceOpen && event.key === '-') { zoomEvidence(-0.25); event.preventDefault(); return; }
    if (event.key === 'Escape' && closeTopModal()) event.preventDefault();
});

document.addEventListener('click',event=>{
    const gallerySelector='.admin-completion-evidence-preview,.wo-evidence-preview,.tech-photo-preview,.tech-install-evidence-preview,.tech-summary-report-photos';
    const image=event.target?.closest?.(`${gallerySelector.split(',').map(selector=>`${selector} img`).join(',')}`);
    if(!image)return;
    const container=image.closest(gallerySelector);
    const images=Array.from(container?.querySelectorAll('img')||[]);
    const gallery=images.map(item=>item.getAttribute('src')||item.src).filter(Boolean);
    const index=Math.max(0,images.indexOf(image));
    if(gallery.length)openEvidenceGallery(gallery,index);
});

// Bloquear la transicion del sidebar al cargar/cambiar de pestana para que no se mueva
(function() {
    document.documentElement.classList.add('no-sidebar-transition');
    const remove = () => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.documentElement.classList.remove('no-sidebar-transition');
            });
        });
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', remove);
    } else {
        remove();
    }
    // Al volver a la pestana (visibilitychange), bloquear transicion brevemente
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            document.documentElement.classList.add('no-sidebar-transition');
            remove();
        }
    });
})();

function formatRoleLabel(role) {
    return ({
        administrador: 'Administrador',
        admin: 'Administrador',
        atencion_clientes: 'Atencion a clientes',
        tecnico: 'Tecnico'
    })[normalizeRole(role)] || 'Usuario';
}

function ensureSyncPill() {
    // Ya no mostramos estado permanente en la barra; las cargas largas usan overlay y los errores usan notificacion.
    return;
}

function hydrateTopbarUser() {
    const user = getCurrentUser();
    document.querySelectorAll('[data-user-name]').forEach(el => {
        el.replaceChildren();
        const name = document.createElement('strong');
        name.className = 'sidebar-user-name';
        name.textContent = user.name || user.username || 'Sesion activa';
        const role = document.createElement('small');
        role.className = 'sidebar-user-role';
        role.textContent = formatRoleLabel(user.role);
        el.append(name, role);
    });
}

function openEvidenceGalleryEncoded(encoded,index=0) {
    try{openEvidenceGallery(JSON.parse(decodeURIComponent(encoded||'')),index);}catch(error){openEvidenceEncoded(encoded);}
}

function hydrateLogoLinks() {
    document.querySelectorAll('.logo-link').forEach(el => {
        el.setAttribute('href', 'mapa.html');
    });
}

const NAV_ITEMS = [
    { href: 'dashboard.html', adminOnly: true, icon: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/><path d="m3 8 6-5 6 7 6-5"/></svg>', label: 'Dashboard' },
    { href: 'mapa.html', icon: '<svg viewBox="0 0 24 24"><path d="m3 6 5-2 8 3 5-2v13l-5 2-8-3-5 2Z"/><path d="M8 4v13M16 7v13"/></svg>', label: 'Mapa Mikrotiks' },
    { href: 'antenas.html', icon: '<img src="assets/icons/antenna-module-256-v1.png" alt="">', label: 'Antenas' },
    { href: 'nodos.html', icon: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>', label: 'Pueblos' },
    { href: 'planificar.html', icon: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>', label: 'Planificar' },
    { href: 'ordenes.html?detailKind=network', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M12 7v4M5 16v-3h14v3"/></svg>', label: 'Detalles de red' },
    { href: 'ordenes.html?detailKind=physical', icon: '<svg viewBox="0 0 24 24"><path d="M14 6a4 4 0 0 0-5 5L3 17l4 4 6-6a4 4 0 0 0 5-5l-3 3-4-4z"/></svg>', label: 'Detalles físicos' },
    { href: 'material.html', icon: '<svg viewBox="0 0 24 24"><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="m4 7v10l8 4 8-4V7M12 11v10"/></svg>', label: 'Material' },
    { href: 'historial.html', adminOnly: true, icon: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>', label: 'Historial' },
    { href: 'tecnicos.html', principalOnly: true, icon: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>', label: 'Usuarios' }
];

function buildNavigationHtml() {
    return NAV_ITEMS.map(item => `<a href="${item.href}" class="nb">${item.label}</a>`).join('');
}

function ensureAppTopbar() {
    if (!document.body || document.body.classList.contains('tech-route-body')) return;
    let topbar = document.querySelector('.topbar');
    if (!topbar) {
        topbar = document.createElement('div');
        topbar.className = 'topbar';
        topbar.innerHTML = `
            <a href="mapa.html" class="logo-link"><div class="logo">WiFi<span>Mex</span></div></a>
            <nav class="nav">${buildNavigationHtml()}</nav>
            <div class="sbar">
                <div class="user-pill" data-user-name>Sesion activa</div>
                <button class="btn bgh" type="button" onclick="logout()">Cerrar sesion</button>
            </div>`;
        document.body.insertBefore(topbar, document.body.firstChild);
        return;
    }
    if (!topbar.querySelector('.logo-link')) {
        topbar.insertAdjacentHTML('afterbegin', '<a href="mapa.html" class="logo-link"><div class="logo">WiFi<span>Mex</span></div></a>');
    }
    if (!topbar.querySelector('.nav')) {
        const sbar = topbar.querySelector('.sbar');
        const nav = document.createElement('nav');
        nav.className = 'nav';
        nav.innerHTML = buildNavigationHtml();
        topbar.insertBefore(nav, sbar || null);
    }
    if (!topbar.querySelector('.sbar')) {
        topbar.insertAdjacentHTML('beforeend', `
            <div class="sbar">
                <div class="user-pill" data-user-name>Sesion activa</div>
                <button class="btn bgh" type="button" onclick="logout()">Cerrar sesion</button>
            </div>`);
    }
    const nav = topbar.querySelector('.nav');
    if (nav) {
        nav.querySelectorAll('a[href="ordenes.html"], a[href="ordenes.html/"]').forEach(l => l.remove());
        NAV_ITEMS.forEach(item => {
            let link = nav.querySelector(`a[href="${item.href}"]`);
            if (!link) {
                link = document.createElement('a');
                link.href = item.href;
                link.className = 'nb';
                link.textContent = item.label;
            }
            nav.appendChild(link);
        });
    }
}

// ========================================================
// SISTEMA DE TEMA (MODO OSCURO / CLARO) - TELECOM NOC
// ========================================================
(function initThemeEarly() {
    if (typeof window === 'undefined') return;
    try {
        const saved = localStorage.getItem('netops_theme');
        const theme = saved || 'light';
        document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {}
})();

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('netops_theme', next); } catch (e) {}
    updateThemeToggleButtons();
}

function updateThemeToggleButtons() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const sunSvg = `<svg class="theme-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const moonSvg = `<svg class="theme-svg" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    document.querySelectorAll('.btn-theme-toggle').forEach(btn => {
        const iconSlot = btn.querySelector('.theme-icon-slot');
        const labelSlot = btn.querySelector('.theme-label-slot');
        if (iconSlot) iconSlot.innerHTML = isDark ? sunSvg : moonSvg;
        if (labelSlot) labelSlot.textContent = isDark ? 'Modo claro' : 'Modo oscuro';
        btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        btn.title = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    });
}

function ensureThemeToggle() {
    document.querySelectorAll('.topbar .sbar').forEach(sbar => {
        if (!sbar.querySelector('#theme-toggle-btn')) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.id = 'theme-toggle-btn';
            btn.className = 'btn btn-theme-toggle';
            btn.title = 'Alternar modo oscuro / claro';
            btn.setAttribute('aria-label', 'Alternar modo oscuro / claro');
            btn.onclick = toggleTheme;
            btn.innerHTML = `<span class="theme-icon-slot"></span><span class="theme-label-slot">Modo oscuro</span>`;
            sbar.insertBefore(btn, sbar.firstChild);
        }
    });
    updateThemeToggleButtons();
}

function updateActiveNavLink() {
    const current = getCurrentPageName();
    const currentParams = new URLSearchParams(window.location.search);
    let currentKind = currentParams.get('detailKind');
    if (!currentKind && typeof activeOrderDetailKind !== 'undefined') {
        currentKind = activeOrderDetailKind;
    }
    if (!currentKind && current === 'ordenes.html') {
        currentKind = 'network';
    }

    document.querySelectorAll('.nav .nb').forEach(link => {
        const href = String(link.getAttribute('href') || '').trim();
        const [page, query] = href.split('?');
        const linkParams = new URLSearchParams(query || '');

        let isActive = false;
        if (current === 'ordenes.html' && page === 'ordenes.html') {
            const linkKind = linkParams.get('detailKind');
            if (linkKind) {
                isActive = (linkKind === currentKind);
            } else {
                isActive = false;
            }
        } else {
            isActive = (page === current);
        }

        link.classList.toggle('active', isActive);
        if (isActive) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

function setupResponsiveMenu() {
    const topbar = document.querySelector('.topbar');
    const nav = document.querySelector('.topbar .nav');
    if (!topbar || !nav) return;
    topbar.classList.add('app-sidebar');
    const itemByHref = Object.fromEntries(NAV_ITEMS.map(item => [item.href, item]));
    nav.querySelectorAll('.nb').forEach(link => {
        const href = String(link.getAttribute('href') || '').trim();
        const cleanLabel = String(link.textContent || '').replace(/[^\w\s.-]/g, '').trim();
        const item = itemByHref[href] || itemByHref[href.split('?')[0].toLowerCase()] || { icon: '', label: cleanLabel };
        link.innerHTML = `<span class="nav-emoji" aria-hidden="true">${item.icon}</span><span class="nav-label">${item.label}</span>`;
        link.title = item.label;

        link.addEventListener('click', (e) => {
            if (window.innerWidth <= 760) {
                document.body.classList.add('sidebar-collapsed');
                topbar.classList.remove('menu-open');
            }
            if (getCurrentPageName() === 'ordenes.html') {
                const linkHref = link.getAttribute('href') || '';
                if (linkHref.includes('detailKind=network')) {
                    e.preventDefault();
                    if (typeof selectOrderDetailKind === 'function') {
                        selectOrderDetailKind('network');
                    }
                    updateActiveNavLink();
                } else if (linkHref.includes('detailKind=physical')) {
                    e.preventDefault();
                    if (typeof selectOrderDetailKind === 'function') {
                        selectOrderDetailKind('physical');
                    }
                    updateActiveNavLink();
                }
            }
        });
    });

    if (document.getElementById('mobile-menu-toggle')) return;
    const menuPreference = localStorage.getItem('netops_menu_open_v3');
    if (menuPreference === '0') {
        document.body.classList.add('sidebar-collapsed');
    } else {
        document.body.classList.remove('sidebar-collapsed');
    }
    const btn = document.createElement('button');
    btn.id = 'mobile-menu-toggle';
    btn.type = 'button';
    btn.className = 'sidebar-toggle';
    btn.setAttribute('aria-label', 'Mostrar u ocultar menu');
    btn.setAttribute('aria-expanded', document.body.classList.contains('sidebar-collapsed') ? 'false' : 'true');
    btn.innerHTML = '<span></span><span></span><span></span>';
    btn.addEventListener('click', () => {
        topbar.classList.remove('menu-open');
        const collapsed = document.body.classList.toggle('sidebar-collapsed');
        try { localStorage.setItem('netops_menu_open_v3', collapsed ? '0' : '1'); } catch (e) {}
        btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    });
    topbar.insertBefore(btn, nav);
}

function applyModuleVisualIdentity(currentPage = getCurrentPageName()) {
    const pageModules = {
        'mapa.html':'map', 'rutas.html':'map', 'antenas.html':'antenna', 'nodos.html':'nodes',
        'planificar.html':'plan', 'ordenes.html':'orders', 'material.html':'material', 'tecnicos.html':'users',
        'dashboard.html':'dashboard', 'historial.html':'history'
    };
    const moduleName = pageModules[currentPage] || '';
    if (!moduleName || !document.body) return;
    document.body.dataset.module = moduleName;
    const navItem = NAV_ITEMS.find(item => item.href.split('?')[0] === currentPage)
        || (currentPage === 'rutas.html' ? NAV_ITEMS.find(item => item.href === 'mapa.html') : null);
    const heroContent = document.querySelector('.hero-panel > div:first-child');
    if (heroContent && navItem && !heroContent.querySelector('.module-hero-icon')) {
        heroContent.style.setProperty('position', 'relative', 'important');
        heroContent.style.setProperty('padding-left', 'var(--module-hero-space)', 'important');
        heroContent.insertAdjacentHTML('afterbegin', `<span class="module-hero-icon module-icon-${moduleName}" aria-hidden="true">${navItem.icon}</span>`);
    }
    document.querySelectorAll('.content-card > h2:first-child,.content-card > h3:first-child,.panel > h2:first-child').forEach(heading => heading.classList.add('module-themed-heading'));
}

function applyRoleNavigation(role) {
    const allowed = ROLE_PAGE_ACCESS[role];
    document.querySelectorAll('.nav .nb').forEach(link => {
        const fullHref = String(link.getAttribute('href') || '').trim();
        const pageHref = fullHref.split('?')[0].toLowerCase();
        const item = NAV_ITEMS.find(entry => entry.href === fullHref || entry.href.split('?')[0].toLowerCase() === pageHref);
        const isAdmin = role === 'administrador' || role === 'admin';
        const canShow = allowed ? allowed.has(pageHref) : ((!item?.adminOnly || isAdmin)&&(!item?.principalOnly||isPrincipalAdministratorClient()));
        link.hidden = !canShow;
        link.setAttribute('aria-hidden', canShow ? 'false' : 'true');
        link.classList.toggle('role-hidden-nav', !canShow);
        link.style.display = canShow ? '' : 'none';
    });
}

function applyPagePermissions() {
    const role = normalizeRole(getCurrentUser().role);
    document.documentElement.dataset.role = role;
    if (document.body) document.body.dataset.role = role;
    applyRoleNavigation(role);

    document.querySelectorAll('[data-hide-for]').forEach(el => {
        const list = String(el.getAttribute('data-hide-for') || '').split(',').map(normalizeRole);
        if (list.includes(role)) el.style.display = 'none';
    });
    if (role === 'atencion_clientes') {
        document.querySelectorAll('[data-admin-only]').forEach(el => el.style.display = 'none');
    }
}


/* ==========================================================================
   CENTRO DE NOTIFICACIONES UNIFICADO (Campana flotante, registro histórico y pendientes)
   ========================================================================== */

const NETOPS_INBOX_STORAGE_KEY = 'netops_network_notifications_inbox_v1';

function getStoredNotificationsInbox() {
  try {
    return JSON.parse(localStorage.getItem(NETOPS_INBOX_STORAGE_KEY) || '[]') || [];
  } catch (e) {
    return [];
  }
}

function setStoredNotificationsInbox(items) {
  try {
    localStorage.setItem(NETOPS_INBOX_STORAGE_KEY, JSON.stringify((items || []).slice(0, 100)));
  } catch (e) {}
}

function addNotificationToInbox({ id, title, message, type, orderId = '', url = '', createdAt = new Date().toISOString() }) {
  const inbox = getStoredNotificationsInbox();
  // Evitar duplicados idénticos en menos de 5 segundos
  const existingIdx = inbox.findIndex(x => x.id === id || (x.orderId === orderId && x.type === type && Math.abs(new Date(x.createdAt).getTime() - new Date(createdAt).getTime()) < 5000));
  if (existingIdx >= 0) {
    inbox[existingIdx].unread = true;
    inbox[existingIdx].createdAt = createdAt;
  } else {
    inbox.unshift({
      id: id || ('notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
      title,
      message,
      type,
      orderId,
      url,
      unread: true,
      createdAt
    });
  }
  setStoredNotificationsInbox(inbox);
  renderNotificationCenter();
}

function markNotificationReadByOrderId(orderId) {
  if (!orderId) return;
  const inbox = getStoredNotificationsInbox();
  let changed = false;
  inbox.forEach(x => {
    if (x.orderId === orderId && x.unread) {
      x.unread = false;
      changed = true;
    }
  });
  if (changed) {
    setStoredNotificationsInbox(inbox);
    renderNotificationCenter();
  }
}

function markNotificationAsRead(id, targetUrl = '') {
  const inbox = getStoredNotificationsInbox();
  const item = inbox.find(x => x.id === id);
  if (item) {
    item.unread = false;
    setStoredNotificationsInbox(inbox);
    renderNotificationCenter();
  }
  if (item?.orderId && window.location.pathname.includes('ordenes') && typeof openOrderTechnicianReport === 'function') {
    CM('notification-panel-mo');
    openOrderTechnicianReport(item.orderId);
    return;
  }
  if (targetUrl) {
    window.location.href = targetUrl;
  }
}

function markAllNotificationsAsRead() {
  const inbox = getStoredNotificationsInbox();
  inbox.forEach(x => { x.unread = false; });
  setStoredNotificationsInbox(inbox);
  renderNotificationCenter();
}

function ensureNotificationCenter() {
    if (!document.getElementById('notification-bell')) {
        const btn = document.createElement('button');
        btn.id = 'notification-bell';
        btn.className = 'notification-bell floating-notification-bell';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Abrir notificaciones');
        btn.title = 'Centro de notificaciones';
        btn.onclick = openNotificationPanel;
        btn.innerHTML = '<span class="notification-bell-icon" aria-hidden="true">🔔</span><span id="notification-count">0</span>';
        document.body.appendChild(btn);
    }
    if (!document.getElementById('notification-panel-mo')) {
        const modal = document.createElement('div');
        modal.id = 'notification-panel-mo';
        modal.className = 'mo';
        modal.innerHTML = `
            <div class="md notification-panel" role="dialog" aria-modal="true" style="max-width:620px;">
                <div class="modal-head" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                    <div>
                        <h2 style="margin:0 0 4px;font-size:20px;">Centro de Notificaciones</h2>
                        <p id="notification-panel-sub" style="margin:0;color:#64748b;font-size:12px;">Avisos de detalles de red y actividades en tiempo real.</p>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <button class="btn bgh" type="button" style="font-size:11px;padding:4px 9px;" onclick="markAllNotificationsAsRead()">Marcar leídas</button>
                        <button class="btn bgh" type="button" style="font-size:11px;padding:4px 9px;" onclick="CM('notification-panel-mo')">Cerrar</button>
                    </div>
                </div>
                <div id="notification-list" class="notification-list" style="max-height:60vh;overflow-y:auto;padding-right:4px;"></div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', event => {
            if (event.target === modal) CM('notification-panel-mo');
        });
    }
    renderNotificationCenter();
}

function openNotificationPanel() {
    ensureNotificationCenter();
    renderNotificationCenter();
    OM('notification-panel-mo');
}

function renderNotificationCenter() {
    const bell = document.getElementById('notification-bell');
    const count = document.getElementById('notification-count');
    const list = document.getElementById('notification-list');
    if (!bell) return;

    const isAdmin = typeof userHasRole === 'function' && userHasRole('administrador', 'admin');
    const delReqs = isAdmin && typeof getPendingDeletionRequests === 'function' ? getPendingDeletionRequests() : [];
    const inbox = getStoredNotificationsInbox();
    const unreadInbox = inbox.filter(x => x.unread);

    const totalUnread = delReqs.length + unreadInbox.length;

    if (count) {
        count.textContent = totalUnread > 9 ? '+9' : String(totalUnread);
        count.style.display = totalUnread > 0 ? 'grid' : 'none';
    }
    bell.classList.toggle('has-items', totalUnread > 0);

    if (!list) return;

    if (!totalUnread && !inbox.length) {
        list.innerHTML = '<div class="empty-state" style="padding:32px 16px;text-align:center;color:#64748b;font-size:13px;">No tienes notificaciones pendientes.</div>';
        return;
    }

    const itemsHtml = [];

    // 1. Solicitudes de eliminación (solo visible para admin si existen)
    if (delReqs.length) {
        itemsHtml.push(`
            <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;margin:8px 0 4px;">
                Solicitudes de autorización (${delReqs.length})
            </div>
        `);
        delReqs.forEach(req => {
            const label = typeof getRequestTargetLabel === 'function' ? getRequestTargetLabel(req) : (req.targetName || req.nodeName || 'Elemento');
            const type = typeof getRequestTargetType === 'function' ? getRequestTargetType(req) : (req.nodeId ? 'node' : 'item');
            const typeLabel = type === 'detail' ? 'Detalle' : (type === 'node' ? 'Pueblo' : (type === 'equipment' ? 'Antena' : 'Elemento'));
            itemsHtml.push(`
                <div class="notification-item" style="border-left:4px solid #ef4444;margin-bottom:8px;">
                    <div class="notification-top">
                        <strong>${escapeHtml(label)}</strong>
                        <span class="badge warning">Eliminación</span>
                    </div>
                    <div class="entity-sub">${typeLabel} · Solicitó: ${escapeHtml(req.requestedByName || 'Usuario')}</div>
                    <div class="card-actions" style="margin-top:8px;">
                        <button class="btn bg2" onclick="approveDeletionRequest('${req.id}')">Aprobar</button>
                        <button class="btn br" onclick="rejectDeletionRequest('${req.id}')">Rechazar</button>
                    </div>
                </div>
            `);
        });
    }

    // 2. Notificaciones de detalles de red
    if (inbox.length) {
        itemsHtml.push(`
            <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;margin:12px 0 4px;">
                Avisos de Detalles de Red
            </div>
        `);
        inbox.forEach(notif => {
            const dateStr = notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '';
            const unreadStyle = notif.unread ? 'background:#f0f9ff;border-color:#bae6fd;' : 'background:#ffffff;opacity:0.85;';
            const accentColor = notif.type === 'resolved' ? '#10b981' : (notif.type === 'returned' ? '#f59e0b' : '#3b82f6');
            itemsHtml.push(`
                <div class="notification-item" style="${unreadStyle}border-left:4px solid ${accentColor};margin-bottom:8px;cursor:pointer;transition:transform 0.12s;" onclick="markNotificationAsRead('${notif.id}','${notif.url || ''}')">
                    <div class="notification-top" style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                        <strong style="font-size:13px;color:#0f172a;">${escapeHtml(notif.title)}</strong>
                        ${notif.unread ? '<span class="badge" style="background:#0284c7;color:#fff;font-size:10px;padding:2px 6px;border-radius:10px;">Nuevo</span>' : ''}
                    </div>
                    <div style="font-size:12px;color:#334155;margin:4px 0 6px;line-height:1.4;">${escapeHtml(notif.message)}</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#94a3b8;">
                        <span>${dateStr}</span>
                        <span style="color:#2563eb;font-weight:700;">Ver detalle →</span>
                    </div>
                </div>
            `);
        });
    }

    list.innerHTML = itemsHtml.join('');
}
function copyDeletionCode(id) {
    const reqs = typeof getPendingDeletionRequests === 'function' ? getPendingDeletionRequests() : [];
    const req = reqs.find(r => r.id === id);
    if (!req?.code) return;
    navigator.clipboard?.writeText(String(req.code));
    notify('Codigo copiado.');
}

function initCommon() {
    const current = getCurrentPageName();
    setupGlobalActivityFeedback();
    if (current === 'login.html') return;
    if (!checkAuth()) return;
    // La primera carga de /api/data ya valida la misma cookie y redirige en
    // caso de 401; evitar /api/session aquí ahorra una petición por pantalla.
    ensureAppTopbar();
    updateActiveNavLink();
    hydrateTopbarUser();
    hydrateLogoLinks();
    applyPagePermissions();
    setupResponsiveMenu();
    ensureThemeToggle();
    applyModuleVisualIdentity(current);
    ensureNotificationCenter();
    initNetworkNotifications();
}

let activityFeedbackTimer = null;

function ensureActivityFeedback() {
    let activity = document.getElementById('wifimex-activity');
    if (activity) return activity;
    activity = document.createElement('div');
    activity.id = 'wifimex-activity';
    activity.className = 'wifimex-activity';
    activity.setAttribute('role', 'status');
    activity.setAttribute('aria-live', 'polite');
    activity.innerHTML = `<div class="activity-card"><div class="activity-brand"><img src="assets/brand/wifimex-logo.jpg" alt=""></div><div class="activity-content"><strong id="wifimex-activity-title">Obteniendo información</strong><span id="wifimex-activity-sub">Procesando la solicitud...</span><i></i></div></div>`;
    document.body.appendChild(activity);
    return activity;
}

function showActivityFeedback(title = 'Procesando acción', subtitle = 'Espera un momento...', duration = 650) {
    if (!document.body) return;
    const activity = ensureActivityFeedback();
    const titleEl = document.getElementById('wifimex-activity-title');
    const subEl = document.getElementById('wifimex-activity-sub');
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = subtitle;
    activity.classList.remove('show');
    void activity.offsetWidth;
    activity.classList.add('show');
    clearTimeout(activityFeedbackTimer);
    activityFeedbackTimer = setTimeout(() => activity.classList.remove('show'), duration);
}

function setupGlobalActivityFeedback() {
    if (window.__wifimexActivityBound) return;
    window.__wifimexActivityBound = true;
    document.addEventListener('click', event => {
        const control = event.target.closest('button, a.nb, .material-quick, [role="button"]');
        if (!control || control.disabled) return;
        const label = String(control.getAttribute('aria-label') || control.title || control.textContent || '').replace(/\s+/g, ' ').trim();
        const destructive = control.classList.contains('br') || /eliminar|borrar|quitar|limpiar|rechazar/i.test(label);
        if (destructive) window.netopsSuppressLoadingUntil = Date.now() + 15000;
    }, true);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupGlobalActivityFeedback, { once: true });
else setupGlobalActivityFeedback();


// Debounce compartido para busquedas pesadas: evita repintar tablas/mapas en cada tecla.
window.__debounceTimers = window.__debounceTimers || {};
function debounceAction(key, fn, wait = 280) {
    clearTimeout(window.__debounceTimers[key]);
    window.__debounceTimers[key] = setTimeout(() => {
        try { fn(); } catch (err) { console.warn('debounceAction fallo', key, err); }
    }, wait);
}

function runWhenIdle(fn, timeout = 180) {
    if ('requestIdleCallback' in window) return requestIdleCallback(fn, { timeout: timeout + 300 });
    return setTimeout(fn, timeout);
}
const DETAIL_CATEGORIES_BY_KIND = {
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
const DETAIL_CATEGORIES = [...DETAIL_CATEGORIES_BY_KIND.physical,...DETAIL_CATEGORIES_BY_KIND.network,...DETAIL_CATEGORIES_BY_KIND.support_to_attention];

function detailCategoriesForKind(kind) {
  if (kind === 'network') {
    return [...DETAIL_CATEGORIES_BY_KIND.network, ...DETAIL_CATEGORIES_BY_KIND.support_to_attention];
  }
  return DETAIL_CATEGORIES_BY_KIND.physical;
}

function detailCategoryLabel(value) {
  return DETAIL_CATEGORIES.find(([id]) => id === value)?.[1] || value || 'Sin categoria';
}

function sharedNetworkDetailStatus(detail) {
  if (detail?.status === 'completada') return {label:'Solucionado',className:'is-done'};
  if (detail?.status === 'no_realizado') return {label:'No solucionado',className:'is-unsolved'};
  if (detail?.status === 'revisado') return {label:'Revisado',className:'is-reviewed'};
  if (detail?.status === 'en_revision') return {label:'En revisión',className:'is-reviewing'};
  return {label:'Pendiente',className:'is-pending'};
}

function sharedDetailReviewOpenedSummary(detail) {
  if (!detail?.reviewOpenedAt) return '';
  const openedAt = new Date(detail.reviewOpenedAt);
  const dateLabel = Number.isNaN(openedAt.getTime()) ? detail.reviewOpenedAt : openedAt.toLocaleString('es-MX');
  const actor = detail.reviewOpenedByName || detail.reviewOpenedByUsername || '';
  return actor ? `${dateLabel} · ${actor}` : dateLabel;
}

async function markSharedDetailInReviewOnOpen(detail,refreshName='') {
  if (!detail || detail.deletedAt || detail.reviewOpenedAt || !userHasRole('administrador','admin')) return false;
  if (detail.status === 'completada' || detail.status === 'no_realizado') return false;
  const actor=getCurrentUser(); const auditStart=Array.isArray(state.auditLog)?state.auditLog.length:0;
  detail.reviewOpenedAt=new Date().toISOString();detail.reviewOpenedById=actor.id||'';detail.reviewOpenedByName=actor.name||actor.username||'Administrador';detail.reviewOpenedByUsername=actor.username||'';
  if(!detail.status||detail.status==='pendiente')detail.status='en_revision';
  appendSharedNetworkFollowUp(detail,'review_opened','Abierta para revisión');
  setUpdatedAudit(detail,'abrió orden para revisión');
  const saved=await saveRecordWithAudit('workOrders',detail,auditStart);
  if(saved&&typeof window[refreshName]==='function')window[refreshName]();
  return saved;
}

function sharedNetworkActionNote() {
  return document.getElementById('shared-network-action-note')?.value.trim() || '';
}

function appendSharedNetworkFollowUp(detail,action,label,note = '') {
  const actor = getCurrentUser();
  detail.followUps = [...(Array.isArray(detail.followUps) ? detail.followUps : []),{
    id:gid('ofu'),action,label,note:String(note || '').trim(),at:new Date().toISOString(),
    byId:actor.id || '',byName:actor.name || actor.username || 'Usuario'
  }].slice(-50);
}

function resetSharedNetworkReport(detail) {
  const report = detail.technicianReport;
  if (!report || typeof report !== 'object') return;
  if ((report.result && report.result !== 'pendiente') || report.completedAt) {
    report.history = [...(Array.isArray(report.history) ? report.history : []),{
      result:report.result || '',solution:report.solution || '',reason:report.reason || '',
      observations:report.observations || '',completedAt:report.completedAt || '',completedByName:report.completedByName || ''
    }].slice(-20);
  }
  Object.assign(report,{result:'pendiente',completedAt:'',completedBy:'',completedByName:'',solution:'',reason:''});
}

function refreshSharedNetworkDetailViews(refreshName) {
  const refresh = window[String(refreshName || '')];
  if (typeof refresh === 'function') refresh();
}

async function saveSharedNetworkWorkflow(detail,refreshName,auditAction,message) {
  const auditStart = Array.isArray(state.auditLog) ? state.auditLog.length : 0;
  detail.updatedAt = new Date().toISOString();
  setUpdatedAudit(detail,auditAction);
  const saved = await saveRecordWithAudit('workOrders',detail,auditStart);
  if (!saved) return false;
  CM('shared-network-actions-mo');
  refreshSharedNetworkDetailViews(refreshName);
  notify(message);
  return true;
}

function hideSharedNetworkActionForm() {
  const form = document.getElementById('shared-network-action-form');
  if (form) form.hidden = true;
}

function showSharedNetworkActionForm(id,refreshName,mode) {
  const settings = {
    reviewed:{label:'¿Qué se hizo para intentar solucionarlo?',hint:'Obligatorio',placeholder:'Describe la revisión, ajuste o prueba realizada...',button:'Guardar como revisado',handler:'markSharedNetworkReviewed'},
    physical:{label:'¿Qué detalle físico se presentó?',hint:'Obligatorio',placeholder:'Describe la falla física detectada y lo que debe atenderse...',button:'Enviar a detalles físicos',handler:'sendSharedNetworkToPhysical'},
    same:{label:'Información nueva',hint:'Opcional',placeholder:'Agrega únicamente lo nuevo que reportó el cliente, si existe...',button:'Guardar: sigue el mismo tema',handler:'markSharedNetworkSameIssue'}
  };
  const setting = settings[mode];
  const form = document.getElementById('shared-network-action-form');
  if (!setting || !form) return;
  document.getElementById('shared-network-action-label').textContent = setting.label;
  const hint = document.getElementById('shared-network-action-hint');
  hint.textContent = setting.hint;
  hint.classList.toggle('is-required',mode !== 'same');
  const textarea = document.getElementById('shared-network-action-note');
  textarea.value = '';
  textarea.placeholder = setting.placeholder;
  const confirm = document.getElementById('shared-network-action-confirm');
  confirm.textContent = setting.button;
  confirm.setAttribute('onclick',`${setting.handler}('${id}','${refreshName}')`);
  form.hidden = false;
  setTimeout(() => textarea.focus(),50);
}

function openSharedNetworkDetailActions(id,refreshName) {
  const detail = (state.workOrders || []).find(item => item.id === id && !item.deletedAt);
  if (!detail || detail.detailKind !== 'network') return notify('No se encontró el detalle de red.','err');
  const status = sharedNetworkDetailStatus(detail);
  const solved = detail.status === 'completada';
  let modal = document.getElementById('shared-network-actions-mo');
  if (!modal) {
    document.body.insertAdjacentHTML('beforeend','<div class="mo shared-network-actions-mo" id="shared-network-actions-mo"><div class="md shared-network-actions-card" id="shared-network-actions-card"></div></div>');
    modal = document.getElementById('shared-network-actions-mo');
  }
  document.getElementById('shared-network-actions-card').innerHTML = `
    <div class="modal-head"><div><h2>Acciones del detalle de red</h2><p>${escapeHtml(getWorkOrderFolio(detail))} · Creado ${escapeHtml(detail.createdAt ? new Date(detail.createdAt).toLocaleDateString('es-MX') : 'sin fecha')}</p></div><button type="button" class="btn bgh" onclick="CM('shared-network-actions-mo')">Cerrar</button></div>
    <div class="shared-network-current"><span>Estado actual</span><strong class="shared-network-status ${status.className}">${status.label}</strong></div>
    <div class="shared-network-buttons">
      ${!solved ? `<button class="btn action-reviewed" onclick="showSharedNetworkActionForm('${escapeHtml(id)}','${escapeHtml(refreshName)}','reviewed')">Revisado</button><button class="btn action-solved" onclick="completeSharedNetworkDetail('${escapeHtml(id)}','${escapeHtml(refreshName)}')">Solucionado</button><button class="btn action-physical" onclick="showSharedNetworkActionForm('${escapeHtml(id)}','${escapeHtml(refreshName)}','physical')">Detalle físico</button><button class="btn action-same" onclick="showSharedNetworkActionForm('${escapeHtml(id)}','${escapeHtml(refreshName)}','same')">Sigue el mismo tema</button><button class="btn action-resend" onclick="resendSharedNetworkDetail('${escapeHtml(id)}','${escapeHtml(refreshName)}')">Volver a enviar</button>` : ''}
      <button class="btn action-copy" ${solved ? `onclick="copySharedNetworkDetail('${escapeHtml(id)}')"` : 'disabled'}>Copiar como nuevo</button>
    </div>
    <div id="shared-network-action-form" class="shared-network-action-form" hidden><label><span><b id="shared-network-action-label"></b> <em id="shared-network-action-hint"></em></span><textarea id="shared-network-action-note" rows="3"></textarea></label><div><button class="btn bgh" onclick="hideSharedNetworkActionForm()">Cancelar</button><button class="btn bc" id="shared-network-action-confirm">Guardar</button></div></div>
    <p class="shared-network-help">Volver a enviar conserva el folio y la fecha original. Copiar abre Órdenes con un registro nuevo precargado.</p>`;
  OM(modal.id);
}

async function markSharedNetworkReviewed(id,refreshName) {
  const detail=(state.workOrders||[]).find(item=>item.id===id&&!item.deletedAt); if(!detail)return;
  const note=sharedNetworkActionNote();
  if(!note){notify('Describe qué se hizo para intentar solucionarlo.','err');document.getElementById('shared-network-action-note')?.focus();return;}
  detail.status='revisado';detail.reviewedAt=new Date().toISOString();detail.lastResentAt='';
  appendSharedNetworkFollowUp(detail,'reviewed','Revisado',note);
  await saveSharedNetworkWorkflow(detail,refreshName,'revisó detalle de red','Detalle marcado como revisado.');
}

async function markSharedNetworkSameIssue(id,refreshName) {
  const detail=(state.workOrders||[]).find(item=>item.id===id&&!item.deletedAt); if(!detail)return;
  const note=sharedNetworkActionNote(); const now=new Date().toISOString();
  detail.status='no_realizado';detail.completedAt=now;detail.lastResentAt='';
  detail.technicianReport={...(detail.technicianReport||{}),result:'no_realizado',reason:note||'El problema continúa sin solución.',completedAt:now};
  appendSharedNetworkFollowUp(detail,'same_issue','Sigue el mismo tema',note);
  await saveSharedNetworkWorkflow(detail,refreshName,'marcó que sigue el mismo tema','Detalle marcado como no solucionado.');
}

async function resendSharedNetworkDetail(id,refreshName) {
  const detail=(state.workOrders||[]).find(item=>item.id===id&&!item.deletedAt); if(!detail)return;
  if(detail.status==='completada')return notify('Un detalle solucionado debe copiarse como uno nuevo.','warn');
  detail.status='pendiente';detail.completedAt='';detail.reviewOpenedAt='';detail.reviewOpenedById='';detail.reviewOpenedByName='';detail.reviewOpenedByUsername='';detail.reviewedAt='';detail.lastResentAt=new Date().toISOString();
  resetSharedNetworkReport(detail);appendSharedNetworkFollowUp(detail,'resent','Volver a enviar');
  await saveSharedNetworkWorkflow(detail,refreshName,'volvió a enviar detalle','Detalle reenviado sin crear otro folio.');
}

async function sendSharedNetworkToPhysical(id,refreshName) {
  const detail=(state.workOrders||[]).find(item=>item.id===id&&!item.deletedAt); if(!detail)return;
  const note=sharedNetworkActionNote();
  if(!note){notify('Describe el detalle físico que se presentó.','err');document.getElementById('shared-network-action-note')?.focus();return;}
  const original=detail.description||detail.title||''; const category=detailCategoryLabel(detail.category);
  Object.assign(detail,{detailKind:'physical',category:'otro',title:note,description:note,status:'pendiente',completedAt:'',reviewOpenedAt:'',reviewOpenedById:'',reviewOpenedByName:'',reviewOpenedByUsername:'',reviewedAt:'',lastResentAt:new Date().toISOString()});
  resetSharedNetworkReport(detail);
  appendSharedNetworkFollowUp(detail,'physical','Enviado a detalle físico',`${note} · Origen de red: ${category}${original?` · Reporte original: ${original}`:''}`);
  await saveSharedNetworkWorkflow(detail,refreshName,'envió detalle a físicos','El mismo folio fue enviado a Detalles físicos.');
}

function completeSharedNetworkDetail(id,refreshName) {
  const detail=(state.workOrders||[]).find(item=>item.id===id&&!item.deletedAt); if(!detail)return;
  CM('shared-network-actions-mo');
  openAdminDetailCompletion(detail,async completion=>{
    const auditStart=Array.isArray(state.auditLog)?state.auditLog.length:0;
    detail.clientName=completion.clientName;detail.clientPhone=completion.clientPhone;detail.detailLocation=completion.detailLocation;
    detail.technicianReport={...(detail.technicianReport||{}),...completion.technicianReport};
    detail.status='completada';detail.completedAt=new Date().toISOString();detail.lastResentAt='';
    appendSharedNetworkFollowUp(detail,'solved','Solucionado');setUpdatedAudit(detail,'completó detalle de red con evidencia');
    const saved=await saveRecordWithAudit('workOrders',detail,auditStart);if(!saved)return false;
    refreshSharedNetworkDetailViews(refreshName);return true;
  },{forceInformation:true,freshEvidence:true,requireEvidence:true,hideSolution:true,subtitle:'Adjunta una captura donde el cliente confirme que el servicio mejoró antes de solucionar.',evidenceTitle:'Captura de confirmación del cliente <span>Obligatoria</span>',evidenceHelp:'Sube o pega una captura del mensaje donde el cliente confirme que mejoró. Esta evidencia es obligatoria.',evidenceError:'Adjunta la captura donde el cliente confirma que el servicio mejoró.'});
}

function copySharedNetworkDetail(id) {
  const detail=(state.workOrders||[]).find(item=>item.id===id&&!item.deletedAt);
  if(!detail||detail.status!=='completada')return notify('Solo puedes copiar un detalle solucionado.','warn');
  window.location.href=`ordenes.html?detailKind=network&copyOrderId=${encodeURIComponent(id)}`;
}

function getWorkOrderFolio(order) {
  const isNetwork = order?.detailKind === 'network' || /_red$|^red_/.test(String(order?.category || ''));
  const prefix = isNetwork ? 'RED' : (order?.category === 'instalacion' ? 'NEW' : 'DET');
  if (order?.folio) return String(order.folio).replace(/^(DET|NEW|RED)-/i, `${prefix}-`);
  const source = String(order?.id || order?.createdAt || 'detalle');
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash * 31) + source.charCodeAt(index)) >>> 0;
  }
  return `${prefix}-${String(hash % 1000000).padStart(6, '0')}`;
}

/* ==========================================================================
   SISTEMA DE NOTIFICACIONES EN TIEMPO REAL PARA DETALLES DE RED
   (Notificaciones a la derecha de la pantalla, tono sutil Web Audio y soporte cross-page)
   ========================================================================== */

let _netopsAudioCtx = null;
let _netopsWatcherInterval = null;
let _netopsNetworkChannel = null;
let _netopsWatcherRunning = false;
const NETOPS_NETWORK_CACHE_KEY = 'netops_network_orders_state_cache_v2';
const NETOPS_EVENT_STORAGE_KEY = 'netops_last_network_event_v2';

function _injectNetworkNotificationStyles() {
  if (document.getElementById('netops-network-notif-styles')) return;
  const style = document.createElement('style');
  style.id = 'netops-network-notif-styles';
  style.textContent = `
    .netops-right-toasts {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 2147483640;
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: min(390px, calc(100vw - 32px));
      pointer-events: none;
    }
    .netops-right-toast {
      pointer-events: auto;
      position: relative;
      background: #ffffff;
      border-radius: 14px;
      padding: 14px 16px;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16), 0 2px 8px rgba(15, 23, 42, 0.08);
      border: 1px solid #e2e8f0;
      border-left: 5px solid #2563eb;
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 12px;
      align-items: start;
      cursor: pointer;
      transform: translateX(125%);
      opacity: 0;
      transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
      font-family: Inter, system-ui, -apple-system, sans-serif;
    }
    .netops-right-toast.is-visible {
      transform: translateX(0);
      opacity: 1;
    }
    .netops-right-toast.is-hiding {
      transform: translateX(125%);
      opacity: 0;
    }
    .netops-right-toast:hover {
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.22);
      transform: translateY(-2px);
    }
    .netops-toast-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }
    .netops-toast-icon svg {
      width: 20px;
      height: 20px;
      stroke: currentColor;
      stroke-width: 2.1;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .netops-toast-new_order { border-left-color: #2563eb; }
    .netops-toast-new_order .netops-toast-icon { background: #eff6ff; color: #2563eb; }

    .netops-toast-attending { border-left-color: #f59e0b; }
    .netops-toast-attending .netops-toast-icon { background: #fffbeb; color: #f59e0b; }

    .netops-toast-resolved { border-left-color: #059669; }
    .netops-toast-resolved .netops-toast-icon { background: #ecfdf5; color: #059669; }

    .netops-toast-returned { border-left-color: #e11d48; }
    .netops-toast-returned .netops-toast-icon { background: #fff1f2; color: #e11d48; }

    .netops-toast-confirmed { border-left-color: #0d9488; }
    .netops-toast-confirmed .netops-toast-icon { background: #f0fdfa; color: #0d9488; }

    .floating-notification-bell.has-items #notification-count {
      background: #ef4444 !important;
      color: #ffffff !important;
      border: 2px solid #ffffff !important;
      box-shadow: 0 4px 10px rgba(239, 68, 68, 0.45) !important;
      display: grid !important;
    }
    .floating-notification-bell:not(.has-items) #notification-count {
      display: none !important;
    }

    .netops-toast-content {
      min-width: 0;
    }
    .netops-toast-title {
      font-weight: 800;
      font-size: 13.5px;
      color: #0f172a;
      line-height: 1.3;
      margin-bottom: 3px;
    }
    .netops-toast-msg {
      font-size: 12px;
      color: #475569;
      line-height: 1.45;
      word-break: break-word;
      font-weight: 500;
    }
    .netops-toast-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 7px;
      font-size: 10.5px;
      color: #94a3b8;
      font-weight: 600;
    }
    .netops-toast-action-hint {
      font-weight: 800;
      color: #2563eb;
      letter-spacing: -0.01em;
    }
    .netops-toast-close {
      background: transparent;
      border: none;
      font-size: 18px;
      color: #94a3b8;
      cursor: pointer;
      line-height: 1;
      padding: 3px 5px;
      border-radius: 6px;
      transition: background 0.15s, color 0.15s;
    }
    .netops-toast-close:hover {
      color: #1e293b;
      background: #f1f5f9;
    }
  `;
  document.head.appendChild(style);
}

function getNetopsAudioContext() {
  if (!_netopsAudioCtx && (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext)) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    _netopsAudioCtx = new AudioCtx();
  }
  return _netopsAudioCtx;
}

function unlockNetopsAudioOnInteraction() {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    const ctx = getNetopsAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, unlock, { passive: true });
  });
}
if (typeof window !== 'undefined') {
  unlockNetopsAudioOnInteraction();
}

/**
 * Tono sutil armónico generado mediante Web Audio API (dos notas suaves y cálidas).
 */
function playSubtleNotificationTone() {
  try {
    const ctx = getNetopsAudioContext();
    if (!ctx) return;

    const play = () => {
      try {
        const now = ctx.currentTime;

        // Tono formal, corto y sutil (acorde armónico D5 -> A5 con envolvente limpia y sin distorsión)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        gain1.gain.setValueAtTime(0.0001, now);
        gain1.gain.linearRampToValueAtTime(0.09, now + 0.015);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.30);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.0, now + 0.08); // A5
        gain2.gain.setValueAtTime(0.0001, now + 0.08);
        gain2.gain.linearRampToValueAtTime(0.10, now + 0.095);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.40);
      } catch (err) {
        console.warn('Audio play error:', err);
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(play).catch(play);
    } else {
      play();
    }
  } catch (e) {
    console.warn('No se pudo reproducir el tono de notificación', e);
  }
}

function ensureRightNotificationContainer() {
  _injectNetworkNotificationStyles();
  let container = document.getElementById('netops-right-toasts');
  if (!container) {
    container = document.createElement('div');
    container.id = 'netops-right-toasts';
    container.className = 'netops-right-toasts';
    document.body.appendChild(container);
  }
  return container;
}

function showRightScreenNotification({
  title = 'Notificación',
  message = '',
  type = 'info',
  url = '',
  orderId = '',
  duration = 8500
} = {}) {
  const container = ensureRightNotificationContainer();
  const toast = document.createElement('div');
  toast.className = `netops-right-toast netops-toast-${type}`;
  toast.setAttribute('role', 'alert');

  const icons = {
    new_order: '<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    attending: '<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    resolved: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    returned: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v3"/></svg>',
    confirmed: '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
  };

  const iconSvg = icons[type] || '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
  const timeStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  toast.innerHTML = `
    <div class="netops-toast-icon">${iconSvg}</div>
    <div class="netops-toast-content">
      <div class="netops-toast-title">${escapeHtml(title)}</div>
      <div class="netops-toast-msg">${escapeHtml(message)}</div>
      <div class="netops-toast-meta">
        <span>${timeStr}</span>
        ${url ? '<span class="netops-toast-action-hint">Ver detalle →</span>' : ''}
      </div>
    </div>
    <button type="button" class="netops-toast-close" aria-label="Cerrar">&times;</button>
  `;

  toast.addEventListener('click', (e) => {
    if (e.target.closest('.netops-toast-close')) return;
    if (orderId && typeof markNotificationReadByOrderId === 'function') {
      markNotificationReadByOrderId(orderId);
    }
    if (orderId && window.location.pathname.includes('ordenes') && typeof openOrderTechnicianReport === 'function') {
      openOrderTechnicianReport(orderId);
      dismiss();
      return;
    }
    if (url) {
      window.location.href = url;
    }
  });

  const closeBtn = toast.querySelector('.netops-toast-close');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dismiss();
  });

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add('is-visible');
  });

  let timer = setTimeout(dismiss, duration);
  toast.addEventListener('mouseenter', () => clearTimeout(timer));
  toast.addEventListener('mouseleave', () => {
    timer = setTimeout(dismiss, 4000);
  });

  function dismiss() {
    if (toast.dataset.dismissing) return;
    toast.dataset.dismissing = '1';
    toast.classList.remove('is-visible');
    toast.classList.add('is-hiding');
    setTimeout(() => { toast.remove(); }, 350);
  }
}

function requestNotificationPermissionOnce() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    try {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          console.log('Permiso de notificaciones concedido.');
        }
      }).catch(() => {});
    } catch(e) {}
  }
}

function triggerDesktopNotification({ title, message, url = '', orderId = '' }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      const logoUrl = window.location.origin + '/assets/brand/wifimex-logo.jpg';
      const notif = new Notification(title, {
        body: message,
        icon: logoUrl,
        badge: logoUrl,
        tag: 'netops-network-' + (orderId || Date.now()),
        renotify: true
      });
      notif.onclick = () => {
        try {
          window.focus();
        } catch (e) {}
        if (orderId && typeof markNotificationReadByOrderId === 'function') {
          markNotificationReadByOrderId(orderId);
        }
        if (orderId && window.location.pathname.includes('ordenes') && typeof openOrderTechnicianReport === 'function') {
          openOrderTechnicianReport(orderId);
        } else if (url) {
          window.location.href = url;
        }
        notif.close();
      };
    } catch (e) {
      console.warn('No se pudo emitir la notificación de escritorio', e);
    }
  } else if (Notification.permission === 'default') {
    requestNotificationPermissionOnce();
  }
}

function notifyNetworkDetailEvent({
  title,
  message,
  type = 'info',
  orderId = '',
  sound = true,
  desktop = true
}) {
  const url = orderId
    ? `ordenes.html?detailKind=network&orderId=${encodeURIComponent(orderId)}`
    : `ordenes.html?detailKind=network`;

  // 1. Sonido sutil y formal
  if (sound) {
    playSubtleNotificationTone();
  }

  // 2. Tarjeta flotante en pantalla
  showRightScreenNotification({
    title,
    message,
    type,
    url,
    orderId
  });

  // 3. Guardar en el buzón persistente de la campana (abajo a la derecha)
  addNotificationToInbox({
    title,
    message,
    type,
    orderId,
    url,
    createdAt: new Date().toISOString()
  });

  // 4. Notificación del sistema si la pestaña no está en foco o navegador minimizado
  if (desktop && (document.hidden || !document.hasFocus())) {
    triggerDesktopNotification({
      title,
      message,
      url,
      orderId
    });
  }
}

function getStoredNetworkStateCache() {
  try {
    return JSON.parse(localStorage.getItem(NETOPS_NETWORK_CACHE_KEY) || '{}') || {};
  } catch (e) {
    return {};
  }
}

function setStoredNetworkStateCache(cache) {
  try {
    localStorage.setItem(NETOPS_NETWORK_CACHE_KEY, JSON.stringify(cache || {}));
  } catch (e) {}
}

/* ==========================================================================
   CONFIGURACIÓN Y REPETICIÓN PERIÓDICA DE NOTIFICACIONES SEGÚN PRIORIDAD
   (Baja: 45m, Media: 30m, Alta: 20m, Muy Alta: 10m - Administrable y editable)
   ========================================================================== */

const NETOPS_PRIORITY_INTERVALS_KEY = 'netops_priority_reminder_intervals_v1';
const NETOPS_LAST_REMINDER_KEY = 'netops_priority_last_reminded_timestamps_v1';

const DEFAULT_PRIORITY_MINUTES = {
  baja: 45,
  media: 30,
  alta: 20,
  muy_alta: 10
};

function getPriorityReminderMinutes() {
  try {
    const saved = JSON.parse(localStorage.getItem(NETOPS_PRIORITY_INTERVALS_KEY) || '{}');
    return { ...DEFAULT_PRIORITY_MINUTES, ...saved };
  } catch (e) {
    return { ...DEFAULT_PRIORITY_MINUTES };
  }
}

function setPriorityReminderMinutes(newIntervals) {
  try {
    const current = getPriorityReminderMinutes();
    const updated = { ...current, ...newIntervals };
    localStorage.setItem(NETOPS_PRIORITY_INTERVALS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return DEFAULT_PRIORITY_MINUTES;
  }
}

function getPriorityReminderLabel(priority) {
  const intervals = getPriorityReminderMinutes();
  const mins = intervals[priority] || DEFAULT_PRIORITY_MINUTES[priority] || 30;
  return `Recordatorio cada ${mins} min`;
}

function checkPriorityUnresolvedReminders(orders = []) {
  if (!Array.isArray(orders) || !orders.length) return;
  const user = getCurrentUser();
  if (!user || !user.role) return;

  const intervals = getPriorityReminderMinutes();
  let lastReminders = {};
  try {
    lastReminders = JSON.parse(localStorage.getItem(NETOPS_LAST_REMINDER_KEY) || '{}') || {};
  } catch (e) {}

  const now = Date.now();
  let touched = false;

  for (const order of orders) {
    if (order.detailKind !== 'network' || order.deletedAt) continue;
    const isUnresolved = order.status === 'pendiente' || order.status === 'devuelto_soporte' || order.status === 'en_revision' || order.status === 'resuelto_soporte';
    if (!isUnresolved) continue;

    const hasAssignment = !!(order.assignedUserId || order.assignedUserName);
    const isAssignedToMe = isOrderAssignedToUser(order, user);
    const isCreatedByMe = isOrderCreatorOrAssigner(order, user);

    let shouldRemindMe = false;
    let reminderTitle = '';
    let reminderMsg = '';
    let reminderType = 'info';

    if (order.status === 'resuelto_soporte') {
      // Pendiente de validación por Atención a clientes
      const hasCreator = !!(order.createdById || order.createdByName || order.createdByUsername);
      shouldRemindMe = hasCreator ? isCreatedByMe : userHasRole('atencion_clientes');
      reminderTitle = '⏳ Pendiente validar solución con cliente';
      reminderMsg = `${order.clientName || 'Cliente'} (${order.town || order.nodeName || 'Red'}) · Aún no se ha validado si el servicio quedó restablecido.`;
      reminderType = 'resolved';
    } else {
      // Pendiente en Soporte técnico
      shouldRemindMe = hasAssignment ? isAssignedToMe : userHasRole('administrador', 'admin');
      reminderTitle = '⏰ Reporte de red pendiente sin resolver';
      reminderMsg = `${order.clientName || 'Cliente'} (${order.town || order.nodeName || 'Red'}) · Prioridad ${order.priority || 'media'}. Sigue pendiente de atención técnica.`;
      reminderType = order.status === 'devuelto_soporte' ? 'returned' : 'new_order';
    }

    if (!shouldRemindMe) continue;

    const prio = String(order.priority || 'media').toLowerCase();
    const intervalMins = (Number(order.reminderIntervalMin) > 0)
      ? Number(order.reminderIntervalMin)
      : (Number(intervals[prio]) || DEFAULT_PRIORITY_MINUTES[prio] || 30);
    const intervalMs = intervalMins * 60 * 1000;

    const key = `${order.id}_${user.id || user.username}_${order.status}`;
    const lastTime = Number(lastReminders[key]) || 0;

    if (!lastTime) {
      // Inicializar el temporizador desde la última actualización de la orden
      const orderTime = new Date(order.updatedAt || order.createdAt || now).getTime();
      if ((now - orderTime) >= intervalMs) {
        lastReminders[key] = now;
        touched = true;
        notifyNetworkDetailEvent({
          title: reminderTitle,
          message: reminderMsg,
          type: reminderType,
          orderId: order.id
        });
      } else {
        lastReminders[key] = orderTime;
        touched = true;
      }
    } else if ((now - lastTime) >= intervalMs) {
      lastReminders[key] = now;
      touched = true;
      notifyNetworkDetailEvent({
        title: reminderTitle,
        message: reminderMsg,
        type: reminderType,
        orderId: order.id
      });
    }
  }

  if (touched) {
    try {
      localStorage.setItem(NETOPS_LAST_REMINDER_KEY, JSON.stringify(lastReminders));
    } catch (e) {}
  }
}

function isOrderAssignedToUser(order, user) {
  if (!order || !user) return false;
  const assignedId = String(order.assignedUserId || order.assignedTo || '').trim().toLowerCase();
  const assignedName = String(order.assignedUserName || order.assignedToName || '').trim().toLowerCase();
  const uid = String(user.id || '').trim().toLowerCase();
  const uname = String(user.username || '').trim().toLowerCase();
  const name = String(user.name || '').trim().toLowerCase();

  if (assignedId && (assignedId === uid || assignedId === uname)) return true;
  if (assignedName && (assignedName === name || assignedName === uname)) return true;
  return false;
}

function isOrderCreatorOrAssigner(order, user) {
  if (!order || !user) return false;
  const creatorId = String(order.createdById || order.createdBy || '').trim().toLowerCase();
  const creatorUname = String(order.createdByUsername || '').trim().toLowerCase();
  const creatorName = String(order.createdByName || '').trim().toLowerCase();
  const uid = String(user.id || '').trim().toLowerCase();
  const uname = String(user.username || '').trim().toLowerCase();
  const name = String(user.name || '').trim().toLowerCase();

  if (creatorId && (creatorId === uid || creatorId === uname)) return true;
  if (creatorUname && creatorUname === uname) return true;
  if (creatorName && (creatorName === name || creatorName === uname)) return true;
  return false;
}

/**
 * Emite un evento en tiempo real tras mutar una orden de red (creación, resolución, devolución o confirmación).
 */
function broadcastNetworkOrderChange(order, transition) {
  try {
    if (!order || order.detailKind !== 'network') return;
    const user = getCurrentUser();
    const cache = getStoredNetworkStateCache();
    cache[order.id] = {
      status: order.status || 'pendiente',
      updatedAt: order.updatedAt || new Date().toISOString(),
      title: order.title || order.description || '',
      clientName: order.clientName || '',
      town: order.town || order.nodeName || '',
      assignedUserId: order.assignedUserId || '',
      assignedUserName: order.assignedUserName || '',
      reviewOpenedById: order.reviewOpenedById || '',
      reviewOpenedByName: order.reviewOpenedByName || '',
      reviewOpenedAt: order.reviewOpenedAt || '',
      createdById: order.createdById || order.createdBy || '',
      createdByName: order.createdByName || '',
      createdByUsername: order.createdByUsername || '',
      lastTransition: transition
    };
    setStoredNetworkStateCache(cache);

    const payload = {
      type: 'NETWORK_ORDER_EVENT',
      transition,
      orderId: order.id,
      order: {
        id: order.id,
        status: order.status,
        clientName: order.clientName || '',
        town: order.town || order.nodeName || '',
        title: order.title || order.description || '',
        category: order.category || '',
        assignedUserId: order.assignedUserId || '',
        assignedUserName: order.assignedUserName || '',
        reviewOpenedById: order.reviewOpenedById || '',
        reviewOpenedByName: order.reviewOpenedByName || '',
        reviewOpenedAt: order.reviewOpenedAt || '',
        createdById: order.createdById || order.createdBy || '',
        createdByName: order.createdByName || '',
        createdByUsername: order.createdByUsername || '',
        solution: order.technicianReport?.solution || '',
        note: (Array.isArray(order.followUps) ? order.followUps.slice(-1)[0]?.note : '') || ''
      },
      byUserId: user.id || '',
      byName: user.name || user.username || '',
      timestamp: Date.now()
    };

    try {
      if (_netopsNetworkChannel) {
        _netopsNetworkChannel.postMessage(payload);
      }
    } catch (e) {}

    try {
      localStorage.setItem(NETOPS_EVENT_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {}
  } catch (err) {
    console.warn('broadcastNetworkOrderChange error:', err);
  }
}

function handleNetworkOrderEvent(payload) {
  if (!payload || payload.type !== 'NETWORK_ORDER_EVENT') return;
  const user = getCurrentUser();
  if (!user || !user.role) return;

  const { transition, order } = payload;

  // Actualizar estado reactivo en memoria para que se refleje inmediatamente en la tabla sin recargar
  if (order && typeof state !== 'undefined' && Array.isArray(state.workOrders)) {
    const existing = state.workOrders.find(x => x.id === order.id);
    if (existing) {
      if (order.status) existing.status = order.status;
      if (order.assignedUserId !== undefined) existing.assignedUserId = order.assignedUserId;
      if (order.assignedUserName !== undefined) existing.assignedUserName = order.assignedUserName;
      if (order.reviewOpenedById !== undefined) existing.reviewOpenedById = order.reviewOpenedById;
      if (order.reviewOpenedByName !== undefined) existing.reviewOpenedByName = order.reviewOpenedByName;
      if (order.reviewOpenedAt !== undefined) existing.reviewOpenedAt = order.reviewOpenedAt;
      if (order.updatedAt !== undefined) existing.updatedAt = order.updatedAt;
    }
  }

  // Refrescar vistas activas en tiempo real
  if (typeof loadOrderPage === 'function') {
    loadOrderPage();
  } else if (typeof renderWOs === 'function') {
    renderWOs();
  }

  // Evitar auto-notificar en la misma pestaña si el autor fue este mismo usuario
  if (payload.byUserId && user.id && payload.byUserId === user.id) {
    const isVeryRecent = Math.abs(Date.now() - (payload.timestamp || 0)) < 3000;
    if (isVeryRecent) return;
  }

  const isSoporte = userHasRole('administrador', 'admin');
  const isAtencion = userHasRole('atencion_clientes');

  const hasAssignment = !!(order.assignedUserId || order.assignedUserName);
  const isAssignedToMe = isOrderAssignedToUser(order, user);
  const isCreatedByMe = isOrderCreatorOrAssigner(order, user);
  const isSupportToAttention = ['preguntar_luz', 'verificar_cliente', 'confirmar_servicio', 'reporte_zona', 'otro_soporte'].includes(order.category);

  if (transition === 'new_order') {
    if (isSupportToAttention) {
      // Requerimiento enviado por Soporte hacia Atención a clientes
      if (isAtencion) {
        notifyNetworkDetailEvent({
          title: 'Nuevo requerimiento de Soporte',
          message: `${order.clientName || 'Comunidad'} (${order.town || 'Red'}) · ${order.title || 'Solicitud de Atención a clientes'}`,
          type: 'new_order',
          orderId: order.id
        });
      }
    } else {
      // Si viene asignado a alguien específico de soporte: SOLO esa persona recibe la notificación
      // Si no viene asignado a nadie en específico: lo reciben los miembros de Soporte
      const shouldNotify = hasAssignment ? isAssignedToMe : isSoporte;
      if (shouldNotify) {
        const assignedNotice = hasAssignment ? ' (Asignado a ti)' : '';
        notifyNetworkDetailEvent({
          title: `Nuevo reporte de red${assignedNotice}`,
          message: `${order.clientName || 'Cliente'} (${order.town || 'Red'}) · ${order.title || 'Reportado por Atención a clientes'}`,
          type: 'new_order',
          orderId: order.id
        });
      }
    }
  } else if (transition === 'attending') {
    // Cuando Soporte da clic en Atender: notificar al creador / Atención a clientes
    const hasCreator = !!(order.createdById || order.createdByName || order.createdByUsername);
    const shouldNotify = hasCreator ? isCreatedByMe : isAtencion;
    if (shouldNotify) {
      notifyNetworkDetailEvent({
        title: 'Soporte técnico ha iniciado la atención',
        message: `${order.clientName || 'Cliente'} (${order.town || 'Red'}) · En atención por ${payload.byName || 'Soporte'}.`,
        type: 'attending',
        orderId: order.id
      });
    }
  } else if (transition === 'resolved') {
    if (isSupportToAttention) {
      // Atención respondió requerimiento de Soporte: notificar a Soporte
      if (isSoporte) {
        notifyNetworkDetailEvent({
          title: 'Atención a clientes atendió requerimiento',
          message: `${order.clientName || 'Comunidad'} · ${order.solution ? order.solution.slice(0, 65) + '...' : 'Revisa la respuesta.'}`,
          type: 'resolved',
          orderId: order.id
        });
      }
    } else {
      // Cuando Soporte resuelve: la persona que creó el reporte o Atención a clientes recibe notificación
      const hasCreator = !!(order.createdById || order.createdByName || order.createdByUsername);
      const shouldNotify = hasCreator ? isCreatedByMe : isAtencion;
      if (shouldNotify) {
        const solSnippet = order.solution ? `Solución: ${order.solution.slice(0, 65)}...` : 'Consulta con el cliente para validar.';
        notifyNetworkDetailEvent({
          title: 'Detalle resuelto por Soporte técnico',
          message: `${order.clientName || 'Cliente'} · ${solSnippet}`,
          type: 'resolved',
          orderId: order.id
        });
      }
    }
  } else if (transition === 'returned') {
    // Cuando Atención a clientes devuelve el detalle a Soporte (o Soporte devuelve a Atención)
    if (isSupportToAttention) {
      if (isAtencion) {
        notifyNetworkDetailEvent({
          title: 'Requerimiento devuelto por Soporte',
          message: `${order.clientName || 'Comunidad'} · ${order.note ? order.note.slice(0, 65) + '...' : 'Se solicita aclaración.'}`,
          type: 'returned',
          orderId: order.id
        });
      }
    } else {
      const shouldNotify = hasAssignment ? isAssignedToMe : isSoporte;
      if (shouldNotify) {
        const reasonSnippet = order.note ? `Motivo: ${order.note.slice(0, 65)}...` : 'El cliente indica que continúa la falla.';
        notifyNetworkDetailEvent({
          title: 'Reporte devuelto a Soporte técnico',
          message: `${order.clientName || 'Cliente'} · ${reasonSnippet}`,
          type: 'returned',
          orderId: order.id
        });
      }
    }
  } else if (transition === 'confirmed') {
    // Cuando se confirma/completa el detalle
    const shouldNotify = hasAssignment ? isAssignedToMe : isSoporte;
    if (shouldNotify) {
      notifyNetworkDetailEvent({
        title: 'Reporte concluido a conformidad',
        message: `${order.clientName || 'Cliente'} confirmó que el servicio quedó funcionando.`,
        type: 'confirmed',
        orderId: order.id
      });
    }
  } else if (transition === 'retaken' && isSoporte && payload.byUserId !== user.id) {
    notifyNetworkDetailEvent({
      title: 'Reporte reasignado en Soporte',
      message: `${payload.byName || 'Otro compañero'} retomó el reporte de ${order.clientName || 'Cliente'}.`,
      type: 'retaken',
      orderId: order.id
    });
  }
}

async function checkNetworkOrderNotifications() {
  if (getCurrentPageName() === 'login.html') return;
  const user = getCurrentUser();
  if (!user || !user.role) return;

  try {
    if (typeof fetchDataPage !== 'function') return;
    const res = await fetchDataPage('operations', {
      detailKind: 'network',
      windowed: '1',
      limit: 30,
      sort: 'newest'
    }, 6000);

    if (Array.isArray(res?.supportUsers) && res.supportUsers.length) {
      window.netopsSupportUsers = res.supportUsers;
      try { localStorage.setItem('netops_cached_support_users', JSON.stringify(res.supportUsers)); } catch (e) {}
    }

    const orders = Array.isArray(res?.workOrders) ? res.workOrders : [];
    if (!orders.length) return;

    const cache = getStoredNetworkStateCache();
    const isFirstRun = Object.keys(cache).length === 0;

    let updated = false;
    for (const order of orders) {
      if (!order || !order.id || order.detailKind !== 'network' || order.deletedAt) continue;
      const prev = cache[order.id];
      const currentStatus = order.status || 'pendiente';
      const orderTitle = order.title || order.description || '';
      const client = order.clientName || 'Cliente';
      const place = order.town || order.nodeName || 'Red';

      const hasAssignment = !!(order.assignedUserId || order.assignedUserName);
      const isAssignedToMe = isOrderAssignedToUser(order, user);
      const isCreatedByMe = isOrderCreatorOrAssigner(order, user);
      const isOwnCreator = (order.createdById && order.createdById === user.id) || (order.createdByUsername && order.createdByUsername === user.username);
      const isSupportToAttention = ['preguntar_luz', 'verificar_cliente', 'confirmar_servicio', 'reporte_zona', 'otro_soporte'].includes(order.category);

      if (!prev) {
        // Nueva orden detectada
        cache[order.id] = {
          status: currentStatus,
          updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
          title: orderTitle,
          clientName: client,
          town: place,
          assignedUserId: order.assignedUserId || '',
          assignedUserName: order.assignedUserName || '',
          reviewOpenedById: order.reviewOpenedById || '',
          reviewOpenedByName: order.reviewOpenedByName || '',
          reviewOpenedAt: order.reviewOpenedAt || '',
          createdById: order.createdById || '',
          createdByName: order.createdByName || '',
          createdByUsername: order.createdByUsername || ''
        };
        updated = true;

        if (!isFirstRun && currentStatus === 'pendiente') {
          if (isSupportToAttention) {
            if (userHasRole('atencion_clientes') && !isOwnCreator) {
              notifyNetworkDetailEvent({
                title: 'Nuevo requerimiento de Soporte',
                message: `${client} (${place}) · ${orderTitle}`,
                type: 'new_order',
                orderId: order.id
              });
            }
          } else {
            const shouldNotifyNew = hasAssignment ? isAssignedToMe : (userHasRole('administrador', 'admin') && !isOwnCreator);
            if (shouldNotifyNew) {
              const assignedNotice = hasAssignment ? ' (Asignado a ti)' : '';
              notifyNetworkDetailEvent({
                title: `Nuevo reporte de red${assignedNotice}`,
                message: `${client} (${place}) · ${orderTitle}`,
                type: 'new_order',
                orderId: order.id
              });
            }
          }
        }
      } else if (prev.status !== currentStatus || (order.updatedAt && prev.updatedAt && order.updatedAt !== prev.updatedAt)) {
        // Transición de estado o actualización detectada
        const oldStatus = prev.status;
        cache[order.id] = {
          ...prev,
          status: currentStatus,
          updatedAt: order.updatedAt || new Date().toISOString(),
          assignedUserId: order.assignedUserId || prev.assignedUserId || '',
          assignedUserName: order.assignedUserName || prev.assignedUserName || '',
          reviewOpenedById: order.reviewOpenedById || prev.reviewOpenedById || '',
          reviewOpenedByName: order.reviewOpenedByName || prev.reviewOpenedByName || '',
          reviewOpenedAt: order.reviewOpenedAt || prev.reviewOpenedAt || '',
          createdById: order.createdById || prev.createdById || '',
          createdByName: order.createdByName || prev.createdByName || '',
          createdByUsername: order.createdByUsername || prev.createdByUsername || ''
        };
        updated = true;

        const isOwnUpdater = (order.updatedById && order.updatedById === user.id) || (order.updatedByUsername && order.updatedByUsername === user.username);
        if (!isFirstRun && !isOwnUpdater && prev.status !== currentStatus) {
          if (currentStatus === 'en_revision' && oldStatus !== 'en_revision') {
            const hasCreator = !!(order.createdById || order.createdByName || order.createdByUsername);
            const shouldNotifyAttending = hasCreator ? isCreatedByMe : userHasRole('atencion_clientes');
            if (shouldNotifyAttending) {
              const actor = order.reviewOpenedByName || 'Soporte';
              notifyNetworkDetailEvent({
                title: 'Soporte técnico ha iniciado la atención',
                message: `${client} (${place}) · Atendido por ${actor}.`,
                type: 'attending',
                orderId: order.id
              });
            }
          } else if (currentStatus === 'resuelto_soporte') {
            if (isSupportToAttention) {
              if (userHasRole('administrador', 'admin')) {
                notifyNetworkDetailEvent({
                  title: 'Atención a clientes atendió requerimiento',
                  message: `${client} · ${order.technicianReport?.solution ? order.technicianReport.solution.slice(0, 65) + '...' : 'Revisa la respuesta.'}`,
                  type: 'resolved',
                  orderId: order.id
                });
              }
            } else {
              const hasCreator = !!(order.createdById || order.createdByName || order.createdByUsername);
              const shouldNotifyResolved = hasCreator ? isCreatedByMe : userHasRole('atencion_clientes');
              if (shouldNotifyResolved) {
                const sol = order.technicianReport?.solution || '';
                notifyNetworkDetailEvent({
                  title: 'Detalle resuelto por Soporte técnico',
                  message: `${client} · ${sol ? 'Solución: ' + sol.slice(0, 65) + '...' : 'Consulta con el cliente para validar.'}`,
                  type: 'resolved',
                  orderId: order.id
                });
              }
            }
          } else if (currentStatus === 'devuelto_soporte') {
            const shouldNotifyReturned = hasAssignment ? isAssignedToMe : userHasRole('administrador', 'admin');
            if (shouldNotifyReturned) {
              const lastNote = (Array.isArray(order.followUps) ? order.followUps.slice(-1)[0]?.note : '') || 'Continúa la falla';
              notifyNetworkDetailEvent({
                title: 'Reporte devuelto a Soporte técnico',
                message: `${client} · ${lastNote.slice(0, 65)}...`,
                type: 'returned',
                orderId: order.id
              });
            }
          } else if (currentStatus === 'completada' && oldStatus === 'resuelto_soporte') {
            const shouldNotifyConfirmed = hasAssignment ? isAssignedToMe : userHasRole('administrador', 'admin');
            if (shouldNotifyConfirmed) {
              notifyNetworkDetailEvent({
                title: 'Reporte concluido a conformidad',
                message: `${client} confirmó servicio restablecido.`,
                type: 'confirmed',
                orderId: order.id
              });
            }
          }
        }
      }
    }

    if (updated) {
      setStoredNetworkStateCache(cache);
      // Auto-actualizar la vista sin necesidad de recargar la página
      if (!isFirstRun) {
        if (typeof loadOrderPage === 'function') {
          loadOrderPage();
        } else if (typeof renderWOs === 'function') {
          renderWOs();
        }
      }
    }

    // Verificar recordatorios periódicos por prioridad de detalles no resueltos
    if (orders.length) {
      checkPriorityUnresolvedReminders(orders);
    }
  } catch (err) {
    // Silencioso para no saturar consola en reconexiones
  }
}

function initNetworkNotifications() {
  if (_netopsWatcherRunning) return;
  if (typeof window === 'undefined') return;
  if (getCurrentPageName() === 'login.html') return;

  const user = getCurrentUser();
  if (!user || !user.role) return;

  _netopsWatcherRunning = true;
  _injectNetworkNotificationStyles();

  // 1. Canal BroadcastChannel para comunicación instantánea entre pestañas abiertas
  if ('BroadcastChannel' in window) {
    try {
      _netopsNetworkChannel = new BroadcastChannel('netops_network_channel');
      _netopsNetworkChannel.onmessage = (event) => {
        handleNetworkOrderEvent(event.data);
      };
    } catch (e) {}
  }

  // 2. Soporte fallback cross-tab mediante localStorage storage events
  window.addEventListener('storage', (event) => {
    if (event.key === NETOPS_EVENT_STORAGE_KEY && event.newValue) {
      try {
        const payload = JSON.parse(event.newValue);
        handleNetworkOrderEvent(payload);
      } catch (e) {}
    }
  });

  // 3. Poller en segundo plano: cada 4s visible, 10s en segundo plano para sincronización en tiempo real
  let intervalMs = 4000;
  const runPoll = () => {
    checkNetworkOrderNotifications();
  };

  _netopsWatcherInterval = setInterval(runPoll, intervalMs);

  document.addEventListener('visibilitychange', () => {
    clearInterval(_netopsWatcherInterval);
    if (!document.hidden) {
      runPoll();
      _netopsWatcherInterval = setInterval(runPoll, 4000);
    } else {
      _netopsWatcherInterval = setInterval(runPoll, 10000);
    }
  });

  // Carga inicial
  setTimeout(runPoll, 800);
}

// Auto-inicialización segura en cualquier página
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initNetworkNotifications();
    }, { once: true });
  } else {
    setTimeout(initNetworkNotifications, 100);
  }
}


(() => {
    const host = location.hostname.replace(/\.+$/, '');
    const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    const isFile = location.protocol === 'file:' || !host;
    window.API = isLocalHost ? location.origin : (isFile ? (localStorage.getItem('netops_api_url') || 'https://netops-api.asistencias.workers.dev') : '');
})();

const ROLE_PAGE_ACCESS = {
    soporte: new Set([
        'dashboard.html',
        'mapa.html',
        'antenas.html',
        'nodos.html',
        'planificar.html',
        'ordenes.html',
        'material.html',
        'historial.html',
        'rutas.html',
        'login.html',
        ''
    ]),
    atencion_clientes: new Set([
        'dashboard.html',
        'mapa.html',
        'nodos.html',
        'planificar.html',
        'ordenes.html',
        'historial.html',
        'login.html',
        ''
    ]),
    tecnico: new Set(['planificar.html', 'ordenes.html', 'material.html', 'historial.html', 'login.html', ''])
};

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}') || {};
    } catch (e) {
        return {};
    }
}

function normalizeRole(role) {
    const raw = String(role || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (raw === 'admin' || raw === 'administrador') return 'administrador';
    if (raw === 'soporte') return 'soporte';
    if (raw === 'atencion' || raw === 'atencion_clientes' || raw === 'atencion a clientes' || raw === 'atencion_a_clientes') return 'atencion_clientes';
    if (raw === 'tecnico' || raw === 'tecnica') return 'tecnico';
    return raw;
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
    return userHasRole('administrador', 'admin');
}

function canAccessCurrentPage() {
    const role = normalizeRole(getCurrentUser().role);
    const currentPage = getCurrentPageName();
    if (currentPage === 'tecnicos.html' || currentPage === 'usuarios.html') {
        // Solo el rol administrador puede acceder a la gestión de usuarios
        return role === 'administrador';
    }
    if (role === 'administrador') return true;
    const allowed = ROLE_PAGE_ACCESS[role];
    if (!allowed) return true;
    return allowed.has(currentPage);
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
        window.location.href = role === 'tecnico' ? 'planificar.html' : 'mapa.html';
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
    document.body.classList.remove('notification-visible');
    const delay = type === 'warn' ? 4500 : 3000;
    clearTimeout(nt._hideTimer);
    nt._hideTimer = setTimeout(() => {
        nt.classList.remove('show');
        document.body.classList.remove('notification-visible');
    }, delay);
}

function OM(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    try {
        if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
            const openModals = Array.from(document.querySelectorAll('.mo.open')).filter(el => el !== modal);
            let maxZ = 14000;
            for (const el of openModals) {
                const zStr = (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function')
                    ? window.getComputedStyle(el).zIndex
                    : (el.style?.zIndex || '');
                const zNum = parseInt(zStr, 10);
                if (Number.isFinite(zNum) && zNum > maxZ) maxZ = zNum;
            }
            const ownZStr = (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function')
                ? window.getComputedStyle(modal).zIndex
                : (modal.style?.zIndex || '');
            const ownZ = parseInt(ownZStr, 10) || 0;
            const isConfirmOrPrompt = ['action-confirm-mo', 'action-prompt-mo', 'logout-confirm-mo', 'decision-mo', 'preset-route-confirm-mo'].includes(id);
            const minTargetZ = isConfirmOrPrompt ? 35000 : (id === 'order-chat-close-decision-mo' ? 16000 : 15000);
            const nextZ = Math.max(ownZ, maxZ + 200, minTargetZ);
            if (modal.style && typeof modal.style.setProperty === 'function') {
                modal.style.setProperty('z-index', String(nextZ), 'important');
            }
            if (modal.parentElement && typeof document.body.appendChild === 'function') {
                document.body.appendChild(modal);
            }
        }
    } catch (e) {}
    modal.classList.add('open');
}

function CM(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('open');
        if (modal.style && typeof modal.style.removeProperty === 'function') {
            modal.style.removeProperty('display');
            if (id !== 'order-chat-close-decision-mo' && id !== 'insert-physical-record-mo') {
                modal.style.removeProperty('z-index');
            }
        }
    }
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

/* Optimizador único de imágenes: reduce el peso al mínimo conservando nitidez.
   - Lado mayor máximo 1600 px (suficiente para leer etiquetas/pantallas ampliando).
   - WebP cuando el navegador lo soporta (≈30-40% menor que JPEG a igual calidad); si no, JPEG.
   - Ajusta la calidad progresivamente hasta quedar bajo ~180 KB; si aún excede, reduce dimensiones (mín. 1024 px).
   - Respeta la orientación EXIF y pone fondo blanco a imágenes con transparencia. */
const IMAGE_UPLOAD_MAX_SIDE = 1600;
const IMAGE_UPLOAD_MIN_SIDE = 1024;
const IMAGE_UPLOAD_TARGET_BYTES = 180 * 1024;
let imageUploadWebpSupported = null;

function imageUploadSupportsWebp() {
  if (imageUploadWebpSupported === null) {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 1;
      imageUploadWebpSupported = c.toDataURL('image/webp').startsWith('data:image/webp');
    } catch (_) { imageUploadWebpSupported = false; }
  }
  return imageUploadWebpSupported;
}

async function decodeImageForUpload(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (_) {}
  }
  const src = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlobForUpload(canvas, type, quality) {
  return new Promise(resolve => {
    if (canvas.toBlob) canvas.toBlob(blob => resolve(blob), type, quality);
    else resolve(null);
  });
}

function blobToDataUrlForUpload(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function optimizeImageForUpload(file, options = {}) {
  if (!file) return '';
  const maxSide = options.maxSide || IMAGE_UPLOAD_MAX_SIDE;
  const minSide = options.minSide || IMAGE_UPLOAD_MIN_SIDE;
  const target = options.targetBytes || IMAGE_UPLOAD_TARGET_BYTES;
  const image = await decodeImageForUpload(file);
  const width = image.width || image.naturalWidth;
  const height = image.height || image.naturalHeight;
  const type = imageUploadSupportsWebp() ? 'image/webp' : 'image/jpeg';
  const qualities = [0.82, 0.76, 0.7, 0.64, 0.58];
  let side = Math.min(maxSide, Math.max(width, height));
  let best = null;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  while (true) {
    const scale = Math.min(1, side / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const q of qualities) {
      const blob = await canvasToBlobForUpload(canvas, type, q);
      if (!blob) {
        const dataUrl = canvas.toDataURL(type, q);
        if (!best || dataUrl.length < best.size) best = { dataUrl, size: dataUrl.length * 0.75 };
        if (dataUrl.length * 0.75 <= target) { image.close?.(); return dataUrl; }
        continue;
      }
      if (!best || blob.size < best.size) best = { blob, size: blob.size };
      if (blob.size <= target) {
        image.close?.();
        return await blobToDataUrlForUpload(blob);
      }
    }
    if (side <= minSide) break;
    side = Math.max(minSide, Math.round(side * 0.82));
  }
  image.close?.();
  if (!best) return '';
  return best.dataUrl || await blobToDataUrlForUpload(best.blob);
}
window.optimizeImageForUpload = optimizeImageForUpload;

function compressAdminDetailCompletionImage(file) {
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
        #action-confirm-mo,
        #action-prompt-mo,
        .action-confirm-mo,
        body #action-confirm-mo,
        body:has(.topbar.app-sidebar) #action-confirm-mo,
        body #action-prompt-mo,
        body:has(.topbar.app-sidebar) #action-prompt-mo {
            box-sizing: border-box !important;
            position: fixed !important;
            z-index: 100000 !important;
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
            #action-confirm-mo,
            #action-prompt-mo,
            .action-confirm-mo,
            body #action-confirm-mo,
            body:has(.topbar.app-sidebar) #action-confirm-mo,
            body #action-prompt-mo,
            body:has(.topbar.app-sidebar) #action-prompt-mo {
                right: auto !important;
                bottom: auto !important;
                width: 125vw !important;
                height: 125dvh !important;
                max-width: none !important;
                max-height: none !important;
            }
        }
        #action-confirm-mo:not(.open),
        #action-prompt-mo:not(.open) { display:none !important; }
        #action-confirm-mo.open,
        #action-prompt-mo.open { display:flex !important; animation: acmo-fadein .18s ease; }
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
        .action-confirm-icon-wrap.warning {
            background: rgba(245,158,11,.14);
            color: #d97706;
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
        .action-confirm-actions .btn-ok-warning {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #fff;
            border: none;
            box-shadow: 0 4px 14px rgba(245,158,11,.35);
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
        #material-signature-mo {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100dvh !important;
            z-index: 100005 !important;
            display: none !important;
            align-items: center !important;
            justify-content: center !important;
            background: rgba(15, 23, 42, 0.65) !important;
            backdrop-filter: blur(4px) !important;
            padding: 16px !important;
            box-sizing: border-box !important;
        }
        #material-signature-mo:not(.open) { display: none !important; }
        #material-signature-mo.open { display: flex !important; }
        .material-signature-dialog { width: min(520px, calc(100vw - 24px)) !important; max-width: 520px !important; background: #ffffff !important; border-radius: 18px !important; padding: 16px 18px !important; box-sizing: border-box !important; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.35) !important; border: 1px solid #cbd5e1 !important; }
        .signature-canvas-container { width: 100% !important; height: 190px !important; background: #ffffff !important; border: 2px dashed #94a3b8 !important; border-radius: 12px !important; position: relative !important; touch-action: none !important; user-select: none !important; -webkit-user-select: none !important; margin: 12px 0 !important; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02) !important; }
        #material-signature-canvas { display: block !important; width: 100% !important; height: 100% !important; cursor: crosshair !important; touch-action: none !important; }
        .nt { z-index: 200000 !important; }
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
                <span id="action-confirm-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></span>
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

function askConfirmation({ title = 'Confirmar acción', message = '', confirmText = 'Confirmar', cancelText = 'Cancelar', tone = 'danger' } = {}) {
    const modal = ensureActionConfirmModal();
    const titleEl = document.getElementById('action-confirm-title');
    const messageEl = document.getElementById('action-confirm-message');
    const ok = document.getElementById('action-confirm-ok');
    const cancel = document.getElementById('action-confirm-cancel');
    const icon = document.getElementById('action-confirm-icon');
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (cancel) cancel.textContent = cancelText;
    const iconWrap = document.getElementById('action-confirm-icon-wrap');
    if (icon) {
        if (tone === 'ok') {
            icon.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        } else if (tone === 'warning') {
            icon.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        } else if (tone === 'delete') {
            icon.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        } else {
            // danger / default reject
            icon.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
        }
    }
    const iconClass = (tone === 'ok') ? 'ok' : ((tone === 'warning') ? 'warning' : 'danger');
    if (iconWrap) {
        iconWrap.className = `action-confirm-icon-wrap ${iconClass}`;
    }
    if (ok) {
        ok.textContent = confirmText;
        ok.className = `btn ${tone === 'ok' ? 'btn-ok-success' : (tone === 'warning' ? 'btn-ok-warning' : 'btn-ok-danger')}`;
    }
    OM('action-confirm-mo');
    return new Promise(resolve => {
        const done = value => {
            CM('action-confirm-mo');
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
window.askConfirmation = askConfirmation;

function ensureActionPromptModal() {
    _injectActionConfirmStyles();
    let modal = document.getElementById('action-prompt-mo');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'action-prompt-mo';
    modal.className = 'mo action-confirm-mo';
    modal.innerHTML = `
        <div class="action-confirm-card" id="action-prompt-card" role="dialog" aria-modal="true" style="border-color:rgba(2,132,199,.25);max-width:560px;margin:auto">
            <div class="action-confirm-icon-wrap" id="action-prompt-icon-wrap" style="background:#eff6ff;border:2px solid #bfdbfe;color:#0284c7;font-size:24px;display:grid;place-items:center">
                <span id="action-prompt-icon">📝</span>
            </div>
            <div class="action-confirm-copy" style="width:100%;min-width:0">
                <h2 id="action-prompt-title" style="color:#0f172a;margin:0 0 6px;font-size:20px">Registrar motivo</h2>
                <p id="action-prompt-message" style="color:#64748b;margin:0;font-size:13px;line-height:1.5">Indica el motivo o comentario:</p>
                <div style="margin-top:12px">
                    <textarea id="action-prompt-input" rows="3" placeholder="Escribe el motivo aquí..." style="width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;font-size:13px;font-family:inherit;resize:vertical;outline:none"></textarea>
                </div>
            </div>
            <div class="action-confirm-actions">
                <button class="btn btn-cancel-confirm" id="action-prompt-cancel" type="button">Cancelar</button>
                <button class="btn btn-ok-danger" id="action-prompt-ok" type="button" style="background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff;border:none">Confirmar</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    return modal;
}

function askReasonPrompt({
    title = 'Devolver a soporte',
    message = '',
    placeholder = 'Indica el motivo...',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    initialValue = '',
    tone = '',
    emptyWarning = ''
} = {}) {
    const modal = ensureActionPromptModal();
    const cardEl = document.getElementById('action-prompt-card');
    const iconWrap = document.getElementById('action-prompt-icon-wrap');
    const iconEl = document.getElementById('action-prompt-icon');
    const titleEl = document.getElementById('action-prompt-title');
    const messageEl = document.getElementById('action-prompt-message');
    const inputEl = document.getElementById('action-prompt-input');
    const ok = document.getElementById('action-prompt-ok');
    const cancel = document.getElementById('action-prompt-cancel');

    const resolvedTone = tone || (/devolver|rechazar/i.test(title) ? 'danger' : (/concluir|resolver/i.test(title) ? 'ok' : 'primary'));
    if (cardEl) {
        cardEl.style.borderColor = resolvedTone === 'danger'
            ? 'rgba(239,68,68,.28)'
            : (resolvedTone === 'ok' ? 'rgba(16,185,129,.28)' : 'rgba(2,132,199,.25)');
    }
    if (iconWrap) {
        if (resolvedTone === 'danger') {
            iconWrap.style.background = '#fff1f2';
            iconWrap.style.borderColor = '#fecdd3';
            iconWrap.style.color = '#e11d48';
        } else if (resolvedTone === 'ok') {
            iconWrap.style.background = '#ecfdf5';
            iconWrap.style.borderColor = '#a7f3d0';
            iconWrap.style.color = '#059669';
        } else {
            iconWrap.style.background = '#eff6ff';
            iconWrap.style.borderColor = '#bfdbfe';
            iconWrap.style.color = '#0284c7';
        }
    }
    if (iconEl) {
        iconEl.textContent = resolvedTone === 'danger' ? '↩️' : (resolvedTone === 'ok' ? '✓' : '📋');
    }
    if (ok) {
        ok.style.background = resolvedTone === 'danger'
            ? 'linear-gradient(135deg,#ef4444,#dc2626)'
            : (resolvedTone === 'ok' ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#0284c7,#0369a1)');
        ok.style.color = '#fff';
        ok.textContent = confirmText;
    }

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (inputEl) {
        inputEl.placeholder = placeholder;
        inputEl.value = initialValue || '';
    }
    if (cancel) cancel.textContent = cancelText;
    OM('action-prompt-mo');
    setTimeout(() => {
        if (inputEl) {
            inputEl.focus();
            if (initialValue) inputEl.select();
        }
    }, 80);

    return new Promise(resolve => {
        const done = val => {
            CM('action-prompt-mo');
            ok?.removeEventListener('click', onOk);
            cancel?.removeEventListener('click', onCancel);
            modal.removeEventListener('click', onOutside);
            resolve(val);
        };
        const onOk = () => {
            const text = (inputEl?.value || '').trim();
            if (!text) {
                if (typeof notify === 'function') notify(emptyWarning || 'Por favor escribe el motivo o comentario requerido.', 'warn');
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

/* ==========================================================================
   MOTOR GLOBAL DE FIRMA DIGITAL (COMPATIBLE CON CELULAR / VISTA MÓVIL Y WEB)
   ========================================================================== */
var activeSignatureResolve = null;
var signatureHasDrawn = false;
var signatureCtx = null;
var signatureCanvas = null;

function ensureMaterialSignatureModal() {
    _injectActionConfirmStyles();
    let modal = document.getElementById('material-signature-mo');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'mo';
    modal.id = 'material-signature-mo';
    modal.innerHTML = `
      <div class="md material-signature-dialog" style="max-width:520px;width:min(520px,calc(100vw - 24px));padding:16px;box-sizing:border-box;border-radius:18px;">
        <div class="material-modal-head" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px;">
          <div>
            <div class="mt2" id="signature-modal-title" style="font-size:17px;font-weight:800;color:#0f172a;line-height:1.2;">Firma Digital de Conformidad</div>
            <small id="signature-modal-subtitle" style="font-size:12px;color:#64748b;display:block;margin-top:3px;">Dibuja tu firma en el recuadro para validar el oficio.</small>
          </div>
          <button type="button" class="btn bsm bgh" onclick="cancelSignaturePrompt()" style="min-width:32px;height:32px;padding:0;font-size:16px;">✕</button>
        </div>
        <div id="signature-signer-badge" style="margin:8px 0;padding:8px 12px;background:#f1f5f9;border-radius:8px;font-size:12px;color:#334155;">
          Firmante: <strong id="signature-modal-signer-name">Usuario</strong> (<span id="signature-modal-signer-role">Responsable</span>)
        </div>
        <div class="signature-canvas-container">
          <canvas id="material-signature-canvas" width="480" height="190"></canvas>
          <div class="signature-guideline" style="position:absolute;bottom:35px;left:20px;right:20px;border-bottom:1.5px solid #cbd5e1;pointer-events:none;text-align:right;color:#94a3b8;font-size:11px;">
            Línea de firma digital ✕
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <button type="button" class="btn bsm bgh" onclick="clearSignatureCanvas()">🧹 Limpiar firma</button>
          <div style="display:flex;gap:8px;">
            <button type="button" class="btn bsm bgh" onclick="cancelSignaturePrompt()">Cancelar</button>
            <button type="button" class="btn bsm bg2" id="signature-confirm-btn" onclick="confirmSignaturePrompt()" style="font-weight:700">✓ Confirmar y Firmar</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
}

function initSignatureCanvas() {
    signatureCanvas = document.getElementById('material-signature-canvas');
    if (!signatureCanvas) return;
    signatureCtx = signatureCanvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const rect = signatureCanvas.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : 480;
    const height = rect.height > 0 ? rect.height : 190;
    signatureCanvas.width = Math.round(width * dpr);
    signatureCanvas.height = Math.round(height * dpr);
    signatureCtx.setTransform(1, 0, 0, 1, 0, 0);
    signatureCtx.scale(dpr, dpr);

    signatureCtx.lineWidth = 2.5;
    signatureCtx.lineCap = 'round';
    signatureCtx.lineJoin = 'round';
    signatureCtx.strokeStyle = '#0f172a';

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    function getCoords(e) {
        const cRect = signatureCanvas.getBoundingClientRect();
        const touch = (e.touches && e.touches[0]) ? e.touches[0] : ((e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : e);
        const clientX = touch.clientX !== undefined ? touch.clientX : (touch.pageX - (window.scrollX || 0));
        const clientY = touch.clientY !== undefined ? touch.clientY : (touch.pageY - (window.scrollY || 0));
        const cssW = cRect.width || (signatureCanvas.width / dpr);
        const cssH = cRect.height || (signatureCanvas.height / dpr);
        const scaleX = ((signatureCanvas.width / dpr) / cssW) || 1;
        const scaleY = ((signatureCanvas.height / dpr) / cssH) || 1;
        return {
            x: (clientX - cRect.left) * scaleX,
            y: (clientY - cRect.top) * scaleY
        };
    }

    function startDrawing(e) {
        if (e.cancelable) e.preventDefault();
        isDrawing = true;
        const coords = getCoords(e);
        lastX = coords.x;
        lastY = coords.y;
    }

    function draw(e) {
        if (!isDrawing) return;
        if (e.cancelable) e.preventDefault();
        const coords = getCoords(e);
        signatureCtx.beginPath();
        signatureCtx.moveTo(lastX, lastY);
        signatureCtx.lineTo(coords.x, coords.y);
        signatureCtx.stroke();
        lastX = coords.x;
        lastY = coords.y;
        signatureHasDrawn = true;
    }

    function stopDrawing(e) {
        if (isDrawing) {
            isDrawing = false;
        }
    }

    if (window.PointerEvent) {
        signatureCanvas.onpointerdown = (e) => {
            if (e.isPrimary === false) return;
            try { signatureCanvas.setPointerCapture(e.pointerId); } catch(err) {}
            startDrawing(e);
        };
        signatureCanvas.onpointermove = (e) => {
            if (e.isPrimary === false) return;
            draw(e);
        };
        signatureCanvas.onpointerup = (e) => {
            try { signatureCanvas.releasePointerCapture(e.pointerId); } catch(err) {}
            stopDrawing(e);
        };
        signatureCanvas.onpointercancel = (e) => {
            try { signatureCanvas.releasePointerCapture(e.pointerId); } catch(err) {}
            stopDrawing(e);
        };
    } else {
        signatureCanvas.ontouchstart = startDrawing;
        signatureCanvas.ontouchmove = draw;
        signatureCanvas.ontouchend = stopDrawing;
        signatureCanvas.ontouchcancel = stopDrawing;
        signatureCanvas.onmousedown = startDrawing;
        signatureCanvas.onmousemove = draw;
        signatureCanvas.onmouseup = stopDrawing;
    }

    window.removeEventListener('pointerup', stopDrawing);
    window.addEventListener('pointerup', stopDrawing);
}

function clearSignatureCanvas() {
    if (!signatureCanvas) signatureCanvas = document.getElementById('material-signature-canvas');
    if (!signatureCanvas) return;
    const ctx = signatureCanvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    ctx.restore();
    signatureHasDrawn = false;
}

function promptDigitalSignature({ title, subtitle, signerName, role } = {}) {
    return new Promise(resolve => {
        const modal = ensureMaterialSignatureModal();
        activeSignatureResolve = resolve;
        signatureHasDrawn = false;

        const titleEl = document.getElementById('signature-modal-title');
        const subEl = document.getElementById('signature-modal-subtitle');
        const signerEl = document.getElementById('signature-modal-signer-name');
        const roleEl = document.getElementById('signature-modal-signer-role');

        if (titleEl) titleEl.textContent = title || 'Firma Digital de Conformidad';
        if (subEl) subEl.textContent = subtitle || 'Dibuja tu firma en el recuadro para validar.';
        if (signerEl) signerEl.textContent = signerName || 'Usuario';
        if (roleEl) roleEl.textContent = role || 'Responsable';

        if (typeof OM === 'function') {
            OM('material-signature-mo');
        } else {
            modal?.classList.add('open');
        }

        requestAnimationFrame(() => {
            setTimeout(() => {
                initSignatureCanvas();
                clearSignatureCanvas();
            }, 40);
        });
    });
}

function confirmSignaturePrompt() {
    if (!signatureHasDrawn) {
        if (typeof notify === 'function') {
            notify('Por favor dibuja tu firma antes de confirmar.', 'warn');
        } else {
            alert('Por favor dibuja tu firma antes de confirmar.');
        }
        return;
    }
    const canvas = document.getElementById('material-signature-canvas');
    const signatureData = canvas ? canvas.toDataURL('image/png') : '';
    const signerName = document.getElementById('signature-modal-signer-name')?.textContent || 'Usuario';
    const signerRole = document.getElementById('signature-modal-signer-role')?.textContent || 'Responsable';

    if (typeof CM === 'function') {
        CM('material-signature-mo');
    } else {
        document.getElementById('material-signature-mo')?.classList.remove('open');
    }

    if (typeof activeSignatureResolve === 'function') {
        activeSignatureResolve({
            signature: signatureData,
            signerName,
            role: signerRole,
            timestamp: new Date().toISOString()
        });
        activeSignatureResolve = null;
    }
}

function cancelSignaturePrompt() {
    if (typeof CM === 'function') {
        CM('material-signature-mo');
    } else {
        document.getElementById('material-signature-mo')?.classList.remove('open');
    }
    if (typeof activeSignatureResolve === 'function') {
        activeSignatureResolve(null);
        activeSignatureResolve = null;
    }
}

window.ensureMaterialSignatureModal = ensureMaterialSignatureModal;
window.initSignatureCanvas = initSignatureCanvas;
window._systemInitSignatureCanvas = initSignatureCanvas;
window.clearSignatureCanvas = clearSignatureCanvas;
window._systemClearSignatureCanvas = clearSignatureCanvas;
window.promptDigitalSignature = promptDigitalSignature;
window._systemPromptDigitalSignature = promptDigitalSignature;
window.confirmSignaturePrompt = confirmSignaturePrompt;
window._systemConfirmSignaturePrompt = confirmSignaturePrompt;
window.cancelSignaturePrompt = cancelSignaturePrompt;
window._systemCancelSignaturePrompt = cancelSignaturePrompt;

function closeTopModal() {
    const openModals = Array.from(document.querySelectorAll('.mo.open'));
    if (!openModals.length) return false;
    // Ordenar por z-index efectivo para cerrar únicamente la ventana superior activa
    const sorted = openModals
        .map((el, idx) => ({
            el,
            idx,
            z: parseInt((typeof window !== 'undefined' && window.getComputedStyle) ? window.getComputedStyle(el).zIndex : '0', 10) || 0
        }))
        .sort((a, b) => (a.z !== b.z ? a.z - b.z : a.idx - b.idx));
    const modal = sorted[sorted.length - 1]?.el;
    if (!modal) return false;

    if (modal.id === 'action-confirm-mo') {
        const cancelBtn = document.getElementById('action-confirm-cancel');
        if (cancelBtn) {
            cancelBtn.click();
        } else {
            modal.classList.remove('open');
        }
        return true;
    }
    if (modal.id === 'action-prompt-mo') {
        const cancelBtn = document.getElementById('action-prompt-cancel');
        if (cancelBtn) {
            cancelBtn.click();
        } else {
            modal.classList.remove('open');
        }
        return true;
    }
    if (modal.id === 'material-signature-mo') {
        cancelSignaturePrompt();
        return true;
    }
    if (modal.id === 'plan-assignment-mo' && typeof resolvePlanAssignment === 'function') {
        resolvePlanAssignment(false);
        return true;
    }
    // Si es el mapa fullscreen del planificador, delegar al cierre especializado para limpiar overflow
    if (modal.id === 'plan-map-fullscreen-mo' && typeof closePlanFullMap === 'function') {
        closePlanFullMap();
        return true;
    }
    if (modal.id === 'evidence-viewer-mo') {
        closeEvidenceViewer();
        return true;
    }
    if (modal.id === 'order-chat-close-decision-mo' || modal.id === 'order-tech-report-mo') {
        if (typeof closeOrderReportModalDirectly === 'function') {
            closeOrderReportModalDirectly();
            return true;
        }
        if (typeof requestCloseOrderReport === 'function') {
            requestCloseOrderReport(true);
            return true;
        }
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
        soporte: 'Soporte',
        atencion_clientes: 'Atención a clientes',
        atencion: 'Atención a clientes',
        tecnico: 'Técnico'
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
    const role = normalizeRole(getCurrentUser()?.role);
    const target = role === 'tecnico' ? 'planificar.html' : 'mapa.html';
    document.querySelectorAll('.logo-link').forEach(el => {
        el.setAttribute('href', target);
    });
}

const NAV_ITEMS = [
    { href: 'dashboard.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>', label: 'Dashboard' },
    { href: 'mapa.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>', label: 'Mapa Mikrotiks' },
    { href: 'antenas.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4 22h16M7 17h10M8 12h8M9 7h6M6 22l6-19 6 19"/></svg>', label: 'Antenas' },
    { href: 'nodos.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', label: 'Pueblos' },
    { href: 'planificar.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>', label: 'Planificar' },
    { href: 'ordenes.html?detailKind=network', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/><path d="M19 16v2a7 7 0 0 1-7 7m-2 0h-1"/></svg>', label: 'Detalles de red' },
    { href: 'ordenes.html?detailKind=physical', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>', label: 'Detalles físicos' },
    { href: 'material.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>', label: 'Material' },
    { href: 'historial.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', label: 'Historial' },
    { href: 'tecnicos.html', adminOnly: true, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', label: 'Usuarios' }
];

function buildNavigationHtml() {
    const isAdmin = normalizeRole(getCurrentUser()?.role) === 'administrador';
    return NAV_ITEMS.filter(item => !item.adminOnly || isAdmin).map(item => `<a href="${item.href}" class="nb">${item.label}</a>`).join('');
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
        const isAdmin = normalizeRole(getCurrentUser()?.role) === 'administrador';
        NAV_ITEMS.forEach(item => {
            let link = nav.querySelector(`a[href="${item.href}"]`);
            if (item.adminOnly && !isAdmin) {
                if (link) link.remove();
                return;
            }
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


function updateActiveNavLink() {
    const current = getCurrentPageName();
    const currentParams = new URLSearchParams(window.location.search);
    let currentKind = currentParams.get('detailKind');
    if (current === 'ordenes.html') {
        const memKind = String(window.activeOrderDetailKind || document.body?.dataset?.detailKind || '').toLowerCase();
        if (memKind === 'network' || memKind === 'physical') {
            currentKind = memKind;
        }
    }
    if (!currentKind && typeof activeOrderDetailKind !== 'undefined') {
        currentKind = activeOrderDetailKind;
    }
    if (!currentKind && typeof window !== 'undefined' && window.activeOrderDetailKind) {
        currentKind = window.activeOrderDetailKind;
    }
    if (!currentKind && typeof document !== 'undefined' && document.body?.dataset?.detailKind) {
        currentKind = document.body.dataset.detailKind;
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
                    if (typeof closeOrderReportModalDirectly === 'function') {
                        closeOrderReportModalDirectly();
                    }
                    if (typeof selectOrderDetailKind === 'function') {
                        selectOrderDetailKind('network', true);
                    }
                    updateActiveNavLink();
                } else if (linkHref.includes('detailKind=physical')) {
                    e.preventDefault();
                    if (typeof closeOrderReportModalDirectly === 'function') {
                        closeOrderReportModalDirectly();
                    }
                    if (typeof selectOrderDetailKind === 'function') {
                        selectOrderDetailKind('physical', true);
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
    const norm = normalizeRole(role);
    const isAdmin = norm === 'administrador';
    const allowed = ROLE_PAGE_ACCESS[norm];
    document.querySelectorAll('.nav .nb').forEach(link => {
        const fullHref = String(link.getAttribute('href') || '').trim();
        const pageHref = fullHref.split('?')[0].toLowerCase();
        const item = NAV_ITEMS.find(entry => entry.href === fullHref || entry.href.split('?')[0].toLowerCase() === pageHref);
        let canShow = false;
        if (isAdmin) {
            canShow = true;
        } else if (item?.adminOnly) {
            canShow = false;
        } else if (allowed) {
            canShow = allowed.has(pageHref);
        } else {
            canShow = true;
        }
        if (!isAdmin && (item?.adminOnly || pageHref === 'tecnicos.html' || pageHref === 'usuarios.html')) {
            link.remove();
            return;
        }
        link.hidden = !canShow;
        link.setAttribute('aria-hidden', canShow ? 'false' : 'true');
        link.classList.toggle('role-hidden-nav', !canShow);
        if (canShow) {
            link.style.removeProperty('display');
        } else {
            link.style.setProperty('display', 'none', 'important');
        }
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
const NETOPS_ACK_DELETIONS_KEY = 'netops_acknowledged_deletion_reqs_v1';

function getAcknowledgedDeletionIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(NETOPS_ACK_DELETIONS_KEY) || '[]'));
  } catch (e) {
    return new Set();
  }
}

function setAcknowledgedDeletionIds(ids) {
  try {
    localStorage.setItem(NETOPS_ACK_DELETIONS_KEY, JSON.stringify([...ids]));
  } catch (e) {}
}

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

function getNotificationRelatedNetworkDetail(notif) {
  if (!notif) return null;
  // 1. Explicit properties on notif
  const explicit = notif.originNetworkFolio || notif.networkOrderFolio || notif.relatedNetworkFolio;
  if (explicit) {
    return { folio: String(explicit).trim(), isDirect: !notif.originNetworkFolio };
  }

  const orderId = notif.orderId || notif.networkOrderId;
  let order = null;
  if (orderId && typeof state !== 'undefined' && Array.isArray(state.workOrders)) {
    order = state.workOrders.find(w => w && (w.id === orderId || w.folio === orderId));
  }

  if (order) {
    if (order.originNetworkFolio) {
      return { folio: String(order.originNetworkFolio).trim(), town: order.town || order.nodeName || '', isDirect: false };
    }
    if (order.originNetworkOrderId) {
      const orig = state.workOrders.find(w => w && w.id === order.originNetworkOrderId);
      const origFolio = orig ? (orig.folio || (typeof getOrderFolio === 'function' ? getOrderFolio(orig) : '') || orig.id) : order.originNetworkOrderId;
      if (origFolio) {
        return { folio: String(origFolio).trim(), town: orig?.town || order.town || '', isDirect: false };
      }
    }
    const isNet = order.detailKind === 'network' ||
                  (typeof getOrderDetailKind === 'function' && getOrderDetailKind(order) === 'network') ||
                  /_red$|^red_/.test(String(order.category || '')) ||
                  String(order.id || '').startsWith('RED-') ||
                  String(order.folio || '').startsWith('RED-');
    if (isNet) {
      const f = order.folio || (typeof getOrderFolio === 'function' ? getOrderFolio(order) : '') || (order.id ? (String(order.id).startsWith('RED-') ? order.id : `RED-${order.id}`) : '');
      if (f) {
        return { folio: String(f).trim(), town: order.town || order.nodeName || '', isDirect: true };
      }
    }
  }

  if (orderId && String(orderId).startsWith('RED-')) {
    return { folio: String(orderId).trim(), isDirect: true };
  }

  if (notif.url) {
    try {
      const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : 'http://localhost';
      const u = new URL(notif.url, origin);
      const paramKind = u.searchParams.get('detailKind');
      const paramId = u.searchParams.get('orderId') || u.searchParams.get('id');
      if (paramKind === 'network' && paramId) {
        const f = String(paramId).startsWith('RED-') ? paramId : `RED-${paramId}`;
        return { folio: f, isDirect: true };
      }
      if (paramId && String(paramId).startsWith('RED-')) {
        return { folio: paramId, isDirect: true };
      }
    } catch (_) {}
  }

  const text = `${notif.title || ''} ${notif.message || ''}`;
  const match = text.match(/\b(RED-[A-Za-z0-9_-]+)\b/i);
  if (match) {
    return { folio: match[1].toUpperCase(), isDirect: true };
  }

  if (orderId && notif.type && (notif.type.startsWith('network_') || ['attending', 'resolved', 'returned', 'confirmed', 'review_deferred', 'reopened'].includes(notif.type))) {
    const folio = String(orderId).startsWith('RED-') ? String(orderId) : `RED-${String(orderId).slice(-6).toUpperCase()}`;
    return { folio, isDirect: true };
  }

  return null;
}

function renderNotificationNetworkRef(notif) {
  if (!notif) return '';
  const netInfo = getNotificationRelatedNetworkDetail(notif);
  if (!netInfo || !netInfo.folio) return '';
  if (notif.title && notif.title.includes(netInfo.folio)) return '';

  const tooltip = `Detalle de red relacionado: ${escapeHtml(netInfo.folio)}${netInfo.town ? ' · ' + escapeHtml(netInfo.town) : ''}`;
  return `<span class="notif-network-ref-pill" style="display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-weight:700;color:#0284c7;background:#f0f9ff;border:1px solid #bae6fd;padding:1px 6px;border-radius:9999px;white-space:nowrap;line-height:1.4;letter-spacing:0.01em;vertical-align:middle;max-width:180px;overflow:hidden;text-overflow:ellipsis;" title="${tooltip}">` +
    `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.85;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>` +
    `<span>Red: ${escapeHtml(netInfo.folio)}</span>` +
  `</span>`;
}

function addNotificationToInbox({ id, title, message, type, orderId = '', networkOrderId = '', networkOrderFolio = '', originNetworkFolio = '', eventId = '', url = '', createdAt = new Date().toISOString() }) {
  const isTecnico = (typeof userHasRole === 'function' && userHasRole('tecnico')) ||
                    (typeof isTechnicianPlanView === 'function' && isTechnicianPlanView()) ||
                    (typeof normalizeRole === 'function' && normalizeRole(typeof getCurrentUser === 'function' ? getCurrentUser()?.role : '') === 'tecnico') ||
                    (document.documentElement?.dataset?.role === 'tecnico') ||
                    (document.body && document.body.classList.contains('plan-technician-view'));
  if (isTecnico) return;
  const inbox = getStoredNotificationsInbox();
  const isPhysical = type === 'physical' || type === 'sent_to_physical';
  const computedUrl = url || (orderId ? `/ordenes.html?detailKind=${isPhysical ? 'physical' : 'network'}&orderId=${encodeURIComponent(orderId)}` : '');
  
  const netInfo = getNotificationRelatedNetworkDetail({
    orderId,
    networkOrderId,
    networkOrderFolio,
    originNetworkFolio,
    url: computedUrl,
    type,
    title,
    message
  });
  const resolvedNetFolio = networkOrderFolio || originNetworkFolio || (netInfo ? netInfo.folio : '');

  // Evitar duplicados idénticos; en mensajes de chat permitir múltiples notificaciones usando eventId único por mensaje
  const existingIdx = inbox.findIndex(x =>
    (id && x.id === id) ||
    (eventId ? x.eventId === eventId : (x.orderId === orderId && x.type === type))
  );
  if (existingIdx >= 0) {
    inbox[existingIdx] = {
      ...inbox[existingIdx],
      title,
      message,
      type,
      orderId,
      networkOrderId: networkOrderId || inbox[existingIdx].networkOrderId || '',
      networkOrderFolio: resolvedNetFolio || inbox[existingIdx].networkOrderFolio || '',
      originNetworkFolio: originNetworkFolio || inbox[existingIdx].originNetworkFolio || '',
      eventId,
      url: computedUrl || inbox[existingIdx].url || '',
      unread: true,
      createdAt
    };
    setStoredNotificationsInbox(inbox);
    renderNotificationCenter();
    return;
  }
  inbox.unshift({
    id: id || ('notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
    title,
    message,
    type,
    orderId,
    networkOrderId: networkOrderId || '',
    networkOrderFolio: resolvedNetFolio || '',
    originNetworkFolio: originNetworkFolio || '',
    eventId,
    url: computedUrl,
    unread: true,
    createdAt
  });
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
  let orderId = item?.orderId || '';
  const rawDest = targetUrl || item?.url || '';
  if (!orderId && rawDest) {
    try {
      const u = new URL(rawDest, window.location.origin);
      orderId = u.searchParams.get('orderId') || u.searchParams.get('id') || '';
    } catch (e) {
      const m = String(rawDest).match(/[?&](?:orderId|id)=([^&#]+)/i);
      if (m) orderId = decodeURIComponent(m[1]);
    }
  }
  const isPhysical = item?.type === 'physical' || item?.type === 'sent_to_physical' || item?.isPhysical;
  const targetKind = isPhysical ? 'physical' : 'network';

  if (window.location.pathname.includes('ordenes')) {
    CM('notification-panel-mo');
    if (orderId && typeof openOrderTechnicianReport === 'function') {
      try {
        const curUrl = new URL(window.location.href);
        curUrl.searchParams.set('detailKind', targetKind);
        curUrl.searchParams.delete('orderId');
        curUrl.searchParams.delete('id');
        window.history.replaceState({}, '', curUrl);
      } catch (e) {}
      openOrderTechnicianReport(orderId);
      return;
    }
  }

  let dest = rawDest;
  if (!dest && orderId) {
    dest = `/ordenes.html?detailKind=${isPhysical ? 'physical' : 'network'}&orderId=${encodeURIComponent(orderId)}`;
  }
  if (dest) {
    CM('notification-panel-mo');
    window.location.href = dest;
  }
}

function markAllNotificationsAsRead() {
  const inbox = getStoredNotificationsInbox();
  inbox.forEach(x => { x.unread = false; });
  setStoredNotificationsInbox(inbox);

  // Marcar como reconocidas las solicitudes de eliminación actuales para que el contador no se quede trabado
  try {
    const ackIds = getAcknowledgedDeletionIds();
    const delReqs = (typeof getPendingDeletionRequests === 'function') ? getPendingDeletionRequests() : [];
    delReqs.forEach(r => { if (r?.id) ackIds.add(r.id); });
    setAcknowledgedDeletionIds(ackIds);
  } catch (e) {}

  // Quitar puntos rojos de chats no leídos en la tabla si existen
  try {
    document.querySelectorAll('.net-unread-chat-dot').forEach(el => el.remove());
  } catch (e) {}

  renderNotificationCenter();

  if (typeof notify === 'function') {
    notify('Todas las notificaciones han sido marcadas como leídas.', 'ok');
  }
}

function ensureNotificationCenter() {
    const isTecnico = (typeof userHasRole === 'function' && userHasRole('tecnico')) ||
                      (typeof isTechnicianPlanView === 'function' && isTechnicianPlanView()) ||
                      (typeof normalizeRole === 'function' && normalizeRole(typeof getCurrentUser === 'function' ? getCurrentUser()?.role : '') === 'tecnico') ||
                      (document.documentElement?.dataset?.role === 'tecnico') ||
                      (document.body && document.body.classList.contains('plan-technician-view'));
    if (isTecnico) {
        const bell = document.getElementById('notification-bell');
        if (bell) bell.remove();
        const mobileBell = document.querySelector('.tech-header-bell');
        if (mobileBell) mobileBell.remove();
        const mobileCount = document.getElementById('tech-mobile-bell-count');
        if (mobileCount) mobileCount.remove();
        return;
    }
    let btn = document.getElementById('notification-bell');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'notification-bell';
        btn.className = 'notification-bell floating-notification-bell' + (isTecnico ? ' technician-bell' : '');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Abrir notificaciones');
        btn.title = isTecnico ? 'Avisos y productividad' : 'Centro de notificaciones';
        btn.onclick = openNotificationPanel;
        btn.innerHTML = '<span class="notification-bell-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></span><span id="notification-count">0</span>';
        document.body.appendChild(btn);
    } else {
        btn.classList.toggle('technician-bell', isTecnico);
    }
    btn.onclick = openNotificationPanel;
    btn.style.setProperty('pointer-events', 'auto', 'important');
    btn.style.setProperty('cursor', 'pointer', 'important');

    if (document.querySelector('.tech-bottom-nav') || document.body.classList.contains('plan-technician-view') || (document.body.classList.contains('planificar-page') && isTecnico && window.matchMedia && window.matchMedia('(max-width: 760px)').matches)) {
        btn.style.setProperty('display', 'none', 'important');
        btn.style.setProperty('visibility', 'hidden', 'important');
        btn.style.setProperty('pointer-events', 'none', 'important');
        btn.remove();
    }
    if (!document.getElementById('notification-panel-mo')) {
        const modal = document.createElement('div');
        modal.id = 'notification-panel-mo';
        modal.className = 'mo';
        const initVolPct = Math.round((typeof getNotificationVolume === 'function' ? getNotificationVolume() : 0.45) * 100);
        modal.innerHTML = `
            <div class="md notification-panel" role="dialog" aria-modal="true" style="max-width:620px;">
                <div class="modal-head" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                    <div>
                        <h2 style="margin:0 0 4px;font-size:20px;">${isTecnico ? 'Notificaciones y Desempeño' : 'Centro de Notificaciones'}</h2>
                        <p id="notification-panel-sub" style="margin:0;color:#64748b;font-size:12px;">${isTecnico ? 'Avisos de material y resúmenes de tu jornada.' : 'Avisos de detalles de red y actividades en tiempo real.'}</p>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <button class="btn bgh" id="btn-mark-all-notifications-read" type="button" style="font-size:11px;padding:4px 9px;" onclick="markAllNotificationsAsRead()">Marcar leídas</button>
                        <button class="btn bgh" type="button" style="font-size:11px;padding:4px 9px;" onclick="CM('notification-panel-mo')">Cerrar</button>
                    </div>
                </div>
                <div class="notification-volume-bar" style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin:10px 0 12px;">
                    <span style="font-size:12px;display:inline-flex;align-items:center;gap:5px;color:#334155;font-weight:700;white-space:nowrap;">
                        <svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                        Volumen de alertas:
                    </span>
                    <input type="range" id="netops-notif-volume-slider" min="10" max="100" step="5" value="${initVolPct}" style="flex:1;min-width:100px;accent-color:#0874e8;cursor:pointer;" oninput="updateNotificationVolume(this.value)">
                    <span id="netops-notif-volume-label" style="font-size:12px;font-weight:800;color:#0874e8;min-width:34px;text-align:right;">${initVolPct}%</span>
                    <button type="button" class="btn bsm" style="font-size:11px;padding:3px 9px;min-height:26px;border-radius:6px;" onclick="testNotificationVolume()" title="Probar sonido actual">Probar</button>
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
    const isTecnico = (typeof userHasRole === 'function' && userHasRole('tecnico')) ||
                      (typeof isTechnicianPlanView === 'function' && isTechnicianPlanView()) ||
                      (typeof normalizeRole === 'function' && normalizeRole(typeof getCurrentUser === 'function' ? getCurrentUser()?.role : '') === 'tecnico') ||
                      (document.documentElement?.dataset?.role === 'tecnico') ||
                      (document.body && document.body.classList.contains('plan-technician-view'));
    if (isTecnico) {
        const bell = document.getElementById('notification-bell');
        if (bell) bell.remove();
        const mobileBell = document.querySelector('.tech-header-bell');
        if (mobileBell) mobileBell.remove();
        const mobileCount = document.getElementById('tech-mobile-bell-count');
        if (mobileCount) mobileCount.remove();
        return;
    }
    const bell = document.getElementById('notification-bell');
    const count = document.getElementById('notification-count');
    const list = document.getElementById('notification-list');
    if (bell) {
        bell.classList.toggle('technician-bell', isTecnico);
        bell.onclick = openNotificationPanel;
        bell.style.setProperty('pointer-events', 'auto', 'important');
        bell.style.setProperty('cursor', 'pointer', 'important');
    }
    if (document.querySelector('.tech-bottom-nav') || document.body.classList.contains('plan-technician-view') || (document.body.classList.contains('planificar-page') && isTecnico && window.matchMedia && window.matchMedia('(max-width: 760px)').matches)) {
        if (bell) {
            bell.style.setProperty('display', 'none', 'important');
            bell.style.setProperty('visibility', 'hidden', 'important');
            bell.style.setProperty('pointer-events', 'none', 'important');
            bell.remove();
        }
    }

    const isAdmin = typeof userHasRole === 'function' && userHasRole('administrador', 'admin');
    const delReqs = (!isTecnico && isAdmin && typeof getPendingDeletionRequests === 'function') ? getPendingDeletionRequests() : [];
    const ackDeletionIds = getAcknowledgedDeletionIds();
    const unreadDelReqs = delReqs.filter(r => !ackDeletionIds.has(r.id));
    const rawInbox = getStoredNotificationsInbox();
    // Para técnicos: filtrar estrictamente notificaciones de material y productividad; NO mostrar reportes de red
    const inbox = isTecnico
        ? rawInbox.filter(x => x.isMaterial || x.category === 'material' || x.type === 'material' || x.isProductivity || x.type === 'productivity')
        : rawInbox;
    const unreadInbox = inbox.filter(x => x.unread);
    const volSlider = document.getElementById('netops-notif-volume-slider');
    const volLabel = document.getElementById('netops-notif-volume-label');
    if (volSlider && volLabel && typeof getNotificationVolume === 'function') {
        const curPct = Math.round(getNotificationVolume() * 100);
        volSlider.value = curPct;
        volLabel.textContent = `${curPct}%`;
    }

    const totalUnread = unreadDelReqs.length + unreadInbox.length;

    if (count) {
        count.textContent = totalUnread > 9 ? '+9' : String(totalUnread);
        count.style.display = totalUnread > 0 ? 'grid' : 'none';
    }
    if (bell) {
        bell.classList.toggle('has-items', totalUnread > 0);
    }
    const mobileBellCount = document.getElementById('tech-mobile-bell-count');
    if (mobileBellCount) {
        mobileBellCount.textContent = totalUnread > 9 ? '+9' : String(totalUnread);
        mobileBellCount.style.display = totalUnread > 0 ? 'inline-flex' : 'none';
    }

    if (!list) return;

    if (!totalUnread && !inbox.length) {
        list.innerHTML = `<div class="empty-state" style="padding:32px 16px;text-align:center;color:#64748b;font-size:13px;">${isTecnico ? 'No tienes avisos de material ni resúmenes pendientes.' : 'No tienes notificaciones pendientes.'}</div>`;
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
            const type = typeof getRequestTargetType === 'function' ? getRequestTargetType(req) : (req.nodeId ? 'node' : (req.detailId ? 'detail' : 'item'));
            const targetId = (typeof getRequestTargetId === 'function' ? getRequestTargetId(req) : '') || req.targetId || req.detailId || req.nodeId || req.equipmentId;
            const order = type === 'detail' ? (state.workOrders || []).find(w => w.id === targetId) : null;
            const node = type === 'node' ? (state.nodes || []).find(n => n.id === targetId) : null;
            const eq = type === 'equipment' ? (state.equipment || []).find(e => e.id === targetId) : null;

            const folio = req.folio || order?.folio || (order && typeof getOrderFolio === 'function' ? getOrderFolio(order) : '');
            const client = req.clientName || order?.clientName || (type === 'detail' ? label : (type === 'equipment' ? (eq?.name || label) : (node?.name || label)));
            const town = req.town || order?.town || (order && typeof getOrderPlace === 'function' ? getOrderPlace(order) : '') || node?.town || eq?.town || '';
            const desc = req.description || order?.description || order?.title || '';
            const isNetwork = (req.detailKind || order?.detailKind) === 'network';
            const typeLabel = isNetwork ? 'Detalle de red' : (type === 'detail' ? 'Detalle físico' : (type === 'node' ? 'Pueblo' : (type === 'equipment' ? 'Antena' : 'Elemento')));
            const dateStr = req.createdAt ? new Date(req.createdAt).toLocaleString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
            const reqNetFolio = req.originNetworkFolio || order?.originNetworkFolio || (isNetwork ? (folio || req.folio || order?.folio) : '');
            const reqNetBadge = reqNetFolio ? renderNotificationNetworkRef({ originNetworkFolio: reqNetFolio }) : '';

            itemsHtml.push(`
                <div class="notification-item deletion-request-card" style="border-left:4px solid #ef4444;margin-bottom:10px;padding:12px 14px;background:#fff;border-radius:14px;box-shadow:0 4px 14px rgba(15,23,42,0.06);">
                    <div class="notification-top" style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                            <span class="badge" style="background:#fee2e2;color:#991b1b;font-weight:800;font-size:10px;">Solicitud de Eliminación</span>
                            <span class="badge" style="background:#f1f5f9;color:#334155;font-size:10px;font-weight:700;">${escapeHtml(typeLabel)}</span>
                            ${folio ? `<span class="badge" style="background:#e0f2fe;color:#0369a1;font-weight:800;font-size:10.5px;">${escapeHtml(folio)}</span>` : ''}
                            ${!isNetwork && reqNetBadge ? reqNetBadge : ''}
                        </div>
                        ${dateStr ? `<small style="color:#94a3b8;font-size:10.5px;font-weight:700;white-space:nowrap;">${escapeHtml(dateStr)}</small>` : ''}
                    </div>
                    <div style="display:grid;gap:4px;font-size:12px;color:#1e293b;margin:6px 0 10px 0;">
                        ${client ? `<div><strong style="color:#0f172a;">Cliente / Registro:</strong> ${escapeHtml(client)}</div>` : ''}
                        ${town ? `<div><strong style="color:#0f172a;">Pueblo / Lugar:</strong> ${escapeHtml(town)}</div>` : ''}
                        ${desc ? `<div><strong style="color:#0f172a;">Detalle solicitado:</strong> <span style="color:#475569;">${escapeHtml(desc)}</span></div>` : ''}
                        <div style="font-size:11px;color:#64748b;margin-top:2px;">
                            <strong>Solicitado por:</strong> ${escapeHtml(req.requestedByName || 'Usuario')}
                        </div>
                    </div>
                    <div class="card-actions" style="display:flex;gap:8px;justify-content:flex-end;">
                        <button class="btn bg2" style="min-height:30px;padding:4px 12px;font-size:11.5px;font-weight:800;" onclick="approveDeletionRequest('${escapeAttr(req.id)}')">Aprobar eliminación</button>
                        <button class="btn br" style="min-height:30px;padding:4px 12px;font-size:11.5px;font-weight:800;" onclick="rejectDeletionRequest('${escapeAttr(req.id)}')">Rechazar</button>
                    </div>
                </div>
            `);
        });
    }

    if (isTecnico) {
        // Notificaciones organizadas para técnico: Material y Productividad
        const materialItems = inbox.filter(x => x.isMaterial || x.type === 'material' || x.category === 'material');
        const prodItems = inbox.filter(x => x.isProductivity || x.type === 'productivity');

        if (materialItems.length) {
            itemsHtml.push(`
                <div style="font-size:11px;font-weight:800;color:#0284c7;text-transform:uppercase;letter-spacing:0.04em;margin:10px 0 4px;">
                    Movimientos y Material (${materialItems.length})
                </div>
            `);
            materialItems.forEach(notif => {
                const dateStr = notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '';
                const unreadStyle = notif.unread ? 'background:#f0f9ff;border-color:#bae6fd;' : 'background:#ffffff;opacity:0.85;';
                const netRefBadge = renderNotificationNetworkRef(notif);
                itemsHtml.push(`
                    <div class="notification-item" style="${unreadStyle}border-left:4px solid #0284c7;margin-bottom:8px;padding:10px 12px;cursor:pointer;" onclick="markNotificationAsRead('${notif.id}','${notif.url || ''}');if(typeof checkTechnicianPendingMaterialPrompt==='function')checkTechnicianPendingMaterialPrompt();">
                        <div class="notification-top" style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;">
                                <strong style="font-size:13px;color:#0f172a;">${escapeHtml(notif.title)}</strong>
                                ${netRefBadge}
                            </div>
                            ${notif.unread ? '<span class="badge" style="background:#0284c7;color:#fff;font-size:10px;padding:2px 6px;border-radius:10px;flex-shrink:0;">Nuevo</span>' : ''}
                        </div>
                        <div style="font-size:12px;color:#334155;margin:4px 0 6px;line-height:1.4;">${escapeHtml(notif.message)}</div>
                        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#94a3b8;">
                            <span>${dateStr}</span>
                            <span style="color:#0284c7;font-weight:700;">Revisar entrega →</span>
                        </div>
                    </div>
                `);
            });
        }

        if (prodItems.length) {
            itemsHtml.push(`
                <div style="font-size:11px;font-weight:800;color:#10b981;text-transform:uppercase;letter-spacing:0.04em;margin:12px 0 4px;">
                    Resúmenes de Productividad (${prodItems.length})
                </div>
            `);
            prodItems.forEach(notif => {
                const dateStr = notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '';
                const unreadStyle = notif.unread ? 'background:#f0fdf4;border-color:#bbf7d0;' : 'background:#ffffff;opacity:0.85;';
                const netRefBadge = renderNotificationNetworkRef(notif);
                itemsHtml.push(`
                    <div class="notification-item" style="${unreadStyle}border-left:4px solid #10b981;margin-bottom:8px;padding:10px 12px;cursor:pointer;" onclick="markNotificationAsRead('${notif.id}');if(typeof openTechnicianProductivitySummary==='function')openTechnicianProductivitySummary();">
                        <div class="notification-top" style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;">
                                <strong style="font-size:13px;color:#0f172a;">${escapeHtml(notif.title)}</strong>
                                ${netRefBadge}
                            </div>
                            ${notif.unread ? '<span class="badge" style="background:#10b981;color:#fff;font-size:10px;padding:2px 6px;border-radius:10px;flex-shrink:0;">Nuevo</span>' : ''}
                        </div>
                        <div style="font-size:12px;color:#334155;margin:4px 0 6px;line-height:1.4;">${escapeHtml(notif.message)}</div>
                        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#94a3b8;">
                            <span>${dateStr}</span>
                            <span style="color:#059669;font-weight:700;">Ver desempeño →</span>
                        </div>
                    </div>
                `);
            });
        }
    } else {
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
                const netRefBadge = renderNotificationNetworkRef(notif);
                itemsHtml.push(`
                    <div class="notification-item" style="${unreadStyle}border-left:4px solid ${accentColor};margin-bottom:8px;padding:10px 12px;cursor:pointer;transition:transform 0.12s;" onclick="markNotificationAsRead('${notif.id}','${notif.url || ''}')">
                        <div class="notification-top" style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;">
                                <strong style="font-size:13px;color:#0f172a;">${escapeHtml(notif.title)}</strong>
                                ${netRefBadge}
                            </div>
                            ${notif.unread ? '<span class="badge" style="background:#0284c7;color:#fff;font-size:10px;padding:2px 6px;border-radius:10px;flex-shrink:0;">Nuevo</span>' : ''}
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
    applyModuleVisualIdentity(current);
    ensureNotificationCenter();
    initNetworkNotifications();
    initServiceWorker();
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
  if (!detail || detail.deletedAt || detail.reviewOpenedAt || !userHasRole('administrador','admin','soporte')) return false;
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

function appendSharedNetworkFollowUp(detail,action,label,note = '', photos = []) {
  const actor = getCurrentUser();
  detail.followUps = [...(Array.isArray(detail.followUps) ? detail.followUps : []),{
    id:gid('ofu'),action,label,note:String(note || '').trim(),at:new Date().toISOString(),
    byId:actor.id || '',byName:actor.name || actor.username || 'Usuario',...(Array.isArray(photos) && photos.length ? {photos:photos.slice()} : {})
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
      ${!solved ? `<button class="btn action-reviewed" onclick="showSharedNetworkActionForm('${escapeHtml(id)}','${escapeHtml(refreshName)}','reviewed')">Revisado</button><button class="btn action-solved" onclick="completeSharedNetworkDetail('${escapeHtml(id)}','${escapeHtml(refreshName)}')">Solucionado</button><button class="btn action-physical" onclick="openInsertPhysicalRecordModal('${escapeHtml(id)}','${escapeHtml(refreshName)}')">Registrar detalle físico</button><button class="btn action-same" onclick="showSharedNetworkActionForm('${escapeHtml(id)}','${escapeHtml(refreshName)}','same')">Sigue el mismo tema</button><button class="btn action-resend" onclick="resendSharedNetworkDetail('${escapeHtml(id)}','${escapeHtml(refreshName)}')">Volver a enviar</button>` : ''}
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

function resolveOrderRegisteredNode(order) {
  if (!order) return { nodeId: '', nodeName: 'Pueblo registrado' };
  let nodeId = order.nodeId ? String(order.nodeId) : '';
  let nodeName = order.nodeName ? String(order.nodeName).trim() : '';

  // 1. Si tenemos nodeId, buscar el nodo en state.nodes
  if (nodeId) {
    const nd = (state.nodes || []).find(n => !n.deletedAt && String(n.id) === nodeId)
      || (state.nodes || []).find(n => String(n.id) === nodeId);
    if (nd) {
      const label = typeof getNodeLabel === 'function' ? getNodeLabel(nd) : (nd.name || nd.id);
      return { nodeId: String(nd.id), nodeName: label };
    }
    if (nodeName) return { nodeId, nodeName };
  }

  // 2. Si nodeId estaba vacío, buscar por nodeName, town o detailLocation
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

  // 3. Si la orden tiene antena vinculada, resolver su pueblo vinculado
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

function extractCleanPhysicalDescription(desc) {
  if (!desc) return '';
  let str = String(desc).trim();
  const match = str.match(/Falla:\s*([\s\S]+)$/i);
  if (match && match[1]) {
    str = match[1].trim();
  }
  return str;
}

let currentInsertPhysNetworkOrderId = '';
let insertPhysRefreshCallback = null;

function ensureInsertPhysicalRecordModal() {
  let modal = document.getElementById('insert-physical-record-mo');
  if (!modal) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="mo insert-physical-record-mo" id="insert-physical-record-mo" style="z-index:15000 !important;">
        <div class="md insert-physical-record-card" style="max-width:540px;width:95%;">
          <div class="modal-head" style="padding:12px 18px 10px;">
            <div>
              <h2 id="insert-phys-title" style="font-size:16px;margin:0 0 2px;">Registrar detalle físico en Pueblo</h2>
              <p id="insert-phys-subtitle" style="font-size:12px;color:#64748b;margin:0;">Registro en pueblo · Requiere acuerdo mutuo</p>
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
              <strong>ℹ️ Acuerdo mutuo:</strong> Ambas partes deben estar de acuerdo. Al registrarse, se guarda en el pueblo registrado y se cierra este reporte de red.
            </div>

            <!-- Pueblo registrado fijo -->
            <div class="fi" style="margin-bottom:0;">
              <div id="insert-phys-node-badge" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;color:#0f172a;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:16px;line-height:1;">🏘️</span>
                  <div>
                    <span style="font-size:11px;color:#64748b;font-weight:600;display:block;">Pueblo registrado</span>
                    <strong id="insert-phys-node-name" style="font-size:13px;color:#0f172a;"></strong>
                  </div>
                </div>
                <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:#e2e8f0;color:#334155;border-radius:4px;font-size:11px;font-weight:700;">🔒 Pueblo fijo</span>
              </div>
              <input type="hidden" id="insert-phys-node" value="">
              <input type="hidden" id="insert-phys-equipment" value="">
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

async function rejectPhysicalRecordProposalFromModal() {
  const orderId = currentInsertPhysNetworkOrderId;
  CM('insert-physical-record-mo');
  if (typeof rejectSendNetworkToPhysical === 'function') {
    return rejectSendNetworkToPhysical(orderId);
  }
}

function openInsertPhysicalRecordModal(orderId, refreshCallback) {
  const order = (state.workOrders || []).find(item => item.id === orderId && !item.deletedAt);
  if (!order) return notify('No se encontró el detalle de red.', 'err');

  currentInsertPhysNetworkOrderId = orderId;
  insertPhysRefreshCallback = typeof refreshCallback === 'function' ? refreshCallback : null;

  ensureInsertPhysicalRecordModal();

  const folio = typeof getWorkOrderFolio === 'function' ? getWorkOrderFolio(order) : (order.folio || order.id);
  const folioEl = document.getElementById('insert-phys-origin-folio');
  if (folioEl) folioEl.textContent = folio;

  const clientEl = document.getElementById('insert-phys-origin-client');
  if (clientEl) clientEl.textContent = order.clientName || order.title || 'Reporte de red';

  // Forzosamente resolver el pueblo registrado:
  const registeredNode = resolveOrderRegisteredNode(order);
  const nodeHidden = document.getElementById('insert-phys-node');
  if (nodeHidden) nodeHidden.value = registeredNode.nodeId || '';
  const eqHidden = document.getElementById('insert-phys-equipment');
  if (eqHidden) eqHidden.value = '';

  const nodeNameEl = document.getElementById('insert-phys-node-name');
  if (nodeNameEl) nodeNameEl.textContent = registeredNode.nodeName || 'Pueblo registrado';

  // Categorías físicas
  const catSelect = document.getElementById('insert-phys-category');
  const categories = (typeof detailCategoriesForKind === 'function' ? detailCategoriesForKind('physical') : null) || [
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
  let catHtml = '';
  categories.forEach(([catId, catLabel]) => {
    catHtml += `<option value="${escapeHtml(catId)}">${escapeHtml(catLabel)}</option>`;
  });
  if (catSelect) catSelect.innerHTML = catHtml;

  // Determine proposal / derivation status
  const physStatus = typeof getPhysicalDerivationStatus === 'function' ? getPhysicalDerivationStatus(order) : { pending: false };
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
  const isSoporte = typeof userHasRole === 'function' && userHasRole('soporte');
  const isAtencion = typeof userHasRole === 'function' && userHasRole('atencion_clientes');
  const isAdmin = typeof userHasRole === 'function' && userHasRole('administrador', 'admin');

  const titleEl = document.getElementById('insert-phys-title');
  const subtitleEl = document.getElementById('insert-phys-subtitle');
  const noticeEl = document.getElementById('insert-phys-agreement-notice');
  const saveBtn = document.getElementById('insert-phys-save-btn');
  const saveLabel = document.getElementById('insert-phys-save-label');
  const rejectBtn = document.getElementById('insert-phys-reject-btn');
  const prioritySelect = document.getElementById('insert-phys-priority');
  const descText = document.getElementById('insert-phys-description');

  if (physStatus.pending) {
    const canConfirm = physStatus.proposedBy === 'soporte' ? (isAtencion || isAdmin) : (isSoporte || isAdmin);
    const prop = order.physicalProposal || {};

    if (catSelect) catSelect.value = prop.category || 'otro';
    if (prioritySelect) prioritySelect.value = prop.priority || order.priority || 'media';
    const rawDesc = prop.description || physStatus.note || '';
    if (descText) descText.value = extractCleanPhysicalDescription(rawDesc);

    if (canConfirm) {
      if (titleEl) titleEl.textContent = 'Confirmar acuerdo: Detalle físico';
      if (subtitleEl) subtitleEl.textContent = `Propuesta de ${physStatus.proposedByName || (physStatus.proposedBy === 'soporte' ? 'Soporte técnico' : 'Atención a clientes')}`;
      if (noticeEl) {
        noticeEl.style.display = 'block';
        noticeEl.style.background = '#fef3c7';
        noticeEl.style.borderColor = '#fde68a';
        noticeEl.style.borderLeftColor = '#f59e0b';
        noticeEl.style.color = '#92400e';
        noticeEl.innerHTML = `<strong>🤝 Acuerdo mutuo:</strong> ${escapeHtml(physStatus.proposedByName || 'La contraparte')} propuso registrar este detalle físico en <strong>${escapeHtml(registeredNode.nodeName)}</strong> y cerrar este reporte de red.`;
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
        noticeEl.innerHTML = `<strong>⏳ Esperando acuerdo:</strong> Propuesta enviada a contraparte para registrar en <strong>${escapeHtml(registeredNode.nodeName)}</strong>.`;
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

    if (titleEl) titleEl.textContent = 'Registrar detalle físico en Pueblo';
    if (subtitleEl) subtitleEl.textContent = 'Registro en pueblo · Requiere acuerdo mutuo';
    if (noticeEl) {
      noticeEl.style.display = 'block';
      noticeEl.style.background = '#f5f3ff';
      noticeEl.style.borderColor = '#ddd6fe';
      noticeEl.style.borderLeftColor = '#7c3aed';
      noticeEl.style.color = '#5b21b6';
      noticeEl.innerHTML = `<strong>ℹ️ Acuerdo mutuo:</strong> Ambas partes deben estar de acuerdo. Al registrarse, se guarda en el pueblo y se cierra el reporte de red.`;
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

  OM('insert-physical-record-mo');
  setTimeout(() => descText?.focus(), 80);
}

function onInsertPhysEquipmentChange() {
  // Compatibilidad: la antena no se selecciona
}

function onInsertPhysNodeChange() {
  // Compatibilidad: el pueblo no se selecciona
}

async function saveInsertedPhysicalRecord() {
  const orderId = currentInsertPhysNetworkOrderId;
  const order = (state.workOrders || []).find(item => item.id === orderId && !item.deletedAt);

  // Forzosamente pueblo registrado de la orden
  const registeredNode = resolveOrderRegisteredNode(order);
  const nodeId = registeredNode.nodeId || '';
  const nodeName = registeredNode.nodeName || 'Pueblo registrado';
  const equipmentId = ''; // FORZOSAMENTE NINGUNA ANTENA
  const equipmentName = '';

  const category = document.getElementById('insert-phys-category')?.value || 'otro';
  const priority = document.getElementById('insert-phys-priority')?.value || 'media';
  const rawDescription = document.getElementById('insert-phys-description')?.value.trim() || '';
  const description = extractCleanPhysicalDescription(rawDescription);

  if (!description) {
    notify('Por favor escribe la descripción o falla física del registro.', 'warn');
    document.getElementById('insert-phys-description')?.focus();
    return;
  }

  const nd = (state.nodes || []).find(n => String(n.id) === String(nodeId));
  const targetPlace = nodeName;
  const categoryLabel = typeof orderCategoryLabel === 'function' ? orderCategoryLabel(category) : category;

  const physStatus = typeof getPhysicalDerivationStatus === 'function' && order ? getPhysicalDerivationStatus(order) : { pending: false };
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
  const isSoporte = typeof userHasRole === 'function' && userHasRole('soporte');
  const isAtencion = typeof userHasRole === 'function' && userHasRole('atencion_clientes');
  const isAdmin = typeof userHasRole === 'function' && userHasRole('administrador', 'admin');
  const now = new Date().toISOString();
  const orderFolio = order ? (typeof getWorkOrderFolio === 'function' ? getWorkOrderFolio(order) : (order.folio || order.id)) : '';

  // Determinar si es confirmación de acuerdo o propuesta inicial
  const isAgreementConfirmation = physStatus.pending && (physStatus.proposedBy === 'soporte' ? (isAtencion || isAdmin) : (isSoporte || isAdmin));
  const isDirectAdminRegistration = !physStatus.pending && isAdmin;

  if (isAgreementConfirmation || isDirectAdminRegistration) {
    // Confirmación de acuerdo: resumen claro y conciso
    if (typeof askConfirmation === 'function') {
      const propBy = physStatus.proposedByName ? `\n• Propuesto por: ${physStatus.proposedByName}` : '';
      const confirmed = await askConfirmation({
        title: '¿Confirmar acuerdo y registrar detalle físico?',
        message: `• Pueblo: ${nodeName}\n• Falla: ${description}${propBy}\n\nSe registrará en el pueblo y se cerrará este reporte de red.`,
        confirmText: 'Confirmar y cerrar reporte',
        cancelText: 'Cancelar',
        tone: 'ok'
      });
      if (!confirmed) return;
    }

    const newPhysical = {
      id: typeof generateId === 'function' ? generateId() : ('ph_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      detailKind: 'physical',
      category: category,
      title: description.length > 80 ? (description.slice(0, 77) + '...') : description,
      description: description,
      priority: priority,
      visitType: 'comunidad', // Forzosamente en el pueblo
      equipmentId: '', // NO antena
      equipmentName: '',
      nodeId: nodeId || '',
      nodeName: nodeName,
      region: nd?.region || (order ? order.region : '') || '',
      detailLocation: nd?.location || (order ? order.detailLocation : '') || nodeName,
      lat: nd?.lat || (order ? order.lat : '') || '',
      lng: nd?.lng || (order ? order.lng : '') || '',
      clientName: '',
      clientPhone: '',
      assignedUserId: '', // No se asigna a nadie para resolver
      assignedUserName: '',
      status: 'pendiente',
      createdById: currentUser.id || '',
      createdByName: currentUser.name || currentUser.username || 'Personal',
      createdAt: now,
      updatedAt: now,
      originNetworkOrderId: order ? order.id : '',
      originNetworkFolio: orderFolio,
      followUps: [
        {
          action: 'physical_record_created',
          user: currentUser.name || currentUser.username || 'Sistema',
          at: now,
          note: orderFolio ? `Registro físico creado por acuerdo mutuo en pueblo ${nodeName} desde reporte de red ${orderFolio}` : `Registro físico creado en pueblo ${nodeName}`
        }
      ]
    };

    state.workOrders = state.workOrders || [];
    state.workOrders.push(newPhysical);
    if (typeof saveRecord === 'function') {
      await saveRecord('workOrders', newPhysical);
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
        solution: `Concluido por pase a detalle físico acordado por ambas partes en pueblo ${nodeName}: ${description}`,
        completedAt: now
      };
      if (typeof appendSharedNetworkFollowUp === 'function') {
        appendSharedNetworkFollowUp(
          order,
          'physical',
          'Derivado a Detalle Físico por acuerdo mutuo',
          `Acuerdo mutuo completado. Registrado en pueblo ${nodeName}: "${description}". Reporte de red cerrado.`
        );
      }
      delete order.physicalProposal;
      order.updatedAt = now;
      order.updatedById = currentUser.id || '';
      if (typeof saveRecord === 'function') {
        await saveRecord('workOrders', order);
      }
      if (typeof broadcastNetworkOrderChange === 'function') {
        broadcastNetworkOrderChange(order, 'sent_to_physical');
      }
      if (typeof updateOrderChatLive === 'function') {
        updateOrderChatLive(order);
      }
    }

    CM('insert-physical-record-mo');
    if (typeof renderWOs === 'function') renderWOs();
    if (typeof renderAntennaDetailList === 'function') renderAntennaDetailList();
    if (typeof renderNodeDetailList === 'function') renderNodeDetailList();
    if (typeof insertPhysRefreshCallback === 'function') {
      try { insertPhysRefreshCallback(); } catch (e) { }
    }

    notify(`Acuerdo mutuo completado: Detalle físico registrado en ${nodeName} y reporte de red cerrado.`, 'ok');
  } else {
    // Propuesta inicial: resumen conciso
    if (typeof askConfirmation === 'function') {
      const confirmed = await askConfirmation({
        title: '¿Enviar propuesta de detalle físico?',
        message: `• Pueblo: ${nodeName}\n• Falla: ${description}\n\nSe enviará a la contraparte para su acuerdo mutuo.`,
        confirmText: 'Enviar propuesta',
        cancelText: 'Cancelar',
        tone: 'primary'
      });
      if (!confirmed) return;
    }

    if (order) {
      const proposedBy = (isSoporte && !isAtencion) ? 'soporte' : (isAtencion ? 'atencion' : (typeof isNetworkSupportToAttention === 'function' && isNetworkSupportToAttention(order) ? 'soporte' : 'atencion'));
      const roleLabel = proposedBy === 'soporte' ? 'Soporte técnico' : 'Atención a clientes';

      order.physicalProposal = {
        equipmentId: '',
        equipmentName: '',
        nodeId,
        nodeName,
        category,
        priority,
        description,
        proposedBy,
        proposedByName: currentUser.name || currentUser.username || roleLabel,
        at: now
      };
      if (typeof appendSharedNetworkFollowUp === 'function') {
        appendSharedNetworkFollowUp(
          order,
          `physical_proposed_${proposedBy}`,
          `Pase a Detalles Físicos propuesto por ${roleLabel}`,
          `Pueblo: ${nodeName} · Categoría: ${categoryLabel} · Falla: ${description}`
        );
      }
      order.updatedAt = now;
      order.updatedById = currentUser.id || '';
      if (typeof saveRecord === 'function') {
        await saveRecord('workOrders', order);
      }
      if (typeof broadcastNetworkOrderChange === 'function') {
        broadcastNetworkOrderChange(order, 'physical_proposed', { proposedBy });
      }
      if (typeof updateOrderChatLive === 'function') {
        updateOrderChatLive(order);
      }
    }

    CM('insert-physical-record-mo');
    if (typeof renderWOs === 'function') renderWOs();
    if (typeof insertPhysRefreshCallback === 'function') {
      try { insertPhysRefreshCallback(); } catch (e) { }
    }

    notify('Propuesta enviada al chat. Se requiere el acuerdo de la contraparte para registrar y cerrar el reporte de red.', 'ok');
  }
}

async function sendSharedNetworkToPhysical(id,refreshName) {
  const detail=(state.workOrders||[]).find(item=>item.id===id&&!item.deletedAt); if(!detail)return;
  const note=sharedNetworkActionNote();
  if(!note){notify('Describe el detalle físico que se presentó.','err');document.getElementById('shared-network-action-note')?.focus();return;}
  const now = new Date().toISOString();
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
  const orderFolio = typeof getWorkOrderFolio === 'function' ? getWorkOrderFolio(detail) : (detail.folio || detail.id);
  const registeredNode = typeof resolveOrderRegisteredNode === 'function'
    ? resolveOrderRegisteredNode(detail)
    : { nodeId: detail.nodeId || '', nodeName: detail.nodeName || 'Pueblo registrado' };
  const nodeId = registeredNode.nodeId || detail.nodeId || '';
  const nodeName = registeredNode.nodeName || detail.nodeName || 'Pueblo registrado';
  const targetPlace = nodeName;

  const newPhysical = {
    id: typeof generateId === 'function' ? generateId() : ('ph_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    detailKind: 'physical',
    category: 'otro',
    title: note.length > 80 ? (note.slice(0, 77) + '...') : note,
    description: note,
    priority: detail.priority || 'media',
    visitType: 'comunidad',
    equipmentId: '',
    equipmentName: '',
    nodeId: nodeId,
    nodeName: nodeName,
    region: detail.region || '',
    detailLocation: detail.detailLocation || nodeName,
    clientName: '',
    clientPhone: '',
    assignedUserId: '', // No se asigna a nadie para resolver
    assignedUserName: '',
    status: 'pendiente',
    createdById: currentUser.id || '',
    createdByName: currentUser.name || currentUser.username || 'Personal',
    createdAt: now,
    updatedAt: now,
    originNetworkOrderId: detail.id,
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

  state.workOrders = state.workOrders || [];
  state.workOrders.push(newPhysical);
  await saveRecord('workOrders', newPhysical);

  hideSharedNetworkActionForm();
  appendSharedNetworkFollowUp(detail,'physical','Detalle físico registrado',`${note} · Vinculado a pueblo: ${targetPlace}`);
  await saveSharedNetworkWorkflow(detail,refreshName,'registró detalle físico en pueblo',`Se creó registro físico en ${targetPlace}.`);
  notify(`Detalle físico registrado exitosamente en ${targetPlace}. El caso de red permanece activo.`,'ok');
}

if (typeof window !== 'undefined') {
  window.resolveOrderRegisteredNode = resolveOrderRegisteredNode;
  window.extractCleanPhysicalDescription = extractCleanPhysicalDescription;
  window.openInsertPhysicalRecordModal = openInsertPhysicalRecordModal;
  window.saveInsertedPhysicalRecord = saveInsertedPhysicalRecord;
  window.onInsertPhysEquipmentChange = onInsertPhysEquipmentChange;
  window.onInsertPhysNodeChange = onInsertPhysNodeChange;
  window.rejectPhysicalRecordProposalFromModal = rejectPhysicalRecordProposalFromModal;
  window.isOrderCreator = isOrderCreator;
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
let _netopsSessionStartedAt = Date.now();
let _netopsInitialPollDone = false;
const _netopsRecentlyNotified = new Map();
const NETOPS_NETWORK_CACHE_KEY = 'netops_network_orders_state_cache_v2';
const NETOPS_EVENT_STORAGE_KEY = 'netops_last_network_event_v2';

function _injectNetworkNotificationStyles() {
  if (document.getElementById('netops-network-notif-styles')) return;
  const style = document.createElement('style');
  style.id = 'netops-network-notif-styles';
  style.textContent = `
    .netops-right-toasts {
      position: fixed;
      top: 18px;
      right: 20px;
      z-index: 2147483640;
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: min(340px, calc(100vw - 32px));
      pointer-events: none;
    }
    .netops-right-toast {
      pointer-events: auto;
      position: relative;
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(8px);
      border-radius: 11px;
      padding: 10px 14px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.10), 0 1px 3px rgba(15, 23, 42, 0.05);
      border: 1px solid #e2e8f0;
      border-left: 4px solid #2563eb;
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 10px;
      align-items: start;
      cursor: pointer;
      transform: translateX(125%);
      opacity: 0;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
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
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15);
      transform: translateY(-1px);
    }
    .netops-toast-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }
    .netops-toast-icon svg {
      width: 17px;
      height: 17px;
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
    .netops-toast-unresolvable { border-left-color: #dc2626; }
    .netops-toast-unresolvable .netops-toast-icon { background: #fef2f2; color: #dc2626; }

    .netops-toast-reopened { border-left-color: #d97706; }
    .netops-toast-reopened .netops-toast-icon { background: #fef3c7; color: #d97706; }

    .netops-toast-updated { border-left-color: #6366f1; }
    .netops-toast-updated .netops-toast-icon { background: #eef2ff; color: #6366f1; }

    .netops-toast-sent_to_physical { border-left-color: #8b5cf6; }
    .netops-toast-sent_to_physical .netops-toast-icon { background: #f5f3ff; color: #8b5cf6; }

    .netops-toast-resent { border-left-color: #2563eb; }
    .netops-toast-resent .netops-toast-icon { background: #eff6ff; color: #2563eb; }

    .netops-toast-retaken { border-left-color: #0284c7; }
    .netops-toast-retaken .netops-toast-icon { background: #f0f9ff; color: #0284c7; }

    .netops-toast-chat_message { border-left-color: #0284c7; }
    .netops-toast-chat_message .netops-toast-icon { background: #e0f2fe; color: #0284c7; }

    .netops-toast-physical_proposed { border-left-color: #7c3aed; }
    .netops-toast-physical_proposed .netops-toast-icon { background: #f5f3ff; color: #7c3aed; }

    .netops-toast-deleted { border-left-color: #dc2626; }
    .netops-toast-deleted .netops-toast-icon { background: #fef2f2; color: #dc2626; }

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

function getNotificationVolume() {
  if (typeof window === 'undefined') return 0.85;
  try {
    const raw = localStorage.getItem('netops_notification_volume');
    if (raw !== null) {
      const parsed = parseFloat(raw);
      if (Number.isFinite(parsed)) {
        return Math.min(1, Math.max(0.1, parsed)); // Mínimo 10% (no se pueden desactivar)
      }
    }
  } catch (e) {}
  return 0.85; // Nivel de volumen predeterminado claro y perceptible (85%)
}

function setNotificationVolume(val) {
  const num = typeof val === 'number' ? (val > 1 ? val / 100 : val) : (parseFloat(val) / 100);
  const clamped = Math.min(1, Math.max(0.1, Number.isFinite(num) ? num : 0.85));
  try {
    localStorage.setItem('netops_notification_volume', String(clamped));
  } catch (e) {}
  const slider = document.getElementById('netops-notif-volume-slider');
  const label = document.getElementById('netops-notif-volume-label');
  const pct = Math.round(clamped * 100);
  if (slider && Number(slider.value) !== pct) slider.value = pct;
  if (label) label.textContent = `${pct}%`;
  return clamped;
}

function updateNotificationVolume(sliderVal) {
  setNotificationVolume(sliderVal);
}

function testNotificationVolume() {
  playSubtleNotificationTone();
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
  let permAsked = false;
  const unlock = () => {
    const ctx = getNetopsAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (!permAsked) {
      permAsked = true;
      requestNotificationPermissionOnce();
    }
  };
  ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(evt => {
    window.addEventListener(evt, unlock, { passive: true });
  });
}
if (typeof window !== 'undefined') {
  unlockNetopsAudioOnInteraction();
}

/**
 * Tono sutil armónico generado mediante Web Audio API (dos notas suaves y cálidas).
 * Respeta el volumen configurable sin permitir desactivación.
 */
function playSubtleNotificationTone() {
  try {
    const ctx = getNetopsAudioContext();
    if (!ctx) return;
    const vol = typeof getNotificationVolume === 'function' ? getNotificationVolume() : 0.45;

    const play = () => {
      try {
        const now = ctx.currentTime;

        // Tono formal WifiMex: E5 (659.25Hz) -> G#5 (830.61Hz) -> B5 (987.77Hz) con overtone cristalino E6 (1318.51Hz)
        // Ganancias optimizadas con volumen predeterminado al 85% y control deslizable de 10% a 100%
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(0.0001, now);
        gain1.gain.linearRampToValueAtTime(0.40 * vol, now + 0.015);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.44);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.46);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(830.61, now + 0.10);
        gain2.gain.setValueAtTime(0.0001, now + 0.10);
        gain2.gain.linearRampToValueAtTime(0.50 * vol, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.10);
        osc2.stop(now + 0.60);

        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(987.77, now + 0.20);
        gain3.gain.setValueAtTime(0.0001, now + 0.20);
        gain3.gain.linearRampToValueAtTime(0.55 * vol, now + 0.22);
        gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.start(now + 0.20);
        osc3.stop(now + 0.74);

        const osc4 = ctx.createOscillator();
        const gain4 = ctx.createGain();
        osc4.type = 'sine';
        osc4.frequency.setValueAtTime(1318.51, now + 0.22);
        gain4.gain.setValueAtTime(0.0001, now + 0.22);
        gain4.gain.linearRampToValueAtTime(0.25 * vol, now + 0.24);
        gain4.gain.exponentialRampToValueAtTime(0.0001, now + 0.66);
        osc4.connect(gain4);
        gain4.connect(ctx.destination);
        osc4.start(now + 0.22);
        osc4.stop(now + 0.68);
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
  networkOrderId = '',
  networkOrderFolio = '',
  originNetworkFolio = '',
  duration = 5000
} = {}) {
  const container = ensureRightNotificationContainer();

  // Limitar a máximo 3 tarjetas visibles simultáneas para evitar apilamientos excesivos en pantalla
  const existingToasts = container.querySelectorAll('.netops-right-toast:not([data-dismissing])');
  if (existingToasts.length >= 3) {
    for (let i = 0; i <= existingToasts.length - 3; i++) {
      const oldest = existingToasts[i];
      if (oldest) {
        oldest.dataset.dismissing = '1';
        oldest.classList.remove('is-visible');
        oldest.classList.add('is-hiding');
        setTimeout(() => oldest.remove(), 250);
      }
    }
  }

  const toast = document.createElement('div');
  toast.className = `netops-right-toast netops-toast-${type}`;
  toast.setAttribute('role', 'alert');

  const icons = {
    new_order: '<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    attending: '<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    resolved: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    returned: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v3"/></svg>',
    unresolvable: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
    confirmed: '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    reopened: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M8 16H3v5"/></svg>',
    updated: '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    sent_to_physical: '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    resent: '<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
    retaken: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>',
    chat_message: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    physical_proposed: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    deleted: '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>'
  };

  const iconSvg = icons[type] || '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
  const timeStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const netRefBadge = typeof renderNotificationNetworkRef === 'function'
    ? renderNotificationNetworkRef({ orderId, networkOrderId, networkOrderFolio, originNetworkFolio, url, title, message, type })
    : '';

  toast.innerHTML = `
    <div class="netops-toast-icon">${iconSvg}</div>
    <div class="netops-toast-content">
      <div class="netops-toast-title" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <span>${escapeHtml(title)}</span>
        ${netRefBadge}
      </div>
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
    let targetUrl = url;
    if (!targetUrl && orderId) {
      const isPhysicalKind = type === 'sent_to_physical' || type === 'physical';
      targetUrl = `/ordenes.html?detailKind=${isPhysicalKind ? 'physical' : 'network'}&orderId=${encodeURIComponent(orderId)}`;
    }
    if (targetUrl) {
      window.location.href = targetUrl;
    }
  });

  const closeBtn = toast.querySelector('.netops-toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss();
    });
  }

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
  const isTecnico = (typeof userHasRole === 'function' && userHasRole('tecnico')) ||
                    (typeof isTechnicianPlanView === 'function' && isTechnicianPlanView()) ||
                    (typeof normalizeRole === 'function' && normalizeRole(typeof getCurrentUser === 'function' ? getCurrentUser()?.role : '') === 'tecnico') ||
                    (document.documentElement?.dataset?.role === 'tecnico') ||
                    (document.body && document.body.classList.contains('plan-technician-view'));
  if (isTecnico) return;
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


function initServiceWorker() {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', {updateViaCache:'none'}).then(() => {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event?.data;
        if (data && data.type === 'NETOPS_OPEN_NOTIFICATION_TARGET') {
          if (data.orderId && typeof markNotificationReadByOrderId === 'function') {
            markNotificationReadByOrderId(data.orderId);
          }
          if (data.orderId && window.location.pathname.includes('ordenes') && typeof openOrderTechnicianReport === 'function') {
            openOrderTechnicianReport(data.orderId);
          } else if (data.url) {
            window.location.href = data.url;
          }
        }
      });
    }).catch(() => {});
  } catch (e) {}
}

function triggerDesktopNotification({ title, message, url = '', orderId = '', networkOrderId = '', networkOrderFolio = '', originNetworkFolio = '', eventId = '' }) {
  const isTecnico = (typeof userHasRole === 'function' && userHasRole('tecnico')) ||
                    (typeof isTechnicianPlanView === 'function' && isTechnicianPlanView()) ||
                    (typeof normalizeRole === 'function' && normalizeRole(typeof getCurrentUser === 'function' ? getCurrentUser()?.role : '') === 'tecnico') ||
                    (document.documentElement?.dataset?.role === 'tecnico') ||
                    (document.body && document.body.classList.contains('plan-technician-view'));
  if (isTecnico) return;
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      const netInfo = typeof getNotificationRelatedNetworkDetail === 'function'
        ? getNotificationRelatedNetworkDetail({ orderId, networkOrderId, networkOrderFolio, originNetworkFolio, url, title, message })
        : null;
      let desktopTitle = title;
      if (netInfo?.folio && !desktopTitle.includes(netInfo.folio)) {
        desktopTitle = `${desktopTitle} · Red: ${netInfo.folio}`;
      }

      const logoUrl = window.location.origin + '/assets/brand/wifimex-logo.jpg';
      const tag = 'netops-network-' + (eventId || orderId || Date.now());
      const options = {
        body: message,
        icon: logoUrl,
        badge: logoUrl,
        tag,
        renotify: false,
        requireInteraction: false,
        data: { url, orderId }
      };

      const createWindowNotification = () => {
        try {
          const notif = new Notification(desktopTitle, options);
          notif.onclick = () => {
            try { window.focus(); } catch (e) {}
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
        } catch (err) {}
      };

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg && typeof reg.showNotification === 'function') {
            reg.showNotification(desktopTitle, options).catch(createWindowNotification);
          } else {
            createWindowNotification();
          }
        }).catch(createWindowNotification);
      } else {
        createWindowNotification();
      }
    } catch (e) {
      console.warn('No se pudo emitir la notificación de escritorio', e);
    }
  } else if (Notification.permission === 'default') {
    requestNotificationPermissionOnce();
  }
}

function getUserColor(name, userId = '') {
  const normStr = str => {
    if (typeof normalizeName === 'function') return normalizeName(str);
    return String(str || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
  };
  const normTarget = normStr(name);
  const userIds = String(userId || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  const checkUser = u => {
    if (!u || u.deletedAt) return null;
    const uId = String(u.id || '').toLowerCase();
    const uName = normStr(u.name);
    const uUsername = normStr(u.username);
    if (userIds.length && userIds.includes(uId)) {
      if (normTarget && uName && uName !== normTarget && uUsername && uUsername !== normTarget) {
        // multiple IDs: only match if name also matches this user
      } else if (u.color) {
        return u.color;
      }
    }
    if (normTarget && (uName === normTarget || uUsername === normTarget)) {
      if (u.color) return u.color;
    }
    return null;
  };

  // 1. Verificar state.users
  if (typeof state !== 'undefined' && Array.isArray(state?.users)) {
    for (const u of state.users) {
      const c = checkUser(u);
      if (c) return c;
    }
  }

  // 2. Verificar soporte y atencion en memoria global
  if (Array.isArray(window.netopsSupportUsers)) {
    for (const u of window.netopsSupportUsers) {
      const c = checkUser(u);
      if (c) return c;
    }
  }
  if (Array.isArray(window.netopsAttentionUsers)) {
    for (const u of window.netopsAttentionUsers) {
      const c = checkUser(u);
      if (c) return c;
    }
  }

  // 3. Verificar cache en localStorage
  try {
    const cachedSupport = JSON.parse(localStorage.getItem('netops_cached_support_users') || '[]');
    if (Array.isArray(cachedSupport)) {
      for (const u of cachedSupport) {
        const c = checkUser(u);
        if (c) return c;
      }
    }
    const cachedAttention = JSON.parse(localStorage.getItem('netops_cached_attention_users') || '[]');
    if (Array.isArray(cachedAttention)) {
      for (const u of cachedAttention) {
        const c = checkUser(u);
        if (c) return c;
      }
    }
  } catch (e) {}

  // 4. Verificar usuario logueado
  if (typeof getCurrentUser === 'function') {
    const cur = getCurrentUser();
    const c = checkUser(cur);
    if (c) return c;
  }

  const palette = [
    '#0284c7', '#7c3aed', '#059669', '#ea580c', '#0891b2',
    '#4f46e5', '#db2777', '#d97706', '#0d9488', '#2563eb'
  ];
  let hash = 0;
  const str = String(name || userId || 'Usuario');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function renderUserColorChip(name, userId = '') {
  if (!name || name === 'Sin registro' || name === 'Sin asignar' || name === 'Sin fecha') {
    return `<span style="color:#64748b;font-size:12px;">${escapeHtml(name || 'Sin asignar')}</span>`;
  }
  const color = getUserColor(name, userId);
  return `<span class="user-color-chip" style="background-color:${color};"><span class="chip-dot"></span>${escapeHtml(name)}</span>`;
}

const NETWORK_SUMMARY_INTERVAL_MS = 30 * 60 * 1000;

function publishNetworkSummary({eventKey = '', reminder = false, sound = true, desktop = true, force = false} = {}) {
  const user = getCurrentUser();
  const userKey = String(user?.id || user?.username || '');
  if (!userKey) return;
  const storageKey = 'netops_network_summary_v1:' + userKey;
  const deliver = () => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (e) {}
    const now = Date.now();
    const events = Object.fromEntries(Object.entries(saved.events || {}).filter(([,at]) => now - Number(at) < 86400000).slice(-199));
    if (eventKey && events[eventKey]) return;
    if (eventKey) events[eventKey] = now;
    const persist = () => { try { localStorage.setItem(storageKey,JSON.stringify({...saved,events})); } catch (e) {} };
    if (!saved.lastShownAt && reminder) {
      // La primera consulta inicializa el reloj sin emitir avisos al recargar.
      saved.lastShownAt = now;
      persist();
      return;
    }
    if ((saved.lastShownAt && now - saved.lastShownAt < NETWORK_SUMMARY_INTERVAL_MS) ||
        (!force && now - _netopsSessionStartedAt < 8000)) {
      persist();
      return;
    }
    saved.lastShownAt = now;
    persist();
    const title = 'Revisa los detalles de redes';
    const message = 'Tienes casos o mensajes pendientes. Abre Detalles de red para revisarlos.';
    const url = '/ordenes.html?detailKind=network';
    addNotificationToInbox({id:'network-summary-' + userKey,title,message,type:'network_summary',url});
    const useDesktop = desktop && typeof Notification !== 'undefined' && Notification.permission === 'granted' &&
      (document.hidden || !document.hasFocus() || !window.location.pathname.includes('ordenes'));
    if (useDesktop) {
      triggerDesktopNotification({title,message,url,eventId:'network-summary'});
    } else {
      if (sound) playSubtleNotificationTone();
      showRightScreenNotification({title,message,type:'network_summary',url});
    }
  };
  // Todas las pestañas comparten el mismo reloj y un solo turno de emisión.
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(storageKey,deliver).catch(() => {});
  }
  return deliver();
}

function notifyNetworkDetailEvent({
  title,
  message,
  type = 'info',
  orderId = '',
  networkOrderId = '',
  networkOrderFolio = '',
  originNetworkFolio = '',
  eventId = '',
  sound = true,
  desktop = true,
  force = false
}) {
  const now = Date.now();
  // Evitar duplicados del mismo tipo y orden en los últimos 60 segundos; si hay eventId único (mensajes de chat), deduplicar por mensaje
  const notifKey = eventId ? `${type}_${orderId}_${eventId}` : `${type}_${orderId || title}`;
  const lastTime = _netopsRecentlyNotified.get(notifKey) || 0;
  if (eventId ? lastTime > 0 : (!force && (now - lastTime < 60000))) {
    return;
  }

  // Verificar persistencia entre pestañas y recargas
  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  const userKey = String(user?.id || user?.username || '');
  const summaryStorageKey = 'netops_network_summary_v1:' + (userKey || 'global');
  let savedSummary = {};
  try { savedSummary = JSON.parse(localStorage.getItem(summaryStorageKey) || '{}') || {}; } catch (e) {}
  const savedEvents = savedSummary.events || {};
  if (eventId && (savedEvents[notifKey] || savedEvents[eventId])) {
    return;
  }
  _netopsRecentlyNotified.set(notifKey, now);
  if (eventId) {
    savedEvents[notifKey] = now;
    savedEvents[eventId] = now;
    try {
      localStorage.setItem(summaryStorageKey, JSON.stringify({ ...savedSummary, events: savedEvents }));
    } catch (e) {}
  }

  const netInfo = typeof getNotificationRelatedNetworkDetail === 'function'
    ? getNotificationRelatedNetworkDetail({ orderId, networkOrderId, networkOrderFolio, originNetworkFolio, type, title, message })
    : null;
  const resolvedNetFolio = networkOrderFolio || originNetworkFolio || (netInfo ? netInfo.folio : '');

  if (type === 'network_summary' || type === 'network_reminder') {
    if (type !== 'network_reminder') {
      addNotificationToInbox({
        title,
        message,
        type,
        orderId,
        networkOrderId: networkOrderId || orderId,
        networkOrderFolio: resolvedNetFolio,
        originNetworkFolio,
        eventId,
        url: orderId ? '/ordenes.html?detailKind=network&orderId=' + encodeURIComponent(orderId) : '/ordenes.html?detailKind=network'
      });
    }
    publishNetworkSummary({ eventKey: eventId ? notifKey : '', sound, desktop, force });
    return;
  }

  const isPhysicalKind = type === 'sent_to_physical' || type === 'physical';
  const url = orderId
    ? `/ordenes.html?detailKind=${isPhysicalKind ? 'physical' : 'network'}&orderId=${encodeURIComponent(orderId)}`
    : `/ordenes.html?detailKind=${isPhysicalKind ? 'physical' : 'network'}`;

  // 1. Guardar en el buzón persistente de la campana
  addNotificationToInbox({
    title,
    message,
    type,
    orderId,
    networkOrderId: networkOrderId || orderId,
    networkOrderFolio: resolvedNetFolio,
    originNetworkFolio,
    eventId,
    url,
    createdAt: new Date().toISOString()
  });

  const isSessionWarmingUp = (now - _netopsSessionStartedAt) < 6000;
  const isOnOrdersPage = (typeof window !== 'undefined' && window.location?.pathname?.includes('ordenes'));
  const useDesktop = desktop && typeof Notification !== 'undefined' && Notification.permission === 'granted' &&
    (document.hidden || !document.hasFocus() || !isOnOrdersPage);

  // 2. Alerta al instante (tarjeta en la página o tarjeta de escritorio en la pantalla)
  if (!isSessionWarmingUp || force) {
    if (sound) {
      playSubtleNotificationTone();
    }
    if (useDesktop) {
      if (typeof triggerDesktopNotification === 'function') {
        triggerDesktopNotification({
          title,
          message,
          url,
          orderId,
          networkOrderId: networkOrderId || orderId,
          networkOrderFolio: resolvedNetFolio,
          originNetworkFolio,
          eventId: notifKey
        });
      }
    } else {
      if (typeof showRightScreenNotification === 'function') {
        showRightScreenNotification({
          title,
          message,
          type,
          url,
          orderId,
          networkOrderId: networkOrderId || orderId,
          networkOrderFolio: resolvedNetFolio,
          originNetworkFolio,
          duration: 5000
        });
      }
    }
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
  return 'Recordatorio agrupado cada 30 min';
}

function checkPriorityUnresolvedReminders(orders = []) {
  if (!Array.isArray(orders) || !orders.length) return;
  const user = getCurrentUser();
  if (!user?.role) return;
  const userId = String(user.id || '').toLowerCase();
  const userName = normalizeName(user.name || user.username || '');
  const hasPending = orders.some(order => {
    if (order.detailKind !== 'network' || order.deletedAt || ['completada','no_realizado'].includes(order.status)) return false;
    if (typeof isUserInCase === 'function' && !isUserInCase(order,user)) return false;
    const messages = (Array.isArray(order.followUps) ? order.followUps : []).filter(item => item.action === 'chat_message');
    if (!messages.length) return !isOrderCreatorOrAssigner(order,user) || isOrderAssignedToUser(order,user);
    const last = messages[messages.length - 1];
    return !((last.byId && String(last.byId).toLowerCase() === userId) ||
      (last.byUserId && String(last.byUserId).toLowerCase() === userId) ||
      (last.byName && normalizeName(last.byName) === userName));
  });
  if (hasPending) publishNetworkSummary({reminder:true,sound:false});
}


function isOrderAssignedToUser(order, user) {
  if (!order || !user) return false;
  const rawIds = String(order.assignedUserId || order.assignedTo || '').trim().toLowerCase();
  const rawNames = String(order.assignedUserName || order.assignedToName || '').trim().toLowerCase();
  const uid = String(user.id || '').trim().toLowerCase();
  const uname = String(user.username || '').trim().toLowerCase();
  const name = String(user.name || '').trim().toLowerCase();

  const idList = rawIds.split(',').map(s => s.trim()).filter(Boolean);
  const nameList = rawNames.split(',').map(s => s.trim()).filter(Boolean);

  if (idList.some(id => id === uid || id === uname)) return true;
  if (nameList.some(n => n === name || n === uname)) return true;
  if (rawIds && (rawIds === uid || rawIds === uname)) return true;
  if (rawNames && (rawNames === name || rawNames === uname)) return true;
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

function isUserInCase(order, user) {
  if (!order || !user) return false;
  if (typeof userHasRole === 'function' && userHasRole('administrador', 'admin')) return true;

  const uid = String(user.id || '').trim().toLowerCase();
  const uname = String(user.username || '').trim().toLowerCase();
  const name = String(user.name || '').trim().toLowerCase();

  // 1. Creador del detalle
  if (isOrderCreatorOrAssigner(order, user)) return true;

  // 2. Asignado actualmente
  if (isOrderAssignedToUser(order, user)) return true;

  // 3. Quien está atendiendo / revisando
  const reviewId = String(order.reviewOpenedById || '').trim().toLowerCase();
  const reviewName = String(order.reviewOpenedByName || '').trim().toLowerCase();
  if (reviewId && (reviewId === uid || reviewId === uname)) return true;
  if (reviewName && (reviewName === name || reviewName === uname)) return true;

  // 4. Quien haya participado en el historial o chat de este caso
  const followUps = Array.isArray(order.followUps) ? order.followUps : [];
  const participated = followUps.some(f => {
    const fId = String(f.byId || f.byUserId || '').trim().toLowerCase();
    const fName = String(f.byName || '').trim().toLowerCase();
    return (fId && (fId === uid || fId === uname)) || (fName && (fName === name || fName === uname));
  });
  if (participated) return true;

  return false;
}

function getKnownUsersByArea() {
  let supportList = Array.isArray(window.netopsSupportUsers) ? window.netopsSupportUsers : [];
  let attentionList = Array.isArray(window.netopsAttentionUsers) ? window.netopsAttentionUsers : [];
  if (!supportList.length) {
    try {
      const cached = JSON.parse(localStorage.getItem('netops_cached_support_users') || '[]');
      if (Array.isArray(cached)) supportList = cached;
    } catch (e) {}
  }
  if (!attentionList.length) {
    try {
      const cached = JSON.parse(localStorage.getItem('netops_cached_attention_users') || '[]');
      if (Array.isArray(cached)) attentionList = cached;
    } catch (e) {}
  }
  const stateUsers = Array.isArray(state?.users) ? state.users : [];
  return { supportList, attentionList, stateUsers };
}

function resolveUserAreaRole(userId, userName, explicitRole = '') {
  const normRole = String(explicitRole || '').trim().toLowerCase();
  if (normRole === 'atencion_clientes' || normRole === 'atencion') return 'atencion_clientes';
  if (normRole === 'soporte') return 'soporte';

  const cleanText = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const idTokens = String(userId || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const nameTokens = String(userName || '').split(',').map(cleanText).filter(Boolean);
  if (!idTokens.length && !nameTokens.length) return '';

  const { supportList, attentionList, stateUsers } = getKnownUsersByArea();
  const matchesEntry = (u) => {
    if (!u) return false;
    const uId = String(u.id || '').trim().toLowerCase();
    const uName = cleanText(u.name || '');
    const uUser = cleanText(u.username || '');
    return (uId && idTokens.includes(uId)) ||
      (uName && (nameTokens.includes(uName) || nameTokens.some(t => t.includes(uName) || uName.includes(t)))) ||
      (uUser && (idTokens.includes(uUser) || nameTokens.includes(uUser) || nameTokens.some(t => t.includes(uUser) || uUser.includes(t))));
  };

  if (attentionList.some(matchesEntry)) return 'atencion_clientes';
  const matchedSupport = supportList.find(matchesEntry);
  if (matchedSupport) {
    const sRole = String(matchedSupport.role || '').trim().toLowerCase();
    if (!sRole || sRole === 'soporte') return 'soporte';
  }
  const matchedStateUser = stateUsers.find(matchesEntry);
  if (matchedStateUser) {
    const r = String(matchedStateUser.role || '').trim().toLowerCase();
    if (r === 'atencion_clientes' || r === 'atencion') return 'atencion_clientes';
    if (r === 'soporte') return 'soporte';
  }
  return '';
}

function getOrderAssignedAreaRole(order) {
  if (!order) return '';
  const byAssigned = resolveUserAreaRole(order.assignedUserId, order.assignedUserName, order.assignedUserRole);
  if (byAssigned) return byAssigned;
  const byReviewer = resolveUserAreaRole(order.reviewOpenedById, order.reviewOpenedByName, order.reviewOpenedByRole);
  if (byReviewer) return byReviewer;
  if (order.targetRole === 'atencion_clientes' || order.targetRole === 'atencion') return 'atencion_clientes';
  if (order.targetRole === 'soporte') return 'soporte';
  return '';
}

function isNetworkSupportToAttention(order) {
  if (!order) return false;
  if (typeof order.sentToAttention === 'boolean') return order.sentToAttention;
  const assignedArea = getOrderAssignedAreaRole(order);
  if (assignedArea === 'atencion_clientes') return true;
  if (assignedArea === 'soporte') return false;
  if (order.targetRole === 'atencion_clientes' || order.targetRole === 'atencion') return true;
  if (order.targetRole === 'soporte') return false;
  // Si tiene usuario asignado y existe catálogo de usuarios de soporte, pero NO está en soporte, pertenece a Atención
  const hasAssignee = Boolean(String(order.assignedUserId || '').trim() || String(order.assignedUserName || '').trim());
  if (hasAssignee) {
    const { supportList, attentionList } = getKnownUsersByArea();
    const cleanText = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const idTokens = String(order.assignedUserId || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const nameTokens = String(order.assignedUserName || '').split(',').map(cleanText).filter(Boolean);
    const matchesUser = (u) => {
      if (!u) return false;
      const uId = String(u.id || '').trim().toLowerCase();
      const uName = cleanText(u.name || '');
      const uUser = cleanText(u.username || '');
      return (uId && idTokens.includes(uId)) ||
        (uName && (nameTokens.includes(uName) || nameTokens.some(t => t.includes(uName) || uName.includes(t)))) ||
        (uUser && (idTokens.includes(uUser) || nameTokens.includes(uUser)));
    };
    const inSupport = supportList.some(u => {
      const r = String(u?.role || '').trim().toLowerCase();
      return (!r || r === 'soporte') && matchesUser(u);
    });
    const inAttention = attentionList.some(matchesUser);
    if (inAttention && !inSupport) return true;
    if (inSupport && !inAttention) return false;
    if (supportList.length > 0 && !inSupport) return true;
  }
  if (order.originRole === 'soporte') return true;
  if (order.originRole === 'atencion_clientes' || order.originRole === 'atencion') return false;
  const creatorRole = String(order.createdByRole || '').toLowerCase();
  if (creatorRole === 'soporte') return true;
  if (creatorRole === 'atencion_clientes' || creatorRole === 'atencion') return false;
  if (creatorRole === 'administrador' || creatorRole === 'admin') return true;
  return ['preguntar_luz', 'verificar_cliente', 'confirmar_servicio', 'reporte_zona', 'otro_soporte'].includes(order.category);
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
  const isSentToAttention = typeof isNetworkSupportToAttention === 'function' ? isNetworkSupportToAttention(order) : false;

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
  const rel = resetIdx >= 0 ? followUps.slice(resetIdx + 1) : followUps;
  const prop = rel.find(f => f.action === 'physical_proposed' || f.action === 'physical_proposed_soporte' || f.action === 'physical_proposed_atencion');
  if (!prop) return { pending: false };
  return {
    pending: true,
    proposedBy: (prop.action === 'physical_proposed_atencion' || String(prop.byRole || '').toLowerCase().includes('atencion')) ? 'atencion' : 'soporte',
    proposedByName: prop.byName || '',
    note: prop.note || ''
  };
}

function isOrderPendingForUser(order, user) {
  if (!order || order.deletedAt) return false;

  const st = String(order.status || 'pendiente').toLowerCase();
  // Los ya concluidos/completados nunca aparecen en "Mis detalles"
  if (st === 'completada' || st === 'concluido' || st === 'done') return false;

  const currentActor = user || (typeof getCurrentUser === 'function' ? getCurrentUser() : {});
  const actorId = String(currentActor.id || '').trim().toLowerCase();
  const actorUname = String(currentActor.username || '').trim().toLowerCase();
  const actorName = typeof normalizeName === 'function' ? normalizeName(currentActor.name || currentActor.username || '') : String(currentActor.name || '').toLowerCase();
  const role = typeof normalizeRole === 'function' ? normalizeRole(currentActor.role) : String(currentActor.role || '').trim().toLowerCase();
  const isAdmin = role === 'administrador' || role === 'admin';
  const isSoporte = role === 'soporte';
  const isAtencion = role === 'atencion_clientes' || role === 'atencion';

  // Si no es un detalle de red (ej. orden física)
  if (order.detailKind !== 'network') {
    return typeof isOrderAssignedToUser === 'function'
      ? isOrderAssignedToUser(order, currentActor)
      : false;
  }

  // DETALLES DE RED
  const isSentToAttention = typeof isNetworkSupportToAttention === 'function'
    ? isNetworkSupportToAttention(order)
    : false;

  const closureStatus = typeof getOrderClosureStatus === 'function'
    ? getOrderClosureStatus(order)
    : { supportConfirmed: false, attentionConfirmed: false, bothConfirmed: false };

  const physStatus = typeof getPhysicalDerivationStatus === 'function'
    ? getPhysicalDerivationStatus(order)
    : { pending: false };

  // Identificar si ya se envió a confirmar o concluir
  const isResolvedOrClosureProposed = st === 'resuelto_soporte' || st === 'por_confirmar' || st === 'resuelto' ||
    (isSentToAttention ? !!closureStatus.attentionConfirmed : !!closureStatus.supportConfirmed);
  const isUnresolvableProposed = st === 'no_realizado';
  const isPhysicalProposed = !!physStatus.pending;

  const hasAnyProposalSent = isResolvedOrClosureProposed || isUnresolvableProposed || isPhysicalProposed;

  const isAssigned = Boolean((typeof isOrderAssignedToUser === 'function' && isOrderAssignedToUser(order, currentActor)) ||
    (order.assignedUserId && String(order.assignedUserId).toLowerCase().includes(actorId)) ||
    (order.assignedUserName && (typeof normalizeName === 'function' ? normalizeName(order.assignedUserName).includes(actorName) : String(order.assignedUserName).toLowerCase().includes(actorName))));

  const isReviewing = Boolean((order.reviewOpenedById && String(order.reviewOpenedById).toLowerCase() === actorId) ||
    (order.reviewOpenedByName && (typeof normalizeName === 'function' ? normalizeName(order.reviewOpenedByName) === actorName : String(order.reviewOpenedByName).toLowerCase() === actorName)));

  const isCreator = Boolean((typeof isOrderCreatorOrAssigner === 'function' && isOrderCreatorOrAssigner(order, currentActor)) ||
    (order.createdById && (String(order.createdById).toLowerCase() === actorId || String(order.createdById).toLowerCase() === actorUname)) ||
    (order.createdByUsername && String(order.createdByUsername).toLowerCase() === actorUname) ||
    (order.createdByName && (typeof normalizeName === 'function' ? normalizeName(order.createdByName) === actorName : String(order.createdByName).toLowerCase() === actorName)));

  const rep = order.technicianReport || {};
  const repId = String(rep.completedById || rep.completedBy || '').toLowerCase();
  const repName = typeof normalizeName === 'function' ? normalizeName(rep.completedByName || order.completedByName || '') : '';
  const wasResolvedByMe = Boolean((actorId && repId && repId === actorId) || (actorName && repName && repName === actorName));

  const hasAssignee = Boolean(String(order.assignedUserId || '').trim() || String(order.assignedUserName || '').trim());

  // 1. CASOS "POR CONFIRMAR" (propuestas o resoluciones enviadas):
  // Aparecen en "Mis detalles" para quien debe validar, confirmar o devolver,
  // y también para el usuario asignado, que lo atendió o lo resolvió (para no perderlo de vista)
  if (hasAnyProposalSent) {
    if (isAssigned || isReviewing || wasResolvedByMe) {
      return true;
    }
    if (isResolvedOrClosureProposed || isUnresolvableProposed) {
      if (!isSentToAttention && isAtencion) return true; // Reporte de red: Atención valida con cliente y confirma o devuelve
      if (isSentToAttention && isSoporte) return true;   // Requerimiento: Soporte valida y confirma o devuelve
    } else if (isPhysicalProposed) {
      if (physStatus.proposedBy === 'soporte' && isAtencion) return true;
      if (physStatus.proposedBy !== 'soporte' && isSoporte) return true;
    }
    return false;
  }

  // 2. CASOS DEVUELTOS (st === 'devuelto_soporte'):
  // Se muestran a quien debe volver a atenderlo o a quien esté asignado
  if (st === 'devuelto_soporte') {
    if (isAssigned || isReviewing || wasResolvedByMe) return true;
    if (isSentToAttention && isAtencion) return true;
    if (!isSentToAttention && isSoporte) return true;
    return false;
  }

  // 3. CASOS PENDIENTES / EN ATENCIÓN DIRECTA (sin propuestas enviadas):
  if (isSentToAttention) {
    // Requerimiento dirigido a Atención
    if (isAtencion) {
      return Boolean(isAssigned || isReviewing || !hasAssignee);
    }
    return Boolean(isAssigned || isReviewing);
  } else {
    // Reporte de red dirigido a Soporte
    if (isSoporte) {
      return Boolean(isAssigned || isReviewing || !hasAssignee);
    }
    return Boolean(isAssigned || isReviewing);
  }

  return false;
}

window.isOrderPendingForUser = isOrderPendingForUser;
window.getOrderClosureStatus = getOrderClosureStatus;
window.getPhysicalDerivationStatus = getPhysicalDerivationStatus;
window.getNotificationVolume = getNotificationVolume;
window.setNotificationVolume = setNotificationVolume;
window.updateNotificationVolume = updateNotificationVolume;
window.testNotificationVolume = testNotificationVolume;

function canUserRetakeNetworkOrder(order, user = getCurrentUser()) {
  if (!order || order.detailKind !== 'network') return false;
  if (order.status === 'completada' || order.status === 'no_realizado') return false;
  const u = user || (typeof getCurrentUser === 'function' ? getCurrentUser() : null);
  const uRole = (typeof normalizeRole === 'function' ? normalizeRole(u?.role) : String(u?.role || '')).trim().toLowerCase();
  const isAdmin = uRole === 'administrador' || uRole === 'admin';
  if (isAdmin) return true;

  const isSoporte = uRole === 'soporte';
  const isAtencion = uRole === 'atencion_clientes' || uRole === 'atencion';
  if (!isSoporte && !isAtencion) return false;

  const assignedArea = getOrderAssignedAreaRole(order);
  const isSentToAttention = isNetworkSupportToAttention(order);
  const targetArea = assignedArea || (isSentToAttention ? 'atencion_clientes' : 'soporte');

  // Regla estricta: Solo admin o usuarios de la MISMA ÁREA a la que fue asignado el caso pueden retomarlo
  if (targetArea === 'atencion_clientes') {
    if (!isAtencion || isSoporte) return false;
  }
  if (targetArea === 'soporte') {
    if (!isSoporte || isAtencion) return false;
  }

  const isAssignedToMe = isOrderAssignedToUser(order, u);
  const hasAssignee = Boolean(String(order.assignedUserId || '').trim() || String(order.assignedUserName || '').trim());

  // Verificación adicional por catálogo de área cuando hay un asignado explícito
  if (hasAssignee) {
    const { supportList, attentionList } = getKnownUsersByArea();
    const cleanText = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const idTokens = String(order.assignedUserId || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const nameTokens = String(order.assignedUserName || '').split(',').map(cleanText).filter(Boolean);
    const matchesUser = (entry) => {
      if (!entry) return false;
      const eId = String(entry.id || '').trim().toLowerCase();
      const eName = cleanText(entry.name || '');
      const eUser = cleanText(entry.username || '');
      return (eId && idTokens.includes(eId)) ||
        (eName && (nameTokens.includes(eName) || nameTokens.some(t => t.includes(eName) || eName.includes(t)))) ||
        (eUser && (idTokens.includes(eUser) || nameTokens.includes(eUser)));
    };
    const inSupport = supportList.some(entry => {
      const r = String(entry?.role || '').trim().toLowerCase();
      return (!r || r === 'soporte') && matchesUser(entry);
    });
    const inAttention = attentionList.some(matchesUser);
    if (isSoporte && (inAttention || (supportList.length > 0 && !inSupport))) return false;
    if (isAtencion && (inSupport || (attentionList.length > 0 && !inAttention))) return false;
  }

  const isAssignedToOther = hasAssignee && !isAssignedToMe;
  const reviewerId = String(order.reviewOpenedById || '').trim().toLowerCase();
  const cleanText = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const reviewerName = cleanText(order.reviewOpenedByName || '');
  const myId = String(u?.id || '').trim().toLowerCase();
  const myName = cleanText(u?.name || u?.username || '');
  const isCheckingByOther = (reviewerId && reviewerId !== myId) || (!reviewerId && reviewerName && reviewerName !== myName);

  return isAssignedToOther || isCheckingByOther || !hasAssignee;
}

function isOrderWaitingCounterparty(order, user = (typeof getCurrentUser === 'function' ? getCurrentUser() : null)) {
  if (!order || order.deletedAt || order.detailKind !== 'network') return false;
  const st = String(order.status || 'pendiente').toLowerCase();
  if (st === 'completada' || st === 'concluido' || st === 'done') return false;

  const u = user || (typeof getCurrentUser === 'function' ? getCurrentUser() : null);
  const uRole = (typeof normalizeRole === 'function' ? normalizeRole(u?.role) : String(u?.role || '')).trim().toLowerCase();
  const isAdmin = uRole === 'administrador' || uRole === 'admin';
  const isSoporte = uRole === 'soporte';
  const isAtencion = uRole === 'atencion_clientes' || uRole === 'atencion';

  const isSentToAttention = typeof isNetworkSupportToAttention === 'function' ? isNetworkSupportToAttention(order) : false;
  const closureStatus = typeof getOrderClosureStatus === 'function' ? getOrderClosureStatus(order) : { supportConfirmed: false, attentionConfirmed: false };
  const physStatus = typeof getPhysicalDerivationStatus === 'function' ? getPhysicalDerivationStatus(order) : { pending: false };

  const isResolvedOrClosureProposed = st === 'resuelto_soporte' || st === 'por_confirmar' || st === 'resuelto' || (isSentToAttention ? !!closureStatus.attentionConfirmed : !!closureStatus.supportConfirmed);
  const isUnresolvableProposed = st === 'no_realizado';
  const isPhysicalProposed = !!physStatus.pending;

  if (!isResolvedOrClosureProposed && !isUnresolvableProposed && !isPhysicalProposed) {
    return false;
  }

  let sideThatSent = '';
  if (isResolvedOrClosureProposed || isUnresolvableProposed) {
    sideThatSent = isSentToAttention ? 'atencion' : 'soporte';
  } else if (isPhysicalProposed) {
    sideThatSent = physStatus.proposedBy === 'soporte' ? 'soporte' : 'atencion';
  }

  if (isAdmin) return true;
  if (isSoporte && sideThatSent === 'soporte') return true;
  if (isAtencion && sideThatSent === 'atencion') return true;

  const actorId = String(u?.id || '').trim().toLowerCase();
  if (actorId && ((order.updatedById && String(order.updatedById).toLowerCase() === actorId) ||
      (order.technicianReport && String(order.technicianReport.completedBy || '').toLowerCase() === actorId))) {
    return true;
  }

  return false;
}

window.canUserRetakeNetworkOrder = canUserRetakeNetworkOrder;
window.isOrderWaitingCounterparty = isOrderWaitingCounterparty;

function getLatestOrderChatMessage(order) {
  const followUps = Array.isArray(order?.followUps) ? order.followUps : [];
  for (let i = followUps.length - 1; i >= 0; i--) {
    const f = followUps[i];
    if (f && f.action === 'chat_message' && !f.isAutoActionMirror) {
      return f;
    }
  }
  return null;
}

/**
 * Emite un evento en tiempo real tras mutar una orden de red (creación, resolución, devolución o confirmación).
 */
function broadcastNetworkOrderChange(order, transition, extraMeta = {}) {
  try {
    if (!order) return;
    const user = getCurrentUser();
    const cache = getStoredNetworkStateCache();
    const latestChat = getLatestOrderChatMessage(order);
    cache[order.id] = {
      status: order.status || 'pendiente',
      updatedAt: order.updatedAt || new Date().toISOString(),
      title: order.title || order.description || '',
      clientName: order.clientName || '',
      town: order.town || order.nodeName || '',
      detailKind: order.detailKind || 'network',
      targetRole: order.targetRole || '',
      originRole: order.originRole || '',
      createdByRole: order.createdByRole || '',
      assignedUserId: order.assignedUserId || '',
      assignedUserName: order.assignedUserName || '',
      reviewOpenedById: order.reviewOpenedById || '',
      reviewOpenedByName: order.reviewOpenedByName || '',
      reviewOpenedAt: order.reviewOpenedAt || '',
      createdById: order.createdById || order.createdBy || '',
      createdByName: order.createdByName || '',
      createdByUsername: order.createdByUsername || '',
      lastChatMsgId: latestChat?.id || cache[order.id]?.lastChatMsgId || '',
      lastTransition: transition
    };
    setStoredNetworkStateCache(cache);

    const folio = (typeof getWorkOrderFolio === 'function')
      ? getWorkOrderFolio(order)
      : (order.folio || (String(order.id || '').startsWith('RED-') ? order.id : `RED-${order.id}`));

    const payload = {
      ...extraMeta,
      type: 'NETWORK_ORDER_EVENT',
      transition,
      orderId: order.id,
      order: {
        id: order.id,
        folio,
        status: order.status,
        updatedAt: order.updatedAt || new Date().toISOString(),
        detailKind: order.detailKind || 'network',
        clientName: order.clientName || '',
        town: order.town || order.nodeName || '',
        title: order.title || order.description || '',
        category: order.category || '',
        targetRole: order.targetRole || '',
        originRole: order.originRole || '',
        createdByRole: order.createdByRole || '',
        assignedUserId: order.assignedUserId || '',
        assignedUserName: order.assignedUserName || '',
        reviewOpenedById: order.reviewOpenedById || '',
        reviewOpenedByName: order.reviewOpenedByName || '',
        reviewOpenedAt: order.reviewOpenedAt || '',
        createdById: order.createdById || order.createdBy || '',
        createdByName: order.createdByName || '',
        createdByUsername: order.createdByUsername || '',
        solution: order.technicianReport?.solution || '',
        technicianReport: order.technicianReport || {},
        followUps: Array.isArray(order.followUps) ? order.followUps.slice(-50) : [],
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
  if (payload.timestamp && Math.abs(Date.now() - payload.timestamp) > 30000) return;

  const { transition, order } = payload;

  // Actualizar estado reactivo en memoria para que se refleje inmediatamente en la tabla y en el chat abierto sin recargar
  let syncedOrder = order;
  if (order && typeof state !== 'undefined' && Array.isArray(state.workOrders)) {
    const existing = state.workOrders.find(x => x.id === order.id);
    if (existing) {
      if (order.status) existing.status = order.status;
      if (order.detailKind) existing.detailKind = order.detailKind;
      if (order.assignedUserId !== undefined) existing.assignedUserId = order.assignedUserId;
      if (order.assignedUserName !== undefined) existing.assignedUserName = order.assignedUserName;
      if (order.reviewOpenedById !== undefined) existing.reviewOpenedById = order.reviewOpenedById;
      if (order.reviewOpenedByName !== undefined) existing.reviewOpenedByName = order.reviewOpenedByName;
      if (order.reviewOpenedAt !== undefined) existing.reviewOpenedAt = order.reviewOpenedAt;
      if (order.updatedAt !== undefined) existing.updatedAt = order.updatedAt;
      if (Array.isArray(order.followUps) && order.followUps.length) existing.followUps = order.followUps;
      if (order.technicianReport && typeof order.technicianReport === 'object') {
        existing.technicianReport = { ...(existing.technicianReport || {}), ...order.technicianReport };
      }
      syncedOrder = existing;
    }
  }

  // Si la modal del detalle está abierta para esta orden, refrescar el chat y botones en tiempo real
  if (order && typeof currentOrderReportId !== 'undefined' && currentOrderReportId === order.id) {
    if (typeof updateOrderChatLive === 'function') {
      updateOrderChatLive(syncedOrder);
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

  const isSoporte = userHasRole('administrador', 'admin', 'soporte');
  const isAtencion = userHasRole('atencion_clientes');

  const hasAssignment = !!(order.assignedUserId || order.assignedUserName);
  const isAssignedToMe = isOrderAssignedToUser(order, user);
  const isCreatedByMe = isOrderCreatorOrAssigner(order, user);
  const isOwnCreator = (order.createdById && order.createdById === user.id) || (order.createdByUsername && order.createdByUsername === user.username) || (payload.byUserId && payload.byUserId === user.id);
  const isSupportToAttention = isNetworkSupportToAttention(order);

  const uIdStr = String(user.id || '').toLowerCase();
  const uNameNorm = normalizeName(user.name || user.username || '');
  const isPrevAssignee = (payload.prevAssigneeId && String(payload.prevAssigneeId).toLowerCase() === uIdStr) ||
    (payload.prevAssigneeName && normalizeName(payload.prevAssigneeName) === uNameNorm);

  const reportData = order.technicianReport || {};
  const isResolverMe = (reportData.completedById && String(reportData.completedById).toLowerCase() === uIdStr) ||
    (reportData.completedBy && String(reportData.completedBy).toLowerCase() === uIdStr) ||
    (reportData.completedByName && normalizeName(reportData.completedByName) === uNameNorm) ||
    (order.completedByName && normalizeName(order.completedByName) === uNameNorm);

  const isReviewerMe = (order.reviewOpenedById && String(order.reviewOpenedById).toLowerCase() === uIdStr) ||
    (order.reviewOpenedByName && normalizeName(order.reviewOpenedByName) === uNameNorm);

  // Todo usuario involucrado en el reporte (quien capturó, asignado actual o previo, quien resolvió, quien atendió)
  const isUserInvolvedInReport = isCreatedByMe || isAssignedToMe || isPrevAssignee || isResolverMe || isReviewerMe;

  const actor = payload.byName || order.reviewOpenedByName || (isSupportToAttention ? 'Atención a clientes' : 'Soporte técnico');

  // Regla institucional: Notificaciones únicamente para quien reciba y envíe (involucrados en el detalle).
  // Administrador tiene acceso a todas en el buzón/centro pero NO recibe avisos activos emergentes a menos que esté involucrado.
  const isAdmin = userHasRole('administrador', 'admin');
  if (order.detailKind === 'network') {
    if (isAdmin && !isUserInvolvedInReport) {
      if (typeof addNotificationToInbox === 'function' && transition !== 'network_reminder') {
        const folio = order.folio || (order.id ? (String(order.id).startsWith('RED-') ? order.id : `RED-${order.id}`) : 'Detalle');
        addNotificationToInbox({
          title: `Actualización en ${folio}`,
          message: `${actor}: ${order.title || 'Actualización de orden'}`,
          type: transition,
          orderId: order.id,
          createdAt: new Date().toISOString()
        });
      }
      return;
    }
    if (!isAdmin && hasAssignment && !isUserInvolvedInReport) {
      return;
    }
  }

  if (transition === 'new_order') {
    if (order.detailKind === 'physical') {
      if (!isOwnCreator && (isSoporte || userHasRole('tecnico'))) {
        notifyNetworkDetailEvent({
        title: 'Nuevo detalle físico',
        message: `${order.town || 'General'} · Pendiente de atención técnica.`,
        type: 'new_order',
        orderId: order.id
        ,
        force: true
      });
      }
    } else if (isSupportToAttention) {
      if (!isOwnCreator && isAtencion) {
        const shouldNotify = hasAssignment ? isAssignedToMe : true;
        if (shouldNotify) {
          notifyNetworkDetailEvent({
        title: 'Nuevo requerimiento',
        message: `${actor} envió un requerimiento de red.`,
        type: 'new_order',
        orderId: order.id
          ,
        force: true
      });
        }
      }
    } else {
      if (!isOwnCreator && isSoporte) {
        const shouldNotify = hasAssignment ? isAssignedToMe : true;
        if (shouldNotify) {
          notifyNetworkDetailEvent({
        title: 'Nuevo reporte de red',
        message: `${actor} reportó una incidencia de red.`,
        type: 'new_order',
        orderId: order.id
          ,
        force: true
      });
        }
      }
    }
  } else if (transition === 'attending') {
    const hasCreator = !!(order.createdById || order.createdByName || order.createdByUsername);
    const shouldNotify = isUserInvolvedInReport || (isSupportToAttention ? (hasCreator ? isCreatedByMe : isSoporte) : (hasCreator ? isCreatedByMe : isAtencion));
    if (shouldNotify) {
      notifyNetworkDetailEvent({
        title: 'Atención iniciada',
        message: `${actor} inició la atención de este detalle.`,
        type: 'attending',
        orderId: order.id
      ,
        force: true
      });
    }
  } else if (transition === 'resolved') {
    if (isSupportToAttention) {
      const hasCreator = !!(order.createdById || order.createdByName || order.createdByUsername);
      const shouldNotify = isUserInvolvedInReport || (hasCreator ? isCreatedByMe : isSoporte);
      if (shouldNotify) {
        notifyNetworkDetailEvent({
        title: 'Requerimiento respondido',
        message: `${actor} resolvió este detalle.`,
        type: 'resolved',
        orderId: order.id
        ,
        force: true
      });
      }
    } else {
      const hasCreator = !!(order.createdById || order.createdByName || order.createdByUsername);
      const shouldNotify = isUserInvolvedInReport || (hasCreator ? isCreatedByMe : isAtencion);
      if (shouldNotify) {
        notifyNetworkDetailEvent({
        title: 'Reporte resuelto',
        message: `${actor} resolvió este detalle.`,
        type: 'resolved',
        orderId: order.id
        ,
        force: true
      });
      }
    }
  } else if (transition === 'returned') {
    if (isSupportToAttention) {
      const shouldNotify = isUserInvolvedInReport || (hasAssignment ? isAssignedToMe : isAtencion);
      if (shouldNotify) {
        notifyNetworkDetailEvent({
        title: 'Requerimiento devuelto',
        message: `${actor} devolvió este detalle para revisión.`,
        type: 'returned',
        orderId: order.id
        ,
        force: true
      });
      }
    } else {
      const shouldNotify = isUserInvolvedInReport || (hasAssignment ? isAssignedToMe : isSoporte);
      if (shouldNotify) {
        notifyNetworkDetailEvent({
        title: 'Reporte devuelto',
        message: `${actor} devolvió este detalle para revisión.`,
        type: 'returned',
        orderId: order.id
        ,
        force: true
      });
      }
    }
  } else if (transition === 'confirmed') {
    if (isSupportToAttention) {
      const shouldNotify = isUserInvolvedInReport || (hasAssignment ? isAssignedToMe : isAtencion);
      if (shouldNotify) {
        notifyNetworkDetailEvent({
        title: 'Requerimiento concluido',
        message: `${actor} concluyó este detalle.`,
        type: 'confirmed',
        orderId: order.id
        ,
        force: true
      });
      }
    } else {
      const shouldNotify = isUserInvolvedInReport || (hasAssignment ? isAssignedToMe : isSoporte);
      if (shouldNotify) {
        notifyNetworkDetailEvent({
        title: 'Reporte concluido',
        message: `${actor} concluyó este detalle.`,
        type: 'confirmed',
        orderId: order.id
        ,
        force: true
      });
      }
    }
  } else if (transition === 'review_deferred') {
    const shouldNotify = isUserInvolvedInReport || (isSupportToAttention ? isSoporte : isAtencion);
    if (shouldNotify) {
      notifyNetworkDetailEvent({
        title: 'Atención no realizada',
        message: `${actor} indicó que no atenderá este detalle por ahora${payload.reason ? `: ${payload.reason}` : '.'}`,
        type: 'returned',
        orderId: order.id,
        force: true
      });
    }
  } else if (transition === 'unresolvable') {
    const shouldNotify = isUserInvolvedInReport || (isSupportToAttention ? (hasAssignment ? isAssignedToMe : isSoporte) : (hasAssignment ? isAssignedToMe : isAtencion));
    if (shouldNotify) {
      notifyNetworkDetailEvent({
        title: 'Reporte no realizable',
        message: `${actor} notificó que no es posible resolver este reporte.`,
        type: 'unresolvable',
        orderId: order.id
      ,
        force: true
      });
    }
  } else if (transition === 'reopened') {
    if (order.detailKind === 'network') {
      if (isSupportToAttention) {
        if (!isOwnCreator && isAtencion) {
          const shouldNotify = hasAssignment ? isAssignedToMe : true;
          if (shouldNotify) {
            notifyNetworkDetailEvent({
        title: 'Requerimiento reabierto',
        message: `${actor} reabrió este detalle para atención.`,
        type: 'reopened',
        orderId: order.id
            ,
        force: true
      });
          }
        }
      } else {
        if (!isOwnCreator && isSoporte) {
          const shouldNotify = hasAssignment ? isAssignedToMe : true;
          if (shouldNotify) {
            notifyNetworkDetailEvent({
        title: 'Reporte reabierto',
        message: `${actor} reabrió este detalle para atención.`,
        type: 'reopened',
        orderId: order.id
            ,
        force: true
      });
          }
        }
      }
    } else {
      if ((isSoporte || userHasRole('tecnico')) && payload.byUserId !== user.id) {
        notifyNetworkDetailEvent({
        title: 'Detalle físico reabierto',
        message: `${actor} reabrió el detalle físico.`,
        type: 'reopened',
        orderId: order.id
        ,
        force: true
      });
      }
    }
  } else if (transition === 'updated' && payload.byUserId !== user.id) {
    notifyNetworkDetailEvent({
        title: 'Detalle actualizado',
        message: `${actor} actualizó este detalle.`,
        type: 'updated',
        orderId: order.id
    ,
        force: true
      });
  } else if (transition === 'physical_proposed' && payload.byUserId !== user.id) {
    const proposedBySoporte = payload.proposedBy === 'soporte';
    const shouldNotify = isUserInvolvedInReport || (proposedBySoporte ? isAtencion : isSoporte) || userHasRole('administrador', 'admin');
    if (shouldNotify) {
      notifyNetworkDetailEvent({
        title: 'Propuesta a detalles físicos',
        message: `${actor} propuso enviar este caso a detalles físicos. Requiere tu confirmación.`,
        type: 'physical_proposed',
        orderId: order.id,
        force: true
      });
    }
  } else if (transition === 'sent_to_physical' && payload.byUserId !== user.id) {
    if (isSoporte || isAtencion || userHasRole('tecnico')) {
      notifyNetworkDetailEvent({
        title: 'Derivado a detalle físico',
        message: `${actor} confirmó el pase de este detalle a trabajo en campo.`,
        type: 'sent_to_physical',
        orderId: order.id,
        force: true
      });
    }
  } else if (transition === 'resent' && payload.byUserId !== user.id) {
    if (isSoporte) {
      notifyNetworkDetailEvent({
        title: 'Reporte reenviado',
        message: `${actor} reenvió este reporte para atención.`,
        type: 'resent',
        orderId: order.id,
        force: true
      });
    }
  } else if (transition === 'deleted' && payload.byUserId !== user.id) {
    notifyNetworkDetailEvent({
      title: 'Detalle eliminado',
      message: `${actor} eliminó este detalle del sistema.`,
      type: 'deleted',
      orderId: order.id,
      force: true
    });
  } else if (transition === 'chat_message') {
    const isOwnSender = (payload.byUserId && payload.byUserId === user.id) || (payload.senderId && payload.senderId === user.id);
    if (!isOwnSender) {
      const folio = order.folio || (order.id ? (String(order.id).startsWith('RED-') ? order.id : `RED-${order.id}`) : 'Detalle');
      const sender = payload.senderName || payload.byName || 'Mensaje';
      const latestChat = getLatestOrderChatMessage(order);
      const rawText = payload.messageText || latestChat?.note || (payload.hasPhoto ? 'Imagen adjunta' : 'Nuevo mensaje');
      const textPreview = rawText.length > 65 ? rawText.slice(0, 62) + '...' : rawText;
      const isTargetTeamPool = !hasAssignment && (isSupportToAttention ? isAtencion : isSoporte);
      const shouldNotify = isUserInvolvedInReport || (typeof isUserInCase === 'function' && isUserInCase(syncedOrder || order, user)) || isTargetTeamPool || userHasRole('administrador', 'admin');
      const msgEventId = payload.messageId || latestChat?.id || ('msg_' + (payload.timestamp || Date.now()));
      if (shouldNotify) {
        notifyNetworkDetailEvent({
          title: `Mensaje en ${folio}`,
          message: `${sender}: ${textPreview}`,
          type: 'chat_message',
          orderId: order.id,
          eventId: msgEventId,
          force: true
        });
      }
    }
    if (typeof currentOrderReportId !== 'undefined' && currentOrderReportId === order.id) {
      if (typeof updateOrderChatLive === 'function') {
        updateOrderChatLive(syncedOrder || order);
      }
    }
  } else if (transition === 'retaken' && payload.byUserId !== user.id) {
    if (isPrevAssignee) {
      notifyNetworkDetailEvent({
        title: 'Reporte retomado',
        message: `${actor} retomó la atención del reporte que tenías asignado.`,
        type: 'retaken',
        orderId: order.id
      ,
        force: true
      });
    } else if (isUserInvolvedInReport || isSoporte) {
      notifyNetworkDetailEvent({
        title: 'Reporte retomado',
        message: `${actor} retomó la atención de este reporte.`,
        type: 'retaken',
        orderId: order.id
      ,
        force: true
      });
    }
  }
}

async function checkNetworkOrderNotifications() {
  if (getCurrentPageName() === 'login.html') return;
  const user = getCurrentUser();
  if (!user || !user.role) return;
  if (normalizeRole(user.role) === 'tecnico') return;

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
    if (Array.isArray(res?.attentionUsers) && res.attentionUsers.length) {
      window.netopsAttentionUsers = res.attentionUsers;
      try { localStorage.setItem('netops_cached_attention_users', JSON.stringify(res.attentionUsers)); } catch (e) {}
    }

    const orders = Array.isArray(res?.workOrders) ? res.workOrders : [];
    if (!orders.length) return;

    const cache = getStoredNetworkStateCache();
    const isFirstSessionPoll = !_netopsInitialPollDone;
    _netopsInitialPollDone = true;

    // Si es la carga o recarga inicial de la página en esta sesión, sincronizar el cache en silencio absoluto
    if (isFirstSessionPoll) {
      for (const order of orders) {
        if (!order || !order.id || order.detailKind !== 'network' || order.deletedAt) continue;
        const latestChat = getLatestOrderChatMessage(order);
        cache[order.id] = {
          status: order.status || 'pendiente',
          updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
          title: order.title || order.description || '',
          clientName: order.clientName || '',
          town: order.town || order.nodeName || '',
          targetRole: order.targetRole || '',
          originRole: order.originRole || '',
          createdByRole: order.createdByRole || '',
          assignedUserId: order.assignedUserId || '',
          assignedUserName: order.assignedUserName || '',
          reviewOpenedById: order.reviewOpenedById || '',
          reviewOpenedByName: order.reviewOpenedByName || '',
          reviewOpenedAt: order.reviewOpenedAt || '',
          createdById: order.createdById || '',
          createdByName: order.createdByName || '',
          createdByUsername: order.createdByUsername || '',
          lastChatMsgId: latestChat?.id || ''
        };
      }
      setStoredNetworkStateCache(cache);
      // Recordatorios periódicos deshabilitados: solo notificaciones en tiempo real al instante
      return;
    }

    const now = Date.now();
    let updated = false;
    for (const order of orders) {
      if (!order || !order.id || order.detailKind !== 'network' || order.deletedAt) continue;
      const prev = cache[order.id];
      const currentStatus = order.status || 'pendiente';
      const orderTitle = order.title || order.description || '';
      const client = order.clientName || 'Cliente';
      const place = order.town || order.nodeName || 'Red';
      const latestChat = getLatestOrderChatMessage(order);
      const latestChatId = latestChat?.id || '';

      const hasAssignment = !!(order.assignedUserId || order.assignedUserName);
      const isAssignedToMe = isOrderAssignedToUser(order, user);
      const isCreatedByMe = isOrderCreatorOrAssigner(order, user);
      const isOwnCreator = (order.createdById && order.createdById === user.id) || (order.createdByUsername && order.createdByUsername === user.username);
      const isSupportToAttention = isNetworkSupportToAttention(order);

      if (!prev) {
        // Nueva orden detectada
        cache[order.id] = {
          status: currentStatus,
          updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
          title: orderTitle,
          clientName: client,
          town: place,
          targetRole: order.targetRole || '',
          originRole: order.originRole || '',
          createdByRole: order.createdByRole || '',
          assignedUserId: order.assignedUserId || '',
          assignedUserName: order.assignedUserName || '',
          reviewOpenedById: order.reviewOpenedById || '',
          reviewOpenedByName: order.reviewOpenedByName || '',
          reviewOpenedAt: order.reviewOpenedAt || '',
          createdById: order.createdById || '',
          createdByName: order.createdByName || '',
          createdByUsername: order.createdByUsername || '',
          lastChatMsgId: latestChatId
        };
        updated = true;

        const orderTime = new Date(order.updatedAt || order.createdAt || now).getTime();
        const isHappeningNow = Math.abs(now - orderTime) <= 25000;
        if (isHappeningNow && currentStatus === 'pendiente') {
          const shouldNotifyNew = isSupportToAttention
            ? (hasAssignment ? isAssignedToMe : (userHasRole('atencion_clientes') && !isOwnCreator))
            : (hasAssignment ? isAssignedToMe : (userHasRole('administrador', 'admin', 'soporte') && !isOwnCreator));
          if (shouldNotifyNew) {
            notifyNetworkDetailEvent({
              title: isSupportToAttention ? 'Nuevo requerimiento' : 'Nuevo reporte de red',
              message: `${client ? client + ' · ' : ''}${place}`,
              type: 'new_order',
              orderId: order.id
            });
          }
        }
      } else if (prev.status !== currentStatus || (order.updatedAt && prev.updatedAt && order.updatedAt !== prev.updatedAt) || (latestChatId && latestChatId !== (prev.lastChatMsgId || ''))) {
        // Transición de estado, actualización o nuevo mensaje de chat detectado
        const oldStatus = prev.status;
        const hadNewChatMsg = !!(latestChat && latestChatId && latestChatId !== (prev.lastChatMsgId || ''));
        cache[order.id] = {
          ...prev,
          status: currentStatus,
          updatedAt: order.updatedAt || new Date().toISOString(),
          targetRole: order.targetRole || prev.targetRole || '',
          originRole: order.originRole || prev.originRole || '',
          createdByRole: order.createdByRole || prev.createdByRole || '',
          assignedUserId: order.assignedUserId || prev.assignedUserId || '',
          assignedUserName: order.assignedUserName || prev.assignedUserName || '',
          reviewOpenedById: order.reviewOpenedById || prev.reviewOpenedById || '',
          reviewOpenedByName: order.reviewOpenedByName || prev.reviewOpenedByName || '',
          reviewOpenedAt: order.reviewOpenedAt || prev.reviewOpenedAt || '',
          createdById: order.createdById || prev.createdById || '',
          createdByName: order.createdByName || prev.createdByName || '',
          createdByUsername: order.createdByUsername || prev.createdByUsername || '',
          lastChatMsgId: latestChatId || prev.lastChatMsgId || ''
        };
        updated = true;

        // Sincronizar orden en memoria y chat abierto en vivo
        if (typeof state !== 'undefined' && Array.isArray(state.workOrders)) {
          const inMem = state.workOrders.find(x => x.id === order.id);
          if (inMem) {
            Object.assign(inMem, order);
          }
        }
        if (typeof currentOrderReportId !== 'undefined' && currentOrderReportId === order.id && typeof updateOrderChatLive === 'function') {
          updateOrderChatLive(order);
        }

        // Notificar mensaje nuevo de chat recibido desde otra sesión/computadora
        if (hadNewChatMsg) {
          const msgSenderId = String(latestChat.byId || latestChat.byUserId || '').trim().toLowerCase();
          const msgSenderName = normalizeName(latestChat.byName || '');
          const myId = String(user.id || '').trim().toLowerCase();
          const myName = normalizeName(user.name || user.username || '');
          const isMyMsg = (msgSenderId && msgSenderId === myId) || (msgSenderName && msgSenderName === myName);
          const msgTime = new Date(latestChat.at || order.updatedAt || now).getTime();
          const isRecentChat = Math.abs(now - msgTime) <= 600000;
          const isTargetTeamPool = !hasAssignment && (isSupportToAttention ? userHasRole('atencion_clientes') : userHasRole('soporte'));
          const isAdminUser = userHasRole('administrador', 'admin');
          const shouldNotifyChat = !isMyMsg && isRecentChat && (
            isAssignedToMe ||
            isCreatedByMe ||
            (typeof isUserInCase === 'function' && isUserInCase(order, user)) ||
            (!isAdminUser && isTargetTeamPool)
          );
          if (shouldNotifyChat) {
            const folio = (typeof getWorkOrderFolio === 'function') ? getWorkOrderFolio(order) : (`RED-${order.id}`);
            const hasPhoto = Array.isArray(latestChat.photos) && latestChat.photos.length > 0;
            const rawText = latestChat.note || (hasPhoto ? 'Imagen adjunta' : 'Nuevo mensaje');
            const preview = rawText.length > 65 ? rawText.slice(0, 62) + '...' : rawText;
            notifyNetworkDetailEvent({
              title: `Mensaje en ${folio}`,
              message: `${latestChat.byName || 'Usuario'}: ${preview}`,
              type: 'chat_message',
              orderId: order.id,
              eventId: latestChatId,
              force: true
            });
          }
        }

        const isOwnUpdater = (order.updatedById && order.updatedById === user.id) || (order.updatedByUsername && order.updatedByUsername === user.username);
        const clientLabel = (client && client.trim().length > 1 && !['cliente', 'atención a clientes'].includes(client.trim().toLowerCase())) ? ` · ${client.trim()}` : '';

        const orderTime = new Date(order.updatedAt || order.createdAt || now).getTime();
        const isHappeningNow = Math.abs(now - orderTime) <= 25000;
        if (isHappeningNow && !isOwnUpdater && prev.assignedUserId === user.id && order.assignedUserId && order.assignedUserId !== user.id) {
          const actor = order.assignedUserName || order.reviewOpenedByName || 'Personal de soporte';
          notifyNetworkDetailEvent({
        title: 'Reporte retomado',
        message: `${actor} retomó la atención del reporte que tenías asignado.`,
        type: 'retaken',
        orderId: order.id
          
      });
        }

        if (isHappeningNow && !isOwnUpdater && prev.status !== currentStatus) {
          if (currentStatus === 'en_revision' && oldStatus !== 'en_revision') {
            const hasCreator = !!(order.createdById || order.createdByName || order.createdByUsername);
            const shouldNotifyAttending = isSupportToAttention
              ? (hasCreator ? isCreatedByMe : userHasRole('administrador', 'admin', 'soporte'))
              : (hasCreator ? isCreatedByMe : userHasRole('atencion_clientes'));
            if (shouldNotifyAttending) {
              const actor = order.reviewOpenedByName || (isSupportToAttention ? 'Atención a clientes' : 'Soporte técnico');
              notifyNetworkDetailEvent({
        title: 'Atención iniciada',
        message: `${actor} está atendiendo este detalle.`,
        type: 'attending',
        orderId: order.id
              
      });
            }
          } else if (currentStatus === 'resuelto_soporte') {
            const hasCreator = !!(order.createdById || order.createdByName || order.createdByUsername);
            const shouldNotifyResolved = isSupportToAttention
              ? userHasRole('administrador', 'admin', 'soporte')
              : (hasCreator ? isCreatedByMe : userHasRole('atencion_clientes'));
            if (shouldNotifyResolved) {
              notifyNetworkDetailEvent({
        title: isSupportToAttention ? 'Requerimiento respondido' : 'Reporte resuelto',
        message: 'Detalle resuelto.',
        type: 'resolved',
        orderId: order.id
              
      });
            }
          } else if (currentStatus === 'devuelto_soporte') {
            const shouldNotifyReturned = hasAssignment ? isAssignedToMe : userHasRole('administrador', 'admin', 'soporte');
            if (shouldNotifyReturned) {
              notifyNetworkDetailEvent({
        title: 'Reporte devuelto',
        message: 'Detalle devuelto para revisión.',
        type: 'returned',
        orderId: order.id
              
      });
            }
          } else if (currentStatus === 'no_realizado') {
            const shouldNotifyUnres = isSupportToAttention
              ? (hasAssignment ? isAssignedToMe : userHasRole('administrador', 'admin', 'soporte'))
              : (hasAssignment ? isAssignedToMe : userHasRole('atencion_clientes'));
            if (shouldNotifyUnres) {
              notifyNetworkDetailEvent({
                title: 'Reporte no realizable',
                message: isSupportToAttention
                  ? 'Atención notificó que no es posible realizar este requerimiento. Confirma para concluir.'
                  : 'Soporte notificó que no es posible resolver este reporte. Confirma para concluir.',
                type: 'unresolvable',
                orderId: order.id
              });
            }
          } else if (currentStatus === 'completada' && (oldStatus === 'resuelto_soporte' || oldStatus === 'en_revision' || oldStatus === 'pendiente' || oldStatus === 'no_realizado')) {
            const shouldNotifyConfirmed = isSupportToAttention
              ? (hasAssignment ? isAssignedToMe : userHasRole('atencion_clientes'))
              : (hasAssignment ? isAssignedToMe : userHasRole('administrador', 'admin', 'soporte'));
            if (shouldNotifyConfirmed) {
              notifyNetworkDetailEvent({
        title: isSupportToAttention ? 'Requerimiento concluido' : 'Reporte concluido',
        message: 'Detalle concluido.',
        type: 'confirmed',
        orderId: order.id
              
      });
            }
          } else if (currentStatus === 'pendiente' && (oldStatus === 'completada' || oldStatus === 'no_realizado')) {
            const shouldNotifyReopened = isSupportToAttention
              ? (hasAssignment ? isAssignedToMe : userHasRole('atencion_clientes'))
              : (hasAssignment ? isAssignedToMe : userHasRole('administrador', 'admin', 'soporte'));
            if (shouldNotifyReopened) {
              notifyNetworkDetailEvent({
        title: isSupportToAttention ? 'Requerimiento reabierto' : 'Reporte reabierto',
        message: 'Detalle reabierto para atención.',
        type: 'reopened',
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
      if (!isFirstSessionPoll) {
        if (typeof loadOrderPage === 'function') {
          loadOrderPage();
        } else if (typeof renderWOs === 'function') {
          renderWOs();
        }
      }
    }

    // Recordatorios periódicos deshabilitados: únicamente se emiten notificaciones instantáneas de eventos en vivo
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
  if (normalizeRole(user.role) === 'tecnico') return;

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

  initServiceWorker();
  requestNotificationPermissionOnce();

  // 3. Poller en segundo plano con Web Worker para que las notificaciones lleguen aun cuando no estén en la página o el navegador esté minimizado/en otra ventana
  let intervalMs = 4000;
  const runPoll = () => {
    checkNetworkOrderNotifications();
  };

  _netopsWatcherInterval = setInterval(runPoll, intervalMs);

  try {
    if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
      const workerBlob = new Blob([
        'setInterval(function(){ postMessage("tick"); }, 5000);'
      ], { type: 'application/javascript' });
      const bgWorker = new Worker(URL.createObjectURL(workerBlob));
      bgWorker.onmessage = () => {
        if (document.hidden || !document.hasFocus()) {
          runPoll();
        }
      };
    }
  } catch (e) {}

  document.addEventListener('visibilitychange', () => {
    clearInterval(_netopsWatcherInterval);
    if (!document.hidden) {
      runPoll();
      _netopsWatcherInterval = setInterval(runPoll, 4000);
    } else {
      _netopsWatcherInterval = setInterval(runPoll, 6000);
    }
  });

  window.addEventListener('focus', () => {
    runPoll();
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


/* ==========================================================================
   MATERIAL E INFRAESTRUCTURA DE TORRE (ANTENAS)
   Permite registrar en texto libre y con fotos el material existente en torres:
   tramos de torre, pilas y tipo, paneles y tipo, y notas libres.
   Accesible para técnicos tras completar un detalle y para soporte y admin.
   ========================================================================== */

let currentTowerMaterialAntennaId = '';
let pendingTowerMaterialCompletionDetail = null;
let pendingTowerMaterialPhotos = [];
let pendingTowerExtraPhotos = [];
let _lastActiveTowerSlot = '';
let pendingTowerSlots = {
  batteries: '',
  panels: '',
  controller: '',
  tower: '',
  cabinet: '',
  lightning: '',
  mikrotik: '',
  poe: ''
};

const TOWER_PHOTO_SLOTS = [
  {
    id: 'batteries',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="16" height="10" rx="2"/><line x1="20" y1="11" x2="20" y2="13"/></svg>',
    group: 'energy',
    groupTitle: '1. Energía y solar',
    groupSubtitle: 'Pilas · Paneles · Controlador',
    title: 'Pilas / Baterías',
    specificPrompt: 'Que se vea el <strong>tipo de pilas</strong> y capacidad',
    badgeText: 'Tipo visible',
    required: true
  },
  {
    id: 'panels',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
    group: 'energy',
    groupTitle: '1. Energía y solar',
    groupSubtitle: 'Pilas · Paneles · Controlador',
    title: 'Paneles Solares',
    specificPrompt: 'Que se vea el <strong>whataje (W)</strong> o etiqueta',
    badgeText: 'Wattaje visible',
    required: true
  },
  {
    id: 'controller',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><circle cx="15" cy="15" r="2"/></svg>',
    group: 'energy',
    groupTitle: '1. Energía y solar',
    groupSubtitle: 'Pilas · Paneles · Controlador',
    title: 'Controlador de Carga',
    specificPrompt: 'Vista frontal del <strong>controlador</strong> o pantalla',
    badgeText: 'Frontal / Display',
    required: true
  },
  {
    id: 'tower',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 4 22h16L12 2z"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="6" y1="17" x2="18" y2="17"/></svg>',
    group: 'structure',
    groupTitle: '2. Estructura y cajas',
    groupSubtitle: 'Torre · Cajas · Pararrayos',
    title: 'Torre Completa',
    specificPrompt: 'Panorámica de la <strong>torre completa</strong> desde la base',
    badgeText: 'Estructura completa',
    required: true
  },
  {
    id: 'cabinet',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
    group: 'structure',
    groupTitle: '2. Estructura y cajas',
    groupSubtitle: 'Torre · Cajas · Pararrayos',
    title: 'Cajas (Gabinete)',
    specificPrompt: 'Interior de las <strong>cajas o gabinete</strong> y sellos',
    badgeText: 'Acomodo de cajas',
    required: true
  },
  {
    id: 'lightning',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    group: 'structure',
    groupTitle: '2. Estructura y cajas',
    groupSubtitle: 'Torre · Cajas · Pararrayos',
    title: 'Pararrayos',
    specificPrompt: 'Punta o bajante a tierra (<strong>Opcional</strong>)',
    badgeText: 'Opcional',
    required: false
  },
  {
    id: 'mikrotik',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="8" width="20" height="8" rx="2"/><circle cx="6" cy="12" r="1"/><circle cx="10" cy="12" r="1"/><circle cx="14" cy="12" r="1"/></svg>',
    group: 'network',
    groupTitle: '3. Red y alimentación',
    groupSubtitle: 'MikroTik · PoE',
    title: 'MikroTik',
    specificPrompt: 'Equipo <strong>MikroTik</strong> con modelo y puertos',
    badgeText: 'Modelo visible',
    required: true
  },
  {
    id: 'poe',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v6M18 3v6M4 9h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9z"/></svg>',
    group: 'network',
    groupTitle: '3. Red y alimentación',
    groupSubtitle: 'MikroTik · PoE',
    title: 'PoE (Inyector / Switch)',
    specificPrompt: 'Inyector o switch <strong>PoE</strong> y alimentación',
    badgeText: 'PoE visible',
    required: true
  }
];

const DEFAULT_BALANCER_PORTS = 9;
let pendingBalancerPortCount = DEFAULT_BALANCER_PORTS;
let pendingBalancerPorts = [];

function isBalancerEquipment(eq) {
  if (!eq) return false;
  const name = String(eq.name || '').trim();
  if (/^B-/i.test(name)) return true;
  const type = String(eq.type || '').trim().toLowerCase();
  return type === 'balanceador' || type === 'balancer';
}

function getBalancerPortCount(eq) {
  const raw = Number(eq?.balancerPortCount);
  if (Number.isInteger(raw) && raw >= 1 && raw <= 48) return raw;
  return DEFAULT_BALANCER_PORTS;
}

function canConfigureBalancerPortCount() {
  return typeof userHasRole === 'function' && userHasRole('administrador', 'admin');
}

function normalizeBalancerPorts(eq, portCountOverride = null) {
  const count = Number.isInteger(Number(portCountOverride)) && Number(portCountOverride) >= 1 && Number(portCountOverride) <= 48
    ? Number(portCountOverride)
    : getBalancerPortCount(eq);
  const rawList = Array.isArray(eq?.balancerPorts) ? eq.balancerPorts : [];
  const byPort = new Map();
  rawList.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return;
    const portNum = Number(item.port) || (idx + 1);
    if (portNum >= 1 && portNum <= 48) {
      byPort.set(portNum, {
        port: portNum,
        label: String(item.label || '').trim(),
        frontPhoto: String(item.frontPhoto || '').trim(),
        backPhoto: String(item.backPhoto || '').trim()
      });
    }
  });
  const result = [];
  for (let p = 1; p <= count; p++) {
    const existing = byPort.get(p);
    result.push(existing ? { ...existing, port: p } : { port: p, label: '', frontPhoto: '', backPhoto: '' });
  }
  return result;
}

function getBalancerPortsStats(eq) {
  const count = getBalancerPortCount(eq);
  const ports = normalizeBalancerPorts(eq, count);
  let withAnyPhoto = 0;
  let withBothSides = 0;
  ports.forEach(p => {
    const hasFront = !!p.frontPhoto;
    const hasBack = !!p.backPhoto;
    if (hasFront || hasBack) withAnyPhoto++;
    if (hasFront && hasBack) withBothSides++;
  });
  return { count, withAnyPhoto, withBothSides };
}

function isDetailForAntennaTower(detail, stop = null) {
  if (!detail) return false;
  // Si pertenece a un pueblo o nodo, NO es de antena/torre,
  // no importa que esté relacionado a esa antena.
  if (detail.nodeId) return false;
  if (detail.visitType === 'comunidad') return false;
  if (detail.targetType === 'node' || detail.target === 'node') return false;

  // Si la parada donde se atiende es de pueblo o nodo
  if (stop && (stop.nodeId || stop.type === 'node')) return false;

  // Si está vinculado en el mapa a una parada que es de pueblo/nodo
  if (typeof getPlanMapStops === 'function') {
    const matchedStop = getPlanMapStops().find(s =>
      ((s.detailIds || []).includes(detail.id) || s.id === detail.stopId)
    );
    if (matchedStop && (matchedStop.nodeId || matchedStop.type === 'node')) {
      return false;
    }
  }

  // Para ser de antena/torre, debe tener equipo directo y no pertenecer a pueblo
  if (detail.equipmentId) return true;
  if (stop && stop.equipmentId && !stop.nodeId && (stop.type === 'equipment' || !stop.type)) return true;
  if (detail.equipmentName && !detail.nodeId && detail.visitType !== 'comunidad') return true;

  return false;
}

function findAntennaForDetail(detail, stop = null) {
  if (!detail) return null;
  // Solo aplica para detalles directos de antena/torre.
  // Si es de pueblo/nodo (aunque esté relacionado a esa antena), no pedirá material de torre.
  if (!isDetailForAntennaTower(detail, stop)) return null;

  if (detail.equipmentId) {
    const eq = (state.equipment || []).find(e => e.id === detail.equipmentId && !e.deletedAt);
    if (eq) return eq;
  }
  if (stop && stop.equipmentId && !stop.nodeId && (stop.type === 'equipment' || !stop.type)) {
    const eq = (state.equipment || []).find(e => e.id === stop.equipmentId && !e.deletedAt);
    if (eq) return eq;
  }
  if (typeof getPlanMapStops === 'function') {
    const matchedStop = getPlanMapStops().find(s =>
      ((s.detailIds || []).includes(detail.id) || s.id === detail.stopId) &&
      s.equipmentId && !s.nodeId && (s.type === 'equipment' || !s.type)
    );
    if (matchedStop && !matchedStop.nodeId) {
      const eq = (state.equipment || []).find(e => e.id === matchedStop.equipmentId && !e.deletedAt);
      if (eq) return eq;
    }
  }
  if (detail.equipmentName && !detail.nodeId && detail.visitType !== 'comunidad') {
    const targetName = String(detail.equipmentName).trim().toLowerCase();
    const eq = (state.equipment || []).find(e => !e.deletedAt && String(e.name || '').trim().toLowerCase() === targetName);
    if (eq) return eq;
  }
  return null;
}
window.isDetailForAntennaTower = isDetailForAntennaTower;
window.findAntennaForDetail = findAntennaForDetail;

var currentTowerMaterialIsMandatory = false;

function hasTowerMaterial(eq) {
  if (!eq) return false;
  const hasSections = Boolean(eq.towerSections && String(eq.towerSections).trim());
  const hasRadios = Boolean(eq.towerRadios && String(eq.towerRadios).trim());
  const hasBatteries = Boolean(eq.towerBatteries && String(eq.towerBatteries).trim());
  const hasPanels = Boolean(eq.towerPanels && String(eq.towerPanels).trim());
  const hasExtra = Boolean(eq.towerExtraNotes && String(eq.towerExtraNotes).trim());
  const hasNotes = Boolean(eq.towerMaterialNotes && String(eq.towerMaterialNotes).trim());
  const hasPhotos = Array.isArray(eq.towerMaterialPhotos) && eq.towerMaterialPhotos.length > 0;
  const hasSlots = Boolean(eq.towerMaterialSlots && Object.values(eq.towerMaterialSlots).some(Boolean));
  const hasBalancer = typeof isBalancerEquipment === 'function' && isBalancerEquipment(eq) && Array.isArray(eq.balancerPorts) && eq.balancerPorts.some(p => p.frontPhoto || p.backPhoto || p.label);
  return Boolean(hasSections || hasRadios || hasBatteries || hasPanels || hasExtra || hasNotes || hasPhotos || hasSlots || hasBalancer);
}

function wasTowerMaterialPromptedRecently(antennaId) {
  if (!antennaId) return false;
  let last = null;
  try {
    last = localStorage.getItem(`tower_mat_prompt_${antennaId}`) || sessionStorage.getItem(`tower_mat_prompt_${antennaId}`);
  } catch (e) {}
  if (!last) {
    const antenna = (state.equipment || []).find(e => e.id === antennaId && !e.deletedAt);
    last = antenna?.towerMaterialPromptedAt || null;
  }
  if (!last) return false;
  const lastTime = new Date(last).getTime();
  if (!Number.isFinite(lastTime)) return false;
  const oneDayMs = 24 * 60 * 60 * 1000;
  return (Date.now() - lastTime) < oneDayMs;
}

function markTowerMaterialPrompted(antennaId) {
  if (!antennaId) return;
  const nowIso = new Date().toISOString();
  try {
    localStorage.setItem(`tower_mat_prompt_${antennaId}`, nowIso);
    sessionStorage.setItem(`tower_mat_prompt_${antennaId}`, nowIso);
  } catch (e) {}
  const antenna = (state.equipment || []).find(e => e.id === antennaId && !e.deletedAt);
  if (antenna) {
    antenna.towerMaterialPromptedAt = nowIso;
  }
}

function isTowerMaterialMandatory() {
  if (!currentTowerMaterialIsMandatory) return false;
  const antenna = (state.equipment || []).find(e => e.id === currentTowerMaterialAntennaId && !e.deletedAt);
  return !hasTowerMaterial(antenna);
}

function continueTowerMaterialModal() {
  if (currentTowerMaterialAntennaId) {
    markTowerMaterialPrompted(currentTowerMaterialAntennaId);
  }
  currentTowerMaterialIsMandatory = false;
  CM('tower-material-mo');
  if (pendingTowerMaterialCompletionDetail) {
    const comp = pendingTowerMaterialCompletionDetail;
    pendingTowerMaterialCompletionDetail = null;
    if (typeof openTechnicianCompletionSummary === 'function') {
      openTechnicianCompletionSummary(comp);
    }
  }
}

function closeTowerMaterialModal() {
  if (isTowerMaterialMandatory()) {
    if (typeof notify === 'function') {
      notify('⚠️ Esta torre no tiene material registrado. Es obligatorio ingresar los datos o fotos antes de continuar.', 'warn');
    }
    return;
  }
  currentTowerMaterialIsMandatory = false;
  CM('tower-material-mo');
  if (pendingTowerMaterialCompletionDetail) {
    const comp = pendingTowerMaterialCompletionDetail;
    pendingTowerMaterialCompletionDetail = null;
    if (typeof openTechnicianCompletionSummary === 'function') {
      openTechnicianCompletionSummary(comp);
    }
  }
}

function getTowerMaterialShortSummary(eq) {
  if (!eq) return '';
  const parts = [];
  if (eq.towerSections) parts.push(String(eq.towerSections).trim());
  if (eq.towerRadios) parts.push(String(eq.towerRadios).trim());
  if (eq.towerBatteries) parts.push(String(eq.towerBatteries).trim());
  if (eq.towerPanels) parts.push(String(eq.towerPanels).trim());
  if (!parts.length && eq.towerExtraNotes) parts.push(String(eq.towerExtraNotes).trim().slice(0, 45));
  if (!parts.length && eq.towerMaterialNotes) parts.push(String(eq.towerMaterialNotes).trim().slice(0, 45));
  if (isBalancerEquipment(eq)) {
    const bStats = getBalancerPortsStats(eq);
    if (bStats.withAnyPhoto > 0) {
      parts.push(`MikroTik: ${bStats.withAnyPhoto}/${bStats.count} puertos con módem`);
    } else {
      parts.push(`MikroTik: ${bStats.count} puertos`);
    }
  }
  return parts.filter(Boolean).join(' · ') || 'Sin material registrado';
}

function ensureTowerMaterialModal() {
  let modal = document.getElementById('tower-material-mo');
  if (modal) return modal;

  const html = `
    <div class="mo" id="tower-material-mo" role="dialog" aria-modal="true" aria-labelledby="tower-mat-antenna-name">
      <div class="md tower-material-card">
        <div class="tower-mat-header">
          <div class="tower-mat-icon-wrap" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M4 22h16M7 17h10M8 12h8M9 7h6M6 22l6-19 6 19"/>
            </svg>
          </div>
          <div class="tower-mat-title-box">
            <span class="tower-mat-badge" id="tower-mat-badge-text">MATERIAL DE TORRE</span>
            <h2 id="tower-mat-antenna-name">Antena</h2>
            <p id="tower-mat-subtitle">Registro en texto libre del material instalado en esta torre.</p>
            <div id="tower-mat-last-updated" class="tower-mat-updated-info"></div>
          </div>
          <button type="button" class="tower-mat-close-btn" id="tower-mat-header-close-btn" onclick="closeTowerMaterialModal()" aria-label="Cerrar modal">✕</button>
        </div>

        <div class="tower-mat-body">
          <div class="tower-mat-completion-banner" id="tower-mat-completion-notice" style="display:none;">
            <span class="tower-mat-banner-icon" id="tower-mat-banner-icon">✓</span>
            <div>
              <strong id="tower-mat-completion-title">Detalle terminado</strong>
              <span id="tower-mat-completion-desc">A continuación, puedes actualizar o confirmar en texto libre el material que hay en esta torre:</span>
            </div>
          </div>

          <div class="tower-mat-field">
            <label for="tower-mat-sections">
              <span class="tower-mat-field-title">Tramos de torre</span>
              <span class="tower-mat-field-help">Tramos o altura (ej. 4 tramos de 3m)</span>
            </label>
            <input type="text" id="tower-mat-sections" placeholder="Ej. 4 tramos de 3m...">
          </div>

          <div class="tower-mat-field">
            <label for="tower-mat-radios">
              <span class="tower-mat-field-title">Radios instalados</span>
              <span class="tower-mat-field-help">Modelos en torre (ej. 2 Rocket Prism 5AC)</span>
            </label>
            <input type="text" id="tower-mat-radios" placeholder="Ej. 2 Rocket Prism, 1 LiteBeam...">
          </div>

          <div class="tower-mat-field">
            <label for="tower-mat-batteries">
              <span class="tower-mat-field-title">Pilas / Baterías</span>
              <span class="tower-mat-field-help">Cantidad y tipo de pilas (ej. 2 gel 100Ah)</span>
            </label>
            <input type="text" id="tower-mat-batteries" placeholder="Ej. 2 de gel 100Ah, 4 LTH 12V...">
          </div>

          <div class="tower-mat-field">
            <label for="tower-mat-panels">
              <span class="tower-mat-field-title">Paneles solares</span>
              <span class="tower-mat-field-help">Cantidad y whataje (ej. 2 paneles 450W)</span>
            </label>
            <input type="text" id="tower-mat-panels" placeholder="Ej. 2 paneles 450W...">
          </div>

          <div class="tower-mat-field">
            <label for="tower-mat-extra">
              <span class="tower-mat-field-title">Otros materiales u observaciones</span>
              <span class="tower-mat-field-help">Otros equipos, cableado o notas</span>
            </label>
            <textarea id="tower-mat-extra" rows="2" placeholder="Notas adicionales de la torre..."></textarea>
          </div>

          <div class="tower-mat-photos-section">
            <!-- Checklist Progress Card -->
            <div class="tower-photos-checklist-card">
              <div class="tower-photos-checklist-head">
                <div>
                  <span class="tower-photos-checklist-title">Fotos de la torre</span>
                  <span class="tower-photos-checklist-subtitle">Fotos del equipo en sitio para constancia técnica.</span>
                </div>
                <div class="tower-photos-checklist-actions">
                  <label class="btn-tower-bulk-upload" title="Selecciona varias fotos de tu galería y se asignarán a las casillas vacías">
                    Carga rápida (varias fotos)
                    <input type="file" accept="image/*" multiple onchange="handleTowerBulkPhotoUpload(this.files);this.value=''" hidden>
                  </label>
                </div>
              </div>

              <!-- Live Progress Bar -->
              <div class="tower-photos-progress-bar-wrap">
                <div class="tower-photos-progress-bar-track">
                  <div id="tower-photos-progress-fill" class="tower-photos-progress-bar-fill" style="width: 0%;"></div>
                </div>
                <div class="tower-photos-progress-stats">
                  <span id="tower-photos-progress-label">0 de 7 fotos requeridas (0%)</span>
                  <span class="tower-photos-optional-pill">Pararrayos: opcional</span>
                </div>
              </div>
            </div>

            <!-- Slots Groups Grid -->
            <div id="tower-photos-slots-container" class="tower-photos-slots-container"></div>

            <!-- Extra Photos Section (Optional) -->
            <div class="tower-photos-extras-section">
              <div class="tower-photos-extras-head">
                <div>
                  <span class="tower-photos-extras-title">Fotos adicionales <span id="tower-photos-extras-count">(0)</span></span>
                  <span class="tower-photos-extras-sub">Panorámicas, entorno o adicionales</span>
                </div>
                <div class="tower-mat-photo-buttons">
                  <label class="btn bc bsm">
                    Cámara
                    <input type="file" accept="image/*" capture="environment" onchange="handleTowerExtraPhotoUpload(this.files);this.value=''" hidden>
                  </label>
                  <label class="btn bgh bsm">
                    Galería
                    <input type="file" accept="image/*" multiple onchange="handleTowerExtraPhotoUpload(this.files);this.value=''" hidden>
                  </label>
                </div>
              </div>
              <div id="tower-mat-photo-gallery" class="tower-mat-gallery"></div>
            </div>
          </div>

          <div class="tower-mat-balancer-section" id="tower-mat-balancer-section" style="display:none;"></div>

          <div class="tower-mat-actions">
            <button type="button" class="btn bc bfu" id="tower-mat-save-btn" onclick="submitTowerMaterial()">Guardar material de torre</button>
            <button type="button" class="btn bg2" id="tower-mat-continue-btn" style="display:none;" onclick="continueTowerMaterialModal()">Continuar</button>
            <button type="button" class="btn bgh" id="tower-mat-cancel-btn" onclick="closeTowerMaterialModal()">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  modal = document.getElementById('tower-material-mo');
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      if (isTowerMaterialMandatory()) {
        if (typeof notify === 'function') notify('⚠️ Esta torre no tiene material registrado. Es obligatorio ingresar los datos o fotos antes de continuar.', 'warn');
        return;
      }
      closeTowerMaterialModal();
    }
  });
  return modal;
}

function openTowerMaterialModal(antennaId, options = {}) {
  ensureTowerMaterialModal();
  const antenna = (state.equipment || []).find(e => e.id === antennaId && !e.deletedAt);
  if (!antenna) {
    if (typeof notify === 'function') notify('No se encontró la antena solicitada.', 'err');
    return;
  }
  currentTowerMaterialAntennaId = antennaId;
  pendingTowerMaterialCompletionDetail = options.completionDetail || null;
  // Al abrir el modal por completado de detalle, marcar de inmediato que ya se solicitó para esta torre
  // evitando que si completa varios detalles seguidos de la misma torre vuelva a saltar
  if (options.fromCompletion && typeof markTowerMaterialPrompted === 'function') {
    markTowerMaterialPrompted(antennaId);
  }
  const isBalancer = isBalancerEquipment(antenna);
  const hasMat = hasTowerMaterial(antenna);
  const isMandatory = Boolean(options.mandatory && !hasMat);
  currentTowerMaterialIsMandatory = isMandatory;

  const badgeEl = document.getElementById('tower-mat-badge-text');
  if (badgeEl) {
    badgeEl.textContent = isBalancer
      ? 'BALANCEADOR · INVENTARIO Y PUERTOS'
      : 'MATERIAL DE TORRE';
  }

  const nameEl = document.getElementById('tower-mat-antenna-name');
  if (nameEl) nameEl.textContent = antenna.name || 'Antena';

  const subEl = document.getElementById('tower-mat-subtitle');
  if (subEl) {
    const zoneStr = typeof getZoneLabel === 'function' ? getZoneLabel(antenna.region) : (antenna.region || '');
    subEl.textContent = isBalancer
      ? `Balanceador ${antenna.name || ''}${zoneStr ? ` · Zona: ${zoneStr}` : ''}`
      : `Torre de ${antenna.name || 'antena'}${zoneStr ? ` · Zona: ${zoneStr}` : ''}`;
  }

  const notice = document.getElementById('tower-mat-completion-notice');
  const noticeTitle = document.getElementById('tower-mat-completion-title');
  const noticeDesc = document.getElementById('tower-mat-completion-desc');
  const noticeIcon = document.getElementById('tower-mat-banner-icon');
  if (notice) {
    if (options.fromCompletion) {
      notice.style.display = 'flex';
      if (isMandatory) {
        notice.classList.add('is-mandatory');
        if (noticeIcon) noticeIcon.textContent = '•';
        if (noticeTitle) noticeTitle.textContent = 'Registro obligatorio de material de torre';
        if (noticeDesc) noticeDesc.textContent = 'Esta torre no tiene material registrado. Ingresa los datos o fotos para continuar.';
      } else {
        notice.classList.remove('is-mandatory');
        if (noticeIcon) noticeIcon.textContent = '✓';
        if (noticeTitle) noticeTitle.textContent = options.detailTitle ? `Detalle terminado: "${options.detailTitle}"` : 'Detalle terminado';
        if (noticeDesc) noticeDesc.textContent = 'Verifica o actualiza el material instalado en esta torre.';
      }
    } else {
      notice.style.display = 'none';
      notice.classList.remove('is-mandatory');
    }
  }

  const continueBtn = document.getElementById('tower-mat-continue-btn');
  if (continueBtn) {
    if (options.fromCompletion && hasMat) {
      continueBtn.style.display = 'inline-flex';
      continueBtn.textContent = 'Continuar';
      continueBtn.title = 'Mantener el material actual y continuar al resumen';
    } else {
      continueBtn.style.display = 'none';
    }
  }

  const saveBtn = document.getElementById('tower-mat-save-btn');
  if (saveBtn) {
    saveBtn.textContent = hasMat ? 'Guardar cambios de torre' : 'Guardar material de torre';
  }

  const cancelBtn = document.getElementById('tower-mat-cancel-btn');
  if (cancelBtn) {
    cancelBtn.style.display = isMandatory ? 'none' : 'inline-flex';
    cancelBtn.textContent = 'Cerrar';
  }

  const closeBtn = document.getElementById('tower-mat-header-close-btn');
  if (closeBtn) {
    closeBtn.style.display = isMandatory ? 'none' : 'grid';
  }

  const updatedEl = document.getElementById('tower-mat-last-updated');
  if (updatedEl) {
    if (antenna.towerMaterialUpdatedAt) {
      const d = new Date(antenna.towerMaterialUpdatedAt);
      const dStr = !isNaN(d.getTime()) ? d.toLocaleString('es-MX', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : antenna.towerMaterialUpdatedAt;
      const by = antenna.towerMaterialUpdatedByName ? ` por ${antenna.towerMaterialUpdatedByName}` : '';
      updatedEl.innerHTML = `<span>Registro actual: <strong>${escapeHtml(dStr)}${escapeHtml(by)}</strong></span>`;
    } else {
      updatedEl.innerHTML = `<span>Torre sin registro previo de material.</span>`;
    }
  }

  const secInput = document.getElementById('tower-mat-sections');
  if (secInput) secInput.value = antenna.towerSections || '';

  const radInput = document.getElementById('tower-mat-radios');
  if (radInput) radInput.value = antenna.towerRadios || '';

  const batInput = document.getElementById('tower-mat-batteries');
  if (batInput) batInput.value = antenna.towerBatteries || '';

  const panInput = document.getElementById('tower-mat-panels');
  if (panInput) panInput.value = antenna.towerPanels || '';

  const extraInput = document.getElementById('tower-mat-extra');
  if (extraInput) {
    extraInput.value = antenna.towerExtraNotes || (
      (!antenna.towerSections && !antenna.towerBatteries && !antenna.towerPanels && antenna.towerMaterialNotes)
        ? antenna.towerMaterialNotes
        : ''
    );
  }

  pendingTowerSlots = {
    batteries: '',
    panels: '',
    controller: '',
    tower: '',
    cabinet: '',
    lightning: '',
    mikrotik: '',
    poe: ''
  };
  if (antenna.towerMaterialSlots && typeof antenna.towerMaterialSlots === 'object') {
    Object.keys(pendingTowerSlots).forEach(k => {
      pendingTowerSlots[k] = String(antenna.towerMaterialSlots[k] || '').trim();
    });
  }
  pendingTowerExtraPhotos = Array.isArray(antenna.towerMaterialExtraPhotos)
    ? antenna.towerMaterialExtraPhotos.slice()
    : (Array.isArray(antenna.towerMaterialPhotos) && !antenna.towerMaterialSlots
        ? antenna.towerMaterialPhotos.slice()
        : []);
  pendingTowerMaterialPhotos = Object.values(pendingTowerSlots).filter(Boolean).concat(pendingTowerExtraPhotos);
  renderTowerMaterialPhotoSlots();
  renderTowerExtraPhotos();

  pendingBalancerPortCount = getBalancerPortCount(antenna);
  pendingBalancerPorts = normalizeBalancerPorts(antenna, pendingBalancerPortCount);
  const balancerSec = document.getElementById('tower-mat-balancer-section');
  if (balancerSec) {
    balancerSec.style.display = isBalancer ? 'block' : 'none';
    if (isBalancer) renderBalancerPortsSection();
    else balancerSec.innerHTML = '';
  }

  OM('tower-material-mo');
}

function syncBalancerPortLabelsFromDom() {
  pendingBalancerPorts.forEach(item => {
    const input = document.getElementById(`balancer-port-label-${item.port}`);
    if (input) item.label = String(input.value || '').trim();
  });
}

function updateBalancerPortLabel(portNum, value) {
  const target = pendingBalancerPorts.find(p => Number(p.port) === Number(portNum));
  if (target) target.label = String(value || '').trim();
}

function changeBalancerPortCount(delta) {
  if (!canConfigureBalancerPortCount()) {
    if (typeof notify === 'function') notify('Solo el administrador puede cambiar el número de puertos del balanceador.', 'err');
    return;
  }
  syncBalancerPortLabelsFromDom();
  const nextCount = Math.max(1, Math.min(48, (Number(pendingBalancerPortCount) || DEFAULT_BALANCER_PORTS) + Number(delta)));
  if (nextCount === pendingBalancerPortCount) return;
  pendingBalancerPortCount = nextCount;
  pendingBalancerPorts = normalizeBalancerPorts({ balancerPorts: pendingBalancerPorts, balancerPortCount: pendingBalancerPortCount }, pendingBalancerPortCount);
  renderBalancerPortsSection();
}

function setBalancerPortCount(value) {
  if (!canConfigureBalancerPortCount()) {
    if (typeof notify === 'function') notify('Solo el administrador puede cambiar el número de puertos del balanceador.', 'err');
    return;
  }
  syncBalancerPortLabelsFromDom();
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return;
  const nextCount = Math.max(1, Math.min(48, parsed));
  pendingBalancerPortCount = nextCount;
  pendingBalancerPorts = normalizeBalancerPorts({ balancerPorts: pendingBalancerPorts, balancerPortCount: pendingBalancerPortCount }, pendingBalancerPortCount);
  renderBalancerPortsSection();
}

async function handleBalancerPortPhotoUpload(portNum, side, files) {
  const file = (files && files[0]) ? files[0] : null;
  if (!file) return;
  syncBalancerPortLabelsFromDom();
  if (typeof notify === 'function') notify(`Optimizando foto del Puerto ${portNum} (${side === 'front' ? 'Lado A · Frente' : 'Lado B · Reverso'})...`);
  try {
    let dataUrl = '';
    if (typeof optimizeImageForUpload === 'function') {
      dataUrl = await optimizeImageForUpload(file);
    } else if (typeof compressWOEvidenceImage === 'function') {
      dataUrl = await compressWOEvidenceImage(file);
    } else {
      dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = ev => res(ev.target.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
    }
    if (dataUrl) {
      let portObj = pendingBalancerPorts.find(p => Number(p.port) === Number(portNum));
      if (!portObj) {
        portObj = { port: Number(portNum), label: '', frontPhoto: '', backPhoto: '' };
        pendingBalancerPorts.push(portObj);
      }
      if (side === 'front') portObj.frontPhoto = dataUrl;
      else portObj.backPhoto = dataUrl;
      renderBalancerPortsSection();
    }
  } catch (err) {
    console.warn('Error al procesar foto de módem en puerto:', err);
    if (typeof notify === 'function') notify('No se pudo procesar la imagen del módem.', 'err');
  }
}

function removeBalancerPortPhoto(portNum, side) {
  syncBalancerPortLabelsFromDom();
  const portObj = pendingBalancerPorts.find(p => Number(p.port) === Number(portNum));
  if (!portObj) return;
  if (side === 'front') portObj.frontPhoto = '';
  else portObj.backPhoto = '';
  renderBalancerPortsSection();
}

function previewBalancerPortPhoto(portNum, side) {
  const portObj = pendingBalancerPorts.find(p => Number(p.port) === Number(portNum));
  if (!portObj) return;
  const photos = [];
  let startIndex = 0;
  if (portObj.frontPhoto) {
    if (side === 'front') startIndex = photos.length;
    photos.push(portObj.frontPhoto);
  }
  if (portObj.backPhoto) {
    if (side === 'back') startIndex = photos.length;
    photos.push(portObj.backPhoto);
  }
  if (photos.length && typeof openEvidenceGallery === 'function') {
    openEvidenceGallery(photos, startIndex);
  }
}

function renderBalancerPortsSection() {
  const container = document.getElementById('tower-mat-balancer-section');
  if (!container) return;
  const isAdmin = canConfigureBalancerPortCount();
  const ports = normalizeBalancerPorts({ balancerPorts: pendingBalancerPorts, balancerPortCount: pendingBalancerPortCount }, pendingBalancerPortCount);
  pendingBalancerPorts = ports;

  let withPhotos = 0;
  let completeCount = 0;
  ports.forEach(p => {
    if (p.frontPhoto || p.backPhoto) withPhotos++;
    if (p.frontPhoto && p.backPhoto) completeCount++;
  });

  const adminPortControls = isAdmin ? `
    <div class="balancer-port-admin-controls" title="Solo los administradores pueden definir cuántos puertos tiene este balanceador">
      <span class="balancer-admin-label">⚙️ Puertos (Admin):</span>
      <button type="button" class="balancer-port-step-btn" onclick="changeBalancerPortCount(-1)" ${pendingBalancerPortCount <= 1 ? 'disabled' : ''} aria-label="Quitar puerto">−</button>
      <input type="number" id="tower-mat-balancer-port-count" class="balancer-port-count-input" min="1" max="48" value="${pendingBalancerPortCount}" onchange="setBalancerPortCount(this.value)">
      <button type="button" class="balancer-port-step-btn" onclick="changeBalancerPortCount(1)" ${pendingBalancerPortCount >= 48 ? 'disabled' : ''} aria-label="Agregar puerto">+</button>
    </div>
  ` : `
    <div class="balancer-port-readonly-pill" title="Solo el administrador puede aumentar o reducir la cantidad de puertos">
      🔒 ${pendingBalancerPortCount} puertos habilitados (configurable por Admin)
    </div>
  `;

  const portsHtml = ports.map(p => {
    const hasFront = !!p.frontPhoto;
    const hasBack = !!p.backPhoto;
    const statusClass = (hasFront && hasBack) ? 'is-complete' : ((hasFront || hasBack) ? 'is-partial' : 'is-empty');
    const statusText = (hasFront && hasBack)
      ? '✓ Ambos lados (2/2)'
      : ((hasFront || hasBack) ? '1/2 lados' : 'Opcional · Sin fotos');

    const renderSlot = (side, sideTitle, sideHint, photoUrl) => {
      if (photoUrl) {
        return `
          <div class="balancer-modem-slot has-photo">
            <div class="balancer-slot-top">
              <span class="balancer-slot-title">${sideTitle}</span>
              <button type="button" class="balancer-slot-remove" onclick="removeBalancerPortPhoto(${p.port}, '${side}')" title="Quitar imagen">✕</button>
            </div>
            <div class="balancer-slot-preview" onclick="previewBalancerPortPhoto(${p.port}, '${side}')" title="Clic para ampliar imagen">
              <img src="${escapeHtml(photoUrl)}" alt="Puerto ${p.port} - ${sideTitle}">
            </div>
            <div class="balancer-slot-replace-bar">
              <label class="balancer-mini-upload">
                📷 Cambiar
                <input type="file" accept="image/*" capture="environment" onchange="handleBalancerPortPhotoUpload(${p.port}, '${side}', this.files);this.value=''" hidden>
              </label>
              <label class="balancer-mini-upload">
                🖼️ Galería
                <input type="file" accept="image/*" onchange="handleBalancerPortPhotoUpload(${p.port}, '${side}', this.files);this.value=''" hidden>
              </label>
            </div>
          </div>
        `;
      }
      return `
        <div class="balancer-modem-slot is-empty">
          <div class="balancer-slot-top">
            <span class="balancer-slot-title">${sideTitle}</span>
            <span class="balancer-slot-optional">Opcional</span>
          </div>
          <div class="balancer-slot-drop">
            <span class="balancer-slot-hint">${sideHint}</span>
            <div class="balancer-slot-actions">
              <label class="balancer-upload-btn primary">
                📷 Cámara
                <input type="file" accept="image/*" capture="environment" onchange="handleBalancerPortPhotoUpload(${p.port}, '${side}', this.files);this.value=''" hidden>
              </label>
              <label class="balancer-upload-btn secondary">
                🖼️ Galería
                <input type="file" accept="image/*" onchange="handleBalancerPortPhotoUpload(${p.port}, '${side}', this.files);this.value=''" hidden>
              </label>
            </div>
          </div>
        </div>
      `;
    };

    return `
      <div class="balancer-port-card ${statusClass}" data-port="${p.port}">
        <div class="balancer-port-card-head">
          <div class="balancer-port-title-group">
            <span class="balancer-port-badge">Puerto ${p.port} <small>(ether${p.port})</small></span>
            <span class="balancer-port-status ${statusClass}">${statusText}</span>
          </div>
          <input
            type="text"
            id="balancer-port-label-${p.port}"
            class="balancer-port-note-input"
            placeholder="Nota opcional (ej. Telmex #1, Starlink, línea o serie)..."
            value="${escapeHtml(p.label || '')}"
            oninput="updateBalancerPortLabel(${p.port}, this.value)"
          >
        </div>
        <div class="balancer-port-sides-grid">
          ${renderSlot('front', 'Lado A · Frente del módem', 'Frente / LEDs del módem', p.frontPhoto)}
          ${renderSlot('back', 'Lado B · Reverso / Etiqueta', 'Etiqueta / Serie / Puertos', p.backPhoto)}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="balancer-section-header">
      <div class="balancer-section-title-wrap">
        <div class="balancer-section-kicker">⚖️ APARTADO EXCLUSIVO DE BALANCEADOR (B-)</div>
        <h4>Puertos MikroTik · Imágenes de Módems por Ambos Lados</h4>
        <p>Registra las fotos de cada módem (Lado A: Frente y Lado B: Reverso/Etiqueta) para cada puerto del MikroTik. <strong>Ningún puerto es obligatorio</strong>; puedes dejar vacíos los puertos sin módem.</p>
      </div>
      <div class="balancer-section-meta">
        <div class="balancer-ports-counter-pill">
          <span>Módems registrados: <strong>${withPhotos} / ${pendingBalancerPortCount}</strong></span>
          <small>(${completeCount} con ambos lados)</small>
        </div>
        ${adminPortControls}
      </div>
    </div>
    <div class="balancer-ports-grid">
      ${portsHtml}
    </div>
  `;
}

async function compressOrOptimizeTowerImage(file) {
  if (!file) return '';
  if (typeof optimizeImageForUpload === 'function') {
    return optimizeImageForUpload(file);
  }
  if (typeof compressWOEvidenceImage === 'function') {
    return compressWOEvidenceImage(file);
  }
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = ev => resolve(ev.target.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function handleSlotPhotoUpload(slotId, files) {
  const file = files && files[0];
  if (!file) return;
  _lastActiveTowerSlot = slotId;
  const slotDef = TOWER_PHOTO_SLOTS.find(s => s.id === slotId);
  const slotName = slotDef ? slotDef.title : slotId;
  if (typeof notify === 'function') notify('Optimizando foto de ' + slotName + '...');
  try {
    const dataUrl = await compressOrOptimizeTowerImage(file);
    if (dataUrl) {
      pendingTowerSlots[slotId] = dataUrl;
      renderTowerMaterialPhotoSlots();
      if (typeof notify === 'function') notify(`✓ Foto de ${slotName} guardada en casilla.`, 'ok');
    }
  } catch (err) {
    console.warn('Error al procesar foto para ' + slotId, err);
    if (typeof notify === 'function') notify('No se pudo procesar la imagen.', 'err');
  }
}

function removeSlotPhoto(slotId) {
  pendingTowerSlots[slotId] = '';
  renderTowerMaterialPhotoSlots();
}

function previewSlotPhoto(slotId) {
  const photo = pendingTowerSlots[slotId];
  if (!photo) return;
  const allPhotos = Object.values(pendingTowerSlots).filter(Boolean).concat(pendingTowerExtraPhotos);
  const targetIndex = allPhotos.indexOf(photo);
  if (typeof openEvidenceGallery === 'function') {
    openEvidenceGallery(allPhotos, targetIndex >= 0 ? targetIndex : 0);
  }
}

function handleSlotDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.add('is-dragover');
}

async function handleSlotDrop(event, slotId) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('is-dragover');
  const files = event.dataTransfer?.files;
  if (files && files.length) {
    await handleSlotPhotoUpload(slotId, files);
  }
}

async function handleTowerBulkPhotoUpload(files) {
  const list = Array.from(files || []);
  if (!list.length) return;
  if (typeof notify === 'function') notify(`⚡ Procesando ${list.length} foto(s)...`, 'ok');

  const slotOrder = ['batteries', 'panels', 'controller', 'tower', 'cabinet', 'mikrotik', 'poe', 'lightning'];
  const emptySlots = slotOrder.filter(s => !pendingTowerSlots[s]);
  let assignedCount = 0;

  for (let i = 0; i < list.length; i++) {
    const file = list[i];
    try {
      const dataUrl = await compressOrOptimizeTowerImage(file);
      if (!dataUrl) continue;
      if (emptySlots.length > 0) {
        const nextSlot = emptySlots.shift();
        pendingTowerSlots[nextSlot] = dataUrl;
        assignedCount++;
      } else {
        pendingTowerExtraPhotos.push(dataUrl);
      }
    } catch (e) {
      console.warn('Error en carga múltiple:', e);
    }
  }

  renderTowerMaterialPhotoSlots();
  renderTowerExtraPhotos();
  if (typeof notify === 'function') {
    if (assignedCount > 0) {
      notify(`⚡ ¡${assignedCount} foto(s) asignadas automáticamente a las casillas! Puedes revisarlas o cambiarlas si lo deseas.`, 'ok');
    } else {
      notify(`Fotos agregadas a la galería adicional.`, 'ok');
    }
  }
}

async function handleTowerExtraPhotoUpload(files) {
  const list = Array.from(files || []);
  if (!list.length) return;
  if (typeof notify === 'function') notify('Optimizando foto(s) extra...');
  for (const file of list) {
    try {
      const dataUrl = await compressOrOptimizeTowerImage(file);
      if (dataUrl) pendingTowerExtraPhotos.push(dataUrl);
    } catch (err) {
      console.warn('Error al procesar foto extra:', err);
      if (typeof notify === 'function') notify('No se pudo procesar una imagen extra.', 'err');
    }
  }
  renderTowerExtraPhotos();
}

function removeTowerExtraPhoto(index) {
  pendingTowerExtraPhotos.splice(index, 1);
  renderTowerExtraPhotos();
}

function previewTowerExtraPhoto(index) {
  const allPhotos = Object.values(pendingTowerSlots).filter(Boolean).concat(pendingTowerExtraPhotos);
  const targetIndex = Object.values(pendingTowerSlots).filter(Boolean).length + index;
  if (typeof openEvidenceGallery === 'function') {
    openEvidenceGallery(allPhotos, targetIndex);
  }
}

function renderTowerMaterialPhotoSlots() {
  const container = document.getElementById('tower-photos-slots-container');
  if (!container) return;

  // Calculate progress
  const requiredSlots = TOWER_PHOTO_SLOTS.filter(s => s.required);
  const capturedRequired = requiredSlots.filter(s => Boolean(pendingTowerSlots[s.id])).length;
  const totalRequired = requiredSlots.length; // 7
  const pct = Math.round((capturedRequired / totalRequired) * 100);

  const fillBar = document.getElementById('tower-photos-progress-fill');
  if (fillBar) fillBar.style.width = `${pct}%`;

  const labelEl = document.getElementById('tower-photos-progress-label');
  if (labelEl) {
    if (capturedRequired === totalRequired) {
      labelEl.innerHTML = `<strong>✓ ${capturedRequired} de ${totalRequired} fotos requeridas (100%)</strong> · Todas listas`;
      labelEl.style.color = '#059669';
    } else {
      labelEl.innerHTML = `<strong>${capturedRequired} de ${totalRequired} requeridas</strong> (${pct}%) · Faltan ${totalRequired - capturedRequired}`;
      labelEl.style.color = '#334155';
    }
  }

  // Groups
  const groups = [
    {
      id: 'energy',
      title: '1. Energía y solar',
      icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
      badge: 'Pilas · Paneles · Controlador',
      slots: TOWER_PHOTO_SLOTS.filter(s => s.group === 'energy')
    },
    {
      id: 'structure',
      title: '2. Estructura y cajas',
      icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 4 22h16L12 2z"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="6" y1="17" x2="18" y2="17"/></svg>',
      badge: 'Torre · Cajas · Pararrayos',
      slots: TOWER_PHOTO_SLOTS.filter(s => s.group === 'structure')
    },
    {
      id: 'network',
      title: '3. Red y PoE',
      icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="8" width="20" height="8" rx="2"/><circle cx="6" cy="12" r="1"/><circle cx="10" cy="12" r="1"/></svg>',
      badge: 'MikroTik · PoE',
      slots: TOWER_PHOTO_SLOTS.filter(s => s.group === 'network')
    }
  ];

  container.innerHTML = groups.map(g => `
    <div class="tower-photo-group">
      <div class="tower-photo-group-header">
        <span class="tower-photo-group-icon">${g.icon}</span>
        <h4>${g.title}</h4>
        <span class="tower-photo-group-badge">${g.badge}</span>
      </div>
      <div class="tower-photo-group-grid">
        ${g.slots.map(s => {
          const photoUrl = pendingTowerSlots[s.id];
          const hasPhoto = Boolean(photoUrl);
          const reqClass = s.required ? 'is-required' : 'is-optional';
          const reqText = s.required ? 'Requerida' : 'Opcional';

          if (hasPhoto) {
            return `
              <div class="tower-slot-card is-captured" data-slot="${s.id}">
                <div class="tower-slot-head">
                  <div class="tower-slot-title-wrap">
                    <span class="tower-slot-icon">${s.icon}</span>
                    <strong class="tower-slot-title" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</strong>
                  </div>
                  <span class="tower-slot-req-badge is-done">✓ Lista</span>
                </div>
                <div class="tower-slot-preview" onclick="previewSlotPhoto('${s.id}')" title="Clic para ampliar">
                  <img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(s.title)}">
                  <div class="tower-slot-preview-overlay">
                    <span>Ampliar</span>
                  </div>
                </div>
                <div class="tower-slot-prompt-done">
                  <span>✓ ${escapeHtml(s.badgeText)}</span>
                </div>
                <div class="tower-slot-actions is-replace">
                  <label class="btn-slot-mini" title="Cambiar con cámara">
                    Cámara
                    <input type="file" accept="image/*" capture="environment" onchange="handleSlotPhotoUpload('${s.id}', this.files);this.value=''" hidden>
                  </label>
                  <label class="btn-slot-mini" title="Cambiar desde galería">
                    Galería
                    <input type="file" accept="image/*" onchange="handleSlotPhotoUpload('${s.id}', this.files);this.value=''" hidden>
                  </label>
                  <button type="button" class="btn-slot-remove" onclick="removeSlotPhoto('${s.id}')" title="Quitar imagen">✕</button>
                </div>
              </div>
            `;
          }

          return `
            <div class="tower-slot-card is-empty" data-slot="${s.id}" ondragover="handleSlotDragOver(event)" ondrop="handleSlotDrop(event, '${s.id}')">
              <div class="tower-slot-head">
                <div class="tower-slot-title-wrap">
                  <span class="tower-slot-icon">${s.icon}</span>
                  <strong class="tower-slot-title">${escapeHtml(s.title)}</strong>
                </div>
                <span class="tower-slot-req-badge ${reqClass}">${reqText}</span>
              </div>
              <div class="tower-slot-prompt">
                <span class="prompt-icon"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
                <span>${s.specificPrompt}</span>
              </div>
              <div class="tower-slot-actions">
                <label class="btn-slot-action primary" title="Tomar foto con la cámara del celular">
                  Cámara
                  <input type="file" accept="image/*" capture="environment" onchange="handleSlotPhotoUpload('${s.id}', this.files);this.value=''" hidden>
                </label>
                <label class="btn-slot-action secondary" title="Elegir foto de la galería">
                  Galería
                  <input type="file" accept="image/*" onchange="handleSlotPhotoUpload('${s.id}', this.files);this.value=''" hidden>
                </label>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function renderTowerExtraPhotos() {
  const gallery = document.getElementById('tower-mat-photo-gallery');
  const countEl = document.getElementById('tower-photos-extras-count');
  if (countEl) countEl.textContent = `(${pendingTowerExtraPhotos.length})`;
  if (!gallery) return;

  if (!pendingTowerExtraPhotos.length) {
    gallery.innerHTML = '<div class="tower-mat-no-photos">Sin fotos adicionales libres. Puedes agregar vistas panorámicas o mediciones extras si lo requieres.</div>';
    return;
  }
  gallery.innerHTML = pendingTowerExtraPhotos.map((photo, idx) => `
    <div class="tower-mat-thumb-wrap">
      <img src="${escapeHtml(photo)}" alt="Foto extra ${idx + 1}" onclick="previewTowerExtraPhoto(${idx})" title="Clic para ampliar y hacer zoom">
      <button type="button" class="tower-mat-thumb-del" onclick="removeTowerExtraPhoto(${idx})" title="Eliminar foto">✕</button>
    </div>
  `).join('');
}

// Aliases para compatibilidad
function handleTowerMaterialPhotoUpload(files) {
  return handleTowerExtraPhotoUpload(files);
}

function removeTowerMaterialPhoto(index) {
  return removeTowerExtraPhoto(index);
}

function renderTowerMaterialPhotos() {
  renderTowerMaterialPhotoSlots();
  renderTowerExtraPhotos();
}

// Escuchar portapapeles (Ctrl+V) cuando el modal de torre está abierto
if (typeof document !== 'undefined' && !document._towerMaterialPasteBound) {
  document._towerMaterialPasteBound = true;
  document.addEventListener('paste', async (event) => {
    const modal = document.getElementById('tower-material-mo');
    if (!modal || !modal.classList.contains('open')) return;
    const items = event.clipboardData?.items || [];
    for (const item of items) {
      if (item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        event.preventDefault();
        const slotOrder = ['batteries', 'panels', 'controller', 'tower', 'cabinet', 'mikrotik', 'poe', 'lightning'];
        const targetSlot = _lastActiveTowerSlot || slotOrder.find(s => s !== 'lightning' && !pendingTowerSlots[s]) || 'batteries';
        await handleSlotPhotoUpload(targetSlot, [file]);
        break;
      }
    }
  });
}

async function submitTowerMaterial() {
  if (!currentTowerMaterialAntennaId) return;
  return saveTowerMaterial(currentTowerMaterialAntennaId);
}

async function saveTowerMaterial(antennaId) {
  const antenna = (state.equipment || []).find(e => e.id === antennaId && !e.deletedAt);
  if (!antenna) {
    if (typeof notify === 'function') notify('No se encontró la antena.', 'err');
    return false;
  }

  const sections = (document.getElementById('tower-mat-sections')?.value || '').trim();
  const radios = (document.getElementById('tower-mat-radios')?.value || '').trim();
  const batteries = (document.getElementById('tower-mat-batteries')?.value || '').trim();
  const panels = (document.getElementById('tower-mat-panels')?.value || '').trim();
  const extra = (document.getElementById('tower-mat-extra')?.value || '').trim();

  // Combinar fotos de casillas específicas + fotos adicionales
  const slotPhotos = Object.values(pendingTowerSlots).filter(Boolean);
  pendingTowerMaterialPhotos = slotPhotos.concat(pendingTowerExtraPhotos);
  const hasPhotos = pendingTowerMaterialPhotos.length > 0;
  const hasBalancerPorts = typeof isBalancerEquipment === 'function' && isBalancerEquipment(antenna) && Array.isArray(pendingBalancerPorts) && pendingBalancerPorts.some(p => p.frontPhoto || p.backPhoto || p.label);

  const hasAnyInput = Boolean(sections || radios || batteries || panels || extra || hasPhotos || hasBalancerPorts);
  if (isTowerMaterialMandatory() && !hasAnyInput) {
    if (typeof notify === 'function') {
      notify('Esta torre aún no tiene material registrado. Debes ingresar al menos los tramos, radios, pilas, paneles, notas o fotos.', 'err');
    }
    return false;
  }

  const parts = [];
  if (sections) parts.push(`Tramos: ${sections}`);
  if (radios) parts.push(`Radios: ${radios}`);
  if (batteries) parts.push(`Pilas: ${batteries}`);
  if (panels) parts.push(`Paneles: ${panels}`);
  if (extra) parts.push(extra);
  const combinedNotes = parts.join('\n');

  const currentUser = (typeof getCurrentUser === 'function' ? getCurrentUser() : null) || {};
  const userName = currentUser.name || currentUser.username || (typeof userHasRole === 'function' && userHasRole('tecnico') ? 'Técnico' : 'Usuario');
  const now = new Date().toISOString();

  antenna.towerSections = sections;
  antenna.towerRadios = radios;
  antenna.towerBatteries = batteries;
  antenna.towerPanels = panels;
  antenna.towerExtraNotes = extra;
  antenna.towerMaterialNotes = combinedNotes;
  antenna.towerMaterialSlots = { ...pendingTowerSlots };
  antenna.towerMaterialExtraPhotos = pendingTowerExtraPhotos.slice();
  antenna.towerMaterialPhotos = pendingTowerMaterialPhotos.slice();
  if (isBalancerEquipment(antenna)) {
    syncBalancerPortLabelsFromDom();
    const finalPortCount = canConfigureBalancerPortCount()
      ? Math.max(1, Math.min(48, Number(pendingBalancerPortCount) || DEFAULT_BALANCER_PORTS))
      : getBalancerPortCount(antenna);
    antenna.balancerPortCount = finalPortCount;
    antenna.balancerPorts = normalizeBalancerPorts(
      { balancerPorts: pendingBalancerPorts, balancerPortCount: finalPortCount },
      finalPortCount
    ).map((p, idx) => ({
      port: idx + 1,
      label: String(p.label || '').trim(),
      frontPhoto: String(p.frontPhoto || '').trim(),
      backPhoto: String(p.backPhoto || '').trim()
    }));
  }
  antenna.towerMaterialUpdatedAt = now;
  antenna.towerMaterialUpdatedByName = userName;
  antenna.towerMaterialUpdatedById = currentUser.id || '';
  antenna.updatedAt = now;

  if (typeof setUpdatedAudit === 'function') {
    setUpdatedAudit(antenna, 'actualizó material de torre');
  }

  if (typeof notify === 'function') notify('Guardando material de torre...');
  const ok = typeof saveRecord === 'function' ? await saveRecord('equipment', antenna) : (typeof saveDB === 'function' ? await saveDB() : true);
  if (!ok) {
    if (typeof notify === 'function') notify('No se pudo guardar el material en la nube. Intenta nuevamente.', 'err');
    return false;
  }

  markTowerMaterialPrompted(antennaId);
  currentTowerMaterialIsMandatory = false;
  CM('tower-material-mo');
  if (typeof notify === 'function') notify('Material de torre guardado correctamente.', 'ok');
  if (pendingTowerMaterialCompletionDetail) {
    const comp = pendingTowerMaterialCompletionDetail;
    pendingTowerMaterialCompletionDetail = null;
    if (typeof openTechnicianCompletionSummary === 'function') openTechnicianCompletionSummary(comp);
  }

  if (typeof renderAntenas === 'function') {
    renderAntenas();
  }
  return true;
}

if (typeof window !== 'undefined') {
  window.markAllNotificationsAsRead = markAllNotificationsAsRead;
  window.markNotificationAsRead = markNotificationAsRead;
  window.markNotificationReadByOrderId = markNotificationReadByOrderId;
  if (typeof getNotificationVolume === 'function') window.getNotificationVolume = getNotificationVolume;
  if (typeof setNotificationVolume === 'function') window.setNotificationVolume = setNotificationVolume;
  if (typeof updateNotificationVolume === 'function') window.updateNotificationVolume = updateNotificationVolume;
  if (typeof testNotificationVolume === 'function') window.testNotificationVolume = testNotificationVolume;
  if (typeof hasTowerMaterial === 'function') window.hasTowerMaterial = hasTowerMaterial;
  if (typeof wasTowerMaterialPromptedRecently === 'function') window.wasTowerMaterialPromptedRecently = wasTowerMaterialPromptedRecently;
  if (typeof markTowerMaterialPrompted === 'function') window.markTowerMaterialPrompted = markTowerMaterialPrompted;
  if (typeof openTowerMaterialModal === 'function') window.openTowerMaterialModal = openTowerMaterialModal;
  if (typeof continueTowerMaterialModal === 'function') window.continueTowerMaterialModal = continueTowerMaterialModal;
  if (typeof closeTowerMaterialModal === 'function') window.closeTowerMaterialModal = closeTowerMaterialModal;
  if (typeof handleSlotPhotoUpload === 'function') window.handleSlotPhotoUpload = handleSlotPhotoUpload;
  if (typeof removeSlotPhoto === 'function') window.removeSlotPhoto = removeSlotPhoto;
  if (typeof previewSlotPhoto === 'function') window.previewSlotPhoto = previewSlotPhoto;
  if (typeof handleTowerBulkPhotoUpload === 'function') window.handleTowerBulkPhotoUpload = handleTowerBulkPhotoUpload;
  if (typeof handleTowerExtraPhotoUpload === 'function') window.handleTowerExtraPhotoUpload = handleTowerExtraPhotoUpload;
  if (typeof removeTowerExtraPhoto === 'function') window.removeTowerExtraPhoto = removeTowerExtraPhoto;
  if (typeof renderTowerMaterialPhotoSlots === 'function') window.renderTowerMaterialPhotoSlots = renderTowerMaterialPhotoSlots;
  if (typeof renderTowerExtraPhotos === 'function') window.renderTowerExtraPhotos = renderTowerExtraPhotos;
  if (typeof TOWER_PHOTO_SLOTS !== 'undefined') window.TOWER_PHOTO_SLOTS = TOWER_PHOTO_SLOTS;
  if (typeof findOrFetchWorkOrder === 'function') window.findOrFetchWorkOrder = findOrFetchWorkOrder;
}

const GLOBAL_WORK_ORDERS_CACHE_KEY = 'netops_global_work_orders_cache_v1';
let _memoryWorkOrdersCache = null;
let _saveWorkOrdersCacheTimer = null;

function getGlobalWorkOrdersCache() {
  if (_memoryWorkOrdersCache) return _memoryWorkOrdersCache;
  try {
    const raw = localStorage.getItem(GLOBAL_WORK_ORDERS_CACHE_KEY);
    _memoryWorkOrdersCache = raw ? JSON.parse(raw) : {};
    return _memoryWorkOrdersCache;
  } catch (e) {
    _memoryWorkOrdersCache = {};
    return _memoryWorkOrdersCache;
  }
}

function saveWorkOrdersToGlobalCache(orders) {
  if (!Array.isArray(orders) || !orders.length) return;
  try {
    const cache = getGlobalWorkOrdersCache();
    let changed = false;
    orders.forEach(order => {
      if (order && order.id && !order.deletedAt) {
        const prev = cache[order.id];
        if (!prev || prev.updatedAt !== order.updatedAt || prev.status !== order.status || prev !== order) {
          cache[order.id] = prev ? { ...prev, ...order } : order;
          changed = true;
        }
      }
    });
    if (changed) {
      const keys = Object.keys(cache);
      if (keys.length > 800) {
        keys.slice(0, keys.length - 800).forEach(k => delete cache[k]);
      }
      if (!_saveWorkOrdersCacheTimer) {
        _saveWorkOrdersCacheTimer = setTimeout(() => {
          _saveWorkOrdersCacheTimer = null;
          try {
            localStorage.setItem(GLOBAL_WORK_ORDERS_CACHE_KEY, JSON.stringify(cache));
          } catch (_) {}
        }, 300);
      }
    }
  } catch (e) {
    console.warn('saveWorkOrdersToGlobalCache warning:', e);
  }
}

async function findOrFetchWorkOrder(detailId) {
  if (!detailId) return null;
  const rawId = String(detailId).trim();
  const cleanId = rawId.replace(/^(DET|RED|NEW)-/i, '');

  // 1. Memoria local en state.workOrders
  const list = Array.isArray(state?.workOrders) ? state.workOrders : [];
  let found = list.find(w => !w.deletedAt && (
    w.id === rawId ||
    w.id === cleanId ||
    (w.folio && (w.folio === rawId || w.folio.endsWith(`-${cleanId}`))) ||
    (typeof getDetailFolio === 'function' && (getDetailFolio(w) === rawId || getDetailFolio(w).endsWith(`-${cleanId}`)))
  ));
  if (found) {
    saveWorkOrdersToGlobalCache([found]);
    return found;
  }

  // 2. Paradas activas del plan si están cargadas
  try {
    if (typeof getPlanStopsForView === 'function') {
      const stops = getPlanStopsForView('general') || [];
      for (const stop of stops) {
        if (typeof getStopDetails === 'function') {
          const stopDetails = getStopDetails(stop) || [];
          found = stopDetails.find(w => !w.deletedAt && (
            w.id === rawId ||
            w.id === cleanId ||
            (w.folio && (w.folio === rawId || w.folio.endsWith(`-${cleanId}`))) ||
            (typeof getDetailFolio === 'function' && (getDetailFolio(w) === rawId || getDetailFolio(w).endsWith(`-${cleanId}`)))
          ));
          if (found) break;
        }
      }
    }
  } catch (e) {
    console.warn('findOrFetchWorkOrder plan check warning:', e);
  }
  if (found) {
    if (!list.some(w => w.id === found.id)) list.push(found);
    saveWorkOrdersToGlobalCache([found]);
    return found;
  }

  // 2.5. Caché global persistente en localStorage
  try {
    const globalCache = getGlobalWorkOrdersCache();
    const cachedMatch = Object.values(globalCache).find(w => !w.deletedAt && (
      w.id === rawId ||
      w.id === cleanId ||
      (w.folio && (w.folio === rawId || w.folio.endsWith(`-${cleanId}`))) ||
      (typeof getDetailFolio === 'function' && (getDetailFolio(w) === rawId || getDetailFolio(w).endsWith(`-${cleanId}`)))
    ));
    if (cachedMatch) {
      if (!Array.isArray(state.workOrders)) state.workOrders = [];
      if (!state.workOrders.some(w => w.id === cachedMatch.id)) state.workOrders.push(cachedMatch);
      return cachedMatch;
    }
  } catch (cacheErr) {
    console.warn('findOrFetchWorkOrder globalCache lookup warning:', cacheErr);
  }

  // 3. Fallback de red: consultar al servidor directamente
  try {
    const apiBase = (typeof API !== 'undefined' && API) ? API : (window.API || '');
    const url = `${apiBase}/api/data?part=operations&id=${encodeURIComponent(rawId)}&limit=5`;
    const res = await fetch(url, {
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}
    });
    if (res.ok) {
      const data = await res.json();
      const fetchedOrders = Array.isArray(data?.workOrders) ? data.workOrders : [];
      const match = fetchedOrders.find(w => !w.deletedAt && (
        w.id === rawId ||
        w.id === cleanId ||
        (w.folio && (w.folio === rawId || w.folio.endsWith(`-${cleanId}`))) ||
        (typeof getDetailFolio === 'function' && (getDetailFolio(w) === rawId || getDetailFolio(w).endsWith(`-${cleanId}`)))
      )) || fetchedOrders[0];

      if (match) {
        if (!Array.isArray(state.workOrders)) state.workOrders = [];
        const existingIdx = state.workOrders.findIndex(w => w.id === match.id);
        if (existingIdx >= 0) {
          state.workOrders[existingIdx] = match;
        } else {
          state.workOrders.push(match);
        }
        saveWorkOrdersToGlobalCache([match]);
        return match;
      }
    }
  } catch (fetchErr) {
    console.warn('findOrFetchWorkOrder server fallback failed:', fetchErr);
  }

  return null;
}
if (typeof window !== 'undefined') {
  window.findOrFetchWorkOrder = findOrFetchWorkOrder;
  window.getGlobalWorkOrdersCache = getGlobalWorkOrdersCache;
  window.saveWorkOrdersToGlobalCache = saveWorkOrdersToGlobalCache;
}

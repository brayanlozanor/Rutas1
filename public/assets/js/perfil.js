// ==========================================================================
// assets/js/perfil.js
// Modal global "Mi perfil" (solo computadora; oculto en celular y vista técnico)
// ==========================================================================

(() => {
  const ACCENT_PALETTE = [
    { hex: '#0b6ef3', name: 'Azul WiFiMex' },
    { hex: '#4f46e5', name: 'Índigo Ejecutivo' },
    { hex: '#0284c7', name: 'Cian NOC' },
    { hex: '#059669', name: 'Esmeralda' },
    { hex: '#15803d', name: 'Verde Bosque' },
    { hex: '#7c3aed', name: 'Violeta' },
    { hex: '#d97706', name: 'Ámbar' },
    { hex: '#ea580c', name: 'Naranja Operativo' },
    { hex: '#e11d48', name: 'Carmesí' },
    { hex: '#334155', name: 'Grafito Corporativo' }
  ];

  const FONT_SCALE_OPTIONS = [
    { id: 'sm', label: 'Pequeño', pct: '90%', sampleSize: '13px' },
    { id: 'md', label: 'Normal', pct: '100%', sampleSize: '16px' },
    { id: 'lg', label: 'Grande', pct: '112%', sampleSize: '19px' },
    { id: 'xl', label: 'Muy grande', pct: '124%', sampleSize: '22px' }
  ];

  const EYE_OPEN_SVG = '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF_SVG = '<svg viewBox="0 0 24 24"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';

  let activeTab = 'info';
  let loadedProfile = null;
  let draftPrefs = { accent: '#0b6ef3', fontScale: 'md' };
  let savedPrefsSnapshot = { accent: '#0b6ef3', fontScale: 'md' };
  let spectrumHsv = { h: 214, s: 0.95, v: 0.95 };
  let appearanceDirty = false;
  let savingBusy = false;

  function _hexToRgb(hex) {
    const clean = String(hex || '').replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return { r: 11, g: 110, b: 243 };
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  }

  function _rgbToHex(r, g, b) {
    const toH = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${toH(r)}${toH(g)}${toH(b)}`;
  }

  function _hexToHsv(hex) {
    const { r, g, b } = _hexToRgb(hex);
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === rn) h = 60 * (((gn - bn) / d) % 6);
      else if (max === gn) h = 60 * (((bn - rn) / d) + 2);
      else h = 60 * (((rn - gn) / d) + 4);
    }
    if (h < 0) h += 360;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    return { h: Math.round(h), s, v };
  }

  function _hsvToHex(h, s, v) {
    const hh = ((Number(h) % 360) + 360) % 360;
    const ss = Math.max(0, Math.min(1, Number(s) || 0));
    const vv = Math.max(0, Math.min(1, Number(v) || 0));
    const c = vv * ss;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = vv - c;
    let r = 0, g = 0, b = 0;
    if (hh < 60) { r = c; g = x; }
    else if (hh < 120) { r = x; g = c; }
    else if (hh < 180) { g = c; b = x; }
    else if (hh < 240) { g = x; b = c; }
    else if (hh < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return _rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }

  function esc(val) {
    if (typeof escapeHtml === 'function') return escapeHtml(val);
    return String(val ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function getInitials(name) {
    const clean = String(name || 'U').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase() || 'U';
  }

  function canUseDesktopProfile() {
    if (typeof isDesktopProfileEnabled === 'function') return isDesktopProfileEnabled();
    const role = typeof normalizeRole === 'function' ? normalizeRole(getCurrentUser()?.role) : '';
    return typeof window !== 'undefined' && window.innerWidth > 768 && role !== 'tecnico' && !document.body?.classList?.contains('tech-route-body') && !document.body?.classList?.contains('plan-technician-view');
  }

  function ensureProfileModal() {
    let modal = document.getElementById('netops-profile-mo');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'netops-profile-mo';
    modal.className = 'mo profile-modal-overlay';
    modal.innerHTML = `
      <div class="profile-modal-card" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
        <div class="profile-modal-header">
          <div class="profile-header-identity">
            <div class="profile-avatar-lg" id="profile-avatar-initials">US</div>
            <div class="profile-header-copy">
              <h2 id="profile-modal-title">Mi perfil</h2>
              <div class="profile-header-meta">
                <span class="profile-username-tag" id="profile-header-username">@usuario</span>
                <span class="profile-role-pill" id="profile-header-role">Usuario</span>
              </div>
            </div>
          </div>
          <button type="button" class="profile-close-btn" id="profile-modal-close" aria-label="Cerrar mi perfil">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div class="profile-tabs" role="tablist">
          <button type="button" class="profile-tab-btn active" data-profile-tab="info" role="tab" aria-selected="true">
            <svg viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Información</span>
          </button>
          <button type="button" class="profile-tab-btn" data-profile-tab="appearance" role="tab" aria-selected="false">
            <svg viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z"/></svg>
            <span>Apariencia</span>
          </button>
          <button type="button" class="profile-tab-btn" data-profile-tab="security" role="tab" aria-selected="false">
            <svg viewBox="0 0 24 24"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Contraseña</span>
          </button>
        </div>

        <div class="profile-modal-body">
          <!-- TAB 1: INFORMACIÓN PERSONAL -->
          <div class="profile-tab-pane active" data-profile-pane="info">
            <div class="profile-readonly-box">
              <div class="profile-readonly-item">
                <span>Rol asignado</span>
                <strong id="profile-meta-role">—</strong>
              </div>
              <div class="profile-readonly-item">
                <span>Estatus</span>
                <strong id="profile-meta-status">Activo</strong>
              </div>
              <div class="profile-readonly-item">
                <span>Zonas</span>
                <strong id="profile-meta-zones">—</strong>
              </div>
            </div>

            <div class="profile-form-grid">
              <div class="profile-field">
                <label for="profile-name">Nombre completo</label>
                <input id="profile-name" type="text" maxlength="120" autocomplete="name" placeholder="Tu nombre completo">
              </div>
              <div class="profile-field">
                <label for="profile-username">Usuario de acceso</label>
                <input id="profile-username" type="text" maxlength="60" autocomplete="username" placeholder="usuario">
                <span class="profile-field-hint">Sin espacios ni símbolo @.</span>
              </div>
            </div>

            <div class="profile-field">
              <label for="profile-phone">Teléfono</label>
              <input id="profile-phone" type="tel" maxlength="40" autocomplete="tel" placeholder="Ej. 744 123 4567">
            </div>

            <div class="profile-actions-bar">
              <button type="button" class="btn bgh" data-profile-close>Cancelar</button>
              <button type="button" class="btn bc" id="profile-save-info-btn">Guardar información</button>
            </div>
          </div>

          <!-- TAB 2: APARIENCIA (SOLO COMPUTADORA) -->
          <div class="profile-tab-pane" data-profile-pane="appearance">
            <div class="profile-info-banner">
              <svg viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
              <span>Personalización exclusiva para tu sesión en computadora. El color que elijas se aplica a toda la plataforma. En celular y técnicos se mantiene el diseño estándar.</span>
            </div>

            <div class="profile-section-block">
              <div class="profile-section-title">
                <span>Paleta completa de colores</span>
                <span class="profile-color-hex" id="profile-accent-hex">#0B6EF3</span>
              </div>

              <div class="profile-spectrum-card">
                <div class="profile-sv-box" id="profile-sv-box" title="Arrastra o haz clic para elegir cualquier tono e intensidad">
                  <canvas id="profile-sv-canvas" width="280" height="140"></canvas>
                  <span class="profile-sv-cursor" id="profile-sv-cursor"></span>
                </div>
                <div class="profile-spectrum-controls">
                  <label class="profile-hue-label" for="profile-hue-slider">Tono del espectro (0° – 360°)</label>
                  <input type="range" id="profile-hue-slider" class="profile-hue-slider" min="0" max="360" value="214" aria-label="Tono de color en todo el espectro">
                  <div class="profile-color-inputs-row">
                    <span class="profile-color-preview-chip" id="profile-color-preview-chip" style="background:#0b6ef3"></span>
                    <input type="text" id="profile-hex-input" class="profile-hex-input" value="#0B6EF3" maxlength="7" spellcheck="false" aria-label="Código hexadecimal del color" placeholder="#0B6EF3">
                    <label class="profile-native-picker-btn" title="Abrir selector de color del sistema">
                      <input type="color" id="profile-accent-picker" value="#0b6ef3" aria-label="Selector libre de color principal">
                      <span>Gotero</span>
                    </label>
                  </div>
                </div>
              </div>

              <div class="profile-swatches-label">Colores rápidos sugeridos</div>
              <div class="profile-color-swatches" id="profile-accent-swatches">
                ${ACCENT_PALETTE.map(c => `
                  <button type="button" class="profile-swatch-btn" data-accent-hex="${c.hex}" style="background:${c.hex}" title="${esc(c.name)} (${c.hex})" aria-label="Color ${esc(c.name)}"></button>
                `).join('')}
              </div>
            </div>

            <div class="profile-section-block">
              <div class="profile-section-title">
                <span>Tamaño del texto</span>
              </div>
              <div class="profile-font-options" id="profile-font-options">
                ${FONT_SCALE_OPTIONS.map(opt => `
                  <button type="button" class="profile-font-card" data-font-scale-opt="${opt.id}">
                    <span class="profile-font-sample" style="font-size:${opt.sampleSize}">Aa</span>
                    <span class="profile-font-label">${opt.label}</span>
                    <span class="profile-font-pct">${opt.pct}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="profile-actions-bar has-left">
              <button type="button" class="btn bgh" id="profile-reset-appearance-btn">Restablecer</button>
              <div class="profile-actions-right">
                <button type="button" class="btn bgh" data-profile-close>Cancelar</button>
                <button type="button" class="btn bc" id="profile-save-appearance-btn">Guardar apariencia</button>
              </div>
            </div>
          </div>

          <!-- TAB 3: CONTRASEÑA -->
          <div class="profile-tab-pane" data-profile-pane="security">
            <div class="profile-info-banner">
              <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
              <span>Por seguridad, ingresa tu contraseña actual para autorizar el cambio. Usa al menos 6 caracteres.</span>
            </div>

            <div class="profile-field">
              <label for="profile-current-pass">Contraseña actual</label>
              <div class="profile-password-wrap">
                <input id="profile-current-pass" type="password" autocomplete="current-password" placeholder="Ingresa tu contraseña actual">
                <button type="button" class="profile-pass-eye" data-toggle-pass="profile-current-pass" aria-label="Mostrar u ocultar contraseña">${EYE_OPEN_SVG}</button>
              </div>
            </div>

            <div class="profile-form-grid">
              <div class="profile-field">
                <label for="profile-new-pass">Nueva contraseña</label>
                <div class="profile-password-wrap">
                  <input id="profile-new-pass" type="password" autocomplete="new-password" placeholder="Mínimo 6 caracteres">
                  <button type="button" class="profile-pass-eye" data-toggle-pass="profile-new-pass" aria-label="Mostrar u ocultar nueva contraseña">${EYE_OPEN_SVG}</button>
                </div>
              </div>
              <div class="profile-field">
                <label for="profile-confirm-pass">Confirmar nueva contraseña</label>
                <div class="profile-password-wrap">
                  <input id="profile-confirm-pass" type="password" autocomplete="new-password" placeholder="Repite la nueva contraseña">
                  <button type="button" class="profile-pass-eye" data-toggle-pass="profile-confirm-pass" aria-label="Mostrar u ocultar confirmación">${EYE_OPEN_SVG}</button>
                </div>
              </div>
            </div>

            <div class="profile-actions-bar">
              <button type="button" class="btn bgh" data-profile-close>Cancelar</button>
              <button type="button" class="btn br" id="profile-save-password-btn">Cambiar contraseña</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    bindProfileModalEvents(modal);
    return modal;
  }

  function bindProfileModalEvents(modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeProfileModal();
    });

    modal.querySelector('#profile-modal-close')?.addEventListener('click', closeProfileModal);
    modal.querySelectorAll('[data-profile-close]').forEach(btn => {
      btn.addEventListener('click', closeProfileModal);
    });

    modal.querySelectorAll('[data-profile-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        switchProfileTab(btn.dataset.profileTab || 'info');
      });
    });

    modal.querySelectorAll('[data-accent-hex]').forEach(btn => {
      btn.addEventListener('click', () => {
        previewAppearance(btn.dataset.accentHex, draftPrefs.fontScale);
      });
    });

    const picker = modal.querySelector('#profile-accent-picker');
    if (picker) {
      picker.addEventListener('input', (e) => {
        spectrumHsv = _hexToHsv(e.target.value);
        previewAppearance(e.target.value, draftPrefs.fontScale, false);
      });
    }

    const hueSlider = modal.querySelector('#profile-hue-slider');
    if (hueSlider) {
      hueSlider.addEventListener('input', (e) => {
        spectrumHsv.h = Number(e.target.value) || 0;
        const nextHex = _hsvToHex(spectrumHsv.h, spectrumHsv.s, spectrumHsv.v);
        previewAppearance(nextHex, draftPrefs.fontScale, true);
      });
    }

    const hexInput = modal.querySelector('#profile-hex-input');
    if (hexInput) {
      hexInput.addEventListener('input', (e) => {
        let val = String(e.target.value || '').trim();
        if (val && !val.startsWith('#')) val = '#' + val;
        if (/^#[0-9a-fA-F]{6}$/.test(val)) {
          spectrumHsv = _hexToHsv(val);
          previewAppearance(val.toLowerCase(), draftPrefs.fontScale, false);
        }
      });
    }

    const svBox = modal.querySelector('#profile-sv-box');
    if (svBox) {
      let draggingSv = false;
      const pickSvAt = (clientX, clientY) => {
        const rect = svBox.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const v = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
        spectrumHsv.s = s;
        spectrumHsv.v = v;
        const nextHex = _hsvToHex(spectrumHsv.h, spectrumHsv.s, spectrumHsv.v);
        previewAppearance(nextHex, draftPrefs.fontScale, true);
      };
      svBox.addEventListener('pointerdown', (e) => {
        draggingSv = true;
        try { svBox.setPointerCapture(e.pointerId); } catch (_) {}
        pickSvAt(e.clientX, e.clientY);
      });
      svBox.addEventListener('pointermove', (e) => {
        if (!draggingSv) return;
        pickSvAt(e.clientX, e.clientY);
      });
      const stopDrag = () => { draggingSv = false; };
      svBox.addEventListener('pointerup', stopDrag);
      svBox.addEventListener('pointercancel', stopDrag);
    }

    modal.querySelectorAll('[data-font-scale-opt]').forEach(btn => {
      btn.addEventListener('click', () => {
        previewAppearance(draftPrefs.accent, btn.dataset.fontScaleOpt || 'md');
      });
    });

    modal.querySelectorAll('[data-toggle-pass]').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.togglePass);
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.innerHTML = isPassword ? EYE_OFF_SVG : EYE_OPEN_SVG;
      });
    });

    modal.querySelector('#profile-save-info-btn')?.addEventListener('click', handleSaveProfileInfo);
    modal.querySelector('#profile-save-appearance-btn')?.addEventListener('click', handleSaveAppearance);
    modal.querySelector('#profile-reset-appearance-btn')?.addEventListener('click', handleResetAppearance);
    modal.querySelector('#profile-save-password-btn')?.addEventListener('click', handleChangePassword);
  }

  function switchProfileTab(tabName) {
    activeTab = tabName;
    const modal = document.getElementById('netops-profile-mo');
    if (!modal) return;
    modal.querySelectorAll('[data-profile-tab]').forEach(btn => {
      const isAct = btn.dataset.profileTab === tabName;
      btn.classList.toggle('active', isAct);
      btn.setAttribute('aria-selected', isAct ? 'true' : 'false');
    });
    modal.querySelectorAll('[data-profile-pane]').forEach(pane => {
      pane.classList.toggle('active', pane.dataset.profilePane === tabName);
    });
    if (tabName === 'appearance') {
      requestAnimationFrame(() => drawSpectrumCanvas());
    }
  }

  function drawSpectrumCanvas() {
    const canvas = document.getElementById('profile-sv-canvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const pureHue = _hsvToHex(spectrumHsv.h, 1, 1);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = pureHue;
    ctx.fillRect(0, 0, w, h);

    const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
    whiteGrad.addColorStop(0, '#ffffff');
    whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, w, h);

    const blackGrad = ctx.createLinearGradient(0, 0, 0, h);
    blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
    blackGrad.addColorStop(1, '#000000');
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, w, h);

    const cursor = document.getElementById('profile-sv-cursor');
    if (cursor) {
      cursor.style.left = `${Math.round(spectrumHsv.s * 1000) / 10}%`;
      cursor.style.top = `${Math.round((1 - spectrumHsv.v) * 1000) / 10}%`;
      cursor.style.background = draftPrefs.accent;
    }
  }

  function syncAppearanceControls(accent, fontScale, keepHsv = false) {
    const cleanAccent = /^#[0-9a-fA-F]{6}$/.test(String(accent || '')) ? String(accent).toLowerCase() : '#0b6ef3';
    const cleanScale = ['sm', 'md', 'lg', 'xl'].includes(String(fontScale || '')) ? String(fontScale) : 'md';
    draftPrefs = { accent: cleanAccent, fontScale: cleanScale };
    if (!keepHsv) {
      spectrumHsv = _hexToHsv(cleanAccent);
    }

    const picker = document.getElementById('profile-accent-picker');
    if (picker) picker.value = cleanAccent;
    const hexEl = document.getElementById('profile-accent-hex');
    if (hexEl) hexEl.textContent = cleanAccent.toUpperCase();
    const hexIn = document.getElementById('profile-hex-input');
    if (hexIn && document.activeElement !== hexIn) hexIn.value = cleanAccent.toUpperCase();
    const previewChip = document.getElementById('profile-color-preview-chip');
    if (previewChip) previewChip.style.background = cleanAccent;
    const hueSlider = document.getElementById('profile-hue-slider');
    if (hueSlider) hueSlider.value = String(Math.round(spectrumHsv.h));

    drawSpectrumCanvas();

    document.querySelectorAll('#profile-accent-swatches [data-accent-hex]').forEach(btn => {
      btn.classList.toggle('active', String(btn.dataset.accentHex || '').toLowerCase() === cleanAccent);
    });
    document.querySelectorAll('#profile-font-options [data-font-scale-opt]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.fontScaleOpt === cleanScale);
    });
  }

  function previewAppearance(accent, fontScale, keepHsv = false) {
    appearanceDirty = true;
    syncAppearanceControls(accent, fontScale, keepHsv);
    if (typeof applyUserDesktopPreferences === 'function') {
      applyUserDesktopPreferences(draftPrefs);
    }
  }

  function populateProfileForm(profile) {
    const user = profile || (typeof getCurrentUser === 'function' ? getCurrentUser() : {}) || {};
    loadedProfile = { ...user };
    const displayName = user.name || user.username || 'Usuario';
    const roleLabel = typeof formatRoleLabel === 'function' ? formatRoleLabel(user.role) : (user.role || 'Usuario');

    const initialsEl = document.getElementById('profile-avatar-initials');
    const titleEl = document.getElementById('profile-modal-title');
    const usernameTag = document.getElementById('profile-header-username');
    const rolePill = document.getElementById('profile-header-role');
    const metaRole = document.getElementById('profile-meta-role');
    const metaStatus = document.getElementById('profile-meta-status');
    const metaZones = document.getElementById('profile-meta-zones');

    if (initialsEl) initialsEl.textContent = getInitials(displayName);
    if (titleEl) titleEl.textContent = displayName;
    if (usernameTag) usernameTag.textContent = `@${String(user.username || '').replace(/^@+/, '')}`;
    if (rolePill) rolePill.textContent = roleLabel;
    if (metaRole) metaRole.textContent = roleLabel;
    if (metaStatus) metaStatus.textContent = (user.status || 'activo').toUpperCase();
    if (metaZones) {
      const zones = Array.isArray(user.zones) ? user.zones : [];
      metaZones.textContent = zones.length
        ? zones.map(z => (typeof getZoneLabel === 'function' ? getZoneLabel(z) : z)).join(', ')
        : 'Todas / General';
    }

    const nameIn = document.getElementById('profile-name');
    const userIn = document.getElementById('profile-username');
    const phoneIn = document.getElementById('profile-phone');
    if (nameIn) nameIn.value = user.name || '';
    if (userIn) userIn.value = String(user.username || '').replace(/^@+/, '');
    if (phoneIn) phoneIn.value = user.phone || '';

    const prefs = typeof getUserDesktopPrefs === 'function'
      ? getUserDesktopPrefs(user)
      : { accent: user.uiAccent || '#0b6ef3', fontScale: user.uiFontScale || 'md' };
    savedPrefsSnapshot = { accent: prefs.accent || '#0b6ef3', fontScale: prefs.fontScale || 'md' };
    appearanceDirty = false;
    syncAppearanceControls(savedPrefsSnapshot.accent, savedPrefsSnapshot.fontScale);

    ['profile-current-pass', 'profile-new-pass', 'profile-confirm-pass'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.value = '';
        el.type = 'password';
      }
    });
    document.querySelectorAll('#netops-profile-mo [data-toggle-pass]').forEach(btn => {
      btn.innerHTML = EYE_OPEN_SVG;
    });
  }

  function updateStoredUserProfile(profile) {
    if (!profile || typeof profile !== 'object') return;
    try {
      const prev = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
      const merged = { ...prev, ...profile };
      localStorage.setItem('user', JSON.stringify(merged));
    } catch (e) {}
    if (typeof hydrateTopbarUser === 'function') hydrateTopbarUser();
  }

  async function syncProfileFromServer() {
    const apiBase = typeof API === 'string' ? API : (window.API || '');
    try {
      let data;
      if (typeof fetchJsonWithOfflineCache === 'function') {
        data = await fetchJsonWithOfflineCache(`${apiBase}/api/profile`, { timeoutMs: 8000, cacheKey: '/api/profile' });
      } else {
        const res = await fetch(`${apiBase}/api/profile`, { cache: 'no-store', credentials: 'same-origin' });
        data = await res.json().catch(() => ({}));
        if (!res.ok) return;
      }
      if (data?.ok && data.profile) {
        updateStoredUserProfile(data.profile);
        // Si el servidor tiene preferencias guardadas y el navegador local no, sincronizar
        if (typeof saveUserDesktopPrefs === 'function' && (data.profile.uiAccent || data.profile.uiFontScale)) {
          const localPrefs = typeof getUserDesktopPrefs === 'function' ? getUserDesktopPrefs(data.profile) : null;
          if (!localPrefs?.hasLocalOverride) {
            saveUserDesktopPrefs({
              accent: data.profile.uiAccent || '#0b6ef3',
              fontScale: data.profile.uiFontScale || 'md'
            }, data.profile.id);
          }
        }
        populateProfileForm(data.profile);
      }
    } catch (err) {
      // Silencioso si está sin conexión: se muestra la información local
    }
  }

  async function handleSaveProfileInfo() {
    if (savingBusy) return;
    const name = String(document.getElementById('profile-name')?.value || '').trim();
    const username = String(document.getElementById('profile-username')?.value || '').trim().replace(/^@+/, '').trim();
    const phone = String(document.getElementById('profile-phone')?.value || '').trim();

    if (!name) {
      notify('Captura tu nombre completo.', 'err');
      return;
    }
    if (!username || username.length < 2 || /\s/.test(username)) {
      notify('El nombre de usuario debe tener al menos 2 caracteres y sin espacios.', 'err');
      return;
    }

    const confirmed = await askConfirmation({
      title: 'Confirmar actualización de perfil',
      message: `¿Deseas guardar los cambios en tu perfil (${name} · @${username})?`,
      confirmText: 'Sí, guardar cambios',
      cancelText: 'Cancelar',
      tone: 'ok'
    });
    if (!confirmed) return;

    const btn = document.getElementById('profile-save-info-btn');
    savingBusy = true;
    if (btn) btn.disabled = true;
    try {
      const apiBase = typeof API === 'string' ? API : (window.API || '');
      const res = await fetch(`${apiBase}/api/profile`, {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, phone })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok !== true) {
        notify(data.error || 'No se pudo actualizar tu perfil.', 'err');
        return;
      }
      if (data.profile) {
        updateStoredUserProfile(data.profile);
        populateProfileForm(data.profile);
      }
      notify('Tu información personal se actualizó correctamente.', 'ok');
    } catch (err) {
      notify('Error de conexión al guardar tu perfil. Verifica tu internet e intenta nuevamente.', 'err');
    } finally {
      savingBusy = false;
      if (btn) btn.disabled = false;
    }
  }

  async function handleSaveAppearance() {
    if (savingBusy) return;
    const scaleLabel = (FONT_SCALE_OPTIONS.find(o => o.id === draftPrefs.fontScale) || FONT_SCALE_OPTIONS[1]).label;
    const confirmed = await askConfirmation({
      title: 'Guardar apariencia de escritorio',
      message: `Se aplicará el color principal ${draftPrefs.accent.toUpperCase()} y tamaño de texto "${scaleLabel}" en todas las páginas de tu cuenta en computadora.`,
      confirmText: 'Sí, guardar apariencia',
      cancelText: 'Cancelar',
      tone: 'ok'
    });
    if (!confirmed) return;

    const btn = document.getElementById('profile-save-appearance-btn');
    savingBusy = true;
    if (btn) btn.disabled = true;
    try {
      const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
      if (typeof saveUserDesktopPrefs === 'function') {
        saveUserDesktopPrefs(draftPrefs, user?.id);
      }
      if (typeof applyUserDesktopPreferences === 'function') {
        applyUserDesktopPreferences(draftPrefs);
      }
      savedPrefsSnapshot = { ...draftPrefs };
      appearanceDirty = false;

      // Sincronizar también con el backend (no bloquea si está offline)
      const apiBase = typeof API === 'string' ? API : (window.API || '');
      try {
        const res = await fetch(`${apiBase}/api/profile`, {
          method: 'POST',
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uiAccent: draftPrefs.accent,
            uiFontScale: draftPrefs.fontScale
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok && data.profile) {
          updateStoredUserProfile(data.profile);
        }
      } catch (e) {}

      notify('Apariencia personalizada guardada para tu computadora.', 'ok');
    } finally {
      savingBusy = false;
      if (btn) btn.disabled = false;
    }
  }

  async function handleResetAppearance() {
    if (savingBusy) return;
    const confirmed = await askConfirmation({
      title: 'Restablecer apariencia predeterminada',
      message: 'Se restaurará el color principal corporativo (#0B6EF3) y el tamaño de texto normal (100%).',
      confirmText: 'Sí, restablecer',
      cancelText: 'Cancelar',
      tone: 'warning'
    });
    if (!confirmed) return;

    const defaults = { accent: '#0b6ef3', fontScale: 'md' };
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
    if (typeof resetUserDesktopPrefs === 'function') {
      resetUserDesktopPrefs(user?.id);
    }
    syncAppearanceControls(defaults.accent, defaults.fontScale);
    savedPrefsSnapshot = { ...defaults };
    appearanceDirty = false;
    if (typeof applyUserDesktopPreferences === 'function') {
      applyUserDesktopPreferences(defaults);
    }

    try {
      const apiBase = typeof API === 'string' ? API : (window.API || '');
      const res = await fetch(`${apiBase}/api/profile`, {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uiAccent: '', uiFontScale: 'md' })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok && data.profile) updateStoredUserProfile(data.profile);
    } catch (e) {}

    notify('Se restableció la apariencia predeterminada.', 'ok');
  }

  async function handleChangePassword() {
    if (savingBusy) return;
    const currentPassword = String(document.getElementById('profile-current-pass')?.value || '').trim();
    const newPassword = String(document.getElementById('profile-new-pass')?.value || '').trim();
    const confirmPassword = String(document.getElementById('profile-confirm-pass')?.value || '').trim();

    if (!currentPassword) {
      notify('Ingresa tu contraseña actual.', 'err');
      return;
    }
    if (newPassword.length < 6) {
      notify('La nueva contraseña debe tener al menos 6 caracteres.', 'err');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify('La confirmación de la nueva contraseña no coincide.', 'err');
      return;
    }
    if (newPassword === currentPassword) {
      notify('La nueva contraseña debe ser diferente a la actual.', 'warn');
      return;
    }

    const confirmed = await askConfirmation({
      title: 'Confirmar cambio de contraseña',
      message: '¿Seguro que deseas actualizar tu contraseña de acceso? Deberás utilizar la nueva contraseña en tu próximo inicio de sesión.',
      confirmText: 'Sí, cambiar contraseña',
      cancelText: 'Cancelar',
      tone: 'danger'
    });
    if (!confirmed) return;

    const btn = document.getElementById('profile-save-password-btn');
    savingBusy = true;
    if (btn) btn.disabled = true;
    try {
      const apiBase = typeof API === 'string' ? API : (window.API || '');
      const res = await fetch(`${apiBase}/api/profile/password`, {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok !== true) {
        notify(data.error || 'No se pudo cambiar la contraseña.', 'err');
        return;
      }
      ['profile-current-pass', 'profile-new-pass', 'profile-confirm-pass'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      notify('Contraseña actualizada correctamente.', 'ok');
    } catch (err) {
      notify('Error de conexión al cambiar la contraseña. Verifica tu internet.', 'err');
    } finally {
      savingBusy = false;
      if (btn) btn.disabled = false;
    }
  }

  function openProfileModal(initialTab = 'info') {
    if (!canUseDesktopProfile()) {
      if (typeof notify === 'function') {
        notify('La sección Mi perfil está disponible únicamente en computadora.', 'warn');
      }
      return;
    }
    ensureProfileModal();
    populateProfileForm(loadedProfile || (typeof getCurrentUser === 'function' ? getCurrentUser() : {}));
    switchProfileTab(initialTab || 'info');
    if (typeof OM === 'function') OM('netops-profile-mo');
    else document.getElementById('netops-profile-mo')?.classList.add('open');
    void syncProfileFromServer();
  }

  function closeProfileModal() {
    if (appearanceDirty && typeof applyUserDesktopPreferences === 'function') {
      applyUserDesktopPreferences(savedPrefsSnapshot);
      appearanceDirty = false;
    }
    if (typeof CM === 'function') CM('netops-profile-mo');
    else document.getElementById('netops-profile-mo')?.classList.remove('open');
  }

  window.openProfileModal = openProfileModal;
  window.closeProfileModal = closeProfileModal;
})();

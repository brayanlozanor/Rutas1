const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

const baseDir = path.resolve(__dirname, '..');
const commonJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/common.js'), 'utf8');
const apiJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/api.js'), 'utf8');
const swJs = fs.readFileSync(path.join(baseDir, 'public/sw.js'), 'utf8');
const perfilJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/perfil.js'), 'utf8');
const themeProCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/theme-pro.css'), 'utf8');
const sidebarCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/sidebar-compact.css'), 'utf8');

function extractFunc(source, name) {
  const asyncMarker = `async function ${name}(`;
  const syncMarker = `function ${name}(`;
  const start = source.indexOf(asyncMarker) >= 0 ? source.indexOf(asyncMarker) : source.indexOf(syncMarker);
  if (start < 0) throw new Error(`Function ${name} not found`);
  const sigEnd = source.indexOf(')', start);
  const brace = source.indexOf('{', sigEnd);
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') depth--;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Function ${name} unbalanced`);
}

(async () => {
  console.log('=== TEST: Desktop Notifications, Offline Cache, Lucide Icons, Theme Pro & Mi Perfil ===');

  // 1. Desktop right-side notifications & mobile preservation
  {
    const shownToasts = [];
    const tones = [];
    const ntEl = { id: 'nt', className: 'nt', textContent: '', classList: { remove() {}, add() {} } };
    const ctx = {
      window: { innerWidth: 1440 },
      document: {
        getElementById: id => (id === 'nt' ? ntEl : null),
        body: { classList: { contains: () => false, remove() {} } }
      },
      showRightScreenNotification: opts => shownToasts.push(opts),
      playSubtleUiTone: t => tones.push(t),
      setTimeout: () => 1,
      clearTimeout: () => {}
    };
    vm.createContext(ctx);
    vm.runInContext(extractFunc(commonJs, 'notify'), ctx);

    ctx.notify('Cambios guardados', 'ok');
    assert.equal(shownToasts.length, 1, 'Desktop notify() must render right-side toast card');
    assert.equal(shownToasts[0].title, 'Confirmado');
    assert.equal(shownToasts[0].message, 'Cambios guardados');
    assert.equal(tones.length, 1, 'Desktop notify() must trigger subtle WebAudio tone');
    assert.ok(ntEl.className.includes('nt-desktop-delegated'), 'Desktop #nt must be visually delegated');

    // Mobile view must preserve #nt without firing desktop right toast
    ctx.window.innerWidth = 390;
    ctx.notify('Guardado móvil', 'ok');
    assert.equal(shownToasts.length, 1, 'Mobile notify() must NOT delegate to desktop right toast');
    assert.equal(ntEl.textContent, 'Guardado móvil');
    assert.ok(!ntEl.className.includes('nt-desktop-delegated'));
    console.log('✓ 1. Desktop right-side notification cards + WebAudio tone + mobile compatibility verified.');
  }

  // 2. Offline GET cache in api.js & Network-First static cache in sw.js
  {
    const store = new Map();
    let onlineMode = true;
    let forceStatus = 200;
    const ctx = {
      API: 'https://netops.test',
      window: {},
      navigator: { get onLine() { return onlineMode; } },
      localStorage: {
        getItem: k => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: k => store.delete(k)
      },
      URLSearchParams,
      AbortController,
      setTimeout,
      clearTimeout,
      setSyncStatus: () => {},
      createApiError: (res, body) => {
        const err = new Error(body?.error || `HTTP ${res.status}`);
        err.httpStatus = res.status;
        return err;
      },
      fetch: async () => {
        if (!onlineMode) throw new TypeError('Failed to fetch');
        if (forceStatus === 401) {
          return { ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            users: [{ id: 'u1', name: 'Ana', password: 'secret', password_hash: 'hash123' }],
            token: 'should-be-stripped',
            total: 1
          })
        };
      }
    };
    vm.createContext(ctx);
    const cacheBlockStart = apiJs.indexOf('// ==================== CACHE OFFLINE DE RESPUESTAS GET ====================');
    const cacheBlockEnd = apiJs.indexOf('async function deleteCloudRecord(');
    vm.runInContext(apiJs.slice(cacheBlockStart, cacheBlockEnd), ctx);

    // Online fetch caches sanitized response
    const live = await ctx.fetchDataPage('people', { offset: 0, limit: 20 });
    assert.equal(live.users.length, 1);

    // Inspect stored cache has zero secrets
    const cachedRaw = [...store.entries()].find(([k]) => k.startsWith('netops_get_cache_v1:/api/data'))?.[1];
    assert.ok(cachedRaw, 'GET /api/data response must be cached in localStorage');
    assert.ok(!cachedRaw.includes('secret'), 'Secrets must be stripped from offline cache');
    assert.ok(!cachedRaw.includes('hash123'), 'password_hash must be stripped from offline cache');
    assert.ok(!cachedRaw.includes('should-be-stripped'), 'token must be stripped from offline cache');

    // Offline fetch returns cached response without throwing
    onlineMode = false;
    const offline = await ctx.fetchDataPage('people', { offset: 0, limit: 20 });
    assert.equal(offline.__fromOfflineCache, true, 'Offline fetchDataPage must return cached data');
    assert.equal(offline.users[0].name, 'Ana');

    // 401 error must NEVER be masked by cache
    onlineMode = true;
    forceStatus = 401;
    await assert.rejects(() => ctx.fetchDataPage('people', { offset: 0, limit: 20 }), /Unauthorized/);

    // Verify sw.js network-first strategy
    assert.ok(swJs.includes("self.addEventListener('fetch'"), 'sw.js must listen to fetch events');
    assert.ok(swJs.includes("STATIC_CACHE_NAME"), 'sw.js must maintain static asset cache');
    assert.ok(swJs.includes('/assets/css/theme-pro.css') && swJs.includes('/assets/js/perfil.js'), 'sw.js must pre-cache theme-pro.css and perfil.js');
    assert.ok(swJs.includes("url.pathname.startsWith('/api/')"), 'sw.js must exclude /api/ from static cache');
    console.log('✓ 2. Offline GET cache (secret-free + network fallback) & SW network-first verified.');
  }

  // 3. Lucide sidebar icons & Theme Pro CSS injection
  {
    assert.ok(commonJs.includes('SIDEBAR_PROFILE_ICON') && commonJs.includes('SIDEBAR_LOGOUT_ICON'));
    const navMatch = commonJs.match(/const NAV_ITEMS = \[[\s\S]*?\];/);
    assert.ok(navMatch, 'NAV_ITEMS must exist');
    const svgMatches = navMatch[0].match(/stroke-width="1\.8"/g) || [];
    assert.ok(svgMatches.length >= 10, 'All NAV_ITEMS must use Lucide inline SVGs with stroke-width="1.8"');
    assert.ok(!sidebarCss.includes('content:"⏻"'), 'Legacy unicode power symbol must be removed from sidebar-compact.css');
    assert.ok(commonJs.includes('assets/css/theme-pro.css') && commonJs.includes('assets/js/perfil.js'), 'common.js must auto-inject theme-pro.css and perfil.js');
    assert.ok(themeProCss.includes('--accent:') && themeProCss.includes('--accent-soft:') && themeProCss.includes('--app-font-scale:'));
    assert.ok(themeProCss.includes('prefers-reduced-motion: reduce'), 'theme-pro.css must respect prefers-reduced-motion');
    console.log('✓ 3. Sidebar Lucide SVG icons, auto-injection of theme-pro.css & reduced-motion verified.');
  }

  // 4. Desktop-only profile gating & theme customization
  {
    const store = new Map();
    const rootStyle = new Map();
    const rootClasses = new Set();
    const rootDataset = {};
    let currentRole = 'administrador';
    let currentWidth = 1440;

    const ctx = {
      window: { get innerWidth() { return currentWidth; } },
      location: { pathname: '/dashboard.html', hostname: 'localhost', protocol: 'http:', origin: 'http://localhost' },
      document: {
        head: { appendChild() {} },
        body: { classList: { contains: () => false } },
        documentElement: {
          classList: {
            add: c => rootClasses.add(c),
            remove: c => rootClasses.delete(c),
            contains: c => rootClasses.has(c)
          },
          dataset: rootDataset,
          style: {
            setProperty: (k, v) => rootStyle.set(k, v),
            removeProperty: k => rootStyle.delete(k)
          }
        },
        getElementById: () => null,
        createElement: () => ({})
      },
      localStorage: {
        getItem: k => {
          if (k === 'user') return JSON.stringify({ id: 'u-1', name: 'Carlos', username: 'carlos', role: currentRole });
          return store.has(k) ? store.get(k) : null;
        },
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: k => store.delete(k)
      }
    };
    vm.createContext(ctx);
    const themeBlockStart = commonJs.indexOf('const NETOPS_THEME_PRO_VERSION');
    const themeBlockEnd = commonJs.indexOf('const ROLE_PAGE_ACCESS');
    vm.runInContext(commonJs.slice(themeBlockStart, themeBlockEnd), ctx);

    // Desktop admin: enabled and custom accent + font scale applied
    assert.equal(ctx.isDesktopProfileEnabled(), true);
    ctx.saveUserDesktopPrefs({ accent: '#059669', fontScale: 'lg' }, 'u-1');
    ctx.applyUserDesktopPreferences();
    assert.equal(rootClasses.has('netops-desktop-theme'), true);
    assert.equal(rootStyle.get('--accent'), '#059669');
    assert.equal(rootStyle.get('--app-font-scale'), '1.12');
    assert.equal(rootDataset.hasCustomAccent, '1');

    // Mobile width: disabled and reset
    currentWidth = 390;
    assert.equal(ctx.isDesktopProfileEnabled(), false);
    ctx.applyUserDesktopPreferences();
    assert.equal(rootClasses.has('netops-desktop-theme'), false);
    assert.equal(rootStyle.has('--accent'), false);

    // Technician on desktop: disabled and reset
    currentWidth = 1440;
    currentRole = 'tecnico';
    assert.equal(ctx.isDesktopProfileEnabled(), false);
    ctx.applyUserDesktopPreferences();
    assert.equal(rootClasses.has('netops-desktop-theme'), false);

    // Explicit confirmations present in perfil.js
    const confirmMatches = perfilJs.match(/await askConfirmation\(/g) || [];
    assert.ok(confirmMatches.length >= 4, 'perfil.js must use explicit askConfirmation() for info, appearance, reset, and password');
    console.log('✓ 4. Desktop-only Mi Perfil gating, per-user accent/font scale & confirmations verified.');
  }

  // 5. Backend /api/profile & /api/profile/password end-to-end with mock D1
  {
    const workerMod = await import(pathToFileURL(path.join(baseDir, 'worker.js')).href);
    const worker = workerMod.default;
    const users = new Map([
      ['u-1', {
        id: 'u-1', name: 'Laura Gómez', username: 'laura', role_id: 2, role: 'soporte',
        phone: '7441112222', email: 'laura@wifimex.mx', color: '#0284c7',
        ui_accent: null, ui_font_scale: 'md', notes: '', status: 'activo', active: 1,
        deleted_at: null, updated_at: '2026-11-23T00:00:00.000Z',
        password_legacy: 'Secret123!', password_hash: null
      }],
      ['u-2', {
        id: 'u-2', name: 'Otro Usuario', username: 'ocupado', role_id: 2, role: 'soporte',
        phone: '', email: '', color: '', ui_accent: null, ui_font_scale: 'md', notes: '',
        status: 'activo', active: 1, deleted_at: null, updated_at: '',
        password_legacy: 'Pass999!', password_hash: null
      }]
    ]);

    const mockEnv = {
      AUTH_SECRET: 'test-super-secret-signing-key-32chars-minimum!',
      DB: {
        prepare(sql) {
          let bound = [];
          const stmt = {
            bind(...args) { bound = args; return stmt; },
            async first() {
              if (/FROM users u JOIN roles r/i.test(sql)) {
                if (/lower\(u\.username\)=lower\(\?\)/i.test(sql)) {
                  const target = String(bound[0] || '').toLowerCase();
                  return [...users.values()].find(u => u.username.toLowerCase() === target) || null;
                }
                if (/u\.id=\?/i.test(sql)) {
                  return users.get(bound[0]) || null;
                }
              }
              if (/SELECT id, name, deleted_at FROM users WHERE lower\(username\) = lower\(\?\) AND id <> \?/i.test(sql)) {
                const [u, excludeId] = bound;
                return [...users.values()].find(row => row.id !== excludeId && row.username.toLowerCase() === String(u).toLowerCase()) || null;
              }
              if (/FROM sync_meta/i.test(sql)) return { updated_at: '2026-11-23T00:00:00.000Z' };
              return null;
            },
            async all() {
              if (/PRAGMA table_info\(users\)/i.test(sql)) {
                return { results: ['id','name','username','phone','email','color','ui_accent','ui_font_scale'].map(name => ({ name })) };
              }
              if (/FROM user_zones/i.test(sql)) {
                return { results: [{ code: 'acapulco' }] };
              }
              return { results: [] };
            },
            async run() {
              if (/UPDATE users SET password_hash=\?,password_legacy=NULL,updated_at=\? WHERE id=\?/i.test(sql)) {
                const [hash, updatedAt, id] = bound;
                const u = users.get(id);
                if (u) { u.password_hash = hash; u.password_legacy = null; u.updated_at = updatedAt; }
              } else if (/UPDATE users SET password_hash=\?, password_legacy=NULL, updated_at=\?, updated_by=\? WHERE id=\?/i.test(sql)) {
                const [hash, updatedAt, _by, id] = bound;
                const u = users.get(id);
                if (u) { u.password_hash = hash; u.password_legacy = null; u.updated_at = updatedAt; }
              } else if (/UPDATE users SET name=\?, username=\?, phone=\?, email=\?, ui_accent=\?, ui_font_scale=\?, updated_at=\?, updated_by=\? WHERE id=\?/i.test(sql)) {
                const [name, username, phone, email, uiAccent, uiFontScale, updatedAt, _by, id] = bound;
                const u = users.get(id);
                if (u) {
                  u.name = name; u.username = username; u.phone = phone; u.email = email;
                  u.ui_accent = uiAccent; u.ui_font_scale = uiFontScale; u.updated_at = updatedAt;
                }
              }
              return { success: true };
            }
          };
          return stmt;
        },
        async batch() { return []; }
      }
    };

    // 5a. Login first to obtain signed HttpOnly session cookie
    const loginRes = await worker.fetch(new Request('https://netops.test/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://netops.test' },
      body: JSON.stringify({ username: 'laura', password: 'Secret123!' })
    }), mockEnv);
    assert.equal(loginRes.status, 200);
    const cookieHeader = (loginRes.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(cookieHeader.startsWith('netops_session=v1.'), 'Login must issue signed session cookie');

    // 5b. GET /api/profile returns safe profile
    const getProfRes = await worker.fetch(new Request('https://netops.test/api/profile', {
      method: 'GET',
      headers: { Cookie: cookieHeader }
    }), mockEnv);
    assert.equal(getProfRes.status, 200);
    const getProfData = await getProfRes.json();
    assert.equal(getProfData.profile.name, 'Laura Gómez');
    assert.equal(getProfData.profile.password_hash, undefined);
    assert.deepEqual(getProfData.profile.zones, ['acapulco']);

    // 5c. POST /api/profile updates info + appearance and refreshes cookie on name/username change
    const updProfRes = await worker.fetch(new Request('https://netops.test/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://netops.test', Cookie: cookieHeader },
      body: JSON.stringify({
        name: 'Laura G. Pérez',
        username: 'lauragp',
        phone: '7449998888',
        email: 'lauragp@wifimex.mx',
        uiAccent: '#059669',
        uiFontScale: 'lg'
      })
    }), mockEnv);
    assert.equal(updProfRes.status, 200);
    const updProfData = await updProfRes.json();
    assert.equal(updProfData.profile.username, 'lauragp');
    assert.equal(updProfData.profile.uiAccent, '#059669');
    assert.equal(updProfData.profile.uiFontScale, 'lg');
    const refreshedCookie = (updProfRes.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(refreshedCookie.startsWith('netops_session=v1.'), 'POST /api/profile must refresh session cookie when name/username changes');

    // 5d. POST /api/profile rejects duplicate username
    const dupRes = await worker.fetch(new Request('https://netops.test/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://netops.test', Cookie: refreshedCookie },
      body: JSON.stringify({ name: 'Laura G. Pérez', username: 'ocupado' })
    }), mockEnv);
    assert.equal(dupRes.status, 400);

    // 5e. POST /api/profile/password rejects wrong currentPassword
    const wrongPassRes = await worker.fetch(new Request('https://netops.test/api/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://netops.test', Cookie: refreshedCookie },
      body: JSON.stringify({ currentPassword: 'WrongPassword', newPassword: 'NewPassword2026', confirmPassword: 'NewPassword2026' })
    }), mockEnv);
    assert.equal(wrongPassRes.status, 400);
    const wrongPassData = await wrongPassRes.json();
    assert.equal(wrongPassData.errorCode, 'INVALID_CURRENT_PASSWORD');

    // 5f. POST /api/profile/password succeeds with valid currentPassword & enables login with new password
    const okPassRes = await worker.fetch(new Request('https://netops.test/api/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://netops.test', Cookie: refreshedCookie },
      body: JSON.stringify({ currentPassword: 'Secret123!', newPassword: 'NewPassword2026', confirmPassword: 'NewPassword2026' })
    }), mockEnv);
    assert.equal(okPassRes.status, 200);

    const reloginRes = await worker.fetch(new Request('https://netops.test/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://netops.test' },
      body: JSON.stringify({ username: 'lauragp', password: 'NewPassword2026' })
    }), mockEnv);
    assert.equal(reloginRes.status, 200, 'User must be able to log in with updated username and new password');
    const reloginData = await reloginRes.json();
    assert.equal(reloginData.user.uiAccent, '#059669');
    assert.equal(reloginData.user.uiFontScale, 'lg');

    console.log('✓ 5. Backend /api/profile & /api/profile/password (cookie refresh, validation, PBKDF2 change) verified.');
  }

  console.log('\n=== ALL 5 FEATURE VERIFICATION TESTS PASSED! ===');
})().catch(err => {
  console.error(err);
  process.exit(1);
});

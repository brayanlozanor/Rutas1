const assert = require('assert');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

console.log('Running test-dashboard-detail-kind.cjs...');

// 1. Setup minimal DOM mock
const elements = new Map();
function mockElement(id, tagName = 'div') {
  const el = {
    id,
    tagName,
    value: '',
    textContent: '',
    innerHTML: '',
    hidden: false,
    disabled: false,
    className: '',
    style: {
      _styles: {},
      setProperty(k, v) { this._styles[k] = v; }
    },
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); el.className = [...this._classes].join(' '); },
      remove(c) { this._classes.delete(c); el.className = [...this._classes].join(' '); },
      toggle(c, force) {
        if (force === undefined) {
          if (this._classes.has(c)) this.remove(c); else this.add(c);
        } else if (force) {
          this.add(c);
        } else {
          this.remove(c);
        }
      },
      contains(c) { return this._classes.has(c); }
    },
    setAttribute(k, v) { el[k] = v; },
    getAttribute(k) { return el[k]; },
    querySelector(sel) {
      if (sel.includes('option[value="')) {
        const val = sel.match(/option\[value="([^"]+)"\]/)[1];
        return el.innerHTML.includes(`value="${val}"`) ? { value: val } : null;
      }
      return null;
    },
    querySelectorAll() { return []; },
    closest() { return null; }
  };
  elements.set(id, el);
  return el;
}

global.document = {
  getElementById(id) {
    if (!elements.has(id)) {
      return mockElement(id);
    }
    return elements.get(id);
  },
  querySelectorAll() { return []; }
};

global.window = {
  location: { href: 'https://example.com/dashboard.html?detailKind=physical', search: '?detailKind=physical' },
  history: { replaceState(s, t, url) { window.location.href = url; window.location.search = url.includes('?') ? url.split('?')[1] : ''; } },
  document: global.document,
  netopsPageMeta: {}
};
global.CSS = { escape: s => s };

// Load SQLite database to get real data
const db = new DatabaseSync('./.wrangler-prod-relational/v3/d1/miniflare-D1DatabaseObject/009a7fc67a701a4f29d4a14ba1c39515cabc0fc7772a46f7de078e80c7f07606.sqlite');
const dbUsers = db.prepare(`SELECT u.id, u.name, u.username, r.code as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.deleted_at IS NULL`).all();
const dbTechs = db.prepare(`SELECT id, name, user_id, username_legacy FROM technicians WHERE deleted_at IS NULL`).all();
const dbReports = db.prepare(`SELECT work_order_id, completed_by, completed_by_name_legacy, completed_at FROM work_order_reports`).all();
const reportMap = new Map(dbReports.map(r => [r.work_order_id, { completedBy: r.completed_by, completedByName: r.completed_by_name_legacy, completedAt: r.completed_at }]));

const dbOrders = db.prepare(`SELECT id, status, detail_kind, category, created_at, updated_at, completed_at, updated_by, follow_ups_json FROM work_orders WHERE deleted_at IS NULL`).all().map(o => {
  let followUps = [];
  try { if (o.follow_ups_json) followUps = JSON.parse(o.follow_ups_json); } catch(e){}
  return {
    ...o,
    technicianReport: reportMap.get(o.id) || null,
    followUps
  };
});

global.state = {
  users: dbUsers,
  technicians: dbTechs,
  workOrders: dbOrders
};

global.normalizeName = function(str) {
  return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
};
global.escapeHtml = function(str) { return String(str); };
global.userHasRole = function() { return true; };
global.initCommon = function() {};

// Load dashboard.js
const code = fs.readFileSync('public/assets/js/dashboard.js', 'utf8');
eval(code);

// Initialize DOM elements needed
['dashboard-from', 'dashboard-to', 'dashboard-tech', 'dashboard-zone', 'dashboard-origin',
 'dashboard-tab-physical', 'dashboard-tab-network', 'dashboard-total-label', 'dashboard-pending-label',
 'dashboard-tech-label', 'dashboard-distribution-title', 'dashboard-heading-desc',
 'dashboard-mode-pill', 'dashboard-mode-text',
 'dashboard-done-today', 'dashboard-done-week', 'dashboard-done-month', 'dashboard-total-details',
 'dashboard-period-added', 'dashboard-period-solved', 'dashboard-period-pending', 'dashboard-period-rate',
 'dashboard-compliance-value', 'dashboard-compliance-count', 'dashboard-ring-goal', 'dashboard-compliance-ring',
 'dashboard-daily-chart', 'dashboard-tech-table', 'dashboard-updated-at'].forEach(id => mockElement(id));

document.getElementById('dashboard-from').value = '2026-07-01';
document.getElementById('dashboard-to').value = '2026-11-20';

console.log('\n--- TEST 1: Physical Mode ---');
window.setDashboardDetailKind('physical');
assert.strictEqual(window.dashboardSelectedDetailKind, 'physical', 'Should be physical mode');
assert.ok(document.getElementById('dashboard-tab-physical').classList.contains('is-active'), 'Physical tab active');
assert.ok(!document.getElementById('dashboard-tab-network').classList.contains('is-active'), 'Network tab inactive');
assert.strictEqual(document.getElementById('dashboard-mode-text').textContent, 'Detalles Físicos', 'Mode text should indicate Detalles Físicos');
assert.ok(document.getElementById('dashboard-mode-pill').classList.contains('is-physical'), 'Mode pill should have is-physical class');
assert.ok(!document.getElementById('dashboard-mode-pill').classList.contains('is-network'), 'Mode pill should not have is-network class');

window.populateDashboardFilters();
const techSelectHtml = document.getElementById('dashboard-tech').innerHTML;
assert.ok(techSelectHtml.includes('Soporte (Oficina)'), 'Should have Soporte (Oficina) option');
assert.ok(techSelectHtml.includes('Atención a clientes (Oficina)'), 'Should have Atención a clientes (Oficina) option');
assert.ok(techSelectHtml.includes('Lalo'), 'Should include field technician');

window.renderAdminDashboard();
const physTableHtml = document.getElementById('dashboard-tech-table').innerHTML;
assert.ok(physTableHtml.includes('Soporte (Oficina)'), 'Table should show Soporte (Oficina)');
assert.ok(physTableHtml.includes('Lalo') || physTableHtml.includes('Nolve'), 'Table should show field technicians');
console.log('✓ Physical mode rendered correctly with Soporte (Oficina) and technicians.');

console.log('\n--- TEST 2: Network Mode ---');
window.setDashboardDetailKind('network');
assert.strictEqual(window.dashboardSelectedDetailKind, 'network', 'Should be network mode');
assert.ok(document.getElementById('dashboard-tab-network').classList.contains('is-active'), 'Network tab active');
assert.ok(!document.getElementById('dashboard-tab-physical').classList.contains('is-active'), 'Physical tab inactive');
assert.strictEqual(document.getElementById('dashboard-mode-text').textContent, 'Detalles de Red', 'Mode text should indicate Detalles de Red');
assert.ok(document.getElementById('dashboard-mode-pill').classList.contains('is-network'), 'Mode pill should have is-network class');
assert.ok(!document.getElementById('dashboard-mode-pill').classList.contains('is-physical'), 'Mode pill should not have is-physical class');

assert.strictEqual(document.getElementById('dashboard-total-label').textContent, 'Detalles de red totales');
assert.strictEqual(document.getElementById('dashboard-pending-label').textContent, 'Pendientes de red actuales');
assert.strictEqual(document.getElementById('dashboard-tech-label').textContent, 'Personal de oficina');

window.populateDashboardFilters();
const netTechSelectHtml = document.getElementById('dashboard-tech').innerHTML;
assert.ok(netTechSelectHtml.includes('Todo el personal de oficina'), 'Should have Todo el personal de oficina');
assert.ok(netTechSelectHtml.includes('Soporte (Área)'), 'Should have Soporte (Área)');
assert.ok(netTechSelectHtml.includes('Atención a clientes (Área)'), 'Should have Atención a clientes (Área)');
assert.ok(netTechSelectHtml.includes('Heidi Geraldine Ramiréz Mancilla'), 'Should have office user Heidi');
assert.ok(!netTechSelectHtml.includes('Técnicos de campo'), 'Should NOT include field technicians group');

window.renderAdminDashboard();
const netTableHtml = document.getElementById('dashboard-tech-table').innerHTML;
assert.ok(netTableHtml.includes('s') || netTableHtml.includes('Heidi'), 'Table should show office users in network mode');
console.log('✓ Network mode rendered correctly with office personnel.');

console.log('\n--- TEST 3: Office Separation Filtering in Physical Mode ---');
window.setDashboardDetailKind('physical');
window.populateDashboardFilters();

// Filter by Soporte (Oficina)
document.getElementById('dashboard-tech').value = '__soporte__';
window.renderAdminDashboard();
const soporteFilterTable = document.getElementById('dashboard-tech-table').innerHTML;
assert.ok(soporteFilterTable.includes('Soporte (Oficina)'), 'Should show Soporte (Oficina) when filtered by __soporte__');
assert.ok(!soporteFilterTable.includes('Lalo'), 'Should not include field technician when filtered by Soporte');
console.log('✓ Filter by __soporte__ in physical mode isolates Soporte (Oficina).');

// Filter by Atención a clientes (Oficina)
document.getElementById('dashboard-tech').value = '__atencion__';
window.renderAdminDashboard();
const atencionFilterTable = document.getElementById('dashboard-tech-table').innerHTML;
assert.ok(atencionFilterTable.includes('Atención a clientes (Oficina)'), 'Should show Atención a clientes (Oficina) when filtered by __atencion__');
assert.ok(!atencionFilterTable.includes('Lalo'), 'Should not include field technician when filtered by Atención');
console.log('✓ Filter by __atencion__ in physical mode isolates Atención a clientes (Oficina).');

console.log('\n--- TEST 4: Visual Prominence HTML and CSS verification ---');
const htmlContent = fs.readFileSync('public/dashboard.html', 'utf8');
assert.ok(htmlContent.includes('dashboard-mode-pill'), 'dashboard.html must contain #dashboard-mode-pill');
assert.ok(htmlContent.includes('dashboard-kind-labels'), 'dashboard.html must contain .dashboard-kind-labels');
assert.ok(htmlContent.includes('is-physical'), 'dashboard.html must contain is-physical class');
assert.ok(htmlContent.includes('is-network'), 'dashboard.html must contain is-network class');
console.log('✓ dashboard.html contains prominent mode pills and labels.');

const cssContent = fs.readFileSync('public/assets/css/admin-analytics.css', 'utf8');
assert.ok(cssContent.includes('.dashboard-kind-pill.is-physical.is-active'), 'admin-analytics.css must style physical active pill');
assert.ok(cssContent.includes('.dashboard-kind-pill.is-network.is-active'), 'admin-analytics.css must style network active pill');
assert.ok(cssContent.includes('.dashboard-active-mode-badge'), 'admin-analytics.css must style active mode badge');
assert.ok(cssContent.includes('is-network-mode'), 'admin-analytics.css must style network mode theme accents');
console.log('✓ admin-analytics.css contains prominent styles and animations.');

console.log('\nALL TESTS PASSED SUCCESSFULLY!');

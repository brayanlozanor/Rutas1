const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- TEST: Advanced Admin Statistical Summary (Areas, Charts & Individual Performance) ---');

const baseDir = path.resolve(__dirname, '..');
const ordenesJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/ordenes.js'), 'utf8');
const ordenesHtml = fs.readFileSync(path.join(baseDir, 'public/ordenes.html'), 'utf8');
const toggleCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/detail-view-toggle.css'), 'utf8');
const relationalStoreJs = fs.readFileSync(path.join(baseDir, 'relational-store.js'), 'utf8');

// 1. Verify HTML & CSS structure
assert(ordenesHtml.includes('Resumen Estadístico Avanzado de Red'), 'ordenes.html must have updated modal title');
assert(toggleCss.includes('.admin-stats-areas-grid'), 'detail-view-toggle.css must style .admin-stats-areas-grid');
assert(toggleCss.includes('.admin-stats-donut-svg'), 'detail-view-toggle.css must style .admin-stats-donut-svg');
assert(toggleCss.includes('.admin-stats-timeline-svg'), 'detail-view-toggle.css must style .admin-stats-timeline-svg');
assert(toggleCss.includes('.admin-stats-profiles-grid'), 'detail-view-toggle.css must style .admin-stats-profiles-grid');
assert(relationalStoreJs.includes("page?.adminStats === '1' ? 2000 : 100"), 'relational-store.js must support extended limit for adminStats');
console.log('✓ Item 1 Passed: HTML, CSS, and backend store support the advanced statistical dashboard.');

// 2. Execute openAdminNetworkStatsModal in VM sandbox with realistic dataset
const contentEl = { innerHTML: '' };
const modalEl = { classList: { contains: () => true, add: () => {} } };

const sandbox = {
  console,
  Math,
  Date,
  Map,
  Set,
  Array,
  Object,
  String,
  Number,
  Boolean,
  RegExp,
  JSON,
  encodeURIComponent,
  decodeURIComponent,
  URLSearchParams,
  setTimeout: () => {},
  clearTimeout: () => {},
  localStorage: { getItem: () => null, setItem: () => {} },
  location: { search: '', href: 'http://localhost/ordenes.html' },
  REGS: [{ id: 'Centro', n: 'Centro' }, { id: 'Montaña', n: 'Montaña' }],
  normalizeRole: r => {
    const v = String(r || '').trim().toLowerCase();
    if (v === 'admin' || v === 'administrador') return 'administrador';
    if (v === 'atencion' || v === 'atencion_clientes') return 'atencion_clientes';
    if (v === 'soporte') return 'soporte';
    return v;
  },
  normalizeName: s => String(s || '').trim().toLowerCase(),
  userHasRole: (...roles) => roles.includes('administrador') || roles.includes('admin'),
  getCurrentUser: () => ({ id: 'u-admin', name: 'Abraham Admin', role: 'administrador' }),
  OM: () => {},
  CM: () => {},
  state: {
    users: [
      { id: 'u-admin', name: 'Abraham Admin', username: 'abraham', role: 'administrador', active: true },
      { id: 'u-sop1', name: 'Carlos Soporte', username: 'carlos', role: 'soporte', active: true },
      { id: 'u-sop2', name: 'Miguel Red', username: 'miguel', role: 'soporte', active: true },
      { id: 'u-ate1', name: 'Ana Atención', username: 'ana', role: 'atencion_clientes', active: true },
      { id: 'u-tec1', name: 'Pedro Técnico Campo', username: 'pedro', role: 'tecnico', active: true }
    ],
    workOrders: [
      {
        id: 'wo-1',
        detailKind: 'network',
        status: 'completada',
        priority: 'muy_alta',
        category: 'sin_internet',
        region: 'Centro',
        town: 'Chilpancingo',
        originRole: 'atencion_clientes',
        targetRole: 'soporte',
        createdById: 'u-ate1',
        createdByName: 'Ana Atención',
        assignedUserId: 'u-sop1',
        assignedUserName: 'Carlos Soporte',
        createdAt: '2026-11-10T10:00:00.000Z',
        reviewOpenedAt: '2026-11-10T10:15:00.000Z',
        completedAt: '2026-11-10T11:30:00.000Z',
        technicianReport: {
          completedBy: 'u-sop1',
          completedByName: 'Carlos Soporte',
          completedAt: '2026-11-10T11:00:00.000Z',
          solution: 'Ajuste de cola en Mikrotik'
        },
        followUps: [
          { action: 'en_atencion', byId: 'u-sop1', byName: 'Carlos Soporte', at: '2026-11-10T10:15:00.000Z' },
          { action: 'resuelto_soporte', byId: 'u-sop1', byName: 'Carlos Soporte', at: '2026-11-10T11:00:00.000Z' },
          { action: 'completada', byId: 'u-ate1', byName: 'Ana Atención', at: '2026-11-10T11:30:00.000Z' }
        ]
      },
      {
        id: 'wo-2',
        detailKind: 'network',
        status: 'en_revision',
        priority: 'alta',
        category: 'intermitencia',
        region: 'Montaña',
        town: 'Tlapa',
        originRole: 'soporte',
        targetRole: 'atencion_clientes',
        createdById: 'u-sop2',
        createdByName: 'Miguel Red',
        assignedUserId: 'u-ate1',
        assignedUserName: 'Ana Atención',
        reviewOpenedById: 'u-ate1',
        reviewOpenedByName: 'Ana Atención',
        createdAt: '2026-11-11T08:00:00.000Z',
        reviewOpenedAt: '2026-11-11T08:20:00.000Z',
        followUps: [
          { action: 'en_atencion', byId: 'u-ate1', byName: 'Ana Atención', at: '2026-11-11T08:20:00.000Z' }
        ]
      },
      {
        id: 'wo-3',
        detailKind: 'network',
        status: 'devuelto_soporte',
        priority: 'media',
        category: 'lentitud',
        region: 'Centro',
        town: 'Zumpango',
        originRole: 'atencion_clientes',
        targetRole: 'soporte',
        createdById: 'u-ate1',
        createdByName: 'Ana Atención',
        assignedUserId: 'u-sop2',
        assignedUserName: 'Miguel Red',
        createdAt: '2026-11-11T09:00:00.000Z',
        returnAt: '2026-11-11T10:00:00.000Z',
        followUps: [
          { action: 'devuelto_soporte', byId: 'u-ate1', byName: 'Ana Atención', at: '2026-11-11T10:00:00.000Z' }
        ]
      }
    ]
  },
  document: {
    body: { dataset: {} },
    getElementById: id => {
      if (id === 'admin-network-stats-content') return contentEl;
      if (id === 'admin-network-stats-mo') return modalEl;
      return null;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(ordenesJs, sandbox);

sandbox.openAdminNetworkStatsModal();
const html = contentEl.innerHTML;

assert(html.includes('Desempeño y Productividad por Área Operativa'), 'Must render area performance section');
assert(html.includes('Soporte Técnico') && html.includes('Atención a Clientes') && html.includes('Administración'), 'Must render all 3 operational areas');
assert(html.includes('admin-stats-donut-svg'), 'Must render SVG donut chart');
assert(html.includes('admin-stats-timeline-svg'), 'Must render SVG daily timeline chart');
assert(html.includes('Comparativa de Volumen y Resolución por Área'), 'Must render comparative area chart');
assert(html.includes('Flujo Inter-Áreas y Cumplimiento por Prioridad'), 'Must render inter-area workflow & priority breakdown');
assert(html.includes('Rendimiento de resolución por usuario'), 'Must render user resolution performance table');
assert(html.includes('Radiografía Individual de Desempeño por Integrante'), 'Must render individual staff profile cards');
assert(html.includes('Localidades con Mayor Incidencia'), 'Must render top towns incidence breakdown');
assert(html.includes('Carlos Soporte') && html.includes('Miguel Red') && html.includes('Ana Atención') && html.includes('Abraham Admin'), 'Must include all authorized staff members');
assert(!html.includes('Pedro Técnico Campo'), 'Must strictly exclude field technicians from network admin stats');
console.log('✓ Item 2 Passed: All charts, area cards, individual profiles, and strict role exclusions verified.');

// 3. Test interactive filtering by area
sandbox.setAdminStatsFilter('area', 'atencion_clientes');
const filteredHtml = contentEl.innerHTML;
assert(filteredHtml.includes('Ana Atención'), 'Filtered view for Atención must show Ana Atención');
assert(!filteredHtml.includes('<td><span class="admin-stats-role-pill is-soporte">Soporte Técnico</span></td>'), 'Filtered view for Atención must hide Soporte rows in table');
console.log('✓ Item 3 Passed: Interactive filtering by area updates table and cards dynamically.');

console.log('--- ALL ADVANCED ADMIN STATISTICAL SUMMARY TESTS PASSED! ---');

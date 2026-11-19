const fs = require('fs');
const path = require('path');

const elements = new Map();
function createMockElement(tag, id = '', className = '') {
  return {
    tagName: tag.toUpperCase(),
    id,
    className,
    style: { setProperty() {}, removeProperty() {} },
    dataset: {},
    children: [],
    attributes: {},
    _innerHTML: '',
    get innerHTML() { return this._innerHTML; },
    set innerHTML(val) { this._innerHTML = val; },
    textContent: '',
    value: '',
    scrollTop: 0,
    scrollLeft: 0,
    classList: {
      _classes: new Set(className ? className.split(/\s+/).filter(Boolean) : []),
      add(...cls) { cls.forEach(c => this._classes.add(c)); },
      remove(...cls) { cls.forEach(c => this._classes.delete(c)); },
      toggle(c, force) {
        if (force === undefined) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        } else if (force) this._classes.add(c);
        else this._classes.delete(c);
      },
      contains(c) { return this._classes.has(c); }
    },
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return this.attributes[k] !== undefined ? this.attributes[k] : null; },
    removeAttribute(k) { delete this.attributes[k]; },
    querySelector(sel) {
      if (sel.startsWith('#')) return elements.get(sel.slice(1)) || null;
      return null;
    },
    querySelectorAll() { return []; },
    closest() { return this; },
    addEventListener() {},
    removeEventListener() {},
    appendChild(child) { this.children.push(child); return child; },
    insertBefore(child) { this.children.push(child); return child; },
    remove() {},
    insertAdjacentHTML(pos, html) { this._innerHTML += html; }
  };
}

const html = fs.readFileSync(path.join(__dirname, '../public/ordenes.html'), 'utf8');
const idMatches = [...html.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
idMatches.forEach(id => {
  elements.set(id, createMockElement('div', id));
});

global.window = global;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};
global.window.setInterval = () => 123;
global.window.clearInterval = () => {};
global.window.setTimeout = setTimeout;
global.window.clearTimeout = clearTimeout;
global.window.requestAnimationFrame = fn => setTimeout(fn, 16);
global.window.cancelAnimationFrame = id => clearTimeout(id);
global.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

global.document = {
  body: createMockElement('body', 'body', 'orders-page'),
  documentElement: createMockElement('html'),
  getElementById(id) {
    if (!elements.has(id)) {
      elements.set(id, createMockElement('div', id));
    }
    return elements.get(id);
  },
  createElement(tag) { return createMockElement(tag); },
  querySelector(sel) {
    if (sel.startsWith('#')) return this.getElementById(sel.slice(1));
    return createMockElement('div');
  },
  querySelectorAll() { return []; },
  addEventListener() {},
  removeEventListener() {}
};

global.location = {
  search: '?detailKind=physical',
  href: 'http://localhost/ordenes.html?detailKind=physical',
  pathname: '/ordenes.html',
  origin: 'http://localhost',
  hostname: 'localhost'
};

global.localStorage = {
  _data: {
    user: JSON.stringify({ id: 'u1', name: 'Abraham', username: 'abraham', role: 'administrador' }),
    token: 'fake-token'
  },
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; }
};
global.sessionStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; }
};

global.navigator = { onLine: true };

// Load files
const apiJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/api.js'), 'utf8');
eval(apiJs);
const commonJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/common.js'), 'utf8');
eval(commonJs);
const ordenesJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/ordenes.js'), 'utf8');
eval(ordenesJs);

console.log('Testing renderWOs with various test cases...');

const sampleOrders = [
  // 1. Basic physical order
  { id: 'wo-phys-1', detailKind: 'physical', clientName: 'Carlos Slim', status: 'pendiente', priority: 'alta', category: 'instalacion', town: 'Pueblo Viejo' },
  // 2. Physical order with no client or town
  { id: 'wo-phys-2', detailKind: 'physical', status: 'completada' },
  // 3. Physical order with equipment and node
  { id: 'wo-phys-3', detailKind: 'physical', equipmentName: 'Torre Central', nodeName: 'Nodo 1', status: 'no_realizado' },
  // 4. Network order basic
  { id: 'wo-net-1', detailKind: 'network', clientName: 'Maria Lopez', status: 'pendiente', priority: 'muy_alta', category: 'sin_servicio_red', assignedUserName: 'Juan Soporte' },
  // 5. Network order resolved
  { id: 'wo-net-2', detailKind: 'network', clientName: 'Pedro Sanchez', status: 'resuelto_soporte', priority: 'media', category: 'cambio_password_red', assignedUserId: 'u1' },
  // 6. Network order with missing fields
  { id: 'wo-net-3', detailKind: 'network', status: 'devuelto_soporte' },
  // 7. Order with empty category and status
  { id: 'wo-empty', detailKind: 'physical', status: '', category: '' },
  // 8. Order with undefined detailKind
  { id: 'wo-undef-kind', clientName: 'Test', status: 'pendiente' }
];

state.workOrders = sampleOrders;

// Test 1: renderWOs for physical
console.log('--- TEST 1: activeOrderDetailKind = physical ---');
activeOrderDetailKind = 'physical';
window.activeOrderDetailKind = 'physical';
try {
  renderWOs();
  const table = document.getElementById('orders-table');
  console.log('✓ Physical rendered successfully! Length:', table.innerHTML.length);
} catch (e) {
  console.error('✗ Physical render FAILED:', e);
}

// Test 2: renderWOs for network
console.log('--- TEST 2: activeOrderDetailKind = network ---');
activeOrderDetailKind = 'network';
window.activeOrderDetailKind = 'network';
try {
  renderWOs();
  const table = document.getElementById('orders-table');
  console.log('✓ Network rendered successfully! Length:', table.innerHTML.length);
} catch (e) {
  console.error('✗ Network render FAILED:', e);
}

// Test 3: empty orders
console.log('--- TEST 3: empty workOrders ---');
state.workOrders = [];
try {
  renderWOs();
  const table = document.getElementById('orders-table');
  console.log('✓ Empty rendered successfully! Length:', table.innerHTML.length);
} catch (e) {
  console.error('✗ Empty render FAILED:', e);
}

console.log('All tests completed.');

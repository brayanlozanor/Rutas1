const fs = require('fs');
const path = require('path');

const elements = new Map();
function createMockElement(tag, id = '', className = '') {
  const el = {
    tagName: tag.toUpperCase(),
    id,
    className,
    style: {
      _styles: {},
      setProperty(k, v) { this._styles[k] = v; },
      removeProperty(k) { delete this._styles[k]; },
      get display() { return this._styles['display']; },
      set display(v) { this._styles['display'] = v; }
    },
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
      if (sel.startsWith('.')) {
        for (const child of elements.values()) {
          if (child.classList.contains(sel.slice(1))) return child;
        }
      }
      return createMockElement('div');
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
  return el;
}

const html = fs.readFileSync(path.join(__dirname, '../public/ordenes.html'), 'utf8');
const idMatches = [...html.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
idMatches.forEach(id => {
  elements.set(id, createMockElement('div', id));
});

const nativeSetTimeout = setTimeout;
const nativeClearTimeout = clearTimeout;
global.window = global;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};
global.window.setInterval = () => 123;
global.window.clearInterval = () => {};
global.window.setTimeout = (fn, ms) => nativeSetTimeout(fn, ms || 1);
global.window.clearTimeout = (id) => nativeClearTimeout(id);
global.window.requestAnimationFrame = fn => setTimeout(fn, 1);
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

global.fetch = async () => ({
  ok: true,
  json: async () => ({ workOrders: [], total: 0, stats: { total: 0, pending: 0, critical: 0, done: 0 } })
});

global.sessionStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; }
};

try {
  const apiCode = fs.readFileSync(path.join(__dirname, '../public/assets/js/api.js'), 'utf8');
  eval(apiCode);
  console.log('✓ api.js loaded');
  const commonCode = fs.readFileSync(path.join(__dirname, '../public/assets/js/common.js'), 'utf8');
  eval(commonCode);
  console.log('✓ common.js loaded');
  const ordenesCode = fs.readFileSync(path.join(__dirname, '../public/assets/js/ordenes.js'), 'utf8');
  eval(ordenesCode);
  console.log('✓ ordenes.js loaded');

  console.log('Calling initOrdenesPage()...');
  initOrdenesPage();
  console.log('✓ initOrdenesPage executed without error');
} catch (e) {
  console.error('CRASH in test:', e);
}

// Carga los scripts de planificar en un contexto VM con DOM simulado y verifica que
// cada handler inline sea realmente accesible globalmente (no atrapado en un closure).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '../public');
const files = ['assets/js/api.js', 'assets/js/common.js', 'assets/js/preset-routes.js', 'assets/js/planificar.js'];

const any = () => new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => '' : k === 'length' ? 0 : k === 'then' ? undefined : any()),
  apply: () => any(),
  construct: () => any(),
  set: () => true,
});
const el = () => any();
const storage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() }; };
const document = any();
const ctx = {
  console: { log() {}, warn() {}, error() {}, info() {} },
  document, navigator: { userAgent: 'test', clipboard: {}, serviceWorker: undefined },
  location: { href: 'http://x/planificar.html', pathname: '/planificar.html', hostname: 'x', host: 'x', protocol: 'http:', reload() {}, replace() {}, assign() {}, search: '', origin: 'http://x', hash: '' },
  localStorage: storage(), sessionStorage: storage(),
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0,
  fetch: () => new Promise(() => {}), L: any(), Notification: undefined,
  matchMedia: () => ({ matches: true, addEventListener() {}, addListener() {} }),
  addEventListener() {}, removeEventListener() {}, getComputedStyle: () => any(),
  URL, URLSearchParams, Intl, Date, Math, JSON, Promise, Map, Set, Array, Object, String, Number, Boolean, RegExp, Error, Symbol, Proxy, Reflect, encodeURIComponent, decodeURIComponent, parseFloat, parseInt, isNaN,
  HTMLElement: function () {}, Event: function () {}, CustomEvent: function () {}, Image: function () {}, FileReader: function () {}, Blob: function () {}, File: function () {}, atob: s => s, btoa: s => s,
};
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
const loadErrors = [];
for (const f of files) {
  try { vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); }
  catch (e) { loadErrors.push(`${f}: ${e.stack.split("\n").slice(0,3).join(" | ")}`); }
}
const texts = [fs.readFileSync(path.join(root, 'planificar.html'), 'utf8'), ...files.map(f => fs.readFileSync(path.join(root, f), 'utf8'))];
const names = new Set();
const skip = new Set(['event', 'if', 'return', 'setTimeout', 'confirm', 'alert', 'Number', 'String', 'parseInt', 'encodeURIComponent', 'typeof', 'function', 'void', 'await', 'new']);
for (const t of texts) for (const m of t.matchAll(/on(?:click|change|input|submit|keydown|keyup|blur|focus)\s*=\s*\\?["']([^"']+)["']/g)) {
  for (const c of m[1].matchAll(/(?:^|[;\s(!&|?:,])([A-Za-z_$][\w$]*)\s*\(/g)) {
    const before = m[1].slice(0, c.index + c[0].indexOf(c[1]));
    if (/\.\s*$/.test(before) || skip.has(c[1])) continue;
    names.add(c[1]);
  }
}
const missing = [...names].filter(n => vm.runInContext(`typeof ${n}`, ctx) !== 'function');
if (loadErrors.length) console.log('Errores de carga (pueden ser por el DOM simulado):\n  ' + loadErrors.join('\n  '));
if (missing.length) { console.log('NO GLOBALES:', missing.join(', ')); process.exit(1); }
console.log(`OK: ${names.size} handlers inline accesibles globalmente.`);




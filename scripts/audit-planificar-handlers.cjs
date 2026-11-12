// Audita que todos los handlers inline (onclick/onchange/oninput...) usados en planificar
// apunten a funciones definidas globalmente en los scripts cargados por planificar.html.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../public');
const files = ['assets/js/api.js', 'assets/js/common.js', 'assets/js/preset-routes.js', 'assets/js/planificar.js'];
const html = fs.readFileSync(path.join(root, 'planificar.html'), 'utf8');
const sources = files.map(f => fs.readFileSync(path.join(root, f), 'utf8'));
const all = sources.join('\n');

const defined = new Set();
for (const m of all.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) defined.add(m[1]);
for (const m of all.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) defined.add(m[1]);
for (const m of all.matchAll(/(?:root|globalThis)\.([A-Za-z_$][\w$]*)\s*=/g)) defined.add(m[1]);
for (const m of all.matchAll(/(?:^|\n)(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) defined.add(m[1]);

const builtins = new Set(['event', 'this', 'if', 'return', 'document', 'window', 'setTimeout', 'alert', 'confirm', 'Number', 'String', 'parseInt', 'encodeURIComponent', 'location', 'history', 'navigator', 'console', 'Math', 'Date', 'JSON', 'Array', 'Object', 'Boolean', 'typeof', 'new', 'function', 'void', 'await', 'async']);
const missing = new Map();
const scan = (text, label) => {
  for (const m of text.matchAll(/on(?:click|change|input|submit|keydown|keyup|blur|focus)\s*=\s*\\?["']([^"']+)["']/g)) {
    const code = m[1];
    for (const c of code.matchAll(/(?:^|[;\s(!&|?:,])([A-Za-z_$][\w$]*)\s*\(/g)) {
      const name = c[1];
      if (builtins.has(name)) continue;
      const before = code.slice(0, c.index + c[0].indexOf(name));
      if (/\.\s*$/.test(before)) continue; // method call
      if (!defined.has(name)) {
        if (!missing.has(name)) missing.set(name, new Set());
        missing.get(name).add(label);
      }
    }
  }
};
scan(html, 'planificar.html');
files.forEach((f, i) => scan(sources[i], f));
if (!missing.size) { console.log('OK: todos los handlers inline existen.'); process.exit(0); }
for (const [k, v] of missing) console.log('FALTA:', k, '->', [...v].join(', '));
process.exit(1);


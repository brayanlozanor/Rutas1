const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.join(__dirname, '..', '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject', '009a7fc67a701a4f29d4a14ba1c39515cabc0fc7772a46f7de078e80c7f07606.sqlite');
const db = new DatabaseSync(dbPath, { readOnly: true });

const allNodes = db.prepare("SELECT id, town, node_code, lat, lng FROM nodes WHERE deleted_at IS NULL").all();
const allEq = db.prepare("SELECT id, name, lat, lng FROM equipment WHERE deleted_at IS NULL").all();

const presetRoutesCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'js', 'preset-routes.js'), 'utf8');

const ctx = {
  window: {
    state: {
      nodes: allNodes,
      equipment: allEq
    }
  },
  console: console,
  document: { addEventListener: () => {} }
};
vm.createContext(ctx);
vm.runInContext(presetRoutesCode, ctx);

function clean(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

const routes = ctx.window.getAllPresetRoutes ? ctx.window.getAllPresetRoutes() : ctx.window.PRESET_ROUTES_DATA;

const allStops = new Set();
routes.forEach(r => {
  (r.stops || []).forEach(s => allStops.add(s));
  (r.continuations || []).forEach(c => (c.stops || []).forEach(s => allStops.add(s)));
});

console.log(`Total unique stops across all preset routes: ${allStops.size}`);

const matched = [];
const unmatched = [];

for (const s of allStops) {
  const res = ctx.window.findSystemLocationMatch(s);
  if (res) {
    matched.push({ stop: s, match: res });
  } else {
    unmatched.push(s);
  }
}

console.log(`Currently matched: ${matched.length}`);
console.log(`Currently unmatched: ${unmatched.length}`);
console.log('Unmatched list:', unmatched);

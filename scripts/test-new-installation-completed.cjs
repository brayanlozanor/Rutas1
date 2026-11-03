const assert = require('node:assert/strict');
const fs = require('node:fs');

const planning = fs.readFileSync('public/assets/js/planificar.js', 'utf8');
const orders = fs.readFileSync('public/assets/js/ordenes.js', 'utf8');
const dashboard = fs.readFileSync('public/assets/js/dashboard.js', 'utf8');
const store = fs.readFileSync('relational-store.js', 'utf8');

assert.match(planning, /status:\s*'completada',[\s\S]*?completedAt:\s*createdAt/);
assert.match(planning, /nodeCode:\s*isDetail \? \(selectedNode\?\.nodeCode \|\| ''\) : \(installationNode\?\.nodeCode/);
assert.match(orders, /getOrderCategory\(order\) === 'instalacion' \? 'Completado' : 'Solucionado'/);
assert.match(orders, /node\?\.town \|\| order\.town \|\| order\.nodeName/);
assert.match(orders, /includeMapCatalog:\(state\.nodes \|\| \[\]\)\.length \? '' : '1'/);
assert.match(dashboard, /DASHBOARD_PHYSICAL_EXCLUDED_CATEGORIES\.has\(category\)/);
assert.match(store, /status:isInstallation\?'completada':row\.status/);
assert.match(store, /const status=isInstallation\?'completada':text\(rec\.status\)/);
assert.match(store, /SELECT id,node_code,town FROM nodes WHERE deleted_at IS NULL/);

(async () => {
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(store).toString('base64')}`;
  const { loadStatePart } = await import(moduleUrl);
  const env = {
    DB: {
      prepare(sql) {
        return {
          bind() { return this; },
          async all() {
            if (/SELECT id,node_code,town FROM nodes/i.test(sql)) {
              return { results: [{ id:'node-las-cruces', node_code:'R17', town:'LAS CRUCES' }] };
            }
            if (/SELECT w\.\*,z\.code AS zone_code/i.test(sql)) {
              return { results: [{ id:'wo-install', title:'Nueva instalacion', category:'instalacion', detail_kind:'physical', status:'pendiente', created_at:'2026-09-01T12:00:00.000Z' }] };
            }
            return { results: [] };
          },
          async first() {
            if (/SUM\(CASE/i.test(sql)) return { total:0, pending:0, critical:0, done:0 };
            if (/COUNT\(\*\) AS total/i.test(sql)) return { total:1 };
            return null;
          },
          async run() { return { success:true }; }
        };
      }
    }
  };
  const result = await loadStatePart(env,'operations',{windowed:'1',limit:'20',offset:'0',detailKind:'physical',includeMapCatalog:'1'});
  assert.equal(result.workOrders[0].status,'completada');
  assert.equal(result.workOrders[0].completedAt,'2026-09-01T12:00:00.000Z');
  assert.deepEqual(result.nodes,[{id:'node-las-cruces',nodeCode:'R17',town:'LAS CRUCES'}]);
  console.log('Nueva instalacion: estado completado y exclusion de estadisticas verificados.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

const fs = require('node:fs');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');

(async () => {
  const source = fs.readFileSync('relational-store.js', 'utf8');
  const { loadStatePart } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync('schema-relational-v3.sql', 'utf8'));
  db.exec(`
    INSERT INTO equipment(id,name,lat,lng) VALUES('antenna','Antena',17,-99),('unlocated','Sin ubicacion',NULL,NULL);
    INSERT INTO equipment(id,name,deleted_at) VALUES('deleted','Eliminada','2026-11-06');
    INSERT INTO nodes(id,node_code,town,lat,lng) VALUES('town','R1','Pueblo',17.1,-99.1);
    INSERT INTO equipment_nodes(equipment_id,node_id,position) VALUES('antenna','town',0);
    INSERT INTO work_orders(id,title,status,category,equipment_id,created_at) VALUES('open','Open','pendiente','falla','antenna','2026-11-06');
    INSERT INTO work_orders(id,title,status,category,equipment_id,node_id,created_at) VALUES('resolved','Resolved','resuelto_soporte','falla','antenna','town','2026-11-06');
    INSERT INTO work_orders(id,title,status,category,equipment_id,created_at) VALUES('installation','Installation','completada','instalacion','antenna','2026-11-06');
    INSERT INTO plans(id,name,scope_type,scope_key,day_key) VALUES('plan','Plan','week','2026-W45','lunes');
    INSERT INTO plan_stops(id,plan_id,position) VALUES('stop','plan',0);
    INSERT INTO plan_stop_orders(plan_stop_id,work_order_id,position) VALUES('stop','open',0);
  `);
  const sqlCalls = [];
  const env = { DB: {
    prepare(sql) {
      sqlCalls.push(sql);
      return {
        binds: [], bind(...values) { this.binds = values; return this; },
        async all() { return { results: db.prepare(sql).all(...this.binds) }; },
        async first() { return db.prepare(sql).get(...this.binds) || null; },
        async run() { return db.prepare(sql).run(...this.binds); }
      };
    }
  } };
  const data = await loadStatePart(env, 'map');
  assert.deepEqual(data.equipment.map(row => row.id).sort(), ['antenna', 'unlocated']);
  assert.equal(data.nodes[0].id, 'town');
  assert.deepEqual(data.equipment.find(row => row.id === 'antenna').linkedNodeIds, ['town']);
  assert.equal(data.workOrders.find(row => row.id === 'open').isPlanned, true);
  assert.equal(data.workOrders.find(row => row.id === 'resolved').nodeId, 'town');
  assert.equal(data.workOrders.find(row => row.id === 'installation').status, 'completada');
  assert(!sqlCalls.some(sql => /FROM (work_order_reports|work_order_evidence|audit_log)/i.test(sql)), 'El mapa no debe cargar reportes, evidencias ni historial');
  assert(sqlCalls.length < 10, 'El mapa debe resolver los datos sin consultas por cada entidad');
  db.close();
  console.log('PASS: map overview preserves sites, links, priorities and planned status without loading report history.');
})().catch(error => { console.error(error); process.exitCode = 1; });

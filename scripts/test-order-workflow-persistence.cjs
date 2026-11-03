const fs = require('fs');

(async () => {
  const source = fs.readFileSync('relational-store.js','utf8');
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  const { upsertRecord } = await import(moduleUrl);
  const calls = [];
  const columns = ['client_phone','detail_kind','review_opened_at','review_opened_by','reviewed_at','last_resent_at','follow_ups_json','source_order_id'];
  const env = {
    DB: {
      prepare(sql) {
        const call = {sql,binds:[]};
        calls.push(call);
        return {
          bind(...binds) { call.binds = binds; return this; },
          async all() {
            return {results:/PRAGMA table_info\(work_orders\)/i.test(sql) ? columns.map(name => ({name})) : []};
          },
          async first() { return null; },
          async run() {
            const expected = (sql.match(/\?/g) || []).length;
            if (expected !== call.binds.length) throw new Error(`SQL esperaba ${expected} valores y recibió ${call.binds.length}`);
            return {success:true};
          }
        };
      },
      async batch() { return []; }
    }
  };
  const createdAt = '2026-08-20T12:00:00.000Z';
  const lastResentAt = '2026-08-28T12:00:00.000Z';
  const reviewOpenedAt = '2026-08-28T11:45:00.000Z';
  await upsertRecord(env,'workOrders',{
    id:'wo-flow',title:'Intermitencia',detailKind:'network',category:'intermitencia',status:'pendiente',priority:'alta',visitType:'comunidad',
    createdAt,lastResentAt,reviewOpenedAt,reviewOpenedById:'admin-1',reviewedAt:'',sourceOrderId:'wo-original',followUps:[{action:'resent',note:'Continúa igual'}]
  });
  const insert = calls.find(call => /INSERT INTO work_orders\(/i.test(call.sql));
  if (!insert) throw new Error('No se ejecutó el guardado de la orden');
  if (!insert.sql.includes('created_at=COALESCE(work_orders.created_at,excluded.created_at)')) throw new Error('La fecha original podría sobrescribirse');
  if (insert.binds[4] !== reviewOpenedAt || insert.binds[5] !== 'admin-1') throw new Error('No se persistió la primera apertura');
  if (insert.binds[7] !== lastResentAt || insert.binds[9] !== 'wo-original') throw new Error('No se persistió el seguimiento');
  if (!JSON.parse(insert.binds[8])[0]?.note) throw new Error('No se persistió la nota nueva');
  if (insert.binds[28] !== createdAt) throw new Error('La fecha de creación cambió de posición o valor');
  console.log('Order workflow persistence and immutable creation date: OK');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

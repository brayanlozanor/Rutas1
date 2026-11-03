const fs = require('fs');

(async () => {
  const source = fs.readFileSync('relational-store.js','utf8');
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  const { loadStatePart } = await import(moduleUrl);
  const calls = [];
  const env = {
    DB: {
      prepare(sql) {
        const call = {sql,binds:[]};
        calls.push(call);
        return {
          bind(...binds) {
            call.binds = binds;
            return this;
          },
          async all() {
            if (/PRAGMA table_info\(work_orders\)/i.test(sql)) return {results:[{name:'client_phone'},{name:'detail_kind'}]};
            if (/SELECT w\.\*,z\.code AS zone_code/i.test(sql)) return {results:[{
              id:'wo-1',title:'Revision',client_name:'Maria',priority:'alta',visit_type:'comunidad',status:'pendiente',created_at:'2026-08-26',zone_code:'acapulco'
            }]};
            return {results:[]};
          },
          async first() {
            if (/SUM\(CASE/i.test(sql)) return {total:40,pending:25,critical:8,done:15};
            if (/COUNT\(\*\) AS total/i.test(sql)) return {total:1};
            return null;
          },
          async run() {
            return {success:true};
          }
        };
      }
    }
  };

  const result = await loadStatePart(env,'operations',{
    paged:'1',windowed:'1',limit:'20',offset:'20',q:'maria',status:'pendiente',priority:'alta',detailKind:'physical',sort:'newest'
  });
  const main = calls.find(call => /SELECT w\.\*,z\.code AS zone_code/i.test(call.sql));
  if (!main) throw new Error('No se ejecuto la consulta de ordenes');
  for (const expected of ['w.deleted_at IS NULL','lower(COALESCE(w.client_name','w.status IN (?)','w.priority IN (?)',"COALESCE(w.detail_kind,'physical')=?",'LIMIT ? OFFSET ?']) {
    if (!main.sql.includes(expected)) throw new Error(`Falta filtro SQL: ${expected}`);
  }
  if (main.binds.at(-2) !== 20 || main.binds.at(-1) !== 20) throw new Error(`Paginacion incorrecta: ${main.binds.join(',')}`);
  const stats = calls.find(call => /SUM\(CASE/i.test(call.sql));
  if (!stats?.sql.includes('NOT IN') || !stats.binds.includes('instalacion') || !stats.binds.includes('reubicacion_antena') || !stats.binds.includes('resurtir_antena') || !stats.binds.includes('solicitud_respaldo')) throw new Error('Los indicadores físicos deben excluir categorías administrativas');
  if (result.workOrders.length !== 1 || result.workOrders[0].detailKind !== 'physical' || result.total !== 1 || result.stats.total !== 40) throw new Error('Respuesta paginada o clasificacion fisica incorrecta');
  console.log('Order server pagination, search, filters and stats: OK');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

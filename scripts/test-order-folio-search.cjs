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
          bind(...binds) { call.binds=binds; return this; },
          async all() {
            if (/SELECT id,category FROM work_orders/i.test(sql)) {
              return {results:[{id:'womsrpmist9b1',category:'otro'},{id:'wo-otro',category:'otro'}]};
            }
            if (/SELECT w\.\*,z\.code AS zone_code/i.test(sql)) {
              return {results:[{id:'womsrpmist9b1',title:'Detalle fisico',category:'otro',detail_kind:'physical',priority:'baja',visit_type:'comunidad',status:'pendiente',created_at:'2026-08-13'}]};
            }
            return {results:[]};
          },
          async first() {
            if (/SUM\(CASE/i.test(sql)) return {total:1,pending:1,critical:0,done:0};
            if (/COUNT\(\*\) AS total/i.test(sql)) return {total:1};
            return null;
          },
          async run() { return {success:true}; }
        };
      }
    }
  };

  const result = await loadStatePart(env,'operations',{windowed:'1',limit:'20',offset:'0',q:'DET-957487',detailKind:'physical'});
  const main = calls.find(call => /SELECT w\.\*,z\.code AS zone_code/i.test(call.sql));
  if (!main?.sql.includes('OR w.id IN (?)')) throw new Error('La consulta no incorpora el ID resuelto desde el folio');
  if (!main.binds.includes('womsrpmist9b1')) throw new Error('DET-957487 no se resolvió a su ID interno');
  if (result.workOrders[0]?.id !== 'womsrpmist9b1') throw new Error('La búsqueda no devolvió la orden esperada');
  const digitResult = await loadStatePart(env,'operations',{windowed:'1',limit:'20',offset:'0',q:'957487',detailKind:'physical'});
  const digitMain = calls.filter(call => /SELECT w\.\*,z\.code AS zone_code/i.test(call.sql)).at(-1);
  if (!digitMain?.sql.includes('OR w.id IN (?)')) throw new Error('El numero sin prefijo no incorpora el ID resuelto');
  if (!digitMain.binds.includes('womsrpmist9b1')) throw new Error('957487 no se resolvio a su ID interno');
  if (digitResult.workOrders[0]?.id !== 'womsrpmist9b1') throw new Error('La busqueda sin prefijo no devolvio la orden esperada');
  console.log('Exact visible work-order folio search with optional prefix: OK');
})().catch(error => {
  console.error(error);
  process.exitCode=1;
});

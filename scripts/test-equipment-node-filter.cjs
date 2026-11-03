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
          bind(...binds) { call.binds = binds; return this; },
          async all() {
            if (/SELECT e\.\*, z\.code AS zone_code/i.test(sql)) return {results:[{id:'eq-1',name:'Antena 1',zone_code:'acapulco'}]};
            if (/FROM equipment_nodes WHERE equipment_id IN/i.test(sql)) return {results:[{equipment_id:'eq-1',node_id:'node-1',position:0}]};
            return {results:[]};
          },
          async first() { return null; },
          async run() { return {success:true}; }
        };
      }
    }
  };

  const result = await loadStatePart(env,'equipment',{paged:'1',windowed:'1',nodeIds:'node-1',limit:'20',offset:'0'});
  const main = calls.find(call => /SELECT e\.\*, z\.code AS zone_code/i.test(call.sql));
  if (!main?.sql.includes('EXISTS (SELECT 1 FROM equipment_nodes')) throw new Error('Falta filtro de antenas por pueblo');
  if (!main.binds.includes('node-1')) throw new Error('No se enlazo el identificador del pueblo');
  if (result.equipment?.[0]?.linkedNodeIds?.[0] !== 'node-1') throw new Error('No se devolvio la relacion pueblo-antena');
  console.log('Equipment lookup by node: OK');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

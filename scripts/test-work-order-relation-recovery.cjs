const assert = require('node:assert/strict');
const fs = require('node:fs');

const store = fs.readFileSync('relational-store.js','utf8');

assert.match(store,/work_order_relation_recovery_v1/);
assert.match(store,/getLegacyAppDataValue\(env,'workOrders'\)/);
assert.match(store,/FROM plan_stop_orders pso JOIN plan_stops ps/);
assert.match(store,/e\.name AS linked_equipment_name/);
assert.match(store,/row\.linked_equipment_name \|\| row\.equipment_name_legacy/);
assert.match(store,/missingRelationProperty&&rec\.id/);
assert.match(store,/relationValue\('equipmentId','equipment_id'\)/);

console.log('Recuperacion y proteccion de relaciones de orden: OK');

(async () => {
  const moduleUrl=`data:text/javascript;base64,${Buffer.from(store).toString('base64')}`;
  const {loadStatePart}=await import(moduleUrl);
  const workRow={id:'wmoun6uhbyw4',title:'LLevar base para pane (LALO)',category:'otro',detail_kind:'physical',equipment_id:null,node_id:null,equipment_name_legacy:null,node_code_legacy:null,node_name_legacy:null,town_legacy:null,priority:'alta',visit_type:'torre',status:'pendiente',created_at:'2026-05-06T22:42:02.063Z',deleted_at:null};
  let recoveredEquipmentName='';
  let updateCount=0;
  const env={DB:{
    prepare(sql){
      return {
        sql,binds:[],
        bind(...binds){this.binds=binds;return this;},
        async all(){
          if(/FROM work_orders\s+WHERE deleted_at IS NULL AND \(equipment_id IS NULL OR node_id IS NULL\)/i.test(sql))return {results:[{...workRow}]};
          if(/SELECT id,name FROM equipment/i.test(sql))return {results:[{id:'emnm6x73gzx2',name:'C2-Los-Mayos'}]};
          if(/SELECT id,node_code,town FROM nodes WHERE deleted_at/i.test(sql))return {results:[]};
          if(/FROM plan_stop_orders pso/i.test(sql))return {results:[]};
          if(/SELECT w\.\*,z\.code AS zone_code,e\.name AS linked_equipment_name/i.test(sql))return {results:[{...workRow,linked_equipment_name:recoveredEquipmentName}]};
          return {results:[]};
        },
        async first(){
          if(/SELECT value_json FROM app_settings/i.test(sql))return null;
          if(/SELECT value FROM app_data/i.test(sql))return {value:JSON.stringify([{id:'wmoun6uhbyw4',equipmentId:'emnm6x73gzx2'}])};
          if(/SUM\(CASE/i.test(sql))return {total:1,pending:1,critical:1,done:0};
          if(/COUNT\(\*\) AS total/i.test(sql))return {total:1};
          return null;
        },
        async run(){return {success:true};}
      };
    },
    async batch(statements){
      for(const statement of statements){
        if(!/UPDATE work_orders SET/i.test(statement.sql))continue;
        workRow.equipment_id=statement.binds[0]||workRow.equipment_id;
        recoveredEquipmentName=statement.binds[2]||recoveredEquipmentName;
        updateCount++;
      }
      return statements.map(()=>({success:true}));
    }
  }};
  const result=await loadStatePart(env,'operations',{windowed:'1',limit:'20',offset:'0',detailKind:'physical'});
  assert.equal(updateCount,1);
  assert.equal(result.workOrders[0].equipmentId,'emnm6x73gzx2');
  assert.equal(result.workOrders[0].equipmentName,'C2-Los-Mayos');
  console.log('Caso DET-698059 recuperado desde la relacion historica: OK');
})().catch(error=>{console.error(error);process.exitCode=1;});

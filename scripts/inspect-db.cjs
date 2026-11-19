const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', '.wrangler-prod-relational/v3/d1/miniflare-D1DatabaseObject/009a7fc67a701a4f29d4a14ba1c39515cabc0fc7772a46f7de078e80c7f07606.sqlite');
console.log('Connecting to db:', dbPath);
const db = new DatabaseSync(dbPath);

const totalOrders = db.prepare('SELECT COUNT(id) as c FROM work_orders').get();
console.log('Total work orders:', totalOrders.c);

const networkOrders = db.prepare("SELECT COUNT(id) as c FROM work_orders WHERE detail_kind = 'network'").get();
console.log('Network work orders:', networkOrders.c);

const physicalOrders = db.prepare("SELECT COUNT(id) as c FROM work_orders WHERE detail_kind = 'physical'").get();
console.log('Physical work orders:', physicalOrders.c);

const nullKindOrders = db.prepare('SELECT COUNT(id) as c FROM work_orders WHERE detail_kind IS NULL').get();
console.log('Null detail_kind orders:', nullKindOrders.c);

const deletedOrders = db.prepare('SELECT COUNT(id) as c FROM work_orders WHERE deleted_at IS NOT NULL').get();
console.log('Deleted orders:', deletedOrders.c);

const activeNetwork = db.prepare("SELECT COUNT(id) as c FROM work_orders WHERE deleted_at IS NULL AND detail_kind = 'network'").get();
console.log('Active network orders:', activeNetwork.c);

const statusBreakdown = db.prepare("SELECT status, count(id) as c FROM work_orders WHERE detail_kind = 'network' GROUP BY status").all();
console.log('Status breakdown for network orders:', statusBreakdown);

const indexes = db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'work_orders'").all();
console.log('Existing indexes on work_orders:');
indexes.forEach(idx => console.log('-', idx.name, ':', idx.sql));

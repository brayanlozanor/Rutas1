const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const dbPath = path.join(__dirname, '..', '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject', '009a7fc67a701a4f29d4a14ba1c39515cabc0fc7772a46f7de078e80c7f07606.sqlite');
const db = new DatabaseSync(dbPath, { readOnly: true });

console.log('Node ndmrz6whqvhbs:', db.prepare("SELECT * FROM nodes WHERE id = 'ndmrz6whqvhbs'").all());
console.log('Nodes like VILLA or MARAVILLAS:', db.prepare("SELECT id, town FROM nodes WHERE town LIKE '%MARAVILL%' OR town LIKE '%VILLA%'").all());





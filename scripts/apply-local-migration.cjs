const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const baseDir = path.resolve(__dirname, '..');
const migrationSql = fs.readFileSync(path.join(baseDir, 'migration-database-optimization-v3.sql'), 'utf8');

const targetDbs = [
  path.join(baseDir, '.wrangler-prod-relational/v3/d1/miniflare-D1DatabaseObject/009a7fc67a701a4f29d4a14ba1c39515cabc0fc7772a46f7de078e80c7f07606.sqlite'),
  path.join(baseDir, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/009a7fc67a701a4f29d4a14ba1c39515cabc0fc7772a46f7de078e80c7f07606.sqlite')
];

for (const dbPath of targetDbs) {
  if (fs.existsSync(dbPath)) {
    try {
      const db = new DatabaseSync(dbPath);
      db.exec(migrationSql);
      console.log(`✓ Migration applied successfully to ${dbPath}`);
    } catch (err) {
      console.error(`✗ Error applying to ${dbPath}:`, err.message);
    }
  } else {
    console.log(`ℹ DB not found: ${dbPath}`);
  }
}


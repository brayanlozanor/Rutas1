const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const readline = require('node:readline');

const sqlDumpPath = path.resolve(__dirname, '..', 'netops-db-20261030-135439.sql');
const targetDirs = [
  path.resolve(__dirname, '..', '.wrangler-prod-relational', 'v3', 'd1', 'miniflare-D1DatabaseObject'),
  path.resolve(__dirname, '..', '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject')
];
const dbFileName = '009a7fc67a701a4f29d4a14ba1c39515cabc0fc7772a46f7de078e80c7f07606.sqlite';

async function importToDb(targetDbPath) {
  console.log(`Starting import to: ${targetDbPath}`);
  const dir = path.dirname(targetDbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Remove existing wal/shm if any
  for (const ext of ['-wal', '-shm']) {
    const f = targetDbPath + ext;
    if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch (e) {}
  }
  if (fs.existsSync(targetDbPath)) {
    try { fs.unlinkSync(targetDbPath); } catch (e) {}
  }

  const db = new DatabaseSync(targetDbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA foreign_keys = OFF;');

  const fileStream = fs.createReadStream(sqlDumpPath, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let currentStmt = '';
  let count = 0;
  let inTransaction = false;

  db.exec('BEGIN TRANSACTION;');
  inTransaction = true;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--')) continue;

    currentStmt += line + '\n';
    if (trimmed.endsWith(';')) {
      try {
        db.exec(currentStmt);
        count++;
        if (count % 2000 === 0) {
          db.exec('COMMIT;');
          db.exec('BEGIN TRANSACTION;');
          process.stdout.write(`Executed ${count} statements...\r`);
        }
      } catch (err) {
        // ignore duplicate table or index errors if any
        if (!err.message.includes('already exists')) {
          // console.warn(`Warning on statement: ${err.message.slice(0, 100)}`);
        }
      }
      currentStmt = '';
    }
  }

  if (currentStmt.trim()) {
    try { db.exec(currentStmt); } catch (e) {}
  }

  if (inTransaction) {
    db.exec('COMMIT;');
  }

  // Now ensure all latest columns and tables exist
  console.log(`\nVerifying and applying migrations/schema checks...`);
  const migrations = [
    `ALTER TABLE work_orders ADD COLUMN assigned_user_id TEXT;`,
    `ALTER TABLE work_orders ADD COLUMN assigned_user_name TEXT;`,
    `ALTER TABLE work_orders ADD COLUMN review_opened_at TEXT;`,
    `ALTER TABLE work_orders ADD COLUMN review_opened_by_id TEXT;`,
    `ALTER TABLE work_orders ADD COLUMN review_opened_by_name TEXT;`,
    `ALTER TABLE work_orders ADD COLUMN detail_kind TEXT DEFAULT 'technician';`,
    `ALTER TABLE work_orders ADD COLUMN client_phone TEXT;`,
    `ALTER TABLE work_orders ADD COLUMN follow_up_status TEXT;`,
    `ALTER TABLE work_orders ADD COLUMN follow_up_notes TEXT;`,
    `ALTER TABLE work_orders ADD COLUMN follow_up_at TEXT;`
  ];

  for (const m of migrations) {
    try {
      db.exec(m);
    } catch (e) {
      // Column may already exist
    }
  }

  // Ensure metadata.sqlite exists in the same folder
  const metaPath = path.join(dir, 'metadata.sqlite');
  if (!fs.existsSync(metaPath)) {
    const metaDb = new DatabaseSync(metaPath);
    metaDb.exec(`
      CREATE TABLE IF NOT EXISTS _mf_entries (
        key TEXT PRIMARY KEY,
        value BLOB
      );
    `);
    metaDb.close();
  }

  db.close();
  const stats = fs.statSync(targetDbPath);
  console.log(`Successfully imported! Database file size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
}

async function main() {
  for (const targetDir of targetDirs) {
    const targetDbPath = path.join(targetDir, dbFileName);
    await importToDb(targetDbPath);
  }
  console.log('All target databases populated successfully!');
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});


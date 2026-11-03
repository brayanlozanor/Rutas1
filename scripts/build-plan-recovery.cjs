const fs = require('fs');

const sourcePath = 'data-relational-v3-d1safe.sql';
const currentPath = 'backup-before-plan-recovery-20260724.sql';
const outputPath = 'restore-missing-plans-20260724.sql';
const targetTables = ['plans', 'plan_assignments', 'plan_stops', 'plan_stop_orders'];

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    current += char;
    if (char === "'") {
      if (quoted && sql[i + 1] === "'") {
        current += sql[++i];
      } else {
        quoted = !quoted;
      }
    }
    if (char === ';' && !quoted) {
      statements.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

function tableOf(statement) {
  const match = statement.match(/^INSERT(?: OR REPLACE)? INTO\s+"?([a-z0-9_]+)"?/i);
  return match ? match[1].toLowerCase() : '';
}

function firstId(statement) {
  const match = statement.match(/\bVALUES\s*\(\s*'((?:''|[^'])*)'/i);
  return match ? match[1].replace(/''/g, "'") : '';
}

function idsByTable(statements) {
  const result = new Map();
  for (const statement of statements) {
    const table = tableOf(statement);
    const id = firstId(statement);
    if (!table || !id) continue;
    if (!result.has(table)) result.set(table, new Set());
    result.get(table).add(id);
  }
  return result;
}

const sourceStatements = splitSqlStatements(fs.readFileSync(sourcePath, 'utf8'));
const currentStatements = splitSqlStatements(fs.readFileSync(currentPath, 'utf8'));
const sourceIds = idsByTable(sourceStatements);
const currentIds = idsByTable(currentStatements);

const dependencyTables = ['equipment', 'nodes', 'work_orders', 'technicians'];
const dependencyAudit = {};
for (const table of dependencyTables) {
  const oldIds = sourceIds.get(table) || new Set();
  const newIds = currentIds.get(table) || new Set();
  dependencyAudit[table] = {
    backup: oldIds.size,
    current: newIds.size,
    missingFromCurrent: [...oldIds].filter(id => !newIds.has(id)).length
  };
}

const selected = sourceStatements.filter(statement => targetTables.includes(tableOf(statement)));
const recovered = selected.map(statement => {
  let sql = statement.replace(/^INSERT OR REPLACE INTO/i, 'INSERT OR IGNORE INTO');
  sql = sql.replace(/'general-1'/g, "'general-1-recuperado'");
  return sql.endsWith(';') ? sql : `${sql};`;
});

const header = [
  '-- Recuperacion aditiva de planificacion.',
  '-- Generado desde data-relational-v3-d1safe.sql.',
  '-- No contiene DELETE, UPDATE ni INSERT OR REPLACE.',
  '-- El plan historico general-1 se recupera como general-1-recuperado.',
  ''
].join('\n');
fs.writeFileSync(outputPath, `${header}${recovered.join('\n')}\n`, 'utf8');

const counts = Object.fromEntries(targetTables.map(table => [
  table,
  recovered.filter(statement => tableOf(statement) === table).length
]));
console.log(JSON.stringify({ outputPath, counts, dependencyAudit }, null, 2));

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');

(async () => {
  const root = path.resolve(__dirname, '..');
  const source = fs.readFileSync(path.join(root, 'relational-store.js'), 'utf8');
  const { replaceWeekPlan, loadStatePart } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(path.join(root, 'schema-relational-v3.sql'), 'utf8'));
  db.exec("CREATE TABLE app_data(key TEXT PRIMARY KEY,value TEXT); INSERT INTO roles(id,code,name) VALUES(1,'tecnico','Tecnico');");
  for (const id of ['a', 'b', 'c']) {
    db.prepare('INSERT INTO users(id,name,username,role_id) VALUES(?,?,?,1)').run(`user-${id}`, id, id);
    db.prepare('INSERT INTO technicians(id,user_id,name) VALUES(?,?,?)').run(`tech-${id}`, `user-${id}`, id);
  }
  const env = { DB: {
    prepare(sql) {
      return {
        binds: [],
        bind(...values) { this.binds = values; return this; },
        async all() { return { results: db.prepare(sql).all(...this.binds) }; },
        async first() { return db.prepare(sql).get(...this.binds) || null; },
        async run() { db.prepare(sql).run(...this.binds); return { success: true }; }
      };
    },
    async batch(statements) {
      db.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        db.exec('COMMIT');
        return results;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    }
  } };
  const plan = (id, ids) => ({ id, name: id, assignedTechId: ids[0] || '', assignedTechIds: ids, assignedAt: '2026-11-06T12:00:00Z', stops: [] });
  const payload = plans => ({ __shared__: { _generalPlans: plans } });
  const save = value => replaceWeekPlan(env, value, { touch: false });
  const reload = async (page = {}) => (await loadStatePart(env, 'planning', page)).weekPlan;
  const find = (data, id) => data.__shared__._generalPlans.find(item => item.id === id);

  await save(payload([plan('team', ['tech-a']), plan('old', ['tech-b', 'tech-c'])]));
  // Move the second technician to the team, leaving the old plan's other member.
  await save(payload([plan('team', ['tech-a', 'tech-b', 'tech-b']), plan('old', ['tech-c'])]));
  let loaded = await reload();
  assert.deepEqual(find(loaded, 'team').assignedTechIds, ['tech-a', 'tech-b']);
  assert.equal(find(loaded, 'team').assignedTechId, 'tech-a');
  assert.deepEqual(find(loaded, 'old').assignedTechIds, ['tech-c']);
  assert.equal(db.prepare("SELECT count(*) n FROM plan_assignments WHERE technician_id='tech-b'").get().n, 1);

  // A second save using the reloaded data must retain the whole team.
  await save(loaded);
  loaded = await reload();
  assert.deepEqual(find(loaded, 'team').assignedTechIds, ['tech-a', 'tech-b']);
  const secondMemberView = await reload({ viewerRole: 'tecnico', viewerId: 'user-b' });
  assert.deepEqual(find(secondMemberView, 'team').assignedTechIds, ['tech-a', 'tech-b']);

  await save(payload([plan('team', ['tech-b']), plan('old', ['tech-c'])]));
  loaded = await reload();
  assert.equal(find(loaded, 'team').assignedTechId, 'tech-b');
  assert.deepEqual(find(loaded, 'team').assignedTechIds, ['tech-b']);
  assert.equal(db.prepare("SELECT count(*) n FROM plan_assignments WHERE technician_id='tech-a'").get().n, 0);

  await assert.rejects(save(payload([plan('team', ['tech-a']), plan('team', ['tech-c'])])), /Plan duplicado/);
  assert.deepEqual(find(await reload(), 'team').assignedTechIds, ['tech-b']);

  await save(payload([
    { id: 'legacy', name: 'Legacy', assignedTechId: 'tech-a', stops: [] },
    { id: 'array-only', name: 'Array', assignedTechIds: ['tech-b', 'tech-c'], stops: [] },
    plan('unassigned', [])
  ]));
  loaded = await reload();
  assert.deepEqual(find(loaded, 'legacy').assignedTechIds, ['tech-a']);
  assert.deepEqual(find(loaded, 'array-only').assignedTechIds, ['tech-b', 'tech-c']);
  assert.equal(find(loaded, 'array-only').assignedTechId, 'tech-b');
  assert.deepEqual(find(loaded, 'unassigned').assignedTechIds, []);
  assert.equal(find(loaded, 'unassigned').assignedTechId, '');
  db.close();
  console.log('PASS: team persistence, reload, technician view, moves, removals, rollback and legacy plans.');
})().catch(error => { console.error(error); process.exitCode = 1; });

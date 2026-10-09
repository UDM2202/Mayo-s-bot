// Copy data from the old SQLite file (and installations.json) into Postgres.
// Usage: DATABASE_URL=... node scripts/migrate-sqlite-to-supabase.js [path/to/taskonbot.db] [path/to/installations.json]
import fs from 'fs';
import Database from 'better-sqlite3';
import { all, run, ready, pool } from '../src/db/schema.js';

const sqlitePath = process.argv[2] || 'taskonbot.db';
const installationsPath = process.argv[3] || 'installations.json';

const tables = {
  teams: ['id', 'name', 'created_at'],
  users: ['id', 'username', 'password', 'team_id', 'token', 'created_at'],
  team_members: ['user_id', 'team_id'],
  tasks: ['id', 'title', 'description', 'status', 'assignee', 'team_id', 'priority', 'due_date', 'tags', 'created_at', 'updated_at'],
  activity_log: ['task_id', 'action', 'details', 'created_at'],
  workspaces: ['id', 'team_id', 'team_name', 'access_token', 'bot_user_id', 'created_at'],
};

// SQLite stores "YYYY-MM-DD HH:MM:SS" in UTC
const toTimestamp = (v) => (v && /^\d{4}-\d{2}-\d{2} /.test(v) ? v.replace(' ', 'T') + 'Z' : v || null);

await ready;
const sqlite = new Database(sqlitePath, { readonly: true });
const existing = new Set(sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(r => r.name));

for (const [table, wanted] of Object.entries(tables)) {
  if (!existing.has(table)) { console.log(`- ${table}: not in SQLite, skipped`); continue; }
  const have = new Set(sqlite.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name));
  const cols = wanted.filter(c => have.has(c));
  const rows = sqlite.prepare(`SELECT ${cols.join(', ')} FROM ${table}`).all();
  let copied = 0;
  for (const row of rows) {
    const values = cols.map(c => (c.endsWith('_at') ? toTimestamp(row[c]) : row[c]));
    if (table === 'tasks') {
      // Slack-created tasks may point at teams that only exist implicitly
      await run('INSERT INTO teams (id, name) VALUES ($1, $1) ON CONFLICT DO NOTHING', [row.team_id]);
      values[cols.indexOf('title')] ??= 'Untitled Task';
    }
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const res = await run(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, values);
    copied += res.rowCount;
  }
  console.log(`✓ ${table}: ${copied} of ${rows.length} rows copied`);
}

if (fs.existsSync(installationsPath)) {
  const store = JSON.parse(fs.readFileSync(installationsPath, 'utf8'));
  for (const [key, data] of Object.entries(store)) {
    await run('INSERT INTO slack_installations (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data', [key, data]);
  }
  console.log(`✓ slack_installations: ${Object.keys(store).length} copied`);
}

// Keep the activity_log id sequence ahead of any copied rows
await all("SELECT setval(pg_get_serial_sequence('activity_log', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM activity_log");
await pool.end();
console.log('Done.');

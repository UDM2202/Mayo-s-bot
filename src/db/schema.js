import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set (use your Supabase connection string)');
  process.exit(1);
}

// Supabase requires SSL; local Postgres usually doesn't support it
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);

export const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 5,
});

pool.on('error', (err) => console.error('Postgres pool error:', err.message));

// Helpers: all rows, first row, or just run
export async function all(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function one(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

export async function run(sql, params = []) {
  return pool.query(sql, params);
}

// Create tables
async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      team_id TEXT DEFAULT 'engineering',
      token TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS users_token_idx ON users (token);

    CREATE TABLE IF NOT EXISTS team_members (
      user_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      PRIMARY KEY (user_id, team_id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      assignee TEXT DEFAULT '',
      team_id TEXT NOT NULL REFERENCES teams(id),
      priority TEXT DEFAULT 'medium',
      due_date TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS tasks_team_idx ON tasks (team_id);

    CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      task_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS slack_installations (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      team_id TEXT UNIQUE,
      team_name TEXT,
      access_token TEXT NOT NULL,
      bot_user_id TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // Seed default teams if empty
  const { count } = await one('SELECT COUNT(*)::int AS count FROM teams');
  if (count === 0) {
    await run(`INSERT INTO teams (id, name) VALUES ('engineering', 'Engineering'), ('design', 'Design'), ('marketing', 'Marketing')`);
    console.log('✅ Teams seeded');
  }
}

// Resolves once tables exist; the server waits on this before listening
export const ready = initSchema();

export default { all, one, run, ready, pool };

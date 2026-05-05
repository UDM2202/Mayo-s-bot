import pkg from '@slack/bolt';
const { App, ExpressReceiver } = pkg;
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { saveInstallation, fetchInstallation, deleteInstallation } from './token-store.js';
import { createStateStore } from './state-store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'taskonbot.db');
const db = new Database(DB_PATH);

// Tables
db.exec(`CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT,
  status TEXT DEFAULT 'pending',
  team_id TEXT,
  assignee TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT
)`);

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET || 'taskonbot-secret',
  scopes: ['commands', 'chat:write'],
  installationStore: { storeInstallation: saveInstallation, fetchInstallation, deleteInstallation },
  installerOptions: {
    directInstall: true,
    stateStore: createStateStore(db),
  },
  endpoints: '/slack/events',
});

const app = new App({ receiver });

// Ensure a team exists
function ensureTeam(teamId, teamName) {
  const name = teamName || teamId;
  db.prepare('INSERT OR IGNORE INTO teams (id, name) VALUES (?, ?)').run(teamId, name);
}

// Look up the dashboard team for a given Slack username
function getDashboardTeamForUser(slackUserName) {
  const user = db.prepare('SELECT team_id FROM users WHERE username = ?').get(slackUserName);
  return user ? user.team_id : null;
}

// Extract #team and @person from text
function parseTaskText(text) {
  let title = text;
  let teamId = null;
  let assignee = null;

  const teamMatch = title.match(/#([\w-]+)/);
  if (teamMatch) {
    teamId = teamMatch[1].toLowerCase();
    title = title.replace(teamMatch[0], '').trim();
  }

  const personMatch = title.match(/@(\w+)/);
  if (personMatch) {
    assignee = personMatch[1];
    title = title.replace(personMatch[0], '').trim();
  }

  return { title, teamId, assignee };
}

// ─────────────────────────────────
// Slash commands
// ─────────────────────────────────

app.command('/taskon', async ({ command, ack, respond }) => {
  await ack();
  await respond('🤖 *TaskOnBot*\n`/task create [title] #team @person` – Create task\n`/tasks` – Your tasks\n`/task list` – All tasks');
});

app.command('/task', async ({ command, ack, respond }) => {
  await ack();

  const text = (command.text || '').trim();

  if (!text || text.toLowerCase() === 'list') {
    const tasks = db.prepare('SELECT title, status, team_id FROM tasks ORDER BY created_at DESC LIMIT 15').all();
    if (tasks.length === 0) return await respond('No tasks yet.');
    return await respond(tasks.map(t => `• ${t.title} — *${t.status}* (${t.team_id})`).join('\n'));
  }

  let remaining = text;
  if (text.toLowerCase().startsWith('create ')) {
    remaining = text.substring(7).trim();
  }

  const parsed = parseTaskText(remaining);
  const title = parsed.title;
  if (!title) return await respond('Please include a task title. Example: `/task create Fix login bug #engineering`');

  const assignee = parsed.assignee || command.user_name;

  // Determine the team for this task:
  // 1. Explicit #team in the command
  // 2. The dashboard team of the assignee (if found)
  // 3. Fallback to 'general'
  let finalTeam = parsed.teamId;
  if (!finalTeam) {
    const dashboardTeam = getDashboardTeamForUser(assignee);
    finalTeam = dashboardTeam || 'general';
  }
  ensureTeam(finalTeam, finalTeam);

  const id = crypto.randomUUID().substring(0, 8);
  db.prepare('INSERT INTO tasks (id, title, assignee, team_id) VALUES (?, ?, ?, ?)')
    .run(id, title, assignee, finalTeam);

  await respond(`✅ Task created: *${title}* (${finalTeam}) – assigned to @${assignee}`);
});

app.command('/tasks', async ({ command, ack, respond }) => {
  await ack();
  const tasks = db.prepare('SELECT title, status, team_id FROM tasks WHERE assignee = ? LIMIT 15').all(command.user_name);
  if (tasks.length === 0) return await respond('No tasks assigned to you.');
  await respond(tasks.map(t => `• ${t.title} — *${t.status}* (${t.team_id})`).join('\n'));
});

export default receiver;
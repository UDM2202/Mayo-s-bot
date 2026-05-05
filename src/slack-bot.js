import pkg from '@slack/bolt';
const { App, ExpressReceiver } = pkg;
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { saveInstallation, fetchInstallation, deleteInstallation } from './token-store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'taskonbot.db');
const db = new Database(DB_PATH);

db.exec(`CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, title TEXT, status TEXT DEFAULT 'pending',
  team_id TEXT DEFAULT 'engineering', assignee TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET || 'taskonbot-secret',
  scopes: ['commands', 'chat:write'],
  installationStore: {
    storeInstallation: saveInstallation,
    fetchInstallation: fetchInstallation,
    deleteInstallation: deleteInstallation,
  },
  installerOptions: {
    directInstall: true,
  },
  endpoints: '/slack/events',
});

const app = new App({ receiver });

app.command('/taskon', async ({ ack, respond }) => {
  await ack();
  await respond('🤖 *TaskOnBot*\n`/task create [title]` — Create task\n`/tasks` — Your tasks\n`/task list` — All tasks');
});

app.command('/task', async ({ command, ack, respond }) => {
  await ack();
  const text = (command.text || '').trim().toLowerCase();

  if (text.startsWith('create ')) {
    const title = text.replace('create ', '');
    const id = crypto.randomUUID().slice(0, 8);
    db.prepare('INSERT INTO tasks (id, title, assignee) VALUES (?, ?, ?)').run(id, title, command.user_name);
    return await respond(`✅ Created: ${title}`);
  }

  if (text === 'list' || !text) {
    const tasks = db.prepare('SELECT title, status FROM tasks ORDER BY created_at DESC LIMIT 10').all();
    if (tasks.length === 0) return await respond('No tasks yet.');
    return await respond(tasks.map(t => `• ${t.title} — *${t.status}*`).join('\n'));
  }

  await respond('Try: `/task create Fix bug` or `/task list`');
});

app.command('/tasks', async ({ command, ack, respond }) => {
  await ack();
  const tasks = db.prepare('SELECT title, status FROM tasks WHERE assignee = ? LIMIT 10').all(command.user_name);
  if (tasks.length === 0) return await respond('No tasks assigned to you.');
  await respond(tasks.map(t => `• ${t.title} — *${t.status}*`).join('\n'));
});

export default receiver;
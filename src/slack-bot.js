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

db.exec(`CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, title TEXT, status TEXT DEFAULT 'pending',
  team_id TEXT, assignee TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY, name TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS team_members (
  user_id TEXT NOT NULL, team_id TEXT NOT NULL,
  PRIMARY KEY (user_id, team_id)
)`);

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET || 'taskonbot-secret',
  scopes: ['commands', 'chat:write'],
  installationStore: { storeInstallation: saveInstallation, fetchInstallation, deleteInstallation },
  installerOptions: { directInstall: true, stateStore: createStateStore(db) },
  endpoints: '/slack/events',
});

const app = new App({ receiver });

function ensureTeamAndMembership(teamId, slackUserName) {
  db.prepare('INSERT OR IGNORE INTO teams (id, name) VALUES (?, ?)').run(teamId, teamId);
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(slackUserName);
  if (user) {
    db.prepare('INSERT OR IGNORE INTO team_members (user_id, team_id) VALUES (?, ?)').run(user.id, teamId);
  }
}

function parseTaskText(text) {
  let title = text;
  let teamId = null;
  let assignee = null;

  // Handle Slack mention format <@U12345|username> → extract username
  const slackMention = title.match(/<@U\w+\|(\w+)>/);
  if (slackMention) {
    assignee = slackMention[1];
    title = title.replace(slackMention[0], '').trim();
  }

  // Also handle plain @username
  if (!assignee) {
    const personMatch = title.match(/@([\w-]+)/);
    if (personMatch) {
      assignee = personMatch[1];
      title = title.replace(personMatch[0], '').trim();
    }
  }

  // Extract #team
  const teamMatch = title.match(/#([\w-]+)/);
  if (teamMatch) {
    teamId = teamMatch[1].toLowerCase();
    title = title.replace(teamMatch[0], '').trim();
  }

  return { title, teamId, assignee };
}

app.command('/taskon', async ({ ack, respond }) => {
  await ack();
  await respond('🤖 *TaskOnBot*\n`/task create [title] #team @person` – Create task\n`/tasks` – Your tasks\n`/task list` – All tasks');
});

app.command('/task', async ({ command, ack, respond, client }) => {
  await ack();
  const text = (command.text || '').trim();

  if (text.toLowerCase() === 'list' || !text) {
    const tasks = db.prepare('SELECT title, status, team_id FROM tasks ORDER BY created_at DESC LIMIT 15').all();
    if (tasks.length === 0) return await respond('No tasks yet.');
    return await respond(tasks.map(t => `• ${t.title} — *${t.status}* (${t.team_id})`).join('\n'));
  }

  if (text.toLowerCase().startsWith('create ')) {
    const rest = text.substring(7).trim();
    if (!rest) return await respond('Please include a title.');

    const parsed = parseTaskText(rest);
    const title = parsed.title;
    
    // Resolve assignee name from Slack mention or use command user
    let assignee = parsed.assignee || command.user_name;

    const teamId = parsed.teamId || command.team_domain || command.team_id || 'general';

    ensureTeamAndMembership(teamId, assignee);

    const id = crypto.randomUUID().substring(0, 8);
    db.prepare('INSERT INTO tasks (id, title, assignee, team_id) VALUES (?, ?, ?, ?)')
      .run(id, title, assignee, teamId);

    return await respond(`✅ Task created: *${title}* (${teamId}) — assigned to @${assignee}`);
  }

  await respond('Use: `/task create [title] #team @person` or `/task list`');
});

app.command('/tasks', async ({ command, ack, respond }) => {
  await ack();
  const tasks = db.prepare('SELECT title, status, team_id FROM tasks WHERE assignee = ? LIMIT 15').all(command.user_name);
  if (tasks.length === 0) return await respond('No tasks assigned to you.');
  await respond(tasks.map(t => `• ${t.title} — *${t.status}* (${t.team_id})`).join('\n'));
});

export default receiver;
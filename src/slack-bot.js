import pkg from '@slack/bolt';
const { App, ExpressReceiver } = pkg;
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'taskonbot.db');
const db = new Database(DB_PATH);

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: '/slack/events',
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET || '',
  endpoints: '/slack/events',
});

// Debug: log if signing secret exists
console.log('Signing secret exists:', !!process.env.SLACK_SIGNING_SECRET);
console.log('Signing secret length:', (process.env.SLACK_SIGNING_SECRET || '').length);

function ensureTeam(name) {
  const id = (name || 'engineering').toLowerCase().replace(/\s+/g, '-');
  let team = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  if (!team) {
    db.prepare('INSERT INTO teams (id, name) VALUES (?, ?)').run(id, id);
  }
  return id;
}

// /taskon
app.command('/taskon', async ({ ack, respond }) => {
  await ack();
  await respond('🤖 *TaskOnBot*\n`/task create [title] #team` — Create task\n`/tasks` — Your tasks\n`/task list` — All tasks\n`/taskon teams` — List teams');
});

// /taskon teams
app.command('/taskon', async ({ command, ack, respond }) => {
  const text = command.text.trim();
  if (text === 'teams') {
    const teams = db.prepare('SELECT * FROM teams').all();
    const list = teams.map(t => `• #${t.id}`).join('\n');
    return await respond(`📋 *Teams*\n${list}`);
  }
});

// /task
app.command('/task', async ({ command, ack, respond }) => {
  await ack();
  const text = command.text.trim().toLowerCase();

  if (text === 'list' || text === '') {
    const tasks = db.prepare('SELECT id, title, status, team_id FROM tasks ORDER BY created_at DESC LIMIT 10').all();
    if (tasks.length === 0) return await respond('No tasks yet. `/task create My task`');
    const list = tasks.map(t => `• \`${t.id}\` ${t.title} — *${t.status}* #${t.team_id}`).join('\n');
    return await respond(list);
  }

  if (text.startsWith('create ')) {
    let title = text.replace('create ', '');
    let teamName = 'engineering';
    
    const teamMatch = title.match(/#(\S+)/);
    if (teamMatch) {
      teamName = teamMatch[1];
      title = title.replace(teamMatch[0], '').trim();
    }
    
    const teamId = ensureTeam(teamName);
    const id = crypto.randomUUID().slice(0, 8);
    db.prepare(`INSERT INTO tasks (id, title, status, team_id, priority, assignee, created_at, updated_at)
      VALUES (?, ?, 'pending', ?, 'medium', ?, datetime('now'), datetime('now'))`)
      .run(id, title, teamId, command.user_name);
    
    return await respond(`✅ *${id}* ${title}\n👤 @${command.user_name} | #${teamId}`);
  }

  await respond('Try: `/task create Fix bug #design` or `/task list`');
});

// /tasks
app.command('/tasks', async ({ command, ack, respond }) => {
  await ack();
  const tasks = db.prepare('SELECT id, title, status FROM tasks WHERE assignee = ? LIMIT 10').all(command.user_name);
  if (tasks.length === 0) return await respond('No tasks assigned to you.');
  const list = tasks.map(t => `• \`${t.id}\` ${t.title} — *${t.status}*`).join('\n');
  await respond(list);
});

export default receiver;
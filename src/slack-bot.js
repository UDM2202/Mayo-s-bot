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

// ── /taskon ──
app.command('/taskon', async ({ ack, respond }) => {
  await ack();
  await respond(`🤖 *TaskOnBot*\n/task create [title] — Create task\n/tasks — Your tasks\n/task list — All tasks`);
});

// ── /task ──
app.command('/task', async ({ command, ack, respond }) => {
  await ack();
  const text = command.text.trim().toLowerCase();

  if (text === 'list' || text === '') {
    const tasks = db.prepare('SELECT id, title, status FROM tasks ORDER BY created_at DESC LIMIT 10').all();
    if (tasks.length === 0) return await respond('No tasks yet.');
    const list = tasks.map(t => `• \`${t.id}\` ${t.title} — *${t.status}*`).join('\n');
    return await respond(list);
  }

  if (text.startsWith('create ')) {
    const title = text.replace('create ', '');
    const id = crypto.randomUUID().slice(0, 8);
    db.prepare(`INSERT INTO tasks (id, title, status, team_id, priority, assignee, created_at, updated_at)
      VALUES (?, ?, 'pending', 'engineering', 'medium', ?, datetime('now'), datetime('now'))`)
      .run(id, title, command.user_name);
    return await respond(`✅ *${id}* ${title} created by @${command.user_name}`);
  }

  if (text.startsWith('move ')) {
    const [, taskId, status] = text.split(' ');
    const valid = ['pending', 'in-progress', 'review', 'blocked', 'completed'];
    if (!valid.includes(status)) return await respond(`Use: ${valid.join(', ')}`);
    db.prepare('UPDATE tasks SET status = ?, updated_at = datetime("now") WHERE id = ?').run(status, taskId);
    return await respond(`✅ ${taskId} → *${status}*`);
  }

  await respond('Try: `/task create Fix bug` or `/task list`');
});

// ── /tasks ──
app.command('/tasks', async ({ command, ack, respond }) => {
  await ack();
  const tasks = db.prepare('SELECT id, title, status FROM tasks WHERE assignee = ? LIMIT 10').all(command.user_name);
  if (tasks.length === 0) return await respond('No tasks assigned to you.');
  const list = tasks.map(t => `• \`${t.id}\` ${t.title} — *${t.status}*`).join('\n');
  await respond(list);
});

// ── Start ──
export default receiver;
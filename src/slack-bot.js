import { App, ExpressReceiver } from '@slack/bolt';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'taskonbot.db');
const db = new Database(DB_PATH);

// Custom receiver to use a specific path instead of port
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: '/slack',
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

// /taskon
app.command('/taskon', async ({ ack, say }) => {
  await ack();
  await say({
    text: `🤖 *TaskOnBot*\n\n/task create [title] - Create a task\n/task list - List all tasks\n/tasks - Your tasks`,
    mrkdwn: true,
  });
});

// /task
app.command('/task', async ({ command, ack, say }) => {
  await ack();
  const text = command.text.trim();

  if (!text || text === 'list') {
    const tasks = db.prepare('SELECT title, status FROM tasks LIMIT 10').all();
    if (tasks.length === 0) return await say('📭 No tasks yet. `/task create My task`');
    const list = tasks.map(t => `• ${t.status === 'completed' ? '✅' : '⏳'} ${t.title}`).join('\n');
    return await say({ text: `📋 *Tasks*\n${list}`, mrkdwn: true });
  }

  if (text.startsWith('create')) {
    const title = text.replace('create', '').trim();
    if (!title) return await say('❌ `/task create Buy groceries`');
    const id = require('crypto').randomUUID().substring(0, 8);
    db.prepare(`INSERT INTO tasks (id, title, status, team_id, priority, assignee, created_at, updated_at)
      VALUES (?, ?, 'pending', 'engineering', 'medium', ?, datetime('now'), datetime('now'))`)
      .run(id, title, command.user_name);
    return await say({ text: `✅ *${id}* — ${title}\n👤 ${command.user_name}`, mrkdwn: true });
  }

  await say({ text: `Commands:\n\`/task create [title]\` | \`/task list\``, mrkdwn: true });
});

// /tasks
app.command('/tasks', async ({ command, ack, say }) => {
  await ack();
  const tasks = db.prepare('SELECT * FROM tasks WHERE assignee = ? LIMIT 10').all(command.user_name);
  if (tasks.length === 0) return await say('📭 No tasks assigned to you.');
  const list = tasks.map(t => `• ${t.title} [${t.status}]`).join('\n');
  await say({ text: `👤 *Your Tasks*\n${list}`, mrkdwn: true });
});

app.error(async (error) => console.error(error));

// Export the receiver for the main server
export default receiver;
export { app };
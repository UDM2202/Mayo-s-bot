import { App } from '@slack/bolt';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'taskonbot.db');
const db = new Database(DB_PATH);

// Use built-in Express receiver
const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
  port: 4000,
});

// /taskon
app.command('/taskon', async ({ ack, say }) => {
  await ack();
  await say({
    text: `🤖 *TaskOnBot*\n\n/task create [title] - Create a task\n/task list - List all tasks\n/tasks - Your tasks\n/taskon teams - List teams`,
    mrkdwn: true,
  });
});

// /task create and /task list
app.command('/task', async ({ command, ack, say }) => {
  await ack();
  const text = command.text.trim();

  if (!text || text === 'list') {
    const tasks = db.prepare('SELECT title, status FROM tasks LIMIT 10').all();
    if (tasks.length === 0) {
      return await say('📭 No tasks yet. Create one with `/task create My task`');
    }
    const list = tasks.map(t => `• ${t.status === 'completed' ? '✅' : '⏳'} ${t.title}`).join('\n');
    return await say({ text: `📋 *All Tasks*\n${list}`, mrkdwn: true });
  }

  if (text.startsWith('create')) {
    const title = text.replace('create', '').trim();
    if (!title) return await say('❌ Usage: `/task create Buy groceries`');

    const id = require('crypto').randomUUID().substring(0, 8);
    db.prepare(`INSERT INTO tasks (id, title, status, team_id, priority, assignee, created_at, updated_at)
      VALUES (?, ?, 'pending', 'engineering', 'medium', ?, datetime('now'), datetime('now'))`)
      .run(id, title, command.user_name);

    return await say({ text: `✅ Task *${id}* created: ${title}\n👤 ${command.user_name}`, mrkdwn: true });
  }

  if (text.startsWith('move')) {
    const parts = text.split(' ');
    if (parts.length < 3) return await say('❌ Usage: `/task move [id] [status]`');
    const taskId = parts[1];
    const status = parts[2];
    const validStatuses = ['pending', 'in-progress', 'review', 'blocked', 'completed'];
    if (!validStatuses.includes(status)) return await say(`❌ Valid statuses: ${validStatuses.join(', ')}`);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task) return await say(`❌ Task ${taskId} not found`);

    db.prepare('UPDATE tasks SET status = ?, updated_at = datetime("now") WHERE id = ?').run(status, taskId);
    return await say({ text: `✅ Task *${taskId}* → ${status}`, mrkdwn: true });
  }

  await say({ text: `Commands:\n\`/task create [title]\`\n\`/task list\`\n\`/task move [id] [status]\``, mrkdwn: true });
});

// /tasks - show user's tasks
app.command('/tasks', async ({ command, ack, say }) => {
  await ack();
  const tasks = db.prepare('SELECT * FROM tasks WHERE assignee = ? LIMIT 10').all(command.user_name);

  if (tasks.length === 0) {
    return await say(`👤 No tasks assigned to you. Create one with \`/task create [title]\``);
  }

  const list = tasks.map(t => `• ${t.status === 'completed' ? '✅' : '⏳'} ${t.title} [${t.id}]`).join('\n');
  await say({ text: `👤 *Your Tasks*\n${list}`, mrkdwn: true });
});

// Start
app.error(async (error) => console.error('Bot error:', error));

(async () => {
  await app.start();
  console.log('🤖 Slack bot running on port 4000');
})();
import 'dotenv/config';
import { App } from '@slack/bolt';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'taskonbot.db');
const db = new Database(DB_PATH);

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 3000,
});

// ──────────────────────────────
// HELPERS
// ──────────────────────────────

function getAllTeams() {
  return db.prepare('SELECT * FROM teams ORDER BY name').all();
}

function getOrCreateTeam(name) {
  const cleanName = name.toLowerCase().trim();
  if (!cleanName) return { id: 'engineering', name: 'engineering' };
  let team = db.prepare('SELECT * FROM teams WHERE name = ? OR id = ?').get(cleanName, cleanName);
  if (!team) {
    const id = cleanName.replace(/\s+/g, '-');
    db.prepare('INSERT INTO teams (id, name) VALUES (?, ?)').run(id, cleanName);
    team = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  }
  return team;
}

function getTaskById(id) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

function taskToText(t) {
  const emojis = { pending: '⏳', 'in-progress': '🔄', review: '👁️', blocked: '🚫', completed: '✅' };
  return `${emojis[t.status]} *${t.title}*\n   👤 ${t.assignee || 'Unassigned'} | ⚡ ${t.priority} | 📅 ${t.due_date || 'No date'} | #${t.team_id}`;
}

function showHelp() {
  return `
🤖 *TaskOnBot Commands*

*Create & Manage:*
\`/task create [title]\` — Create in default team
\`/task create [title] #team @person priority\` — Full create
\`/task assign [id] @person\` — Assign task
\`/task due [id] [date]\` — Set due date (e.g. friday, 2026-05-10)
\`/task move [id] [status]\` — Move: pending/in-progress/review/blocked/completed
\`/task delete [id]\` — Delete task

*View:*
\`/tasks\` — Your tasks
\`/task list\` — All tasks
\`/task list #team\` — Team tasks
\`/task show [id]\` — Task details

*Teams & Stats:*
\`/taskon teams\` — List teams
\`/taskon team create [name]\` — Create team
\`/taskon stats\` — Stats
\`/taskon stats #team\` — Team stats
  `;
}

// ──────────────────────────────
// /taskon - MAIN
// ──────────────────────────────

app.command('/taskon', async ({ command, ack, say }) => {
  await ack();
  const text = command.text.trim().toLowerCase();

  if (text === 'teams' || text === 'team list') {
    const teams = getAllTeams();
    if (teams.length === 0) return await say('No teams. Create: `/taskon team create [name]`');
    return await say({ text: `📋 *Teams*\n${teams.map(t => `• #${t.id}`).join('\n')}`, mrkdwn: true });
  }

  if (text.startsWith('team create')) {
    const name = text.replace('team create', '').trim();
    if (!name) return await say('❌ `/taskon team create [name]`');
    const team = getOrCreateTeam(name);
    return await say({ text: `✅ Team created: *#${team.id}*`, mrkdwn: true });
  }

  if (text === 'stats' || text.startsWith('stats')) {
    const teamName = text.replace('stats', '').trim().replace('#', '');
    let stats, label;
    if (teamName) {
      const team = db.prepare('SELECT * FROM teams WHERE id = ? OR name = ?').get(teamName, teamName);
      if (!team) return await say(`❌ Team #${teamName} not found`);
      stats = db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status='in-progress' THEN 1 ELSE 0 END) as in_progress, SUM(CASE WHEN status='blocked' THEN 1 ELSE 0 END) as blocked FROM tasks WHERE team_id=?`).get(team.id);
      label = team.name;
    } else {
      stats = db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status='in-progress' THEN 1 ELSE 0 END) as in_progress, SUM(CASE WHEN status='blocked' THEN 1 ELSE 0 END) as blocked FROM tasks`).get();
      label = 'All Teams';
    }
    const rate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
    return await say({ text: `📊 *${label}*\n✅ ${stats.completed} | 🔄 ${stats.in_progress} | 🚫 ${stats.blocked} | 📦 ${stats.total}\n📈 ${rate}% complete`, mrkdwn: true });
  }

  return await say({ text: showHelp(), mrkdwn: true });
});

// ──────────────────────────────
// /task - ALL TASK OPERATIONS
// ──────────────────────────────

app.command('/task', async ({ command, ack, say, client }) => {
  await ack();
  const text = command.text.trim();
  if (!text) return await say({ text: showHelp(), mrkdwn: true });

  const parts = text.split(/\s+/);
  const action = parts[0].toLowerCase();
  const rest = parts.slice(1).join(' ');

  // ─── CREATE ───
  if (action === 'create') {
    if (!rest) return await say('❌ `/task create [title] #team @person priority`');
    let title = rest, teamName = '', assignee = command.user_name, priority = 'medium';

    const teamMatch = title.match(/#(\S+)/);
    if (teamMatch) { teamName = teamMatch[1]; title = title.replace(teamMatch[0], '').trim(); }

    const personMatch = title.match(/@(\S+)/);
    if (personMatch) { assignee = personMatch[1]; title = title.replace(personMatch[0], '').trim(); }

    if (/\b(high|critical|urgent)\b/i.test(title)) { priority = 'high'; title = title.replace(/\b(high|critical|urgent)\b/i, '').trim(); }
    else if (/\blow\b/i.test(title)) { priority = 'low'; title = title.replace(/\blow\b/i, '').trim(); }

    const team = getOrCreateTeam(teamName || 'engineering');
    const id = crypto.randomUUID().substring(0, 8);

    db.prepare(`INSERT INTO tasks (id, title, status, team_id, priority, assignee, created_at, updated_at)
      VALUES (?, ?, 'pending', ?, ?, ?, datetime('now'), datetime('now'))`).run(id, title, team.id, priority, assignee);

    // Notify assignee if different
    if (assignee !== command.user_name) {
      try {
        await client.chat.postMessage({
          channel: `@${assignee}`,
          text: `📌 *New task assigned to you!*\n${title}\n#${team.id} | ${priority} priority\nBy: @${command.user_name}`,
          mrkdwn: true,
        });
      } catch (e) { /* DM might fail if user not found */ }
    }

    return await say({ text: `✅ *${id}* — ${title}\n👤 ${assignee} | #${team.id} | ${priority}`, mrkdwn: true });
  }

  // ─── LIST ───
  if (action === 'list') {
    const teamName = rest.replace('#', '');
    let tasks;
    if (teamName) {
      const team = db.prepare('SELECT * FROM teams WHERE id = ? OR name = ?').get(teamName, teamName);
      if (!team) return await say(`❌ Team #${teamName} not found`);
      tasks = db.prepare('SELECT * FROM tasks WHERE team_id = ? ORDER BY created_at DESC LIMIT 15').all(team.id);
    } else {
      tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 15').all();
    }
    if (!tasks.length) return await say('📭 No tasks');
    return await say({ text: `📋 *Tasks*\n\n${tasks.map(taskToText).join('\n\n')}`, mrkdwn: true });
  }

  // ─── SHOW ───
  if (action === 'show') {
    const task = getTaskById(rest);
    if (!task) return await say(`❌ Task ${rest} not found`);
    return await say({ text: `📌 *${task.id}* — ${task.title}\n📝 ${task.description || 'No description'}\n👤 ${task.assignee || 'Unassigned'}\n📊 ${task.status} | ⚡ ${task.priority}\n📅 ${task.due_date || 'No date'} | #${task.team_id}\n🕐 ${task.created_at}`, mrkdwn: true });
  }

  // ─── ASSIGN ───
  if (action === 'assign') {
    const [taskId, person] = rest.split(/\s+/);
    if (!taskId || !person) return await say('❌ `/task assign [id] @person`');
    const task = getTaskById(taskId);
    if (!task) return await say(`❌ Task ${taskId} not found`);
    const assignee = person.replace('@', '');
    db.prepare('UPDATE tasks SET assignee = ?, updated_at = datetime("now") WHERE id = ?').run(assignee, taskId);
    return await say({ text: `✅ Task *${taskId}* assigned to @${assignee}`, mrkdwn: true });
  }

  // ─── DUE ───
  if (action === 'due') {
    const [taskId, ...dateParts] = rest.split(/\s+/);
    if (!taskId || !dateParts.length) return await say('❌ `/task due [id] [date]`');
    const task = getTaskById(taskId);
    if (!task) return await say(`❌ Task ${taskId} not found`);

    let dateStr = dateParts.join(' ');
    const today = new Date();
    const days = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, tomorrow: 1 };
    const lower = dateStr.toLowerCase();

    if (lower === 'today') dateStr = today.toISOString().split('T')[0];
    else if (lower === 'tomorrow') { const d = new Date(today); d.setDate(d.getDate() + 1); dateStr = d.toISOString().split('T')[0]; }
    else if (days[lower] !== undefined) {
      const d = new Date(today);
      d.setDate(d.getDate() + ((days[lower] + 7 - d.getDay()) % 7 || 7));
      dateStr = d.toISOString().split('T')[0];
    }

    db.prepare('UPDATE tasks SET due_date = ?, updated_at = datetime("now") WHERE id = ?').run(dateStr, taskId);
    return await say({ text: `✅ Task *${taskId}* due: ${dateStr}`, mrkdwn: true });
  }

  // ─── MOVE ───
  if (action === 'move') {
    const [taskId, status] = rest.split(/\s+/);
    if (!taskId || !status) return await say('❌ `/task move [id] [pending|in-progress|review|blocked|completed]`');
    const valid = ['pending', 'in-progress', 'review', 'blocked', 'completed'];
    if (!valid.includes(status)) return await say(`❌ Invalid status. Use: ${valid.join(', ')}`);
    const task = getTaskById(taskId);
    if (!task) return await say(`❌ Task ${taskId} not found`);
    db.prepare('UPDATE tasks SET status = ?, updated_at = datetime("now") WHERE id = ?').run(status, taskId);
    const emojis = { pending: '⏳', 'in-progress': '🔄', review: '👁️', blocked: '🚫', completed: '✅' };
    return await say({ text: `${emojis[status]} Task *${taskId}* → ${status}`, mrkdwn: true });
  }

  // ─── DELETE ───
  if (action === 'delete') {
    const task = getTaskById(rest);
    if (!task) return await say(`❌ Task ${rest} not found`);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(rest);
    return await say({ text: `🗑️ Task *${rest}* deleted: ${task.title}`, mrkdwn: true });
  }

  return await say({ text: showHelp(), mrkdwn: true });
});

// ──────────────────────────────
// /tasks - MY TASKS
// ──────────────────────────────

app.command('/tasks', async ({ command, ack, say }) => {
  await ack();
  const tasks = db.prepare('SELECT * FROM tasks WHERE assignee = ? ORDER BY created_at DESC LIMIT 15').all(command.user_name);
  if (!tasks.length) return await say(`📭 No tasks assigned to you, ${command.user_name}!`);
  return await say({ text: `👤 *Your Tasks*\n\n${tasks.map(taskToText).join('\n\n')}`, mrkdwn: true });
});

// ──────────────────────────────
// MENTIONS
// ──────────────────────────────

app.message(async ({ message, say }) => {
  const text = message.text?.toLowerCase() || '';
  if (text.includes('hello') && text.includes('taskonbot')) {
    await say({ text: showHelp(), mrkdwn: true });
  }
});

// ──────────────────────────────
// START
// ──────────────────────────────

app.error(async (error) => console.error('Bot error:', error));

(async () => {
  await app.start();
  console.log('🤖 TaskOnBot Slack Bot — Ready!\n');
})();
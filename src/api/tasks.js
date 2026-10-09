import { Router } from 'express';
import { all, one, run } from '../db/schema.js';
import { v4 as uuid } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Pass async errors to Express instead of crashing the request
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const isMember = (userId, teamId) =>
  one('SELECT 1 FROM team_members WHERE user_id = $1 AND team_id = $2', [userId, teamId]);

const parseTags = (task) => ({ ...task, tags: JSON.parse(task.tags || '[]') });

// Get tasks for a team (must be a member)
router.get('/', wrap(async (req, res) => {
  const teamId = req.query.team || req.user.team_id;   // default to user's team
  if (!(await isMember(req.user.id, teamId))) return res.status(403).json({ error: 'Not a member of this team' });

  const rows = await all('SELECT * FROM tasks WHERE team_id = $1 ORDER BY created_at DESC', [teamId]);
  res.json(rows.map(parseTags));
}));

// Get single task
router.get('/:id', wrap(async (req, res) => {
  const task = await one('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!(await isMember(req.user.id, task.team_id))) return res.status(403).json({ error: 'Access denied' });
  res.json(parseTags(task));
}));

// Create task
router.post('/', wrap(async (req, res) => {
  const body = req.body;
  const id = uuid();
  const now = new Date().toISOString();
  // Use the team the dashboard is viewing, as long as the user belongs to it
  const team = body.team_id || req.user.team_id;
  if (!(await isMember(req.user.id, team))) return res.status(403).json({ error: 'Not a member of this team' });

  const task = await one(`
    INSERT INTO tasks (id, title, description, status, assignee, team_id, priority, due_date, tags, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    id,
    body.title || 'Untitled Task',
    body.description || '',
    body.status || 'pending',
    body.assignee || req.user.username,
    team,
    body.priority || 'medium',
    body.due_date || '',
    JSON.stringify(body.tags || []),
    now,
    now,
  ]);

  await run('INSERT INTO activity_log (task_id, action, details) VALUES ($1, $2, $3)', [
    id, 'created', `Task created: ${body.title}`,
  ]);

  res.status(201).json(parseTags(task));
}));

// Update task
router.put('/:id', wrap(async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  const now = new Date().toISOString();

  const existing = await one('SELECT * FROM tasks WHERE id = $1', [id]);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  if (!(await isMember(req.user.id, existing.team_id))) return res.status(403).json({ error: 'Access denied' });

  const task = await one(`
    UPDATE tasks
    SET title = $1, description = $2, status = $3, assignee = $4,
        priority = $5, due_date = $6, tags = $7, updated_at = $8
    WHERE id = $9
    RETURNING *
  `, [
    body.title ?? existing.title,
    body.description ?? existing.description,
    body.status ?? existing.status,
    body.assignee ?? existing.assignee,
    body.priority ?? existing.priority,
    body.due_date ?? existing.due_date,
    JSON.stringify(body.tags ?? JSON.parse(existing.tags || '[]')),
    now,
    id,
  ]);

  if (body.status && body.status !== existing.status) {
    await run('INSERT INTO activity_log (task_id, action, details) VALUES ($1, $2, $3)', [
      id, 'status_change', `${existing.status} → ${body.status}`,
    ]);
  }

  res.json(parseTags(task));
}));

// Delete task
router.delete('/:id', wrap(async (req, res) => {
  const { id } = req.params;
  const task = await one('SELECT * FROM tasks WHERE id = $1', [id]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!(await isMember(req.user.id, task.team_id))) return res.status(403).json({ error: 'Access denied' });

  await run('DELETE FROM tasks WHERE id = $1', [id]);
  await run('INSERT INTO activity_log (task_id, action, details) VALUES ($1, $2, $3)', [
    id, 'deleted', `Task deleted: ${task.title}`,
  ]);
  res.json({ success: true });
}));

// Activity log
router.get('/activity/:taskId', wrap(async (req, res) => {
  const task = await one('SELECT * FROM tasks WHERE id = $1', [req.params.taskId]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!(await isMember(req.user.id, task.team_id))) return res.status(403).json({ error: 'Access denied' });

  const logs = await all('SELECT * FROM activity_log WHERE task_id = $1 ORDER BY created_at DESC', [req.params.taskId]);
  res.json(logs);
}));

// Export CSV
router.get('/export/csv', wrap(async (req, res) => {
  const teamId = req.query.team || req.user.team_id;
  if (!(await isMember(req.user.id, teamId))) return res.status(403).json({ error: 'Not a member' });

  const tasks = await all('SELECT * FROM tasks WHERE team_id = $1', [teamId]);
  const header = 'ID,Title,Status,Assignee,Team,Priority,Due Date,Created\n';
  const rows = tasks.map(t =>
    `${t.id},"${t.title}",${t.status},${t.assignee},${t.team_id},${t.priority},${t.due_date},${t.created_at.toISOString()}`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=tasks.csv');
  res.send(header + rows);
}));

export default router;

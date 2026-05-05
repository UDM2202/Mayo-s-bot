import { Router } from 'express';
import db from '../db/schema.js';
import { v4 as uuid } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);   // every route below requires a valid token

// Get tasks for the logged-in user's team
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks WHERE team_id = ? ORDER BY created_at DESC').all(req.user.team_id);
  const tasks = rows.map(task => ({
    ...task,
    tags: JSON.parse(task.tags || '[]')
  }));
  res.json(tasks);
});

// Get single task (only if it belongs to the user's team)
router.get('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND team_id = ?').get(req.params.id, req.user.team_id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  task.tags = JSON.parse(task.tags || '[]');
  res.json(task);
});

// Create task – force team_id from the authenticated user
router.post('/', (req, res) => {
  const body = req.body;
  const id = uuid();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO tasks (id, title, description, status, assignee, team_id, priority, due_date, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    body.title || 'Untitled Task',
    body.description || '',
    body.status || 'pending',
    body.assignee || req.user.username,
    req.user.team_id,                         // always use the authenticated user's team
    body.priority || 'medium',
    body.due_date || '',
    JSON.stringify(body.tags || []),
    now,
    now
  );

  db.prepare('INSERT INTO activity_log (task_id, action, details) VALUES (?, ?, ?)').run(
    id, 'created', `Task created: ${body.title}`
  );

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  task.tags = JSON.parse(task.tags || '[]');
  res.status(201).json(task);
});

// Update task – verify ownership
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const body = req.body;
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND team_id = ?').get(id, req.user.team_id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, status = ?, assignee = ?, team_id = ?,
        priority = ?, due_date = ?, tags = ?, updated_at = ?
    WHERE id = ?
  `).run(
    body.title ?? existing.title,
    body.description ?? existing.description,
    body.status ?? existing.status,
    body.assignee ?? existing.assignee,
    req.user.team_id,                         // keep team unchanged
    body.priority ?? existing.priority,
    body.due_date ?? existing.due_date,
    JSON.stringify(body.tags ?? JSON.parse(existing.tags || '[]')),
    now,
    id
  );

  if (body.status && body.status !== existing.status) {
    db.prepare('INSERT INTO activity_log (task_id, action, details) VALUES (?, ?, ?)').run(
      id, 'status_change', `${existing.status} → ${body.status}`
    );
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  task.tags = JSON.parse(task.tags || '[]');
  res.json(task);
});

// Delete task – verify ownership
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND team_id = ?').get(id, req.user.team_id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  db.prepare('INSERT INTO activity_log (task_id, action, details) VALUES (?, ?, ?)').run(
    id, 'deleted', `Task deleted: ${task.title}`
  );
  res.json({ success: true });
});

// Activity log (optional, scoped)
router.get('/activity/:taskId', (req, res) => {
  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND team_id = ?').get(req.params.taskId, req.user.team_id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const logs = db.prepare('SELECT * FROM activity_log WHERE task_id = ? ORDER BY created_at DESC').all(req.params.taskId);
  res.json(logs);
});

// Export CSV – only the user's team tasks
router.get('/export/csv', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks WHERE team_id = ?').all(req.user.team_id);
  const header = 'ID,Title,Status,Assignee,Team,Priority,Due Date,Created\n';
  const rows = tasks.map(t =>
    `${t.id},"${t.title}",${t.status},${t.assignee},${t.team_id},${t.priority},${t.due_date},${t.created_at}`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=tasks.csv');
  res.send(header + rows);
});

export default router;
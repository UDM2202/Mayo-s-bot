import { Router } from 'express';
import db from '../db/schema.js';
import { v4 as uuid } from 'uuid';

const router = Router();

// Get all tasks
router.get('/', (req, res) => {
  const teamId = req.query.team;
  
  let rows;
  if (teamId) {
    rows = db.prepare('SELECT * FROM tasks WHERE team_id = ? ORDER BY created_at DESC').all(teamId);
  } else {
    rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
  }
  
  const tasks = rows.map(task => ({
    ...task,
    tags: JSON.parse(task.tags || '[]')
  }));
  
  res.json(tasks);
});

// Get single task
router.get('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  
  if (!task) return res.status(404).json({ error: 'Task not found' });
  
  task.tags = JSON.parse(task.tags || '[]');
  res.json(task);
});

// Create task
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
    body.assignee || '',
    body.team_id || 'engineering',
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

// Update task
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const body = req.body;
  const now = new Date().toISOString();
  
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
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
    body.team_id ?? existing.team_id,
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

// Delete task
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  
  if (!task) return res.status(404).json({ error: 'Task not found' });
  
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  db.prepare('INSERT INTO activity_log (task_id, action, details) VALUES (?, ?, ?)').run(
    id, 'deleted', `Task deleted: ${task.title}`
  );
  
  res.json({ success: true });
});

// Get activity log
router.get('/activity/:taskId', (req, res) => {
  const logs = db.prepare('SELECT * FROM activity_log WHERE task_id = ? ORDER BY created_at DESC').all(req.params.taskId);
  res.json(logs);
});
// Export CSV
router.get('/export/csv', (req, res) => {
  const teamId = req.query.team;
  let tasks;
  if (teamId) {
    tasks = db.prepare('SELECT * FROM tasks WHERE team_id = ?').all(teamId);
  } else {
    tasks = db.prepare('SELECT * FROM tasks').all();
  }

  const header = 'ID,Title,Status,Assignee,Team,Priority,Due Date,Created\n';
  const rows = tasks.map(t => 
    `${t.id},"${t.title}",${t.status},${t.assignee},${t.team_id},${t.priority},${t.due_date},${t.created_at}`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=tasks.csv');
  res.send(header + rows);
});

export default router;
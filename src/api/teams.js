import { Router } from 'express';
import db from '../db/schema.js';

const router = Router();

// Get all teams
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM teams ORDER BY name').all();
  res.json(rows);
});

// CREATE NEW TEAM
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Team name required' });
  
  const id = name.toLowerCase().replace(/\s+/g, '-');
  
  // Check if exists
  const existing = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  if (existing) return res.json(existing);
  
  db.prepare('INSERT INTO teams (id, name) VALUES (?, ?)').run(id, name.toLowerCase());
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  res.status(201).json(team);
});

// Get team stats
router.get('/:id/stats', (req, res) => {
  const { id } = req.params;
  const total = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE team_id = ?').get(id);
  const completed = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE team_id = ? AND status = 'completed'").get(id);
  const inProgress = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE team_id = ? AND status = 'in-progress'").get(id);
  const blocked = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE team_id = ? AND status = 'blocked'").get(id);
  
  res.json({
    total: total.count,
    completed: completed.count,
    inProgress: inProgress.count,
    blocked: blocked.count,
    completionRate: total.count ? Math.round((completed.count / total.count) * 100) : 0
  });
});

export default router;
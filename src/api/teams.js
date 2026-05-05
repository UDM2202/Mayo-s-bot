import { Router } from 'express';
import db from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Ensure team_members table
db.exec(`
  CREATE TABLE IF NOT EXISTS team_members (
    user_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    PRIMARY KEY (user_id, team_id)
  );
`);

// Get teams for current user
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT t.id, t.name FROM teams t
    INNER JOIN team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = ?
    ORDER BY t.name
  `).all(req.user.id);
  res.json(rows);
});

// Create team (and auto-join)
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Team name required' });

  const id = name.toLowerCase().replace(/\s+/g, '-');
  db.prepare('INSERT OR IGNORE INTO teams (id, name) VALUES (?, ?)').run(id, name.toLowerCase());
  db.prepare('INSERT OR IGNORE INTO team_members (user_id, team_id) VALUES (?, ?)').run(req.user.id, id);

  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  res.status(201).json(team);
});

// Join existing team
router.post('/join', (req, res) => {
  const { team_id } = req.body;
  if (!team_id) return res.status(400).json({ error: 'team_id required' });

  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(team_id);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  db.prepare('INSERT OR IGNORE INTO team_members (user_id, team_id) VALUES (?, ?)').run(req.user.id, team_id);
  res.json({ success: true, team });
});

// Leave team
router.post('/leave', (req, res) => {
  const { team_id } = req.body;
  if (!team_id) return res.status(400).json({ error: 'team_id required' });

  const count = db.prepare('SELECT COUNT(*) as cnt FROM team_members WHERE user_id = ?').get(req.user.id);
  if (count.cnt <= 1) return res.status(400).json({ error: 'Cannot leave your only team' });

  db.prepare('DELETE FROM team_members WHERE user_id = ? AND team_id = ?').run(req.user.id, team_id);
  res.json({ success: true });
});

// Team stats (unchanged)
router.get('/:id/stats', (req, res) => {
  const { id } = req.params;
  const member = db.prepare('SELECT * FROM team_members WHERE user_id = ? AND team_id = ?').get(req.user.id, id);
  if (!member) return res.status(403).json({ error: 'Not a member' });

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
import { Router } from 'express';
import { all, one, run } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Pass async errors to Express instead of crashing the request
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Get teams for current user
router.get('/', wrap(async (req, res) => {
  const rows = await all(`
    SELECT t.id, t.name FROM teams t
    INNER JOIN team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = $1
    ORDER BY t.name
  `, [req.user.id]);
  res.json(rows);
}));

// Create team (and auto-join)
router.post('/', wrap(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Team name required' });

  const id = name.toLowerCase().replace(/\s+/g, '-');
  await run('INSERT INTO teams (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, name.toLowerCase()]);
  await run('INSERT INTO team_members (user_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, id]);

  const team = await one('SELECT * FROM teams WHERE id = $1', [id]);
  res.status(201).json(team);
}));

// Join existing team
router.post('/join', wrap(async (req, res) => {
  const { team_id } = req.body;
  if (!team_id) return res.status(400).json({ error: 'team_id required' });

  const team = await one('SELECT * FROM teams WHERE id = $1', [team_id]);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  await run('INSERT INTO team_members (user_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, team_id]);
  res.json({ success: true, team });
}));

// Leave team
router.post('/leave', wrap(async (req, res) => {
  const { team_id } = req.body;
  if (!team_id) return res.status(400).json({ error: 'team_id required' });

  const { cnt } = await one('SELECT COUNT(*)::int AS cnt FROM team_members WHERE user_id = $1', [req.user.id]);
  if (cnt <= 1) return res.status(400).json({ error: 'Cannot leave your only team' });

  await run('DELETE FROM team_members WHERE user_id = $1 AND team_id = $2', [req.user.id, team_id]);
  res.json({ success: true });
}));

// Team stats
router.get('/:id/stats', wrap(async (req, res) => {
  const { id } = req.params;
  const member = await one('SELECT 1 FROM team_members WHERE user_id = $1 AND team_id = $2', [req.user.id, id]);
  if (!member) return res.status(403).json({ error: 'Not a member' });

  const s = await one(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (WHERE status = 'in-progress')::int AS in_progress,
           COUNT(*) FILTER (WHERE status = 'blocked')::int AS blocked
    FROM tasks WHERE team_id = $1
  `, [id]);

  res.json({
    total: s.total,
    completed: s.completed,
    inProgress: s.in_progress,
    blocked: s.blocked,
    completionRate: s.total ? Math.round((s.completed / s.total) * 100) : 0
  });
}));

export default router;

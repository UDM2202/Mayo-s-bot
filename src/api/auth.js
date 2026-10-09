import { Router } from 'express';
import crypto from 'crypto';
import { one, run } from '../db/schema.js';

const router = Router();

// Make sure the user belongs to their default team so the dashboard can see its tasks
async function ensureDefaultTeam(userId, teamId) {
  await run('INSERT INTO teams (id, name) VALUES ($1, $1) ON CONFLICT DO NOTHING', [teamId]);
  await run('INSERT INTO team_members (user_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, teamId]);
}

function simpleHash(str) {
  return crypto.createHash('sha256').update(str + 'taskonbot-secret').digest('hex');
}

router.post('/register', async (req, res) => {
  try {
    const { username, password, team_id } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const existing = await one('SELECT id FROM users WHERE username = $1', [username]);
    if (existing) return res.status(400).json({ error: 'Username taken' });
    const hash = simpleHash(password);
    const id = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const team = team_id || 'engineering';
    await run('INSERT INTO users (id, username, password, team_id, token) VALUES ($1, $2, $3, $4, $5)', [id, username, hash, team, token]);
    await ensureDefaultTeam(id, team);
    res.json({ success: true, user: { id, username, team_id: team, token } });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user = await one('SELECT * FROM users WHERE username = $1', [username]);
    if (!user || user.password !== simpleHash(password)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = crypto.randomBytes(32).toString('hex');
    await run('UPDATE users SET token = $1 WHERE id = $2', [token, user.id]);
    await ensureDefaultTeam(user.id, user.team_id || 'engineering');
    res.json({ success: true, user: { id: user.id, username, team_id: user.team_id, token } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;

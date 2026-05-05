import { Router } from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', 'taskonbot.db');
const db = new Database(DB_PATH);

// Ensure users table has a token column
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    team_id TEXT DEFAULT 'engineering',
    token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

function simpleHash(str) {
  return crypto.createHash('sha256').update(str + 'taskonbot-secret').digest('hex');
}

// Register
router.post('/register', (req, res) => {
  try {
    const { username, password, team_id } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (existing) return res.status(400).json({ error: 'Username taken' });

    const hash = simpleHash(password);
    const id = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');

    db.prepare('INSERT INTO users (id, username, password, team_id, token) VALUES (?, ?, ?, ?, ?)')
      .run(id, username, hash, team_id || 'engineering', token);

    res.json({ success: true, user: { id, username, team_id: team_id || 'engineering', token } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const hash = simpleHash(password);
    if (hash !== user.password) return res.status(401).json({ error: 'Invalid credentials' });

    // Generate a new token on each login
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare('UPDATE users SET token = ? WHERE id = ?').run(token, user.id);

    res.json({ success: true, user: { id: user.id, username: user.username, team_id: user.team_id, token } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
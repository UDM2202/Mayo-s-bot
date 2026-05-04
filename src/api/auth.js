import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/schema.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'taskonbot-secret-key-change-me';

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    team_id TEXT DEFAULT 'engineering',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Register
router.post('/register', async (req, res) => {
  const { username, password, team_id } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  
  const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (existing) return res.status(400).json({ error: 'Username taken' });
  
  const hash = await bcrypt.hash(password, 10);
  const id = require('crypto').randomUUID();
  db.prepare('INSERT INTO users (id, username, password, team_id) VALUES (?, ?, ?, ?)').run(id, username, hash, team_id || 'engineering');
  
  const token = jwt.sign({ id, username, team_id }, JWT_SECRET);
  res.json({ token, user: { id, username, team_id } });
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });
  
  const token = jwt.sign({ id: user.id, username: user.username, team_id: user.team_id }, JWT_SECRET);
  res.json({ token, user: { id: user.id, username: user.username, team_id: user.team_id } });
});

// Verify token middleware
export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export default router;
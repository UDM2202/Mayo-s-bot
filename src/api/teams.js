import { Router } from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'taskonbot.db');
const db = new Database(DB_PATH);

// Get all teams
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM teams ORDER BY name').all();
  res.json(rows);
});

// Create team
router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    
    const id = name.toLowerCase().replace(/\s+/g, '-');
    
    const existing = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
    if (existing) return res.json(existing);
    
    db.prepare('INSERT INTO teams (id, name) VALUES (?, ?)').run(id, name.toLowerCase());
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
    
    res.status(201).json(team);
  } catch (err) {
    console.error('Team create error:', err);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

export default router;
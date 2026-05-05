import { Router } from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const router = Router();
const DB_PATH = path.join(process.cwd(), 'taskonbot.db');
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    team_id TEXT UNIQUE,
    team_name TEXT,
    access_token TEXT NOT NULL,
    bot_user_id TEXT,
    scope TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add to Slack button
router.get('/slack/install', (req, res) => {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = `https://mayo-s-bot-production.up.railway.app/api/slack/oauth/callback`;
  
  if (!clientId) return res.status(500).send('Missing SLACK_CLIENT_ID');
  
  const scopes = ['commands','chat:write','chat:read','channels:history'].join(',');
  res.redirect(`https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`);
});

// OAuth callback
router.get('/slack/oauth/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.send(`❌ ${error}`);
  if (!code) return res.send('❌ No code');

  try {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code: code,
        redirect_uri: `https://mayo-s-bot-production.up.railway.app/api/slack/oauth/callback`,
      }),
    });
    
    const data = await response.json();
    if (!data.ok) return res.send(`❌ ${data.error}`);
    
    const { team, access_token, bot_user_id, scope } = data;
    const id = crypto.randomUUID();
    
    db.prepare(`INSERT OR REPLACE INTO workspaces (id, team_id, team_name, access_token, bot_user_id, scope) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, team.id, team.name, access_token, bot_user_id, scope);
    
    console.log(`✅ Slack installed: ${team.name}`);
    
    res.send(`
      <!DOCTYPE html><html><head><title>Installed!</title>
      <style>body{font-family:system-ui;background:#0a0a0f;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}
      .card{background:#131320;border:1px solid#242438;border-radius:16px;padding:48px;text-align:center}
      h1{font-size:24px}.purple{color:#a78bfa}p{color:#94a3b8}</style></head>
      <body><div class="card"><h1>✅ Task<span class="purple">On</span>Bot Installed!</h1>
      <p>Workspace: <strong>${team.name}</strong></p><p>Try <code>/taskon</code> in Slack!</p></div></body></html>`);
  } catch(err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

export default router;

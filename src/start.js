import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import tasksRouter from './api/tasks.js';
import teamsRouter from './api/teams.js';
import authRouter from './api/auth.js';
import slackReceiver from './slack-bot.js';

const app = express();
const port = process.env.PORT || 8080;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());

// ── 1. Serve static files FIRST ──
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── 2. API routes ──
app.use('/api/tasks', tasksRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/auth', authRouter);

// ── 3. Slack bot (only for /slack paths) ──
app.use(slackReceiver.router);

// ── 4. Health check ──
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── 5. SPA fallback (non-API, non-slack routes → index.html) ──
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/slack')) {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
});

app.listen(port, () => console.log(`✅ TaskOnBot running on port ${port}`));
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import tasksRouter from './api/tasks.js';
import teamsRouter from './api/teams.js';
import authRouter from './api/auth.js';
import slackReceiver from './slack-bot.js';

const app = express();
const port = process.env.PORT || 8080;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());

// Slack bot — MUST be before other routes
app.use(slackReceiver.router);

// API
app.use('/api/tasks', tasksRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/auth', authRouter);

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Static files
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/slack')) {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
});

app.listen(port, () => console.log(`✅ Running on port ${port}`));
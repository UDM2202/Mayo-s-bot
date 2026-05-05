import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import tasksRouter from './api/tasks.js';
import teamsRouter from './api/teams.js';
import authRouter from './api/auth.js';
import slackOauthRouter from './api/slack-oauth.js';

const app = express();
const port = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Slack events endpoint
app.post('/slack/events', (req, res) => {
  if (req.body.type === 'url_verification') {
    return res.json({ challenge: req.body.challenge });
  }
  res.sendStatus(200);
});

// Slack URL verification
app.post('/slack/events', (req, res) => {
  const { type, challenge } = req.body;
  
  // URL verification challenge
  if (type === 'url_verification') {
    return res.json({ challenge });
  }
  
  // Handle other events
  res.sendStatus(200);
});

// API Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/auth', authRouter);
app.use('/api', slackOauthRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Catch-all
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
});

app.listen(port, () => {
  console.log(`✅ TaskOnBot running on port ${port}`);
});
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import tasksRouter from './api/tasks.js';
import teamsRouter from './api/teams.js';
import authRouter from './api/auth.js';
import slackOauthRouter from './api/slack-oauth.js';
import slackReceiver from './slack-bot.js';

const app = express();
const port = process.env.PORT || 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// Slack bot - mount on same port
app.use(slackReceiver.router);

// API
app.use('/api/tasks', tasksRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/auth', authRouter);
app.use('/api', slackOauthRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use(express.static(path.join(__dirname, '..', 'dist')));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
});

app.listen(port, () => console.log(`✅ TaskOnBot on port ${port}`));
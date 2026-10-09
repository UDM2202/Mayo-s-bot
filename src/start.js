import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { ready } from './db/schema.js';
import tasksRouter from './api/tasks.js';
import teamsRouter from './api/teams.js';
import authRouter from './api/auth.js';
import slackReceiver from './slack-bot.js';

const app = express();
const port = process.env.PORT || 8080;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());

// 1. Static files and SPA fallback (before Slack routes)
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// 2. API routes
app.use('/api/tasks', tasksRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/auth', authRouter);

// 3. Slack bot (only /slack paths)
app.use(slackReceiver.router);

// 4. Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// 5. Catch-all to index.html for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/slack')) return next();
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// Errors from async routes
app.use((err, req, res, next) => {
  console.error('Request error:', err.message);
  res.status(500).json({ error: 'Server error' });
});

ready
  .then(() => app.listen(port, () => console.log(`✅ TaskOnBot running on port ${port}`)))
  .catch((err) => {
    console.error('❌ Could not connect to the database:', err.message);
    process.exit(1);
  });
import express from 'express';
import cors from 'cors';
import tasksRouter from './api/tasks.js';
import teamsRouter from './api/teams.js';
import authRouter from './api/auth.js';
import 'dotenv/config';


const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/auth', authRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import slackOauthRouter from './api/slack-oauth.js';
app.use('/api', slackOauthRouter);

// Serve static files
app.use(express.static('public'));

app.listen(port, () => {
  console.log(`
🤖 TaskOnBot API Server
━━━━━━━━━━━━━━━━━━━━━━
🚀 Running on: http://localhost:${port}
📋 Health: http://localhost:${port}/api/health
━━━━━━━━━━━━━━━━━━━━━━
  `);
});
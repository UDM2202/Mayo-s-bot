import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Debug route - shows what env vars are available
app.get('/api/debug', (req, res) => {
  res.json({
    has_client_id: !!process.env.SLACK_CLIENT_ID,
    has_client_secret: !!process.env.SLACK_CLIENT_SECRET,
    has_bot_token: !!process.env.SLACK_BOT_TOKEN,
    has_app_token: !!process.env.SLACK_APP_TOKEN,
    has_signing_secret: !!process.env.SLACK_SIGNING_SECRET,
    port: process.env.PORT,
    node_env: process.env.NODE_ENV,
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('SLACK_CLIENT_ID exists:', !!process.env.SLACK_CLIENT_ID);
});
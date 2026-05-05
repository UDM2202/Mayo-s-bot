import { spawn } from 'child_process';

console.log('Starting API server...');
const server = spawn('node', ['src/server.js'], { stdio: 'inherit' });

console.log('Starting Slack bot...');
const bot = spawn('node', ['src/slack-bot.js'], { stdio: 'inherit' });

process.on('SIGTERM', () => {
  server.kill();
  bot.kill();
  process.exit(0);
});

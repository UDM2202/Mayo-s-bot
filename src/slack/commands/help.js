import { registerCommand } from '../commands';

registerCommand({
  name: 'taskon',
  description: 'TaskOnBot AI-powered task manager',
  handler: async ({ command, say }) => {
    const helpText = `
🤖 *TaskOnBot - AI-Powered Task Manager*

*Commands:*
• \`/taskon help\` - Show this message
• \`/taskon ping\` - Check if the bot is alive
• \`/taskon create <title>\` - Create a new task *(coming soon)*
• \`/taskon progress <team>\` - View team progress *(coming soon)*
• \`/taskon agent <query>\` - Ask the AI agent *(coming soon)*

*Example:*
\`/taskon create Review PR #42 for auth module\`

_AI agents standing by..._ ✨
    `;

    await say({
      text: helpText,
      mrkdwn: true,
    });
  },
});

registerCommand({
  name: 'ping',
  description: 'Check bot status',
  handler: async ({ say }) => {
    const pingEmojis = ['🏓', '⚡', '🚀', '💫'];
    const emoji = pingEmojis[Math.floor(Math.random() * pingEmojis.length)];
    
    await say({
      text: `${emoji} *Pong!* TaskOnBot is alive and ready.\n_AI agents: Online | Teams: 3 | Members: 11_`,
      mrkdwn: true,
    });
  },
});
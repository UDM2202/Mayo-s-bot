const commandRegistry = new Map();

export function registerCommand(command) {
  commandRegistry.set(command.name, command);
  console.log(`📎 Registered command: /${command.name} - ${command.description}`);
}

export async function handleCommand(args) {
  const { command, ack, say } = args;
  const { command: commandName, text, user_id, channel_id, team_id } = command;

  await ack();

  const handler = commandRegistry.get(commandName);
  
  if (!handler) {
    await say({
      text: `❓ Unknown command \`/${commandName}\`. Try \`/taskon help\`.`,
    });
    return;
  }

  try {
    await handler.handler(args);
  } catch (error) {
    console.error(`Error handling command /${commandName}:`, error);
    await say({
      text: `⚠️ Something went wrong. AI agents investigating.`,
    });
  }
}
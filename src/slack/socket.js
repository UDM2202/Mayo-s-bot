import { SocketModeClient } from '@slack/socket-mode';
import { WebClient } from '@slack/web-api';

let socketClient = null;
let webClient = null;

export function getSocketClient() {
  if (!socketClient) {
    const appToken = import.meta.env.VITE_SLACK_APP_TOKEN;
    if (!appToken) throw new Error('VITE_SLACK_APP_TOKEN is required');

    socketClient = new SocketModeClient({
      appToken,
      logLevel: 'info',
    });
  }
  return socketClient;
}

export function getWebClient() {
  if (!webClient) {
    const botToken = import.meta.env.VITE_SLACK_BOT_TOKEN;
    if (!botToken) throw new Error('VITE_SLACK_BOT_TOKEN is required');

    webClient = new WebClient(botToken);
  }
  return webClient;
}
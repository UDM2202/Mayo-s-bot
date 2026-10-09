import { one, run } from './db/schema.js';

// Slack installations (bot tokens), one row per workspace or enterprise
export async function saveInstallation(installation) {
  const key = installation.team?.id ?? installation.enterprise?.id;
  console.log('[saveInstallation] saving key:', key);
  await run(`
    INSERT INTO slack_installations (id, data, updated_at) VALUES ($1, $2, now())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `, [key, installation]);
}

export async function fetchInstallation({ teamId, enterpriseId }) {
  const key = teamId ?? enterpriseId;
  const row = await one('SELECT data FROM slack_installations WHERE id = $1', [key]);
  if (!row) throw new Error(`No installation found for ${key}`);
  return row.data;
}

export async function deleteInstallation({ teamId, enterpriseId }) {
  const key = teamId ?? enterpriseId;
  await run('DELETE FROM slack_installations WHERE id = $1', [key]);
}

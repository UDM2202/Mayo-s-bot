import crypto from 'crypto';
import { one, run } from './db/schema.js';

export function createStateStore() {
  return {
    generateStateParam: async (installUrlOptions, date) => {
      const state = crypto.randomBytes(16).toString('hex');
      await run('INSERT INTO oauth_states (state, created_at) VALUES ($1, $2)', [state, Date.now()]);
      return state;
    },
    verifyStateParam: async (date, state) => {
      const row = await one('SELECT state, created_at FROM oauth_states WHERE state = $1', [state]);
      if (!row) throw new Error('State not found');
      await run('DELETE FROM oauth_states WHERE state = $1', [state]);
      if (Date.now() - Number(row.created_at) > 10 * 60 * 1000) throw new Error('State expired');
      return row.state;
    },
  };
}

import crypto from 'crypto';

export function createStateStore(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    )
  `);

  return {
    generateState: async () => {
      const state = crypto.randomBytes(16).toString('hex');
      db.prepare('INSERT INTO oauth_states (state, created_at) VALUES (?, ?)').run(state, Date.now());
      return state;
    },
    verifyState: async (state) => {
      const row = db.prepare('SELECT state, created_at FROM oauth_states WHERE state = ?').get(state);
      if (!row) throw new Error('State not found');
      if (Date.now() - row.created_at > 10 * 60 * 1000) {
        db.prepare('DELETE FROM oauth_states WHERE state = ?').run(state);
        throw new Error('State expired');
      }
      db.prepare('DELETE FROM oauth_states WHERE state = ?').run(state);
      return state;
    },
  };
}
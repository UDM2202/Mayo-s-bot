import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, '..', 'installations.json');

function readStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading store:', e);
  }
  return {};
}

function writeStore(data) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
    console.log('Store written to', STORE_PATH);
  } catch (e) {
    console.error('Error writing store:', e);
  }
}

export async function saveInstallation(installation) {
  const key = installation.team?.id ?? installation.enterprise?.id;
  console.log('[saveInstallation] saving key:', key);
  console.log('[saveInstallation] bot token present:', !!installation.bot?.token);
  
  const store = readStore();
  store[key] = installation;
  writeStore(store);
}

export async function fetchInstallation({ teamId, enterpriseId }) {
  const key = teamId ?? enterpriseId;
  console.log('[fetchInstallation] looking up key:', key);
  
  const store = readStore();
  console.log('[fetchInstallation] available keys:', Object.keys(store));
  
  if (!store[key]) {
    throw new Error(`No installation found for ${key}`);
  }
  return store[key];
}

export async function deleteInstallation({ teamId, enterpriseId }) {
  const key = teamId ?? enterpriseId;
  const store = readStore();
  delete store[key];
  writeStore(store);
}
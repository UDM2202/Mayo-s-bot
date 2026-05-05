const store = new Map();

export async function saveInstallation(installation) {
  const key = installation.team?.id ?? installation.enterprise?.id;
  store.set(key, installation);
  console.log(`✅ Saved installation for team: ${key}`);
}

export async function fetchInstallation({ teamId, enterpriseId }) {
  const key = teamId ?? enterpriseId;
  const installation = store.get(key);
  if (!installation) throw new Error(`No installation found for ${key}`);
  return installation;
}

export async function deleteInstallation({ teamId, enterpriseId }) {
  const key = teamId ?? enterpriseId;
  store.delete(key);
}
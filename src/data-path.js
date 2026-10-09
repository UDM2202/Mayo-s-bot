import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// All persistent files live here. On Render, point DATA_DIR at the mounted disk.
export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const DB_PATH = path.join(DATA_DIR, 'taskonbot.db');

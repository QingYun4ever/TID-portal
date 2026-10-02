import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { exportContent } from './content-sync.ts';

const database = process.env.DB_PATH || path.resolve(process.env.DATA_DIR || 'data', 'portal.db');
const destination = path.resolve('data/display-content.json');
if (!fs.existsSync(database)) {
  if (!process.argv.includes('--if-present') || !fs.existsSync(destination)) {
    throw new Error('Local data/portal.db or a committed data/display-content.json snapshot is required');
  }
  console.log('[content] Using committed display-content.json; no local database available.');
} else {
  // Reuse the application's schema migrations and configured database path.
  // The read transaction includes committed WAL changes without copying SQLite files.
  // Static import would create a database during Docker builds that only have the snapshot.
  const { db } = await import('./db.ts');
  try {
    const snapshot = exportContent(db);
    const temporary = `${destination}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(snapshot, null, 2) + '\n');
    fs.renameSync(temporary, destination);
    console.log(`[content] Exported ${Object.values(snapshot.tables).reduce((count, rows) => count + rows.length, 0)} editorial rows; user data excluded.`);
  } finally {
    db.close();
  }
}

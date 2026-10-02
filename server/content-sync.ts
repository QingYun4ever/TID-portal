import { createHash } from 'node:crypto';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';

type ContentRow = Record<string, SQLInputValue>;
interface TableSpec {
  name: string;
  keys: string[];
  columns: string[];
  relation?: { column: string; table: string };
}

// Only editorial fields cross deployments. Runtime counters, authors and user data do not.
export const CONTENT_TABLES: TableSpec[] = [
  { name: 'articles', keys: ['slug'], columns: ['title', 'slug', 'category', 'summary', 'content', 'cover', 'tags', 'pinned', 'status', 'publishedAt'] },
  { name: 'activities', keys: ['slug'], columns: ['title', 'slug', 'cover', 'summary', 'content', 'location', 'category', 'startAt', 'endAt', 'signupStart', 'signupEnd', 'capacity', 'status'] },
  { name: 'projects', keys: ['slug'], columns: ['title', 'slug', 'cover', 'demoUrl', 'modelUrl', 'summary', 'content', 'category', 'year', 'team', 'members', 'advisor', 'tags', 'awards', 'status'] },
  { name: 'competitions', keys: ['title'], columns: ['title', 'level', 'organizer', 'summary', 'content', 'signupDeadline', 'link', 'cover', 'status'] },
  { name: 'resources', keys: ['title', 'category'], columns: ['title', 'category', 'description', 'url', 'fileType', 'fileSize', 'external', 'sortOrder'] },
  { name: 'join_positions', keys: ['name', 'group'], columns: ['name', 'group', 'headcount', 'description', 'requirements', 'sortOrder', 'active'] },
  { name: 'members', keys: ['name', 'group'], columns: ['name', 'role', 'group', 'avatar', 'bio', 'tags', 'sortOrder', 'featured'] },
  { name: 'timeline', keys: ['year', 'title'], columns: ['year', 'title', 'description', 'dateLabel', 'sortOrder'] },
  { name: 'org_nodes', keys: ['name', 'parentId'], columns: ['name', 'parentId', 'leader', 'description', 'sortOrder'], relation: { column: 'parentId', table: 'org_nodes' } },
  { name: 'gallery_areas', keys: ['slug'], columns: ['name', 'slug', 'parentId', 'description', 'sortOrder'], relation: { column: 'parentId', table: 'gallery_areas' } },
  { name: 'gallery_images', keys: ['areaId', 'url'], columns: ['areaId', 'url', 'title', 'description', 'width', 'height', 'sortOrder'], relation: { column: 'areaId', table: 'gallery_areas' } },
  { name: 'attachments', keys: ['ownerType', 'ownerId', 'name'], columns: ['ownerType', 'ownerId', 'name', 'url', 'size'] },
  { name: 'pages', keys: ['key'], columns: ['key', 'title', 'content'] },
];
export const CONTENT_SETTING_KEYS = ['deptName', 'deptNameEn', 'slogan', 'foundedAt', 'icp', 'email', 'address', 'intro', 'wechatQr'];
export interface ContentSnapshot {
  version: 1;
  tables: Record<string, ContentRow[]>;
  settings: { key: string; value: string }[];
}

export function exportContent(db: DatabaseSync): ContentSnapshot {
  db.exec('BEGIN');
  try {
    const tables: Record<string, ContentRow[]> = {};
    for (const spec of CONTENT_TABLES) {
      const selection = spec.name === 'pages' ? spec.columns : ['id', ...spec.columns];
      const filter = spec.name === 'attachments' ? " WHERE ownerType IN ('article','activity')" : '';
      const order = spec.name === 'pages' ? 'key' : 'id';
      tables[spec.name] = db.prepare(`SELECT ${selection.map(column => `"${column}"`).join(',')} FROM "${spec.name}"${filter} ORDER BY "${order}"`).all() as ContentRow[];
    }
    const settings = db.prepare(`SELECT key,value FROM settings WHERE key IN (${CONTENT_SETTING_KEYS.map(() => '?').join(',')}) ORDER BY key`).all(...CONTENT_SETTING_KEYS) as ContentSnapshot['settings'];
    db.exec('COMMIT');
    return { version: 1, tables, settings };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/** Match editorial identities, never local numeric IDs. Keep user foreign keys and counters intact. */
export function syncContent(db: DatabaseSync, snapshot: ContentSnapshot): boolean {
  if (snapshot.version !== 1) throw new Error('Unsupported content snapshot version');
  const revision = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
  db.exec('BEGIN IMMEDIATE');
  try {
    const applied = db.prepare('SELECT value FROM settings WHERE key=?').get('deployed_content_sha256');
    if (applied?.value === revision) {
      db.exec('COMMIT');
      return false;
    }
    const ids = new Map<string, Map<number, number>>();
    for (const spec of CONTENT_TABLES) {
      const mapping = new Map<number, number>();
      ids.set(spec.name, mapping);
      const rows = snapshot.tables[spec.name];
      if (!Array.isArray(rows)) throw new Error(`Missing content table: ${spec.name}`);
      const pending = [...rows];
      const seen = new Set<string>();
      const lookup = db.prepare(`SELECT ${spec.name === 'pages' ? 'key' : 'id'} FROM "${spec.name}" WHERE ${spec.keys.map(key => `"${key}" IS ?`).join(' AND ')} LIMIT 2`);
      const update = db.prepare(`UPDATE "${spec.name}" SET ${spec.columns.map(column => `"${column}"=?`).join(',')} WHERE "${spec.name === 'pages' ? 'key' : 'id'}"=?`);
      const insert = db.prepare(`INSERT INTO "${spec.name}" (${spec.columns.map(column => `"${column}"`).join(',')}) VALUES (${spec.columns.map(() => '?').join(',')})`);
      while (pending.length) {
        let progress = false;
        for (let index = 0; index < pending.length;) {
          const source = pending[index];
          const row: ContentRow = {};
          for (const column of spec.columns) {
            if (!(column in source)) throw new Error(`Missing content field: ${spec.name}.${column}`);
            row[column] = source[column];
          }
          if (spec.relation && row[spec.relation.column] !== null) {
            const target = ids.get(spec.relation.table)?.get(Number(row[spec.relation.column]));
            if (target === undefined) { index++; continue; }
            row[spec.relation.column] = target;
          }
          if (spec.name === 'attachments') {
            const owner = row.ownerType === 'article' ? 'articles' : row.ownerType === 'activity' ? 'activities' : null;
            const target = owner ? ids.get(owner)?.get(Number(row.ownerId)) : undefined;
            if (target === undefined) throw new Error('Unresolved public attachment owner');
            row.ownerId = target;
          }
          const key = JSON.stringify(spec.keys.map(column => row[column]));
          if (seen.has(key)) throw new Error(`Duplicate content identity: ${spec.name} ${key}`);
          seen.add(key);
          const matches = lookup.all(...spec.keys.map(column => row[column]));
          if (matches.length > 1) throw new Error(`Ambiguous destination content identity: ${spec.name} ${key}`);
          const values = spec.columns.map(column => row[column]);
          let targetId: number | undefined;
          if (matches.length) {
            const id = matches[0][spec.name === 'pages' ? 'key' : 'id'];
            update.run(...values, id);
            if (spec.name !== 'pages') targetId = Number(id);
          } else {
            const result = insert.run(...values);
            if (spec.name !== 'pages') targetId = Number(result.lastInsertRowid);
          }
          if (targetId !== undefined) mapping.set(Number(source.id), targetId);
          pending.splice(index, 1);
          progress = true;
        }
        if (!progress) throw new Error(`Unresolved content parent references: ${spec.name}`);
      }
    }
    const setting = db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    for (const row of snapshot.settings) {
      if (!CONTENT_SETTING_KEYS.includes(row.key)) throw new Error(`Non-editorial setting in snapshot: ${row.key}`);
      setting.run(row.key, row.value);
    }
    setting.run('deployed_content_sha256', revision);
    db.exec('COMMIT');
    return true;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

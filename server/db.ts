/* =============================================================================
 * 数据库层 — node:sqlite (Node 24 内置，零原生依赖)
 * 启动时自动建表 + 播种演示数据
 * ========================================================================== */
import { DatabaseSync } from 'node:sqlite';
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'portal.db');

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

/* -------------------------------------------------------------------------- */
/*  Schema                                                                    */
/* -------------------------------------------------------------------------- */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL DEFAULT '!',
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  email TEXT, phone TEXT, avatar TEXT, studentId TEXT, college TEXT,
  isActive INTEGER NOT NULL DEFAULT 1,
  lastLoginAt TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  oidcIssuer TEXT,
  oidcSubject TEXT
);

CREATE TABLE IF NOT EXISTS oidc_login_flows (
  stateHash TEXT PRIMARY KEY,
  browserHash TEXT NOT NULL,
  codeVerifier TEXT NOT NULL,
  nonce TEXT NOT NULL,
  redirectPath TEXT NOT NULL,
  expiresAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'dept',
  summary TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  cover TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  pinned INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  views INTEGER NOT NULL DEFAULT 0,
  authorId INTEGER,
  publishedAt TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ownerType TEXT NOT NULL,
  ownerId INTEGER NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cover TEXT,
  summary TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '讲座',
  startAt TEXT NOT NULL,
  endAt TEXT,
  signupStart TEXT,
  signupEnd TEXT,
  capacity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS activity_signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activityId INTEGER NOT NULL,
  userId INTEGER,
  name TEXT NOT NULL,
  studentId TEXT NOT NULL,
  college TEXT NOT NULL DEFAULT '',
  major TEXT, phone TEXT NOT NULL DEFAULT '', email TEXT, remark TEXT,
  checkedIn INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (activityId) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_signup_uniq ON activity_signups(activityId, studentId);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cover TEXT, demoUrl TEXT, modelUrl TEXT, summary TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'ongoing',
  year INTEGER NOT NULL DEFAULT 2026,
  team TEXT NOT NULL DEFAULT '', members TEXT NOT NULL DEFAULT '[]',
  advisor TEXT, tags TEXT NOT NULL DEFAULT '[]', awards TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  views INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS competitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL, level TEXT NOT NULL DEFAULT '校级', organizer TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '',
  signupDeadline TEXT, link TEXT, cover TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS project_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  competitionId INTEGER,
  leaderName TEXT NOT NULL, leaderStudentId TEXT NOT NULL,
  leaderCollege TEXT NOT NULL DEFAULT '', leaderPhone TEXT NOT NULL DEFAULT '', leaderEmail TEXT,
  advisor TEXT, teamSize INTEGER NOT NULL DEFAULT 1,
  members TEXT NOT NULL DEFAULT '[]', category TEXT NOT NULL DEFAULT '科技制作',
  intro TEXT NOT NULL DEFAULT '', materials TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending', reviewNote TEXT,
  userId INTEGER,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (competitionId) REFERENCES competitions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'template',
  description TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '',
  fileType TEXT NOT NULL DEFAULT 'PDF', fileSize INTEGER NOT NULL DEFAULT 0,
  downloads INTEGER NOT NULL DEFAULT 0, external INTEGER NOT NULL DEFAULT 0,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS join_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, "group" TEXT NOT NULL DEFAULT '', headcount INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL DEFAULT '', requirements TEXT NOT NULL DEFAULT '[]',
  sortOrder INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS join_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  positionId INTEGER, name TEXT NOT NULL, studentId TEXT NOT NULL,
  college TEXT NOT NULL DEFAULT '', major TEXT NOT NULL DEFAULT '', grade TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '', email TEXT, skills TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', reviewNote TEXT,
  userId INTEGER,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (positionId) REFERENCES join_positions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'consult', title TEXT NOT NULL, content TEXT NOT NULL,
  contact TEXT, anonymous INTEGER NOT NULL DEFAULT 1, authorName TEXT,
  status TEXT NOT NULL DEFAULT 'open', reply TEXT, repliedAt TEXT,
  likes INTEGER NOT NULL DEFAULT 0, userId INTEGER,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS gallery_areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, parentId INTEGER,
  description TEXT, sortOrder INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (parentId) REFERENCES gallery_areas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gallery_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  areaId INTEGER NOT NULL, url TEXT NOT NULL, title TEXT NOT NULL DEFAULT '',
  description TEXT, width INTEGER NOT NULL DEFAULT 0, height INTEGER NOT NULL DEFAULT 0,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (areaId) REFERENCES gallery_areas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  dateLabel TEXT NOT NULL DEFAULT '',
  sortOrder INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS org_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, parentId INTEGER, leader TEXT, description TEXT,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (parentId) REFERENCES org_nodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, role TEXT NOT NULL DEFAULT '', "group" TEXT NOT NULL DEFAULT '',
  avatar TEXT, bio TEXT, tags TEXT NOT NULL DEFAULT '[]',
  sortOrder INTEGER NOT NULL DEFAULT 0, featured INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS join_admissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  className TEXT NOT NULL,
  sortOrder INTEGER NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS pages (
  key TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '',
  updatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS status_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'website', url TEXT, host TEXT,
  description TEXT, sortOrder INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS status_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  targetId INTEGER NOT NULL, online INTEGER NOT NULL DEFAULT 1, latencyMs INTEGER,
  checkedAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (targetId) REFERENCES status_targets(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_snap_target ON status_snapshots(targetId, checkedAt);

CREATE TABLE IF NOT EXISTS user_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '',
  read INTEGER NOT NULL DEFAULT 0, link TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER, userName TEXT, action TEXT NOT NULL, target TEXT, detail TEXT, ip TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT ''
);
`;

db.exec(SCHEMA);

/* -------------------------------------------------------------------------- */
/*  轻量迁移：为已存在的库补列（幂等）                                          */
/* -------------------------------------------------------------------------- */
const MIGRATIONS: [string, string, string][] = [
  ['users', 'lastLoginAt', 'TEXT'],
  ['users', 'oidcIssuer', 'TEXT'],
  ['users', 'oidcSubject', 'TEXT'],
  ['articles', 'rejectReason', 'TEXT'],
  ['projects', 'demoUrl', 'TEXT'],
  ['projects', 'modelUrl', 'TEXT'],
  ['project_applications', 'reviewNote', 'TEXT'],
  ['timeline', 'dateLabel', "TEXT NOT NULL DEFAULT ''"],
];

function migrate() {
  for (const [table, column, type] of MIGRATIONS) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`[db] migrate: ${table}.${column} added`);
      if (table === 'timeline' && column === 'dateLabel') {
        const events = db.prepare('SELECT id, description FROM timeline').all() as { id: number; description: string }[];
        const updateDate = db.prepare('UPDATE timeline SET dateLabel = ? WHERE id = ?');
        for (const event of events) {
          const date = event.description.match(/^\s*\d{4}\s*年\s*(\d{1,2})\s*月(?:\s*(\d{1,2})\s*日)?/);
          if (!date) continue;
          const month = date[1].padStart(2, '0');
          const label = date[2] ? `${month}.${date[2].padStart(2, '0')}` : `${month}月`;
          updateDate.run(label, event.id);
        }
      }
    }
  }
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_oidc_identity ON users (oidcIssuer, oidcSubject) WHERE oidcIssuer IS NOT NULL AND oidcSubject IS NOT NULL');
}

/* -------------------------------------------------------------------------- */
/*  查询辅助                                                                   */
/* -------------------------------------------------------------------------- */
export type Row = Record<string, any>;

/** 预编译语句缓存 —— node:sqlite 每次 prepare 都有开销 */
const stmtCache = new Map<string, any>();
function prep(sql: string) {
  let s = stmtCache.get(sql);
  if (!s) {
    s = db.prepare(sql);
    stmtCache.set(sql, s);
  }
  return s;
}

export function all<T = Row>(sql: string, params: any[] = []): T[] {
  return prep(sql).all(...params) as T[];
}
export function get<T = Row>(sql: string, params: any[] = []): T | undefined {
  return prep(sql).get(...params) as T | undefined;
}
export function run(sql: string, params: any[] = []) {
  return prep(sql).run(...params);
}
export function insert(table: string, data: Row): number {
  const keys = Object.keys(data);
  const cols = keys.map((k) => `"${k}"`).join(',');
  const ph = keys.map(() => '?').join(',');
  const res = prep(`INSERT INTO ${table} (${cols}) VALUES (${ph})`).run(...keys.map((k) => toBind(data[k])));
  return Number(res.lastInsertRowid);
}
export function update(table: string, id: number | string, data: Row, idCol = 'id') {
  const keys = Object.keys(data);
  if (!keys.length) return;
  const set = keys.map((k) => `"${k}"=?`).join(',');
  prep(`UPDATE ${table} SET ${set} WHERE ${idCol}=?`).run(...keys.map((k) => toBind(data[k])), id);
}

/** 事务包装 —— 大批量写入提速数十倍 */
export function tx<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/* 建表 + 补列完成后立即执行迁移（此时 stmtCache 已初始化） */
migrate();

/** sqlite 只接受 null/number/string/bigint/Buffer */
function toBind(v: any): any {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'bigint') return v;
  if (v instanceof Date) return v.toISOString();
  return JSON.stringify(v);
}

export const now = () => new Date().toLocaleString('sv-SE').replace('T', ' ');

/** 把 JSON 列解析成数组，把 0/1 转成 boolean */
export function parseJsonFields<T = Row>(row: Row | undefined, fields: string[]): T | undefined {
  if (!row) return undefined;
  const out: Row = { ...row };
  for (const f of fields) {
    if (typeof out[f] === 'string') {
      try {
        out[f] = JSON.parse(out[f]);
      } catch {
        out[f] = [];
      }
    }
  }
  return out as T;
}
export function boolFields<T = Row>(row: Row | undefined, fields: string[]): T | undefined {
  if (!row) return undefined;
  const out: Row = { ...row };
  for (const f of fields) if (f in out) out[f] = !!out[f];
  return out as T;
}

/* -------------------------------------------------------------------------- */
/*  播种                                                                      */
/* -------------------------------------------------------------------------- */
const SEED_FLAG = 'seeded_v1';
const SHOWCASE_FLAG = 'showcase_projects_2026';
const NFC_CARD_FLAG = 'showcase_nfc_card_2026';
const DEPT_TOOLS_FLAG = 'showcase_dept_tools_2026';

/** 一次性导入已确认的作品；已有记录不覆盖，后台删除后也不会在重启时复活。 */
function seedShowcaseProjects() {
  if (get('SELECT 1 FROM settings WHERE key=?', [SHOWCASE_FLAG])) return;
  const projects = [
    {
      title: 'ToDoList 二开（支持上传）',
      slug: 'todolist-upload',
      category: 'frontend',
      summary: '支持上传与待办事项管理的 ToDoList 二开作品。',
      cover: 'https://img.paperchan.cn/file/1790604926786_image.png',
      demoUrl: 'https://todo.paperchan.cn/',
    },
    {
      title: 'CJLRouter 中转站',
      slug: 'cjlrouter',
      category: 'service',
      summary: 'CJLRouter 中转站，提供在线模型服务入口。',
      cover: 'https://img.paperchan.cn/file/1790604969304_image.png',
      demoUrl: 'https://ai.qingyun.best/',
    },
  ];
  tx(() => {
    for (const project of projects) {
      if (!get('SELECT 1 FROM projects WHERE slug=?', [project.slug])) {
        insert('projects', { ...project, year: new Date().getFullYear(), status: 'published' });
      }
    }
    run('INSERT INTO settings (key,value) VALUES (?,?)', [SHOWCASE_FLAG, now()]);
  });
}
/** 部门实体卡片单独导入，已存在的项目和后台后续编辑保持原样。 */
function seedDepartmentCard() {
  if (get('SELECT 1 FROM settings WHERE key=?', [NFC_CARD_FLAG])) return;
  tx(() => {
    if (!get('SELECT 1 FROM projects WHERE slug=?', ['department-nfc-card'])) {
      insert('projects', {
        title: '科技创新部 NFC 卡片',
        slug: 'department-nfc-card',
        category: 'hardware',
        summary: '部门 NFC 卡片 PCB 三维设计，可拖拽旋转、滚轮放大查看。',
        modelUrl: '/models/nfc-card.obj',
        cover: '/models/nfc-card-front.png',
        year: new Date().getFullYear(),
        status: 'published',
      });
    }
    run('INSERT INTO settings (key,value) VALUES (?,?)', [NFC_CARD_FLAG, now()]);
  });
}

/** 部门自建工具单独导入，归属「工具服务」；已存在的 slug 不覆盖，后台删除后不会复活。 */
function seedDepartmentTools() {
  if (get('SELECT 1 FROM settings WHERE key=?', [DEPT_TOOLS_FLAG])) return;
  const tools = [
    {
      title: 'OIDC 服务',
      slug: 'oidc-service',
      summary: '统一身份认证（OIDC）服务入口。',
      cover: 'https://img.paperchan.cn/file/1790605473010_image.png',
      demoUrl: 'https://auth.cjlwall.cc/',
    },
    {
      title: '部门博客',
      slug: 'department-blog',
      summary: '部门博客站点入口。',
      cover: 'https://img.paperchan.cn/file/1790605507314_image.png',
      demoUrl: 'https://blog.cjlwall.cc/',
    },
    {
      title: '意见箱',
      slug: 'feedback-box',
      summary: '意见与建议收集入口。',
      cover: 'https://img.paperchan.cn/file/1790605550132_image.png',
      demoUrl: 'https://yjx.qingyun.best/',
    },
    {
      title: '点名器',
      slug: 'roll-caller',
      summary: '随机点名工具。',
      cover: 'https://img.paperchan.cn/file/1790605584294_image.png',
      demoUrl: 'https://roll.paperchan.cn/',
    },
  ];
  tx(() => {
    for (const tool of tools) {
      if (!get('SELECT 1 FROM projects WHERE slug=?', [tool.slug])) {
        insert('projects', {
          ...tool,
          category: 'service',
          year: new Date().getFullYear(),
          status: 'published',
        });
      }
    }
    run('INSERT INTO settings (key,value) VALUES (?,?)', [DEPT_TOOLS_FLAG, now()]);
  });
}

export function seedIfEmpty() {
  seedShowcaseProjects();
  seedDepartmentCard();
  seedDepartmentTools();
  const flag = get<{ value: string }>('SELECT value FROM settings WHERE key=?', [SEED_FLAG]);
  if (flag) return;
  const hasUsers = get<{ c: number }>('SELECT COUNT(*) c FROM users')!.c > 0;
  if (!hasUsers) tx(() => seed());
  run('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)', [SEED_FLAG, new Date().toISOString()]);
}

export function seed() {
  const hasUsers = get<{ c: number }>('SELECT COUNT(*) c FROM users')!.c > 0;
  if (hasUsers) return;
  console.log('[db] seeding demo data …');

  /* ---- 用户 ---- */
  const users: [string, string, string, string, string][] = [
    ['admin', '系统管理员', 'superadmin', 'admin@example.com', '13800000001'],
    ['zhangwei', '张伟', 'admin', 'zhangwei@example.com', '13800000002'],
    ['liyan', '李岩', 'member', 'liyan@example.com', '13800000003'],
    ['chenxi', '陈曦', 'student', 'chenxi@example.com', '13800000004'],
  ];
  for (const [username, name, role, email, phone] of users) {
    insert('users', {
      username,
      passwordHash: '!',
      name,
      role,
      email,
      phone,
      college: role === 'student' ? '高一-2班' : '校团委',
      studentId: role === 'student' ? '2023010101' : null,
    });
  }
  const adminId = 1;

  /* ---- 站点设置 ---- */
  const settings: Record<string, string> = {
    deptName: '科技创新部',
    deptNameEn: 'TECHNOLOGY & INNOVATION DEPT.',
    slogan: '以技术为舟，以创新为帆',
    intro:
      '科技创新部是校级学生会的科技部门，由校团委领导，负责面向全校开展科技知识科普，并策划、组织科技比赛与科技活动。',
    email: 'notpaperxiang@gmail.com',
    address: '北京市陈经纶中学本部高中',
    foundedAt: '2026-09-28',
    wechatQr: '',
    icp: '',
  };
  for (const [k, v] of Object.entries(settings)) {
    run('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)', [k, v]);
  }

  /* ---- 页面 ---- */
  const pages: [string, string, string][] = [
    [
      'about',
      '部门简介',
      `<p>科技创新部负责面向全校开展科技知识科普，并策划、组织科技比赛与科技活动。</p>
<h2>核心职责</h2>
<ul>
<li>策划并组织校内科技比赛与科技活动；</li>
<li>面向全校开展科技知识科普；</li>
<li>运营部门门户网站，发布科普内容与活动信息；</li>
<li>配合学校开展科技教育相关活动。</li>
</ul>
<h2>工作理念</h2>
<p>我们相信，对科技的兴趣不是少数人的天赋，而是在一次次动手尝试中慢慢培养起来的。部门希望通过科普内容与校内的科技比赛、科技活动，让更多同学有机会接触科技、动手实践。</p>`,
    ],
    [
      'join-notice',
      '招新结果公告',
      `<p>科技创新部本轮招新已结束，录取名单已在门户「加入我们」栏目公示。</p>
<h2>下一轮招新</h2>
<p>下一轮招新计划于 2026 年 11 月开展，届时将在门户「加入我们」栏目发布具体安排，欢迎关注。</p>`,
    ],
    [
      'contact',
      '联系方式',
      `<p>地址：北京市陈经纶中学本部高中<br/>邮箱：notpaperxiang@gmail.com</p>`,
    ],
  ];
  for (const [key, title, content] of pages) insert('pages', { key, title, content });

  /* ---- 发展历程 ---- */
  insert('timeline', {
    year: '2026',
    dateLabel: '01月',
    title: '青云宗成立',
    description: '2026 年 1 月，青云宗成立。',
    sortOrder: 0,
  });
  insert('timeline', {
    year: '2026',
    dateLabel: '09.28',
    title: '科技创新部成立',
    description: '2026 年 9 月 28 日，科技创新部成立。',
    sortOrder: 1,
  });
  insert('timeline', {
    year: '2026',
    dateLabel: '09.28',
    title: '部门官网上线',
    description: '2026 年 9 月 28 日，科技创新部门户网站正式上线。',
    sortOrder: 2,
  });

  /* ---- 组织架构 ---- */
  const root = insert('org_nodes', {
    name: '科技创新部',
    parentId: null,
    leader: '部长 庄梓翔',
    description: '统筹部门整体工作',
    sortOrder: 0,
  });

  const admitted: [string, string][] = [
    ['刘航麟', '高一-2班'],
    ['徐千惠', '高一-13班'],
    ['林书羽', '高一-8班'],
    ['甘佳霖', '高一-10班'],
    ['王子欣', '高一-3班'],
    ['王梓曦', '高一-3班'],
    ['王绍翰', '高二-1班'],
    ['翟炳勋', '高二-6班'],
    ['耿万形', '高二-3班'],
    ['赵宥晨', '高二-1班'],
    ['郭宝泽', '高二-1班'],
    ['陈轩弘', '初三-1班'],
    ['鲜金钊', '高二-5班'],
    ['王嘉优', '高一-2班'],
  ];

  /* ---- 成员风采 ---- */
  const leadership: [string, string][] = [
    ['庄梓翔', '部长'],
    ['毕天宇', '副部长'],
    ['张森', '副部长'],
  ];
  const members = [
    ...leadership.map(([name, role]) => ({ name, role, group: '部长团' })),
    ...admitted.map(([name, className]) => ({ name, role: className, group: '学生成员' })),
    { name: 'U-235', role: '清朝顾问', group: '顾问' },
  ];
  members.forEach(({ name, role, group }, i) =>
    insert('members', {
      name,
      role,
      group,
      bio: '',
      tags: '[]',
      sortOrder: i,
      featured: i < 8 ? 1 : 0,
    })
  );

  /* ---- 文章 ---- */
  /* 样例新闻已清空：新闻由后台「新闻与通知」录入，此处不再播种 */

  /* ---- 活动 ---- */
  /* 样例活动已清空：活动由后台「活动管理」录入，此处不再播种 */

  /* ---- 项目 ---- */
  /* 样例项目已清空：项目由后台「项目展示库」录入，此处不再播种 */

  /* ---- 竞赛 ---- */
  /* 样例竞赛已清空：竞赛由后台「竞赛信息」录入，此处不再播种 */

  /* ---- 申报记录 ---- */
  const apps: Array<Partial<Row>> = [
    ['智能垃圾分类提示装置', 'approved', '科技制作', '林一鸣'],
    ['校园噪声监测与提示装置', 'reviewing', '科技探究', '许清'],
    ['教室光照自动调节装置', 'pending', '科技制作', '马骁'],
    ['校园二手图书交换小程序设计', 'rejected', '创意设计', '何雨'],
    ['家庭用药提醒盒的设计与制作', 'approved', '科技制作', '郑好'],
  ];
  apps.forEach(([title, status, category, leader], i) =>
    insert('project_applications', {
      title,
      competitionId: null,
      leaderName: leader,
      leaderStudentId: `2023${String(100200 + i)}`,
      leaderCollege: ['高一-2班', '高二-1班', '高一-5班', '初三-1班', '高二-3班'][i],
      leaderPhone: `139${String(20000000 + i * 321).slice(0, 8)}`,
      leaderEmail: `lead${i}@example.com`,
      advisor: '王老师',
      teamSize: 3 + (i % 3),
      members: JSON.stringify(['成员A', '成员B', '成员C'].slice(0, 3 + (i % 3))),
      category,
      intro: '本项目围绕校园与生活中的实际问题，设计并制作一件可演示的科技作品，并完成基本功能验证。',
      materials: JSON.stringify([{ name: '报名表.pdf', url: '#', size: 512000 }]),
      status,
      reviewNote: status === 'rejected' ? '选题重复度较高，建议调整方向后重新申报。' : null,
    })
  );

  /* ---- 资源 ---- */
  /* 样例文件已清空：资源由后台「资源中心」上传，此处不再播种 */

  /* ---- 招新录取名单 ---- */
  admitted.forEach(([name, className], i) => insert('join_admissions', { name, className, sortOrder: i + 1 }));

  const joinNames = ['林一鸣', '吴桐', '郑好', '何雨', '马骁', '许清', '钱途', '周雯'];
  joinNames.forEach((name, i) =>
    insert('join_applications', {
      name,
      studentId: `2024${String(100300 + i)}`,
      college: ['高一-2班', '高一-5班', '高二-1班', '高二-3班', '初三-1班', '高一-8班', '高二-6班', '高一-13班'][i % 8],
      major: '',
      grade: ['高一', '高二', '初三'][i % 3],
      phone: `137${String(30000000 + i * 217).slice(0, 8)}`,
      email: `join${i}@example.com`,
      skills: ['React / TypeScript', 'Figma 设计', '视频剪辑', 'Python 数据分析'][i % 4],
      intro: '希望加入科技创新部，把自己的技术能力用在真实项目里，也认识更多志同道合的同学。',
      status: ['pending', 'reviewing', 'approved', 'pending'][i % 4],
      createdAt: daysAgo(i * 2 + 1),
    })
  );

  /* ---- 留言反馈 ---- */
  /* 样例留言已清空：留言由访客在门户「互动与反馈」提交，此处不再播种 */

  /* ---- 画廊 ---- */
  /* 只播种有影像的分类：空分类会让画廊侧栏出现 0 张的条目 */
  const areas: [string, string | null, string][] = [
    ['活动影像', null, '活动影像'],
    ['人形机器人', null, '人形机器人'],
    ['全国人工智能创新挑战赛', null, '全国人工智能创新挑战赛'],
  ];
  const areaIds: number[] = [];
  areas.forEach(([name, parent, description], i) =>
    areaIds.push(insert('gallery_areas', { name, slug: slugify(name), parentId: null, description, sortOrder: i }))
  );

  const galleryUrls = [
    'https://img.paperchan.cn/file/1790516050075_mmexport1790515697554.jpg',
    'https://img.paperchan.cn/file/1790516050727_mmexport1790515714530.jpg',
    'https://img.paperchan.cn/file/1790516054418_mmexport1780060287028.jpg',
    'https://img.paperchan.cn/file/1790516049861_mmexport1780942762321.jpg',
    'https://img.paperchan.cn/file/1790516053634_mmexport1780942777500.jpg',
    'https://img.paperchan.cn/file/1790516061586_mmexport1786772298690.jpg',
    'https://img.paperchan.cn/file/1790516054133_mmexport1787490907083.jpg',
    'https://img.paperchan.cn/file/1790516057018_mmexport1790515668613.jpg',
    'https://img.paperchan.cn/file/1790516056935_mmexport1790515673147.jpg',
    'https://img.paperchan.cn/file/1790516061279_mmexport1790515693630.jpg',
  ];
  /* 影像 → 分类下标（对应上面的 areas）：01 与 09/10 属于挑战赛，
     03/04/05/07/08 属于人形机器人，02 与 06 留在「活动影像」 */
  const areaOfImage = [2, 0, 1, 1, 1, 0, 1, 1, 2, 2];
  const perArea: number[] = [];
  galleryUrls.forEach((url, i) => {
    const a = areaOfImage[i];
    const sortOrder = perArea[a] ?? 0;
    perArea[a] = sortOrder + 1;
    insert('gallery_images', {
      areaId: areaIds[a],
      url,
      title: `活动影像 ${String(i + 1).padStart(2, '0')}`,
      description: null,
      width: 0,
      height: 0,
      sortOrder,
    });
  });

  /* ---- Status ---- */
  const targets: [string, string, string, string, string][] = [
    ['科技创新部门户', 'website', '', '', '部门门户主站'],
    ['活动画廊', 'website', '', '', '活动影像图片库'],
    ['竞赛信息聚合平台', 'website', '', '', '竞赛信息与截止提醒'],
    ['门户应用服务器', 'server', '', '10.20.30.11', '4C8G · Ubuntu 24.04'],
    ['数据库服务器', 'server', '', '10.20.30.12', '8C16G · MySQL 8.4'],
    ['对象存储节点', 'server', '', '10.20.30.13', '2TB · MinIO'],
    ['CI 构建节点', 'server', '', '10.20.30.21', '8C16G · Docker Runner'],
  ];
  const targetIds = targets.map(([name, type, url, host, description], i) =>
    insert('status_targets', { name, type, url: url || null, host: host || null, description, sortOrder: i, active: 1 })
  );

  // 30 天快照
  for (const tid of targetIds) {
    for (let d = 29; d >= 0; d--) {
      const dayBase = new Date(Date.now() - d * 86400000);
      for (let h = 0; h < 24; h += 2) {
        const t = new Date(dayBase);
        t.setHours(h, 0, 0, 0);
        // 制造少量故障
        const down = (tid === 3 && d === 12 && h === 4) || (tid === 6 && d === 5 && h >= 2 && h <= 6) || Math.random() < 0.004;
        insert('status_snapshots', {
          targetId: tid,
          online: down ? 0 : 1,
          latencyMs: down ? null : Math.round(38 + Math.random() * 90 + (tid > 5 ? 20 : 0)),
          checkedAt: t.toLocaleString('sv-SE').replace('T', ' '),
        });
      }
    }
  }

  /* ---- 消息 ---- */
  const msgs: [number, string, string, boolean][] = [
    [4, '你的作品报名已通过初审', '「智能垃圾分类提示装置」已通过部门初审，请于 5 个工作日内提交补充材料。', false],
    [3, '你有 1 条待回复的留言', '有同学在留言板中询问科技比赛组队问题，请及时回复。', false],
  ];
  msgs.forEach(([userId, title, content, read], i) =>
    insert('user_messages', { userId, title, content, read: read ? 1 : 0, link: null, createdAt: daysAgo(i) })
  );

  /* ---- 操作日志 ---- */
  const oplogs: [string, string, string][] = [
    ['审核通过', 'project', '审核通过作品报名「智能垃圾分类提示装置」'],
    ['上传图片', 'gallery', '批量上传 8 张活动现场照片'],
    ['修改配置', 'settings', '更新门户公告栏与联系方式'],
  ];
  oplogs.forEach(([action, target, detail], i) =>
    insert('operation_logs', {
      userId: 1,
      userName: ['系统管理员', '张伟', '李岩', '陈曦'][i % 4],
      action,
      target,
      detail,
      ip: '10.20.30.' + (11 + i),
      createdAt: daysAgo(i, i + 9),
    })
  );

  console.log('[db] seed done');
}

/* -------------------------------------------------------------------------- */
/*  小工具                                                                     */
/* -------------------------------------------------------------------------- */
import { createHash } from 'node:crypto';

export function slugify(input: string): string {
  const ascii = input
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  const base = ascii || 'item';
  // 中文 slug 转成短哈希，保证 URL 干净
  if (/[\u4e00-\u9fa5]/.test(base)) {
    const h = createHash('sha1').update(input).digest('hex').slice(0, 8);
    return `p-${h}`;
  }
  return base.slice(0, 60);
}

function daysAgo(n: number, hour = 10): string {
  const d = new Date(Date.now() - n * 86400000);
  d.setHours(hour, 30, 0, 0);
  return d.toLocaleString('sv-SE').replace('T', ' ');
}
function daysFromNow(n: number, hour = 9, minute = 0): string {
  const d = new Date(Date.now() + n * 86400000);
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleString('sv-SE').replace('T', ' ');
}

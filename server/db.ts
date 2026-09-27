/* =============================================================================
 * 数据库层 — node:sqlite (Node 24 内置，零原生依赖)
 * 启动时自动建表 + 播种演示数据
 * ========================================================================== */
import { DatabaseSync } from 'node:sqlite';
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
  passwordHash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  email TEXT, phone TEXT, avatar TEXT, studentId TEXT, college TEXT,
  isActive INTEGER NOT NULL DEFAULT 1,
  lastLoginAt TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
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
  cover TEXT, summary TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '',
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
  members TEXT NOT NULL DEFAULT '[]', category TEXT NOT NULL DEFAULT '创新训练',
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
  ['articles', 'rejectReason', 'TEXT'],
  ['project_applications', 'reviewNote', 'TEXT'],
];

function migrate() {
  for (const [table, column, type] of MIGRATIONS) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`[db] migrate: ${table}.${column} added`);
    }
  }
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

export function seedIfEmpty() {
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
  const users: [string, string, string, string, string, string][] = [
    ['admin', 'admin123', '系统管理员', 'superadmin', 'admin@sti.edu.cn', '13800000001'],
    ['zhangwei', 'sti123456', '张伟', 'admin', 'zhangwei@sti.edu.cn', '13800000002'],
    ['liyan', 'sti123456', '李岩', 'member', 'liyan@stu.edu.cn', '13800000003'],
    ['chenxi', 'sti123456', '陈曦', 'student', 'chenxi@stu.edu.cn', '13800000004'],
  ];
  for (const [username, pwd, name, role, email, phone] of users) {
    insert('users', {
      username,
      passwordHash: hashPasswordSync(pwd),
      name,
      role,
      email,
      phone,
      college: role === 'student' ? '计算机科学与技术学院' : '校团委',
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
      '科技创新部是校团委指导下负责全校学生科技创新工作的职能部门，统筹学生科技竞赛、创新创业项目孵化、科技文化活动与创新人才培养，为每一位有想法的同学提供从灵感到落地的完整支撑。',
    email: 'notpaperxiang@gmail.com',
    address: '北京市陈经纶中学本部高中',
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
      `<p>科技创新部成立于 2015 年，是校团委直属的学生工作部门，下设<strong>竞赛管理组</strong>、<strong>项目孵化组</strong>、<strong>宣传设计组</strong>与<strong>技术服务组</strong>四个工作组。</p>
<h2>核心职责</h2>
<ul>
<li>统筹全校学生科技创新竞赛的组织、报名、培训与选拔；</li>
<li>负责大学生创新创业训练计划项目的立项、中期检查与结题验收；</li>
<li>运营科技创新部门户、成果展示画廊与竞赛信息聚合平台；</li>
<li>开展科技文化节、技术沙龙、创新工作坊等品牌活动；</li>
<li>建设与维护部门技术基础设施，为其他学生组织提供技术支持。</li>
</ul>
<h2>工作理念</h2>
<p>我们相信，创新不是少数人的天赋，而是可以被训练的能力。部门以「<strong>降低创新门槛</strong>」为使命，把复杂的申报流程、分散的竞赛信息、稀缺的导师资源，整合成一条清晰可走的路径。</p>`,
    ],
    [
      'join-notice',
      '2026 年春季招新公告',
      `<p>科技创新部 2026 年春季招新正式启动，本次面向全校本科生、研究生招募 <strong>28 名</strong>新成员。</p>
<h2>招新流程</h2>
<ol>
<li><b>在线报名</b>：填写报名表并提交个人作品集（可选）；</li>
<li><b>简历筛选</b>：3 个工作日内反馈结果；</li>
<li><b>面试</b>：线上/线下结合，技术岗含简单实操；</li>
<li><b>录用公示</b>：在门户「加入我们」栏目公示。</li>
</ol>
<h2>时间安排</h2>
<ul><li>报名截止：2026-03-20</li><li>面试：2026-03-23 ~ 03-27</li><li>公示：2026-03-30</li></ul>`,
    ],
    [
      'contact',
      '联系方式',
      `<p>地址：北京市陈经纶中学本部高中<br/>邮箱：notpaperxiang@gmail.com</p>`,
    ],
  ];
  for (const [key, title, content] of pages) insert('pages', { key, title, content });

  /* ---- 发展历程 ---- */
  const timeline: [string, string, string][] = [
    ['2015', '部门成立', '科技创新部正式成立，初期设立竞赛管理组与项目孵化组。'],
    ['2017', '首届科技文化节', '首届校园科技文化节举办，参与人数突破 2000 人次。'],
    ['2019', '成果展示平台上线', '部门首个线上成果展示平台上线，实现项目申报流程数字化。'],
    ['2021', '竞赛信息聚合', '整合校内外 40 余项科技竞赛信息，建立统一的竞赛信息发布机制。'],
    ['2023', '创新工坊落成', '创新工坊在大学生活动中心落成，配备 3D 打印与嵌入式开发设备。'],
    ['2025', '斩获国赛金奖', '在中国国际大学生创新大赛中斩获金奖 2 项、银奖 5 项。'],
    ['2026', '门户网站 3.0', '全新门户网站上线，打通竞赛、项目、活动、资源全流程。'],
  ];
  timeline.forEach(([year, title, description], i) => insert('timeline', { year, title, description, sortOrder: i }));

  /* ---- 组织架构 ---- */
  const root = insert('org_nodes', {
    name: '科技创新部',
    parentId: null,
    leader: '部长 庄梓翔',
    description: '统筹部门整体工作',
    sortOrder: 0,
  });
  const groups: [string, string][] = [
    ['竞赛管理组', '负责科技竞赛的组织、报名、培训与选拔工作'],
    ['项目孵化组', '负责大创项目的立项、中期检查、结题与成果转化'],
    ['宣传设计组', '负责视觉设计、内容运营与新媒体系列宣传'],
    ['技术服务组', '负责门户网站、服务器运维与技术工具支持'],
  ];
  groups.forEach(([name, description], i) =>
    insert('org_nodes', { name, parentId: root, leader: null, description, sortOrder: i })
  );

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
  const articles: Array<Partial<Row>> = [
    {
      title: '关于开展 2026 年度大学生创新创业训练计划项目立项申报的通知',
      category: 'notice',
      summary:
        '2026 年度大创项目立项申报工作正式启动，本次申报分为创新训练、创业训练、创业实践三类，申报截止时间为 2026 年 3 月 31 日。',
      content: `<p>各学院、各位同学：</p><p>为深化创新创业教育改革，培养学生创新精神与实践能力，现启动 2026 年度大学生创新创业训练计划（以下简称「大创计划」）项目立项申报工作，有关事项通知如下。</p>
<h2>一、项目类别</h2>
<ul><li><b>创新训练项目</b>：本科生个人或团队，在导师指导下完成创新性研究项目设计、研究条件准备、项目实施、研究报告撰写等工作。</li>
<li><b>创业训练项目</b>：团队在导师指导下，编制商业计划书、开展可行性研究、模拟企业运行、参加企业实践、撰写创业报告。</li>
<li><b>创业实践项目</b>：团队在学校导师和企业导师共同指导下，采用前期创新训练成果，提出一项具有市场前景的创新性产品或者服务。</li></ul>
<h2>二、申报条件</h2>
<ul><li>项目负责人须为我校全日制在校本科生，且未参与在研项目；</li><li>团队人数 3—5 人，鼓励跨学院、跨学科组队；</li><li>每个项目须配备 1 名指导教师，指导教师须具有中级及以上职称。</li></ul>
<h2>三、时间安排</h2>
<ul><li>系统申报：2026-03-01 至 2026-03-31</li><li>学院审核：2026-04-01 至 2026-04-10</li><li>学校评审：2026-04-11 至 2026-04-25</li><li>结果公示：2026-04-30</li></ul>
<h2>四、申报方式</h2>
<p>请登录<a href="/projects/apply">门户网站项目申报入口</a>在线填写申报书，并上传签字盖章后的 PDF 扫描件。系统将于 3 月 31 日 24:00 自动关闭。</p>
<p>联系人：李岩　电话：010-8888 6666 转 305</p>
<p style="text-align:right">科技创新部<br/>2026 年 2 月 28 日</p>`,
      tags: ['大创', '项目申报', '通知'],
      pinned: true,
    },
    {
      title: '我校在中国国际大学生创新大赛（2025）中斩获 2 金 5 银',
      category: 'dept',
      summary:
        '在刚刚落幕的中国国际大学生创新大赛全国总决赛中，我校代表队共获得金奖 2 项、银奖 5 项、铜奖 9 项，创历史最好成绩。',
      content: `<p>10 月 15 日，中国国际大学生创新大赛（2025）全国总决赛落下帷幕。我校共有 16 支团队进入国赛，最终斩获<strong>金奖 2 项、银奖 5 项、铜奖 9 项</strong>，获奖总数位列全省高校第一。</p>
<h2>金奖项目</h2>
<h3>「芯光」—— 面向边缘计算的低功耗存算一体芯片</h3>
<p>由微电子学院与科技创新部联合孵化，团队历时两年完成三代流片验证，在能效比上较同类方案提升 3.2 倍。</p>
<h3>「澜图」—— 城市内涝智能预警与调度系统</h3>
<p>融合多源气象数据与管网拓扑模型，已在三个城区完成试点部署，预警准确率达 91.7%。</p>
<h2>背后的支撑</h2>
<p>科技创新部为参赛团队提供了从立项辅导、材料打磨、模拟路演到知识产权布局的全流程支持，累计组织专项辅导 42 场，邀请校外导师 27 人次。</p>`,
      tags: ['国赛', '金奖', '喜报'],
      pinned: true,
    },
    {
      title: '2026 年「挑战杯」全国大学生课外学术科技作品竞赛校内选拔赛启动',
      category: 'competition',
      summary:
        '第十九届「挑战杯」校内选拔赛即日启动，设自然科学类学术论文、哲学社会科学类社会调查报告、科技发明制作三大类别。',
      content: `<p>第十九届「挑战杯」全国大学生课外学术科技作品竞赛校内选拔赛正式启动，现将有关事项通知如下。</p>
<h2>参赛类别</h2>
<ul><li>自然科学类学术论文（仅限本科生）</li><li>哲学社会科学类社会调查报告</li><li>科技发明制作 A 类（科技含量高、制作成本高）</li><li>科技发明制作 B 类（投入较少、为生产技术或社会生活带来便利的小发明）</li></ul>
<h2>赛程安排</h2>
<ul><li>校内报名截止：2026-04-15</li><li>校内初评：2026-04-20</li><li>校内决赛答辩：2026-05-08</li><li>省赛推荐：2026-05-20</li></ul>
<p>参赛作品须为 2024 年 6 月 1 日之后完成的作品，且未获得过省级及以上奖励。</p>`,
      tags: ['挑战杯', '选拔赛'],
    },
    {
      title: '《关于进一步加强大学生科技创新工作的若干意见》政策解读',
      category: 'policy',
      summary:
        '学校印发《关于进一步加强大学生科技创新工作的若干意见》，从经费保障、学分认定、教师激励、平台建设四方面提出 18 条具体举措。',
      content: `<p>学校近日印发《关于进一步加强大学生科技创新工作的若干意见》（以下简称《意见》），现将核心内容解读如下。</p>
<h2>一、经费保障</h2>
<p>设立大学生科技创新专项经费，年度预算不低于 500 万元，其中国赛获奖项目额外给予 1:1 配套奖励。</p>
<h2>二、学分认定</h2>
<p>国赛金奖项目负责人可申请认定创新创业实践学分 4 学分，省赛一等奖 3 学分，校级一等奖 2 学分。</p>
<h2>三、教师激励</h2>
<p>指导学生获国赛金奖的教师，在职称评审中按省部级教学成果奖同等对待。</p>
<h2>四、平台建设</h2>
<p>三年内建成 10 个校级创新实践基地，并对学生创新团队开放实验室资源，实行 7×24 小时预约制。</p>`,
      tags: ['政策', '解读'],
    },
    {
      title: '科技创新部 2026 年春季全员大会顺利召开',
      category: 'dept',
      summary: '3 月 2 日晚，科技创新部 2026 年春季全员大会在大学生活动中心报告厅召开，全体成员及指导教师出席。',
      content: `<p>3 月 2 日晚，科技创新部 2026 年春季全员大会在大学生活动中心报告厅召开。部门指导教师王建国、全体部长团成员及各工作组代表共 60 余人参会。</p>
<h2>工作回顾</h2>
<p>部长张伟从竞赛组织、项目孵化、品牌活动、技术建设四个方面回顾了上学期工作：累计服务学生 4200 余人次，组织竞赛培训 28 场，门户网站访问量突破 12 万。</p>
<h2>新学期规划</h2>
<ul><li>上线门户网站 3.0，打通竞赛—项目—活动—资源全流程；</li><li>启动「创新伙伴」计划，为每个新立项项目匹配一名高年级学长；</li><li>举办第四届校园科技文化节，目标参与人次 5000+。</li></ul>`,
      tags: ['全员大会', '部门动态'],
    },
    {
      title: '2026 年大学生电子设计竞赛校内集训队招募',
      category: 'competition',
      summary: '面向全校招募电子设计竞赛校内集训队成员 30 名，提供为期两个月的系统培训与硬件支持。',
      content: `<p>为备战 2026 年全国大学生电子设计竞赛，现面向全校招募校内集训队成员。</p>
<h2>招募方向</h2>
<ul><li>硬件设计（模拟电路 / 电源 / PCB）　10 人</li><li>嵌入式软件（MCU / RTOS / 驱动）　10 人</li><li>算法与控制（信号处理 / 控制理论）　6 人</li><li>结构与测试　4 人</li></ul>
<h2>培训安排</h2>
<p>每周三、周六晚 18:30—21:30，创新工坊（大学生活动中心 401）。集训队提供开发板、仪器设备与元器件支持。</p>
<h2>报名方式</h2>
<p>请在门户「活动报名」中选择本活动提交报名，截止时间 2026-03-25。</p>`,
      tags: ['电赛', '集训队'],
    },
    {
      title: '关于 2026 年清明节放假期间部门值班安排的通知',
      category: 'notice',
      summary: '清明节放假期间（4 月 4 日至 4 月 6 日），部门办公室暂停对外办公，线上咨询正常响应。',
      content: `<p>根据学校统一安排，2026 年清明节放假时间为 4 月 4 日至 4 月 6 日，共 3 天。</p>
<h2>值班安排</h2>
<ul><li>4 月 4 日　张伟　138-0000-0002</li><li>4 月 5 日　李岩　138-0000-0003</li><li>4 月 6 日　陈曦　138-0000-0004</li></ul>
<p>放假期间办公室暂停对外办公，门户「互动与反馈」在线咨询与答疑不受影响，紧急事项请联系当日值班人员。</p>`,
      tags: ['放假', '值班'],
    },
    {
      title: '创新工坊设备升级完成，新增 3D 打印与激光切割设备',
      category: 'dept',
      summary: '创新工坊完成新一轮设备升级，新增工业级 3D 打印机 4 台、激光切割机 1 台，即日起对全校学生开放预约。',
      content: `<p>为支撑学生创新项目原型制作需求，创新工坊完成设备升级并通过验收，即日起对全校学生开放预约。</p>
<h2>新增设备</h2>
<ul><li>工业级 FDM 3D 打印机 × 4（成型尺寸 300×300×400mm）</li><li>光固化 3D 打印机 × 1（精度 0.05mm）</li><li>CO₂ 激光切割机 × 1（切割幅面 600×400mm）</li><li>示波器 / 直流电源 / 信号发生器等电子测试设备 × 12 套</li></ul>
<h2>预约方式</h2>
<p>登录门户「资源中心 → 创客空间预约」，或在「互动与反馈」提交设备使用申请。首次使用需参加 30 分钟安全培训。</p>`,
      tags: ['创新工坊', '设备'],
    },
  ];
  articles.forEach((a, i) => {
    const slug = slugify(String(a.title));
    insert('articles', {
      title: a.title,
      slug,
      category: a.category ?? 'dept',
      summary: a.summary ?? '',
      content: a.content ?? '',
      tags: JSON.stringify(a.tags ?? []),
      pinned: a.pinned ? 1 : 0,
      status: 'published',
      views: 120 + i * 87 + (a.pinned ? 400 : 0),
      authorId: adminId,
      publishedAt: daysAgo(i * 3 + 1),
    });
  });

  /* ---- 活动 ---- */
  const activities: Array<Partial<Row>> = [
    {
      title: 'AI Agent 时代的技术栈选择 —— 技术沙龙第 12 期',
      category: '技术沙龙',
      location: '大学生活动中心 报告厅',
      summary: '邀请两位一线工程师，聊聊大模型应用开发中的工程化实践与踩坑经验。',
      content: `<p>本期技术沙龙邀请到两位在 AI 应用一线工作的工程师，围绕「大模型应用到底该怎么落地」这一话题展开。</p>
<h2>分享主题</h2>
<ul><li><b>《从 Demo 到产品：Agent 应用的工程化陷阱》</b>　主讲人：周航</li>
<li><b>《RAG 不是银弹：知识库问答的真实准确率》</b>　主讲人：特邀嘉宾</li></ul>
<h2>适合人群</h2>
<p>对 AI 应用开发感兴趣的同学，无需前置基础，有编程经验更佳。</p>`,
      startAt: daysFromNow(6, 19, 0),
      endAt: daysFromNow(6, 21, 0),
      signupEnd: daysFromNow(5, 23, 59),
      capacity: 120,
    },
    {
      title: '2026 年大学生创新创业训练计划申报宣讲会',
      category: '宣讲会',
      location: '大学生活动中心 301',
      summary: '详细解读 2026 年度大创立项政策、申报书撰写要点与评审标准。',
      content: `<p>为帮助同学们顺利申报 2026 年度大学生创新创业训练计划项目，特举办本次宣讲会。</p>
<h2>内容提纲</h2>
<ul><li>2026 年大创政策变化与经费支持力度</li><li>申报书撰写：从选题到技术路线</li><li>评审专家最看重的三个维度</li><li>往届优秀项目案例拆解</li><li>现场答疑</li></ul>`,
      startAt: daysFromNow(3, 18, 30),
      endAt: daysFromNow(3, 20, 30),
      signupEnd: daysFromNow(3, 12, 0),
      capacity: 200,
    },
    {
      title: '创新工作坊：从 0 到 1 做出你的第一个硬件原型',
      category: '工作坊',
      location: '创新工坊（活动中心 401）',
      summary: '两天动手实践，带你完成一个可运行的嵌入式小项目，材料与设备由部门提供。',
      content: `<p>本工作坊为动手实践型，两天时间完成一个完整的硬件小项目。</p>
<h2>你将收获</h2>
<ul><li>嵌入式开发环境搭建与烧录流程</li><li>传感器数据采集与串口通信</li><li>3D 打印外壳建模基础</li><li>一个属于你自己的可运行原型</li></ul>
<h2>注意事项</h2>
<p>需自备笔记本电脑，Windows / macOS 均可。名额 30 人，按报名顺序录取。</p>`,
      startAt: daysFromNow(11, 9, 0),
      endAt: daysFromNow(12, 17, 0),
      signupEnd: daysFromNow(9, 23, 59),
      capacity: 30,
    },
    {
      title: '第四届校园科技文化节 · 创新成果展',
      category: '文化节',
      location: '图书馆 一楼中庭',
      summary: '展出全校 60 余项学生创新成果，现场设有互动体验区与项目路演环节。',
      content: `<p>第四届校园科技文化节重磅环节——创新成果展，将在图书馆一楼中庭举行为期三天的展览。</p>
<h2>展区分布</h2>
<ul><li><b>A 区</b>　人工智能与具身智能</li><li><b>B 区</b>　智能硬件与机器人</li><li><b>C 区</b>　绿色能源与新材料</li><li><b>D 区</b>　数字人文与社会创新</li><li><b>互动体验区</b>　VR / 机械臂 / 3D 打印现场体验</li></ul>`,
      startAt: daysFromNow(20, 9, 0),
      endAt: daysFromNow(22, 18, 0),
      capacity: 500,
    },
    {
      title: '专利与知识产权实务讲座',
      category: '讲座',
      location: '线上（腾讯会议）',
      summary: '专利代理人讲解大学生如何低成本、高效率地完成第一件专利布局。',
      content: `<p>很多同学的项目技术不错，却因为不了解专利规则而错失保护时机。本次讲座由资深专利代理人主讲。</p>
<h2>内容</h2>
<ul><li>发明专利、实用新型、外观设计的区别与选择</li><li>技术交底书怎么写</li><li>学生申请的费用减免政策</li><li>常见驳回原因与规避</li></ul>`,
      startAt: daysFromNow(-8, 19, 0),
      endAt: daysFromNow(-8, 20, 30),
      capacity: 300,
    },
    {
      title: '往届国赛金奖团队经验分享会',
      category: '分享会',
      location: '大学生活动中心 报告厅',
      summary: '三支国赛金奖团队现场复盘：从选题、组队到路演答辩的完整心路。',
      content: `<p>三支在国赛中斩获金奖的团队将现场分享他们的备赛历程。</p>
<h2>分享团队</h2>
<ul><li>「芯光」存算一体芯片团队</li><li>「澜图」城市内涝预警团队</li><li>「织语」无障碍交互团队</li></ul>`,
      startAt: daysFromNow(-20, 19, 0),
      endAt: daysFromNow(-20, 21, 0),
      capacity: 150,
    },
  ];
  activities.forEach((a, i) => {
    const id = insert('activities', {
      title: a.title,
      slug: slugify(String(a.title)),
      summary: a.summary,
      content: a.content,
      location: a.location,
      category: a.category,
      startAt: a.startAt,
      endAt: a.endAt,
      signupStart: daysAgo(20),
      signupEnd: a.signupEnd ?? null,
      capacity: a.capacity ?? 100,
      status: 'published',
    });
    // 报名数据
    const n = [86, 142, 30, 233, 178, 121][i] ?? 40;
    const names = ['陈曦', '刘思远', '孙佳怡', '赵子墨', '林一鸣', '吴桐', '郑好', '何雨', '马骁', '许清'];
    const colleges = ['计算机科学与技术学院', '自动化学院', '微电子学院', '机械工程学院', '材料科学与工程学院'];
    for (let k = 0; k < n; k++) {
      try {
        insert('activity_signups', {
          activityId: id,
          name: names[k % names.length] + (k > 9 ? String(k) : ''),
          studentId: `2023${String(100000 + k).slice(0, 6)}`,
          college: colleges[k % colleges.length],
          major: '计算机科学与技术',
          phone: `138${String(10000000 + k * 137).slice(0, 8)}`,
          email: `stu${k}@university.edu.cn`,
          checkedIn: i >= 4 ? 1 : 0,
          createdAt: daysAgo(10 - Math.min(9, Math.floor(k / 20))),
        });
      } catch {
        /* 忽略唯一索引冲突 */
      }
    }
  });

  /* ---- 项目 ---- */
  const projects: Array<Partial<Row>> = [
    {
      title: '「芯光」—— 面向边缘计算的低功耗存算一体芯片',
      category: 'excellent',
      summary: '基于阻变存储器的存算一体架构，能效比较同类边缘推理方案提升 3.2 倍，已完成三代流片验证。',
      content: `<h2>项目简介</h2><p>随着边缘侧 AI 推理需求爆发，传统冯·诺依曼架构的「存储墙」问题日益突出。「芯光」项目基于 RRAM 阻变存储器构建存算一体宏单元，将乘累加运算下沉到存储阵列内部，从根本上消除了权重搬运带来的能耗。</p>
<h2>技术亮点</h2><ul><li>定制 8T2R 存算单元，单元面积较同类设计缩小 27%</li><li>提出分层权重量化策略，在 ResNet-18 上精度损失 < 0.6%</li><li>能效比 42.6 TOPS/W，为同工艺数字加速器的 3.2 倍</li></ul>
<h2>成果</h2><p>已授权发明专利 3 项，发表 SCI 二区论文 1 篇，获中国国际大学生创新大赛（2025）金奖。</p>`,
      team: '芯光团队',
      members: ['周航', '林一鸣', '许清', '马骁'],
      advisor: '王建国 教授',
      tags: ['芯片', '存算一体', '边缘计算'],
      awards: '中国国际大学生创新大赛（2025）金奖',
      year: 2025,
    },
    {
      title: '「澜图」—— 城市内涝智能预警与调度系统',
      category: 'excellent',
      summary: '融合多源气象数据与管网拓扑模型的城市内涝预警系统，试点区域预警准确率 91.7%。',
      content: `<h2>项目简介</h2><p>极端降雨频发背景下，城市内涝成为突出的公共安全问题。「澜图」通过融合雷达回波、地面雨量站、管网拓扑与地形高程数据，构建了分钟级的内涝积水预测模型，并给出泵站调度建议。</p>
<h2>核心能力</h2><ul><li>30 分钟提前量积水深度预测，MAE 3.2cm</li><li>基于管网拓扑的积水溯源，定位溢流节点</li><li>泵站调度建议生成，降低峰值积水 24%</li></ul>
<h2>落地情况</h2><p>已在三个城区完成试点部署，累计服务汛期 87 天。</p>`,
      team: '澜图团队',
      members: ['李岩', '吴桐', '郑好'],
      advisor: '陈立 副教授',
      tags: ['智慧城市', '时序预测', '数字孪生'],
      awards: '中国国际大学生创新大赛（2025）金奖',
      year: 2025,
    },
    {
      title: '「织语」—— 面向听障人群的实时手语翻译手套',
      category: 'completed',
      summary: '基于柔性应变传感器与轻量时序模型的实时手语识别手套，识别 400 个常用词汇，准确率 94.3%。',
      content: `<h2>项目简介</h2><p>听障人群在日常沟通中面临显著障碍。「织语」以柔性应变传感器编织成可穿戴手套，采集手部关节形变信号，通过轻量时序网络实时识别手语并转化为语音与文字。</p>
<h2>技术要点</h2><ul><li>自研柔性应变传感纱线，可水洗、可长时间佩戴</li><li>端侧推理延迟 < 60ms，无需联网</li><li>400 词识别准确率 94.3%，句子级准确率 88.1%</li></ul>`,
      team: '织语团队',
      members: ['陈曦', '何雨', '孙佳怡'],
      advisor: '刘敏 教授',
      tags: ['无障碍', '可穿戴', '柔性传感'],
      awards: '全国大学生电子设计竞赛 一等奖',
      year: 2025,
    },
    {
      title: '面向校园场景的多模态智能巡检机器人',
      category: 'ongoing',
      summary: '集视觉、激光雷达与语音交互于一体的校园巡检机器人，可实现自主导航与异常事件上报。',
      content: `<h2>项目简介</h2><p>项目目标是构建一台可在校园开放环境中自主巡检的移动机器人，替代重复性人工巡查工作。</p>
<h2>当前进度</h2><ul><li>✅ 底盘与线控改造完成</li><li>✅ 多传感器融合建图（LIO-SAM）跑通</li><li>🚧 异常事件识别模型训练中</li><li>⏳ 语音交互模块集成</li></ul>`,
      team: '巡光团队',
      members: ['赵子墨', '刘思远', '马骁', '林一鸣'],
      advisor: '张海 教授',
      tags: ['机器人', 'SLAM', '多模态'],
      year: 2026,
    },
    {
      title: '基于扩散模型的传统纹样智能生成与设计辅助工具',
      category: 'approved',
      summary: '面向非遗纹样的生成式设计工具，帮助设计师快速产出可商用的纹样方案。',
      content: `<h2>项目简介</h2><p>传统纹样设计高度依赖经验，年轻设计师上手困难。本项目构建了包含 12,000 张标注纹样的数据集，微调扩散模型实现可控纹样生成。</p>
<h2>核心功能</h2><ul><li>按母题、结构、配色条件生成</li><li>纹样矢量化与无缝拼接</li><li>版权合规性检测</li></ul>`,
      team: '纹语团队',
      members: ['吴桐', '何雨'],
      advisor: '孙艺 副教授',
      tags: ['AIGC', '设计工具', '非遗'],
      year: 2026,
    },
    {
      title: '校园共享实验设备预约与安全管理系统',
      category: 'approved',
      summary: '解决实验室设备预约信息不透明、安全培训记录缺失问题的管理系统。',
      content: `<h2>项目简介</h2><p>针对实验设备「不知道有没有空、不知道谁能用、不知道会不会用」的痛点，构建统一预约与准入管理平台。</p>
<h2>核心功能</h2><ul><li>设备实时状态与预约日历</li><li>安全培训与准入资格绑定</li><li>使用记录与耗材统计</li></ul>`,
      team: '实验室数字化小组',
      members: ['郑好', '许清'],
      advisor: '王建国 教授',
      tags: ['校园信息化', '设备管理'],
      year: 2026,
    },
  ];
  projects.forEach((p, i) => {
    insert('projects', {
      title: p.title,
      slug: slugify(String(p.title)),
      summary: p.summary,
      content: p.content,
      category: p.category,
      year: p.year,
      team: p.team,
      members: JSON.stringify(p.members ?? []),
      advisor: p.advisor,
      tags: JSON.stringify(p.tags ?? []),
      awards: p.awards ?? null,
      status: 'published',
      views: 340 + i * 156,
    });
  });

  /* ---- 竞赛 ---- */
  const comps: Array<Partial<Row>> = [
    {
      title: '中国国际大学生创新大赛（2026）',
      level: '国家级',
      organizer: '教育部',
      summary: '国内规模最大、影响力最广的大学生创新创业赛事，设高教主赛道、青年红色筑梦之旅赛道等。',
      content: `<h2>赛事简介</h2><p>中国国际大学生创新大赛由教育部等部门主办，是覆盖全球的大学生创新创业顶级赛事。</p><h2>校内安排</h2><ul><li>校内报名截止：2026-05-10</li><li>校内选拔赛：2026-05-25</li><li>省赛：2026-07</li><li>国赛：2026-10</li></ul>`,
      signupDeadline: daysFromNow(48, 23, 59),
      link: 'https://cy.ncss.cn/',
    },
    {
      title: '第十九届「挑战杯」全国大学生课外学术科技作品竞赛',
      level: '国家级',
      organizer: '共青团中央、中国科协、教育部',
      summary: '被誉为当代大学生科技创新的「奥林匹克」盛会，两年一届。',
      content: `<h2>赛事简介</h2><p>「挑战杯」分为课外学术科技作品竞赛与创业计划竞赛，交替举办。</p>`,
      signupDeadline: daysFromNow(28, 23, 59),
      link: 'https://www.tiaozhanbei.net/',
    },
    {
      title: '2026 年全国大学生电子设计竞赛',
      level: '国家级',
      organizer: '教育部高等教育司、工业和信息化部人事教育司',
      summary: '面向电子信息类专业的学科竞赛，四人一组、四天三夜封闭完成赛题。',
      content: `<h2>赛事简介</h2><p>电赛是电子信息类学生最具含金量的学科竞赛之一。</p><h2>校内集训</h2><p>部门提供为期两个月的集训队培训与器件支持。</p>`,
      signupDeadline: daysFromNow(12, 23, 59),
      link: 'https://www.nuedc-training.com.cn/',
    },
    {
      title: '2026 年「创青春」中国青年创新创业大赛',
      level: '国家级',
      organizer: '共青团中央',
      summary: '聚焦青年创新创业项目，设科技创新、乡村振兴、数字经济等专项赛。',
      content: `<h2>赛事简介</h2><p>「创青春」面向 35 岁以下青年创业者与在校学生团队。</p>`,
      signupDeadline: daysFromNow(65, 23, 59),
      link: '',
    },
    {
      title: '全国大学生数学建模竞赛（2026）',
      level: '国家级',
      organizer: '中国工业与应用数学学会',
      summary: '三人一队，三天内完成建模、求解与论文撰写，考察综合能力。',
      content: `<h2>赛事简介</h2><p>数学建模竞赛是参与面最广的大学生学科竞赛之一。</p>`,
      signupDeadline: daysFromNow(90, 23, 59),
      link: '',
    },
    {
      title: '校园「创新之星」评选（2026）',
      level: '校级',
      organizer: '科技创新部',
      summary: '面向全校学生评选年度创新人物与优秀创新团队，获奖者可获专项孵化支持。',
      content: `<h2>评选对象</h2><p>在科技创新活动中表现突出的在校学生个人或团队。</p><h2>奖励</h2><ul><li>创新之星 10 名：5000 元孵化基金</li><li>优秀创新团队 5 支：20000 元孵化基金</li></ul>`,
      signupDeadline: daysFromNow(18, 23, 59),
      link: '',
    },
  ];
  comps.forEach((c) =>
    insert('competitions', {
      title: c.title,
      level: c.level,
      organizer: c.organizer,
      summary: c.summary,
      content: c.content,
      signupDeadline: c.signupDeadline ?? null,
      link: c.link ?? null,
      status: 'published',
    })
  );

  /* ---- 申报记录 ---- */
  const apps: Array<Partial<Row>> = [
    ['「灵眸」—— 面向视障人群的室内导航系统', 'approved', '创新训练', '林一鸣'],
    ['基于联邦学习的校园隐私保护数据分析平台', 'reviewing', '创新训练', '许清'],
    ['低成本水质在线监测浮标设计与实现', 'pending', '创新训练', '马骁'],
    ['校园二手交易平台的信任机制设计研究', 'rejected', '创业训练', '何雨'],
    ['面向老年人的智能用药提醒终端', 'approved', '创业实践', '郑好'],
  ];
  apps.forEach(([title, status, category, leader], i) =>
    insert('project_applications', {
      title,
      competitionId: null,
      leaderName: leader,
      leaderStudentId: `2023${String(100200 + i)}`,
      leaderCollege: '计算机科学与技术学院',
      leaderPhone: `139${String(20000000 + i * 321).slice(0, 8)}`,
      leaderEmail: `lead${i}@university.edu.cn`,
      advisor: '王建国 教授',
      teamSize: 3 + (i % 3),
      members: JSON.stringify(['成员A', '成员B', '成员C'].slice(0, 3 + (i % 3))),
      category,
      intro: '本项目拟围绕实际场景中的痛点问题，构建一套可落地的技术方案，并完成原型验证与用户测试。',
      materials: JSON.stringify([{ name: '项目申报书.pdf', url: '#', size: 512000 }]),
      status,
      reviewNote: status === 'rejected' ? '选题重复度较高，建议调整研究角度后重新申报。' : null,
    })
  );

  /* ---- 资源 ---- */
  const resources: Array<Partial<Row>> = [
    ['大学生创新创业训练计划项目申报书模板', 'template', '含创新训练、创业训练、创业实践三类申报书标准模板与填写说明。', 'DOCX', 86000],
    ['商业计划书（BP）标准模板', 'template', '包含市场分析、商业模式、财务预测、团队介绍等完整章节框架。', 'PPTX', 2400000],
    ['路演 PPT 高级模板（深色科技风）', 'template', '20 页深色科技风路演模板，含图表占位与数据可视化组件。', 'PPTX', 3800000],
    ['项目结题报告模板', 'template', '结题报告格式要求、成果附件清单与评审要点。', 'DOCX', 74000],
    ['《关于进一步加强大学生科技创新工作的若干意见》', 'policy', '学校科技创新工作纲领性文件全文。', 'PDF', 620000],
    ['大学生创新创业学分认定办法', 'policy', '各级竞赛获奖对应的学分认定标准与申请流程。', 'PDF', 340000],
    ['专利申请费用减免政策指引', 'policy', '学生申请专利的费用减免条件、所需材料与办理流程。', 'PDF', 210000],
    ['「挑战杯」参赛指南（2026 版）', 'guide', '赛事章程、评审标准、材料要求与常见问题。', 'PDF', 1500000],
    ['中国国际大学生创新大赛备赛指南', 'guide', '从选题、组队、材料打磨到路演答辩的完整备赛路径。', 'PDF', 2800000],
    ['数学建模竞赛入门手册', 'guide', '常用模型、算法工具链与论文写作规范。', 'PDF', 1900000],
    ['嵌入式开发培训资料合集', 'training', 'STM32 / ESP32 开发环境搭建、外设驱动与调试技巧。', 'ZIP', 46000000],
    ['产品设计与原型工具培训', 'training', 'Figma 高效设计、快速原型与用户测试方法。', 'ZIP', 28000000],
    ['科研论文写作与文献管理', 'training', 'LaTeX 入门、Zotero 文献管理与投稿流程。', 'ZIP', 12000000],
    ['项目申报常见问题 FAQ', 'faq', '汇总近三年申报过程中最高频的 30 个问题与解答。', 'PDF', 180000],
  ];
  resources.forEach(([title, category, description, fileType, fileSize], i) =>
    insert('resources', {
      title,
      category,
      description,
      url: '#',
      fileType,
      fileSize,
      downloads: 120 + i * 47 + (category === 'template' ? 800 : 0),
      external: 0,
      sortOrder: i,
    })
  );

  /* ---- 招新岗位 ---- */
  const positions: [string, string, number, string, string[]][] = [
    ['竞赛管理专员', '竞赛管理组', 6, '负责竞赛信息收集、队伍组织、培训安排与赛事对接。', ['责任心强，有学生工作经验优先', '较强的沟通协调能力', '对科技竞赛有一定了解']],
    ['项目孵化专员', '项目孵化组', 6, '负责大创项目全流程管理，包括立项审核、中期检查与结题验收。', ['做事细致，有文档管理经验', '了解科研项目基本流程', '每周可投入 6 小时以上']],
    ['视觉设计师', '宣传设计组', 4, '负责活动物料、海报、门户视觉与品牌延展设计。', ['熟练使用 Figma / PS / AI 任一', '有完整作品集', '对深色系科技风格有审美判断']],
    ['内容运营', '宣传设计组', 4, '负责公众号推文、活动报道与门户内容维护。', ['文字功底扎实', '有新媒体运营经验优先', '能独立完成图文排版']],
    ['前端开发工程师', '技术服务组', 4, '参与门户网站与内部工具的前端开发与迭代。', ['熟悉 React + TypeScript', '了解 Tailwind 等原子化 CSS', '有个人项目或开源贡献']],
    ['后端 / 运维工程师', '技术服务组', 3, '负责门户后端、数据库与部门服务器运维。', ['熟悉 Node.js 或 Python 后端', '了解 Linux 与 Docker', '有服务器运维经验优先']],
    ['活动策划', '竞赛管理组', 3, '负责技术沙龙、工作坊、科技文化节等活动的策划与执行。', ['有活动组织经验', '执行力强，能承担现场统筹', '创意丰富']],
  ];
  positions.forEach(([name, group, headcount, description, requirements], i) =>
    insert('join_positions', {
      name,
      group,
      headcount,
      description,
      requirements: JSON.stringify(requirements),
      sortOrder: i,
      active: 1,
    })
  );
  admitted.forEach(([name, className], i) => insert('join_admissions', { name, className, sortOrder: i + 1 }));

  const joinNames = ['林一鸣', '吴桐', '郑好', '何雨', '马骁', '许清', '钱途', '周雯'];
  joinNames.forEach((name, i) =>
    insert('join_applications', {
      positionId: (i % 7) + 1,
      name,
      studentId: `2024${String(100300 + i)}`,
      college: '计算机科学与技术学院',
      major: ['计算机科学与技术', '软件工程', '人工智能', '电子信息工程'][i % 4],
      grade: ['大一', '大二', '大三'][i % 3],
      phone: `137${String(30000000 + i * 217).slice(0, 8)}`,
      email: `join${i}@university.edu.cn`,
      skills: ['React / TypeScript', 'Figma 设计', '视频剪辑', 'Python 数据分析'][i % 4],
      intro: '希望加入科技创新部，把自己的技术能力用在真实项目里，也认识更多志同道合的同学。',
      status: ['pending', 'reviewing', 'approved', 'pending'][i % 4],
      createdAt: daysAgo(i * 2 + 1),
    })
  );

  /* ---- 留言反馈 ---- */
  const fbs: Array<[string, string, string, string, boolean, number]> = [
    ['question', '大创项目可以跨学院组队吗？', '我来自外国语学院，想和计算机学院的同学一起申报大创，不确定跨学院组队是否需要额外流程。', 'answered', '', true, 24],
    ['suggestion', '建议门户增加竞赛截止日期的日历订阅功能', '希望能把竞赛截止时间导出成 iCal，直接订阅到手机日历里，这样就不会错过了。', 'replied', '非常好的建议！我们已经在排期开发「竞赛日历订阅」功能，预计下个版本上线。', false, 41],
    ['consult', '创新工坊的 3D 打印机怎么预约？', '想打印一个项目原型外壳，请问需要提前多久预约？材料费怎么算？', 'replied', '通过门户「资源中心 → 创客空间预约」提交申请，建议提前 3 天。PLA 材料由部门免费提供，每人每学期 500g 额度。', false, 33],
    ['question', '国赛获奖可以认定多少学分？', '想确认一下中国国际大学生创新大赛金奖对应多少创新创业学分。', 'replied', '根据最新学分认定办法，国赛金奖项目负责人可认定 4 学分，团队成员认定 2 学分。', true, 57],
    ['suggestion', '希望开放实验室夜间使用权限', '很多硬件调试需要连续长时间占用设备，建议对认证过的团队开放 22:00 后的实验室权限。', 'open', '', false, 19],
    ['vote', '你希望下一期技术沙龙讲什么？', '选项：A. 大模型微调实战　B. 云原生与 K8s 入门　C. 硬件电路设计基础　D. 产品思维与需求分析', 'open', '', true, 88],
  ];
  fbs.forEach(([type, title, content, status, reply, anonymous, likes], i) =>
    insert('feedback', {
      type,
      title,
      content,
      anonymous: anonymous ? 1 : 0,
      authorName: anonymous ? null : ['林一鸣', '吴桐', '郑好'][i % 3],
      contact: anonymous ? null : 'user@university.edu.cn',
      status,
      reply: reply || null,
      repliedAt: reply ? daysAgo(i) : null,
      likes,
      createdAt: daysAgo(i * 2 + 1),
    })
  );

  /* ---- 画廊 ---- */
  const areas: [string, string | null, string][] = [
    ['科技文化节', null, '历届校园科技文化节的现场记录'],
    ['竞赛现场', null, '各大赛事的备赛与比赛瞬间'],
    ['创新工坊', null, '动手实践与设备开放的日常'],
    ['讲座与沙龙', null, '技术分享与思想碰撞'],
  ];
  const areaIds: number[] = [];
  areas.forEach(([name, parent, description], i) =>
    areaIds.push(insert('gallery_areas', { name, slug: slugify(name), parentId: null, description, sortOrder: i }))
  );
  // 二级区域
  const subs: [string, number][] = [
    ['2025 第四届', 0],
    ['2024 第三届', 0],
    ['国赛现场', 1],
    ['省赛现场', 1],
    ['3D 打印', 2],
    ['电子实验', 2],
    ['技术沙龙', 3],
  ];
  const subIds = subs.map(([name, p], i) =>
    insert('gallery_areas', { name, slug: slugify(name) + '-' + i, parentId: areaIds[p], description: null, sortOrder: i })
  );

  const allAreas = [...areaIds, ...subIds];
  for (let i = 0; i < 24; i++) {
    const areaId = allAreas[i % allAreas.length];
    insert('gallery_images', {
      areaId,
      url: `https://picsum.photos/seed/sti${i}/1200/800`,
      title: ['成果展现场', '作品演示', '团队答辩', '设备操作', '交流讨论', '颁奖时刻'][i % 6] + ` #${i + 1}`,
      description: '科技创新部活动记录',
      width: 1200,
      height: 800,
      sortOrder: i,
      createdAt: daysAgo(i * 3),
    });
  }

  /* ---- Status ---- */
  const targets: [string, string, string, string, string][] = [
    ['科技创新部门户', 'website', 'https://sti.university.edu.cn', '', '部门门户主站'],
    ['成果展示画廊', 'website', 'https://gallery.sti.university.edu.cn', '', '创新成果图片库'],
    ['竞赛信息聚合平台', 'website', 'https://comp.sti.university.edu.cn', '', '竞赛信息与截止提醒'],
    ['大创项目管理系统', 'website', 'https://dachuang.university.edu.cn', '', '项目申报与进度查询'],
    ['创客空间预约系统', 'website', 'https://maker.university.edu.cn', '', '设备预约与准入管理'],
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
    [4, '你的项目申报已通过初审', '「灵眸」室内导航系统已通过项目孵化组初审，请于 5 个工作日内提交补充材料。', false],
    [4, '活动报名成功', '你已成功报名「AI Agent 时代的技术栈选择」技术沙龙，请准时参加。', true],
    [4, '新的竞赛信息', '中国国际大学生创新大赛（2026）校内报名已开放，截止时间 5 月 10 日。', true],
    [3, '你有 1 条待回复的留言', '有同学在留言板中询问大创跨学院组队问题，请及时回复。', false],
  ];
  msgs.forEach(([userId, title, content, read], i) =>
    insert('user_messages', { userId, title, content, read: read ? 1 : 0, link: null, createdAt: daysAgo(i) })
  );

  /* ---- 操作日志 ---- */
  const oplogs: [string, string, string][] = [
    ['发布文章', 'news', '发布《关于开展 2026 年度大学生创新创业训练计划项目立项申报的通知》'],
    ['审核通过', 'project', '审核通过项目申报「灵眸——面向视障人群的室内导航系统」'],
    ['发布活动', 'activity', '发布活动「AI Agent 时代的技术栈选择 —— 技术沙龙第 12 期」'],
    ['上传图片', 'gallery', '批量上传 8 张科技文化节现场照片'],
    ['修改配置', 'settings', '更新门户公告栏与联系方式'],
    ['导出数据', 'signup', '导出「2026 年大学生创新创业训练计划申报宣讲会」报名名单（142 条）'],
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
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPasswordSync(pwd: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pwd, salt, 32).toString('hex');
  return `s2:${salt}:${hash}`;
}
export function verifyPassword(pwd: string, stored: string): boolean {
  try {
    const [, salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const calc = scryptSync(pwd, salt, 32);
    const want = Buffer.from(hash, 'hex');
    return calc.length === want.length && timingSafeEqual(calc, want);
  } catch {
    return false;
  }
}

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

/* =============================================================================
 * 公开读取接口 /api/*
 * ========================================================================== */
import { Hono } from 'hono';
import { all, get, parseJsonFields, boolFields } from '../db.ts';
import { ok, fail, paging } from '../util.ts';
export const publicRoutes = new Hono();
/* ------------------------------- 站点设置 ------------------------------- */
publicRoutes.get('/settings', (c) => {
    const rows = all('SELECT key,value FROM settings');
    const out = {};
    for (const r of rows)
        out[r.key] = r.value;
    return ok(c, out);
});
publicRoutes.get('/pages/:key', (c) => {
    const row = get('SELECT * FROM pages WHERE key=?', [c.req.param('key')]);
    if (!row)
        return fail(c, '页面不存在', 404);
    return ok(c, row);
});
/* -------------------------------- 概览 --------------------------------- */
publicRoutes.get('/overview', (c) => {
    const one = (sql, p = []) => (get(sql, p)?.c ?? 0);
    const settings = all('SELECT key,value FROM settings');
    const s = {};
    for (const r of settings)
        s[r.key] = r.value;
    const featuredArticles = all(`SELECT id,title,slug,category,summary,cover,tags,pinned,views,publishedAt
     FROM articles WHERE status='published' ORDER BY pinned DESC, publishedAt DESC LIMIT 6`).map((a) => parseJsonFields(a, ['tags']));
    const notices = all(`SELECT id,title,slug,category,summary,pinned,views,publishedAt FROM articles
     WHERE status='published' AND category IN ('notice','policy')
     ORDER BY pinned DESC, publishedAt DESC LIMIT 5`);
    const activities = all(`SELECT a.id,a.title,a.slug,a.cover,a.summary,a.location,a.category,a.startAt,a.endAt,
            a.signupEnd,a.capacity, (SELECT COUNT(*) FROM activity_signups s WHERE s.activityId=a.id) AS signedCount
     FROM activities a WHERE a.status='published' AND datetime(a.startAt) >= datetime('now','localtime')
     ORDER BY a.startAt ASC LIMIT 4`);
    const projects = all(`SELECT id,title,slug,cover,summary,category,year,team,tags,awards FROM projects
     WHERE status='published' ORDER BY (category='excellent') DESC, year DESC, id DESC LIMIT 6`).map((p) => parseJsonFields(p, ['tags']));
    const competitions = all(`SELECT id,title,level,organizer,summary,signupDeadline,link FROM competitions
     WHERE status='published' AND signupDeadline IS NOT NULL AND datetime(signupDeadline) >= datetime('now','localtime')
     ORDER BY datetime(signupDeadline) ASC LIMIT 5`);
    const gallery = all(`SELECT id,url,title,areaId FROM gallery_images ORDER BY sortOrder ASC, id DESC LIMIT 12`);
    const timeline = all('SELECT * FROM timeline ORDER BY sortOrder ASC');
    const members = all('SELECT * FROM members WHERE featured=1 ORDER BY sortOrder ASC LIMIT 8').map((m) => parseJsonFields(m, ['tags']));
    const featuredProjects = projects.filter((p) => p.category === 'excellent');
    return ok(c, {
        settings: s,
        stats: {
            articles: one("SELECT COUNT(*) c FROM articles WHERE status='published'"),
            activities: one("SELECT COUNT(*) c FROM activities WHERE status='published'"),
            projects: one("SELECT COUNT(*) c FROM projects WHERE status='published'"),
            competitions: one("SELECT COUNT(*) c FROM competitions WHERE status='published'"),
            galleryImages: one('SELECT COUNT(*) c FROM gallery_images'),
            resources: one('SELECT COUNT(*) c FROM resources'),
            members: one('SELECT COUNT(*) c FROM members'),
            views: one('SELECT COALESCE(SUM(views),0) c FROM articles') + one('SELECT COALESCE(SUM(views),0) c FROM projects'),
            signups: one('SELECT COUNT(*) c FROM activity_signups'),
            applications: one('SELECT COUNT(*) c FROM project_applications'),
            years: 11,
        },
        featuredArticles,
        notices,
        activities,
        projects,
        featuredProjects,
        competitions,
        gallery,
        timeline,
        members,
    });
});
/* ------------------------------ 新闻与通知 ------------------------------ */
publicRoutes.get('/articles', (c) => {
    const { page, pageSize, offset } = paging(c);
    const category = c.req.query('category');
    const q = c.req.query('q');
    const tag = c.req.query('tag');
    const sort = c.req.query('sort') || 'latest';
    const where = ["a.status='published'"];
    const params = [];
    if (category && category !== 'all') {
        where.push('a.category=?');
        params.push(category);
    }
    if (q) {
        where.push('(a.title LIKE ? OR a.summary LIKE ? OR a.content LIKE ?)');
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (tag) {
        where.push('a.tags LIKE ?');
        params.push(`%"${tag}"%`);
    }
    const order = sort === 'hot'
        ? 'a.views DESC, a.publishedAt DESC'
        : sort === 'oldest'
            ? 'a.publishedAt ASC'
            : 'a.pinned DESC, a.publishedAt DESC';
    const w = where.join(' AND ');
    const total = get(`SELECT COUNT(*) c FROM articles a WHERE ${w}`, params).c;
    const items = all(`SELECT a.id,a.title,a.slug,a.category,a.summary,a.cover,a.tags,a.pinned,a.views,a.publishedAt,
            u.name AS authorName
     FROM articles a LEFT JOIN users u ON u.id=a.authorId
     WHERE ${w}
     ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, pageSize, offset]).map((a) => parseJsonFields(a, ['tags']));
    const counts = all("SELECT category, COUNT(*) c FROM articles WHERE status='published' GROUP BY category");
    const tags = all("SELECT tags FROM articles WHERE status='published'")
        .flatMap((r) => {
        try {
            return JSON.parse(r.tags);
        }
        catch {
            return [];
        }
    })
        .reduce((acc, t) => ((acc[t] = (acc[t] || 0) + 1), acc), {});
    return ok(c, { items, total, page, pageSize }, {
        counts: Object.fromEntries(counts.map((r) => [r.category, r.c])),
        tags: Object.entries(tags)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 18)
            .map(([name, count]) => ({ name, count })),
    });
});
publicRoutes.get('/articles/:slug', (c) => {
    const row = get(`SELECT a.*, u.name AS authorName FROM articles a LEFT JOIN users u ON u.id=a.authorId
     WHERE a.slug=? AND a.status='published'`, [c.req.param('slug')]);
    if (!row)
        return fail(c, '文章不存在', 404);
    const id = Number(c.req.query('count')) === 0 ? null : row.id;
    if (id)
        get('UPDATE articles SET views=views+1 WHERE id=?', [id]);
    const attachments = all('SELECT * FROM attachments WHERE ownerType=? AND ownerId=?', ['article', row.id]);
    const related = all(`SELECT id,title,slug,category,summary,publishedAt FROM articles
     WHERE status='published' AND category=? AND id<>? ORDER BY publishedAt DESC LIMIT 4`, [row.category, row.id]);
    const prev = get("SELECT title,slug FROM articles WHERE status='published' AND publishedAt > ? ORDER BY publishedAt ASC LIMIT 1", [row.publishedAt]);
    const next = get("SELECT title,slug FROM articles WHERE status='published' AND publishedAt < ? ORDER BY publishedAt DESC LIMIT 1", [row.publishedAt]);
    return ok(c, { ...parseJsonFields(row, ['tags']), views: row.views + (id ? 1 : 0) }, { attachments, related, prev, next });
});
/* -------------------------------- 活动 --------------------------------- */
publicRoutes.get('/activities', (c) => {
    const { page, pageSize, offset } = paging(c);
    const scope = c.req.query('scope') || 'upcoming'; // upcoming | past | all
    const q = c.req.query('q');
    const category = c.req.query('category');
    const where = ["a.status='published'"];
    const params = [];
    if (scope === 'upcoming')
        where.push("datetime(COALESCE(a.endAt,a.startAt)) >= datetime('now','localtime')");
    if (scope === 'past')
        where.push("datetime(COALESCE(a.endAt,a.startAt)) < datetime('now','localtime')");
    if (q) {
        where.push('(a.title LIKE ? OR a.summary LIKE ?)');
        params.push(`%${q}%`, `%${q}%`);
    }
    if (category && category !== 'all') {
        where.push('a.category=?');
        params.push(category);
    }
    const w = where.join(' AND ');
    const order = scope === 'past' ? 'a.startAt DESC' : 'a.startAt ASC';
    const total = get(`SELECT COUNT(*) c FROM activities a WHERE ${w}`, params).c;
    const items = all(`SELECT a.*, (SELECT COUNT(*) FROM activity_signups s WHERE s.activityId=a.id) AS signedCount
     FROM activities a WHERE ${w} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, pageSize, offset]);
    const categories = all("SELECT category, COUNT(*) c FROM activities WHERE status='published' GROUP BY category");
    return ok(c, { items, total, page, pageSize }, {
        categories: categories.map((r) => ({ name: r.category, count: r.c })),
    });
});
publicRoutes.get('/activities/calendar', (c) => {
    const year = Number(c.req.query('year') || new Date().getFullYear());
    const month = Number(c.req.query('month') || new Date().getMonth() + 1);
    const rows = all(`SELECT id,title,slug,startAt,endAt,location,category,
            (SELECT COUNT(*) FROM activity_signups s WHERE s.activityId=activities.id) AS signedCount, capacity
     FROM activities WHERE status='published'
       AND strftime('%Y',startAt)=? AND strftime('%m',startAt)=?
     ORDER BY startAt ASC`, [String(year), String(month).padStart(2, '0')]);
    return ok(c, rows);
});
publicRoutes.get('/activities/:slug', (c) => {
    const row = get('SELECT * FROM activities WHERE slug=?', [c.req.param('slug')]);
    if (!row)
        return fail(c, '活动不存在', 404);
    const signedCount = get('SELECT COUNT(*) c FROM activity_signups WHERE activityId=?', [row.id]).c;
    const attachments = all('SELECT * FROM attachments WHERE ownerType=? AND ownerId=?', ['activity', row.id]);
    const signups = all('SELECT name, college FROM activity_signups WHERE activityId=? ORDER BY createdAt DESC LIMIT 40', [row.id]);
    const now = new Date().toLocaleString('sv-SE').replace('T', ' ');
    const signupOpen = (!row.signupEnd || row.signupEnd >= now) &&
        (!row.signupStart || row.signupStart <= now) &&
        (row.capacity === 0 || signedCount < row.capacity) &&
        row.status === 'published';
    return ok(c, { ...row, signedCount, signupOpen }, { attachments, signups });
});
/* ---------------------------- 项目与竞赛 ------------------------------- */
publicRoutes.get('/projects', (c) => {
    const { page, pageSize, offset } = paging(c);
    const category = c.req.query('category');
    const q = c.req.query('q');
    const year = c.req.query('year');
    const where = ["status='published'"];
    const params = [];
    if (category && category !== 'all') {
        where.push('category=?');
        params.push(category);
    }
    if (year && year !== 'all') {
        where.push('year=?');
        params.push(Number(year));
    }
    if (q) {
        where.push('(title LIKE ? OR summary LIKE ? OR team LIKE ? OR content LIKE ?)');
        params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    const w = where.join(' AND ');
    const total = get(`SELECT COUNT(*) c FROM projects WHERE ${w}`, params).c;
    const items = all(`SELECT * FROM projects WHERE ${w} ORDER BY (category='excellent') DESC, year DESC, id DESC LIMIT ? OFFSET ?`, [...params, pageSize, offset]).map((p) => parseJsonFields(p, ['tags', 'members']));
    const counts = all("SELECT category, COUNT(*) c FROM projects WHERE status='published' GROUP BY category");
    const years = all('SELECT DISTINCT year FROM projects ORDER BY year DESC');
    return ok(c, { items, total, page, pageSize }, {
        counts: Object.fromEntries(counts.map((r) => [r.category, r.c])),
        years: years.map((y) => y.year),
    });
});
publicRoutes.get('/projects/:slug', (c) => {
    const row = get("SELECT * FROM projects WHERE slug=?", [c.req.param('slug')]);
    if (!row)
        return fail(c, '项目不存在', 404);
    if (Number(c.req.query('count')) !== 0)
        get('UPDATE projects SET views=views+1 WHERE id=?', [row.id]);
    const related = all(`SELECT id,title,slug,summary,cover,category,year FROM projects
     WHERE id<>? AND category=? AND status='published' ORDER BY year DESC LIMIT 3`, [row.id, row.category]);
    return ok(c, parseJsonFields(row, ['tags', 'members']), { related });
});
publicRoutes.get('/competitions', (c) => {
    const q = c.req.query('q');
    const level = c.req.query('level');
    const where = ["status='published'"];
    const params = [];
    if (q) {
        where.push('(title LIKE ? OR summary LIKE ? OR organizer LIKE ?)');
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (level && level !== 'all') {
        where.push('level=?');
        params.push(level);
    }
    const items = all(`SELECT * FROM competitions WHERE ${where.join(' AND ')}
     ORDER BY (signupDeadline IS NULL), datetime(signupDeadline) ASC`);
    const levels = all("SELECT level, COUNT(*) c FROM competitions WHERE status='published' GROUP BY level");
    return ok(c, items, { levels: levels.map((l) => ({ name: l.level, count: l.c })) });
});
publicRoutes.get('/competitions/:id', (c) => {
    const row = get('SELECT * FROM competitions WHERE id=?', [Number(c.req.param('id'))]);
    if (!row)
        return fail(c, '竞赛不存在', 404);
    return ok(c, row);
});
/* ------------------------------ 资源中心 ------------------------------- */
publicRoutes.get('/resources', (c) => {
    const category = c.req.query('category');
    const q = c.req.query('q');
    const where = ['1=1'];
    const params = [];
    if (category && category !== 'all') {
        where.push('category=?');
        params.push(category);
    }
    if (q) {
        where.push('(title LIKE ? OR description LIKE ?)');
        params.push(`%${q}%`, `%${q}%`);
    }
    const items = all(`SELECT * FROM resources WHERE ${where.join(' AND ')} ORDER BY sortOrder ASC, id DESC`, params);
    const counts = all('SELECT category, COUNT(*) c FROM resources GROUP BY category');
    return ok(c, items, { counts: Object.fromEntries(counts.map((r) => [r.category, r.c])) });
});
/* ------------------------------ 加入我们 ------------------------------- */
publicRoutes.get('/join', (c) => {
    const positions = all('SELECT * FROM join_positions WHERE active=1 ORDER BY sortOrder ASC').map((p) => parseJsonFields(p, ['requirements']));
    const notice = get('SELECT * FROM pages WHERE key=?', ['join-notice']);
    const groups = all('SELECT "group", COUNT(*) c FROM join_positions WHERE active=1 GROUP BY "group" ORDER BY MIN(sortOrder)');
    const approved = all(`SELECT name, college, major, (SELECT name FROM join_positions jp WHERE jp.id=ja.positionId) AS positionName, createdAt
     FROM join_applications ja WHERE status='approved' ORDER BY createdAt DESC LIMIT 20`);
    return ok(c, { positions, notice, groups: groups.map((g) => ({ name: g.group, count: g.c })), approved });
});
/* ------------------------------ 互动与反馈 ----------------------------- */
publicRoutes.get('/feedback', (c) => {
    const { page, pageSize, offset } = paging(c);
    const type = c.req.query('type');
    const status = c.req.query('status');
    const where = ['1=1'];
    const params = [];
    if (type && type !== 'all') {
        where.push('type=?');
        params.push(type);
    }
    if (status && status !== 'all') {
        where.push('status=?');
        params.push(status);
    }
    const w = where.join(' AND ');
    const total = get(`SELECT COUNT(*) c FROM feedback WHERE ${w}`, params).c;
    const items = all(`SELECT id,type,title,content,anonymous,authorName,status,reply,repliedAt,likes,createdAt
     FROM feedback WHERE ${w} ORDER BY (status='open') DESC, likes DESC, createdAt DESC LIMIT ? OFFSET ?`, [...params, pageSize, offset]).map((f) => boolFields(f, ['anonymous']));
    const counts = all('SELECT type, COUNT(*) c FROM feedback GROUP BY type');
    return ok(c, { items, total, page, pageSize }, {
        counts: Object.fromEntries(counts.map((r) => [r.type, r.c])),
        answered: get("SELECT COUNT(*) c FROM feedback WHERE status<>'open'").c,
    });
});
/* -------------------------------- 画廊 --------------------------------- */
publicRoutes.get('/gallery/areas', (c) => {
    const rows = all('SELECT * FROM gallery_areas ORDER BY sortOrder ASC, id ASC');
    const counts = all('SELECT areaId, COUNT(*) c FROM gallery_images GROUP BY areaId');
    const cmap = Object.fromEntries(counts.map((r) => [r.areaId, r.c]));
    // 递归滚动统计（含子区域）
    const byParent = new Map();
    for (const r of rows) {
        const k = r.parentId ?? null;
        if (!byParent.has(k))
            byParent.set(k, []);
        byParent.get(k).push({ ...r, imageCount: cmap[r.id] || 0, children: [] });
    }
    const attach = (node) => {
        node.children = (byParent.get(node.id) || []).map(attach);
        node.imageCount += node.children.reduce((s, ch) => s + ch.imageCount, 0);
        return node;
    };
    const tree = (byParent.get(null) || []).map(attach);
    return ok(c, tree);
});
publicRoutes.get('/gallery/images', (c) => {
    const { page, pageSize, offset } = paging(c);
    const areaId = c.req.query('areaId');
    const q = c.req.query('q');
    const where = ['1=1'];
    const params = [];
    if (areaId && areaId !== 'all') {
        // 含子区域
        const ids = [];
        const collect = (id) => {
            ids.push(id);
            for (const ch of all('SELECT id FROM gallery_areas WHERE parentId=?', [id]))
                collect(ch.id);
        };
        collect(Number(areaId));
        where.push(`g.areaId IN (${ids.map(() => '?').join(',')})`);
        params.push(...ids);
    }
    if (q) {
        where.push('(g.title LIKE ? OR g.description LIKE ?)');
        params.push(`%${q}%`, `%${q}%`);
    }
    const w = where.join(' AND ');
    const total = get(`SELECT COUNT(*) c FROM gallery_images g WHERE ${w}`, params).c;
    const items = all(`SELECT g.*, a.name AS areaName FROM gallery_images g LEFT JOIN gallery_areas a ON a.id=g.areaId
     WHERE ${w}
     ORDER BY g.sortOrder ASC, g.id DESC LIMIT ? OFFSET ?`, [...params, pageSize, offset]);
    return ok(c, { items, total, page, pageSize });
});
/* ------------------------------ 部门概况 ------------------------------- */
publicRoutes.get('/about', (c) => {
    const page = get('SELECT * FROM pages WHERE key=?', ['about']);
    const contact = get('SELECT * FROM pages WHERE key=?', ['contact']);
    const intro = get('SELECT value FROM settings WHERE key=?', ['intro']);
    const timeline = all('SELECT * FROM timeline ORDER BY sortOrder ASC');
    const orgRows = all('SELECT * FROM org_nodes ORDER BY sortOrder ASC, id ASC');
    const byParent = new Map();
    for (const r of orgRows) {
        const k = r.parentId ?? null;
        if (!byParent.has(k))
            byParent.set(k, []);
        byParent.get(k).push({ ...r, children: [] });
    }
    const attach = (n) => {
        n.children = (byParent.get(n.id) || []).map(attach);
        return n;
    };
    const org = (byParent.get(null) || []).map(attach);
    const members = all('SELECT * FROM members ORDER BY sortOrder ASC').map((m) => parseJsonFields(m, ['tags']));
    const stats = {
        members: get('SELECT COUNT(*) c FROM members').c,
        projects: get("SELECT COUNT(*) c FROM projects WHERE status='published'").c,
        activities: get("SELECT COUNT(*) c FROM activities WHERE status='published'").c,
        years: 11,
    };
    return ok(c, { page, contact, intro: intro?.value ?? '', timeline, org, members, stats });
});
/* ------------------------------- Status -------------------------------- */
publicRoutes.get('/status', (c) => {
    const targets = all('SELECT * FROM status_targets WHERE active=1 ORDER BY sortOrder ASC');
    const out = targets.map((t) => {
        const snaps = all(`SELECT online, latencyMs, checkedAt FROM status_snapshots WHERE targetId=?
       ORDER BY datetime(checkedAt) DESC LIMIT 360`, [t.id]);
        const day = all(`SELECT online, latencyMs, checkedAt FROM status_snapshots WHERE targetId=? AND datetime(checkedAt) >= datetime('now','localtime','-1 day')`, [t.id]);
        const month = all(`SELECT online, latencyMs, checkedAt FROM status_snapshots WHERE targetId=? AND datetime(checkedAt) >= datetime('now','localtime','-30 day')`, [t.id]);
        const rate = (arr) => (arr.length ? Math.round((arr.filter((s) => s.online).length / arr.length) * 1000) / 10 : 100);
        const last = snaps[0];
        // 最近 30 天按天聚合
        const history = [];
        for (let d = 29; d >= 0; d--) {
            const dayKey = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
            const items = month.filter((s) => String(s.checkedAt).slice(0, 10) === dayKey);
            const lats = items.filter((s) => s.online && s.latencyMs).map((s) => s.latencyMs);
            history.push({
                t: dayKey.slice(5),
                online: items.length ? items.every((s) => s.online) : true,
                latencyMs: lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : null,
                uptime: items.length ? Math.round((items.filter((s) => s.online).length / items.length) * 1000) / 10 : 100,
            });
        }
        return {
            ...t,
            active: !!t.active,
            online: last ? !!last.online : true,
            latencyMs: last?.latencyMs ?? null,
            lastCheck: last?.checkedAt ?? null,
            uptime24h: rate(day),
            uptime30d: rate(month),
            history,
        };
    });
    const overall24 = out.length ? Math.round((out.reduce((s, t) => s + t.uptime24h, 0) / out.length) * 10) / 10 : 100;
    const overall30 = out.length ? Math.round((out.reduce((s, t) => s + t.uptime30d, 0) / out.length) * 10) / 10 : 100;
    const onlineCount = out.filter((t) => t.online).length;
    return ok(c, {
        targets: out,
        summary: {
            total: out.length,
            online: onlineCount,
            degraded: out.length - onlineCount,
            uptime24h: overall24,
            uptime30d: overall30,
            incidents: out.reduce((s, t) => s + t.history.filter((h) => h.uptime < 99).length, 0),
        },
    });
});
/* ------------------------------ 更新日志 ------------------------------- */
publicRoutes.get('/changelog', (c) => {
    const items = all('SELECT * FROM changelog ORDER BY datetime(createdAt) DESC, id DESC');
    return ok(c, items);
});
/* ------------------------------ 全局搜索 ------------------------------- */
publicRoutes.get('/search', (c) => {
    const q = (c.req.query('q') || '').trim();
    const scope = c.req.query('scope') || 'all';
    if (!q)
        return ok(c, { groups: [], total: 0 });
    const like = `%${q}%`;
    const groups = [];
    if (scope === 'all' || scope === 'article') {
        const items = all(`SELECT id,title,slug,summary,category,publishedAt AS date FROM articles
       WHERE status='published' AND (title LIKE ? OR summary LIKE ? OR content LIKE ?) LIMIT 6`, [like, like, like]);
        if (items.length)
            groups.push({ type: 'article', label: '新闻与通知', items });
    }
    if (scope === 'all' || scope === 'activity') {
        const items = all(`SELECT id,title,slug,summary,category,startAt AS date FROM activities
       WHERE status='published' AND (title LIKE ? OR summary LIKE ? OR content LIKE ?) LIMIT 6`, [like, like, like]);
        if (items.length)
            groups.push({ type: 'activity', label: '活动', items });
    }
    if (scope === 'all' || scope === 'project') {
        const items = all(`SELECT id,title,slug,summary,category,createdAt AS date FROM projects
       WHERE status='published' AND (title LIKE ? OR summary LIKE ? OR content LIKE ? OR team LIKE ?) LIMIT 6`, [like, like, like, like]);
        if (items.length)
            groups.push({ type: 'project', label: '创新项目', items });
    }
    if (scope === 'all' || scope === 'competition') {
        const items = all(`SELECT id,title,summary,level AS category,createdAt AS date FROM competitions
       WHERE status='published' AND (title LIKE ? OR summary LIKE ? OR organizer LIKE ?) LIMIT 6`, [like, like, like]);
        if (items.length)
            groups.push({ type: 'competition', label: '竞赛信息', items });
    }
    if (scope === 'all' || scope === 'resource') {
        const items = all(`SELECT id,title,description AS summary,category,createdAt AS date FROM resources
       WHERE (title LIKE ? OR description LIKE ?) LIMIT 6`, [like, like]);
        if (items.length)
            groups.push({ type: 'resource', label: '资源中心', items });
    }
    const total = groups.reduce((s, g) => s + g.items.length, 0);
    return ok(c, { groups, total, query: q });
});
/* -------------------------------- 标签 --------------------------------- */
publicRoutes.get('/tags', (c) => {
    const tags = all("SELECT tags FROM articles WHERE status='published'")
        .flatMap((r) => {
        try {
            return JSON.parse(r.tags);
        }
        catch {
            return [];
        }
    })
        .reduce((acc, t) => ((acc[t] = (acc[t] || 0) + 1), acc), {});
    return ok(c, Object.entries(tags).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
});
/* --------------------------- 用户中心（公开） -------------------------- */
publicRoutes.post('/feedback/:id/like', (c) => {
    get('UPDATE feedback SET likes=likes+1 WHERE id=?', [Number(c.req.param('id'))]);
    const row = get('SELECT likes FROM feedback WHERE id=?', [Number(c.req.param('id'))]);
    return ok(c, { likes: row?.likes ?? 0 });
});

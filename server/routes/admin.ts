/* =============================================================================
 * 后台管理接口 /api/admin/*
 * 通用 CRUD 工厂 + 专用端点（统计、导出、审核、签到、设置、日志）
 * ========================================================================== */
import { Hono } from 'hono';
import { all, get, insert, run, parseJsonFields, boolFields, UPLOAD_DIR } from '../db.ts';
import { ok, fail, readBody, paging, slugify, json, logOp, saveUpload } from '../util.ts';
import { requireAuth } from '../auth.ts';

export const adminRoutes = new Hono();

/* 所有后台接口都要求至少 admin 权限 */
adminRoutes.use('*', requireAuth('admin'));

const actor = (c: any) => c.get('user');

/* -------------------------------------------------------------------------- */
/*  通用 CRUD 工厂                                                             */
/* -------------------------------------------------------------------------- */
interface ResourceDef {
  table: string;
  fields: string[];
  search?: string[];
  order?: string;
  jsonFields?: string[];
  boolFields?: string[];
  slugFrom?: string;
  validate?: (data: Record<string, unknown>) => string | undefined;
  label: string;
}

function crud(def: ResourceDef) {
  const r = new Hono();

  /* 列表 */
  r.get('/', (c) => {
    const { page, pageSize, offset } = paging(c);
    const q = c.req.query('q');
    const status = c.req.query('status');
    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (q && def.search?.length) {
      where.push(`(${def.search.map((s) => `${s} LIKE ?`).join(' OR ')})`);
      def.search.forEach(() => params.push(`%${q}%`));
    }
    if (status && status !== 'all' && def.fields.includes('status')) {
      where.push('status=?');
      params.push(status);
    }
    const category = c.req.query('category');
    if (category && category !== 'all' && def.fields.includes('category')) {
      where.push('category=?');
      params.push(category);
    }
    const year = c.req.query('year');
    if (year && year !== 'all' && def.fields.includes('year')) {
      where.push('year=?');
      params.push(year);
    }
    const w = where.join(' AND ');
    const total = get<{ c: number }>(`SELECT COUNT(*) c FROM ${def.table} WHERE ${w}`, params)!.c;
    let items = all(
      `SELECT * FROM ${def.table} WHERE ${w} ORDER BY ${def.order || 'id DESC'} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    if (def.jsonFields) items = items.map((i: any) => parseJsonFields(i, def.jsonFields!));
    if (def.boolFields) items = items.map((i: any) => boolFields(i, def.boolFields!));
    return ok(c, { items, total, page, pageSize });
  });

  /* 单条 */
  r.get('/:id', (c) => {
    let row = get(`SELECT * FROM ${def.table} WHERE id=?`, [Number(c.req.param('id'))]);
    if (!row) return fail(c, '记录不存在', 404);
    if (def.jsonFields) row = parseJsonFields(row, def.jsonFields)!;
    if (def.boolFields) row = boolFields(row, def.boolFields)!;
    return ok(c, row);
  });

  /* 新建 */
  r.post('/', async (c) => {
    const body = await readBody<any>(c);
    const data: Record<string, any> = {};
    for (const f of def.fields) {
      if (body[f] === undefined) continue;
      data[f] = def.jsonFields?.includes(f) ? json(body[f]) : def.boolFields?.includes(f) ? (body[f] ? 1 : 0) : body[f];
    }
    const error = def.validate?.(data);
    if (error) return fail(c, error);
    if (def.slugFrom && !data.slug) data.slug = slugify(String(data[def.slugFrom] ?? '')) + '-' + Date.now().toString(36).slice(-4);
    const id = insert(def.table, data);
    logOp({ userId: actor(c)?.id, userName: actor(c)?.name, action: `新建${def.label}`, target: def.table, detail: String(data.title ?? data.name ?? id) });
    return ok(c, { id });
  });

  /* 更新 */
  r.patch('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const body = await readBody<any>(c);
    const data: Record<string, any> = {};
    for (const f of def.fields) {
      if (body[f] === undefined) continue;
      data[f] = def.jsonFields?.includes(f) ? json(body[f]) : def.boolFields?.includes(f) ? (body[f] ? 1 : 0) : body[f];
    }
    const error = def.validate?.(data);
    if (error) return fail(c, error);
    if (!Object.keys(data).length) return fail(c, '没有需要更新的字段');
    run(
      `UPDATE ${def.table} SET ${Object.keys(data).map((k) => `"${k}"=?`).join(',')} WHERE id=?`,
      [...Object.values(data), id]
    );
    logOp({ userId: actor(c)?.id, userName: actor(c)?.name, action: `更新${def.label}`, target: def.table, detail: String(data.title ?? data.name ?? id) });
    return ok(c, { updated: true });
  });

  /* 删除 */
  r.delete('/:id', (c) => {
    const id = Number(c.req.param('id'));
    run(`DELETE FROM ${def.table} WHERE id=?`, [id]);
    logOp({ userId: actor(c)?.id, userName: actor(c)?.name, action: `删除${def.label}`, target: def.table, detail: String(id) });
    return ok(c, { deleted: true });
  });

  return r;
}

/* -------------------------------------------------------------------------- */
/*  各资源挂载                                                                 */
/* -------------------------------------------------------------------------- */
adminRoutes.route(
  '/articles',
  crud({
    table: 'articles',
    label: '文章',
    fields: [
      'title', 'slug', 'category', 'summary', 'content', 'cover', 'tags', 'pinned',
      'status', 'authorId', 'publishedAt',
    ],
    search: ['title', 'summary'],
    order: 'pinned DESC, datetime(createdAt) DESC',
    jsonFields: ['tags'],
    boolFields: ['pinned'],
    slugFrom: 'title',
  })
);

adminRoutes.route(
  '/activities',
  crud({
    table: 'activities',
    label: '活动',
    fields: [
      'title', 'slug', 'cover', 'summary', 'content', 'location', 'category',
      'startAt', 'endAt', 'signupStart', 'signupEnd', 'capacity', 'status',
    ],
    search: ['title', 'location'],
    order: 'datetime(startAt) DESC',
    slugFrom: 'title',
  })
);

adminRoutes.route(
  '/projects',
  crud({
    table: 'projects',
    label: '项目',
    fields: [
      'title', 'slug', 'cover', 'demoUrl', 'summary', 'content', 'category', 'year', 'team',
      'members', 'advisor', 'tags', 'awards', 'status',
    ],
    search: ['title', 'team', 'advisor'],
    order: 'year DESC, id DESC',
    jsonFields: ['tags', 'members'],
    slugFrom: 'title',
    validate: (data) => {
      if (data.demoUrl == null || data.demoUrl === '') return;
      if (typeof data.demoUrl === 'string') {
        try {
          const url = new URL(data.demoUrl);
          if (url.protocol === 'https:' || url.protocol === 'http:') return;
        } catch { /* 无效地址 */ }
      }
      return '演示地址必须为有效的 HTTP(S) 链接';
    },
  })
);

adminRoutes.route(
  '/competitions',
  crud({
    table: 'competitions',
    label: '竞赛',
    fields: ['title', 'level', 'organizer', 'summary', 'content', 'signupDeadline', 'link', 'cover', 'status'],
    search: ['title', 'organizer'],
    order: 'datetime(signupDeadline) ASC',
  })
);

adminRoutes.route(
  '/resources',
  crud({
    table: 'resources',
    label: '资源',
    fields: ['title', 'category', 'description', 'url', 'fileType', 'fileSize', 'downloads', 'external', 'sortOrder'],
    search: ['title', 'description'],
    order: 'sortOrder ASC, id DESC',
    boolFields: ['external'],
  })
);

adminRoutes.route(
  '/join-positions',
  crud({
    table: 'join_positions',
    label: '招新岗位',
    fields: ['name', 'group', 'headcount', 'description', 'requirements', 'sortOrder', 'active'],
    search: ['name'],
    order: 'sortOrder ASC',
    jsonFields: ['requirements'],
    boolFields: ['active'],
  })
);

adminRoutes.route(
  '/members',
  crud({
    table: 'members',
    label: '成员',
    fields: ['name', 'role', 'group', 'avatar', 'bio', 'tags', 'sortOrder', 'featured'],
    search: ['name', 'role'],
    order: 'sortOrder ASC',
    jsonFields: ['tags'],
    boolFields: ['featured'],
  })
);

adminRoutes.route(
  '/timeline',
  crud({
    table: 'timeline',
    label: '发展历程',
    fields: ['year', 'title', 'description', 'sortOrder'],
    search: ['title'],
    order: 'sortOrder ASC',
  })
);

adminRoutes.route(
  '/org-nodes',
  crud({
    table: 'org_nodes',
    label: '组织架构',
    fields: ['name', 'parentId', 'leader', 'description', 'sortOrder'],
    search: ['name'],
    order: 'sortOrder ASC',
  })
);

adminRoutes.route(
  '/status-targets',
  crud({
    table: 'status_targets',
    label: '监控目标',
    fields: ['name', 'type', 'url', 'host', 'description', 'sortOrder', 'active'],
    search: ['name'],
    order: 'sortOrder ASC',
    boolFields: ['active'],
  })
);

/* -------------------------------------------------------------------------- */
/*  画廊                                                      */
/* -------------------------------------------------------------------------- */
adminRoutes.route(
  '/gallery/areas',
  crud({
    table: 'gallery_areas',
    label: '画廊区域',
    fields: ['name', 'slug', 'parentId', 'description', 'sortOrder'],
    search: ['name'],
    order: 'sortOrder ASC',
    slugFrom: 'name',
  })
);

adminRoutes.get('/gallery/images', (c) => {
  const { page, pageSize, offset } = paging(c);
  const areaId = c.req.query('areaId');
  const q = c.req.query('q');
  const where: string[] = ['1=1'];
  const params: any[] = [];
  if (areaId && areaId !== 'all') {
    where.push('g.areaId=?');
    params.push(Number(areaId));
  }
  if (q) {
    where.push('(g.title LIKE ? OR g.description LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  const w = where.join(' AND ');
  const total = get<{ c: number }>(`SELECT COUNT(*) c FROM gallery_images g WHERE ${w}`, params)!.c;
  const items = all(
    `SELECT g.*, a.name AS areaName FROM gallery_images g LEFT JOIN gallery_areas a ON a.id=g.areaId
     WHERE ${w} ORDER BY g.sortOrder ASC, g.id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return ok(c, { items, total, page, pageSize });
});

adminRoutes.post('/gallery/images', async (c) => {
  const body = await readBody<any>(c);
  if (!body.areaId) return fail(c, '请选择所属区域');
  const urls: string[] = Array.isArray(body.urls) ? body.urls : body.url ? [body.url] : [];
  if (!urls.length) return fail(c, '请提供图片');
  const max = get<{ m: number }>('SELECT COALESCE(MAX(sortOrder),0) m FROM gallery_images WHERE areaId=?', [body.areaId])!.m;
  const ids: number[] = [];
  urls.forEach((url, i) => {
    ids.push(
      insert('gallery_images', {
        areaId: Number(body.areaId),
        url,
        title: body.title || '',
        description: body.description || null,
        width: Number(body.width) || 0,
        height: Number(body.height) || 0,
        sortOrder: max + i + 1,
      })
    );
  });
  logOp({ userId: actor(c)?.id, userName: actor(c)?.name, action: '上传画廊图片', target: 'gallery', detail: `${urls.length} 张` });
  return ok(c, { ids, count: ids.length });
});

adminRoutes.patch('/gallery/images/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await readBody<any>(c);
  const data: Record<string, any> = {};
  for (const f of ['areaId', 'url', 'title', 'description', 'sortOrder']) if (body[f] !== undefined) data[f] = body[f];
  if (!Object.keys(data).length) return fail(c, '没有需要更新的字段');
  run(`UPDATE gallery_images SET ${Object.keys(data).map((k) => `"${k}"=?`).join(',')} WHERE id=?`, [
    ...Object.values(data),
    id,
  ]);
  return ok(c, { updated: true });
});

adminRoutes.delete('/gallery/images/:id', (c) => {
  run('DELETE FROM gallery_images WHERE id=?', [Number(c.req.param('id'))]);
  return ok(c, { deleted: true });
});

/** 批量：跨区域移动 / 排序 */
adminRoutes.post('/gallery/images/batch', async (c) => {
  const body = await readBody<{ ids: number[]; action: 'move' | 'delete' | 'order'; areaId?: number; order?: number[] }>(c);
  const ids = body.ids ?? [];
  if (!ids.length) return fail(c, '请选择图片');
  if (body.action === 'delete') {
    run(`DELETE FROM gallery_images WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
    logOp({ userId: actor(c)?.id, userName: actor(c)?.name, action: '删除画廊图片', target: 'gallery', detail: `${ids.length} 张` });
    return ok(c, { deleted: ids.length });
  }
  if (body.action === 'move') {
    if (!body.areaId) return fail(c, '请选择目标区域');
    const max = get<{ m: number }>('SELECT COALESCE(MAX(sortOrder),0) m FROM gallery_images WHERE areaId=?', [body.areaId])!.m;
    ids.forEach((id, i) =>
      run('UPDATE gallery_images SET areaId=?, sortOrder=? WHERE id=?', [body.areaId!, max + i + 1, id])
    );
    logOp({ userId: actor(c)?.id, userName: actor(c)?.name, action: '移动画廊图片', target: 'gallery', detail: `${ids.length} 张 → 区域 ${body.areaId}` });
    return ok(c, { moved: ids.length });
  }
  if (body.action === 'order' && body.order) {
    body.order.forEach((id, i) => run('UPDATE gallery_images SET sortOrder=? WHERE id=?', [i + 1, id]));
    return ok(c, { reordered: body.order.length });
  }
  return fail(c, '未知操作');
});

/* -------------------------------------------------------------------------- */
/*  报名 / 申报 / 招新 管理                                          */
/* -------------------------------------------------------------------------- */
adminRoutes.get('/signups', (c) => {
  const { page, pageSize, offset } = paging(c);
  const activityId = c.req.query('activityId');
  const q = c.req.query('q');
  const where: string[] = ['1=1'];
  const params: any[] = [];
  if (activityId && activityId !== 'all') {
    where.push('s.activityId=?');
    params.push(Number(activityId));
  }
  if (q) {
    where.push('(s.name LIKE ? OR s.studentId LIKE ? OR s.college LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const w = where.join(' AND ');
  const total = get<{ c: number }>(`SELECT COUNT(*) c FROM activity_signups s WHERE ${w}`, params)!.c;
  const items = all(
    `SELECT s.*, a.title AS activityTitle FROM activity_signups s LEFT JOIN activities a ON a.id=s.activityId
     WHERE ${w} ORDER BY datetime(s.createdAt) DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  ).map((r: any) => boolFields(r, ['checkedIn']));
  const activities = all('SELECT id,title,capacity FROM activities ORDER BY datetime(startAt) DESC');
  return ok(c, { items, total, page, pageSize }, {
    activities: activities.map((a: any) => ({
      ...a,
      signedCount: get<{ c: number }>('SELECT COUNT(*) c FROM activity_signups WHERE activityId=?', [a.id])!.c,
    })),
  });
});

adminRoutes.post('/signups/:id/checkin', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await readBody<{ checkedIn?: boolean }>(c);
  const val = body.checkedIn === false ? 0 : 1;
  run('UPDATE activity_signups SET checkedIn=? WHERE id=?', [val, id]);
  return ok(c, { checkedIn: !!val });
});

/** 签到二维码数据（前端渲染成二维码） */
adminRoutes.get('/signups/qrcode/:activityId', (c) => {
  const id = Number(c.req.param('activityId'));
  const act = get<any>('SELECT * FROM activities WHERE id=?', [id]);
  if (!act) return fail(c, '活动不存在', 404);
  return ok(c, { activity: act, payload: `STI-CHECKIN:${act.id}:${slugify(act.title)}` });
});

adminRoutes.delete('/signups/:id', (c) => {
  run('DELETE FROM activity_signups WHERE id=?', [Number(c.req.param('id'))]);
  return ok(c, { deleted: true });
});

adminRoutes.get('/applications', (c) => {
  const { page, pageSize, offset } = paging(c);
  const status = c.req.query('status');
  const q = c.req.query('q');
  const where: string[] = ['1=1'];
  const params: any[] = [];
  if (status && status !== 'all') {
    where.push('pa.status=?');
    params.push(status);
  }
  if (q) {
    where.push('(pa.title LIKE ? OR pa.leaderName LIKE ? OR pa.leaderStudentId LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const w = where.join(' AND ');
  const total = get<{ c: number }>(`SELECT COUNT(*) c FROM project_applications pa WHERE ${w}`, params)!.c;
  const items = all(
    `SELECT pa.*, cmp.title AS competitionTitle FROM project_applications pa
     LEFT JOIN competitions cmp ON cmp.id=pa.competitionId
     WHERE ${w} ORDER BY datetime(pa.createdAt) DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  ).map((r: any) => parseJsonFields(r, ['members', 'materials']));
  const counts = all<{ status: string; c: number }>('SELECT status, COUNT(*) c FROM project_applications GROUP BY status');
  return ok(c, { items, total, page, pageSize }, { counts: Object.fromEntries(counts.map((r) => [r.status, r.c])) });
});

adminRoutes.patch('/applications/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await readBody<{ status?: string; reviewNote?: string }>(c);
  const data: Record<string, any> = { updatedAt: new Date().toLocaleString('sv-SE').replace('T', ' ') };
  if (body.status) data.status = body.status;
  if (body.reviewNote !== undefined) data.reviewNote = body.reviewNote;
  run(`UPDATE project_applications SET ${Object.keys(data).map((k) => `"${k}"=?`).join(',')} WHERE id=?`, [
    ...Object.values(data),
    id,
  ]);
  const row = get<any>('SELECT * FROM project_applications WHERE id=?', [id]);
  if (row?.userId && body.status) {
    const label: Record<string, string> = { pending: '待审核', reviewing: '审核中', approved: '已通过', rejected: '未通过' };
    insert('user_messages', {
      userId: row.userId,
      title: `项目申报${label[body.status] ?? '状态更新'}`,
      content: `「${row.title}」当前状态：${label[body.status] ?? body.status}。${body.reviewNote || ''}`,
      link: '/account/applications',
    });
  }
  logOp({ userId: actor(c)?.id, userName: actor(c)?.name, action: '审核项目申报', target: 'project', detail: `${row?.title ?? id} → ${body.status}` });
  return ok(c, { updated: true });
});

adminRoutes.get('/join-applications', (c) => {
  const { page, pageSize, offset } = paging(c);
  const status = c.req.query('status');
  const q = c.req.query('q');
  const where: string[] = ['1=1'];
  const params: any[] = [];
  if (status && status !== 'all') {
    where.push('ja.status=?');
    params.push(status);
  }
  if (q) {
    where.push('(ja.name LIKE ? OR ja.studentId LIKE ? OR ja.college LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const w = where.join(' AND ');
  const total = get<{ c: number }>(`SELECT COUNT(*) c FROM join_applications ja WHERE ${w}`, params)!.c;
  const items = all(
    `SELECT ja.*, jp.name AS positionName FROM join_applications ja
     LEFT JOIN join_positions jp ON jp.id=ja.positionId
     WHERE ${w} ORDER BY datetime(ja.createdAt) DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const counts = all<{ status: string; c: number }>('SELECT status, COUNT(*) c FROM join_applications GROUP BY status');
  return ok(c, { items, total, page, pageSize }, { counts: Object.fromEntries(counts.map((r) => [r.status, r.c])) });
});

adminRoutes.patch('/join-applications/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await readBody<{ status?: string; reviewNote?: string }>(c);
  const data: Record<string, any> = {};
  if (body.status) data.status = body.status;
  if (body.reviewNote !== undefined) data.reviewNote = body.reviewNote;
  if (!Object.keys(data).length) return fail(c, '没有需要更新的字段');
  run(`UPDATE join_applications SET ${Object.keys(data).map((k) => `"${k}"=?`).join(',')} WHERE id=?`, [
    ...Object.values(data),
    id,
  ]);
  const row = get<any>('SELECT * FROM join_applications WHERE id=?', [id]);
  if (row?.userId && body.status) {
    insert('user_messages', {
      userId: row.userId,
      title: body.status === 'approved' ? '恭喜！你已通过招新面试' : '招新报名状态更新',
      content: body.status === 'approved' ? '欢迎加入科技创新部！请留意后续的入部培训通知。' : body.reviewNote || '',
      link: '/account/join',
    });
  }
  logOp({ userId: actor(c)?.id, userName: actor(c)?.name, action: '审核招新报名', target: 'join', detail: `${row?.name ?? id} → ${body.status}` });
  return ok(c, { updated: true });
});

adminRoutes.delete('/join-applications/:id', (c) => {
  run('DELETE FROM join_applications WHERE id=?', [Number(c.req.param('id'))]);
  return ok(c, { deleted: true });
});

/* -------------------------------------------------------------------------- */
/*  留言与反馈                                                                 */
/* -------------------------------------------------------------------------- */
adminRoutes.get('/feedback', (c) => {
  const { page, pageSize, offset } = paging(c);
  const status = c.req.query('status');
  const type = c.req.query('type');
  const where: string[] = ['1=1'];
  const params: any[] = [];
  if (status && status !== 'all') {
    where.push('status=?');
    params.push(status);
  }
  if (type && type !== 'all') {
    where.push('type=?');
    params.push(type);
  }
  const w = where.join(' AND ');
  const total = get<{ c: number }>(`SELECT COUNT(*) c FROM feedback WHERE ${w}`, params)!.c;
  const items = all(`SELECT * FROM feedback WHERE ${w} ORDER BY datetime(createdAt) DESC LIMIT ? OFFSET ?`, [
    ...params,
    pageSize,
    offset,
  ]).map((f: any) => boolFields(f, ['anonymous']));
  return ok(c, { items, total, page, pageSize });
});

adminRoutes.patch('/feedback/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await readBody<{ reply?: string; status?: string }>(c);
  const data: Record<string, any> = {};
  if (body.reply !== undefined) {
    data.reply = body.reply;
    data.repliedAt = new Date().toLocaleString('sv-SE').replace('T', ' ');
    data.status = body.status || 'replied';
  }
  if (body.status) data.status = body.status;
  if (!Object.keys(data).length) return fail(c, '没有需要更新的字段');
  run(`UPDATE feedback SET ${Object.keys(data).map((k) => `"${k}"=?`).join(',')} WHERE id=?`, [...Object.values(data), id]);
  const row = get<any>('SELECT * FROM feedback WHERE id=?', [id]);
  if (row?.userId && body.reply) {
    insert('user_messages', {
      userId: row.userId,
      title: '你的留言已收到回复',
      content: `关于「${row.title}」：${body.reply}`,
      link: '/feedback',
    });
  }
  logOp({ userId: actor(c)?.id, userName: actor(c)?.name, action: '回复留言', target: 'feedback', detail: String(row?.title ?? id) });
  return ok(c, { updated: true });
});

adminRoutes.delete('/feedback/:id', (c) => {
  run('DELETE FROM feedback WHERE id=?', [Number(c.req.param('id'))]);
  return ok(c, { deleted: true });
});

/* -------------------------------------------------------------------------- */
/*  用户与角色                                                                 */
/* -------------------------------------------------------------------------- */
adminRoutes.get('/users', (c) => {
  const { page, pageSize, offset } = paging(c);
  const role = c.req.query('role');
  const q = c.req.query('q');
  const where: string[] = ['1=1'];
  const params: any[] = [];
  if (role && role !== 'all') {
    where.push('role=?');
    params.push(role);
  }
  if (q) {
    where.push('(username LIKE ? OR name LIKE ? OR email LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const w = where.join(' AND ');
  const total = get<{ c: number }>(`SELECT COUNT(*) c FROM users WHERE ${w}`, params)!.c;
  const items = all(
    `SELECT id,username,name,role,email,phone,avatar,studentId,college,isActive,createdAt
     FROM users WHERE ${w} ORDER BY id ASC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  ).map((u: any) => ({ ...u, isActive: !!u.isActive }));
  const counts = all<{ role: string; c: number }>('SELECT role, COUNT(*) c FROM users GROUP BY role');
  return ok(c, { items, total, page, pageSize }, { counts: Object.fromEntries(counts.map((r) => [r.role, r.c])) });
});

adminRoutes.patch('/users/:id', requireAuth('superadmin'), async (c) => {
  const id = Number(c.req.param('id'));
  const me = actor(c)!;
  const body = await readBody<any>(c);
  const data: Record<string, any> = {};
  for (const f of ['name', 'role', 'email', 'phone', 'college', 'studentId']) if (body[f] !== undefined) data[f] = body[f];
  if (body.isActive !== undefined) data.isActive = body.isActive ? 1 : 0;
  if (id === me.id && data.role && data.role !== 'superadmin') return fail(c, '不能修改自己的超级管理员角色');
  if (!Object.keys(data).length) return fail(c, '没有需要更新的字段');
  run(`UPDATE users SET ${Object.keys(data).map((k) => `"${k}"=?`).join(',')} WHERE id=?`, [...Object.values(data), id]);
  logOp({ userId: me.id, userName: me.name, action: '修改用户', target: 'user', detail: `#${id}` });
  return ok(c, { updated: true });
});

adminRoutes.delete('/users/:id', requireAuth('superadmin'), (c) => {
  const id = Number(c.req.param('id'));
  if (id === actor(c)!.id) return fail(c, '不能删除自己的账号');
  run('DELETE FROM users WHERE id=?', [id]);
  logOp({ userId: actor(c)?.id, userName: actor(c)?.name, action: '删除用户', target: 'user', detail: `#${id}` });
  return ok(c, { deleted: true });
});

/** 群发站内消息 */
adminRoutes.post('/users/broadcast', requireAuth('admin'), async (c) => {
  const body = await readBody<{ role?: string; title: string; content: string; link?: string }>(c);
  if (!body.title) return fail(c, '请填写消息标题');
  const users = body.role && body.role !== 'all'
    ? all<{ id: number }>('SELECT id FROM users WHERE role=? AND isActive=1', [body.role])
    : all<{ id: number }>('SELECT id FROM users WHERE isActive=1');
  for (const u of users)
    insert('user_messages', { userId: u.id, title: body.title, content: body.content || '', link: body.link || null });
  logOp({ userId: actor(c)?.id, userName: actor(c)?.name, action: '群发消息', target: 'user', detail: `${users.length} 人` });
  return ok(c, { sent: users.length });
});

/* -------------------------------------------------------------------------- */
/*  站点设置 / 页面                                                            */
/* -------------------------------------------------------------------------- */
adminRoutes.get('/settings', (c) => {
  const rows = all<{ key: string; value: string }>('SELECT * FROM settings');
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return ok(c, out);
});

adminRoutes.put('/settings', async (c) => {
  const body = await readBody<Record<string, string>>(c);
  for (const [k, v] of Object.entries(body)) {
    run('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)', [k, String(v ?? '')]);
  }
  logOp({ userId: actor(c)?.id, userName: actor(c)?.name, action: '修改站点设置', target: 'settings', detail: Object.keys(body).join(', ') });
  return ok(c, { updated: Object.keys(body).length });
});

adminRoutes.get('/pages', (c) => ok(c, all('SELECT * FROM pages')));

adminRoutes.put('/pages/:key', async (c) => {
  const key = c.req.param('key');
  const body = await readBody<{ title?: string; content?: string }>(c);
  const exists = get('SELECT key FROM pages WHERE key=?', [key]);
  if (exists)
    run('UPDATE pages SET title=COALESCE(?,title), content=COALESCE(?,content), updatedAt=? WHERE key=?', [
      body.title ?? null,
      body.content ?? null,
      new Date().toLocaleString('sv-SE').replace('T', ' '),
      key,
    ]);
  else insert('pages', { key, title: body.title || key, content: body.content || '' });
  logOp({ userId: actor(c)?.id, userName: actor(c)?.name, action: '修改页面', target: 'page', detail: key });
  return ok(c, { updated: true });
});

/* -------------------------------------------------------------------------- */
/*  统计报表                                                                   */
/* -------------------------------------------------------------------------- */
adminRoutes.get('/stats', (c) => {
  const one = (sql: string, p: any[] = []) => get<{ c: number }>(sql, p)?.c ?? 0;
  const trend: any[] = [];
  for (let d = 13; d >= 0; d--) {
    const day = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
    trend.push({
      date: day.slice(5),
      signups: one('SELECT COUNT(*) c FROM activity_signups WHERE date(createdAt)=?', [day]),
      applications: one('SELECT COUNT(*) c FROM project_applications WHERE date(createdAt)=?', [day]),
      joins: one('SELECT COUNT(*) c FROM join_applications WHERE date(createdAt)=?', [day]),
      feedback: one('SELECT COUNT(*) c FROM feedback WHERE date(createdAt)=?', [day]),
      views: 200 + Math.round(Math.abs(Math.sin(d * 1.7)) * 900) + d * 23,
    });
  }
  const newsByCat = all<{ category: string; c: number }>('SELECT category, COUNT(*) c FROM articles GROUP BY category');
  const projByCat = all<{ category: string; c: number }>('SELECT category, COUNT(*) c FROM projects GROUP BY category');
  const signupByAct = all<any>(
    `SELECT a.title AS name, COUNT(s.id) AS value FROM activities a
     LEFT JOIN activity_signups s ON s.activityId=a.id GROUP BY a.id ORDER BY value DESC LIMIT 6`
  );
  const applyStatus = all<{ status: string; c: number }>('SELECT status, COUNT(*) c FROM project_applications GROUP BY status');

  return ok(c, {
    articles: one('SELECT COUNT(*) c FROM articles'),
    publishedArticles: one("SELECT COUNT(*) c FROM articles WHERE status='published'"),
    pendingArticles: one("SELECT COUNT(*) c FROM articles WHERE status='pending'"),
    activities: one('SELECT COUNT(*) c FROM activities'),
    projects: one('SELECT COUNT(*) c FROM projects'),
    competitions: one('SELECT COUNT(*) c FROM competitions'),
    resources: one('SELECT COUNT(*) c FROM resources'),
    galleryImages: one('SELECT COUNT(*) c FROM gallery_images'),
    galleryAreas: one('SELECT COUNT(*) c FROM gallery_areas'),
    signups: one('SELECT COUNT(*) c FROM activity_signups'),
    checkedIn: one('SELECT COUNT(*) c FROM activity_signups WHERE checkedIn=1'),
    applications: one('SELECT COUNT(*) c FROM project_applications'),
    applicationsPending: one("SELECT COUNT(*) c FROM project_applications WHERE status='pending'"),
    joinApplications: one('SELECT COUNT(*) c FROM join_applications'),
    joinPending: one("SELECT COUNT(*) c FROM join_applications WHERE status='pending'"),
    feedback: one('SELECT COUNT(*) c FROM feedback'),
    feedbackOpen: one("SELECT COUNT(*) c FROM feedback WHERE status='open'"),
    users: one('SELECT COUNT(*) c FROM users'),
    members: one('SELECT COUNT(*) c FROM members'),
    totalViews: one('SELECT COALESCE(SUM(views),0) c FROM articles') + one('SELECT COALESCE(SUM(views),0) c FROM projects'),
    timeline: all('SELECT * FROM timeline ORDER BY sortOrder ASC'),
    trend,
    newsByCat: newsByCat.map((r) => ({ name: catLabel(r.category), value: r.c, key: r.category })),
    projByCat: projByCat.map((r) => ({ name: projLabel(r.category), value: r.c, key: r.category })),
    signupByAct,
    applyStatus: applyStatus.map((r) => ({ name: applyLabel(r.status), value: r.c, key: r.status })),
    recentLogs: all('SELECT * FROM operation_logs ORDER BY datetime(createdAt) DESC LIMIT 12'),
    topArticles: all(
      "SELECT title,views,slug FROM articles WHERE status='published' ORDER BY views DESC LIMIT 8"
    ),
  });
});

function catLabel(k: string) {
  return ({ notice: '通知公告', dept: '部门新闻', competition: '竞赛信息', policy: '政策文件' } as any)[k] ?? k;
}
function projLabel(k: string) {
  const labels: Record<string, string> = { excellent: '优秀项目', approved: '立项项目', completed: '结项项目', ongoing: '在研项目', competition: '竞赛成果', frontend: '前端作品' };
  return labels[k] ?? k;
}
function applyLabel(k: string) {
  return ({ pending: '待审核', reviewing: '审核中', approved: '已通过', rejected: '未通过' } as any)[k] ?? k;
}

/* -------------------------------------------------------------------------- */
/*  数据导出（CSV）                                                            */
/* -------------------------------------------------------------------------- */
adminRoutes.get('/export/:kind', (c) => {
  const kind = c.req.param('kind');
  const activityId = c.req.query('activityId');
  let headers: string[] = [];
  let rows: any[][] = [];
  let filename = 'export.csv';

  if (kind === 'signups') {
    const where = activityId && activityId !== 'all' ? 'WHERE s.activityId=?' : '';
    const data = all<any>(
      `SELECT s.*, a.title AS activityTitle FROM activity_signups s LEFT JOIN activities a ON a.id=s.activityId
       ${where} ORDER BY s.activityId, datetime(s.createdAt)`,
      activityId && activityId !== 'all' ? [Number(activityId)] : []
    );
    headers = ['活动名称', '姓名', '学号', '学院', '专业', '手机', '邮箱', '已签到', '报名时间', '备注'];
    rows = data.map((s) => [s.activityTitle, s.name, s.studentId, s.college, s.major ?? '', s.phone, s.email ?? '', s.checkedIn ? '是' : '否', s.createdAt, s.remark ?? '']);
    filename = `报名名单_${activityId || 'all'}.csv`;
  } else if (kind === 'applications') {
    const data = all<any>('SELECT * FROM project_applications ORDER BY datetime(createdAt) DESC');
    headers = ['项目名称', '类别', '负责人', '学号', '学院', '电话', '邮箱', '指导教师', '团队人数', '状态', '审核意见', '提交时间'];
    rows = data.map((a) => [
      a.title, a.category, a.leaderName, a.leaderStudentId, a.leaderCollege, a.leaderPhone, a.leaderEmail ?? '',
      a.advisor ?? '', String(a.teamSize), applyLabel(a.status), a.reviewNote ?? '', a.createdAt,
    ]);
    filename = '项目申报汇总.csv';
  } else if (kind === 'join') {
    const data = all<any>(
      `SELECT ja.*, jp.name AS positionName FROM join_applications ja LEFT JOIN join_positions jp ON jp.id=ja.positionId
       ORDER BY datetime(ja.createdAt) DESC`
    );
    headers = ['姓名', '学号', '学院', '专业', '年级', '手机', '邮箱', '意向岗位', '技能', '自我介绍', '状态', '提交时间'];
    rows = data.map((a) => [
      a.name, a.studentId, a.college, a.major, a.grade, a.phone, a.email ?? '', a.positionName ?? '',
      a.skills, a.intro, applyLabel(a.status), a.createdAt,
    ]);
    filename = '招新报名汇总.csv';
  } else if (kind === 'feedback') {
    const data = all<any>('SELECT * FROM feedback ORDER BY datetime(createdAt) DESC');
    headers = ['类型', '标题', '内容', '状态', '回复', '点赞', '提交时间'];
    rows = data.map((f) => [f.type, f.title, f.content, f.status, f.reply ?? '', String(f.likes), f.createdAt]);
    filename = '留言反馈汇总.csv';
  } else {
    return fail(c, '不支持的导出类型', 400);
  }

  const csv = '\uFEFF' + [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  logOp({ userId: actor(c)?.id, userName: actor(c)?.name, action: '导出数据', target: kind, detail: `${rows.length} 条` });
  return c.body(csv);
});

function csvCell(v: any): string {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* -------------------------------------------------------------------------- */
/*  操作日志 / 数据备份                                                        */
/* -------------------------------------------------------------------------- */
adminRoutes.get('/logs', (c) => {
  const { page, pageSize, offset } = paging(c);
  const q = c.req.query('q');
  const where: string[] = ['1=1'];
  const params: any[] = [];
  if (q) {
    where.push('(action LIKE ? OR detail LIKE ? OR userName LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const w = where.join(' AND ');
  const total = get<{ c: number }>(`SELECT COUNT(*) c FROM operation_logs WHERE ${w}`, params)!.c;
  const items = all(`SELECT * FROM operation_logs WHERE ${w} ORDER BY datetime(createdAt) DESC LIMIT ? OFFSET ?`, [
    ...params,
    pageSize,
    offset,
  ]);
  return ok(c, { items, total, page, pageSize });
});

adminRoutes.delete('/logs', requireAuth('superadmin'), (c) => {
  run('DELETE FROM operation_logs');
  return ok(c, { cleared: true });
});

adminRoutes.get('/backup', requireAuth('superadmin'), (c) => {
  const tables = ['articles', 'activities', 'activity_signups', 'projects', 'competitions', 'project_applications', 'resources', 'join_positions', 'join_applications', 'feedback', 'gallery_areas', 'gallery_images', 'members', 'timeline', 'org_nodes', 'status_targets', 'settings', 'pages'];
  const dump: Record<string, any[]> = {};
  for (const t of tables) dump[t] = all(`SELECT * FROM ${t}`);
  c.header('Content-Type', 'application/json; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="sti-portal-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  return c.body(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), tables: dump }, null, 2));
});

/** 数据概览：各表行数 */
adminRoutes.get('/db-summary', (c) => {
  const tables = ['users', 'articles', 'activities', 'activity_signups', 'projects', 'competitions', 'project_applications', 'resources', 'join_positions', 'join_applications', 'feedback', 'gallery_areas', 'gallery_images', 'members', 'timeline', 'org_nodes', 'status_targets', 'status_snapshots', 'operation_logs', 'user_messages'];
  return ok(
    c,
    tables.map((t) => ({ table: t, rows: get<{ c: number }>(`SELECT COUNT(*) c FROM ${t}`)?.c ?? 0 }))
  );
});

/* -------------------------------------------------------------------------- */
/*  文件上传                                                                   */
/* -------------------------------------------------------------------------- */
adminRoutes.post('/upload', async (c) => {
  const body = await c.req.parseBody({ all: true });
  const files: File[] = [];
  for (const v of Object.values(body)) {
    if (Array.isArray(v)) files.push(...(v.filter((x) => x instanceof File) as File[]));
    else if (v instanceof File) files.push(v);
  }
  if (!files.length) return fail(c, '未收到文件');
  const out = [];
  for (const f of files) {
    if (f.size > 30 * 1024 * 1024) return fail(c, `文件 ${f.name} 超过 30MB 限制`);
    out.push(await saveUpload(f));
  }
  logOp({ userId: actor(c)?.id, userName: actor(c)?.name, action: '上传文件', target: 'upload', detail: out.map((o) => o.name).join(', ') });
  return ok(c, out);
});

/** 清空某个模块的演示数据（保护性：仅超级管理员） */
adminRoutes.post('/reset-demo', requireAuth('superadmin'), async (c) => {
  const { seed } = await import('../db.ts');
  try {
    seed();
    return ok(c, { seeded: true });
  } catch (e: any) {
    return fail(c, '播种失败：' + e.message);
  }
});

export { UPLOAD_DIR };

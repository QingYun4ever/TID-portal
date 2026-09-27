/* =============================================================================
 * 公开提交接口（表单类）
 * ========================================================================== */
import { Hono } from 'hono';
import { all, get, insert, run } from '../db.ts';
import { ok, fail, readBody, logOp } from '../util.ts';
import { currentUser, requireAuth } from '../auth.ts';

export const submitRoutes = new Hono();

const now = () => new Date().toLocaleString('sv-SE').replace('T', ' ');

/* ------------------------------ 活动报名 -------------------------------- */
submitRoutes.post('/activities/:id/signup', async (c) => {
  const activityId = Number(c.req.param('id'));
  const act = get<any>('SELECT * FROM activities WHERE id=?', [activityId]);
  if (!act) return fail(c, '活动不存在', 404);

  const body = await readBody<any>(c);
  const name = (body.name || '').trim();
  const studentId = (body.studentId || '').trim();
  const phone = (body.phone || '').trim();
  if (!name) return fail(c, '请填写姓名');
  if (!studentId) return fail(c, '请填写学号');
  if (!phone) return fail(c, '请填写手机号');

  if (act.status !== 'published') return fail(c, '该活动暂未开放报名');
  const t = now();
  if (act.signupStart && act.signupStart > t) return fail(c, '报名尚未开始');
  if (act.signupEnd && act.signupEnd < t) return fail(c, '报名已截止');

  const signed = get<{ c: number }>('SELECT COUNT(*) c FROM activity_signups WHERE activityId=?', [activityId])!.c;
  if (act.capacity > 0 && signed >= act.capacity) return fail(c, '报名名额已满');
  if (get('SELECT id FROM activity_signups WHERE activityId=? AND studentId=?', [activityId, studentId]))
    return fail(c, '该学号已报名本活动', 409);

  const user = currentUser(c);
  const id = insert('activity_signups', {
    activityId,
    userId: user?.id ?? null,
    name,
    studentId,
    college: body.college || '',
    major: body.major || null,
    phone,
    email: body.email || null,
    remark: body.remark || null,
  });
  if (user) {
    insert('user_messages', {
      userId: user.id,
      title: '活动报名成功',
      content: `你已成功报名「${act.title}」，活动时间：${act.startAt}，地点：${act.location}。`,
      link: `/activities/${act.slug}`,
    });
  }
  logOp({ userId: user?.id, userName: name, action: '活动报名', target: 'activity', detail: act.title });
  const row = get('SELECT * FROM activity_signups WHERE id=?', [id]);
  return ok(c, { signup: row, queue: signed + 1, capacity: act.capacity });
});

submitRoutes.post('/activities/:id/cancel', async (c) => {
  const activityId = Number(c.req.param('id'));
  const body = await readBody<{ studentId: string }>(c);
  const sid = (body.studentId || '').trim();
  if (!sid) return fail(c, '请提供学号');
  const row = get<any>('SELECT * FROM activity_signups WHERE activityId=? AND studentId=?', [activityId, sid]);
  if (!row) return fail(c, '未找到报名记录', 404);
  run('DELETE FROM activity_signups WHERE id=?', [row.id]);
  return ok(c, { cancelled: true });
});

/* ------------------------------ 项目申报 -------------------------------- */
submitRoutes.post('/projects/apply', async (c) => {
  const body = await readBody<any>(c);
  const title = (body.title || '').trim();
  const leaderName = (body.leaderName || '').trim();
  const leaderStudentId = (body.leaderStudentId || '').trim();
  const leaderPhone = (body.leaderPhone || '').trim();
  if (!title) return fail(c, '请填写项目名称');
  if (!leaderName) return fail(c, '请填写负责人姓名');
  if (!leaderStudentId) return fail(c, '请填写负责人学号');
  if (!leaderPhone) return fail(c, '请填写联系电话');
  if (!body.intro || String(body.intro).trim().length < 20) return fail(c, '项目简介至少 20 字');

  const user = currentUser(c);
  const dup = get(
    "SELECT id FROM project_applications WHERE title=? AND leaderStudentId=? AND status IN ('pending','reviewing','approved')",
    [title, leaderStudentId]
  );
  if (dup) return fail(c, '该项目已有在审申报记录，请勿重复提交', 409);

  const id = insert('project_applications', {
    title,
    competitionId: body.competitionId || null,
    leaderName,
    leaderStudentId,
    leaderCollege: body.leaderCollege || '',
    leaderPhone,
    leaderEmail: body.leaderEmail || null,
    advisor: body.advisor || null,
    teamSize: Number(body.teamSize) || 1,
    members: JSON.stringify(body.members ?? []),
    category: body.category || '创新训练',
    intro: String(body.intro).trim(),
    materials: JSON.stringify(body.materials ?? []),
    status: 'pending',
    userId: user?.id ?? null,
  });
  if (user) {
    insert('user_messages', {
      userId: user.id,
      title: '项目申报已提交',
      content: `「${title}」已提交，项目孵化组将在 5 个工作日内完成初审，可在「用户中心 → 我的项目」查看进度。`,
      link: '/account/applications',
    });
  }
  logOp({ userId: user?.id, userName: leaderName, action: '项目申报', target: 'project', detail: title });
  return ok(c, { id, status: 'pending' });
});

submitRoutes.get('/projects/apply/:id', (c) => {
  const row = get<any>('SELECT * FROM project_applications WHERE id=?', [Number(c.req.param('id'))]);
  if (!row) return fail(c, '申报记录不存在', 404);
  const parse = (s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return [];
    }
  };
  return ok(c, { ...row, members: parse(row.members), materials: parse(row.materials) });
});

/* ------------------------------ 加入我们 -------------------------------- */
submitRoutes.post('/join/apply', async (c) => {
  const body = await readBody<any>(c);
  const name = (body.name || '').trim();
  const studentId = (body.studentId || '').trim();
  const phone = (body.phone || '').trim();
  if (!name) return fail(c, '请填写姓名');
  if (!studentId) return fail(c, '请填写学号');
  if (!phone) return fail(c, '请填写手机号');
  if (!body.college) return fail(c, '请选择学院');
  if (!body.intro || String(body.intro).trim().length < 10) return fail(c, '自我介绍至少 10 字');

  const dup = get(
    "SELECT id FROM join_applications WHERE studentId=? AND status IN ('pending','reviewing','approved')",
    [studentId]
  );
  if (dup) return fail(c, '你已提交过报名申请，请耐心等待结果', 409);

  const user = currentUser(c);
  const id = insert('join_applications', {
    positionId: body.positionId || null,
    name,
    studentId,
    college: body.college || '',
    major: body.major || '',
    grade: body.grade || '',
    phone,
    email: body.email || null,
    skills: body.skills || '',
    intro: String(body.intro).trim(),
    status: 'pending',
    userId: user?.id ?? null,
  });
  if (user) {
    insert('user_messages', {
      userId: user.id,
      title: '招新报名已提交',
      content: '报名已提交，我们会在 3 个工作日内完成简历筛选并邮件通知面试安排。',
      link: '/account/join',
    });
  }
  logOp({ userId: user?.id, userName: name, action: '招新报名', target: 'join', detail: name });
  return ok(c, { id });
});

/* ------------------------------ 互动与反馈 ----------------------------- */
submitRoutes.post('/feedback', async (c) => {
  const body = await readBody<any>(c);
  const title = (body.title || '').trim();
  const content = (body.content || '').trim();
  if (!title) return fail(c, '请填写标题');
  if (content.length < 5) return fail(c, '内容至少 5 个字');
  const type = ['consult', 'suggestion', 'question', 'vote'].includes(body.type) ? body.type : 'consult';
  const anonymous = body.anonymous !== false;
  const user = currentUser(c);

  const id = insert('feedback', {
    type,
    title,
    content,
    contact: anonymous ? null : body.contact || user?.email || null,
    anonymous: anonymous ? 1 : 0,
    authorName: anonymous ? null : body.authorName || user?.name || null,
    status: 'open',
    userId: user?.id ?? null,
  });
  logOp({ userId: user?.id, userName: anonymous ? '匿名' : (body.authorName || user?.name), action: '提交留言', target: 'feedback', detail: title });
  return ok(c, { id });
});

/* --------------------------- 竞赛截止提醒订阅 -------------------------- */
submitRoutes.post('/competitions/:id/subscribe', async (c) => {
  const body = await readBody<{ email: string }>(c);
  const id = Number(c.req.param('id'));
  const comp = get<any>('SELECT * FROM competitions WHERE id=?', [id]);
  if (!comp) return fail(c, '竞赛不存在', 404);
  if (!body.email || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(body.email)) return fail(c, '请输入有效的邮箱地址');
  return ok(c, { subscribed: true, message: `已订阅「${comp.title}」的截止提醒，我们将在截止前 7 天与 1 天发送提醒。` });
});

/* --------------------------- 资源下载计数 ------------------------------ */
submitRoutes.post('/resources/:id/download', (c) => {
  const id = Number(c.req.param('id'));
  const row = get<any>('SELECT * FROM resources WHERE id=?', [id]);
  if (!row) return fail(c, '资源不存在', 404);
  run('UPDATE resources SET downloads=downloads+1 WHERE id=?', [id]);
  return ok(c, { url: row.url, downloads: row.downloads + 1 });
});

/* --------------------------- 用户中心：组队申请 ------------------------- */
submitRoutes.post('/team-requests', requireAuth(), async (c) => {
  const user = c.get('user')!;
  const body = await readBody<any>(c);
  if (!body.toUserId) return fail(c, '请选择组队对象');
  insert('user_messages', {
    userId: Number(body.toUserId),
    title: '收到一条组队邀请',
    content: `${user.name} 邀请你加入项目「${body.projectTitle || '未命名项目'}」。${body.message || ''}`,
    link: '/account',
  });
  return ok(c, { sent: true });
});

/* --------------------------- 用户中心：导师预约 ------------------------- */
submitRoutes.post('/advisor-appointments', requireAuth(), async (c) => {
  const user = c.get('user')!;
  const body = await readBody<any>(c);
  if (!body.advisor) return fail(c, '请选择导师');
  if (!body.slot) return fail(c, '请选择预约时间');
  const id = insert('user_messages', {
    userId: user.id,
    title: '导师预约已提交',
    content: `已向 ${body.advisor} 提交预约申请，时间：${body.slot}。${body.topic ? '议题：' + body.topic : ''}`,
    link: '/account',
  });
  logOp({ userId: user.id, userName: user.name, action: '导师预约', target: 'advisor', detail: String(body.advisor) });
  return ok(c, { id, submitted: true });
});

/* ------------------------------ 问卷投票 -------------------------------- */
submitRoutes.post('/feedback/:id/like', (c) => {
  const id = Number(c.req.param('id'));
  run('UPDATE feedback SET likes=likes+1 WHERE id=?', [id]);
  const row = get<{ likes: number }>('SELECT likes FROM feedback WHERE id=?', [id]);
  return ok(c, { likes: row?.likes ?? 0 });
});

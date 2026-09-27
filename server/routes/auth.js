/* =============================================================================
 * 认证 / 用户中心  /api/auth/*
 * ========================================================================== */
import { Hono } from 'hono';
import { all, get, insert, run, verifyPassword, hashPasswordSync, boolFields } from '../db.ts';
import { ok, fail, readBody, pick, logOp } from '../util.ts';
import { signToken, currentUser, requireAuth } from '../auth.ts';
export const authRoutes = new Hono();
authRoutes.post('/login', async (c) => {
    const body = await readBody(c);
    const username = (body.username || '').trim();
    const password = body.password || '';
    if (!username || !password)
        return fail(c, '请输入账号和密码');
    const row = get('SELECT * FROM users WHERE username=?', [username]);
    if (!row || !verifyPassword(password, row.passwordHash))
        return fail(c, '账号或密码错误', 401, 'BAD_CREDENTIALS');
    if (!row.isActive)
        return fail(c, '账号已被停用，请联系管理员', 403);
    const user = { id: row.id, username: row.username, name: row.name, role: row.role };
    const token = signToken(user);
    run('UPDATE users SET lastLoginAt=? WHERE id=?', [new Date().toLocaleString('sv-SE').replace('T', ' '), row.id]);
    logOp({ userId: row.id, userName: row.name, action: '登录', target: 'auth', detail: '用户登录成功', ip: clientIp(c) });
    c.header('Set-Cookie', `sti_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`);
    return ok(c, { token, user: publicUser(row) });
});
authRoutes.post('/logout', (c) => {
    c.header('Set-Cookie', 'sti_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    return ok(c, { loggedOut: true });
});
authRoutes.post('/register', async (c) => {
    const body = await readBody(c);
    const username = (body.username || '').trim();
    const password = body.password || '';
    const name = (body.name || '').trim();
    if (!username || username.length < 3)
        return fail(c, '账号至少 3 个字符');
    if (!password || password.length < 6)
        return fail(c, '密码至少 6 位');
    if (!name)
        return fail(c, '请填写姓名');
    if (get('SELECT id FROM users WHERE username=?', [username]))
        return fail(c, '该账号已被注册', 409);
    const id = insert('users', {
        username,
        passwordHash: hashPasswordSync(password),
        name,
        role: 'student',
        email: body.email || null,
        phone: body.phone || null,
        studentId: body.studentId || null,
        college: body.college || null,
    });
    const row = get('SELECT * FROM users WHERE id=?', [id]);
    const token = signToken({ id, username, role: 'student' });
    c.header('Set-Cookie', `sti_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`);
    insert('user_messages', {
        userId: id,
        title: '欢迎加入科技创新部门户',
        content: '完善个人资料后即可在线报名活动、提交项目申报。如有疑问可在「互动与反馈」留言。',
    });
    return ok(c, { token, user: publicUser(row) });
});
authRoutes.get('/me', (c) => {
    const user = currentUser(c);
    if (!user)
        return ok(c, null);
    const unread = get('SELECT COUNT(*) c FROM user_messages WHERE userId=? AND read=0', [user.id]).c;
    const stats = {
        signups: get('SELECT COUNT(*) c FROM activity_signups WHERE userId=?', [user.id]).c,
        applications: get('SELECT COUNT(*) c FROM project_applications WHERE userId=?', [user.id]).c,
        joinApplications: get('SELECT COUNT(*) c FROM join_applications WHERE userId=?', [user.id]).c,
        feedback: get('SELECT COUNT(*) c FROM feedback WHERE userId=?', [user.id]).c,
        unread,
    };
    return ok(c, { user, stats });
});
authRoutes.patch('/me', requireAuth(), async (c) => {
    const user = c.get('user');
    const body = await readBody(c);
    const data = pick(body, ['name', 'email', 'phone', 'avatar', 'studentId', 'college']);
    if (Object.keys(data).length) {
        run(`UPDATE users SET ${Object.keys(data)
            .map((k) => `"${k}"=?`)
            .join(',')} WHERE id=?`, [...Object.values(data), user.id]);
    }
    const row = get('SELECT * FROM users WHERE id=?', [user.id]);
    return ok(c, publicUser(row));
});
authRoutes.post('/change-password', requireAuth(), async (c) => {
    const user = c.get('user');
    const body = await readBody(c);
    const row = get('SELECT * FROM users WHERE id=?', [user.id]);
    if (!verifyPassword(body.oldPassword || '', row.passwordHash))
        return fail(c, '原密码不正确');
    if (!body.newPassword || body.newPassword.length < 6)
        return fail(c, '新密码至少 6 位');
    run('UPDATE users SET passwordHash=? WHERE id=?', [hashPasswordSync(body.newPassword), user.id]);
    return ok(c, { changed: true });
});
/* ------------------------------ 我的数据 -------------------------------- */
authRoutes.get('/my/signups', requireAuth(), (c) => {
    const user = c.get('user');
    const items = all(`SELECT s.id, s.checkedIn, s.createdAt, a.title, a.slug, a.startAt, a.endAt, a.location, a.cover, a.status
     FROM activity_signups s JOIN activities a ON a.id=s.activityId
     WHERE s.userId=? ORDER BY datetime(a.startAt) DESC`, [user.id]).map((r) => boolFields(r, ['checkedIn']));
    return ok(c, items);
});
authRoutes.get('/my/applications', requireAuth(), (c) => {
    const user = c.get('user');
    const items = all(`SELECT pa.*, c2.title AS competitionTitle FROM project_applications pa
     LEFT JOIN competitions c2 ON c2.id=pa.competitionId
     WHERE pa.userId=? OR pa.leaderPhone=? ORDER BY datetime(pa.createdAt) DESC`, [user.id, user.phone ?? '__none__']).map((r) => ({ ...r, members: safeJson(r.members), materials: safeJson(r.materials) }));
    return ok(c, items);
});
authRoutes.get('/my/join-applications', requireAuth(), (c) => {
    const user = c.get('user');
    const items = all(`SELECT ja.*, jp.name AS positionName FROM join_applications ja
     LEFT JOIN join_positions jp ON jp.id=ja.positionId
     WHERE ja.userId=? OR ja.studentId=? ORDER BY datetime(ja.createdAt) DESC`, [user.id, user.studentId ?? '__none__']);
    return ok(c, items);
});
authRoutes.get('/my/feedback', requireAuth(), (c) => {
    const user = c.get('user');
    const items = all('SELECT * FROM feedback WHERE userId=? ORDER BY datetime(createdAt) DESC', [user.id]);
    return ok(c, items);
});
/* ------------------------------- 我的消息 ------------------------------- */
authRoutes.get('/messages', requireAuth(), (c) => {
    const user = c.get('user');
    const items = all('SELECT * FROM user_messages WHERE userId=? ORDER BY datetime(createdAt) DESC LIMIT 60', [
        user.id,
    ]).map((r) => ({ ...r, read: !!r.read }));
    const unread = items.filter((i) => !i.read).length;
    return ok(c, items, { unread });
});
authRoutes.post('/messages/read', requireAuth(), async (c) => {
    const user = c.get('user');
    const body = await readBody(c);
    if (body.id)
        run('UPDATE user_messages SET read=1 WHERE id=? AND userId=?', [body.id, user.id]);
    else
        run('UPDATE user_messages SET read=1 WHERE userId=?', [user.id]);
    return ok(c, { read: true });
});
authRoutes.delete('/messages/:id', requireAuth(), (c) => {
    const user = c.get('user');
    run('DELETE FROM user_messages WHERE id=? AND userId=?', [Number(c.req.param('id')), user.id]);
    return ok(c, { deleted: true });
});
/* -------------------------------- 工具 --------------------------------- */
function publicUser(row) {
    if (!row)
        return null;
    const { passwordHash, ...rest } = row;
    return { ...rest, isActive: !!row.isActive };
}
function safeJson(s) {
    try {
        return JSON.parse(s);
    }
    catch {
        return [];
    }
}
function clientIp(c) {
    return (c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
        c.req.header('x-real-ip') ||
        '127.0.0.1');
}
/* ----------------------- 组队申请 / 导师预约 ---------------------------- */
authRoutes.get('/teammates', requireAuth(), (c) => {
    const user = c.get('user');
    // 简化实现：推荐同学段、可组队的在册用户
    const items = all(`SELECT id,name,college,studentId FROM users
     WHERE role='student' AND isActive=1 AND id<>? ORDER BY id DESC LIMIT 24`, [user.id]);
    return ok(c, items);
});
authRoutes.get('/advisors', (c) => {
    const items = all(`SELECT id,name,role,avatar,bio,tags FROM members WHERE role LIKE '%老师%' OR role LIKE '%教授%' OR "group"='教师' OR role LIKE '%指导%' LIMIT 12`).map((m) => safeJson2(m));
    return ok(c, items);
});
function safeJson2(m) {
    try {
        return { ...m, tags: JSON.parse(m.tags || '[]') };
    }
    catch {
        return { ...m, tags: [] };
    }
}

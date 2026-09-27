/* =============================================================================
 * 科技创新部门户 — Hono 服务端
 *  /api/**      接口
 *  /uploads/**  上传文件
 *  /**          前端静态资源（SPA 回退）
 * ========================================================================== */
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, all, get, insert, run, seedIfEmpty, UPLOAD_DIR } from './db.ts';
import { publicRoutes } from './routes/public.ts';
import { authRoutes } from './routes/auth.ts';
import { submitRoutes } from './routes/submit.ts';
import { adminRoutes } from './routes/admin.ts';
import { fail } from './util.ts';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'dist', 'public');
const DEV = process.env.NODE_ENV !== 'production';
seedIfEmpty();
const app = new Hono();
/* ------------------------------ 基础中间件 ------------------------------- */
app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    c.header('X-Response-Time', `${Date.now() - start}ms`);
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});
/* CORS（开发期 Vite 端口独立） */
app.use('/api/*', async (c, next) => {
    if (DEV) {
        c.header('Access-Control-Allow-Origin', c.req.header('origin') || '*');
        c.header('Access-Control-Allow-Credentials', 'true');
        c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        c.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    }
    if (c.req.method === 'OPTIONS')
        return c.body(null, 204);
    await next();
});
/* ------------------------------- 路由挂载 -------------------------------- */
app.route('/api/auth', authRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api', submitRoutes); // 表单提交（报名/申报/留言/招新…）
app.route('/api', publicRoutes); // 公开读取
app.get('/api/health', (c) => c.json({ ok: true, service: 'sti-portal', env: DEV ? 'development' : 'production', time: new Date().toISOString() }));
/* 未匹配的 API → 404 JSON */
app.all('/api/*', (c) => fail(c, '接口不存在: ' + new URL(c.req.url).pathname, 404, 'NOT_FOUND'));
/* ---------------------------- 静态资源 / SPA ----------------------------- */
app.use('/uploads/*', serveStatic({ root: './' + path.relative(ROOT, UPLOAD_DIR) }));
if (fs.existsSync(PUBLIC_DIR)) {
    app.use('/*', serveStatic({ root: path.relative(process.cwd(), PUBLIC_DIR) }));
}
/* SPA 回退 */
app.get('*', (c) => {
    const idx = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(idx)) {
        c.header('Content-Type', 'text/html; charset=utf-8');
        return c.body(fs.readFileSync(idx, 'utf8'));
    }
    return c.html(`<!doctype html><meta charset="utf-8"><title>科技创新部门户</title>
     <body style="font-family:system-ui;background:#000;color:#eee;display:grid;place-items:center;height:100vh;margin:0">
     <div style="text-align:center">
       <h1 style="font-weight:600">科技创新部门户 · API 运行中</h1>
       <p style="color:#888">前端产物未找到。<code>npm run build</code> 后重启，或使用 <code>npm run dev</code> 开发模式（Vite: http://localhost:5273）。</p>
     </div></body>`);
});
/* ==========================================================================
 *  Status 探针 — 后台定时检测各站点/服务器可达性
 * ========================================================================== */
async function probe(target) {
    const started = Date.now();
    let online = false;
    let latency = null;
    try {
        if (target.type === 'website' && target.url) {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 6000);
            const res = await fetch(target.url, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow' }).catch(() => fetch(target.url, { signal: ctrl.signal }));
            clearTimeout(timer);
            online = res.status < 500;
            latency = Date.now() - started;
        }
        else if (target.type === 'server' && target.host) {
            const net = await import('node:net');
            const port = 22;
            online = await new Promise((resolve) => {
                const sock = net.createConnection({ host: target.host, port, timeout: 3000 });
                sock.on('connect', () => {
                    latency = Date.now() - started;
                    sock.destroy();
                    resolve(true);
                });
                sock.on('error', () => resolve(false));
                sock.on('timeout', () => {
                    sock.destroy();
                    resolve(false);
                });
            });
        }
    }
    catch {
        online = false;
    }
    return { online, latencyMs: online ? (latency ?? Math.round(30 + Math.random() * 60)) : null };
}
let probeTimer = null;
function startProbeLoop() {
    const runProbe = async () => {
        const targets = all('SELECT * FROM status_targets WHERE active=1');
        const t = new Date().toLocaleString('sv-SE').replace('T', ' ');
        for (const target of targets) {
            const r = await probe(target);
            insert('status_snapshots', { targetId: target.id, online: r.online ? 1 : 0, latencyMs: r.latencyMs, checkedAt: t });
        }
        // 只保留最近 30 天快照
        run("DELETE FROM status_snapshots WHERE datetime(checkedAt) < datetime('now','localtime','-30 day')");
        // 竞赛截止提醒（截止前 7 天 / 1 天，站内消息）
        const deadlineSoon = all(`SELECT * FROM competitions WHERE status='published' AND signupDeadline IS NOT NULL
       AND date(signupDeadline) IN (date('now','localtime','+7 day'), date('now','localtime','+1 day'))`);
        for (const comp of deadlineSoon) {
            const key = `reminded_${comp.id}_${String(comp.signupDeadline).slice(0, 10)}`;
            if (get('SELECT key FROM settings WHERE key=?', [key]))
                continue;
            const users = all('SELECT id FROM users WHERE isActive=1');
            for (const u of users)
                insert('user_messages', {
                    userId: u.id,
                    title: '竞赛报名即将截止',
                    content: `「${comp.title}」报名截止时间为 ${comp.signupDeadline}，请尽快完成报名。`,
                    link: '/projects',
                });
            run('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)', [key, new Date().toISOString()]);
        }
    };
    runProbe().catch((e) => console.warn('[probe] failed:', e.message));
    probeTimer = setInterval(() => runProbe().catch(() => { }), 5 * 60 * 1000);
}
/* ------------------------------ 启动 ------------------------------------ */
const PORT = Number(process.env.PORT || 8787);
const server = serve({ fetch: app.fetch, port: PORT, hostname: process.env.HOST || '0.0.0.0' }, (info) => {
    console.log(`\n  科技创新部门户 API  →  http://127.0.0.1:${info.port}`);
    console.log(`  环境: ${DEV ? 'development' : 'production'}   数据目录: ${path.dirname(UPLOAD_DIR)}`);
    if (DEV)
        console.log(`  前端开发服务器: http://localhost:5273\n`);
    startProbeLoop();
});
const shutdown = () => {
    console.log('\n[server] shutting down …');
    if (probeTimer)
        clearInterval(probeTimer);
    server.close(() => {
        try {
            db.close();
        }
        catch { }
        process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
export { app };

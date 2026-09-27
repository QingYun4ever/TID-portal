import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { UPLOAD_DIR, run } from './db.ts';
export const ok = (c, data, extra = {}) => c.json({ ok: true, data, ...extra });
export const fail = (c, message, status = 400, code) => c.json({ ok: false, error: message, code }, status);
export function paging(c) {
    const page = Math.max(1, Number(c.req.query('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize') || 12)));
    return { page, pageSize, offset: (page - 1) * pageSize };
}
export function slugify(text) {
    const s = text
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    if (/[\u4e00-\u9fa5]/.test(s))
        return 'p-' + createHash('sha1').update(text).digest('hex').slice(0, 8);
    return s.slice(0, 60) || 'p-' + Date.now();
}
export async function readBody(c) {
    try {
        return (await c.req.json());
    }
    catch {
        return {};
    }
}
/** 只保留允许的字段 */
export function pick(src, keys) {
    const out = {};
    for (const k of keys)
        if (src[k] !== undefined)
            out[k] = src[k];
    return out;
}
export function json(v) {
    return JSON.stringify(v ?? []);
}
/** 保存上传文件，返回可访问 URL */
export async function saveUpload(file) {
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = (path.extname(file.name) || '').toLowerCase() || mimeExt(file.type);
    const stem = randomUUID();
    const sub = new Date().toISOString().slice(0, 7); // 2026-03
    const dir = path.join(UPLOAD_DIR, sub);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, stem + ext), buf);
    return { url: `/uploads/${sub}/${stem}${ext}`, name: file.name, size: buf.length };
}
function mimeExt(type) {
    const map = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'image/svg+xml': '.svg',
        'application/pdf': '.pdf',
    };
    return map[type] || '.bin';
}
export function logOp(opts) {
    run('INSERT INTO operation_logs (userId,userName,action,target,detail,ip) VALUES (?,?,?,?,?,?)', [opts.userId ?? null, opts.userName ?? null, opts.action, opts.target ?? null, opts.detail ?? null, opts.ip ?? null]);
}
/** 相对时间（中文，服务端渲染用） */
export function humanTime(input) {
    if (!input)
        return '';
    const t = new Date(input.replace(' ', 'T')).getTime();
    if (Number.isNaN(t))
        return input;
    const diff = Date.now() - t;
    const min = 60_000, hour = 3_600_000, day = 86_400_000;
    if (diff < min)
        return '刚刚';
    if (diff < hour)
        return `${Math.floor(diff / min)} 分钟前`;
    if (diff < day)
        return `${Math.floor(diff / hour)} 小时前`;
    if (diff < day * 30)
        return `${Math.floor(diff / day)} 天前`;
    return input.slice(0, 10);
}

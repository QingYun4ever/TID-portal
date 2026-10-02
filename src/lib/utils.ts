import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ------------------------------ 日期格式化 ------------------------------ */
const pad = (n: number) => String(n).padStart(2, '0');

export function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(String(v).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 2026-03-15 */
export function fdate(v: string | null | undefined) {
  const d = parseDate(v);
  if (!d) return '—';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 03-15 */
export function fshort(v: string | null | undefined) {
  const d = parseDate(v);
  if (!d) return '—';
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 2026-03-15 19:00 */
export function fdatetime(v: string | null | undefined, withSec = false) {
  const d = parseDate(v);
  if (!d) return '—';
  return `${fdate(v)} ${pad(d.getHours())}:${pad(d.getMinutes())}${withSec ? ':' + pad(d.getSeconds()) : ''}`;
}

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
export function fweek(v: string | null | undefined) {
  const d = parseDate(v);
  return d ? WEEK[d.getDay()] : '';
}

/** 相对时间 */
export function fromNow(v: string | null | undefined) {
  const d = parseDate(v);
  if (!d) return '—';
  const diff = Date.now() - d.getTime();
  const min = 60_000,
    hour = 3_600_000,
    day = 86_400_000;
  const future = diff < 0;
  const a = Math.abs(diff);
  if (a < min) return '刚刚';
  if (a < hour) return `${future ? '还有 ' : ''}${Math.floor(a / min)} 分钟${future ? '' : '前'}`;
  if (a < day) return `${future ? '还有 ' : ''}${Math.floor(a / hour)} 小时${future ? '' : '前'}`;
  if (a < day * 30) return `${future ? '还有 ' : ''}${Math.floor(a / day)} 天${future ? '' : '前'}`;
  return fdate(v);
}

/** 距离目标时间还有多久（用于倒计时） */
export function countdown(target: string | null | undefined) {
  const d = parseDate(target);
  if (!d) return null;
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, label: '已截止' };
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  const label = days > 0 ? `${days} 天 ${hours} 小时` : hours > 0 ? `${hours} 小时 ${minutes} 分` : `${minutes} 分 ${seconds} 秒`;
  return { expired: false, days, hours, minutes, seconds, label };
}

export function daysLeft(target: string | null | undefined): number | null {
  const d = parseDate(target);
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

/* ------------------------------ 其它格式化 ------------------------------ */
export function fbytes(n: number | null | undefined) {
  if (!n) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export function fnum(n: number | null | undefined) {
  if (n === null || n === undefined) return '0';
  if (n >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)} 万`;
  return n.toLocaleString('zh-CN');
}

export function truncate(s: string, n: number) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

/** 去掉 HTML 标签，用于摘要 */
export function plain(html: string | null | undefined, max = 120) {
  if (!html) return '';
  const t = String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return truncate(t, max);
}

/* ------------------------------ 枚举标签 ------------------------------- */
export const NEWS_CATEGORIES: Record<string, string> = {
  notice: '通知公告',
  dept: '部门新闻',
  competition: '竞赛信息',
  policy: '政策文件',
};

export const PROJECT_CATEGORIES: Record<string, string> = {
  excellent: '优秀项目',
  approved: '入选项目',
  completed: '已完成项目',
  ongoing: '进行中项目',
  competition: '竞赛成果',
  frontend: '前端作品',
  service: '工具服务',
  hardware: '实体设计',
};

export const RESOURCE_CATEGORIES: Record<string, string> = {
  template: '活动资料',
  policy: '政策文件',
  guide: '竞赛指南',
  training: '培训资料',
  faq: '常见问题',
};

export const APPLY_STATUS: Record<string, string> = {
  pending: '待审核',
  reviewing: '审核中',
  approved: '已通过',
  rejected: '未通过',
};

export const FEEDBACK_TYPES: Record<string, string> = {
  consult: '在线咨询',
  suggestion: '意见反馈',
  question: '问题解答',
  vote: '问卷投票',
};

export const ROLES: Record<string, string> = {
  superadmin: '超级管理员',
  admin: '管理员',
  member: '部门成员',
  student: '学生',
};

export function statusTone(status: string): 'primary' | 'success' | 'warning' | 'danger' | 'accent' | 'muted' {
  switch (status) {
    case 'published':
    case 'approved':
    case 'replied':
    case 'closed':
      return 'success';
    case 'pending':
    case 'reviewing':
    case 'open':
      return 'warning';
    case 'rejected':
      return 'danger';
    case 'draft':
      return 'muted';
    default:
      return 'primary';
  }
}

/* ------------------------------ 其它工具 ------------------------------- */
export function debounce<T extends (...a: any[]) => void>(fn: T, ms = 300) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** 生成一个稳定的伪随机数（用于占位高度等），避免每次渲染跳动 */
export function seedRand(seed: string, min: number, max: number) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const v = ((h >>> 0) % 1000) / 1000;
  return min + v * (max - min);
}

export function initials(name: string) {
  if (!name) return '?';
  return /[\u4e00-\u9fa5]/.test(name) ? name.slice(-2) : name.slice(0, 2).toUpperCase();
}

/** 头像颜色（基于名字哈希，保持稳定） */
export function avatarTone(name: string) {
  const tones = [
    'from-sky-400/30 to-cyan-300/10',
    'from-violet-400/30 to-fuchsia-300/10',
    'from-emerald-400/30 to-teal-300/10',
    'from-amber-400/30 to-orange-300/10',
    'from-rose-400/30 to-pink-300/10',
    'from-blue-400/30 to-indigo-300/10',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return tones[h % tones.length];
}

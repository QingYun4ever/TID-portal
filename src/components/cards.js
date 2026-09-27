import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router';
import { ArrowUpRight, Building2, CalendarDays, Clock, Download, Eye, FileType2, MapPin, Pin, Trophy, Users, } from 'lucide-react';
import { APPLY_STATUS, NEWS_CATEGORIES, PROJECT_CATEGORIES, cn, daysLeft, fbytes, fdate, fdatetime, fnum, } from '@/lib/utils';
import { Chip, Countdown, ProgressBar } from './ui';
/* =============================================================================
 * 内容卡片 —— 「刻面玻璃 / Etched Glass」
 * -----------------------------------------------------------------------------
 * 卡片外壳统一用 index.css 的 .card：5px 内衬 + 板中板，
 * 封面与内容板各自带圆角，外壳不裁剪任何子元素 —— 因此不会出现
 * 「图片被卡片圆角切出阶梯边」的锯齿。描边全部用 inset box-shadow。
 *
 * 结构约定（六种卡片共用）：
 *   .card  →  [.card-media]  →  .card-body  →  [.card-rule + 页脚行]
 * 颜色仍然只有三种角色：白（靠不透明度分层）/ 蓝 primary / 警示色。
 * ========================================================================== */
/* 分类标记一律走中性白，只有「通知公告」用蓝色做引导；
   彩色只留给真正的警示语义（置顶 / 即将截止 / 已满 / 驳回）。 */
const CAT_TONE = {
    notice: 'primary',
    dept: 'default',
    competition: 'default',
    policy: 'default',
};
/** 无封面时的占位底纹：点阵 + 水印 */
function CoverFallback({ label = 'STI', icon }) {
    return (_jsxs("div", { className: "absolute inset-0", children: [_jsx("span", { "aria-hidden": true, className: "card-ph" }), _jsx("span", { className: "absolute inset-0 flex items-center justify-center", children: icon ?? (_jsx("span", { className: "font-display text-2xl font-semibold tracking-[0.3em] text-white/10", children: label })) })] }));
}
/** 卡片页脚：一条左端亮的细线 + 一行元信息 */
function CardFoot({ children, className }) {
    return (_jsxs("div", { className: cn('mt-4', className), children: [_jsx("span", { "aria-hidden": true, className: "card-rule block" }), _jsx("div", { className: "mt-3 flex items-center justify-between gap-3 text-[11px] text-muted-foreground", children: children })] }));
}
/* =============================================================================
 * 文章卡片
 * ========================================================================== */
export function ArticleCard({ article, featured = false, compact = false, className, }) {
    const catTone = CAT_TONE[article.category] ?? 'default';
    const catText = NEWS_CATEGORIES[article.category] ?? article.category;
    /* ---------- 紧凑列表行：不是卡片，左侧一条会点亮的竖线 ---------- */
    if (compact)
        return (_jsx(Link, { to: `/news/${article.slug}`, className: cn('group block', className), children: _jsxs("div", { className: "relative flex items-start gap-4 rounded-xl py-2.5 pl-4 pr-3 transition-colors duration-300 hover:bg-white/[0.04]", children: [_jsx("span", { "aria-hidden": true, className: "absolute bottom-2.5 left-0 top-2.5 w-px bg-white/10 transition-colors duration-300 group-hover:bg-primary/70" }), _jsx("span", { className: "mono mt-0.5 w-10 shrink-0 text-[11px] text-muted-foreground", children: fdate(article.publishedAt).slice(5) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("p", { className: "clamp-2 text-[13.5px] font-medium leading-snug text-foreground/90 transition-colors duration-300 group-hover:text-primary", children: [article.pinned ? _jsx(Pin, { className: "mr-1.5 inline h-3 w-3 -rotate-45 text-[hsl(var(--warning))]" }) : null, article.title] }), _jsxs("div", { className: "mt-1.5 flex items-center gap-2.5", children: [_jsx(Chip, { tone: catTone, className: "!px-2 !py-0 !text-[10px]", children: catText }), article.views !== undefined && (_jsxs("span", { className: "mono flex items-center gap-1 text-[10px] text-muted-foreground", children: [_jsx(Eye, { className: "h-2.5 w-2.5" }), fnum(article.views)] }))] })] })] }) }));
    /* ---------- 头条卡：封面在上 ---------- */
    if (featured)
        return (_jsx(Link, { to: `/news/${article.slug}`, className: cn('group block h-full', className), children: _jsxs("div", { className: "card h-full", children: [_jsxs("div", { className: "card-media aspect-[16/9]", children: [article.cover ? (_jsx("img", { src: article.cover, alt: "", loading: "lazy" })) : (_jsx(CoverFallback, {})), _jsx("span", { "aria-hidden": true, className: "card-scrim" }), _jsxs("div", { className: "absolute left-3 top-3 flex flex-wrap gap-2", children: [_jsx(Chip, { tone: catTone, className: "!bg-black/45 !py-0.5 backdrop-blur-md", children: catText }), article.pinned ? (_jsxs(Chip, { tone: "warning", className: "!bg-black/45 !py-0.5 backdrop-blur-md", children: [_jsx(Pin, { className: "h-3 w-3 -rotate-45" }), " \u7F6E\u9876"] })) : null] }), _jsx("span", { className: "mono absolute bottom-3 left-3.5 text-[11px] tracking-wide text-white/70", children: fdate(article.publishedAt) })] }), _jsxs("div", { className: "card-body sm:px-6 sm:pb-5 sm:pt-5", children: [_jsx("h3", { className: "clamp-2 text-[17px] font-semibold leading-snug transition-colors duration-300 group-hover:text-primary", children: article.title }), _jsx("p", { className: "clamp-3 mt-2.5 flex-1 text-[13.5px] leading-relaxed text-muted-foreground", children: article.summary }), _jsxs(CardFoot, { children: [_jsxs("span", { className: "mono flex items-center gap-1.5", children: [_jsx(Eye, { className: "h-3 w-3" }), fnum(article.views)] }), _jsxs("span", { className: "flex items-center gap-1.5 font-medium text-foreground/60 transition-colors duration-300 group-hover:text-primary", children: ["\u9605\u8BFB\u5168\u6587", _jsx(ArrowUpRight, { className: "h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" })] })] })] })] }) }));
    /* ---------- 标准卡：纯文字 ---------- */
    return (_jsx(Link, { to: `/news/${article.slug}`, className: cn('group block h-full', className), children: _jsx("div", { className: "card h-full", children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(Chip, { tone: catTone, className: "!px-2.5 !py-0.5", children: catText }), article.pinned ? _jsx(Pin, { className: "h-3.5 w-3.5 -rotate-45 text-[hsl(var(--warning))]" }) : null, _jsx("span", { className: "mono ml-auto text-[11px] text-muted-foreground", children: fdate(article.publishedAt) })] }), _jsx("h3", { className: "clamp-2 mt-3.5 text-[15px] font-semibold leading-snug transition-colors duration-300 group-hover:text-primary", children: article.title }), _jsx("p", { className: "clamp-2 mt-2.5 flex-1 text-[13px] leading-relaxed text-muted-foreground", children: article.summary }), _jsxs(CardFoot, { children: [_jsxs("span", { className: "mono flex items-center gap-1.5", children: [_jsx(Eye, { className: "h-3 w-3" }), fnum(article.views)] }), _jsx(ArrowUpRight, { className: "h-3.5 w-3.5 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-70" })] })] }) }) }));
}
/* =============================================================================
 * 活动卡片
 * ========================================================================== */
export function ActivityCard({ activity, className }) {
    const signed = activity.signedCount ?? 0;
    const capacity = activity.capacity ?? 0;
    const full = capacity > 0 && signed >= capacity;
    const d = daysLeft(activity.startAt);
    const past = d !== null && d < 0;
    const day = fdate(activity.startAt);
    return (_jsx(Link, { to: `/activities/${activity.slug}`, className: cn('group block h-full', className), children: _jsx("div", { className: "card h-full", children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "flex items-start gap-4", children: [_jsxs("div", { className: "card-tile flex w-[54px] shrink-0 flex-col items-center py-2.5", children: [_jsxs("span", { className: "mono text-[10px] uppercase text-muted-foreground", children: [day.slice(5, 7), "\u6708"] }), _jsx("span", { className: "mono text-xl font-semibold leading-tight text-foreground", children: day.slice(8, 10) }), _jsx("span", { className: "mono text-[9px] text-muted-foreground", children: day.slice(0, 4) })] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(Chip, { className: "!px-2.5 !py-0.5", children: activity.category }), past ? (_jsx(Chip, { className: "!px-2.5 !py-0.5", children: "\u5DF2\u7ED3\u675F" })) : full ? (_jsx(Chip, { tone: "danger", className: "!px-2.5 !py-0.5", children: "\u540D\u989D\u5DF2\u6EE1" })) : (_jsx(Chip, { tone: "primary", className: "!px-2.5 !py-0.5", children: "\u62A5\u540D\u4E2D" }))] }), _jsx("h3", { className: "clamp-2 mt-2.5 text-[15px] font-semibold leading-snug transition-colors duration-300 group-hover:text-primary", children: activity.title }), _jsx("p", { className: "clamp-2 mt-2 text-[13px] leading-relaxed text-muted-foreground", children: activity.summary })] })] }), _jsx(CardFoot, { className: "mt-auto pt-1", children: _jsxs("span", { className: "flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px]", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Clock, { className: "h-3.5 w-3.5 shrink-0" }), _jsx("span", { className: "mono", children: fdatetime(activity.startAt).slice(5) })] }), activity.location && (_jsxs("span", { className: "clamp-1 flex items-center gap-1.5", children: [_jsx(MapPin, { className: "h-3.5 w-3.5 shrink-0" }), activity.location] }))] }) }), capacity > 0 && (_jsxs("div", { className: "mt-3.5", children: [_jsxs("div", { className: "mb-1.5 flex items-center justify-between text-[11px]", children: [_jsxs("span", { className: "flex items-center gap-1.5 text-muted-foreground", children: [_jsx(Users, { className: "h-3 w-3" }), "\u5DF2\u62A5\u540D ", _jsx("span", { className: "mono text-foreground", children: signed }), " / ", capacity] }), !past && !full && activity.signupEnd && (_jsx("span", { className: "mono text-[hsl(var(--warning))]", children: _jsx(Countdown, { target: activity.signupEnd }) }))] }), _jsx(ProgressBar, { value: signed, max: capacity, tone: full ? 'danger' : 'primary', height: 3 })] }))] }) }) }));
}
/* =============================================================================
 * 项目卡片
 * ========================================================================== */
export function ProjectCard({ project, size = 'md', className, }) {
    const cat = PROJECT_CATEGORIES[project.category] ?? project.category;
    const tone = project.category === 'excellent' ? 'primary' : 'default';
    /* ---------- 宽卡：封面在左 ---------- */
    if (size === 'lg')
        return (_jsx(Link, { to: `/projects/${project.slug}`, className: cn('group block h-full', className), children: _jsxs("div", { className: "card h-full md:flex-row", children: [_jsxs("div", { className: "card-media aspect-[16/10] md:aspect-auto md:w-[46%] md:shrink-0", children: [project.cover ? (_jsx("img", { src: project.cover, alt: "", loading: "lazy" })) : (_jsx("div", { className: "relative h-full min-h-[220px] w-full", children: _jsx(CoverFallback, { icon: _jsx(Trophy, { className: "h-12 w-12 text-white/12" }) }) })), project.awards && (_jsx("div", { className: "absolute bottom-3 left-3", children: _jsxs(Chip, { tone: "warning", className: "!bg-black/50 !py-0.5 backdrop-blur-md", children: [_jsx(Trophy, { className: "h-3 w-3" }), project.awards] }) }))] }), _jsxs("div", { className: "card-body md:p-7", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(Chip, { tone: tone, children: cat }), _jsx("span", { className: "mono text-[11px] text-muted-foreground", children: project.year })] }), _jsx("h3", { className: "mt-4 text-xl font-semibold leading-snug transition-colors duration-300 group-hover:text-primary", children: project.title }), _jsx("p", { className: "clamp-3 mt-3 flex-1 text-[13.5px] leading-relaxed text-muted-foreground", children: project.summary }), _jsxs(CardFoot, { children: [_jsxs("span", { className: "flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px]", children: [_jsxs("span", { className: "clamp-1 flex items-center gap-1.5", children: [_jsx(Users, { className: "h-3.5 w-3.5 shrink-0" }), project.team] }), project.advisor && (_jsxs("span", { className: "clamp-1 flex items-center gap-1.5", children: [_jsx(Building2, { className: "h-3.5 w-3.5 shrink-0" }), project.advisor] }))] }), project.views !== undefined && (_jsxs("span", { className: "mono flex shrink-0 items-center gap-1.5", children: [_jsx(Eye, { className: "h-3 w-3" }), fnum(project.views)] }))] })] })] }) }));
    /* ---------- 标准 / 小卡 ---------- */
    return (_jsx(Link, { to: `/projects/${project.slug}`, className: cn('group block h-full', className), children: _jsxs("div", { className: "card h-full", children: [size !== 'sm' && (_jsx("div", { className: "card-media aspect-[16/10]", children: project.cover ? _jsx("img", { src: project.cover, alt: "", loading: "lazy" }) : _jsx(CoverFallback, {}) })), _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(Chip, { tone: tone, className: "!px-2.5 !py-0.5", children: cat }), _jsx("span", { className: "mono ml-auto text-[11px] text-muted-foreground", children: project.year })] }), _jsx("h3", { className: cn('clamp-2 mt-3 font-semibold leading-snug transition-colors duration-300 group-hover:text-primary', size === 'sm' ? 'text-[14px]' : 'text-[15px]'), children: project.title }), _jsx("p", { className: "clamp-2 mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground", children: project.summary }), _jsxs(CardFoot, { className: "mt-3.5", children: [_jsx("span", { className: "clamp-1", children: project.team }), project.views !== undefined && (_jsxs("span", { className: "mono flex shrink-0 items-center gap-1.5", children: [_jsx(Eye, { className: "h-3 w-3" }), fnum(project.views)] }))] })] })] }) }));
}
/* =============================================================================
 * 竞赛卡片（带倒计时与紧迫度刻度）
 * ========================================================================== */
export function CompetitionCard({ competition, className }) {
    const dl = competition.signupDeadline;
    const d = daysLeft(dl);
    const urgent = d !== null && d >= 0 && d <= 7;
    const expired = d !== null && d < 0;
    /* 紧迫度刻度：以 30 天为满量程，越接近截止刻度越长 */
    const urgency = d === null || expired ? 0 : Math.min(1, Math.max(0, (30 - d) / 30));
    return (_jsx("div", { className: cn('card h-full min-h-[172px]', className), children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsx(Chip, { tone: competition.level === '国家级' ? 'primary' : 'default', className: "!px-2.5 !py-0.5", children: competition.level }), expired ? (_jsx(Chip, { className: "!px-2.5 !py-0.5", children: "\u5DF2\u622A\u6B62" })) : urgent ? (_jsx(Chip, { tone: "danger", className: "!px-2.5 !py-0.5", children: "\u5373\u5C06\u622A\u6B62" })) : null] }), _jsx("h3", { className: "clamp-2 mt-3.5 text-[15px] font-semibold leading-snug", children: competition.title }), _jsxs("p", { className: "mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground", children: [_jsx(Building2, { className: "h-3.5 w-3.5 shrink-0" }), _jsx("span", { className: "clamp-1", children: competition.organizer })] }), _jsx("p", { className: "clamp-3 mt-3 flex-1 text-[13px] leading-relaxed text-muted-foreground", children: competition.summary }), !expired && d !== null && (_jsx("div", { "aria-hidden": true, className: "mt-4 h-[2px] overflow-hidden rounded-full bg-white/8", children: _jsx("span", { className: cn('block h-full rounded-full transition-[width] duration-700', urgent ? 'bg-[hsl(var(--destructive))]' : 'bg-primary/70'), style: { width: `${Math.round(urgency * 100)}%` } }) })), _jsxs(CardFoot, { className: expired ? 'mt-4' : 'mt-3', children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(CalendarDays, { className: "h-3.5 w-3.5" }), "\u622A\u6B62 ", _jsx("span", { className: "mono", children: fdate(dl) })] }), !expired && _jsx(Countdown, { target: dl, className: "text-[11px]" })] }), competition.link && (_jsxs("a", { href: competition.link, target: "_blank", rel: "noreferrer noopener", className: "mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-primary transition-all duration-300 hover:gap-2.5", children: ["\u524D\u5F80\u8D5B\u4E8B\u5B98\u7F51 ", _jsx(ArrowUpRight, { className: "h-3.5 w-3.5" })] }))] }) }));
}
/* =============================================================================
 * 资源卡片
 * ========================================================================== */
export function ResourceCard({ resource, onDownload, className, }) {
    /* 文件类型不做颜色区分 —— 保持中性，避免色彩噪音 */
    return (_jsx("div", { className: cn('card group h-full min-h-[172px]', className), children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "flex items-start gap-3.5", children: [_jsx("span", { className: "card-tile flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-300 group-hover:text-foreground/85", children: _jsx(FileType2, { className: "h-5 w-5" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("h3", { className: "clamp-2 text-[14.5px] font-semibold leading-snug", children: resource.title }), _jsxs("p", { className: "mono mt-1.5 text-[11px] text-muted-foreground", children: [resource.fileType, " \u00B7 ", fbytes(resource.fileSize)] })] })] }), _jsx("p", { className: "clamp-2 mt-3.5 flex-1 text-[13px] leading-relaxed text-muted-foreground", children: resource.description }), _jsxs(CardFoot, { children: [_jsxs("span", { className: "mono flex items-center gap-1.5", children: [_jsx(Download, { className: "h-3 w-3" }), fnum(resource.downloads)] }), _jsxs("button", { type: "button", onClick: () => onDownload?.(resource), className: "card-act", children: [_jsx(Download, { className: "h-3 w-3" }), resource.external ? '前往' : '下载'] })] })] }) }));
}
/* =============================================================================
 * 申请状态徽章
 * ========================================================================== */
export function ApplyStatusChip({ status }) {
    const tone = status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : status === 'reviewing' ? 'primary' : 'warning';
    return (_jsx(Chip, { tone: tone, className: "!px-2.5 !py-0.5", children: APPLY_STATUS[status] ?? status }));
}
/* =============================================================================
 * 时间线条目
 * ========================================================================== */
export function TimelineItem({ node, index, total }) {
    const last = index === total - 1;
    return (_jsxs("div", { className: "relative flex gap-5", "data-reveal": "left", children: [_jsxs("div", { className: "relative flex w-16 shrink-0 flex-col items-center", children: [_jsx("span", { className: "mono text-sm font-semibold text-primary", children: node.year }), _jsx("span", { className: "mt-2 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background shadow-[0_0_14px_-1px_hsl(var(--primary)/.8)]" }), !last && _jsx("span", { className: "mt-1 w-px flex-1 bg-gradient-to-b from-primary/45 to-transparent" })] }), _jsxs("div", { className: cn('min-w-0 flex-1', last ? 'pb-0' : 'pb-9'), children: [_jsx("h4", { className: "text-[15px] font-semibold", children: node.title }), _jsx("p", { className: "mt-1.5 text-[13px] leading-relaxed text-muted-foreground", children: node.description })] })] }));
}

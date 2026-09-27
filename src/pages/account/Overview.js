import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowUpRight, BadgeCheck, CalendarDays, ClipboardList, Download, FileText, MessageSquare, Rocket, Sparkles, UserRound, UserRoundCog, } from 'lucide-react';
import { AuthApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';
import { useAuth } from '@/lib/store';
import { ROLES, cn, fdatetime, fromNow } from '@/lib/utils';
import { Button, Chip, EmptyState, ErrorState, Glass, LinkButton, Skeleton, StatCard, } from '@/components/ui';
/* =============================================================================
 * 用户中心 · 概览
 * ========================================================================== */
function greeting(hour) {
    if (hour < 6)
        return '夜深了';
    if (hour < 12)
        return '早上好';
    if (hour < 18)
        return '下午好';
    return '晚上好';
}
const QUICK = [
    { to: '/activities', title: '活动报名', desc: '技术沙龙 · 工作坊 · 竞赛集训', icon: CalendarDays, tone: 'from-sky-400/22 to-cyan-300/6' },
    { to: '/projects/apply', title: '项目申报', desc: '大创项目在线申报与进度查询', icon: FileText, tone: 'from-violet-400/22 to-fuchsia-300/6' },
    { to: '/resources', title: '资源下载', desc: '申报模板 · 竞赛指南 · 培训资料', icon: Download, tone: 'from-emerald-400/22 to-teal-300/6' },
    { to: '/account/messages', title: '我的消息', desc: '审核结果与系统通知', icon: MessageSquare, tone: 'from-amber-400/22 to-orange-300/6' },
    { to: '/account/profile', title: '完善资料', desc: '学号 / 学院 / 联系方式', icon: UserRound, tone: 'from-rose-400/22 to-pink-300/6' },
];
export default function Overview() {
    const { user, stats } = useAuth();
    const navigate = useNavigate();
    useTitle('用户中心');
    const signups = useApi(() => AuthApi.signups(), []);
    const applications = useApi(() => AuthApi.applications(), []);
    const loading = signups.loading || applications.loading;
    const error = signups.error || applications.error;
    const retry = () => {
        signups.reload();
        applications.reload();
    };
    const roleLabel = ROLES[user?.role ?? ''] ?? user?.role ?? '—';
    const hour = new Date().getHours();
    /* 合并报名与申报，按时间倒序取前 6 条 */
    const feed = useMemo(() => {
        const a = (signups.data ?? []).map((s) => ({
            key: `s-${s.id}`,
            kind: '报名',
            tone: 'primary',
            icon: BadgeCheck,
            title: s.title || '活动报名',
            desc: [s.location, s.checkedIn ? '已签到' : '未签到'].filter(Boolean).join(' · '),
            at: s.createdAt,
            to: s.slug ? `/activities/${s.slug}` : '/account/signups',
        }));
        const b = (applications.data ?? []).map((p) => ({
            key: `p-${p.id}`,
            kind: '申报',
            tone: 'accent',
            icon: ClipboardList,
            title: p.title || '项目申报',
            desc: [p.category, p.leaderName].filter(Boolean).join(' · '),
            at: p.createdAt,
            to: '/account/applications',
        }));
        return [...a, ...b].sort((x, y) => String(y.at ?? '').localeCompare(String(x.at ?? ''))).slice(0, 6);
    }, [signups.data, applications.data]);
    const tiles = [
        { label: '我的报名', value: stats?.signups ?? 0, icon: _jsx(BadgeCheck, { className: "h-4 w-4" }), tone: 'primary', to: '/account/signups' },
        { label: '我的项目', value: stats?.applications ?? 0, icon: _jsx(ClipboardList, { className: "h-4 w-4" }), tone: 'accent', to: '/account/applications' },
        { label: '招新申请', value: stats?.joinApplications ?? 0, icon: _jsx(UserRoundCog, { className: "h-4 w-4" }), tone: 'success', to: '/account/join' },
        { label: '我的留言', value: stats?.feedback ?? 0, icon: _jsx(MessageSquare, { className: "h-4 w-4" }), tone: 'warning', to: '/account/messages' },
    ];
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs(Glass, { tone: "soft", sheen: true, className: "relative p-6 sm:p-8", "data-reveal": true, children: [_jsx("div", { "aria-hidden": true, className: "pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-sky-400/18 via-violet-400/12 to-transparent blur-3xl" }), _jsxs("div", { className: "relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs(Chip, { tone: "primary", className: "!px-2.5 !py-0.5", children: [_jsx(Sparkles, { className: "h-3 w-3" }), "\u7528\u6237\u4E2D\u5FC3"] }), _jsx("h1", { className: "mt-4 text-2xl font-semibold tracking-tight sm:text-[1.75rem]", children: _jsxs("span", { className: "spotlight-text", children: [greeting(hour), "\uFF0C", user?.name || user?.username] }) }), _jsxs("p", { className: "mt-2.5 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground", children: ["\u8FD9\u91CC\u6C47\u603B\u4E86\u4F60\u7684\u6D3B\u52A8\u62A5\u540D\u3001\u9879\u76EE\u7533\u62A5\u4E0E\u7CFB\u7EDF\u901A\u77E5\u3002\u5F53\u524D\u8EAB\u4EFD", _jsxs("span", { className: "text-primary", children: [" ", roleLabel] }), user?.college ? _jsxs("span", { children: [" \u00B7 ", user.college] }) : null, stats?.unread ? _jsxs("span", { children: [" \u00B7 \u6709 ", stats.unread, " \u6761\u672A\u8BFB\u6D88\u606F"] }) : null, "\u3002"] }), _jsxs("div", { className: "mt-5 flex flex-wrap items-center gap-2.5", children: [_jsxs(Button, { variant: "primary", size: "sm", onClick: () => navigate('/account/messages'), children: [_jsx(MessageSquare, { className: "h-3.5 w-3.5" }), "\u67E5\u770B\u6D88\u606F", stats?.unread ? _jsxs("span", { className: "mono opacity-80", children: ["(", stats.unread, ")"] }) : null] }), _jsxs(LinkButton, { to: "/account/profile", variant: "glass", size: "sm", children: [_jsx(UserRound, { className: "h-3.5 w-3.5" }), "\u7F16\u8F91\u8D44\u6599"] })] })] }), _jsxs("div", { className: "shrink-0 sm:text-right", children: [_jsx("p", { className: "mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground/70", children: fdatetime(new Date().toISOString()) }), _jsxs("div", { className: "mt-3 flex flex-wrap gap-2 sm:justify-end", children: [_jsx(Chip, { children: roleLabel }), user?.studentId ? _jsx(Chip, { className: "mono", children: user.studentId }) : null] })] })] })] }), _jsx("div", { className: "grid grid-cols-2 gap-3.5 lg:grid-cols-4", children: tiles.map((t, i) => (_jsx("button", { type: "button", onClick: () => navigate(t.to), "data-reveal": "scale", style: { transitionDelay: `${i * 60}ms` }, className: "group block w-full rounded-2xl text-left transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40", "aria-label": `前往${t.label}`, children: _jsx(StatCard, { label: t.label, value: t.value, unit: "\u6761", icon: t.icon, tone: t.tone, className: "h-full" }) }, t.label))) }), _jsxs("div", { children: [_jsx(SectionHead, { title: "\u5FEB\u6377\u5165\u53E3", hint: "\u5E38\u7528\u4E1A\u52A1\u76F4\u8FBE" }), _jsx("div", { className: "mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3", children: QUICK.map((q, i) => (_jsx(Link, { to: q.to, "data-reveal": "scale", style: { transitionDelay: `${i * 55}ms` }, className: "group block", children: _jsxs(Glass, { tone: "soft", hover: true, sheen: true, className: "relative h-full overflow-hidden p-5", children: [_jsx("div", { "aria-hidden": true, className: cn('pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-70 blur-2xl transition-opacity duration-500 group-hover:opacity-100', q.tone) }), _jsxs("div", { className: "relative flex items-start gap-4", children: [_jsx("span", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] text-primary transition-all duration-400 group-hover:border-primary/40 group-hover:bg-primary/12", children: _jsx(q.icon, { className: "h-4.5 w-4.5" }) }), _jsxs("div", { className: "min-w-0", children: [_jsxs("h3", { className: "flex items-center gap-2 text-[14.5px] font-semibold", children: [q.title, _jsx(ArrowUpRight, { className: "h-3.5 w-3.5 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-70" })] }), _jsx("p", { className: "mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground", children: q.desc })] })] })] }) }, q.to))) })] }), _jsxs("div", { children: [_jsx(SectionHead, { title: "\u6700\u8FD1\u52A8\u6001", hint: "\u62A5\u540D\u4E0E\u9879\u76EE\u7533\u62A5\u8BB0\u5F55", action: _jsxs(LinkButton, { to: "/account/signups", variant: "ghost", size: "sm", children: ["\u5168\u90E8\u8BB0\u5F55 ", _jsx(ArrowUpRight, { className: "h-3.5 w-3.5" })] }) }), _jsx(Glass, { tone: "soft", className: "mt-3.5 p-2 sm:p-3", children: error ? (_jsx(ErrorState, { message: error, onRetry: retry })) : loading ? (_jsx("div", { className: "flex flex-col gap-2.5 p-2", children: Array.from({ length: 4 }).map((_, i) => (_jsx(Skeleton, { className: "h-14" }, i))) })) : feed.length === 0 ? (_jsx(EmptyState, { icon: _jsx(Rocket, { className: "h-5 w-5" }), title: "\u8FD8\u6CA1\u6709\u52A8\u6001\u8BB0\u5F55", description: "\u62A5\u540D\u4E00\u573A\u6D3B\u52A8\u6216\u63D0\u4EA4\u4E00\u6B21\u9879\u76EE\u7533\u62A5\u540E\uFF0C\u8FDB\u5EA6\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002", action: _jsxs("div", { className: "flex flex-wrap justify-center gap-3", children: [_jsxs(LinkButton, { to: "/activities", variant: "primary", children: [_jsx(CalendarDays, { className: "h-4 w-4" }), " \u6D4F\u89C8\u6D3B\u52A8"] }), _jsxs(LinkButton, { to: "/projects/apply", children: [_jsx(FileText, { className: "h-4 w-4" }), " \u9879\u76EE\u7533\u62A5"] })] }) })) : (_jsx("ul", { className: "flex flex-col", children: feed.map((f, i) => (_jsx("li", { className: cn(i > 0 && 'border-t border-white/6'), children: _jsxs(Link, { to: f.to, className: "group flex items-start gap-4 rounded-xl px-3 py-3.5 transition-colors duration-300 hover:bg-white/[0.045]", children: [_jsx("span", { className: cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border', f.tone === 'primary'
                                                ? 'border-primary/30 bg-primary/12 text-primary'
                                                : 'border-accent/30 bg-accent/12 text-accent'), children: _jsx(f.icon, { className: "h-4 w-4" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(Chip, { tone: f.tone, className: "!px-2 !py-0 !text-[10px]", children: f.kind }), _jsx("span", { className: "clamp-1 text-[13.5px] font-medium text-foreground/90 transition-colors group-hover:text-primary", children: f.title })] }), f.desc && _jsx("p", { className: "clamp-1 mt-1 text-[12px] text-muted-foreground", children: f.desc })] }), _jsx("span", { className: "mono mt-1 shrink-0 text-[11px] text-muted-foreground", children: fromNow(f.at) })] }) }, f.key))) })) })] })] }));
}
/* ------------------------------ 小组件 ------------------------------ */
function SectionHead({ title, hint, action }) {
    return (_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-baseline gap-3", children: [_jsx("h2", { className: "text-[15px] font-semibold", children: title }), hint && _jsx("span", { className: "text-[11.5px] text-muted-foreground", children: hint })] }), action] }));
}

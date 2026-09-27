import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Briefcase, Check, CircleSlash, Clock, GraduationCap, Hash, Mail, Phone, Sparkles, UserRoundPlus, UserRoundX, } from 'lucide-react';
import { AuthApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';
import { useAuth } from '@/lib/store';
import { cn, fdatetime, fromNow } from '@/lib/utils';
import { Chip, EmptyState, ErrorState, Glass, LinkButton, Skeleton } from '@/components/ui';
const STEPS = ['已提交', '简历筛选', '面试', '录用公示'];
/** 状态 → 当前已完成到第几步（0 基） */
function stageOf(status) {
    switch (status) {
        case 'pending':
            return 1;
        case 'reviewing':
            return 2;
        case 'approved':
            return 3;
        case 'rejected':
            return 1;
        default:
            return 0;
    }
}
const STATUS_TEXT = {
    pending: '待筛选',
    reviewing: '审核中',
    approved: '已录用',
    rejected: '未通过',
};
function statusTone(status) {
    if (status === 'approved')
        return 'success';
    if (status === 'rejected')
        return 'danger';
    if (status === 'reviewing')
        return 'primary';
    return 'warning';
}
export default function JoinProgress() {
    const { user } = useAuth();
    useTitle('招新进度');
    const { data, loading, error, reload } = useApi(() => AuthApi.joinApplications(), []);
    const rows = data ?? [];
    const summary = useMemo(() => {
        const done = rows.filter((r) => r.status === 'approved').length;
        const going = rows.filter((r) => r.status === 'pending' || r.status === 'reviewing').length;
        const failed = rows.filter((r) => r.status === 'rejected').length;
        return { done, going, failed };
    }, [rows]);
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "\u62DB\u65B0\u8FDB\u5EA6" }), _jsx("p", { className: "mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground", children: "\u62DB\u65B0\u6D41\u7A0B\u4E3A\u300C\u63D0\u4EA4\u62A5\u540D \u2192 \u7B80\u5386\u7B5B\u9009 \u2192 \u9762\u8BD5 \u2192 \u5F55\u7528\u516C\u793A\u300D\uFF0C\u4E0B\u9762\u662F\u4F60\u63D0\u4EA4\u7684\u62A5\u540D\u8BB0\u5F55\u4E0E\u5F53\u524D\u6240\u5904\u9636\u6BB5\u3002" })] }), _jsxs(LinkButton, { to: "/join", variant: "glass", size: "sm", children: [_jsx(UserRoundPlus, { className: "h-3.5 w-3.5" }), " \u67E5\u770B\u62DB\u65B0\u5C97\u4F4D"] })] }), rows.length > 0 && (_jsxs("div", { className: "grid grid-cols-3 gap-3.5", children: [_jsx(Tile, { label: "\u8FDB\u884C\u4E2D", value: summary.going, tone: "warning" }), _jsx(Tile, { label: "\u5DF2\u5F55\u7528", value: summary.done, tone: "success" }), _jsx(Tile, { label: "\u672A\u901A\u8FC7", value: summary.failed, tone: "danger" })] })), error ? (_jsx(Glass, { tone: "soft", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : loading ? (_jsx("div", { className: "flex flex-col gap-3.5", children: Array.from({ length: 2 }).map((_, i) => (_jsx(Skeleton, { className: "h-[280px]" }, i))) })) : rows.length === 0 ? (_jsx(Glass, { tone: "soft", children: _jsx(EmptyState, { icon: _jsx(UserRoundPlus, { className: "h-5 w-5" }), title: "\u8FD8\u6CA1\u6709\u62DB\u65B0\u62A5\u540D\u8BB0\u5F55", description: user?.studentId
                        ? '科技创新部每年春季与秋季各开展一次招新，提交报名后可以在这里跟踪筛选与面试进度。'
                        : '建议先在「个人资料」补全学号，报名记录才能与当前账号自动关联。', action: _jsxs("div", { className: "flex flex-wrap justify-center gap-3", children: [_jsxs(LinkButton, { to: "/join", variant: "primary", children: [_jsx(UserRoundPlus, { className: "h-4 w-4" }), " \u7ACB\u5373\u62A5\u540D"] }), _jsx(LinkButton, { to: "/account/profile", children: "\u5B8C\u5584\u8D44\u6599" })] }) }) })) : (_jsx("div", { className: "flex flex-col gap-4", children: rows.map((r, i) => (_jsx(JoinCard, { row: r, index: i }, r.id))) }))] }));
}
/* ------------------------------ 统计小格 ------------------------------ */
function Tile({ label, value, tone }) {
    const tones = {
        warning: 'text-[hsl(var(--warning))]',
        success: 'text-[hsl(var(--success))]',
        danger: 'text-[hsl(var(--destructive))]',
    };
    return (_jsxs(Glass, { tone: "soft", className: "p-4", children: [_jsx("p", { className: "text-[11px] tracking-wide text-muted-foreground", children: label }), _jsx("p", { className: cn('mono mt-2 text-xl font-semibold tabular-nums', tones[tone]), children: value })] }));
}
/* ------------------------------ 进度卡片 ------------------------------ */
function JoinCard({ row, index }) {
    const stage = stageOf(row.status);
    const rejected = row.status === 'rejected';
    return (_jsxs(Glass, { tone: "soft", className: "p-5 sm:p-6", "data-reveal": "scale", style: { transitionDelay: `${Math.min(index, 4) * 70}ms` }, children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs(Chip, { tone: statusTone(row.status), className: "!px-2.5 !py-0.5", children: [rejected ? _jsx(UserRoundX, { className: "h-3 w-3" }) : _jsx(Sparkles, { className: "h-3 w-3" }), STATUS_TEXT[row.status] ?? row.status] }), _jsxs(Chip, { tone: "accent", className: "!px-2.5 !py-0.5", children: [_jsx(Briefcase, { className: "h-3 w-3" }), row.positionName || '意向岗位'] })] }), _jsx("h3", { className: "mt-3 text-[16px] font-semibold", children: row.positionName || '科技创新部 · 招新报名' }), _jsxs("p", { className: "mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground", children: [_jsxs("span", { className: "mono flex items-center gap-1.5", children: [_jsx(Clock, { className: "h-3.5 w-3.5" }), fdatetime(row.createdAt)] }), _jsxs("span", { children: [fromNow(row.createdAt), " \u63D0\u4EA4"] })] })] }), _jsxs("span", { className: "mono shrink-0 text-[11px] text-muted-foreground/70", children: ["\u8BB0\u5F55 #", row.id] })] }), _jsx("div", { className: "mt-6", children: _jsx("ol", { className: "flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-0", children: STEPS.map((label, i) => {
                        const done = i < stage;
                        const current = i === stage && !rejected;
                        const isRejectedHere = rejected && i === stage;
                        return (_jsxs("li", { className: "relative flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:gap-0 sm:text-center", children: [i < STEPS.length - 1 && (_jsx("span", { "aria-hidden": true, className: cn('absolute z-0 left-[13px] top-7 h-[calc(100%+16px)] w-px sm:left-1/2 sm:top-[13px] sm:h-px sm:w-full', i < stage ? 'bg-primary/45' : 'bg-white/10') })), _jsx("span", { "aria-hidden": true, className: cn('relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-all duration-300', done
                                        ? 'border-primary/60 bg-primary/18 text-primary'
                                        : isRejectedHere
                                            ? 'border-[hsl(var(--destructive))]/60 bg-[hsl(var(--destructive))]/15 text-[hsl(var(--destructive))]'
                                            : current
                                                ? 'border-primary bg-primary/25 text-primary shadow-[0_0_16px_-3px_hsl(var(--primary)/.9)]'
                                                : 'border-white/12 bg-white/[0.04] text-muted-foreground'), children: done ? _jsx(Check, { className: "h-3.5 w-3.5", strokeWidth: 3 }) : isRejectedHere ? _jsx(CircleSlash, { className: "h-3.5 w-3.5" }) : i + 1 }), _jsxs("div", { className: "min-w-0 sm:mt-3", children: [_jsx("p", { className: cn('text-[12.5px] font-medium', done || current ? 'text-foreground/90' : 'text-muted-foreground'), children: label }), _jsx("p", { className: "mt-0.5 text-[11px] text-muted-foreground", children: isRejectedHere ? '未通过' : done ? '已完成' : current ? '进行中' : '待开始' })] })] }, label));
                    }) }) }), _jsxs("dl", { className: "mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/8 pt-5 text-[12.5px] lg:grid-cols-4", children: [_jsx(Field, { label: "\u59D3\u540D", value: row.name }), _jsx(Field, { label: "\u5B66\u53F7", value: row.studentId, mono: true, icon: _jsx(Hash, { className: "h-3 w-3" }) }), _jsx(Field, { label: "\u5B66\u9662", value: row.college || '—', icon: _jsx(GraduationCap, { className: "h-3 w-3" }), span: true }), _jsx(Field, { label: "\u4E13\u4E1A / \u5E74\u7EA7", value: [row.major, row.grade].filter(Boolean).join(' · ') || '—' }), _jsx(Field, { label: "\u8054\u7CFB\u7535\u8BDD", value: row.phone || '—', mono: true, icon: _jsx(Phone, { className: "h-3 w-3" }) }), _jsx(Field, { label: "\u90AE\u7BB1", value: row.email || '—', icon: _jsx(Mail, { className: "h-3 w-3" }), span: true })] }), row.skills && (_jsx("div", { className: "mt-4 flex flex-wrap gap-2", children: row.skills
                    .split(/[\/、,，]/)
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((s) => (_jsx(Chip, { className: "!px-2.5 !py-0.5", children: s }, s))) })), row.intro && (_jsx("p", { className: "mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5 text-[12.5px] leading-relaxed text-muted-foreground", children: row.intro })), row.reviewNote && (_jsxs("div", { className: cn('mt-4 rounded-2xl border px-4 py-3.5', rejected
                    ? 'border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/8'
                    : 'border-[hsl(var(--warning))]/25 bg-[hsl(var(--warning))]/8'), children: [_jsx("p", { className: cn('text-[12px] font-medium', rejected ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--warning))]'), children: "\u5BA1\u6838\u610F\u89C1" }), _jsx("p", { className: "mt-1.5 text-[13px] leading-relaxed text-foreground/80", children: row.reviewNote })] })), _jsxs("div", { className: "mt-5 flex flex-wrap items-center gap-2.5", children: [_jsxs(LinkButton, { to: "/join", size: "sm", children: [_jsx(Briefcase, { className: "h-3.5 w-3.5" }), " \u67E5\u770B\u5C97\u4F4D\u8BE6\u60C5"] }), row.status === 'approved' && (_jsx("span", { className: "text-[11.5px] text-[hsl(var(--success))]", children: "\u606D\u559C\uFF01\u8BF7\u7559\u610F\u540E\u7EED\u7684\u5165\u90E8\u901A\u77E5\u4E0E\u90E8\u95E8\u7FA4\u9080\u8BF7\u3002" }))] })] }));
}
function Field({ label, value, mono, span, icon, }) {
    return (_jsxs("div", { className: cn(span && 'col-span-2 lg:col-span-1'), children: [_jsxs("dt", { className: "flex items-center gap-1.5 text-[11px] text-muted-foreground", children: [icon, label] }), _jsx("dd", { className: cn('clamp-1 mt-1 text-foreground/85', mono && 'mono'), children: value })] }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { CalendarClock, GitBranch, History, Layers, PenLine, Rocket, Tag as TagIcon, User as UserIcon, } from 'lucide-react';
import { PublicApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';
import { cn, fdatetime, fnum, fromNow } from '@/lib/utils';
import { useRevealScope } from '@/components/RevealScope';
import { Button, Chip, EmptyState, ErrorState, Glass, LinkButton, PageHero, Skeleton, } from '@/components/ui';
/** 版本颜色名 → 语义色调（不硬编码颜色，全部走 token） */
const VERSION_TONE = {
    emerald: 'success',
    blue: 'primary',
    violet: 'accent',
    amber: 'warning',
    cyan: 'primary',
    rose: 'danger',
};
/** 时间轴节点的圆点颜色（同样只用语义 token） */
const DOT_TONE = {
    primary: 'bg-primary shadow-[0_0_16px_-2px_hsl(var(--primary)/.85)]',
    accent: 'bg-accent shadow-[0_0_16px_-2px_hsl(var(--accent)/.85)]',
    success: 'bg-[hsl(var(--success))] shadow-[0_0_16px_-2px_hsl(var(--success)/.85)]',
    warning: 'bg-[hsl(var(--warning))] shadow-[0_0_16px_-2px_hsl(var(--warning)/.85)]',
    danger: 'bg-[hsl(var(--destructive))] shadow-[0_0_16px_-2px_hsl(var(--destructive)/.85)]',
    default: 'bg-white/40',
};
const isHtml = (s) => /<[a-z][\s\S]*>/i.test(s || '');
export default function Changelog() {
    useTitle('更新日志');
    const revealRef = useRevealScope();
    const [sp, setSp] = useSearchParams();
    const filter = sp.get('color') ?? 'all';
    const { data, loading, error, reload } = useApi(() => PublicApi.changelog(), []);
    const all = data ?? [];
    const colors = useMemo(() => {
        const seen = [];
        for (const it of all) {
            const c = String(it.versionColor || 'blue');
            if (!seen.includes(c))
                seen.push(c);
        }
        return seen;
    }, [all]);
    const items = useMemo(() => (filter === 'all' ? all : all.filter((it) => String(it.versionColor || 'blue') === filter)), [all, filter]);
    return (_jsxs("div", { ref: revealRef, children: [_jsxs(PageHero, { eyebrow: "Changelog", title: "\u66F4\u65B0\u65E5\u5FD7", description: "\u95E8\u6237\u7684\u6BCF\u4E00\u6B21\u8FED\u4EE3\u90FD\u8BB0\u5F55\u5728\u6848\uFF1A\u65B0\u589E\u80FD\u529B\u3001\u4F53\u9A8C\u4F18\u5316\u4E0E\u95EE\u9898\u4FEE\u590D\uFF0C\u6309\u7248\u672C\u5012\u5E8F\u6392\u5217\u3002", breadcrumb: [{ label: '更新日志' }], children: [_jsxs("div", { className: "flex flex-wrap items-center gap-x-5 gap-y-3 text-[12.5px] text-muted-foreground", children: [_jsxs("span", { className: "mono flex items-center gap-1.5", children: [_jsx(Layers, { className: "h-3.5 w-3.5" }), "\u5171 ", fnum(all.length), " \u4E2A\u7248\u672C"] }), all[0] && (_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Rocket, { className: "h-3.5 w-3.5 text-primary" }), "\u6700\u65B0 ", _jsx("span", { className: "mono text-foreground/90", children: all[0].version }), _jsxs("span", { className: "text-muted-foreground/70", children: ["\uFF08", fromNow(all[0].createdAt), "\uFF09"] })] })), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(History, { className: "h-3.5 w-3.5" }), "\u65F6\u95F4\u7CBE\u786E\u5230\u79D2"] })] }), colors.length > 1 && (_jsxs("div", { className: "mt-7 flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "text-[11px] text-muted-foreground", children: "\u6309\u7248\u672C\u7C7B\u578B" }), _jsxs("button", { onClick: () => setSp((p) => {
                                    const n = new URLSearchParams(p);
                                    n.delete('color');
                                    return n;
                                }), className: cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] transition-all duration-300', filter === 'all'
                                    ? 'border-primary/40 bg-primary/12 text-primary'
                                    : 'border-white/11 bg-white/[0.045] text-muted-foreground hover:border-white/25 hover:text-foreground'), children: ["\u5168\u90E8", _jsx("span", { className: "mono text-[10px] opacity-75", children: all.length })] }), colors.map((c) => {
                                const active = filter === c;
                                const count = all.filter((it) => String(it.versionColor || 'blue') === c).length;
                                return (_jsx("button", { onClick: () => setSp((p) => {
                                        const n = new URLSearchParams(p);
                                        if (active)
                                            n.delete('color');
                                        else
                                            n.set('color', c);
                                        return n;
                                    }), className: cn('transition-all duration-300', !active && 'opacity-70 hover:opacity-100'), children: _jsxs(Chip, { tone: VERSION_TONE[c] ?? 'default', className: cn(active && 'ring-1 ring-white/25'), children: [_jsx(TagIcon, { className: "h-3 w-3" }), _jsx("span", { className: "mono", children: c }), _jsx("span", { className: "mono text-[10px] opacity-75", children: count })] }) }, c));
                            })] }))] }), _jsx("div", { className: "shell pb-24", children: error ? (_jsx(Glass, { tone: "soft", className: "p-4", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : loading ? (_jsxs("div", { className: "relative pl-8 sm:pl-12", children: [_jsx("span", { "aria-hidden": true, className: "absolute bottom-6 left-[11px] top-2 w-px bg-gradient-to-b from-primary/40 via-white/10 to-transparent" }), _jsx("div", { className: "flex flex-col gap-6", children: Array.from({ length: 4 }).map((_, i) => (_jsx(Skeleton, { className: "h-[168px]" }, i))) })] })) : !items.length ? (_jsx(Glass, { tone: "soft", className: "p-4", children: _jsx(EmptyState, { icon: _jsx(GitBranch, { className: "h-6 w-6" }), title: filter === 'all' ? '暂无版本记录' : '该类型下暂无版本记录', description: filter === 'all'
                            ? '门户版本变更会在这里按时间倒序展示，包含版本号、更新内容与发布人。'
                            : '切换「全部」可查看所有版本的更新记录。', action: filter === 'all' ? (_jsx(LinkButton, { to: "/feedback", variant: "primary", children: "\u63D0\u4EA4\u6539\u8FDB\u5EFA\u8BAE" })) : (_jsx(Button, { onClick: () => setSp((p) => {
                                const n = new URLSearchParams(p);
                                n.delete('color');
                                return n;
                            }), children: "\u67E5\u770B\u5168\u90E8\u7248\u672C" })) }) })) : (_jsxs("div", { className: "relative pl-8 sm:pl-12", children: [_jsx("span", { "aria-hidden": true, className: "absolute bottom-4 left-[11px] top-3 w-px bg-gradient-to-b from-primary/50 via-white/12 to-transparent" }), _jsx("ol", { className: "flex flex-col", children: items.map((it, i) => {
                                const tone = VERSION_TONE[String(it.versionColor || 'blue')] ?? 'default';
                                return (_jsxs("li", { className: cn('relative', i === items.length - 1 ? 'pb-0' : 'pb-8 sm:pb-10'), "data-reveal": "left", style: { transitionDelay: `${Math.min(i, 6) * 60}ms` }, children: [_jsxs("span", { "aria-hidden": true, className: "absolute -left-8 top-5 flex h-6 w-6 items-center justify-center rounded-full border border-white/14 bg-background sm:-left-12", children: [i === 0 && (_jsx("span", { className: cn('absolute h-2.5 w-2.5 rounded-full opacity-70', DOT_TONE[tone] ?? DOT_TONE.default), style: { animation: 'sti-pulse 2.6s ease-out infinite' } })), _jsx("span", { className: cn('relative h-2.5 w-2.5 rounded-full', DOT_TONE[tone] ?? DOT_TONE.default) })] }), _jsxs(Glass, { tone: "soft", hover: true, sheen: true, className: "p-5 sm:p-6", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-x-3.5 gap-y-2", children: [_jsx(Chip, { tone: tone, className: "!px-3 !py-1", children: _jsx("span", { className: "mono text-[12px] font-semibold", children: it.version }) }), _jsx("h2", { className: "min-w-0 text-[16px] font-semibold leading-snug", children: it.title }), i === 0 && (_jsx(Chip, { tone: "primary", className: "!px-2.5 !py-0.5 !text-[10px]", children: "\u6700\u65B0" }))] }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-muted-foreground", children: [_jsxs("span", { className: "mono flex items-center gap-1.5", children: [_jsx(CalendarClock, { className: "h-3.5 w-3.5" }), fdatetime(it.createdAt, true)] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(UserIcon, { className: "h-3.5 w-3.5" }), it.author || '科技创新部'] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(PenLine, { className: "h-3.5 w-3.5" }), fromNow(it.createdAt)] })] }), _jsx("div", { className: "mt-4 border-t border-white/8 pt-4", children: isHtml(it.content) ? (_jsx("div", { className: "prose-glass !text-[13.5px]", dangerouslySetInnerHTML: { __html: it.content } })) : (_jsx("p", { className: "whitespace-pre-line text-[13.5px] leading-[1.9] text-foreground/80", children: it.content })) })] })] }, it.id));
                            }) })] })) })] }));
}

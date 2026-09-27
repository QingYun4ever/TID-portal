import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import { ArrowUpRight, BookOpen, CalendarDays, Compass, Download, FileText, Layers, Lightbulb, Search as SearchIcon, Sparkles, Trophy, } from 'lucide-react';
import { PublicApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';
import { cn, fdate, fnum } from '@/lib/utils';
import { useRevealScope } from '@/components/RevealScope';
import { Button, Chip, EmptyState, ErrorState, Glass, LinkButton, PageHero, Skeleton, Tabs, } from '@/components/ui';
/* =============================================================================
 * 全站搜索 — /search
 * 结果按内容类型分组，关键词在标题 / 摘要中高亮（先转义再包裹 <mark>）
 * ========================================================================== */
const SCOPES = [
    { value: 'all', label: '全部' },
    { value: 'article', label: '新闻' },
    { value: 'activity', label: '活动' },
    { value: 'project', label: '项目' },
    { value: 'competition', label: '竞赛' },
    { value: 'resource', label: '资源' },
];
const TYPE_META = {
    article: { label: '新闻与通知', icon: _jsx(FileText, { className: "h-4 w-4" }), tone: 'primary', to: (i) => `/news/${i.slug}` },
    activity: {
        label: '活动',
        icon: _jsx(CalendarDays, { className: "h-4 w-4" }),
        tone: 'warning',
        to: (i) => `/activities/${i.slug}`,
    },
    project: { label: '创新项目', icon: _jsx(Layers, { className: "h-4 w-4" }), tone: 'accent', to: (i) => `/projects/${i.slug}` },
    competition: { label: '竞赛信息', icon: _jsx(Trophy, { className: "h-4 w-4" }), tone: 'success', to: () => '/competitions' },
    resource: { label: '资源中心', icon: _jsx(Download, { className: "h-4 w-4" }), tone: 'default', to: () => '/resources' },
};
const HOT_WORDS = ['大创项目', '挑战杯', '电子设计竞赛', '创新工坊', '学分认定', '政策文件'];
/* ------------------------------ 关键词高亮 ------------------------------ */
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escHtml = (s) => s.replace(/[&<>"']/g, (c) => ESC[c]);
function highlight(text, needle) {
    const raw = String(text ?? '');
    const key = needle.trim();
    if (!key)
        return escHtml(raw);
    const lower = raw.toLowerCase();
    const kLower = key.toLowerCase();
    let out = '';
    let i = 0;
    while (i < raw.length) {
        const idx = lower.indexOf(kLower, i);
        if (idx < 0) {
            out += escHtml(raw.slice(i));
            break;
        }
        out += escHtml(raw.slice(i, idx));
        out += `<mark class="rounded-sm bg-primary/22 px-0.5 text-foreground">${escHtml(raw.slice(idx, idx + kLower.length))}</mark>`;
        i = idx + kLower.length;
    }
    return out;
}
export default function Search() {
    useTitle('全站搜索');
    const revealRef = useRevealScope();
    const [sp, setSp] = useSearchParams();
    const q = (sp.get('q') ?? '').trim();
    const scopeRaw = sp.get('scope') ?? 'all';
    const scope = SCOPES.some((s) => s.value === scopeRaw) ? scopeRaw : 'all';
    const [kw, setKw] = useState(q);
    useEffect(() => {
        setKw(q);
    }, [q]);
    const run = (value) => {
        const v = (value ?? kw).trim();
        setSp((prev) => {
            const next = new URLSearchParams(prev);
            if (v)
                next.set('q', v);
            else
                next.delete('q');
            return next;
        }, { replace: false });
    };
    const setScope = (value) => setSp((prev) => {
        const next = new URLSearchParams(prev);
        if (value === 'all')
            next.delete('scope');
        else
            next.set('scope', value);
        return next;
    });
    const { data, loading, error, reload } = useApi(() => (q ? PublicApi.search(q, scope) : Promise.resolve({ groups: [], total: 0, query: '' })), [q, scope]);
    const groups = data?.groups ?? [];
    const total = data?.total ?? 0;
    const scopeLabel = useMemo(() => SCOPES.find((s) => s.value === scope)?.label ?? '全部', [scope]);
    return (_jsxs("div", { ref: revealRef, children: [_jsx(PageHero, { eyebrow: "Global Search", title: "\u5168\u7AD9\u641C\u7D22", description: "\u4E00\u6B21\u68C0\u7D22\u8986\u76D6\u65B0\u95FB\u901A\u77E5\u3001\u6D3B\u52A8\u3001\u521B\u65B0\u9879\u76EE\u3001\u7ADE\u8D5B\u4FE1\u606F\u4E0E\u8D44\u6E90\u4E2D\u5FC3\uFF0C\u7ED3\u679C\u6309\u5185\u5BB9\u7C7B\u578B\u5206\u7EC4\u5448\u73B0\u3002", breadcrumb: [{ label: '全站搜索' }], children: _jsxs("div", { className: "max-w-3xl", children: [_jsxs("form", { onSubmit: (e) => {
                                e.preventDefault();
                                run();
                            }, className: "flex flex-col gap-3 sm:flex-row", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(SearchIcon, { className: "pointer-events-none absolute left-5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" }), _jsx("input", { value: kw, onChange: (e) => setKw(e.target.value), placeholder: "\u8F93\u5165\u5173\u952E\u8BCD\uFF0C\u4F8B\u5982\u300C\u5927\u521B\u9879\u76EE\u300D\u300C\u6311\u6218\u676F\u300D\u2026", "aria-label": "\u641C\u7D22\u5173\u952E\u8BCD", className: "field h-[54px] pl-13 pr-4 text-[15px]" })] }), _jsxs(Button, { type: "submit", variant: "primary", size: "lg", disabled: !kw.trim() && !q, children: [_jsx(SearchIcon, { className: "h-4 w-4" }), "\u641C\u7D22"] })] }), _jsx("div", { className: "mt-5 no-scrollbar -mx-1 overflow-x-auto px-1", children: _jsx(Tabs, { items: SCOPES, value: scope, onChange: setScope, size: "sm" }) }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] text-muted-foreground", children: [_jsxs("span", { className: "mono", children: ["\u8303\u56F4\uFF1A", scopeLabel, q && ` · 关键词「${q}」`] }), _jsx("span", { children: "\u68C0\u7D22\u7ED3\u679C\u7531\u95E8\u6237\u6570\u636E\u5E93\u5B9E\u65F6\u8FD4\u56DE" })] })] }) }), _jsx("div", { className: "shell pb-24", children: _jsxs("div", { className: "grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10", children: [_jsx("div", { className: "min-w-0", children: error ? (_jsx(Glass, { tone: "soft", className: "p-4", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : !q ? (_jsx(Glass, { tone: "soft", className: "p-4", children: _jsx(EmptyState, { icon: _jsx(Compass, { className: "h-6 w-6" }), title: "\u8F93\u5165\u5173\u952E\u8BCD\u5F00\u59CB\u68C0\u7D22", description: "\u652F\u6301\u68C0\u7D22\u6807\u9898\u3001\u6458\u8981\u4E0E\u6B63\u6587\u5185\u5BB9\u3002\u4E5F\u53EF\u4EE5\u76F4\u63A5\u4ECE\u4E0B\u9762\u7684\u70ED\u95E8\u641C\u7D22\u5F00\u59CB\u3002", action: _jsx("div", { className: "flex flex-wrap items-center justify-center gap-2", children: HOT_WORDS.map((w) => (_jsx("button", { onClick: () => {
                                                setKw(w);
                                                run(w);
                                            }, className: "rounded-full border border-white/10 bg-white/[0.045] px-3.5 py-1.5 text-[11.5px] text-muted-foreground transition-all duration-300 hover:border-primary/35 hover:bg-primary/10 hover:text-primary", children: w }, w))) }) }) })) : loading ? (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsx(Skeleton, { className: "h-6 w-56 rounded-full" }), Array.from({ length: 2 }).map((_, i) => (_jsxs(Glass, { tone: "soft", className: "p-5", children: [_jsx(Skeleton, { className: "h-5 w-32 rounded-full" }), _jsx("div", { className: "mt-4 flex flex-col gap-3", children: Array.from({ length: 3 }).map((__, j) => (_jsx(Skeleton, { className: "h-16" }, j))) })] }, i)))] })) : !groups.length ? (_jsx(Glass, { tone: "soft", className: "p-4", children: _jsx(EmptyState, { icon: _jsx(SearchIcon, { className: "h-6 w-6" }), title: `没有找到与「${q}」相关的内容`, description: "\u8BD5\u8BD5\u66F4\u77ED\u7684\u5173\u952E\u8BCD\u3001\u5207\u6362\u68C0\u7D22\u8303\u56F4\uFF0C\u6216\u4ECE\u4E0B\u9762\u7684\u70ED\u95E8\u641C\u7D22\u4E2D\u6311\u9009\u3002", action: _jsx("div", { className: "flex flex-wrap items-center justify-center gap-2", children: HOT_WORDS.map((w) => (_jsx("button", { onClick: () => {
                                                setKw(w);
                                                run(w);
                                            }, className: "rounded-full border border-white/10 bg-white/[0.045] px-3.5 py-1.5 text-[11.5px] text-muted-foreground transition-all duration-300 hover:border-primary/35 hover:bg-primary/10 hover:text-primary", children: w }, w))) }) }) })) : (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3 text-[12.5px] text-muted-foreground", "data-reveal": true, children: [_jsxs("span", { className: "flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-primary", children: [_jsx(Sparkles, { className: "h-3.5 w-3.5" }), _jsxs("span", { className: "mono", children: ["\u627E\u5230 ", fnum(total), " \u6761\u7ED3\u679C"] })] }), _jsxs("span", { children: ["\u5173\u952E\u8BCD\u300C", _jsx("span", { className: "text-foreground/90", children: q }), "\u300D\u00B7 \u8303\u56F4 ", scopeLabel, " \u00B7 ", groups.length, " \u4E2A\u5206\u7EC4"] })] }), groups.map((g, gi) => {
                                        const meta = TYPE_META[g.type] ?? {
                                            label: g.label,
                                            icon: _jsx(FileText, { className: "h-4 w-4" }),
                                            tone: 'default',
                                            to: () => '/search',
                                        };
                                        return (_jsxs(Glass, { tone: "soft", className: "overflow-hidden", "data-reveal": true, style: { transitionDelay: `${gi * 60}ms` }, children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4", children: [_jsx("span", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.055] text-primary", children: meta.icon }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-[14px] font-semibold", children: meta.label }), _jsx("p", { className: "mono text-[10.5px] text-muted-foreground", children: g.type })] }), _jsxs(Chip, { tone: meta.tone, className: "ml-auto", children: [g.items.length, " \u6761"] })] }), _jsx("div", { className: "divide-y divide-white/6", children: g.items.map((it) => (_jsxs(Link, { to: meta.to(it), className: "group flex items-start gap-4 px-5 py-4 transition-colors duration-300 hover:bg-white/[0.04]", children: [_jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "clamp-2 block text-[14.5px] font-medium leading-snug text-foreground/90 transition-colors group-hover:text-primary", dangerouslySetInnerHTML: { __html: highlight(it.title, q) } }), it.summary && (_jsx("span", { className: "clamp-2 mt-2 block text-[12.5px] leading-relaxed text-muted-foreground", dangerouslySetInnerHTML: { __html: highlight(it.summary, q) } })), _jsxs("span", { className: "mt-2.5 flex flex-wrap items-center gap-2.5 text-[11px] text-muted-foreground", children: [it.category && (_jsx(Chip, { className: "!px-2.5 !py-0 !text-[10px]", children: String(it.category) })), it.date && _jsx("span", { className: "mono", children: fdate(it.date) })] })] }), _jsx(ArrowUpRight, { className: "mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-80" })] }, `${g.type}-${it.id}`))) })] }, g.type));
                                    })] })) }), _jsxs("aside", { className: "flex min-w-0 flex-col gap-5 lg:sticky lg:top-24 lg:self-start", children: [_jsxs(Glass, { tone: "soft", className: "p-5", "data-reveal": "right", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(Lightbulb, { className: "h-4 w-4 text-[hsl(var(--warning))]" }), _jsx("h3", { className: "text-[14px] font-semibold", children: "\u641C\u7D22\u6280\u5DE7" })] }), _jsxs("ul", { className: "mt-4 flex flex-col gap-2.5 text-[12px] leading-relaxed text-muted-foreground", children: [_jsxs("li", { className: "flex items-start gap-2.5", children: [_jsx("span", { className: "mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" }), "\u5173\u952E\u8BCD\u8D8A\u77ED\uFF0C\u547D\u4E2D\u8D8A\u591A\uFF1B\u300C\u7ADE\u8D5B\u300D\u6BD4\u300C\u5168\u56FD\u5927\u5B66\u751F\u7535\u5B50\u8BBE\u8BA1\u7ADE\u8D5B\u300D\u66F4\u5BB9\u6613\u627E\u5230\u7ED3\u679C\u3002"] }), _jsxs("li", { className: "flex items-start gap-2.5", children: [_jsx("span", { className: "mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" }), "\u67E5\u8BE2\u4F1A\u5199\u5165 URL\uFF08", _jsx("span", { className: "mono", children: "/search?q=" }), "\uFF09\uFF0C\u53EF\u76F4\u63A5\u5206\u4EAB\u6216\u6536\u85CF\u3002"] }), _jsxs("li", { className: "flex items-start gap-2.5", children: [_jsx("span", { className: "mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" }), "\u6BCF\u4E2A\u7C7B\u578B\u6700\u591A\u8FD4\u56DE 6 \u6761\uFF0C\u70B9\u51FB\u5206\u7EC4\u6807\u9898\u53EF\u8FDB\u5165\u8BE5\u680F\u76EE\u67E5\u770B\u5168\u90E8\u3002"] })] })] }), _jsxs(Glass, { tone: "soft", className: "p-5", "data-reveal": "right", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(BookOpen, { className: "h-4 w-4 text-primary" }), _jsx("h3", { className: "text-[14px] font-semibold", children: "\u6309\u680F\u76EE\u6D4F\u89C8" })] }), _jsx("div", { className: "mt-4 flex flex-col gap-1", children: [
                                                { label: '新闻与通知', to: '/news' },
                                                { label: '活动与报名', to: '/activities' },
                                                { label: '创新项目库', to: '/projects' },
                                                { label: '竞赛信息', to: '/competitions' },
                                                { label: '资源中心', to: '/resources' },
                                            ].map((l) => (_jsxs(Link, { to: l.to, className: "flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] text-muted-foreground transition-colors duration-300 hover:bg-white/[0.05] hover:text-foreground", children: [l.label, _jsx(ArrowUpRight, { className: "h-3.5 w-3.5 opacity-60" })] }, l.to))) })] }), _jsxs(Glass, { tone: "soft", className: "p-5", "data-reveal": "right", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(Sparkles, { className: "h-4 w-4 text-accent" }), _jsx("h3", { className: "text-[14px] font-semibold", children: "\u70ED\u95E8\u641C\u7D22" })] }), _jsx("div", { className: "mt-4 flex flex-wrap gap-2", children: HOT_WORDS.map((w) => (_jsx("button", { onClick: () => {
                                                    setKw(w);
                                                    run(w);
                                                }, className: cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] transition-all duration-300', w === q
                                                    ? 'border-accent/45 bg-accent/14 text-accent'
                                                    : 'border-white/11 bg-white/[0.045] text-muted-foreground hover:border-white/25 hover:text-foreground'), children: w }, w))) }), _jsx(LinkButton, { to: "/news", variant: "glass", size: "sm", className: "mt-5 w-full", children: "\u6D4F\u89C8\u5168\u90E8\u5185\u5BB9" })] })] })] }) })] }));
}

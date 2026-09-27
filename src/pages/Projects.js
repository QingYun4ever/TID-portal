import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowRight, Award, Compass, FileText, Layers, ListChecks, SearchX, Sparkles, Trophy, } from 'lucide-react';
import { PublicApi } from '@/lib/api';
import { useApi, useDebounced, useRevealScan, useTitle } from '@/lib/hooks';
import { PROJECT_CATEGORIES, cn, fnum } from '@/lib/utils';
import { ProjectCard } from '@/components/cards';
import { GlowOrb } from '@/components/LiquidBackdrop';
import { Button, Chip, EmptyState, ErrorState, Glass, LinkButton, PageHero, Pagination, SearchInput, Select, Skeleton, Tabs, } from '@/components/ui';
/* =============================================================================
 * 创新项目展示库（/projects）
 *  - 顶部引导条：竞赛信息 + 项目在线申报
 *  - Tabs（全部 / 优秀 / 立项 / 结项 / 在研，带 meta.counts 数量）
 *  - 年份筛选（meta.years）+ 搜索 + 分页
 *  - 第一个「优秀项目」用 ProjectCard size="lg" 突出展示，其余网格排布
 * ========================================================================== */
const PAGE_SIZE = 7;
const CATEGORY_ORDER = ['excellent', 'approved', 'completed', 'ongoing'];
export default function Projects() {
    useTitle('创新项目');
    const [sp] = useSearchParams();
    const [category, setCategory] = useState(() => {
        const c = sp.get('category');
        return c && CATEGORY_ORDER.includes(c) ? c : 'all';
    });
    const [year, setYear] = useState(() => sp.get('year') || 'all');
    const [page, setPage] = useState(1);
    const [q, setQ] = useState('');
    const dq = useDebounced(q, 380);
    const { data, meta, loading, error, reload } = useApi(() => PublicApi.projects({ page, pageSize: PAGE_SIZE, category, q: dq, year }), [page, category, year, dq]);
    const items = useMemo(() => data?.items ?? [], [data]);
    const total = Number(data?.total ?? 0);
    const counts = meta?.counts ?? {};
    const years = meta?.years ?? [];
    useEffect(() => {
        setPage(1);
    }, [category, year, dq]);
    /* 列表数据变化后重新扫描滚动揭示元素（卡片异步挂载） */
    useRevealScan(`projects|${loading}|${items.length}|${page}|${category}|${year}|${dq}`);
    const sum = useMemo(() => Object.values(counts).reduce((a, b) => a + Number(b || 0), 0), [counts]);
    const tabs = useMemo(() => [
        { value: 'all', label: '全部项目', count: sum || undefined },
        ...CATEGORY_ORDER.map((c) => ({
            value: c,
            label: PROJECT_CATEGORIES[c] ?? c,
            count: counts[c],
        })),
    ], [counts, sum]);
    /* 突出展示：优先第一个「优秀项目」，否则取当前页第一项 */
    const hero = useMemo(() => items.find((p) => p.category === 'excellent') ?? items[0], [items]);
    const rest = useMemo(() => items.filter((p) => p.id !== hero?.id), [items, hero]);
    return (_jsxs(_Fragment, { children: [_jsx(PageHero, { eyebrow: "Innovation Showcase", title: "\u521B\u65B0\u9879\u76EE\u5C55\u793A\u5E93", description: "\u8986\u76D6\u4F18\u79C0\u9879\u76EE\u3001\u7ACB\u9879\u9879\u76EE\u3001\u7ED3\u9879\u9879\u76EE\u4E0E\u5728\u7814\u9879\u76EE\uFF0C\u5C55\u793A\u6280\u672F\u8DEF\u7EBF\u3001\u56E2\u961F\u6784\u6210\u4E0E\u83B7\u5956\u6210\u679C\uFF0C\u4E3A\u7533\u62A5\u63D0\u4F9B\u53EF\u53C2\u8003\u7684\u8303\u4F8B\u3002", breadcrumb: [{ label: '创新项目' }], children: _jsxs("div", { className: "flex flex-wrap items-center gap-2.5", children: [_jsxs(Chip, { tone: "accent", children: [_jsx(Layers, { className: "h-3 w-3" }), "\u5171\u6536\u5F55 ", _jsx("span", { className: "mono ml-1 text-foreground", children: fnum(sum) }), " \u4E2A\u9879\u76EE"] }), CATEGORY_ORDER.map((c) => (_jsxs(Chip, { tone: c === 'excellent' ? 'warning' : c === 'approved' ? 'primary' : c === 'completed' ? 'success' : 'default', children: [PROJECT_CATEGORIES[c], " ", counts[c] ?? 0] }, c)))] }) }), _jsxs("section", { className: "shell pb-24", children: [_jsxs(Glass, { tone: "strong", className: "relative overflow-hidden p-7 sm:p-9", "data-reveal": "scale", children: [_jsx(GlowOrb, { className: "-right-24 -top-28", size: 460, color: "rgba(255,255,255,.055)" }), _jsx(GlowOrb, { className: "-bottom-32 -left-24", size: 420, color: "rgba(186,230,253,.10)" }), _jsxs("div", { className: "relative grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-center", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow mb-4", children: "Competition & Application" }), _jsx("h2", { className: "text-balance text-2xl font-semibold leading-snug tracking-tight sm:text-[1.7rem]", children: "\u521B\u65B0\u7ADE\u8D5B\u4E0E\u7533\u62A5\u5165\u53E3" }), _jsx("p", { className: "mt-4 max-w-xl text-pretty text-[13.5px] leading-relaxed text-muted-foreground", children: "\u7ADE\u8D5B\u4FE1\u606F\u805A\u5408\u53D1\u5E03\u3001\u622A\u6B62\u65E5\u671F\u5012\u8BA1\u65F6\u4E0E\u63D0\u9192\u8BA2\u9605\uFF1B\u5927\u5B66\u751F\u521B\u65B0\u521B\u4E1A\u8BAD\u7EC3\u8BA1\u5212\u9879\u76EE\u652F\u6301\u5728\u7EBF\u7533\u62A5\uFF0C \u8FDB\u5EA6\u53EF\u5728\u7528\u6237\u4E2D\u5FC3\u5B9E\u65F6\u67E5\u8BE2\u3002" }), _jsxs("div", { className: "mt-6 flex flex-wrap items-center gap-3", children: [_jsxs(LinkButton, { to: "/competitions", variant: "primary", children: [_jsx(Trophy, { className: "h-4 w-4" }), "\u6D4F\u89C8\u7ADE\u8D5B\u4FE1\u606F"] }), _jsxs(LinkButton, { to: "/projects/apply", variant: "glass", children: [_jsx(FileText, { className: "h-4 w-4" }), "\u5F00\u59CB\u9879\u76EE\u7533\u62A5"] })] })] }), _jsxs(Glass, { tone: "thin", className: "p-5", children: [_jsxs("p", { className: "flex items-center gap-2.5 text-[13px] font-medium", children: [_jsx(ListChecks, { className: "h-4 w-4 text-primary" }), "\u7533\u62A5\u6D41\u7A0B"] }), _jsx("div", { className: "mt-4 flex flex-col", children: [
                                                    { t: '在线填写申报书', d: '项目信息 · 团队信息 · 项目简介' },
                                                    { t: '部门初审', d: '5 个工作日内反馈受理结果' },
                                                    { t: '专家评审', d: '技术与可行性双重评审' },
                                                    { t: '结果公示与立项', d: '门户公示，用户中心可查进度' },
                                                ].map((s, i, arr) => (_jsxs("div", { className: "relative flex gap-3.5", children: [_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("span", { className: "mono flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/12 text-[10.5px] font-semibold text-primary", children: i + 1 }), i < arr.length - 1 && _jsx("span", { className: "my-1 w-px flex-1 bg-gradient-to-b from-primary/40 to-transparent" })] }), _jsxs("div", { className: cn('min-w-0 flex-1', i < arr.length - 1 ? 'pb-3.5' : ''), children: [_jsx("p", { className: "text-[12.5px] font-medium", children: s.t }), _jsx("p", { className: "mt-0.5 text-[11px] leading-relaxed text-muted-foreground", children: s.d })] })] }, s.t))) })] })] })] }), _jsxs(Glass, { tone: "soft", className: "mt-8 p-5", "data-reveal": true, children: [_jsxs("div", { className: "flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between", children: [_jsx(Tabs, { items: tabs, value: category, onChange: setCategory, size: "sm", className: "w-full xl:w-auto" }), _jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center", children: [_jsxs(Select, { value: year, onChange: (e) => setYear(e.target.value), className: "w-full sm:w-[150px]", "aria-label": "\u6309\u5E74\u4EFD\u7B5B\u9009", children: [_jsx("option", { value: "all", children: "\u5168\u90E8\u5E74\u4EFD" }), years.map((y) => (_jsxs("option", { value: String(y), children: [y, " \u5E74"] }, y)))] }), _jsx(SearchInput, { value: q, onChange: setQ, placeholder: "\u641C\u7D22\u9879\u76EE\u540D\u79F0\u3001\u56E2\u961F\u6216\u7B80\u4ECB\u2026", className: "w-full sm:w-72" })] })] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/8 pt-4 text-[11.5px] text-muted-foreground", children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Compass, { className: "h-3.5 w-3.5" }), "\u5F53\u524D\u6761\u4EF6\u547D\u4E2D ", _jsx("span", { className: "mono text-foreground", children: fnum(total) }), " \u4E2A\u9879\u76EE"] }), _jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Sparkles, { className: "h-3.5 w-3.5 text-accent" }), "\u4F18\u79C0\u9879\u76EE\u4F18\u5148\u5C55\u793A"] })] })] }), _jsx("div", { className: "mt-8", children: error ? (_jsx(Glass, { tone: "soft", className: "py-6", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : loading && !items.length ? (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(Skeleton, { className: "h-80" }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: Array.from({ length: 6 }).map((_, i) => (_jsx(Skeleton, { className: "h-72" }, i))) })] })) : items.length ? (_jsxs(_Fragment, { children: [hero && (_jsx("div", { "data-reveal": true, children: _jsx(ProjectCard, { project: hero, size: "lg" }) })), rest.length > 0 && (_jsx("div", { className: "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: rest.map((p, i) => (_jsx("div", { "data-reveal": "scale", style: { transitionDelay: `${(i % 3) * 70}ms` }, children: _jsx(ProjectCard, { project: p }) }, p.id))) })), _jsx(Pagination, { page: page, pageSize: PAGE_SIZE, total: total, onChange: (p) => {
                                        setPage(p);
                                        window.scrollTo({ top: 300, behavior: 'smooth' });
                                    }, className: "mt-10" })] })) : (_jsx(Glass, { tone: "soft", children: _jsx(EmptyState, { icon: dq ? _jsx(SearchX, { className: "h-6 w-6" }) : _jsx(Award, { className: "h-6 w-6" }), title: dq ? '没有匹配的项目' : '该条件下暂无项目', description: dq
                                    ? '试试更换关键词，或清除搜索条件浏览全部项目。'
                                    : '可切换其他类别或年份查看；也欢迎直接申报新项目，成为第一批展示成果。', action: _jsxs("div", { className: "flex flex-wrap justify-center gap-3", children: [(dq || category !== 'all' || year !== 'all') && (_jsx(Button, { onClick: () => {
                                                setQ('');
                                                setCategory('all');
                                                setYear('all');
                                            }, children: "\u6E05\u7A7A\u7B5B\u9009" })), _jsxs(LinkButton, { to: "/projects/apply", variant: "primary", children: ["\u9879\u76EE\u5728\u7EBF\u7533\u62A5 ", _jsx(ArrowRight, { className: "h-4 w-4" })] })] }) }) })) }), _jsxs(Glass, { tone: "soft", className: "mt-12 flex flex-wrap items-center justify-between gap-4 p-6", "data-reveal": "blur", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("span", { className: "flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] text-accent", children: _jsx(Sparkles, { className: "h-5 w-5" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-[14px] font-medium", children: "\u6709\u4E00\u4E2A\u60F3\u6CD5\uFF0C\u60F3\u53D8\u6210\u6B63\u5F0F\u9879\u76EE\uFF1F" }), _jsx("p", { className: "mt-1 text-[12.5px] text-muted-foreground", children: "\u5927\u521B\u9879\u76EE\u5728\u7EBF\u7533\u62A5\u73B0\u5DF2\u5F00\u653E\uFF0C5 \u4E2A\u5DE5\u4F5C\u65E5\u5185\u53CD\u9988\u521D\u5BA1\u7ED3\u679C\u3002" })] })] }), _jsxs(LinkButton, { to: "/projects/apply", variant: "primary", size: "lg", children: [_jsx(FileText, { className: "h-4 w-4" }), "\u7ACB\u5373\u7533\u62A5"] })] })] })] }));
}

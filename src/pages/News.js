import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowRight, Clock3, FileText, Flame, Hash, LayoutGrid, Pin, RotateCcw, Search, Tag as TagIcon, X, } from 'lucide-react';
import { PublicApi } from '@/lib/api';
import { useApi, useDebounced, useTitle } from '@/lib/hooks';
import { NEWS_CATEGORIES, cn, fnum } from '@/lib/utils';
import { ArticleCard } from '@/components/cards';
import { useRevealScope } from '@/components/RevealScope';
import { Button, Chip, EmptyState, ErrorState, Glass, LinkButton, PageHero, Pagination, SearchInput, Skeleton, Tabs, } from '@/components/ui';
/* =============================================================================
 * 新闻与通知 — /news
 * 分类 / 关键词 / 标签 / 排序 全部由 URL query 驱动，可分享、可回退
 * ========================================================================== */
const PAGE_SIZE = 12;
const SORTS = [
    { value: 'latest', label: '最新发布' },
    { value: 'hot', label: '最多浏览' },
    { value: 'oldest', label: '最早发布' },
];
const CAT_DOT = {
    notice: 'bg-[hsl(var(--warning))]',
    dept: 'bg-primary',
    competition: 'bg-accent',
    policy: 'bg-[hsl(var(--success))]',
};
export default function News() {
    useTitle('新闻与通知');
    const revealRef = useRevealScope();
    const [sp, setSp] = useSearchParams();
    /* ---------------------------- 从 URL 读取筛选条件 --------------------------- */
    const category = sp.get('category') ?? 'all';
    const q = sp.get('q') ?? '';
    const tag = sp.get('tag') ?? '';
    const sortRaw = sp.get('sort');
    const sort = sortRaw === 'hot' || sortRaw === 'oldest' ? sortRaw : 'latest';
    const page = Math.max(1, Number(sp.get('page') || 1));
    const update = useCallback((patch, replace = false) => {
        setSp((prev) => {
            const next = new URLSearchParams(prev);
            for (const [k, v] of Object.entries(patch)) {
                if (v === null || v === undefined || v === '')
                    next.delete(k);
                else
                    next.set(k, String(v));
            }
            return next;
        }, { replace });
    }, [setSp]);
    /* --------------------------------- 搜索框 --------------------------------- */
    const [kw, setKw] = useState(q);
    const debouncedKw = useDebounced(kw, 380);
    useEffect(() => {
        setKw(q);
    }, [q]);
    useEffect(() => {
        if (debouncedKw === q)
            return;
        update({ q: debouncedKw.trim(), page: null }, true);
    }, [debouncedKw, q, update]);
    /* ---------------------------------- 数据 ---------------------------------- */
    const { data, meta, loading, error, reload } = useApi(() => PublicApi.articles({
        page,
        pageSize: PAGE_SIZE,
        category: category === 'all' ? '' : category,
        q,
        tag,
        sort,
    }), [page, category, q, tag, sort]);
    const { data: tagData, loading: tagLoading } = useApi(() => PublicApi.tags(), []);
    const items = data?.items ?? [];
    const total = data?.total ?? 0;
    const counts = meta.counts ?? {};
    const tagCloud = (tagData ?? []).slice(0, 18);
    const tabItems = useMemo(() => [
        {
            value: 'all',
            label: '全部',
            count: Object.values(counts).reduce((s, n) => s + Number(n || 0), 0),
        },
        ...Object.entries(NEWS_CATEGORIES).map(([value, label]) => ({
            value,
            label,
            count: counts[value] ?? 0,
        })),
    ], [counts]);
    const pinnedItems = useMemo(() => items.filter((a) => a.pinned), [items]);
    const normalItems = useMemo(() => items.filter((a) => !a.pinned), [items]);
    const hasFilter = category !== 'all' || !!q || !!tag || sort !== 'latest';
    const reset = () => update({ category: null, q: null, tag: null, sort: null, page: null });
    return (_jsxs("div", { ref: revealRef, children: [_jsx(PageHero, { eyebrow: "News & Notices", title: "\u65B0\u95FB\u4E0E\u901A\u77E5", description: "\u901A\u77E5\u516C\u544A\u3001\u90E8\u95E8\u65B0\u95FB\u3001\u7ADE\u8D5B\u4FE1\u606F\u4E0E\u653F\u7B56\u6587\u4EF6\u5B9E\u65F6\u540C\u6B65\uFF0C\u91CD\u8981\u901A\u77E5\u7F6E\u9876\u5C55\u793A\uFF0C\u652F\u6301\u6309\u5206\u7C7B\u3001\u6807\u7B7E\u4E0E\u5173\u952E\u8BCD\u68C0\u7D22\u3002", breadcrumb: [{ label: '新闻与通知' }], children: _jsxs("div", { className: "max-w-2xl", children: [_jsx(SearchInput, { value: kw, onChange: setKw, onEnter: () => update({ q: kw.trim(), page: null }), placeholder: "\u68C0\u7D22\u6807\u9898\u3001\u6458\u8981\u4E0E\u6B63\u6587\u5173\u952E\u8BCD\u2026", className: "[&_.field]:h-[52px] [&_.field]:text-[15px]" }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] text-muted-foreground", children: [_jsxs("span", { className: "mono flex items-center gap-1.5", children: [_jsx(FileText, { className: "h-3 w-3" }), "\u5171 ", fnum(total), " \u7BC7"] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Pin, { className: "h-3 w-3 -rotate-45 text-[hsl(var(--warning))]" }), "\u7F6E\u9876 ", pinnedItems.length, " \u7BC7"] }), _jsx("span", { children: "\u8F93\u5165\u540E\u5728 URL \u4E2D\u540C\u6B65 query\uFF0C\u53EF\u76F4\u63A5\u5206\u4EAB\u5F53\u524D\u7B5B\u9009\u7ED3\u679C" })] })] }) }), _jsx("div", { className: "shell pb-24", children: _jsxs("div", { className: "grid gap-8 lg:grid-cols-[minmax(0,1fr)_312px] lg:gap-10", children: [_jsxs("div", { className: "min-w-0", children: [_jsx(Glass, { tone: "soft", className: "p-4 sm:p-5", "data-reveal": true, children: _jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.055] text-primary", children: _jsx(LayoutGrid, { className: "h-3.5 w-3.5" }) }), _jsx("span", { className: "text-[12.5px] text-muted-foreground", children: "\u6309\u5206\u7C7B\u7B5B\u9009" }), _jsxs("span", { className: "mono ml-auto text-[11px] text-muted-foreground", children: ["\u7B2C ", page, " \u9875 / \u5171 ", Math.max(1, Math.ceil(total / PAGE_SIZE)), " \u9875"] })] }), _jsx("div", { className: "no-scrollbar -mx-1 overflow-x-auto px-1", children: _jsx(Tabs, { items: tabItems, value: category, size: "sm", onChange: (v) => update({ category: v === 'all' ? null : v, page: null }) }) }), _jsx("div", { className: "hairline" }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(Clock3, { className: "h-3.5 w-3.5 text-muted-foreground" }), _jsx(Tabs, { items: SORTS, value: sort, size: "sm", onChange: (v) => update({ sort: v === 'latest' ? null : v, page: null }) })] }), hasFilter && (_jsxs(Button, { variant: "ghost", size: "sm", onClick: reset, children: [_jsx(RotateCcw, { className: "h-3.5 w-3.5" }), "\u91CD\u7F6E\u7B5B\u9009"] }))] })] }) }), hasFilter && (_jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-2", "data-reveal": true, children: [_jsx("span", { className: "text-[11px] text-muted-foreground", children: "\u5F53\u524D\u7B5B\u9009" }), category !== 'all' && (_jsxs(Chip, { tone: "primary", children: [NEWS_CATEGORIES[category] ?? category, _jsx("button", { onClick: () => update({ category: null, page: null }), "aria-label": "\u79FB\u9664\u5206\u7C7B\u7B5B\u9009", children: _jsx(X, { className: "h-3 w-3" }) })] })), q && (_jsxs(Chip, { children: [_jsx(Search, { className: "h-3 w-3" }), q, _jsx("button", { onClick: () => update({ q: null, page: null }), "aria-label": "\u79FB\u9664\u5173\u952E\u8BCD", children: _jsx(X, { className: "h-3 w-3" }) })] })), tag && (_jsxs(Chip, { tone: "accent", children: [_jsx(Hash, { className: "h-3 w-3" }), tag, _jsx("button", { onClick: () => update({ tag: null, page: null }), "aria-label": "\u79FB\u9664\u6807\u7B7E", children: _jsx(X, { className: "h-3 w-3" }) })] })), sort !== 'latest' && (_jsxs(Chip, { children: [SORTS.find((s) => s.value === sort)?.label, _jsx("button", { onClick: () => update({ sort: null, page: null }), "aria-label": "\u6062\u590D\u9ED8\u8BA4\u6392\u5E8F", children: _jsx(X, { className: "h-3 w-3" }) })] }))] })), _jsx("div", { className: "mt-7", children: error ? (_jsx(Glass, { tone: "soft", className: "p-4", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : loading ? (_jsx(NewsSkeleton, {})) : !items.length ? (_jsx(Glass, { tone: "soft", className: "p-4", children: _jsx(EmptyState, { icon: _jsx(FileText, { className: "h-6 w-6" }), title: hasFilter ? '没有找到匹配的内容' : '暂无已发布内容', description: hasFilter
                                                ? '试试更换关键词、切换分类，或清除全部筛选条件后重新浏览。'
                                                : '该栏目内容正在筹备中，请稍后回来查看。', action: hasFilter ? (_jsxs(Button, { onClick: reset, children: [_jsx(RotateCcw, { className: "h-4 w-4" }), "\u91CD\u7F6E\u7B5B\u9009"] })) : (_jsx(LinkButton, { to: "/", variant: "primary", children: "\u8FD4\u56DE\u9996\u9875" })) }) })) : (_jsxs("div", { className: "flex flex-col gap-9", children: [pinnedItems.length > 0 && (_jsxs("section", { children: [_jsxs("div", { className: "mb-4 flex items-center gap-3", children: [_jsxs("span", { className: "flex items-center gap-2 rounded-full border border-[hsl(var(--warning))]/35 bg-[hsl(var(--warning))]/12 px-3 py-1 text-[11px] font-medium text-[hsl(var(--warning))]", children: [_jsx(Pin, { className: "h-3 w-3 -rotate-45" }), "\u7F6E\u9876"] }), _jsxs("span", { className: "text-[12px] text-muted-foreground", children: [pinnedItems.length, " \u7BC7\u91CD\u8981\u5185\u5BB9\u4F18\u5148\u5C55\u793A"] }), _jsx("span", { className: "hairline flex-1" })] }), _jsxs("div", { className: "grid gap-5", children: [_jsx("div", { "data-reveal": true, children: _jsx(ArticleCard, { article: pinnedItems[0], featured: true }) }), pinnedItems.length > 1 && (_jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: pinnedItems.slice(1).map((a, i) => (_jsx("div", { "data-reveal": "scale", style: { transitionDelay: `${i * 60}ms` }, children: _jsx(ArticleCard, { article: a }) }, a.id))) }))] })] })), normalItems.length > 0 && (_jsxs("section", { children: [_jsxs("div", { className: "mb-4 flex items-center gap-3", children: [_jsx("span", { className: "text-[12px] text-muted-foreground", children: pinnedItems.length ? '其余内容' : '全部内容' }), _jsx("span", { className: "hairline flex-1" }), _jsxs("span", { className: "mono text-[11px] text-muted-foreground", children: [normalItems.length, " \u6761"] })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: normalItems.map((a, i) => (_jsx("div", { "data-reveal": "scale", style: { transitionDelay: `${(i % 4) * 55}ms` }, children: _jsx(ArticleCard, { article: a }) }, a.id))) })] })), _jsx(Pagination, { page: page, pageSize: PAGE_SIZE, total: total, onChange: (p) => {
                                                    update({ page: p === 1 ? null : p });
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                } })] })) })] }), _jsxs("aside", { className: "flex min-w-0 flex-col gap-5 lg:sticky lg:top-24 lg:self-start", children: [_jsxs(Glass, { tone: "soft", className: "p-5", "data-reveal": "right", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(TagIcon, { className: "h-4 w-4 text-accent" }), _jsx("h3", { className: "text-[14px] font-semibold", children: "\u6807\u7B7E\u4E91" }), tag && (_jsx(Link, { to: "/news", className: "ml-auto text-[11px] text-primary transition hover:underline", children: "\u6E05\u9664" }))] }), _jsx("div", { className: "mt-4 flex flex-wrap gap-2", children: tagLoading ? (Array.from({ length: 8 }).map((_, i) => _jsx(Skeleton, { className: "h-6 w-16 rounded-full" }, i))) : tagCloud.length ? (tagCloud.map((t) => {
                                                const active = t.name === tag;
                                                return (_jsxs("button", { onClick: () => update({ tag: active ? null : t.name, page: null }), className: cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] transition-all duration-300', active
                                                        ? 'border-accent/45 bg-accent/14 text-accent'
                                                        : 'border-white/11 bg-white/[0.045] text-muted-foreground hover:border-white/25 hover:text-foreground'), children: [_jsx(Hash, { className: "h-2.5 w-2.5" }), t.name, _jsx("span", { className: "mono text-[10px] opacity-70", children: t.count })] }, t.name));
                                            })) : (_jsx("p", { className: "text-[12px] text-muted-foreground", children: "\u6682\u65E0\u6807\u7B7E" })) })] }), _jsxs(Glass, { tone: "soft", className: "p-5", "data-reveal": "right", children: [_jsx("h3", { className: "text-[14px] font-semibold", children: "\u5206\u7C7B\u5BFC\u822A" }), _jsx("div", { className: "mt-4 flex flex-col gap-1", children: Object.entries(NEWS_CATEGORIES).map(([key, label]) => {
                                                const active = category === key;
                                                return (_jsxs("button", { onClick: () => update({ category: active ? null : key, page: null }), className: cn('flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-all duration-300', active ? 'bg-white/[0.075] text-foreground' : 'text-muted-foreground hover:bg-white/[0.045]'), children: [_jsx("span", { className: cn('h-1.5 w-1.5 shrink-0 rounded-full', CAT_DOT[key] ?? 'bg-white/30') }), _jsx("span", { className: "text-[13px]", children: label }), _jsx("span", { className: "mono ml-auto text-[11px] opacity-70", children: counts[key] ?? 0 })] }, key));
                                            }) })] }), _jsxs(Glass, { tone: "soft", className: "p-5", "data-reveal": "right", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(Flame, { className: "h-4 w-4 text-[hsl(var(--warning))]" }), _jsx("h3", { className: "text-[14px] font-semibold", children: "\u6D4F\u89C8\u63D0\u793A" })] }), _jsxs("ul", { className: "mt-4 flex flex-col gap-2.5 text-[12px] leading-relaxed text-muted-foreground", children: [_jsxs("li", { className: "flex items-start gap-2.5", children: [_jsx("span", { className: "mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" }), "\u7F6E\u9876\u5185\u5BB9\u59CB\u7EC8\u6392\u5728\u5217\u8868\u6700\u524D\uFF0C\u4E0E\u6392\u5E8F\u65B9\u5F0F\u65E0\u5173\u3002"] }), _jsxs("li", { className: "flex items-start gap-2.5", children: [_jsx("span", { className: "mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" }), "\u300C\u6700\u591A\u6D4F\u89C8\u300D\u6309\u9605\u8BFB\u91CF\u6392\u5E8F\uFF0C\u9002\u5408\u56DE\u770B\u70ED\u95E8\u901A\u77E5\u3002"] }), _jsxs("li", { className: "flex items-start gap-2.5", children: [_jsx("span", { className: "mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" }), "\u641C\u7D22\u540C\u65F6\u5339\u914D\u6807\u9898\u3001\u6458\u8981\u4E0E\u6B63\u6587\u3002"] })] }), _jsxs(LinkButton, { to: "/search", variant: "glass", size: "sm", className: "mt-5 w-full", children: ["\u5168\u7AD9\u641C\u7D22", _jsx(ArrowRight, { className: "h-3.5 w-3.5" })] })] })] })] }) })] }));
}
/* =============================================================================
 * 骨架屏
 * ========================================================================== */
function NewsSkeleton() {
    return (_jsxs("div", { className: "flex flex-col gap-9", children: [_jsxs("div", { children: [_jsx(Skeleton, { className: "mb-4 h-7 w-40 rounded-full" }), _jsx(Skeleton, { className: "h-[320px]" })] }), _jsxs("div", { children: [_jsx(Skeleton, { className: "mb-4 h-7 w-28 rounded-full" }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: Array.from({ length: 6 }).map((_, i) => (_jsx(Skeleton, { className: "h-[196px]" }, i))) })] })] }));
}

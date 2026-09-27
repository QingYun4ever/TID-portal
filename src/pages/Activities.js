import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowUpRight, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Clock, MapPin, Users, } from 'lucide-react';
import { PublicApi } from '@/lib/api';
import { useApi, useDebounced, useRevealScan, useTitle } from '@/lib/hooks';
import { cn, fdate, fdatetime, fnum, fweek } from '@/lib/utils';
import { ActivityCard } from '@/components/cards';
import { Button, Chip, EmptyState, ErrorState, Glass, LinkButton, PageHero, Pagination, SearchInput, Skeleton, Tabs, } from '@/components/ui';
/* =============================================================================
 * 活动列表 / 日历（/activities）
 *  - 列表视图：scope 三态 + 分类筛选 + 搜索 + 分页
 *  - 日历视图：PublicApi.activityCalendar(year, month) 自绘月历（CSS Grid，7 列）
 * ========================================================================== */
const PAGE_SIZE = 9;
const SCOPE_TABS = [
    { value: 'upcoming', label: '即将开始' },
    { value: 'past', label: '往期活动' },
    { value: 'all', label: '全部活动' },
];
const VIEW_TABS = [
    { value: 'list', label: '列表视图' },
    { value: 'calendar', label: '日历视图' },
];
export default function Activities() {
    useTitle('活动报名');
    const [sp] = useSearchParams();
    const [scope, setScope] = useState(() => {
        const s = sp.get('scope');
        return s === 'past' || s === 'all' ? s : 'upcoming';
    });
    const [category, setCategory] = useState(() => sp.get('category') || 'all');
    const [view, setView] = useState(() => (sp.get('view') === 'calendar' ? 'calendar' : 'list'));
    const [page, setPage] = useState(1);
    const [q, setQ] = useState('');
    /* 搜索防抖，避免每个字符都打一次接口 */
    const dq = useDebounced(q, 380);
    const { data, meta, loading, error, reload } = useApi(() => PublicApi.activities({ page, pageSize: PAGE_SIZE, scope, q: dq, category }), [page, scope, category, dq]);
    const items = data?.items ?? [];
    const total = Number(data?.total ?? 0);
    const categories = meta?.categories ?? [];
    /* 筛选条件变化时回到第一页 */
    useEffect(() => {
        setPage(1);
    }, [scope, category, dq]);
    /* 列表数据与视图切换后重新扫描滚动揭示元素（异步挂载的节点也需要被观察） */
    useRevealScan(`${view}|${loading}|${items.length}|${page}|${scope}|${category}|${dq}`);
    const scopeLabel = SCOPE_TABS.find((t) => t.value === scope)?.label ?? '活动';
    return (_jsxs(_Fragment, { children: [_jsx(PageHero, { eyebrow: "Events & Sign-up", title: "\u6D3B\u52A8\u62A5\u540D", description: "\u6280\u672F\u6C99\u9F99\u3001\u521B\u65B0\u5DE5\u4F5C\u574A\u3001\u7ADE\u8D5B\u96C6\u8BAD\u3001\u79D1\u6280\u6587\u5316\u8282\u4E0E\u7ECF\u9A8C\u5206\u4EAB\u4F1A\u3002\u652F\u6301\u5728\u7EBF\u62A5\u540D\u3001\u540D\u989D\u9650\u5236\u4E0E\u622A\u6B62\u5012\u8BA1\u65F6\u63D0\u9192\u3002", breadcrumb: [{ label: '活动报名' }], children: _jsxs("div", { className: "flex flex-wrap items-center gap-2.5", children: [_jsxs(Chip, { tone: "primary", children: [_jsx(CalendarDays, { className: "h-3 w-3" }), scopeLabel] }), _jsxs(Chip, { tone: "default", children: ["\u5F53\u524D\u7B5B\u9009 ", _jsx("span", { className: "mono ml-1 text-foreground", children: fnum(total) }), " \u573A"] }), _jsxs(Chip, { tone: "accent", children: [_jsx(CalendarRange, { className: "h-3 w-3" }), "\u652F\u6301\u65E5\u5386\u89C6\u56FE"] })] }) }), _jsxs("section", { className: "shell pb-24", children: [_jsxs(Glass, { tone: "soft", className: "p-5", "data-reveal": true, children: [_jsxs("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between", children: [_jsx(Tabs, { items: SCOPE_TABS, value: scope, onChange: (v) => setScope(v), size: "sm", className: "w-full lg:w-auto" }), _jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center", children: [_jsx(SearchInput, { value: q, onChange: setQ, placeholder: "\u641C\u7D22\u6D3B\u52A8\u540D\u79F0\u6216\u7B80\u4ECB\u2026", className: "w-full sm:w-72" }), _jsx(Tabs, { items: VIEW_TABS, value: view, onChange: (v) => setView(v), size: "sm", className: "w-full sm:w-auto" })] })] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-2 border-t border-white/8 pt-4", "data-reveal": "blur", children: [_jsx("span", { className: "mr-1 text-[11px] tracking-wide text-muted-foreground", children: "\u6D3B\u52A8\u5206\u7C7B" }), _jsx(CategoryChip, { active: category === 'all', onClick: () => setCategory('all'), children: "\u5168\u90E8" }), categories.map((c) => (_jsxs(CategoryChip, { active: category === c.name, onClick: () => setCategory(c.name), children: [c.name, _jsx("span", { className: "mono ml-1.5 text-[10px] opacity-70", children: c.count })] }, c.name))), !categories.length && !loading && (_jsx("span", { className: "text-[11.5px] text-muted-foreground", children: "\u6682\u65E0\u5206\u7C7B\u6570\u636E" }))] })] }), view === 'list' ? (_jsx("div", { className: "mt-8", children: error ? (_jsx(Glass, { tone: "soft", className: "py-6", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : loading && !items.length ? (_jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: Array.from({ length: 6 }).map((_, i) => (_jsx(Skeleton, { className: "h-64" }, i))) })) : items.length ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: items.map((a, i) => (_jsx("div", { "data-reveal": "scale", style: { transitionDelay: `${(i % 3) * 70}ms` }, children: _jsx(ActivityCard, { activity: a }) }, a.id))) }), _jsx(Pagination, { page: page, pageSize: PAGE_SIZE, total: total, onChange: (p) => {
                                        setPage(p);
                                        window.scrollTo({ top: 320, behavior: 'smooth' });
                                    }, className: "mt-10" })] })) : (_jsx(Glass, { tone: "soft", children: _jsx(EmptyState, { icon: _jsx(CalendarDays, { className: "h-6 w-6" }), title: "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u6D3B\u52A8", description: dq
                                    ? '换个关键词或清空搜索条件再试试。'
                                    : scope === 'upcoming'
                                        ? '近期暂无即将开始的活动，可在「往期活动」中查看历史记录。'
                                        : '当前筛选条件下暂无活动记录。', action: _jsxs("div", { className: "flex flex-wrap justify-center gap-3", children: [(dq || category !== 'all') && (_jsx(Button, { onClick: () => {
                                                setQ('');
                                                setCategory('all');
                                            }, children: "\u6E05\u7A7A\u7B5B\u9009" })), _jsx(LinkButton, { to: "/activities?scope=past", children: "\u67E5\u770B\u5F80\u671F\u6D3B\u52A8" })] }) }) })) })) : (_jsx(CalendarView, {})), _jsxs(Glass, { tone: "soft", className: "mt-12 flex flex-wrap items-center justify-between gap-4 p-6", "data-reveal": "blur", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("span", { className: "flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] text-primary", children: _jsx(CalendarRange, { className: "h-5 w-5" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-[14px] font-medium", children: "\u627E\u4E0D\u5230\u60F3\u53C2\u52A0\u7684\u6D3B\u52A8\uFF1F" }), _jsx("p", { className: "mt-1 text-[12.5px] text-muted-foreground", children: "\u7ADE\u8D5B\u4FE1\u606F\u4E0E\u9879\u76EE\u7533\u62A5\u5165\u53E3\u540C\u6837\u5728\u95E8\u6237\u5F00\u653E\u3002" })] })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx(LinkButton, { to: "/competitions", children: "\u6D4F\u89C8\u7ADE\u8D5B\u4FE1\u606F" }), _jsx(LinkButton, { to: "/projects/apply", variant: "primary", children: "\u9879\u76EE\u5728\u7EBF\u7533\u62A5" })] })] })] })] }));
}
/* =============================================================================
 * 分类筛选徽章
 * ========================================================================== */
function CategoryChip({ active, onClick, children, }) {
    return (_jsx("button", { type: "button", onClick: onClick, "aria-pressed": active, className: cn('rounded-full transition-all duration-300', active ? 'ring-1 ring-primary/45' : 'opacity-80 hover:opacity-100'), children: _jsx(Chip, { tone: active ? 'primary' : 'default', children: children }) }));
}
/* =============================================================================
 * 日历视图
 *  - 上/下月切换；当月每天显示活动小圆点；点击某天列出当天活动
 * ========================================================================== */
function CalendarView() {
    const now = new Date();
    const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
    /* 换月后日历面板重新挂载，需要重新扫描揭示元素 */
    useRevealScan(`calendar|${ym.y}-${ym.m}`);
    const shift = (delta) => {
        setYm((cur) => {
            const d = new Date(cur.y, cur.m - 1 + delta, 1);
            return { y: d.getFullYear(), m: d.getMonth() + 1 };
        });
    };
    return (_jsx("div", { className: "mt-8", children: _jsxs(Glass, { tone: "soft", className: "p-5 sm:p-6", "data-reveal": true, children: [_jsxs("div", { className: "mb-5 flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { size: "icon-sm", variant: "ghost", onClick: () => shift(-1), "aria-label": "\u4E0A\u4E2A\u6708", children: _jsx(ChevronLeft, { className: "h-4 w-4" }) }), _jsxs("span", { className: "mono w-[118px] text-center text-[15px] font-semibold tabular-nums", children: [ym.y, " \u5E74 ", String(ym.m).padStart(2, '0'), " \u6708"] }), _jsx(Button, { size: "icon-sm", variant: "ghost", onClick: () => shift(1), "aria-label": "\u4E0B\u4E2A\u6708", children: _jsx(ChevronRight, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "mono text-[11px] text-muted-foreground", children: "\u5468\u4E00\u4E3A\u4E00\u5468\u8D77\u59CB" }), _jsx(Button, { size: "sm", variant: "glass", onClick: () => {
                                        const d = new Date();
                                        setYm({ y: d.getFullYear(), m: d.getMonth() + 1 });
                                    }, children: "\u56DE\u5230\u672C\u6708" })] })] }), _jsx(CalendarMonth, { year: ym.y, month: ym.m }, `${ym.y}-${ym.m}`)] }) }));
}
const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
function pad2(n) {
    return String(n).padStart(2, '0');
}
function CalendarMonth({ year, month }) {
    const { data, loading, error, reload } = useApi(() => PublicApi.activityCalendar(year, month), [year, month]);
    const events = useMemo(() => (Array.isArray(data) ? data : []), [data]);
    const [selected, setSelected] = useState(null);
    const today = new Date();
    const todayKey = today.getFullYear() === year && today.getMonth() + 1 === month
        ? `${year}-${pad2(month)}-${pad2(today.getDate())}`
        : null;
    const byDay = useMemo(() => {
        const m = {};
        for (const e of events) {
            const k = String(e.startAt ?? '').slice(0, 10);
            if (!k)
                continue;
            (m[k] ||= []).push(e);
        }
        return m;
    }, [events]);
    const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7; // 周一 = 0
    const daysInMonth = new Date(year, month, 0).getDate();
    const slots = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const firstEventKey = events.length ? String(events[0].startAt).slice(0, 10) : null;
    const activeDay = selected ?? todayKey ?? firstEventKey;
    const dayEvents = activeDay ? byDay[activeDay] ?? [] : [];
    if (error)
        return (_jsx(Glass, { tone: "thin", className: "py-4", children: _jsx(ErrorState, { message: error, onRetry: reload }) }));
    if (loading && !events.length)
        return (_jsxs(_Fragment, { children: [_jsx("div", { className: "mb-3 grid grid-cols-7 gap-1.5", children: WEEK_LABELS.map((w) => (_jsx(Skeleton, { className: "h-7 rounded-xl" }, w))) }), _jsx("div", { className: "grid grid-cols-7 gap-1.5", children: Array.from({ length: 35 }).map((_, i) => (_jsx(Skeleton, { className: "h-[74px] rounded-2xl sm:h-[92px]" }, i))) })] }));
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "grid grid-cols-7 gap-1.5", children: WEEK_LABELS.map((w, i) => (_jsxs("div", { className: cn('py-1.5 text-center text-[11px] tracking-wide', i >= 5 ? 'text-muted-foreground/70' : 'text-muted-foreground'), children: ["\u5468", w] }, w))) }), _jsx("div", { className: "mt-1.5 grid grid-cols-7 gap-1.5", children: Array.from({ length: slots }).map((_, idx) => {
                    const day = idx - firstWeekday + 1;
                    if (day < 1 || day > daysInMonth) {
                        return (_jsx("div", { className: "min-h-[74px] rounded-2xl border border-white/4 bg-white/[0.012] sm:min-h-[92px]", "aria-hidden": true }, `empty-${idx}`));
                    }
                    const key = `${year}-${pad2(month)}-${pad2(day)}`;
                    const list = byDay[key] ?? [];
                    const isToday = key === todayKey;
                    const isActive = key === activeDay;
                    const allPast = list.length > 0 && list.every((a) => new Date(String(a.startAt).replace(' ', 'T')) < today);
                    return (_jsxs("button", { type: "button", onClick: () => setSelected(key), "aria-pressed": isActive, className: cn('group relative flex min-h-[74px] flex-col items-start gap-1.5 rounded-2xl border p-2 text-left transition-all duration-300 sm:min-h-[92px] sm:p-2.5', isActive
                            ? 'border-primary/50 bg-primary/12 shadow-[0_0_22px_-12px_hsl(var(--primary)/.85)]'
                            : 'border-white/8 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]'), children: [_jsx("span", { className: cn('mono text-[11.5px] tabular-nums', isToday
                                    ? 'rounded-full bg-primary px-1.5 text-[hsl(var(--primary-foreground))]'
                                    : isActive
                                        ? 'text-primary'
                                        : 'text-muted-foreground'), children: day }), list.length > 0 && (_jsxs("span", { className: "flex flex-wrap items-center gap-1", children: [list.slice(0, 4).map((a) => (_jsx("span", { className: cn('h-1.5 w-1.5 rounded-full', allPast ? 'bg-[hsl(var(--success))]' : 'bg-primary') }, a.id))), list.length > 4 && _jsxs("span", { className: "mono text-[9px] text-muted-foreground", children: ["+", list.length - 4] })] })), list[0] && (_jsx("span", { className: "clamp-1 hidden w-full text-[10.5px] leading-tight text-foreground/70 sm:block", children: list[0].title })), list.length > 1 && (_jsx("span", { className: "mono absolute right-1.5 top-1.5 text-[9.5px] text-primary/85", children: list.length }))] }, key));
                }) }), _jsxs("div", { className: "mt-6 border-t border-white/8 pt-5", children: [_jsxs("div", { className: "mb-3 flex flex-wrap items-center justify-between gap-2", children: [_jsxs("h3", { className: "flex items-center gap-2.5 text-[15px] font-semibold", children: [_jsx(CalendarDays, { className: "h-4 w-4 text-primary" }), activeDay ? `${activeDay} ${fweek(activeDay)}` : '选择日期查看当天活动'] }), _jsxs("span", { className: "mono text-[11px] text-muted-foreground", children: ["\u672C\u6708\u5171 ", _jsx("span", { className: "text-primary", children: events.length }), " \u573A\u6D3B\u52A8"] })] }), dayEvents.length ? (_jsx("div", { className: "flex flex-col gap-1", children: dayEvents.map((a) => (_jsxs(Link, { to: `/activities/${a.slug}`, className: "group flex items-start gap-4 rounded-2xl px-3 py-3 transition-colors duration-300 hover:bg-white/[0.045]", children: [_jsx("span", { className: "mono mt-0.5 w-11 shrink-0 text-[12px] tabular-nums text-primary", children: fdatetime(a.startAt).slice(11, 16) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "clamp-1 text-[13.5px] font-medium leading-snug transition-colors group-hover:text-primary", children: a.title }), _jsxs("div", { className: "mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-muted-foreground", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(MapPin, { className: "h-3 w-3 shrink-0" }), _jsx("span", { className: "clamp-1", children: a.location || '地点待定' })] }), _jsxs("span", { className: "mono flex items-center gap-1.5", children: [_jsx(Users, { className: "h-3 w-3" }), a.signedCount ?? 0, a.capacity ? ` / ${a.capacity}` : ' / 不限'] }), _jsx(Chip, { className: "!px-2 !py-0 !text-[10px]", children: a.category })] })] }), _jsx(ArrowUpRight, { className: "mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-80" })] }, a.id))) })) : (_jsxs("div", { className: "flex flex-col items-center justify-center gap-2 py-10 text-center", children: [_jsx(Clock, { className: "h-5 w-5 text-muted-foreground/70" }), _jsx("p", { className: "text-[13px] text-muted-foreground", children: activeDay ? `${activeDay} 暂无活动安排` : '点击日历中的任意一天查看当天活动' }), firstEventKey && (_jsxs("button", { type: "button", onClick: () => setSelected(firstEventKey), className: "text-[12px] text-primary transition hover:underline", children: ["\u8DF3\u5230\u672C\u6708\u9996\u4E2A\u6D3B\u52A8\u65E5\uFF08", fdate(firstEventKey), "\uFF09"] }))] }))] })] }));
}

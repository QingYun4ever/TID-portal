import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* 适配层：必须最先导入（在 ResourceManager 渲染前完成 Api 包装） */
import './adminResourceAdapter';
import { useMemo, useState } from 'react';
import { CalendarRange, History, Info, Milestone, RefreshCw } from 'lucide-react';
import { AdminApi } from '@/lib/api';
import { useApi, useRevealScan, useTitle } from '@/lib/hooks';
import { plain } from '@/lib/utils';
import { Button, Chip, EmptyState, ErrorState, Glass, Skeleton } from '@/components/ui';
import { ResourceManager } from '@/components/AdminKit';
import { TimelineItem } from '@/components/cards';
const FIELDS = [
    {
        name: 'year',
        label: '年份',
        type: 'text',
        required: true,
        placeholder: '例如：2015 或 2026 春',
        hint: '显示在时间线左侧，可写「2026 春」这样的表述',
    },
    { name: 'title', label: '事件标题', type: 'text', required: true, wide: true, placeholder: '例如：科技创新部正式成立' },
    {
        name: 'description',
        label: '事件描述',
        type: 'textarea',
        wide: true,
        rows: 4,
        placeholder: '例如：在校团委指导下成立科技创新部，统筹全校学生科技创新工作。',
        hint: '建议 40~100 字，说明这件事对部门发展的意义',
    },
    { name: 'sortOrder', label: '排序权重', type: 'number', default: 0, hint: '数字越小越靠前（时间线从上到下）' },
];
const COLUMNS = [
    {
        key: 'year',
        title: '年份',
        width: '110px',
        render: (t) => _jsx("span", { className: "mono text-[12.5px] font-semibold text-primary", children: t.year }),
    },
    {
        key: 'title',
        title: '事件标题',
        width: '280px',
        render: (t) => _jsx("span", { className: "text-[13px] font-medium text-foreground/90", children: t.title }),
    },
    {
        key: 'description',
        title: '事件描述',
        width: '380px',
        render: (t) => _jsx("span", { className: "clamp-2 text-xs text-muted-foreground", children: plain(t.description, 80) || '—' }),
    },
    {
        key: 'sortOrder',
        title: '排序',
        width: '80px',
        render: (t) => _jsx("span", { className: "mono text-xs text-muted-foreground", children: t.sortOrder ?? 0 }),
    },
];
export default function About() {
    useTitle('部门概况页');
    const [nonce, setNonce] = useState(0);
    const { data, loading, error, reload } = useApi(() => AdminApi.resource('timeline').list({ page: 1, pageSize: 100 }), [nonce]);
    const nodes = useMemo(() => [...(data ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id), [data]);
    const span = nodes.length ? `${nodes[0].year} — ${nodes[nodes.length - 1].year}` : '—';
    /* 本页为懒加载路由，时间线预览在数据到达后渲染（含 TimelineItem 的滚动揭示） */
    useRevealScan(`${loading ? 'loading' : 'idle'}-${nodes.length}`);
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx("div", { "data-reveal": true, children: _jsxs(Glass, { tone: "soft", className: "p-5 sm:p-6", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary", children: _jsx(History, { className: "h-4 w-4" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium", children: "\u65F6\u95F4\u7EBF\u9884\u89C8" }), _jsx("p", { className: "mt-1 max-w-2xl text-[11.5px] leading-relaxed text-muted-foreground", children: "\u95E8\u6237\u300C\u90E8\u95E8\u6982\u51B5\u300D\u9875\u4F1A\u6309\u300C\u6392\u5E8F\u6743\u91CD\u300D\u5347\u5E8F\u6E32\u67D3\u4E0B\u5217\u8282\u70B9\uFF1B\u53EF\u5728\u6B64\u76F4\u89C2\u6838\u5BF9\u5E74\u4EFD\u3001\u6807\u9898\u4E0E\u63CF\u8FF0\u7684\u5448\u73B0\u6548\u679C\u3002" })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2.5", children: [_jsxs(Chip, { tone: "primary", children: [_jsx(CalendarRange, { className: "h-3 w-3" }), span] }), _jsxs(Button, { variant: "glass", size: "sm", onClick: () => setNonce((n) => n + 1), disabled: loading, children: [_jsx(RefreshCw, { className: loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5' }), "\u5237\u65B0\u9884\u89C8"] })] })] }), _jsx("div", { className: "mt-6 border-t border-white/8 pt-6", children: error ? (_jsx(ErrorState, { message: error, onRetry: reload })) : loading && !data ? (_jsx("div", { className: "flex flex-col gap-4", children: Array.from({ length: 4 }).map((_, i) => (_jsx(Skeleton, { className: "h-16" }, i))) })) : nodes.length ? (_jsx("div", { className: "max-w-3xl", children: nodes.map((n, i) => (_jsx(TimelineItem, { node: n, index: i, total: nodes.length }, n.id))) })) : (_jsx(EmptyState, { icon: _jsx(Milestone, { className: "h-5 w-5" }), title: "\u6682\u65E0\u53D1\u5C55\u5386\u7A0B", description: "\u5728\u4E0B\u65B9\u300C\u53D1\u5C55\u5386\u7A0B\u300D\u4E2D\u65B0\u589E\u7B2C\u4E00\u6761\u8282\u70B9\uFF0C\u9884\u89C8\u533A\u4F1A\u7ACB\u5373\u51FA\u73B0\u3002" })) })] }) }), _jsxs("div", { className: "flex items-start gap-2.5 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground", children: [_jsx(Info, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" }), "\u65F6\u95F4\u7EBF\u4EC5\u7528\u4E8E\u300C\u90E8\u95E8\u6982\u51B5\u300D\u9875\uFF1B\u5982\u9700\u4FEE\u6539\u8BE5\u9875\u6B63\u6587\u4E0E\u8054\u7CFB\u65B9\u5F0F\uFF0C\u8BF7\u524D\u5F80\u300C\u7AD9\u70B9\u8BBE\u7F6E \u2192 \u9875\u9762\u5185\u5BB9\u300D\u3002"] }), _jsx(ResourceManager, { title: "\u53D1\u5C55\u5386\u7A0B", description: "\u7EF4\u62A4\u90E8\u95E8\u5927\u4E8B\u8BB0\uFF1A\u5E74\u4EFD\u3001\u4E8B\u4EF6\u6807\u9898\u4E0E\u63CF\u8FF0\uFF0C\u6309\u6392\u5E8F\u6743\u91CD\u4ECE\u4E0A\u5230\u4E0B\u6E32\u67D3\u5728\u90E8\u95E8\u6982\u51B5\u9875\u3002", resource: "timeline", fields: FIELDS, columns: COLUMNS, pageSize: 12, searchPlaceholder: "\u641C\u7D22\u4E8B\u4EF6\u6807\u9898\u2026", emptyText: "\u6682\u65E0\u53D1\u5C55\u5386\u7A0B", createLabel: "\u65B0\u589E\u8282\u70B9", onChanged: () => setNonce((n) => n + 1) })] }));
}

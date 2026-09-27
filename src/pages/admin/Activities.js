import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* 适配层：必须最先导入（在 ResourceManager 渲染前完成 Api 包装） */
import './adminResourceAdapter';
import { useMemo } from 'react';
import { BarChart3, Calendar, MapPin, Ticket } from 'lucide-react';
import { AdminApi } from '@/lib/api';
import { useApi, useReveal, useTitle } from '@/lib/hooks';
import { fdate, fdatetime, truncate } from '@/lib/utils';
import { Chip, Glass, ProgressBar, Skeleton } from '@/components/ui';
import { BarList, ExportButton, ResourceManager, StatusChip, } from '@/components/AdminKit';
/** 活动分类沿用数据库中的中文取值，便于与既有数据保持一致 */
const ACTIVITY_CATEGORIES = [
    '讲座',
    '技术沙龙',
    '工作坊',
    '宣讲会',
    '分享会',
    '文化节',
    '竞赛集训',
];
const CAT_TONE = {
    讲座: 'primary',
    技术沙龙: 'accent',
    工作坊: 'success',
    宣讲会: 'warning',
    分享会: 'primary',
    文化节: 'accent',
    竞赛集训: 'danger',
};
const FIELDS = [
    {
        name: 'title',
        label: '活动名称',
        type: 'text',
        required: true,
        wide: true,
        placeholder: '例如：AI Agent 时代的技术栈选择 —— 技术沙龙第 12 期',
    },
    {
        name: 'category',
        label: '活动分类',
        type: 'select',
        default: '讲座',
        options: ACTIVITY_CATEGORIES.map((v) => ({ value: v, label: v })),
    },
    {
        name: 'status',
        label: '状态',
        type: 'select',
        default: 'draft',
        options: [
            { value: 'published', label: '已发布' },
            { value: 'draft', label: '草稿' },
            { value: 'ended', label: '已结束' },
        ],
    },
    {
        name: 'location',
        label: '活动地点',
        type: 'text',
        required: true,
        placeholder: '例如：大学生活动中心 301 报告厅',
    },
    {
        name: 'capacity',
        label: '名额上限',
        type: 'number',
        default: 0,
        hint: '0 表示不限名额',
    },
    {
        name: 'startAt',
        label: '开始时间',
        type: 'datetime',
        required: true,
    },
    {
        name: 'endAt',
        label: '结束时间',
        type: 'datetime',
    },
    {
        name: 'signupStart',
        label: '报名开始',
        type: 'datetime',
        hint: '留空表示不限制报名开始时间',
    },
    {
        name: 'signupEnd',
        label: '报名截止',
        type: 'datetime',
    },
    {
        name: 'cover',
        label: '封面图',
        type: 'image',
        wide: true,
        hint: '建议 16:9，用于门户活动卡片',
    },
    {
        name: 'summary',
        label: '活动简介',
        type: 'textarea',
        wide: true,
        rows: 3,
        hint: '用于列表卡片，建议 60~120 字',
        placeholder: '一句话说明活动主题、面向对象与能获得什么。',
    },
    {
        name: 'content',
        label: '活动详情',
        type: 'richtext',
        wide: true,
        placeholder: '议程、嘉宾介绍、注意事项…',
    },
];
export default function Activities() {
    useTitle('活动管理');
    const reveal = useReveal();
    /* 报名统计：/admin/signups 的附加字段 activities 带 signedCount（活动列表接口本身没有） */
    const { meta: signupMeta, loading: statsLoading } = useApi(() => AdminApi.signups({ page: 1, pageSize: 1 }), []);
    const stats = useMemo(() => (Array.isArray(signupMeta?.activities) ? signupMeta.activities : []), [signupMeta]);
    const signedById = useMemo(() => new Map(stats.map((a) => [a.id, Number(a.signedCount) || 0])), [stats]);
    const columns = useMemo(() => [
        {
            key: 'title',
            title: '活动名称',
            width: '26%',
            render: (r) => (_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "clamp-1 max-w-[300px] text-[13px] font-medium", title: r.title, children: r.title }), _jsxs("p", { className: "mono mt-0.5 truncate text-[10.5px] text-muted-foreground/70", children: ["/", r.slug] })] })),
        },
        {
            key: 'category',
            title: '分类',
            width: '104px',
            render: (r) => (_jsx(Chip, { tone: CAT_TONE[r.category] ?? 'default', className: "!px-2.5 !py-0.5", children: r.category || '未分类' })),
        },
        {
            key: 'startAt',
            title: '活动时间',
            width: '150px',
            render: (r) => (_jsxs("span", { className: "mono flex items-center gap-1.5 text-xs text-foreground/80", children: [_jsx(Calendar, { className: "h-3.5 w-3.5 opacity-60" }), fdatetime(r.startAt)] })),
        },
        {
            key: 'location',
            title: '地点',
            width: '150px',
            render: (r) => (_jsxs("span", { className: "clamp-1 flex max-w-[150px] items-center gap-1.5 text-xs text-muted-foreground", children: [_jsx(MapPin, { className: "h-3.5 w-3.5 shrink-0 opacity-60" }), r.location || '—'] })),
        },
        {
            key: 'signup',
            title: '报名情况',
            width: '168px',
            render: (r) => {
                const cap = Number(r.capacity) || 0;
                const signed = signedById.get(r.id);
                return (_jsxs("div", { className: "w-[150px]", children: [_jsxs("div", { className: "flex items-baseline justify-between gap-2 text-[11px]", children: [_jsxs("span", { className: "mono flex items-center gap-1 text-foreground/85", children: [_jsx(Ticket, { className: "h-3 w-3 opacity-60" }), signed === undefined ? '—' : signed, _jsxs("span", { className: "text-muted-foreground", children: ["/ ", cap || '不限'] })] }), cap > 0 && signed !== undefined && (_jsxs("span", { className: "mono text-muted-foreground", children: [Math.round((signed / cap) * 100), "%"] }))] }), _jsx(ProgressBar, { className: "mt-1.5", height: 4, value: signed ?? 0, max: cap || Math.max(signed ?? 1, 1), tone: cap > 0 && (signed ?? 0) >= cap ? 'danger' : 'primary' }), _jsxs("p", { className: "mono mt-1 text-[10.5px] text-muted-foreground/80", children: ["\u62A5\u540D\u622A\u6B62 ", fdate(r.signupEnd)] })] }));
            },
        },
    ], [signedById]);
    const barItems = stats.map((a) => ({ name: truncate(a.title, 22), value: Number(a.signedCount) || 0 }));
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx("div", { ref: reveal, "data-reveal": true, children: _jsxs(Glass, { tone: "soft", className: "p-5", children: [_jsxs("div", { className: "mb-4 flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex items-start gap-2.5", children: [_jsx(BarChart3, { className: "mt-0.5 h-4 w-4 text-primary" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium", children: "\u5404\u6D3B\u52A8\u62A5\u540D\u6570" }), _jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: "\u53D6\u81EA\u62A5\u540D\u540D\u5355\u5B9E\u65F6\u7EDF\u8BA1\uFF0C\u7528\u4E8E\u5FEB\u901F\u5224\u65AD\u6D3B\u52A8\u70ED\u5EA6\u4E0E\u540D\u989D\u4F59\u91CF" })] })] }), _jsxs("span", { className: "mono shrink-0 text-[11px] text-muted-foreground", children: ["\u5171 ", stats.reduce((s, a) => s + (Number(a.signedCount) || 0), 0), " \u4EBA\u6B21"] })] }), statsLoading ? (_jsx("div", { className: "flex flex-col gap-3", children: Array.from({ length: 4 }).map((_, i) => (_jsx(Skeleton, { className: "h-6" }, i))) })) : barItems.length ? (_jsx(BarList, { items: barItems })) : (_jsx("p", { className: "text-xs text-muted-foreground", children: "\u6682\u65E0\u62A5\u540D\u6570\u636E\u3002" }))] }) }), _jsx(ResourceManager, { title: "\u6D3B\u52A8\u7BA1\u7406", description: "\u53D1\u5E03\u8BB2\u5EA7\u3001\u6C99\u9F99\u3001\u5DE5\u4F5C\u574A\u7B49\u7EBF\u4E0B\u6D3B\u52A8\uFF1B\u7EF4\u62A4\u6D3B\u52A8\u65F6\u95F4\u3001\u5730\u70B9\u3001\u540D\u989D\u4E0E\u62A5\u540D\u7A97\u53E3\uFF0C\u5E76\u5BFC\u51FA\u62A5\u540D\u540D\u5355\u3002", resource: "activities", fields: FIELDS, columns: columns, pageSize: 10, searchPlaceholder: "\u641C\u7D22\u6D3B\u52A8\u540D\u79F0\u6216\u5730\u70B9\u2026", emptyText: "\u6682\u65E0\u6D3B\u52A8", createLabel: "\u65B0\u5EFA\u6D3B\u52A8", catalog: (r) => _jsx(StatusChip, { status: r.status, labels: { ended: '已结束' } }), filters: ({ filters, setFilter }) => [
                    {
                        name: 'status',
                        label: '状态',
                        value: filters.status ?? '',
                        options: [
                            { value: '', label: '全部状态' },
                            { value: 'published', label: '已发布' },
                            { value: 'draft', label: '草稿' },
                            { value: 'ended', label: '已结束' },
                        ],
                        onChange: (v) => setFilter('status', v),
                    },
                    {
                        name: 'category',
                        label: '分类',
                        value: filters.category ?? '',
                        options: [
                            { value: '', label: '全部分类' },
                            ...ACTIVITY_CATEGORIES.map((v) => ({ value: v, label: v })),
                        ],
                        onChange: (v) => setFilter('category', v),
                    },
                ], headerActions: _jsx(ExportButton, { kind: "signups", label: "\u5BFC\u51FA\u62A5\u540D\u540D\u5355" }) })] }));
}

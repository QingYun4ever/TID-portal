import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* 适配层：必须最先导入（在 ResourceManager 渲染前完成 Api 包装） */
import './adminResourceAdapter';
import { Check, Clock, Eye, ExternalLink, FileText, Pin } from 'lucide-react';
import { AdminApi } from '@/lib/api';
import { useApi, useReveal, useTitle } from '@/lib/hooks';
import { NEWS_CATEGORIES, fdate, fnum, plain } from '@/lib/utils';
import { Chip, LinkButton } from '@/components/ui';
import { ResourceManager, StatTile, StatusChip, } from '@/components/AdminKit';
/** 分类色调：通知=琥珀 / 部门新闻=青蓝 / 竞赛=极光紫 / 政策=翠绿 */
const CAT_TONE = {
    notice: 'warning',
    dept: 'primary',
    competition: 'accent',
    policy: 'success',
};
const STATUS_OPTIONS = [
    { value: '', label: '全部状态' },
    { value: 'published', label: '已发布' },
    { value: 'draft', label: '草稿' },
    { value: 'pending', label: '待审核' },
    { value: 'rejected', label: '已驳回' },
];
const CATEGORY_OPTIONS = [
    { value: '', label: '全部分类' },
    ...Object.entries(NEWS_CATEGORIES).map(([value, label]) => ({ value, label })),
];
const FIELDS = [
    {
        name: 'title',
        label: '标题',
        type: 'text',
        required: true,
        wide: true,
        placeholder: '例如：关于开展 2026 年度大学生创新创业训练计划项目立项申报的通知',
    },
    {
        name: 'category',
        label: '分类',
        type: 'select',
        required: true,
        default: 'notice',
        options: Object.entries(NEWS_CATEGORIES).map(([value, label]) => ({ value, label })),
    },
    {
        name: 'pinned',
        label: '置顶',
        type: 'switch',
        hint: '置顶后优先展示在门户列表与首页',
    },
    {
        name: 'summary',
        label: '摘要',
        type: 'textarea',
        required: true,
        wide: true,
        rows: 3,
        hint: '用于列表摘要，建议 60~120 字',
        placeholder: '一句话说明这条通知的核心信息：面向谁、做什么、截止时间。',
    },
    {
        name: 'cover',
        label: '封面图',
        type: 'image',
        wide: true,
        hint: '建议 16:9，≥ 1200×675',
    },
    {
        name: 'content',
        label: '正文',
        type: 'richtext',
        required: true,
        wide: true,
        placeholder: '支持标题、列表、引用、链接与图片…',
    },
    {
        name: 'tags',
        label: '标签',
        type: 'tags',
        wide: true,
        hint: '回车添加，用于筛选与相关推荐',
    },
    {
        name: 'status',
        label: '状态',
        type: 'select',
        default: 'draft',
        options: [
            { value: 'published', label: '已发布' },
            { value: 'draft', label: '草稿' },
            { value: 'pending', label: '待审核' },
            { value: 'rejected', label: '已驳回' },
        ],
        hint: '待审核的文章需审核通过后才会在门户展示',
    },
    {
        name: 'publishedAt',
        label: '发布时间',
        type: 'datetime',
        hint: '留空则按创建时间排序',
    },
    {
        name: 'slug',
        label: 'Slug（地址标识）',
        type: 'text',
        placeholder: '留空则自动生成',
    },
];
const COLUMNS = [
    {
        key: 'title',
        title: '标题',
        width: '30%',
        render: (r) => (_jsxs("div", { className: "flex items-start gap-2", children: [r.pinned && (_jsx("span", { className: "mt-0.5 shrink-0 text-[hsl(var(--warning))]", title: "\u5DF2\u7F6E\u9876", children: _jsx(Pin, { className: "h-3.5 w-3.5" }) })), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "clamp-1 max-w-[380px] text-[13px] font-medium", title: r.title, children: r.title }), _jsxs("p", { className: "mono mt-0.5 truncate text-[10.5px] text-muted-foreground/70", children: ["/", r.slug] })] })] })),
    },
    {
        key: 'category',
        title: '分类',
        width: '104px',
        render: (r) => (_jsx(Chip, { tone: CAT_TONE[r.category] ?? 'default', className: "!px-2.5 !py-0.5", children: NEWS_CATEGORIES[r.category] ?? r.category })),
    },
    {
        key: 'summary',
        title: '摘要',
        width: '24%',
        render: (r) => (_jsx("span", { className: "clamp-1 block max-w-[280px] text-xs leading-relaxed text-muted-foreground", children: plain(r.summary || r.content, 80) || '—' })),
    },
    {
        key: 'views',
        title: '浏览量',
        width: '96px',
        render: (r) => (_jsxs("span", { className: "mono flex items-center gap-1.5 text-xs text-muted-foreground", children: [_jsx(Eye, { className: "h-3.5 w-3.5 opacity-70" }), fnum(r.views)] })),
    },
    {
        key: 'publishedAt',
        title: '发布时间',
        width: '116px',
        render: (r) => (_jsx("span", { className: "mono text-xs text-foreground/80", children: fdate(r.publishedAt ?? r.createdAt) })),
    },
];
export default function Articles() {
    useTitle('新闻与通知');
    const reveal = useReveal();
    const { data: stats, loading: statsLoading } = useApi(() => AdminApi.stats(), []);
    const tiles = [
        {
            label: '文章总数',
            value: stats?.articles,
            hint: '全部新闻与通知',
            tone: 'primary',
            icon: _jsx(FileText, { className: "h-4 w-4" }),
        },
        {
            label: '已发布',
            value: stats?.publishedArticles,
            hint: '门户已可见',
            tone: 'success',
            icon: _jsx(Check, { className: "h-4 w-4" }),
        },
        {
            label: '待审核',
            value: stats?.pendingArticles,
            hint: '等待处理',
            tone: 'warning',
            icon: _jsx(Clock, { className: "h-4 w-4" }),
        },
        {
            label: '累计浏览',
            value: stats?.totalViews,
            hint: '文章 + 项目',
            tone: 'accent',
            icon: _jsx(Eye, { className: "h-4 w-4" }),
        },
    ];
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx("div", { ref: reveal, "data-reveal": true, className: "grid grid-cols-2 gap-3 lg:grid-cols-4", children: tiles.map((t) => (_jsx(StatTile, { label: t.label, value: statsLoading ? '—' : fnum(t.value ?? 0), hint: t.hint, tone: t.tone, icon: t.icon }, t.label))) }), _jsx(ResourceManager, { title: "\u65B0\u95FB\u4E0E\u901A\u77E5", description: "\u53D1\u5E03\u901A\u77E5\u516C\u544A\u3001\u90E8\u95E8\u65B0\u95FB\u3001\u7ADE\u8D5B\u4FE1\u606F\u4E0E\u653F\u7B56\u6587\u4EF6\uFF1B\u652F\u6301\u7F6E\u9876\u3001\u5BA1\u6838\u72B6\u6001\u6D41\u8F6C\u4E0E\u6807\u7B7E\u68C0\u7D22\u3002", resource: "articles", fields: FIELDS, columns: COLUMNS, pageSize: 10, searchPlaceholder: "\u641C\u7D22\u6807\u9898\u6216\u6458\u8981\u2026", emptyText: "\u6682\u65E0\u6587\u7AE0", createLabel: "\u65B0\u5EFA\u6587\u7AE0", catalog: (r) => _jsx(StatusChip, { status: r.status, labels: { rejected: '已驳回' } }), filters: ({ filters, setFilter }) => [
                    {
                        name: 'status',
                        label: '状态',
                        value: filters.status ?? '',
                        options: STATUS_OPTIONS,
                        onChange: (v) => setFilter('status', v),
                    },
                    {
                        name: 'category',
                        label: '分类',
                        value: filters.category ?? '',
                        options: CATEGORY_OPTIONS,
                        onChange: (v) => setFilter('category', v),
                    },
                ], headerActions: _jsxs(LinkButton, { to: "/news", variant: "glass", children: [_jsx(ExternalLink, { className: "h-3.5 w-3.5" }), "\u524D\u5F80\u95E8\u6237\u67E5\u770B"] }) })] }));
}

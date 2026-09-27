import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* 适配层：必须最先导入（在 ResourceManager 渲染前完成 Api 包装） */
import './adminResourceAdapter';
import { Award, Eye, Layers, Users } from 'lucide-react';
import { AdminApi } from '@/lib/api';
import { useApi, useReveal, useTitle } from '@/lib/hooks';
import { PROJECT_CATEGORIES, fnum, plain } from '@/lib/utils';
import { Chip } from '@/components/ui';
import { ResourceManager, StatTile, StatusChip, } from '@/components/AdminKit';
const CAT_TONE = {
    excellent: 'accent',
    approved: 'primary',
    completed: 'success',
    ongoing: 'warning',
};
/** 年份筛选：门户数据集中在近四年 */
const YEARS = [2023, 2024, 2025, 2026];
const FIELDS = [
    {
        name: 'title',
        label: '项目名称',
        type: 'text',
        required: true,
        wide: true,
        placeholder: '例如：面向校园场景的实验室数字化管理平台',
    },
    {
        name: 'category',
        label: '项目类别',
        type: 'select',
        required: true,
        default: 'approved',
        options: Object.entries(PROJECT_CATEGORIES).map(([value, label]) => ({ value, label })),
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
    },
    {
        name: 'year',
        label: '年份',
        type: 'number',
        required: true,
        default: new Date().getFullYear(),
    },
    {
        name: 'team',
        label: '团队名称',
        type: 'text',
        placeholder: '例如：实验室数字化小组',
    },
    {
        name: 'advisor',
        label: '指导教师',
        type: 'text',
        placeholder: '例如：张伟 教授',
    },
    {
        name: 'awards',
        label: '获奖信息',
        type: 'text',
        placeholder: '例如：2025 年全国大学生创新创业大赛省级一等奖',
    },
    {
        name: 'cover',
        label: '封面图',
        type: 'image',
        wide: true,
        hint: '建议 16:9，用于门户项目卡片',
    },
    {
        name: 'summary',
        label: '项目简介',
        type: 'textarea',
        wide: true,
        rows: 3,
        hint: '用于列表卡片，建议 60~120 字',
        placeholder: '一句话说明项目解决的问题与核心成果。',
    },
    {
        name: 'content',
        label: '项目详情',
        type: 'richtext',
        wide: true,
        placeholder: '研究背景、技术方案、成果与展望…',
    },
    {
        name: 'members',
        label: '团队成员',
        type: 'list',
        wide: true,
        hint: '每行一个成员名',
        placeholder: '每行一个成员名',
    },
    {
        name: 'tags',
        label: '标签',
        type: 'tags',
        wide: true,
        hint: '回车添加，用于筛选与相关推荐',
    },
];
const COLUMNS = [
    {
        key: 'title',
        title: '项目名称',
        width: '26%',
        render: (r) => (_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "clamp-1 max-w-[300px] text-[13px] font-medium", title: r.title, children: r.title }), !!r.summary && (_jsx("p", { className: "clamp-1 mt-0.5 max-w-[290px] text-[11px] text-muted-foreground", children: plain(r.summary, 46) }))] })),
    },
    {
        key: 'category',
        title: '类别',
        width: '96px',
        render: (r) => (_jsx(Chip, { tone: CAT_TONE[r.category] ?? 'default', className: "!px-2.5 !py-0.5", children: PROJECT_CATEGORIES[r.category] ?? r.category })),
    },
    {
        key: 'year',
        title: '年份',
        width: '76px',
        render: (r) => _jsx("span", { className: "mono text-xs text-foreground/80", children: r.year || '—' }),
    },
    {
        key: 'team',
        title: '团队',
        width: '14%',
        render: (r) => (_jsxs("span", { className: "clamp-1 flex max-w-[150px] items-center gap-1.5 text-xs text-muted-foreground", children: [_jsx(Users, { className: "h-3.5 w-3.5 shrink-0 opacity-60" }), r.team || '—'] })),
    },
    {
        key: 'advisor',
        title: '指导教师',
        width: '110px',
        render: (r) => _jsx("span", { className: "clamp-1 block text-xs text-muted-foreground", children: r.advisor || '—' }),
    },
    {
        key: 'awards',
        title: '获奖',
        width: '18%',
        render: (r) => (_jsxs("span", { className: "clamp-1 flex max-w-[200px] items-center gap-1.5 text-xs text-muted-foreground", title: r.awards ?? '', children: [r.awards ? _jsx(Award, { className: "h-3.5 w-3.5 shrink-0 text-[hsl(var(--warning))]" }) : null, r.awards || '—'] })),
    },
    {
        key: 'views',
        title: '浏览量',
        width: '92px',
        render: (r) => (_jsxs("span", { className: "mono flex items-center gap-1.5 text-xs text-muted-foreground", children: [_jsx(Eye, { className: "h-3.5 w-3.5 opacity-70" }), fnum(r.views)] })),
    },
];
export default function Projects() {
    useTitle('项目展示库');
    const reveal = useReveal();
    const { data: stats, loading: statsLoading } = useApi(() => AdminApi.stats(), []);
    const byCategory = (key) => {
        const list = Array.isArray(stats?.projByCat) ? stats.projByCat : [];
        return list.find((c) => c.key === key)?.value ?? 0;
    };
    const tiles = [
        {
            label: '项目总数',
            value: stats?.projects,
            hint: '展示库全部项目',
            tone: 'primary',
            icon: _jsx(Layers, { className: "h-4 w-4" }),
        },
        {
            label: '优秀项目',
            value: byCategory('excellent'),
            hint: '评审入选',
            tone: 'accent',
            icon: _jsx(Award, { className: "h-4 w-4" }),
        },
        {
            label: '在研项目',
            value: byCategory('ongoing'),
            hint: '仍在推进',
            tone: 'warning',
            icon: _jsx(Users, { className: "h-4 w-4" }),
        },
        {
            label: '结项项目',
            value: byCategory('completed'),
            hint: '已通过结项',
            tone: 'success',
            icon: _jsx(Award, { className: "h-4 w-4" }),
        },
    ];
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx("div", { ref: reveal, "data-reveal": true, className: "grid grid-cols-2 gap-3 lg:grid-cols-4", children: tiles.map((t) => (_jsx(StatTile, { label: t.label, value: statsLoading ? '—' : fnum(t.value ?? 0), hint: t.hint, tone: t.tone, icon: t.icon }, t.label))) }), _jsx(ResourceManager, { title: "\u9879\u76EE\u5C55\u793A\u5E93", description: "\u7EF4\u62A4\u9879\u76EE\u540D\u79F0\u3001\u7C7B\u522B\u3001\u5E74\u4EFD\u3001\u56E2\u961F\u4E0E\u6307\u5BFC\u6559\u5E08\u3001\u83B7\u5956\u4FE1\u606F\u4E0E\u56E2\u961F\u6210\u5458\uFF0C\u4F9B\u95E8\u6237\u9879\u76EE\u5E93\u5C55\u793A\u3002", resource: "projects", fields: FIELDS, columns: COLUMNS, pageSize: 10, searchPlaceholder: "\u641C\u7D22\u9879\u76EE\u540D\u79F0\u3001\u56E2\u961F\u6216\u6307\u5BFC\u6559\u5E08\u2026", emptyText: "\u6682\u65E0\u9879\u76EE", createLabel: "\u65B0\u5EFA\u9879\u76EE", catalog: (r) => _jsx(StatusChip, { status: r.status, labels: { rejected: '已驳回' } }), filters: ({ filters, setFilter }) => [
                    {
                        name: 'status',
                        label: '状态',
                        value: filters.status ?? '',
                        options: [
                            { value: '', label: '全部状态' },
                            { value: 'published', label: '已发布' },
                            { value: 'draft', label: '草稿' },
                            { value: 'pending', label: '待审核' },
                            { value: 'rejected', label: '已驳回' },
                        ],
                        onChange: (v) => setFilter('status', v),
                    },
                    {
                        name: 'category',
                        label: '类别',
                        value: filters.category ?? '',
                        options: [
                            { value: '', label: '全部类别' },
                            ...Object.entries(PROJECT_CATEGORIES).map(([value, label]) => ({ value, label })),
                        ],
                        onChange: (v) => setFilter('category', v),
                    },
                    {
                        name: 'year',
                        label: '年份',
                        value: filters.year ?? '',
                        options: [{ value: '', label: '全部年份' }, ...YEARS.map((y) => ({ value: String(y), label: `${y} 年` }))],
                        onChange: (v) => setFilter('year', v),
                    },
                ] })] }));
}

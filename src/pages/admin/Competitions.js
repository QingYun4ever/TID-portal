import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* 适配层：必须最先导入（在 ResourceManager 渲染前完成 Api 包装） */
import './adminResourceAdapter';
import { useMemo } from 'react';
import { CalendarClock, ExternalLink, Trophy } from 'lucide-react';
import { AdminApi } from '@/lib/api';
import { useApi, useReveal, useTitle } from '@/lib/hooks';
import { daysLeft, fdate } from '@/lib/utils';
import { Chip, Countdown } from '@/components/ui';
import { ResourceManager, StatTile, StatusChip, } from '@/components/AdminKit';
/** 级别色调：国家级=极光紫 / 省级=青蓝 / 校级=翠绿 */
const LEVEL_TONE = {
    国家级: 'accent',
    省级: 'primary',
    校级: 'success',
};
const LEVELS = ['国家级', '省级', '校级'];
const FIELDS = [
    {
        name: 'title',
        label: '竞赛名称',
        type: 'text',
        required: true,
        wide: true,
        placeholder: '例如：中国国际大学生创新大赛（2026）',
    },
    {
        name: 'level',
        label: '竞赛级别',
        type: 'select',
        default: '国家级',
        options: LEVELS.map((v) => ({ value: v, label: v })),
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
        name: 'organizer',
        label: '主办单位',
        type: 'text',
        required: true,
        placeholder: '例如：教育部高等教育司',
    },
    {
        name: 'signupDeadline',
        label: '报名截止',
        type: 'datetime',
        hint: '截止前 7 天 / 1 天会向站内用户发送提醒',
    },
    {
        name: 'link',
        label: '官网地址',
        type: 'text',
        placeholder: 'https://…',
        hint: '填写后学生可一键跳转官网报名',
    },
    {
        name: 'cover',
        label: '封面图',
        type: 'image',
        wide: true,
        hint: '建议 16:9，用于门户竞赛卡片',
    },
    {
        name: 'summary',
        label: '竞赛简介',
        type: 'textarea',
        wide: true,
        rows: 3,
        hint: '用于列表卡片，建议 60~120 字',
        placeholder: '一句话说明赛道设置、参赛对象与奖励。',
    },
    {
        name: 'content',
        label: '竞赛详情',
        type: 'richtext',
        wide: true,
        placeholder: '赛程安排、参赛要求、评审标准…',
    },
];
const COLUMNS = [
    {
        key: 'title',
        title: '竞赛名称',
        width: '30%',
        render: (r) => (_jsxs("div", { className: "flex items-start gap-2", children: [_jsx(Trophy, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "clamp-1 max-w-[320px] text-[13px] font-medium", title: r.title, children: r.title }), r.link && (_jsxs("a", { href: r.link, target: "_blank", rel: "noreferrer noopener", className: "mono mt-0.5 inline-flex max-w-[300px] items-center gap-1 text-[10.5px] text-primary/85 transition hover:text-primary", children: [_jsx(ExternalLink, { className: "h-3 w-3 shrink-0" }), _jsx("span", { className: "truncate", children: r.link })] }))] })] })),
    },
    {
        key: 'level',
        title: '级别',
        width: '92px',
        render: (r) => (_jsx(Chip, { tone: LEVEL_TONE[r.level] ?? 'default', className: "!px-2.5 !py-0.5", children: r.level || '未分级' })),
    },
    {
        key: 'organizer',
        title: '主办方',
        width: '20%',
        render: (r) => (_jsx("span", { className: "clamp-1 block max-w-[200px] text-xs text-muted-foreground", title: r.organizer, children: r.organizer || '—' })),
    },
    {
        key: 'signupDeadline',
        title: '报名截止',
        width: '196px',
        render: (r) => (_jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx("span", { className: "mono text-xs text-foreground/80", children: fdate(r.signupDeadline) }), _jsx(Countdown, { target: r.signupDeadline, className: "text-[11px]" })] })),
    },
];
export default function Competitions() {
    useTitle('竞赛信息');
    const reveal = useReveal();
    /* 级别分布：竞赛列表本身很小（个位数），一次取回后本地统计，避免额外接口 */
    const { data: rows, loading } = useApi(() => AdminApi.resource('competitions').list({ page: 1, pageSize: 200 }).then((r) => r.data), []);
    const list = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
    const countByLevel = (lv) => list.filter((r) => r.level === lv).length;
    const soon = list.filter((r) => {
        const d = daysLeft(r.signupDeadline);
        return d !== null && d >= 0 && d <= 7;
    }).length;
    const tiles = [
        {
            label: '竞赛总数',
            value: list.length,
            hint: soon ? `${soon} 项 7 天内截止` : '暂无临近截止',
            tone: 'primary',
            icon: _jsx(Trophy, { className: "h-4 w-4" }),
        },
        ...LEVELS.map((lv, i) => ({
            label: `${lv}赛事`,
            value: countByLevel(lv),
            hint: '按级别统计',
            tone: ['accent', 'primary', 'success'][i],
            icon: i === 0 ? _jsx(CalendarClock, { className: "h-4 w-4" }) : _jsx(Trophy, { className: "h-4 w-4" }),
        })),
    ];
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx("div", { ref: reveal, "data-reveal": true, className: "grid grid-cols-2 gap-3 lg:grid-cols-4", children: tiles.map((t) => (_jsx(StatTile, { label: t.label, value: loading ? '—' : String(t.value), hint: t.hint, tone: t.tone, icon: t.icon }, t.label))) }), _jsx(ResourceManager, { title: "\u7ADE\u8D5B\u4FE1\u606F", description: "\u7EF4\u62A4\u7ADE\u8D5B\u540D\u79F0\u3001\u7EA7\u522B\u3001\u4E3B\u529E\u5355\u4F4D\u3001\u62A5\u540D\u622A\u6B62\u65F6\u95F4\u4E0E\u5B98\u7F51\u94FE\u63A5\uFF1B\u622A\u6B62\u4E34\u8FD1\u65F6\u7CFB\u7EDF\u4F1A\u81EA\u52A8\u63D0\u9192\u5DF2\u6CE8\u518C\u7528\u6237\u3002", resource: "competitions", fields: FIELDS, columns: COLUMNS, pageSize: 10, searchPlaceholder: "\u641C\u7D22\u7ADE\u8D5B\u540D\u79F0\u6216\u4E3B\u529E\u65B9\u2026", emptyText: "\u6682\u65E0\u7ADE\u8D5B", createLabel: "\u65B0\u5EFA\u7ADE\u8D5B", catalog: (r) => _jsx(StatusChip, { status: r.status, labels: { rejected: '已驳回' } }), filters: ({ filters, setFilter }) => [
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
                        name: 'level',
                        label: '级别',
                        value: filters.level ?? '',
                        options: [{ value: '', label: '全部级别' }, ...LEVELS.map((v) => ({ value: v, label: v }))],
                        onChange: (v) => setFilter('level', v),
                    },
                ] })] }));
}

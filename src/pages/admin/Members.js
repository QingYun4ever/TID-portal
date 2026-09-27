import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* 适配层：必须最先导入（在 ResourceManager 渲染前完成 Api 包装） */
import './adminResourceAdapter';
import { useMemo, useState } from 'react';
import { Info, Network } from 'lucide-react';
import { AdminApi } from '@/lib/api';
import { useApi, useRevealScan, useTitle } from '@/lib/hooks';
import { plain } from '@/lib/utils';
import { Avatar, Chip, Glass, Tabs } from '@/components/ui';
import { ResourceManager } from '@/components/AdminKit';
/* =============================================================================
 * 成员与架构 —— /admin/members
 *  - 成员风采：门户「部门概况」页成员墙 + 首页精选
 *  - 组织架构：org_nodes 自关联树，靠 parentId 建立上下级
 * ========================================================================== */
const MEMBER_GROUPS = ['主席团', '竞赛管理组', '项目孵化组', '宣传设计组', '技术服务组', '教师'];
/* ------------------------------ 成员风采 ------------------------------ */
const MEMBER_FIELDS = [
    { name: 'name', label: '姓名', type: 'text', required: true, placeholder: '例如：李彦' },
    {
        name: 'role',
        label: '职务 / 角色',
        type: 'text',
        placeholder: '例如：部长 / 竞赛组组长',
        hint: '显示在成员卡片姓名下方',
    },
    {
        name: 'group',
        label: '所属工作组',
        type: 'select',
        default: '主席团',
        options: MEMBER_GROUPS.map((v) => ({ value: v, label: v })),
    },
    { name: 'avatar', label: '头像', type: 'image', hint: '建议 1:1 正方形，未上传时使用姓名首字生成' },
    {
        name: 'bio',
        label: '个人简介',
        type: 'textarea',
        wide: true,
        rows: 4,
        placeholder: '例如：负责竞赛信息统筹与校赛组织，擅长嵌入式开发与项目管理。',
        hint: '列表中截断显示，建议 40~80 字',
    },
    { name: 'tags', label: '技能标签', type: 'tags', hint: '回车添加，例如：AI / 硬件 / 视觉设计' },
    { name: 'sortOrder', label: '排序权重', type: 'number', default: 0, hint: '数字越小越靠前' },
    { name: 'featured', label: '首页展示', type: 'switch', hint: '开启后会出现在门户首页的成员精选区' },
];
const MEMBER_COLUMNS = [
    {
        key: 'name',
        title: '姓名',
        width: '210px',
        render: (m) => (_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(Avatar, { name: m.name, src: m.avatar, size: 34 }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-[13px] font-medium text-foreground/90", children: m.name }), !!m.tags?.length && (_jsx("p", { className: "clamp-1 mt-0.5 text-[10.5px] text-muted-foreground", children: m.tags.join(' · ') }))] })] })),
    },
    {
        key: 'role',
        title: '角色',
        width: '150px',
        render: (m) => _jsx("span", { className: "text-[12.5px] text-foreground/80", children: m.role || '—' }),
    },
    {
        key: 'group',
        title: '工作组',
        width: '120px',
        render: (m) => _jsx(Chip, { className: "!px-2.5 !py-0.5", children: m.group || '—' }),
    },
    {
        key: 'bio',
        title: '简介',
        width: '300px',
        render: (m) => _jsx("span", { className: "clamp-1 text-xs text-muted-foreground", children: plain(m.bio, 60) || '—' }),
    },
    {
        key: 'sortOrder',
        title: '排序',
        width: '80px',
        render: (m) => _jsx("span", { className: "mono text-xs text-muted-foreground", children: m.sortOrder ?? 0 }),
    },
];
/* ------------------------------ 组织架构 ------------------------------ */
const ORG_FIELDS = [
    { name: 'name', label: '节点名称', type: 'text', required: true, placeholder: '例如：竞赛管理组' },
    {
        name: 'parentId',
        label: '上级节点 ID',
        type: 'number',
        hint: '填写上级节点在表格「ID」列中的数字；顶级节点请留空',
        placeholder: '留空 = 顶级节点',
    },
    { name: 'leader', label: '负责人', type: 'text', placeholder: '例如：张伟（部长）' },
    {
        name: 'description',
        label: '职责说明',
        type: 'textarea',
        wide: true,
        rows: 3,
        placeholder: '例如：负责各级科技竞赛的信息发布、校内选拔组织与参赛保障。',
    },
    { name: 'sortOrder', label: '排序权重', type: 'number', default: 0, hint: '同级节点按该值升序排列' },
];
/* =============================================================================
 * 页面
 * ========================================================================== */
export default function Members() {
    useTitle('成员与架构');
    const [tab, setTab] = useState('members');
    /* 本页为懒加载路由，切换页签会重建资源管理区 —— 重新扫描滚动揭示 */
    useRevealScan(tab);
    /* 组织架构：拉一份全量节点用于显示上级名称 */
    const { data: allNodes } = useApi(() => AdminApi.resource('org-nodes').list({ page: 1, pageSize: 100 }), []);
    const nameById = useMemo(() => {
        const m = new Map();
        for (const n of allNodes ?? [])
            m.set(n.id, n.name);
        return m;
    }, [allNodes]);
    const orgColumns = useMemo(() => [
        {
            key: 'name',
            title: '节点名称',
            width: '220px',
            render: (o) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Network, { className: "h-3.5 w-3.5 shrink-0 text-primary/70" }), _jsx("span", { className: "truncate text-[13px] font-medium text-foreground/90", children: o.name })] })),
        },
        {
            key: 'parentId',
            title: '上级节点',
            width: '180px',
            render: (o) => o.parentId ? (_jsxs("span", { className: "text-[12px] text-foreground/80", children: [nameById.get(o.parentId) ?? '未知节点', _jsxs("span", { className: "mono ml-1.5 text-[10.5px] text-muted-foreground", children: ["#", o.parentId] })] })) : (_jsx(Chip, { tone: "primary", className: "!px-2.5 !py-0.5 !text-[10.5px]", children: "\u9876\u7EA7\u8282\u70B9" })),
        },
        {
            key: 'leader',
            title: '负责人',
            width: '150px',
            render: (o) => _jsx("span", { className: "text-[12.5px] text-muted-foreground", children: o.leader || '—' }),
        },
        {
            key: 'description',
            title: '职责说明',
            width: '320px',
            render: (o) => _jsx("span", { className: "clamp-1 text-xs text-muted-foreground", children: plain(o.description, 60) || '—' }),
        },
        {
            key: 'sortOrder',
            title: '排序',
            width: '80px',
            render: (o) => _jsx("span", { className: "mono text-xs text-muted-foreground", children: o.sortOrder ?? 0 }),
        },
    ], [nameById]);
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx("div", { "data-reveal": true, children: _jsx(Glass, { tone: "soft", className: "p-5", children: _jsxs("div", { className: "flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary", children: _jsx(Info, { className: "h-4 w-4" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-sm font-medium", children: "\u6210\u5458\u4E0E\u67B6\u6784\u8BF4\u660E" }), _jsxs("ul", { className: "mt-1.5 flex flex-col gap-1.5 text-[11.5px] leading-relaxed text-muted-foreground", children: [_jsxs("li", { className: "flex gap-2", children: [_jsx("span", { className: "text-primary/70", children: "\u00B7" }), _jsxs("span", { children: ["\u300C\u6210\u5458\u98CE\u91C7\u300D\u5BF9\u5E94\u95E8\u6237\u300C\u90E8\u95E8\u6982\u51B5\u300D\u9875\u7684\u6210\u5458\u5899\uFF1B\u5F00\u542F", _jsx("b", { className: "text-foreground/85", children: "\u9996\u9875\u5C55\u793A" }), "\u540E\uFF0C\u8BE5\u6210\u5458\u8FD8\u4F1A\u51FA\u73B0\u5728\u9996\u9875\u7CBE\u9009\u533A\u3002"] })] }), _jsxs("li", { className: "flex gap-2", children: [_jsx("span", { className: "text-primary/70", children: "\u00B7" }), _jsxs("span", { children: ["\u300C\u7EC4\u7EC7\u67B6\u6784\u300D\u9760 ", _jsx("span", { className: "mono text-foreground/85", children: "parentId" }), " \u5EFA\u7ACB\u4E0A\u4E0B\u7EA7\u5173\u7CFB\uFF1A", _jsx("b", { className: "text-foreground/85", children: "\u9876\u7EA7\u8282\u70B9 parentId \u7559\u7A7A" }), "\uFF1B\u5B50\u8282\u70B9\u5728\u300C\u4E0A\u7EA7\u8282\u70B9 ID\u300D\u91CC\u586B\u5199\u4E0A\u7EA7\u7684", _jsx("span", { className: "mono text-foreground/85", children: " ID" }), "\uFF08\u89C1\u8868\u683C ID \u5217\uFF09\u3002\u5C42\u7EA7\u4E0D\u9650\u5236\u6DF1\u5EA6\uFF0C\u95E8\u6237\u4F1A\u81EA\u52A8\u9012\u5F52\u6210\u6811\u3002"] })] }), _jsxs("li", { className: "flex gap-2", children: [_jsx("span", { className: "text-primary/70", children: "\u00B7" }), _jsx("span", { children: "\u300C\u6392\u5E8F\u6743\u91CD\u300D\u6570\u5B57\u8D8A\u5C0F\u8D8A\u9760\u524D\uFF0C\u540C\u7EA7\u7684\u5144\u5F1F\u8282\u70B9\u6309\u8BE5\u503C\u5347\u5E8F\u6392\u5217\uFF1B\u6539\u52A8\u540E\u524D\u53F0\u7ACB\u5373\u751F\u6548\u3002" })] })] })] })] }), _jsx(Tabs, { items: [
                                    { value: 'members', label: '成员风采' },
                                    { value: 'org', label: '组织架构' },
                                ], value: tab, onChange: setTab, className: "shrink-0" })] }) }) }), tab === 'members' ? (_jsx(ResourceManager, { title: "\u6210\u5458\u98CE\u91C7", description: "\u7EF4\u62A4\u90E8\u95E8\u6210\u5458\u5361\u7247\uFF1A\u5934\u50CF\u3001\u89D2\u8272\u3001\u5DE5\u4F5C\u7EC4\u4E0E\u6280\u80FD\u6807\u7B7E\uFF0C\u53EF\u6807\u8BB0\u9996\u9875\u5C55\u793A\u3002", resource: "members", fields: MEMBER_FIELDS, columns: MEMBER_COLUMNS, pageSize: 12, searchPlaceholder: "\u641C\u7D22\u6210\u5458\u59D3\u540D\u6216\u89D2\u8272\u2026", emptyText: "\u6682\u65E0\u6210\u5458", createLabel: "\u65B0\u589E\u6210\u5458", catalog: (m) => m.featured ? (_jsx(Chip, { tone: "success", className: "!px-2.5 !py-0.5 !text-[10.5px]", children: "\u9996\u9875\u5C55\u793A" })) : (_jsx(Chip, { className: "!px-2.5 !py-0.5 !text-[10.5px]", children: "\u4EC5\u6982\u51B5\u9875" })), filters: ({ filters, setFilter }) => [
                    {
                        name: 'group',
                        label: '工作组',
                        value: filters.group ?? '',
                        options: [{ value: '', label: '全部工作组' }, ...MEMBER_GROUPS.map((g) => ({ value: g, label: g }))],
                        onChange: (v) => setFilter('group', v),
                    },
                ] })) : (_jsx(ResourceManager, { title: "\u7EC4\u7EC7\u67B6\u6784", description: "\u7528 parentId \u7EF4\u62A4\u90E8\u95E8\u7684\u6811\u5F62\u7ED3\u6784\uFF0C\u95E8\u6237\u300C\u90E8\u95E8\u6982\u51B5\u300D\u9875\u4F1A\u81EA\u52A8\u6E32\u67D3\u6210\u7EC4\u7EC7\u67B6\u6784\u56FE\u3002", resource: "org-nodes", fields: ORG_FIELDS, columns: orgColumns, pageSize: 12, searchPlaceholder: "\u641C\u7D22\u8282\u70B9\u540D\u79F0\u2026", emptyText: "\u6682\u65E0\u7EC4\u7EC7\u8282\u70B9", createLabel: "\u65B0\u589E\u8282\u70B9" }))] }));
}

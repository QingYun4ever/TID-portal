import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* 适配层：必须最先导入（在 ResourceManager 渲染前完成 Api 包装） */
import './adminResourceAdapter';
import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { useRevealScan, useTitle } from '@/lib/hooks';
import { fdate, plain } from '@/lib/utils';
import { Chip, Glass } from '@/components/ui';
import { ResourceManager } from '@/components/AdminKit';
/** 版本色 → 语义 token（Chip 色调 + 状态点类名） */
const VERSION_TONES = {
    emerald: { chip: 'success', dot: 'bg-[hsl(var(--success))]', label: '翠绿' },
    blue: { chip: 'primary', dot: 'bg-primary', label: '青蓝' },
    violet: { chip: 'accent', dot: 'bg-accent', label: '极光紫' },
    amber: { chip: 'warning', dot: 'bg-[hsl(var(--warning))]', label: '琥珀' },
    cyan: { chip: 'primary', dot: 'bg-[hsl(var(--primary))]', label: '电能青' },
    rose: { chip: 'danger', dot: 'bg-[hsl(var(--destructive))]', label: '玫红' },
};
const FIELDS = [
    { name: 'version', label: '版本号', type: 'text', required: true, placeholder: '例如：v3.0.0', hint: '建议使用 vX.Y.Z 语义化版本' },
    {
        name: 'versionColor',
        label: '版本色',
        type: 'select',
        default: 'blue',
        options: Object.entries(VERSION_TONES).map(([value, t]) => ({ value, label: `${t.label}（${value}）` })),
        hint: '决定门户更新日志页的版本标签颜色',
    },
    { name: 'title', label: '标题', type: 'text', required: true, wide: true, placeholder: '例如：液态玻璃视觉语言全面上线' },
    { name: 'author', label: '维护人', type: 'text', placeholder: '例如：科技创新部技术组' },
    {
        name: 'content',
        label: '更新内容',
        type: 'richtext',
        wide: true,
        placeholder: '按模块列出本次更新，例如：新增 / 优化 / 修复 …',
    },
];
const COLUMNS = [
    {
        key: 'version',
        title: '版本',
        width: '110px',
        render: (c) => _jsx("span", { className: "mono text-[12.5px] font-semibold text-foreground/85", children: c.version }),
    },
    {
        key: 'title',
        title: '标题',
        width: '300px',
        render: (c) => _jsx("span", { className: "text-[13px] font-medium text-foreground/90", children: c.title }),
    },
    {
        key: 'content',
        title: '更新内容',
        width: '360px',
        render: (c) => _jsx("span", { className: "clamp-2 text-xs text-muted-foreground", children: plain(c.content, 90) || '—' }),
    },
    {
        key: 'author',
        title: '维护人',
        width: '150px',
        render: (c) => _jsx("span", { className: "text-[12px] text-muted-foreground", children: c.author || '—' }),
    },
    {
        key: 'createdAt',
        title: '记录时间',
        width: '120px',
        render: (c) => _jsx("span", { className: "mono text-[11px] text-muted-foreground", children: fdate(c.createdAt) }),
    },
];
export default function ChangelogAdmin() {
    useTitle('更新日志');
    /* 本页为懒加载路由，说明卡片需在挂载后重新扫描滚动揭示 */
    useRevealScan('changelog');
    const colorLegend = useMemo(() => Object.entries(VERSION_TONES).map(([value, t]) => ({ value, ...t })), []);
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx("div", { "data-reveal": true, children: _jsx(Glass, { tone: "soft", className: "p-5", children: _jsxs("div", { className: "flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary", children: _jsx(Info, { className: "h-4 w-4" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-sm font-medium", children: "\u66F4\u65B0\u65E5\u5FD7\u8BF4\u660E" }), _jsxs("ul", { className: "mt-1.5 flex flex-col gap-1.5 text-[11.5px] leading-relaxed text-muted-foreground", children: [_jsxs("li", { className: "flex gap-2", children: [_jsx("span", { className: "text-primary/70", children: "\u00B7" }), _jsxs("span", { children: ["\u95E8\u6237\u300C\u66F4\u65B0\u65E5\u5FD7\u300D\u9875\u6309\u8BB0\u5F55\u65F6\u95F4\u5012\u5E8F\u5C55\u793A\uFF0C\u7248\u672C\u53F7\u65C1\u7684\u8272\u6807\u7B7E\u7531", _jsx("span", { className: "mono text-foreground/85", children: " versionColor" }), " \u51B3\u5B9A\u3002"] })] }), _jsxs("li", { className: "flex gap-2", children: [_jsx("span", { className: "text-primary/70", children: "\u00B7" }), _jsx("span", { children: "\u300C\u66F4\u65B0\u5185\u5BB9\u300D\u4E3A\u5BCC\u6587\u672C\uFF0C\u5EFA\u8BAE\u6309\u300C\u65B0\u589E / \u4F18\u5316 / \u4FEE\u590D\u300D\u5206\u7EC4\u4E66\u5199\uFF0C\u4FBF\u4E8E\u540C\u5B66\u5FEB\u901F\u6D4F\u89C8\u3002" })] })] })] })] }), _jsx("div", { className: "flex shrink-0 flex-wrap items-center gap-2", children: colorLegend.map((t) => (_jsxs(Chip, { tone: t.chip, className: "!px-2.5 !py-0.5 !text-[10.5px]", children: [_jsx("span", { className: `h-1.5 w-1.5 rounded-full ${t.dot}` }), t.label] }, t.value))) })] }) }) }), _jsx(ResourceManager, { title: "\u66F4\u65B0\u65E5\u5FD7", description: "\u7EF4\u62A4\u7248\u672C\u66F4\u65B0\u8BB0\u5F55\uFF1A\u7248\u672C\u53F7\u3001\u8272\u6807\u7B7E\u3001\u6807\u9898\u4E0E\u5BCC\u6587\u672C\u6B63\u6587\uFF0C\u4F1A\u540C\u6B65\u5C55\u793A\u5728\u95E8\u6237\u66F4\u65B0\u65E5\u5FD7\u9875\u3002", resource: "changelog", fields: FIELDS, columns: COLUMNS, pageSize: 12, searchPlaceholder: "\u641C\u7D22\u7248\u672C\u53F7\u6216\u6807\u9898\u2026", emptyText: "\u6682\u65E0\u66F4\u65B0\u65E5\u5FD7", createLabel: "\u65B0\u589E\u8BB0\u5F55", catalog: (c) => {
                    const t = VERSION_TONES[c.versionColor] ?? VERSION_TONES.blue;
                    return (_jsxs(Chip, { tone: t.chip, className: "!px-2.5 !py-0.5 !text-[10.5px]", children: [_jsx("span", { className: `h-1.5 w-1.5 rounded-full ${t.dot}` }), c.version] }));
                } })] }));
}

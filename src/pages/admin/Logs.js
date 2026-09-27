import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Database, Download, Eraser, HardDriveDownload, Info, RefreshCw, ScrollText, ShieldCheck, Table2 } from 'lucide-react';
import { AdminApi, getToken } from '@/lib/api';
import { useApi, useDebounced, useRevealScan, useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { cn, fdatetime, fnum, fromNow } from '@/lib/utils';
import { AdminPage, DataTable, ExportButton, FilterBar } from '@/components/AdminKit';
import { Button, Chip, ConfirmDialog, EmptyState, ErrorState, Glass, Skeleton, Tabs } from '@/components/ui';
/* 数据表中文名（数据库概览用） */
const TABLE_LABELS = {
    users: '用户账号',
    articles: '新闻文章',
    activities: '活动',
    activity_signups: '活动报名',
    projects: '项目展示',
    competitions: '竞赛信息',
    project_applications: '项目申报',
    resources: '资源文件',
    join_positions: '招新岗位',
    join_applications: '招新报名',
    feedback: '留言反馈',
    gallery_areas: '画廊区域',
    gallery_images: '画廊图片',
    members: '成员',
    timeline: '发展历程',
    org_nodes: '组织架构',
    changelog: '更新日志',
    operation_logs: '操作日志',
    user_messages: '站内消息',
};
/* 导出快捷入口 */
const EXPORTS = [
    { kind: 'signups', label: '报名名单 CSV', desc: '按活动汇总报名、签到与联系方式' },
    { kind: 'applications', label: '项目申报 CSV', desc: '项目申报明细与审核状态' },
    { kind: 'join', label: '招新报名 CSV', desc: '招新申请人的资料与意向岗位' },
    { kind: 'feedback', label: '留言反馈 CSV', desc: '留言内容、处理状态与回复' },
];
/* =============================================================================
 * 操作日志与数据备份
 * ========================================================================== */
export default function Logs() {
    useTitle('操作日志与备份');
    const toast = useToast();
    const { isSuperAdmin, user } = useAuth();
    const [tab, setTab] = useState('logs');
    /* ------------------------------ 操作日志 ------------------------------ */
    const [page, setPage] = useState(1);
    const [pageSize] = useState(15);
    const [search, setSearch] = useState('');
    const q = useDebounced(search, 380);
    const { data, loading, error, reload } = useApi(() => AdminApi.logs({ page, pageSize, q }), [page, pageSize, q]);
    const rows = data?.items ?? [];
    const total = data?.total ?? 0;
    useEffect(() => {
        setPage(1);
    }, [q]);
    const [clearOpen, setClearOpen] = useState(false);
    const [clearing, setClearing] = useState(false);
    const clearLogs = async () => {
        setClearing(true);
        try {
            await AdminApi.clearLogs();
            toast.success('日志已清空', '所有历史操作记录已删除');
            setClearOpen(false);
            setPage(1);
            reload();
        }
        catch (e) {
            toast.error('清空失败', e.message);
        }
        finally {
            setClearing(false);
        }
    };
    const columns = useMemo(() => [
        {
            key: 'createdAt',
            title: '时间',
            width: '170px',
            render: (l) => (_jsxs("div", { children: [_jsx("p", { className: "mono text-[11.5px] text-foreground/80", children: fdatetime(l.createdAt) }), _jsx("p", { className: "text-[10.5px] text-muted-foreground", children: fromNow(l.createdAt) })] })),
        },
        {
            key: 'userName',
            title: '操作人',
            width: '120px',
            render: (l) => (_jsxs("span", { className: "text-[12.5px] text-foreground/85", children: [l.userName || '系统', l.userId === user?.id && _jsx("span", { className: "ml-1.5 text-[10px] text-primary", children: "\u6211" })] })),
        },
        {
            key: 'action',
            title: '动作',
            width: '150px',
            render: (l) => _jsx("span", { className: "text-[12.5px] text-foreground/85", children: l.action }),
        },
        {
            key: 'target',
            title: '目标',
            width: '130px',
            render: (l) => (l.target ? _jsx(Chip, { className: "!px-2 !py-0.5 !text-[10.5px]", children: l.target }) : _jsx("span", { className: "text-xs text-muted-foreground", children: "\u2014" })),
        },
        {
            key: 'detail',
            title: '详情',
            width: '280px',
            render: (l) => _jsx("span", { className: "clamp-1 text-xs text-muted-foreground", children: l.detail || '—' }),
        },
        {
            key: 'ip',
            title: 'IP',
            width: '130px',
            render: (l) => _jsx("span", { className: "mono text-[11px] text-muted-foreground", children: l.ip || '—' }),
        },
    ], [user?.id]);
    /* ------------------------------ 数据备份 ------------------------------ */
    const { data: dbRows, loading: dbLoading, error: dbError, reload: reloadDb, } = useApi(() => AdminApi.dbSummary(), [], { enabled: tab === 'backup' });
    const dbColumns = useMemo(() => [
        {
            key: 'label',
            title: '数据表',
            width: '220px',
            render: (r) => _jsx("span", { className: "text-[12.5px] text-foreground/85", children: r.label }),
        },
        {
            key: 'table',
            title: '表名',
            width: '220px',
            render: (r) => _jsx("span", { className: "mono text-[11px] text-muted-foreground", children: r.table }),
        },
        {
            key: 'rows',
            title: '行数',
            width: '160px',
            render: (r) => (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: cn('mono text-[12.5px] tabular-nums', r.rows > 0 ? 'text-foreground/85' : 'text-muted-foreground'), children: fnum(r.rows) }), _jsx("span", { className: "h-1 w-24 overflow-hidden rounded-full bg-white/8", children: _jsx("span", { className: "block h-full rounded-full bg-gradient-to-r from-primary/70 to-primary/30", style: { width: `${Math.min(100, (r.rows / Math.max(1, ...(dbRows ?? []).map((x) => x.rows))) * 100)}%` } }) })] })),
        },
    ], [dbRows]);
    const dbTableRows = useMemo(() => (dbRows ?? []).map((r, i) => ({ id: i + 1, table: r.table, label: TABLE_LABELS[r.table] ?? r.table, rows: r.rows })), [dbRows]);
    const totalRecords = useMemo(() => (dbRows ?? []).reduce((s, r) => s + (r.rows || 0), 0), [dbRows]);
    const [backingUp, setBackingUp] = useState(false);
    const downloadBackup = async () => {
        if (!isSuperAdmin) {
            toast.error('权限不足', '仅超级管理员可以导出完整备份');
            return;
        }
        setBackingUp(true);
        try {
            const res = await fetch('/api/admin/backup', { headers: { Authorization: `Bearer ${getToken() ?? ''}` } });
            if (!res.ok)
                throw new Error(res.status === 403 ? '仅超级管理员可以导出完整备份' : `备份失败（${res.status}）`);
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            const cd = res.headers.get('content-disposition') ?? '';
            const m = /filename="?([^"]+)"?/.exec(cd);
            a.download = m ? decodeURIComponent(m[1]) : `sti-portal-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
            toast.success('备份已导出', 'JSON 快照已开始下载');
        }
        catch (e) {
            toast.error('导出失败', e.message);
        }
        finally {
            setBackingUp(false);
        }
    };
    /* 本页为懒加载路由，且内容随页签 / 数据变化重绘 —— 重新扫描滚动揭示 */
    useRevealScan(`${tab}-${loading ? 'l' : 'i'}-${data ? 'd' : 'n'}-${dbLoading ? 'dl' : 'di'}-${dbRows ? 'dd' : 'dn'}`);
    return (_jsxs(AdminPage, { title: "\u64CD\u4F5C\u65E5\u5FD7\u4E0E\u5907\u4EFD", description: "\u5BA1\u8BA1\u540E\u53F0\u7684\u5168\u90E8\u5199\u64CD\u4F5C\uFF0C\u5E76\u5BFC\u51FA\u7AD9\u70B9\u6570\u636E\u5FEB\u7167\u7528\u4E8E\u5F52\u6863\u6216\u8FC1\u79FB\u3002", breadcrumb: "\u540E\u53F0\u7BA1\u7406", icon: _jsx(ScrollText, { className: "h-6 w-6" }), actions: _jsxs(_Fragment, { children: [_jsxs(Button, { variant: "glass", onClick: () => (tab === 'logs' ? reload() : reloadDb()), disabled: loading || dbLoading, children: [_jsx(RefreshCw, { className: cn('h-3.5 w-3.5', (loading || dbLoading) && 'animate-spin') }), "\u5237\u65B0"] }), tab === 'logs' ? (_jsxs(Button, { variant: "danger", onClick: () => (isSuperAdmin ? setClearOpen(true) : toast.error('权限不足', '仅超级管理员可以清空日志')), children: [_jsx(Eraser, { className: "h-3.5 w-3.5" }), "\u6E05\u7A7A\u65E5\u5FD7"] })) : (_jsxs(Button, { variant: "primary", onClick: downloadBackup, loading: backingUp, children: [_jsx(HardDriveDownload, { className: "h-3.5 w-3.5" }), "\u5BFC\u51FA\u5B8C\u6574\u5907\u4EFD"] }))] }), children: [_jsx("div", { "data-reveal": true, children: _jsx(Tabs, { items: [
                        { value: 'logs', label: '操作日志', count: tab === 'logs' ? total : undefined },
                        { value: 'backup', label: '数据备份' },
                    ], value: tab, onChange: setTab }) }), tab === 'logs' ? (_jsxs(_Fragment, { children: [_jsx(FilterBar, { search: search, onSearch: setSearch, placeholder: "\u641C\u7D22\u64CD\u4F5C\u4EBA / \u52A8\u4F5C / \u8BE6\u60C5\u2026", extra: _jsxs("div", { className: "flex items-center gap-2 text-[11px] text-muted-foreground", children: [_jsx(ScrollText, { className: "h-3.5 w-3.5" }), "\u5171 ", _jsx("span", { className: "mono text-foreground/85", children: total }), " \u6761\u8BB0\u5F55"] }) }), error ? (_jsx(Glass, { tone: "soft", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : (_jsx(DataTable, { columns: columns, rows: rows, loading: loading && !data, dense: true, empty: search ? '没有匹配的日志' : '暂无操作日志', emptyDescription: search ? '试试更换关键词。' : '后台的写操作（新建、修改、删除、审核、导出等）都会记录在这里。', page: page, pageSize: pageSize, total: total, onPageChange: setPage }))] })) : (_jsxs(_Fragment, { children: [_jsxs(Glass, { tone: "soft", className: "flex items-start gap-3 p-4", "data-reveal": true, children: [_jsx(Info, { className: "mt-0.5 h-4 w-4 shrink-0 text-primary" }), _jsxs("div", { className: "text-[12.5px] leading-relaxed text-muted-foreground", children: [_jsx("p", { className: "font-medium text-foreground/85", children: "\u5173\u4E8E\u6570\u636E\u5907\u4EFD" }), _jsxs("p", { className: "mt-1", children: ["\u5B8C\u6574\u5907\u4EFD\u662F\u4E00\u4EFD JSON \u5FEB\u7167\uFF0C\u5305\u542B\u6587\u7AE0\u3001\u6D3B\u52A8\u3001\u62A5\u540D\u3001\u9879\u76EE\u3001\u7ADE\u8D5B\u3001\u8D44\u6E90\u3001\u62DB\u65B0\u3001\u7559\u8A00\u3001\u753B\u5ECA\u3001\u6210\u5458\u3001\u7EC4\u7EC7\u67B6\u6784\u3001\u66F4\u65B0\u65E5\u5FD7\u3001\u7AD9\u70B9\u8BBE\u7F6E\u4E0E\u9875\u9762\u7B49", _jsx("b", { className: "text-foreground/85", children: "\u5168\u90E8\u4E1A\u52A1\u6570\u636E" }), "\uFF0C\u4F46\u4E0D\u5305\u542B\u7528\u6237\u5BC6\u7801\u54C8\u5E0C\uFF0C\u53EF\u5B89\u5168\u5F52\u6863\u3002"] }), !isSuperAdmin && (_jsxs("p", { className: "mt-1.5 flex items-center gap-1.5 text-[hsl(var(--warning))]", children: [_jsx(ShieldCheck, { className: "h-3.5 w-3.5" }), "\u5F53\u524D\u8D26\u53F7\u4E0D\u662F\u8D85\u7EA7\u7BA1\u7406\u5458\uFF0C\u65E0\u6CD5\u5BFC\u51FA\u5B8C\u6574\u5907\u4EFD\u4E0E\u6E05\u7A7A\u65E5\u5FD7\u3002"] }))] })] }), _jsxs("div", { className: "grid grid-cols-1 gap-6 xl:grid-cols-3", "data-reveal": true, children: [_jsxs(Glass, { tone: "soft", className: "p-5 sm:p-6 xl:col-span-2", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsxs("h2", { className: "flex items-center gap-2 text-sm font-semibold", children: [_jsx(Table2, { className: "h-4 w-4 text-primary" }), "\u6570\u636E\u5E93\u6982\u89C8"] }), _jsx("p", { className: "mt-1 text-[11.5px] text-muted-foreground", children: "\u5404\u6570\u636E\u8868\u5F53\u524D\u884C\u6570\uFF0C\u7528\u4E8E\u8BC4\u4F30\u6570\u636E\u89C4\u6A21\u4E0E\u5907\u4EFD\u4F53\u79EF" })] }), (dbRows ?? []).length > 0 && (_jsxs(Chip, { tone: "primary", children: ["\u5408\u8BA1 ", _jsx("span", { className: "mono ml-1", children: fnum(totalRecords) }), " \u884C"] }))] }), _jsx("div", { className: "mt-5", children: dbError ? (_jsx(ErrorState, { message: dbError, onRetry: reloadDb })) : dbLoading && !dbRows ? (_jsx("div", { className: "flex flex-col gap-2", children: Array.from({ length: 8 }).map((_, i) => (_jsx(Skeleton, { className: "h-11" }, i))) })) : dbTableRows.length ? (_jsx(DataTable, { columns: dbColumns, rows: dbTableRows, dense: true })) : (_jsx(EmptyState, { icon: _jsx(Database, { className: "h-5 w-5" }), title: "\u6682\u65E0\u6570\u636E\u8868\u4FE1\u606F" })) })] }), _jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs(Glass, { tone: "soft", className: "p-5 sm:p-6", children: [_jsxs("h2", { className: "flex items-center gap-2 text-sm font-semibold", children: [_jsx(Download, { className: "h-4 w-4 text-primary" }), "\u6570\u636E\u5BFC\u51FA"] }), _jsx("p", { className: "mt-1 text-[11.5px] text-muted-foreground", children: "\u5BFC\u51FA\u4E3A\u5E26 BOM \u7684 UTF-8 CSV\uFF0C\u53EF\u76F4\u63A5\u7528 Excel \u6253\u5F00" }), _jsx("div", { className: "mt-5 flex flex-col gap-3", children: EXPORTS.map((e) => (_jsxs("div", { className: "flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3.5", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-[12.5px] font-medium text-foreground/85", children: e.label }), _jsx("p", { className: "mt-0.5 text-[11px] text-muted-foreground", children: e.desc })] }), _jsx(ExportButton, { kind: e.kind, label: "\u5BFC\u51FA" })] }, e.kind))) })] }), _jsxs(Glass, { tone: "soft", className: "p-5 sm:p-6", children: [_jsxs("h2", { className: "flex items-center gap-2 text-sm font-semibold", children: [_jsx(Database, { className: "h-4 w-4 text-primary" }), "\u5B8C\u6574\u5907\u4EFD"] }), _jsx("p", { className: "mt-1 text-[11.5px] text-muted-foreground", children: "JSON \u5FEB\u7167 \u00B7 \u6392\u9664\u7528\u6237\u5BC6\u7801 \u00B7 \u4EC5\u8D85\u7EA7\u7BA1\u7406\u5458\u53EF\u5BFC\u51FA" }), _jsxs("div", { className: "mt-5 flex flex-wrap items-center gap-3", children: [_jsxs(Button, { variant: "primary", onClick: downloadBackup, loading: backingUp, children: [_jsx(HardDriveDownload, { className: "h-3.5 w-3.5" }), "\u5BFC\u51FA\u5B8C\u6574\u5907\u4EFD"] }), _jsx(ExportButton, { kind: "signups", label: "\u987A\u5E26\u5BFC\u51FA\u62A5\u540D CSV" })] })] })] })] })] })), _jsx(ConfirmDialog, { open: clearOpen, onClose: () => setClearOpen(false), onConfirm: clearLogs, loading: clearing, title: "\u6E05\u7A7A\u64CD\u4F5C\u65E5\u5FD7", confirmText: "\u786E\u8BA4\u6E05\u7A7A", description: _jsxs(_Fragment, { children: ["\u786E\u5B9A\u8981\u6E05\u7A7A\u5168\u90E8\u64CD\u4F5C\u65E5\u5FD7\u5417\uFF1F\u5F53\u524D\u5171 ", _jsx("span", { className: "mono text-foreground/85", children: total }), " \u6761\u8BB0\u5F55\uFF0C\u6E05\u7A7A\u540E\u65E0\u6CD5\u6062\u590D\u3002", _jsxs("span", { className: "mono mt-2 block text-[11px] text-muted-foreground", children: ["\u64CD\u4F5C\u4EBA\uFF1A", user?.name ?? '—', " \u00B7 ", fdatetime(new Date().toISOString())] })] }) })] }));
}

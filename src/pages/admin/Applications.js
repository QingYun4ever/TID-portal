import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, ClipboardList, Clock3, FileText, Layers, Mail, Phone, Search as SearchIcon, Users, XCircle, } from 'lucide-react';
import { AdminApi, apiFull, qs } from '@/lib/api';
import { useDebounced, useTitle } from '@/lib/hooks';
import { useToast } from '@/lib/store';
import { APPLY_STATUS, cn, fbytes, fdatetime, fnum, plain } from '@/lib/utils';
import { Button, Chip, Drawer, ErrorState, Glass, SearchInput, Skeleton, Tabs } from '@/components/ui';
import { AdminPage, DataTable, ExportButton, ReviewActions, StatTile, StatusChip } from '@/components/AdminKit';
const PAGE_SIZE = 20;
const TABS = [
    { value: 'all', label: '全部', key: null },
    { value: 'pending', label: '待审核', key: 'pending' },
    { value: 'reviewing', label: '审核中', key: 'reviewing' },
    { value: 'approved', label: '已通过', key: 'approved' },
    { value: 'rejected', label: '未通过', key: 'rejected' },
];
/* =============================================================================
 * 项目申报审核 /admin/applications
 * ========================================================================== */
export default function AdminApplications() {
    useTitle('项目申报审核');
    const toast = useToast();
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const q = useDebounced(search, 380);
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [counts, setCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [detail, setDetail] = useState(null);
    const [reviewing, setReviewing] = useState(null);
    const reload = useCallback(() => setReloadKey((k) => k + 1), []);
    const refresh = useCallback(() => setReloadKey((k) => k + 1), []);
    useEffect(() => {
        let alive = true;
        setLoading(true);
        apiFull(`/admin/applications?${qs({ page, pageSize: PAGE_SIZE, status, q })}`)
            .then((res) => {
            if (!alive)
                return;
            setRows((res.data?.items ?? []));
            setTotal(Number(res.data?.total ?? 0));
            setCounts((res.counts ?? {}));
            setError(null);
        })
            .catch((e) => {
            if (!alive)
                return;
            setError(e?.message || '加载失败');
            setRows([]);
            setTotal(0);
        })
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [page, status, q, reloadKey]);
    /** 详情抽屉的数据跟随列表刷新（审核后状态即时更新） */
    useEffect(() => {
        if (!detail)
            return;
        const next = rows.find((r) => r.id === detail.id);
        if (next)
            setDetail(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows]);
    const countOf = useCallback((key) => (key ? counts[key] ?? 0 : Object.values(counts).reduce((a, b) => a + b, 0)), [counts]);
    const tabItems = useMemo(() => TABS.map((t) => ({ value: t.value, label: t.label, count: loading && !Object.keys(counts).length ? undefined : countOf(t.key) })), [counts, countOf, loading]);
    const doReview = async (row, next, note) => {
        setReviewing(row.id);
        try {
            await AdminApi.reviewApplication(row.id, next, note);
            toast.success(`已${APPLY_STATUS[next] ?? next}`, plain(row.title, 30));
            refresh();
        }
        catch (e) {
            toast.error('审核失败', e.message);
        }
        finally {
            setReviewing(null);
        }
    };
    /* -------------------------------- 列定义 ------------------------------ */
    const columns = [
        {
            key: '__no',
            title: '#',
            width: '56px',
            render: (_r, i) => _jsx("span", { className: "mono text-xs text-muted-foreground", children: String((page - 1) * PAGE_SIZE + i + 1).padStart(2, '0') }),
        },
        {
            key: 'title',
            title: '项目名称',
            render: (r) => (_jsxs("div", { className: "min-w-[180px] max-w-[280px]", children: [_jsx("p", { className: "clamp-1 text-[13px] font-medium text-foreground/95", children: r.title }), r.competitionTitle && _jsxs("p", { className: "mono mt-1 clamp-1 text-[11px] text-muted-foreground", children: ["\u5BF9\u5E94\u7ADE\u8D5B \u00B7 ", r.competitionTitle] })] })),
        },
        {
            key: 'category',
            title: '类别',
            width: '116px',
            className: 'hidden sm:table-cell',
            render: (r) => (_jsx(Chip, { tone: "accent", className: "!px-2.5 !py-0.5 whitespace-nowrap", children: r.category || '—' })),
        },
        {
            key: 'leader',
            title: '负责人',
            width: '150px',
            render: (r) => (_jsxs("div", { children: [_jsx("p", { className: "whitespace-nowrap text-[13px] font-medium", children: r.leaderName }), _jsx("p", { className: "mono mt-0.5 text-[11px] text-muted-foreground", children: r.leaderStudentId })] })),
        },
        {
            key: 'college',
            title: '学院',
            className: 'hidden lg:table-cell',
            render: (r) => _jsx("span", { className: "block max-w-[170px] truncate text-[13px] text-foreground/80", children: r.leaderCollege || '—' }),
        },
        {
            key: 'contact',
            title: '电话 / 邮箱',
            className: 'hidden xl:table-cell',
            render: (r) => (_jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx("span", { className: "mono whitespace-nowrap text-[11px] text-foreground/80", children: r.leaderPhone || '—' }), _jsx("span", { className: "mono max-w-[190px] truncate text-[11px] text-muted-foreground", title: r.leaderEmail ?? '', children: r.leaderEmail || '—' })] })),
        },
        {
            key: 'advisor',
            title: '指导教师',
            width: '126px',
            className: 'hidden xl:table-cell',
            render: (r) => _jsx("span", { className: "block max-w-[120px] truncate text-[13px] text-foreground/80", children: r.advisor || '—' }),
        },
        {
            key: 'teamSize',
            title: '团队人数',
            width: '92px',
            className: 'hidden md:table-cell',
            render: (r) => (_jsxs("span", { className: "mono inline-flex items-center gap-1.5 text-xs text-foreground/85", children: [_jsx(Users, { className: "h-3.5 w-3.5 text-muted-foreground" }), r.teamSize || (Array.isArray(r.members) ? r.members.length : 0)] })),
        },
        {
            key: 'createdAt',
            title: '提交时间',
            width: '150px',
            className: 'hidden lg:table-cell',
            render: (r) => _jsx("span", { className: "mono whitespace-nowrap text-xs text-muted-foreground", children: fdatetime(r.createdAt) }),
        },
        {
            key: 'status',
            title: '状态',
            width: '100px',
            render: (r) => _jsx(StatusChip, { status: r.status }),
        },
    ];
    /* -------------------------------- 详情抽屉 ---------------------------- */
    const detailBody = (row) => (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(StatusChip, { status: row.status }), _jsx(Chip, { tone: "accent", children: row.category }), _jsxs("span", { className: "mono text-[11px] text-muted-foreground", children: ["#", row.id, " \u00B7 \u63D0\u4EA4\u4E8E ", fdatetime(row.createdAt)] })] }), _jsx(InfoBlock, { icon: _jsx(Layers, { className: "h-3.5 w-3.5" }), label: "\u9879\u76EE\u7B80\u4ECB", children: _jsx("p", { className: "whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/80", children: row.intro || '—' }) }), _jsx(InfoBlock, { icon: _jsx(Users, { className: "h-3.5 w-3.5" }), label: `成员列表（${Array.isArray(row.members) ? row.members.length : 0} 人）`, children: Array.isArray(row.members) && row.members.length ? (_jsx("ul", { className: "flex flex-wrap gap-2", children: row.members.map((m, i) => (_jsx("li", { className: "chip !px-3 !py-1", children: typeof m === 'string' ? m : String(m?.name ?? JSON.stringify(m)) }, i))) })) : (_jsx("p", { className: "text-[13px] text-muted-foreground", children: "\u672A\u586B\u5199\u6210\u5458\u4FE1\u606F" })) }), _jsx(InfoBlock, { icon: _jsx(FileText, { className: "h-3.5 w-3.5" }), label: `申报材料（${Array.isArray(row.materials) ? row.materials.length : 0} 个）`, children: Array.isArray(row.materials) && row.materials.length ? (_jsx("ul", { className: "flex flex-col gap-2", children: row.materials.map((m, i) => (_jsxs("li", { className: "flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5", children: [_jsxs("span", { className: "flex min-w-0 items-center gap-2.5", children: [_jsx(FileText, { className: "h-3.5 w-3.5 shrink-0 text-primary/80" }), _jsx("span", { className: "clamp-1 text-[13px] text-foreground/90", children: m?.name ?? `材料 ${i + 1}` })] }), _jsxs("span", { className: "flex shrink-0 items-center gap-3", children: [_jsx("span", { className: "mono text-[11px] text-muted-foreground", children: fbytes(m?.size ?? 0) }), m?.url && m.url !== '#' ? (_jsx("a", { href: m.url, target: "_blank", rel: "noreferrer noopener", className: "text-[11px] text-primary transition hover:underline", children: "\u67E5\u770B" })) : (_jsx("span", { className: "text-[11px] text-muted-foreground/60", children: "\u65E0\u9644\u4EF6" }))] })] }, i))) })) : (_jsx("p", { className: "text-[13px] text-muted-foreground", children: "\u672A\u4E0A\u4F20\u6750\u6599" })) }), _jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2", children: [_jsx(InfoBlock, { icon: _jsx(Phone, { className: "h-3.5 w-3.5" }), label: "\u8054\u7CFB\u7535\u8BDD", children: _jsx("p", { className: "mono text-[13px] text-foreground/85", children: row.leaderPhone || '—' }) }), _jsx(InfoBlock, { icon: _jsx(Mail, { className: "h-3.5 w-3.5" }), label: "\u8054\u7CFB\u90AE\u7BB1", children: _jsx("p", { className: "mono break-all text-[13px] text-foreground/85", children: row.leaderEmail || '—' }) })] }), _jsxs(InfoBlock, { icon: _jsx(BadgeCheck, { className: "h-3.5 w-3.5" }), label: "\u5BA1\u6838\u610F\u89C1", children: [row.reviewNote ? (_jsx("p", { className: "whitespace-pre-wrap rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3 text-[13px] leading-relaxed text-foreground/80", children: row.reviewNote })) : (_jsx("p", { className: "text-[13px] text-muted-foreground", children: "\u5C1A\u65E0\u5BA1\u6838\u610F\u89C1" })), _jsxs("p", { className: "mono mt-2 text-[11px] text-muted-foreground", children: ["\u6700\u540E\u66F4\u65B0 ", fdatetime(row.updatedAt)] })] }), _jsxs("div", { className: "rounded-2xl border border-white/8 bg-white/[0.025] p-4", children: [_jsx("p", { className: "mb-3 text-[12px] font-medium text-foreground/90", children: "\u5BA1\u6838\u64CD\u4F5C" }), _jsx(ReviewActions, { current: row.status, onReview: (s, note) => void doReview(row, s, note) }), _jsx("p", { className: "mt-3 text-[11px] leading-relaxed text-muted-foreground", children: "\u5BA1\u6838\u7ED3\u679C\u4F1A\u4EE5\u7AD9\u5185\u6D88\u606F\u63A8\u9001\u7ED9\u7533\u8BF7\u4EBA\uFF1B\u9009\u62E9\u300C\u9A73\u56DE\u300D\u65F6\u9700\u8981\u586B\u5199\u539F\u56E0\u3002" })] })] }));
    return (_jsxs(AdminPage, { title: "\u9879\u76EE\u7533\u62A5", breadcrumb: "\u540E\u53F0\u7BA1\u7406 \u00B7 \u4E1A\u52A1\u529E\u7406", icon: _jsx(ClipboardList, { className: "h-5 w-5" }), description: "\u5BA1\u6838\u5168\u6821\u540C\u5B66\u63D0\u4EA4\u7684\u9879\u76EE\u7533\u62A5\uFF0C\u652F\u6301\u53D7\u7406\u3001\u901A\u8FC7\u4E0E\u9A73\u56DE\uFF08\u9644\u5BA1\u6838\u610F\u89C1\uFF09\uFF0C\u5E76\u53EF\u5BFC\u51FA\u5B8C\u6574\u7533\u62A5\u6C47\u603B\u3002", actions: _jsx(ExportButton, { kind: "applications", label: "\u5BFC\u51FA\u7533\u62A5\u6C47\u603B" }), children: [_jsxs("div", { className: "grid grid-cols-2 gap-3 lg:grid-cols-4", "data-reveal": true, children: [_jsx(StatTile, { label: "\u5F85\u5BA1\u6838", value: fnum(counts.pending ?? 0), hint: "\u7B49\u5F85\u9996\u6B21\u53D7\u7406", tone: "warning", icon: _jsx(Clock3, { className: "h-4 w-4" }), onClick: () => {
                            setStatus('pending');
                            setPage(1);
                        }, active: status === 'pending' }), _jsx(StatTile, { label: "\u5BA1\u6838\u4E2D", value: fnum(counts.reviewing ?? 0), hint: "\u5DF2\u53D7\u7406\u5F85\u7ED3\u8BBA", tone: "primary", icon: _jsx(SearchIcon, { className: "h-4 w-4" }), onClick: () => {
                            setStatus('reviewing');
                            setPage(1);
                        }, active: status === 'reviewing' }), _jsx(StatTile, { label: "\u5DF2\u901A\u8FC7", value: fnum(counts.approved ?? 0), hint: "\u7ACB\u9879\u6210\u529F", tone: "success", icon: _jsx(BadgeCheck, { className: "h-4 w-4" }), onClick: () => {
                            setStatus('approved');
                            setPage(1);
                        }, active: status === 'approved' }), _jsx(StatTile, { label: "\u672A\u901A\u8FC7", value: fnum(counts.rejected ?? 0), hint: "\u5DF2\u9A73\u56DE\u5E76\u8BF4\u660E\u539F\u56E0", tone: "danger", icon: _jsx(XCircle, { className: "h-4 w-4" }), onClick: () => {
                            setStatus('rejected');
                            setPage(1);
                        }, active: status === 'rejected' })] }), _jsxs(Glass, { tone: "soft", className: "flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between", "data-reveal": true, children: [_jsx(Tabs, { items: tabItems, value: status, onChange: (v) => {
                            setStatus(v);
                            setPage(1);
                        }, size: "sm", className: "min-w-0" }), _jsx("div", { className: "w-full lg:max-w-xs", children: _jsx(SearchInput, { value: search, onChange: (v) => {
                                setSearch(v);
                                setPage(1);
                            }, placeholder: "\u641C\u7D22\u9879\u76EE\u540D / \u8D1F\u8D23\u4EBA / \u5B66\u53F7\u2026" }) })] }), error ? (_jsx(Glass, { tone: "soft", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : (_jsx(DataTable, { columns: columns, rows: rows, loading: loading, empty: "\u6682\u65E0\u7533\u62A5\u8BB0\u5F55", emptyDescription: status === 'all' && !q ? '当前还没有同学提交项目申报。' : '换个状态或清空搜索关键词试试。', onRowClick: (row) => setDetail(row), rowActions: (row) => (_jsx("div", { className: cn('flex justify-end', reviewing === row.id && 'opacity-60'), children: _jsx(ReviewActions, { current: row.status, onReview: (s, note) => void doReview(row, s, note) }) })), page: page, pageSize: PAGE_SIZE, total: total, onPageChange: setPage })), _jsx("p", { className: "text-[11px] text-muted-foreground", children: "\u63D0\u793A\uFF1A\u70B9\u51FB\u4EFB\u610F\u4E00\u884C\u53EF\u5728\u53F3\u4FA7\u62BD\u5C49\u67E5\u770B\u5B8C\u6574\u7533\u62A5\u8BE6\u60C5\uFF08\u7B80\u4ECB\u3001\u6210\u5458\u3001\u6750\u6599\u4E0E\u5BA1\u6838\u610F\u89C1\uFF09\u3002" }), _jsx(Drawer, { open: !!detail, onClose: () => setDetail(null), title: detail ? plain(detail.title, 26) : '申报详情', width: "max-w-2xl", footer: _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsx("span", { className: "mono text-[11px] text-muted-foreground", children: detail ? `${detail.leaderName} · ${detail.leaderStudentId} · ${detail.leaderCollege}` : '' }), _jsx(Button, { variant: "glass", onClick: () => setDetail(null), children: "\u5173\u95ED" })] }), children: detail ? detailBody(detail) : _jsx("div", { className: "flex flex-col gap-3", children: Array.from({ length: 5 }).map((_, i) => _jsx(Skeleton, { className: "h-16" }, i)) }) })] }));
}
/* ---------------------------------------------------------------------------
 * 小结构
 * ------------------------------------------------------------------------ */
function InfoBlock({ icon, label, children }) {
    return (_jsxs("div", { children: [_jsxs("p", { className: "mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground", children: [_jsx("span", { className: "text-primary/80", children: icon }), label] }), children] }));
}

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, BarChart3, Clock3, GraduationCap, Mail, Phone, Search as SearchIcon, Sparkles, Trash2, UserRound, Users, XCircle, } from 'lucide-react';
import { AdminApi, apiFull, qs } from '@/lib/api';
import { useDebounced, useTitle } from '@/lib/hooks';
import { useToast } from '@/lib/store';
import { APPLY_STATUS, fdatetime, fnum } from '@/lib/utils';
import { Button, Chip, ConfirmDialog, Drawer, ErrorState, Glass, SearchInput, Skeleton, Tabs } from '@/components/ui';
import { AdminPage, BarList, DataTable, ExportButton, ReviewActions, RowBtn, StatTile, StatusChip } from '@/components/AdminKit';
const PAGE_SIZE = 20;
const TABS = [
    { value: 'all', label: '全部', key: null },
    { value: 'pending', label: '待审核', key: 'pending' },
    { value: 'reviewing', label: '审核中', key: 'reviewing' },
    { value: 'approved', label: '已通过', key: 'approved' },
    { value: 'rejected', label: '未通过', key: 'rejected' },
];
/* =============================================================================
 * 招新报名管理 /admin/join
 * ========================================================================== */
export default function AdminJoin() {
    useTitle('招新报名管理');
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
    /* 全量数据（用于按岗位聚合） */
    const [allRows, setAllRows] = useState([]);
    const [detail, setDetail] = useState(null);
    const [confirmDel, setConfirmDel] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [reviewing, setReviewing] = useState(null);
    const reload = useCallback(() => setReloadKey((k) => k + 1), []);
    useEffect(() => {
        let alive = true;
        setLoading(true);
        apiFull(`/admin/join-applications?${qs({ page, pageSize: PAGE_SIZE, status, q })}`)
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
    /* 岗位聚合 */
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const first = await AdminApi.joinApplications({ page: 1, pageSize: 100 });
                const all = Number(first.data?.total ?? 0);
                let items = (first.data?.items ?? []);
                const pages = Math.min(20, Math.ceil(all / 100));
                for (let p = 2; p <= pages; p++) {
                    const next = await AdminApi.joinApplications({ page: p, pageSize: 100 });
                    items = items.concat((next.data?.items ?? []));
                }
                if (alive)
                    setAllRows(items);
            }
            catch {
                /* 忽略：聚合区会退化为按状态展示 */
            }
        })();
        return () => {
            alive = false;
        };
    }, [reloadKey]);
    /* 详情抽屉跟随列表状态刷新 */
    useEffect(() => {
        if (!detail)
            return;
        const next = rows.find((r) => r.id === detail.id);
        if (next)
            setDetail(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows]);
    const byPosition = useMemo(() => {
        const map = new Map();
        for (const r of allRows) {
            const key = r.positionName || '未选择岗位';
            map.set(key, (map.get(key) ?? 0) + 1);
        }
        return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
    }, [allRows]);
    const byStatus = useMemo(() => ['pending', 'reviewing', 'approved', 'rejected']
        .map((k) => ({ name: APPLY_STATUS[k], value: counts[k] ?? 0 }))
        .filter((i) => i.value > 0), [counts]);
    const countOf = (key) => (key ? counts[key] ?? 0 : Object.values(counts).reduce((a, b) => a + b, 0));
    const tabItems = useMemo(() => TABS.map((t) => ({ value: t.value, label: t.label, count: Object.keys(counts).length || !loading ? countOf(t.key) : undefined })), 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [counts, loading]);
    const doReview = async (row, next, note) => {
        setReviewing(row.id);
        try {
            await AdminApi.reviewJoin(row.id, next, note);
            toast.success(`已${APPLY_STATUS[next] ?? next}`, `${row.name} · ${row.positionName ?? '未选岗位'}`);
            reload();
        }
        catch (e) {
            toast.error('审核失败', e.message);
        }
        finally {
            setReviewing(null);
        }
    };
    const remove = async () => {
        if (!confirmDel)
            return;
        setDeleting(true);
        try {
            await AdminApi.deleteJoin(confirmDel.id);
            toast.success('已删除报名记录', `${confirmDel.name} · ${confirmDel.studentId}`);
            setConfirmDel(null);
            setDetail(null);
            reload();
        }
        catch (e) {
            toast.error('删除失败', e.message);
        }
        finally {
            setDeleting(false);
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
            key: 'name',
            title: '姓名',
            width: '110px',
            render: (r) => _jsx("span", { className: "whitespace-nowrap text-[13px] font-medium", children: r.name }),
        },
        {
            key: 'studentId',
            title: '学号',
            width: '124px',
            render: (r) => _jsx("span", { className: "mono whitespace-nowrap text-xs text-muted-foreground", children: r.studentId }),
        },
        {
            key: 'college',
            title: '学院',
            className: 'hidden md:table-cell',
            render: (r) => _jsx("span", { className: "block max-w-[170px] truncate text-[13px] text-foreground/80", children: r.college || '—' }),
        },
        {
            key: 'major',
            title: '专业',
            className: 'hidden lg:table-cell',
            render: (r) => _jsx("span", { className: "block max-w-[150px] truncate text-[13px] text-foreground/75", children: r.major || '—' }),
        },
        {
            key: 'grade',
            title: '年级',
            width: '80px',
            className: 'hidden sm:table-cell',
            render: (r) => _jsx("span", { className: "mono whitespace-nowrap text-xs text-foreground/80", children: r.grade || '—' }),
        },
        {
            key: 'phone',
            title: '手机',
            width: '130px',
            className: 'hidden sm:table-cell',
            render: (r) => _jsx("span", { className: "mono whitespace-nowrap text-xs text-foreground/80", children: r.phone || '—' }),
        },
        {
            key: 'email',
            title: '邮箱',
            className: 'hidden xl:table-cell',
            render: (r) => (_jsx("span", { className: "mono block max-w-[190px] truncate text-xs text-muted-foreground", title: r.email ?? '', children: r.email || '—' })),
        },
        {
            key: 'position',
            title: '意向岗位',
            width: '150px',
            render: (r) => r.positionName ? (_jsx(Chip, { tone: "primary", className: "!px-2.5 !py-0.5", children: _jsx("span", { className: "clamp-1 max-w-[130px]", children: r.positionName }) })) : (_jsx("span", { className: "text-[13px] text-muted-foreground", children: "\u672A\u9009\u62E9" })),
        },
        {
            key: 'status',
            title: '状态',
            width: '100px',
            render: (r) => _jsx(StatusChip, { status: r.status }),
        },
        {
            key: 'createdAt',
            title: '提交时间',
            width: '150px',
            className: 'hidden lg:table-cell',
            render: (r) => _jsx("span", { className: "mono whitespace-nowrap text-xs text-muted-foreground", children: fdatetime(r.createdAt) }),
        },
    ];
    /* -------------------------------- 详情内容 ---------------------------- */
    const detailBody = (row) => (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(StatusChip, { status: row.status }), row.positionName && _jsx(Chip, { tone: "primary", children: row.positionName }), _jsxs("span", { className: "mono text-[11px] text-muted-foreground", children: ["#", row.id, " \u00B7 \u63D0\u4EA4\u4E8E ", fdatetime(row.createdAt)] })] }), _jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2", children: [_jsx(KeyValue, { icon: _jsx(UserRound, { className: "h-3.5 w-3.5" }), label: "\u59D3\u540D / \u5B66\u53F7", value: `${row.name} · ${row.studentId}` }), _jsx(KeyValue, { icon: _jsx(GraduationCap, { className: "h-3.5 w-3.5" }), label: "\u5B66\u9662 / \u4E13\u4E1A", value: `${row.college || '—'} · ${row.major || '—'}` }), _jsx(KeyValue, { icon: _jsx(GraduationCap, { className: "h-3.5 w-3.5" }), label: "\u5E74\u7EA7", value: row.grade || '—' }), _jsx(KeyValue, { icon: _jsx(Phone, { className: "h-3.5 w-3.5" }), label: "\u624B\u673A", value: row.phone || '—' }), _jsx(KeyValue, { icon: _jsx(Mail, { className: "h-3.5 w-3.5" }), label: "\u90AE\u7BB1", value: row.email || '—' }), _jsx(KeyValue, { icon: _jsx(Sparkles, { className: "h-3.5 w-3.5" }), label: "\u610F\u5411\u5C97\u4F4D", value: row.positionName || '未选择' })] }), _jsx(SectionBlock, { icon: _jsx(Sparkles, { className: "h-3.5 w-3.5" }), label: "\u6280\u80FD\u7279\u957F", children: row.skills ? (_jsx("div", { className: "flex flex-wrap gap-2", children: row.skills
                        .split(/[、,，/|]/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((s, i) => (_jsx("span", { className: "chip !px-3 !py-1", children: s }, i))) })) : (_jsx("p", { className: "text-[13px] text-muted-foreground", children: "\u672A\u586B\u5199" })) }), _jsx(SectionBlock, { icon: _jsx(Users, { className: "h-3.5 w-3.5" }), label: "\u81EA\u6211\u4ECB\u7ECD", children: _jsx("p", { className: "whitespace-pre-wrap rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3 text-[13px] leading-relaxed text-foreground/80", children: row.intro || '未填写' }) }), _jsx(SectionBlock, { icon: _jsx(BadgeCheck, { className: "h-3.5 w-3.5" }), label: "\u5BA1\u6838\u610F\u89C1", children: row.reviewNote ? (_jsx("p", { className: "whitespace-pre-wrap rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3 text-[13px] leading-relaxed text-foreground/80", children: row.reviewNote })) : (_jsx("p", { className: "text-[13px] text-muted-foreground", children: "\u5C1A\u65E0\u5BA1\u6838\u610F\u89C1" })) })] }));
    return (_jsxs(AdminPage, { title: "\u62DB\u65B0\u62A5\u540D", breadcrumb: "\u540E\u53F0\u7BA1\u7406 \u00B7 \u4E1A\u52A1\u529E\u7406", icon: _jsx(Users, { className: "h-5 w-5" }), description: "\u5BA1\u9605\u65B0\u6210\u5458\u7533\u8BF7\uFF1A\u6280\u80FD\u7279\u957F\u3001\u81EA\u6211\u4ECB\u7ECD\u4E0E\u610F\u5411\u5C97\u4F4D\u4E00\u76EE\u4E86\u7136\uFF0C\u652F\u6301\u53D7\u7406\u3001\u901A\u8FC7\u4E0E\u9A73\u56DE\uFF08\u9644\u5BA1\u6838\u610F\u89C1\uFF09\u3002", actions: _jsx(ExportButton, { kind: "join", label: "\u5BFC\u51FA\u62DB\u65B0\u6C47\u603B" }), children: [_jsxs("div", { className: "grid grid-cols-1 gap-4 xl:grid-cols-3", "data-reveal": true, children: [_jsxs("div", { className: "grid grid-cols-2 gap-3 xl:col-span-2", children: [_jsx(StatTile, { label: "\u5F85\u5BA1\u6838", value: fnum(counts.pending ?? 0), hint: "\u7B49\u5F85\u9996\u6B21\u53D7\u7406", tone: "warning", icon: _jsx(Clock3, { className: "h-4 w-4" }), onClick: () => {
                                    setStatus('pending');
                                    setPage(1);
                                }, active: status === 'pending' }), _jsx(StatTile, { label: "\u5BA1\u6838\u4E2D", value: fnum(counts.reviewing ?? 0), hint: "\u5DF2\u53D7\u7406\u5F85\u7ED3\u8BBA", tone: "primary", icon: _jsx(SearchIcon, { className: "h-4 w-4" }), onClick: () => {
                                    setStatus('reviewing');
                                    setPage(1);
                                }, active: status === 'reviewing' }), _jsx(StatTile, { label: "\u5DF2\u901A\u8FC7", value: fnum(counts.approved ?? 0), hint: "\u5DF2\u52A0\u5165\u79D1\u6280\u521B\u65B0\u90E8", tone: "success", icon: _jsx(BadgeCheck, { className: "h-4 w-4" }), onClick: () => {
                                    setStatus('approved');
                                    setPage(1);
                                }, active: status === 'approved' }), _jsx(StatTile, { label: "\u672A\u901A\u8FC7", value: fnum(counts.rejected ?? 0), hint: "\u5DF2\u9A73\u56DE\u5E76\u8BF4\u660E\u539F\u56E0", tone: "danger", icon: _jsx(XCircle, { className: "h-4 w-4" }), onClick: () => {
                                    setStatus('rejected');
                                    setPage(1);
                                }, active: status === 'rejected' })] }), _jsxs(Glass, { tone: "soft", className: "p-5", "data-reveal": true, children: [_jsxs("div", { className: "mb-4 flex items-center justify-between gap-3", children: [_jsxs("p", { className: "flex items-center gap-2 text-[13px] font-medium", children: [_jsx(BarChart3, { className: "h-4 w-4 text-primary" }), "\u5C97\u4F4D\u62A5\u540D\u5206\u5E03"] }), _jsxs("span", { className: "mono text-[11px] text-muted-foreground", children: ["\u5171 ", fnum(allRows.length), " \u4EBA"] })] }), loading && !allRows.length ? (_jsx("div", { className: "flex flex-col gap-3", children: Array.from({ length: 4 }).map((_, i) => (_jsx(Skeleton, { className: "h-6" }, i))) })) : byPosition.length ? (_jsx(BarList, { items: byPosition })) : byStatus.length ? (_jsx(BarList, { items: byStatus })) : (_jsx("p", { className: "text-[13px] text-muted-foreground", children: "\u6682\u65E0\u62A5\u540D\u6570\u636E" }))] })] }), _jsxs(Glass, { tone: "soft", className: "flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between", "data-reveal": true, children: [_jsx(Tabs, { items: tabItems, value: status, onChange: (v) => {
                            setStatus(v);
                            setPage(1);
                        }, size: "sm", className: "min-w-0" }), _jsx("div", { className: "w-full lg:max-w-xs", children: _jsx(SearchInput, { value: search, onChange: (v) => {
                                setSearch(v);
                                setPage(1);
                            }, placeholder: "\u641C\u7D22\u59D3\u540D / \u5B66\u53F7 / \u5B66\u9662\u2026" }) })] }), error ? (_jsx(Glass, { tone: "soft", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : (_jsx(DataTable, { columns: columns, rows: rows, loading: loading, empty: "\u6682\u65E0\u62A5\u540D\u8BB0\u5F55", emptyDescription: status === 'all' && !q ? '招新通道开启后，同学的报名会出现在这里。' : '换个状态或清空搜索关键词试试。', onRowClick: (row) => setDetail(row), rowActions: (row) => (_jsx("div", { className: reviewing === row.id ? 'flex items-center justify-end gap-1 opacity-60' : 'flex items-center justify-end gap-1', children: _jsx(RowBtn, { icon: Trash2, label: "\u5220\u9664", tone: "danger", onClick: () => setConfirmDel(row) }) })), page: page, pageSize: PAGE_SIZE, total: total, onPageChange: setPage })), _jsx("p", { className: "text-[11px] text-muted-foreground", children: "\u63D0\u793A\uFF1A\u70B9\u51FB\u4EFB\u610F\u4E00\u884C\u67E5\u770B\u81EA\u6211\u4ECB\u7ECD\u3001\u6280\u80FD\u7279\u957F\u4E0E\u5BA1\u6838\uFF1B\u884C\u5185\u300C\u5220\u9664\u300D\u7528\u4E8E\u6E05\u7406\u91CD\u590D\u6216\u65E0\u6548\u62A5\u540D\u3002" }), _jsx(ConfirmDialog, { open: !!confirmDel, onClose: () => setConfirmDel(null), onConfirm: remove, loading: deleting, title: "\u5220\u9664\u62DB\u65B0\u62A5\u540D", confirmText: "\u786E\u8BA4\u5220\u9664", description: _jsxs(_Fragment, { children: ["\u8BE5\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\uFF0C\u62A5\u540D\u4EBA\u7684\u6240\u6709\u4FE1\u606F\u5C06\u88AB\u79FB\u9664\u3002", confirmDel && (_jsxs("span", { className: "mono mt-2 block text-xs text-muted-foreground", children: [confirmDel.name, " \u00B7 ", confirmDel.studentId, " \u00B7 ", confirmDel.positionName ?? '未选岗位'] }))] }) }), _jsx(Drawer, { open: !!detail, onClose: () => setDetail(null), title: detail ? `${detail.name} · 招新报名` : '报名详情', width: "max-w-2xl", footer: detail ? (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsx(ReviewActions, { current: detail.status, onReview: (s, note) => void doReview(detail, s, note) }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs(Button, { variant: "danger", size: "sm", onClick: () => setConfirmDel(detail), children: [_jsx(Trash2, { className: "h-3.5 w-3.5" }), "\u5220\u9664\u62A5\u540D"] }), _jsx(Button, { variant: "glass", onClick: () => setDetail(null), children: "\u5173\u95ED" })] })] })) : null, children: detail ? (detailBody(detail)) : (_jsx("div", { className: "flex flex-col gap-3", children: Array.from({ length: 5 }).map((_, i) => (_jsx(Skeleton, { className: "h-16" }, i))) })) })] }));
}
/* ---------------------------------------------------------------------------
 * 小结构
 * ------------------------------------------------------------------------ */
function KeyValue({ icon, label, value }) {
    return (_jsxs("div", { className: "rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5", children: [_jsxs("p", { className: "mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground", children: [_jsx("span", { className: "text-primary/80", children: icon }), label] }), _jsx("p", { className: "clamp-1 text-[13px] text-foreground/85", children: value })] }));
}
function SectionBlock({ icon, label, children }) {
    return (_jsxs("div", { children: [_jsxs("p", { className: "mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground", children: [_jsx("span", { className: "text-primary/80", children: icon }), label] }), children] }));
}

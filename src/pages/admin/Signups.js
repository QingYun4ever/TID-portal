import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Info, Percent, QrCode, Trash2, UserCheck, Users } from 'lucide-react';
import { AdminApi, apiFull, qs } from '@/lib/api';
import { useDebounced, useTitle } from '@/lib/hooks';
import { useToast } from '@/lib/store';
import { fdatetime, fnum } from '@/lib/utils';
import { Button, Chip, ConfirmDialog, ErrorState, Glass, Modal, ProgressBar, Select, Switch } from '@/components/ui';
import { AdminPage, DataTable, ExportButton, FilterBar, QrPanel, RowBtn, StatTile } from '@/components/AdminKit';
/* =============================================================================
 * 活动报名管理 /admin/signups
 * ========================================================================== */
export default function AdminSignups() {
    useTitle('活动报名管理');
    const toast = useToast();
    const [page, setPage] = useState(1);
    const [activityId, setActivityId] = useState('all');
    const [search, setSearch] = useState('');
    const q = useDebounced(search, 380);
    const [activities, setActivities] = useState([]);
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    /* 全局签到聚合（用于真实的签到率统计） */
    const [agg, setAgg] = useState({ total: 0, checkedIn: 0 });
    const [toggling, setToggling] = useState(null);
    const [confirmDel, setConfirmDel] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [qrOpen, setQrOpen] = useState(false);
    const [qrPayload, setQrPayload] = useState('');
    const [qrTitle, setQrTitle] = useState('');
    const [qrLoading, setQrLoading] = useState(false);
    const reload = useCallback(() => setReloadKey((k) => k + 1), []);
    /* --------------------------- 列表 + 活动下拉 --------------------------- */
    useEffect(() => {
        let alive = true;
        setLoading(true);
        apiFull(`/admin/signups?${qs({ page, pageSize: 20, activityId, q })}`)
            .then((res) => {
            if (!alive)
                return;
            setRows((res.data?.items ?? []));
            setTotal(res.data?.total ?? 0);
            setActivities((res.activities ?? []));
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
    }, [page, activityId, q, reloadKey]);
    /* ------------------------------ 签到聚合 ------------------------------ */
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const first = await AdminApi.signups({ page: 1, pageSize: 100 });
                const totalAll = Number(first.data?.total ?? 0);
                let items = first.data?.items ?? [];
                const pages = Math.min(40, Math.ceil(totalAll / 100));
                for (let p = 2; p <= pages; p++) {
                    const next = await AdminApi.signups({ page: p, pageSize: 100 });
                    items = items.concat(next.data?.items ?? []);
                }
                if (!alive)
                    return;
                setAgg({ total: items.length, checkedIn: items.filter((r) => r.checkedIn).length });
            }
            catch {
                /* 统计失败不阻塞主流程 */
            }
        })();
        return () => {
            alive = false;
        };
    }, [reloadKey]);
    /* ------------------------------ 派生数据 ------------------------------ */
    const currentActivity = useMemo(() => (activityId === 'all' ? null : activities.find((a) => String(a.id) === activityId) ?? null), [activities, activityId]);
    const pageCheckedIn = rows.filter((r) => r.checkedIn).length;
    const stats = useMemo(() => {
        if (currentActivity) {
            const signed = currentActivity.signedCount;
            const cap = currentActivity.capacity || 0;
            return {
                total: signed,
                checkedIn: null,
                rate: cap ? Math.min(100, Math.round((signed / cap) * 100)) : 0,
            };
        }
        const rate = agg.total ? Math.round((agg.checkedIn / agg.total) * 100) : 0;
        return { total: agg.total, checkedIn: agg.checkedIn, rate };
    }, [agg, currentActivity]);
    /* -------------------------------- 签到 -------------------------------- */
    const toggleCheckin = async (row, next) => {
        setToggling(row.id);
        try {
            await AdminApi.checkin(row.id, next);
            setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, checkedIn: next } : r)));
            setAgg((a) => ({ ...a, checkedIn: Math.max(0, a.checkedIn + (next ? 1 : -1)) }));
            toast.success(next ? '已标记签到' : '已取消签到', row.name);
        }
        catch (e) {
            toast.error('操作失败', e.message);
        }
        finally {
            setToggling(null);
        }
    };
    /* -------------------------------- 删除 -------------------------------- */
    const remove = async () => {
        if (!confirmDel)
            return;
        setDeleting(true);
        try {
            await AdminApi.deleteSignup(confirmDel.id);
            toast.success('已删除报名记录', `${confirmDel.name} · ${confirmDel.studentId}`);
            setConfirmDel(null);
            reload();
        }
        catch (e) {
            toast.error('删除失败', e.message);
        }
        finally {
            setDeleting(false);
        }
    };
    /* ------------------------------ 签到二维码 ----------------------------- */
    const openQr = async () => {
        if (!currentActivity)
            return;
        setQrTitle(currentActivity.title);
        setQrPayload(`STI-CHECKIN:${currentActivity.id}:${currentActivity.slug ?? ''}`);
        setQrOpen(true);
        setQrLoading(true);
        try {
            const d = await apiFull(`/admin/signups/qrcode/${currentActivity.id}`);
            if (d?.payload)
                setQrPayload(String(d.payload));
        }
        catch {
            /* 后端不可用时使用前端构造的等价 payload */
        }
        finally {
            setQrLoading(false);
        }
    };
    /** 把二维码渲染进新窗口打印（SVG 自带尺寸，不依赖外部资源） */
    const printQr = async () => {
        if (!qrPayload)
            return;
        try {
            const { qrSvg } = await import('@/lib/qrcode');
            const svg = qrSvg(qrPayload, { ecl: 'M', dark: '#0B0F14', light: '#FFFFFF', quiet: 3 });
            const win = window.open('', '_blank', 'width=760,height=920');
            if (!win) {
                toast.error('浏览器拦截了弹出窗口', '请允许本站弹出窗口后重试');
                return;
            }
            win.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" /><title>签到二维码 · ${escapeHtml(qrTitle)}</title>` +
                `<style>body{margin:0;font-family:"Noto Sans SC","Microsoft YaHei",system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#fff;color:#0B0F14}` +
                `.card{text-align:center;padding:40px 48px}h1{font-size:24px;margin:0 0 8px}p{margin:4px 0;font-size:14px;color:#4b5563}` +
                `.qr{width:340px;height:340px;margin:24px auto}.qr svg{width:100%;height:100%}.code{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#6b7280;word-break:break-all;max-width:420px;margin:16px auto 0}</style>` +
                `</head><body><div class="card"><h1>${escapeHtml(qrTitle)}</h1><p>请使用手机扫描下方二维码完成现场签到</p><div class="qr">${svg}</div><p class="code">${escapeHtml(qrPayload)}</p></div>` +
                `<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`);
            win.document.close();
        }
        catch (e) {
            toast.error('打印失败', e.message);
        }
    };
    /* -------------------------------- 列定义 ------------------------------ */
    const columns = [
        {
            key: '__no',
            title: '#',
            width: '56px',
            render: (_r, i) => _jsx("span", { className: "mono text-xs text-muted-foreground", children: String((page - 1) * 20 + i + 1).padStart(2, '0') }),
        },
        {
            key: 'activity',
            title: '活动名称',
            width: '300px',
            render: (r) => (_jsx("span", { className: "clamp-1 block w-[300px] max-w-[300px] text-[13px] text-foreground/90", title: r.activityTitle ?? '', children: r.activityTitle ?? '—' })),
        },
        {
            key: 'name',
            title: '姓名',
            width: '100px',
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
            render: (r) => _jsx("span", { className: "block max-w-[180px] truncate text-[13px] text-foreground/80", children: r.college || '—' }),
        },
        {
            key: 'major',
            title: '专业',
            className: 'hidden lg:table-cell',
            render: (r) => _jsx("span", { className: "block max-w-[160px] truncate text-[13px] text-foreground/75", children: r.major || '—' }),
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
            key: 'createdAt',
            title: '报名时间',
            width: '150px',
            className: 'hidden lg:table-cell',
            render: (r) => _jsx("span", { className: "mono whitespace-nowrap text-xs text-muted-foreground", children: fdatetime(r.createdAt) }),
        },
        {
            key: 'checkedIn',
            title: '签到状态',
            width: '132px',
            render: (r) => (_jsx("div", { className: "flex items-center gap-2.5", children: _jsx(Switch, { checked: !!r.checkedIn, onChange: (v) => void toggleCheckin(r, v), label: toggling === r.id ? '…' : r.checkedIn ? '已签到' : '未签到' }) })),
        },
        {
            key: 'remark',
            title: '备注',
            className: 'hidden xl:table-cell',
            render: (r) => (_jsx("span", { className: "block max-w-[160px] truncate text-[12px] text-muted-foreground", title: r.remark ?? '', children: r.remark || '—' })),
        },
    ];
    const errorState = error ? (_jsx(Glass, { tone: "soft", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : null;
    return (_jsxs(AdminPage, { title: "\u6D3B\u52A8\u62A5\u540D", breadcrumb: "\u540E\u53F0\u7BA1\u7406 \u00B7 \u4E1A\u52A1\u529E\u7406", icon: _jsx(UserCheck, { className: "h-5 w-5" }), description: "\u67E5\u770B\u3001\u68C0\u7D22\u4E0E\u5BFC\u51FA\u5404\u6D3B\u52A8\u7684\u62A5\u540D\u540D\u5355\uFF0C\u652F\u6301\u73B0\u573A\u7B7E\u5230\u6807\u8BB0\u4E0E\u7B7E\u5230\u4E8C\u7EF4\u7801\u751F\u6210\u3002", actions: _jsxs(_Fragment, { children: [_jsx(ExportButton, { kind: "signups", params: activityId !== 'all' ? { activityId } : undefined, label: "\u5BFC\u51FA\u62A5\u540D\u540D\u5355" }), _jsxs(Button, { variant: "glass", onClick: openQr, disabled: !currentActivity, title: currentActivity ? '生成该活动的签到二维码' : '请先选择一个具体活动', children: [_jsx(QrCode, { className: "h-3.5 w-3.5" }), "\u751F\u6210\u7B7E\u5230\u4E8C\u7EF4\u7801"] })] }), children: [_jsxs(Glass, { tone: "soft", className: "flex flex-col gap-5 p-5", "data-reveal": true, children: [_jsxs("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", children: [_jsxs("div", { className: "w-full max-w-md", children: [_jsx("label", { className: "field-label", htmlFor: "signup-activity", children: "\u6D3B\u52A8\u7B5B\u9009" }), _jsxs(Select, { id: "signup-activity", value: activityId, onChange: (e) => {
                                            setActivityId(e.target.value);
                                            setPage(1);
                                        }, children: [_jsxs("option", { value: "all", children: ["\u5168\u90E8\u6D3B\u52A8\uFF08", fnum(agg.total), " \u6761\u62A5\u540D\uFF09"] }), activities.map((a) => (_jsxs("option", { value: String(a.id), children: [a.title, "\uFF08", a.signedCount, "/", a.capacity || '不限', "\uFF09"] }, a.id)))] })] }), _jsx("p", { className: "text-[11px] leading-relaxed text-muted-foreground lg:max-w-sm", children: "\u9009\u62E9\u5177\u4F53\u6D3B\u52A8\u540E\uFF0C\u5BFC\u51FA\u4E0E\u7B7E\u5230\u4E8C\u7EF4\u7801\u90FD\u4F1A\u9650\u5B9A\u5728\u8BE5\u6D3B\u52A8\u5185\uFF1B\u4E0D\u9009\u5219\u9762\u5411\u5168\u90E8\u6D3B\u52A8\u7684\u62A5\u540D\u8BB0\u5F55\u3002" })] }), currentActivity ? (_jsxs("div", { className: "rounded-2xl border border-white/8 bg-white/[0.03] p-4", children: [_jsxs("div", { className: "flex flex-wrap items-end justify-between gap-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "clamp-1 text-sm font-medium", children: currentActivity.title }), _jsxs("p", { className: "mono mt-1 text-[11px] text-muted-foreground", children: ["\u5DF2\u62A5\u540D ", _jsx("span", { className: "text-primary", children: currentActivity.signedCount }), " \u4EBA \u00B7 \u540D\u989D ", currentActivity.capacity || '不限'] })] }), _jsx(Chip, { tone: currentActivity.capacity && currentActivity.signedCount >= currentActivity.capacity ? 'danger' : 'primary', children: currentActivity.capacity
                                            ? currentActivity.signedCount >= currentActivity.capacity
                                                ? '名额已满'
                                                : `剩余 ${currentActivity.capacity - currentActivity.signedCount} 个名额`
                                            : '不限名额' })] }), _jsx(ProgressBar, { className: "mt-3.5", value: currentActivity.signedCount, max: currentActivity.capacity || Math.max(1, currentActivity.signedCount), tone: currentActivity.capacity && currentActivity.signedCount >= currentActivity.capacity ? 'danger' : 'primary' })] })) : (_jsxs("div", { className: "flex items-start gap-2.5 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-[12px] text-muted-foreground", children: [_jsx(Info, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" }), _jsx("span", { children: "\u5F53\u524D\u5C55\u793A\u5168\u90E8\u6D3B\u52A8\u7684\u62A5\u540D\u8BB0\u5F55\u3002\u60F3\u67E5\u770B\u540D\u989D\u8FDB\u5EA6\u6216\u751F\u6210\u7B7E\u5230\u4E8C\u7EF4\u7801\uFF0C\u8BF7\u5728\u4E0A\u65B9\u9009\u62E9\u5177\u4F53\u6D3B\u52A8\u3002" })] }))] }), _jsxs("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4", "data-reveal": true, children: [_jsx(StatTile, { label: "\u603B\u62A5\u540D\u6570", value: fnum(stats.total), hint: "\u6761\u62A5\u540D\u8BB0\u5F55", tone: "primary", icon: _jsx(Users, { className: "h-4 w-4" }) }), _jsx(StatTile, { label: "\u5DF2\u7B7E\u5230\u6570", value: stats.checkedIn === null ? '—' : fnum(stats.checkedIn), hint: stats.checkedIn === null ? '选择具体活动后按页显示' : '现场扫码/手动标记', tone: "success", icon: _jsx(CheckCircle2, { className: "h-4 w-4" }) }), _jsx(StatTile, { label: "\u7B7E\u5230\u7387", value: `${stats.rate}%`, hint: currentActivity ? '按活动名额计算' : '全部报名记录', tone: stats.rate >= 60 ? 'success' : stats.rate >= 30 ? 'warning' : 'danger', icon: _jsx(Percent, { className: "h-4 w-4" }) }), _jsx(StatTile, { label: "\u5F53\u524D\u9875\u5DF2\u7B7E\u5230", value: `${pageCheckedIn} / ${rows.length}`, hint: currentActivity ? '本页签到进度' : `全部活动 · 共 ${activities.length} 个活动`, tone: "accent", icon: _jsx(CalendarDays, { className: "h-4 w-4" }) })] }), _jsx(FilterBar, { search: search, onSearch: (v) => {
                    setSearch(v);
                    setPage(1);
                }, placeholder: "\u641C\u7D22\u59D3\u540D / \u5B66\u53F7 / \u5B66\u9662\u2026", extra: _jsxs("span", { className: "mono ml-auto text-[11px] text-muted-foreground", children: ["\u5171 ", fnum(total), " \u6761 \u00B7 \u6BCF\u9875 20 \u6761"] }) }), errorState ?? (_jsx(DataTable, { columns: columns, rows: rows, loading: loading, empty: "\u6682\u65E0\u62A5\u540D\u8BB0\u5F55", emptyDescription: "\u6362\u4E00\u4E2A\u6D3B\u52A8\u6216\u6E05\u7A7A\u641C\u7D22\u5173\u952E\u8BCD\u8BD5\u8BD5\u3002", rowActions: (row) => _jsx(RowBtn, { icon: Trash2, label: "\u5220\u9664\u62A5\u540D", tone: "danger", onClick: () => setConfirmDel(row) }), page: page, pageSize: 20, total: total, onPageChange: setPage })), _jsx(ConfirmDialog, { open: !!confirmDel, onClose: () => setConfirmDel(null), onConfirm: remove, loading: deleting, title: "\u5220\u9664\u62A5\u540D\u8BB0\u5F55", confirmText: "\u786E\u8BA4\u5220\u9664", description: _jsxs(_Fragment, { children: ["\u5220\u9664\u540E\u8BE5\u540C\u5B66\u7684\u62A5\u540D\u4FE1\u606F\u4E0E\u7B7E\u5230\u72B6\u6001\u5C06\u65E0\u6CD5\u6062\u590D\uFF0C\u5982\u5DF2\u53D1\u9001\u901A\u77E5\u8BF7\u53E6\u884C\u8BF4\u660E\u3002", confirmDel && (_jsxs("span", { className: "mono mt-2 block text-xs text-muted-foreground", children: [confirmDel.name, " \u00B7 ", confirmDel.studentId, " \u00B7 ", confirmDel.activityTitle ?? '—'] }))] }) }), _jsx(Modal, { open: qrOpen, onClose: () => setQrOpen(false), title: "\u7B7E\u5230\u4E8C\u7EF4\u7801", description: "\u6295\u5C4F\u6216\u6253\u5370\u5F20\u8D34\u5728\u73B0\u573A\uFF0C\u53C2\u4F1A\u540C\u5B66\u626B\u7801\u5B8C\u6210\u7B7E\u5230\u3002", size: "md", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", onClick: () => setQrOpen(false), children: "\u5173\u95ED" }), _jsx(Button, { variant: "primary", onClick: () => void printQr(), disabled: !qrPayload, children: "\u6253\u5370\u4E8C\u7EF4\u7801" })] }), children: _jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(QrPanel, { payload: qrPayload || 'STI-CHECKIN:pending', title: qrTitle || '活动签到', subtitle: qrLoading ? '正在获取二维码数据…' : qrPayload }), _jsxs("div", { className: "rounded-2xl border border-white/8 bg-white/[0.025] p-4", children: [_jsx("p", { className: "mb-3 text-[12px] font-medium text-foreground/90", children: "\u7B7E\u5230\u6D41\u7A0B" }), _jsx("ol", { className: "flex flex-col gap-2.5 text-[12px] leading-relaxed text-muted-foreground", children: [
                                        '活动开始前 15 分钟，把本二维码投屏到签到台显示屏，或打印后张贴在入口。',
                                        '同学用微信 / 相机扫码，进入签到页并确认姓名、学号后提交。',
                                        '工作人员在「报名名单」中核对，必要时用表格中的开关手动补签或取消签到。',
                                        '签到结束后点击「导出报名名单」，CSV 中的「已签到」列即为现场签到结果。',
                                    ].map((s, i) => (_jsxs("li", { className: "flex gap-2.5", children: [_jsx("span", { className: "mono mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] text-primary", children: i + 1 }), _jsx("span", { children: s })] }, i))) })] })] }) })] }));
}
function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

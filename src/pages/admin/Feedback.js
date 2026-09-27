import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Hourglass, Mail, MessageSquare, Phone, ThumbsUp, Timer, Trash2, UserRound, } from 'lucide-react';
import { AdminApi } from '@/lib/api';
import { useTitle } from '@/lib/hooks';
import { useToast } from '@/lib/store';
import { FEEDBACK_TYPES, cn, fdatetime, fromNow, plain } from '@/lib/utils';
import { Button, Chip, ConfirmDialog, ErrorState, Field, Glass, Modal, Pagination, Select, Skeleton, Textarea, } from '@/components/ui';
import { AdminPage, ExportButton, StatTile } from '@/components/AdminKit';
const PAGE_SIZE = 10;
/** 后端种子数据中同时存在 answered / replied 两种“已回复”状态 */
const STATUS_LABEL = {
    open: '待处理',
    replied: '已回复',
    answered: '已回复',
    closed: '已关闭',
};
const STATUS_FILTERS = [
    { value: 'all', label: '全部状态' },
    { value: 'open', label: '待处理' },
    { value: 'replied', label: '已回复' },
    { value: 'closed', label: '已关闭' },
];
const TYPE_FILTERS = [
    { value: 'all', label: '全部类型' },
    ...Object.entries(FEEDBACK_TYPES).map(([value, label]) => ({ value, label })),
];
const TYPE_TONE = {
    consult: 'primary',
    suggestion: 'accent',
    question: 'warning',
    vote: 'success',
};
/* =============================================================================
 * 留言反馈管理 /admin/feedback
 * ========================================================================== */
export default function AdminFeedback() {
    useTitle('留言反馈管理');
    const toast = useToast();
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('all');
    const [type, setType] = useState('all');
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    /** 全量数据：用于统计与状态筛选计数 */
    const [allItems, setAllItems] = useState([]);
    const [replyTarget, setReplyTarget] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);
    const [confirmDel, setConfirmDel] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const reload = useCallback(() => setReloadKey((k) => k + 1), []);
    useEffect(() => {
        let alive = true;
        setLoading(true);
        AdminApi.feedback({ page, pageSize: PAGE_SIZE, status, type })
            .then((res) => {
            if (!alive)
                return;
            setRows((res.data?.items ?? []));
            setTotal(Number(res.data?.total ?? 0));
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
    }, [page, status, type, reloadKey]);
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const first = await AdminApi.feedback({ page: 1, pageSize: 100 });
                const all = Number(first.data?.total ?? 0);
                let items = (first.data?.items ?? []);
                const pages = Math.min(20, Math.ceil(all / 100));
                for (let p = 2; p <= pages; p++) {
                    const next = await AdminApi.feedback({ page: p, pageSize: 100 });
                    items = items.concat((next.data?.items ?? []));
                }
                if (alive)
                    setAllItems(items);
            }
            catch {
                /* 统计失败不影响主列表 */
            }
        })();
        return () => {
            alive = false;
        };
    }, [reloadKey]);
    /* ------------------------------ 统计 ------------------------------ */
    const stats = useMemo(() => {
        const isReplied = (s) => s === 'replied' || s === 'answered';
        const open = allItems.filter((f) => f.status === 'open').length;
        const replied = allItems.filter((f) => isReplied(f.status)).length;
        const closed = allItems.filter((f) => f.status === 'closed').length;
        const spans = allItems
            .filter((f) => isReplied(f.status) && f.repliedAt)
            .map((f) => {
            const a = new Date(String(f.createdAt).replace(' ', 'T')).getTime();
            const b = new Date(String(f.repliedAt).replace(' ', 'T')).getTime();
            return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, b - a) : null;
        })
            .filter((n) => n !== null);
        const avgMs = spans.length ? spans.reduce((a, b) => a + b, 0) / spans.length : null;
        const avgLabel = avgMs === null ? '—' : avgMs < 3600_000 ? `${Math.max(1, Math.round(avgMs / 60000))} 分钟` : avgMs < 86400_000 ? `${(avgMs / 3600000).toFixed(1)} 小时` : `${(avgMs / 86400000).toFixed(1)} 天`;
        const totalLikes = allItems.reduce((a, f) => a + (f.likes || 0), 0);
        return { open, replied, closed, total: allItems.length, avgLabel, samples: spans.length, totalLikes };
    }, [allItems]);
    const countOfStatus = useCallback((v) => {
        if (v === 'all')
            return stats.total;
        if (v === 'replied')
            return allItems.filter((f) => f.status === 'replied' || f.status === 'answered').length;
        return allItems.filter((f) => f.status === v).length;
    }, [allItems, stats.total]);
    /* ------------------------------ 操作 ------------------------------ */
    const openReply = (row) => {
        setReplyTarget(row);
        setReplyText(row.reply ?? '');
    };
    const submitReply = async () => {
        if (!replyTarget)
            return;
        if (!replyText.trim()) {
            toast.error('请填写回复内容');
            return;
        }
        setReplying(true);
        try {
            await AdminApi.replyFeedback(replyTarget.id, replyText.trim());
            toast.success('回复已发送', plain(replyTarget.title, 24));
            setReplyTarget(null);
            setReplyText('');
            reload();
        }
        catch (e) {
            toast.error('回复失败', e.message);
        }
        finally {
            setReplying(false);
        }
    };
    const setMessageStatus = async (row, next) => {
        setBusyId(row.id);
        try {
            await AdminApi.replyFeedback(row.id, '', next);
            toast.success(next === 'closed' ? '已关闭该留言' : '已重新打开', plain(row.title, 24));
            reload();
        }
        catch (e) {
            toast.error('操作失败', e.message);
        }
        finally {
            setBusyId(null);
        }
    };
    const remove = async () => {
        if (!confirmDel)
            return;
        setDeleting(true);
        try {
            await AdminApi.deleteFeedback(confirmDel.id);
            toast.success('已删除留言', plain(confirmDel.title, 24));
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
    /* ------------------------------ 卡片 ------------------------------ */
    const Card = ({ row }) => {
        const replied = row.status === 'replied' || row.status === 'answered';
        const displayName = row.anonymous ? '匿名' : row.authorName || '未填写';
        return (_jsxs(Glass, { tone: "soft", hover: true, className: "flex flex-col gap-4 p-5", "data-reveal": true, children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { className: "flex min-w-0 flex-wrap items-center gap-2", children: [_jsx(Chip, { tone: TYPE_TONE[row.type] ?? 'default', className: "!px-2.5 !py-0.5", children: FEEDBACK_TYPES[row.type] ?? row.type }), _jsx("span", { className: cn('chip !px-2.5 !py-0.5', row.status === 'open' ? 'chip-warning' : replied ? 'chip-success' : ''), children: STATUS_LABEL[row.status] ?? row.status }), _jsxs("span", { className: "mono text-[11px] text-muted-foreground", children: ["#", row.id] })] }), _jsx("span", { className: "mono shrink-0 text-[11px] text-muted-foreground", title: fdatetime(row.createdAt), children: fromNow(row.createdAt) })] }), _jsxs("div", { className: "min-w-0", children: [_jsx("h3", { className: "text-[15px] font-medium leading-snug text-foreground/95", children: row.title }), _jsx("p", { className: "mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/75", children: row.content })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(UserRound, { className: "h-3.5 w-3.5" }), _jsx("span", { className: row.anonymous ? 'italic opacity-80' : '', children: displayName }), row.userId ? _jsx("span", { className: "mono opacity-70", children: "\u00B7 \u5DF2\u767B\u5F55\u7528\u6237" }) : null] }), row.contact ? (_jsxs("span", { className: "flex min-w-0 items-center gap-1.5", children: [_jsx(Phone, { className: "h-3.5 w-3.5" }), _jsx("span", { className: "mono truncate", children: row.contact })] })) : (_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Mail, { className: "h-3.5 w-3.5" }), _jsx("span", { children: "\u672A\u7559\u8054\u7CFB\u65B9\u5F0F" })] })), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(ThumbsUp, { className: "h-3.5 w-3.5" }), _jsx("span", { className: "mono", children: row.likes }), " \u6B21\u70B9\u8D5E"] })] }), row.reply ? (_jsxs("div", { className: "rounded-2xl border border-[hsl(var(--success))]/22 bg-[hsl(var(--success))]/[0.06] p-4", children: [_jsxs("p", { className: "mb-2 flex items-center gap-2 text-[11px] text-[hsl(var(--success))]", children: [_jsx(MessageSquare, { className: "h-3.5 w-3.5" }), "\u5B98\u65B9\u56DE\u590D", _jsx("span", { className: "mono ml-auto text-muted-foreground", children: row.repliedAt ? fdatetime(row.repliedAt) : '' })] }), _jsx("p", { className: "whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/85", children: row.reply })] })) : null, _jsxs("div", { className: "flex flex-wrap items-center gap-2.5 border-t border-white/8 pt-4", children: [_jsxs(Button, { variant: replied ? 'glass' : 'primary', size: "sm", onClick: () => openReply(row), children: [_jsx(MessageSquare, { className: "h-3.5 w-3.5" }), replied ? '修改回复' : '回复'] }), row.status === 'closed' ? (_jsx(Button, { variant: "glass", size: "sm", loading: busyId === row.id, onClick: () => void setMessageStatus(row, 'open'), children: "\u91CD\u65B0\u6253\u5F00" })) : (_jsx(Button, { variant: "ghost", size: "sm", loading: busyId === row.id, onClick: () => void setMessageStatus(row, 'closed'), children: "\u5173\u95ED" })), _jsxs(Button, { variant: "ghost", size: "sm", className: "ml-auto text-muted-foreground hover:text-[hsl(var(--destructive))]", onClick: () => setConfirmDel(row), children: [_jsx(Trash2, { className: "h-3.5 w-3.5" }), "\u5220\u9664"] })] })] }));
    };
    return (_jsxs(AdminPage, { title: "\u7559\u8A00\u53CD\u9988", breadcrumb: "\u540E\u53F0\u7BA1\u7406 \u00B7 \u4E1A\u52A1\u529E\u7406", icon: _jsx(MessageSquare, { className: "h-5 w-5" }), description: "\u5904\u7406\u540C\u5B66\u4E0E\u8BBF\u5BA2\u7684\u5728\u7EBF\u54A8\u8BE2\u3001\u610F\u89C1\u53CD\u9988\u3001\u95EE\u9898\u89E3\u7B54\u4E0E\u95EE\u5377\u6295\u7968\uFF0C\u56DE\u590D\u4F1A\u540C\u6B65\u63A8\u9001\u5230\u7559\u8A00\u4EBA\u7684\u7AD9\u5185\u6D88\u606F\u3002", actions: _jsx(ExportButton, { kind: "feedback", label: "\u5BFC\u51FA\u7559\u8A00\u6C47\u603B" }), children: [_jsxs("div", { className: "grid grid-cols-2 gap-3 lg:grid-cols-4", "data-reveal": true, children: [_jsx(StatTile, { label: "\u5F85\u5904\u7406", value: stats.open, hint: "\u5C1A\u672A\u56DE\u590D\u7684\u7559\u8A00", tone: "warning", icon: _jsx(Hourglass, { className: "h-4 w-4" }), active: status === 'open', onClick: () => {
                            setStatus(status === 'open' ? 'all' : 'open');
                            setPage(1);
                        } }), _jsx(StatTile, { label: "\u5DF2\u56DE\u590D", value: stats.replied, hint: `已关闭 ${stats.closed} 条`, tone: "success", icon: _jsx(CheckCircle2, { className: "h-4 w-4" }), active: status === 'replied', onClick: () => {
                            setStatus(status === 'replied' ? 'all' : 'replied');
                            setPage(1);
                        } }), _jsx(StatTile, { label: "\u5E73\u5747\u54CD\u5E94", value: stats.avgLabel, hint: stats.samples ? `基于 ${stats.samples} 条已回复留言` : '暂无已回复留言', tone: "primary", icon: _jsx(Timer, { className: "h-4 w-4" }) }), _jsx(StatTile, { label: "\u7D2F\u8BA1\u70B9\u8D5E", value: stats.totalLikes, hint: `全部留言 ${stats.total} 条`, tone: "accent", icon: _jsx(ThumbsUp, { className: "h-4 w-4" }) })] }), _jsxs(Glass, { tone: "soft", className: "flex flex-wrap items-center gap-3 p-4", "data-reveal": true, children: [_jsx(Select, { value: status, onChange: (e) => {
                            setStatus(e.target.value);
                            setPage(1);
                        }, className: "w-auto min-w-[150px]", children: STATUS_FILTERS.map((s) => (_jsxs("option", { value: s.value, children: [s.label, s.value !== 'all' ? `（${countOfStatus(s.value)}）` : `（${stats.total}）`] }, s.value))) }), _jsx(Select, { value: type, onChange: (e) => {
                            setType(e.target.value);
                            setPage(1);
                        }, className: "w-auto min-w-[150px]", children: TYPE_FILTERS.map((t) => (_jsx("option", { value: t.value, children: t.label }, t.value))) }), _jsxs("span", { className: "mono ml-auto flex items-center gap-2 text-[11px] text-muted-foreground", children: [_jsx(BarChart3, { className: "h-3.5 w-3.5" }), "\u5171 ", total, " \u6761 \u00B7 \u7B2C ", page, " / ", Math.max(1, Math.ceil(total / PAGE_SIZE)), " \u9875"] })] }), error ? (_jsx(Glass, { tone: "soft", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : loading ? (_jsx("div", { className: "flex flex-col gap-4", children: Array.from({ length: 3 }).map((_, i) => (_jsx(Skeleton, { className: "h-44" }, i))) })) : rows.length ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex flex-col gap-4", children: rows.map((row) => (_jsx(Card, { row: row }, row.id))) }), _jsxs("div", { className: "flex flex-col items-center justify-between gap-3 sm:flex-row", children: [_jsxs("p", { className: "text-xs text-muted-foreground", children: ["\u5171 ", _jsx("span", { className: "mono text-foreground", children: total }), " \u6761 \u00B7 \u6BCF\u9875 ", PAGE_SIZE, " \u6761"] }), _jsx(Pagination, { page: page, pageSize: PAGE_SIZE, total: total, onChange: setPage })] })] })) : (_jsx(Glass, { tone: "soft", children: _jsxs("div", { className: "flex flex-col items-center justify-center px-6 py-16 text-center", children: [_jsx(MessageSquare, { className: "mb-4 h-8 w-8 text-muted-foreground/70" }), _jsx("h3", { className: "text-base font-medium", children: "\u6682\u65E0\u7559\u8A00" }), _jsx("p", { className: "mt-2 max-w-sm text-sm text-muted-foreground", children: "\u5F53\u524D\u7B5B\u9009\u6761\u4EF6\u4E0B\u6CA1\u6709\u7559\u8A00\u8BB0\u5F55\uFF0C\u6362\u4E2A\u72B6\u6001\u6216\u7C7B\u578B\u518D\u770B\u770B\u3002" }), (status !== 'all' || type !== 'all') && (_jsx(Button, { variant: "glass", size: "sm", className: "mt-5", onClick: () => {
                                setStatus('all');
                                setType('all');
                                setPage(1);
                            }, children: "\u6E05\u7A7A\u7B5B\u9009" }))] }) })), _jsx(Modal, { open: !!replyTarget, onClose: () => {
                    setReplyTarget(null);
                    setReplyText('');
                }, title: replyTarget?.reply ? '修改回复' : '回复留言', description: "\u56DE\u590D\u5185\u5BB9\u4F1A\u5C55\u793A\u5728\u95E8\u6237\u7559\u8A00\u533A\uFF0C\u5E76\u4EE5\u7AD9\u5185\u6D88\u606F\u63A8\u9001\u7ED9\u7559\u8A00\u4EBA\u3002", size: "lg", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", onClick: () => {
                                setReplyTarget(null);
                                setReplyText('');
                            }, disabled: replying, children: "\u53D6\u6D88" }), _jsx(Button, { variant: "primary", onClick: () => void submitReply(), loading: replying, disabled: !replyText.trim(), children: "\u53D1\u9001\u56DE\u590D" })] }), children: replyTarget ? (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs("div", { className: "rounded-2xl border border-white/8 bg-white/[0.03] p-4", children: [_jsxs("div", { className: "mb-2 flex flex-wrap items-center gap-2", children: [_jsx(Chip, { tone: TYPE_TONE[replyTarget.type] ?? 'default', className: "!px-2.5 !py-0.5", children: FEEDBACK_TYPES[replyTarget.type] ?? replyTarget.type }), _jsx("span", { className: "mono text-[11px] text-muted-foreground", children: fdatetime(replyTarget.createdAt) }), _jsxs("span", { className: "mono ml-auto text-[11px] text-muted-foreground", children: [replyTarget.anonymous ? '匿名' : replyTarget.authorName || '未填写', replyTarget.contact ? ` · ${replyTarget.contact}` : ''] })] }), _jsx("p", { className: "text-[14px] font-medium", children: replyTarget.title }), _jsx("p", { className: "mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/75", children: replyTarget.content })] }), _jsx(Field, { label: "\u56DE\u590D\u5185\u5BB9", required: true, hint: "\u5EFA\u8BAE\u8BF4\u660E\u5904\u7406\u7ED3\u8BBA\u3001\u540E\u7EED\u5B89\u6392\u6216\u53EF\u8054\u7CFB\u7684\u5DE5\u4F5C\u4EBA\u5458\uFF0C\u907F\u514D\u4EC5\u56DE\u590D\u201C\u5DF2\u6536\u5230\u201D\u3002", children: _jsx(Textarea, { rows: 6, value: replyText, onChange: (e) => setReplyText(e.target.value), placeholder: "\u4F8B\u5982\uFF1A\u53EF\u4EE5\u8DE8\u5B66\u9662\u7EC4\u961F\uFF0C\u7533\u62A5\u65F6\u7531\u961F\u957F\u6240\u5728\u5B66\u9662\u76D6\u7AE0\u5373\u53EF\uFF0C\u5177\u4F53\u6D41\u7A0B\u89C1\u300A\u5927\u521B\u7533\u62A5\u6307\u5357\u300B\u7B2C 3 \u7AE0\u3002" }) })] })) : null }), _jsx(ConfirmDialog, { open: !!confirmDel, onClose: () => setConfirmDel(null), onConfirm: remove, loading: deleting, title: "\u5220\u9664\u7559\u8A00", confirmText: "\u786E\u8BA4\u5220\u9664", description: _jsxs(_Fragment, { children: ["\u5220\u9664\u540E\u8BE5\u7559\u8A00\u53CA\u5176\u56DE\u590D\u5C06\u65E0\u6CD5\u6062\u590D\u3002", confirmDel && _jsx("span", { className: "mono mt-2 block text-xs text-muted-foreground", children: plain(confirmDel.title, 50) })] }) })] }));
}

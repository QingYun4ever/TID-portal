import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowUpRight, Bell, BellOff, CheckCheck, Inbox, Mail, MailOpen, Trash2, } from 'lucide-react';
import { AuthApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { cn, fdatetime, fromNow } from '@/lib/utils';
import { Button, Chip, ConfirmDialog, EmptyState, ErrorState, Glass, LinkButton, Skeleton } from '@/components/ui';
export default function Messages() {
    const { refresh } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    useTitle('我的消息');
    const [tab, setTab] = useState('all');
    const [busyId, setBusyId] = useState(null);
    const [marking, setMarking] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const { data, meta, loading, error, reload, setData } = useApi(() => AuthApi.messages(), []);
    const list = data ?? [];
    const unread = meta?.unread ?? list.filter((m) => !m.read).length;
    const shown = useMemo(() => (tab === 'unread' ? list.filter((m) => !m.read) : list), [list, tab]);
    const syncStats = () => void refresh();
    /* 单条已读 */
    const markRead = async (m) => {
        if (m.read)
            return;
        setBusyId(m.id);
        try {
            await AuthApi.readMessages(m.id);
            setData(list.map((x) => (x.id === m.id ? { ...x, read: true } : x)));
            syncStats();
        }
        catch (e) {
            toast.error('操作失败', e?.message);
        }
        finally {
            setBusyId(null);
        }
    };
    /* 全部已读 */
    const markAll = async () => {
        if (!unread) {
            toast.info('没有未读消息');
            return;
        }
        setMarking(true);
        try {
            await AuthApi.readMessages();
            setData(list.map((x) => ({ ...x, read: true })));
            syncStats();
            toast.success('已全部标为已读', `共处理 ${unread} 条未读消息。`);
        }
        catch (e) {
            toast.error('操作失败', e?.message);
        }
        finally {
            setMarking(false);
        }
    };
    /* 点击消息：先标已读，若有 link 再跳转 */
    const open = async (m) => {
        await markRead(m);
        if (m.link)
            navigate(m.link);
    };
    const doDelete = async () => {
        if (!confirm)
            return;
        setDeleting(true);
        try {
            await AuthApi.deleteMessage(confirm.id);
            setData(list.filter((x) => x.id !== confirm.id));
            syncStats();
            toast.success('消息已删除');
            setConfirm(null);
        }
        catch (e) {
            toast.error('删除失败', e?.message);
        }
        finally {
            setDeleting(false);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "\u6211\u7684\u6D88\u606F" }), _jsxs("p", { className: "mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground", children: ["\u9879\u76EE\u5BA1\u6838\u7ED3\u679C\u3001\u6D3B\u52A8\u901A\u77E5\u4E0E\u7CFB\u7EDF\u63D0\u9192\u90FD\u4F1A\u53D1\u9001\u5230\u8FD9\u91CC\u3002\u5F53\u524D", _jsxs("span", { className: "mono text-[hsl(var(--warning))]", children: [" ", unread, " "] }), "\u6761\u672A\u8BFB\uFF0C\u5171", _jsxs("span", { className: "mono text-foreground", children: [" ", list.length, " "] }), "\u6761\u3002"] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2.5", children: [_jsxs(Button, { variant: "glass", size: "sm", onClick: markAll, loading: marking, disabled: !unread, children: [_jsx(CheckCheck, { className: "h-3.5 w-3.5" }), " \u5168\u90E8\u6807\u4E3A\u5DF2\u8BFB"] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: reload, children: "\u5237\u65B0" })] })] }), _jsx("div", { className: "inline-flex w-fit gap-1 rounded-full border border-white/10 bg-white/[0.045] p-1 backdrop-blur-xl", children: [
                    { value: 'all', label: '全部', count: list.length },
                    { value: 'unread', label: '未读', count: unread },
                ].map((t) => (_jsxs("button", { type: "button", onClick: () => setTab(t.value), className: cn('rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-300', tab === t.value
                        ? 'bg-white/12 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.22)]'
                        : 'text-muted-foreground hover:text-foreground/85'), children: [t.label, _jsx("span", { className: cn('mono ml-1.5 text-[10px]', tab === t.value ? 'text-primary' : 'text-muted-foreground/70'), children: t.count })] }, t.value))) }), error ? (_jsx(Glass, { tone: "soft", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : loading ? (_jsx("div", { className: "flex flex-col gap-2.5", children: Array.from({ length: 4 }).map((_, i) => (_jsx(Skeleton, { className: "h-[104px]" }, i))) })) : shown.length === 0 ? (_jsx(Glass, { tone: "soft", children: _jsx(EmptyState, { icon: tab === 'unread' ? _jsx(BellOff, { className: "h-5 w-5" }) : _jsx(Inbox, { className: "h-5 w-5" }), title: tab === 'unread' ? '没有未读消息' : '收件箱是空的', description: tab === 'unread'
                        ? '所有消息都已读，保持得不错。'
                        : '提交活动报名或项目申报后，审核进度与系统通知会出现在这里。', action: tab === 'unread' ? (_jsx(Button, { onClick: () => setTab('all'), children: "\u67E5\u770B\u5168\u90E8\u6D88\u606F" })) : (_jsxs("div", { className: "flex flex-wrap justify-center gap-3", children: [_jsx(LinkButton, { to: "/account/applications", variant: "primary", children: "\u6211\u7684\u9879\u76EE" }), _jsx(LinkButton, { to: "/activities", children: "\u6D4F\u89C8\u6D3B\u52A8" })] })) }) })) : (_jsx("ul", { className: "flex flex-col gap-2.5", children: shown.map((m, i) => (_jsx("li", { "data-reveal": "scale", style: { transitionDelay: `${Math.min(i, 6) * 45}ms` }, children: _jsxs(Glass, { tone: "soft", hover: true, className: cn('relative overflow-hidden p-0 transition-colors duration-300', !m.read && 'border-primary/25 bg-primary/[0.045]'), children: [!m.read && _jsx("span", { className: "absolute left-0 top-0 h-full w-[3px] rounded-r-full bg-primary" }), _jsxs("div", { role: "button", tabIndex: 0, "aria-label": `打开消息：${m.title}`, onClick: () => open(m), onKeyDown: (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        void open(m);
                                    }
                                }, className: "flex cursor-pointer items-start gap-4 p-5 pl-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40", children: [_jsx("span", { className: cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border', m.read
                                            ? 'border-white/10 bg-white/[0.04] text-muted-foreground'
                                            : 'border-primary/35 bg-primary/12 text-primary'), children: m.read ? _jsx(MailOpen, { className: "h-4.5 w-4.5" }) : _jsx(Mail, { className: "h-4.5 w-4.5" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [!m.read ? (_jsxs(Chip, { tone: "primary", className: "!px-2 !py-0 !text-[10px]", children: [_jsx(Bell, { className: "h-3 w-3" }), " \u672A\u8BFB"] })) : (_jsx(Chip, { className: "!px-2 !py-0 !text-[10px]", children: "\u5DF2\u8BFB" })), _jsx("h3", { className: cn('clamp-1 text-[14.5px]', m.read ? 'font-medium text-foreground/80' : 'font-semibold'), children: m.title })] }), _jsx("p", { className: "clamp-3 mt-2 text-[13px] leading-relaxed text-muted-foreground", children: m.content }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground", children: [_jsx("span", { className: "mono", title: fdatetime(m.createdAt, true), children: fdatetime(m.createdAt) }), _jsx("span", { children: fromNow(m.createdAt) }), m.link && (_jsxs("button", { type: "button", onClick: (e) => {
                                                            e.stopPropagation();
                                                            void open(m);
                                                        }, className: "inline-flex items-center gap-1 font-medium text-primary transition hover:gap-2", children: ["\u67E5\u770B\u8BE6\u60C5 ", _jsx(ArrowUpRight, { className: "h-3 w-3" })] }))] })] }), _jsxs("div", { className: "flex shrink-0 flex-col items-end gap-2", children: [!m.read && (_jsx(Button, { variant: "ghost", size: "sm", loading: busyId === m.id, onClick: (e) => {
                                                    e.stopPropagation();
                                                    void markRead(m);
                                                }, className: "whitespace-nowrap", children: "\u6807\u4E3A\u5DF2\u8BFB" })), _jsx(Button, { variant: "ghost", size: "icon-sm", "aria-label": "\u5220\u9664\u6D88\u606F", className: "text-muted-foreground hover:text-[hsl(var(--destructive))]", onClick: (e) => {
                                                    e.stopPropagation();
                                                    setConfirm(m);
                                                }, children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) }), m.link && (_jsx(Button, { variant: "glass", size: "sm", onClick: (e) => {
                                                    e.stopPropagation();
                                                    void open(m);
                                                }, className: "whitespace-nowrap", children: "\u524D\u5F80" }))] })] })] }) }, m.id))) })), _jsx(ConfirmDialog, { open: !!confirm, onClose: () => (deleting ? undefined : setConfirm(null)), onConfirm: doDelete, loading: deleting, title: "\u5220\u9664\u6D88\u606F", confirmText: "\u786E\u8BA4\u5220\u9664", description: confirm ? `确定删除「${confirm.title}」吗？删除后无法恢复。` : '' })] }));
}

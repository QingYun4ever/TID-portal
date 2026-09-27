import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { ArrowUpRight, BadgeCheck, CalendarDays, CircleSlash, Clock, MapPin, ShieldCheck, } from 'lucide-react';
import { AuthApi, SubmitApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { cn, fdatetime, fromNow } from '@/lib/utils';
import { Button, Chip, ConfirmDialog, EmptyState, ErrorState, Glass, LinkButton, Skeleton, } from '@/components/ui';
const stamp = (v) => {
    const d = new Date(String(v ?? '').replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};
export default function Signups() {
    const { user } = useAuth();
    const toast = useToast();
    const [tab, setTab] = useState('upcoming');
    const [target, setTarget] = useState(null);
    const [cancelling, setCancelling] = useState(false);
    useTitle('我的报名');
    const { data, loading, error, reload } = useApi(() => AuthApi.signups(), []);
    const grouped = useMemo(() => {
        const now = Date.now();
        const all = data ?? [];
        const upcoming = [];
        const past = [];
        for (const s of all) {
            const end = stamp(s.endAt) || stamp(s.startAt);
            if (end && end < now)
                past.push(s);
            else
                upcoming.push(s);
        }
        upcoming.sort((a, b) => stamp(a.startAt) - stamp(b.startAt));
        past.sort((a, b) => stamp(b.startAt) - stamp(a.startAt));
        return { upcoming, past };
    }, [data]);
    const list = tab === 'upcoming' ? grouped.upcoming : grouped.past;
    const askCancel = (s) => {
        if (!user?.studentId) {
            toast.error('缺少学号', '请先前往「个人资料」补全学号后再取消报名。');
            return;
        }
        setTarget(s);
    };
    const doCancel = async () => {
        if (!target || !user?.studentId)
            return;
        setCancelling(true);
        try {
            await SubmitApi.cancelSignup(target.id, user.studentId);
            toast.success('已取消报名', `「${target.title}」的报名记录已撤销。`);
            setTarget(null);
            reload();
        }
        catch (e) {
            toast.error('取消失败', e?.message);
        }
        finally {
            setCancelling(false);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "\u6211\u7684\u62A5\u540D" }), _jsxs("p", { className: "mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground", children: ["\u5171 ", _jsx("span", { className: "mono text-foreground", children: data?.length ?? 0 }), " \u6761\u62A5\u540D\u8BB0\u5F55\uFF1B \u8FDB\u884C\u4E2D ", _jsx("span", { className: "mono text-foreground", children: grouped.upcoming.length }), " \u573A\uFF0C \u5DF2\u7ED3\u675F ", _jsx("span", { className: "mono text-foreground", children: grouped.past.length }), " \u573A\u3002"] })] }), _jsxs(LinkButton, { to: "/activities", variant: "glass", size: "sm", children: [_jsx(CalendarDays, { className: "h-3.5 w-3.5" }), " \u6D4F\u89C8\u66F4\u591A\u6D3B\u52A8"] })] }), _jsx("div", { className: "inline-flex w-fit gap-1 rounded-full border border-white/10 bg-white/[0.045] p-1 backdrop-blur-xl", children: [
                    { value: 'upcoming', label: '即将开始', count: grouped.upcoming.length },
                    { value: 'past', label: '已结束', count: grouped.past.length },
                ].map((t) => (_jsxs("button", { type: "button", onClick: () => setTab(t.value), className: cn('rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-300', tab === t.value
                        ? 'bg-white/12 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.22)]'
                        : 'text-muted-foreground hover:text-foreground/85'), children: [t.label, _jsx("span", { className: cn('mono ml-1.5 text-[10px]', tab === t.value ? 'text-primary' : 'text-muted-foreground/70'), children: t.count })] }, t.value))) }), error ? (_jsx(Glass, { tone: "soft", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : loading ? (_jsx("div", { className: "grid grid-cols-1 gap-3.5 xl:grid-cols-2", children: Array.from({ length: 4 }).map((_, i) => (_jsx(Skeleton, { className: "h-[168px]" }, i))) })) : list.length === 0 ? (_jsx(Glass, { tone: "soft", children: _jsx(EmptyState, { icon: _jsx(CalendarDays, { className: "h-5 w-5" }), title: tab === 'upcoming' ? '暂无进行中的报名' : '暂无已结束的报名', description: user?.studentId
                        ? '门户会持续发布技术沙龙、创新工作坊与竞赛集训，去活动列表看看有没有感兴趣的。'
                        : '若你已用其他账号报名，请先前往「个人资料」补全学号，报名记录才能与当前账号关联。', action: _jsxs("div", { className: "flex flex-wrap justify-center gap-3", children: [_jsxs(LinkButton, { to: "/activities", variant: "primary", children: [_jsx(CalendarDays, { className: "h-4 w-4" }), " \u53BB\u6D3B\u52A8\u5217\u8868"] }), _jsx(LinkButton, { to: "/account/profile", children: "\u5B8C\u5584\u8D44\u6599" })] }) }) })) : (_jsx("div", { className: "grid grid-cols-1 gap-3.5 xl:grid-cols-2", children: list.map((s, i) => (_jsx(SignupCard, { signup: s, index: i, past: tab === 'past', onCancel: () => askCancel(s) }, s.id))) })), _jsx(ConfirmDialog, { open: !!target, onClose: () => (cancelling ? undefined : setTarget(null)), onConfirm: doCancel, loading: cancelling, title: "\u53D6\u6D88\u6D3B\u52A8\u62A5\u540D", confirmText: "\u786E\u8BA4\u53D6\u6D88", description: target
                    ? `确定要取消「${target.title}」的报名吗？取消后若活动仍在报名期，你可以重新报名。`
                    : '' })] }));
}
/* ------------------------------ 报名卡片 ------------------------------ */
function SignupCard({ signup, index, past, onCancel, }) {
    return (_jsxs(Glass, { tone: "soft", hover: true, sheen: true, className: "flex h-full flex-col p-5", "data-reveal": "scale", style: { transitionDelay: `${Math.min(index, 5) * 55}ms` }, children: [_jsxs("div", { className: "flex items-start gap-4", children: [_jsxs("div", { className: "flex w-14 shrink-0 flex-col items-center rounded-2xl border border-white/10 bg-white/[0.045] py-2.5", children: [_jsxs("span", { className: "mono text-[10px] uppercase text-muted-foreground", children: [fdatetime(signup.startAt).slice(5, 7), "\u6708"] }), _jsx("span", { className: "mono text-xl font-semibold leading-tight text-foreground", children: fdatetime(signup.startAt).slice(8, 10) }), _jsx("span", { className: "mono text-[9px] text-muted-foreground", children: fdatetime(signup.startAt).slice(0, 4) })] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [past ? (_jsx(Chip, { tone: "success", className: "!px-2.5 !py-0.5", children: "\u5DF2\u7ED3\u675F" })) : (_jsx(Chip, { tone: "warning", className: "!px-2.5 !py-0.5", children: "\u5373\u5C06\u5F00\u59CB" })), signup.checkedIn ? (_jsxs(Chip, { tone: "primary", className: "!px-2.5 !py-0.5", children: [_jsx(BadgeCheck, { className: "h-3 w-3" }), " \u5DF2\u7B7E\u5230"] })) : (_jsxs(Chip, { className: "!px-2.5 !py-0.5", children: [_jsx(CircleSlash, { className: "h-3 w-3" }), " \u672A\u7B7E\u5230"] }))] }), _jsx("h3", { className: "clamp-2 mt-2.5 text-[15px] font-semibold leading-snug", children: signup.title }), _jsxs("p", { className: "mono mt-1.5 text-[11px] text-muted-foreground", children: ["\u62A5\u540D\u4E8E ", fromNow(signup.createdAt), " \u00B7 ", fdatetime(signup.createdAt)] })] })] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/8 pt-4 text-[11.5px] text-muted-foreground", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Clock, { className: "h-3.5 w-3.5" }), _jsxs("span", { className: "mono", children: [fdatetime(signup.startAt), signup.endAt ? ` — ${fdatetime(signup.endAt).slice(5)}` : ''] })] }), signup.location && (_jsxs("span", { className: "clamp-1 flex items-center gap-1.5", children: [_jsx(MapPin, { className: "h-3.5 w-3.5 shrink-0" }), signup.location] }))] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-2.5", children: [_jsxs(LinkButton, { to: `/activities/${signup.slug}`, size: "sm", className: "flex-1 sm:flex-none", children: [_jsx(ArrowUpRight, { className: "h-3.5 w-3.5" }), " \u67E5\u770B\u6D3B\u52A8"] }), _jsxs(Button, { variant: "ghost", size: "sm", onClick: onCancel, className: "text-[hsl(var(--destructive))]", children: [_jsx(ShieldCheck, { className: "h-3.5 w-3.5" }), " \u53D6\u6D88\u62A5\u540D"] }), _jsxs("span", { className: "mono ml-auto text-[10.5px] text-muted-foreground/70", children: ["# ", signup.id] })] })] }));
}

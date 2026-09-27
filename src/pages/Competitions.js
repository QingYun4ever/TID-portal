import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { ArrowUpRight, BellRing, Building2, CalendarClock, CircleSlash, Mail, Trophy, } from 'lucide-react';
import { PublicApi, SubmitApi } from '@/lib/api';
import { useApi, useDebounced, useRevealScan, useTitle } from '@/lib/hooks';
import { useToast } from '@/lib/store';
import { cn, countdown, daysLeft, fdate } from '@/lib/utils';
import { CompetitionCard } from '@/components/cards';
import { Button, Chip, Countdown, EmptyState, ErrorState, Field, Glass, Input, Modal, PageHero, SearchInput, Skeleton, Tabs, } from '@/components/ui';
/* =============================================================================
 * 竞赛信息 /competitions
 *  - 级别 Tabs（全部/国家级/省级/校级，带数量）+ 搜索
 *  - 顶部突出「最近截止」竞赛（大字 + 实时倒计时）
 *  - 每张卡支持订阅截止提醒（邮箱）
 *  - 已截止竞赛灰化并归入「已结束」
 * ========================================================================== */
const LEVEL_ORDER = ['国家级', '省级', '校级'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** 是否已截止（无截止时间视为未截止） */
function isExpired(c) {
    if (!c?.signupDeadline)
        return false;
    const d = daysLeft(c.signupDeadline);
    return d !== null && d < 0;
}
export default function Competitions() {
    useTitle('竞赛信息');
    const toast = useToast();
    const [level, setLevel] = useState('all');
    const [qInput, setQInput] = useState('');
    const q = useDebounced(qInput, 320);
    const [subscribeTarget, setSubscribeTarget] = useState(null);
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState(null);
    const [sending, setSending] = useState(false);
    const { data, meta, loading, error, reload } = useApi(() => PublicApi.competitions({ q, level }), [level, q]);
    const items = data ?? [];
    const levelCounts = useMemo(() => {
        const out = {};
        for (const l of (meta?.levels ?? []))
            out[l.name] = l.count;
        return out;
    }, [meta]);
    useRevealScan(`competitions-${level}-${q}-${items.length}`);
    const active = useMemo(() => items.filter((c) => !isExpired(c)), [items]);
    const expired = useMemo(() => items.filter((c) => isExpired(c)), [items]);
    const featured = active[0] ?? null;
    const rest = active.slice(1);
    const tabs = [
        { value: 'all', label: '全部级别', count: LEVEL_ORDER.reduce((s, k) => s + (levelCounts[k] ?? 0), 0) },
        ...LEVEL_ORDER.map((k) => ({ value: k, label: k, count: levelCounts[k] ?? 0 })),
    ];
    const openSubscribe = (c) => {
        setSubscribeTarget(c);
        setEmailError(null);
    };
    const closeSubscribe = () => {
        if (sending)
            return;
        setSubscribeTarget(null);
        setEmail('');
        setEmailError(null);
    };
    const submitSubscribe = async () => {
        const value = email.trim();
        if (!value) {
            setEmailError('请输入邮箱地址');
            return;
        }
        if (!EMAIL_RE.test(value)) {
            setEmailError('邮箱格式不正确，请检查后重试');
            return;
        }
        if (!subscribeTarget)
            return;
        setEmailError(null);
        setSending(true);
        try {
            await SubmitApi.subscribeCompetition(subscribeTarget.id, value);
            toast.success('订阅成功', `「${subscribeTarget.title}」截止前，我们会通过 ${value} 提醒你。`);
            setSubscribeTarget(null);
            setEmail('');
        }
        catch (e) {
            toast.error('订阅失败', e?.message || '请稍后重试');
        }
        finally {
            setSending(false);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx(PageHero, { eyebrow: "Competitions", title: "\u7ADE\u8D5B\u4FE1\u606F", description: "\u805A\u5408\u56FD\u5BB6\u7EA7\u3001\u7701\u7EA7\u4E0E\u6821\u7EA7\u8D5B\u4E8B\u4FE1\u606F\uFF0C\u6309\u622A\u6B62\u65F6\u95F4\u5148\u540E\u6392\u5217\u3002\u8BA2\u9605\u622A\u6B62\u63D0\u9192\uFF0C\u4E0D\u9519\u8FC7\u4EFB\u4F55\u4E00\u6B21\u62A5\u540D\u7A97\u53E3\u3002", breadcrumb: [{ label: '竞赛信息' }], children: _jsxs("div", { className: "flex flex-wrap items-center gap-x-5 gap-y-2.5 text-[12px] text-muted-foreground", children: [_jsxs("span", { className: "mono flex items-center gap-1.5", children: [_jsx(Trophy, { className: "h-3.5 w-3.5 text-primary" }), "\u8FDB\u884C\u4E2D ", _jsx("span", { className: "text-foreground", children: active.length }), " \u9879"] }), _jsx("span", { className: "text-white/15", children: "|" }), _jsxs("span", { className: "mono", children: ["\u5DF2\u7ED3\u675F ", expired.length, " \u9879"] }), _jsx("span", { className: "text-white/15", children: "|" }), _jsx("span", { children: "\u6309\u622A\u6B62\u65F6\u95F4\u7531\u8FD1\u5230\u8FDC\u6392\u5E8F" })] }) }), _jsx("div", { className: "shell pb-24", children: error ? (_jsx(Glass, { tone: "soft", className: "p-4", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", "data-reveal": true, children: [_jsx(Tabs, { items: tabs, value: level, onChange: setLevel }), _jsx(SearchInput, { value: qInput, onChange: setQInput, placeholder: "\u641C\u7D22\u7ADE\u8D5B\u540D\u79F0\u3001\u4E3B\u529E\u65B9\u2026", className: "w-full sm:w-72" })] }), loading ? (_jsxs("div", { className: "flex flex-col gap-8", children: [_jsx(Skeleton, { className: "h-[268px]" }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: Array.from({ length: 6 }).map((_, i) => (_jsx(Skeleton, { className: "h-[286px]" }, i))) })] })) : !items.length ? (_jsx(Glass, { tone: "soft", children: _jsx(EmptyState, { icon: _jsx(Trophy, { className: "h-5 w-5" }), title: "\u6CA1\u6709\u627E\u5230\u76F8\u5173\u7ADE\u8D5B", description: q ? '换个关键词试试，或切换到其他级别查看。' : '该级别下暂时没有已发布的竞赛信息。', action: _jsx(Button, { onClick: () => {
                                        setQInput('');
                                        setLevel('all');
                                    }, children: "\u67E5\u770B\u5168\u90E8\u7ADE\u8D5B" }) }) })) : (_jsxs("div", { className: "flex flex-col gap-14", children: [featured && (_jsxs("section", { "data-reveal": true, children: [_jsxs("div", { className: "mb-5 flex items-center gap-2.5", children: [_jsx(CalendarClock, { className: "h-4 w-4 text-[hsl(var(--warning))]" }), _jsx("h2", { className: "text-[15px] font-semibold", children: "\u6700\u8FD1\u622A\u6B62" }), _jsx("span", { className: "mono text-[11px] text-muted-foreground", children: "\u6309\u622A\u6B62\u65F6\u95F4\u53D6\u6700\u8FD1\u4E00\u9879" })] }), _jsx(FeaturedCompetition, { competition: featured, onSubscribe: openSubscribe })] })), rest.length > 0 && (_jsxs("section", { children: [_jsxs("div", { className: "mb-5 flex flex-wrap items-end justify-between gap-3", "data-reveal": true, children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(Trophy, { className: "h-4 w-4 text-primary" }), _jsx("h2", { className: "text-[15px] font-semibold", children: "\u5168\u90E8\u8FDB\u884C\u4E2D\u7ADE\u8D5B" })] }), _jsxs("span", { className: "mono text-[11px] text-muted-foreground", children: ["\u5171 ", rest.length, " \u9879"] })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: rest.map((c, i) => (_jsx(CompetitionItem, { competition: c, index: i, onSubscribe: openSubscribe }, c.id))) })] })), !featured && rest.length === 0 && (_jsx(Glass, { tone: "soft", children: _jsx(EmptyState, { icon: _jsx(CircleSlash, { className: "h-5 w-5" }), title: "\u5F53\u524D\u6CA1\u6709\u8FDB\u884C\u4E2D\u7684\u7ADE\u8D5B", description: "\u6240\u6709\u5DF2\u53D1\u5E03\u7684\u7ADE\u8D5B\u5747\u5DF2\u622A\u6B62\uFF0C\u53EF\u5728\u4E0B\u65B9\u300C\u5DF2\u7ED3\u675F\u300D\u533A\u57DF\u56DE\u987E\u3002" }) })), expired.length > 0 && (_jsxs("section", { children: [_jsxs("div", { className: "mb-5 flex flex-wrap items-end justify-between gap-3", "data-reveal": true, children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(CircleSlash, { className: "h-4 w-4 text-muted-foreground" }), _jsx("h2", { className: "text-[15px] font-semibold text-muted-foreground", children: "\u5DF2\u7ED3\u675F" }), _jsx("span", { className: "mono text-[11px] text-muted-foreground/70", children: "\u4EC5\u4F9B\u56DE\u987E\uFF0C\u65E0\u6CD5\u518D\u8BA2\u9605\u63D0\u9192" })] }), _jsxs("span", { className: "mono text-[11px] text-muted-foreground", children: ["\u5171 ", expired.length, " \u9879"] })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: expired.map((c, i) => (_jsx(CompetitionItem, { competition: c, index: i, expired: true, onSubscribe: openSubscribe }, c.id))) })] }))] }))] })) }), _jsx(Modal, { open: !!subscribeTarget, onClose: closeSubscribe, size: "sm", title: "\u8BA2\u9605\u622A\u6B62\u63D0\u9192", description: subscribeTarget ? `赛事：${subscribeTarget.title}` : undefined, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", onClick: closeSubscribe, disabled: sending, children: "\u53D6\u6D88" }), _jsxs(Button, { variant: "primary", onClick: submitSubscribe, loading: sending, children: [_jsx(Mail, { className: "h-4 w-4" }), "\u786E\u8BA4\u8BA2\u9605"] })] }), children: _jsxs("div", { className: "flex flex-col gap-5", children: [_jsx(Field, { label: "\u63A5\u6536\u63D0\u9192\u7684\u90AE\u7BB1", required: true, error: emailError, hint: "\u622A\u6B62\u524D 7 \u5929\u4E0E 3 \u5929\u5404\u53D1\u9001\u4E00\u6B21\u63D0\u9192\uFF0C\u6211\u4EEC\u4E0D\u4F1A\u7528\u4E8E\u5176\u4ED6\u7528\u9014\u3002", children: _jsx(Input, { type: "email", value: email, onChange: (e) => {
                                    setEmail(e.target.value);
                                    if (emailError)
                                        setEmailError(null);
                                }, onKeyDown: (e) => e.key === 'Enter' && submitSubscribe(), placeholder: "you@example.com", autoComplete: "email" }) }), subscribeTarget?.signupDeadline && (_jsxs(Glass, { tone: "thin", className: "flex flex-wrap items-center justify-between gap-3 px-4 py-3", children: [_jsxs("span", { className: "mono text-[11.5px] text-muted-foreground", children: ["\u62A5\u540D\u622A\u6B62 ", _jsx("span", { className: "text-foreground/90", children: fdate(subscribeTarget.signupDeadline) })] }), _jsx(Countdown, { target: subscribeTarget.signupDeadline, className: "text-[12px]" })] }))] }) })] }));
}
/* =============================================================================
 * 最近截止（大字 + 实时倒计时）
 * ========================================================================== */
function FeaturedCompetition({ competition, onSubscribe, }) {
    const cd = countdown(competition.signupDeadline);
    const urgent = cd && !cd.expired && cd.days <= 7;
    return (_jsxs(Glass, { tone: "strong", className: "relative overflow-hidden p-7 sm:p-9", children: [_jsx("div", { "aria-hidden": true, className: "pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-70 blur-3xl", style: { background: 'radial-gradient(circle, hsl(var(--warning) / .22), transparent 68%)' } }), _jsxs("div", { className: "relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-12", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2.5", children: [_jsx(Chip, { tone: competition.level === '国家级' ? 'primary' : competition.level === '省级' ? 'accent' : 'success', children: competition.level }), urgent && _jsx(Chip, { tone: "danger", children: "\u5373\u5C06\u622A\u6B62" }), _jsx("span", { className: "mono text-[11px] text-muted-foreground", children: "\u8DDD\u622A\u6B62\u6700\u8FD1" })] }), _jsx("h3", { className: "mt-4 text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-3xl", children: competition.title }), _jsxs("p", { className: "mt-3 flex items-center gap-2 text-[12.5px] text-muted-foreground", children: [_jsx(Building2, { className: "h-3.5 w-3.5 shrink-0" }), _jsx("span", { className: "clamp-1", children: competition.organizer })] }), _jsx("p", { className: "clamp-3 mt-4 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground", children: competition.summary }), _jsxs("div", { className: "mt-6 flex flex-wrap items-center gap-3", children: [_jsxs(Button, { variant: urgent ? 'primary' : 'glass', onClick: () => onSubscribe(competition), children: [_jsx(BellRing, { className: "h-4 w-4" }), "\u8BA2\u9605\u622A\u6B62\u63D0\u9192"] }), competition.link && (_jsxs("a", { href: competition.link, target: "_blank", rel: "noreferrer noopener", className: "btn btn-glass", children: ["\u524D\u5F80\u8D5B\u4E8B\u5B98\u7F51 ", _jsx(ArrowUpRight, { className: "h-4 w-4" })] }))] })] }), _jsxs("div", { className: "flex flex-col justify-center rounded-3xl border border-white/10 bg-white/[0.035] p-6", children: [_jsx("p", { className: "text-[11px] uppercase tracking-[0.28em] text-muted-foreground", children: "\u62A5\u540D\u622A\u6B62\u5012\u8BA1\u65F6" }), _jsx("p", { className: "mono mt-4 text-3xl font-semibold leading-none sm:text-4xl", children: _jsx(Countdown, { target: competition.signupDeadline }) }), _jsxs("div", { className: "mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/8 pt-4 text-[11.5px] text-muted-foreground", children: [_jsxs("span", { className: "mono", children: ["\u622A\u6B62\u65E5\u671F ", _jsx("span", { className: "text-foreground/90", children: fdate(competition.signupDeadline) })] }), cd && !cd.expired && (_jsxs("span", { className: "mono", children: ["\u5269\u4F59 ", _jsx("span", { className: "text-foreground/90", children: cd.days }), " \u5929"] }))] })] })] })] }));
}
/* =============================================================================
 * 竞赛条目（卡片 + 订阅按钮；已截止灰化）
 * ========================================================================== */
function CompetitionItem({ competition, index, expired = false, onSubscribe, }) {
    return (_jsxs("div", { className: cn('flex h-full flex-col', expired && 'opacity-55 saturate-50'), "data-reveal": "scale", style: { transitionDelay: `${(index % 6) * 55}ms` }, children: [_jsx("div", { className: "flex-1", children: _jsx(CompetitionCard, { competition: competition }) }), _jsx("div", { className: "mt-3 flex items-center gap-2.5", children: _jsxs(Button, { size: "sm", variant: expired ? 'ghost' : 'glass', disabled: expired, onClick: () => onSubscribe(competition), className: "flex-1", children: [expired ? _jsx(CircleSlash, { className: "h-3.5 w-3.5" }) : _jsx(BellRing, { className: "h-3.5 w-3.5" }), expired ? '报名已截止' : '订阅截止提醒'] }) })] }));
}

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { AlertTriangle, ArrowRight, Building2, CalendarClock, CalendarDays, CheckCircle2, Clock, Download, FileText, Hourglass, Info, Lock, LogIn, MapPin, Paperclip, Send, ShieldCheck, Sparkles, Users, } from 'lucide-react';
import { PublicApi, SubmitApi } from '@/lib/api';
import { useApi, useRevealScan, useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { cn, countdown, daysLeft, fbytes, fdatetime, fnum, fweek } from '@/lib/utils';
import { Button, Chip, Countdown, EmptyState, ErrorState, Field, Glass, Input, LinkButton, PageHero, ProgressBar, Skeleton, Textarea, } from '@/components/ui';
const EMPTY_FORM = {
    name: '',
    studentId: '',
    college: '',
    major: '',
    phone: '',
    email: '',
    remark: '',
};
function validateSignup(f) {
    const e = {};
    const name = f.name.trim();
    if (!name)
        e.name = '请填写姓名';
    else if (!/^[\u4e00-\u9fa5A-Za-z·\s]{2,20}$/.test(name))
        e.name = '姓名格式不正确（2–20 位中英文字符）';
    const sid = f.studentId.trim();
    if (!sid)
        e.studentId = '请填写学号';
    else if (!/^[A-Za-z0-9]{4,20}$/.test(sid))
        e.studentId = '学号应为 4–20 位字母或数字';
    if (!f.college.trim())
        e.college = '请填写所在学院';
    if (!f.major.trim())
        e.major = '请填写专业';
    const phone = f.phone.trim();
    if (!phone)
        e.phone = '请填写手机号';
    else if (!/^1[3-9]\d{9}$/.test(phone))
        e.phone = '手机号格式不正确（11 位，1 开头）';
    const email = f.email.trim();
    if (email && !/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(email))
        e.email = '邮箱格式不正确';
    if (f.remark.length > 200)
        e.remark = '备注请控制在 200 字以内';
    return e;
}
/** 隐私友好展示：仅保留姓氏，其余字符打码 */
function maskName(name) {
    const s = (name || '').trim();
    if (!s)
        return '同学';
    if (/[\u4e00-\u9fa5]/.test(s))
        return s.slice(0, 1) + '＊'.repeat(Math.max(1, s.length - 1));
    return s.slice(0, 1) + '***';
}
export default function ActivityDetail() {
    const { slug = '' } = useParams();
    const toast = useToast();
    const { user } = useAuth();
    const { data, meta, loading, error, reload } = useApi(() => PublicApi.activity(slug), [slug]);
    useTitle(data?.title ?? '活动详情');
    const [mine, setMine] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [touchedForm, setTouchedForm] = useState(false);
    const activity = data ?? null;
    const signups = meta?.signups ?? [];
    const attachments = meta?.attachments ?? [];
    /* 详情数据与报名状态变化后重新扫描滚动揭示元素 */
    useRevealScan(`activity|${loading}|${mine}|${signups.length}|${attachments.length}`);
    /* ------------------------------ 报名状态 ------------------------------ */
    const status = useMemo(() => {
        if (!activity)
            return { closed: true, reason: '', capacityFull: false };
        const now = Date.now();
        const at = (v) => (v ? new Date(String(v).replace(' ', 'T')).getTime() : null);
        const capacity = Number(activity.capacity ?? 0);
        const signed = Number(activity.signedCount ?? 0);
        const capacityFull = capacity > 0 && signed >= capacity;
        const endAt = at(activity.signupEnd);
        const startAt = at(activity.signupStart);
        const deadlinePassed = endAt !== null && endAt <= now;
        const notStarted = startAt !== null && startAt > now;
        let reason = '';
        if (activity.status !== 'published')
            reason = '该活动暂未开放报名';
        else if (capacityFull)
            reason = '报名名额已满';
        else if (deadlinePassed)
            reason = `报名已于 ${fdatetime(activity.signupEnd)} 截止`;
        else if (notStarted)
            reason = `报名将于 ${fdatetime(activity.signupStart)} 开始`;
        else if (activity.signupOpen === false)
            reason = '当前不在报名开放时间内';
        return { closed: !!reason, reason, capacityFull };
    }, [activity]);
    /* -------------------------- 登录用户预填信息 -------------------------- */
    useEffect(() => {
        if (!user || touchedForm)
            return;
        setForm((f) => ({
            ...f,
            name: f.name || user.name || '',
            studentId: f.studentId || user.studentId || '',
            college: f.college || user.college || '',
            phone: f.phone || user.phone || '',
            email: f.email || user.email || '',
        }));
    }, [user, touchedForm]);
    const set = (k, v) => {
        setTouchedForm(true);
        setForm((f) => ({ ...f, [k]: v }));
        setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
    };
    const submit = async (e) => {
        e.preventDefault();
        if (!activity)
            return;
        setServerError(null);
        const errs = validateSignup(form);
        setErrors(errs);
        if (Object.keys(errs).length) {
            toast.error('报名信息不完整', '请检查标红的字段后重新提交');
            return;
        }
        setBusy(true);
        try {
            await SubmitApi.signupActivity(Number(activity.id), {
                name: form.name.trim(),
                studentId: form.studentId.trim(),
                college: form.college.trim(),
                major: form.major.trim(),
                phone: form.phone.trim(),
                email: form.email.trim() || null,
                remark: form.remark.trim() || null,
            });
            setMine(true);
            toast.success('报名成功', `你已成功报名「${activity.title}」。`);
            reload();
        }
        catch (err) {
            const msg = err?.message || '报名失败，请稍后重试';
            setServerError(msg);
            toast.error('报名失败', msg);
        }
        finally {
            setBusy(false);
        }
    };
    /* ------------------------------- 状态页 ------------------------------- */
    if (loading && !activity)
        return (_jsxs(_Fragment, { children: [_jsx(PageHero, { eyebrow: "Event Detail", title: "\u6D3B\u52A8\u8BE6\u60C5", breadcrumb: [{ label: '活动报名', to: '/activities' }, { label: '加载中…' }] }), _jsx("section", { className: "shell pb-24", children: _jsxs("div", { className: "grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]", children: [_jsxs("div", { className: "flex min-w-0 flex-col gap-6", children: [_jsx(Skeleton, { className: "h-36" }), _jsx(Skeleton, { className: "h-72" }), _jsx(Skeleton, { className: "h-96" })] }), _jsx(Skeleton, { className: "h-96" })] }) })] }));
    if (error || !activity)
        return (_jsxs(_Fragment, { children: [_jsx(PageHero, { eyebrow: "Event Detail", title: "\u6D3B\u52A8\u4E0D\u5B58\u5728", breadcrumb: [{ label: '活动报名', to: '/activities' }, { label: '未找到' }] }), _jsx("section", { className: "shell pb-24", children: _jsx(Glass, { tone: "soft", children: error ? (_jsx(ErrorState, { message: error, onRetry: reload })) : (_jsx(EmptyState, { icon: _jsx(AlertTriangle, { className: "h-6 w-6" }), title: "\u6D3B\u52A8\u4E0D\u5B58\u5728\u6216\u5DF2\u4E0B\u67B6", description: "\u8BE5\u6D3B\u52A8\u53EF\u80FD\u5DF2\u88AB\u5220\u9664\u6216\u5C1A\u672A\u53D1\u5E03\uFF0C\u8BF7\u8FD4\u56DE\u6D3B\u52A8\u5217\u8868\u6D4F\u89C8\u5176\u4ED6\u5185\u5BB9\u3002", action: _jsx(LinkButton, { to: "/activities", children: "\u8FD4\u56DE\u6D3B\u52A8\u5217\u8868" }) })) }) })] }));
    const capacity = Number(activity.capacity ?? 0);
    const signed = Number(activity.signedCount ?? 0);
    const left = daysLeft(activity.signupEnd);
    const cd = countdown(activity.signupEnd);
    const past = new Date(String(activity.startAt).replace(' ', 'T')).getTime() < Date.now();
    const formDisabled = status.closed || mine;
    return (_jsxs(_Fragment, { children: [_jsx(PageHero, { eyebrow: "Event Detail", title: activity.title, description: activity.summary, breadcrumb: [{ label: '活动报名', to: '/activities' }, { label: activity.title }], children: _jsxs("div", { className: "flex flex-wrap items-center gap-x-4 gap-y-2.5", children: [_jsx(Chip, { tone: "primary", children: activity.category }), past ? (_jsxs(Chip, { tone: "success", children: [_jsx(CheckCircle2, { className: "h-3 w-3" }), "\u6D3B\u52A8\u5DF2\u7ED3\u675F"] })) : status.capacityFull ? (_jsx(Chip, { tone: "danger", children: "\u540D\u989D\u5DF2\u6EE1" })) : status.closed ? (_jsx(Chip, { tone: "warning", children: "\u62A5\u540D\u5DF2\u622A\u6B62" })) : (_jsxs(Chip, { tone: "warning", children: [_jsx(Sparkles, { className: "h-3 w-3" }), "\u62A5\u540D\u8FDB\u884C\u4E2D"] })), _jsxs("span", { className: "mono flex items-center gap-2 text-[11.5px] text-muted-foreground", children: [_jsx(Clock, { className: "h-3.5 w-3.5" }), fdatetime(activity.startAt), " ", fweek(activity.startAt)] }), activity.location && (_jsxs("span", { className: "flex items-center gap-2 text-[11.5px] text-muted-foreground", children: [_jsx(MapPin, { className: "h-3.5 w-3.5" }), activity.location] })), !status.closed && activity.signupEnd && (_jsxs("span", { className: "flex items-center gap-2 text-[11.5px] text-muted-foreground", children: [_jsx(Hourglass, { className: "h-3.5 w-3.5" }), "\u62A5\u540D\u622A\u6B62\u5012\u8BA1\u65F6", _jsx(Countdown, { target: activity.signupEnd, className: "text-[12px] font-medium" })] }))] }) }), _jsx("section", { className: "shell pb-24", children: _jsxs("div", { className: "grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]", children: [_jsxs("div", { className: "flex min-w-0 flex-col gap-8", children: [capacity > 0 && (_jsxs(Glass, { tone: "soft", className: "p-6", "data-reveal": true, children: [_jsxs("div", { className: "flex flex-wrap items-end justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("p", { className: "flex items-center gap-2 text-[13px] text-muted-foreground", children: [_jsx(Users, { className: "h-4 w-4" }), "\u62A5\u540D\u8FDB\u5EA6"] }), _jsxs("p", { className: "mt-2.5 flex items-baseline gap-2", children: [_jsx("span", { className: "mono text-3xl font-semibold tabular-nums text-primary", children: fnum(signed) }), _jsxs("span", { className: "mono text-[13px] text-muted-foreground", children: ["/ ", fnum(capacity), " \u4EBA"] })] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("p", { className: "text-[12px] text-muted-foreground", children: ["\u5269\u4F59\u540D\u989D", _jsx("span", { className: cn('mono ml-2 text-[15px] font-semibold', capacity - signed <= 0 ? 'text-[hsl(var(--destructive))]' : 'text-foreground'), children: Math.max(0, capacity - signed) })] }), !status.closed && activity.signupEnd && (_jsxs("p", { className: "mono mt-1.5 text-[11.5px] text-muted-foreground", children: ["\u622A\u6B62 ", fdatetime(activity.signupEnd), left !== null && left >= 0 && _jsxs("span", { className: "ml-2 text-[hsl(var(--warning))]", children: ["\u8FD8\u6709 ", left, " \u5929"] })] }))] })] }), _jsx(ProgressBar, { value: signed, max: capacity, tone: status.capacityFull ? 'danger' : signed / capacity > 0.8 ? 'warning' : 'primary', height: 8, className: "mt-4" }), _jsxs("p", { className: "mt-3 text-[11.5px] text-muted-foreground", children: ["\u540D\u989D\u6709\u9650\uFF0C\u6309\u62A5\u540D\u65F6\u95F4\u5148\u540E\u5F55\u53D6", status.capacityFull ? '；当前名额已满。' : '。'] })] })), _jsxs(Glass, { tone: "soft", className: "p-6 sm:p-8", "data-reveal": "blur", children: [_jsxs("h2", { className: "mb-6 flex items-center gap-2.5 text-[17px] font-semibold", children: [_jsx(FileText, { className: "h-4 w-4 text-primary" }), "\u6D3B\u52A8\u4ECB\u7ECD"] }), _jsx("div", { className: "prose-glass", dangerouslySetInnerHTML: {
                                                __html: activity.content || '<p>暂无更多活动介绍，如有疑问可通过意见反馈联系我们。</p>',
                                            } })] }), attachments.length > 0 && (_jsxs(Glass, { tone: "soft", className: "p-6", "data-reveal": "blur", children: [_jsxs("h2", { className: "mb-4 flex items-center gap-2.5 text-[15px] font-semibold", children: [_jsx(Paperclip, { className: "h-4 w-4 text-primary" }), "\u6D3B\u52A8\u9644\u4EF6"] }), _jsx("div", { className: "flex flex-col gap-2", children: attachments.map((f) => (_jsxs("a", { href: f.url, target: "_blank", rel: "noreferrer noopener", className: "group flex items-center gap-3.5 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 transition-all duration-300 hover:border-primary/35 hover:bg-primary/8", children: [_jsx("span", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] text-primary", children: _jsx(Download, { className: "h-4 w-4" }) }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "clamp-1 block text-[13.5px] font-medium transition-colors group-hover:text-primary", children: f.name }), _jsx("span", { className: "mono mt-0.5 block text-[10.5px] text-muted-foreground", children: fbytes(f.size) })] })] }, f.id))) })] })), _jsxs(Glass, { id: "signup", tone: "soft", className: "scroll-mt-28 p-6 sm:p-8", "data-reveal": true, children: [_jsxs("div", { className: "mb-6 flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("h2", { className: "flex items-center gap-2.5 text-[17px] font-semibold", children: [_jsx(Send, { className: "h-4 w-4 text-primary" }), "\u5728\u7EBF\u62A5\u540D"] }), _jsx("p", { className: "mt-2 text-[12.5px] leading-relaxed text-muted-foreground", children: "\u672A\u767B\u5F55\u4E5F\u53EF\u4EE5\u62A5\u540D\uFF1B\u767B\u5F55\u540E\u62A5\u540D\u8BB0\u5F55\u4F1A\u540C\u6B65\u81F3\u300C\u7528\u6237\u4E2D\u5FC3 \u2192 \u6211\u7684\u62A5\u540D\u300D\u3002" })] }), !user && (_jsxs(LinkButton, { to: "/login", size: "sm", variant: "glass", children: [_jsx(LogIn, { className: "h-3.5 w-3.5" }), "\u767B\u5F55\u540E\u62A5\u540D"] }))] }), mine ? (_jsxs("div", { className: "flex items-start gap-4 rounded-2xl border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 p-5", children: [_jsx(CheckCircle2, { className: "mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--success))]" }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-[14px] font-medium", children: "\u62A5\u540D\u5DF2\u63D0\u4EA4\u6210\u529F" }), _jsxs("p", { className: "mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground", children: ["\u6211\u4EEC\u5DF2\u6536\u5230", form.name ? ` ${form.name} ` : '', "\u7684\u62A5\u540D\u4FE1\u606F\uFF0C\u6D3B\u52A8\u5F00\u59CB\u524D\u4F1A\u901A\u8FC7\u77ED\u4FE1 / \u90AE\u4EF6\u63D0\u9192\u3002", user ? (_jsxs(_Fragment, { children: ["\u53EF\u5728", _jsx(Link, { to: "/account/signups", className: "mx-1 text-primary transition hover:underline", children: "\u6211\u7684\u62A5\u540D" }), "\u67E5\u770B\u8BB0\u5F55\u4E0E\u7B7E\u5230\u72B6\u6001\u3002"] })) : (_jsxs(_Fragment, { children: ["\u5EFA\u8BAE", _jsx(Link, { to: "/login", className: "mx-1 text-primary transition hover:underline", children: "\u767B\u5F55\u8D26\u53F7" }), "\u540E\u67E5\u770B\u300C\u6211\u7684\u62A5\u540D\u300D\u3002"] }))] })] })] })) : formDisabled ? (_jsxs("div", { className: "flex items-start gap-4 rounded-2xl border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 p-5", children: [_jsx(Lock, { className: "mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--warning))]" }), _jsxs("div", { children: [_jsx("p", { className: "text-[14px] font-medium", children: "\u5F53\u524D\u65E0\u6CD5\u62A5\u540D" }), _jsxs("p", { className: "mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground", children: [status.reason || '报名通道暂未开放。', status.capacityFull && '　可关注门户发布的后续场次，或联系主办方加入候补名单。'] }), _jsxs(LinkButton, { to: "/activities", size: "sm", variant: "glass", className: "mt-4", children: ["\u67E5\u770B\u5176\u4ED6\u6D3B\u52A8 ", _jsx(ArrowRight, { className: "h-3.5 w-3.5" })] })] })] })) : (_jsxs("form", { onSubmit: submit, noValidate: true, className: "flex flex-col gap-5", children: [serverError && (_jsxs("div", { className: "flex items-start gap-3 rounded-2xl border border-[hsl(var(--destructive))]/35 bg-[hsl(var(--destructive))]/10 px-4 py-3.5", children: [_jsx(AlertTriangle, { className: "mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--destructive))]" }), _jsx("p", { className: "text-[12.5px] leading-relaxed text-foreground/85", children: serverError })] })), _jsxs("div", { className: "grid gap-5 sm:grid-cols-2", children: [_jsx(Field, { label: "\u59D3\u540D", required: true, error: errors.name, children: _jsx(Input, { value: form.name, onChange: (e) => set('name', e.target.value), placeholder: "\u8BF7\u8F93\u5165\u771F\u5B9E\u59D3\u540D", autoComplete: "name" }) }), _jsx(Field, { label: "\u5B66\u53F7", required: true, error: errors.studentId, hint: "\u7528\u4E8E\u73B0\u573A\u7B7E\u5230\u6838\u9A8C\uFF0C\u540C\u4E00\u6D3B\u52A8\u4E0D\u53EF\u91CD\u590D\u62A5\u540D", children: _jsx(Input, { value: form.studentId, onChange: (e) => set('studentId', e.target.value), placeholder: "\u5982 2023100123", inputMode: "numeric" }) }), _jsx(Field, { label: "\u5B66\u9662", required: true, error: errors.college, children: _jsx(Input, { value: form.college, onChange: (e) => set('college', e.target.value), placeholder: "\u5982 \u8BA1\u7B97\u673A\u79D1\u5B66\u4E0E\u6280\u672F\u5B66\u9662" }) }), _jsx(Field, { label: "\u4E13\u4E1A", required: true, error: errors.major, children: _jsx(Input, { value: form.major, onChange: (e) => set('major', e.target.value), placeholder: "\u5982 \u8BA1\u7B97\u673A\u79D1\u5B66\u4E0E\u6280\u672F" }) }), _jsx(Field, { label: "\u624B\u673A\u53F7", required: true, error: errors.phone, hint: "\u7528\u4E8E\u63A5\u6536\u6D3B\u52A8\u53D8\u66F4\u4E0E\u63D0\u9192\u901A\u77E5", children: _jsx(Input, { value: form.phone, onChange: (e) => set('phone', e.target.value), placeholder: "11 \u4F4D\u624B\u673A\u53F7", inputMode: "tel", autoComplete: "tel" }) }), _jsx(Field, { label: "\u90AE\u7BB1", error: errors.email, hint: "\u9009\u586B\uFF0C\u7528\u4E8E\u63A5\u6536\u62A5\u540D\u6210\u529F\u90AE\u4EF6", children: _jsx(Input, { value: form.email, onChange: (e) => set('email', e.target.value), placeholder: "name@university.edu.cn", inputMode: "email", autoComplete: "email" }) })] }), _jsx(Field, { label: "\u5907\u6CE8", error: errors.remark, hint: `选填，可填写技术方向、饮食禁忌等特殊说明（${form.remark.length}/200）`, children: _jsx(Textarea, { rows: 3, value: form.remark, onChange: (e) => set('remark', e.target.value), placeholder: "\u4F8B\u5982\uFF1A\u5E0C\u671B\u53C2\u4E0E\u5B9E\u64CD\u73AF\u8282\u7684\u786C\u4EF6\u65B9\u5411\uFF1B\u6709\u5D4C\u5165\u5F0F\u5F00\u53D1\u7ECF\u9A8C\u3002" }) }), _jsxs("div", { className: "flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/8 pt-5", children: [_jsxs(Button, { type: "submit", variant: "primary", size: "lg", loading: busy, children: [_jsx(Send, { className: "h-4 w-4" }), busy ? '提交中…' : '提交报名'] }), _jsx(Button, { type: "button", variant: "ghost", disabled: busy, onClick: () => {
                                                                setTouchedForm(true);
                                                                setForm(EMPTY_FORM);
                                                                setErrors({});
                                                                setServerError(null);
                                                            }, children: "\u91CD\u7F6E" }), _jsxs("span", { className: "flex items-center gap-2 text-[11.5px] text-muted-foreground", children: [_jsx(ShieldCheck, { className: "h-3.5 w-3.5" }), "\u4FE1\u606F\u4EC5\u7528\u4E8E\u6D3B\u52A8\u7EC4\u7EC7\u4E0E\u7B7E\u5230\uFF0C\u4E0D\u505A\u5176\u4ED6\u7528\u9014"] })] })] }))] }), _jsxs(Glass, { tone: "soft", className: "p-6 sm:p-8", "data-reveal": true, children: [_jsxs("div", { className: "mb-5 flex flex-wrap items-center justify-between gap-3", children: [_jsxs("h2", { className: "flex items-center gap-2.5 text-[15px] font-semibold", children: [_jsx(Users, { className: "h-4 w-4 text-primary" }), "\u5DF2\u62A5\u540D\u540C\u5B66", _jsxs("span", { className: "mono text-[12px] font-normal text-muted-foreground", children: ["\uFF08", fnum(signed), " \u4EBA\uFF09"] })] }), _jsxs("span", { className: "flex items-center gap-2 text-[11px] text-muted-foreground", children: [_jsx(Info, { className: "h-3.5 w-3.5" }), "\u4E3A\u4FDD\u62A4\u9690\u79C1\uFF0C\u4EC5\u5C55\u793A\u59D3\u6C0F\u4E0E\u5B66\u9662"] })] }), signups.length ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3", children: signups.map((s, i) => (_jsxs("div", { className: "flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5", children: [_jsx("span", { className: "mono flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-[11.5px] text-foreground/85", children: (s.name || '同').slice(0, 1) }), _jsxs("span", { className: "min-w-0", children: [_jsx("span", { className: "block text-[12.5px] font-medium", children: maskName(s.name) }), _jsx("span", { className: "clamp-1 block text-[10.5px] text-muted-foreground", children: s.college || '学院未填写' })] })] }, `${s.name}-${i}`))) }), signed > signups.length && (_jsxs("p", { className: "mono mt-4 text-[11px] text-muted-foreground", children: ["\u4EC5\u5C55\u793A\u6700\u8FD1 ", signups.length, " \u6761\u62A5\u540D\u8BB0\u5F55\uFF0C\u5176\u4F59\u5DF2\u7701\u7565\u3002"] }))] })) : (_jsxs("div", { className: "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/12 py-12 text-center", children: [_jsx(Users, { className: "h-5 w-5 text-muted-foreground/70" }), _jsx("p", { className: "text-[13px] text-muted-foreground", children: "\u8FD8\u6CA1\u6709\u4EBA\u62A5\u540D\uFF0C\u6210\u4E3A\u7B2C\u4E00\u4E2A\u62A5\u540D\u8005\u5427" })] }))] })] }), _jsxs("aside", { className: "flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start", "data-reveal": "right", children: [_jsxs(Glass, { tone: "soft", className: "p-6", children: [_jsx("h3", { className: "text-[15px] font-semibold", children: "\u6D3B\u52A8\u4FE1\u606F" }), _jsxs("dl", { className: "mt-5 flex flex-col divide-y divide-white/8", children: [_jsxs(InfoRow, { icon: _jsx(CalendarDays, { className: "h-3.5 w-3.5" }), label: "\u6D3B\u52A8\u65F6\u95F4", children: [_jsx("span", { className: "mono", children: fdatetime(activity.startAt) }), _jsxs("span", { className: "text-muted-foreground", children: [" ", fweek(activity.startAt)] }), activity.endAt && (_jsxs("span", { className: "mono mt-1 block text-muted-foreground", children: ["\u81F3 ", fdatetime(activity.endAt)] }))] }), _jsx(InfoRow, { icon: _jsx(MapPin, { className: "h-3.5 w-3.5" }), label: "\u6D3B\u52A8\u5730\u70B9", children: activity.location || '待定' }), _jsx(InfoRow, { icon: _jsx(Users, { className: "h-3.5 w-3.5" }), label: "\u62A5\u540D\u540D\u989D", children: capacity > 0 ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "mono", children: fnum(signed) }), _jsxs("span", { className: "text-muted-foreground", children: [" / ", fnum(capacity), " \u4EBA"] })] })) : ('不限名额') }), _jsx(InfoRow, { icon: _jsx(Hourglass, { className: "h-3.5 w-3.5" }), label: "\u62A5\u540D\u622A\u6B62", children: activity.signupEnd ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "mono", children: fdatetime(activity.signupEnd) }), cd && !cd.expired && (_jsxs("span", { className: "mt-1 block text-[11.5px] text-[hsl(var(--warning))]", children: ["\u5269\u4F59 ", cd.label] }))] })) : ('不限时，报满即止') }), _jsx(InfoRow, { icon: _jsx(Building2, { className: "h-3.5 w-3.5" }), label: "\u4E3B\u529E\u65B9", children: "\u79D1\u6280\u521B\u65B0\u90E8" }), _jsx(InfoRow, { icon: _jsx(CalendarClock, { className: "h-3.5 w-3.5" }), label: "\u5F53\u524D\u72B6\u6001", children: past ? '活动已结束' : status.closed ? status.reason || '报名关闭' : '报名进行中' })] }), !formDisabled && (_jsxs("a", { href: "#signup", className: "btn btn-primary mt-6 w-full", children: [_jsx(Send, { className: "h-4 w-4" }), "\u7ACB\u5373\u62A5\u540D"] })), _jsx(LinkButton, { to: "/activities", variant: "glass", className: "mt-3 w-full", children: "\u8FD4\u56DE\u6D3B\u52A8\u5217\u8868" })] }), _jsxs(Glass, { tone: "soft", className: "p-6", children: [_jsxs("h3", { className: "flex items-center gap-2.5 text-[15px] font-semibold", children: [_jsx(Info, { className: "h-4 w-4 text-primary" }), "\u62A5\u540D\u987B\u77E5"] }), _jsx("ul", { className: "mt-4 flex flex-col gap-3", children: [
                                                '请填写真实姓名与学号，现场签到需核验学生证件。',
                                                '报名成功后如需请假，请提前 24 小时联系主办方。',
                                                '活动可能拍摄影像用于部门宣传，报名即视为同意。',
                                                '活动地点或时间如有调整，将通过短信与门户通知同步。',
                                            ].map((t) => (_jsxs("li", { className: "flex items-start gap-3 text-[12.5px] leading-relaxed text-foreground/75", children: [_jsx("span", { className: "mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" }), t] }, t))) })] })] })] }) })] }));
}
/* =============================================================================
 * 侧栏信息行
 * ========================================================================== */
function InfoRow({ icon, label, children }) {
    return (_jsxs("div", { className: "flex gap-3.5 py-3.5 first:pt-0 last:pb-0", children: [_jsx("span", { className: "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-primary", children: icon }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("dt", { className: "text-[11px] tracking-wide text-muted-foreground", children: label }), _jsx("dd", { className: "mt-1 text-[13px] leading-relaxed text-foreground/90", children: children })] })] }));
}

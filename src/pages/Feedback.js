import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, BadgeCheck, Clock, HelpCircle, Info, MessageSquare, Send, Shield, ThumbsUp, Timer, UserRound, } from 'lucide-react';
import { ApiError, PublicApi, SubmitApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { FEEDBACK_TYPES, cn, fdate, fdatetime, fnum, fromNow } from '@/lib/utils';
import { useRevealScope } from '@/components/RevealScope';
import { Button, Chip, EmptyState, ErrorState, Field, Glass, Input, LinkButton, PageHero, Pagination, ProgressBar, Section, Skeleton, Switch, Tabs, Textarea, } from '@/components/ui';
const PAGE_SIZE = 6;
const TYPE_TONE = {
    consult: 'primary',
    suggestion: 'accent',
    question: 'success',
    vote: 'warning',
};
const STATUS_LABEL = {
    open: '待处理',
    replied: '已回复',
    answered: '已解答',
};
const STATUS_TONE = {
    open: 'warning',
    replied: 'success',
    answered: 'primary',
};
/* 常见问题快捷入口：点击后自动填入留言表单 */
const QUICK_QUESTIONS = [
    {
        q: '大创项目可以跨学院组队吗？',
        type: 'question',
        body: '我来自其他学院，想和计算机学院的同学一起申报大创项目，请问跨学院组队是否需要额外流程或材料？',
    },
    {
        q: '创新工坊的设备怎么预约？',
        type: 'consult',
        body: '想使用创新工坊的 3D 打印与嵌入式开发设备完成项目原型，请问预约方式、开放时间与材料费用是怎样的？',
    },
    {
        q: '竞赛获奖如何认定学分？',
        type: 'question',
        body: '想确认中国国际大学生创新大赛等赛事的获奖认定标准，以及需要提交哪些材料才能完成学分认定。',
    },
    {
        q: '希望门户增加新功能',
        type: 'suggestion',
        body: '建议门户增加以下功能：（请补充你的具体想法与使用场景）',
    },
];
const SLA = [
    { t: '在线咨询', d: '24 小时内首次响应，工作日优先处理' },
    { t: '意见反馈', d: '3 个工作日内评估并给出处理计划' },
    { t: '问题解答', d: '1-2 个工作日内由对应工作组答复' },
    { t: '问卷投票', d: '投票结束后 3 日内公布统计结果' },
];
/* =============================================================================
 * 页面
 * ========================================================================== */
export default function Feedback() {
    useTitle('互动与反馈');
    const toast = useToast();
    const { user } = useAuth();
    /* 数据异步返回后才渲染出的 [data-reveal] 需要局部扫描才会揭示 */
    const revealRef = useRevealScope();
    const [type, setType] = useState('all');
    const [status, setStatus] = useState('all');
    const [page, setPage] = useState(1);
    const { data, meta, loading, error, reload } = useApi(() => PublicApi.feedback({ page, pageSize: PAGE_SIZE, type, status }), [page, type, status]);
    const items = data?.items ?? [];
    const total = data?.total ?? 0;
    const counts = meta?.counts ?? {};
    const answered = typeof meta?.answered === 'number' ? meta.answered : 0;
    const totalAll = useMemo(() => Object.values(counts).reduce((s, n) => s + n, 0), [counts]);
    const typeTabs = useMemo(() => [
        { value: 'all', label: '全部', count: totalAll },
        ...Object.entries(FEEDBACK_TYPES).map(([value, label]) => ({ value, label, count: counts[value] ?? 0 })),
    ], [counts, totalAll]);
    const statusTabs = [
        { value: 'all', label: '全部状态' },
        { value: 'open', label: '待处理' },
        { value: 'replied', label: '已回复' },
        { value: 'answered', label: '已解答' },
    ];
    /* ------------------------------ 点赞（本地去重） ------------------------------ */
    const [liked, setLiked] = useState([]);
    const [likeOverride, setLikeOverride] = useState({});
    const [liking, setLiking] = useState(null);
    const like = async (item) => {
        if (liked.includes(item.id) || liking === item.id)
            return;
        setLiking(item.id);
        try {
            const out = await SubmitApi.likeFeedback(item.id);
            setLiked((l) => [...l, item.id]);
            setLikeOverride((m) => ({ ...m, [item.id]: typeof out?.likes === 'number' ? out.likes : item.likes + 1 }));
        }
        catch (e) {
            toast.error('点赞失败', e instanceof ApiError ? e.message : '请稍后重试');
        }
        finally {
            setLiking(null);
        }
    };
    /* ------------------------------ 留言表单 ------------------------------ */
    const formRef = useRef(null);
    const [form, setForm] = useState({
        type: 'consult',
        title: '',
        content: '',
        anonymous: true,
        authorName: '',
        contact: '',
    });
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const nameFilled = useRef(false);
    useEffect(() => {
        if (!user || nameFilled.current)
            return;
        nameFilled.current = true;
        setForm((f) => ({
            ...f,
            authorName: f.authorName || user.name || '',
            contact: f.contact || user.email || user.phone || '',
        }));
    }, [user]);
    const set = (k) => (v) => setForm((f) => {
        const next = { ...f, [k]: v };
        /* 关闭匿名时若未填姓名，自动补上当前登录用户 */
        if (k === 'anonymous' && v === false && !next.authorName && user?.name)
            next.authorName = user.name;
        return next;
    });
    const validate = () => {
        const e = {};
        const title = form.title.trim();
        const content = form.content.trim();
        if (!title)
            e.title = '请填写标题';
        else if (title.length < 4)
            e.title = '标题至少 4 个字，便于我们归类处理';
        if (!content)
            e.content = '请填写具体内容';
        else if (content.length < 5)
            e.content = `内容至少 5 个字（当前 ${content.length} 字）`;
        if (!form.anonymous && !form.authorName.trim())
            e.authorName = '实名提交时请填写姓名';
        if (!form.anonymous && form.contact.trim() && !/^([^@\s]+@[^@\s]+\.[A-Za-z]{2,}|1[3-9]\d{9})$/.test(form.contact.trim()))
            e.contact = '请填写有效邮箱或 11 位手机号';
        return e;
    };
    const onSubmit = async (ev) => {
        ev.preventDefault();
        const errs = validate();
        setErrors(errs);
        setFormError(null);
        if (Object.keys(errs).length) {
            toast.error('表单未通过校验', `还有 ${Object.keys(errs).length} 项需要修正`);
            return;
        }
        setSubmitting(true);
        try {
            await SubmitApi.feedback({
                type: form.type,
                title: form.title.trim(),
                content: form.content.trim(),
                anonymous: form.anonymous,
                authorName: form.anonymous ? null : form.authorName.trim(),
                contact: form.anonymous ? null : form.contact.trim() || null,
            });
            toast.success('留言已提交', form.anonymous ? '已匿名发布，我们会在承诺时限内回复' : '我们会通过你留下的联系方式回复');
            setForm((f) => ({ ...f, title: '', content: '', anonymous: true, contact: '' }));
            setErrors({});
            setPage(1);
            setType('all');
            setStatus('all');
            reload();
        }
        catch (e) {
            const msg = e instanceof ApiError ? e.message : e?.message || '提交失败，请稍后重试';
            setFormError(msg);
            toast.error('提交失败', msg);
        }
        finally {
            setSubmitting(false);
        }
    };
    const applyQuick = (q) => {
        setForm((f) => ({ ...f, type: q.type, title: q.q, content: q.body }));
        setErrors({});
        setFormError(null);
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    return (_jsxs("div", { ref: revealRef, children: [_jsx(PageHero, { eyebrow: "Feedback & Q&A", title: "\u4E92\u52A8\u4E0E\u53CD\u9988", description: "\u5728\u7EBF\u54A8\u8BE2\u3001\u610F\u89C1\u53CD\u9988\u3001\u95EE\u9898\u89E3\u7B54\u4E0E\u95EE\u5377\u6295\u7968\u90FD\u5728\u8FD9\u91CC\u3002\u516C\u5F00\u53D1\u5E03\u7684\u7559\u8A00\u4F1A\u88AB\u5176\u4ED6\u540C\u5B66\u770B\u5230\uFF0C\u6211\u4EEC\u4E5F\u4F1A\u628A\u7B54\u590D\u7559\u5728\u540C\u4E00\u5904 \u2014\u2014 \u8BA9\u4E00\u4E2A\u4EBA\u95EE\u8FC7\u7684\u95EE\u9898\uFF0C\u6210\u4E3A\u6240\u6709\u4EBA\u7684\u7B54\u6848\u3002", breadcrumb: [{ label: '互动与反馈' }], children: _jsxs("div", { className: "flex flex-wrap items-center gap-x-7 gap-y-3 text-[12px] text-muted-foreground", children: [_jsxs("span", { className: "mono", children: ["\u5171 ", fnum(totalAll), " \u6761\u7559\u8A00"] }), _jsxs("span", { className: "mono", children: ["\u5DF2\u89E3\u7B54 ", fnum(answered), " \u6761"] }), _jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Clock, { className: "h-3.5 w-3.5 text-primary" }), "\u5DE5\u4F5C\u65E5 24 \u5C0F\u65F6\u5185\u9996\u6B21\u54CD\u5E94"] })] }) }), _jsxs(Section, { id: "board", eyebrow: "Message Board", title: "\u7559\u8A00\u4E0E\u54A8\u8BE2", description: "\u6309\u7C7B\u578B\u7B5B\u9009\u7559\u8A00\uFF0C\u6216\u67E5\u770B\u5168\u90E8\u72B6\u6001\u3002\u88AB\u56DE\u590D\u7684\u7559\u8A00\u4F1A\u5728\u4E0B\u65B9\u5C55\u5F00\u5B98\u65B9\u7B54\u590D\u3002", children: [_jsxs("div", { className: "flex flex-col gap-4", children: [_jsx("div", { "data-reveal": true, children: _jsx(Tabs, { items: typeTabs, value: type, onChange: (v) => {
                                        setType(v);
                                        setPage(1);
                                    } }) }), _jsx("div", { "data-reveal": true, children: _jsx(Tabs, { items: statusTabs, value: status, onChange: (v) => {
                                        setStatus(v);
                                        setPage(1);
                                    }, size: "sm", className: "inline-block" }) })] }), _jsxs("div", { className: "mt-10 grid gap-8 lg:grid-cols-[1.65fr_1fr]", children: [_jsx("div", { className: "flex flex-col gap-4", children: error ? (_jsx(Glass, { tone: "soft", className: "p-4", children: _jsx(ErrorState, { message: error, onRetry: reload }) })) : loading ? (_jsx("div", { className: "flex flex-col gap-4", children: Array.from({ length: 4 }).map((_, i) => (_jsx(Skeleton, { className: "h-44" }, i))) })) : items.length ? (_jsxs(_Fragment, { children: [items.map((it, i) => (_jsx("div", { "data-reveal": true, style: { transitionDelay: `${(i % 4) * 60}ms` }, children: _jsx(FeedbackCard, { item: it, likes: likeOverride[it.id] ?? it.likes, liked: liked.includes(it.id), liking: liking === it.id, onLike: () => like(it) }) }, it.id))), _jsx(Pagination, { page: page, pageSize: PAGE_SIZE, total: total, onChange: setPage, className: "mt-6" })] })) : (_jsx(Glass, { tone: "soft", className: "p-4", children: _jsx(EmptyState, { icon: _jsx(MessageSquare, { className: "h-5 w-5" }), title: "\u8BE5\u6761\u4EF6\u4E0B\u6682\u65E0\u7559\u8A00", description: type === 'all' && status === 'all'
                                            ? '还没有人留言，欢迎成为第一个提问的人。'
                                            : '试试切换类型或状态筛选，或直接提交一条新的留言。', action: _jsxs("div", { className: "flex flex-wrap justify-center gap-3", children: [_jsx(Button, { onClick: () => {
                                                        setType('all');
                                                        setStatus('all');
                                                        setPage(1);
                                                    }, children: "\u6E05\u9664\u7B5B\u9009\u6761\u4EF6" }), _jsx(Button, { variant: "ghost", onClick: () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), children: "\u53BB\u63D0\u4EA4\u7559\u8A00" })] }) }) })) }), _jsxs("aside", { className: "flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start", children: [_jsxs(Glass, { tone: "soft", className: "p-6", "data-reveal": "right", children: [_jsxs("h3", { className: "flex items-center gap-2.5 text-[15px] font-semibold", children: [_jsx(HelpCircle, { className: "h-4 w-4 text-primary" }), "\u5E38\u89C1\u95EE\u9898\u5FEB\u6377\u5165\u53E3"] }), _jsx("p", { className: "mt-2 text-[12px] leading-relaxed text-muted-foreground", children: "\u70B9\u51FB\u4EFB\u4E00\u6761\uFF0C\u81EA\u52A8\u586B\u5165\u53F3\u4FA7\u7559\u8A00\u8868\u5355\u5E76\u5B9A\u4F4D\u5230\u8F93\u5165\u533A\u3002" }), _jsx("div", { className: "mt-4 flex flex-col gap-1", children: QUICK_QUESTIONS.map((q) => (_jsxs("button", { type: "button", onClick: () => applyQuick(q), className: "group flex items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors duration-300 hover:bg-white/[0.05]", children: [_jsx("span", { className: "mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80 transition-transform group-hover:scale-125" }), _jsx("span", { className: "min-w-0 flex-1 text-[13px] leading-snug text-foreground/85 transition-colors group-hover:text-primary", children: q.q }), _jsx(ArrowRight, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-70" })] }, q.q))) }), _jsx(LinkButton, { to: "/resources?category=faq", size: "sm", variant: "glass", className: "mt-5 w-full", children: "\u8D44\u6E90\u4E2D\u5FC3\u5E38\u89C1\u95EE\u9898" })] }), _jsxs(Glass, { tone: "soft", className: "p-6", "data-reveal": "right", children: [_jsxs("h3", { className: "flex items-center gap-2.5 text-[15px] font-semibold", children: [_jsx(Timer, { className: "h-4 w-4 text-[hsl(var(--warning))]" }), "\u56DE\u590D\u65F6\u6548\u8BF4\u660E"] }), _jsx("ul", { className: "mt-4 flex flex-col gap-3.5", children: SLA.map((s) => (_jsxs("li", { className: "flex items-start gap-3", children: [_jsx(Clock, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-[13px] font-medium", children: s.t }), _jsx("p", { className: "mt-0.5 text-[12px] leading-relaxed text-muted-foreground", children: s.d })] })] }, s.t))) }), _jsxs("p", { className: "mt-5 flex items-start gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground", children: [_jsx(Info, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" }), "\u8282\u5047\u65E5\u4E0E\u8003\u8BD5\u5468\u7684\u54CD\u5E94\u65F6\u95F4\u53EF\u80FD\u5EF6\u540E\uFF0C\u7D27\u6025\u4E8B\u9879\u8BF7\u76F4\u63A5\u8054\u7CFB\u90E8\u95E8\u90AE\u7BB1\u3002"] })] }), _jsxs(Glass, { tone: "soft", className: "p-6", "data-reveal": "right", children: [_jsxs("h3", { className: "flex items-center gap-2.5 text-[15px] font-semibold", children: [_jsx(BadgeCheck, { className: "h-4 w-4 text-[hsl(var(--success))]" }), "\u5DF2\u89E3\u7B54\u7EDF\u8BA1"] }), _jsxs("div", { className: "mt-5 flex items-baseline gap-2", children: [_jsx("span", { className: "mono text-3xl font-semibold text-[hsl(var(--success))]", children: fnum(answered) }), _jsxs("span", { className: "text-[12px] text-muted-foreground", children: ["/ ", fnum(totalAll), " \u6761\u7559\u8A00\u5DF2\u89E3\u7B54"] })] }), _jsx(ProgressBar, { value: answered, max: totalAll || 1, tone: "success", className: "mt-4" }), _jsx("div", { className: "mt-5 flex flex-col gap-2.5 border-t border-white/8 pt-5", children: Object.entries(FEEDBACK_TYPES).map(([k, label]) => (_jsxs("div", { className: "flex items-center justify-between text-[12.5px]", children: [_jsxs("span", { className: "flex items-center gap-2 text-muted-foreground", children: [_jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-primary/70" }), label] }), _jsx("span", { className: "mono text-foreground/80", children: counts[k] ?? 0 })] }, k))) })] })] })] })] }), _jsx(Section, { id: "compose", eyebrow: "Leave a Message", title: "\u7559\u4E0B\u4F60\u7684\u95EE\u9898\u6216\u5EFA\u8BAE", description: "\u6240\u6709\u7559\u8A00\u9ED8\u8BA4\u533F\u540D\u5C55\u793A\u3002\u5982\u679C\u5E0C\u671B\u6211\u4EEC\u5355\u72EC\u56DE\u590D\u4F60\uFF0C\u8BF7\u5173\u95ED\u533F\u540D\u5F00\u5173\u5E76\u7559\u4E0B\u8054\u7CFB\u65B9\u5F0F\u3002", children: _jsx("div", { ref: formRef, className: "scroll-mt-28", children: _jsxs("div", { className: "grid gap-6 lg:grid-cols-[1.5fr_1fr]", children: [_jsxs(Glass, { tone: "strong", className: "p-6 sm:p-8", "data-reveal": true, children: [formError && (_jsxs("div", { className: "mb-6 flex items-start gap-3 rounded-2xl border border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/10 px-4 py-3.5", style: { animation: 'sti-pop .3s cubic-bezier(.22,1,.36,1) both' }, role: "alert", children: [_jsx(AlertCircle, { className: "mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--destructive))]" }), _jsxs("div", { className: "min-w-0 text-[13px] leading-relaxed", children: [_jsx("p", { className: "font-medium text-[hsl(var(--destructive))]", children: "\u63D0\u4EA4\u5931\u8D25" }), _jsx("p", { className: "mt-1 text-foreground/75", children: formError })] })] })), _jsxs("form", { onSubmit: onSubmit, noValidate: true, className: "flex flex-col gap-5", children: [_jsx(Field, { label: "\u7559\u8A00\u7C7B\u578B", required: true, hint: "\u4E0D\u540C\u7C7B\u578B\u7531\u4E0D\u540C\u5DE5\u4F5C\u7EC4\u8DDF\u8FDB\uFF0C\u8BF7\u9009\u62E9\u6700\u8D34\u8FD1\u7684\u4E00\u9879", children: _jsx(Tabs, { items: Object.entries(FEEDBACK_TYPES).map(([value, label]) => ({ value, label })), value: form.type, onChange: (v) => set('type')(v), size: "sm" }) }), _jsx(Field, { label: "\u6807\u9898", required: true, error: errors.title, hint: !errors.title ? '一句话概括你的问题或建议' : undefined, children: _jsx(Input, { value: form.title, onChange: (e) => set('title')(e.target.value), placeholder: "\u5982\uFF1A\u5927\u521B\u9879\u76EE\u53EF\u4EE5\u8DE8\u5B66\u9662\u7EC4\u961F\u5417\uFF1F", maxLength: 80, "data-invalid": errors.title ? 'true' : undefined }) }), _jsx(Field, { label: "\u5177\u4F53\u5185\u5BB9", required: true, error: errors.content, hint: !errors.content ? `请尽量描述清楚，便于我们准确定位（当前 ${form.content.trim().length} 字）` : undefined, children: _jsx(Textarea, { value: form.content, onChange: (e) => set('content')(e.target.value), rows: 6, placeholder: "\u8865\u5145\u80CC\u666F\u4FE1\u606F\u3001\u4F60\u5DF2\u7ECF\u5C1D\u8BD5\u8FC7\u7684\u65B9\u6CD5\uFF0C\u6216\u671F\u671B\u5F97\u5230\u7684\u7B54\u590D\u5F62\u5F0F\u2026", "data-invalid": errors.content ? 'true' : undefined }) }), _jsxs("div", { className: "rounded-2xl border border-white/8 bg-white/[0.03] p-4", children: [_jsx(Switch, { checked: form.anonymous, onChange: (v) => set('anonymous')(v), label: form.anonymous ? '匿名提交（其他同学看不到你的身份）' : '实名提交（将展示你的姓名）' }), _jsxs("p", { className: "mt-3 flex items-start gap-2.5 text-[11.5px] leading-relaxed text-muted-foreground", children: [_jsx(Shield, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" }), "\u533F\u540D\u7559\u8A00\u4EC5\u9690\u85CF\u59D3\u540D\u4E0E\u8054\u7CFB\u65B9\u5F0F\uFF0C\u6211\u4EEC\u4ECD\u4F1A\u8BA4\u771F\u5904\u7406\uFF0C\u4F46\u65E0\u6CD5\u4E3B\u52A8\u8054\u7CFB\u4F60\u3002"] })] }), !form.anonymous && (_jsxs("div", { className: "grid gap-5 sm:grid-cols-2", style: { animation: 'sti-fade .3s ease both' }, children: [_jsx(Field, { label: "\u59D3\u540D", required: true, error: errors.authorName, children: _jsx(Input, { value: form.authorName, onChange: (e) => set('authorName')(e.target.value), placeholder: "\u5C06\u5C55\u793A\u5728\u7559\u8A00\u4E0A", "data-invalid": errors.authorName ? 'true' : undefined }) }), _jsx(Field, { label: "\u8054\u7CFB\u65B9\u5F0F", error: errors.contact, hint: !errors.contact ? '邮箱或手机号，仅部门成员可见' : undefined, children: _jsx(Input, { value: form.contact, onChange: (e) => set('contact')(e.target.value), placeholder: "name@university.edu.cn", "data-invalid": errors.contact ? 'true' : undefined }) })] })), _jsxs("div", { className: "flex flex-wrap items-center gap-3 border-t border-white/8 pt-6", children: [_jsxs(Button, { type: "submit", variant: "primary", size: "lg", loading: submitting, children: [submitting ? '提交中…' : '提交留言', !submitting && _jsx(Send, { className: "h-4 w-4" })] }), _jsx(Button, { type: "button", variant: "ghost", disabled: submitting, onClick: () => {
                                                            setForm((f) => ({ ...f, title: '', content: '' }));
                                                            setErrors({});
                                                            setFormError(null);
                                                        }, children: "\u6E05\u7A7A" }), _jsx("p", { className: "text-[11.5px] leading-relaxed text-muted-foreground", children: "\u63D0\u4EA4\u540E\u7559\u8A00\u4F1A\u7ACB\u5373\u51FA\u73B0\u5728\u5DE6\u4FA7\u5217\u8868\u4E2D\u3002" })] })] })] }), _jsxs("div", { className: "flex flex-col gap-4", "data-reveal": "right", children: [_jsxs(Glass, { tone: "soft", className: "p-6", children: [_jsx("div", { className: "eyebrow mb-4", children: "How it works" }), _jsx("h3", { className: "text-[15px] font-semibold", children: "\u7559\u8A00\u4E4B\u540E\u4F1A\u53D1\u751F\u4EC0\u4E48" }), _jsx("div", { className: "mt-6 flex flex-col", children: [
                                                    { t: '提交成功', d: '留言即时出现在左侧列表，状态为「待处理」' },
                                                    { t: '工作组分流', d: '按类型自动分派给对应工作组跟进' },
                                                    { t: '公开答复', d: '答复展示在留言下方，其他同学也能看到' },
                                                    { t: '状态更新', d: '留言状态变为「已回复」，可在原留言处查看' },
                                                ].map((s, i, arr) => (_jsxs("div", { className: "relative flex gap-4", children: [_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("span", { className: "mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/12 text-[11px] font-semibold text-primary", children: i + 1 }), i < arr.length - 1 && (_jsx("span", { className: "my-1 w-px flex-1 bg-gradient-to-b from-primary/40 to-transparent" }))] }), _jsxs("div", { className: cn('min-w-0 flex-1', i < arr.length - 1 ? 'pb-5' : ''), children: [_jsx("p", { className: "text-[13.5px] font-medium", children: s.t }), _jsx("p", { className: "mt-1 text-[12px] leading-relaxed text-muted-foreground", children: s.d })] })] }, s.t))) })] }), !user && (_jsxs(Glass, { tone: "thin", className: "p-5", children: [_jsxs("div", { className: "flex items-center gap-2.5 text-[13px] font-medium", children: [_jsx(UserRound, { className: "h-4 w-4 text-primary" }), "\u767B\u5F55\u540E\u53EF\u8FFD\u8E2A\u81EA\u5DF1\u7684\u7559\u8A00"] }), _jsx("p", { className: "mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground", children: "\u767B\u5F55\u540E\u63D0\u4EA4\u7684\u7559\u8A00\u4F1A\u540C\u6B65\u5230\u300C\u7528\u6237\u4E2D\u5FC3\u300D\uFF0C\u53EF\u968F\u65F6\u67E5\u770B\u5904\u7406\u8FDB\u5EA6\u4E0E\u5B98\u65B9\u7B54\u590D\u3002" }), _jsx(LinkButton, { to: "/login?redirect=%2Ffeedback", size: "sm", className: "mt-4 w-full", children: "\u53BB\u767B\u5F55" })] }))] })] }) }) }), _jsx("div", { className: "pb-24" })] }));
}
/* =============================================================================
 * 留言卡片
 * ========================================================================== */
function FeedbackCard({ item, likes, liked, liking, onLike, }) {
    const replied = !!item.reply || item.status !== 'open';
    const statusKey = item.status in STATUS_LABEL ? item.status : 'open';
    return (_jsxs(Glass, { tone: "soft", hover: true, sheen: true, className: "p-6", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2.5", children: [_jsx(Chip, { tone: TYPE_TONE[item.type] ?? 'primary', children: FEEDBACK_TYPES[item.type] ?? item.type }), _jsx(Chip, { tone: STATUS_TONE[statusKey] ?? 'warning', children: STATUS_LABEL[statusKey] }), _jsx("span", { className: "mono ml-auto text-[11px] text-muted-foreground", children: fromNow(item.createdAt) })] }), _jsx("h3", { className: "mt-4 text-[16px] font-semibold leading-snug", children: item.title }), _jsx("p", { className: "mt-2.5 whitespace-pre-line text-[13.5px] leading-relaxed text-foreground/75", children: item.content }), _jsxs("div", { className: "mt-5 flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-3 text-[11.5px] text-muted-foreground", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(UserRound, { className: "h-3.5 w-3.5" }), item.anonymous || !item.authorName ? '匿名同学' : item.authorName] }), _jsx("span", { className: "text-white/15", children: "|" }), _jsx("span", { className: "mono", children: fdatetime(item.createdAt) })] }), _jsxs("button", { type: "button", onClick: onLike, disabled: liked || liking, "aria-pressed": liked, className: cn('chip transition-all duration-300', liked
                            ? '!border-primary/45 !bg-primary/14 !text-primary'
                            : 'hover:!border-primary/35 hover:!text-primary', liking && 'opacity-60'), children: [_jsx(ThumbsUp, { className: cn('h-3.5 w-3.5', liked && 'fill-current') }), _jsx("span", { className: "mono tabular-nums", children: fnum(likes) }), _jsx("span", { children: liked ? '已点赞' : '有帮助' })] })] }), replied && (_jsxs("div", { className: "mt-5 rounded-2xl border-l-2 border-primary/50 bg-primary/[0.07] px-5 py-4", "data-reveal": true, children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2.5", children: [_jsx(BadgeCheck, { className: "h-4 w-4 text-primary" }), _jsx("span", { className: "text-[12px] font-medium text-primary", children: "\u79D1\u6280\u521B\u65B0\u90E8 \u56DE\u590D" }), item.repliedAt && (_jsx("span", { className: "mono ml-auto text-[10.5px] text-muted-foreground", children: fdate(item.repliedAt) }))] }), _jsx("p", { className: "mt-2.5 whitespace-pre-line text-[13px] leading-relaxed text-foreground/80", children: item.reply || '该留言已受理并处理完毕，暂无公开的补充说明。' })] }))] }));
}

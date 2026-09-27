import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, BadgeCheck, CalendarClock, CheckCircle2, ClipboardList, FileSearch, GraduationCap, HelpCircle, Megaphone, Sparkles, Users, } from 'lucide-react';
import { ApiError, PublicApi, SubmitApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { cn, fdate } from '@/lib/utils';
import { useRevealScope } from '@/components/RevealScope';
import { Accordion, Button, Chip, Dot, EmptyState, ErrorState, Field, Glass, Input, LinkButton, PageHero, Section, Select, Skeleton, TableWrap, Tabs, Td, Textarea, Th, } from '@/components/ui';
const EMPTY_FORM = {
    positionId: '',
    name: '',
    studentId: '',
    college: '',
    major: '',
    grade: '',
    phone: '',
    email: '',
    skills: '',
    intro: '',
};
const GRADES = ['大一', '大二', '大三', '大四', '大五', '研一', '研二', '研三'];
function validate(f) {
    const e = {};
    if (!f.positionId)
        e.positionId = '请选择意向岗位';
    if (!f.name.trim())
        e.name = '请填写姓名';
    else if (f.name.trim().length < 2)
        e.name = '姓名至少 2 个字符';
    if (!f.studentId.trim())
        e.studentId = '请填写学号';
    else if (!/^[0-9A-Za-z]{6,20}$/.test(f.studentId.trim()))
        e.studentId = '学号应为 6-20 位数字或字母';
    if (!f.college.trim())
        e.college = '请填写所在学院';
    if (!f.major.trim())
        e.major = '请填写所学专业';
    if (!f.grade)
        e.grade = '请选择年级';
    if (!f.phone.trim())
        e.phone = '请填写手机号';
    else if (!/^1[3-9]\d{9}$/.test(f.phone.trim()))
        e.phone = '请输入 11 位有效手机号';
    if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(f.email.trim()))
        e.email = '邮箱格式不正确';
    const n = f.intro.trim().length;
    if (!n)
        e.intro = '请填写自我介绍';
    else if (n < 10)
        e.intro = `自我介绍至少 10 字（当前 ${n} 字）`;
    return e;
}
const FAQ = [
    {
        q: '招新对专业和年级有限制吗？',
        a: '没有专业限制，全校本科生与研究生均可报名。大一新生同样欢迎 —— 我们更看重学习意愿与投入时间，而不是已有的技术积累。',
    },
    {
        q: '可以同时申请多个岗位吗？',
        a: '报名表只填写一个「意向岗位」。如果面试时双方认为你更适合其他岗位，我们会和你沟通后调整，无需重复提交。',
    },
    {
        q: '没有作品集可以报名技术服务组吗？',
        a: '可以。请在「技能特长」中如实填写你熟悉的技术栈，并在自我介绍里说明一个你做过的小项目（课设、自学练习均可）。',
    },
    {
        q: '加入后每周大概需要投入多少时间？',
        a: '常规情况每周 4-6 小时（例会 + 岗位工作）。竞赛集训、科技文化节等关键节点会阶段性增加，可提前协调。',
    },
    {
        q: '报名后多久能收到结果？',
        a: '简历筛选在 3 个工作日内完成并通过邮件/短信通知；面试结果在面试结束后 2 个工作日内反馈；最终录用名单在门户公示。',
    },
    {
        q: '提交后发现自己填错了怎么办？',
        a: '请在「互动与反馈」留言说明报名学号与需要修改的内容，或直接联系招新邮箱，我们会在后台帮你更正。',
    },
];
/* =============================================================================
 * 页面
 * ========================================================================== */
export default function Join() {
    useTitle('加入我们');
    const { data, loading, error, reload } = useApi(() => PublicApi.join(), []);
    const { user } = useAuth();
    const toast = useToast();
    /* 数据异步返回后才渲染出的 [data-reveal] 需要局部扫描才会揭示 */
    const revealRef = useRevealScope();
    const positions = data?.positions ?? [];
    const notice = data?.notice ?? null;
    const groups = data?.groups ?? [];
    const approved = data?.approved ?? [];
    const totalHeadcount = useMemo(() => positions.reduce((s, p) => s + (Number(p.headcount) || 0), 0), [positions]);
    /* ------------------------------ 岗位筛选 ------------------------------ */
    const [group, setGroup] = useState('all');
    const tabs = useMemo(() => [
        { value: 'all', label: '全部岗位', count: positions.length },
        ...groups.map((g) => ({ value: g.name, label: g.name, count: g.count })),
    ], [groups, positions.length]);
    const filtered = useMemo(() => (group === 'all' ? positions : positions.filter((p) => p.group === group)), [positions, group]);
    /* ------------------------------ 报名表单 ------------------------------ */
    const formRef = useRef(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(null);
    const prefilled = useRef(false);
    /* 已登录用户预填基础信息 */
    useEffect(() => {
        if (!user || prefilled.current)
            return;
        prefilled.current = true;
        setForm((f) => ({
            ...f,
            name: f.name || user.name || '',
            studentId: f.studentId || user.studentId || '',
            college: f.college || user.college || '',
            email: f.email || user.email || '',
            phone: f.phone || user.phone || '',
        }));
    }, [user]);
    const set = (k) => (v) => {
        setForm((f) => ({ ...f, [k]: v }));
        setErrors((prev) => {
            if (!prev[k])
                return prev;
            const n = { ...prev };
            delete n[k];
            return n;
        });
    };
    const clearError = (k) => setErrors((prev) => {
        if (!prev[k])
            return prev;
        const n = { ...prev };
        delete n[k];
        return n;
    });
    const applyFor = (p) => {
        setForm((f) => ({ ...f, positionId: String(p.id) }));
        clearError('positionId');
        setFormError(null);
        setSubmitted(null);
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const onSubmit = async (e) => {
        e.preventDefault();
        const errs = validate(form);
        setErrors(errs);
        setFormError(null);
        if (Object.keys(errs).length) {
            toast.error('表单未通过校验', `还有 ${Object.keys(errs).length} 项需要修正`);
            const first = formRef.current?.querySelector('[data-invalid="true"]');
            first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        setSubmitting(true);
        try {
            const out = await SubmitApi.applyJoin({
                positionId: Number(form.positionId) || null,
                name: form.name.trim(),
                studentId: form.studentId.trim(),
                college: form.college.trim(),
                major: form.major.trim(),
                grade: form.grade,
                phone: form.phone.trim(),
                email: form.email.trim() || null,
                skills: form.skills.trim(),
                intro: form.intro.trim(),
            });
            const pos = positions.find((p) => String(p.id) === form.positionId) ?? null;
            setSubmitted({ id: out?.id ?? null, position: pos });
            toast.success('报名已提交', '我们会在 3 个工作日内完成简历筛选并通知你');
            reload();
        }
        catch (err) {
            const msg = err instanceof ApiError ? err.message : err?.message || '提交失败，请稍后重试';
            const conflict = err?.status === 409 || /已提交过报名申请/.test(msg);
            setFormError({ text: msg, conflict });
            toast.error(conflict ? '无需重复报名' : '提交失败', msg);
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { ref: revealRef, children: [_jsx(PageHero, { eyebrow: "Join Us", title: "\u52A0\u5165\u79D1\u6280\u521B\u65B0\u90E8", description: "\u56DB\u4E2A\u5DE5\u4F5C\u7EC4\u3001\u4E03\u4E2A\u5C97\u4F4D\uFF0C\u9762\u5411\u5168\u6821\u62DB\u52DF\u3002\u65E0\u8BBA\u4F60\u64C5\u957F\u5199\u4EE3\u7801\u3001\u505A\u8BBE\u8BA1\u3001\u5199\u6587\u6848\uFF0C\u8FD8\u662F\u5BF9\u67D0\u4E2A\u9886\u57DF\u5145\u6EE1\u597D\u5947\uFF0C\u8FD9\u91CC\u90FD\u6709\u4F60\u7684\u4E00\u5E2D\u4E4B\u5730\u3002", breadcrumb: [{ label: '加入我们' }], children: _jsxs("div", { className: "flex flex-wrap items-center gap-x-7 gap-y-3 text-[12px] text-muted-foreground", children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Dot, { tone: "success", pulse: true }), "2026 \u6625\u5B63\u62DB\u65B0\u8FDB\u884C\u4E2D"] }), _jsxs("span", { className: "mono", children: [positions.length, " \u4E2A\u5C97\u4F4D \u00B7 ", totalHeadcount, " \u4E2A\u540D\u989D"] }), _jsxs("span", { className: "mono", children: [groups.length, " \u4E2A\u5DE5\u4F5C\u7EC4"] }), approved.length > 0 && _jsxs("span", { className: "mono", children: ["\u5DF2\u516C\u793A ", approved.length, " \u4EBA"] })] }) }), error ? (_jsx(Section, { container: "shell", className: "!pt-0", children: _jsx(Glass, { tone: "soft", className: "p-6", children: _jsx(ErrorState, { message: error, onRetry: reload }) }) })) : loading ? (_jsx(LoadingSkeleton, {})) : (_jsxs(_Fragment, { children: [_jsx(Section, { id: "notice", eyebrow: "Recruitment Notice", title: notice?.title || '招新公告', description: "\u8BF7\u5148\u901A\u8BFB\u516C\u544A\u4E2D\u7684\u6D41\u7A0B\u4E0E\u65F6\u95F4\u5B89\u6392\uFF0C\u518D\u63D0\u4EA4\u62A5\u540D\u8868\u3002", children: _jsxs("div", { className: "grid gap-6 lg:grid-cols-[1.6fr_1fr]", children: [_jsx(Glass, { tone: "soft", className: "p-7 sm:p-9", "data-reveal": true, children: notice?.content ? (_jsx("div", { className: "prose-glass", dangerouslySetInnerHTML: { __html: notice.content } })) : (_jsx(EmptyState, { icon: _jsx(Megaphone, { className: "h-5 w-5" }), title: "\u6682\u65E0\u62DB\u65B0\u516C\u544A", description: "\u672C\u5B63\u62DB\u65B0\u516C\u544A\u5C1A\u672A\u53D1\u5E03\uFF0C\u53EF\u5148\u6D4F\u89C8\u4E0B\u65B9\u5C97\u4F4D\u4FE1\u606F\u5E76\u63D0\u4EA4\u62A5\u540D\u610F\u5411\u3002" })) }), _jsxs("div", { className: "flex flex-col gap-4", "data-reveal": "right", children: [_jsxs(Glass, { tone: "soft", className: "relative overflow-hidden p-6", children: [_jsx("div", { className: "eyebrow mb-4", children: "Selection Timeline" }), _jsx("h3", { className: "text-[15px] font-semibold", children: "\u9009\u62D4\u6D41\u7A0B\u4E0E\u65F6\u95F4" }), _jsx("div", { className: "mt-6 flex flex-col", children: [
                                                        { t: '在线报名', d: '填写报名表，可选附作品集链接', icon: ClipboardList },
                                                        { t: '简历筛选', d: '3 个工作日内反馈筛选结果', icon: FileSearch },
                                                        { t: '面试', d: '线上 / 线下结合，技术岗含实操', icon: Users },
                                                        { t: '录用公示', d: '名单在门户「加入我们」公示', icon: BadgeCheck },
                                                    ].map((s, i, arr) => (_jsxs("div", { className: "relative flex gap-4", children: [_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("span", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/12 text-primary", children: _jsx(s.icon, { className: "h-3.5 w-3.5" }) }), i < arr.length - 1 && (_jsx("span", { className: "my-1 w-px flex-1 bg-gradient-to-b from-primary/40 to-transparent" }))] }), _jsxs("div", { className: cn('min-w-0 flex-1', i < arr.length - 1 ? 'pb-5' : ''), children: [_jsxs("p", { className: "text-[13.5px] font-medium", children: [_jsxs("span", { className: "mono mr-2 text-[11px] text-primary/80", children: ["0", i + 1] }), s.t] }), _jsx("p", { className: "mt-1 text-[12px] leading-relaxed text-muted-foreground", children: s.d })] })] }, s.t))) })] }), _jsxs(Glass, { tone: "thin", className: "flex items-center gap-4 p-5", children: [_jsx(CalendarClock, { className: "h-5 w-5 shrink-0 text-[hsl(var(--warning))]" }), _jsx("div", { className: "min-w-0 text-[12.5px] leading-relaxed text-muted-foreground", children: "\u62A5\u540D\u622A\u6B62\u540E\u4E0D\u518D\u53D7\u7406\u65B0\u7533\u8BF7\uFF0C\u903E\u671F\u63D0\u4EA4\u7684\u8868\u5355\u5C06\u8F6C\u5165\u4E0B\u4E00\u8F6E\u62DB\u65B0\u3002" })] })] })] }) }), _jsxs(Section, { id: "positions", eyebrow: "Open Positions", title: "\u62DB\u65B0\u5C97\u4F4D", description: "\u6309\u5DE5\u4F5C\u7EC4\u7B5B\u9009\u4F60\u611F\u5174\u8DA3\u7684\u5C97\u4F4D\uFF0C\u67E5\u770B\u804C\u8D23\u4E0E\u8981\u6C42\u540E\u53EF\u76F4\u63A5\u7533\u8BF7\u3002", action: _jsx(Tabs, { items: tabs, value: group, onChange: setGroup, size: "sm", className: "hidden sm:block" }), children: [_jsx("div", { className: "sm:hidden", children: _jsx(Tabs, { items: tabs, value: group, onChange: setGroup, size: "sm" }) }), filtered.length ? (_jsx("div", { className: "mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3", children: filtered.map((p, i) => (_jsx("div", { "data-reveal": "scale", style: { transitionDelay: `${(i % 3) * 70}ms` }, children: _jsx(PositionCard, { position: p, onApply: () => applyFor(p), selected: form.positionId === String(p.id) }) }, p.id))) })) : (_jsx(Glass, { tone: "soft", className: "mt-10 p-4", children: _jsx(EmptyState, { icon: _jsx(Users, { className: "h-5 w-5" }), title: "\u8BE5\u5DE5\u4F5C\u7EC4\u6682\u65E0\u5F00\u653E\u5C97\u4F4D", description: "\u8BF7\u5207\u6362\u5176\u4ED6\u5DE5\u4F5C\u7EC4\uFF0C\u6216\u9009\u62E9\u300C\u5168\u90E8\u5C97\u4F4D\u300D\u67E5\u770B\u5B8C\u6574\u5217\u8868\u3002", action: _jsx(Button, { onClick: () => setGroup('all'), children: "\u67E5\u770B\u5168\u90E8\u5C97\u4F4D" }) }) }))] }), _jsx(Section, { id: "apply", eyebrow: "Application Form", title: "\u5728\u7EBF\u62A5\u540D", description: "\u8BF7\u5982\u5B9E\u586B\u5199\u4EE5\u4E0B\u4FE1\u606F\uFF0C\u5E26 * \u4E3A\u5FC5\u586B\u9879\u3002\u63D0\u4EA4\u540E\u53EF\u5728\u300C\u7528\u6237\u4E2D\u5FC3 \u2192 \u62DB\u65B0\u8FDB\u5EA6\u300D\u67E5\u770B\u5BA1\u6838\u72B6\u6001\u3002", children: _jsx("div", { ref: formRef, className: "scroll-mt-28", children: submitted ? (_jsx(SuccessPanel, { id: submitted.id, position: submitted.position, onReset: () => {
                                    setSubmitted(null);
                                    setForm((f) => ({ ...EMPTY_FORM, name: f.name, studentId: f.studentId, college: f.college, phone: f.phone, email: f.email }));
                                } })) : (_jsxs("div", { className: "grid gap-6 lg:grid-cols-[1.5fr_1fr]", children: [_jsxs(Glass, { tone: "strong", className: "p-6 sm:p-8", "data-reveal": true, children: [formError && (_jsxs("div", { className: cn('mb-6 flex items-start gap-3 rounded-2xl border px-4 py-3.5', formError.conflict
                                                    ? 'border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10'
                                                    : 'border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/10'), style: { animation: 'sti-pop .3s cubic-bezier(.22,1,.36,1) both' }, role: "alert", children: [_jsx(AlertCircle, { className: cn('mt-0.5 h-4 w-4 shrink-0', formError.conflict ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--destructive))]') }), _jsxs("div", { className: "min-w-0 text-[13px] leading-relaxed", children: [_jsx("p", { className: cn('font-medium', formError.conflict ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--destructive))]'), children: formError.conflict ? '你已提交过报名申请' : '提交失败' }), _jsx("p", { className: "mt-1 text-foreground/75", children: formError.conflict
                                                                    ? '同一个学号在一轮招新中只能提交一次。请耐心等待筛选结果，如需修改已提交的信息，可在「互动与反馈」留言说明。'
                                                                    : formError.text }), formError.conflict && (_jsxs("div", { className: "mt-3 flex flex-wrap gap-2.5", children: [_jsx(LinkButton, { to: "/account/join", size: "sm", variant: "glass", children: "\u67E5\u770B\u6211\u7684\u62DB\u65B0\u8FDB\u5EA6" }), _jsx(LinkButton, { to: "/feedback", size: "sm", variant: "ghost", children: "\u53BB\u7559\u8A00\u8BF4\u660E" })] }))] })] })), _jsxs("form", { onSubmit: onSubmit, noValidate: true, className: "flex flex-col gap-5", children: [_jsx(Field, { label: "\u610F\u5411\u5C97\u4F4D", required: true, error: errors.positionId, hint: !errors.positionId ? '可先在「招新岗位」中点击「申请该岗位」自动选择' : undefined, children: _jsxs(Select, { value: form.positionId, onChange: (e) => set('positionId')(e.target.value), "data-invalid": errors.positionId ? 'true' : undefined, disabled: !positions.length, children: [_jsx("option", { value: "", children: "\u8BF7\u9009\u62E9\u610F\u5411\u5C97\u4F4D" }), positions.map((p) => (_jsxs("option", { value: String(p.id), children: [p.group, " \u00B7 ", p.name, "\uFF08", p.headcount, " \u4EBA\uFF09"] }, p.id)))] }) }), _jsxs("div", { className: "grid gap-5 sm:grid-cols-2", children: [_jsx(Field, { label: "\u59D3\u540D", required: true, error: errors.name, children: _jsx(Input, { value: form.name, onChange: (e) => set('name')(e.target.value), placeholder: "\u8BF7\u8F93\u5165\u771F\u5B9E\u59D3\u540D", autoComplete: "name", "data-invalid": errors.name ? 'true' : undefined }) }), _jsx(Field, { label: "\u5B66\u53F7", required: true, error: errors.studentId, children: _jsx(Input, { value: form.studentId, onChange: (e) => set('studentId')(e.target.value), placeholder: "\u5982 2024100123", inputMode: "numeric", "data-invalid": errors.studentId ? 'true' : undefined }) }), _jsx(Field, { label: "\u5B66\u9662", required: true, error: errors.college, children: _jsx(Input, { value: form.college, onChange: (e) => set('college')(e.target.value), placeholder: "\u5982 \u8BA1\u7B97\u673A\u79D1\u5B66\u4E0E\u6280\u672F\u5B66\u9662", "data-invalid": errors.college ? 'true' : undefined }) }), _jsx(Field, { label: "\u4E13\u4E1A", required: true, error: errors.major, children: _jsx(Input, { value: form.major, onChange: (e) => set('major')(e.target.value), placeholder: "\u5982 \u8F6F\u4EF6\u5DE5\u7A0B", "data-invalid": errors.major ? 'true' : undefined }) }), _jsx(Field, { label: "\u5E74\u7EA7", required: true, error: errors.grade, children: _jsxs(Select, { value: form.grade, onChange: (e) => set('grade')(e.target.value), "data-invalid": errors.grade ? 'true' : undefined, children: [_jsx("option", { value: "", children: "\u8BF7\u9009\u62E9\u5E74\u7EA7" }), GRADES.map((g) => (_jsx("option", { value: g, children: g }, g)))] }) }), _jsx(Field, { label: "\u624B\u673A\u53F7", required: true, error: errors.phone, children: _jsx(Input, { value: form.phone, onChange: (e) => set('phone')(e.target.value), placeholder: "11 \u4F4D\u624B\u673A\u53F7", inputMode: "tel", autoComplete: "tel", "data-invalid": errors.phone ? 'true' : undefined }) })] }), _jsx(Field, { label: "\u90AE\u7BB1", error: errors.email, hint: !errors.email ? '用于接收面试通知，建议填写常用邮箱' : undefined, children: _jsx(Input, { value: form.email, onChange: (e) => set('email')(e.target.value), placeholder: "name@university.edu.cn", type: "email", autoComplete: "email", "data-invalid": errors.email ? 'true' : undefined }) }), _jsx(Field, { label: "\u6280\u80FD\u7279\u957F", hint: "\u5982 React / TypeScript\u3001Figma \u8BBE\u8BA1\u3001\u89C6\u9891\u526A\u8F91\u3001\u786C\u4EF6\u8C03\u8BD5\u7B49\uFF0C\u7528\u987F\u53F7\u6216\u9017\u53F7\u5206\u9694", children: _jsx(Input, { value: form.skills, onChange: (e) => set('skills')(e.target.value), placeholder: "\u9009\u586B\uFF0C\u6709\u52A9\u4E8E\u6211\u4EEC\u5B89\u6392\u66F4\u9002\u5408\u4F60\u7684\u5C97\u4F4D" }) }), _jsx(Field, { label: "\u81EA\u6211\u4ECB\u7ECD", required: true, error: errors.intro, hint: !errors.intro
                                                            ? `至少 10 字，建议说明报名动机、相关经历与可投入时间（当前 ${form.intro.trim().length} 字）`
                                                            : undefined, children: _jsx(Textarea, { value: form.intro, onChange: (e) => set('intro')(e.target.value), rows: 6, placeholder: "\u4E3A\u4EC0\u4E48\u60F3\u52A0\u5165\u79D1\u6280\u521B\u65B0\u90E8\uFF1F\u4F60\u5E0C\u671B\u5728\u54EA\u4E2A\u65B9\u5411\u6210\u957F\uFF1F", "data-invalid": errors.intro ? 'true' : undefined }) }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 border-t border-white/8 pt-6", children: [_jsxs(Button, { type: "submit", variant: "primary", size: "lg", loading: submitting, children: [submitting ? '提交中…' : '提交报名表', !submitting && _jsx(ArrowRight, { className: "h-4 w-4" })] }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => {
                                                                    setForm(EMPTY_FORM);
                                                                    setErrors({});
                                                                    setFormError(null);
                                                                }, disabled: submitting, children: "\u91CD\u7F6E" }), _jsx("p", { className: "text-[11.5px] leading-relaxed text-muted-foreground", children: "\u63D0\u4EA4\u5373\u8868\u793A\u540C\u610F\u90E8\u95E8\u5C06\u4F60\u7684\u4FE1\u606F\u7528\u4E8E\u62DB\u65B0\u7B5B\u9009\u3002" })] })] })] }), _jsxs("div", { className: "flex flex-col gap-4", "data-reveal": "right", children: [_jsxs(Glass, { tone: "soft", className: "relative overflow-hidden p-6", children: [_jsx(Sparkles, { className: "h-4 w-4 text-accent" }), _jsx("h3", { className: "mt-4 text-[15px] font-semibold", children: "\u62A5\u540D\u524D\u8BF7\u786E\u8BA4" }), _jsx("ul", { className: "mt-4 flex flex-col gap-3", children: [
                                                            '同一学号在一轮招新中只能提交一次报名表',
                                                            '手机号与邮箱务必填写正确，面试通知将通过它们发出',
                                                            '技术岗面试含简单实操，可提前准备一个做过的项目',
                                                            '如需附作品集，请在自我介绍中留下可访问的链接',
                                                        ].map((t) => (_jsxs("li", { className: "flex items-start gap-3 text-[13px] leading-relaxed text-foreground/80", children: [_jsx("span", { className: "mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" }), t] }, t))) })] }), _jsxs(Glass, { tone: "thin", className: "p-5", children: [_jsxs("div", { className: "flex items-center gap-2.5 text-[13px] font-medium", children: [_jsx(GraduationCap, { className: "h-4 w-4 text-primary" }), "\u8FD8\u6CA1\u6709\u95E8\u6237\u8D26\u53F7\uFF1F"] }), _jsx("p", { className: "mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground", children: "\u6CE8\u518C\u5B66\u751F\u8D26\u53F7\u540E\uFF0C\u53EF\u5728\u300C\u7528\u6237\u4E2D\u5FC3\u300D\u968F\u65F6\u67E5\u770B\u62DB\u65B0\u8FDB\u5EA6\u3001\u9762\u8BD5\u901A\u77E5\u4E0E\u7ED3\u679C\u516C\u793A\u3002" }), _jsx(LinkButton, { to: "/register", size: "sm", className: "mt-4 w-full", children: "\u6CE8\u518C\u5B66\u751F\u8D26\u53F7" })] })] })] })) }) }), _jsx(Section, { id: "approved", eyebrow: "Public Notice", title: "\u5F55\u7528\u516C\u793A\u540D\u5355", description: `共 ${approved.length} 位同学通过本轮选拔，公示期为 3 天，如有异议请通过「互动与反馈」提交。`, children: _jsx("div", { "data-reveal": true, children: approved.length ? (_jsx(TableWrap, { children: _jsxs("table", { className: "w-full border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx(Th, { className: "w-12", children: "#" }), _jsx(Th, { children: "\u59D3\u540D" }), _jsx(Th, { children: "\u5B66\u9662" }), _jsx(Th, { children: "\u4E13\u4E1A" }), _jsx(Th, { children: "\u5F55\u7528\u5C97\u4F4D" }), _jsx(Th, { className: "text-right", children: "\u516C\u793A\u65F6\u95F4" })] }) }), _jsx("tbody", { children: approved.map((r, i) => (_jsxs("tr", { className: "transition-colors hover:bg-white/[0.03]", children: [_jsx(Td, { className: "mono text-muted-foreground", children: String(i + 1).padStart(2, '0') }), _jsx(Td, { className: "font-medium text-foreground", children: r.name }), _jsx(Td, { className: "text-muted-foreground", children: r.college || '—' }), _jsx(Td, { className: "text-muted-foreground", children: r.major || '—' }), _jsx(Td, { children: _jsx(Chip, { tone: "primary", children: r.positionName || '待分配' }) }), _jsx(Td, { className: "mono text-right text-muted-foreground", children: fdate(r.createdAt) })] }, `${r.name}-${r.createdAt}-${i}`))) })] }) })) : (_jsx(Glass, { tone: "soft", className: "p-4", children: _jsx(EmptyState, { icon: _jsx(BadgeCheck, { className: "h-5 w-5" }), title: "\u672C\u6B21\u5F55\u7528\u540D\u5355\u5C1A\u672A\u516C\u793A", description: "\u9762\u8BD5\u7ED3\u675F\u540E\uFF0C\u5F55\u7528\u7ED3\u679C\u5C06\u5728\u6B64\u5904\u516C\u793A\u3002\u5DF2\u62A5\u540D\u7684\u540C\u5B66\u53EF\u5728\u7528\u6237\u4E2D\u5FC3\u67E5\u770B\u5B9E\u65F6\u8FDB\u5EA6\u3002", action: _jsx(LinkButton, { to: "/account/join", children: "\u67E5\u770B\u6211\u7684\u62DB\u65B0\u8FDB\u5EA6" }) }) })) }) }), _jsx(Section, { id: "faq", eyebrow: "FAQ", title: "\u5E38\u89C1\u95EE\u9898", description: "\u5173\u4E8E\u62DB\u65B0\u7684\u7591\u95EE\uFF0C\u8FD9\u91CC\u4E5F\u8BB8\u5DF2\u6709\u7B54\u6848\u3002\u4ECD\u672A\u89E3\u51B3\u53EF\u4EE5\u5728\u300C\u4E92\u52A8\u4E0E\u53CD\u9988\u300D\u7559\u8A00\u3002", action: _jsxs(LinkButton, { to: "/feedback", children: [_jsx(HelpCircle, { className: "h-4 w-4" }), "\u53BB\u63D0\u95EE"] }), children: _jsx("div", { "data-reveal": "blur", children: _jsx(Accordion, { items: FAQ }) }) })] })), _jsx("div", { className: "pb-24" })] }));
}
/* =============================================================================
 * 岗位卡片
 * ========================================================================== */
function PositionCard({ position, onApply, selected, }) {
    const reqs = Array.isArray(position.requirements) ? position.requirements : [];
    return (_jsxs(Glass, { tone: "soft", hover: true, sheen: true, className: cn('flex h-full flex-col p-6', selected && 'ring-1 ring-primary/45'), children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "min-w-0", children: [_jsx(Chip, { tone: "accent", children: position.group }), _jsx("h3", { className: "mt-3.5 text-[17px] font-semibold leading-snug", children: position.name })] }), _jsxs("span", { className: "mono shrink-0 rounded-full border border-white/12 bg-white/[0.055] px-3 py-1 text-[11px] text-foreground/80", children: ["\u62DB\u52DF ", position.headcount, " \u4EBA"] })] }), _jsx("p", { className: "mt-3.5 text-[13px] leading-relaxed text-muted-foreground", children: position.description }), _jsxs("div", { className: "mt-5 flex-1", children: [_jsx("p", { className: "text-[11px] uppercase tracking-[0.22em] text-muted-foreground", children: "\u5C97\u4F4D\u8981\u6C42" }), reqs.length ? (_jsx("ul", { className: "mt-3 flex flex-col gap-2.5", children: reqs.map((r) => (_jsxs("li", { className: "flex items-start gap-2.5 text-[12.5px] leading-relaxed text-foreground/80", children: [_jsx("span", { className: "mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/85" }), r] }, r))) })) : (_jsx("p", { className: "mt-3 text-[12.5px] text-muted-foreground", children: "\u65E0\u786C\u6027\u8981\u6C42\uFF0C\u6B22\u8FCE\u96F6\u57FA\u7840\u540C\u5B66\u62A5\u540D\u3002" }))] }), _jsx(Button, { variant: selected ? 'primary' : 'glass', className: "mt-6 w-full", onClick: onApply, children: selected ? (_jsxs(_Fragment, { children: [_jsx(CheckCircle2, { className: "h-4 w-4" }), "\u5DF2\u9009\u62E9\u8BE5\u5C97\u4F4D"] })) : ('申请该岗位') })] }));
}
/* =============================================================================
 * 提交成功态
 * ========================================================================== */
function SuccessPanel({ id, position, onReset, }) {
    const steps = [
        { t: '简历筛选', d: '3 个工作日内完成，结果通过短信与邮件通知' },
        { t: '面试', d: '线上 / 线下结合，技术岗含简单实操，约 20 分钟' },
        { t: '录用公示', d: '最终名单在门户「加入我们」栏目公示 3 天' },
    ];
    return (_jsxs(Glass, { tone: "strong", className: "relative overflow-hidden p-8 sm:p-12", style: { animation: 'sti-pop .45s cubic-bezier(.22,1,.36,1) both' }, children: [_jsx("div", { "aria-hidden": true, className: "pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full blur-[80px]", style: { background: 'radial-gradient(circle, rgba(255,255,255,.055), transparent 68%)' } }), _jsxs("div", { className: "relative max-w-3xl", children: [_jsx("span", { className: "flex h-14 w-14 items-center justify-center rounded-2xl border border-[hsl(var(--success))]/35 bg-[hsl(var(--success))]/12 text-[hsl(var(--success))]", children: _jsx(CheckCircle2, { className: "h-6 w-6" }) }), _jsx("h2", { className: "mt-6 text-2xl font-semibold tracking-tight sm:text-3xl", children: "\u62A5\u540D\u5DF2\u63D0\u4EA4\u6210\u529F" }), _jsxs("p", { className: "mt-4 text-[14.5px] leading-relaxed text-muted-foreground", children: ["\u611F\u8C22\u4F60\u9009\u62E9\u79D1\u6280\u521B\u65B0\u90E8\u3002\u6211\u4EEC\u5DF2\u6536\u5230\u4F60\u7684\u62A5\u540D\u4FE1\u606F", id ? (_jsxs(_Fragment, { children: ["\uFF0C\u56DE\u6267\u7F16\u53F7 ", _jsxs("span", { className: "mono text-primary", children: ["#", id] })] })) : null, position ? (_jsxs(_Fragment, { children: ["\uFF0C\u610F\u5411\u5C97\u4F4D\u4E3A\u300C", _jsxs("span", { className: "text-foreground/90", children: [position.group, " \u00B7 ", position.name] }), "\u300D"] })) : null, "\u3002"] }), _jsx("div", { className: "mt-8 grid gap-4 sm:grid-cols-3", children: steps.map((s, i) => (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/[0.035] p-5", children: [_jsxs("span", { className: "mono text-[11px] text-primary", children: ["0", i + 1] }), _jsx("p", { className: "mt-2.5 text-[14px] font-medium", children: s.t }), _jsx("p", { className: "mt-1.5 text-[12px] leading-relaxed text-muted-foreground", children: s.d })] }, s.t))) }), _jsxs("div", { className: "mt-8 flex flex-wrap items-center gap-3", children: [_jsxs(LinkButton, { to: "/account/join", variant: "primary", children: ["\u67E5\u770B\u62DB\u65B0\u8FDB\u5EA6 ", _jsx(ArrowRight, { className: "h-4 w-4" })] }), _jsx(Button, { variant: "glass", onClick: onReset, children: "\u518D\u586B\u4E00\u4EFD\u62A5\u540D\u8868" }), _jsx(LinkButton, { to: "/feedback", variant: "ghost", children: "\u6709\u95EE\u9898\u60F3\u95EE" })] }), _jsx("p", { className: "mt-6 text-[12px] leading-relaxed text-muted-foreground", children: "\u63D0\u793A\uFF1A\u8BF7\u4FDD\u6301\u624B\u673A\u7545\u901A\u3002\u7B5B\u9009\u7ED3\u679C\u4E0E\u9762\u8BD5\u5B89\u6392\u4F1A\u540C\u65F6\u53D1\u9001\u5230\u95E8\u6237\u300C\u7528\u6237\u4E2D\u5FC3 \u2192 \u6D88\u606F\u901A\u77E5\u300D\u3002" })] })] }));
}
/* =============================================================================
 * 加载骨架
 * ========================================================================== */
function LoadingSkeleton() {
    return (_jsxs(Section, { container: "shell", className: "!pt-0", children: [_jsxs("div", { className: "grid gap-6 lg:grid-cols-[1.6fr_1fr]", children: [_jsx(Skeleton, { className: "h-72" }), _jsxs("div", { className: "flex flex-col gap-4", children: [_jsx(Skeleton, { className: "h-40" }), _jsx(Skeleton, { className: "h-24" })] })] }), _jsx("div", { className: "mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-3", children: Array.from({ length: 6 }).map((_, i) => (_jsx(Skeleton, { className: "h-72" }, i))) }), _jsxs("div", { className: "mt-16 grid gap-6 lg:grid-cols-[1.5fr_1fr]", children: [_jsx(Skeleton, { className: "h-[520px]" }), _jsx(Skeleton, { className: "h-64" })] })] }));
}

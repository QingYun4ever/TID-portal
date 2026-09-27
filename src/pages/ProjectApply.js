import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, Building2, CalendarClock, Check, CheckCircle2, ClipboardList, FileText, Info, Mail, MapPin, Phone, RotateCcw, Send, ShieldCheck, Sparkles, Trophy, Users, } from 'lucide-react';
import { PublicApi, SubmitApi } from '@/lib/api';
import { useApi, useRevealScan, useTitle } from '@/lib/hooks';
import { useAuth, useSettings, useToast } from '@/lib/store';
import { cn, fdate } from '@/lib/utils';
import { ListInput } from '@/components/AdminKit';
import { GlowOrb } from '@/components/LiquidBackdrop';
import { Button, Checkbox, Chip, Field, Glass, Input, LinkButton, PageHero, Select, Skeleton, Textarea, } from '@/components/ui';
/* =============================================================================
 * 项目在线申报（/projects/apply）—— 门户最重要的办事入口
 *  步骤 1：项目基本信息（名称 / 类别 / 参赛竞赛）
 *  步骤 2：团队信息（负责人 / 指导教师 / 人数 / 成员列表）
 *  步骤 3：项目简介（≥20 字，带字数统计）+ 承诺勾选
 *  提交：SubmitApi.applyProject → 成功页（申报编号 + 后续流程 + 进度查询）
 * ========================================================================== */
const STEPS = [
    { n: 1, title: '项目基本信息', desc: '项目名称、类别与参赛意向' },
    { n: 2, title: '团队信息', desc: '负责人、指导教师与成员' },
    { n: 3, title: '项目简介与承诺', desc: '简介不少于 20 字' },
];
const PROJECT_CATEGORY_OPTIONS = [
    { value: '创新训练', desc: '以技术创新与原型验证为主，适合技术探索类项目' },
    { value: '创业训练', desc: '围绕商业计划与市场验证，适合产品化探索' },
    { value: '创业实践', desc: '已具备落地条件的创业项目，可申请孵化支持' },
];
const EMPTY = {
    title: '',
    category: '',
    competitionId: '',
    leaderName: '',
    leaderStudentId: '',
    leaderCollege: '',
    leaderPhone: '',
    leaderEmail: '',
    advisor: '',
    teamSize: '3',
    members: [],
    intro: '',
    agree: false,
};
/* ------------------------------ 分步校验 ------------------------------ */
function validateStep1(f) {
    const e = {};
    const title = f.title.trim();
    if (!title)
        e.title = '请填写项目名称';
    else if (title.length < 4)
        e.title = '项目名称至少 4 个字';
    else if (title.length > 60)
        e.title = '项目名称请控制在 60 个字以内';
    if (!f.category)
        e.category = '请选择项目类别';
    else if (!PROJECT_CATEGORY_OPTIONS.some((o) => o.value === f.category))
        e.category = '项目类别不合法';
    return e;
}
function validateStep2(f) {
    const e = {};
    const name = f.leaderName.trim();
    if (!name)
        e.leaderName = '请填写负责人姓名';
    else if (!/^[\u4e00-\u9fa5A-Za-z·\s]{2,20}$/.test(name))
        e.leaderName = '姓名格式不正确（2–20 位中英文字符）';
    const sid = f.leaderStudentId.trim();
    if (!sid)
        e.leaderStudentId = '请填写负责人学号';
    else if (!/^[A-Za-z0-9]{4,20}$/.test(sid))
        e.leaderStudentId = '学号应为 4–20 位字母或数字';
    if (!f.leaderCollege.trim())
        e.leaderCollege = '请填写负责人所在学院';
    const phone = f.leaderPhone.trim();
    if (!phone)
        e.leaderPhone = '请填写联系电话';
    else if (!/^1[3-9]\d{9}$/.test(phone))
        e.leaderPhone = '手机号格式不正确（11 位，1 开头）';
    const email = f.leaderEmail.trim();
    if (email && !/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(email))
        e.leaderEmail = '邮箱格式不正确';
    const size = Number(f.teamSize);
    if (!f.teamSize.trim())
        e.teamSize = '请填写团队人数';
    else if (!Number.isInteger(size) || size < 1 || size > 20)
        e.teamSize = '团队人数应为 1–20 之间的整数';
    const members = f.members.map((m) => m.trim()).filter(Boolean);
    if (members.some((m) => m.length < 2))
        e.members = '成员姓名至少 2 个字';
    else if (Number.isInteger(size) && size >= 1 && members.length > size - 1)
        e.members = `成员数量不能超过 ${size - 1} 人（团队人数含负责人）`;
    return e;
}
function validateStep3(f) {
    const e = {};
    const intro = f.intro.trim();
    if (!intro)
        e.intro = '请填写项目简介';
    else if (intro.length < 20)
        e.intro = `项目简介至少 20 字，当前 ${intro.length} 字`;
    else if (intro.length > 1000)
        e.intro = '项目简介请控制在 1000 字以内';
    if (!f.agree)
        e.agree = '请阅读并勾选承诺条款后再提交';
    return e;
}
function validateAll(f) {
    return { ...validateStep1(f), ...validateStep2(f), ...validateStep3(f) };
}
export default function ProjectApply() {
    useTitle('项目在线申报');
    const toast = useToast();
    const { user } = useAuth();
    const { settings } = useSettings();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [topError, setTopError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);
    const formRef = useRef(null);
    /* 竞赛列表（可选参赛意向） */
    const { data: comps, loading: compsLoading } = useApi(() => PublicApi.competitions(), []);
    const competitions = Array.isArray(comps) ? comps : [];
    /* 登录用户自动预填负责人信息 */
    useEffect(() => {
        if (!user)
            return;
        setForm((f) => ({
            ...f,
            leaderName: f.leaderName || user.name || '',
            leaderStudentId: f.leaderStudentId || user.studentId || '',
            leaderCollege: f.leaderCollege || user.college || '',
            leaderPhone: f.leaderPhone || user.phone || '',
            leaderEmail: f.leaderEmail || user.email || '',
        }));
    }, [user]);
    const set = (k, v) => {
        setForm((f) => ({ ...f, [k]: v }));
        setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
    };
    const scrollToForm = () => {
        // 表单顶部对齐，避免分步切换后停在页面中部
        requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };
    const next = () => {
        const e = step === 1 ? validateStep1(form) : step === 2 ? validateStep2(form) : {};
        setErrors(e);
        if (Object.keys(e).length) {
            toast.error('请完善当前步骤', '有必填项未填写或格式不正确');
            return;
        }
        setStep((s) => (s === 1 ? 2 : 3));
        scrollToForm();
    };
    const back = () => {
        setErrors({});
        setStep((s) => (s === 3 ? 2 : 1));
        scrollToForm();
    };
    const submit = async () => {
        setTopError(null);
        const all = validateAll(form);
        setErrors(all);
        if (Object.keys(all).length) {
            const s1 = validateStep1(form);
            const badStep = Object.keys(s1).length ? 1 : Object.keys(validateStep2(form)).length ? 2 : 3;
            setStep(badStep);
            scrollToForm();
            toast.error('申报信息不完整', '请检查标红的字段后重新提交');
            return;
        }
        setBusy(true);
        try {
            const out = await SubmitApi.applyProject({
                title: form.title.trim(),
                category: form.category,
                competitionId: form.competitionId ? Number(form.competitionId) : null,
                leaderName: form.leaderName.trim(),
                leaderStudentId: form.leaderStudentId.trim(),
                leaderCollege: form.leaderCollege.trim(),
                leaderPhone: form.leaderPhone.trim(),
                leaderEmail: form.leaderEmail.trim() || null,
                advisor: form.advisor.trim() || null,
                teamSize: Number(form.teamSize) || 1,
                members: form.members.map((m) => m.trim()).filter(Boolean),
                intro: form.intro.trim(),
                materials: [],
            });
            const id = Number(out?.id ?? 0);
            setResult({ id, at: new Date().toISOString() });
            toast.success('申报提交成功', `申报编号 #${String(id).padStart(4, '0')}，可在用户中心查看进度。`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        catch (err) {
            const msg = err?.message || '提交失败，请稍后重试';
            setTopError(msg);
            toast.error('提交失败', msg);
        }
        finally {
            setBusy(false);
        }
    };
    const resetAll = () => {
        setForm(EMPTY);
        setErrors({});
        setTopError(null);
        setResult(null);
        setStep(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const selectedComp = useMemo(() => competitions.find((c) => String(c.id) === form.competitionId), [competitions, form.competitionId]);
    /* 步骤切换 / 成功页挂载后重新扫描滚动揭示元素 */
    useRevealScan(`apply|${step}|${result ? 'done' : 'form'}`);
    return (_jsxs(_Fragment, { children: [_jsx(PageHero, { eyebrow: "Project Application", title: "\u9879\u76EE\u5728\u7EBF\u7533\u62A5", description: "\u5927\u5B66\u751F\u521B\u65B0\u521B\u4E1A\u8BAD\u7EC3\u8BA1\u5212\u9879\u76EE\u5168\u5E74\u53D7\u7406\u5728\u7EBF\u7533\u62A5\u3002\u586B\u5199\u9879\u76EE\u57FA\u672C\u4FE1\u606F\u3001\u56E2\u961F\u4FE1\u606F\u4E0E\u9879\u76EE\u7B80\u4ECB\uFF0C5 \u4E2A\u5DE5\u4F5C\u65E5\u5185\u53CD\u9988\u521D\u5BA1\u7ED3\u679C\u3002", breadcrumb: [{ label: '创新项目', to: '/projects' }, { label: '在线申报' }], children: _jsxs("div", { className: "flex flex-wrap items-center gap-2.5", children: [_jsxs(Chip, { tone: "primary", children: [_jsx(Sparkles, { className: "h-3 w-3" }), "\u5728\u7EBF\u7533\u62A5 \u00B7 \u5168\u5E74\u53D7\u7406"] }), _jsxs(Chip, { tone: "warning", children: [_jsx(CalendarClock, { className: "h-3 w-3" }), "\u521D\u5BA1 5 \u4E2A\u5DE5\u4F5C\u65E5"] }), user ? (_jsxs(Chip, { tone: "success", children: [_jsx(BadgeCheck, { className: "h-3 w-3" }), "\u5DF2\u767B\u5F55\uFF1A", user.name] })) : (_jsxs(Chip, { tone: "default", children: [_jsx(Info, { className: "h-3 w-3" }), "\u65E0\u9700\u767B\u5F55\u5373\u53EF\u63D0\u4EA4\uFF0C\u767B\u5F55\u540E\u53EF\u67E5\u8FDB\u5EA6"] }))] }) }), _jsx("section", { className: "shell pb-24", children: result ? (_jsx(SuccessView, { id: result.id, at: result.at, form: form, competitionTitle: selectedComp?.title, loggedIn: !!user, onReset: resetAll })) : (_jsxs("div", { className: "grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]", children: [_jsx("div", { ref: formRef, className: "min-w-0 scroll-mt-24", "data-reveal": true, children: _jsxs(Glass, { tone: "soft", className: "p-6 sm:p-8", children: [_jsx(Steps, { step: step, onJump: (n) => { setErrors({}); setStep(n); scrollToForm(); } }), _jsxs("div", { className: "mt-8 border-t border-white/8 pt-7", children: [topError && (_jsxs("div", { className: "mb-6 flex items-start gap-3 rounded-2xl border border-[hsl(var(--destructive))]/35 bg-[hsl(var(--destructive))]/10 px-4 py-3.5", children: [_jsx(AlertTriangle, { className: "mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--destructive))]" }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-[13px] font-medium", children: "\u63D0\u4EA4\u5931\u8D25" }), _jsx("p", { className: "mt-1 text-[12px] leading-relaxed text-foreground/80", children: topError }), topError.includes('重复') && (_jsx(Link, { to: "/account/applications", className: "mt-2 inline-block text-[12px] text-primary transition hover:underline", children: "\u524D\u5F80\u300C\u6211\u7684\u9879\u76EE\u300D\u67E5\u770B\u5DF2\u63D0\u4EA4\u8BB0\u5F55 \u2192" }))] })] })), step === 1 && (_jsxs("div", { className: "flex flex-col gap-5", style: { animation: 'sti-fade .3s ease both' }, children: [_jsx(Field, { label: "\u9879\u76EE\u540D\u79F0", required: true, error: errors.title, hint: `请填写完整项目名称，4–60 个字（当前 ${form.title.trim().length} 字）`, children: _jsx(Input, { value: form.title, onChange: (e) => set('title', e.target.value), placeholder: "\u4F8B\u5982\uFF1A\u300C\u7075\u7738\u300D\u2014\u2014 \u9762\u5411\u89C6\u969C\u4EBA\u7FA4\u7684\u5BA4\u5185\u5BFC\u822A\u7CFB\u7EDF", maxLength: 80 }) }), _jsx(Field, { label: "\u9879\u76EE\u7C7B\u522B", required: true, error: errors.category, hint: "\u7C7B\u522B\u5C06\u51B3\u5B9A\u8BC4\u5BA1\u4FA7\u91CD\u70B9\u4E0E\u540E\u7EED\u5B75\u5316\u8DEF\u5F84", children: _jsx("div", { className: "grid gap-2.5 sm:grid-cols-3", children: PROJECT_CATEGORY_OPTIONS.map((o) => {
                                                                const active = form.category === o.value;
                                                                return (_jsxs("button", { type: "button", onClick: () => set('category', o.value), "aria-pressed": active, className: cn('rounded-2xl border p-4 text-left transition-all duration-300', active
                                                                        ? 'border-primary/50 bg-primary/12 shadow-[0_0_24px_-14px_hsl(var(--primary)/.9)]'
                                                                        : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.055]'), children: [_jsxs("span", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: cn('text-[13.5px] font-medium', active && 'text-primary'), children: o.value }), _jsx("span", { className: cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all', active ? 'border-primary bg-primary text-[hsl(var(--primary-foreground))]' : 'border-white/25'), children: active && _jsx(Check, { className: "h-2.5 w-2.5", strokeWidth: 3.2 }) })] }), _jsx("span", { className: "mt-2 block text-[11.5px] leading-relaxed text-muted-foreground", children: o.desc })] }, o.value));
                                                            }) }) }), _jsx(Field, { label: "\u53C2\u8D5B\u7ADE\u8D5B\uFF08\u9009\u586B\uFF09", hint: "\u5982\u9879\u76EE\u540C\u65F6\u7533\u62A5\u67D0\u8D5B\u4E8B\uFF0C\u53EF\u5728\u6B64\u5173\u8054\uFF0C\u4FBF\u4E8E\u540E\u7EED\u7EDF\u4E00\u7BA1\u7406\u4E0E\u63D0\u9192", children: compsLoading ? (_jsx(Skeleton, { className: "h-[42px] rounded-2xl" })) : (_jsxs(Select, { value: form.competitionId, onChange: (e) => set('competitionId', e.target.value), children: [_jsx("option", { value: "", children: "\u6682\u4E0D\u5173\u8054\u7ADE\u8D5B" }), competitions.map((c) => (_jsxs("option", { value: String(c.id), children: [c.title, c.level ? `（${c.level}）` : ''] }, c.id)))] })) }), selectedComp && (_jsxs("div", { className: "flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent/8 px-4 py-3.5", children: [_jsx(Trophy, { className: "mt-0.5 h-4 w-4 shrink-0 text-accent" }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-[12.5px] font-medium", children: selectedComp.title }), _jsxs("p", { className: "mono mt-1 text-[11px] text-muted-foreground", children: [selectedComp.organizer, selectedComp.signupDeadline && ` · 报名截止 ${fdate(selectedComp.signupDeadline)}`] })] })] }))] })), step === 2 && (_jsxs("div", { className: "flex flex-col gap-5", style: { animation: 'sti-fade .3s ease both' }, children: [_jsx("p", { className: "text-[12.5px] text-muted-foreground", children: "\u8D1F\u8D23\u4EBA\u4FE1\u606F\u7528\u4E8E\u8054\u7EDC\u4E0E\u5BA1\u6838\u901A\u77E5\uFF0C\u8BF7\u786E\u4FDD\u624B\u673A\u53F7\u53EF\u6B63\u5E38\u63A5\u6536\u77ED\u4FE1\u3002" }), _jsxs("div", { className: "grid gap-5 sm:grid-cols-2", children: [_jsx(Field, { label: "\u8D1F\u8D23\u4EBA\u59D3\u540D", required: true, error: errors.leaderName, children: _jsx(Input, { value: form.leaderName, onChange: (e) => set('leaderName', e.target.value), placeholder: "\u8BF7\u8F93\u5165\u771F\u5B9E\u59D3\u540D", autoComplete: "name" }) }), _jsx(Field, { label: "\u8D1F\u8D23\u4EBA\u5B66\u53F7", required: true, error: errors.leaderStudentId, children: _jsx(Input, { value: form.leaderStudentId, onChange: (e) => set('leaderStudentId', e.target.value), placeholder: "\u5982 2023100123", inputMode: "numeric" }) }), _jsx(Field, { label: "\u6240\u5728\u5B66\u9662", required: true, error: errors.leaderCollege, children: _jsx(Input, { value: form.leaderCollege, onChange: (e) => set('leaderCollege', e.target.value), placeholder: "\u5982 \u8BA1\u7B97\u673A\u79D1\u5B66\u4E0E\u6280\u672F\u5B66\u9662" }) }), _jsx(Field, { label: "\u624B\u673A\u53F7", required: true, error: errors.leaderPhone, hint: "\u63A5\u6536\u5BA1\u6838\u7ED3\u679C\u4E0E\u7B54\u8FA9\u5B89\u6392\u901A\u77E5", children: _jsx(Input, { value: form.leaderPhone, onChange: (e) => set('leaderPhone', e.target.value), placeholder: "11 \u4F4D\u624B\u673A\u53F7", inputMode: "tel", autoComplete: "tel" }) }), _jsx(Field, { label: "\u90AE\u7BB1", error: errors.leaderEmail, hint: "\u9009\u586B\uFF0C\u7528\u4E8E\u63A5\u6536\u8BC4\u5BA1\u610F\u89C1\u4E0E\u516C\u793A\u901A\u77E5", children: _jsx(Input, { value: form.leaderEmail, onChange: (e) => set('leaderEmail', e.target.value), placeholder: "name@university.edu.cn", inputMode: "email", autoComplete: "email" }) }), _jsx(Field, { label: "\u6307\u5BFC\u6559\u5E08", hint: "\u9009\u586B\uFF0C\u53EF\u5148\u586B\u5199\u610F\u5411\u5BFC\u5E08\uFF0C\u7ACB\u9879\u540E\u53EF\u5728\u540E\u53F0\u8865\u5145", children: _jsx(Input, { value: form.advisor, onChange: (e) => set('advisor', e.target.value), placeholder: "\u5982 \u738B\u5EFA\u56FD \u6559\u6388" }) })] }), _jsxs("div", { className: "grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)]", children: [_jsx(Field, { label: "\u56E2\u961F\u4EBA\u6570", required: true, error: errors.teamSize, hint: "\u542B\u8D1F\u8D23\u4EBA\u5728\u5185\uFF0C1\u201320 \u4EBA", children: _jsx(Input, { value: form.teamSize, onChange: (e) => set('teamSize', e.target.value), placeholder: "3", inputMode: "numeric" }) }), _jsx(Field, { label: "\u56E2\u961F\u6210\u5458", error: errors.members, hint: "\u6BCF\u884C\u586B\u5199\u4E00\u4F4D\u6210\u5458\u59D3\u540D\uFF08\u4E0D\u542B\u8D1F\u8D23\u4EBA\uFF09\uFF0C\u53EF\u968F\u56E2\u961F\u8C03\u6574\u968F\u65F6\u4FEE\u6539", children: _jsx(ListInput, { value: form.members, onChange: (v) => set('members', v), rows: 4, placeholder: '李四\n王五\n赵六' }) })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5 text-[11.5px] text-muted-foreground", children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Users, { className: "h-3.5 w-3.5 text-primary" }), "\u5F53\u524D\u56E2\u961F\u5171", _jsx("span", { className: "mono text-foreground", children: 1 + form.members.filter(Boolean).length }), " \u4EBA"] }), _jsxs("span", { className: "mono", children: ["\u8D1F\u8D23\u4EBA + ", form.members.filter(Boolean).length, " \u540D\u6210\u5458"] })] })] })), step === 3 && (_jsxs("div", { className: "flex flex-col gap-5", style: { animation: 'sti-fade .3s ease both' }, children: [_jsxs("div", { className: "rounded-2xl border border-white/8 bg-white/[0.03] p-5", children: [_jsxs("p", { className: "flex items-center gap-2.5 text-[13px] font-medium", children: [_jsx(ClipboardList, { className: "h-4 w-4 text-primary" }), "\u586B\u62A5\u56DE\u987E"] }), _jsxs("dl", { className: "mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2", children: [_jsx(ReviewRow, { label: "\u9879\u76EE\u540D\u79F0", value: form.title }), _jsx(ReviewRow, { label: "\u9879\u76EE\u7C7B\u522B", value: form.category }), _jsx(ReviewRow, { label: "\u53C2\u8D5B\u7ADE\u8D5B", value: selectedComp?.title ?? '未关联' }), _jsx(ReviewRow, { label: "\u8D1F\u8D23\u4EBA", value: `${form.leaderName}（${form.leaderStudentId}）` }), _jsx(ReviewRow, { label: "\u5B66\u9662", value: form.leaderCollege }), _jsx(ReviewRow, { label: "\u8054\u7CFB\u7535\u8BDD", value: form.leaderPhone }), _jsx(ReviewRow, { label: "\u6307\u5BFC\u6559\u5E08", value: form.advisor || '未填写' }), _jsx(ReviewRow, { label: "\u56E2\u961F\u4EBA\u6570", value: `${form.teamSize} 人` }), _jsx(ReviewRow, { label: "\u56E2\u961F\u6210\u5458", value: form.members.filter(Boolean).join('、') || '未填写' })] }), _jsx("button", { type: "button", onClick: () => { setErrors({}); setStep(1); scrollToForm(); }, className: "mt-4 text-[12px] text-primary transition hover:underline", children: "\u8FD4\u56DE\u4FEE\u6539\u524D\u4E24\u6B65\u4FE1\u606F \u2192" })] }), _jsx(Field, { label: "\u9879\u76EE\u7B80\u4ECB", required: true, error: errors.intro, hint: `不少于 20 字，建议包含研究背景、技术方案与预期成果（${form.intro.trim().length}/1000）`, children: _jsx(Textarea, { rows: 8, value: form.intro, maxLength: 1200, onChange: (e) => set('intro', e.target.value), placeholder: "\u8BF7\u7B80\u8981\u8BF4\u660E\u9879\u76EE\u8981\u89E3\u51B3\u7684\u95EE\u9898\u3001\u62DF\u91C7\u7528\u7684\u6280\u672F\u8DEF\u7EBF\u4E0E\u9884\u671F\u7684\u6210\u679C\u5F62\u5F0F\u2026\u2026" }) }), _jsxs("div", { className: cn('rounded-2xl border px-4 py-4 transition-colors', errors.agree ? 'border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/8' : 'border-white/10 bg-white/[0.03]'), children: [_jsx(Checkbox, { checked: form.agree, onChange: (v) => set('agree', v), label: _jsx("span", { className: "text-[12.5px] leading-relaxed", children: "\u6211\u627F\u8BFA\u6240\u586B\u62A5\u4FE1\u606F\u771F\u5B9E\u6709\u6548\uFF0C\u9879\u76EE\u4E0D\u5B58\u5728\u6284\u88AD\u3001\u4EE3\u505A\u7B49\u60C5\u51B5\uFF0C\u5E76\u540C\u610F\u9879\u76EE\u6210\u679C\u5728\u95E8\u6237\u7F51\u7AD9\u516C\u5F00\u5C55\u793A\u3002" }) }), errors.agree && (_jsx("p", { className: "mt-2 text-xs text-[hsl(var(--destructive))]", children: errors.agree }))] })] }))] }), _jsxs("div", { className: "mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-white/8 pt-6", children: [step > 1 && (_jsxs(Button, { variant: "ghost", onClick: back, disabled: busy, children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "\u4E0A\u4E00\u6B65"] })), step < 3 ? (_jsxs(Button, { variant: "primary", onClick: next, children: ["\u4E0B\u4E00\u6B65", _jsx(ArrowRight, { className: "h-4 w-4" })] })) : (_jsxs(Button, { variant: "primary", size: "lg", onClick: submit, loading: busy, children: [_jsx(Send, { className: "h-4 w-4" }), busy ? '提交中…' : '提交申报'] })), _jsxs("span", { className: "mono text-[11.5px] text-muted-foreground", children: ["\u7B2C ", step, " / 3 \u6B65"] }), _jsxs("span", { className: "flex items-center gap-2 text-[11.5px] text-muted-foreground", children: [_jsx(ShieldCheck, { className: "h-3.5 w-3.5" }), "\u63D0\u4EA4\u540E 5 \u4E2A\u5DE5\u4F5C\u65E5\u5185\u53CD\u9988\u521D\u5BA1\u7ED3\u679C"] })] })] }) }), _jsxs("aside", { className: "flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start", "data-reveal": "right", children: [_jsxs(Glass, { tone: "soft", className: "p-6", children: [_jsxs("h3", { className: "flex items-center gap-2.5 text-[15px] font-semibold", children: [_jsx(ClipboardList, { className: "h-4 w-4 text-primary" }), "\u7533\u62A5\u987B\u77E5"] }), _jsxs("div", { className: "mt-5", children: [_jsx("p", { className: "eyebrow mb-3", children: "\u6750\u6599\u6E05\u5355" }), _jsx("ul", { className: "flex flex-col gap-2.5", children: [
                                                        '项目申报书（PDF，需负责人签字）',
                                                        '团队全部成员学生证扫描件',
                                                        '指导教师意见书（可后续补充）',
                                                        '已有成果证明：专利 / 论文 / 竞赛证书',
                                                    ].map((t) => (_jsxs("li", { className: "flex items-start gap-2.5 text-[12px] leading-relaxed text-foreground/75", children: [_jsx(Check, { className: "mt-[3px] h-3.5 w-3.5 shrink-0 text-primary" }), t] }, t))) }), _jsx("p", { className: "mt-3 text-[11px] leading-relaxed text-muted-foreground", children: "\u6750\u6599\u53EF\u5728\u521D\u5BA1\u901A\u8FC7\u540E\u6309\u901A\u77E5\u8865\u5145\u4E0A\u4F20\uFF0C\u672C\u8F6E\u5728\u7EBF\u7533\u62A5\u53EA\u9700\u586B\u5199\u9879\u76EE\u4E0E\u56E2\u961F\u4FE1\u606F\u3002" })] }), _jsxs("div", { className: "mt-6 border-t border-white/8 pt-5", children: [_jsx("p", { className: "eyebrow mb-3", children: "\u65F6\u95F4\u8282\u70B9" }), _jsx("div", { className: "flex flex-col gap-3", children: [
                                                        { t: '在线申报', d: '全年受理，按季度批次集中评审' },
                                                        { t: '初审反馈', d: '提交后 5 个工作日内' },
                                                        { t: '专家评审', d: '每季度末组织一次答辩评审' },
                                                        { t: '结果公示', d: '评审结束后 3 个工作日内门户公示' },
                                                    ].map((s) => (_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: "mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-[12.5px] font-medium", children: s.t }), _jsx("p", { className: "mt-0.5 text-[11px] leading-relaxed text-muted-foreground", children: s.d })] })] }, s.t))) })] }), _jsxs("div", { className: "mt-6 border-t border-white/8 pt-5", children: [_jsx("p", { className: "eyebrow mb-3", children: "\u8054\u7CFB\u4EBA" }), _jsxs("div", { className: "flex flex-col gap-2.5 text-[12px] text-foreground/80", children: [_jsxs("span", { className: "flex items-center gap-2.5", children: [_jsx(Mail, { className: "h-3.5 w-3.5 shrink-0 text-primary" }), _jsx("span", { className: "mono", children: settings.email || 'sti@university.edu.cn' })] }), _jsxs("span", { className: "flex items-center gap-2.5", children: [_jsx(Phone, { className: "h-3.5 w-3.5 shrink-0 text-primary" }), _jsx("span", { className: "mono", children: settings.phone || '010-8888 6666' })] }), _jsxs("span", { className: "flex items-start gap-2.5", children: [_jsx(MapPin, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" }), settings.address || '大学生活动中心 3 楼 305 室'] })] })] }), _jsxs("div", { className: "mt-6 flex flex-col gap-2.5 border-t border-white/8 pt-5", children: [_jsxs(LinkButton, { to: "/projects", variant: "glass", size: "sm", className: "w-full", children: [_jsx(FileText, { className: "h-3.5 w-3.5" }), "\u67E5\u770B\u9879\u76EE\u5E93\u53C2\u8003"] }), user ? (_jsx(LinkButton, { to: "/account/applications", variant: "ghost", size: "sm", className: "w-full", children: "\u6211\u7684\u9879\u76EE\u8FDB\u5EA6" })) : (_jsx(LinkButton, { to: "/login", variant: "ghost", size: "sm", className: "w-full", children: "\u767B\u5F55\u540E\u53EF\u67E5\u8FDB\u5EA6" }))] })] }), _jsxs(Glass, { tone: "thin", className: "flex items-start gap-3 p-5", children: [_jsx(Building2, { className: "mt-0.5 h-4 w-4 shrink-0 text-accent" }), _jsx("p", { className: "text-[11.5px] leading-relaxed text-muted-foreground", children: "\u7ACB\u9879\u9879\u76EE\u53EF\u7533\u8BF7\u5B9E\u9A8C\u573A\u5730\u3001\u8BBE\u5907\u4E0E\u4E13\u9879\u5B75\u5316\u57FA\u91D1\u652F\u6301\uFF0C\u4F18\u79C0\u9879\u76EE\u5C06\u63A8\u8350\u53C2\u52A0\u7701\u7EA7\u53CA\u4EE5\u4E0A\u7ADE\u8D5B\u3002" })] })] })] })) })] }));
}
/* =============================================================================
 * 步骤指示器
 * ========================================================================== */
function Steps({ step, onJump }) {
    return (_jsx("div", { className: "flex items-center gap-2 sm:gap-4", children: STEPS.map((s, i) => {
            const done = step > s.n;
            const active = step === s.n;
            return (_jsxs(React.Fragment, { children: [_jsxs("button", { type: "button", onClick: () => (done ? onJump(s.n) : undefined), disabled: !done && !active, "aria-current": active ? 'step' : undefined, className: cn('flex items-center gap-3 text-left', done ? 'cursor-pointer' : 'cursor-default'), children: [_jsx("span", { className: cn('mono flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold transition-all duration-300', active
                                    ? 'border-primary/60 bg-primary/15 text-primary shadow-[0_0_20px_-8px_hsl(var(--primary)/.9)]'
                                    : done
                                        ? 'border-[hsl(var(--success))]/45 bg-[hsl(var(--success))]/12 text-[hsl(var(--success))]'
                                        : 'border-white/12 bg-white/[0.04] text-muted-foreground'), children: done ? _jsx(Check, { className: "h-4 w-4", strokeWidth: 3 }) : s.n }), _jsxs("span", { className: "hidden min-w-0 sm:block", children: [_jsxs("span", { className: "mono block text-[10px] tracking-wide text-muted-foreground", children: ["STEP ", s.n] }), _jsx("span", { className: cn('block truncate text-[13px] font-medium', active ? 'text-foreground' : 'text-muted-foreground'), children: s.title })] })] }), i < STEPS.length - 1 && (_jsx("span", { className: cn('h-px min-w-4 flex-1', step > s.n ? 'bg-[hsl(var(--success))]/40' : 'bg-white/12') }))] }, s.n));
        }) }));
}
function ReviewRow({ label, value }) {
    return (_jsxs("div", { className: "flex min-w-0 gap-3", children: [_jsx("dt", { className: "w-[68px] shrink-0 text-[11.5px] text-muted-foreground", children: label }), _jsx("dd", { className: "min-w-0 flex-1 break-words text-[12.5px] text-foreground/90", children: value || '—' })] }));
}
/* =============================================================================
 * 提交成功页
 * ========================================================================== */
function SuccessView({ id, at, form, competitionTitle, loggedIn, onReset, }) {
    const code = `#${String(id).padStart(4, '0')}`;
    /* 成功页为提交后动态挂载，需要单独触发一次揭示扫描 */
    useRevealScan('apply-success');
    return (_jsxs("div", { className: "grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]", "data-reveal": "scale", children: [_jsxs(Glass, { tone: "strong", className: "relative overflow-hidden p-7 sm:p-10", children: [_jsx(GlowOrb, { className: "-right-24 -top-28", size: 460, color: "rgba(186,230,253,.085)" }), _jsx(GlowOrb, { className: "-bottom-32 -left-24", size: 420, color: "rgba(255,255,255,.055)" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "flex h-14 w-14 items-center justify-center rounded-2xl border border-[hsl(var(--success))]/35 bg-[hsl(var(--success))]/12 text-[hsl(var(--success))]", children: _jsx(CheckCircle2, { className: "h-7 w-7" }) }), _jsx("h2", { className: "mt-5 text-balance text-2xl font-semibold leading-snug tracking-tight sm:text-3xl", children: "\u7533\u62A5\u5DF2\u63D0\u4EA4\u6210\u529F" }), _jsxs("p", { className: "mt-4 max-w-2xl text-pretty text-[13.5px] leading-relaxed text-muted-foreground", children: ["\u9879\u76EE\u5B75\u5316\u7EC4\u5C06\u5728 ", _jsx("span", { className: "text-foreground/85", children: "5 \u4E2A\u5DE5\u4F5C\u65E5\u5185" }), " \u5B8C\u6210\u521D\u5BA1\u5E76\u901A\u8FC7\u77ED\u4FE1 / \u90AE\u4EF6\u53CD\u9988\u7ED3\u679C\u3002 \u8BF7\u8BB0\u5F55\u4E0B\u65B9\u7533\u62A5\u7F16\u53F7\uFF0C\u540E\u7EED\u67E5\u8BE2\u4E0E\u6C9F\u901A\u65F6\u8BF7\u63D0\u4F9B\u8BE5\u7F16\u53F7\u3002"] }), _jsxs("div", { className: "mt-6 flex flex-wrap items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[11px] tracking-wide text-muted-foreground", children: "\u7533\u62A5\u7F16\u53F7" }), _jsx("p", { className: "mono mt-1.5 text-2xl font-semibold tabular-nums text-primary", children: code })] }), _jsx("div", { className: "h-10 w-px bg-white/10" }), _jsxs("div", { children: [_jsx("p", { className: "text-[11px] tracking-wide text-muted-foreground", children: "\u63D0\u4EA4\u65F6\u95F4" }), _jsx("p", { className: "mono mt-1.5 text-[14px]", children: fdate(at) })] }), _jsx("div", { className: "h-10 w-px bg-white/10" }), _jsxs("div", { children: [_jsx("p", { className: "text-[11px] tracking-wide text-muted-foreground", children: "\u5F53\u524D\u72B6\u6001" }), _jsx("div", { className: "mt-1.5", children: _jsx(Chip, { tone: "warning", children: "\u5F85\u5BA1\u6838" }) })] })] }), _jsxs("div", { className: "mt-7 rounded-2xl border border-white/8 bg-white/[0.025] p-5", children: [_jsxs("p", { className: "flex items-center gap-2.5 text-[13px] font-medium", children: [_jsx(ClipboardList, { className: "h-4 w-4 text-primary" }), "\u7533\u62A5\u6458\u8981"] }), _jsxs("dl", { className: "mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2", children: [_jsx(ReviewRow, { label: "\u9879\u76EE\u540D\u79F0", value: form.title }), _jsx(ReviewRow, { label: "\u9879\u76EE\u7C7B\u522B", value: form.category }), _jsx(ReviewRow, { label: "\u53C2\u8D5B\u7ADE\u8D5B", value: competitionTitle ?? '未关联' }), _jsx(ReviewRow, { label: "\u8D1F\u8D23\u4EBA", value: `${form.leaderName}（${form.leaderStudentId}）` }), _jsx(ReviewRow, { label: "\u5B66\u9662", value: form.leaderCollege }), _jsx(ReviewRow, { label: "\u8054\u7CFB\u7535\u8BDD", value: form.leaderPhone }), _jsx(ReviewRow, { label: "\u6307\u5BFC\u6559\u5E08", value: form.advisor || '未填写' }), _jsx(ReviewRow, { label: "\u56E2\u961F\u4EBA\u6570", value: `${form.teamSize} 人` })] })] }), _jsxs("div", { className: "mt-7", children: [_jsx("p", { className: "eyebrow mb-4", children: "\u540E\u7EED\u6D41\u7A0B" }), _jsx("div", { className: "flex flex-col", children: [
                                            { t: '形式审查', d: '核对填报信息完整性与资格，1 个工作日内完成' },
                                            { t: '专家初审', d: '技术与可行性评审，5 个工作日内反馈受理结果' },
                                            { t: '答辩评审', d: '通过初审的项目参加季度答辩，确定立项等级' },
                                            { t: '立项公示', d: '结果在门户公示 3 个工作日，无异议后正式立项' },
                                            { t: '孵化支持', d: '匹配指导教师与实验资源，纳入项目孵化计划' },
                                        ].map((s, i, arr) => (_jsxs("div", { className: "relative flex gap-4", children: [_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("span", { className: "mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/12 text-[11px] font-semibold text-primary", children: i + 1 }), i < arr.length - 1 && _jsx("span", { className: "my-1 w-px flex-1 bg-gradient-to-b from-primary/40 to-transparent" })] }), _jsxs("div", { className: cn('min-w-0 flex-1', i < arr.length - 1 ? 'pb-5' : ''), children: [_jsx("p", { className: "text-[13px] font-medium", children: s.t }), _jsx("p", { className: "mt-1 text-[11.5px] leading-relaxed text-muted-foreground", children: s.d })] })] }, s.t))) })] }), _jsxs("div", { className: "mt-8 flex flex-wrap items-center gap-3 border-t border-white/8 pt-6", children: [loggedIn ? (_jsxs(LinkButton, { to: "/account/applications", variant: "primary", size: "lg", children: [_jsx(ArrowRight, { className: "h-4 w-4" }), "\u67E5\u770B\u7533\u62A5\u8FDB\u5EA6"] })) : (_jsxs(LinkButton, { to: "/login", variant: "primary", size: "lg", children: [_jsx(ArrowRight, { className: "h-4 w-4" }), "\u767B\u5F55\u540E\u67E5\u770B\u8FDB\u5EA6"] })), _jsxs(Button, { variant: "glass", onClick: onReset, children: [_jsx(RotateCcw, { className: "h-4 w-4" }), "\u518D\u7533\u62A5\u4E00\u9879"] }), _jsx(LinkButton, { to: "/projects", variant: "ghost", children: "\u8FD4\u56DE\u9879\u76EE\u5E93" })] }), !loggedIn && (_jsxs("p", { className: "mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-muted-foreground", children: [_jsx(Info, { className: "mt-0.5 h-3.5 w-3.5 shrink-0" }), "\u672C\u6B21\u4E3A\u533F\u540D\u63D0\u4EA4\uFF0C\u7533\u62A5\u8BB0\u5F55\u672A\u7ED1\u5B9A\u8D26\u53F7\u3002\u5EFA\u8BAE\u4F7F\u7528\u540C\u4E00\u5B66\u53F7\u6CE8\u518C\u5E76\u767B\u5F55\u540E\uFF0C\u5373\u53EF\u5728\u300C\u7528\u6237\u4E2D\u5FC3 \u2192 \u6211\u7684\u9879\u76EE\u300D\u67E5\u770B\u8FDB\u5EA6\u4E0E\u8BC4\u5BA1\u610F\u89C1\u3002"] }))] })] }), _jsxs("aside", { className: "flex flex-col gap-6", children: [_jsxs(Glass, { tone: "soft", className: "p-6", children: [_jsxs("h3", { className: "flex items-center gap-2.5 text-[15px] font-semibold", children: [_jsx(ShieldCheck, { className: "h-4 w-4 text-primary" }), "\u63D0\u4EA4\u540E\u8BF7\u6CE8\u610F"] }), _jsx("ul", { className: "mt-4 flex flex-col gap-3", children: [
                                    '保持手机号与邮箱畅通，初审结果将通过短信与邮件通知。',
                                    '如需修改信息，可在初审前联系项目孵化组并提供申报编号。',
                                    '申报书、学生证等材料在初审通过后按通知补充上传。',
                                    '同一项目请勿重复提交，重复申报将影响评审优先级。',
                                ].map((t) => (_jsxs("li", { className: "flex items-start gap-3 text-[12.5px] leading-relaxed text-foreground/75", children: [_jsx("span", { className: "mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" }), t] }, t))) })] }), _jsxs(Glass, { tone: "thin", className: "flex items-start gap-3 p-5", children: [_jsx(Sparkles, { className: "mt-0.5 h-4 w-4 shrink-0 text-accent" }), _jsx("p", { className: "text-[11.5px] leading-relaxed text-muted-foreground", children: "\u9879\u76EE\u7ACB\u9879\u540E\u53EF\u7533\u8BF7\u5B9E\u9A8C\u573A\u5730\u3001\u8BBE\u5907\u4E0E\u4E13\u9879\u5B75\u5316\u57FA\u91D1\uFF0C\u4F18\u79C0\u9879\u76EE\u5C06\u7531\u90E8\u95E8\u63A8\u8350\u53C2\u52A0\u7701\u7EA7\u53CA\u4EE5\u4E0A\u7ADE\u8D5B\u3002" })] })] })] }));
}

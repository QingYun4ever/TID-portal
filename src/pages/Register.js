import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AlertCircle, BadgeCheck, CheckCircle2, Eye, EyeOff, GraduationCap, Info, ShieldCheck, UserPlus, } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { useRevealScope } from '@/components/RevealScope';
import { LogoLockup } from '@/components/Brand';
import { GlowOrb, GridTexture } from '@/components/LiquidBackdrop';
import { Button, Chip, Field, Glass, Input, LinkButton } from '@/components/ui';
const EMPTY = {
    username: '',
    name: '',
    password: '',
    confirm: '',
    studentId: '',
    college: '',
    email: '',
    phone: '',
};
function validate(f) {
    const e = {};
    const username = f.username.trim();
    if (!username)
        e.username = '请填写账号';
    else if (username.length < 3)
        e.username = '账号至少 3 个字符';
    else if (!/^[A-Za-z0-9_.-]{3,24}$/.test(username))
        e.username = '账号仅支持 3-24 位字母、数字、下划线、点或短横线';
    if (!f.name.trim())
        e.name = '请填写姓名';
    else if (f.name.trim().length < 2)
        e.name = '姓名至少 2 个字符';
    if (!f.password)
        e.password = '请填写密码';
    else if (f.password.length < 6)
        e.password = '密码至少 6 位';
    if (!f.confirm)
        e.confirm = '请再次输入密码';
    else if (f.confirm !== f.password)
        e.confirm = '两次输入的密码不一致';
    if (!f.studentId.trim())
        e.studentId = '请填写学号';
    else if (!/^[0-9A-Za-z]{6,20}$/.test(f.studentId.trim()))
        e.studentId = '学号应为 6-20 位数字或字母';
    if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(f.email.trim()))
        e.email = '邮箱格式不正确';
    if (f.phone.trim() && !/^1[3-9]\d{9}$/.test(f.phone.trim()))
        e.phone = '请输入 11 位有效手机号';
    return e;
}
export default function Register() {
    useTitle('注册');
    const { register } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const revealRef = useRevealScope();
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
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
    const onSubmit = async (e) => {
        e.preventDefault();
        const errs = validate(form);
        setErrors(errs);
        setFormError(null);
        if (Object.keys(errs).length) {
            toast.error('注册信息有误', `还有 ${Object.keys(errs).length} 项需要修正`);
            return;
        }
        setLoading(true);
        try {
            const u = await register({
                username: form.username.trim(),
                name: form.name.trim(),
                password: form.password,
                studentId: form.studentId.trim(),
                college: form.college.trim() || null,
                email: form.email.trim() || null,
                phone: form.phone.trim() || null,
            });
            toast.success('注册成功', `欢迎加入，${u.name}。已为你自动登录`);
            navigate('/account', { replace: true });
        }
        catch (err) {
            const msg = err instanceof ApiError ? err.message : err?.message || '注册失败，请稍后重试';
            setFormError(msg);
            toast.error('注册失败', msg);
            setLoading(false);
        }
    };
    const passwordScore = scorePassword(form.password);
    return (_jsxs("div", { ref: revealRef, children: [_jsx("section", { className: "relative flex min-h-dvh items-center px-5 pb-20 pt-28 sm:pt-32", children: _jsxs("div", { className: "shell", children: [_jsxs(Glass, { tone: "strong", className: "relative overflow-hidden p-6 sm:p-10 lg:p-14", "data-reveal": "scale", children: [_jsx(GlowOrb, { className: "-left-28 -top-24", size: 520, color: "rgba(186,230,253,.085)" }), _jsx(GlowOrb, { className: "-bottom-32 -right-24", size: 460, color: "rgba(255,255,255,.055)" }), _jsx(GridTexture, { className: "opacity-40", size: 52 }), _jsxs("div", { className: "relative grid gap-12 lg:grid-cols-[1fr_minmax(0,470px)] lg:items-center lg:gap-16", children: [_jsxs("div", { className: "flex flex-col items-center text-center lg:items-start lg:text-left", children: [_jsx(LogoLockup, { uid: "register-brand", stacked: true, size: 46 }), _jsx("h1", { className: "mt-9 text-2xl font-semibold tracking-tight sm:text-3xl", children: _jsx("span", { className: "spotlight-text", children: "\u521B\u5EFA\u5B66\u751F\u8D26\u53F7" }) }), _jsx("p", { className: "mt-5 max-w-md text-[14.5px] leading-[1.9] text-muted-foreground", children: "\u8D26\u53F7\u7528\u4E8E\u5728\u7EBF\u62A5\u540D\u6D3B\u52A8\u3001\u7533\u62A5\u9879\u76EE\u3001\u63D0\u4EA4\u62DB\u65B0\u62A5\u540D\u4E0E\u67E5\u770B\u5BA1\u6838\u8FDB\u5EA6\u3002\u4FE1\u606F\u4EC5\u7528\u4E8E\u90E8\u95E8\u5185\u90E8\u4E8B\u52A1\u5904\u7406\u3002" }), _jsx("ul", { className: "mt-8 flex w-full flex-col gap-3.5 text-left", children: [
                                                        { icon: BadgeCheck, t: '一个账号打通全部业务', d: '活动报名 · 项目申报 · 招新报名 · 留言反馈' },
                                                        { icon: ShieldCheck, t: '信息仅部门内部可见', d: '联系方式不会公开，匿名留言时完全隐藏身份' },
                                                        { icon: GraduationCap, t: '学生身份可升级', d: '加入部门后由管理员调整为成员或管理员权限' },
                                                    ].map((it) => (_jsxs("li", { className: "flex items-start gap-3.5", children: [_jsx("span", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] text-primary", children: _jsx(it.icon, { className: "h-4 w-4" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-[13.5px] font-medium", children: it.t }), _jsx("p", { className: "mt-1 text-[12px] leading-relaxed text-muted-foreground", children: it.d })] })] }, it.t))) }), _jsxs("div", { className: "mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start", children: [_jsx(LinkButton, { to: "/login", size: "sm", variant: "glass", children: "\u5DF2\u6709\u8D26\u53F7\uFF0C\u53BB\u767B\u5F55" }), _jsx(LinkButton, { to: "/join", size: "sm", variant: "ghost", children: "\u6D4F\u89C8\u62DB\u65B0\u5C97\u4F4D" })] })] }), _jsxs(Glass, { tone: "soft", className: "p-6 sm:p-8", children: [_jsxs("div", { className: "mb-6", children: [_jsx("div", { className: "eyebrow mb-4", children: "Sign Up" }), _jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "\u6CE8\u518C\u65B0\u8D26\u53F7" }), _jsxs("div", { className: "mt-4 flex items-start gap-2.5 rounded-2xl border border-primary/28 bg-primary/8 px-4 py-3", children: [_jsx(Info, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" }), _jsx("p", { className: "text-[11.5px] leading-relaxed text-foreground/75", children: "\u6CE8\u518C\u8D26\u53F7\u4E3A\u5B66\u751F\u8EAB\u4EFD\uFF0C\u52A0\u5165\u90E8\u95E8\u540E\u7531\u7BA1\u7406\u5458\u8C03\u6574\u6743\u9650\u3002" })] })] }), formError && (_jsxs("div", { className: "mb-5 flex items-start gap-3 rounded-2xl border border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/10 px-4 py-3.5", style: { animation: 'sti-pop .3s cubic-bezier(.22,1,.36,1) both' }, role: "alert", children: [_jsx(AlertCircle, { className: "mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--destructive))]" }), _jsxs("div", { className: "min-w-0 text-[12.5px] leading-relaxed", children: [_jsx("p", { className: "font-medium text-[hsl(var(--destructive))]", children: "\u6CE8\u518C\u5931\u8D25" }), _jsx("p", { className: "mt-1 text-foreground/75", children: formError }), /已被注册/.test(formError) && (_jsxs("p", { className: "mt-2 text-foreground/70", children: ["\u5982\u679C\u8FD9\u662F\u4F60\u81EA\u5DF1\u7684\u8D26\u53F7\uFF0C\u8BF7\u76F4\u63A5", _jsx(Link, { to: "/login", className: "mx-1 text-primary hover:underline", children: "\u767B\u5F55" }), "\uFF1B\u5982\u679C\u5FD8\u8BB0\u5BC6\u7801\uFF0C\u53EF\u5728\u300C\u4E92\u52A8\u4E0E\u53CD\u9988\u300D\u7559\u8A00\u8054\u7CFB\u7BA1\u7406\u5458\u91CD\u7F6E\u3002"] }))] })] })), _jsxs("form", { onSubmit: onSubmit, noValidate: true, className: "flex flex-col gap-5", children: [_jsxs("div", { className: "grid gap-5 sm:grid-cols-2", children: [_jsx(Field, { label: "\u8D26\u53F7", required: true, error: errors.username, children: _jsx(Input, { value: form.username, onChange: (e) => set('username')(e.target.value), placeholder: "3-24 \u4F4D\u5B57\u6BCD\u6216\u6570\u5B57", autoComplete: "username", autoFocus: true, disabled: loading, "data-invalid": errors.username ? 'true' : undefined }) }), _jsx(Field, { label: "\u59D3\u540D", required: true, error: errors.name, children: _jsx(Input, { value: form.name, onChange: (e) => set('name')(e.target.value), placeholder: "\u8BF7\u8F93\u5165\u771F\u5B9E\u59D3\u540D", autoComplete: "name", disabled: loading, "data-invalid": errors.name ? 'true' : undefined }) })] }), _jsx(Field, { label: "\u5BC6\u7801", required: true, error: errors.password, hint: !errors.password ? '至少 6 位，建议同时包含字母与数字' : undefined, children: _jsxs("div", { className: "relative", children: [_jsx(Input, { type: showPassword ? 'text' : 'password', value: form.password, onChange: (e) => set('password')(e.target.value), placeholder: "\u8BBE\u7F6E\u767B\u5F55\u5BC6\u7801", autoComplete: "new-password", className: "pr-12", disabled: loading, "data-invalid": errors.password ? 'true' : undefined }), _jsx("button", { type: "button", onClick: () => setShowPassword((v) => !v), "aria-label": showPassword ? '隐藏密码' : '显示密码', className: "absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground", children: showPassword ? _jsx(EyeOff, { className: "h-4 w-4" }) : _jsx(Eye, { className: "h-4 w-4" }) })] }) }), form.password && (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex flex-1 gap-1.5", children: [0, 1, 2, 3].map((i) => (_jsx("span", { className: 'h-1 flex-1 rounded-full transition-colors duration-300 ' +
                                                                            (i < passwordScore.level
                                                                                ? passwordScore.level <= 1
                                                                                    ? 'bg-[hsl(var(--destructive))]'
                                                                                    : passwordScore.level === 2
                                                                                        ? 'bg-[hsl(var(--warning))]'
                                                                                        : 'bg-[hsl(var(--success))]'
                                                                                : 'bg-white/10') }, i))) }), _jsx("span", { className: "w-12 shrink-0 text-right text-[11px] text-muted-foreground", children: passwordScore.label })] })), _jsx(Field, { label: "\u786E\u8BA4\u5BC6\u7801", required: true, error: errors.confirm, children: _jsx(Input, { type: showPassword ? 'text' : 'password', value: form.confirm, onChange: (e) => set('confirm')(e.target.value), placeholder: "\u8BF7\u518D\u6B21\u8F93\u5165\u5BC6\u7801", autoComplete: "new-password", disabled: loading, "data-invalid": errors.confirm ? 'true' : undefined }) }), _jsxs("div", { className: "grid gap-5 sm:grid-cols-2", children: [_jsx(Field, { label: "\u5B66\u53F7", required: true, error: errors.studentId, children: _jsx(Input, { value: form.studentId, onChange: (e) => set('studentId')(e.target.value), placeholder: "\u5982 2024100123", inputMode: "numeric", disabled: loading, "data-invalid": errors.studentId ? 'true' : undefined }) }), _jsx(Field, { label: "\u5B66\u9662", hint: !errors.college ? '选填，之后可在用户中心补充' : undefined, children: _jsx(Input, { value: form.college, onChange: (e) => set('college')(e.target.value), placeholder: "\u5982 \u8BA1\u7B97\u673A\u79D1\u5B66\u4E0E\u6280\u672F\u5B66\u9662", disabled: loading }) }), _jsx(Field, { label: "\u90AE\u7BB1", error: errors.email, hint: !errors.email ? '选填，用于接收通知' : undefined, children: _jsx(Input, { type: "email", value: form.email, onChange: (e) => set('email')(e.target.value), placeholder: "name@university.edu.cn", autoComplete: "email", disabled: loading, "data-invalid": errors.email ? 'true' : undefined }) }), _jsx(Field, { label: "\u624B\u673A\u53F7", error: errors.phone, hint: !errors.phone ? '选填，活动紧急通知使用' : undefined, children: _jsx(Input, { value: form.phone, onChange: (e) => set('phone')(e.target.value), placeholder: "11 \u4F4D\u624B\u673A\u53F7", inputMode: "tel", autoComplete: "tel", disabled: loading, "data-invalid": errors.phone ? 'true' : undefined }) })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 border-t border-white/8 pt-6", children: [_jsxs(Button, { type: "submit", variant: "primary", size: "lg", loading: loading, children: [loading ? '注册中…' : '注册并登录', !loading && _jsx(UserPlus, { className: "h-4 w-4" })] }), _jsx(Button, { type: "button", variant: "ghost", disabled: loading, onClick: () => {
                                                                        setForm(EMPTY);
                                                                        setErrors({});
                                                                        setFormError(null);
                                                                    }, children: "\u91CD\u7F6E" })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2.5", children: [_jsxs(Chip, { tone: "success", children: [_jsx(CheckCircle2, { className: "h-3 w-3" }), "\u6CE8\u518C\u540E\u81EA\u52A8\u767B\u5F55"] }), _jsx(Chip, { children: "\u6CE8\u518C\u6210\u529F\u5373\u8DF3\u8F6C\u7528\u6237\u4E2D\u5FC3" })] }), _jsxs("p", { className: "text-center text-[12.5px] text-muted-foreground", children: ["\u5DF2\u6709\u8D26\u53F7\uFF1F", _jsx(Link, { to: "/login", className: "ml-1.5 text-primary transition hover:underline", children: "\u53BB\u767B\u5F55" })] })] })] })] })] }), _jsx("p", { className: "mt-8 text-center text-[11.5px] leading-relaxed text-muted-foreground", children: "\u6CE8\u518C\u5373\u8868\u793A\u4F60\u540C\u610F\u90E8\u95E8\u5C06\u6240\u586B\u4FE1\u606F\u7528\u4E8E\u6D3B\u52A8\u62A5\u540D\u3001\u9879\u76EE\u7533\u62A5\u4E0E\u62DB\u65B0\u7BA1\u7406\u7B49\u5185\u90E8\u4E8B\u52A1\u3002" })] }) }), _jsx("div", { className: "pb-16" })] }));
}
/* =============================================================================
 * 密码强度（0-4）
 * ========================================================================== */
function scorePassword(pwd) {
    if (!pwd)
        return { level: 0, label: '' };
    let score = 0;
    if (pwd.length >= 6)
        score++;
    if (pwd.length >= 10)
        score++;
    if (/[A-Za-z]/.test(pwd) && /\d/.test(pwd))
        score++;
    if (/[^A-Za-z0-9]/.test(pwd))
        score++;
    const level = Math.min(4, Math.max(1, score));
    const labels = ['', '偏弱', '一般', '较强', '很强'];
    return { level, label: labels[level] };
}

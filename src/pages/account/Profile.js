import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { AtSign, Building2, GraduationCap, Hash, Image as ImageIcon, KeyRound, Phone, Save, ShieldCheck, User } from 'lucide-react';
import { AuthApi } from '@/lib/api';
import { useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { ROLES, cn } from '@/lib/utils';
import { Avatar, Button, Chip, Field, Glass, Input } from '@/components/ui';
/* =============================================================================
 * 用户中心 · 个人资料
 * 手写受控表单（不引入表单库），提交后刷新全局 auth 状态。
 * ========================================================================== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^1[3-9]\d{9}$/;
export default function Profile() {
    const { user, refresh } = useAuth();
    const toast = useToast();
    useTitle('个人资料');
    /* ------------------------------ 个人资料 ------------------------------ */
    const initial = useMemo(() => ({
        name: user?.name ?? '',
        studentId: user?.studentId ?? '',
        college: user?.college ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        avatar: user?.avatar ?? '',
    }), [user]);
    const [form, setForm] = useState(initial);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    /* 用户信息刷新后（例如首次进入）同步表单 */
    useEffect(() => setForm(initial), [initial]);
    const set = (k) => (v) => {
        setForm((f) => ({ ...f, [k]: v }));
        setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
    };
    const dirty = Object.keys(initial).some((k) => initial[k] !== form[k]);
    const validateProfile = () => {
        const e = {};
        if (!form.name.trim())
            e.name = '请填写姓名';
        else if (form.name.trim().length > 24)
            e.name = '姓名不超过 24 个字符';
        if (form.studentId && !/^[A-Za-z0-9]{4,20}$/.test(form.studentId.trim()))
            e.studentId = '学号应为 4–20 位字母或数字';
        if (form.email && !EMAIL_RE.test(form.email.trim()))
            e.email = '邮箱格式不正确';
        if (form.phone && !PHONE_RE.test(form.phone.trim()))
            e.phone = '请填写 11 位大陆手机号';
        if (form.avatar && !/^(https?:\/\/|\/)/.test(form.avatar.trim()))
            e.avatar = '头像地址需以 http(s):// 或 / 开头';
        setErrors(e);
        return Object.keys(e).length === 0;
    };
    const saveProfile = async (ev) => {
        ev.preventDefault();
        if (!validateProfile()) {
            toast.error('请检查表单', '有字段填写不符合要求。');
            return;
        }
        setSaving(true);
        try {
            await AuthApi.updateMe({
                name: form.name.trim(),
                studentId: form.studentId.trim() || null,
                college: form.college.trim() || null,
                email: form.email.trim() || null,
                phone: form.phone.trim() || null,
                avatar: form.avatar.trim() || null,
            });
            await refresh();
            toast.success('资料已保存', '活动报名与项目申报将使用最新的联系方式。');
        }
        catch (e) {
            toast.error('保存失败', e?.message);
        }
        finally {
            setSaving(false);
        }
    };
    /* ------------------------------ 修改密码 ------------------------------ */
    const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirm: '' });
    const [pwdErrors, setPwdErrors] = useState({});
    const [changing, setChanging] = useState(false);
    const setPwdField = (k) => (v) => {
        setPwd((p) => ({ ...p, [k]: v }));
        setPwdErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
    };
    const validatePwd = () => {
        const e = {};
        if (!pwd.oldPassword)
            e.oldPassword = '请输入原密码';
        if (!pwd.newPassword)
            e.newPassword = '请输入新密码';
        else if (pwd.newPassword.length < 6)
            e.newPassword = '新密码至少 6 位';
        else if (pwd.newPassword === pwd.oldPassword)
            e.newPassword = '新密码不能与原密码相同';
        if (!pwd.confirm)
            e.confirm = '请再次输入新密码';
        else if (pwd.confirm !== pwd.newPassword)
            e.confirm = '两次输入的新密码不一致';
        setPwdErrors(e);
        return Object.keys(e).length === 0;
    };
    const changePassword = async (ev) => {
        ev.preventDefault();
        if (!validatePwd())
            return;
        setChanging(true);
        try {
            await AuthApi.changePassword(pwd.oldPassword, pwd.newPassword);
            toast.success('密码已更新', '下次登录请使用新密码。');
            setPwd({ oldPassword: '', newPassword: '', confirm: '' });
        }
        catch (e) {
            toast.error('修改失败', e?.message);
        }
        finally {
            setChanging(false);
        }
    };
    const roleLabel = ROLES[user?.role ?? ''] ?? user?.role ?? '—';
    const completeness = [user?.name, user?.studentId, user?.college, user?.email, user?.phone, user?.avatar].filter(Boolean).length;
    const percent = Math.round((completeness / 6) * 100);
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "\u4E2A\u4EBA\u8D44\u6599" }), _jsx("p", { className: "mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground", children: "\u5B66\u53F7\u4E0E\u624B\u673A\u53F7\u7528\u4E8E\u628A\u6D3B\u52A8\u62A5\u540D\u3001\u9879\u76EE\u7533\u62A5\u8BB0\u5F55\u4E0E\u5F53\u524D\u8D26\u53F7\u5173\u8054\uFF0C\u8BF7\u52A1\u5FC5\u586B\u5199\u51C6\u786E\u3002" })] }), _jsxs("div", { className: "grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]", children: [_jsxs(Glass, { tone: "soft", className: "p-5 sm:p-6", "data-reveal": true, children: [_jsxs("div", { className: "flex flex-col gap-5 sm:flex-row sm:items-center", children: [_jsx(Avatar, { name: form.name || user?.name || '', src: form.avatar || user?.avatar, size: 76 }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-[16px] font-semibold", children: form.name || user?.username }), _jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-2", children: [_jsx(Chip, { tone: "primary", className: "!px-2.5 !py-0.5", children: roleLabel }), _jsxs(Chip, { className: "mono !px-2.5 !py-0.5", children: [_jsx(Hash, { className: "h-3 w-3" }), form.studentId || '未绑定学号'] })] }), _jsxs("div", { className: "mt-3", children: [_jsxs("div", { className: "flex items-center justify-between text-[11px] text-muted-foreground", children: [_jsx("span", { children: "\u8D44\u6599\u5B8C\u6574\u5EA6" }), _jsxs("span", { className: "mono", children: [percent, "%"] })] }), _jsx("div", { className: "mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/8", children: _jsx("div", { className: "h-full rounded-full bg-gradient-to-r from-primary to-cyan-300 transition-all duration-700", style: { width: `${percent}%` } }) })] })] })] }), _jsxs("form", { onSubmit: saveProfile, className: "mt-6 flex flex-col gap-4 border-t border-white/8 pt-6", children: [_jsx(Field, { label: "\u59D3\u540D", required: true, error: errors.name, children: _jsx(Input, { value: form.name, onChange: (e) => set('name')(e.target.value), placeholder: "\u8BF7\u8F93\u5165\u771F\u5B9E\u59D3\u540D", maxLength: 24 }) }), _jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2", children: [_jsx(Field, { label: "\u5B66\u53F7", error: errors.studentId, hint: "\u7528\u4E8E\u5173\u8054\u62A5\u540D\u4E0E\u7533\u62A5\u8BB0\u5F55", children: _jsx(Input, { value: form.studentId, onChange: (e) => set('studentId')(e.target.value), placeholder: "\u5982 2023010101", className: "mono", inputMode: "numeric" }) }), _jsx(Field, { label: "\u5B66\u9662", hint: "\u5982 \u8BA1\u7B97\u673A\u79D1\u5B66\u4E0E\u6280\u672F\u5B66\u9662", children: _jsx(Input, { value: form.college, onChange: (e) => set('college')(e.target.value), placeholder: "\u8BF7\u8F93\u5165\u6240\u5728\u5B66\u9662" }) })] }), _jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2", children: [_jsx(Field, { label: "\u90AE\u7BB1", error: errors.email, children: _jsx(Input, { type: "email", value: form.email, onChange: (e) => set('email')(e.target.value), placeholder: "name@stu.edu.cn", autoComplete: "email" }) }), _jsx(Field, { label: "\u624B\u673A", error: errors.phone, children: _jsx(Input, { type: "tel", value: form.phone, onChange: (e) => set('phone')(e.target.value), placeholder: "11 \u4F4D\u624B\u673A\u53F7", className: "mono", maxLength: 11, autoComplete: "tel" }) })] }), _jsx(Field, { label: "\u5934\u50CF URL", error: errors.avatar, hint: "\u7559\u7A7A\u5219\u4F7F\u7528\u59D3\u540D\u9996\u5B57\u751F\u6210\u7684\u5934\u50CF", children: _jsx(Input, { value: form.avatar, onChange: (e) => set('avatar')(e.target.value), placeholder: "/uploads/avatar.png \u6216 https://\u2026" }) }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 pt-1", children: [_jsxs(Button, { type: "submit", variant: "primary", loading: saving, disabled: !dirty && !saving, children: [_jsx(Save, { className: "h-4 w-4" }), dirty ? '保存资料' : '已是最新'] }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => {
                                                    setForm(initial);
                                                    setErrors({});
                                                }, disabled: !dirty || saving, children: "\u91CD\u7F6E" }), _jsxs("span", { className: "text-[11.5px] text-muted-foreground", children: [_jsxs("span", { className: "mono", children: ["@", user?.username] }), " \u00B7 \u8D26\u53F7\u540D\u4E0D\u53EF\u4FEE\u6539"] })] })] })] }), _jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs(Glass, { tone: "soft", className: "p-5 sm:p-6", "data-reveal": "right", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] text-primary", children: _jsx(KeyRound, { className: "h-4.5 w-4.5" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-[15px] font-semibold", children: "\u4FEE\u6539\u5BC6\u7801" }), _jsx("p", { className: "mt-0.5 text-[11.5px] text-muted-foreground", children: "\u65B0\u5BC6\u7801\u81F3\u5C11 6 \u4F4D" })] })] }), _jsxs("form", { onSubmit: changePassword, className: "mt-5 flex flex-col gap-4", children: [_jsx(Field, { label: "\u539F\u5BC6\u7801", required: true, error: pwdErrors.oldPassword, children: _jsx(Input, { type: "password", value: pwd.oldPassword, onChange: (e) => setPwdField('oldPassword')(e.target.value), placeholder: "\u8BF7\u8F93\u5165\u5F53\u524D\u5BC6\u7801", autoComplete: "current-password" }) }), _jsx(Field, { label: "\u65B0\u5BC6\u7801", required: true, error: pwdErrors.newPassword, children: _jsx(Input, { type: "password", value: pwd.newPassword, onChange: (e) => setPwdField('newPassword')(e.target.value), placeholder: "\u81F3\u5C11 6 \u4F4D", autoComplete: "new-password" }) }), _jsx(Field, { label: "\u786E\u8BA4\u65B0\u5BC6\u7801", required: true, error: pwdErrors.confirm, children: _jsx(Input, { type: "password", value: pwd.confirm, onChange: (e) => setPwdField('confirm')(e.target.value), placeholder: "\u518D\u6B21\u8F93\u5165\u65B0\u5BC6\u7801", autoComplete: "new-password" }) }), _jsxs(Button, { type: "submit", variant: "glass", loading: changing, className: "w-full", children: [_jsx(ShieldCheck, { className: "h-4 w-4" }), "\u66F4\u65B0\u5BC6\u7801"] })] })] }), _jsxs(Glass, { tone: "soft", className: "p-5 sm:p-6", "data-reveal": "right", children: [_jsxs("h2", { className: "flex items-center gap-2 text-[15px] font-semibold", children: [_jsx(User, { className: "h-4 w-4 text-primary" }), "\u8D26\u53F7\u6458\u8981"] }), _jsxs("dl", { className: "mt-4 flex flex-col gap-3 text-[12.5px]", children: [_jsx(Row, { icon: _jsx(AtSign, { className: "h-3.5 w-3.5" }), label: "\u767B\u5F55\u8D26\u53F7", value: user?.username ?? '—', mono: true }), _jsx(Row, { icon: _jsx(User, { className: "h-3.5 w-3.5" }), label: "\u89D2\u8272", value: roleLabel }), _jsx(Row, { icon: _jsx(Hash, { className: "h-3.5 w-3.5" }), label: "\u5B66\u53F7", value: form.studentId || '—', mono: true }), _jsx(Row, { icon: _jsx(Building2, { className: "h-3.5 w-3.5" }), label: "\u5B66\u9662", value: form.college || '—' }), _jsx(Row, { icon: _jsx(GraduationCap, { className: "h-3.5 w-3.5" }), label: "\u90AE\u7BB1", value: form.email || '—' }), _jsx(Row, { icon: _jsx(Phone, { className: "h-3.5 w-3.5" }), label: "\u624B\u673A", value: form.phone || '—', mono: true }), _jsx(Row, { icon: _jsx(ImageIcon, { className: "h-3.5 w-3.5" }), label: "\u5934\u50CF", value: form.avatar ? '已设置' : '未设置' })] })] })] })] })] }));
}
function Row({ icon, label, value, mono }) {
    return (_jsxs("div", { className: "flex items-center justify-between gap-4 border-b border-white/6 pb-2.5 last:border-0 last:pb-0", children: [_jsxs("dt", { className: "flex items-center gap-2 text-muted-foreground", children: [icon, label] }), _jsx("dd", { className: cn('clamp-1 text-right text-foreground/85', mono && 'mono'), children: value })] }));
}

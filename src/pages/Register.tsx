import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Info,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';

import { ApiError } from '@/lib/api';
import { useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { useRevealScope } from '@/components/RevealScope';
import { LogoLockup } from '@/components/Brand';
import { GlowOrb, GridTexture } from '@/components/LiquidBackdrop';
import { Button, Chip, Field, Glass, Input, LinkButton } from '@/components/ui';

/* =============================================================================
 * 注册表单
 * ========================================================================== */
interface RegisterForm {
  username: string;
  name: string;
  password: string;
  confirm: string;
  studentId: string;
  college: string;
  email: string;
  phone: string;
}

const EMPTY: RegisterForm = {
  username: '',
  name: '',
  password: '',
  confirm: '',
  studentId: '',
  college: '',
  email: '',
  phone: '',
};

function validate(f: RegisterForm): Record<string, string> {
  const e: Record<string, string> = {};
  const username = f.username.trim();
  if (!username) e.username = '请填写账号';
  else if (username.length < 3) e.username = '账号至少 3 个字符';
  else if (!/^[A-Za-z0-9_.-]{3,24}$/.test(username)) e.username = '账号仅支持 3-24 位字母、数字、下划线、点或短横线';

  if (!f.name.trim()) e.name = '请填写姓名';
  else if (f.name.trim().length < 2) e.name = '姓名至少 2 个字符';

  if (!f.password) e.password = '请填写密码';
  else if (f.password.length < 6) e.password = '密码至少 6 位';

  if (!f.confirm) e.confirm = '请再次输入密码';
  else if (f.confirm !== f.password) e.confirm = '两次输入的密码不一致';

  if (!f.studentId.trim()) e.studentId = '请填写学号';
  else if (!/^[0-9A-Za-z]{6,20}$/.test(f.studentId.trim())) e.studentId = '学号应为 6-20 位数字或字母';

  if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(f.email.trim())) e.email = '邮箱格式不正确';
  if (f.phone.trim() && !/^1[3-9]\d{9}$/.test(f.phone.trim())) e.phone = '请输入 11 位有效手机号';
  return e;
}

export default function Register() {
  useTitle('注册');

  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const revealRef = useRevealScope<HTMLDivElement>();

  const [form, setForm] = useState<RegisterForm>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof RegisterForm) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((prev) => {
      if (!prev[k]) return prev;
      const n = { ...prev };
      delete n[k];
      return n;
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || '注册失败，请稍后重试';
      setFormError(msg);
      toast.error('注册失败', msg);
      setLoading(false);
    }
  };

  const passwordScore = scorePassword(form.password);

  return (
    <div ref={revealRef}>
      <section className="relative flex min-h-dvh items-center px-5 pb-20 pt-28 sm:pt-32">
        <div className="shell">
          <Glass tone="strong" className="relative overflow-hidden p-6 sm:p-10 lg:p-14" data-reveal="scale">
            <GlowOrb className="-left-28 -top-24" size={520} color="rgba(186,230,253,.085)" />
            <GlowOrb className="-bottom-32 -right-24" size={460} color="rgba(255,255,255,.055)" />
            <GridTexture className="opacity-40" size={52} />

            <div className="relative grid gap-12 lg:grid-cols-[1fr_minmax(0,470px)] lg:items-center lg:gap-16">
              {/* ------------------------------ 说明区 ------------------------------ */}
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <LogoLockup uid="register-brand" stacked size={46} />

                <h1 className="mt-9 text-2xl font-semibold tracking-tight sm:text-3xl">
                  <span className="spotlight-text">创建学生账号</span>
                </h1>
                <p className="mt-5 max-w-md text-[14.5px] leading-[1.9] text-muted-foreground">
                  账号用于在线报名活动、申报项目、提交招新报名与查看审核进度。信息仅用于部门内部事务处理。
                </p>

                <ul className="mt-8 flex w-full flex-col gap-3.5 text-left">
                  {[
                    { icon: BadgeCheck, t: '一个账号打通全部业务', d: '活动报名 · 项目申报 · 招新报名 · 留言反馈' },
                    { icon: ShieldCheck, t: '信息仅部门内部可见', d: '联系方式不会公开，匿名留言时完全隐藏身份' },
                    { icon: GraduationCap, t: '学生身份可升级', d: '加入部门后由管理员调整为成员或管理员权限' },
                  ].map((it) => (
                    <li key={it.t} className="flex items-start gap-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] text-primary">
                        <it.icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium">{it.t}</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{it.d}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  <LinkButton to="/login" size="sm" variant="glass">
                    已有账号，去登录
                  </LinkButton>
                  <LinkButton to="/join" size="sm" variant="ghost">
                    浏览招新岗位
                  </LinkButton>
                </div>
              </div>

              {/* ------------------------------ 表单区 ------------------------------ */}
              <Glass tone="soft" className="p-6 sm:p-8">
                <div className="mb-6">
                  <div className="eyebrow mb-4">Sign Up</div>
                  <h2 className="text-xl font-semibold tracking-tight">注册新账号</h2>
                  <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-primary/28 bg-primary/8 px-4 py-3">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <p className="text-[11.5px] leading-relaxed text-foreground/75">
                      注册账号为学生身份，加入部门后由管理员调整权限。
                    </p>
                  </div>
                </div>

                {formError && (
                  <div
                    className="mb-5 flex items-start gap-3 rounded-2xl border border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/10 px-4 py-3.5"
                    style={{ animation: 'sti-pop .3s cubic-bezier(.22,1,.36,1) both' }}
                    role="alert"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--destructive))]" />
                    <div className="min-w-0 text-[12.5px] leading-relaxed">
                      <p className="font-medium text-[hsl(var(--destructive))]">注册失败</p>
                      <p className="mt-1 text-foreground/75">{formError}</p>
                      {/已被注册/.test(formError) && (
                        <p className="mt-2 text-foreground/70">
                          如果这是你自己的账号，请直接
                          <Link to="/login" className="mx-1 text-primary hover:underline">
                            登录
                          </Link>
                          ；如果忘记密码，可在「互动与反馈」留言联系管理员重置。
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="账号" required error={errors.username}>
                      <Input
                        value={form.username}
                        onChange={(e) => set('username')(e.target.value)}
                        placeholder="3-24 位字母或数字"
                        autoComplete="username"
                        autoFocus
                        disabled={loading}
                        data-invalid={errors.username ? 'true' : undefined}
                      />
                    </Field>
                    <Field label="姓名" required error={errors.name}>
                      <Input
                        value={form.name}
                        onChange={(e) => set('name')(e.target.value)}
                        placeholder="请输入真实姓名"
                        autoComplete="name"
                        disabled={loading}
                        data-invalid={errors.name ? 'true' : undefined}
                      />
                    </Field>
                  </div>

                  <Field
                    label="密码"
                    required
                    error={errors.password}
                    hint={!errors.password ? '至少 6 位，建议同时包含字母与数字' : undefined}
                  >
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => set('password')(e.target.value)}
                        placeholder="设置登录密码"
                        autoComplete="new-password"
                        className="pr-12"
                        disabled={loading}
                        data-invalid={errors.password ? 'true' : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? '隐藏密码' : '显示密码'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>

                  {form.password && (
                    <div className="flex items-center gap-3">
                      <div className="flex flex-1 gap-1.5">
                        {[0, 1, 2, 3].map((i) => (
                          <span
                            key={i}
                            className={
                              'h-1 flex-1 rounded-full transition-colors duration-300 ' +
                              (i < passwordScore.level
                                ? passwordScore.level <= 1
                                  ? 'bg-[hsl(var(--destructive))]'
                                  : passwordScore.level === 2
                                    ? 'bg-[hsl(var(--warning))]'
                                    : 'bg-[hsl(var(--success))]'
                                : 'bg-white/10')
                            }
                          />
                        ))}
                      </div>
                      <span className="w-12 shrink-0 text-right text-[11px] text-muted-foreground">{passwordScore.label}</span>
                    </div>
                  )}

                  <Field label="确认密码" required error={errors.confirm}>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={form.confirm}
                      onChange={(e) => set('confirm')(e.target.value)}
                      placeholder="请再次输入密码"
                      autoComplete="new-password"
                      disabled={loading}
                      data-invalid={errors.confirm ? 'true' : undefined}
                    />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="学号" required error={errors.studentId}>
                      <Input
                        value={form.studentId}
                        onChange={(e) => set('studentId')(e.target.value)}
                        placeholder="如 2024100123"
                        inputMode="numeric"
                        disabled={loading}
                        data-invalid={errors.studentId ? 'true' : undefined}
                      />
                    </Field>
                    <Field label="学院" hint={!errors.college ? '选填，之后可在用户中心补充' : undefined}>
                      <Input
                        value={form.college}
                        onChange={(e) => set('college')(e.target.value)}
                        placeholder="如 计算机科学与技术学院"
                        disabled={loading}
                      />
                    </Field>
                    <Field label="邮箱" error={errors.email} hint={!errors.email ? '选填，用于接收通知' : undefined}>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => set('email')(e.target.value)}
                        placeholder="name@university.edu.cn"
                        autoComplete="email"
                        disabled={loading}
                        data-invalid={errors.email ? 'true' : undefined}
                      />
                    </Field>
                    <Field label="手机号" error={errors.phone} hint={!errors.phone ? '选填，活动紧急通知使用' : undefined}>
                      <Input
                        value={form.phone}
                        onChange={(e) => set('phone')(e.target.value)}
                        placeholder="11 位手机号"
                        inputMode="tel"
                        autoComplete="tel"
                        disabled={loading}
                        data-invalid={errors.phone ? 'true' : undefined}
                      />
                    </Field>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 border-t border-white/8 pt-6">
                    <Button type="submit" variant="primary" size="lg" loading={loading}>
                      {loading ? '注册中…' : '注册并登录'}
                      {!loading && <UserPlus className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={loading}
                      onClick={() => {
                        setForm(EMPTY);
                        setErrors({});
                        setFormError(null);
                      }}
                    >
                      重置
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <Chip tone="success">
                      <CheckCircle2 className="h-3 w-3" />
                      注册后自动登录
                    </Chip>
                    <Chip>注册成功即跳转用户中心</Chip>
                  </div>

                  <p className="text-center text-[12.5px] text-muted-foreground">
                    已有账号？
                    <Link to="/login" className="ml-1.5 text-primary transition hover:underline">
                      去登录
                    </Link>
                  </p>
                </form>
              </Glass>
            </div>
          </Glass>

          <p className="mt-8 text-center text-[11.5px] leading-relaxed text-muted-foreground">
            注册即表示你同意部门将所填信息用于活动报名、项目申报与招新管理等内部事务。
          </p>
        </div>
      </section>

      <div className="pb-16" />
    </div>
  );
}

/* =============================================================================
 * 密码强度（0-4）
 * ========================================================================== */
function scorePassword(pwd: string): { level: number; label: string } {
  if (!pwd) return { level: 0, label: '' };
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Za-z]/.test(pwd) && /\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const level = Math.min(4, Math.max(1, score));
  const labels = ['', '偏弱', '一般', '较强', '很强'];
  return { level, label: labels[level] };
}

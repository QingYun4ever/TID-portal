import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wand2,
} from 'lucide-react';

import { ApiError } from '@/lib/api';
import { useTitle } from '@/lib/hooks';
import { useAuth, useSettings, useToast } from '@/lib/store';
import { useRevealScope } from '@/components/RevealScope';
import { LogoLockup } from '@/components/Brand';
import { GlowOrb, GridTexture } from '@/components/LiquidBackdrop';
import { Button, Checkbox, Chip, Field, Glass, Input, LinkButton } from '@/components/ui';

/* =============================================================================
 * 演示账号
 * ========================================================================== */
const DEMO_ACCOUNTS = [
  { username: 'admin', password: 'admin123', label: '超级管理员', desc: '全部后台权限，可管理用户与设置', tone: 'danger' as const },
  { username: 'zhangwei', password: 'sti123456', label: '管理员', desc: '内容审核、报名与申报管理', tone: 'accent' as const },
  { username: 'liyan', password: 'sti123456', label: '部门成员', desc: '发布内容、回复留言（无用户管理）', tone: 'primary' as const },
  { username: 'chenxi', password: 'sti123456', label: '学生', desc: '报名活动、申报项目、查看消息', tone: 'success' as const },
];

const REMEMBER_KEY = 'sti_remember_username';

/* =============================================================================
 * 页面
 * ========================================================================== */
export default function Login() {
  useTitle('登录');

  const { login, logout, user, ready } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const revealRef = useRevealScope<HTMLDivElement>();

  const rawRedirect = params.get('redirect');
  const redirect = rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/';

  const [form, setForm] = useState({ username: '', password: '', remember: true });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);

  const userRef = useRef<HTMLInputElement>(null);
  const pwdRef = useRef<HTMLInputElement>(null);

  /* 记住的账号自动回填 */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) setForm((f) => ({ ...f, username: saved, remember: true }));
    } catch {
      /* ignore */
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const username = form.username.trim();
    if (!username) {
      setError('请输入账号');
      userRef.current?.focus();
      return;
    }
    if (!form.password) {
      setError('请输入密码');
      pwdRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const u = await login(username, form.password);
      try {
        if (form.remember) localStorage.setItem(REMEMBER_KEY, username);
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* ignore */
      }
      toast.success('登录成功', `欢迎回来，${u.name}`);
      if (u.role === 'admin' || u.role === 'superadmin') {
        toast.info('可进入后台管理', '当前账号具备管理权限，登录后可访问「后台管理」。');
      }
      navigate(redirect, { replace: true });
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || '登录失败，请稍后重试';
      setError(msg);
      toast.error('登录失败', msg);
      setLoading(false);
    }
  };

  const fillDemo = (a: (typeof DEMO_ACCOUNTS)[number]) => {
    setForm((f) => ({ ...f, username: a.username, password: a.password }));
    setError(null);
    toast.info('已填充测试账号', `${a.username} / ${a.password}（${a.label}）`);
    pwdRef.current?.focus();
  };

  const doLogout = async () => {
    await logout();
    setLoggedOut(true);
    setForm((f) => ({ ...f, password: '' }));
    toast.success('已退出登录', '你可以使用其他账号登录');
  };

  return (
    <div ref={revealRef}>
      <section className="relative flex min-h-dvh items-center px-5 pb-20 pt-28 sm:pt-32">
        <div className="shell">
          <Glass
            tone="strong"
            className="relative overflow-hidden p-6 sm:p-10 lg:p-14"
            data-reveal="scale"
          >
            <GlowOrb className="-left-24 -top-28" size={520} color="rgba(186,230,253,.11)" />
            <GlowOrb className="-bottom-32 -right-24" size={480} color="rgba(255,255,255,.055)" />
            <GridTexture className="opacity-40" size={52} />

            <div className="relative grid gap-12 lg:grid-cols-[1fr_minmax(0,430px)] lg:items-center lg:gap-16">
              {/* ------------------------------ 品牌区 ------------------------------ */}
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <LogoLockup uid="login-brand" stacked size={46} animated />
                <p className="mt-8 text-[14.5px] leading-[1.9] text-muted-foreground">
                  {settings.slogan || '以技术为舟，以创新为帆'}
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
                  <Chip tone="primary">
                    <Sparkles className="h-3 w-3" />
                    在线报名与申报
                  </Chip>
                  <Chip tone="accent">项目进度查询</Chip>
                  <Chip tone="success">消息通知</Chip>
                </div>

                <ul className="mt-9 flex flex-col gap-3.5 text-left">
                  {[
                    '一个账号打通活动报名、项目申报与招新报名',
                    '实时查看审核进度与结果公示，不再错过通知',
                    '部门成员与管理员另附内容发布、报名管理权限',
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-[13px] leading-relaxed text-foreground/80">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
                      {t}
                    </li>
                  ))}
                </ul>

                <LinkButton to="/" size="sm" variant="ghost" className="mt-9">
                  返回首页
                </LinkButton>
              </div>

              {/* ------------------------------ 表单区 ------------------------------ */}
              <Glass tone="soft" className="p-6 sm:p-8">
                <div className="mb-6">
                  <div className="eyebrow mb-4">Sign In</div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">
                    <span className="spotlight-text">登录门户账号</span>
                  </h1>
                  <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                    学生可使用注册账号登录；部门成员与管理员请使用分配的后台账号。
                  </p>
                </div>

                {/* 错误提示条 */}
                {error && (
                  <div
                    className="mb-5 flex items-start gap-3 rounded-2xl border border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/10 px-4 py-3.5"
                    style={{ animation: 'sti-pop .3s cubic-bezier(.22,1,.36,1) both' }}
                    role="alert"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--destructive))]" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[hsl(var(--destructive))]">登录失败</p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-foreground/75">{error}</p>
                    </div>
                  </div>
                )}

                {/* 已登录提示 */}
                {ready && user && !loggedOut && (
                  <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary/8 px-4 py-3.5">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                    <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-foreground/80">
                      当前已登录为 <span className="font-medium text-foreground">{user.name}</span>
                      {user.role ? ` · ${roleLabel(user.role)}` : ''}，可直接进入用户中心，或用其他账号重新登录。
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      <LinkButton to="/account" size="sm" variant="glass">
                        用户中心
                      </LinkButton>
                      <Button size="sm" variant="ghost" onClick={doLogout}>
                        退出登录
                      </Button>
                    </div>
                  </div>
                )}

                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                  <Field label="账号" required hint="学生为注册时填写的账号，成员为工号/英文名">
                    <Input
                      ref={userRef}
                      value={form.username}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, username: e.target.value }));
                        setError(null);
                      }}
                      placeholder="请输入账号"
                      autoComplete="username"
                      autoFocus
                      disabled={loading}
                    />
                  </Field>

                  <Field label="密码" required>
                    <div className="relative">
                      <Input
                        ref={pwdRef}
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, password: e.target.value }));
                          setError(null);
                        }}
                        placeholder="请输入密码"
                        autoComplete="current-password"
                        className="pr-12"
                        disabled={loading}
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

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Checkbox
                      checked={form.remember}
                      onChange={(v) => setForm((f) => ({ ...f, remember: v }))}
                      label="记住我的账号"
                    />
                    <Link
                      to="/feedback"
                      className="text-[12px] text-muted-foreground transition hover:text-primary"
                    >
                      忘记密码？
                    </Link>
                  </div>

                  <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                    {loading ? '登录中…' : '登录'}
                    {!loading && <LogIn className="h-4 w-4" />}
                  </Button>

                  {redirect !== '/' && (
                    <p className="text-center text-[11.5px] leading-relaxed text-muted-foreground">
                      登录后将自动跳转到 <span className="mono text-primary/85">{redirect}</span>
                    </p>
                  )}

                  <div className="hairline my-1" />

                  <p className="text-center text-[12.5px] text-muted-foreground">
                    还没有账号？
                    <Link to="/register" className="ml-1.5 text-primary transition hover:underline">
                      立即注册
                    </Link>
                  </p>
                </form>
              </Glass>
            </div>
          </Glass>

          {/* ------------------------------ 测试账号 ------------------------------ */}
          <div className="mt-6" data-reveal>
            <Glass tone="soft" className="p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2.5 text-[15px] font-semibold">
                    <KeyRound className="h-4 w-4 text-primary" />
                    测试账号
                  </h2>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                    演示环境内置 4 个账号，点击「一键填充」自动填入表单，随后点击登录即可体验对应角色。
                  </p>
                </div>
                <Chip tone="warning">仅用于演示，请勿在生产环境保留</Chip>
              </div>

              <div className="mt-6 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {DEMO_ACCOUNTS.map((a, i) => (
                  <Glass
                    key={a.username}
                    tone="thin"
                    hover
                    className="flex flex-col p-5"
                    style={{ transitionDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Chip tone={a.tone}>{a.label}</Chip>
                      <UserRound className="h-4 w-4 text-muted-foreground/70" />
                    </div>
                    <p className="mono mt-4 text-[13px] font-medium text-foreground">{a.username}</p>
                    <p className="mono mt-1 text-[12px] text-muted-foreground">{a.password}</p>
                    <p className="mt-3 flex-1 text-[11.5px] leading-relaxed text-muted-foreground">{a.desc}</p>
                    <Button size="sm" variant="glass" className="mt-4 w-full" onClick={() => fillDemo(a)}>
                      <Wand2 className="h-3.5 w-3.5" />
                      一键填充
                    </Button>
                  </Glass>
                ))}
              </div>
            </Glass>
          </div>

          <p className="mt-8 text-center text-[11.5px] leading-relaxed text-muted-foreground">
            登录即表示你同意门户使用 Cookie 与本地存储维持会话状态。
            <Link to="/register" className="ml-1.5 text-primary transition hover:underline">
              注册学生账号
            </Link>
          </p>
        </div>
      </section>

      <div className="pb-16" />
    </div>
  );
}

/* =============================================================================
 * 工具
 * ========================================================================== */
function roleLabel(role: string) {
  const map: Record<string, string> = {
    superadmin: '超级管理员',
    admin: '管理员',
    member: '部门成员',
    student: '学生',
  };
  return map[role] ?? role;
}

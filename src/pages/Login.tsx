import React from 'react';
import { useSearchParams } from 'react-router';
import { AlertCircle, CheckCircle2, LogIn, ShieldCheck, Sparkles } from 'lucide-react';

import { useTitle } from '@/lib/hooks';
import { useAuth, useSettings, useToast } from '@/lib/store';
import { useRevealScope } from '@/components/RevealScope';
import { LogoLockup } from '@/components/Brand';
import { GlowOrb, GridTexture } from '@/components/LiquidBackdrop';
import { Button, Chip, Glass, LinkButton } from '@/components/ui';

function safeRedirect(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return '/';
  try {
    if (new URL(value, window.location.origin).origin !== window.location.origin) return '/';
    return value;
  } catch {
    return '/';
  }
}

export default function Login() {
  useTitle('登录');

  const { logout, user, ready } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const [params] = useSearchParams();
  const revealRef = useRevealScope<HTMLDivElement>();
  const redirect = safeRedirect(params.get('redirect'));
  const error = params.has('error');

  const doLogout = async () => {
    try {
      await logout();
      toast.success('已退出登录');
    } catch {
      toast.error('退出登录失败', '请稍后重试');
    }
  };

  return (
    <div ref={revealRef}>
      <section className="relative flex min-h-dvh items-center px-5 pb-20 pt-28 sm:pt-32">
        <div className="shell">
          <Glass tone="strong" className="relative overflow-hidden p-6 sm:p-10 lg:p-14" data-reveal="scale">
            <GlowOrb className="-left-24 -top-28" size={520} color="rgba(186,230,253,.11)" />
            <GlowOrb className="-bottom-32 -right-24" size={480} color="rgb(var(--orb) / .055)" />
            <GridTexture className="opacity-40" size={52} />

            <div className="relative grid gap-12 lg:grid-cols-[1fr_minmax(0,430px)] lg:items-center lg:gap-16">
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <LogoLockup uid="login-brand" stacked size={46} animated />
                <p className="mt-8 text-[14.5px] leading-[1.9] text-muted-foreground">
                  {settings.slogan || '以技术为舟，以创新为帆'}
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
                  <Chip tone="primary"><Sparkles className="h-3 w-3" />在线报名与申报</Chip>
                  <Chip tone="accent">项目进度查询</Chip>
                  <Chip tone="success">消息通知</Chip>
                </div>

                <ul className="mt-9 flex flex-col gap-3.5 text-left">
                  {[
                    '一个账号打通活动报名、项目申报与招新报名',
                    '实时查看审核进度与结果公示，不再错过通知',
                    '部门成员与管理员另附内容发布、报名管理权限',
                  ].map((text) => (
                    <li key={text} className="flex items-start gap-3 text-[13px] leading-relaxed text-foreground/80">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
                      {text}
                    </li>
                  ))}
                </ul>

                <LinkButton to="/" size="sm" variant="ghost" className="mt-9">返回首页</LinkButton>
              </div>

              <Glass tone="soft" className="p-6 sm:p-8">
                <div className="mb-6">
                  <div className="eyebrow mb-4">Sign In</div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">
                    <span className="spotlight-text">登录门户账号</span>
                  </h1>
                  <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                    使用统一身份认证安全登录。门户不会接收或保存你的认证密码。
                  </p>
                </div>

                {error && (
                  <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/10 px-4 py-3.5" role="alert">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--destructive))]" />
                    <div>
                      <p className="text-[13px] font-medium text-[hsl(var(--destructive))]">登录失败</p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-foreground/75">认证未完成，请重新尝试。</p>
                    </div>
                  </div>
                )}

                {ready && user ? (
                  <div className="flex flex-col gap-5">
                    <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/8 px-4 py-3.5">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="text-[12.5px] leading-relaxed text-foreground/80">
                        当前已登录为 <span className="font-medium text-foreground">{user.name}</span>，可继续使用门户。
                      </p>
                    </div>
                    <LinkButton to={redirect === '/' ? '/account' : redirect} size="lg" variant="primary" className="w-full">
                      继续访问
                    </LinkButton>
                    <Button type="button" variant="ghost" size="sm" onClick={() => void doLogout()}>
                      退出登录
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={() => window.location.assign(`/api/auth/oidc/start?redirect=${encodeURIComponent(redirect)}`)}
                    >
                      使用统一身份认证登录
                      <LogIn className="h-4 w-4" />
                    </Button>
                    {redirect !== '/' && (
                      <p className="text-center text-[11.5px] leading-relaxed text-muted-foreground">
                        登录后将自动跳转到 <span className="mono text-primary/85">{redirect}</span>
                      </p>
                    )}
                  </div>
                )}
              </Glass>
            </div>
          </Glass>

          <p className="mt-8 text-center text-[11.5px] leading-relaxed text-muted-foreground">
            登录后门户使用安全 Cookie 维持会话。
          </p>
        </div>
      </section>
    </div>
  );
}

import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  MessageSquare,
  Rocket,
  Sparkles,
  UserRound,
  UserRoundCog,
} from 'lucide-react';

import { AuthApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';
import { useAuth } from '@/lib/store';
import { ROLES, cn, fdatetime, fromNow } from '@/lib/utils';
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Glass,
  LinkButton,
  Skeleton,
  StatCard,
} from '@/components/ui';

/* =============================================================================
 * 用户中心 · 概览
 * ========================================================================== */

function greeting(hour: number) {
  if (hour < 6) return '夜深了';
  if (hour < 12) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

const QUICK = [
  { to: '/activities', title: '活动报名', desc: '科普讲座 · 科技比赛 · 科技活动', icon: CalendarDays, tone: 'from-sky-400/22 to-cyan-300/6' },
  { to: '/projects/apply', title: '项目申报', desc: '科技比赛与活动在线报名', icon: FileText, tone: 'from-violet-400/22 to-fuchsia-300/6' },
  { to: '/account/messages', title: '我的消息', desc: '审核结果与系统通知', icon: MessageSquare, tone: 'from-amber-400/22 to-orange-300/6' },
  { to: '/account/profile', title: '完善资料', desc: '学号 / 班级 / 联系方式', icon: UserRound, tone: 'from-rose-400/22 to-pink-300/6' },
];

export default function Overview() {
  const { user, stats } = useAuth();
  const navigate = useNavigate();
  useTitle('用户中心');

  const signups = useApi<any[]>(() => AuthApi.signups(), []);
  const applications = useApi<any[]>(() => AuthApi.applications(), []);

  const loading = signups.loading || applications.loading;
  const error = signups.error || applications.error;
  const retry = () => {
    signups.reload();
    applications.reload();
  };

  const roleLabel = ROLES[user?.role ?? ''] ?? user?.role ?? '—';
  const hour = new Date().getHours();

  /* 合并报名与申报，按时间倒序取前 6 条 */
  const feed = useMemo(() => {
    const a = (signups.data ?? []).map((s: any) => ({
      key: `s-${s.id}`,
      kind: '报名',
      tone: 'primary' as 'primary' | 'accent',
      icon: BadgeCheck,
      title: s.title || '活动报名',
      desc: [s.location, s.checkedIn ? '已签到' : '未签到'].filter(Boolean).join(' · '),
      at: s.createdAt,
      to: s.slug ? `/activities/${s.slug}` : '/account/signups',
    }));
    const b = (applications.data ?? []).map((p: any) => ({
      key: `p-${p.id}`,
      kind: '申报',
      tone: 'accent' as 'primary' | 'accent',
      icon: ClipboardList,
      title: p.title || '项目申报',
      desc: [p.category, p.leaderName].filter(Boolean).join(' · '),
      at: p.createdAt,
      to: '/account/applications',
    }));
    return [...a, ...b].sort((x, y) => String(y.at ?? '').localeCompare(String(x.at ?? ''))).slice(0, 6);
  }, [signups.data, applications.data]);

  const tiles = [
    { label: '我的报名', value: stats?.signups ?? 0, icon: <BadgeCheck className="h-4 w-4" />, tone: 'primary' as const, to: '/account/signups' },
    { label: '我的项目', value: stats?.applications ?? 0, icon: <ClipboardList className="h-4 w-4" />, tone: 'accent' as const, to: '/account/applications' },
    { label: '招新申请', value: stats?.joinApplications ?? 0, icon: <UserRoundCog className="h-4 w-4" />, tone: 'success' as const, to: '/account/join' },
    { label: '我的留言', value: stats?.feedback ?? 0, icon: <MessageSquare className="h-4 w-4" />, tone: 'warning' as const, to: '/account/messages' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------ 欢迎区 ------------------------------ */}
      <Glass tone="soft" sheen className="relative p-6 sm:p-8" data-reveal>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-sky-400/18 via-violet-400/12 to-transparent blur-3xl"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Chip tone="primary" className="!px-2.5 !py-0.5">
              <Sparkles className="h-3 w-3" />
              用户中心
            </Chip>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
              <span className="spotlight-text">
                {greeting(hour)}，{user?.name || user?.username}
              </span>
            </h1>
            <p className="mt-2.5 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
              这里汇总了你的活动报名、项目申报与系统通知。当前身份
              <span className="text-primary"> {roleLabel}</span>
              {user?.college ? <span> · {user.college}</span> : null}
              {stats?.unread ? <span> · 有 {stats.unread} 条未读消息</span> : null}。
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Button variant="primary" size="sm" onClick={() => navigate('/account/messages')}>
                <MessageSquare className="h-3.5 w-3.5" />
                查看消息
                {stats?.unread ? <span className="mono opacity-80">({stats.unread})</span> : null}
              </Button>
              <LinkButton to="/account/profile" variant="glass" size="sm">
                <UserRound className="h-3.5 w-3.5" />
                编辑资料
              </LinkButton>
            </div>
          </div>

          <div className="shrink-0 sm:text-right">
            <p className="mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground/70">
              {fdatetime(new Date().toISOString())}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 sm:justify-end">
              <Chip>{roleLabel}</Chip>
              {user?.studentId ? <Chip className="mono">{user.studentId}</Chip> : null}
            </div>
          </div>
        </div>
      </Glass>

      {/* ------------------------------ 数据概览 ------------------------------ */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <button
            key={t.label}
            type="button"
            onClick={() => navigate(t.to)}
            data-reveal="scale"
            style={{ transitionDelay: `${i * 60}ms` }}
            className="group block w-full rounded-2xl text-left transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label={`前往${t.label}`}
          >
            <StatCard label={t.label} value={t.value} unit="条" icon={t.icon} tone={t.tone} className="h-full" />
          </button>
        ))}
      </div>

      {/* ------------------------------ 快捷入口 ------------------------------ */}
      <div>
        <SectionHead title="快捷入口" hint="常用业务直达" />
        <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {QUICK.map((q, i) => (
            <Link key={q.to} to={q.to} data-reveal="scale" style={{ transitionDelay: `${i * 55}ms` }} className="group block">
              <Glass tone="soft" hover sheen className="relative h-full overflow-hidden p-5">
                <div
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-70 blur-2xl transition-opacity duration-500 group-hover:opacity-100',
                    q.tone
                  )}
                />
                <div className="relative flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] text-primary transition-all duration-400 group-hover:border-primary/40 group-hover:bg-primary/12">
                    <q.icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-[14.5px] font-semibold">
                      {q.title}
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-70" />
                    </h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{q.desc}</p>
                  </div>
                </div>
              </Glass>
            </Link>
          ))}
        </div>
      </div>

      {/* ------------------------------ 最近动态 ------------------------------ */}
      <div>
        <SectionHead
          title="最近动态"
          hint="报名与项目申报记录"
          action={
            <LinkButton to="/account/signups" variant="ghost" size="sm">
              全部记录 <ArrowUpRight className="h-3.5 w-3.5" />
            </LinkButton>
          }
        />

        <Glass tone="soft" className="mt-3.5 p-2 sm:p-3">
          {error ? (
            <ErrorState message={error} onRetry={retry} />
          ) : loading ? (
            <div className="flex flex-col gap-2.5 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : feed.length === 0 ? (
            <EmptyState
              icon={<Rocket className="h-5 w-5" />}
              title="还没有动态记录"
              description="报名一场活动或提交一次项目申报后，进度会出现在这里。"
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <LinkButton to="/activities" variant="primary">
                    <CalendarDays className="h-4 w-4" /> 浏览活动
                  </LinkButton>
                  <LinkButton to="/projects/apply">
                    <FileText className="h-4 w-4" /> 项目申报
                  </LinkButton>
                </div>
              }
            />
          ) : (
            <ul className="flex flex-col">
              {feed.map((f, i) => (
                <li key={f.key} className={cn(i > 0 && 'border-t border-white/6')}>
                  <Link
                    to={f.to}
                    className="group flex items-start gap-4 rounded-xl px-3 py-3.5 transition-colors duration-300 hover:bg-white/[0.045]"
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                        f.tone === 'primary'
                          ? 'border-primary/30 bg-primary/12 text-primary'
                          : 'border-accent/30 bg-accent/12 text-accent'
                      )}
                    >
                      <f.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip tone={f.tone} className="!px-2 !py-0 !text-[10px]">
                          {f.kind}
                        </Chip>
                        <span className="clamp-1 text-[13.5px] font-medium text-foreground/90 transition-colors group-hover:text-primary">
                          {f.title}
                        </span>
                      </div>
                      {f.desc && <p className="clamp-1 mt-1 text-[12px] text-muted-foreground">{f.desc}</p>}
                    </div>
                    <span className="mono mt-1 shrink-0 text-[11px] text-muted-foreground">{fromNow(f.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Glass>
      </div>
    </div>
  );
}

/* ------------------------------ 小组件 ------------------------------ */
function SectionHead({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {hint && <span className="text-[11.5px] text-muted-foreground">{hint}</span>}
      </div>
      {action}
    </div>
  );
}

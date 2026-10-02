import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  CircleSlash,
  Clock,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

import { AuthApi, SubmitApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { cn, fdatetime, fromNow } from '@/lib/utils';
import {
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Glass,
  LinkButton,
  Skeleton,
} from '@/components/ui';

/* =============================================================================
 * 用户中心 · 我的报名
 * ========================================================================== */

interface SignupRow {
  id: number;
  checkedIn: boolean;
  createdAt: string;
  title: string;
  slug: string;
  startAt: string;
  endAt: string | null;
  location: string | null;
  cover: string | null;
  status: string;
}

const stamp = (v: string | null | undefined) => {
  const d = new Date(String(v ?? '').replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

export default function Signups() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [target, setTarget] = useState<SignupRow | null>(null);
  const [cancelling, setCancelling] = useState(false);
  useTitle('我的报名');

  const { data, loading, error, reload } = useApi<SignupRow[]>(() => AuthApi.signups(), []);

  const grouped = useMemo(() => {
    const now = Date.now();
    const all = data ?? [];
    const upcoming: SignupRow[] = [];
    const past: SignupRow[] = [];
    for (const s of all) {
      const end = stamp(s.endAt) || stamp(s.startAt);
      if (end && end < now) past.push(s);
      else upcoming.push(s);
    }
    upcoming.sort((a, b) => stamp(a.startAt) - stamp(b.startAt));
    past.sort((a, b) => stamp(b.startAt) - stamp(a.startAt));
    return { upcoming, past };
  }, [data]);

  const list = tab === 'upcoming' ? grouped.upcoming : grouped.past;

  const askCancel = (s: SignupRow) => {
    if (!user?.studentId) {
      toast.error('缺少学号', '请先前往「个人资料」补全学号后再取消报名。');
      return;
    }
    setTarget(s);
  };

  const doCancel = async () => {
    if (!target || !user?.studentId) return;
    setCancelling(true);
    try {
      await SubmitApi.cancelSignup(target.id, user.studentId);
      toast.success('已取消报名', `「${target.title}」的报名记录已撤销。`);
      setTarget(null);
      reload();
    } catch (e: any) {
      toast.error('取消失败', e?.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">我的报名</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            共 <span className="mono text-foreground">{data?.length ?? 0}</span> 条报名记录；
            进行中 <span className="mono text-foreground">{grouped.upcoming.length}</span> 场，
            已结束 <span className="mono text-foreground">{grouped.past.length}</span> 场。
          </p>
        </div>
        <LinkButton to="/activities" variant="glass" size="sm">
          <CalendarDays className="h-3.5 w-3.5" /> 浏览更多活动
        </LinkButton>
      </div>

      {/* 分组切换 */}
      <div className="inline-flex w-fit gap-1 rounded-full border border-white/10 bg-white/[0.045] p-1 backdrop-blur-xl">
        {([
          { value: 'upcoming', label: '即将开始', count: grouped.upcoming.length },
          { value: 'past', label: '已结束', count: grouped.past.length },
        ] as const).map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              'rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-300',
              tab === t.value
                ? 'bg-white/12 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.22)]'
                : 'text-muted-foreground hover:text-foreground/85'
            )}
          >
            {t.label}
            <span className={cn('mono ml-1.5 text-[10px]', tab === t.value ? 'text-primary' : 'text-muted-foreground/70')}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {error ? (
        <Glass tone="soft">
          <ErrorState message={error} onRetry={reload} />
        </Glass>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[168px]" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Glass tone="soft">
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title={tab === 'upcoming' ? '暂无进行中的报名' : '暂无已结束的报名'}
            description={
              user?.studentId
                ? '门户会持续发布科技比赛与科技活动，去活动列表看看有没有感兴趣的。'
                : '若你已用其他账号报名，请先前往「个人资料」补全学号，报名记录才能与当前账号关联。'
            }
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <LinkButton to="/activities" variant="primary">
                  <CalendarDays className="h-4 w-4" /> 去活动列表
                </LinkButton>
                <LinkButton to="/account/profile">完善资料</LinkButton>
              </div>
            }
          />
        </Glass>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
          {list.map((s, i) => (
            <SignupCard
              key={s.id}
              signup={s}
              index={i}
              past={tab === 'past'}
              onCancel={() => askCancel(s)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!target}
        onClose={() => (cancelling ? undefined : setTarget(null))}
        onConfirm={doCancel}
        loading={cancelling}
        title="取消活动报名"
        confirmText="确认取消"
        description={
          target
            ? `确定要取消「${target.title}」的报名吗？取消后若活动仍在报名期，你可以重新报名。`
            : ''
        }
      />
    </div>
  );
}

/* ------------------------------ 报名卡片 ------------------------------ */
function SignupCard({
  signup,
  index,
  past,
  onCancel,
}: {
  signup: SignupRow;
  index: number;
  past: boolean;
  onCancel: () => void;
}) {
  return (
    <Glass
      tone="soft"
      hover
      sheen
      className="flex h-full flex-col p-5"
      data-reveal="scale"
      style={{ transitionDelay: `${Math.min(index, 5) * 55}ms` }}
    >
      <div className="flex items-start gap-4">
        <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl border border-white/10 bg-white/[0.045] py-2.5">
          <span className="mono text-[10px] uppercase text-muted-foreground">{fdatetime(signup.startAt).slice(5, 7)}月</span>
          <span className="mono text-xl font-semibold leading-tight text-foreground">
            {fdatetime(signup.startAt).slice(8, 10)}
          </span>
          <span className="mono text-[9px] text-muted-foreground">{fdatetime(signup.startAt).slice(0, 4)}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {past ? (
              <Chip tone="success" className="!px-2.5 !py-0.5">
                已结束
              </Chip>
            ) : (
              <Chip tone="warning" className="!px-2.5 !py-0.5">
                即将开始
              </Chip>
            )}
            {signup.checkedIn ? (
              <Chip tone="primary" className="!px-2.5 !py-0.5">
                <BadgeCheck className="h-3 w-3" /> 已签到
              </Chip>
            ) : (
              <Chip className="!px-2.5 !py-0.5">
                <CircleSlash className="h-3 w-3" /> 未签到
              </Chip>
            )}
          </div>
          <h3 className="clamp-2 mt-2.5 text-[15px] font-semibold leading-snug">{signup.title}</h3>
          <p className="mono mt-1.5 text-[11px] text-muted-foreground">
            报名于 {fromNow(signup.createdAt)} · {fdatetime(signup.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/8 pt-4 text-[11.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span className="mono">
            {fdatetime(signup.startAt)}
            {signup.endAt ? ` — ${fdatetime(signup.endAt).slice(5)}` : ''}
          </span>
        </span>
        {signup.location && (
          <span className="clamp-1 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {signup.location}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <LinkButton to={`/activities/${signup.slug}`} size="sm" className="flex-1 sm:flex-none">
          <ArrowUpRight className="h-3.5 w-3.5" /> 查看活动
        </LinkButton>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-[hsl(var(--destructive))]">
          <ShieldCheck className="h-3.5 w-3.5" /> 取消报名
        </Button>
        <span className="mono ml-auto text-[10.5px] text-muted-foreground/70"># {signup.id}</span>
      </div>
    </Glass>
  );
}

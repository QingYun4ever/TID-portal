import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ArrowUpRight,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
} from 'lucide-react';

import { PublicApi } from '@/lib/api';
import { useApi, useDebounced, useRevealScan, useTitle } from '@/lib/hooks';
import { cn, fdate, fdatetime, fnum, fweek } from '@/lib/utils';
import { ActivityCard } from '@/components/cards';
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Glass,
  LinkButton,
  PageHero,
  Pagination,
  SearchInput,
  Skeleton,
  Tabs,
} from '@/components/ui';

/* =============================================================================
 * 活动列表 / 日历（/activities）
 *  - 列表视图：scope 三态 + 分类筛选 + 搜索 + 分页
 *  - 日历视图：PublicApi.activityCalendar(year, month) 自绘月历（CSS Grid，7 列）
 * ========================================================================== */

const PAGE_SIZE = 9;

const SCOPE_TABS = [
  { value: 'upcoming', label: '即将开始' },
  { value: 'past', label: '已结束的活动' },
  { value: 'all', label: '全部活动' },
];

const VIEW_TABS = [
  { value: 'list', label: '列表视图' },
  { value: 'calendar', label: '日历视图' },
];

type Scope = 'upcoming' | 'past' | 'all';

export default function Activities() {
  useTitle('活动报名');
  const [sp] = useSearchParams();

  const [scope, setScope] = useState<Scope>(() => {
    const s = sp.get('scope');
    return s === 'past' || s === 'all' ? s : 'upcoming';
  });
  const [category, setCategory] = useState(() => sp.get('category') || 'all');
  const [view, setView] = useState<'list' | 'calendar'>(() => (sp.get('view') === 'calendar' ? 'calendar' : 'list'));
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');

  /* 搜索防抖，避免每个字符都打一次接口 */
  const dq = useDebounced(q, 380);

  const { data, meta, loading, error, reload } = useApi<any>(
    () => PublicApi.activities({ page, pageSize: PAGE_SIZE, scope, q: dq, category }),
    [page, scope, category, dq]
  );

  const items: any[] = data?.items ?? [];
  const total = Number(data?.total ?? 0);
  const categories: { name: string; count: number }[] = meta?.categories ?? [];

  /* 筛选条件变化时回到第一页 */
  useEffect(() => {
    setPage(1);
  }, [scope, category, dq]);

  /* 列表数据与视图切换后重新扫描滚动揭示元素（异步挂载的节点也需要被观察） */
  useRevealScan(`${view}|${loading}|${items.length}|${page}|${scope}|${category}|${dq}`);

  const scopeLabel = SCOPE_TABS.find((t) => t.value === scope)?.label ?? '活动';

  return (
    <>
      <PageHero
        eyebrow="Events & Sign-up"
        title="活动报名"
        description="校内科技活动与科技比赛的报名入口：在线报名、名额限制与截止倒计时提醒。"
        breadcrumb={[{ label: '活动报名' }]}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <Chip tone="primary">
            <CalendarDays className="h-3 w-3" />
            {scopeLabel}
          </Chip>
          <Chip tone="default">
            当前筛选 <span className="mono ml-1 text-foreground">{fnum(total)}</span> 场
          </Chip>
          <Chip tone="accent">
            <CalendarRange className="h-3 w-3" />
            支持日历视图
          </Chip>
        </div>
      </PageHero>

      <section className="shell pb-24">
        {/* ---------------------------- 工具栏 ---------------------------- */}
        <Glass tone="soft" className="p-5" data-reveal>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              items={SCOPE_TABS}
              value={scope}
              onChange={(v) => setScope(v as Scope)}
              size="sm"
              className="w-full lg:w-auto"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder="搜索活动名称或简介…"
                className="w-full sm:w-72"
              />
              <Tabs
                items={VIEW_TABS}
                value={view}
                onChange={(v) => setView(v as 'list' | 'calendar')}
                size="sm"
                className="w-full sm:w-auto"
              />
            </div>
          </div>

          {/* 分类筛选 */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/8 pt-4" data-reveal="blur">
            <span className="mr-1 text-[11px] tracking-wide text-muted-foreground">活动分类</span>
            <CategoryChip active={category === 'all'} onClick={() => setCategory('all')}>
              全部
            </CategoryChip>
            {categories.map((c) => (
              <CategoryChip key={c.name} active={category === c.name} onClick={() => setCategory(c.name)}>
                {c.name}
                <span className="mono ml-1.5 text-[10px] opacity-70">{c.count}</span>
              </CategoryChip>
            ))}
            {!categories.length && !loading && (
              <span className="text-[11.5px] text-muted-foreground">暂无分类数据</span>
            )}
          </div>
        </Glass>

        {/* ---------------------------- 主体 ---------------------------- */}
        {view === 'list' ? (
          <div className="mt-8">
            {error ? (
              <Glass tone="soft" className="py-6">
                <ErrorState message={error} onRetry={reload} />
              </Glass>
            ) : loading && !items.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-64" />
                ))}
              </div>
            ) : items.length ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((a, i) => (
                    <div key={a.id} data-reveal="scale" style={{ transitionDelay: `${(i % 3) * 70}ms` }}>
                      <ActivityCard activity={a} />
                    </div>
                  ))}
                </div>
                <Pagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onChange={(p) => {
                    setPage(p);
                    window.scrollTo({ top: 320, behavior: 'smooth' });
                  }}
                  className="mt-10"
                />
              </>
            ) : (
              <Glass tone="soft">
                <EmptyState
                  icon={<CalendarDays className="h-6 w-6" />}
                  title="没有符合条件的活动"
                  description={
                    dq
                      ? '换个关键词或清空搜索条件再试试。'
                      : scope === 'upcoming'
                        ? '近期暂无活动，敬请期待后续通知。'
                        : '当前筛选条件下暂无活动记录。'
                  }
                  action={
                    <div className="flex flex-wrap justify-center gap-3">
                      {(dq || category !== 'all') && (
                        <Button
                          onClick={() => {
                            setQ('');
                            setCategory('all');
                          }}
                        >
                          清空筛选
                        </Button>
                      )}
                      <LinkButton to="/activities?scope=past">查看已结束的活动</LinkButton>
                    </div>
                  }
                />
              </Glass>
            )}
          </div>
        ) : (
          <CalendarView />
        )}

        {/* ---------------------------- 底部引导 ---------------------------- */}
        <Glass tone="soft" className="mt-12 flex flex-wrap items-center justify-between gap-4 p-6" data-reveal="blur">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] text-primary">
              <CalendarRange className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[14px] font-medium">想了解后续活动？</p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">竞赛信息与活动报名入口同样在门户开放。</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton to="/competitions">浏览竞赛信息</LinkButton>
            <LinkButton to="/projects/apply" variant="primary">
              项目在线申报
            </LinkButton>
          </div>
        </Glass>
      </section>
    </>
  );
}

/* =============================================================================
 * 分类筛选徽章
 * ========================================================================== */
function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full transition-all duration-300',
        active ? 'ring-1 ring-primary/45' : 'opacity-80 hover:opacity-100'
      )}
    >
      <Chip tone={active ? 'primary' : 'default'}>{children}</Chip>
    </button>
  );
}

/* =============================================================================
 * 日历视图
 *  - 上/下月切换；当月每天显示活动小圆点；点击某天列出当天活动
 * ========================================================================== */
function CalendarView() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });

  /* 换月后日历面板重新挂载，需要重新扫描揭示元素 */
  useRevealScan(`calendar|${ym.y}-${ym.m}`);

  const shift = (delta: number) => {
    setYm((cur) => {
      const d = new Date(cur.y, cur.m - 1 + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    });
  };

  return (
    <div className="mt-8">
      <Glass tone="soft" className="p-5 sm:p-6" data-reveal>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button size="icon-sm" variant="ghost" onClick={() => shift(-1)} aria-label="上个月">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="mono w-[118px] text-center text-[15px] font-semibold tabular-nums">
              {ym.y} 年 {String(ym.m).padStart(2, '0')} 月
            </span>
            <Button size="icon-sm" variant="ghost" onClick={() => shift(1)} aria-label="下个月">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="mono text-[11px] text-muted-foreground">周一为一周起始</span>
            <Button
              size="sm"
              variant="glass"
              onClick={() => {
                const d = new Date();
                setYm({ y: d.getFullYear(), m: d.getMonth() + 1 });
              }}
            >
              回到本月
            </Button>
          </div>
        </div>

        {/* 换月时整体重新挂载，保证 loading 态与选中日期都被重置 */}
        <CalendarMonth key={`${ym.y}-${ym.m}`} year={ym.y} month={ym.m} />
      </Glass>
    </div>
  );
}

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function CalendarMonth({ year, month }: { year: number; month: number }) {
  const { data, loading, error, reload } = useApi<any[]>(
    () => PublicApi.activityCalendar(year, month),
    [year, month]
  );
  const events: any[] = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const [selected, setSelected] = useState<string | null>(null);

  const today = new Date();
  const todayKey =
    today.getFullYear() === year && today.getMonth() + 1 === month
      ? `${year}-${pad2(month)}-${pad2(today.getDate())}`
      : null;

  const byDay = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const e of events) {
      const k = String(e.startAt ?? '').slice(0, 10);
      if (!k) continue;
      (m[k] ||= []).push(e);
    }
    return m;
  }, [events]);

  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7; // 周一 = 0
  const daysInMonth = new Date(year, month, 0).getDate();
  const slots = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const firstEventKey = events.length ? String(events[0].startAt).slice(0, 10) : null;
  const activeDay = selected ?? todayKey ?? firstEventKey;
  const dayEvents = activeDay ? byDay[activeDay] ?? [] : [];

  if (error)
    return (
      <Glass tone="thin" className="py-4">
        <ErrorState message={error} onRetry={reload} />
      </Glass>
    );

  if (loading && !events.length)
    return (
      <>
        <div className="mb-3 grid grid-cols-7 gap-1.5">
          {WEEK_LABELS.map((w) => (
            <Skeleton key={w} className="h-7 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-[74px] rounded-2xl sm:h-[92px]" />
          ))}
        </div>
      </>
    );

  return (
    <>
      {/* 星期表头 */}
      <div className="grid grid-cols-7 gap-1.5">
        {WEEK_LABELS.map((w, i) => (
          <div
            key={w}
            className={cn(
              'py-1.5 text-center text-[11px] tracking-wide',
              i >= 5 ? 'text-muted-foreground/70' : 'text-muted-foreground'
            )}
          >
            周{w}
          </div>
        ))}
      </div>

      {/* 月历网格（自绘，无日历库） */}
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {Array.from({ length: slots }).map((_, idx) => {
          const day = idx - firstWeekday + 1;
          if (day < 1 || day > daysInMonth) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[74px] rounded-2xl border border-white/4 bg-white/[0.012] sm:min-h-[92px]"
                aria-hidden
              />
            );
          }
          const key = `${year}-${pad2(month)}-${pad2(day)}`;
          const list = byDay[key] ?? [];
          const isToday = key === todayKey;
          const isActive = key === activeDay;
          const allPast = list.length > 0 && list.every((a: any) => new Date(String(a.startAt).replace(' ', 'T')) < today);

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              aria-pressed={isActive}
              className={cn(
                'group relative flex min-h-[74px] flex-col items-start gap-1.5 rounded-2xl border p-2 text-left transition-all duration-300 sm:min-h-[92px] sm:p-2.5',
                isActive
                  ? 'border-primary/50 bg-primary/12 shadow-[0_0_22px_-12px_hsl(var(--primary)/.85)]'
                  : 'border-white/8 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]'
              )}
            >
              <span
                className={cn(
                  'mono text-[11.5px] tabular-nums',
                  isToday
                    ? 'rounded-full bg-primary px-1.5 text-[hsl(var(--primary-foreground))]'
                    : isActive
                      ? 'text-primary'
                      : 'text-muted-foreground'
                )}
              >
                {day}
              </span>

              {list.length > 0 && (
                <span className="flex flex-wrap items-center gap-1">
                  {list.slice(0, 4).map((a: any) => (
                    <span
                      key={a.id}
                      className={cn('h-1.5 w-1.5 rounded-full', allPast ? 'bg-[hsl(var(--success))]' : 'bg-primary')}
                    />
                  ))}
                  {list.length > 4 && <span className="mono text-[9px] text-muted-foreground">+{list.length - 4}</span>}
                </span>
              )}

              {list[0] && (
                <span className="clamp-1 hidden w-full text-[10.5px] leading-tight text-foreground/70 sm:block">
                  {list[0].title}
                </span>
              )}

              {list.length > 1 && (
                <span className="mono absolute right-1.5 top-1.5 text-[9.5px] text-primary/85">{list.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 当天活动列表 */}
      <div className="mt-6 border-t border-white/8 pt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2.5 text-[15px] font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" />
            {activeDay ? `${activeDay} ${fweek(activeDay)}` : '选择日期查看当天活动'}
          </h3>
          <span className="mono text-[11px] text-muted-foreground">
            本月共 <span className="text-primary">{events.length}</span> 场活动
          </span>
        </div>

        {dayEvents.length ? (
          <div className="flex flex-col gap-1">
            {dayEvents.map((a: any) => (
              <Link
                key={a.id}
                to={`/activities/${a.slug}`}
                className="group flex items-start gap-4 rounded-2xl px-3 py-3 transition-colors duration-300 hover:bg-white/[0.045]"
              >
                <span className="mono mt-0.5 w-11 shrink-0 text-[12px] tabular-nums text-primary">
                  {fdatetime(a.startAt).slice(11, 16)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="clamp-1 text-[13.5px] font-medium leading-snug transition-colors group-hover:text-primary">
                    {a.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="clamp-1">{a.location || '地点待定'}</span>
                    </span>
                    <span className="mono flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      {a.signedCount ?? 0}
                      {a.capacity ? ` / ${a.capacity}` : ' / 不限'}
                    </span>
                    <Chip className="!px-2 !py-0 !text-[10px]">{a.category}</Chip>
                  </div>
                </div>
                <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-80" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Clock className="h-5 w-5 text-muted-foreground/70" />
            <p className="text-[13px] text-muted-foreground">
              {activeDay ? `${activeDay} 暂无活动安排` : '点击日历中的任意一天查看当天活动'}
            </p>
            {firstEventKey && (
              <button
                type="button"
                onClick={() => setSelected(firstEventKey)}
                className="text-[12px] text-primary transition hover:underline"
              >
                跳到本月首个活动日（{fdate(firstEventKey)}）
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

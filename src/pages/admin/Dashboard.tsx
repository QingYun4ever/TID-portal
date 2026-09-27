import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CalendarPlus,
  ClipboardList,
  Eye,
  FileText,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  MessageSquare,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { AdminApi } from '@/lib/api';
import { useApi, useRevealScan, useTitle } from '@/lib/hooks';
import { cn, fdatetime, fnum, fromNow } from '@/lib/utils';
import { AdminPage, BarList, MiniBars, Sparkline, StatTile } from '@/components/AdminKit';
import { Button, Chip, Dot, EmptyState, ErrorState, Glass, LinkButton, Skeleton } from '@/components/ui';

/* =============================================================================
 * 局部组件：玻璃面板
 * ========================================================================== */
function Panel({
  title,
  subtitle,
  action,
  icon,
  className,
  children,
  reveal,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
  reveal?: string;
}) {
  return (
    <Glass tone="soft" className={cn('flex flex-col p-5 sm:p-6', className)} data-reveal={reveal ?? ''}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {icon && <span className="text-primary">{icon}</span>}
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </Glass>
  );
}

/* =============================================================================
 * 环形占比图（纯 SVG，无依赖）
 * ========================================================================== */
const SERIES_TONES = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

function Donut({ items, centerLabel }: { items: { name: string; value: number }[]; centerLabel: string }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const r = 54;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <svg viewBox="0 0 140 140" className="h-[132px] w-[132px] shrink-0 -rotate-90" role="img" aria-label={centerLabel}>
        <circle cx="70" cy="70" r={r} fill="none" strokeWidth="13" className="stroke-white/8" />
        {total > 0 &&
          items.map((it, i) => {
            const len = (it.value / total) * c;
            const el = (
              <circle
                key={it.name}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                strokeWidth="13"
                strokeLinecap="butt"
                stroke={SERIES_TONES[i % SERIES_TONES.length]}
                strokeDasharray={`${Math.max(0, len - 1.5)} ${c - Math.max(0, len - 1.5)}`}
                strokeDashoffset={-acc}
                className="transition-all duration-700"
              />
            );
            acc += len;
            return el;
          })}
      </svg>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {items.length === 0 && <p className="text-xs text-muted-foreground">暂无可统计的数据</p>}
        {items.map((it, i) => {
          const pct = total ? Math.round((it.value / total) * 1000) / 10 : 0;
          return (
            <div key={it.name} className="flex items-center gap-2.5 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SERIES_TONES[i % SERIES_TONES.length] }} />
              <span className="min-w-0 flex-1 truncate text-foreground/80">{it.name}</span>
              <span className="mono shrink-0 tabular-nums text-muted-foreground">
                {it.value} · {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =============================================================================
 * 14 天多序列趋势折线图（双轴：左=浏览量，右=报名/申报）
 * ========================================================================== */
interface TrendPoint {
  date: string;
  views: number;
  signups: number;
  applications: number;
  joins: number;
  feedback: number;
}

function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 760;
  const H = 250;
  const PAD = { l: 46, r: 46, t: 18, b: 30 };
  const n = trend.length;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const maxViews = Math.max(1, ...trend.map((t) => t.views));
  const maxSmall = Math.max(1, ...trend.map((t) => Math.max(t.signups, t.applications)));

  const x = (i: number) => PAD.l + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const yViews = (v: number) => PAD.t + (1 - v / maxViews) * innerH;
  const ySmall = (v: number) => PAD.t + (1 - v / maxSmall) * innerH;

  const line = (pick: (p: TrendPoint) => number, scale: (v: number) => number) =>
    trend.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${scale(pick(p)).toFixed(1)}`).join(' ');

  const viewsPath = line((p) => p.views, yViews);
  const areaPath = `${viewsPath} L${x(n - 1).toFixed(1)},${(PAD.t + innerH).toFixed(1)} L${x(0).toFixed(1)},${(
    PAD.t + innerH
  ).toFixed(1)} Z`;

  const grids = [0, 0.25, 0.5, 0.75, 1];
  const active = hover !== null ? trend[hover] : null;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="近 14 天浏览量、报名与申报趋势">
        {/* 网格与双轴刻度 */}
        {grids.map((g) => {
          const y = PAD.t + g * innerH;
          return (
            <g key={g}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} className="stroke-white/8" strokeWidth="1" />
              <text x={PAD.l - 8} y={y + 3.5} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 10 }}>
                {Math.round(maxViews * (1 - g))}
              </text>
              <text x={W - PAD.r + 8} y={y + 3.5} textAnchor="start" className="fill-muted-foreground" style={{ fontSize: 10 }}>
                {Math.round(maxSmall * (1 - g))}
              </text>
            </g>
          );
        })}

        {/* 面积 + 折线 */}
        <defs>
          <linearGradient id="dash-views-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.28" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#dash-views-fill)" />
        <path d={viewsPath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={line((p) => p.signups, ySmall)} fill="none" stroke="hsl(var(--success))" strokeWidth="1.8" strokeLinejoin="round" />
        <path d={line((p) => p.applications, ySmall)} fill="none" stroke="hsl(var(--accent))" strokeWidth="1.8" strokeLinejoin="round" strokeDasharray="5 4" />

        {/* 悬停辅助线 */}
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + innerH} className="stroke-white/20" strokeWidth="1" />
            <circle cx={x(hover)} cy={yViews(trend[hover].views)} r="3.6" fill="hsl(var(--primary))" />
            <circle cx={x(hover)} cy={ySmall(trend[hover].signups)} r="3.2" fill="hsl(var(--success))" />
            <circle cx={x(hover)} cy={ySmall(trend[hover].applications)} r="3.2" fill="hsl(var(--accent))" />
          </>
        )}

        {/* 日期标签 */}
        {trend.map((p, i) =>
          i % 2 === 0 || i === n - 1 ? (
            <text key={p.date} x={x(i)} y={H - 10} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
              {p.date}
            </text>
          ) : null
        )}

        {/* 命中区域 */}
        {trend.map((p, i) => (
          <rect
            key={`hit-${p.date}`}
            x={x(i) - innerW / Math.max(1, (n - 1) * 2)}
            y={PAD.t}
            width={innerW / Math.max(1, n - 1)}
            height={innerH}
            fill="transparent"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover((cur) => (cur === i ? null : cur))}
          />
        ))}
      </svg>

      {/* 悬停提示 */}
      {active && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-[168px] -translate-x-1/2 rounded-xl border border-white/12 bg-black/85 p-3 backdrop-blur-xl"
          style={{ left: `${(x(hover!) / W) * 100}%` }}
        >
          <p className="mono text-[10px] text-muted-foreground">{active.date}</p>
          <div className="mt-2 flex flex-col gap-1 text-[11px]">
            <span className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">浏览量</span>
              <span className="mono text-primary">{active.views}</span>
            </span>
            <span className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">报名</span>
              <span className="mono text-[hsl(var(--success))]">{active.signups}</span>
            </span>
            <span className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">申报</span>
              <span className="mono text-accent">{active.applications}</span>
            </span>
            <span className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">招新 / 留言</span>
              <span className="mono text-foreground/85">
                {active.joins} / {active.feedback}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* 图例 */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-[3px] w-5 rounded-full bg-primary" /> 浏览量（左轴）
        </span>
        <span className="flex items-center gap-2">
          <span className="h-[3px] w-5 rounded-full bg-[hsl(var(--success))]" /> 活动报名（右轴）
        </span>
        <span className="flex items-center gap-2">
          <span className="h-[3px] w-5 rounded-full bg-accent" /> 项目申报（右轴）
        </span>
      </div>
    </div>
  );
}

/* =============================================================================
 * 页面骨架
 * ========================================================================== */
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Skeleton className="h-[340px] xl:col-span-2" />
        <Skeleton className="h-[340px]" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[220px]" />
        ))}
      </div>
    </div>
  );
}

/* =============================================================================
 * 数据看板
 * ========================================================================== */
export default function Dashboard() {
  useTitle('数据看板');
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi<any>(() => AdminApi.stats(), []);
  /* 本页为懒加载路由，且内容在数据到达后才渲染 —— 每次内容变化重新扫描滚动揭示 */
  useRevealScan(`${loading ? 'loading' : 'idle'}-${data ? 'ready' : 'pending'}`);

  const trend: TrendPoint[] = useMemo(() => data?.trend ?? [], [data]);

  const sum = useMemo(
    () => ({
      views: trend.reduce((s, t) => s + (t.views || 0), 0),
      signups: trend.reduce((s, t) => s + (t.signups || 0), 0),
      applications: trend.reduce((s, t) => s + (t.applications || 0), 0),
      joins: trend.reduce((s, t) => s + (t.joins || 0), 0),
    }),
    [trend]
  );

  const recentLogs = useMemo(() => (data?.recentLogs ?? []).slice(0, 10), [data]);

  return (
    <AdminPage
      title="数据看板"
      description="门户全部业务数据的总览：内容资产、办理进度、近 14 天流量趋势与最近操作记录。"
      breadcrumb="后台管理"
      icon={<LayoutDashboard className="h-6 w-6" />}
      actions={
        <>
          <Button variant="glass" onClick={reload} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            刷新
          </Button>
          <LinkButton to="/" variant="ghost" size="md">
            <ArrowUpRight className="h-3.5 w-3.5" />
            查看门户
          </LinkButton>
          <LinkButton to="/admin/articles" variant="primary">
            <FileText className="h-3.5 w-3.5" />
            新建文章
          </LinkButton>
        </>
      }
    >
      {/* ------------------------------ 快捷操作 ------------------------------ */}
      <Glass tone="soft" className="flex flex-wrap items-center gap-2.5 p-3.5" data-reveal>
        <Chip tone="primary" className="mr-1 !px-3">
          <Sparkles className="h-3 w-3" />
          快捷操作
        </Chip>
        <LinkButton to="/admin/articles" variant="glass" size="sm">
          <FileText className="h-3.5 w-3.5" />
          新建文章
        </LinkButton>
        <LinkButton to="/admin/activities" variant="glass" size="sm">
          <CalendarPlus className="h-3.5 w-3.5" />
          发布活动
        </LinkButton>
        <LinkButton to="/admin/applications" variant="glass" size="sm">
          <ClipboardList className="h-3.5 w-3.5" />
          审核申报
        </LinkButton>
        <LinkButton to="/admin/gallery" variant="glass" size="sm">
          <ImageIcon className="h-3.5 w-3.5" />
          上传图片
        </LinkButton>
        <span className="ml-auto hidden text-[11px] text-muted-foreground sm:block">
          待办 <span className="mono text-[hsl(var(--warning))]">{fnum((data?.applicationsPending ?? 0) + (data?.joinPending ?? 0) + (data?.feedbackOpen ?? 0))}</span> 项
        </span>
      </Glass>

      {error ? (
        <Glass tone="soft">
          <ErrorState message={error} onRetry={reload} />
        </Glass>
      ) : loading && !data ? (
        <DashboardSkeleton />
      ) : !data ? (
        <Glass tone="soft">
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" />}
            title="暂无统计数据"
            description="门户还没有产生可统计的业务数据。"
            action={<Button onClick={reload}>重新加载</Button>}
          />
        </Glass>
      ) : (
        <>
          {/* ------------------------------ 统计卡片 ------------------------------ */}
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4" data-reveal>
            <StatTile
              label="文章总数"
              value={fnum(data.articles)}
              hint={`已发布 ${data.publishedArticles} · 待审 ${data.pendingArticles}`}
              tone="primary"
              icon={<FileText className="h-4 w-4" />}
              onClick={() => navigate('/admin/articles')}
            />
            <StatTile
              label="活动数"
              value={fnum(data.activities)}
              hint={`报名 ${fnum(data.signups)} 人 · 签到 ${fnum(data.checkedIn)}`}
              tone="accent"
              icon={<Activity className="h-4 w-4" />}
              onClick={() => navigate('/admin/activities')}
            />
            <StatTile
              label="项目数"
              value={fnum(data.projects)}
              hint={`竞赛 ${data.competitions} · 资源 ${data.resources}`}
              tone="primary"
              icon={<Layers className="h-4 w-4" />}
              onClick={() => navigate('/admin/projects')}
            />
            <StatTile
              label="报名总数"
              value={fnum(data.signups)}
              hint={`已签到 ${fnum(data.checkedIn)} 人`}
              tone="success"
              icon={<UserCheck className="h-4 w-4" />}
              onClick={() => navigate('/admin/signups')}
            />
            <StatTile
              label="申报数"
              value={fnum(data.applications)}
              hint={`已通过 ${(data.applyStatus ?? []).find((s: any) => s.key === 'approved')?.value ?? 0} 项`}
              tone="accent"
              icon={<ClipboardList className="h-4 w-4" />}
              onClick={() => navigate('/admin/applications')}
            />
            <StatTile
              label="待审核数"
              value={fnum((data.applicationsPending ?? 0) + (data.joinPending ?? 0))}
              hint={`项目申报 ${data.applicationsPending} · 招新 ${data.joinPending}`}
              tone="warning"
              icon={<ShieldCheck className="h-4 w-4" />}
              onClick={() => navigate('/admin/applications')}
            />
            <StatTile
              label="留言待处理数"
              value={fnum(data.feedbackOpen)}
              hint={`留言合计 ${data.feedback} 条`}
              tone="warning"
              icon={<MessageSquare className="h-4 w-4" />}
              onClick={() => navigate('/admin/feedback')}
            />
            <StatTile
              label="用户数"
              value={fnum(data.users)}
              hint={`部门成员 ${data.members} · 累计浏览 ${fnum(data.totalViews)}`}
              tone="primary"
              icon={<Users className="h-4 w-4" />}
              onClick={() => navigate('/admin/users')}
            />
          </div>

          {/* ------------------------------ 趋势 ------------------------------ */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3" data-reveal>
            <Panel
              className="xl:col-span-2"
              icon={<TrendingUp className="h-4 w-4" />}
              title="近 14 天趋势"
              subtitle="浏览量取自文章与项目累计访问，报名 / 申报按提交日期统计"
              action={
                <div className="flex items-center gap-4 text-right">
                  <span className="hidden sm:block">
                    <span className="mono block text-sm text-primary">{fnum(sum.views)}</span>
                    <span className="text-[10.5px] text-muted-foreground">14 天浏览</span>
                  </span>
                  <span>
                    <span className="mono block text-sm text-[hsl(var(--success))]">{fnum(sum.signups)}</span>
                    <span className="text-[10.5px] text-muted-foreground">14 天报名</span>
                  </span>
                </div>
              }
            >
              {trend.length ? (
                <>
                  <TrendChart trend={trend} />
                  <div className="mt-6 grid grid-cols-1 gap-5 border-t border-white/8 pt-5 sm:grid-cols-2">
                    <div>
                      <p className="mb-3 text-[11px] text-muted-foreground">每日报名（人）</p>
                      <MiniBars data={trend.map((t) => t.signups)} labels={trend.map((t) => t.date)} height={96} tone="primary" />
                    </div>
                    <div>
                      <p className="mb-3 text-[11px] text-muted-foreground">每日申报（项）</p>
                      <MiniBars data={trend.map((t) => t.applications)} labels={trend.map((t) => t.date)} height={96} tone="accent" />
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState icon={<TrendingUp className="h-5 w-5" />} title="暂无趋势数据" description="近 14 天没有产生访问与提交记录。" />
              )}
            </Panel>

            <Panel
              icon={<Eye className="h-4 w-4" />}
              title="内容资产"
              subtitle="画廊、资源与浏览规模"
              action={<Chip tone="primary">累计 {fnum(data.totalViews)}</Chip>}
            >
              <div className="flex flex-col gap-5">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11.5px] text-muted-foreground">
                    <span>浏览量走势（近 14 天）</span>
                    <span className="mono">{fnum(sum.views)}</span>
                  </div>
                  <Sparkline data={trend.map((t) => t.views)} tone="hsl(var(--primary))" className="h-12" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3.5">
                    <p className="text-[11px] text-muted-foreground">画廊图片</p>
                    <p className="mono mt-1 text-lg font-semibold text-primary">{fnum(data.galleryImages)}</p>
                    <p className="mt-0.5 text-[10.5px] text-muted-foreground">{data.galleryAreas} 个区域</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3.5">
                    <p className="text-[11px] text-muted-foreground">资源文件</p>
                    <p className="mono mt-1 text-lg font-semibold text-accent">{fnum(data.resources)}</p>
                    <p className="mt-0.5 text-[10.5px] text-muted-foreground">竞赛 {data.competitions} 项</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3.5">
                  <p className="mb-2.5 text-[11px] text-muted-foreground">招新与留言</p>
                  <BarList
                    items={[
                      { name: '招新报名', value: data.joinApplications },
                      { name: '待审招新', value: data.joinPending },
                      { name: '留言反馈', value: data.feedback },
                      { name: '待处理留言', value: data.feedbackOpen },
                    ]}
                  />
                </div>
              </div>
            </Panel>
          </div>

          {/* ------------------------------ 分布 ------------------------------ */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" data-reveal>
            <Panel title="新闻分类分布" subtitle="按文章分类统计" icon={<FileText className="h-4 w-4" />}>
              {(data.newsByCat ?? []).length ? (
                <Donut items={data.newsByCat} centerLabel="新闻分类分布" />
              ) : (
                <EmptyState icon={<FileText className="h-5 w-5" />} title="暂无文章" />
              )}
            </Panel>
            <Panel title="项目分类分布" subtitle="按项目展示库分类统计" icon={<Layers className="h-4 w-4" />}>
              {(data.projByCat ?? []).length ? (
                <Donut items={data.projByCat} centerLabel="项目分类分布" />
              ) : (
                <EmptyState icon={<Layers className="h-5 w-5" />} title="暂无项目" />
              )}
            </Panel>
            <Panel title="申报状态分布" subtitle="项目申报审核进度" icon={<ClipboardList className="h-4 w-4" />}>
              {(data.applyStatus ?? []).length ? (
                <Donut items={data.applyStatus} centerLabel="申报状态分布" />
              ) : (
                <EmptyState icon={<ClipboardList className="h-5 w-5" />} title="暂无申报" />
              )}
            </Panel>
          </div>

          {/* ------------------------------ 报名排行 ------------------------------ */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" data-reveal>
            <Panel
              className="lg:col-span-1"
              title="报名最多的活动"
              subtitle="Top 6 活动报名人数"
              icon={<UserCheck className="h-4 w-4" />}
              action={<Link to="/admin/signups" className="text-[11px] text-primary transition hover:text-primary/80">查看名单 →</Link>}
            >
              {(data.signupByAct ?? []).length ? (
                <BarList items={data.signupByAct} />
              ) : (
                <EmptyState icon={<UserCheck className="h-5 w-5" />} title="暂无报名记录" />
              )}
            </Panel>

            <Panel
              className="lg:col-span-2"
              title="热门文章 Top 8"
              subtitle="按门户浏览量排序，点击标题可打开门户文章页"
              icon={<Eye className="h-4 w-4" />}
              action={<Link to="/admin/articles" className="text-[11px] text-primary transition hover:text-primary/80">管理文章 →</Link>}
            >
              {(data.topArticles ?? []).length ? (
                <ol className="flex flex-col divide-y divide-white/8">
                  {data.topArticles.map((a: any, i: number) => {
                    const max = Math.max(1, ...data.topArticles.map((x: any) => x.views || 0));
                    return (
                      <li key={a.slug ?? i} className="flex items-center gap-3.5 py-2.5 first:pt-0 last:pb-0">
                        <span
                          className={cn(
                            'mono flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold',
                            i < 3 ? 'bg-primary/15 text-primary' : 'bg-white/6 text-muted-foreground'
                          )}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/news/${a.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="clamp-1 block text-[13px] text-foreground/85 transition hover:text-primary"
                          >
                            {a.title}
                          </Link>
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/8">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary/35"
                              style={{ width: `${((a.views || 0) / max) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="mono shrink-0 text-xs tabular-nums text-muted-foreground">{fnum(a.views)}</span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <EmptyState icon={<Eye className="h-5 w-5" />} title="暂无已发布文章" />
              )}
            </Panel>
          </div>

          {/* ------------------------------ 最近操作日志 ------------------------------ */}
          <Panel
            title="最近操作日志"
            subtitle="后台最近 10 条操作记录，完整记录见「操作日志与备份」"
            icon={<ScrollText className="h-4 w-4" />}
            action={<Link to="/admin/logs" className="text-[11px] text-primary transition hover:text-primary/80">查看全部 →</Link>}
            reveal=""
          >
            {recentLogs.length ? (
              <ol className="relative flex flex-col gap-4 pl-1">
                {recentLogs.map((log: any, i: number) => (
                  <li key={log.id ?? i} className="relative flex gap-4">
                    <div className="relative flex w-4 shrink-0 flex-col items-center">
                      <span className="mt-1.5">
                        <Dot tone={i === 0 ? 'primary' : 'muted'} pulse={i === 0} />
                      </span>
                      {i !== recentLogs.length - 1 && <span className="mt-1 w-px flex-1 bg-white/10" />}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <p className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span className="font-medium text-foreground/90">{log.userName || '系统'}</span>
                        <span className="text-muted-foreground">{log.action}</span>
                        {log.target && <Chip className="!px-2 !py-0.5 !text-[10px]">{log.target}</Chip>}
                      </p>
                      {log.detail && <p className="clamp-1 mt-1 text-[11.5px] text-muted-foreground">{log.detail}</p>}
                      <p className="mono mt-1 text-[10.5px] text-muted-foreground/70">
                        {fromNow(log.createdAt)} · {fdatetime(log.createdAt)}
                        {log.ip ? ` · ${log.ip}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState icon={<ScrollText className="h-5 w-5" />} title="暂无操作记录" description="后台的任何写操作都会记录在这里。" />
            )}
          </Panel>
        </>
      )}
    </AdminPage>
  );
}

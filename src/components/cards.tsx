import React from 'react';
import { Link } from 'react-router';
import type { Project } from '../../shared/types';
import {
  Box,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Clock,
  Download,
  Eye,
  FileType2,
  ExternalLink,
  MapPin,
  Pin,
  Trophy,
  Users,
} from 'lucide-react';
import {
  APPLY_STATUS,
  NEWS_CATEGORIES,
  PROJECT_CATEGORIES,
  cn,
  daysLeft,
  fbytes,
  fdate,
  fdatetime,
  fnum,
} from '@/lib/utils';
import { Chip, Countdown, ProgressBar } from './ui';

const ProjectModelViewer = React.lazy(() => import('./ProjectModelViewer'));

/* =============================================================================
 * 内容卡片 —— 「刻面玻璃 / Etched Glass」
 * -----------------------------------------------------------------------------
 * 卡片外壳统一用 index.css 的 .card：5px 内衬 + 板中板，
 * 封面与内容板各自带圆角，外壳不裁剪任何子元素 —— 因此不会出现
 * 「图片被卡片圆角切出阶梯边」的锯齿。描边全部用 inset box-shadow。
 *
 * 结构约定（六种卡片共用）：
 *   .card  →  [.card-media]  →  .card-body  →  [.card-rule + 页脚行]
 * 颜色仍然只有三种角色：白（靠不透明度分层）/ 蓝 primary / 警示色。
 * ========================================================================== */

/* 分类标记一律走中性白，只有「通知公告」用蓝色做引导；
   彩色只留给真正的警示语义（置顶 / 即将截止 / 已满 / 驳回）。 */
const CAT_TONE: Record<string, 'primary' | 'default'> = {
  notice: 'primary',
  dept: 'default',
  competition: 'default',
  policy: 'default',
};

/** 无封面时的占位底纹：点阵 + 水印 */
function CoverFallback({ label = 'STI', icon }: { label?: string; icon?: React.ReactNode }) {
  return (
    <div className="absolute inset-0">
      <span aria-hidden className="card-ph" />
      <span className="absolute inset-0 flex items-center justify-center">
        {icon ?? (
          <span className="font-display text-2xl font-semibold tracking-[0.3em] text-white/10">{label}</span>
        )}
      </span>
    </div>
  );
}

/** 卡片页脚：一条左端亮的细线 + 一行元信息 */
function CardFoot({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mt-4', className)}>
      <span aria-hidden className="card-rule block" />
      <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

/* =============================================================================
 * 文章卡片
 * ========================================================================== */
export function ArticleCard({
  article,
  featured = false,
  compact = false,
  className,
}: {
  article: any;
  featured?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const catTone = CAT_TONE[article.category] ?? 'default';
  const catText = NEWS_CATEGORIES[article.category] ?? article.category;

  /* ---------- 紧凑列表行：不是卡片，左侧一条会点亮的竖线 ---------- */
  if (compact)
    return (
      <Link to={`/news/${article.slug}`} className={cn('group block', className)}>
        <div className="relative flex items-start gap-4 rounded-xl py-2.5 pl-4 pr-3 transition-colors duration-300 hover:bg-white/[0.04]">
          <span
            aria-hidden
            className="absolute bottom-2.5 left-0 top-2.5 w-px bg-white/10 transition-colors duration-300 group-hover:bg-primary/70"
          />
          <span className="mono mt-0.5 w-12 shrink-0 text-xs text-muted-foreground">
            {fdate(article.publishedAt).slice(5)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="clamp-2 text-base font-medium leading-snug text-foreground/90 transition-colors duration-300 group-hover:text-primary">
              {article.pinned ? <Pin className="mr-1.5 inline h-3 w-3 -rotate-45 text-[hsl(var(--warning))]" /> : null}
              {article.title}
            </p>
            <div className="mt-1.5 flex items-center gap-2.5">
              <Chip tone={catTone} className="!px-2 !py-0">
                {catText}
              </Chip>
              {article.views !== undefined && (
                <span className="mono flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="h-2.5 w-2.5" />
                  {fnum(article.views)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );

  /* ---------- 头条卡：封面在上 ---------- */
  if (featured)
    return (
      <Link to={`/news/${article.slug}`} className={cn('group block h-full', className)}>
        <div className="card h-full">
          <div className="card-media aspect-[16/9]">
            {article.cover ? (
              <img src={article.cover} alt="" loading="lazy" />
            ) : (
              <CoverFallback />
            )}
            <span aria-hidden className="card-scrim" />
            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              <Chip tone={catTone} className="!bg-black/45 !py-0.5 backdrop-blur-md">
                {catText}
              </Chip>
              {article.pinned ? (
                <Chip tone="warning" className="!bg-black/45 !py-0.5 backdrop-blur-md">
                  <Pin className="h-3 w-3 -rotate-45" /> 置顶
                </Chip>
              ) : null}
            </div>
            {/* card-cap：压在封面上的说明文字，有图时恒为白色，不随主题翻转 */}
            <span className="card-cap mono absolute bottom-3 left-3.5 text-sm tracking-wide">
              {fdate(article.publishedAt)}
            </span>
          </div>

          <div className="card-body sm:px-6 sm:pb-5 sm:pt-5">
            <h3 className="clamp-2 text-[17px] font-semibold leading-snug transition-colors duration-300 group-hover:text-primary">
              {article.title}
            </h3>
            <p className="clamp-3 mt-2.5 flex-1 text-base leading-relaxed text-muted-foreground">
              {article.summary}
            </p>
            <CardFoot>
              <span className="mono flex items-center gap-1.5">
                <Eye className="h-3 w-3" />
                {fnum(article.views)}
              </span>
              <span className="flex items-center gap-1.5 font-medium text-foreground/60 transition-colors duration-300 group-hover:text-primary">
                阅读全文
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </CardFoot>
          </div>
        </div>
      </Link>
    );

  /* ---------- 标准卡：纯文字 ---------- */
  return (
    <Link to={`/news/${article.slug}`} className={cn('group block h-full', className)}>
      <div className="card h-full">
        <div className="card-body">
          <div className="flex items-center gap-2.5">
            <Chip tone={catTone} className="!px-2.5 !py-0.5">
              {catText}
            </Chip>
            {article.pinned ? <Pin className="h-3.5 w-3.5 -rotate-45 text-[hsl(var(--warning))]" /> : null}
            <span className="mono ml-auto text-sm text-muted-foreground">{fdate(article.publishedAt)}</span>
          </div>
          <h3 className="clamp-2 mt-3.5 text-[15px] font-semibold leading-snug transition-colors duration-300 group-hover:text-primary">
            {article.title}
          </h3>
          <p className="clamp-2 mt-2.5 flex-1 text-sm leading-relaxed text-muted-foreground">{article.summary}</p>
          <CardFoot>
            <span className="mono flex items-center gap-1.5">
              <Eye className="h-3 w-3" />
              {fnum(article.views)}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-70" />
          </CardFoot>
        </div>
      </div>
    </Link>
  );
}

/* =============================================================================
 * 活动卡片
 * ========================================================================== */
export function ActivityCard({ activity, className }: { activity: any; className?: string }) {
  const signed = activity.signedCount ?? 0;
  const capacity = activity.capacity ?? 0;
  const full = capacity > 0 && signed >= capacity;
  const d = daysLeft(activity.startAt);
  const past = d !== null && d < 0;
  const day = fdate(activity.startAt);

  return (
    <Link to={`/activities/${activity.slug}`} className={cn('group block h-full', className)}>
      <div className="card h-full">
        <div className="card-body">
          <div className="flex items-start gap-4">
            {/* 日期砖 */}
            <div className="card-tile flex w-[54px] shrink-0 flex-col items-center py-2.5">
              <span className="mono text-xs uppercase text-muted-foreground">{day.slice(5, 7)}月</span>
              <span className="mono text-xl font-semibold leading-tight text-foreground">{day.slice(8, 10)}</span>
              <span className="mono text-xs text-muted-foreground">{day.slice(0, 4)}</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Chip className="!px-2.5 !py-0.5">{activity.category}</Chip>
                {past ? (
                  <Chip className="!px-2.5 !py-0.5">已结束</Chip>
                ) : full ? (
                  <Chip tone="danger" className="!px-2.5 !py-0.5">
                    名额已满
                  </Chip>
                ) : (
                  <Chip tone="primary" className="!px-2.5 !py-0.5">
                    报名中
                  </Chip>
                )}
              </div>
              <h3 className="clamp-2 mt-2.5 text-[15px] font-semibold leading-snug transition-colors duration-300 group-hover:text-primary">
                {activity.title}
              </h3>
              <p className="clamp-2 mt-2 text-sm leading-relaxed text-muted-foreground">{activity.summary}</p>
            </div>
          </div>

          <CardFoot className="mt-auto pt-1">
            <span className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span className="mono">{fdatetime(activity.startAt).slice(5)}</span>
              </span>
              {activity.location && (
                <span className="clamp-1 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {activity.location}
                </span>
              )}
            </span>
          </CardFoot>

          {capacity > 0 && (
            <div className="mt-3.5">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  已报名 <span className="mono text-foreground">{signed}</span> / {capacity}
                </span>
                {!past && !full && activity.signupEnd && (
                  <span className="mono text-[hsl(var(--warning))]">
                    <Countdown target={activity.signupEnd} />
                  </span>
                )}
              </div>
              <ProgressBar value={signed} max={capacity} tone={full ? 'danger' : 'primary'} height={3} />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/* =============================================================================
 * 项目卡片
 * ========================================================================== */
export function projectDemoUrl(project: { category?: string; demoUrl?: string | null }): string | null {
  if (project.category !== 'frontend' && project.category !== 'service' || !project.demoUrl) return null;
  try {
    const url = new URL(project.demoUrl);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export function ProjectCard({
  project,
  size = 'md',
  className,
}: {
  project: Project;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const cat = PROJECT_CATEGORIES[project.category] ?? project.category;
  const demoUrl = projectDemoUrl(project);
  const modelUrl = project.modelUrl?.startsWith('/models/') && project.modelUrl.endsWith('.obj') ? project.modelUrl : null;
  const featured = size === 'lg';
  const media = (
    <div className={cn('card-media aspect-[16/10] shrink-0', featured && 'md:aspect-auto md:min-h-[260px] md:w-[46%]')}>
      {project.cover ? (
        <img src={project.cover} alt="" loading="lazy" />
      ) : (
        <CoverFallback
          label={modelUrl ? '3D' : project.category === 'frontend' ? 'WEB' : project.category === 'service' ? 'TOOLS' : project.category === 'competition' ? 'AWARD' : 'STI'}
          icon={modelUrl ? <Box className="h-12 w-12 text-white/20" /> : project.category === 'competition' ? <Trophy className="h-12 w-12 text-white/15" /> : undefined}
        />
      )}
      <span className="absolute left-3 top-3 z-10 rounded-full border border-white/20 bg-black/45 px-3 py-1 text-[10px] font-medium tracking-[0.12em] text-white backdrop-blur-md">
        {cat}
      </span>
      <span className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md transition-colors group-hover:border-primary/60 group-hover:bg-primary/30">
        {demoUrl ? <ArrowUpRight className="h-4 w-4" /> : modelUrl ? <Box className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
      </span>
      <span aria-hidden className="card-scrim" />
      <span className="card-cap mono absolute bottom-3 left-3 text-[11px] tracking-[0.16em]">{project.year} / {modelUrl ? '3D OBJECT' : project.category === 'frontend' ? 'DIGITAL' : project.category === 'service' ? 'SERVICE' : 'INNOVATION'}</span>
    </div>
  );
  const card = (
    <div className={cn('card h-full', featured && 'md:flex-row')}>
      {media}
      <div className={cn('card-body', featured && 'md:p-7')}>
        <div className="flex items-center gap-2 text-[11px] tracking-[0.12em] text-muted-foreground">
          <span className="h-px w-5 bg-primary/70" />
          {modelUrl ? '实体设计 · 3D' : project.category === 'frontend' ? '前端作品' : project.category === 'service' ? '工具服务' : project.category === 'competition' ? '竞赛成果' : '项目档案'}
        </div>
        <h3 className={cn('clamp-2 mt-3 font-semibold leading-snug transition-colors duration-300 group-hover:text-primary', featured ? 'text-xl' : size === 'sm' ? 'text-[15px]' : 'text-[17px]')}>
          {project.title}
        </h3>
        <p className={cn('mt-2 flex-1 leading-relaxed text-muted-foreground', featured ? 'clamp-3 text-sm md:text-base' : 'clamp-2 text-[13px]')}>
          {project.summary}
        </p>
        <CardFoot className="mt-4">
          <span className="clamp-1 min-w-0">{project.awards || project.team || cat}</span>
          <span className="flex shrink-0 items-center gap-1 text-primary">
            {modelUrl ? <><Box className="h-3.5 w-3.5" /> 查看 3D</> : demoUrl ? <><ExternalLink className="h-3.5 w-3.5" /> 访问项目</> : <>查看详情 <ArrowRight className="h-3.5 w-3.5" /></>}
          </span>
        </CardFoot>
      </div>
    </div>
  );

  if (modelUrl) return (
    <>
      <button type="button" onClick={() => setViewerOpen(true)} aria-label={`查看${project.title}三维模型`} className={cn('group block h-full w-full text-left', className)}>{card}</button>
      {viewerOpen && <React.Suspense fallback={null}><ProjectModelViewer modelUrl={modelUrl} title={project.title} onClose={() => setViewerOpen(false)} /></React.Suspense>}
    </>
  );

  return demoUrl ? (
    <a href={demoUrl} target="_blank" rel="noopener noreferrer" aria-label={`访问作品：${project.title}（新窗口打开）`} className={cn('group block h-full', className)}>{card}</a>
  ) : (
    <Link to={`/projects/${project.slug}`} className={cn('group block h-full', className)}>{card}</Link>
  );
}

/* =============================================================================
 * 竞赛卡片（带倒计时与紧迫度刻度）
 * ========================================================================== */
export function CompetitionCard({ competition, className }: { competition: any; className?: string }) {
  const dl = competition.signupDeadline;
  const d = daysLeft(dl);
  const urgent = d !== null && d >= 0 && d <= 7;
  const expired = d !== null && d < 0;
  /* 紧迫度刻度：以 30 天为满量程，越接近截止刻度越长 */
  const urgency = d === null || expired ? 0 : Math.min(1, Math.max(0, (30 - d) / 30));

  return (
    <div className={cn('card h-full min-h-[172px]', className)}>
      <div className="card-body">
        <div className="flex items-start justify-between gap-3">
          <Chip tone={competition.level === '国家级' ? 'primary' : 'default'} className="!px-2.5 !py-0.5">
            {competition.level}
          </Chip>
          {expired ? (
            <Chip className="!px-2.5 !py-0.5">已截止</Chip>
          ) : urgent ? (
            <Chip tone="danger" className="!px-2.5 !py-0.5">
              即将截止
            </Chip>
          ) : null}
        </div>

        <h3 className="clamp-2 mt-3.5 text-[15px] font-semibold leading-snug">{competition.title}</h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="clamp-1">{competition.organizer}</span>
        </p>
        <p className="clamp-3 mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{competition.summary}</p>

        {/* 紧迫度刻度 —— 只在未截止时出现 */}
        {!expired && d !== null && (
          <div aria-hidden className="mt-4 h-[2px] overflow-hidden rounded-full bg-white/8">
            <span
              className={cn(
                'block h-full rounded-full transition-[width] duration-700',
                urgent ? 'bg-[hsl(var(--destructive))]' : 'bg-primary/70'
              )}
              style={{ width: `${Math.round(urgency * 100)}%` }}
            />
          </div>
        )}

        <CardFoot className={expired ? 'mt-4' : 'mt-3'}>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            截止 <span className="mono">{fdate(dl)}</span>
          </span>
          {!expired && <Countdown target={dl} className="text-sm" />}
        </CardFoot>

        {competition.link && (
          <a
            href={competition.link}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-all duration-300 hover:gap-2.5"
          >
            前往赛事官网 <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
 * 资源卡片
 * ========================================================================== */
export function ResourceCard({
  resource,
  onDownload,
  className,
}: {
  resource: any;
  onDownload?: (r: any) => void;
  className?: string;
}) {
  /* 文件类型不做颜色区分 —— 保持中性，避免色彩噪音 */
  return (
    <div className={cn('card group h-full min-h-[172px]', className)}>
      <div className="card-body">
        <div className="flex items-start gap-3.5">
          <span className="card-tile flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-300 group-hover:text-foreground/85">
            <FileType2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="clamp-2 text-[14.5px] font-semibold leading-snug">{resource.title}</h3>
            <p className="mono mt-1.5 text-[11px] text-muted-foreground">
              {resource.fileType} · {fbytes(resource.fileSize)}
            </p>
          </div>
        </div>
        <p className="clamp-2 mt-3.5 flex-1 text-[13px] leading-relaxed text-muted-foreground">
          {resource.description}
        </p>
        <CardFoot>
          <span className="mono flex items-center gap-1.5">
            <Download className="h-3 w-3" />
            {fnum(resource.downloads)}
          </span>
          <button type="button" onClick={() => onDownload?.(resource)} className="card-act">
            <Download className="h-3 w-3" />
            {resource.external ? '前往' : '下载'}
          </button>
        </CardFoot>
      </div>
    </div>
  );
}

/* =============================================================================
 * 申请状态徽章
 * ========================================================================== */
export function ApplyStatusChip({ status }: { status: string }) {
  const tone =
    status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : status === 'reviewing' ? 'primary' : 'warning';
  return (
    <Chip tone={tone as any} className="!px-2.5 !py-0.5">
      {APPLY_STATUS[status] ?? status}
    </Chip>
  );
}

/* =============================================================================
 * 时间线条目
 * ========================================================================== */
export function TimelineItem({ node, index, total }: { node: any; index: number; total: number }) {
  const last = index === total - 1;
  return (
    <div className="relative flex gap-5" data-reveal="left">
      <div className="relative flex w-16 shrink-0 flex-col items-center">
        <span className="mono text-sm font-semibold text-primary">{node.year}</span>
        <span className="mt-2 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background shadow-[0_0_14px_-1px_hsl(var(--primary)/.8)]" />
        {!last && <span className="mt-1 w-px flex-1 bg-gradient-to-b from-primary/45 to-transparent" />}
      </div>
      <div className={cn('min-w-0 flex-1', last ? 'pb-0' : 'pb-9')}>
        <h4 className="text-[15px] font-semibold">{node.title}</h4>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{node.description}</p>
      </div>
    </div>
  );
}

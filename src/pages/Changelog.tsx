import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  CalendarClock,
  GitBranch,
  History,
  Layers,
  PenLine,
  Rocket,
  Tag as TagIcon,
  User as UserIcon,
} from 'lucide-react';

import { PublicApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';
import { cn, fdatetime, fnum, fromNow } from '@/lib/utils';
import { useRevealScope } from '@/components/RevealScope';
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Glass,
  LinkButton,
  PageHero,
  Skeleton,
} from '@/components/ui';

/* =============================================================================
 * 更新日志 — /changelog
 * 左侧竖向时间轴 + 节点圆点，版本号按 versionColor 映射为语义色调 Chip
 * ========================================================================== */

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'default';

/** 版本颜色名 → 语义色调（不硬编码颜色，全部走 token） */
const VERSION_TONE: Record<string, Tone> = {
  emerald: 'success',
  blue: 'primary',
  violet: 'accent',
  amber: 'warning',
  cyan: 'primary',
  rose: 'danger',
};

/** 时间轴节点的圆点颜色（同样只用语义 token） */
const DOT_TONE: Record<string, string> = {
  primary: 'bg-primary shadow-[0_0_16px_-2px_hsl(var(--primary)/.85)]',
  accent: 'bg-accent shadow-[0_0_16px_-2px_hsl(var(--accent)/.85)]',
  success: 'bg-[hsl(var(--success))] shadow-[0_0_16px_-2px_hsl(var(--success)/.85)]',
  warning: 'bg-[hsl(var(--warning))] shadow-[0_0_16px_-2px_hsl(var(--warning)/.85)]',
  danger: 'bg-[hsl(var(--destructive))] shadow-[0_0_16px_-2px_hsl(var(--destructive)/.85)]',
  default: 'bg-white/40',
};

const isHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s || '');

export default function Changelog() {
  useTitle('更新日志');
  const revealRef = useRevealScope<HTMLDivElement>();
  const [sp, setSp] = useSearchParams();
  const filter = sp.get('color') ?? 'all';

  const { data, loading, error, reload } = useApi<any[]>(() => PublicApi.changelog(), []);
  const all: any[] = data ?? [];

  const colors = useMemo(() => {
    const seen: string[] = [];
    for (const it of all) {
      const c = String(it.versionColor || 'blue');
      if (!seen.includes(c)) seen.push(c);
    }
    return seen;
  }, [all]);

  const items = useMemo(
    () => (filter === 'all' ? all : all.filter((it) => String(it.versionColor || 'blue') === filter)),
    [all, filter]
  );

  return (
    <div ref={revealRef}>
      <PageHero
        eyebrow="Changelog"
        title="更新日志"
        description="门户的每一次迭代都记录在案：新增能力、体验优化与问题修复，按版本倒序排列。"
        breadcrumb={[{ label: '更新日志' }]}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[12.5px] text-muted-foreground">
          <span className="mono flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            共 {fnum(all.length)} 个版本
          </span>
          {all[0] && (
            <span className="flex items-center gap-1.5">
              <Rocket className="h-3.5 w-3.5 text-primary" />
              最新 <span className="mono text-foreground/90">{all[0].version}</span>
              <span className="text-muted-foreground/70">（{fromNow(all[0].createdAt)}）</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            时间精确到秒
          </span>
        </div>

        {/* 颜色筛选 */}
        {colors.length > 1 && (
          <div className="mt-7 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-muted-foreground">按版本类型</span>
            <button
              onClick={() => setSp((p) => {
                const n = new URLSearchParams(p);
                n.delete('color');
                return n;
              })}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] transition-all duration-300',
                filter === 'all'
                  ? 'border-primary/40 bg-primary/12 text-primary'
                  : 'border-white/11 bg-white/[0.045] text-muted-foreground hover:border-white/25 hover:text-foreground'
              )}
            >
              全部
              <span className="mono text-[10px] opacity-75">{all.length}</span>
            </button>
            {colors.map((c) => {
              const active = filter === c;
              const count = all.filter((it) => String(it.versionColor || 'blue') === c).length;
              return (
                <button
                  key={c}
                  onClick={() =>
                    setSp((p) => {
                      const n = new URLSearchParams(p);
                      if (active) n.delete('color');
                      else n.set('color', c);
                      return n;
                    })
                  }
                  className={cn('transition-all duration-300', !active && 'opacity-70 hover:opacity-100')}
                >
                  <Chip tone={VERSION_TONE[c] ?? 'default'} className={cn(active && 'ring-1 ring-white/25')}>
                    <TagIcon className="h-3 w-3" />
                    <span className="mono">{c}</span>
                    <span className="mono text-[10px] opacity-75">{count}</span>
                  </Chip>
                </button>
              );
            })}
          </div>
        )}
      </PageHero>

      <div className="shell pb-24">
        {error ? (
          <Glass tone="soft" className="p-4">
            <ErrorState message={error} onRetry={reload} />
          </Glass>
        ) : loading ? (
          <div className="relative pl-8 sm:pl-12">
            <span
              aria-hidden
              className="absolute bottom-6 left-[11px] top-2 w-px bg-gradient-to-b from-primary/40 via-white/10 to-transparent"
            />
            <div className="flex flex-col gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[168px]" />
              ))}
            </div>
          </div>
        ) : !items.length ? (
          <Glass tone="soft" className="p-4">
            <EmptyState
              icon={<GitBranch className="h-6 w-6" />}
              title={filter === 'all' ? '暂无版本记录' : '该类型下暂无版本记录'}
              description={
                filter === 'all'
                  ? '门户版本变更会在这里按时间倒序展示，包含版本号、更新内容与发布人。'
                  : '切换「全部」可查看所有版本的更新记录。'
              }
              action={
                filter === 'all' ? (
                  <LinkButton to="/feedback" variant="primary">
                    提交改进建议
                  </LinkButton>
                ) : (
                  <Button
                    onClick={() =>
                      setSp((p) => {
                        const n = new URLSearchParams(p);
                        n.delete('color');
                        return n;
                      })
                    }
                  >
                    查看全部版本
                  </Button>
                )
              }
            />
          </Glass>
        ) : (
          <div className="relative pl-8 sm:pl-12">
            {/* 竖向时间轴 */}
            <span
              aria-hidden
              className="absolute bottom-4 left-[11px] top-3 w-px bg-gradient-to-b from-primary/50 via-white/12 to-transparent"
            />

            <ol className="flex flex-col">
              {items.map((it, i) => {
                const tone = VERSION_TONE[String(it.versionColor || 'blue')] ?? 'default';
                return (
                  <li
                    key={it.id}
                    className={cn('relative', i === items.length - 1 ? 'pb-0' : 'pb-8 sm:pb-10')}
                    data-reveal="left"
                    style={{ transitionDelay: `${Math.min(i, 6) * 60}ms` }}
                  >
                    {/* 节点圆点 */}
                    <span
                      aria-hidden
                      className="absolute -left-8 top-5 flex h-6 w-6 items-center justify-center rounded-full border border-white/14 bg-background sm:-left-12"
                    >
                      {i === 0 && (
                        <span
                          className={cn('absolute h-2.5 w-2.5 rounded-full opacity-70', DOT_TONE[tone] ?? DOT_TONE.default)}
                          style={{ animation: 'sti-pulse 2.6s ease-out infinite' }}
                        />
                      )}
                      <span className={cn('relative h-2.5 w-2.5 rounded-full', DOT_TONE[tone] ?? DOT_TONE.default)} />
                    </span>

                    <Glass tone="soft" hover sheen className="p-5 sm:p-6">
                      {/* 头部 */}
                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
                        <Chip tone={tone} className="!px-3 !py-1">
                          <span className="mono text-[12px] font-semibold">{it.version}</span>
                        </Chip>
                        <h2 className="min-w-0 text-[16px] font-semibold leading-snug">{it.title}</h2>
                        {i === 0 && (
                          <Chip tone="primary" className="!px-2.5 !py-0.5 !text-[10px]">
                            最新
                          </Chip>
                        )}
                      </div>

                      {/* 元信息 */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-muted-foreground">
                        <span className="mono flex items-center gap-1.5">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {fdatetime(it.createdAt, true)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <UserIcon className="h-3.5 w-3.5" />
                          {it.author || '科技创新部'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <PenLine className="h-3.5 w-3.5" />
                          {fromNow(it.createdAt)}
                        </span>
                      </div>

                      {/* 内容 */}
                      <div className="mt-4 border-t border-white/8 pt-4">
                        {isHtml(it.content) ? (
                          <div
                            className="prose-glass !text-[13.5px]"
                            dangerouslySetInnerHTML={{ __html: it.content }}
                          />
                        ) : (
                          <p className="whitespace-pre-line text-[13.5px] leading-[1.9] text-foreground/80">
                            {it.content}
                          </p>
                        )}
                      </div>
                    </Glass>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

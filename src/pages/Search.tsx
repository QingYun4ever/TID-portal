import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams, Link } from 'react-router';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Compass,
  Download,
  FileText,
  Layers,
  Lightbulb,
  Search as SearchIcon,
  Sparkles,
  Trophy,
} from 'lucide-react';

import { PublicApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';
import { cn, fdate, fnum } from '@/lib/utils';
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
  Tabs,
} from '@/components/ui';

/* =============================================================================
 * 全站搜索 — /search
 * 结果按内容类型分组，关键词在标题 / 摘要中高亮（先转义再包裹 <mark>）
 * ========================================================================== */

const SCOPES = [
  { value: 'all', label: '全部' },
  { value: 'article', label: '新闻' },
  { value: 'activity', label: '活动' },
  { value: 'project', label: '项目' },
  { value: 'competition', label: '竞赛' },
  { value: 'resource', label: '资源' },
];

interface TypeMeta {
  label: string;
  icon: ReactNode;
  tone: 'default' | 'primary' | 'accent' | 'success' | 'warning';
  to: (item: any) => string;
}

const TYPE_META: Record<string, TypeMeta> = {
  article: { label: '新闻与通知', icon: <FileText className="h-4 w-4" />, tone: 'primary', to: (i) => `/news/${i.slug}` },
  activity: {
    label: '活动',
    icon: <CalendarDays className="h-4 w-4" />,
    tone: 'warning',
    to: (i) => `/activities/${i.slug}`,
  },
  project: { label: '创新项目', icon: <Layers className="h-4 w-4" />, tone: 'accent', to: (i) => `/projects/${i.slug}` },
  competition: { label: '竞赛信息', icon: <Trophy className="h-4 w-4" />, tone: 'success', to: () => '/competitions' },
  resource: { label: '资源中心', icon: <Download className="h-4 w-4" />, tone: 'default', to: () => '/resources' },
};

const HOT_WORDS = ['大创项目', '挑战杯', '电子设计竞赛', '创新工坊', '学分认定', '政策文件'];

/* ------------------------------ 关键词高亮 ------------------------------ */
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

function highlight(text: unknown, needle: string) {
  const raw = String(text ?? '');
  const key = needle.trim();
  if (!key) return escHtml(raw);
  const lower = raw.toLowerCase();
  const kLower = key.toLowerCase();
  let out = '';
  let i = 0;
  while (i < raw.length) {
    const idx = lower.indexOf(kLower, i);
    if (idx < 0) {
      out += escHtml(raw.slice(i));
      break;
    }
    out += escHtml(raw.slice(i, idx));
    out += `<mark class="rounded-sm bg-primary/22 px-0.5 text-foreground">${escHtml(
      raw.slice(idx, idx + kLower.length)
    )}</mark>`;
    i = idx + kLower.length;
  }
  return out;
}

export default function Search() {
  useTitle('全站搜索');

  const revealRef = useRevealScope<HTMLDivElement>();
  const [sp, setSp] = useSearchParams();
  const q = (sp.get('q') ?? '').trim();
  const scopeRaw = sp.get('scope') ?? 'all';
  const scope = SCOPES.some((s) => s.value === scopeRaw) ? scopeRaw : 'all';

  const [kw, setKw] = useState(q);
  useEffect(() => {
    setKw(q);
  }, [q]);

  const run = (value?: string) => {
    const v = (value ?? kw).trim();
    setSp(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v) next.set('q', v);
        else next.delete('q');
        return next;
      },
      { replace: false }
    );
  };

  const setScope = (value: string) =>
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      if (value === 'all') next.delete('scope');
      else next.set('scope', value);
      return next;
    });

  const { data, loading, error, reload } = useApi<any>(
    () => (q ? PublicApi.search(q, scope) : Promise.resolve({ groups: [], total: 0, query: '' })),
    [q, scope]
  );

  const groups: { type: string; label: string; items: any[] }[] = data?.groups ?? [];
  const total: number = data?.total ?? 0;

  const scopeLabel = useMemo(() => SCOPES.find((s) => s.value === scope)?.label ?? '全部', [scope]);

  return (
    <div ref={revealRef}>
      <PageHero
        eyebrow="Global Search"
        title="全站搜索"
        description="一次检索覆盖新闻通知、活动、创新项目、竞赛信息与资源中心，结果按内容类型分组呈现。"
        breadcrumb={[{ label: '全站搜索' }]}
      >
        <div className="max-w-3xl">
          {/* 大搜索框 */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run();
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={kw}
                onChange={(e) => setKw(e.target.value)}
                placeholder="输入关键词，例如「大创项目」「挑战杯」…"
                aria-label="搜索关键词"
                className="field h-[54px] pl-13 pr-4 text-[15px]"
              />
            </div>
            <Button type="submit" variant="primary" size="lg" disabled={!kw.trim() && !q}>
              <SearchIcon className="h-4 w-4" />
              搜索
            </Button>
          </form>

          {/* 范围切换 */}
          <div className="mt-5 no-scrollbar -mx-1 overflow-x-auto px-1">
            <Tabs items={SCOPES} value={scope} onChange={setScope} size="sm" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] text-muted-foreground">
            <span className="mono">
              范围：{scopeLabel}
              {q && ` · 关键词「${q}」`}
            </span>
            <span>检索结果由门户数据库实时返回</span>
          </div>
        </div>
      </PageHero>

      <div className="shell pb-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
          {/* ============================ 结果列 ============================ */}
          <div className="min-w-0">
            {error ? (
              <Glass tone="soft" className="p-4">
                <ErrorState message={error} onRetry={reload} />
              </Glass>
            ) : !q ? (
              <Glass tone="soft" className="p-4">
                <EmptyState
                  icon={<Compass className="h-6 w-6" />}
                  title="输入关键词开始检索"
                  description="支持检索标题、摘要与正文内容。也可以直接从下面的热门搜索开始。"
                  action={
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {HOT_WORDS.map((w) => (
                        <button
                          key={w}
                          onClick={() => {
                            setKw(w);
                            run(w);
                          }}
                          className="rounded-full border border-white/10 bg-white/[0.045] px-3.5 py-1.5 text-[11.5px] text-muted-foreground transition-all duration-300 hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  }
                />
              </Glass>
            ) : loading ? (
              <div className="flex flex-col gap-5">
                <Skeleton className="h-6 w-56 rounded-full" />
                {Array.from({ length: 2 }).map((_, i) => (
                  <Glass key={i} tone="soft" className="p-5">
                    <Skeleton className="h-5 w-32 rounded-full" />
                    <div className="mt-4 flex flex-col gap-3">
                      {Array.from({ length: 3 }).map((__, j) => (
                        <Skeleton key={j} className="h-16" />
                      ))}
                    </div>
                  </Glass>
                ))}
              </div>
            ) : !groups.length ? (
              <Glass tone="soft" className="p-4">
                <EmptyState
                  icon={<SearchIcon className="h-6 w-6" />}
                  title={`没有找到与「${q}」相关的内容`}
                  description="试试更短的关键词、切换检索范围，或从下面的热门搜索中挑选。"
                  action={
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {HOT_WORDS.map((w) => (
                        <button
                          key={w}
                          onClick={() => {
                            setKw(w);
                            run(w);
                          }}
                          className="rounded-full border border-white/10 bg-white/[0.045] px-3.5 py-1.5 text-[11.5px] text-muted-foreground transition-all duration-300 hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  }
                />
              </Glass>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-muted-foreground" data-reveal>
                  <span className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="mono">找到 {fnum(total)} 条结果</span>
                  </span>
                  <span>
                    关键词「<span className="text-foreground/90">{q}</span>」· 范围 {scopeLabel} · {groups.length} 个分组
                  </span>
                </div>

                {groups.map((g, gi) => {
                  const meta = TYPE_META[g.type] ?? {
                    label: g.label,
                    icon: <FileText className="h-4 w-4" />,
                    tone: 'default' as const,
                    to: () => '/search',
                  };
                  return (
                    <Glass
                      key={g.type}
                      tone="soft"
                      className="overflow-hidden"
                      data-reveal
                      style={{ transitionDelay: `${gi * 60}ms` }}
                    >
                      {/* 分组标题 */}
                      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.055] text-primary">
                          {meta.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold">{meta.label}</p>
                          <p className="mono text-[10.5px] text-muted-foreground">{g.type}</p>
                        </div>
                        <Chip tone={meta.tone} className="ml-auto">
                          {g.items.length} 条
                        </Chip>
                      </div>

                      {/* 分组条目 */}
                      <div className="divide-y divide-white/6">
                        {g.items.map((it) => (
                          <Link
                            key={`${g.type}-${it.id}`}
                            to={meta.to(it)}
                            className="group flex items-start gap-4 px-5 py-4 transition-colors duration-300 hover:bg-white/[0.04]"
                          >
                            <span className="min-w-0 flex-1">
                              <span
                                className="clamp-2 block text-[14.5px] font-medium leading-snug text-foreground/90 transition-colors group-hover:text-primary"
                                dangerouslySetInnerHTML={{ __html: highlight(it.title, q) }}
                              />
                              {it.summary && (
                                <span
                                  className="clamp-2 mt-2 block text-[12.5px] leading-relaxed text-muted-foreground"
                                  dangerouslySetInnerHTML={{ __html: highlight(it.summary, q) }}
                                />
                              )}
                              <span className="mt-2.5 flex flex-wrap items-center gap-2.5 text-[11px] text-muted-foreground">
                                {it.category && (
                                  <Chip className="!px-2.5 !py-0 !text-[10px]">{String(it.category)}</Chip>
                                )}
                                {it.date && <span className="mono">{fdate(it.date)}</span>}
                              </span>
                            </span>
                            <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-80" />
                          </Link>
                        ))}
                      </div>
                    </Glass>
                  );
                })}
              </div>
            )}
          </div>

          {/* ============================ 侧列 ============================ */}
          <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
            <Glass tone="soft" className="p-5" data-reveal="right">
              <div className="flex items-center gap-2.5">
                <Lightbulb className="h-4 w-4 text-[hsl(var(--warning))]" />
                <h3 className="text-[14px] font-semibold">搜索技巧</h3>
              </div>
              <ul className="mt-4 flex flex-col gap-2.5 text-[12px] leading-relaxed text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" />
                  关键词越短，命中越多；「竞赛」比「全国大学生电子设计竞赛」更容易找到结果。
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" />
                  查询会写入 URL（<span className="mono">/search?q=</span>），可直接分享或收藏。
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" />
                  每个类型最多返回 6 条，点击分组标题可进入该栏目查看全部。
                </li>
              </ul>
            </Glass>

            <Glass tone="soft" className="p-5" data-reveal="right">
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="text-[14px] font-semibold">按栏目浏览</h3>
              </div>
              <div className="mt-4 flex flex-col gap-1">
                {[
                  { label: '新闻与通知', to: '/news' },
                  { label: '活动与报名', to: '/activities' },
                  { label: '创新项目库', to: '/projects' },
                  { label: '竞赛信息', to: '/competitions' },
                  { label: '资源中心', to: '/resources' },
                ].map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] text-muted-foreground transition-colors duration-300 hover:bg-white/[0.05] hover:text-foreground"
                  >
                    {l.label}
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                  </Link>
                ))}
              </div>
            </Glass>

            <Glass tone="soft" className="p-5" data-reveal="right">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-accent" />
                <h3 className="text-[14px] font-semibold">热门搜索</h3>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {HOT_WORDS.map((w) => (
                  <button
                    key={w}
                    onClick={() => {
                      setKw(w);
                      run(w);
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] transition-all duration-300',
                      w === q
                        ? 'border-accent/45 bg-accent/14 text-accent'
                        : 'border-white/11 bg-white/[0.045] text-muted-foreground hover:border-white/25 hover:text-foreground'
                    )}
                  >
                    {w}
                  </button>
                ))}
              </div>
              <LinkButton to="/news" variant="glass" size="sm" className="mt-5 w-full">
                浏览全部内容
              </LinkButton>
            </Glass>
          </aside>
        </div>
      </div>
    </div>
  );
}

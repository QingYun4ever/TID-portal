import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  ArrowRight,
  Award,
  Compass,
  FileText,
  Layers,
  ListChecks,
  SearchX,
  Sparkles,
  Trophy,
} from 'lucide-react';

import { PublicApi } from '@/lib/api';
import { useApi, useDebounced, useRevealScan, useTitle } from '@/lib/hooks';
import { PROJECT_CATEGORIES, cn, fnum } from '@/lib/utils';
import { ProjectCard } from '@/components/cards';
import { GlowOrb } from '@/components/LiquidBackdrop';
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
  Select,
  Skeleton,
  Tabs,
} from '@/components/ui';

/* =============================================================================
 * 创新项目展示库（/projects）
 *  - 顶部引导条：竞赛信息 + 项目在线申报
 *  - Tabs（全部 / 优秀 / 立项 / 结项 / 在研，带 meta.counts 数量）
 *  - 年份筛选（meta.years）+ 搜索 + 分页
 *  - 第一个「优秀项目」用 ProjectCard size="lg" 突出展示，其余网格排布
 * ========================================================================== */

const PAGE_SIZE = 7;

const CATEGORY_ORDER = ['excellent', 'approved', 'completed', 'ongoing'] as const;

export default function Projects() {
  useTitle('创新项目');
  const [sp] = useSearchParams();

  const [category, setCategory] = useState(() => {
    const c = sp.get('category');
    return c && (CATEGORY_ORDER as readonly string[]).includes(c) ? c : 'all';
  });
  const [year, setYear] = useState(() => sp.get('year') || 'all');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 380);

  const { data, meta, loading, error, reload } = useApi<any>(
    () => PublicApi.projects({ page, pageSize: PAGE_SIZE, category, q: dq, year }),
    [page, category, year, dq]
  );

  const items: any[] = useMemo(() => data?.items ?? [], [data]);
  const total = Number(data?.total ?? 0);
  const counts: Record<string, number> = meta?.counts ?? {};
  const years: number[] = meta?.years ?? [];

  useEffect(() => {
    setPage(1);
  }, [category, year, dq]);

  /* 列表数据变化后重新扫描滚动揭示元素（卡片异步挂载） */
  useRevealScan(`projects|${loading}|${items.length}|${page}|${category}|${year}|${dq}`);

  const sum = useMemo(() => Object.values(counts).reduce((a, b) => a + Number(b || 0), 0), [counts]);

  const tabs = useMemo(
    () => [
      { value: 'all', label: '全部项目', count: sum || undefined },
      ...CATEGORY_ORDER.map((c) => ({
        value: c as string,
        label: PROJECT_CATEGORIES[c] ?? c,
        count: counts[c],
      })),
    ],
    [counts, sum]
  );

  /* 突出展示：优先第一个「优秀项目」，否则取当前页第一项 */
  const hero = useMemo(() => items.find((p) => p.category === 'excellent') ?? items[0], [items]);
  const rest = useMemo(() => items.filter((p) => p.id !== hero?.id), [items, hero]);

  return (
    <>
      <PageHero
        eyebrow="Innovation Showcase"
        title="创新项目展示库"
        description="覆盖优秀项目、立项项目、结项项目与在研项目，展示技术路线、团队构成与获奖成果，为申报提供可参考的范例。"
        breadcrumb={[{ label: '创新项目' }]}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <Chip tone="accent">
            <Layers className="h-3 w-3" />
            共收录 <span className="mono ml-1 text-foreground">{fnum(sum)}</span> 个项目
          </Chip>
          {CATEGORY_ORDER.map((c) => (
            <Chip key={c} tone={c === 'excellent' ? 'warning' : c === 'approved' ? 'primary' : c === 'completed' ? 'success' : 'default'}>
              {PROJECT_CATEGORIES[c]} {counts[c] ?? 0}
            </Chip>
          ))}
        </div>
      </PageHero>

      <section className="shell pb-24">
        {/* ======================= 创新竞赛与申报入口 ======================= */}
        <Glass tone="strong" className="relative overflow-hidden p-7 sm:p-9" data-reveal="scale">
          <GlowOrb className="-right-24 -top-28" size={460} color="rgba(255,255,255,.055)" />
          <GlowOrb className="-bottom-32 -left-24" size={420} color="rgba(186,230,253,.10)" />
          <div className="relative grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-center">
            <div>
              <div className="eyebrow mb-4">Competition &amp; Application</div>
              <h2 className="text-balance text-2xl font-semibold leading-snug tracking-tight sm:text-[1.7rem]">
                创新竞赛与申报入口
              </h2>
              <p className="mt-4 max-w-xl text-pretty text-[13.5px] leading-relaxed text-muted-foreground">
                竞赛信息聚合发布、截止日期倒计时与提醒订阅；大学生创新创业训练计划项目支持在线申报，
                进度可在用户中心实时查询。
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <LinkButton to="/competitions" variant="primary">
                  <Trophy className="h-4 w-4" />
                  浏览竞赛信息
                </LinkButton>
                <LinkButton to="/projects/apply" variant="glass">
                  <FileText className="h-4 w-4" />
                  开始项目申报
                </LinkButton>
              </div>
            </div>

            <Glass tone="thin" className="p-5">
              <p className="flex items-center gap-2.5 text-[13px] font-medium">
                <ListChecks className="h-4 w-4 text-primary" />
                申报流程
              </p>
              <div className="mt-4 flex flex-col">
                {[
                  { t: '在线填写申报书', d: '项目信息 · 团队信息 · 项目简介' },
                  { t: '部门初审', d: '5 个工作日内反馈受理结果' },
                  { t: '专家评审', d: '技术与可行性双重评审' },
                  { t: '结果公示与立项', d: '门户公示，用户中心可查进度' },
                ].map((s, i, arr) => (
                  <div key={s.t} className="relative flex gap-3.5">
                    <div className="flex flex-col items-center">
                      <span className="mono flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/12 text-[10.5px] font-semibold text-primary">
                        {i + 1}
                      </span>
                      {i < arr.length - 1 && <span className="my-1 w-px flex-1 bg-gradient-to-b from-primary/40 to-transparent" />}
                    </div>
                    <div className={cn('min-w-0 flex-1', i < arr.length - 1 ? 'pb-3.5' : '')}>
                      <p className="text-[12.5px] font-medium">{s.t}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Glass>
          </div>
        </Glass>

        {/* ============================ 筛选栏 ============================ */}
        <Glass tone="soft" className="mt-8 p-5" data-reveal>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <Tabs items={tabs} value={category} onChange={setCategory} size="sm" className="w-full xl:w-auto" />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full sm:w-[150px]"
                aria-label="按年份筛选"
              >
                <option value="all">全部年份</option>
                {years.map((y) => (
                  <option key={y} value={String(y)}>
                    {y} 年
                  </option>
                ))}
              </Select>
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder="搜索项目名称、团队或简介…"
                className="w-full sm:w-72"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/8 pt-4 text-[11.5px] text-muted-foreground">
            <span className="flex items-center gap-2">
              <Compass className="h-3.5 w-3.5" />
              当前条件命中 <span className="mono text-foreground">{fnum(total)}</span> 个项目
            </span>
            <span className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              优秀项目优先展示
            </span>
          </div>
        </Glass>

        {/* ============================== 列表 ============================== */}
        <div className="mt-8">
          {error ? (
            <Glass tone="soft" className="py-6">
              <ErrorState message={error} onRetry={reload} />
            </Glass>
          ) : loading && !items.length ? (
            <div className="flex flex-col gap-6">
              <Skeleton className="h-80" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-72" />
                ))}
              </div>
            </div>
          ) : items.length ? (
            <>
              {hero && (
                <div data-reveal>
                  <ProjectCard project={hero} size="lg" />
                </div>
              )}
              {rest.length > 0 && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((p, i) => (
                    <div key={p.id} data-reveal="scale" style={{ transitionDelay: `${(i % 3) * 70}ms` }}>
                      <ProjectCard project={p} />
                    </div>
                  ))}
                </div>
              )}
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onChange={(p) => {
                  setPage(p);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="mt-10"
              />
            </>
          ) : (
            <Glass tone="soft">
              <EmptyState
                icon={dq ? <SearchX className="h-6 w-6" /> : <Award className="h-6 w-6" />}
                title={dq ? '没有匹配的项目' : '该条件下暂无项目'}
                description={
                  dq
                    ? '试试更换关键词，或清除搜索条件浏览全部项目。'
                    : '可切换其他类别或年份查看；也欢迎直接申报新项目，成为第一批展示成果。'
                }
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    {(dq || category !== 'all' || year !== 'all') && (
                      <Button
                        onClick={() => {
                          setQ('');
                          setCategory('all');
                          setYear('all');
                        }}
                      >
                        清空筛选
                      </Button>
                    )}
                    <LinkButton to="/projects/apply" variant="primary">
                      项目在线申报 <ArrowRight className="h-4 w-4" />
                    </LinkButton>
                  </div>
                }
              />
            </Glass>
          )}
        </div>

        {/* ============================= 底部 CTA ============================= */}
        <Glass tone="soft" className="mt-12 flex flex-wrap items-center justify-between gap-4 p-6" data-reveal="blur">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] text-accent">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[14px] font-medium">有一个想法，想变成正式项目？</p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">大创项目在线申报现已开放，5 个工作日内反馈初审结果。</p>
            </div>
          </div>
          <LinkButton to="/projects/apply" variant="primary" size="lg">
            <FileText className="h-4 w-4" />
            立即申报
          </LinkButton>
        </Glass>
      </section>
    </>
  );
}

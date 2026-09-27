import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Award,
  Compass,
  Layers,
  SearchX,
  Sparkles,
} from 'lucide-react';

import { PublicApi } from '@/lib/api';
import { useApi, useDebounced, useRevealScan, useTitle } from '@/lib/hooks';
import { PROJECT_CATEGORIES, fnum } from '@/lib/utils';
import { ProjectCard } from '@/components/cards';
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Glass,
  PageHero,
  Pagination,
  SearchInput,
  Select,
  Skeleton,
  Tabs,
} from '@/components/ui';

/* =============================================================================
 * 创新项目展示库（/projects）
 *  - 仅展示项目成果，支持类别、年份与关键词筛选
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
        description="覆盖优秀项目、立项项目、结项项目与在研项目，展示技术路线、团队构成与获奖成果。"
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
                    : '可切换其他类别或年份查看全部项目。'
                }
                action={dq || category !== 'all' || year !== 'all' ? (
                  <Button
                    onClick={() => {
                      setQ('');
                      setCategory('all');
                      setYear('all');
                    }}
                  >
                    清空筛选
                  </Button>
                ) : undefined}
              />
            </Glass>
          )}
        </div>
      </section>
    </>
  );
}

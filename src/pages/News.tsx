import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Clock3,
  FileText,
  Flame,
  Hash,
  LayoutGrid,
  Pin,
  RotateCcw,
  Search,
  Tag as TagIcon,
  X,
} from 'lucide-react';

import { PublicApi } from '@/lib/api';
import { useApi, useDebounced, useTitle } from '@/lib/hooks';
import { NEWS_CATEGORIES, cn, fnum } from '@/lib/utils';
import { ArticleCard } from '@/components/cards';
import { useRevealScope } from '@/components/RevealScope';
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
 * 新闻与通知 — /news
 * 分类 / 关键词 / 标签 / 排序 全部由 URL query 驱动，可分享、可回退
 * ========================================================================== */

const PAGE_SIZE = 12;

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'latest', label: '最新发布' },
  { value: 'hot', label: '最多浏览' },
  { value: 'oldest', label: '最早发布' },
];

type SortKey = 'latest' | 'hot' | 'oldest';

const CAT_DOT: Record<string, string> = {
  notice: 'bg-[hsl(var(--warning))]',
  dept: 'bg-primary',
  competition: 'bg-accent',
  policy: 'bg-[hsl(var(--success))]',
};

export default function News() {
  useTitle('新闻与通知');

  const revealRef = useRevealScope<HTMLDivElement>();
  const [sp, setSp] = useSearchParams();

  /* ---------------------------- 从 URL 读取筛选条件 --------------------------- */
  const category = sp.get('category') ?? 'all';
  const q = sp.get('q') ?? '';
  const tag = sp.get('tag') ?? '';
  const sortRaw = sp.get('sort');
  const sort: SortKey = sortRaw === 'hot' || sortRaw === 'oldest' ? sortRaw : 'latest';
  const page = Math.max(1, Number(sp.get('page') || 1));

  const update = useCallback(
    (patch: Record<string, string | number | null>, replace = false) => {
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === undefined || v === '') next.delete(k);
            else next.set(k, String(v));
          }
          return next;
        },
        { replace }
      );
    },
    [setSp]
  );

  /* --------------------------------- 搜索框 --------------------------------- */
  const [kw, setKw] = useState(q);
  const debouncedKw = useDebounced(kw, 380);

  useEffect(() => {
    setKw(q);
  }, [q]);

  useEffect(() => {
    if (debouncedKw === q) return;
    update({ q: debouncedKw.trim(), page: null }, true);
  }, [debouncedKw, q, update]);

  /* ---------------------------------- 数据 ---------------------------------- */
  const { data, meta, loading, error, reload } = useApi<any>(
    () =>
      PublicApi.articles({
        page,
        pageSize: PAGE_SIZE,
        category: category === 'all' ? '' : category,
        q,
        tag,
        sort,
      }),
    [page, category, q, tag, sort]
  );

  const { data: tagData, loading: tagLoading } = useApi<any[]>(() => PublicApi.tags(), []);

  const items: any[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const counts: Record<string, number> = meta.counts ?? {};
  const tagCloud: { name: string; count: number }[] = (tagData ?? []).slice(0, 18);

  const tabItems = useMemo(
    () => [
      {
        value: 'all',
        label: '全部',
        count: Object.values(counts).reduce((s, n) => s + Number(n || 0), 0),
      },
      ...Object.entries(NEWS_CATEGORIES).map(([value, label]) => ({
        value,
        label,
        count: counts[value] ?? 0,
      })),
    ],
    [counts]
  );

  const pinnedItems = useMemo(() => items.filter((a) => a.pinned), [items]);
  const normalItems = useMemo(() => items.filter((a) => !a.pinned), [items]);

  const hasFilter = category !== 'all' || !!q || !!tag || sort !== 'latest';
  const reset = () => update({ category: null, q: null, tag: null, sort: null, page: null });

  return (
    <div ref={revealRef}>
      <PageHero
        eyebrow="News & Notices"
        title="新闻与通知"
        description="通知公告、部门新闻、竞赛信息与政策文件实时同步，重要通知置顶展示，支持按分类、标签与关键词检索。"
        breadcrumb={[{ label: '新闻与通知' }]}
      >
        <div className="max-w-2xl">
          <SearchInput
            value={kw}
            onChange={setKw}
            onEnter={() => update({ q: kw.trim(), page: null })}
            placeholder="检索标题、摘要与正文关键词…"
            className="[&_.field]:h-[52px] [&_.field]:text-[15px]"
          />
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] text-muted-foreground">
            <span className="mono flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              共 {fnum(total)} 篇
            </span>
            <span className="flex items-center gap-1.5">
              <Pin className="h-3 w-3 -rotate-45 text-[hsl(var(--warning))]" />
              置顶 {pinnedItems.length} 篇
            </span>
            <span>输入后在 URL 中同步 query，可直接分享当前筛选结果</span>
          </div>
        </div>
      </PageHero>

      <div className="shell pb-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_312px] lg:gap-10">
          {/* ============================ 主列 ============================ */}
          <div className="min-w-0">
            {/* 工具栏 */}
            <Glass tone="soft" className="p-4 sm:p-5" data-reveal>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.055] text-primary">
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[12.5px] text-muted-foreground">按分类筛选</span>
                  <span className="mono ml-auto text-[11px] text-muted-foreground">
                    第 {page} 页 / 共 {Math.max(1, Math.ceil(total / PAGE_SIZE))} 页
                  </span>
                </div>
                <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
                  <Tabs
                    items={tabItems}
                    value={category}
                    size="sm"
                    onChange={(v) => update({ category: v === 'all' ? null : v, page: null })}
                  />
                </div>

                <div className="hairline" />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2.5">
                    <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                    <Tabs
                      items={SORTS}
                      value={sort}
                      size="sm"
                      onChange={(v) => update({ sort: v === 'latest' ? null : v, page: null })}
                    />
                  </div>
                  {hasFilter && (
                    <Button variant="ghost" size="sm" onClick={reset}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      重置筛选
                    </Button>
                  )}
                </div>
              </div>
            </Glass>

            {/* 生效中的筛选条件 */}
            {hasFilter && (
              <div className="mt-4 flex flex-wrap items-center gap-2" data-reveal>
                <span className="text-[11px] text-muted-foreground">当前筛选</span>
                {category !== 'all' && (
                  <Chip tone="primary">
                    {NEWS_CATEGORIES[category] ?? category}
                    <button onClick={() => update({ category: null, page: null })} aria-label="移除分类筛选">
                      <X className="h-3 w-3" />
                    </button>
                  </Chip>
                )}
                {q && (
                  <Chip>
                    <Search className="h-3 w-3" />
                    {q}
                    <button onClick={() => update({ q: null, page: null })} aria-label="移除关键词">
                      <X className="h-3 w-3" />
                    </button>
                  </Chip>
                )}
                {tag && (
                  <Chip tone="accent">
                    <Hash className="h-3 w-3" />
                    {tag}
                    <button onClick={() => update({ tag: null, page: null })} aria-label="移除标签">
                      <X className="h-3 w-3" />
                    </button>
                  </Chip>
                )}
                {sort !== 'latest' && (
                  <Chip>
                    {SORTS.find((s) => s.value === sort)?.label}
                    <button onClick={() => update({ sort: null, page: null })} aria-label="恢复默认排序">
                      <X className="h-3 w-3" />
                    </button>
                  </Chip>
                )}
              </div>
            )}

            {/* ---------------------------- 内容区 ---------------------------- */}
            <div className="mt-7">
              {error ? (
                <Glass tone="soft" className="p-4">
                  <ErrorState message={error} onRetry={reload} />
                </Glass>
              ) : loading ? (
                <NewsSkeleton />
              ) : !items.length ? (
                <Glass tone="soft" className="p-4">
                  <EmptyState
                    icon={<FileText className="h-6 w-6" />}
                    title={hasFilter ? '没有找到匹配的内容' : '暂无已发布内容'}
                    description={
                      hasFilter
                        ? '试试更换关键词、切换分类，或清除全部筛选条件后重新浏览。'
                        : '该栏目内容正在筹备中，请稍后回来查看。'
                    }
                    action={
                      hasFilter ? (
                        <Button onClick={reset}>
                          <RotateCcw className="h-4 w-4" />
                          重置筛选
                        </Button>
                      ) : (
                        <LinkButton to="/" variant="primary">
                          返回首页
                        </LinkButton>
                      )
                    }
                  />
                </Glass>
              ) : (
                <div className="flex flex-col gap-9">
                  {/* 置顶区 */}
                  {pinnedItems.length > 0 && (
                    <section>
                      <div className="mb-4 flex items-center gap-3">
                        <span className="flex items-center gap-2 rounded-full border border-[hsl(var(--warning))]/35 bg-[hsl(var(--warning))]/12 px-3 py-1 text-[11px] font-medium text-[hsl(var(--warning))]">
                          <Pin className="h-3 w-3 -rotate-45" />
                          置顶
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          {pinnedItems.length} 篇重要内容优先展示
                        </span>
                        <span className="hairline flex-1" />
                      </div>
                      <div className="grid gap-5">
                        <div data-reveal>
                          <ArticleCard article={pinnedItems[0]} featured />
                        </div>
                        {pinnedItems.length > 1 && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            {pinnedItems.slice(1).map((a, i) => (
                              <div key={a.id} data-reveal="scale" style={{ transitionDelay: `${i * 60}ms` }}>
                                <ArticleCard article={a} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* 常规列表 */}
                  {normalItems.length > 0 && (
                    <section>
                      <div className="mb-4 flex items-center gap-3">
                        <span className="text-[12px] text-muted-foreground">
                          {pinnedItems.length ? '其余内容' : '全部内容'}
                        </span>
                        <span className="hairline flex-1" />
                        <span className="mono text-[11px] text-muted-foreground">{normalItems.length} 条</span>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {normalItems.map((a, i) => (
                          <div key={a.id} data-reveal="scale" style={{ transitionDelay: `${(i % 4) * 55}ms` }}>
                            <ArticleCard article={a} />
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <Pagination
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={total}
                    onChange={(p) => {
                      update({ page: p === 1 ? null : p });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ============================ 侧列 ============================ */}
          <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
            {/* 标签云 */}
            <Glass tone="soft" className="p-5" data-reveal="right">
              <div className="flex items-center gap-2.5">
                <TagIcon className="h-4 w-4 text-accent" />
                <h3 className="text-[14px] font-semibold">标签云</h3>
                {tag && (
                  <Link to="/news" className="ml-auto text-[11px] text-primary transition hover:underline">
                    清除
                  </Link>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {tagLoading ? (
                  Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-6 w-16 rounded-full" />)
                ) : tagCloud.length ? (
                  tagCloud.map((t) => {
                    const active = t.name === tag;
                    return (
                      <button
                        key={t.name}
                        onClick={() => update({ tag: active ? null : t.name, page: null })}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] transition-all duration-300',
                          active
                            ? 'border-accent/45 bg-accent/14 text-accent'
                            : 'border-white/11 bg-white/[0.045] text-muted-foreground hover:border-white/25 hover:text-foreground'
                        )}
                      >
                        <Hash className="h-2.5 w-2.5" />
                        {t.name}
                        <span className="mono text-[10px] opacity-70">{t.count}</span>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-[12px] text-muted-foreground">暂无标签</p>
                )}
              </div>
            </Glass>

            {/* 分类快捷 */}
            <Glass tone="soft" className="p-5" data-reveal="right">
              <h3 className="text-[14px] font-semibold">分类导航</h3>
              <div className="mt-4 flex flex-col gap-1">
                {Object.entries(NEWS_CATEGORIES).map(([key, label]) => {
                  const active = category === key;
                  return (
                    <button
                      key={key}
                      onClick={() => update({ category: active ? null : key, page: null })}
                      className={cn(
                        'flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-all duration-300',
                        active ? 'bg-white/[0.075] text-foreground' : 'text-muted-foreground hover:bg-white/[0.045]'
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', CAT_DOT[key] ?? 'bg-white/30')} />
                      <span className="text-[13px]">{label}</span>
                      <span className="mono ml-auto text-[11px] opacity-70">{counts[key] ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            </Glass>

            {/* 排序说明 */}
            <Glass tone="soft" className="p-5" data-reveal="right">
              <div className="flex items-center gap-2.5">
                <Flame className="h-4 w-4 text-[hsl(var(--warning))]" />
                <h3 className="text-[14px] font-semibold">浏览提示</h3>
              </div>
              <ul className="mt-4 flex flex-col gap-2.5 text-[12px] leading-relaxed text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" />
                  置顶内容始终排在列表最前，与排序方式无关。
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" />
                  「最多浏览」按阅读量排序，适合回看热门通知。
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" />
                  搜索同时匹配标题、摘要与正文。
                </li>
              </ul>
            </Glass>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
 * 骨架屏
 * ========================================================================== */
function NewsSkeleton() {
  return (
    <div className="flex flex-col gap-9">
      <div>
        <Skeleton className="mb-4 h-7 w-40 rounded-full" />
        <Skeleton className="h-[320px]" />
      </div>
      <div>
        <Skeleton className="mb-4 h-7 w-28 rounded-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[196px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

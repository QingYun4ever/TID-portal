/* 适配层：必须最先导入（在 ResourceManager 渲染前完成 Api 包装） */
import './adminResourceAdapter';

import { useMemo, useState } from 'react';
import { CalendarRange, History, Info, Milestone, RefreshCw } from 'lucide-react';

import { AdminApi } from '@/lib/api';
import { useApi, useRevealScan, useTitle } from '@/lib/hooks';
import { plain } from '@/lib/utils';
import { Button, Chip, EmptyState, ErrorState, Glass, Skeleton } from '@/components/ui';
import { ResourceManager, type Column, type FieldDef } from '@/components/AdminKit';
import { TimelineItem } from '@/components/cards';

/* =============================================================================
 * 部门概况页 —— /admin/about
 * 管理「发展历程」时间线（timeline），并实时预览门户「部门概况」页的渲染效果
 * ========================================================================== */

interface TimelineRow {
  id: number;
  year: string;
  title: string;
  description: string;
  sortOrder: number;
}

const FIELDS: FieldDef[] = [
  {
    name: 'year',
    label: '年份',
    type: 'text',
    required: true,
    placeholder: '例如：2015 或 2026 春',
    hint: '显示在时间线左侧，可写「2026 春」这样的表述',
  },
  { name: 'title', label: '事件标题', type: 'text', required: true, wide: true, placeholder: '例如：科技创新部正式成立' },
  {
    name: 'description',
    label: '事件描述',
    type: 'textarea',
    wide: true,
    rows: 4,
    placeholder: '例如：在校团委指导下成立科技创新部，统筹全校学生科技创新工作。',
    hint: '建议 40~100 字，说明这件事对部门发展的意义',
  },
  { name: 'sortOrder', label: '排序权重', type: 'number', default: 0, hint: '数字越小越靠前（时间线从上到下）' },
];

const COLUMNS: Column<TimelineRow>[] = [
  {
    key: 'year',
    title: '年份',
    width: '110px',
    render: (t) => <span className="mono text-[12.5px] font-semibold text-primary">{t.year}</span>,
  },
  {
    key: 'title',
    title: '事件标题',
    width: '280px',
    render: (t) => <span className="text-[13px] font-medium text-foreground/90">{t.title}</span>,
  },
  {
    key: 'description',
    title: '事件描述',
    width: '380px',
    render: (t) => <span className="clamp-2 text-xs text-muted-foreground">{plain(t.description, 80) || '—'}</span>,
  },
  {
    key: 'sortOrder',
    title: '排序',
    width: '80px',
    render: (t) => <span className="mono text-xs text-muted-foreground">{t.sortOrder ?? 0}</span>,
  },
];

export default function About() {
  useTitle('部门概况页');
  const [nonce, setNonce] = useState(0);

  const { data, loading, error, reload } = useApi<TimelineRow[]>(
    () => AdminApi.resource('timeline').list({ page: 1, pageSize: 100 }) as any,
    [nonce]
  );

  const nodes = useMemo(
    () => [...(data ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id),
    [data]
  );

  const span = nodes.length ? `${nodes[0].year} — ${nodes[nodes.length - 1].year}` : '—';
  /* 本页为懒加载路由，时间线预览在数据到达后渲染（含 TimelineItem 的滚动揭示） */
  useRevealScan(`${loading ? 'loading' : 'idle'}-${nodes.length}`);

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------ 时间线预览 ------------------------------ */}
      <div data-reveal>
        <Glass tone="soft" className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <History className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">时间线预览</p>
                <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-muted-foreground">
                  门户「部门概况」页会按「排序权重」升序渲染下列节点；可在此直观核对年份、标题与描述的呈现效果。
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Chip tone="primary">
                <CalendarRange className="h-3 w-3" />
                {span}
              </Chip>
              <Button variant="glass" size="sm" onClick={() => setNonce((n) => n + 1)} disabled={loading}>
                <RefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                刷新预览
              </Button>
            </div>
          </div>

          <div className="mt-6 border-t border-white/8 pt-6">
            {error ? (
              <ErrorState message={error} onRetry={reload} />
            ) : loading && !data ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : nodes.length ? (
              <div className="max-w-3xl">
                {nodes.map((n, i) => (
                  <TimelineItem key={n.id} node={n} index={i} total={nodes.length} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Milestone className="h-5 w-5" />}
                title="暂无发展历程"
                description="在下方「发展历程」中新增第一条节点，预览区会立即出现。"
              />
            )}
          </div>
        </Glass>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        时间线仅用于「部门概况」页；如需修改该页正文与联系方式，请前往「站点设置 → 页面内容」。
      </div>

      {/* ------------------------------ 发展历程管理 ------------------------------ */}
      <ResourceManager<TimelineRow>
        title="发展历程"
        description="维护部门大事记：年份、事件标题与描述，按排序权重从上到下渲染在部门概况页。"
        resource="timeline"
        fields={FIELDS}
        columns={COLUMNS}
        pageSize={12}
        searchPlaceholder="搜索事件标题…"
        emptyText="暂无发展历程"
        createLabel="新增节点"
        onChanged={() => setNonce((n) => n + 1)}
      />
    </div>
  );
}

/* 适配层：必须最先导入（在 ResourceManager 渲染前完成 Api 包装） */
import './adminResourceAdapter';

import { useMemo } from 'react';
import { Info } from 'lucide-react';

import { useRevealScan, useTitle } from '@/lib/hooks';
import { fdate, plain } from '@/lib/utils';
import { Chip, Glass } from '@/components/ui';
import { ResourceManager, type Column, type FieldDef } from '@/components/AdminKit';

/* =============================================================================
 * 更新日志 —— /admin/changelog
 * 维护站点/部门版本更新记录，版本色标签由 versionColor 决定
 * ========================================================================== */

interface ChangelogRow {
  id: number;
  version: string;
  versionColor: string;
  title: string;
  content: string;
  author: string;
  createdAt?: string;
}

/** 版本色 → 语义 token（Chip 色调 + 状态点类名） */
const VERSION_TONES: Record<string, { chip: 'primary' | 'accent' | 'success' | 'warning' | 'danger'; dot: string; label: string }> = {
  emerald: { chip: 'success', dot: 'bg-[hsl(var(--success))]', label: '翠绿' },
  blue: { chip: 'primary', dot: 'bg-primary', label: '青蓝' },
  violet: { chip: 'accent', dot: 'bg-accent', label: '极光紫' },
  amber: { chip: 'warning', dot: 'bg-[hsl(var(--warning))]', label: '琥珀' },
  cyan: { chip: 'primary', dot: 'bg-[hsl(var(--primary))]', label: '电能青' },
  rose: { chip: 'danger', dot: 'bg-[hsl(var(--destructive))]', label: '玫红' },
};

const FIELDS: FieldDef[] = [
  { name: 'version', label: '版本号', type: 'text', required: true, placeholder: '例如：v3.0.0', hint: '建议使用 vX.Y.Z 语义化版本' },
  {
    name: 'versionColor',
    label: '版本色',
    type: 'select',
    default: 'blue',
    options: Object.entries(VERSION_TONES).map(([value, t]) => ({ value, label: `${t.label}（${value}）` })),
    hint: '决定门户更新日志页的版本标签颜色',
  },
  { name: 'title', label: '标题', type: 'text', required: true, wide: true, placeholder: '例如：液态玻璃视觉语言全面上线' },
  { name: 'author', label: '维护人', type: 'text', placeholder: '例如：科技创新部技术组' },
  {
    name: 'content',
    label: '更新内容',
    type: 'richtext',
    wide: true,
    placeholder: '按模块列出本次更新，例如：新增 / 优化 / 修复 …',
  },
];

const COLUMNS: Column<ChangelogRow>[] = [
  {
    key: 'version',
    title: '版本',
    width: '110px',
    render: (c) => <span className="mono text-[12.5px] font-semibold text-foreground/85">{c.version}</span>,
  },
  {
    key: 'title',
    title: '标题',
    width: '300px',
    render: (c) => <span className="text-[13px] font-medium text-foreground/90">{c.title}</span>,
  },
  {
    key: 'content',
    title: '更新内容',
    width: '360px',
    render: (c) => <span className="clamp-2 text-xs text-muted-foreground">{plain(c.content, 90) || '—'}</span>,
  },
  {
    key: 'author',
    title: '维护人',
    width: '150px',
    render: (c) => <span className="text-[12px] text-muted-foreground">{c.author || '—'}</span>,
  },
  {
    key: 'createdAt',
    title: '记录时间',
    width: '120px',
    render: (c) => <span className="mono text-[11px] text-muted-foreground">{fdate(c.createdAt)}</span>,
  },
];

export default function ChangelogAdmin() {
  useTitle('更新日志');
  /* 本页为懒加载路由，说明卡片需在挂载后重新扫描滚动揭示 */
  useRevealScan('changelog');

  const colorLegend = useMemo(
    () => Object.entries(VERSION_TONES).map(([value, t]) => ({ value, ...t })),
    []
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------ 说明卡片 ------------------------------ */}
      <div data-reveal>
        <Glass tone="soft" className="p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <Info className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">更新日志说明</p>
                <ul className="mt-1.5 flex flex-col gap-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary/70">·</span>
                    <span>
                      门户「更新日志」页按记录时间倒序展示，版本号旁的色标签由
                      <span className="mono text-foreground/85"> versionColor</span> 决定。
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary/70">·</span>
                    <span>「更新内容」为富文本，建议按「新增 / 优化 / 修复」分组书写，便于同学快速浏览。</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {colorLegend.map((t) => (
                <Chip key={t.value} tone={t.chip} className="!px-2.5 !py-0.5 !text-[10.5px]">
                  <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
                  {t.label}
                </Chip>
              ))}
            </div>
          </div>
        </Glass>
      </div>

      {/* ------------------------------ 更新日志管理 ------------------------------ */}
      <ResourceManager<ChangelogRow>
        title="更新日志"
        description="维护版本更新记录：版本号、色标签、标题与富文本正文，会同步展示在门户更新日志页。"
        resource="changelog"
        fields={FIELDS}
        columns={COLUMNS}
        pageSize={12}
        searchPlaceholder="搜索版本号或标题…"
        emptyText="暂无更新日志"
        createLabel="新增记录"
        catalog={(c) => {
          const t = VERSION_TONES[c.versionColor] ?? VERSION_TONES.blue;
          return (
            <Chip tone={t.chip} className="!px-2.5 !py-0.5 !text-[10.5px]">
              <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
              {c.version}
            </Chip>
          );
        }}
      />
    </div>
  );
}

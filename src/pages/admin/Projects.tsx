/* 适配层：必须最先导入（在 ResourceManager 渲染前完成 Api 包装） */
import './adminResourceAdapter';

import { Award, Eye, Layers, Users } from 'lucide-react';

import { AdminApi } from '@/lib/api';
import { useApi, useReveal, useTitle } from '@/lib/hooks';
import { PROJECT_CATEGORIES, fnum, plain } from '@/lib/utils';
import { Chip } from '@/components/ui';
import {
  ResourceManager,
  StatTile,
  StatusChip,
  type Column,
  type FieldDef,
} from '@/components/AdminKit';

/* =============================================================================
 * 项目展示库 —— /admin/projects
 * 维护优秀 / 立项 / 结项 / 在研项目、竞赛成果、前端作品与工具服务
 * ========================================================================== */

interface ProjectRow {
  id: number;
  title: string;
  slug: string;
  cover: string | null;
  demoUrl: string | null;
  modelUrl: string | null;
  summary: string;
  content: string;
  category: string;
  year: number;
  team: string;
  members: string[];
  advisor: string | null;
  tags: string[];
  awards: string | null;
  status: string;
  views: number;
}

const CAT_TONE: Record<string, 'accent' | 'primary' | 'success' | 'warning'> = {
  excellent: 'accent',
  approved: 'primary',
  completed: 'success',
  ongoing: 'warning',
  competition: 'accent',
  frontend: 'primary',
  service: 'accent',
  hardware: 'accent',
};

/** 年份筛选：门户数据集中在近四年 */
const YEARS = [2023, 2024, 2025, 2026];

const FIELDS: FieldDef[] = [
  {
    name: 'title',
    label: '项目名称',
    type: 'text',
    required: true,
    wide: true,
    placeholder: '例如：面向校园场景的实验室数字化管理平台',
  },
  {
    name: 'category',
    label: '项目类别',
    type: 'select',
    required: true,
    default: 'approved',
    options: Object.entries(PROJECT_CATEGORIES).map(([value, label]) => ({ value, label })),
  },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    default: 'draft',
    options: [
      { value: 'published', label: '已发布' },
      { value: 'draft', label: '草稿' },
      { value: 'pending', label: '待审核' },
      { value: 'rejected', label: '已驳回' },
    ],
  },
  {
    name: 'year',
    label: '年份',
    type: 'number',
    required: true,
    default: new Date().getFullYear(),
  },
  {
    name: 'team',
    label: '团队名称',
    type: 'text',
    placeholder: '例如：实验室数字化小组',
  },
  {
    name: 'advisor',
    label: '指导教师',
    type: 'text',
    placeholder: '例如：张伟 教授',
  },
  {
    name: 'awards',
    label: '获奖信息',
    type: 'text',
    placeholder: '例如：2025 年省级创新大赛一等奖',
  },
  {
    name: 'cover',
    label: '封面图',
    type: 'image',
    wide: true,
    hint: '建议 16:9，用于门户项目卡片',
  },
  {
    name: 'demoUrl',
    label: '项目访问地址',
    type: 'text',
    wide: true,
    placeholder: 'https://example.com',
    hint: '前端作品或工具服务可填写公开地址；建议使用 https://，仅支持 http(s) 链接。',
  },
  {
    name: 'modelUrl',
    label: '三维模型路径',
    type: 'text',
    wide: true,
    placeholder: '/models/nfc-card.obj',
    hint: '实体设计可填写站内 /models/ 目录下的 OBJ 模型路径，配套同名 MTL 材质。',
  },
  {
    name: 'summary',
    label: '项目简介',
    type: 'textarea',
    wide: true,
    rows: 3,
    hint: '用于列表卡片，建议 60~120 字',
    placeholder: '一句话说明项目解决的问题与核心成果。',
  },
  {
    name: 'content',
    label: '项目详情',
    type: 'richtext',
    wide: true,
    placeholder: '研究背景、技术方案、成果与展望…',
  },
  {
    name: 'members',
    label: '团队成员',
    type: 'list',
    wide: true,
    hint: '每行一个成员名',
    placeholder: '每行一个成员名',
  },
  {
    name: 'tags',
    label: '标签',
    type: 'tags',
    wide: true,
    hint: '回车添加，用于筛选与相关推荐',
  },
];

const COLUMNS: Column<ProjectRow>[] = [
  {
    key: 'title',
    title: '项目名称',
    width: '26%',
    render: (r) => (
      <div className="min-w-0">
        <p className="clamp-1 max-w-[300px] text-[13px] font-medium" title={r.title}>
          {r.title}
        </p>
        {!!r.summary && (
          <p className="clamp-1 mt-0.5 max-w-[290px] text-[11px] text-muted-foreground">
            {plain(r.summary, 46)}
          </p>
        )}
      </div>
    ),
  },
  {
    key: 'category',
    title: '类别',
    width: '96px',
    render: (r) => (
      <Chip tone={CAT_TONE[r.category] ?? 'default'} className="!px-2.5 !py-0.5">
        {PROJECT_CATEGORIES[r.category] ?? r.category}
      </Chip>
    ),
  },
  {
    key: 'year',
    title: '年份',
    width: '76px',
    render: (r) => <span className="mono text-xs text-foreground/80">{r.year || '—'}</span>,
  },
  {
    key: 'team',
    title: '团队',
    width: '14%',
    render: (r) => (
      <span className="clamp-1 flex max-w-[150px] items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5 shrink-0 opacity-60" />
        {r.team || '—'}
      </span>
    ),
  },
  {
    key: 'advisor',
    title: '指导教师',
    width: '110px',
    render: (r) => <span className="clamp-1 block text-xs text-muted-foreground">{r.advisor || '—'}</span>,
  },
  {
    key: 'awards',
    title: '获奖',
    width: '18%',
    render: (r) => (
      <span
        className="clamp-1 flex max-w-[200px] items-center gap-1.5 text-xs text-muted-foreground"
        title={r.awards ?? ''}
      >
        {r.awards ? <Award className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--warning))]" /> : null}
        {r.awards || '—'}
      </span>
    ),
  },
  {
    key: 'views',
    title: '浏览量',
    width: '92px',
    render: (r) => (
      <span className="mono flex items-center gap-1.5 text-xs text-muted-foreground">
        <Eye className="h-3.5 w-3.5 opacity-70" />
        {fnum(r.views)}
      </span>
    ),
  },
];

export default function Projects() {
  useTitle('项目展示库');
  const reveal = useReveal<HTMLDivElement>();
  const { data: stats, loading: statsLoading } = useApi<any>(() => AdminApi.stats(), []);

  const byCategory = (key: string) => {
    const list = Array.isArray(stats?.projByCat) ? stats.projByCat : [];
    return (list.find((c: any) => c.key === key)?.value as number) ?? 0;
  };

  const tiles = [
    {
      label: '项目总数',
      value: stats?.projects,
      hint: '展示库全部项目',
      tone: 'primary' as const,
      icon: <Layers className="h-4 w-4" />,
    },
    {
      label: '优秀项目',
      value: byCategory('excellent'),
      hint: '评审入选',
      tone: 'accent' as const,
      icon: <Award className="h-4 w-4" />,
    },
    {
      label: '在研项目',
      value: byCategory('ongoing'),
      hint: '仍在推进',
      tone: 'warning' as const,
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: '结项项目',
      value: byCategory('completed'),
      hint: '已通过结项',
      tone: 'success' as const,
      icon: <Award className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div ref={reveal} data-reveal className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <StatTile
            key={t.label}
            label={t.label}
            value={statsLoading ? '—' : fnum(t.value ?? 0)}
            hint={t.hint}
            tone={t.tone}
            icon={t.icon}
          />
        ))}
      </div>

      <ResourceManager<ProjectRow>
        title="项目展示库"
        description="维护竞赛成果、前端作品、工具服务与实体设计；上传封面，填写演示地址或站内 OBJ 模型路径。"
        resource="projects"
        fields={FIELDS}
        columns={COLUMNS}
        pageSize={10}
        searchPlaceholder="搜索项目名称、团队或指导教师…"
        emptyText="暂无项目"
        createLabel="新建项目"
        catalog={(r) => <StatusChip status={r.status} labels={{ rejected: '已驳回' }} />}
        filters={({ filters, setFilter }) => [
          {
            name: 'status',
            label: '状态',
            value: filters.status ?? '',
            options: [
              { value: '', label: '全部状态' },
              { value: 'published', label: '已发布' },
              { value: 'draft', label: '草稿' },
              { value: 'pending', label: '待审核' },
              { value: 'rejected', label: '已驳回' },
            ],
            onChange: (v) => setFilter('status', v),
          },
          {
            name: 'category',
            label: '类别',
            value: filters.category ?? '',
            options: [
              { value: '', label: '全部类别' },
              ...Object.entries(PROJECT_CATEGORIES).map(([value, label]) => ({ value, label })),
            ],
            onChange: (v) => setFilter('category', v),
          },
          {
            name: 'year',
            label: '年份',
            value: filters.year ?? '',
            options: [{ value: '', label: '全部年份' }, ...YEARS.map((y) => ({ value: String(y), label: `${y} 年` }))],
            onChange: (v) => setFilter('year', v),
          },
        ]}
      />
    </div>
  );
}

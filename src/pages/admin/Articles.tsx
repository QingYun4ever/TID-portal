/* 适配层：必须最先导入（在 ResourceManager 渲染前完成 Api 包装） */
import './adminResourceAdapter';

import { Check, Clock, Eye, ExternalLink, FileText, Pin } from 'lucide-react';

import { AdminApi } from '@/lib/api';
import { useApi, useReveal, useTitle } from '@/lib/hooks';
import { NEWS_CATEGORIES, fdate, fnum, plain } from '@/lib/utils';
import { Chip, LinkButton } from '@/components/ui';
import {
  ResourceManager,
  StatTile,
  StatusChip,
  type Column,
  type FieldDef,
} from '@/components/AdminKit';

/* =============================================================================
 * 新闻与通知 —— /admin/articles
 * 内容发布 / 审核（状态流转）/ 分类 / 置顶 / 分页 / 检索，全部由 ResourceManager 配置驱动
 * ========================================================================== */

interface ArticleRow {
  id: number;
  title: string;
  slug: string;
  category: string;
  summary: string;
  content: string;
  cover: string | null;
  tags: string[];
  pinned: boolean;
  status: string;
  views: number;
  publishedAt: string | null;
  createdAt: string;
}

/** 分类色调：通知=琥珀 / 部门新闻=青蓝 / 竞赛=极光紫 / 政策=翠绿 */
const CAT_TONE: Record<string, 'warning' | 'primary' | 'accent' | 'success'> = {
  notice: 'warning',
  dept: 'primary',
  competition: 'accent',
  policy: 'success',
};

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待审核' },
  { value: 'rejected', label: '已驳回' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: '全部分类' },
  ...Object.entries(NEWS_CATEGORIES).map(([value, label]) => ({ value, label })),
];

const FIELDS: FieldDef[] = [
  {
    name: 'title',
    label: '标题',
    type: 'text',
    required: true,
    wide: true,
    placeholder: '例如：关于开展 2026 年校内科技比赛的通知',
  },
  {
    name: 'category',
    label: '分类',
    type: 'select',
    required: true,
    default: 'notice',
    options: Object.entries(NEWS_CATEGORIES).map(([value, label]) => ({ value, label })),
  },
  {
    name: 'pinned',
    label: '置顶',
    type: 'switch',
    hint: '置顶后优先展示在门户列表与首页',
  },
  {
    name: 'summary',
    label: '摘要',
    type: 'textarea',
    required: true,
    wide: true,
    rows: 3,
    hint: '用于列表摘要，建议 60~120 字',
    placeholder: '一句话说明这条通知的核心信息：面向谁、做什么、截止时间。',
  },
  {
    name: 'cover',
    label: '封面图',
    type: 'image',
    wide: true,
    hint: '建议 16:9，≥ 1200×675',
  },
  {
    name: 'content',
    label: '正文',
    type: 'richtext',
    required: true,
    wide: true,
    placeholder: '支持标题、列表、引用、链接与图片…',
  },
  {
    name: 'tags',
    label: '标签',
    type: 'tags',
    wide: true,
    hint: '回车添加，用于筛选与相关推荐',
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
    hint: '待审核的文章需审核通过后才会在门户展示',
  },
  {
    name: 'publishedAt',
    label: '发布时间',
    type: 'datetime',
    hint: '留空则按创建时间排序',
  },
  {
    name: 'slug',
    label: 'Slug（地址标识）',
    type: 'text',
    placeholder: '留空则自动生成',
  },
];

const COLUMNS: Column<ArticleRow>[] = [
  {
    key: 'title',
    title: '标题',
    width: '30%',
    render: (r) => (
      <div className="flex items-start gap-2">
        {r.pinned && (
          <span className="mt-0.5 shrink-0 text-[hsl(var(--warning))]" title="已置顶">
            <Pin className="h-3.5 w-3.5" />
          </span>
        )}
        <div className="min-w-0">
          <p className="clamp-1 max-w-[380px] text-[13px] font-medium" title={r.title}>
            {r.title}
          </p>
          <p className="mono mt-0.5 truncate text-[10.5px] text-muted-foreground/70">/{r.slug}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'category',
    title: '分类',
    width: '104px',
    render: (r) => (
      <Chip tone={CAT_TONE[r.category] ?? 'default'} className="!px-2.5 !py-0.5">
        {NEWS_CATEGORIES[r.category] ?? r.category}
      </Chip>
    ),
  },
  {
    key: 'summary',
    title: '摘要',
    width: '24%',
    render: (r) => (
      <span className="clamp-1 block max-w-[280px] text-xs leading-relaxed text-muted-foreground">
        {plain(r.summary || r.content, 80) || '—'}
      </span>
    ),
  },
  {
    key: 'views',
    title: '浏览量',
    width: '96px',
    render: (r) => (
      <span className="mono flex items-center gap-1.5 text-xs text-muted-foreground">
        <Eye className="h-3.5 w-3.5 opacity-70" />
        {fnum(r.views)}
      </span>
    ),
  },
  {
    key: 'publishedAt',
    title: '发布时间',
    width: '116px',
    render: (r) => (
      <span className="mono text-xs text-foreground/80">{fdate(r.publishedAt ?? r.createdAt)}</span>
    ),
  },
];

export default function Articles() {
  useTitle('新闻与通知');
  const reveal = useReveal<HTMLDivElement>();
  const { data: stats, loading: statsLoading } = useApi<any>(() => AdminApi.stats(), []);

  const tiles = [
    {
      label: '文章总数',
      value: stats?.articles,
      hint: '全部新闻与通知',
      tone: 'primary' as const,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      label: '已发布',
      value: stats?.publishedArticles,
      hint: '门户已可见',
      tone: 'success' as const,
      icon: <Check className="h-4 w-4" />,
    },
    {
      label: '待审核',
      value: stats?.pendingArticles,
      hint: '等待处理',
      tone: 'warning' as const,
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: '累计浏览',
      value: stats?.totalViews,
      hint: '文章 + 项目',
      tone: 'accent' as const,
      icon: <Eye className="h-4 w-4" />,
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

      <ResourceManager<ArticleRow>
        title="新闻与通知"
        description="发布通知公告、部门新闻、竞赛信息与政策文件；支持置顶、审核状态流转与标签检索。"
        resource="articles"
        fields={FIELDS}
        columns={COLUMNS}
        pageSize={10}
        searchPlaceholder="搜索标题或摘要…"
        emptyText="暂无文章"
        createLabel="新建文章"
        catalog={(r) => <StatusChip status={r.status} labels={{ rejected: '已驳回' }} />}
        filters={({ filters, setFilter }) => [
          {
            name: 'status',
            label: '状态',
            value: filters.status ?? '',
            options: STATUS_OPTIONS,
            onChange: (v) => setFilter('status', v),
          },
          {
            name: 'category',
            label: '分类',
            value: filters.category ?? '',
            options: CATEGORY_OPTIONS,
            onChange: (v) => setFilter('category', v),
          },
        ]}
        headerActions={
          <LinkButton to="/news" variant="glass">
            <ExternalLink className="h-3.5 w-3.5" />
            前往门户查看
          </LinkButton>
        }
      />
    </div>
  );
}

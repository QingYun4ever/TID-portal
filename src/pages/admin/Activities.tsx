/* 适配层：必须最先导入（在 ResourceManager 渲染前完成 Api 包装） */
import './adminResourceAdapter';

import { useMemo } from 'react';
import { BarChart3, Calendar, MapPin, Ticket } from 'lucide-react';

import { AdminApi } from '@/lib/api';
import { useApi, useReveal, useTitle } from '@/lib/hooks';
import { fdate, fdatetime, truncate } from '@/lib/utils';
import { Chip, Glass, ProgressBar, Skeleton } from '@/components/ui';
import {
  BarList,
  ExportButton,
  ResourceManager,
  StatusChip,
  type Column,
  type FieldDef,
} from '@/components/AdminKit';

/* =============================================================================
 * 活动管理 —— /admin/activities
 * 发布讲座 / 科技比赛 / 科技活动等线下活动，维护时间、地点、名额与报名窗口
 * ========================================================================== */

interface ActivityRow {
  id: number;
  title: string;
  slug: string;
  cover: string | null;
  summary: string;
  content: string;
  location: string;
  category: string;
  startAt: string;
  endAt: string | null;
  signupStart: string | null;
  signupEnd: string | null;
  capacity: number;
  status: string;
}

/** 报名统计（来自 AdminApi.signups 的附加字段 activities，带 signedCount） */
interface ActivitySignupStat {
  id: number;
  title: string;
  capacity: number;
  signedCount: number;
}

/** 活动分类沿用数据库中的中文取值，便于与既有数据保持一致 */
const ACTIVITY_CATEGORIES = [
  '讲座',
  '科技比赛',
  '科技活动',
  '宣讲会',
  '分享会',
  '科普展示',
  '赛前培训',
];

const CAT_TONE: Record<string, 'primary' | 'accent' | 'success' | 'warning' | 'danger'> = {
  讲座: 'primary',
  科技比赛: 'accent',
  科技活动: 'success',
  宣讲会: 'warning',
  分享会: 'primary',
  科普展示: 'accent',
  赛前培训: 'danger',
};

const FIELDS: FieldDef[] = [
  {
    name: 'title',
    label: '活动名称',
    type: 'text',
    required: true,
    wide: true,
    placeholder: '例如：科技比赛赛前科普讲座',
  },
  {
    name: 'category',
    label: '活动分类',
    type: 'select',
    default: '讲座',
    options: ACTIVITY_CATEGORIES.map((v) => ({ value: v, label: v })),
  },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    default: 'draft',
    options: [
      { value: 'published', label: '已发布' },
      { value: 'draft', label: '草稿' },
      { value: 'ended', label: '已结束' },
    ],
  },
  {
    name: 'location',
    label: '活动地点',
    type: 'text',
    required: true,
    placeholder: '例如：教学楼 A 座 201 教室',
  },
  {
    name: 'capacity',
    label: '名额上限',
    type: 'number',
    default: 0,
    hint: '0 表示不限名额',
  },
  {
    name: 'startAt',
    label: '开始时间',
    type: 'datetime',
    required: true,
  },
  {
    name: 'endAt',
    label: '结束时间',
    type: 'datetime',
  },
  {
    name: 'signupStart',
    label: '报名开始',
    type: 'datetime',
    hint: '留空表示不限制报名开始时间',
  },
  {
    name: 'signupEnd',
    label: '报名截止',
    type: 'datetime',
  },
  {
    name: 'cover',
    label: '封面图',
    type: 'image',
    wide: true,
    hint: '建议 16:9，用于门户活动卡片',
  },
  {
    name: 'summary',
    label: '活动简介',
    type: 'textarea',
    wide: true,
    rows: 3,
    hint: '用于列表卡片，建议 60~120 字',
    placeholder: '一句话说明活动主题、面向对象与能获得什么。',
  },
  {
    name: 'content',
    label: '活动详情',
    type: 'richtext',
    wide: true,
    placeholder: '议程、嘉宾介绍、注意事项…',
  },
];

export default function Activities() {
  useTitle('活动管理');
  const reveal = useReveal<HTMLDivElement>();

  /* 报名统计：/admin/signups 的附加字段 activities 带 signedCount（活动列表接口本身没有） */
  const { meta: signupMeta, loading: statsLoading } = useApi<any>(
    () => AdminApi.signups({ page: 1, pageSize: 1 }),
    []
  );

  const stats = useMemo<ActivitySignupStat[]>(
    () => (Array.isArray(signupMeta?.activities) ? signupMeta.activities : []),
    [signupMeta]
  );

  const signedById = useMemo(
    () => new Map(stats.map((a) => [a.id, Number(a.signedCount) || 0])),
    [stats]
  );

  const columns = useMemo<Column<ActivityRow>[]>(
    () => [
      {
        key: 'title',
        title: '活动名称',
        width: '26%',
        render: (r) => (
          <div className="min-w-0">
            <p className="clamp-1 max-w-[300px] text-[13px] font-medium" title={r.title}>
              {r.title}
            </p>
            <p className="mono mt-0.5 truncate text-[10.5px] text-muted-foreground/70">/{r.slug}</p>
          </div>
        ),
      },
      {
        key: 'category',
        title: '分类',
        width: '104px',
        render: (r) => (
          <Chip tone={CAT_TONE[r.category] ?? 'default'} className="!px-2.5 !py-0.5">
            {r.category || '未分类'}
          </Chip>
        ),
      },
      {
        key: 'startAt',
        title: '活动时间',
        width: '150px',
        render: (r) => (
          <span className="mono flex items-center gap-1.5 text-xs text-foreground/80">
            <Calendar className="h-3.5 w-3.5 opacity-60" />
            {fdatetime(r.startAt)}
          </span>
        ),
      },
      {
        key: 'location',
        title: '地点',
        width: '150px',
        render: (r) => (
          <span className="clamp-1 flex max-w-[150px] items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 opacity-60" />
            {r.location || '—'}
          </span>
        ),
      },
      {
        key: 'signup',
        title: '报名情况',
        width: '168px',
        render: (r) => {
          const cap = Number(r.capacity) || 0;
          const signed = signedById.get(r.id);
          return (
            <div className="w-[150px]">
              <div className="flex items-baseline justify-between gap-2 text-[11px]">
                <span className="mono flex items-center gap-1 text-foreground/85">
                  <Ticket className="h-3 w-3 opacity-60" />
                  {signed === undefined ? '—' : signed}
                  <span className="text-muted-foreground">/ {cap || '不限'}</span>
                </span>
                {cap > 0 && signed !== undefined && (
                  <span className="mono text-muted-foreground">{Math.round((signed / cap) * 100)}%</span>
                )}
              </div>
              <ProgressBar
                className="mt-1.5"
                height={4}
                value={signed ?? 0}
                max={cap || Math.max(signed ?? 1, 1)}
                tone={cap > 0 && (signed ?? 0) >= cap ? 'danger' : 'primary'}
              />
              <p className="mono mt-1 text-[10.5px] text-muted-foreground/80">
                报名截止 {fdate(r.signupEnd)}
              </p>
            </div>
          );
        },
      },
    ],
    [signedById]
  );

  const barItems = stats.map((a) => ({ name: truncate(a.title, 22), value: Number(a.signedCount) || 0 }));

  return (
    <div className="flex flex-col gap-6">
      <div ref={reveal} data-reveal>
        <Glass tone="soft" className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <BarChart3 className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">各活动报名数</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  取自报名名单实时统计，用于快速判断活动热度与名额余量
                </p>
              </div>
            </div>
            <span className="mono shrink-0 text-[11px] text-muted-foreground">
              共 {stats.reduce((s, a) => s + (Number(a.signedCount) || 0), 0)} 人次
            </span>
          </div>
          {statsLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6" />
              ))}
            </div>
          ) : barItems.length ? (
            <BarList items={barItems} />
          ) : (
            <p className="text-xs text-muted-foreground">暂无报名数据。</p>
          )}
        </Glass>
      </div>

      <ResourceManager<ActivityRow>
        title="活动管理"
        description="发布科普讲座、科技比赛、科技活动等线下活动；维护活动时间、地点、名额与报名窗口，并导出报名名单。"
        resource="activities"
        fields={FIELDS}
        columns={columns}
        pageSize={10}
        searchPlaceholder="搜索活动名称或地点…"
        emptyText="暂无活动"
        createLabel="新建活动"
        catalog={(r) => <StatusChip status={r.status} labels={{ ended: '已结束' }} />}
        filters={({ filters, setFilter }) => [
          {
            name: 'status',
            label: '状态',
            value: filters.status ?? '',
            options: [
              { value: '', label: '全部状态' },
              { value: 'published', label: '已发布' },
              { value: 'draft', label: '草稿' },
              { value: 'ended', label: '已结束' },
            ],
            onChange: (v) => setFilter('status', v),
          },
          {
            name: 'category',
            label: '分类',
            value: filters.category ?? '',
            options: [
              { value: '', label: '全部分类' },
              ...ACTIVITY_CATEGORIES.map((v) => ({ value: v, label: v })),
            ],
            onChange: (v) => setFilter('category', v),
          },
        ]}
        headerActions={<ExportButton kind="signups" label="导出报名名单" />}
      />
    </div>
  );
}

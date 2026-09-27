import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  ClipboardList,
  Clock3,
  FileText,
  Layers,
  Mail,
  Phone,
  Search as SearchIcon,
  Users,
  XCircle,
} from 'lucide-react';

import { AdminApi, apiFull, qs } from '@/lib/api';
import { useDebounced, useTitle } from '@/lib/hooks';
import { useToast } from '@/lib/store';
import { APPLY_STATUS, cn, fbytes, fdatetime, fnum, plain } from '@/lib/utils';
import { Button, Chip, Drawer, ErrorState, Glass, SearchInput, Skeleton, Tabs } from '@/components/ui';
import { AdminPage, Column, DataTable, ExportButton, ReviewActions, StatTile, StatusChip } from '@/components/AdminKit';

/* =============================================================================
 * 类型
 * ========================================================================== */
type ApplyStatus = 'pending' | 'reviewing' | 'approved' | 'rejected';

interface Material {
  name?: string;
  url?: string;
  size?: number;
}

interface ApplicationRow {
  id: number;
  title: string;
  competitionId: number | null;
  competitionTitle: string | null;
  leaderName: string;
  leaderStudentId: string;
  leaderCollege: string;
  leaderPhone: string;
  leaderEmail: string | null;
  advisor: string | null;
  teamSize: number;
  members: string[];
  category: string;
  intro: string;
  materials: Material[];
  status: ApplyStatus;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZE = 20;

const TABS: { value: string; label: string; key: ApplyStatus | null }[] = [
  { value: 'all', label: '全部', key: null },
  { value: 'pending', label: '待审核', key: 'pending' },
  { value: 'reviewing', label: '审核中', key: 'reviewing' },
  { value: 'approved', label: '已通过', key: 'approved' },
  { value: 'rejected', label: '未通过', key: 'rejected' },
];

/* =============================================================================
 * 项目申报审核 /admin/applications
 * ========================================================================== */
export default function AdminApplications() {
  useTitle('项目申报审核');
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 380);

  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [detail, setDetail] = useState<ApplicationRow | null>(null);
  const [reviewing, setReviewing] = useState<number | null>(null);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiFull<any>(`/admin/applications?${qs({ page, pageSize: PAGE_SIZE, status, q })}`)
      .then((res) => {
        if (!alive) return;
        setRows((res.data?.items ?? []) as ApplicationRow[]);
        setTotal(Number(res.data?.total ?? 0));
        setCounts((res.counts ?? {}) as Record<string, number>);
        setError(null);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message || '加载失败');
        setRows([]);
        setTotal(0);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [page, status, q, reloadKey]);

  /** 详情抽屉的数据跟随列表刷新（审核后状态即时更新） */
  useEffect(() => {
    if (!detail) return;
    const next = rows.find((r) => r.id === detail.id);
    if (next) setDetail(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const countOf = useCallback((key: ApplyStatus | null) => (key ? counts[key] ?? 0 : Object.values(counts).reduce((a, b) => a + b, 0)), [counts]);

  const tabItems = useMemo(
    () => TABS.map((t) => ({ value: t.value, label: t.label, count: loading && !Object.keys(counts).length ? undefined : countOf(t.key) })),
    [counts, countOf, loading]
  );

  const doReview = async (row: ApplicationRow, next: string, note?: string) => {
    setReviewing(row.id);
    try {
      await AdminApi.reviewApplication(row.id, next, note);
      toast.success(`已${APPLY_STATUS[next] ?? next}`, plain(row.title, 30));
      refresh();
    } catch (e: any) {
      toast.error('审核失败', e.message);
    } finally {
      setReviewing(null);
    }
  };

  /* -------------------------------- 列定义 ------------------------------ */
  const columns: Column<ApplicationRow>[] = [
    {
      key: '__no',
      title: '#',
      width: '56px',
      render: (_r, i) => <span className="mono text-xs text-muted-foreground">{String((page - 1) * PAGE_SIZE + i + 1).padStart(2, '0')}</span>,
    },
    {
      key: 'title',
      title: '项目名称',
      render: (r) => (
        <div className="min-w-[180px] max-w-[280px]">
          <p className="clamp-1 text-[13px] font-medium text-foreground/95">{r.title}</p>
          {r.competitionTitle && <p className="mono mt-1 clamp-1 text-[11px] text-muted-foreground">对应竞赛 · {r.competitionTitle}</p>}
        </div>
      ),
    },
    {
      key: 'category',
      title: '类别',
      width: '116px',
      className: 'hidden sm:table-cell',
      render: (r) => (
        <Chip tone="accent" className="!px-2.5 !py-0.5 whitespace-nowrap">
          {r.category || '—'}
        </Chip>
      ),
    },
    {
      key: 'leader',
      title: '负责人',
      width: '150px',
      render: (r) => (
        <div>
          <p className="whitespace-nowrap text-[13px] font-medium">{r.leaderName}</p>
          <p className="mono mt-0.5 text-[11px] text-muted-foreground">{r.leaderStudentId}</p>
        </div>
      ),
    },
    {
      key: 'college',
      title: '学院',
      className: 'hidden lg:table-cell',
      render: (r) => <span className="block max-w-[170px] truncate text-[13px] text-foreground/80">{r.leaderCollege || '—'}</span>,
    },
    {
      key: 'contact',
      title: '电话 / 邮箱',
      className: 'hidden xl:table-cell',
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="mono whitespace-nowrap text-[11px] text-foreground/80">{r.leaderPhone || '—'}</span>
          <span className="mono max-w-[190px] truncate text-[11px] text-muted-foreground" title={r.leaderEmail ?? ''}>
            {r.leaderEmail || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'advisor',
      title: '指导教师',
      width: '126px',
      className: 'hidden xl:table-cell',
      render: (r) => <span className="block max-w-[120px] truncate text-[13px] text-foreground/80">{r.advisor || '—'}</span>,
    },
    {
      key: 'teamSize',
      title: '团队人数',
      width: '92px',
      className: 'hidden md:table-cell',
      render: (r) => (
        <span className="mono inline-flex items-center gap-1.5 text-xs text-foreground/85">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {r.teamSize || (Array.isArray(r.members) ? r.members.length : 0)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      title: '提交时间',
      width: '150px',
      className: 'hidden lg:table-cell',
      render: (r) => <span className="mono whitespace-nowrap text-xs text-muted-foreground">{fdatetime(r.createdAt)}</span>,
    },
    {
      key: 'status',
      title: '状态',
      width: '100px',
      render: (r) => <StatusChip status={r.status} />,
    },
  ];

  /* -------------------------------- 详情抽屉 ---------------------------- */
  const detailBody = (row: ApplicationRow) => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={row.status} />
        <Chip tone="accent">{row.category}</Chip>
        <span className="mono text-[11px] text-muted-foreground">#{row.id} · 提交于 {fdatetime(row.createdAt)}</span>
      </div>

      <InfoBlock icon={<Layers className="h-3.5 w-3.5" />} label="项目简介">
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/80">{row.intro || '—'}</p>
      </InfoBlock>

      <InfoBlock icon={<Users className="h-3.5 w-3.5" />} label={`成员列表（${Array.isArray(row.members) ? row.members.length : 0} 人）`}>
        {Array.isArray(row.members) && row.members.length ? (
          <ul className="flex flex-wrap gap-2">
            {row.members.map((m, i) => (
              <li key={i} className="chip !px-3 !py-1">
                {typeof m === 'string' ? m : String((m as any)?.name ?? JSON.stringify(m))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-muted-foreground">未填写成员信息</p>
        )}
      </InfoBlock>

      <InfoBlock icon={<FileText className="h-3.5 w-3.5" />} label={`申报材料（${Array.isArray(row.materials) ? row.materials.length : 0} 个）`}>
        {Array.isArray(row.materials) && row.materials.length ? (
          <ul className="flex flex-col gap-2">
            {row.materials.map((m, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5">
                <span className="flex min-w-0 items-center gap-2.5">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                  <span className="clamp-1 text-[13px] text-foreground/90">{m?.name ?? `材料 ${i + 1}`}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="mono text-[11px] text-muted-foreground">{fbytes(m?.size ?? 0)}</span>
                  {m?.url && m.url !== '#' ? (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[11px] text-primary transition hover:underline"
                    >
                      查看
                    </a>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/60">无附件</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-muted-foreground">未上传材料</p>
        )}
      </InfoBlock>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InfoBlock icon={<Phone className="h-3.5 w-3.5" />} label="联系电话">
          <p className="mono text-[13px] text-foreground/85">{row.leaderPhone || '—'}</p>
        </InfoBlock>
        <InfoBlock icon={<Mail className="h-3.5 w-3.5" />} label="联系邮箱">
          <p className="mono break-all text-[13px] text-foreground/85">{row.leaderEmail || '—'}</p>
        </InfoBlock>
      </div>

      <InfoBlock icon={<BadgeCheck className="h-3.5 w-3.5" />} label="审核意见">
        {row.reviewNote ? (
          <p className="whitespace-pre-wrap rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3 text-[13px] leading-relaxed text-foreground/80">
            {row.reviewNote}
          </p>
        ) : (
          <p className="text-[13px] text-muted-foreground">尚无审核意见</p>
        )}
        <p className="mono mt-2 text-[11px] text-muted-foreground">最后更新 {fdatetime(row.updatedAt)}</p>
      </InfoBlock>

      <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
        <p className="mb-3 text-[12px] font-medium text-foreground/90">审核操作</p>
        <ReviewActions current={row.status} onReview={(s, note) => void doReview(row, s, note)} />
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          审核结果会以站内消息推送给申请人；选择「驳回」时需要填写原因。
        </p>
      </div>
    </div>
  );

  return (
    <AdminPage
      title="项目申报"
      breadcrumb="后台管理 · 业务办理"
      icon={<ClipboardList className="h-5 w-5" />}
      description="审核全校同学提交的项目申报，支持受理、通过与驳回（附审核意见），并可导出完整申报汇总。"
      actions={<ExportButton kind="applications" label="导出申报汇总" />}
    >
      {/* -------------------------------- 统计 -------------------------------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-reveal>
        <StatTile
          label="待审核"
          value={fnum(counts.pending ?? 0)}
          hint="等待首次受理"
          tone="warning"
          icon={<Clock3 className="h-4 w-4" />}
          onClick={() => {
            setStatus('pending');
            setPage(1);
          }}
          active={status === 'pending'}
        />
        <StatTile
          label="审核中"
          value={fnum(counts.reviewing ?? 0)}
          hint="已受理待结论"
          tone="primary"
          icon={<SearchIcon className="h-4 w-4" />}
          onClick={() => {
            setStatus('reviewing');
            setPage(1);
          }}
          active={status === 'reviewing'}
        />
        <StatTile
          label="已通过"
          value={fnum(counts.approved ?? 0)}
          hint="立项成功"
          tone="success"
          icon={<BadgeCheck className="h-4 w-4" />}
          onClick={() => {
            setStatus('approved');
            setPage(1);
          }}
          active={status === 'approved'}
        />
        <StatTile
          label="未通过"
          value={fnum(counts.rejected ?? 0)}
          hint="已驳回并说明原因"
          tone="danger"
          icon={<XCircle className="h-4 w-4" />}
          onClick={() => {
            setStatus('rejected');
            setPage(1);
          }}
          active={status === 'rejected'}
        />
      </div>

      {/* ------------------------------ 筛选区 ------------------------------- */}
      <Glass tone="soft" className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between" data-reveal>
        <Tabs
          items={tabItems}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          size="sm"
          className="min-w-0"
        />
        <div className="w-full lg:max-w-xs">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="搜索项目名 / 负责人 / 学号…"
          />
        </div>
      </Glass>

      {/* -------------------------------- 表格 -------------------------------- */}
      {error ? (
        <Glass tone="soft">
          <ErrorState message={error} onRetry={reload} />
        </Glass>
      ) : (
        <DataTable<ApplicationRow>
          columns={columns}
          rows={rows}
          loading={loading}
          empty="暂无申报记录"
          emptyDescription={status === 'all' && !q ? '当前还没有同学提交项目申报。' : '换个状态或清空搜索关键词试试。'}
          onRowClick={(row) => setDetail(row)}
          rowActions={(row) => (
            <div className={cn('flex justify-end', reviewing === row.id && 'opacity-60')}>
              <ReviewActions current={row.status} onReview={(s, note) => void doReview(row, s, note)} />
            </div>
          )}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      )}

      <p className="text-[11px] text-muted-foreground">提示：点击任意一行可在右侧抽屉查看完整申报详情（简介、成员、材料与审核意见）。</p>

      {/* ------------------------------ 详情抽屉 ------------------------------ */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? plain(detail.title, 26) : '申报详情'}
        width="max-w-2xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="mono text-[11px] text-muted-foreground">
              {detail ? `${detail.leaderName} · ${detail.leaderStudentId} · ${detail.leaderCollege}` : ''}
            </span>
            <Button variant="glass" onClick={() => setDetail(null)}>
              关闭
            </Button>
          </div>
        }
      >
        {detail ? detailBody(detail) : <div className="flex flex-col gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>}
      </Drawer>
    </AdminPage>
  );
}

/* ---------------------------------------------------------------------------
 * 小结构
 * ------------------------------------------------------------------------ */
function InfoBlock({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        <span className="text-primary/80">{icon}</span>
        {label}
      </p>
      {children}
    </div>
  );
}

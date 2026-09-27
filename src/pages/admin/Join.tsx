import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  BarChart3,
  Clock3,
  GraduationCap,
  Mail,
  Phone,
  Search as SearchIcon,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react';

import { AdminApi, apiFull, qs } from '@/lib/api';
import { useDebounced, useTitle } from '@/lib/hooks';
import { useToast } from '@/lib/store';
import { APPLY_STATUS, fdatetime, fnum, plain } from '@/lib/utils';
import { Button, Chip, ConfirmDialog, Drawer, ErrorState, Glass, SearchInput, Skeleton, Tabs } from '@/components/ui';
import { AdminPage, BarList, Column, DataTable, ExportButton, ReviewActions, RowBtn, StatTile, StatusChip } from '@/components/AdminKit';

/* =============================================================================
 * 类型
 * ========================================================================== */
type ApplyStatus = 'pending' | 'reviewing' | 'approved' | 'rejected';

interface JoinRow {
  id: number;
  positionId: number | null;
  positionName: string | null;
  name: string;
  studentId: string;
  college: string;
  major: string;
  grade: string;
  phone: string;
  email: string | null;
  skills: string;
  intro: string;
  status: ApplyStatus;
  reviewNote: string | null;
  createdAt: string;
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
 * 招新报名管理 /admin/join
 * ========================================================================== */
export default function AdminJoin() {
  useTitle('招新报名管理');
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 380);

  const [rows, setRows] = useState<JoinRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  /* 全量数据（用于按岗位聚合） */
  const [allRows, setAllRows] = useState<JoinRow[]>([]);

  const [detail, setDetail] = useState<JoinRow | null>(null);
  const [confirmDel, setConfirmDel] = useState<JoinRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reviewing, setReviewing] = useState<number | null>(null);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiFull<any>(`/admin/join-applications?${qs({ page, pageSize: PAGE_SIZE, status, q })}`)
      .then((res) => {
        if (!alive) return;
        setRows((res.data?.items ?? []) as JoinRow[]);
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

  /* 岗位聚合 */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const first = await AdminApi.joinApplications({ page: 1, pageSize: 100 });
        const all = Number(first.data?.total ?? 0);
        let items = (first.data?.items ?? []) as JoinRow[];
        const pages = Math.min(20, Math.ceil(all / 100));
        for (let p = 2; p <= pages; p++) {
          const next = await AdminApi.joinApplications({ page: p, pageSize: 100 });
          items = items.concat((next.data?.items ?? []) as JoinRow[]);
        }
        if (alive) setAllRows(items);
      } catch {
        /* 忽略：聚合区会退化为按状态展示 */
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  /* 详情抽屉跟随列表状态刷新 */
  useEffect(() => {
    if (!detail) return;
    const next = rows.find((r) => r.id === detail.id);
    if (next) setDetail(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const byPosition = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of allRows) {
      const key = r.positionName || '未选择岗位';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [allRows]);

  const byStatus = useMemo(
    () =>
      (['pending', 'reviewing', 'approved', 'rejected'] as ApplyStatus[])
        .map((k) => ({ name: APPLY_STATUS[k], value: counts[k] ?? 0 }))
        .filter((i) => i.value > 0),
    [counts]
  );

  const countOf = (key: ApplyStatus | null) => (key ? counts[key] ?? 0 : Object.values(counts).reduce((a, b) => a + b, 0));

  const tabItems = useMemo(
    () => TABS.map((t) => ({ value: t.value, label: t.label, count: Object.keys(counts).length || !loading ? countOf(t.key) : undefined })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [counts, loading]
  );

  const doReview = async (row: JoinRow, next: string, note?: string) => {
    setReviewing(row.id);
    try {
      await AdminApi.reviewJoin(row.id, next, note);
      toast.success(`已${APPLY_STATUS[next] ?? next}`, `${row.name} · ${row.positionName ?? '未选岗位'}`);
      reload();
    } catch (e: any) {
      toast.error('审核失败', e.message);
    } finally {
      setReviewing(null);
    }
  };

  const remove = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await AdminApi.deleteJoin(confirmDel.id);
      toast.success('已删除报名记录', `${confirmDel.name} · ${confirmDel.studentId}`);
      setConfirmDel(null);
      setDetail(null);
      reload();
    } catch (e: any) {
      toast.error('删除失败', e.message);
    } finally {
      setDeleting(false);
    }
  };

  /* -------------------------------- 列定义 ------------------------------ */
  const columns: Column<JoinRow>[] = [
    {
      key: '__no',
      title: '#',
      width: '56px',
      render: (_r, i) => <span className="mono text-xs text-muted-foreground">{String((page - 1) * PAGE_SIZE + i + 1).padStart(2, '0')}</span>,
    },
    {
      key: 'name',
      title: '姓名',
      width: '110px',
      render: (r) => <span className="whitespace-nowrap text-[13px] font-medium">{r.name}</span>,
    },
    {
      key: 'studentId',
      title: '学号',
      width: '124px',
      render: (r) => <span className="mono whitespace-nowrap text-xs text-muted-foreground">{r.studentId}</span>,
    },
    {
      key: 'college',
      title: '学院',
      className: 'hidden md:table-cell',
      render: (r) => <span className="block max-w-[170px] truncate text-[13px] text-foreground/80">{r.college || '—'}</span>,
    },
    {
      key: 'major',
      title: '专业',
      className: 'hidden lg:table-cell',
      render: (r) => <span className="block max-w-[150px] truncate text-[13px] text-foreground/75">{r.major || '—'}</span>,
    },
    {
      key: 'grade',
      title: '年级',
      width: '80px',
      className: 'hidden sm:table-cell',
      render: (r) => <span className="mono whitespace-nowrap text-xs text-foreground/80">{r.grade || '—'}</span>,
    },
    {
      key: 'phone',
      title: '手机',
      width: '130px',
      className: 'hidden sm:table-cell',
      render: (r) => <span className="mono whitespace-nowrap text-xs text-foreground/80">{r.phone || '—'}</span>,
    },
    {
      key: 'email',
      title: '邮箱',
      className: 'hidden xl:table-cell',
      render: (r) => (
        <span className="mono block max-w-[190px] truncate text-xs text-muted-foreground" title={r.email ?? ''}>
          {r.email || '—'}
        </span>
      ),
    },
    {
      key: 'position',
      title: '意向岗位',
      width: '150px',
      render: (r) =>
        r.positionName ? (
          <Chip tone="primary" className="!px-2.5 !py-0.5">
            <span className="clamp-1 max-w-[130px]">{r.positionName}</span>
          </Chip>
        ) : (
          <span className="text-[13px] text-muted-foreground">未选择</span>
        ),
    },
    {
      key: 'status',
      title: '状态',
      width: '100px',
      render: (r) => <StatusChip status={r.status} />,
    },
    {
      key: 'createdAt',
      title: '提交时间',
      width: '150px',
      className: 'hidden lg:table-cell',
      render: (r) => <span className="mono whitespace-nowrap text-xs text-muted-foreground">{fdatetime(r.createdAt)}</span>,
    },
  ];

  /* -------------------------------- 详情内容 ---------------------------- */
  const detailBody = (row: JoinRow) => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={row.status} />
        {row.positionName && <Chip tone="primary">{row.positionName}</Chip>}
        <span className="mono text-[11px] text-muted-foreground">#{row.id} · 提交于 {fdatetime(row.createdAt)}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KeyValue icon={<UserRound className="h-3.5 w-3.5" />} label="姓名 / 学号" value={`${row.name} · ${row.studentId}`} />
        <KeyValue icon={<GraduationCap className="h-3.5 w-3.5" />} label="学院 / 专业" value={`${row.college || '—'} · ${row.major || '—'}`} />
        <KeyValue icon={<GraduationCap className="h-3.5 w-3.5" />} label="年级" value={row.grade || '—'} />
        <KeyValue icon={<Phone className="h-3.5 w-3.5" />} label="手机" value={row.phone || '—'} />
        <KeyValue icon={<Mail className="h-3.5 w-3.5" />} label="邮箱" value={row.email || '—'} />
        <KeyValue icon={<Sparkles className="h-3.5 w-3.5" />} label="意向岗位" value={row.positionName || '未选择'} />
      </div>

      <SectionBlock icon={<Sparkles className="h-3.5 w-3.5" />} label="技能特长">
        {row.skills ? (
          <div className="flex flex-wrap gap-2">
            {row.skills
              .split(/[、,，/|]/)
              .map((s) => s.trim())
              .filter(Boolean)
              .map((s, i) => (
                <span key={i} className="chip !px-3 !py-1">
                  {s}
                </span>
              ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">未填写</p>
        )}
      </SectionBlock>

      <SectionBlock icon={<Users className="h-3.5 w-3.5" />} label="自我介绍">
        <p className="whitespace-pre-wrap rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3 text-[13px] leading-relaxed text-foreground/80">
          {row.intro || '未填写'}
        </p>
      </SectionBlock>

      <SectionBlock icon={<BadgeCheck className="h-3.5 w-3.5" />} label="审核意见">
        {row.reviewNote ? (
          <p className="whitespace-pre-wrap rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3 text-[13px] leading-relaxed text-foreground/80">
            {row.reviewNote}
          </p>
        ) : (
          <p className="text-[13px] text-muted-foreground">尚无审核意见</p>
        )}
      </SectionBlock>
    </div>
  );

  return (
    <AdminPage
      title="招新报名"
      breadcrumb="后台管理 · 业务办理"
      icon={<Users className="h-5 w-5" />}
      description="审阅新成员申请：技能特长、自我介绍与意向岗位一目了然，支持受理、通过与驳回（附审核意见）。"
      actions={<ExportButton kind="join" label="导出招新汇总" />}
    >
      {/* ---------------------------- 统计 + 岗位分布 ---------------------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3" data-reveal>
        <div className="grid grid-cols-2 gap-3 xl:col-span-2">
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
            hint="已加入科技创新部"
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

        <Glass tone="soft" className="p-5" data-reveal>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[13px] font-medium">
              <BarChart3 className="h-4 w-4 text-primary" />
              岗位报名分布
            </p>
            <span className="mono text-[11px] text-muted-foreground">共 {fnum(allRows.length)} 人</span>
          </div>
          {loading && !allRows.length ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6" />
              ))}
            </div>
          ) : byPosition.length ? (
            <BarList items={byPosition} />
          ) : byStatus.length ? (
            <BarList items={byStatus} />
          ) : (
            <p className="text-[13px] text-muted-foreground">暂无报名数据</p>
          )}
        </Glass>
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
            placeholder="搜索姓名 / 学号 / 学院…"
          />
        </div>
      </Glass>

      {/* -------------------------------- 表格 -------------------------------- */}
      {error ? (
        <Glass tone="soft">
          <ErrorState message={error} onRetry={reload} />
        </Glass>
      ) : (
        <DataTable<JoinRow>
          columns={columns}
          rows={rows}
          loading={loading}
          empty="暂无报名记录"
          emptyDescription={status === 'all' && !q ? '招新通道开启后，同学的报名会出现在这里。' : '换个状态或清空搜索关键词试试。'}
          onRowClick={(row) => setDetail(row)}
          rowActions={(row) => (
            <div className={reviewing === row.id ? 'flex items-center justify-end gap-1 opacity-60' : 'flex items-center justify-end gap-1'}>
              <RowBtn icon={Trash2} label="删除" tone="danger" onClick={() => setConfirmDel(row)} />
            </div>
          )}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      )}

      <p className="text-[11px] text-muted-foreground">提示：点击任意一行查看自我介绍、技能特长与审核；行内「删除」用于清理重复或无效报名。</p>

      {/* ------------------------------ 删除确认 ------------------------------ */}
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={remove}
        loading={deleting}
        title="删除招新报名"
        confirmText="确认删除"
        description={
          <>
            该操作不可撤销，报名人的所有信息将被移除。
            {confirmDel && (
              <span className="mono mt-2 block text-xs text-muted-foreground">
                {confirmDel.name} · {confirmDel.studentId} · {confirmDel.positionName ?? '未选岗位'}
              </span>
            )}
          </>
        }
      />

      {/* ------------------------------ 详情抽屉 ------------------------------ */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.name} · 招新报名` : '报名详情'}
        width="max-w-2xl"
        footer={
          detail ? (
            <div className="flex flex-col gap-4">
              <ReviewActions current={detail.status} onReview={(s, note) => void doReview(detail, s, note)} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="danger" size="sm" onClick={() => setConfirmDel(detail)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  删除报名
                </Button>
                <Button variant="glass" onClick={() => setDetail(null)}>
                  关闭
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detail ? (
          detailBody(detail)
        ) : (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        )}
      </Drawer>
    </AdminPage>
  );
}

/* ---------------------------------------------------------------------------
 * 小结构
 * ------------------------------------------------------------------------ */
function KeyValue({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5">
      <p className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <span className="text-primary/80">{icon}</span>
        {label}
      </p>
      <p className="clamp-1 text-[13px] text-foreground/85">{value}</p>
    </div>
  );
}

function SectionBlock({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
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

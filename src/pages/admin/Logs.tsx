import { useEffect, useMemo, useState } from 'react';
import { Database, Download, Eraser, HardDriveDownload, Info, RefreshCw, ScrollText, ShieldCheck, Table2 } from 'lucide-react';
import { AdminApi, getToken } from '@/lib/api';
import { useApi, useDebounced, useRevealScan, useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { cn, fdatetime, fnum, fromNow } from '@/lib/utils';
import { AdminPage, DataTable, ExportButton, FilterBar, type Column } from '@/components/AdminKit';
import { Button, Chip, ConfirmDialog, EmptyState, ErrorState, Glass, Skeleton, Tabs } from '@/components/ui';

interface LogRow {
  id: number;
  userId?: number | null;
  userName?: string | null;
  action: string;
  target?: string | null;
  detail?: string | null;
  ip?: string | null;
  createdAt?: string;
}

interface DbRow {
  id: number;
  table: string;
  label: string;
  rows: number;
}

/* 数据表中文名（数据库概览用） */
const TABLE_LABELS: Record<string, string> = {
  users: '用户账号',
  articles: '新闻文章',
  activities: '活动',
  activity_signups: '活动报名',
  projects: '项目展示',
  competitions: '竞赛信息',
  project_applications: '项目申报',
  resources: '资源文件',
  join_positions: '招新岗位',
  join_applications: '招新报名',
  feedback: '留言反馈',
  gallery_areas: '画廊区域',
  gallery_images: '画廊图片',
  members: '成员',
  timeline: '发展历程',
  org_nodes: '组织架构',
  changelog: '更新日志',
  operation_logs: '操作日志',
  user_messages: '站内消息',
};

/* 导出快捷入口 */
const EXPORTS = [
  { kind: 'signups', label: '报名名单 CSV', desc: '按活动汇总报名、签到与联系方式' },
  { kind: 'applications', label: '项目申报 CSV', desc: '项目申报明细与审核状态' },
  { kind: 'join', label: '招新报名 CSV', desc: '招新申请人的资料与意向岗位' },
  { kind: 'feedback', label: '留言反馈 CSV', desc: '留言内容、处理状态与回复' },
];

/* =============================================================================
 * 操作日志与数据备份
 * ========================================================================== */
export default function Logs() {
  useTitle('操作日志与备份');
  const toast = useToast();
  const { isSuperAdmin, user } = useAuth();
  const [tab, setTab] = useState('logs');

  /* ------------------------------ 操作日志 ------------------------------ */
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 380);

  const { data, loading, error, reload } = useApi<any>(() => AdminApi.logs({ page, pageSize, q }), [page, pageSize, q]);

  const rows: LogRow[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  useEffect(() => {
    setPage(1);
  }, [q]);

  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const clearLogs = async () => {
    setClearing(true);
    try {
      await AdminApi.clearLogs();
      toast.success('日志已清空', '所有历史操作记录已删除');
      setClearOpen(false);
      setPage(1);
      reload();
    } catch (e: any) {
      toast.error('清空失败', e.message);
    } finally {
      setClearing(false);
    }
  };

  const columns: Column<LogRow>[] = useMemo(
    () => [
      {
        key: 'createdAt',
        title: '时间',
        width: '170px',
        render: (l) => (
          <div>
            <p className="mono text-[11.5px] text-foreground/80">{fdatetime(l.createdAt)}</p>
            <p className="text-[10.5px] text-muted-foreground">{fromNow(l.createdAt)}</p>
          </div>
        ),
      },
      {
        key: 'userName',
        title: '操作人',
        width: '120px',
        render: (l) => (
          <span className="text-[12.5px] text-foreground/85">
            {l.userName || '系统'}
            {l.userId === user?.id && <span className="ml-1.5 text-[10px] text-primary">我</span>}
          </span>
        ),
      },
      {
        key: 'action',
        title: '动作',
        width: '150px',
        render: (l) => <span className="text-[12.5px] text-foreground/85">{l.action}</span>,
      },
      {
        key: 'target',
        title: '目标',
        width: '130px',
        render: (l) => (l.target ? <Chip className="!px-2 !py-0.5 !text-[10.5px]">{l.target}</Chip> : <span className="text-xs text-muted-foreground">—</span>),
      },
      {
        key: 'detail',
        title: '详情',
        width: '280px',
        render: (l) => <span className="clamp-1 text-xs text-muted-foreground">{l.detail || '—'}</span>,
      },
      {
        key: 'ip',
        title: 'IP',
        width: '130px',
        render: (l) => <span className="mono text-[11px] text-muted-foreground">{l.ip || '—'}</span>,
      },
    ],
    [user?.id]
  );

  /* ------------------------------ 数据备份 ------------------------------ */
  const {
    data: dbRows,
    loading: dbLoading,
    error: dbError,
    reload: reloadDb,
  } = useApi<any[]>(() => AdminApi.dbSummary(), [], { enabled: tab === 'backup' });

  const dbColumns: Column<DbRow>[] = useMemo(
    () => [
      {
        key: 'label',
        title: '数据表',
        width: '220px',
        render: (r) => <span className="text-[12.5px] text-foreground/85">{r.label}</span>,
      },
      {
        key: 'table',
        title: '表名',
        width: '220px',
        render: (r) => <span className="mono text-[11px] text-muted-foreground">{r.table}</span>,
      },
      {
        key: 'rows',
        title: '行数',
        width: '160px',
        render: (r) => (
          <div className="flex items-center gap-3">
            <span className={cn('mono text-[12.5px] tabular-nums', r.rows > 0 ? 'text-foreground/85' : 'text-muted-foreground')}>
              {fnum(r.rows)}
            </span>
            <span className="h-1 w-24 overflow-hidden rounded-full bg-white/8">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-primary/70 to-primary/30"
                style={{ width: `${Math.min(100, (r.rows / Math.max(1, ...(dbRows ?? []).map((x) => x.rows))) * 100)}%` }}
              />
            </span>
          </div>
        ),
      },
    ],
    [dbRows]
  );

  const dbTableRows: DbRow[] = useMemo(
    () => (dbRows ?? []).map((r, i) => ({ id: i + 1, table: r.table, label: TABLE_LABELS[r.table] ?? r.table, rows: r.rows })),
    [dbRows]
  );

  const totalRecords = useMemo(() => (dbRows ?? []).reduce((s, r) => s + (r.rows || 0), 0), [dbRows]);

  const [backingUp, setBackingUp] = useState(false);

  const downloadBackup = async () => {
    if (!isSuperAdmin) {
      toast.error('权限不足', '仅超级管理员可以导出完整备份');
      return;
    }
    setBackingUp(true);
    try {
      const res = await fetch('/api/admin/backup', { headers: { Authorization: `Bearer ${getToken() ?? ''}` } });
      if (!res.ok) throw new Error(res.status === 403 ? '仅超级管理员可以导出完整备份' : `备份失败（${res.status}）`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const cd = res.headers.get('content-disposition') ?? '';
      const m = /filename="?([^"]+)"?/.exec(cd);
      a.download = m ? decodeURIComponent(m[1]) : `sti-portal-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('备份已导出', 'JSON 快照已开始下载');
    } catch (e: any) {
      toast.error('导出失败', e.message);
    } finally {
      setBackingUp(false);
    }
  };

  /* 本页为懒加载路由，且内容随页签 / 数据变化重绘 —— 重新扫描滚动揭示 */
  useRevealScan(`${tab}-${loading ? 'l' : 'i'}-${data ? 'd' : 'n'}-${dbLoading ? 'dl' : 'di'}-${dbRows ? 'dd' : 'dn'}`);

  return (
    <AdminPage
      title="操作日志与备份"
      description="审计后台的全部写操作，并导出站点数据快照用于归档或迁移。"
      breadcrumb="后台管理"
      icon={<ScrollText className="h-6 w-6" />}
      actions={
        <>
          <Button variant="glass" onClick={() => (tab === 'logs' ? reload() : reloadDb())} disabled={loading || dbLoading}>
            <RefreshCw className={cn('h-3.5 w-3.5', (loading || dbLoading) && 'animate-spin')} />
            刷新
          </Button>
          {tab === 'logs' ? (
            <Button
              variant="danger"
              onClick={() => (isSuperAdmin ? setClearOpen(true) : toast.error('权限不足', '仅超级管理员可以清空日志'))}
            >
              <Eraser className="h-3.5 w-3.5" />
              清空日志
            </Button>
          ) : (
            <Button variant="primary" onClick={downloadBackup} loading={backingUp}>
              <HardDriveDownload className="h-3.5 w-3.5" />
              导出完整备份
            </Button>
          )}
        </>
      }
    >
      <div data-reveal>
        <Tabs
          items={[
            { value: 'logs', label: '操作日志', count: tab === 'logs' ? total : undefined },
            { value: 'backup', label: '数据备份' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'logs' ? (
        <>
          <FilterBar
            search={search}
            onSearch={setSearch}
            placeholder="搜索操作人 / 动作 / 详情…"
            extra={
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <ScrollText className="h-3.5 w-3.5" />
                共 <span className="mono text-foreground/85">{total}</span> 条记录
              </div>
            }
          />
          {error ? (
            <Glass tone="soft">
              <ErrorState message={error} onRetry={reload} />
            </Glass>
          ) : (
            <DataTable<LogRow>
              columns={columns}
              rows={rows}
              loading={loading && !data}
              dense
              empty={search ? '没有匹配的日志' : '暂无操作日志'}
              emptyDescription={search ? '试试更换关键词。' : '后台的写操作（新建、修改、删除、审核、导出等）都会记录在这里。'}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          )}
        </>
      ) : (
        <>
          <Glass tone="soft" className="flex items-start gap-3 p-4" data-reveal>
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="text-[12.5px] leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground/85">关于数据备份</p>
              <p className="mt-1">
                完整备份是一份 JSON 快照，包含文章、活动、报名、项目、竞赛、资源、招新、留言、画廊、成员、组织架构、更新日志、站点设置与页面等
                <b className="text-foreground/85">全部业务数据</b>，但不包含用户密码哈希，可安全归档。
              </p>
              {!isSuperAdmin && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[hsl(var(--warning))]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  当前账号不是超级管理员，无法导出完整备份与清空日志。
                </p>
              )}
            </div>
          </Glass>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3" data-reveal>
            <Glass tone="soft" className="p-5 sm:p-6 xl:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Table2 className="h-4 w-4 text-primary" />
                    数据库概览
                  </h2>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">各数据表当前行数，用于评估数据规模与备份体积</p>
                </div>
                {(dbRows ?? []).length > 0 && (
                  <Chip tone="primary">
                    合计 <span className="mono ml-1">{fnum(totalRecords)}</span> 行
                  </Chip>
                )}
              </div>
              <div className="mt-5">
                {dbError ? (
                  <ErrorState message={dbError} onRetry={reloadDb} />
                ) : dbLoading && !dbRows ? (
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-11" />
                    ))}
                  </div>
                ) : dbTableRows.length ? (
                  <DataTable<DbRow> columns={dbColumns} rows={dbTableRows} dense />
                ) : (
                  <EmptyState icon={<Database className="h-5 w-5" />} title="暂无数据表信息" />
                )}
              </div>
            </Glass>

            <div className="flex flex-col gap-6">
              <Glass tone="soft" className="p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Download className="h-4 w-4 text-primary" />
                  数据导出
                </h2>
                <p className="mt-1 text-[11.5px] text-muted-foreground">导出为带 BOM 的 UTF-8 CSV，可直接用 Excel 打开</p>
                <div className="mt-5 flex flex-col gap-3">
                  {EXPORTS.map((e) => (
                    <div
                      key={e.kind}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3.5"
                    >
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-medium text-foreground/85">{e.label}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{e.desc}</p>
                      </div>
                      <ExportButton kind={e.kind} label="导出" />
                    </div>
                  ))}
                </div>
              </Glass>

              <Glass tone="soft" className="p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Database className="h-4 w-4 text-primary" />
                  完整备份
                </h2>
                <p className="mt-1 text-[11.5px] text-muted-foreground">
                  JSON 快照 · 排除用户密码 · 仅超级管理员可导出
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button variant="primary" onClick={downloadBackup} loading={backingUp}>
                    <HardDriveDownload className="h-3.5 w-3.5" />
                    导出完整备份
                  </Button>
                  <ExportButton kind="signups" label="顺带导出报名 CSV" />
                </div>
              </Glass>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={clearLogs}
        loading={clearing}
        title="清空操作日志"
        confirmText="确认清空"
        description={
          <>
            确定要清空全部操作日志吗？当前共 <span className="mono text-foreground/85">{total}</span> 条记录，清空后无法恢复。
            <span className="mono mt-2 block text-[11px] text-muted-foreground">
              操作人：{user?.name ?? '—'} · {fdatetime(new Date().toISOString())}
            </span>
          </>
        }
      />
    </AdminPage>
  );
}

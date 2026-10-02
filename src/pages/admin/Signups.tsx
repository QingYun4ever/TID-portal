import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Info, Percent, QrCode, Trash2, UserCheck, Users } from 'lucide-react';

import { AdminApi, apiFull, qs } from '@/lib/api';
import { useDebounced, useTitle } from '@/lib/hooks';
import { useToast } from '@/lib/store';
import { fdatetime, fnum } from '@/lib/utils';
import { Button, Chip, ConfirmDialog, ErrorState, Glass, Modal, ProgressBar, Select, Switch } from '@/components/ui';
import { AdminPage, Column, DataTable, ExportButton, FilterBar, QrPanel, RowBtn, StatTile } from '@/components/AdminKit';

/* =============================================================================
 * 类型
 * ========================================================================== */
interface SignupRow {
  id: number;
  activityId: number;
  name: string;
  studentId: string;
  college: string;
  major: string | null;
  phone: string;
  email: string | null;
  remark: string | null;
  checkedIn: boolean;
  createdAt: string;
  activityTitle: string | null;
}

interface ActivityOption {
  id: number;
  title: string;
  slug?: string;
  capacity: number;
  signedCount: number;
}

/* =============================================================================
 * 活动报名管理 /admin/signups
 * ========================================================================== */
export default function AdminSignups() {
  useTitle('活动报名管理');
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [activityId, setActivityId] = useState('all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 380);

  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [rows, setRows] = useState<SignupRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  /* 全局签到聚合（用于真实的签到率统计） */
  const [agg, setAgg] = useState<{ total: number; checkedIn: number }>({ total: 0, checkedIn: 0 });

  const [toggling, setToggling] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState<SignupRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrPayload, setQrPayload] = useState('');
  const [qrTitle, setQrTitle] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  /* --------------------------- 列表 + 活动下拉 --------------------------- */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiFull<any>(`/admin/signups?${qs({ page, pageSize: 20, activityId, q })}`)
      .then((res) => {
        if (!alive) return;
        setRows((res.data?.items ?? []) as SignupRow[]);
        setTotal(res.data?.total ?? 0);
        setActivities((res.activities ?? []) as ActivityOption[]);
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
  }, [page, activityId, q, reloadKey]);

  /* ------------------------------ 签到聚合 ------------------------------ */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const first = await AdminApi.signups({ page: 1, pageSize: 100 });
        const totalAll = Number(first.data?.total ?? 0);
        let items: any[] = first.data?.items ?? [];
        const pages = Math.min(40, Math.ceil(totalAll / 100));
        for (let p = 2; p <= pages; p++) {
          const next = await AdminApi.signups({ page: p, pageSize: 100 });
          items = items.concat(next.data?.items ?? []);
        }
        if (!alive) return;
        setAgg({ total: items.length, checkedIn: items.filter((r) => r.checkedIn).length });
      } catch {
        /* 统计失败不阻塞主流程 */
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  /* ------------------------------ 派生数据 ------------------------------ */
  const currentActivity = useMemo(
    () => (activityId === 'all' ? null : activities.find((a) => String(a.id) === activityId) ?? null),
    [activities, activityId]
  );

  const pageCheckedIn = rows.filter((r) => r.checkedIn).length;

  const stats = useMemo(() => {
    if (currentActivity) {
      const signed = currentActivity.signedCount;
      const cap = currentActivity.capacity || 0;
      return {
        total: signed,
        checkedIn: null as number | null,
        rate: cap ? Math.min(100, Math.round((signed / cap) * 100)) : 0,
      };
    }
    const rate = agg.total ? Math.round((agg.checkedIn / agg.total) * 100) : 0;
    return { total: agg.total, checkedIn: agg.checkedIn, rate };
  }, [agg, currentActivity]);

  /* -------------------------------- 签到 -------------------------------- */
  const toggleCheckin = async (row: SignupRow, next: boolean) => {
    setToggling(row.id);
    try {
      await AdminApi.checkin(row.id, next);
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, checkedIn: next } : r)));
      setAgg((a) => ({ ...a, checkedIn: Math.max(0, a.checkedIn + (next ? 1 : -1)) }));
      toast.success(next ? '已标记签到' : '已取消签到', row.name);
    } catch (e: any) {
      toast.error('操作失败', e.message);
    } finally {
      setToggling(null);
    }
  };

  /* -------------------------------- 删除 -------------------------------- */
  const remove = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await AdminApi.deleteSignup(confirmDel.id);
      toast.success('已删除报名记录', `${confirmDel.name} · ${confirmDel.studentId}`);
      setConfirmDel(null);
      reload();
    } catch (e: any) {
      toast.error('删除失败', e.message);
    } finally {
      setDeleting(false);
    }
  };

  /* ------------------------------ 签到二维码 ----------------------------- */
  const openQr = async () => {
    if (!currentActivity) return;
    setQrTitle(currentActivity.title);
    setQrPayload(`STI-CHECKIN:${currentActivity.id}:${currentActivity.slug ?? ''}`);
    setQrOpen(true);
    setQrLoading(true);
    try {
      const d = await apiFull<any>(`/admin/signups/qrcode/${currentActivity.id}`);
      if (d?.payload) setQrPayload(String(d.payload));
    } catch {
      /* 后端不可用时使用前端构造的等价 payload */
    } finally {
      setQrLoading(false);
    }
  };

  /** 把二维码渲染进新窗口打印（SVG 自带尺寸，不依赖外部资源） */
  const printQr = async () => {
    if (!qrPayload) return;
    try {
      const { qrSvg } = await import('@/lib/qrcode');
      const svg = qrSvg(qrPayload, { ecl: 'M', dark: '#0B0F14', light: '#FFFFFF', quiet: 3 });
      const win = window.open('', '_blank', 'width=760,height=920');
      if (!win) {
        toast.error('浏览器拦截了弹出窗口', '请允许本站弹出窗口后重试');
        return;
      }
      win.document.write(
        `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" /><title>签到二维码 · ${escapeHtml(qrTitle)}</title>` +
          `<style>body{margin:0;font-family:"Noto Sans SC","Microsoft YaHei",system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#fff;color:#0B0F14}` +
          `.card{text-align:center;padding:40px 48px}h1{font-size:24px;margin:0 0 8px}p{margin:4px 0;font-size:14px;color:#4b5563}` +
          `.qr{width:340px;height:340px;margin:24px auto}.qr svg{width:100%;height:100%}.code{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#6b7280;word-break:break-all;max-width:420px;margin:16px auto 0}</style>` +
          `</head><body><div class="card"><h1>${escapeHtml(qrTitle)}</h1><p>请使用手机扫描下方二维码完成现场签到</p><div class="qr">${svg}</div><p class="code">${escapeHtml(qrPayload)}</p></div>` +
          `<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`
      );
      win.document.close();
    } catch (e: any) {
      toast.error('打印失败', e.message);
    }
  };

  /* -------------------------------- 列定义 ------------------------------ */
  const columns: Column<SignupRow>[] = [
    {
      key: '__no',
      title: '#',
      width: '56px',
      render: (_r, i) => <span className="mono text-xs text-muted-foreground">{String((page - 1) * 20 + i + 1).padStart(2, '0')}</span>,
    },
    {
      key: 'activity',
      title: '活动名称',
      width: '300px',
      render: (r) => (
        <span className="clamp-1 block w-[300px] max-w-[300px] text-[13px] text-foreground/90" title={r.activityTitle ?? ''}>
          {r.activityTitle ?? '—'}
        </span>
      ),
    },
    {
      key: 'name',
      title: '姓名',
      width: '100px',
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
      title: '班级',
      className: 'hidden md:table-cell',
      render: (r) => <span className="block max-w-[180px] truncate text-[13px] text-foreground/80">{r.college || '—'}</span>,
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
      key: 'createdAt',
      title: '报名时间',
      width: '150px',
      className: 'hidden lg:table-cell',
      render: (r) => <span className="mono whitespace-nowrap text-xs text-muted-foreground">{fdatetime(r.createdAt)}</span>,
    },
    {
      key: 'checkedIn',
      title: '签到状态',
      width: '132px',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <Switch
            checked={!!r.checkedIn}
            onChange={(v) => void toggleCheckin(r, v)}
            label={toggling === r.id ? '…' : r.checkedIn ? '已签到' : '未签到'}
          />
        </div>
      ),
    },
    {
      key: 'remark',
      title: '备注',
      className: 'hidden xl:table-cell',
      render: (r) => (
        <span className="block max-w-[160px] truncate text-[12px] text-muted-foreground" title={r.remark ?? ''}>
          {r.remark || '—'}
        </span>
      ),
    },
  ];

  const errorState = error ? (
    <Glass tone="soft">
      <ErrorState message={error} onRetry={reload} />
    </Glass>
  ) : null;

  return (
    <AdminPage
      title="活动报名"
      breadcrumb="后台管理 · 业务办理"
      icon={<UserCheck className="h-5 w-5" />}
      description="查看、检索与导出各活动的报名名单，支持现场签到标记与签到二维码生成。"
      actions={
        <>
          <ExportButton kind="signups" params={activityId !== 'all' ? { activityId } : undefined} label="导出报名名单" />
          <Button variant="glass" onClick={openQr} disabled={!currentActivity} title={currentActivity ? '生成该活动的签到二维码' : '请先选择一个具体活动'}>
            <QrCode className="h-3.5 w-3.5" />
            生成签到二维码
          </Button>
        </>
      }
    >
      {/* ------------------------------ 活动选择 ------------------------------ */}
      <Glass tone="soft" className="flex flex-col gap-5 p-5" data-reveal>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-md">
            <label className="field-label" htmlFor="signup-activity">
              活动筛选
            </label>
            <Select
              id="signup-activity"
              value={activityId}
              onChange={(e) => {
                setActivityId(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">全部活动（{fnum(agg.total)} 条报名）</option>
              {activities.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.title}（{a.signedCount}/{a.capacity || '不限'}）
                </option>
              ))}
            </Select>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground lg:max-w-sm">
            选择具体活动后，导出与签到二维码都会限定在该活动内；不选则面向全部活动的报名记录。
          </p>
        </div>

        {currentActivity ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="clamp-1 text-sm font-medium">{currentActivity.title}</p>
                <p className="mono mt-1 text-[11px] text-muted-foreground">
                  已报名 <span className="text-primary">{currentActivity.signedCount}</span> 人 · 名额 {currentActivity.capacity || '不限'}
                </p>
              </div>
              <Chip tone={currentActivity.capacity && currentActivity.signedCount >= currentActivity.capacity ? 'danger' : 'primary'}>
                {currentActivity.capacity
                  ? currentActivity.signedCount >= currentActivity.capacity
                    ? '名额已满'
                    : `剩余 ${currentActivity.capacity - currentActivity.signedCount} 个名额`
                  : '不限名额'}
              </Chip>
            </div>
            <ProgressBar
              className="mt-3.5"
              value={currentActivity.signedCount}
              max={currentActivity.capacity || Math.max(1, currentActivity.signedCount)}
              tone={currentActivity.capacity && currentActivity.signedCount >= currentActivity.capacity ? 'danger' : 'primary'}
            />
          </div>
        ) : (
          <div className="flex items-start gap-2.5 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-[12px] text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" />
            <span>当前展示全部活动的报名记录。想查看名额进度或生成签到二维码，请在上方选择具体活动。</span>
          </div>
        )}
      </Glass>

      {/* ------------------------------- 统计条 ------------------------------- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" data-reveal>
        <StatTile label="总报名数" value={fnum(stats.total)} hint="条报名记录" tone="primary" icon={<Users className="h-4 w-4" />} />
        <StatTile
          label="已签到数"
          value={stats.checkedIn === null ? '—' : fnum(stats.checkedIn)}
          hint={stats.checkedIn === null ? '选择具体活动后按页显示' : '现场扫码/手动标记'}
          tone="success"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatTile
          label="签到率"
          value={`${stats.rate}%`}
          hint={currentActivity ? '按活动名额计算' : '全部报名记录'}
          tone={stats.rate >= 60 ? 'success' : stats.rate >= 30 ? 'warning' : 'danger'}
          icon={<Percent className="h-4 w-4" />}
        />
        <StatTile
          label="当前页已签到"
          value={`${pageCheckedIn} / ${rows.length}`}
          hint={currentActivity ? '本页签到进度' : `全部活动 · 共 ${activities.length} 个活动`}
          tone="accent"
          icon={<CalendarDays className="h-4 w-4" />}
        />
      </div>

      {/* ------------------------------- 搜索栏 ------------------------------- */}
      <FilterBar
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="搜索姓名 / 学号 / 班级…"
        extra={
          <span className="mono ml-auto text-[11px] text-muted-foreground">
            共 {fnum(total)} 条 · 每页 20 条
          </span>
        }
      />

      {/* -------------------------------- 表格 -------------------------------- */}
      {errorState ?? (
        <DataTable<SignupRow>
          columns={columns}
          rows={rows}
          loading={loading}
          empty="暂无报名记录"
          emptyDescription="换一个活动或清空搜索关键词试试。"
          rowActions={(row) => <RowBtn icon={Trash2} label="删除报名" tone="danger" onClick={() => setConfirmDel(row)} />}
          page={page}
          pageSize={20}
          total={total}
          onPageChange={setPage}
        />
      )}

      {/* ------------------------------ 删除确认 ------------------------------ */}
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={remove}
        loading={deleting}
        title="删除报名记录"
        confirmText="确认删除"
        description={
          <>
            删除后该同学的报名信息与签到状态将无法恢复，如已发送通知请另行说明。
            {confirmDel && (
              <span className="mono mt-2 block text-xs text-muted-foreground">
                {confirmDel.name} · {confirmDel.studentId} · {confirmDel.activityTitle ?? '—'}
              </span>
            )}
          </>
        }
      />

      {/* ------------------------------ 签到二维码 ---------------------------- */}
      <Modal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        title="签到二维码"
        description="投屏或打印张贴在现场，参会同学扫码完成签到。"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setQrOpen(false)}>
              关闭
            </Button>
            <Button variant="primary" onClick={() => void printQr()} disabled={!qrPayload}>
              打印二维码
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <QrPanel
            payload={qrPayload || 'STI-CHECKIN:pending'}
            title={qrTitle || '活动签到'}
            subtitle={qrLoading ? '正在获取二维码数据…' : qrPayload}
          />

          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
            <p className="mb-3 text-[12px] font-medium text-foreground/90">签到流程</p>
            <ol className="flex flex-col gap-2.5 text-[12px] leading-relaxed text-muted-foreground">
              {[
                '活动开始前 15 分钟，把本二维码投屏到签到台显示屏，或打印后张贴在入口。',
                '同学用微信 / 相机扫码，进入签到页并确认姓名、学号后提交。',
                '工作人员在「报名名单」中核对，必要时用表格中的开关手动补签或取消签到。',
                '签到结束后点击「导出报名名单」，CSV 中的「已签到」列即为现场签到结果。',
              ].map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mono mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] text-primary">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Modal>
    </AdminPage>
  );
}

function escapeHtml(s: string) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Hourglass,
  Mail,
  MessageSquare,
  Phone,
  ThumbsUp,
  Timer,
  Trash2,
  UserRound,
} from 'lucide-react';

import { AdminApi } from '@/lib/api';
import { useTitle } from '@/lib/hooks';
import { useToast } from '@/lib/store';
import { FEEDBACK_TYPES, cn, fdatetime, fromNow, plain } from '@/lib/utils';
import {
  Button,
  Chip,
  ConfirmDialog,
  ErrorState,
  Field,
  Glass,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui';
import { AdminPage, ExportButton, StatTile } from '@/components/AdminKit';

/* =============================================================================
 * 类型
 * ========================================================================== */
interface FeedbackRow {
  id: number;
  type: string;
  title: string;
  content: string;
  contact: string | null;
  anonymous: boolean;
  authorName: string | null;
  status: string;
  reply: string | null;
  repliedAt: string | null;
  likes: number;
  userId: number | null;
  createdAt: string;
}

const PAGE_SIZE = 10;

/** 后端种子数据中同时存在 answered / replied 两种“已回复”状态 */
const STATUS_LABEL: Record<string, string> = {
  open: '待处理',
  replied: '已回复',
  answered: '已回复',
  closed: '已关闭',
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'open', label: '待处理' },
  { value: 'replied', label: '已回复' },
  { value: 'closed', label: '已关闭' },
];

const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: '全部类型' },
  ...Object.entries(FEEDBACK_TYPES).map(([value, label]) => ({ value, label })),
];

const TYPE_TONE: Record<string, 'primary' | 'accent' | 'success' | 'warning' | 'danger'> = {
  consult: 'primary',
  suggestion: 'accent',
  question: 'warning',
  vote: 'success',
};

/* =============================================================================
 * 留言反馈管理 /admin/feedback
 * ========================================================================== */
export default function AdminFeedback() {
  useTitle('留言反馈管理');
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');

  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  /** 全量数据：用于统计与状态筛选计数 */
  const [allItems, setAllItems] = useState<FeedbackRow[]>([]);

  const [replyTarget, setReplyTarget] = useState<FeedbackRow | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const [confirmDel, setConfirmDel] = useState<FeedbackRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    AdminApi.feedback({ page, pageSize: PAGE_SIZE, status, type })
      .then((res) => {
        if (!alive) return;
        setRows((res.data?.items ?? []) as FeedbackRow[]);
        setTotal(Number(res.data?.total ?? 0));
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
  }, [page, status, type, reloadKey]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const first = await AdminApi.feedback({ page: 1, pageSize: 100 });
        const all = Number(first.data?.total ?? 0);
        let items = (first.data?.items ?? []) as FeedbackRow[];
        const pages = Math.min(20, Math.ceil(all / 100));
        for (let p = 2; p <= pages; p++) {
          const next = await AdminApi.feedback({ page: p, pageSize: 100 });
          items = items.concat((next.data?.items ?? []) as FeedbackRow[]);
        }
        if (alive) setAllItems(items);
      } catch {
        /* 统计失败不影响主列表 */
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  /* ------------------------------ 统计 ------------------------------ */
  const stats = useMemo(() => {
    const isReplied = (s: string) => s === 'replied' || s === 'answered';
    const open = allItems.filter((f) => f.status === 'open').length;
    const replied = allItems.filter((f) => isReplied(f.status)).length;
    const closed = allItems.filter((f) => f.status === 'closed').length;

    const spans = allItems
      .filter((f) => isReplied(f.status) && f.repliedAt)
      .map((f) => {
        const a = new Date(String(f.createdAt).replace(' ', 'T')).getTime();
        const b = new Date(String(f.repliedAt).replace(' ', 'T')).getTime();
        return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, b - a) : null;
      })
      .filter((n): n is number => n !== null);

    const avgMs = spans.length ? spans.reduce((a, b) => a + b, 0) / spans.length : null;
    const avgLabel =
      avgMs === null ? '—' : avgMs < 3600_000 ? `${Math.max(1, Math.round(avgMs / 60000))} 分钟` : avgMs < 86400_000 ? `${(avgMs / 3600000).toFixed(1)} 小时` : `${(avgMs / 86400000).toFixed(1)} 天`;

    const totalLikes = allItems.reduce((a, f) => a + (f.likes || 0), 0);

    return { open, replied, closed, total: allItems.length, avgLabel, samples: spans.length, totalLikes };
  }, [allItems]);

  const countOfStatus = useCallback(
    (v: string) => {
      if (v === 'all') return stats.total;
      if (v === 'replied') return allItems.filter((f) => f.status === 'replied' || f.status === 'answered').length;
      return allItems.filter((f) => f.status === v).length;
    },
    [allItems, stats.total]
  );

  /* ------------------------------ 操作 ------------------------------ */
  const openReply = (row: FeedbackRow) => {
    setReplyTarget(row);
    setReplyText(row.reply ?? '');
  };

  const submitReply = async () => {
    if (!replyTarget) return;
    if (!replyText.trim()) {
      toast.error('请填写回复内容');
      return;
    }
    setReplying(true);
    try {
      await AdminApi.replyFeedback(replyTarget.id, replyText.trim());
      toast.success('回复已发送', plain(replyTarget.title, 24));
      setReplyTarget(null);
      setReplyText('');
      reload();
    } catch (e: any) {
      toast.error('回复失败', e.message);
    } finally {
      setReplying(false);
    }
  };

  const setMessageStatus = async (row: FeedbackRow, next: 'closed' | 'open') => {
    setBusyId(row.id);
    try {
      await AdminApi.replyFeedback(row.id, '', next);
      toast.success(next === 'closed' ? '已关闭该留言' : '已重新打开', plain(row.title, 24));
      reload();
    } catch (e: any) {
      toast.error('操作失败', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await AdminApi.deleteFeedback(confirmDel.id);
      toast.success('已删除留言', plain(confirmDel.title, 24));
      setConfirmDel(null);
      reload();
    } catch (e: any) {
      toast.error('删除失败', e.message);
    } finally {
      setDeleting(false);
    }
  };

  /* ------------------------------ 卡片 ------------------------------ */
  const Card = ({ row }: { row: FeedbackRow }) => {
    const replied = row.status === 'replied' || row.status === 'answered';
    const displayName = row.anonymous ? '匿名' : row.authorName || '未填写';
    return (
      <Glass tone="soft" hover className="flex flex-col gap-4 p-5" data-reveal>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Chip tone={TYPE_TONE[row.type] ?? 'default'} className="!px-2.5 !py-0.5">
              {FEEDBACK_TYPES[row.type] ?? row.type}
            </Chip>
            <span
              className={cn(
                'chip !px-2.5 !py-0.5',
                row.status === 'open' ? 'chip-warning' : replied ? 'chip-success' : ''
              )}
            >
              {STATUS_LABEL[row.status] ?? row.status}
            </span>
            <span className="mono text-[11px] text-muted-foreground">#{row.id}</span>
          </div>
          <span className="mono shrink-0 text-[11px] text-muted-foreground" title={fdatetime(row.createdAt)}>
            {fromNow(row.createdAt)}
          </span>
        </div>

        <div className="min-w-0">
          <h3 className="text-[15px] font-medium leading-snug text-foreground/95">{row.title}</h3>
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/75">{row.content}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5" />
            <span className={row.anonymous ? 'italic opacity-80' : ''}>{displayName}</span>
            {row.userId ? <span className="mono opacity-70">· 已登录用户</span> : null}
          </span>
          {row.contact ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              <span className="mono truncate">{row.contact}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              <span>未留联系方式</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <ThumbsUp className="h-3.5 w-3.5" />
            <span className="mono">{row.likes}</span> 次点赞
          </span>
        </div>

        {row.reply ? (
          <div className="rounded-2xl border border-[hsl(var(--success))]/22 bg-[hsl(var(--success))]/[0.06] p-4">
            <p className="mb-2 flex items-center gap-2 text-[11px] text-[hsl(var(--success))]">
              <MessageSquare className="h-3.5 w-3.5" />
              官方回复
              <span className="mono ml-auto text-muted-foreground">{row.repliedAt ? fdatetime(row.repliedAt) : ''}</span>
            </p>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/85">{row.reply}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2.5 border-t border-white/8 pt-4">
          <Button variant={replied ? 'glass' : 'primary'} size="sm" onClick={() => openReply(row)}>
            <MessageSquare className="h-3.5 w-3.5" />
            {replied ? '修改回复' : '回复'}
          </Button>
          {row.status === 'closed' ? (
            <Button variant="glass" size="sm" loading={busyId === row.id} onClick={() => void setMessageStatus(row, 'open')}>
              重新打开
            </Button>
          ) : (
            <Button variant="ghost" size="sm" loading={busyId === row.id} onClick={() => void setMessageStatus(row, 'closed')}>
              关闭
            </Button>
          )}
          <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground hover:text-[hsl(var(--destructive))]" onClick={() => setConfirmDel(row)}>
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </Button>
        </div>
      </Glass>
    );
  };

  return (
    <AdminPage
      title="留言反馈"
      breadcrumb="后台管理 · 业务办理"
      icon={<MessageSquare className="h-5 w-5" />}
      description="处理同学与访客的在线咨询、意见反馈、问题解答与问卷投票，回复会同步推送到留言人的站内消息。"
      actions={<ExportButton kind="feedback" label="导出留言汇总" />}
    >
      {/* ------------------------------- 统计 ------------------------------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-reveal>
        <StatTile
          label="待处理"
          value={stats.open}
          hint="尚未回复的留言"
          tone="warning"
          icon={<Hourglass className="h-4 w-4" />}
          active={status === 'open'}
          onClick={() => {
            setStatus(status === 'open' ? 'all' : 'open');
            setPage(1);
          }}
        />
        <StatTile
          label="已回复"
          value={stats.replied}
          hint={`已关闭 ${stats.closed} 条`}
          tone="success"
          icon={<CheckCircle2 className="h-4 w-4" />}
          active={status === 'replied'}
          onClick={() => {
            setStatus(status === 'replied' ? 'all' : 'replied');
            setPage(1);
          }}
        />
        <StatTile
          label="平均响应"
          value={stats.avgLabel}
          hint={stats.samples ? `基于 ${stats.samples} 条已回复留言` : '暂无已回复留言'}
          tone="primary"
          icon={<Timer className="h-4 w-4" />}
        />
        <StatTile
          label="累计点赞"
          value={stats.totalLikes}
          hint={`全部留言 ${stats.total} 条`}
          tone="accent"
          icon={<ThumbsUp className="h-4 w-4" />}
        />
      </div>

      {/* ------------------------------ 筛选区 ------------------------------- */}
      <Glass tone="soft" className="flex flex-wrap items-center gap-3 p-4" data-reveal>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-auto min-w-[150px]"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
              {s.value !== 'all' ? `（${countOfStatus(s.value)}）` : `（${stats.total}）`}
            </option>
          ))}
        </Select>

        <Select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="w-auto min-w-[150px]"
        >
          {TYPE_FILTERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>

        <span className="mono ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" />
          共 {total} 条 · 第 {page} / {Math.max(1, Math.ceil(total / PAGE_SIZE))} 页
        </span>
      </Glass>

      {/* ------------------------------- 列表 ------------------------------- */}
      {error ? (
        <Glass tone="soft">
          <ErrorState message={error} onRetry={reload} />
        </Glass>
      ) : loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : rows.length ? (
        <>
          <div className="flex flex-col gap-4">
            {rows.map((row) => (
              <Card key={row.id} row={row} />
            ))}
          </div>
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              共 <span className="mono text-foreground">{total}</span> 条 · 每页 {PAGE_SIZE} 条
            </p>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
          </div>
        </>
      ) : (
        <Glass tone="soft">
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <MessageSquare className="mb-4 h-8 w-8 text-muted-foreground/70" />
            <h3 className="text-base font-medium">暂无留言</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              当前筛选条件下没有留言记录，换个状态或类型再看看。
            </p>
            {(status !== 'all' || type !== 'all') && (
              <Button
                variant="glass"
                size="sm"
                className="mt-5"
                onClick={() => {
                  setStatus('all');
                  setType('all');
                  setPage(1);
                }}
              >
                清空筛选
              </Button>
            )}
          </div>
        </Glass>
      )}

      {/* ------------------------------ 回复弹窗 ------------------------------ */}
      <Modal
        open={!!replyTarget}
        onClose={() => {
          setReplyTarget(null);
          setReplyText('');
        }}
        title={replyTarget?.reply ? '修改回复' : '回复留言'}
        description="回复内容会展示在门户留言区，并以站内消息推送给留言人。"
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setReplyTarget(null);
                setReplyText('');
              }}
              disabled={replying}
            >
              取消
            </Button>
            <Button variant="primary" onClick={() => void submitReply()} loading={replying} disabled={!replyText.trim()}>
              发送回复
            </Button>
          </>
        }
      >
        {replyTarget ? (
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Chip tone={TYPE_TONE[replyTarget.type] ?? 'default'} className="!px-2.5 !py-0.5">
                  {FEEDBACK_TYPES[replyTarget.type] ?? replyTarget.type}
                </Chip>
                <span className="mono text-[11px] text-muted-foreground">{fdatetime(replyTarget.createdAt)}</span>
                <span className="mono ml-auto text-[11px] text-muted-foreground">
                  {replyTarget.anonymous ? '匿名' : replyTarget.authorName || '未填写'}
                  {replyTarget.contact ? ` · ${replyTarget.contact}` : ''}
                </span>
              </div>
              <p className="text-[14px] font-medium">{replyTarget.title}</p>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/75">{replyTarget.content}</p>
            </div>

            <Field label="回复内容" required hint="建议说明处理结论、后续安排或可联系的工作人员，避免仅回复“已收到”。">
              <Textarea
                rows={6}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="例如：可以跨班级组队，报名时由队长统一提交即可，具体流程见《科技比赛报名指南》第 3 章。"
              />
            </Field>
          </div>
        ) : null}
      </Modal>

      {/* ------------------------------ 删除确认 ------------------------------ */}
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={remove}
        loading={deleting}
        title="删除留言"
        confirmText="确认删除"
        description={
          <>
            删除后该留言及其回复将无法恢复。
            {confirmDel && <span className="mono mt-2 block text-xs text-muted-foreground">{plain(confirmDel.title, 50)}</span>}
          </>
        }
      />
    </AdminPage>
  );
}

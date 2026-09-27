import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowUpRight,
  Bell,
  BellOff,
  CheckCheck,
  Inbox,
  Mail,
  MailOpen,
  Trash2,
} from 'lucide-react';

import { AuthApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { cn, fdatetime, fromNow } from '@/lib/utils';
import { Button, Chip, ConfirmDialog, EmptyState, ErrorState, Glass, LinkButton, Skeleton } from '@/components/ui';

/* =============================================================================
 * 用户中心 · 我的消息
 * AuthApi.messages() 返回完整响应 { ok, data, unread }
 * ========================================================================== */

interface MessageRow {
  id: number;
  title: string;
  content: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export default function Messages() {
  const { refresh } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  useTitle('我的消息');

  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [marking, setMarking] = useState(false);
  const [confirm, setConfirm] = useState<MessageRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, meta, loading, error, reload, setData } = useApi<MessageRow[]>(() => AuthApi.messages(), []);
  const list = data ?? [];
  const unread = meta?.unread ?? list.filter((m) => !m.read).length;

  const shown = useMemo(() => (tab === 'unread' ? list.filter((m) => !m.read) : list), [list, tab]);

  const syncStats = () => void refresh();

  /* 单条已读 */
  const markRead = async (m: MessageRow) => {
    if (m.read) return;
    setBusyId(m.id);
    try {
      await AuthApi.readMessages(m.id);
      setData(list.map((x) => (x.id === m.id ? { ...x, read: true } : x)));
      syncStats();
    } catch (e: any) {
      toast.error('操作失败', e?.message);
    } finally {
      setBusyId(null);
    }
  };

  /* 全部已读 */
  const markAll = async () => {
    if (!unread) {
      toast.info('没有未读消息');
      return;
    }
    setMarking(true);
    try {
      await AuthApi.readMessages();
      setData(list.map((x) => ({ ...x, read: true })));
      syncStats();
      toast.success('已全部标为已读', `共处理 ${unread} 条未读消息。`);
    } catch (e: any) {
      toast.error('操作失败', e?.message);
    } finally {
      setMarking(false);
    }
  };

  /* 点击消息：先标已读，若有 link 再跳转 */
  const open = async (m: MessageRow) => {
    await markRead(m);
    if (m.link) navigate(m.link);
  };

  const doDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      await AuthApi.deleteMessage(confirm.id);
      setData(list.filter((x) => x.id !== confirm.id));
      syncStats();
      toast.success('消息已删除');
      setConfirm(null);
    } catch (e: any) {
      toast.error('删除失败', e?.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">我的消息</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            项目审核结果、活动通知与系统提醒都会发送到这里。当前
            <span className="mono text-[hsl(var(--warning))]"> {unread} </span>条未读，共
            <span className="mono text-foreground"> {list.length} </span>条。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="glass" size="sm" onClick={markAll} loading={marking} disabled={!unread}>
            <CheckCheck className="h-3.5 w-3.5" /> 全部标为已读
          </Button>
          <Button variant="ghost" size="sm" onClick={reload}>
            刷新
          </Button>
        </div>
      </div>

      {/* 筛选 */}
      <div className="inline-flex w-fit gap-1 rounded-full border border-white/10 bg-white/[0.045] p-1 backdrop-blur-xl">
        {([
          { value: 'all', label: '全部', count: list.length },
          { value: 'unread', label: '未读', count: unread },
        ] as const).map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              'rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-300',
              tab === t.value
                ? 'bg-white/12 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.22)]'
                : 'text-muted-foreground hover:text-foreground/85'
            )}
          >
            {t.label}
            <span className={cn('mono ml-1.5 text-[10px]', tab === t.value ? 'text-primary' : 'text-muted-foreground/70')}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {error ? (
        <Glass tone="soft">
          <ErrorState message={error} onRetry={reload} />
        </Glass>
      ) : loading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px]" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Glass tone="soft">
          <EmptyState
            icon={tab === 'unread' ? <BellOff className="h-5 w-5" /> : <Inbox className="h-5 w-5" />}
            title={tab === 'unread' ? '没有未读消息' : '收件箱是空的'}
            description={
              tab === 'unread'
                ? '所有消息都已读，保持得不错。'
                : '提交活动报名或项目申报后，审核进度与系统通知会出现在这里。'
            }
            action={
              tab === 'unread' ? (
                <Button onClick={() => setTab('all')}>查看全部消息</Button>
              ) : (
                <div className="flex flex-wrap justify-center gap-3">
                  <LinkButton to="/account/applications" variant="primary">
                    我的项目
                  </LinkButton>
                  <LinkButton to="/activities">浏览活动</LinkButton>
                </div>
              )
            }
          />
        </Glass>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {shown.map((m, i) => (
            <li key={m.id} data-reveal="scale" style={{ transitionDelay: `${Math.min(i, 6) * 45}ms` }}>
              <Glass
                tone="soft"
                hover
                className={cn(
                  'relative overflow-hidden p-0 transition-colors duration-300',
                  !m.read && 'border-primary/25 bg-primary/[0.045]'
                )}
              >
                {!m.read && <span className="absolute left-0 top-0 h-full w-[3px] rounded-r-full bg-primary" />}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`打开消息：${m.title}`}
                  onClick={() => open(m)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      void open(m);
                    }
                  }}
                  className="flex cursor-pointer items-start gap-4 p-5 pl-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
                      m.read
                        ? 'border-white/10 bg-white/[0.04] text-muted-foreground'
                        : 'border-primary/35 bg-primary/12 text-primary'
                    )}
                  >
                    {m.read ? <MailOpen className="h-4.5 w-4.5" /> : <Mail className="h-4.5 w-4.5" />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!m.read ? (
                        <Chip tone="primary" className="!px-2 !py-0 !text-[10px]">
                          <Bell className="h-3 w-3" /> 未读
                        </Chip>
                      ) : (
                        <Chip className="!px-2 !py-0 !text-[10px]">已读</Chip>
                      )}
                      <h3 className={cn('clamp-1 text-[14.5px]', m.read ? 'font-medium text-foreground/80' : 'font-semibold')}>
                        {m.title}
                      </h3>
                    </div>
                    <p className="clamp-3 mt-2 text-[13px] leading-relaxed text-muted-foreground">{m.content}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
                      <span className="mono" title={fdatetime(m.createdAt, true)}>
                        {fdatetime(m.createdAt)}
                      </span>
                      <span>{fromNow(m.createdAt)}</span>
                      {m.link && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void open(m);
                          }}
                          className="inline-flex items-center gap-1 font-medium text-primary transition hover:gap-2"
                        >
                          查看详情 <ArrowUpRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {!m.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={busyId === m.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void markRead(m);
                        }}
                        className="whitespace-nowrap"
                      >
                        标为已读
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="删除消息"
                      className="text-muted-foreground hover:text-[hsl(var(--destructive))]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirm(m);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {m.link && (
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void open(m);
                        }}
                        className="whitespace-nowrap"
                      >
                        前往
                      </Button>
                    )}
                  </div>
                </div>
              </Glass>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => (deleting ? undefined : setConfirm(null))}
        onConfirm={doDelete}
        loading={deleting}
        title="删除消息"
        confirmText="确认删除"
        description={confirm ? `确定删除「${confirm.title}」吗？删除后无法恢复。` : ''}
      />
    </div>
  );
}

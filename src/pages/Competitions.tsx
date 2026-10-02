import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BellRing,
  Building2,
  CalendarClock,
  CircleSlash,
  Mail,
  Trophy,
} from 'lucide-react';

import { PublicApi, SubmitApi } from '@/lib/api';
import { useApi, useDebounced, useRevealScan, useTitle } from '@/lib/hooks';
import { useToast } from '@/lib/store';
import { cn, countdown, daysLeft, fdate } from '@/lib/utils';
import { CompetitionCard } from '@/components/cards';
import {
  Button,
  Chip,
  Countdown,
  EmptyState,
  ErrorState,
  Field,
  Glass,
  Input,
  Modal,
  PageHero,
  SearchInput,
  Skeleton,
  Tabs,
} from '@/components/ui';

/* =============================================================================
 * 竞赛信息 /competitions
 *  - 级别 Tabs（全部/国家级/市级/区级/校级，带数量）+ 搜索
 *  - 顶部突出「最近截止」竞赛（大字 + 实时倒计时）
 *  - 每张卡支持订阅截止提醒（邮箱）
 *  - 已截止竞赛灰化并归入「已结束」
 * ========================================================================== */

const LEVEL_ORDER = ['国家级', '市级', '区级', '校级'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** 是否已截止（无截止时间视为未截止） */
function isExpired(c: any) {
  if (!c?.signupDeadline) return false;
  const d = daysLeft(c.signupDeadline);
  return d !== null && d < 0;
}

export default function Competitions() {
  useTitle('竞赛信息');
  const toast = useToast();

  const [level, setLevel] = useState('all');
  const [qInput, setQInput] = useState('');
  const q = useDebounced(qInput, 320);

  const [subscribeTarget, setSubscribeTarget] = useState<any | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const { data, meta, loading, error, reload } = useApi<any[]>(
    () => PublicApi.competitions({ q, level }),
    [level, q]
  );

  const items = data ?? [];
  const levelCounts: Record<string, number> = useMemo(() => {
    const out: Record<string, number> = {};
    for (const l of (meta?.levels ?? []) as { name: string; count: number }[]) out[l.name] = l.count;
    return out;
  }, [meta]);

  useRevealScan(`competitions-${level}-${q}-${items.length}`);

  const active = useMemo(() => items.filter((c) => !isExpired(c)), [items]);
  const expired = useMemo(() => items.filter((c) => isExpired(c)), [items]);
  const featured = active[0] ?? null;
  const rest = active.slice(1);

  const tabs = [
    { value: 'all', label: '全部级别', count: LEVEL_ORDER.reduce((s, k) => s + (levelCounts[k] ?? 0), 0) },
    ...LEVEL_ORDER.map((k) => ({ value: k, label: k, count: levelCounts[k] ?? 0 })),
  ];

  const openSubscribe = (c: any) => {
    setSubscribeTarget(c);
    setEmailError(null);
  };

  const closeSubscribe = () => {
    if (sending) return;
    setSubscribeTarget(null);
    setEmail('');
    setEmailError(null);
  };

  const submitSubscribe = async () => {
    const value = email.trim();
    if (!value) {
      setEmailError('请输入邮箱地址');
      return;
    }
    if (!EMAIL_RE.test(value)) {
      setEmailError('邮箱格式不正确，请检查后重试');
      return;
    }
    if (!subscribeTarget) return;
    setEmailError(null);
    setSending(true);
    try {
      await SubmitApi.subscribeCompetition(subscribeTarget.id, value);
      toast.success('订阅成功', `「${subscribeTarget.title}」截止前，我们会通过 ${value} 提醒你。`);
      setSubscribeTarget(null);
      setEmail('');
    } catch (e: any) {
      toast.error('订阅失败', e?.message || '请稍后重试');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Competitions"
        title="竞赛信息"
        description="聚合国家级、市级、区级与校级科技赛事信息，按截止时间先后排列。订阅截止提醒，不错过任何一次报名窗口。"
        breadcrumb={[{ label: '竞赛信息' }]}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-[12px] text-muted-foreground">
          <span className="mono flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            进行中 <span className="text-foreground">{active.length}</span> 项
          </span>
          <span className="text-white/15">|</span>
          <span className="mono">已结束 {expired.length} 项</span>
          <span className="text-white/15">|</span>
          <span>按截止时间由近到远排序</span>
        </div>
      </PageHero>

      <div className="shell pb-24">
        {error ? (
          <Glass tone="soft" className="p-4">
            <ErrorState message={error} onRetry={reload} />
          </Glass>
        ) : (
          <>
            {/* ---------------- 筛选栏 ---------------- */}
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-reveal>
              <Tabs items={tabs} value={level} onChange={setLevel} />
              <SearchInput
                value={qInput}
                onChange={setQInput}
                placeholder="搜索竞赛名称、主办方…"
                className="w-full sm:w-72"
              />
            </div>

            {loading ? (
              <div className="flex flex-col gap-8">
                <Skeleton className="h-[268px]" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-[286px]" />
                  ))}
                </div>
              </div>
            ) : !items.length ? (
              <Glass tone="soft">
                <EmptyState
                  icon={<Trophy className="h-5 w-5" />}
                  title="没有找到相关竞赛"
                  description={q ? '换个关键词试试，或切换到其他级别查看。' : '该级别下暂时没有已发布的竞赛信息。'}
                  action={
                    <Button
                      onClick={() => {
                        setQInput('');
                        setLevel('all');
                      }}
                    >
                      查看全部竞赛
                    </Button>
                  }
                />
              </Glass>
            ) : (
              <div className="flex flex-col gap-14">
                {/* ---------------- 最近截止 ---------------- */}
                {featured && (
                  <section data-reveal>
                    <div className="mb-5 flex items-center gap-2.5">
                      <CalendarClock className="h-4 w-4 text-[hsl(var(--warning))]" />
                      <h2 className="text-[15px] font-semibold">最近截止</h2>
                      <span className="mono text-[11px] text-muted-foreground">按截止时间取最近一项</span>
                    </div>
                    <FeaturedCompetition competition={featured} onSubscribe={openSubscribe} />
                  </section>
                )}

                {/* ---------------- 进行中列表 ---------------- */}
                {rest.length > 0 && (
                  <section>
                    <div className="mb-5 flex flex-wrap items-end justify-between gap-3" data-reveal>
                      <div className="flex items-center gap-2.5">
                        <Trophy className="h-4 w-4 text-primary" />
                        <h2 className="text-[15px] font-semibold">全部进行中竞赛</h2>
                      </div>
                      <span className="mono text-[11px] text-muted-foreground">共 {rest.length} 项</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {rest.map((c, i) => (
                        <CompetitionItem
                          key={c.id}
                          competition={c}
                          index={i}
                          onSubscribe={openSubscribe}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {!featured && rest.length === 0 && (
                  <Glass tone="soft">
                    <EmptyState
                      icon={<CircleSlash className="h-5 w-5" />}
                      title="当前没有进行中的竞赛"
                      description="所有已发布的竞赛均已截止，可在下方「已结束」区域回顾。"
                    />
                  </Glass>
                )}

                {/* ---------------- 已结束 ---------------- */}
                {expired.length > 0 && (
                  <section>
                    <div className="mb-5 flex flex-wrap items-end justify-between gap-3" data-reveal>
                      <div className="flex items-center gap-2.5">
                        <CircleSlash className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-[15px] font-semibold text-muted-foreground">已结束</h2>
                        <span className="mono text-[11px] text-muted-foreground/70">仅供回顾，无法再订阅提醒</span>
                      </div>
                      <span className="mono text-[11px] text-muted-foreground">共 {expired.length} 项</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {expired.map((c, i) => (
                        <CompetitionItem key={c.id} competition={c} index={i} expired onSubscribe={openSubscribe} />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ---------------- 订阅弹窗 ---------------- */}
      <Modal
        open={!!subscribeTarget}
        onClose={closeSubscribe}
        size="sm"
        title="订阅截止提醒"
        description={subscribeTarget ? `赛事：${subscribeTarget.title}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={closeSubscribe} disabled={sending}>
              取消
            </Button>
            <Button variant="primary" onClick={submitSubscribe} loading={sending}>
              <Mail className="h-4 w-4" />
              确认订阅
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <Field
            label="接收提醒的邮箱"
            required
            error={emailError}
            hint="截止前 7 天与 3 天各发送一次提醒，我们不会用于其他用途。"
          >
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && submitSubscribe()}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>

          {subscribeTarget?.signupDeadline && (
            <Glass tone="thin" className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="mono text-[11.5px] text-muted-foreground">
                报名截止 <span className="text-foreground/90">{fdate(subscribeTarget.signupDeadline)}</span>
              </span>
              <Countdown target={subscribeTarget.signupDeadline} className="text-[12px]" />
            </Glass>
          )}
        </div>
      </Modal>
    </>
  );
}

/* =============================================================================
 * 最近截止（大字 + 实时倒计时）
 * ========================================================================== */
function FeaturedCompetition({
  competition,
  onSubscribe,
}: {
  competition: any;
  onSubscribe: (c: any) => void;
}) {
  const cd = countdown(competition.signupDeadline);
  const urgent = cd && !cd.expired && cd.days <= 7;

  return (
    <Glass tone="strong" className="relative overflow-hidden p-7 sm:p-9">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-70 blur-3xl"
        style={{ background: 'radial-gradient(circle, hsl(var(--warning) / .22), transparent 68%)' }}
      />
      <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <Chip tone={competition.level === '国家级' ? 'primary' : competition.level === '市级' ? 'accent' : 'success'}>
              {competition.level}
            </Chip>
            {urgent && <Chip tone="danger">即将截止</Chip>}
            <span className="mono text-[11px] text-muted-foreground">距截止最近</span>
          </div>

          <h3 className="mt-4 text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            {competition.title}
          </h3>

          <p className="mt-3 flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="clamp-1">{competition.organizer}</span>
          </p>

          <p className="clamp-3 mt-4 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
            {competition.summary}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button variant={urgent ? 'primary' : 'glass'} onClick={() => onSubscribe(competition)}>
              <BellRing className="h-4 w-4" />
              订阅截止提醒
            </Button>
            {competition.link && (
              <a
                href={competition.link}
                target="_blank"
                rel="noreferrer noopener"
                className="btn btn-glass"
              >
                前往赛事官网 <ArrowUpRight className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        {/* 倒计时面板 */}
        <div className="flex flex-col justify-center rounded-3xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">报名截止倒计时</p>
          <p className="mono mt-4 text-3xl font-semibold leading-none sm:text-4xl">
            <Countdown target={competition.signupDeadline} />
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/8 pt-4 text-[11.5px] text-muted-foreground">
            <span className="mono">
              截止日期 <span className="text-foreground/90">{fdate(competition.signupDeadline)}</span>
            </span>
            {cd && !cd.expired && (
              <span className="mono">
                剩余 <span className="text-foreground/90">{cd.days}</span> 天
              </span>
            )}
          </div>
        </div>
      </div>
    </Glass>
  );
}

/* =============================================================================
 * 竞赛条目（卡片 + 订阅按钮；已截止灰化）
 * ========================================================================== */
function CompetitionItem({
  competition,
  index,
  expired = false,
  onSubscribe,
}: {
  competition: any;
  index: number;
  expired?: boolean;
  onSubscribe: (c: any) => void;
}) {
  return (
    <div
      className={cn('flex h-full flex-col', expired && 'opacity-55 saturate-50')}
      data-reveal="scale"
      style={{ transitionDelay: `${(index % 6) * 55}ms` }}
    >
      <div className="flex-1">
        <CompetitionCard competition={competition} />
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <Button
          size="sm"
          variant={expired ? 'ghost' : 'glass'}
          disabled={expired}
          onClick={() => onSubscribe(competition)}
          className="flex-1"
        >
          {expired ? <CircleSlash className="h-3.5 w-3.5" /> : <BellRing className="h-3.5 w-3.5" />}
          {expired ? '报名已截止' : '订阅截止提醒'}
        </Button>
      </div>
    </div>
  );
}

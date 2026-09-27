import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Clock,
  HelpCircle,
  Info,
  MessageSquare,
  Send,
  Shield,
  ThumbsUp,
  Timer,
  UserRound,
} from 'lucide-react';

import { ApiError, PublicApi, SubmitApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { FEEDBACK_TYPES, cn, fdate, fdatetime, fnum, fromNow } from '@/lib/utils';
import { useRevealScope } from '@/components/RevealScope';
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  Glass,
  Input,
  LinkButton,
  PageHero,
  Pagination,
  ProgressBar,
  Section,
  Skeleton,
  Switch,
  Tabs,
  Textarea,
} from '@/components/ui';

/* =============================================================================
 * 数据形状（对应 GET /api/feedback）
 * ========================================================================== */
interface FeedbackItem {
  id: number;
  type: string;
  title: string;
  content: string;
  anonymous: boolean;
  authorName: string | null;
  status: string;
  reply: string | null;
  repliedAt: string | null;
  likes: number;
  createdAt: string;
}

const PAGE_SIZE = 6;

const TYPE_TONE: Record<string, 'primary' | 'accent' | 'success' | 'warning'> = {
  consult: 'primary',
  suggestion: 'accent',
  question: 'success',
  vote: 'warning',
};

const STATUS_LABEL: Record<string, string> = {
  open: '待处理',
  replied: '已回复',
  answered: '已解答',
};

const STATUS_TONE: Record<string, 'warning' | 'success' | 'primary'> = {
  open: 'warning',
  replied: 'success',
  answered: 'primary',
};

/* 常见问题快捷入口：点击后自动填入留言表单 */
const QUICK_QUESTIONS: { q: string; type: string; body: string }[] = [
  {
    q: '大创项目可以跨学院组队吗？',
    type: 'question',
    body: '我来自其他学院，想和计算机学院的同学一起申报大创项目，请问跨学院组队是否需要额外流程或材料？',
  },
  {
    q: '创新工坊的设备怎么预约？',
    type: 'consult',
    body: '想使用创新工坊的 3D 打印与嵌入式开发设备完成项目原型，请问预约方式、开放时间与材料费用是怎样的？',
  },
  {
    q: '竞赛获奖如何认定学分？',
    type: 'question',
    body: '想确认中国国际大学生创新大赛等赛事的获奖认定标准，以及需要提交哪些材料才能完成学分认定。',
  },
  {
    q: '希望门户增加新功能',
    type: 'suggestion',
    body: '建议门户增加以下功能：（请补充你的具体想法与使用场景）',
  },
];

const SLA = [
  { t: '在线咨询', d: '24 小时内首次响应，工作日优先处理' },
  { t: '意见反馈', d: '3 个工作日内评估并给出处理计划' },
  { t: '问题解答', d: '1-2 个工作日内由对应工作组答复' },
  { t: '问卷投票', d: '投票结束后 3 日内公布统计结果' },
];

/* =============================================================================
 * 页面
 * ========================================================================== */
export default function Feedback() {
  useTitle('互动与反馈');

  const toast = useToast();
  const { user } = useAuth();
  /* 数据异步返回后才渲染出的 [data-reveal] 需要局部扫描才会揭示 */
  const revealRef = useRevealScope<HTMLDivElement>();

  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { data, meta, loading, error, reload } = useApi<any>(
    () => PublicApi.feedback({ page, pageSize: PAGE_SIZE, type, status }),
    [page, type, status]
  );

  const items: FeedbackItem[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const counts: Record<string, number> = meta?.counts ?? {};
  const answered: number = typeof meta?.answered === 'number' ? meta.answered : 0;
  const totalAll = useMemo(() => Object.values(counts).reduce((s, n) => s + n, 0), [counts]);

  const typeTabs = useMemo(
    () => [
      { value: 'all', label: '全部', count: totalAll },
      ...Object.entries(FEEDBACK_TYPES).map(([value, label]) => ({ value, label, count: counts[value] ?? 0 })),
    ],
    [counts, totalAll]
  );

  const statusTabs = [
    { value: 'all', label: '全部状态' },
    { value: 'open', label: '待处理' },
    { value: 'replied', label: '已回复' },
    { value: 'answered', label: '已解答' },
  ];

  /* ------------------------------ 点赞（本地去重） ------------------------------ */
  const [liked, setLiked] = useState<number[]>([]);
  const [likeOverride, setLikeOverride] = useState<Record<number, number>>({});
  const [liking, setLiking] = useState<number | null>(null);

  const like = async (item: FeedbackItem) => {
    if (liked.includes(item.id) || liking === item.id) return;
    setLiking(item.id);
    try {
      const out: any = await SubmitApi.likeFeedback(item.id);
      setLiked((l) => [...l, item.id]);
      setLikeOverride((m) => ({ ...m, [item.id]: typeof out?.likes === 'number' ? out.likes : item.likes + 1 }));
    } catch (e: any) {
      toast.error('点赞失败', e instanceof ApiError ? e.message : '请稍后重试');
    } finally {
      setLiking(null);
    }
  };

  /* ------------------------------ 留言表单 ------------------------------ */
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    type: 'consult',
    title: '',
    content: '',
    anonymous: true,
    authorName: '',
    contact: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nameFilled = useRef(false);

  useEffect(() => {
    if (!user || nameFilled.current) return;
    nameFilled.current = true;
    setForm((f) => ({
      ...f,
      authorName: f.authorName || user.name || '',
      contact: f.contact || user.email || user.phone || '',
    }));
  }, [user]);

  const set = (k: keyof typeof form) => (v: any) =>
    setForm((f) => {
      const next = { ...f, [k]: v };
      /* 关闭匿名时若未填姓名，自动补上当前登录用户 */
      if (k === 'anonymous' && v === false && !next.authorName && user?.name) next.authorName = user.name;
      return next;
    });

  const validate = () => {
    const e: Record<string, string> = {};
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title) e.title = '请填写标题';
    else if (title.length < 4) e.title = '标题至少 4 个字，便于我们归类处理';
    if (!content) e.content = '请填写具体内容';
    else if (content.length < 5) e.content = `内容至少 5 个字（当前 ${content.length} 字）`;
    if (!form.anonymous && !form.authorName.trim()) e.authorName = '实名提交时请填写姓名';
    if (!form.anonymous && form.contact.trim() && !/^([^@\s]+@[^@\s]+\.[A-Za-z]{2,}|1[3-9]\d{9})$/.test(form.contact.trim()))
      e.contact = '请填写有效邮箱或 11 位手机号';
    return e;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const errs = validate();
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) {
      toast.error('表单未通过校验', `还有 ${Object.keys(errs).length} 项需要修正`);
      return;
    }
    setSubmitting(true);
    try {
      await SubmitApi.feedback({
        type: form.type,
        title: form.title.trim(),
        content: form.content.trim(),
        anonymous: form.anonymous,
        authorName: form.anonymous ? null : form.authorName.trim(),
        contact: form.anonymous ? null : form.contact.trim() || null,
      });
      toast.success('留言已提交', form.anonymous ? '已匿名发布，我们会在承诺时限内回复' : '我们会通过你留下的联系方式回复');
      setForm((f) => ({ ...f, title: '', content: '', anonymous: true, contact: '' }));
      setErrors({});
      setPage(1);
      setType('all');
      setStatus('all');
      reload();
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : e?.message || '提交失败，请稍后重试';
      setFormError(msg);
      toast.error('提交失败', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const applyQuick = (q: (typeof QUICK_QUESTIONS)[number]) => {
    setForm((f) => ({ ...f, type: q.type, title: q.q, content: q.body }));
    setErrors({});
    setFormError(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div ref={revealRef}>
      <PageHero
        eyebrow="Feedback & Q&A"
        title="互动与反馈"
        description="在线咨询、意见反馈、问题解答与问卷投票都在这里。公开发布的留言会被其他同学看到，我们也会把答复留在同一处 —— 让一个人问过的问题，成为所有人的答案。"
        breadcrumb={[{ label: '互动与反馈' }]}
      >
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-[12px] text-muted-foreground">
          <span className="mono">共 {fnum(totalAll)} 条留言</span>
          <span className="mono">已解答 {fnum(answered)} 条</span>
          <span className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-primary" />
            工作日 24 小时内首次响应
          </span>
        </div>
      </PageHero>

      {/* ============================ 留言板 ============================ */}
      <Section
        id="board"
        eyebrow="Message Board"
        title="留言与咨询"
        description="按类型筛选留言，或查看全部状态。被回复的留言会在下方展开官方答复。"
      >
        <div className="flex flex-col gap-4">
          <div data-reveal>
            <Tabs
              items={typeTabs}
              value={type}
              onChange={(v) => {
                setType(v);
                setPage(1);
              }}
            />
          </div>
          <div data-reveal>
            <Tabs
              items={statusTabs}
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              size="sm"
              className="inline-block"
            />
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.65fr_1fr]">
          {/* ---------- 列表 ---------- */}
          <div className="flex flex-col gap-4">
            {error ? (
              <Glass tone="soft" className="p-4">
                <ErrorState message={error} onRetry={reload} />
              </Glass>
            ) : loading ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-44" />
                ))}
              </div>
            ) : items.length ? (
              <>
                {items.map((it, i) => (
                  <div key={it.id} data-reveal style={{ transitionDelay: `${(i % 4) * 60}ms` }}>
                    <FeedbackCard
                      item={it}
                      likes={likeOverride[it.id] ?? it.likes}
                      liked={liked.includes(it.id)}
                      liking={liking === it.id}
                      onLike={() => like(it)}
                    />
                  </div>
                ))}
                <Pagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onChange={setPage}
                  className="mt-6"
                />
              </>
            ) : (
              <Glass tone="soft" className="p-4">
                <EmptyState
                  icon={<MessageSquare className="h-5 w-5" />}
                  title="该条件下暂无留言"
                  description={
                    type === 'all' && status === 'all'
                      ? '还没有人留言，欢迎成为第一个提问的人。'
                      : '试试切换类型或状态筛选，或直接提交一条新的留言。'
                  }
                  action={
                    <div className="flex flex-wrap justify-center gap-3">
                      <Button
                        onClick={() => {
                          setType('all');
                          setStatus('all');
                          setPage(1);
                        }}
                      >
                        清除筛选条件
                      </Button>
                      <Button variant="ghost" onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                        去提交留言
                      </Button>
                    </div>
                  }
                />
              </Glass>
            )}
          </div>

          {/* ---------- 右侧栏 ---------- */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <Glass tone="soft" className="p-6" data-reveal="right">
              <h3 className="flex items-center gap-2.5 text-[15px] font-semibold">
                <HelpCircle className="h-4 w-4 text-primary" />
                常见问题快捷入口
              </h3>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                点击任一条，自动填入右侧留言表单并定位到输入区。
              </p>
              <div className="mt-4 flex flex-col gap-1">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q.q}
                    type="button"
                    onClick={() => applyQuick(q)}
                    className="group flex items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors duration-300 hover:bg-white/[0.05]"
                  >
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80 transition-transform group-hover:scale-125" />
                    <span className="min-w-0 flex-1 text-[13px] leading-snug text-foreground/85 transition-colors group-hover:text-primary">
                      {q.q}
                    </span>
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-70" />
                  </button>
                ))}
              </div>
              <LinkButton to="/resources?category=faq" size="sm" variant="glass" className="mt-5 w-full">
                资源中心常见问题
              </LinkButton>
            </Glass>

            <Glass tone="soft" className="p-6" data-reveal="right">
              <h3 className="flex items-center gap-2.5 text-[15px] font-semibold">
                <Timer className="h-4 w-4 text-[hsl(var(--warning))]" />
                回复时效说明
              </h3>
              <ul className="mt-4 flex flex-col gap-3.5">
                {SLA.map((s) => (
                  <li key={s.t} className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{s.t}</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-5 flex items-start gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                节假日与考试周的响应时间可能延后，紧急事项请直接联系部门邮箱。
              </p>
            </Glass>

            <Glass tone="soft" className="p-6" data-reveal="right">
              <h3 className="flex items-center gap-2.5 text-[15px] font-semibold">
                <BadgeCheck className="h-4 w-4 text-[hsl(var(--success))]" />
                已解答统计
              </h3>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="mono text-3xl font-semibold text-[hsl(var(--success))]">{fnum(answered)}</span>
                <span className="text-[12px] text-muted-foreground">/ {fnum(totalAll)} 条留言已解答</span>
              </div>
              <ProgressBar
                value={answered}
                max={totalAll || 1}
                tone="success"
                className="mt-4"
              />
              <div className="mt-5 flex flex-col gap-2.5 border-t border-white/8 pt-5">
                {Object.entries(FEEDBACK_TYPES).map(([k, label]) => (
                  <div key={k} className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                      {label}
                    </span>
                    <span className="mono text-foreground/80">{counts[k] ?? 0}</span>
                  </div>
                ))}
              </div>
            </Glass>
          </aside>
        </div>
      </Section>

      {/* ============================ 提交留言 ============================ */}
      <Section
        id="compose"
        eyebrow="Leave a Message"
        title="留下你的问题或建议"
        description="所有留言默认匿名展示。如果希望我们单独回复你，请关闭匿名开关并留下联系方式。"
      >
        <div ref={formRef} className="scroll-mt-28">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Glass tone="strong" className="p-6 sm:p-8" data-reveal>
              {formError && (
                <div
                  className="mb-6 flex items-start gap-3 rounded-2xl border border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/10 px-4 py-3.5"
                  style={{ animation: 'sti-pop .3s cubic-bezier(.22,1,.36,1) both' }}
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--destructive))]" />
                  <div className="min-w-0 text-[13px] leading-relaxed">
                    <p className="font-medium text-[hsl(var(--destructive))]">提交失败</p>
                    <p className="mt-1 text-foreground/75">{formError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                <Field label="留言类型" required hint="不同类型由不同工作组跟进，请选择最贴近的一项">
                  <Tabs
                    items={Object.entries(FEEDBACK_TYPES).map(([value, label]) => ({ value, label }))}
                    value={form.type}
                    onChange={(v) => set('type')(v)}
                    size="sm"
                  />
                </Field>

                <Field label="标题" required error={errors.title} hint={!errors.title ? '一句话概括你的问题或建议' : undefined}>
                  <Input
                    value={form.title}
                    onChange={(e) => set('title')(e.target.value)}
                    placeholder="如：大创项目可以跨学院组队吗？"
                    maxLength={80}
                    data-invalid={errors.title ? 'true' : undefined}
                  />
                </Field>

                <Field
                  label="具体内容"
                  required
                  error={errors.content}
                  hint={!errors.content ? `请尽量描述清楚，便于我们准确定位（当前 ${form.content.trim().length} 字）` : undefined}
                >
                  <Textarea
                    value={form.content}
                    onChange={(e) => set('content')(e.target.value)}
                    rows={6}
                    placeholder="补充背景信息、你已经尝试过的方法，或期望得到的答复形式…"
                    data-invalid={errors.content ? 'true' : undefined}
                  />
                </Field>

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <Switch
                    checked={form.anonymous}
                    onChange={(v) => set('anonymous')(v)}
                    label={form.anonymous ? '匿名提交（其他同学看不到你的身份）' : '实名提交（将展示你的姓名）'}
                  />
                  <p className="mt-3 flex items-start gap-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
                    <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                    匿名留言仅隐藏姓名与联系方式，我们仍会认真处理，但无法主动联系你。
                  </p>
                </div>

                {!form.anonymous && (
                  <div className="grid gap-5 sm:grid-cols-2" style={{ animation: 'sti-fade .3s ease both' }}>
                    <Field label="姓名" required error={errors.authorName}>
                      <Input
                        value={form.authorName}
                        onChange={(e) => set('authorName')(e.target.value)}
                        placeholder="将展示在留言上"
                        data-invalid={errors.authorName ? 'true' : undefined}
                      />
                    </Field>
                    <Field
                      label="联系方式"
                      error={errors.contact}
                      hint={!errors.contact ? '邮箱或手机号，仅部门成员可见' : undefined}
                    >
                      <Input
                        value={form.contact}
                        onChange={(e) => set('contact')(e.target.value)}
                        placeholder="name@university.edu.cn"
                        data-invalid={errors.contact ? 'true' : undefined}
                      />
                    </Field>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 border-t border-white/8 pt-6">
                  <Button type="submit" variant="primary" size="lg" loading={submitting}>
                    {submitting ? '提交中…' : '提交留言'}
                    {!submitting && <Send className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={submitting}
                    onClick={() => {
                      setForm((f) => ({ ...f, title: '', content: '' }));
                      setErrors({});
                      setFormError(null);
                    }}
                  >
                    清空
                  </Button>
                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                    提交后留言会立即出现在左侧列表中。
                  </p>
                </div>
              </form>
            </Glass>

            <div className="flex flex-col gap-4" data-reveal="right">
              <Glass tone="soft" className="p-6">
                <div className="eyebrow mb-4">How it works</div>
                <h3 className="text-[15px] font-semibold">留言之后会发生什么</h3>
                <div className="mt-6 flex flex-col">
                  {[
                    { t: '提交成功', d: '留言即时出现在左侧列表，状态为「待处理」' },
                    { t: '工作组分流', d: '按类型自动分派给对应工作组跟进' },
                    { t: '公开答复', d: '答复展示在留言下方，其他同学也能看到' },
                    { t: '状态更新', d: '留言状态变为「已回复」，可在原留言处查看' },
                  ].map((s, i, arr) => (
                    <div key={s.t} className="relative flex gap-4">
                      <div className="flex flex-col items-center">
                        <span className="mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/12 text-[11px] font-semibold text-primary">
                          {i + 1}
                        </span>
                        {i < arr.length - 1 && (
                          <span className="my-1 w-px flex-1 bg-gradient-to-b from-primary/40 to-transparent" />
                        )}
                      </div>
                      <div className={cn('min-w-0 flex-1', i < arr.length - 1 ? 'pb-5' : '')}>
                        <p className="text-[13.5px] font-medium">{s.t}</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{s.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Glass>

              {!user && (
                <Glass tone="thin" className="p-5">
                  <div className="flex items-center gap-2.5 text-[13px] font-medium">
                    <UserRound className="h-4 w-4 text-primary" />
                    登录后可追踪自己的留言
                  </div>
                  <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
                    登录后提交的留言会同步到「用户中心」，可随时查看处理进度与官方答复。
                  </p>
                  <LinkButton to="/login?redirect=%2Ffeedback" size="sm" className="mt-4 w-full">
                    去登录
                  </LinkButton>
                </Glass>
              )}
            </div>
          </div>
        </div>
      </Section>

      <div className="pb-24" />
    </div>
  );
}

/* =============================================================================
 * 留言卡片
 * ========================================================================== */
function FeedbackCard({
  item,
  likes,
  liked,
  liking,
  onLike,
}: {
  item: FeedbackItem;
  likes: number;
  liked: boolean;
  liking: boolean;
  onLike: () => void;
}) {
  const replied = !!item.reply || item.status !== 'open';
  const statusKey = item.status in STATUS_LABEL ? item.status : 'open';

  return (
    <Glass tone="soft" hover sheen className="p-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <Chip tone={TYPE_TONE[item.type] ?? 'primary'}>{FEEDBACK_TYPES[item.type] ?? item.type}</Chip>
        <Chip tone={STATUS_TONE[statusKey] ?? 'warning'}>{STATUS_LABEL[statusKey]}</Chip>
        <span className="mono ml-auto text-[11px] text-muted-foreground">{fromNow(item.createdAt)}</span>
      </div>

      <h3 className="mt-4 text-[16px] font-semibold leading-snug">{item.title}</h3>
      <p className="mt-2.5 whitespace-pre-line text-[13.5px] leading-relaxed text-foreground/75">{item.content}</p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5" />
            {item.anonymous || !item.authorName ? '匿名同学' : item.authorName}
          </span>
          <span className="text-white/15">|</span>
          <span className="mono">{fdatetime(item.createdAt)}</span>
        </div>

        <button
          type="button"
          onClick={onLike}
          disabled={liked || liking}
          aria-pressed={liked}
          className={cn(
            'chip transition-all duration-300',
            liked
              ? '!border-primary/45 !bg-primary/14 !text-primary'
              : 'hover:!border-primary/35 hover:!text-primary',
            liking && 'opacity-60'
          )}
        >
          <ThumbsUp className={cn('h-3.5 w-3.5', liked && 'fill-current')} />
          <span className="mono tabular-nums">{fnum(likes)}</span>
          <span>{liked ? '已点赞' : '有帮助'}</span>
        </button>
      </div>

      {replied && (
        <div className="mt-5 rounded-2xl border-l-2 border-primary/50 bg-primary/[0.07] px-5 py-4" data-reveal>
          <div className="flex flex-wrap items-center gap-2.5">
            <BadgeCheck className="h-4 w-4 text-primary" />
            <span className="text-[12px] font-medium text-primary">科技创新部 回复</span>
            {item.repliedAt && (
              <span className="mono ml-auto text-[10.5px] text-muted-foreground">{fdate(item.repliedAt)}</span>
            )}
          </div>
          <p className="mt-2.5 whitespace-pre-line text-[13px] leading-relaxed text-foreground/80">
            {item.reply || '该留言已受理并处理完毕，暂无公开的补充说明。'}
          </p>
        </div>
      )}
    </Glass>
  );
}

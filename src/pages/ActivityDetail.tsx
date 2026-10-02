import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Hourglass,
  Info,
  Lock,
  LogIn,
  MapPin,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

import { PublicApi, SubmitApi } from '@/lib/api';
import { useApi, useRevealScan, useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { cn, countdown, daysLeft, fbytes, fdatetime, fnum, fweek } from '@/lib/utils';
import {
  Button,
  Chip,
  Countdown,
  EmptyState,
  ErrorState,
  Field,
  Glass,
  Input,
  LinkButton,
  PageHero,
  ProgressBar,
  Skeleton,
  Textarea,
} from '@/components/ui';

/* =============================================================================
 * 活动详情 + 在线报名（/activities/:slug）
 *  - 顶部：面包屑、分类徽章、标题、时间（含星期）、地点、报名截止倒计时
 *  - 报名进度条 + 报名表单（未登录亦可报名，后端支持匿名报名）
 *  - 报名成功后展示已报名名单（仅姓氏 + 班级，隐私友好）
 * ========================================================================== */

type SignupForm = {
  name: string;
  studentId: string;
  college: string;
  major: string;
  phone: string;
  email: string;
  remark: string;
};

const EMPTY_FORM: SignupForm = {
  name: '',
  studentId: '',
  college: '',
  major: '',
  phone: '',
  email: '',
  remark: '',
};

type FormErrors = Partial<Record<keyof SignupForm, string>>;

function validateSignup(f: SignupForm): FormErrors {
  const e: FormErrors = {};

  const name = f.name.trim();
  if (!name) e.name = '请填写姓名';
  else if (!/^[\u4e00-\u9fa5A-Za-z·\s]{2,20}$/.test(name)) e.name = '姓名格式不正确（2–20 位中英文字符）';

  const sid = f.studentId.trim();
  if (!sid) e.studentId = '请填写学号';
  else if (!/^[A-Za-z0-9]{4,20}$/.test(sid)) e.studentId = '学号应为 4–20 位字母或数字';

  if (!f.college.trim()) e.college = '请填写所在班级';

  const phone = f.phone.trim();
  if (!phone) e.phone = '请填写手机号';
  else if (!/^1[3-9]\d{9}$/.test(phone)) e.phone = '手机号格式不正确（11 位，1 开头）';

  const email = f.email.trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(email)) e.email = '邮箱格式不正确';

  if (f.remark.length > 200) e.remark = '备注请控制在 200 字以内';

  return e;
}

/** 隐私友好展示：仅保留姓氏，其余字符打码 */
function maskName(name: string) {
  const s = (name || '').trim();
  if (!s) return '同学';
  if (/[\u4e00-\u9fa5]/.test(s)) return s.slice(0, 1) + '＊'.repeat(Math.max(1, s.length - 1));
  return s.slice(0, 1) + '***';
}

export default function ActivityDetail() {
  const { slug = '' } = useParams();
  const toast = useToast();
  const { user } = useAuth();

  const { data, meta, loading, error, reload } = useApi<any>(() => PublicApi.activity(slug), [slug]);
  useTitle(data?.title ?? '活动详情');

  const [mine, setMine] = useState(false);
  const [form, setForm] = useState<SignupForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [touchedForm, setTouchedForm] = useState(false);

  const activity = data ?? null;
  const signups: any[] = meta?.signups ?? [];
  const attachments: any[] = meta?.attachments ?? [];

  /* 详情数据与报名状态变化后重新扫描滚动揭示元素 */
  useRevealScan(`activity|${loading}|${mine}|${signups.length}|${attachments.length}`);

  /* ------------------------------ 报名状态 ------------------------------ */
  const status = useMemo(() => {
    if (!activity) return { closed: true, reason: '', capacityFull: false };
    const now = Date.now();
    const at = (v?: string | null) => (v ? new Date(String(v).replace(' ', 'T')).getTime() : null);
    const capacity = Number(activity.capacity ?? 0);
    const signed = Number(activity.signedCount ?? 0);
    const capacityFull = capacity > 0 && signed >= capacity;
    const endAt = at(activity.signupEnd);
    const startAt = at(activity.signupStart);
    const deadlinePassed = endAt !== null && endAt <= now;
    const notStarted = startAt !== null && startAt > now;

    let reason = '';
    if (activity.status !== 'published') reason = '该活动暂未开放报名';
    else if (capacityFull) reason = '报名名额已满';
    else if (deadlinePassed) reason = `报名已于 ${fdatetime(activity.signupEnd)} 截止`;
    else if (notStarted) reason = `报名将于 ${fdatetime(activity.signupStart)} 开始`;
    else if (activity.signupOpen === false) reason = '当前不在报名开放时间内';

    return { closed: !!reason, reason, capacityFull };
  }, [activity]);

  /* -------------------------- 登录用户预填信息 -------------------------- */
  useEffect(() => {
    if (!user || touchedForm) return;
    setForm((f) => ({
      ...f,
      name: f.name || user.name || '',
      studentId: f.studentId || user.studentId || '',
      college: f.college || user.college || '',
      phone: f.phone || user.phone || '',
      email: f.email || user.email || '',
    }));
  }, [user, touchedForm]);

  const set = (k: keyof SignupForm, v: string) => {
    setTouchedForm(true);
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity) return;
    setServerError(null);
    const errs = validateSignup(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error('报名信息不完整', '请检查标红的字段后重新提交');
      return;
    }
    setBusy(true);
    try {
      await SubmitApi.signupActivity(Number(activity.id), {
        name: form.name.trim(),
        studentId: form.studentId.trim(),
        college: form.college.trim(),
        major: form.major.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        remark: form.remark.trim() || null,
      });
      setMine(true);
      toast.success('报名成功', `你已成功报名「${activity.title}」。`);
      reload();
    } catch (err: any) {
      const msg = err?.message || '报名失败，请稍后重试';
      setServerError(msg);
      toast.error('报名失败', msg);
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------- 状态页 ------------------------------- */
  if (loading && !activity)
    return (
      <>
        <PageHero
          eyebrow="Event Detail"
          title="活动详情"
          breadcrumb={[{ label: '活动报名', to: '/activities' }, { label: '加载中…' }]}
        />
        <section className="shell pb-24">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex min-w-0 flex-col gap-6">
              <Skeleton className="h-36" />
              <Skeleton className="h-72" />
              <Skeleton className="h-96" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </section>
      </>
    );

  if (error || !activity)
    return (
      <>
        <PageHero
          eyebrow="Event Detail"
          title="活动不存在"
          breadcrumb={[{ label: '活动报名', to: '/activities' }, { label: '未找到' }]}
        />
        <section className="shell pb-24">
          <Glass tone="soft">
            {error ? (
              <ErrorState message={error} onRetry={reload} />
            ) : (
              <EmptyState
                icon={<AlertTriangle className="h-6 w-6" />}
                title="活动不存在或已下架"
                description="该活动可能已被删除或尚未发布，请返回活动列表浏览其他内容。"
                action={<LinkButton to="/activities">返回活动列表</LinkButton>}
              />
            )}
          </Glass>
        </section>
      </>
    );

  const capacity = Number(activity.capacity ?? 0);
  const signed = Number(activity.signedCount ?? 0);
  const left = daysLeft(activity.signupEnd);
  const cd = countdown(activity.signupEnd);
  const past = new Date(String(activity.startAt).replace(' ', 'T')).getTime() < Date.now();
  const formDisabled = status.closed || mine;

  return (
    <>
      <PageHero
        eyebrow="Event Detail"
        title={activity.title}
        description={activity.summary}
        breadcrumb={[{ label: '活动报名', to: '/activities' }, { label: activity.title }]}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <Chip tone="primary">{activity.category}</Chip>
          {past ? (
            <Chip tone="success">
              <CheckCircle2 className="h-3 w-3" />
              活动已结束
            </Chip>
          ) : status.capacityFull ? (
            <Chip tone="danger">名额已满</Chip>
          ) : status.closed ? (
            <Chip tone="warning">报名已截止</Chip>
          ) : (
            <Chip tone="warning">
              <Sparkles className="h-3 w-3" />
              报名进行中
            </Chip>
          )}
          <span className="mono flex items-center gap-2 text-[11.5px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {fdatetime(activity.startAt)} {fweek(activity.startAt)}
          </span>
          {activity.location && (
            <span className="flex min-w-0 max-w-full items-center gap-2 text-[11.5px] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words">{activity.location}</span>
            </span>
          )}
          {!status.closed && activity.signupEnd && (
            <span className="flex max-w-full flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
              <Hourglass className="h-3.5 w-3.5 shrink-0" />
              报名截止倒计时
              <Countdown target={activity.signupEnd} className="text-[12px] font-medium" />
            </span>
          )}
        </div>
      </PageHero>

      <section className="shell pb-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* ============================= 主列 ============================= */}
          <div className="flex min-w-0 flex-col gap-8">
            {/* 报名进度 */}
            {capacity > 0 && (
              <Glass tone="soft" className="p-6" data-reveal>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                      <Users className="h-4 w-4" />
                      报名进度
                    </p>
                    <p className="mt-2.5 flex items-baseline gap-2">
                      <span className="mono text-3xl font-semibold tabular-nums text-primary">{fnum(signed)}</span>
                      <span className="mono text-[13px] text-muted-foreground">/ {fnum(capacity)} 人</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] text-muted-foreground">
                      剩余名额
                      <span
                        className={cn(
                          'mono ml-2 text-[15px] font-semibold',
                          capacity - signed <= 0 ? 'text-[hsl(var(--destructive))]' : 'text-foreground'
                        )}
                      >
                        {Math.max(0, capacity - signed)}
                      </span>
                    </p>
                    {!status.closed && activity.signupEnd && (
                      <p className="mono mt-1.5 text-[11.5px] text-muted-foreground">
                        截止 {fdatetime(activity.signupEnd)}
                        {left !== null && left >= 0 && <span className="ml-2 text-[hsl(var(--warning))]">还有 {left} 天</span>}
                      </p>
                    )}
                  </div>
                </div>
                <ProgressBar
                  value={signed}
                  max={capacity}
                  tone={status.capacityFull ? 'danger' : signed / capacity > 0.8 ? 'warning' : 'primary'}
                  height={8}
                  className="mt-4"
                />
                <p className="mt-3 text-[11.5px] text-muted-foreground">
                  名额有限，按报名时间先后录取{status.capacityFull ? '；当前名额已满。' : '。'}
                </p>
              </Glass>
            )}

            {/* 正文 */}
            <Glass tone="soft" className="p-4 sm:p-8" data-reveal="blur">
              <h2 className="mb-6 flex items-center gap-2.5 text-[17px] font-semibold">
                <FileText className="h-4 w-4 text-primary" />
                活动介绍
              </h2>
              <div
                className="prose-glass"
                dangerouslySetInnerHTML={{
                  __html: activity.content || '<p>暂无更多活动介绍，如有疑问可通过意见反馈联系我们。</p>',
                }}
              />
            </Glass>

            {/* 附件 */}
            {attachments.length > 0 && (
              <Glass tone="soft" className="p-6" data-reveal="blur">
                <h2 className="mb-4 flex items-center gap-2.5 text-[15px] font-semibold">
                  <Paperclip className="h-4 w-4 text-primary" />
                  活动附件
                </h2>
                <div className="flex flex-col gap-2">
                  {attachments.map((f: any) => (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group flex items-center gap-3.5 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 transition-all duration-300 hover:border-primary/35 hover:bg-primary/8"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] text-primary">
                        <Download className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="clamp-1 block text-[13.5px] font-medium transition-colors group-hover:text-primary">
                          {f.name}
                        </span>
                        <span className="mono mt-0.5 block text-[10.5px] text-muted-foreground">{fbytes(f.size)}</span>
                      </span>
                    </a>
                  ))}
                </div>
              </Glass>
            )}

            {/* ========================= 在线报名 ========================= */}
            <Glass id="signup" tone="soft" className="scroll-mt-28 p-4 sm:p-8" data-reveal>
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2.5 text-[17px] font-semibold">
                    <Send className="h-4 w-4 text-primary" />
                    在线报名
                  </h2>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                    未登录也可以报名；登录后报名记录会同步至「用户中心 → 我的报名」。
                  </p>
                </div>
                {!user && (
                  <LinkButton to="/login" size="sm" variant="glass" className="w-full sm:w-auto">
                    <LogIn className="h-3.5 w-3.5" />
                    登录后报名
                  </LinkButton>
                )}
              </div>

              {mine ? (
                <div className="flex items-start gap-4 rounded-2xl border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 p-5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--success))]" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium">报名已提交成功</p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                      我们已收到{form.name ? ` ${form.name} ` : ''}的报名信息，活动开始前会通过短信 / 邮件提醒。
                      {user ? (
                        <>
                          可在
                          <Link to="/account/signups" className="mx-1 text-primary transition hover:underline">
                            我的报名
                          </Link>
                          查看记录与签到状态。
                        </>
                      ) : (
                        <>
                          建议
                          <Link to="/login" className="mx-1 text-primary transition hover:underline">
                            登录账号
                          </Link>
                          后查看「我的报名」。
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ) : formDisabled ? (
                <div className="flex items-start gap-4 rounded-2xl border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 p-5">
                  <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--warning))]" />
                  <div>
                    <p className="text-[14px] font-medium">当前无法报名</p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                      {status.reason || '报名通道暂未开放。'}
                      {status.capacityFull && '　可关注门户发布的后续场次，或联系主办方加入候补名单。'}
                    </p>
                    <LinkButton to="/activities" size="sm" variant="glass" className="mt-4 w-full sm:w-auto">
                      查看其他活动 <ArrowRight className="h-3.5 w-3.5" />
                    </LinkButton>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} noValidate className="flex flex-col gap-5">
                  {serverError && (
                    <div className="flex items-start gap-3 rounded-2xl border border-[hsl(var(--destructive))]/35 bg-[hsl(var(--destructive))]/10 px-4 py-3.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--destructive))]" />
                      <p className="text-[12.5px] leading-relaxed text-foreground/85">{serverError}</p>
                    </div>
                  )}

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="姓名" required error={errors.name}>
                      <Input
                        value={form.name}
                        onChange={(e) => set('name', e.target.value)}
                        placeholder="请输入真实姓名"
                        autoComplete="name"
                      />
                    </Field>
                    <Field label="学号" required error={errors.studentId} hint="用于现场签到核验，同一活动不可重复报名">
                      <Input
                        value={form.studentId}
                        onChange={(e) => set('studentId', e.target.value)}
                        placeholder="如 2023100123"
                        inputMode="numeric"
                      />
                    </Field>
                    <Field label="班级" required error={errors.college}>
                      <Input
                        value={form.college}
                        onChange={(e) => set('college', e.target.value)}
                        placeholder="如 高一-2班"
                      />
                    </Field>
                    <Field label="手机号" required error={errors.phone} hint="用于接收活动变更与提醒通知">
                      <Input
                        value={form.phone}
                        onChange={(e) => set('phone', e.target.value)}
                        placeholder="11 位手机号"
                        inputMode="tel"
                        autoComplete="tel"
                      />
                    </Field>
                    <Field label="邮箱" error={errors.email} hint="选填，用于接收报名成功邮件">
                      <Input
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                        placeholder="name@example.com"
                        inputMode="email"
                        autoComplete="email"
                      />
                    </Field>
                  </div>

                  <Field
                    label="备注"
                    error={errors.remark}
                    hint={`选填，可填写技术方向、饮食禁忌等特殊说明（${form.remark.length}/200）`}
                  >
                    <Textarea
                      rows={3}
                      value={form.remark}
                      onChange={(e) => set('remark', e.target.value)}
                      placeholder="例如：希望参与实操环节的硬件方向；有嵌入式开发经验。"
                    />
                  </Field>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/8 pt-5">
                    <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full sm:w-auto">
                      <Send className="h-4 w-4" />
                      {busy ? '提交中…' : '提交报名'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setTouchedForm(true);
                        setForm(EMPTY_FORM);
                        setErrors({});
                        setServerError(null);
                      }}
                    >
                      重置
                    </Button>
                    <span className="flex min-w-0 items-start gap-2 text-[11.5px] text-muted-foreground sm:items-center">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:mt-0" />
                      信息仅用于活动组织与签到，不做其他用途
                    </span>
                  </div>
                </form>
              )}
            </Glass>

            {/* ======================== 已报名名单 ======================== */}
            <Glass tone="soft" className="p-4 sm:p-8" data-reveal>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 text-[15px] font-semibold">
                  <Users className="h-4 w-4 text-primary" />
                  已报名同学
                  <span className="mono text-[12px] font-normal text-muted-foreground">（{fnum(signed)} 人）</span>
                </h2>
                <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  为保护隐私，仅展示姓氏与班级
                </span>
              </div>

              {signups.length ? (
                <>
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {signups.map((s: any, i: number) => (
                      <div
                        key={`${s.name}-${i}`}
                        className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5"
                      >
                        <span className="mono flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-[11.5px] text-foreground/85">
                          {(s.name || '同').slice(0, 1)}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[12.5px] font-medium">{maskName(s.name)}</span>
                          <span className="clamp-1 block text-[10.5px] text-muted-foreground">
                            {s.college || '班级未填写'}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                  {signed > signups.length && (
                    <p className="mono mt-4 text-[11px] text-muted-foreground">
                      仅展示最近 {signups.length} 条报名记录，其余已省略。
                    </p>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/12 py-12 text-center">
                  <Users className="h-5 w-5 text-muted-foreground/70" />
                  <p className="text-[13px] text-muted-foreground">还没有人报名，成为第一个报名者吧</p>
                </div>
              )}
            </Glass>
          </div>

          {/* ============================= 侧栏 ============================= */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start" data-reveal="right">
            <Glass tone="soft" className="p-6">
              <h3 className="text-[15px] font-semibold">活动信息</h3>
              <dl className="mt-5 flex flex-col divide-y divide-white/8">
                <InfoRow icon={<CalendarDays className="h-3.5 w-3.5" />} label="活动时间">
                  <span className="mono">{fdatetime(activity.startAt)}</span>
                  <span className="text-muted-foreground"> {fweek(activity.startAt)}</span>
                  {activity.endAt && (
                    <span className="mono mt-1 block text-muted-foreground">至 {fdatetime(activity.endAt)}</span>
                  )}
                </InfoRow>
                <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="活动地点">
                  {activity.location || '待定'}
                </InfoRow>
                <InfoRow icon={<Users className="h-3.5 w-3.5" />} label="报名名额">
                  {capacity > 0 ? (
                    <>
                      <span className="mono">{fnum(signed)}</span>
                      <span className="text-muted-foreground"> / {fnum(capacity)} 人</span>
                    </>
                  ) : (
                    '不限名额'
                  )}
                </InfoRow>
                <InfoRow icon={<Hourglass className="h-3.5 w-3.5" />} label="报名截止">
                  {activity.signupEnd ? (
                    <>
                      <span className="mono">{fdatetime(activity.signupEnd)}</span>
                      {cd && !cd.expired && (
                        <span className="mt-1 block text-[11.5px] text-[hsl(var(--warning))]">剩余 {cd.label}</span>
                      )}
                    </>
                  ) : (
                    '不限时，报满即止'
                  )}
                </InfoRow>
                <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="主办方">
                  科技创新部
                </InfoRow>
                <InfoRow icon={<CalendarClock className="h-3.5 w-3.5" />} label="当前状态">
                  {past ? '活动已结束' : status.closed ? status.reason || '报名关闭' : '报名进行中'}
                </InfoRow>
              </dl>

              {!formDisabled && (
                <a href="#signup" className="btn btn-primary mt-6 w-full">
                  <Send className="h-4 w-4" />
                  立即报名
                </a>
              )}
              <LinkButton to="/activities" variant="glass" className="mt-3 w-full">
                返回活动列表
              </LinkButton>
            </Glass>

            <Glass tone="soft" className="p-6">
              <h3 className="flex items-center gap-2.5 text-[15px] font-semibold">
                <Info className="h-4 w-4 text-primary" />
                报名须知
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {[
                  '请填写真实姓名与学号，现场签到需核验学生证件。',
                  '报名成功后如需请假，请提前 24 小时联系主办方。',
                  '活动可能拍摄影像用于部门宣传，报名即视为同意。',
                  '活动地点或时间如有调整，将通过短信与门户通知同步。',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[12.5px] leading-relaxed text-foreground/75">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {t}
                  </li>
                ))}
              </ul>
            </Glass>
          </aside>
        </div>
      </section>
    </>
  );
}

/* =============================================================================
 * 侧栏信息行
 * ========================================================================== */
function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5 py-3.5 first:pt-0 last:pb-0">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-1 break-words text-[13px] leading-relaxed text-foreground/90">{children}</dd>
      </div>
    </div>
  );
}

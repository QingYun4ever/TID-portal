import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  Info,
  Mail,
  MapPin,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';

import { PublicApi, SubmitApi } from '@/lib/api';
import { useApi, useRevealScan, useTitle } from '@/lib/hooks';
import { useAuth, useSettings, useToast } from '@/lib/store';
import { cn, fdate } from '@/lib/utils';
import { ListInput } from '@/components/AdminKit';
import { GlowOrb } from '@/components/LiquidBackdrop';
import {
  Button,
  Checkbox,
  Chip,
  Field,
  Glass,
  Input,
  LinkButton,
  PageHero,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui';

/* =============================================================================
 * 项目在线申报（/projects/apply）—— 门户最重要的办事入口
 *  步骤 1：项目基本信息（名称 / 类别 / 参赛竞赛）
 *  步骤 2：团队信息（负责人 / 指导老师 / 人数 / 成员列表）
 *  步骤 3：项目简介（≥20 字，带字数统计）+ 承诺勾选
 *  提交：SubmitApi.applyProject → 成功页（申报编号 + 后续流程 + 进度查询）
 * ========================================================================== */

const STEPS = [
  { n: 1, title: '项目基本信息', desc: '项目名称、类别与参赛意向' },
  { n: 2, title: '团队信息', desc: '负责人、指导老师与成员' },
  { n: 3, title: '项目简介与承诺', desc: '简介不少于 20 字' },
] as const;

const PROJECT_CATEGORY_OPTIONS = [
  { value: '科技制作', desc: '以动手制作与作品实现为主，适合技术探索类作品' },
  { value: '科技探究', desc: '围绕身边的科学问题开展观察与实验，适合探究类作品' },
  { value: '创意设计', desc: '侧重创意方案与设计表达，适合展示类作品' },
];

type FormState = {
  title: string;
  category: string;
  competitionId: string;
  leaderName: string;
  leaderStudentId: string;
  leaderCollege: string;
  leaderPhone: string;
  leaderEmail: string;
  advisor: string;
  teamSize: string;
  members: string[];
  intro: string;
  agree: boolean;
};

type Errors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = {
  title: '',
  category: '',
  competitionId: '',
  leaderName: '',
  leaderStudentId: '',
  leaderCollege: '',
  leaderPhone: '',
  leaderEmail: '',
  advisor: '',
  teamSize: '3',
  members: [],
  intro: '',
  agree: false,
};

/* ------------------------------ 分步校验 ------------------------------ */
function validateStep1(f: FormState): Errors {
  const e: Errors = {};
  const title = f.title.trim();
  if (!title) e.title = '请填写项目名称';
  else if (title.length < 4) e.title = '项目名称至少 4 个字';
  else if (title.length > 60) e.title = '项目名称请控制在 60 个字以内';

  if (!f.category) e.category = '请选择项目类别';
  else if (!PROJECT_CATEGORY_OPTIONS.some((o) => o.value === f.category)) e.category = '项目类别不合法';

  return e;
}

function validateStep2(f: FormState): Errors {
  const e: Errors = {};

  const name = f.leaderName.trim();
  if (!name) e.leaderName = '请填写负责人姓名';
  else if (!/^[\u4e00-\u9fa5A-Za-z·\s]{2,20}$/.test(name)) e.leaderName = '姓名格式不正确（2–20 位中英文字符）';

  const sid = f.leaderStudentId.trim();
  if (!sid) e.leaderStudentId = '请填写负责人学号';
  else if (!/^[A-Za-z0-9]{4,20}$/.test(sid)) e.leaderStudentId = '学号应为 4–20 位字母或数字';

  if (!f.leaderCollege.trim()) e.leaderCollege = '请填写负责人所在班级';

  const phone = f.leaderPhone.trim();
  if (!phone) e.leaderPhone = '请填写联系电话';
  else if (!/^1[3-9]\d{9}$/.test(phone)) e.leaderPhone = '手机号格式不正确（11 位，1 开头）';

  const email = f.leaderEmail.trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(email)) e.leaderEmail = '邮箱格式不正确';

  const size = Number(f.teamSize);
  if (!f.teamSize.trim()) e.teamSize = '请填写团队人数';
  else if (!Number.isInteger(size) || size < 1 || size > 20) e.teamSize = '团队人数应为 1–20 之间的整数';

  const members = f.members.map((m) => m.trim()).filter(Boolean);
  if (members.some((m) => m.length < 2)) e.members = '成员姓名至少 2 个字';
  else if (Number.isInteger(size) && size >= 1 && members.length > size - 1)
    e.members = `成员数量不能超过 ${size - 1} 人（团队人数含负责人）`;

  return e;
}

function validateStep3(f: FormState): Errors {
  const e: Errors = {};
  const intro = f.intro.trim();
  if (!intro) e.intro = '请填写项目简介';
  else if (intro.length < 20) e.intro = `项目简介至少 20 字，当前 ${intro.length} 字`;
  else if (intro.length > 1000) e.intro = '项目简介请控制在 1000 字以内';
  if (!f.agree) e.agree = '请阅读并勾选承诺条款后再提交';
  return e;
}

function validateAll(f: FormState): Errors {
  return { ...validateStep1(f), ...validateStep2(f), ...validateStep3(f) };
}

export default function ProjectApply() {
  useTitle('项目在线申报');
  const toast = useToast();
  const { user } = useAuth();
  const { settings } = useSettings();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ id: number; at: string } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  /* 竞赛列表（可选参赛意向） */
  const { data: comps, loading: compsLoading } = useApi<any[]>(() => PublicApi.competitions(), []);
  const competitions: any[] = Array.isArray(comps) ? comps : [];

  /* 登录用户自动预填负责人信息 */
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      leaderName: f.leaderName || user.name || '',
      leaderStudentId: f.leaderStudentId || user.studentId || '',
      leaderCollege: f.leaderCollege || user.college || '',
      leaderPhone: f.leaderPhone || user.phone || '',
      leaderEmail: f.leaderEmail || user.email || '',
    }));
  }, [user]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  const scrollToForm = () => {
    // 表单顶部对齐，避免分步切换后停在页面中部
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const next = () => {
    const e = step === 1 ? validateStep1(form) : step === 2 ? validateStep2(form) : {};
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error('请完善当前步骤', '有必填项未填写或格式不正确');
      return;
    }
    setStep((s) => (s === 1 ? 2 : 3));
    scrollToForm();
  };

  const back = () => {
    setErrors({});
    setStep((s) => (s === 3 ? 2 : 1));
    scrollToForm();
  };

  const submit = async () => {
    setTopError(null);
    const all = validateAll(form);
    setErrors(all);
    if (Object.keys(all).length) {
      const s1 = validateStep1(form);
      const badStep: 1 | 2 | 3 = Object.keys(s1).length ? 1 : Object.keys(validateStep2(form)).length ? 2 : 3;
      setStep(badStep);
      scrollToForm();
      toast.error('申报信息不完整', '请检查标红的字段后重新提交');
      return;
    }

    setBusy(true);
    try {
      const out: any = await SubmitApi.applyProject({
        title: form.title.trim(),
        category: form.category,
        competitionId: form.competitionId ? Number(form.competitionId) : null,
        leaderName: form.leaderName.trim(),
        leaderStudentId: form.leaderStudentId.trim(),
        leaderCollege: form.leaderCollege.trim(),
        leaderPhone: form.leaderPhone.trim(),
        leaderEmail: form.leaderEmail.trim() || null,
        advisor: form.advisor.trim() || null,
        teamSize: Number(form.teamSize) || 1,
        members: form.members.map((m) => m.trim()).filter(Boolean),
        intro: form.intro.trim(),
        materials: [],
      });
      const id = Number(out?.id ?? 0);
      setResult({ id, at: new Date().toISOString() });
      toast.success('申报提交成功', `申报编号 #${String(id).padStart(4, '0')}，可在用户中心查看进度。`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const msg = err?.message || '提交失败，请稍后重试';
      setTopError(msg);
      toast.error('提交失败', msg);
    } finally {
      setBusy(false);
    }
  };

  const resetAll = () => {
    setForm(EMPTY);
    setErrors({});
    setTopError(null);
    setResult(null);
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedComp = useMemo(
    () => competitions.find((c) => String(c.id) === form.competitionId),
    [competitions, form.competitionId]
  );

  /* 步骤切换 / 成功页挂载后重新扫描滚动揭示元素 */
  useRevealScan(`apply|${step}|${result ? 'done' : 'form'}`);

  return (
    <>
      <PageHero
        eyebrow="Project Application"
        title="项目在线申报"
        description="面向全校同学征集科技比赛与科普活动作品。填写项目基本信息、团队信息与项目简介，由部门统一组织评审。"
        breadcrumb={[{ label: '创新项目', to: '/projects' }, { label: '在线申报' }]}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <Chip tone="primary">
            <Sparkles className="h-3 w-3" />
            在线申报 · 全年受理
          </Chip>
          <Chip tone="warning">
            <CalendarClock className="h-3 w-3" />
            初审 5 个工作日
          </Chip>
          {user ? (
            <Chip tone="success">
              <BadgeCheck className="h-3 w-3" />
              已登录：{user.name}
            </Chip>
          ) : (
            <Chip tone="default">
              <Info className="h-3 w-3" />
              无需登录即可提交，登录后可查进度
            </Chip>
          )}
        </div>
      </PageHero>

      <section className="shell pb-24">
        {result ? (
          <SuccessView
            id={result.id}
            at={result.at}
            form={form}
            competitionTitle={selectedComp?.title}
            loggedIn={!!user}
            onReset={resetAll}
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* ============================ 表单主列 ============================ */}
            <div ref={formRef} className="min-w-0 scroll-mt-24" data-reveal>
              <Glass tone="soft" className="p-4 sm:p-8">
                <Steps step={step} onJump={(n) => { setErrors({}); setStep(n); scrollToForm(); }} />

                <div className="mt-8 border-t border-white/8 pt-7">
                  {topError && (
                    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[hsl(var(--destructive))]/35 bg-[hsl(var(--destructive))]/10 px-4 py-3.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--destructive))]" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium">提交失败</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-foreground/80">{topError}</p>
                        {topError.includes('重复') && (
                          <Link to="/account/applications" className="mt-2 inline-block text-[12px] text-primary transition hover:underline">
                            前往「我的项目」查看已提交记录 →
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ---------------------------- 第 1 步 ---------------------------- */}
                  {step === 1 && (
                    <div className="flex flex-col gap-5" style={{ animation: 'sti-fade .3s ease both' }}>
                      <Field
                        label="项目名称"
                        required
                        error={errors.title}
                        hint={`请填写完整项目名称，4–60 个字（当前 ${form.title.trim().length} 字）`}
                      >
                        <Input
                          value={form.title}
                          onChange={(e) => set('title', e.target.value)}
                          placeholder="例如：「灵眸」—— 面向视障人群的室内导航系统"
                          maxLength={80}
                        />
                      </Field>

                      <Field label="项目类别" required error={errors.category} hint="类别将决定比赛分组与展示方式">
                        <div className="grid gap-2.5 sm:grid-cols-3">
                          {PROJECT_CATEGORY_OPTIONS.map((o) => {
                            const active = form.category === o.value;
                            return (
                              <button
                                key={o.value}
                                type="button"
                                onClick={() => set('category', o.value)}
                                aria-pressed={active}
                                className={cn(
                                  'rounded-2xl border p-4 text-left transition-all duration-300',
                                  active
                                    ? 'border-primary/50 bg-primary/12 shadow-[0_0_24px_-14px_hsl(var(--primary)/.9)]'
                                    : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.055]'
                                )}
                              >
                                <span className="flex items-center justify-between gap-2">
                                  <span className={cn('text-[13.5px] font-medium', active && 'text-primary')}>{o.value}</span>
                                  <span
                                    className={cn(
                                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all',
                                      active ? 'border-primary bg-primary text-[hsl(var(--primary-foreground))]' : 'border-white/25'
                                    )}
                                  >
                                    {active && <Check className="h-2.5 w-2.5" strokeWidth={3.2} />}
                                  </span>
                                </span>
                                <span className="mt-2 block text-[11.5px] leading-relaxed text-muted-foreground">{o.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </Field>

                      <Field
                        label="参赛竞赛（选填）"
                        hint="如项目同时申报某赛事，可在此关联，便于后续统一管理与提醒"
                      >
                        {compsLoading ? (
                          <Skeleton className="h-[42px] rounded-2xl" />
                        ) : (
                          <Select value={form.competitionId} onChange={(e) => set('competitionId', e.target.value)}>
                            <option value="">暂不关联竞赛</option>
                            {competitions.map((c) => (
                              <option key={c.id} value={String(c.id)}>
                                {c.title}
                                {c.level ? `（${c.level}）` : ''}
                              </option>
                            ))}
                          </Select>
                        )}
                      </Field>

                      {selectedComp && (
                        <div className="flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent/8 px-4 py-3.5">
                          <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-medium">{selectedComp.title}</p>
                            <p className="mono mt-1 text-[11px] text-muted-foreground">
                              {selectedComp.organizer}
                              {selectedComp.signupDeadline && ` · 报名截止 ${fdate(selectedComp.signupDeadline)}`}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ---------------------------- 第 2 步 ---------------------------- */}
                  {step === 2 && (
                    <div className="flex flex-col gap-5" style={{ animation: 'sti-fade .3s ease both' }}>
                      <p className="text-[12.5px] text-muted-foreground">
                        负责人信息用于联络与审核通知，请确保手机号可正常接收短信。
                      </p>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="负责人姓名" required error={errors.leaderName}>
                          <Input
                            value={form.leaderName}
                            onChange={(e) => set('leaderName', e.target.value)}
                            placeholder="请输入真实姓名"
                            autoComplete="name"
                          />
                        </Field>
                        <Field label="负责人学号" required error={errors.leaderStudentId}>
                          <Input
                            value={form.leaderStudentId}
                            onChange={(e) => set('leaderStudentId', e.target.value)}
                            placeholder="如 2023100123"
                            inputMode="numeric"
                          />
                        </Field>
                        <Field label="所在班级" required error={errors.leaderCollege}>
                          <Input
                            value={form.leaderCollege}
                            onChange={(e) => set('leaderCollege', e.target.value)}
                            placeholder="如 高一-2班"
                          />
                        </Field>
                        <Field label="手机号" required error={errors.leaderPhone} hint="接收比赛结果与活动安排通知">
                          <Input
                            value={form.leaderPhone}
                            onChange={(e) => set('leaderPhone', e.target.value)}
                            placeholder="11 位手机号"
                            inputMode="tel"
                            autoComplete="tel"
                          />
                        </Field>
                        <Field label="邮箱" error={errors.leaderEmail} hint="选填，用于接收作品反馈与公示通知">
                          <Input
                            value={form.leaderEmail}
                            onChange={(e) => set('leaderEmail', e.target.value)}
                            placeholder="name@example.com"
                            inputMode="email"
                            autoComplete="email"
                          />
                        </Field>
                        <Field label="指导老师" hint="选填，可先填写意向指导老师，活动开始后可在后台补充">
                          <Input
                            value={form.advisor}
                            onChange={(e) => set('advisor', e.target.value)}
                            placeholder="如 王老师"
                          />
                        </Field>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)]">
                        <Field label="团队人数" required error={errors.teamSize} hint="含负责人在内，1–20 人">
                          <Input
                            value={form.teamSize}
                            onChange={(e) => set('teamSize', e.target.value)}
                            placeholder="3"
                            inputMode="numeric"
                          />
                        </Field>
                        <Field
                          label="团队成员"
                          error={errors.members}
                          hint="每行填写一位成员姓名（不含负责人），可随团队调整随时修改"
                        >
                          <ListInput
                            value={form.members}
                            onChange={(v) => set('members', v)}
                            rows={4}
                            placeholder={'李四\n王五\n赵六'}
                          />
                        </Field>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5 text-[11.5px] text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          当前团队共
                          <span className="mono text-foreground">{1 + form.members.filter(Boolean).length}</span> 人
                        </span>
                        <span className="mono">负责人 + {form.members.filter(Boolean).length} 名成员</span>
                      </div>
                    </div>
                  )}

                  {/* ---------------------------- 第 3 步 ---------------------------- */}
                  {step === 3 && (
                    <div className="flex flex-col gap-5" style={{ animation: 'sti-fade .3s ease both' }}>
                      {/* 填报回顾 */}
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                        <p className="flex items-center gap-2.5 text-[13px] font-medium">
                          <ClipboardList className="h-4 w-4 text-primary" />
                          填报回顾
                        </p>
                        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                          <ReviewRow label="项目名称" value={form.title} />
                          <ReviewRow label="项目类别" value={form.category} />
                          <ReviewRow label="参赛竞赛" value={selectedComp?.title ?? '未关联'} />
                          <ReviewRow label="负责人" value={`${form.leaderName}（${form.leaderStudentId}）`} />
                          <ReviewRow label="班级" value={form.leaderCollege} />
                          <ReviewRow label="联系电话" value={form.leaderPhone} />
                          <ReviewRow label="指导老师" value={form.advisor || '未填写'} />
                          <ReviewRow label="团队人数" value={`${form.teamSize} 人`} />
                          <ReviewRow label="团队成员" value={form.members.filter(Boolean).join('、') || '未填写'} />
                        </dl>
                        <button
                          type="button"
                          onClick={() => { setErrors({}); setStep(1); scrollToForm(); }}
                          className="mt-4 text-[12px] text-primary transition hover:underline"
                        >
                          返回修改前两步信息 →
                        </button>
                      </div>

                      <Field
                        label="项目简介"
                        required
                        error={errors.intro}
                        hint={`不少于 20 字，建议包含作品背景、制作思路与预期成果（${form.intro.trim().length}/1000）`}
                      >
                        <Textarea
                          rows={8}
                          value={form.intro}
                          maxLength={1200}
                          onChange={(e) => set('intro', e.target.value)}
                          placeholder="请简要说明作品要解决的问题、制作思路与预期的成果形式……"
                        />
                      </Field>

                      <div
                        className={cn(
                          'rounded-2xl border px-4 py-4 transition-colors',
                          errors.agree ? 'border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/8' : 'border-white/10 bg-white/[0.03]'
                        )}
                      >
                        <Checkbox
                          checked={form.agree}
                          onChange={(v) => set('agree', v)}
                          label={
                            <span className="text-[12.5px] leading-relaxed">
                              我承诺所填报信息真实有效，项目不存在抄袭、代做等情况，并同意项目成果在门户网站公开展示。
                            </span>
                          }
                        />
                        {errors.agree && (
                          <p className="mt-2 text-xs text-[hsl(var(--destructive))]">{errors.agree}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ---------------------------- 操作区 ---------------------------- */}
                <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-white/8 pt-6">
                  {step > 1 && (
                    <Button variant="ghost" onClick={back} disabled={busy} className="w-full sm:w-auto">
                      <ArrowLeft className="h-4 w-4" />
                      上一步
                    </Button>
                  )}

                  {step < 3 ? (
                    <Button variant="primary" onClick={next} className="w-full sm:w-auto">
                      下一步
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="primary" size="lg" onClick={submit} loading={busy} className="w-full sm:w-auto">
                      <Send className="h-4 w-4" />
                      {busy ? '提交中…' : '提交申报'}
                    </Button>
                  )}

                  <span className="mono text-[11.5px] text-muted-foreground">第 {step} / 3 步</span>
                  <span className="flex min-w-0 items-start gap-2 text-[11.5px] text-muted-foreground sm:items-center">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:mt-0" />
                    提交后 5 个工作日内反馈初审结果
                  </span>
                </div>
              </Glass>
            </div>

            {/* ============================ 申报须知 ============================ */}
            <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start" data-reveal="right">
              <Glass tone="soft" className="p-6">
                <h3 className="flex items-center gap-2.5 text-[15px] font-semibold">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  申报须知
                </h3>

                <div className="mt-5">
                  <p className="eyebrow mb-3">材料清单</p>
                  <ul className="flex flex-col gap-2.5">
                    {[
                      '报名表 / 作品说明（PDF，需负责人签字）',
                      '团队成员名单（含年级 / 班级）',
                      '指导老师意见（可后续补充）',
                      '已有成果证明：比赛获奖证书 / 作品照片',
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-2.5 text-[12px] leading-relaxed text-foreground/75">
                        <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-primary" />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                    材料可在初审通过后按通知补充上传，本轮在线申报只需填写项目与团队信息。
                  </p>
                </div>

                <div className="mt-6 border-t border-white/8 pt-5">
                  <p className="eyebrow mb-3">时间节点</p>
                  <div className="flex flex-col gap-3">
                    {[
                      { t: '在线报名', d: '按活动批次受理' },
                      { t: '初审反馈', d: '提交后 5 个工作日内' },
                      { t: '作品评审', d: '由指导老师与部门成员评审' },
                      { t: '结果公示', d: '评审结束后 3 个工作日内门户公示' },
                    ].map((s) => (
                      <div key={s.t} className="flex items-start gap-3">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-medium">{s.t}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{s.d}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border-t border-white/8 pt-5">
                  <p className="eyebrow mb-3">联系人</p>
                  <div className="flex flex-col gap-2.5 text-[12px] text-foreground/80">
                    <span className="flex min-w-0 items-start gap-2.5 sm:items-center">
                      <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary sm:mt-0" />
                      <span className="mono min-w-0 break-all">{settings.email || 'notpaperxiang@gmail.com'}</span>
                    </span>
                    <span className="flex items-start gap-2.5">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {settings.address || '北京市陈经纶中学本部高中'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2.5 border-t border-white/8 pt-5">
                  <LinkButton to="/projects" variant="glass" size="sm" className="w-full">
                    <FileText className="h-3.5 w-3.5" />
                    查看项目库参考
                  </LinkButton>
                  {user ? (
                    <LinkButton to="/account/applications" variant="ghost" size="sm" className="w-full">
                      我的项目进度
                    </LinkButton>
                  ) : (
                    <LinkButton to="/login" variant="ghost" size="sm" className="w-full">
                      登录后可查进度
                    </LinkButton>
                  )}
                </div>
              </Glass>

              <Glass tone="thin" className="flex items-start gap-3 p-5">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                  优秀作品将在校内展示，并由部门推荐参加市级及以上科技比赛。
                </p>
              </Glass>
            </aside>
          </div>
        )}
      </section>
    </>
  );
}

/* =============================================================================
 * 步骤指示器
 * ========================================================================== */
function Steps({ step, onJump }: { step: number; onJump: (n: 1 | 2 | 3) => void }) {
  return (
    <div className="flex items-center gap-2 sm:gap-4">
      {STEPS.map((s, i) => {
        const done = step > s.n;
        const active = step === s.n;
        return (
          <React.Fragment key={s.n}>
            <button
              type="button"
              onClick={() => (done ? onJump(s.n as 1 | 2 | 3) : undefined)}
              disabled={!done && !active}
              aria-current={active ? 'step' : undefined}
              className={cn('flex items-center gap-3 text-left', done ? 'cursor-pointer' : 'cursor-default')}
            >
              <span
                className={cn(
                  'mono flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold transition-all duration-300',
                  active
                    ? 'border-primary/60 bg-primary/15 text-primary shadow-[0_0_20px_-8px_hsl(var(--primary)/.9)]'
                    : done
                      ? 'border-[hsl(var(--success))]/45 bg-[hsl(var(--success))]/12 text-[hsl(var(--success))]'
                      : 'border-white/12 bg-white/[0.04] text-muted-foreground'
                )}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : s.n}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="mono block text-[10px] tracking-wide text-muted-foreground">STEP {s.n}</span>
                <span className={cn('block truncate text-[13px] font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>
                  {s.title}
                </span>
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <span className={cn('h-px min-w-4 flex-1', step > s.n ? 'bg-[hsl(var(--success))]/40' : 'bg-white/12')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-3">
      <dt className="w-[68px] shrink-0 text-[11.5px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-[12.5px] text-foreground/90">{value || '—'}</dd>
    </div>
  );
}

/* =============================================================================
 * 提交成功页
 * ========================================================================== */
function SuccessView({
  id,
  at,
  form,
  competitionTitle,
  loggedIn,
  onReset,
}: {
  id: number;
  at: string;
  form: FormState;
  competitionTitle?: string;
  loggedIn: boolean;
  onReset: () => void;
}) {
  const code = `#${String(id).padStart(4, '0')}`;

  /* 成功页为提交后动态挂载，需要单独触发一次揭示扫描 */
  useRevealScan('apply-success');

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]" data-reveal="scale">
      <Glass tone="strong" className="relative overflow-hidden p-4 sm:p-10">
        <GlowOrb className="-right-24 -top-28" size={460} color="rgba(186,230,253,.085)" />
        <GlowOrb className="-bottom-32 -left-24" size={420} color="rgb(var(--orb) / .055)" />
        <div className="relative">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[hsl(var(--success))]/35 bg-[hsl(var(--success))]/12 text-[hsl(var(--success))]">
            <CheckCircle2 className="h-7 w-7" />
          </span>

          <h2 className="mt-5 text-balance text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
            申报已提交成功
          </h2>
          <p className="mt-4 max-w-2xl text-pretty text-[13.5px] leading-relaxed text-muted-foreground">
            部门将在 <span className="text-foreground/85">5 个工作日内</span> 完成初审并通过短信 / 邮件反馈结果。
            请记录下方申报编号，后续查询与沟通时请提供该编号。
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
            <div>
              <p className="text-[11px] tracking-wide text-muted-foreground">申报编号</p>
              <p className="mono mt-1.5 break-all text-xl font-semibold tabular-nums text-primary sm:text-2xl">{code}</p>
            </div>
            <div className="hidden h-10 w-px bg-white/10 sm:block" />
            <div>
              <p className="text-[11px] tracking-wide text-muted-foreground">提交时间</p>
              <p className="mono mt-1.5 text-[14px]">{fdate(at)}</p>
            </div>
            <div className="hidden h-10 w-px bg-white/10 sm:block" />
            <div>
              <p className="text-[11px] tracking-wide text-muted-foreground">当前状态</p>
              <div className="mt-1.5">
                <Chip tone="warning">待审核</Chip>
              </div>
            </div>
          </div>

          {/* 申报摘要 */}
          <div className="mt-7 rounded-2xl border border-white/8 bg-white/[0.025] p-5">
            <p className="flex items-center gap-2.5 text-[13px] font-medium">
              <ClipboardList className="h-4 w-4 text-primary" />
              申报摘要
            </p>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <ReviewRow label="项目名称" value={form.title} />
              <ReviewRow label="项目类别" value={form.category} />
              <ReviewRow label="参赛竞赛" value={competitionTitle ?? '未关联'} />
              <ReviewRow label="负责人" value={`${form.leaderName}（${form.leaderStudentId}）`} />
              <ReviewRow label="班级" value={form.leaderCollege} />
              <ReviewRow label="联系电话" value={form.leaderPhone} />
              <ReviewRow label="指导老师" value={form.advisor || '未填写'} />
              <ReviewRow label="团队人数" value={`${form.teamSize} 人`} />
            </dl>
          </div>

          {/* 后续流程 */}
          <div className="mt-7">
            <p className="eyebrow mb-4">后续流程</p>
            <div className="flex flex-col">
              {[
                { t: '形式审查', d: '核对填报信息完整性与资格，1 个工作日内完成' },
                { t: '作品初审', d: '核对报名信息与作品材料，5 个工作日内反馈受理结果' },
                { t: '作品评审', d: '通过初审的作品参加评审，确定获奖等级' },
                { t: '结果公示', d: '结果在门户公示 3 个工作日，无异议后正式入选' },
                { t: '活动支持', d: '匹配指导老师与制作资源，纳入后续科技活动' },
              ].map((s, i, arr) => (
                <div key={s.t} className="relative flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/12 text-[11px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    {i < arr.length - 1 && <span className="my-1 w-px flex-1 bg-gradient-to-b from-primary/40 to-transparent" />}
                  </div>
                  <div className={cn('min-w-0 flex-1', i < arr.length - 1 ? 'pb-5' : '')}>
                    <p className="text-[13px] font-medium">{s.t}</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/8 pt-6">
            {loggedIn ? (
              <LinkButton to="/account/applications" variant="primary" size="lg" className="w-full sm:w-auto">
                <ArrowRight className="h-4 w-4" />
                查看申报进度
              </LinkButton>
            ) : (
              <LinkButton to="/login" variant="primary" size="lg" className="w-full sm:w-auto">
                <ArrowRight className="h-4 w-4" />
                登录后查看进度
              </LinkButton>
            )}
            <Button variant="glass" onClick={onReset} className="w-full sm:w-auto">
              <RotateCcw className="h-4 w-4" />
              再申报一项
            </Button>
            <LinkButton to="/projects" variant="ghost" className="w-full sm:w-auto">
              返回项目库
            </LinkButton>
          </div>

          {!loggedIn && (
            <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              本次为匿名提交，申报记录未绑定账号。建议使用同一学号注册并登录后，即可在「用户中心 → 我的项目」查看进度与作品反馈。
            </p>
          )}
        </div>
      </Glass>

      <aside className="flex flex-col gap-6">
        <Glass tone="soft" className="p-6">
          <h3 className="flex items-center gap-2.5 text-[15px] font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" />
            提交后请注意
          </h3>
          <ul className="mt-4 flex flex-col gap-3">
            {[
              '保持手机号与邮箱畅通，初审结果将通过短信与邮件通知。',
              '如需修改信息，可在初审前联系部门并提供申报编号。',
              '报名表、作品照片等材料在初审通过后按通知补充上传。',
              '同一项目请勿重复提交，重复申报将影响评审优先级。',
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 text-[12.5px] leading-relaxed text-foreground/75">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {t}
              </li>
            ))}
          </ul>
        </Glass>

        <Glass tone="thin" className="flex items-start gap-3 p-5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            优秀作品将在校内展示，并由部门推荐参加市级及以上科技比赛。
          </p>
        </Glass>
      </aside>
    </div>
  );
}

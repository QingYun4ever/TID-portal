import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  GraduationCap,
  HelpCircle,
  Megaphone,
  Sparkles,
  Users,
} from 'lucide-react';

import { ApiError, PublicApi, SubmitApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';
import { useAuth, useToast } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useRevealScope } from '@/components/RevealScope';
import {
  Accordion,
  Button,
  Chip,
  Dot,
  EmptyState,
  ErrorState,
  Field,
  Glass,
  Input,
  LinkButton,
  PageHero,
  Section,
  Select,
  Skeleton,
  TableWrap,
  Tabs,
  Td,
  Textarea,
  Th,
} from '@/components/ui';

/* =============================================================================
 * 数据形状（对应 GET /api/join）
 * ========================================================================== */
interface JoinPosition {
  id: number;
  name: string;
  group: string;
  headcount: number;
  description: string;
  requirements: string[];
  sortOrder: number;
}
interface JoinNotice {
  title: string;
  content: string;
}
interface JoinGroup {
  name: string;
  count: number;
}
interface JoinData {
  positions: JoinPosition[];
  notice: JoinNotice | null;
  groups: JoinGroup[];
}

/* =============================================================================
 * 报名表单
 * ========================================================================== */
interface JoinForm {
  positionId: string;
  name: string;
  studentId: string;
  college: string;
  major: string;
  grade: string;
  phone: string;
  email: string;
  skills: string;
  intro: string;
}

const EMPTY_FORM: JoinForm = {
  positionId: '',
  name: '',
  studentId: '',
  college: '',
  major: '',
  grade: '',
  phone: '',
  email: '',
  skills: '',
  intro: '',
};

const GRADES = ['大一', '大二', '大三', '大四', '大五', '研一', '研二', '研三'];

function validate(f: JoinForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.positionId) e.positionId = '请选择意向岗位';
  if (!f.name.trim()) e.name = '请填写姓名';
  else if (f.name.trim().length < 2) e.name = '姓名至少 2 个字符';
  if (!f.studentId.trim()) e.studentId = '请填写学号';
  else if (!/^[0-9A-Za-z]{6,20}$/.test(f.studentId.trim())) e.studentId = '学号应为 6-20 位数字或字母';
  if (!f.college.trim()) e.college = '请填写所在学院';
  if (!f.major.trim()) e.major = '请填写所学专业';
  if (!f.grade) e.grade = '请选择年级';
  if (!f.phone.trim()) e.phone = '请填写手机号';
  else if (!/^1[3-9]\d{9}$/.test(f.phone.trim())) e.phone = '请输入 11 位有效手机号';
  if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(f.email.trim())) e.email = '邮箱格式不正确';
  const n = f.intro.trim().length;
  if (!n) e.intro = '请填写自我介绍';
  else if (n < 10) e.intro = `自我介绍至少 10 字（当前 ${n} 字）`;
  return e;
}

const ADMITTED_STUDENTS = [
  { name: '刘航麟', className: '高一-2班' },
  { name: '徐千惠', className: '高一-13班' },
  { name: '林书羽', className: '高一-8班' },
  { name: '甘佳霖', className: '高一-10班' },
  { name: '王子欣', className: '高一-3班' },
  { name: '王梓曦', className: '高一-3班' },
  { name: '王绍翰', className: '高二-1班' },
  { name: '翟炳勋', className: '高二-6班' },
  { name: '耿万形', className: '高二-3班' },
  { name: '赵宥晨', className: '高二-1班' },
  { name: '郭宝泽', className: '高二-1班' },
  { name: '陈轩弘', className: '初三-1班' },
  { name: '鲜金钊', className: '高二-5班' },
];

const FAQ = [
  {
    q: '招新对专业和年级有限制吗？',
    a: '没有专业限制，全校本科生与研究生均可报名。大一新生同样欢迎 —— 我们更看重学习意愿与投入时间，而不是已有的技术积累。',
  },
  {
    q: '可以同时申请多个岗位吗？',
    a: '报名表只填写一个「意向岗位」。如果面试时双方认为你更适合其他岗位，我们会和你沟通后调整，无需重复提交。',
  },
  {
    q: '没有作品集可以报名技术服务组吗？',
    a: '可以。请在「技能特长」中如实填写你熟悉的技术栈，并在自我介绍里说明一个你做过的小项目（课设、自学练习均可）。',
  },
  {
    q: '加入后每周大概需要投入多少时间？',
    a: '常规情况每周 4-6 小时（例会 + 岗位工作）。竞赛集训、科技文化节等关键节点会阶段性增加，可提前协调。',
  },
  {
    q: '报名后多久能收到结果？',
    a: '简历筛选在 3 个工作日内完成并通过邮件/短信通知；面试结果在面试结束后 2 个工作日内反馈；最终录用名单在门户公示。',
  },
  {
    q: '提交后发现自己填错了怎么办？',
    a: '请在「互动与反馈」留言说明报名学号与需要修改的内容，或直接联系招新邮箱，我们会在后台帮你更正。',
  },
];

/* =============================================================================
 * 页面
 * ========================================================================== */
export default function Join() {
  useTitle('加入我们');

  const { data, loading, error, reload } = useApi<JoinData>(() => PublicApi.join(), []);
  const { user } = useAuth();
  const toast = useToast();
  /* 数据异步返回后才渲染出的 [data-reveal] 需要局部扫描才会揭示 */
  const revealRef = useRevealScope<HTMLDivElement>();

  const positions = data?.positions ?? [];
  const notice = data?.notice ?? null;
  const groups = data?.groups ?? [];

  const totalHeadcount = useMemo(
    () => positions.reduce((s, p) => s + (Number(p.headcount) || 0), 0),
    [positions]
  );

  /* ------------------------------ 岗位筛选 ------------------------------ */
  const [group, setGroup] = useState('all');
  const tabs = useMemo(
    () => [
      { value: 'all', label: '全部岗位', count: positions.length },
      ...groups.map((g) => ({ value: g.name, label: g.name, count: g.count })),
    ],
    [groups, positions.length]
  );
  const filtered = useMemo(
    () => (group === 'all' ? positions : positions.filter((p) => p.group === group)),
    [positions, group]
  );

  /* ------------------------------ 报名表单 ------------------------------ */
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<JoinForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<{ text: string; conflict: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: number | null; position: JoinPosition | null } | null>(null);
  const prefilled = useRef(false);

  /* 已登录用户预填基础信息 */
  useEffect(() => {
    if (!user || prefilled.current) return;
    prefilled.current = true;
    setForm((f) => ({
      ...f,
      name: f.name || user.name || '',
      studentId: f.studentId || user.studentId || '',
      college: f.college || user.college || '',
      email: f.email || user.email || '',
      phone: f.phone || user.phone || '',
    }));
  }, [user]);

  const set = (k: keyof JoinForm) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((prev) => {
      if (!prev[k]) return prev;
      const n = { ...prev };
      delete n[k];
      return n;
    });
  };

  const clearError = (k: keyof JoinForm) =>
    setErrors((prev) => {
      if (!prev[k]) return prev;
      const n = { ...prev };
      delete n[k];
      return n;
    });

  const applyFor = (p: JoinPosition) => {
    setForm((f) => ({ ...f, positionId: String(p.id) }));
    clearError('positionId');
    setFormError(null);
    setSubmitted(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) {
      toast.error('表单未通过校验', `还有 ${Object.keys(errs).length} 项需要修正`);
      const first = formRef.current?.querySelector<HTMLElement>('[data-invalid="true"]');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      const out = await SubmitApi.applyJoin({
        positionId: Number(form.positionId) || null,
        name: form.name.trim(),
        studentId: form.studentId.trim(),
        college: form.college.trim(),
        major: form.major.trim(),
        grade: form.grade,
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        skills: form.skills.trim(),
        intro: form.intro.trim(),
      });
      const pos = positions.find((p) => String(p.id) === form.positionId) ?? null;
      setSubmitted({ id: out?.id ?? null, position: pos });
      toast.success('报名已提交', '我们会在 3 个工作日内完成简历筛选并通知你');
      reload();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : err?.message || '提交失败，请稍后重试';
      const conflict = err?.status === 409 || /已提交过报名申请/.test(msg);
      setFormError({ text: msg, conflict });
      toast.error(conflict ? '无需重复报名' : '提交失败', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={revealRef}>
      <PageHero
        eyebrow="Join Us"
        title="加入科技创新部"
        description="四个工作组、七个岗位，面向全校招募。无论你擅长写代码、做设计、写文案，还是对某个领域充满好奇，这里都有你的一席之地。"
        breadcrumb={[{ label: '加入我们' }]}
      >
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-2">
            <Dot tone="success" pulse />
            2026 春季招新进行中
          </span>
          <span className="mono">
            {positions.length} 个岗位 · {totalHeadcount} 个名额
          </span>
          <span className="mono">{groups.length} 个工作组</span>
          <span className="mono">已录取 {ADMITTED_STUDENTS.length} 人</span>
        </div>
      </PageHero>
      <Section
        id="approved"
        eyebrow="Admission List"
        title="录取名单"
        description={`本次共录取 ${ADMITTED_STUDENTS.length} 位同学，名单如下。`}
      >
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th className="w-16">序号</Th>
                <Th>姓名</Th>
                <Th>班级</Th>
              </tr>
            </thead>
            <tbody>
              {ADMITTED_STUDENTS.map((student, i) => (
                <tr key={student.name} className="transition-colors hover:bg-white/[0.03]">
                  <Td className="mono text-muted-foreground">{i + 1}</Td>
                  <Td className="font-medium text-foreground">{student.name}</Td>
                  <Td className="text-muted-foreground">{student.className}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Section>

      {error ? (
        <Section container="shell" className="!pt-0">
          <Glass tone="soft" className="p-6">
            <ErrorState message={error} onRetry={reload} />
          </Glass>
        </Section>
      ) : loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* ============================ 招新公告 ============================ */}
          <Section
            id="notice"
            eyebrow="Recruitment Notice"
            title={notice?.title || '招新公告'}
            description="请先通读公告中的流程与时间安排，再提交报名表。"
          >
            <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <Glass tone="soft" className="p-7 sm:p-9" data-reveal>
                {notice?.content ? (
                  <div className="prose-glass" dangerouslySetInnerHTML={{ __html: notice.content }} />
                ) : (
                  <EmptyState
                    icon={<Megaphone className="h-5 w-5" />}
                    title="暂无招新公告"
                    description="本季招新公告尚未发布，可先浏览下方岗位信息并提交报名意向。"
                  />
                )}
              </Glass>

              <div className="flex flex-col gap-4" data-reveal="right">
                <Glass tone="soft" className="relative overflow-hidden p-6">
                  <div className="eyebrow mb-4">Selection Timeline</div>
                  <h3 className="text-[15px] font-semibold">选拔流程与时间</h3>
                  <div className="mt-6 flex flex-col">
                    {[
                      { t: '在线报名', d: '填写报名表，可选附作品集链接', icon: ClipboardList },
                      { t: '简历筛选', d: '3 个工作日内反馈筛选结果', icon: FileSearch },
                      { t: '面试', d: '线上 / 线下结合，技术岗含实操', icon: Users },
                      { t: '录用公示', d: '名单在门户「加入我们」公示', icon: BadgeCheck },
                    ].map((s, i, arr) => (
                      <div key={s.t} className="relative flex gap-4">
                        <div className="flex flex-col items-center">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/12 text-primary">
                            <s.icon className="h-3.5 w-3.5" />
                          </span>
                          {i < arr.length - 1 && (
                            <span className="my-1 w-px flex-1 bg-gradient-to-b from-primary/40 to-transparent" />
                          )}
                        </div>
                        <div className={cn('min-w-0 flex-1', i < arr.length - 1 ? 'pb-5' : '')}>
                          <p className="text-[13.5px] font-medium">
                            <span className="mono mr-2 text-[11px] text-primary/80">0{i + 1}</span>
                            {s.t}
                          </p>
                          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{s.d}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Glass>

                <Glass tone="thin" className="flex items-center gap-4 p-5">
                  <CalendarClock className="h-5 w-5 shrink-0 text-[hsl(var(--warning))]" />
                  <div className="min-w-0 text-[12.5px] leading-relaxed text-muted-foreground">
                    报名截止后不再受理新申请，逾期提交的表单将转入下一轮招新。
                  </div>
                </Glass>
              </div>
            </div>
          </Section>

          {/* ============================ 招新岗位 ============================ */}
          <Section
            id="positions"
            eyebrow="Open Positions"
            title="招新岗位"
            description="按工作组筛选你感兴趣的岗位，查看职责与要求后可直接申请。"
            action={<Tabs items={tabs} value={group} onChange={setGroup} size="sm" className="hidden sm:block" />}
          >
            <div className="sm:hidden">
              <Tabs items={tabs} value={group} onChange={setGroup} size="sm" />
            </div>

            {filtered.length ? (
              <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((p, i) => (
                  <div key={p.id} data-reveal="scale" style={{ transitionDelay: `${(i % 3) * 70}ms` }}>
                    <PositionCard position={p} onApply={() => applyFor(p)} selected={form.positionId === String(p.id)} />
                  </div>
                ))}
              </div>
            ) : (
              <Glass tone="soft" className="mt-10 p-4">
                <EmptyState
                  icon={<Users className="h-5 w-5" />}
                  title="该工作组暂无开放岗位"
                  description="请切换其他工作组，或选择「全部岗位」查看完整列表。"
                  action={<Button onClick={() => setGroup('all')}>查看全部岗位</Button>}
                />
              </Glass>
            )}
          </Section>

          {/* ============================ 报名表单 ============================ */}
          <Section
            id="apply"
            eyebrow="Application Form"
            title="在线报名"
            description="请如实填写以下信息，带 * 为必填项。提交后可在「用户中心 → 招新进度」查看审核状态。"
          >
            <div ref={formRef} className="scroll-mt-28">
              {submitted ? (
                <SuccessPanel
                  id={submitted.id}
                  position={submitted.position}
                  onReset={() => {
                    setSubmitted(null);
                    setForm((f) => ({ ...EMPTY_FORM, name: f.name, studentId: f.studentId, college: f.college, phone: f.phone, email: f.email }));
                  }}
                />
              ) : (
                <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                  <Glass tone="strong" className="p-6 sm:p-8" data-reveal>
                    {/* 错误提示条 */}
                    {formError && (
                      <div
                        className={cn(
                          'mb-6 flex items-start gap-3 rounded-2xl border px-4 py-3.5',
                          formError.conflict
                            ? 'border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10'
                            : 'border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/10'
                        )}
                        style={{ animation: 'sti-pop .3s cubic-bezier(.22,1,.36,1) both' }}
                        role="alert"
                      >
                        <AlertCircle
                          className={cn(
                            'mt-0.5 h-4 w-4 shrink-0',
                            formError.conflict ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--destructive))]'
                          )}
                        />
                        <div className="min-w-0 text-[13px] leading-relaxed">
                          <p className={cn('font-medium', formError.conflict ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--destructive))]')}>
                            {formError.conflict ? '你已提交过报名申请' : '提交失败'}
                          </p>
                          <p className="mt-1 text-foreground/75">
                            {formError.conflict
                              ? '同一个学号在一轮招新中只能提交一次。请耐心等待筛选结果，如需修改已提交的信息，可在「互动与反馈」留言说明。'
                              : formError.text}
                          </p>
                          {formError.conflict && (
                            <div className="mt-3 flex flex-wrap gap-2.5">
                              <LinkButton to="/account/join" size="sm" variant="glass">
                                查看我的招新进度
                              </LinkButton>
                              <LinkButton to="/feedback" size="sm" variant="ghost">
                                去留言说明
                              </LinkButton>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                      <Field
                        label="意向岗位"
                        required
                        error={errors.positionId}
                        hint={!errors.positionId ? '可先在「招新岗位」中点击「申请该岗位」自动选择' : undefined}
                      >
                        <Select
                          value={form.positionId}
                          onChange={(e) => set('positionId')(e.target.value)}
                          data-invalid={errors.positionId ? 'true' : undefined}
                          disabled={!positions.length}
                        >
                          <option value="">请选择意向岗位</option>
                          {positions.map((p) => (
                            <option key={p.id} value={String(p.id)}>
                              {p.group} · {p.name}（{p.headcount} 人）
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="姓名" required error={errors.name}>
                          <Input
                            value={form.name}
                            onChange={(e) => set('name')(e.target.value)}
                            placeholder="请输入真实姓名"
                            autoComplete="name"
                            data-invalid={errors.name ? 'true' : undefined}
                          />
                        </Field>
                        <Field label="学号" required error={errors.studentId}>
                          <Input
                            value={form.studentId}
                            onChange={(e) => set('studentId')(e.target.value)}
                            placeholder="如 2024100123"
                            inputMode="numeric"
                            data-invalid={errors.studentId ? 'true' : undefined}
                          />
                        </Field>
                        <Field label="学院" required error={errors.college}>
                          <Input
                            value={form.college}
                            onChange={(e) => set('college')(e.target.value)}
                            placeholder="如 计算机科学与技术学院"
                            data-invalid={errors.college ? 'true' : undefined}
                          />
                        </Field>
                        <Field label="专业" required error={errors.major}>
                          <Input
                            value={form.major}
                            onChange={(e) => set('major')(e.target.value)}
                            placeholder="如 软件工程"
                            data-invalid={errors.major ? 'true' : undefined}
                          />
                        </Field>
                        <Field label="年级" required error={errors.grade}>
                          <Select
                            value={form.grade}
                            onChange={(e) => set('grade')(e.target.value)}
                            data-invalid={errors.grade ? 'true' : undefined}
                          >
                            <option value="">请选择年级</option>
                            {GRADES.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="手机号" required error={errors.phone}>
                          <Input
                            value={form.phone}
                            onChange={(e) => set('phone')(e.target.value)}
                            placeholder="11 位手机号"
                            inputMode="tel"
                            autoComplete="tel"
                            data-invalid={errors.phone ? 'true' : undefined}
                          />
                        </Field>
                      </div>

                      <Field
                        label="邮箱"
                        error={errors.email}
                        hint={!errors.email ? '用于接收面试通知，建议填写常用邮箱' : undefined}
                      >
                        <Input
                          value={form.email}
                          onChange={(e) => set('email')(e.target.value)}
                          placeholder="name@university.edu.cn"
                          type="email"
                          autoComplete="email"
                          data-invalid={errors.email ? 'true' : undefined}
                        />
                      </Field>

                      <Field
                        label="技能特长"
                        hint="如 React / TypeScript、Figma 设计、视频剪辑、硬件调试等，用顿号或逗号分隔"
                      >
                        <Input
                          value={form.skills}
                          onChange={(e) => set('skills')(e.target.value)}
                          placeholder="选填，有助于我们安排更适合你的岗位"
                        />
                      </Field>

                      <Field
                        label="自我介绍"
                        required
                        error={errors.intro}
                        hint={
                          !errors.intro
                            ? `至少 10 字，建议说明报名动机、相关经历与可投入时间（当前 ${form.intro.trim().length} 字）`
                            : undefined
                        }
                      >
                        <Textarea
                          value={form.intro}
                          onChange={(e) => set('intro')(e.target.value)}
                          rows={6}
                          placeholder="为什么想加入科技创新部？你希望在哪个方向成长？"
                          data-invalid={errors.intro ? 'true' : undefined}
                        />
                      </Field>

                      <div className="flex flex-wrap items-center gap-3 border-t border-white/8 pt-6">
                        <Button type="submit" variant="primary" size="lg" loading={submitting}>
                          {submitting ? '提交中…' : '提交报名表'}
                          {!submitting && <ArrowRight className="h-4 w-4" />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setForm(EMPTY_FORM);
                            setErrors({});
                            setFormError(null);
                          }}
                          disabled={submitting}
                        >
                          重置
                        </Button>
                        <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                          提交即表示同意部门将你的信息用于招新筛选。
                        </p>
                      </div>
                    </form>
                  </Glass>

                  {/* 侧栏说明 */}
                  <div className="flex flex-col gap-4" data-reveal="right">
                    <Glass tone="soft" className="relative overflow-hidden p-6">
                      <Sparkles className="h-4 w-4 text-accent" />
                      <h3 className="mt-4 text-[15px] font-semibold">报名前请确认</h3>
                      <ul className="mt-4 flex flex-col gap-3">
                        {[
                          '同一学号在一轮招新中只能提交一次报名表',
                          '手机号与邮箱务必填写正确，面试通知将通过它们发出',
                          '技术岗面试含简单实操，可提前准备一个做过的项目',
                          '如需附作品集，请在自我介绍中留下可访问的链接',
                        ].map((t) => (
                          <li key={t} className="flex items-start gap-3 text-[13px] leading-relaxed text-foreground/80">
                            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </Glass>

                    <Glass tone="thin" className="p-5">
                      <div className="flex items-center gap-2.5 text-[13px] font-medium">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        还没有门户账号？
                      </div>
                      <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
                        注册学生账号后，可在「用户中心」随时查看招新进度、面试通知与结果公示。
                      </p>
                      <LinkButton to="/register" size="sm" className="mt-4 w-full">
                        注册学生账号
                      </LinkButton>
                    </Glass>
                  </div>
                </div>
              )}
            </div>
          </Section>
          {/* ============================ 常见问题 ============================ */}
          <Section
            id="faq"
            eyebrow="FAQ"
            title="常见问题"
            description="关于招新的疑问，这里也许已有答案。仍未解决可以在「互动与反馈」留言。"
            action={
              <LinkButton to="/feedback">
                <HelpCircle className="h-4 w-4" />
                去提问
              </LinkButton>
            }
          >
            <div data-reveal="blur">
              <Accordion items={FAQ} />
            </div>
          </Section>
        </>
      )}

      <div className="pb-24" />
    </div>
  );
}

/* =============================================================================
 * 岗位卡片
 * ========================================================================== */
function PositionCard({
  position,
  onApply,
  selected,
}: {
  position: JoinPosition;
  onApply: () => void;
  selected: boolean;
}) {
  const reqs = Array.isArray(position.requirements) ? position.requirements : [];
  return (
    <Glass
      tone="soft"
      hover
      sheen
      className={cn('flex h-full flex-col p-6', selected && 'ring-1 ring-primary/45')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Chip tone="accent">{position.group}</Chip>
          <h3 className="mt-3.5 text-[17px] font-semibold leading-snug">{position.name}</h3>
        </div>
        <span className="mono shrink-0 rounded-full border border-white/12 bg-white/[0.055] px-3 py-1 text-[11px] text-foreground/80">
          招募 {position.headcount} 人
        </span>
      </div>

      <p className="mt-3.5 text-[13px] leading-relaxed text-muted-foreground">{position.description}</p>

      <div className="mt-5 flex-1">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">岗位要求</p>
        {reqs.length ? (
          <ul className="mt-3 flex flex-col gap-2.5">
            {reqs.map((r) => (
              <li key={r} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-foreground/80">
                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/85" />
                {r}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[12.5px] text-muted-foreground">无硬性要求，欢迎零基础同学报名。</p>
        )}
      </div>

      <Button
        variant={selected ? 'primary' : 'glass'}
        className="mt-6 w-full"
        onClick={onApply}
      >
        {selected ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            已选择该岗位
          </>
        ) : (
          '申请该岗位'
        )}
      </Button>
    </Glass>
  );
}

/* =============================================================================
 * 提交成功态
 * ========================================================================== */
function SuccessPanel({
  id,
  position,
  onReset,
}: {
  id: number | null;
  position: JoinPosition | null;
  onReset: () => void;
}) {
  const steps = [
    { t: '简历筛选', d: '3 个工作日内完成，结果通过短信与邮件通知' },
    { t: '面试', d: '线上 / 线下结合，技术岗含简单实操，约 20 分钟' },
    { t: '录用公示', d: '最终名单在门户「加入我们」栏目公示 3 天' },
  ];
  return (
    <Glass
      tone="strong"
      className="relative overflow-hidden p-8 sm:p-12"
      style={{ animation: 'sti-pop .45s cubic-bezier(.22,1,.36,1) both' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full blur-[80px]"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,.055), transparent 68%)' }}
      />
      <div className="relative max-w-3xl">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[hsl(var(--success))]/35 bg-[hsl(var(--success))]/12 text-[hsl(var(--success))]">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h2 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">报名已提交成功</h2>
        <p className="mt-4 text-[14.5px] leading-relaxed text-muted-foreground">
          感谢你选择科技创新部。我们已收到你的报名信息
          {id ? (
            <>
              ，回执编号 <span className="mono text-primary">#{id}</span>
            </>
          ) : null}
          {position ? (
            <>
              ，意向岗位为「<span className="text-foreground/90">{position.group} · {position.name}</span>」
            </>
          ) : null}
          。
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.t} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <span className="mono text-[11px] text-primary">0{i + 1}</span>
              <p className="mt-2.5 text-[14px] font-medium">{s.t}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <LinkButton to="/account/join" variant="primary">
            查看招新进度 <ArrowRight className="h-4 w-4" />
          </LinkButton>
          <Button variant="glass" onClick={onReset}>
            再填一份报名表
          </Button>
          <LinkButton to="/feedback" variant="ghost">
            有问题想问
          </LinkButton>
        </div>

        <p className="mt-6 text-[12px] leading-relaxed text-muted-foreground">
          提示：请保持手机畅通。筛选结果与面试安排会同时发送到门户「用户中心 → 消息通知」。
        </p>
      </div>
    </Glass>
  );
}

/* =============================================================================
 * 加载骨架
 * ========================================================================== */
function LoadingSkeleton() {
  return (
    <Section container="shell" className="!pt-0">
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-72" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-24" />
        </div>
      </div>
      <div className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
      <div className="mt-16 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-[520px]" />
        <Skeleton className="h-64" />
      </div>
    </Section>
  );
}

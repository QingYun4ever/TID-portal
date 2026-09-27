import React, { useMemo } from 'react';
import {
  Briefcase,
  Check,
  CircleSlash,
  Clock,
  GraduationCap,
  Hash,
  Mail,
  Phone,
  Sparkles,
  UserRoundPlus,
  UserRoundX,
} from 'lucide-react';

import { AuthApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';
import { useAuth } from '@/lib/store';
import { cn, fdatetime, fromNow } from '@/lib/utils';
import { Chip, EmptyState, ErrorState, Glass, LinkButton, Skeleton } from '@/components/ui';

/* =============================================================================
 * 用户中心 · 招新进度
 * ========================================================================== */

interface JoinRow {
  id: number;
  positionId: number | null;
  positionName?: string | null;
  name: string;
  studentId: string;
  college: string;
  major: string;
  grade: string;
  phone: string;
  email?: string | null;
  skills: string;
  intro: string;
  status: string;
  reviewNote?: string | null;
  createdAt: string;
}

const STEPS = ['已提交', '简历筛选', '面试', '录用公示'];

/** 状态 → 当前已完成到第几步（0 基） */
function stageOf(status: string) {
  switch (status) {
    case 'pending':
      return 1;
    case 'reviewing':
      return 2;
    case 'approved':
      return 3;
    case 'rejected':
      return 1;
    default:
      return 0;
  }
}

const STATUS_TEXT: Record<string, string> = {
  pending: '待筛选',
  reviewing: '审核中',
  approved: '已录用',
  rejected: '未通过',
};

function statusTone(status: string): 'primary' | 'success' | 'warning' | 'danger' {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'reviewing') return 'primary';
  return 'warning';
}

export default function JoinProgress() {
  const { user } = useAuth();
  useTitle('招新进度');

  const { data, loading, error, reload } = useApi<JoinRow[]>(() => AuthApi.joinApplications(), []);
  const rows = data ?? [];

  const summary = useMemo(() => {
    const done = rows.filter((r) => r.status === 'approved').length;
    const going = rows.filter((r) => r.status === 'pending' || r.status === 'reviewing').length;
    const failed = rows.filter((r) => r.status === 'rejected').length;
    return { done, going, failed };
  }, [rows]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">招新进度</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            招新流程为「提交报名 → 简历筛选 → 面试 → 录用公示」，下面是你提交的报名记录与当前所处阶段。
          </p>
        </div>
        <LinkButton to="/join" variant="glass" size="sm">
          <UserRoundPlus className="h-3.5 w-3.5" /> 查看招新岗位
        </LinkButton>
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3.5">
          <Tile label="进行中" value={summary.going} tone="warning" />
          <Tile label="已录用" value={summary.done} tone="success" />
          <Tile label="未通过" value={summary.failed} tone="danger" />
        </div>
      )}

      {error ? (
        <Glass tone="soft">
          <ErrorState message={error} onRetry={reload} />
        </Glass>
      ) : loading ? (
        <div className="flex flex-col gap-3.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-[280px]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Glass tone="soft">
          <EmptyState
            icon={<UserRoundPlus className="h-5 w-5" />}
            title="还没有招新报名记录"
            description={
              user?.studentId
                ? '科技创新部每年春季与秋季各开展一次招新，提交报名后可以在这里跟踪筛选与面试进度。'
                : '建议先在「个人资料」补全学号，报名记录才能与当前账号自动关联。'
            }
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <LinkButton to="/join" variant="primary">
                  <UserRoundPlus className="h-4 w-4" /> 立即报名
                </LinkButton>
                <LinkButton to="/account/profile">完善资料</LinkButton>
              </div>
            }
          />
        </Glass>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((r, i) => (
            <JoinCard key={r.id} row={r} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ 统计小格 ------------------------------ */
function Tile({ label, value, tone }: { label: string; value: number; tone: 'warning' | 'success' | 'danger' }) {
  const tones = {
    warning: 'text-[hsl(var(--warning))]',
    success: 'text-[hsl(var(--success))]',
    danger: 'text-[hsl(var(--destructive))]',
  };
  return (
    <Glass tone="soft" className="p-4">
      <p className="text-[11px] tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mono mt-2 text-xl font-semibold tabular-nums', tones[tone])}>{value}</p>
    </Glass>
  );
}

/* ------------------------------ 进度卡片 ------------------------------ */
function JoinCard({ row, index }: { row: JoinRow; index: number }) {
  const stage = stageOf(row.status);
  const rejected = row.status === 'rejected';

  return (
    <Glass
      tone="soft"
      className="p-5 sm:p-6"
      data-reveal="scale"
      style={{ transitionDelay: `${Math.min(index, 4) * 70}ms` }}
    >
      {/* 头部 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={statusTone(row.status)} className="!px-2.5 !py-0.5">
              {rejected ? <UserRoundX className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
              {STATUS_TEXT[row.status] ?? row.status}
            </Chip>
            <Chip tone="accent" className="!px-2.5 !py-0.5">
              <Briefcase className="h-3 w-3" />
              {row.positionName || '意向岗位'}
            </Chip>
          </div>
          <h3 className="mt-3 text-[16px] font-semibold">{row.positionName || '科技创新部 · 招新报名'}</h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
            <span className="mono flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {fdatetime(row.createdAt)}
            </span>
            <span>{fromNow(row.createdAt)} 提交</span>
          </p>
        </div>
        <span className="mono shrink-0 text-[11px] text-muted-foreground/70">记录 #{row.id}</span>
      </div>

      {/* 步骤条 */}
      <div className="mt-6">
        <ol className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-0">
          {STEPS.map((label, i) => {
            const done = i < stage;
            const current = i === stage && !rejected;
            const isRejectedHere = rejected && i === stage;
            return (
              <li key={label} className="relative flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:gap-0 sm:text-center">
                {/* 连接线（移动端：纵向；桌面：横向） */}
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      'absolute z-0 left-[13px] top-7 h-[calc(100%+16px)] w-px sm:left-1/2 sm:top-[13px] sm:h-px sm:w-full',
                      i < stage ? 'bg-primary/45' : 'bg-white/10'
                    )}
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-all duration-300',
                    done
                      ? 'border-primary/60 bg-primary/18 text-primary'
                      : isRejectedHere
                        ? 'border-[hsl(var(--destructive))]/60 bg-[hsl(var(--destructive))]/15 text-[hsl(var(--destructive))]'
                        : current
                          ? 'border-primary bg-primary/25 text-primary shadow-[0_0_16px_-3px_hsl(var(--primary)/.9)]'
                          : 'border-white/12 bg-white/[0.04] text-muted-foreground'
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : isRejectedHere ? <CircleSlash className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <div className="min-w-0 sm:mt-3">
                  <p className={cn('text-[12.5px] font-medium', done || current ? 'text-foreground/90' : 'text-muted-foreground')}>
                    {label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {isRejectedHere ? '未通过' : done ? '已完成' : current ? '进行中' : '待开始'}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* 报名信息 */}
      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/8 pt-5 text-[12.5px] lg:grid-cols-4">
        <Field label="姓名" value={row.name} />
        <Field label="学号" value={row.studentId} mono icon={<Hash className="h-3 w-3" />} />
        <Field label="学院" value={row.college || '—'} icon={<GraduationCap className="h-3 w-3" />} span />
        <Field label="专业 / 年级" value={[row.major, row.grade].filter(Boolean).join(' · ') || '—'} />
        <Field label="联系电话" value={row.phone || '—'} mono icon={<Phone className="h-3 w-3" />} />
        <Field label="邮箱" value={row.email || '—'} icon={<Mail className="h-3 w-3" />} span />
      </dl>

      {row.skills && (
        <div className="mt-4 flex flex-wrap gap-2">
          {row.skills
            .split(/[\/、,，]/)
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => (
              <Chip key={s} className="!px-2.5 !py-0.5">
                {s}
              </Chip>
            ))}
        </div>
      )}

      {row.intro && (
        <p className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5 text-[12.5px] leading-relaxed text-muted-foreground">
          {row.intro}
        </p>
      )}

      {row.reviewNote && (
        <div
          className={cn(
            'mt-4 rounded-2xl border px-4 py-3.5',
            rejected
              ? 'border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/8'
              : 'border-[hsl(var(--warning))]/25 bg-[hsl(var(--warning))]/8'
          )}
        >
          <p
            className={cn(
              'text-[12px] font-medium',
              rejected ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--warning))]'
            )}
          >
            审核意见
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/80">{row.reviewNote}</p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <LinkButton to="/join" size="sm">
          <Briefcase className="h-3.5 w-3.5" /> 查看岗位详情
        </LinkButton>
        {row.status === 'approved' && (
          <span className="text-[11.5px] text-[hsl(var(--success))]">
            恭喜！请留意后续的入部通知与部门群邀请。
          </span>
        )}
      </div>
    </Glass>
  );
}

function Field({
  label,
  value,
  mono,
  span,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  span?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={cn(span && 'col-span-2 lg:col-span-1')}>
      <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className={cn('clamp-1 mt-1 text-foreground/85', mono && 'mono')}>{value}</dd>
    </div>
  );
}

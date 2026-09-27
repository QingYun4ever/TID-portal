import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  Building2,
  ClipboardX,
  FileText,
  Hash,
  Hourglass,
  Layers,
  Loader2,
  Paperclip,
  Users,
} from 'lucide-react';

import { AuthApi } from '@/lib/api';
import { useApi, useTitle } from '@/lib/hooks';
import { useAuth } from '@/lib/store';
import { APPLY_STATUS, cn, fbytes, fdatetime } from '@/lib/utils';
import { ApplyStatusChip } from '@/components/cards';
import {
  Button,
  Chip,
  Drawer,
  EmptyState,
  ErrorState,
  Glass,
  LinkButton,
  Skeleton,
  StatCard,
  TableWrap,
  Td,
  Th,
} from '@/components/ui';

/* =============================================================================
 * 用户中心 · 我的项目（项目申报记录）
 * ========================================================================== */

interface Material {
  name?: string;
  url?: string;
  size?: number;
}

interface ApplicationRow {
  id: number;
  title: string;
  competitionTitle?: string | null;
  category: string;
  leaderName: string;
  leaderStudentId: string;
  leaderCollege: string;
  leaderPhone: string;
  leaderEmail?: string | null;
  advisor?: string | null;
  teamSize: number;
  members: (string | { name?: string; role?: string })[];
  intro: string;
  materials: Material[];
  status: string;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

const memberName = (m: string | { name?: string }) => (typeof m === 'string' ? m : (m?.name ?? '成员'));

function statusCardTone(status: string): 'primary' | 'success' | 'warning' | 'accent' {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'accent';
  if (status === 'reviewing') return 'primary';
  return 'warning';
}

export default function Applications() {
  const { user } = useAuth();
  const [active, setActive] = useState<ApplicationRow | null>(null);
  useTitle('我的项目');

  const { data, loading, error, reload } = useApi<ApplicationRow[]>(() => AuthApi.applications(), []);
  const rows = data ?? [];

  const counts = useMemo(() => {
    const c = { pending: 0, reviewing: 0, approved: 0, rejected: 0 } as Record<string, number>;
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const mine = (r: ApplicationRow) =>
    r.leaderStudentId === user?.studentId || (!!user?.phone && r.leaderPhone === user.phone);

  const tiles = [
    { key: 'pending', label: '待审核', value: counts.pending ?? 0, icon: <Hourglass className="h-4 w-4" />, tone: statusCardTone('pending') },
    { key: 'reviewing', label: '审核中', value: counts.reviewing ?? 0, icon: <Loader2 className="h-4 w-4" />, tone: statusCardTone('reviewing') },
    { key: 'approved', label: '已通过', value: counts.approved ?? 0, icon: <BadgeCheck className="h-4 w-4" />, tone: statusCardTone('approved') },
    { key: 'rejected', label: '未通过', value: counts.rejected ?? 0, icon: <ClipboardX className="h-4 w-4" />, tone: statusCardTone('rejected') },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">我的项目</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            这里列出你作为负责人或团队成员的项目申报记录，共
            <span className="mono text-foreground"> {rows.length} </span>项。点击任意一行可查看团队成员与申报材料。
          </p>
        </div>
        <LinkButton to="/projects/apply" variant="primary" size="sm">
          <FileText className="h-3.5 w-3.5" /> 新建项目申报
        </LinkButton>
      </div>

      {/* 状态统计 */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <div key={t.key} data-reveal="scale" style={{ transitionDelay: `${i * 55}ms` }}>
            <StatCard label={t.label} value={t.value} unit="项" icon={t.icon} tone={t.tone} className="h-full" />
          </div>
        ))}
      </div>

      {error ? (
        <Glass tone="soft">
          <ErrorState message={error} onRetry={reload} />
        </Glass>
      ) : loading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Glass tone="soft">
          <EmptyState
            icon={<Layers className="h-5 w-5" />}
            title="暂无项目申报记录"
            description={
              user?.studentId
                ? '你可以为大学生创新创业训练计划提交申报，审核进度会实时同步到这里。'
                : '建议先在「个人资料」补全学号与手机号，便于申报记录与账号自动关联。'
            }
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <LinkButton to="/projects/apply" variant="primary">
                  <FileText className="h-4 w-4" /> 去项目申报
                </LinkButton>
                <LinkButton to="/projects">浏览项目库</LinkButton>
              </div>
            }
          />
        </Glass>
      ) : (
        <>
          {/* 桌面表格 */}
          <div className="hidden lg:block" data-reveal>
            <TableWrap>
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr>
                    <Th className="w-[30%]">项目名称</Th>
                    <Th>类别</Th>
                    <Th>负责人</Th>
                    <Th>团队</Th>
                    <Th>指导教师</Th>
                    <Th>状态</Th>
                    <Th>提交时间</Th>
                    <Th className="text-right">操作</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setActive(r)}
                      className="cursor-pointer transition-colors duration-200 hover:bg-white/[0.04]"
                    >
                      <Td>
                        <div className="flex items-start gap-2.5">
                          <span className="min-w-0">
                            <span className="clamp-2 font-medium text-foreground/90">{r.title}</span>
                            {r.reviewNote && (
                              <span className="clamp-1 mt-1 block text-[11.5px] text-[hsl(var(--destructive))]">
                                审核意见：{r.reviewNote}
                              </span>
                            )}
                          </span>
                          {mine(r) && (
                            <Chip tone="primary" className="!px-2 !py-0 !text-[10px]">
                              负责人
                            </Chip>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <Chip className="!px-2.5 !py-0.5">{r.category}</Chip>
                      </Td>
                      <Td>
                        <span className="block">{r.leaderName}</span>
                        <span className="mono block text-[11px] text-muted-foreground">{r.leaderStudentId}</span>
                      </Td>
                      <Td>
                        <span className="flex items-center gap-1.5 text-[12.5px]">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="mono">{r.teamSize}</span> 人
                        </span>
                      </Td>
                      <Td className="text-[12.5px] text-muted-foreground">{r.advisor || '—'}</Td>
                      <Td>
                        <ApplyStatusChip status={r.status} />
                      </Td>
                      <Td>
                        <span className="mono text-[11.5px] text-muted-foreground">{fdatetime(r.createdAt)}</span>
                      </Td>
                      <Td className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setActive(r)}>
                          详情
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </div>

          {/* 移动端卡片 */}
          <div className="flex flex-col gap-3.5 lg:hidden">
            {rows.map((r, i) => (
              <Glass
                key={r.id}
                tone="soft"
                hover
                sheen
                className="p-4"
                data-reveal="scale"
                style={{ transitionDelay: `${Math.min(i, 5) * 55}ms` }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Chip className="!px-2.5 !py-0.5">{r.category}</Chip>
                  <ApplyStatusChip status={r.status} />
                  {mine(r) && (
                    <Chip tone="primary" className="!px-2 !py-0.5 !text-[10px]">
                      负责人
                    </Chip>
                  )}
                </div>
                <h3 className="clamp-2 mt-3 text-[15px] font-semibold leading-snug">{r.title}</h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="clamp-1">{r.leaderName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span className="mono">{r.teamSize}</span> 人团队
                  </div>
                  <div className="clamp-1 col-span-2">指导教师：{r.advisor || '—'}</div>
                  <div className="mono col-span-2">提交 {fdatetime(r.createdAt)}</div>
                </dl>
                {r.reviewNote && (
                  <p className="mt-3 rounded-2xl border border-[hsl(var(--destructive))]/25 bg-[hsl(var(--destructive))]/8 px-3.5 py-2.5 text-[12px] leading-relaxed text-[hsl(var(--destructive))]">
                    审核意见：{r.reviewNote}
                  </p>
                )}
                <Button variant="glass" size="sm" className="mt-3.5 w-full" onClick={() => setActive(r)}>
                  查看详情
                </Button>
              </Glass>
            ))}
          </div>
        </>
      )}

      {/* ------------------------------ 详情抽屉 ------------------------------ */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title="申报详情"
        footer={
          active ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="mono text-[11px] text-muted-foreground">
                记录 #{active.id} · 更新于 {fdatetime(active.updatedAt)}
              </span>
              <LinkButton to="/account/messages" size="sm">
                查看相关消息
              </LinkButton>
            </div>
          ) : null
        }
      >
        {active && (
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <ApplyStatusChip status={active.status} />
                <Chip className="!px-2.5 !py-0.5">{active.category}</Chip>
                {active.competitionTitle && <Chip tone="accent" className="!px-2.5 !py-0.5">{active.competitionTitle}</Chip>}
              </div>
              <h3 className="mt-3.5 text-lg font-semibold leading-snug">{active.title}</h3>
              {active.intro && (
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{active.intro}</p>
              )}
            </div>

            <Glass tone="soft" className="p-4">
              <h4 className="mb-3 text-[13px] font-semibold">申报信息</h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12.5px]">
                <Info label="负责人" value={active.leaderName} />
                <Info label="学号" value={active.leaderStudentId} mono />
                <Info label="学院" value={active.leaderCollege} span />
                <Info label="联系电话" value={active.leaderPhone} mono />
                <Info label="联系邮箱" value={active.leaderEmail || '—'} span />
                <Info label="指导教师" value={active.advisor || '—'} span />
                <Info label="团队人数" value={`${active.teamSize} 人`} mono />
                <Info label="提交时间" value={fdatetime(active.createdAt)} mono />
              </dl>
            </Glass>

            <div>
              <h4 className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
                <Users className="h-4 w-4 text-primary" />
                团队成员
                <span className="mono text-[11px] font-normal text-muted-foreground">({active.members.length})</span>
              </h4>
              {active.members.length === 0 ? (
                <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5 text-[12.5px] text-muted-foreground">
                  未填写团队成员。
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {active.members.map((m, i) => (
                    <li key={i}>
                      <Chip className="!px-3 !py-1">
                        <Hash className="h-3 w-3 opacity-60" />
                        {memberName(m)}
                      </Chip>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
                <Paperclip className="h-4 w-4 text-primary" />
                申报材料
                <span className="mono text-[11px] font-normal text-muted-foreground">({active.materials.length})</span>
              </h4>
              {active.materials.length === 0 ? (
                <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5 text-[12.5px] text-muted-foreground">
                  未上传申报材料。
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {active.materials.map((m, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <span className="clamp-1 min-w-0 flex-1 text-[13px]">{m?.name || `材料 ${i + 1}`}</span>
                      {m?.size ? <span className="mono shrink-0 text-[11px] text-muted-foreground">{fbytes(m.size)}</span> : null}
                      {m?.url && m.url !== '#' ? (
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="shrink-0 text-[12px] font-medium text-primary transition hover:opacity-80"
                        >
                          查看
                        </a>
                      ) : (
                        <span className="shrink-0 text-[11px] text-muted-foreground/70">演示材料</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {active.reviewNote && (
              <div className="rounded-2xl border border-[hsl(var(--warning))]/25 bg-[hsl(var(--warning))]/8 px-4 py-3.5">
                <p className="text-[12px] font-medium text-[hsl(var(--warning))]">审核意见</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/80">{active.reviewNote}</p>
              </div>
            )}

            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              当前状态：{APPLY_STATUS[active.status] ?? active.status}。审核结果以「我的消息」中的通知为准。
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Info({ label, value, mono, span }: { label: string; value: string; mono?: boolean; span?: boolean }) {
  return (
    <div className={cn(span && 'col-span-2')}>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn('mt-1 break-words text-foreground/85', mono && 'mono')}>{value}</dd>
    </div>
  );
}

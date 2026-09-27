/* 适配层：必须最先导入（在 ResourceManager 渲染前完成 Api 包装） */
import './adminResourceAdapter';

import { useMemo, useState } from 'react';
import { Info, Network, Users as UsersIcon } from 'lucide-react';

import { AdminApi } from '@/lib/api';
import { useApi, useRevealScan, useTitle } from '@/lib/hooks';
import { plain } from '@/lib/utils';
import { Avatar, Chip, Glass, Tabs } from '@/components/ui';
import { ResourceManager, type Column, type FieldDef } from '@/components/AdminKit';

/* =============================================================================
 * 成员与架构 —— /admin/members
 *  - 成员风采：门户「部门概况」页成员墙 + 首页精选
 *  - 组织架构：org_nodes 自关联树，靠 parentId 建立上下级
 * ========================================================================== */

const MEMBER_GROUPS = ['主席团', '竞赛管理组', '项目孵化组', '宣传设计组', '技术服务组', '教师'];

interface MemberRow {
  id: number;
  name: string;
  role: string;
  group: string;
  avatar?: string | null;
  bio?: string | null;
  tags: string[];
  sortOrder: number;
  featured: boolean;
}

interface OrgRow {
  id: number;
  name: string;
  parentId?: number | null;
  leader?: string | null;
  description?: string | null;
  sortOrder: number;
}

/* ------------------------------ 成员风采 ------------------------------ */
const MEMBER_FIELDS: FieldDef[] = [
  { name: 'name', label: '姓名', type: 'text', required: true, placeholder: '例如：李彦' },
  {
    name: 'role',
    label: '职务 / 角色',
    type: 'text',
    placeholder: '例如：部长 / 竞赛组组长',
    hint: '显示在成员卡片姓名下方',
  },
  {
    name: 'group',
    label: '所属工作组',
    type: 'select',
    default: '主席团',
    options: MEMBER_GROUPS.map((v) => ({ value: v, label: v })),
  },
  { name: 'avatar', label: '头像', type: 'image', hint: '建议 1:1 正方形，未上传时使用姓名首字生成' },
  {
    name: 'bio',
    label: '个人简介',
    type: 'textarea',
    wide: true,
    rows: 4,
    placeholder: '例如：负责竞赛信息统筹与校赛组织，擅长嵌入式开发与项目管理。',
    hint: '列表中截断显示，建议 40~80 字',
  },
  { name: 'tags', label: '技能标签', type: 'tags', hint: '回车添加，例如：AI / 硬件 / 视觉设计' },
  { name: 'sortOrder', label: '排序权重', type: 'number', default: 0, hint: '数字越小越靠前' },
  { name: 'featured', label: '首页展示', type: 'switch', hint: '开启后会出现在门户首页的成员精选区' },
];

const MEMBER_COLUMNS: Column<MemberRow>[] = [
  {
    key: 'name',
    title: '姓名',
    width: '210px',
    render: (m) => (
      <div className="flex items-center gap-2.5">
        <Avatar name={m.name} src={m.avatar} size={34} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-foreground/90">{m.name}</p>
          {!!m.tags?.length && (
            <p className="clamp-1 mt-0.5 text-[10.5px] text-muted-foreground">{m.tags.join(' · ')}</p>
          )}
        </div>
      </div>
    ),
  },
  {
    key: 'role',
    title: '角色',
    width: '150px',
    render: (m) => <span className="text-[12.5px] text-foreground/80">{m.role || '—'}</span>,
  },
  {
    key: 'group',
    title: '工作组',
    width: '120px',
    render: (m) => <Chip className="!px-2.5 !py-0.5">{m.group || '—'}</Chip>,
  },
  {
    key: 'bio',
    title: '简介',
    width: '300px',
    render: (m) => <span className="clamp-1 text-xs text-muted-foreground">{plain(m.bio, 60) || '—'}</span>,
  },
  {
    key: 'sortOrder',
    title: '排序',
    width: '80px',
    render: (m) => <span className="mono text-xs text-muted-foreground">{m.sortOrder ?? 0}</span>,
  },
];

/* ------------------------------ 组织架构 ------------------------------ */
const ORG_FIELDS: FieldDef[] = [
  { name: 'name', label: '节点名称', type: 'text', required: true, placeholder: '例如：竞赛管理组' },
  {
    name: 'parentId',
    label: '上级节点 ID',
    type: 'number',
    hint: '填写上级节点在表格「ID」列中的数字；顶级节点请留空',
    placeholder: '留空 = 顶级节点',
  },
  { name: 'leader', label: '负责人', type: 'text', placeholder: '例如：张伟（部长）' },
  {
    name: 'description',
    label: '职责说明',
    type: 'textarea',
    wide: true,
    rows: 3,
    placeholder: '例如：负责各级科技竞赛的信息发布、校内选拔组织与参赛保障。',
  },
  { name: 'sortOrder', label: '排序权重', type: 'number', default: 0, hint: '同级节点按该值升序排列' },
];

/* =============================================================================
 * 页面
 * ========================================================================== */
export default function Members() {
  useTitle('成员与架构');
  const [tab, setTab] = useState('members');
  /* 本页为懒加载路由，切换页签会重建资源管理区 —— 重新扫描滚动揭示 */
  useRevealScan(tab);

  /* 组织架构：拉一份全量节点用于显示上级名称 */
  const { data: allNodes } = useApi<OrgRow[]>(() => AdminApi.resource('org-nodes').list({ page: 1, pageSize: 100 }) as any, []);

  const nameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const n of allNodes ?? []) m.set(n.id, n.name);
    return m;
  }, [allNodes]);

  const orgColumns: Column<OrgRow>[] = useMemo(
    () => [
      {
        key: 'name',
        title: '节点名称',
        width: '220px',
        render: (o) => (
          <div className="flex items-center gap-2">
            <Network className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            <span className="truncate text-[13px] font-medium text-foreground/90">{o.name}</span>
          </div>
        ),
      },
      {
        key: 'parentId',
        title: '上级节点',
        width: '180px',
        render: (o) =>
          o.parentId ? (
            <span className="text-[12px] text-foreground/80">
              {nameById.get(o.parentId) ?? '未知节点'}
              <span className="mono ml-1.5 text-[10.5px] text-muted-foreground">#{o.parentId}</span>
            </span>
          ) : (
            <Chip tone="primary" className="!px-2.5 !py-0.5 !text-[10.5px]">
              顶级节点
            </Chip>
          ),
      },
      {
        key: 'leader',
        title: '负责人',
        width: '150px',
        render: (o) => <span className="text-[12.5px] text-muted-foreground">{o.leader || '—'}</span>,
      },
      {
        key: 'description',
        title: '职责说明',
        width: '320px',
        render: (o) => <span className="clamp-1 text-xs text-muted-foreground">{plain(o.description, 60) || '—'}</span>,
      },
      {
        key: 'sortOrder',
        title: '排序',
        width: '80px',
        render: (o) => <span className="mono text-xs text-muted-foreground">{o.sortOrder ?? 0}</span>,
      },
    ],
    [nameById]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------ 说明卡片 ------------------------------ */}
      <div data-reveal>
        <Glass tone="soft" className="p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <Info className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">成员与架构说明</p>
                <ul className="mt-1.5 flex flex-col gap-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary/70">·</span>
                    <span>
                      「成员风采」对应门户「部门概况」页的成员墙；开启
                      <b className="text-foreground/85">首页展示</b>后，该成员还会出现在首页精选区。
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary/70">·</span>
                    <span>
                      「组织架构」靠 <span className="mono text-foreground/85">parentId</span> 建立上下级关系：
                      <b className="text-foreground/85">顶级节点 parentId 留空</b>；子节点在「上级节点 ID」里填写上级的
                      <span className="mono text-foreground/85"> ID</span>（见表格 ID 列）。层级不限制深度，门户会自动递归成树。
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary/70">·</span>
                    <span>
                      「排序权重」数字越小越靠前，同级的兄弟节点按该值升序排列；改动后前台立即生效。
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <Tabs
              items={[
                { value: 'members', label: '成员风采' },
                { value: 'org', label: '组织架构' },
              ]}
              value={tab}
              onChange={setTab}
              className="shrink-0"
            />
          </div>
        </Glass>
      </div>

      {/* ------------------------------ 资源管理 ------------------------------ */}
      {tab === 'members' ? (
        <ResourceManager<MemberRow>
          title="成员风采"
          description="维护部门成员卡片：头像、角色、工作组与技能标签，可标记首页展示。"
          resource="members"
          fields={MEMBER_FIELDS}
          columns={MEMBER_COLUMNS}
          pageSize={12}
          searchPlaceholder="搜索成员姓名或角色…"
          emptyText="暂无成员"
          createLabel="新增成员"
          catalog={(m) =>
            m.featured ? (
              <Chip tone="success" className="!px-2.5 !py-0.5 !text-[10.5px]">
                首页展示
              </Chip>
            ) : (
              <Chip className="!px-2.5 !py-0.5 !text-[10.5px]">仅概况页</Chip>
            )
          }
          filters={({ filters, setFilter }) => [
            {
              name: 'group',
              label: '工作组',
              value: filters.group ?? '',
              options: [{ value: '', label: '全部工作组' }, ...MEMBER_GROUPS.map((g) => ({ value: g, label: g }))],
              onChange: (v) => setFilter('group', v),
            },
          ]}
        />
      ) : (
        <ResourceManager<OrgRow>
          title="组织架构"
          description="用 parentId 维护部门的树形结构，门户「部门概况」页会自动渲染成组织架构图。"
          resource="org-nodes"
          fields={ORG_FIELDS}
          columns={orgColumns}
          pageSize={12}
          searchPlaceholder="搜索节点名称…"
          emptyText="暂无组织节点"
          createLabel="新增节点"
        />
      )}
    </div>
  );
}

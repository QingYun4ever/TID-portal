# 开发契约 · 科技创新部门户（供协作 agent 阅读）

> 项目根目录：`D:\All\Projects\科技创新部门户\portal`
> 本文件是**必须遵守的实现契约**。动手前请先读完。

---

## 0. 一句话背景

为「科技创新部」构建的门户网站。**全新设计**，视觉语言为「液态玻璃 / Liquid Glass」：
纯黑背景 + 深海流体光雾 + 点线网格 + 磨砂玻璃 + 轨道粒子动画。
设计规范见 `portal/design.md`（**必读**）。

**注意**：同目录下的 `../mc-server-manager` 只是一个**参考项目**（用于了解后台/画廊可以做到什么程度的功能），
它的「黑曜石棱镜 / 切角 / 零圆角」视觉语言**不要照搬**，本项目不使用切角与直角硬边。

---

## 1. 技术栈（已安装，**不要新增任何依赖**）

- Vite 7 + React 19 + TypeScript + Tailwind CSS 3.4
- react-router 7
- lucide-react（图标）
- 后端 Hono 4 + `node:sqlite`（已实现，见 `server/`）
- 无 UI 库、无状态管理库、无动画库、无图表库 —— 全部手写

---

## 2. 目录与既有资产

```
portal/
├── design.md                     # 设计规范（必读）
├── shared/types.ts               # 前后端共享类型
├── server/                       # 后端（已完成，不要改）
│   ├── index.ts  db.ts  auth.ts  util.ts
│   └── routes/ public.ts  submit.ts  auth.ts  admin.ts
└── src/
    ├── index.css                 # 设计系统（玻璃类、动画、排版）
    ├── App.tsx                   # 路由表（已定，页面文件必须存在且 default export）
    ├── lib/
    │   ├── api.ts                # API 客户端（PublicApi / AuthApi / SubmitApi / AdminApi）
    │   ├── hooks.ts              # useApi / useReveal / useScrollProgress / useActiveSection / useInView / useCountUp / useMediaQuery / useDebounced / useLocalStorage / useBodyLock / useEscape / useInterval / useTitle
    │   ├── store.tsx             # useAuth / useSettings / useToast（Provider 已挂载）
    │   ├── utils.ts              # cn / fdate / fdatetime / fromNow / countdown / daysLeft / fbytes / fnum / plain / statusTone / APPLY_STATUS / NEWS_CATEGORIES / PROJECT_CATEGORIES / RESOURCE_CATEGORIES / FEEDBACK_TYPES / ROLES
    │   └── qrcode.ts             # encodeQr / qrSvg / qrSvgPath（已通过参考实现逐位验证）
    ├── components/
    │   ├── Brand.tsx             # LogoMark / LogoLockup / BrandWordmark
    │   ├── LiquidBackdrop.tsx    # LiquidBackdrop / GlowOrb / GridTexture / NoiseTexture
    │   ├── ui.tsx                # 基础组件（见下）
    │   ├── cards.tsx             # 内容卡片（见下）
    │   ├── AdminKit.tsx          # 后台组件（见下）
    │   ├── Nav.tsx  Footer.tsx
    │   └── ...
    └── pages/                    # 页面（部分为占位，需要你实现）
```

---

## 3. 组件契约（**优先复用，不要重造**）

### `@/components/ui`

```
Glass({tone:'default'|'strong'|'thin'|'soft', refract, sheen, hover, as})
GlassCard({tone, hover, sheen})            # 玻璃卡片
Button({variant:'primary'|'glass'|'ghost'|'danger'|'outline', size:'sm'|'md'|'lg'|'icon'|'icon-sm', loading})
LinkButton({to, variant, size, external})  # 路由感知的按钮
Chip({tone:'default'|'primary'|'accent'|'success'|'warning'|'danger'})
Dot({tone, pulse})                         # 状态点
Input / Textarea / Select / SearchInput / Checkbox / Switch
Field({label, hint, error, required})      # 表单字段容器
Modal({open,onClose,title,description,footer,size}) / ConfirmDialog / Drawer({side})
Section({id, eyebrow, title, description, action, children, container, align})
PageHero({eyebrow, title, description, children, breadcrumb})
Breadcrumb({items:[{label,to}]})
Tabs({items:[{value,label,count}], value, onChange, size})
Spinner / Skeleton / EmptyState({icon,title,description,action}) / ErrorState
Pagination({page,pageSize,total,onChange})
StatCard / ProgressBar / Avatar({name,src,size}) / Countdown({target})
TableWrap / Th / Td
ToastViewport（已挂载于 App）
Accordion({items:[{q,a}]}) / Tag / Parallax({speed})
```

### `@/components/cards`

```
ArticleCard({article, featured?, compact?})
ActivityCard({activity})
ProjectCard({project, size:'sm'|'md'|'lg'})
CompetitionCard({competition})
ResourceCard({resource, onDownload})
ApplyStatusChip({status})
TimelineItem({node, index, total})
```

### `@/components/AdminKit`

```
AdminPage({title, description, actions, breadcrumb, icon, children})
StatTile({label, value, hint, tone, icon, onClick, active})
FilterBar({search, onSearch, placeholder, filters, extra})
DataTable({columns, rows, loading, empty, selectable, selected, onSelectedChange,
           onRowClick, rowActions, page, pageSize, total, onPageChange, dense})
RowBtn({icon, label, onClick, tone})
ResourceManager({title, description, resource, fields, columns, filters, pageSize,
                 searchPlaceholder, emptyText, catalog, headerActions, onChanged, readOnly, createLabel})
RichTextEditor({value, onChange, placeholder, minHeight})
ImagePicker({value, onChange, label}) / MultiImageUpload({onUploaded})
TagInput / ListInput
StatusChip({status, labels})
MiniBars({data, labels, height, tone}) / Sparkline({data, tone}) / BarList({items})
QrPanel({payload, title, subtitle})
ReviewActions({current, onReview})
ExportButton({kind, params, label})
FieldDef / FieldRenderer / Column<T>
```

### `@/components/Brand`

```
LogoMark({className, style, uid, animated, monochrome})   # 图标（uid 必须唯一，用于 SVG 渐变 id）
LogoLockup({size, animated, iconOnly, stacked, uid})       # 图标 + 中文名 + 英文名
BrandWordmark({size})
```

---

## 4. 样式规则

**必须**使用 `src/index.css` 中已定义的工具类 / 组件类，不要另起一套：

- 玻璃：`.lg` `.lg-strong` `.lg-thin` `.lg-soft` `.lg-refract` `.lg-sheen` `.lg-hover`（或直接用 `Glass` 组件）
- 按钮：`.btn` `.btn-primary` `.btn-glass` `.btn-ghost` `.btn-danger` `.btn-sm` `.btn-lg` `.btn-icon`
- 表单：`.field` `.field-label`
- 徽章：`.chip` `.chip-primary` `.chip-accent` `.chip-success` `.chip-warning` `.chip-danger`
- 排版：`.mono`（数据/数字）`.eyebrow`（小标题）`.spotlight-text` `.aurora-text` `.prose-glass`（富文本）
- 布局：`.shell` `.shell-wide` `.section-pad` `.hairline` `.grid-bg`
- 顶栏：`.nav-glass`
- 截断：`.clamp-1/2/3/4`
- 滚动揭示：给元素加 `data-reveal` 或 `data-reveal="left|right|scale|blur"`，进入视口自动加 `.is-in`

**颜色**：只用语义 token（`text-primary` / `bg-accent/12` / `border-white/10` / `text-muted-foreground`）。
透明度支持任意整数（`bg-white/8`、`border-white/12` 均可用，已在 tailwind.config 扩展）。

**禁止**：硬编码十六进制色、切角/直角硬边面板、渐变按钮、新增 npm 依赖、引入外部 CSS 框架。

---

## 5. API 契约

统一从 `@/lib/api` 引入。返回值：`apiData()` 直接拿到 `data`；`apiFull()` 拿到 `{ok,data,...附加字段}`。

```ts
PublicApi.overview() / settings() / page(key)
PublicApi.articles({page,pageSize,category,q,tag,sort}) -> apiFull  // 附加 counts / tags
PublicApi.article(slug) -> api     // 附加 attachments / related / prev / next
PublicApi.activities({page,pageSize,scope:'upcoming'|'past'|'all',q,category}) -> apiFull
PublicApi.activityCalendar(year, month) / activity(slug) / projects(...) / project(slug)
PublicApi.competitions({q,level}) -> apiFull / resources({category,q}) -> apiFull
PublicApi.join() / feedback({page,pageSize,type,status}) / galleryAreas() / galleryImages({page,pageSize,areaId,q})
PublicApi.about() / status() / changelog() / search(q,scope) / tags()

SubmitApi.signupActivity(id, data) / cancelSignup(id, studentId) / applyProject(data) / applyJoin(data)
SubmitApi.feedback(data) / likeFeedback(id) / subscribeCompetition(id, email) / downloadResource(id)
SubmitApi.teamRequest(data) / advisorAppointment(data)

AuthApi.login/register/logout/me/updateMe/changePassword/signups/applications/joinApplications/myFeedback/messages/readMessages/deleteMessage/advisors/teammates

AdminApi.stats/dbSummary/logs/clearLogs/settings/saveSettings/pages/savePage/users/createUser/updateUser/deleteUser/broadcast/upload
AdminApi.resource(name).list/get/create/update/remove      // 通用 CRUD
AdminApi.signups/checkin/deleteSignup/applications/reviewApplication
AdminApi.joinApplications/reviewJoin/deleteJoin/feedback/replyFeedback/deleteFeedback
AdminApi.galleryAreas/galleryImages/addGalleryImages/updateGalleryImage/deleteGalleryImage/batchGallery
AdminApi.exportUrl(kind, params)   // kind: signups | applications | join | feedback
```

数据获取用 `useApi(fetcher, deps)` → `{data, meta, loading, error, reload}`。

后端已有的通用 CRUD 资源名（用于 `AdminApi.resource(name)`）：
`articles` `activities` `projects` `competitions` `resources` `join-positions` `members` `timeline` `org-nodes` `changelog` `status-targets` `gallery/areas`

---

## 6. 页面实现要求

每个页面文件必须 **`export default`** 一个组件，路径与 `src/App.tsx` 中的 `lazy(() => import(...))` 完全一致。

通用要求：

1. **内页**用 `<PageHero>` 开篇（含 `breadcrumb`），下面用 `<Section>` 或自定义容器；页面底部留 `pb-24`。
2. **加载态**用 `<Skeleton>` 骨架，**空态**用 `<EmptyState>`，**错误态**用 `<ErrorState onRetry={reload}>`。
3. 列表页要有：搜索、分类筛选（`Tabs` 或 `FilterBar`）、分页（`Pagination`）。
4. 给分区/卡片加 `data-reveal` 做滚动揭示。
5. `useTitle('页面名')` 设置标题。
6. 表单提交要有：校验、`loading` 态、`useToast()` 反馈、成功后重置或跳转。
7. 移动端要能用（`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` 这类响应式）。
8. 后台页面统一用 `AdminKit` 的 `AdminPage` + `ResourceManager` / `DataTable`，**不要**自己写表格样式。
9. 不要 `console.log` 调试残留；不要 TODO 占位（必须真实现）。
10. 中文文案，语气专业、简洁。

---

## 7. 自检（**必须做**）

写完后运行以下命令，全部通过才算完成：

```powershell
# 1) 类型检查（只看你负责的文件有没有报错）
cd "D:\All\Projects\科技创新部门户\portal"
npx tsc --noEmit -p tsconfig.json

# 2) 页面渲染检查（会输出 JS 异常 / 控制台错误 / 截图）
node scripts/browser.mjs --url "http://127.0.0.1:5273/<你的路由>" --out "scripts\_check.png" --wait 5000
```

要求：`browser.mjs` 输出里必须出现 `OK : 无 JS 异常 / 控制台错误`，且 `ROOT` 的 children 数 > 0。

> 开发服务器（Vite `5273`、API `8787`）已在运行。若未运行：
> `npm run dev:api`（另一个终端）与 `npx vite --port 5273`。

**不要**修改：`server/**`、`src/index.css` 的既有类名、`src/App.tsx` 的路由表、`tailwind.config.js`、
`src/lib/*`、`src/components/ui.tsx`、`src/components/cards.tsx`、`src/components/AdminKit.tsx`。
如确实需要新增公共组件，新建文件而不是改既有文件。

---

## 8. 测试账号

- 超级管理员：`admin` / `admin123`
- 管理员：`zhangwei` / `sti123456`
- 部门成员：`liyan` / `sti123456`
- 学生：`chenxi` / `sti123456`

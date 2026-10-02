/* =============================================================================
 * 科技创新部门户 — 共享类型定义（前端 / 后端共用）
 * ========================================================================== */

export type Role = 'superadmin' | 'admin' | 'member' | 'student';

export interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  studentId: string | null;
  college: string | null;
  isActive: boolean;
  createdAt: string;
}

/* ------------------------------ 新闻与通知 ------------------------------ */
export type NewsCategory = 'notice' | 'dept' | 'competition' | 'policy';
export type ContentStatus = 'draft' | 'pending' | 'published' | 'rejected';

export interface Article {
  id: number;
  title: string;
  slug: string;
  category: NewsCategory;
  summary: string;
  content: string;
  cover: string | null;
  tags: string[];
  pinned: boolean;
  status: ContentStatus;
  views: number;
  authorId: number | null;
  authorName?: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: number;
  ownerType: string;
  ownerId: number;
  name: string;
  url: string;
  size: number;
  createdAt: string;
}

/* -------------------------------- 活动 --------------------------------- */
export type ActivityStatus = 'draft' | 'published' | 'ended';

export interface Activity {
  id: number;
  title: string;
  slug: string;
  cover: string | null;
  summary: string;
  content: string;
  location: string;
  category: string;
  startAt: string;
  endAt: string | null;
  signupStart: string | null;
  signupEnd: string | null;
  capacity: number;
  signedCount: number;
  status: ActivityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ActivitySignup {
  id: number;
  activityId: number;
  userId: number | null;
  name: string;
  studentId: string;
  college: string;
  major: string | null;
  phone: string;
  email: string | null;
  remark: string | null;
  checkedIn: boolean;
  createdAt: string;
}

/* ---------------------------- 创新项目与竞赛 ---------------------------- */
export type ProjectCategory = 'excellent' | 'approved' | 'completed' | 'ongoing' | 'competition' | 'frontend' | 'service' | 'hardware';
export type ApplyStatus = 'pending' | 'reviewing' | 'approved' | 'rejected';

export interface Project {
  id: number;
  title: string;
  slug: string;
  cover: string | null;
  demoUrl: string | null;
  modelUrl: string | null;
  summary: string;
  content: string;
  category: ProjectCategory;
  year: number;
  team: string;
  members: string[];
  advisor: string | null;
  tags: string[];
  awards: string | null;
  status: ContentStatus;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface Competition {
  id: number;
  title: string;
  level: string;
  organizer: string;
  summary: string;
  content: string;
  signupDeadline: string | null;
  link: string | null;
  cover: string | null;
  status: ContentStatus;
  createdAt: string;
}

export interface ProjectApplication {
  id: number;
  title: string;
  competitionId: number | null;
  competitionTitle?: string | null;
  leaderName: string;
  leaderStudentId: string;
  leaderCollege: string;
  leaderPhone: string;
  leaderEmail: string | null;
  advisor: string | null;
  teamSize: number;
  members: string[];
  category: string;
  intro: string;
  materials: { name: string; url: string; size: number }[];
  status: ApplyStatus;
  reviewNote: string | null;
  userId: number | null;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------- 资源中心 ------------------------------- */
export type ResourceCategory = 'template' | 'policy' | 'guide' | 'training' | 'faq';

export interface Resource {
  id: number;
  title: string;
  category: ResourceCategory;
  description: string;
  url: string;
  fileType: string;
  fileSize: number;
  downloads: number;
  external: boolean;
  sortOrder: number;
  createdAt: string;
}

/* -------------------------------- 加入我们 ------------------------------- */
export interface JoinPosition {
  id: number;
  name: string;
  group: string;
  headcount: number;
  description: string;
  requirements: string[];
  sortOrder: number;
  active: boolean;
}

export interface JoinApplication {
  id: number;
  positionId: number | null;
  positionName?: string | null;
  name: string;
  studentId: string;
  college: string;
  major: string;
  grade: string;
  phone: string;
  email: string | null;
  skills: string;
  intro: string;
  status: ApplyStatus;
  reviewNote: string | null;
  userId: number | null;
  createdAt: string;
}

/* ------------------------------- 互动与反馈 ------------------------------ */
export type FeedbackType = 'consult' | 'suggestion' | 'question' | 'vote';

export interface Feedback {
  id: number;
  type: FeedbackType;
  title: string;
  content: string;
  contact: string | null;
  anonymous: boolean;
  authorName: string | null;
  status: 'open' | 'replied' | 'closed';
  reply: string | null;
  repliedAt: string | null;
  likes: number;
  userId: number | null;
  createdAt: string;
}

/* -------------------------------- 画廊 --------------------------------- */
export interface GalleryArea {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  description: string | null;
  sortOrder: number;
  imageCount?: number;
  children?: GalleryArea[];
}

export interface GalleryImage {
  id: number;
  areaId: number;
  areaName?: string;
  url: string;
  title: string;
  description: string | null;
  width: number;
  height: number;
  sortOrder: number;
  createdAt: string;
}

/* ------------------------------ 部门概况 ------------------------------- */
export interface TimelineNode {
  id: number;
  year: string;
  dateLabel: string;
  title: string;
  description: string;
  sortOrder: number;
}

export interface OrgNode {
  id: number;
  name: string;
  parentId: number | null;
  leader: string | null;
  description: string | null;
  sortOrder: number;
  children?: OrgNode[];
}

export interface Member {
  id: number;
  name: string;
  role: string;
  group: string;
  avatar: string | null;
  bio: string | null;
  tags: string[];
  sortOrder: number;
  featured: boolean;
}

export interface PageDoc {
  key: string;
  title: string;
  content: string;
  updatedAt: string;
}

/* ------------------------------- Status -------------------------------- */
export type TargetType = 'website' | 'server';

export interface StatusTarget {
  id: number;
  name: string;
  type: TargetType;
  url: string | null;
  host: string | null;
  description: string | null;
  sortOrder: number;
  active: boolean;
  online?: boolean;
  latencyMs?: number | null;
  uptime24h?: number;
  uptime30d?: number;
  history?: { t: string; online: boolean; latencyMs: number | null }[];
}

/* ------------------------------ 消息 / 日志 ----------------------------- */
export interface UserMessage {
  id: number;
  userId: number;
  title: string;
  content: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export interface OperationLog {
  id: number;
  userId: number | null;
  userName: string | null;
  action: string;
  target: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: string;
}

/* ------------------------------- 通用 ---------------------------------- */
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Stats {
  articles: number;
  activities: number;
  projects: number;
  applications: number;
  signups: number;
  joinApplications: number;
  feedbackOpen: number;
  users: number;
  galleryImages: number;
  resources: number;
  views: number;
  trend: { date: string; views: number; signups: number; applications: number }[];
  categoryBreakdown: { name: string; value: number }[];
}

export interface SiteSettings {
  deptName: string;
  deptNameEn: string;
  slogan: string;
  intro: string;
  email: string;
  phone: string;
  address: string;
  wechatQr: string;
  icp: string;
  [k: string]: string;
}

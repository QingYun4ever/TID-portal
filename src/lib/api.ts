/* =============================================================================
 * API 客户端 — 统一 fetch 封装，自动带令牌，统一错误处理
 * ========================================================================== */

const TOKEN_KEY = 'sti_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiResponse<T> {
  ok: boolean;
  data: T;
  [k: string]: unknown;
}

export async function api<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const token = getToken();
  const isForm = opts.body instanceof FormData;
  const headers: Record<string, string> = { Accept: 'application/json', ...(opts.headers || {}) };
  if (!isForm && opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: isForm ? (opts.body as FormData) : opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      credentials: 'include',
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new ApiError('网络连接失败，请检查网络后重试', 0, 'NETWORK');
  }

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = json?.error || (res.status === 401 ? '请先登录' : `请求失败（${res.status}）`);
    if (res.status === 401 && getToken()) setToken(null);
    throw new ApiError(msg, res.status, json?.code);
  }
  if (json && typeof json === 'object' && 'data' in json) return json as unknown as T;
  return json as T;
}

/** 只取 data 字段的便捷封装 */
export async function apiData<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const r = await api<ApiResponse<T>>(path, opts);
  return r.data;
}

/** 带附加字段（counts / categories 等） */
export async function apiFull<T = any>(path: string, opts: ApiOptions = {}): Promise<ApiResponse<T>> {
  return api<ApiResponse<T>>(path, opts);
}

/* ------------------------------ 具体接口 -------------------------------- */
export const AuthApi = {
  login: (username: string, password: string) => apiData('/auth/login', { body: { username, password } }),
  register: (data: Record<string, unknown>) => apiData('/auth/register', { body: data }),
  logout: () => apiData('/auth/logout', { body: {} }),
  me: () => apiData<{ user: any; stats: any } | null>('/auth/me'),
  updateMe: (data: Record<string, unknown>) => apiData('/auth/me', { method: 'PATCH', body: data }),
  changePassword: (oldPassword: string, newPassword: string) =>
    apiData('/auth/change-password', { body: { oldPassword, newPassword } }),
  signups: () => apiData<any[]>('/auth/my/signups'),
  applications: () => apiData<any[]>('/auth/my/applications'),
  joinApplications: () => apiData<any[]>('/auth/my/join-applications'),
  myFeedback: () => apiData<any[]>('/auth/my/feedback'),
  messages: () => api<any[]>('/auth/messages'),
  readMessages: (id?: number) => apiData('/auth/messages/read', { body: { id } }),
  deleteMessage: (id: number) => apiData(`/auth/messages/${id}`, { method: 'DELETE' }),
  advisors: () => apiData<any[]>('/auth/advisors'),
  teammates: () => apiData<any[]>('/auth/teammates'),
};

export const PublicApi = {
  settings: () => apiData<Record<string, string>>('/settings'),
  overview: () => apiData<any>('/overview'),
  page: (key: string) => apiData<any>(`/pages/${key}`),
  articles: (params: Record<string, string | number> = {}) => apiFull<any>(`/articles?${qs(params)}`),
  article: (slug: string) => api<any>(`/articles/${slug}`),
  activities: (params: Record<string, string | number> = {}) => apiFull<any>(`/activities?${qs(params)}`),
  activityCalendar: (year: number, month: number) => apiData<any[]>(`/activities/calendar?year=${year}&month=${month}`),
  activity: (slug: string) => api<any>(`/activities/${slug}`),
  projects: (params: Record<string, string | number> = {}) => apiFull<any>(`/projects?${qs(params)}`),
  project: (slug: string) => api<any>(`/projects/${slug}`),
  competitions: (params: Record<string, string | number> = {}) => apiFull<any>(`/competitions?${qs(params)}`),
  resources: (params: Record<string, string | number> = {}) => apiFull<any>(`/resources?${qs(params)}`),
  join: () => apiData<any>('/join'),
  feedback: (params: Record<string, string | number> = {}) => apiFull<any>(`/feedback?${qs(params)}`),
  galleryAreas: () => apiData<any[]>('/gallery/areas'),
  galleryImages: (params: Record<string, string | number> = {}) => apiFull<any>(`/gallery/images?${qs(params)}`),
  about: () => apiData<any>('/about'),
  search: (q: string, scope = 'all') => apiData<any>(`/search?q=${encodeURIComponent(q)}&scope=${scope}`),
  tags: () => apiData<any[]>('/tags'),
};

export const SubmitApi = {
  signupActivity: (id: number, data: Record<string, unknown>) =>
    apiData(`/activities/${id}/signup`, { body: data }),
  cancelSignup: (id: number, studentId: string) => apiData(`/activities/${id}/cancel`, { body: { studentId } }),
  applyProject: (data: Record<string, unknown>) => apiData<{ id: number }>('/projects/apply', { body: data }),
  applyJoin: (data: Record<string, unknown>) => apiData<{ id: number }>('/join/apply', { body: data }),
  feedback: (data: Record<string, unknown>) => apiData<{ id: number }>('/feedback', { body: data }),
  likeFeedback: (id: number) => apiData(`/feedback/${id}/like`, { body: {} }),
  subscribeCompetition: (id: number, email: string) =>
    apiData(`/competitions/${id}/subscribe`, { body: { email } }),
  downloadResource: (id: number) => apiData<{ url: string; downloads: number }>(`/resources/${id}/download`, { body: {} }),
  teamRequest: (data: Record<string, unknown>) => apiData('/team-requests', { body: data }),
  advisorAppointment: (data: Record<string, unknown>) => apiData('/advisor-appointments', { body: data }),
};

export const AdminApi = {
  stats: () => apiData<any>('/admin/stats'),
  dbSummary: () => apiData<any[]>('/admin/db-summary'),
  logs: (params: Record<string, string | number> = {}) => apiFull<any>(`/admin/logs?${qs(params)}`),
  clearLogs: () => apiData('/admin/logs', { method: 'DELETE' }),
  settings: () => apiData<Record<string, string>>('/admin/settings'),
  saveSettings: (data: Record<string, string>) => apiData('/admin/settings', { method: 'PUT', body: data }),
  pages: () => apiData<any[]>('/admin/pages'),
  savePage: (key: string, data: { title?: string; content?: string }) =>
    apiData(`/admin/pages/${key}`, { method: 'PUT', body: data }),
  users: (params: Record<string, string | number> = {}) => apiFull<any>(`/admin/users?${qs(params)}`),
  createUser: (data: Record<string, unknown>) => apiData('/admin/users', { body: data }),
  updateUser: (id: number, data: Record<string, unknown>) => apiData(`/admin/users/${id}`, { method: 'PATCH', body: data }),
  deleteUser: (id: number) => apiData(`/admin/users/${id}`, { method: 'DELETE' }),
  broadcast: (data: Record<string, unknown>) => apiData<{ sent: number }>('/admin/users/broadcast', { body: data }),
  upload: async (files: File[]): Promise<{ url: string; name: string; size: number }[]> => {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    return apiData('/admin/upload', { body: fd });
  },
  exportUrl: (kind: string, params: Record<string, string | number> = {}) =>
    `/api/admin/export/${kind}?${qs(params)}`,
  /** 通用资源 CRUD */
  resource: (name: string) => ({
    list: (params: Record<string, string | number> = {}) => apiFull<any>(`/admin/${name}?${qs(params)}`),
    get: (id: number) => apiData(`/admin/${name}/${id}`),
    create: (data: Record<string, unknown>) => apiData<{ id: number }>(`/admin/${name}`, { body: data }),
    update: (id: number, data: Record<string, unknown>) => apiData(`/admin/${name}/${id}`, { method: 'PATCH', body: data }),
    remove: (id: number) => apiData(`/admin/${name}/${id}`, { method: 'DELETE' }),
  }),
  signups: (params: Record<string, string | number> = {}) => apiFull<any>(`/admin/signups?${qs(params)}`),
  checkin: (id: number, checkedIn: boolean) => apiData(`/admin/signups/${id}/checkin`, { body: { checkedIn } }),
  deleteSignup: (id: number) => apiData(`/admin/signups/${id}`, { method: 'DELETE' }),
  applications: (params: Record<string, string | number> = {}) => apiFull<any>(`/admin/applications?${qs(params)}`),
  reviewApplication: (id: number, status: string, reviewNote?: string) =>
    apiData(`/admin/applications/${id}`, { method: 'PATCH', body: { status, reviewNote } }),
  joinApplications: (params: Record<string, string | number> = {}) => apiFull<any>(`/admin/join-applications?${qs(params)}`),
  reviewJoin: (id: number, status: string, reviewNote?: string) =>
    apiData(`/admin/join-applications/${id}`, { method: 'PATCH', body: { status, reviewNote } }),
  deleteJoin: (id: number) => apiData(`/admin/join-applications/${id}`, { method: 'DELETE' }),
  feedback: (params: Record<string, string | number> = {}) => apiFull<any>(`/admin/feedback?${qs(params)}`),
  replyFeedback: (id: number, reply: string, status?: string) =>
    apiData(`/admin/feedback/${id}`, { method: 'PATCH', body: { reply, status } }),
  deleteFeedback: (id: number) => apiData(`/admin/feedback/${id}`, { method: 'DELETE' }),
  galleryAreas: () => apiFull<any>('/admin/gallery/areas'),
  galleryImages: (params: Record<string, string | number> = {}) => apiFull<any>(`/admin/gallery/images?${qs(params)}`),
  addGalleryImages: (data: Record<string, unknown>) => apiData<{ ids: number[]; count: number }>('/admin/gallery/images', { body: data }),
  updateGalleryImage: (id: number, data: Record<string, unknown>) =>
    apiData(`/admin/gallery/images/${id}`, { method: 'PATCH', body: data }),
  deleteGalleryImage: (id: number) => apiData(`/admin/gallery/images/${id}`, { method: 'DELETE' }),
  batchGallery: (data: Record<string, unknown>) => apiData('/admin/gallery/images/batch', { body: data }),
};

export function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  return sp.toString();
}

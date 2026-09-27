/* =============================================================================
 * 后台通用资源（ResourceManager）数据适配层
 * -----------------------------------------------------------------------------
 * 为什么需要它：
 *
 *  1) 分页结构不一致
 *     后端通用 CRUD 列表（GET /api/admin/<resource>）实际返回
 *        { ok:true, data:{ items:[…], total, page, pageSize } }
 *     而 AdminKit 的 ResourceManager 读取的是
 *        res.data  → 行数组
 *        res.total → 总数
 *     直接使用会让表格永远停在空态、分页恒为 0。这里在 list() 上包一层，
 *     把 data.items 拉平为 data 数组；若后端/AdminKit 之后统一为扁平结构，
 *     则是数组时原样透传，可安全重复调用。
 *
 *  2) 筛选条件后端不支持
 *     通用 CRUD 只识别 q / status 两个查询参数。页面上还需要「分类 / 级别 / 年份」
 *     等筛选，这里在客户端补做：命中额外条件时按 100 条/页回捞（上限 1000 条，
 *     门户内容量级很小）后再本地分页，让筛选器真正生效。
 *
 * 只新增本文件，不修改 AdminKit / lib/api / server。
 * ========================================================================== */
import { AdminApi } from '@/lib/api';

/** 后端通用 CRUD 认识的查询参数 */
const SERVER_KEYS = new Set(['page', 'pageSize', 'q', 'status']);

type Params = Record<string, string | number>;

/** 把 { data:{ items,… } } 拉平为 { data:[…], total, page, pageSize } */
function flatten(res: any): any {
  const d = res?.data;
  if (d && !Array.isArray(d) && Array.isArray(d.items)) {
    return {
      ...res,
      data: d.items,
      total: d.total ?? d.items.length,
      page: d.page ?? 1,
      pageSize: d.pageSize ?? d.items.length,
    };
  }
  return res;
}

function rowsOf(res: any): any[] {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.items)) return res.items;
  return [];
}

function totalOf(res: any, fallback: number) {
  const n = res?.total ?? res?.data?.total;
  return typeof n === 'number' ? n : fallback;
}

/** 拉取一页（含客户端补筛） */
async function list(api: { list: (p: Params) => Promise<any> }, params: Params = {}) {
  const page = Math.max(1, Number(params.page ?? 1));
  const pageSize = Math.max(1, Number(params.pageSize ?? 12));
  const serverParams: Params = {};
  if (params.q) serverParams.q = params.q;
  if (params.status) serverParams.status = params.status;

  const extra = Object.entries(params).filter(
    ([k, v]) => !SERVER_KEYS.has(k) && v !== '' && v !== null && v !== undefined && v !== 'all'
  ) as [string, string | number][];

  if (!extra.length) return flatten(await api.list({ ...serverParams, page, pageSize }));

  const CHUNK = 100;
  const CAP = 1000; // 门户内容量级：单次筛选最多回捞 1000 条
  const matched: any[] = [];
  let cursor = 1;
  let serverTotal = Number.POSITIVE_INFINITY;

  while (matched.length < page * pageSize && matched.length < CAP && (cursor - 1) * CHUNK < serverTotal) {
    const res = flatten(await api.list({ ...serverParams, page: cursor, pageSize: CHUNK }));
    const items = rowsOf(res);
    serverTotal = totalOf(res, (cursor - 1) * CHUNK + items.length);
    for (const row of items) {
      if (extra.every(([k, v]) => String(row?.[k] ?? '') === String(v))) matched.push(row);
    }
    if (items.length < CHUNK) break;
    cursor += 1;
  }

  const start = (page - 1) * pageSize;
  return {
    ok: true,
    data: matched.slice(start, start + pageSize),
    total: matched.length,
    page,
    pageSize,
  };
}

let installed = false;

/** 安装适配层（幂等，模块加载时自动执行一次） */
export function installAdminResourceAdapter() {
  if (installed) return;
  installed = true;
  const original = AdminApi.resource;
  (AdminApi as any).resource = (name: string) => {
    const api = original(name);
    return { ...api, list: (params: Params = {}) => list(api as any, params) };
  };
}

installAdminResourceAdapter();

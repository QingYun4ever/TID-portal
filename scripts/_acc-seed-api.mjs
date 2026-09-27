/* 用户中心自检用：通过后端 API 造出真实数据（幂等），供 Signups / Applications 页面渲染验证 */
const BASE = 'http://127.0.0.1:8787/api';
const CRED = { username: 'chenxi', password: 'sti123456' };

const post = async (path, body, token) => {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const get = async (path, token) => {
  const res = await fetch(BASE + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return res.json().catch(() => null);
};

const login = await post('/auth/login', CRED);
const token = login.json?.data?.token;
if (!token) throw new Error('登录失败: ' + JSON.stringify(login.json));
const me = (await get('/auth/me', token)).data.user;
console.log('user  :', me.name, me.studentId, me.phone);

/* ---------- 1. 活动报名 ---------- */
const actsRaw = await get('/activities?pageSize=8');
const acts = (actsRaw?.data?.items ?? actsRaw?.data ?? []).filter((a) => a.status === 'published');
const act = acts[0];
if (act) {
  const r = await post(
    `/activities/${act.id}/signup`,
    { name: me.name, studentId: me.studentId, phone: me.phone, college: me.college, email: me.email, major: '计算机科学与技术' },
    token
  );
  console.log('signup:', r.status, act.id, act.title, r.json?.error ?? 'ok');
  /* 再报一场，便于验证「即将开始 / 已结束」分组 */
  const act2 = acts[1];
  if (act2) {
    const r2 = await post(
      `/activities/${act2.id}/signup`,
      { name: me.name, studentId: me.studentId, phone: me.phone, college: me.college, email: me.email, major: '计算机科学与技术' },
      token
    );
    console.log('signup2:', r2.status, act2.id, act2.title, r2.json?.error ?? 'ok');
  }
} else {
  console.log('signup: 无可用活动', JSON.stringify(actsRaw).slice(0, 200));
}

/* ---------- 2. 项目申报 ---------- */
const apps = (await get('/auth/my/applications', token)).data || [];
if (apps.length === 0) {
  const r = await post(
    '/projects/apply',
    {
      title: '【自检】面向校园场景的智能能源调度原型系统',
      category: '创新训练',
      leaderName: me.name,
      leaderStudentId: me.studentId,
      leaderCollege: me.college,
      leaderPhone: me.phone,
      leaderEmail: me.email,
      advisor: '王建国 教授',
      teamSize: 3,
      members: ['刘思远', '孙佳怡', '赵子墨'],
      intro: '围绕校园用电峰谷差与光伏消纳问题，构建一套可落地的能源调度原型系统，并完成小范围实测验证。',
      materials: [
        { name: '项目申报书.pdf', url: '#', size: 512000 },
        { name: '技术方案附件.docx', url: '#', size: 128000 },
      ],
    },
    token
  );
  console.log('apply :', r.status, r.json?.error ?? 'ok', r.json?.data?.id ?? '');
  /* 追加一条已驳回记录，用于验证审核意见展示 */
  const r2 = await post(
    '/projects/apply',
    {
      title: '【自检】校园二手交易平台信任机制研究',
      category: '创业训练',
      leaderName: me.name,
      leaderStudentId: me.studentId,
      leaderCollege: me.college,
      leaderPhone: me.phone,
      leaderEmail: me.email,
      advisor: '李慧 副教授',
      teamSize: 2,
      members: ['吴桐', '郑好'],
      intro: '研究校园二手交易中的信任建立与违约约束机制，设计并验证一套轻量化的信用评价方案。',
      materials: [{ name: '申报书.pdf', url: '#', size: 300000 }],
    },
    token
  );
  console.log('apply2:', r2.status, r2.json?.error ?? 'ok', r2.json?.data?.id ?? '');
} else {
  console.log('apply : 已存在', apps.length, '条，跳过');
}

/* ---------- 3. 招新报名 ---------- */
const joins = (await get('/auth/my/join-applications', token)).data || [];
if (joins.length === 0) {
  const r = await post(
    '/join/apply',
    {
      positionId: 5,
      name: me.name,
      studentId: me.studentId,
      college: me.college,
      major: '计算机科学与技术',
      grade: '大三',
      phone: me.phone,
      email: me.email,
      skills: 'React / TypeScript / Tailwind',
      intro: '希望加入技术服务组，参与门户网站与内部工具的前端开发。',
    },
    token
  );
  console.log('join  :', r.status, r.json?.error ?? 'ok', r.json?.data?.id ?? '');
} else {
  console.log('join  : 已存在', joins.length, '条，跳过');
}

const final = (await get('/auth/me', token)).data;
console.log('stats :', JSON.stringify(final.stats));

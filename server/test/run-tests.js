const BASE = process.env.API_BASE || 'http://localhost:3000';

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function call(method, path, { body, token, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (err) {
    json = null;
  }
  return { status: res.status, json, text, headers: res.headers };
}

async function main() {
  const suffix = Date.now().toString(36);
  const user = `t_${suffix}`;
  const pass = 'Passw0rd123';
  // 每轮用独立 IP 段，避免上一轮遗留的限流记录把本轮用例误伤。
  const ipPrefix = `10.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
  const ip = (n) => `${ipPrefix}.${n}`;

  console.log('\n[1] 健康检查');
  {
    const r = await call('GET', '/api/health');
    check('GET /api/health → 200', r.status === 200, `got ${r.status}`);
    check('body.status === "ok"', r.json?.status === 'ok', JSON.stringify(r.json));
  }

  console.log('\n[2] 注册');
  {
    const bad = await call('POST', '/api/auth/register', { body: { username: user } });
    check('缺 password → 400 INVALID_PARAMS', bad.status === 400 && bad.json?.error?.code === 'INVALID_PARAMS', `${bad.status}`);

    const r = await call('POST', '/api/auth/register', { body: { username: user, password: pass } });
    check('注册 → 201', r.status === 201, `got ${r.status} ${r.text}`);
    check('返回 user_id', typeof r.json?.user_id === 'string' && r.json.user_id.length > 0);
    check('返回 username', r.json?.username === user);
    check('返回 created_at', typeof r.json?.created_at === 'string');

    const dup = await call('POST', '/api/auth/register', { body: { username: user, password: pass } });
    check('重复注册 → 409 USERNAME_EXISTS', dup.status === 409 && dup.json?.error?.code === 'USERNAME_EXISTS', `${dup.status}`);

    const longName = await call('POST', '/api/auth/register', {
      body: { username: 'x'.repeat(65), password: pass },
    });
    check('username 超 64 字符 → 400', longName.status === 400, `${longName.status}`);
  }

  console.log('\n[3] 登录');
  let token = null;
  {
    const wrong = await call('POST', '/api/auth/login', { body: { username: user, password: 'wrong' } });
    check('密码错误 → 401', wrong.status === 401, `${wrong.status}`);
    check(
      '401 不区分用户名/密码错',
      wrong.json?.error?.message === '用户名或密码错误',
      JSON.stringify(wrong.json),
    );

    const nobody = await call('POST', '/api/auth/login', {
      body: { username: `ghost_${suffix}`, password: pass },
    });
    check('用户不存在 → 401 同一提示', nobody.status === 401 &&
      nobody.json?.error?.message === '用户名或密码错误', JSON.stringify(nobody.json));

    const r = await call('POST', '/api/auth/login', { body: { username: user, password: pass } });
    check('登录 → 200', r.status === 200, `got ${r.status} ${r.text}`);
    check('返回 token', typeof r.json?.token === 'string' && r.json.token.length > 0);
    check('返回 expires_at', typeof r.json?.expires_at === 'string');
    check('返回 user.user_id', typeof r.json?.user?.user_id === 'string');
    check('返回 user.username', r.json?.user?.username === user);
    token = r.json?.token;

    const ttlDays = (new Date(r.json.expires_at).getTime() - Date.now()) / 86400000;
    check('token 约 7 天有效', ttlDays > 6.9 && ttlDays < 7.1, `${ttlDays.toFixed(3)} 天`);
  }

  console.log('\n[4] 校验 token');
  {
    const ok = await call('POST', '/api/auth/verify', { token });
    check('有效 token → 200 valid:true', ok.status === 200 && ok.json?.valid === true, `${ok.status}`);

    const none = await call('POST', '/api/auth/verify');
    check('无 token → 401', none.status === 401, `${none.status}`);

    const forged = await call('POST', '/api/auth/verify', { token: 'fake.token.value' });
    check('伪造 token → 401', forged.status === 401, `${forged.status}`);
  }

  console.log('\n[5] 读资料');
  {
    const r = await call('GET', '/api/profile', { token });
    check('读资料 → 200', r.status === 200, `${r.status} ${r.text}`);
    check('初始 data 是空对象', JSON.stringify(r.json?.data) === '{}', JSON.stringify(r.json?.data));
    check('初始 nickname 为 null', r.json?.nickname === null, String(r.json?.nickname));

    const noAuth = await call('GET', '/api/profile');
    check('无 token 读资料 → 401', noAuth.status === 401, `${noAuth.status}`);
  }

  console.log('\n[6] 写资料');
  {
    const payload = { nickname: 'Qt用户', avatar_url: 'https://example.com/a.png', data: { level: 7, tags: ['qt', 'desktop'] } };
    const w = await call('PUT', '/api/profile', { token, body: payload });
    check('写资料 → 200', w.status === 200, `${w.status} ${w.text}`);
    check('nickname 已写入', w.json?.nickname === 'Qt用户', String(w.json?.nickname));
    check('avatar_url 已写入', w.json?.avatar_url === payload.avatar_url);
    check('data.level === 7', w.json?.data?.level === 7, JSON.stringify(w.json?.data));
    check('data.tags 一致', JSON.stringify(w.json?.data?.tags) === JSON.stringify(['qt', 'desktop']));

    const badData = await call('PUT', '/api/profile', { token, body: { data: [1, 2] } });
    check('data 传数组 → 400', badData.status === 400, `${badData.status}`);
  }

  console.log('\n[7] 再读，确认落库而不是内存');
  {
    const r = await call('GET', '/api/profile', { token });
    check('昵称持久化', r.json?.nickname === 'Qt用户', String(r.json?.nickname));
    check('data 持久化', r.json?.data?.level === 7, JSON.stringify(r.json?.data));
    check('updated_at 有效', typeof r.json?.updated_at === 'string');
  }

  console.log('\n[8] data 整体覆盖而非合并');
  {
    const w = await call('PUT', '/api/profile', { token, body: { data: { only: 'new' } } });
    check('覆盖后只剩 one key', JSON.stringify(w.json?.data) === '{"only":"new"}', JSON.stringify(w.json?.data));
    check('未传 nickname 时保持原值', w.json?.nickname === 'Qt用户', String(w.json?.nickname));
  }

  console.log('\n[9] 登录限流：同一用户名连续失败 5 次锁 15 分钟');
  {
    const victim = `lock_${suffix}`;
    // 先用独立 IP 注册，避免注册配额干扰。
    const reg = await call('POST', '/api/auth/register', {
      body: { username: victim, password: pass },
      headers: { 'x-forwarded-for': ip(100) },
    });
    check('准备账号注册成功', reg.status === 201, `${reg.status}`);

    let lastStatus = 0;
    for (let i = 1; i <= 5; i += 1) {
      const r = await call('POST', '/api/auth/login', {
        body: { username: victim, password: 'wrong' },
        headers: { 'x-forwarded-for': ip(100 + i) },
      });
      lastStatus = r.status;
      if (i < 5) {
        check(`第 ${i} 次失败 → 401`, r.status === 401, `${r.status}`);
      }
    }
    check('第 5 次失败触发封禁 → 429', lastStatus === 429, `${lastStatus}`);

    const retry = await call('POST', '/api/auth/login', {
      body: { username: victim, password: pass },
      headers: { 'x-forwarded-for': ip(120) },
    });
    check('锁定期内即使密码正确也 → 429', retry.status === 429, `${retry.status}`);
    check('429 code === TOO_MANY_ATTEMPTS', retry.json?.error?.code === 'TOO_MANY_ATTEMPTS', JSON.stringify(retry.json));
    const retryAfter = Number(retry.headers.get('retry-after'));
    check('带 Retry-After 头且为正数', Number.isFinite(retryAfter) && retryAfter > 0, String(retryAfter));
    check('Retry-After ≤ 900 秒', retryAfter <= 900, String(retryAfter));
  }

  console.log('\n[10] 登录限流：同一 IP 连续失败 20 次锁 15 分钟');
  {
    const blockedIp = ip(150);
    let lastStatus = 0;
    // 每次换用户名，确保触发的是 IP 维度而不是用户名维度。
    for (let i = 1; i <= 20; i += 1) {
      const r = await call('POST', '/api/auth/login', {
        body: { username: `ipvictim_${suffix}_${i}`, password: 'wrong' },
        headers: { 'x-forwarded-for': blockedIp },
      });
      lastStatus = r.status;
    }
    check('第 20 次失败触发 IP 封禁 → 429', lastStatus === 429, `${lastStatus}`);

    const after = await call('POST', '/api/auth/login', {
      body: { username: user, password: pass },
      headers: { 'x-forwarded-for': blockedIp },
    });
    check('被封 IP 用正确密码也 → 429', after.status === 429, `${after.status}`);

    const free = await call('POST', '/api/auth/login', {
      body: { username: user, password: pass },
      headers: { 'x-forwarded-for': ip(151) },
    });
    check('其他 IP 登录不受影响 → 200', free.status === 200, `${free.status}`);
  }

  console.log('\n[11] 注册限流：同一 IP 每小时 10 次');
  {
    const regIp = ip(200);
    let lastStatus = 0;
    for (let i = 1; i <= 11; i += 1) {
      const r = await call('POST', '/api/auth/register', {
        body: { username: `reg_${suffix}_${i}`, password: pass },
        headers: { 'x-forwarded-for': regIp },
      });
      lastStatus = r.status;
      if (i <= 10) {
        check(`第 ${i} 次注册 → 201`, r.status === 201, `${r.status} ${r.text}`);
      }
    }
    check('第 11 次注册 → 429', lastStatus === 429, `${lastStatus}`);

    const other = await call('POST', '/api/auth/register', {
      body: { username: `reg_other_${suffix}`, password: pass },
      headers: { 'x-forwarded-for': ip(201) },
    });
    check('换 IP 仍可注册 → 201', other.status === 201, `${other.status}`);
  }

  console.log('\n[12] 杂项');
  {
    const nf = await call('GET', '/api/nope');
    check('未知路径 → 404', nf.status === 404, `${nf.status}`);

    const badJson = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    check('非法 JSON → 400', badJson.status === 400, `${badJson.status}`);
  }

  console.log(`\n===== ${passed} passed, ${failed} failed =====`);
  if (failed > 0) {
    console.log('\n失败项：');
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('测试运行出错：', err);
  process.exit(1);
});

const { pool } = require('./db');

// 限制规则集中在这里，README.md 的说明和测试用例都对着这张表走。
const RULES = {
  // 登录：同一用户名 15 分钟内密码错误 5 次 → 锁 15 分钟
  loginUser: { prefix: 'login:user', windowSeconds: 15 * 60, maxFailures: 5, lockSeconds: 15 * 60 },
  // 登录：同一 IP 15 分钟内失败 20 次 → 锁 15 分钟
  loginIp: { prefix: 'login:ip', windowSeconds: 15 * 60, maxFailures: 20, lockSeconds: 15 * 60 },
  // 注册：同一 IP 每小时最多 10 次（成功失败都计数），第 11 次开始拒绝
  registerIp: {
    prefix: 'register:ip',
    windowSeconds: 60 * 60,
    maxFailures: 10,
    lockSeconds: 0,
    quotaMode: true,
  },
};

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = String(forwarded).split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function keyFor(rule, identifier) {
  return `${rule.prefix}:${identifier}`;
}

function secondsUntil(date) {
  if (!date) return 0;
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 1000));
}

function minutesOf(seconds) {
  return Math.max(1, Math.ceil(seconds / 60));
}

function tooManyAttempts(res, retryAfterSeconds) {
  res.set('Retry-After', String(retryAfterSeconds));
  return res.status(429).json({
    error: {
      code: 'TOO_MANY_ATTEMPTS',
      message: `尝试过于频繁，请 ${minutesOf(retryAfterSeconds)} 分钟后再试`,
    },
  });
}

// 锁定期内直接拒绝，返回剩余秒数；未锁定返回 null 表示放行。
async function checkLocked(rule, identifier) {
  const { rows } = await pool.query(
    'SELECT locked_until FROM rate_limits WHERE key = $1',
    [keyFor(rule, identifier)],
  );
  const lockedUntil = rows[0]?.locked_until;
  if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
    return secondsUntil(lockedUntil);
  }
  return null;
}

// 记一次失败 / 一次请求。读-改-写放在同一事务里并加行锁，
// 否则并发请求会互相覆盖计数，把暴力破解漏过去。
// 注册接口是"次数上限"而不是"失败上限"：第 limit 次允许，第 limit+1 次开始拒绝。
// 所以判定用 count > maxFailures，与失败次数场景（达到上限即锁）区别开。
async function recordFailure(rule, identifier) {
  const key = keyFor(rule, identifier);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT count, window_start, locked_until FROM rate_limits WHERE key = $1 FOR UPDATE',
      [key],
    );

    const now = Date.now();
    const current = rows[0];
    let count = 1;
    let windowStart = new Date();
    let lockedUntil = null;

    if (current) {
      const stillLocked = current.locked_until && new Date(current.locked_until).getTime() > now;
      const expired = now - new Date(current.window_start).getTime() > rule.windowSeconds * 1000;

      if (stillLocked) {
        // 锁定期内不重置计数，重复请求既不延长也不清除封禁。
        windowStart = current.window_start;
        count = current.count;
        lockedUntil = current.locked_until;
      } else if (expired) {
        // 窗口已过，重新计数。
        windowStart = new Date();
        count = 1;
      } else {
        windowStart = current.window_start;
        count = current.count + 1;
      }
    }

    // 失败次数类规则（登录）达到上限就锁；注册是次数配额，用完才算超。
    const threshold = rule.quotaMode ? rule.maxFailures : rule.maxFailures - 1;

    if (!lockedUntil && count > threshold) {
      // registerIp 用 lockSeconds=0，表示锁到本窗口结束。
      const lockMs = (rule.lockSeconds || rule.windowSeconds) * 1000;
      lockedUntil = new Date(now + lockMs);
    }

    await client.query(
      `INSERT INTO rate_limits (key, count, window_start, locked_until)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO UPDATE
         SET count = EXCLUDED.count,
             window_start = EXCLUDED.window_start,
             locked_until = EXCLUDED.locked_until`,
      [key, count, windowStart, lockedUntil],
    );
    await client.query('COMMIT');

    return lockedUntil ? { lockedUntil, seconds: secondsUntil(lockedUntil) } : null;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function clear(rule, identifier) {
  await pool.query('DELETE FROM rate_limits WHERE key = $1', [keyFor(rule, identifier)]);
}

// 顺手清理：窗口超 1 小时且不在锁定期内的记录直接删掉，避免表无限增长。
async function cleanup() {
  await pool.query(
    `DELETE FROM rate_limits
      WHERE (locked_until IS NULL OR locked_until < now())
        AND window_start < now() - interval '1 hour'`,
  );
}

module.exports = {
  RULES,
  clientIp,
  keyFor,
  secondsUntil,
  tooManyAttempts,
  checkLocked,
  recordFailure,
  clear,
  cleanup,
};

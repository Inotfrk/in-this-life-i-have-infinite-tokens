const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('./db');
const {
  RULES,
  clientIp,
  tooManyAttempts,
  checkLocked,
  recordFailure,
  clear,
  cleanup,
} = require('./rateLimit');

const router = express.Router();

const BCRYPT_ROUNDS = 10;
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 天
const MAX_USERNAME_LENGTH = 64;

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

function fail(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

// 密码错误与用户名不存在返回同一个信息，避免被用来枚举账号。
function unauthorized(res) {
  return fail(res, 401, 'INVALID_CREDENTIALS', '用户名或密码错误');
}

function issueToken(user) {
  const token = jwt.sign({ sub: user.user_id, username: user.username }, jwtSecret(), {
    expiresIn: TOKEN_TTL_SECONDS,
  });
  return {
    token,
    expires_at: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString(),
  };
}

function parseBearer(req) {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

// 供需要鉴权的路由使用。
function requireAuth(req, res, next) {
  const token = parseBearer(req);
  if (!token) return fail(res, 401, 'UNAUTHORIZED', '缺少或无效的 token');
  try {
    const payload = jwt.verify(token, jwtSecret());
    req.user = { userId: payload.sub, username: payload.username };
    return next();
  } catch (err) {
    return fail(res, 401, 'UNAUTHORIZED', '缺少或无效的 token');
  }
}

router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    return fail(res, 500, 'DB_UNAVAILABLE', '数据库不可用');
  }
});

router.post('/auth/register', async (req, res, next) => {
  try {
    const ip = clientIp(req);
    const lockedFor = await checkLocked(RULES.registerIp, ip);
    if (lockedFor !== null) return tooManyAttempts(res, lockedFor);

    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      // 参数错误不计入注册配额：否则恶意空请求就能把本人锁死。
      return fail(res, 400, 'INVALID_PARAMS', 'username 和 password 必填');
    }
    if (username.length > MAX_USERNAME_LENGTH) {
      return fail(res, 400, 'INVALID_PARAMS', `username 最长 ${MAX_USERNAME_LENGTH} 个字符`);
    }

    const locked = await recordFailure(RULES.registerIp, ip);
    if (locked) return tooManyAttempts(res, locked.seconds);

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(
        `INSERT INTO users (username, password_hash)
         VALUES ($1, $2)
         ON CONFLICT (username) DO NOTHING
         RETURNING user_id, username, created_at`,
        [username, hash],
      );
      if (inserted.rowCount === 0) {
        await client.query('ROLLBACK');
        return fail(res, 409, 'USERNAME_EXISTS', '用户名已被占用');
      }
      const user = inserted.rows[0];
      await client.query('INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [
        user.user_id,
      ]);
      await client.query('COMMIT');
      return res.status(201).json({
        user_id: user.user_id,
        username: user.username,
        created_at: user.created_at,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return next(err);
  }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return fail(res, 400, 'INVALID_PARAMS', 'username 和 password 必填');
    }

    const ip = clientIp(req);
    const userLock = await checkLocked(RULES.loginUser, username);
    if (userLock !== null) return tooManyAttempts(res, userLock);
    const ipLock = await checkLocked(RULES.loginIp, ip);
    if (ipLock !== null) return tooManyAttempts(res, ipLock);

    const { rows } = await pool.query(
      'SELECT user_id, username, password_hash FROM users WHERE username = $1',
      [username],
    );
    const user = rows[0];
    const ok = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!ok) {
      // 用户名不存在也照样记失败，避免通过"是否被锁"反推账号是否存在。
      const userHit = await recordFailure(RULES.loginUser, username);
      const ipHit = await recordFailure(RULES.loginIp, ip);
      const hit = userHit || ipHit;
      if (hit) return tooManyAttempts(res, hit.seconds);
      return unauthorized(res);
    }

    await clear(RULES.loginUser, username);
    await clear(RULES.loginIp, ip);

    const { token, expires_at } = issueToken(user);
    return res.status(200).json({
      token,
      expires_at,
      user: { user_id: user.user_id, username: user.username },
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/auth/verify', requireAuth, (req, res) => {
  return res.status(200).json({
    valid: true,
    user: { user_id: req.user.userId, username: req.user.username },
  });
});

router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT user_id, nickname, avatar_url, data, updated_at
         FROM profiles WHERE user_id = $1`,
      [req.user.userId],
    );
    if (rows.length === 0) return fail(res, 404, 'PROFILE_NOT_FOUND', '资料不存在');
    const row = rows[0];
    return res.status(200).json({
      user_id: row.user_id,
      nickname: row.nickname,
      avatar_url: row.avatar_url,
      data: row.data,
      updated_at: row.updated_at,
    });
  } catch (err) {
    return next(err);
  }
});

router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const { nickname, avatar_url, data } = req.body || {};
    if (data !== undefined && (data === null || typeof data !== 'object' || Array.isArray(data))) {
      return fail(res, 400, 'INVALID_PARAMS', 'data 必须是 JSON 对象');
    }
    if (nickname !== undefined && nickname !== null && typeof nickname !== 'string') {
      return fail(res, 400, 'INVALID_PARAMS', 'nickname 必须是字符串');
    }
    if (avatar_url !== undefined && avatar_url !== null && typeof avatar_url !== 'string') {
      return fail(res, 400, 'INVALID_PARAMS', 'avatar_url 必须是字符串');
    }

    // data 是整体覆盖而不是合并，契约见 API 文档。
    const { rows } = await pool.query(
      `UPDATE profiles
          SET nickname = COALESCE($2, nickname),
              avatar_url = COALESCE($3, avatar_url),
              data = COALESCE($4::jsonb, data),
              updated_at = now()
        WHERE user_id = $1
        RETURNING user_id, nickname, avatar_url, data, updated_at`,
      [
        req.user.userId,
        nickname === undefined ? null : nickname,
        avatar_url === undefined ? null : avatar_url,
        data === undefined ? null : JSON.stringify(data),
      ],
    );
    if (rows.length === 0) return fail(res, 404, 'PROFILE_NOT_FOUND', '资料不存在');
    const row = rows[0];
    return res.status(200).json({
      user_id: row.user_id,
      nickname: row.nickname,
      avatar_url: row.avatar_url,
      data: row.data,
      updated_at: row.updated_at,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = { router, requireAuth, clear, cleanup };

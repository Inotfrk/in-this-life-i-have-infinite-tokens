const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // 托管型 PostgreSQL 通常要求 TLS；本地 Docker 测试时不设 PGSSLMODE 就不启用。
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.PG_POOL_MAX || 10),
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(64) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id    UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  nickname   VARCHAR(128),
  avatar_url TEXT,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  count        INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ
);
`;

// gen_random_uuid() 从 PostgreSQL 13 起内置；更老的版本需要 pgcrypto。
// 建扩展失败不影响已内置该函数的实例，所以这里只尝试、不报错。
async function ensureExtension(client) {
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  } catch (err) {
    // 权限不足或函数已内置，都可以继续。
  }
}

async function initSchema() {
  const client = await pool.connect();
  try {
    await ensureExtension(client);
    await client.query(SCHEMA);
  } finally {
    client.release();
  }
}

// 容器编排下数据库可能比应用晚就绪，启动时先等它连上。
async function waitForDatabase(retries = 30, delayMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = { pool, initSchema, waitForDatabase };

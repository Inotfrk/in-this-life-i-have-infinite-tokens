const express = require('express');
const { initSchema, waitForDatabase, pool } = require('./db');
const { router, clear, cleanup } = require('./routes');

const app = express();
const PORT = Number(process.env.PORT || 3000);

// 生产环境部署在反向代理后面，需要它才能拿到真实客户端 IP。
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));

// 静态资源不需要，根路径给一句话方便人工确认服务活着。
app.get('/', (req, res) => {
  res.type('text/plain').send('user-center-backend is running\n');
});

app.use('/api', router);

app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: '接口不存在' } });
});

// 统一兜底，避免把堆栈泄露给客户端。
app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_PARAMS', message: '请求体不是合法 JSON' } });
  }
  console.error('[error]', err);
  if (res.headersSent) return next(err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务端错误' } });
});

async function start() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }
  await waitForDatabase();
  await initSchema();

  // 每小时清理一次过期限流记录，避免表无限增长。
  const timer = setInterval(() => {
    cleanup().catch((err) => console.error('[cleanup]', err.message));
  }, 60 * 60 * 1000);
  timer.unref();

  const server = app.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, closing`);
    server.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
  start().catch((err) => {
    console.error('[fatal]', err);
    process.exit(1);
  });
}

module.exports = { app, start, clear };

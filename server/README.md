# 用户中心后端

Qt 学习助手的账号与资料服务。**Node.js 20 + Express + PostgreSQL**，
零构建步骤，`node src/index.js` 直接跑。

接口契约与扣子那边已实现的版本一致（见文末「与扣子的关系」）。

---

## 一、快速开始

### Docker（推荐，本机已验证）

```bash
cd server
docker compose up -d --build     # 起 PostgreSQL + 后端
docker compose run --rm tester   # 跑 63 项测试
docker compose down -v           # 清理
```

后端监听 `http://127.0.0.1:3000`，数据库在 `127.0.0.1:55432`。

> 本机 Docker 直连 Docker Hub 会 401 / TLS 超时，镜像统一走
> `docker.m.daocloud.io`；npm 走 `registry.npmmirror.com`。换网络环境后可改回官方源。

### 本地直跑

```bash
npm install
export DATABASE_URL=postgres://app:app_pw@localhost:5432/usercenter
export JWT_SECRET=$(openssl rand -hex 32)
node src/index.js
```

### 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | PostgreSQL 连接串 |
| `JWT_SECRET` | 是 | 签发 token 的密钥，**不设会启动失败** |
| `PORT` | 否 | 默认 `3000` |
| `PGSSLMODE` | 否 | 设 `require` 时启用 TLS（托管数据库通常需要） |
| `PG_POOL_MAX` | 否 | 连接池上限，默认 `10` |

---

## 二、接口

统一前缀 `/api`，请求与响应均为 `application/json`（UTF-8）。

鉴权：`Authorization: Bearer <token>`。

统一错误格式：

```json
{ "error": { "code": "错误码", "message": "给用户看的中文说明" } }
```

| 状态码 | 含义 |
| --- | --- |
| 200 / 201 | 成功 |
| 400 | 参数错误 `INVALID_PARAMS` |
| 401 | 未授权 `INVALID_CREDENTIALS` / `UNAUTHORIZED` |
| 404 | 资源不存在 `PROFILE_NOT_FOUND` / `NOT_FOUND` |
| 409 | 用户名已存在 `USERNAME_EXISTS` |
| 429 | 请求过于频繁 `TOO_MANY_ATTEMPTS` |
| 500 | 服务端错误 `INTERNAL_ERROR` / `DB_UNAVAILABLE` |

### 接口清单

| 方法 | 路径 | 需要 token | 说明 |
| --- | --- | --- | --- |
| GET | `/api/health` | 否 | 健康检查，含一次数据库查询 |
| POST | `/api/auth/register` | 否 | 注册 |
| POST | `/api/auth/login` | 否 | 登录，返回 token |
| POST | `/api/auth/verify` | 是 | 校验 token |
| GET | `/api/profile` | 是 | 读资料 |
| PUT | `/api/profile` | 是 | 写资料 |

### 1. 注册

```http
POST /api/auth/register
Content-Type: application/json

{ "username": "alice", "password": "Passw0rd123" }
```

- `username` 最长 64 字符，全局唯一
- `password` 由服务端 bcrypt（rounds=10）哈希，**数据库不存明文**
- 成功会自动建一条空 `profile`

响应 `201`：

```json
{
  "user_id": "5ec631b1-79bb-4294-9f05-08f5ee8f3a50",
  "username": "alice",
  "created_at": "2026-11-01T10:24:53.468Z"
}
```

### 2. 登录

响应 `200`：

```json
{
  "token": "eyJhbGciOi...",
  "expires_at": "2026-11-08T10:24:53.000Z",
  "user": { "user_id": "5ec631b1-...", "username": "alice" }
}
```

token 有效期 **7 天**。密码错误与用户名不存在返回**同一个** `401 用户名或密码错误`，
避免被用来枚举账号。

### 3. 校验 token

```http
POST /api/auth/verify
Authorization: Bearer <token>
```

```json
{ "valid": true, "user": { "user_id": "5ec631b1-...", "username": "alice" } }
```

### 4. 读资料

```json
{
  "user_id": "5ec631b1-...",
  "nickname": null,
  "avatar_url": null,
  "data": {},
  "updated_at": "2026-11-01T10:24:53.468Z"
}
```

### 5. 写资料

```http
PUT /api/profile
Authorization: Bearer <token>
Content-Type: application/json

{ "nickname": "Qt用户", "avatar_url": "https://example.com/a.png",
  "data": { "level": 7, "tags": ["qt", "desktop"] } }
```

返回更新后的完整资料（同读取接口）。

> ⚠️ `data` 是**整体覆盖，不是合并**。只想改某个 key 时，先 GET 拿完整对象、改完再 PUT 回去。
> 未传的字段（`nickname` / `avatar_url` / `data`）保持原值。

---

## 三、限流与防暴力破解

计数**持久化在数据库**（`rate_limits` 表），服务重启不丢。

| 规则 | 窗口 | 上限 | 锁定时长 |
| --- | --- | --- | --- |
| 同一用户名登录失败 | 15 分钟 | 5 次 | 15 分钟 |
| 同一 IP 登录失败 | 15 分钟 | 20 次 | 15 分钟 |
| 同一 IP 注册 | 1 小时 | 10 次 | 到窗口结束 |

- 第 5 次登录失败（用户名维度）/ 第 20 次（IP 维度）**当场返回 429**
- 注册是**次数配额**：第 1~10 次正常，**第 11 次开始 429**
- 登录成功后清除该用户名与该 IP 的失败计数
- 客户端 IP 优先取 `X-Forwarded-For` 第一个地址，否则 `req.ip`
- 锁定期内重复请求**不延长**封禁时间，也刷不掉记录
- 参数错误（缺字段）**不计入**注册配额，避免恶意空请求把本人锁死

429 响应：

```json
{ "error": { "code": "TOO_MANY_ATTEMPTS", "message": "尝试过于频繁，请 15 分钟后再试" } }
```

并带 `Retry-After: <秒>` 响应头。

每小时自动清理「窗口超 1 小时且不在锁定期内」的旧记录。

---

## 四、数据库

```sql
users        (user_id UUID PK, username VARCHAR(64) UNIQUE, password_hash, created_at)
profiles     (user_id UUID PK → users, nickname, avatar_url, data JSONB, updated_at)
rate_limits  (key TEXT PK, count INT, window_start, locked_until)
```

建表在服务启动时自动执行（`CREATE TABLE IF NOT EXISTS`），无需手工迁移。

---

## 五、测试

63 个用例，覆盖正常流程、参数校验、鉴权失败、持久化、`data` 覆盖语义、三类限流。

```bash
docker compose run --rm tester
```

当前结果：**63 passed, 0 failed**。

> 测试每轮用随机 IP 段，避免上一轮的限流记录误伤下次运行。
> 若要重跑，`docker compose down -v` 清库最干净。

---

## 六、与扣子的关系

扣子「编程项目」里已经有一份功能等价的实现（Express + Supabase PostgreSQL），
沙箱自测通过但**尚未部署生产**。

本目录是它的**本地可复现版本**，目的有两个：

1. **省积分**——代码在本地写完测好，不再让扣子的 AI 反复生成与调试
2. **可迁移**——接口一字不差，将来部署到任何支持 Node + PostgreSQL 的地方（扣子、阿里云、
   自建 VPS）都只需换 `DATABASE_URL` / `JWT_SECRET`
3. **补上限流**——扣子那份还没有防暴力破解，这里是完整版

两边的契约差异只有一处：本实现多了 `429 TOO_MANY_ATTEMPTS` 与 `Retry-After`。

### 部署到扣子时要注意

- 环境变量沿用扣子已配好的 `DATABASE_URL` / `JWT_SECRET`
- 扣子的 Supabase 通常要求 TLS：设 `PGSSLMODE=require`
- 监听端口用扣子分配的（读 `PORT`），不要写死 3000
- 部署前把 `test/` 排除，或用 `npm start` 只跑 `src/`

---

## 七、尚未做（等产品定了再说）

- 邮箱验证 / 找回密码（首期按最简版：用户名 + 密码）
- token 刷新与吊销列表（现在靠 7 天过期）
- 资料按文档 key 增量同步（见 [../docs/server-plan.md](../docs/server-plan.md)）
- 资料文件本体上传（首期只同步索引）

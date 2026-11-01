# 服务端方案（账号 · 同步 · 配置下发）

> 状态：**方案阶段（未实现）**。本文只把 [design-study-app-ui.md](design-study-app-ui.md) 7.2 里
> 与服务端相关的未决问题（第 26~30 条）收成可执行的决策与接口契约，**不写任何实现代码**。
>
> 首期目标平台：**Cloudflare Workers + D1**。契约本身与平台无关，将来迁阿里云函数计算 / 腾讯云
> 云函数时客户端不用改（只需换 `baseUrl`）。
>
> 规则优先级最高：`AGENTS.md`、分支三层流、`.github/workflows/release.yml`、`scripts/release.*`
> 等仓库治理文件**一律不动**，本文只谈软件本体的服务端部分。

---

## 1. 范围

### 1.1 本期要解决

| # | 需求 | 本文对应 |
| --- | --- | --- |
| 1 | 账号登录 / 切换账号 | 第 3 节、第 4 节 `auth` |
| 2 | 资料跟着账号走（跨机器同步） | 第 5 节 |
| 3 | 版本下发 / 远程开关 | 第 4 节 `config` |
| 4 | 最小可用埋点（可选） | 第 6.4 节 |

### 1.2 本期明确不做

| 不做 | 原因 |
| --- | --- |
| **资料文件本体上云** | 容量与隐私成本都不低，见 5.2。首期只同步结构化小数据 |
| **排行榜** | 学习助手没有排行榜场景；早先讨论里的「排行榜」是为游戏类需求写的，与本产品无关 |
| **AI 请求转发** | 与现有设计冲突，需要作者拍板，见第 7 节 |
| **密码 / 手机号注册** | 首期用匿名设备账号，注册流程等真有跨设备需求时再做 |
| **多人协作 / 分享** | 无需求 |

---

## 2. 平台选择

### 2.1 首期：Cloudflare Workers + D1

| 项 | 内容 |
| --- | --- |
| 计算 | Workers，免费档每日 10 万请求、单次 CPU 10ms |
| 数据库 | D1（SQLite），免费档 5GB 存储、每日 500 万行读 / 10 万行写 |
| 对象存储 | R2（将来真要传文件时用），免费档 10GB + 免出网流量费 |
| 门槛 | **不需要实名、不需要信用卡**，注册即可用 |
| 地址 | 默认 `https://<name>.workers.dev`；绑自有域名**不需要备案**（服务器在境外），但国内访问延迟约 100~200ms |

> 上一轮讨论里把「绑域名要备案」当成通用限制，那只对**境内节点**成立。Cloudflare 不在此列。

### 2.2 备选：阿里云函数计算 FC / 腾讯云云函数 SCF

国内节点延迟低、按调用计费且每月有免费额度，但需要**实名认证 + 绑定支付方式**；
绑自有域名做对外服务需要 **ICP 备案**（1~3 周）。
迁移成本：本契约是纯 HTTP/JSON，换平台只改客户端 `baseUrl` 与部署脚本。

### 2.3 为什么不用现成 BaaS

Supabase / Firebase 能省事，但都是「境外注册 + 后续想自托就难搬」，
而本产品的同步模型（按文档版本号合并）比通用 BaaS 的权限模型简单，自己写一层反而更省。

---

## 3. 账号模型

### 3.1 匿名设备账号起步

设计文档的产品立场是「**本地优先，不依赖账号体系**」（[design-study-app-ui.md](design-study-app-ui.md) 第 1 节）。
所以首期**不设注册表单**：

```
客户端首次需要同步
  └─ POST /v1/auth/anon  { deviceName }
       └─ 服务端建一个匿名账号，返回 { userId, token }
            └─ token 存本地（QSettings），之后所有请求带上
```

用户在意「这是哪台机器」时，才在需要时补邮箱/手机号升级成正式账号（本期不实现，接口先留位）。

### 3.2 Token

- 服务端生成 **32 字节随机串**（base64url），**不签发 JWT**：无状态 JWT 省一次查询，
  但要维护签名密钥轮换与吊销黑名单，对单机小服务不划算。
- 库里只存 `sha256(token)`，泄露库不等于泄露 token。
- 有效期 90 天，每次成功请求滑动续期（`expires_at` 顺延）。
- 客户端登出 = 本地删 token；服务端另提供 `POST /v1/auth/revoke` 立即作废。

### 3.3 多账号

「切换账号」在客户端侧就是**本地保存多组 `userId + token`，切换时换用另一组**，
服务端不需要任何额外概念。对应 UI 里已实现的 `AccountMenu.qml`（切换账号 / 退出登录）。
登录后图标变头像这一条已由 `Avatar.qml`（照片 + 首字母兜底）实现，本文不改。

---

## 4. 接口契约

统一前缀 `/v1`，全部 `Content-Type: application/json; charset=utf-8`，UTF-8 无 BOM。
错误统一返回 `{ "error": { "code": "...", "message": "中文说明" } }`，`code` 供程序判断、`message` 可直接展示。

### 4.1 `GET /v1/health`

无鉴权。返回 `{ "ok": true, "version": "..." }`，用于客户端「测试服务器地址」按钮。

### 4.2 `POST /v1/auth/anon`

```json
// 请求
{ "deviceName": "Fairy-PC" }
// 200
{ "userId": "u_7f3a...", "token": "…32字节…", "expiresAt": "2027-01-30T00:00:00Z" }
```

### 4.3 `POST /v1/auth/revoke`

需要 `Authorization: Bearer <token>`，返回 `204`。

### 4.4 `GET /v1/me`

需要鉴权。返回 `{ "userId": "...", "displayName": "Learner", "createdAt": "..." }`。
客户端启动时用它校验 token 是否还有效。

### 4.5 同步：`GET /v1/sync/changes?since=<cursor>`

需要鉴权。`since` 省略表示全量。返回该账号下**自 cursor 以来变化过的文档清单**（不含正文）：

```json
{
  "cursor": 1287,
  "more": false,
  "docs": [
    { "key": "settings",   "rev": 4,  "updatedAt": "2026-11-01T09:12:00Z", "hash": "sha256:…" },
    { "key": "subjects",   "rev": 11, "updatedAt": "2026-11-01T09:30:00Z", "hash": "sha256:…" }
  ]
}
```

客户端拿 `hash` 比对本地值，只对不一致的文档发 `GET /v1/doc/{key}`。
`more: true` 时用返回的 `cursor` 继续拉。

### 4.6 单文档读写

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/v1/doc/{key}` | 返回 `{ key, rev, updatedAt, payload }` |
| `PUT` | `/v1/doc/{key}` | 请求体 `{ "baseRev": 4, "payload": {...} }` |
| `DELETE` | `/v1/doc/{key}` | 软删除，带 `baseRev` |

`PUT` 的成功 / 冲突：

```json
// 200：写入成功，rev 自增
{ "key": "settings", "rev": 5, "updatedAt": "…" }

// 409：baseRev 与服务端当前 rev 不一致，payload 里带服务端当前版本，交给用户选
{ "error": { "code": "conflict", "message": "云端版本比本地新" },
  "server": { "rev": 7, "updatedAt": "…", "payload": { ... } } }
```

> **这是整个同步的地基**：不做「后到覆盖」，一律按 `baseRev` 乐观锁。冲突时客户端弹
> 「保留本地 / 用云端 / 都保留」三选一，绝不静默覆盖。这与早期讨论里担心的「存档被覆盖」是同一件事。

### 4.7 `GET /v1/config/app`

无鉴权（客户端启动即可拉）。返回远程开关与版本门槛：

```json
{
  "latestVersion": "0.2.0",
  "minVersion": "0.1.0",
  "forceUpdate": false,
  "updateUrl": "https://github.com/Inotfrk/in-this-life-i-have-infinite-tokens/releases",
  "flags": { "enableSync": true, "enableAi": true },
  "notice": ""
}
```

`minVersion` 低于它就强制更新；`flags` 是远程关功能用的救命开关（某功能出事时不用发新版）。
客户端必须**本地缓存 + 拉取失败就沿用上次值**，不能因为服务端挂了就打不开软件。

### 4.8 `POST /v1/log`（可选，默认关）

批量埋点：`{ "events": [ { "t": "…", "name": "app_start", "props": {} } ] }`，单次最多 100 条。
服务端只落盘不做同步处理。**客户端必须异步发送、失败静默**，不许阻塞 UI。

---

## 5. 同步模型

### 5.1 文档式同步（不是整块 blob）

参考 CouchDB 的「一文档一版本号」，而不是「整个用户目录一个 tar 包」：

| `key` | 内容 | 大小量级 |
| --- | --- | --- |
| `settings` | 主题、AI 服务商选择、窗口状态 | < 4 KB |
| `subjects` | 学科列表与顺序 | < 4 KB |
| `wordbook/<id>` | 单个词表 / 生词本 | 10~500 KB |
| `study/<date>` | 单日学习记录 | < 20 KB |

好处：只改主题就只传 4 KB，不会因为改个配色把几百 KB 词表重传一遍；
两人两台机器同时改不同文档也不会互相冲突。

### 5.2 资料文件为什么首期不同步

「把任意学习资料丢进来」意味着可能有几百 MB 的 PDF / 课件。首期不同步的理由：

1. **隐私**：用户的课件可能含个人信息，上云需要用户明确同意，而不是默认。
2. **成本**：R2 免费额度 10GB 看着够，但一旦要下载回来就是流量与时间成本。
3. **可行性**：同步的是**资料索引**（文件名、学科归属、最近打开位置），
   换机器后提示「请重新选择该资料所在文件夹」，比默默传 500MB 体验更好。

将来要做时，接口已在 `/v1/doc/{key}` 之外单开 `/v1/blob/{hash}`（内容寻址 + 去重），不破坏现有契约。

### 5.3 未登录也能用（对应 7.2 第 30 条）

```
未登录 ── 全部数据写本地 SQLite / JSON，标记 owner = "local"
   │
   └─ 登录后首次同步：
        ├─ 云账号是空的  → 本地数据整体上推
        ├─ 云端已有数据  → 按文档逐个比对 updatedAt：本地较新则推 / 云端较新则拉 / 两侧都改过则按 4.6 的 409 让用户选
        └─ 之后           → 正常增量同步
```

**绝不静默丢弃任何一侧**；合并过程要有进度提示与可回退（同步前先本地打包一份备份）。

---

## 6. 客户端接入（Qt 侧）

### 6.1 用 `QNetworkAccessManager`，不加第三方库

Qt 6 自带 `QNetworkAccessManager`，与 README「零第三方依赖」的定位不冲突。
**不要引入 cpr / libcurl 等额外依赖**。

```cpp
// src/ui/backend_client.h（示意图，未实现）
class BackendClient : public QObject
{
    Q_OBJECT
public:
    explicit BackendClient(QObject *parent = nullptr);

    void setBaseUrl(const QUrl &url);   // 默认 https://<name>.workers.dev
    void setToken(const QString &token);

    void health();
    void createAnonymousAccount(const QString &deviceName);
    void pullChanges(qint64 since);
    void putDoc(const QString &key, int baseRev, const QJsonObject &payload);

signals:
    void healthChecked(bool ok, const QString &detail);
    void accountCreated(const QString &userId, const QString &token);
    void conflictDetected(const QString &key, const QJsonObject &serverDoc);
    void errorOccurred(const QString &code, const QString &message);

private:
    QNetworkAccessManager m_nam;
    QUrl m_baseUrl;
    QString m_token;
};
```

关键实现约束：

- 所有请求**异步**（`finished` 信号），QML 侧用状态机驱动，不阻塞 UI 线程。
- 超时用 `QNetworkRequest::setTransferTimeout(10000)`，失败走重试（指数退避，最多 3 次）。
- `baseUrl` 写进 `QSettings`，方便用户在设置里改成自建地址（对应 7.2 第 28 条保留的口子）。
- token 存 `QSettings`，不写进任何会被提交的文件。

### 6.2 QML 侧只需要一个同步状态

`Main.qml` 头部或设置页展示：`已同步 / 同步中 / 离线 / 有冲突待处理`。
具体怎么显示属于界面工作，本文不定。

---

## 7. 待作者拍板：AI Key 走哪条路

现有设计（[design-study-app-ui.md](design-study-app-ui.md) 第 1 节）写的是
**「用户自己填写 API Key」**，而早先讨论时又勾了「AI 接口转发 / 密钥托管」。两者互斥，必须先定：

| 方案 | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |
| **A 用户自填 Key**（与现有设计一致） | Key 存本地 `QSettings`，客户端直连厂商 API | 服务端零成本、零责任；不需要托管密钥 | 每个用户要自己去申请 Key；客户端里有明文 Key，被反编译就会泄露**用户自己的** Key |
| **B 官方代转** | 客户端只带自己的 `token`，服务端持厂商 Key 转发并计配额 | 用户开箱即用；Key 不出服务端 | 要花钱、要做配额与预算上限、被刷会烧钱；涉及「服务端替用户付费」的商业模式问题 |

**建议**：首期按 **A** 做（与现有设计一致，零成本先跑通），但**契约上先把 `/v1/ai/*` 的位置留出来**，
等真决定做 B 时客户端只换一个开关，不用重构。

⚠️ 无论选哪条，**厂商 Key 都不得写进仓库或客户端资源文件**。选 B 时用
`wrangler secret put AI_KEY` 注入环境变量。

---

## 8. 部署与成本

### 8.1 本地开发

```
worker/
  wrangler.toml        绑定 D1 与 KV
  src/index.ts         路由分发
  schema.sql           建表语句
  package.json
```

```bash
npm install
npx wrangler d1 create infinite-tokens   # 首次
npx wrangler d1 execute infinite-tokens --file=schema.sql
npx wrangler dev                          # 本地跑，http://127.0.0.1:8787
npx wrangler deploy
```

### 8.2 数据库

```sql
CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE tokens (
  token_hash  TEXT PRIMARY KEY,   -- sha256(token)
  user_id     TEXT NOT NULL REFERENCES users(id),
  expires_at  TEXT NOT NULL
);

CREATE TABLE docs (
  user_id     TEXT NOT NULL REFERENCES users(id),
  doc_key     TEXT NOT NULL,
  rev         INTEGER NOT NULL,
  updated_at  TEXT NOT NULL,
  payload     TEXT NOT NULL,      -- JSON
  deleted     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, doc_key)
);

CREATE INDEX docs_updated ON docs (user_id, updated_at);
```

### 8.3 免费额度够不够

按「一个用户每天开 2 次、每次同步 10 个请求」估算：免费档每日 10 万请求约等于
**5000 个日活用户**。D1 的 5GB 对纯结构化数据（KB 级文档）远远够用。
真正会先撞墙的是 **D1 每日 10 万行写入**，所以 `POST /v1/log` 默认关，别拿它写库。

### 8.4 国内访问的现实

`*.workers.dev` 在国内**可达但不稳定**，偶发握手超时。所以：

1. 客户端所有请求必须有超时 + 重试 + 「离线可用」降级；
2. 国内用户量起来后，把同一个契约部署到阿里云函数计算，客户端在设置里切 `baseUrl` 即可。

---

## 9. 与 TODO 的对应

| TODO | 变化 |
| --- | --- |
| T-024 账号登录与资料同步 | 解除「同步通道未定」这个阻塞点的一半；**仍 blocked**，剩「服务端要不要真做、什么时候做」 |
| 新增 T-027 服务端方案文档 | 本文，`done` |

**本文不代表马上要实现服务端。** 按设计文档「问题定下来之前不要动手写界面代码」的惯例，
这里只是把问题定成了一份可执行的契约；真开工前仍需作者确认第 7 节。

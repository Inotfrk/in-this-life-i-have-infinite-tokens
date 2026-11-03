# 服务端方案（账号 · 同步 · 配置下发）

> 状态：**方案 + 本地实现阶段**。本文把 [design-study-app-ui.md](design-study-app-ui.md) 7.2 里
> 与服务端相关的未决问题（第 26~30 条）收成可执行的决策与接口契约。
>
> 平台已从最初的 Cloudflare Workers 改为 **扣子编程项目**（见第 2 节）；
> 可运行的后端代码在 [server/](../server/README.md)，本地 Docker 已跑通 **63 项测试**。
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

### 2.1 现状：扣子编程项目

| 项 | 内容 |
| --- | --- |
| 计算 | 扣子「编程项目」部署后的常驻服务，Node.js + Express |
| 数据库 | 扣子空间的 PostgreSQL（底层 Supabase） |
| 公网地址 | 部署后返回固定域名（`deploy` 的 `domain` 字段） |
| 数据可迁移 | 支持 schema / 全量导出，有 PITR 时间点回滚 |
| 门槛 | 需要扣子账号实名；搭建与部署消耗积分 |

> 官方文档没有 SLA 承诺，只能说「部署后常驻、不因会话结束而停」。先跑通、实测几天再压关键业务。

### 2.2 备选：Cloudflare Workers + D1

免实名免卡、免费额度大，但本机 Docker 直连 Docker Hub 会 401 / TLS 超时，
国内网络下部署体验一般。契约相同，换平台只改客户端 `baseUrl`。

### 2.3 备选：阿里云函数计算 FC / 腾讯云云函数 SCF

国内节点延迟低、按调用计费且每月有免费额度，但需要**实名认证 + 绑定支付方式**；
绑自有域名做对外服务需要 **ICP 备案**（1~3 周）。

### 2.4 契约与平台无关

本文定义的是纯 HTTP/JSON 契约，两个实现都对着它写：

- 扣子编程项目里已有一份（Express + Supabase），沙箱自测通过，**尚未部署**
- [server/](../server/README.md) 是本地可复现版本，Docker 内 **63 项测试全绿**，比扣子版多了限流

---

## 3. 账号模型

### 3.1 用户名 + 密码（首期最简版）

```
客户端注册 / 登录
  └─ POST /api/auth/register  { username, password }
  └─ POST /api/auth/login     { username, password }
       └─ 返回 token（JWT，7 天）
            └─ token 存本地（QSettings），之后请求带 Authorization: Bearer <token>
```

- 密码由服务端 **bcrypt（rounds=10）** 哈希，数据库不存明文
- `username` 最长 64 字符，全局唯一
- 注册成功自动建一条空 `profile`

> 早先设想的「匿名设备账号」没有采用：既然已经有注册表单，
> 匿名账号反而多一层合并逻辑，首期不引入。

### 3.2 Token

- **签发 JWT**（HS256），有效期 **7 天**，密钥来自 `JWT_SECRET`
- 服务端不存 token、不维护吊销列表：登出 = 客户端删掉本地 token
- token 泄露的止损手段是轮换 `JWT_SECRET`（会让所有人重新登录）
- 校验走 `POST /api/auth/verify`，客户端启动时用它确认 token 还有效

### 3.3 多账号

「切换账号」在客户端侧就是**本地保存多组 `user_id + token`，切换时换用另一组**，
服务端不需要任何额外概念。对应 UI 里已实现的 `AccountMenu.qml`（切换账号 / 退出登录）。
登录后图标变头像这一条已由 `Avatar.qml`（照片 + 首字母兜底）实现，本文不改。

---

## 4. 接口契约

统一前缀 `/api`，全部 `Content-Type: application/json`，UTF-8。
错误统一返回 `{ "error": { "code": "...", "message": "中文说明" } }`，
`code` 供程序判断、`message` 可直接展示。

**完整参数、响应示例、错误码见 [server/README.md](../server/README.md)**，这里只列清单。

| 方法 | 路径 | 需要 token | 说明 |
| --- | --- | --- | --- |
| GET | `/api/health` | 否 | 健康检查（含一次数据库查询） |
| POST | `/api/auth/register` | 否 | 注册 |
| POST | `/api/auth/login` | 否 | 登录，返回 token |
| POST | `/api/auth/verify` | 是 | 校验 token |
| GET | `/api/profile` | 是 | 读资料 |
| PUT | `/api/profile` | 是 | 写资料（`data` 整体覆盖） |

### 4.1 限流

| 规则 | 窗口 | 上限 | 锁定 |
| --- | --- | --- | --- |
| 同一用户名登录失败 | 15 分钟 | 5 次 | 15 分钟 |
| 同一 IP 登录失败 | 15 分钟 | 20 次 | 15 分钟 |
| 同一 IP 注册 | 1 小时 | 10 次 | 到窗口结束 |

超限返回 `429 TOO_MANY_ATTEMPTS` + `Retry-After` 头。
计数持久化在数据库，服务重启不丢。

### 4.2 尚未实现的接口

| 路径 | 用途 | 状态 |
| --- | --- | --- |
| `GET/PUT /api/doc/{key}` | 按文档 key 增量同步 | 未实现，见第 5 节 |
| `GET /api/config/app` | 版本下发 / 远程开关 | 未实现 |

### 4.3 已作废的原计划

早先按 Cloudflare 方案设计过 `/v1/auth/anon`、`/v1/sync/changes`、`/v1/me` 等路径，
实际实现改用了 `/api/*` 前缀与用户名密码体系，这些路径**不再实施**。

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
2. **成本**：对象存储看着够用，但一旦要下载回来就是流量与时间成本。
3. **可行性**：同步的是**资料索引**（文件名、学科归属、最近打开位置），
   换机器后提示「请重新选择该资料所在文件夹」，比默默传 500MB 体验更好。

将来要做时，在这两个键之外单开 `/api/blob/{hash}`（内容寻址 + 去重），不破坏现有契约。

### 5.3 未登录也能用（对应 7.2 第 30 条）

```
未登录 ── 全部数据写本地 SQLite / JSON，标记 owner = "local"
   │
   └─ 登录后首次同步：
        ├─ 云账号是空的  → 本地数据整体上推
        ├─ 云端已有数据  → 按文档逐个比对 updatedAt：本地较新则推 / 云端较新则拉 / 两侧都改过则让用户选
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

    void setBaseUrl(const QUrl &url);   // 默认扣子部署后的公网域名
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

**建议**：首期按 **A** 做（与现有设计一致，零成本先跑通），但**契约上先把 `/api/ai/*` 的位置留出来**，
等真决定做 B 时客户端只换一个开关，不用重构。

⚠️ 无论选哪条，**厂商 Key 都不得写进仓库或客户端资源文件**。选 B 时用
`扣子项目的环境变量面板` 注入，或部署平台提供的 secret 机制。

---

## 8. 实现与部署

### 8.1 已有代码

```
server/
  src/index.js      入口：等数据库就绪 → 建表 → 监听
  src/routes.js     6 个接口 + 鉴权中间件
  src/rateLimit.js  限流规则与计数（持久化到数据库）
  src/db.js         连接池、建表、启动等待
  test/run-tests.js 63 项测试
  Dockerfile
  docker-compose.yml  db + api + tester
  README.md          完整接口文档
```

本地跑：

```bash
cd server
docker compose up -d --build
docker compose run --rm tester     # 63 passed, 0 failed
docker compose down -v
```

### 8.2 数据库

```sql
users        (user_id UUID PK, username VARCHAR(64) UNIQUE, password_hash, created_at)
profiles     (user_id UUID PK → users, nickname, avatar_url, data JSONB, updated_at)
rate_limits  (key TEXT PK, count INT, window_start, locked_until)
```

建表在服务启动时自动执行，不需要手工迁移。

### 8.3 部署到扣子

扣子项目里已有等价实现（Supabase PostgreSQL、6 个接口、13 项自测通过），
但**缺限流**。两种走法：

| 走法 | 做法 | 代价 |
| --- | --- | --- |
| A. 用扣子版，后补限流 | 让扣子 AI 再加一次 | 消耗积分，且要重跑自测 |
| B. 把 `server/` 的代码交给扣子部署 | 代码本地已测好，扣子只负责部署 | 省积分；但需确认扣子项目能接受外部代码 |

环境变量沿用扣子已配好的 `DATABASE_URL` / `JWT_SECRET`；
Supabase 通常要求 TLS，加 `PGSSLMODE=require`。

### 8.4 成本

扣子的积分按任务与部署消耗，具体额度以控制台为准。
本地 Docker 验证不消耗任何积分——这也是把代码放在本地写的主要原因。

### 8.5 国内访问

扣子的域名在国内可达性取决于其 CDN 策略，实测为准。
客户端所有请求仍必须有超时 + 重试 + 「离线可用」降级，不能假设服务端永远在线。

---

## 9. 与 TODO 的对应

| TODO | 变化 |
| --- | --- |
| T-024 账号登录与资料同步 | 服务端一侧已有可运行实现（本地 63 项测试全绿）；**仍 blocked**，等真正部署并接入客户端 |
| T-027 服务端方案文档 | 本文，`done` |
| T-028 用户中心后端代码与本地验证 | `done`，代码在 [server/](../server/README.md) |

**服务端尚未部署到生产。** 扣子那边停在「加限流 → 部署」这一步，
积分耗尽时中断；本地已用更省积分的方式补齐了同一份能力。

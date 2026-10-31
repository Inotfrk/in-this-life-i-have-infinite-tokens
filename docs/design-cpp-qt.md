# 设计文档：C++ / Qt 计算器（替代 Java 版）

> 状态：**设计阶段（未实现）**。本文只描述目标架构、技术选型、删除与改写清单，
> 不包含任何代码实现。实现按 [TODO.md](../TODO.md) 排队推进。
>
> 规则优先级最高：`AGENTS.md`、分支规则（账号段 / 三层流）、`.github/` 工作流、
> `scripts/release.*`、`.agents/branch-registry.md` 等仓库治理文件**一律不动**，
> 本设计只替换「计算器软件本体」及其直接关联的构建基础设施。

---

## 1. 目标与范围

把仓库现有的 **Java Swing 计算器**（`src/main/java` + `src/test/java` + JDK 构建）整体替换为
**C++ / Qt Quick 计算器**，覆盖桌面与移动端。只做设计，不写代码。

### 1.1 目标平台

| 平台 | 是否支持 | 说明 |
| --- | --- | --- |
| Windows | ✅ | 桌面 |
| macOS | ✅ | 桌面 |
| Linux | ✅ | 桌面 |
| iPadOS（平板） | ✅ | 触屏 UI；iPhone 暂不做 |
| Android | ✅ | 触屏 UI |

> **为什么不选 Qt Widgets**：Widgets 不支持 iOS/iPadOS 与 Android。要覆盖移动端，
> 唯一选择是 **Qt Quick / QML**（Qt 6 官方支持桌面 + iOS + Android 全平台）。

### 1.2 范围边界

- **本阶段交付物**：仅本文档（设计），以及随后的删除清单执行（见第 7 节）。
- **实现阶段交付物**：C++ 求值器核心、QML 界面、CMake 构建、Qt Test 测试、
  构建脚本与 CI 的改写（见第 6 节）。这些**不在本阶段完成**。

---

## 2. 技术选型

| 项 | 选型 | 理由 |
| --- | --- | --- |
| 语言 | C++17 | 与仓库既有「C++ 目标」一致；Qt 6 要求 ≥ C++17 |
| UI 框架 | Qt 6 + **Qt Quick / QML** | 跨桌面 + iOS + Android 的唯一方案 |
| 构建系统 | CMake | Qt 6 官方默认；`qmake` 已弃用 |
| 测试框架 | Qt Test（`QtTest`） | 原生集成；实现阶段再定细节 |
| 打包 | `qtdeploy` / `windeployqt` / `macdeployqt` / `androiddeployqt` | 各平台部署工具 |

### 2.1 Qt 版本说明

- 选 **Qt 6**（活跃维护，6.x LTS）。Qt 5.15 发布于 2020-05，开源支持已于 2023 结束，不采用。
- 最低目标：Qt 6.5 LTS 起步，尽量跟上 6.8 LTS。

### 2.2 编码约定（UTF-8）

全仓库源码、QML、CMake、文档、错误提示**统一 UTF-8（无 BOM）**。

- **为什么不用 GBK/GB2312**：虽然中文在 GBK 里每字 2 字节、UTF-8 里每字 3 字节，
  但本项目中文量极小（按钮标签 + 错误提示，合计不到百字），体积差异可忽略；
  真正占体积的是 Qt 运行时库（几十 MB），那几十字节连零头都不到。
- **UTF-8 是唯一跨平台安全选择**：Qt 6 的 `QString`、QML 文件、CMake、Git、编译器以及
  iOS/Android 工具链都默认 UTF-8；GBK 只在 Windows 简体中文环境才「默认」，
  在其他平台会乱码，等于给 macOS/Linux/iPadOS/Android 挖坑。
- **实现要求**：源文件一律保存为 UTF-8（无 BOM）；`QString::fromUtf8` 处理字节输入，
  QML 文本直接写中文即可。

### 2.3 许可方式（可切换）

| 许可 | 费用 | iOS 包 | 发布约束 |
| --- | --- | --- | --- |
| 开源 LGPL v3 | 免费 | 需在 macOS 上自行编译 Qt for iOS | 动态链接、可闭源但需允许替换 Qt 库 |
| 开源 GPL v3 | 免费 | 同上 | 整个应用须开源 |
| 商业授权 | 付费订阅 | 官方预编译 iOS 包 | 可完全闭源、App Store 上架无阻碍 |

**可切换性**：三种许可的 API 完全一致，只是授权义务不同，代码结构**不受影响**。
设计阶段默认按 **LGPL v3 开源**规划；团队若决定上架 App Store（闭源），再购买商业授权切换即可，
无需改动代码。此决定可在实现阶段前再定。

---

## 3. 软件架构

### 3.1 分层设计（逻辑与 UI 彻底分离）

```
┌─────────────────────────────────────────────────────────┐
│  UI 层（QML / Qt Quick）                                  │
│   desktop/  桌面外壳（鼠标键盘）                          │
│   touch/    触屏外壳（iPadOS / Android，大按钮 + 手势）    │
│   —— 通过 QML 的 C++ 后端绑定（QQmlContext）调用核心 ——    │
├─────────────────────────────────────────────────────────┤
│  核心逻辑层（纯 C++，无 Qt GUI 依赖）                      │
│   ExpressionEvaluator  递归下降求值器（可独立单测）        │
│   CalculatorEngine     会话状态（last result / recall）   │
│   —— 零依赖，与 UI、平台无关 ——                          │
├─────────────────────────────────────────────────────────┤
│  平台层（Qt 6 运行时 / 平台插件）                         │
│   Windows / macOS / Linux / iOS / Android                 │
└─────────────────────────────────────────────────────────┘
```

### 3.2 目录结构（规划，实现阶段落地）

```
CMakeLists.txt              顶层 CMake 工程（Qt 6）
src/
    core/
        expression_evaluator.h/.cpp   递归下降求值器（移植自 Java ExpressionEvaluator）
        calculator_engine.h/.cpp      会话状态（上次结果、recall 等）
        expression_evaluator_test.cpp QtTest 单测（对应原 EvaluatorTest 的 25 项）
    ui/
        main.cpp                      QML 入口
        qml/
            Main.qml                  根
            desktop/                  桌面布局（鼠标键盘、快捷键）
            touch/                    触屏布局（大按钮、手势）
            components/               可复用按钮/显示组件
tests/                          （可选）集成测试
platform/                      AndroidManifest.xml、Info.plist 等各平台元数据
```

### 3.3 核心逻辑（保留现有语义）

移植自现有 [ExpressionEvaluator.java](../src/main/java/com/helloworld/taiin/calculator/ExpressionEvaluator.java)，
**行为必须与之一致**：

- 支持 `+ - × ÷ % ^`、括号、小数、一元正负号
- 乘方右结合：`2^3^2 = 512`；`^` 优先级高于一元负号
- 完整表达式求值（非逐步），支持全角字符归一化（`×→*`、`÷→/`、`−→-`、`（）→()`）
- 错误提示中文：除数为零、括号不匹配、表达式不完整、无法识别、数字格式错误
- 除法 / 取模除零抛「除数不能为零」

### 3.4 UI 功能（保留现有交互）

- 数字/运算符/括号/退格/清空键盘
- 完整表达式求值，回车即算
- 结果可直接接运算符继续算（沿用 last result）
- `clear` / `del` / `copy` / `recall` 命令
- 键盘快捷键（桌面端）
- 中文状态栏提示

### 3.5 桌面 vs 触屏的差异

| 维度 | 桌面外壳（Windows/macOS/Linux） | 触屏外壳（iPadOS/Android） |
| --- | --- | --- |
| 交互 | 鼠标 + 键盘快捷键 | 触控 + 手势，大按钮 |
| 布局 | 紧凑键盘（类似原 Swing 布局） | 大间距、大按键、横竖屏自适应 |
| 复制结果 | 系统剪贴板 | 系统剪贴板（移动端系统分享） |

---

## 4. 测试策略

| 层 | 框架 | 内容 |
| --- | --- | --- |
| 核心逻辑 | Qt Test（`QtTest`） | 对应原 `EvaluatorTest` 的 25 项求值用例 + 错误用例 |
| UI 冒烟 | Qt Test / `QTest::keyClick` | 按钮触发、显示更新（对应原 `UiTest`） |
| 移动端 | 真机 / 模拟器手动回归 | 触屏交互、横竖屏 |

> 测试框架细节（`qtest` vs `gtest`）在实现阶段再定，本阶段不锁定。

---

## 5. 平台构建与打包

| 平台 | 构建 | 打包 |
| --- | --- | --- |
| Windows | MSVC 或 MinGW-w64 + Qt | `windeployqt` + Inno Setup / MSIX |
| macOS | Xcode CLT + Qt | `macdeployqt` + `.dmg` |
| Linux | g++ + Qt | `linuxdeployqt` + AppImage |
| iPadOS | **macOS + Xcode + Qt for iOS** | Xcode 归档 → `.ipa` |
| Android | Qt for Android + NDK | `androiddeployqt` → `.apk` / `.aab` |

### 5.1 iOS 特殊约束（团队有 macOS 机器）

- iOS 构建**只能在 macOS 上用 Xcode** 完成（Apple 硬性要求），团队已有 macOS 成员，可承担。
- 开源授权下，Qt for iOS 需要在 macOS 上**自行编译**（商业授权才有官方预编译包）。
- iPadOS 分发：开发调试用 TestFlight；上架 App Store 需开发者账号 + 签名证书 + 审核。
- 桌面版（Windows/Linux）与 iOS 版共享同一份 C++ 核心与大部分 QML。

---

## 6. 基础设施改写方案（实现阶段执行，本阶段不落地）

> 说明：Qt 源码尚未编写。若现在就把构建脚本 / CI / Docker 改成 Qt 构建，
> 仓库将处于「没有可运行代码」状态，`release` workflow 会失败。
> 因此这些改写**全部推迟到实现阶段**，本阶段只记录方案。

| 文件 | 现状 | 目标改动（实现阶段） |
| --- | --- | --- |
| `scripts/build.ps1` | JDK javac/jar/jpackage | 改为 CMake + Qt 构建/测试/打包 |
| `scripts/build.sh` | JDK javac/jar/jpackage | 同上 |
| `Dockerfile` | eclipse-temurin JDK + Xvfb | 改为 Qt 6 + g++ 镜像，去掉 JDK |
| `.devcontainer/devcontainer.json` | Java 扩展 + JDK | 改为 C++ / CMake / Qt 扩展 |
| `.devcontainer/99-cjk-preference.conf` | 中文字体 | 保留（Qt 同样需要 CJK 字体） |
| `.github/workflows/package.yml` | setup-java + jpackage | 改为 install-qt-action + CMake，产出各平台安装包 |
| `.github/workflows/release.yml` | `bash scripts/build.sh test` | 命令不变，但 `build.sh` 内部已改 Qt，测试为 Qt Test |
| `scripts/sandbox.ps1` / `sandbox.sh` | JDK/xvfb 那套 | 改为 Qt 无头测试（`QT_QPA_PLATFORM=offscreen`） |
| `scripts/desktop.sh` / `drive.sh` | 启动 Swing + VisualDrive | 改为启动 QML 应用 + Qt 驱动截图 |
| `.gitignore` | `*.class`、`build/`、`dist/` | 增加 `build*/`、`CMakeCache.txt` 等，去掉 `*.class` |

### 6.1 无头测试

Qt 提供 `QT_QPA_PLATFORM=offscreen`（或 `minimal`）平台插件，可在无显示器环境跑 UI 测试，
替代现在 Java 依赖的 Xvfb；Docker 沙箱与 CI 均可直接用。

---

## 7. 删除清单（Java 计算器内容）

> 以下为「关于 Java 计算器」的待删除内容。执行时机按第 8 节。

### 7.1 源码与测试

- `src/main/java/`（整个目录，含 `CalculatorFrame.java`、`ExpressionEvaluator.java`）
- `src/test/java/`（整个目录，含 `EvaluatorTest.java`、`UiTest.java`、`VisualDrive.java`）

### 7.2 构建产物（不是 Docker，是 Java 编译产物）

- `build/`（`classes/` `.class` 字节码、`test-classes/`、`package-input/`）
- `dist/`（`Calculator.jar`、`Calculator/` app-image、`Calculator-1.0.0-windows-x64-portable.zip`）

### 7.3 构建与打包脚本中的 Java 逻辑

- `scripts/build.ps1`、`scripts/build.sh` 中的 JDK/javac/jar/jpackage 全流程
  （实现阶段替换为 CMake + Qt，见第 6 节）

### 7.4 文档中的 Java 描述

- `README.md` / `README.en.md` 中「现有 Java 实现」段落、JDK 安装步骤、jar/jpackage 说明
  （实现阶段随代码落地同步改写）
- `TODO.md` 中 T-001 的「Java 实现保留为历史示例，不删除」表述（与本设计冲突，需更新）
- `docs/docker-sandbox*.md` 中 JDK/Swing/Xvfb 的说明（实现阶段随 Dockerfile 改写同步更新）

### 7.5 明确保留（规则，优先级最高）

`AGENTS.md`、`.agents/branch-registry.md`、`.github/copilot-instructions.md`、
`scripts/release.ps1` / `release.sh` / `github-pr.ps1` / `github-token.ps1` / `github-rulesets.ps1`、
`.github/workflows/release.yml`（仅其内部测试命令随 build.sh 联动，流程本身不动）、
`NOTE.md`（只追加）、`.github/pull_request_template.md`。

---

## 8. 执行顺序（含本阶段）

1. **本阶段（设计）**：产出本文档；按用户确认删除 Java 源码、测试、`build/`、`dist/`；
   基础设施改写**仅规划不落地**。
2. **实现阶段 A（核心）**：移植 `ExpressionEvaluator` 为 C++，落地 CMake 工程与 Qt Test。
3. **实现阶段 B（UI）**：QML 桌面外壳 + 触屏外壳。
4. **实现阶段 C（基础设施）**：改写 build 脚本、Docker、CI、sandbox（第 6 节）。
5. **实现阶段 D（打包）**：各平台安装包 + iOS/Android 构建流程。

---

## 9. 待实现阶段确认的开放项

| 项 | 说明 |
| --- | --- |
| Qt 许可最终选择 | LGPL（默认）或商业授权，实现阶段前定 |
| 测试框架 | `qtest` 还是 `gtest`，实现阶段定 |
| Android 最低版本 | 实现阶段定（建议 Android 8+） |
| iOS 最低版本 | 实现阶段定（建议 iPadOS 15+） |
| App 名称 / 应用标识 | 实现阶段定（如 `com.taiin.calculator`） |
| 是否上架商店 | 决定签名 / 证书 / 审核工作量 |

---

## 10. 验收标准（实现阶段完成后）

- [ ] `cmake --build` 三桌面平台编译通过
- [ ] 核心求值器 Qt Test 与 Java 版 25 项结果完全一致
- [ ] QML 桌面 / 触屏外壳均可运行
- [ ] `scripts/build.*` 由 Java 切换到 Qt 构建，测试全绿
- [ ] CI（package.yml / release.yml）产出各平台安装包
- [ ] iPadOS 在团队 macOS 上构建出 `.ipa`；Android 出 `.apk`
- [ ] 仓库治理规则文件全程未被动摇

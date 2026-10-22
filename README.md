# In this life I have infinite tokens.

一个用 **纯 JDK（Java 21 + Swing）** 写的跨平台桌面计算器：零第三方依赖，不用 Maven/Gradle，
在 Windows 和 macOS 上都能编译、运行并打包成原生安装包。

#### 功能

- 支持 `+ - × ÷ % ^`、括号、小数、一元正负号
- 完整表达式求值（不是逐步运算），乘方右结合：`2^3^2 = 512`
- 键盘：`Enter` 计算、`Esc` 清空、`Backspace` 退格、`Ctrl+C` 复制结果、`Ctrl+A` 取回上次表达式
- 计算后可直接按运算符继续用上一次结果计算
- 除零、括号不匹配等错误在状态栏用中文提示
- 界面跟随系统外观，高 DPI 下按系统缩放

#### 软件架构

```
src/main/java/com/helloworld/taiin/calculator/
    ExpressionEvaluator.java   递归下降求值器（纯逻辑，无 UI 依赖）
    CalculatorFrame.java       Swing 界面与按键逻辑
src/test/java/com/helloworld/taiin/calculator/
    EvaluatorTest.java         求值器测试（25 项）
    UiTest.java                界面按键测试（6 项，无图形环境自动跳过）
scripts/
    build.ps1                  Windows 构建脚本
    build.sh                   macOS / Linux 构建脚本
```

#### 安装教程

只需要 **JDK 21 或更高版本**（必须是完整 JDK，JRE 里没有 `javac` / `jar` / `jpackage`）。

1. 检查环境：`java -version`
2. 克隆本仓库
3. 编译：`scripts\build.ps1 -Task build`（macOS / Linux：`scripts/build.sh build`）

#### 使用说明

| 操作 | Windows | macOS / Linux |
| --- | --- | --- |
| 直接运行 | `scripts\build.ps1 -Task run` | `scripts/build.sh run` |
| 运行全部测试 | `scripts\build.ps1 -Task test` | `scripts/build.sh test` |
| 生成可执行 jar | `scripts\build.ps1 -Task jar` → `dist\Calculator.jar` | `scripts/build.sh jar` |
| 打安装包 | `scripts\build.ps1 -Task package` | `scripts/build.sh package` |
| 清理产物 | `scripts\build.ps1 -Task clean` | `scripts/build.sh clean` |

安装包说明：

- **Windows**：默认打包 `msi`，需要安装 [WiX Toolset 3](https://wixtoolset.org/)；
  未安装时会自动退回到 `dist\Calculator\Calculator.exe`（免安装绿色版，双击即用）。
- **macOS**：打包 `dmg`，产物在 `dist/`。

已生成的 jar 也可以直接用 `java -jar dist\Calculator.jar` 运行。

#### Agent 协作规则

本仓库由多个 agent 协作维护，规则写在 [AGENTS.md](AGENTS.md)（每次对话自动加载）：

- 平台配置与本仓库文件免询问；仓库外的改动需要同意
- 一机一分支 `<账号段>-<电脑段>-<后缀>`，登记在 [.agents/branch-registry.md](.agents/branch-registry.md)
- 每轮迭代完成后 push 本机分支，小功能完成后合并 `master`
- 夜间 / 空闲 agent 按 [TODO.md](TODO.md) 的协议领取任务

#### 参与贡献

1. Fork 本仓库
2. 新建 Feat_xxx 分支
3. 提交代码
4. 新建 Pull Request

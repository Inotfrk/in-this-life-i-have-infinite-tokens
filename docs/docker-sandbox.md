# 默认沙箱（Docker）

本仓库的构建与测试**默认在 Docker 沙箱里跑**，不在宿主机直接装 JDK。
这样每个人的环境一致，也不会把依赖、缓存、构建产物留在本机。

镜像分成两个 target，按需选一个，避免为了跑测试被迫拉可视化组件：

| Target | 内容 | 体积 | 用途 |
| --- | --- | --- | --- |
| `test`（默认） | JDK 21 + Xvfb + X11 库 + 中文字体 | 约 740 MB | 日常构建与测试 |
| `view` | 在 `test` 之上加 fluxbox / x11vnc / noVNC | 约 +208 MB | 需要**看真实界面**时 |

## 推荐用法：可回溯的长驻容器

`docker run --rm` 跑完就删，测试失败时无法再进去看现场。本仓库用
[scripts/sandbox.ps1](../scripts/sandbox.ps1)（macOS / Linux：[scripts/sandbox.sh](../scripts/sandbox.sh)）
改成**固定命名的长驻容器 + 每次运行留档**：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 build    # 构建轻量镜像
powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 test     # 跑测试并留档
powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 runs     # 列出历史运行
```

macOS / Linux：`scripts/sandbox.sh build`、`scripts/sandbox.sh test`、`scripts/sandbox.sh runs`。

### 为什么能回溯

| 机制 | 效果 |
| --- | --- |
| 容器固定命名 `calculator-sandbox`，`sleep infinity` 常驻 | 失败后仍可用 `docker exec` 进去翻现场，不随命令结束消失 |
| 每次运行写入 `.sandbox-runs/<时间戳>/stdout.log` | 完整输出，含失败项与中文错误提示 |
| 每次运行写入 `.sandbox-runs/<时间戳>/meta.json` | 记录 `exit_code`、耗时、命令、**镜像 ID**、**git commit**、分支、是否有未提交改动 |
| 源码 bind mount 到 `/workspace` | 容器里跑的就是你当前工作区的代码，与 `git status` 一一对应 |
| 记录镜像 ID 而非只看 tag | 能判断某次失败是代码问题还是环境漂移 |

`.sandbox-runs/` 已在 [.gitignore](../.gitignore) 里，不会污染提交。

### 全部子命令

| 子命令 | 作用 |
| --- | --- |
| `build` | 构建镜像；`-Target view`（sh：`TARGET=view`）构建可视版 |
| `start` | 创建或启动长驻容器（已存在则复用） |
| `test` | 跑 `xvfb-run -a bash scripts/build.sh test` 并留档 |
| `view` | 起 noVNC 桌面，打印访问地址并自动截图 |
| `shell` | 交互式进入容器（需要在真终端里跑） |
| `runs` | 按时间倒序列出历史运行与退出码 |
| `logs` | 看容器主进程日志 |
| `stop` | 停止容器，保留现场 |
| `clean` | 删除容器（镜像与 `.sandbox-runs` 保留） |

自定义命令：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 test `
  -Command "xvfb-run -a bash scripts/build.sh build"
```

macOS / Linux：`COMMAND="bash scripts/build.sh build" scripts/sandbox.sh test`。

## 看真实界面（noVNC）

界面测试用的是 Xvfb 虚拟屏，**默认没有任何画面可看**。需要肉眼确认 UI 时用 `view`：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 view
# 浏览器打开 http://localhost:6080/vnc.html?autoconnect=1&resize=scale
```

它会自动做四件事：容器用的若是轻量镜像就重建为 `view`；起 Xvfb `:99`、fluxbox、x11vnc、noVNC；
等 `vnc.html` 返回 200；抓一张 `import -window root` 截图存进 `.sandbox-runs/`。

想用命令驱动界面（验证中文提示、按钮逻辑）：

```bash
docker exec calculator-sandbox bash scripts/drive.sh "1/0="   # 触发除零提示并截图
docker exec calculator-sandbox bash scripts/drive.sh "12*3+4=" # 正常计算
```

`drive.sh` 不按像素点按钮——布局随字体与窗口尺寸浮动，按坐标点击实测会把 `1/0=` 点成 `41%`。
它改用 [VisualDrive](../src/test/java/com/helloworld/taiin/calculator/VisualDrive.java)，
直接调用 `CalculatorFrame.press()`，与按钮 ActionListener 是同一条代码路径，
并且会打印 `display=` / `status=` 便于断言：

```
display=1/0
status=错误：除数不能为零
```

> `view` 这套运行起来只占约 130 MB 内存，**主要成本是镜像与构建缓存**。
> 不需要看画面时不要用 `view`，`test` 就够了。

## 一次性用法（临时环境）

需要完全干净、跑完即弃时仍可直接用 `docker run`：

```bash
docker build --target test -t calculator-sandbox .
docker run --rm -v "$(pwd):/workspace" calculator-sandbox
```

Windows PowerShell：

```powershell
docker build --target test -t calculator-sandbox .
docker run --rm -v "${PWD}:/workspace" calculator-sandbox
```

容器默认执行 `xvfb-run -a bash scripts/build.sh test`，也就是完整测试；
`UiTest` 在容器里靠 `xvfb` 提供虚拟显示，不会因为无图形环境被跳过。

## 文件说明

| 文件 | 作用 |
| --- | --- |
| [Dockerfile](../Dockerfile) | 多阶段：`base` / `test`（轻量）/ `view`（带 noVNC） |
| [.dockerignore](../.dockerignore) | 排除 `build/`、`dist/`、`.git/` 等，镜像更小 |
| [.devcontainer/devcontainer.json](../.devcontainer/devcontainer.json) | VS Code Dev Containers 配置，复用同一个 Dockerfile |
| [.devcontainer/99-cjk-preference.conf](../.devcontainer/99-cjk-preference.conf) | fontconfig 规则，把文泉驿提为中文首选 |
| [scripts/sandbox.ps1](../scripts/sandbox.ps1) | Windows 长驻容器 runner，带运行留档与 view |
| [scripts/sandbox.sh](../scripts/sandbox.sh) | macOS / Linux 同款 runner |
| [scripts/desktop.sh](../scripts/desktop.sh) | 容器内起 Xvfb + fluxbox + x11vnc + noVNC |
| [scripts/drive.sh](../scripts/drive.sh) | 调 VisualDrive 驱动界面并截图 |
| [VisualDrive.java](../src/test/java/com/helloworld/taiin/calculator/VisualDrive.java) | 通过 `press()` 注入按键，绕过像素坐标 |

## 注意

- 宿主机仍保留 `scripts/build.ps1` / `scripts/build.sh`，没有 Docker 时可直接用，但**默认推荐沙箱**。
- 容器内路径是 `/workspace`，不要在容器里 `git push`；提交仍在宿主机做。
- 首次 `build` 会从 `mirrors.ustc.edu.cn` 装包（官方源在部分网络下 502）；海外机器可删掉 Dockerfile 里的换源那段。
- 本机安装 Docker 的完整踩坑记录见 [docker-sandbox-install.md](docker-sandbox-install.md)。

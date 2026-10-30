# 默认沙箱（Docker）

本仓库的构建与测试**默认在 Docker 沙箱里跑**，不在宿主机直接装 JDK。
这样每个人的环境一致，也不会把依赖、缓存、构建产物留在本机。

## 推荐用法：可回溯的长驻容器

`docker run --rm` 跑完就删，测试失败时无法再进去看现场。本仓库用
[scripts/sandbox.ps1](../scripts/sandbox.ps1)（macOS / Linux：[scripts/sandbox.sh](../scripts/sandbox.sh)）
改成**固定命名的长驻容器 + 每次运行留档**：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 build    # 构建镜像（--pull，记录镜像 ID）
powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 test     # 跑测试并留档
powershell -ExecutionPolicy Bypass -File scripts\sandbox.ps1 runs     # 列出历史运行
```

macOS / Linux 把 `sandbox.ps1` 换成 `scripts/sandbox.sh`、去掉 `powershell -File` 前缀。

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
| `build` | `docker build --pull`，拉最新基础镜像后构建 |
| `start` | 创建或启动长驻容器（已存在则复用） |
| `test` | 跑 `xvfb-run -a bash scripts/build.sh test` 并留档 |
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

## 一次性用法（临时环境）

需要完全干净、跑完即弃时仍可直接用 `docker run`：

```bash
docker build -t calculator-sandbox .
docker run --rm -v "$(pwd):/workspace" calculator-sandbox
```

Windows PowerShell：

```powershell
docker build -t calculator-sandbox .
docker run --rm -v "${PWD}:/workspace" calculator-sandbox
```

容器默认执行 `xvfb-run -a bash scripts/build.sh test`，也就是完整测试；
`UiTest` 在容器里靠 `xvfb` 提供虚拟显示，不会因为无图形环境被跳过。

## 文件说明

| 文件 | 作用 |
| --- | --- |
| [Dockerfile](../Dockerfile) | `eclipse-temurin:21-jdk-jammy` + `xvfb`，非 root 用户 `dev` |
| [.dockerignore](../.dockerignore) | 排除 `build/`、`dist/`、`.git/` 等，镜像更小 |
| [.devcontainer/devcontainer.json](../.devcontainer/devcontainer.json) | VS Code Dev Containers 配置，复用同一个 Dockerfile |
| [scripts/sandbox.ps1](../scripts/sandbox.ps1) | Windows 长驻容器 runner，带运行留档 |
| [scripts/sandbox.sh](../scripts/sandbox.sh) | macOS / Linux 同款 runner |

## 注意

- 宿主机仍保留 `scripts/build.ps1` / `scripts/build.sh`，没有 Docker 时可直接用，但**默认推荐沙箱**。
- 容器内路径是 `/workspace`，不要在容器里 `git push`；提交仍在宿主机做。
- 本机安装 Docker 的完整踩坑记录见 [docker-sandbox-install.md](docker-sandbox-install.md)。

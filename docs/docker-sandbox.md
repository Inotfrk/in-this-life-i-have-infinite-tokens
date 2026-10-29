# 默认沙箱（Docker）

本仓库的构建与测试**默认在 Docker 沙箱里跑**，不在宿主机直接装 JDK。
这样每个人的环境一致，也不会把依赖、缓存、构建产物留在本机。

## 一句话用法

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

## 常用命令

| 目的 | 命令 |
| --- | --- |
| 跑全部测试（默认） | `docker run --rm -v "${PWD}:/workspace" calculator-sandbox` |
| 只编译 | `docker run --rm -v "${PWD}:/workspace" calculator-sandbox bash scripts/build.sh build` |
| 交互式 Shell | `docker run --rm -it -v "${PWD}:/workspace" calculator-sandbox bash` |
| 进 VS Code 沙箱 | 安装 Dev Containers 扩展 → `Dev Containers: Reopen in Container` |

`-v "${PWD}:/workspace"`（macOS / Linux：`-v "$(pwd):/workspace"`）会覆盖镜像里那份代码，
改完立刻生效；需要完全干净的环境时去掉 `-v` 参数即可。

## 文件说明

| 文件 | 作用 |
| --- | --- |
| [Dockerfile](../Dockerfile) | `eclipse-temurin:21-jdk-jammy` + `xvfb`，非 root 用户 `dev` |
| [.dockerignore](../.dockerignore) | 排除 `build/`、`dist/`、`.git/` 等，镜像更小 |
| [.devcontainer/devcontainer.json](../.devcontainer/devcontainer.json) | VS Code Dev Containers 配置，复用同一个 Dockerfile |

## 注意

- 宿主机仍保留 `scripts/build.ps1` / `scripts/build.sh`，没有 Docker 时可直接用，但**默认推荐沙箱**。
- 容器内路径是 `/workspace`，不要在容器里 `git push`；提交仍在宿主机做。
- 本机安装 Docker 的完整踩坑记录见 [docker-sandbox-install.md](docker-sandbox-install.md)。

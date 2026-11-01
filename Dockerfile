# 学习助手桌面应用（Qt 6 + Qt Quick）的沙箱镜像。用法见 docs/docker-sandbox.md。
#
# 两个 target，按需选一个：
#   test  轻量版（默认）：Qt 6 + CMake + Xvfb，只够构建与跑无头界面检查
#   view  可视版：在 test 之上再加 fluxbox / x11vnc / novnc，可用浏览器看真实界面
#
#   docker build --target test -t infinite-tokens-sandbox:local .
#   docker build --target view -t infinite-tokens-sandbox:view  .
FROM ubuntu:24.04 AS base

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

# 镜像源可用 APT_MIRROR 覆盖（例如内网或加速站点）：
#   docker build --build-arg APT_MIRROR=https://mirrors.ustc.edu.cn/ubuntu ...
# 默认用官方源：本机实测官方源直连正常，而中科大镜像在部分网络下证书链校验失败（Err:1 证书不受信任），
# 会导致整个 apt 步骤报 exit code 100。
ARG APT_MIRROR=""
RUN if [ -n "$APT_MIRROR" ]; then \
        if [ -f /etc/apt/sources.list.d/ubuntu.sources ]; then \
            sed -i "s|http://archive.ubuntu.com/ubuntu|$APT_MIRROR|g; s|http://security.ubuntu.com/ubuntu|$APT_MIRROR|g" /etc/apt/sources.list.d/ubuntu.sources; \
        fi; \
        if [ -f /etc/apt/sources.list ]; then \
            sed -i "s|http://archive.ubuntu.com/ubuntu|$APT_MIRROR|g; s|http://security.ubuntu.com/ubuntu|$APT_MIRROR|g" /etc/apt/sources.list; \
        fi; \
    fi \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        ninja-build \
        qt6-base-dev \
        qt6-declarative-dev \
        qml6-module-qtquick \
        qml6-module-qtquick-window \
        qml6-module-qtquick-templates \
        qml6-module-qtquick-layouts \
        qml6-module-qtqml \
        qml6-module-qtqml-workerscript \
        libgl1-mesa-dev \
        libgl1-mesa-dri \
        xvfb \
        fontconfig \
        fonts-dejavu-core \
        fonts-wqy-zenhei \
        tzdata \
        ca-certificates \
        tini \
    && rm -rf /var/lib/apt/lists/*

# 容器里没有桌面环境，fontconfig 默认把 zh 请求也映射到 DejaVu Sans，
# 而 DejaVu 无汉字，界面中文会显示方块。这个规则把文泉驿提为中文首选。
COPY .devcontainer/99-cjk-preference.conf /etc/fonts/conf.d/99-cjk-preference.conf
RUN fc-cache -f >/dev/null

# Ubuntu 24.04 基础镜像自带 uid 1000 的 `ubuntu` 用户，这里优先复用它而不是新建，
# 否则 `useradd --uid 1000` 会以 "UID 1000 is not unique" 失败。
RUN if getent passwd 1000 >/dev/null; then \
        existing="$(getent passwd 1000 | cut -d: -f1)"; \
        if [ "$existing" != "dev" ]; then \
            usermod -l dev -d /home/dev -m "$existing"; \
            groupmod -n dev "$(id -gn dev)" || true; \
        fi; \
    else \
        useradd --create-home --uid 1000 dev; \
    fi
WORKDIR /workspace
# WORKDIR 会以 root 建出 /workspace，只 COPY --chown 文件不够：
# 目录本身仍属 root，dev 用户 mkdir build/ 会 Permission denied。
RUN chown dev:dev /workspace
COPY --chown=dev:dev . .
RUN chmod +x scripts/*.sh
USER dev

# tini 作为 PID 1 回收僵尸进程。没有 init 时 Xvfb 会挂在 wait 上、容器永不退出，
# 所以这里写进镜像，`docker run` 不带 --init 也不会卡住。
ENTRYPOINT ["/usr/bin/tini", "--"]


# ---- 轻量版：只跑构建 + 无头界面检查，不需要任何可视化组件 -----------------
FROM base AS test

# offscreen 平台 + 软件渲染：容器里没有 GPU，这样也拿得到真实渲染的截图。
ENV QT_QPA_PLATFORM=offscreen \
    QT_QUICK_BACKEND=software
CMD ["bash", "-lc", "bash scripts/build.sh test"]


# ---- 可视版：多一层窗口管理 + VNC + noVNC，浏览器里能看真实界面 -----------
FROM base AS view

USER root
RUN if [ -f /etc/apt/sources.list.d/ubuntu.sources ]; then \
        sed -i 's|http://archive.ubuntu.com/ubuntu|https://mirrors.ustc.edu.cn/ubuntu|g; s|http://security.ubuntu.com/ubuntu|https://mirrors.ustc.edu.cn/ubuntu|g' /etc/apt/sources.list.d/ubuntu.sources; \
    fi \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        fluxbox \
        x11vnc \
        novnc \
        websockify \
        imagemagick \
        xdotool \
        x11-utils \
    && rm -rf /var/lib/apt/lists/*
USER dev

# Qt Quick 在 Xvfb 下走软件渲染，不依赖显卡或 EGL。
ENV QT_QUICK_BACKEND=software
CMD ["bash", "-lc", "bash scripts/build.sh test"]

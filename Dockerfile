# 计算器项目的沙箱镜像。用法见 docs/docker-sandbox.md。
#
# 两个 target，按需选一个：
#   test  轻量版（默认）：JDK + Xvfb + X11 库，只够跑构建与测试
#   view  可视版：在 test 之上再加 fluxbox / x11vnc / novnc，可用浏览器看真实界面
#
#   docker build --target test -t calculator-sandbox:local .
#   docker build --target view -t calculator-sandbox:view  .
FROM eclipse-temurin:21-jdk-jammy AS base

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8"

# AWT/Swing 需要 X11 客户端库（libXrender 等）。xvfb 只提供虚拟显示本身，
# 缺了这些库会在 Toolkit 初始化时抛 UnsatisfiedLinkError: libXrender.so.1。
# 官方 archive.ubuntu.com 在部分网络下返回 502，换中科大镜像；海外机器可删掉这段。
RUN if [ -f /etc/apt/sources.list ]; then \
        sed -i 's|http://archive.ubuntu.com/ubuntu|https://mirrors.ustc.edu.cn/ubuntu|g; s|http://security.ubuntu.com/ubuntu|https://mirrors.ustc.edu.cn/ubuntu|g' /etc/apt/sources.list; \
    fi \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        xvfb \
        libxrender1 \
        libxtst6 \
        libxi6 \
        libxext6 \
        libx11-6 \
        fontconfig \
        fonts-dejavu-core \
        fonts-wqy-zenhei \
        tzdata \
        ca-certificates \
        tini \
    && rm -rf /var/lib/apt/lists/*

# 容器没有桌面环境，fontconfig 默认把 zh 请求也映射到 DejaVu Sans，
# 而 DejaVu 无汉字，Swing 标题 / 状态栏会显示方块。这个规则把文泉驿提为中文首选。
COPY .devcontainer/99-cjk-preference.conf /etc/fonts/conf.d/99-cjk-preference.conf
RUN fc-cache -f >/dev/null

RUN useradd --create-home --uid 1000 dev
WORKDIR /workspace
# WORKDIR 会以 root 建出 /workspace，只 COPY --chown 文件不够：
# 目录本身仍属 root，dev 用户 mkdir build/ 会 Permission denied。
RUN chown dev:dev /workspace
COPY --chown=dev:dev . .
RUN chmod +x scripts/*.sh
USER dev

# tini 作为 PID 1 回收僵尸进程。没有 init 时 Xvfb 会挂在 wait 上、容器永不退出，
# 所以这里写进镜像，`docker run` 不带 --init 也不会卡住。
# 放在 base 里，两个 target 都继承，test 与 view 都受益。
ENTRYPOINT ["/usr/bin/tini", "--"]


# ---- 轻量版：只跑测试，不需要任何可视化组件 -------------------------------
FROM base AS test

# xvfb-run 提供 DISPLAY，UiTest 才会真正执行而不是跳过。
CMD ["bash", "-lc", "xvfb-run -a bash scripts/build.sh test"]


# ---- 可视版：多一层窗口管理 + VNC + noVNC，浏览器里能看真实界面 -----------
# 这一层约 208 MB，只在需要「看画面」时才拉取。
FROM base AS view

USER root
RUN if [ -f /etc/apt/sources.list ]; then \
        sed -i 's|http://archive.ubuntu.com/ubuntu|https://mirrors.ustc.edu.cn/ubuntu|g; s|http://security.ubuntu.com/ubuntu|https://mirrors.ustc.edu.cn/ubuntu|g' /etc/apt/sources.list; \
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

# 默认仍是跑测试；要看画面用 scripts/sandbox.ps1 view（它会在容器里起桌面）。
CMD ["bash", "-lc", "xvfb-run -a bash scripts/build.sh test"]

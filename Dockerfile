# 计算器项目的默认沙箱镜像：JDK 21 + Xvfb（界面测试需要虚拟显示）。
# 用法见 docs/docker-sandbox.md：构建一次，之后所有构建 / 测试都在容器里跑。
FROM eclipse-temurin:21-jdk-jammy

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8"

# AWT/Swing 需要 X11 客户端库（libXrender 等），xvfb 只提供虚拟显示，不含这些库；
# 缺了会在 Toolkit 初始化时抛 UnsatisfiedLinkError: libXrender.so.1。
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        xvfb \
        libxrender1 \
        libxtst6 \
        libxi6 \
        libxext6 \
        libx11-6 \
        fontconfig \
        fonts-dejavu-core \
        tzdata \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 沙箱内不用 root 跑构建。
RUN useradd --create-home --uid 1000 dev
WORKDIR /workspace
COPY --chown=dev:dev . .
RUN chmod +x scripts/build.sh
USER dev

# xvfb-run 提供 DISPLAY，UiTest 才会真正执行而不是跳过。
CMD ["bash", "-lc", "xvfb-run -a bash scripts/build.sh test"]

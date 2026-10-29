# 计算器项目的默认沙箱镜像：JDK 21 + Xvfb（界面测试需要虚拟显示）。
# 用法见 docs/docker-sandbox.md：构建一次，之后所有构建 / 测试都在容器里跑。
FROM eclipse-temurin:21-jdk-jammy

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8"

# xvfb 让 UiTest 有虚拟 DISPLAY；tzdata 保证时区正常，不装额外依赖。
RUN apt-get update \
    && apt-get install -y --no-install-recommends xvfb tzdata ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 沙箱内不用 root 跑构建。
RUN useradd --create-home --uid 1000 dev
WORKDIR /workspace
COPY --chown=dev:dev . .
RUN chmod +x scripts/build.sh
USER dev

# xvfb-run 提供 DISPLAY，UiTest 才会真正执行而不是跳过。
CMD ["bash", "-lc", "xvfb-run -a bash scripts/build.sh test"]

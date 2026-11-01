#!/usr/bin/env bash
# 配置、构建、测试（macOS / Linux）。仅需 CMake + Qt 6 + C++17 编译器。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="$ROOT/build"
TASK="${1:-build}"
JOBS="${JOBS:-$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 2)}"

configure() {
  cmake -S "$ROOT" -B "$BUILD" -G Ninja -DCMAKE_BUILD_TYPE="${CMAKE_BUILD_TYPE:-Release}"
}

build() {
  configure
  cmake --build "$BUILD" --parallel "$JOBS"
  echo "构建完成 -> $BUILD"
}

# 无显示器环境用 offscreen 平台渲染一张界面截图，确认 QML 能加载、布局不塌。
ui_check() {
  build
  local out="${UI_SHOT:-$BUILD/ui-screenshot.png}"
  QT_QPA_PLATFORM="${QT_QPA_PLATFORM:-offscreen}" \
  QT_QUICK_BACKEND="${QT_QUICK_BACKEND:-software}" \
    "$BUILD/infinite-tokens" --screenshot "$out"
  if [ ! -s "$out" ]; then
    echo "错误：界面截图未生成（$out）" >&2
    exit 1
  fi
  echo "界面检查通过 -> $out"
}

case "$TASK" in
  build) build ;;
  test) ui_check ;;
  run) build; QT_QUICK_BACKEND="${QT_QUICK_BACKEND:-software}" "$BUILD/infinite-tokens" ;;
  clean) rm -rf "$BUILD"; echo "已清理 build/" ;;
  *) echo "用法: scripts/build.sh [build|test|run|clean]"; exit 1 ;;
esac

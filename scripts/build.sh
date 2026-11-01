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

# 可执行文件位置因平台而异：macOS 上 MACOSX_BUNDLE 让它落在
# build/infinite-tokens.app/Contents/MacOS/infinite-tokens，Linux 上则是
# build/infinite-tokens。这里统一探测，避免写死路径导致 macOS CI 失败。
exe_path() {
  if [ -x "$BUILD/infinite-tokens" ]; then
    echo "$BUILD/infinite-tokens"
  elif [ -x "$BUILD/infinite-tokens.app/Contents/MacOS/infinite-tokens" ]; then
    echo "$BUILD/infinite-tokens.app/Contents/MacOS/infinite-tokens"
  else
    echo "错误：找不到构建产物（$BUILD/infinite-tokens 或 .app bundle）" >&2
    exit 1
  fi
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
    "$(exe_path)" --screenshot "$out"
  if [ ! -s "$out" ]; then
    echo "错误：界面截图未生成（$out）" >&2
    exit 1
  fi
  echo "界面检查通过 -> $out"
}

case "$TASK" in
  build) build ;;
  test) ui_check ;;
  run) build; QT_QUICK_BACKEND="${QT_QUICK_BACKEND:-software}" "$(exe_path)" ;;
  clean) rm -rf "$BUILD"; echo "已清理 build/" ;;
  *) echo "用法: scripts/build.sh [build|test|run|clean]"; exit 1 ;;
esac

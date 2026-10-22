#!/usr/bin/env bash
# 编译、测试、打包（macOS / Linux）。仅需 JDK 21+，无需 Maven/Gradle。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_MAIN="$ROOT/src/main/java"
SRC_TEST="$ROOT/src/test/java"
BUILD="$ROOT/build"
CLASSES="$BUILD/classes"
TEST_CLASSES="$BUILD/test-classes"
DIST="$ROOT/dist"
MAIN_CLASS="com.helloworld.taiin.calculator.CalculatorFrame"
APP_NAME="Calculator"
APP_VERSION="${APP_VERSION:-1.0.0}"
TASK="${1:-build}"

build() {
  mkdir -p "$CLASSES"
  javac --release 21 -encoding UTF-8 -d "$CLASSES" $(find "$SRC_MAIN" -name '*.java')
  echo "编译完成 -> $CLASSES"
}

test_all() {
  build
  mkdir -p "$TEST_CLASSES"
  javac --release 21 -encoding UTF-8 -cp "$CLASSES" -d "$TEST_CLASSES" $(find "$SRC_TEST" -name '*.java')
  java -Dfile.encoding=UTF-8 -cp "$CLASSES:$TEST_CLASSES" com.helloworld.taiin.calculator.EvaluatorTest
  java -Dfile.encoding=UTF-8 -cp "$CLASSES:$TEST_CLASSES" com.helloworld.taiin.calculator.UiTest
}

make_jar() {
  build
  mkdir -p "$DIST"
  jar --create --file "$DIST/$APP_NAME.jar" --main-class "$MAIN_CLASS" -C "$CLASSES" .
  echo "已生成 -> $DIST/$APP_NAME.jar"
}

package_app() {
  make_jar
  if ! command -v jpackage >/dev/null 2>&1; then
    echo "错误：找不到 jpackage，请使用完整 JDK（不是 JRE）" >&2
    exit 1
  fi
  # jpackage 要求 --input 目录里能找到主 jar
  local stage="$BUILD/package-input"
  rm -rf "$stage"
  mkdir -p "$stage" "$DIST"
  cp "$DIST/$APP_NAME.jar" "$stage/"

  # 先出便携版：macOS 得到 .app，Linux 得到可执行目录，不依赖额外工具
  jpackage --type app-image --name "$APP_NAME" --app-version "$APP_VERSION" \
    --input "$stage" --main-jar "$APP_NAME.jar" --main-class "$MAIN_CLASS" \
    --dest "$DIST" --java-options '-Dfile.encoding=UTF-8'

  if [[ "$(uname -s)" == Darwin* ]]; then
    if ! jpackage --type dmg --name "$APP_NAME" --app-version "$APP_VERSION" \
      --input "$stage" --main-jar "$APP_NAME.jar" --main-class "$MAIN_CLASS" \
      --dest "$DIST" --java-options '-Dfile.encoding=UTF-8'; then
      echo "警告：DMG 打包失败，$DIST/$APP_NAME.app 仍然可用" >&2
      return 0
    fi
    echo "安装包已生成 -> $DIST/$APP_NAME-$APP_VERSION.dmg"
    return 0
  fi

  if ! jpackage --type deb --name "$APP_NAME" --app-version "$APP_VERSION" \
    --input "$stage" --main-jar "$APP_NAME.jar" --main-class "$MAIN_CLASS" \
    --dest "$DIST" --java-options '-Dfile.encoding=UTF-8'; then
    echo "警告：DEB 打包失败（缺少 dpkg / fakeroot），便携版仍在 $DIST/$APP_NAME" >&2
    return 0
  fi
  echo "安装包已生成到 $DIST"
}

case "$TASK" in
  build) build ;;
  test) test_all ;;
  run) build; java -Dfile.encoding=UTF-8 -cp "$CLASSES" "$MAIN_CLASS" ;;
  jar) make_jar ;;
  package) package_app ;;
  clean) rm -rf "$BUILD" "$DIST"; echo "已清理 build/ 与 dist/" ;;
  *) echo "用法: scripts/build.sh [build|test|run|jar|package|clean]"; exit 1 ;;
esac

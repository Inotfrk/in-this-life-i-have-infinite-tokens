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
  local type='dmg'
  if [[ "$(uname -s)" != Darwin* ]]; then type='deb'; fi
  jpackage --type "$type" --name "$APP_NAME" --app-version 1.0.0 \
    --input "$CLASSES" --main-jar "$APP_NAME.jar" --main-class "$MAIN_CLASS" \
    --dest "$DIST" --java-options '-Dfile.encoding=UTF-8'
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

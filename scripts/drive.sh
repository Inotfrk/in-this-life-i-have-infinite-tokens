#!/usr/bin/env bash
# 在沙箱里「点」计算器并截图，用来确认界面与中文提示。
# 用法: bash scripts/drive.sh "1/0="
#   × ÷ 会自动换成 * /
#
# 不按像素坐标点按钮：布局随字体与窗口尺寸浮动，坐标极易点偏（实测会把 1/0=
# 点成 41%）。这里改用 VisualDrive，它直接调用 CalculatorFrame.press()，
# 走的是按钮 ActionListener 的同一条路径，结果与真实点击一致。
set -uo pipefail
export DISPLAY="${DISPLAY:-:99}"
KEYS="${1:-12*3+4=}"
HOLD="${2:-25}"

calc_pids() { pgrep -f 'CalculatorFrame|VisualDrive' || true; }

# 关掉已有的计算器窗口，保证截图里只有本次结果
for pid in $(calc_pids); do kill "$pid" 2>/dev/null || true; done
sleep 0.5

# VisualDrive 在 src/test 下，先确保测试类已编译（scripts/build.sh test 会编）
if [ ! -f /workspace/build/test-classes/com/helloworld/taiin/calculator/VisualDrive.class ]; then
    (cd /workspace && javac --release 21 -encoding UTF-8 -cp build/classes \
        -d build/test-classes $(find src/test -name '*.java'))
fi

CP="/workspace/build/classes:/workspace/build/test-classes"
java -Dfile.encoding=UTF-8 -cp "$CP" \
    com.helloworld.taiin.calculator.VisualDrive "$KEYS" "$HOLD" >/tmp/visualdrive.log 2>&1 &

# 等窗口出现并完成按键
for _ in $(seq 1 30); do
    sleep 0.4
    if grep -q '^display=' /tmp/visualdrive.log 2>/dev/null; then break; fi
done

grep -E '^display=|^status=' /tmp/visualdrive.log || true

OUT="/tmp/drive-$(date +%Y%m%d-%H%M%S).png"
import -window root "$OUT"
echo "$OUT"
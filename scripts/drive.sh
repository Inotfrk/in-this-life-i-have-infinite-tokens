#!/usr/bin/env bash
# 沙箱内驱动计算器：模拟按键并截图，用来确认中文提示与交互是否正常。
# 用法: bash scripts/drive.sh "12*3+4=" 或 bash scripts/drive.sh "1/0="
set -uo pipefail
export DISPLAY="${DISPLAY:-:99}"
KEYS="${1:-12*3+4=}"

WIN=$(xdotool search --onlyvisible --name '计算器' 2>/dev/null | head -1)
if [ -z "$WIN" ]; then
    WIN=$(xdotool search --onlyvisible --class Calc 2>/dev/null | head -1)
fi
if [ -z "$WIN" ]; then
    echo 'calculator window not found' >&2
    exit 1
fi

xdotool windowactivate --sync "$WIN" 2>/dev/null
sleep 0.3

# 把 × ÷ 之类换成程序认识的字符，便于命令行输入
KEYS="${KEYS//×/*}"
KEYS="${KEYS//÷//}"

for ((i = 0; i < ${#KEYS}; i++)); do
    ch="${KEYS:$i:1}"
    xdotool type --window "$WIN" --delay 60 "$ch"
done

sleep 1
OUT="/tmp/drive-$(date +%Y%m%d-%H%M%S).png"
import -window root "$OUT"
echo "$OUT"

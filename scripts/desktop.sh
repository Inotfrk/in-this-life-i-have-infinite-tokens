#!/usr/bin/env bash
# 在容器里起一套「看得见」的虚拟桌面：
#   Xvfb (:99) -> fluxbox (窗口管理器) -> x11vnc (5900) -> noVNC/websockify (6080)
# 之后用浏览器打开 http://localhost:6080/vnc.html 就能看到计算器的真实界面。
# 由 scripts/sandbox.ps1 view 调用，也可在容器里手动执行。
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DISPLAY_NUM="${DISPLAY_NUM:-99}"
VNC_PORT="${VNC_PORT:-5900}"
WEB_PORT="${WEB_PORT:-6080}"
GEOMETRY="${GEOMETRY:-1024x768x24}"
MAIN_CLASS="com.helloworld.taiin.calculator.CalculatorFrame"

log() { echo "[desktop] $*"; }

pkill -f "Xvfb :$DISPLAY_NUM" 2>/dev/null
pkill -f "x11vnc" 2>/dev/null
pkill -f "websockify" 2>/dev/null
pkill -f "$MAIN_CLASS" 2>/dev/null
sleep 0.5

log "starting Xvfb :$DISPLAY_NUM ($GEOMETRY)"
Xvfb ":$DISPLAY_NUM" -screen 0 "$GEOMETRY" -nolisten tcp >/tmp/xvfb.log 2>&1 &
sleep 1

export DISPLAY=":$DISPLAY_NUM"

# fluxbox 提供窗口边框与标题栏，否则窗口没有装饰、截图里看不出窗口边界。
# fluxbox 默认字体没有汉字，标题「计算器」会显示成 □□□，必须显式指定 CJK 字体。
if command -v fluxbox >/dev/null 2>&1; then
    FLUXBOX_DIR="$HOME/.fluxbox"
    if [ ! -f "$FLUXBOX_DIR/init" ]; then
        mkdir -p "$FLUXBOX_DIR"
        printf 'session.screen0.toolbar.widthPercent: 100\n' > "$FLUXBOX_DIR/init"
    fi
    grep -q 'session.screen0.window.font' "$FLUXBOX_DIR/init" 2>/dev/null || \
        printf '\nsession.screen0.window.font: WenQuanYi Zen Hei-10\n' >> "$FLUXBOX_DIR/init"
    grep -q 'session.screen0.toolbar.font' "$FLUXBOX_DIR/init" 2>/dev/null || \
        printf 'session.screen0.toolbar.font: WenQuanYi Zen Hei-10\n' >> "$FLUXBOX_DIR/init"
    grep -q 'session.screen0.menu.font' "$FLUXBOX_DIR/init" 2>/dev/null || \
        printf 'session.screen0.menu.font: WenQuanYi Zen Hei-10\n' >> "$FLUXBOX_DIR/init"
    # 样式文件（如 ubuntu-light）里自带的 window.font 会覆盖 init 的设置，
    # 只有 overlay 能压过样式，标题栏才会真正用上中文字体。
    printf 'window.font: WenQuanYi Zen Hei-10\ntoolbar.font: WenQuanYi Zen Hei-10\nmenu.title.font: WenQuanYi Zen Hei-10\nmenu.frame.font: WenQuanYi Zen Hei-10\n' > "$FLUXBOX_DIR/overlay"
    fluxbox >/tmp/fluxbox.log 2>&1 &
    sleep 1
fi

log "starting x11vnc on $VNC_PORT"
x11vnc -display "$DISPLAY" -rfbport "$VNC_PORT" -forever -shared -nopw -quiet >/tmp/x11vnc.log 2>&1 &
sleep 1

log "starting noVNC on $WEB_PORT"
websockify --web=/usr/share/novnc "$WEB_PORT" "localhost:$VNC_PORT" >/tmp/websockify.log 2>&1 &
sleep 1

if [ ! -d "$ROOT/build/classes" ]; then
    log "compiling first"
    (cd "$ROOT" && bash scripts/build.sh build)
fi

log "launching $MAIN_CLASS"
java -Dfile.encoding=UTF-8 -cp "$ROOT/build/classes" "$MAIN_CLASS" >/tmp/calculator.log 2>&1 &
sleep 2

log "ready -> http://localhost:$WEB_PORT/vnc.html?autoconnect=1&resize=scale"

#!/usr/bin/env bash
# Sandbox runner for macOS / Linux (same behaviour as scripts/sandbox.ps1).
# A long-lived named container is used instead of --rm, so every run can be
# inspected afterwards; each run is recorded under .sandbox-runs/<timestamp>/.
#
# Usage: scripts/sandbox.sh [build|start|test|view|shell|runs|logs|stop|clean]
#
#   TARGET=view scripts/sandbox.sh build   # 构建带 noVNC 桌面的可视镜像
#   scripts/sandbox.sh view                # 起桌面并在浏览器看 http://localhost:6080
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${TARGET:-test}"
if [ "$TARGET" = "view" ]; then
  IMAGE="${IMAGE:-calculator-sandbox:view}"
else
  IMAGE="${IMAGE:-calculator-sandbox:local}"
fi
VIEW_IMAGE="${VIEW_IMAGE:-calculator-sandbox:view}"
CONTAINER="${CONTAINER:-calculator-sandbox}"
VIEW_PORT="${VIEW_PORT:-6080}"
COMMAND="${COMMAND:-xvfb-run -a bash scripts/build.sh test}"
RUNS="$ROOT/.sandbox-runs"
TASK="${1:-test}"

container_exists() {
  [ -n "$(docker container ls -a --filter "name=^/${CONTAINER}$" --format '{{.Names}}')" ]
}

container_image() {
  docker container inspect -f '{{.Config.Image}}' "$CONTAINER" 2>/dev/null || echo ''
}

build_image() {
  docker build --target "$TARGET" -t "$IMAGE" -f "$ROOT/Dockerfile" "$ROOT"
}

start_container() {
  local image="${1:-$IMAGE}"
  if ! container_exists; then
    docker run -d --name "$CONTAINER" -p "${VIEW_PORT}:6080" \
      -v "$ROOT:/workspace" -w /workspace --init "$image" sleep infinity >/dev/null
  elif [ "$(docker container inspect -f '{{.State.Running}}' "$CONTAINER")" != "true" ]; then
    docker start "$CONTAINER" >/dev/null
  fi
}

run_test() {
  start_container
  local stamp run_dir exit_code started finished
  stamp="$(date +%Y%m%d-%H%M%S)"
  run_dir="$RUNS/$stamp"
  mkdir -p "$run_dir"
  started="$(date -Iseconds)"

  echo "Running: $COMMAND"
  set +e
  docker exec "$CONTAINER" bash -lc "$COMMAND" 2>&1 | tee "$run_dir/stdout.log"
  exit_code="${PIPESTATUS[0]}"
  set -e
  finished="$(date -Iseconds)"

  {
    printf '{\n'
    printf '  "started_at": "%s",\n' "$started"
    printf '  "finished_at": "%s",\n' "$finished"
    printf '  "exit_code": %s,\n' "$exit_code"
    printf '  "command": "%s",\n' "$COMMAND"
    printf '  "image": "%s",\n' "$(container_image)"
    printf '  "image_id": "%s",\n' "$(docker image inspect -f '{{.Id}}' "$(container_image)")"
    printf '  "container": "%s",\n' "$CONTAINER"
    printf '  "git_commit": "%s",\n' "$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo '')"
    printf '  "git_branch": "%s",\n' "$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
    printf '  "git_dirty": %s\n' "$([ -n "$(git -C "$ROOT" status --porcelain 2>/dev/null)" ] && echo true || echo false)"
    printf '}\n'
  } > "$run_dir/meta.json"

  echo
  echo "exit=$exit_code"
  echo "record -> $run_dir"
  return "$exit_code"
}

start_view() {
  # 可视桌面需要 VNC 组件，固定用 view 镜像；容器若建自轻量镜像则重建。
  if container_exists && [ "$(container_image)" != "$VIEW_IMAGE" ]; then
    echo "Container was built from '$(container_image)'; recreating from '$VIEW_IMAGE' ..."
    docker rm -f "$CONTAINER" >/dev/null
  fi
  if ! docker image inspect "$VIEW_IMAGE" >/dev/null 2>&1; then
    echo "View image missing, building it ..."
    TARGET=view IMAGE="$VIEW_IMAGE" build_image
  fi
  start_container "$VIEW_IMAGE"
  docker exec "$CONTAINER" bash -lc 'bash scripts/desktop.sh' || true
  for _ in $(seq 1 20); do
    sleep 2
    code="$(docker exec "$CONTAINER" bash -lc "curl -s -o /dev/null -w '%{http_code}' http://localhost:$VIEW_PORT/vnc.html" || true)"
    if [ "$code" = "200" ]; then
      echo "noVNC ready -> http://localhost:$VIEW_PORT/vnc.html?autoconnect=1&resize=scale"
      screenshot
      return 0
    fi
  done
  docker exec "$CONTAINER" bash -lc 'tail -n 20 /tmp/websockify.log /tmp/x11vnc.log /tmp/xvfb.log' || true
  echo 'noVNC did not become ready' >&2
  return 1
}

screenshot() {
  local stamp target inside
  mkdir -p "$RUNS"
  stamp="$(date +%Y%m%d-%H%M%S)"
  target="$RUNS/screen-$stamp.png"
  inside="/tmp/screen-$stamp.png"
  docker exec "$CONTAINER" bash -lc "DISPLAY=:99 import -window root $inside" || return 0
  docker cp "$CONTAINER:$inside" "$target" >/dev/null
  docker exec "$CONTAINER" rm -f "$inside" >/dev/null 2>&1 || true
  echo "screenshot -> $target"
}

case "$TASK" in
  build) build_image; echo "Image built -> $IMAGE (target=$TARGET)" ;;
  start) start_container; echo "Container $CONTAINER is running" ;;
  test) run_test ;;
  view) start_view ;;
  shell) start_container; docker exec -it "$CONTAINER" bash ;;
  runs)
    if [ ! -d "$RUNS" ]; then echo 'No runs recorded yet.'; exit 0; fi
    for d in $(ls -1r "$RUNS"); do
      if [ -f "$RUNS/$d/meta.json" ]; then
        printf '%s  ' "$d"
        grep -E '"(exit_code|command)"' "$RUNS/$d/meta.json" | tr -d '\n'
        echo
      else
        echo "$d  (no meta.json)"
      fi
    done
    ;;
  logs) docker logs --tail 200 "$CONTAINER" ;;
  stop) container_exists && docker stop "$CONTAINER" >/dev/null; echo "Container $CONTAINER stopped" ;;
  clean) docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; echo "Container $CONTAINER removed (images and .sandbox-runs kept)" ;;
  *) echo "unknown task: $TASK" >&2; exit 2 ;;
esac
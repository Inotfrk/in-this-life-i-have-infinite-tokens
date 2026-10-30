#!/usr/bin/env bash
# Sandwich runner for macOS / Linux (same behaviour as scripts/sandbox.ps1).
# A long-lived named container is used instead of --rm, so every run can be
# inspected afterwards; each run is recorded under .sandbox-runs/<timestamp>/.
#
# Usage: scripts/sandbox.sh [build|start|test|shell|runs|logs|stop|clean]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${IMAGE:-calculator-sandbox:local}"
CONTAINER="${CONTAINER:-calculator-sandbox}"
COMMAND="${COMMAND:-xvfb-run -a bash scripts/build.sh test}"
RUNS="$ROOT/.sandbox-runs"
TASK="${1:-test}"

container_exists() {
  [ -n "$(docker container ls -a --filter "name=^/${CONTAINER}$" --format '{{.Names}}')" ]
}

build_image() {
  docker build --pull -t "$IMAGE" -f "$ROOT/Dockerfile" "$ROOT"
}

start_container() {
  if ! container_exists; then
    docker run -d --name "$CONTAINER" -v "$ROOT:/workspace" -w /workspace --init "$IMAGE" sleep infinity
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
    printf '  "image": "%s",\n' "$IMAGE"
    printf '  "image_id": "%s",\n' "$(docker image inspect -f '{{.Id}}' "$IMAGE")"
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

case "$TASK" in
  build) build_image ;;
  start) start_container; echo "Container $CONTAINER is running" ;;
  test) run_test ;;
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
  clean) docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; echo "Container $CONTAINER removed (image and .sandbox-runs kept)" ;;
  *) echo "unknown task: $TASK" >&2; exit 2 ;;
esac

#!/usr/bin/env bash
# 把第二层 develop 自动推进到第一层 master（见 AGENTS.md 第 8 节）。
# 用法: scripts/release.sh [--dry-run] [--skip-tests]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE="gitee"
DEV_BRANCH="develop"
REL_BRANCH="master"
DRY_RUN=0
SKIP_TESTS=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --skip-tests) SKIP_TESTS=1 ;;
    *) echo "用法: scripts/release.sh [--dry-run] [--skip-tests]" >&2; exit 1 ;;
  esac
done

START_BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)"
if [[ "$START_BRANCH" == "$REL_BRANCH" || "$START_BRANCH" == "$DEV_BRANCH" ]]; then
  echo "错误：当前在受保护分支 $START_BRANCH 上；先切回第三层工作分支再发布（AGENTS.md 7.7）" >&2
  exit 1
fi

if [[ -n "$(git -C "$ROOT" status --porcelain)" ]]; then
  echo "错误：工作区有未提交改动；先提交或 stash（AGENTS.md 7.6）" >&2
  exit 1
fi

git -C "$ROOT" fetch "$REMOTE" --prune
trap 'git -C "$ROOT" switch "$START_BRANCH" >/dev/null 2>&1 || true' EXIT
git -C "$ROOT" switch "$DEV_BRANCH"
git -C "$ROOT" pull --ff-only "$REMOTE" "$DEV_BRANCH"

if [[ "$SKIP_TESTS" -eq 0 ]]; then
  bash "$ROOT/scripts/build.sh" test
fi

AHEAD="$(git -C "$ROOT" rev-list --count "$REL_BRANCH..$DEV_BRANCH")"
if [[ "$AHEAD" -eq 0 ]]; then
  echo "$DEV_BRANCH 与 $REL_BRANCH 已一致，无需发布"
  git -C "$ROOT" switch "$START_BRANCH"
  exit 0
fi

TAG="v$(date +%Y.%m.%d-%H%M)"
echo "将把 $AHEAD 个提交从 $DEV_BRANCH 推进到 $REL_BRANCH，标签 $TAG"

if [[ "$DRY_RUN" -eq 1 ]]; then
  git -C "$ROOT" --no-pager log --oneline "$REL_BRANCH..$DEV_BRANCH"
  git -C "$ROOT" switch "$START_BRANCH"
  echo "DryRun：未做任何合并与推送"
  exit 0
fi

git -C "$ROOT" switch "$REL_BRANCH"
git -C "$ROOT" pull --ff-only "$REMOTE" "$REL_BRANCH"
git -C "$ROOT" merge --no-ff "$DEV_BRANCH" -m "release: 自动发布 $DEV_BRANCH -> $REL_BRANCH ($TAG)"
git -C "$ROOT" tag -a "$TAG" -m "release $TAG"
git -C "$ROOT" push "$REMOTE" "$REL_BRANCH"
git -C "$ROOT" push "$REMOTE" "$TAG"
git -C "$ROOT" switch "$START_BRANCH"

echo "发布完成：$DEV_BRANCH -> $REL_BRANCH，标签 $TAG"

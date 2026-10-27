#!/usr/bin/env bash
# 把第二层 develop 自动推进到第一层 master（见 AGENTS.md 第 8 节）。
# master / develop 只接受 Pull Request，所以这里改成：推送临时分支 -> 开 PR -> 合并。
# 用法: scripts/release.sh [--dry-run] [--skip-tests]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE="origin"
DEV_BRANCH="develop"
REL_BRANCH="master"
OWNER="Inotfrk"
REPO_NAME="in-this-life-i-have-infinite-tokens"
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

# 发布要走 PR，需要一个有 repo 权限的令牌：优先 GH_TOKEN，其次 git 记住的 github.com 凭据。
if [[ -z "${GH_TOKEN:-}" ]]; then
  GH_TOKEN="$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null \
    | sed -n 's/^password=//p')"
fi
if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "错误：缺少 GitHub 令牌；设置 GH_TOKEN 或先让 git 记住 github.com 凭据" >&2
  exit 1
fi

# 开一个 head -> base 的 PR 并立即合并，然后删掉 head 分支。成功时输出 PR 编号。
open_and_merge_pr() {
  local head="$1" base="$2" title="$3" body="$4"
  local api="https://api.github.com/repos/$OWNER/$REPO_NAME"
  local payload num
  payload="$(printf '{"head":"%s","base":"%s","title":"%s","body":"%s"}' "$head" "$base" "$title" "$body")"
  num="$(curl -fsS -X POST "$api/pulls" \
      -H "Authorization: Bearer $GH_TOKEN" \
      -H 'Accept: application/vnd.github+json' \
      -H 'X-GitHub-Api-Version: 2022-11-28' \
      -d "$payload" | sed -n 's/.*"number":\([0-9]*\).*/\1/p')"
  if [[ -z "$num" ]]; then
    echo "错误：创建 PR $head -> $base 失败" >&2
    exit 1
  fi
  curl -fsS -X PUT "$api/pulls/$num/merge" \
      -H "Authorization: Bearer $GH_TOKEN" \
      -H 'Accept: application/vnd.github+json' \
      -H 'X-GitHub-Api-Version: 2022-11-28' \
      -d '{"merge_method":"merge"}' >/dev/null
  curl -fsS -X DELETE "$api/git/refs/heads/$head" \
      -H "Authorization: Bearer $GH_TOKEN" \
      -H 'Accept: application/vnd.github+json' \
      -H 'X-GitHub-Api-Version: 2022-11-28' >/dev/null || true
  echo "$num"
}

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

HEAD_BRANCH="release/$DEV_BRANCH-to-$REL_BRANCH-$TAG"
git -C "$ROOT" switch -c "$HEAD_BRANCH" "$DEV_BRANCH"
git -C "$ROOT" push "$REMOTE" "$HEAD_BRANCH"
git -C "$ROOT" switch "$DEV_BRANCH"
PR="$(open_and_merge_pr "$HEAD_BRANCH" "$REL_BRANCH" \
  "release: 自动发布 $DEV_BRANCH -> $REL_BRANCH ($TAG)" \
  "由 scripts/release.sh 自动创建，合并后打标签 $TAG。")"
echo "已合并 PR #$PR ($HEAD_BRANCH -> $REL_BRANCH)"

git -C "$ROOT" fetch "$REMOTE" --prune
git -C "$ROOT" tag -a "$TAG" -m "release $TAG" "$REMOTE/$REL_BRANCH"
git -C "$ROOT" push "$REMOTE" "$TAG"

# 合并提交只在 master 上，回合给 develop，否则下次比较会一直有偏移。
if ! git -C "$ROOT" merge-base --is-ancestor "$REMOTE/$REL_BRANCH" "$REMOTE/$DEV_BRANCH"; then
  BACK_BRANCH="release/$REL_BRANCH-to-$DEV_BRANCH-$TAG"
  git -C "$ROOT" switch -c "$BACK_BRANCH" "$DEV_BRANCH"
  # 必须真的把 master 合进来，否则分支与 develop 无差异，PR 会因 No commits 失败。
  git -C "$ROOT" merge --no-ff "$REMOTE/$REL_BRANCH" -m "release: 回合 $REL_BRANCH -> $DEV_BRANCH ($TAG)"
  git -C "$ROOT" push "$REMOTE" "$BACK_BRANCH"
  git -C "$ROOT" switch "$DEV_BRANCH"
  BACK_PR="$(open_and_merge_pr "$BACK_BRANCH" "$DEV_BRANCH" \
    "release: 回合 $REL_BRANCH -> $DEV_BRANCH ($TAG)" \
    '自动发布产生的合并提交只存在于 master，这里回合到 develop，避免两层永久偏移。')"
  echo "已合并 PR #$BACK_PR ($BACK_BRANCH -> $DEV_BRANCH)"
fi

git -C "$ROOT" fetch "$REMOTE" --prune
git -C "$ROOT" pull --ff-only "$REMOTE" "$DEV_BRANCH"
git -C "$ROOT" switch "$START_BRANCH"

echo "发布完成：$DEV_BRANCH -> $REL_BRANCH，标签 $TAG"
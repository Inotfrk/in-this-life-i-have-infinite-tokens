"""本机环境变量文件（.env.local）的极简读取。

为什么需要它：API key 不该写进代码或提交进仓库，但每次都手敲 export 也很烦。
所以约定——仓库根目录的 `.env.local`（已 gitignore、权限 600）放真实的 key，
程序启动时把它补进 `os.environ`；已存在的环境变量优先，不会被文件覆盖。

格式就三行，和 shell 一样：

    WORLDSIM_API_KEY=sk-...
    WORLDSIM_BASE_URL=https://api.deepseek.com/v1
    WORLDSIM_MODEL=deepseek-v4-flash
"""

from __future__ import annotations

import os
from pathlib import Path

DEFAULT_ENV_FILE = Path(__file__).resolve().parent.parent / ".env.local"


def load_env_file(path: Path | None = None, *, override: bool = False) -> dict[str, str]:
    """把 `KEY=VALUE` 补进环境变量，返回实际读到的键值。

    文件不存在就直接返回空字典——没有 key 也能跑离线模型，不该因此报错。
    """

    env_path = path or DEFAULT_ENV_FILE
    if not env_path.is_file():
        return {}

    loaded: dict[str, str] = {}
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if not key:
            continue
        loaded[key] = value
        if override or key not in os.environ:
            os.environ[key] = value
    return loaded

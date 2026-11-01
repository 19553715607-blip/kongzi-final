#!/bin/sh
set -e

# 首次启动：自动生成案例 + 扩展语料（幂等，已有则跳过）
if [ "${KONGZI_AUTO_SEED:-1}" = "1" ]; then
  echo "[entrypoint] auto seed + expand + boost (idempotent)"
  python -m app.generate_cases || true
  python -m app.expand_corpus || true
  python -m app.boost_corpus || true
fi

exec "$@"

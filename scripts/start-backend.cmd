@echo off
REM 孔子平台 · 启动后端（端口 8000）
REM 用法：双击本文件，或在 CMD/PowerShell 里运行 scripts\start-backend.cmd
cd /d "%~dp0..\backend"
if not exist ".venv\Scripts\uvicorn.exe" (
  echo [ERROR] .venv not found. Run these first:
  echo   python -m venv .venv
  echo   .venv\Scripts\pip install -r requirements.txt
  exit /b 1
)

REM ── 强制离线加载模型 ───────────────────────────────────────────
REM 启动时会加载 sentence-transformers 向量模型。默认行为是先向
REM huggingface.co 发 HEAD 请求校验版本，本机模型其实已有缓存：
REM   %USERPROFILE%\.cache\huggingface\hub\models--sentence-transformers--paraphrase-multilingual-MiniLM-L12-v2
REM 一旦网络不通，这一步会 10 秒超时 × 5 次重试，整个启动卡住约 2 分半，
REM 期间前端所有请求失败，页面上表现为「无法连接后端」。
REM 设置离线后直接命中本地缓存，启动通常在 3 秒内完成。
set HF_HUB_OFFLINE=1
set TRANSFORMERS_OFFLINE=1
set HF_HUB_DISABLE_TELEMETRY=1

echo [backend] starting on http://127.0.0.1:8000  (docs: http://127.0.0.1:8000/docs)
".venv\Scripts\uvicorn.exe" app.main:app --port 8000

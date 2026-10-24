"""语录朗读音频 — DashScope qwen-tts 非流式合成 + 本地磁盘缓存。

设计要点：
- 端点按「篇章 id + 语言」在服务端取文本（口径与首页金句面板一致），不接收
  任意文本，避免公开站点被当成免费 TTS 代理刷量。
- 每段文本只合成一次：缓存文件名含文本哈希，译文修订后自动失效重新生成。
- DashScope 返回的是 24 小时有效的 OSS 临时链接，下载落盘后直接以文件响应。
- 同一段音频的并发请求去重合并成一个上游调用（连点、多标签页同时未命中缓存）。
"""
from __future__ import annotations

import asyncio
import hashlib
import struct
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..config import Settings, get_settings
from ..db import get_db
from ..models import Passage

router = APIRouter(prefix="/api/v1/passages", tags=["tts"])

# qwen3-tts-flash 的 language_type 取值；阿拉伯语不在模型支持列表，前端回落浏览器本地语音
LANG_TO_TTS = {"zh": "Chinese", "en": "English", "fr": "French", "es": "Spanish"}

# key → 正在进行的合成任务
_inflight: dict[str, asyncio.Task[None]] = {}


def _speech_text(p: Passage, lang: str) -> str | None:
    """朗读文本口径：中文读原文，其他语言读该语译文（缺失回落英文，再缺失回落原文）。"""
    if lang == "zh":
        return p.original_text
    translations = list(p.translations)
    for target in (lang, "en"):
        for t in translations:
            if t.lang == target and t.text:
                return t.text
    return p.original_text


@router.get("/{ref_id}/audio")
async def passage_audio(
    ref_id: str, lang: str = "zh", db: Session = Depends(get_db)
) -> FileResponse:
    s = get_settings()
    if not s.tts_enabled:
        raise HTTPException(501, "tts disabled")
    if lang not in LANG_TO_TTS:
        raise HTTPException(501, f"unsupported language: {lang}")

    p = db.execute(
        select(Passage)
        .where(Passage.id == ref_id)
        .options(selectinload(Passage.translations))
    ).scalar_one_or_none()
    if not p:
        raise HTTPException(404, f"passage {ref_id} not found")

    text = (_speech_text(p, lang) or "").strip()
    if not text:
        raise HTTPException(404, "no text to synthesize")

    key = hashlib.sha1(f"{ref_id}|{lang}|{text}".encode("utf-8")).hexdigest()[:12]
    cache_dir = Path(s.tts_cache_dir) / "passages"
    cache_dir.mkdir(parents=True, exist_ok=True)
    path = cache_dir / f"{ref_id}_{lang}_{key}.wav"
    if path.exists():
        return FileResponse(path, media_type="audio/wav")

    task = _inflight.get(key)
    if task is None:
        task = asyncio.create_task(_synthesize(text, lang, path, s))
        _inflight[key] = task
        task.add_done_callback(lambda _: _inflight.pop(key, None))
    try:
        await task
    except Exception as e:  # 上游 4xx/5xx/网络问题统一交给前端回落本地语音
        raise HTTPException(502, f"tts upstream error: {e}") from e
    if not path.exists():
        raise HTTPException(502, "tts produced no audio")
    return FileResponse(path, media_type="audio/wav")


def _fix_wav_sizes(raw: bytes) -> bytes:
    """修正 WAV 头里的长度字段。

    DashScope 流式生成的 WAV 其 RIFF/data 长度是流式占位值（约 2 GB），
    与实际字节数不符；严格解析器（如 Python wave、部分浏览器解码器）
    会得到荒谬的时长甚至拒绝播放。这里按真实文件长度重写这两个字段。
    """
    if len(raw) < 12 or raw[:4] != b"RIFF" or raw[8:12] != b"WAVE":
        return raw
    buf = bytearray(raw)
    pos, data_off = 12, -1
    while pos + 8 <= len(buf):
        cid = bytes(buf[pos : pos + 4])
        csize = struct.unpack_from("<I", buf, pos + 4)[0]
        if cid == b"data":
            data_off = pos
            break
        pos += 8 + csize + (csize & 1)  # RIFF 子块按偶数边界对齐
    if data_off < 0:
        return raw
    struct.pack_into("<I", buf, data_off + 4, len(buf) - data_off - 8)
    struct.pack_into("<I", buf, 4, len(buf) - 8)
    return bytes(buf)


async def _synthesize(text: str, lang: str, path: Path, s: Settings) -> None:
    """调 DashScope 非流式 TTS 合成，下载 OSS 临时音频并原子落盘。"""
    body = {
        "model": s.tts_model,
        "input": {
            "text": text[:600],  # 模型单次上限 600 字符
            "voice": s.tts_voice,
            "language_type": LANG_TO_TTS[lang],
        },
    }
    headers = {"Authorization": f"Bearer {s.qwen_api_key}"}
    url = f"{s.tts_base_url}/api/v1/services/aigc/multimodal-generation/generation"
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(url, json=body, headers=headers)
        payload: dict[str, Any] = r.json() if r.content else {}
        if r.status_code != 200 or payload.get("code"):
            raise RuntimeError(f"dashscope {r.status_code} {str(payload)[:200]}")
        audio_url = ((payload.get("output") or {}).get("audio") or {}).get("url")
        if not audio_url:
            raise RuntimeError(f"dashscope no audio url: {str(payload)[:200]}")
        audio = await client.get(audio_url)
        audio.raise_for_status()

    tmp = path.with_suffix(".tmp")
    tmp.write_bytes(_fix_wav_sizes(audio.content))
    tmp.replace(path)

from __future__ import annotations

import json
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Conversation, Message
from ..schemas import ChatRequest
from ..services.orchestrator import run_chat

router = APIRouter(prefix="/api/v1", tags=["chat"])
_chat_calls: dict[str, list[float]] = {}
_CHAT_WINDOW = 60
_CHAT_LIMIT = 10


def _sse(event: str, data: object) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/chat")
async def chat(req: ChatRequest, request: Request, db: Session = Depends(get_db)) -> StreamingResponse:
    """流式对话。返回 text/event-stream，事件：agents/token/citation/verify/followups/done。"""

    now = time.monotonic()
    peer = request.client.host if request.client else "unknown"
    recent = [stamp for stamp in _chat_calls.get(peer, []) if now - stamp < _CHAT_WINDOW]
    if len(_chat_calls) > 5000:
        _chat_calls.clear()
    if len(recent) >= _CHAT_LIMIT:
        raise HTTPException(429, "chat rate limit exceeded; retry in a minute")
    recent.append(now)
    _chat_calls[peer] = recent
    conv_id = req.conversation_id or str(uuid.uuid4())

    async def event_stream():
        final = None
        try:
            async for event, data in run_chat(
                db,
                req.message,
                lang=req.lang,
                device=req.device,
                topic_hint=req.topic_hint,
            ):
                if event == "done":
                    final = data
                yield _sse(event, data)
        except Exception:  # noqa: BLE001
            yield _sse("error", {"message": "The response could not be generated. Please try again."})
            return

        # 持久化会话与消息（best-effort）
        try:
            if not db.get(Conversation, conv_id):
                db.add(Conversation(id=conv_id, user_id=None, mode=req.mode))
            db.add(
                Message(
                    id=str(uuid.uuid4()),
                    conversation_id=conv_id,
                    role="user",
                    content=req.message,
                )
            )
            if final:
                db.add(
                    Message(
                        id=str(uuid.uuid4()),
                        conversation_id=conv_id,
                        role="assistant",
                        content=final.get("answer", ""),
                        citations=final.get("citations", []),
                        verify_scores=final.get("verify_scores", {}),
                        agents_used=final.get("agents_used", []),
                    )
                )
            db.commit()
        except Exception:  # noqa: BLE001
            db.rollback()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Conversation-Id": conv_id,
            "X-Accel-Buffering": "no",  # 关闭 Nginx 缓冲，保证逐字流出
        },
    )

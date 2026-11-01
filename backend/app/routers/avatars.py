"""用户头像：上传（服务端裁切压缩）、公开访问、删除恢复默认。

- 上传统一处理为 256×256 方形 webp：EXIF 转正 → 居中方形裁切 → 缩放。
  前端无需预加工，手机直拍的巨型照片也不会进存储。
- 文件以 user_id 命名，重复上传直接覆盖，天然一对一。
- 访问端点无需登录（头像是公开展示内容），带长缓存头。
"""
from __future__ import annotations

import io
import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, ImageOps
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import User
from ..routers.auth import _user_public
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/v1", tags=["avatars"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_UPLOAD_BYTES = 6 * 1024 * 1024
AVATAR_SIZE = 256
# user_id 由后端生成（uuid 形态），拼接路径前做白名单校验兜底
re_safe = re.compile(r"^[A-Za-z0-9_-]+$")


def _avatar_path(user_id: str) -> Path:
    if not re_safe.match(user_id):
        raise HTTPException(400, "invalid user id")
    d = Path(get_settings().avatars_dir)
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{user_id}.webp"


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, f"unsupported type: {file.content_type}")

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "file too large (max 6MB)")

    try:
        img = Image.open(io.BytesIO(raw))
        img = ImageOps.exif_transpose(img)  # 尊重手机拍照方向
        img = img.convert("RGB")
    except Exception:
        raise HTTPException(400, "not a valid image")

    side = min(img.width, img.height)
    x0 = (img.width - side) // 2
    y0 = (img.height - side) // 2
    img = img.crop((x0, y0, x0 + side, y0 + side)).resize(
        (AVATAR_SIZE, AVATAR_SIZE), Image.LANCZOS
    )

    path = _avatar_path(user.id)
    tmp = path.with_suffix(".tmp")
    img.save(tmp, "WEBP", quality=85, method=6)
    tmp.replace(path)

    user.avatar_url = f"/api/v1/avatars/{user.id}.webp"
    db.commit()
    return _user_public(user)


@router.delete("/me/avatar")
def delete_avatar(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    _avatar_path(user.id).unlink(missing_ok=True)
    user.avatar_url = None
    db.commit()
    return _user_public(user)


@router.get("/avatars/{filename}")
def get_avatar(filename: str) -> FileResponse:
    if not filename.endswith(".webp") or not re_safe.match(filename[: -len(".webp")]):
        raise HTTPException(404)
    path = Path(get_settings().avatars_dir) / filename
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(
        path, media_type="image/webp", headers={"Cache-Control": "public, max-age=86400"}
    )

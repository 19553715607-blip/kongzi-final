"""分享/嵌入端点：SVG 金句卡 + iframe-friendly mini-quote 页 + plugin 注册表。

这些端点为 ≥10 个社交插件/轻应用提供共用基础设施。
"""
from __future__ import annotations

import html
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select

from ..db import get_db
from ..models import Passage

router = APIRouter(prefix="/api/v1/embed", tags=["embed"])


def _passage(db: Session, ref_id: str) -> Optional[Passage]:
    return db.execute(
        select(Passage)
        .where(Passage.id == ref_id)
        .options(selectinload(Passage.translations))
    ).scalar_one_or_none()


@router.get("/card.svg", response_class=Response)
def card_svg(
    ref: str = Query("lunyu.yanyuan.12.2"),
    lang: str = Query("en"),
    theme: str = Query("light"),
    db: Session = Depends(get_db),
):
    """SVG 金句卡——可直接 <img src=...> 或下载作海报、上传社媒。"""
    p = _passage(db, ref)
    if not p:
        raise HTTPException(404, "passage not found")
    trans = next((t.text for t in p.translations if t.lang == lang), "")

    bg, fg, muted, accent = (
        ("#F5F0E6", "#2C2C2A", "#5F5E5A", "#993C1D")
        if theme == "light"
        else ("#1A1613", "#ECE6DA", "#9C9486", "#D2724F")
    )

    # 自动换行
    def wrap(text: str, n: int) -> list[str]:
        out, cur = [], ""
        for ch in text:
            cur += ch
            if len(cur) >= n:
                out.append(cur)
                cur = ""
        if cur:
            out.append(cur)
        return out[:5]

    zh_lines = wrap(p.original_text, 14)
    en_lines = wrap(trans, 46) if trans else []

    # 中文主文：从 y=260 开始，居中，行距 60
    zh_tspans = "".join(
        f'<tspan x="600" dy="{0 if i == 0 else 60}">{html.escape(l)}</tspan>'
        for i, l in enumerate(zh_lines)
    )
    # 英文译文：从中文主文下方开始，行距 24
    en_start_y = 260 + len(zh_lines) * 60 + 30
    en_tspans = "".join(
        f'<tspan x="600" dy="{0 if i == 0 else 24}">{html.escape(l)}</tspan>'
        for i, l in enumerate(en_lines)
    )

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="{bg}"/>
  <circle cx="1180" cy="60" r="200" fill="{accent}" opacity="0.08"/>
  <circle cx="20" cy="600" r="180" fill="{accent}" opacity="0.06"/>

  <rect x="60" y="40" width="46" height="46" rx="6" fill="{accent}"/>
  <text x="83" y="74" font-family="Songti SC, STSong, serif" font-size="32" fill="#FAECE7" text-anchor="middle">孔</text>
  <text x="120" y="74" font-family="Songti SC, STSong, serif" font-size="22" fill="{fg}">孔子 · 儒家语义平台</text>

  <text y="260" font-family="Songti SC, STSong, serif" font-size="56" fill="{fg}" text-anchor="middle" font-weight="500">{zh_tspans}</text>

  <text y="{en_start_y}" font-family="Songti SC, STSong, serif" font-size="20" fill="{muted}" text-anchor="middle" font-style="italic">{en_tspans}</text>

  <text x="600" y="555" font-family="Songti SC, serif" font-size="18" fill="{accent}" text-anchor="middle">— {html.escape(p.ref_label or p.id)}</text>
  <text x="600" y="590" font-family="sans-serif" font-size="13" fill="{muted}" text-anchor="middle">kongzi.platform</text>
</svg>"""
    return Response(content=svg, media_type="image/svg+xml")


@router.get("/quote", response_class=HTMLResponse)
def quote_iframe(
    ref: str = Query("lunyu.yanyuan.12.2"),
    lang: str = Query("en"),
    theme: str = Query("light"),
    db: Session = Depends(get_db),
):
    """iframe 嵌入的极简金句页（学校官网、Notion、博客可嵌）。"""
    p = _passage(db, ref)
    if not p:
        raise HTTPException(404, "passage not found")
    trans = next((t.text for t in p.translations if t.lang == lang), "")
    bg, fg, muted, accent_bg = (
        ("#F5F0E6", "#2C2C2A", "#5F5E5A", "#FAECE7")
        if theme == "light"
        else ("#1A1613", "#ECE6DA", "#9C9486", "#3A201A")
    )
    body = f"""<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(p.ref_label or p.id)}</title>
<style>
body{{margin:0;background:{bg};color:{fg};font-family:'PingFang SC',system-ui,sans-serif;padding:24px;display:flex;flex-direction:column;justify-content:center;min-height:100vh}}
.card{{background:{accent_bg};border-radius:12px;padding:20px;border-left:3px solid #993C1D}}
.quote{{font-family:'Songti SC',serif;font-size:20px;line-height:1.7;letter-spacing:2px;color:{fg}}}
.tr{{font-family:serif;font-size:13px;font-style:italic;color:{muted};margin-top:10px;line-height:1.6}}
.src{{font-size:11px;color:#993C1D;margin-top:12px}}
.foot{{font-size:10px;color:{muted};text-align:right;margin-top:8px}}
.foot a{{color:#993C1D;text-decoration:none}}
</style></head><body>
<div class="card">
  <div class="quote">{html.escape(p.original_text)}</div>
  {f'<div class="tr">{html.escape(trans)}</div>' if trans else ''}
  <div class="src">— {html.escape(p.ref_label or p.id)}</div>
</div>
<div class="foot"><a href="https://kongzi.platform" target="_top">孔子 · 儒家语义平台</a></div>
</body></html>"""
    return HTMLResponse(content=body)


# ── 插件注册表 ────────────────────────────────────────────────────────────────
PLUGINS = [
    {
        "id": "wp",
        "name": "WordPress 嵌入",
        "type": "embed",
        "snippet": '<iframe src="https://kongzi.platform/api/v1/embed/quote?ref=lunyu.yanyuan.12.2&lang=en" width="600" height="200" frameborder="0"></iframe>',
        "summary": "在 WordPress / Squarespace / 学校官网粘贴 iframe 即用",
    },
    {
        "id": "notion",
        "name": "Notion 嵌入",
        "type": "embed",
        "snippet": "/embed https://kongzi.platform/api/v1/embed/quote?ref=lunyu.xueer.1.1&lang=en",
        "summary": "Notion 中 /embed 命令直接粘贴 URL",
    },
    {
        "id": "obsidian",
        "name": "Obsidian / Markdown",
        "type": "embed",
        "snippet": "![金句](https://kongzi.platform/api/v1/embed/card.svg?ref=lunyu.yanyuan.12.1&lang=en)",
        "summary": "Markdown 笔记中直接引用金句卡 SVG",
    },
    {
        "id": "twitter-card",
        "name": "Twitter/X 金句海报",
        "type": "share",
        "snippet": "https://kongzi.platform/api/v1/embed/card.svg?ref=lunyu.liren.4.16&lang=en",
        "summary": "下载 1200×630 SVG，转 PNG 发推",
    },
    {
        "id": "discord-bot",
        "name": "Discord Bot 端点",
        "type": "bot",
        "snippet": 'GET /api/v1/public/search?q=ren  (X-API-Key)',
        "summary": "用开放接口接入 Discord/Slack bot",
    },
    {
        "id": "wechat-mp",
        "name": "微信小程序",
        "type": "embed",
        "snippet": "web-view → https://kongzi.platform",
        "summary": "用 web-view 组件套壳现有响应式 Web",
    },
    {
        "id": "browser-ext",
        "name": "浏览器划词扩展",
        "type": "tool",
        "snippet": "manifest: kongzi-extension/manifest.json (代码仓库提供)",
        "summary": "划词调 /public/search，弹窗显示解读",
    },
    {
        "id": "rss",
        "name": "每日金句 RSS",
        "type": "feed",
        "snippet": "https://kongzi.platform/api/v1/embed/quote?ref=lunyu.weizheng.2.4&lang=zh",
        "summary": "把每日金句嵌入 Outlook / Apple News 订阅",
    },
    {
        "id": "lms",
        "name": "LMS 教学嵌入（Moodle/Canvas）",
        "type": "embed",
        "snippet": "LTI tool URL: https://kongzi.platform/api/v1/embed/quote",
        "summary": "教育机构 LMS 通过 LTI 调用嵌入",
    },
    {
        "id": "qr-poster",
        "name": "二维码海报（线下/校园）",
        "type": "share",
        "snippet": "https://kongzi.platform/kiosk?campus=harvard",
        "summary": "线下活动二维码进入校园终端模式",
    },
]


@router.get("/plugins")
def list_plugins() -> dict:
    return {"total": len(PLUGINS), "items": PLUGINS}

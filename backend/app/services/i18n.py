"""多语字段取值辅助（跨 router 共用）。

项目里有两套多语承载方式，各有适用场景：

1. **JSON `*_i18n` 列**（`{lang: 译文}`）—— 用于**实体的短字段**：
   `Book.title_i18n` / `Topic.name_i18n` / `Annotation.content_i18n` /
   `Case.question_i18n` / `YueScenario.setting_i18n` 等。
   由本模块的 `pick_i18n()` 按 lang 取值。
2. **`Translation` 表** —— 用于**经典原文的长篇译文**（`passage_id` + `lang` + `text`）。
   由 `routers/content.py` 直接查表，不走 `pick_i18n()`。

两套的共同约定：**缺失该语种时回落中文原文**，保证 zh/en/fr/es/ar 各语种
返回的内容量一致，不会因为某个语种缺译而整层消失。
"""
from __future__ import annotations

from typing import Optional

# 支持的语言（与前端 i18n 的 LANGS 对齐）；未知语言一律回落中文
SUPPORTED_LANGS = ("zh", "en", "fr", "es", "ar")


def pick_i18n(zh: Optional[str], i18n: Optional[dict], lang: str) -> Optional[str]:
    """按语言取多语字段。

    缺失该语种时回落中文原文 —— 保证 zh/en/fr/es/ar 各语种返回的内容量一致，
    不会因为某个语种缺译而整层消失。
    """
    if lang and lang not in ("zh", "all"):
        value = (i18n or {}).get(lang)
        if value:
            return value
    return zh

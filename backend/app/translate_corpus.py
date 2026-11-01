"""用千问把占位翻译换成真译。

覆盖三类：
1) 概念定义 4 语占位（`[lang translation pending, AI-assisted]`）
2) 注释 content_i18n 4 语占位（`[modern interpretation, AI-assisted] — context: …`）
3) （可选 --cases）案例 title/question/confucian_answer 4 语

策略
- 直接调 settings 配置的 qwen（同 chat 流程的模型）
- 节流：每条 sleep 0.3-0.6s 避免限速
- 幂等：发现已是真译（不含 placeholder 标记）则跳过
- 断点续传：错误单条 skip，不阻断
- 进度：每 10 条打印
- 标注：保留 ai_generated=True；新加 reviewed_by=None 以便人审
"""
from __future__ import annotations

import argparse
import sys
import time

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from .config import get_settings
from .db import SessionLocal, init_db
from .models import Annotation, Concept, DialogCase

s = get_settings()
LANGS = [
    ("en", "English"),
    ("fr", "Français"),
    ("es", "Español"),
    ("ar", "العربية"),
]

PLACEHOLDER_MARKERS = (
    "translation pending",
    "AI-assisted",
    "context:",
    "[en:",
    "[fr:",
    "[es:",
    "[ar:",
)


def is_placeholder(text: str) -> bool:
    if not text:
        return True
    return any(m in text for m in PLACEHOLDER_MARKERS)


def qwen_translate(zh_text: str, target_label: str, kind: str = "text") -> str:
    """同步调用千问翻译。失败返回空字符串，调用方决定保留占位还是跳过。"""
    if not s.qwen_api_key:
        raise SystemExit("QWEN_API_KEY 未设置")
    sys_prompt = (
        "You are a precise Confucian translator. Translate Chinese to the target language. "
        "Keep philosophical and ritual concepts (Ren, Li, Junzi, etc.) by pinyin in parentheses where helpful. "
        "Preserve the academic register. Return only the translation, no notes."
    )
    user = f"Target language: {target_label}\nText kind: {kind}\nChinese:\n{zh_text}\n\nTranslation:"
    url = f"{s.qwen_base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": s.qwen_model,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
    }
    headers = {"Authorization": f"Bearer {s.qwen_api_key}"}
    try:
        r = httpx.post(url, headers=headers, json=payload, timeout=60)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"  ! qwen err: {e}")
        return ""


def translate_concepts(db: Session, limit: int | None = None) -> int:
    rows = db.execute(select(Concept)).scalars().all()
    if limit:
        rows = rows[:limit]
    done = 0
    for c in rows:
        zh_def = (c.definition or {}).get("zh", "")
        if not zh_def:
            continue
        defn = dict(c.definition or {})
        updated = False
        for code, label in LANGS:
            cur = defn.get(code, "")
            if cur and not is_placeholder(cur):
                continue
            text = qwen_translate(zh_def, label, kind="concept definition")
            if text:
                defn[code] = text
                updated = True
                time.sleep(0.3)
        if updated:
            c.definition = defn
            flag_modified(c, "definition")
            done += 1
            if done % 5 == 0:
                db.commit()
                print(f"  concepts: {done}/{len(rows)}")
    db.commit()
    return done


def translate_annotations(db: Session, limit: int | None = None) -> int:
    rows = db.execute(select(Annotation)).scalars().all()
    if limit:
        rows = rows[:limit]
    done = 0
    for a in rows:
        if not a.content:
            continue
        i18n = dict(a.content_i18n or {})
        updated = False
        for code, label in LANGS:
            cur = i18n.get(code, "")
            if cur and not is_placeholder(cur):
                continue
            text = qwen_translate(a.content, label, kind="commentary on Analects")
            if text:
                i18n[code] = text
                updated = True
                time.sleep(0.3)
        if updated:
            a.content_i18n = i18n
            flag_modified(a, "content_i18n")
            done += 1
            if done % 10 == 0:
                db.commit()
                print(f"  annotations: {done}/{len(rows)}")
    db.commit()
    return done


def translate_cases(db: Session, limit: int | None = None) -> int:
    """翻译案例 question 到 4 种新语言，写入 question_i18n。

    去重：相同 zh question 只调一次千问，后续命中 cache 直接复用。
    并 prewarm cache from 已有真译，断点续传完全幂等。
    """
    rows = db.execute(select(DialogCase)).scalars().all()
    if limit:
        rows = rows[:limit]

    # Prewarm cache：扫所有已翻数据 - {zh_question: {lang: text}}
    cache: dict[str, dict[str, str]] = {}
    for c in db.execute(select(DialogCase)).scalars():
        if c.question_i18n:
            q_norm = (c.question or "").strip()
            if q_norm:
                cache.setdefault(q_norm, {}).update(c.question_i18n)
    print(f"  cache prewarmed: {len(cache)} unique questions with i18n")

    done = 0
    api_calls = 0
    cache_hits = 0
    for c in rows:
        q_norm = (c.question or "").strip()
        if not q_norm:
            continue
        cached = cache.get(q_norm, {})
        i18n = dict(c.question_i18n or {})
        updated = False
        for code, label in LANGS:
            if code in i18n and i18n[code] and not is_placeholder(i18n[code]):
                continue
            # 先查 cache
            if code in cached and cached[code]:
                i18n[code] = cached[code]
                updated = True
                cache_hits += 1
                continue
            # 调 API
            text = qwen_translate(q_norm, label, kind="cross-civilizational dialog question")
            if text:
                i18n[code] = text
                cached[code] = text
                cache.setdefault(q_norm, cached)
                updated = True
                api_calls += 1
                time.sleep(0.3)
        if updated:
            c.question_i18n = i18n
            flag_modified(c, "question_i18n")
            done += 1
            if done % 25 == 0:
                db.commit()
                print(f"  cases: {done}/{len(rows)}  api_calls: {api_calls}  cache_hits: {cache_hits}")
    db.commit()
    print(f"  TOTAL: {done} cases, {api_calls} API calls, {cache_hits} cache hits")
    return done


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--concepts", action="store_true", help="翻译概念定义")
    ap.add_argument("--annos", action="store_true", help="翻译注释 content_i18n")
    ap.add_argument("--cases", action="store_true", help="翻译案例 question (大调用量)")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--all", action="store_true", help="跑 concepts + annos")
    args = ap.parse_args()

    init_db()
    db = SessionLocal()
    try:
        if args.concepts or args.all:
            print(f"[translate] concepts → 千问 ({s.qwen_model})")
            n = translate_concepts(db, args.limit)
            print(f"  done: {n} concepts updated")
        if args.annos or args.all:
            print(f"[translate] annotations → 千问 ({s.qwen_model})")
            n = translate_annotations(db, args.limit)
            print(f"  done: {n} annotations updated")
        if args.cases:
            print(f"[translate] cases → 千问 ({s.qwen_model})")
            n = translate_cases(db, args.limit)
            print(f"  done: {n} cases updated")
    finally:
        db.close()


if __name__ == "__main__":
    main()

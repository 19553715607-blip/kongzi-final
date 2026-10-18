"""LLM 抽象层。

提供统一的 stream 接口，屏蔽不同提供方差异。
- mock：不调用任何外部模型，基于检索证据拼装回答，让全链路零成本跑通。
- openai / anthropic：填入 key 后即可切换为真实模型。

真实接入点都在本文件，业务代码（orchestrator）无需改动。
"""
from __future__ import annotations

import asyncio
import re
from typing import AsyncIterator, List

import httpx

from ..config import get_settings

settings = get_settings()


class LLMClient:
    async def stream(self, system: str, prompt: str) -> AsyncIterator[str]:
        raise NotImplementedError


class MockLLM(LLMClient):
    """基于证据的确定性拼装，不产生幻觉、零成本，用于本地与 CI。"""

    async def stream(self, system: str, prompt: str) -> AsyncIterator[str]:
        # prompt 末尾约定携带 EVIDENCE 段，这里直接复述要点，逐字流式输出
        answer = _compose_from_prompt(prompt)
        for ch in answer:
            await asyncio.sleep(0.004)
            yield ch


async def _stream_openai_compat(
    base_url: str, api_key: str, model: str, system: str, prompt: str
) -> AsyncIterator[str]:
    """OpenAI 兼容流式（OpenAI / 千问 DashScope 都走这一路）。"""
    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"}
    payload = {
        "model": model,
        "stream": True,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    }
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as r:
            async for line in r.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data = line[6:]
                if data == "[DONE]":
                    break
                import json
                try:
                    delta = json.loads(data)["choices"][0]["delta"].get("content")
                except (KeyError, IndexError, ValueError):
                    delta = None
                if delta:
                    yield delta


class OpenAILLM(LLMClient):
    async def stream(self, system: str, prompt: str) -> AsyncIterator[str]:
        async for chunk in _stream_openai_compat(
            settings.openai_base_url,
            settings.openai_api_key,
            settings.openai_model,
            system, prompt,
        ):
            yield chunk


class QwenLLM(LLMClient):
    """通义千问（DashScope 兼容模式）。模型名直接用 qwen-plus / qwen-max 等。"""

    async def stream(self, system: str, prompt: str) -> AsyncIterator[str]:
        async for chunk in _stream_openai_compat(
            settings.qwen_base_url,
            settings.qwen_api_key,
            settings.qwen_model,
            system, prompt,
        ):
            yield chunk


class AnthropicLLM(LLMClient):
    async def stream(self, system: str, prompt: str) -> AsyncIterator[str]:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": settings.anthropic_api_key,
            "anthropic-version": "2023-06-01",
        }
        payload = {
            "model": settings.anthropic_model,
            "max_tokens": 1024,
            "stream": True,
            "system": system,
            "messages": [{"role": "user", "content": prompt}],
        }
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as r:
                async for line in r.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    import json

                    try:
                        evt = json.loads(line[6:])
                    except ValueError:
                        continue
                    if evt.get("type") == "content_block_delta":
                        text = evt.get("delta", {}).get("text")
                        if text:
                            yield text


def get_llm() -> LLMClient:
    provider = settings.llm_provider.lower()
    if provider == "qwen" and settings.qwen_api_key:
        return QwenLLM()
    if provider == "openai" and settings.openai_api_key:
        return OpenAILLM()
    if provider == "anthropic" and settings.anthropic_api_key:
        return AnthropicLLM()
    return MockLLM()


# ── MockLLM 五语拼装 ─────────────────────────────────────────────────────────
# 书名（当前语料仅《论语》；后续扩书时在此追加）
_BOOK_TITLES = {
    "论语": {
        "en": "Analects", "fr": "Entretiens", "es": "Analectas", "ar": "الحوارات",
    },
}
# 章节名 → 拼音（当前 7 章；未命中的章节直接回落原标签）
_CHAPTER_PINYIN = {
    "学而": "Xue Er", "为政": "Wei Zheng", "颜渊": "Yan Yuan",
    "里仁": "Li Ren", "八佾": "Ba Yi", "雍也": "Yong Ye", "述而": "Shu Er",
}
_CHAPTER_AR = {
    "Xue Er": "شويه إر", "Wei Zheng": "ويي جينغ", "Yan Yuan": "يان يوان",
    "Li Ren": "لي رن", "Ba Yi": "با يي", "Yong Ye": "يونغ يه", "Shu Er": "شو إر",
}

# 各语模板：(无证据整句, 开头句, 结尾句)
_TEMPLATES = {
    "zh": (
        "关于「{q}」，我暂时没有在已收录的经典语料中检索到直接对应的原文。建议换个说法，或先到「读一读」浏览相关篇章。",
        "关于「{q}」，依据经典原文可以这样理解：",
        "\n以上解读紧扣原文本义。如需展开传统注疏与现代转化的差异，可以继续追问。",
    ),
    "en": (
        "Regarding \u201c{q}\u201d, I haven't yet found a directly corresponding passage in the collected classics. Try rephrasing the question, or browse the relevant chapters in \u201cRead\u201d.",
        "Regarding \u201c{q}\u201d, here is a reading grounded in the classical text:",
        "\nThis reading stays close to the original meaning. Feel free to ask further to explore how the traditional commentaries differ from modern interpretations.",
    ),
    "fr": (
        "\u00c0 propos de \u00ab {q} \u00bb, je n'ai pas encore trouv\u00e9 de passage correspondant directement dans les classiques recens\u00e9s. Essayez de reformuler, ou parcourez les chapitres concern\u00e9s dans \u00ab Lire \u00bb.",
        "\u00c0 propos de \u00ab {q} \u00bb, voici une lecture fond\u00e9e sur le texte classique :",
        "\nCette lecture reste proche du sens originel. Vous pouvez poursuivre pour explorer l'\u00e9cart entre les commentaires traditionnels et les interpr\u00e9tations modernes.",
    ),
    "es": (
        "Sobre \u00ab{q}\u00bb, a\u00fan no he encontrado un pasaje que corresponda directamente en los cl\u00e1sicos recopilados. Prueba a reformular la pregunta o consulta los cap\u00edtulos relevantes en \u00abLeer\u00bb.",
        "Sobre \u00ab{q}\u00bb, esta es una lectura basada en el texto cl\u00e1sico:",
        "\nEsta lectura se mantiene cerca del sentido original. Puedes preguntar m\u00e1s para explorar la diferencia entre los comentarios tradicionales y las interpretaciones modernas.",
    ),
    "ar": (
        "\u0628\u062e\u0635\u0648\u0635 \u00ab{q}\u00bb\u060c \u0644\u0645 \u0623\u0639\u062b\u0631 \u0628\u0639\u062f \u0639\u0644\u0649 \u0646\u0635 \u064a\u0642\u0627\u0628\u0644\u0647 \u0645\u0628\u0627\u0634\u0631\u0629\u064b \u0641\u064a \u0627\u0644\u0643\u0644\u0627\u0633\u064a\u0643\u064a\u0627\u062a \u0627\u0644\u0645\u064f\u062c\u0645\u0651\u0639\u0629. \u062d\u0627\u0648\u0644 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0635\u064a\u0627\u063a\u0629\u060c \u0623\u0648 \u062a\u0635\u0641\u0651\u062d \u0627\u0644\u0641\u0635\u0648\u0644 \u0630\u0627\u062a \u0627\u0644\u0635\u0644\u0629 \u0641\u064a \u00ab\u0627\u0642\u0631\u0623\u00bb.",
        "\u0628\u062e\u0635\u0648\u0635 \u00ab{q}\u00bb\u060c \u0625\u0644\u064a\u0643 \u0642\u0631\u0627\u0621\u0629 \u062a\u0633\u062a\u0646\u062f \u0625\u0644\u0649 \u0627\u0644\u0646\u0635 \u0627\u0644\u0643\u0644\u0627\u0633\u064a\u0643\u064a:",
        "\u062a\u0638\u0644 \u0647\u0630\u0647 \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u0642\u0631\u064a\u0628\u0629 \u0645\u0646 \u0627\u0644\u0645\u0639\u0646\u0649 \u0627\u0644\u0623\u0635\u0644\u064a. \u064a\u0645\u0643\u0646\u0643 \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0644\u0627\u0633\u062a\u0643\u0634\u0627\u0641 \u0627\u0644\u0641\u0631\u0642 \u0628\u064a\u0646 \u0627\u0644\u0634\u0631\u0648\u062d \u0627\u0644\u062a\u0631\u0627\u062b\u064a\u0629 \u0648\u0627\u0644\u062a\u0641\u0633\u064a\u0631\u0627\u062a \u0627\u0644\u062d\u062f\u064a\u062b\u0629.",
    ),
}

_EV_RE = re.compile(r"^\[(\d+)\]\s*《(.+)》(.*?)(?:\s*/\s*译:\s*(.*))?$")


def _local_ref_label(label: str, lang: str) -> str:
    """把「论语·颜渊·12.1」转成当前语言的篇章标签。"""
    parts = label.split("·")
    if len(parts) < 3:
        return label
    book, chapter, sec = parts[0], parts[1], "·".join(parts[2:])
    book_t = _BOOK_TITLES.get(book, {}).get(lang, book)
    chapter_py = _CHAPTER_PINYIN.get(chapter, chapter)
    if lang == "ar":
        chapter_t = _CHAPTER_AR.get(chapter_py, chapter_py)
        return f"{book_t} · {chapter_t} {sec}"
    return f"{book_t} · {chapter_py} {sec}"


def _compose_from_prompt(prompt: str) -> str:
    """从携带证据的 prompt 中提取问题与证据，按请求语言拼装克制、可溯源的回答。"""
    question = ""
    lang = "zh"
    evidence_lines: List[str] = []
    in_evidence = False
    for line in prompt.splitlines():
        if line.startswith("QUESTION:"):
            question = line[len("QUESTION:"):].strip()
        elif line.startswith("EVIDENCE:"):
            in_evidence = True
        elif in_evidence and line.strip().startswith("["):
            evidence_lines.append(line.strip())
        elif line.startswith("请用 ") and " 作答" in line:
            cand = line[len("请用 "):].split(" ")[0]
            if cand in _TEMPLATES:
                lang = cand

    no_ev, header_t, footer_t = _TEMPLATES.get(lang, _TEMPLATES["zh"])

    if not evidence_lines:
        return no_ev.format(q=question)

    parts = [header_t.format(q=question), ""]
    if lang == "zh":
        parts.extend(evidence_lines[:3])
    else:
        for raw in evidence_lines[:3]:
            m = _EV_RE.match(raw)
            if not m:
                parts.append(raw)
                continue
            num, label, original, translation = m.groups()
            loc_label = _local_ref_label(label, lang)
            if translation:
                parts.append(
                    f"[{num}] *{loc_label}* — {translation} "
                    f"({ {'en':'Chinese original','fr':'original chinois','es':'original chino','ar':'النص الصيني الأصلي'}[lang] }: {original.strip()})"
                )
            else:
                parts.append(f"[{num}] *{loc_label}* — {original.strip()}")
    parts.append(footer_t)
    return "\n".join(parts)

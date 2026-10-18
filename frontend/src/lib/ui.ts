// 复制到剪贴板：优先 navigator.clipboard；非安全上下文（HTTP+IP）回落 textarea + execCommand。
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 回落 */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// 五种语言 → Web Speech BCP-47 语音代码
export const SPEECH_LANG: Record<string, string> = {
  zh: "zh-CN", en: "en-US", fr: "fr-FR", es: "es-ES", ar: "ar-SA",
};
export function speechLang(lang: string): string {
  return SPEECH_LANG[lang] ?? "zh-CN";
}

// 文本朗读（Web Speech API）：返回是否成功发起。
export function speakText(text: string, lang = "zh-CN"): boolean {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

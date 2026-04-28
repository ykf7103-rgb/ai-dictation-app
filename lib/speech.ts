export function speakCantonese(
  text: string,
  rate: number = 0.85
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-HK";
  utterance.rate = rate;
  utterance.pitch = 1.05;

  const voices = window.speechSynthesis.getVoices();
  const cantonese =
    voices.find((v) => v.lang === "zh-HK") ||
    voices.find((v) => v.lang.startsWith("zh-HK")) ||
    voices.find((v) => v.lang.startsWith("zh"));
  if (cantonese) utterance.voice = cantonese;

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function checkSpeechSupport(): {
  supported: boolean;
  hasCantoneseVoice: boolean;
} {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return { supported: false, hasCantoneseVoice: false };
  }
  const voices = window.speechSynthesis.getVoices();
  const hasCantoneseVoice = voices.some((v) => v.lang.startsWith("zh-HK"));
  return { supported: true, hasCantoneseVoice };
}

/**
 * 將標點符號轉做廣東話讀法（畀讀默/背默讀出嚟）
 * 學生聽到「逗號」「句號」等就知要寫返標點。
 *
 * 用 single-pass 正則 replace（避免新加嘅「，」被重覆 replace）。
 */
export function expandPunctuationForSpeech(text: string): string {
  const map: Record<string, string> = {
    "。": "句號",
    "！": "感嘆號",
    "？": "問號",
    "，": "逗號",
    "、": "頓號",
    "；": "分號",
    "：": "冒號",
    "「": "上引號",
    "」": "下引號",
    "『": "上引號",
    "』": "下引號",
    '"': "引號",
    "《": "書名號",
    "》": "書名號",
  };

  // 單次 pass：split + replace
  const expanded = text.replace(
    /[。！？，、；：「」『』《》"]|[─—]{1,3}|……|…/g,
    (m) => {
      if (/[─—]/.test(m)) return ", 破折號, ";
      if (m === "……" || m === "…") return ", 省略號, ";
      return `, ${map[m] || m}, `;
    }
  );

  // 清理：多重 commas / spaces / 開頭結尾標點
  return expanded
    .replace(/[,，]\s*[,，]+/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/^[,，\s]+|[,，\s]+$/g, "")
    .trim();
}

/** 朗讀帶標點嘅版本（讀出每個標點符號） */
export function speakCantoneseWithPunctuation(
  text: string,
  rate: number = 0.65
): SpeechSynthesisUtterance | null {
  return speakCantonese(expandPunctuationForSpeech(text), rate);
}

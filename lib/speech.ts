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

export interface Mnemonic {
  word: string;
  method: string;
}

export interface StoryPayload {
  story: string;
  mnemonics: Mnemonic[];
  imagePrompt: string;
}

export interface WordImage {
  word: string;
  prompt: string;
  imageUrl?: string;
}

export interface WordExplanation {
  word: string;
  partOfSpeech: string; // 動詞 / 名詞 / 形容詞 / 副詞 / 連詞 / etc
  explanation: string; // 詞義 + 理據
  example?: string;
}

export interface AppData {
  words: string[];
  grade: string;
  theme: string;
  story: string;
  mnemonics: Mnemonic[];
  imagePrompt: string;
  imageUrl: string;
  wordImages: WordImage[];
  wordExplanations: WordExplanation[];
}

export const GRADES = ["小一", "小二", "小三", "小四", "小五", "小六"] as const;

export const THEMES = [
  { value: "動物", emoji: "🐾" },
  { value: "校園", emoji: "🏫" },
  { value: "冒險", emoji: "🏔️" },
  { value: "太空", emoji: "🚀" },
  { value: "童話", emoji: "🧚" },
] as const;

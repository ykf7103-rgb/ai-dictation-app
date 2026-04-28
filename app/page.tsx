"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Camera, Image as ImageIcon, BookOpenText, Volume2 } from "lucide-react";
import { useApp } from "./context";
import { GRADES, THEMES } from "@/lib/types";
import { SCHOOL_DICTATIONS, PREGEN_WORD_IMAGES } from "@/lib/school-dictations";
import SchoolHeader from "@/components/SchoolHeader";

const MAX_WORDS = 10;

function parseWords(text: string): string[] {
  return text
    .split(/[,，、；;\s\n]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

async function fileToDataUrl(file: File, maxDim = 1600): Promise<string> {
  // Resize images larger than maxDim to keep request body reasonable
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("圖片載入失敗"));
      img.onload = () => {
        const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("無法處理圖片"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

type Mode = "vocab" | "reading";

export default function Home() {
  const router = useRouter();
  const { setData } = useApp();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("vocab");
  const [input, setInput] = useState("");
  const [grade, setGrade] = useState<string>("小三");
  const [theme, setTheme] = useState<string>("動物");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"" | "story" | "image" | "ocr">("");
  const [error, setError] = useState("");
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [selectedDictId, setSelectedDictId] = useState<string>("");

  // Reading dictation: just pick a passage and go
  const handlePickReadingDictation = (dictId: string) => {
    const d = SCHOOL_DICTATIONS.find((x) => x.id === dictId);
    if (!d) return;
    setData((prev) => ({
      ...prev,
      words: d.vocabulary,
      grade: d.gradeLabel,
      theme: "校園",
      story: d.passage,
      mnemonics: [],
      imagePrompt: d.imagePrompt,
      imageUrl: d.imageUrl || "",
      wordImages: [],
      wordExplanations: [],
    }));
    sessionStorage.setItem("reading-dict-id", d.id);
    router.push("/reading-dictation");
  };

  // Vocab: apply pre-loaded word list from school dictations
  const applySchoolVocab = (dictId: string) => {
    const d = SCHOOL_DICTATIONS.find((x) => x.id === dictId);
    if (!d) return;
    setInput(d.vocabulary.join("、"));
    // 同時更新年級
    const map: Record<string, string> = { "P.2": "小二", "P.3": "小三", "P.4": "小四" };
    if (map[d.grade]) setGrade(map[d.grade]);
    setOcrSuccess(false);
    setError("");
  };

  const words = useMemo(() => parseWords(input), [input]);

  const handleImagePick = async (file: File) => {
    setError("");
    setOcrSuccess(false);
    setLoading(true);
    setStage("ocr");
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/extract-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "辨認失敗");
      const detected: string[] = result.words || [];
      if (detected.length === 0) {
        setError("未能從圖片辨認到生字，請手動輸入或重新拍攝");
      } else {
        // Append (de-duped) + cap to MAX_WORDS
        const existing = parseWords(input);
        const merged = Array.from(new Set([...existing, ...detected])).slice(0, MAX_WORDS);
        setInput(merged.join("、"));
        setOcrSuccess(true);
        if (existing.length + detected.length > MAX_WORDS) {
          setError(`已自動取前 ${MAX_WORDS} 個生字（每次默書最多 ${MAX_WORDS} 個）`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "辨認失敗");
    } finally {
      setLoading(false);
      setStage("");
    }
  };

  const handleGenerate = async () => {
    if (words.length < 1) {
      setError("請至少輸入 1 個生字");
      return;
    }
    if (words.length > MAX_WORDS) {
      setError(`最多 ${MAX_WORDS} 個生字，請刪除多餘嘅`);
      return;
    }
    setError("");
    setLoading(true);

    try {
      // 1. 生成故事 + per-word image prompts
      setStage("story");
      const storyRes = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words, grade, theme }),
      });
      const storyData = await storyRes.json();
      if (!storyRes.ok) throw new Error(storyData.error || "故事生成失敗");

      const wordImagePrompts: { word: string; prompt: string }[] =
        storyData.wordImagePrompts || [];

      // 即刻儲故事 + 套用 pre-generated word card images（學校預設詞語）
      // Pre-gen 嘅詞語直接 set imageUrl，唔需要 call API
      setData({
        words,
        grade,
        theme,
        story: storyData.story,
        mnemonics: storyData.mnemonics || [],
        imagePrompt: storyData.imagePrompt || "",
        imageUrl: "",
        wordImages: wordImagePrompts.map((wp) => ({
          word: wp.word,
          prompt: wp.prompt,
          imageUrl: PREGEN_WORD_IMAGES[wp.word], // pre-gen path or undefined
        })),
        wordExplanations: storyData.wordExplanations || [],
      });

      // 故事插圖：POE Imagen-4-Fast（高質）
      setStage("image");
      const storyImagePromise = fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: storyData.imagePrompt,
          model: "Imagen-4-Fast",
        }),
      })
        .then((r) => r.json())
        .catch(() => ({ imageUrl: "" }));

      // 等故事圖出嚟先 navigate（最重要嘅圖優先）
      const storyImg = await storyImagePromise;
      setData((prev) => ({ ...prev, imageUrl: storyImg.imageUrl || "" }));
      router.push("/learn");

      // 詞語卡圖：每張獨立並行生成 + 內建 retry（最多 2 次重試）
      // 用 FLUX-pro（質素比 schnell 好~7×，但仍比 Imagen-4-Fast 平），更貼合詞語意思
      const generateWithRetry = async (
        prompt: string,
        maxRetries = 2
      ): Promise<string> => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const r = await fetch("/api/generate-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt, model: "FLUX-schnell" }),
            });
            const d = await r.json();
            if (d.imageUrl) return d.imageUrl;
          } catch {}
          // exponential backoff before retry
          if (attempt < maxRetries) {
            await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
          }
        }
        return "";
      };

      // 只為「冇 pre-gen」嘅詞語生成圖片（即家長拍照新增嘅詞語）
      wordImagePrompts.forEach(
        (wp: { word: string; prompt: string }) => {
          if (PREGEN_WORD_IMAGES[wp.word]) return; // 已有 pre-gen，唔再 call API
          generateWithRetry(wp.prompt).then((imageUrl) => {
            if (!imageUrl) return;
            setData((prev) => ({
              ...prev,
              wordImages: prev.wordImages.map((wi) =>
                wi.word === wp.word ? { ...wi, imageUrl } : wi
              ),
            }));
          });
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "錯誤");
    } finally {
      setLoading(false);
      setStage("");
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 md:py-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <SchoolHeader hero />
        <p className="text-center text-sm md:text-base text-gray-600 mb-5">
          讓默書變得好玩又有趣！
        </p>

        {/* Mode picker */}
        <section className="bg-white rounded-2xl shadow-md p-4 mb-4">
          <div className="text-sm font-bold text-gray-700 mb-3">📌 揀默書模式</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("vocab")}
              disabled={loading}
              className={`py-3 px-3 rounded-xl font-bold text-sm md:text-base transition active:scale-95 ${
                mode === "vocab"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Sparkles className="w-4 h-4 inline mr-1" /> 詞語默書
              <div className="text-xs font-normal opacity-90">AI 生成故事 + 圖卡</div>
            </button>
            <button
              onClick={() => setMode("reading")}
              disabled={loading}
              className={`py-3 px-3 rounded-xl font-bold text-sm md:text-base transition active:scale-95 ${
                mode === "reading"
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Volume2 className="w-4 h-4 inline mr-1" /> 智能讀默/背默
              <div className="text-xs font-normal opacity-90">逐句聽聲，隱藏文字</div>
            </button>
          </div>
        </section>

        {/* === MODE: Reading/Recitation === */}
        {mode === "reading" && (
          <section className="bg-white rounded-2xl shadow-md p-5 md:p-6 mb-5">
            <h2 className="text-lg font-bold text-gray-800 mb-1">
              🎧 智能讀默 / 背默
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              揀年級 + 默書範圍，學生可以逐句聽，唔顯示文字。完成後可以核對。
            </p>
            <div className="space-y-2">
              {SCHOOL_DICTATIONS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handlePickReadingDictation(d.id)}
                  className="w-full text-left p-3 bg-gradient-to-r from-emerald-50 to-cyan-50 hover:from-emerald-100 hover:to-cyan-100 border-2 border-emerald-200 rounded-xl transition active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-emerald-800 flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-xs">
                          {d.gradeLabel}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-cyan-200 text-cyan-800 rounded">
                          {d.passageType}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 mt-1">{d.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {d.passage.slice(0, 30)}…
                      </div>
                    </div>
                    <BookOpenText className="w-5 h-5 text-emerald-600 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-400 mt-3 text-center">
              P.5、P.6 範圍只有大綱，暫未支援讀默/背默；如需要請手動加。
            </div>
          </section>
        )}

        {/* === MODE: Vocabulary === Below sections only show in vocab mode === */}
        {mode !== "vocab" ? null : (
        <>
        {/* School preset vocab */}
        <section className="bg-white rounded-2xl shadow-md p-4 mb-4">
          <div className="text-sm font-bold text-gray-700 mb-2">
            📚 從學校默書範圍揀（自動填入詞語）
          </div>
          <select
            value={selectedDictId}
            onChange={(e) => {
              setSelectedDictId(e.target.value);
              if (e.target.value) applySchoolVocab(e.target.value);
            }}
            disabled={loading}
            className="w-full p-3 border-2 border-gray-200 rounded-xl text-base focus:border-purple-400 focus:outline-none bg-white"
          >
            <option value="">— 揀默書範圍 —</option>
            {SCHOOL_DICTATIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.gradeLabel} · {d.label}
              </option>
            ))}
          </select>
          <div className="text-xs text-gray-400 mt-1">
            P.2-P.4 嘅默書範圍。揀完會自動填入下面，可以再修改。
          </div>
        </section>

        {/* Word Input */}
        <section className="bg-white rounded-2xl shadow-md p-5 md:p-6 mb-5">
          <label className="block text-lg font-bold text-gray-800 mb-2">
            ✏️ 輸入默書生字
          </label>

          {/* Photo capture buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => cameraRef.current?.click()}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-100 to-purple-100 hover:from-pink-200 hover:to-purple-200 text-purple-700 font-bold rounded-xl border-2 border-purple-200 active:scale-95 transition disabled:opacity-50"
            >
              <Camera className="w-5 h-5" /> 📷 拍照識別
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 text-cyan-700 font-bold rounded-xl border-2 border-cyan-200 active:scale-95 transition disabled:opacity-50"
            >
              <ImageIcon className="w-5 h-5" /> 從相簿
            </button>
          </div>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImagePick(f);
              e.target.value = "";
            }}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImagePick(f);
              e.target.value = "";
            }}
          />

          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setOcrSuccess(false);
            }}
            placeholder={`用逗號或空格分隔，最多 ${MAX_WORDS} 個生字，例如：\n春天, 花朵, 蝴蝶, 蜜蜂, 池塘\n\n或者用上面個 📷 拍照識別 自動匯入！`}
            className={`w-full p-3 md:p-4 text-lg border-2 rounded-xl focus:outline-none resize-none transition-colors ${
              words.length > MAX_WORDS
                ? "border-rose-400 bg-rose-50 focus:border-rose-500"
                : "border-gray-200 focus:border-purple-400"
            }`}
            rows={5}
            disabled={loading}
          />
          <div className="mt-2 flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`font-bold ${
                  words.length > MAX_WORDS
                    ? "text-rose-600"
                    : words.length === MAX_WORDS
                    ? "text-amber-600"
                    : "text-purple-600"
                }`}
              >
                {words.length} / {MAX_WORDS}
              </span>
              <span className="text-gray-500">個生字</span>
              {ocrSuccess && (
                <span className="text-emerald-600 font-medium">✓ 拍照辨認成功</span>
              )}
            </div>
            {words.length > MAX_WORDS && (
              <span className="text-rose-600 text-xs font-medium">
                超過 {MAX_WORDS} 個！請刪除 {words.length - MAX_WORDS} 個
              </span>
            )}
          </div>
          {words.length > 0 && (
            <div className="text-xs text-gray-400 mt-1 truncate">
              {words.slice(0, 12).join("、")}
              {words.length > 12 ? `… (+${words.length - 12})` : ""}
            </div>
          )}
        </section>

        {/* Settings */}
        <section className="bg-white rounded-2xl shadow-md p-5 md:p-6 mb-5">
          <div className="mb-5">
            <label className="block text-lg font-bold text-gray-800 mb-3">
              📚 年級
            </label>
            <div className="flex flex-wrap gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGrade(g)}
                  disabled={loading}
                  className={`px-4 py-2 rounded-full text-base font-medium transition active:scale-95 ${
                    grade === g
                      ? "bg-purple-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-lg font-bold text-gray-800 mb-3">
              🎨 故事主題
            </label>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  disabled={loading}
                  className={`px-4 py-2 rounded-full text-base font-medium transition active:scale-95 ${
                    theme === t.value
                      ? "bg-amber-400 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t.emoji} {t.value}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || words.length < 1 || words.length > MAX_WORDS}
          className="w-full py-5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin w-6 h-6" />
              施法中…
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              開始施法！生成故事
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-xl text-center font-medium">
            ❌ {error}
          </div>
        )}

        {loading && (
          <div className="mt-6 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="text-7xl inline-block"
            >
              ✨
            </motion.div>
            <p className="text-purple-700 mt-3 text-lg font-bold">
              {stage === "ocr"
                ? "📸 AI 正在識別圖片入面嘅生字…"
                : stage === "story"
                ? "📖 AI 正在創作故事…"
                : stage === "image"
                ? "🎨 AI 正在繪畫故事插圖…"
                : "施法中…"}
            </p>
            <p className="text-gray-500 text-sm">
              {stage === "ocr"
                ? "通常需要 5-10 秒"
                : stage === "image"
                ? "故事插圖約 5-10 秒，詞語小卡會即時顯示"
                : "總共需要約 10-15 秒，請耐心等候"}
            </p>
          </div>
        )}
        </>
        )}

        <footer className="text-center text-gray-400 text-xs mt-10 mb-4">
          Powered by AI · 廣東話朗讀
        </footer>
      </div>
    </div>
  );
}

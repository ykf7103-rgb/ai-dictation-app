"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Camera, Image as ImageIcon } from "lucide-react";
import { useApp } from "./context";
import { GRADES, THEMES } from "@/lib/types";
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

export default function Home() {
  const router = useRouter();
  const { setData } = useApp();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [grade, setGrade] = useState<string>("小三");
  const [theme, setTheme] = useState<string>("動物");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"" | "story" | "image" | "ocr">("");
  const [error, setError] = useState("");
  const [ocrSuccess, setOcrSuccess] = useState(false);

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

      // 即刻儲故事（詞語卡 URL 隨後背景生成）
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
          imageUrl: undefined,
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
      // 每張圖完成立即更新 state（唔等 Promise.all），失敗一張唔影響其他
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

      wordImagePrompts.forEach(
        (wp: { word: string; prompt: string }) => {
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 px-4 py-6 md:py-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <SchoolHeader hero />
        <p className="text-center text-sm md:text-base text-gray-600 mb-6">
          讓默書變得好玩又有趣！
        </p>

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

        <footer className="text-center text-gray-400 text-xs mt-10 mb-4">
          Powered by Claude Sonnet 4.6 + FLUX · 廣東話朗讀
        </footer>
      </div>
    </div>
  );
}

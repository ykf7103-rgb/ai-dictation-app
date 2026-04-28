"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, RotateCcw, Home, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import confetti from "canvas-confetti";
import { useApp } from "../context";
import { speakCantonese } from "@/lib/speech";

// 自動載圖 hook：先試 Pollinations，失敗或 8 秒超時就 fallback 去 POE FLUX-schnell
function useImageWithFallback(initialUrl: string | undefined, prompt: string | undefined) {
  const [src, setSrc] = useState<string | undefined>(initialUrl);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const fallbackTriedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSrc(initialUrl);
    setFailed(false);
    setLoading(false);
    fallbackTriedRef.current = false;
  }, [initialUrl]);

  // 8 秒 timeout：未 onLoad 就觸發 fallback
  useEffect(() => {
    if (!src || fallbackTriedRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!fallbackTriedRef.current) triggerFallback();
    }, 8000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const triggerFallback = async () => {
    if (fallbackTriedRef.current || !prompt) return;
    fallbackTriedRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLoading(true);
    try {
      const r = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: "FLUX-schnell" }),
      });
      const data = await r.json();
      if (data.imageUrl) {
        setSrc(data.imageUrl);
        setFailed(false);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const onLoad = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const onError = () => {
    triggerFallback();
  };

  const manualRetry = () => {
    fallbackTriedRef.current = false;
    setFailed(false);
    triggerFallback();
  };

  return { src, loading, failed, onLoad, onError, manualRetry };
}

export default function WordCardsPage() {
  const router = useRouter();
  const { data } = useApp();
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const [showFinal, setShowFinal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (!data.story || data.wordImages.length === 0)) {
      router.replace("/");
    }
  }, [data.story, data.wordImages.length, router]);

  const total = data.wordImages.length;
  const current = data.wordImages[idx];
  const img = useImageWithFallback(current?.imageUrl, current?.prompt);

  useEffect(() => {
    setRevealed(false);
  }, [idx]);

  if (!current) return null;

  const handleSpeak = () => {
    speakCantonese(current.word, 0.7);
  };

  const handleReveal = () => {
    setRevealed(true);
    setSeen((prev) => new Set(prev).add(idx));
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.55 },
      colors: ["#a855f7", "#ec4899", "#fbbf24"],
    });
  };

  const handleNext = () => {
    if (idx < total - 1) {
      setIdx(idx + 1);
    } else {
      // last card → final
      const fire = (particleRatio: number, opts: confetti.Options) =>
        confetti({
          ...opts,
          origin: { y: 0.6 },
          particleCount: Math.floor(200 * particleRatio),
        });
      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
      setShowFinal(true);
    }
  };

  const handlePrev = () => {
    if (idx > 0) setIdx(idx - 1);
  };

  const handleRestart = () => {
    setIdx(0);
    setSeen(new Set());
    setRevealed(false);
    setShowFinal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 px-4 py-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 text-sm">
          <button
            onClick={() => router.push("/")}
            className="text-gray-500 hover:text-purple-600 flex items-center gap-1"
          >
            <Home className="w-4 h-4" /> 首頁
          </button>
          <div className="font-bold text-purple-700">🎴 詞語卡片默書</div>
          <button
            onClick={() => router.push("/learn")}
            className="text-gray-500 hover:text-purple-600"
          >
            ← 學習
          </button>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
          <div className="flex justify-between items-center mb-2 text-sm">
            <span className="font-bold text-purple-700">
              第 {idx + 1} / {total} 張
            </span>
            <span className="text-gray-500">已睇 {seen.size} 個答案</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-purple-400 to-pink-400 h-full"
              initial={{ width: 0 }}
              animate={{ width: `${((idx + 1) / total) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-3xl shadow-xl overflow-hidden mb-4"
          >
            {/* Image (with auto-fallback to POE FLUX-schnell) */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 relative">
              {img.src && !img.failed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.src}
                  src={img.src}
                  alt="詞語插圖"
                  className="w-full aspect-square object-contain block"
                  onLoad={img.onLoad}
                  onError={img.onError}
                />
              ) : (
                <div className="w-full aspect-square flex flex-col items-center justify-center">
                  {img.failed ? (
                    <>
                      <div className="text-5xl mb-2">🖼️</div>
                      <p className="text-gray-500 text-sm mb-3">圖片載入失敗</p>
                      <button
                        onClick={img.manualRetry}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-bold hover:bg-purple-600 active:scale-95"
                      >
                        🔄 重新載入
                      </button>
                    </>
                  ) : (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="text-5xl mb-2"
                      >
                        🎨
                      </motion.div>
                      <p className="text-purple-600">
                        {img.loading ? "切換高清版本中…" : "圖片繪畫中…"}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">幾秒後自動顯示</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Action area */}
            <div className="p-5">
              {/* Listen button */}
              <button
                onClick={handleSpeak}
                className="w-full mb-3 py-4 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white text-2xl font-bold rounded-2xl shadow-md active:scale-[0.98] transition flex items-center justify-center gap-3"
              >
                <Volume2 className="w-7 h-7" /> 聽呢個詞語
              </button>

              {/* Hint when not revealed */}
              {!revealed && (
                <div className="text-center mb-3 text-gray-600 text-sm">
                  👂 聽幾次，喺紙上寫低你聽到嘅詞語
                </div>
              )}

              {/* Reveal answer */}
              {!revealed ? (
                <button
                  onClick={handleReveal}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-lg font-bold rounded-2xl shadow-md active:scale-[0.98] transition flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" /> 睇答案
                </button>
              ) : (
                <>
                  {/* Big answer reveal */}
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 14 }}
                    className="text-center py-6 mb-3 bg-gradient-to-br from-yellow-50 to-amber-50 border-4 border-amber-200 rounded-2xl"
                  >
                    <div className="text-sm text-amber-700 font-medium mb-1">
                      正確答案
                    </div>
                    <div className="text-6xl md:text-7xl font-black text-purple-700 tracking-wide">
                      {current.word}
                    </div>
                  </motion.div>

                  <button
                    onClick={handleNext}
                    className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-bold rounded-2xl shadow-md active:scale-[0.98] transition flex items-center justify-center gap-2"
                  >
                    {idx < total - 1 ? (
                      <>
                        下一張 <ChevronRight className="w-5 h-5" />
                      </>
                    ) : (
                      <>🏁 完成默書</>
                    )}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Nav between cards */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={handlePrev}
            disabled={idx === 0}
            className="flex items-center gap-1 px-3 py-2 bg-white rounded-xl shadow-sm disabled:opacity-30 text-purple-600 font-medium text-sm"
          >
            <ChevronLeft className="w-4 h-4" /> 上
          </button>
          <div className="flex gap-1 items-center flex-wrap justify-center">
            {data.wordImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-2 rounded-full transition-all ${
                  i === idx
                    ? "bg-purple-600 w-5"
                    : seen.has(i)
                    ? "bg-emerald-400 w-2"
                    : "bg-gray-300 w-2"
                }`}
                title={`第 ${i + 1} 張`}
              />
            ))}
          </div>
          <button
            onClick={handleNext}
            disabled={!revealed && idx === total - 1}
            className="flex items-center gap-1 px-3 py-2 bg-white rounded-xl shadow-sm disabled:opacity-30 text-purple-600 font-medium text-sm"
          >
            下 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Final modal */}
      <AnimatePresence>
        {showFinal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFinal(false)}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5 }}
              transition={{ type: "spring", damping: 18 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="text-7xl mb-3"
              >
                🎉
              </motion.div>
              <div className="text-3xl font-black text-purple-700 mb-2">
                完成晒 {total} 個詞語！
              </div>
              <div className="text-gray-600 text-base mb-6">
                你已經學識晒今次嘅生字，
                <br />
                可以拎出黎再默幾次加深印象 💪
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleRestart}
                  className="py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-1 active:scale-95 transition"
                >
                  <RotateCcw className="w-4 h-4" /> 再試
                </button>
                <button
                  onClick={() => router.push("/learn")}
                  className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold active:scale-95 transition"
                >
                  返學習
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

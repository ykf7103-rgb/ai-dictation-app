"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Check, X, RotateCcw, Home, ChevronLeft, ChevronRight } from "lucide-react";
import confetti from "canvas-confetti";
import { useApp } from "../context";
import { speakCantonese } from "@/lib/speech";

type Status = "answering" | "correct" | "wrong";

export default function WordCardsPage() {
  const router = useRouter();
  const { data } = useApp();
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<Status>("answering");
  const [results, setResults] = useState<Record<number, boolean>>({});
  const [showFinal, setShowFinal] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (!data.story || data.wordImages.length === 0)) {
      router.replace("/");
    }
  }, [data.story, data.wordImages.length, router]);

  const total = data.wordImages.length;
  const current = data.wordImages[idx];
  const correctCount = useMemo(
    () => Object.values(results).filter(Boolean).length,
    [results]
  );
  const stars = total === 0
    ? 0
    : correctCount === total
    ? 3
    : correctCount / total >= 0.6
    ? 2
    : 1;

  useEffect(() => {
    setAnswer("");
    setStatus("answering");
    setImgError(false);
  }, [idx]);

  if (!current) return null;

  const handleSpeak = () => {
    speakCantonese(current.word, 0.7);
  };

  const handleCheck = () => {
    if (!answer.trim()) return;
    const correct = answer.trim() === current.word;
    setStatus(correct ? "correct" : "wrong");
    setResults((prev) => ({ ...prev, [idx]: correct }));

    if (correct) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.55 },
      });
    }
  };

  const handleNext = () => {
    if (idx < total - 1) {
      setIdx(idx + 1);
    } else {
      // Final card
      const finalCorrect = Object.values({ ...results, [idx]: status === "correct" }).filter(Boolean).length;
      if (finalCorrect === total) {
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
      }
      setShowFinal(true);
    }
  };

  const handlePrev = () => {
    if (idx > 0) setIdx(idx - 1);
  };

  const handleRetry = () => {
    setIdx(0);
    setResults({});
    setShowFinal(false);
    setStatus("answering");
    setAnswer("");
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
          <div className="font-bold text-purple-700">🎴 詞語卡片</div>
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
            <span className="font-bold text-purple-700">第 {idx + 1} / {total} 張</span>
            <span className="text-gray-500">已答對 {correctCount}</span>
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
            {/* Image */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50">
              {current.imageUrl && !imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.imageUrl}
                  alt={current.word}
                  className="w-full aspect-square object-contain block"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full aspect-square flex flex-col items-center justify-center">
                  {imgError ? (
                    <>
                      <div className="text-5xl mb-2">🖼️</div>
                      <p className="text-gray-500 text-sm">圖片暫時載入失敗</p>
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
                      <p className="text-purple-600">圖片繪畫中…</p>
                      <p className="text-gray-400 text-xs mt-1">幾秒後自動顯示</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Sound + Input */}
            <div className="p-5">
              {/* 聽聲按鈕 */}
              <button
                onClick={handleSpeak}
                className="w-full mb-4 py-4 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white text-2xl font-bold rounded-2xl shadow-md active:scale-[0.98] transition flex items-center justify-center gap-3"
              >
                <Volume2 className="w-7 h-7" /> 聽呢個詞語
              </button>

              {/* Answer input */}
              <div className="mb-3">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ✏️ 寫低你聽到嘅詞語：
                </label>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && status === "answering") handleCheck();
                  }}
                  disabled={status !== "answering"}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="響度打字…"
                  className={`w-full px-4 py-3 text-2xl text-center font-bold border-2 rounded-xl focus:outline-none transition ${
                    status === "correct"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : status === "wrong"
                      ? "border-rose-500 bg-rose-50 text-rose-700"
                      : "border-gray-300 focus:border-purple-400"
                  }`}
                />
              </div>

              {/* Feedback */}
              {status === "correct" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-emerald-600 font-bold mb-3"
                >
                  <Check className="w-8 h-8 inline" /> 完全正確！
                </motion.div>
              )}
              {status === "wrong" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-3"
                >
                  <X className="w-8 h-8 inline text-rose-500" />
                  <span className="text-rose-600 font-bold ml-1">錯啦</span>
                  <div className="text-gray-700 mt-1">
                    正確答案：
                    <span className="font-black text-2xl text-purple-700 ml-2">
                      {current.word}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Action */}
              {status === "answering" ? (
                <button
                  onClick={handleCheck}
                  disabled={!answer.trim()}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-lg font-bold rounded-2xl shadow-md active:scale-[0.98] transition disabled:opacity-50"
                >
                  ✅ 核對答案
                </button>
              ) : (
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
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Nav between cards */}
        <div className="flex justify-between mb-4">
          <button
            onClick={handlePrev}
            disabled={idx === 0}
            className="flex items-center gap-1 px-4 py-2 bg-white rounded-xl shadow-sm disabled:opacity-30 text-purple-600 font-medium"
          >
            <ChevronLeft className="w-4 h-4" /> 上一張
          </button>
          <div className="flex gap-1 items-center">
            {data.wordImages.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === idx
                    ? "bg-purple-600 w-4"
                    : results[i] === true
                    ? "bg-emerald-400"
                    : results[i] === false
                    ? "bg-rose-400"
                    : "bg-gray-300"
                } transition-all`}
              />
            ))}
          </div>
          <button
            onClick={handleNext}
            disabled={status === "answering"}
            className="flex items-center gap-1 px-4 py-2 bg-white rounded-xl shadow-sm disabled:opacity-30 text-purple-600 font-medium"
          >
            下一張 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Final result modal */}
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
                {stars === 3 ? "🎉" : stars === 2 ? "👍" : "💪"}
              </motion.div>
              <div className="text-4xl font-black text-purple-700 mb-2">
                {correctCount} / {total}
              </div>
              <div className="text-4xl mb-4 tracking-wider">
                {"⭐".repeat(stars)}
                <span className="text-gray-300">{"☆".repeat(3 - stars)}</span>
              </div>
              <div className="text-gray-700 text-lg mb-6">
                {stars === 3
                  ? "全部答啱！你係詞語小專家！🌟"
                  : stars === 2
                  ? "好叻！繼續加油！"
                  : "再嚟一次一定更好！"}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleRetry}
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

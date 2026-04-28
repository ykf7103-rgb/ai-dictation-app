"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, RotateCcw, Home, Volume2 } from "lucide-react";
import confetti from "canvas-confetti";
import { useApp } from "../context";
import { speakCantonese } from "@/lib/speech";
import SchoolHeader from "@/components/SchoolHeader";

interface Segment {
  type: "text" | "blank";
  content: string;
  word?: string;
}

export default function DictationPage() {
  const router = useRouter();
  const { data } = useApp();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, "correct" | "wrong"> | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !data.story) {
      router.replace("/");
    }
  }, [data.story, router]);

  const segments = useMemo<Segment[]>(() => {
    if (!data.story || data.words.length === 0) return [];
    const sortedWords = [...data.words].sort((a, b) => b.length - a.length);
    const segs: Segment[] = [];
    let cursor = data.story;

    while (cursor.length > 0) {
      let earliestIdx = -1;
      let earliestWord = "";
      for (const w of sortedWords) {
        const idx = cursor.indexOf(w);
        if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
          earliestIdx = idx;
          earliestWord = w;
        }
      }

      if (earliestIdx === -1) {
        segs.push({ type: "text", content: cursor });
        break;
      }

      if (earliestIdx > 0) {
        segs.push({ type: "text", content: cursor.slice(0, earliestIdx) });
      }
      segs.push({ type: "blank", content: "", word: earliestWord });
      cursor = cursor.slice(earliestIdx + earliestWord.length);
    }
    return segs;
  }, [data.story, data.words]);

  const blankIndices = useMemo(
    () => segments.map((s, i) => (s.type === "blank" ? i : -1)).filter((i) => i !== -1),
    [segments]
  );

  const speakSentenceFor = (idx: number) => {
    const punctuationRe = /[。！？.!?]/;
    let start = idx;
    while (start > 0) {
      const seg = segments[start - 1];
      if (seg.type === "text" && punctuationRe.test(seg.content)) break;
      start--;
    }
    let end = idx;
    while (end < segments.length - 1) {
      const seg = segments[end];
      if (seg.type === "text" && punctuationRe.test(seg.content)) break;
      end++;
    }

    let sentence = "";
    for (let i = start; i <= end; i++) {
      const seg = segments[i];
      sentence += seg.type === "blank" ? seg.word || "" : seg.content;
    }
    speakCantonese(sentence.trim(), 0.7);
  };

  const handleChange = (idx: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [idx]: value }));
  };

  const handleSubmit = () => {
    const r: Record<number, "correct" | "wrong"> = {};
    blankIndices.forEach((idx) => {
      const expected = segments[idx].word || "";
      const got = (answers[idx] || "").trim();
      r[idx] = got === expected ? "correct" : "wrong";
    });
    setResults(r);

    const correct = Object.values(r).filter((v) => v === "correct").length;
    const total = blankIndices.length;

    if (correct === total && total > 0) {
      const fire = (particleRatio: number, opts: confetti.Options) =>
        confetti({
          ...opts,
          origin: { y: 0.7 },
          particleCount: Math.floor(200 * particleRatio),
        });
      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    }

    setTimeout(() => setShowResult(true), 800);
  };

  const handleRetry = () => {
    setAnswers({});
    setResults(null);
    setShowResult(false);
  };

  if (!data.story) return null;

  const correct = results ? Object.values(results).filter((v) => v === "correct").length : 0;
  const total = blankIndices.length;
  const stars = total === 0 ? 0 : correct === total ? 3 : correct / total >= 0.6 ? 2 : 1;
  const allFilled = blankIndices.every((idx) => (answers[idx] || "").trim().length > 0);

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-2xl mx-auto">
        {/* School header */}
        <SchoolHeader />

        {/* Page nav */}
        <div className="flex items-center justify-between mb-5 text-sm md:text-base">
          <button
            onClick={() => router.push("/learn")}
            className="text-gray-500 hover:text-purple-600 flex items-center gap-1"
          >
            <Home className="w-4 h-4" /> 返回學習
          </button>
          <div className="font-bold text-purple-700">📝 默書測試</div>
          <div className="w-16"></div>
        </div>

        {/* Title card */}
        <div className="bg-white rounded-2xl shadow-md p-5 md:p-6 mb-5">
          <h2 className="text-2xl font-bold text-center text-purple-700 mb-1">
            ✏️ 默書大挑戰
          </h2>
          <p className="text-center text-gray-500 text-sm mb-4">
            填入正確嘅生字（{total} 個空格）
          </p>

          <div className="text-lg md:text-2xl leading-loose">
            {segments.map((seg, idx) => {
              if (seg.type === "text") {
                return (
                  <span key={idx} className="text-gray-800">
                    {seg.content}
                  </span>
                );
              }
              const r = results?.[idx];
              const word = seg.word || "";
              const wordWidth = `${Math.max(2, word.length) * 1.6}em`;
              return (
                <span key={idx} className="inline-flex items-center gap-1 mx-0.5 align-middle whitespace-nowrap">
                  <button
                    onClick={() => speakSentenceFor(idx)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700 text-sm shrink-0"
                    title="聽呢句"
                    aria-label="聽呢句"
                  >
                    🔊
                  </button>
                  <input
                    type="text"
                    value={answers[idx] || ""}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    disabled={!!results}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className={`inline-block text-center font-bold border-b-2 bg-transparent focus:outline-none px-1 py-0.5 transition-colors ${
                      r === "correct"
                        ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                        : r === "wrong"
                        ? "border-rose-500 text-rose-700 bg-rose-50"
                        : "border-dashed border-gray-400 focus:border-purple-500"
                    }`}
                    style={{ width: wordWidth, minWidth: "3em" }}
                  />
                  {r === "correct" && <Check className="w-5 h-5 text-emerald-500 inline shrink-0" />}
                  {r === "wrong" && (
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <X className="w-5 h-5 text-rose-500 inline" />
                      <span className="text-sm md:text-base text-rose-600 font-semibold">→ {word}</span>
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>

        {/* Action button */}
        {!results ? (
          <button
            onClick={handleSubmit}
            disabled={!allFilled}
            className="w-full py-5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            ✅ 核對答案！
            {!allFilled && <span className="text-sm font-normal opacity-75">（請先填晒所有空格）</span>}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleRetry}
              className="py-4 bg-purple-500 hover:bg-purple-600 text-white text-lg font-bold rounded-2xl shadow-md active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" /> 再試一次
            </button>
            <button
              onClick={() => router.push("/learn")}
              className="py-4 bg-white hover:bg-gray-50 text-purple-600 border-2 border-purple-300 text-lg font-bold rounded-2xl shadow-md active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" /> 返學習
            </button>
          </div>
        )}

        <div className="h-8" />
      </div>

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && results && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowResult(false)}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
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
                {correct} / {total}
              </div>
              <div className="text-4xl mb-4 tracking-wider">
                {"⭐".repeat(stars)}
                <span className="text-gray-300">{"☆".repeat(3 - stars)}</span>
              </div>
              <div className="text-gray-700 text-lg mb-6">
                {stars === 3
                  ? "滿分！你係默書小專家！🌟"
                  : stars === 2
                  ? "做得好！繼續努力就更好！💪"
                  : "唔緊要，再試一次一定會更好！"}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleRetry}
                  className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold active:scale-95 transition"
                >
                  再試一次
                </button>
                <button
                  onClick={() => setShowResult(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold active:scale-95 transition"
                >
                  關閉
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

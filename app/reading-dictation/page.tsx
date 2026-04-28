"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Eye, EyeOff, RotateCcw, Home } from "lucide-react";
import { speakCantoneseWithPunctuation, stopSpeech } from "@/lib/speech";
import { SCHOOL_DICTATIONS, splitSentences } from "@/lib/school-dictations";
import SchoolHeader from "@/components/SchoolHeader";

export default function ReadingDictationPage() {
  const router = useRouter();
  const [dictId, setDictId] = useState<string | null>(null);
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = sessionStorage.getItem("reading-dict-id");
    if (id && SCHOOL_DICTATIONS.find((d) => d.id === id)) {
      setDictId(id);
    } else {
      router.replace("/");
    }
    return () => stopSpeech();
  }, [router]);

  const dict = useMemo(
    () => SCHOOL_DICTATIONS.find((d) => d.id === dictId),
    [dictId]
  );

  const sentences = useMemo(
    () => (dict ? splitSentences(dict.passage) : []),
    [dict]
  );

  if (!dict) return null;

  const speakSentence = (text: string, idx: number) => {
    stopSpeech();
    if (speakingIdx === idx) {
      setSpeakingIdx(null);
      return;
    }
    const u = speakCantoneseWithPunctuation(text, 0.65);
    if (u) {
      setSpeakingIdx(idx);
      u.onend = () => setSpeakingIdx(null);
      u.onerror = () => setSpeakingIdx(null);
    }
  };

  const toggleReveal = (idx: number) => {
    setRevealedSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const revealAll = () => setRevealedSet(new Set(sentences.map((_, i) => i)));
  const hideAll = () => setRevealedSet(new Set());

  const speakAll = async () => {
    stopSpeech();
    for (let i = 0; i < sentences.length; i++) {
      await new Promise<void>((resolve) => {
        const u = speakCantoneseWithPunctuation(sentences[i], 0.65);
        setSpeakingIdx(i);
        if (u) {
          u.onend = () => resolve();
          u.onerror = () => resolve();
        } else {
          resolve();
        }
      });
      await new Promise((r) => setTimeout(r, 600));
    }
    setSpeakingIdx(null);
  };

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <SchoolHeader />

        {/* Page nav */}
        <div className="flex items-center justify-between mb-4 text-sm">
          <button
            onClick={() => router.push("/")}
            className="text-gray-500 hover:text-emerald-700 flex items-center gap-1"
          >
            <Home className="w-4 h-4" /> 重新揀範圍
          </button>
          <div className="font-bold text-emerald-700">
            🎧 {dict.passageType === "讀默" ? "智能讀默" : "智能背默"}
          </div>
          <div className="w-20"></div>
        </div>

        {/* Title + image */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-4">
          {dict.imageUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dict.imageUrl}
              alt="課文插圖"
              className="w-full h-auto block"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full aspect-[4/3] bg-gradient-to-br from-emerald-100 to-cyan-100 flex items-center justify-center">
              <div className="text-5xl">🎨</div>
            </div>
          )}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-xs font-bold">
                {dict.gradeLabel}
              </span>
              <span className="px-2 py-0.5 bg-cyan-200 text-cyan-800 rounded text-xs font-bold">
                {dict.passageType}
              </span>
              {dict.date && (
                <span className="text-xs text-gray-500">默書日期：{dict.date}</span>
              )}
            </div>
            <div className="text-sm text-gray-700">{dict.label}</div>
          </div>
        </div>

        {/* Vocab (always visible) */}
        <details className="bg-white rounded-2xl shadow-md p-4 mb-4">
          <summary className="cursor-pointer font-bold text-purple-700 select-none">
            📝 詞語表（{dict.vocabulary.length} 個）
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {dict.vocabulary.map((w, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-purple-50 border border-purple-200 text-purple-800 rounded-full text-sm font-medium"
              >
                {i + 1}. {w}
              </span>
            ))}
          </div>
        </details>

        {/* Action bar */}
        <div className="bg-white rounded-2xl shadow-md p-3 mb-4 grid grid-cols-3 gap-2">
          <button
            onClick={speakAll}
            className="py-2 bg-amber-400 hover:bg-amber-500 text-white text-sm font-bold rounded-xl active:scale-95 flex items-center justify-center gap-1"
          >
            <Volume2 className="w-4 h-4" /> 一次過聽晒
          </button>
          {revealedSet.size === sentences.length ? (
            <button
              onClick={hideAll}
              className="py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-bold rounded-xl active:scale-95 flex items-center justify-center gap-1"
            >
              <EyeOff className="w-4 h-4" /> 全部隱藏
            </button>
          ) : (
            <button
              onClick={revealAll}
              className="py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl active:scale-95 flex items-center justify-center gap-1"
            >
              <Eye className="w-4 h-4" /> 全部顯示
            </button>
          )}
          <button
            onClick={() => {
              hideAll();
              stopSpeech();
              setSpeakingIdx(null);
            }}
            className="py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl active:scale-95 flex items-center justify-center gap-1"
          >
            <RotateCcw className="w-4 h-4" /> 重新開始
          </button>
        </div>

        {/* Sentences (hidden by default) */}
        <div className="space-y-3 mb-6">
          {sentences.map((s, idx) => {
            const revealed = revealedSet.has(idx);
            const speaking = speakingIdx === idx;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-white rounded-2xl shadow-md p-4 border-2 transition-colors ${
                  speaking
                    ? "border-amber-400 bg-amber-50"
                    : revealed
                    ? "border-emerald-300"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-gray-500">第 {idx + 1} 句</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => speakSentence(s, idx)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-bold transition active:scale-95 ${
                        speaking
                          ? "bg-rose-500 text-white"
                          : "bg-amber-400 hover:bg-amber-500 text-white"
                      }`}
                    >
                      {speaking ? (
                        <>
                          <VolumeX className="w-4 h-4" /> 停
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" /> 讀出
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => toggleReveal(idx)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-bold transition active:scale-95 ${
                        revealed
                          ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          : "bg-emerald-500 hover:bg-emerald-600 text-white"
                      }`}
                    >
                      {revealed ? (
                        <>
                          <EyeOff className="w-4 h-4" /> 隱藏
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" /> 顯示
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div
                  className={`text-lg md:text-xl leading-relaxed text-gray-800 ${
                    revealed ? "" : "select-none"
                  }`}
                >
                  {revealed ? (
                    s
                  ) : (
                    <span className="inline-block py-3 px-4 bg-gray-100 rounded-xl text-gray-400 italic">
                      🔒 文字隱藏中 · 按「讀出」聽聲，喺紙上默寫，再按「顯示」核對
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <button
          onClick={() => router.push("/")}
          className="w-full py-4 bg-white hover:bg-gray-50 text-emerald-700 border-2 border-emerald-300 font-bold rounded-2xl shadow-md active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" /> 返首頁揀其他默書
        </button>

        <div className="h-8" />
      </div>
    </div>
  );
}

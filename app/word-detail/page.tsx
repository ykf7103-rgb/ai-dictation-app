"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  Home,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { useApp } from "../context";
import { speakCantonese } from "@/lib/speech";
import SchoolHeader from "@/components/SchoolHeader";

const POS_COLORS: Record<string, string> = {
  動詞: "bg-rose-100 text-rose-700 border-rose-300",
  名詞: "bg-sky-100 text-sky-700 border-sky-300",
  形容詞: "bg-amber-100 text-amber-700 border-amber-300",
  副詞: "bg-emerald-100 text-emerald-700 border-emerald-300",
  連詞: "bg-purple-100 text-purple-700 border-purple-300",
  量詞: "bg-orange-100 text-orange-700 border-orange-300",
  代詞: "bg-cyan-100 text-cyan-700 border-cyan-300",
  介詞: "bg-pink-100 text-pink-700 border-pink-300",
  嘆詞: "bg-yellow-100 text-yellow-700 border-yellow-300",
  助詞: "bg-gray-100 text-gray-700 border-gray-300",
};

export default function WordDetailPage() {
  const router = useRouter();
  const { data, setData } = useApp();
  const [idx, setIdx] = useState(0);
  const [imgError, setImgError] = useState(false);
  const onDemandRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== "undefined" && (!data.story || data.wordImages.length === 0)) {
      router.replace("/");
    }
  }, [data.story, data.wordImages.length, router]);

  const total = data.wordImages.length;
  const currentImg = data.wordImages[idx];
  const currentExp = useMemo(
    () =>
      (data.wordExplanations ?? []).find((e) => e.word === currentImg?.word) || {
        word: currentImg?.word || "",
        partOfSpeech: "",
        explanation: "",
        example: undefined,
      },
    [data.wordExplanations, currentImg?.word]
  );

  useEffect(() => {
    setImgError(false);
  }, [idx]);

  // On-demand 生成圖片（如果未有）
  useEffect(() => {
    if (!currentImg || currentImg.imageUrl || onDemandRef.current.has(currentImg.word)) return;
    onDemandRef.current.add(currentImg.word);
    (async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: currentImg.prompt, model: "FLUX-schnell" }),
          });
          const d = await r.json();
          if (d.imageUrl) {
            setData((prev) => ({
              ...prev,
              wordImages: prev.wordImages.map((wi) =>
                wi.word === currentImg.word ? { ...wi, imageUrl: d.imageUrl } : wi
              ),
            }));
            return;
          }
        } catch {}
        await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
      }
    })();
  }, [currentImg, setData]);

  if (!currentImg) return null;

  const speakWord = () => speakCantonese(currentImg.word, 0.7);
  const speakExample = () => {
    if (currentExp.example) speakCantonese(currentExp.example, 0.85);
  };

  const goPrev = () => idx > 0 && setIdx(idx - 1);
  const goNext = () => idx < total - 1 && setIdx(idx + 1);

  const posColor =
    POS_COLORS[currentExp.partOfSpeech] || "bg-gray-100 text-gray-700 border-gray-300";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 px-4 py-6">
      <div className="max-w-md mx-auto">
        {/* School header */}
        <SchoolHeader />

        {/* Page nav */}
        <div className="flex items-center justify-between mb-4 text-sm">
          <button
            onClick={() => router.push("/learn")}
            className="text-gray-500 hover:text-purple-600 flex items-center gap-1"
          >
            <Home className="w-4 h-4" /> 返回學習
          </button>
          <div className="font-bold text-purple-700 flex items-center gap-1">
            <BookOpen className="w-4 h-4" /> 詞語解釋
          </div>
          <div className="w-16"></div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl shadow-md p-3 mb-4">
          <div className="flex justify-between items-center mb-2 text-sm">
            <span className="font-bold text-purple-700">
              第 {idx + 1} / {total} 個詞語
            </span>
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
              {currentImg.imageUrl && !imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentImg.imageUrl}
                  alt={currentImg.word}
                  className="w-full aspect-square object-contain block"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full aspect-square flex flex-col items-center justify-center">
                  {imgError ? (
                    <>
                      <div className="text-5xl mb-2">🖼️</div>
                      <p className="text-gray-500 text-sm mb-3">圖片載入失敗</p>
                      <button
                        onClick={() => {
                          setImgError(false);
                          onDemandRef.current.delete(currentImg.word);
                          setData((prev) => ({
                            ...prev,
                            wordImages: prev.wordImages.map((wi) =>
                              wi.word === currentImg.word ? { ...wi, imageUrl: undefined } : wi
                            ),
                          }));
                        }}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-bold hover:bg-purple-600 active:scale-95"
                      >
                        🔄 重新生成
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
                      <p className="text-purple-600">圖片生成中…</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-5">
              {/* Word + listen */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-5xl md:text-6xl font-black text-purple-700 leading-none">
                  {currentImg.word}
                </div>
                <button
                  onClick={speakWord}
                  className="w-12 h-12 bg-amber-400 hover:bg-amber-500 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition shrink-0"
                  title="朗讀詞語"
                  aria-label="朗讀詞語"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {/* Part of speech badge */}
              {currentExp.partOfSpeech && (
                <div className="mb-3">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-bold border-2 ${posColor}`}
                  >
                    {currentExp.partOfSpeech}
                  </span>
                </div>
              )}

              {/* Explanation */}
              {currentExp.explanation && (
                <div className="mb-3">
                  <div className="text-xs text-gray-500 font-medium mb-1">
                    📖 詞義 + 理據
                  </div>
                  <p className="text-base md:text-lg text-gray-800 leading-relaxed">
                    {currentExp.explanation}
                  </p>
                </div>
              )}

              {/* Example */}
              {currentExp.example && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-xs text-amber-700 font-medium">
                      ✏️ 例句
                    </div>
                    <button
                      onClick={speakExample}
                      className="text-amber-700 hover:text-amber-900"
                      title="朗讀例句"
                      aria-label="朗讀例句"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-base text-gray-800 leading-relaxed">
                    {currentExp.example}
                  </p>
                </div>
              )}

              {!currentExp.partOfSpeech && !currentExp.explanation && (
                <div className="text-center text-gray-400 text-sm py-4">
                  詞語解釋資料載入中…
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between items-center gap-2 mb-4">
          <button
            onClick={goPrev}
            disabled={idx === 0}
            className="flex items-center gap-1 px-4 py-3 bg-white rounded-xl shadow-sm disabled:opacity-30 text-purple-600 font-bold flex-1 justify-center"
          >
            <ChevronLeft className="w-5 h-5" /> 上一個
          </button>
          <button
            onClick={goNext}
            disabled={idx === total - 1}
            className="flex items-center gap-1 px-4 py-3 bg-white rounded-xl shadow-sm disabled:opacity-30 text-purple-600 font-bold flex-1 justify-center"
          >
            下一個 <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dot indicator + jump */}
        <div className="flex gap-1 items-center justify-center mb-6 flex-wrap">
          {data.wordImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-2 rounded-full transition-all ${
                i === idx ? "bg-purple-600 w-5" : "bg-gray-300 w-2 hover:bg-gray-400"
              }`}
              title={`第 ${i + 1} 個`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Pencil, Save, ArrowRight } from "lucide-react";
import { useApp } from "../context";
import { speakCantonese, stopSpeech } from "@/lib/speech";
import SchoolHeader from "@/components/SchoolHeader";

export default function LearnPage() {
  const router = useRouter();
  const { data, setData } = useApp();
  const [speaking, setSpeaking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !data.story) {
      router.replace("/");
    }
  }, [data.story, router]);

  const highlightedStory = useMemo<ReactNode[]>(() => {
    if (!data.story || data.words.length === 0) return [data.story];
    const sorted = [...data.words].sort((a, b) => b.length - a.length);
    let parts: (string | ReactNode)[] = [data.story];

    for (const word of sorted) {
      const next: (string | ReactNode)[] = [];
      parts.forEach((p, partIdx) => {
        if (typeof p !== "string") {
          next.push(p);
          return;
        }
        const split = p.split(word);
        split.forEach((s, i) => {
          if (s) next.push(s);
          if (i < split.length - 1) {
            next.push(
              <mark
                key={`hl-${word}-${partIdx}-${i}-${next.length}`}
                className="bg-yellow-200 font-bold rounded px-1 mx-0.5"
              >
                {word}
              </mark>
            );
          }
        });
      });
      parts = next;
    }
    return parts;
  }, [data.story, data.words]);

  if (!data.story) return null;

  const handleSpeak = () => {
    if (speaking) {
      stopSpeech();
      setSpeaking(false);
      return;
    }
    const u = speakCantonese(data.story, 0.85);
    if (u) {
      setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
    }
  };

  const startEdit = () => {
    setEditText(data.story);
    setEditing(true);
    stopSpeech();
    setSpeaking(false);
  };

  const saveEdit = () => {
    setData((prev) => ({ ...prev, story: editText }));
    setEditing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        {/* School header */}
        <SchoolHeader />

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-5 text-sm md:text-base">
          <div className="font-bold text-purple-700">📖 學習模式</div>
        </div>

        {/* 詞語解釋 quick access (top) */}
        <button
          onClick={() => router.push("/word-detail")}
          className="w-full mb-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold rounded-2xl shadow-md active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          📖 睇每個詞語嘅解釋同例句
        </button>

        {/* Image */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-md overflow-hidden mb-5"
        >
          {data.imageUrl && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.imageUrl}
              alt="故事插圖"
              className="w-full h-auto block"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full aspect-[4/3] bg-gradient-to-br from-purple-100 to-pink-100 flex flex-col items-center justify-center">
              {imageError ? (
                <div className="text-gray-500 text-center px-4">
                  <div className="text-4xl mb-2">🖼️</div>
                  <p>插圖暫時無法載入</p>
                </div>
              ) : (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="text-5xl mb-2"
                  >
                    🎨
                  </motion.div>
                  <p className="text-purple-600">繪畫中…</p>
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* Story */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-md p-5 md:p-6 mb-5"
        >
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold text-purple-700">📚 故事</h2>
            <button
              onClick={editing ? saveEdit : startEdit}
              className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95"
            >
              {editing ? (
                <>
                  <Save className="w-3.5 h-3.5" /> 儲存
                </>
              ) : (
                <>
                  <Pencil className="w-3.5 h-3.5" /> 編輯
                </>
              )}
            </button>
          </div>

          {editing ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-3 text-lg leading-relaxed border-2 border-purple-200 rounded-xl focus:border-purple-400 focus:outline-none"
              rows={6}
            />
          ) : (
            <p className="text-lg md:text-2xl leading-loose text-gray-800">
              {highlightedStory}
            </p>
          )}

          <button
            onClick={handleSpeak}
            disabled={editing}
            className="mt-4 w-full bg-amber-400 hover:bg-amber-500 text-white text-lg font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50"
          >
            {speaking ? (
              <>
                <VolumeX className="w-5 h-5" /> 停止
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5" /> 聽故事
              </>
            )}
          </button>
        </motion.section>

        {/* Mnemonics */}
        {data.mnemonics.length > 0 && (
          <section className="mb-5">
            <h2 className="text-xl font-bold text-purple-700 mb-3 px-1">🧠 記憶法</h2>
            <div className="space-y-3">
              {data.mnemonics.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-5xl md:text-6xl font-black text-amber-700 leading-none">
                      {m.word}
                    </div>
                    <div className="flex-1 pt-2">
                      <button
                        onClick={() => speakCantonese(m.word, 0.7)}
                        className="text-sm bg-amber-200 hover:bg-amber-300 text-amber-800 px-2 py-1 rounded-full mb-2 flex items-center gap-1"
                      >
                        <Volume2 className="w-3 h-3" /> 朗讀
                      </button>
                      <p className="text-gray-700 text-base md:text-lg leading-relaxed">
                        {m.method}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Mode selector */}
        <div className="bg-white rounded-2xl shadow-md p-5 mb-4">
          <h3 className="text-lg font-bold text-purple-700 text-center mb-3">
            ✨ 揀默書模式
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => router.push("/word-cards")}
              disabled={data.wordImages.length === 0}
              className="py-4 px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-lg font-bold rounded-2xl shadow-md hover:shadow-lg active:scale-[0.98] transition flex items-center justify-between gap-2 disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎴</span>
                <div className="text-left">
                  <div>詞語卡片默書</div>
                  <div className="text-xs font-normal opacity-90">
                    一張卡一個詞語，聽聲默
                    {data.wordImages.length > 0 && (
                      <> · {data.wordImages.filter((w) => w.imageUrl).length}/{data.wordImages.length} 張圖已準備</>
                    )}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => router.push("/dictation")}
              className="py-4 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-lg font-bold rounded-2xl shadow-md hover:shadow-lg active:scale-[0.98] transition flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">📝</span>
                <div className="text-left">
                  <div>文章填空默書</div>
                  <div className="text-xs font-normal opacity-90">
                    喺故事入面填生字，聽句默
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}

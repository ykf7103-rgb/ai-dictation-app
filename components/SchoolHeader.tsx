"use client";

import { useState } from "react";

interface Props {
  /** Show large hero variant on home page (bigger logo + bigger app name) */
  hero?: boolean;
}

// 試 PNG 先（如果 user 上傳真校章），失敗就用 SVG fallback
const CREST_SOURCES = ["/school-crest.png", "/school-crest.svg"];

export default function SchoolHeader({ hero = false }: Props) {
  const [srcIdx, setSrcIdx] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  const handleError = () => {
    if (srcIdx < CREST_SOURCES.length - 1) {
      setSrcIdx(srcIdx + 1);
    } else {
      setAllFailed(true);
    }
  };

  return (
    <header
      className={`flex items-center gap-3 ${
        hero ? "mb-2 md:mb-4 justify-center" : "mb-4 justify-center"
      }`}
    >
      {/* Crest: PNG → SVG → 🛡️ emoji fallback */}
      <div className="shrink-0">
        {!allFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={CREST_SOURCES[srcIdx]}
            src={CREST_SOURCES[srcIdx]}
            alt="樂善堂梁黃蕙芳紀念學校"
            className={hero ? "w-20 h-20 md:w-24 md:h-24" : "w-12 h-12"}
            onError={handleError}
          />
        ) : (
          <div
            className={`${
              hero ? "w-20 h-20 md:w-24 md:h-24 text-4xl md:text-5xl" : "w-12 h-12 text-2xl"
            } rounded-full bg-gradient-to-br from-blue-600 to-red-600 text-white flex items-center justify-center font-bold shadow`}
          >
            🛡️
          </div>
        )}
      </div>

      {/* School name + app name */}
      <div className="text-left">
        <div
          className={`text-blue-900 font-bold leading-tight ${
            hero ? "text-sm md:text-base" : "text-xs md:text-sm"
          }`}
        >
          樂善堂梁黃蕙芳紀念學校
        </div>
        <div
          className={`font-black text-purple-700 leading-tight ${
            hero ? "text-2xl md:text-3xl" : "text-base md:text-lg"
          }`}
        >
          🌟 AI 魔法默書助手
        </div>
      </div>
    </header>
  );
}

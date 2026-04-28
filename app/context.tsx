"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { AppData } from "@/lib/types";

const STORAGE_KEY = "ai-dictation-app-state";

const defaultData: AppData = {
  words: [],
  grade: "小三",
  theme: "動物",
  story: "",
  mnemonics: [],
  imagePrompt: "",
  imageUrl: "",
  wordImages: [],
  wordExplanations: [],
};

interface Ctx {
  data: AppData;
  setData: (d: AppData | ((prev: AppData) => AppData)) => void;
}

const AppContext = createContext<Ctx>({ data: defaultData, setData: () => {} });

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<AppData>(defaultData);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setDataState(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  const setData: Ctx["setData"] = (d) => {
    setDataState((prev) => {
      const next = typeof d === "function" ? d(prev) : d;
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  if (!hydrated) {
    // Avoid hydration mismatch on first render
    return <>{children}</>;
  }

  return <AppContext.Provider value={{ data, setData }}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}

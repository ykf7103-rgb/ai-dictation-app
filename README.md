# 🌟 AI 魔法默書助手

香港小學生中文默書 AI 助手 — 家長拍照默書範圍，AI 自動生成趣味故事 + 圖像 + 廣東話朗讀，學生可以即場互動默書。

## ✨ 主要功能

- 📷 **拍照識別生字** — 用相機影默書範圍，AI 自動提取生字
- ✍️ **手動輸入生字** — 直接打字，逗號 / 空格分隔
- 🎨 **AI 生成趣味故事** — 用 Claude Sonnet 4.6 創作包含所有生字嘅小故事
- 🖼️ **AI 繪畫插圖** — 用 FLUX 生成水彩兒童書風格插圖
- 🧠 **拆字記憶法** — AI 自動為難字提供有趣記憶法
- 🔊 **廣東話朗讀** — Web Speech API zh-HK
- 📝 **互動默書** — 故事變填空，逐字朗讀提示，即時批改
- ⭐ **星級評分 + 撒花動畫** — 滿分有 confetti 慶祝
- 📱 **手機優先設計** — 桌面 / 平板都靚

## 🛠️ 技術棧

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4**
- **Framer Motion** — 動畫
- **Lucide React** — 圖示
- **canvas-confetti** — 慶祝特效
- **POE API** (OpenAI-compatible) — Claude-Sonnet-4.6 (文字+OCR) + FLUX-schnell (圖像)

## 🚀 本地開發

```bash
git clone https://github.com/ykf7103-rgb/ai-dictation-app.git
cd ai-dictation-app
npm install
```

建立 `.env.local`：
```
POE_API_KEY=你嘅POE_API_KEY
```

取得 POE API Key：[poe.com/api_key](https://poe.com/api_key)

執行：
```bash
npm run dev
# 開 http://localhost:3000
```

## 📦 部署到 Vercel

1. Push 呢個 repo 上 GitHub
2. 去 [vercel.com](https://vercel.com) → Import Project → 揀呢個 repo
3. 喺 **Environment Variables** 設定：`POE_API_KEY=你嘅key`
4. Deploy

## 💰 POE API 點數預估

| 動作 | 點數消耗 |
|------|---------|
| OCR 識別生字 | ~100-300 pts |
| 生成故事 | ~100-150 pts |
| 生成插圖 | ~40 pts |
| **每次完整 cycle** | **~250-500 pts** |

1,000,000 點月度套餐可生成約 2,000-4,000 次完整課程。

## 📂 專案結構

```
app/
├── page.tsx              首頁：輸入 / 拍照 / 設定
├── learn/page.tsx        學習模式：故事 + 插圖 + 記憶法 + 朗讀
├── dictation/page.tsx    默書測試：填空 + 批改 + 評分
├── context.tsx           Cross-page state with sessionStorage
└── api/
    ├── extract-words/    POE Claude vision OCR
    ├── generate-story/   POE Claude-Sonnet-4.6 (帶驗證重試)
    └── generate-image/   POE FLUX-schnell

lib/
├── types.ts              TypeScript types & enums
├── poe.ts                POE API helpers + image URL parser
└── speech.ts             廣東話 Web Speech API wrapper
```

## 🎓 設計理念

- **所有生字 100% 出現喺故事入面** — API 有自動驗證 + 重試機制
- **廣東話優先** — TTS 預設 `zh-HK`，無 zh-HK voice 時 fallback 到其他中文
- **零帳號** — 直接用，唔使 sign up
- **Mobile-friendly** — 大字大 button，適合家長同小朋友

---

Built with ❤️ for 香港小學生

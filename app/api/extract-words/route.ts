import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ImageContent {
  type: "image_url";
  image_url: { url: string };
}

interface TextContent {
  type: "text";
  text: string;
}

const POE_BASE = "https://api.poe.com/v1";

export async function POST(req: Request) {
  try {
    const { imageDataUrl } = await req.json();

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json({ error: "請提供圖片" }, { status: 400 });
    }
    if (!imageDataUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "圖片格式錯誤" }, { status: 400 });
    }

    const apiKey = process.env.POE_API_KEY;
    if (!apiKey) throw new Error("POE_API_KEY not set");

    const systemPrompt =
      "你係香港小學中文老師，專門幫家長從默書範圍圖片入面提取生字。你必須只回傳純 JSON，唔好包任何其他文字、解釋、或 markdown code block。";

    const userText = `你係一位香港小學中文老師。圖片係一張**默書範圍**嘅課本／默書紙／家長手寫稿。

【🎯 任務】只提取真正嘅默書詞語清單（typically 標號為 1. 2. 3. ... 10.）。

【❌ 必須排除（即使佔用大部分版面）】
- 學校名、班別、姓名（例如「樂善堂梁黃蕙芳紀念學校」、「3A 班」）
- 默書日期（例如「4月20日」、「Day2」、「四月二十一日」）
- 標題／級別（例如「三年級中文科 第三學段第一次默書」、「P.3」）
- 分數／百分比（例如「30%」、「@3%」、「(70%)」、「20分」）
- 課本頁數／單元（例如「第二冊 第五、六課」、「p.50」）
- 教師簽名／批改記號（✓✗）
- 段落／句子（例如背默課文嘅完整句子，唔好誤當生字）
- 「詞語：」「背默：」「讀默：」「趣味默書」等標籤字
- 數字編號本身（1. 2. 3.）— 只取後面個生字

【✅ 必須提取】
- 標號 1-10 嘅生字／詞語本身（單字或多字詞都要）
- 例如見到「1. 診所  2. 檢查  3. 稱讚」就抽「診所」「檢查」「稱讚」

【⚠️ Hard rules】
- **最多 10 個**：如果圖片有多過 10 個，淨係取頭 10 個
- 重覆嘅詞只列一次
- 跟原文順序由上至下、由左至右
- 唔肯定嘅手寫字寧願跳過

【範例】
圖片內容：「樂善堂梁黃蕙芳紀念學校 三年級 默書日期：4月20日 詞語：(30% @3%) 1. 診所 2. 檢查 3. 稱讚 4. 勇敢 5. 輕鬆」
✅ 正確輸出：{"words":["診所","檢查","稱讚","勇敢","輕鬆"]}
❌ 錯誤輸出：{"words":["樂善堂梁黃蕙芳紀念學校","三年級","4月20日","詞語","30%","診所"...]}

【只回傳呢個 JSON 格式】
{
  "words": ["生字1", "生字2", ...]
}`;

    const content: (TextContent | ImageContent)[] = [
      { type: "text", text: userText },
      { type: "image_url", image_url: { url: imageDataUrl } },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    let res, data;
    try {
      res = await fetch(`${POE_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "Claude-Sonnet-4.6",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content },
          ],
          stream: false,
          temperature: 0.2,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      });
      data = await res.json();
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const msg = data?.error?.message || res.statusText;
      throw new Error(`POE API ${res.status}: ${msg}`);
    }

    const replyText: string | undefined = data.choices?.[0]?.message?.content;
    if (!replyText) {
      return NextResponse.json({ error: "AI 沒有回應" }, { status: 500 });
    }

    let parsed;
    try {
      parsed = JSON.parse(replyText);
    } catch {
      const m = replyText.match(/\{[\s\S]*\}/);
      if (!m) {
        return NextResponse.json(
          { error: "AI 回應格式錯誤", raw: replyText.slice(0, 300) },
          { status: 500 }
        );
      }
      parsed = JSON.parse(m[0]);
    }

    const MAX_WORDS = 10;
    const words = Array.isArray(parsed.words)
      ? parsed.words
          .filter((w: unknown) => typeof w === "string" && w.trim().length > 0)
          .slice(0, MAX_WORDS) // hard cap server-side
      : [];

    return NextResponse.json({ words });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    const userText = `請睇呢張默書範圍嘅圖片（可能係課本、默書紙、或家長手寫），提取入面**所有中文生字／詞語**。

【規則】
- 只提取中文字／詞語（單字或多字詞都要）
- 唔包數字、英文、標點、頁碼、注音、教師簽名
- 如果同一個詞重覆出現，只列一次
- 跟原文順序由上至下、左至右排列
- 如果係手寫字，盡力辨認；唔肯定就跳過

【只回傳呢個 JSON 格式】
{
  "words": ["生字1", "生字2", "詞語1", ...]
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

    const words = Array.isArray(parsed.words)
      ? parsed.words.filter((w: unknown) => typeof w === "string" && w.trim().length > 0)
      : [];

    return NextResponse.json({ words });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { callPoe } from "@/lib/poe";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { words, grade, theme } = await req.json();

    if (!Array.isArray(words) || words.length < 1) {
      return NextResponse.json({ error: "請至少輸入一個生字" }, { status: 400 });
    }

    const wordsList = words.filter((w: unknown) => typeof w === "string" && w.trim().length > 0);

    const systemPrompt =
      "你係香港小學中文科教師兼兒童故事作家。你必須嚴格依照用戶指示，使用佢提供嘅每一個生字。你必須只回傳純 JSON object，唔好包含任何 markdown code block、解釋文字、或其他內容。";

    const wordsString = wordsList.join("、");
    const wordsCount = wordsList.length;

    const userPrompt = `【任務】創作一篇繁體中文小故事，必須使用我提供嘅生字。

【必須使用嘅生字（共 ${wordsCount} 個）】
${wordsList.map((w: string, i: number) => `${i + 1}. ${w}`).join("\n")}

【硬性規定】
- 故事入面必須包含以上每一個生字（${wordsString}），每個至少出現一次
- 故事長度：${Math.max(60, wordsCount * 12)}-${Math.max(150, wordsCount * 25)} 字
- 用繁體中文書寫
- 適合${grade || "小三"}程度
- 故事主題：${theme || "動物"}
- 故事要有完整情節（開始、發展、結尾）

【完成故事後再做兩件事】
1. 從上面 ${wordsCount} 個生字中挑 2-3 個最難嘅字，每個提供有趣嘅拆字記憶法（部首+聲旁拆解，或諧音聯想）
2. 用英文寫一段圖像描述，風格：watercolor children's book illustration, cute, colorful, whimsical, soft pastel colors, no text, no words. 描述要扣返故事內容。

【自我檢查】寫完故事後，請在心中數一次每一個生字（${wordsString}）係咪都出現咗喺故事入面。如果有任何一個冇出現，必須重寫。

【只回傳呢個 JSON 格式】
{
  "story": "故事全文（必須包含所有 ${wordsCount} 個生字）",
  "mnemonics": [
    { "word": "難字（必須係上面 ${wordsCount} 個生字之一）", "method": "拆字記憶法（繁體中文）" }
  ],
  "imagePrompt": "English image description"
}`;

    async function generate(extraNote: string = "") {
      const finalUserPrompt = extraNote ? `${userPrompt}\n\n${extraNote}` : userPrompt;
      const data = await callPoe(
        "Claude-Sonnet-4.6",
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: finalUserPrompt },
        ],
        { temperature: 0.7, max_tokens: 2048 }
      );
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("AI 沒有回應內容");

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        const m = content.match(/\{[\s\S]*\}/);
        if (!m) throw new Error(`AI 回應格式不正確：${content.slice(0, 200)}`);
        parsed = JSON.parse(m[0]);
      }
      if (!parsed.story || typeof parsed.story !== "string") {
        throw new Error("AI 沒有返回 story 欄位");
      }
      return parsed as { story: string; mnemonics?: unknown; imagePrompt?: string };
    }

    const findMissing = (story: string) =>
      wordsList.filter((w: string) => !story.includes(w));

    let parsed = await generate();
    let missing = findMissing(parsed.story);

    // 如果有生字漏咗，重試一次，明確指出漏咗邊個
    if (missing.length > 0) {
      const note = `⚠️ 上次生成嘅故事漏咗以下生字：${missing.join("、")}。請重新生成故事，確保每一個生字都出現喺故事入面：${wordsString}`;
      try {
        parsed = await generate(note);
        missing = findMissing(parsed.story);
      } catch {
        // keep first attempt
      }
    }

    return NextResponse.json({
      story: parsed.story,
      mnemonics: Array.isArray(parsed.mnemonics) ? parsed.mnemonics : [],
      imagePrompt: parsed.imagePrompt || "",
      missingWords: missing, // 畀 UI 顯示警告（如有）
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

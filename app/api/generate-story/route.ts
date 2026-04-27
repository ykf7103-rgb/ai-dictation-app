import { NextResponse } from "next/server";
import { callPoe } from "@/lib/poe";

export const dynamic = "force-dynamic";

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

    // 故事長度按生字數量縮放：每生字 5-8 字，極短上限 200 字
    const minLen = Math.min(40 + wordsCount * 4, 80);
    const maxLen = Math.min(60 + wordsCount * 7, 150);

    const userPrompt = `【任務】創作一篇**極短**繁體中文小故事，畀香港小學生默書用。

【必須使用嘅生字（共 ${wordsCount} 個）】
${wordsList.map((w: string, i: number) => `${i + 1}. ${w}`).join("\n")}

【硬性規定】
- 故事必須包含以上每一個生字（${wordsString}），每個至少出現一次
- **故事長度：${minLen}-${maxLen} 字（一定要短！細路冇耐性讀長文）**
- 用繁體中文書寫
- 適合${grade || "小三"}程度（用字唔好太深）
- 故事主題：${theme || "動物"}
- 句子要簡潔，唔好用太多形容詞同連接詞

【完成故事後做以下事】
1. **mnemonics**：從上面 ${wordsCount} 個生字中挑 2-3 個最難嘅字，每個提供有趣嘅拆字記憶法（部首+聲旁拆解，或諧音聯想）
2. **imagePrompt** (主插圖)：用英文寫一段圖像描述。
   風格：watercolor children's book illustration, cute, colorful, whimsical, soft pastel colors, no text, no words, simple composition.
   ⚠️ **構圖簡單**：避免兩個或以上人物嘅複雜互動 pose，改為描繪場景或單一角色。
3. **wordImagePrompts**：為**每一個生字**生成獨立嘅英文圖像描述（用喺詞語卡）。
   每個 prompt：watercolor children's book illustration of [意境], single subject, white or pastel background, no text, no words, cute, simple composition.
   抽象詞語（例如「快樂」「勇敢」）改用具體場景去表達。

【自我檢查】寫完故事後，喺心中數一次每一個生字（${wordsString}）係咪都出現咗。如有遺漏必須重寫。

【只回傳呢個 JSON 格式】
{
  "story": "極短故事（${minLen}-${maxLen} 字，包含所有 ${wordsCount} 個生字）",
  "mnemonics": [
    { "word": "難字", "method": "拆字記憶法（繁體中文）" }
  ],
  "imagePrompt": "English watercolor scene describing the story's atmosphere",
  "wordImagePrompts": [
${wordsList.map((w: string) => `    { "word": "${w}", "prompt": "English description for ${w}" }`).join(",\n")}
  ]
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
      return parsed as {
        story: string;
        mnemonics?: unknown;
        imagePrompt?: string;
        wordImagePrompts?: unknown;
      };
    }

    const findMissing = (story: string) =>
      wordsList.filter((w: string) => !story.includes(w));

    let parsed = await generate();
    let missing = findMissing(parsed.story);

    if (missing.length > 0) {
      const note = `⚠️ 上次生成嘅故事漏咗以下生字：${missing.join("、")}。請重新生成故事，確保每一個生字都出現喺故事入面：${wordsString}`;
      try {
        parsed = await generate(note);
        missing = findMissing(parsed.story);
      } catch {
        // keep first attempt
      }
    }

    // 確保 wordImagePrompts 對齊到 wordsList
    let wordImagePrompts: { word: string; prompt: string }[] = [];
    if (Array.isArray(parsed.wordImagePrompts)) {
      const map = new Map<string, string>();
      for (const item of parsed.wordImagePrompts as Array<{ word?: string; prompt?: string }>) {
        if (item?.word && item?.prompt) map.set(item.word, item.prompt);
      }
      wordImagePrompts = wordsList.map((w: string) => ({
        word: w,
        prompt:
          map.get(w) ||
          `watercolor children's book illustration depicting "${w}", single subject, white background, cute, simple composition, soft pastel colors, no text, no words`,
      }));
    } else {
      // 如果 AI 冇返 wordImagePrompts，用模板補齊
      wordImagePrompts = wordsList.map((w: string) => ({
        word: w,
        prompt: `watercolor children's book illustration depicting "${w}", single subject, white background, cute, simple composition, soft pastel colors, no text, no words`,
      }));
    }

    return NextResponse.json({
      story: parsed.story,
      mnemonics: Array.isArray(parsed.mnemonics) ? parsed.mnemonics : [],
      imagePrompt: parsed.imagePrompt || "",
      wordImagePrompts,
      missingWords: missing,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

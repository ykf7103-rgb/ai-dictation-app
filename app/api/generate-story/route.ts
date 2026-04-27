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

    const systemPrompt = `你係香港最受小學生歡迎嘅兒童故事作家，擅長將乏味嘅生字組合成令小朋友捧腹大笑、印象深刻嘅迷你故事。你嘅故事三大特色：
1. 每個生字都係故事核心，不可生硬塞入
2. 內容必有「驚喜轉折」或「幽默畫面」（例如：意想不到嘅角色行為、誇張比喻、童趣聯想）
3. 文字活潑，多用對白、感歎詞、生動動詞，唔似教科書

你必須只回傳純 JSON object，唔好包含 markdown code block、解釋、或其他文字。`;

    const wordsString = wordsList.join("、");
    const wordsCount = wordsList.length;

    // 故事長度：每生字約 5-8 字，整體 50-150 字
    const minLen = Math.min(40 + wordsCount * 4, 80);
    const maxLen = Math.min(60 + wordsCount * 7, 150);

    const userPrompt = `【任務】用以下生字寫一篇**超短超有趣**嘅繁體中文小故事，畀香港小學生默書用。

【必須使用嘅生字（共 ${wordsCount} 個）】
${wordsList.map((w: string, i: number) => `${i + 1}. ${w}`).join("\n")}

【⭐ 故事必達標準（極重要！）】
A. **緊密關聯**：所有生字必須圍繞**同一情節 / 同一場景**串連，唔可以「一句一個無關場景」。例如：如果有「跑步、汗水、口渴、水樽、解渴、冰涼」，就要寫一個運動會嘅完整片段，每個字都係呢個場景嘅一部分。
B. **極度有趣**：必須有以下其中一樣：
   - 🎭 一個意想不到嘅小驚喜（角色做咗異想天開嘅事）
   - 😆 一個誇張或幽默嘅畫面（誇大、擬人、童趣比喻）
   - 💬 一兩句生動嘅對白（用引號）
C. **生動文字**：用具體動詞代替「有」「是」「做」（例如：唔好寫「他有禮貌」，寫「他鞠躬說早晨」）

【硬性規定】
- 故事必須包含每一個生字（${wordsString}），每個至少 1 次
- **長度：${minLen}-${maxLen} 字**（短而有力，唔好水）
- 繁體中文，香港用語可以
- 適合${grade || "小三"}程度
- 主題：${theme || "動物"}（但唔需要硬塞，只係氛圍）

【完成故事後額外要做嘅嘢】
1. **mnemonics**：揀 2-3 個最難寫嘅字，提供拆字記憶法（部首拆解 / 諧音聯想，要有趣味）
2. **imagePrompt**（主插圖）：英文圖像描述，風格 watercolor children's book illustration, soft pastel, whimsical, cute, no text. **構圖極簡單**，避免複雜人物互動 pose，最好係場景或單一角色。
3. **wordImagePrompts**：為**每個生字**寫一句英文圖像描述。
   - 模板：watercolor children's book illustration of [具體形象], single subject, soft pastel, white background, cute, no text
   - 抽象詞（例如「禮貌」「勤力」）轉做具體畫面（例如鞠躬嘅小孩 / 抱住書本嘅學生）

【自我檢查】寫完後在心中讀一次：（1）每個生字（${wordsString}）係咪都出現？（2）故事有冇連貫？（3）夠唔夠好笑或有驚喜？如果有任何一項唔達標，必須重寫。

【只回傳呢個 JSON 格式】
{
  "story": "超短超有趣故事（${minLen}-${maxLen} 字）",
  "mnemonics": [
    { "word": "難字", "method": "趣味拆字記憶法" }
  ],
  "imagePrompt": "English scene description matching the story",
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

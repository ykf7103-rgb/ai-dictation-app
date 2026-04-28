import { NextResponse } from "next/server";
import { callPoe } from "@/lib/poe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { words, grade, theme } = await req.json();

    if (!Array.isArray(words) || words.length < 1) {
      return NextResponse.json({ error: "請至少輸入一個生字" }, { status: 400 });
    }

    const MAX_WORDS = 10;
    const wordsList = words
      .filter((w: unknown) => typeof w === "string" && w.trim().length > 0)
      .slice(0, MAX_WORDS); // hard cap：每次最多 10 個

    const systemPrompt =
      "你係香港小學中文老師，幫家長為學生創作默書用嘅小故事。你只回傳純 JSON，唔好包 markdown code block 或任何其他文字。";

    const wordsString = wordsList.join("、");
    const wordsCount = wordsList.length;

    // 故事長度：每生字約 5-8 字
    const minLen = Math.min(40 + wordsCount * 4, 80);
    const maxLen = Math.min(60 + wordsCount * 7, 150);

    const userPrompt = `【生字（${wordsCount} 個）】${wordsString}

【任務】寫一個**完整、自然、用晒所有生字**嘅繁體中文小故事，畀${grade || "小三"}學生默書用。

【要求】
1. **story**: ${minLen}-${maxLen} 字。用晒所有生字（每個至少 1 次），生字之間要自然關聯。要有開始、發展、結尾。${theme || "動物"}主題（淡淡氣氛即可）。**自然、平實、清晰，唔需要刻意搞笑或誇張對白**。
   ⚠️ **故事正文必須用「書面語／規範語」（即正式中文）**，唔可以用粵語口語：
   - ❌ 唔好用：嘅、咗、佢、喺、嘢、冇、咁、啦、嗎、㗎、邊度、點樣、如果...就...
   - ✅ 要用：的、了、他/她、在、東西、沒有、那麼、嗎/呢、哪裡、怎樣、如果...就...
   範例：「他在學校鄰近的診所做檢查」（✅ 書面語）vs 「佢喺學校鄰近嘅診所做檢查」（❌ 粵語）

2. **mnemonics**: 揀 2 個最難寫嘅字，提供拆字記憶法（部首+聲旁拆解）。

3. **imagePrompt**: 一句英文（≤25 字），描述故事場景，模板：\`watercolor children's book illustration of [scene], soft pastel, simple composition, no text\`

4. **wordImagePrompts**: 為每個生字寫一句**獨立、具體、有畫面感**嘅英文 prompt。
   ⚠️ **三大規則**：
   (A) 完全脫離上面個故事 context（唔可以用故事角色／場景）
   (B) 圍繞該詞語本身嘅**核心意思**畫一個**清晰、可辨認**嘅場景或物件
   (C) Prompt 要**具體、有細節**：包括主角形態、表情、動作、簡單背景元素

   每句 20-40 字（比之前長啲，要清晰），模板：
   \`watercolor children's book illustration of [SPECIFIC SCENE/OBJECT clearly showing the word's meaning], [character details if any], soft pastel colors, simple composition, white or pastel background, cute, no text, no words\`

   【優質示範】
   - 「冷靜」→ "watercolor children's book illustration of a small child sitting cross-legged with eyes closed and a peaceful smile, blue calm aura around them, soft pastel, simple composition, white background, cute, no text"
   - 「鄰近」→ "watercolor children's book illustration of two cozy small houses standing next to each other on a green hill, sharing a fence, soft pastel colors, simple composition, white background, cute, no text"
   - 「診所」→ "watercolor children's book illustration of a tiny pastel clinic building with a big red cross sign on the door, small flowers in front, soft pastel, simple composition, white background, cute, no text"
   - 「勇敢」→ "watercolor children's book illustration of a small child standing tall on a hilltop wearing a tiny red cape, fists on hips, big smile, sun behind, soft pastel, simple composition, white background, cute, no text"
   - 「洩氣」→ "watercolor children's book illustration of a sad partially-deflated balloon slumping on the ground with droopy eyes and a frown, soft pastel, simple composition, white background, cute, no text"
   - 「稱讚」→ "watercolor children's book illustration of a smiling teacher giving a gold star sticker to a happy student, both smiling, soft pastel, simple composition, white background, cute, no text"
   - 「檢查」→ "watercolor children's book illustration of a friendly cartoon doctor holding a stethoscope and looking carefully at a checklist, soft pastel, simple composition, white background, cute, no text"

   【嚴禁示範】
   - ❌ "watercolor cute turtle"（太籠統，唔知係邊個詞）
   - ❌ "watercolor children near school"（含故事元素）
   - ❌ "magnifying glass on green leaf"（離開詞語意思太遠）

5. **wordExplanations**: 為每個生字提供詞典式解釋（畀學生溫習用）：
   - **partOfSpeech**: 詞性（動詞 / 名詞 / 形容詞 / 副詞 / 連詞 / 量詞 / 嘆詞，等等）
   - **explanation**: 詞義解釋 + 理據（為什麼咁解／字詞由邊度嚟），約 20-40 字書面語
   - **example**: 一句書面語例句（≤20 字），example 句中**必須包含該生字**
   範例：
   - 「鄰近」→ partOfSpeech: "形容詞"，explanation: "形容位置上靠近、距離不遠。「鄰」即是鄰居，「近」即是距離小，合起來表示位置接近。"，example: "我家鄰近一所公園。"
   - 「稱讚」→ partOfSpeech: "動詞"，explanation: "用言語表達讚賞或肯定。「稱」是說出，「讚」是讚美，合起來表示開口讚美對方。"，example: "老師稱讚他做得好。"

【格式】
{
  "story": "...",
  "mnemonics": [{"word": "...", "method": "..."}],
  "imagePrompt": "...",
  "wordImagePrompts": [
${wordsList.map((w: string) => `    {"word": "${w}", "prompt": "..."}`).join(",\n")}
  ],
  "wordExplanations": [
${wordsList.map((w: string) => `    {"word": "${w}", "partOfSpeech": "...", "explanation": "...", "example": "..."}`).join(",\n")}
  ]
}`;

    function extractJson(content: string): unknown {
      // 1. Strip markdown code fences if present
      let cleaned = content.trim();
      const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (fence) cleaned = fence[1].trim();

      // 2. Try direct parse
      try {
        return JSON.parse(cleaned);
      } catch {}

      // 3. Find first { ... last balanced } in cleaned content
      const firstBrace = cleaned.indexOf("{");
      if (firstBrace === -1) {
        throw new Error(`AI 回應冇 JSON object：${content.slice(0, 200)}`);
      }
      const lastBrace = cleaned.lastIndexOf("}");
      if (lastBrace > firstBrace) {
        try {
          return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
        } catch {}
      }

      // 4. Truncated JSON: try to close brackets/quotes greedily
      let trimmed = cleaned.slice(firstBrace);
      // Trim trailing partial token (last comma or open quote)
      trimmed = trimmed.replace(/,\s*"[^"]*$/, ""); // 移除最後不完整字段
      trimmed = trimmed.replace(/,\s*\{[^}]*$/, ""); // 移除最後不完整 object
      let openBraces = 0;
      let openBrackets = 0;
      let inString = false;
      let escape = false;
      for (const ch of trimmed) {
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === "\\") {
          escape = true;
          continue;
        }
        if (ch === '"') inString = !inString;
        if (inString) continue;
        if (ch === "{") openBraces++;
        else if (ch === "}") openBraces--;
        else if (ch === "[") openBrackets++;
        else if (ch === "]") openBrackets--;
      }
      let repaired = trimmed;
      if (inString) repaired += '"';
      while (openBrackets-- > 0) repaired += "]";
      while (openBraces-- > 0) repaired += "}";
      try {
        return JSON.parse(repaired);
      } catch {
        throw new Error(`AI 回應 JSON 解析失敗（已嘗試修復）：${content.slice(0, 200)}`);
      }
    }

    async function generate(extraNote: string = "") {
      const finalUserPrompt = extraNote ? `${userPrompt}\n\n${extraNote}` : userPrompt;
      const data = await callPoe(
        "Gemini-3-Flash", // 比 Sonnet-4.6 平 ~30×、自然出書面語、質素佳
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: finalUserPrompt },
        ],
        { temperature: 0.7, max_tokens: 2048 }
      );
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("AI 沒有回應內容");

      const parsed = extractJson(content) as {
        story?: unknown;
        mnemonics?: unknown;
        imagePrompt?: unknown;
        wordImagePrompts?: unknown;
        wordExplanations?: unknown;
      };

      if (!parsed.story || typeof parsed.story !== "string") {
        throw new Error("AI 沒有返回 story 欄位");
      }
      return parsed as {
        story: string;
        mnemonics?: unknown;
        imagePrompt?: string;
        wordImagePrompts?: unknown;
        wordExplanations?: unknown;
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
      wordImagePrompts = wordsList.map((w: string) => ({
        word: w,
        prompt: `watercolor children's book illustration depicting "${w}", single subject, white background, cute, simple composition, soft pastel colors, no text, no words`,
      }));
    }

    // 對齊 wordExplanations
    let wordExplanations: {
      word: string;
      partOfSpeech: string;
      explanation: string;
      example?: string;
    }[] = [];
    if (Array.isArray((parsed as { wordExplanations?: unknown }).wordExplanations)) {
      const expMap = new Map<
        string,
        { partOfSpeech: string; explanation: string; example?: string }
      >();
      for (const item of (parsed as {
        wordExplanations: Array<{
          word?: string;
          partOfSpeech?: string;
          explanation?: string;
          example?: string;
        }>;
      }).wordExplanations) {
        if (item?.word) {
          expMap.set(item.word, {
            partOfSpeech: item.partOfSpeech || "",
            explanation: item.explanation || "",
            example: item.example,
          });
        }
      }
      wordExplanations = wordsList.map((w: string) => ({
        word: w,
        partOfSpeech: expMap.get(w)?.partOfSpeech || "",
        explanation: expMap.get(w)?.explanation || "",
        example: expMap.get(w)?.example,
      }));
    } else {
      wordExplanations = wordsList.map((w: string) => ({
        word: w,
        partOfSpeech: "",
        explanation: "",
      }));
    }

    return NextResponse.json({
      story: parsed.story,
      mnemonics: Array.isArray(parsed.mnemonics) ? parsed.mnemonics : [],
      imagePrompt: parsed.imagePrompt || "",
      wordImagePrompts,
      wordExplanations,
      missingWords: missing,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

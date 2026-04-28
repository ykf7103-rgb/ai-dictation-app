import fs from "node:fs";

const apiKey = fs.readFileSync(".env.local", "utf8").match(/POE_API_KEY=(.+)/)[1].trim();

// 50 school words with hand-tuned visual prompts
const WORDS = [
  // P.2-1
  { id: "p2-1-01", word: "聰明", prompt: "watercolor children's book illustration of a smart cute child with a glowing lightbulb above their head, big shining eyes, soft pastel, simple composition, white background, cute, no text" },
  { id: "p2-1-02", word: "捉迷藏", prompt: "watercolor children's book illustration of two cute children playing hide and seek, one peeking from behind a tree, the other counting with hands over eyes, soft pastel, simple composition, no text" },
  { id: "p2-1-03", word: "蹦蹦跳跳", prompt: "watercolor children's book illustration of a cheerful child jumping happily with motion lines, both feet off the ground, big smile, soft pastel, simple composition, white background, cute, no text" },
  { id: "p2-1-04", word: "冷靜", prompt: "watercolor children's book illustration of a calm cute child sitting cross-legged with eyes closed and peaceful smile, blue calm aura around them, soft pastel, simple composition, white background, cute, no text" },
  { id: "p2-1-05", word: "危險", prompt: "watercolor children's book illustration of a yellow warning triangle sign with exclamation mark, lightning bolts around it, soft pastel, simple composition, white background, cute, no text" },
  { id: "p2-1-06", word: "困難", prompt: "watercolor children's book illustration of a small child climbing a steep hill with a heavy backpack, looking determined, soft pastel, simple composition, white background, cute, no text" },
  { id: "p2-1-07", word: "奇怪", prompt: "watercolor children's book illustration of a confused child with a question mark above head, scratching head with puzzled face, soft pastel, simple composition, white background, cute, no text" },
  { id: "p2-1-08", word: "成功", prompt: "watercolor children's book illustration of a happy child holding a gold trophy high with both hands, confetti and stars around, soft pastel, simple composition, white background, cute, no text" },
  { id: "p2-1-09", word: "相信", prompt: "watercolor children's book illustration of two children holding hands warmly with hearts floating around, smiling at each other, soft pastel, simple composition, white background, cute, no text" },
  { id: "p2-1-10", word: "決心", prompt: "watercolor children's book illustration of a determined cute child clenching fists with fire of motivation in eyes, soft pastel, simple composition, white background, cute, no text" },

  // P.2-2
  { id: "p2-2-01", word: "傍晚", prompt: "watercolor children's book illustration of an orange sunset sky over rooftops with first stars appearing, peaceful evening scene, soft pastel, simple composition, no text" },
  { id: "p2-2-02", word: "笑咪咪", prompt: "watercolor children's book illustration of a smiling face with crescent eyes and rosy cheeks, big curved smile, soft pastel, simple composition, white background, cute, no text" },
  { id: "p2-2-03", word: "立刻", prompt: "watercolor children's book illustration of a child running fast with motion lines and sparks behind, urgent dash forward, soft pastel, simple composition, white background, cute, no text" },
  { id: "p2-2-04", word: "忽然", prompt: "watercolor children's book illustration of a surprised child with wide open eyes and exclamation mark, surrounded by yellow burst lines, soft pastel, simple composition, white background, cute, no text" },
  { id: "p2-2-05", word: "電視", prompt: "watercolor children's book illustration of a cute retro TV set with antenna, showing a cartoon scene on screen, soft pastel, simple composition, white background, cute, no text" },
  { id: "p2-2-06", word: "懂事", prompt: "watercolor children's book illustration of a thoughtful cute child helping mother carry grocery bags with caring smile, soft pastel, simple composition, white background, cute, no text" },
  { id: "p2-2-07", word: "乾淨", prompt: "watercolor children's book illustration of sparkling clean dishes stacked neatly with soap bubbles around, soft pastel, simple composition, white background, cute, no text" },
  { id: "p2-2-08", word: "乖巧", prompt: "watercolor children's book illustration of a polite cute child sitting properly with hands folded, gentle smile, halo of niceness, soft pastel, simple composition, white background, cute, no text" },
  { id: "p2-2-09", word: "熱呼呼", prompt: "watercolor children's book illustration of a steaming hot bowl of soup with rising steam swirls, warm cozy feeling, soft pastel, simple composition, white background, cute, no text" },
  { id: "p2-2-10", word: "信心滿滿", prompt: "watercolor children's book illustration of a confident cute child standing tall with thumbs up, sparkling eyes and big confident smile, soft pastel, simple composition, white background, cute, no text" },

  // P.3-1
  { id: "p3-1-01", word: "診所", prompt: "watercolor children's book illustration of a cute small clinic building with a big red cross sign on the door, small flowers in front, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-1-02", word: "檢查", prompt: "watercolor children's book illustration of a friendly cartoon doctor holding a stethoscope and examining a checklist, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-1-03", word: "稱讚", prompt: "watercolor children's book illustration of a smiling teacher giving a gold star sticker to a happy student, both smiling warmly, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-1-04", word: "勇敢", prompt: "watercolor children's book illustration of a small child standing tall on a hilltop wearing a tiny red cape, fists on hips, big brave smile, sun behind, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-1-05", word: "輕鬆", prompt: "watercolor children's book illustration of a relaxed child lying on soft cloud or hammock with eyes closed and peaceful smile, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-1-06", word: "起勁", prompt: "watercolor children's book illustration of an energetic child rolling up sleeves with sparkling eyes and motivated big smile, ready to work, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-1-07", word: "鄰近", prompt: "watercolor children's book illustration of two cozy small houses standing next to each other on a green hill, sharing a fence between them, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-1-08", word: "泄氣", prompt: "watercolor children's book illustration of a sad partially-deflated balloon slumping on the ground with droopy eyes and a frown, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-1-09", word: "靈活", prompt: "watercolor children's book illustration of a nimble little cat doing a graceful leap mid-air through a hoop, agile pose, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-1-10", word: "姿勢", prompt: "watercolor children's book illustration of a cute ballet dancer in elegant pose on tiptoes with arms gracefully raised, soft pastel, simple composition, white background, cute, no text" },

  // P.3-2
  { id: "p3-2-01", word: "聞名", prompt: "watercolor children's book illustration of a famous landmark building like Eiffel Tower with shining gold star above, recognizable silhouette, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-2-02", word: "雄偉", prompt: "watercolor children's book illustration of a majestic tall mountain with snow peak, grand scale, awe-inspiring view, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-2-03", word: "設施", prompt: "watercolor children's book illustration of a colorful playground with slides, swings, and seesaws all together, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-2-04", word: "悠揚", prompt: "watercolor children's book illustration of a violin with floating musical notes, gentle melody flowing in waves, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-2-05", word: "載歌載舞", prompt: "watercolor children's book illustration of a happy child singing with mouth open and dancing with arms raised, surrounded by music notes, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-2-06", word: "飛馳", prompt: "watercolor children's book illustration of a sports car speeding fast with motion blur lines and dust trails behind, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-2-07", word: "目的地", prompt: "watercolor children's book illustration of a red destination flag stuck on a small cartoon map with a path leading to it, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-2-08", word: "觀察", prompt: "watercolor children's book illustration of a curious child looking through a magnifying glass at a small flower, attentive expression, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-2-09", word: "巨型", prompt: "watercolor children's book illustration of a giant fluffy teddy bear next to a tiny child for size comparison, soft pastel, simple composition, white background, cute, no text" },
  { id: "p3-2-10", word: "名滿天下", prompt: "watercolor children's book illustration of a globe with shining stars and trophies floating around it, world-wide fame symbol, soft pastel, simple composition, white background, cute, no text" },

  // P.4-1
  { id: "p4-1-01", word: "精緻", prompt: "watercolor children's book illustration of a delicate finely-detailed teacup with intricate flower pattern, elegant decorative item, soft pastel, simple composition, white background, cute, no text" },
  { id: "p4-1-02", word: "形影不離", prompt: "watercolor children's book illustration of two best friends walking hand in hand, always together inseparable, soft pastel, simple composition, white background, cute, no text" },
  { id: "p4-1-03", word: "憧憬", prompt: "watercolor children's book illustration of a dreamy child looking up at the sky with stars and rainbow dreams above, hopeful expression, soft pastel, simple composition, white background, cute, no text" },
  { id: "p4-1-04", word: "一擁而上", prompt: "watercolor children's book illustration of a group of happy children rushing together to hug something in the middle, swarming forward, soft pastel, simple composition, white background, cute, no text" },
  { id: "p4-1-05", word: "溫馨", prompt: "watercolor children's book illustration of a cozy family scene with parents and child sharing a warm hug under soft golden light, hearts floating, soft pastel, simple composition, white background, cute, no text" },
  { id: "p4-1-06", word: "重甸甸", prompt: "watercolor children's book illustration of a child struggling to lift a very heavy bag with arms shaking, sweat drops on forehead, soft pastel, simple composition, white background, cute, no text" },
  { id: "p4-1-07", word: "哽咽", prompt: "watercolor children's book illustration of a sad child with tears in eyes covering mouth, choking on emotions, gentle sympathetic mood, soft pastel, simple composition, white background, cute, no text" },
  { id: "p4-1-08", word: "珍惜", prompt: "watercolor children's book illustration of a child carefully holding a small bird in cupped hands, treasuring moment, gentle protective pose, soft pastel, simple composition, white background, cute, no text" },
  { id: "p4-1-09", word: "遙遠", prompt: "watercolor children's book illustration of a child looking at a faraway mountain through a long winding path, distant horizon, soft pastel, simple composition, white background, cute, no text" },
  { id: "p4-1-10", word: "歉意", prompt: "watercolor children's book illustration of a child bowing slightly with apologetic expression, hands clasped together, soft pastel, simple composition, white background, cute, no text" },
];

console.log(`Generating ${WORDS.length} word images via FLUX-schnell...`);
const results = {};

const BATCH_SIZE = 10;
for (let i = 0; i < WORDS.length; i += BATCH_SIZE) {
  const batch = WORDS.slice(i, i + BATCH_SIZE);
  console.log(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(WORDS.length / BATCH_SIZE)}: ${batch.map((w) => w.word).join(", ")}`);
  await Promise.all(
    batch.map(async (w) => {
      try {
        const r = await fetch("https://api.poe.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "FLUX-schnell",
            messages: [{ role: "user", content: w.prompt }],
            stream: false,
          }),
        });
        const data = await r.json();
        const content = data?.choices?.[0]?.message?.content || "";
        const url = content.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/)?.[1] || null;
        results[w.id] = { word: w.word, prompt: w.prompt, url };
        console.log(`  ${w.id} ${w.word}: ${url ? "✓" : "✗"}`);
      } catch (e) {
        results[w.id] = { word: w.word, prompt: w.prompt, url: null, error: e.message };
        console.log(`  ${w.id} ${w.word}: ERROR ${e.message}`);
      }
    })
  );
}

fs.writeFileSync("scripts/word-image-urls.json", JSON.stringify(results, null, 2));
console.log(`\n✓ Saved to scripts/word-image-urls.json`);
console.log(`Success: ${Object.values(results).filter((r) => r.url).length}/${WORDS.length}`);

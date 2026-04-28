import fs from "node:fs";

const apiKey = fs.readFileSync(".env.local", "utf8").match(/POE_API_KEY=(.+)/)[1].trim();
const results = JSON.parse(fs.readFileSync("scripts/word-image-urls.json", "utf8"));

// Find failed entries
const failed = Object.entries(results).filter(([, v]) => !v.url);
console.log(`Retrying ${failed.length} failed:`, failed.map(([id, v]) => `${id} ${v.word}`).join(", "));

await Promise.all(
  failed.map(async ([id, v]) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch("https://api.poe.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "FLUX-schnell",
            messages: [{ role: "user", content: v.prompt }],
            stream: false,
          }),
        });
        const data = await r.json();
        const content = data?.choices?.[0]?.message?.content || "";
        const url = content.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/)?.[1] || null;
        if (url) {
          results[id] = { ...v, url };
          console.log(`  ${id} ${v.word}: ✓ (attempt ${attempt + 1})`);
          return;
        }
      } catch (e) {
        console.log(`  ${id} ${v.word}: attempt ${attempt + 1} ERROR`);
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    console.log(`  ${id} ${v.word}: ✗ all retries failed`);
  })
);

fs.writeFileSync("scripts/word-image-urls.json", JSON.stringify(results, null, 2));
console.log(`\nFinal: ${Object.values(results).filter((r) => r.url).length}/50`);

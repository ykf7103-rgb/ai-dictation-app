import fs from "node:fs";
import path from "node:path";

const results = JSON.parse(fs.readFileSync("scripts/word-image-urls.json", "utf8"));
const dir = "public/words";
fs.mkdirSync(dir, { recursive: true });

let success = 0;
let failed = 0;
await Promise.all(
  Object.entries(results).map(async ([id, v]) => {
    if (!v.url) {
      failed++;
      return;
    }
    try {
      const r = await fetch(v.url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      const file = path.join(dir, `${id}.jpg`);
      fs.writeFileSync(file, buf);
      success++;
      console.log(`  ${id} ${v.word}: ${(buf.length / 1024).toFixed(0)} KB`);
    } catch (e) {
      console.log(`  ${id} ${v.word}: ERROR ${e.message}`);
      failed++;
    }
  })
);
console.log(`\n✓ Downloaded ${success}/50  failed: ${failed}`);

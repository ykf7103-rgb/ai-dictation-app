import { NextResponse } from "next/server";
import { callPoe, extractImageUrl } from "@/lib/poe";

export const dynamic = "force-dynamic";

// 支援嘅 model（pts ≈ USD × 33,333）：
// - FLUX-schnell:    40 pts, 2s  — 平靚正，適合單物
// - FLUX-dev:       170 pts, 3s  — 比 schnell 好，慳 3 倍 vs Imagen
// - Imagen-4-Fast:  470 pts, 5s  — Google 質素，性價比之王 ⭐
// - FLUX-pro:      ~500 pts, 5s
// - Imagen-4:       930 pts, 7s
// - Imagen-4-Ultra: 1400 pts, 12s — 頂級
const ALLOWED_MODELS = [
  "FLUX-schnell",
  "FLUX-dev",
  "FLUX-pro",
  "Imagen-4-Fast",
  "Imagen-4",
  "Imagen-4-Ultra",
] as const;
type AllowedModel = (typeof ALLOWED_MODELS)[number];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = body.prompt;
    const requestedModel = body.model;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "請提供 prompt" }, { status: 400 });
    }

    const model: AllowedModel =
      typeof requestedModel === "string" &&
      (ALLOWED_MODELS as readonly string[]).includes(requestedModel)
        ? (requestedModel as AllowedModel)
        : "FLUX-schnell";

    const data = await callPoe(model, [{ role: "user", content: prompt }]);

    const content = data.choices?.[0]?.message?.content;
    const imageUrl = extractImageUrl(content);

    if (!imageUrl) {
      return NextResponse.json(
        { error: "無法從 AI 回應抽取圖像 URL", raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json({ imageUrl, model });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

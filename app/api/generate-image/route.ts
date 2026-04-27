import { NextResponse } from "next/server";
import { callPoe, extractImageUrl } from "@/lib/poe";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "請提供 prompt" }, { status: 400 });
    }

    const data = await callPoe("FLUX-schnell", [{ role: "user", content: prompt }]);

    const content = data.choices?.[0]?.message?.content;
    const imageUrl = extractImageUrl(content);

    if (!imageUrl) {
      return NextResponse.json(
        { error: "無法從 AI 回應抽取圖像 URL", raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json({ imageUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

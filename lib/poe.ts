const POE_BASE = "https://api.poe.com/v1";

interface PoeMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PoeOptions {
  temperature?: number;
  max_tokens?: number;
  [key: string]: unknown;
}

interface PoeResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
  error?: { message?: string };
}

export async function callPoe(
  model: string,
  messages: PoeMessage[],
  extra: PoeOptions = {}
): Promise<PoeResponse> {
  const apiKey = process.env.POE_API_KEY;
  if (!apiKey) throw new Error("POE_API_KEY not set in environment");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const res = await fetch(`${POE_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, stream: false, ...extra }),
      signal: controller.signal,
    });

    const data = (await res.json()) as PoeResponse;

    if (!res.ok) {
      const msg = data.error?.message || res.statusText;
      throw new Error(`POE API ${res.status}: ${msg}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export function extractImageUrl(content: string | undefined | null): string | null {
  if (!content) return null;
  const md = content.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/);
  if (md) return md[1];
  const plain = content.match(/https?:\/\/\S+\.(?:png|jpg|jpeg|webp|gif)\S*/i);
  return plain?.[0] ?? null;
}

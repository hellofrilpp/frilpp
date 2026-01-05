import { fetchWithTimeout } from "@/lib/http";

const DEFAULT_BASE = "https://api.z.ai/api/coding/paas/v4";

export type ZaiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function zaiChat(params: {
  messages: ZaiMessage[];
  temperature?: number;
  maxTokens?: number;
}) {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) {
    throw new Error("ZAI_API_KEY is not configured");
  }

  const base = (process.env.ZAI_API_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
  const model = process.env.ZAI_MODEL ?? "glm-4.6";

  const res = await fetchWithTimeout(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: params.messages,
      temperature: params.temperature ?? 0.2,
      max_tokens: params.maxTokens ?? 800,
      stream: false,
    }),
    timeoutMs: 15_000,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Z.ai request failed");
  }

  const json = (await res.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;

  const content = json?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Z.ai returned empty response");
  }

  return content;
}

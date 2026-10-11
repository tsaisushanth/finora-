import "server-only";

import { BILL_EXTRACTION_PROMPT } from "@/lib/ai/prompt";
import { getServerEnv } from "@/lib/env";

export type VisionResult = { text: string; model: string };

const DEFAULT_MODELS: Record<string, string> = {
  google: "gemini-2.0-flash",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
};

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Vision provider failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  return response.json();
}

function firstText(block: unknown): string | undefined {
  if (!block || typeof block !== "object") return undefined;
  const text = (block as { text?: unknown }).text;
  return typeof text === "string" && text.length > 0 ? text : undefined;
}

/**
 * Ask a vision-capable model to read a bill image, returning the raw text the
 * provider produced. Providers are swappable via VISION_PROVIDER/VISION_MODEL
 * (see `src/lib/env.ts` and `.env.example`). Server-only — never call from the
 * browser; the API keys stay on the server.
 */
export async function extractBillText(input: {
  mimeType: string;
  base64: string;
}): Promise<VisionResult> {
  const env = getServerEnv();
  const provider = env.VISION_PROVIDER;
  const model = env.VISION_MODEL || DEFAULT_MODELS[provider];

  switch (provider) {
    case "google": {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const data = (await postJson(url, {}, {
        contents: [
          {
            parts: [{ inlineData: { mimeType: input.mimeType, data: input.base64 } }],
          },
        ],
        generationConfig: { temperature: 0 },
        systemInstruction: { parts: [{ text: BILL_EXTRACTION_PROMPT }] },
      })) as { candidates?: { content?: { parts?: unknown[] } }[] };
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const text = parts.map(firstText).filter(Boolean).join("\n");
      return { text, model };
    }

    case "openai": {
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
      const data = (await postJson(
        "https://api.openai.com/v1/chat/completions",
        { Authorization: `Bearer ${apiKey}` },
        {
          model,
          temperature: 0,
          max_tokens: 2048,
          messages: [
            {
              role: "system",
              content: BILL_EXTRACTION_PROMPT,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:${input.mimeType};base64,${input.base64}` },
                },
              ],
            },
          ],
        },
      )) as { choices?: { message?: { content?: unknown } }[] };
      const content = data.choices?.[0]?.message?.content;
      return { text: typeof content === "string" ? content : "", model };
    }

    case "anthropic": {
      const apiKey = env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
      const data = (await postJson(
        "https://api.anthropic.com/v1/messages",
        { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        {
          model,
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: BILL_EXTRACTION_PROMPT },
                {
                  type: "image",
                  source: { type: "base64", media_type: input.mimeType, data: input.base64 },
                },
              ],
            },
          ],
        },
      )) as { content?: unknown[] };
      const text = (data.content ?? []).map(firstText).filter(Boolean).join("\n");
      return { text, model };
    }

    default:
      throw new Error(`Unsupported vision provider: ${provider}`);
  }
}

/** The configured provider name, stored on the bill for transparency. */
export function visionProviderName(): string {
  return getServerEnv().VISION_PROVIDER;
}
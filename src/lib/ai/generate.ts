// Non-streaming JSON/text completion helper. Picks Gemini if a key is configured,
// otherwise falls back to local Ollama. Used for one-shot AI tasks (competency
// generation, quiz building, scenario grading) — distinct from the streaming
// chat route.

import { GoogleGenerativeAI } from "@google/generative-ai";

export type AIProvider = "gemini" | "ollama";

export interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  responseFormat?: "json" | "text";
  // Force a specific provider; otherwise picks based on config
  provider?: AIProvider;
}

export interface GenerateResult {
  text: string;
  provider: AIProvider;
}

export async function generateCompletion(opts: GenerateOptions): Promise<GenerateResult> {
  const provider = opts.provider ?? (process.env.GEMINI_API_KEY ? "gemini" : "ollama");

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    return { text: await generateWithGemini(apiKey, opts), provider };
  }

  return { text: await generateWithOllama(opts), provider };
}

async function generateWithGemini(apiKey: string, opts: GenerateOptions): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: opts.systemPrompt,
    generationConfig:
      opts.responseFormat === "json"
        ? { responseMimeType: "application/json" }
        : undefined,
  });

  const result = await model.generateContent(opts.userPrompt);
  return result.response.text();
}

async function generateWithOllama(opts: GenerateOptions): Promise<string> {
  const ollamaBase = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const ollamaModel = process.env.OLLAMA_MODEL ?? "llama3";

  const res = await fetch(`${ollamaBase}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ollamaModel,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPrompt },
      ],
      stream: false,
      format: opts.responseFormat === "json" ? "json" : undefined,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Ollama error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

// Models occasionally wrap JSON in markdown fences despite responseMimeType.
// Strip them defensively before parsing.
export function parseJSONLoose<T = unknown>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const cleaned = raw
      .replace(/^\s*```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    return JSON.parse(cleaned) as T;
  }
}

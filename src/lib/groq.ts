/**
 * Groq AI client — OpenAI-compatible chat completions over raw fetch.
 *
 * Reads GROQ_API_KEY from the environment. When the key is missing (or still a
 * placeholder) the client degrades gracefully: every call returns
 * { ok: false, disabled: true } so the UI can render an "AI not configured"
 * banner instead of crashing.
 *
 * Default model: llama-3.1-8b-instant (fast, generous free tier). Override
 * with GROQ_MODEL.
 *
 * Deliberately dependency-free: we hit the Groq REST endpoint directly so no
 * extra npm package is required.
 */

const BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqChatOptions {
  messages: GroqMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface GroqChatResult {
  ok: boolean;
  content?: string;
  disabled?: boolean;
  error?: string;
  model?: string;
}

function getApiKey(): string | undefined {
  return process.env.GROQ_API_KEY;
}

function isConfigured(apiKey?: string): boolean {
  return Boolean(
    apiKey &&
      apiKey.trim().length > 0 &&
      !apiKey.includes("your_groq") &&
      !apiKey.includes("gsk_...") &&
      !apiKey.includes("placeholder")
  );
}

let clientWarningLogged = false;

/**
 * Send a chat completion to Groq. Returns the assistant message content.
 */
export async function groqChat(options: GroqChatOptions): Promise<GroqChatResult> {
  const apiKey = getApiKey();
  if (!isConfigured(apiKey)) {
    if (!clientWarningLogged) {
      clientWarningLogged = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[ai] GROQ_API_KEY is not configured — AI features are disabled. " +
          "Set GROQ_API_KEY in .env (get a free key at https://console.groq.com/keys)."
      );
    }
    return { ok: false, disabled: true, error: "GROQ_API_KEY is not configured." };
  }

  const model = options.model ?? process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
  const body = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.3,
    max_completion_tokens: options.maxTokens ?? 900,
    ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
  };

  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      // Server-side (Node) runtime. Abort after 30s so a slow model never hangs a request.
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Groq API error (${res.status}): ${errText.slice(0, 400)}`,
      };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { ok: false, error: "Groq returned an empty response." };
    }

    return { ok: true, content, model };
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.message?.includes("aborted")) {
      return { ok: false, error: "Groq request timed out. Please try again." };
    }
    return { ok: false, error: err?.message || "Groq request failed." };
  }
}

/**
 * Convenience wrapper: requests JSON output and parses it.
 */
export async function groqJson<T = any>(
  options: Omit<GroqChatOptions, "jsonMode">
): Promise<{ ok: boolean; data?: T; disabled?: boolean; error?: string }> {
  const result = await groqChat({ ...options, jsonMode: true });
  if (!result.ok || !result.content) {
    return { ok: false, disabled: result.disabled, error: result.error };
  }
  try {
    const data = JSON.parse(result.content) as T;
    return { ok: true, data };
  } catch (err: any) {
    return {
      ok: false,
      error: `Failed to parse AI JSON response: ${err?.message || String(err)}`,
    };
  }
}

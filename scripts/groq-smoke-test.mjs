// Live smoke test for the Groq integration using the same request shape as src/lib/groq.ts
// Reads GROQ_API_KEY/GROQ_MODEL from .env, sends a json_mode chat completion, prints result.
import { readFileSync } from "node:fs";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const key = env.match(/^GROQ_API_KEY="(.+)"/m)?.[1];
const model = env.match(/^GROQ_MODEL="(.+)"/m)?.[1];
if (!key) {
  console.error("NO_KEY");
  process.exit(1);
}

const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model,
    messages: [
      {
        role: "system",
        content: "Respond only with valid JSON.",
      },
      {
        role: "user",
        content:
          'You are triaging an AICTE grievance. Return a JSON object with exactly these keys: ok (boolean true), model (string "smoke"), riskFlags (array with one short string item).',
      },
    ],
    temperature: 0.3,
    // Stress-test the tightest app-side budget with reasoning effort low.
    max_completion_tokens: 512,
    reasoning_effort: "low",
    response_format: { type: "json_object" },
  }),
});

console.log("HTTP", res.status);
const data = await res.json();
if (data.error) {
  console.log("ERROR:", JSON.stringify(data.error));
} else {
  console.log("MODEL:", data.model);
  console.log("CONTENT:", data.choices?.[0]?.message?.content);
}

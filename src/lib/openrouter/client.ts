// Minimal OpenRouter chat-completions client. A web-search-capable model
// (Perplexity Sonar, or any model with the `:online` suffix) does the live web
// research and synthesis in a single call — this is the "AI plugin" that powers
// the company Deep Dive. Server-only (the key never reaches the browser).

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function openRouterChat({
  apiKey,
  model,
  system,
  user,
}: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
}): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // Optional attribution headers recommended by OpenRouter.
      // NB: header values must be Latin-1 (ASCII here) — no em dashes etc.
      "HTTP-Referer": "https://cdgleisure.com",
      "X-Title": "CDG CRM Deep Dive",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `OpenRouter request failed (${res.status}). ${text.slice(0, 300)}`.trim(),
    );
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenRouter returned an empty response.");
  }
  return content.trim();
}

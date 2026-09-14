const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    likely_cause: { type: "string" },
    try_this: { type: "string" },
    steps: { type: "array", items: { type: "string" } },
  },
  required: ["likely_cause", "try_this", "steps"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI is not configured" }, 500);

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const typed = String(payload.typed ?? "").slice(0, 120);
  const normalized = String(payload.normalized ?? "").slice(0, 120);
  const kind = String(payload.kind ?? "unknown");
  const changed = Boolean(payload.changed);
  const errorMessage = String(payload.errorMessage ?? "").slice(0, 300);

  const prompt = [
    "A user of a Nigerian mobile money app could not sign in.",
    `Credential type detected: ${kind}.`,
    `Exactly what they typed (between pipes): |${typed}|`,
    `After the app cleaned it up (between pipes): |${normalized}|`,
    `Cleaning changed the value: ${changed ? "yes" : "no"}.`,
    `Error the app showed: "${errorMessage}"`,
    "",
    "Explain the single most likely reason their details did not match the account:",
    "for example extra spaces, capital letters, a wrong or missing country code on a phone number,",
    "a typo in the domain (gmial.com, gmail.con), a different email than the one used at registration,",
    "or simply a wrong password when the typed value already looks clean.",
    "Never say the password is correct or incorrect with certainty.",
    "Write for someone who is not technical, in short simple English.",
    "Give 2 to 4 concrete steps they can do on their phone right now.",
  ].join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: prompt,
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        text: {
          format: {
            type: "json_schema",
            name: "login_help",
            strict: true,
            schema: SCHEMA,
          },
        },
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      const status = res.status === 429 || res.status === 402 ? res.status : 502;
      return json({ error: "AI unavailable", status: res.status, detail: detail.slice(0, 300) }, status);
    }

    // Read the SSE stream and accumulate the answer text.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const evt = JSON.parse(raw);
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            text += evt.delta;
          } else if (evt.type === "response.completed" && !text) {
            text = evt.response?.output_text ?? "";
          }
        } catch {
          // ignore keep-alive / partial frames
        }
      }
    }

    const parsed = JSON.parse(text);
    return json({
      likely_cause: String(parsed.likely_cause ?? ""),
      try_this: String(parsed.try_this ?? ""),
      steps: Array.isArray(parsed.steps) ? parsed.steps.map(String).slice(0, 4) : [],
    });
  } catch (e) {
    console.error("login-help failed", e);
    return json({ error: "Could not analyse the sign-in problem" }, 500);
  }
});

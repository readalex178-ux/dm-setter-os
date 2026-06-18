// extension-analyze — the single "bridge" endpoint for the DM Setter OS Chrome extension.
// The extension only extracts raw conversation data and POSTs it here. ALL business logic
// (scoring, stage detection, objection detection, reply generation, coaching) runs server-side.
import { loadContext } from "../_shared/context.ts";
import { getAuthUser, unauthorized } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ExtMessage {
  sender?: string;
  content?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Robust JSON extraction from a model response.
function parseJSON(raw: string): any {
  if (!raw?.trim()) throw new Error("Empty AI response");
  let text = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = text.search(/[[{]/);
  if (start > 0) text = text.slice(start);
  const lastClose = Math.max(text.lastIndexOf("]"), text.lastIndexOf("}"));
  if (lastClose >= 0) text = text.slice(0, lastClose + 1);
  return JSON.parse(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { user: authUser } = await getAuthUser(req);
    if (!authUser) return unauthorized(corsHeaders);

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const platform: string = typeof body.platform === "string" ? body.platform : "unknown";
    const name: string = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Unknown";
    const rawMessages: ExtMessage[] = Array.isArray(body.messages) ? body.messages : [];

    // ── Input validation ──────────────────────────────────────────────
    const messages = rawMessages
      .filter((m) => m && typeof m.content === "string" && m.content.trim())
      .slice(-60)
      .map((m) => ({
        sender: m.sender === "setter" ? "setter" : "prospect",
        content: String(m.content).trim().slice(0, 1000),
      }));

    if (messages.length === 0) {
      return json({ error: "No conversation messages provided." }, 400);
    }

    const transcript = messages
      .map((m) => `${m.sender === "setter" ? "Setter (you)" : name}: ${m.content}`)
      .join("\n");

    // Inject the user's knowledge base (offer, ICP, objections, FAQ, examples).
    const knowledge = await loadContext(req);

    const system = `You are the AI analysis engine inside DM Setter OS, an operating system for professional DM setters.
You analyse a sales DM conversation and return a single, complete JSON object. You NEVER send messages — you only advise the human setter.

Methodology:
- Stages: New Lead → Rapport → Discovery → Qualifying (BANT) → Objection Handling → Call Booking → Booked.
- BANT = Budget, Authority, Need, Timeline.
- Temperature: "hot" (ready to book / strong intent), "warm" (engaged, needs nurture), "cold" (low intent / unresponsive).

Return ONLY valid JSON in EXACTLY this shape, no markdown, no commentary:
{
  "conversation_score": <0-100 overall quality/health of how the setter is running this conversation>,
  "booking_probability": <0-100 likelihood this prospect books a call soon>,
  "temperature": "hot" | "warm" | "cold",
  "stage": "<current stage from the list above>",
  "intent": "<1 short sentence describing what the prospect actually wants or is looking for>",
  "objections": ["<short objection detected>", ...],
  "next_action": "<one concrete, specific next step the setter should take>",
  "summary": "<1-2 sentence read on where this conversation stands>",
  "replies": [
    {"label": "<tone label e.g. Direct, Empathetic, Value-led, Follow-up, Urgency>", "content": "<exact message the setter could send>", "note": "<1 sentence why this works>"}
  ]
}
Provide exactly 5 reply options spanning different tones and angles (e.g. Direct, Empathetic, Value-led, Follow-up, Urgency). If no objections are present, return an empty array for "objections".`;

    const userPrompt = `Platform: ${platform}
Prospect: ${name}
${knowledge ? `\n${knowledge}\n` : ""}
Conversation (most recent last):
${transcript}

Analyse this conversation and return the JSON object.`;

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-flash-1.5:free",
        max_tokens: 1800,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (aiRes.status === 429) return json({ error: "Rate limit exceeded — try again shortly." }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits exhausted. Add credits in the app." }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      return json({ error: `AI engine error (${aiRes.status})` }, 502);
    }

    const data = await aiRes.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    let analysis: any;
    try {
      analysis = parseJSON(content);
    } catch (e) {
      console.error("Parse error:", e, content);
      return json({ error: "Could not parse AI analysis. Try again." }, 502);
    }

    // Normalise / guard the response.
    const clamp = (n: any) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
    const result = {
      conversation_score: clamp(analysis.conversation_score),
      booking_probability: clamp(analysis.booking_probability),
      temperature: ["hot", "warm", "cold"].includes(analysis.temperature) ? analysis.temperature : "warm",
      stage: typeof analysis.stage === "string" ? analysis.stage : "New Lead",
      intent: typeof analysis.intent === "string" ? analysis.intent.slice(0, 300) : "",
      objections: Array.isArray(analysis.objections)
        ? analysis.objections.filter((o: any) => typeof o === "string").slice(0, 6)
        : [],
      next_action: typeof analysis.next_action === "string" ? analysis.next_action : "",
      summary: typeof analysis.summary === "string" ? analysis.summary : "",
      replies: Array.isArray(analysis.replies)
        ? analysis.replies
            .filter((r: any) => r && typeof r.content === "string")
            .slice(0, 5) // ← updated from 3 to 5
            .map((r: any) => ({
              label: String(r.label || "Reply").slice(0, 40),
              content: String(r.content).slice(0, 1200),
              note: String(r.note || "").slice(0, 240),
            }))
        : [],
    };

    return json(result);
  } catch (e) {
    console.error("extension-analyze error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

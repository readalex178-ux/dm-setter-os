import { getAuthUser, unauthorized } from "../_shared/auth.ts";
import { loadContext } from "../_shared/context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user } = await getAuthUser(req);
    if (!user) return unauthorized(corsHeaders);

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    const { messages = [], prospect = {}, prospectId } = await req.json();

    const offerContext = await loadContext(req, { prospectId });

    const convoText = messages
      .map((m: any) => `${m.sender === "setter" ? "Setter" : "Prospect"}: ${m.content}`)
      .join("\n");

    const systemPrompt = `You are an expert DM setter AI co-pilot for high-ticket sales, coaching a setter in real time.${offerContext}

TASK:
Generate exactly 3 distinct reply options the setter could send next. Each option should take a different angle (for example: a discovery/question angle, a rapport/empathy angle, and a call-transition/booking angle) and should:
- Match the prospect's current stage and energy
- Sound natural, human, and conversational (not salesy)
- Be concise (under 50 words each)
- Move the conversation forward toward qualification or booking

Respond with ONLY a single JSON array (no markdown, no code fences, no explanation) of exactly 3 objects matching this exact shape:
[{"type": string (a short 1-3 word label for the angle, e.g. "Discovery", "Rapport", "Call Transition"), "content": string (the actual reply text to send), "coaching_note": string (one short sentence explaining why this reply works)}]`;

    const userPrompt = `Prospect info:
- Name: ${prospect.name || "Unknown"}
- Current stage: ${prospect.stage || "Unknown"}
- Intent level: ${prospect.intentLevel || "Unknown"}
- Motivation: ${prospect.motivation || "Unknown"}
- Concerns: ${prospect.concerns || "None noted"}
- Call readiness: ${prospect.callReadiness ?? "Unknown"}
- Lead score: ${prospect.leadScore ?? "Unknown"}

Conversation so far:
${convoText || "(no messages yet — this is the opening)"}

Generate the 3 reply options now as the JSON array described.`;

    const model = Deno.env.get("OPENROUTER_MODEL") || "openai/gpt-4o-mini";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://dm-wingman-pro.vercel.app",
        "X-Title": "DM Setter OS",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Check your OpenRouter account balance." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error("No response from AI");

    let suggestions: Array<{ type: string; content: string; coaching_note: string }> = [];
    try {
      // Models occasionally wrap JSON in a markdown code fence despite instructions.
      const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        suggestions = parsed
          .filter((s: any) => s && typeof s.content === "string" && s.content.trim())
          .map((s: any) => ({
            type: typeof s.type === "string" && s.type.trim() ? s.type : "Suggestion",
            content: s.content,
            coaching_note: typeof s.coaching_note === "string" ? s.coaching_note : "",
          }))
          .slice(0, 3);
      }
    } catch (e) {
      console.error("suggest-replies: failed to parse AI response", e, raw);
      throw new Error("Could not parse AI response");
    }

    if (suggestions.length === 0) throw new Error("AI returned no usable suggestions");

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-replies error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

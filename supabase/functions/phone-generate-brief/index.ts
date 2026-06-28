import { loadContext } from "../_shared/context.ts";
import { getAuthUser, unauthorized } from "../_shared/auth.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, rateLimited } from "../_shared/rateLimit.ts";

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user } = await getAuthUser(req);
    if (!user) return unauthorized(corsHeaders);

    if (!(await checkRateLimit(user.id, "phone-generate-brief"))) return rateLimited(corsHeaders);

    const { prospect = {} } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    const offerContext = await loadContext(req, { prospectId: prospect.id });

    const systemPrompt = `You are an expert phone-sales coach preparing a setter for an outbound call using the BANT framework (Budget, Authority, Need, Timeline). Given a prospect's CRM profile, produce a concise pre-call brief: the strongest talking points to open with, the most likely objections (with a recommended response for each), and what specifically still needs to be qualified on this call. Be concrete and specific to this prospect — avoid generic filler.${offerContext}

Respond with ONLY a single JSON object (no markdown, no code fences, no explanation) matching this exact shape:
{"talkingPoints": string[] (3-5 items), "likelyObjections": [{"objection": string, "response": string}] (2-4 items), "qualifyOn": string[] (2-4 items, what BANT info is still missing or unconfirmed), "bant": {"budget": {"score": number (0-100), "evidence": string}, "authority": {"score": number, "evidence": string}, "need": {"score": number, "evidence": string}, "timeline": {"score": number, "evidence": string}}}`;

    const userPrompt = `Prospect profile:
- Name: ${prospect.name || "Unknown"}
- Current pipeline stage: ${prospect.stage || "Unknown"}
- Phone-setting stage: ${prospect.phone_stage || "New Lead"}
- Current job: ${prospect.current_job || "Unknown"}
- Income goal: ${prospect.income_goal || "Unknown"}
- Time availability: ${prospect.time_availability || "Unknown"}
- Stated motivation: ${prospect.motivation || "Unknown"}
- Stated concerns: ${prospect.concerns || "None noted"}
- Lead score: ${prospect.lead_score ?? "Unknown"}
- Call readiness: ${prospect.call_readiness ?? "Unknown"}
- Lead temperature: ${prospect.lead_temperature || "Unknown"}
- Existing notes: ${prospect.notes || "None"}

Produce the pre-call brief JSON described: talking points, likely objections with responses, what to qualify on this call, and a BANT assessment based on everything known so far.`;

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
        max_tokens: 700,
        temperature: 0.4,
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Check your OpenRouter account balance." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) throw new Error("No response from AI");

    let brief: Record<string, unknown>;
    try {
      // Models occasionally wrap JSON in a markdown code fence despite instructions.
      const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
      brief = JSON.parse(cleaned);
    } catch {
      throw new Error("Could not parse AI response");
    }

    return new Response(JSON.stringify({ brief }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("phone-generate-brief error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { loadContext } from "../_shared/context.ts";
import { getAuthUser, unauthorized } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STAGES = [
  "New Lead",
  "Discovery",
  "Qualification",
  "Interested",
  "Objection Handling",
  "Ready for Call",
  "Call Booked",
  "Not Qualified",
  "Cold Lead",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user } = await getAuthUser(req);
    if (!user) return unauthorized(corsHeaders);

    const { messages = [], prospect = {} } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    const offerContext = await loadContext(req);

    const convoText = messages
      .map((m: any) => `${m.sender === "setter" ? "Setter" : "Prospect"}: ${m.content}`)
      .join("\n");

    const systemPrompt = `You are an expert DM sales coach using the BANT framework (Budget, Authority, Need, Timeline). Analyze a conversation between a setter and a prospect to determine the prospect's true pipeline stage. Be honest and evidence-based — quote directly from the conversation when possible.${offerContext}

Respond with ONLY a single JSON object (no markdown, no code fences, no explanation) matching this exact shape:
{"suggestedStage": one of [${STAGES.map((s) => `"${s}"`).join(", ")}], "confidence": number (0-100), "reasoning": string (1-2 sentences), "bant": {"budget": {"score": number (0-100), "evidence": string}, "authority": {"score": number, "evidence": string}, "need": {"score": number, "evidence": string}, "timeline": {"score": number, "evidence": string}}, "nextAction": string}`;

    const userPrompt = `Prospect info:
- Name: ${prospect.name || "Unknown"}
- Current stage: ${prospect.stage || "Unknown"}
- Current job: ${prospect.currentJob || "Unknown"}
- Income goal: ${prospect.incomeGoal || "Unknown"}
- Stated motivation: ${prospect.motivation || "Unknown"}
- Stated concerns: ${prospect.concerns || "None noted"}

Conversation:
${convoText || "(no messages yet)"}

Analyze and return the JSON object described: suggested stage, confidence, BANT scores with quoted evidence, reasoning, and the recommended next action.`;

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

    let analysis: Record<string, unknown>;
    try {
      // Models occasionally wrap JSON in a markdown code fence despite instructions.
      const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
      analysis = JSON.parse(cleaned);
    } catch {
      throw new Error("Could not parse AI response");
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-stage error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

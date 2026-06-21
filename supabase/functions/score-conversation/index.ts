import { createClient } from "npm:@supabase/supabase-js@2";
import { loadContext } from "../_shared/context.ts";
import { getAuthUser, unauthorized } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STAGES = [
  "New Lead", "Discovery", "Qualification", "Interested", "Objection Handling",
  "Ready for Call", "Call Booked", "Not Qualified", "Cold Lead",
];

const MEMORY_CATEGORIES = ["goal", "pain", "budget", "family", "availability", "objection", "interest"];

async function callAI(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
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
      max_tokens: 900,
      temperature: 0.4,
    }),
  });
  if (response.status === 429) return { error: "Rate limit exceeded, please try again shortly.", status: 429 };
  if (response.status === 402) return { error: "AI credits exhausted. Check your OpenRouter account balance.", status: 402 };
  if (!response.ok) {
    const t = await response.text();
    console.error("AI gateway error:", response.status, t);
    return { error: `AI gateway error: ${response.status}`, status: 500 };
  }
  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) return { error: "No response from AI", status: 500 };
  try {
    // Models occasionally wrap JSON in a markdown code fence despite instructions.
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    return { result: JSON.parse(cleaned) };
  } catch {
    return { error: "Could not parse AI response", status: 500 };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user } = await getAuthUser(req);
    if (!user) return unauthorized(corsHeaders);

    const { prospectId, mode = "score" } = await req.json();
    if (!prospectId) {
      return new Response(JSON.stringify({ error: "prospectId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");
    const model = Deno.env.get("OPENROUTER_MODEL") || "openai/gpt-4o-mini";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Ownership check + load data
    const { data: prospect } = await admin.from("prospects").select("*").eq("id", prospectId).maybeSingle();
    if (!prospect || prospect.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Prospect not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: msgs } = await admin.from("messages").select("sender, content, sent_at")
      .eq("prospect_id", prospectId).order("sent_at", { ascending: true });

    const convoText = (msgs || [])
      .map((m: any) => `${m.sender === "setter" ? "Setter" : "Prospect"}: ${m.content}`)
      .join("\n") || "(no messages yet)";

    const offerContext = await loadContext(req);
    const prospectInfo = `Prospect: ${prospect.name} | Stage: ${prospect.stage} | Job: ${prospect.current_job || "?"} | Income goal: ${prospect.income_goal || "?"} | Motivation: ${prospect.motivation || "?"} | Concerns: ${prospect.concerns || "?"}`;

    if (mode === "review") {
      const sys = `You are an elite DM-setting coach. Review the setter's handling of this conversation honestly and constructively. Quote specifics where possible.${offerContext}

Respond with ONLY a single JSON object (no markdown, no code fences, no explanation) matching this exact shape:
{"grade": string (letter grade A-F), "overallNote": string (2-3 sentence honest summary), "strengths": string[], "weaknesses": string[], "missedQualification": string[] (qualification questions/opportunities missed), "missedObjections": string[] (objections raised by the prospect not handled well), "improvements": string[], "alternativeResponses": [{"context": string, "suggestion": string}]}`;
      const usr = `${prospectInfo}\n\nConversation:\n${convoText}\n\nReturn the JSON object described.`;
      const out = await callAI(OPENROUTER_API_KEY, model, sys, usr);
      if (out.error) return new Response(JSON.stringify({ error: out.error }),
        { status: out.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ review: out.result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // mode === "score"
    const sys = `You are an expert DM sales analyst. Score the conversation health and booking likelihood, classify lead temperature and stage, recommend the next action, and extract durable prospect memory (goals, pains, budget, family, availability, objections, interests). Be evidence-based.${offerContext}

Respond with ONLY a single JSON object (no markdown, no code fences, no explanation) matching this exact shape:
{"conversationScore": number (0-100, overall quality/health of the conversation), "bookingProbability": number (0-100, likelihood this becomes a booked call), "leadTemperature": one of ["Hot", "Warm", "Cold"], "suggestedStage": one of [${STAGES.map((s) => `"${s}"`).join(", ")}], "stageConfidence": number (0-100), "suggestedAction": string (one concrete next move for the setter), "memory": [{"category": one of [${MEMORY_CATEGORIES.map((c) => `"${c}"`).join(", ")}], "detail": string (concise fact, e.g. 'Wants to replace $5k/mo job income')}]}`;
    const usr = `${prospectInfo}\n\nConversation:\n${convoText}\n\nReturn the JSON object described.`;
    const out = await callAI(OPENROUTER_API_KEY, model, sys, usr);
    if (out.error) return new Response(JSON.stringify({ error: out.error }),
      { status: out.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const s = out.result;

    // Persist scoring on the prospect
    await admin.from("prospects").update({
      conversation_score: s.conversationScore,
      booking_probability: s.bookingProbability,
      lead_temperature: s.leadTemperature,
      stage_suggested: s.suggestedStage,
      stage_confidence: s.stageConfidence,
      suggested_action: s.suggestedAction,
      last_scored_at: new Date().toISOString(),
    }).eq("id", prospectId);

    // Refresh prospect memory (replace previous AI-sourced rows)
    if (Array.isArray(s.memory) && s.memory.length > 0) {
      await admin.from("prospect_memory").delete().eq("prospect_id", prospectId).eq("source", "ai");
      const rows = s.memory
        .filter((m: any) => m.category && m.detail)
        .map((m: any) => ({ user_id: user.id, prospect_id: prospectId, category: m.category, detail: m.detail, source: "ai" }));
      if (rows.length) await admin.from("prospect_memory").insert(rows);
    }

    return new Response(JSON.stringify({ scoring: s }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("score-conversation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

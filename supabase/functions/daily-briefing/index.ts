import { createClient } from "npm:@supabase/supabase-js@2";
import { getAuthUser, unauthorized } from "../_shared/auth.ts";
import { loadContext } from "../_shared/context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STALE_DAYS = 3;
const ACTIVE_STAGES = ["New Lead", "Discovery", "Qualification", "Interested", "Objection Handling", "Ready for Call"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user } = await getAuthUser(req);
    if (!user) return unauthorized(corsHeaders);

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const [prospectsRes, kpisRes] = await Promise.all([
      supabase.from("prospects").select("name,stage,lead_score,call_readiness,last_contact_at,concerns"),
      supabase.from("daily_kpis").select("*").order("date", { ascending: false }).limit(7),
    ]);

    const prospects = prospectsRes.data || [];
    const kpis = kpisRes.data || [];
    const now = Date.now();

    // Follow-up queue: active prospects not contacted in STALE_DAYS
    const followUps = prospects.filter((p: any) => {
      if (!ACTIVE_STAGES.includes(p.stage)) return false;
      if (!p.last_contact_at) return true;
      return (now - new Date(p.last_contact_at).getTime()) / 86400000 >= STALE_DAYS;
    });

    // Pipeline distribution
    const stageCounts: Record<string, number> = {};
    for (const p of prospects) stageCounts[p.stage] = (stageCounts[p.stage] || 0) + 1;

    // Concern / objection patterns
    const concerns = prospects.map((p: any) => p.concerns).filter(Boolean);

    // KPI summary (last day vs avg)
    const today = kpis[0] || {};
    const avg = (key: string) =>
      kpis.length ? Math.round(kpis.reduce((s: number, k: any) => s + (k[key] || 0), 0) / kpis.length) : 0;

    const offerContext = await loadContext(req);

    const dataSummary = `
PIPELINE: ${prospects.length} total prospects. Distribution: ${JSON.stringify(stageCounts)}.
FOLLOW-UP QUEUE: ${followUps.length} active prospects not contacted in ${STALE_DAYS}+ days: ${followUps.slice(0, 10).map((p: any) => p.name).join(", ") || "none"}.
TODAY'S KPIs: DMs sent ${today.dms_sent ?? 0}, calls booked ${today.calls_booked ?? 0}, conversions ${today.conversions_to_qualified ?? 0}, objections handled ${today.objections_handled ?? 0}.
7-DAY AVG: DMs ${avg("dms_sent")}, booked ${avg("calls_booked")}, conversions ${avg("conversions_to_qualified")}.
COMMON CONCERNS RAISED: ${concerns.slice(0, 15).join(" | ") || "none recorded"}.
`;

    const systemPrompt = `You are an elite DM-setting sales manager giving your setter a concise end-of-day briefing. Be specific, direct, and actionable — like a top 1% coach. Use the setter's real numbers. Prioritise the highest-leverage actions for tomorrow.${offerContext}

Respond with ONLY a single JSON object (no markdown, no code fences, no explanation) matching this exact shape:
{"headline": string, "wins": string[] (1-3 items), "concerns": string[] (1-3 items), "priority_actions": string[] (3-5 items, most important first), "objection_insight": string}`;

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
          { role: "user", content: `Here is today's performance data:\n${dataSummary}\nGive me my daily briefing as the JSON object described.` },
        ],
        max_tokens: 700,
        temperature: 0.6,
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

    let parsed: Record<string, unknown>;
    try {
      // Models occasionally wrap JSON in a markdown code fence despite instructions.
      const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Could not parse AI response");
    }

    return new Response(JSON.stringify({ ...parsed, followUpCount: followUps.length, totalProspects: prospects.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-briefing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

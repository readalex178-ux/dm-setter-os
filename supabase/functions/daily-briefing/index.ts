import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthUser, unauthorized } from "../_shared/auth.ts";
import { loadContext } from "../_shared/context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STALE_DAYS = 3;
const ACTIVE_STAGES = ["New Lead", "Discovery", "Qualification", "Interested", "Objection Handling", "Ready for Call"];

serve(async (req) => {
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

    const systemPrompt = `You are an elite DM-setting sales manager giving your setter a concise end-of-day briefing. Be specific, direct, and actionable — like a top 1% coach. Use the setter's real numbers. Prioritise the highest-leverage actions for tomorrow.${offerContext}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-flash-1.5:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is today's performance data:\n${dataSummary}\nGive me my daily briefing.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "daily_briefing",
            description: "Return a structured end-of-day briefing for the setter",
            parameters: {
              type: "object",
              properties: {
                headline: { type: "string", description: "One-sentence summary of the day" },
                wins: { type: "array", items: { type: "string" }, description: "1-3 things that went well" },
                concerns: { type: "array", items: { type: "string" }, description: "1-3 metrics or patterns that need attention" },
                priority_actions: { type: "array", items: { type: "string" }, description: "3-5 specific actions for tomorrow, most important first" },
                objection_insight: { type: "string", description: "One insight about the objection/concern patterns and how to handle them better" },
              },
              required: ["headline", "wins", "concerns", "priority_actions", "objection_insight"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "daily_briefing" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("No structured response from AI");
    const parsed = JSON.parse(toolCall.function.arguments);

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

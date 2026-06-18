import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });

    const today = new Date().toISOString().split("T")[0];
    const [prospectsRes, kpisRes, trainingRes] = await Promise.all([
      supabase.from("prospects").select("id, name, stage, platform, updated_at").order("updated_at", { ascending: false }).limit(10),
      supabase.from("daily_kpis").select("*").eq("date", today).single(),
      supabase.from("training_attempts").select("score, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

    const prospects = prospectsRes.data || [];
    const kpis = kpisRes.data || {};
    const training = trainingRes.data || [];

    const body = await req.json().catch(() => ({}));
    const { userName = "Setter" } = body;

    const model = Deno.env.get("OPENROUTER_MODEL") || "openai/gpt-4o-mini";

    const stageCounts = {};
    prospects.forEach((p) => {
      const s = p.stage || "unknown";
      stageCounts[s] = (stageCounts[s] || 0) + 1;
    });

    const avgScore = training.length > 0
      ? Math.round(training.reduce((a, t) => a + (t.score || 0), 0) / training.length)
      : null;

    const prompt = `You are an AI daily briefing assistant for ${userName}, a DM setter.

TODAY'S DATA (${today}):

PIPELINE:
${Object.entries(stageCounts).map(([stage, count]) => `- ${stage}: ${count} prospects`).join("\n") || "- No prospects yet"}
Total active prospects: ${prospects.length}

TODAY'S KPIs:
- DMs sent: ${kpis.dms_sent || 0}
- Replies received: ${kpis.replies_received || 0}
- Calls booked: ${kpis.calls_booked || 0}
- Deals closed: ${kpis.deals_closed || 0}

RECENT TRAINING:
${avgScore !== null ? `- Recent average score: ${avgScore}/100 (${training.length} sessions)` : "- No recent training sessions"}

Generate a sharp, motivating daily briefing in 3-4 sentences. Include:
1. One key observation about the pipeline
2. One actionable focus for today based on the data
3. A brief motivational closer

Be direct, specific, and conversational. Use the actual numbers. No fluff.`;

    const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
        "HTTP-Referer": "https://dm-wingman-pro.vercel.app",
        "X-Title": "DM Setter OS",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.6,
      }),
    });

    if (!orResponse.ok) {
      const err = await orResponse.text();
      return new Response(JSON.stringify({ error: "AI error", detail: err }), { status: 502, headers: CORS });
    }

    const orData = await orResponse.json();
    const briefing = orData.choices?.[0]?.message?.content || "No briefing available.";

    return new Response(JSON.stringify({ briefing, date: today, stats: { prospects: prospects.length, stageCounts, kpis, avgTrainingScore: avgScore } }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});

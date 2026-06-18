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

    const body = await req.json();
    const { messages = [], scenario, offer, icp, attemptId } = body;

    const model = Deno.env.get("OPENROUTER_MODEL") || "openai/gpt-4o-mini";

    const setterMessages = messages.filter((m) => m.role === "user");

    const prompt = `You are an expert DM sales coach grading a training roleplay session.

SCENARIO: ${scenario || "Cold DM outreach"}
OFFER: ${offer?.name || "Unknown"} - ${offer?.description || ""}
TARGET ICP: ${icp?.demographics || "Unknown"}

FULL CONVERSATION:
${messages.map((m) => `${m.role === "user" ? "SETTER" : "PROSPECT"}: ${m.content}`).join("\n")}

SETTER STATS:
- Total messages sent: ${setterMessages.length}
- Average message length: ${setterMessages.length > 0 ? Math.round(setterMessages.reduce((a, m) => a + (m.content?.length || 0), 0) / setterMessages.length) : 0} chars

Grade this setter on these criteria (each out of 20 points):
1. OPENING (20pts): Did they hook attention without being salesy or pitching too early?
2. RAPPORT (20pts): Did they show genuine interest, use the prospect's name, personalise their approach?
3. QUALIFICATION (20pts): Did they ask smart questions to uncover pain, goals, and fit?
4. OBJECTION HANDLING (20pts): Did they handle pushback with empathy and redirect?
5. CALL TO ACTION (20pts): Did they guide toward the next step naturally?

Respond ONLY with this JSON:
{
  "totalScore": <0-100>,
  "breakdown": {
    "opening": <0-20>,
    "rapport": <0-20>,
    "qualification": <0-20>,
    "objectionHandling": <0-20>,
    "callToAction": <0-20>
  },
  "strengths": ["<specific thing done well>", "<another>"],
  "improvements": ["<specific thing to fix>", "<another>"],
  "topTip": "<single most important coaching tip from this session>",
  "grade": "<A/B/C/D/F>"
}`;

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
        max_tokens: 500,
        temperature: 0.4,
      }),
    });

    if (!orResponse.ok) {
      const err = await orResponse.text();
      return new Response(JSON.stringify({ error: "AI error", detail: err }), { status: 502, headers: CORS });
    }

    const orData = await orResponse.json();
    const content = orData.choices?.[0]?.message?.content || "{}";

    let scoreData = {};
    try {
      scoreData = JSON.parse(content);
    } catch {
      scoreData = {
        totalScore: 50,
        breakdown: { opening: 10, rapport: 10, qualification: 10, objectionHandling: 10, callToAction: 10 },
        strengths: ["Completed the session"],
        improvements: ["Keep practicing"],
        topTip: "Focus on asking more qualifying questions before pitching.",
        grade: "C",
      };
    }

    if (attemptId && scoreData.totalScore !== undefined) {
      await supabase
        .from("training_attempts")
        .update({ score: scoreData.totalScore, feedback: JSON.stringify(scoreData), completed_at: new Date().toISOString() })
        .eq("id", attemptId);
    }

    return new Response(JSON.stringify(scoreData), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});

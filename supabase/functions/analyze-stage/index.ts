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
    const { prospect, messages = [], offer, icp } = body;

    const model = Deno.env.get("OPENROUTER_MODEL") || "openai/gpt-4o-mini";

    const stages = ["new_lead", "contacted", "replied", "interested", "qualified", "call_booked", "closed_won", "closed_lost", "nurture"];

    const prompt = `You are an expert DM sales analyst. Analyze this prospect conversation and determine their current pipeline stage.

OFFER: ${offer?.name || "Unknown"} - ${offer?.description || ""}
ICP: ${icp?.demographics || "Unknown target profile"}

PROSPECT:
- Name: ${prospect?.name || "Unknown"}
- Platform: ${prospect?.platform || "Unknown"}
- Current stage: ${prospect?.stage || "new_lead"}
- Notes: ${prospect?.notes || "None"}

RECENT CONVERSATION (last 10 messages):
${messages.slice(-10).map((m) => `${m.role === "user" ? "SETTER" : "PROSPECT"}: ${m.content}`).join("\n") || "No conversation yet."}

AVAILABLE STAGES: ${stages.join(", ")}

Stage definitions:
- new_lead: Just discovered, not yet contacted
- contacted: First DM sent, no reply yet
- replied: They've replied at least once
- interested: Showing genuine interest, asking questions
- qualified: Confirmed they meet ICP criteria and have the problem we solve
- call_booked: Call/meeting scheduled
- closed_won: Purchased / became a client
- closed_lost: Said no or went cold
- nurture: Needs more time, follow up in future

Respond with ONLY a JSON object:
{
  "stage": "<stage_name>",
  "confidence": <0-100>,
  "reasoning": "<one sentence why>",
  "nextAction": "<specific next message or action to take>",
  "flags": ["<any concerns like: ghosting risk, price objection pending, etc>"]
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
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!orResponse.ok) {
      const err = await orResponse.text();
      return new Response(JSON.stringify({ error: "AI error", detail: err }), { status: 502, headers: CORS });
    }

    const orData = await orResponse.json();
    const content = orData.choices?.[0]?.message?.content || "{}";

    let analysis = {};
    try {
      analysis = JSON.parse(content);
    } catch {
      const stageMatch = content.match(/"stage"\s*:\s*"([^"]+)"/);
      analysis = {
        stage: stageMatch?.[1] || prospect?.stage || "new_lead",
        confidence: 50,
        reasoning: content.substring(0, 200),
        nextAction: "Continue the conversation",
        flags: [],
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});

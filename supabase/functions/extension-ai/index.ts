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
    const { action, conversationText = "", prospectInfo = {}, offer, icp, scripts = [], objections = [] } = body;

    const model = Deno.env.get("OPENROUTER_MODEL") || "openai/gpt-4o-mini";

    let prompt = "";

    if (action === "suggest_reply") {
      prompt = `You're an AI DM setter assistant. Suggest 3 short reply options for this conversation.

OFFER: ${offer?.name || "Unknown"} - ${offer?.description || ""}
ICP: ${icp?.demographics || "Unknown"}

CONVERSATION:
${conversationText}

PROSPECT INFO:
${JSON.stringify(prospectInfo)}

SCRIPTS TO DRAW FROM:
${scripts.slice(0, 3).map((s) => `[${s.title}]: ${s.content?.substring(0, 100)}`).join("\n") || "None"}

Return ONLY a JSON array of 3 short reply strings (under 40 words each). No markdown, just the array.`;
    } else if (action === "analyze_prospect") {
      prompt = `Analyze this prospect's profile and conversation to determine if they're a good fit.

ICP: ${JSON.stringify(icp || {})}
OFFER: ${offer?.name || "Unknown"} - ${offer?.description || ""}

PROSPECT INFO:
${JSON.stringify(prospectInfo)}

CONVERSATION PREVIEW:
${conversationText.substring(0, 500)}

Return ONLY JSON:
{
  "fitScore": <0-100>,
  "stage": "<new_lead|contacted|replied|interested|qualified|call_booked>",
  "summary": "<2 sentence prospect summary>",
  "nextAction": "<what to do next>"
}`;
    } else if (action === "handle_objection") {
      prompt = `The prospect said: "${body.objection || conversationText}"

OFFER: ${offer?.name || "Unknown"}
SAVED OBJECTION RESPONSES:
${objections.slice(0, 5).map((o) => `- "${o.objection}": ${o.response}`).join("\n") || "None saved"}

Suggest 2 empathetic, non-pushy responses that address this objection and keep the conversation moving.
Return ONLY a JSON array of 2 strings.`;
    } else {
      prompt = `Help with this DM setter task: ${action}\n\nConversation:\n${conversationText}`;
    }

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
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!orResponse.ok) {
      const err = await orResponse.text();
      return new Response(JSON.stringify({ error: "AI error", detail: err }), { status: 502, headers: CORS });
    }

    const orData = await orResponse.json();
    const content = orData.choices?.[0]?.message?.content || "{}";

    let result;
    try { result = JSON.parse(content); } catch { result = { raw: content }; }

    return new Response(JSON.stringify({ result }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});

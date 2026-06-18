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
    const { prospect, messages = [], offer, icp, objections = [], scripts = [], conversationContext = "" } = body;

    const model = Deno.env.get("OPENROUTER_MODEL") || "openai/gpt-4o-mini";

    const systemPrompt = `You are an expert DM setter AI co-pilot for high-ticket sales.

OFFER:
${offer ? `Name: ${offer.name || "Unknown"}
What it is: ${offer.description || ""}
Price: ${offer.price || ""}
Target: ${offer.target_audience || ""}
Main result: ${offer.main_result || ""}` : "No offer defined yet."}

IDEAL CLIENT PROFILE:
${icp ? `Demographics: ${icp.demographics || ""}
Goals: ${icp.goals || ""}
Pain points: ${icp.pain_points || ""}
Language: ${icp.language_patterns || ""}` : "No ICP defined yet."}

OBJECTION RESPONSES:
${objections.slice(0, 5).map((o) => `- Objection: "${o.objection}" → Response: "${o.response}"`).join("\n") || "None saved."}

SCRIPT EXAMPLES:
${scripts.slice(0, 3).map((s) => `[${s.title}]: ${s.content?.substring(0, 150)}`).join("\n") || "None saved."}

TASK:
Generate exactly 3 distinct reply options for the setter to send next. Each reply should:
- Match the prospect's current stage and energy
- Sound natural, human, and conversational (not salesy)
- Be concise (under 50 words each)
- Move the conversation forward toward qualification or booking

Return ONLY a JSON array of 3 strings. No explanation. No markdown. Just the JSON array.`;

    const userPrompt = `PROSPECT:
Name: ${prospect?.name || "Unknown"}
Platform: ${prospect?.platform || "Unknown"}
Stage: ${prospect?.stage || "new_lead"}
Notes: ${prospect?.notes || "None"}

CONVERSATION SO FAR:
${messages.slice(-10).map((m) => `${m.role === "user" ? "SETTER" : "PROSPECT"}: ${m.content}`).join("\n") || "No messages yet. This is the opening."}

${conversationContext ? `CONTEXT: ${conversationContext}` : ""}

Generate 3 reply options now.`;

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
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!orResponse.ok) {
      const err = await orResponse.text();
      return new Response(JSON.stringify({ error: "AI error", detail: err }), { status: 502, headers: CORS });
    }

    const orData = await orResponse.json();
    const content = orData.choices?.[0]?.message?.content || "[]";

    let suggestions = [];
    try {
      suggestions = JSON.parse(content);
    } catch {
      const matches = content.match(/"([^"]{10,})"/g) || [];
      suggestions = matches.slice(0, 3).map((s) => s.slice(1, -1));
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});

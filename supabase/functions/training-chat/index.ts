import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, rateLimited } from "../_shared/rateLimit.ts";

Deno.serve(async (req) => {
  const CORS = buildCorsHeaders(req.headers.get("origin"));
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

    if (!(await checkRateLimit(user.id, "training-chat"))) return rateLimited(CORS);

    const body = await req.json();
    const { messages = [], scenario, offer, icp, scripts = [], objections = [] } = body;

    const model = Deno.env.get("OPENROUTER_MODEL") || "openai/gpt-4o-mini";

    const systemPrompt = `You are a realistic prospect for roleplay sales training. You're simulating a DM conversation so a setter can practice their skills.

SCENARIO: ${scenario || "Cold DM outreach to a potential high-ticket coaching client"}

OFFER CONTEXT (what the setter is selling):
${offer ? `${offer.name}: ${offer.description || ""}. Price: ${offer.price || "unknown"}. For: ${offer.target_audience || ""}` : "Unknown offer - act confused about what's being sold"}

YOUR PROSPECT PERSONA:
${icp ? `- You match this profile: ${icp.demographics || ""}\n- Your goals: ${icp.goals || ""}\n- Your pain points: ${icp.pain_points || ""}` : "You're a skeptical but curious business owner. You're busy and need a good reason to keep talking."}

ROLEPLAY RULES:
1. Stay in character as the prospect at ALL times
2. Start skeptical but become more interested as the setter demonstrates value
3. Use realistic objections naturally (don't throw them all at once)
4. Match the energy of whoever is messaging you
5. If the setter asks great qualifying questions, warm up
6. If they pitch too hard too fast, push back
7. Keep responses SHORT (1-4 sentences) - real DMs are brief
8. Never break character or reveal you're an AI
9. Occasionally use casual language, typos are fine

RESPOND AS THE PROSPECT ONLY. Short, realistic DM responses.`;

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
          ...messages.slice(-20),
        ],
        max_tokens: 250,
        temperature: 0.85,
      }),
    });

    if (!orResponse.ok) {
      const err = await orResponse.text();
      return new Response(JSON.stringify({ error: "AI error", detail: err }), { status: 502, headers: CORS });
    }

    const orData = await orResponse.json();
    const reply = orData.choices?.[0]?.message?.content || "...";

    return new Response(JSON.stringify({ reply, role: "assistant" }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});

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
    const { profileData = {}, conversationText = "", platform = "instagram", offer, icp } = body;

    const model = Deno.env.get("OPENROUTER_MODEL") || "openai/gpt-4o-mini";

    const prompt = `You are an expert DM setter analyst. Analyze this ${platform} profile and determine if they're a good prospect.

OUR OFFER: ${offer?.name || "Unknown"} - ${offer?.description || ""}
Price: ${offer?.price || "Unknown"}
For: ${offer?.target_audience || "Unknown"}

OUR ICP (Ideal Client Profile):
Demographics: ${icp?.demographics || "Unknown"}
Goals: ${icp?.goals || "Unknown"}
Pain points: ${icp?.pain_points || "Unknown"}

PROSPECT'S ${platform.toUpperCase()} PROFILE:
${JSON.stringify(profileData, null, 2)}

${conversationText ? `EXISTING CONVERSATION:\n${conversationText}` : ""}

Analyze and respond with ONLY this JSON:
{
  "fitScore": <0-100, how well they match ICP>,
  "stage": "new_lead",
  "name": "<prospect name from profile>",
  "platform": "${platform}",
  "summary": "<2-3 sentences about who this person is and why they might/might not be a fit>",
  "painPoints": ["<likely pain point>", "<another>"],
  "openingLine": "<a personalised, non-salesy first DM to send this specific person>",
  "flags": ["<any red flags>"],
  "shouldOutreach": <true/false>
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
        temperature: 0.5,
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
      analysis = {
        fitScore: 50, stage: "new_lead", name: profileData.name || "Unknown",
        platform, summary: content.substring(0, 300), painPoints: [],
        openingLine: "Hey! Noticed your profile...", flags: [], shouldOutreach: true,
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});

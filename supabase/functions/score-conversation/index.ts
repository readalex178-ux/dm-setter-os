import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadContext } from "../_shared/context.ts";
import { getAuthUser, unauthorized } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STAGES = [
  "New Lead", "Discovery", "Qualification", "Interested", "Objection Handling",
  "Ready for Call", "Call Booked", "Not Qualified", "Cold Lead",
];

const MEMORY_CATEGORIES = ["goal", "pain", "budget", "family", "availability", "objection", "interest"];

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string, tool: any) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{ type: "function", function: tool }],
      tool_choice: { type: "function", function: { name: tool.name } },
    }),
  });
  if (response.status === 429) return { error: "Rate limit exceeded, please try again shortly.", status: 429 };
  if (response.status === 402) return { error: "AI credits exhausted. Add credits in Settings → Workspace → Usage.", status: 402 };
  if (!response.ok) {
    const t = await response.text();
    console.error("AI gateway error:", response.status, t);
    return { error: `AI gateway error: ${response.status}`, status: 500 };
  }
  const data = await response.json();
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return { error: "No tool call returned by AI", status: 500 };
  return { result: JSON.parse(toolCall.function.arguments) };
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
      const tool = {
        name: "submit_review",
        description: "Submit a full coaching review of the setter's handling of this conversation.",
        parameters: {
          type: "object",
          properties: {
            grade: { type: "string", description: "Letter grade A-F for how the setter handled the conversation." },
            overallNote: { type: "string", description: "2-3 sentence honest summary." },
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: { type: "array", items: { type: "string" } },
            missedQualification: { type: "array", items: { type: "string" }, description: "Qualification questions/opportunities the setter missed." },
            missedObjections: { type: "array", items: { type: "string" }, description: "Objections raised by the prospect that were not handled well." },
            improvements: { type: "array", items: { type: "string" } },
            alternativeResponses: {
              type: "array",
              items: {
                type: "object",
                properties: { context: { type: "string" }, suggestion: { type: "string" } },
                required: ["context", "suggestion"], additionalProperties: false,
              },
            },
          },
          required: ["grade", "overallNote", "strengths", "weaknesses", "improvements"],
          additionalProperties: false,
        },
      };
      const sys = `You are an elite DM-setting coach. Review the setter's handling of this conversation honestly and constructively. Quote specifics where possible.${offerContext}`;
      const usr = `${prospectInfo}\n\nConversation:\n${convoText}`;
      const out = await callAI(LOVABLE_API_KEY, sys, usr, tool);
      if (out.error) return new Response(JSON.stringify({ error: out.error }),
        { status: out.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ review: out.result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // mode === "score"
    const tool = {
      name: "submit_scoring",
      description: "Submit conversation scoring + extracted prospect memory.",
      parameters: {
        type: "object",
        properties: {
          conversationScore: { type: "number", description: "Overall quality/health of the conversation 0-100." },
          bookingProbability: { type: "number", description: "Likelihood this becomes a booked call, 0-100." },
          leadTemperature: { type: "string", enum: ["Hot", "Warm", "Cold"] },
          suggestedStage: { type: "string", enum: STAGES },
          stageConfidence: { type: "number", description: "Confidence in suggested stage 0-100." },
          suggestedAction: { type: "string", description: "One concrete next move for the setter." },
          memory: {
            type: "array",
            description: "Durable facts worth remembering about this prospect.",
            items: {
              type: "object",
              properties: {
                category: { type: "string", enum: MEMORY_CATEGORIES },
                detail: { type: "string", description: "Concise fact, e.g. 'Wants to replace $5k/mo job income'." },
              },
              required: ["category", "detail"], additionalProperties: false,
            },
          },
        },
        required: ["conversationScore", "bookingProbability", "leadTemperature", "suggestedStage", "stageConfidence", "suggestedAction", "memory"],
        additionalProperties: false,
      },
    };
    const sys = `You are an expert DM sales analyst. Score the conversation health and booking likelihood, classify lead temperature and stage, recommend the next action, and extract durable prospect memory (goals, pains, budget, family, availability, objections, interests). Be evidence-based.${offerContext}`;
    const usr = `${prospectInfo}\n\nConversation:\n${convoText}`;
    const out = await callAI(LOVABLE_API_KEY, sys, usr, tool);
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

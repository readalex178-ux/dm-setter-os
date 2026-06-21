import { loadContext } from "../_shared/context.ts";
import { getAuthUser, unauthorized } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STAGES = [
  "New Lead",
  "Discovery",
  "Qualification",
  "Interested",
  "Objection Handling",
  "Ready for Call",
  "Call Booked",
  "Not Qualified",
  "Cold Lead",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user } = await getAuthUser(req);
    if (!user) return unauthorized(corsHeaders);

    const { messages = [], prospect = {} } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");


    const offerContext = await loadContext(req);

    const convoText = messages
      .map((m: any) => `${m.sender === "setter" ? "Setter" : "Prospect"}: ${m.content}`)
      .join("\n");

    const systemPrompt = `You are an expert DM sales coach using the BANT framework (Budget, Authority, Need, Timeline). Analyze a conversation between a setter and a prospect to determine the prospect's true pipeline stage. Be honest and evidence-based — quote directly from the conversation when possible.${offerContext}`;

    const userPrompt = `Prospect info:
- Name: ${prospect.name || "Unknown"}
- Current stage: ${prospect.stage || "Unknown"}
- Current job: ${prospect.currentJob || "Unknown"}
- Income goal: ${prospect.incomeGoal || "Unknown"}
- Stated motivation: ${prospect.motivation || "Unknown"}
- Stated concerns: ${prospect.concerns || "None noted"}

Conversation:
${convoText || "(no messages yet)"}

Analyze and return: suggested stage, confidence, BANT scores with quoted evidence, reasoning, and the recommended next action.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_stage_analysis",
              description: "Submit the prospect stage analysis with BANT breakdown.",
              parameters: {
                type: "object",
                properties: {
                  suggestedStage: {
                    type: "string",
                    enum: STAGES,
                    description: "The pipeline stage that best fits this prospect right now.",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence in the suggested stage from 0 to 100.",
                  },
                  reasoning: {
                    type: "string",
                    description: "1-2 sentences explaining why this stage fits.",
                  },
                  bant: {
                    type: "object",
                    properties: {
                      budget: {
                        type: "object",
                        properties: {
                          score: { type: "number", description: "0-100 score for Budget." },
                          evidence: { type: "string", description: "Quote or short note from the conversation." },
                        },
                        required: ["score", "evidence"],
                        additionalProperties: false,
                      },
                      authority: {
                        type: "object",
                        properties: {
                          score: { type: "number" },
                          evidence: { type: "string" },
                        },
                        required: ["score", "evidence"],
                        additionalProperties: false,
                      },
                      need: {
                        type: "object",
                        properties: {
                          score: { type: "number" },
                          evidence: { type: "string" },
                        },
                        required: ["score", "evidence"],
                        additionalProperties: false,
                      },
                      timeline: {
                        type: "object",
                        properties: {
                          score: { type: "number" },
                          evidence: { type: "string" },
                        },
                        required: ["score", "evidence"],
                        additionalProperties: false,
                      },
                    },
                    required: ["budget", "authority", "need", "timeline"],
                    additionalProperties: false,
                  },
                  nextAction: {
                    type: "string",
                    description: "One concrete suggested next move for the setter.",
                  },
                },
                required: ["suggestedStage", "confidence", "reasoning", "bant", "nextAction"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_stage_analysis" } },
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call returned by AI");
    }
    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-stage error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

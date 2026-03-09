import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages, prospect } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No conversation messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const conversationText = messages
      .map((m: { sender: string; content: string }) =>
        `${m.sender === "setter" ? "You (setter)" : "Prospect"}: ${m.content}`
      )
      .join("\n");

    const prospectContext = prospect
      ? `
Prospect Profile:
- Name: ${prospect.name}
- Stage: ${prospect.stage}
- Intent Level: ${prospect.intentLevel} (${prospect.intentConfidence}% confidence)
- Motivation: ${prospect.motivation}
- Concerns: ${prospect.concerns}
- Call Readiness: ${prospect.callReadiness}%
- Lead Score: ${prospect.leadScore}/10
- Current Job: ${prospect.currentJob || "Unknown"}
- Income Goal: ${prospect.incomeGoal || "Unknown"}
`
      : "";

    const systemPrompt = `You are an expert DM setter coach for online business / network marketing. You analyze conversations between a setter and a prospect, then suggest 3 optimal reply options.

Each suggestion should have:
- A short "type" label (2-4 words, e.g. "Build Rapport", "Address Concern", "Transition to Call", "Create Urgency", "Share Social Proof", "Ask Discovery Question")
- The actual message content the setter should send
- A brief coaching note explaining WHY this reply works

Consider the prospect's stage, intent level, concerns, and call readiness when crafting suggestions. Tailor replies to move the conversation forward strategically.

Rules:
- Keep replies conversational and natural (not salesy or robotic)
- Match the prospect's energy and communication style
- If call readiness is high (>70%), include at least one call transition suggestion
- If prospect has concerns, address them empathetically
- Never be pushy or manipulative`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `${prospectContext}\nConversation so far:\n${conversationText}\n\nSuggest 3 optimal reply options.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_replies",
                description: "Return 3 suggested reply options for the setter",
                parameters: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: {
                            type: "string",
                            description:
                              "Short label like 'Build Rapport', 'Address Concern', 'Transition to Call'",
                          },
                          content: {
                            type: "string",
                            description: "The actual message to send",
                          },
                          coaching_note: {
                            type: "string",
                            description:
                              "Brief explanation of why this reply is effective",
                          },
                        },
                        required: ["type", "content", "coaching_note"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["suggestions"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "suggest_replies" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured response from AI");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-replies error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

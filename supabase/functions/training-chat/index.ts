import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { loadContext } from "../_shared/context.ts";
import { getAuthUser, unauthorized } from "../_shared/auth.ts";

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
    const { user: authUser } = await getAuthUser(req);
    if (!authUser) return unauthorized(corsHeaders);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages, scenario } = await req.json();
    const offerContext = await loadContext(req);

    if (!scenario) {
      return new Response(
        JSON.stringify({ error: "No scenario provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const conversationText = (messages || [])
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "Setter" : "Prospect (you)"}: ${m.content}`
      )
      .join("\n");

    const systemPrompt = `You are role-playing as a prospect in a DM conversation for training purposes. You are helping a DM setter practice their sales/outreach skills.

Your character:
- Name: ${scenario.personaName || "Alex"}${scenario.personaAge ? `\n- Age: ${scenario.personaAge}` : ""}${scenario.personaJob ? `\n- Job / situation: ${scenario.personaJob}` : ""}${scenario.personaTrait ? `\n- Personality: ${scenario.personaTrait}` : ""}${scenario.personaContext ? `\n- Context (why you followed/downloaded/replied): ${scenario.personaContext}` : ""}
- Type: ${scenario.personaType} prospect
- Scenario: ${scenario.name} — ${scenario.description}
- Difficulty: ${scenario.difficulty}

Character guidelines based on persona type:
${scenario.personaType === "Cold" ? `- You have zero context about what they do
- You're mildly curious but guarded
- You give short, casual replies
- You need them to earn your attention
- Don't volunteer information easily` : ""}
${scenario.personaType === "Warm" ? `- You downloaded their free guide and found it interesting
- You're somewhat interested but cautious about committing
- You ask genuine questions about how things work
- You're open but need reassurance
- Share some personal details when asked` : ""}
${scenario.personaType === "Skeptical" ? `- You've been burned by online programs/businesses before
- You're very direct and ask tough, pointed questions
- You demand proof, testimonials, real numbers
- You call out anything that sounds salesy or vague
- You're not rude, but you're blunt and no-nonsense` : ""}
${scenario.personaType === "Time-pressed" ? `- You're a busy professional making good money
- You're intrigued but always mention being too busy
- You need to see clear ROI and time efficiency
- You respond in short bursts and sometimes delayed
- You value getting straight to the point` : ""}
${scenario.personaType === "Hesitant" ? `- You ask many questions but avoid commitment
- You frequently say "I'll think about it" or "maybe later"
- You're genuinely interested but afraid of making the wrong decision
- You need hand-holding and patience
- You respond to empathy better than pressure` : ""}

Rules:
- Stay 100% in character. Never break character or mention that you're AI.
- Keep responses conversational, realistic, and natural (like real DMs)
- Keep replies between 1-3 sentences. Real DMs are short.
- React appropriately to the setter's approach — reward good technique, be harder if they're pushy or generic
- Gradually warm up if the setter does well, stay guarded if they don't
- Include occasional typos, abbreviations, or emojis to feel authentic
- If the setter asks for a call and you feel the conversation earned it, agree tentatively
- ONLY respond as the prospect. Do not add narration or commentary.
${offerContext ? `\nThe setter is selling this offer (react realistically to it — ask about its price, outcome, and proof; raise objections a real prospect would):\n${offerContext}` : ""}`;

    const aiMessages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    if (messages && messages.length > 0) {
      // Add conversation history
      for (const m of messages) {
        aiMessages.push({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        });
      }
    } else {
      // First message — prospect initiates or responds to opener
      aiMessages.push({
        role: "user",
        content: "The setter has just sent you an initial DM or you're responding to their first outreach. Send your opening response as the prospect.",
      });
    }

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
          messages: aiMessages,
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
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) throw new Error("No response from AI");

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("training-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

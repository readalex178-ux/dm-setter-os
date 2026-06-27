import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
};

function recommendedApproach(stage: string | null): string {
  switch (stage) {
    case "New Lead":
      return "Break the ice with a genuine, curiosity-led opener. Focus on them, not your offer.";
    case "Discovery":
      return "Ask open questions to uncover their goals, current situation, and what's not working.";
    case "Qualification":
      return "Dig into BANT: budget range, decision-making authority, urgency, and timeline.";
    case "Interested":
      return "Reinforce value with a relevant result or case study, then bridge to a call.";
    case "Objection Handling":
      return "Acknowledge the concern, isolate it, then reframe with a story or social proof.";
    case "Ready for Call":
      return "Transition to booking now — give them two specific time options and a clear CTA.";
    case "Call Booked":
      return "Send a confirmation and a quick reminder of the call's purpose to reduce no-shows.";
    case "Cold Lead":
      return "Re-engage with a fresh angle — new result, new content, or a direct pattern interrupt.";
    case "Not Qualified":
      return "Park politely and keep the door open. They may be right for you in future.";
    default:
      return "Review the conversation history and identify the prospect's biggest unresolved question.";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }

    const body = await req.json().catch(() => ({}));
    const platform: string | null = typeof body.platform === "string" && body.platform ? body.platform.toLowerCase() : null;
    const handle: string | null = typeof body.handle === "string" && body.handle.trim() ? body.handle.trim() : null;
    const name: string | null = typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;

    if (!handle && !name) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Build query: match by handle+platform+user_id when handle is available,
    // otherwise fall back to name match.
    let query = supabase
      .from("prospects")
      .select("id, name, handle, platform, stage, conversation_score, profile_url")
      .eq("user_id", user.id)
      .limit(1);

    if (handle) {
      query = query.eq("handle", handle);
      if (platform) {
        query = query.eq("platform", platform);
      }
    } else if (name) {
      query = query.ilike("name", name);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("extension-context DB error:", error);
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const prospect = rows?.[0] ?? null;

    if (!prospect) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const response = {
      found: true,
      prospect: {
        id: prospect.id,
        name: prospect.name,
        handle: prospect.handle,
        platform: prospect.platform,
        stage: prospect.stage,
        conversation_score: prospect.conversation_score,
        profile_url: prospect.profile_url,
      },
      recommended_approach: recommendedApproach(prospect.stage),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("extension-context error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});

// extension-context — hydrates the Chrome extension panel with stored intelligence about
// a prospect when a DM thread is opened. Read-only: looks up an existing prospect for the
// signed-in user (by handle, then name) and returns history, objections, memory and a
// recommended approach. ALL logic lives server-side; the extension only renders this.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadContext } from "../_shared/context.ts";
import { getAuthUser, unauthorized } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function userClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!supabaseUrl || !anonKey || !authHeader) return null;
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { user: authUser } = await getAuthUser(req);
    if (!authUser) return unauthorized(corsHeaders);

    const supabase = userClient(req);
    if (!supabase) return json({ error: "Server not configured" }, 500);

    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const handle = typeof body.handle === "string" ? body.handle.trim() : "";

    // ── Find an existing prospect (handle first, then name) ───────────────
    let prospect: any = null;
    if (handle) {
      const { data } = await supabase
        .from("prospects")
        .select("*")
        .eq("user_id", authUser.id)
        .ilike("handle", handle)
        .order("last_contact_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      prospect = data || null;
    }
    if (!prospect && name) {
      const { data } = await supabase
        .from("prospects")
        .select("*")
        .eq("user_id", authUser.id)
        .ilike("name", name)
        .order("last_contact_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      prospect = data || null;
    }

    if (!prospect) {
      return json({
        found: false,
        prospect: null,
        history_summary: "",
        objections: [],
        prospect_memory: [],
        recommended_approach: "New prospect — no prior history in DM Setter OS. Build rapport and run discovery.",
      });
    }

    // ── Gather supporting data in parallel ───────────────────────────────
    const [msgRes, memRes] = await Promise.all([
      supabase
        .from("messages")
        .select("sender, content, sent_at")
        .eq("user_id", authUser.id)
        .eq("prospect_id", prospect.id)
        .order("sent_at", { ascending: true })
        .limit(60),
      supabase
        .from("prospect_memory")
        .select("category, detail, created_at")
        .eq("user_id", authUser.id)
        .eq("prospect_id", prospect.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const messages = msgRes.data || [];
    const memory = memRes.data || [];
    const objections = prospect.concerns
      ? String(prospect.concerns).split(";").map((s: string) => s.trim()).filter(Boolean)
      : [];

    // ── AI summary + recommended approach (grounded in the user's offer/ICP) ──
    let history_summary = "";
    let recommended_approach = prospect.suggested_action || "";

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (OPENROUTER_API_KEY && messages.length > 0) {
      try {
        const knowledge = await loadContext(req, { prospectId: prospect.id });
        const transcript = messages
          .map((m: any) => `${m.sender === "setter" ? "Setter (you)" : prospect.name || "Prospect"}: ${m.content}`)
          .join("\n");

        const system = `You are the context engine inside DM Setter OS. Given a prospect's prior conversation history and stored facts, return a tight JSON object the human setter can read at a glance. You NEVER write messages here.
Return ONLY valid JSON, no markdown:
{
  "history_summary": "<2-3 sentence recap of where this relationship stands>",
  "recommended_approach": "<1-2 sentence concrete approach for the next message>"
}`;
        const userPrompt = `Prospect: ${prospect.name || "Unknown"} | Stage: ${prospect.stage || "New Lead"}
${knowledge ? `\n${knowledge}\n` : ""}
Prior conversation:
${transcript}

Return the JSON object.`;

        const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-flash-1.5:free",
            max_tokens: 400,
            messages: [
              { role: "system", content: system },
              { role: "user", content: userPrompt },
            ],
          }),
        });
        if (aiRes.ok) {
          const data = await aiRes.json();
          let text = (data.choices?.[0]?.message?.content ?? "").replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
          const start = text.search(/[{]/);
          if (start > 0) text = text.slice(start);
          const lastClose = text.lastIndexOf("}");
          if (lastClose >= 0) text = text.slice(0, lastClose + 1);
          const parsed = JSON.parse(text);
          if (typeof parsed.history_summary === "string") history_summary = parsed.history_summary;
          if (typeof parsed.recommended_approach === "string" && parsed.recommended_approach) {
            recommended_approach = parsed.recommended_approach;
          }
        }
      } catch (e) {
        console.error("context AI summary failed:", e);
      }
    }

    if (!history_summary) {
      history_summary = messages.length
        ? `${messages.length} prior message(s) on record. Stage: ${prospect.stage || "New Lead"}.`
        : "Prospect on record but no synced message history yet.";
    }
    if (!recommended_approach) {
      recommended_approach = "Continue the conversation toward the next stage; reference what you already know about them.";
    }

    return json({
      found: true,
      prospect: {
        id: prospect.id,
        name: prospect.name,
        handle: prospect.handle,
        stage: prospect.stage,
        conversation_score: prospect.conversation_score ?? null,
        booking_probability: prospect.booking_probability ?? null,
        lead_temperature: prospect.lead_temperature ?? null,
        suggested_action: prospect.suggested_action ?? null,
      },
      history_summary,
      objections,
      prospect_memory: memory,
      recommended_approach,
    });
  } catch (e) {
    console.error("extension-context error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

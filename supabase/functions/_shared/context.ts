// Shared helper: loads the caller's full knowledge base (offer + ICP + objections + FAQ)
// and formats it for AI prompts. Falls back gracefully to empty strings.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatOffer } from "./offer.ts";

function client(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!supabaseUrl || !anonKey || !authHeader) return null;
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

export async function loadContext(req: Request): Promise<string> {
  try {
    const supabase = client(req);
    if (!supabase) return "";

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "";

    const [offerRes, icpRes, objRes, faqRes, convRes] = await Promise.all([
      supabase.from("offer_profiles").select("*").eq("user_id", user.id)
        .eq("is_active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("icp_profiles").select("*").eq("user_id", user.id)
        .eq("is_active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("objection_entries").select("*").eq("user_id", user.id)
        .order("category", { ascending: true }).limit(50),
      supabase.from("faq_entries").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: true }).limit(50),
      supabase.from("conversation_examples").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(10),
    ]);

    const parts: string[] = [];
    const offer = offerRes.data ? formatOffer(offerRes.data) : "";
    if (offer) parts.push(offer);

    const icp = formatICP(icpRes.data);
    if (icp) parts.push(icp);

    const objections = formatObjections(objRes.data || []);
    if (objections) parts.push(objections);

    const faq = formatFAQ(faqRes.data || []);
    if (faq) parts.push(faq);

    return parts.join("\n\n");
  } catch (_e) {
    return "";
  }
}

function formatICP(i: any): string {
  if (!i) return "";
  const rows = [
    ["Demographics", i.demographics],
    ["Goals", i.goals],
    ["Pains", i.pains],
    ["Buying triggers", i.buying_triggers],
    ["Common objections", i.objections_common],
    ["Language patterns they use", i.language_patterns],
    ["Where they hang out", i.where_they_hang_out],
  ].filter(([, v]) => v && String(v).trim());
  if (!rows.length) return "";
  return `=== THE SETTER'S IDEAL CLIENT PROFILE (ICP) — speak to this person ===
${i.name ? `Persona: ${i.name}` : ""}
${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}
=== END ICP ===
Mirror their language patterns and speak directly to their goals and pains.`;
}

function formatObjections(list: any[]): string {
  if (!list.length) return "";
  const lines = list.map((o) =>
    `  • [${o.category || "general"}] "${o.objection}"${o.framework ? ` — framework: ${o.framework}` : ""} → ${o.response}`
  ).join("\n");
  return `=== OBJECTION BIBLE (use these exact handling approaches) ===
${lines}
=== END OBJECTION BIBLE ===`;
}

function formatFAQ(list: any[]): string {
  if (!list.length) return "";
  const lines = list.map((f) => `  • Q: ${f.question}\n    A: ${f.answer}`).join("\n");
  return `=== FAQ (approved answers — use these when the prospect asks) ===
${lines}
=== END FAQ ===`;
}

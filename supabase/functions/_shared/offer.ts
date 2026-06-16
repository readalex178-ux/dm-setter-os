// Shared helper: loads the caller's active Offer Profile and formats it for prompts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function loadOfferContext(req: Request): Promise<string> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return "";

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "";

    const { data } = await supabase
      .from("offer_profiles")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return "";
    return formatOffer(data);
  } catch (_e) {
    return "";
  }
}

export function formatOffer(o: any): string {
  if (!o || (!o.offer_name && !o.description && !o.core_promise)) return "";

  const valueProps = Array.isArray(o.value_props) && o.value_props.length
    ? o.value_props.map((v: string) => `  • ${v}`).join("\n")
    : "  • (none provided)";

  let objections = "";
  const obs = Array.isArray(o.objections) ? o.objections : [];
  if (obs.length) {
    objections = obs
      .map((ob: any) => `  • If they say "${ob.objection}" → ${ob.response}`)
      .join("\n");
  }

  return `
=== THE SETTER'S ACTUAL OFFER (use this in every reply — reference real details, never invent) ===
Offer name: ${o.offer_name || "(unnamed)"}
What it is: ${o.description || "(not provided)"}
Ideal client: ${o.ideal_client || "(not provided)"}
Price / payment: ${o.price || "(not provided)"}
Core promise / outcome: ${o.core_promise || "(not provided)"}
Value props:
${valueProps}
Proof / results: ${o.proof || "(not provided)"}
Guarantee: ${o.guarantee || "(not provided)"}
${objections ? `Preferred objection handling:\n${objections}` : ""}
Industry / niche: ${o.industry || "(not provided)"}
Main competitors: ${o.competitors || "(not provided)"}
Market sophistication: ${o.market_sophistication || "(not provided)"}
Market awareness: ${o.market_awareness || "(not provided)"}
Preferred tone/voice: ${o.tone || "casual"}
Call-to-action goal: ${o.cta_goal || "book a call"}
=== END OFFER ===
Always ground suggestions in this offer's real outcome, price, and objection handling. Match the preferred tone. Steer toward the call-to-action goal when the prospect is ready.`;
}

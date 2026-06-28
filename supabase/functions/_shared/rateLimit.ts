// Shared rate limiter: caps how many times a user can call a given Edge Function
// within a time window. Backed by the rate_limit_events table (service-role only).
import { createClient } from "npm:@supabase/supabase-js@2";

export async function checkRateLimit(
  userId: string,
  fnName: string,
  limit = 20,
  windowSeconds = 60,
): Promise<boolean> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count } = await supabase
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("fn_name", fnName)
    .gte("created_at", since);

  if ((count ?? 0) >= limit) return false;

  await supabase.from("rate_limit_events").insert({ user_id: userId, fn_name: fnName });

  // Best-effort cleanup so the table doesn't grow unbounded.
  const staleCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await supabase.from("rate_limit_events").delete().eq("user_id", userId).lt("created_at", staleCutoff);

  return true;
}

export function rateLimited(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down and try again shortly." }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

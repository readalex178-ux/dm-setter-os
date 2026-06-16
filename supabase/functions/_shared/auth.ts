// Shared helper: verifies the caller's JWT and returns the authenticated user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  user: { id: string } | null;
  error: string | null;
}

/**
 * Verifies the Authorization header (Bearer JWT) and returns the user.
 * Returns { user: null } when no valid session is present.
 */
export async function getAuthUser(req: Request): Promise<AuthResult> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return { user: null, error: "Missing Authorization header" };

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return { user: null, error: "Server not configured" };

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { user: null, error: "Unauthorized" };

    return { user: { id: user.id }, error: null };
  } catch (_e) {
    return { user: null, error: "Unauthorized" };
  }
}

export function unauthorized(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });

    const [offerRes, icpRes, scriptsRes, objectionsRes] = await Promise.all([
      supabase.from("offer_profiles").select("*").limit(1).single(),
      supabase.from("icp_profiles").select("*").limit(1).single(),
      supabase.from("scripts").select("id, title, content, category").order("created_at", { ascending: false }).limit(20),
      supabase.from("objection_entries").select("id, objection, response").order("created_at", { ascending: false }).limit(20),
    ]);

    const context = {
      offer: offerRes.data || null,
      icp: icpRes.data || null,
      scripts: scriptsRes.data || [],
      objections: objectionsRes.data || [],
      userId: user.id,
      fetchedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(context), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});

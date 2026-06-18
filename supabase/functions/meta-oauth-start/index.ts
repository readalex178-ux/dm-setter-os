import { getAuthUser, unauthorized } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Only allow redirect URIs that point at the app's own OAuth callback path.
function isAllowedRedirect(redirectUri: string): boolean {
  try {
    const u = new URL(redirectUri);
    return u.protocol === 'https:' && u.pathname === '/app/integrations/callback';
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require an authenticated user.
    const { user } = await getAuthUser(req);
    if (!user) return unauthorized(corsHeaders);

    const META_APP_ID = Deno.env.get('META_APP_ID');
    const META_APP_SECRET = Deno.env.get('META_APP_SECRET');

    if (!META_APP_ID || !META_APP_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Meta API credentials not configured. Add META_APP_ID and META_APP_SECRET in Cloud secrets.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { platform, redirectUri, scopes } = await req.json();

    if (!platform || !redirectUri) {
      return new Response(
        JSON.stringify({ error: 'Missing platform or redirectUri' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isAllowedRedirect(redirectUri)) {
      return new Response(
        JSON.stringify({ error: 'Invalid redirect URI' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Meta OAuth URL
    const state = JSON.stringify({ platform, redirectUri });
    const oauthUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    oauthUrl.searchParams.set('client_id', META_APP_ID);
    oauthUrl.searchParams.set('redirect_uri', redirectUri);
    oauthUrl.searchParams.set('scope', scopes || '');
    oauthUrl.searchParams.set('state', state);
    oauthUrl.searchParams.set('response_type', 'code');

    return new Response(
      JSON.stringify({ url: oauthUrl.toString() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in meta-oauth-start:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

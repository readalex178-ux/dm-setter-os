import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require an authenticated user.
    const { user } = await getAuthUser(req);
    if (!user) return unauthorized(corsHeaders);

    const HUBSPOT_CLIENT_ID = Deno.env.get('HUBSPOT_CLIENT_ID');
    if (!HUBSPOT_CLIENT_ID) {
      return new Response(
        JSON.stringify({ error: 'HUBSPOT_CLIENT_ID is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { redirectUri } = await req.json();

    if (!redirectUri) {
      return new Response(
        JSON.stringify({ error: 'Missing redirectUri' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isAllowedRedirect(redirectUri)) {
      return new Response(
        JSON.stringify({ error: 'Invalid redirect URI' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scopes = [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
      'oauth',
    ].join(' ');

    const state = btoa(JSON.stringify({ platform: 'hubspot', redirectUri }));

    const authUrl = new URL('https://app.hubspot.com/oauth/authorize');
    authUrl.searchParams.set('client_id', HUBSPOT_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);

    return new Response(
      JSON.stringify({ url: authUrl.toString() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in hubspot-oauth-start:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

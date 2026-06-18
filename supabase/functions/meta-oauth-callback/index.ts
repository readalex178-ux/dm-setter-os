import { createClient } from "npm:@supabase/supabase-js@2";
import { getAuthUser, unauthorized } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const META_APP_ID = Deno.env.get('META_APP_ID');
    const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!META_APP_ID || !META_APP_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Meta API credentials not configured.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user } = await getAuthUser(req);
    if (!user) return unauthorized(corsHeaders);

    const { code, state } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'No authorization code provided.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let platform = 'instagram';
    let redirectUri = '';
    try {
      const parsed = JSON.parse(state || '{}');
      platform = parsed.platform || 'instagram';
      redirectUri = parsed.redirectUri || '';
    } catch {}

    if (!redirectUri) {
      return new Response(
        JSON.stringify({ error: 'Invalid state: missing redirect URI.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', META_APP_ID);
    tokenUrl.searchParams.set('client_secret', META_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);


    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('Token exchange error:', tokenData.error);
      return new Response(
        JSON.stringify({ error: `Meta API error: ${tokenData.error.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in;

    // Get user info
    const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`);
    const meData = await meRes.json();

    // For Instagram: get Instagram Business Account ID via Pages
    let platformUserId = meData.id;
    let platformUsername = meData.name;
    let pageId = null;
    let pageAccessToken = null;

    if (platform === 'instagram' || platform === 'facebook') {
      // Get pages the user manages
      const pagesRes = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`
      );
      const pagesData = await pagesRes.json();

      if (pagesData.data && pagesData.data.length > 0) {
        const page = pagesData.data[0]; // Use first page
        pageId = page.id;
        pageAccessToken = page.access_token;

        if (platform === 'instagram' && page.instagram_business_account) {
          platformUserId = page.instagram_business_account.id;
          // Get Instagram username
          const igRes = await fetch(
            `https://graph.facebook.com/v19.0/${platformUserId}?fields=username,name&access_token=${pageAccessToken}`
          );
          const igData = await igRes.json();
          platformUsername = igData.username || igData.name || platformUsername;
        }
      }
    }

    // Store in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const { error: dbError } = await supabase
      .from('connected_accounts')
      .upsert({
        user_id: user.id,
        platform,
        platform_user_id: platformUserId,
        platform_username: platformUsername,
        display_name: meData.name,
        access_token: accessToken,
        token_expires_at: tokenExpiresAt,
        page_id: pageId,
        page_access_token: pageAccessToken,
        is_active: true,
        last_synced_at: null,
      }, { onConflict: 'platform,platform_user_id' });

    if (dbError) {
      console.error('DB error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to save account.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, platform, username: platformUsername }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in meta-oauth-callback:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function refreshTokenIfNeeded(
  account: any,
  supabase: any,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const expiresAt = new Date(account.token_expires_at).getTime();
  const now = Date.now();

  // Refresh if token expires in less than 5 minutes
  if (expiresAt - now > 5 * 60 * 1000) {
    return account.access_token;
  }

  console.log('Refreshing HubSpot token...');
  const res = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refresh_token,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Token refresh failed: ${data.message || 'Unknown error'}`);
  }

  await supabase
    .from('connected_accounts')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .eq('id', account.id);

  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HUBSPOT_CLIENT_ID = Deno.env.get('HUBSPOT_CLIENT_ID');
    const HUBSPOT_CLIENT_SECRET = Deno.env.get('HUBSPOT_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!HUBSPOT_CLIENT_ID || !HUBSPOT_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: 'HubSpot credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { accountId } = await req.json();

    if (!accountId) {
      return new Response(
        JSON.stringify({ error: 'Missing accountId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get account
    const { data: account, error: accountError } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('platform', 'hubspot')
      .single();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ error: 'HubSpot account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(account, supabase, HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET);

    // Fetch contacts from HubSpot
    let allContacts: any[] = [];
    let after: string | undefined;
    const properties = ['firstname', 'lastname', 'email', 'phone', 'company', 'jobtitle', 'lifecyclestage', 'hs_lead_status'];

    do {
      const url = new URL('https://api.hubapi.com/crm/v3/objects/contacts');
      url.searchParams.set('limit', '100');
      url.searchParams.set('properties', properties.join(','));
      if (after) url.searchParams.set('after', after);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('HubSpot API error:', data);
        return new Response(
          JSON.stringify({ error: `HubSpot API: ${data.message || 'Unknown error'}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      allContacts = allContacts.concat(data.results || []);
      after = data.paging?.next?.after;
    } while (after && allContacts.length < 500); // Cap at 500 for safety

    // Upsert contacts into prospects
    let syncedCount = 0;
    for (const contact of allContacts) {
      const props = contact.properties || {};
      const name = [props.firstname, props.lastname].filter(Boolean).join(' ') || 'Unknown';
      const hubspotId = String(contact.id);

      // Check if prospect already exists by platform_thread_id
      const { data: existing } = await supabase
        .from('prospects')
        .select('id')
        .eq('platform', 'hubspot')
        .eq('platform_thread_id', hubspotId)
        .single();

      const prospectData: Record<string, any> = {
        connected_account_id: account.id,
        platform: 'hubspot',
        platform_thread_id: hubspotId,
        name,
        handle: props.email || null,
        source: 'hubspot',
        current_job: props.jobtitle || null,
        stage: mapHubSpotStage(props.lifecyclestage),
      };

      if (existing) {
        await supabase
          .from('prospects')
          .update(prospectData)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('prospects')
          .insert(prospectData);
      }
      syncedCount++;
    }

    // Update last synced
    await supabase
      .from('connected_accounts')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', accountId);

    return new Response(
      JSON.stringify({ success: true, count: syncedCount, total: allContacts.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in hubspot-sync-contacts:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function mapHubSpotStage(lifecyclestage?: string): string {
  switch (lifecyclestage) {
    case 'subscriber':
    case 'lead':
      return 'New Lead';
    case 'marketingqualifiedlead':
      return 'Engaged';
    case 'salesqualifiedlead':
      return 'Qualified';
    case 'opportunity':
      return 'Appointment Set';
    case 'customer':
      return 'Closed';
    default:
      return 'New Lead';
  }
}

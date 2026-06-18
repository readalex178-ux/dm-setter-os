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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { user } = await getAuthUser(req);
    if (!user) return unauthorized(corsHeaders);

    const { accountId } = await req.json();

    if (!accountId) {
      return new Response(
        JSON.stringify({ error: 'Missing accountId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the connected account
    const { data: account, error: accountError } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ error: 'Account not found.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ownership check: caller must own this connected account
    if (account.user_id !== user.id) {
      return unauthorized(corsHeaders);
    }


    const token = account.page_access_token || account.access_token;
    let conversations: any[] = [];
    let newMessageCount = 0;

    if (account.platform === 'instagram') {
      // Fetch Instagram conversations
      const convRes = await fetch(
        `https://graph.facebook.com/v19.0/${account.platform_user_id}/conversations?fields=participants,messages{message,from,created_time}&platform=instagram&access_token=${token}`
      );
      const convData = await convRes.json();

      if (convData.error) {
        console.error('Instagram API error:', convData.error);
        return new Response(
          JSON.stringify({ error: `Instagram API: ${convData.error.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      conversations = convData.data || [];
    } else if (account.platform === 'facebook') {
      // Fetch Facebook Page conversations
      const convRes = await fetch(
        `https://graph.facebook.com/v19.0/${account.page_id}/conversations?fields=participants,messages{message,from,created_time}&access_token=${token}`
      );
      const convData = await convRes.json();
      conversations = convData.data || [];
    }

    // Process conversations into prospects and messages
    for (const conv of conversations) {
      const participants = conv.participants?.data || [];
      const prospect = participants.find((p: any) => p.id !== account.platform_user_id);

      if (!prospect) continue;

      // Upsert prospect
      const { data: existingProspect } = await supabase
        .from('prospects')
        .select('id')
        .eq('platform_thread_id', conv.id)
        .single();

      let prospectId: string;

      if (existingProspect) {
        prospectId = existingProspect.id;
      } else {
        const { data: newProspect, error: insertError } = await supabase
          .from('prospects')
          .insert({
            connected_account_id: account.id,
            platform: account.platform,
            platform_thread_id: conv.id,
            name: prospect.name || 'Unknown',
            handle: prospect.username ? `@${prospect.username}` : null,
            source: account.platform,
          })
          .select('id')
          .single();

        if (insertError || !newProspect) continue;
        prospectId = newProspect.id;
      }

      // Import messages
      const messages = conv.messages?.data || [];
      for (const msg of messages) {
        const { data: existing } = await supabase
          .from('messages')
          .select('id')
          .eq('platform_message_id', msg.id)
          .single();

        if (!existing) {
          const sender = msg.from?.id === account.platform_user_id ? 'setter' : 'prospect';
          await supabase.from('messages').insert({
            prospect_id: prospectId,
            sender,
            content: msg.message || '',
            platform_message_id: msg.id,
            sent_at: msg.created_time,
          });
          newMessageCount++;
        }
      }

      // Update last contact
      if (messages.length > 0) {
        await supabase
          .from('prospects')
          .update({ last_contact_at: messages[0].created_time })
          .eq('id', prospectId);
      }
    }

    // Update last synced
    await supabase
      .from('connected_accounts')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', accountId);

    return new Response(
      JSON.stringify({ success: true, count: newMessageCount, conversations: conversations.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in meta-sync-messages:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

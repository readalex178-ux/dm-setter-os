import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// This is a PUBLIC webhook — no auth required, Meta verifies via token
serve(async (req) => {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const META_WEBHOOK_VERIFY_TOKEN = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN') || 'dmsetteros_verify_token';

  // GET = Meta webhook verification challenge
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === META_WEBHOOK_VERIFY_TOKEN) {
      console.log('Webhook verified');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // POST = incoming message event
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Process each entry
      for (const entry of body.entry || []) {
        // Instagram / Facebook Messenger
        for (const messaging of entry.messaging || []) {
          if (!messaging.message) continue; // skip delivery/read receipts

          const senderId = messaging.sender?.id;
          const recipientId = messaging.recipient?.id;
          const messageText = messaging.message?.text;
          const messageId = messaging.message?.mid;
          const timestamp = messaging.timestamp
            ? new Date(messaging.timestamp * 1000).toISOString()
            : new Date().toISOString();

          if (!senderId || !messageText) continue;

          // Find the connected account by page/ig user id
          const { data: account } = await supabase
            .from('connected_accounts')
            .select('id, platform, platform_user_id')
            .or(`platform_user_id.eq.${recipientId},page_id.eq.${recipientId}`)
            .eq('is_active', true)
            .limit(1)
            .single();

          if (!account) {
            console.log('No connected account found for recipient:', recipientId);
            continue;
          }

          // Determine if this is from the prospect or the setter
          const isFromSetter = senderId === recipientId || senderId === account.platform_user_id;
          const senderType = isFromSetter ? 'setter' : 'prospect';
          const prospectPlatformId = isFromSetter ? recipientId : senderId;

          // Find or create prospect
          let { data: prospect } = await supabase
            .from('prospects')
            .select('id')
            .eq('connected_account_id', account.id)
            .eq('platform_thread_id', prospectPlatformId)
            .single();

          if (!prospect) {
            // Fetch name from Meta
            let prospectName = 'Unknown';
            try {
              const connAccount = await supabase
                .from('connected_accounts')
                .select('access_token, page_access_token')
                .eq('id', account.id)
                .single();

              const token = connAccount.data?.page_access_token || connAccount.data?.access_token;
              if (token) {
                const profileRes = await fetch(
                  `https://graph.facebook.com/v19.0/${prospectPlatformId}?fields=name,username&access_token=${token}`
                );
                const profileData = await profileRes.json();
                prospectName = profileData.name || profileData.username || 'Unknown';
              }
            } catch (e) {
              console.error('Could not fetch prospect name:', e);
            }

            const { data: newProspect } = await supabase
              .from('prospects')
              .insert({
                connected_account_id: account.id,
                platform: account.platform,
                platform_thread_id: prospectPlatformId,
                name: prospectName,
                source: account.platform,
              })
              .select('id')
              .single();

            prospect = newProspect;
          }

          if (!prospect) continue;

          // Check for duplicate message
          const { data: existing } = await supabase
            .from('messages')
            .select('id')
            .eq('platform_message_id', messageId)
            .single();

          if (existing) continue;

          // Insert message
          await supabase.from('messages').insert({
            prospect_id: prospect.id,
            sender: senderType,
            content: messageText,
            platform_message_id: messageId,
            sent_at: timestamp,
          });

          // Update prospect last contact
          await supabase
            .from('prospects')
            .update({ last_contact_at: timestamp })
            .eq('id', prospect.id);
        }

        // WhatsApp changes
        for (const change of entry.changes || []) {
          if (change.field !== 'messages') continue;
          const value = change.value;
          if (!value?.messages) continue;

          const phoneNumberId = value.metadata?.phone_number_id;

          const { data: account } = await supabase
            .from('connected_accounts')
            .select('id, platform')
            .eq('page_id', phoneNumberId)
            .eq('platform', 'whatsapp')
            .eq('is_active', true)
            .single();

          if (!account) continue;

          for (const waMsg of value.messages) {
            if (waMsg.type !== 'text') continue;

            const senderId = waMsg.from;
            const messageText = waMsg.text?.body;
            const messageId = waMsg.id;
            const timestamp = waMsg.timestamp
              ? new Date(parseInt(waMsg.timestamp) * 1000).toISOString()
              : new Date().toISOString();

            if (!messageText) continue;

            // Find or create prospect
            let { data: prospect } = await supabase
              .from('prospects')
              .select('id')
              .eq('connected_account_id', account.id)
              .eq('platform_thread_id', senderId)
              .single();

            if (!prospect) {
              // Try to get name from contacts
              const contact = value.contacts?.find((c: any) => c.wa_id === senderId);
              const name = contact?.profile?.name || senderId;

              const { data: newProspect } = await supabase
                .from('prospects')
                .insert({
                  connected_account_id: account.id,
                  platform: 'whatsapp',
                  platform_thread_id: senderId,
                  name,
                  handle: senderId,
                  source: 'whatsapp',
                })
                .select('id')
                .single();

              prospect = newProspect;
            }

            if (!prospect) continue;

            const { data: existing } = await supabase
              .from('messages')
              .select('id')
              .eq('platform_message_id', messageId)
              .single();

            if (existing) continue;

            await supabase.from('messages').insert({
              prospect_id: prospect.id,
              sender: 'prospect',
              content: messageText,
              platform_message_id: messageId,
              sent_at: timestamp,
            });

            await supabase
              .from('prospects')
              .update({ last_contact_at: timestamp })
              .eq('id', prospect.id);
          }
        }
      }

      // Meta requires 200 response within 20 seconds
      return new Response('EVENT_RECEIVED', { status: 200 });
    } catch (error) {
      console.error('Webhook error:', error);
      return new Response('EVENT_RECEIVED', { status: 200 }); // Always 200 to Meta
    }
  }

  return new Response('Method not allowed', { status: 405 });
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { prospectId, content } = await req.json();

    if (!prospectId || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing prospectId or content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get prospect and their connected account
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .select('*, connected_accounts(*)')
      .eq('id', prospectId)
      .single();

    if (prospectError || !prospect) {
      return new Response(
        JSON.stringify({ error: 'Prospect not found.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const account = prospect.connected_accounts;
    let platformMessageId: string | null = null;
    let sendError: string | null = null;

    if (account && account.is_active && prospect.platform_thread_id) {
      const token = account.page_access_token || account.access_token;

      if (prospect.platform === 'instagram' || prospect.platform === 'facebook') {
        // Send via Instagram/Facebook Conversations API
        // First get the recipient ID from the thread
        const recipientId = prospect.platform_thread_id;

        const sendRes = await fetch(
          `https://graph.facebook.com/v19.0/${account.page_id}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipient: { id: recipientId },
              message: { text: content },
              access_token: token,
              ...(prospect.platform === 'instagram' ? { messaging_type: 'RESPONSE' } : {}),
            }),
          }
        );

        const sendData = await sendRes.json();

        if (sendData.error) {
          console.error('Meta send error:', sendData.error);
          sendError = sendData.error.message;
        } else {
          platformMessageId = sendData.message_id || null;
        }
      } else if (prospect.platform === 'whatsapp') {
        // Send via WhatsApp Cloud API
        const phoneNumberId = account.page_id; // Stored as page_id for WhatsApp
        const sendRes = await fetch(
          `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: prospect.platform_thread_id,
              type: 'text',
              text: { body: content },
            }),
          }
        );

        const sendData = await sendRes.json();

        if (sendData.error) {
          console.error('WhatsApp send error:', sendData.error);
          sendError = sendData.error.message;
        } else {
          platformMessageId = sendData.messages?.[0]?.id || null;
        }
      }
    }

    // Always save the message locally (even if platform send fails for manual-only prospects)
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        prospect_id: prospectId,
        sender: 'setter',
        content,
        platform_message_id: platformMessageId,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('DB insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save message.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update prospect last contact
    await supabase
      .from('prospects')
      .update({ last_contact_at: new Date().toISOString() })
      .eq('id', prospectId);

    return new Response(
      JSON.stringify({
        success: true,
        message,
        sent_to_platform: !sendError && !!account,
        platform_error: sendError,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

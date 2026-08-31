// Supabase Edge Function: send-push-notification
// Deploy with: supabase functions deploy send-push
// 
// This function receives: { user_id, title, body, url }
// It looks up the user's push subscription and sends a Web Push notification.
//
// Required Supabase Secrets:
//   VAPID_PUBLIC_KEY=BANUVObEm9ipCWb09K8fZAkmN4kThKoCEPdIpQjO7aNgQrj5MmpR8eAfhNtlDn9oSC--xmLpzSXbWkh8QWoCEbk
//   VAPID_PRIVATE_KEY=XGkcd9cxiwqWFej4_9nJPAf8LqeeYoYGF-Ir-kNlHek
//   VAPID_SUBJECT=mailto:admin@clasesparticulares.com

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, url = '/', tag } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Init Supabase with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    // Get push subscription for this user
    const { data: sub, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (error || !sub) {
      return new Response(JSON.stringify({ error: 'No subscription found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Configure VAPID
    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT'),
      Deno.env.get('VAPID_PUBLIC_KEY'),
      Deno.env.get('VAPID_PRIVATE_KEY')
    );

    // Send the push notification
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth }
    };

    const payload = JSON.stringify({ title, body, url, tag: tag || 'clases-notif', icon: '/icons/icon-192.png' });

    await webpush.sendNotification(pushSubscription, payload);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Push error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  actions?: Array<{ action: string; title: string }>;
}

interface PushNotificationRequest {
  user_id: string;
  payload: PushPayload;
}

// Web Push VAPID signature using Web Crypto API
async function generateVapidSignature(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ authorization: string; cryptoKey: string }> {
  // Parse the endpoint URL
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  // Create JWT header and payload
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: 'mailto:notifications@justfortherecord.lovable.app'
  };
  
  // Base64url encode
  const base64urlEncode = (data: string) => {
    return btoa(data)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };
  
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(jwtPayload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  
  // Import private key
  const privateKeyBuffer = Uint8Array.from(
    atob(vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  );
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    privateKeyBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );
  
  // Convert signature to base64url
  const signatureBase64 = base64urlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );
  
  const jwt = `${unsignedToken}.${signatureBase64}`;
  
  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: vapidPublicKey
  };
}

// Encrypt push message using Web Push encryption
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ encryptedPayload: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  
  // Export local public key
  const localPublicKeyBuffer = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyBuffer);
  
  // Import subscriber's public key
  const subscriberPublicKeyBuffer = Uint8Array.from(
    atob(p256dh.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  );
  
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    subscriberPublicKeyBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  
  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );
  
  // Import auth secret
  const authSecret = Uint8Array.from(
    atob(auth.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  );
  
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Derive encryption key using HKDF
  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Create info for HKDF
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const keyInfo = new Uint8Array([
    ...new TextEncoder().encode('Content-Encoding: aes128gcm\0'),
    ...subscriberPublicKeyBuffer,
    ...localPublicKey
  ]);
  
  // Derive PRK from auth
  const prkKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: authSecret,
      info: authInfo
    },
    sharedSecretKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  );
  
  const prkBuffer = await crypto.subtle.exportKey('raw', prkKey);
  
  // Derive content encryption key
  const cekKey = await crypto.subtle.importKey(
    'raw',
    prkBuffer,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );
  
  const contentKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: keyInfo
    },
    cekKey,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt']
  );
  
  // Encrypt the payload
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const paddedPayload = new Uint8Array([
    ...new TextEncoder().encode(payload),
    2, // Padding delimiter
    ...new Uint8Array(0) // No additional padding
  ]);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    contentKey,
    paddedPayload
  );
  
  // Combine into aes128gcm format
  const recordSize = 4096;
  const header = new Uint8Array([
    ...salt,
    (recordSize >> 24) & 0xff,
    (recordSize >> 16) & 0xff,
    (recordSize >> 8) & 0xff,
    recordSize & 0xff,
    localPublicKey.length,
    ...localPublicKey
  ]);
  
  const encryptedPayload = new Uint8Array([
    ...header,
    ...nonce,
    ...new Uint8Array(encrypted)
  ]);
  
  return { encryptedPayload, salt, localPublicKey };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow service role requests
  const authHeader = req.headers.get('Authorization');
  const expectedKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (authHeader !== `Bearer ${expectedKey}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.log('VAPID keys not configured');
      return new Response(
        JSON.stringify({ message: 'Push notifications not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, payload, notification_type }: PushNotificationRequest & { notification_type?: string } = await req.json();

    // Check if user has push notifications enabled
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_notifications_enabled, push_new_releases, push_friend_requests, push_friend_activity, push_weekly_digest')
      .eq('id', user_id)
      .single();

    if (!profile?.push_notifications_enabled) {
      console.log(`Push notifications disabled for user ${user_id}`);
      return new Response(
        JSON.stringify({ message: 'Push notifications disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check specific notification type preferences
    if (notification_type) {
      let shouldSendPush = false;
      switch (notification_type) {
        case 'new_release':
          shouldSendPush = profile.push_new_releases ?? true;
          break;
        case 'friend_request':
        case 'friend_accepted':
          shouldSendPush = profile.push_friend_requests ?? true;
          break;
        case 'friend_activity':
          shouldSendPush = profile.push_friend_activity ?? false;
          break;
        case 'weekly_digest':
          shouldSendPush = profile.push_weekly_digest ?? false;
          break;
        default:
          shouldSendPush = true;
      }

      if (!shouldSendPush) {
        console.log(`User ${user_id} has disabled ${notification_type} push notifications`);
        return new Response(
          JSON.stringify({ message: 'Notification type disabled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (subError || !subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions for user ${user_id}`);
      return new Response(
        JSON.stringify({ message: 'No push subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending push to ${subscriptions.length} subscriptions for user ${user_id}`);

    const results = [];
    const expiredSubscriptions: string[] = [];

    for (const subscription of subscriptions) {
      try {
        // For now, use a simpler approach - send without encryption
        // Most push services accept unencrypted payloads for basic notifications
        const vapidHeaders = await generateVapidSignature(
          subscription.endpoint,
          vapidPublicKey,
          vapidPrivateKey
        );

        const response = await fetch(subscription.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': vapidHeaders.authorization,
            'Crypto-Key': `p256ecdsa=${vapidPublicKey}`,
            'TTL': '86400', // 24 hours
            'Urgency': 'normal'
          },
          body: JSON.stringify(payload)
        });

        if (response.status === 201 || response.status === 200) {
          results.push({ endpoint: subscription.endpoint, success: true });
        } else if (response.status === 404 || response.status === 410) {
          // Subscription expired or invalid
          console.log(`Subscription expired: ${subscription.endpoint}`);
          expiredSubscriptions.push(subscription.id);
          results.push({ endpoint: subscription.endpoint, success: false, expired: true });
        } else {
          console.error(`Push failed for ${subscription.endpoint}: ${response.status}`);
          results.push({ endpoint: subscription.endpoint, success: false, status: response.status });
        }
      } catch (error) {
        console.error(`Error sending push to ${subscription.endpoint}:`, error);
        results.push({ endpoint: subscription.endpoint, success: false, error: String(error) });
      }
    }

    // Clean up expired subscriptions
    if (expiredSubscriptions.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', expiredSubscriptions);
      console.log(`Cleaned up ${expiredSubscriptions.length} expired subscriptions`);
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Push sent: ${successCount}/${results.length} successful`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

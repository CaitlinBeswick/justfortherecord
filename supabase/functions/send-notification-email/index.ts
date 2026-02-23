import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationEmailRequest {
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

function formatDateDDMMYYYY(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return dateStr;
  }
}

const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Just For The Record</title>
</head>
<body style="margin:0;padding:0;background-color:#dc2626;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#dc2626;padding:40px 20px;">
    <tr>
      <td align="center">
        <!-- Logo / Header -->
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="https://justfortherecord.app/email-logo.png" alt="Just For The Record" width="48" height="48" style="border-radius:50%;display:block;margin:0 auto 12px auto;" />
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Just For The Record</span>
            </td>
          </tr>
        </table>
        <!-- White Card -->
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:40px 36px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 36px;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
                <a href="https://justfortherecord.app/profile/settings" style="color:#9ca3af;text-decoration:underline;">Manage email preferences</a>
                &nbsp;·&nbsp;
                <a href="https://justfortherecord.app" style="color:#9ca3af;text-decoration:underline;">justfortherecord.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Allow service role OR admin user auth
  let isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;
  let callerUserId: string | null = null;

  if (!isServiceRole && authHeader?.startsWith('Bearer ')) {
    // Decode JWT to get user ID without hitting session validation
    try {
      const token = authHeader.replace('Bearer ', '');
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));
      const userId = payload.sub as string;
      
      if (userId) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .single();
        if (roleData) {
          callerUserId = userId;
        }
      }
    } catch (e) {
      console.error('Failed to decode JWT:', e);
    }
  }

  if (!isServiceRole && !callerUserId) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ message: 'Email sending not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);

    const { user_id, notification_type, title, message, data }: NotificationEmailRequest = await req.json();

    // For admin test mode, override user_id to the caller
    const targetUserId = callerUserId && !user_id ? callerUserId : user_id;

    // For admin test sends, skip preference checks
    const isAdminTest = !!callerUserId;

    // Get user profile to check email preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email_notifications_enabled, email_new_releases, email_friend_requests, email_friend_activity')
      .eq('id', targetUserId)
      .single();

    if (profileError || !profile) {
      console.log(`Could not find profile for user ${targetUserId}`);
      return new Response(
        JSON.stringify({ message: 'Profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isAdminTest && !profile.email_notifications_enabled) {
      console.log(`Email notifications disabled for user ${targetUserId}`);
      return new Response(
        JSON.stringify({ message: 'Email notifications disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isAdminTest) {
      let shouldSendEmail = false;
      switch (notification_type) {
        case 'new_release':
          shouldSendEmail = profile.email_new_releases;
          break;
        case 'friend_request':
        case 'friend_accepted':
          shouldSendEmail = profile.email_friend_requests;
          break;
        case 'friend_activity':
          shouldSendEmail = profile.email_friend_activity;
          break;
        default:
          shouldSendEmail = true;
      }

      if (!shouldSendEmail) {
        console.log(`User ${targetUserId} has disabled ${notification_type} email notifications`);
        return new Response(
          JSON.stringify({ message: 'Notification type disabled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(targetUserId);
    
    if (authError || !authUser?.user?.email) {
      console.log(`Could not get email for user ${user_id}`);
      return new Response(
        JSON.stringify({ message: 'User email not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = authUser.user.email;
    const baseUrl = 'https://justfortherecord.app';
    let emailHtml = '';

    if (notification_type === 'new_release' && data) {
      const albumUrl = `${baseUrl}/album/${data.release_group_id}`;
      const artistUrl = `${baseUrl}/artist/${data.artist_id}`;
      const releaseDateStr = data.release_date ? formatDateDDMMYYYY(data.release_date as string) : '';

      emailHtml = emailWrapper(`
        <div style="text-align:center;margin-bottom:28px;">
          <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 4px 0;">New Release</h1>
          <p style="color:#6b7280;font-size:14px;margin:0;">From an artist you follow</p>
        </div>

        <div style="margin-bottom:28px;">
          <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 4px 0;">${data.album_title}</h2>
          <p style="color:#dc2626;font-size:15px;font-weight:600;margin:0 0 8px 0;">
            <a href="${artistUrl}" style="color:#dc2626;text-decoration:none;">${data.artist_name}</a>
          </p>
          ${releaseDateStr ? `<p style="color:#9ca3af;font-size:13px;margin:0;">Released ${releaseDateStr}</p>` : ''}
        </div>

        <div style="text-align:center;margin:32px 0;">
          <a href="${albumUrl}" style="display:inline-block;background-color:#dc2626;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
            Listen Now
          </a>
        </div>

        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
          You're receiving this because you follow
          <a href="${artistUrl}" style="color:#dc2626;text-decoration:none;">${data.artist_name}</a>
          on Just For The Record.
        </p>
      `);
    } else if (notification_type === 'friend_request' && data) {
      const requesterName = data.requester_name || 'Someone';

      emailHtml = emailWrapper(`
        <div style="text-align:center;margin-bottom:28px;">
          <div style="width:64px;height:64px;background-color:#fef2f2;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:32px;">
            👋
          </div>
          <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px 0;">New Follow Request</h1>
          <p style="color:#374151;font-size:16px;margin:0;">
            <strong style="color:#dc2626;">${requesterName}</strong> wants to follow you on Just For The Record.
          </p>
        </div>

        <div style="text-align:center;margin:32px 0;">
          <a href="${baseUrl}/profile/friends" style="display:inline-block;background-color:#dc2626;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
            View Request
          </a>
        </div>
      `);
    } else if (notification_type === 'friend_accepted' && data) {
      const accepterName = data.accepter_name || 'Someone';

      emailHtml = emailWrapper(`
        <div style="text-align:center;margin-bottom:28px;">
          <div style="width:64px;height:64px;background-color:#fef2f2;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:32px;">
            🎉
          </div>
          <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px 0;">You're Now Connected!</h1>
          <p style="color:#374151;font-size:16px;margin:0 0 8px 0;">
            <strong style="color:#dc2626;">${accepterName}</strong> accepted your follow request!
          </p>
          <p style="color:#6b7280;font-size:14px;margin:0;">
            You can now see their listening activity and diary entries.
          </p>
        </div>

        <div style="text-align:center;margin:32px 0;">
          <a href="${baseUrl}/following" style="display:inline-block;background-color:#dc2626;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
            See Their Activity
          </a>
        </div>
      `);
    } else {
      emailHtml = emailWrapper(`
        <div style="text-align:center;margin-bottom:28px;">
          <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 8px 0;">${title}</h1>
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0;">${message}</p>
        </div>

        <div style="text-align:center;margin:32px 0;">
          <a href="${baseUrl}" style="display:inline-block;background-color:#dc2626;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
            Open Just For The Record
          </a>
        </div>
      `);
    }

    const emailResponse = await resend.emails.send({
      from: 'Just For The Record <notifications@resend.dev>',
      to: [userEmail],
      subject: title,
      html: emailHtml,
    }) as { data?: { id: string } | null; error?: { message: string } | null };

    if (emailResponse.error) {
      throw new Error(emailResponse.error.message);
    }

    console.log(`Email sent successfully to ${userEmail}:`, emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-notification-email function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

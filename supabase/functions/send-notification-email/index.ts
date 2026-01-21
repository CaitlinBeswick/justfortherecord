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

serve(async (req) => {
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
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ message: 'Email sending not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, notification_type, title, message, data }: NotificationEmailRequest = await req.json();

    // Get user profile to check email preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email_notifications_enabled, email_new_releases, email_friend_requests, email_friend_activity')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      console.log(`Could not find profile for user ${user_id}`);
      return new Response(
        JSON.stringify({ message: 'Profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email notifications are enabled globally
    if (!profile.email_notifications_enabled) {
      console.log(`Email notifications disabled for user ${user_id}`);
      return new Response(
        JSON.stringify({ message: 'Email notifications disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check specific notification type preferences
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
        // For other notification types, send if global is enabled
        shouldSendEmail = true;
    }

    if (!shouldSendEmail) {
      console.log(`User ${user_id} has disabled ${notification_type} email notifications`);
      return new Response(
        JSON.stringify({ message: 'Notification type disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's email from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id);
    
    if (authError || !authUser?.user?.email) {
      console.log(`Could not get email for user ${user_id}`);
      return new Response(
        JSON.stringify({ message: 'User email not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = authUser.user.email;

    // Build email content based on notification type
    let emailHtml = '';
    const baseUrl = 'https://justfortherecord.lovable.app';

    if (notification_type === 'new_release' && data) {
      const albumUrl = `${baseUrl}/album/${data.release_group_id}`;
      const artistUrl = `${baseUrl}/artist/${data.artist_id}`;
      
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #fafafa; padding: 40px 20px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #171717; border-radius: 12px; padding: 32px; border: 1px solid #262626;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #fafafa; font-size: 24px; margin: 0 0 8px 0;">🎵 ${title}</h1>
            </div>
            <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              ${message}
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${albumUrl}" style="display: inline-block; background-color: #f97316; color: #0a0a0a; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Check it out
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #262626; margin: 32px 0;">
            <p style="color: #71717a; font-size: 12px; text-align: center; margin: 0;">
              You're receiving this because you follow <a href="${artistUrl}" style="color: #f97316; text-decoration: none;">${data.artist_name}</a> on Just For The Record.
              <br><br>
              <a href="${baseUrl}/profile/settings" style="color: #71717a; text-decoration: underline;">Manage email preferences</a>
            </p>
          </div>
        </body>
        </html>
      `;
    } else {
      // Generic notification email template
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #fafafa; padding: 40px 20px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #171717; border-radius: 12px; padding: 32px; border: 1px solid #262626;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #fafafa; font-size: 24px; margin: 0 0 8px 0;">${title}</h1>
            </div>
            <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              ${message}
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${baseUrl}" style="display: inline-block; background-color: #f97316; color: #0a0a0a; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Open Just For The Record
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #262626; margin: 32px 0;">
            <p style="color: #71717a; font-size: 12px; text-align: center; margin: 0;">
              <a href="${baseUrl}/profile/settings" style="color: #71717a; text-decoration: underline;">Manage email preferences</a>
            </p>
          </div>
        </body>
        </html>
      `;
    }

    // Send the email
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactNotificationRequest {
  submission_id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
}

// HTML entity escape function to prevent XSS
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping notification');
      return new Response(
        JSON.stringify({ message: 'Email sending not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { submission_id, name, email, subject, message }: ContactNotificationRequest = await req.json();

    // Escape all user-provided data to prevent XSS in emails
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);

    // Get all admin users
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) {
      throw new Error(`Failed to fetch admin roles: ${rolesError.message}`);
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log('No admin users found');
      return new Response(
        JSON.stringify({ message: 'No admins to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = 'https://justfortherecord.lovable.app';
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const adminRole of adminRoles) {
      try {
        // Get admin's email
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(adminRole.user_id);
        
        if (authError || !authUser?.user?.email) {
          console.log(`Could not get email for admin ${adminRole.user_id}`);
          continue;
        }

        const adminEmail = authUser.user.email;

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #fafafa; padding: 40px 20px; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #171717; border-radius: 12px; padding: 32px; border: 1px solid #262626;">
              <div style="margin-bottom: 24px;">
                <h1 style="color: #f97316; font-size: 24px; margin: 0 0 8px 0;">New Contact Submission</h1>
                <p style="color: #a1a1aa; font-size: 14px; margin: 0;">A new message has been received on Just For The Record</p>
              </div>
              
              <div style="background-color: #262626; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 12px 0;">
                  <span style="color: #71717a; font-size: 12px; text-transform: uppercase;">From</span><br>
                  <span style="color: #fafafa; font-weight: 500;">${safeName}</span>
                  <span style="color: #a1a1aa;"> (${safeEmail})</span>
                </p>
                <p style="margin: 0 0 12px 0;">
                  <span style="color: #71717a; font-size: 12px; text-transform: uppercase;">Subject</span><br>
                  <span style="color: #fafafa; font-weight: 500;">${safeSubject}</span>
                </p>
                <p style="margin: 0;">
                  <span style="color: #71717a; font-size: 12px; text-transform: uppercase;">Message</span><br>
                  <span style="color: #fafafa; white-space: pre-wrap;">${safeMessage}</span>
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="${baseUrl}/admin" style="display: inline-block; background-color: #f97316; color: #0a0a0a; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  View in Admin Dashboard
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #262626; margin: 24px 0;">
              <p style="color: #71717a; font-size: 12px; text-align: center; margin: 0;">
                This is an automated notification from Just For The Record.
              </p>
            </div>
          </body>
          </html>
        `;

        const emailResponse = await resend.emails.send({
          from: 'Just For The Record <notifications@resend.dev>',
          to: [adminEmail],
          subject: `New Contact: ${safeSubject}`,
          html: emailHtml,
        }) as { data?: { id: string } | null; error?: { message: string } | null };

        if (emailResponse.error) {
          console.error(`Failed to send notification to ${adminEmail}:`, emailResponse.error.message);
          emailsFailed++;
        } else {
          console.log(`Contact notification sent to ${adminEmail}`);
          emailsSent++;
        }

      } catch (adminError) {
        console.error(`Error notifying admin ${adminRole.user_id}:`, adminError);
        emailsFailed++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent, 
        emailsFailed,
        totalAdmins: adminRoles.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-contact-notification function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

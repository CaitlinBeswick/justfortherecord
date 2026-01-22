import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .single();
    
    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RESEND_API_KEY not configured',
          details: 'The RESEND_API_KEY environment variable is not set. Please add it in the Lovable secrets.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if key looks valid
    if (!resendApiKey.startsWith('re_')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid API key format',
          details: `The RESEND_API_KEY doesn't appear to be valid. Resend keys should start with "re_". Current key starts with: "${resendApiKey.substring(0, 5)}..."`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);
    const userEmail = userData.user.email;

    if (!userEmail) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No email address',
          details: 'Your account does not have an email address associated with it.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send test email
    const emailResponse = await resend.emails.send({
      from: 'Just For The Record <notifications@resend.dev>',
      to: [userEmail],
      subject: '✅ Email Health Check - Success!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #fafafa; padding: 40px 20px;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #171717; border-radius: 12px; padding: 32px; border: 1px solid #262626; text-align: center;">
            <h1 style="color: #22c55e; font-size: 24px; margin: 0 0 16px 0;">✅ Email System Working!</h1>
            <p style="color: #a1a1aa; margin: 0;">
              This is a test email from Just For The Record.<br><br>
              If you're reading this, your email configuration is correct.
            </p>
            <hr style="border: none; border-top: 1px solid #262626; margin: 24px 0;">
            <p style="color: #71717a; font-size: 12px; margin: 0;">
              Sent at ${new Date().toISOString()}
            </p>
          </div>
        </body>
        </html>
      `,
    }) as { data?: { id: string } | null; error?: { message: string; name?: string } | null };

    if (emailResponse.error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Resend API error',
          details: emailResponse.error.message,
          errorName: emailResponse.error.name || 'unknown',
          keyPreview: `${resendApiKey.substring(0, 8)}...${resendApiKey.substring(resendApiKey.length - 4)}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Test email sent to ${userEmail}`,
        emailId: emailResponse.data?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in email-health-check:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Unexpected error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

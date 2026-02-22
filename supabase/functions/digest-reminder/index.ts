import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all admin user IDs
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) throw rolesError;
    if (!adminRoles || adminRoles.length === 0) {
      return new Response(JSON.stringify({ message: "No admin users found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminIds = adminRoles.map((r) => r.user_id);

    // Create in-app notifications for all admins
    const notifications = adminIds.map((userId) => ({
      user_id: userId,
      type: "digest_reminder",
      title: "Weekly Digest Reminder",
      message: "Don't forget to review and send this week's digest email to all users!",
      data: { link: "/admin" },
    }));

    const { error: notifError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (notifError) throw notifError;

    // Also send email reminders if Resend is configured
    let emailsSent = 0;
    if (resendApiKey) {
      // Get admin emails from auth
      for (const adminId of adminIds) {
        const { data: userData } = await supabase.auth.admin.getUserById(adminId);
        const email = userData?.user?.email;
        if (!email) continue;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Just For The Record <noreply@justfortherecord.app>",
            to: [email],
            subject: "Reminder: Send this week's digest",
            html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #dc2626;">Weekly Digest Reminder</h2>
                <p>Hey! Just a friendly reminder to review and send out this week's digest email from the admin dashboard.</p>
                <a href="https://justfortherecord.app/admin" style="display: inline-block; background: #dc2626; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 12px;">Go to Admin Dashboard</a>
              </div>
            `,
          }),
        });

        if (emailRes.ok) emailsSent++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        adminsNotified: adminIds.length,
        emailsSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

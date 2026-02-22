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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user with the anon client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    console.log(`Deleting account for user: ${userId}`);

    // Use service role client to delete user data and auth account
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete user data from all tables (order matters for foreign keys)
    const tablesToClean = [
      'list_items', // depends on user_lists
      'user_lists',
      'activity_comments',
      'activity_likes',
      'album_ratings',
      'artist_ratings',
      'artist_follows',
      'artist_release_type_preferences',
      'blocked_users',
      'diary_entries',
      'favorite_albums',
      'friendships',
      'listening_status',
      'notifications',
      'push_subscriptions',
      'recommendation_history',
      'release_inclusions',
      'release_overrides',
      'yearly_listening_goals',
      'profiles',
    ];

    for (const table of tablesToClean) {
      let query;
      if (table === 'list_items') {
        // Delete list items for user's lists
        const { data: userLists } = await adminClient
          .from('user_lists')
          .select('id')
          .eq('user_id', userId);
        if (userLists && userLists.length > 0) {
          await adminClient
            .from('list_items')
            .delete()
            .in('list_id', userLists.map(l => l.id));
        }
        continue;
      }
      if (table === 'friendships') {
        await adminClient
          .from('friendships')
          .delete()
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
        continue;
      }
      if (table === 'blocked_users') {
        await adminClient
          .from('blocked_users')
          .delete()
          .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
        continue;
      }
      await adminClient.from(table).delete().eq('user_id', userId);
    }

    // Delete user's avatar from storage if exists
    const { data: avatarFiles } = await adminClient.storage
      .from('avatars')
      .list(userId);
    if (avatarFiles && avatarFiles.length > 0) {
      await adminClient.storage
        .from('avatars')
        .remove(avatarFiles.map(f => `${userId}/${f.name}`));
    }

    // Finally delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(JSON.stringify({ error: "Failed to delete account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Successfully deleted account for user: ${userId}`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

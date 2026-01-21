import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DigestData {
  newReleases: Array<{
    artist_name: string;
    album_title: string;
    release_group_id: string;
    artist_id: string;
  }>;
  friendActivity: Array<{
    display_name: string;
    album_title: string;
    artist_name: string;
    rating: number | null;
    release_group_id: string;
  }>;
  trendingReleases: Array<{
    album_title: string;
    artist_name: string;
    release_group_id: string;
    listen_count: number;
  }>;
  appUpdates: Array<{
    title: string;
    description: string;
    version: string | null;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow service role or cron requests
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
      console.log('RESEND_API_KEY not configured, skipping digest emails');
      return new Response(
        JSON.stringify({ message: 'Email sending not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users who opted into weekly digest
    const { data: digestUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, display_name, username')
      .eq('email_notifications_enabled', true)
      .eq('email_weekly_digest', true);

    if (usersError) {
      throw new Error(`Failed to fetch digest users: ${usersError.message}`);
    }

    if (!digestUsers || digestUsers.length === 0) {
      console.log('No users opted into weekly digest');
      return new Response(
        JSON.stringify({ message: 'No digest subscribers' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing weekly digest for ${digestUsers.length} users`);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString();

    const baseUrl = 'https://justfortherecord.lovable.app';
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const digestUser of digestUsers) {
      try {
        // Get user's email
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(digestUser.id);
        
        if (authError || !authUser?.user?.email) {
          console.log(`Could not get email for user ${digestUser.id}`);
          continue;
        }

        const userEmail = authUser.user.email;
        const userName = digestUser.display_name || digestUser.username || 'there';

        // Get new releases from followed artists in the past week
        const { data: follows } = await supabase
          .from('artist_follows')
          .select('artist_id, artist_name')
          .eq('user_id', digestUser.id);

        // Get notifications about new releases in the past week
        const { data: newReleaseNotifications } = await supabase
          .from('notifications')
          .select('data, created_at')
          .eq('user_id', digestUser.id)
          .eq('type', 'new_release')
          .gte('created_at', oneWeekAgoStr)
          .order('created_at', { ascending: false });

        const newReleases: DigestData['newReleases'] = [];
        if (newReleaseNotifications) {
          for (const notification of newReleaseNotifications) {
            const data = notification.data as Record<string, unknown> | null;
            if (data && data.artist_name && data.album_title) {
              newReleases.push({
                artist_name: String(data.artist_name),
                album_title: String(data.album_title),
                release_group_id: String(data.release_group_id || ''),
                artist_id: String(data.artist_id || ''),
              });
            }
          }
        }

        // Get friend activity in the past week
        const { data: friendships } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${digestUser.id},addressee_id.eq.${digestUser.id}`);

        const friendIds = friendships?.map(f => 
          f.requester_id === digestUser.id ? f.addressee_id : f.requester_id
        ) || [];

        const friendActivity: DigestData['friendActivity'] = [];
        
        if (friendIds.length > 0) {
          // Get diary entries from friends in the past week
          const { data: friendDiaryEntries } = await supabase
            .from('diary_entries')
            .select('user_id, album_title, artist_name, rating, release_group_id')
            .in('user_id', friendIds)
            .gte('created_at', oneWeekAgoStr)
            .order('created_at', { ascending: false })
            .limit(10);

          if (friendDiaryEntries) {
            // Get friend profiles
            const { data: friendProfiles } = await supabase
              .from('profiles')
              .select('id, display_name, username')
              .in('id', friendIds);

            const profileMap = new Map(
              friendProfiles?.map(p => [p.id, p.display_name || p.username || 'A friend']) || []
            );

            for (const entry of friendDiaryEntries) {
              friendActivity.push({
                display_name: profileMap.get(entry.user_id) || 'A friend',
                album_title: entry.album_title,
                artist_name: entry.artist_name,
                rating: entry.rating,
                release_group_id: entry.release_group_id,
              });
            }
          }
        }

        // Get trending releases from the community (most listened this week)
        const { data: trendingData } = await supabase
          .from('diary_entries')
          .select('release_group_id, album_title, artist_name')
          .gte('created_at', oneWeekAgoStr)
          .order('created_at', { ascending: false });

        const trendingReleases: DigestData['trendingReleases'] = [];
        if (trendingData && trendingData.length > 0) {
          // Count listens per album
          const listenCounts = new Map<string, { album_title: string; artist_name: string; release_group_id: string; count: number }>();
          for (const entry of trendingData) {
            const existing = listenCounts.get(entry.release_group_id);
            if (existing) {
              existing.count++;
            } else {
              listenCounts.set(entry.release_group_id, {
                album_title: entry.album_title,
                artist_name: entry.artist_name,
                release_group_id: entry.release_group_id,
                count: 1,
              });
            }
          }
          // Sort by count and take top 5
          const sorted = Array.from(listenCounts.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
          for (const item of sorted) {
            trendingReleases.push({
              album_title: item.album_title,
              artist_name: item.artist_name,
              release_group_id: item.release_group_id,
              listen_count: item.count,
            });
          }
        }

        // Get recent app updates (past 2 weeks)
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const { data: appUpdatesData } = await supabase
          .from('app_updates')
          .select('title, description, version, created_at')
          .eq('is_active', true)
          .gte('created_at', twoWeeksAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(3);

        const appUpdates: DigestData['appUpdates'] = appUpdatesData?.map(u => ({
          title: u.title,
          description: u.description,
          version: u.version,
        })) || [];

        // Skip if there's nothing to report
        if (newReleases.length === 0 && friendActivity.length === 0 && trendingReleases.length === 0 && appUpdates.length === 0) {
          console.log(`No activity to report for user ${digestUser.id}`);
          continue;
        }

        // Build email content
        let releasesHtml = '';
        if (newReleases.length > 0) {
          const releasesItems = newReleases.slice(0, 5).map(r => `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #262626;">
                <a href="${baseUrl}/album/${r.release_group_id}" style="color: #fafafa; text-decoration: none; font-weight: 500;">
                  ${r.album_title}
                </a>
                <br>
                <span style="color: #a1a1aa; font-size: 14px;">by ${r.artist_name}</span>
              </td>
            </tr>
          `).join('');

          releasesHtml = `
            <div style="margin-bottom: 32px;">
              <h2 style="color: #f97316; font-size: 18px; margin: 0 0 16px 0; display: flex; align-items: center;">
                🎵 New Releases (${newReleases.length})
              </h2>
              <table style="width: 100%; border-collapse: collapse;">
                ${releasesItems}
              </table>
              ${newReleases.length > 5 ? `<p style="color: #71717a; font-size: 14px; margin-top: 12px;">+ ${newReleases.length - 5} more releases</p>` : ''}
            </div>
          `;
        }

        let activityHtml = '';
        if (friendActivity.length > 0) {
          const activityItems = friendActivity.slice(0, 5).map(a => `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #262626;">
                <span style="color: #f97316; font-weight: 500;">${a.display_name}</span>
                <span style="color: #a1a1aa;"> listened to </span>
                <a href="${baseUrl}/album/${a.release_group_id}" style="color: #fafafa; text-decoration: none; font-weight: 500;">
                  ${a.album_title}
                </a>
                <span style="color: #a1a1aa;"> by ${a.artist_name}</span>
                ${a.rating ? `<span style="color: #fbbf24; margin-left: 8px;">★ ${a.rating}</span>` : ''}
              </td>
            </tr>
          `).join('');

          activityHtml = `
            <div style="margin-bottom: 32px;">
              <h2 style="color: #f97316; font-size: 18px; margin: 0 0 16px 0;">
                👥 Friend Activity (${friendActivity.length})
              </h2>
              <table style="width: 100%; border-collapse: collapse;">
                ${activityItems}
              </table>
              ${friendActivity.length > 5 ? `<p style="color: #71717a; font-size: 14px; margin-top: 12px;">+ ${friendActivity.length - 5} more listens</p>` : ''}
            </div>
          `;
        }

        // Trending releases section
        let trendingHtml = '';
        if (trendingReleases.length > 0) {
          const trendingItems = trendingReleases.map(t => `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #262626;">
                <a href="${baseUrl}/album/${t.release_group_id}" style="color: #fafafa; text-decoration: none; font-weight: 500;">
                  ${t.album_title}
                </a>
                <br>
                <span style="color: #a1a1aa; font-size: 14px;">by ${t.artist_name}</span>
                <span style="color: #71717a; font-size: 13px; margin-left: 8px;">(${t.listen_count} listens)</span>
              </td>
            </tr>
          `).join('');

          trendingHtml = `
            <div style="margin-bottom: 32px;">
              <h2 style="color: #f97316; font-size: 18px; margin: 0 0 16px 0;">
                🔥 Trending This Week
              </h2>
              <table style="width: 100%; border-collapse: collapse;">
                ${trendingItems}
              </table>
            </div>
          `;
        }

        // App updates section
        let updatesHtml = '';
        if (appUpdates.length > 0) {
          const updateItems = appUpdates.map(u => `
            <div style="padding: 12px 0; border-bottom: 1px solid #262626;">
              <p style="color: #fafafa; font-weight: 500; margin: 0 0 4px 0;">
                ${u.title}
                ${u.version ? `<span style="color: #71717a; font-size: 12px; margin-left: 8px;">v${u.version}</span>` : ''}
              </p>
              <p style="color: #a1a1aa; font-size: 14px; margin: 0;">${u.description}</p>
            </div>
          `).join('');

          updatesHtml = `
            <div style="margin-bottom: 32px;">
              <h2 style="color: #f97316; font-size: 18px; margin: 0 0 16px 0;">
                ✨ What's New
              </h2>
              ${updateItems}
            </div>
          `;
        }

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #fafafa; padding: 40px 20px; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #171717; border-radius: 12px; padding: 32px; border: 1px solid #262626;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #fafafa; font-size: 28px; margin: 0 0 8px 0;">📀 Your Weekly Digest</h1>
                <p style="color: #a1a1aa; font-size: 16px; margin: 0;">Hey ${userName}, here's what happened this week!</p>
              </div>
              
              ${releasesHtml}
              ${activityHtml}
              ${trendingHtml}
              ${updatesHtml}

              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${baseUrl}" style="display: inline-block; background-color: #f97316; color: #0a0a0a; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  Open Just For The Record
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #262626; margin: 32px 0;">
              <p style="color: #71717a; font-size: 12px; text-align: center; margin: 0;">
                You're receiving this weekly digest because you opted in.
                <br><br>
                <a href="${baseUrl}/profile/settings" style="color: #71717a; text-decoration: underline;">Manage email preferences</a>
              </p>
            </div>
          </body>
          </html>
        `;

        // Send the email
        const emailResponse = await resend.emails.send({
          from: 'Just For The Record <notifications@resend.dev>',
          to: [userEmail],
          subject: `📀 Your Weekly Digest - ${newReleases.length} new releases, ${friendActivity.length} friend listens`,
          html: emailHtml,
        }) as { data?: { id: string } | null; error?: { message: string } | null };

        if (emailResponse.error) {
          console.error(`Failed to send digest to ${userEmail}:`, emailResponse.error.message);
          emailsFailed++;
        } else {
          console.log(`Weekly digest sent to ${userEmail}`);
          emailsSent++;
        }

      } catch (userError) {
        console.error(`Error processing digest for user ${digestUser.id}:`, userError);
        emailsFailed++;
      }
    }

    console.log(`Weekly digest complete: ${emailsSent} sent, ${emailsFailed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent, 
        emailsFailed,
        totalUsers: digestUsers.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-weekly-digest function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

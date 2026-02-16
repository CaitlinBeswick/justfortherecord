import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HTML entity escape function to prevent XSS
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
  userActivity: {
    albumsLogged: number;
    artistsRated: number;
    topAlbum: { title: string; artist: string; rating: number | null } | null;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  // Parse request body for test mode
  let testMode = false;
  let requestingUserId: string | null = null;
  
  try {
    const body = await req.json();
    testMode = body?.testMode === true;
  } catch {
    // No body or invalid JSON, continue with defaults
  }
  
  // Check authorization - allow service role key OR admin users
  const authHeader = req.headers.get('Authorization');
  
  if (authHeader === `Bearer ${supabaseServiceKey}`) {
    // Service role key - allowed (cron jobs)
  } else if (authHeader?.startsWith('Bearer ')) {
    // Check if it's an admin user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    requestingUserId = claimsData.user.id;
    
    // Check if user is admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', claimsData.user.id)
      .eq('role', 'admin')
      .single();
    
    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } else {
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch email template settings
    const { data: emailSettings } = await supabase
      .from('digest_email_settings')
      .select('*')
      .limit(1)
      .single();
    
    const templateSettings = {
      subject: emailSettings?.subject || 'Your Weekly Digest from Just For The Record',
      greeting: emailSettings?.greeting || 'Hey {userName}, here\'s what happened this week',
      customNote: emailSettings?.custom_note || null,
      ctaText: emailSettings?.cta_text || 'Open Just For The Record',
    };

    // Get users to send digest to
    let digestUsers;
    
    if (testMode && requestingUserId) {
      // In test mode, only send to the requesting admin
      const { data: adminProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, username')
        .eq('id', requestingUserId)
        .single();
      
      if (profileError || !adminProfile) {
        throw new Error('Could not find admin profile');
      }
      
      digestUsers = [adminProfile];
      console.log(`Test mode: sending digest to admin only`);
    } else {
      // Normal mode: get all opted-in users
      const { data, error: usersError } = await supabase
        .from('profiles')
        .select('id, display_name, username')
        .eq('email_notifications_enabled', true)
        .eq('email_weekly_digest', true);

      if (usersError) {
        throw new Error(`Failed to fetch digest users: ${usersError.message}`);
      }
      
      digestUsers = data;
    }

    if (!digestUsers || digestUsers.length === 0) {
      console.log('No users to send digest to');
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
    // Base64 encoded vinyl record logo for email (embedded to avoid email client blocking)
    const logoDataUri = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIzMCIgZmlsbD0iIzFhMWExYSIvPgogIDxjaXJjbGUgY3g9IjMyIiBjeT0iMzIiIHI9IjI2IiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMC41Ii8+CiAgPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMjIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIwLjUiLz4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIxOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjAuNSIvPgogIDxjaXJjbGUgY3g9IjMyIiBjeT0iMzIiIHI9IjEyIiBmaWxsPSIjZGMyNjI2Ii8+CiAgPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iNCIgZmlsbD0iIzFhMWExYSIvPgogIDxjaXJjbGUgY3g9IjMyIiBjeT0iMzIiIHI9IjIiIGZpbGw9IiNmZmYiLz4KPC9zdmc+';
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
        const userName = escapeHtml(digestUser.display_name || digestUser.username || 'there');

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

        // Get user's own activity this week
        const { data: userDiaryEntries } = await supabase
          .from('diary_entries')
          .select('album_title, artist_name, rating')
          .eq('user_id', digestUser.id)
          .gte('created_at', oneWeekAgoStr)
          .order('rating', { ascending: false, nullsFirst: false });

        const { data: userArtistRatings } = await supabase
          .from('artist_ratings')
          .select('id')
          .eq('user_id', digestUser.id)
          .gte('created_at', oneWeekAgoStr);

        const userActivity: DigestData['userActivity'] = {
          albumsLogged: userDiaryEntries?.length || 0,
          artistsRated: userArtistRatings?.length || 0,
          topAlbum: userDiaryEntries?.[0] ? {
            title: userDiaryEntries[0].album_title,
            artist: userDiaryEntries[0].artist_name,
            rating: userDiaryEntries[0].rating,
          } : null,
        };

        // Skip if there's nothing to report
        if (newReleases.length === 0 && friendActivity.length === 0 && trendingReleases.length === 0 && appUpdates.length === 0 && userActivity.albumsLogged === 0) {
          console.log(`No activity to report for user ${digestUser.id}`);
          continue;
        }

        // Build email content with off-white/red theme
        const primaryColor = '#dc2626'; // Red
        const bgColor = '#dc2626'; // Red background
        const contentBg = '#ffffff'; // White content area
        const cardBg = '#ffffff';
        const textColor = '#1a1a1a';
        const mutedColor = '#6b7280';
        const borderColor = '#e5e2de';

        // User's weekly summary section - escape user-generated content
        let userSummaryHtml = '';
        if (userActivity.albumsLogged > 0 || userActivity.artistsRated > 0) {
          userSummaryHtml = `
            <div style="margin-bottom: 32px; background-color: ${cardBg}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 24px;">
              <h2 style="font-family: 'Georgia', serif; color: ${textColor}; font-size: 20px; margin: 0 0 16px 0; font-weight: 500; text-align: center;">
                Your Week in Review
              </h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center; padding: 8px; width: 50%;">
                    <p style="font-size: 32px; font-weight: 600; color: ${primaryColor}; margin: 0;">${userActivity.albumsLogged}</p>
                    <p style="font-size: 14px; color: ${mutedColor}; margin: 4px 0 0 0;">Albums logged</p>
                  </td>
                  <td style="text-align: center; padding: 8px; width: 50%;">
                    <p style="font-size: 32px; font-weight: 600; color: ${primaryColor}; margin: 0;">${userActivity.artistsRated}</p>
                    <p style="font-size: 14px; color: ${mutedColor}; margin: 4px 0 0 0;">Artists rated</p>
                  </td>
                </tr>
              </table>
              ${userActivity.topAlbum ? `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${borderColor}; text-align: center;">
                  <p style="font-size: 12px; color: ${mutedColor}; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Top rated this week</p>
                  <p style="font-size: 16px; color: ${textColor}; margin: 0; font-weight: 500;">${escapeHtml(userActivity.topAlbum.title)}</p>
                  <p style="font-size: 14px; color: ${mutedColor}; margin: 4px 0 0 0;">by ${escapeHtml(userActivity.topAlbum.artist)}${userActivity.topAlbum.rating ? ` · ${userActivity.topAlbum.rating} stars` : ''}</p>
                </div>
              ` : ''}
            </div>
          `;
        }

        let releasesHtml = '';
        if (newReleases.length > 0) {
          const releasesItems = newReleases.slice(0, 5).map(r => `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid ${borderColor};">
                <a href="${baseUrl}/album/${encodeURIComponent(r.release_group_id)}" style="color: ${textColor}; text-decoration: none; font-weight: 500;">
                  ${escapeHtml(r.album_title)}
                </a>
                <br>
                <span style="color: ${mutedColor}; font-size: 14px;">by ${escapeHtml(r.artist_name)}</span>
              </td>
            </tr>
          `).join('');

          releasesHtml = `
            <div style="margin-bottom: 32px; background-color: ${cardBg}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 24px;">
              <h2 style="font-family: 'Georgia', serif; color: ${textColor}; font-size: 20px; margin: 0 0 16px 0; font-weight: 500;">
                New Releases
              </h2>
              <table style="width: 100%; border-collapse: collapse;">
                ${releasesItems}
              </table>
              ${newReleases.length > 5 ? `<p style="color: ${mutedColor}; font-size: 14px; margin-top: 12px;">+ ${newReleases.length - 5} more releases</p>` : ''}
            </div>
          `;
        }

        let activityHtml = '';
        if (friendActivity.length > 0) {
          const activityItems = friendActivity.slice(0, 5).map(a => `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid ${borderColor};">
                <span style="color: ${primaryColor}; font-weight: 500;">${escapeHtml(a.display_name)}</span>
                <span style="color: ${mutedColor};"> listened to </span>
                <a href="${baseUrl}/album/${encodeURIComponent(a.release_group_id)}" style="color: ${textColor}; text-decoration: none; font-weight: 500;">
                  ${escapeHtml(a.album_title)}
                </a>
                <span style="color: ${mutedColor};"> by ${escapeHtml(a.artist_name)}</span>
                ${a.rating ? `<span style="color: ${primaryColor}; margin-left: 8px;">★ ${a.rating}</span>` : ''}
              </td>
            </tr>
          `).join('');

          activityHtml = `
            <div style="margin-bottom: 32px; background-color: ${cardBg}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 24px;">
              <h2 style="font-family: 'Georgia', serif; color: ${textColor}; font-size: 20px; margin: 0 0 16px 0; font-weight: 500;">
                Friend Activity
              </h2>
              <table style="width: 100%; border-collapse: collapse;">
                ${activityItems}
              </table>
              ${friendActivity.length > 5 ? `<p style="color: ${mutedColor}; font-size: 14px; margin-top: 12px;">+ ${friendActivity.length - 5} more listens</p>` : ''}
            </div>
          `;
        }

        // Trending releases section - escape user-generated content
        let trendingHtml = '';
        if (trendingReleases.length > 0) {
          const trendingItems = trendingReleases.map(t => `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid ${borderColor};">
                <a href="${baseUrl}/album/${encodeURIComponent(t.release_group_id)}" style="color: ${textColor}; text-decoration: none; font-weight: 500;">
                  ${escapeHtml(t.album_title)}
                </a>
                <br>
                <span style="color: ${mutedColor}; font-size: 14px;">by ${escapeHtml(t.artist_name)}</span>
                <span style="color: ${mutedColor}; font-size: 13px; margin-left: 8px;">(${t.listen_count} listens)</span>
              </td>
            </tr>
          `).join('');

          trendingHtml = `
            <div style="margin-bottom: 32px; background-color: ${cardBg}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 24px;">
              <h2 style="font-family: 'Georgia', serif; color: ${textColor}; font-size: 20px; margin: 0 0 16px 0; font-weight: 500;">
                Trending This Week
              </h2>
              <table style="width: 100%; border-collapse: collapse;">
                ${trendingItems}
              </table>
            </div>
          `;
        }

        // App updates section - escape admin-generated content (good practice)
        let updatesHtml = '';
        if (appUpdates.length > 0) {
          const updateItems = appUpdates.map(u => `
            <div style="padding: 12px 0; border-bottom: 1px solid ${borderColor};">
              <p style="color: ${textColor}; font-weight: 500; margin: 0 0 4px 0;">
                ${escapeHtml(u.title)}
                ${u.version ? `<span style="color: ${mutedColor}; font-size: 12px; margin-left: 8px;">v${escapeHtml(u.version)}</span>` : ''}
              </p>
              <p style="color: ${mutedColor}; font-size: 14px; margin: 0;">${escapeHtml(u.description)}</p>
            </div>
          `).join('');

          updatesHtml = `
            <div style="margin-bottom: 32px; background-color: ${cardBg}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 24px;">
              <h2 style="font-family: 'Georgia', serif; color: ${textColor}; font-size: 20px; margin: 0 0 16px 0; font-weight: 500;">
                What's New
              </h2>
              ${updateItems}
            </div>
          `;
        }

        // Custom note section from template settings - escape admin content
        const customNoteHtml = templateSettings.customNote ? `
          <div style="margin-bottom: 32px; background-color: ${primaryColor}10; border: 1px solid ${primaryColor}30; border-radius: 12px; padding: 24px;">
            <p style="color: ${textColor}; font-size: 15px; margin: 0; line-height: 1.6;">${escapeHtml(templateSettings.customNote)}</p>
          </div>
        ` : '';
        
        // Personalize greeting from template settings - userName is already escaped
        const personalizedGreeting = escapeHtml(templateSettings.greeting).replace('{userName}', userName);

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
          </head>
          <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${bgColor}; color: ${textColor}; padding: 0; margin: 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor};">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <div style="max-width: 600px; margin: 0 auto;">
                    <!-- Header with Logo on red bg -->
                    <div style="text-align: center; margin-bottom: 32px;">
                      <img src="${logoDataUri}" alt="Just For The Record" style="width: 64px; height: 64px; margin-bottom: 16px; border-radius: 12px; display: block; margin-left: auto; margin-right: auto;" />
                      <h1 style="font-family: 'Georgia', serif; color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 500;">Your Weekly Digest</h1>
                      <p style="color: #ffffffcc; font-size: 16px; margin: 0;">${personalizedGreeting}</p>
                    </div>
                    
                    <!-- White content area -->
                    <div style="background-color: ${contentBg}; border-radius: 16px; padding: 32px 24px;">
                      ${customNoteHtml}
                      ${userSummaryHtml}
                      ${releasesHtml}
                      ${activityHtml}
                      ${trendingHtml}
                      ${updatesHtml}
                      
                      <div style="text-align: center; margin: 32px 0 16px 0;">
                        <a href="${baseUrl}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                          ${escapeHtml(templateSettings.ctaText)}
                        </a>
                      </div>
                    </div>
                    
                    <p style="color: #ffffffaa; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
                      You're receiving this weekly digest because you opted in.
                      <br><br>
                      <a href="${baseUrl}/profile/settings" style="color: #ffffffcc; text-decoration: underline;">Manage email preferences</a>
                    </p>
                  </div>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        // Send the email
        const emailResponse = await resend.emails.send({
          from: 'Just For The Record <notifications@resend.dev>',
          to: [userEmail],
          subject: templateSettings.subject,
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

    // Log the digest send to the database
    await supabase.from('digest_email_logs').insert({
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      total_users: digestUsers.length,
      is_test: testMode,
      triggered_by: requestingUserId,
    });

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

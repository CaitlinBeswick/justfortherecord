import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Artist {
  id: string;
  name: string;
}

interface ReleaseGroup {
  id: string;
  title: string;
  'primary-type'?: string;
  'first-release-date'?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify request is from authorized source (cron job or admin)
  // This function should only be called by pg_cron or authorized services
  const authHeader = req.headers.get('Authorization');
  const expectedKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  // Accept either service role key or a matching CRON_SECRET
  const cronSecret = Deno.env.get('CRON_SECRET');
  const isAuthorized = 
    authHeader === `Bearer ${expectedKey}` || 
    (cronSecret && authHeader === `Bearer ${cronSecret}`);

  if (!isAuthorized) {
    console.log('Unauthorized request to check-new-releases');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting new release check...');

    // Get all unique followed artists
    const { data: follows, error: followsError } = await supabase
      .from('artist_follows')
      .select('user_id, artist_id, artist_name');

    if (followsError) {
      console.error('Error fetching follows:', followsError);
      throw followsError;
    }

    if (!follows || follows.length === 0) {
      console.log('No artist follows found');
      return new Response(
        JSON.stringify({ message: 'No artist follows to check' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group follows by artist to avoid duplicate API calls
    const artistFollowers: Map<string, { artistId: string; artistName: string; userIds: string[] }> = new Map();
    
    for (const follow of follows) {
      const existing = artistFollowers.get(follow.artist_id);
      if (existing) {
        existing.userIds.push(follow.user_id);
      } else {
        artistFollowers.set(follow.artist_id, {
          artistId: follow.artist_id,
          artistName: follow.artist_name,
          userIds: [follow.user_id],
        });
      }
    }

    console.log(`Checking ${artistFollowers.size} unique artists for new releases...`);

    const notificationsToCreate: Array<{
      user_id: string;
      type: string;
      title: string;
      message: string;
      data: Record<string, unknown>;
    }> = [];

    // Check each artist for new releases (limit rate to be nice to MusicBrainz)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const [artistId, artistData] of artistFollowers) {
      try {
        // Add delay between requests to respect MusicBrainz rate limits
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Fetch recent releases from MusicBrainz
        const url = `https://musicbrainz.org/ws/2/release-group?artist=${artistId}&type=album|ep|single&limit=5&fmt=json`;
        console.log(`Fetching releases for ${artistData.artistName}: ${url}`);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'JustForTheRecord/1.0 (lovable.dev)',
          },
        });

        if (!response.ok) {
          console.error(`MusicBrainz API error for artist ${artistId}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const releaseGroups: ReleaseGroup[] = data['release-groups'] || [];

        console.log(`Found ${releaseGroups.length} release groups for ${artistData.artistName}`);

        // Check for releases in the last 30 days
        for (const release of releaseGroups) {
          if (!release['first-release-date']) continue;

          const releaseDate = new Date(release['first-release-date']);
          
          // Check if release is within the last 30 days
          if (releaseDate >= thirtyDaysAgo && releaseDate <= new Date()) {
            console.log(`New release found: ${release.title} by ${artistData.artistName}`);

            // Check if we already sent notifications for this release
            const { data: existingNotifications } = await supabase
              .from('notifications')
              .select('id, user_id')
              .eq('type', 'new_release')
              .contains('data', { release_group_id: release.id });

            const notifiedUserIds = new Set(existingNotifications?.map(n => n.user_id) || []);

            // Create notifications for users who haven't been notified yet
            for (const userId of artistData.userIds) {
              if (!notifiedUserIds.has(userId)) {
                notificationsToCreate.push({
                  user_id: userId,
                  type: 'new_release',
                  title: `New ${release['primary-type'] || 'Release'} from ${artistData.artistName}`,
                  message: `"${release.title}" was released on ${release['first-release-date']}`,
                  data: {
                    artist_id: artistId,
                    artist_name: artistData.artistName,
                    release_group_id: release.id,
                    release_title: release.title,
                    release_type: release['primary-type'],
                    release_date: release['first-release-date'],
                  },
                });
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error checking releases for artist ${artistId}:`, error);
      }
    }

    // Batch insert notifications and send emails
    if (notificationsToCreate.length > 0) {
      console.log(`Creating ${notificationsToCreate.length} notifications...`);
      
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToCreate);

      if (insertError) {
        console.error('Error inserting notifications:', insertError);
        throw insertError;
      }

      console.log(`Successfully created ${notificationsToCreate.length} notifications`);

      // Send email and push notifications (non-blocking)
      const supabaseFunctionsUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.functions.supabase.co');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      for (const notification of notificationsToCreate) {
        try {
          // Send email notification (fire and forget)
          fetch(`${supabaseFunctionsUrl}/send-notification-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              user_id: notification.user_id,
              notification_type: notification.type,
              title: notification.title,
              message: notification.message,
              data: notification.data,
            }),
          }).catch(err => console.error('Email send error:', err));

          // Send push notification (fire and forget)
          const pushData = notification.data as { release_group_id?: string; artist_name?: string };
          fetch(`${supabaseFunctionsUrl}/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              user_id: notification.user_id,
              notification_type: 'new_release',
              payload: {
                title: notification.title,
                body: notification.message,
                icon: '/favicon.png',
                badge: '/favicon.png',
                url: `/album/${pushData?.release_group_id || ''}`,
                tag: `new-release-${pushData?.release_group_id || Date.now()}`,
              },
            }),
          }).catch(err => console.error('Push send error:', err));
        } catch (notifError) {
          console.error('Error queuing notification:', notifError);
        }
      }
    } else {
      console.log('No new notifications to create');
    }

    return new Response(
      JSON.stringify({ 
        message: 'Release check completed',
        artistsChecked: artistFollowers.size,
        notificationsCreated: notificationsToCreate.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-new-releases function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

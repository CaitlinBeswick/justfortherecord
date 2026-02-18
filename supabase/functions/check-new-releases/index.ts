import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReleaseGroup {
  id: string;
  title: string;
  'primary-type'?: string;
  'secondary-types'?: string[];
  'first-release-date'?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Accept any bearer token — this function is only triggered internally by pg_cron or admin
  const authHeader = req.headers.get('Authorization') || '';
  const bearerToken = authHeader.replace('Bearer ', '').trim();
  if (!bearerToken) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting new release check using cached release data...');

    // Get all artist follows
    const { data: follows, error: followsError } = await supabase
      .from('artist_follows')
      .select('user_id, artist_id, artist_name');

    if (followsError) throw followsError;
    if (!follows || follows.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No artist follows to check' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group follows by artist
    const artistFollowers = new Map<string, { artistId: string; artistName: string; userIds: string[] }>();
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

    const artistIds = Array.from(artistFollowers.keys());
    console.log(`Checking ${artistIds.length} unique artists using artist_release_cache...`);

    // Fetch all cached releases for followed artists in ONE query (no MusicBrainz API needed!)
    const { data: cachedReleases, error: cacheError } = await supabase
      .from('artist_release_cache')
      .select('artist_id, payload, fetched_at')
      .in('artist_id', artistIds);

    if (cacheError) {
      console.error('Error fetching release cache:', cacheError);
      throw cacheError;
    }

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const now = new Date();

    // Collect all candidate releases across all artists
    const candidateReleases: Array<{
      artistId: string;
      artistName: string;
      userIds: string[];
      release: ReleaseGroup;
    }> = [];

    for (const cache of cachedReleases || []) {
      const artistData = artistFollowers.get(cache.artist_id);
      if (!artistData) continue;

      const releases: ReleaseGroup[] = Array.isArray(cache.payload) ? cache.payload : [];
      
      for (const release of releases) {
        if (!release['first-release-date']) continue;
        
        // Skip Singles
        if (release['primary-type'] === 'Single') continue;
        // Skip Compilations and Live
        const secondaryTypes = release['secondary-types'] || [];
        if (secondaryTypes.includes('Compilation') || secondaryTypes.includes('Live')) continue;

        const releaseDate = new Date(release['first-release-date']);
        if (releaseDate >= sixtyDaysAgo && releaseDate <= now) {
          candidateReleases.push({
            artistId: cache.artist_id,
            artistName: artistData.artistName,
            userIds: artistData.userIds,
            release,
          });
        }
      }
    }

    console.log(`Found ${candidateReleases.length} candidate releases in the last 60 days`);

    if (candidateReleases.length === 0) {
      // Also check artists whose cache might be stale — fetch from MusicBrainz for recently active artists
      const cachedArtistIds = new Set((cachedReleases || []).map(c => c.artist_id));
      const uncachedArtistIds = artistIds.filter(id => !cachedArtistIds.has(id));
      console.log(`${uncachedArtistIds.length} artists have no cached release data`);

      return new Response(
        JSON.stringify({ 
          message: 'No recent releases found in cache',
          artistsChecked: artistIds.length,
          cachedArtists: cachedReleases?.length || 0,
          uncachedArtists: uncachedArtistIds.length,
          notificationsCreated: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Collect all release IDs to check for existing notifications in one query
    const releaseIds = [...new Set(candidateReleases.map(c => c.release.id))];
    const { data: existingNotifs } = await supabase
      .from('notifications')
      .select('user_id, data')
      .eq('type', 'new_release')
      .in('data->>release_group_id', releaseIds);

    // Build set of already-notified (userId, releaseGroupId) pairs
    const notifiedPairs = new Set(
      (existingNotifs || []).map(n => `${n.user_id}::${(n.data as Record<string, unknown>)?.['release_group_id']}`)
    );

    // Build notification list
    const notificationsToCreate: Array<{
      user_id: string;
      type: string;
      title: string;
      message: string;
      data: Record<string, unknown>;
    }> = [];

    for (const { artistId, artistName, userIds, release } of candidateReleases) {
      for (const userId of userIds) {
        const pairKey = `${userId}::${release.id}`;
        if (!notifiedPairs.has(pairKey)) {
          notificationsToCreate.push({
            user_id: userId,
            type: 'new_release',
            title: `New ${release['primary-type'] || 'Release'} from ${artistName}`,
            message: `"${release.title}" was released on ${release['first-release-date']}`,
            data: {
              artist_id: artistId,
              artist_name: artistName,
              release_group_id: release.id,
              release_title: release.title,
              release_type: release['primary-type'],
              release_date: release['first-release-date'],
            },
          });
        }
      }
    }

    console.log(`Creating ${notificationsToCreate.length} new notifications...`);

    if (notificationsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToCreate);

      if (insertError) {
        console.error('Error inserting notifications:', insertError);
        throw insertError;
      }

      console.log(`Successfully created ${notificationsToCreate.length} notifications`);

      // Send email and push notifications (non-blocking, fire and forget)
      const supabaseFunctionsUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.functions.supabase.co');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      for (const notification of notificationsToCreate) {
        try {
          fetch(`${supabaseFunctionsUrl}/send-notification-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({
              user_id: notification.user_id,
              notification_type: notification.type,
              title: notification.title,
              message: notification.message,
              data: notification.data,
            }),
          }).catch(err => console.error('Email send error:', err));

          const pushData = notification.data as { release_group_id?: string };
          fetch(`${supabaseFunctionsUrl}/send-push-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
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
    }

    return new Response(
      JSON.stringify({
        message: 'Release check completed',
        artistsChecked: artistIds.length,
        cachedArtists: cachedReleases?.length || 0,
        candidateReleases: candidateReleases.length,
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "JustForTheRecord/1.0.0 (contact@example.com)";

// Rate limit: 1 request per second to MusicBrainz
async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all album ratings without release dates for the current user
    const { data: ratings, error: ratingsError } = await supabase
      .from('album_ratings')
      .select('id, release_group_id, album_title, artist_name, release_date')
      .eq('user_id', user.id)
      .is('release_date', null);

    if (ratingsError) {
      console.error('Error fetching ratings:', ratingsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch ratings' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${ratings?.length || 0} ratings without release dates`);

    if (!ratings || ratings.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        updated: 0, 
        message: 'All albums already have release dates' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let updated = 0;
    let failed = 0;

    for (const rating of ratings) {
      try {
        // Rate limit
        await delay(1100);

        const url = `${MUSICBRAINZ_BASE}/release-group/${rating.release_group_id}?fmt=json`;
        console.log(`Fetching release date for ${rating.album_title} (${rating.release_group_id})`);

        const response = await fetch(url, {
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          console.error(`MusicBrainz error for ${rating.album_title}: ${response.status}`);
          failed++;
          continue;
        }

        const data = await response.json();
        const releaseDate = data['first-release-date'];

        if (releaseDate) {
          const { error: updateError } = await supabase
            .from('album_ratings')
            .update({ release_date: releaseDate })
            .eq('id', rating.id);

          if (updateError) {
            console.error(`Failed to update ${rating.album_title}:`, updateError);
            failed++;
          } else {
            console.log(`Updated ${rating.album_title} with release date ${releaseDate}`);
            updated++;
          }
        } else {
          console.log(`No release date found for ${rating.album_title}`);
        }
      } catch (e) {
        console.error(`Error processing ${rating.album_title}:`, e);
        failed++;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      updated, 
      failed,
      total: ratings.length,
      message: `Updated ${updated} of ${ratings.length} albums` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

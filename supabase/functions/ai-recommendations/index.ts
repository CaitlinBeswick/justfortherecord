import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function albumKey(title: string, artist: string): string {
  return normalizeForMatch(`${title}|||${artist}`);
}

function artistKey(name: string): string {
  return normalizeForMatch(name);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse optional mood and includeKnown from request body
    let mood: string | undefined;
    let includeKnown = false;
    try {
      const body = await req.json();
      mood = body?.mood;
      includeKnown = body?.includeKnown === true;
    } catch {
      // No body or invalid JSON, that's fine
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's top rated albums (for taste profile)
    const { data: topRatedAlbums } = await supabase
      .from("album_ratings")
      .select("album_title, artist_name, rating")
      .eq("user_id", user.id)
      .gte("rating", 4)
      .order("rating", { ascending: false })
      .limit(20);

    // Fetch ALL rated albums (for exclusion)
    const { data: allRatedAlbums } = await supabase
      .from("album_ratings")
      .select("album_title, artist_name")
      .eq("user_id", user.id);

    // Fetch ALL listened albums (for exclusion)
    const { data: allListenedAlbums } = await supabase
      .from("listening_status")
      .select("album_title, artist_name")
      .eq("user_id", user.id)
      .eq("is_listened", true);

    // Fetch ALL to-listen albums (for exclusion - don't recommend what's already queued)
    const { data: allToListenAlbums } = await supabase
      .from("listening_status")
      .select("album_title, artist_name")
      .eq("user_id", user.id)
      .eq("is_to_listen", true);

    // Fetch user's followed artists
    const { data: followedArtists } = await supabase
      .from("artist_follows")
      .select("artist_name")
      .eq("user_id", user.id);

    // Fetch ALL rated artists (for exclusion)
    const { data: allRatedArtists } = await supabase
      .from("artist_ratings")
      .select("artist_name")
      .eq("user_id", user.id);

    // Fetch user's loved albums
    const { data: lovedAlbums } = await supabase
      .from("listening_status")
      .select("album_title, artist_name")
      .eq("user_id", user.id)
      .eq("is_loved", true)
      .limit(10);

    // Build taste profile for AI
    const topAlbumsList = (topRatedAlbums || [])
      .map((a) => `${a.album_title} by ${a.artist_name} (${a.rating}/5)`)
      .join(", ");
    
    const followedList = (followedArtists || [])
      .map((a) => a.artist_name)
      .join(", ");
    
    const lovedList = (lovedAlbums || [])
      .map((a) => `${a.album_title} by ${a.artist_name}`)
      .join(", ");

    // Build comprehensive exclusion lists (including to-listen)
    const allListenedSet = new Set([
      ...(allListenedAlbums || []).map((a) => `${a.album_title} by ${a.artist_name}`),
      ...(allRatedAlbums || []).map((a) => `${a.album_title} by ${a.artist_name}`),
      ...(lovedAlbums || []).map((a) => `${a.album_title} by ${a.artist_name}`),
      ...(allToListenAlbums || []).map((a) => `${a.album_title} by ${a.artist_name}`),
    ]);
    const allListenedList = Array.from(allListenedSet).join(", ");

    const allKnownArtistsSet = new Set([
      ...(followedArtists || []).map((a) => a.artist_name),
      ...(allRatedArtists || []).map((a) => a.artist_name),
    ]);
    const allKnownArtistsList = Array.from(allKnownArtistsSet).join(", ");

    // Deterministic exclusion sets (used for post-filtering AI output, including to-listen)
    const excludedAlbumKeys = new Set([
      ...(allListenedAlbums || []).map((a) => albumKey(a.album_title, a.artist_name)),
      ...(allRatedAlbums || []).map((a) => albumKey(a.album_title, a.artist_name)),
      ...(lovedAlbums || []).map((a) => albumKey(a.album_title, a.artist_name)),
      ...(allToListenAlbums || []).map((a) => albumKey(a.album_title, a.artist_name)),
    ]);
    const excludedArtistKeys = new Set([
      ...(followedArtists || []).map((a) => artistKey(a.artist_name)),
      ...(allRatedArtists || []).map((a) => artistKey(a.artist_name)),
    ]);

    if (!topAlbumsList && !followedList && !lovedList) {
      return new Response(JSON.stringify({ 
        recommendations: [],
        message: "Rate some albums or follow artists to get personalized recommendations!" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build mood instruction from free-text user input
    const moodInstruction = mood
      ? `\n\nIMPORTANT: The user described their current mood/vibe as: "${mood}". Tailor all recommendations to match this feeling. Interpret their description and find music that fits.`
      : "";

    // Build exclusion instruction if not including known content
    const exclusionInstruction = !includeKnown
      ? `\n\nCRITICAL: Do NOT recommend any of these albums or artists that the user has already heard or knows:
Albums to EXCLUDE (user has listened to or rated these): ${allListenedList || "none"}
Artists to EXCLUDE (user follows or has rated these): ${allKnownArtistsList || "none"}
You MUST recommend ONLY albums and artists that are NOT in the above lists. These are absolute exclusions.`
      : "";

    const systemPrompt = `You are a music recommendation expert. Based on a user's listening history and preferences, suggest albums and artists they might enjoy.${moodInstruction}${exclusionInstruction}
    
Your recommendations should:
- Be specific album or artist names that actually exist
- Include a mix of similar artists and albums the user likely hasn't heard
- Consider the genres and styles the user seems to enjoy
- Include some deeper cuts, not just the most popular options

Format your response as a JSON object with this exact structure:
{
  "albums": [
    {"title": "Album Name", "artist": "Artist Name", "reason": "Brief reason why they'd like it"}
  ],
  "artists": [
    {"name": "Artist Name", "reason": "Brief reason why they'd like them"}
  ]
}

Provide exactly 8 album recommendations and 8 artist recommendations.`;

    const userPrompt = `Based on this user's music taste, recommend albums and artists they might enjoy:

${topAlbumsList ? `Highly rated albums: ${topAlbumsList}` : ""}
${followedList ? `Followed artists: ${followedList}` : ""}
${lovedList ? `Loved albums: ${lovedList}` : ""}
${mood ? `\nMood: ${mood}` : ""}

Recommend music that matches their taste but explores new territory they likely haven't discovered.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    let recommendations;
    try {
      recommendations = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      recommendations = { albums: [], artists: [] };
    }

    // Hard filter: never return already-known content when includeKnown is false.
    // This protects against occasional model mistakes / near-duplicate naming.
    if (!includeKnown && recommendations) {
      const seenAlbumKeys = new Set<string>();
      const seenArtistKeys = new Set<string>();

      const filteredAlbums = Array.isArray(recommendations.albums)
        ? recommendations.albums
            .filter((a: any) => a?.title && a?.artist)
            .filter((a: any) => {
              const key = albumKey(String(a.title), String(a.artist));
              if (!key) return false;
              if (excludedAlbumKeys.has(key)) return false;
              if (seenAlbumKeys.has(key)) return false;
              seenAlbumKeys.add(key);
              return true;
            })
            .slice(0, 5)
        : [];

      const filteredArtists = Array.isArray(recommendations.artists)
        ? recommendations.artists
            .filter((a: any) => a?.name)
            .filter((a: any) => {
              const key = artistKey(String(a.name));
              if (!key) return false;
              if (excludedArtistKeys.has(key)) return false;
              if (seenArtistKeys.has(key)) return false;
              seenArtistKeys.add(key);
              return true;
            })
            .slice(0, 5)
        : [];

      recommendations = { ...recommendations, albums: filteredAlbums, artists: filteredArtists };
    }

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI recommendations error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

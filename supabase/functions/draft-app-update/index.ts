import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { briefNote, mode, existingTitles } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Mode: "suggest" — AI suggests updates based on app knowledge
    if (mode === "suggest") {
      const existingList = (existingTitles || []).join("\n- ");

      const systemPrompt = `You are a product manager for "Just For The Record", a music tracking and discovery app (like Letterboxd but for music). The app has these features:

- Album diary logging with date, rating, review, re-listen toggle, and format tags (Digital, Vinyl, CD, Cassette, Radio, Live)
- Star ratings (1-5) for albums and artists
- Listening goal tracking with Goodreads-style ahead/behind schedule pacing
- Activity feed showing ratings, diary entries, and reviews from friends
- Likes and comments on activity items
- Friend system with requests, blocking, and privacy controls
- Artist following with new release notifications (in-app, email, push)
- Custom album lists (ranked/unranked, public/private)
- "Queue" (to-listen) and "Listened" status tracking
- Listened albums appear faded on artist pages (toggleable)
- Profile cards, favorite albums display, annual listening stats
- AI-powered album/artist recommendations based on listening history
- Weekly digest emails with friend activity summaries
- Export diary to CSV
- Streaming links on album pages
- Similar artists discovery
- Decade and genre browsing
- New releases page for followed artists
- Profile privacy controls (public, friends-only, section hiding)
- Dark mode support
- Mobile-optimized responsive design
- Format tags on diary entries (Digital, Vinyl, CD, etc.)
- Independent per-entry diary ratings (same album can have different ratings across entries)
- Progressive Web App with push notifications

Your task: Suggest 3-5 app update announcements for features that users might not know about yet. Each should highlight a different aspect of the app.

${existingList ? `These updates have ALREADY been announced — do NOT suggest these again:\n- ${existingList}\n` : ""}

IMPORTANT: The "link" field MUST be one of these exact valid routes:
- / (home)
- /profile (profile overview)
- /profile/albums (rated albums)
- /profile/artists (rated artists)
- /profile/diary (listening diary)
- /profile/lists (custom lists)
- /profile/to-listen (queue)
- /profile/reviews (reviews)
- /profile/friends (friends)
- /profile/settings (settings)
- /activity/following (friend activity feed)
- /activity/you (your activity)
- /search (search)
- /log (log a listen)
- /new-releases (new releases)
- /discovery (discovery)
- /discovery/explore (explore genres/decades)
- /discovery/leaderboards (leaderboards)
- /whats-new (app updates)
- /notifications (notifications)

Do NOT use any other routes. Pick the most relevant route from this list.

Respond with a JSON array of objects:
[
  { "title": "Short title (3-6 words)", "description": "1-2 sentence user-facing benefit description.", "link": "/relevant-route-from-list-above" }
]

Only respond with the JSON array, no other text. Make suggestions diverse — cover different parts of the app.`;

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
            { role: "user", content: "Suggest app update announcements for features users might not know about." },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No content in AI response");
      }

      let parsed;
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON array found in response");
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", content);
        throw new Error("Failed to parse AI response");
      }

      return new Response(
        JSON.stringify({ suggestions: parsed }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mode: "draft" (default) — single draft from brief note
    if (!briefNote || briefNote.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Brief note is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a product announcement writer for "Just For The Record", a music tracking and discovery app (similar to Letterboxd but for music albums).

Your task is to take a brief developer note about a new feature and polish it into a professional, engaging app update announcement.

Guidelines:
- Keep the title concise (3-6 words)
- Description should be 1-2 sentences, user-focused (explain the benefit, not technical details)
- Use an enthusiastic but professional tone
- Focus on what users can now DO, not how it was built
- Avoid technical jargon

Respond with a JSON object containing:
{
  "title": "Feature title here",
  "description": "User-friendly description of the feature and its benefits."
}

Only respond with the JSON object, no other text.`;

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
          { role: "user", content: `Brief note: ${briefNote}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    return new Response(
      JSON.stringify({
        title: parsed.title || "New Feature",
        description: parsed.description || briefNote,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("draft-app-update error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
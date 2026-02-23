

# Comprehensive Update Plan

This is a large batch of changes across many areas. Here is the full breakdown organized by category.

---

## 1. Prizefighter / Mumford & Sons Notification Issue

**Root Cause:** The `artist_release_cache` table shows Prizefighter with `first-release-date: 2026-02-27`, but it was actually released on Feb 20. The `check-new-releases` function uses `releaseDate <= now` to determine eligibility. Since MusicBrainz still lists Feb 27, the release hasn't triggered yet. The cache was last fetched on Feb 14.

**Fix:**
- Trigger a cache refresh for Mumford & Sons by calling the `prewarm-artist-releases` edge function for artist ID `c44e9c22-ef82-4a77-9bcd-af6c958446d6`
- Then manually invoke `check-new-releases` to generate any pending notifications
- Note: If MusicBrainz itself still shows Feb 27, the notification won't fire until that date unless we override the date window. We may need to widen the window or accept MusicBrainz's date.

---

## 2. Homepage: Replace "Popular This Week" with Friends' Listens

**Changes in `src/pages/Index.tsx`:**
- Remove the "Popular This Week" section (the `album_ratings_agg` query)
- Replace it with a "Friends' Recent Listens" section using the existing `friendActivity` query (currently shown as "New From Friends")
- Rename "New From Friends" to "Friends' Recent Listens"
- Make the "See all" link navigate to `/activity/following`
- Keep "Your Recent Listens" as the second section

---

## 3. Make Hero Section Less Tall

**Changes in `src/pages/Index.tsx`:**
- Reduce padding from `py-16 md:py-20` to `py-8 md:py-12`
- Reduce heading size from `text-4xl md:text-6xl lg:text-7xl` to `text-3xl md:text-5xl`
- Tighten spacing on subtitle and button

---

## 4. Mobile Tab Bar: Replace Activity with Discovery

**Changes in `src/components/MobileTabBar.tsx`:**
- Replace the Activity tab (`/activity/following`) with Discovery (`/discovery`)
- Use the Compass icon instead of Activity icon
- Update the `isActive` logic for the discovery path

---

## 5. Mobile Tab Bar: Fix Log Button

**Changes in `src/components/MobileTabBar.tsx`:**
- Change the Log tab path from `/profile/diary` to `/search` (the search page where users find albums to log)
- Alternatively, make it open the search page with a "log" intent so users can find an album to log

---

## 6. Diary Mobile Display Fix

**Changes in `src/components/profile/DiaryContent.tsx`:**
- On mobile, show all details on each diary entry: album name, artist, rating stars, heart, format tags
- Currently format tags are hidden on mobile (`hidden sm:flex`), change to always show
- Increase the entry padding and make the layout stack vertically on mobile so nothing gets squished
- Use a two-row layout on mobile: top row = cover + album/artist info, bottom row = rating + heart + format + actions

---

## 7. Remove Sort Filter on Diary Page

**Changes in `src/components/profile/DiaryContent.tsx`:**
- Remove the sort dropdown (the Select for date/artist/album sorting) from the diary controls
- Keep the year selector and search input

---

## 8. Queue Page Layout Fix

**Changes in `src/pages/profile/ToListen.tsx`:**
- Move the Shuffle button below the search + sort row
- Layout: first line = title + search + sort, second line = shuffle button

---

## 9. Profile Pages: Consistent Sort + Search Layout

**Changes across profile pages (`Albums.tsx`, `Artists.tsx`, `Lists.tsx`, `Reviews.tsx`, `Friends.tsx`, `ToListen.tsx`):**
- Ensure sort dropdown is always to the LEFT of the search input on the same line
- Consistent order: Sort | Search

---

## 10. Notification Bell: Open Panel on the Right

**Changes in `src/components/NotificationBell.tsx`:**
- The Popover already uses `align="end"` which should open right-aligned
- Verify and ensure the popover content is positioned correctly; may need to adjust alignment or use `side="bottom"` with `align="end"`

---

## 11. Email Album Art Fix

**Changes in `supabase/functions/send-notification-email/index.ts`:**
- The Cover Art Archive URL `https://coverartarchive.org/release-group/{id}/front-250` does a 307 redirect. Some email clients don't follow redirects.
- Fix: Use the Internet Archive mirror which serves the image directly: `https://ia601900.us.archive.org/...` or pre-resolve the redirect URL
- Alternative simpler fix: Use `https://coverartarchive.org/release-group/{id}/front` without the size suffix, or add a `loading="eager"` attribute

---

## 12. Email App Icon Consistency

**Changes in `supabase/functions/send-notification-email/index.ts`:**
- Copy the uploaded app icon (`ChatGPT_Image_Feb_22_2026_08_06_59_PM.png`) to `public/email-logo.png`
- The email template already references `https://justfortherecord.app/email-logo.png`
- Ensure the logo displays as the vinyl disc icon on the red background

---

## 13. Password Change Feature

**Changes in `src/pages/ProfileSettings.tsx`:**
- Add a "Change Password" section above the Danger Zone
- Include current password field (optional for Supabase), new password, and confirm password fields
- Use `supabase.auth.updateUser({ password: newPassword })` to update

---

## 14. Favorite Albums: Bigger on Mobile, 6 Slots

**Changes in `src/components/profile/FavoriteAlbums.tsx`:**
- Increase slots from 5 to 6
- On mobile, increase album cover size from `w-14 h-14` to `w-20 h-20`
- Use a 3-column grid on mobile (`grid grid-cols-3 gap-3`) instead of horizontal scroll, which naturally creates 2 rows of 3

---

## 15. Settings: Add Queue, Following, Reviews to Hide Sections

**Changes in `src/pages/ProfileSettings.tsx`:**
- Add three new toggle switches to the "Hide Sections" grid: Queue, Following, Reviews
- These will need corresponding columns in the `profiles` table (`show_queue`, `show_following`, `show_reviews`)

**Database migration:**
```sql
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS show_queue boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_following boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_reviews boolean DEFAULT true;
```

---

## 16. BRAT Search Fix

**Root Cause:** The fuzzy query logic in the edge function turns "brat" (4 chars, > 3) into `brat~` which triggers MusicBrainz fuzzy matching and returns many unrelated results like "Brat za Brata". Charli xcx's "BRAT" doesn't rank first because the fuzzy expansion dilutes the results.

**Fix in `supabase/functions/musicbrainz/index.ts`:**
- Change the fuzzy threshold from `> 3` to `> 4` characters (only apply `~` to words with 5+ characters)
- This ensures short, specific words like "brat" are searched exactly, while longer words still get typo tolerance

---

## 17. Profile Navigation: New Layout per Wireframe

**Changes in `src/components/profile/ProfileNav.tsx`:**
- Mobile layout: Diary as a full-width button on the first line
- Below it: 3 rows of 2 buttons each for Albums, Queue, Artists, Lists, Reviews, Following
- This matches the user's hand-drawn wireframe

---

## Technical Summary

| # | File(s) | Action |
|---|---------|--------|
| 1 | Edge functions (manual invocation) | Refresh Mumford cache + trigger check |
| 2 | `src/pages/Index.tsx` | Replace Popular with Friends section |
| 3 | `src/pages/Index.tsx` | Reduce hero height |
| 4 | `src/components/MobileTabBar.tsx` | Activity -> Discovery |
| 5 | `src/components/MobileTabBar.tsx` | Fix Log button path to `/search` |
| 6 | `src/components/profile/DiaryContent.tsx` | Mobile diary entry layout overhaul |
| 7 | `src/components/profile/DiaryContent.tsx` | Remove sort dropdown |
| 8 | `src/pages/profile/ToListen.tsx` | Move shuffle below search/sort |
| 9 | Multiple profile pages | Consistent sort-left, search-right |
| 10 | `src/components/NotificationBell.tsx` | Verify right-side alignment |
| 11 | `supabase/functions/send-notification-email/index.ts` | Fix album art URL for email |
| 12 | `public/email-logo.png` | Replace with uploaded app icon |
| 13 | `src/pages/ProfileSettings.tsx` | Add change password section |
| 14 | `src/components/profile/FavoriteAlbums.tsx` | 6 slots, bigger on mobile |
| 15 | `src/pages/ProfileSettings.tsx` + DB migration | Add queue/following/reviews toggles |
| 16 | `supabase/functions/musicbrainz/index.ts` | Fix fuzzy threshold (>4 not >3) |
| 17 | `src/components/profile/ProfileNav.tsx` | New mobile grid layout per wireframe |

